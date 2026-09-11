(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  function attack(scene, x, y, stats, options) {
    if (scene.paused || scene.state.wavePhase === "failed") {
      return { hit: false, killed: [] };
    }
    var radius = options && options.radius ? options.radius : stats.clickRadius;
    var damage = options && options.damage ? options.damage : stats.clickDamage;
    var helper = Boolean(options && options.helper);
    var source = options && options.source ? options.source : helper ? "helper" : "manual";
    var impactScale = helper ? stats.helperClickEffectScale : stats.feedbackScale;
    var targets = findTargets(scene.enemies, x, y, radius);
    var killed = [];

    ARENA.ImpactEffects.showImpact(
      scene,
      x,
      y,
      radius,
      targets.length > 0,
      impactScale * (targets.length > 0 ? ARENA.BALANCE_CONFIG.feedback.hitImpactScale : ARENA.BALANCE_CONFIG.feedback.missImpactScale),
      helper
    );

    if (targets.length === 0) {
      scene.soundSystem.play(helper ? "helperClick" : "clickMiss");
      return { hit: false, killed: killed };
    }

    targets.forEach(function (enemy, index) {
      if (!enemy.active) {
        return;
      }

      var hitDamage = index === 0 ? damage : Math.max(1, damage * ARENA.BALANCE_CONFIG.cursor.splashDamageRatio);
      if (damageEnemy(scene, enemy, hitDamage, x, y, stats, helper, source)) {
        killed.push(enemy);
      }
    });

    if (source === "manual" && targets[0] && targets[0].active && Math.random() < stats.doubleTapChance) {

      if (damageEnemy(scene, targets[0], damage, x, y, stats, helper, source)) {
        killed.push(targets[0]);
      }
    }

    scene.soundSystem.play(helper ? "helperClick" : "hit");
    return { hit: true, killed: killed };
  }

  function damageEnemy(scene, enemy, damage, x, y, stats, helper, source) {
    if (ARENA.Endless) { damage = ARENA.Endless.hit(scene, enemy, damage, source); }
    if (!ARENA.Enemies.damage(scene, enemy, damage, x, y)) {

      ARENA.ImpactEffects.showHitParticles(scene, enemy.x, enemy.y, helper ? stats.helperClickEffectScale : stats.feedbackScale, enemy.enemySkin ? enemy.enemySkin.hitColor : 0x171717);
      return false;
    }

    killEnemy(scene, enemy, stats, source);
    return true;
  }

  function killEnemy(scene, enemy, stats, source) {
    if (!enemy.active) {
      return;
    }
    scene.registerKill(enemy.x, enemy.y, source);
    var reward = enemy.reward * stats.rewardMultiplier * ARENA.Waves.comboMultiplier(scene.combo);
    var x = enemy.x;
    var y = enemy.y;

    if (enemy.shadow && enemy.shadow.active) {
      enemy.shadow.destroy();
    }
    enemy.destroy();
    scene.state.energy += reward;
    scene.state.totalDefeated += 1;
    if (scene.registerOperationKill) {
      scene.registerOperationKill(enemy);
    }
    // Gigaboss success is announced once by registerOperationKill, like every wave.
    if (!enemy.gigaboss) { scene.soundSystem.play("kill"); }

    ARENA.ImpactEffects.showKillBurst(scene, x, y, stats.feedbackScale * ARENA.BALANCE_CONFIG.feedback.killImpactScale);
    ARENA.ImpactEffects.showSplatter(scene, x, y, stats.feedbackScale, enemy.enemySkin ? enemy.enemySkin.deathColor : 0xd82626);

    if (stats.shockRadius > 0) {
      shock(scene, x, y, stats, source);
    }
  }

  function shock(scene, x, y, stats, source) {
    scene.effectCounts.shockwave = (scene.effectCounts.shockwave || 0) + 1;
    ARENA.ImpactEffects.showImpact(scene, x, y, stats.shockRadius, true, stats.feedbackScale * ARENA.BALANCE_CONFIG.feedback.shockImpactScale);
    findTargets(scene.enemies, x, y, stats.shockRadius).forEach(function (enemy) {
      if (enemy.active && ARENA.Enemies.damage(scene, enemy, stats.shockDamage, x, y)) {
        killEnemy(scene, enemy, stats, source);
      } else if (enemy.active) {
        ARENA.ImpactEffects.showHitParticles(scene, enemy.x, enemy.y, 0.75, 0xd82626);
      }
    });
  }

  function findTargets(enemies, x, y, radius) {
    return enemies.filter(function (enemy) {
      return enemy.active && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius + (enemy.hitRadius || enemy.radius);
    }).sort(function (a, b) {
      return Phaser.Math.Distance.Between(x, y, a.x, a.y) - Phaser.Math.Distance.Between(x, y, b.x, b.y);
    });
  }

  ARENA.CursorAttack = {
    attack: attack,
    findTargets: findTargets
  };
})();

(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  function attack(scene, x, y, stats, options) {
    var radius = options && options.radius ? options.radius : stats.clickRadius;
    var damage = options && options.damage ? options.damage : stats.clickDamage;
    var helper = Boolean(options && options.helper);
    var targets = findTargets(scene.enemies, x, y, radius);
    var killed = [];

    ARENA.ImpactEffects.showImpact(scene, x, y, radius, targets.length > 0, stats.feedbackScale);

    if (targets.length === 0) {
      scene.soundSystem.play(helper ? "helperClick" : "clickMiss");
      return { hit: false, killed: killed };
    }

    targets.forEach(function (enemy, index) {
      if (!enemy.active) {
        return;
      }

      var hitDamage = index === 0 ? damage : Math.max(1, damage * 0.65);
      if (damageEnemy(scene, enemy, hitDamage, x, y, stats, helper)) {
        killed.push(enemy);
      }
    });

    if (!helper && targets[0] && targets[0].active && Math.random() < stats.doubleTapChance) {
      ARENA.ImpactEffects.showHitText(scene, "DOUBLE", targets[0].x, targets[0].y, 0x171717);
      if (damageEnemy(scene, targets[0], damage, x, y, stats, helper)) {
        killed.push(targets[0]);
      }
    }

    scene.soundSystem.play(helper ? "helperClick" : "hit");
    return { hit: true, killed: killed };
  }

  function damageEnemy(scene, enemy, damage, x, y, stats, helper) {
    if (!ARENA.Enemies.damage(scene, enemy, damage, x, y)) {
      ARENA.ImpactEffects.showHitText(scene, helper ? "tap" : "HIT", enemy.x, enemy.y, helper ? 0x646464 : 0x171717);
      return false;
    }

    killEnemy(scene, enemy, stats);
    return true;
  }

  function killEnemy(scene, enemy, stats) {
    var reward = enemy.reward * stats.rewardMultiplier;
    var x = enemy.x;
    var y = enemy.y;

    enemy.destroy();
    scene.state.energy += reward;
    scene.state.totalDefeated += 1;
    scene.registerKill();
    scene.soundSystem.play("kill");
    ARENA.ImpactEffects.showHitText(scene, "+" + ARENA.formatNumber(reward), x, y, 0xd82626);
    ARENA.ImpactEffects.showSplatter(scene, x, y, stats.feedbackScale);

    if (stats.shockRadius > 0) {
      shock(scene, x, y, stats);
    }
  }

  function shock(scene, x, y, stats) {
    ARENA.ImpactEffects.showImpact(scene, x, y, stats.shockRadius, true, stats.feedbackScale);
    findTargets(scene.enemies, x, y, stats.shockRadius).forEach(function (enemy) {
      if (enemy.active && ARENA.Enemies.damage(scene, enemy, stats.shockDamage, x, y)) {
        killEnemy(scene, enemy, stats);
      }
    });
  }

  function findTargets(enemies, x, y, radius) {
    return enemies.filter(function (enemy) {
      return enemy.active && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius + enemy.radius;
    }).sort(function (a, b) {
      return Phaser.Math.Distance.Between(x, y, a.x, a.y) - Phaser.Math.Distance.Between(x, y, b.x, b.y);
    });
  }

  ARENA.CursorAttack = {
    attack: attack,
    findTargets: findTargets
  };
})();

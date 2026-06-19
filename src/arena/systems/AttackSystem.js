(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function createState() {
    return {
      attackCooldownMs: 0,
      orbiterCooldownMs: 0,
      orbiterAngle: 0
    };
  }

  function update(scene, attackState, stats, enemies, projectiles, deltaMs, callbacks) {
    attackState.attackCooldownMs -= deltaMs;
    attackState.orbiterCooldownMs -= deltaMs;
    attackState.orbiterAngle += deltaMs * 0.0024;

    if (attackState.attackCooldownMs <= 0) {
      attackState.attackCooldownMs += stats.attackIntervalMs;
      pulse(scene, stats, enemies, callbacks);
      fireProjectiles(scene, stats, enemies, projectiles);
      callbacks.onAttack();
    }

    updateOrbiters(scene, attackState, stats, enemies, callbacks);
  }

  function pulse(scene, stats, enemies, callbacks) {
    var ring = scene.add.circle(scene.core.x, scene.core.y, stats.pulseRadius, 0x37d5ff, 0.08);
    ring.setStrokeStyle(2, 0x37d5ff, 0.65);
    scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.25,
      duration: CONFIG.feedback.pulseVisualMs,
      onComplete: function () {
        ring.destroy();
      }
    });

    enemies.forEach(function (enemy) {
      if (enemy.active && Phaser.Math.Distance.Between(scene.core.x, scene.core.y, enemy.x, enemy.y) <= stats.pulseRadius) {
        callbacks.damageEnemy(enemy, stats.pulseDamage, scene.core.x, scene.core.y);
      }
    });
  }

  function fireProjectiles(scene, stats, enemies, projectiles) {
    nearestEnemies(enemies, scene.core.x, scene.core.y, stats.attackRange, stats.projectileCount).forEach(function (enemy) {
      var projectile = scene.add.circle(scene.core.x, scene.core.y, stats.projectileRadius, 0x37d5ff, 1);
      projectile.target = enemy;
      projectile.damage = stats.attackDamage;
      projectile.speed = stats.projectileSpeed;
      projectile.setStrokeStyle(1, 0xffffff, 0.55);
      projectiles.push(projectile);
    });
  }

  function updateProjectiles(scene, stats, enemies, projectiles, deltaMs, callbacks) {
    var deltaSeconds = deltaMs / 1000;

    projectiles.slice().forEach(function (projectile) {
      if (!projectile.active || !projectile.target || !projectile.target.active) {
        remove(projectiles, projectile);
        projectile.destroy();
        return;
      }

      var angle = Phaser.Math.Angle.Between(projectile.x, projectile.y, projectile.target.x, projectile.target.y);
      projectile.x += Math.cos(angle) * projectile.speed * deltaSeconds;
      projectile.y += Math.sin(angle) * projectile.speed * deltaSeconds;

      if (Phaser.Math.Distance.Between(projectile.x, projectile.y, projectile.target.x, projectile.target.y) <= stats.projectileHitRadius) {
        callbacks.damageEnemy(projectile.target, projectile.damage, projectile.x, projectile.y);
        chain(scene, stats, enemies, projectile.target, callbacks);
        remove(projectiles, projectile);
        projectile.destroy();
      }
    });
  }

  function chain(scene, stats, enemies, source, callbacks) {
    var current = source;
    var chained = [];

    for (var index = 0; index < stats.chainTargets; index += 1) {
      var target = nearestEnemies(enemies.filter(function (enemy) {
        return chained.indexOf(enemy) === -1 && enemy !== current;
      }), current.x, current.y, stats.chainRange, 1)[0];

      if (!target) {
        return;
      }

      drawHitLine(scene, current.x, current.y, target.x, target.y, 0x8df4ff);
      callbacks.damageEnemy(target, stats.attackDamage * stats.chainDamageMultiplier, current.x, current.y);
      chained.push(target);
      current = target;
    }
  }

  function updateOrbiters(scene, attackState, stats, enemies, callbacks) {
    scene.orbiterGraphics.clear();

    for (var index = 0; index < stats.orbiters; index += 1) {
      var angle = attackState.orbiterAngle + (Math.PI * 2 * index) / Math.max(1, stats.orbiters);
      var x = scene.core.x + Math.cos(angle) * stats.orbiterRadius;
      var y = scene.core.y + Math.sin(angle) * stats.orbiterRadius;
      scene.orbiterGraphics.fillStyle(0x37d5ff, 0.95);
      scene.orbiterGraphics.fillCircle(x, y, 5);
      scene.orbiterGraphics.lineStyle(1, 0x37d5ff, 0.28);
      scene.orbiterGraphics.strokeCircle(scene.core.x, scene.core.y, stats.orbiterRadius);

      if (attackState.orbiterCooldownMs <= 0) {
        enemies.forEach(function (enemy) {
          if (enemy.active && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= stats.orbiterHitRadius) {
            drawHitLine(scene, x, y, enemy.x, enemy.y, 0x37d5ff);
            callbacks.damageEnemy(enemy, stats.orbiterDamage, x, y);
          }
        });
      }
    }

    if (attackState.orbiterCooldownMs <= 0) {
      attackState.orbiterCooldownMs += stats.orbiterIntervalMs;
    }
  }

  function nearestEnemies(enemies, x, y, range, count) {
    return enemies.filter(function (enemy) {
      return enemy.active && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= range;
    }).sort(function (a, b) {
      return Phaser.Math.Distance.Between(x, y, a.x, a.y) - Phaser.Math.Distance.Between(x, y, b.x, b.y);
    }).slice(0, count);
  }

  function drawHitLine(scene, x1, y1, x2, y2, color) {
    var line = scene.add.line(0, 0, x1, y1, x2, y2, color, 0.72).setOrigin(0, 0);
    scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: CONFIG.feedback.hitLineMs,
      onComplete: function () {
        line.destroy();
      }
    });
  }

  function remove(list, item) {
    var index = list.indexOf(item);
    if (index >= 0) {
      list.splice(index, 1);
    }
  }

  ARENA.Attacks = {
    createState: createState,
    update: update,
    updateProjectiles: updateProjectiles,
    drawHitLine: drawHitLine
  };
})();

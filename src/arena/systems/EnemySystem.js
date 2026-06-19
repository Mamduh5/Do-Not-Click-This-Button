(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function spawn(scene, wave) {
    var edge = Phaser.Math.Between(0, 3);
    var margin = CONFIG.enemy.spawnMargin;
    var width = CONFIG.canvas.width;
    var height = CONFIG.canvas.height;
    var x = edge === 0 ? -margin : edge === 1 ? width + margin : Phaser.Math.Between(0, width);
    var y = edge === 2 ? -margin : edge === 3 ? height + margin : Phaser.Math.Between(0, height);
    var health = CONFIG.enemy.baseHealth * (1 + (wave - 1) * CONFIG.enemy.waveHealthScale);
    var enemy = scene.add.circle(x, y, CONFIG.enemy.radius, 0xe84848, 0.92);

    enemy.maxHealth = health;
    enemy.health = health;
    enemy.speed = CONFIG.enemy.baseSpeed * (1 + (wave - 1) * CONFIG.enemy.waveSpeedScale);
    enemy.reward = CONFIG.enemy.baseReward * (1 + (wave - 1) * CONFIG.enemy.waveRewardScale);
    enemy.hitFlashUntil = 0;
    enemy.spawnSeed = Math.random() * 1000;
    enemy.driftAngle = Phaser.Math.Angle.Between(x, y, width / 2, height / 2) + Phaser.Math.FloatBetween(-0.9, 0.9);
    enemy.setStrokeStyle(1, 0xff9a9a, 0.55);
    return enemy;
  }

  function update(scene, enemies, deltaMs) {
    var deltaSeconds = deltaMs / 1000;

    enemies.slice().forEach(function (enemy) {
      if (!enemy.active) {
        return;
      }

      var wiggle = Math.sin(scene.time.now * CONFIG.enemy.wiggleSpeed + enemy.spawnSeed) * CONFIG.enemy.wiggleAmplitude;
      var angle = enemy.driftAngle + wiggle * 0.01;
      enemy.x += Math.cos(angle) * enemy.speed * deltaSeconds;
      enemy.y += Math.sin(angle) * enemy.speed * deltaSeconds;

      if (scene.time.now > enemy.hitFlashUntil) {
        enemy.setFillStyle(0xe84848, 0.92);
        enemy.setScale(1);
      }

      if (enemy.x < -CONFIG.enemy.spawnMargin || enemy.x > CONFIG.canvas.width + CONFIG.enemy.spawnMargin) {
        enemy.driftAngle = Math.PI - enemy.driftAngle;
      }

      if (enemy.y < -CONFIG.enemy.spawnMargin || enemy.y > CONFIG.canvas.height + CONFIG.enemy.spawnMargin) {
        enemy.driftAngle = -enemy.driftAngle;
      }
    });
  }

  function damage(scene, enemy, amount, sourceX, sourceY) {
    if (!enemy || !enemy.active) {
      return false;
    }

    enemy.health -= amount;
    enemy.hitFlashUntil = scene.time.now + CONFIG.enemy.hitFlashMs;
    enemy.setFillStyle(0xffffff, 1);
    enemy.setScale(1.28, 0.62);

    if (sourceX !== undefined && sourceY !== undefined) {
      var angle = Phaser.Math.Angle.Between(sourceX, sourceY, enemy.x, enemy.y);
      enemy.x += Math.cos(angle) * CONFIG.enemy.knockback;
      enemy.y += Math.sin(angle) * CONFIG.enemy.knockback;
    }

    return enemy.health <= 0;
  }

  ARENA.Enemies = {
    spawn: spawn,
    update: update,
    damage: damage
  };
})();

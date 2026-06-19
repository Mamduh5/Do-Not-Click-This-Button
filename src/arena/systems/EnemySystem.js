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
    enemy.setStrokeStyle(1, 0xff9a9a, 0.55);
    return enemy;
  }

  function update(scene, enemies, core, deltaMs, onCoreDamage) {
    var deltaSeconds = deltaMs / 1000;

    enemies.slice().forEach(function (enemy) {
      if (!enemy.active) {
        return;
      }

      var angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, core.x, core.y);
      enemy.x += Math.cos(angle) * enemy.speed * deltaSeconds;
      enemy.y += Math.sin(angle) * enemy.speed * deltaSeconds;

      if (scene.time.now > enemy.hitFlashUntil) {
        enemy.setFillStyle(0xe84848, 0.92);
      }

      if (Phaser.Math.Distance.Between(enemy.x, enemy.y, core.x, core.y) <= core.radius + CONFIG.enemy.radius) {
        onCoreDamage(CONFIG.enemy.contactDamage);
        enemy.destroy();
      }
    });
  }

  function damage(scene, enemy, amount) {
    if (!enemy || !enemy.active) {
      return false;
    }

    enemy.health -= amount;
    enemy.hitFlashUntil = scene.time.now + CONFIG.enemy.hitFlashMs;
    enemy.setFillStyle(0xffffff, 1);
    return enemy.health <= 0;
  }

  ARENA.Enemies = {
    spawn: spawn,
    update: update,
    damage: damage
  };
})();

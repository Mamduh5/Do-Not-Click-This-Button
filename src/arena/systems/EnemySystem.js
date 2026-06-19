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
    return create(scene, x, y, wave);
  }

  function create(scene, x, y, wave, forcedHealth) {
    var health = CONFIG.enemy.baseHealth * (1 + (wave - 1) * CONFIG.enemy.waveHealthScale);
    var skin = ARENA.EnemySkins.get(scene.state.activeEnemySkin);
    var shadow = scene.add.circle(x + 2, y + 4, CONFIG.enemy.radius * CONFIG.enemy.visualScale * 1.15, CONFIG.enemy.shadowColor, CONFIG.enemy.shadowAlpha);
    var enemy = scene.add.container(x, y);
    var graphics = scene.add.graphics();
    var speedVariance = 1 + Phaser.Math.FloatBetween(-CONFIG.enemy.speedVariance, CONFIG.enemy.speedVariance);

    enemy.add(graphics);
    enemy.graphics = graphics;
    enemy.enemySkin = skin;
    enemy.baseRadius = CONFIG.enemy.radius;
    enemy.radius = CONFIG.enemy.radius;
    enemy.maxHealth = forcedHealth || health;
    enemy.health = enemy.maxHealth;
    enemy.speed = CONFIG.enemy.baseSpeed * speedVariance * (1 + (wave - 1) * CONFIG.enemy.waveSpeedScale);
    enemy.reward = CONFIG.enemy.baseReward * (1 + (wave - 1) * CONFIG.enemy.waveRewardScale);
    enemy.hitFlashUntil = 0;
    enemy.hitRadius = CONFIG.enemy.radius * CONFIG.enemy.visualScale * skin.scale + CONFIG.enemy.clickPadding;
    enemy.shadow = shadow;
    enemy.knockbackX = 0;
    enemy.knockbackY = 0;
    enemy.spawnSeed = Math.random() * 1000;
    enemy.driftAngle = Phaser.Math.Angle.Between(x, y, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2) + Phaser.Math.FloatBetween(-0.9, 0.9);
    enemy.nextTurnAt = scene.time.now + Phaser.Math.Between(CONFIG.enemy.directionChangeMs * 0.5, CONFIG.enemy.directionChangeMs * 1.5);
    enemy.setScale(0.25);
    enemy.setAlpha(0);
    ARENA.EnemySkins.draw(enemy);
    shadow.setDepth(-1);
    shadow.setScale(0.25);
    shadow.setAlpha(0);
    showSpawn(scene, x, y);
    scene.tweens.add({
      targets: enemy,
      alpha: 0.96,
      scale: CONFIG.enemy.visualScale * skin.scale,
      duration: CONFIG.enemy.spawnFadeMs
    });
    scene.tweens.add({
      targets: shadow,
      alpha: CONFIG.enemy.shadowAlpha,
      scale: CONFIG.enemy.visualScale * skin.shadowScale,
      duration: CONFIG.enemy.spawnFadeMs
    });
    return enemy;
  }

  function update(scene, enemies, deltaMs) {
    var deltaSeconds = deltaMs / 1000;

    enemies.slice().forEach(function (enemy) {
      if (!enemy.active) {
        return;
      }

      if (scene.time.now >= enemy.nextTurnAt) {
        enemy.driftAngle += Phaser.Math.FloatBetween(-CONFIG.enemy.turnStrength, CONFIG.enemy.turnStrength);
        enemy.nextTurnAt = scene.time.now + Phaser.Math.Between(CONFIG.enemy.directionChangeMs * 0.65, CONFIG.enemy.directionChangeMs * 1.35);
      }

      var wiggle = Math.sin(scene.time.now * CONFIG.enemy.wiggleSpeed + enemy.spawnSeed) * CONFIG.enemy.wiggleAmplitude;
      var angle = enemy.driftAngle + wiggle * 0.01;
      enemy.x += Math.cos(angle) * enemy.speed * deltaSeconds;
      enemy.y += Math.sin(angle) * enemy.speed * deltaSeconds;
      enemy.x += enemy.knockbackX * deltaSeconds;
      enemy.y += enemy.knockbackY * deltaSeconds;
      enemy.knockbackX *= Math.pow(CONFIG.enemy.knockbackDecay, deltaMs / 16.67);
      enemy.knockbackY *= Math.pow(CONFIG.enemy.knockbackDecay, deltaMs / 16.67);

      if (enemy.shadow && enemy.shadow.active) {
        enemy.shadow.x = enemy.x + 2;
        enemy.shadow.y = enemy.y + 4;
      }

      if (scene.time.now > enemy.hitFlashUntil) {
        ARENA.EnemySkins.draw(enemy);
        enemy.setScale(CONFIG.enemy.visualScale * enemy.enemySkin.scale);
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
    ARENA.EnemySkins.draw(enemy, enemy.enemySkin.hitColor);
    enemy.setScale(CONFIG.enemy.visualScale * enemy.enemySkin.scale * 1.35, CONFIG.enemy.visualScale * enemy.enemySkin.scale * 0.62);

    if (sourceX !== undefined && sourceY !== undefined) {
      var angle = Phaser.Math.Angle.Between(sourceX, sourceY, enemy.x, enemy.y);
      enemy.knockbackX += Math.cos(angle) * CONFIG.enemy.knockback;
      enemy.knockbackY += Math.sin(angle) * CONFIG.enemy.knockback;
    }

    return enemy.health <= 0;
  }

  function showSpawn(scene, x, y) {
    var ring = scene.add.circle(x, y, CONFIG.enemy.radius * CONFIG.enemy.visualScale * 1.8, CONFIG.enemy.outlineColor, 0.05);
    ring.setStrokeStyle(1, CONFIG.enemy.outlineColor, 0.45);
    scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.35,
      duration: CONFIG.enemy.spawnRingMs,
      onComplete: function () {
        ring.destroy();
      }
    });
  }

  ARENA.Enemies = {
    spawn: spawn,
    create: create,
    update: update,
    damage: damage
  };
})();

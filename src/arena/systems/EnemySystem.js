(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;
  var FEEDBACK = ARENA.ENEMY_ROLE_FEEDBACK;

  function getRole(id) {
    return Object.prototype.hasOwnProperty.call(ARENA.ENEMY_ROLES, id) ? ARENA.ENEMY_ROLES[id] : ARENA.ENEMY_ROLES.standard;
  }

  function spawn(scene, wave, roleId) {
    var edge = Phaser.Math.Between(0, 3);
    var role = getRole(roleId);
    var skin = ARENA.EnemySkins.get(scene.state.activeEnemySkin);
    var inset = Math.max(CONFIG.enemy.spawnInset, visualRadius(role, skin, scene) + FEEDBACK.visibleEdgePadding);
    var width = CONFIG.canvas.width;
    var height = CONFIG.canvas.height;
    var x = edge === 0 ? inset : edge === 1 ? width - inset : Phaser.Math.Between(inset, width - inset);
    var y = edge === 2 ? inset : edge === 3 ? height - inset : Phaser.Math.Between(inset, height - inset);
    return create(scene, x, y, wave, undefined, roleId);
  }

  function create(scene, x, y, wave, forcedHealth, roleId) {
    var role = getRole(roleId);
    var skin = ARENA.EnemySkins.get(scene.state.activeEnemySkin);
    var radius = CONFIG.enemy.radius * role.scale;
    if (ARENA.Obstacles && scene.obstacleSystem) {
      var safe = ARENA.Obstacles.getSafeSpawnPoint(scene.obstacleSystem, x, y, radius);
      x = safe.x;
      y = safe.y;
    }
    var scalingWave = Math.max(1, Math.min(wave, CONFIG.operations ? CONFIG.operations.scalingWaveCap : wave));
    var health = CONFIG.enemy.baseHealth * (1 + (scalingWave - 1) * CONFIG.enemy.waveHealthScale) * role.healthMultiplier;
    var shadow = scene.add.circle(x + FEEDBACK.shadowOffsetX, y + FEEDBACK.shadowOffsetY, CONFIG.enemy.radius * CONFIG.enemy.visualScale * FEEDBACK.shadowRadiusMultiplier, CONFIG.enemy.shadowColor, CONFIG.enemy.shadowAlpha);
    var enemy = scene.add.container(x, y);
    var graphics = scene.add.graphics();
    var indicator = scene.add.graphics();
    var speedVariance = 1 + Phaser.Math.FloatBetween(-CONFIG.enemy.speedVariance, CONFIG.enemy.speedVariance);

    enemy.add(graphics);
    enemy.graphics = graphics;
    enemy.enemySkin = skin;
    enemy.roleId = role.id;
    enemy.enemyRole = role;
    enemy.roleIndicator = indicator;
    enemy.debugId = scene.enemySerial === undefined ? 0 : scene.enemySerial++;
    enemy.baseRadius = CONFIG.enemy.radius;
    enemy.radius = radius;
    enemy.visualScale = CONFIG.enemy.visualScale * skin.scale * role.scale * (scene.enemyReadabilityScale || 1);
    enemy.maxHealth = forcedHealth === undefined ? health : forcedHealth;
    enemy.health = enemy.maxHealth;
    enemy.speed = CONFIG.enemy.baseSpeed * speedVariance * (1 + (scalingWave - 1) * CONFIG.enemy.waveSpeedScale) * role.speedMultiplier;
    enemy.reward = CONFIG.enemy.baseReward * (1 + (scalingWave - 1) * CONFIG.enemy.waveRewardScale) * role.rewardMultiplier;
    enemy.hitFlashUntil = 0;
    enemy.hitRadius = visualRadius(role, skin, scene) + CONFIG.enemy.clickPadding * role.clickPaddingMultiplier;
    enemy.shadow = shadow;
    enemy.knockbackX = 0;
    enemy.knockbackY = 0;
    enemy.spawnSeed = Math.random() * FEEDBACK.animationSeedRange;
    enemy.animationPhase = Math.random() * FEEDBACK.animationSeedRange;
    enemy.movingAmount = 0;
    enemy.lastMoveAngle = Phaser.Math.Angle.Between(x, y, CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);
    enemy.driftAngle = enemy.lastMoveAngle + Phaser.Math.FloatBetween(-FEEDBACK.initialDriftVariance, FEEDBACK.initialDriftVariance);
    enemy.nextTurnAt = scene.time.now + Phaser.Math.Between(CONFIG.enemy.directionChangeMs * FEEDBACK.initialTurnMin, CONFIG.enemy.directionChangeMs * FEEDBACK.initialTurnMax);
    enemy.spawnedAt = scene.time.now;
    enemy.setScale(FEEDBACK.spawnInitialScale);
    enemy.rotation = enemy.lastMoveAngle + skin.animation.forwardAngleOffset;
    enemy.setAlpha(0);
    ARENA.EnemySkins.draw(enemy);
    shadow.setDepth(FEEDBACK.shadowDepth);
    shadow.setScale(FEEDBACK.spawnInitialScale);
    shadow.setAlpha(0);
    indicator.setDepth(FEEDBACK.markerDepth);
    // Indicators stay in world space so health remains readable as the body turns and squashes.
    enemy.once("destroy", function () {
      if (indicator.active) {
        indicator.destroy();
      }
      if (shadow.active) {
        shadow.destroy();
      }
    });
    drawIndicator(scene, enemy);
    showSpawn(scene, x, y, role, skin);
    scene.tweens.add({
      targets: enemy,
      alpha: FEEDBACK.spawnAlpha,
      scale: enemy.visualScale,
      duration: CONFIG.enemy.spawnFadeMs
    });
    scene.tweens.add({
      targets: shadow,
      alpha: CONFIG.enemy.shadowAlpha,
      scale: CONFIG.enemy.visualScale * skin.shadowScale * role.scale * (scene.enemyReadabilityScale || 1),
      duration: CONFIG.enemy.spawnFadeMs
    });
    return enemy;
  }

  function visualRadius(role, skin, scene) {
    return CONFIG.enemy.radius * CONFIG.enemy.visualScale * skin.scale * role.scale * (scene.enemyReadabilityScale || 1);
  }

  function update(scene, enemies, deltaMs) {
    var deltaSeconds = deltaMs / 1000;

    enemies.slice().forEach(function (enemy) {
      if (!enemy.active) {
        return;
      }

      if (scene.time.now >= enemy.nextTurnAt) {
        enemy.driftAngle += Phaser.Math.FloatBetween(-CONFIG.enemy.turnStrength, CONFIG.enemy.turnStrength);
        enemy.nextTurnAt = scene.time.now + Phaser.Math.Between(CONFIG.enemy.directionChangeMs * FEEDBACK.turnIntervalMin, CONFIG.enemy.directionChangeMs * FEEDBACK.turnIntervalMax);
      }

      enemy.visualScale = CONFIG.enemy.visualScale * enemy.enemySkin.scale * enemy.enemyRole.scale * (scene.enemyReadabilityScale || 1);
      enemy.hitRadius = visualRadius(enemy.enemyRole, enemy.enemySkin, scene) + CONFIG.enemy.clickPadding * enemy.enemyRole.clickPaddingMultiplier;
      enemy.shadow.setScale(CONFIG.enemy.visualScale * enemy.enemySkin.shadowScale * enemy.enemyRole.scale * (scene.enemyReadabilityScale || 1));
      var previousX = enemy.x;
      var previousY = enemy.y;
      var wiggle = Math.sin(scene.time.now * CONFIG.enemy.wiggleSpeed + enemy.spawnSeed) * CONFIG.enemy.wiggleAmplitude;
      var angle = enemy.driftAngle + wiggle * FEEDBACK.wiggleAngleMultiplier;
      var nextX = enemy.x + Math.cos(angle) * enemy.speed * deltaSeconds + enemy.knockbackX * deltaSeconds;
      var nextY = enemy.y + Math.sin(angle) * enemy.speed * deltaSeconds + enemy.knockbackY * deltaSeconds;
      var inset = visualRadius(enemy.enemyRole, enemy.enemySkin, scene) + FEEDBACK.visibleEdgePadding;
      if (nextX < inset || nextX > CONFIG.canvas.width - inset) {
        enemy.driftAngle = Math.PI - enemy.driftAngle;
        enemy.knockbackX = 0;
      }
      if (nextY < inset || nextY > CONFIG.canvas.height - inset) {
        enemy.driftAngle = -enemy.driftAngle;
        enemy.knockbackY = 0;
      }
      nextX = Phaser.Math.Clamp(nextX, inset, CONFIG.canvas.width - inset);
      nextY = Phaser.Math.Clamp(nextY, inset, CONFIG.canvas.height - inset);
      if (ARENA.Obstacles && scene.obstacleSystem) {
        var adjusted = ARENA.Obstacles.avoidMovement(scene.obstacleSystem, enemy, previousX, previousY, nextX, nextY);
        nextX = adjusted.x;
        nextY = adjusted.y;
      }
      enemy.x = nextX;
      enemy.y = nextY;
      if (ARENA.Obstacles && scene.obstacleSystem) {
        ARENA.Obstacles.updateEnemyState(scene.obstacleSystem, enemy, previousX, previousY, deltaMs, scene.time.now);
      }
      enemy.knockbackX *= Math.pow(CONFIG.enemy.knockbackDecay, deltaMs / FEEDBACK.frameDurationMs);
      enemy.knockbackY *= Math.pow(CONFIG.enemy.knockbackDecay, deltaMs / FEEDBACK.frameDurationMs);
      updateOrientation(enemy, enemy.x - previousX, enemy.y - previousY, deltaMs);

      if (enemy.shadow && enemy.shadow.active) {
        enemy.shadow.x = enemy.x + FEEDBACK.shadowOffsetX;
        enemy.shadow.y = enemy.y + FEEDBACK.shadowOffsetY;
      }

      if (scene.time.now > enemy.hitFlashUntil) {
        ARENA.EnemySkins.draw(enemy);
        if (scene.time.now - enemy.spawnedAt >= CONFIG.enemy.spawnFadeMs) {
          enemy.setScale(enemy.visualScale * getPulse(scene, enemy));
        }
      } else {
        ARENA.EnemySkins.draw(enemy, enemy.enemySkin.hitColor);
      }
      drawIndicator(scene, enemy);
    });
  }

  function getPulse(scene, enemy) {
    var marker = enemy.enemyRole.marker;
    return 1 + Math.sin((scene.time.now - enemy.spawnedAt) / marker.pulsePeriodMs * Math.PI * 2) * marker.pulseAmplitude;
  }

  function drawIndicator(scene, enemy) {
    var marker = enemy.enemyRole.marker;
    var graphics = enemy.roleIndicator;
    var radius = visualRadius(enemy.enemyRole, enemy.enemySkin, scene) * FEEDBACK.markerRadiusMultiplier + FEEDBACK.markerPadding;
    var pulseRadius = radius * getPulse(scene, enemy);
    graphics.x = enemy.x;
    graphics.y = enemy.y;
    graphics.setAlpha(Phaser.Math.Clamp((scene.time.now - enemy.spawnedAt) / CONFIG.enemy.spawnFadeMs, 0, 1));
    graphics.clear();

    if (marker.ring) {
      graphics.lineStyle(FEEDBACK.markerHaloWidth, marker.color, FEEDBACK.markerHaloAlpha);
      graphics.strokeCircle(0, 0, pulseRadius);
      graphics.fillStyle(marker.color, FEEDBACK.markerFillAlpha);
      graphics.fillCircle(0, 0, pulseRadius);
      graphics.lineStyle(FEEDBACK.markerLineWidth, marker.color, FEEDBACK.markerAlpha);
      graphics.strokeCircle(0, 0, pulseRadius);
    }
    graphics.lineStyle(FEEDBACK.markerLineWidth, marker.color, FEEDBACK.markerAlpha);
    marker.paths.forEach(function (points) {
      graphics.beginPath();
      points.forEach(function (point, index) {
        if (index === 0) {
          graphics.moveTo(point[0] * radius, point[1] * radius);
        } else {
          graphics.lineTo(point[0] * radius, point[1] * radius);
        }
      });
      graphics.strokePath();
    });

    if (enemy.health < enemy.maxHealth || marker.alwaysShowHealth) {
      var barWidth = marker.healthBarWidth;
      var barHeight = FEEDBACK.healthBarHeight;
      var barOffset = marker.alwaysShowHealth ? FEEDBACK.championHealthBarOffset : FEEDBACK.healthBarOffset;
      var barY = -radius - barOffset;
      var healthRatio = Phaser.Math.Clamp(enemy.health / enemy.maxHealth, 0, 1);
      var fillWidth = (barWidth - FEEDBACK.healthBarPadding * 2) * healthRatio;
      graphics.fillStyle(FEEDBACK.healthBarTrackColor, FEEDBACK.healthBarTrackAlpha);
      graphics.fillRoundedRect(-barWidth / 2, barY, barWidth, barHeight, FEEDBACK.healthBarCornerRadius);
      graphics.lineStyle(FEEDBACK.healthBarBorderWidth, FEEDBACK.healthBarBorderColor, FEEDBACK.healthBarBorderAlpha);
      graphics.strokeRoundedRect(-barWidth / 2, barY, barWidth, barHeight, FEEDBACK.healthBarCornerRadius);
      if (fillWidth > 0) {
        graphics.fillStyle(marker.color, 1);
        graphics.fillRect(-barWidth / 2 + FEEDBACK.healthBarPadding, barY + FEEDBACK.healthBarPadding, fillWidth, barHeight - FEEDBACK.healthBarPadding * 2);
      }
    }
  }

  function damage(scene, enemy, amount, sourceX, sourceY) {
    if (!enemy || !enemy.active) {
      return false;
    }

    enemy.health -= amount;
    enemy.hitFlashUntil = scene.time.now + (enemy.enemySkin.animation.hitSquashDurationMs || CONFIG.enemy.hitFlashMs);
    ARENA.EnemySkins.draw(enemy, enemy.enemySkin.hitColor);
    enemy.setScale(enemy.visualScale * enemy.enemySkin.animation.hitSquashScaleX, enemy.visualScale * enemy.enemySkin.animation.hitSquashScaleY);
    drawIndicator(scene, enemy);

    if (sourceX !== undefined && sourceY !== undefined) {
      var angle = Phaser.Math.Angle.Between(sourceX, sourceY, enemy.x, enemy.y);
      enemy.knockbackX += Math.cos(angle) * CONFIG.enemy.knockback * enemy.enemyRole.knockbackMultiplier;
      enemy.knockbackY += Math.sin(angle) * CONFIG.enemy.knockback * enemy.enemyRole.knockbackMultiplier;
    }

    return enemy.health <= 0;
  }

  function showSpawn(scene, x, y, role, skin) {
    var color = role.id === "standard" ? CONFIG.enemy.outlineColor : role.marker.color;
    var ring = scene.add.circle(x, y, visualRadius(role, skin, scene) * FEEDBACK.spawnRingRadiusMultiplier, color, FEEDBACK.spawnRingFillAlpha);
    ring.setStrokeStyle(FEEDBACK.spawnRingLineWidth, color, FEEDBACK.spawnRingLineAlpha);
    scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: FEEDBACK.spawnRingEndScale,
      duration: CONFIG.enemy.spawnRingMs,
      onComplete: function () {
        ring.destroy();
      }
    });
  }

  function updateOrientation(enemy, moveX, moveY, deltaMs) {
    var distance = Math.sqrt(moveX * moveX + moveY * moveY);
    var animation = enemy.enemySkin.animation;

    enemy.movingAmount = Math.min(1, distance / Math.max(0.001, enemy.speed * deltaMs / 1000));
    enemy.animationPhase += deltaMs * Math.max(FEEDBACK.minimumAnimationMovement, enemy.movingAmount) * enemy.enemyRole.animationSpeedMultiplier;

    if (distance <= FEEDBACK.orientationDistanceThreshold) {
      return;
    }

    enemy.lastMoveAngle = Math.atan2(moveY, moveX);
    enemy.rotation = rotateToward(
      enemy.rotation,
      enemy.lastMoveAngle + animation.forwardAngleOffset,
      animation.rotationSmoothing,
      deltaMs
    );
  }

  function rotateToward(current, target, smoothing, deltaMs) {
    var delta = normalizeAngle(target - current);
    var amount = 1 - Math.pow(1 - smoothing, deltaMs / FEEDBACK.frameDurationMs);
    return current + delta * amount;
  }

  function normalizeAngle(angle) {
    while (angle > Math.PI) {
      angle -= Math.PI * 2;
    }
    while (angle < -Math.PI) {
      angle += Math.PI * 2;
    }
    return angle;
  }

  ARENA.Enemies = {
    getRole: getRole,
    spawn: spawn,
    create: create,
    update: update,
    damage: damage
  };
})();

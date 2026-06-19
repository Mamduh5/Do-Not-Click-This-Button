(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  function get(id) {
    return ARENA.ENEMY_SKINS.find(function (skin) {
      return skin.id === id;
    }) || ARENA.ENEMY_SKINS[0];
  }

  function getDefaultSkinId() {
    return ARENA.ENEMY_SKINS[0].id;
  }

  function getDefaultUnlocked() {
    var unlocked = {};
    ARENA.ENEMY_SKINS.forEach(function (skin) {
      if (skin.unlockedByDefault) {
        unlocked[skin.id] = true;
      }
    });
    return unlocked;
  }

  function ensureState(state) {
    if (!state.unlockedEnemySkins || typeof state.unlockedEnemySkins !== "object") {
      state.unlockedEnemySkins = getDefaultUnlocked();
    }

    Object.keys(getDefaultUnlocked()).forEach(function (id) {
      state.unlockedEnemySkins[id] = true;
    });

    if (!state.activeEnemySkin || !state.unlockedEnemySkins[state.activeEnemySkin]) {
      state.activeEnemySkin = getDefaultSkinId();
    }
  }

  function setActive(state, id) {
    ensureState(state);
    if (!state.unlockedEnemySkins[id]) {
      return false;
    }
    state.activeEnemySkin = id;
    return true;
  }

  function draw(enemy, flashColor) {
    var skin = enemy.enemySkin;
    var radius = enemy.baseRadius;
    var color = flashColor || skin.bodyColor;
    var graphics = enemy.graphics;
    var animation = skin.animation || {};
    var phase = enemy.animationPhase || 0;
    var moving = enemy.movingAmount === undefined ? 1 : enemy.movingAmount;
    var wobble = Math.sin(phase * (animation.bodyWobbleSpeed || 0.01)) * (animation.bodyWobbleAmount || 0) * moving;

    graphics.clear();
    graphics.rotation = wobble;
    graphics.lineStyle(1.5, skin.outlineColor, 0.85);

    if (skin.id === "ant") {
      drawAnt(graphics, skin, radius, color, phase, moving);
    } else if (skin.id === "eyes") {
      drawEye(graphics, skin, radius, color, moving);
    } else if (skin.id === "tank") {
      drawTank(graphics, skin, radius, color, phase, moving);
    } else if (skin.id === "tree") {
      drawTree(graphics, skin, radius, color, phase, moving);
    } else if (skin.id === "hat") {
      drawHat(graphics, skin, radius, color, phase, moving);
    }
  }

  function drawAnt(graphics, skin, radius, color, phase, moving) {
    var ant = skin.ant;
    var legPhase = phase * skin.animation.legAnimationSpeed;
    var legAmp = skin.animation.legAnimationAmplitude * moving;
    var legAnchors = [-0.28, 0.08, 0.43];

    graphics.lineStyle(1, skin.legColor, 0.92);
    legAnchors.forEach(function (xOffset, index) {
      var stride = Math.sin(legPhase + index * 1.9) * legAmp;
      var anchorX = radius * xOffset;
      graphics.lineBetween(anchorX, -radius * 0.22, anchorX - radius * 0.42 + stride, -radius * 0.78);
      graphics.lineBetween(anchorX, radius * 0.22, anchorX - radius * 0.42 - stride, radius * 0.78);
    });

    graphics.lineStyle(1, skin.outlineColor, 0.68);
    graphics.fillStyle(skin.accentColor, 1);
    graphics.fillEllipse(-radius * 0.76, 0, radius * ant.abdomenRadius * 1.25, radius * ant.abdomenRadius * 0.9);
    graphics.fillStyle(color, 1);
    graphics.fillEllipse(-radius * 0.1, 0, radius * ant.thoraxRadius * 1.05, radius * ant.thoraxRadius * 0.88);
    graphics.fillEllipse(radius * 0.58, 0, radius * ant.headRadius * 1.05, radius * ant.headRadius * 0.92);
    graphics.fillStyle(skin.outlineColor, 1);
    graphics.fillCircle(-radius * 0.43, 0, Math.max(1, radius * ant.waistWidth));
    graphics.fillCircle(radius * 0.24, 0, Math.max(1, radius * ant.waistWidth));

    graphics.lineStyle(1, skin.legColor, 0.9);
    for (var side = -1; side <= 1; side += 2) {
      graphics.lineBetween(radius * 0.92, side * radius * 0.14, radius * 1.25, side * radius * ant.antennaLength);
      graphics.lineBetween(radius * 1.25, side * radius * ant.antennaLength, radius * 1.48, side * radius * (ant.antennaLength + 0.12));
    }
  }

  function drawEye(graphics, skin, radius, color, moving) {
    var pupilOffset = (skin.animation.pupilOffset || 0.2) * moving;
    graphics.fillStyle(color, 1);
    graphics.fillCircle(0, 0, radius);
    graphics.strokeCircle(0, 0, radius);
    graphics.fillStyle(skin.accentColor, 1);
    graphics.fillCircle(radius * pupilOffset, 0, radius * 0.42);
    graphics.fillStyle(skin.pupilColor, 1);
    graphics.fillCircle(radius * (pupilOffset + 0.07), 0, radius * 0.2);
    graphics.lineStyle(1, skin.veinColor, 0.55);
    graphics.lineBetween(-radius * 0.8, -radius * 0.1, -radius * 0.35, -radius * 0.28);
    graphics.lineBetween(-radius * 0.75, radius * 0.25, -radius * 0.25, radius * 0.12);
  }

  function drawTank(graphics, skin, radius, color, phase, moving) {
    var tread = Math.sin(phase * (skin.animation.treadAnimationSpeed || 0.01)) * moving;
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-radius, -radius * 0.65, radius * 2, radius * 1.3, 3);
    graphics.strokeRoundedRect(-radius, -radius * 0.65, radius * 2, radius * 1.3, 3);
    graphics.fillStyle(skin.accentColor, 1);
    graphics.fillRect(-radius * 0.9, -radius * 0.52, radius * 1.8, radius * 0.18);
    graphics.fillRect(-radius * 0.9, radius * 0.34, radius * 1.8, radius * 0.18);
    graphics.fillCircle(-radius * 0.36 + tread, 0, radius * 0.25);
    graphics.fillCircle(radius * 0.36 - tread, 0, radius * 0.25);
    graphics.fillRect(radius * 0.08, -radius * 0.16, radius * 1.15, radius * 0.32);
  }

  function drawTree(graphics, skin, radius, color, phase, moving) {
    var lean = Math.sin(phase * skin.animation.bodyWobbleSpeed) * (skin.animation.leanAmount || 0) * moving;
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-radius * 0.55, -radius * 0.24 + lean * radius, radius * 0.8, radius * 0.48, 3);
    graphics.fillStyle(skin.leafColor, 1);
    graphics.fillCircle(radius * 0.28, -radius * 0.08 + lean * radius, radius * 0.72);
    graphics.fillStyle(skin.accentColor, 1);
    graphics.fillCircle(-radius * 0.18, -radius * 0.34 + lean * radius, radius * 0.42);
    graphics.fillCircle(radius * 0.48, radius * 0.32 + lean * radius, radius * 0.42);
    graphics.lineStyle(1, skin.outlineColor, 0.6);
    graphics.strokeCircle(radius * 0.28, -radius * 0.08 + lean * radius, radius * 0.72);
  }

  function drawHat(graphics, skin, radius, color, phase, moving) {
    var bounce = Math.abs(Math.sin(phase * skin.animation.bodyWobbleSpeed)) * (skin.animation.bounceAmount || 0) * moving;
    graphics.fillStyle(skin.accentColor, 1);
    graphics.fillEllipse(radius * 0.14, radius * 0.24 - bounce, radius * 2.25, radius * 0.55);
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-radius * 0.58, -radius * 0.78 - bounce, radius * 1.18, radius * 1.08, 4);
    graphics.strokeRoundedRect(-radius * 0.58, -radius * 0.78 - bounce, radius * 1.18, radius * 1.08, 4);
    graphics.fillStyle(skin.accentColor, 1);
    graphics.fillRect(-radius * 0.58, -radius * 0.12 - bounce, radius * 1.18, radius * 0.18);
    graphics.fillTriangle(radius * 0.86, radius * 0.18 - bounce, radius * 1.2, radius * 0.24 - bounce, radius * 0.86, radius * 0.02 - bounce);
  }

  ARENA.EnemySkins = {
    get: get,
    getDefaultSkinId: getDefaultSkinId,
    getDefaultUnlocked: getDefaultUnlocked,
    ensureState: ensureState,
    setActive: setActive,
    draw: draw
  };
})();

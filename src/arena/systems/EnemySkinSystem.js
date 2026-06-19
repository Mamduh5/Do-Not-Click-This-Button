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

    graphics.clear();
    graphics.lineStyle(1.5, skin.outlineColor, 0.85);

    if (skin.id === "ant") {
      drawAnt(graphics, skin, radius, color);
    } else if (skin.id === "eyes") {
      drawEye(graphics, skin, radius, color);
    } else if (skin.id === "tank") {
      drawTank(graphics, skin, radius, color);
    } else if (skin.id === "tree") {
      drawTree(graphics, skin, radius, color);
    } else if (skin.id === "hat") {
      drawHat(graphics, skin, radius, color);
    }
  }

  function drawAnt(graphics, skin, radius, color) {
    graphics.lineStyle(1, skin.legColor, 0.9);
    for (var index = -1; index <= 1; index += 1) {
      graphics.lineBetween(-radius * 0.3, index * radius * 0.35, -radius * 1.15, index * radius * 0.6);
      graphics.lineBetween(radius * 0.3, index * radius * 0.35, radius * 1.15, index * radius * 0.6);
    }
    graphics.fillStyle(color, 1);
    graphics.fillCircle(-radius * 0.45, 0, radius * 0.55);
    graphics.fillCircle(radius * 0.25, 0, radius * 0.72);
    graphics.fillStyle(skin.accentColor, 1);
    graphics.fillCircle(radius * 0.95, 0, radius * 0.45);
  }

  function drawEye(graphics, skin, radius, color) {
    graphics.fillStyle(color, 1);
    graphics.fillCircle(0, 0, radius);
    graphics.strokeCircle(0, 0, radius);
    graphics.fillStyle(skin.accentColor, 1);
    graphics.fillCircle(radius * 0.15, 0, radius * 0.42);
    graphics.fillStyle(skin.pupilColor, 1);
    graphics.fillCircle(radius * 0.2, 0, radius * 0.2);
    graphics.lineStyle(1, skin.veinColor, 0.55);
    graphics.lineBetween(-radius * 0.8, -radius * 0.1, -radius * 0.35, -radius * 0.28);
    graphics.lineBetween(-radius * 0.75, radius * 0.25, -radius * 0.25, radius * 0.12);
  }

  function drawTank(graphics, skin, radius, color) {
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-radius, -radius * 0.65, radius * 2, radius * 1.3, 3);
    graphics.strokeRoundedRect(-radius, -radius * 0.65, radius * 2, radius * 1.3, 3);
    graphics.fillStyle(skin.accentColor, 1);
    graphics.fillCircle(-radius * 0.36, 0, radius * 0.25);
    graphics.fillCircle(radius * 0.36, 0, radius * 0.25);
    graphics.fillRect(radius * 0.1, -radius * 0.16, radius * 1.05, radius * 0.32);
  }

  function drawTree(graphics, skin, radius, color) {
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-radius * 0.32, -radius * 0.2, radius * 0.64, radius * 1.15, 3);
    graphics.fillStyle(skin.leafColor, 1);
    graphics.fillCircle(0, -radius * 0.65, radius * 0.72);
    graphics.fillStyle(skin.accentColor, 1);
    graphics.fillCircle(-radius * 0.42, -radius * 0.42, radius * 0.42);
    graphics.fillCircle(radius * 0.44, -radius * 0.38, radius * 0.42);
    graphics.lineStyle(1, skin.outlineColor, 0.6);
    graphics.strokeCircle(0, -radius * 0.65, radius * 0.72);
  }

  function drawHat(graphics, skin, radius, color) {
    graphics.fillStyle(skin.accentColor, 1);
    graphics.fillEllipse(0, radius * 0.25, radius * 2.2, radius * 0.55);
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-radius * 0.62, -radius * 0.78, radius * 1.24, radius * 1.08, 4);
    graphics.strokeRoundedRect(-radius * 0.62, -radius * 0.78, radius * 1.24, radius * 1.08, 4);
    graphics.fillStyle(skin.accentColor, 1);
    graphics.fillRect(-radius * 0.66, -radius * 0.12, radius * 1.32, radius * 0.18);
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

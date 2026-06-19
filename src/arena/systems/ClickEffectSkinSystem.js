(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  function get(id) {
    return ARENA.CLICK_EFFECT_SKINS.find(function (skin) {
      return skin.id === id;
    }) || ARENA.CLICK_EFFECT_SKINS[0];
  }

  function getDefaultSkinId() {
    return ARENA.CLICK_EFFECT_SKINS[0].id;
  }

  function getDefaultUnlocked() {
    var unlocked = {};
    ARENA.CLICK_EFFECT_SKINS.forEach(function (skin) {
      if (skin.unlockedByDefault) {
        unlocked[skin.id] = true;
      }
    });
    return unlocked;
  }

  function ensureState(state) {
    if (!state.unlockedClickSkins || typeof state.unlockedClickSkins !== "object") {
      state.unlockedClickSkins = getDefaultUnlocked();
    }

    Object.keys(getDefaultUnlocked()).forEach(function (id) {
      state.unlockedClickSkins[id] = true;
    });

    if (!state.activeClickSkin || !state.unlockedClickSkins[state.activeClickSkin]) {
      state.activeClickSkin = getDefaultSkinId();
    }
  }

  function setActive(state, id) {
    ensureState(state);
    if (!state.unlockedClickSkins[id]) {
      return false;
    }
    state.activeClickSkin = id;
    return true;
  }

  function getActive(state) {
    ensureState(state);
    return get(state.activeClickSkin);
  }

  function drawImpact(scene, x, y, options) {
    var skin = getActive(scene.state);
    var helper = Boolean(options && options.helper);
    var hit = Boolean(options && options.hit);
    var kill = Boolean(options && options.kill);
    var miss = !hit && !kill;
    var scale = (options && options.scale ? options.scale : 1) * (helper ? skin.helperScale : 1);

    if (kill) {
      scale *= skin.killScale;
    } else if (hit) {
      scale *= skin.hitScale;
    } else if (miss) {
      scale *= skin.missScale;
    }

    if (skin.id === "meteorImpact") {
      drawMeteor(scene, skin, x, y, scale, kill);
    } else if (skin.id === "pixelShatter") {
      drawPixels(scene, skin, x, y, scale);
    } else if (skin.id === "sciFiLaser") {
      drawLaser(scene, skin, x, y, scale);
    } else if (skin.id === "groundBreak") {
      drawGroundBreak(scene, skin, x, y, scale);
    }

    if (!helper && !(options && options.silent)) {
      scene.soundSystem.playClickSkin(skin.id);
    }

    mark(scene, "skin_" + skin.id);
  }

  function drawMeteor(scene, skin, x, y, scale, kill) {
    ring(scene, x, y, skin.ringRadius * scale, skin.warningColor, 0.5, skin.durationMs);
    var meteor = scene.add.circle(x + skin.meteorOffsetX * scale, y + skin.meteorOffsetY * scale, skin.meteorRadius * scale, skin.primaryColor, 0.92);
    var streak = scene.add.line(0, 0, x + skin.streakOffsetX * scale, y + skin.streakOffsetY * scale, x + skin.streakEndOffsetX * scale, y + skin.streakEndOffsetY * scale, skin.warningColor, 0.65).setOrigin(0, 0);
    scene.tweens.add({
      targets: meteor,
      x: x,
      y: y,
      scale: 0.35,
      alpha: 0,
      duration: skin.durationMs * 0.55,
      onComplete: function () {
        meteor.destroy();
      }
    });
    fade(scene, streak, skin.durationMs * 0.65);
    scatter(scene, skin, x, y, scale, "circle");
    if (kill && scene.cameras && scene.cameras.main) {
      scene.cameras.main.shake(skin.shakeMs, skin.shakeIntensity);
    }
  }

  function drawPixels(scene, skin, x, y, scale) {
    ring(scene, x, y, skin.ringRadius * scale, skin.primaryColor, 0.45, skin.durationMs);
    scatter(scene, skin, x, y, scale, "square");
  }

  function drawLaser(scene, skin, x, y, scale) {
    var height = skin.beamHeight * scale;
    var reticle = scene.add.graphics();
    reticle.lineStyle(Math.max(1, 2 * scale), skin.primaryColor, 0.75);
    reticle.strokeCircle(x, y, skin.reticleRadius * scale);
    reticle.lineBetween(x - skin.reticleLineLength * scale, y, x + skin.reticleLineLength * scale, y);
    reticle.lineBetween(x, y - skin.reticleLineLength * scale, x, y + skin.reticleLineLength * scale);
    fade(scene, reticle, skin.durationMs);

    var beam = scene.add.rectangle(x, y - height * 0.28, Math.max(3, skin.beamWidth * scale), height, skin.primaryColor, 0.55);
    fade(scene, beam, skin.durationMs * 0.72);
    scatter(scene, skin, x, y, scale, "spark");
  }

  function drawGroundBreak(scene, skin, x, y, scale) {
    var cracks = scene.add.graphics();
    cracks.lineStyle(Math.max(1, 2 * scale), skin.primaryColor, 0.82);
    for (var index = 0; index < skin.crackLines; index += 1) {
      var angle = (Math.PI * 2 * index) / skin.crackLines + Phaser.Math.FloatBetween(-0.22, 0.22);
      var length = Phaser.Math.Between(skin.crackLength * 0.45, skin.crackLength) * scale;
      cracks.lineBetween(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    }
    fade(scene, cracks, skin.durationMs);
    scatter(scene, skin, x, y, scale, "circle");
    if (scene.cameras && scene.cameras.main) {
      scene.cameras.main.shake(skin.shakeMs, skin.shakeIntensity);
    }
  }

  function scatter(scene, skin, x, y, scale, shape) {
    for (var index = 0; index < skin.particleCount; index += 1) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var distance = Phaser.Math.Between(skin.particleDistance * 0.35, skin.particleDistance) * scale;
      var size = Math.max(2, skin.particleSize * scale);
      var particle = shape === "square" ? scene.add.rectangle(x, y, size, size, index % 2 ? skin.secondaryColor : skin.particleColor, 0.86) : scene.add.circle(x, y, size * 0.5, index % 2 ? skin.secondaryColor : skin.particleColor, 0.78);

      scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        angle: Phaser.Math.Between(-90, 90),
        alpha: 0,
        scale: 0.2,
        duration: skin.durationMs,
        onComplete: function () {
          particle.destroy();
        }
      });
    }
  }

  function ring(scene, x, y, radius, color, alpha, duration) {
    var shape = scene.add.circle(x, y, radius, color, 0.04);
    shape.setStrokeStyle(2, color, alpha);
    scene.tweens.add({
      targets: shape,
      scale: 1.45,
      alpha: 0,
      duration: duration,
      onComplete: function () {
        shape.destroy();
      }
    });
  }

  function fade(scene, target, duration) {
    scene.tweens.add({
      targets: target,
      alpha: 0,
      duration: duration,
      onComplete: function () {
        target.destroy();
      }
    });
  }

  function mark(scene, type) {
    scene.effectCounts[type] = (scene.effectCounts[type] || 0) + 1;
  }

  ARENA.ClickEffectSkins = {
    get: get,
    getActive: getActive,
    getDefaultSkinId: getDefaultSkinId,
    getDefaultUnlocked: getDefaultUnlocked,
    ensureState: ensureState,
    setActive: setActive,
    drawImpact: drawImpact
  };
})();

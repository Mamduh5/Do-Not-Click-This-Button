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
    } else if (skin.id === "paperDrop") {
      drawPaper(scene, skin, x, y, scale);
    } else if (skin.id === "arrowStrike") {
      drawArrowRain(scene, skin, x, y, scale);
    }

    if (ARENA.DestructibleBackground && scene.destructibleBackgroundSystem && !(options && options.noDecal)) {
      ARENA.DestructibleBackground.apply(scene.destructibleBackgroundSystem, skin, x, y, scale);
    }

    if (ARENA.BackgroundEffects && !(options && options.noDecal)) {
      ARENA.BackgroundEffects.add(scene.backgroundEffectSystem, skin, x, y, scale);
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
    if (kill && skin.shakeIntensity > 0 && scene.cameras && scene.cameras.main) {
      scene.cameras.main.shake(skin.shakeMs, skin.shakeIntensity);
    }
  }

  function drawPixels(scene, skin, x, y, scale) {
    var glitch = scene.add.graphics();
    var grid = skin.decalGridSize || 4;
    var pixelSize = Math.max(2, skin.pixelSize * scale);
    glitch.fillStyle(skin.primaryColor, 0.18);
    glitch.fillRect(x - grid * pixelSize * 0.5, y - grid * pixelSize * 0.5, grid * pixelSize, grid * pixelSize);
    glitch.lineStyle(Math.max(1, pixelSize * 0.35), skin.secondaryColor, 0.7);
    for (var line = -2; line <= 2; line += 1) {
      glitch.lineBetween(x - skin.ringRadius * scale, y + line * pixelSize, x + skin.ringRadius * scale, y + line * pixelSize);
    }
    mark(scene, "pixelBreak");
    scene.tweens.add({
      targets: glitch,
      alpha: 0.18,
      y: y + Phaser.Math.Between(-2, 2),
      duration: skin.glitchFlickerMs,
      yoyo: true,
      repeat: 1,
      onComplete: function () {
        fade(scene, glitch, skin.durationMs * 0.45);
      }
    });
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
    cracks.lineStyle(Math.max(1, skin.crackLineWidth * scale), skin.primaryColor, 0.82);
    cracks.fillStyle(skin.secondaryColor, 0.08);
    cracks.fillCircle(x, y, skin.craterRadius * scale);
    for (var index = 0; index < skin.crackLines; index += 1) {
      var angle = (Math.PI * 2 * index) / skin.crackLines + Phaser.Math.FloatBetween(-0.22, 0.22);
      var length = Phaser.Math.Between(skin.crackLengthMin, skin.crackLengthMax) * scale;
      var endX = x + Math.cos(angle) * length;
      var endY = y + Math.sin(angle) * length;
      cracks.lineBetween(x, y, endX, endY);
      if (Math.random() < skin.crackBranchChance) {
        var branchAngle = angle + Phaser.Math.FloatBetween(-0.85, 0.85);
        var branchLength = length * Phaser.Math.FloatBetween(0.25, 0.48);
        cracks.lineBetween(endX, endY, endX + Math.cos(branchAngle) * branchLength, endY + Math.sin(branchAngle) * branchLength);
      }
    }
    mark(scene, "groundFracture");
    fade(scene, cracks, skin.durationMs);
    scatter(scene, Object.assign({}, skin, { particleCount: skin.dustParticleCount }), x, y, scale, "dust");
    if (skin.shakeIntensity > 0 && scene.cameras && scene.cameras.main) {
      scene.cameras.main.shake(skin.shakeMs, skin.shakeIntensity);
    }
  }

  function drawPaper(scene, skin, x, y, scale) {
    var paper = scene.add.rectangle(x, y + skin.paperOffsetY * scale, skin.paperWidth * scale, skin.paperHeight * scale, skin.primaryColor, 0.92);
    paper.setStrokeStyle(1, skin.secondaryColor, 0.85);
    scene.tweens.add({
      targets: paper,
      y: y,
      angle: Phaser.Math.Between(-10, 10),
      scaleY: 0.18,
      alpha: 0,
      duration: skin.durationMs * 0.62,
      onComplete: function () {
        paper.destroy();
      }
    });

    var slash = scene.add.line(0, 0, x - skin.slashLength * 0.5 * scale, y - skin.slashLength * 0.18 * scale, x + skin.slashLength * 0.5 * scale, y + skin.slashLength * 0.18 * scale, skin.secondaryColor, 0.82).setOrigin(0, 0);
    fade(scene, slash, skin.durationMs * 0.78);
    scatter(scene, skin, x, y, scale, "paper");
  }

  function drawArrowRain(scene, skin, x, y, scale) {
    var target = scene.add.circle(x, y, skin.targetRadius * scale, skin.primaryColor, skin.targetAlpha);
    target.setStrokeStyle(1, skin.primaryColor, 0.24);
    fade(scene, target, skin.durationMs);

    var count = Phaser.Math.Between(skin.arrowCountMin, skin.arrowCountMax);
    mark(scene, "arrowRain");
    for (var index = 0; index < count; index += 1) {
      var landX = x + Phaser.Math.FloatBetween(-skin.arrowSpreadRadius, skin.arrowSpreadRadius) * scale;
      var landY = y + Phaser.Math.FloatBetween(-skin.arrowSpreadRadius, skin.arrowSpreadRadius) * scale;
      var startX = landX - skin.arrowSpawnDistance * scale + Phaser.Math.FloatBetween(-16, 16) * scale;
      var startY = landY - skin.arrowSpawnHeight * scale - index * 5 * scale;
      var travelAngle = Phaser.Math.Angle.Between(startX, startY, landX, landY);
      var arrow = createBowArrow(scene, skin, startX, startY, travelAngle, scale);
      var trail = scene.add.line(0, 0, startX, startY, landX, landY, skin.trailColor, skin.trailAlpha).setOrigin(0, 0);
      var duration = skin.arrowTravelDurationMs + index * 12;

      tweenArrow(scene, skin, arrow, trail, landX, landY, duration, scale);
    }
  }

  function tweenArrow(scene, skin, arrow, trail, landX, landY, duration, scale) {
    scene.tweens.add({
      targets: arrow,
      x: landX,
      y: landY,
      duration: duration,
      ease: "Cubic.easeIn",
      onComplete: function () {
        mark(scene, "arrowRainArrow");
        scatter(scene, Object.assign({}, skin, { particleCount: skin.impactParticleCount }), landX, landY, scale, "dust");
        fade(scene, arrow, skin.punctureDecalDurationMs);
      }
    });
    scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: duration * 1.2,
      onComplete: function () {
        trail.destroy();
      }
    });
  }

  function createBowArrow(scene, skin, x, y, rotation, scale) {
    var arrow = scene.add.container(x, y);
    var graphics = scene.add.graphics();
    graphics.lineStyle(Math.max(1, skin.arrowShaftWidth * scale), skin.arrowShaftColor, 0.96);
    graphics.lineBetween(-skin.arrowShaftLength * scale, 0, -skin.arrowHeadSize * 0.5 * scale, 0);
    graphics.fillStyle(skin.arrowHeadColor, 0.98);
    graphics.fillTriangle(0, 0, -skin.arrowHeadSize * scale, -skin.arrowHeadSize * 0.45 * scale, -skin.arrowHeadSize * scale, skin.arrowHeadSize * 0.45 * scale);
    graphics.fillStyle(skin.arrowFeatherColor, 0.92);
    graphics.fillTriangle(-skin.arrowShaftLength * scale, 0, -skin.arrowShaftLength * 0.76 * scale, -skin.arrowShaftWidth * 2.3 * scale, -skin.arrowShaftLength * 0.7 * scale, 0);
    graphics.fillStyle(skin.arrowFeatherAccentColor, 0.92);
    graphics.fillTriangle(-skin.arrowShaftLength * scale, 0, -skin.arrowShaftLength * 0.76 * scale, skin.arrowShaftWidth * 2.3 * scale, -skin.arrowShaftLength * 0.7 * scale, 0);
    arrow.add(graphics);
    arrow.rotation = rotation;
    return arrow;
  }

  function scatter(scene, skin, x, y, scale, shape) {
    for (var index = 0; index < skin.particleCount; index += 1) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var distance = Phaser.Math.Between(skin.particleDistance * 0.35, skin.particleDistance) * scale;
      var size = Math.max(2, skin.particleSize * scale);
      var particle = shape === "square" || shape === "paper" ? scene.add.rectangle(x, y, shape === "paper" ? size * 1.4 : size, size, index % 2 ? skin.secondaryColor : skin.particleColor, 0.86) : scene.add.circle(x, y, size * 0.5, index % 2 ? skin.secondaryColor : skin.particleColor, shape === "dust" ? 0.42 : 0.78);

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

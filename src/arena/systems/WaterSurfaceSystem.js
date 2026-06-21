(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function create(scene, material) {
    var config = material && material.waterSurface ? material.waterSurface : null;
    var active = Boolean(material && material.id === "water" && config && config.enabled);
    var size = active ? config.gridCols * config.gridRows : 0;
    var system = {
      scene: scene,
      materialId: material ? material.id : null,
      active: active,
      config: config || {},
      graphics: null,
      current: new Array(size).fill(0),
      previous: new Array(size).fill(0),
      ripples: [],
      foam: [],
      impulses: [],
      arcs: [],
      splashSprites: [],
      fragmentSprites: [],
      foamSprites: [],
      dropletSprites: [],
      fullCrownSprites: [],
      causticOverlay: null,
      fullCircleRippleCount: 0,
      lastUpdateMs: -Infinity,
      lastImpulseType: null,
      lastSplashAssetType: null,
      totalImpulseCount: 0,
      totalFragmentSpriteCount: 0,
      totalFoamSpriteCount: 0,
      totalDropletSpriteCount: 0,
      totalFullCrownSpriteCount: 0,
      strongestImpulse: 0,
      averageEnergy: 0,
      usesAssetSplash: false,
      missingAssetSplash: []
    };

    system.usesAssetSplash = active && splashAssetsAvailable(scene, config);

    if (active && config.visualEnabled !== false) {
      system.graphics = scene.add.graphics();
      system.graphics.setDepth(CONFIG.destructibleBackground.repairDepth + 0.35);
      createCausticOverlay(system);
    }

    return system;
  }

  function update(system, timeMs) {
    if (!system || !system.active) {
      return;
    }
    if (timeMs - system.lastUpdateMs < (system.config.renderUpdateIntervalMs || system.config.updateIntervalMs)) {
      return;
    }
    system.lastUpdateMs = timeMs;
    propagate(system);
    render(system);
    system.impulses = system.impulses.filter(function (impulse) {
      return timeMs - impulse.timeMs < system.config.foamDurationMs;
    });
  }

  function addImpulse(system, response, x, y, scale, options) {
    if (!system || !system.active) {
      return null;
    }
    var impulseType = normalizeResponse(response);
    var strength = (system.config.effectImpulseScale[impulseType] || 0.5) * (scale || 1) * (options && options.strengthMultiplier || 1);
    var count = impulseType === "arrowRain" ? 6 : 1;
    var radius = options && options.radius ? options.radius : system.config.impulseRadius;
    var points = [];

    for (var index = 0; index < count; index += 1) {
      var offsetRadius = impulseType === "arrowRain" ? Phaser.Math.Between(6, 26) * (scale || 1) : 0;
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      points.push({
        x: x + Math.cos(angle) * offsetRadius,
        y: y + Math.sin(angle) * offsetRadius,
        strength: strength * (impulseType === "arrowRain" ? 0.72 : 1)
      });
    }

    points.forEach(function (point) {
      addGridImpulse(system, point.x, point.y, point.strength, radius);
      createRippleObject(system, impulseType, point.x, point.y, point.strength, scale || 1);
    });

    system.totalImpulseCount += points.length;
    system.lastImpulseType = impulseType;
    system.strongestImpulse = Math.max(system.strongestImpulse, strength);
    system.impulses.push({
      type: impulseType,
      count: points.length,
      strength: strength,
      timeMs: system.scene.time ? system.scene.time.now : 0
    });
    system.scene.effectCounts.waterSurfaceImpulse = (system.scene.effectCounts.waterSurfaceImpulse || 0) + points.length;
    system.scene.effectCounts["waterSurfaceImpulse_" + impulseType] = (system.scene.effectCounts["waterSurfaceImpulse_" + impulseType] || 0) + points.length;

    return {
      type: impulseType,
      count: points.length,
      strength: strength
    };
  }

  function normalizeResponse(response) {
    if (response === "laser") {
      return "sciFiLaser";
    }
    return response || "groundBreak";
  }

  function addGridImpulse(system, x, y, strength, radius) {
    var cell = worldToCell(system, x, y);
    for (var dx = -radius; dx <= radius; dx += 1) {
      for (var dy = -radius; dy <= radius; dy += 1) {
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= radius) {
          var cx = cell.col + dx;
          var cy = cell.row + dy;
          if (isInGrid(system, cx, cy)) {
            system.current[indexOf(system, cx, cy)] += strength * (1 - distance / (radius + 1));
          }
        }
      }
    }
  }

  function propagate(system) {
    var cols = system.config.gridCols;
    var rows = system.config.gridRows;
    var next = new Array(cols * rows).fill(0);
    var energy = 0;

    for (var row = 1; row < rows - 1; row += 1) {
      for (var col = 1; col < cols - 1; col += 1) {
        var index = indexOf(system, col, row);
        var neighborAverage = (
          system.current[indexOf(system, col - 1, row)] +
          system.current[indexOf(system, col + 1, row)] +
          system.current[indexOf(system, col, row - 1)] +
          system.current[indexOf(system, col, row + 1)]
        ) * 0.25;
        var value = (neighborAverage * system.config.propagation + system.current[index] * (1 - system.config.propagation)) * 2 - system.previous[index];
        value *= system.config.damping;
        next[index] = value;
        energy += Math.abs(value);
      }
    }

    system.previous = system.current;
    system.current = next;
    system.averageEnergy = energy / Math.max(1, cols * rows);
  }

  function render(system) {
    if (!system.graphics || system.config.debugGridVisible === false || system.config.showEnergyCells === false) {
      if (system.graphics) {
        system.graphics.clear();
      }
      return;
    }
    var graphics = system.graphics;
    var config = system.config;
    var cellWidth = CONFIG.canvas.width / config.gridCols;
    var cellHeight = CONFIG.canvas.height / config.gridRows;
    var rendered = 0;
    graphics.clear();
    for (var row = 1; row < config.gridRows - 1; row += 1) {
      for (var col = 1; col < config.gridCols - 1; col += 1) {
        var value = system.current[indexOf(system, col, row)];
        if (Math.abs(value) >= config.renderThreshold) {
          var alpha = Math.min(0.24, Math.abs(value) * 0.16);
          graphics.fillStyle(value > 0 ? config.highlightColor : config.shadowColor, alpha);
          graphics.lineStyle(1, value > 0 ? config.highlightColor : config.shadowColor, alpha * 0.65);
          graphics.lineBetween((col + 0.15) * cellWidth, (row + 0.5) * cellHeight, (col + 0.85) * cellWidth, (row + 0.5) * cellHeight);
          rendered += 1;
          if (rendered >= config.maxRenderedCells) {
            return;
          }
        }
      }
    }
  }

  function createRippleObject(system, impulseType, x, y, strength, scale) {
    var splashScale = (system.config.effectSplashScale && system.config.effectSplashScale[impulseType]) || 1;
    var assetSplashCreated = createAssetSplash(system, impulseType, x, y, strength, scale * splashScale);

    if (!assetSplashCreated) {
      createBrokenArcs(system, impulseType, x, y, strength, scale * splashScale);

      if (impulseType === "meteor" || impulseType === "groundBreak" || impulseType === "sciFiLaser") {
        createFoam(system, x, y, strength, scale * splashScale, impulseType);
        createDroplets(system, x, y, scale * splashScale, impulseType);
      }
      if (impulseType === "arrowRain") {
        createFoam(system, x, y, strength, scale * splashScale, impulseType);
      }
    }
    if (impulseType === "pixelShatter") {
      createPixelDisturbance(system, x, y, scale);
    }

    capRipples(system);
  }

  function createCausticOverlay(system) {
    var config = system.config.causticAssetOverlay || {};
    if (!config.enabled || !hasTexture(system.scene, config.key)) {
      return;
    }
    var overlay = system.scene.add.image(CONFIG.canvas.width / 2, CONFIG.canvas.height / 2, config.key);
    overlay.setOrigin(0.5, 0.5);
    overlay.setDepth(CONFIG.destructibleBackground.surfaceDepth + (config.depthOffset || 0.4));
    overlay.setAlpha(config.alphaMin || 0.08);
    overlay.setScale(coverScale(system.scene, config.key) * (config.scale || 1));
    system.causticOverlay = overlay;
    if (system.scene.tweens && system.scene.tweens.add) {
      system.scene.tweens.add({
        targets: overlay,
        x: CONFIG.canvas.width / 2 + (config.driftX || 12),
        y: CONFIG.canvas.height / 2 + (config.driftY || 8),
        alpha: config.alphaMax || 0.14,
        duration: config.durationMs || 5200,
        yoyo: true,
        repeat: -1
      });
    }
  }

  function createAssetSplash(system, impulseType, x, y, strength, scale) {
    var assets = system.config.splashAssets || {};
    if (!system.usesAssetSplash || !assets.enabled) {
      return false;
    }
    var effect = (assets.effects && (assets.effects[impulseType] || assets.effects.groundBreak)) || {};
    if (system.scene.time && system.scene.time.delayedCall) {
      system.scene.time.delayedCall(0, function () {
        spawnAssetSplashSprites(system, impulseType, x, y, strength, scale, assets, effect);
      });
    } else {
      spawnAssetSplashSprites(system, impulseType, x, y, strength, scale, assets, effect);
    }
    return true;
  }

  function spawnAssetSplashSprites(system, impulseType, x, y, strength, scale, assets, effect) {
    var duration = effect.durationMs || 520;
    createCrownFlash(system, assets, effect, x, y);
    createSplashFragments(system, assets, effect, x, y, duration);
    createFoamPieces(system, assets, effect, x, y, duration);
    createDropletPieces(system, assets, effect, x, y, duration);

    system.lastSplashAssetType = impulseType;
    system.scene.effectCounts.waterAssetSplash = (system.scene.effectCounts.waterAssetSplash || 0) + 1;
    system.scene.effectCounts["waterAssetSplash_" + impulseType] = (system.scene.effectCounts["waterAssetSplash_" + impulseType] || 0) + 1;
    capAssetSprites(system);
  }

  function createCrownFlash(system, assets, effect, x, y) {
    if (!effect.crownFlashWidth || effect.crownFlashAlpha <= 0) {
      return;
    }
    var flash = system.scene.add.image(x, y, assets.crownKey);
    flash.setOrigin(0.5, 0.5);
    flash.setDepth(CONFIG.destructibleBackground.surfaceDepth + (assets.flashDepthOffset || 21));
    flash.setAlpha(effect.crownFlashAlpha);
    flash.setRotation(Phaser.Math.FloatBetween(-Math.PI, Math.PI));
    setSpriteDisplayWidth(system.scene, flash, effect.crownFlashWidth);
    system.fullCrownSprites.push(flash);
    system.splashSprites.push(flash);
    system.totalFullCrownSpriteCount += 1;
    scheduleSpriteFade(system, system.fullCrownSprites, flash, effect.crownFlashMs || 70, {
      alpha: 0,
      duration: Math.max(80, effect.crownFlashMs || 70),
      onCompleteExtra: removeFromList(system.splashSprites, flash)
    });
  }

  function createSplashFragments(system, assets, effect, x, y, duration) {
    for (var index = 0; index < (effect.fragmentCount || 0); index += 1) {
      var angle = Math.PI * 2 * index / Math.max(1, effect.fragmentCount) + Phaser.Math.FloatBetween(-0.42, 0.42);
      var startDistance = Phaser.Math.FloatBetween(2, 12);
      var drift = Phaser.Math.FloatBetween(effect.driftMin || 8, effect.driftMax || 38);
      var fragment = system.scene.add.image(x + Math.cos(angle) * startDistance, y + Math.sin(angle) * startDistance, assets.crownKey);
      fragment.setOrigin(0.5, 0.5);
      fragment.setDepth(CONFIG.destructibleBackground.surfaceDepth + (assets.fragmentDepthOffset || 21.15));
      fragment.setAlpha(Phaser.Math.FloatBetween(0.72, 0.92));
      fragment.setRotation(angle + Phaser.Math.FloatBetween(-0.9, 0.9));
      setRandomCrop(system.scene, fragment, assets.crownKey, index);
      setSpriteDisplayWidth(system.scene, fragment, Phaser.Math.Between(effect.fragmentWidthMin || 18, effect.fragmentWidthMax || 38));
      system.fragmentSprites.push(fragment);
      system.splashSprites.push(fragment);
      system.totalFragmentSpriteCount += 1;
      tweenAndRemoveSprite(system, system.fragmentSprites, fragment, {
        x: fragment.x + Math.cos(angle) * drift,
        y: fragment.y + Math.sin(angle) * drift,
        alpha: 0,
        angle: fragment.angle + Phaser.Math.Between(-28, 28),
        duration: duration,
        onCompleteExtra: removeFromList(system.splashSprites, fragment)
      });
    }
  }

  function removeFromList(list, item) {
    return function () {
      remove(list, item);
    };
  }

  function createFoamPieces(system, assets, effect, x, y, duration) {
    for (var index = 0; index < (effect.foamCount || 0); index += 1) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var startDistance = Phaser.Math.FloatBetween(0, 14);
      var drift = Phaser.Math.FloatBetween((effect.driftMin || 8) * 0.45, (effect.driftMax || 36) * 0.85);
      var foam = system.scene.add.image(x + Math.cos(angle) * startDistance, y + Math.sin(angle) * startDistance, assets.foamKey);
      foam.setOrigin(0.5, 0.5);
      foam.setDepth(CONFIG.destructibleBackground.surfaceDepth + (assets.foamDepthOffset || 21.05));
      foam.setAlpha(Phaser.Math.FloatBetween(0.4, 0.62));
      foam.setRotation(Phaser.Math.FloatBetween(-Math.PI, Math.PI));
      setSpriteDisplayWidth(system.scene, foam, Phaser.Math.Between(effect.foamWidthMin || 12, effect.foamWidthMax || 32));
      system.foamSprites.push(foam);
      system.totalFoamSpriteCount += 1;
      tweenAndRemoveSprite(system, system.foamSprites, foam, {
        x: foam.x + Math.cos(angle) * drift,
        y: foam.y + Math.sin(angle) * drift,
        alpha: 0,
        scaleX: foam.scaleX * 1.18,
        scaleY: foam.scaleY * 1.18,
        duration: Math.max(120, duration * 0.92)
      });
    }
  }

  function createDropletPieces(system, assets, effect, x, y, duration) {
    for (var index = 0; index < (effect.dropletCount || 0); index += 1) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var drift = Phaser.Math.FloatBetween(effect.driftMin || 8, effect.driftMax || 36);
      var droplet = system.scene.add.image(x, y, assets.foamKey);
      droplet.setOrigin(0.5, 0.5);
      droplet.setDepth(CONFIG.destructibleBackground.surfaceDepth + (assets.dropletDepthOffset || 21.3));
      droplet.setAlpha(Phaser.Math.FloatBetween(0.48, 0.72));
      droplet.setRotation(angle);
      setSpriteDisplayWidth(system.scene, droplet, Phaser.Math.Between(effect.dropletWidthMin || 3, effect.dropletWidthMax || 8));
      system.dropletSprites.push(droplet);
      system.totalDropletSpriteCount += 1;
      tweenAndRemoveSprite(system, system.dropletSprites, droplet, {
        x: x + Math.cos(angle) * drift,
        y: y + Math.sin(angle) * drift,
        alpha: 0,
        scaleX: droplet.scaleX * 0.55,
        scaleY: droplet.scaleY * 0.55,
        duration: Math.max(100, duration * 0.72)
      });
    }
  }

  function setSpriteDisplayWidth(scene, sprite, targetWidth) {
    var size = getTextureSize(scene, sprite.texture && sprite.texture.key);
    var height = targetWidth * (size.height / Math.max(1, size.width));
    if (sprite.isCropped && sprite.cropWidth && sprite.cropHeight) {
      height = targetWidth * (sprite.cropHeight / Math.max(1, sprite.cropWidth));
    }
    if (sprite.setDisplaySize) {
      sprite.setDisplaySize(targetWidth, height);
      return;
    }
    sprite.setScale(targetWidth / Math.max(1, size.width));
  }

  function setRandomCrop(scene, sprite, key, index) {
    if (!sprite.setCrop) {
      return;
    }
    var size = getTextureSize(scene, key);
    var cropWidth = Math.max(32, Math.floor(size.width * Phaser.Math.FloatBetween(0.34, 0.52)));
    var cropHeight = Math.max(32, Math.floor(size.height * Phaser.Math.FloatBetween(0.3, 0.5)));
    var centerX = (size.width - cropWidth) * 0.5;
    var centerY = (size.height - cropHeight) * 0.5;
    var cropX = Math.floor(Phaser.Math.Clamp(centerX + Math.cos(index * 1.7) * size.width * 0.16, 0, Math.max(0, size.width - cropWidth)));
    var cropY = Math.floor(Phaser.Math.Clamp(centerY + Math.sin(index * 1.3) * size.height * 0.14, 0, Math.max(0, size.height - cropHeight)));
    sprite.setCrop(cropX, cropY, cropWidth, cropHeight);
    sprite.isCropped = true;
    sprite.cropWidth = cropWidth;
    sprite.cropHeight = cropHeight;
  }

  function scheduleSpriteFade(system, list, sprite, holdMs, config) {
    if (system.scene.time && system.scene.time.delayedCall) {
      system.scene.time.delayedCall(holdMs || 0, function () {
        tweenAndRemoveSprite(system, list, sprite, config);
      });
      return;
    }
    tweenAndRemoveSprite(system, list, sprite, config);
  }

  function tweenAndRemoveSprite(system, list, sprite, config) {
    var onCompleteExtra = config.onCompleteExtra;
    var tweenConfig = {
      targets: sprite,
      onComplete: function () {
        remove(list, sprite);
        if (onCompleteExtra) {
          onCompleteExtra();
        }
        if (sprite.active) {
          sprite.destroy();
        }
      }
    };
    Object.keys(config).forEach(function (key) {
      if (key !== "onCompleteExtra") {
        tweenConfig[key] = config[key];
      }
    });
    system.scene.tweens.add(tweenConfig);
  }

  function createBrokenArcs(system, impulseType, x, y, strength, scale) {
    var splash = system.config.splash || {};
    var count = Phaser.Math.Between(splash.arcCountMin || 3, splash.arcCountMax || 6);
    if (impulseType === "meteor") {
      count += 3;
    }
    if (impulseType === "arrowRain" || impulseType === "sciFiLaser") {
      count = Math.max(2, Math.floor(count * 0.55));
    }
    for (var index = 0; index < count; index += 1) {
      var radius = Phaser.Math.Between(splash.arcRadiusMin || 14, splash.arcRadiusMax || 38) * scale * (1 + index * 0.08);
      var startAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var segment = Phaser.Math.FloatBetween(splash.arcBrokenSegmentMin || 0.3, splash.arcBrokenSegmentMax || 0.8);
      var arc = system.scene.add.arc(x, y, radius, startAngle * 180 / Math.PI, (startAngle + segment) * 180 / Math.PI, false, system.config.foamColor, 0);
      arc.setStrokeStyle(splash.arcWidth || 2, system.config.foamColor, (splash.arcAlpha || 0.45) * Math.min(1.2, Math.max(0.55, strength)));
      arc.setDepth(CONFIG.destructibleBackground.repairDepth + 1.6);
      arc.rotation = Phaser.Math.FloatBetween(-0.2, 0.2);
      system.arcs.push(arc);
      system.scene.tweens.add({
        targets: arc,
        scale: impulseType === "meteor" ? 1.85 : 1.45,
        alpha: 0,
        rotation: arc.rotation + Phaser.Math.FloatBetween(-0.25, 0.25),
        duration: splash.arcDurationMs || system.config.rippleRingDurationMs,
        onComplete: function () {
          remove(system.arcs, arc);
          if (arc.active) {
            arc.destroy();
          }
        }
      });
    }
    capArcs(system);
  }

  function createFoam(system, x, y, strength, scale, impulseType) {
    var splash = system.config.splash || {};
    var count = splash.foamCount || system.config.splashParticleCount;
    if (impulseType === "meteor") {
      count += 10;
    }
    if (impulseType === "arrowRain") {
      count = Math.max(4, Math.floor(count * 0.45));
    }
    if (impulseType === "sciFiLaser") {
      count = Math.floor(count * 0.45);
    }
    for (var index = 0; index < count; index += 1) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var distance = Phaser.Math.Between(splash.foamTravelMin || 8, impulseType === "meteor" ? (splash.foamTravelMax || 42) * 1.35 : splash.foamTravelMax || 36) * scale;
      var size = Phaser.Math.FloatBetween(splash.foamSizeMin || 1.5, splash.foamSizeMax || 3.5) * scale;
      var particle = system.scene.add.ellipse(x, y, size * 1.4, size, system.config.foamColor, 0.54);
      particle.setDepth(CONFIG.destructibleBackground.repairDepth + 1.7);
      system.foam.push(particle);
      system.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.24,
        duration: splash.foamDurationMs || system.config.foamDurationMs * 0.75,
        onComplete: function () {
          remove(system.foam, particle);
          if (particle.active) {
            particle.destroy();
          }
        }
      });
    }
    capFoam(system);
  }

  function createDroplets(system, x, y, scale, impulseType) {
    var splash = system.config.splash || {};
    var count = splash.dropletCount || 10;
    if (impulseType === "meteor") {
      count += 8;
    }
    for (var index = 0; index < count; index += 1) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var distance = Phaser.Math.Between(splash.dropletTravelMin || 16, splash.dropletTravelMax || 52) * scale;
      var size = Phaser.Math.FloatBetween(splash.dropletSizeMin || 1, splash.dropletSizeMax || 3) * scale;
      var droplet = system.scene.add.ellipse(x, y, size, size * 1.8, system.config.foamColor, 0.62);
      droplet.setDepth(CONFIG.destructibleBackground.repairDepth + 1.8);
      system.foam.push(droplet);
      system.scene.tweens.add({
        targets: droplet,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.18,
        duration: splash.dropletDurationMs || 480,
        onComplete: function () {
          remove(system.foam, droplet);
          if (droplet.active) {
            droplet.destroy();
          }
        }
      });
    }
    capFoam(system);
  }

  function createPixelDisturbance(system, x, y, scale) {
    var size = 8 * scale;
    for (var col = -3; col <= 3; col += 1) {
      for (var row = -2; row <= 2; row += 1) {
        if ((col + row) % 2 === 0) {
          var cell = system.scene.add.rectangle(x + col * size, y + row * size, size, size, system.config.highlightColor, 0.22);
          cell.setDepth(CONFIG.destructibleBackground.repairDepth + 1.55);
          system.ripples.push(cell);
          system.scene.tweens.add({
            targets: cell,
            alpha: 0,
            scale: 1.3,
            duration: system.config.rippleRingDurationMs * 0.55,
            onComplete: function () {
              remove(system.ripples, cell);
              if (cell.active) {
                cell.destroy();
              }
            }
          });
        }
      }
    }
  }

  function capRipples(system) {
    var maxRipples = system.config.rippleRingMax || system.config.maxRippleObjects;
    while (system.ripples.length > maxRipples) {
      var ripple = system.ripples.shift();
      if (ripple && ripple.active) {
        ripple.destroy();
      }
    }
  }

  function capArcs(system) {
    while (system.arcs.length > (system.config.rippleRingMax || system.config.maxRippleObjects)) {
      var arc = system.arcs.shift();
      if (arc && arc.active) {
        arc.destroy();
      }
    }
  }

  function capFoam(system) {
    while (system.foam.length > (system.config.foamMax || 48)) {
      var foam = system.foam.shift();
      if (foam && foam.active) {
        foam.destroy();
      }
    }
  }

  function capAssetSprites(system) {
    var max = (system.config.splashAssets && system.config.splashAssets.maxActiveSprites) || 48;
    while (system.splashSprites.length + system.foamSprites.length + system.dropletSprites.length > max) {
      var list = system.foamSprites.length >= system.splashSprites.length ? system.foamSprites : system.splashSprites;
      if (system.dropletSprites.length > list.length) {
        list = system.dropletSprites;
      }
      var sprite = list.shift();
      remove(system.splashSprites, sprite);
      remove(system.fragmentSprites, sprite);
      remove(system.foamSprites, sprite);
      remove(system.dropletSprites, sprite);
      remove(system.fullCrownSprites, sprite);
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    }
  }

  function splashAssetsAvailable(scene, config) {
    var assets = config && config.splashAssets;
    if (!assets || assets.enabled !== true) {
      return false;
    }
    return hasTexture(scene, assets.crownKey) && hasTexture(scene, assets.foamKey);
  }

  function hasTexture(scene, key) {
    return Boolean(scene && scene.textures && scene.textures.exists && scene.textures.exists(key));
  }

  function coverScale(scene, key) {
    var size = getTextureSize(scene, key);
    return Math.max(CONFIG.canvas.width / size.width, CONFIG.canvas.height / size.height);
  }

  function getTextureSize(scene, key) {
    var texture = scene.textures && scene.textures.get ? scene.textures.get(key) : null;
    var source = texture && texture.getSourceImage ? texture.getSourceImage() : null;
    return {
      width: source && source.width ? source.width : CONFIG.canvas.width,
      height: source && source.height ? source.height : CONFIG.canvas.height
    };
  }

  function worldToCell(system, x, y) {
    return {
      col: Phaser.Math.Clamp(Math.floor(x / CONFIG.canvas.width * system.config.gridCols), 0, system.config.gridCols - 1),
      row: Phaser.Math.Clamp(Math.floor(y / CONFIG.canvas.height * system.config.gridRows), 0, system.config.gridRows - 1)
    };
  }

  function isInGrid(system, col, row) {
    return col >= 0 && row >= 0 && col < system.config.gridCols && row < system.config.gridRows;
  }

  function indexOf(system, col, row) {
    return row * system.config.gridCols + col;
  }

  function getSnapshot(system) {
    return {
      active: Boolean(system && system.active),
      visualEnabled: Boolean(system && system.active && system.config.visualEnabled !== false),
      gridCols: system && system.config ? system.config.gridCols || 0 : 0,
      gridRows: system && system.config ? system.config.gridRows || 0 : 0,
      activeImpulseCount: system ? system.impulses.length : 0,
      activeRippleCount: system ? system.arcs.length : 0,
      rippleCount: system ? system.arcs.length : 0,
      foamCount: system ? system.foam.length : 0,
      activeSplashCount: system ? system.arcs.length + system.foam.length + system.splashSprites.length + system.foamSprites.length + system.dropletSprites.length : 0,
      activeFoamCount: system ? system.foam.length + system.foamSprites.length : 0,
      activeArcCount: system ? system.arcs.length : 0,
      usesAssetSplash: Boolean(system && system.usesAssetSplash),
      splashMode: system && system.config && system.config.splashAssets ? system.config.splashAssets.mode || "legacy" : null,
      activeSplashSpriteCount: system ? system.splashSprites.length : 0,
      activeFoamSpriteCount: system ? system.foamSprites.length : 0,
      activeFragmentCount: system ? system.fragmentSprites.length : 0,
      activeDropletSpriteCount: system ? system.dropletSprites.length : 0,
      fullCrownSpriteCount: system ? system.fullCrownSprites.length : 0,
      totalFragmentSpriteCount: system ? system.totalFragmentSpriteCount : 0,
      totalFoamSpriteCount: system ? system.totalFoamSpriteCount : 0,
      totalDropletSpriteCount: system ? system.totalDropletSpriteCount : 0,
      totalFullCrownSpriteCount: system ? system.totalFullCrownSpriteCount : 0,
      coloredDamageCircleCount: 0,
      geometryArcPrimary: Boolean(system && system.config && system.config.splashAssets && system.config.splashAssets.geometryArcPrimary),
      lastSplashAssetType: system ? system.lastSplashAssetType : null,
      fullCircleRippleCount: system ? system.fullCircleRippleCount : 0,
      debugGridVisible: Boolean(system && system.config.debugGridVisible),
      showEnergyCells: Boolean(system && system.config.showEnergyCells),
      averageEnergy: system ? system.averageEnergy : 0,
      gridAverageEnergy: system ? system.averageEnergy : 0,
      lastImpulseType: system ? system.lastImpulseType : null,
      lastSplashType: system ? system.lastImpulseType : null,
      totalImpulseCount: system ? system.totalImpulseCount : 0,
      strongestImpulse: system ? system.strongestImpulse : 0
    };
  }

  function clear(system) {
    if (!system) {
      return;
    }
    if (system.graphics) {
      system.graphics.destroy();
      system.graphics = null;
    }
    system.ripples.forEach(function (ripple) {
      if (ripple && ripple.active) {
        ripple.destroy();
      }
    });
    system.ripples = [];
    system.arcs.forEach(function (arc) {
      if (arc && arc.active) {
        arc.destroy();
      }
    });
    system.arcs = [];
    system.foam.forEach(function (foam) {
      if (foam && foam.active) {
        foam.destroy();
      }
    });
    system.foam = [];
    system.splashSprites.forEach(function (sprite) {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    system.splashSprites = [];
    system.fragmentSprites.forEach(function (sprite) {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    system.fragmentSprites = [];
    system.foamSprites.forEach(function (sprite) {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    system.foamSprites = [];
    system.dropletSprites.forEach(function (sprite) {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    system.dropletSprites = [];
    system.fullCrownSprites.forEach(function (sprite) {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    system.fullCrownSprites = [];
    if (system.causticOverlay && system.causticOverlay.active) {
      system.causticOverlay.destroy();
    }
    system.causticOverlay = null;
    system.impulses = [];
  }

  function remove(list, item) {
    var index = list.indexOf(item);
    if (index >= 0) {
      list.splice(index, 1);
    }
  }

  ARENA.WaterSurface = {
    create: create,
    update: update,
    addImpulse: addImpulse,
    getSnapshot: getSnapshot,
    clear: clear
  };
})();

(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function create(scene) {
    var system = {
      scene: scene,
      surface: null,
      underlayer: null,
      activeDamageMarks: [],
      damageCount: 0,
      repairCount: 0,
      renderTextureUsed: false,
      enabled: Boolean(CONFIG.destructibleBackground.enabled),
      material: ARENA.BackgroundSkins.get(scene.state.activeBackgroundSkin),
      activeTemporaryChunks: [],
      activeWaterRipples: [],
      lastBrushByResponse: {},
      waterAnimation: null
    };

    if (!system.enabled) {
      return system;
    }

    system.underlayer = createUnderlayer(scene, system.material);
    system.surface = createSurface(scene, system.material);
    system.waterAnimation = createWaterAnimation(scene, system.material);
    system.renderTextureUsed = Boolean(system.surface && system.surface.erase && CONFIG.destructibleBackground.useRenderTexture);
    return system;
  }

  function update(system, timeMs) {
    if (!system || !system.waterAnimation || !system.waterAnimation.enabled) {
      return;
    }
    if (timeMs - system.waterAnimation.lastUpdateMs < system.waterAnimation.updateIntervalMs) {
      return;
    }
    system.waterAnimation.lastUpdateMs = timeMs;
    drawWaterOverlay(system.waterAnimation.graphics, system.material.surface, system.material.animation, timeMs);
  }

  function apply(system, skin, x, y, scale) {
    var request = skin.backgroundDamage;
    if (!system || !system.enabled || !request || !request.enabled) {
      return null;
    }
    var damage = resolveDamageResponse(system, request);
    if (!damage || damage.enabled === false || damage.type === "none") {
      return null;
    }
    if (system.material && system.material.id === "water" && system.scene.waterSurfaceSystem && ARENA.WaterSurface) {
      ARENA.WaterSurface.addImpulse(system.scene.waterSurfaceSystem, request.response || damage.type, x, y, scale, {
        radius: system.material.waterSurface ? system.material.waterSurface.impulseRadius : undefined
      });
    }
    if (system.material && system.material.id === "town") {
      var townHit = determineTownSurfaceHit(system.material, x, y);
      system.scene.lastTownSurfaceHit = townHit;
      if (townHit.obstacleHit) {
        damage = createTownBuildingHitDamage(damage);
      }
    }

    var brushScale = scale * CONFIG.destructibleBackground.brushScale * (request.intensity || 1);
    var geometry = createGeometry(damage, x, y, brushScale);
    var mark = {
      geometry: geometry,
      damage: damage,
      repairStarted: false,
      repairComplete: false,
      repairGraphic: null,
      timer: null,
      tween: null
    };

    drawUnderlayerDetail(system, damage, geometry);
    damageSurface(system, damage, geometry);
    createTemporaryResponseFx(system, damage, geometry, x, y, brushScale);
    scheduleRepair(system, mark);
    system.activeDamageMarks.push(mark);
    system.damageCount += 1;
    system.lastBrushByResponse[request.response || damage.type] = summarizeBrush(request.response || damage.type, damage, geometry);
    markEffect(system.scene, "backgroundDamage");
    markEffect(system.scene, "backgroundDamage_" + damage.type);
    if (request.response) {
      markEffect(system.scene, "backgroundDamageResponse_" + request.response);
    }
    capDamageMarks(system);
    return mark;
  }

  function resolveDamageResponse(system, request) {
    var material = system.material || ARENA.BackgroundSkins.get(ARENA.BackgroundSkins.getDefaultSkinId());
    var response = material.damageResponses[request.response] || material.damageResponses[request.type] || request;
    var merged = {};
    Object.keys(response).forEach(function (key) {
      merged[key] = response[key];
    });
    Object.keys(request).forEach(function (key) {
      if (key !== "response" && key !== "intensity" && key !== "enabled") {
        merged[key] = request[key];
      }
    });
    return merged;
  }

  function determineTownSurfaceHit(material, x, y) {
    var surface = material.surface || {};
    var obstacle = findRect(surface.buildingRects || [], x, y);
    if (obstacle) {
      return { surfaceType: "building", obstacleHit: true };
    }
    if (findCircle(surface.treeCircles || [], x, y)) {
      return { surfaceType: "tree", obstacleHit: true };
    }
    if (findRect(surface.plazas || [], x, y)) {
      return { surfaceType: "plaza", obstacleHit: false };
    }
    if (findRect(surface.roads || [], x, y)) {
      return { surfaceType: "road", obstacleHit: false };
    }
    return { surfaceType: "open", obstacleHit: false };
  }

  function findCircle(circles, x, y) {
    for (var index = 0; index < circles.length; index += 1) {
      var circle = circles[index];
      if (Phaser.Math.Distance.Between(x, y, circle.x, circle.y) <= circle.radius) {
        return circle;
      }
    }
    return null;
  }

  function findRect(rects, x, y) {
    for (var index = 0; index < rects.length; index += 1) {
      var rect = rects[index];
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        return rect;
      }
    }
    return null;
  }

  function createTownBuildingHitDamage(source) {
    var damage = {};
    Object.keys(source).forEach(function (key) {
      damage[key] = source[key];
    });
    damage.type = "scorch";
    damage.radius = Math.min(16, source.radius || source.collapseRadius || 16);
    damage.affectsSurface = false;
    damage.underlayerColor = 0x4b3b34;
    damage.detailColor = 0xd8c7a5;
    damage.repairDelayMs = source.repairDelayMs || 620;
    damage.repairDurationMs = source.repairDurationMs || 900;
    return damage;
  }

  function createUnderlayer(scene, material) {
    var config = CONFIG.destructibleBackground;
    var underlayer = material.underlayer;
    var surface = material.surface;
    var graphics = scene.add.graphics();
    graphics.setDepth(config.underlayerDepth);
    graphics.fillStyle(underlayer.color, config.underlayerAlpha);
    graphics.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    graphics.lineStyle(1, underlayer.crackColor, underlayer.gridAlpha);
    if (surface.gridSize && underlayer.gridAlpha > 0) {
      for (var x = 0; x <= CONFIG.canvas.width; x += surface.gridSize) {
        graphics.lineBetween(x, 0, x, CONFIG.canvas.height);
      }
      for (var y = 0; y <= CONFIG.canvas.height; y += surface.gridSize) {
        graphics.lineBetween(0, y, CONFIG.canvas.width, y);
      }
    }
    graphics.lineStyle(1, underlayer.glowColor, 0.12);
    graphics.strokeCircle(CONFIG.canvas.width / 2, CONFIG.canvas.height / 2, surface.coreRingRadius * 1.08);
    return graphics;
  }

  function createSurface(scene, material) {
    var config = CONFIG.destructibleBackground;
    var surface = scene.add.renderTexture(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    var clean = scene.make.graphics({ add: false });
    surface.setOrigin(0, 0);
    surface.setDepth(config.surfaceDepth);
    surface.setAlpha(config.surfaceAlpha);
    drawCleanFloor(clean, material.surface);
    surface.draw(clean, 0, 0);
    clean.destroy();
    return surface;
  }

  function drawCleanFloor(graphics, config) {
    graphics.clear();
    if (config.type === "sand") {
      drawSandSurface(graphics, config);
      return;
    }
    if (config.type === "water") {
      drawWaterSurface(graphics, config);
      return;
    }
    if (config.type === "town") {
      drawTownSurface(graphics, config);
      return;
    }
    drawContainmentSurface(graphics, config);
  }

  function drawContainmentSurface(graphics, config) {
    graphics.fillStyle(config.baseColor, 1);
    graphics.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    if (config.subtleNoise) {
      graphics.fillStyle(config.noiseColor, config.noiseAlpha);
      for (var noiseX = 0; noiseX < CONFIG.canvas.width; noiseX += config.noiseCellSize) {
        for (var noiseY = 0; noiseY < CONFIG.canvas.height; noiseY += config.noiseCellSize) {
          if ((noiseX + noiseY) % (config.noiseCellSize * 3) === 0) {
            graphics.fillRect(noiseX, noiseY, config.noiseCellSize, config.noiseCellSize);
          }
        }
      }
    }
    graphics.lineStyle(1, config.gridColor, 0.9);
    for (var x = 0; x <= CONFIG.canvas.width; x += config.gridSize) {
      graphics.lineBetween(x, 0, x, CONFIG.canvas.height);
    }
    for (var y = 0; y <= CONFIG.canvas.height; y += config.gridSize) {
      graphics.lineBetween(0, y, CONFIG.canvas.width, y);
    }
    graphics.lineStyle(2, config.seamColor, 1);
    graphics.strokeRect(config.borderInset, config.borderInset, CONFIG.canvas.width - config.borderInset * 2, CONFIG.canvas.height - config.borderInset * 2);
    graphics.lineStyle(1, config.detailColor, 0.5);
    graphics.strokeCircle(CONFIG.canvas.width / 2, CONFIG.canvas.height / 2, config.coreRingRadius);
  }

  function drawSandSurface(graphics, config) {
    var texture = config.sandTexture || {};
    graphics.fillStyle((texture.baseColors && texture.baseColors[0]) || config.baseColor, 1);
    graphics.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    (texture.baseColors || []).forEach(function (color, index) {
      graphics.fillStyle(color, texture.patchAlpha || 0.06);
      for (var patch = 0; patch < (texture.patchCount || 0) / Math.max(1, texture.baseColors.length); patch += 1) {
        var px = (patch * 139 + index * 211) % CONFIG.canvas.width;
        var py = (patch * 97 + index * 173) % CONFIG.canvas.height;
        graphics.fillEllipse(px, py, 120 + (patch % 4) * 28, 42 + (patch % 3) * 18);
      }
    });
    var grainDensity = texture.grainDensity || config.grainDensity;
    for (var grain = 0; grain < grainDensity; grain += 1) {
      var gx = (grain * 53) % CONFIG.canvas.width;
      var gy = (grain * 97) % CONFIG.canvas.height;
      var color = config.grainColors[grain % config.grainColors.length];
      graphics.fillStyle(color, grain % 3 === 0 ? config.coarseGrainAlpha : config.grainAlpha);
      var size = (texture.grainSizeMin || 1) + (grain % Math.max(1, (texture.grainSizeMax || 3) - (texture.grainSizeMin || 1) + 1));
      graphics.fillRect(gx, gy, size, size);
    }
    graphics.lineStyle(1, config.detailColor, texture.duneLineAlpha || config.duneLineAlpha);
    for (var line = 0; line < (texture.duneLineCount || config.duneLineCount); line += 1) {
      var y = line * config.duneLineSpacing + 26;
      var lastX = 0;
      var lastY = y;
      for (var x = config.duneLineSegment; x <= CONFIG.canvas.width; x += config.duneLineSegment) {
        var nextY = y + Math.sin((x * 0.018) + line * 0.82) * config.duneWaveAmplitude;
        graphics.lineBetween(lastX, lastY, x, nextY);
        lastX = x;
        lastY = nextY;
      }
    }
  }

  function drawWaterSurface(graphics, config) {
    var texture = config.waterTexture || {};
    var colors = texture.baseColors || [config.baseColor];
    colors.forEach(function (color, index) {
      graphics.fillStyle(color, index === 0 ? 1 : 0.34);
      graphics.fillRect(0, index * CONFIG.canvas.height / colors.length, CONFIG.canvas.width, CONFIG.canvas.height / colors.length + 2);
    });
    graphics.fillStyle(config.waveBandColor, texture.bandAlpha || config.waveBandAlpha);
    for (var band = 0; band < (texture.bandCount || config.waveLineCount); band += 1) {
      var bandY = 18 + band * (CONFIG.canvas.height / (texture.bandCount || config.waveLineCount));
      graphics.fillRect(0, bandY, CONFIG.canvas.width, config.waveBandHeight + (band % 3) * 2);
    }
    graphics.lineStyle(1, config.waveLineColor, config.waveAlpha);
    for (var line = 0; line < (texture.causticCount || config.causticLineCount); line += 1) {
      var startX = (line * 71) % CONFIG.canvas.width;
      var startY = (line * 43) % CONFIG.canvas.height;
      graphics.lineStyle(1, config.waveLineColor, texture.causticAlpha || config.causticAlpha);
      graphics.lineBetween(startX, startY, startX + 38, startY + 10 + (line % 4) * 3);
    }
    for (var shimmer = 0; shimmer < (texture.shimmerCount || 0); shimmer += 1) {
      var sx = (shimmer * 101) % CONFIG.canvas.width;
      var sy = (shimmer * 59) % CONFIG.canvas.height;
      graphics.lineStyle(1, config.detailColor, texture.shimmerAlpha || 0.12);
      graphics.lineBetween(sx, sy, sx + 18 + (shimmer % 4) * 5, sy + (shimmer % 3) * 3);
    }
  }

  function drawTownSurface(graphics, config) {
    var texture = config.townTexture || {};
    graphics.fillStyle(config.baseColor, 1);
    graphics.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    for (var noise = 0; noise < (texture.textureNoiseDensity || 0); noise += 1) {
      graphics.fillStyle(noise % 2 ? 0x7e8779 : 0xa1a88f, 0.06);
      graphics.fillRect((noise * 67) % CONFIG.canvas.width, (noise * 41) % CONFIG.canvas.height, 3, 2);
    }
    for (var grass = 0; grass < (texture.grassPatchCount || 0); grass += 1) {
      graphics.fillStyle(0x6f8b5b, 0.08);
      graphics.fillEllipse((grass * 149) % CONFIG.canvas.width, (grass * 83) % CONFIG.canvas.height, 110, 48);
    }
    for (var dirt = 0; dirt < (texture.dirtPatchCount || 0); dirt += 1) {
      graphics.fillStyle(0x8b7552, 0.08);
      graphics.fillEllipse((dirt * 191) % CONFIG.canvas.width, (dirt * 73) % CONFIG.canvas.height, 92, 36);
    }
    graphics.fillStyle(config.sidewalkColor, 1);
    config.sidewalks.forEach(function (rect) {
      graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
    });
    graphics.fillStyle(config.roadColor, 1);
    config.roads.forEach(function (rect) {
      graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
      graphics.lineStyle(2, texture.roadEdgeColor || config.seamColor, 0.38);
      graphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
    });
    graphics.lineStyle(2, config.roadLineColor, 0.66);
    var horizontalRoad = config.roads.find(function (road) {
      return road.laneY !== undefined;
    });
    var verticalRoad = config.roads.find(function (road) {
      return road.laneX !== undefined;
    });
    if (horizontalRoad) {
      for (var dashX = horizontalRoad.x + 12; dashX < horizontalRoad.x + horizontalRoad.width; dashX += config.roadDashSpacing) {
        graphics.lineBetween(dashX, horizontalRoad.laneY, dashX + config.roadDashLength, horizontalRoad.laneY);
      }
    }
    if (verticalRoad) {
      for (var dashY = verticalRoad.y + 12; dashY < verticalRoad.y + verticalRoad.height; dashY += config.roadDashSpacing) {
        graphics.lineBetween(verticalRoad.laneX, dashY, verticalRoad.laneX, dashY + config.roadDashLength);
      }
    }
    graphics.fillStyle(config.plazaColor, 1);
    config.plazas.forEach(function (rect) {
      graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
    });
    config.buildingRects.forEach(function (rect, index) {
      var roof = config.roofColors[index % config.roofColors.length];
      graphics.fillStyle(0x111111, texture.shadowAlpha || 0.18);
      graphics.fillRect(rect.x + 5, rect.y + 7, rect.width, rect.height);
      graphics.fillStyle(config.buildingColor, 1);
      graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
      graphics.fillStyle(roof, 0.92);
      graphics.fillRect(rect.x + 6, rect.y + 6, rect.width - 12, rect.height - 12);
      graphics.lineStyle(1, config.buildingAccentColor, 0.65);
      graphics.strokeRect(rect.x + 9, rect.y + 9, rect.width - 18, rect.height - 18);
    });
    (config.treeCircles || []).forEach(function (tree, index) {
      var treeColors = texture.treeColors || [0x2f6d3b, 0x3f8b4d];
      graphics.fillStyle(0x111111, texture.shadowAlpha || 0.18);
      graphics.fillEllipse(tree.x + 4, tree.y + 6, tree.radius * 2.1, tree.radius * 1.55);
      graphics.fillStyle(treeColors[index % treeColors.length], 1);
      graphics.fillCircle(tree.x, tree.y, tree.radius);
      graphics.fillStyle(treeColors[(index + 1) % treeColors.length], 0.9);
      graphics.fillCircle(tree.x - tree.radius * 0.28, tree.y - tree.radius * 0.18, tree.radius * 0.58);
      graphics.lineStyle(1, 0x194020, 0.5);
      graphics.strokeCircle(tree.x, tree.y, tree.radius);
    });
  }

  function createWaterAnimation(scene, material) {
    if (!material.animation || !material.animation.enabled || material.animation.type !== "waveOverlay") {
      return null;
    }
    var graphics = scene.add.graphics();
    graphics.setDepth(CONFIG.destructibleBackground.surfaceDepth + 0.25);
    var animation = {
      enabled: true,
      graphics: graphics,
      waveSpeed: material.animation.waveSpeed,
      updateIntervalMs: material.animation.updateIntervalMs,
      lastUpdateMs: -Infinity,
      waveCount: material.animation.waveLineCount,
      shimmerCount: material.animation.shimmerCount,
      rippleMaxCount: material.animation.rippleMaxCount || material.animation.maxRipples
    };
    drawWaterOverlay(graphics, material.surface, material.animation, 0);
    return animation;
  }

  function drawWaterOverlay(graphics, config, animation, timeMs) {
    var offset = timeMs * animation.waveSpeed;
    var bandOffset = timeMs * animation.waveBandOffsetSpeed;
    graphics.clear();
    graphics.fillStyle(config.waveBandColor, config.waveBandAlpha * 0.55);
    for (var band = 0; band < Math.ceil(config.waveLineCount * 0.55); band += 1) {
      var bandY = (band * 92 + bandOffset) % (CONFIG.canvas.height + 80) - 40;
      graphics.fillRect(0, bandY, CONFIG.canvas.width, config.waveBandHeight);
    }
    graphics.lineStyle(1, config.waveLineColor, config.waveAlpha);
    for (var line = 0; line < config.waveLineCount; line += 1) {
      var baseY = 28 + line * (CONFIG.canvas.height / config.waveLineCount);
      var previousX = 0;
      var previousY = baseY + Math.sin(offset + line) * config.waveAmplitude;
      for (var x = 20; x <= CONFIG.canvas.width; x += 20) {
        var y = baseY + Math.sin(offset + x * 0.025 + line * 0.7) * config.waveAmplitude;
        graphics.lineBetween(previousX, previousY, x, y);
        previousX = x;
        previousY = y;
      }
    }
    for (var shimmer = 0; shimmer < config.shimmerCount; shimmer += 1) {
      var shimmerPhase = timeMs * config.shimmerSpeed + shimmer * 17.3;
      var sx = (shimmer * 89 + shimmerPhase * 36) % CONFIG.canvas.width;
      var sy = (shimmer * 47 + Math.sin(shimmerPhase) * 22) % CONFIG.canvas.height;
      var alpha = config.shimmerAlpha * (0.45 + 0.55 * Math.abs(Math.sin(shimmerPhase)));
      graphics.lineStyle(1, config.detailColor, alpha * config.shimmerIntensity);
      graphics.lineBetween(sx, sy, sx + config.shimmerLength, sy + Math.sin(shimmerPhase) * 5);
    }
  }

  function createGeometry(damage, x, y, scale) {
    if (damage.type === "sandCrater") {
      return createSandCraterGeometry(damage, x, y, scale);
    }
    if (damage.type === "sandPunctures" || damage.type === "waterPunctures") {
      return createPunctureGeometry(damage, x, y, scale);
    }
    if (damage.type === "waterRipple") {
      return createWaterRippleGeometry(damage, x, y, scale);
    }
    if (damage.type === "sandGridDisruption" || damage.type === "waterPixelRipple" || damage.type === "townGridDisruption") {
      return createLocalGridBreakGeometry(damage, x, y, scale);
    }
    if (damage.type === "townPavementBreak") {
      return createLocalizedCollapseGeometry(damage, x, y, scale);
    }
    if (damage.type === "localizedCollapse") {
      return createLocalizedCollapseGeometry(damage, x, y, scale);
    }
    if (damage.type === "localGridBreak") {
      return createLocalGridBreakGeometry(damage, x, y, scale);
    }
    if (damage.type === "floorFracture") {
      return createFloorFractureGeometry(damage, x, y, scale);
    }
    if (damage.type === "cellGrid") {
      return createCellGridGeometry(damage, x, y, scale);
    }
    if (damage.type === "cracks") {
      return createCrackGeometry(damage, x, y, scale);
    }
    if (damage.type === "pixelCells") {
      return createPixelGeometry(damage, x, y, scale);
    }
    if (damage.type === "punctures") {
      return createPunctureGeometry(damage, x, y, scale);
    }
    if (damage.type === "burn") {
      return createBurnGeometry(damage, x, y, scale);
    }
    return createScorchGeometry(damage, x, y, scale);
  }

  function createLocalizedCollapseGeometry(damage, x, y, scale) {
    var chunkCount = Phaser.Math.Between(damage.chunkCountMin, damage.chunkCountMax);
    var geometry = {
      type: "localizedCollapse",
      circles: [{ x: x, y: y, radius: damage.centerGapRadius * scale }],
      rects: [],
      lines: []
    };

    for (var index = 0; index < chunkCount; index += 1) {
      var angle = Math.PI * 2 * index / chunkCount + Phaser.Math.FloatBetween(-0.24, 0.24);
      var distance = Phaser.Math.FloatBetween(damage.centerGapRadius, damage.collapseRadius) * scale;
      var size = Phaser.Math.Between(damage.chunkSizeMin, damage.chunkSizeMax) * scale;
      geometry.rects.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        size: size
      });
    }

    for (var crack = 0; crack < damage.shortCrackCount; crack += 1) {
      var crackAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var startDistance = Phaser.Math.FloatBetween(damage.centerGapRadius, damage.maxCrackDistanceFromCenter * 0.75) * scale;
      var length = Phaser.Math.Between(damage.shortCrackLengthMin, damage.shortCrackLengthMax) * scale;
      var startX = x + Math.cos(crackAngle) * startDistance;
      var startY = y + Math.sin(crackAngle) * startDistance;
      var endAngle = crackAngle + Phaser.Math.FloatBetween(-damage.crackJaggedness, damage.crackJaggedness);
      geometry.lines.push({
        x1: startX,
        y1: startY,
        x2: startX + Math.cos(endAngle) * length,
        y2: startY + Math.sin(endAngle) * length,
        width: Math.max(1, damage.crackEraseWidth * scale)
      });
    }

    return geometry;
  }

  function createLocalGridBreakGeometry(damage, x, y, scale) {
    var geometry = {
      type: "localGridBreak",
      rects: [],
      grid: {
        x: x,
        y: y,
        cellSize: damage.cellSize * scale,
        widthCells: damage.gridWidthCells,
        heightCells: damage.gridHeightCells
      }
    };
    var cellSize = Math.max(2, damage.cellSize * scale);
    var halfWidth = Math.floor(damage.gridWidthCells / 2);
    var halfHeight = Math.floor(damage.gridHeightCells / 2);
    for (var gridX = -halfWidth; gridX <= halfWidth; gridX += 1) {
      for (var gridY = -halfHeight; gridY <= halfHeight; gridY += 1) {
        var edgeRatio = Math.max(Math.abs(gridX) / Math.max(1, halfWidth), Math.abs(gridY) / Math.max(1, halfHeight));
        var chance = damage.centerDamageChance + (damage.edgeBreakChance - damage.centerDamageChance) * edgeRatio;
        if (Math.random() < chance) {
          geometry.rects.push({
            x: Math.round((x + gridX * cellSize) / cellSize) * cellSize,
            y: Math.round((y + gridY * cellSize) / cellSize) * cellSize,
            size: cellSize
          });
        }
      }
    }
    if (geometry.rects.length === 0) {
      geometry.rects.push({
        x: Math.round(x / cellSize) * cellSize,
        y: Math.round(y / cellSize) * cellSize,
        size: cellSize
      });
    }
    return geometry;
  }

  function createSandCraterGeometry(damage, x, y, scale) {
    var geometry = {
      type: "sandCrater",
      circles: [
        { x: x, y: y, radius: damage.craterRadius * scale },
        { x: x, y: y, radius: damage.displacementRadius * scale }
      ],
      rects: [],
      lines: []
    };
    for (var index = 0; index < (damage.granularDebrisCount || 8); index += 1) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var distance = Phaser.Math.FloatBetween(damage.craterRadius * 0.65, damage.displacementRadius) * scale;
      geometry.rects.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        size: Phaser.Math.Between(3, 6) * scale
      });
    }
    return geometry;
  }

  function createWaterRippleGeometry(damage, x, y, scale) {
    var geometry = {
      type: "waterRipple",
      circles: [],
      lines: []
    };
    var count = damage.rippleCount || 3;
    for (var index = 0; index < count; index += 1) {
      geometry.circles.push({
        x: x,
        y: y,
        radius: damage.rippleRadius * scale * (0.34 + index * 0.22)
      });
    }
    return geometry;
  }

  function createFloorFractureGeometry(damage, x, y, scale) {
    var geometry = {
      type: "floorFracture",
      circles: [{ x: x, y: y, radius: damage.centralCrushRadius * scale }],
      lines: [],
      crackPaths: []
    };

    for (var index = 0; index < damage.crackCount; index += 1) {
      var angle = Math.PI * 2 * index / damage.crackCount + Phaser.Math.FloatBetween(-damage.crackJaggedness, damage.crackJaggedness);
      var length = Phaser.Math.Between(damage.crackLengthMin, damage.crackLengthMax) * scale;
      var segments = Phaser.Math.Between(damage.crackSegmentsMin, damage.crackSegmentsMax);
      var points = [{ x: x, y: y }];
      var currentX = x;
      var currentY = y;

      for (var segment = 1; segment <= segments; segment += 1) {
        var progress = segment / segments;
        var segmentAngle = angle + Phaser.Math.FloatBetween(-damage.crackJaggedness, damage.crackJaggedness);
        var segmentDistance = length * progress;
        currentX = x + Math.cos(segmentAngle) * segmentDistance;
        currentY = y + Math.sin(segmentAngle) * segmentDistance;
        points.push({ x: currentX, y: currentY });
      }

      for (var point = 1; point < points.length; point += 1) {
        geometry.lines.push({
          x1: points[point - 1].x,
          y1: points[point - 1].y,
          x2: points[point].x,
          y2: points[point].y,
          width: Math.max(1, damage.crackEraseWidth * scale * (1 - point * 0.08))
        });
      }
      geometry.crackPaths.push(points);

      if (Math.random() < damage.branchChance && points.length > 2) {
        var branchStart = points[Phaser.Math.Between(1, points.length - 2)];
        var branchAngle = angle + Phaser.Math.FloatBetween(-1.15, 1.15);
        var branchLength = length * damage.branchLengthMultiplier;
        var branchEnd = {
          x: branchStart.x + Math.cos(branchAngle) * branchLength,
          y: branchStart.y + Math.sin(branchAngle) * branchLength
        };
        geometry.lines.push({
          x1: branchStart.x,
          y1: branchStart.y,
          x2: branchEnd.x,
          y2: branchEnd.y,
          width: Math.max(1, damage.crackEraseWidth * 0.55 * scale)
        });
        geometry.crackPaths.push([branchStart, branchEnd]);
      }
    }

    return geometry;
  }

  function createCellGridGeometry(damage, x, y, scale) {
    var geometry = {
      type: "cellGrid",
      rects: [],
      grid: {
        x: x,
        y: y,
        cellSize: damage.cellSize * scale,
        radius: damage.gridRadiusCells
      }
    };
    var cellSize = Math.max(2, damage.cellSize * scale);
    for (var gridX = -damage.gridRadiusCells; gridX <= damage.gridRadiusCells; gridX += 1) {
      for (var gridY = -damage.gridRadiusCells; gridY <= damage.gridRadiusCells; gridY += 1) {
        var distance = Math.sqrt(gridX * gridX + gridY * gridY);
        if (distance <= damage.gridRadiusCells) {
          var edgeRatio = distance / damage.gridRadiusCells;
          var chance = damage.centerDamageChance - edgeRatio * damage.edgeDamageFalloff;
          if (Math.random() < Math.max(0.05, Math.min(0.98, chance))) {
            geometry.rects.push({
              x: Math.round((x + gridX * cellSize) / cellSize) * cellSize,
              y: Math.round((y + gridY * cellSize) / cellSize) * cellSize,
              size: cellSize
            });
          }
        }
      }
    }
    if (geometry.rects.length === 0) {
      geometry.rects.push({
        x: Math.round(x / cellSize) * cellSize,
        y: Math.round(y / cellSize) * cellSize,
        size: cellSize
      });
    }
    return geometry;
  }

  function createCrackGeometry(damage, x, y, scale) {
    var geometry = {
      type: "cracks",
      circles: [{ x: x, y: y, radius: damage.centralBreakRadius * scale }],
      lines: []
    };
    for (var index = 0; index < damage.crackCount; index += 1) {
      var angle = Math.PI * 2 * index / damage.crackCount + Phaser.Math.FloatBetween(-damage.crackJaggedness, damage.crackJaggedness);
      var length = Phaser.Math.Between(damage.crackLengthMin, damage.crackLengthMax) * scale;
      var midLength = length * Phaser.Math.FloatBetween(0.42, 0.68);
      var midAngle = angle + Phaser.Math.FloatBetween(-damage.crackJaggedness, damage.crackJaggedness);
      var midX = x + Math.cos(midAngle) * midLength;
      var midY = y + Math.sin(midAngle) * midLength;
      var endX = x + Math.cos(angle) * length;
      var endY = y + Math.sin(angle) * length;
      geometry.lines.push({ x1: x, y1: y, x2: midX, y2: midY, width: damage.crackWidth * scale });
      geometry.lines.push({ x1: midX, y1: midY, x2: endX, y2: endY, width: Math.max(1, damage.crackWidth * 0.72 * scale) });
      if (Math.random() < damage.branchChance) {
        var branchAngle = angle + Phaser.Math.FloatBetween(-0.9, 0.9);
        var branchLength = length * Phaser.Math.FloatBetween(0.22, 0.42);
        geometry.lines.push({ x1: midX, y1: midY, x2: midX + Math.cos(branchAngle) * branchLength, y2: midY + Math.sin(branchAngle) * branchLength, width: Math.max(1, damage.crackWidth * 0.52 * scale) });
      }
    }
    return geometry;
  }

  function createPixelGeometry(damage, x, y, scale) {
    var geometry = {
      type: "pixelCells",
      rects: []
    };
    var cellSize = Math.max(2, damage.cellSize * scale);
    for (var gridX = -damage.gridRadius; gridX <= damage.gridRadius; gridX += 1) {
      for (var gridY = -damage.gridRadius; gridY <= damage.gridRadius; gridY += 1) {
        var distance = Math.sqrt(gridX * gridX + gridY * gridY);
        if (distance <= damage.gridRadius && Math.random() < damage.missingCellChance) {
          geometry.rects.push({
            x: x + gridX * cellSize,
            y: y + gridY * cellSize,
            size: cellSize
          });
        }
      }
    }
    return geometry;
  }

  function createPunctureGeometry(damage, x, y, scale) {
    var geometry = {
      type: "punctures",
      circles: []
    };
    for (var index = 0; index < damage.count; index += 1) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var distance = Phaser.Math.FloatBetween(0, damage.radius * scale);
      geometry.circles.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        radius: Math.max(1, damage.holeRadius * scale)
      });
    }
    return geometry;
  }

  function createBurnGeometry(damage, x, y, scale) {
    return {
      type: "burn",
      circles: [{ x: x, y: y, radius: damage.radius * scale }],
      lines: [{ x1: x - damage.lineLength * scale * 0.5, y1: y, x2: x + damage.lineLength * scale * 0.5, y2: y, width: Math.max(1, 2 * scale) }]
    };
  }

  function createScorchGeometry(damage, x, y, scale) {
    return {
      type: "scorch",
      circles: [{ x: x, y: y, radius: damage.radius * scale }]
    };
  }

  function damageSurface(system, damage, geometry) {
    if (damage.affectsSurface === false) {
      return;
    }
    var brush = system.scene.make.graphics({ add: false });
    drawGeometry(brush, geometry, 0xffffff, 1, true);

    if (system.renderTextureUsed) {
      try {
        system.surface.erase(brush, 0, 0);
      } catch (error) {
        system.renderTextureUsed = false;
        drawFallbackDamage(system, damage, geometry);
      }
    } else {
      drawFallbackDamage(system, damage, geometry);
    }

    brush.destroy();
  }

  function drawUnderlayerDetail(system, damage, geometry) {
    var graphics = system.scene.add.graphics();
    graphics.setDepth(CONFIG.destructibleBackground.underlayerDepth + 0.1);
    drawGeometry(graphics, geometry, damage.underlayerColor || system.material.underlayer.voidColor, 0.56, true);
    drawGeometry(graphics, geometry, damage.detailColor || system.material.underlayer.crackColor, 0.52, false);
    if (geometry.type === "floorFracture" || geometry.type === "localizedCollapse") {
      drawFractureEdges(graphics, geometry, damage);
    } else if (geometry.type === "cellGrid" || geometry.type === "localGridBreak") {
      drawGridOverlay(graphics, geometry, damage);
    }
    system.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      delay: (damage.repairDelayMs || CONFIG.destructibleBackground.repairDelayMs) + (damage.repairDurationMs || CONFIG.destructibleBackground.repairDurationMs) * 0.65,
      duration: CONFIG.destructibleBackground.repairDurationMs * 0.45,
      onComplete: function () {
        graphics.destroy();
      }
    });
  }

  function drawFallbackDamage(system, damage, geometry) {
    var graphics = system.scene.add.graphics();
    graphics.setDepth(CONFIG.destructibleBackground.fallbackDamageDepth);
    drawGeometry(graphics, geometry, damage.underlayerColor || system.material.underlayer.voidColor, CONFIG.destructibleBackground.fallbackDamageAlpha, true);
    system.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      delay: damage.repairDelayMs || CONFIG.destructibleBackground.repairDelayMs,
      duration: damage.repairDurationMs || CONFIG.destructibleBackground.repairDurationMs,
      onComplete: function () {
        graphics.destroy();
      }
    });
  }

  function scheduleRepair(system, mark) {
    var delay = mark.damage.repairDelayMs || CONFIG.destructibleBackground.repairDelayMs;
    mark.timer = system.scene.time.delayedCall(delay, function () {
      startRepair(system, mark);
    });
  }

  function startRepair(system, mark) {
    if (mark.repairStarted || mark.repairComplete) {
      return;
    }

    mark.repairStarted = true;
    system.repairCount += 1;
    markEffect(system.scene, "backgroundRepair");

    mark.repairGraphic = system.scene.add.graphics();
    mark.repairGraphic.setDepth(CONFIG.destructibleBackground.repairDepth);
    mark.repairGraphic.setAlpha(0);
    drawRepairGeometry(mark.repairGraphic, mark.geometry, system.material.surface, mark.damage);
    mark.tween = system.scene.tweens.add({
      targets: mark.repairGraphic,
      alpha: 1,
      duration: mark.damage.repairDurationMs || CONFIG.destructibleBackground.repairDurationMs,
      onComplete: function () {
        completeRepair(system, mark);
      }
    });
  }

  function completeRepair(system, mark) {
    if (mark.repairComplete) {
      return;
    }

    mark.repairComplete = true;
    if (system.surface && system.surface.draw) {
      var brush = system.scene.make.graphics({ add: false });
      drawRepairGeometry(brush, mark.geometry, system.material.surface, mark.damage);
      system.surface.draw(brush, 0, 0);
      brush.destroy();
    }
    if (mark.repairGraphic) {
      mark.repairGraphic.destroy();
      mark.repairGraphic = null;
    }
    remove(system.activeDamageMarks, mark);
  }

  function capDamageMarks(system) {
    while (system.activeDamageMarks.length > CONFIG.destructibleBackground.maxDamageMarks) {
      completeRepair(system, system.activeDamageMarks[0]);
    }
  }

  function drawGeometry(graphics, geometry, color, alpha, filled) {
    if (geometry.circles) {
      if (filled) {
        graphics.fillStyle(color, alpha);
      } else {
        graphics.lineStyle(1, color, alpha);
      }
      geometry.circles.forEach(function (circle) {
        if (filled) {
          graphics.fillCircle(circle.x, circle.y, circle.radius);
        } else {
          graphics.strokeCircle(circle.x, circle.y, circle.radius);
        }
      });
    }

    if (geometry.rects) {
      graphics.fillStyle(color, alpha);
      geometry.rects.forEach(function (rect) {
        graphics.fillRect(rect.x - rect.size * 0.5, rect.y - rect.size * 0.5, rect.size, rect.size);
      });
    }

    if (geometry.lines) {
      geometry.lines.forEach(function (line) {
        graphics.lineStyle(Math.max(1, line.width || 1), color, alpha);
        graphics.lineBetween(line.x1, line.y1, line.x2, line.y2);
      });
    }
  }

  function drawRepairGeometry(graphics, geometry, surface, damage) {
    graphics.fillStyle(surface.baseColor, CONFIG.destructibleBackground.repairPatchAlpha);
    if (geometry.rects && damage.repairMode === "cell") {
      geometry.rects.forEach(function (rect, index) {
        var alpha = 0.72 + (index % 4) * 0.06;
        graphics.fillStyle(index % 2 ? surface.baseColor : surface.tileColor, alpha);
        graphics.fillRect(rect.x - rect.size * 0.5, rect.y - rect.size * 0.5, rect.size, rect.size);
      });
      return;
    }
    drawGeometry(graphics, geometry, surface.baseColor, CONFIG.destructibleBackground.repairPatchAlpha, true);
  }

  function drawFractureEdges(graphics, geometry, damage) {
    if (!geometry.crackPaths && geometry.lines) {
      geometry.lines.forEach(function (line) {
        graphics.lineStyle(Math.max(1, damage.crackShadowWidth || 1), damage.shadowColor, 0.4);
        graphics.lineBetween(line.x1 + 1, line.y1 + 1, line.x2 + 1, line.y2 + 1);
        graphics.lineStyle(1, damage.highlightColor, 0.24);
        graphics.lineBetween(line.x1 - 1, line.y1 - 1, line.x2 - 1, line.y2 - 1);
      });
      return;
    }
    if (!geometry.crackPaths) {
      return;
    }
    geometry.crackPaths.forEach(function (points) {
      for (var index = 1; index < points.length; index += 1) {
        var previous = points[index - 1];
        var current = points[index];
        graphics.lineStyle(Math.max(1, damage.crackShadowWidth), damage.shadowColor, 0.45);
        graphics.lineBetween(previous.x + 1.5, previous.y + 1.5, current.x + 1.5, current.y + 1.5);
        graphics.lineStyle(1, damage.highlightColor, 0.32);
        graphics.lineBetween(previous.x - 1, previous.y - 1, current.x - 1, current.y - 1);
      }
    });
  }

  function drawGridOverlay(graphics, geometry, damage) {
    if (!geometry.grid) {
      return;
    }
    var size = geometry.grid.cellSize;
    var width = geometry.grid.widthCells ? Math.floor(geometry.grid.widthCells / 2) : geometry.grid.radius;
    var height = geometry.grid.heightCells ? Math.floor(geometry.grid.heightCells / 2) : geometry.grid.radius;
    graphics.lineStyle(1, damage.glitchColors[0], 0.26);
    for (var column = -width; column <= width; column += 1) {
      graphics.lineBetween(geometry.grid.x + column * size, geometry.grid.y - height * size, geometry.grid.x + column * size, geometry.grid.y + height * size);
    }
    for (var row = -height; row <= height; row += 1) {
      graphics.lineBetween(geometry.grid.x - width * size, geometry.grid.y + row * size, geometry.grid.x + width * size, geometry.grid.y + row * size);
    }
  }

  function createTemporaryResponseFx(system, damage, geometry, x, y, scale) {
    if (geometry.type === "waterRipple" || damage.type === "waterPixelRipple" || damage.type === "waterPunctures") {
      createWaterResponseFx(system, damage, geometry, x, y, scale);
    } else if (geometry.type === "sandCrater" || damage.type === "sandPunctures") {
      createSandResponseFx(system, damage, geometry, x, y, scale);
    } else if (geometry.type === "floorFracture" || geometry.type === "localizedCollapse") {
      createFractureChunks(system, damage, geometry, x, y, scale);
    } else if (geometry.type === "cellGrid" || geometry.type === "localGridBreak") {
      createCellChunks(system, damage, geometry, x, y, scale);
      createCellFlicker(system, damage, geometry);
    }
    capTemporaryChunks(system);
  }

  function createFractureChunks(system, damage, geometry, x, y, scale) {
    var count = damage.chunkCount || Phaser.Math.Between(damage.chunkCountMin || 4, damage.chunkCountMax || 7);
    for (var index = 0; index < count; index += 1) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var distance = Phaser.Math.FloatBetween(6, (damage.centerGapRadius || damage.centralCrushRadius || 8) * 2.2) * scale;
      var size = Phaser.Math.Between(damage.chunkSizeMin, damage.chunkSizeMax) * scale;
      var chunk = system.scene.add.rectangle(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, size, size * Phaser.Math.FloatBetween(0.55, 1.05), system.material.surface.tileColor, 0.86);
      chunk.setDepth(CONFIG.destructibleBackground.repairDepth + 1);
      chunk.angle = Phaser.Math.Between(-28, 28);
      system.activeTemporaryChunks.push(chunk);
      tweenAndRemoveChunk(system, chunk, {
        x: chunk.x + Math.cos(angle) * (damage.chunkLiftDistance || damage.chunkShiftDistance || 14) * scale,
        y: chunk.y + Math.sin(angle) * (damage.chunkLiftDistance || damage.chunkShiftDistance || 14) * scale + Phaser.Math.Between(0, 5) * scale,
        alpha: 0,
        angle: chunk.angle + Phaser.Math.Between(-55, 55),
        duration: 520
      });
    }
    markEffect(system.scene, "backgroundFractureChunks");
  }

  function createCellChunks(system, damage, geometry, x, y, scale) {
    var rects = geometry.rects.slice(0).sort(function () {
      return Math.random() - 0.5;
    }).slice(0, damage.chunkCount);
    rects.forEach(function (rect, index) {
      var color = index % 2 ? system.material.surface.baseColor : system.material.surface.tileColor;
      var angle = Phaser.Math.Angle.Between(x, y, rect.x, rect.y) + Phaser.Math.FloatBetween(-0.45, 0.45);
      var chunk = system.scene.add.rectangle(rect.x, rect.y, damage.chunkSize * scale, damage.chunkSize * scale, color, 0.9);
      chunk.setDepth(CONFIG.destructibleBackground.repairDepth + 1);
      system.activeTemporaryChunks.push(chunk);
      tweenAndRemoveChunk(system, chunk, {
        x: rect.x + Math.cos(angle) * damage.chunkTravelDistance * scale,
        y: rect.y + Math.sin(angle) * damage.chunkTravelDistance * scale,
        alpha: 0,
        angle: Phaser.Math.Between(-90, 90),
        duration: 460
      });
    });
    markEffect(system.scene, "backgroundCellChunks");
  }

  function createCellFlicker(system, damage, geometry) {
    var rects = geometry.rects.slice(0).sort(function () {
      return Math.random() - 0.5;
    }).slice(0, damage.flickerCount || damage.localFlickerCount);
    rects.forEach(function (rect, index) {
      var flicker = system.scene.add.rectangle(rect.x, rect.y, rect.size, rect.size, damage.glitchColors[index % damage.glitchColors.length], damage.glitchAlpha);
      flicker.setDepth(CONFIG.destructibleBackground.repairDepth + 0.5);
      system.activeTemporaryChunks.push(flicker);
      tweenAndRemoveChunk(system, flicker, {
        alpha: 0,
        duration: damage.flickerDurationMs || damage.localFlickerDurationMs,
        yoyo: true,
        repeat: 1
      });
    });
    markEffect(system.scene, "backgroundCellFlicker");
  }

  function createWaterResponseFx(system, damage, geometry, x, y, scale) {
    var color = damage.detailColor || 0xe9ffff;
    var rippleCount = damage.rippleCount || (geometry.circles ? geometry.circles.length : 3);
    for (var index = 0; index < rippleCount; index += 1) {
      var radius = (damage.rippleRadius || 28) * scale * (0.38 + index * 0.24);
      var ring = system.scene.add.circle(x, y, radius, color, 0.015);
      ring.setStrokeStyle(2, color, Math.max(0.12, 0.34 - index * 0.04));
      ring.setDepth(CONFIG.destructibleBackground.repairDepth + 1);
      system.activeTemporaryChunks.push(ring);
      system.activeWaterRipples.push(ring);
      tweenAndRemoveWaterRipple(system, ring, {
        scale: 1.65 + index * 0.18,
        alpha: 0,
        duration: damage.repairDurationMs || 1000
      });
    }
    var depression = system.scene.add.circle(x, y, Math.max(10, (damage.splashRadius || damage.rippleRadius || 28) * 0.42 * scale), damage.underlayerColor || 0x0d697e, 0.18);
    depression.setDepth(CONFIG.destructibleBackground.repairDepth + 0.8);
    system.activeTemporaryChunks.push(depression);
    tweenAndRemoveChunk(system, depression, {
      scale: 1.24,
      alpha: 0,
      duration: damage.splashDurationMs || 520
    });
    for (var splash = 0; splash < (damage.splashParticleCount || 0); splash += 1) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var particle = system.scene.add.circle(x, y, Math.max(1.5, 2.5 * scale), color, 0.7);
      particle.setDepth(CONFIG.destructibleBackground.repairDepth + 1.2);
      system.activeTemporaryChunks.push(particle);
      tweenAndRemoveChunk(system, particle, {
        x: x + Math.cos(angle) * Phaser.Math.Between(10, damage.splashRadius || 34) * scale,
        y: y + Math.sin(angle) * Phaser.Math.Between(10, damage.splashRadius || 34) * scale,
        alpha: 0,
        scale: 0.2,
        duration: damage.splashDurationMs || 520
      });
    }
    for (var foam = 0; foam < (damage.foamCount || 0); foam += 1) {
      var foamAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var foamRadius = Phaser.Math.Between((damage.rippleRadius || 24) * 0.35, damage.rippleRadius || 36) * scale;
      var foamParticle = system.scene.add.circle(x + Math.cos(foamAngle) * foamRadius, y + Math.sin(foamAngle) * foamRadius, Math.max(1.5, 2 * scale), color, 0.44);
      foamParticle.setDepth(CONFIG.destructibleBackground.repairDepth + 1.1);
      system.activeTemporaryChunks.push(foamParticle);
      tweenAndRemoveChunk(system, foamParticle, {
        scale: 0.35,
        alpha: 0,
        duration: (damage.repairDurationMs || 1000) * 0.82
      });
    }
    if (damage.type === "waterPixelRipple") {
      createCellFlicker(system, damage, geometry);
    }
    capWaterRipples(system);
    markEffect(system.scene, "backgroundWaterRipple");
  }

  function createSandResponseFx(system, damage, geometry, x, y, scale) {
    var color = damage.detailColor || system.material.surface.tileColor;
    var count = damage.dustCount || damage.particleCount || 10;
    for (var index = 0; index < count; index += 1) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var distance = Phaser.Math.Between(8, damage.particleDistance || 32) * scale;
      var particle = system.scene.add.circle(x, y, Math.max(1.5, (damage.particleSize || 3) * 0.5 * scale), color, 0.36);
      particle.setDepth(CONFIG.destructibleBackground.repairDepth + 1);
      system.activeTemporaryChunks.push(particle);
      tweenAndRemoveChunk(system, particle, {
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.25,
        duration: 620
      });
    }
    if (geometry.type === "localGridBreak") {
      createCellChunks(system, damage, geometry, x, y, scale);
      createCellFlicker(system, damage, geometry);
    }
    markEffect(system.scene, "backgroundSandDust");
  }

  function capTemporaryChunks(system) {
    while (system.activeTemporaryChunks.length > CONFIG.destructibleBackground.maxTemporaryChunks) {
      var chunk = system.activeTemporaryChunks.shift();
      if (chunk && chunk.active) {
        chunk.destroy();
      }
    }
  }

  function capWaterRipples(system) {
    var maxRipples = system.waterAnimation ? system.waterAnimation.rippleMaxCount : 34;
    while (system.activeWaterRipples.length > maxRipples) {
      var ripple = system.activeWaterRipples.shift();
      remove(system.activeTemporaryChunks, ripple);
      if (ripple && ripple.active) {
        ripple.destroy();
      }
    }
  }

  function tweenAndRemoveChunk(system, chunk, config) {
    var tweenConfig = {
      targets: chunk,
      onComplete: function () {
        removeChunk(system, chunk);
      }
    };
    Object.keys(config).forEach(function (key) {
      tweenConfig[key] = config[key];
    });
    system.scene.tweens.add(tweenConfig);
  }

  function tweenAndRemoveWaterRipple(system, ripple, config) {
    var tweenConfig = {
      targets: ripple,
      onComplete: function () {
        remove(system.activeWaterRipples, ripple);
        removeChunk(system, ripple);
      }
    };
    Object.keys(config).forEach(function (key) {
      tweenConfig[key] = config[key];
    });
    system.scene.tweens.add(tweenConfig);
  }

  function removeChunk(system, chunk) {
    remove(system.activeTemporaryChunks, chunk);
    if (chunk && chunk.active) {
      chunk.destroy();
    }
  }

  function clear(system) {
    if (!system) {
      return;
    }
    system.activeDamageMarks.slice().forEach(function (mark) {
      if (mark.timer && mark.timer.remove) {
        mark.timer.remove(false);
      }
      if (mark.tween && mark.tween.remove) {
        mark.tween.remove();
      }
      if (mark.repairGraphic) {
        mark.repairGraphic.destroy();
      }
    });
    system.activeDamageMarks = [];
    system.activeTemporaryChunks.forEach(function (chunk) {
      if (chunk && chunk.active) {
        chunk.destroy();
      }
    });
    system.activeTemporaryChunks = [];
    system.activeWaterRipples.forEach(function (ripple) {
      if (ripple && ripple.active) {
        ripple.destroy();
      }
    });
    system.activeWaterRipples = [];
    if (system.surface) {
      system.surface.destroy();
      system.surface = null;
    }
    if (system.underlayer) {
      system.underlayer.destroy();
      system.underlayer = null;
    }
    if (system.waterAnimation && system.waterAnimation.graphics) {
      system.waterAnimation.graphics.destroy();
      system.waterAnimation = null;
    }
  }

  function getSnapshot(system) {
    return {
      enabled: Boolean(system && system.enabled),
      renderTextureUsed: Boolean(system && system.renderTextureUsed),
      backgroundMaterial: system && system.material ? {
        id: system.material.id,
        name: system.material.name,
        repairMode: system.material.repair.mode
      } : null,
      damageCount: system ? system.damageCount : 0,
      repairCount: system ? system.repairCount : 0,
      activeTemporaryChunks: system ? system.activeTemporaryChunks.length : 0,
      waterAnimation: system && system.waterAnimation ? {
        active: system.waterAnimation.enabled,
        enabled: system.waterAnimation.enabled,
        waveCount: system.waterAnimation.waveCount,
        shimmerCount: system.waterAnimation.shimmerCount,
        rippleCount: system.activeWaterRipples.length,
        rippleMaxCount: system.waterAnimation.rippleMaxCount,
        waveSpeed: system.waterAnimation.waveSpeed,
        updateIntervalMs: system.waterAnimation.updateIntervalMs
      } : null,
      lastGroundBreakBrush: system && system.lastBrushByResponse.groundBreak ? system.lastBrushByResponse.groundBreak : null,
      lastPixelShatterBrush: system && system.lastBrushByResponse.pixelShatter ? system.lastBrushByResponse.pixelShatter : null,
      lastBackgroundResponse: system ? lastResponse(system.lastBrushByResponse) : null,
      activeDamageMarks: system ? system.activeDamageMarks.length : 0,
      repairingDamageMarks: system ? system.activeDamageMarks.filter(function (mark) {
        return mark.repairStarted && !mark.repairComplete;
      }).length : 0
    };
  }

  function markEffect(scene, type) {
    scene.effectCounts[type] = (scene.effectCounts[type] || 0) + 1;
  }

  function summarizeBrush(response, damage, geometry) {
    return {
      response: response,
      type: geometry.type,
      damageType: damage.type,
      lineCount: geometry.lines ? geometry.lines.length : 0,
      cellCount: geometry.rects ? geometry.rects.length : 0,
      circleCount: geometry.circles ? geometry.circles.length : 0,
      repairMode: damage.repairMode || "fade",
      chunkCount: damage.chunkCount || 0
    };
  }

  function lastResponse(responses) {
    var keys = Object.keys(responses || {});
    return keys.length ? responses[keys[keys.length - 1]] : null;
  }

  function remove(list, item) {
    var index = list.indexOf(item);
    if (index >= 0) {
      list.splice(index, 1);
    }
  }

  ARENA.DestructibleBackground = {
    create: create,
    update: update,
    apply: apply,
    clear: clear,
    getSnapshot: getSnapshot
  };
})();

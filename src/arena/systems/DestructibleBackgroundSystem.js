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
      lastBrushByResponse: {}
    };

    if (!system.enabled) {
      return system;
    }

    system.underlayer = createUnderlayer(scene, system.material);
    system.surface = createSurface(scene, system.material);
    system.renderTextureUsed = Boolean(system.surface && system.surface.erase && CONFIG.destructibleBackground.useRenderTexture);
    return system;
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

  function createUnderlayer(scene, material) {
    var config = CONFIG.destructibleBackground;
    var underlayer = material.underlayer;
    var surface = material.surface;
    var graphics = scene.add.graphics();
    graphics.setDepth(config.underlayerDepth);
    graphics.fillStyle(underlayer.color, config.underlayerAlpha);
    graphics.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    graphics.lineStyle(1, underlayer.crackColor, underlayer.gridAlpha);
    for (var x = 0; x <= CONFIG.canvas.width; x += surface.gridSize) {
      graphics.lineBetween(x, 0, x, CONFIG.canvas.height);
    }
    for (var y = 0; y <= CONFIG.canvas.height; y += surface.gridSize) {
      graphics.lineBetween(0, y, CONFIG.canvas.width, y);
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

  function createGeometry(damage, x, y, scale) {
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
    if (geometry.type === "floorFracture" || geometry.type === "localizedCollapse") {
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

  function capTemporaryChunks(system) {
    while (system.activeTemporaryChunks.length > CONFIG.destructibleBackground.maxTemporaryChunks) {
      var chunk = system.activeTemporaryChunks.shift();
      if (chunk && chunk.active) {
        chunk.destroy();
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
    if (system.surface) {
      system.surface.destroy();
      system.surface = null;
    }
    if (system.underlayer) {
      system.underlayer.destroy();
      system.underlayer = null;
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
      lastGroundBreakBrush: system && system.lastBrushByResponse.groundBreak ? system.lastBrushByResponse.groundBreak : null,
      lastPixelShatterBrush: system && system.lastBrushByResponse.pixelShatter ? system.lastBrushByResponse.pixelShatter : null,
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

  function remove(list, item) {
    var index = list.indexOf(item);
    if (index >= 0) {
      list.splice(index, 1);
    }
  }

  ARENA.DestructibleBackground = {
    create: create,
    apply: apply,
    clear: clear,
    getSnapshot: getSnapshot
  };
})();

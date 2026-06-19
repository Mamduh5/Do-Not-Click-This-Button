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
      enabled: Boolean(CONFIG.destructibleBackground.enabled)
    };

    if (!system.enabled) {
      return system;
    }

    system.underlayer = createUnderlayer(scene);
    system.surface = createSurface(scene);
    system.renderTextureUsed = Boolean(system.surface && system.surface.erase && CONFIG.destructibleBackground.useRenderTexture);
    return system;
  }

  function apply(system, skin, x, y, scale) {
    var damage = skin.backgroundDamage;
    if (!system || !system.enabled || !damage || !damage.enabled) {
      return null;
    }

    var geometry = createGeometry(damage, x, y, scale * CONFIG.destructibleBackground.brushScale);
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
    scheduleRepair(system, mark);
    system.activeDamageMarks.push(mark);
    system.damageCount += 1;
    markEffect(system.scene, "backgroundDamage");
    markEffect(system.scene, "backgroundDamage_" + damage.type);
    capDamageMarks(system);
    return mark;
  }

  function createUnderlayer(scene) {
    var config = CONFIG.destructibleBackground;
    var graphics = scene.add.graphics();
    graphics.setDepth(config.underlayerDepth);
    graphics.fillStyle(config.underlayerColor, config.underlayerAlpha);
    graphics.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    graphics.lineStyle(1, config.underlayerCrackColor, config.underlayerGridAlpha);
    for (var x = 0; x <= CONFIG.canvas.width; x += config.gridSize) {
      graphics.lineBetween(x, 0, x, CONFIG.canvas.height);
    }
    for (var y = 0; y <= CONFIG.canvas.height; y += config.gridSize) {
      graphics.lineBetween(0, y, CONFIG.canvas.width, y);
    }
    graphics.lineStyle(1, config.underlayerGlowColor, 0.12);
    graphics.strokeCircle(CONFIG.canvas.width / 2, CONFIG.canvas.height / 2, config.coreRingRadius * 1.08);
    return graphics;
  }

  function createSurface(scene) {
    var config = CONFIG.destructibleBackground;
    var surface = scene.add.renderTexture(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    var clean = scene.make.graphics({ add: false });
    surface.setOrigin(0, 0);
    surface.setDepth(config.surfaceDepth);
    surface.setAlpha(config.surfaceAlpha);
    drawCleanFloor(clean, config);
    surface.draw(clean, 0, 0);
    clean.destroy();
    return surface;
  }

  function drawCleanFloor(graphics, config) {
    graphics.clear();
    graphics.fillStyle(config.surfaceColor, 1);
    graphics.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    graphics.lineStyle(1, config.surfaceGridColor, 0.9);
    for (var x = 0; x <= CONFIG.canvas.width; x += config.gridSize) {
      graphics.lineBetween(x, 0, x, CONFIG.canvas.height);
    }
    for (var y = 0; y <= CONFIG.canvas.height; y += config.gridSize) {
      graphics.lineBetween(0, y, CONFIG.canvas.width, y);
    }
    graphics.lineStyle(2, config.surfaceBorderColor, 1);
    graphics.strokeRect(config.borderInset, config.borderInset, CONFIG.canvas.width - config.borderInset * 2, CONFIG.canvas.height - config.borderInset * 2);
    graphics.lineStyle(1, config.surfaceDetailColor, 0.5);
    graphics.strokeCircle(CONFIG.canvas.width / 2, CONFIG.canvas.height / 2, config.coreRingRadius);
  }

  function createGeometry(damage, x, y, scale) {
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
    drawGeometry(graphics, geometry, damage.underlayerColor || CONFIG.destructibleBackground.underlayerColor, 0.56, true);
    drawGeometry(graphics, geometry, damage.detailColor || CONFIG.destructibleBackground.underlayerCrackColor, 0.52, false);
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
    drawGeometry(graphics, geometry, damage.underlayerColor || CONFIG.destructibleBackground.underlayerColor, CONFIG.destructibleBackground.fallbackDamageAlpha, true);
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
    drawGeometry(mark.repairGraphic, mark.geometry, CONFIG.destructibleBackground.surfaceColor, CONFIG.destructibleBackground.repairPatchAlpha, true);
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
      drawGeometry(brush, mark.geometry, CONFIG.destructibleBackground.surfaceColor, 1, true);
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
      damageCount: system ? system.damageCount : 0,
      repairCount: system ? system.repairCount : 0,
      activeDamageMarks: system ? system.activeDamageMarks.length : 0,
      repairingDamageMarks: system ? system.activeDamageMarks.filter(function (mark) {
        return mark.repairStarted && !mark.repairComplete;
      }).length : 0
    };
  }

  function markEffect(scene, type) {
    scene.effectCounts[type] = (scene.effectCounts[type] || 0) + 1;
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

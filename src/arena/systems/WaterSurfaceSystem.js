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
      lastUpdateMs: -Infinity,
      lastImpulseType: null,
      totalImpulseCount: 0,
      strongestImpulse: 0,
      averageEnergy: 0
    };

    if (active && config.visualEnabled !== false) {
      system.graphics = scene.add.graphics();
      system.graphics.setDepth(CONFIG.destructibleBackground.repairDepth + 0.35);
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
    if (!system.graphics) {
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
          graphics.fillCircle((col + 0.5) * cellWidth, (row + 0.5) * cellHeight, Math.max(cellWidth, cellHeight) * 0.45);
          rendered += 1;
          if (rendered >= config.maxRenderedCells) {
            return;
          }
        }
      }
    }
  }

  function createRippleObject(system, impulseType, x, y, strength, scale) {
    var config = system.config;
    var color = config.foamColor;
    var radius = impulseType === "meteor" ? 46 : impulseType === "groundBreak" ? 34 : impulseType === "arrowRain" ? 12 : 20;
    var ring = system.scene.add.circle(x, y, radius * scale, color, 0.01);
    ring.setStrokeStyle(config.rippleRingWidth || 2, color, Math.min(0.55, config.ringAlpha * Math.max(0.55, strength)));
    ring.setDepth(CONFIG.destructibleBackground.repairDepth + 1.6);
    system.ripples.push(ring);
    system.scene.tweens.add({
      targets: ring,
      scale: impulseType === "meteor" ? 2.4 : 1.85,
      alpha: 0,
      duration: config.rippleRingDurationMs || config.foamDurationMs,
      onComplete: function () {
        remove(system.ripples, ring);
        if (ring.active) {
          ring.destroy();
        }
      }
    });

    if (impulseType === "meteor" || impulseType === "groundBreak" || impulseType === "sciFiLaser") {
      createFoam(system, x, y, strength, scale, impulseType);
    }
    if (impulseType === "pixelShatter") {
      createPixelDisturbance(system, x, y, scale);
    }

    capRipples(system);
  }

  function createFoam(system, x, y, strength, scale, impulseType) {
    var count = impulseType === "meteor" ? system.config.splashParticleCount + 8 : system.config.splashParticleCount;
    if (impulseType === "sciFiLaser") {
      count = Math.floor(count * 0.45);
    }
    for (var index = 0; index < count; index += 1) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var distance = Phaser.Math.Between(8, impulseType === "meteor" ? 58 : 36) * scale;
      var particle = system.scene.add.circle(x, y, Math.max(1.5, 2.2 * scale), system.config.foamColor, 0.54);
      particle.setDepth(CONFIG.destructibleBackground.repairDepth + 1.7);
      system.foam.push(particle);
      system.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.24,
        duration: system.config.foamDurationMs * 0.75,
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

  function capFoam(system) {
    while (system.foam.length > (system.config.foamMax || 48)) {
      var foam = system.foam.shift();
      if (foam && foam.active) {
        foam.destroy();
      }
    }
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
      activeRippleCount: system ? system.ripples.length : 0,
      rippleCount: system ? system.ripples.length : 0,
      foamCount: system ? system.foam.length : 0,
      averageEnergy: system ? system.averageEnergy : 0,
      gridAverageEnergy: system ? system.averageEnergy : 0,
      lastImpulseType: system ? system.lastImpulseType : null,
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
    system.foam.forEach(function (foam) {
      if (foam && foam.active) {
        foam.destroy();
      }
    });
    system.foam = [];
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

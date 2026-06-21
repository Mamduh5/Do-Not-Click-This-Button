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
      fullCircleRippleCount: 0,
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
    createBrokenArcs(system, impulseType, x, y, strength, scale * splashScale);

    if (impulseType === "meteor" || impulseType === "groundBreak" || impulseType === "sciFiLaser") {
      createFoam(system, x, y, strength, scale * splashScale, impulseType);
      createDroplets(system, x, y, scale * splashScale, impulseType);
    }
    if (impulseType === "arrowRain") {
      createFoam(system, x, y, strength, scale * splashScale, impulseType);
    }
    if (impulseType === "pixelShatter") {
      createPixelDisturbance(system, x, y, scale);
    }

    capRipples(system);
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
      activeSplashCount: system ? system.arcs.length + system.foam.length : 0,
      activeFoamCount: system ? system.foam.length : 0,
      activeArcCount: system ? system.arcs.length : 0,
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

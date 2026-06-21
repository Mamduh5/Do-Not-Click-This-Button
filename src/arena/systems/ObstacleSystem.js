(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function create(scene, material) {
    var rules = material && material.obstacleRules ? material.obstacleRules : {};
    var padding = rules.obstaclePadding || 0;
    var obstacles = rules.enabled ? (rules.obstacles || []).slice(0, rules.maxObstacles || 12).map(function (obstacle, index) {
      return normalizeObstacle(obstacle, padding, index);
    }) : [];
    var system = {
      scene: scene,
      materialId: material ? material.id : null,
      enabled: Boolean(rules.enabled),
      padding: padding,
      avoidanceForce: rules.avoidanceForce || 1,
      obstacleInfluence: rules.obstacleInfluence || 20,
      spawnClearance: rules.spawnClearance || 0,
      boundaryClearance: rules.boundaryClearance || 1,
      stuckDetectionMs: rules.stuckDetectionMs || 700,
      stuckDistance: rules.stuckDistance || 1,
      directionRerollCooldownMs: rules.directionRerollCooldownMs || 500,
      movementMode: rules.movementMode || "freeRoam",
      slideAlongEdges: rules.slideAlongEdges !== false,
      pushOutMargin: rules.pushOutMargin || 1,
      blockedMoveCount: 0,
      obstacles: obstacles,
      townMap: material && material.surface && material.surface.map ? material.surface.map : null,
      debugOverlay: null,
      avoidanceCount: 0,
      pushOutCount: 0,
      stuckRerollCount: 0
    };

    if (rules.debugOverlay && obstacles.length > 0) {
      system.debugOverlay = renderDebug(scene, obstacles);
    }

    return system;
  }

  function normalizeObstacle(obstacle, padding, index) {
    var shape = obstacle.shape || (obstacle.radius ? "circle" : "rect");
    var normalized = {
      id: obstacle.id || "obstacle-" + index,
      type: obstacle.type || shape,
      shape: shape,
      x: obstacle.x,
      y: obstacle.y
    };
    if (shape === "circle") {
      normalized.radius = obstacle.radius;
      normalized.left = obstacle.x - obstacle.radius - padding;
      normalized.top = obstacle.y - obstacle.radius - padding;
      normalized.right = obstacle.x + obstacle.radius + padding;
      normalized.bottom = obstacle.y + obstacle.radius + padding;
      return normalized;
    }
    normalized.width = obstacle.width;
    normalized.height = obstacle.height;
    normalized.left = obstacle.x - padding;
    normalized.top = obstacle.y - padding;
    normalized.right = obstacle.x + obstacle.width + padding;
    normalized.bottom = obstacle.y + obstacle.height + padding;
    return normalized;
  }

  function renderDebug(scene, obstacles) {
    var graphics = scene.add.graphics();
    graphics.setDepth(CONFIG.destructibleBackground.fallbackDamageDepth + 0.2);
    obstacles.forEach(function (obstacle) {
      graphics.lineStyle(1, 0x19d8ff, 0.26);
      graphics.fillStyle(0x19d8ff, 0.035);
      if (obstacle.shape === "circle") {
        graphics.strokeCircle(obstacle.x, obstacle.y, obstacle.radius + (obstacle.left ? obstacle.x - obstacle.left - obstacle.radius : 0));
        graphics.fillCircle(obstacle.x, obstacle.y, obstacle.radius);
      } else {
        graphics.strokeRect(obstacle.left, obstacle.top, obstacle.right - obstacle.left, obstacle.bottom - obstacle.top);
        graphics.fillRect(obstacle.left, obstacle.top, obstacle.right - obstacle.left, obstacle.bottom - obstacle.top);
      }
    });
    return graphics;
  }

  function isPointInside(system, x, y, radius) {
    return Boolean(findContainingObstacle(system, x, y, radius));
  }

  function findContainingObstacle(system, x, y, radius) {
    if (!system || !system.enabled) {
      return null;
    }
    radius = radius || 0;
    for (var index = 0; index < system.obstacles.length; index += 1) {
      var obstacle = system.obstacles[index];
      if (isInsideObstacle(obstacle, x, y, radius)) {
        return obstacle;
      }
    }
    return null;
  }

  function isInsideObstacle(obstacle, x, y, radius) {
    radius = radius || 0;
    if (obstacle.shape === "circle") {
      return Phaser.Math.Distance.Between(x, y, obstacle.x, obstacle.y) <= obstacle.radius + radius;
    }
    return x >= obstacle.left - radius && x <= obstacle.right + radius && y >= obstacle.top - radius && y <= obstacle.bottom + radius;
  }

  function nearestSafePoint(system, obstacle, x, y, radius) {
    radius = radius || 0;
    var clearance = system && system.boundaryClearance !== undefined ? system.boundaryClearance : 1;
    if (obstacle.shape === "circle") {
      var angle = Phaser.Math.Angle.Between(obstacle.x, obstacle.y, x, y);
      if (!Number.isFinite(angle)) {
        angle = 0;
      }
      var distance = obstacle.radius + radius + clearance + (system ? system.pushOutMargin : 0);
      return {
        x: Phaser.Math.Clamp(obstacle.x + Math.cos(angle) * distance, 0, CONFIG.canvas.width),
        y: Phaser.Math.Clamp(obstacle.y + Math.sin(angle) * distance, 0, CONFIG.canvas.height),
        side: "circle"
      };
    }
    var distances = [
      { side: "left", value: Math.abs(x - (obstacle.left - radius)), x: obstacle.left - radius - clearance, y: y },
      { side: "right", value: Math.abs((obstacle.right + radius) - x), x: obstacle.right + radius + clearance, y: y },
      { side: "top", value: Math.abs(y - (obstacle.top - radius)), x: x, y: obstacle.top - radius - clearance },
      { side: "bottom", value: Math.abs((obstacle.bottom + radius) - y), x: x, y: obstacle.bottom + radius + clearance }
    ].sort(function (a, b) {
      return a.value - b.value;
    });
    return {
      x: Phaser.Math.Clamp(distances[0].x, 0, CONFIG.canvas.width),
      y: Phaser.Math.Clamp(distances[0].y, 0, CONFIG.canvas.height),
      side: distances[0].side
    };
  }

  function getSafeSpawnPoint(system, x, y, radius) {
    var obstacle = findContainingObstacle(system, x, y, radius + (system ? system.spawnClearance : 0));
    if (!obstacle) {
      return { x: x, y: y, adjusted: false };
    }
    var safe = nearestSafePoint(system, obstacle, x, y, radius + system.spawnClearance);
    if (system) {
      system.pushOutCount += 1;
    }
    return { x: safe.x, y: safe.y, adjusted: true };
  }

  function avoidMovement(system, enemy, previousX, previousY, nextX, nextY) {
    if (!system || !system.enabled || system.obstacles.length === 0) {
      return { x: nextX, y: nextY, adjusted: false };
    }

    var radius = enemy.radius || enemy.baseRadius || 0;
    var containing = findContainingObstacle(system, nextX, nextY, radius);
    if (containing) {
      var safe = nearestSafePoint(system, containing, nextX, nextY, radius);
      system.pushOutCount += 1;
      system.blockedMoveCount += 1;
      return steerResult(enemy, safe.x, safe.y, true);
    }

    var adjustedX = nextX;
    var adjustedY = nextY;
    var adjusted = false;
    system.obstacles.forEach(function (obstacle) {
      var closest = closestPoint(obstacle, adjustedX, adjustedY);
      var closestX = closest.x;
      var closestY = closest.y;
      var distance = Phaser.Math.Distance.Between(adjustedX, adjustedY, closestX, closestY);
      var influence = Math.max(radius + system.obstacleInfluence, system.obstacleInfluence);
      if (distance > 0 && distance < influence) {
        var strength = (influence - distance) / influence * system.avoidanceForce;
        var angle = Phaser.Math.Angle.Between(closestX, closestY, adjustedX, adjustedY);
        adjustedX += Math.cos(angle) * strength * 8;
        adjustedY += Math.sin(angle) * strength * 8;
        adjusted = true;
      }
    });

    if (adjusted) {
      system.avoidanceCount += 1;
      return steerResult(enemy, adjustedX, adjustedY, true);
    }

    return { x: nextX, y: nextY, adjusted: false };
  }

  function closestPoint(obstacle, x, y) {
    if (obstacle.shape === "circle") {
      var angle = Phaser.Math.Angle.Between(obstacle.x, obstacle.y, x, y);
      return {
        x: obstacle.x + Math.cos(angle) * obstacle.radius,
        y: obstacle.y + Math.sin(angle) * obstacle.radius
      };
    }
    return {
      x: Phaser.Math.Clamp(x, obstacle.left, obstacle.right),
      y: Phaser.Math.Clamp(y, obstacle.top, obstacle.bottom)
    };
  }

  function updateEnemyState(system, enemy, previousX, previousY, deltaMs, timeMs) {
    if (!system || !system.enabled || !enemy || !enemy.active) {
      return;
    }
    var distance = Phaser.Math.Distance.Between(previousX, previousY, enemy.x, enemy.y);
    if (distance <= system.stuckDistance) {
      enemy.obstacleStillMs = (enemy.obstacleStillMs || 0) + deltaMs;
    } else {
      enemy.obstacleStillMs = 0;
      enemy.obstacleStuck = false;
    }
    if (enemy.obstacleStillMs >= system.stuckDetectionMs) {
      enemy.obstacleStuck = true;
      if (!enemy.obstacleNextRerollAt || timeMs >= enemy.obstacleNextRerollAt) {
        enemy.driftAngle += Phaser.Math.FloatBetween(1.35, 2.4) * (Math.random() < 0.5 ? -1 : 1);
        enemy.obstacleNextRerollAt = timeMs + system.directionRerollCooldownMs;
        system.stuckRerollCount += 1;
      }
    }
  }

  function steerResult(enemy, x, y, adjusted) {
    if (adjusted) {
      enemy.driftAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, x, y) + Phaser.Math.FloatBetween(-0.25, 0.25);
    }
    return {
      x: Phaser.Math.Clamp(x, -CONFIG.enemy.spawnMargin, CONFIG.canvas.width + CONFIG.enemy.spawnMargin),
      y: Phaser.Math.Clamp(y, -CONFIG.enemy.spawnMargin, CONFIG.canvas.height + CONFIG.enemy.spawnMargin),
      adjusted: adjusted
    };
  }

  function countEnemiesInside(system, enemies) {
    if (!system || !system.enabled) {
      return 0;
    }
    return enemies.filter(function (enemy) {
      return enemy.active && isPointInside(system, enemy.x, enemy.y, enemy.radius || enemy.baseRadius || 0);
    }).length;
  }

  function getSnapshot(system, enemies) {
    var insideCount = countEnemiesInside(system, enemies || []);
    var stuckCount = countStuckEnemies(system, enemies || []);
    return {
      enabled: Boolean(system && system.enabled),
      materialId: system ? system.materialId : null,
      obstacleCount: system ? system.obstacles.length : 0,
      movementMode: system ? system.movementMode : null,
      padding: system ? system.padding : 0,
      avoidanceForce: system ? system.avoidanceForce : 0,
      obstacleInfluence: system ? system.obstacleInfluence : 0,
      spawnClearance: system ? system.spawnClearance : 0,
      avoidanceCount: system ? system.avoidanceCount : 0,
      blockedMoveCount: system ? system.blockedMoveCount : 0,
      pushOutCount: system ? system.pushOutCount : 0,
      stuckEnemyCount: stuckCount,
      stuckRerollCount: system ? system.stuckRerollCount : 0,
      debugOverlay: Boolean(system && system.debugOverlay),
      townMap: system && system.townMap ? {
        roadCount: system.townMap.roadCount,
        plazaCount: system.townMap.plazaCount,
        buildingCount: system.townMap.buildingCount,
        treeCount: system.townMap.treeCount || countObstaclesByType(system, "tree"),
        movementMode: system.townMap.movementMode || system.movementMode,
        enemiesInsideObstacles: insideCount,
        blockedMoveCount: system.blockedMoveCount,
        pushOutCount: system.pushOutCount,
        stuckEnemyCount: stuckCount
      } : null,
      obstacles: system ? system.obstacles.map(function (obstacle) {
        return {
          id: obstacle.id,
          type: obstacle.type,
          shape: obstacle.shape,
          x: obstacle.x,
          y: obstacle.y,
          width: obstacle.width,
          height: obstacle.height,
          radius: obstacle.radius,
          left: obstacle.left,
          top: obstacle.top,
          right: obstacle.right,
          bottom: obstacle.bottom
        };
      }) : [],
      enemiesInsideObstacles: insideCount
    };
  }

  function countObstaclesByType(system, type) {
    return system.obstacles.filter(function (obstacle) {
      return obstacle.type === type;
    }).length;
  }

  function countStuckEnemies(system, enemies) {
    if (!system || !system.enabled) {
      return 0;
    }
    return enemies.filter(function (enemy) {
      return enemy.active && enemy.obstacleStuck;
    }).length;
  }

  function clear(system) {
    if (system && system.debugOverlay) {
      system.debugOverlay.destroy();
      system.debugOverlay = null;
    }
  }

  ARENA.Obstacles = {
    create: create,
    clear: clear,
    isPointInside: isPointInside,
    getSafeSpawnPoint: getSafeSpawnPoint,
    avoidMovement: avoidMovement,
    updateEnemyState: updateEnemyState,
    countEnemiesInside: countEnemiesInside,
    getSnapshot: getSnapshot
  };
})();

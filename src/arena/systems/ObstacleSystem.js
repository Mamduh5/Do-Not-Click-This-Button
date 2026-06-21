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
      obstacles: obstacles,
      debugOverlay: null,
      avoidanceCount: 0,
      pushOutCount: 0
    };

    if (rules.debugOverlay && obstacles.length > 0) {
      system.debugOverlay = renderDebug(scene, obstacles);
    }

    return system;
  }

  function normalizeObstacle(obstacle, padding, index) {
    return {
      id: obstacle.id || "obstacle-" + index,
      type: "rect",
      x: obstacle.x,
      y: obstacle.y,
      width: obstacle.width,
      height: obstacle.height,
      left: obstacle.x - padding,
      top: obstacle.y - padding,
      right: obstacle.x + obstacle.width + padding,
      bottom: obstacle.y + obstacle.height + padding
    };
  }

  function renderDebug(scene, obstacles) {
    var graphics = scene.add.graphics();
    graphics.setDepth(CONFIG.destructibleBackground.fallbackDamageDepth + 0.2);
    obstacles.forEach(function (obstacle) {
      graphics.lineStyle(1, 0x19d8ff, 0.26);
      graphics.strokeRect(obstacle.left, obstacle.top, obstacle.right - obstacle.left, obstacle.bottom - obstacle.top);
      graphics.fillStyle(0x19d8ff, 0.035);
      graphics.fillRect(obstacle.left, obstacle.top, obstacle.right - obstacle.left, obstacle.bottom - obstacle.top);
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
      if (x >= obstacle.left - radius && x <= obstacle.right + radius && y >= obstacle.top - radius && y <= obstacle.bottom + radius) {
        return obstacle;
      }
    }
    return null;
  }

  function nearestSafePoint(obstacle, x, y, radius) {
    radius = radius || 0;
    var clearance = 1;
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
    var obstacle = findContainingObstacle(system, x, y, radius);
    if (!obstacle) {
      return { x: x, y: y, adjusted: false };
    }
    var safe = nearestSafePoint(obstacle, x, y, radius);
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
      var safe = nearestSafePoint(containing, nextX, nextY, radius);
      system.pushOutCount += 1;
      return steerResult(enemy, safe.x, safe.y, true);
    }

    var adjustedX = nextX;
    var adjustedY = nextY;
    var adjusted = false;
    system.obstacles.forEach(function (obstacle) {
      var closestX = Phaser.Math.Clamp(adjustedX, obstacle.left, obstacle.right);
      var closestY = Phaser.Math.Clamp(adjustedY, obstacle.top, obstacle.bottom);
      var distance = Phaser.Math.Distance.Between(adjustedX, adjustedY, closestX, closestY);
      var influence = Math.max(radius + 12, 20);
      if (distance > 0 && distance < influence) {
        var strength = (influence - distance) / influence * system.avoidanceForce;
        var angle = Phaser.Math.Angle.Between(closestX, closestY, adjustedX, adjustedY);
        adjustedX += Math.cos(angle) * strength * 7;
        adjustedY += Math.sin(angle) * strength * 7;
        adjusted = true;
      }
    });

    if (adjusted) {
      system.avoidanceCount += 1;
      return steerResult(enemy, adjustedX, adjustedY, true);
    }

    return { x: nextX, y: nextY, adjusted: false };
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
    return {
      enabled: Boolean(system && system.enabled),
      materialId: system ? system.materialId : null,
      obstacleCount: system ? system.obstacles.length : 0,
      padding: system ? system.padding : 0,
      avoidanceForce: system ? system.avoidanceForce : 0,
      avoidanceCount: system ? system.avoidanceCount : 0,
      pushOutCount: system ? system.pushOutCount : 0,
      debugOverlay: Boolean(system && system.debugOverlay),
      obstacles: system ? system.obstacles.map(function (obstacle) {
        return {
          id: obstacle.id,
          type: obstacle.type,
          x: obstacle.x,
          y: obstacle.y,
          width: obstacle.width,
          height: obstacle.height,
          left: obstacle.left,
          top: obstacle.top,
          right: obstacle.right,
          bottom: obstacle.bottom
        };
      }) : [],
      enemiesInsideObstacles: countEnemiesInside(system, enemies || [])
    };
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
    countEnemiesInside: countEnemiesInside,
    getSnapshot: getSnapshot
  };
})();

(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function create(scene, material) {
    var config = material && material.navigation ? material.navigation : null;
    var active = Boolean(material && material.id === "town" && config && config.enabled);
    var system = {
      scene: scene,
      active: active,
      config: config || {},
      cols: active ? Math.ceil(CONFIG.canvas.width / config.cellSize) : 0,
      rows: active ? Math.ceil(CONFIG.canvas.height / config.cellSize) : 0,
      cells: [],
      walkableCells: 0,
      blockedCells: 0,
      failedPathCount: 0,
      lastPathLength: 0,
      pathRequestsThisTick: 0,
      pathRequestTick: -1,
      debugOverlay: null
    };

    if (active) {
      buildGrid(system);
      if (config.debugOverlay) {
        system.debugOverlay = renderDebug(scene, system);
      }
    }

    return system;
  }

  function buildGrid(system) {
    for (var row = 0; row < system.rows; row += 1) {
      for (var col = 0; col < system.cols; col += 1) {
        var center = cellCenter(system, col, row);
        var blocked = isPointInBuildings(system, center.x, center.y);
        system.cells[indexOf(system, col, row)] = {
          col: col,
          row: row,
          walkable: !blocked,
          road: isPointInRects(center.x, center.y, system.config.roads || []),
          plaza: isPointInRects(center.x, center.y, system.config.plazas || [])
        };
        if (blocked) {
          system.blockedCells += 1;
        } else {
          system.walkableCells += 1;
        }
      }
    }
  }

  function renderDebug(scene, system) {
    var graphics = scene.add.graphics();
    graphics.setDepth(CONFIG.destructibleBackground.fallbackDamageDepth + 0.35);
    system.cells.forEach(function (cell) {
      if (!cell.walkable) {
        graphics.fillStyle(0xff3344, 0.08);
        graphics.fillRect(cell.col * system.config.cellSize, cell.row * system.config.cellSize, system.config.cellSize, system.config.cellSize);
      }
    });
    return graphics;
  }

  function getSafeSpawnPoint(system, x, y) {
    if (!system || !system.active) {
      return { x: x, y: y, adjusted: false };
    }
    var cell = worldToCell(system, x, y);
    if (isWalkable(system, cell.col, cell.row)) {
      return { x: x, y: y, adjusted: false };
    }
    var nearest = findNearestWalkableCell(system, cell.col, cell.row);
    if (!nearest) {
      return randomSpawnPoint(system);
    }
    var center = cellCenter(system, nearest.col, nearest.row);
    return { x: center.x, y: center.y, adjusted: true };
  }

  function randomSpawnPoint(system) {
    if (!system || !system.active) {
      return { x: CONFIG.canvas.width / 2, y: CONFIG.canvas.height / 2, adjusted: true };
    }
    var zones = system.config.spawnZones || [];
    for (var attempt = 0; attempt < 18; attempt += 1) {
      var zone = zones.length ? zones[attempt % zones.length] : { x: 0, y: 0, width: CONFIG.canvas.width, height: CONFIG.canvas.height };
      var x = zone.x + ((attempt * 73) % Math.max(1, zone.width));
      var y = zone.y + ((attempt * 41) % Math.max(1, zone.height));
      var safe = getSafeSpawnPoint(system, x, y);
      if (!safe.adjusted || isWalkableWorld(system, safe.x, safe.y)) {
        return safe;
      }
    }
    var fallback = findNearestWalkableCell(system, Math.floor(system.cols / 2), Math.floor(system.rows / 2));
    var center = fallback ? cellCenter(system, fallback.col, fallback.row) : { x: CONFIG.canvas.width / 2, y: CONFIG.canvas.height / 2 };
    return { x: center.x, y: center.y, adjusted: true };
  }

  function moveEnemy(scene, system, enemy, deltaMs) {
    if (!system || !system.active || !enemy.active) {
      return false;
    }
    resetPathBudget(system, scene.time.now);
    ensureEnemyOnWalkable(system, enemy);
    ensurePath(scene, system, enemy);

    if (!enemy.townPath || enemy.townPath.length === 0) {
      return false;
    }

    var waypoint = enemy.townPath[enemy.townWaypointIndex || 0];
    if (!waypoint) {
      clearEnemyPath(enemy);
      return true;
    }

    var distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, waypoint.x, waypoint.y);
    if (distance <= system.config.waypointReachDistance) {
      enemy.townWaypointIndex = (enemy.townWaypointIndex || 0) + 1;
      if (enemy.townWaypointIndex >= enemy.townPath.length) {
        clearEnemyPath(enemy);
      }
      return true;
    }

    var angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, waypoint.x, waypoint.y);
    var deltaSeconds = deltaMs / 1000;
    var nextX = enemy.x + Math.cos(angle) * enemy.speed * deltaSeconds + enemy.knockbackX * deltaSeconds;
    var nextY = enemy.y + Math.sin(angle) * enemy.speed * deltaSeconds + enemy.knockbackY * deltaSeconds;
    if (!isWalkableWorld(system, nextX, nextY)) {
      forceRepath(scene, system, enemy);
      var safe = getSafeSpawnPoint(system, nextX, nextY);
      nextX = safe.x;
      nextY = safe.y;
    }
    enemy.x = nextX;
    enemy.y = nextY;
    enemy.lastMoveAngle = angle;
    return true;
  }

  function ensurePath(scene, system, enemy) {
    var now = scene.time.now;
    var needsPath = !enemy.townPath || enemy.townPath.length === 0 || now >= (enemy.townTargetExpiresAt || 0) || enemy.townNeedsRepath;
    if (!needsPath || system.pathRequestsThisTick >= system.config.maxPathRequestsPerTick) {
      return;
    }
    system.pathRequestsThisTick += 1;
    enemy.townNeedsRepath = false;
    var target = chooseTarget(system, enemy);
    var path = findPath(system, enemy.x, enemy.y, target.x, target.y);
    if (path.length === 0) {
      system.failedPathCount += 1;
      enemy.townTargetExpiresAt = now + system.config.stuckRepathMs;
      return;
    }
    enemy.townPath = path;
    enemy.townWaypointIndex = Math.min(1, path.length - 1);
    enemy.townTarget = target;
    enemy.townTargetExpiresAt = now + system.config.targetRerollMs;
    enemy.townLastPathAt = now;
    system.lastPathLength = path.length;
  }

  function forceRepath(scene, system, enemy) {
    enemy.townNeedsRepath = true;
    enemy.townStuck = true;
    enemy.townTargetExpiresAt = scene.time.now + system.config.stuckRepathMs;
  }

  function updateEnemyState(system, enemy, previousX, previousY, deltaMs, timeMs) {
    if (!system || !system.active || !enemy.active) {
      return;
    }
    var distance = Phaser.Math.Distance.Between(previousX, previousY, enemy.x, enemy.y);
    if (distance <= 0.7) {
      enemy.townStillMs = (enemy.townStillMs || 0) + deltaMs;
    } else {
      enemy.townStillMs = 0;
      enemy.townStuck = false;
    }
    if (enemy.townStillMs >= system.config.stuckRepathMs) {
      enemy.townStuck = true;
      if (!enemy.townNextRepathAt || timeMs >= enemy.townNextRepathAt) {
        enemy.townNeedsRepath = true;
        enemy.townNextRepathAt = timeMs + system.config.pathRecalcMs;
      }
    }
  }

  function chooseTarget(system, enemy) {
    var zones = system.config.spawnZones || [];
    for (var attempt = 0; attempt < 16; attempt += 1) {
      var zone = zones.length ? zones[(enemy.debugId + attempt) % zones.length] : { x: 0, y: 0, width: CONFIG.canvas.width, height: CONFIG.canvas.height };
      var x = zone.x + ((enemy.debugId * 97 + attempt * 53) % Math.max(1, zone.width));
      var y = zone.y + ((enemy.debugId * 61 + attempt * 37) % Math.max(1, zone.height));
      if (Phaser.Math.Distance.Between(enemy.x, enemy.y, x, y) > 80 && isWalkableWorld(system, x, y)) {
        return { x: x, y: y };
      }
    }
    return randomSpawnPoint(system);
  }

  function findPath(system, startX, startY, targetX, targetY) {
    var start = worldToCell(system, startX, startY);
    var target = worldToCell(system, targetX, targetY);
    if (!isWalkable(system, start.col, start.row)) {
      start = findNearestWalkableCell(system, start.col, start.row) || start;
    }
    if (!isWalkable(system, target.col, target.row)) {
      target = findNearestWalkableCell(system, target.col, target.row) || target;
    }
    if (!isWalkable(system, start.col, start.row) || !isWalkable(system, target.col, target.row)) {
      return [];
    }

    var open = [{ col: start.col, row: start.row, g: 0, f: heuristic(start, target), key: key(start.col, start.row), parent: null }];
    var seen = {};
    var closed = {};
    seen[open[0].key] = open[0];
    var iterations = 0;

    while (open.length > 0 && iterations < system.config.maxSearchIterations) {
      iterations += 1;
      open.sort(function (a, b) {
        return a.f - b.f;
      });
      var current = open.shift();
      closed[current.key] = true;
      if (current.col === target.col && current.row === target.row) {
        return reconstructPath(system, current).slice(0, system.config.maxPathLength);
      }

      neighbors(system, current.col, current.row).forEach(function (neighbor) {
        var neighborKey = key(neighbor.col, neighbor.row);
        if (closed[neighborKey]) {
          return;
        }
        var g = current.g + neighbor.cost;
        var existing = seen[neighborKey];
        if (!existing || g < existing.g) {
          var node = {
            col: neighbor.col,
            row: neighbor.row,
            g: g,
            f: g + heuristic(neighbor, target),
            key: neighborKey,
            parent: current
          };
          seen[neighborKey] = node;
          if (!existing) {
            open.push(node);
          } else {
            Object.keys(node).forEach(function (property) {
              existing[property] = node[property];
            });
          }
        }
      });
    }
    return [];
  }

  function neighbors(system, col, row) {
    var result = [];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (offset) {
      var nextCol = col + offset[0];
      var nextRow = row + offset[1];
      if (isWalkable(system, nextCol, nextRow)) {
        var cell = system.cells[indexOf(system, nextCol, nextRow)];
        result.push({
          col: nextCol,
          row: nextRow,
          cost: cell.road || cell.plaza ? 0.78 : 1
        });
      }
    });
    return result;
  }

  function reconstructPath(system, node) {
    var path = [];
    var current = node;
    while (current) {
      path.unshift(cellCenter(system, current.col, current.row));
      current = current.parent;
    }
    return path;
  }

  function ensureEnemyOnWalkable(system, enemy) {
    if (isWalkableWorld(system, enemy.x, enemy.y)) {
      return;
    }
    var safe = getSafeSpawnPoint(system, enemy.x, enemy.y);
    enemy.x = safe.x;
    enemy.y = safe.y;
    clearEnemyPath(enemy);
  }

  function clearEnemyPath(enemy) {
    enemy.townPath = null;
    enemy.townWaypointIndex = 0;
    enemy.townTarget = null;
    enemy.townNeedsRepath = true;
  }

  function resetPathBudget(system, timeMs) {
    var tick = Math.floor(timeMs / 16);
    if (tick !== system.pathRequestTick) {
      system.pathRequestTick = tick;
      system.pathRequestsThisTick = 0;
    }
  }

  function isPointInBuildings(system, x, y) {
    var padding = system.config.obstaclePadding || 0;
    return (system.config.buildings || []).some(function (rect) {
      return x >= rect.x - padding && x <= rect.x + rect.width + padding && y >= rect.y - padding && y <= rect.y + rect.height + padding;
    });
  }

  function isPointInRects(x, y, rects) {
    return rects.some(function (rect) {
      return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    });
  }

  function isWalkableWorld(system, x, y) {
    var cell = worldToCell(system, x, y);
    return isWalkable(system, cell.col, cell.row);
  }

  function isWalkable(system, col, row) {
    if (!system || !system.active || col < 0 || row < 0 || col >= system.cols || row >= system.rows) {
      return false;
    }
    return Boolean(system.cells[indexOf(system, col, row)].walkable);
  }

  function worldToCell(system, x, y) {
    return {
      col: Phaser.Math.Clamp(Math.floor(x / system.config.cellSize), 0, system.cols - 1),
      row: Phaser.Math.Clamp(Math.floor(y / system.config.cellSize), 0, system.rows - 1)
    };
  }

  function cellCenter(system, col, row) {
    return {
      x: Phaser.Math.Clamp(col * system.config.cellSize + system.config.cellSize * 0.5, 0, CONFIG.canvas.width),
      y: Phaser.Math.Clamp(row * system.config.cellSize + system.config.cellSize * 0.5, 0, CONFIG.canvas.height)
    };
  }

  function findNearestWalkableCell(system, col, row) {
    for (var radius = 0; radius < Math.max(system.cols, system.rows); radius += 1) {
      for (var dx = -radius; dx <= radius; dx += 1) {
        for (var dy = -radius; dy <= radius; dy += 1) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
            continue;
          }
          var nextCol = col + dx;
          var nextRow = row + dy;
          if (isWalkable(system, nextCol, nextRow)) {
            return { col: nextCol, row: nextRow };
          }
        }
      }
    }
    return null;
  }

  function heuristic(a, b) {
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
  }

  function key(col, row) {
    return col + ":" + row;
  }

  function indexOf(system, col, row) {
    return row * system.cols + col;
  }

  function getSnapshot(system, enemies) {
    var activePathCount = 0;
    var stuckEnemyCount = 0;
    (enemies || []).forEach(function (enemy) {
      if (enemy.active && enemy.townPath && enemy.townPath.length > 0) {
        activePathCount += 1;
      }
      if (enemy.active && enemy.townStuck) {
        stuckEnemyCount += 1;
      }
    });
    return {
      active: Boolean(system && system.active),
      cols: system ? system.cols : 0,
      rows: system ? system.rows : 0,
      walkableCells: system ? system.walkableCells : 0,
      blockedCells: system ? system.blockedCells : 0,
      activePathCount: activePathCount,
      failedPathCount: system ? system.failedPathCount : 0,
      enemiesInsideObstacles: ARENA.Obstacles && system && system.scene ? ARENA.Obstacles.countEnemiesInside(system.scene.obstacleSystem, enemies || []) : 0,
      stuckEnemyCount: stuckEnemyCount,
      lastPathLength: system ? system.lastPathLength : 0
    };
  }

  function clear(system) {
    if (system && system.debugOverlay) {
      system.debugOverlay.destroy();
      system.debugOverlay = null;
    }
  }

  ARENA.TownNavigation = {
    create: create,
    moveEnemy: moveEnemy,
    updateEnemyState: updateEnemyState,
    getSafeSpawnPoint: getSafeSpawnPoint,
    randomSpawnPoint: randomSpawnPoint,
    findPath: findPath,
    isWalkableWorld: isWalkableWorld,
    getSnapshot: getSnapshot,
    clear: clear
  };
})();

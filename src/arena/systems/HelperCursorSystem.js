(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var STATES = {
    IDLE: "idle",
    ACQUIRE_TARGET: "acquireTarget",
    TRAVEL_TO_TARGET: "travelToTarget",
    CLICK: "click",
    RETREAT: "retreat",
    COOLDOWN_WANDER: "cooldownWander"
  };

  function create(scene) {
    return {
      cursors: [],
      scene: scene
    };
  }

  function update(system, stats, deltaMs) {
    syncCursors(system, stats.helperCursors);
    system.cursors.forEach(function (cursor, index) {
      updateCursor(system.scene, cursor, index, stats, deltaMs);
      drawCursor(cursor);
    });
  }

  function syncCursors(system, desiredCount) {
    while (system.cursors.length < desiredCount) {
      system.cursors.push(createCursor(system.scene, system.cursors.length));
    }

    while (system.cursors.length > desiredCount) {
      system.cursors.pop().graphic.destroy();
    }
  }

  function createCursor(scene, index) {
    var graphic = scene.add.graphics();
    graphic.setDepth(30);
    if (graphic.disableInteractive) {
      graphic.disableInteractive();
    }

    return {
      x: scene.core.x + (index - 0.5) * 36,
      y: scene.core.y + 70,
      target: null,
      state: STATES.IDLE,
      stateStartedAt: scene.time.now,
      nextActionAt: scene.time.now + index * 140,
      cooldownUntil: scene.time.now,
      wanderX: scene.core.x,
      wanderY: scene.core.y,
      retreatX: scene.core.x,
      retreatY: scene.core.y,
      clickFlashUntil: 0,
      graphic: graphic
    };
  }

  function updateCursor(scene, cursor, index, stats, deltaMs) {
    var now = scene.time.now;

    if (cursor.state === STATES.IDLE) {
      wander(scene, cursor, index, stats, deltaMs);
      if (now >= cursor.nextActionAt) {
        setState(scene, cursor, STATES.ACQUIRE_TARGET);
      }
      return;
    }

    if (cursor.state === STATES.ACQUIRE_TARGET) {
      cursor.target = nearestEnemy(scene, cursor.x, cursor.y);
      if (cursor.target) {
        setState(scene, cursor, STATES.TRAVEL_TO_TARGET);
      } else {
        cursor.nextActionAt = now + stats.helperTargetReacquireDelayMs;
        setState(scene, cursor, STATES.IDLE);
      }
      return;
    }

    if (cursor.state === STATES.TRAVEL_TO_TARGET) {
      if (!cursor.target || !cursor.target.active) {
        cursor.target = null;
        cursor.nextActionAt = now + stats.helperTargetReacquireDelayMs;
        setState(scene, cursor, STATES.IDLE);
        return;
      }

      moveToward(cursor, cursor.target.x, cursor.target.y, stats.helperTravelSpeed, deltaMs);
      if (distance(cursor.x, cursor.y, cursor.target.x, cursor.target.y) <= Math.max(5, stats.helperClickRadius * 0.45) || now - cursor.stateStartedAt >= stats.helperMaxTravelDurationMs) {
        setState(scene, cursor, STATES.CLICK);
      }
      return;
    }

    if (cursor.state === STATES.CLICK) {
      clickTarget(scene, cursor, stats);
      chooseRetreat(scene, cursor, stats);
      cursor.cooldownUntil = now + stats.helperClickIntervalMs;
      setState(scene, cursor, STATES.RETREAT);
      return;
    }

    if (cursor.state === STATES.RETREAT) {
      moveToward(cursor, cursor.retreatX, cursor.retreatY, stats.helperTravelSpeed, deltaMs);
      if (distance(cursor.x, cursor.y, cursor.retreatX, cursor.retreatY) <= 4) {
        setState(scene, cursor, STATES.COOLDOWN_WANDER);
      }
      return;
    }

    if (cursor.state === STATES.COOLDOWN_WANDER) {
      cursor.target = null;
      wander(scene, cursor, index, stats, deltaMs);
      if (now >= cursor.cooldownUntil) {
        setState(scene, cursor, STATES.ACQUIRE_TARGET);
      }
    }
  }

  function setState(scene, cursor, state) {
    cursor.state = state;
    cursor.stateStartedAt = scene.time.now;
  }

  function clickTarget(scene, cursor, stats) {
    if (!cursor.target || !cursor.target.active) {
      return;
    }

    ARENA.CursorAttack.attack(scene, cursor.target.x, cursor.target.y, stats, {
      helper: true,
      damage: stats.helperClickDamage,
      radius: stats.helperClickRadius
    });
    cursor.clickFlashUntil = scene.time.now + ARENA.BALANCE_CONFIG.feedback.cursorFlashMs;
  }

  function chooseRetreat(scene, cursor, stats) {
    var awayAngle = cursor.target && cursor.target.active ? Math.atan2(cursor.y - cursor.target.y, cursor.x - cursor.target.x) : scene.time.now * 0.001;
    var jitter = (Math.random() - 0.5) * 0.75;
    var targetX = cursor.x + Math.cos(awayAngle + jitter) * stats.helperRetreatDistance;
    var targetY = cursor.y + Math.sin(awayAngle + jitter) * stats.helperRetreatDistance;
    cursor.retreatX = clamp(targetX, 28, ARENA.BALANCE_CONFIG.canvas.width - 28);
    cursor.retreatY = clamp(targetY, 28, ARENA.BALANCE_CONFIG.canvas.height - 28);
    cursor.target = null;
    chooseWanderPoint(scene, cursor, stats);
  }

  function wander(scene, cursor, index, stats, deltaMs) {
    if (distance(cursor.x, cursor.y, cursor.wanderX, cursor.wanderY) <= 8) {
      chooseWanderPoint(scene, cursor, stats, index);
    }
    moveToward(cursor, cursor.wanderX, cursor.wanderY, stats.helperWanderSpeed, deltaMs);
  }

  function chooseWanderPoint(scene, cursor, stats, index) {
    var angle = scene.time.now * 0.0013 + (index || 0) * 2.1 + Math.random() * Math.PI;
    var radius = stats.helperWanderRadius * (0.45 + Math.random() * 0.55);
    cursor.wanderX = clamp(scene.core.x + Math.cos(angle) * radius, 34, ARENA.BALANCE_CONFIG.canvas.width - 34);
    cursor.wanderY = clamp(scene.core.y + Math.sin(angle) * radius, 34, ARENA.BALANCE_CONFIG.canvas.height - 34);
  }

  function moveToward(cursor, x, y, speed, deltaMs) {
    var dx = x - cursor.x;
    var dy = y - cursor.y;
    var total = Math.sqrt(dx * dx + dy * dy);
    var step = speed * deltaMs / 1000;

    if (total <= step || total === 0) {
      cursor.x = x;
      cursor.y = y;
      return;
    }

    cursor.x += dx / total * step;
    cursor.y += dy / total * step;
  }

  function drawCursor(cursor) {
    cursor.graphic.clear();
    var activeClick = cursor.graphic.scene.time.now < cursor.clickFlashUntil;
    var scale = activeClick ? 1.08 : 1;
    cursor.graphic.lineStyle(activeClick ? 3 : 2, activeClick ? 0xd82626 : 0x1f1f1f, 0.85);
    cursor.graphic.fillStyle(activeClick ? 0xffe6e6 : 0xffffff, 0.86);
    cursor.graphic.beginPath();
    cursor.graphic.moveTo(cursor.x, cursor.y);
    cursor.graphic.lineTo(cursor.x + 11 * scale, cursor.y + 26 * scale);
    cursor.graphic.lineTo(cursor.x + 17 * scale, cursor.y + 15 * scale);
    cursor.graphic.lineTo(cursor.x + 29 * scale, cursor.y + 13 * scale);
    cursor.graphic.closePath();
    cursor.graphic.fillPath();
    cursor.graphic.strokePath();
  }

  function nearestEnemy(scene, x, y) {
    return scene.enemies.filter(function (enemy) {
      return enemy.active;
    }).sort(function (a, b) {
      return distance(x, y, a.x, a.y) - distance(x, y, b.x, b.y);
    })[0] || null;
  }

  function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  ARENA.HelperCursors = {
    STATES: STATES,
    create: create,
    update: update
  };
})();

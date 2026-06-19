(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  function create(scene) {
    return {
      cursors: [],
      cooldownMs: 0,
      scene: scene
    };
  }

  function update(system, stats, deltaMs) {
    var scene = system.scene;
    syncCursors(system, stats.helperCursors);
    system.cooldownMs -= deltaMs;

    system.cursors.forEach(function (cursor, index) {
      var target = nearestEnemy(scene, cursor.x, cursor.y);
      if (target) {
        cursor.target = target;
        cursor.x += (target.x - cursor.x) * stats.helperMoveSpeed;
        cursor.y += (target.y - cursor.y) * stats.helperMoveSpeed;
      } else {
        var angle = scene.time.now * 0.001 + index;
        cursor.x = scene.core.x + Math.cos(angle) * 80;
        cursor.y = scene.core.y + Math.sin(angle) * 80;
      }

      drawCursor(cursor);
    });

    if (system.cooldownMs <= 0 && system.cursors.length > 0) {
      system.cooldownMs += stats.helperClickIntervalMs;
      system.cursors.forEach(function (cursor) {
        if (cursor.target && cursor.target.active) {
          ARENA.CursorAttack.attack(scene, cursor.x, cursor.y, stats, {
            helper: true,
            damage: stats.helperClickDamage,
            radius: stats.helperClickRadius
          });
          cursor.clickFlashUntil = scene.time.now + ARENA.BALANCE_CONFIG.feedback.cursorFlashMs;
        }
      });
    }
  }

  function syncCursors(system, desiredCount) {
    while (system.cursors.length < desiredCount) {
      system.cursors.push(createCursor(system.scene));
    }

    while (system.cursors.length > desiredCount) {
      system.cursors.pop().graphic.destroy();
    }
  }

  function createCursor(scene) {
    var graphic = scene.add.graphics();
    return {
      x: scene.core.x,
      y: scene.core.y,
      target: null,
      clickFlashUntil: 0,
      graphic: graphic
    };
  }

  function drawCursor(cursor) {
    cursor.graphic.clear();
    var activeClick = cursor.graphic.scene.time.now < cursor.clickFlashUntil;
    cursor.graphic.lineStyle(activeClick ? 3 : 2, activeClick ? 0xd82626 : 0x1f1f1f, 0.85);
    cursor.graphic.fillStyle(activeClick ? 0xffe6e6 : 0xffffff, 0.86);
    cursor.graphic.beginPath();
    cursor.graphic.moveTo(cursor.x, cursor.y);
    cursor.graphic.lineTo(cursor.x + 11, cursor.y + 26);
    cursor.graphic.lineTo(cursor.x + 17, cursor.y + 15);
    cursor.graphic.lineTo(cursor.x + 29, cursor.y + 13);
    cursor.graphic.closePath();
    cursor.graphic.fillPath();
    cursor.graphic.strokePath();
  }

  function nearestEnemy(scene, x, y) {
    return scene.enemies.filter(function (enemy) {
      return enemy.active;
    }).sort(function (a, b) {
      return Phaser.Math.Distance.Between(x, y, a.x, a.y) - Phaser.Math.Distance.Between(x, y, b.x, b.y);
    })[0] || null;
  }

  ARENA.HelperCursors = {
    create: create,
    update: update
  };
})();

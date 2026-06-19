(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function create(scene) {
    return {
      scene: scene,
      decals: []
    };
  }

  function add(system, skin, x, y, scale) {
    var decal = skin.decal;
    if (!decal || !decal.enabled) {
      return;
    }

    var scene = system.scene;
    var graphics = scene.add.graphics();
    var radius = (decal.radius || CONFIG.backgroundEffects.defaultRadius) * scale;
    var alpha = decal.alpha || CONFIG.backgroundEffects.defaultAlpha;
    graphics.setDepth(-10);

    if (decal.type === "scorch") {
      graphics.fillStyle(decal.color, alpha);
      graphics.fillCircle(x, y, radius);
      graphics.lineStyle(CONFIG.backgroundEffects.lineWidth, decal.color, alpha * 1.4);
      graphics.strokeCircle(x, y, radius * 1.25);
    } else if (decal.type === "cracks") {
      graphics.lineStyle(CONFIG.backgroundEffects.lineWidth, decal.color, alpha * 1.8);
      for (var index = 0; index < decal.lines; index += 1) {
        var angle = (Math.PI * 2 * index) / decal.lines + Phaser.Math.FloatBetween(-0.25, 0.25);
        var length = Phaser.Math.Between(radius * 0.45, radius);
        graphics.lineBetween(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      }
    } else if (decal.type === "burn") {
      graphics.lineStyle(CONFIG.backgroundEffects.lineWidth, decal.color, alpha * 1.8);
      graphics.strokeCircle(x, y, radius * 0.55);
      graphics.lineBetween(x - radius, y, x + radius, y);
      graphics.lineBetween(x, y - radius * 0.6, x, y + radius * 0.6);
    } else if (decal.type === "pixels" || decal.type === "paper") {
      graphics.fillStyle(decal.color, alpha);
      for (var block = 0; block < decal.blocks; block += 1) {
        graphics.fillRect(x + Phaser.Math.Between(-radius, radius), y + Phaser.Math.Between(-radius, radius), Math.max(2, radius * 0.22), Math.max(2, radius * 0.22));
      }
    } else if (decal.type === "puncture") {
      graphics.lineStyle(CONFIG.backgroundEffects.lineWidth, decal.color, alpha * 1.8);
      graphics.strokeCircle(x, y, radius * 0.3);
      for (var line = 0; line < decal.lines; line += 1) {
        var lineAngle = (Math.PI * 2 * line) / decal.lines;
        graphics.lineBetween(x, y, x + Math.cos(lineAngle) * radius, y + Math.sin(lineAngle) * radius);
      }
    }

    system.decals.push(graphics);
    scene.effectCounts.backgroundDecals = (scene.effectCounts.backgroundDecals || 0) + 1;

    while (system.decals.length > CONFIG.backgroundEffects.maxDecals) {
      system.decals.shift().destroy();
    }

    scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: CONFIG.backgroundEffects.fadeMs,
      onComplete: function () {
        remove(system.decals, graphics);
        graphics.destroy();
      }
    });
  }

  function remove(list, item) {
    var index = list.indexOf(item);
    if (index >= 0) {
      list.splice(index, 1);
    }
  }

  function clear(system) {
    system.decals.forEach(function (decal) {
      decal.destroy();
    });
    system.decals = [];
  }

  ARENA.BackgroundEffects = {
    create: create,
    add: add,
    clear: clear
  };
})();

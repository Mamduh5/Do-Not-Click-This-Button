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
    var fadeMs = decal.fadeMs || CONFIG.backgroundEffects.fadeMs;
    graphics.setDepth(-10);

    if (decal.type === "scorch") {
      graphics.fillStyle(decal.color, alpha);
      graphics.fillCircle(x, y, radius);
      graphics.lineStyle(CONFIG.backgroundEffects.lineWidth, decal.color, alpha * 1.4);
      graphics.strokeCircle(x, y, radius * 1.25);
    } else if (decal.type === "cracks") {
      graphics.lineStyle((decal.lineWidth || CONFIG.backgroundEffects.lineWidth) * scale, decal.color, alpha * 1.8);
      for (var index = 0; index < decal.lines; index += 1) {
        var angle = (Math.PI * 2 * index) / decal.lines + Phaser.Math.FloatBetween(-0.25, 0.25);
        var length = Phaser.Math.Between(radius * 0.45, radius);
        var endX = x + Math.cos(angle) * length;
        var endY = y + Math.sin(angle) * length;
        graphics.lineBetween(x, y, endX, endY);
        if (Math.random() < (decal.branchChance || 0)) {
          var branchAngle = angle + Phaser.Math.FloatBetween(-0.7, 0.7);
          graphics.lineBetween(endX, endY, endX + Math.cos(branchAngle) * length * 0.32, endY + Math.sin(branchAngle) * length * 0.32);
        }
      }
      scene.effectCounts.backgroundCracks = (scene.effectCounts.backgroundCracks || 0) + 1;
    } else if (decal.type === "burn") {
      graphics.lineStyle(CONFIG.backgroundEffects.lineWidth, decal.color, alpha * 1.8);
      graphics.strokeCircle(x, y, radius * 0.55);
      graphics.lineBetween(x - radius, y, x + radius, y);
      graphics.lineBetween(x, y - radius * 0.6, x, y + radius * 0.6);
    } else if (decal.type === "pixels") {
      var grid = decal.gridSize || 4;
      graphics.fillStyle(decal.color, alpha);
      for (var block = 0; block < decal.blocks; block += 1) {
        var size = Math.max(2, radius / grid);
        var offsetX = Phaser.Math.Between(-grid, grid) * size * 0.5;
        var offsetY = Phaser.Math.Between(-grid, grid) * size * 0.5;
        graphics.fillRect(x + offsetX, y + offsetY, size, size);
      }
      scene.effectCounts.backgroundPixels = (scene.effectCounts.backgroundPixels || 0) + 1;
    } else if (decal.type === "paper") {
      graphics.fillStyle(decal.color, alpha);
      for (var scrap = 0; scrap < decal.blocks; scrap += 1) {
        graphics.fillRect(x + Phaser.Math.Between(-radius, radius), y + Phaser.Math.Between(-radius, radius), Math.max(2, radius * 0.22), Math.max(2, radius * 0.22));
      }
    } else if (decal.type === "puncture") {
      graphics.lineStyle(CONFIG.backgroundEffects.lineWidth, decal.color, alpha * 1.8);
      graphics.strokeCircle(x, y, radius * 0.3);
      for (var line = 0; line < decal.lines; line += 1) {
        var lineAngle = (Math.PI * 2 * line) / decal.lines;
        graphics.lineBetween(x, y, x + Math.cos(lineAngle) * radius, y + Math.sin(lineAngle) * radius);
      }
    } else if (decal.type === "arrowRain") {
      graphics.lineStyle(Math.max(1, CONFIG.backgroundEffects.lineWidth * 0.8), decal.color, alpha * 1.8);
      for (var puncture = 0; puncture < decal.punctures; puncture += 1) {
        var punctureX = x + Phaser.Math.Between(-radius, radius);
        var punctureY = y + Phaser.Math.Between(-radius, radius);
        graphics.strokeCircle(punctureX, punctureY, Math.max(2, radius * 0.09));
      }
      for (var arrow = 0; arrow < decal.arrows; arrow += 1) {
        var arrowX = x + Phaser.Math.Between(-radius, radius);
        var arrowY = y + Phaser.Math.Between(-radius, radius);
        var angle = Phaser.Math.FloatBetween(-1.25, -0.35);
        graphics.lineBetween(arrowX, arrowY, arrowX + Math.cos(angle) * radius * 0.52, arrowY + Math.sin(angle) * radius * 0.52);
      }
      scene.effectCounts.backgroundArrows = (scene.effectCounts.backgroundArrows || 0) + 1;
    }

    system.decals.push(graphics);
    scene.effectCounts.backgroundDecals = (scene.effectCounts.backgroundDecals || 0) + 1;

    while (system.decals.length > CONFIG.backgroundEffects.maxDecals) {
      system.decals.shift().destroy();
    }

    scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: fadeMs,
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

(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function showImpact(scene, x, y, radius, hit, scale) {
    var color = hit ? 0x171717 : 0x7f8a90;
    var ring = scene.add.circle(x, y, radius, color, 0.08);
    ring.setStrokeStyle(Math.max(2, 3 * scale), color, hit ? 0.9 : 0.42);
    scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: hit ? 1.35 : 0.9,
      duration: CONFIG.feedback.impactMs,
      onComplete: function () {
        ring.destroy();
      }
    });
  }

  function showHitText(scene, text, x, y, color) {
    var label = scene.add.text(x, y - 12, text, {
      fontFamily: "Consolas, monospace",
      fontSize: "12px",
      color: "#" + color.toString(16).padStart(6, "0"),
      fontStyle: "bold"
    }).setOrigin(0.5);

    scene.tweens.add({
      targets: label,
      y: y - 34,
      alpha: 0,
      duration: CONFIG.feedback.floatingTextMs,
      onComplete: function () {
        label.destroy();
      }
    });
  }

  function showSplatter(scene, x, y, scale) {
    var count = Math.max(1, Math.floor(CONFIG.feedback.splatterParticleCount * scale));

    for (var index = 0; index < count; index += 1) {
      var particle = scene.add.circle(x, y, Phaser.Math.Between(2, 5), 0xd82626, 0.75);
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var distance = Phaser.Math.Between(12, 42) * scale;
      scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.35,
        duration: CONFIG.feedback.splatterMs,
        onComplete: function () {
          particle.destroy();
        }
      });
    }
  }

  ARENA.ImpactEffects = {
    showImpact: showImpact,
    showHitText: showHitText,
    showSplatter: showSplatter
  };
})();

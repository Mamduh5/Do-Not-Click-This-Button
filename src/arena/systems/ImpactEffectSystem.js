(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function mark(scene, type) {
    scene.effectCounts[type] = (scene.effectCounts[type] || 0) + 1;
  }

  function showImpact(scene, x, y, radius, hit, scale, helper) {
    mark(scene, hit ? "hitImpact" : "missImpact");
    if (ARENA.ClickEffectSkins) {
      ARENA.ClickEffectSkins.drawImpact(scene, x, y, {
        hit: hit,
        scale: scale,
        helper: helper
      });
    }
    var color = hit ? 0x171717 : 0x7f8a90;
    showCursorFlash(scene, x, y, color, scale);

    if (!hit) {
      mark(scene, "missVariant");
    }
  }

  function showCursorFlash(scene, x, y, color, scale) {
    var size = CONFIG.feedback.cursorFlashSize * scale;
    var flash = scene.add.graphics();
    mark(scene, "cursorFlash");
    flash.lineStyle(Math.max(1, 2 * scale), color, 0.85);
    flash.lineBetween(x - size, y, x + size, y);
    flash.lineBetween(x, y - size, x, y + size);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: CONFIG.feedback.cursorFlashMs,
      onComplete: function () {
        flash.destroy();
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

  function showHitParticles(scene, x, y, scale, color) {
    var count = Math.max(1, Math.floor(CONFIG.feedback.hitParticleCount * scale));
    mark(scene, "hitParticles");

    for (var index = 0; index < count; index += 1) {
      var particle = scene.add.circle(x, y, Phaser.Math.Between(1, 3), color || 0x171717, 0.62);
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var distance = Phaser.Math.Between(6, CONFIG.feedback.hitParticleDistance) * scale;
      scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: CONFIG.feedback.impactMs,
        onComplete: function () {
          particle.destroy();
        }
      });
    }
  }

  function showSplatter(scene, x, y, scale, color) {
    var count = Math.max(1, Math.floor(CONFIG.feedback.splatterParticleCount * scale));
    mark(scene, "splatter");

    for (var index = 0; index < count; index += 1) {
      var particle = scene.add.circle(x, y, Phaser.Math.Between(2, 5), color || 0xd82626, 0.75);
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

  function showKillBurst(scene, x, y, scale) {
    var ring = scene.add.circle(x, y, 16 * scale, 0xd82626, 0.08);
    mark(scene, "killBurst");
    if (ARENA.ClickEffectSkins) {
      ARENA.ClickEffectSkins.drawImpact(scene, x, y, {
        hit: true,
        kill: true,
        scale: scale,
        silent: true,
        noDecal: true
      });
    }
    ring.setStrokeStyle(Math.max(2, 3 * scale), 0xd82626, 0.85);
    scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 2.2,
      duration: CONFIG.feedback.killRingMs,
      onComplete: function () {
        ring.destroy();
      }
    });

    if (CONFIG.feedback.screenFlashEnabled) {
      showScreenFlash(scene);
    }
  }

  function showScreenFlash(scene) {
    var flash = scene.add.rectangle(CONFIG.canvas.width / 2, CONFIG.canvas.height / 2, CONFIG.canvas.width, CONFIG.canvas.height, 0xd82626, CONFIG.feedback.comboFlashAlpha);
    mark(scene, "screenFlash");
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: CONFIG.feedback.screenFlashMs,
      onComplete: function () {
        flash.destroy();
      }
    });
  }

  function showComboPopup(scene, combo, x, y) {
    if (combo <= 1) {
      return;
    }

    var color = getComboColor(combo);
    var milestone = CONFIG.feedback.comboMilestones.indexOf(combo) >= 0;
    var label = scene.add.text(
      clamp(x, 80, CONFIG.canvas.width - 80),
      clamp(y - 44, 54, CONFIG.canvas.height - 54),
      "COMBO x" + combo + (milestone ? "!" : ""),
      {
        fontFamily: "Consolas, monospace",
        fontSize: milestone ? "22px" : "18px",
        color: "#" + color.toString(16).padStart(6, "0"),
        fontStyle: "bold",
        stroke: "#ffffff",
        strokeThickness: 3
      }
    ).setOrigin(0.5);
    var popupScale = Math.min(CONFIG.feedback.comboPopupMaxScale, CONFIG.feedback.comboPopupBaseScale + combo * 0.045);

    mark(scene, "comboPopup");
    scene.tweens.add({
      targets: label,
      y: label.y - 24,
      scale: popupScale,
      alpha: 0,
      duration: CONFIG.feedback.comboPopupMs,
      ease: "Cubic.easeOut",
      onComplete: function () {
        label.destroy();
      }
    });

    if (milestone && CONFIG.feedback.comboPulseEnabled) {
      mark(scene, "comboMilestone");
      showComboPulse(scene, color, combo);
    }
  }

  function showComboPulse(scene, color, combo) {
    var pulse = scene.add.circle(CONFIG.canvas.width / 2, 72, Math.min(90, 24 + combo * 2), color, CONFIG.feedback.comboPulseAlpha);
    pulse.setStrokeStyle(2, color, 0.42);
    scene.tweens.add({
      targets: pulse,
      alpha: 0,
      scale: 1.55,
      duration: CONFIG.feedback.comboPulseMs,
      onComplete: function () {
        pulse.destroy();
      }
    });
  }

  function getComboColor(combo) {
    var selected = CONFIG.feedback.comboColors[0].color;
    CONFIG.feedback.comboColors.forEach(function (entry) {
      if (combo >= entry.threshold) {
        selected = entry.color;
      }
    });
    return selected;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  ARENA.ImpactEffects = {
    showImpact: showImpact,
    showHitText: showHitText,
    showComboPopup: showComboPopup,
    showHitParticles: showHitParticles,
    showSplatter: showSplatter,
    showKillBurst: showKillBurst,
    showScreenFlash: showScreenFlash
  };
})();

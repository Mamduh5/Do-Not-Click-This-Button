(function () {
  "use strict";
  window.ARENA = window.ARENA || {};
  ARENA.createSoundSystem = function (state) {
    var sfx = window.ContainmentSfx, chargeStep = -1, warning = sfx.warningTracker();
    var unsubscribe = sfx.subscribe(function (settings) { state.muted = settings.muted; });
    var aliases = { clickMiss: "miss", kill: "death", coreDamage: "coreImpact" };
    function cancelCharge() { chargeStep = -1; sfx.stop("charge"); }
    return {
      unlock: sfx.unlock,
      play: function (name) {
        if (["helperClick", "comboTick", "waveClear"].indexOf(name) >= 0) { return false; }
        if (["interrupt", "coreImpact", "coreDestroyed", "bossDefeat"].indexOf(name) >= 0) { cancelCharge(); }
        return sfx.play(aliases[name] || name);
      },
      charge: function (progress) {
        var steps = SFX_CONFIG.warnings.chargeSteps, next = -1;
        steps.forEach(function (threshold, i) { if (progress >= threshold) { next = i; } });
        if (next > chargeStep) { chargeStep = next; sfx.play("charge" + (next + 1), { tag: "charge" }); }
      },
      cancelCharge: cancelCharge,
      pressure: function (value) {
        SFX_CONFIG.warnings.overrun.forEach(function (threshold) { warning("pressure" + threshold, value, threshold, "overrun"); });
      },
      stop: function () { sfx.stop(); chargeStep = -1; },
      destroy: function () { sfx.stop(); unsubscribe(); },
      setMuted: function (muted) { sfx.change({ muted: muted }); },
      isSupported: function () { return Boolean(window.AudioContext || window.webkitAudioContext); }
    };
  };
})();

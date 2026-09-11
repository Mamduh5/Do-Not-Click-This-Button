(function () {
  "use strict";
  window.DNC = window.DNC || {};
  DNC.createSoundSystem = function (state) {
    var sfx = window.ContainmentSfx, warning = sfx.warningTracker();
    var unsubscribe = sfx.subscribe(function (settings) { state.audioEnabled = !settings.muted; });
    return {
      unlock: sfx.unlock,
      play: function (name, options) { return sfx.play(name === "shardUpgrade" ? "upgrade" : name, options); },
      bank: function (controlled) { return sfx.play("bank", { delay: SFX_CONFIG.bankDelay[controlled ? "cashOut" : "breach"] }); },
      press: function (danger) {
        var c = DNC.BALANCE_CONFIG;
        return sfx.play(danger >= c.machine.redline ? "redPress" : danger >= c.instability.unstableAt ? "unstable" : danger >= c.instability.disturbedAt ? "strained" : "press");
      },
      danger: function (value) {
        var c = DNC.BALANCE_CONFIG;
        warning("warm", value, c.instability.disturbedAt, "danger");
        warning("hot", value, c.instability.unstableAt, "danger");
        warning("redline", value, c.machine.redline, "redline");
      },
      destroy: function () { sfx.stop(); unsubscribe(); },
      setEnabled: function (enabled) { sfx.change({ muted: !enabled }); },
      isEnabled: function () { return !sfx.settings().muted; },
      isSupported: function () { return Boolean(window.AudioContext || window.webkitAudioContext); }
    };
  };
})();

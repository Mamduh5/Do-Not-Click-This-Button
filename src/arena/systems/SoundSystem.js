(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function createSoundSystem(state) {
    var audioContext = null;
    var unlocked = false;

    function getContext() {
      if (state.muted) {
        return null;
      }

      if (!audioContext) {
        var Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) {
          return null;
        }
        audioContext = new Context();
      }

      return audioContext;
    }

    function unlock() {
      var context = getContext();
      if (!context) {
        return false;
      }

      if (context.state === "suspended" && context.resume) {
        context.resume();
      }

      unlocked = true;
      return true;
    }

    function play(name) {
      var context = getContext();
      var volume = CONFIG.audio[name + "Volume"] || 0.12;

      if (!context || state.muted || !unlocked) {
        return false;
      }

      var oscillator = context.createOscillator();
      var gain = context.createGain();
      var now = context.currentTime;
      var tones = {
        attack: [520, 760, 0.055, "square"],
        hit: [170, 90, 0.05, "sawtooth"],
        destroy: [320, 760, 0.09, "triangle"],
        upgrade: [620, 980, 0.13, "sine"],
        coreDamage: [120, 48, 0.18, "sawtooth"],
        wave: [280, 520, 0.16, "square"]
      };
      var tone = tones[name] || tones.hit;

      oscillator.type = tone[3];
      oscillator.frequency.setValueAtTime(tone[0], now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, tone[1]), now + tone[2]);
      gain.gain.setValueAtTime(CONFIG.audio.masterVolume * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tone[2]);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + tone[2]);
      return true;
    }

    function setMuted(muted) {
      state.muted = muted;
    }

    return {
      unlock: unlock,
      play: play,
      setMuted: setMuted,
      isSupported: function () {
        return Boolean(window.AudioContext || window.webkitAudioContext);
      }
    };
  }

  ARENA.createSoundSystem = createSoundSystem;
})();

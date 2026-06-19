(function () {
  "use strict";

  window.DNC = window.DNC || {};

  function createSoundSystem(state) {
    var config = DNC.BALANCE_CONFIG.audio;
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    var context = null;
    var unlocked = false;
    var enabled = typeof state.audioEnabled === "boolean" ? state.audioEnabled : config.enabledByDefault;

    function setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      state.audioEnabled = enabled;
    }

    function ensureContext() {
      if (!AudioContextClass) {
        return null;
      }

      if (!context) {
        try {
          context = new AudioContextClass();
        } catch (error) {
          context = null;
        }
      }

      return context;
    }

    function unlock() {
      var audioContext = ensureContext();

      unlocked = true;
      if (audioContext && audioContext.state === "suspended" && audioContext.resume) {
        audioContext.resume().catch(function () {});
      }
    }

    function play(name, options) {
      var audioContext;
      var sound;
      var now;
      var oscillator;
      var gain;
      var volume;

      if (!enabled || !unlocked) {
        return false;
      }

      audioContext = ensureContext();
      sound = config.sounds[name];

      if (!audioContext || !sound) {
        return false;
      }

      now = audioContext.currentTime;
      volume = (options && options.volume) || config[name + "Volume"] || config.clickVolume;

      try {
        oscillator = audioContext.createOscillator();
        gain = audioContext.createGain();
        oscillator.type = sound.type;
        oscillator.frequency.setValueAtTime(sound.frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, sound.endFrequency), now + sound.durationMs / 1000);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, config.masterVolume * volume), now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + sound.durationMs / 1000);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + sound.durationMs / 1000 + 0.02);
        return true;
      } catch (error) {
        return false;
      }
    }

    return {
      unlock: unlock,
      play: play,
      setEnabled: setEnabled,
      isEnabled: function () {
        return enabled;
      },
      isSupported: function () {
        return Boolean(AudioContextClass);
      }
    };
  }

  DNC.createSoundSystem = createSoundSystem;
})();

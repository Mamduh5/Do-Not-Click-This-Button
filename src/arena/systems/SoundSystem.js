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
      var tone = CONFIG.audio.sounds[name] || CONFIG.audio.sounds.hit;

      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, tone.endFrequency), now + tone.durationSeconds);
      gain.gain.setValueAtTime(CONFIG.audio.masterVolume * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tone.durationSeconds);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + tone.durationSeconds);
      return true;
    }

    function playTone(context, tone, delaySeconds) {
      var oscillator = context.createOscillator();
      var gain = context.createGain();
      var now = context.currentTime;
      var startAt = now + (delaySeconds || tone.delaySeconds || 0);

      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.frequency, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, tone.endFrequency), startAt + tone.durationSeconds);
      gain.gain.setValueAtTime(CONFIG.audio.masterVolume * tone.volume, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + tone.durationSeconds);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + tone.durationSeconds);
    }

    function playClickSkin(skinId) {
      var context = getContext();
      var skin = ARENA.ClickEffectSkins.get(skinId);
      var tone = skin.sound;

      if (!context || state.muted || !unlocked || !tone) {
        return false;
      }

      playTone(context, tone, 0);

      if (skin.thunkSound) {
        playTone(context, skin.thunkSound, skin.thunkSound.delaySeconds);
      }

      return true;
    }

    function setMuted(muted) {
      state.muted = muted;
    }

    return {
      unlock: unlock,
      play: play,
      playClickSkin: playClickSkin,
      setMuted: setMuted,
      isSupported: function () {
        return Boolean(window.AudioContext || window.webkitAudioContext);
      }
    };
  }

  ARENA.createSoundSystem = createSoundSystem;
})();

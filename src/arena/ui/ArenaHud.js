(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  function createArenaHud(options) {
    var elements = {
      energy: document.getElementById("arenaEnergy"),
      wave: document.getElementById("arenaWave"),
      defeated: document.getElementById("arenaDefeated"),
      combo: document.getElementById("arenaCombo"),
      log: document.getElementById("arenaLog"),
      skinSelect: document.getElementById("arenaSkinSelect"),
      enemySkinSelect: document.getElementById("arenaEnemySkinSelect"),
      backgroundSkinSelect: document.getElementById("arenaBackgroundSkinSelect"),
      mute: document.getElementById("arenaMuteBtn"),
      reset: document.getElementById("arenaResetBtn")
    };

    var copy = ARENA.UI_CONFIG.copy;
    var resetUntil = 0;
    document.documentElement.style.setProperty("--ui-transition", ARENA.UI_CONFIG.transitionMs + "ms");
    function element(id) { return document.getElementById("arena" + id); }
    element("NextWaveBtn").addEventListener("click", options.onNextWave);
    element("PauseBtn").addEventListener("click", options.onPause);
    element("ResumeBtn").addEventListener("click", options.onPause);
    element("PulseBtn").addEventListener("click", options.onPulse);
    elements.mute.addEventListener("click", options.onToggleMute);
    elements.reset.addEventListener("click", function () {
      if (Date.now() < resetUntil) { resetUntil = 0; options.onReset(); }
      else {
        resetUntil = Date.now() + ARENA.UI_CONFIG.resetConfirmMs;
        elements.reset.textContent = copy.resetConfirm;
      }
    });
    elements.skinSelect.addEventListener("change", function () {
      options.onSetClickSkin(elements.skinSelect.value);
    });
    elements.enemySkinSelect.addEventListener("change", function () {
      options.onSetEnemySkin(elements.enemySkinSelect.value);
    });
    elements.backgroundSkinSelect.addEventListener("change", function () {
      options.onSetBackgroundSkin(elements.backgroundSkinSelect.value);
    });

    ARENA.CLICK_EFFECT_SKINS.forEach(function (skin) {
      var option = document.createElement("option");
      option.value = skin.id;
      option.textContent = skin.name;
      elements.skinSelect.appendChild(option);
    });
    ARENA.ENEMY_SKINS.forEach(function (skin) {
      var option = document.createElement("option");
      option.value = skin.id;
      option.textContent = skin.name;
      elements.enemySkinSelect.appendChild(option);
    });
    ARENA.BACKGROUND_SKINS.forEach(function (skin) {
      var option = document.createElement("option");
      option.value = skin.id;
      option.textContent = skin.name;
      elements.backgroundSkinSelect.appendChild(option);
    });

    function update(state, combo, scene) {
      elements.energy.textContent = ARENA.formatNumber(state.energy);
      elements.wave.textContent = ARENA.formatNumber(state.wave);
      elements.defeated.textContent = ARENA.formatNumber(state.totalDefeated);
      elements.combo.textContent = String(combo);
      if (Date.now() >= resetUntil) { elements.reset.textContent = copy.reset; }
      var definition = ARENA.Waves.getDefinition(state.wave);
      var cleared = state.wavePhase === "cleared";
      var paused = scene.paused;
      element("Phase").textContent = paused ? copy.paused : cleared ? copy.cleared : copy.active;
      element("WaveProgress").textContent = state.waveKills + " / " + definition.target;
      element("WaveTitle").textContent = definition.title;
      element("WaveHint").textContent = definition.hint;
      element("RewardPreview").textContent = "+" + definition.clearReward + " ENERGY ON CLEAR";
      element("WaveFill").style.width = (state.waveKills / definition.target * 100) + "%";
      element("OperationOverlay").hidden = !cleared && !paused;
      element("ResultKicker").textContent = paused ? copy.paused : copy.cleared;
      element("ResultTitle").textContent = paused ? "Take a breather." : "Wave " + state.wave + " secured.";
      element("ResultHint").textContent = paused ? copy.pauseHint : copy.clearHint;
      element("ResultReward").textContent = paused ? "" : "+" + definition.clearReward + " CLEAR BONUS";
      element("NextWaveBtn").hidden = !cleared;
      element("NextWaveBtn").textContent = ARENA.Waves.getDefinition(state.wave + 1).champion ? copy.championWave : copy.nextWave;
      element("ResumeBtn").hidden = !paused;
      element("PauseBtn").disabled = cleared;
      element("PauseBtn").textContent = paused ? "RESUME [P]" : "PAUSE [P]";
      element("PauseBtn").setAttribute("aria-pressed", String(paused));
      element("PulseBtn").disabled = paused || cleared || state.pulseCharge < ARENA.BALANCE_CONFIG.operations.pulseMaxCharge;
      element("PulseLabel").textContent = state.pulseCharge >= ARENA.BALANCE_CONFIG.operations.pulseMaxCharge ? copy.pulseReady : copy.pulseCharging;
      element("PulseFill").style.width = (state.pulseCharge / ARENA.BALANCE_CONFIG.operations.pulseMaxCharge * 100) + "%";
      element("PulseHint").textContent = "Manual kills charge a " + scene.stats.pulseRadius + "px burst at the room center.";
      element("ChainBonus").textContent = "CHAIN BONUS x" + ARENA.Waves.comboMultiplier(combo).toFixed(2);
      element("ChainFill").style.width = (combo ? Math.max(0, Math.min(1, (scene.comboExpiresAt - scene.time.now) / ARENA.BALANCE_CONFIG.cursor.comboWindowMs)) * 100 : 0) + "%";
      element("BestCombo").textContent = "BEST CHAIN " + state.bestCombo;
      element("Loadout").textContent = "DMG " + ARENA.formatNumber(scene.stats.clickDamage) + " / REACH " + scene.stats.clickRadius + " / HELPERS " + scene.stats.helperCursors;
      elements.mute.textContent = "Sound: " + (state.muted ? "OFF" : "ON");
      elements.skinSelect.value = state.activeClickSkin;
      elements.enemySkinSelect.value = state.activeEnemySkin;
      elements.backgroundSkinSelect.value = state.activeBackgroundSkin;

      Array.from(elements.skinSelect.options).forEach(function (option) {
        option.disabled = !state.unlockedClickSkins[option.value];
      });
      Array.from(elements.enemySkinSelect.options).forEach(function (option) {
        option.disabled = !state.unlockedEnemySkins[option.value];
      });
      Array.from(elements.backgroundSkinSelect.options).forEach(function (option) {
        option.disabled = !state.unlockedBackgroundSkins[option.value];
      });
    }

    function log(message) {
      elements.log.textContent = message;
    }

    return {
      update: update,
      log: log
    };
  }

  ARENA.createArenaHud = createArenaHud;
})();

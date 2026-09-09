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
    element("ShopNextWaveBtn").addEventListener("click", options.onNextWave);
    element("ReviewUpgradesBtn").addEventListener("click", function () {
      element("Shop").scrollIntoView({ block: "start" });
      element("ShopTitle").focus({ preventScroll: true });
    });
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
      var failed = state.wavePhase === "failed";
      var clearReward = cleared && state.endless ? state.endless.lastClearReward : state.wave <= state.highestWaveCleared ? 0 : definition.clearReward;
      var paused = scene.paused;
      var next = ARENA.Waves.getDefinition(state.wave + 1);
      var activeEnemies = scene.enemies.filter(function (enemy) { return enemy.active; });
      var champion = activeEnemies.find(function (enemy) { return enemy.roleId === "champion"; });
      var pulseReady = state.pulseCharge >= ARENA.BALANCE_CONFIG.operations.pulseMaxCharge;
      document.querySelector(".arena-stage").dataset.phase = paused ? "paused" : cleared ? "cleared" : champion ? "champion" : "active";
      element("Phase").textContent = failed ? "DEFENSE LOST" : paused ? copy.paused : cleared ? copy.cleared : champion ? "GIGABOSS ENCOUNTER" : copy.active;
      element("WaveProgress").textContent = state.waveKills + " / " + definition.target;
      element("WaveTitle").textContent = definition.title;
      element("WaveHint").textContent = cleared ? "Next: " + next.title + " / " + next.target + " targets" + (next.champion ? " / Champion finale" : "") : champion ? "Interrupt the charged strike to protect your Core." : definition.hint;
      element("RewardPreview").textContent = "+" + ARENA.formatNumber(clearReward) + (cleared ? " ENERGY SECURED" : " ENERGY ON CLEAR");
      element("WaveFill").style.width = (state.waveKills / definition.target * 100) + "%";
      element("OperationOverlay").hidden = !paused && (!cleared || scene.time.now < scene.clearRevealAt);
      element("ResultKicker").textContent = paused ? copy.paused : copy.cleared;
      element("ResultTitle").textContent = paused ? "Take a breather." : "Wave " + state.wave + " secured.";
      element("ResultHint").textContent = paused ? copy.pauseHint : copy.clearHint;
      element("ResultReward").textContent = paused ? "" : "+" + ARENA.formatNumber(clearReward) + " CLEAR BONUS";
      element("ReviewUpgradesBtn").hidden = !cleared;
      element("ShopBreak").hidden = !cleared;
      element("ShopBudget").textContent = ARENA.formatNumber(state.energy) + " ENERGY AVAILABLE";
      element("ShopNextWaveBtn").textContent = "RELEASE WAVE " + next.wave;
      element("NextWaveBtn").hidden = !cleared;
      element("NextWaveBtn").textContent = ARENA.Waves.getDefinition(state.wave + 1).champion ? copy.championWave : copy.nextWave;
      element("ResumeBtn").hidden = !paused;
      element("PauseBtn").disabled = cleared || failed;
      element("PauseBtn").textContent = paused ? "RESUME [P]" : "PAUSE [P]";
      element("PauseBtn").setAttribute("aria-pressed", String(paused));
      element("PulseBtn").disabled = failed || paused || cleared || !activeEnemies.length || !pulseReady;
      element("PulseBtn").classList.toggle("pulse-ready", pulseReady && !cleared && !paused && activeEnemies.length > 0);
      element("PulseLabel").textContent = cleared ? "CHARGE SAVED" : pulseReady ? (activeEnemies.length ? copy.pulseReady : "AWAITING TARGETS") : copy.pulseCharging;
      element("PulseFill").style.width = (state.pulseCharge / ARENA.BALANCE_CONFIG.operations.pulseMaxCharge * 100) + "%";
      element("PulseHint").textContent = cleared ? "Your charge carries into the next wave." : pulseReady ? "Room-wide burst. Hits every target; tougher enemies may survive." : Math.ceil((ARENA.BALANCE_CONFIG.operations.pulseMaxCharge - state.pulseCharge) / ARENA.BALANCE_CONFIG.operations.manualKillCharge) + " manual kills to a room-wide burst.";
      element("ChainBonus").textContent = combo > 1 ? "+" + Math.round((ARENA.Waves.comboMultiplier(combo) - 1) * 100) + "% KILL ENERGY" : "CHAIN KILLS FOR BONUS ENERGY";
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

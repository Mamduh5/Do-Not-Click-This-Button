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
    var logUntil = 0;
    document.documentElement.style.setProperty("--ui-transition", ARENA.UI_CONFIG.transitionMs + "ms");
    function element(id) { return document.getElementById("arena" + id); }
    function bindCombatButton(id, action) {
      var button = element(id);
      var touchHandled = false;
      button.addEventListener("pointerdown", function (event) {
        touchHandled = event.pointerType !== "mouse";
        if (!touchHandled || button.disabled || event.button !== 0) { return; }
        // Browser clicks may disappear for a secondary finger during gameplay.
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        action();
      });
      button.addEventListener("click", function (event) {
        if (!touchHandled || event.detail === 0) { action(); }
      });
    }
    bindCombatButton("ShopResumeBtn", options.onPause);
    bindCombatButton("ReviewUpgradesBtn", function () {
      options.onReviewUpgrades();
      element("Shop").scrollIntoView({ block: "start" });
      element("ShopTitle").focus({ preventScroll: true });
    });
    bindCombatButton("PauseBtn", options.onPause);
    bindCombatButton("PulseBtn", options.onPulse);
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
      elements.log.hidden = Date.now() >= logUntil;
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
      var next = ARENA.Waves.getDefinition(state.endless.trainingBoss || state.wave + 1);
      var countdown = (scene.waveSystem.transitionRemainingMs / 1000).toFixed(1);
      var transitionHint = (next.champion ? "Gigaboss arriving in " : "Next wave in ") + countdown + "s";
      var activeEnemies = scene.enemies.filter(function (enemy) { return enemy.active; });
      var champion = activeEnemies.find(function (enemy) { return enemy.roleId === "champion"; });
      var pulseReady = state.pulseCharge >= ARENA.BALANCE_CONFIG.operations.pulseMaxCharge;
      document.querySelector(".arena-stage").dataset.phase = failed ? "failed" : paused ? "paused" : cleared ? "cleared" : champion ? "champion" : "active";
      document.querySelector(".arena-stage").dataset.incomingBoss = String(cleared && next.champion);
      element("Phase").textContent = failed ? "DEFENSE LOST" : paused ? copy.paused : cleared ? copy.cleared : champion ? "GIGABOSS ENCOUNTER" : copy.active;
      element("WaveProgress").textContent = state.waveKills + " / " + definition.target;
      element("WaveTitle").textContent = definition.title;
      element("WaveHint").textContent = cleared ? "Next: " + next.title + " / " + (paused ? "Countdown paused" : transitionHint) : "";
      element("RewardPreview").textContent = failed ? "CLEAR BONUS NOT EARNED" : "+" + ARENA.formatNumber(clearReward) + (cleared ? " ENERGY SECURED" : " ENERGY ON CLEAR");
      element("WaveFill").style.width = (state.waveKills / definition.target * 100) + "%";
      element("OperationOverlay").hidden = !paused && (!cleared || scene.time.now < scene.clearRevealAt);
      element("ResultKicker").textContent = paused ? copy.paused : cleared && next.champion ? "GIGABOSS INCOMING" : copy.cleared;
      element("ResultTitle").textContent = paused ? "Take a breather." : "Wave " + state.wave + " secured.";
      element("ResultHint").textContent = paused ? copy.pauseHint : transitionHint + ". " + copy.clearHint;
      element("ResultReward").textContent = paused ? "" : "+" + ARENA.formatNumber(clearReward) + " CLEAR BONUS";
      element("ReviewUpgradesBtn").hidden = !cleared;
      element("ShopBreak").hidden = !paused;
      element("ShopBudget").textContent = ARENA.formatNumber(state.energy) + " ENERGY AVAILABLE";
      element("PauseBtn").disabled = failed;
      element("PauseBtn").textContent = paused ? "RESUME [P]" : "PAUSE [P]";
      element("PauseBtn").setAttribute("aria-pressed", String(paused));
      element("PulseBtn").disabled = failed || paused || cleared || !activeEnemies.length || !pulseReady;
      element("PulseBtn").classList.toggle("pulse-ready", pulseReady && !failed && !cleared && !paused && activeEnemies.length > 0);
      element("PulseLabel").textContent = failed || cleared ? "CHARGE SAVED" : pulseReady ? (activeEnemies.length ? copy.pulseReady : "AWAITING TARGETS") : copy.pulseCharging;
      element("PulseFill").style.width = (state.pulseCharge / ARENA.BALANCE_CONFIG.operations.pulseMaxCharge * 100) + "%";
      element("PulseHint").textContent = failed ? "Charge retained" : cleared ? "Charge retained" : pulseReady ? "All targets" : Math.ceil((ARENA.BALANCE_CONFIG.operations.pulseMaxCharge - state.pulseCharge) / ARENA.BALANCE_CONFIG.operations.manualKillCharge) + " kills to ready";
      element("ChainBonus").textContent = combo > 1 ? "+" + Math.round((ARENA.Waves.comboMultiplier(combo) - 1) * 100) + "% KILL ENERGY" : "CHAIN ×1.00";
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
      if (/CORE HIT|CORE DESTROYED|OVERRUN|DISCHARGED|RELEASED|ROOM SECURED/.test(message)) { return; }
      logUntil = Date.now() + 1800;
      elements.log.hidden = false;
      elements.log.textContent = message;
    }

    return {
      update: update,
      log: log
    };
  }

  ARENA.createArenaHud = createArenaHud;
})();

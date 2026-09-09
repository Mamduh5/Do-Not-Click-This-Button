(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function createDefaultState() {
    return {
      version: CONFIG.saveVersion,
      energy: CONFIG.initialState.energy,
      wave: CONFIG.initialState.wave,
      waveKills: 0,
      wavePhase: "active",
      highestWaveCleared: 0,
      bestCombo: 0,
      pulseCharge: 0,
      elapsedSeconds: CONFIG.initialState.elapsedSeconds,
      totalDefeated: CONFIG.initialState.totalDefeated,
      muted: CONFIG.initialState.muted,
      activeClickSkin: ARENA.ClickEffectSkins.getDefaultSkinId(),
      unlockedClickSkins: ARENA.ClickEffectSkins.getDefaultUnlocked(),
      activeEnemySkin: ARENA.EnemySkins.getDefaultSkinId(),
      unlockedEnemySkins: ARENA.EnemySkins.getDefaultUnlocked(),
      activeBackgroundSkin: ARENA.BackgroundSkins.getDefaultSkinId(),
      unlockedBackgroundSkins: ARENA.BackgroundSkins.getDefaultUnlocked(),
      endless: null,
      upgrades: {}
    };
  }

  function safeNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function safeInteger(value, fallback) {
    return Math.max(0, Math.floor(safeNumber(value, fallback)));
  }

  function validateState(raw) {
    var state = createDefaultState();
    var source = raw && typeof raw === "object" ? raw : {};
    var upgrades = source.upgrades && typeof source.upgrades === "object" ? source.upgrades : {};

    state.energy = Math.max(0, safeNumber(source.energy, state.energy));
    // Legacy waves measured time, not clears. Keep purchases/currency and start earned operations at wave 1.
    if (safeInteger(source.version, 0) >= 2) {
      state.wave = Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, safeInteger(source.wave, state.wave)));
      var target = ARENA.Waves.getDefinition(state.wave).target;
      state.waveKills = Math.min(target, safeInteger(source.waveKills, 0));
      state.wavePhase = state.waveKills >= target ? "cleared" : "active";
      if (safeInteger(source.version, 0) === 2 && state.wave % CONFIG.endless.cycleLength === 0 && source.wavePhase !== "cleared") {
        state.waveKills = 0; state.wavePhase = "active";
      }
      state.highestWaveCleared = Math.min(state.wave, safeInteger(source.highestWaveCleared, 0));
      if (state.wavePhase === "cleared") {
        state.highestWaveCleared = Math.max(state.highestWaveCleared, state.wave);
      }
      state.bestCombo = safeInteger(source.bestCombo, 0);
      state.pulseCharge = Math.max(0, Math.min(CONFIG.operations.pulseMaxCharge, safeNumber(source.pulseCharge, 0)));
    }
    state.elapsedSeconds = Math.max(0, safeNumber(source.elapsedSeconds, state.elapsedSeconds));
    state.totalDefeated = safeInteger(source.totalDefeated, state.totalDefeated);
    state.muted = Boolean(source.muted);
    if (source.unlockedClickSkins && typeof source.unlockedClickSkins === "object") {
      state.unlockedClickSkins = {};
      ARENA.CLICK_EFFECT_SKINS.forEach(function (skin) {
        if (source.unlockedClickSkins[skin.id] === true || skin.unlockedByDefault) {
          state.unlockedClickSkins[skin.id] = true;
        }
      });
    }
    state.activeClickSkin = typeof source.activeClickSkin === "string" ? source.activeClickSkin : state.activeClickSkin;
    if (source.unlockedEnemySkins && typeof source.unlockedEnemySkins === "object") {
      state.unlockedEnemySkins = {};
      ARENA.ENEMY_SKINS.forEach(function (skin) {
        if (source.unlockedEnemySkins[skin.id] === true || skin.unlockedByDefault) {
          state.unlockedEnemySkins[skin.id] = true;
        }
      });
    }
    state.activeEnemySkin = typeof source.activeEnemySkin === "string" ? source.activeEnemySkin : state.activeEnemySkin;
    if (source.unlockedBackgroundSkins && typeof source.unlockedBackgroundSkins === "object") {
      state.unlockedBackgroundSkins = {};
      ARENA.BACKGROUND_SKINS.forEach(function (skin) {
        if (source.unlockedBackgroundSkins[skin.id] === true || skin.unlockedByDefault) {
          state.unlockedBackgroundSkins[skin.id] = true;
        }
      });
    }
    state.activeBackgroundSkin = typeof source.activeBackgroundSkin === "string" ? source.activeBackgroundSkin : state.activeBackgroundSkin;

    ARENA.UPGRADE_DEFS.forEach(function (upgrade) {
      var level = safeInteger(upgrades[upgrade.id], 0);
      if (level > 0) {
        state.upgrades[upgrade.id] = upgrade.maxLevel === null ? level : Math.min(level, upgrade.maxLevel);
      }
    });

    if (ARENA.Endless) {
      state.endless = ARENA.Endless.validate(source.endless);
      if (source.wavePhase === "failed") { state.wavePhase = "failed"; }
    }
    ARENA.ClickEffectSkins.ensureState(state);
    ARENA.EnemySkins.ensureState(state);
    ARENA.BackgroundSkins.ensureState(state);
    return state;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(CONFIG.saveKey);
      return raw ? validateState(JSON.parse(raw)) : createDefaultState();
    } catch (error) {
      console.warn("Arena save load failed.", error);
      return createDefaultState();
    }
  }

  function save(state) {
    try {
      window.localStorage.setItem(CONFIG.saveKey, JSON.stringify(validateState(state)));
      return true;
    } catch (error) {
      console.warn("Arena save failed.", error);
      return false;
    }
  }

  function reset() {
    try {
      window.localStorage.removeItem(CONFIG.saveKey);
    } catch (error) {
      console.warn("Arena save reset failed.", error);
    }

    return createDefaultState();
  }

  ARENA.Save = {
    createDefaultState: createDefaultState,
    validateState: validateState,
    load: load,
    save: save,
    reset: reset
  };
})();

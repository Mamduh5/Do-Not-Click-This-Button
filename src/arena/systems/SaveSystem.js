(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function createDefaultState() {
    return {
      version: CONFIG.saveVersion,
      energy: CONFIG.initialState.energy,
      wave: CONFIG.initialState.wave,
      elapsedSeconds: CONFIG.initialState.elapsedSeconds,
      totalDefeated: CONFIG.initialState.totalDefeated,
      muted: CONFIG.initialState.muted,
      activeClickSkin: ARENA.ClickEffectSkins.getDefaultSkinId(),
      unlockedClickSkins: ARENA.ClickEffectSkins.getDefaultUnlocked(),
      activeEnemySkin: ARENA.EnemySkins.getDefaultSkinId(),
      unlockedEnemySkins: ARENA.EnemySkins.getDefaultUnlocked(),
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
    state.wave = Math.max(1, safeInteger(source.wave, state.wave));
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

    ARENA.UPGRADE_DEFS.forEach(function (upgrade) {
      var level = safeInteger(upgrades[upgrade.id], 0);
      if (level > 0) {
        state.upgrades[upgrade.id] = upgrade.maxLevel === null ? level : Math.min(level, upgrade.maxLevel);
      }
    });

    ARENA.ClickEffectSkins.ensureState(state);
    ARENA.EnemySkins.ensureState(state);
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

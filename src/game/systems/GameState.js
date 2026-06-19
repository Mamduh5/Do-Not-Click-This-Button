(function () {
  "use strict";

  window.DNC = window.DNC || {};

  var SAVE_VERSION = 1;

  var BASE_STATS = {
    powerPerClick: 1,
    powerPerSecond: 0,
    instabilityPerClick: 1,
    instabilityPerSecond: 0,
    containmentPerSecond: 0
  };

  function createDefaultState() {
    return {
      version: SAVE_VERSION,
      power: 0,
      totalPowerEarned: 0,
      instability: 0,
      breachCount: 0,
      anomalyShards: 0,
      powerPerClick: BASE_STATS.powerPerClick,
      powerPerSecond: BASE_STATS.powerPerSecond,
      instabilityPerClick: BASE_STATS.instabilityPerClick,
      instabilityPerSecond: BASE_STATS.instabilityPerSecond,
      containmentPerSecond: BASE_STATS.containmentPerSecond,
      upgrades: {},
      totalClicks: 0,
      lastSavedAt: Date.now(),
      reducedMotion: false
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function toSafeNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function toSafeInteger(value, fallback) {
    return Math.max(0, Math.floor(toSafeNumber(value, fallback)));
  }

  function validateState(raw) {
    var state = createDefaultState();
    var source = raw && typeof raw === "object" ? raw : {};
    var upgrades = source.upgrades && typeof source.upgrades === "object" ? source.upgrades : {};

    state.version = SAVE_VERSION;
    state.power = Math.max(0, toSafeNumber(source.power, state.power));
    state.totalPowerEarned = Math.max(0, toSafeNumber(source.totalPowerEarned, state.totalPowerEarned));
    state.instability = clamp(toSafeNumber(source.instability, state.instability), 0, 100);
    state.breachCount = toSafeInteger(source.breachCount, state.breachCount);
    state.anomalyShards = toSafeInteger(source.anomalyShards, state.anomalyShards);
    state.totalClicks = toSafeInteger(source.totalClicks, state.totalClicks);
    state.lastSavedAt = Math.max(0, toSafeNumber(source.lastSavedAt, state.lastSavedAt));
    state.reducedMotion = Boolean(source.reducedMotion);

    var legacyUpgradeIds = {
      reinforcedButton: "reinfBtn",
      autoPresser: "autoPress",
      containmentField: "conField",
      forbiddenMultiplier: "forbMult"
    };

    Object.keys(upgrades).forEach(function (id) {
      var targetId = legacyUpgradeIds[id] || id;
      var level = toSafeInteger(upgrades[id], 0);
      if (level > 0) {
        state.upgrades[targetId] = (state.upgrades[targetId] || 0) + level;
      }
    });

    DNC.recalculateStats(state);
    return state;
  }

  function recalculateStats(state) {
    state.powerPerClick = BASE_STATS.powerPerClick;
    state.powerPerSecond = BASE_STATS.powerPerSecond;
    state.instabilityPerClick = BASE_STATS.instabilityPerClick;
    state.instabilityPerSecond = BASE_STATS.instabilityPerSecond;
    state.containmentPerSecond = BASE_STATS.containmentPerSecond;

    if (DNC.UPGRADE_DEFS) {
      DNC.UPGRADE_DEFS.forEach(function (upgrade) {
        var level = state.upgrades[upgrade.id] || 0;
        if (level > 0 && typeof upgrade.apply === "function") {
          upgrade.apply(state, level);
        }
      });
    }

    state.instabilityPerClick = clamp(state.instabilityPerClick, 0.2, 999);
    state.instability = clamp(state.instability, 0, 100);
  }

  DNC.SAVE_VERSION = SAVE_VERSION;
  DNC.BASE_STATS = BASE_STATS;
  DNC.createDefaultState = createDefaultState;
  DNC.validateState = validateState;
  DNC.recalculateStats = recalculateStats;
  DNC.clamp = clamp;
})();

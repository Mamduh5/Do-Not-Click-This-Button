(function () {
  "use strict";

  window.DNC = window.DNC || {};

  var CONFIG = DNC.BALANCE_CONFIG;
  var SAVE_VERSION = CONFIG.saveVersion;
  var BASE_STATS = CONFIG.initialState;
  var STAT_CAPS = CONFIG.statCaps;

  function createDefaultState() {
    return {
      version: SAVE_VERSION,
      power: BASE_STATS.power,
      totalPowerEarned: BASE_STATS.totalPowerEarned,
      instability: BASE_STATS.instability,
      breachCount: BASE_STATS.breachCount,
      anomalyShards: BASE_STATS.anomalyShards,
      powerPerClick: BASE_STATS.powerPerClick,
      powerPerSecond: BASE_STATS.powerPerSecond,
      instabilityPerClick: BASE_STATS.instabilityPerClick,
      instabilityPerSecond: BASE_STATS.instabilityPerSecond,
      containmentPerSecond: BASE_STATS.containmentPerSecond,
      upgrades: {},
      shardUpgrades: {},
      totalClicks: BASE_STATS.totalClicks,
      lastSavedAt: Date.now(),
      reducedMotion: BASE_STATS.reducedMotion,
      audioEnabled: BASE_STATS.audioEnabled
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
    var shardUpgrades = source.shardUpgrades && typeof source.shardUpgrades === "object" ? source.shardUpgrades : {};

    state.version = SAVE_VERSION;
    state.power = Math.max(0, toSafeNumber(source.power, state.power));
    state.totalPowerEarned = Math.max(0, toSafeNumber(source.totalPowerEarned, state.totalPowerEarned));
    state.instability = clamp(toSafeNumber(source.instability, state.instability), STAT_CAPS.minimumInstability, STAT_CAPS.maximumInstability);
    state.breachCount = toSafeInteger(source.breachCount, state.breachCount);
    state.anomalyShards = toSafeInteger(source.anomalyShards, state.anomalyShards);
    state.totalClicks = toSafeInteger(source.totalClicks, state.totalClicks);
    state.lastSavedAt = Math.max(0, toSafeNumber(source.lastSavedAt, state.lastSavedAt));
    state.reducedMotion = Boolean(source.reducedMotion);
    state.audioEnabled = typeof source.audioEnabled === "boolean" ? source.audioEnabled : BASE_STATS.audioEnabled;

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

    Object.keys(shardUpgrades).forEach(function (id) {
      var level = toSafeInteger(shardUpgrades[id], 0);
      if (level > 0) {
        state.shardUpgrades[id] = level;
      }
    });

    DNC.recalculateStats(state);
    applyStartingPowerFloor(state);
    return state;
  }

  function recalculateStats(state) {
    state.powerPerClick = BASE_STATS.powerPerClick;
    state.powerPerSecond = BASE_STATS.powerPerSecond;
    state.instabilityPerClick = BASE_STATS.instabilityPerClick;
    state.instabilityPerSecond = BASE_STATS.instabilityPerSecond;
    state.containmentPerSecond = BASE_STATS.containmentPerSecond;

    if (DNC.ShardUpgrades && typeof DNC.ShardUpgrades.applyPermanentEffects === "function") {
      DNC.ShardUpgrades.applyPermanentEffects(state);
    }

    if (DNC.UPGRADE_DEFS) {
      DNC.UPGRADE_DEFS.forEach(function (upgrade) {
        var level = state.upgrades[upgrade.id] || 0;
        if (level > 0 && DNC.Upgrades && typeof DNC.Upgrades.applyEffects === "function") {
          DNC.Upgrades.applyEffects(state, upgrade.effects, level);
        }
      });
    }

    state.instabilityPerClick = clamp(state.instabilityPerClick, STAT_CAPS.minimumInstabilityPerClick, STAT_CAPS.maximumInstabilityPerClick);
    state.instability = clamp(state.instability, STAT_CAPS.minimumInstability, STAT_CAPS.maximumInstability);
  }

  function applyStartingPowerFloor(state) {
    var startingPower = BASE_STATS.power;

    if (DNC.ShardUpgrades && typeof DNC.ShardUpgrades.getStartingPowerBonus === "function") {
      startingPower += DNC.ShardUpgrades.getStartingPowerBonus(state);
    }

    state.power = Math.max(state.power, startingPower);
  }

  function resetRunAfterBreach(state, shardsEarned) {
    state.breachCount += 1;
    state.anomalyShards += shardsEarned;
    resetCurrentRun(state);
  }

  function resetCurrentRun(state) {
    state.power = BASE_STATS.power;
    state.instability = BASE_STATS.instability;
    state.upgrades = {};
    DNC.recalculateStats(state);
    applyStartingPowerFloor(state);
  }

  DNC.SAVE_VERSION = SAVE_VERSION;
  DNC.BASE_STATS = BASE_STATS;
  DNC.createDefaultState = createDefaultState;
  DNC.validateState = validateState;
  DNC.recalculateStats = recalculateStats;
  DNC.applyStartingPowerFloor = applyStartingPowerFloor;
  DNC.resetRunAfterBreach = resetRunAfterBreach;
  DNC.resetCurrentRun = resetCurrentRun;
  DNC.clamp = clamp;
})();

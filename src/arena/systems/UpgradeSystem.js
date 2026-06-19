(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  var CONFIG = ARENA.BALANCE_CONFIG;

  function get(id) {
    return ARENA.UPGRADE_DEFS.find(function (upgrade) {
      return upgrade.id === id;
    });
  }

  function getLevel(state, id) {
    return state.upgrades[id] || 0;
  }

  function getCost(state, id) {
    var upgrade = get(id);
    var level = getLevel(state, id);
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
  }

  function canBuy(state, id) {
    var upgrade = get(id);
    var level = getLevel(state, id);
    return Boolean(upgrade) && (upgrade.maxLevel === null || level < upgrade.maxLevel) && state.energy >= getCost(state, id);
  }

  function buy(state, id) {
    if (!canBuy(state, id)) {
      return false;
    }

    state.energy -= getCost(state, id);
    state.upgrades[id] = getLevel(state, id) + 1;
    return true;
  }

  function computeStats(state) {
    var stats = {
      clickDamage: CONFIG.cursor.clickDamage,
      clickRadius: CONFIG.cursor.clickRadius,
      doubleTapChance: CONFIG.cursor.doubleTapChance,
      shockRadius: CONFIG.cursor.shockRadius,
      shockDamage: CONFIG.cursor.shockDamage,
      helperCursors: CONFIG.cursor.helperCursors,
      helperClickIntervalMs: CONFIG.cursor.helperClickIntervalMs,
      helperClickDamage: CONFIG.cursor.helperClickDamage,
      helperClickRadius: CONFIG.cursor.helperClickRadius,
      helperTravelSpeed: CONFIG.cursor.helperTravelSpeed,
      helperMaxTravelDurationMs: CONFIG.cursor.helperMaxTravelDurationMs,
      helperRetreatDistance: CONFIG.cursor.helperRetreatDistance,
      helperWanderRadius: CONFIG.cursor.helperWanderRadius,
      helperWanderSpeed: CONFIG.cursor.helperWanderSpeed,
      helperTargetReacquireDelayMs: CONFIG.cursor.helperTargetReacquireDelayMs,
      helperClickEffectScale: CONFIG.cursor.helperClickEffectScale,
      feedbackScale: CONFIG.cursor.feedbackScale,
      rewardMultiplier: 1
    };

    ARENA.UPGRADE_DEFS.forEach(function (upgrade) {
      var level = getLevel(state, upgrade.id);
      if (level <= 0) {
        return;
      }

      upgrade.effects.forEach(function (effect) {
        applyEffect(stats, effect, level);
      });
    });

    stats.doubleTapChance = Math.min(0.9, Math.max(0, stats.doubleTapChance));
    stats.shockRadius = Math.max(0, stats.shockRadius);
    stats.helperCursors = Math.max(0, Math.floor(stats.helperCursors));
    stats.feedbackScale = Math.max(1, stats.feedbackScale);
    return stats;
  }

  function applyEffect(stats, effect, level) {
    if (effect.type === "clickDamageAdd") {
      stats.clickDamage += effect.value * level;
    } else if (effect.type === "clickRadiusAdd") {
      stats.clickRadius += effect.value * level;
    } else if (effect.type === "doubleTapChanceAdd") {
      stats.doubleTapChance += effect.value * level;
    } else if (effect.type === "rewardMultiplierAdd") {
      stats.rewardMultiplier += effect.value * level;
    } else if (effect.type === "shockRadiusAdd") {
      stats.shockRadius += effect.value * level;
    } else if (effect.type === "shockDamageAdd") {
      stats.shockDamage += effect.value * level;
    } else if (effect.type === "helperCursorAdd") {
      stats.helperCursors += effect.value * level;
    } else if (effect.type === "feedbackScaleAdd") {
      stats.feedbackScale += effect.value * level;
    }
  }

  ARENA.Upgrades = {
    get: get,
    getLevel: getLevel,
    getCost: getCost,
    canBuy: canBuy,
    buy: buy,
    computeStats: computeStats
  };
})();

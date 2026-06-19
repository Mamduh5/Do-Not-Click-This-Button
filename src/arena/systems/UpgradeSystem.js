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
      attackDamage: CONFIG.attack.damage,
      attackIntervalMs: CONFIG.attack.intervalMs,
      attackRange: CONFIG.attack.range,
      projectileSpeed: CONFIG.attack.projectileSpeed,
      projectileRadius: CONFIG.attack.projectileRadius,
      projectileHitRadius: CONFIG.attack.projectileHitRadius,
      projectileCount: CONFIG.attack.projectileCount,
      pulseDamage: CONFIG.attack.damage * CONFIG.attack.pulseDamageMultiplier,
      pulseRadius: CONFIG.attack.pulseRadius,
      chainRange: CONFIG.attack.chainRange,
      chainDamageMultiplier: CONFIG.attack.chainDamageMultiplier,
      chainTargets: CONFIG.attack.chainTargets,
      orbiters: CONFIG.attack.orbiters,
      orbiterRadius: CONFIG.attack.orbiterRadius,
      orbiterDamage: CONFIG.attack.orbiterDamage,
      orbiterHitRadius: CONFIG.attack.orbiterHitRadius,
      orbiterIntervalMs: CONFIG.attack.orbiterIntervalMs,
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

    stats.attackIntervalMs = Math.max(120, stats.attackIntervalMs);
    stats.projectileCount = Math.max(1, Math.floor(stats.projectileCount));
    stats.chainTargets = Math.max(0, Math.floor(stats.chainTargets));
    stats.orbiters = Math.max(0, Math.floor(stats.orbiters));
    return stats;
  }

  function applyEffect(stats, effect, level) {
    if (effect.type === "attackDamageAdd") {
      stats.attackDamage += effect.value * level;
      stats.pulseDamage = stats.attackDamage * CONFIG.attack.pulseDamageMultiplier;
    } else if (effect.type === "attackIntervalMultiplier") {
      stats.attackIntervalMs *= Math.pow(effect.value, level);
    } else if (effect.type === "pulseRadiusAdd") {
      stats.pulseRadius += effect.value * level;
    } else if (effect.type === "projectileCountAdd") {
      stats.projectileCount += effect.value * level;
    } else if (effect.type === "rewardMultiplierAdd") {
      stats.rewardMultiplier += effect.value * level;
    } else if (effect.type === "chainTargetsAdd") {
      stats.chainTargets += effect.value * level;
    } else if (effect.type === "orbiterAdd") {
      stats.orbiters += effect.value * level;
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

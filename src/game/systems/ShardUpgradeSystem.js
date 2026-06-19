(function () {
  "use strict";

  window.DNC = window.DNC || {};

  function getUpgrade(id) {
    return DNC.SHARD_UPGRADE_DEFS.find(function (upgrade) {
      return upgrade.id === id;
    });
  }

  function getUpgradeLevel(state, id) {
    return state.shardUpgrades[id] || 0;
  }

  function getUpgradeCost(state, id) {
    var upgrade = getUpgrade(id);
    var level = getUpgradeLevel(state, id);

    if (!upgrade) {
      return Infinity;
    }

    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, level));
  }

  function canBuyUpgrade(state, id) {
    var upgrade = getUpgrade(id);
    var level = getUpgradeLevel(state, id);

    if (!upgrade) {
      return false;
    }

    if (upgrade.maxLevel !== null && level >= upgrade.maxLevel) {
      return false;
    }

    return state.anomalyShards >= getUpgradeCost(state, id);
  }

  function applyPermanentEffects(state) {
    DNC.SHARD_UPGRADE_DEFS.forEach(function (upgrade) {
      var level = getUpgradeLevel(state, upgrade.id);
      var effect = upgrade.effect;

      if (level <= 0 || !effect) {
        return;
      }

      if (effect.type === "instabilityPerClickMultiplier") {
        state.instabilityPerClick *= Math.pow(effect.value, level);
      } else if (effect.type === "powerPerClickMultiplier") {
        state.powerPerClick *= Math.pow(effect.value, level);
      }
    });
  }

  function getStartingPowerBonus(state) {
    var bonus = 0;

    DNC.SHARD_UPGRADE_DEFS.forEach(function (upgrade) {
      var level = getUpgradeLevel(state, upgrade.id);
      var effect = upgrade.effect;

      if (level > 0 && effect && effect.type === "startingPowerAdd") {
        bonus += effect.value * level;
      }
    });

    return bonus;
  }

  function getPermanentSummary(state) {
    var summary = {
      instabilityPerClickMultiplier: 1,
      powerPerClickMultiplier: 1,
      startingPowerBonus: 0
    };

    DNC.SHARD_UPGRADE_DEFS.forEach(function (upgrade) {
      var level = getUpgradeLevel(state, upgrade.id);
      var effect = upgrade.effect;

      if (level <= 0 || !effect) {
        return;
      }

      if (effect.type === "instabilityPerClickMultiplier") {
        summary.instabilityPerClickMultiplier *= Math.pow(effect.value, level);
      } else if (effect.type === "powerPerClickMultiplier") {
        summary.powerPerClickMultiplier *= Math.pow(effect.value, level);
      } else if (effect.type === "startingPowerAdd") {
        summary.startingPowerBonus += effect.value * level;
      }
    });

    return summary;
  }

  function buyUpgrade(state, id) {
    var cost = getUpgradeCost(state, id);

    if (!canBuyUpgrade(state, id)) {
      return false;
    }

    state.anomalyShards -= cost;
    state.shardUpgrades[id] = getUpgradeLevel(state, id) + 1;
    DNC.recalculateStats(state);
    return true;
  }

  DNC.ShardUpgrades = {
    get: getUpgrade,
    getLevel: getUpgradeLevel,
    getCost: getUpgradeCost,
    canBuy: canBuyUpgrade,
    buy: buyUpgrade,
    applyPermanentEffects: applyPermanentEffects,
    getStartingPowerBonus: getStartingPowerBonus,
    getPermanentSummary: getPermanentSummary
  };
})();

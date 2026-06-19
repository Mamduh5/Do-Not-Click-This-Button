(function () {
  "use strict";

  window.DNC = window.DNC || {};

  function getUpgrade(id) {
    return DNC.UPGRADE_DEFS.find(function (upgrade) {
      return upgrade.id === id;
    });
  }

  function getUpgradeLevel(state, id) {
    return state.upgrades[id] || 0;
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

    return state.power >= getUpgradeCost(state, id);
  }

  function applyEffect(state, effect, level) {
    var value = effect.value;

    if (effect.op === "addPerLevel") {
      state[effect.stat] += value * level;
    } else if (effect.op === "multiplyPerLevel") {
      state[effect.stat] *= Math.pow(value, level);
    } else if (effect.op === "addOnce") {
      if (level > 0) {
        state[effect.stat] += value;
      }
    } else if (effect.op === "multiplyOnce") {
      if (level > 0) {
        state[effect.stat] *= value;
      }
    } else if (effect.op === "add") {
      state[effect.stat] += value;
    }

    if (typeof effect.min === "number" || typeof effect.max === "number") {
      state[effect.stat] = DNC.clamp(
        state[effect.stat],
        typeof effect.min === "number" ? effect.min : -Infinity,
        typeof effect.max === "number" ? effect.max : Infinity
      );
    }
  }

  function applyEffects(state, effects, level) {
    (effects || []).forEach(function (effect) {
      applyEffect(state, effect, level);
    });
  }

  function buyUpgrade(state, id) {
    var upgrade = getUpgrade(id);
    var cost = getUpgradeCost(state, id);

    if (!canBuyUpgrade(state, id)) {
      return false;
    }

    state.power -= cost;
    state.upgrades[id] = getUpgradeLevel(state, id) + 1;
    DNC.recalculateStats(state);

    applyEffects(state, upgrade.instantEffects, 1);

    return true;
  }

  DNC.Upgrades = {
    get: getUpgrade,
    getLevel: getUpgradeLevel,
    getCost: getUpgradeCost,
    canBuy: canBuyUpgrade,
    buy: buyUpgrade,
    applyEffects: applyEffects
  };
})();

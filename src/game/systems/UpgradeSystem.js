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

  function buyUpgrade(state, id) {
    var upgrade = getUpgrade(id);
    var cost = getUpgradeCost(state, id);

    if (!canBuyUpgrade(state, id)) {
      return false;
    }

    state.power -= cost;
    state.upgrades[id] = getUpgradeLevel(state, id) + 1;
    DNC.recalculateStats(state);

    if (typeof upgrade.onPurchase === "function") {
      upgrade.onPurchase(state);
    }

    return true;
  }

  DNC.Upgrades = {
    get: getUpgrade,
    getLevel: getUpgradeLevel,
    getCost: getUpgradeCost,
    canBuy: canBuyUpgrade,
    buy: buyUpgrade
  };
})();

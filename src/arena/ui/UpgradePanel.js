(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  function createUpgradePanel(options) {
    var list = document.getElementById("arenaUpgradeList");
    var cards = {};

    ARENA.UPGRADE_DEFS.forEach(function (upgrade) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "arena-upgrade-card";
      card.innerHTML = [
        "<div class=\"upgrade-name\">" + upgrade.name + "</div>",
        "<div class=\"upgrade-meta\" id=\"arena-cost-" + upgrade.id + "\"></div>",
        "<div class=\"upgrade-desc\">" + upgrade.description + "</div>"
      ].join("");
      card.addEventListener("click", function () {
        options.onBuy(upgrade.id);
      });
      list.appendChild(card);
      cards[upgrade.id] = card;
    });

    function update(state) {
      ARENA.UPGRADE_DEFS.forEach(function (upgrade) {
        var level = ARENA.Upgrades.getLevel(state, upgrade.id);
        var maxed = upgrade.maxLevel !== null && level >= upgrade.maxLevel;
        var cost = ARENA.Upgrades.getCost(state, upgrade.id);
        var card = cards[upgrade.id];
        var costElement = document.getElementById("arena-cost-" + upgrade.id);

        card.disabled = maxed || !ARENA.Upgrades.canBuy(state, upgrade.id);
        card.classList.toggle("maxed", maxed);
        costElement.textContent = maxed ? "MAXED // LV " + level : "LV " + level + " // Cost " + ARENA.formatNumber(cost);
      });
    }

    return {
      update: update
    };
  }

  ARENA.createUpgradePanel = createUpgradePanel;
})();

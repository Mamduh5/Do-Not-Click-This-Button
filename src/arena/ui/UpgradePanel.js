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
        "<div class=\"upgrade-desc\">" + upgrade.description + "</div>",
        "<div class=\"upgrade-preview\"></div><div class=\"upgrade-afford\"></div>"
      ].join("");
      card.addEventListener("click", function () {
        options.onBuy(upgrade.id);
      });
      list.appendChild(card);
      cards[upgrade.id] = card;
    });

    function update(state) {
      var current = ARENA.Upgrades.computeStats(state);
      ARENA.UPGRADE_DEFS.forEach(function (upgrade) {
        var level = ARENA.Upgrades.getLevel(state, upgrade.id);
        var maxed = upgrade.maxLevel !== null && level >= upgrade.maxLevel;
        var cost = ARENA.Upgrades.getCost(state, upgrade.id);
        var card = cards[upgrade.id];
        var costElement = document.getElementById("arena-cost-" + upgrade.id);

        var nextState = Object.assign({}, state, { upgrades: Object.assign({}, state.upgrades) });
        nextState.upgrades[upgrade.id] = level + 1;
        var next = ARENA.Upgrades.computeStats(nextState);
        var preview = Object.keys(ARENA.UI_CONFIG.statLabels).filter(function (key) { return next[key] !== current[key]; }).map(function (key) {
          var spec = ARENA.UI_CONFIG.statLabels[key];
          function value(number) { return String(Math.round(number * (spec.multiplier || 1) * 100) / 100) + spec.suffix; }
          return spec.label + " " + value(current[key]) + " to " + value(next[key]);
        }).join(" / ");
        card.querySelector(".upgrade-preview").textContent = maxed ? "Fully installed" : preview;
        card.querySelector(".upgrade-afford").style.width = (maxed ? 100 : Math.min(100, state.energy / cost * 100)) + "%";
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

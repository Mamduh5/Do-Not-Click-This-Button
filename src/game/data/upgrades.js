(function () {
  "use strict";

  window.DNC = window.DNC || {};

  DNC.UPGRADE_DEFS = [
    {
      id: "powerTap",
      name: "Power Tap",
      description: "+1 Power per click.",
      baseCost: 10,
      costMultiplier: 1.55,
      maxLevel: null,
      category: "power",
      apply: function (state, level) {
        state.powerPerClick += level;
      }
    },
    {
      id: "reinforcedButton",
      name: "Reinforced Button",
      description: "-0.1 Instability per click, minimum 0.2.",
      baseCost: 35,
      costMultiplier: 1.8,
      maxLevel: 8,
      category: "containment",
      apply: function (state, level) {
        state.instabilityPerClick -= 0.1 * level;
      }
    },
    {
      id: "autoPresser",
      name: "Auto-Presser",
      description: "+1 Power/sec, +0.15 Instability/sec.",
      baseCost: 50,
      costMultiplier: 1.7,
      maxLevel: null,
      category: "automation",
      apply: function (state, level) {
        state.powerPerSecond += level;
        state.instabilityPerSecond += 0.15 * level;
      }
    },
    {
      id: "containmentField",
      name: "Containment Field",
      description: "+0.4 Instability reduction/sec.",
      baseCost: 75,
      costMultiplier: 1.75,
      maxLevel: null,
      category: "containment",
      apply: function (state, level) {
        state.containmentPerSecond += 0.4 * level;
      }
    },
    {
      id: "realityPatch",
      name: "Reality Patch",
      description: "Immediately reduce Instability by 20.",
      baseCost: 100,
      costMultiplier: 2,
      maxLevel: null,
      category: "containment",
      apply: function () {},
      onPurchase: function (state) {
        state.instability = DNC.clamp(state.instability - 20, 0, 100);
      }
    },
    {
      id: "forbiddenMultiplier",
      name: "Forbidden Multiplier",
      description: "+25% Power/click, +0.5 Instability/click.",
      baseCost: 250,
      costMultiplier: 2.25,
      maxLevel: null,
      category: "risk",
      apply: function (state, level) {
        state.powerPerClick *= 1 + 0.25 * level;
        state.instabilityPerClick += 0.5 * level;
      }
    }
  ];
})();

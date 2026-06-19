(function () {
  "use strict";

  window.DNC = window.DNC || {};

  DNC.UPGRADE_DEFS = [
    {
      id: "powerTap",
      name: "Power Tap",
      description: "+1 power per click",
      baseCost: 10,
      costMultiplier: 1.55,
      maxLevel: null,
      tab: "power",
      category: "power",
      apply: function (state, level) {
        state.powerPerClick += level;
      }
    },
    {
      id: "doubleContact",
      name: "Double Contact",
      description: "x2 click power",
      baseCost: 50,
      costMultiplier: 2,
      maxLevel: 5,
      tab: "power",
      category: "power",
      apply: function (state, level) {
        state.powerPerClick *= Math.pow(2, level);
      }
    },
    {
      id: "conductFinger",
      name: "Conductive Finger",
      description: "+5 power per click",
      baseCost: 200,
      costMultiplier: 1.8,
      maxLevel: null,
      tab: "power",
      category: "power",
      apply: function (state, level) {
        state.powerPerClick += 5 * level;
      }
    },
    {
      id: "autoPress",
      name: "Auto-Presser",
      description: "+1 power/sec, +0.15 instab/sec",
      baseCost: 75,
      costMultiplier: 1.7,
      maxLevel: null,
      tab: "auto",
      category: "automation",
      apply: function (state, level) {
        state.powerPerSecond += level;
        state.instabilityPerSecond += 0.15 * level;
      }
    },
    {
      id: "mechIntern",
      name: "Mechanical Intern",
      description: "+5 power/sec, +0.5 instab/sec",
      baseCost: 250,
      costMultiplier: 1.85,
      maxLevel: null,
      tab: "auto",
      category: "automation",
      apply: function (state, level) {
        state.powerPerSecond += 5 * level;
        state.instabilityPerSecond += 0.5 * level;
      }
    },
    {
      id: "loopMacro",
      name: "Looping Macro",
      description: "x2 auto power",
      baseCost: 1000,
      costMultiplier: 2.35,
      maxLevel: 5,
      tab: "auto",
      category: "automation",
      apply: function (state, level) {
        state.powerPerSecond *= Math.pow(2, level);
      }
    },
    {
      id: "reinfBtn",
      name: "Reinforced Button",
      description: "-0.1 instability per click",
      baseCost: 40,
      costMultiplier: 1.8,
      maxLevel: 8,
      tab: "contain",
      category: "containment",
      tag: "SAFE",
      apply: function (state, level) {
        state.instabilityPerClick -= 0.1 * level;
      }
    },
    {
      id: "conField",
      name: "Containment Field",
      description: "+0.4 instability reduction/sec",
      baseCost: 300,
      costMultiplier: 1.75,
      maxLevel: null,
      tab: "contain",
      category: "containment",
      tag: "SAFE",
      apply: function (state, level) {
        state.containmentPerSecond += 0.4 * level;
      }
    },
    {
      id: "realityPatch",
      name: "Reality Patch",
      description: "Reduce instability by 20%",
      baseCost: 800,
      costMultiplier: 2,
      maxLevel: null,
      tab: "contain",
      category: "containment",
      tag: "SAFE",
      apply: function () {},
      onPurchase: function (state) {
        state.instability = DNC.clamp(state.instability - 20, 0, 100);
      }
    },
    {
      id: "warnSuppress",
      name: "Warning Suppressor",
      description: "Dim warning noise, -0.2 instab/sec",
      baseCost: 100,
      costMultiplier: 2,
      maxLevel: 1,
      tab: "risk",
      category: "risk",
      tag: "RISK",
      apply: function (state, level) {
        state.containmentPerSecond += 0.2 * level;
      }
    },
    {
      id: "unsafeOC",
      name: "Unsafe Overclock",
      description: "x3 power, +2 instab/sec",
      baseCost: 500,
      costMultiplier: 2,
      maxLevel: 1,
      tab: "risk",
      category: "risk",
      tag: "RISK",
      apply: function (state, level) {
        if (level > 0) {
          state.powerPerClick *= 3;
          state.powerPerSecond *= 3;
          state.instabilityPerSecond += 2;
        }
      }
    },
    {
      id: "forbMult",
      name: "Forbidden Multiplier",
      description: "x10 output. Breach imminent.",
      baseCost: 2000,
      costMultiplier: 2,
      maxLevel: 1,
      tab: "risk",
      category: "risk",
      tag: "RISK",
      apply: function (state, level) {
        if (level > 0) {
          state.powerPerClick *= 10;
          state.powerPerSecond *= 10;
          state.instabilityPerClick += 5;
          state.instabilityPerSecond += 5;
        }
      }
    }
  ];
})();

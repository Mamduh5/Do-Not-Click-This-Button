(function () {
  "use strict";

  window.DNC = window.DNC || {};

  DNC.UPGRADE_DEFS = [
    {
      id: "powerTap",
      name: "Power Tap",
      description: "+1 power per click",
      baseCost: 8,
      costMultiplier: 1.55,
      maxLevel: null,
      tab: "power",
      category: "power",
      effects: [
        { stat: "powerPerClick", op: "addPerLevel", value: 1 }
      ]
    },
    {
      id: "doubleContact",
      name: "Double Contact",
      description: "x2 click power",
      baseCost: 40,
      costMultiplier: 2,
      maxLevel: 5,
      tab: "power",
      category: "power",
      effects: [
        { stat: "powerPerClick", op: "multiplyPerLevel", value: 2 }
      ]
    },
    {
      id: "conductFinger",
      name: "Conductive Finger",
      description: "+5 power per click",
      baseCost: 140,
      costMultiplier: 1.8,
      maxLevel: null,
      tab: "power",
      category: "power",
      effects: [
        { stat: "powerPerClick", op: "addPerLevel", value: 5 }
      ]
    },
    {
      id: "autoPress",
      name: "Auto-Presser",
      description: "+1 power/sec, +0.12 instab/sec",
      baseCost: 45,
      costMultiplier: 1.7,
      maxLevel: null,
      tab: "auto",
      category: "automation",
      effects: [
        { stat: "powerPerSecond", op: "addPerLevel", value: 1 },
        { stat: "instabilityPerSecond", op: "addPerLevel", value: 0.12 }
      ]
    },
    {
      id: "mechIntern",
      name: "Mechanical Intern",
      description: "+5 power/sec, +0.45 instab/sec",
      baseCost: 180,
      costMultiplier: 1.85,
      maxLevel: null,
      tab: "auto",
      category: "automation",
      effects: [
        { stat: "powerPerSecond", op: "addPerLevel", value: 5 },
        { stat: "instabilityPerSecond", op: "addPerLevel", value: 0.45 }
      ]
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
      effects: [
        { stat: "powerPerSecond", op: "multiplyPerLevel", value: 2 }
      ]
    },
    {
      id: "reinfBtn",
      name: "Reinforced Button",
      description: "-0.1 instability per click",
      baseCost: 28,
      costMultiplier: 1.8,
      maxLevel: 8,
      tab: "contain",
      category: "containment",
      tag: "SAFE",
      effects: [
        { stat: "instabilityPerClick", op: "addPerLevel", value: -0.1 }
      ]
    },
    {
      id: "conField",
      name: "Containment Field",
      description: "+0.4 instability reduction/sec",
      baseCost: 90,
      costMultiplier: 1.75,
      maxLevel: null,
      tab: "contain",
      category: "containment",
      tag: "SAFE",
      effects: [
        { stat: "containmentPerSecond", op: "addPerLevel", value: 0.4 }
      ]
    },
    {
      id: "realityPatch",
      name: "Reality Patch",
      description: "Reduce instability by 20%",
      baseCost: 140,
      costMultiplier: 2,
      maxLevel: null,
      tab: "contain",
      category: "containment",
      tag: "SAFE",
      effects: [],
      instantEffects: [
        { stat: "instability", op: "add", value: -20, min: 0, max: 100 }
      ]
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
      effects: [
        { stat: "containmentPerSecond", op: "addPerLevel", value: 0.2 }
      ]
    },
    {
      id: "unsafeOC",
      name: "Unsafe Overclock",
      description: "x3 power, +2 instab/sec",
      baseCost: 420,
      costMultiplier: 2,
      maxLevel: 1,
      tab: "risk",
      category: "risk",
      tag: "RISK",
      effects: [
        { stat: "powerPerClick", op: "multiplyOnce", value: 3 },
        { stat: "powerPerSecond", op: "multiplyOnce", value: 3 },
        { stat: "instabilityPerSecond", op: "addOnce", value: 2 }
      ]
    },
    {
      id: "forbMult",
      name: "Forbidden Multiplier",
      description: "x10 output. Breach imminent.",
      baseCost: 1600,
      costMultiplier: 2,
      maxLevel: 1,
      tab: "risk",
      category: "risk",
      tag: "RISK",
      effects: [
        { stat: "powerPerClick", op: "multiplyOnce", value: 10 },
        { stat: "powerPerSecond", op: "multiplyOnce", value: 10 },
        { stat: "instabilityPerClick", op: "addOnce", value: 5 },
        { stat: "instabilityPerSecond", op: "addOnce", value: 5 }
      ]
    }
  ];
})();

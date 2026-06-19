(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.UPGRADE_DEFS = [
    {
      id: "heavierCursor",
      name: "Heavier Cursor",
      description: "Adds click damage. Anomalies squash in fewer hits.",
      baseCost: 12,
      costMultiplier: 1.55,
      maxLevel: 12,
      effects: [{ type: "clickDamageAdd", value: 1 }]
    },
    {
      id: "widerImpact",
      name: "Wider Impact",
      description: "Increases click radius. Near misses still crush anomalies.",
      baseCost: 18,
      costMultiplier: 1.62,
      maxLevel: 10,
      effects: [{ type: "clickRadiusAdd", value: 5 }]
    },
    {
      id: "doubleTap",
      name: "Double Tap",
      description: "Adds a chance for a second hit on the clicked anomaly.",
      baseCost: 20,
      costMultiplier: 1.58,
      maxLevel: 10,
      effects: [{ type: "doubleTapChanceAdd", value: 0.06 }]
    },
    {
      id: "splatterYield",
      name: "Splatter Yield",
      description: "Increases Energy gained from crushed anomalies.",
      baseCost: 34,
      costMultiplier: 1.75,
      maxLevel: 8,
      effects: [{ type: "rewardMultiplierAdd", value: 0.18 }]
    },
    {
      id: "shockClick",
      name: "Shock Click",
      description: "Killed anomalies burst and damage nearby enemies.",
      baseCost: 26,
      costMultiplier: 1.6,
      maxLevel: 6,
      effects: [
        { type: "shockRadiusAdd", value: 18 },
        { type: "shockDamageAdd", value: 0.75 }
      ]
    },
    {
      id: "autoTapper",
      name: "Auto Tapper",
      description: "Adds a visible helper cursor that clicks nearby anomalies.",
      baseCost: 45,
      costMultiplier: 1.9,
      maxLevel: 3,
      effects: [{ type: "helperCursorAdd", value: 1 }]
    },
    {
      id: "cursorFrenzy",
      name: "Cursor Frenzy",
      description: "Makes impact effects larger and sharper.",
      baseCost: 58,
      costMultiplier: 2,
      maxLevel: 5,
      effects: [{ type: "feedbackScaleAdd", value: 0.14 }]
    }
  ];
})();

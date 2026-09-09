(function () {
  "use strict";

  window.DNC = window.DNC || {};

  DNC.SHARD_UPGRADE_DEFS = [
    { id: "machineCraft", name: "Machine craft", description: "Permanent +10% base manual and automatic output per level.", baseCost: 4, costMultiplier: 1, maxLevel: null, effect: { type: "productionAdd", value: 0.1 } },
    {
      id: "containmentMemory",
      name: "Containment Memory",
      description: "Permanently reduces instability gained from clicking.",
      baseCost: 1,
      costMultiplier: 2,
      maxLevel: 5,
      effect: {
        type: "instabilityPerClickMultiplier",
        value: 0.96
      }
    },
    {
      id: "residualCharge",
      name: "Residual Charge",
      description: "Start each run with some Power.",
      baseCost: 2,
      costMultiplier: 2,
      maxLevel: 5,
      effect: {
        type: "startingPowerAdd",
        value: 10
      }
    },
    {
      id: "shardResonance",
      name: "Shard Resonance",
      description: "Permanently improves click power.",
      baseCost: 3,
      costMultiplier: 2.5,
      maxLevel: 5,
      effect: {
        type: "powerPerClickMultiplier",
        value: 1.05
      }
    }
  ];
})();

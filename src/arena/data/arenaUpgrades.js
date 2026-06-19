(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.UPGRADE_DEFS = [
    {
      id: "pulseCapacitor",
      name: "Pulse Capacitor",
      description: "Adds attack damage. Enemies collapse in fewer hits.",
      baseCost: 12,
      costMultiplier: 1.55,
      maxLevel: 12,
      effects: [{ type: "attackDamageAdd", value: 1 }]
    },
    {
      id: "rapidDischarge",
      name: "Rapid Discharge",
      description: "Reduces attack interval. More shots appear on the field.",
      baseCost: 18,
      costMultiplier: 1.62,
      maxLevel: 10,
      effects: [{ type: "attackIntervalMultiplier", value: 0.9 }]
    },
    {
      id: "widePulse",
      name: "Wide Pulse",
      description: "Expands the cyan area pulse around the core.",
      baseCost: 20,
      costMultiplier: 1.58,
      maxLevel: 10,
      effects: [{ type: "pulseRadiusAdd", value: 16 }]
    },
    {
      id: "splitSignal",
      name: "Split Signal",
      description: "Adds another simultaneous projectile target.",
      baseCost: 34,
      costMultiplier: 1.75,
      maxLevel: 4,
      effects: [{ type: "projectileCountAdd", value: 1 }]
    },
    {
      id: "magneticCollector",
      name: "Magnetic Collector",
      description: "Increases Energy gained from destroyed anomalies.",
      baseCost: 26,
      costMultiplier: 1.6,
      maxLevel: 8,
      effects: [{ type: "rewardMultiplierAdd", value: 0.18 }]
    },
    {
      id: "orbitCursor",
      name: "Orbit Cursor",
      description: "Adds a visible orbiting defense cursor around the core.",
      baseCost: 45,
      costMultiplier: 1.9,
      maxLevel: 3,
      effects: [{ type: "orbiterAdd", value: 1 }]
    },
    {
      id: "chainRelay",
      name: "Chain Relay",
      description: "Projectile hits jump to nearby anomalies.",
      baseCost: 58,
      costMultiplier: 2,
      maxLevel: 3,
      effects: [{ type: "chainTargetsAdd", value: 1 }]
    }
  ];
})();

(function () {
  "use strict";

  window.DNC = window.DNC || {};

  DNC.BALANCE_CONFIG = {
    saveVersion: 3,
    machine: {
      dangerOutputBonus: 2, purgeDanger: 55, purgePowerRetained: 0.5,
      redline: 75, surgeAt: 90, surgeWarningSeconds: 6, surgeHeat: 7,
      stabilizeCooling: 9, stabilizeOutput: 0.2, riskDivisor: 120,
      draftFirst: 120, draftStep: 240, slots: 2,
      modules: [
        { id: "contact", name: "Hot contact", text: "Manual output x1.6; click heat x1.2.", click: 1.6, heat: 1.2 },
        { id: "governor", name: "Governor", text: "Auto output x1.5; passive heat x0.7.", auto: 1.5, passive: 0.7 },
        { id: "capacitor", name: "Capacitor", text: "Output x1.25 below 75% Danger; stabilization cools x1.5 faster.", safe: 1.25, cooling: 1.5 },
        { id: "redline", name: "Redline coil", text: "Risk earnings x1.7; surges arrive 1 second sooner.", risk: 1.7, warning: -1 },
        { id: "recycler", name: "Heat recycler", text: "Redline output x1.4; stabilization retains 40% output.", hot: 1.4, retained: 0.4 },
        { id: "buffer", name: "Surge buffer", text: "Surges add 40% less heat; manual output x1.15.", surge: 0.6, click: 1.15 }
      ]
    },

    initialState: {
      power: 0,
      totalPowerEarned: 0,
      instability: 0,
      breachCount: 0,
      anomalyShards: 0,
      powerPerClick: 1,
      powerPerSecond: 0,
      instabilityPerClick: 0.65,
      instabilityPerSecond: 0,
      containmentPerSecond: 0,
      totalClicks: 0,
      runClicks: 0,
      runPowerEarned: 0,
      reducedMotion: false,
      audioEnabled: true
    },

    statCaps: {
      minimumInstabilityPerClick: 0.2,
      maximumInstabilityPerClick: 999,
      minimumInstability: 0,
      maximumInstability: 100
    },

    instability: {
      stableMin: 0,
      stableMax: 24,
      disturbedAt: 25,
      unstableAt: 50,
      criticalAt: 75,
      breachAt: 100
    },

    timing: {
      tickMs: 250,
      autosaveMs: 5000,
      consoleCooldownMs: 1500,
      floatingTextMs: 850,
      reducedMotionFloatingTextMs: 300,
      clickFeedbackMs: 100,
      clickShakeMs: 300,
      breachShakeMs: 320,
      resetConfirmMs: 4000,
      rewardFeedbackMs: 1200,
      meterTransitionMs: 250
    },

    console: {
      maxVisibleLines: 4
    },

    operatorGuide: {
      firstContact: { title: "A little disobedience goes a long way.", text: "Click for Power. Install upgrades. Watch Danger as the machine grows.", tab: "power", action: "EXPLORE UPGRADES" },
      firstUpgrade: { title: "Make every forbidden click count.", text: "Power Tap improves your output without adding more instability per click. Install it as soon as you can afford it.", tab: "power", action: "VIEW POWER UPGRADES" },
      automation: { title: "Let the machine share the blame.", text: "Automation creates Power between clicks, but also heats the system. Containment can offset that pressure.", tab: "auto", action: "VIEW AUTOMATION" },
      unstable: { title: "Contain it. Or let it break.", text: "Higher Danger boosts output. Stabilize to cool at reduced output, or cash out and keep your earned bonus.", tab: "contain", action: "VIEW CONTAINMENT" },
      critical: { title: "The next breach is your decision.", text: "Production above 75% earns an unbanked bonus. Watch the surge warning. Cash out before control slips away.", tab: "contain", action: "VIEW CONTAINMENT" },
      permanent: { title: "The system forgot. Your Shards did not.", text: "Spend Shards on permanent upgrades, then build the next run. These effects survive every breach.", tab: "shard", action: "SPEND SHARDS" },
      growing: { title: "Build Power. Bend the rules.", text: "Safe upgrades extend a run. Risk upgrades accelerate it. Power earned this run improves its guaranteed reward.", tab: "risk", action: "EXPLORE RISK UPGRADES" },
      forecastLabel: "GUARANTEED IF YOU BREACH",
      forecastBasis: "Base Shards come from this run. Cash out to keep the production-earned risk bonus too.",
      nextShardLabel: "NEXT SHARD",
      clicksLabel: "clicks to breach at current heat",
      coolingLabel: "cooling / sec",
      heatingLabel: "instability / sec",
      balancedLabel: "No passive heat change",
      rewardIncreaseLog: "Breach forecast increased to {shards} Shards.",
      breachContinueLabel: "REINITIALIZE + VIEW SHARDS"
    },

    shardUi: {
      tabLabel: "SHARD",
      emptyTitle: "No anomaly shards available.",
      emptyHint: "Trigger a containment breach to harvest shards.",
      summaryTitle: "PERMANENT EFFECTS",
      shardLabel: "SHARDS",
      breachLabel: "BREACHES"
    },

    menu: {
      buttonLabel: "MENU",
      title: "SYSTEM MENU",
      closeLabel: "Close",
      soundLabel: "Sound",
      motionLabel: "Motion",
      resetRunLabel: "Reset Current Run",
      deleteSaveLabel: "Delete All Save Data",
      resetRunConfirm: "Reset current run? Permanent shard progress will be kept.",
      deleteSaveConfirm: "Delete all save data? This removes shards, breaches, and permanent upgrades.",
      confirmLabel: "Confirm",
      cancelLabel: "Cancel"
    },

    breachRewards: {
      totalPowerDivisor: 80,
      breachCountBonus: 0,
      minimumShards: 0
    },

    feedback: {
      stable: {
        shake: false
      },
      disturbed: {
        shake: true
      },
      unstable: {
        shake: true
      },
      critical: {
        shake: true
      },
      criticalLabelStepFrames: 18
    },

    autoCursor: {
      clickIntervalMs: 1000,
      travelMs: 260,
      pressMs: 120,
      feedbackMs: 700,
      maxVisibleCursors: 1,
      label: "AUTO",
      consoleCooldownMs: 5000
    }
  };
})();

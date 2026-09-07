(function () {
  "use strict";

  window.DNC = window.DNC || {};

  DNC.BALANCE_CONFIG = {
    saveVersion: 2,

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
      firstContact: { title: "A little disobedience goes a long way.", text: "Click for Power. Install upgrades. At 100% instability, the system breaches and you keep permanent Shards.", tab: "power", action: "EXPLORE UPGRADES" },
      firstUpgrade: { title: "Make every forbidden click count.", text: "Power Tap improves your output without adding more instability per click. Install it as soon as you can afford it.", tab: "power", action: "VIEW POWER UPGRADES" },
      automation: { title: "Let the machine share the blame.", text: "Automation creates Power between clicks, but also heats the system. Containment can offset that pressure.", tab: "auto", action: "VIEW AUTOMATION" },
      unstable: { title: "Contain it. Or let it break.", text: "Containment buys more time to earn Power. A breach resets run upgrades and converts your progress into permanent Shards.", tab: "contain", action: "VIEW CONTAINMENT" },
      critical: { title: "The next breach is your decision.", text: "Keep pressing to harvest the forecast below, or install containment to extend the run and raise the reward.", tab: "contain", action: "VIEW CONTAINMENT" },
      permanent: { title: "The system forgot. Your Shards did not.", text: "Spend Shards on permanent upgrades, then build the next run. These effects survive every breach.", tab: "shard", action: "SPEND SHARDS" },
      growing: { title: "Build Power. Bend the rules.", text: "Safe upgrades extend a run. Risk upgrades accelerate it. Every Power you earn improves future breach rewards.", tab: "risk", action: "EXPLORE RISK UPGRADES" },
      forecastLabel: "IF YOU BREACH NOW",
      forecastBasis: "Based on lifetime Power + previous breaches. Spending Power never lowers this reward.",
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
      breachCountBonus: 0.5,
      minimumShards: 1
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
    },

    audio: {
      enabledByDefault: true,
      masterVolume: 0.28,
      clickVolume: 0.35,
      autoClickVolume: 0.18,
      upgradeVolume: 0.25,
      shardUpgradeVolume: 0.24,
      errorVolume: 0.2,
      warningVolume: 0.22,
      breachVolume: 0.42,
      sounds: {
        click: { frequency: 96, endFrequency: 42, durationMs: 75, type: "sawtooth" },
        clickCritical: { frequency: 130, endFrequency: 46, durationMs: 95, type: "square" },
        autoClick: { frequency: 520, endFrequency: 340, durationMs: 45, type: "square" },
        upgrade: { frequency: 640, endFrequency: 920, durationMs: 110, type: "sine" },
        shardUpgrade: { frequency: 740, endFrequency: 1180, durationMs: 180, type: "triangle" },
        error: { frequency: 150, endFrequency: 90, durationMs: 140, type: "sawtooth" },
        warning: { frequency: 440, endFrequency: 260, durationMs: 180, type: "square" },
        breach: { frequency: 120, endFrequency: 38, durationMs: 520, type: "sawtooth" }
      }
    }
  };
})();

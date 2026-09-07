(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  // Roles describe combat behavior; the player's selected skin still supplies the body art.
  ARENA.ENEMY_ROLES = {
    standard: {
      id: "standard",
      name: "Swarm",
      description: "The familiar wandering swarm.",
      healthMultiplier: 1,
      speedMultiplier: 1,
      rewardMultiplier: 1,
      scale: 1,
      clickPaddingMultiplier: 1,
      knockbackMultiplier: 1,
      animationSpeedMultiplier: 1,
      marker: {
        color: 0xe2545f,
        ring: false,
        paths: [],
        healthBarWidth: 28,
        alwaysShowHealth: false,
        pulseAmplitude: 0,
        pulsePeriodMs: 1500
      }
    },
    runner: {
      id: "runner",
      name: "Runner",
      description: "Quick and fragile. Catch the cyan chevrons.",
      healthMultiplier: 0.65,
      speedMultiplier: 1.85,
      rewardMultiplier: 1.25,
      scale: 0.9,
      clickPaddingMultiplier: 1.15,
      knockbackMultiplier: 1.1,
      animationSpeedMultiplier: 1.45,
      marker: {
        color: 0x078fa3,
        ring: false,
        paths: [
          [[-0.8, -0.9], [-1.15, 0], [-0.8, 0.9]],
          [[0.8, -0.9], [1.15, 0], [0.8, 0.9]]
        ],
        healthBarWidth: 28,
        alwaysShowHealth: false,
        pulseAmplitude: 0,
        pulsePeriodMs: 1500
      }
    },
    brute: {
      id: "brute",
      name: "Brute",
      description: "Heavy armor, slower movement, a larger Energy bounty.",
      healthMultiplier: 2.6,
      speedMultiplier: 0.7,
      rewardMultiplier: 2.5,
      scale: 1.38,
      clickPaddingMultiplier: 1,
      knockbackMultiplier: 0.42,
      animationSpeedMultiplier: 0.75,
      marker: {
        color: 0xb87408,
        ring: false,
        paths: [
          [[-0.8, -0.9], [0.8, -0.9], [1, -0.15], [0.7, 0.65], [0, 1.05], [-0.7, 0.65], [-1, -0.15], [-0.8, -0.9]]
        ],
        healthBarWidth: 36,
        alwaysShowHealth: false,
        pulseAmplitude: 0,
        pulsePeriodMs: 1500
      }
    },
    champion: {
      id: "champion",
      name: "Champion",
      description: "A crowned, high-value target that closes every fifth wave.",
      healthMultiplier: 7,
      speedMultiplier: 0.82,
      rewardMultiplier: 8,
      scale: 1.85,
      clickPaddingMultiplier: 1.25,
      knockbackMultiplier: 0.25,
      animationSpeedMultiplier: 0.9,
      marker: {
        color: 0x9b36cc,
        ring: true,
        paths: [
          [[-0.48, -0.9], [-0.56, -1.3], [-0.2, -1.12], [0, -1.5], [0.2, -1.12], [0.56, -1.3], [0.48, -0.9]]
        ],
        healthBarWidth: 58,
        alwaysShowHealth: true,
        pulseAmplitude: 0.035,
        pulsePeriodMs: 1500
      }
    }
  };

  ARENA.ENEMY_ROLE_FEEDBACK = {
    markerDepth: 4,
    markerRadiusMultiplier: 1.28,
    markerPadding: 2,
    markerLineWidth: 1.6,
    markerAlpha: 0.9,
    markerFillAlpha: 0.06,
    markerHaloAlpha: 0.12,
    markerHaloWidth: 5,
    healthBarHeight: 5,
    healthBarPadding: 1,
    healthBarCornerRadius: 2,
    healthBarOffset: 9,
    championHealthBarOffset: 20,
    healthBarTrackColor: 0x182631,
    healthBarTrackAlpha: 0.9,
    healthBarBorderColor: 0xffffff,
    healthBarBorderAlpha: 0.8,
    healthBarBorderWidth: 1,
    spawnInitialScale: 0.25,
    spawnAlpha: 0.96,
    spawnRingRadiusMultiplier: 1.8,
    spawnRingFillAlpha: 0.05,
    spawnRingLineWidth: 1,
    spawnRingLineAlpha: 0.45,
    spawnRingEndScale: 1.35,
    shadowOffsetX: 2,
    shadowOffsetY: 4,
    shadowRadiusMultiplier: 1.15,
    shadowDepth: -1,
    visibleEdgePadding: 12,
    animationSeedRange: 1000,
    initialDriftVariance: 0.9,
    initialTurnMin: 0.5,
    initialTurnMax: 1.5,
    turnIntervalMin: 0.65,
    turnIntervalMax: 1.35,
    wiggleAngleMultiplier: 0.01,
    frameDurationMs: 16.67,
    minimumAnimationMovement: 0.1,
    orientationDistanceThreshold: 0.05
  };
})();

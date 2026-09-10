(function () {
  "use strict";
  window.ARENA = window.ARENA || {};

  ARENA.UI_CONFIG = {
    defense: { breakMs: 750, summonMs: 900, armorHitMs: 150, cueRadius: 54, meterWidth: 360 },
    resetConfirmMs: 5000,
    transitionMs: 160,
    copy: {
      active: "CONTAINMENT IN PROGRESS",
      cleared: "ROOM SECURED",
      paused: "OPERATION PAUSED",
      clearHint: "Upgrades optional. Release when ready.",
      pauseHint: "Battlefield paused.",
      nextWave: "RELEASE NEXT WAVE",
      championWave: "RELEASE GIGABOSS WAVE",
      resume: "RESUME OPERATION",
      pulseReady: "DISCHARGE PULSE",
      pulseCharging: "CHARGING PULSE",
      reset: "Reset Arena progress",
      resetConfirm: "Confirm reset — all Arena progress",
      muted: "Sound: OFF",
      sound: "Sound: ON"
    },
    statLabels: {
      clickDamage: { label: "Damage", suffix: "" },
      clickRadius: { label: "Reach", suffix: "px" },
      doubleTapChance: { label: "Double hit", suffix: "%", multiplier: 100 },
      rewardMultiplier: { label: "Energy", suffix: "x" },
      shockRadius: { label: "Shock reach", suffix: "px" },
      shockDamage: { label: "Shock damage", suffix: "" },
      helperCursors: { label: "Helpers", suffix: "" },
      helperClickDamage: { label: "Helper damage", suffix: "" },
      pulseDamageMultiplier: { label: "Pulse damage", suffix: "x" },
      feedbackScale: { label: "Impact size", suffix: "x" }
    }
  };
})();

(function () {
  "use strict";
  window.ARENA = window.ARENA || {};

  ARENA.UI_CONFIG = {
    resetConfirmMs: 5000,
    transitionMs: 160,
    copy: {
      active: "CONTAINMENT IN PROGRESS",
      cleared: "ROOM SECURED",
      paused: "OPERATION PAUSED",
      clearHint: "Energy secured. Upgrades are optional. Release the next swarm whenever you are ready.",
      pauseHint: "Take your time. Enemies, helpers, and wave progress are frozen.",
      nextWave: "RELEASE NEXT WAVE",
      championWave: "RELEASE CHAMPION WAVE",
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

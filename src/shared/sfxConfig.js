(function () {
  "use strict";
  // Mono, finite effects. Tone/noise layers are baked once, never streamed.
  function tone(hz, end, seconds, gain, delay, rough) {
    return { hz: hz, end: end, seconds: seconds, gain: gain, delay: delay || 0, rough: rough || 0 };
  }
  function noise(hz, seconds, gain, delay) {
    return { noise: true, hz: hz, seconds: seconds, gain: gain, delay: delay || 0 };
  }
  function cue(group, volume, layers, extra) {
    return Object.assign({ group: group, volume: volume, layers: layers }, extra);
  }
  window.SFX_CONFIG = {
    storageKey: "containmentSfxV1", defaultVolume: 0.75, sampleRate: 24000,
    bankDelay: { cashOut: 0.58, breach: 1.15 },
    // More body and drive into peak control, without equalizing cue levels.
    mix: { caps: { spam: 4, info: 3, critical: 3 }, input: 2.5, output: 0.85,
      decay: { spam: 3.4, info: 3, critical: 3 },
      threshold: -14, knee: 6, ratio: 12, attack: 0.001, release: 0.12,
      duck: 0.2, infoDuck: 0.55, duckRelease: 0.09, variation: 0.035 },
    warnings: { hysteresis: 8, cooldown: 12, overrun: [65, 85], chargeSteps: [0, 0.4, 0.75] },
    cues: {
      hit: cue("spam", 0.15, [tone(670, 310, 0.045, 0.8, 0, 0.2), noise(2200, 0.022, 0.3)], { variants: 3, gap: 0.022 }),
      miss: cue("spam", 0.07, [noise(1600, 0.025, 0.6), tone(430, 260, 0.03, 0.4)], { variants: 3, gap: 0.03 }),
      death: cue("spam", 0.12, [tone(510, 190, 0.08, 0.8), noise(1100, 0.045, 0.3)], { variants: 3, gap: 0.09 }),
      press: cue("spam", 0.17, [noise(1900, 0.016, 0.55), tone(340, 170, 0.055, 0.8), tone(880, 530, 0.028, 0.3, 0.008)], { variants: 3, gap: 0.022 }),
      strained: cue("spam", 0.17, [noise(2100, 0.022, 0.6), tone(340, 170, 0.055, 0.8, 0, 0.18), tone(1050, 610, 0.035, 0.35, 0.008)], { variants: 3, gap: 0.022 }),
      unstable: cue("spam", 0.17, [noise(2300, 0.03, 0.65), tone(340, 170, 0.055, 0.8, 0, 0.35), tone(1170, 480, 0.043, 0.4, 0.008)], { variants: 3, gap: 0.022 }),
      redPress: cue("spam", 0.17, [noise(2500, 0.035, 0.7), tone(340, 170, 0.055, 0.8, 0, 0.5), tone(1320, 430, 0.046, 0.45, 0.008)], { variants: 3, gap: 0.022 }),
      upgrade: cue("info", 0.28, [tone(660, 680, 0.10, 0.7), tone(990, 1020, 0.16, 0.8, 0.07)], { gap: 0.08, duck: 0.24 }),
      bank: cue("info", 0.24, [tone(740, 740, 0.1, 0.7), tone(1110, 1110, 0.17, 0.8, 0.09)], { gap: 0.3 }),
      ui: cue("info", 0.12, [tone(580, 450, 0.045, 0.8)], { gap: 0.1 }),
      navigation: cue("info", 0.23, [tone(640, 960, 0.065, 0.8), tone(1280, 1280, 0.045, 0.25, 0.015)], { gap: 0.1 }),
      error: cue("info", 0.13, [tone(350, 280, 0.08, 0.8, 0, 0.15)], { gap: 0.3 }),
      pulse: cue("info", 0.38, [noise(1700, 0.12, 0.4), tone(370, 1350, 0.23, 0.8, 0, 0.15), tone(900, 500, 0.16, 0.4, 0.09)], { duck: 0.4 }),
      wave: cue("info", 0.16, [tone(470, 640, 0.11, 0.8)], { gap: 0.8 }),
      arrival: cue("critical", 0.44, [tone(520, 330, 0.26, 0.8, 0, 0.3), noise(1600, 0.18, 0.4), tone(780, 420, 0.3, 0.7, 0.17)], { duck: 0.7 }),
      charge1: cue("critical", 0.32, [tone(700, 880, 0.16, 0.8, 0, 0.2)], { duck: 0.3 }),
      charge2: cue("critical", 0.35, [tone(880, 1130, 0.17, 0.8, 0, 0.25), tone(880, 1130, 0.12, 0.6, 0.19)], { duck: 0.4 }),
      charge3: cue("critical", 0.38, [tone(1130, 1460, 0.16, 0.8, 0, 0.3), tone(1130, 1460, 0.12, 0.6, 0.18)], { duck: 0.4 }),
      interrupt: cue("critical", 0.43, [noise(2600, 0.09, 0.6), tone(1300, 400, 0.075, 0.8), tone(720, 1080, 0.17, 0.7, 0.085)], { duck: 0.5 }),
      coreImpact: cue("critical", 0.5, [noise(1800, 0.18, 0.7), tone(520, 200, 0.29, 0.9, 0, 0.4), tone(870, 340, 0.18, 0.6)], { duck: 0.6 }),
      coreDestroyed: cue("critical", 0.57, [noise(2100, 0.45, 0.9), tone(640, 170, 0.55, 0.8, 0, 0.5), tone(1130, 260, 0.31, 0.7, 0.13)], { quiet: 1.1, duck: 1.1 }),
      waveClear: cue("info", 0.34, [tone(660, 660, 0.09, 0.7), tone(880, 880, 0.11, 0.75, 0.055), tone(1320, 1320, 0.15, 0.8, 0.12)], { duck: 0.32 }),
      summon: cue("info", 0.24, [tone(460, 850, 0.12, 0.7, 0, 0.2), tone(610, 1100, 0.12, 0.6, 0.08)], { gap: 0.6 }),
      overrun: cue("critical", 0.34, [tone(600, 560, 0.13, 0.8, 0, 0.25), tone(820, 730, 0.16, 0.8, 0.19)], { duck: 0.45 }),
      overrunFailed: cue("critical", 0.49, [noise(1300, 0.25, 0.5), tone(810, 310, 0.4, 0.8, 0, 0.35)], { quiet: 1, duck: 1 }),
      danger: cue("info", 0.25, [tone(570, 690, 0.11, 0.8, 0, 0.25)], { duck: 0.2 }),
      redline: cue("critical", 0.4, [tone(790, 950, 0.14, 0.8, 0, 0.3), noise(2300, 0.09, 0.4), tone(1060, 900, 0.18, 0.8, 0.18)], { duck: 0.6 }),
      surge: cue("critical", 0.4, [noise(2800, 0.2, 0.7), tone(1400, 350, 0.21, 0.8, 0, 0.5)], { duck: 0.45 }),
      stabilize: cue("info", 0.29, [noise(1200, 0.35, 0.8), tone(510, 280, 0.18, 0.35)], { duck: 0.35 }),
      cashOut: cue("critical", 0.36, [tone(520, 260, 0.25, 0.7), noise(1000, 0.22, 0.3), tone(660, 660, 0.14, 0.6, 0.22), tone(990, 990, 0.18, 0.7, 0.33)], { duck: 0.7 }),
      purge: cue("critical", 0.48, [noise(2400, 0.43, 0.9), tone(870, 240, 0.26, 0.7, 0, 0.4), noise(1300, 0.22, 0.5, 0.17)], { duck: 0.75 }),
      breach: cue("critical", 0.57, [noise(2400, 0.55, 0.9), tone(730, 150, 0.58, 0.8, 0, 0.55), tone(1170, 210, 0.33, 0.7, 0.12)], { quiet: 1.1, duck: 1.1 })
    }
  };
})();

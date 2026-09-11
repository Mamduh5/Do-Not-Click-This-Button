# Sound as gameplay feedback

Only finite event effects play. There is no music, machinery loop, battlefield
bed, hover/scroll sound, or passive-production tick. Gameplay, balance, rewards,
and input counting retain their existing behavior.

| Event | What the player hears |
| --- | --- |
| Navigate between lobby, Arena and Breach | The same compact rising navigation cue, smaller than major gameplay events |
| Arena hit / miss | Short midrange contact / softer air tick, with closely related variations |
| Normal death | Restrained falling defeat tick; the same vocabulary for Champions |
| Pulse | Rising sweep with a compact impact |
| Ordinary wave release | Restrained rising start cue; Gigaboss waves use arrival instead |
| Every successful Arena wave clear, including Gigaboss | One compact rising victory cue, with brief ducking of attacks/deaths |
| Gigaboss arrival | Weightier descending double strike |
| Core charge | Three escalating stages timed to the visual windup; later stages use paired chirps |
| Interrupt | A quick crack and rising release; cancels the charge immediately |
| Core impact | Rough descending impact with a midrange transient |
| Core destruction | Longer fracture and collapse, followed by reduced activity |
| Summon | Short paired rising call below the Core warning in priority |
| Overrun | One-shot warnings at 65% and 85%; distinct failure at 100% |
| Breach press | Mechanical click, physical thunk, and short contact resonance |
| Rising Danger | The same button acquires strain, roughness and electrical grit at 25/50/75% |
| Danger / Redline | Short state-entry cues; Redline has its own two-part warning |
| Surge | Electrical snap and descending instability burst |
| Stabilize | Controlled, softer pressure release; resuming output gets a small confirmation |
| Emergency Purge | Broader, more violent pressure discharge |
| Cash Out | Controlled descending shutdown resolving into success |
| Catastrophic Breach | Rough, uncontrolled rupture with a quiet interval afterward |
| Rewards secured | Compact two-note bank confirmation after the outcome; only when Shards are awarded |
| Upgrade or module installed | The same rising purchase confirmation in both games |

There are no separate armor, armor-break, Champion arrival/death, cosmetic skin,
or kill-chain layers. Reward forecasts retain their visuals and exact numbers;
only an actual bank gets the bank sound.

## Mix and technology

Inspection found two custom Web Audio oscillator implementations and Phaser
configured with `noAudio: true` in both games. The lobby has no Phaser scene.
They now share one small Web Audio mixer instead of introducing another library
or enabling a second sound manager. The implementation uses the standard
[Web Audio buffer-source, gain and compressor graph](https://webaudio.github.io/web-audio-api/).

The mono effects are generated before interaction, then copied into reusable
AudioBuffers when ordinary touch, mouse or keyboard input unlocks audio. Sources
are short, overlapping one-shots, never streams. One context survives game resets;
ended nodes disconnect. Hidden pages stop voices and suspend audio, with resume
attempted on return and retried on interaction.

Normal attacks and button contacts group near-simultaneous voices within 22 ms.
Every gameplay contact still counts. Frequent effects have three close variants,
subtle playback-rate variation, four concurrent voices, and restrained gains.
Deaths have a 90 ms gap. Information and critical groups have three voices each.
Important actions lower frequent sounds to 20% temporarily; critical effects also
lower information sounds to 55%. A compressor and output headroom control combined
peaks. Destruction and rupture stop existing voices and leave about 1.1 seconds
of quiet; bank confirmations are scheduled after that space.

Warnings rearm only after dropping eight points below their threshold, and have
a 12-second per-threshold cooldown. Charge stages follow simulation progress, so
pause, interrupts and strikes cancel their scheduled chirps instead of letting
an audio timer run ahead of the game.

Recipes, levels, voice caps, warning thresholds, and banking delays are in
`src/shared/sfxConfig.js`. Arena's old hit was a 150-to-70 Hz oscillator at a
small compounded gain. The new contact emphasizes 310–670 Hz plus a short noise
transient. Removing stacked cosmetic layers and ducking taps makes space for the
more informative effects instead of multiplying every old volume.

The phone-volume adjustment increases pre-compressor drive to 2.5 and output gain
to 0.85, with a fuller decay inside the existing effect durations. The compressor
has a faster attack, firmer ratio and narrower knee for the raised input. Individual
cue levels, voice caps, replay gaps, variation and priority ducking remain intact.
Saved mute/volume values and the slider range are unchanged.

Game cards and both return-to-lobby links play the shared navigation cue in the
source page's gesture-unlocked context and navigate immediately, without waiting
for the sound to finish. A guard prevents duplicate playback until the page is
restored; the destination does not replay it. Modified/new-tab links retain native
browser behavior. Same-page links, hover, scrolling and gameplay buttons do not
trigger this cue. Navigation remains available during post-defeat gameplay quiet.
Mute and volume use the existing shared mixer and settings.

All successful Arena clears use `waveClear` at the existing clear event. There is
no separate Gigaboss defeat recipe or stacked victory playback. Ordinary next
waves retain the subtle `wave` cue; Gigaboss arrival replaces that start cue.
The wave transition timers and automatic progression are unchanged.

## Controls

SFX mute and 0–100% volume appear in lobby Sound effects, Arena Appearance & sound,
and Breach's menu. They share `containmentSfxV1` in localStorage, synchronize across
tabs, and persist across navigation, reload and game resets. Existing per-game
mute opt-outs migrate conservatively. Old save fields remain readable.

Mute immediately zeros the master and cancels active and future voices. Unmuting
does not replay missed events. Zero volume is silent without changing the mute
switch; raising volume while muted keeps it muted. Sliders support keyboard and
touch, with numeric values and accessible labels. If storage is unavailable,
controls still work for the session. Unsupported audio leaves gameplay usable.

## Earlier baseline verification (before the phone-volume adjustment)

The measurements below describe the earlier mix, not the current phone-volume
adjustment. That adjustment is validated only for code/build and ordinary startup
and navigation behavior. Current sound quality is reserved for physical listening.

Passed the gameplay checks, both existing browser smoke suites, desktop/tablet/
mobile five-finger regression suite, production build, audio replay, and production
page/lifecycle checks. Audio replay uses normal opening play and explicit fixtures
for rare boss and machine outcomes; it is not a claim of a natural full endless run.

The offline stress render requests five contacts every 10 ms, plus rapid deaths
and charge/interrupt/destruction events. It reached five active voices, peaked
around 0.446 on a ±1 scale, and had no clipped samples. Within the 300–4000 Hz
measurement band, tested critical cues exceeded concurrent ducked spam by more
than 3:1 RMS. The new single Arena hit had about 2.5 times the old hit's measured
midrange RMS. Output at 75% measured three times output at 25%, with exact silence
at zero. Mid-effect mute cancelled both the rupture and a future reward sound;
unmuting did not resurrect either. Cancelling charge removed its later chirp.

These are signal measurements and browser behavior checks, not perceptual listening
results. No physical phone was connected (`adb devices -l` returned no devices).
The WebKit test binary was unavailable. Phone-speaker audibility, iOS audio unlock,
subjective distinctions, and long-session comfort still need physical listening;
desktop/headphone listening was not performed either. The filtered sample is a
bandwidth check, not a simulation of a particular phone speaker.

`node scripts/audio-transition-smoke.js` checks shared wave victories, automatic
starts, navigation deduplication and mute/volume behavior without listening tests.
`npm run smoke:audio` runs the audio replay and lifecycle suite. For built-page
checks, set `SFX_SMOKE_URL=http://127.0.0.1:4173` while preview is running.
`node scripts/audio-smoke.js --mix-only` rerenders only the signal checks.

Artifacts in `output/playwright/audio/` include `report.json`,
`lifecycle-report.json`, mobile settings screenshots, `stress.wav`, and
`vocabulary.wav`. The vocabulary plays each cue 1.5 seconds apart in the order
listed under `audio.names` in the report. `vocabulary-300-4000hz.wav` is the filtered
comparison. No audio frameworks or runtime dependencies were added.

One existing mobile input issue surfaced during setup: touching Review upgrades
scrolls the shop during pointerdown, and the releasing test finger purchased the
card moved beneath it. The audio replay uses mouse activation for that setup step;
combat and Breach still use actual browser touch injection. This sound pass does
not change that scrolling/input behavior. The existing multitouch suite passed.

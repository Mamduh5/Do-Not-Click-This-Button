# Containment Swarm Data

All arena gameplay tuning lives in data/config files.

Edit spawn rates, enemy visuals, enemy health/speed/rewards, movement variance, wave scaling, click damage, click radius, knockback, combo timing, helper cursor timing, hit particles, kill splatter, shockwave feedback, and autosave timing in `arenaBalanceConfig.js`.

Edit upgrade costs, cost multipliers, max levels, labels, descriptions, and effects in `arenaUpgrades.js`.

Edit click effect skin labels, unlock defaults, effect colors, particle counts, durations, shake values, and helper scales in `clickEffectSkins.js`.

Edit enemy skin labels, unlock defaults, procedural colors, hit/death colors, outlines, and visual scale in `enemySkins.js`.

Systems and UI should consume these data files and avoid hardcoded balance values.

The `endless` section configures cycle length, Overrun, Core strikes, boss traits,
scaling, draft cadence, and module effects. Upgrades are available whenever the
player can afford them. Random module offers are optional and stay available
between waves if the next wave starts without a choice. Existing movement
and spawn caps remain readability limits, not progression endpoints.

`operations.nextWaveDelayMs` controls the automatic break after a clear;
`gigabossTransitionMs` gives incoming Gigaboss waves a longer entrance.
The existing `clearRevealDelayMs` leaves the initial victory beat visible before
the countdown overlay appears. Pause freezes the countdown for shopping or module
choices. Reloading a cleared wave restarts the short countdown without paying again.

`operations.defeatRevealDelayMs` controls the beat before retry controls appear;
`coreStrikeFeedbackMs` controls the visible Core hit. Defeat preserves the enemies
on the battlefield until retry. Overrun and Core integrity provide the cause.

Shared SFX recipes and mixing live in `src/shared/sfxConfig.js`. All click skins use the same restrained hit/death vocabulary; their visual layers never stack sound voices.

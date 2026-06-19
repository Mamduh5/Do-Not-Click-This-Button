# Gameplay Data And Balance

All future gameplay systems must expose designer-tunable values through config/data files. Do not hardcode balance values inside systems, UI bindings, or scene code unless the value is truly structural and not intended for tuning.

Edit base values, instability thresholds, tick/save timing, feedback timing, console limits, and breach reward constants in `src/game/data/balanceConfig.js`.

Edit upgrade costs, multipliers, max levels, and stat effects in `src/game/data/upgrades.js`.

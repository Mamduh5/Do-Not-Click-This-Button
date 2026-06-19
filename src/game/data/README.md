# Gameplay Data And Balance

All future gameplay systems must expose designer-tunable values through config/data files. Do not hardcode balance values inside systems, UI bindings, or scene code unless the value is truly structural and not intended for tuning.

Edit base values, instability thresholds, tick/save timing, feedback timing, console limits, and breach reward constants in `src/game/data/balanceConfig.js`.

Edit upgrade costs, multipliers, max levels, and stat effects in `src/game/data/upgrades.js`.

Edit permanent Anomaly Shard upgrade costs, multipliers, max levels, and effects in `src/game/data/shardUpgrades.js`.

Permanent shard upgrades are applied during stat recomputation before current-run upgrades. Future prestige systems must follow the same config/data pattern: definitions live in data files, while systems only apply generic effect types.

Edit auto cursor timing, audio volumes/frequencies/durations, and shard UI labels in `src/game/data/balanceConfig.js`.

Future feel systems, including sound, animation cadence, and feedback timing, must remain config-driven. UI modules should read tuning from data/config and avoid embedding balance or feel constants directly.

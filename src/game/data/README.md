# Gameplay Data And Balance

All future gameplay systems must expose designer-tunable values through config/data files. Do not hardcode balance values inside systems, UI bindings, or scene code unless the value is truly structural and not intended for tuning.

Edit base values, instability thresholds, tick/save timing, feedback timing, console limits, and breach reward constants in `src/game/data/balanceConfig.js`.

Edit upgrade costs, multipliers, max levels, and stat effects in `src/game/data/upgrades.js`.

Edit permanent Anomaly Shard upgrade costs, multipliers, max levels, and effects in `src/game/data/shardUpgrades.js`.

Permanent shard upgrades are applied during stat recomputation before current-run upgrades. Future prestige systems must follow the same config/data pattern: definitions live in data files, while systems only apply generic effect types.

Edit auto cursor timing, shard UI labels, system menu labels, and reset confirmation copy in `src/game/data/balanceConfig.js`.

Future feel systems, including sound, animation cadence, and feedback timing, must remain config-driven. UI modules should read tuning from data/config and avoid embedding balance or feel constants directly.

The `machine` section configures redline earnings, deterministic surges,
stabilization, emergency purge, draft milestones, and module definitions.
Breach rewards now use current-run Power, despite the legacy `totalPowerDivisor`
field name. The zero minimum prevents empty-run reward farming. Machine Craft's
`productionAdd` effect is applied to final manual/automatic output after run
upgrades so that automation also benefits; the older permanent effects retain
their existing application order.

Shared SFX recipes, voice limits, warning hysteresis, and mix levels live in `src/shared/sfxConfig.js`. `src/shared/sfx.js` preloads synthesized mono buffers and owns the only audio context.

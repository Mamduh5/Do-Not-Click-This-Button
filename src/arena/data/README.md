# Containment Swarm Data

All arena gameplay tuning lives in data/config files.

Edit spawn rates, enemy visuals, enemy health/speed/rewards, movement variance, wave scaling, click damage, click radius, knockback, combo timing, helper cursor timing, hit particles, kill splatter, shockwave feedback, autosave timing, and generated sound volumes/tones in `arenaBalanceConfig.js`.

Edit upgrade costs, cost multipliers, max levels, labels, descriptions, and effects in `arenaUpgrades.js`.

Edit click effect skin labels, unlock defaults, effect colors, particle counts, durations, shake values, helper scales, and skin-specific generated sound tones in `clickEffectSkins.js`.

Systems and UI should consume these data files and avoid hardcoded balance values.

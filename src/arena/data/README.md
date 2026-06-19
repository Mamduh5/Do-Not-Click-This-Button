# Containment Swarm Data

All arena gameplay tuning lives in data/config files.

Edit spawn rates, enemy health/speed/rewards, wave scaling, attack values, projectile behavior, pulse radius, orbiter behavior, feedback timing, autosave timing, and generated sound volumes in `arenaBalanceConfig.js`.

Edit upgrade costs, cost multipliers, max levels, labels, descriptions, and effects in `arenaUpgrades.js`.

Systems and UI should consume these data files and avoid hardcoded balance values.

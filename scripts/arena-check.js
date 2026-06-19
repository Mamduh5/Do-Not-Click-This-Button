"use strict";

const { readFileSync } = require("node:fs");
const { runInThisContext } = require("node:vm");

global.window = global;
global.localStorage = {
  store: new Map(),
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  },
  setItem(key, value) {
    this.store.set(key, String(value));
  },
  removeItem(key) {
    this.store.delete(key);
  }
};

[
  "src/arena/data/arenaBalanceConfig.js",
  "src/arena/data/arenaUpgrades.js",
  "src/arena/systems/NumberFormat.js",
  "src/arena/systems/SaveSystem.js",
  "src/arena/systems/UpgradeSystem.js",
  "src/arena/systems/SoundSystem.js"
].forEach((file) => {
  runInThisContext(readFileSync(file, "utf8"), { filename: file });
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function near(actual, expected, message) {
  assert(Math.abs(actual - expected) < 0.000001, message + " expected " + expected + " got " + actual);
}

const state = ARENA.Save.createDefaultState();
const baseStats = ARENA.Upgrades.computeStats(state);

assert(ARENA.UPGRADE_DEFS.length >= 5, "arena should define at least five upgrades");
near(baseStats.attackDamage, ARENA.BALANCE_CONFIG.attack.damage, "base damage should come from config");
near(baseStats.attackIntervalMs, ARENA.BALANCE_CONFIG.attack.intervalMs, "base interval should come from config");
assert(baseStats.projectileCount === 1, "base projectile count");

state.energy = 200;
assert(ARENA.Upgrades.buy(state, "pulseCapacitor"), "Pulse Capacitor should be purchasable");
assert(ARENA.Upgrades.buy(state, "rapidDischarge"), "Rapid Discharge should be purchasable");
assert(ARENA.Upgrades.buy(state, "widePulse"), "Wide Pulse should be purchasable");
assert(ARENA.Upgrades.buy(state, "splitSignal"), "Split Signal should be purchasable");
assert(ARENA.Upgrades.buy(state, "magneticCollector"), "Magnetic Collector should be purchasable");

const upgradedStats = ARENA.Upgrades.computeStats(state);
assert(upgradedStats.attackDamage > baseStats.attackDamage, "damage upgrade should increase attack damage");
assert(upgradedStats.attackIntervalMs < baseStats.attackIntervalMs, "rate upgrade should reduce attack interval");
assert(upgradedStats.pulseRadius > baseStats.pulseRadius, "wide pulse should increase pulse radius");
assert(upgradedStats.projectileCount === baseStats.projectileCount + 1, "split signal should add a projectile");
assert(upgradedStats.rewardMultiplier > baseStats.rewardMultiplier, "collector should improve rewards");

const spentState = ARENA.Save.validateState(JSON.parse(JSON.stringify(state)));
assert(spentState.upgrades.pulseCapacitor === 1, "save validation should preserve upgrades");
spentState.muted = true;
assert(ARENA.Save.save(spentState), "arena save should write to localStorage test double");
const loaded = ARENA.Save.load();
assert(loaded.muted === true, "mute setting should persist");
assert(loaded.upgrades.splitSignal === 1, "upgrade levels should persist");

const reset = ARENA.Save.reset();
assert(reset.energy === 0, "reset should clear energy");
assert(Object.keys(reset.upgrades).length === 0, "reset should clear upgrades");
assert(reset.muted === false, "reset should restore mute default");

const sound = ARENA.createSoundSystem(reset);
assert(sound.isSupported() === false, "arena sound should tolerate missing AudioContext in checks");
assert(sound.play("attack") === false, "arena sound should not throw before browser unlock");

console.log("Arena checks passed.");

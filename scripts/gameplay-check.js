"use strict";

const { readFileSync } = require("node:fs");
const { runInThisContext } = require("node:vm");

global.window = global;

[
  "src/game/systems/NumberFormat.js",
  "src/game/data/balanceConfig.js",
  "src/game/data/shardUpgrades.js",
  "src/game/systems/ShardUpgradeSystem.js",
  "src/game/systems/SoundSystem.js",
  "src/game/systems/GameState.js",
  "src/game/data/upgrades.js",
  "src/game/systems/UpgradeSystem.js",
  "src/game/systems/InstabilitySystem.js"
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

const state = DNC.createDefaultState();
near(state.instabilityPerClick, 0.65, "base instability per click");

state.power = 200;
assert(DNC.Upgrades.buy(state, "powerTap"), "Power Tap should be affordable at 200 power");
assert(DNC.Upgrades.buy(state, "autoPress"), "Auto-Presser should be affordable after Power Tap");
near(state.powerPerClick, 2, "powerTap recompute");
near(state.powerPerSecond, 1, "autoPress power recompute");
near(state.instabilityPerSecond, 0.12, "autoPress instability recompute");

const saved = JSON.parse(JSON.stringify(state));
const loaded = DNC.validateState(saved);
near(loaded.powerPerClick, state.powerPerClick, "loaded click stat should match recomputed stat");
near(loaded.powerPerSecond, state.powerPerSecond, "loaded passive stat should match recomputed stat");
near(loaded.instabilityPerSecond, state.instabilityPerSecond, "loaded instability stat should match recomputed stat");

const unaffordable = DNC.createDefaultState();
assert(!DNC.Upgrades.canBuy(unaffordable, "powerTap"), "Power Tap should be unaffordable at 0 power");
assert(!DNC.Upgrades.buy(unaffordable, "powerTap"), "buy should guard unaffordable upgrades");
near(unaffordable.powerPerClick, 1, "failed buy should not change stats");

const breachState = DNC.createDefaultState();
breachState.totalPowerEarned = 320;
assert(DNC.Instability.getShardReward(breachState) === 2, "breach reward should scale from earned power");
breachState.breachCount = 4;
assert(DNC.Instability.getShardReward(breachState) === 4, "breach reward should include repeat breach bonus");

const motionState = DNC.validateState({ reducedMotion: true, instability: 82 });
assert(motionState.reducedMotion === true, "reduced motion should survive save validation");
assert(DNC.Instability.getBand(motionState.instability) === "critical", "reduced motion must not suppress critical state");

const audioState = DNC.validateState({ audioEnabled: false, anomalyShards: 3, breachCount: 2 });
assert(audioState.audioEnabled === false, "sound toggle state should survive save validation");
assert(audioState.anomalyShards === 3, "shards should survive save validation");
assert(audioState.breachCount === 2, "breaches should survive save validation");
const sound = DNC.createSoundSystem(audioState);
assert(sound.isSupported() === false, "sound system should tolerate missing AudioContext in checks");
assert(sound.play("click") === false, "sound play should not throw without audio support or unlock");

const shardState = DNC.createDefaultState();
assert(DNC.ShardUpgrades.getCost(shardState, "containmentMemory") === 1, "containmentMemory cost level 0");
assert(!DNC.ShardUpgrades.canBuy(shardState, "containmentMemory"), "cannot buy shard upgrade without shards");
assert(!DNC.ShardUpgrades.buy(shardState, "containmentMemory"), "buy should guard unaffordable shard upgrades");
shardState.anomalyShards = 3;
assert(DNC.ShardUpgrades.buy(shardState, "containmentMemory"), "should buy containmentMemory with enough shards");
assert(shardState.anomalyShards === 2, "shard upgrade should spend shards");
assert(shardState.shardUpgrades.containmentMemory === 1, "shard upgrade level should increase");
near(shardState.instabilityPerClick, 0.65 * 0.96, "containmentMemory modifies instability per click");
assert(DNC.ShardUpgrades.getCost(shardState, "containmentMemory") === 2, "containmentMemory cost level 1");
shardState.shardUpgrades.containmentMemory = 5;
assert(!DNC.ShardUpgrades.canBuy(shardState, "containmentMemory"), "maxed shard upgrade should not be purchasable");
shardState.shardUpgrades.containmentMemory = 1;

shardState.anomalyShards = 10;
assert(DNC.ShardUpgrades.buy(shardState, "residualCharge"), "should buy residualCharge");
assert(DNC.ShardUpgrades.buy(shardState, "shardResonance"), "should buy shardResonance");
near(shardState.powerPerClick, 1 * 1.05 * 1, "shardResonance modifies power per click before run upgrades");
shardState.power = 200;
assert(DNC.Upgrades.buy(shardState, "powerTap"), "normal upgrade should still buy after shard upgrades");
near(shardState.powerPerClick, (1 * 1.05) + 1, "normal upgrades apply after shard upgrades");

const persistedShardState = DNC.validateState(JSON.parse(JSON.stringify(shardState)));
assert(persistedShardState.shardUpgrades.containmentMemory === 1, "save/load preserves containmentMemory");
assert(persistedShardState.shardUpgrades.residualCharge === 1, "save/load preserves residualCharge");
assert(persistedShardState.shardUpgrades.shardResonance === 1, "save/load preserves shardResonance");

const breachResetState = DNC.validateState({
  power: 100,
  instability: 80,
  anomalyShards: 1,
  breachCount: 2,
  upgrades: { powerTap: 2 },
  shardUpgrades: { residualCharge: 1, shardResonance: 1 }
});
DNC.resetRunAfterBreach(breachResetState, 3);
assert(breachResetState.anomalyShards === 4, "breach should add earned shards");
assert(breachResetState.breachCount === 3, "breach should increment breach count");
assert(Object.keys(breachResetState.upgrades).length === 0, "normal upgrades reset through breach");
assert(breachResetState.shardUpgrades.residualCharge === 1, "shard upgrades persist through breach");
assert(breachResetState.shardUpgrades.shardResonance === 1, "shard upgrades persist through breach");
assert(breachResetState.power === 10, "Residual Charge grants starting Power after breach reset");
near(breachResetState.powerPerClick, 1 * 1.05, "Shard Resonance remains after breach reset");

console.log("Gameplay checks passed.");

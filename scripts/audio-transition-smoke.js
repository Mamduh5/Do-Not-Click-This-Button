"use strict";
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.SFX_SMOKE_URL || "http://127.0.0.1:5173";

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ hasTouch: true });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/arena.html");
    await page.waitForFunction(() => window.__containmentArena);
    await page.locator("#arenaSettings summary").click();
    await page.evaluate(() => ContainmentSfx.change({ muted: false, volume: 0.37 }));
    assert(Math.abs(await page.evaluate(() => ContainmentSfx.snapshot().master) - 0.37) < 1e-6);

    // Exercise real kill/clear/update paths with bounded end-of-wave fixtures.
    for (const wave of [1, 6, 7, 14]) {
      const before = await page.evaluate(w => {
        const s = __containmentArena.scene;
        __containmentArena.clearEnemies();
        s.paused = false; s.spawningEnabled = false;
        s.state.wave = w; s.state.wavePhase = "active";
        s.state.waveKills = ARENA.Waves.getDefinition(w).target - 1;
        ARENA.Endless.startWave(s.state);
        s.waveSystem = ARENA.Waves.create(s.state);
        __containmentArena.spawnEnemyAt(480, 250, 1);
        const enemy = s.enemies.at(-1);
        enemy.operationTarget = true; enemy.operationWave = w;
        if (ARENA.Waves.getDefinition(w).champion) ARENA.Endless.setupBoss(s, enemy);
        enemy.health = 1;
        const played = ContainmentSfx.snapshot().played;
        __containmentArena.clickAt(enemy.x, enemy.y);
        // A repeated notification must not replay the victory or pay again.
        s.registerOperationKill(enemy);
        return played;
      }, wave);
      const cleared = await page.evaluate(() => ({
        phase: __containmentArena.scene.state.wavePhase,
        played: ContainmentSfx.snapshot().played,
        transition: __containmentArena.scene.waveSystem.transitionRemainingMs,
        expected: ARENA.Waves.getDefinition(__containmentArena.scene.state.wave + 1).champion
          ? ARENA.BALANCE_CONFIG.operations.gigabossTransitionMs : ARENA.BALANCE_CONFIG.operations.nextWaveDelayMs
      }));
      assert.equal(cleared.phase, "cleared");
      assert.equal(cleared.played.waveClear - (before.waveClear || 0), 1, "one shared victory at wave " + wave);
      assert.equal(cleared.played.bossDefeat || 0, 0, "no separate boss victory");
      assert(cleared.transition > cleared.expected - 500 && cleared.transition <= cleared.expected, "existing transition duration");
      await page.evaluate(() => { __containmentArena.scene.spawningEnabled = true; });
      await page.waitForFunction(w => __containmentArena.scene.state.wave === w + 1, wave);
      const next = await page.evaluate(() => ContainmentSfx.snapshot().played);
      if (wave === 6) {
        assert.equal(next.wave || 0, cleared.played.wave || 0, "boss arrival replaces subtle start");
        assert.equal(next.arrival - (cleared.played.arrival || 0), 1);
      } else {
        assert.equal(next.wave - (cleared.played.wave || 0), 1, "one subtle automatic start");
      }
      await page.evaluate(() => { __containmentArena.scene.spawningEnabled = false; });
    }
    await page.evaluate(() => {
      ContainmentSfx.change({ muted: true });
      for (const name of ["waveClear", "wave", "navigation"]) {
        if (ContainmentSfx.play(name)) throw new Error("Muted cue played: " + name);
      }
      ContainmentSfx.change({ muted: false, volume: 0 });
      for (const name of ["waveClear", "wave", "navigation"]) {
        if (ContainmentSfx.play(name)) throw new Error("Zero-volume cue played: " + name);
      }
    });
    assert.equal(await page.evaluate(() => ContainmentSfx.snapshot().master), 0);

    // Count actual sources and verify output progress before pagehide. Merely
    // accepting play() did not catch the immediate-unload regression.
    await context.addInitScript(() => {
      let before = 0, probe = null, audioContext = null;
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        constructor(options) { super(options); audioContext = this; }
        createBufferSource() {
          const source = super.createBufferSource(), start = source.start.bind(source);
          source.start = (...args) => {
            if (probe && Math.abs(source.buffer.duration - 0.065) < 1e-6) {
              probe.sources++;
              probe.end = (args[0] || this.currentTime) + source.buffer.duration + 0.006;
              source.addEventListener("ended", () => { probe.ended++; });
            }
            return start(...args);
          };
          return source;
        }
      };
      document.addEventListener("click", event => {
        if (!event.target.closest("a")) return;
        before = window.ContainmentSfx?.snapshot().played?.navigation || 0;
        probe = { started: performance.now(), sources: 0, ended: 0 };
      }, true);
      window.addEventListener("click", event => {
        if (!event.target.closest("a")) return;
        Object.assign(probe, {
          count: (ContainmentSfx.snapshot().played?.navigation || 0) - before,
          settings: ContainmentSfx.settings(), master: ContainmentSfx.snapshot().master
        });
      });
      window.addEventListener("beforeunload", () => {
        if (probe) probe.waitMs = performance.now() - probe.started;
      });
      window.addEventListener("pagehide", () => {
        if (!probe) return;
        probe.elapsedMs = performance.now() - probe.started;
        probe.outputTime = audioContext?.getOutputTimestamp().contextTime;
        sessionStorage.setItem("navigationProbe", JSON.stringify(probe));
      });
    });
    await page.goto(base + "/index.html");
    await page.evaluate(() => ContainmentSfx.change({ muted: false, volume: 0.37 }));
    async function navigate(selector, destination, count, keyboard = false) {
      // Rebinding must not introduce another listener or playback.
      await page.evaluate(() => window.dispatchEvent(new Event("DOMContentLoaded")));
      if (keyboard === "mouse") await page.locator(selector).click();
      else if (keyboard) {
        await page.locator(selector).focus(); await page.keyboard.press("Enter");
      } else await page.locator(selector).tap();
      await page.waitForURL("**/" + destination + ".html");
      await page.waitForFunction(() => window.ContainmentSfx);
      const probe = await page.evaluate(() => JSON.parse(sessionStorage.getItem("navigationProbe")));
      assert.equal(probe.count, count, "one navigation cue per activation: " + destination);
      assert.equal(probe.sources, count, "one actual navigation source");
      if (count) {
        assert.equal(probe.ended, 1, "source finishes before pagehide");
        assert(probe.outputTime >= probe.end, "cue reaches output before pagehide");
        console.log("Navigation to " + destination + ": " + Math.round(probe.waitMs) + " ms before navigation");
      }
      if (probe.master !== undefined) assert(Math.abs(probe.master - (probe.settings.muted ? 0 : probe.settings.volume)) < 1e-6);
      assert.equal(await page.evaluate(() => ContainmentSfx.snapshot().played?.navigation || 0), 0, "destination does not replay");
      assert.deepEqual(await page.evaluate(() => ContainmentSfx.settings()), probe.settings, "settings persist across navigation");
    }
    await navigate('.game-card[href="arena.html"]', "arena", 1);
    await navigate('.mode-link', "index", 1, "mouse");
    await navigate('.game-card[href="breach.html"]', "breach", 1, true);
    await page.evaluate(() => { ContainmentSfx.unlock(); ContainmentSfx.play("breach"); });
    await navigate('.mode-link', "index", 1);
    await page.evaluate(() => ContainmentSfx.change({ muted: true }));
    await navigate('.game-card[href="arena.html"]', "arena", 0);
    await navigate('.mode-link', "index", 0);
    await page.evaluate(() => ContainmentSfx.change({ muted: false, volume: 0 }));
    await navigate('.game-card[href="breach.html"]', "breach", 0);
    await navigate('.mode-link', "index", 0);
    await page.evaluate(() => {
      ContainmentSfx.change({ volume: 0.37 });
      window.AudioContext = undefined; window.webkitAudioContext = undefined;
    });
    // Current lobby is still locked: unavailable audio must not block navigation.
    await navigate('.game-card[href="arena.html"]', "arena", 0);
    assert.deepEqual(errors, []);
    console.log("Audio transition checks passed: shared clears, automatic starts, navigation, no duplicates, mute and volume.");
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

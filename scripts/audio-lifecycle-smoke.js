"use strict";
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const { mkdirSync, writeFileSync } = require("node:fs");
const base = process.env.SFX_SMOKE_URL || "http://127.0.0.1:5173";
const output = "output/playwright/audio";
mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch(), errors = [], result = { base };
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, hasTouch: true });
    await context.addInitScript(() => {
      const Native = window.AudioContext;
      window.audioContextsCreated = 0;
      window.AudioContext = class extends Native { constructor(options) { super(options); window.audioContextsCreated++; } };
    });
    const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
    await page.goto(base + "/arena.html"); await page.waitForFunction(() => window.__containmentArena);
    await page.locator("#arenaSettings summary").click();
    await page.locator("#arenaSfxVolume").focus(); await page.keyboard.press("Home");
    assert.equal(await page.evaluate(() => ContainmentSfx.settings().volume), 0);
    await page.keyboard.press("End");
    assert.equal(await page.evaluate(() => ContainmentSfx.settings().volume), 1);
    await page.evaluate(() => {
      const s = __containmentArena.scene; for (let i = 0; i < 4; i++) s.resetPrototype();
      s.state.wave = 14; s.state.waveKills = 0; s.state.wavePhase = "active"; s.spawningEnabled = false;
      __containmentArena.spawnEnemyAt(480, 250, 1000);
      const boss = s.enemies.at(-1); boss.operationTarget = true; boss.operationWave = 14; ARENA.Endless.setupBoss(s, boss);
      s.state.endless.attack = ARENA.BALANCE_CONFIG.endless.bossAttackSeconds;
    });
    await page.waitForFunction(() => ContainmentSfx.snapshot().played.summon > 0);
    await page.evaluate(() => {
      const s = __containmentArena.scene, boss = s.enemies.find(e => e.gigaboss);
      boss.health = 1; __containmentArena.clickAt(boss.x, boss.y);
    });
    assert.equal(await page.evaluate(() => ContainmentSfx.snapshot().played.waveClear), 1);
    assert.equal(await page.evaluate(() => ContainmentSfx.snapshot().played.bossDefeat || 0), 0);
    assert.equal(await page.evaluate(() => audioContextsCreated), 1, "resets reuse one audio context");
    await page.evaluate(() => {
      const s = __containmentArena.scene; s.soundSystem.charge(0.5); s.togglePause();
    });
    await page.waitForTimeout(50);
    assert.equal(await page.evaluate(() => ContainmentSfx.snapshot().active), 0, "pause stops charge and other voices");
    const second = await context.newPage(); second.on("pageerror", e => errors.push(e.message));
    await second.goto(base + "/index.html"); await second.locator(".lobby-sfx summary").click();
    await second.locator("#lobbySfxVolume").fill("37"); await second.locator("#lobbyMuteBtn").click();
    await page.waitForFunction(() => ContainmentSfx.settings().muted && ContainmentSfx.settings().volume === 0.37);
    assert.equal(await page.locator("#arenaSfxVolume").inputValue(), "37", "cross-tab controls synchronize");
    await page.bringToFront();
    await page.locator("#arenaMuteBtn").click();
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForFunction(() => ContainmentSfx.snapshot().state === "suspended");
    assert.equal(await page.evaluate(() => ContainmentSfx.play("hit")), false);
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
    await page.locator("#arenaSfxVolume").click();
    await page.waitForFunction(() => ContainmentSfx.snapshot().state === "running");
    result.lifecycle = "single context, pause, simulated visibility suspension/resume, keyboard volume, cross-tab preferences, summon and Gigaboss defeat passed";
    await second.close();

    for (const mode of ["index", "arena", "breach"]) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(base + "/" + mode + ".html");
      if (mode === "arena") await page.waitForFunction(() => window.__containmentArena);
      await page.locator(mode === "index" ? ".lobby-sfx summary" : mode === "arena" ? "#arenaSettings summary" : "#menuBtn").click();
      const prefix = mode === "index" ? "lobby" : mode;
      assert(await page.locator("#" + prefix + "SfxVolume").isVisible());
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: output + "/production-" + mode + "-settings-mobile.png", fullPage: true });
    }
    result.productionPages = "lobby, Arena and Breach load with mobile settings and no horizontal overflow";
    await context.close();
    const migration = await browser.newContext();
    await migration.addInitScript(() => localStorage.setItem("containmentSwarmSave", JSON.stringify({ muted: true })));
    const migrated = await migration.newPage(); await migrated.goto(base + "/index.html");
    assert.equal(await migrated.evaluate(() => ContainmentSfx.settings().muted), true, "legacy Arena opt-out migrates");
    await migration.close();
    const blocked = await browser.newContext();
    await blocked.addInitScript(() => {
      window.AudioContext = undefined; window.webkitAudioContext = undefined;
      Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage disabled for test"); } });
    });
    const fallback = await blocked.newPage(); fallback.on("pageerror", e => errors.push(e.message));
    await fallback.goto(base + "/index.html"); await fallback.locator(".lobby-sfx summary").click();
    await fallback.locator("#lobbyMuteBtn").click(); await fallback.locator("#lobbySfxVolume").fill("26");
    assert.deepEqual(await fallback.evaluate(() => ContainmentSfx.settings()), { muted: true, volume: 0.26 });
    result.fallback = "legacy opt-out preserved; unavailable audio/storage does not break session controls";
    assert.deepEqual(errors, []);
    console.log("Audio lifecycle and page checks passed.");
  } finally { writeFileSync(output + "/lifecycle-report.json", JSON.stringify({ ...result, errors }, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

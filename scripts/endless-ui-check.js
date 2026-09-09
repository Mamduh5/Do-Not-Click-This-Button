"use strict";
const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const { writeFileSync } = require("node:fs");
(async () => {
 const browser = await chromium.launch({ headless: true });
 const errors = [], results = [];
 for (const width of [1366, 900, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true });
  const page = await context.newPage(); page.on("pageerror", e => errors.push(String(e)));
  await page.goto("http://127.0.0.1:5173/arena.html");
  await page.waitForFunction(() => window.__containmentArena);
  await page.evaluate(() => {
   const s = window.__containmentArena.scene;
   s.state.wave = 28; s.state.waveKills = 0; s.state.wavePhase = "active";
   s.state.endless = ARENA.Endless.fresh(); s.state.endless.attack = 6;
   s.state.pulseCharge = 100; s.waveSystem = ARENA.Waves.create(s.state);
   s.spawnAccumulatorMs = 1000;
  });
  await page.waitForFunction(() => window.__containmentArena.scene.enemies.some(e => e.gigaboss));
  await page.locator("#arenaPauseBtn").click();
  const attack = await page.evaluate(() => window.__containmentArena.scene.state.endless.attack);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__containmentArena.scene.state.endless.attack), attack);
  await page.locator("#arenaResumeBtn").click();
  await page.locator("#arenaPulseBtn").tap();
  assert((await page.evaluate(() => window.__containmentArena.scene.state.endless.attack)) < 3);
  await page.evaluate(() => { const s = window.__containmentArena.scene; s.state.endless.attack = 6; s.refreshUi(); window.scrollTo(0, 0); });
  await page.screenshot({ path: `output/playwright/endless/final-arena-${width}.png`, fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const field = await page.locator(".arena-field").boundingBox();
  assert(field.height >= 260, "battlefield retains meaningful height");
  // Real touch input reaches the rendered enemy at the current responsive scale.
  const enemy = await page.evaluate(() => { const e = window.__containmentArena.scene.enemies[0]; return { x: e.x, y: e.y, health: e.health }; });
  const canvas = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(canvas.x + enemy.x / 960 * canvas.width, canvas.y + enemy.y / 620 * canvas.height);
  assert((await page.evaluate(() => window.__containmentArena.scene.enemies[0].health)) < enemy.health);
  await page.goto("http://127.0.0.1:5173/");
  await page.waitForSelector("#mainBtn");
  await page.evaluate(() => {
   const state = DNC.createDefaultState(); state.instability = 94; state.runPowerEarned = 320; state.totalPowerEarned = 320; state.machine.risk = 1080; DNC.Save.save(state);
  });
  // Navigation's pagehide save must not overwrite the fixture.
  await page.addInitScript(() => localStorage.setItem("doNotClickThisButtonSave", JSON.stringify({ version: 3, power: 320, runPowerEarned: 320, totalPowerEarned: 320, instability: 94, totalClicks: 120, runClicks: 120, machine: { risk: 1080, modules: [], offers: [] } })));
  await page.reload(); await page.waitForSelector("#cashOutBtn");
  await page.screenshot({ path: `output/playwright/endless/final-breach-${width}.png`, fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.locator("#purgeBtn").tap();
  assert.equal(await page.locator("#stabilizeBtn").textContent(), "KEEP PUSHING");
  await page.locator("#cashOutBtn").tap();
  assert.equal(await page.locator("#shardLine").textContent(), "2", "emergency purge forfeits risk bonus");
  assert.equal(await page.locator("#breachOverlay h3").textContent(), "Rewards secured.");
  assert(await page.locator("#breachOverlay").evaluate(el => el.classList.contains("controlled")));
  await page.screenshot({ path: `output/playwright/endless/final-shutdown-${width}.png`, fullPage: true });
  results.push({ width, touch: "passed", bossPauseAndInterrupt: "passed", purgeAndShutdown: "passed", fieldHeight: field.height });
  await context.close();
 }
 assert.equal(errors.length, 0);
 writeFileSync("output/playwright/endless/final-ui-report.json", JSON.stringify({ results, errors }, null, 2));
 await browser.close(); console.log("Final desktop/tablet/mobile gameplay UI checks passed.");
})().catch(e => { console.error(e); process.exit(1); });

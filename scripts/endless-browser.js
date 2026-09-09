"use strict";
const { chromium } = require("@playwright/test");
const { mkdirSync, writeFileSync } = require("node:fs");
const assert = require("node:assert/strict");
const base = "http://127.0.0.1:5173";
const output = "output/playwright/endless";
mkdirSync(output, { recursive: true });
(async () => {
 const browser = await chromium.launch({ headless: true });
 const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
 const page = await context.newPage();
 const errors = []; page.on("pageerror", e => errors.push(String(e)));
 const report = { arenaWaves: [], errors };
 if (!process.argv.includes("--breach-only")) {
 await page.goto(base + "/arena.html");
 await page.waitForFunction(() => window.__containmentArena);
 for (let wave = 1; wave <= 7; wave++) {
  const started = Date.now();
  while (Date.now() - started < 120000) {
   const state = await page.evaluate(() => {
    const s = window.__containmentArena.scene;
    return { phase: s.state.wavePhase, target: s.enemies.filter(e => e.active).map(e => ({ x: e.x, y: e.y }))[0] };
   });
   assert.notEqual(state.phase, "failed", "opening should be approachable with deliberate clicks");
   if (state.phase === "cleared") break;
   if (state.target) {
    const box = await page.locator("canvas").boundingBox();
    await page.mouse.click(box.x + state.target.x / 960 * box.width, box.y + state.target.y / 620 * box.height);
   }
   await page.waitForTimeout(220);
  }
  console.log("Completed real-input wave", wave);
  const snap = await page.evaluate(() => window.__containmentArena.getSnapshot());
  assert.equal(snap.wavePhase, "cleared");
  report.arenaWaves.push({ wave, seconds: (Date.now() - started) / 1000, energy: snap.energy, stats: snap.stats });
  await page.waitForTimeout(450);
  const offer = page.locator("#arenaDraft button").first();
  if (await offer.count()) await offer.click();
  // Buy existing upgrades through the shop, with actual earned currency.
  for (const name of ["Heavier Cursor", "Shock Click", "Auto Tapper", "Field training"]) {
   const card = page.locator(".arena-upgrade-card").filter({ has: page.locator(".upgrade-name", { hasText: name }) });
   if (await card.isVisible() && await card.isEnabled()) await card.click();
  }
  if (wave === 7) {
   await page.screenshot({ path: output + "/arena-cycle-one.png", fullPage: true });
  }
  await page.locator("#arenaNextWaveBtn").click();
 }
 assert.equal((await page.evaluate(() => window.__containmentArena.getSnapshot())).wave, 8);
 // Later encounter fixtures retain the real spawner, clock, damage and UI paths.
 await page.evaluate(() => {
  const s = window.__containmentArena.scene;
  s.enemies.forEach(e => e.destroy()); s.enemies = [];
  s.state.wave = 14; s.state.waveKills = 0; s.state.wavePhase = "active";
  s.state.endless = ARENA.Endless.fresh(); s.waveSystem = ARENA.Waves.create(s.state); s.state.pulseCharge = 100;
  s.stats = ARENA.Upgrades.computeStats(s.state); s.spawnAccumulatorMs = 1000;
 });
 await page.waitForFunction(() => window.__containmentArena.scene.enemies.some(e => e.gigaboss));
 await page.waitForFunction(() => window.__containmentArena.scene.state.endless.attack >= 6);
 await page.screenshot({ path: output + "/arena-boss-warning.png", fullPage: true });
 await page.locator("#arenaPulseBtn").click();
 assert((await page.evaluate(() => window.__containmentArena.scene.state.endless.attack)) < 2);
 // Let this boss demonstrate Core damage, summons and failure at normal speed.
 await page.evaluate(() => { const s = window.__containmentArena.scene; s.state.upgrades.autoTapper = 0; s.stats = ARENA.Upgrades.computeStats(s.state); });
 await page.waitForFunction(() => window.__containmentArena.scene.state.wavePhase === "failed", null, { timeout: 55000 });
 const failedEnergy = await page.evaluate(() => window.__containmentArena.scene.state.energy);
 await page.reload(); await page.waitForFunction(() => window.__containmentArena);
 assert.equal(await page.evaluate(() => window.__containmentArena.scene.state.wavePhase), "failed");
 await page.locator("#arenaTrain").click();
 assert.equal(await page.evaluate(() => window.__containmentArena.scene.state.wave), 13);
 assert.equal(await page.evaluate(() => window.__containmentArena.scene.state.energy), failedEnergy);
 report.bossFailureTraining = "passed";
 await page.setViewportSize({ width: 390, height: 844 });
 await page.screenshot({ path: output + "/arena-mobile.png", fullPage: true });
 assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
 writeFileSync(output + "/arena-report.json", JSON.stringify(report, null, 2));
 }
 await page.setViewportSize({ width: 390, height: 844 });
 await page.goto(base + "/");
 await page.waitForSelector("#machineStatus", { state: "attached" });
 for (let i = 0; i < 130; i++) {
  await page.locator("#mainBtn").click();
  if (i % 12 === 0 && await page.locator("#card-powerTap").isEnabled()) await page.locator("#card-powerTap").click();
 }
 await page.screenshot({ path: output + "/breach-mobile.png", fullPage: true });
 assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
 if (await page.locator("#machineOffers button").count()) await page.locator("#machineOffers button").first().click();
 await page.locator("#stabilizeBtn").click();
 const heat = await page.locator("#instabilityDisplay").textContent();
 await page.waitForTimeout(1200);
 assert(parseInt(await page.locator("#instabilityDisplay").textContent()) < parseInt(heat));
 await page.locator("#cashOutBtn").click();
 assert(await page.locator("#breachOverlay").getAttribute("class").then(s => s.includes("is-open")));
 report.breachOpening = "real clicks, upgrade purchase, draft, stabilization and cash-out passed";
 await context.close();
 for (const controlled of [true, false]) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem("doNotClickThisButtonSave", JSON.stringify({ version: 3, power: 320, totalPowerEarned: 320, runPowerEarned: 320, instability: 94, totalClicks: 120, runClicks: 120, anomalyShards: 7, machine: { risk: 1080, modules: [], offers: [] } })));
  const p = await ctx.newPage(); p.on("pageerror", e => errors.push(String(e)));
  await p.goto(base + "/"); await p.waitForSelector("#cashOutBtn");
  if (controlled) await p.locator("#cashOutBtn").click();
  else await p.waitForSelector("#breachOverlay.is-open", { timeout: 10000 });
  assert.equal(await p.locator("#totalShardLine").textContent(), controlled ? "12" : "9");
  await p.screenshot({ path: output + (controlled ? "/cash-out.png" : "/catastrophe.png"), fullPage: true });
  await ctx.close();
 }
 assert.equal(errors.length, 0);
 writeFileSync(output + "/report.json", JSON.stringify(report, null, 2));
 await browser.close(); console.log("Endless real-input and fixture browser acceptance passed.");
})().catch(e => { console.error(e); process.exit(1); });

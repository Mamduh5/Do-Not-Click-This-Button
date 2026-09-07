"use strict";
const { chromium } = require("@playwright/test");
const { writeFileSync } = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const out = (name) => path.join(__dirname, "polish-arena-" + name);
const report = { waves: [], purchases: [], errors: [] };
const mode = process.argv[2] || "initial";

async function read(page) {
  return page.evaluate(() => {
    const sc = window.__containmentArena.scene;
    const r = sc.game.canvas.getBoundingClientRect();
    return { wave: sc.state.wave, phase: sc.state.wavePhase, kills: sc.state.waveKills,
      energy: sc.state.energy, charge: sc.state.pulseCharge, chain: sc.combo,
      effects: { ...sc.effectCounts }, scale: sc.enemyReadabilityScale, fieldWidth: r.width,
      upgrades: { ...sc.state.upgrades }, damage: sc.stats.clickDamage,
      enemies: sc.enemies.filter(e => e.active).map(e => ({ id: e.debugId, role: e.roleId, hp: e.health,
        distance: Math.hypot(e.x - 480, e.y - 310), hitRadius: e.hitRadius,
        x: r.left + e.x * r.width / 960, y: r.top + e.y * r.height / 620 })) };
  });
}
async function shot(page, name, fullPage = false) {
  await page.screenshot({ path: out(mode + "-" + name + ".png"), fullPage });
}
async function buy(page, name) {
  const before = await read(page);
  const card = page.locator(".arena-upgrade-card").filter({ has: page.locator(".upgrade-name", { hasText: name }) });
  assert(await card.isEnabled(), name + " affordable from real rewards");
  await card.click();
  const after = await read(page);
  assert(after.energy < before.energy, "purchase spends earned Energy");
  assert.notDeepEqual(after.upgrades, before.upgrades, "purchase changes loadout");
  report.purchases.push({ wave: after.wave, name, energyBefore: before.energy, energyAfter: after.energy });
}
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  page.on("pageerror", e => report.errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") report.errors.push(m.text()); });
  try {
    await page.goto("http://127.0.0.1:5180/arena.html", { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__containmentArena);
    // Observe live frames without changing game state, damage, spawning, or timing.
    await page.evaluate(() => {
      const sc = window.__containmentArena.scene;
      const t = window.__polishTelemetry = { clears: [], labels: [], roles: [], pulseKeys: [] };
      window.addEventListener("keydown", e => {
        if (e.code === "Space") t.pulseKeys.push({ wave: sc.state.wave, enemies: sc.enemies.filter(x => x.active).length, charge: sc.state.pulseCharge, focus: e.target.tagName });
      }, true);
      const seen = new WeakSet();
      sc.events.on("postupdate", () => {
        sc.enemies.filter(e => e.active).forEach(e => { if (!t.roles.includes(e.roleId)) t.roles.push(e.roleId); });
        sc.children.list.filter(c => c.type === "Text" && /CHAIN/.test(c.text)).forEach(c => {
          if (!seen.has(c)) { seen.add(c); t.labels.push({ wave: sc.state.wave, text: c.text }); }
        });
        if (sc.state.wavePhase === "cleared") {
          let entry = t.clears.find(c => c.wave === sc.state.wave);
          if (!entry) { entry = { wave: sc.state.wave, clearedAt: sc.time.now, revealAt: sc.clearRevealAt, hiddenOnClear: document.getElementById("arenaOperationOverlay").hidden }; t.clears.push(entry); }
          if (!document.getElementById("arenaOperationOverlay").hidden && !entry.visibleAt) entry.visibleAt = sc.time.now;
        }
      });
    });
    let emptyChecked = false;
    for (let wave = 1; wave <= 5; wave++) {
      const start = Date.now(); let clicks = 0; let pulseDone = false; let champion = false; let feedbackShot = false;
      if (wave === 2) {
        await page.waitForFunction(() => window.__containmentArena.scene.enemies.filter(e => e.active).length >= 3);
        const before = await read(page);
        assert(before.charge === 100, "wave-one manual kills charged pulse");
        assert(before.enemies.some(e => e.distance > 210 + e.hitRadius), "natural edge targets are outside old pulse reach");
        await shot(page, "edge-pulse-ready");
        await page.locator("#arenaPulseBtn").click();
        const after = await read(page);
        assert.equal(after.charge, 0, "pulse spends charge with targets");
        assert(before.enemies.every(e => !after.enemies.some(a => a.id === e.id && a.hp >= e.hp)), "pulse damages every natural target including edges");
        report.edgePulse = { targets: before.enemies, kills: after.kills - before.kills, chargeAfter: after.charge };
        await shot(page, "edge-pulse-effect"); pulseDone = true;
      }
      while (Date.now() - start < 90000) {
        const s = await read(page);
        if (s.phase === "cleared") {
          report.waves.push({ wave, kills: s.kills, seconds: (Date.now() - start) / 1000, clicks, chain: s.chain, energy: s.energy, effects: s.effects });
          break;
        }
        if (!emptyChecked && s.charge === 100 && s.enemies.length === 0) {
          // Canvas clicks leave focus on the body, so Space uses the real keyboard handler.
          await page.keyboard.press("Space");
          const after = await read(page);
          const input = await page.evaluate(() => window.__polishTelemetry.pulseKeys.at(-1));
          if (input.enemies === 0 && input.focus !== "BUTTON") {
            assert.equal(after.charge, 100, "empty pulse holds its charge");
            report.emptyPulse = { wave, input, chargeAfter: after.charge, log: await page.locator("#arenaLog").textContent() };
            assert(report.emptyPulse.log.includes("PULSE HELD"), "empty pulse handler was actually exercised");
            emptyChecked = true;
          }
        }
        const target = s.enemies[0];
        if (target) {
          if (target.role === "champion" && !champion) {
            await shot(page, "champion");
            assert.equal(s.enemies.length, 1, "champion is a separate finale");
            report.champion = target; champion = true;
          }
          await page.mouse.click(target.x, target.y); clicks++;
          if (!feedbackShot && s.chain >= 4) { await shot(page, "wave-" + wave + "-feedback"); feedbackShot = true; }
        }
        await page.waitForTimeout(130);
      }
      assert.equal((await read(page)).phase, "cleared", "wave " + wave + " does not deadlock");
      await page.locator("#arenaOperationOverlay").waitFor({ state: "visible" });
      assert((await page.locator("#arenaWaveHint").textContent()).startsWith("Next:"), "clear instructions preview next wave");
      assert((await page.locator("#arenaPulseHint").textContent()).includes("carries"), "clear pulse instructions describe saved charge");
      await shot(page, "wave-" + wave + "-clear");
      const clear = await read(page);
      await page.waitForTimeout(600);
      const held = await read(page);
      assert(held.energy === clear.energy && held.enemies.length === 0 && held.wave === wave, "manual upgrade break stays stable");
      if (wave < 5) {
        await buy(page, wave === 2 ? "Wider Impact" : "Heavier Cursor");
        await page.locator("#arenaNextWaveBtn").click();
        assert.equal((await read(page)).wave, wave + 1, "release advances exactly one wave");
      }
      console.log("Real Arena wave " + wave + " passed");
    }
    report.telemetry = await page.evaluate(() => window.__polishTelemetry);
    assert(emptyChecked, "natural empty-target pulse covered");
    assert(report.telemetry.roles.includes("runner") && report.telemetry.roles.includes("brute") && report.telemetry.roles.includes("champion"), "real role schedule exercised");
    assert(report.telemetry.labels.every(e => /^(2|5|10|25) CHAIN!?$/.test(e.text)), "only milestone chain callouts");
    assert(report.telemetry.clears.every(e => e.hiddenOnClear && e.visibleAt >= e.revealAt), "all final hits receive the configured victory beat");
    assert.equal((await read(page)).effects.screenFlash || 0, 0, "no full-screen red kill flashes");
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.waitForTimeout(250); await shot(page, "tablet-clear", true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250); await shot(page, "mobile-clear", true);
    report.resized = await read(page);
    await page.locator("#arenaReviewUpgradesBtn").tap().catch(() => page.locator("#arenaReviewUpgradesBtn").click());
    assert.equal(await page.evaluate(() => document.activeElement.id), "arenaShopTitle", "review focuses shop heading");
    await buy(page, "Auto Tapper");
    await shot(page, "mobile-shop");
    const release = await page.locator("#arenaShopNextWaveBtn").boundingBox();
    const card = await page.locator(".arena-upgrade-card").filter({ hasText: "Auto Tapper" }).boundingBox();
    report.mobile = { release, card, scrollY: await page.evaluate(() => scrollY) };
    assert(release.y >= 0 && release.y + release.height <= 844, "release stays in viewport after purchase");
    await page.locator("#arenaShopNextWaveBtn").click();
    await page.waitForFunction(() => window.__containmentArena.scene.state.wave === 6 && window.__containmentArena.scene.enemies.some(e => e.active));
    await shot(page, "mobile-wave-6");
    report.mobile.released = await read(page);
    report.mobile.stageTop = await page.locator(".arena-stage").evaluate(e => e.getBoundingClientRect().top);
    assert(Math.abs(report.mobile.stageTop) < 2, "release returns to combat without reverse scroll");
    await page.setViewportSize({ width: 820, height: 1180 }); await page.waitForTimeout(300);
    await shot(page, "tablet-active", true);
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(300);
    await shot(page, "desktop-active");
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await mobile.goto("http://127.0.0.1:5180/arena.html", { waitUntil: "networkidle" });
    await mobile.waitForFunction(() => window.__containmentArena && window.__containmentArena.scene.enemies.some(e => e.active));
    report.freshMobile = await read(mobile); await shot(mobile, "fresh-mobile");
    const target = report.freshMobile.enemies[0]; await mobile.touchscreen.tap(target.x, target.y);
    report.freshMobile.afterTap = await read(mobile);
    assert(report.freshMobile.afterTap.kills > report.freshMobile.kills, "fresh mobile touch defeats actual target");
    assert.equal(report.errors.length, 0, "no browser errors");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    writeFileSync(out(mode + "-report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });

"use strict";

const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const { mkdirSync } = require("node:fs");
const base = process.argv[2] || "http://127.0.0.1:5173";
const output = "output/playwright/multitouch";

async function contacts(client, type, points = []) {
  await client.send("Input.dispatchTouchEvent", { type, touchPoints: points });
}

function pointsAround(box) {
  return [[-22, -18], [22, -18], [0, 0], [-22, 18], [22, 18]].map(([x, y], id) => ({
    id: id + 1, x: box.x + box.width / 2 + x, y: box.y + box.height / 2 + y,
    radiusX: 4, radiusY: 4
  }));
}

async function checkBreach(page, client, name) {
  await page.goto(base + "/breach.html", { waitUntil: "networkidle" });
  const button = page.locator("#mainBtn");
  await button.scrollIntoViewIfNeeded();
  const points = pointsAround(await button.boundingBox());
  const count = () => page.locator("#clickCount").textContent().then(text => Number(text.match(/[\d,]+/)[0].replaceAll(",", "")));
  const before = await count();
  await contacts(client, "touchStart", points);
  assert.equal(await count(), before + 5, name + " Breach counts all five fingers before release");
  assert(await button.evaluate(el => el.classList.contains("pressed")), "Breach provides its own pressed feedback");
  await contacts(client, "touchEnd");
  assert.equal(await count(), before + 5, "touch release does not generate duplicate presses");
  for (let i = 0; i < 10; i++) {
    await contacts(client, "touchStart", points);
    await contacts(client, "touchEnd");
  }
  assert.equal(await count(), before + 55, "ten five-finger bursts register fifty additional presses");
  await contacts(client, "touchStart", points);
  for (let i = 0; i < 5; i++) {
    await contacts(client, "touchEnd", points.slice(4));
    await contacts(client, "touchStart", points);
  }
  assert.equal(await count(), before + 65, "one finger can retap while four stay held");
  await contacts(client, "touchCancel");
  await contacts(client, "touchStart", points);
  await contacts(client, "touchEnd");
  assert.equal(await count(), before + 70, "cancelled fingers can immediately tap again");
  const gestureBefore = await page.evaluate(() => ({ zoom: visualViewport.scale, scroll: scrollY }));
  await contacts(client, "touchStart", points.slice(0, 2));
  await contacts(client, "touchMove", points.slice(0, 2).map((p, i) => ({ ...p, x: p.x + (i ? 50 : -50), y: p.y - 25 })));
  await page.waitForTimeout(700);
  assert.deepEqual(await page.evaluate(() => ({ zoom: visualViewport.scale, scroll: scrollY })), gestureBefore, "pinch and drag do not zoom or scroll the play surface");
  await contacts(client, "touchEnd");
  assert.equal(await page.evaluate(() => getSelection().toString()), "", "long touch does not select button text");
  const style = await button.evaluate(el => {
    const s = getComputedStyle(el);
    return { touch: s.touchAction, highlight: s.webkitTapHighlightColor, select: s.userSelect, appearance: s.appearance, outline: s.outlineStyle };
  });
  assert.deepEqual(style, { touch: "none", highlight: "rgba(0, 0, 0, 0)", select: "none", appearance: "none", outline: "none" }, "button suppresses browser tap rectangle and native gestures");
  assert(await button.evaluate(el => !el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }))), "game surface cancels context menus");
  await button.click();
  assert.equal(await count(), before + 73, "desktop mouse still counts once");
  await button.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Enter");
  assert.equal(await count(), before + 75, "keyboard activation remains available");
  await page.locator("#menuBtn").tap();
  assert(await page.locator("#systemMenu").isVisible(), "touch menu remains usable");
  await page.locator("#motionBtn").tap();
  await page.keyboard.press("Escape");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Breach has no horizontal overflow");
  await button.scrollIntoViewIfNeeded();
  await page.screenshot({ path: output + "/breach-" + name + ".png", fullPage: true });
}

async function prepareArena(page) {
  await page.evaluate(() => {
    const s = window.__containmentArena.scene;
    s.resetPrototype(); s.spawningEnabled = false;
    s.state.muted = true; s.soundSystem.setMuted(true);
    window.__containmentArena.clearEnemies();
    const positions = [[180, 200], [480, 200], [780, 200], [300, 430], [660, 430]];
    positions.forEach(([x, y]) => {
      window.__containmentArena.spawnEnemyAt(x, y, 1000);
      s.enemies.at(-1).speed = 0;
    });
    window.touchAttacks = [];
    if (!window.originalAttack) {
      window.originalAttack = ARENA.CursorAttack.attack;
      ARENA.CursorAttack.attack = function (scene, x, y, stats, options) {
        window.touchAttacks.push({ x, y, source: options?.source || "manual" });
        return window.originalAttack.apply(this, arguments);
      };
    }
    s.refreshUi();
  });
}

async function checkArena(page, client, name) {
  await page.goto(base + "/arena.html", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__containmentArena);
  await prepareArena(page);
  const canvas = page.locator("#arenaMount canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  const points = [[180, 200], [480, 200], [780, 200], [300, 430], [660, 430]].map(([x, y], id) => ({
    id: id + 1, x: box.x + x / 960 * box.width, y: box.y + y / 620 * box.height
  }));
  await contacts(client, "touchStart", points);
  assert.equal(await page.evaluate(() => window.touchAttacks.length), 5, name + " Arena receives five independent attacks");
  assert.equal(await page.evaluate(() => window.__containmentArena.scene.input.manager.pointers.filter(p => p.wasTouch && p.isDown).length), 5, "five distinct Phaser touch pointers are held");
  assert.deepEqual(await page.evaluate(() => window.__containmentArena.scene.enemies.map(e => e.health)), [998, 998, 998, 998, 998], "each finger damages its own target");
  await contacts(client, "touchEnd");
  for (let i = 0; i < 10; i++) {
    await contacts(client, "touchStart", points);
    await contacts(client, "touchEnd");
  }
  assert.equal(await page.evaluate(() => window.touchAttacks.length), 55, "Arena five-finger spam is not collapsed or duplicated");
  await contacts(client, "touchStart", points);
  await contacts(client, "touchCancel");
  await contacts(client, "touchStart", points);
  await contacts(client, "touchEnd");
  assert.equal(await page.evaluate(() => window.touchAttacks.length), 65, "Arena recovers all pointers after cancellation");
  const gestureBefore = await page.evaluate(() => ({ zoom: visualViewport.scale, scroll: scrollY }));
  await contacts(client, "touchStart", points.slice(0, 2));
  await contacts(client, "touchMove", points.slice(0, 2).map((p, i) => ({ ...p, x: p.x + (i ? 30 : -30) })));
  await page.waitForTimeout(700);
  await contacts(client, "touchEnd");
  assert.deepEqual(await page.evaluate(() => ({ zoom: visualViewport.scale, scroll: scrollY })), gestureBefore, "Arena pinch and hold do not trigger browser gestures");
  await page.mouse.click(points[0].x, points[0].y);
  assert.equal(await page.evaluate(() => window.touchAttacks.length), 68, "Arena mouse registers exactly once");
  await page.locator("#arenaPauseBtn").tap();
  assert(await page.evaluate(() => window.__containmentArena.scene.paused), "touch pause works");
  await contacts(client, "touchStart", points);
  await contacts(client, "touchEnd");
  assert.equal(await page.evaluate(() => window.touchAttacks.length), 68, "paused touches neither attack nor resume the game");
  await page.locator("#arenaPauseBtn").tap();
  await page.evaluate(() => { const s = window.__containmentArena.scene; s.state.pulseCharge = 100; s.refreshUi(); });
  await page.locator("#arenaPulseBtn").tap();
  assert.equal(await page.evaluate(() => window.__containmentArena.scene.state.pulseCharge), 0, "touch Pulse discharges");
  assert.deepEqual(await page.evaluate(() => window.touchAttacks.slice(68).map(a => a.source)), ["pulse"], "UI touches never leak into manual attacks");
  await page.evaluate(() => { const s = window.__containmentArena.scene; s.state.energy = 100; s.refreshUi(); });
  await page.locator(".arena-upgrade-card").filter({ has: page.locator(".upgrade-name", { hasText: "Heavier Cursor" }) }).tap();
  assert(await page.evaluate(() => window.__containmentArena.scene.stats.clickDamage > 2), "touch upgrade purchase works");
  assert.equal(await page.evaluate(() => window.touchAttacks.length), 69, "upgrades do not generate gameplay attacks");
  // A separate finger must still be able to use Pulse while gameplay fingers stay down.
  await canvas.scrollIntoViewIfNeeded();
  await page.evaluate(() => { const s = window.__containmentArena.scene; s.state.pulseCharge = 100; s.refreshUi(); });
  const currentBox = await canvas.boundingBox();
  const held = pointsAround(currentBox).slice(0, 4);
  const pulseBox = await page.locator("#arenaPulseBtn").boundingBox();
  const pulseFinger = { id: 5, x: pulseBox.x + pulseBox.width / 2, y: pulseBox.y + pulseBox.height / 2 };
  await contacts(client, "touchStart", held);
  await contacts(client, "touchStart", held.concat(pulseFinger));
  await contacts(client, "touchEnd", [pulseFinger]);
  assert.equal(await page.evaluate(() => window.__containmentArena.scene.state.pulseCharge), 0, "a fifth finger can use Pulse while four gameplay fingers are held");
  const pauseBox = await page.locator("#arenaPauseBtn").boundingBox();
  const pauseFinger = { id: 5, x: pauseBox.x + pauseBox.width / 2, y: pauseBox.y + pauseBox.height / 2 };
  await contacts(client, "touchStart", held.concat(pauseFinger));
  await contacts(client, "touchEnd", [pauseFinger]);
  assert(await page.evaluate(() => window.__containmentArena.scene.paused), "a fifth finger can pause without a duplicate resume on release");
  await contacts(client, "touchEnd");
  await page.locator("#arenaPauseBtn").tap();
  await page.locator("#arenaSettings summary").tap();
  await page.locator("#arenaSkinSelect").selectOption("pixelShatter");
  assert.equal(await page.evaluate(() => window.__containmentArena.scene.state.activeClickSkin), "pixelShatter", "settings controls work");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Arena has no horizontal overflow");
  await canvas.scrollIntoViewIfNeeded();
  await page.screenshot({ path: output + "/arena-" + name + ".png", fullPage: true });
}

async function checkTransitions(page, name) {
  async function clear(wave) {
    await page.evaluate(wave => {
      const s = window.__containmentArena.scene;
      s.resetPrototype(); s.spawningEnabled = true;
      s.state.wave = wave; s.state.highestWaveCleared = wave - 1;
      s.state.waveKills = ARENA.Waves.getDefinition(wave).target - 1;
      s.waveSystem = ARENA.Waves.create(s.state);
      s.registerOperationKill({ operationTarget: true, operationWave: wave });
    }, wave);
  }
  await clear(1);
  await page.locator("#arenaOperationOverlay").waitFor({ state: "visible" });
  assert.match(await page.locator("#arenaResultHint").textContent(), /Next wave in/);
  await page.locator("#arenaReviewUpgradesBtn").tap();
  const remaining = await page.evaluate(() => window.__containmentArena.scene.waveSystem.transitionRemainingMs);
  await page.waitForTimeout(2400);
  assert.equal(await page.evaluate(() => window.__containmentArena.scene.waveSystem.transitionRemainingMs), remaining, "pause freezes the wave countdown");
  await page.locator("#arenaShopResumeBtn").tap();
  await page.waitForFunction(() => window.__containmentArena.scene.state.wave === 2);
  await page.waitForFunction(() => window.__containmentArena.scene.enemies.some(e => e.active));
  await clear(2);
  const offers = await page.evaluate(() => window.__containmentArena.scene.state.endless.offers.slice());
  assert(offers.length > 0);
  assert.equal(await page.locator(".arena-stage #arenaDraft button").count(), 0, "module choices never appear inside the gameplay area");
  await page.waitForFunction(() => window.__containmentArena.scene.state.wave === 3);
  assert.deepEqual(await page.evaluate(() => window.__containmentArena.scene.state.endless.offers), offers, "automatic waves preserve deferred module choices");
  await clear(6);
  await page.locator("#arenaOperationOverlay").waitFor({ state: "visible" });
  assert.equal(await page.locator("#arenaResultKicker").textContent(), "GIGABOSS INCOMING");
  assert.match(await page.locator("#arenaResultHint").textContent(), /Gigaboss arriving in/);
  await page.locator("#arenaMount").scrollIntoViewIfNeeded();
  await page.screenshot({ path: output + "/gigaboss-transition-" + name + ".png", fullPage: true });
  await page.waitForFunction(() => window.__containmentArena.scene.state.wave === 7);
  await page.waitForFunction(() => window.__containmentArena.scene.enemies.some(e => e.gigaboss));
  assert.equal(await page.locator("#arenaPhase").textContent(), "GIGABOSS ENCOUNTER");
  await page.screenshot({ path: output + "/gigaboss-" + name + ".png", fullPage: true });
}

(async () => {
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const [name, viewport, isMobile] of [
      ["desktop", { width: 1440, height: 900 }, false],
      ["tablet", { width: 820, height: 1180 }, true],
      ["mobile", { width: 390, height: 844 }, true]
    ]) {
      if (process.argv[3] && process.argv[3] !== name) { continue; }
      const context = await browser.newContext({ viewport, hasTouch: true, isMobile });
      const page = await context.newPage();
      const errors = []; page.on("pageerror", error => errors.push(error.message));
      const client = await context.newCDPSession(page);
      await checkBreach(page, client, name);
      await checkArena(page, client, name);
      await checkTransitions(page, name);
      await page.locator(".mode-link").tap();
      await page.waitForURL(base + "/index.html");
      assert.deepEqual(errors, [], "no browser exceptions");
      console.log(name + ": five-finger input, gestures, UI controls and automatic waves passed");
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

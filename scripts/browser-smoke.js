"use strict";

const { chromium } = require("@playwright/test");

const url = process.argv[2] || process.env.DNC_SMOKE_URL || "http://127.0.0.1:5173/";
const SAVE_KEY = "doNotClickThisButtonSave";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

async function checkHeader(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: "networkidle" });

  const header = await page.evaluate(() => {
    function rect(selector) {
      const element = document.querySelector(selector);
      const box = element.getBoundingClientRect();
      return {
        text: element.textContent.trim(),
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        height: box.height
      };
    }

    const metricRects = Array.from(document.querySelectorAll(".sys-metric")).map((element) => {
      const box = element.getBoundingClientRect();
      return {
        text: element.textContent.trim(),
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        height: box.height
      };
    });

    return {
      title: rect(".dnc-title"),
      menu: rect("#menuBtn"),
      status: rect(".status-bar"),
      metrics: metricRects,
      soundInHeader: Boolean(document.querySelector(".dnc-header #soundBtn")),
      motionInHeader: Boolean(document.querySelector(".dnc-header #motionBtn")),
      menuHidden: document.querySelector("#systemMenu").hidden
    };
  });

  assert(header.metrics.length === 2, "header should expose shard and breach metrics");
  assert(header.metrics[0].text.includes("SHARDS"), "SHARDS metric should be present");
  assert(header.metrics[1].text.includes("BREACHES"), "BREACHES metric should be present");
  assert(header.metrics.every((metric) => metric.width > 30 && metric.height > 8), "shard and breach metrics should be readable");
  assert(header.menu.width > 20 && header.menu.height > 10, "menu button should be readable");
  assert(!intersects(header.metrics[0], header.metrics[1]), "SHARDS and BREACHES should not overlap");
  assert(header.metrics.every((metric) => !intersects(metric, header.menu)), "metrics should not overlap the menu button");
  assert(!intersects(header.menu, header.status), "menu button should not overlap the status bar");
  assert(header.menuHidden, "menu should start closed");
  assert(!header.soundInHeader, "sound control should not live in the header");
  assert(!header.motionInHeader, "motion control should not live in the header");
}

async function clickMenuItem(page, selector) {
  await page.click("#menuBtn");
  await page.click(selector);
  await page.click("#menuConfirmBtn");
}

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 760, height: 700 }
    ]) {
      await checkHeader(page, viewport);
    }

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.click("#menuBtn");
    assert(await page.locator("#systemMenu").isVisible(), "menu button should open the menu");
    await page.keyboard.press("Escape");
    assert(!(await page.locator("#systemMenu").isVisible()), "Escape should close the menu");
    await page.click("#menuBtn");
    await page.click(".center-panel");
    assert(!(await page.locator("#systemMenu").isVisible()), "outside click should close the menu");

    await page.click("#menuBtn");
    await page.click("#soundBtn");
    await page.click("#motionBtn");
    await page.reload({ waitUntil: "networkidle" });
    await page.click("#menuBtn");
    assert((await page.locator("#soundBtn").textContent()).includes("OFF"), "sound setting should persist after refresh");
    assert((await page.locator("#motionBtn").textContent()).includes("OFF"), "motion setting should persist after refresh");

    await page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({
        version: 1,
        power: 150,
        totalPowerEarned: 400,
        instability: 66,
        breachCount: 4,
        anomalyShards: 7,
        powerPerClick: 1,
        powerPerSecond: 0,
        instabilityPerClick: 0.65,
        instabilityPerSecond: 0,
        containmentPerSecond: 0,
        upgrades: { powerTap: 2, autoPress: 1 },
        shardUpgrades: { residualCharge: 1, containmentMemory: 1 },
        totalClicks: 20,
        lastSavedAt: Date.now(),
        reducedMotion: true,
        audioEnabled: false
      }));
    }, SAVE_KEY);
    await page.reload({ waitUntil: "networkidle" });
    await clickMenuItem(page, "#resetRunBtn");
    const currentReset = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
    assert(currentReset.anomalyShards === 7, "current-run reset should preserve shards");
    assert(currentReset.breachCount === 4, "current-run reset should preserve breaches");
    assert(currentReset.shardUpgrades.residualCharge === 1, "current-run reset should preserve shard upgrades");
    assert(Object.keys(currentReset.upgrades).length === 0, "current-run reset should clear normal upgrades");
    assert(currentReset.instability === 0, "current-run reset should clear instability");
    assert(currentReset.audioEnabled === false, "current-run reset should preserve sound setting");
    assert(currentReset.reducedMotion === true, "current-run reset should preserve motion setting");

    await clickMenuItem(page, "#deleteSaveBtn");
    const fullReset = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
    assert(fullReset.anomalyShards === 0, "delete all should clear shards");
    assert(fullReset.breachCount === 0, "delete all should clear breaches");
    assert(Object.keys(fullReset.shardUpgrades).length === 0, "delete all should clear shard upgrades");
    assert(fullReset.audioEnabled === true, "delete all should reset sound setting");
    assert(fullReset.reducedMotion === false, "delete all should reset motion setting");
  } finally {
    await browser.close();
  }
}

run()
  .then(() => {
    console.log("Browser smoke checks passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

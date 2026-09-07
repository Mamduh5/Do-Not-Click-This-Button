const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const out = __dirname;
async function ready(page) {
  await page.goto('http://127.0.0.1:5180/arena.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__containmentArena);
  await page.evaluate(() => {
    window.__containmentArena.setSpawning(false);
    window.__containmentArena.clearEnemies();
  });
}

async function fixture(page, name) {
  await page.evaluate(() => {
    const api = window.__containmentArena;
    const scene = api.scene;
    api.clearEnemies();
    const role = ARENA.ENEMY_ROLES.champion;
    const skin = ARENA.EnemySkins.get(scene.state.activeEnemySkin);
    const config = ARENA.BALANCE_CONFIG;
    const radius = config.enemy.radius * config.enemy.visualScale * skin.scale * role.scale * scene.enemyReadabilityScale;
    const inset = Math.max(config.enemy.spawnInset, radius + ARENA.ENEMY_ROLE_FEEDBACK.visibleEdgePadding);
    [[480, inset], [inset, 310], [960 - inset, 310], [480, 620 - inset]].forEach(([x, y]) => {
      const enemy = ARENA.Enemies.create(scene, x, y, 5, undefined, 'champion');
      enemy.speed = 0;
      enemy.nextTurnAt = Number.MAX_SAFE_INTEGER;
      scene.enemies.push(enemy);
    });
    scene.refreshUi();
  });
  await page.waitForTimeout(300);
  const report = await page.evaluate(() => {
    const scene = window.__containmentArena.scene;
    const canvas = scene.game.canvas.getBoundingClientRect();
    const feedback = ARENA.ENEMY_ROLE_FEEDBACK;
    return {
      viewport: { width: innerWidth, height: innerHeight },
      canvas: { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height },
      readabilityScale: scene.enemyReadabilityScale,
      expectedReadabilityScale: Math.max(1, Math.min(ARENA.BALANCE_CONFIG.enemy.smallScreenScaleMax, ARENA.BALANCE_CONFIG.enemy.readableFieldWidth / canvas.width)),
      enemies: scene.enemies.map(enemy => {
        const radius = enemy.baseRadius * enemy.visualScale;
        const markerRadius = radius * feedback.markerRadiusMultiplier + feedback.markerPadding;
        return {
          x: enemy.x, y: enemy.y, visualRadius: radius,
          crownTop: enemy.y - markerRadius * 1.5,
          healthTop: enemy.y - markerRadius - feedback.championHealthBarOffset,
          healthBottom: enemy.y - markerRadius - feedback.championHealthBarOffset + feedback.healthBarHeight
        };
      })
    };
  });
  await page.locator('.arena-field').screenshot({ path: path.join(out, `${name}-field.png`) });
  await page.screenshot({ path: path.join(out, `${name}-page.png`), fullPage: true });
  return report;
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  try {
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    const desktop = await desktopContext.newPage();
    desktop.on('pageerror', error => errors.push(error.message));
    await ready(desktop);
    const desktopReport = await fixture(desktop, 'polish-edge-desktop');
    await desktop.setViewportSize({ width: 390, height: 844 });
    await desktop.waitForTimeout(400);
    const resizedReport = await fixture(desktop, 'polish-edge-resized-mobile');

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mobile = await mobileContext.newPage();
    mobile.on('pageerror', error => errors.push(error.message));
    await ready(mobile);
    const mobileReport = await fixture(mobile, 'polish-edge-fresh-mobile');
    const result = { fixtureOnly: true, desktop: desktopReport, resizedMobile: resizedReport, freshMobile: mobileReport, errors };
    fs.writeFileSync(path.join(out, 'polish-edge-report.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

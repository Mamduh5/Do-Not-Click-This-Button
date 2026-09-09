async (page) => {
  await page.keyboard.press('p');
  await page.waitForFunction(() => window.__containmentArena.scene.state.endless.attack >= 6);
  await page.screenshot({ path: 'output/playwright/correction-core-warning.png' });
  await page.waitForFunction(() => window.__containmentArena.scene.state.endless.core < 100);
  await page.screenshot({ path: 'output/playwright/correction-core-hit.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.arena-field').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/playwright/correction-core-mobile.png' });
  await page.waitForFunction(() => window.__containmentArena.scene.state.wavePhase === 'failed', null, { timeout: 40000 });
  await page.locator('#arenaRetry').waitFor({ state: 'visible' });
  const state = await page.evaluate(() => {
    const s = window.__containmentArena.scene;
    return { core: s.state.endless.core, label: s.coreLabel.text, boss: s.enemies.some(e => e.active && e.gigaboss), upgrades: s.state.upgrades, modules: s.state.endless.modules };
  });
  if (state.core !== 0 || !state.boss || !state.label.includes('DESTROYED') || Object.keys(state.upgrades).length || state.modules.length) throw new Error(JSON.stringify(state));
  if (!(await page.locator('#arenaDefense').textContent()).includes('GIGABOSS STRIKE')) throw new Error('Wrong defeat summary');
  await page.locator('.arena-field').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/playwright/correction-core-defeat-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: 'output/playwright/correction-core-defeat.png' });
}

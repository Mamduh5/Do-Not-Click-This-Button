async (page) => {
  await page.goto('http://127.0.0.1:5180/arena.html');
  await page.waitForFunction(() => Boolean(window.__containmentArena));
  await page.locator('#arenaTrain').click();
  await page.locator('.arena-field').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__containmentArena.scene.state.endless.pressure >= 70);
  await page.screenshot({ path: 'output/playwright/correction-arena-pressure-mobile.png' });
  await page.waitForFunction(() => window.__containmentArena.scene.state.wavePhase === 'failed');
  await page.locator('#arenaRetry').waitFor({ state: 'visible' });
  await page.locator('.arena-field').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/playwright/correction-arena-mobile.png' });
  const result = await page.evaluate(() => {
    const s = window.__containmentArena.scene;
    return { phase: s.state.wavePhase, wave: s.state.wave, enemies: s.enemies.length, text: s.defenseLabel.text, width: s.defenseLabel.displayWidth, font: s.defenseLabel.style.fontSize };
  });
  if (result.phase !== 'failed' || result.wave !== 6 || result.enemies < 1 || result.width > 960) throw new Error(JSON.stringify(result));
}

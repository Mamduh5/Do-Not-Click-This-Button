async (page) => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  await page.locator('#mainBtn').waitFor({ state: 'visible' });
  await page.screenshot({ path: 'output/playwright/correction-breach-opening.png' });
  assert(await page.locator('#stabilizeBtn').isHidden(), 'irrelevant controls start quiet');
  await page.locator('#mainBtn').click();
  assert(await page.locator('#stabilizeBtn').isVisible(), 'cooling is available when heat exists');
  // Keyboard activation is normal button input and leaves every upgrade untouched.
  for (let i = 0; i < 125 && !await page.locator('#machineOffers button').count(); i++) {
    await page.locator('#mainBtn').press('Enter');
    await page.waitForTimeout(75);
  }
  assert(await page.locator('#machineOffers button').count() === 3, 'random build offers still appear');
  const offerText = await page.locator('#machineOffers').textContent();
  const countBefore = await page.locator('#clickCount').textContent();
  for (let i = 0; i < 6; i++) await page.locator('#mainBtn').press('Enter');
  assert(await page.locator('#clickCount').textContent() !== countBefore, 'main button works while offers are pending');
  assert(await page.locator('#machineOffers').textContent() === offerText, 'ignored offers remain available');
  await page.screenshot({ path: 'output/playwright/correction-breach-deferred-offers.png' });
  for (let i = 0; i < 100 && !await page.locator('#breachOverlay').isVisible(); i++) {
    await page.locator('#mainBtn').press('Enter');
    await page.waitForTimeout(75);
  }
  assert(await page.locator('#breachOverlay').isVisible(), 'player can push into a natural breach without upgrading');
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('doNotClickThisButtonSave')));
  assert(state.breachCount === 1 && Object.keys(state.upgrades).length === 0, 'endless reset and poor strategic choices preserved');
  await page.screenshot({ path: 'output/playwright/correction-breach-result.png' });
  await page.locator('#breachContinueBtn').click();
  await page.locator('#mainBtn').click();
  assert(!await page.locator('#breachOverlay').isVisible(), 'next run starts without a required purchase');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/playwright/correction-breach-mobile.png' });
}

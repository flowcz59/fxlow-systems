const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const url = process.env.TEST_URL || 'http://127.0.0.1:4317/';
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const dir = '../tmp/focus'; fs.mkdirSync(dir, {recursive:true});
  const start = async () => { await page.goto(url); await page.evaluate(() => document.fonts.ready); };
  const stage = () => page.locator('#focus-chapter').inputValue();
  const isFocus = () => page.locator('#focus-toggle').getAttribute('aria-pressed');
  const layout = async label => {
    const result = await page.evaluate(() => ({width:innerWidth, scroll:document.documentElement.scrollWidth, clipped:[...document.querySelectorAll('#focus-reader select,#focus-controls button,.focus-toggle')].filter(el => {const box=el.getBoundingClientRect(); return box.width && (box.x<0 || box.right>innerWidth+1);}).map(el=>el.id)}));
    assert.ok(result.scroll <= result.width + 1, `${label}: horizontal overflow ${JSON.stringify(result)}`);
    assert.deepEqual(result.clipped, [], label);
  };
  await start();
  assert.equal(await isFocus(), 'false');
  assert.match(await page.locator('#hero-title').innerText(), /Je relie/);
  assert.equal(await page.locator('#focus-reader').isVisible(), false);
  await page.locator('#focus-toggle').focus(); await page.keyboard.press('Enter');
  assert.equal(await stage(), '0');
  assert.equal(await page.locator('#focus-prev').isDisabled(), true);
  assert.equal(await page.locator('.mindmap').isVisible(), false);
  for (let index=0; index<8; index++) {
    assert.equal(await stage(), String(index));
    assert.equal(await page.locator('#main > section:visible').count(), 1, 'Only one chapter is exposed');
    assert.equal(await page.locator('.sound-playground').isVisible(), false);
    if (index>=1 && index<=3) {
      assert.equal(await page.locator('.project:visible').count(), 1, 'One project at a time');
      assert.equal(await page.locator('.project:visible').getAttribute('open'), '');
    }
    await layout(`desktop chapter ${index}`);
    await page.screenshot({path:`${dir}/verified-focus-${index}.png`,fullPage:true});
    if (index<7) { await page.locator('#focus-next').focus(); await page.keyboard.press('Enter'); }
  }
  assert.match(await page.locator('#focus-next').getAttribute('aria-label'), /présentation/);
  await page.locator('#focus-prev').click(); assert.equal(await stage(), '6');
  await page.goBack(); assert.equal(await stage(), '7', 'Browser history follows the selected chapter');
  await page.goForward(); assert.equal(await stage(), '6');

  // Persist a bookmark and actual scroll position; page loading must not steal focus.
  await page.setViewportSize({width:390,height:700});
  await page.locator('#focus-chapter').selectOption('1');
  await page.evaluate(() => window.scrollTo({top:430,behavior:'instant'})); await page.waitForTimeout(220);
  const before = await page.evaluate(() => window.scrollY);
  await page.reload(); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(250);
  assert.equal(await stage(), '1');
  assert.ok(Math.abs(await page.evaluate(() => window.scrollY)-before)<5, 'The reading position is restored');
  assert.equal(await page.evaluate(() => document.activeElement.tagName), 'BODY');
  await page.goto(`${url}#projet-mcp`); assert.equal(await stage(), '2', 'An explicit deep link wins over the bookmark');

  // Interactive extras stay optional, and retain their functionality when deliberately opened.
  await page.locator('#focus-chapter').selectOption('4');
  assert.equal(await page.locator('#focus-lab-content').isVisible(), false);
  await page.locator('#focus-lab-toggle').click();
  await page.locator('[data-preset="club"]').click();
  assert.match(await page.locator('#lab-recipe').textContent(), /CLUB/);
  await page.locator('#lab-radius').focus(); await page.keyboard.press('Home');
  assert.equal(await page.locator('#radius-value').textContent(), '0 px');
  await page.locator('#focus-lab-toggle').click();
  assert.equal(await page.locator('#focus-lab-content').isVisible(), false);
  await page.locator('#focus-chapter').selectOption('5');
  await page.locator('[data-focus-exit]').click();
  assert.equal(await isFocus(), 'false');
  assert.equal(await page.locator('.sound-playground').isVisible(), true);
  assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'), 'false', 'Leaving Focus never starts audio');
  assert.equal(await page.locator('#main > section:visible').count(), 6);
  await page.locator('#sound-toggle').click();
  assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'), 'true');
  // A programmatic click avoids the normal offscreen audio-stop path and isolates the Focus transition.
  await page.evaluate(() => document.querySelector('#focus-toggle').click());
  await page.waitForTimeout(180);
  assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'), 'false', 'Entering Focus stops playing audio');
  assert.equal(await page.locator('#vinyle').getAttribute('aria-disabled'), 'true');

  for (const width of [320,390,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    for(let index=0;index<8;index++) {
      await page.locator('#focus-chapter').selectOption(String(index)); await layout(`${width}: chapter ${index}`);
    }
    await page.locator('#focus-chapter').selectOption('4'); await page.locator('#focus-lab-toggle').click(); await layout(`${width}: expanded lab`);
    await page.locator('#focus-chapter').selectOption('0'); await page.screenshot({path:`${dir}/focus-home-${width}.png`,fullPage:true});
    await page.locator('#focus-toggle').click(); await layout(`${width}: exploration`);
    await page.screenshot({path:`${dir}/exploration-home-${width}.png`});
    await page.locator('#focus-toggle').click();
  }
  // Hidden chapters cannot become keyboard destinations.
  await page.locator('#focus-chapter').selectOption('0'); await page.locator('.skip-link').focus();
  for(let i=0;i<12;i++) {
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('[hidden],.mindmap,.sound-playground,.header-nav')), false);
  }
  const noStorage = await browser.newPage();
  await noStorage.addInitScript(() => { Storage.prototype.getItem=()=>{throw new Error('storage blocked')};Storage.prototype.setItem=()=>{throw new Error('storage blocked')}; });
  noStorage.on('pageerror', error => errors.push(error.message));
  await noStorage.goto(url); await noStorage.locator('#focus-toggle').click(); await noStorage.locator('#focus-next').click();
  assert.equal(await noStorage.locator('#focus-chapter').inputValue(), '1', 'Storage is optional');
  await noStorage.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({chapters:8,keyboard:'passed',history:'passed',bookmark:'passed',optionalLab:'passed',audioStop:'passed',responsive:'320 / 390 / 768 / 1024 / 1440',errors}));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });

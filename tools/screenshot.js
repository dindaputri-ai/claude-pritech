// Screenshots index.html at 375 / 768 / 1440 plus open hotspot panels.
// Usage: node tools/screenshot.js   (FONT_CACHE=dir optional, see assets-src/make-assets.js)
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT = path.resolve(__dirname, '../output/screens');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

async function routeFonts(page) {
  const dir = process.env.FONT_CACHE;
  if (!dir) return;
  const map = Object.fromEntries(fs.readFileSync(path.join(dir, 'map.txt'), 'utf8').trim().split('\n').map(l => l.split(' ')));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => {
    const url = route.request().url();
    if (url.includes('googleapis')) return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(dir, 'css.txt')) });
    const f = map[url];
    return f ? route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(dir, f)) }) : route.abort();
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const sizes = [
    { name: 'mobile-375', width: 375, height: 812, touch: true },
    { name: 'tablet-768', width: 768, height: 1024, touch: true },
    { name: 'desktop-1440', width: 1440, height: 900, touch: false },
  ];
  for (const s of sizes) {
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 1, hasTouch: s.touch, isMobile: s.touch && s.width < 500 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await routeFonts(page);
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const fontsOk = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join(','));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    // scroll through so reveals and the agenda cable trigger
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 300) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(60); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, s.name + '-full.png'), fullPage: true });
    await page.screenshot({ path: path.join(OUT, s.name + '-hero.png') });
    // each section on its own, scrolled into view so scroll effects are live
    const ids = ['itk-agenda', 'itk-speaker', 'itk-erp', 'itk-cta'];
    for (const id of ids) {
      await page.evaluate(i => { const el = document.getElementById(i); window.scrollTo(0, el.offsetTop + el.offsetHeight * .5 - window.innerHeight * .5); }, id);
      await page.waitForTimeout(700);
      await page.locator('#' + id).screenshot({ path: path.join(OUT, s.name + '-' + id.replace('itk-', '') + '.png') });
    }
    await page.locator('footer').screenshot({ path: path.join(OUT, s.name + '-footer.png') });
    // studio viewport
    await page.evaluate(() => document.getElementById('itk-studio').scrollIntoView());
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, s.name + '-studio.png') });
    // open the speaker panel via its hotspot, then the clock panel via keyboard
    await page.click('.itk-hotspot[data-panel="speaker"]', { force: true });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, s.name + '-panel-speaker.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    const closed = await page.evaluate(() => !document.querySelector('[data-itk-panel]').classList.contains('itk-open'));
    await page.click('.itk-legend [data-panel="clock"]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, s.name + '-panel-clock.png') });
    console.log(s.name, { fonts: fontsOk, overflowX: overflow, escCloses: closed, errors });
    await ctx.close();
  }
  await browser.close();
})();

// Screenshots studio-3d.html through its main states at 390 / 768 / 1440.
// Usage: node tools/screenshot-3d.js
//   FONT_CACHE=dir  serve Google Fonts from css.txt + map.txt (see assets-src/make-assets.js)
//   THREE_CACHE=dir serve three.min.js, OrbitControls.js, RoomEnvironment.js locally
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT = path.resolve(__dirname, '../output/screens-3d');
const PAGE = 'file://' + path.resolve(__dirname, '../studio-3d.html');

async function route(page) {
  const fdir = process.env.FONT_CACHE, tdir = process.env.THREE_CACHE;
  if (fdir) {
    const map = Object.fromEntries(fs.readFileSync(path.join(fdir, 'map.txt'), 'utf8').trim().split('\n').map(l => l.split(' ')));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => {
      const u = r.request().url();
      if (u.includes('googleapis')) return r.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(fdir, 'css.txt')) });
      return map[u] ? r.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(fdir, map[u])) }) : r.abort();
    });
  }
  if (tdir) {
    await page.route(/cdn\.jsdelivr\.net\/npm\/three/, r => {
      const f = path.join(tdir, path.basename(new URL(r.request().url()).pathname));
      return fs.existsSync(f) ? r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(f) }) : r.abort();
    });
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const sizes = [
    { name: 'mobile-390', width: 390, height: 844, touch: true },
    { name: 'tablet-768', width: 768, height: 1024, touch: true },
    { name: 'desktop-1440', width: 1440, height: 900, touch: false },
  ];
  for (const s of sizes) {
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, hasTouch: s.touch, isMobile: s.touch && s.width < 500 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text())) errors.push(m.text()); });
    await route(page);
    await page.goto(PAGE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(9600);
    const shot = n => page.screenshot({ path: path.join(OUT, `${s.name}-${n}.png`) });
    console.log(s.name, 'fps', (await page.evaluate(() => window.__itkFps())).toFixed(1));
    await shot('1-intro');
    await page.click('[data-go="explore"]');
    await page.waitForTimeout(5400);
    await shot('2-explore');
    await page.click('.itk-hs[aria-label^="Mikrofon"]', { force: true });
    await page.waitForTimeout(5400);
    await shot('3-hotspot-mic');
    await page.click('[data-tour-next]');
    await page.waitForTimeout(4800);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(4200);
    await page.click('[data-mode="build"]');
    await page.waitForTimeout(4800);
    await page.click('[data-opt="broadcast"]');
    await page.waitForTimeout(2700);
    await shot('4-build-mic');
    await page.click('[data-step-next]'); await page.waitForTimeout(1200);
    await page.click('[data-opt="oranye"]'); await page.waitForTimeout(4200);
    await page.click('[data-step-next]'); await page.waitForTimeout(1200);
    await page.click('[data-opt="kerja"]'); await page.waitForTimeout(4200);
    await shot('5-build-chair');
    await page.click('[data-step-next]'); await page.waitForTimeout(1200);
    await page.click('[data-opt="malam"]'); await page.waitForTimeout(5400);
    await shot('6-build-light');
    await page.click('[data-step-next]'); await page.waitForTimeout(5400);
    await shot('7-done');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(s.name, { overflow, errors });
    await ctx.close();
  }
  await browser.close();
})();

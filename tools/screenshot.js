// Screenshots index.html at 375 / 768 / 1440 (3D on) plus a static-fallback pass,
// and reports text contrast for the main color pairs.
// Usage: node tools/screenshot.js   (FONT_CACHE / THREE_CACHE optional, see tools/screenshot-3d.js)
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT = path.resolve(__dirname, '../output/screens');
const PAGE = 'file://' + path.resolve(__dirname, '../index.html');

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

// WCAG contrast of rendered text against the nearest solid background
async function contrast(page) {
  return page.evaluate(() => {
    const lum = c => { const v = c.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const parse = s => { const m = s.match(/[\d.]+/g).map(Number); return { c: m.slice(0, 3), a: m[3] == null ? 1 : m[3] }; };
    const bgOf = el => { for (let e = el; e; e = e.parentElement) { const b = parse(getComputedStyle(e).backgroundColor); if (b.a > .5) return b.c; } return [253, 251, 248]; };
    const mix = (fg, bg) => fg.c.map((x, i) => Math.round(x * fg.a + bg[i] * (1 - fg.a)));
    const sel = ['.itk-label', '.itk-lead', '.itk-meta-k', '.itk-meta-v', '.itk-cd small', '.itk-cd-note', '.itk-step p', '.itk-node', '.itk-btn--primary', '.itk-btn--glass', '.itk-btn--ink', '.itk-speaker-bio', '.itk-erp-hint', '.itk-erp-links span', '.itk-cta-small', '.itk-footer-bottom', '.itk-nav-links a', '.itk-tags span', '.itk-mod'];
    return sel.map(s => {
      const el = document.querySelector(s); if (!el) return null;
      const cs = getComputedStyle(el), bg = bgOf(el), fg = mix(parse(cs.color), bg);
      const L1 = lum(fg), L2 = lum(bg), r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
      const large = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
      return { s, ratio: +r.toFixed(2), size: cs.fontSize, ok: r >= (large ? 3 : 4.5) };
    }).filter(Boolean);
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const sizes = [
    { name: 'mobile-375', width: 375, height: 812, touch: true },
    { name: 'tablet-768', width: 768, height: 1024, touch: true },
    { name: 'desktop-1440', width: 1440, height: 900, touch: false },
  ];
  const variant = process.argv[2] === 'static' ? '?static' : '';
  for (const s of sizes) {
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, hasTouch: s.touch, isMobile: s.touch && s.width < 500 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND/.test(m.text())) errors.push(m.text()); });
    await route(page);
    await page.goto(PAGE + variant, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // reveal transitions crawl while software WebGL hogs the main thread; skip them for capture
    await page.addStyleTag({ content: '.itk-reveal, .itk-step-body { transition: none !important; }' });
    const tag = s.name + (variant ? '-static' : '');
    const shot = n => page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
    const wait3d = variant ? 900 : 9000;
    await page.waitForTimeout(wait3d);
    await shot('1-hero');
    for (const id of ['itk-studio', 'itk-agenda', 'itk-speaker', 'itk-erp', 'itk-cta']) {
      await page.evaluate(i => { const el = document.getElementById(i); window.scrollTo(0, el.offsetTop + Math.max(0, el.offsetHeight - innerHeight) / 2); }, id);
      await page.waitForTimeout(id === 'itk-studio' || id === 'itk-erp' ? wait3d : 2500);
      await page.locator('#' + id).screenshot({ path: path.join(OUT, `${tag}-${id.replace('itk-', '')}.png`) });
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(800);
    await shot('footer');
    // open a hotspot panel, then the clock panel from the legend
    await page.evaluate(() => document.getElementById('itk-studio').scrollIntoView());
    await page.waitForTimeout(variant ? 600 : 4000);
    await page.locator('.itk-hs[data-panel="speaker"]').dispatchEvent('click');
    await page.waitForTimeout(1500);
    await shot('panel-speaker');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    const closed = await page.evaluate(() => !document.querySelector('[data-itk-panel]').classList.contains('itk-open'));
    await page.click('.itk-legend [data-panel="clock"]');
    await page.waitForTimeout(1500);
    await shot('panel-clock');
    await page.keyboard.press('Escape');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const live = await page.evaluate(() => [...document.querySelectorAll('[data-itk-3d]')].map(e => e.getAttribute('data-itk-3d') + ':' + e.classList.contains('itk-live')).join(' '));
    const c = await contrast(page);
    console.log(tag, { overflow, escCloses: closed, live, errors });
    console.log('  contrast fails:', c.filter(x => !x.ok));
    if (s.name === 'desktop-1440') console.log('  contrast all:', c.map(x => x.s + ' ' + x.ratio).join(' | '));
    await ctx.close();
  }
  await browser.close();
})();

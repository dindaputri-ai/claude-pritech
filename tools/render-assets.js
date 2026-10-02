// Renders the static fallback / share images from the live Three.js scenes in index.html,
// compresses them (WebP + PNG/JPG, each under 300 KB) and writes the measured hotspot
// positions back into index.html (ITK_STATIC).
// Usage: node tools/render-assets.js
//   needs playwright + sharp; FONT_CACHE / THREE_CACHE as in tools/screenshot-3d.js when offline
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const PAGE = 'file://' + path.join(ROOT, 'index.html');
const LIMIT = 300 * 1024;

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

// encode under the size limit, stepping quality down if needed
async function encode(buf, file, fmt) {
  for (let q = 86; q >= 50; q -= 6) {
    let img = sharp(buf);
    if (fmt === 'webp') img = img.webp({ quality: q, effort: 6 });
    if (fmt === 'jpg') img = img.jpeg({ quality: q, mozjpeg: true });
    if (fmt === 'png') img = img.png({ palette: true, quality: q + 10 > 100 ? 100 : q + 10, effort: 10, dither: .9 });
    const out = await img.toBuffer();
    if (out.length <= LIMIT || q <= 50) { fs.writeFileSync(file, out); return out.length; }
  }
}

const JOBS = [
  { mode: 'hero', w: 1600, h: 1000, name: 'hero-fallback', formats: ['png', 'webp'] },
  { mode: 'og', w: 1200, h: 630, name: 'og-share', formats: ['jpg', 'webp'] },
  { mode: 'studio-16x9', w: 1920, h: 1080, name: 'studio-bg-16x9', formats: ['jpg', 'webp'], key: 'studio16x9' },
  { mode: 'studio-9x16', w: 1080, h: 1920, name: 'studio-bg-9x16', formats: ['jpg', 'webp'], key: 'studio9x16' },
  { mode: 'erp', w: 1000, h: 1000, name: 'erp-fallback', formats: ['jpg', 'webp'], key: 'erp' },
];

(async () => {
  const only = process.argv[2];
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const positions = {};
  for (const j of JOBS.filter(j => !only || j.mode === only)) {
    const page = await browser.newPage({ viewport: { width: j.w, height: j.h } });
    page.on('pageerror', e => console.log('  pageerror', e.message));
    await route(page);
    await page.goto(PAGE + '?itk-render=' + j.mode);
    await page.waitForFunction(() => window.__itkReady, null, { timeout: 240000, polling: 500 });
    const ready = await page.evaluate(() => window.__itkReady);
    if (ready.error) throw new Error(j.mode + ': ' + ready.error);
    if (j.key) positions[j.key] = ready;
    const buf = await page.screenshot({ type: 'png' });
    for (const f of j.formats) {
      const size = await encode(buf, path.join(ASSETS, `${j.name}.${f}`), f);
      console.log(`${j.name}.${f}`, Math.round(size / 1024) + ' KB');
    }
    await page.close();
  }
  await browser.close();
  if (Object.keys(positions).length) {
    const file = path.join(ROOT, 'index.html');
    let html = fs.readFileSync(file, 'utf8');
    const m = html.match(/var ITK_STATIC = (\{.*\});/);
    const cur = JSON.parse(m[1]);
    Object.assign(cur, positions);
    html = html.replace(m[0], 'var ITK_STATIC = ' + JSON.stringify(cur) + ';');
    fs.writeFileSync(file, html);
    console.log('ITK_STATIC updated', JSON.stringify(positions));
  }
})();

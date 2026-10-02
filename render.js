// Renders the poster HTML files to PNG at 2x.
// Usage: node render.js   (needs the playwright package)
const path = require('path');
const { chromium } = require('playwright');

const jobs = [
  { file: 'feed-1080x1350.html', out: 'output/feed.png', width: 1080, height: 1350 },
  { file: 'story-1080x1920.html', out: 'output/story.png', width: 1080, height: 1920 },
];

(async () => {
  const browser = await chromium.launch();
  for (const job of jobs.filter(j => require('fs').existsSync(path.resolve(__dirname, j.file)))) {
    const page = await browser.newPage({
      viewport: { width: job.width, height: job.height },
      deviceScaleFactor: 2,
    });
    await page.goto('file://' + path.resolve(__dirname, job.file), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() => {
      const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, ''));
      return { plex: loaded.includes('IBM Plex Sans'), nunito: loaded.includes('Nunito') };
    });
    if (!fonts.plex || !fonts.nunito) throw new Error(job.file + ': fonts not loaded ' + JSON.stringify(fonts));
    await page.screenshot({ path: path.resolve(__dirname, job.out), clip: { x: 0, y: 0, width: job.width, height: job.height } });
    console.log('rendered', job.out, fonts);
    await page.close();
  }
  await browser.close();
})();

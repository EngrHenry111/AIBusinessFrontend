/**
 * Rasterise the brand SVGs to PNG so social crawlers (WhatsApp, Twitter,
 * LinkedIn), iOS and installed PWAs can use them. Uses the puppeteer install
 * in ../backend.
 *
 *   node scripts/render-og.mjs
 *
 * Produces:
 *   public/og-image.png            1200x630
 *   public/apple-touch-icon.png     180x180
 *   public/icon-{192,512}.png       rounded, transparent corners
 *   public/icon-maskable-{192,512}.png  full-bleed for Android's mask
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = join(__dirname, '..', 'public');
const require = createRequire(join(__dirname, '..', '..', 'backend', 'package.json'));
const puppeteer = require('puppeteer');

const FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=DM+Sans:wght@500;700&display=swap';

const shots = [
  { svg: 'og-image.svg', png: 'og-image.png', w: 1200, h: 630 },
  { svg: 'apple-touch-icon.svg', png: 'apple-touch-icon.png', w: 180, h: 180 },
  { svg: 'favicon.svg', png: 'icon-192.png', w: 192, h: 192 },
  { svg: 'favicon.svg', png: 'icon-512.png', w: 512, h: 512 },
  { svg: 'icon-maskable.svg', png: 'icon-maskable-192.png', w: 192, h: 192 },
  { svg: 'icon-maskable.svg', png: 'icon-maskable-512.png', w: 512, h: 512 },
];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  for (const s of shots) {
    const svg = readFileSync(join(pub, s.svg), 'utf8');
    const page = await browser.newPage();
    await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html><meta charset="utf-8"><link href="${FONTS}" rel="stylesheet"><style>*{margin:0;padding:0}html,body{width:${s.w}px;height:${s.h}px;overflow:hidden;background:transparent}svg{display:block;width:${s.w}px;height:${s.h}px}</style>${svg}`,
      { waitUntil: 'networkidle0' },
    );
    await page.evaluate(() => document.fonts.ready);
    const buf = await page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: s.w, height: s.h } });
    writeFileSync(join(pub, s.png), buf);
    console.log(`wrote public/${s.png} (${buf.length} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
}

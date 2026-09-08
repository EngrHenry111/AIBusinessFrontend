/**
 * Rasterise the SEO SVGs to PNG so social crawlers (WhatsApp, Twitter,
 * LinkedIn) and iOS can use them. Uses the puppeteer install in ../backend.
 *
 *   node scripts/render-og.mjs
 *
 * Produces:
 *   public/og-image.png        1200x630
 *   public/apple-touch-icon.png  180x180
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = join(__dirname, '..', 'public');
const require = createRequire(join(__dirname, '..', '..', 'backend', 'package.json'));
const puppeteer = require('puppeteer');

const shots = [
  { svg: 'og-image.svg', png: 'og-image.png', w: 1200, h: 630 },
  { svg: 'apple-touch-icon.svg', png: 'apple-touch-icon.png', w: 180, h: 180 },
];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  for (const s of shots) {
    const svg = readFileSync(join(pub, s.svg), 'utf8');
    const page = await browser.newPage();
    await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html><meta charset="utf-8"><style>*{margin:0;padding:0}html,body{width:${s.w}px;height:${s.h}px;overflow:hidden}</style>${svg}`,
      { waitUntil: 'networkidle0' },
    );
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: s.w, height: s.h } });
    writeFileSync(join(pub, s.png), buf);
    console.log(`wrote public/${s.png} (${buf.length} bytes)`);
    await page.close();
  }
} finally {
  await browser.close();
}

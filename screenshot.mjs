import puppeteer from 'puppeteer';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = join(__dirname, 'temporary screenshots');

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

if (!existsSync(screenshotsDir)) {
  await mkdir(screenshotsDir, { recursive: true });
}

// Auto-increment filename
let n = 1;
while (existsSync(join(screenshotsDir, label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`))) {
  n++;
}
const filename = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`;
const filepath = join(screenshotsDir, filename);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 800));
// Scroll through the page to trigger IntersectionObserver animations
await page.evaluate(async () => {
  await new Promise(resolve => {
    const totalHeight = document.body.scrollHeight;
    let scrolled = 0;
    const step = 400;
    const timer = setInterval(() => {
      window.scrollBy(0, step);
      scrolled += step;
      if (scrolled >= totalHeight) {
        clearInterval(timer);
        window.scrollTo(0, 0);
        resolve();
      }
    }, 80);
  });
});
await new Promise(r => setTimeout(r, 600));
// Force-reveal all scroll-animated elements for screenshot
await page.evaluate(() => {
  document.querySelectorAll('.reveal, .au').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
});
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: filepath, fullPage: true });
await browser.close();

console.log(`Screenshot saved: temporary screenshots/${filename}`);

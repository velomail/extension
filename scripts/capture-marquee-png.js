/**
 * Capture the marquee promo mockup HTML to a 1400×560 PNG using Puppeteer.
 * Run: node scripts/capture-marquee-png.js
 * Requires: npm install puppeteer (or use npx puppeteer)
 * Output: assets/store/marquee-promo-1400x560.png
 */

const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'assets', 'store', 'mockup-marquee-promo.html');
const outPath = path.join(root, 'assets', 'store', 'marquee-promo-1400x560.png');

if (!fs.existsSync(htmlPath)) {
  console.error('Missing mockup:', htmlPath);
  process.exit(1);
}

async function main() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (_) {
    console.error('Puppeteer not installed. Run: npm install puppeteer --save-dev');
    process.exit(1);
  }

  const fileUrl = 'file:///' + path.resolve(htmlPath).replace(/\\/g, '/');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setViewport({ width: 1400, height: 560, deviceScaleFactor: 1 });
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outPath, type: 'png' });

  await browser.close();
  console.log('Created:', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

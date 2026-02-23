/**
 * Build extension icons (16, 48, 128) from the VeloMail arrow/V logo.
 * Run: node scripts/build-icons-from-logo.js
 * Requires: npm install --save-dev sharp
 */

const path = require('path');
const fs = require('fs');

const sizes = [16, 48, 128];
const imagesDir = path.join(__dirname, '..', 'assets', 'images');
const sourcePath = path.join(imagesDir, 'velomail-logo-source.png');

async function main() {
  if (!fs.existsSync(sourcePath)) {
    console.error('Source logo not found at:', sourcePath);
    console.error('Copy the arrow/V logo to assets/images/velomail-logo-source.png and run again.');
    process.exit(1);
  }

  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('sharp is required. Run: npm install --save-dev sharp');
    process.exit(1);
  }

  const source = sharp(sourcePath);

  for (const size of sizes) {
    const outPath = path.join(imagesDir, `icon${size}.png`);
    await source
      .clone()
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log('Written:', outPath);
  }

  console.log('Done. Extension icons (16, 48, 128) are ready.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

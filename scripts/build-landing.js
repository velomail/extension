/**
 * Build output for Vercel: only landing site files (no extension manifest/src).
 * Run: node scripts/build-landing.js
 * Output: public/ with index.html, landing/, assets/
 * api/ stays at repo root for Vercel serverless.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(publicDir)) {
  fs.rmSync(publicDir, { recursive: true });
}
fs.mkdirSync(publicDir, { recursive: true });

fs.copyFileSync(path.join(root, 'index.html'), path.join(publicDir, 'index.html'));
copyRecursive(path.join(root, 'landing'), path.join(publicDir, 'landing'));
if (fs.existsSync(path.join(root, 'assets'))) {
  copyRecursive(path.join(root, 'assets'), path.join(publicDir, 'assets'));
}

console.log('Built public/: index.html, landing/, assets/');

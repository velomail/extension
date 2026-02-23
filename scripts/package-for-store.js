/**
 * Creates a zip for Chrome Web Store upload.
 * Includes only what the extension needs: manifest.json, src/, assets/
 * Excludes: landing/, api/, docs/, scripts/, node_modules/, .git (not in package).
 * Run: node scripts/package-for-store.js
 * Output: velomail-chrome-web-store.zip (in project root)
 * Uses PowerShell on Windows, zip on macOS/Linux (no extra npm deps).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const outZip = path.join(root, 'velomail-chrome-web-store.zip');
const stagingDir = path.join(root, '.chrome-store-staging');

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

function cleanStaging() {
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true });
  }
}

cleanStaging();
fs.mkdirSync(stagingDir, { recursive: true });

fs.copyFileSync(path.join(root, 'manifest.json'), path.join(stagingDir, 'manifest.json'));
copyRecursive(path.join(root, 'src'), path.join(stagingDir, 'src'));
if (fs.existsSync(path.join(root, 'assets'))) {
  copyRecursive(path.join(root, 'assets'), path.join(stagingDir, 'assets'));
}

const isWindows = process.platform === 'win32';
if (isWindows) {
  if (fs.existsSync(outZip)) fs.unlinkSync(outZip);
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${path.join(stagingDir, '*').replace(/'/g, "''")}' -DestinationPath '${outZip.replace(/'/g, "''")}' -Force"`,
    { stdio: 'inherit', cwd: root }
  );
} else {
  if (fs.existsSync(outZip)) fs.unlinkSync(outZip);
  execSync(`zip -r '${outZip}' .`, { stdio: 'inherit', cwd: stagingDir });
}

cleanStaging();
const stat = fs.statSync(outZip);
console.log('Created:', outZip, '(' + Math.round(stat.size / 1024) + ' KB)');

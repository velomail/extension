/**
 * Validates the project before Chrome Web Store packaging.
 * Run before package-for-store.js; exit 1 on any failure.
 * Checks: manifest exists and is valid MV3, required icons exist,
 * no eval/new Function in src, package contract (allowed roots only).
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const errors = [];

// 1. manifest.json exists and is valid JSON
const manifestPath = path.join(root, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  errors.push('manifest.json not found');
} else {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    errors.push('manifest.json is not valid JSON: ' + e.message);
  }

  if (manifest) {
    // 2. manifest_version === 3
    if (manifest.manifest_version !== 3) {
      errors.push('manifest.json must have "manifest_version": 3');
    }

    // 3. Required icon paths exist under assets/images/
    const iconPaths = manifest.icons
      ? [manifest.icons['16'], manifest.icons['48'], manifest.icons['128']].filter(Boolean)
      : [];
    if (iconPaths.length < 3) {
      errors.push('manifest.json must define icons for 16, 48, and 128');
    }
    for (const rel of iconPaths) {
      const full = path.join(root, rel);
      if (!fs.existsSync(full)) {
        errors.push('Missing icon: ' + rel);
      }
    }
  }
}

// 4. No eval( or new Function( in src/**/*.js
const srcDir = path.join(root, 'src');
function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walkDir(full);
    } else if (path.extname(full) === '.js') {
      const content = fs.readFileSync(full, 'utf8');
      if (/\beval\s*\(/.test(content)) {
        errors.push('eval() found in ' + path.relative(root, full) + ' (remote-code policy)');
      }
      if (/\bnew\s+Function\s*\(/.test(content)) {
        errors.push('new Function() found in ' + path.relative(root, full) + ' (remote-code policy)');
      }
    }
  }
}
walkDir(srcDir);

// 5. Package contract: only manifest.json, src/, assets/ will be in zip (no check that forbidden dirs are absent from zip; we validate source and trust package-for-store.js)
// Optional: ensure required roots exist so package script won't fail
if (!fs.existsSync(path.join(root, 'src'))) {
  errors.push('src/ directory not found');
}
// assets/ is optional in package script (wrapped in existsSync), but manifest references assets/images/* so we need it
if (!fs.existsSync(path.join(root, 'assets'))) {
  errors.push('assets/ directory not found (required for icons)');
}

// Report
if (errors.length > 0) {
  console.error('Chrome Web Store validation failed:\n');
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

console.log('Chrome Web Store validation passed.');

/**
 * Creates placeholder PNG icons for Chrome Web Store (16, 48, 128).
 * Run: node scripts/create-store-icons.js
 * Only run when you need placeholders; if you have the real arrow/V logo,
 * use scripts/build-icons-from-logo.js instead. This script skips writing
 * if assets/images/icon48.png already exists (real icons in place).
 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let c = 0xffffffff;
  const table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeChunk(out, type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const chunk = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(chunk), 0);
  out.push(len, chunk, crc);
}

function createPng(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Solid VeloMail brand color (sky-surge #5db7de) - no gradient
  const r = 93, g = 183, b = 222;
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      raw.push(r, g, b, 255);
    }
  }
  const rawBuf = Buffer.from(raw);
  const idat = zlib.deflateSync(rawBuf, { level: 9 });

  const out = [signature];
  writeChunk(out, 'IHDR', ihdr);
  writeChunk(out, 'IDAT', idat);
  writeChunk(out, 'IEND', Buffer.alloc(0));
  return Buffer.concat(out);
}

const dir = path.join(__dirname, '..', 'assets', 'images');
const icon48Path = path.join(dir, 'icon48.png');
if (fs.existsSync(icon48Path)) {
  console.log('icon48.png already exists; skipping placeholder generation. Use scripts/build-icons-from-logo.js to rebuild from the arrow logo.');
  process.exit(0);
}
fs.mkdirSync(dir, { recursive: true });
for (const size of [16, 48, 128]) {
  const file = path.join(dir, `icon${size}.png`);
  fs.writeFileSync(file, createPng(size));
  console.log('Written:', file);
}

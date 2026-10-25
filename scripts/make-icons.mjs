// Generates the PWA icons (PNG) and favicon (SVG) with no dependencies.
// Usage: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x0e, 0x0f, 0x12];
const FG = [0xfb, 0x71, 0x85];

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Inside a rounded rect (all in unit coordinates 0..1). */
function inRRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** Dumbbell shapes, centred, scaled by `s` (1 = fills the unit square). */
function dumbbell(s) {
  const c = 0.5;
  const R = (x0, y0, x1, y1, r) => [
    c + (x0 - c) * s,
    c + (y0 - c) * s,
    c + (x1 - c) * s,
    c + (y1 - c) * s,
    r * s,
  ];
  return [
    R(0.2, 0.465, 0.8, 0.535, 0.02), // handle
    R(0.27, 0.3, 0.36, 0.7, 0.035), // inner plates
    R(0.64, 0.3, 0.73, 0.7, 0.035),
    R(0.17, 0.36, 0.26, 0.64, 0.03), // outer plates
    R(0.74, 0.36, 0.83, 0.64, 0.03),
  ];
}

function render(size, { maskable = false, rounded = true } = {}) {
  const SS = 4;
  const out = Buffer.alloc(size * size * 4);
  const shapes = dumbbell(maskable ? 0.72 : 0.95);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bg = 0;
      let fg = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          const inBg = maskable || !rounded ? true : inRRect(x, y, 0, 0, 1, 1, 0.22);
          if (!inBg) continue;
          bg++;
          if (shapes.some((r) => inRRect(x, y, ...r))) fg++;
        }
      }
      const n = SS * SS;
      const a = bg / n;
      const f = bg ? fg / bg : 0;
      const i = (py * size + px) * 4;
      for (let k = 0; k < 3; k++) out[i + k] = Math.round(BG[k] * (1 - f) + FG[k] * f);
      out[i + 3] = Math.round(a * 255);
    }
  }
  return png(size, out);
}

writeFileSync('public/pwa-192.png', render(192));
writeFileSync('public/pwa-512.png', render(512));
writeFileSync('public/pwa-maskable-512.png', render(512, { maskable: true }));
writeFileSync('public/apple-touch-icon.png', render(180, { rounded: false }));

const rects = dumbbell(0.95)
  .map(([x0, y0, x1, y1, r]) => {
    const f = (v) => +(v * 64).toFixed(2);
    return `<rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" rx="${f(r)}"/>`;
  })
  .join('');
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0E0F12"/><g fill="#FB7185">${rects}</g></svg>\n`,
);
console.log('icons written to public/');

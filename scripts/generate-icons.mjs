#!/usr/bin/env node
// Generates the PWA icon set from public/assets/pixellab/items/d20.png:
// nearest-neighbour upscaled (keeps hard pixel edges, no blur) onto a
// dark rounded square, per docs/phase4-brief.md Track B.
//
// Run with `npm run icons`. Never overwrites public/favicon.ico (that
// file already exists and is linked separately with sizes="any").

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SOURCE = join(ROOT, 'public/assets/pixellab/items/d20.png');
const OUT_DIR = join(ROOT, 'public/icons');

// Matches --pp-bg-deep in src/core/ui/theme.css.
const BG = '#241521';

/** Rounded-square background as an SVG mask/canvas, composited under the nearest-neighbour-scaled d20. */
function roundedSquareSvg(size, radius) {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BG}"/>` +
      `</svg>`,
  );
}

async function makeIcon({ file, size, glyphFraction, radiusFraction = 0, maskable = false }) {
  const glyphSize = Math.round(size * glyphFraction);
  const glyph = await sharp(SOURCE).resize(glyphSize, glyphSize, { kernel: 'nearest' }).png().toBuffer();

  const radius = Math.round(size * radiusFraction);
  const bg = maskable
    ? await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
        .png()
        .toBuffer()
    : await sharp(roundedSquareSvg(size, radius)).png().toBuffer();

  const offset = Math.round((size - glyphSize) / 2);
  await sharp(bg)
    .composite([{ input: glyph, left: offset, top: offset }])
    .png()
    .toFile(join(OUT_DIR, file));
  console.log(`wrote public/icons/${file} (${size}x${size})`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  await makeIcon({ file: 'icon-192.png', size: 192, glyphFraction: 0.72, radiusFraction: 0.17 });
  await makeIcon({ file: 'icon-512.png', size: 512, glyphFraction: 0.72, radiusFraction: 0.17 });
  // Maskable: keep the glyph inside the ~80% "safe zone" circle Android/iOS
  // crop to, full-bleed background, no pre-rounded corners (the OS masks it).
  await makeIcon({ file: 'icon-maskable-512.png', size: 512, glyphFraction: 0.5, maskable: true });
  await makeIcon({ file: 'apple-touch-icon.png', size: 180, glyphFraction: 0.72, radiusFraction: 0 });
  await makeIcon({ file: 'favicon-32.png', size: 32, glyphFraction: 0.8, radiusFraction: 0.17 });
  await makeIcon({ file: 'favicon-16.png', size: 16, glyphFraction: 0.8, radiusFraction: 0.17 });

  console.log('Done. public/favicon.ico was left untouched.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

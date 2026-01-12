#!/usr/bin/env node
/**
 * Generate favicon PNG files from SVG source
 *
 * Run: npx sharp-cli (or install sharp as devDependency)
 * Usage: node scripts/generate-favicons.mjs
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// SVG source for favicons (teal background, black icon)
const createFaviconSvg = (size, cornerRadius) => {
  // Scale all dimensions proportionally
  const scale = size / 512;
  const r = Math.round(cornerRadius * scale);

  // Bar dimensions scaled
  const bars = [
    { x: 80, y: 112, w: 352, h: 48, rx: 16, opacity: 1 },
    { x: 112, y: 192, w: 288, h: 48, rx: 16, opacity: 0.85 },
    { x: 144, y: 272, w: 224, h: 48, rx: 16, opacity: 0.65 },
    { x: 176, y: 352, w: 160, h: 48, rx: 16, opacity: 0.45 },
  ];

  const scaledBars = bars.map(bar => ({
    x: Math.round(bar.x * scale),
    y: Math.round(bar.y * scale),
    w: Math.round(bar.w * scale),
    h: Math.round(bar.h * scale),
    rx: Math.max(1, Math.round(bar.rx * scale)),
    opacity: bar.opacity,
  }));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#14b8a6"/>
  ${scaledBars.map(bar =>
    `<rect x="${bar.x}" y="${bar.y}" width="${bar.w}" height="${bar.h}" rx="${bar.rx}" fill="#0a0a0a" opacity="${bar.opacity}"/>`
  ).join('\n  ')}
</svg>`;
};

// Favicon sizes to generate
const sizes = [
  { name: 'favicon-16x16.png', size: 16, radius: 3 },
  { name: 'favicon-32x32.png', size: 32, radius: 6 },
  { name: 'apple-touch-icon.png', size: 180, radius: 36 },
  { name: 'android-chrome-192x192.png', size: 192, radius: 38 },
  { name: 'android-chrome-512x512.png', size: 512, radius: 96 },
];

async function main() {
  let sharp;
  try {
    // Dynamic import to handle missing dependency gracefully
    sharp = (await import('sharp')).default;
  } catch (e) {
    console.error('Error: sharp is required to generate PNG favicons.');
    console.error('Install it with: pnpm add -D sharp');
    console.error('');
    console.error('Alternatively, convert the SVG files manually:');
    console.error('  - public/favicon.svg (32x32)');
    console.error('  - public/icon.svg (512x512)');
    process.exit(1);
  }

  console.log('Generating favicon PNGs...\n');

  for (const { name, size, radius } of sizes) {
    const svg = createFaviconSvg(size, radius);
    const outputPath = join(publicDir, name);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`  Created: ${name} (${size}x${size})`);
  }

  // Generate ICO file (contains 16x16, 32x32, 48x48)
  // ICO requires special handling - for now, just note it
  console.log('\nNote: For favicon.ico, use an online converter or ico-encoder package');
  console.log('  Recommended: https://realfavicongenerator.net/');
  console.log('  Or use: npx png-to-ico public/favicon-32x32.png > public/favicon.ico');

  console.log('\nDone! PNG favicons generated in docs/public/');
}

main().catch(console.error);

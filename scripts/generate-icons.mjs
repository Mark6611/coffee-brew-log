// Generates raster PNG icons from static/icon.svg for the PWA manifest and apple-touch-icon.
// Run with: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'static', 'icon.svg');

const sizes = [180, 192, 512];

const svg = await readFile(svgPath);
for (const size of sizes) {
	const out = path.join(root, 'static', `icon-${size}.png`);
	await sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
	console.log(`✓ icon-${size}.png`);
}

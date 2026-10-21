import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
const svg = await readFile('public/icons/icon.svg');
await mkdir('public/icons', { recursive: true });
for (const size of [192, 512])
  await sharp(svg).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
await sharp(svg).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png');
const mask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#b6a0d6"/><image href="data:image/svg+xml;base64,${svg.toString('base64')}" x="64" y="64" width="384" height="384"/></svg>`,
);
await sharp(mask).png().toFile('public/icons/maskable-512.png');

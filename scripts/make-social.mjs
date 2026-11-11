// Genera la miniatura para compartir (Open Graph 1200x630) y los favicons.
// Uso: node scripts/make-social.mjs
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const p = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));

// ---------- Miniatura 1200x630 ----------
const W = 1200, H = 630;
const featured = ['seat', 'ferrari', 'bmw', 'audi', 'volkswagen', 'toyota', 'porsche', 'mercedes-benz', 'renault', 'tesla', 'ford', 'lamborghini'];
const tile = 150, gap = 18, cols = 4;
const gridX = W - 60 - cols * tile - (cols - 1) * gap;
const gridY = (H - (3 * tile + 2 * gap)) / 2;

const bg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#f4f1ea"/>
  <rect x="0" y="0" width="560" height="${H}" fill="#2e6da4"/>
  <path d="M560 0 L620 0 L560 ${H} Z" fill="#2e6da4"/>
  ${featured.map((_, i) => {
    const x = gridX + (i % cols) * (tile + gap), y = gridY + Math.floor(i / cols) * (tile + gap);
    return `<rect x="${x}" y="${y}" width="${tile}" height="${tile}" rx="26" fill="#ffffff" stroke="#e2ddd2" stroke-width="3"/>`;
  }).join('')}
  <text x="60" y="330" font-family="Nunito, Segoe UI, Arial Rounded MT Bold, Arial, sans-serif" font-weight="900" font-size="64" fill="#ffffff">Mi Garaje</text>
  <text x="60" y="404" font-family="Nunito, Segoe UI, Arial Rounded MT Bold, Arial, sans-serif" font-weight="900" font-size="64" fill="#ffffff">de Marcas</text>
  <text x="60" y="462" font-family="Nunito, Segoe UI, Arial, sans-serif" font-weight="700" font-size="28" fill="#dce8f3">Juegos de logos de coches</text>
  <text x="60" y="500" font-family="Nunito, Segoe UI, Arial, sans-serif" font-weight="700" font-size="28" fill="#dce8f3">con voz en español</text>
</svg>`);

const icon = await sharp(p('assets/icons/icon.svg'), { density: 300 }).resize(190, 190).png().toBuffer();
const logos = await Promise.all(featured.map((slug) => sharp(p(`assets/logos/${slug}.png`)).resize(tile - 28, tile - 28).png().toBuffer()));

await sharp(bg)
  .composite([
    { input: icon, left: 60, top: 60 },
    ...logos.map((input, i) => ({
      input,
      left: gridX + (i % cols) * (tile + gap) + 14,
      top: Math.round(gridY + Math.floor(i / cols) * (tile + gap) + 14),
    })),
  ])
  .png({ compressionLevel: 9 })
  .toFile(p('assets/social.png'));

// ---------- Favicons ----------
const pngAt = (size) => sharp(p('assets/icons/icon.svg'), { density: 300 }).resize(size, size).png().toBuffer();
const f16 = await pngAt(16), f32 = await pngAt(32), f48 = await pngAt(48);
await writeFile(p('assets/icons/favicon-32.png'), f32);
await writeFile(p('assets/icons/favicon-16.png'), f16);

// favicon.ico con PNG incrustados (formato ICO estándar)
const imgs = [[16, f16], [32, f32], [48, f48]];
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(imgs.length, 4);
let offset = 6 + 16 * imgs.length;
const dir = imgs.map(([s, buf]) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0); e.writeUInt8(s, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(buf.length, 8); e.writeUInt32LE(offset, 12);
  offset += buf.length;
  return e;
});
await writeFile(p('favicon.ico'), Buffer.concat([header, ...dir, ...imgs.map(([, b]) => b)]));
console.log('miniatura y favicons listos');

// Descarga una sola vez los logotipos a color desde el dataset abierto
// https://github.com/filippofilip95/car-logos-dataset  (uso: node scripts/fetch-logos.mjs)
import { writeFile, mkdir } from 'node:fs/promises';
import { BRANDS } from '../js/brands.js';

const BASE = 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/';
await mkdir(new URL('../assets/logos/', import.meta.url), { recursive: true });

for (const b of BRANDS) {
  const res = await fetch(BASE + b.slug + '.png');
  if (!res.ok) { console.error('FALTA', b.slug, res.status); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(new URL(`../assets/logos/${b.slug}.png`, import.meta.url), buf);
  console.log('ok', b.slug, buf.length);
}

// Normaliza los logotipos: recorta márgenes transparentes y los centra en un
// cuadrado de 512x512 con fondo transparente (así todos se ven del mismo tamaño
// y el puzle puede cortarlos en piezas iguales). También crea una contact sheet.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { BRANDS } from '../js/brands.js';

const SIZE = 512, INNER = 440;
for (const b of BRANDS) {
  const file = new URL(`../assets/logos/${b.slug}.png`, import.meta.url);
  const input = await readFile(file);
  const trimmed = await sharp(input).trim({ threshold: 10 }).toBuffer();
  const fitted = await sharp(trimmed)
    .resize(INNER, INNER, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const out = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fitted, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
  await writeFile(file, out);
  console.log(b.slug, out.length);
}

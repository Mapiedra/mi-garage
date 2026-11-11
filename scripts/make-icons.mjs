// Genera los iconos PNG de la PWA a partir de assets/icons/icon.svg
import sharp from 'sharp';
const dir = new URL('../assets/icons/', import.meta.url);
const svg = new URL('icon.svg', dir);
const out = (n) => new URL(n, dir).pathname.replace(/^\/(\w:)/, '$1');
const src = out('icon.svg');
await sharp(src, { density: 300 }).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(src, { density: 300 }).resize(512, 512).png().toFile(out('icon-512.png'));
// Maskable: el dibujo ocupa el 80 % central sobre fondo azul.
const inner = await sharp(src, { density: 300 }).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#2e6da4' } })
  .composite([{ input: inner, gravity: 'center' }]).png().toFile(out('maskable-512.png'));
// iOS: sin transparencia en las esquinas.
const ios = await sharp(src, { density: 300 }).resize(180, 180).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: '#2e6da4' } })
  .composite([{ input: ios }]).flatten({ background: '#2e6da4' }).png().toFile(out('apple-touch-icon.png'));
console.log('iconos listos', svg.pathname);

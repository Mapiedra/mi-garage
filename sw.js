// Service worker: guarda toda la app para que funcione sin conexión.
// Al cambiar cualquier archivo, sube VERSION para que se actualice en los dispositivos.
const VERSION = 'v1';
const CACHE = `mi-garage-${VERSION}`;

const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/app.js', 'js/brands.js', 'js/storage.js', 'js/speech.js', 'js/sounds.js', 'js/ui.js',
  'js/games/quiz.js', 'js/games/listen.js', 'js/games/puzzle.js', 'js/games/memory.js',
  'js/games/spell.js', 'js/games/garage.js',
  'assets/icons/icon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
  'assets/icons/maskable-512.png', 'assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    // Los logotipos se leen de la lista de marcas, así no hay que mantener dos listas.
    const text = await (await fetch('js/brands.js')).text();
    const logos = [...text.matchAll(/slug: '([^']+)'/g)].map((m) => `assets/logos/${m[1]}.png`);
    await cache.addAll(logos);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('mi-garage-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Primero la caché (rápido y sin conexión); en segundo plano se actualiza.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: url.origin === location.origin });
    const network = fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { event.waitUntil(network); return cached; }
    const res = await network;
    if (res) return res;
    if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
    return Response.error();
  })());
});

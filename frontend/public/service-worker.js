const CACHE_NAME = 'blgf-dts-v13';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/blgflogo.jpg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      try {
        const response = await fetch('/offline-assets.json', { cache: 'no-store' });
        if (response.ok) {
          const assets = await response.json();
          if (Array.isArray(assets)) await cache.addAll(assets);
        }
      } catch (err) {
        console.warn('[SW] Optional offline asset cache warning:', err);
      }
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    (event.request.mode === 'navigate'
      ? fetch(event.request).catch(() => caches.match('/') )
      : fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('/')),
      )),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Простой service worker: сеть с откатом на кэш (network-first),
// чтобы приложение открывалось без интернета после первого визита.
const CACHE = 'alippe-v2';
const PRECACHE = ['/', '/index.html', '/manifest.json', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (c) => {
        await c.addAll(PRECACHE);
        // Кыргызская озвучка: небольшие mp3, кэшируем все сразу для офлайна.
        try {
          const res = await fetch('/audio/index.json');
          if (res.ok) {
            await c.put('/audio/index.json', res.clone());
            const files = [...new Set(Object.values(await res.json()))];
            await c.addAll(files.map((f) => '/audio/' + f));
          }
        } catch {
          // озвучка подгрузится по мере использования
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (!sameOrigin && !isFont) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') return caches.match('/index.html');
          return Response.error();
        })
      )
  );
});

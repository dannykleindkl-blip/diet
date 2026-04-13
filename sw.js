/* ══════════════════════════════════════════
   מאזן – Service Worker v2
   ══════════════════════════════════════════ */

const CACHE_NAME  = 'mazan-v26';
const WORKER_HOST = 'mazan-backend.danny-klein-dkl.workers.dev';

/* Only cache files that actually exist.
   app.js does NOT exist — all logic is in index.html. */
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

/* Install: cache local assets */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(() => Promise.resolve()))
      .then(() => self.skipWaiting())
  );
});

/* Activate: clear old caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch strategy:
   - Cloudflare Worker API  → Network Only (never cache dynamic data)
   - Google Fonts           → Network first, cache fallback
   - Local assets           → Cache first, network fallback
*/
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* NETWORK ONLY: Cloudflare Worker API calls */
  if (url.hostname === WORKER_HOST) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({ error: 'offline', status: 'not_found' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    return;
  }

  /* NETWORK FIRST: Google Fonts */
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  /* CACHE FIRST: local assets */
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200 && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});

/* ══════════════════════════════════════════
   מאזן – Service Worker v3
   ══════════════════════════════════════════ */

const CACHE_NAME  = 'mazan-v33';
const WORKER_HOST = 'mazan-backend.danny-klein-dkl.workers.dev';

/* Only files that actually exist in the repo.
   app.js does NOT exist — all JS is inside index.html. */
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(() => Promise.resolve()))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* ── FIX 3: Cloudflare Worker API → bypass SW completely.
     Pass straight through to the network. The SW must never
     cache, queue, or interfere with dynamic API responses. ── */
  if (url.hostname === WORKER_HOST) {
    event.respondWith(
      fetch(event.request).catch(function() {
        /* Network down — return a safe offline JSON response */
        return new Response(
          JSON.stringify({ error: 'offline', status: 'not_found' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return; /* ← critical: stop here, no cache logic runs */
  }

  /* Google Fonts — network first, cache fallback */
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

  /* Local assets — cache first, network fallback */
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

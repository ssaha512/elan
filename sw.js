// =====================================================
// ÉLAN — Service Worker (Offline-First Cache)
// =====================================================

const CACHE_NAME = 'elan-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto+Mono:wght@400;500&display=swap'
];

// ---- INSTALL ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        // Font CDN may fail on first install offline — that's OK
        console.warn('SW cache partial:', err);
        return cache.addAll(['./','./index.html','./manifest.json']);
      });
    })
  );
  self.skipWaiting();
});

// ---- ACTIVATE ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ---- FETCH (Cache-First for app, Network-First for fonts) ----
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // For Google Fonts — try network, fall back to cache
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        fetch(event.request)
          .then(res => { cache.put(event.request, res.clone()); return res; })
          .catch(() => cache.match(event.request))
      )
    );
    return;
  }

  // For everything else — cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, res.clone()));
        return res;
      });
    })
  );
});

const CACHE = 'biblia-v1';
const PRECACHE = ['/', '/es_rvr.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Siempre red primero para Firebase Auth/Firestore
  if (e.request.url.includes('firestore') || e.request.url.includes('googleapis')) return;

  e.respondWith(
    caches.open(CACHE).then(cache =>
      fetch(e.request)
        .then(resp => {
          if (resp.ok) cache.put(e.request, resp.clone());
          return resp;
        })
        .catch(() => cache.match(e.request))
    )
  );
});

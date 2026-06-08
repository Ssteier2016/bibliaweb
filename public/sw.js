const CACHE = 'biblia-v5';
const PRECACHE = ['/', '/es_rvr.json', '/manifest.json', '/logo192.png', '/logo512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Cargar precache básico
      await cache.addAll(PRECACHE).catch(() => {});
      
      // Cargar dinámicamente los assets con hashes del build actual
      try {
        const response = await fetch('/asset-manifest.json');
        if (response.ok) {
          const manifest = await response.json();
          if (manifest && manifest.files) {
            const filesToCache = Object.values(manifest.files).filter(url => 
              typeof url === 'string' &&
              !url.endsWith('.map') &&
              (url.startsWith('/static/') || url === '/index.html')
            );
            await cache.addAll(filesToCache);
          }
        }
      } catch (err) {
        console.error('Error precaching from asset-manifest:', err);
      }
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // Siempre red para Firebase, APIs externas y chrome-extension
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('googleapis.com') ||
    url.startsWith('chrome-extension')
  ) return;

  const requestUrl = new URL(e.request.url);
  const isNavigation = e.request.mode === 'navigate' || 
                       (requestUrl.origin === self.location.origin && requestUrl.pathname === '/');

  // Network-first para navegación (HTML raíz o cualquier navegación de página)
  if (isNavigation) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return resp;
        })
        .catch(() => {
          return caches.match('/', { ignoreSearch: true })
            .then(cached => cached || caches.match('/index.html', { ignoreSearch: true }));
        })
    );
    return;
  }

  // Cache-first para assets estáticos (JS, CSS, imágenes, fuentes, JSON local y manifest)
  if (
    url.includes('/static/') ||
    url.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)$/) ||
    url.endsWith('es_rvr.json') ||
    url.endsWith('manifest.json')
  ) {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp.ok) {
            caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
          }
          return resp;
        });
      })
    );
    return;
  }

  // Network-first con fallback a cache para el resto
  e.respondWith(
    caches.open(CACHE).then(cache =>
      fetch(e.request)
        .then(resp => {
          if (resp.ok) cache.put(e.request, resp.clone());
          return resp;
        })
        .catch(() => cache.match(e.request, { ignoreSearch: true }))
    )
  );
});

// Notifica a los clientes cuando hay una nueva versión disponible
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});


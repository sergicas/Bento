// PWA cache amb versió nova per forçar actualització
const CACHE = 'docs-cache-v5';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// Instal·lació: pre-cache i activació immediata
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Activació: neteja versions antigues i pren control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network First, falling back to cache (Així sempre tenim la darrera versió quan hi ha internet)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Actualitzem el cache amb l'última versió descarregada
        const responseClone = networkResponse.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      })
      .catch(() => {
        // En cas d'estar sense connexió, busquem al cache
        return caches.match(event.request);
      })
  );
});

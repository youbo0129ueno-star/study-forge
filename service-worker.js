const CACHE_NAME = 'study-forge-v14';
const ASSETS = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './assets/icon.svg',
  './data/index.json',
  './data/philosophy.json',
  './data/supplement1.json',
  './data/supplement2.json',
  './data/supplement3.json',
  './data/toeic-600.json',
  './data/words1-400.json',
  './data/words401-700.json',
  './data/words701-900.json',
  './data/words901-1000.json',
  './data/template.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});

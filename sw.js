const CACHE = 'tulap-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  "./css/app.css",
  "./css/fonts.css",
  "./fonts/bevietnampro-400-latin-ext.woff2",
  "./fonts/bevietnampro-400-latin.woff2",
  "./fonts/bevietnampro-400-vietnamese.woff2",
  "./fonts/bevietnampro-600-latin-ext.woff2",
  "./fonts/bevietnampro-600-latin.woff2",
  "./fonts/bevietnampro-600-vietnamese.woff2",
  "./fonts/bevietnampro-700-latin-ext.woff2",
  "./fonts/bevietnampro-700-latin.woff2",
  "./fonts/bevietnampro-700-vietnamese.woff2",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./js/ai.js",
  "./js/app.js",
  "./js/data.js",
  "./js/importer.js",
  "./js/store.js",
  "./js/util.js",
  "./js/views/common.js",
  "./js/views/dashboard.js",
  "./js/views/learn.js",
  "./js/views/practice.js",
  "./js/views/result.js",
  "./js/views/settings.js",
  "./js/views/test.js",
  "./js/views/upload.js",
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});

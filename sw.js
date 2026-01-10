const CACHE_NAME = "app-home-v3";
const FILES = [
  "./",
  "./index.html",
  "./apps.json",
  "./manifest.json",
  "./VERSION.txt",
  "./css/styles.css",
  "./js/app.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // Network-first for apps.json so hub updates show up quickly
  const url = new URL(req.url);
  const isApps = url.pathname.endsWith("/apps.json") || url.pathname.endsWith("apps.json");

  if (isApps) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});


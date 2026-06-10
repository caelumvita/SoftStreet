const CACHE_NAME = "dawnline-cache-v101";

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./main.js",
  "./manifest.json",
  "./models/m4a1_s.obj",
  "./sound/universfield-gunshot-352466.mp3"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

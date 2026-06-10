const CACHE_NAME =
  "dawnline-neighbourhood-v3";

const CORE_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./main.js",
  "./manifest.json"
];

/* INSTALL */

self.addEventListener(
  "install",
  (event) => {
    self.skipWaiting();

    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) => {
          return cache.addAll(
            CORE_FILES
          );
        })
    );
  }
);

/* ACTIVATE */

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((names) => {
          return Promise.all(
            names.map(
              (name) => {
                if (
                  name !==
                  CACHE_NAME
                ) {
                  return caches.delete(
                    name
                  );
                }
              }
            )
          );
        })
    );

    self.clients.claim();
  }
);

/* NETWORK FIRST */

self.addEventListener(
  "fetch",
  (event) => {
    if (
      event.request.method !==
      "GET"
    ) {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then(
          async (response) => {
            if (
              response &&
              (
                response.ok ||
                response.type ===
                "opaque"
              )
            ) {
              const cache =
                await caches.open(
                  CACHE_NAME
                );

              cache.put(
                event.request,
                response.clone()
              );
            }

            return response;
          }
        )
        .catch(async () => {
          const cached =
            await caches.match(
              event.request
            );

          if (cached) {
            return cached;
          }

          throw new Error(
            "File is unavailable offline"
          );
        })
    );
  }
);

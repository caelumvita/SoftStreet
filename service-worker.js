### `manifest.json`

```json
{
  "name": "SoftStreer🍻",
  "short_name": "SoftStreer",
  "start_url": "./",
  "display": "fullscreen",
  "background_color": "#101820",
  "theme_color": "#101820",
  "orientation": "landscape",
  "description": "A small first-person neighbourhood walking game."
}
```

### `service-worker.js`

```js
const CACHE_NAME =
  "softstreer-v1";

const CORE_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./main.js",
  "./manifest.json"
];

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

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map(
              (cacheName) => {
                if (
                  cacheName !==
                  CACHE_NAME
                ) {
                  return caches.delete(
                    cacheName
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

/*
  Спочатку перевіряємо GitHub,
  потім використовуємо кеш.

  Усі моделі, звуки, текстури та
  бібліотеки кешуються автоматично
  після першого успішного запуску.
*/

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
            "Resource is unavailable offline"
          );
        })
    );
  }
);
```

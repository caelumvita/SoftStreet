const CACHE_VERSION =
  "softstreer-v14";

const CORE_CACHE =
  `${CACHE_VERSION}-core`;

const ASSET_CACHE =
  `${CACHE_VERSION}-assets`;

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
        .open(CORE_CACHE)
        .then(async (cache) => {
          await Promise.allSettled(
            CORE_FILES.map(
              async (file) => {
                try {
                  await cache.add(file);
                } catch (error) {
                  console.warn(
                    "Core cache error:",
                    file,
                    error
                  );
                }
              }
            )
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
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map(
              (cacheName) => {
                const isSoftStreer =
                  cacheName.startsWith(
                    "softstreer-"
                  );

                const isCurrent =
                  cacheName ===
                    CORE_CACHE ||
                  cacheName ===
                    ASSET_CACHE;

                if (
                  isSoftStreer &&
                  !isCurrent
                ) {
                  return caches.delete(
                    cacheName
                  );
                }

                return Promise.resolve();
              }
            )
          );
        })
    );

    self.clients.claim();
  }
);

/* HELPERS */

function isCodeRequest(url) {
  const path =
    url.pathname.toLowerCase();

  return (
    path.endsWith(".html") ||
    path.endsWith(".css") ||
    path.endsWith(".js") ||
    path.endsWith(".json")
  );
}

async function storeResponse(
  cacheName,
  request,
  response
) {
  if (
    !response ||
    !(
      response.ok ||
      response.type === "opaque"
    )
  ) {
    return;
  }

  try {
    const cache =
      await caches.open(
        cacheName
      );

    await cache.put(
      request,
      response.clone()
    );
  } catch (error) {
    console.warn(
      "Cache write error:",
      request.url,
      error
    );
  }
}

/* NETWORK FIRST */

async function networkFirst(
  request
) {
  try {
    const response =
      await fetch(request);

    await storeResponse(
      CORE_CACHE,
      request,
      response
    );

    return response;
  } catch (error) {
    const cached =
      await caches.match(
        request,
        {
          ignoreSearch: true
        }
      );

    if (cached) {
      return cached;
    }

    throw error;
  }
}

/* CACHE FIRST */

async function cacheFirst(
  request
) {
  const cached =
    await caches.match(
      request,
      {
        ignoreSearch: true
      }
    );

  if (cached) {
    return cached;
  }

  const response =
    await fetch(request);

  await storeResponse(
    ASSET_CACHE,
    request,
    response
  );

  return response;
}

/* FETCH */

self.addEventListener(
  "fetch",
  (event) => {
    const request =
      event.request;

    if (
      request.method !== "GET"
    ) {
      return;
    }

    const url =
      new URL(request.url);

    if (
      request.mode ===
      "navigate"
    ) {
      event.respondWith(
        networkFirst(request)
          .catch(async () => {
            return (
              await caches.match(
                "./index.html"
              )
            );
          })
      );

      return;
    }

    if (
      url.origin ===
        self.location.origin &&
      isCodeRequest(url)
    ) {
      event.respondWith(
        networkFirst(request)
      );

      return;
    }

    event.respondWith(
      cacheFirst(request)
    );
  }
);

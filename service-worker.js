
const CACHE_VERSION = "softstreer-v3";

const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./main.js",
  "./manifest.json"
];

/* =====================================================
   INSTALL

   Кешуємо тільки основні файли.
   Відсутня модель або текстура більше
   не зможе зламати встановлення PWA.
===================================================== */

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CORE_CACHE).then(async (cache) => {
      const results = await Promise.allSettled(
        CORE_FILES.map(async (file) => {
          try {
            await cache.add(file);
          } catch (error) {
            console.warn(
              "Не вдалося додати основний файл у кеш:",
              file,
              error
            );
          }
        })
      );

      return results;
    })
  );
});

/* =====================================================
   ACTIVATE

   Видаляємо старі версії кешу.
===================================================== */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          const belongsToSoftStreer =
            cacheName.startsWith("softstreer-");

          const isCurrentCache =
            cacheName === CORE_CACHE ||
            cacheName === RUNTIME_CACHE;

          if (belongsToSoftStreer && !isCurrentCache) {
            return caches.delete(cacheName);
          }

          return Promise.resolve();
        })
      );
    })
  );

  self.clients.claim();
});

/* =====================================================
   HELPERS
===================================================== */

function isCodeFile(url) {
  const pathname = url.pathname.toLowerCase();

  return (
    pathname.endsWith(".html") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".json")
  );
}

async function saveResponse(cacheName, request, response) {
  if (!response) {
    return;
  }

  const canCache =
    response.ok ||
    response.type === "opaque";

  if (!canCache) {
    return;
  }

  try {
    const cache = await caches.open(cacheName);

    await cache.put(
      request,
      response.clone()
    );
  } catch (error) {
    console.warn(
      "Не вдалося зберегти файл у кеш:",
      request.url,
      error
    );
  }
}

/* =====================================================
   NAVIGATION

   Для відкриття сторінки:
   1. пробуємо інтернет;
   2. якщо інтернету немає — відкриваємо index.html.
===================================================== */

async function handleNavigation(request) {
  try {
    const networkResponse = await fetch(request);

    await saveResponse(
      CORE_CACHE,
      request,
      networkResponse
    );

    return networkResponse;
  } catch (error) {
    const cachedPage =
      await caches.match("./index.html") ||
      await caches.match("./");

    if (cachedPage) {
      return cachedPage;
    }

    return new Response(
      "SoftStreer зараз недоступна офлайн.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      }
    );
  }
}

/* =====================================================
   CODE FILES — NETWORK FIRST

   HTML, JS та CSS спочатку беремо з GitHub,
   щоб після commit не залишався старий код.
===================================================== */

async function handleCodeFile(request) {
  try {
    const networkResponse = await fetch(request);

    await saveResponse(
      CORE_CACHE,
      request,
      networkResponse
    );

    return networkResponse;
  } catch (error) {
    const cachedResponse =
      await caches.match(request, {
        ignoreSearch: true
      });

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

/* =====================================================
   ASSETS — CACHE FIRST

   Моделі, текстури, звуки, EXR та бібліотеки:
   1. використовуємо кеш;
   2. якщо файла немає — завантажуємо;
   3. після успіху автоматично кешуємо.
===================================================== */

async function handleAsset(request) {
  const cachedResponse =
    await caches.match(request, {
      ignoreSearch: true
    });

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    await saveResponse(
      RUNTIME_CACHE,
      request,
      networkResponse
    );

    return networkResponse;
  } catch (error) {
    console.error(
      "Не вдалося завантажити ресурс:",
      request.url,
      error
    );

    return new Response("", {
      status: 504,
      statusText: "Resource unavailable"
    });
  }
}

/* =====================================================
   FETCH
===================================================== */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      handleNavigation(request)
    );

    return;
  }

  if (
    url.origin === self.location.origin &&
    isCodeFile(url)
  ) {
    event.respondWith(
      handleCodeFile(request)
    );

    return;
  }

  event.respondWith(
    handleAsset(request)
  );
});


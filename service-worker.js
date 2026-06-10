const CACHE_NAME =
  "dawnline-walking-v2";

const LOCAL_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./main.js",
  "./manifest.json",

  "./textures/10450_Rectangular_Grass_Patch_v1_Diffuse.jpg",
  "./textures/concrete_floor_worn_001_diff_1k.jpg",
  "./textures/qwantani_dusk_2_puresky_1k.exr",

  "./models/building_04.obj",

  "./sound/soundreality-footsteps-walking-boots-parquet-1-420135.mp3"
];

self.addEventListener(
  "install",
  (event) => {
    self.skipWaiting();

    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(async (cache) => {
          await Promise.allSettled(
            LOCAL_FILES.map(
              (file) =>
                cache.add(file)
            )
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
      caches
        .match(event.request)
        .then(async (cached) => {
          if (cached) {
            return cached;
          }

          try {
            const response =
              await fetch(
                event.request
              );

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
          } catch (error) {
            console.error(
              "Offline fetch failed:",
              error
            );

            throw error;
          }
        })
    );
  }
);

const CACHE_NAME = "toms-cookbook-v15";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon", "/apple-icon", "/pwa-icon-192", "/pwa-icon-512", "/icons/fire-64.png", "/icons/fire-192.png", "/icons/fire-512.png", "/assets/logo.png", "/assets/confirm.svg", "/assets/scanner.svg", "/assets/water.webm"];

for (const color of ["violet", "emerald", "rose"]) for (const mode of ["light", "dark"]) {
  APP_SHELL.push(`/manifests/${color}-${mode}.webmanifest`);
  for (const size of [180, 192, 512]) APP_SHELL.push(`/icons/themed/fire-${color}-${mode}-${size}.png`);
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (new URL(event.request.url).pathname.startsWith("/api/")) return;
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put("/", response.clone()));
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  const url = new URL(event.request.url);
  const cacheKey = url.pathname.startsWith("/assets/") ? url.origin + url.pathname : event.request;
  event.respondWith(
    caches.match(cacheKey).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

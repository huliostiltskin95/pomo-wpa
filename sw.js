const CACHE_NAME = "tempo-pomodoro-v11";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./tempo-ui.js", "./agenda.js", "./core/tempo-tasks.js", "./core/tempo-core.js", "./core/tempo-audio.js", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL.filter(Boolean))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("tempo-pomodoro-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      if (response && response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); }
      return response;
    }).catch(() => { if (event.request.mode === "navigate") return caches.match("./index.html"); throw new Error("Risorsa non disponibile offline"); });
  }));
});

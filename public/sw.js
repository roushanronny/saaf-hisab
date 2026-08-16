/* Minimal installable PWA shell */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Network-first; keeps live data correct for hisab
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

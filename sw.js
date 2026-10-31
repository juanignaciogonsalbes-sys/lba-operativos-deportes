// Service worker: guarda todos los archivos de la app para que funcione sin internet.
// Al cambiar cualquier archivo, subir el número de VERSION para que los celulares actualicen.
const VERSION = "lba-operativos-v1";
const ARCHIVOS = [
  "./",
  "index.html",
  "app.js",
  "dni.js",
  "manifest.json",
  "lib/zxing-reader.js",
  "lib/zxing_reader.wasm",
  "lib/xlsx.mini.min.js",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primero la copia guardada; si no está, la red.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request))
  );
});

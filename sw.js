// Service worker: guarda todos los archivos de la app para que funcione sin internet.
// Al cambiar cualquier archivo, subir el número de VERSION para que los celulares actualicen.
const VERSION = "lba-operativos-v4";
const ARCHIVOS = [
  "./",
  "index.html",
  "app.js",
  "dni.js",
  "manifest.json",
  "zxing-reader.js",
  "zxing_reader.wasm",
  "xlsx.mini.min.js",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
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

// Responde con la copia guardada (rápido y sin internet) y, si hay conexión,
// la actualiza en segundo plano para la próxima vez que se abra.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.open(VERSION).then((c) =>
      c.match(e.request, { ignoreSearch: true }).then((guardada) => {
        const red = fetch(e.request)
          .then((r) => { if (r && r.ok) c.put(e.request, r.clone()); return r; })
          .catch(() => guardada);
        return guardada || red;
      })
    )
  );
});

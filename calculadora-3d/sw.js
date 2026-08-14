/* Service Worker — offline no celular.
 * Estratégia: rede primeiro (pega atualizações), cache como reserva. */
var CACHE = 'calc3d-v1';
var ARQUIVOS = [
  './',
  './index.html',
  './style.css',
  './core.js',
  './app.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ARQUIVOS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(
        nomes.filter(function (n) { return n !== CACHE; })
             .map(function (n) { return caches.delete(n); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(function (resp) {
        var copia = resp.clone();
        caches.open(CACHE).then(function (c) {
          c.put(e.request, copia);
        }).catch(function () {});
        return resp;
      })
      .catch(function () {
        return caches.match(e.request).then(function (r) {
          return r || caches.match('./index.html');
        });
      })
  );
});

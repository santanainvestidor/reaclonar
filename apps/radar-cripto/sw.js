// Service worker: guarda a tela para abrir rápido e offline; preços sempre vêm da rede.
const VERSAO = "radar-cripto-v1";
const ARQUIVOS = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "analise.js",
  "core.js",
  "dados.js",
  "grafico.js",
  "mercado.js",
  "moedas.js",
  "ui.js",
  "varredura.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((ks) =>
        Promise.all(
          ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Arquivos do app: rede primeiro (pega atualizações), cache se estiver sem internet.
self.addEventListener("fetch", (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  ev.respondWith(
    fetch(ev.request)
      .then((r) => {
        const copia = r.clone();
        caches.open(VERSAO).then((c) => c.put(ev.request, copia));
        return r;
      })
      .catch(() => caches.match(ev.request)),
  );
});

self.addEventListener("notificationclick", (ev) => {
  ev.notification.close();
  ev.waitUntil(
    self.clients
      .matchAll({ type: "window" })
      .then((ws) => (ws[0] ? ws[0].focus() : self.clients.openWindow("./"))),
  );
});

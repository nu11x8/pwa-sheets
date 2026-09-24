// アプリ本体（HTML/アイコン）だけをキャッシュする。
// Apps Script への通信（POST）はキャッシュしない。
// ファイルを更新したら CACHE のバージョンを上げること。
const CACHE = "sheet-memo-v1";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; // 他サイト・POSTは素通し
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req))
  );
});

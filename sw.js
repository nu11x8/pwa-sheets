// アプリ本体（HTML/アイコン）をキャッシュする。Apps Script への通信はキャッシュしない。
// ネットワーク優先: オンラインなら常に最新のファイルを取得し（ブラウザのHTTPキャッシュも再確認）、
// オフラインのときだけ保存済みのキャッシュを使う。
const CACHE = "sheet-memo-v4";
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
  // 他サイト・POST・クエリ付き（更新確認用）は素通し
  if (req.method !== "GET" || url.origin !== location.origin || url.search) return;
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req))
  );
});

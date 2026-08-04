/* 选址顾问工作台 · Service Worker（离线缓存 + 自动更新） */
const CACHE = "sgwb-v1";
const ASSETS = ["index.html", "manifest.webmanifest", "icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin) return; // 仅缓存同源（Supabase 走网络）

  // HTML 导航：网络优先，失败回退缓存（保证更新能生效）
  if (req.mode === "navigate" || u.pathname.endsWith(".html") || u.pathname === "/") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const cp = r.clone();
          caches.open(CACHE).then((c) => c.put(req, cp));
          return r;
        })
        .catch(() => caches.match(req).then((x) => x || caches.match("index.html")))
    );
    return;
  }

  // 其余静态资源：缓存优先
  e.respondWith(
    caches.match(req).then((x) =>
      x || fetch(req).then((r) => {
        const cp = r.clone();
        caches.open(CACHE).then((c) => c.put(req, cp));
        return r;
      }).catch(() => x)
    )
  );
});

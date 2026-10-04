// BizlyAI service worker — makes the app (and every store) installable and
// keeps it opening when the network is flaky.
//
// Deliberately conservative: it never touches /api (auth cookies, live
// stock, payments must always hit the network). Only two things are cached:
//   • /assets/*  — Vite's content-hashed bundles, so cache-first is safe.
//   • page loads — network-first; the last good HTML is the offline fallback.
const VERSION = 'v1';
const SHELL_CACHE = `bizly-shell-${VERSION}`;
const PAGE_CACHE = `bizly-pages-${VERSION}`;
const ASSET_CACHE = `bizly-assets-${VERSION}`;
const MAX_PAGES = 30;
const MAX_ASSETS = 80;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(['/index.html', '/icon-192.png', '/icon-512.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL_CACHE, PAGE_CACHE, ASSET_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(req, copy)).then(() => trim(PAGE_CACHE, MAX_PAGES));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match('/index.html')) || Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(ASSET_CACHE).then((c) => c.put(req, copy)).then(() => trim(ASSET_CACHE, MAX_ASSETS));
        }
        return res;
      })),
    );
  }
});

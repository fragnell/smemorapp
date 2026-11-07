// Service worker: lets the app open offline (e.g. inside buildings with poor signal).
//
// Every publish must bump VERSION. A new VERSION makes the browser install this worker again,
// which downloads a fresh copy of every file. The `?v=` query bypasses the CDN's ~10 min cache,
// so the new version never stores an old file. The app is then served from that copy (cache-first),
// with no background refresh that could overwrite it with a stale copy from the CDN.
const VERSION = 7;
const CACHE = `smemorapp-v${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(ASSETS.map(async (url) => {
        const res = await fetch(`${url}?v=${VERSION}`, { cache: 'reload' });
        if (!res.ok) throw new Error(`${url}: ${res.status}`);
        await c.put(url, res);
      })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE)
      .then((c) => c.match(e.request, { ignoreSearch: true }))
      .then((hit) => hit || fetch(e.request))
  );
});

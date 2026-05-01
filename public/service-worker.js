/* Recipe Box service worker — minimal app-shell + recipe cache */
const VERSION = 'rb-v1';
const SHELL_CACHE = `shell-${VERSION}`;
const RECIPE_CACHE = `recipes-${VERSION}`;
const SHELL_URLS = ['/library', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (!k.endsWith(VERSION)) return caches.delete(k);
          return undefined;
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Don't intercept Next.js dev assets, RSC payloads, or auth
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/')) return;

  // Recipe detail pages — stale-while-revalidate
  if (url.pathname.startsWith('/recipes/')) {
    event.respondWith(
      caches.open(RECIPE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || networkPromise;
      }),
    );
    return;
  }

  // App shell — cache-first
  if (SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(req).then((c) => c || fetch(req).catch(() => caches.match('/library'))),
    );
  }
});

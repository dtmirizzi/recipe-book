/* Recipe Box service worker — minimal.
 *
 * Earlier versions cached navigation responses (e.g. /library) and could
 * serve stale redirect responses, breaking the browser's "redirect: manual"
 * mode for navigation requests. We've removed all fetch interception until
 * we're ready to ship a proper offline-shell strategy that handles
 * authenticated routes correctly.
 *
 * The SW still serves the PWA install capability (manifest + icons live
 * elsewhere; this file just needs to register successfully).
 */

const VERSION = 'rb-v2';

self.addEventListener('install', () => {
  // Activate the new SW immediately, replacing any older version.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clear any caches left over from previous SW versions.
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Intentionally no `fetch` listener — every request goes to the network
// directly, just like there's no service worker at all.

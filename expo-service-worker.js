/* eslint-disable no-restricted-globals */
// Custom Expo service worker that skips caching so the PWA always
// loads the latest bundle and auth logic on each deploy.

self.addEventListener('install', (event) => {
  // Activate the new service worker immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of existing clients without waiting for next load.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let the network handle requests directly – no offline caching.
  event.respondWith(fetch(event.request));
});

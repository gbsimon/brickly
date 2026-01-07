// Service Worker for BrickByBrick PWA
// Basic app-shell caching strategy

const CACHE_NAME = 'brickbybrick-v2';
const APP_SHELL_FILES = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_FILES);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip service worker for auth routes (Safari doesn't allow SW to handle redirects)
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/auth/')) {
    return; // Let the browser handle these requests directly
  }

  // Skip navigation requests to avoid caching redirects (iOS Safari limitation)
  if (event.request.mode === 'navigate') {
    return;
  }
  
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then((networkResponse) => {
        // Avoid caching redirect responses which break on iOS Safari
        if (networkResponse.redirected) {
          return networkResponse;
        }
        return networkResponse;
      });
    })
  );
});

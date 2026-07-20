const CACHE_NAME = 'smart-building-v1';
const ASSETS_TO_CACHE = [
  '/Home/',
  '/Home/index.html',
  '/Home/manifest.json',
  '/Home/icon.svg'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass caching for non-http(s) schemes, API requests, Supabase, or non-GET requests
  if (
    event.request.method !== 'GET' ||
    !requestUrl.protocol.startsWith('http') ||
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.href.includes('supabase.co')
  ) {
    return; // Let browser handle it natively (network-only)
  }

  // Stale-While-Revalidate Strategy for local app shell assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Silently swallow fetch errors in background revalidation
          });
        return cachedResponse;
      }

      // Not in cache, fetch from network and cache for next time
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Offline fallback if network fails and not in cache
        if (event.request.mode === 'navigate') {
          return caches.match('/Home/');
        }
      });
    })
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Retrieve custom payload
  const notificationData = event.notification.data || {};
  const targetTab = notificationData.tab || 'dashboard';
  const baseUrl = notificationData.url || self.registration.scope || '/';
  const targetUrl = `${baseUrl}?tab=${targetTab}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's an open window, focus it and tell it to navigate
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        // Check if client is on the same app scope
        if ('focus' in client) {
          client.focus();
          if ('postMessage' in client) {
            client.postMessage({
              type: 'NAVIGATE_TO_TAB',
              tab: targetTab
            });
          }
          return;
        }
      }
      
      // If no window is open, open a new one with the tab query parameter
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

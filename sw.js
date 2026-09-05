const CACHE_NAME = 'strateg-russia-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: кэшируем статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: чистим старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: сначала кэш, потом сеть
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// STAGE10: show push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json?.() || {};
  const options = {
    body: data.body || 'Новое сообщение в STRATEG-RUSSIA',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      ...data.data,
    },
    actions: [
      {
        action: 'open',
        title: 'Открыть',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Закрыть',
        icon: '/icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('STRATEG-RUSSIA', options)
  );
});

// Notification click: открыть приложение
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Если есть открытое окно - фокус на него
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Если нет - открыть новое
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

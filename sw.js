/* ══════════════════════════════════════════════════
   SERVICE WORKER — FLIP & MATCH Horror Battle PWA
   FIXED: no force reload issue, proper update system
══════════════════════════════════════════════════ */

const CACHE_VERSION = 'flipmatch-v1.0.3'; // 🔥 Updated version to force reload
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

/* ── App Shell ── */
const APP_SHELL = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/auth.html',
  '/offline.html',
  '/style.css',
  '/script.js',
  '/manifest.json',

  '/icons/icon-192.png',
  '/icons/icon-512.png',

  '/enemy.png',
  '/player.jpg',

  '/audio/horror.mp3'
];

/* ════════════════════════════════════
   INSTALL
════════════════════════════════════ */
self.addEventListener('install', event => {
  console.log('[SW] Installing:', CACHE_VERSION);

  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      // Robust caching: try to cache each asset individually
      return Promise.allSettled(
        APP_SHELL.map(url => {
          return cache.add(url).catch(err => console.warn(`[SW] Skip caching (Not Found): ${url}`));
        })
      );
    }).then(() => {
      self.skipWaiting(); // activate immediately
    })
  );
});

/* ════════════════════════════════════
   ACTIVATE (DELETE OLD CACHE)
════════════════════════════════════ */
self.addEventListener('activate', event => {
  console.log('[SW] Activating:', CACHE_VERSION);

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key.startsWith('flipmatch-') && key !== CACHE_VERSION + '-static')
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Handle Push Notifications
self.addEventListener('push', (event) => {
    let data = { title: 'Flip & Match', body: 'New monsters have appeared!' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'Flip & Match', body: event.data.text() };
        }
    }

    const options = {
        body: data.body,
        icon: '/player.jpg',
        badge: '/enemy.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '2'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});

/* ════════════════════════════════════
   FETCH STRATEGY (FIXED)
════════════════════════════════════ */
self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // ❗ HTML = network first (IMPORTANT FIX)
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // ❗ JS / CSS = network first (NO MORE STALE FILES)
  if (
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ❗ Images = cache first (faster game load)
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // fallback
  event.respondWith(networkFirst(request));
});

/* ════════════════════════════════════
   STRATEGIES
════════════════════════════════════ */

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);

    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());

    return response;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || caches.match('/offline.html');
  }
}

/* ════════════════════════════════════
   UPDATE HANDLER (FROM MAIN APP)
════════════════════════════════════ */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    });
  }
});
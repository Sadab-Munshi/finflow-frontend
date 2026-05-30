const CACHE_NAME = 'finflow-v2';
const DATA_CACHE = 'finflow-data-v1';
const PAGE_CACHE = 'finflow-pages-v1';

const PRESERVED_CACHES = [CACHE_NAME, DATA_CACHE, PAGE_CACHE];

const PRECACHE_ASSETS = [
  '/assets/loading.gif',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/finflow-logo.png',
];

const APP_SHELL_PAGES = [
  '/dashboard',
  '/history',
  '/budgets',
  '/insights',
  '/reports',
  '/settings',
  '/profile',
  '/notifications',
  '/add',
];

// Install: precache static assets + app shell pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)),
      caches.open(PAGE_CACHE).then((cache) =>
        Promise.all(
          APP_SHELL_PAGES.map((page) =>
            fetch(page).then((res) => {
              if (res.ok) cache.put(page, res.clone());
            }).catch(() => {/* offline during install — skip */})
          )
        )
      ),
    ])
  );
  self.skipWaiting();
});

// Activate: clean old caches, preserve known caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !PRESERVED_CACHES.includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: apply caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http schemes
  if (!url.protocol.startsWith('http')) return;

  // Supabase REST data: stale-while-revalidate
  if (isSupabaseDataRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }

  // App shell HTML pages: network-first with page cache fallback
  if (isAppShellPage(url)) {
    event.respondWith(networkFirstWithPageCache(request));
    return;
  }

  // API routes: network-first (fresh data priority)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (icons, images, fonts, JS, CSS): cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Supabase storage (avatars): stale-while-revalidate
  if (url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Next.js static files: cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages: network-first for freshness
  event.respondWith(networkFirst(request));
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'FinFlow',
      body: event.data.text(),
      icon: '/finflow-logo.png',
      badge: '/icons/icon-96x96.png',
    };
  }

  const options = {
    body: data.body || data.message || '',
    icon: data.icon || '/finflow-logo.png',
    badge: data.badge || '/icons/icon-96x96.png',
    tag: data.tag || 'finflow-notification',
    data: {
      url: data.link || data.url || '/dashboard',
    },
    vibrate: [100, 50, 100],
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'FinFlow', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Listen for skip waiting message from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// -- Caching strategies --

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithPageCache(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName || CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached || new Response('Offline', { status: 503 }));
  return cached || fetchPromise;
}

// -- Helpers --

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/.test(pathname) ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/assets/');
}

function isSupabaseDataRequest(url) {
  if (!url.hostname.endsWith('.supabase.co')) return false;
  if (!url.pathname.includes('/rest/v1/')) return false;
  const tables = ['transactions', 'budgets', 'settings'];
  return tables.some((table) => url.pathname.includes(`/rest/v1/${table}`));
}

function isAppShellPage(url) {
  if (url.origin !== self.location.origin) return false;
  return APP_SHELL_PAGES.some((page) => url.pathname === page || url.pathname.startsWith(page + '/'));
}

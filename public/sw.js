const CACHE_NAME = 'finflow-v2';

// Static assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/images/finflow-logo.png',
];

const PUBLIC_CACHEABLE_PATHS = new Set([
  '/',
  '/privacy',
  '/terms',
  '/disclaimer',
  '/support',
  '/user-guide',
]);

function isSafeInternalPath(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed, self.location.origin);
    return parsed.origin === self.location.origin;
  } catch {
    return false;
  }
}

// Install: pre-cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

// Activate: clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Listen for messages from the app (SKIP_WAITING & CLEAR_AUTH_CACHE)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CLEAR_AUTH_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      )
    );
  }
});

// Fetch: smart caching strategy per resource type (never cache authenticated HTML or API data)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (Supabase, external APIs, etc.)
  if (url.origin !== self.location.origin) return;

  // Never cache API routes or auth callback endpoints
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return;
  }

  // Next.js static chunks (_next/static): cache-first (immutable, hashed filenames)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Next.js data routes (_next/data): network-only to avoid caching user-specific props
  if (url.pathname.startsWith('/_next/data/')) {
    return;
  }

  // Static assets (icons, images, fonts, manifest): stale-while-revalidate
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/icons-png/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname === '/site.webmanifest'
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Only cache explicitly public marketing HTML pages; authenticated pages go directly to network
  if (PUBLIC_CACHEABLE_PATHS.has(url.pathname)) {
    event.respondWith(networkFirstPublic(request));
  }
});

// ============ PUSH NOTIFICATIONS ============

// Receive push notification from server and display it
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const rawUrl = data.link || data.url || '/dashboard';
    const safeUrl = isSafeInternalPath(rawUrl) ? rawUrl : '/dashboard';

    const options = {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: {
        url: safeUrl,
        notificationId: data.id,
      },
      vibrate: [100, 50, 100],
      tag: data.tag || 'finflow-notification',
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'FinFlow', options)
    );
  } catch (err) {
    console.error('[SW] Error processing push event:', err);
  }
});

// Handle notification click: focus existing tab or open new one (validated internal path only)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || '/dashboard';
  const safeUrl = isSafeInternalPath(rawUrl) ? rawUrl : '/dashboard';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(safeUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(safeUrl);
      })
  );
});

// Cache-first: return cached version, fetch from network only on cache miss
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

// Network-first for public pages only (respecting Cache-Control: no-store)
async function networkFirstPublic(request) {
  try {
    const response = await fetch(request);
    const cacheControl = response.headers.get('cache-control') || '';
    if (response.ok && !cacheControl.includes('no-store') && !cacheControl.includes('private')) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate: return cached immediately, update cache in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

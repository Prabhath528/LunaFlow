// ============================================================
// LunaFlow Service Worker
// Offline-first strategy — makes the app work as a true
// standalone installed app with no browser UI
// ============================================================

const CACHE_NAME    = 'lunaflow-v3';
const OFFLINE_URL   = './index.html';

// Core shell — always cache these on install
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './pwa-install.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
];

// ── INSTALL ─────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing LunaFlow v3');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => {
        console.log('[SW] Shell cached');
        return self.skipWaiting(); // activate immediately
      })
      .catch(err => {
        console.warn('[SW] Shell cache partial fail:', err);
        return self.skipWaiting();
      })
  );
});

// ── ACTIVATE ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim()) // take control immediately
  );
});

// ── FETCH: Offline-first for shell, network-first for images ─
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http(s) requests
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);
  const isShell = SHELL_ASSETS.some(a => request.url.endsWith(a.replace('./', '/')))
                  || url.pathname === '/'
                  || url.pathname.endsWith('/index.html');

  // ── SHELL: Cache-first (app works offline instantly) ──────
  if (isShell || request.destination === 'document') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          // Refresh cache in background
          fetch(request)
            .then(res => {
              if (res && res.status === 200 && res.type !== 'opaque') {
                caches.open(CACHE_NAME).then(c => c.put(request, res));
              }
            })
            .catch(() => {});
          return cached;
        }
        // Not in cache — fetch and cache
        return fetch(request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        }).catch(() => caches.match(OFFLINE_URL));
      })
    );
    return;
  }

  // ── ASSETS (fonts, scripts, icons): Cache-first ──────────
  if (
    request.destination === 'script'  ||
    request.destination === 'style'   ||
    request.destination === 'font'    ||
    request.destination === 'image'   ||
    request.destination === 'manifest'
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (!res || res.status !== 200) return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        }).catch(() => cached || new Response('', { status: 408 }));
      })
    );
    return;
  }

  // ── EVERYTHING ELSE: Network with cache fallback ──────────
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});

// ── MESSAGE: force update from client ────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

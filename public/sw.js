// ═══ Kaironaute — Service Worker V9 Sprint 8c ═══
// Stratégie : Cache-first pour assets statiques, network-only pour Firebase.
// Mise à jour : skipWaiting() + clientsClaim() pour déploiements Netlify.

const CACHE_VERSION = 'kaironaute-v9';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// ── Install : pré-cache des assets critiques ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate : nettoyage des anciens caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch : cache-first pour assets, network-only pour Firebase ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Toujours réseau pour Firebase, APIs et fonts Google
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    return; // pas de cache → comportement réseau natif
  }

  // Cache-first pour tout le reste
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Ne cache que les réponses valides (pas les erreurs 4xx/5xx)
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_VERSION).then((cache) =>
            cache.put(event.request, toCache)
          );
        }
        return response;
      }).catch(() => {
        // Fallback offline : retourner la page d'accueil depuis le cache
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

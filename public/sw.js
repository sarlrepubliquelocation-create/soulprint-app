// ═══ Kaironaute — Service Worker V10 — Push Notifications ═══
// Stratégie : Cache-first pour assets statiques, network-only pour Firebase.
// Mise à jour : skipWaiting() + clientsClaim() pour déploiements Netlify.
// Nouveau : gestion push notifications + clic notification.

const CACHE_VERSION = 'kaironaute-v10';
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

// ── Push : notification envoyée depuis le serveur (future Cloud Function) ──
self.addEventListener('push', (event) => {
  let data = { title: 'Kaironaute', body: 'Ton score du jour t\'attend !', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch { /* fallback au message par défaut */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'daily-score',
      renotify: true,
      data: { url: data.url || '/' },
    })
  );
});

// ── Clic sur notification : ouvrir l'app ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Si l'app est déjà ouverte, focus dessus
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Sinon, ouvrir un nouvel onglet
      return self.clients.openWindow(targetUrl);
    })
  );
});

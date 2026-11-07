/**
 * ScoreAR Service Worker (v7.0.0)
 * Provides offline caching for static assets, character avatars, and essential styles
 * Ensures resilient classroom gameplay on slow or intermittent school networks.
 */

const CACHE_NAME = 'scorear-v8-b2a-cache';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './worlds.js',
  './cards.json',
  './assets/characters/char_01_avatar.webp',
  './assets/characters/teacher_ahmed.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('ScoreAR SW: Non-fatal caching error during install:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclude real-time Firebase, Firestore, Gemini AI endpoints and external APIs from SW cache
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.pathname.includes('/api/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Network-First with Cache Fallback strategy for maximum freshness
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

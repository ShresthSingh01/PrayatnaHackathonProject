/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Declare self for TypeScript
declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
self.clientsClaim();

// 1. Precache Build Assets
precacheAndRoute(self.__WB_MANIFEST);

// 2. Cleanup Old Caches
cleanupOutdatedCaches();

// 3. Runtime Caching: Images
registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
        cacheName: 'images-cache',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
            }),
        ],
    })
);

// 4. Runtime Caching: Fonts (Google Fonts, etc.)
registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
    new StaleWhileRevalidate({
        cacheName: 'google-fonts',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 20,
            })
        ]
    })
);

// 5. Background Sync for offline POST requests (General)
// Note: Specific application usage (Firebase) uses Client-side IndexedDB queue, 
// but this handles standard fetch API retries.
const bgSyncPlugin = new BackgroundSyncPlugin('post-queue', {
    maxRetentionTime: 24 * 60, // Retry for 24 hours
});

registerRoute(
    ({ request }) => request.method === 'POST',
    new NetworkFirst({
        plugins: [bgSyncPlugin],
        networkTimeoutSeconds: 10
    })
);

console.log('[Service Worker] Initialized with Background Sync');

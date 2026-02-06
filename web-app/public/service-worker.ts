/// <reference lib="webworker" />

// Service Worker for Horizon Tasks PWA
// Handles caching, offline support, and push notifications

const CACHE_NAME = 'horizon-tasks-v1';
const RUNTIME_CACHE = 'horizon-runtime-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.svg',
];

const sw = self as unknown as ServiceWorkerGlobalScope;

// Install event - cache critical assets
sw.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Precaching app shell');
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    // Activate immediately
    sw.skipWaiting();
});

// Activate event - clean up old caches
sw.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map((name) => caches.delete(name))
            );
        })
    );
    // Take control immediately
    sw.clients.claim();
});

// Fetch event - serve from cache, fallback to network
sw.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip API calls (always go to network)
    if (request.url.includes('/api/')) return;

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            // Clone the request
            return fetch(request.clone()).then((response) => {
                // Don't cache non-successful responses
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Clone the response
                const responseToCache = response.clone();

                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, responseToCache);
                });

                return response;
            });
        })
    );
});

// Push notification event
sw.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options: NotificationOptions = {
        body: data.body || 'You have a new notification',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/',
            taskId: data.taskId,
            listId: data.listId,
        },
        actions: [
            {
                action: 'open',
                title: 'Open',
            },
            {
                action: 'close',
                title: 'Dismiss',
            },
        ],
    };

    event.waitUntil(
        sw.registration.showNotification(data.title || 'Horizon Tasks', options)
    );
});

// Notification click event
sw.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    // Open the app or focus existing window
    event.waitUntil(
        sw.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }

                // Otherwise open a new window
                const url = event.notification.data?.url || '/';
                if (sw.clients.openWindow) {
                    return sw.clients.openWindow(url);
                }
            })
    );
});

// Background sync event (future enhancement)
sw.addEventListener('sync', (event) => {
    if (event.tag === 'sync-tasks') {
        event.waitUntil(
            // Placeholder for background sync logic
            Promise.resolve()
        );
    }
});

export { };

// Release-coherent app shell. No Firebase, external assets or non-GET requests are cached.
const CACHE_NAME = 'nomera-cache-6513d989b208';
const ASSETS = ['./', './index.html', './manifest.json', './styles.css?v=e935d3599aad',
    './js/security.js?v=ed845ef69db6', './js/storage.js?v=327dc7592b84', './js/race-records.js?v=eaeaf8e59fc2', './js/race-economy.js?v=117874dbbaf3', './js/audio.js?v=c6af379f8b08', './js/race-effects.js?v=2b0950cb6f6b', './js/car-3d.js?v=893179efffd9', './js/app.js?v=ef1dd46e2fd6',
    './icons/car-placeholder.svg', './icons/icon-192.png', './icons/icon-512.png'];
const allowed = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
    if (typeof self.skipWaiting === 'function') {
        self.skipWaiting();
    }
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
    // Wait for existing tabs to close; don't replace their worker mid-race.
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('nomera-cache-') && key !== CACHE_NAME)
            .map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});
self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET' || !allowed.has(request.url)) return;
    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const response = await fetch(request);
                if (response.ok && response.headers.get('content-type')?.includes('text/html')) return response;
            } catch (_) { /* Use this worker's complete release when offline. */ }
            const cache = await caches.open(CACHE_NAME);
            return (await cache.match(request)) || (await cache.match(new URL('./index.html', self.registration.scope))) || Response.error();
        })());
        return;
    }
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) || fetch(request);
    })());
});

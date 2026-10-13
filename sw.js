// Release-coherent app shell. No Firebase, external assets or non-GET requests are cached.
const CACHE_NAME = 'nomera-cache-bf25b8daa448';
const ASSETS = ['./', './index.html', './manifest.json', './styles.css?v=1ea3e9ae3fa8',
    './js/security.js?v=5cc426efe69b', './js/storage.js?v=327dc7592b84', './js/race-records.js?v=eaeaf8e59fc2', './js/race-economy.js?v=fbfa03fdf97b', './js/audio.js?v=59465c7aad9f', './js/app.js?v=7a61d311a983',
    './icons/car-placeholder.svg', './icons/icon-192.png', './icons/icon-512.png'];
const allowed = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
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

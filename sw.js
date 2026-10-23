// Release-coherent app shell. No Firebase, external assets or non-GET requests are cached.
const CACHE_NAME = 'nomera-cache-bad6bde1f05e';
const ASSETS = ['./', './index.html', './manifest.json', './styles.css?v=0884b84e3947',
    './js/security.js?v=02e3f2433778', './js/storage.js?v=3c82419118a8', './js/race-records.js?v=9c07941a09a1', './js/race-economy.js?v=bf8106303505', './js/audio.js?v=664160c34f61', './js/race-effects.js?v=fc73a6fc7be9', './js/nfs-physics.js?v=af5aca554bae', './js/nfs-circuit-race.js?v=48626870a125', './js/car-3d.js?v=89d1a760a56d', './js/app.js?v=7f05adcc4b83',
    './js/model-assets.js?v=fb5618d170bd', './icons/car-placeholder.svg', './icons/icon-192.png', './icons/icon-512.png'];
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
                const response = await fetch(request, { cache: 'no-cache' });
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

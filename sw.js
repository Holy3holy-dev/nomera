// Release-coherent app shell. No Firebase, external assets or non-GET requests are cached.
const CACHE_NAME = 'nomera-cache-306b8bcc4d89';
const ASSETS = ["./","./index.html","./authors-release.html","./manifest.json","./styles.css?v=0884b84e3947","./authors-legacy.css?v=0dc5effd6f2e","./js/authors-progression.js?v=4f350ecb3d96","./js/authors-activities.js?v=7da88ca6b3e5","./js/authors-reel-motion.js?v=16bdf62747b6","./js/authors-number-banks.js?v=f03bf37cd95c","./js/authors-number-audio.js?v=6eec668257df","./js/authors-soundscape.js?v=380abfdcb3b6","./js/authors-radio.js?v=0e1d884ce9a8","./js/authors-playground.js?v=1f0626de38f8","./js/authors-road-events.js?v=5820f778eb58","./js/authors-livery.js?v=2513bf1993f2","./js/authors-preview-pause.js?v=5a5842ce8e48","./js/authors-rigid-body.js?v=fe93c4935e42","./js/authors-body-damage.js?v=92cea273f29e","./js/authors-traffic.js?v=e8853986e695","./js/authors-environment.js?v=4ec4edf8f974","./js/authors-circuit-life.js?v=4cb364933d24","./js/authors-route-detail.js?v=7127223bbf90","./js/authors-road-weather.js?v=a6e2151300c7","./js/authors-night-lighting.js?v=12a1635090bf","./js/authors-npc-signals.js?v=db73d250121e","./js/authors-race-hud.js?v=b413137519dc","./js/authors-route-dressing.js?v=df687e34ee14","./js/authors-race-experience.js?v=c3c5ba85e5d0","./js/authors-world.js?v=e7664a055d14","./js/authors-rival-ai.js?v=5fadcd4bb003","./js/authors-screen-controls.js?v=964395703c2e","./js/authors-scene.js?v=f5e14ab8d378","./js/authors-mw-mass.js?v=a8c477aa0e8f","./js/authors-mw-contact.js?v=b665eac7ffe9","./js/authors-road-surface.js?v=f2c87972724f","./js/authors-mw-physics.js?v=f8d5328c137f","./js/authors-camera-profiles.js?v=ee3b08be751b","./js/authors-steering-profiles.js?v=6f469762c80f","./js/authors-steering-rig.js?v=38899f008319","./js/authors-driver-camera.js?v=fd47f4726651","./js/authors-wheel-rig.js?v=f102caf2e8ca","./js/authors-driving.js?v=5acb7f897174","./js/authors-engine-tone.js?v=20e6fded6590","./js/authors-engine-voices.js?v=77e3d46136c1","./js/authors-race-audio.js?v=1cade94c951e","./js/authors-road-sound.js?v=976c724f8420","./authors.css?v=1319fe8e2062","./authors-expansion.css?v=4bafe3cd3c35","./authors-secondary.css?v=a7d08b85081e","./authors-plate-effects.css?v=919821b6ec5b","./authors-rewards.css?v=59f8a52488cf","./js/authors-rewards.js?v=cd07ca5e294d","./js/vehicle-lod-assets.js?v=b0268ec1ce9c","./js/authors-vehicle-lod.js?v=e72c64b605d0","./js/authors-collection-finish.js?v=9054cf5a69e0","./js/mobile-texture-assets.js?v=d5be325f5bf0","./js/authors-mobile-textures.js?v=68d0b4d73592","./authors-refinement.css?v=ac3c161379d4","./js/authors-refinement.js?v=d3913abbe9b2","./js/player-lod-profiles.js?v=460d0ddf36eb","./js/authors-scene-perf.js?v=604c1ff26bab","./js/authors-player-render.js?v=bc9854c23b92","./authors-driving.css?v=025441632dc6","./authors-motorsport.css?v=fc14a6c4e413","./authors-workshop.css?v=cb5cc74c40b2","./js/authors-prestige.js?v=5cdba8cf2032","./authors-prestige.css?v=6b332eec83b8","./js/authors-fitment-guides.js?v=016376a80243","./js/authors-vehicle-finish.js?v=bdbced931f80","./js/authors-aero-fitment.js?v=0d0dd586200a","./js/authors-aero-kit.js?v=64a5de901b8d","./js/authors-atelier.js?v=a5f62d21ac22","./authors-atelier.css?v=5e87b4c86b9c","./authors-garage.css?v=5cef62b8ad75","./authors-exchange.css?v=204cdc889193","./js/authors-registration.js?v=422d29d0d6cc","./authors-registration.css?v=c78f2b453d04","./authors-progression.css?v=032ff23d864d","./authors-sound.css?v=e17b8aac1ae1","./authors-reel-motion.css?v=324c78b5eb81","./js/authors-case-results.js?v=87e7d874efb3","./authors-case-results.css?v=b81c2e0f8128","./js/authors-collection.js?v=aeccb50078e2","./authors-collection.css?v=60e759b7d2b6","./js/authors-districts.js?v=a682f474489a","./js/security.js?v=02e3f2433778","./js/storage.js?v=3c82419118a8","./js/race-records.js?v=9c07941a09a1","./js/race-economy.js?v=bf8106303505","./js/audio.js?v=4e585f228b5d","./js/vendor/three.min.js?v=7ae04663bb43","./js/vendor/DRACOLoader.js?v=2a03d08582c0","./js/vendor/meshopt_decoder.js?v=ece7e7138127","./js/vendor/GLTFLoader.js?v=430707158b6a","./js/race-effects.js?v=fc73a6fc7be9","./js/nfs-physics.js?v=36ac431f8a55","./js/nfs-circuit-race.js?v=3dd7b0fe9781","./js/model-assets.js?v=fb5618d170bd","./js/car-3d.js?v=a80a510a63d0","./js/app.js?v=f3472a7ef996","./js/plate-presentation.js?v=d431a40e11c5","./js/authors-plate-passport.js?v=63b5c771a5fe","./js/authors-ui.js?v=4df999310614","./js/authors-expansion.js?v=ea0a3a7bb042","./js/authors-secondary.js?v=e573cfe6a2d3","./js/authors-workshop-ui.js?v=d58c511f3bcd","./js/authors-garage-ui.js?v=6a3ba6d13987","./js/authors-exchange-ui.js?v=832b9e96702d","./js/authors-progression-ui.js?v=81f40491fcf4","./js/authors-progression-celebration.js?v=832961f4fa3a","./js/authors-activities-ui.js?v=5ce5a6c8e0f8","./js/authors-sound-ui.js?v=0badc3ca8e7b","./assets/authors-brand/favicon.svg","./icons/car-placeholder.svg","./icons/icon-192.png","./icons/icon-512.png"];
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

// Release-coherent app shell. No Firebase, external assets or non-GET requests are cached.
const CACHE_NAME = 'nomera-cache-521591e8be22';
const ASSETS = ["./","./index.html","./manifest.json","./styles.css?v=c8a2d45002d4","./authors-legacy.css?v=9762a7651c8d","./js/authors-progression.js?v=4f350ecb3d96","./js/authors-activities.js?v=7da88ca6b3e5","./js/authors-reel-motion.js?v=5c5ca62b0b54","./js/authors-number-banks.js?v=abe6f75d0562","./js/authors-number-audio.js?v=6eec668257df","./js/authors-soundscape.js?v=c1f9ce0de32c","./js/authors-radio.js?v=94a35d5d10d7","./js/authors-playground.js?v=1f0626de38f8","./js/authors-road-events.js?v=5820f778eb58","./js/authors-livery.js?v=2513bf1993f2","./js/authors-preview-pause.js?v=5a5842ce8e48","./js/authors-rigid-body.js?v=a0475de9158a","./js/authors-body-damage.js?v=92cea273f29e","./js/authors-traffic.js?v=e8853986e695","./js/authors-environment.js?v=ef280cf404be","./js/authors-circuit-life.js?v=aae53fec0096","./js/authors-route-detail.js?v=7127223bbf90","./js/authors-road-weather.js?v=3cae3d537bfe","./js/authors-night-lighting.js?v=7ae35e7f2f5f","./js/authors-npc-signals.js?v=41d508352337","./js/authors-race-hud.js?v=c17025e08eab","./js/authors-route-dressing.js?v=9841b2451cc1","./js/authors-race-experience.js?v=8699312279a4","./js/authors-world.js?v=e7664a055d14","./js/authors-rival-ai.js?v=5fadcd4bb003","./js/authors-screen-controls.js?v=3c5793cb480c","./js/authors-scene.js?v=8dc032d7d13c","./js/authors-mw-mass.js?v=a8c477aa0e8f","./js/authors-mw-contact.js?v=b665eac7ffe9","./js/authors-road-surface.js?v=f2c87972724f","./js/authors-mw-physics.js?v=f8d5328c137f","./js/authors-camera-profiles.js?v=ee3b08be751b","./js/authors-steering-profiles.js?v=6f469762c80f","./js/authors-steering-rig.js?v=38899f008319","./js/authors-driver-camera.js?v=8e9becbdd70a","./js/authors-wheel-rig.js?v=c9e1466dcaf3","./js/authors-driving.js?v=5acb7f897174","./js/authors-engine-tone.js?v=623d519a6bfe","./js/authors-engine-voices.js?v=c4d682b78f98","./js/authors-race-audio.js?v=b4dd687b0e7e","./js/authors-road-sound.js?v=9e6de4e7e7c3","./authors.css?v=56c7201b4314","./authors-expansion.css?v=3a78cf886044","./authors-secondary.css?v=a7d08b85081e","./authors-plate-effects.css?v=78ec13cff879","./authors-rewards.css?v=59f8a52488cf","./js/authors-rewards.js?v=57fc4772bed9","./js/vehicle-lod-assets.js?v=b0268ec1ce9c","./js/authors-vehicle-lod.js?v=e72c64b605d0","./js/authors-collection-finish.js?v=9054cf5a69e0","./js/mobile-texture-assets.js?v=d5be325f5bf0","./js/authors-mobile-textures.js?v=68d0b4d73592","./authors-refinement.css?v=ac3c161379d4","./js/authors-refinement.js?v=d3913abbe9b2","./js/player-lod-profiles.js?v=2739183d6f95","./js/authors-scene-perf.js?v=604c1ff26bab","./js/authors-player-render.js?v=bc9854c23b92","./authors-driving.css?v=12cd8ac6baf6","./authors-motorsport.css?v=fc14a6c4e413","./authors-workshop.css?v=cb5cc74c40b2","./js/authors-prestige.js?v=ae29fb0abcee","./authors-prestige.css?v=ff988178746c","./js/authors-fitment-guides.js?v=016376a80243","./js/authors-vehicle-finish.js?v=a7de1e04f832","./js/authors-aero-fitment.js?v=cf5027e20b49","./js/authors-aero-kit.js?v=b3850c2cb4d0","./js/authors-atelier.js?v=c4118a50526c","./authors-atelier.css?v=e1c53af2ffbe","./authors-garage.css?v=5cef62b8ad75","./authors-exchange.css?v=a05afdfd38a8","./js/authors-registration.js?v=52e7f681083d","./authors-registration.css?v=1dd19a823aac","./authors-progression.css?v=5eb990b30363","./authors-sound.css?v=96bbcf2df8b5","./authors-reel-motion.css?v=324c78b5eb81","./js/authors-case-results.js?v=87e7d874efb3","./authors-case-results.css?v=b81c2e0f8128","./js/authors-collection.js?v=aeccb50078e2","./authors-collection.css?v=60e759b7d2b6","./js/authors-districts.js?v=a682f474489a","./js/security.js?v=ed845ef69db6","./js/storage.js?v=327dc7592b84","./js/race-records.js?v=eaeaf8e59fc2","./js/race-economy.js?v=2802923358a3","./js/audio.js?v=e46bc879fc13","./js/vendor/three.min.js?v=9274bbcec8d9","./js/vendor/DRACOLoader.js?v=bbd4a1bb08f0","./js/vendor/meshopt_decoder.js?v=849c1e7c10ee","./js/vendor/GLTFLoader.js?v=5c15967ba830","./js/race-effects.js?v=fc73a6fc7be9","./js/nfs-physics.js?v=51a929ab5434","./js/nfs-circuit-race.js?v=f0d04581eba0","./js/model-assets.js?v=fb5618d170bd","./js/car-3d.js?v=91b4105c86b2","./js/app.js?v=a1b9347b6f5a","./js/plate-presentation.js?v=d431a40e11c5","./js/authors-plate-passport.js?v=65388cf6954f","./js/authors-ui.js?v=90a948c5fad1","./js/authors-expansion.js?v=256c25c0994c","./js/authors-secondary.js?v=ece739ad1daf","./js/authors-workshop-ui.js?v=d58c511f3bcd","./js/authors-garage-ui.js?v=6a3ba6d13987","./js/authors-exchange-ui.js?v=832b9e96702d","./js/authors-progression-ui.js?v=81f40491fcf4","./js/authors-progression-celebration.js?v=5e99e908d7d9","./js/authors-activities-ui.js?v=5ce5a6c8e0f8","./js/authors-sound-ui.js?v=58ceeee384ed","./assets/authors-brand/favicon.svg","./icons/car-placeholder.svg","./icons/icon-192.png","./icons/icon-512.png"];
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

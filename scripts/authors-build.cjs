'use strict';
// Derive a local-only entry from the actual game, keeping every game control and ID.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const lodHash=file=>require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'js',file))).digest('hex').slice(0,12);
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace('<title>H3H Nomera</title>', '<title>NOMERA — Author’s Edition</title>');
html = html.replace(/, maximum-scale=1\.0, user-scalable=no/, '');
html = html.replace(/<link[^>]+(?:fonts\.googleapis|fonts\.gstatic|rel="manifest")[^>]*>/g, '');
html = html.replace(/<script src="https:\/\/www\.gstatic\.com[^>]*><\/script>/g, '');
html = html.replace("if ('serviceWorker' in navigator)", "if (!window.NOMERA_AUTHORS_PREVIEW && 'serviceWorker' in navigator)");
html = html.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' blob: data:; img-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'">
    <script src="./js/authors-preview.js"></script>`);
// Legacy CSS has accumulated thousands of !important declarations. Demote them
// in this generated entry only so the isolated design system can control layout.
fs.writeFileSync(path.join(root, 'authors-legacy.css'), fs.readFileSync(path.join(root,'styles.css'),'utf8').replace(/!important/g,''));
fs.writeFileSync(path.join(root, 'antigravity.html'), html);
html = html.replace('</head>', '<script src="./js/authors-preview-pause.js"></script><script src="./js/authors-rigid-body.js"></script><script src="./js/authors-body-damage.js"></script><script src="./js/authors-traffic.js"></script><script src="./js/authors-environment.js"></script><script src="./js/authors-route-dressing.js"></script><script src="./js/authors-race-experience.js"></script><script src="./js/authors-world.js"></script><script src="./js/authors-scene.js"></script><script src="./js/authors-mw-mass.js"></script><script src="./js/authors-mw-contact.js"></script><script src="./js/authors-road-surface.js"></script><script src="./js/authors-mw-physics.js"></script><script src="./js/authors-camera-profiles.js"></script><script src="./js/authors-steering-profiles.js"></script><script src="./js/authors-steering-rig.js"></script><script src="./js/authors-driver-camera.js"></script><script src="./js/authors-wheel-rig.js"></script><script src="./js/authors-driving.js"></script><script src="./js/authors-engine-voices.js"></script><script src="./js/authors-race-audio.js"></script></head>');
html = html.replace(/\.\/styles\.css\?v=[a-f0-9]+/, './authors-legacy.css');
html = html.replace('</head>', '<link rel="stylesheet" href="./authors.css"><link rel="stylesheet" href="./authors-expansion.css"><link rel="stylesheet" href="./authors-secondary.css"><link rel="stylesheet" href="./authors-plate-effects.css"></head>');
html = html.replace('</head>', '<link rel="stylesheet" href="./authors-rewards.css"><script src="./js/authors-rewards.js"></script></head>');
html = html.replace('</head>', `<script>window.NomeraVehicleLodWorkerVersion='${lodHash('authors-lod-worker.js')}';</script><script src="./js/vehicle-lod-assets.js?v=${lodHash('vehicle-lod-assets.js')}"></script><script src="./js/authors-vehicle-lod.js?v=${lodHash('authors-vehicle-lod.js')}"></script></head>`);
html = html.replace('</head>', `<script src="./js/authors-collection-finish.js?v=${lodHash('authors-collection-finish.js')}"></script></head>`);
html = html.replace('</head>', `<script src="./js/mobile-texture-assets.js?v=${lodHash('mobile-texture-assets.js')}"></script><script src="./js/authors-mobile-textures.js?v=${lodHash('authors-mobile-textures.js')}"></script><link rel="stylesheet" href="./authors-refinement.css?v=${require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'authors-refinement.css'))).digest('hex').slice(0,12)}"><script src="./js/authors-refinement.js?v=${lodHash('authors-refinement.js')}"></script></head>`);
html = html.replace('</head>', `<script src="./js/player-lod-profiles.js?v=${lodHash('player-lod-profiles.js')}"></script>`+'</head>');
html = html.replace('</head>', `<script src="./js/authors-scene-perf.js?v=${lodHash('authors-scene-perf.js')}"></script>`+'</head>');
html = html.replace('</head>', `<script src="./js/authors-player-render.js?v=${lodHash('authors-player-render.js')}"></script>`+'</head>');
html = html.replace(/<body([^>]*)>/, '<body$1 class="authors-edition">');
html = html.replace('</body>', '<script src="./js/plate-presentation.js"></script><script src="./js/authors-plate-passport.js"></script><script src="./js/authors-ui.js"></script><script src="./js/authors-preview-market.js"></script><script src="./js/authors-expansion.js"></script><script src="./js/authors-secondary.js"></script></body>');
html=html.replace('</head>',`<link rel="stylesheet" href="./authors-motorsport.css?v=${require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'authors-motorsport.css'))).digest('hex').slice(0,12)}"></head>`);
fs.writeFileSync(path.join(root, 'authors.html'), html);
console.log('authors.html: isolated local entry generated from index.html');

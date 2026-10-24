'use strict';
// Build both the isolated local preview entry (authors.html) and the production
// Author's Edition release entry (index.html and authors-release.html) from legacy.html.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const fileHash = relPath => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relPath))).digest('hex').slice(0, 12);
const jsHash = file => fileHash(path.join('js', file));
const cssHash = file => fileHash(file);

// Ensure legacy.html exists as the clean base template.
const legacyPath = path.join(root, 'legacy.html');
const indexPath = path.join(root, 'index.html');
if (!fs.existsSync(legacyPath)) {
    fs.copyFileSync(indexPath, legacyPath);
}

// Legacy CSS has accumulated thousands of !important declarations. Demote them
// in the Author's Edition entries so the Midnight 02 design system controls layout.
fs.writeFileSync(
    path.join(root, 'authors-legacy.css'),
    fs.readFileSync(path.join(root, 'styles.css'), 'utf8').replace(/!important/g, '')
);

const SANDBOX_CSP = "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' blob: data:; img-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'";

function buildAuthorsEntry({ release = false } = {}) {
    let html = fs.readFileSync(legacyPath, 'utf8');
    html = html.replace('</head>', `<script src="./js/authors-progression.js?v=${jsHash('authors-progression.js')}"></script></head>`);
    html = html.replace('</head>', `<script src="./js/authors-activities.js?v=${jsHash('authors-activities.js')}"></script></head>`);
    html = html.replace('<title>H3H Nomera</title>', '<title>NOMERA — Author’s Edition</title>');
    html = html.replace(/, maximum-scale=1\.0, user-scalable=no/, '');

    if (release) {
        html = html.replace(
            "if ('serviceWorker' in navigator)",
            "if ((!window.NOMERA_AUTHORS_PREVIEW || window.NOMERA_AUTHORS_RELEASE) && 'serviceWorker' in navigator)"
        );
        html = html.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">
    <script>window.NOMERA_AUTHORS_PREVIEW=true;window.NOMERA_AUTHORS_RELEASE=true;window.NOMERA_STORAGE_PREFIX='';</script>`);
    } else {
        html = html.replace(/<link[^>]+(?:fonts\.googleapis|fonts\.gstatic|rel="manifest")[^>]*>/g, '');
        html = html.replace(/<script src="https:\/\/www\.gstatic\.com[^>]*><\/script>/g, '');
        html = html.replace("if ('serviceWorker' in navigator)", "if (!window.NOMERA_AUTHORS_PREVIEW && 'serviceWorker' in navigator)");
        html = html.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}">
    <script src="./js/authors-preview.js?v=${jsHash('authors-preview.js')}"></script>`);
        fs.writeFileSync(path.join(root, 'antigravity.html'), html);
    }

    html = html.replace('</head>', '<script src="./js/authors-reel-motion.js"></script><script src="./js/authors-number-banks.js"></script><script src="./js/authors-number-audio.js"></script><script src="./js/authors-soundscape.js"></script><script src="./js/authors-radio.js"></script><script src="./js/authors-playground.js"></script><script src="./js/authors-road-events.js"></script><script src="./js/authors-livery.js"></script><script src="./js/authors-preview-pause.js"></script><script src="./js/authors-rigid-body.js"></script><script src="./js/authors-body-damage.js"></script><script src="./js/authors-traffic.js"></script><script src="./js/authors-environment.js"></script><script src="./js/authors-circuit-life.js"></script><script src="./js/authors-route-detail.js"></script><script src="./js/authors-road-weather.js"></script><script src="./js/authors-night-lighting.js"></script><script src="./js/authors-npc-signals.js"></script><script src="./js/authors-race-hud.js"></script><script src="./js/authors-route-dressing.js"></script><script src="./js/authors-race-experience.js"></script><script src="./js/authors-world.js"></script><script src="./js/authors-rival-ai.js"></script><script src="./js/authors-screen-controls.js"></script><script src="./js/authors-scene.js"></script><script src="./js/authors-mw-mass.js"></script><script src="./js/authors-mw-contact.js"></script><script src="./js/authors-road-surface.js"></script><script src="./js/authors-mw-physics.js"></script><script src="./js/authors-camera-profiles.js"></script><script src="./js/authors-steering-profiles.js"></script><script src="./js/authors-steering-rig.js"></script><script src="./js/authors-driver-camera.js"></script><script src="./js/authors-wheel-rig.js"></script><script src="./js/authors-driving.js"></script><script src="./js/authors-engine-tone.js"></script><script src="./js/authors-engine-voices.js"></script><script src="./js/authors-race-audio.js"></script><script src="./js/authors-road-sound.js"></script></head>');
    html = html.replace(/\.\/styles\.css(?:\?v=[a-f0-9]+)?/, `./authors-legacy.css?v=${cssHash('authors-legacy.css')}`);
    html = html.replace('</head>', `<link rel="stylesheet" href="./authors.css?v=${cssHash('authors.css')}"><link rel="stylesheet" href="./authors-expansion.css?v=${cssHash('authors-expansion.css')}"><link rel="stylesheet" href="./authors-secondary.css?v=${cssHash('authors-secondary.css')}"><link rel="stylesheet" href="./authors-plate-effects.css?v=${cssHash('authors-plate-effects.css')}"></head>`);
    html = html.replace('</head>', `<link rel="stylesheet" href="./authors-rewards.css?v=${cssHash('authors-rewards.css')}"><script src="./js/authors-rewards.js"></script></head>`);
    html = html.replace('</head>', `<script>window.NomeraVehicleLodWorkerVersion='${jsHash('authors-lod-worker.js')}';</script><script src="./js/vehicle-lod-assets.js?v=${jsHash('vehicle-lod-assets.js')}"></script><script src="./js/authors-vehicle-lod.js?v=${jsHash('authors-vehicle-lod.js')}"></script></head>`);
    html = html.replace('</head>', `<script src="./js/authors-collection-finish.js?v=${jsHash('authors-collection-finish.js')}"></script></head>`);
    html = html.replace('</head>', `<script src="./js/mobile-texture-assets.js?v=${jsHash('mobile-texture-assets.js')}"></script><script src="./js/authors-mobile-textures.js?v=${jsHash('authors-mobile-textures.js')}"></script><link rel="stylesheet" href="./authors-refinement.css?v=${cssHash('authors-refinement.css')}"><script src="./js/authors-refinement.js?v=${jsHash('authors-refinement.js')}"></script></head>`);
    html = html.replace('</head>', `<script src="./js/player-lod-profiles.js?v=${jsHash('player-lod-profiles.js')}"></script></head>`);
    html = html.replace('</head>', `<script src="./js/authors-scene-perf.js?v=${jsHash('authors-scene-perf.js')}"></script></head>`);
    html = html.replace('</head>', `<script src="./js/authors-player-render.js?v=${jsHash('authors-player-render.js')}"></script></head>`);
    html = html.replace(/<body([^>]*)>/, '<body$1 class="authors-edition">');

    const bodyScripts = release
        ? '<script src="./js/plate-presentation.js"></script><script src="./js/authors-plate-passport.js"></script><script src="./js/authors-ui.js"></script><script src="./js/authors-expansion.js"></script><script src="./js/authors-secondary.js"></script><script src="./js/authors-workshop-ui.js"></script></body>'
        : '<script src="./js/plate-presentation.js"></script><script src="./js/authors-plate-passport.js"></script><script src="./js/authors-ui.js"></script><script src="./js/authors-preview-market.js"></script><script src="./js/authors-expansion.js"></script><script src="./js/authors-secondary.js"></script><script src="./js/authors-workshop-ui.js"></script></body>';
    html = html.replace('</body>', bodyScripts);

    html = html.replace('</head>', `<link rel="stylesheet" href="./authors-driving.css?v=${cssHash('authors-driving.css')}"></head>`);
    html = html.replace('</head>', `<link rel="stylesheet" href="./authors-motorsport.css?v=${cssHash('authors-motorsport.css')}"></head>`);
    html = html.replace('</head>', `<link rel="stylesheet" href="./authors-workshop.css?v=${cssHash('authors-workshop.css')}"></head>`);
    html = html.replace('</head>', `<link rel="icon" type="image/svg+xml" href="./assets/authors-brand/favicon.svg"><script src="./js/authors-prestige.js?v=${jsHash('authors-prestige.js')}"></script><link rel="stylesheet" href="./authors-prestige.css?v=${cssHash('authors-prestige.css')}"></head>`);
    html = html.replace('</head>', `<script src="./js/authors-fitment-guides.js?v=${jsHash('authors-fitment-guides.js')}"></script><script src="./js/authors-vehicle-finish.js?v=${jsHash('authors-vehicle-finish.js')}"></script><script src="./js/authors-aero-fitment.js?v=${jsHash('authors-aero-fitment.js')}"></script><script src="./js/authors-aero-kit.js?v=${jsHash('authors-aero-kit.js')}"></script><script src="./js/authors-atelier.js?v=${jsHash('authors-atelier.js')}"></script><link rel="stylesheet" href="./authors-atelier.css?v=${cssHash('authors-atelier.css')}"></head>`);
    html = html.replace('</head>', `<link rel="stylesheet" href="./authors-garage.css?v=${cssHash('authors-garage.css')}"></head>`);
    html = html.replace('</body>', `<script>NomeraAtelier.mount();</script><script src="./js/authors-garage-ui.js?v=${jsHash('authors-garage-ui.js')}"></script></body>`);
    html = html.replace('</head>', `<link rel="stylesheet" href="./authors-exchange.css?v=${cssHash('authors-exchange.css')}"></head>`);
    html = html.replace('</body>', `<script src="./js/authors-exchange-ui.js?v=${jsHash('authors-exchange-ui.js')}"></script></body>`);
    html = html.replace('</head>', `<script src="./js/authors-registration.js?v=${jsHash('authors-registration.js')}"></script><link rel="stylesheet" href="./authors-registration.css?v=${cssHash('authors-registration.css')}"></head>`);
    html = html.replace('</head>', `<link rel="stylesheet" href="./authors-progression.css?v=${cssHash('authors-progression.css')}"></head>`);
    html = html.replace('</body>', `<script src="./js/authors-progression-ui.js?v=${jsHash('authors-progression-ui.js')}"></script></body>`);
    html = html.replace('</body>', `<script src="./js/authors-progression-celebration.js?v=${jsHash('authors-progression-celebration.js')}"></script></body>`);
    html = html.replace('</body>', `<script src="./js/authors-activities-ui.js?v=${jsHash('authors-activities-ui.js')}"></script></body>`);
    html = html.replace('</head>', `<link rel="stylesheet" href="./authors-sound.css?v=${cssHash('authors-sound.css')}"></head>`);
    html = html.replace('</body>', `<script src="./js/authors-sound-ui.js?v=${jsHash('authors-sound-ui.js')}"></script></body>`);
    html = html.replace('</head>', `<script>window.NomeraEngineWorkletVersion='${jsHash('authors-engine-worklet.js')}';</script></head>`);
    html = html.replace('</head>', `<link rel="stylesheet" href="./authors-reel-motion.css?v=${cssHash('authors-reel-motion.css')}"></head>`);
    html = html.replace('</head>', `<script src="./js/authors-case-results.js?v=${jsHash('authors-case-results.js')}"></script><link rel="stylesheet" href="./authors-case-results.css?v=${cssHash('authors-case-results.css')}"></head>`);
    html = html.replace('</head>', `<script src="./js/authors-collection.js?v=${jsHash('authors-collection.js')}"></script><link rel="stylesheet" href="./authors-collection.css?v=${cssHash('authors-collection.css')}"></head>`);
    html = html.replace('</head>', `<script src="./js/authors-districts.js?v=${jsHash('authors-districts.js')}"></script></head>`);

    // Ensure every local ./js/*.js and ./*.css reference carries an up-to-date content hash.
    html = html.replace(/(src|href)="(\.\/(?:js\/[^"?#]+\.js|[^"/?#]+\.css))(?:\?v=[a-f0-9]+)?"/g, (_, attr, relUrl) => {
        const cleanRel = relUrl.slice(2);
        return `${attr}="${relUrl}?v=${fileHash(cleanRel)}"`;
    });

    return html;
}

const sandboxHtml = buildAuthorsEntry({ release: false });
const releaseHtml = buildAuthorsEntry({ release: true });
fs.writeFileSync(path.join(root, 'authors.html'), sandboxHtml);
fs.writeFileSync(path.join(root, 'authors-release.html'), releaseHtml);
fs.writeFileSync(path.join(root, 'index.html'), releaseHtml);
console.log('index.html (Author’s Edition release), authors-release.html, and authors.html (sandbox) generated from legacy.html');

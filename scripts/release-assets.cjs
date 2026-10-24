'use strict';
// Use immutable version URLs so an older worker cannot mix a new HTML with old JS.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const root = path.join(__dirname, '..');
require('./model-assets.cjs').generate();
const files = ['styles.css', 'js/security.js', 'js/storage.js', 'js/race-records.js', 'js/race-economy.js', 'js/audio.js', 'js/race-effects.js', 'js/nfs-physics.js', 'js/nfs-circuit-race.js', 'js/model-assets.js', 'js/car-3d.js', 'js/app.js'];
const hash = value => createHash('sha256').update(value).digest('hex').slice(0,12);
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const file of files) {
    const url = './' + file + '?v=' + hash(fs.readFileSync(path.join(root, file)));
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp('\\./' + escaped + '(?:\\?v=[a-z0-9]+)?', 'g'), url);
}
fs.writeFileSync(path.join(root, 'index.html'), html);

// Regenerate Author's Edition sandbox (authors.html) and production release (authors-release.html)
require('./authors-build.cjs');

const releaseHtml = fs.readFileSync(path.join(root, 'authors-release.html'), 'utf8');
const stylesVersionUrl = './styles.css?v=' + hash(fs.readFileSync(path.join(root, 'styles.css')));
const versionedReleaseUrls = [];
const seenUrls = new Set();
for (const url of [
    stylesVersionUrl,
    ...[...releaseHtml.matchAll(/(?:src|href)="(\.\/(?:js\/[^"?#]+\.js|[^"/?#]+\.css)\?v=[a-f0-9]+)"/g)].map(m => m[1])
]) {
    if (!seenUrls.has(url)) {
        seenUrls.add(url);
        versionedReleaseUrls.push(url);
    }
}

const staticAssets = ['./assets/authors-brand/favicon.svg', './icons/car-placeholder.svg', './icons/icon-192.png', './icons/icon-512.png'];
const swAssets = ['./', './index.html', './authors-release.html', './manifest.json', ...versionedReleaseUrls, ...staticAssets];

const manifest = fs.readFileSync(path.join(root, 'manifest.json'));
const release = hash(
    releaseHtml +
    html +
    manifest +
    versionedReleaseUrls.concat(staticAssets).map(u => fs.readFileSync(path.join(root, u.split('?')[0].slice(2)))).join('')
);

let worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
worker = worker.replace(/const CACHE_NAME = '[^']+';/, "const CACHE_NAME = 'nomera-cache-" + release + "';");
worker = worker.replace(/const ASSETS = \[[\s\S]*?\];/, 'const ASSETS = ' + JSON.stringify(swAssets) + ';');
fs.writeFileSync(path.join(root, 'sw.js'), worker);
console.log('App assets versioned for release ' + release);

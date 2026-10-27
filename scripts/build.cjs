'use strict';
// Public web directory contains only client assets. Never publish source, functions or secrets.
// By default, npm run build publishes the Author's Edition release as dist/index.html while
// preserving dist/legacy.html (pre-Author's-Edition rollback) and dist/authors.html (sandbox).
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

require('./release-assets.cjs');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

// Keep the pre-Author's-Edition entry available as legacy.html for instant rollback.
fs.copyFileSync(path.join(root, 'legacy.html'), path.join(dist, 'legacy.html'));

// Publish the production Author's Edition release as both dist/index.html and dist/authors-release.html.
fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));
fs.copyFileSync(path.join(root, 'authors-release.html'), path.join(dist, 'authors-release.html'));

// Keep the isolated offline sandbox preview at /authors.html and /antigravity.html.
for (const name of ['authors.html', 'antigravity.html', 'test.html', 'styles.css', 'manifest.json', 'sw.js']) {
  if (fs.existsSync(path.join(root, name))) {
    fs.copyFileSync(path.join(root, name), path.join(dist, name));
  }
}

const authorsCssFiles = [
  'authors-legacy.css',
  'authors.css',
  'authors-expansion.css',
  'authors-secondary.css',
  'authors-plate-effects.css',
  'authors-rewards.css',
  'authors-refinement.css',
  'authors-motorsport.css',
  'authors-driving.css',
  'authors-workshop.css',
  'authors-prestige.css',
  'authors-atelier.css',
  'authors-garage.css',
  'authors-exchange.css',
  'authors-registration.css',
  'authors-progression.css',
  'authors-sound.css',
  'authors-reel-motion.css',
  'authors-case-results.css',
  'authors-collection.css'
];
for (const name of authorsCssFiles) {
  fs.copyFileSync(path.join(root, name), path.join(dist, name));
}

for (const folder of ['js', 'icons', 'assets']) {
  if (fs.existsSync(path.join(root, folder))) {
    fs.cpSync(path.join(root, folder), path.join(dist, folder), { recursive: true });
  }
}

require('./asset-manifest.cjs').generateAssetManifest({ sourceDir: root, profile: 'mobile', writeFiles: true });

console.log('Clean public dist ready: Author’s Edition published at index.html and dist/index.html (rollback at legacy.html, sandbox at authors.html).');

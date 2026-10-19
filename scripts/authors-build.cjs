'use strict';
// Derive a local-only entry from the actual game, keeping every game control and ID.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
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
html = html.replace(/\.\/styles\.css\?v=[a-f0-9]+/, './authors-legacy.css');
html = html.replace('</head>', '<link rel="stylesheet" href="./authors.css"><link rel="stylesheet" href="./authors-expansion.css"></head>');
html = html.replace(/<body([^>]*)>/, '<body$1 class="authors-edition">');
html = html.replace('</body>', '<script src="./js/plate-presentation.js"></script><script src="./js/authors-ui.js"></script><script src="./js/authors-preview-market.js"></script><script src="./js/authors-expansion.js"></script></body>');
fs.writeFileSync(path.join(root, 'authors.html'), html);
console.log('authors.html: isolated local entry generated from index.html');

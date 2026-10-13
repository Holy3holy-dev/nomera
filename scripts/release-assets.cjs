// Use immutable version URLs so an older worker cannot mix a new HTML with old JS.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const root = path.join(__dirname, '..');
const files = ['styles.css', 'js/security.js', 'js/storage.js', 'js/race-records.js', 'js/race-economy.js', 'js/audio.js', 'js/app.js'];
const hash = value => createHash('sha256').update(value).digest('hex').slice(0,12);
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const file of files) {
    const url = './' + file + '?v=' + hash(fs.readFileSync(path.join(root, file)));
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp('\\./' + escaped + '(?:\\?v=[a-z0-9]+)?', 'g'), url);
    worker = worker.replace(new RegExp('\\./' + escaped + '(?:\\?v=[a-z0-9]+)?', 'g'), url);
}
const manifest = fs.readFileSync(path.join(root, 'manifest.json'));
const release = hash(html + manifest + files.concat(['icons/icon-192.png', 'icons/icon-512.png', 'icons/car-placeholder.svg']).map(file => fs.readFileSync(path.join(root,file))).join(''));
worker = worker.replace(/const CACHE_NAME = '[^']+';/, "const CACHE_NAME = 'nomera-cache-" + release + "';");
fs.writeFileSync(path.join(root, 'index.html'), html);
fs.writeFileSync(path.join(root, 'sw.js'), worker);
console.log('App assets versioned for release ' + release);

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const files = fs.readdirSync(path.join(root, 'js')).map(name => 'js/' + name).concat('sw.js');
for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    new vm.Script(source, {filename: file});
    assert(!/const\s+ADMIN_(?:PASS|PASSWORD|PIN)\b/.test(source), 'Client administrator credential declaration must not return');
    if (file !== 'js/app.js') for (const match of source.matchAll(/\bisAdmin\s*=\s*([^;]+);/g)) assert.equal(match[1].trim(), 'false', 'Unexpected privilege code');
    if (file === 'js/app.js') {
        assert.match(source, /await adminRequest\('login'/, 'Admin must call server authentication');
        assert.match(source, /await adminRequest\('session'/, 'Admin must restore verified session');
        const grants = [...source.matchAll(/\bisAdmin\s*=\s*true\s*;/g)];
        assert.equal(grants.length, 2, 'Only server login and server session may enable admin UI');
        assert(!/\b(?:alert|confirm|prompt)\s*\(/.test(source), 'Blocking native dialogs must not be used');
    }
}
for (const file of ['index.html', 'test.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)(?:\?[^"#]*)?"/g)) {
        assert(fs.existsSync(path.join(root, match[1])), 'Missing local asset: ' + match[1]);
    }
}
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const functions = [...app.matchAll(/^\s*function (\w+)\(/gm)].map(match => match[1]);
assert.equal(new Set(functions).size, functions.length, 'Duplicate function declarations');
const {createHash} = require('node:crypto');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="(\.\/(?:js\/[^"]+\.js|styles\.css))\?v=([a-f0-9]+)"/g)) {
    const digest = createHash('sha256').update(fs.readFileSync(path.join(root, match[1]))).digest('hex').slice(0,12);
    assert.equal(match[2], digest, 'Run npm run assets after changing client code');
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
for (const icon of manifest.icons) assert(fs.existsSync(path.join(root, icon.src)), 'Missing icon');
JSON.parse(fs.readFileSync(path.join(root, 'database.rules.json')));
JSON.parse(fs.readFileSync(path.join(root, 'docs/database.v2.staging.rules.json')));
console.log('Syntax, local asset links, role quarantine, function uniqueness and JSON checks passed.');

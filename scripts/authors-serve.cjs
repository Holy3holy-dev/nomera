'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4317);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary','.wasm':'application/wasm','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server = http.createServer((req,res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
    if (pathname === '/index.html') {res.writeHead(302,{Location:'/authors.html'}).end();return;}
    if (pathname === '/favicon.ico') {res.writeHead(204).end();return;}
    if (!['GET','HEAD'].includes(req.method) || pathname.includes('.netlify') || pathname.includes('firebase')) { res.writeHead(403).end('Offline preview'); return; }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/authors.html' : pathname));
    const relative = path.relative(root,file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.startsWith('.git') || !mime[path.extname(file)]) {res.writeHead(403).end();return;}
    fs.stat(file,(error,stat) => {
        if (error || !stat.isFile()) {res.writeHead(404).end();return;}
        res.setHeader('Content-Type',mime[path.extname(file)]);
        res.setHeader('Cache-Control','no-cache');
        // Browser cannot contact production even from the comparison entry.
        res.setHeader('Content-Security-Policy',"connect-src 'self' blob: data:; object-src 'none'; form-action 'none'");
        if(req.method === 'HEAD') {res.end();return;}
        fs.createReadStream(file).pipe(res);
    });
});
server.listen(port,'127.0.0.1',()=>console.log(`NOMERA Author's Edition: http://127.0.0.1:${port}/`));

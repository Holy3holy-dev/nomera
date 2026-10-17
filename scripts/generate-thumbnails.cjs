const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 38888;
const REPO_ROOT = path.resolve(__dirname, '..');
const THUMB_DIR = path.join(REPO_ROOT, 'assets', 'thumbnails');

if (!fs.existsSync(THUMB_DIR)) {
    fs.mkdirSync(THUMB_DIR, { recursive: true });
}

const CARS_TO_RENDER = [
    { id: 'vaz2107', name: 'ВАЗ-2107 «Жигули»' },
    { id: 'vaz2109', name: 'ВАЗ-2109 «Девятка»' },
    { id: 'gaz24', name: 'ГАЗ-24 «Волга»' },
    { id: 'priora', name: 'Lada Priora БПАН' },
    { id: 'solaris', name: 'Hyundai Solaris' },
    { id: 'vesta', name: 'Lada Vesta Sport' },
    { id: 'polo', name: 'Volkswagen Polo GTI' },
    { id: 'mark2', name: 'Toyota Mark II Tourer V' },
    { id: 'subaru', name: 'Subaru Impreza WRX STI' },
    { id: 'm5e60', name: 'BMW M5 E60 V10' },
    { id: 'silvia', name: 'Nissan Silvia S15' },
    { id: 'camry', name: 'Toyota Camry 3.5' },
    { id: 'lc300', name: 'Toyota Land Cruiser 300' },
    { id: 'gtr', name: 'Nissan GT-R R35 Nismo' },
    { id: 'e63', name: 'Mercedes-Benz E63s AMG' },
    { id: 'rs6', name: 'Audi RS6 Avant V8' },
    { id: 'm5f90', name: 'BMW M5 F90 CS' },
    { id: 'm8', name: 'BMW M8 Competition' },
    { id: 'g63', name: 'Mercedes-Benz G63 «Гелик»' },
    { id: 'porsche911', name: 'Porsche 911 Turbo S' },
    { id: 'huracan', name: 'Lamborghini Huracan Performante' },
    { id: 'cullinan', name: 'Rolls-Royce Cullinan' },
    { id: 'sf90', name: 'Ferrari SF90 Stradale' },
    { id: 'chiron', name: 'Bugatti Chiron Super Sport' },
    { id: 'jesko', name: 'Koenigsegg Jesko Attack' }
];

const requestedCars = process.argv.slice(2).filter(arg => !arg.startsWith('-'));
const CARS = (requestedCars.length > 0)
    ? CARS_TO_RENDER.filter(c => requestedCars.includes(c.id))
    : CARS_TO_RENDER;

let savedCount = 0;

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname === '/save-thumb' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { carId, dataUrl } = JSON.parse(body);
                const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
                const filePath = path.join(THUMB_DIR, `${carId}.png`);
                fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                savedCount++;
                console.log(`[${savedCount}/${CARS.length}] Saved thumbnail: ${carId}.png (${Math.round(base64Data.length * 0.75 / 1024)} KB)`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
            } catch (err) {
                console.error('Failed to save thumb:', err);
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    if (url.pathname === '/done') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        console.log(`All ${savedCount} thumbnails generated successfully! Shutting down.`);
        setTimeout(() => {
            server.close();
            process.exit(0);
        }, 1000);
        return;
    }

    if (url.pathname === '/render') {
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>3D Thumbnail Generator</title>
    <script src="/js/vendor/three.min.js"></script>
    <script src="/js/vendor/DRACOLoader.js"></script>
    <script src="/js/vendor/meshopt_decoder.js"></script>
    <script src="/js/vendor/GLTFLoader.js"></script>
    <script src="/js/car-3d.js"></script>
</head>
<body style="background: #111; color: #fff; font-family: sans-serif; padding: 20px;">
    <h2>Generating 3D Thumbnails...</h2>
    <div id="status">Starting...</div>
    <div id="container" style="width: 440px; height: 240px; border: 1px solid #333; margin-top: 10px;"></div>

    <script>
        const cars = ${JSON.stringify(CARS)};
        const statusEl = document.getElementById('status');

        async function run() {
            for (let i = 0; i < cars.length; i++) {
                const car = cars[i];
                statusEl.textContent = 'Rendering ' + (i + 1) + '/' + cars.length + ': ' + car.name;
                await new Promise((resolve) => {
                    Car3DManager.renderSideThumbnail(car.name, {}, async (dataUrl) => {
                        if (dataUrl && dataUrl.startsWith('data:image')) {
                            await fetch('/save-thumb', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ carId: car.id, dataUrl })
                            });
                        } else {
                            console.warn('Failed to render:', car.name);
                        }
                        resolve();
                    });
                });
            }
            statusEl.textContent = 'Completed all renders!';
            await fetch('/done');
        }

        window.addEventListener('load', () => {
            setTimeout(run, 500);
        });
    </script>
</body>
</html>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
    }

    // Serve static files from repo
    let filePath = path.join(REPO_ROOT, decodeURIComponent(url.pathname.slice(1)));
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.glb': 'model/gltf-binary',
        '.wasm': 'application/wasm',
        '.png': 'image/png',
        '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
    console.log(`Thumbnail generator server running at http://localhost:${PORT}/render`);

    const chromePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

    console.log('Launching browser:', chromePath);
    const browser = spawn(chromePath, [
        '--headless=new',
        '--disable-gpu-shader-disk-cache',
        '--no-sandbox',
        `http://localhost:${PORT}/render`
    ]);

    browser.on('error', (err) => {
        console.error('Failed to spawn browser:', err);
    });

    // Safety timeout: 120 seconds max
    setTimeout(() => {
        console.log('Timeout reached. Closing server.');
        try { browser.kill(); } catch (_) {}
        server.close();
        process.exit(savedCount > 0 ? 0 : 1);
    }, 120000);
});

/**
 * H3H Nomera - Advanced 3D Car Showroom & Detailed Vehicles Engine
 * Built on Three.js (r128)
 * 
 * Features:
 * - High-detail procedural 3D models specifically tailored for all 25 game vehicles:
 *   ВАЗ-2107 «Жигули», ВАЗ-2109 «Девятка», ГАЗ-24 «Волга», Lada Priora БПАН,
 *   Toyota Mark II Tourer V, BMW M5 E60 V10, Nissan GT-R R35, Mercedes-Benz G63 «Гелик»,
 *   Porsche 911 Turbo S, Lamborghini Huracan, Bugatti Chiron, Koenigsegg Jesko,
 *   Rolls-Royce Cullinan, Subaru Impreza WRX STI, Audi RS6 Avant, Toyota LC300, etc.
 * - Authentic body styling: signature grilles, headlights with projectors & DRLs,
 *   taillights, side mirrors, door handles, windshield wipers, interior cockpit (seats, dash, steering wheel),
 *   Russian license plates (A 777 AA | 77 RUS), brake discs with calipers, exhaust diffusers.
 * - Real-time PBR styling: paint finish, glass tint, custom rims (штампы, полка, ковка),
 *   suspension ride height (БПАН / сток / лифт), neon underglow, spoilers, animated SGU flasher.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.Car3DManager = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    let RaceEffectsManagerClass = (typeof RaceEffectsManager !== 'undefined') ? RaceEffectsManager : null;
    if (!RaceEffectsManagerClass && typeof require === 'function') {
        try { RaceEffectsManagerClass = require('./race-effects.js'); } catch (_) {}
    }

    function isWebGLAvailable() {
        if (typeof process !== 'undefined' && process.versions && process.versions.node) return true;
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (_) {
            return false;
        }
    }

    function parseColor(val, fallback = 0xd0d5dd) {
        if (!val || val === 'none') return fallback;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            if (val.startsWith('#')) return parseInt(val.slice(1), 16);
            if (val.startsWith('0x')) return parseInt(val, 16);
        }
        return fallback;
    }

    // Identify exact car model from full name string
    function identifyCarModel(name) {
        const n = String(name || '').toLowerCase();

        // 0. Sports, GT & Supercar 3D Models (before generic 'gtr' or 'bmw')
        if (n.includes('m3 gtr') || n.includes('m3 e46') || n.includes('e46 gtr')) return 'm3gtr';
        if (n === 'chevrolet corvette c6' || n.includes('corvette c6 ') || (n.includes('corvette c6') && !n.includes('c6.r') && !n.includes('c6r'))) return 'corvette_webster';
        if (n.includes('corvette') || n.includes('корвет') || n.includes('c6.r') || n.includes('c6r')) return 'corvette_cross';
        if (n.includes('mustang gt coupe')) return 'mustang_jewels';
        if (n.includes('mustang') || n.includes('мустанг')) return 'mustang_razor';
        if (n.includes('supra') || n.includes('супра')) return 'supra';
        if (n.includes('rx-8') || n.includes('rx8') || n.includes('rx-7') || n.includes('rx7') || n.includes('mazda') || n.includes('мазда')) return 'rx7';
        if (n.includes('aston') || n.includes('db9') || n.includes('астон')) return 'db9';
        if (n.includes('mclaren') || n.includes('макларен') || n.includes('slr')) return 'mclaren';
        if (n.includes('r8') || n.includes('le mans')) return 'audir8';
        if (n.includes('viper') || n.includes('вайпер')) return 'viper_jv';
        if (n.includes('gallardo') || n.includes('гальярдо')) return 'gallardo_ming';
        if (n.includes('clk')) return 'clk_kaze';
        if (n.includes('evo') || n.includes('lancer') || n.includes('лансер')) return 'evo8_earl';
        if (n.includes('cayman') || n.includes('кайман')) return 'cayman_baron';
        if (n.includes('eclipse') || n.includes('эклипс') || n.includes('veloster')) return 'eclipse_lou';
        if (n.includes('is300') || n.includes('lexus') || n.includes('лексус')) return 'is300_taz';
        if (n.includes('golf gti')) return 'golf_sonny';

        // 0b. Bonus GLB models in assets/models/
        if (n.includes('m3 g80') || n.includes('m3 sedan')) return 'm3_g80';
        if (n.includes('x5m') || n.includes('x5 m')) return 'x5m';
        if (n.includes('rs7')) return 'rs7';
        if (n.includes('maserati') || n.includes('мазерати')) return 'maserati';
        if (n.includes('panamera') || n.includes('панамера')) return 'panamera';
        if (n.includes('elantra') || n.includes('элантра')) return 'elantra_n';

        // 1. Specific supercars & hypercars first to avoid substring collisions (e.g. sf90 vs f90)
        if (n.includes('sf90') || n.includes('ferrari') || n.includes('феррари')) return 'sf90';
        if (n.includes('chiron') || n.includes('широн') || n.includes('bugatti') || n.includes('бугатти')) return 'chiron';
        if (n.includes('jesko') || n.includes('еско') || n.includes('koenigsegg') || n.includes('кениг')) return 'jesko';
        if (n.includes('huracan') || n.includes('хуракан') || n.includes('lamborghini') || n.includes('ламба')) return 'huracan';
        if (n.includes('911') || n.includes('porsche') || n.includes('порше')) return 'porsche911';
        if (n.includes('cullinan') || n.includes('куллинан') || n.includes('роллс') || n.includes('rolls')) return 'cullinan';

        // 2. SUVs & Specific Mercedes (g63 before e63, and no generic amg)
        if (n.includes('g63') || n.includes('гелик') || n.includes('gelik')) return 'g63';
        if (n.includes('e63')) return 'e63';
        if (n.includes('land cruiser') || n.includes('крузак') || n.includes('lc') || n.includes('300')) return 'lc300';

        // 3. BMWs (m5f90, m5e60, m8)
        if (n.includes('f90')) return 'm5f90';
        if (n.includes('e60')) return 'm5e60';
        if (n.includes('m8')) return 'm8';

        // 4. Sport / JDM
        if (n.includes('rs6') || n.includes('audi') || n.includes('ауди')) return 'rs6';
        if (n.includes('gt-r') || n.includes('gtr') || n.includes('r35')) return 'gtr';
        if (n.includes('mark') || n.includes('марк')) return 'mark2';
        if (n.includes('silvia') || n.includes('s15')) return 'silvia';
        if (n.includes('impreza') || n.includes('wrx') || n.includes('subaru')) return 'subaru';

        // 5. Sedans & Russian classics
        if (n.includes('camry') || n.includes('камри')) return 'camry';
        if (n.includes('solaris') || n.includes('солярис')) return 'solaris';
        if (n.includes('polo') || n.includes('поло')) return 'polo';
        if (n.includes('2107') || n.includes('семёрк') || n.includes('жигули')) return 'vaz2107';
        if (n.includes('2109') || n.includes('девятк')) return 'vaz2109';
        if (n.includes('24') || n.includes('волга')) return 'gaz24';
        if (n.includes('priora') || n.includes('приора')) return 'priora';
        if (n.includes('vesta') || n.includes('веста')) return 'vesta';

        return 'modern_sedan';
    }

    // Factory authentic colors for Russian and imported car icons
    function getDefaultCarColor(name = '', id = '') {
        const carId = id || identifyCarModel(name);
        const map = {
            m3gtr: 0xcbd5e1,            // #1 Razor — NFS Most Wanted Silver & Blue M3 GTR
            corvette_cross: 0x1e293b,   // Sergeant Cross Federal Interceptor
            mustang_razor: 0x0f172a,    // Razor Prologue Mustang GT
            mclaren: 0x18181b,          // #2 Bull — SLR McLaren Obsidian Black
            db9: 0x0284c7,              // #3 Ronnie — Aston Martin DB9
            viper_jv: 0x16a34a,         // #4 JV — Dodge Viper SRT10 Venom Green
            corvette_webster: 0xb45309, // #5 Webster — Corvette C6 Copper/Gold
            gallardo_ming: 0x334155,    // #6 Ming — Lamborghini Gallardo Gunmetal
            clk_kaze: 0x0d9488,         // #7 Kaze — Mercedes CLK 500 Jade/Teal
            mustang_jewels: 0xdbeafe,   // #8 Jewels — Ford Mustang GT Pearl
            evo8_earl: 0xe2e8f0,        // #9 Earl — Mitsubishi Lancer Evo VIII White/Red
            cayman_baron: 0xf8fafc,     // #10 Baron — Porsche Cayman S Flame White
            eclipse_lou: 0x9333ea,      // #11 Big Lou — Mitsubishi Eclipse GT Tiger Purple
            rx7: 0xef4444,              // #12 Izzy / Mia — Mazda RX-8 / RX-7 Crimson
            supra: 0xf97316,            // #13 Vic — Toyota Supra MK4 Orange/Red
            is300_taz: 0xca8a04,        // #14 Taz — Lexus IS300 Gold/Bronze
            golf_sonny: 0x1d4ed8,       // #15 Sonny — VW Golf GTI White/Blue Kanji
            audir8: 0xdc2626,           // Darius — Audi Le Mans Quattro R8 Canyon Red
            m3_g80: 0x16a34a,           // BMW M3 G80 Isle of Man Green
            x5m: 0x1e3a8a,              // BMW X5 M Marina Bay Blue
            rs7: 0x334155,              // Audi RS7 Daytona Grey
            maserati: 0x1e1b4b,         // Maserati Blu Infinito
            panamera: 0x475569,         // Porsche Panamera Volcano Grey
            elantra_n: 0x38bdf8,        // Hyundai Elantra N Performance Blue
            vaz2107: 0x991b1b,    // Ruby cherry red (iconic Zhiguli)
            vaz2109: 0x475569,    // Wet asphalt metallic
            gaz24: 0x0f172a,      // Deep black KGB Volga
            priora: 0x18181b,     // Obsidian black
            solaris: 0xf8fafc,    // Crystal white
            vesta: 0xdc2626,      // Sport red
            polo: 0x64748b,       // Silver metallic
            mark2: 0xf8fafc,      // Pearl white
            subaru: 0x1d4ed8,     // WRX rally blue
            m5e60: 0x334155,      // Anthracite grey
            silvia: 0x0ea5e9,     // Brilliant drift cyan
            camry: 0x0f172a,      // Executive black
            lc300: 0xf8fafc,      // Pearl white
            gtr: 0xf8fafc,        // Nismo pearl white
            e63: 0x1e293b,        // Selenite grey
            rs6: 0x475569,        // Nardo grey
            m5f90: 0x0284c7,      // Marina Bay blue
            m8: 0x1e1b4b,         // Sonic dark navy
            g63: 0x09090b,        // Magno night black
            porsche911: 0xeab308, // Racing yellow
            huracan: 0x22c55e,    // Verde mantis green
            cullinan: 0x111827,   // Midnight sapphire
            sf90: 0xef4444,       // Rosso Corsa red
            chiron: 0x1e3a8a,     // Bugatti racing blue
            jesko: 0xe2e8f0       // Crystal white
        };
        return map[carId] || 0x2563eb;
    }

    // Material library factory
    function createCarMaterials(THREE, styling = {}, carName = '', carId = '') {
        const defColor = getDefaultCarColor(carName, carId);
        const bodyHex = parseColor(styling.color || defColor, defColor);

        // Body Paint (high-gloss automotive clearcoat simulation)
        const paint = new (THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial)({
            color: bodyHex,
            roughness: 0.14,
            metalness: 0.70,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            reflectivity: 0.95,
            name: 'CarPaint'
        });
        if (styling.vinyl && styling.vinyl !== 'none') {
            const vinylTex = createVinylCanvasTexture(THREE, styling.vinyl, bodyHex);
            if (vinylTex) paint.map = vinylTex;
        }

        // Window Glass & Tint
        let glassOpacity = 0.38;
        let glassColor = 0xa0c0d8;
        let glassRoughness = 0.04;
        let glassMetalness = 0.2;

        const tint = styling.tint;
        if (tint === 'chameleon') {
            glassOpacity = 0.72;
            glassColor = 0x8a2be2; // Chameleon purple/teal shift
            glassRoughness = 0.08;
            glassMetalness = 0.85;
        } else if (tint === 'dubai') {
            glassOpacity = 0.88;
            glassColor = 0xd4af37; // Dubai gold mirror
            glassRoughness = 0.05;
            glassMetalness = 0.95;
        } else {
            const numTint = Number(tint) || 0;
            if (numTint >= 90) {
                glassOpacity = 0.94;
                glassColor = 0x080b10; // Dark limousine black
                glassMetalness = 0.4;
            } else if (numTint >= 40) {
                glassOpacity = 0.68;
                glassColor = 0x1a2330; // Medium smoke
                glassMetalness = 0.3;
            }
        }

        const glass = new THREE.MeshStandardMaterial({
            color: glassColor,
            roughness: glassRoughness,
            metalness: glassMetalness,
            transparent: true,
            opacity: glassOpacity,
            depthWrite: false,
            name: 'CarGlass'
        });

        // Chrome & Polished Metals
        const chrome = new THREE.MeshStandardMaterial({
            color: 0xf5f5f7,
            roughness: 0.08,
            metalness: 0.96,
            name: 'Chrome'
        });

        // Matte & Satin Black Trim (bumpers, moldings, grilles, rubber)
        const trim = new THREE.MeshStandardMaterial({
            color: 0x14161a,
            roughness: 0.65,
            metalness: 0.2,
            name: 'BlackTrim'
        });

        const darkPlastic = new THREE.MeshStandardMaterial({
            color: 0x1f242d,
            roughness: 0.5,
            metalness: 0.1,
            name: 'DarkPlastic'
        });

        // Interior Cockpit (dash, seats, wheel)
        const interior = new THREE.MeshStandardMaterial({
            color: 0x181a20,
            roughness: 0.8,
            metalness: 0.1,
            name: 'Interior'
        });

        const interiorAccent = new THREE.MeshStandardMaterial({
            color: 0x991b1b,
            roughness: 0.6,
            metalness: 0.2,
            name: 'InteriorAccent'
        });

        // Lights
        const headlightGlass = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.1,
            metalness: 0.1,
            transparent: true,
            opacity: 0.85,
            name: 'HeadlightGlass'
        });

        const headlightLED = new THREE.MeshStandardMaterial({
            color: 0xf0fdfa,
            emissive: 0xccfbf1,
            emissiveIntensity: 0.95,
            roughness: 0.1,
            name: 'HeadlightLED'
        });

        const amberIndicator = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            emissive: 0xd97706,
            emissiveIntensity: 0.75,
            roughness: 0.2,
            name: 'AmberIndicator'
        });

        const taillightRed = new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            emissive: 0xb91c1c,
            emissiveIntensity: 0.85,
            roughness: 0.2,
            name: 'TaillightRed'
        });

        const reverseWhite = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xe2e8f0,
            emissiveIntensity: 0.8,
            roughness: 0.2,
            name: 'ReverseWhite'
        });

        // Carbon fiber simulation
        const carbon = new THREE.MeshStandardMaterial({
            color: 0x18181b,
            roughness: 0.35,
            metalness: 0.5,
            name: 'CarbonFiber'
        });

        // Detailed tire rubber, brakes, exhaust, grilles, and rims
        const tireRubber = new THREE.MeshStandardMaterial({
            color: 0x141518,
            roughness: 0.90,
            metalness: 0.05,
            name: 'TireRubber'
        });

        const brakeCaliper = new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            roughness: 0.28,
            metalness: 0.65,
            name: 'BrakeCaliper_Red'
        });

        const brakeDisc = new THREE.MeshStandardMaterial({
            color: 0x9ca3af,
            roughness: 0.30,
            metalness: 0.95,
            name: 'BrakeDisc_Steel'
        });

        const exhaustChrome = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            roughness: 0.12,
            metalness: 0.96,
            name: 'ExhaustChrome'
        });

        const grilleMesh = new THREE.MeshStandardMaterial({
            color: 0x111316,
            roughness: 0.75,
            metalness: 0.35,
            name: 'GrilleMesh'
        });

        const alloyRim = new THREE.MeshStandardMaterial({
            color: 0xd0d5dc,
            roughness: 0.22,
            metalness: 0.86,
            name: 'AlloyRim'
        });

        return {
            paint,
            glass,
            chrome,
            trim,
            darkPlastic,
            interior,
            interiorAccent,
            headlightGlass,
            headlightLED,
            amberIndicator,
            taillightRed,
            reverseWhite,
            carbon,
            tireRubber,
            brakeCaliper,
            brakeDisc,
            exhaustChrome,
            grilleMesh,
            alloyRim
        };
    }

    // Detailed 3D Wheel (Tire with tread, rim barrel, styled spokes, center cap, brake rotor & red caliper)
    function createDetailedWheel(THREE, mats, style = 'stock', scale = 1.0, openTire = false) {
        const group = new THREE.Group();
        group.name = 'WheelAssembly';

        // Dedicated rotating spinner group: holds only the parts that spin with the rolling wheel
        const spinner = new THREE.Group();
        spinner.name = 'WheelSpinner';
        spinner.userData.isWheelSpinner = true;
        group.add(spinner);

        const R = 0.33 * scale;
        const W = 0.23 * scale;

        // 1. Rubber Tire (Main outer donut)
        const tireGeo = new THREE.CylinderGeometry(R, R, W, 28, 1, openTire);
        tireGeo.rotateZ(Math.PI / 2);
        const tireMat = new THREE.MeshStandardMaterial({
            color: 0x131518,
            roughness: 0.9,
            metalness: 0.05
        });
        const tire = new THREE.Mesh(tireGeo, tireMat);
        spinner.add(tire);
        if(openTire)for(const side of [-1,1]){
            const wallGeo=new THREE.RingGeometry(R*.735,R,28);wallGeo.rotateY(side*Math.PI/2);
            const wall=new THREE.Mesh(wallGeo,tireMat);wall.position.x=side*W*.5;spinner.add(wall);
        }

        // Tire sidewall bevels (both sides for full 3D volume)
        [-1, 1].forEach(side => {
            const bevelGeo = new THREE.TorusGeometry(R * 0.86, R * 0.14, 8, 28);
            bevelGeo.rotateY(Math.PI / 2);
            bevelGeo.scale(0.8, 1, 1);
            const bevel = new THREE.Mesh(bevelGeo, tireMat);
            bevel.position.x = side * (W * 0.36);
            spinner.add(bevel);
        });

        // 2. Rim Barrel & Solid Dark Interior Wall
        const rimR = R * 0.74;
        const barrelGeo = new THREE.CylinderGeometry(rimR, rimR, W * 0.98, 24, 1, true);
        barrelGeo.rotateZ(Math.PI / 2);
        let rimMat = mats.chrome;

        if (style === 'stamps') {
            rimMat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.65, metalness: 0.35 });
        } else if (style === 'deepdish') {
            rimMat = mats.chrome; // Mirror dish
        } else if (style === 'forged') {
            rimMat = new THREE.MeshStandardMaterial({ color: 0xc89d4c, roughness: 0.28, metalness: 0.85 }); // Racing bronze
        } else {
            rimMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.22, metalness: 0.82 }); // Silver alloy
        }

        const barrel = new THREE.Mesh(barrelGeo, rimMat);
        spinner.add(barrel);

        // Solid dark metallic inner rim backing disc (prevents hollow see-through look)
        const faceX = W * 0.44;
        const backingGeo = new THREE.CylinderGeometry(rimR * 0.96, rimR * 0.96, 0.02 * scale, 24);
        backingGeo.rotateZ(Math.PI / 2);
        backingGeo.translate(faceX - 0.045 * scale, 0, 0);
        const backingMat = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.8, metalness: 0.5 });
        spinner.add(new THREE.Mesh(backingGeo, backingMat));
        if (style === 'volga_caps') {
            // Authentic GAZ-24 full-cover polished chrome domed hubcaps with concentric rings
            const capDiscGeo = new THREE.CylinderGeometry(rimR * 0.95, rimR * 0.95, 0.025 * scale, 24);
            capDiscGeo.rotateZ(Math.PI / 2);
            capDiscGeo.translate(faceX - 0.01 * scale, 0, 0);
            spinner.add(new THREE.Mesh(capDiscGeo, mats.chrome));

            const domeGeo = new THREE.SphereGeometry(rimR * 0.52, 16, 16);
            domeGeo.scale(0.32, 1, 1);
            const dome = new THREE.Mesh(domeGeo, mats.chrome);
            dome.position.set(faceX + 0.02 * scale, 0, 0);
            spinner.add(dome);

            const ringGeo = new THREE.TorusGeometry(rimR * 0.72, 0.016 * scale, 8, 24);
            ringGeo.rotateY(Math.PI / 2);
            const ring = new THREE.Mesh(ringGeo, mats.chrome);
            ring.position.set(faceX + 0.006 * scale, 0, 0);
            spinner.add(ring);
        } else if (style === 'torus') {
            // Legendary BPAN 16" Torus (Торусы) 5-spoke alloy wheels
            const torusMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.22, metalness: 0.85 });
            for (let i = 0; i < 5; i++) {
                const ang = (i / 5) * Math.PI * 2;
                const spokeGeo = new THREE.BoxGeometry(0.038 * scale, rimR * 0.88, 0.032 * scale);
                spokeGeo.rotateX(ang);
                const spoke = new THREE.Mesh(spokeGeo, torusMat);
                spoke.position.set(faceX - 0.008 * scale, 0, 0);
                spinner.add(spoke);
            }
            const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.065 * scale, 0.065 * scale, 0.03 * scale, 16), mats.chrome);
            centerCap.rotateZ(Math.PI / 2);
            centerCap.position.set(faceX + 0.01 * scale, 0, 0);
            spinner.add(centerCap);
        } else if (style === 'stamps') {
            // Russian stamped steel wheel with ventilation circle cutouts
            const discGeo = new THREE.CylinderGeometry(rimR * 0.96, rimR * 0.96, 0.02 * scale, 24);
            discGeo.rotateZ(Math.PI / 2);
            discGeo.translate(faceX - 0.02 * scale, 0, 0);
            spinner.add(new THREE.Mesh(discGeo, rimMat));

            // Small circle vent holes simulation (black dots)
            for (let i = 0; i < 8; i++) {
                const ang = (i / 8) * Math.PI * 2;
                const holeGeo = new THREE.CylinderGeometry(0.028 * scale, 0.028 * scale, 0.025 * scale, 10);
                holeGeo.rotateZ(Math.PI / 2);
                const hole = new THREE.Mesh(holeGeo, mats.trim);
                hole.position.set(faceX - 0.015 * scale, Math.sin(ang) * (rimR * 0.6), Math.cos(ang) * (rimR * 0.6));
                spinner.add(hole);
            }
            // Chrome center cap for classic VAZ
            const capGeo = new THREE.CylinderGeometry(0.07 * scale, 0.07 * scale, 0.04 * scale, 16);
            capGeo.rotateZ(Math.PI / 2);
            capGeo.translate(faceX, 0, 0);
            spinner.add(new THREE.Mesh(capGeo, mats.chrome));
        } else if (style === 'deepdish') {
            // Deep dish stepped barrel + recessed star
            const deepX = faceX - 0.06 * scale;
            const starGeo = new THREE.CylinderGeometry(rimR * 0.82, rimR * 0.82, 0.02 * scale, 5);
            starGeo.rotateZ(Math.PI / 2);
            starGeo.translate(deepX, 0, 0);
            spinner.add(new THREE.Mesh(starGeo, mats.chrome));

            // Polished outer stepped lip
            const lipGeo = new THREE.TorusGeometry(rimR * 0.95, 0.02 * scale, 8, 24);
            lipGeo.rotateY(Math.PI / 2);
            lipGeo.translate(faceX, 0, 0);
            spinner.add(new THREE.Mesh(lipGeo, mats.chrome));
        } else if (style === 'forged') {
            // 10-spoke lightweight racing forged wheel
            for (let i = 0; i < 10; i++) {
                const ang = (i / 10) * Math.PI * 2;
                const spokeGeo = new THREE.BoxGeometry(0.018 * scale, rimR * 0.88, 0.024 * scale);
                spokeGeo.rotateX(ang);
                const spoke = new THREE.Mesh(spokeGeo, rimMat);
                spoke.position.set(faceX - 0.01 * scale, 0, 0);
                spinner.add(spoke);
            }
        } else {
            // Modern 5-split twin-spoke alloy
            for (let i = 0; i < 5; i++) {
                const ang = (i / 5) * Math.PI * 2;
                const spokeGeo = new THREE.BoxGeometry(0.025 * scale, rimR * 0.85, 0.04 * scale);
                spokeGeo.rotateX(ang);
                const spoke = new THREE.Mesh(spokeGeo, rimMat);
                spoke.position.set(faceX - 0.01 * scale, 0, 0);
                spinner.add(spoke);
            }
        }

        // Center hub cap with bolts
        const hubGeo = new THREE.CylinderGeometry(0.065 * scale, 0.065 * scale, 0.03 * scale, 14);
        hubGeo.rotateZ(Math.PI / 2);
        hubGeo.translate(faceX + 0.005 * scale, 0, 0);
        spinner.add(new THREE.Mesh(hubGeo, mats.darkPlastic));

        // 4. Brake Disc & Red Brembo-style Caliper (inside wheel)
        const discR = rimR * 0.78;
        const discGeo = new THREE.CylinderGeometry(discR, discR, 0.016 * scale, 20);
        discGeo.rotateZ(Math.PI / 2);
        discGeo.translate(0, 0, 0);
        const discMat = new THREE.MeshStandardMaterial({
            color: 0x9ca3af,
            roughness: 0.3,
            metalness: 0.95,
            emissive: new THREE.Color(0xff3300),
            emissiveIntensity: 0
        });
        const discMesh = new THREE.Mesh(discGeo, discMat);
        discMesh.name = 'BrakeDiscRotor';
        discMesh.userData.isBrakeRotor = true;
        spinner.add(discMesh);

        const caliperGeo = new THREE.BoxGeometry(0.04 * scale, 0.12 * scale, 0.08 * scale);
        const caliperMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.6 });
        const caliper = new THREE.Mesh(caliperGeo, caliperMat);
        caliper.position.set(-0.01 * scale, discR * 0.72, 0);
        group.add(caliper);

        return group;
    }

    // Cockpit Interior (Dashboard, 3D Steering Wheel, Driver & Passenger Seats with Headrests)
    function createCockpitInterior(THREE, mats, cabinW, cabinL, cabinH, baseChassisY) {
        const group = new THREE.Group();
        group.name = 'InteriorCockpit';

        // Floor / Tub
        const floorGeo = new THREE.BoxGeometry(cabinW * 0.88, 0.05, cabinL * 0.92);
        const floor = new THREE.Mesh(floorGeo, mats.interior);
        floor.position.set(0, baseChassisY + 0.08, 0);
        group.add(floor);

        // Dashboard
        const dashGeo = new THREE.BoxGeometry(cabinW * 0.86, cabinH * 0.35, 0.32);
        const dash = new THREE.Mesh(dashGeo, mats.interior);
        dash.position.set(0, baseChassisY + cabinH * 0.42, cabinL * 0.35);
        group.add(dash);

        // Center console
        const consoleGeo = new THREE.BoxGeometry(0.18, cabinH * 0.32, cabinL * 0.6);
        const centerConsole = new THREE.Mesh(consoleGeo, mats.interior);
        centerConsole.position.set(0, baseChassisY + cabinH * 0.22, 0);
        group.add(centerConsole);

        // 3D Steering Wheel (Torus rim + hub)
        const wheelRimGeo = new THREE.TorusGeometry(0.12, 0.016, 8, 20);
        wheelRimGeo.rotateY(Math.PI / 2);
        wheelRimGeo.rotateZ(Math.PI / 8);
        const wheelRim = new THREE.Mesh(wheelRimGeo, mats.darkPlastic);
        wheelRim.position.set(-cabinW * 0.24, baseChassisY + cabinH * 0.52, cabinL * 0.22);
        group.add(wheelRim);

        // Front Seats (Left & Right)
        const seatW = cabinW * 0.34;
        const seatH = cabinH * 0.68;
        const seatD = 0.36;

        [-1, 1].forEach(side => {
            const seatX = side * cabinW * 0.24;

            // Base cushion
            const baseGeo = new THREE.BoxGeometry(seatW, 0.12, seatD);
            const base = new THREE.Mesh(baseGeo, mats.interior);
            base.position.set(seatX, baseChassisY + 0.14, -0.05);
            group.add(base);

            // Backrest
            const backGeo = new THREE.BoxGeometry(seatW, seatH, 0.10);
            backGeo.rotateX(-Math.PI / 16);
            const back = new THREE.Mesh(backGeo, mats.interior);
            back.position.set(seatX, baseChassisY + seatH * 0.55, -0.22);
            group.add(back);

            // Headrest
            const headGeo = new THREE.BoxGeometry(seatW * 0.55, 0.14, 0.08);
            const head = new THREE.Mesh(headGeo, mats.interior);
            head.position.set(seatX, baseChassisY + seatH + 0.08, -0.25);
            group.add(head);
        });

        // Rear Bench Seat
        const rearSeatGeo = new THREE.BoxGeometry(cabinW * 0.82, 0.14, 0.34);
        const rearSeat = new THREE.Mesh(rearSeatGeo, mats.interior);
        rearSeat.position.set(0, baseChassisY + 0.15, -cabinL * 0.32);
        group.add(rearSeat);

        const rearBackGeo = new THREE.BoxGeometry(cabinW * 0.82, cabinH * 0.65, 0.12);
        const rearBack = new THREE.Mesh(rearBackGeo, mats.interior);
        rearBack.position.set(0, baseChassisY + cabinH * 0.5, -cabinL * 0.44);
        group.add(rearBack);

        return group;
    }

    // Multi-country License Plate parser & formatter (RUS, KZ, USA, UAE, JPN)
    function formatPlateComponents(rawText) {
        if (!rawText || rawText === 'none' || rawText === 'null') {
            return { main: 'А 777 АА', l1: 'А', l2l3: 'АА', letters: 'ААА', digits: '777', region: '77', country: 'RUS', isNone: true };
        }
        let str = String(rawText).trim();
        const defaultRegionForCountry = (c) => {
            if (c === 'KZ') return '01';
            if (c === 'USA') return 'CA';
            if (c === 'UAE') return 'DXB';
            if (c === 'JPN') return 'TKY';
            return '77';
        };
        const defaultLettersForCountry = (c) => {
            if (c === 'KZ' || c === 'USA') return 'VIP';
            if (c === 'JPN') return 'JDM';
            if (c === 'UAE') return 'D';
            return 'ААА';
        };
        const buildNormalized = (rawMain, region, country) => {
            const c = (country || 'RUS').toUpperCase();
            let reg = (region || defaultRegionForCountry(c)).toUpperCase();
            const rawLetters = ((rawMain || '').match(/[A-ZА-ЯЁ]/gi) || []).join('').toUpperCase();
            const rawDigits = ((rawMain || '').match(/\d/g) || []).join('');

            if (c === 'UAE') {
                const trimmedMain = String(rawMain || '').trim();
                const prefEmirateMatch = trimmedMain.match(/^(DXB|AUH|SHJ|AJM|RAK|FUJ|UAQ)\s+([A-Z0-9]{1,2})\s+(\d{1,5})$/i);
                const authUae = trimmedMain.match(/^([A-Z]{1,2}|0?[1-9]|1\d|20)\s+(\d{1,5})$/i);
                const isRegAuhNumeric = /^(?:0?[1-9]|1\d|20)$/.test(reg);
                let uaeCode = 'D';
                let uaeDigits = '1';

                if (prefEmirateMatch) {
                    reg = prefEmirateMatch[1].toUpperCase();
                    uaeCode = prefEmirateMatch[2].toUpperCase();
                    uaeDigits = prefEmirateMatch[3].replace(/^0+/, '') || '0';
                } else if (authUae) {
                    uaeCode = authUae[1].toUpperCase();
                    uaeDigits = authUae[2].replace(/^0+/, '') || '0';
                    if (/^(?:0?[1-9]|1\d|20)$/.test(uaeCode) && (!region || reg === 'DXB')) {
                        reg = 'AUH';
                    }
                } else {
                    if (rawLetters.length >= 3) {
                        uaeCode = (rawLetters[0] === rawLetters[1] && rawLetters[1] === rawLetters[2])
                            ? rawLetters.slice(0, 2)
                            : rawLetters[0];
                    } else if (rawLetters.length >= 1) {
                        uaeCode = rawLetters.slice(0, 2);
                    } else if (isRegAuhNumeric) {
                        uaeCode = reg;
                    } else {
                        uaeCode = reg === 'AUH' ? 'B' : 'D';
                    }
                    uaeDigits = (rawDigits ? rawDigits.slice(0, 5).replace(/^0+/, '') : '1') || '1';
                }

                if (isRegAuhNumeric) {
                    if (!/^(?:0?[1-9]|1\d|20)$/.test(uaeCode) && (!rawLetters || uaeCode === 'D' || uaeCode === 'B')) {
                        uaeCode = reg;
                    }
                    reg = 'AUH';
                }

                return {
                    main: `${uaeCode} ${uaeDigits}`,
                    letters: uaeCode,
                    digits: uaeDigits,
                    uaeCode,
                    uaeDigits,
                    region: reg,
                    country: 'UAE',
                    isNone: false
                };
            }

            const digits = (rawDigits ? rawDigits.slice(0, 4) : '777').padStart(3, '0');
            const fallbackLetters = defaultLettersForCountry(c);
            let letters = rawLetters ? rawLetters.slice(0, 3) : fallbackLetters;

            if (c === 'KZ') {
                letters = letters.padEnd(3, fallbackLetters[0] || 'V');
                return { main: `${digits} ${letters}`, letters, digits, region: reg, country: 'KZ', isNone: false };
            }
            if (c === 'USA') {
                letters = letters.padEnd(3, fallbackLetters[0] || 'V');
                return { main: `${letters} • ${digits}`, letters, digits, region: reg, country: 'USA', isNone: false };
            }
            if (c === 'JPN') {
                letters = letters.padEnd(3, fallbackLetters[0] || 'J');
                return { main: `${letters} ${digits}`, letters, digits, region: reg, country: 'JPN', isNone: false };
            }
            // RUS default: L NNN LL
            letters = letters.padEnd(3, 'А');
            const l1 = letters[0] || 'А';
            const l2l3 = letters.slice(1, 3) || 'АА';
            return { main: `${l1} ${digits} ${l2l3}`, l1, l2l3, letters, digits, region: reg, country: 'RUS', isNone: false };
        };

        if (str.includes('|')) {
            const parts = str.split('|');
            const rawMain = parts[0].trim();
            const regStr = parts.slice(1).join(' ').trim();
            const countryMatch = regStr.match(/\b(RUS|KZ|USA|UAE|JPN)\b/i);
            const country = countryMatch ? countryMatch[1].toUpperCase() : 'RUS';
            const regClean = regStr.replace(/\b(RUS|KZ|USA|UAE|JPN)\b/ig, '').trim();
            const regMatch = regClean.match(/[A-ZА-Я0-9]{1,5}/i);
            const region = regMatch ? regMatch[0].toUpperCase() : defaultRegionForCountry(country);
            return buildNormalized(rawMain, region, country);
        }

        let country = 'RUS';
        const trailingCountry = str.match(/\s+\b(RUS|KZ|USA|UAE|JPN)\b$/i);
        if (trailingCountry) {
            country = trailingCountry[1].toUpperCase();
            str = str.slice(0, trailingCountry.index).trim();
        }

        // Match UAE authentic RTA format without pipe: "D 1 DXB", "AA 777 AUH", "DXB A 7777"
        const mUae = str.match(/^([A-Z0-9]{1,2}\s+\d{1,5})\s+(DXB|AUH|SHJ|AJM|RAK|FUJ|UAQ)$/i);
        if (mUae) {
            return buildNormalized(mUae[1], mUae[2], 'UAE');
        }
        const mUaePref = str.match(/^(DXB|AUH|SHJ|AJM|RAK|FUJ|UAQ)\s+([A-Z0-9]{1,2}\s+\d{1,5})$/i);
        if (mUaePref) {
            return buildNormalized(mUaePref[2], mUaePref[1], 'UAE');
        }

        // Match L NNN LL + region
        const m = str.match(/^([А-ЯA-Z]{1,2})\s*(\d{1,4})\s*([А-ЯA-Z]{1,2})\s+([A-ZА-Я0-9]{2,4})$/i) ||
                  str.match(/^([А-ЯA-Z]{1,2})\s*(\d{1,4})\s*([А-ЯA-Z]{1,2})\s*(\d{2,3})$/i);
        if (m) {
            return buildNormalized(`${m[1]} ${m[2]} ${m[3]}`, m[4], country);
        }
        // Match NNN LLL + region (KZ authentic) or LLL NNN + region (USA/UAE/JPN authentic)
        const mAuth = str.match(/^(\d{3}\s+[A-ZА-Я]{3}|[A-ZА-Я]{1,3}\s*[•·★-]?\s*\d{1,5})\s+([A-ZА-Я0-9]{2,3})$/i);
        if (mAuth) {
            return buildNormalized(mAuth[1], mAuth[2], country);
        }
        const spaceIdx = str.lastIndexOf(' ');
        if (spaceIdx > 0 && /^(\d{2,3}|CA|NY|FL|TX|NV|DXB|AUH|SHJ|AJM|RAK|FUJ|UAQ|TKY|YKH|OSK|NGY|SPR|СССР|CD)$/i.test(str.slice(spaceIdx + 1))) {
            return buildNormalized(str.slice(0, spaceIdx), str.slice(spaceIdx + 1), country);
        }
        // Match standard Russian plate prefix
        const m2 = country === 'RUS' && str.match(/^([А-ЯA-Z]?)\s*(\d{1,3})\s*([А-ЯA-Z]{0,2})\s*(\d{2,3})?$/i);
        if (m2 && m2[2]) {
            const l1 = (m2[1] || 'А').toUpperCase();
            const digits = m2[2].padStart(3, '0');
            const l2 = (m2[3] || 'АА').toUpperCase();
            const reg = m2[4] || defaultRegionForCountry(country);
            return buildNormalized(`${l1} ${digits} ${l2}`, reg, country);
        }
        return buildNormalized(str, defaultRegionForCountry(country), country);
    }

    // Multi-country 3D License Plate (RUS, KZ, USA, UAE, JPN) with high-res crisp canvas texture & flags
    function createLicensePlate(arg0, arg1 = 'А 777 АА | 77 RUS', arg2 = true, arg3 = 'none', arg4 = 'classic') {
        let THREE, text, isFront, frameStyle, plateStyle;
        if (arg0 && typeof arg0 === 'object' && typeof arg0.Group === 'function') {
            THREE = arg0;
            text = arg1 !== undefined ? arg1 : 'А 777 АА | 77 RUS';
            isFront = arg2 !== undefined ? arg2 : true;
            frameStyle = arg3 || 'none';
            plateStyle = arg4 || 'classic';
        } else {
            THREE = (typeof globalThis !== 'undefined' && globalThis.THREE) || (typeof window !== 'undefined' && window.THREE) || null;
            text = arg0 !== undefined ? arg0 : 'А 777 АА | 77 RUS';
            isFront = arg1 !== undefined && typeof arg1 === 'boolean' ? arg1 : true;
            frameStyle = (typeof arg2 === 'string' ? arg2 : arg3) || 'none';
            plateStyle = (typeof arg3 === 'string' && typeof arg2 === 'string' ? arg3 : arg4) || 'classic';
        }

        if (typeof text === 'object' && text !== null) {
            if (text.frame || text.frameStyle) frameStyle = text.frame || text.frameStyle;
            if (text.style || text.plateStyle) plateStyle = text.style || text.plateStyle;
            text = text.text !== undefined ? text.text : '';
        }

        const group = new THREE.Group();
        group.name = isFront ? 'FrontLicensePlate' : 'RearLicensePlate';
        group.userData.isLicensePlate = true;
        group.userData.frameStyle = frameStyle;
        group.userData.plateStyle = plateStyle;

        if (text === null || text === 'none' || text === false || text === '') {
            group.visible = false;
            group.userData.plateCountry = 'RUS';
            return group;
        }

        const comp = formatPlateComponents(text);
        const country = comp.country || 'RUS';
        group.userData.plateCountry = country;
        if (comp.isNone) {
            group.visible = false;
            return group;
        }

        // Authentic physical plate dimensions: North American / Japanese JDM 2:1 (0.36x0.18) vs European/GOST 520x112mm
        const is2x1Plate = (country === 'USA' || country === 'JPN');
        const physicalFormats={RUS:[.520,.112],KZ:[.520,.112],USA:[.3048,.1524],JPN:[.330,.165],UAE:[.520,.110]};
        const [plateW,plateH]=physicalFormats[country]||physicalFormats.RUS;

        // Frame material color matching frameStyle: gold #d4af37, carbon #1e293b, chrome #e2e8f0, neon #00f2fe, or classic #111827
        const fStyle = String(frameStyle || 'none').toLowerCase();
        const frameColorHex = fStyle === 'gold' ? 0xd4af37
            : (fStyle === 'carbon' ? 0x1e293b
                : (fStyle === 'chrome' ? 0xe2e8f0
                    : (fStyle === 'neon' ? 0x00f2fe : 0x111827)));
        const frameRoughness = fStyle === 'chrome' ? 0.12 : (fStyle === 'gold' ? 0.22 : (fStyle === 'carbon' ? 0.38 : 0.65));
        const frameMetalness = fStyle === 'chrome' ? 0.92 : (fStyle === 'gold' ? 0.85 : (fStyle === 'carbon' ? 0.45 : 0.20));

        if (typeof document !== 'undefined') {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = is2x1Plate ? 256 : 128;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const regCode = comp.region;
                    const letters = comp.letters || 'VIP';
                    const digits = comp.digits || '777';
                    let customEmissiveIntensity = 0.28;

                    if(window.NOMERA_AUTHORS_PREVIEW&&window.NomeraRegistration&&plateStyle==='classic'&&!(country==='RUS'&&(!/^\d{2,3}$/.test(comp.region)||window.getUltraSpecialPlateMeta?.(text)))){canvas.height=Math.round(512*plateH/plateW);window.NomeraRegistration.paint(ctx,comp,{front:isFront});}
                    else if (country === 'JPN') {
                        // Authentic 512x256 Japanese MLIT Plate (自動車登録番号標 330x165mm, 2:1 aspect ratio)
                        const JPN_META = {
                            TKY: { kanji: '品川', seal: '東', classCode: '330', hira: 'さ' },
                            YKH: { kanji: '横浜', seal: '神', classCode: '300', hira: 'す' },
                            OSK: { kanji: 'なにわ', seal: '大', classCode: '330', hira: 'せ' },
                            NGY: { kanji: '名古屋', seal: '愛', classCode: '350', hira: 'そ' },
                            SPR: { kanji: '札幌', seal: '札', classCode: '301', hira: 'た' },
                            FKO: { kanji: '福岡', seal: '福', classCode: '330', hira: 'ち' },
                            KBE: { kanji: '神戸', seal: '兵', classCode: '302', hira: 'つ' },
                            KYO: { kanji: '京都', seal: '京', classCode: '310', hira: 'て' },
                            CHB: { kanji: '千葉', seal: '千', classCode: '320', hira: 'と' },
                            STM: { kanji: '大宮', seal: '埼', classCode: '300', hira: 'な' }
                        };
                        const JPN_HIRA_POOL = [
                            'あ','か','さ','す','せ','そ','た','ち','つ','て',
                            'と','な','に','ぬ','ね','の','は','ひ','ふ','ほ',
                            'ま','み','む','め','も','や','ゆ','よ','ら','り',
                            'る','れ','ろ','わ'
                        ];
                        const jpnMeta = JPN_META[regCode] || { kanji: '品川', seal: '東', classCode: '330', hira: 'さ' };
                        let jpnHira = jpnMeta.hira;
                        if (letters === 'JDM') jpnHira = 'わ';
                        else if (letters === 'GTR') jpnHira = 'さ';
                        else if (letters === 'TKY') jpnHira = 'あ';
                        else if (letters === 'DRF') jpnHira = 'ろ';
                        else if (letters && letters.length >= 3) {
                            const hIdx = (letters.charCodeAt(0) * 31 + letters.charCodeAt(1) * 17 + letters.charCodeAt(2) * 7) % JPN_HIRA_POOL.length;
                            jpnHira = JPN_HIRA_POOL[Math.abs(hIdx)] || jpnMeta.hira;
                        }
                        const isJdmGlow = ['JDM', 'GTR'].includes(letters) && ['777', '001', '007'].includes(digits);
                        group.userData.specialPlateType = isJdmGlow ? 'jdm_glow' : null;
                        if (isJdmGlow) customEmissiveIntensity = 0.68;

                        if (isJdmGlow) {
                            ctx.fillStyle = '#041814';
                        } else if (typeof ctx.createLinearGradient === 'function') {
                            const grad = ctx.createLinearGradient(0, 0, 0, 256);
                            grad.addColorStop(0, '#ffffff');
                            grad.addColorStop(1, '#f1f5f9');
                            ctx.fillStyle = grad;
                        } else {
                            ctx.fillStyle = '#ffffff';
                        }
                        ctx.fillRect(0, 0, 512, 256);

                        const jpnTextColor = isJdmGlow ? '#34d399' : '#064e3b';
                        ctx.strokeStyle = jpnTextColor;
                        ctx.lineWidth = 7;
                        ctx.strokeRect(6, 6, 500, 244);

                        // Top-left silver aluminum 封印 (Fūin) seal cap & top-right mounting bolt
                        ctx.fillStyle = '#cbd5e1';
                        if (typeof ctx.arc === 'function') {
                            ctx.beginPath();
                            ctx.arc(58, 48, 18, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.strokeStyle = '#64748b';
                            ctx.lineWidth = 2.5;
                            ctx.stroke();
                            ctx.beginPath();
                            ctx.arc(454, 48, 9, 0, Math.PI * 2);
                            ctx.fillStyle = '#94a3b8';
                            ctx.fill();
                        } else {
                            ctx.fillRect(40, 30, 36, 36);
                            ctx.fillStyle = '#94a3b8';
                            ctx.fillRect(446, 40, 16, 16);
                        }
                        ctx.fillStyle = '#1e293b';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = '900 18px "Hiragino Kaku Gothic ProN", "Yu Gothic", "Inter", sans-serif';
                        ctx.fillText(jpnMeta.seal || '東', 58, 49);

                        // Top row: Transport Bureau Kanji + 3-digit vehicle class code (e.g. 品川 330)
                        ctx.fillStyle = jpnTextColor;
                        ctx.font = '900 46px "Hiragino Kaku Gothic ProN", "Yu Gothic", "Inter", "Arial Black", sans-serif';
                        ctx.fillText(`${jpnMeta.kanji} ${jpnMeta.classCode}`, 256, 52);

                        // Bottom row: Left Hiragana character + 4-position Japanese digits with middle dots (・) & hyphen
                        ctx.font = '900 58px "Hiragino Kaku Gothic ProN", "Yu Gothic", "Inter", sans-serif';
                        ctx.fillText(jpnHira, 66, 166);

                        const serial = String(digits || '777').replace(/^0+(?=\d)/, '');
                        const formattedJpnDigits = serial.length === 4 ? serial.slice(0,2)+'-'+serial.slice(2) : serial.length===1 ? '・・ ・'+serial : serial.length===2 ? '・・ '+serial : '・'+serial;
                        ctx.font = '900 100px "Inter", "Arial Black", sans-serif';
                        ctx.fillText(formattedJpnDigits, 294, 168);
                    } else if (country === 'USA') {
                        // Authentic 512x256 (2:1 aspect ratio) North American State Plates (CA, NY, FL, TX, NV)
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        if (regCode === 'NY') {
                            // New York Empire Gold Plate (#fbbf24-#f59e0b) with top & bottom #172554 navy bands
                            if (typeof ctx.createLinearGradient === 'function') {
                                const grad = ctx.createLinearGradient(0, 0, 0, 256);
                                grad.addColorStop(0, '#fbbf24');
                                grad.addColorStop(1, '#f59e0b');
                                ctx.fillStyle = grad;
                            } else {
                                ctx.fillStyle = '#fbbf24';
                            }
                            ctx.fillRect(0, 0, 512, 256);

                            // Top (y = 0..56) and Bottom (y = 204..256) deep navy bands
                            ctx.fillStyle = '#172554';
                            ctx.fillRect(0, 0, 512, 56);
                            ctx.fillRect(0, 204, 512, 52);

                            // Gold NEW YORK header
                            ctx.fillStyle = '#fbbf24';
                            ctx.font = '900 36px "Arial Black", sans-serif';
                            ctx.fillText('NEW YORK', 256, 30);

                            // Embossed navy serial LETTERS-DIGITS at y = 134
                            ctx.fillStyle = '#172554';
                            ctx.font = '900 92px "Arial Black", sans-serif';
                            ctx.fillText(`${letters}-${digits}`, 256, 134);

                            // Gold THE EMPIRE STATE at bottom
                            ctx.fillStyle = '#fbbf24';
                            ctx.font = '800 22px "Inter", sans-serif';
                            ctx.fillText('THE EMPIRE STATE', 256, 230);
                        } else if (regCode === 'FL') {
                            // Florida Sunshine State Plate
                            if (typeof ctx.createLinearGradient === 'function') {
                                const grad = ctx.createLinearGradient(0, 0, 0, 256);
                                grad.addColorStop(0, '#ffffff');
                                grad.addColorStop(0.5, '#f8fafc');
                                grad.addColorStop(1, '#ecfdf5');
                                ctx.fillStyle = grad;
                            } else {
                                ctx.fillStyle = '#f8fafc';
                            }
                            ctx.fillRect(0, 0, 512, 256);

                            ctx.strokeStyle = '#046a38';
                            ctx.lineWidth = 6;
                            ctx.strokeRect(6, 6, 500, 244);

                            // Top orange MYFLORIDA.COM
                            ctx.fillStyle = '#ea580c';
                            ctx.font = '900 34px "Arial Black", sans-serif';
                            ctx.fillText('MYFLORIDA.COM', 256, 38);

                            // Center orange fruit circle (#f97316) with green leaf (#16a34a) at x = 256, y = 134
                            ctx.fillStyle = '#f97316';
                            if (typeof ctx.arc === 'function') {
                                ctx.beginPath();
                                ctx.arc(256, 134, 26, 0, Math.PI * 2);
                                ctx.fill();
                            } else {
                                ctx.fillRect(230, 108, 52, 52);
                            }
                            ctx.fillStyle = '#16a34a';
                            ctx.fillRect(254, 100, 14, 10);

                            // Dark-green (#046a38) embossed serial at y = 136
                            ctx.fillStyle = '#046a38';
                            ctx.font = '900 88px "Arial Black", sans-serif';
                            ctx.fillText(`${letters}   ${digits}`, 256, 136);

                            // Bottom orange SUNSHINE STATE
                            ctx.fillStyle = '#ea580c';
                            ctx.font = '800 22px "Inter", sans-serif';
                            ctx.fillText('SUNSHINE STATE', 256, 226);
                        } else if (regCode === 'TX') {
                            // Texas Lone Star State Plate
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, 512, 256);

                            ctx.strokeStyle = '#0f172a';
                            ctx.lineWidth = 6;
                            ctx.strokeRect(6, 6, 500, 244);

                            // Top-left Lone Star and top TEXAS header
                            ctx.fillStyle = '#0f172a';
                            ctx.font = '900 34px "Arial Black", sans-serif';
                            ctx.fillText('★', 54, 40);
                            ctx.font = '900 42px "Arial Black", sans-serif';
                            ctx.fillText('TEXAS', 256, 40);

                            // Black embossed serial with star separator at y = 136
                            ctx.font = '900 88px "Arial Black", sans-serif';
                            ctx.fillText(`${letters} ★ ${digits}`, 256, 136);

                            // Bottom THE LONE STAR STATE
                            ctx.font = '800 20px "Inter", sans-serif';
                            ctx.fillText('THE LONE STAR STATE', 256, 226);
                        } else if (regCode === 'NV') {
                            // Nevada Sierra Mountain Sky-Blue/Silver/Gold Gradient Plate
                            if (typeof ctx.createLinearGradient === 'function') {
                                const grad = ctx.createLinearGradient(0, 0, 0, 256);
                                grad.addColorStop(0, '#0284c7');
                                grad.addColorStop(0.45, '#bae6fd');
                                grad.addColorStop(0.78, '#fef3c7');
                                grad.addColorStop(1, '#f8fafc');
                                ctx.fillStyle = grad;
                            } else {
                                ctx.fillStyle = '#bae6fd';
                            }
                            ctx.fillRect(0, 0, 512, 256);

                            ctx.strokeStyle = '#0f172a';
                            ctx.lineWidth = 6;
                            ctx.strokeRect(6, 6, 500, 244);

                            // Top NEVADA header
                            ctx.fillStyle = '#ffffff';
                            ctx.font = '900 40px "Arial Black", sans-serif';
                            ctx.fillText('NEVADA', 256, 40);

                            // Dark slate embossed serial at y = 136
                            ctx.fillStyle = '#0f172a';
                            ctx.font = '900 90px "Arial Black", sans-serif';
                            ctx.fillText(`${letters} • ${digits}`, 256, 136);

                            // Bottom HOME MEANS NEVADA
                            ctx.fillStyle = '#0f172a';
                            ctx.font = '800 20px "Inter", sans-serif';
                            ctx.fillText('HOME MEANS NEVADA', 256, 226);
                        } else {
                            // California (CA) Default White Reflective Plate
                            if (typeof ctx.createLinearGradient === 'function') {
                                const grad = ctx.createLinearGradient(0, 0, 0, 256);
                                grad.addColorStop(0, '#ffffff');
                                grad.addColorStop(1, '#f1f5f9');
                                ctx.fillStyle = grad;
                            } else {
                                ctx.fillStyle = '#ffffff';
                            }
                            ctx.fillRect(0, 0, 512, 256);

                            ctx.strokeStyle = '#cbd5e1';
                            ctx.lineWidth = 6;
                            ctx.strokeRect(6, 6, 500, 244);

                            // Top-left blue OCT sticker & top-right red 2026 sticker
                            ctx.fillStyle = '#1d4ed8';
                            ctx.fillRect(22, 18, 64, 30);
                            ctx.fillStyle = '#ffffff';
                            ctx.font = '800 16px "Inter", sans-serif';
                            ctx.fillText('OCT', 54, 33);

                            ctx.fillStyle = '#dc2626';
                            ctx.fillRect(426, 18, 64, 30);
                            ctx.fillStyle = '#ffffff';
                            ctx.font = '800 16px "Inter", sans-serif';
                            ctx.fillText('2026', 458, 33);

                            // Red cursive script California at top (y = 44)
                            ctx.fillStyle = '#c8102e';
                            ctx.font = 'italic 900 46px Georgia, serif';
                            ctx.fillText('California', 256, 44);

                            // Deep navy (#13294b) embossed serial at y = 136
                            ctx.fillStyle = '#13294b';
                            ctx.font = '900 92px "Arial Black", sans-serif';
                            ctx.fillText(`${letters} • ${digits}`, 256, 136);

                            // Red dmv.ca.gov at bottom (y = 226)
                            ctx.fillStyle = '#c8102e';
                            ctx.font = '800 20px "Inter", sans-serif';
                            ctx.fillText('dmv.ca.gov', 256, 226);
                        }
                    } else if (country === 'UAE') {
                        // Official RTA Dubai, Abu Dhabi & All 7 UAE Emirates Plate (512x128)
                        let emirateKey = String(regCode || 'DXB').toUpperCase();
                        let codePart = String(comp.uaeCode || letters || (emirateKey === 'AUH' ? '5' : 'D')).toUpperCase();
                        const numStr = String(comp.uaeDigits || digits || '1');

                        // Map numeric 01..22 & 50 category codes to AUH while preserving category number in codePart
                        if (/^(?:50|0?[1-9]|1\d|2[0-2])$/.test(emirateKey)) {
                            codePart = String(parseInt(emirateKey, 10) || emirateKey);
                            emirateKey = 'AUH';
                        } else if (/^(?:50|0?[1-9]|1\d|2[0-2])$/.test(codePart)) {
                            codePart = String(parseInt(codePart, 10) || codePart);
                            if (emirateKey === 'AD') emirateKey = 'AUH';
                        } else if (emirateKey === 'AD') {
                            emirateKey = 'AUH';
                        }

                        const UAE_EMIRATE_META = {
                            DXB: { en: 'DUBAI', ar: 'دبي', accent: '#090d16' },
                            AUH: { en: 'A.D', ar: 'أبوظبي', accent: '#dc2626' },
                            SHJ: { en: 'SHARJAH', ar: 'الشارقة', accent: '#090d16' },
                            AJM: { en: 'AJMAN', ar: 'عجمان', accent: '#090d16' },
                            RAK: { en: 'R.A.K.', ar: 'رأس الخيمة', accent: '#090d16' },
                            FUJ: { en: 'FUJAIRAH', ar: 'الفجيرة', accent: '#991b1b' },
                            UAQ: { en: 'U.A.Q.', ar: 'أم القيوين', accent: '#1e293b' }
                        };
                        const emirateMeta = UAE_EMIRATE_META[emirateKey] || UAE_EMIRATE_META.DXB;
                        const isVipShortNum = numStr.length <= 2;
                        const digitFontPx = numStr.length === 1
                            ? 102
                            : (isVipShortNum ? 94 : (numStr.length === 3 ? 86 : (numStr.length === 4 ? 74 : 64)));

                        if (typeof ctx.createLinearGradient === 'function') {
                            const grad = ctx.createLinearGradient(0, 0, 0, 128);
                            grad.addColorStop(0, '#ffffff');
                            grad.addColorStop(1, '#f1f5f9');
                            ctx.fillStyle = grad;
                        } else {
                            ctx.fillStyle = '#ffffff';
                        }
                        ctx.fillRect(0, 0, 512, 128);

                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        if (emirateKey === 'AUH') {
                            // Abu Dhabi (AUH): Crimson/Red left band (x = 10..86, #dc2626) with white A.D / أبوظبي and category codePart
                            ctx.fillStyle = '#dc2626';
                            ctx.fillRect(10, 10, 76, 108);
                            ctx.fillStyle = '#ffffff';
                            ctx.font = '900 20px "Inter", "Arial Black", sans-serif';
                            ctx.fillText('A.D', 48, 42);
                            ctx.font = 'bold 20px sans-serif';
                            ctx.fillText('أبوظبي', 48, 84);

                            // Category number (1..22, 50) or code letter at x = 136, y = 66
                            ctx.fillStyle = '#090d16';
                            ctx.font = codePart.length >= 2 ? '900 44px "Inter", "Arial Black", sans-serif' : '900 50px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(codePart, 136, 66);

                            // Sleek Black Outer Border
                            ctx.strokeStyle = '#090d16';
                            ctx.lineWidth = 8;
                            ctx.strokeRect(6, 6, 500, 116);

                            // Vertical Black Divider at x = 184
                            ctx.beginPath();
                            ctx.moveTo(184, 8);
                            ctx.lineTo(184, 120);
                            ctx.lineWidth = 5;
                            ctx.stroke();

                            // Prominent centered UAE number (extra-bold for 1-digit and 2-digit VIP plates)
                            ctx.fillStyle = '#090d16';
                            ctx.font = `900 ${digitFontPx}px "Inter", "Arial Black", sans-serif`;
                            ctx.fillText(numStr, 344, 68);
                        } else {
                            // Dubai (DXB), Sharjah (SHJ), Ajman (AJM), Ras Al Khaimah (RAK), Fujairah (FUJ), Umm Al Quwain (UAQ)
                            const emirateTitle = emirateMeta.en;
                            const emirateArabic = emirateMeta.ar;

                            // Left compartment (x = 10..188): Top-left Emirate EN & Arabic, and RTA Code Letter(s) on x = 148, y = 66
                            ctx.fillStyle = emirateMeta.accent || '#090d16';
                            ctx.font = emirateTitle.length >= 7 ? '900 19px "Inter", "Arial Black", sans-serif' : '900 22px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(emirateTitle, 64, 40);
                            ctx.font = 'bold 26px sans-serif';
                            ctx.fillText(emirateArabic, 64, 82);

                            ctx.fillStyle = '#090d16';
                            ctx.font = codePart.length >= 2 ? '900 46px "Inter", "Arial Black", sans-serif' : '900 54px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(codePart, 148, 66);

                            // Sleek Black Outer Border
                            ctx.strokeStyle = '#090d16';
                            ctx.lineWidth = 8;
                            ctx.strokeRect(6, 6, 500, 116);

                            // Vertical Black Divider at x = 194
                            ctx.beginPath();
                            ctx.moveTo(194, 8);
                            ctx.lineTo(194, 120);
                            ctx.lineWidth = 5;
                            ctx.stroke();

                            // Right compartment (x = 198..500): Huge embossed RTA Digits (extra-bold for 1-digit and 2-digit VIP numbers)
                            ctx.fillStyle = '#090d16';
                            ctx.font = `900 ${digitFontPx}px "Inter", "Arial Black", sans-serif`;
                            ctx.fillText(numStr, 348, 68);
                        }
                    } else if (country === 'KZ') {
                        // Kazakhstan (СТ РК 986-2012) Authentic Plate (512x128)
                        if (typeof ctx.createLinearGradient === 'function') {
                            const grad = ctx.createLinearGradient(0, 0, 0, 128);
                            grad.addColorStop(0, '#f8fafc');
                            grad.addColorStop(1, '#e2e8f0');
                            ctx.fillStyle = grad;
                        } else {
                            ctx.fillStyle = '#f8fafc';
                        }
                        ctx.fillRect(0, 0, 512, 128);

                        ctx.strokeStyle = '#090d16';
                        ctx.lineWidth = 8;
                        ctx.strokeRect(6, 6, 500, 116);

                        // Left Strip (x = 18..70): Sky-blue (#00afca) Kazakhstan flag (w = 48, h = 28) + golden sun & eagle bar
                        const fx = 18, fy = 20, fw = 48, fh = 28;
                        ctx.fillStyle = '#00afca';
                        ctx.fillRect(fx, fy, fw, fh);
                        ctx.fillStyle = '#fbbf24';
                        if (typeof ctx.arc === 'function') {
                            ctx.beginPath();
                            ctx.arc(fx + fw / 2, fy + fh / 2 - 2, 5.5, 0, Math.PI * 2);
                            ctx.fill();
                        } else {
                            ctx.fillRect(fx + 18, fy + 6, 12, 12);
                        }
                        ctx.fillRect(fx + 14, fy + fh - 6, 20, 3);

                        // Bold KZ below flag at x = 42, y = 88 (NO vertical line after KZ)
                        ctx.fillStyle = '#090d16';
                        ctx.font = '800 28px "Inter", "Arial Black", sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('KZ', 42, 88);

                        // Center (x = 238, y = 66): Equal-height digits + letters (777 VIP)
                        const kzMain = `${digits} ${letters}`;
                        ctx.fillStyle = '#090d16';
                        ctx.font = '900 66px "Inter", "Arial Black", sans-serif';
                        ctx.fillText(kzMain, 238, 66);

                        // Vertical Black Divider at x = 402
                        ctx.strokeStyle = '#090d16';
                        ctx.beginPath();
                        ctx.moveTo(402, 8);
                        ctx.lineTo(402, 120);
                        ctx.lineWidth = 5;
                        ctx.stroke();

                        // Right Square (x = 452, y = 66): Large 2-digit region code
                        ctx.fillStyle = '#090d16';
                        ctx.font = '900 62px "Inter", "Arial Black", sans-serif';
                        ctx.fillText(regCode, 452, 66);
                    } else {
                        // Russian (RUS) Authentic GOST R 50577-93 + Ultra-Rare Special Plates (512x128)
                        const l1 = comp.l1 || (letters[0] || 'А');
                        const l2l3 = comp.l2l3 || (letters.slice(1, 3) || 'АА');
                        const isUssr = ['МОС', 'СВТ'].includes(letters) || regCode === 'СССР';
                        const isDiplomat = ['КМН', 'СМК'].includes(letters) || regCode === 'CD';
                        const isMvd = ['УМВ', 'РМВ'].includes(letters);
                        const isMilitary = ['ВМО', 'КМО'].includes(letters);
                        const isFederal = ['КРМ', 'РФС'].includes(letters);

                        group.userData.specialPlateType = isUssr ? 'ussr'
                            : (isDiplomat ? 'diplomat'
                                : (isMvd ? 'mvd'
                                    : (isMilitary ? 'military'
                                        : (isFederal ? 'federal' : null))));

                        if (isUssr) {
                            // 🏛️ СССР (Ретро ГОСТ 1977): Matte black background (#0b0f17), white border & stencil characters
                            ctx.fillStyle = '#0b0f17';
                            ctx.fillRect(0, 0, 512, 128);
                            ctx.strokeStyle = '#f8fafc';
                            ctx.lineWidth = 6;
                            ctx.strokeRect(6, 6, 500, 116);

                            ctx.beginPath();
                            ctx.moveTo(382, 8);
                            ctx.lineTo(382, 120);
                            ctx.lineWidth = 4;
                            ctx.stroke();

                            ctx.fillStyle = '#f8fafc';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.font = '900 72px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(`0${digits[1] || '0'}-${digits.slice(1) || '01'}`, 148, 66);
                            ctx.font = '900 54px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(letters, 312, 68);

                            ctx.fillStyle = '#ef4444';
                            ctx.font = '900 28px "Inter", sans-serif';
                            ctx.fillText('★', 446, 38);
                            ctx.fillStyle = '#f8fafc';
                            ctx.font = '900 30px "Inter", "Arial Black", sans-serif';
                            ctx.fillText('СССР', 446, 78);
                            ctx.font = '800 14px "Inter", sans-serif';
                            ctx.fillText('ГОСТ 77', 446, 104);
                        } else if (isDiplomat) {
                            // 📕 Дипломатический Красный (CD / МИД): Crimson red background (#b91c1c) with white text
                            ctx.fillStyle = '#b91c1c';
                            ctx.fillRect(0, 0, 512, 128);
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 6;
                            ctx.strokeRect(6, 6, 500, 116);

                            ctx.beginPath();
                            ctx.moveTo(382, 8);
                            ctx.lineTo(382, 120);
                            ctx.lineWidth = 4;
                            ctx.stroke();

                            ctx.fillStyle = '#ffffff';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.font = '900 68px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(digits, 116, 66);
                            ctx.font = '900 54px "Inter", "Arial Black", sans-serif';
                            ctx.fillText('CD', 248, 68);
                            ctx.font = '900 64px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(digits[2] || '1', 338, 66);

                            const dispReg = (regCode === 'CD' ? '77' : regCode);
                            ctx.font = '900 44px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(dispReg, 446, 46);
                            ctx.font = '800 22px "Inter", sans-serif';
                            ctx.fillText('RUS', 446, 96);
                        } else if (isMvd || isMilitary) {
                            // 🚔 Синий МВД (#1d4ed8) или 🪖 Военный Чёрный МО (#090d16)
                            ctx.fillStyle = isMvd ? '#1d4ed8' : '#090d16';
                            ctx.fillRect(0, 0, 512, 128);
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 6;
                            ctx.strokeRect(6, 6, 500, 116);

                            ctx.beginPath();
                            ctx.moveTo(382, 8);
                            ctx.lineTo(382, 120);
                            ctx.lineWidth = 4;
                            ctx.stroke();

                            ctx.fillStyle = '#ffffff';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.font = 'bold 52px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(l1, 58, 74);
                            ctx.font = '900 76px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(digits, 186, 68);
                            ctx.font = 'bold 52px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(l2l3, 316, 74);

                            ctx.font = '900 44px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(regCode, 446, 44);
                            ctx.font = '800 20px "Inter", sans-serif';
                            ctx.fillText(isMvd ? 'МВД RUS' : '★ МО РФ', 446, 96);
                        } else {
                            // Standard Russian GOST R 50577-93 or 🇷🇺 Federal Wide-Tricolor Plate
                            if (typeof ctx.createLinearGradient === 'function') {
                                const grad = ctx.createLinearGradient(0, 0, 0, 128);
                                grad.addColorStop(0, '#f8fafc');
                                grad.addColorStop(1, '#e2e8f0');
                                ctx.fillStyle = grad;
                            } else {
                                ctx.fillStyle = '#f8fafc';
                            }
                            ctx.fillRect(0, 0, 512, 128);

                            ctx.strokeStyle = '#090d16';
                            ctx.lineWidth = 8;
                            ctx.strokeRect(6, 6, 500, 116);

                            // 2 realistic bolt heads (x = 22, y = 64 and x = 368, y = 64)
                            [22, 368].forEach(bx => {
                                ctx.fillStyle = '#94a3b8';
                                if (typeof ctx.arc === 'function') {
                                    ctx.beginPath();
                                    ctx.arc(bx, 64, 4.5, 0, Math.PI * 2);
                                    ctx.fill();
                                } else {
                                    ctx.fillRect(bx - 4, 60, 8, 8);
                                }
                            });

                            // Vertical Black Divider at x = 382
                            ctx.strokeStyle = '#090d16';
                            ctx.beginPath();
                            ctx.moveTo(382, 8);
                            ctx.lineTo(382, 120);
                            ctx.lineWidth = 5;
                            ctx.stroke();

                            // Authentic GOST R 50577-93 Mixed-Size Baseline Typography
                            ctx.fillStyle = '#090d16';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.font = 'bold 52px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(l1, 58, 74);
                            ctx.font = '900 76px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(digits, 186, 68);
                            ctx.font = 'bold 52px "Inter", "Arial Black", sans-serif';
                            ctx.fillText(l2l3, 316, 74);

                            if (isFederal) {
                                // 🇷🇺 Федеральный Спецномер (Широкий Триколор ФСО / Кремль в правом окне)
                                const fx = 388, fy = 14, fw = 110, fh = 68;
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(fx, fy, fw, 22);
                                ctx.fillStyle = '#2563eb';
                                ctx.fillRect(fx, fy + 22, fw, 23);
                                ctx.fillStyle = '#dc2626';
                                ctx.fillRect(fx, fy + 45, fw, 23);
                                ctx.strokeStyle = '#090d16';
                                ctx.lineWidth = 2;
                                ctx.strokeRect(fx, fy, fw, fh);
                                ctx.fillStyle = '#090d16';
                                ctx.font = '900 22px "Inter", "Arial Black", sans-serif';
                                ctx.fillText('ФСО RUS', 444, 102);
                            } else {
                                // Right Region Block: large region digits (777) at x = 446, y = 44, bold RUS at x = 422, y = 98
                                const regFontSize = regCode.length > 2 ? 42 : 48;
                                ctx.font = `900 ${regFontSize}px "Inter", "Arial Black", sans-serif`;
                                ctx.fillText(regCode, 446, 44);

                                ctx.font = '800 22px "Inter", sans-serif';
                                ctx.fillText('RUS', 422, 98);

                                // Crisp 3-stripe Russian flag (white / #2563eb / #dc2626 with thin #090d16 border) at x = 456, y = 86
                                const fx = 456, fy = 86, fw = 38, fh = 22;
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(fx, fy, fw, 7.2);
                                ctx.fillStyle = '#2563eb';
                                ctx.fillRect(fx, fy + 7.2, fw, 7.2);
                                ctx.fillStyle = '#dc2626';
                                ctx.fillRect(fx, fy + 14.4, fw, 7.6);
                                ctx.strokeStyle = '#090d16';
                                ctx.lineWidth = 1.5;
                                ctx.strokeRect(fx, fy, fw, fh);
                            }
                        }
                    }

                    const tex = new THREE.CanvasTexture(canvas);
                    if(window.NOMERA_AUTHORS_PREVIEW&&window.NomeraRegistration&&plateStyle==='classic'&&!(country==='RUS'&&(!/^\d{2,3}$/.test(comp.region)||window.getUltraSpecialPlateMeta?.(text)))){let disposed=false;tex.addEventListener('dispose',()=>{disposed=true});window.NomeraRegistration.fonts().then(()=>{if(!disposed){window.NomeraRegistration.paint(ctx,comp,{front:isFront});tex.needsUpdate=true;}});}
                    tex.generateMipmaps = true;
                    tex.minFilter = THREE.LinearMipmapLinearFilter;
                    tex.anisotropy = 8;

                    const meshGeo = new THREE.PlaneGeometry(plateW, plateH);
                    if (!isFront) meshGeo.rotateY(Math.PI);
                    const meshMat = new THREE.MeshStandardMaterial({
                        map: tex,
                        emissive: new THREE.Color(0xffffff),
                        emissiveMap: tex,
                        emissiveIntensity: customEmissiveIntensity,
                        roughness: 0.22,
                        metalness: 0.12,
                        polygonOffset: true,
                        polygonOffsetFactor: -2,
                        polygonOffsetUnits: -2
                    });
                    const plateMesh = new THREE.Mesh(meshGeo, meshMat);
                    plateMesh.position.z = isFront ? 0.009 : -0.009;
                    plateMesh.userData.isLicensePlate = true;
                    group.add(plateMesh);

                    const frameRimGeo = new THREE.BoxGeometry(plateW + 0.014, plateH + 0.014, 0.014);
                    const frameRimMat = new THREE.MeshStandardMaterial({
                        color: frameColorHex,
                        roughness: frameRoughness,
                        metalness: frameMetalness,
                        emissive: fStyle === 'neon' ? new THREE.Color(0x00f2fe) : new THREE.Color(0x000000),
                        emissiveIntensity: fStyle === 'neon' ? 0.65 : 0
                    });
                    const frameRim = new THREE.Mesh(frameRimGeo, frameRimMat);
                    frameRim.position.z = isFront ? -0.003 : 0.003;
                    frameRim.userData.isLicensePlate = true;
                    group.add(frameRim);

                    const backGeo = new THREE.BoxGeometry(plateW + 0.02, plateH + 0.02, 0.012);
                    const backMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
                    const back = new THREE.Mesh(backGeo, backMat);
                    back.position.z = isFront ? -0.006 : 0.006;
                    back.userData.isLicensePlate = true;
                    group.add(back);

                    group.userData.plateText = text;
                    group.userData.plateCountry = country;
                    return group;
                }
            } catch (_) {}
        }

        const plateGeo = new THREE.BoxGeometry(plateW, plateH, 0.015);
        const plateMat = new THREE.MeshStandardMaterial({
            color: 0xfdfdfd,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: 0.22,
            roughness: 0.22,
            metalness: 0.12,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });
        const mesh = new THREE.Mesh(plateGeo, plateMat);
        mesh.position.z = isFront ? 0.009 : -0.009;
        mesh.userData.isLicensePlate = true;
        group.add(mesh);

        const frameGeo = new THREE.BoxGeometry(plateW + 0.014, plateH + 0.014, 0.014);
        const frameMat = new THREE.MeshStandardMaterial({
            color: frameColorHex,
            roughness: frameRoughness,
            metalness: frameMetalness
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.z = isFront ? -0.003 : 0.003;
        frame.userData.isLicensePlate = true;
        group.add(frame);

        const backGeo = new THREE.BoxGeometry(plateW + 0.02, plateH + 0.02, 0.012);
        const backMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
        const back = new THREE.Mesh(backGeo, backMat);
        back.position.z = isFront ? -0.006 : 0.006;
        back.userData.isLicensePlate = true;
        group.add(back);

        group.userData.plateText = text;
        group.userData.plateCountry = country;
        return group;
    }

    function getCarProfile(carId) {
        const cid = String(carId || '').toLowerCase();
        const isSuv = cid === 'g63' || cid === 'lc300' || cid === 'cullinan';
        const isButterfly = cid === 'huracan' || cid === 'sf90' || cid === 'chiron' || cid === 'jesko' || cid === 'm8';
        const isSupercar = isButterfly || cid === 'porsche911' || cid === 'gtr';
        const isHatch = cid === 'vaz2109' || cid === 'polo' || cid === 'rs6';
        const isClassic = cid === 'vaz2107' || cid === 'vaz2109' || cid === 'gaz24';
        const isMidEngine = cid === 'huracan' || cid === 'sf90' || cid === 'chiron' || cid === 'jesko' || cid === 'porsche911';
        return {
            carId: cid,
            isSuv,
            isSupercar,
            isButterfly,
            isHatch,
            isClassic,
            isMidEngine
        };
    }

    function isIgnoredAccessoryOrRigNode(node, rootNode) {
        let p = node;
        while (p && p !== rootNode) {
            if (p.userData && (p.userData.isInteractiveRigNode || p.userData.isLicensePlate || p.userData.authorsAccessory)) {
                return true;
            }
            const nm = String(p.name || '');
            if (/^(?:GLB_InteractiveRig|Door_FL_Pivot|Door_FR_Pivot|Door_CavityGroup|Hood_Pivot|EngineBayGroup|Trunk_Pivot|SubwooferGroup|GLB_SpoilerGroup|GLB_Spoiler|SpoilerGroup|GLB_BodykitGroup|GLB_RoofScoopGroup|GLB_HoodGroup|SGUGroup|GLB_NeonTubes|NeonGroup|LicensePlatesGroup|GLB_FrontLicensePlate|GLB_RearLicensePlate|FrontLicensePlate|RearLicensePlate|ChassisUndertray|GLB_Undertray|ShowroomHeadlightCones|ShowroomHeadlightFlares|ShowroomTaillightFlares|HeadlightsGroup)$/i.test(nm)) {
                return true;
            }
            p = p.parent;
        }
        return false;
    }

    // Automatic 3D Light Coordinates Detector for GLTF and procedural models
    function detectVehicleLightPositions(model, carId, THREE) {
        const fallback = {
            hlL: new THREE.Vector3(-0.65, 0.65, 2.15),
            hlR: new THREE.Vector3(0.65, 0.65, 2.15),
            tlL: new THREE.Vector3(-0.65, 0.65, -2.15),
            tlR: new THREE.Vector3(0.65, 0.65, -2.15)
        };
        if (!model || !THREE) return fallback;

        try {
            model.updateMatrixWorld(true);
            const box = new THREE.Box3();
            model.traverse(c => {
                if (c.isMesh && c.geometry && !isIgnoredAccessoryOrRigNode(c, model)) {
                    const cb = new THREE.Box3().setFromObject(c);
                    if (!cb.isEmpty() && (cb.max.y - cb.min.y) > 0.05) {
                        box.union(cb);
                    }
                }
            });
            if (box.isEmpty()) box.setFromObject(model);
            if (box.isEmpty()) return fallback;

            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const halfW = (size.x || 1.8) * 0.5;
            const carH = size.y || 1.4;

            // Front fascia Z threshold for headlights, Rear fascia Z threshold for taillights
            const hlMinZ = box.max.z - Math.min(0.85, Math.max(0.25, size.z * 0.18));
            const tlMaxZ = box.min.z + Math.min(0.85, Math.max(0.25, size.z * 0.18));

            const hlCandidates = [];
            const tlCandidates = [];

            const badWords = /interior|seat|dash|mirror|wheel|tire|plate|bottom|chassis|under|roof|cabin|radiator|grille|intake|diffuser|disc|caliper|pad|rotor|exhaust|hood|bonnet|scoop|vent|toit|glass_toit|wiper|spoiler|wing/i;

            model.traverse(c => {
                if (isIgnoredAccessoryOrRigNode(c, model)) return;
                if (!c.name && (!c.material || !c.material.name)) return;
                const mn = String((c.material && c.material.name) || '').toLowerCase();
                const nn = String(c.name || '').toLowerCase();

                if (badWords.test(nn) || badWords.test(mn)) return;

                const isHl = (/headlight|head.*light|headlamp|head.*lamp|headglass|f_light|lamp.*front|fara|fary|mt_light_emissive/i.test(mn) ||
                              /headlight|head.*light|headlamp|head.*lamp|headglass|f_light|fara|fary/i.test(nn)) &&
                             !/taillight|tail|rear|back|brake/i.test(mn) && !/taillight|tail|rear|back|brake/i.test(nn);

                const isTl = /taillight|tail.*light|tail.*lamp|tailglass|tailpiece|reflector.*tl|reflector.*bl|brake.*light|rear.*light|stop.*light|zadn.*fara/i.test(mn) ||
                             /taillight|tail.*light|tail.*lamp|tailglass|tailpiece|brake.*light|rear.*light|stop.*light|zadn.*fara|backlight/i.test(nn);

                if (!isHl && !isTl) return;

                const b = new THREE.Box3().setFromObject(c);
                if (b.isEmpty() || (b.max.y - b.min.y) <= 0.01) return;
                const bSize = b.getSize(new THREE.Vector3());
                const bCen = b.getCenter(new THREE.Vector3());

                // Headlights & taillights are on the car body fascia (not roof, not ground floor)
                if (bCen.y < box.min.y + size.y * 0.18 || bCen.y > box.min.y + size.y * 0.80) return;

                if (isHl && bCen.z >= hlMinZ) {
                    let priority = 1;
                    if (/emissive|light_emissive|led/i.test(mn)) priority += 6;
                    if (/headlight|headlamp|headglass/i.test(nn)) priority += 4;
                    if (!/bumper/i.test(nn)) priority += 2;
                    hlCandidates.push({ node: c, box: b, center: bCen, size: bSize, priority });
                } else if (isTl && bCen.z <= tlMaxZ) {
                    let priority = 1;
                    if (/reflector|emissive|led/i.test(mn)) priority += 6;
                    if (/tail_light|taillight|tailglass|tailpiece/i.test(nn)) priority += 4;
                    tlCandidates.push({ node: c, box: b, center: bCen, size: bSize, priority });
                }
            });

            hlCandidates.sort((a, b) => b.priority - a.priority);
            tlCandidates.sort((a, b) => b.priority - a.priority);

            function extractLeftRight(candidates) {
                let leftPos = null;
                let rightPos = null;

                for (const cand of candidates) {
                    const node = cand.node;
                    const b = cand.box;
                    const bCen = cand.center;

                    // Case A: Symmetrical combined mesh (spans both left and right sides)
                    if (b.min.x < center.x - 0.20 && b.max.x > center.x + 0.20) {
                        if (node.isMesh && node.geometry && node.geometry.attributes && node.geometry.attributes.position) {
                            node.updateMatrixWorld(true);
                            const pos = node.geometry.attributes.position;
                            const v = new THREE.Vector3();
                            const bL = new THREE.Box3();
                            const bR = new THREE.Box3();
                            const step = Math.max(1, Math.floor(pos.count / 2000));
                            for (let i = 0; i < pos.count; i += step) {
                                v.fromBufferAttribute(pos, i);
                                v.applyMatrix4(node.matrixWorld);
                                if (v.x < center.x - 0.12) bL.expandByPoint(v);
                                else if (v.x > center.x + 0.12) bR.expandByPoint(v);
                            }
                            if (!bL.isEmpty() && !bR.isEmpty()) {
                                leftPos = bL.getCenter(new THREE.Vector3());
                                rightPos = bR.getCenter(new THREE.Vector3());
                                break;
                            }
                        }
                        const spanX = (b.max.x - center.x) * 0.78;
                        leftPos = new THREE.Vector3(center.x - spanX, bCen.y, bCen.z);
                        rightPos = new THREE.Vector3(center.x + spanX, bCen.y, bCen.z);
                        break;
                    }

                    // Case B: Separate left / right mesh
                    if (bCen.x < center.x - 0.12 && !leftPos) {
                        leftPos = bCen.clone();
                    } else if (bCen.x > center.x + 0.12 && !rightPos) {
                        rightPos = bCen.clone();
                    }

                    if (leftPos && rightPos) break;
                }

                return { leftPos, rightPos };
            }

            const hlResult = extractLeftRight(hlCandidates);
            const tlResult = extractLeftRight(tlCandidates);

            const cid = carId || (model.userData && model.userData.carId) || '';
            const profile = getCarProfile(cid);
            const isSUV = profile.isSuv || size.y > 1.7;
            const isSuper = profile.isSupercar || size.y < 1.25;

            const minFrontY = box.min.y + carH * 0.38;
            const maxFrontY = box.min.y + carH * 0.62;
            const minRearY = box.min.y + carH * 0.38;
            const maxRearY = box.min.y + carH * (isSuper ? 0.68 : 0.62);
            const minSpanX = halfW * 0.50;
            const maxSpanX = halfW * 0.85;

            let hlL, hlR, tlL, tlR;

            if (hlResult.leftPos && hlResult.rightPos) {
                const rawY = (hlResult.leftPos.y + hlResult.rightPos.y) * 0.5;
                const avgY = Math.max(minFrontY, Math.min(maxFrontY, rawY));
                const avgZ = (hlResult.leftPos.z + hlResult.rightPos.z) * 0.5;
                const rawDistX = (Math.abs(hlResult.leftPos.x - center.x) + Math.abs(hlResult.rightPos.x - center.x)) * 0.5;
                const halfDistX = Math.max(minSpanX, Math.min(maxSpanX, rawDistX));
                hlL = new THREE.Vector3(center.x - halfDistX, avgY, avgZ);
                hlR = new THREE.Vector3(center.x + halfDistX, avgY, avgZ);
            } else {
                const hlY = isSUV ? (box.min.y + carH * 0.48) : (isSuper ? (box.min.y + carH * 0.50) : (box.min.y + carH * 0.48));
                const hlX = halfW * 0.72;
                const hlZ = box.max.z - Math.min(0.28, Math.max(0.12, size.z * 0.045));
                hlL = new THREE.Vector3(center.x - hlX, hlY, hlZ);
                hlR = new THREE.Vector3(center.x + hlX, hlY, hlZ);
            }

            if (tlResult.leftPos && tlResult.rightPos) {
                const rawY = (tlResult.leftPos.y + tlResult.rightPos.y) * 0.5;
                const avgY = Math.max(minRearY, Math.min(maxRearY, rawY));
                const avgZ = (tlResult.leftPos.z + tlResult.rightPos.z) * 0.5;
                const rawDistX = (Math.abs(tlResult.leftPos.x - center.x) + Math.abs(tlResult.rightPos.x - center.x)) * 0.5;
                const halfDistX = Math.max(minSpanX, Math.min(maxSpanX, rawDistX));
                tlL = new THREE.Vector3(center.x - halfDistX, avgY, avgZ);
                tlR = new THREE.Vector3(center.x + halfDistX, avgY, avgZ);
            } else {
                const tlY = isSUV ? (box.min.y + carH * 0.42) : (isSuper ? (box.min.y + carH * 0.50) : (box.min.y + carH * 0.48));
                const tlX = halfW * 0.74;
                const tlZ = box.min.z + Math.min(0.22, Math.max(0.08, size.z * 0.035));
                tlL = new THREE.Vector3(center.x - tlX, tlY, tlZ);
                tlR = new THREE.Vector3(center.x + tlX, tlY, tlZ);
            }

            return { hlL, hlR, tlL, tlR };
        } catch (_) {
            return fallback;
        }
    }

    function isIgnoredPlateRaycastNode(node, rootNode) {
        let cur = node;
        while (cur && cur !== rootNode) {
            if (cur.userData && (cur.userData.isLicensePlate || cur.userData.isOpenOnlyLiner)) {
                return true;
            }
            const n = cur.name || '';
            if (
                n === 'LicensePlate_Front' ||
                n === 'LicensePlate_Rear' ||
                n === 'FrontLicensePlate' ||
                n === 'RearLicensePlate' ||
                n === 'GLB_FrontLicensePlate' ||
                n === 'GLB_RearLicensePlate' ||
                n === 'LicensePlatesGroup' ||
                n === 'GLB_SpoilerGroup' ||
                n === 'GLB_Spoiler' ||
                n === 'SpoilerGroup' ||
                n === 'NeonGroup' ||
                n === 'GLB_NeonTubes' ||
                n === 'SGUGroup' ||
                n === 'EngineBayGroup' ||
                n === 'SubwooferGroup' ||
                n === 'Door_CavityGroup' ||
                n === 'ChassisUndertray' ||
                n === 'GLB_Undertray' ||
                n === 'ShowroomHeadlightCones' ||
                n === 'ShowroomHeadlightFlares' ||
                n === 'ShowroomTaillightFlares' ||
                n === 'HeadlightsGroup'
            ) {
                return true;
            }
            cur = cur.parent;
        }
        return false;
    }

    // Universal License Plate attacher/updater for procedural & GLTF 3D models
    function applyLicensePlateToModel(arg0, arg1, arg2, arg3 = 'none', arg4 = 'classic') {
        let THREE, modelRoot, plateText, frameStyle, plateStyle;
        if (arg0 && (typeof arg0.Group === 'function' || typeof arg0.Box3 === 'function' || typeof arg0.Vector3 === 'function')) {
            THREE = arg0;
            modelRoot = arg1;
            plateText = arg2;
            frameStyle = arg3 !== undefined ? arg3 : 'none';
            plateStyle = arg4 !== undefined ? arg4 : 'classic';
        } else {
            THREE = (typeof window !== 'undefined' && window.THREE)
                ? window.THREE
                : (typeof global !== 'undefined' && global.THREE ? global.THREE : null);
            modelRoot = arg0;
            plateText = arg1;
            frameStyle = arg2 !== undefined ? arg2 : 'none';
            plateStyle = arg3 !== undefined ? arg3 : 'classic';
        }
        if (!THREE || !modelRoot) return;

        let text = (typeof plateText === 'object' && plateText !== null) ? plateText.text : plateText;
        if (typeof plateText === 'object' && plateText !== null) {
            if (plateText.frameStyle && (!frameStyle || frameStyle === 'none')) frameStyle = plateText.frameStyle;
            if (plateText.plateStyle && (!plateStyle || plateStyle === 'classic')) plateStyle = plateText.plateStyle;
        }
        const fStyle = frameStyle || 'none';
        const pStyle = plateStyle || 'classic';

        if (!modelRoot.userData) modelRoot.userData = {};
        modelRoot.userData.plateText = text;
        modelRoot.userData.frameStyle = fStyle;
        modelRoot.userData.plateStyle = pStyle;

        const isNone = (text === null || text === 'none' || text === false || text === '' || text === undefined);

        // 1. Search for existing plates
        let frontPlates = [];
        let rearPlates = [];
        modelRoot.traverse(child => {
            if (child.name === 'FrontLicensePlate' || child.name === 'GLB_FrontLicensePlate' || child.name === 'LicensePlate_Front') {
                frontPlates.push(child);
            }
            if (child.name === 'RearLicensePlate' || child.name === 'GLB_RearLicensePlate' || child.name === 'LicensePlate_Rear') {
                rearPlates.push(child);
            }
        });

        if (isNone) {
            frontPlates.forEach(p => { p.visible = false; });
            rearPlates.forEach(p => { p.visible = false; });
            modelRoot.traverse(c => {
                if (!c.name) return;
                const n = c.name.toLowerCase();
                if (n.includes('plate_01') || n.includes('plate_02') || n.includes('reg plate') || n.includes('tail_led_plate')) {
                    c.visible = false;
                }
            });
            return;
        }

        // Compute model dimensions & bounds including interactive body panels (Hood_Pivot / Trunk_Pivot)
        modelRoot.updateMatrixWorld(true);
        const box = new THREE.Box3();
        const bodyMeshes = [];
        modelRoot.traverse(child => {
            if (child.isMesh && child.visible && child.geometry) {
                if (isIgnoredPlateRaycastNode(child, modelRoot)) return;
                const n = String(child.name || '').toLowerCase();
                if (!n.includes('licenseplate') && !n.includes('spoiler') && !n.includes('neon') && !n.includes('sgu')) {
                    const mb = new THREE.Box3().setFromObject(child);
                    if (mb.max.y - mb.min.y > 0.05) {
                        box.union(mb);
                    }
                    if (!n.includes('wheel') && !n.includes('tire') && !n.includes('tyre') && !n.includes('caliper') && !n.includes('brake') && !n.includes('plate')) {
                        bodyMeshes.push(child);
                    }
                }
            }
        });
        if (box.isEmpty()) box.setFromObject(modelRoot);

        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const carId = modelRoot.userData.carId || '';

        // Check if model contains built-in plate nodes (e.g. vaz2107, bmw_m4, etc.)
        let existingFP = null, existingRP = null;
        modelRoot.traverse(child => {
            if (!child.name || isIgnoredPlateRaycastNode(child, modelRoot)) return;
            const n = child.name.toLowerCase();
            if ((n.includes('plate_01') || n.includes('reg plate (front)') || n.includes('plate_f') || n.includes('licenseplate_front')) && !existingFP) {
                existingFP = child;
            }
            if ((n.includes('plate_02') || n.includes('reg plate (back)') || n.includes('plate_r') || n.includes('licenseplate_rear')) && !n.includes('tail_led') && !existingRP) {
                existingRP = child;
            }
        });

        const isSUV = (carId === 'g63' || carId === 'lc300' || carId === 'cullinan') || size.y > 1.7;
        const isSuper = (carId === 'sf90' || carId === 'huracan' || carId === 'jesko' || carId === 'porsche911') || size.y < 1.25;

        let frontY, rearY, frontZ, rearZ;
        const raycaster = (typeof THREE.Raycaster === 'function') ? new THREE.Raycaster() : null;
        const raycastMeshes = bodyMeshes.filter(c => {
            if (!c || !c.material) return false;
            if (Array.isArray(c.material) && c.geometry && Array.isArray(c.geometry.groups)) {
                return c.geometry.groups.every(g => Boolean(c.material[g.materialIndex]));
            }
            return true;
        });
        const sampleXOffsets = [-0.16, 0, 0.16];
        const sampleYOffsets = [-0.03, 0, 0.03];

        if (existingFP) {
            const b = new THREE.Box3().setFromObject(existingFP);
            const cen = b.getCenter(new THREE.Vector3());
            frontY = cen.y;
            frontZ = b.max.z + 0.006;
            existingFP.visible = false;
        } else {
            frontY = isSUV ? (box.min.y + Math.max(0.58, Math.min(0.72, size.y * 0.31)))
                           : (isSuper ? (box.min.y + Math.max(0.36, Math.min(0.44, size.y * 0.36)))
                                      : (box.min.y + Math.max(0.40, Math.min(0.52, size.y * 0.31))));

            let bestFZ = -Infinity;
            const minZThresh = box.min.z + size.z * 0.65;

            if (raycaster && raycastMeshes.length > 0) {
                const rayDirF = new THREE.Vector3(0, 0, -1);
                for (const dx of sampleXOffsets) {
                    for (const dy of sampleYOffsets) {
                        raycaster.set(new THREE.Vector3(center.x + dx, frontY + dy, box.max.z + 1.0), rayDirF);
                        const hits = raycaster.intersectObjects(raycastMeshes, false);
                        if (hits && hits.length > 0) {
                            const hitZ = hits[0].point.z;
                            if (hitZ > minZThresh && hitZ > bestFZ) {
                                bestFZ = hitZ;
                            }
                        }
                    }
                }
            }

            const v = new THREE.Vector3();
            for (let m = 0; m < bodyMeshes.length; m++) {
                const c = bodyMeshes[m];
                const attr = c.geometry && c.geometry.attributes && c.geometry.attributes.position;
                if (!attr) continue;
                const mw = c.matrixWorld;
                for (let i = 0; i < attr.count; i++) {
                    v.fromBufferAttribute(attr, i);
                    v.applyMatrix4(mw);
                    if (Math.abs(v.x - center.x) < 0.42 && Math.abs(v.y - frontY) < 0.16 && v.z > minZThresh) {
                        if (v.z > bestFZ) bestFZ = v.z;
                    }
                }
            }

            const minFrontSurfaceZ = box.max.z - (size.z * 0.035);
            const resolvedFZ = isFinite(bestFZ) ? Math.max(bestFZ, minFrontSurfaceZ) : box.max.z;
            frontZ = resolvedFZ + 0.016;
        }

        if (existingRP) {
            const b = new THREE.Box3().setFromObject(existingRP);
            const cen = b.getCenter(new THREE.Vector3());
            rearY = cen.y;
            rearZ = b.min.z - 0.006;
            existingRP.visible = false;
        } else {
            rearY = isSUV ? (box.min.y + Math.max(0.68, Math.min(0.85, size.y * 0.36)))
                          : (isSuper ? (box.min.y + Math.max(0.44, Math.min(0.55, size.y * 0.42)))
                                     : (box.min.y + Math.max(0.52, Math.min(0.66, size.y * 0.40))));

            let bestRZ = Infinity;
            const maxZThresh = box.min.z + size.z * 0.35;

            if (raycaster && raycastMeshes.length > 0) {
                const rayDirR = new THREE.Vector3(0, 0, 1);
                for (const dx of sampleXOffsets) {
                    for (const dy of sampleYOffsets) {
                        raycaster.set(new THREE.Vector3(center.x + dx, rearY + dy, box.min.z - 1.0), rayDirR);
                        const hits = raycaster.intersectObjects(raycastMeshes, false);
                        if (hits && hits.length > 0) {
                            const hitZ = hits[0].point.z;
                            if (hitZ < maxZThresh && hitZ < bestRZ) {
                                bestRZ = hitZ;
                            }
                        }
                    }
                }
            }

            const v = new THREE.Vector3();
            for (let m = 0; m < bodyMeshes.length; m++) {
                const c = bodyMeshes[m];
                const attr = c.geometry && c.geometry.attributes && c.geometry.attributes.position;
                if (!attr) continue;
                const mw = c.matrixWorld;
                for (let i = 0; i < attr.count; i++) {
                    v.fromBufferAttribute(attr, i);
                    v.applyMatrix4(mw);
                    if (Math.abs(v.x - center.x) < 0.42 && Math.abs(v.y - rearY) < 0.16 && v.z < maxZThresh) {
                        if (v.z < bestRZ) bestRZ = v.z;
                    }
                }
            }

            const maxRearSurfaceZ = box.min.z + (size.z * 0.035);
            const resolvedRZ = isFinite(bestRZ) ? Math.min(bestRZ, maxRearSurfaceZ) : box.min.z;
            rearZ = resolvedRZ - 0.016;
        }

        const worldFront = new THREE.Vector3(center.x, frontY, frontZ);
        const worldRear = new THREE.Vector3(center.x, rearY, rearZ);

        // 2. If plates already exist, update them with new text and recalibrate position
        if (frontPlates.length > 0 || rearPlates.length > 0) {
            frontPlates.forEach(oldFP => {
                oldFP.visible = true;
                const newFP = createLicensePlate(THREE, text, true, fStyle, pStyle);
                while (oldFP.children.length > 0) {
                    const oldChild = oldFP.children[0];
                    disposeObject3D(oldChild);
                    oldFP.remove(oldChild);
                }
                while (newFP.children.length > 0) {
                    oldFP.add(newFP.children[0]);
                }
                oldFP.userData.isLicensePlate = true;
                oldFP.userData.plateText = text;
                oldFP.userData.plateCountry = newFP.userData.plateCountry;
                oldFP.userData.frameStyle = fStyle;
                oldFP.userData.plateStyle = pStyle;
                if (oldFP.parent && (oldFP.name === 'GLB_FrontLicensePlate' || oldFP.name === 'LicensePlate_Front')) {
                    const localF = worldFront.clone();
                    oldFP.parent.worldToLocal(localF);
                    oldFP.position.copy(localF);
                }
            });

            rearPlates.forEach(oldRP => {
                oldRP.visible = true;
                const newRP = createLicensePlate(THREE, text, false, fStyle, pStyle);
                while (oldRP.children.length > 0) {
                    const oldChild = oldRP.children[0];
                    disposeObject3D(oldChild);
                    oldRP.remove(oldChild);
                }
                while (newRP.children.length > 0) {
                    oldRP.add(newRP.children[0]);
                }
                oldRP.userData.isLicensePlate = true;
                oldRP.userData.plateText = text;
                oldRP.userData.plateCountry = newRP.userData.plateCountry;
                oldRP.userData.frameStyle = fStyle;
                oldRP.userData.plateStyle = pStyle;
                if (oldRP.parent && (oldRP.name === 'GLB_RearLicensePlate' || oldRP.name === 'LicensePlate_Rear')) {
                    const localR = worldRear.clone();
                    oldRP.parent.worldToLocal(localR);
                    oldRP.position.copy(localR);
                }
            });
            return;
        }

        // 3. Attach fresh GLB plates flush to front and rear bumper surfaces
        const fp = createLicensePlate(THREE, text, true, fStyle, pStyle);
        fp.name = 'GLB_FrontLicensePlate';
        const localFront = worldFront.clone();
        modelRoot.worldToLocal(localFront);
        fp.position.copy(localFront);
        modelRoot.add(fp);

        const rp = createLicensePlate(THREE, text, false, fStyle, pStyle);
        rp.name = 'GLB_RearLicensePlate';
        const localRear = worldRear.clone();
        modelRoot.worldToLocal(localRear);
        rp.position.copy(localRear);
        modelRoot.add(rp);
    }

    // Side Mirrors (Left & Right) with mirror glass reflections
    function createSideMirrors(THREE, mats, cabinW, cabinOffsetZ, mountY, mountZ, style = 'modern') {
        const group = new THREE.Group();
        group.name = 'SideMirrorsGroup';

        [-1, 1].forEach(side => {
            const mirrorGroup = new THREE.Group();
            const posX = side * (cabinW * 0.51 + 0.04);

            // Mirror housing
            const houseW = 0.14;
            const houseH = 0.08;
            const houseD = 0.10;
            const houseGeo = new THREE.BoxGeometry(houseW, houseH, houseD);
            const houseMesh = new THREE.Mesh(houseGeo, style === 'chrome' ? mats.chrome : mats.paint);
            houseMesh.position.set(side * 0.06, 0, 0);
            mirrorGroup.add(houseMesh);

            // Mirror glass (facing rear)
            const glassGeo = new THREE.PlaneGeometry(houseW * 0.9, houseH * 0.85);
            glassGeo.rotateY(side > 0 ? -Math.PI : Math.PI);
            const glassMesh = new THREE.Mesh(glassGeo, mats.chrome);
            glassMesh.position.set(side * 0.06, 0, -houseD * 0.505);
            mirrorGroup.add(glassMesh);

            // Stalk / Mount
            const stalkGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.08, 8);
            stalkGeo.rotateZ(side * Math.PI / 4);
            const stalk = new THREE.Mesh(stalkGeo, mats.darkPlastic);
            stalk.position.set(-side * 0.01, -0.02, 0);
            mirrorGroup.add(stalk);

            mirrorGroup.position.set(posX, mountY, mountZ);
            group.add(mirrorGroup);
        });

        return group;
    }

    // Windshield Wipers
    function createWipers(THREE, mats, cabinW, mountY, mountZ) {
        const group = new THREE.Group();
        group.name = 'WindshieldWipers';

        [-1, 1].forEach((side, idx) => {
            const armGeo = new THREE.BoxGeometry(0.012, 0.012, 0.28);
            armGeo.rotateY(Math.PI / 14);
            const arm = new THREE.Mesh(armGeo, mats.trim);
            arm.position.set(side * cabinW * 0.22, mountY, mountZ);
            group.add(arm);
        });

        return group;
    }

    // =========================================================================
    // 🚘 VEHICLE-SPECIFIC HIGH-DETAIL BUILDERS
    // =========================================================================

    function buildVehicleChassis(THREE, mats, carId, carName) {
        const root = new THREE.Group();
        root.name = 'CarBodyAndDetails';

        // -------------------------------------------------------------
        // 1. ВАЗ-2107 «Жигули» (Classic boxy Soviet sedan, iconic chrome grille)
        // -------------------------------------------------------------
        if (carId === 'vaz2107') {
            const L = 3.82, W = 1.58, H = 0.60;
            const cL = 1.88, cW = 1.38, cH = 0.56;
            const baseY = 0.38;

            // Main lower body
            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Chrome rain gutters and classic side waistline molding
            const moldGeo = new THREE.BoxGeometry(W * 1.01, 0.025, L * 0.94);
            const mold = new THREE.Mesh(moldGeo, mats.trim);
            mold.position.set(0, baseY + H * 0.52, 0);
            root.add(mold);

            // Stepped boxy cabin
            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.06);
            root.add(cabin);

            // Windows
            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.8, 0.06);
            wsGeo.rotateX(-Math.PI / 11);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.06 + cL * 0.51);
            root.add(ws);

            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.78, 0.06);
            rgGeo.rotateX(Math.PI / 13);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.06 - cL * 0.51);
            root.add(rg);

            // Side glass
            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.72, cL * 0.86);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.06);
                root.add(sg);
            });

            // Iconic VAZ-2107 Chrome Grille (tall, bold vertical slats)
            const grilleGeo = new THREE.BoxGeometry(W * 0.58, H * 0.48, 0.08);
            const grille = new THREE.Mesh(grilleGeo, mats.chrome);
            grille.position.set(0, baseY + H * 0.56, L * 0.505);
            root.add(grille);

            // Chrome surround frame
            const frameGeo = new THREE.BoxGeometry(W * 0.62, H * 0.52, 0.06);
            const frame = new THREE.Mesh(frameGeo, mats.chrome);
            frame.position.set(0, baseY + H * 0.56, L * 0.502);
            root.add(frame);

            // Vertical chrome slats
            for (let i = -5; i <= 5; i++) {
                const slatGeo = new THREE.BoxGeometry(0.012, H * 0.44, 0.02);
                const slat = new THREE.Mesh(slatGeo, mats.chrome);
                slat.position.set(i * (W * 0.048), baseY + H * 0.56, L * 0.545);
                root.add(slat);
            }

            // Iconic Lada Boat Emblem («Ладья») on VAZ-2107 grille
            const badgeBaseGeo = new THREE.BoxGeometry(0.08, 0.12, 0.02);
            const badgeBaseMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.3 });
            const badgeBase = new THREE.Mesh(badgeBaseGeo, badgeBaseMat);
            badgeBase.position.set(0, baseY + H * 0.58, L * 0.55);
            root.add(badgeBase);

            const shipGeo = new THREE.CylinderGeometry(0.015, 0.005, 0.09, 3);
            const ship = new THREE.Mesh(shipGeo, mats.chrome);
            ship.position.set(0, baseY + H * 0.58, L * 0.554);
            root.add(ship);

            // Rectangular Headlights + amber corner turn signals
            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.16, H * 0.32, 0.06);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.36, baseY + H * 0.56, L * 0.504);
                root.add(hl);

                const indGeo = new THREE.BoxGeometry(W * 0.07, H * 0.32, 0.05);
                const ind = new THREE.Mesh(indGeo, mats.amberIndicator);
                ind.position.set(side * W * 0.465, baseY + H * 0.56, L * 0.495);
                root.add(ind);
            });

            // Classic Chrome Bumpers with black rubber overriders
            [-1, 1].forEach(side => {
                const isF = side > 0;
                const bZ = isF ? L * 0.52 : -L * 0.52;
                const bmpGeo = new THREE.BoxGeometry(W * 1.04, 0.10, 0.09);
                const bmp = new THREE.Mesh(bmpGeo, mats.chrome);
                bmp.position.set(0, baseY + 0.14, bZ);
                root.add(bmp);

                const rubGeo = new THREE.BoxGeometry(W * 0.98, 0.04, 0.105);
                const rub = new THREE.Mesh(rubGeo, mats.trim);
                rub.position.set(0, baseY + 0.14, bZ);
                root.add(rub);
            });

            // Ribbed VAZ-2107 Horizontal Taillights
            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.28, H * 0.30, 0.06);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.32, baseY + H * 0.56, -L * 0.503);
                root.add(tl);
            });

            // Single classic straight exhaust
            const exGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12);
            exGeo.rotateX(Math.PI / 2);
            const ex = new THREE.Mesh(exGeo, mats.chrome);
            ex.position.set(-W * 0.34, baseY + 0.05, -L * 0.52);
            root.add(ex);

            // Cockpit & details
            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.06, baseY + H + 0.08, 0.72, 'chrome'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.76));

            // License Plates
            const fp = createLicensePlate(THREE, 'А 777 АА | 77 RUS', true);
            fp.position.set(0, baseY + 0.14, L * 0.57);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'А 777 АА | 77 RUS', false);
            rp.position.set(0, baseY + H * 0.44, -L * 0.51);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.33, wheelTrack: W * 0.48, wheelR: 0.33 };
        }

        // -------------------------------------------------------------
        // 2. ВАЗ-2109 «Девятка» (Wedge hatchback "Зубило", wide plastic bumpers, spoiler)
        // -------------------------------------------------------------
        if (carId === 'vaz2109') {
            const L = 3.90, W = 1.65, H = 0.56;
            const cL = 2.15, cW = 1.40, cH = 0.52;
            const baseY = 0.36;

            // 1. Chisel Wedge Body ("Зубило")
            const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), mats.paint);
            body.position.set(0, baseY + H * 0.45, 0);
            root.add(body);

            // Forward chisel nose slope
            const noseGeo = new THREE.BoxGeometry(W * 0.96, 0.08, L * 0.28);
            noseGeo.rotateX(Math.PI / 14);
            const nose = new THREE.Mesh(noseGeo, mats.paint);
            nose.position.set(0, baseY + H * 0.72, L * 0.36);
            root.add(nose);

            // Thick black unpainted plastic wrap-around bumpers (Iconic Samara)
            [-1, 1].forEach(side => {
                const isF = side > 0;
                const bZ = isF ? L * 0.515 : -L * 0.515;
                const bmp = new THREE.Mesh(new THREE.BoxGeometry(W * 1.04, 0.16, 0.14), mats.trim);
                bmp.position.set(0, baseY + 0.12, bZ);
                root.add(bmp);
            });

            // Black protective door moldings
            [-1, 1].forEach(side => {
                const rub = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, L * 0.85), mats.trim);
                rub.position.set(side * (W * 0.505), baseY + H * 0.38, 0);
                root.add(rub);
            });

            // 2. Angular Hatchback Cabin
            const cabin = new THREE.Mesh(new THREE.BoxGeometry(cW, cH, cL), mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.08);
            root.add(cabin);

            // Sloped Windshield
            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.82, 0.05);
            wsGeo.rotateX(-Math.PI / 7.2);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.08 + cL * 0.508);
            root.add(ws);

            // Raked Hatchback Tailgate Glass
            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.84, 0.05);
            rgGeo.rotateX(Math.PI / 4.8);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.08 - cL * 0.508);
            root.add(rg);

            // Rear spoiler lip
            const spoiler = new THREE.Mesh(new THREE.BoxGeometry(cW * 0.95, 0.035, 0.14), mats.trim);
            spoiler.position.set(0, baseY + H + cH * 0.96, -0.08 - cL * 0.48);
            root.add(spoiler);

            [-1, 1].forEach(side => {
                const sg = new THREE.Mesh(new THREE.BoxGeometry(0.03, cH * 0.72, cL * 0.86), mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.08);
                root.add(sg);
            });

            // 3. Rectangular Headlights + Amber Turn Signals
            [-1, 1].forEach(side => {
                const hl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.18, H * 0.34, 0.06), mats.headlightLED);
                hl.position.set(side * W * 0.32, baseY + H * 0.58, L * 0.504);
                root.add(hl);

                const ind = new THREE.Mesh(new THREE.BoxGeometry(W * 0.08, H * 0.34, 0.08), mats.amberIndicator);
                ind.position.set(side * (W * 0.44), baseY + H * 0.58, L * 0.495);
                root.add(ind);
            });

            // Black plastic horizontal ribbed grille
            const grille = new THREE.Mesh(new THREE.BoxGeometry(W * 0.46, H * 0.38, 0.06), mats.darkPlastic);
            grille.position.set(0, baseY + H * 0.58, L * 0.505);
            root.add(grille);

            // Lada boat badge
            const badge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.025), new THREE.MeshStandardMaterial({ color: 0x991b1b }));
            badge.position.set(0, baseY + H * 0.60, L * 0.54);
            root.add(badge);

            // 4. Large Ribbed Rectangular Taillights
            [-1, 1].forEach(side => {
                const tl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.28, H * 0.32, 0.06), mats.taillightRed);
                tl.position.set(side * W * 0.32, baseY + H * 0.54, -L * 0.502);
                root.add(tl);
            });

            // Straight single chrome exhaust pipe
            const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.16, 12), mats.chrome);
            ex.rotateX(Math.PI / 2);
            ex.position.set(-W * 0.32, baseY + 0.06, -L * 0.52);
            root.add(ex);

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.06, baseY + H + 0.06, 0.70, 'trim'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.75));

            // License Plate (63 RUS - Samara / Tolyatti)
            const fp = createLicensePlate(THREE, 'В 2109 АЗ | 63 RUS', true);
            fp.position.set(0, baseY + 0.14, L * 0.565);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'В 2109 АЗ | 63 RUS', false);
            rp.position.set(0, baseY + H * 0.38, -L * 0.515);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.33, wheelTrack: W * 0.52, wheelR: 0.32, defaultWheels: 'stamps' };
        }

        // -------------------------------------------------------------
        // 3. Mercedes-Benz G63 AMG «Гелик» (Iconic G-Wagon, Panamericana grille, side pipes, spare wheel)
        // -------------------------------------------------------------
        if (carId === 'g63') {
            const L = 4.25, W = 1.88, H = 0.98;
            const cL = 2.45, cW = 1.74, cH = 0.82;
            const baseY = 0.50; // High ground clearance

            // Tall boxy body
            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Tall greenhouse
            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.15);
            root.add(cabin);

            // Flat vertical windshield
            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.78, 0.05);
            wsGeo.rotateX(-Math.PI / 18);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.15 + cL * 0.505);
            root.add(ws);

            // Flat rear door window
            const rgGeo = new THREE.BoxGeometry(cW * 0.88, cH * 0.74, 0.05);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.15 - cL * 0.505);
            root.add(rg);

            // Side glass with thick black pillars
            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.04, cH * 0.72, cL * 0.88);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.15);
                root.add(sg);
            });

            // AMG Panamericana Grille (vertical chrome bars)
            const grilleGeo = new THREE.BoxGeometry(W * 0.52, H * 0.44, 0.08);
            const grille = new THREE.Mesh(grilleGeo, mats.darkPlastic);
            grille.position.set(0, baseY + H * 0.54, L * 0.505);
            root.add(grille);

            // Chrome vertical slats
            for (let i = -5; i <= 5; i++) {
                const slatGeo = new THREE.BoxGeometry(0.018, H * 0.40, 0.02);
                const slat = new THREE.Mesh(slatGeo, mats.chrome);
                slat.position.set(i * (W * 0.045), baseY + H * 0.54, L * 0.545);
                root.add(slat);
            }

            // Central Mercedes Star
            const starGeo = new THREE.TorusGeometry(0.12, 0.02, 8, 20);
            const star = new THREE.Mesh(starGeo, mats.chrome);
            star.position.set(0, baseY + H * 0.54, L * 0.55);
            root.add(star);

            // Round Headlights with LED Halo Rings
            [-1, 1].forEach(side => {
                const ringGeo = new THREE.TorusGeometry(0.13, 0.022, 10, 24);
                const ring = new THREE.Mesh(ringGeo, mats.headlightLED);
                ring.position.set(side * W * 0.36, baseY + H * 0.54, L * 0.505);
                root.add(ring);

                const bulbGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16);
                bulbGeo.rotateX(Math.PI / 2);
                const bulb = new THREE.Mesh(bulbGeo, mats.headlightLED);
                bulb.position.set(side * W * 0.36, baseY + H * 0.54, L * 0.50);
                root.add(bulb);
            });

            // Iconic Fender-Top Indicator Turn Signal Boxes (on top of hood wings!)
            [-1, 1].forEach(side => {
                const turnGeo = new THREE.BoxGeometry(0.10, 0.07, 0.18);
                const turn = new THREE.Mesh(turnGeo, mats.amberIndicator);
                turn.position.set(side * (W * 0.44), baseY + H + 0.04, L * 0.38);
                root.add(turn);
            });

            // AMG Dual Side-Exit Exhausts under rear running boards (both left and right!)
            [-1, 1].forEach(side => {
                const pipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.16, 12);
                pipeGeo.rotateZ(Math.PI / 2);
                const pipe1 = new THREE.Mesh(pipeGeo, mats.chrome);
                pipe1.position.set(side * (W * 0.52), baseY + 0.06, -0.45);
                root.add(pipe1);

                const pipe2 = new THREE.Mesh(pipeGeo, mats.chrome);
                pipe2.position.set(side * (W * 0.52), baseY + 0.06, -0.58);
                root.add(pipe2);
            });

            // Tailgate Mounted Full Spare Tire with Chrome Ring
            const spareGeo = new THREE.CylinderGeometry(0.40, 0.40, 0.18, 28);
            spareGeo.rotateX(Math.PI / 2);
            const spare = new THREE.Mesh(spareGeo, mats.paint);
            spare.position.set(0, baseY + H * 0.72, -L * 0.51 - 0.12);
            root.add(spare);

            const spareRingGeo = new THREE.TorusGeometry(0.40, 0.035, 10, 28);
            const spareRing = new THREE.Mesh(spareRingGeo, mats.chrome);
            spareRing.position.set(0, baseY + H * 0.72, -L * 0.51 - 0.12);
            root.add(spareRing);

            // Horizontal bumper taillights
            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.22, 0.09, 0.06);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.35, baseY + 0.26, -L * 0.505);
                root.add(tl);
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.15, baseY + H + 0.12, 0.90, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.95));

            const fp = createLicensePlate(THREE, 'В 777 ВВ | 777 RUS', true);
            fp.position.set(0, baseY + 0.22, L * 0.52);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'В 777 ВВ | 777 RUS', false);
            rp.position.set(0, baseY + 0.22, -L * 0.51);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.34, wheelTrack: W * 0.49, wheelR: 0.38 };
        }

        // -------------------------------------------------------------
        // 4. Nissan GT-R R35 Nismo (V-motion grille, lightning lights, 4 circular afterburners)
        // -------------------------------------------------------------
        if (carId === 'gtr') {
            const L = 4.30, W = 1.84, H = 0.50;
            const cL = 1.85, cW = 1.48, cH = 0.44;
            const baseY = 0.32;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.44, 0);
            root.add(body);

            // Wide aerodynamic greenhouse
            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.44, -0.10);
            root.add(cabin);

            // Raked windshield
            const wsGeo = new THREE.BoxGeometry(cW * 0.94, cH * 0.88, 0.06);
            wsGeo.rotateX(-Math.PI / 5.2);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.44, -0.10 + cL * 0.48);
            root.add(ws);

            // Slanted rear fastback window
            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.85, 0.06);
            rgGeo.rotateX(Math.PI / 4.5);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.44, -0.10 - cL * 0.48);
            root.add(rg);

            // Side glass
            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.04, cH * 0.68, cL * 0.78);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.44, -0.10);
                root.add(sg);
            });

            // Massive GT-R Front Bumper Air Dam & Intercooler mouth
            const mouthGeo = new THREE.BoxGeometry(W * 0.68, H * 0.48, 0.14);
            const mouth = new THREE.Mesh(mouthGeo, mats.darkPlastic);
            mouth.position.set(0, baseY + H * 0.44, L * 0.495);
            root.add(mouth);

            // Red Nismo front splitter lip
            const lipGeo = new THREE.BoxGeometry(W * 1.02, 0.04, 0.18);
            const nismoRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
            const lip = new THREE.Mesh(lipGeo, nismoRedMat);
            lip.position.set(0, baseY + 0.04, L * 0.495);
            root.add(lip);

            // Swept-back vertical Lightning-bolt Headlights
            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.16, H * 0.40, 0.32);
                hlGeo.rotateX(-Math.PI / 9);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.38, baseY + H * 0.65, L * 0.42);
                root.add(hl);
            });

            // ICONIC NISSAN GT-R 4 ROUND AFTERBURNER TAILLIGHTS
            [-1, 1].forEach(side => {
                // Outer bigger circle
                const tOutGeo = new THREE.TorusGeometry(0.12, 0.024, 10, 24);
                const tOut = new THREE.Mesh(tOutGeo, mats.taillightRed);
                tOut.position.set(side * (W * 0.34), baseY + H * 0.62, -L * 0.503);
                root.add(tOut);

                // Inner slightly smaller circle
                const tInGeo = new THREE.TorusGeometry(0.09, 0.022, 10, 24);
                const tIn = new THREE.Mesh(tInGeo, mats.taillightRed);
                tIn.position.set(side * (W * 0.18), baseY + H * 0.62, -L * 0.503);
                root.add(tIn);
            });

            // Quad Titanium Exhaust Tips (huge 5-inch exhaust pipes!)
            [-1, 1].forEach(side => {
                [-0.07, 0.07].forEach(offset => {
                    const exGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.14, 16);
                    exGeo.rotateX(Math.PI / 2);
                    const ex = new THREE.Mesh(exGeo, mats.chrome);
                    ex.position.set(side * (W * 0.32) + offset, baseY + 0.08, -L * 0.51);
                    root.add(ex);
                });
            });

            // Nismo Rear Carbon Wing
            const wingGeo = new THREE.BoxGeometry(W * 0.90, 0.04, 0.28);
            const wing = new THREE.Mesh(wingGeo, mats.carbon);
            wing.position.set(0, baseY + H + 0.24, -L * 0.42);
            root.add(wing);

            [-1, 1].forEach(side => {
                const strutGeo = new THREE.BoxGeometry(0.03, 0.24, 0.10);
                const strut = new THREE.Mesh(strutGeo, mats.carbon);
                strut.position.set(side * cW * 0.34, baseY + H + 0.12, -L * 0.42);
                root.add(strut);
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.10, baseY + H + 0.06, 0.65, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.70));

            const fp = createLicensePlate(THREE, 'Е 001 КХ | 777 RUS', true);
            fp.position.set(0, baseY + 0.16, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'Е 001 КХ | 777 RUS', false);
            rp.position.set(0, baseY + 0.32, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.33, wheelTrack: W * 0.49, wheelR: 0.34 };
        }

        // -------------------------------------------------------------
        // 5. Bugatti Chiron Super Sport (Horseshoe grille, 8-eyes, C-Line, light strip)
        // -------------------------------------------------------------
        if (carId === 'chiron') {
            const L = 4.40, W = 1.96, H = 0.42;
            const cL = 1.65, cW = 1.44, cH = 0.38;
            const baseY = 0.28;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.44, 0);
            root.add(body);

            // Bubble aerodynamic cockpit
            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.44, -0.05);
            root.add(cabin);

            // Curved windshield
            const wsGeo = new THREE.BoxGeometry(cW * 0.94, cH * 0.90, 0.06);
            wsGeo.rotateX(-Math.PI / 4.8);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.44, -0.05 + cL * 0.46);
            root.add(ws);

            // Exposed W16 engine bay with clear glass cover
            const engCoverGeo = new THREE.BoxGeometry(cW * 0.70, 0.04, cL * 0.65);
            const engCover = new THREE.Mesh(engCoverGeo, mats.glass);
            engCover.position.set(0, baseY + H + 0.02, -cL * 0.55);
            root.add(engCover);

            // W16 engine intake plenums (metallic dual blocks)
            [-0.14, 0.14].forEach(x => {
                const blockGeo = new THREE.BoxGeometry(0.18, 0.12, 0.50);
                const block = new THREE.Mesh(blockGeo, mats.chrome);
                block.position.set(x, baseY + H - 0.04, -cL * 0.55);
                root.add(block);
            });

            // ICONIC BUGATTI C-LINE (Sweeping curve along both flanks)
            [-1, 1].forEach(side => {
                const cCurveGeo = new THREE.TorusGeometry(0.72, 0.035, 10, 32, Math.PI);
                cCurveGeo.rotateY(side * Math.PI / 2);
                cCurveGeo.rotateZ(Math.PI / 2);
                const cCurve = new THREE.Mesh(cCurveGeo, mats.chrome);
                cCurve.position.set(side * (W * 0.502), baseY + H * 0.6, 0);
                root.add(cCurve);
            });

            // ICONIC BUGATTI HORSESHOE GRILLE
            const horseGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.10, 24);
            horseGeo.rotateX(Math.PI / 2);
            const horse = new THREE.Mesh(horseGeo, mats.darkPlastic);
            horse.position.set(0, baseY + H * 0.48, L * 0.495);
            root.add(horse);

            const horseRimGeo = new THREE.TorusGeometry(0.24, 0.03, 8, 24);
            const horseRim = new THREE.Mesh(horseRimGeo, mats.chrome);
            horseRim.position.set(0, baseY + H * 0.48, L * 0.505);
            root.add(horseRim);

            // Bugatti 8-Eye LED Headlights (4 square crystal projectors per side!)
            [-1, 1].forEach(side => {
                for (let i = 0; i < 4; i++) {
                    const eyeGeo = new THREE.BoxGeometry(0.045, 0.045, 0.05);
                    const eye = new THREE.Mesh(eyeGeo, mats.headlightLED);
                    eye.position.set(side * (W * 0.28 + i * 0.05), baseY + H * 0.62, L * 0.485 - i * 0.02);
                    root.add(eye);
                }
            });

            // FULL-WIDTH 1.6m HORIZONTAL LED TAILLIGHT STRIP
            const lightStripGeo = new THREE.BoxGeometry(W * 0.88, 0.04, 0.05);
            const lightStrip = new THREE.Mesh(lightStripGeo, mats.taillightRed);
            lightStrip.position.set(0, baseY + H * 0.62, -L * 0.502);
            root.add(lightStrip);

            // Massive Central Exhaust with quad exits
            const exGeo = new THREE.BoxGeometry(0.28, 0.08, 0.12);
            const ex = new THREE.Mesh(exGeo, mats.chrome);
            ex.position.set(0, baseY + 0.12, -L * 0.505);
            root.add(ex);

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.05, baseY + H + 0.04, 0.65, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.68));

            const fp = createLicensePlate(THREE, 'Х 777 ХХ | 777 RUS', true);
            fp.position.set(0, baseY + 0.10, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'Х 777 ХХ | 777 RUS', false);
            rp.position.set(0, baseY + 0.25, -L * 0.508);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.32, wheelTrack: W * 0.49, wheelR: 0.34 };
        }

        // -------------------------------------------------------------
        // 6. ГАЗ-24 «Волга» (Long Soviet executive sedan, chrome waterfall grille, leaping deer emblem, round headlamps)
        // -------------------------------------------------------------
        if (carId === 'gaz24') {
            const L = 4.70, W = 1.80, H = 0.58;
            const cL = 2.25, cW = 1.50, cH = 0.54;
            const baseY = 0.36;

            // 1. Stately Soviet Executive Body
            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // 2. Hood Center Crease Rib (Iconic Volga centerline spine)
            const hoodRibGeo = new THREE.BoxGeometry(0.02, 0.015, L * 0.32);
            const hoodRib = new THREE.Mesh(hoodRibGeo, mats.chrome);
            hoodRib.position.set(0, baseY + H + 0.008, L * 0.33);
            root.add(hoodRib);

            // 3. Chrome Full-Length Waistline Spear Molding (Front to Rear)
            [-1, 1].forEach(side => {
                const spearGeo = new THREE.BoxGeometry(0.018, 0.025, L * 0.98);
                const spear = new THREE.Mesh(spearGeo, mats.chrome);
                spear.position.set(side * (W * 0.505), baseY + H * 0.55, 0);
                root.add(spear);

                // Chrome "Волга" script badge on front fender
                const badgeGeo = new THREE.BoxGeometry(0.015, 0.03, 0.12);
                const badge = new THREE.Mesh(badgeGeo, mats.chrome);
                badge.position.set(side * (W * 0.508), baseY + H * 0.65, L * 0.28);
                root.add(badge);

                // Chrome door handles (front & rear doors)
                [0.22, -0.42].forEach(dz => {
                    const handleGeo = new THREE.BoxGeometry(0.02, 0.022, 0.11);
                    const handle = new THREE.Mesh(handleGeo, mats.chrome);
                    handle.position.set(side * (W * 0.51), baseY + H * 0.54, dz);
                    root.add(handle);
                });

                // Wheel arch chrome lip trims
                [L * 0.33, -L * 0.33].forEach(wz => {
                    const archGeo = new THREE.TorusGeometry(0.36, 0.016, 6, 16, Math.PI);
                    archGeo.rotateY(Math.PI / 2);
                    const arch = new THREE.Mesh(archGeo, mats.chrome);
                    arch.position.set(side * (W * 0.502), baseY + 0.12, wz);
                    root.add(arch);
                });
            });

            // 4. Stately Soviet Cabin (Greenhouse)
            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.06);
            root.add(cabin);

            // Chrome drip moldings along roof edges
            [-1, 1].forEach(side => {
                const gutterGeo = new THREE.BoxGeometry(0.02, 0.015, cL * 1.02);
                const gutter = new THREE.Mesh(gutterGeo, mats.chrome);
                gutter.position.set(side * (cW * 0.505), baseY + H + cH * 0.94, -0.06);
                root.add(gutter);
            });

            // Sloped Windshield with chrome trim frame
            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.84, 0.05);
            wsGeo.rotateX(-Math.PI / 8.2);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.06 + cL * 0.508);
            root.add(ws);

            const wsFrame = new THREE.Mesh(new THREE.BoxGeometry(cW * 0.94, 0.02, 0.06), mats.chrome);
            wsFrame.position.set(0, baseY + H + 0.02, -0.06 + cL * 0.52);
            root.add(wsFrame);

            // Rear window with chrome surround
            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.80, 0.05);
            rgGeo.rotateX(Math.PI / 9.5);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.06 - cL * 0.508);
            root.add(rg);

            // Side windows
            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.74, cL * 0.86);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.06);
                root.add(sg);

                // C-pillar iconic Volga rectangular chrome louvers & ruby reflector
                const ventGeo = new THREE.BoxGeometry(0.025, 0.09, 0.13);
                const vent = new THREE.Mesh(ventGeo, mats.chrome);
                vent.position.set(side * (cW * 0.51), baseY + H + cH * 0.44, -0.06 - cL * 0.38);
                root.add(vent);

                const refGeo = new THREE.BoxGeometry(0.028, 0.045, 0.05);
                const ref = new THREE.Mesh(refGeo, mats.taillightRed);
                ref.position.set(side * (cW * 0.512), baseY + H + cH * 0.44, -0.06 - cL * 0.38);
                root.add(ref);
            });

            // 5. Authentic GAZ-24 Chrome Waterfall Grille (28 vertical slats + surround)
            const grilleOpening = new THREE.BoxGeometry(W * 0.66, H * 0.46, 0.08);
            const grilleBack = new THREE.Mesh(grilleOpening, mats.darkPlastic);
            grilleBack.position.set(0, baseY + H * 0.54, L * 0.505);
            root.add(grilleBack);

            const grilleFrame = new THREE.Mesh(new THREE.BoxGeometry(W * 0.68, H * 0.48, 0.05), mats.chrome);
            grilleFrame.position.set(0, baseY + H * 0.54, L * 0.51);
            root.add(grilleFrame);

            for (let i = -13; i <= 13; i++) {
                const slatGeo = new THREE.BoxGeometry(0.009, H * 0.42, 0.02);
                const slat = new THREE.Mesh(slatGeo, mats.chrome);
                slat.position.set(i * (W * 0.023), baseY + H * 0.54, L * 0.545);
                root.add(slat);
            }

            // Authentic Soviet GAZ Shield & Leaping Deer Emblem
            const deerShieldGeo = new THREE.BoxGeometry(0.07, 0.09, 0.025);
            const deerShieldMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.3, metalness: 0.6 });
            const deerShield = new THREE.Mesh(deerShieldGeo, deerShieldMat);
            deerShield.position.set(0, baseY + H * 0.58, L * 0.552);
            root.add(deerShield);

            const deerFigure = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.02), mats.chrome);
            deerFigure.position.set(0, baseY + H * 0.58, L * 0.558);
            root.add(deerFigure);

            // Twin Large Round Headlights with deep chrome bezels
            [-1, 1].forEach(side => {
                const bezelGeo = new THREE.TorusGeometry(0.125, 0.024, 12, 28);
                const bezel = new THREE.Mesh(bezelGeo, mats.chrome);
                bezel.position.set(side * W * 0.39, baseY + H * 0.54, L * 0.508);
                root.add(bezel);

                const hlGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.04, 24);
                hlGeo.rotateX(Math.PI / 2);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.39, baseY + H * 0.54, L * 0.505);
                root.add(hl);

                // Amber round parking lamp below headlight
                const turnBezel = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16), mats.chrome);
                turnBezel.position.set(side * W * 0.39, baseY + H * 0.22, L * 0.51);
                root.add(turnBezel);

                const turnGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.03, 16);
                turnGeo.rotateX(Math.PI / 2);
                const turn = new THREE.Mesh(turnGeo, mats.amberIndicator);
                turn.position.set(side * W * 0.39, baseY + H * 0.22, L * 0.508);
                root.add(turn);
            });

            // Massive Soviet Chrome Bumpers with vertical bumper guards (клыки)
            [-1, 1].forEach(side => {
                const isF = side > 0;
                const bZ = isF ? L * 0.528 : -L * 0.528;
                const bmpGeo = new THREE.BoxGeometry(W * 1.05, 0.12, 0.12);
                const bmp = new THREE.Mesh(bmpGeo, mats.chrome);
                bmp.position.set(0, baseY + 0.14, bZ);
                root.add(bmp);

                // Black rubber protective center strip
                const rubGeo = new THREE.BoxGeometry(W * 1.02, 0.04, 0.125);
                const rub = new THREE.Mesh(rubGeo, mats.trim);
                rub.position.set(0, baseY + 0.14, bZ);
                root.add(rub);

                // Twin vertical fangs (клыки) with rubber cushions
                [-W * 0.24, W * 0.24].forEach(fx => {
                    const fangGeo = new THREE.BoxGeometry(0.055, 0.24, 0.15);
                    const fang = new THREE.Mesh(fangGeo, mats.chrome);
                    fang.position.set(fx, baseY + 0.18, bZ + (isF ? 0.025 : -0.025));
                    root.add(fang);

                    const fangPad = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 0.02), mats.trim);
                    fangPad.position.set(fx, baseY + 0.18, bZ + (isF ? 0.088 : -0.088));
                    root.add(fangPad);
                });
            });

            // Multi-lens horizontal rectangular taillights with chrome bezels
            [-1, 1].forEach(side => {
                const tlFrame = new THREE.Mesh(new THREE.BoxGeometry(W * 0.28, 0.13, 0.05), mats.chrome);
                tlFrame.position.set(side * W * 0.33, baseY + H * 0.54, -L * 0.503);
                root.add(tlFrame);

                // Red brake/tail section
                const tlRed = new THREE.Mesh(new THREE.BoxGeometry(W * 0.14, 0.10, 0.04), mats.taillightRed);
                tlRed.position.set(side * (W * 0.33 - 0.04), baseY + H * 0.54, -L * 0.508);
                root.add(tlRed);

                // Amber turn signal
                const tlAmber = new THREE.Mesh(new THREE.BoxGeometry(W * 0.08, 0.10, 0.04), mats.amberIndicator);
                tlAmber.position.set(side * (W * 0.33 + 0.06), baseY + H * 0.54, -L * 0.508);
                root.add(tlAmber);
            });

            // Chrome straight exhaust pipe
            const exGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.18, 14);
            exGeo.rotateX(Math.PI / 2);
            const ex = new THREE.Mesh(exGeo, mats.chrome);
            ex.position.set(-W * 0.35, baseY + 0.06, -L * 0.525);
            root.add(ex);

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.08, baseY + H + 0.06, 0.80, 'chrome'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.85));

            const fp = createLicensePlate(THREE, 'Г 024 АЗ | 52 RUS', true);
            fp.position.set(0, baseY + 0.14, L * 0.58);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'Г 024 АЗ | 52 RUS', false);
            rp.position.set(0, baseY + H * 0.38, -L * 0.52);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.34, wheelTrack: W * 0.49, wheelR: 0.34, defaultWheels: 'volga_caps' };
        }

        // -------------------------------------------------------------
        // 7. Lada Priora БПАН (ВАЗ-2170: Teardrop lights, horizontal slat Lada grille, slammed stance, 100% bunker tint)
        // -------------------------------------------------------------
        if (carId === 'priora') {
            const L = 4.25, W = 1.68, H = 0.52;
            const cL = 2.05, cW = 1.44, cH = 0.48;
            const baseY = 0.28; // Slammed BPAN stance

            // 1. Aerodynamic curved main body
            const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Front hood gentle slope piece
            const hoodSlopeGeo = new THREE.BoxGeometry(W * 0.94, 0.04, L * 0.32);
            hoodSlopeGeo.rotateX(Math.PI / 28);
            const hoodSlope = new THREE.Mesh(hoodSlopeGeo, mats.paint);
            hoodSlope.position.set(0, baseY + H + 0.01, L * 0.32);
            root.add(hoodSlope);

            // Side protective moldings (body-colored / black trim)
            [-1, 1].forEach(side => {
                const mold = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, L * 0.86), mats.paint);
                mold.position.set(side * (W * 0.505), baseY + H * 0.45, 0);
                root.add(mold);

                // Door handles
                [0.18, -0.38].forEach(dz => {
                    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.02, 0.10), mats.paint);
                    handle.position.set(side * (W * 0.508), baseY + H * 0.58, dz);
                    root.add(handle);
                });

                // Wheel arch lip curves
                [L * 0.33, -L * 0.33].forEach(wz => {
                    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.014, 6, 16, Math.PI), mats.paint);
                    arch.rotateY(Math.PI / 2);
                    arch.position.set(side * (W * 0.502), baseY + 0.10, wz);
                    root.add(arch);
                });
            });

            // 2. Aerodynamic rounded cabin
            const cabin = new THREE.Mesh(new THREE.BoxGeometry(cW, cH, cL), mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.06);
            root.add(cabin);

            // Sloped Windshield (Priora aerodynamic rake)
            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.86, 0.05);
            wsGeo.rotateX(-Math.PI / 6.4);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.06 + cL * 0.508);
            root.add(ws);

            // Rear window
            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.82, 0.05);
            rgGeo.rotateX(Math.PI / 5.8);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.06 - cL * 0.508);
            root.add(rg);

            // 100% "Bunker" tinted side glass
            [-1, 1].forEach(side => {
                const sg = new THREE.Mesh(new THREE.BoxGeometry(0.03, cH * 0.74, cL * 0.86), mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.06);
                root.add(sg);
            });

            // 3. Authentic Priora Front Fascia
            // Upper Grille: horizontal black grille with center chrome accent bar
            const grilleBack = new THREE.Mesh(new THREE.BoxGeometry(W * 0.42, 0.09, 0.06), mats.darkPlastic);
            grilleBack.position.set(0, baseY + H * 0.62, L * 0.504);
            root.add(grilleBack);

            const chromeBar = new THREE.Mesh(new THREE.BoxGeometry(W * 0.44, 0.022, 0.075), mats.chrome);
            chromeBar.position.set(0, baseY + H * 0.66, L * 0.506);
            root.add(chromeBar);

            // Lada Oval Badge & Chrome Boat («Ладья»)
            const ladaOval = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 16), mats.chrome);
            ladaOval.rotateX(Math.PI / 2);
            ladaOval.position.set(0, baseY + H * 0.66, L * 0.548);
            root.add(ladaOval);

            const ladaBoat = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.005, 0.06, 3), mats.chrome);
            ladaBoat.position.set(0, baseY + H * 0.66, L * 0.552);
            root.add(ladaBoat);

            // Teardrop Priora Headlights with projector lenses
            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.22, H * 0.34, 0.14);
                hlGeo.rotateY(side * Math.PI / 24);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.36, baseY + H * 0.58, L * 0.47);
                root.add(hl);

                // Projector bulb
                const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), mats.chrome);
                bulb.position.set(side * W * 0.34, baseY + H * 0.58, L * 0.52);
                root.add(bulb);

                // Outer corner amber turn signal
                const ind = new THREE.Mesh(new THREE.BoxGeometry(0.045, H * 0.28, 0.08), mats.amberIndicator);
                ind.position.set(side * (W * 0.46), baseY + H * 0.58, L * 0.46);
                root.add(ind);

                // Circular projector fog lamps in bumper
                const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.04, 14), mats.headlightLED);
                fog.rotateX(Math.PI / 2);
                fog.position.set(side * W * 0.32, baseY + 0.10, L * 0.505);
                root.add(fog);
            });

            // Lower wide bumper air intake
            const lowerIntake = new THREE.Mesh(new THREE.BoxGeometry(W * 0.48, 0.08, 0.05), mats.darkPlastic);
            lowerIntake.position.set(0, baseY + 0.10, L * 0.504);
            root.add(lowerIntake);

            // 4. Priora Vertical-Curved Taillights
            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.16, H * 0.44, 0.08);
                const tlRed = new THREE.Mesh(tlGeo, mats.taillightRed);
                tlRed.position.set(side * W * 0.38, baseY + H * 0.56, -L * 0.495);
                root.add(tlRed);

                // Reverse light section
                const rev = new THREE.Mesh(new THREE.BoxGeometry(W * 0.14, 0.08, 0.085), mats.reverseWhite);
                rev.position.set(side * W * 0.38, baseY + H * 0.50, -L * 0.495);
                root.add(rev);
            });

            // Chrome trunk garnish strip above license plate
            const trunkChrome = new THREE.Mesh(new THREE.BoxGeometry(W * 0.55, 0.025, 0.03), mats.chrome);
            trunkChrome.position.set(0, baseY + H * 0.48, -L * 0.504);
            root.add(trunkChrome);

            // Stainless steel sport angled exhaust tip
            const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.16, 14), mats.chrome);
            ex.rotateX(Math.PI / 2);
            ex.position.set(-W * 0.32, baseY + 0.06, -L * 0.515);
            root.add(ex);

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.08, baseY + H + 0.06, 0.70, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.74));

            // Russian BPAN License Plate (05 RUS - Dagestan)
            const fp = createLicensePlate(THREE, 'Е 777 КХ | 05 RUS', true);
            fp.position.set(0, baseY + 0.12, L * 0.512);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'Е 777 КХ | 05 RUS', false);
            rp.position.set(0, baseY + H * 0.34, -L * 0.506);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.33, wheelTrack: W * 0.49, wheelR: 0.32, defaultWheels: 'torus' };
        }

        // -------------------------------------------------------------
        // 8. Lada Vesta Sport (Signature X-Face chrome boomerangs, X-side stampings, sport aero, dual trapezoidal exhausts)
        // -------------------------------------------------------------
        if (carId === 'vesta') {
            const L = 4.42, W = 1.77, H = 0.52;
            const cL = 2.08, cW = 1.48, cH = 0.48;
            const baseY = 0.30;

            // 1. Sculpted Main Body
            const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Signature Vesta "X" side swage stampings on front & rear doors
            [-1, 1].forEach(side => {
                // Front diagonal swage line
                const xFwdGeo = new THREE.BoxGeometry(0.015, 0.025, 0.85);
                xFwdGeo.rotateX(Math.PI / 16);
                const xFwd = new THREE.Mesh(xFwdGeo, mats.trim);
                xFwd.position.set(side * (W * 0.504), baseY + H * 0.52, 0.25);
                root.add(xFwd);

                // Rear diagonal swage line
                const xAftGeo = new THREE.BoxGeometry(0.015, 0.025, 0.85);
                xAftGeo.rotateX(-Math.PI / 16);
                const xAft = new THREE.Mesh(xAftGeo, mats.trim);
                xAft.position.set(side * (W * 0.504), baseY + H * 0.52, -0.25);
                root.add(xAft);

                // Sport Aerodynamic Side Skirts
                const sillGeo = new THREE.BoxGeometry(0.03, 0.05, L * 0.65);
                const sill = new THREE.Mesh(sillGeo, mats.darkPlastic);
                sill.position.set(side * (W * 0.51), baseY + 0.04, 0);
                root.add(sill);

                // Sport red pinstripe on side skirts
                const redPinstripe = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.012, L * 0.65), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
                redPinstripe.position.set(side * (W * 0.512), baseY + 0.05, 0);
                root.add(redPinstripe);
            });

            // 2. Modern Greenhouse Cabin
            const cabin = new THREE.Mesh(new THREE.BoxGeometry(cW, cH, cL), mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.08);
            root.add(cabin);

            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.86, 0.05);
            wsGeo.rotateX(-Math.PI / 6.0);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.08 + cL * 0.505);
            root.add(ws);

            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.82, 0.05);
            rgGeo.rotateX(Math.PI / 5.6);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.08 - cL * 0.505);
            root.add(rg);

            [-1, 1].forEach(side => {
                const sg = new THREE.Mesh(new THREE.BoxGeometry(0.03, cH * 0.72, cL * 0.86), mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.08);
                root.add(sg);
            });

            // 3. SIGNATURE LADA X-FACE CHROME BOOMERANGS (The iconic Steve Mattin design)
            [-1, 1].forEach(side => {
                const xTopGeo = new THREE.BoxGeometry(0.038, 0.24, 0.05);
                xTopGeo.rotateZ(side * Math.PI / 4.6);
                const xTop = new THREE.Mesh(xTopGeo, mats.chrome);
                xTop.position.set(side * W * 0.28, baseY + H * 0.64, L * 0.508);
                root.add(xTop);

                const xBotGeo = new THREE.BoxGeometry(0.038, 0.24, 0.05);
                xBotGeo.rotateZ(-side * Math.PI / 4.6);
                const xBot = new THREE.Mesh(xBotGeo, mats.chrome);
                xBot.position.set(side * W * 0.28, baseY + H * 0.26, L * 0.508);
                root.add(xBot);
            });

            // Gloss Black Honeycomb Grille & Center Lada Badge
            const grille = new THREE.Mesh(new THREE.BoxGeometry(W * 0.42, H * 0.42, 0.06), mats.darkPlastic);
            grille.position.set(0, baseY + H * 0.48, L * 0.504);
            root.add(grille);

            // Lada Boat Badge («Ладья») in chrome
            const vestaBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), mats.chrome);
            vestaBadge.rotateX(Math.PI / 2);
            vestaBadge.position.set(0, baseY + H * 0.62, L * 0.548);
            root.add(vestaBadge);

            const vestaBoat = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.006, 0.065, 3), mats.chrome);
            vestaBoat.position.set(0, baseY + H * 0.62, L * 0.552);
            root.add(vestaBoat);

            // Red "Sport" Accent Front Splitter Lip
            const redSplitter = new THREE.Mesh(new THREE.BoxGeometry(W * 0.88, 0.032, 0.14), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.25 }));
            redSplitter.position.set(0, baseY + 0.03, L * 0.508);
            root.add(redSplitter);

            // Sleek Angular LED Headlights
            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.22, H * 0.28, 0.16);
                hlGeo.rotateY(side * Math.PI / 20);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.37, baseY + H * 0.62, L * 0.46);
                root.add(hl);
            });

            // 4. Rear Sport Aerodynamics & Dual Trapezoidal Exhausts
            // Integrated Trunk Ducktail Sport Spoiler Lip
            const spoilerLipGeo = new THREE.BoxGeometry(W * 0.78, 0.04, 0.18);
            spoilerLipGeo.rotateX(Math.PI / 12);
            const spoilerLip = new THREE.Mesh(spoilerLipGeo, mats.paint);
            spoilerLip.position.set(0, baseY + H * 0.98, -L * 0.46);
            root.add(spoilerLip);

            // Modern 2-piece taillights
            [-1, 1].forEach(side => {
                const tl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.25, H * 0.26, 0.08), mats.taillightRed);
                tl.position.set(side * W * 0.36, baseY + H * 0.58, -L * 0.502);
                root.add(tl);
            });

            // Black Sport Diffuser
            const diffuser = new THREE.Mesh(new THREE.BoxGeometry(W * 0.85, 0.10, 0.08), mats.darkPlastic);
            diffuser.position.set(0, baseY + 0.06, -L * 0.505);
            root.add(diffuser);

            // Dual Chrome Trapezoidal Exhaust Tips
            [-1, 1].forEach(side => {
                const exGeo = new THREE.BoxGeometry(0.12, 0.05, 0.12);
                const ex = new THREE.Mesh(exGeo, mats.chrome);
                ex.position.set(side * W * 0.30, baseY + 0.07, -L * 0.508);
                root.add(ex);
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.10, baseY + H + 0.06, 0.72, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.75));

            // Russian License Plate (163 RUS - Samara / Tolyatti AvtoVAZ)
            const fp = createLicensePlate(THREE, 'В 777 ЕВ | 163 RUS', true);
            fp.position.set(0, baseY + 0.14, L * 0.512);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'В 777 ЕВ | 163 RUS', false);
            rp.position.set(0, baseY + H * 0.36, -L * 0.506);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.33, wheelTrack: W * 0.49, wheelR: 0.33, defaultWheels: 'forged' };
        }

        // -------------------------------------------------------------
        // 9. Toyota Land Cruiser 300 (Massive horizontal chrome multi-bar grille, matrix LED, SUV stance)
        // -------------------------------------------------------------
        if (carId === 'lc300') {
            const L = 4.60, W = 1.96, H = 0.94;
            const cL = 2.60, cW = 1.78, cH = 0.78;
            const baseY = 0.48;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Imposing SUV Cabin
            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.16);
            root.add(cabin);

            // Windshield
            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.82, 0.05);
            wsGeo.rotateX(-Math.PI / 7.2);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.16 + cL * 0.505);
            root.add(ws);

            // Rear window
            const rgGeo = new THREE.BoxGeometry(cW * 0.88, cH * 0.78, 0.05);
            rgGeo.rotateX(Math.PI / 10);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.16 - cL * 0.505);
            root.add(rg);

            // Side privacy glass
            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.04, cH * 0.72, cL * 0.88);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.16);
                root.add(sg);

                // Chrome side running boards
                const boardGeo = new THREE.BoxGeometry(0.16, 0.04, L * 0.55);
                const board = new THREE.Mesh(boardGeo, mats.chrome);
                board.position.set(side * (W * 0.52), baseY + 0.02, -0.10);
                root.add(board);

                // Chrome roof rails
                const railGeo = new THREE.BoxGeometry(0.03, 0.04, cL * 0.82);
                const rail = new THREE.Mesh(railGeo, mats.chrome);
                rail.position.set(side * (cW * 0.46), baseY + H + cH + 0.02, -0.16);
                root.add(rail);
            });

            // Monumental LC300 Chrome Grille (4 thick horizontal chrome bars)
            const grilleGeo = new THREE.BoxGeometry(W * 0.60, H * 0.52, 0.08);
            const grille = new THREE.Mesh(grilleGeo, mats.darkPlastic);
            grille.position.set(0, baseY + H * 0.54, L * 0.505);
            root.add(grille);

            for (let i = -1.5; i <= 1.5; i += 1.0) {
                const barGeo = new THREE.BoxGeometry(W * 0.58, 0.035, 0.02);
                const bar = new THREE.Mesh(barGeo, mats.chrome);
                bar.position.set(0, baseY + H * 0.54 + i * 0.08, L * 0.548);
                root.add(bar);
            }

            // Triple-Beam Matrix LED Headlights with L-shaped DRLs
            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.18, H * 0.32, 0.14);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.38, baseY + H * 0.56, L * 0.48);
                root.add(hl);
            });

            // Modern rear taillights with full-width bar
            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.24, 0.12, 0.06);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.36, baseY + H * 0.58, -L * 0.505);
                root.add(tl);
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.16, baseY + H + 0.10, 0.88, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.92));

            const fp = createLicensePlate(THREE, 'С 300 ТТ | 777 RUS', true);
            fp.position.set(0, baseY + 0.18, L * 0.52);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'С 300 ТТ | 777 RUS', false);
            rp.position.set(0, baseY + 0.24, -L * 0.51);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.34, wheelTrack: W * 0.49, wheelR: 0.38 };
        }

        // -------------------------------------------------------------
        // 11. Hyundai Solaris (Hexagonal cascading chrome grille, swept hawk-eye lamps, compact sedan)
        // -------------------------------------------------------------
        if (carId === 'solaris') {
            const L = 4.18, W = 1.72, H = 0.52;
            const cL = 1.95, cW = 1.44, cH = 0.48;
            const baseY = 0.30;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.08);
            root.add(cabin);

            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.85, 0.05);
            wsGeo.rotateX(-Math.PI / 6.5);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.08 + cL * 0.505);
            root.add(ws);

            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.82, 0.05);
            rgGeo.rotateX(Math.PI / 6.0);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.08 - cL * 0.505);
            root.add(rg);

            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.72, cL * 0.86);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.08);
                root.add(sg);
            });

            // Cascading Hexagonal Grille with horizontal chrome bars
            const grilleGeo = new THREE.BoxGeometry(W * 0.48, H * 0.46, 0.06);
            const grille = new THREE.Mesh(grilleGeo, mats.darkPlastic);
            grille.position.set(0, baseY + H * 0.48, L * 0.504);
            root.add(grille);

            for (let i = -1.5; i <= 1.5; i += 1.0) {
                const barGeo = new THREE.BoxGeometry(W * 0.44, 0.02, 0.02);
                const bar = new THREE.Mesh(barGeo, mats.chrome);
                bar.position.set(0, baseY + H * 0.48 + i * 0.06, L * 0.536);
                root.add(bar);
            }

            // Swept-back Hawk-Eye Headlights with LED eyebrow
            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.20, H * 0.28, 0.16);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.36, baseY + H * 0.58, L * 0.46);
                root.add(hl);

                const fogGeo = new THREE.BoxGeometry(W * 0.12, 0.08, 0.04);
                const fog = new THREE.Mesh(fogGeo, mats.darkPlastic);
                fog.position.set(side * W * 0.36, baseY + 0.12, L * 0.502);
                root.add(fog);
            });

            // Modern split wrap-around taillights
            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.24, H * 0.24, 0.08);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.34, baseY + H * 0.54, -L * 0.502);
                root.add(tl);
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.08, baseY + H + 0.06, 0.68, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.72));

            const fp = createLicensePlate(THREE, 'Х 555 ХХ | 777 RUS', true);
            fp.position.set(0, baseY + 0.14, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'Х 555 ХХ | 777 RUS', false);
            rp.position.set(0, baseY + H * 0.36, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.33, wheelTrack: W * 0.49, wheelR: 0.32 };
        }

        // -------------------------------------------------------------
        // 12. Volkswagen Polo (Clean German straight-line grille, crisp tornado crease, compact sedan)
        // -------------------------------------------------------------
        if (carId === 'polo') {
            const L = 4.22, W = 1.70, H = 0.52;
            const cL = 1.95, cW = 1.44, cH = 0.48;
            const baseY = 0.30;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Crisp tornado waistline crease
            [-1, 1].forEach(side => {
                const lineGeo = new THREE.BoxGeometry(0.012, 0.015, L * 0.94);
                const line = new THREE.Mesh(lineGeo, mats.trim);
                line.position.set(side * (W * 0.504), baseY + H * 0.58, 0);
                root.add(line);
            });

            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.08);
            root.add(cabin);

            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.84, 0.05);
            wsGeo.rotateX(-Math.PI / 6.8);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.08 + cL * 0.505);
            root.add(ws);

            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.80, 0.05);
            rgGeo.rotateX(Math.PI / 6.4);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.08 - cL * 0.505);
            root.add(rg);

            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.72, cL * 0.86);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.08);
                root.add(sg);
            });

            // Clean German 2-Bar Chrome Grille connecting directly into headlights
            const grilleGeo = new THREE.BoxGeometry(W * 0.46, 0.09, 0.05);
            const grille = new THREE.Mesh(grilleGeo, mats.darkPlastic);
            grille.position.set(0, baseY + H * 0.60, L * 0.504);
            root.add(grille);

            [-0.025, 0.025].forEach(yOff => {
                const barGeo = new THREE.BoxGeometry(W * 0.46, 0.015, 0.02);
                const bar = new THREE.Mesh(barGeo, mats.chrome);
                bar.position.set(0, baseY + H * 0.60 + yOff, L * 0.53);
                root.add(bar);
            });

            const vwGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16);
            vwGeo.rotateX(Math.PI / 2);
            const vw = new THREE.Mesh(vwGeo, mats.chrome);
            vw.position.set(0, baseY + H * 0.60, L * 0.535);
            root.add(vw);

            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.18, 0.10, 0.12);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.35, baseY + H * 0.60, L * 0.48);
                root.add(hl);
            });

            const lowIntakeGeo = new THREE.BoxGeometry(W * 0.65, 0.08, 0.05);
            const lowIntake = new THREE.Mesh(lowIntakeGeo, mats.darkPlastic);
            lowIntake.position.set(0, baseY + 0.12, L * 0.504);
            root.add(lowIntake);

            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.20, 0.14, 0.06);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.34, baseY + H * 0.56, -L * 0.502);
                root.add(tl);
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.08, baseY + H + 0.06, 0.68, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.72));

            const fp = createLicensePlate(THREE, 'Р 777 РР | 197 RUS', true);
            fp.position.set(0, baseY + 0.14, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'Р 777 РР | 197 RUS', false);
            rp.position.set(0, baseY + H * 0.36, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.33, wheelTrack: W * 0.49, wheelR: 0.32 };
        }

        // -------------------------------------------------------------
        // 13. Toyota Mark II Tourer V (JZX100 / JZX90 4-Door JDM Drift Legend, FMIC, full-width taillight bar, cannon exhaust)
        // -------------------------------------------------------------
        if (carId === 'mark2') {
            const L = 4.45, W = 1.76, H = 0.50;
            const cL = 2.05, cW = 1.45, cH = 0.46;
            const baseY = 0.29;

            // 1. Sleek 4-door JDM hardtop drift body
            const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Front JDM aero bumper with FMIC (Front Mount Intercooler)
            const fmicGeo = new THREE.BoxGeometry(W * 0.46, 0.10, 0.04);
            const fmic = new THREE.Mesh(fmicGeo, mats.chrome);
            fmic.position.set(0, baseY + 0.10, L * 0.505);
            root.add(fmic);

            const fmicGrille = new THREE.Mesh(new THREE.BoxGeometry(W * 0.50, 0.12, 0.03), mats.darkPlastic);
            fmicGrille.position.set(0, baseY + 0.10, L * 0.502);
            root.add(fmicGrille);

            // Front aerodynamic drift lip spoiler
            const frontLip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, 0.03, 0.14), mats.darkPlastic);
            frontLip.position.set(0, baseY + 0.03, L * 0.49);
            root.add(frontLip);

            // 4-door JDM hardtop greenhouse cabin
            const cabin = new THREE.Mesh(new THREE.BoxGeometry(cW, cH, cL), mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.06);
            root.add(cabin);

            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.85, 0.05);
            wsGeo.rotateX(-Math.PI / 7.2);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.06 + cL * 0.505);
            root.add(ws);

            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.82, 0.05);
            rgGeo.rotateX(Math.PI / 6.8);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.06 - cL * 0.505);
            root.add(rg);

            [-1, 1].forEach(side => {
                const sg = new THREE.Mesh(new THREE.BoxGeometry(0.03, cH * 0.72, cL * 0.86), mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.06);
                root.add(sg);

                // 4 door handles
                [0.20, -0.36].forEach(dz => {
                    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.02, 0.09), mats.paint);
                    handle.position.set(side * (W * 0.508), baseY + H * 0.56, dz);
                    root.add(handle);
                });
            });

            // Mark II JDM Long Horizontal Glass Headlights + amber corner markers
            [-1, 1].forEach(side => {
                const hl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.22, 0.11, 0.12), mats.headlightLED);
                hl.position.set(side * W * 0.33, baseY + H * 0.60, L * 0.48);
                root.add(hl);

                const ind = new THREE.Mesh(new THREE.BoxGeometry(W * 0.06, 0.11, 0.06), mats.amberIndicator);
                ind.position.set(side * W * 0.455, baseY + H * 0.60, L * 0.46);
                root.add(ind);
            });

            // Black radiator grille with golden Mark II crest emblem
            const grille = new THREE.Mesh(new THREE.BoxGeometry(W * 0.36, 0.08, 0.06), mats.darkPlastic);
            grille.position.set(0, baseY + H * 0.60, L * 0.504);
            root.add(grille);

            const crestMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 }); // Gold crest
            const crest = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.02), crestMat);
            crest.position.set(0, baseY + H * 0.60, L * 0.536);
            root.add(crest);

            // MONOLITHIC FULL-WIDTH CONTINUOUS REAR TAILLIGHT BAR OF MARK II TOURER V
            const bar = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.12, 0.06), mats.taillightRed);
            bar.position.set(0, baseY + H * 0.58, -L * 0.503);
            root.add(bar);

            const centerRev = new THREE.Mesh(new THREE.BoxGeometry(W * 0.24, 0.08, 0.065), mats.reverseWhite);
            centerRev.position.set(0, baseY + H * 0.58, -L * 0.504);
            root.add(centerRev);

            // Boot ducktail drift spoiler
            const ducktail = new THREE.Mesh(new THREE.BoxGeometry(W * 0.80, 0.035, 0.14), mats.paint);
            ducktail.position.set(0, baseY + H * 0.98, -L * 0.46);
            root.add(ducktail);

            // Massive angled large-bore HKS Hi-Power stainless steel cannon exhaust ("банка")
            const exGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.20, 16);
            exGeo.rotateX(Math.PI / 2 + 0.12);
            exGeo.rotateY(-Math.PI / 14);
            const ex = new THREE.Mesh(exGeo, mats.chrome);
            ex.position.set(-W * 0.32, baseY + 0.08, -L * 0.52);
            root.add(ex);

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.06, baseY + H + 0.06, 0.70, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.75));

            // Vladivostok JDM Plate (125 RUS)
            const fp = createLicensePlate(THREE, 'М 100 ММ | 125 RUS', true);
            fp.position.set(0, baseY + 0.14, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'М 100 ММ | 125 RUS', false);
            rp.position.set(0, baseY + H * 0.38, -L * 0.506);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.34, wheelTrack: W * 0.49, wheelR: 0.33, defaultWheels: 'deepdish' };
        }

        // -------------------------------------------------------------
        // 14. Nissan Silvia S15 Spec-R (Pure JDM 2-door drift coupe, feline cat-eye projector headlamps)
        // -------------------------------------------------------------
        if (carId === 'silvia') {
            const L = 4.25, W = 1.73, H = 0.48;
            const cL = 1.70, cW = 1.42, cH = 0.44;
            const baseY = 0.28;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.12);
            root.add(cabin);

            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.88, 0.05);
            wsGeo.rotateX(-Math.PI / 5.2);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.12 + cL * 0.505);
            root.add(ws);

            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.84, 0.05);
            rgGeo.rotateX(Math.PI / 4.8);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.12 - cL * 0.505);
            root.add(rg);

            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.70, cL * 0.82);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.12);
                root.add(sg);
            });

            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.20, 0.09, 0.16);
                hlGeo.rotateY(side * Math.PI / 16);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.35, baseY + H * 0.62, L * 0.46);
                root.add(hl);
            });

            const intGeo = new THREE.BoxGeometry(W * 0.54, 0.14, 0.08);
            const intk = new THREE.Mesh(intGeo, mats.darkPlastic);
            intk.position.set(0, baseY + 0.10, L * 0.504);
            root.add(intk);

            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.22, 0.12, 0.08);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.34, baseY + H * 0.58, -L * 0.502);
                root.add(tl);
            });

            const wingGeo = new THREE.BoxGeometry(W * 0.88, 0.03, 0.24);
            const wing = new THREE.Mesh(wingGeo, mats.paint);
            wing.position.set(0, baseY + H + 0.22, -L * 0.44);
            root.add(wing);

            [-1, 1].forEach(side => {
                const strutGeo = new THREE.BoxGeometry(0.03, 0.22, 0.10);
                const strut = new THREE.Mesh(strutGeo, mats.paint);
                strut.position.set(side * (W * 0.36), baseY + H + 0.11, -L * 0.44);
                root.add(strut);
            });

            const exGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.16, 16);
            exGeo.rotateX(Math.PI / 2);
            const ex = new THREE.Mesh(exGeo, mats.chrome);
            ex.position.set(-W * 0.34, baseY + 0.07, -L * 0.515);
            root.add(ex);

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.12, baseY + H + 0.04, 0.65, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.70));

            const fp = createLicensePlate(THREE, 'С 015 СС | 125 RUS', true);
            fp.position.set(0, baseY + 0.12, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'С 015 СС | 125 RUS', false);
            rp.position.set(0, baseY + H * 0.36, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.32, wheelTrack: W * 0.49, wheelR: 0.32 };
        }

        // -------------------------------------------------------------
        // 15. Toyota Camry 3.5 XV70 (Massive wide front bumper grille, triple-slash LED headlights)
        // -------------------------------------------------------------
        if (carId === 'camry') {
            // Bespoke XV70 silhouette. Never substitute the unrelated Chery Arrizo 8 GLB.
            const L = 4.885, W = 1.84, axle = 1.412, R = .337;
            root.name = 'Camry_XV70_Body';
            root.userData.modelIdentity = 'Toyota Camry XV70';
            function mesh(name, vertices, indices, material) {
                const g = new THREE.BufferGeometry();
                g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                for(let i=0;i<indices.length;i+=3){const b=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=b;}
                g.setIndex(indices); g.computeVertexNormals();
                const n = new THREE.Mesh(g, material); n.name = name; root.add(n); return n;
            }
            function panel(name, points, material) {
                return mesh(name, points.flat(), [0, 1, 2, 0, 2, 3], material);
            }
            function box(name, x, y, z, sx, sy, sz, material) {
                const n = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
                n.name = name; n.position.set(x, y, z); root.add(n); return n;
            }
            // Longitudinal sections include real wheel openings, rounded shoulders and tapered bumpers.
            const v = [], idx = [], count = 100, ring = 8;
            for (let j = 0; j <= count; j++) {
                const z = -L / 2 + L * j / count, end = Math.abs(z) / (L / 2);
                const half = W / 2 * (1 - .13 * Math.pow(end, 8));
                const top = .93 - .17 * Math.pow(end, 5) + .015 * z;
                const dz = Math.min(Math.abs(z - axle), Math.abs(z + axle));
                const opening = dz < .385 ? R + Math.sqrt(.385 * .385 - dz * dz) : .29;
                const side = Math.max(.30, opening);
                for (const [x, y] of [[-half, side], [-half, .73], [-half * .89, top], [half * .89, top], [half, .73], [half, side], [half * .72, .27], [-half * .72, .27]]) v.push(x, y, z);
            }
            for (let j = 0; j < count; j++) for (let k = 0; k < ring; k++) {
                const a = j * ring + k, b = j * ring + (k + 1) % ring;
                idx.push(a, b, a + ring, b, b + ring, a + ring);
            }
            for (let k = 1; k < ring - 1; k++) idx.push(0, k + 1, k, count * ring, count * ring + k, count * ring + k + 1);
            mesh('Camry_Painted_Body', v, idx, mats.paint);
            // Sloping windscreen/C pillars and a gently crowned roof, rather than a box cabin.
            const rr = [[-1.66, .83, .915], [-.87, .715, 1.43], [.38, .705, 1.45], [1.01, .81, .935]], cv = [], ci = [];
            for (const [z, hw, y] of rr) for (const [x, yy] of [[-hw, .88], [-hw, y - .045], [-hw * .82, y], [hw * .82, y], [hw, y - .045], [hw, .88]]) cv.push(x, yy, z);
            for (let j = 0; j < 3; j++) for (let k = 0; k < 5; k++) {const n = j * 6 + k; ci.push(n, n + 1, n + 6, n + 1, n + 7, n + 6);}
            mesh('Camry_Roof_Pillars', cv, ci, mats.paint);
            panel('Camry_Windshield', [[-.64, 1.398, .40], [.64, 1.398, .40], [.752, .944, .982], [-.752, .944, .982]], mats.glass);
            panel('Camry_Rear_Window', [[.65, 1.374, -.91], [-.65, 1.374, -.91], [-.76, .943, -1.60], [.76, .943, -1.60]], mats.glass);
            for (const side of [-1, 1]) {
                const p = points => side === 1 ? points : points.slice().reverse();
                panel('Camry_Front_Side_Window_' + side, p([[side * .811, .963, .91], [side * .711, 1.378, .36], [side * .716, 1.368, -.23], [side * .835, .956, -.23]]), mats.glass);
                panel('Camry_Rear_Side_Window_' + side, p([[side * .836, .956, -.31], [side * .717, 1.367, -.31], [side * .724, 1.348, -.84], [side * .815, .958, -1.46]]), mats.glass);
                box('Camry_B_Pillar_' + side, side * .79, 1.16, -.27, .045, .42, .065, mats.trim);
                for (const z of [.04, -1.02]) box('Camry_Door_Handle_' + side, side * .923, .792, z, .025, .025, .145, mats.chrome);
                box('Camry_Sill_' + side, side * .88, .315, 0, .095, .06, 2.05, mats.paint);
                // XV70 narrow lamps and angular DRL, no Arrizo grille or full-width rear light bar.
                const lamp = box('Camry_LED_Headlight_' + side, side * .666, .778, 2.405, .40, .095, .18, mats.headlightLED);
                lamp.rotation.y = side * .16;
                box('Camry_Rear_Lamp_' + side, side * .67, .782, -2.425, .41, .105, .10, mats.taillightRed);
                box('Camry_Rear_Lamp_Inner_' + side, side * .38, .803, -2.455, .20, .035, .02, mats.taillightRed);
                const ex = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .18, 12), mats.chrome);
                ex.rotation.x = Math.PI / 2; ex.position.set(side * .64, .34, -2.47); ex.name = 'Camry_Exhaust_' + side; root.add(ex);
            }
            // Trapezoidal broad lower grille and the chrome V above it distinguish the XV70 nose.
            panel('Camry_Lower_Grille', [[-.56, .655, 2.458], [.56, .655, 2.458], [.70, .32, 2.458], [-.70, .32, 2.458]], mats.darkPlastic);
            for (let j = 0; j < 7; j++) {const y = .35 + j * .042, width = 1.36 - j * .04; box('Camry_Grille_Fin_' + j, 0, y, 2.470, width, .013, .016, mats.trim);}
            for (const side of [-1, 1]) {const bar = box('Camry_Chrome_V_' + side, side * .32, .738, 2.475, .68, .022, .035, mats.chrome); bar.rotation.z = side * .12;}
            const badge = new THREE.Mesh(new THREE.TorusGeometry(.053, .009, 6, 24), mats.chrome);
            badge.name = 'Camry_Oval_Emblem'; badge.scale.y = .64; badge.position.set(0, .74, 2.491); root.add(badge);
            root.add(createCockpitInterior(THREE, mats, 1.48, 2.15, .45, .38));
            root.add(createSideMirrors(THREE, mats, 1.63, -.12, 1.02, .73, 'paint'));
            root.add(createWipers(THREE, mats, 1.48, .97, .82));
            for (const front of [true, false]) {const plate = createLicensePlate(THREE, 'К 070 КК | 777 RUS', front);plate.position.set(0, front ? .49 : .60, front ? 2.490 : -2.465);root.add(plate);}
            return { root, bodyLength: L, bodyWidth: W, wheelBase: axle, wheelTrack: .79, wheelR: R, defaultWheels: 'stock' };
        }

        // -------------------------------------------------------------
        // 16. BMW M5 E60 V10 (Bangle eagle-eye lamps with orange LED eyebrows, side M-gills, quad exhausts)
        // -------------------------------------------------------------
        if (carId === 'm5e60') {
            const L = 4.35, W = 1.84, H = 0.52;
            const cL = 2.05, cW = 1.48, cH = 0.48;
            const baseY = 0.30;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            [-1, 1].forEach(side => {
                const gillGeo = new THREE.BoxGeometry(0.015, 0.06, 0.14);
                const gill = new THREE.Mesh(gillGeo, mats.chrome);
                gill.position.set(side * (W * 0.505), baseY + H * 0.60, L * 0.22);
                root.add(gill);
            });

            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.08);
            root.add(cabin);

            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.85, 0.05);
            wsGeo.rotateX(-Math.PI / 6.5);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.08 + cL * 0.505);
            root.add(ws);

            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.80, 0.05);
            rgGeo.rotateX(Math.PI / 6.2);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.08 - cL * 0.505);
            root.add(rg);

            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.72, cL * 0.86);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.08);
                root.add(sg);
            });

            // Classic BMW Dual Kidney Grille
            [-0.13, 0.13].forEach(kx => {
                const kGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16);
                kGeo.rotateX(Math.PI / 2);
                const kRing = new THREE.Mesh(kGeo, mats.chrome);
                kRing.position.set(kx, baseY + H * 0.60, L * 0.504);
                root.add(kRing);

                const kMesh = new THREE.CylinderGeometry(0.09, 0.09, 0.07, 16);
                kMesh.rotateX(Math.PI / 2);
                const kIn = new THREE.Mesh(kMesh, mats.darkPlastic);
                kIn.position.set(kx, baseY + H * 0.60, L * 0.505);
                root.add(kIn);
            });

            // Iconic Bangle "Eagle Eye" Headlights with orange eyebrow turn lights
            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.20, 0.10, 0.16);
                hlGeo.rotateY(side * Math.PI / 14);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.36, baseY + H * 0.60, L * 0.46);
                root.add(hl);

                const browGeo = new THREE.BoxGeometry(W * 0.18, 0.025, 0.16);
                browGeo.rotateY(side * Math.PI / 14);
                const brow = new THREE.Mesh(browGeo, mats.amberIndicator);
                brow.position.set(side * W * 0.36, baseY + H * 0.66, L * 0.46);
                root.add(brow);
            });

            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.24, 0.11, 0.06);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.35, baseY + H * 0.58, -L * 0.503);
                root.add(tl);
            });

            // Quad round exhaust tips (V10 M5 signature!)
            [-1, 1].forEach(side => {
                [-0.045, 0.045].forEach(off => {
                    const exGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.12, 14);
                    exGeo.rotateX(Math.PI / 2);
                    const ex = new THREE.Mesh(exGeo, mats.chrome);
                    ex.position.set(side * (W * 0.32) + off, baseY + 0.08, -L * 0.508);
                    root.add(ex);
                });
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.08, baseY + H + 0.06, 0.70, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.75));

            const fp = createLicensePlate(THREE, 'М 060 ММ | 777 RUS', true);
            fp.position.set(0, baseY + 0.14, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'М 060 ММ | 777 RUS', false);
            rp.position.set(0, baseY + H * 0.38, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.34, wheelTrack: W * 0.49, wheelR: 0.33 };
        }

        // -------------------------------------------------------------
        // 17. BMW M5 F90 Competition (Black double-slat kidneys, hexagonal Icon LED halos, carbon roof)
        // -------------------------------------------------------------
        if (carId === 'm5f90') {
            const L = 4.40, W = 1.88, H = 0.51;
            const cL = 2.05, cW = 1.50, cH = 0.48;
            const baseY = 0.30;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.08);
            root.add(cabin);

            // Sculpted Carbon Fiber Roof
            const carbonRoofGeo = new THREE.BoxGeometry(cW * 0.94, 0.02, cL * 0.75);
            const carbonRoof = new THREE.Mesh(carbonRoofGeo, mats.carbon);
            carbonRoof.position.set(0, baseY + H + cH + 0.01, -0.08);
            root.add(carbonRoof);

            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.85, 0.05);
            wsGeo.rotateX(-Math.PI / 6.2);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.08 + cL * 0.505);
            root.add(ws);

            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.80, 0.05);
            rgGeo.rotateX(Math.PI / 6.0);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.08 - cL * 0.505);
            root.add(rg);

            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.72, cL * 0.86);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.08);
                root.add(sg);
            });

            // Modern F90 Angular Double-Slat Gloss Black Kidneys
            [-0.14, 0.14].forEach(kx => {
                const kGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 6);
                kGeo.rotateX(Math.PI / 2);
                const kRing = new THREE.Mesh(kGeo, mats.trim);
                kRing.position.set(kx, baseY + H * 0.60, L * 0.504);
                root.add(kRing);

                const kMesh = new THREE.CylinderGeometry(0.10, 0.10, 0.07, 6);
                kMesh.rotateX(Math.PI / 2);
                const kIn = new THREE.Mesh(kMesh, mats.darkPlastic);
                kIn.position.set(kx, baseY + H * 0.60, L * 0.505);
                root.add(kIn);
            });

            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.20, 0.09, 0.16);
                hlGeo.rotateY(side * Math.PI / 16);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.36, baseY + H * 0.60, L * 0.46);
                root.add(hl);
            });

            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.24, 0.10, 0.06);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.35, baseY + H * 0.58, -L * 0.503);
                root.add(tl);
            });

            // Quad black chrome 90mm sport exhaust tips
            [-1, 1].forEach(side => {
                [-0.048, 0.048].forEach(off => {
                    const exGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.12, 14);
                    exGeo.rotateX(Math.PI / 2);
                    const ex = new THREE.Mesh(exGeo, mats.trim);
                    ex.position.set(side * (W * 0.32) + off, baseY + 0.08, -L * 0.508);
                    root.add(ex);
                });
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.08, baseY + H + 0.06, 0.70, 'carbon'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.75));

            const fp = createLicensePlate(THREE, 'М 090 ММ | 777 RUS', true);
            fp.position.set(0, baseY + 0.14, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'М 090 ММ | 777 RUS', false);
            rp.position.set(0, baseY + H * 0.38, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.34, wheelTrack: W * 0.49, wheelR: 0.34 };
        }

        // -------------------------------------------------------------
        // 18. BMW M8 Gran Coupe (Low-slung 4-door super coupe, ducktail spoiler, wide rear shoulders)
        // -------------------------------------------------------------
        if (carId === 'm8') {
            const L = 4.45, W = 1.92, H = 0.48;
            const cL = 2.00, cW = 1.48, cH = 0.42;
            const baseY = 0.28;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.10);
            root.add(cabin);

            const carbonRoofGeo = new THREE.BoxGeometry(cW * 0.94, 0.02, cL * 0.80);
            const carbonRoof = new THREE.Mesh(carbonRoofGeo, mats.carbon);
            carbonRoof.position.set(0, baseY + H + cH + 0.01, -0.10);
            root.add(carbonRoof);

            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.90, 0.05);
            wsGeo.rotateX(-Math.PI / 5.5);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.10 + cL * 0.505);
            root.add(ws);

            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.88, 0.05);
            rgGeo.rotateX(Math.PI / 5.0);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.10 - cL * 0.505);
            root.add(rg);

            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.70, cL * 0.84);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.10);
                root.add(sg);
            });

            [-0.15, 0.15].forEach(kx => {
                const kGeo = new THREE.BoxGeometry(0.24, 0.12, 0.06);
                const kRing = new THREE.Mesh(kGeo, mats.trim);
                kRing.position.set(kx, baseY + H * 0.56, L * 0.504);
                root.add(kRing);
            });

            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.20, 0.07, 0.16);
                hlGeo.rotateY(side * Math.PI / 18);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.36, baseY + H * 0.58, L * 0.46);
                root.add(hl);
            });

            const duckGeo = new THREE.BoxGeometry(W * 0.75, 0.06, 0.18);
            duckGeo.rotateX(Math.PI / 8);
            const duck = new THREE.Mesh(duckGeo, mats.carbon);
            duck.position.set(0, baseY + H * 0.92, -L * 0.48);
            root.add(duck);

            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.26, 0.07, 0.06);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.35, baseY + H * 0.56, -L * 0.503);
                root.add(tl);
            });

            [-1, 1].forEach(side => {
                [-0.048, 0.048].forEach(off => {
                    const exGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.12, 14);
                    exGeo.rotateX(Math.PI / 2);
                    const ex = new THREE.Mesh(exGeo, mats.trim);
                    ex.position.set(side * (W * 0.32) + off, baseY + 0.08, -L * 0.508);
                    root.add(ex);
                });
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.10, baseY + H + 0.04, 0.68, 'carbon'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.72));

            const fp = createLicensePlate(THREE, 'М 008 ММ | 777 RUS', true);
            fp.position.set(0, baseY + 0.12, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'М 008 ММ | 777 RUS', false);
            rp.position.set(0, baseY + H * 0.36, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.34, wheelTrack: W * 0.49, wheelR: 0.34 };
        }

        // -------------------------------------------------------------
        // 19. Mercedes-Benz E63s AMG (Panamericana grille, MULTIBEAM headlights, quad AMG trapezoid exhausts)
        // -------------------------------------------------------------
        if (carId === 'e63') {
            const L = 4.38, W = 1.86, H = 0.52;
            const cL = 2.05, cW = 1.50, cH = 0.48;
            const baseY = 0.30;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            [-1, 1].forEach(side => {
                const badgeGeo = new THREE.BoxGeometry(0.015, 0.025, 0.08);
                const badge = new THREE.Mesh(badgeGeo, mats.chrome);
                badge.position.set(side * (W * 0.505), baseY + H * 0.60, L * 0.22);
                root.add(badge);
            });

            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.08);
            root.add(cabin);

            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.85, 0.05);
            wsGeo.rotateX(-Math.PI / 6.4);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.08 + cL * 0.505);
            root.add(ws);

            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.82, 0.05);
            rgGeo.rotateX(Math.PI / 6.0);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.08 - cL * 0.505);
            root.add(rg);

            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.72, cL * 0.86);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.08);
                root.add(sg);
            });

            const grilleGeo = new THREE.BoxGeometry(W * 0.48, H * 0.44, 0.08);
            const grille = new THREE.Mesh(grilleGeo, mats.darkPlastic);
            grille.position.set(0, baseY + H * 0.56, L * 0.505);
            root.add(grille);

            for (let i = -5; i <= 5; i++) {
                const slatGeo = new THREE.BoxGeometry(0.016, H * 0.40, 0.02);
                const slat = new THREE.Mesh(slatGeo, mats.chrome);
                slat.position.set(i * (W * 0.042), baseY + H * 0.56, L * 0.545);
                root.add(slat);
            }

            const starGeo = new THREE.TorusGeometry(0.09, 0.018, 8, 20);
            const star = new THREE.Mesh(starGeo, mats.chrome);
            star.position.set(0, baseY + H * 0.56, L * 0.55);
            root.add(star);

            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.20, 0.10, 0.16);
                hlGeo.rotateY(side * Math.PI / 18);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.36, baseY + H * 0.60, L * 0.46);
                root.add(hl);
            });

            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.25, 0.10, 0.06);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.35, baseY + H * 0.56, -L * 0.503);
                root.add(tl);
            });

            [-1, 1].forEach(side => {
                [-0.05, 0.05].forEach(off => {
                    const exGeo = new THREE.BoxGeometry(0.08, 0.045, 0.10);
                    const ex = new THREE.Mesh(exGeo, mats.chrome);
                    ex.position.set(side * (W * 0.32) + off, baseY + 0.08, -L * 0.508);
                    root.add(ex);
                });
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.08, baseY + H + 0.06, 0.70, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.75));

            const fp = createLicensePlate(THREE, 'Е 063 КХ | 777 RUS', true);
            fp.position.set(0, baseY + 0.14, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'Е 063 КХ | 777 RUS', false);
            rp.position.set(0, baseY + H * 0.38, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.34, wheelTrack: W * 0.49, wheelR: 0.33 };
        }

        // -------------------------------------------------------------
        // 20. Audi RS6 Avant (Iconic super-wagon! Long roof, roof rails, blister box arches, dual oval exhausts)
        // -------------------------------------------------------------
        if (carId === 'rs6') {
            const L = 4.45, W = 1.95, H = 0.52;
            const cL = 2.45, cW = 1.54, cH = 0.48;
            const baseY = 0.30;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Extended Station Wagon Cabin
            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.20);
            root.add(cabin);

            // Aluminum roof rails
            [-1, 1].forEach(side => {
                const railGeo = new THREE.BoxGeometry(0.02, 0.03, cL * 0.85);
                const rail = new THREE.Mesh(railGeo, mats.chrome);
                rail.position.set(side * (cW * 0.48), baseY + H + cH + 0.015, -0.20);
                root.add(rail);
            });

            // RS Rear Roof Spoiler
            const spoilerGeo = new THREE.BoxGeometry(cW * 0.94, 0.04, 0.22);
            const rsSpoiler = new THREE.Mesh(spoilerGeo, mats.paint);
            rsSpoiler.position.set(0, baseY + H + cH + 0.02, -0.20 - cL * 0.50 - 0.05);
            root.add(rsSpoiler);

            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.85, 0.05);
            wsGeo.rotateX(-Math.PI / 6.2);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.20 + cL * 0.505);
            root.add(ws);

            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.84, 0.05);
            rgGeo.rotateX(Math.PI / 12);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.20 - cL * 0.505);
            root.add(rg);

            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.72, cL * 0.88);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.20);
                root.add(sg);
            });

            // Singleframe Honeycomb Grille
            const grilleGeo = new THREE.BoxGeometry(W * 0.54, H * 0.52, 0.08);
            const grille = new THREE.Mesh(grilleGeo, mats.trim);
            grille.position.set(0, baseY + H * 0.52, L * 0.505);
            root.add(grille);

            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.20, 0.10, 0.16);
                hlGeo.rotateY(side * Math.PI / 18);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.36, baseY + H * 0.60, L * 0.46);
                root.add(hl);
            });

            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.25, 0.10, 0.06);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.35, baseY + H * 0.56, -L * 0.503);
                root.add(tl);
            });

            // MASSIVE SIGNATURE RS DUAL OVAL EXHAUST CANNONS
            [-1, 1].forEach(side => {
                const exGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.12, 20);
                exGeo.rotateX(Math.PI / 2);
                exGeo.scale(1.4, 1.0, 0.8);
                const ex = new THREE.Mesh(exGeo, mats.chrome);
                ex.position.set(side * (W * 0.32), baseY + 0.08, -L * 0.508);
                root.add(ex);
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.16, baseY + H + 0.06, 0.70, 'chrome'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.75));

            const fp = createLicensePlate(THREE, 'А 006 АА | 777 RUS', true);
            fp.position.set(0, baseY + 0.14, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'А 006 АА | 777 RUS', false);
            rp.position.set(0, baseY + H * 0.38, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.34, wheelTrack: W * 0.50, wheelR: 0.34 };
        }

        // -------------------------------------------------------------
        // 21. Rolls-Royce Cullinan (Towering British Ultra-Luxury SUV, Pantheon waterfall grille, Spirit of Ecstasy, Coach doors)
        // -------------------------------------------------------------
        if (carId === 'cullinan') {
            const L = 5.30, W = 2.05, H = 1.00;
            const cL = 2.85, cW = 1.80, cH = 0.84;
            const baseY = 0.50; // Towering luxury SUV ground clearance

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Stately SUV Cabin (Greenhouse)
            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.15);
            root.add(cabin);

            // Windshield
            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.82, 0.05);
            wsGeo.rotateX(-Math.PI / 8.0);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.15 + cL * 0.505);
            root.add(ws);

            // Rear window
            const rgGeo = new THREE.BoxGeometry(cW * 0.88, cH * 0.78, 0.05);
            rgGeo.rotateX(Math.PI / 12);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.15 - cL * 0.505);
            root.add(rg);

            // Side windows with full bright chrome luxury framing
            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.04, cH * 0.72, cL * 0.88);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.15);
                root.add(sg);

                // Chrome window surround molding
                const frameGeo = new THREE.BoxGeometry(0.045, 0.025, cL * 0.92);
                const topFrame = new THREE.Mesh(frameGeo, mats.chrome);
                topFrame.position.set(side * (cW * 0.508), baseY + H + cH * 0.85, -0.15);
                root.add(topFrame);

                // Chrome Coach Doors (Suicide doors) center meeting touch handles
                const handleGeo = new THREE.BoxGeometry(0.025, 0.035, 0.18);
                const handle = new THREE.Mesh(handleGeo, mats.chrome);
                handle.position.set(side * (W * 0.508), baseY + H * 0.82, -0.15);
                root.add(handle);

                // Lower body chrome sill brightwork
                const sillGeo = new THREE.BoxGeometry(0.025, 0.03, L * 0.72);
                const sill = new THREE.Mesh(sillGeo, mats.chrome);
                sill.position.set(side * (W * 0.506), baseY + 0.12, 0);
                root.add(sill);
            });

            // HAND-POLISHED STAINLESS STEEL PANTHEON WATERFALL GRILLE (24 vertical polished fins)
            const pGeo = new THREE.BoxGeometry(W * 0.56, H * 0.65, 0.08);
            const parthenon = new THREE.Mesh(pGeo, mats.chrome);
            parthenon.position.set(0, baseY + H * 0.58, L * 0.505);
            root.add(parthenon);

            for (let i = -11; i <= 11; i++) {
                const slatGeo = new THREE.BoxGeometry(0.010, H * 0.60, 0.02);
                const slat = new THREE.Mesh(slatGeo, mats.chrome);
                slat.position.set(i * (W * 0.022), baseY + H * 0.58, L * 0.548);
                root.add(slat);
            }

            // THE ICONIC SPIRIT OF ECSTASY ("ДУХ ЭКСТАЗА") FIGURINE ON HOOD PLINTH
            const plinthGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.03, 14);
            const plinth = new THREE.Mesh(plinthGeo, mats.chrome);
            plinth.position.set(0, baseY + H + 0.015, L * 0.49);
            root.add(plinth);

            const mascotGeo = new THREE.CylinderGeometry(0.012, 0.020, 0.08, 8);
            const mascotBody = new THREE.Mesh(mascotGeo, mats.chrome);
            mascotBody.position.set(0, baseY + H + 0.06, L * 0.49);
            root.add(mascotBody);

            // Mascot swept wings
            [-1, 1].forEach(side => {
                const wingGeo = new THREE.BoxGeometry(0.01, 0.045, 0.04);
                wingGeo.rotateZ(side * Math.PI / 6);
                const wing = new THREE.Mesh(wingGeo, mats.chrome);
                wing.position.set(side * 0.025, baseY + H + 0.08, L * 0.485);
                root.add(wing);
            });

            // Rectangular Laser Headlights
            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.18, 0.15, 0.14);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.38, baseY + H * 0.62, L * 0.48);
                root.add(hl);

                // Lower chrome air dam intake
                const intakeGeo = new THREE.BoxGeometry(W * 0.18, 0.06, 0.08);
                const intake = new THREE.Mesh(intakeGeo, mats.chrome);
                intake.position.set(side * W * 0.38, baseY + H * 0.25, L * 0.49);
                root.add(intake);
            });

            // Vertical jewel taillights with chrome surround
            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.12, 0.30, 0.06);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.38, baseY + H * 0.56, -L * 0.505);
                root.add(tl);

                const tlBezelGeo = new THREE.BoxGeometry(W * 0.13, 0.32, 0.05);
                const tlBezel = new THREE.Mesh(tlBezelGeo, mats.chrome);
                tlBezel.position.set(side * W * 0.38, baseY + H * 0.56, -L * 0.502);
                root.add(tlBezel);
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.15, baseY + H + 0.10, 0.88, 'chrome'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.92));

            // Russian VIP Plate (Р 001 РР | 777 RUS)
            const fp = createLicensePlate(THREE, 'Р 001 РР | 777 RUS', true);
            fp.position.set(0, baseY + 0.18, L * 0.52);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'Р 001 РР | 777 RUS', false);
            rp.position.set(0, baseY + 0.24, -L * 0.51);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.34, wheelTrack: W * 0.49, wheelR: 0.38, defaultWheels: 'stock' };
        }

        // -------------------------------------------------------------
        // 22. Subaru Impreza WRX STI (Rally icon, functional hood scoop, rally wing, wide flares)
        // -------------------------------------------------------------
        if (carId === 'subaru') {
            const L = 4.35, W = 1.82, H = 0.52;
            const cL = 2.10, cW = 1.48, cH = 0.50;
            const baseY = 0.32;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Wide Rally Box Fenders
            [-1, 1].forEach(side => {
                const fenderF = new THREE.BoxGeometry(0.06, H * 0.72, 0.95);
                const ff = new THREE.Mesh(fenderF, mats.paint);
                ff.position.set(side * (W * 0.50 + 0.025), baseY + H * 0.40, L * 0.33);
                root.add(ff);

                const fenderR = new THREE.BoxGeometry(0.06, H * 0.72, 0.95);
                const fr = new THREE.Mesh(fenderR, mats.paint);
                fr.position.set(side * (W * 0.50 + 0.025), baseY + H * 0.40, -L * 0.33);
                root.add(fr);
            });

            // Cabin
            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.46, -0.06);
            root.add(cabin);

            // Windshield
            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.85, 0.05);
            wsGeo.rotateX(-Math.PI / 6.2);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.46, -0.06 + cL * 0.505);
            root.add(ws);

            // Rear Glass
            const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.82, 0.05);
            rgGeo.rotateX(Math.PI / 6.0);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.46, -0.06 - cL * 0.505);
            root.add(rg);

            // Side Glass
            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.72, cL * 0.86);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.06);
                root.add(sg);
            });

            // SIGNATURE FUNCTIONAL STI HOOD SCOOP (Intercooler air intake)
            const scoopBaseGeo = new THREE.BoxGeometry(0.56, 0.07, 0.42);
            const scoopBase = new THREE.Mesh(scoopBaseGeo, mats.paint);
            scoopBase.position.set(0, baseY + H + 0.035, 0.65);
            root.add(scoopBase);

            const scoopOpeningGeo = new THREE.BoxGeometry(0.48, 0.045, 0.06);
            const scoopOpening = new THREE.Mesh(scoopOpeningGeo, mats.darkPlastic);
            scoopOpening.position.set(0, baseY + H + 0.035, 0.84);
            root.add(scoopOpening);

            // Hexagonal Grille with STI emblem
            const grilleGeo = new THREE.BoxGeometry(W * 0.52, H * 0.38, 0.08);
            const grille = new THREE.Mesh(grilleGeo, mats.darkPlastic);
            grille.position.set(0, baseY + H * 0.50, L * 0.502);
            root.add(grille);

            const badgeGeo = new THREE.BoxGeometry(0.08, 0.03, 0.02);
            const badgeMat = new THREE.MeshStandardMaterial({ color: 0xff0044, roughness: 0.3 });
            const badge = new THREE.Mesh(badgeGeo, badgeMat);
            badge.position.set(W * 0.16, baseY + H * 0.50, L * 0.544);
            root.add(badge);

            // C-Hawk Headlights with LED eyebrows
            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.20, 0.09, 0.16);
                hlGeo.rotateY(side * Math.PI / 18);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.36, baseY + H * 0.58, L * 0.46);
                root.add(hl);
            });

            // Taillights
            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.24, 0.10, 0.06);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.34, baseY + H * 0.58, -L * 0.503);
                root.add(tl);
            });

            // MASSIVE ICONIC RALLY REAR WING
            const wingBladeGeo = new THREE.BoxGeometry(W * 0.88, 0.045, 0.28);
            const wingBlade = new THREE.Mesh(wingBladeGeo, mats.paint);
            wingBlade.position.set(0, baseY + H + 0.38, -L * 0.46);
            root.add(wingBlade);

            [-1, 1].forEach(side => {
                const pylonGeo = new THREE.BoxGeometry(0.04, 0.38, 0.18);
                const pylon = new THREE.Mesh(pylonGeo, mats.paint);
                pylon.position.set(side * (W * 0.38), baseY + H + 0.19, -L * 0.46);
                root.add(pylon);
            });

            // Quad exhausts
            [-1, 1].forEach(side => {
                [-0.045, 0.045].forEach(offset => {
                    const exGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.12, 16);
                    exGeo.rotateX(Math.PI / 2);
                    const ex = new THREE.Mesh(exGeo, mats.chrome);
                    ex.position.set(side * (W * 0.32) + offset, baseY + 0.08, -L * 0.508);
                    root.add(ex);
                });
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.06, baseY + H + 0.06, 0.70, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.76));

            const fp = createLicensePlate(THREE, 'В 555 РР | 77 RUS', true);
            fp.position.set(0, baseY + 0.12, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'В 555 РР | 77 RUS', false);
            rp.position.set(0, baseY + H * 0.34, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.33, wheelTrack: W * 0.49, wheelR: 0.33, defaultWheels: 'forged' };
        }

        // -------------------------------------------------------------
        // 23. Porsche 911 Turbo S (Teardrop silhouette, beetle matrix eyes, full-width LED rear bar, wide turbo hips)
        // -------------------------------------------------------------
        if (carId === 'porsche911') {
            const L = 4.38, W = 1.90, H = 0.46;
            const cL = 1.95, cW = 1.44, cH = 0.44;
            const baseY = 0.28;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Wide Flared Turbo Hips (+60mm rear fenders)
            [-1, 1].forEach(side => {
                const hipGeo = new THREE.BoxGeometry(0.08, H * 0.78, 1.15);
                const hip = new THREE.Mesh(hipGeo, mats.paint);
                hip.position.set(side * (W * 0.50 + 0.035), baseY + H * 0.42, -L * 0.24);
                root.add(hip);

                // Turbo Side Air Intakes ahead of rear wheels
                const intakeGeo = new THREE.BoxGeometry(0.05, 0.14, 0.24);
                const intake = new THREE.Mesh(intakeGeo, mats.darkPlastic);
                intake.position.set(side * (W * 0.50 + 0.05), baseY + H * 0.44, -L * 0.05);
                root.add(intake);
            });

            // Sloping Teardrop 911 Fastback Roof
            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.44, -0.16);
            root.add(cabin);

            // Raked Front Windshield
            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.90, 0.05);
            wsGeo.rotateX(-Math.PI / 5.2);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.44, -0.16 + cL * 0.505);
            root.add(ws);

            // Flowing Sloping Rear Decklid Glass
            const rgGeo = new THREE.BoxGeometry(cW * 0.88, cH * 1.15, 0.05);
            rgGeo.rotateX(Math.PI / 4.4);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.38, -0.16 - cL * 0.50);
            root.add(rg);

            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.70, cL * 0.82);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.44, -0.16);
                root.add(sg);
            });

            // ICONIC ROUND BEETLE-EYE MATRIX HEADLAMPS
            [-1, 1].forEach(side => {
                const hlPodGeo = new THREE.CylinderGeometry(0.125, 0.125, 0.08, 24);
                hlPodGeo.rotateX(-Math.PI / 4.5);
                const hlPod = new THREE.Mesh(hlPodGeo, mats.headlightLED);
                hlPod.position.set(side * (W * 0.35), baseY + H * 0.88, L * 0.45);
                root.add(hlPod);

                // 4-Point Matrix LED DRL points
                [-0.04, 0.04].forEach(dx => {
                    [-0.04, 0.04].forEach(dy => {
                        const ptGeo = new THREE.BoxGeometry(0.018, 0.018, 0.02);
                        const pt = new THREE.Mesh(ptGeo, mats.chrome);
                        pt.position.set(side * (W * 0.35) + dx, baseY + H * 0.88 + dy, L * 0.475);
                        root.add(pt);
                    });
                });
            });

            // FULL-WIDTH CONTINUOUS SLIM LED REAR LIGHT BAR
            const lightBarGeo = new THREE.BoxGeometry(W * 0.82, 0.045, 0.06);
            const lightBar = new THREE.Mesh(lightBarGeo, mats.taillightRed);
            lightBar.position.set(0, baseY + H * 0.65, -L * 0.502);
            root.add(lightBar);

            // Active Turbo Rear Ducktail Wing
            const wingGeo = new THREE.BoxGeometry(W * 0.78, 0.04, 0.24);
            const wing = new THREE.Mesh(wingGeo, mats.paint);
            wing.position.set(0, baseY + H * 0.76, -L * 0.46);
            root.add(wing);

            // Quad Rectangular Chrome Exhaust Tips
            [-1, 1].forEach(side => {
                [-0.045, 0.045].forEach(offset => {
                    const exGeo = new THREE.BoxGeometry(0.07, 0.04, 0.12);
                    const ex = new THREE.Mesh(exGeo, mats.chrome);
                    ex.position.set(side * (W * 0.30) + offset, baseY + 0.08, -L * 0.506);
                    root.add(ex);
                });
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.16, baseY + H + 0.04, 0.65, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.68));

            const fp = createLicensePlate(THREE, 'О 911 ОО | 77 RUS', true);
            fp.position.set(0, baseY + 0.10, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'О 911 ОО | 77 RUS', false);
            rp.position.set(0, baseY + H * 0.32, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.32, wheelTrack: W * 0.50, wheelR: 0.33, defaultWheels: 'forged' };
        }

        // -------------------------------------------------------------
        // 24. Lamborghini Huracan Performante (Extreme sharp wedge, Y-shaped LED DRLs, forged carbon ALA aero)
        // -------------------------------------------------------------
        if (carId === 'huracan') {
            const L = 4.40, W = 1.94, H = 0.40;
            const cL = 1.78, cW = 1.40, cH = 0.38;
            const baseY = 0.25;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Wedge Nose Slope
            const noseGeo = new THREE.BoxGeometry(W * 0.94, 0.12, 0.90);
            noseGeo.rotateX(Math.PI / 10);
            const nose = new THREE.Mesh(noseGeo, mats.paint);
            nose.position.set(0, baseY + H * 0.40, L * 0.42);
            root.add(nose);

            // Stealth Cockpit
            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.paint);
            cabin.position.set(0, baseY + H + cH * 0.44, -0.14);
            root.add(cabin);

            // Extreme Raked Windshield
            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 1.10, 0.04);
            wsGeo.rotateX(-Math.PI / 4.6);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.44, -0.14 + cL * 0.505);
            root.add(ws);

            // Slanted Rear Glass Deck
            const rgGeo = new THREE.BoxGeometry(cW * 0.88, cH * 1.10, 0.04);
            rgGeo.rotateX(Math.PI / 4.4);
            const rg = new THREE.Mesh(rgGeo, mats.glass);
            rg.position.set(0, baseY + H + cH * 0.44, -0.14 - cL * 0.505);
            root.add(rg);

            [-1, 1].forEach(side => {
                const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.68, cL * 0.80);
                const sg = new THREE.Mesh(sgGeo, mats.glass);
                sg.position.set(side * cW * 0.505, baseY + H + cH * 0.44, -0.14);
                root.add(sg);

                // Huge Hexagonal Side Air Intakes
                const scoopGeo = new THREE.BoxGeometry(0.06, 0.16, 0.40);
                const scoop = new THREE.Mesh(scoopGeo, mats.darkPlastic);
                scoop.position.set(side * (W * 0.49), baseY + H * 0.60, -L * 0.08);
                root.add(scoop);
            });

            // Knife-Edge Front Splitter with ALA flaps
            const splGeo = new THREE.BoxGeometry(W * 0.98, 0.03, 0.28);
            const spl = new THREE.Mesh(splGeo, mats.carbon);
            spl.position.set(0, baseY + 0.04, L * 0.51);
            root.add(spl);

            // SIGNATURE Y-SHAPED MATRIX HEADLIGHTS
            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.20, 0.06, 0.22);
                hlGeo.rotateY(side * Math.PI / 14);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.36, baseY + H * 0.64, L * 0.44);
                root.add(hl);
            });

            // Y-Shaped Taillights
            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.24, 0.06, 0.06);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.32, baseY + H * 0.68, -L * 0.502);
                root.add(tl);
            });

            // HIGH-MOUNTED CENTRAL TWIN EXHAUSTS (Right between taillights)
            [-1, 1].forEach(side => {
                const exGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.12, 18);
                exGeo.rotateX(Math.PI / 2);
                const ex = new THREE.Mesh(exGeo, mats.chrome);
                ex.position.set(side * 0.14, baseY + H * 0.68, -L * 0.508);
                root.add(ex);
            });

            // Performante Carbon Rear Wing
            const wingGeo = new THREE.BoxGeometry(W * 0.90, 0.035, 0.26);
            const wing = new THREE.Mesh(wingGeo, mats.carbon);
            wing.position.set(0, baseY + H + 0.32, -L * 0.44);
            root.add(wing);

            [-1, 1].forEach(side => {
                const strutGeo = new THREE.BoxGeometry(0.03, 0.32, 0.14);
                const strut = new THREE.Mesh(strutGeo, mats.carbon);
                strut.position.set(side * (W * 0.26), baseY + H + 0.16, -L * 0.44);
                root.add(strut);
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.14, baseY + H + 0.04, 0.65, 'paint'));
            root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.66));

            const fp = createLicensePlate(THREE, 'Х 777 ХХ | 77 RUS', true);
            fp.position.set(0, baseY + 0.09, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'Х 777 ХХ | 77 RUS', false);
            rp.position.set(0, baseY + H * 0.30, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.33, wheelTrack: W * 0.50, wheelR: 0.33, defaultWheels: 'forged' };
        }

        // -------------------------------------------------------------
        // 25. Ferrari SF90 Stradale & Koenigsegg Jesko Attack Hypercars
        // -------------------------------------------------------------
        if (carId === 'sf90') {
            const L = 4.45, W = 1.96, H = 0.41;
            const cL = 1.82, cW = 1.42, cH = 0.38;
            const baseY = 0.25;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Flying Buttresses behind cockpit
            [-1, 1].forEach(side => {
                const butGeo = new THREE.BoxGeometry(0.06, cH * 0.70, 0.85);
                butGeo.rotateX(-Math.PI / 8);
                const but = new THREE.Mesh(butGeo, mats.paint);
                but.position.set(side * (cW * 0.48), baseY + H + cH * 0.38, -0.58);
                root.add(but);
            });

            // Cockpit Canopy
            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.carbon);
            cabin.position.set(0, baseY + H + cH * 0.44, -0.15);
            root.add(cabin);

            // Hammerhead Nose Splitter
            const noseGeo = new THREE.BoxGeometry(W * 0.85, 0.06, 0.30);
            const nose = new THREE.Mesh(noseGeo, mats.carbon);
            nose.position.set(0, baseY + 0.06, L * 0.51);
            root.add(nose);

            // C-Shaped Matrix Slit Headlights
            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.18, 0.045, 0.18);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.36, baseY + H * 0.72, L * 0.46);
                root.add(hl);
            });

            // Horizontal Pill Split Taillights
            [-1, 1].forEach(side => {
                [-0.04, 0.04].forEach(off => {
                    const tlGeo = new THREE.BoxGeometry(0.10, 0.045, 0.04);
                    const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                    tl.position.set(side * (W * 0.34) + off, baseY + H * 0.70, -L * 0.502);
                    root.add(tl);
                });
            });

            // High-Mounted Center Twin Cannon Exhausts
            [-1, 1].forEach(side => {
                const exGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.12, 18);
                exGeo.rotateX(Math.PI / 2);
                const ex = new THREE.Mesh(exGeo, mats.chrome);
                ex.position.set(side * 0.12, baseY + H * 0.68, -L * 0.508);
                root.add(ex);
            });

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
            root.add(createSideMirrors(THREE, mats, cW, -0.14, baseY + H + 0.04, 0.65, 'paint'));

            const fp = createLicensePlate(THREE, 'Е 777 КХ | 77 RUS', true);
            fp.position.set(0, baseY + 0.08, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'Е 777 КХ | 77 RUS', false);
            rp.position.set(0, baseY + H * 0.32, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.33, wheelTrack: W * 0.50, wheelR: 0.33, defaultWheels: 'forged' };
        }

        if (carId === 'jesko') {
            const L = 4.50, W = 2.02, H = 0.42;
            const cL = 1.85, cW = 1.38, cH = 0.38;
            const baseY = 0.24;

            const bodyGeo = new THREE.BoxGeometry(W, H, L);
            const body = new THREE.Mesh(bodyGeo, mats.paint);
            body.position.set(0, baseY + H * 0.46, 0);
            root.add(body);

            // Wraparound Jet Fighter Canopy
            const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
            const cabin = new THREE.Mesh(cabinGeo, mats.carbon);
            cabin.position.set(0, baseY + H + cH * 0.44, -0.12);
            root.add(cabin);

            const wsGeo = new THREE.BoxGeometry(cW * 0.94, cH * 1.10, 0.04);
            wsGeo.rotateX(-Math.PI / 4.4);
            const ws = new THREE.Mesh(wsGeo, mats.glass);
            ws.position.set(0, baseY + H + cH * 0.44, -0.12 + cL * 0.505);
            root.add(ws);

            // Massive Front Splitter with curved endplates
            const splGeo = new THREE.BoxGeometry(W * 1.02, 0.04, 0.35);
            const spl = new THREE.Mesh(splGeo, mats.carbon);
            spl.position.set(0, baseY + 0.03, L * 0.52);
            root.add(spl);

            [-1, 1].forEach(side => {
                const epGeo = new THREE.BoxGeometry(0.04, 0.16, 0.35);
                const ep = new THREE.Mesh(epGeo, mats.carbon);
                ep.position.set(side * (W * 0.51), baseY + 0.09, L * 0.52);
                root.add(ep);
            });

            // Central Shark Fin Spine
            const finGeo = new THREE.BoxGeometry(0.03, 0.24, 1.20);
            const fin = new THREE.Mesh(finGeo, mats.carbon);
            fin.position.set(0, baseY + H + cH + 0.10, -0.45);
            root.add(fin);

            // GIANT TOP-MOUNTED BOOMERANG ACTIVE REAR WING
            const wingGeo = new THREE.BoxGeometry(W * 0.96, 0.04, 0.36);
            const wing = new THREE.Mesh(wingGeo, mats.carbon);
            wing.position.set(0, baseY + H + cH + 0.28, -L * 0.48);
            root.add(wing);

            // Top-mounted Swan-Neck Pylons
            [-1, 1].forEach(side => {
                const pylonGeo = new THREE.BoxGeometry(0.035, 0.36, 0.16);
                const pylon = new THREE.Mesh(pylonGeo, mats.carbon);
                pylon.position.set(side * (W * 0.22), baseY + H + cH + 0.14, -L * 0.46);
                root.add(pylon);
            });

            // Giant Central Hypercar Exhaust
            const exGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.14, 24);
            exGeo.rotateX(Math.PI / 2);
            const ex = new THREE.Mesh(exGeo, mats.chrome);
            ex.position.set(0, baseY + H * 0.62, -L * 0.51);
            root.add(ex);

            root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));

            const fp = createLicensePlate(THREE, 'А 001 АА | 77 RUS', true);
            fp.position.set(0, baseY + 0.08, L * 0.52);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'А 001 АА | 77 RUS', false);
            rp.position.set(0, baseY + H * 0.32, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.34, wheelTrack: W * 0.50, wheelR: 0.34, defaultWheels: 'forged' };
        }

        // -------------------------------------------------------------
        // Generic Adaptive High-Detail Fallback (for any unmapped vehicle)
        // -------------------------------------------------------------
        const L = 4.30, W = 1.80, H = 0.52;
        const cL = 2.00, cW = 1.48, cH = 0.48;
        const baseY = 0.30;

        const bodyGeo = new THREE.BoxGeometry(W, H, L);
        const body = new THREE.Mesh(bodyGeo, mats.paint);
        body.position.set(0, baseY + H * 0.46, 0);
        root.add(body);

        const cabinGeo = new THREE.BoxGeometry(cW, cH, cL);
        const cabin = new THREE.Mesh(cabinGeo, mats.paint);
        cabin.position.set(0, baseY + H + cH * 0.46, -0.08);
        root.add(cabin);

        const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.85, 0.05);
        wsGeo.rotateX(-Math.PI / 6.5);
        const ws = new THREE.Mesh(wsGeo, mats.glass);
        ws.position.set(0, baseY + H + cH * 0.46, -0.08 + cL * 0.505);
        root.add(ws);

        const rgGeo = new THREE.BoxGeometry(cW * 0.90, cH * 0.82, 0.05);
        rgGeo.rotateX(Math.PI / 6.0);
        const rg = new THREE.Mesh(rgGeo, mats.glass);
        rg.position.set(0, baseY + H + cH * 0.46, -0.08 - cL * 0.505);
        root.add(rg);

        [-1, 1].forEach(side => {
            const sgGeo = new THREE.BoxGeometry(0.03, cH * 0.72, cL * 0.86);
            const sg = new THREE.Mesh(sgGeo, mats.glass);
            sg.position.set(side * cW * 0.505, baseY + H + cH * 0.46, -0.08);
            root.add(sg);
        });

        const grilleGeo = new THREE.BoxGeometry(W * 0.54, H * 0.40, 0.08);
        const grille = new THREE.Mesh(grilleGeo, mats.darkPlastic);
        grille.position.set(0, baseY + H * 0.52, L * 0.502);
        root.add(grille);

        [-1, 1].forEach(side => {
            const hlGeo = new THREE.BoxGeometry(W * 0.20, 0.10, 0.16);
            const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
            hl.position.set(side * W * 0.36, baseY + H * 0.58, L * 0.46);
            root.add(hl);

            const tlGeo = new THREE.BoxGeometry(W * 0.26, 0.10, 0.06);
            const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
            tl.position.set(side * W * 0.34, baseY + H * 0.58, -L * 0.503);
            root.add(tl);
        });

        [-1, 1].forEach(side => {
            const exGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 14);
            exGeo.rotateX(Math.PI / 2);
            const ex = new THREE.Mesh(exGeo, mats.chrome);
            ex.position.set(side * (W * 0.32), baseY + 0.08, -L * 0.508);
            root.add(ex);
        });

        root.add(createCockpitInterior(THREE, mats, cW, cL, cH, baseY));
        root.add(createSideMirrors(THREE, mats, cW, -0.08, baseY + H + 0.06, 0.70, 'paint'));
        root.add(createWipers(THREE, mats, cW, baseY + H + 0.02, 0.75));

        const fp = createLicensePlate(THREE, 'М 777 ММ | 77 RUS', true);
        fp.position.set(0, baseY + 0.14, L * 0.51);
        root.add(fp);

        const rp = createLicensePlate(THREE, 'М 777 ММ | 77 RUS', false);
        rp.position.set(0, baseY + H * 0.38, -L * 0.505);
        root.add(rp);

        return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.33, wheelTrack: W * 0.49, wheelR: 0.33 };
    }

    // Master High-Detail 3D Car Model Assembler
    function buildDetailedCarModel(THREE, carName, styling = {}) {
        const root = new THREE.Group();
        root.name = 'CarRoot_' + encodeURIComponent(carName);

        const carId = identifyCarModel(carName);
        const mats = createCarMaterials(THREE, styling, carName, carId);

        // Suspension ride height offset & Stance tuning
        let suspensionOffsetY = 0;
        if (typeof styling.rideHeight === 'number') {
            suspensionOffsetY = styling.rideHeight;
        } else if (styling.suspension === 'bpan') {
            suspensionOffsetY = -0.095; // Slammed БПАН
        } else if (styling.suspension === 'lowered') {
            suspensionOffsetY = -0.048; // -30mm sport drop
        } else if (styling.suspension === 'lift') {
            suspensionOffsetY = 0.085; // Offroad lift +50mm
        }

        // Suspended Chassis Group (moves up/down with suspension)
        const chassisGroup = new THREE.Group();
        chassisGroup.position.y = suspensionOffsetY;
        chassisGroup.name = 'ChassisGroup';
        root.add(chassisGroup);

        // Build specific car body
        const spec = buildVehicleChassis(THREE, mats, carId, carName);
        chassisGroup.add(spec.root);

        // Apply license plate if specified in styling (or hide if 'none'/null)
        if (styling && styling.plate !== undefined) {
            applyLicensePlateToModel(THREE, spec.root, styling.plate, styling.frameStyle || 'none', styling.plateStyle || 'classic');
        }

        // Tuning: Spoilers
        const spoilerGroup = new THREE.Group();
        spoilerGroup.name = 'SpoilerGroup';
        chassisGroup.add(spoilerGroup);

        const trunkY = 0.34 + 0.55 * 0.94;
        const trunkZ = -spec.bodyLength * 0.502 + 0.30;

        if (!(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW&&window.NomeraAeroKit)&&styling.spoiler === 'ducktail') {
            const duckGeo = new THREE.BoxGeometry(spec.bodyWidth * 0.78, 0.08, 0.22);
            duckGeo.rotateX(Math.PI / 8);
            const duck = new THREE.Mesh(duckGeo, mats.trim);
            duck.position.set(0, trunkY + 0.05, trunkZ);
            spoilerGroup.add(duck);
        } else if (!(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW&&window.NomeraAeroKit)&&styling.spoiler === 'high') {
            [-1, 1].forEach(side => {
                const legGeo = new THREE.BoxGeometry(0.035, 0.28, 0.10);
                legGeo.rotateX(-Math.PI / 18);
                const leg = new THREE.Mesh(legGeo, mats.trim);
                leg.position.set(side * (spec.bodyWidth * 0.32), trunkY + 0.14, trunkZ);
                spoilerGroup.add(leg);
            });
            const wingGeo = new THREE.BoxGeometry(spec.bodyWidth * 0.94, 0.04, 0.26);
            wingGeo.rotateX(Math.PI / 16);
            const wing = new THREE.Mesh(wingGeo, mats.carbon);
            wing.position.set(0, trunkY + 0.29, trunkZ - 0.02);
            spoilerGroup.add(wing);
        } else if (!(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW&&window.NomeraAeroKit)&&(styling.spoiler === 'gt' || styling.spoiler === 'gtr')) {
            const wingGeo = new THREE.BoxGeometry(spec.bodyWidth * 0.96, 0.04, 0.32);
            const wing = new THREE.Mesh(wingGeo, mats.carbon);
            wing.position.set(0, trunkY + 0.32, trunkZ);
            spoilerGroup.add(wing);

            [-1, 1].forEach(side => {
                const strutGeo = new THREE.BoxGeometry(0.04, 0.32, 0.12);
                const strut = new THREE.Mesh(strutGeo, mats.carbon);
                strut.position.set(side * (spec.bodyWidth * 0.32), trunkY + 0.16, trunkZ);
                spoilerGroup.add(strut);
            });
        }

        // Tuning: SGU Strobe Lights removed per user request: "убери все мигалки которые можно ставить на машину, они только мешают"

        // Tuning: Neon Underglow (Recessed Underbody Emitters + Soft Ground Glow Pool)
        const neonGroup = new THREE.Group();
        neonGroup.name = 'NeonGroup';
        chassisGroup.add(neonGroup);

        if (styling.neon && styling.neon !== 'none') {
            const neonCol = parseColor(styling.neon, 0x00f0ff);
            const glowTex = createUnderglowGroundTexture(THREE, neonCol);
            const glowPlaneGeo = new THREE.PlaneGeometry(spec.bodyWidth * 1.28, spec.bodyLength * 0.96);
            const glowPlaneMat = new THREE.MeshBasicMaterial({
                map: glowTex,
                color: neonCol,
                transparent: true,
                opacity: 0.92,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const glowPlane = new THREE.Mesh(glowPlaneGeo, glowPlaneMat);
            glowPlane.name = 'NeonGroundGlowPlane';
            glowPlane.rotation.x = -Math.PI / 2;
            glowPlane.position.set(0, 0.008 - suspensionOffsetY, 0);
            glowPlane.renderOrder = 4;
            glowPlane.userData.isNeonGroundGlow = true;
            neonGroup.add(glowPlane);

            const neonMat = new THREE.MeshStandardMaterial({
                color: neonCol,
                emissive: neonCol,
                emissiveIntensity: 1.4,
                roughness: 0.1
            });

            [-1, 1].forEach(side => {
                const tubeGeo = new THREE.CylinderGeometry(0.005, 0.005, spec.bodyLength * 0.36, 8);
                tubeGeo.rotateX(Math.PI / 2);
                const tube = new THREE.Mesh(tubeGeo, neonMat);
                tube.name = side < 0 ? 'NeonEmitter_L' : 'NeonEmitter_R';
                tube.position.set(side * (spec.bodyWidth * 0.28), 0.16, 0);
                neonGroup.add(tube);
            });
        }

        // ---------------------------------------------------------------------
        // Interactive Body Elements (Doors, Hood, Trunk, Engine Bay, Subwoofer)
        // ---------------------------------------------------------------------
        const doorLength = spec.bodyLength * 0.24;
        const doorHeight = 0.50;
        const doorThick = 0.04;
        const isButterfly = (carId === 'huracan' || carId === 'sf90' || carId === 'chiron' || carId === 'jesko' || carId === 'm8');

        const doorCavityGroup = new THREE.Group();
        doorCavityGroup.name = 'Door_CavityGroup';
        doorCavityGroup.visible = false;
        [-1, 1].forEach(side => {
            const cav = new THREE.Mesh(new THREE.BoxGeometry(0.08, doorHeight * 0.94, doorLength * 0.94), mats.darkPlastic || mats.trim);
            cav.position.set(side * (spec.bodyWidth * 0.46), 0.58, spec.wheelBase * 0.42 - doorLength * 0.5);
            doorCavityGroup.add(cav);
        });
        chassisGroup.add(doorCavityGroup);

        // Front Left Door (Driver) with Hinge Pivot
        const doorFLPivot = new THREE.Group();
        doorFLPivot.name = 'Door_FL_Pivot';
        doorFLPivot.position.set(-spec.bodyWidth * 0.49, 0.58, spec.wheelBase * 0.42);
        doorFLPivot.userData.isButterflyDoor = isButterfly;
        doorFLPivot.visible = false;

        const doorFLMesh = new THREE.Mesh(new THREE.BoxGeometry(doorThick, doorHeight, doorLength), mats.paint);
        doorFLMesh.position.set(0, 0, -doorLength * 0.5);
        doorFLPivot.add(doorFLMesh);

        const doorFLGlass = new THREE.Mesh(new THREE.BoxGeometry(doorThick * 0.6, doorHeight * 0.68, doorLength * 0.90), mats.glass);
        doorFLGlass.position.set(0, doorHeight * 0.66, -doorLength * 0.5);
        doorFLPivot.add(doorFLGlass);

        const handleFL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.09), mats.chrome || mats.trim);
        handleFL.position.set(-doorThick * 0.6, 0.05, -doorLength * 0.80);
        doorFLPivot.add(handleFL);

        const mirrorFL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.12), mats.trim);
        mirrorFL.position.set(-0.07, doorHeight * 0.44, -0.05);
        doorFLPivot.add(mirrorFL);

        chassisGroup.add(doorFLPivot);

        // Front Right Door (Passenger) with Hinge Pivot
        const doorFRPivot = new THREE.Group();
        doorFRPivot.name = 'Door_FR_Pivot';
        doorFRPivot.position.set(spec.bodyWidth * 0.49, 0.58, spec.wheelBase * 0.42);
        doorFRPivot.userData.isButterflyDoor = isButterfly;
        doorFRPivot.visible = false;

        const doorFRMesh = new THREE.Mesh(new THREE.BoxGeometry(doorThick, doorHeight, doorLength), mats.paint);
        doorFRMesh.position.set(0, 0, -doorLength * 0.5);
        doorFRPivot.add(doorFRMesh);

        const doorFRGlass = new THREE.Mesh(new THREE.BoxGeometry(doorThick * 0.6, doorHeight * 0.68, doorLength * 0.90), mats.glass);
        doorFRGlass.position.set(0, doorHeight * 0.66, -doorLength * 0.5);
        doorFRPivot.add(doorFRGlass);

        const handleFR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.09), mats.chrome || mats.trim);
        handleFR.position.set(doorThick * 0.6, 0.05, -doorLength * 0.80);
        doorFRPivot.add(handleFR);

        const mirrorFR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.12), mats.trim);
        mirrorFR.position.set(0.07, doorHeight * 0.44, -0.05);
        doorFRPivot.add(mirrorFR);

        chassisGroup.add(doorFRPivot);

        // Hood / Bonnet with Hinge Pivot
        const hoodLength = spec.bodyLength * 0.30;
        const hoodWidth = spec.bodyWidth * 0.88;
        const hoodPivot = new THREE.Group();
        hoodPivot.name = 'Hood_Pivot';
        hoodPivot.position.set(0, 0.78, spec.wheelBase * 0.44);
        hoodPivot.visible = false;

        const hoodMesh = new THREE.Mesh(new THREE.BoxGeometry(hoodWidth, 0.025, hoodLength), mats.paint);
        hoodMesh.position.set(0, 0, hoodLength * 0.5);
        hoodPivot.add(hoodMesh);
        chassisGroup.add(hoodPivot);

        // Engine Bay Details (revealed when hood opens)
        const engineBayGroup = new THREE.Group();
        engineBayGroup.name = 'EngineBayGroup';
        engineBayGroup.position.set(0, 0.55, spec.wheelBase * 0.58);
        engineBayGroup.visible = false;

        const engBlock = new THREE.Mesh(new THREE.BoxGeometry(spec.bodyWidth * 0.40, 0.26, 0.40), mats.trim);
        engBlock.name = 'Engine_Block';
        engineBayGroup.add(engBlock);

        const valveCover = new THREE.Mesh(new THREE.BoxGeometry(spec.bodyWidth * 0.36, 0.07, 0.36), mats.brakeCaliper || mats.paint);
        valveCover.name = 'Engine_ValveCover';
        valveCover.position.y = 0.15;
        engineBayGroup.add(valveCover);

        const intakeManifold = new THREE.Mesh(new THREE.BoxGeometry(spec.bodyWidth * 0.24, 0.05, 0.20), mats.chrome);
        intakeManifold.name = 'Engine_IntakePipe';
        intakeManifold.position.set(-0.10, 0.17, 0.04);
        engineBayGroup.add(intakeManifold);

        const airFilter = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 12), mats.brakeCaliper || mats.trim);
        airFilter.name = 'Engine_AirFilter';
        airFilter.rotation.z = Math.PI / 2;
        airFilter.position.set(-spec.bodyWidth * 0.26, 0.13, 0.10);
        engineBayGroup.add(airFilter);

        const strutBrace = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, spec.bodyWidth * 0.72, 8), mats.chrome);
        strutBrace.name = 'Engine_StrutBar';
        strutBrace.rotation.z = Math.PI / 2;
        strutBrace.position.set(0, 0.23, -0.04);
        engineBayGroup.add(strutBrace);

        chassisGroup.add(engineBayGroup);

        // Trunk Lid with Hinge Pivot
        const trunkLength = spec.bodyLength * 0.24;
        const trunkWidth = spec.bodyWidth * 0.85;
        const trunkPivot = new THREE.Group();
        trunkPivot.name = 'Trunk_Pivot';
        trunkPivot.position.set(0, 0.77, -spec.wheelBase * 0.36);
        trunkPivot.visible = false;

        const trunkMesh = new THREE.Mesh(new THREE.BoxGeometry(trunkWidth, 0.025, trunkLength), mats.paint);
        trunkMesh.position.set(0, 0, -trunkLength * 0.5);
        trunkPivot.add(trunkMesh);
        chassisGroup.add(trunkPivot);

        // Subwoofer / Audio System in Trunk (revealed when trunk opens)
        const subwooferGroup = new THREE.Group();
        subwooferGroup.name = 'SubwooferGroup';
        subwooferGroup.position.set(0, 0.52, -spec.wheelBase * 0.50);
        subwooferGroup.visible = false;

        const subBox = new THREE.Mesh(new THREE.BoxGeometry(spec.bodyWidth * 0.62, 0.24, 0.32), mats.darkPlastic || mats.trim);
        subBox.name = 'Subwoofer_Box';
        subwooferGroup.add(subBox);

        [-0.16, 0.16].forEach((sx, idx) => {
            const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.03, 0.05, 16), mats.interior || mats.trim);
            cone.name = idx === 0 ? 'Subwoofer_Cone_L' : 'Subwoofer_Cone_R';
            cone.rotation.x = Math.PI / 2;
            cone.position.set(sx * (spec.bodyWidth * 0.44), 0.03, 0.15);
            subwooferGroup.add(cone);

            const subRing = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.010, 8, 24), new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: 0x0284c7,
                emissiveIntensity: 1.2
            }));
            subRing.userData.isInteractiveNeon = true;
            subRing.position.set(sx * (spec.bodyWidth * 0.44), 0.03, 0.17);
            subwooferGroup.add(subRing);
        });

        chassisGroup.add(subwooferGroup);

        // Headlights & Taillights Groups for Showroom Interactive Lighting
        const headlightsGroup = new THREE.Group();
        headlightsGroup.name = 'HeadlightsGroup';
        [-spec.wheelTrack * 0.74, spec.wheelTrack * 0.74].forEach(hx => {
            const hlLight = new THREE.PointLight(0xf8fafc, 0, 16, 1.8);
            hlLight.position.set(hx, 0.65, spec.bodyLength * 0.51);
            headlightsGroup.add(hlLight);
        });
        chassisGroup.add(headlightsGroup);

        // 4 Wheels Assembly (Fixed to ground height, with Stance Camber & Spacers)
        const wheelsRig = new THREE.Group();
        wheelsRig.name = 'WheelsRig';
        root.add(wheelsRig);

        let defaultWheel = spec.defaultWheels || 'stock';
        if (carId === 'gaz24') defaultWheel = 'volga_caps';
        else if (carId === 'priora') defaultWheel = 'torus';
        else if (carId === 'vesta') defaultWheel = 'forged';
        else if (carId === 'vaz2107' || carId === 'vaz2109') defaultWheel = 'stamps';

        const wheelStyle = (styling.wheels && styling.wheels !== 'stock')
            ? styling.wheels
            : defaultWheel;
        const wRadius = spec.wheelR || 0.33;
        const wCenterY = wRadius;

        // Stance: Camber and Spacers / Offset
        const camberDeg = Number(styling.camber) || 0;
        const camberRad = (camberDeg * Math.PI) / 180;
        const spacerOffset = Number(styling.wheelOffset) || 0;
        const trackW = spec.wheelTrack + spacerOffset;

        // Front Left
        const wFL = createDetailedWheel(THREE, mats, wheelStyle, wRadius / 0.33, carId === 'camry');
        wFL.name = 'Wheel_FL';
        wFL.position.set(-trackW, wCenterY, spec.wheelBase);
        wFL.rotation.y = Math.PI;
        wFL.rotation.z = -camberRad;
        wFL.userData.isSteerable = true;
        wFL.userData.side = -1;
        wFL.userData.baseRotY = Math.PI;
        wFL.userData.camber = camberDeg;
        wheelsRig.add(wFL);

        // Front Right
        const wFR = createDetailedWheel(THREE, mats, wheelStyle, wRadius / 0.33, carId === 'camry');
        wFR.name = 'Wheel_FR';
        wFR.position.set(trackW, wCenterY, spec.wheelBase);
        wFR.rotation.z = camberRad;
        wFR.userData.isSteerable = true;
        wFR.userData.side = 1;
        wFR.userData.baseRotY = 0;
        wFR.userData.camber = camberDeg;
        wheelsRig.add(wFR);

        // Rear Left
        const wRL = createDetailedWheel(THREE, mats, wheelStyle, wRadius / 0.33, carId === 'camry');
        wRL.name = 'Wheel_RL';
        wRL.position.set(-trackW, wCenterY, -spec.wheelBase);
        wRL.rotation.y = Math.PI;
        wRL.rotation.z = -camberRad;
        wRL.userData.side = -1;
        wRL.userData.baseRotY = Math.PI;
        wRL.userData.camber = camberDeg;
        wheelsRig.add(wRL);

        // Rear Right
        const wRR = createDetailedWheel(THREE, mats, wheelStyle, wRadius / 0.33, carId === 'camry');
        wRR.name = 'Wheel_RR';
        wRR.position.set(trackW, wCenterY, -spec.wheelBase);
        wRR.rotation.z = camberRad;
        wRR.userData.side = 1;
        wRR.userData.baseRotY = 0;
        wRR.userData.camber = camberDeg;
        wheelsRig.add(wRR);

        root.userData.spec = spec;
        if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraAeroKit?.apply(THREE,root,styling,{carId});
        return root;
    }

    // =========================================================================
    // 🚘 GLB / GLTF REAL 3D MODEL LOADER & STYLING ENGINE
    // =========================================================================
    const GLB_MODEL_MAP = {
        // NFS Most Wanted (2005) Authentic 3D Rips & Full Blacklist #15-#1 Icons
        m3gtr: './assets/models/bmw_m3_gtr.glb',             // #1 Razor — 2005 BMW M3 E46 GTR Hero Livery (5.9 MB)
        corvette_cross: './assets/models/corvette_cross.glb', // Sergeant Cross — Chevrolet Corvette C6.R Interceptor (9.0 MB)
        mustang_razor: './assets/models/mustang_razor.glb',   // Razor Prologue — 2005 Ford Mustang GT Widebody (1.76 MB)
        mclaren: './assets/models/mclaren.glb',               // #2 Bull — Mercedes-Benz SLR McLaren / McLaren
        db9: './assets/models/aston_martin.glb',              // #3 Ronnie — Aston Martin DB9
        viper_jv: './assets/models/nissan_370z.glb',          // #4 JV — Dodge Viper SRT10 / Wide Sport Coupe
        corvette_webster: './assets/models/corvette_cross.glb', // #5 Webster — Chevrolet Corvette C6
        gallardo_ming: './assets/models/lamborghini.glb',     // #6 Ming — Lamborghini Gallardo
        clk_kaze: './assets/models/mercedes_v8.glb',          // #7 Kaze — Mercedes-Benz CLK 500
        mustang_jewels: './assets/models/mustang_razor.glb',  // #8 Jewels — Ford Mustang GT
        evo8_earl: './assets/models/rally.glb',               // #9 Earl — Mitsubishi Lancer Evolution VIII Rally
        cayman_baron: './assets/models/porsche.glb',          // #10 Baron — Porsche Cayman S / 911
        eclipse_lou: './assets/models/veloster_n.glb',        // #11 Big Lou — Mitsubishi Eclipse GT / Sport Hatch
        rx7: './assets/models/mazda_rx7.glb',                 // #12 Izzy / Mia — Mazda RX-8 / RX-7
        supra: './assets/models/toyota_supra.glb',            // #13 Vic — Toyota Supra MK4
        is300_taz: './assets/models/mark2.glb',               // #14 Taz — Lexus IS300 / JDM Tourer
        golf_sonny: './assets/models/golf7.glb',              // #15 Sonny — Volkswagen Golf GTI
        audir8: './assets/models/audi_r8.glb',                // Darius — Audi Le Mans Quattro / R8

        // Bonus Exclusive 3D Models from assets/models/
        m3_g80: './assets/models/bmw_m3_sedan.glb',           // BMW M3 G80 Competition Sedan
        x5m: './assets/models/x5m.glb',                       // BMW X5 M Competition
        rs7: './assets/models/audi_rs7.glb',                  // Audi RS7 Sportback Performance
        maserati: './assets/models/maserati.glb',             // Maserati GranTurismo Trofeo
        panamera: './assets/models/panamera_wagon.glb',       // Porsche Panamera Turbo S Sport Turismo
        elantra_n: './assets/models/elantra_n.glb',           // Hyundai Elantra N TCR

        // Budget & Classic Russian
        vaz2107: './assets/models/vaz2107.glb',       // Real VAZ-2107 «Жигули» (57.45 MB, 724 meshes)
        vaz2109: './assets/models/vaz2109.glb',       // Authentic VAZ-2109 «Девятка» (3.83 MB)
        gaz24: './assets/models/gaz24.glb',           // Authentic GAZ-24 «Волга» (6.28 MB)
        priora: './assets/models/priora.glb',         // Authentic Lada Priora (6.33 MB)
        vesta: './assets/models/vesta.glb',           // Authentic Lada Vesta Sport (7.15 MB)
        solaris: './assets/models/hyundai.glb',       // Authentic Hyundai sedan (1.15 MB, fast load)
        polo: './assets/models/golf7.glb',            // Real 2014 Volkswagen Golf GTI (2.4 MB, 98k polygons)

        // JDM & Sport Legends
        mark2: './assets/models/mark2.glb',          // Authentic Toyota Mark II JZX100 (599 KB)
        subaru: './assets/models/subaru_wrx.glb',     // Authentic Subaru Impreza WRX STI sports sedan (3.79 MB)
        m5e60: './assets/models/bmw.glb',            // Real BMW Sport Sedan (2.97 MB, fast load)
        silvia: './assets/models/nissan_370z.glb',    // Real Nissan Z34 JDM Drift Sport Coupe (3.54 MB)
        camry: './assets/models/camry-xv40.glb', // CC BY 4.0: Ford mondeo / tnikita; see model credits.
        lc300: './assets/models/landcruiser.glb',     // Real Toyota Land Cruiser (1.41 MB, fast load)
        gtr: './assets/models/gtr.glb',               // Real Nissan GT-R R35 Nismo (10.22 MB)

        // Premium & Luxury
        e63: './assets/models/mercedes_v8.glb',       // Real Mercedes-Benz AMG V8 Biturbo Sedan (5.63 MB)
        rs6: './assets/models/rs3.glb',               // Real Audi RS Performance Sportback (1.88 MB, 88k polygons)
        m5f90: './assets/models/bmw_m4.glb',         // Real 2021 BMW M Competition (9.49 MB)
        m8: './assets/models/bmw_i8.glb',             // Real BMW Flagship Performance (10.57 MB)
        g63: './assets/models/g63.glb',               // Real Mercedes-AMG G63 Gelik (3.70 MB, 1084 meshes)

        // Supercars & Hypercars
        porsche911: './assets/models/porsche.glb',    // Real Porsche 911 Turbo S (3.38 MB)
        huracan: './assets/models/lamborghini.glb',   // Real Lamborghini Huracan Performante (12.44 MB)
        cullinan: './assets/models/phantom.glb',      // Real Rolls-Royce Flagship (1.2 MB, 428k polygons, Pantheon grille, Spirit of Ecstasy)
        sf90: './assets/models/ferrari.glb',          // Real Ferrari SF90 Stradale (1.60 MB)
        chiron: './assets/models/chiron.glb',         // Real Bugatti Chiron Super Sport (1.28 MB)
        jesko: './assets/models/hypercar.glb'         // Real Koenigsegg Jesko Attack (3.58 MB)
    };

    function resolveModelUrl(carId){const url=GLB_MODEL_MAP[carId];if(!url)return url;const meta=typeof window!=='undefined'&&window.NomeraModelAssets?.[url.split('/').pop()];return typeof window!=='undefined'&&window.NomeraMobileTextures?window.NomeraMobileTextures.url(url,meta):meta?url+'?v='+meta.version:url;}
    const rawGLBCache = new Map();
    const inFlightGLBPromises = new Map();
    const NOMERA_MODEL_CACHE_NAME = 'nomera-glb-cache-v4'; // upgraded from nomera-glb-cache-v3

    async function storeModelBuffer(cache, absUrl, response) {
        await cache.put(absUrl, response);
        if (typeof cache.keys !== 'function') return;
        const current=new URL(absUrl),manifest=window.NomeraModelAssets||{};
        const entries=[];
        for(const request of await cache.keys()){
            const url=new URL(request.url);
            // Remove obsolete variants of this asset, including the unversioned wheel model.
            if(url.pathname===current.pathname&&url.href!==current.href){await cache.delete(request);continue;}
            const bytes=window.NomeraMobileTextures?.bytes(url.href)||manifest[url.pathname.split('/').pop()]?.bytes;
            if(bytes)entries.push({request,bytes});
        }
        let total=entries.reduce((sum,item)=>sum+item.bytes,0),count=entries.length;
        for(const entry of entries){
            if(total<=128*1024*1024&&count<=8)break;
            if(entry.request.url===absUrl)continue;
            await cache.delete(entry.request);total-=entry.bytes;count--;
        }
    }

    async function fetchCachedGLBBuffer(modelUrl) {
        if (!modelUrl) return null;
        if (typeof window !== 'undefined' && window.caches && typeof window.fetch === 'function') {
            try {
                const cache = await window.caches.open(NOMERA_MODEL_CACHE_NAME);
                const absUrl = (typeof window.location !== 'undefined' && window.location.href)
                    ? new URL(modelUrl, window.location.href).href
                    : modelUrl;
                const matched = (await cache.match(absUrl)) || (await cache.match(modelUrl));
                if (matched) {
                    return await matched.arrayBuffer();
                }
                const response = await fetch(modelUrl);
                if (response && response.ok) {
                    const cacheClone = typeof response.clone === 'function' ? response.clone() : null;
                    const buffer = await response.arrayBuffer();
                    try {
                        if (cacheClone) {
                            storeModelBuffer(cache, absUrl, cacheClone).catch(() => {});
                        } else {
                            const cacheResponse = new Response(buffer.slice(0), {
                                headers: {
                                    'Content-Type': 'model/gltf-binary',
                                    'Content-Length': String(buffer.byteLength)
                                }
                            });
                            storeModelBuffer(cache, absUrl, cacheResponse).catch(() => {});
                        }
                    } catch (_) {}
                    return buffer;
                }
            } catch (_) {}
        }
        return null;
    }

    function getGLTFLoader(THREE) {
        if (!THREE.GLTFLoader) return null;
        if (THREE.Cache) {
            THREE.Cache.enabled = true;
        }
        if (THREE._nomeraGLTFLoader) return THREE._nomeraGLTFLoader;
        const loader = new THREE.GLTFLoader();
        if (THREE.DRACOLoader) {
            const draco = new THREE.DRACOLoader();
            draco.setDecoderPath('./js/vendor/draco/');
            loader.setDRACOLoader(draco);
        }
        if (typeof window !== 'undefined' && window.MeshoptDecoder) {
            loader.setMeshoptDecoder(window.MeshoptDecoder);
            if (window.MeshoptDecoder.ready && typeof window.MeshoptDecoder.ready.then === 'function') {
                window.MeshoptDecoder.ready.then(() => {
                    loader.setMeshoptDecoder(window.MeshoptDecoder);
                }).catch(() => {});
            }
        }
        THREE._nomeraGLTFLoader = loader;
        return loader;
    }
    const createConfiguredGLTFLoader = getGLTFLoader;

    function createVinylCanvasTexture(THREE, vinylType, carColorHex) {
        if (!THREE || !vinylType || vinylType === 'none') return null;
        if (typeof document === 'undefined' || !document.createElement) return null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            const baseColorStr = '#' + ('000000' + (carColorHex || 0xefefef).toString(16)).slice(-6);
            ctx.fillStyle = baseColorStr;
            ctx.fillRect(0, 0, 512, 512);

            if (vinylType === 'stripes') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(215, 0, 36, 512);
                ctx.fillRect(261, 0, 36, 512);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                ctx.fillRect(211, 0, 4, 512);
                ctx.fillRect(251, 0, 4, 512);
                ctx.fillRect(257, 0, 4, 512);
                ctx.fillRect(297, 0, 4, 512);
            } else if (vinylType === 'drift') {
                ctx.save();
                ctx.fillStyle = '#ff2a5f';
                ctx.beginPath();
                ctx.moveTo(0, 180);
                ctx.lineTo(240, 20);
                ctx.lineTo(280, 20);
                ctx.lineTo(40, 240);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#00f0ff';
                ctx.beginPath();
                ctx.moveTo(60, 260);
                ctx.lineTo(340, 50);
                ctx.lineTo(380, 50);
                ctx.lineTo(100, 320);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(120, 340);
                ctx.lineTo(440, 90);
                ctx.lineTo(480, 90);
                ctx.lineTo(160, 400);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#fffa20';
                for (let i = 0; i < 6; i++) {
                    const sx = 200 + i * 45;
                    const sy = 180 + i * 35;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx + 35, sy - 15);
                    ctx.lineTo(sx + 20, sy + 25);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            } else if (vinylType === 'mw_m3gtr') {
                // Iconic NFS Most Wanted BMW M3 GTR Silver & Deep Cobalt Blue Livery
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(0, 0, 512, 512);
                ctx.fillStyle = '#1d4ed8';
                ctx.fillRect(64, 0, 74, 512);
                ctx.fillRect(374, 0, 74, 512);
                ctx.beginPath();
                ctx.moveTo(0, 120);
                ctx.lineTo(512, 220);
                ctx.lineTo(512, 290);
                ctx.lineTo(0, 190);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(60, 0, 4, 512);
                ctx.fillRect(138, 0, 4, 512);
                ctx.fillRect(370, 0, 4, 512);
                ctx.fillRect(448, 0, 4, 512);
            } else if (vinylType === 'mw_razor') {
                // Razor #15 / #1 Blacklist Flame Tribal Livery
                ctx.fillStyle = '#09090b';
                ctx.fillRect(0, 0, 512, 512);
                ctx.fillStyle = '#f97316';
                for (let i = 0; i < 5; i++) {
                    const y = 50 + i * 95;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(390 - i * 25, y + 25);
                    ctx.lineTo(220, y + 60);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.fillStyle = '#facc15';
                ctx.fillRect(228, 0, 22, 512);
                ctx.fillRect(262, 0, 22, 512);
            } else if (vinylType === 'mw_cross') {
                // Sergeant Cross Rockport PD Federal Interceptor Livery
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(0, 0, 512, 512);
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(0, 165, 512, 180);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(0, 155, 512, 10);
                ctx.fillRect(0, 345, 512, 10);
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(236, 0, 40, 512);
            } else if (vinylType === 'mw_blacklist') {
                // Blacklist Boss Crimson & Carbon Tribal Livery
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(320, 160);
                ctx.lineTo(140, 260);
                ctx.lineTo(490, 420);
                ctx.lineTo(0, 512);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#18181b';
                ctx.fillRect(205, 0, 102, 512);
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(200, 0, 5, 512);
                ctx.fillRect(307, 0, 5, 512);
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.needsUpdate = true;
            return texture;
        } catch (_) {
            return null;
        }
    }

    function applyStanceToWheelNodes(THREE, modelRoot, styling = {}) {
        if (!THREE || !modelRoot || typeof modelRoot.traverse !== 'function') return;
        const camberDeg = Number(styling.camber) || 0;
        const camberRad = (camberDeg * Math.PI) / 180;
        const spacerOffset = Number(styling.wheelOffset) || 0;

        const wheelCandidates = [];
        modelRoot.traverse(node => {
            if (isIgnoredAccessoryOrRigNode(node, modelRoot)) return;
            const nm = String(node.name || '').toLowerCase();
            if (/(?:wheel|koles|tyre|tire|rim)[_\-\s]*(?:fl|fr|rl|rr|f_l|f_r|r_l|r_r|front_l|front_r|rear_l|rear_r|l|r|01|02|03|04|\d)?/i.test(nm)) {
                if (!nm.includes('steer') && !nm.includes('interior') && !nm.includes('cabin')) {
                    wheelCandidates.push(node);
                }
            }
        });

        const topWheels = wheelCandidates.filter(node => {
            let p = node.parent;
            while (p && p !== modelRoot) {
                if (wheelCandidates.includes(p)) return false;
                p = p.parent;
            }
            return true;
        });

        modelRoot.updateMatrixWorld(true);
        topWheels.forEach(wNode => {
            if (wNode.userData._basePosX === undefined) {
                wNode.userData._basePosX = wNode.position.x;
                wNode.userData._baseRotZ = wNode.rotation.z;
                wNode.userData._side = wNode.position.x < -0.05 ? -1 : (wNode.position.x > 0.05 ? 1 : 0);
            }
            if (!wNode.userData._stanceBasePosition) {
                wNode.userData._stanceBasePosition = wNode.position.clone();
                const box = new THREE.Box3().setFromObject(wNode);
                const center = box.isEmpty() ? wNode.getWorldPosition(new THREE.Vector3()) : box.getCenter(new THREE.Vector3());
                wNode.userData._stanceLocalHub = center.clone().applyMatrix4(wNode.matrixWorld.clone().invert());
                wNode.userData._stanceParentHub = center.clone().applyMatrix4(wNode.parent.matrixWorld.clone().invert());
            }
            const side = wNode.userData._side;
            if (side === -1) {
                wNode.position.x = wNode.userData._basePosX - spacerOffset;
                wNode.rotation.z = (wNode.userData._baseRotZ || 0) - camberRad;
            } else if (side === 1) {
                wNode.position.x = wNode.userData._basePosX + spacerOffset;
                wNode.rotation.z = (wNode.userData._baseRotZ || 0) + camberRad;
            }
            if (side) {
                // GLBs often store the wheel vertices away from the node's
                // origin. Apply camber around its hub, not the body origin.
                wNode.position.copy(wNode.userData._stanceBasePosition);
                if (camberRad) {
                    const rotatedHub = new THREE.Vector3().copy(wNode.userData._stanceLocalHub).multiply(wNode.scale).applyQuaternion(wNode.quaternion);
                    wNode.position.copy(wNode.userData._stanceParentHub).sub(rotatedHub);
                }
                wNode.position.x += side * spacerOffset;
            }
            wNode.userData.camber = camberDeg;
            wNode.userData.wheelOffset = spacerOffset;
        });
    }

    // =========================================================================
    // 💡 VOLUMETRIC AUTOMOTIVE UNDERGLOW GROUND TEXTURE GENERATOR
    // =========================================================================
    function createUnderglowGroundTexture(THREE, colorHex) {
        if (!THREE || typeof document === 'undefined' || !document.createElement) return null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            const cObj = new THREE.Color(colorHex !== undefined ? colorHex : 0x00f0ff);
            const r = Math.round(140 + cObj.r * 115);
            const g = Math.round(140 + cObj.g * 115);
            const b = Math.round(140 + cObj.b * 115);

            if (typeof ctx.clearRect === 'function') {
                ctx.clearRect(0, 0, 256, 512);
            }

            if (typeof ctx.createRadialGradient === 'function') {
                // 1. Soft ambient floorpan core + Gaussian outward falloff
                const outerGrad = ctx.createRadialGradient(128, 256, 14, 128, 256, 228);
                outerGrad.addColorStop(0.0, `rgba(${r}, ${g}, ${b}, 0.52)`);
                outerGrad.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.40)`);
                outerGrad.addColorStop(0.78, `rgba(${r}, ${g}, ${b}, 0.14)`);
                outerGrad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0.0)`);
                ctx.fillStyle = outerGrad;
                ctx.fillRect(0, 0, 256, 512);

                // 2. Feathered neon rails under left/right side skirts (x ~ 22% and 78%, z ~ 18%..82%)
                [56, 200].forEach(rx => {
                    for (let ry = 96; ry <= 416; ry += 32) {
                        const railGrad = ctx.createRadialGradient(rx, ry, 2, rx, ry, 52);
                        railGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.45)');
                        railGrad.addColorStop(0.24, `rgba(${r}, ${g}, ${b}, 0.62)`);
                        railGrad.addColorStop(0.62, `rgba(${r}, ${g}, ${b}, 0.20)`);
                        railGrad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0.0)`);
                        ctx.fillStyle = railGrad;
                        ctx.fillRect(0, 0, 256, 512);
                    }
                });

                // 3. Front and rear apron glow pools
                [92, 420].forEach(ry => {
                    const endGrad = ctx.createRadialGradient(128, ry, 6, 128, ry, 80);
                    endGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.32)');
                    endGrad.addColorStop(0.30, `rgba(${r}, ${g}, ${b}, 0.50)`);
                    endGrad.addColorStop(0.70, `rgba(${r}, ${g}, ${b}, 0.16)`);
                    endGrad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0.0)`);
                    ctx.fillStyle = endGrad;
                    ctx.fillRect(0, 0, 256, 512);
                });
            }

            const tex = new THREE.CanvasTexture(canvas);
            tex.needsUpdate = true;
            return tex;
        } catch (_) {
            return null;
        }
    }

    // =========================================================================
    // 🚪 INTERACTIVE RIG GENERATOR FOR ALL 25 GLB CAR MODELS (TRUE MESH SLICING)
    // Partitions real GLB door, hood, and trunk triangles into articulated
    // Door_FL_Pivot, Door_FR_Pivot, Hood_Pivot, and Trunk_Pivot groups with
    // 0.000mm closed offset, and tucks EngineBayGroup / SubwooferGroup strictly
    // beneath the measured hoodDeckY and trunkDeckY.
    // =========================================================================
    function ensureGLBInteractiveRig(THREE, modelRoot, styling, carId, mats, styledPaint) {
        if (!THREE || !modelRoot) return null;

        let rig = modelRoot.getObjectByName('GLB_InteractiveRig');
        if (rig) {
            // Update paint, glass, chrome, trim, and neon materials on existing sliced panels & rig
            rig.traverse(child => {
                if (!child.isMesh) return;
                if (child.userData._stylingRoles && child.material) {
                    const isMulti = Array.isArray(child.material);
                    const matList = isMulti ? child.material : [child.material];
                    const updated = matList.map((m, idx) => {
                        const role = child.userData._stylingRoles[idx];
                        if (role === 'body') {
                            if (m && m.userData && m.userData.preserveLiveryMap && !styling.customPaintOverride && (!styling.vinyl || styling.vinyl === 'none')) return m;
                            return styledPaint;
                        }
                        if (role === 'glass') return mats.glass;
                        if (role === 'chrome') return mats.chrome;
                        if (role === 'trim') return mats.trim;
                        if (role === 'interior') return mats.interior;
                        if (role === 'grille') return mats.grilleMesh;
                        return m;
                    });
                    child.material = isMulti ? updated : updated[0];
                } else if (child.userData.isInteractiveBody) {
                    if (!(child.material && child.material.userData && child.material.userData.preserveLiveryMap && !styling.customPaintOverride && (!styling.vinyl || styling.vinyl === 'none'))) {
                        child.material = styledPaint;
                    }
                } else if (child.userData.isInteractiveGlass) {
                    child.material = mats.glass;
                } else if (child.userData.isInteractiveNeon && styling && styling.neon && styling.neon !== 'none') {
                    const nCol = parseColor(styling.neon, 0x38bdf8);
                    if (child.material && child.material.color) {
                        child.material.color.setHex(nCol);
                        if (child.material.emissive) child.material.emissive.setHex(nCol);
                    }
                }
            });
            return rig;
        }

        modelRoot.updateMatrixWorld(true);
        const invRootMatrix = new THREE.Matrix4().copy(modelRoot.matrixWorld).invert();

        // 1. Measure clean vehicle bounding box in modelRoot local space
        const box = new THREE.Box3();
        if (modelRoot.userData && modelRoot.userData.baseBoundingBox && !modelRoot.userData.baseBoundingBox.isEmpty()) {
            box.copy(modelRoot.userData.baseBoundingBox);
        } else {
            let hasMesh = false;
            modelRoot.traverse(c => {
                if (!c.isMesh || !c.geometry) return;
                if (isIgnoredAccessoryOrRigNode(c, modelRoot)) return;
                if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
                if (c.geometry.boundingBox && !c.geometry.boundingBox.isEmpty()) {
                    const relMat = invRootMatrix.clone().multiply(c.matrixWorld);
                    const lb = c.geometry.boundingBox.clone().applyMatrix4(relMat);
                    box.union(lb);
                    hasMesh = true;
                }
            });
            if (!hasMesh || box.isEmpty()) {
                box.set(new THREE.Vector3(-0.90, 0, -2.20), new THREE.Vector3(0.90, 1.40, 2.20));
            }
            modelRoot.userData.baseBoundingBox = box.clone();
        }

        const size = box.getSize(new THREE.Vector3());
        const W = Math.max(1.4, Math.min(2.3, size.x || 1.82));
        const H = Math.max(1.0, Math.min(2.1, size.y || 1.38));
        const L = Math.max(3.4, Math.min(5.5, size.z || 4.40));
        const minY = box.min.y;
        const centerZ = (box.min.z + box.max.z) * 0.5;

        const profile = getCarProfile(carId);
        const isSUV = !!(profile && (profile.isSuv || profile === 'suv'));
        const isSupercar = !!(profile && (profile.isSupercar || profile === 'supercar'));
        const isHatch = !!(profile && (profile.isHatch || profile === 'hatch')) || ['vaz2109', 'rs6', 'g63', 'lc300', 'cullinan'].includes(carId);
        const isButterfly = !!(profile && profile.isButterfly) || ['huracan', 'sf90', 'chiron', 'jesko', 'm8'].includes(carId);

        // 2. Collect candidate meshes & measure actual hoodDeckY and trunkDeckY from exterior body triangles
        const sliceableRoles = { body: true, glass: true, chrome: true, trim: true, interior: true };
        const candidateMeshes = [];
        const hoodSampleYs = [];
        const trunkSampleYs = [];

        const tv0 = new THREE.Vector3();
        const tv1 = new THREE.Vector3();
        const tv2 = new THREE.Vector3();
        const te1 = new THREE.Vector3();
        const te2 = new THREE.Vector3();
        const tfn = new THREE.Vector3();
        const tn0 = new THREE.Vector3();

        function isInsideWheelOrSkippedAncestor(node) {
            let p = node;
            while (p && p !== modelRoot) {
                if (p.userData && (p.userData.isSteerable || p.userData.isWheelSpinner || p.userData.isInteractiveRigNode || p.userData.isLicensePlate)) {
                    return true;
                }
                const nm = String(p.name || '');
                if (/^(?:Wheel_|WheelsRig|GLB_InteractiveRig|GLB_NeonTubes|NeonGroup|GLB_SpoilerGroup|SpoilerGroup|GLB_BodykitGroup|GLB_RoofScoopGroup|GLB_HoodGroup|LicensePlatesGroup|FrontLicensePlate|RearLicensePlate|GLB_FrontLicensePlate|GLB_RearLicensePlate|Plate_01|Plate_02)/i.test(nm)) {
                    return true;
                }
                p = p.parent;
            }
            return false;
        }

        function getAncestorPartGroupBucket(node) {
            let p = node;
            while (p && p !== modelRoot) {
                const nm = String(p.name || '').toLowerCase();
                if (nm === 'door_03' || nm === 'door_fl' || nm === 'door_lf') return 'doorFL';
                if (nm === 'door_01' || nm === 'door_fr' || nm === 'door_rf') return 'doorFR';
                if (nm === 'door_02' || nm === 'door_04' || nm === 'door_rl' || nm === 'door_rr') return 'static';
                if (nm === 'baggage' || nm === 'trunk_lid' || nm === 'boot_lid') return 'trunk';
                if (nm === 'hood_panel' || nm === 'bonnet_panel') return 'hood';
                p = p.parent;
            }
            return null;
        }

        function isUnsliceableMeshOrTransform(node, relMat) {
            const nm = String((node && node.name) || '').toLowerCase();
            if (/(?:rear_window|front_window|windshield|headlight|brakelight|taillight|rearkit|frontkit|spoiler|wing|skirt|sill|fender|bumper|diffuser|splitter|grille|exhaust|wheel|tire|tyre|rim|brake|caliper|hub|disk|disc|mirror_glass|placa|plate|logo|emblem|badge)/i.test(nm)) {
                return true;
            }
            if (relMat && relMat.elements) {
                const e = relMat.elements;
                const sx = Math.hypot(e[0], e[1], e[2]) || 1;
                const sy = Math.hypot(e[4], e[5], e[6]) || 1;
                const sz = Math.hypot(e[8], e[9], e[10]) || 1;
                // If child mesh has a rotated/axis-swapped local coordinate frame relative to modelRoot, do not slice its triangles
                if (Math.abs(e[0]) / sx < 0.70 || Math.abs(e[5]) / sy < 0.70 || Math.abs(e[10]) / sz < 0.70) {
                    return true;
                }
            }
            return false;
        }

        modelRoot.traverse(c => {
            if (!c.isMesh || !c.visible || !c.geometry || !c.geometry.attributes || !c.geometry.attributes.position) return;
            if (isIgnoredAccessoryOrRigNode(c, modelRoot) || isInsideWheelOrSkippedAncestor(c)) return;
            const roles = c.userData && c.userData._stylingRoles;
            const role0 = (roles && roles[0]) || 'stock';
            if (!sliceableRoles[role0]) return;

            const relMat = invRootMatrix.clone().multiply(c.matrixWorld);
            const normalMat = new THREE.Matrix3().getNormalMatrix(relMat);
            if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
            const meshBox = c.geometry.boundingBox
                ? c.geometry.boundingBox.clone().applyMatrix4(relMat)
                : new THREE.Box3();

            const ancestorBucket = getAncestorPartGroupBucket(c);
            const skipSlicing = !ancestorBucket && isUnsliceableMeshOrTransform(c, relMat);

            candidateMeshes.push({
                mesh: c,
                role0,
                roles: roles ? roles.slice() : [role0],
                origMatNames: (c.userData && c.userData._origMatNames) ? c.userData._origMatNames.slice() : [],
                relMat,
                normalMat,
                meshBox,
                ancestorBucket: skipSlicing ? 'static' : ancestorBucket
            });

            if (role0 === 'body') {
                const posAttr = c.geometry.attributes.position;
                const idxAttr = c.geometry.index;
                const triCount = idxAttr ? Math.floor(idxAttr.count / 3) : Math.floor(posAttr.count / 3);
                const step = triCount > 6000 ? Math.max(1, Math.floor(triCount / 3000)) : 1;
                for (let t = 0; t < triCount; t += step) {
                    const i0 = idxAttr ? idxAttr.getX(t * 3) : t * 3;
                    const i1 = idxAttr ? idxAttr.getX(t * 3 + 1) : t * 3 + 1;
                    const i2 = idxAttr ? idxAttr.getX(t * 3 + 2) : t * 3 + 2;
                    tv0.fromBufferAttribute(posAttr, i0).applyMatrix4(relMat);
                    tv1.fromBufferAttribute(posAttr, i1).applyMatrix4(relMat);
                    tv2.fromBufferAttribute(posAttr, i2).applyMatrix4(relMat);
                    const cx = (tv0.x + tv1.x + tv2.x) / 3;
                    const cy = (tv0.y + tv1.y + tv2.y) / 3;
                    const cz = (tv0.z + tv1.z + tv2.z) / 3;
                    if (Math.abs(cx) >= W * 0.30) continue;

                    te1.subVectors(tv1, tv0);
                    te2.subVectors(tv2, tv0);
                    tfn.crossVectors(te1, te2).normalize();
                    const ny = Math.abs(tfn.y);

                    if (ny > 0.45 && cz >= centerZ + L * 0.18 && cz <= centerZ + L * 0.38 && cy >= minY + H * 0.30 && cy <= minY + H * 0.85) {
                        hoodSampleYs.push(cy);
                    }
                    if (ny > 0.35 && cz >= centerZ - L * 0.40 && cz <= centerZ - L * 0.25 && cy >= minY + H * 0.30 && cy <= minY + H * 0.78) {
                        trunkSampleYs.push(cy);
                    }
                }
            }
        });

        hoodSampleYs.sort((a, b) => a - b);
        trunkSampleYs.sort((a, b) => a - b);
        const hoodDeckY = hoodSampleYs.length >= 3
            ? hoodSampleYs[Math.floor(hoodSampleYs.length * 0.65)]
            : (minY + H * 0.52);
        const trunkDeckY = trunkSampleYs.length >= 3
            ? trunkSampleYs[Math.floor(trunkSampleYs.length * 0.65)]
            : (minY + H * 0.52);

        // 3. Define the 4 Articulation Regions & Pivot Hinges
        const zDoorFront = centerZ + L * 0.145;
        const zDoorRear = centerZ - L * 0.17;
        const zHoodHinge = centerZ + L * 0.14;
        const zTrunkHinge = centerZ - L * 0.23;
        const trunkHingeY = (isHatch || isSUV) ? (box.max.y - 0.06) : trunkDeckY;

        rig = new THREE.Group();
        rig.name = 'GLB_InteractiveRig';
        rig.userData.isInteractiveRigNode = true;

        const doorFLPivot = new THREE.Group();
        doorFLPivot.name = 'Door_FL_Pivot';
        doorFLPivot.position.set(-W * 0.46, minY + H * 0.44, zDoorFront);
        doorFLPivot.userData.isButterflyDoor = isButterfly;
        doorFLPivot.userData.isSlicedGLBPivot = true;
        doorFLPivot.visible = true;
        rig.add(doorFLPivot);

        const doorFRPivot = new THREE.Group();
        doorFRPivot.name = 'Door_FR_Pivot';
        doorFRPivot.position.set(W * 0.46, minY + H * 0.44, zDoorFront);
        doorFRPivot.userData.isButterflyDoor = isButterfly;
        doorFRPivot.userData.isSlicedGLBPivot = true;
        doorFRPivot.visible = true;
        rig.add(doorFRPivot);

        const hoodPivot = new THREE.Group();
        hoodPivot.name = 'Hood_Pivot';
        hoodPivot.position.set(0, hoodDeckY, zHoodHinge);
        hoodPivot.userData.isSlicedGLBPivot = true;
        hoodPivot.visible = true;
        rig.add(hoodPivot);

        const trunkPivot = new THREE.Group();
        trunkPivot.name = 'Trunk_Pivot';
        trunkPivot.position.set(0, trunkHingeY, zTrunkHinge);
        trunkPivot.userData.isSlicedGLBPivot = true;
        trunkPivot.visible = true;
        rig.add(trunkPivot);

        const pivotMap = {
            doorFL: doorFLPivot,
            doorFR: doorFRPivot,
            hood: hoodPivot,
            trunk: trunkPivot
        };

        // Pre-pass: check if any meshes are standalone panels (e.g. vaz2107 Door_01/Door_03/Baggage or Object_58_Body_0 hood)
        const hasDedicated = { doorFL: false, doorFR: false, hood: false, trunk: false };
        candidateMeshes.forEach(item => {
            if (item.ancestorBucket && hasDedicated[item.ancestorBucket] !== undefined) {
                item.wholeBucket = item.ancestorBucket;
                hasDedicated[item.ancestorBucket] = true;
                return;
            }
            if (item.ancestorBucket === 'static') {
                item.wholeBucket = 'static';
                return;
            }
            const mb = item.meshBox;
            if (mb.isEmpty()) return;
            const spanZ = mb.max.z - mb.min.z;
            const spanX = mb.max.x - mb.min.x;
            // Standalone hood panel mesh (e.g. Object_58_Body_0 in vaz2107)
            if (item.role0 === 'body' && spanZ > L * 0.14 && spanZ < L * 0.45 && spanX > W * 0.45 &&
                mb.min.z >= centerZ + L * 0.10 && mb.max.z <= box.max.z - L * 0.005 && mb.min.y >= hoodDeckY - 0.18) {
                item.wholeBucket = 'hood';
                hasDedicated.hood = true;
            } else if (item.role0 === 'body' && spanZ > L * 0.10 && spanZ < L * 0.38 && spanX > W * 0.45 &&
                mb.max.z <= centerZ - L * 0.19 && mb.min.z >= box.min.z + L * 0.005 && mb.min.y >= trunkDeckY - 0.18) {
                item.wholeBucket = 'trunk';
                hasDedicated.trunk = true;
            }
        });

        function buildSlicedGeometry(geo, triList, toRootMatrix, toRootNormalMatrix, pivotOffset) {
            const posAttr = geo.attributes.position;
            const normAttr = geo.attributes.normal;
            const uvAttr = geo.attributes.uv;
            const uv2Attr = geo.attributes.uv2;
            const colorAttr = geo.attributes.color;
            const indexAttr = geo.index;
            const vCount = triList.length * 3;
            const positions = new Float32Array(vCount * 3);
            const normals = new Float32Array(vCount * 3);
            const uvs = uvAttr ? new Float32Array(vCount * 2) : null;
            const uv2s = uv2Attr ? new Float32Array(vCount * 2) : null;
            const colorItemSize = colorAttr ? (colorAttr.itemSize || 3) : 0;
            const colors = colorAttr ? new Float32Array(vCount * colorItemSize) : null;

            const hasGroups = Array.isArray(geo.groups) && geo.groups.length > 0;
            const groups = geo.groups;
            let currentGroupMat = -1;
            let currentGroupStart = 0;
            const outGroups = [];

            for (let k = 0; k < triList.length; k++) {
                const t = triList[k];
                const baseIdx = t * 3;
                const i0 = indexAttr ? indexAttr.getX(baseIdx) : baseIdx;
                const i1 = indexAttr ? indexAttr.getX(baseIdx + 1) : baseIdx + 1;
                const i2 = indexAttr ? indexAttr.getX(baseIdx + 2) : baseIdx + 2;

                if (hasGroups) {
                    let gMat = 0;
                    for (let gi = 0; gi < groups.length; gi++) {
                        const g = groups[gi];
                        if (baseIdx >= g.start && baseIdx < g.start + g.count) {
                            gMat = g.materialIndex || 0;
                            break;
                        }
                    }
                    if (gMat !== currentGroupMat) {
                        if (currentGroupMat !== -1) {
                            outGroups.push({ start: currentGroupStart, count: k * 3 - currentGroupStart, materialIndex: currentGroupMat });
                        }
                        currentGroupMat = gMat;
                        currentGroupStart = k * 3;
                    }
                }

                const inds = [i0, i1, i2];
                if (!normAttr) {
                    tv0.fromBufferAttribute(posAttr, i0);
                    tv1.fromBufferAttribute(posAttr, i1);
                    tv2.fromBufferAttribute(posAttr, i2);
                    if (toRootMatrix) {
                        tv0.applyMatrix4(toRootMatrix);
                        tv1.applyMatrix4(toRootMatrix);
                        tv2.applyMatrix4(toRootMatrix);
                    }
                    te1.subVectors(tv1, tv0);
                    te2.subVectors(tv2, tv0);
                    tfn.crossVectors(te1, te2).normalize();
                }

                for (let vi = 0; vi < 3; vi++) {
                    const srcIdx = inds[vi];
                    const dstVert = k * 3 + vi;
                    tv0.fromBufferAttribute(posAttr, srcIdx);
                    if (toRootMatrix) {
                        tv0.applyMatrix4(toRootMatrix);
                    }
                    if (pivotOffset) {
                        tv0.sub(pivotOffset);
                    }
                    positions[dstVert * 3] = tv0.x;
                    positions[dstVert * 3 + 1] = tv0.y;
                    positions[dstVert * 3 + 2] = tv0.z;

                    if (normAttr) {
                        tn0.fromBufferAttribute(normAttr, srcIdx);
                        if (toRootNormalMatrix) {
                            tn0.applyMatrix3(toRootNormalMatrix).normalize();
                        }
                        normals[dstVert * 3] = tn0.x;
                        normals[dstVert * 3 + 1] = tn0.y;
                        normals[dstVert * 3 + 2] = tn0.z;
                    } else {
                        normals[dstVert * 3] = tfn.x;
                        normals[dstVert * 3 + 1] = tfn.y;
                        normals[dstVert * 3 + 2] = tfn.z;
                    }

                    if (uvs && uvAttr) {
                        uvs[dstVert * 2] = uvAttr.getX(srcIdx);
                        uvs[dstVert * 2 + 1] = uvAttr.getY(srcIdx);
                    }
                    if (uv2s && uv2Attr) {
                        uv2s[dstVert * 2] = uv2Attr.getX(srcIdx);
                        uv2s[dstVert * 2 + 1] = uv2Attr.getY(srcIdx);
                    }
                    if (colors && colorAttr) {
                        colors[dstVert * colorItemSize] = colorAttr.getX(srcIdx);
                        if (colorItemSize > 1) colors[dstVert * colorItemSize + 1] = colorAttr.getY(srcIdx);
                        if (colorItemSize > 2) colors[dstVert * colorItemSize + 2] = colorAttr.getZ(srcIdx);
                        if (colorItemSize > 3 && typeof colorAttr.getW === 'function') colors[dstVert * colorItemSize + 3] = colorAttr.getW(srcIdx);
                    }
                }
            }

            if (hasGroups && currentGroupMat !== -1) {
                outGroups.push({ start: currentGroupStart, count: vCount - currentGroupStart, materialIndex: currentGroupMat });
            }

            const newGeo = new THREE.BufferGeometry();
            newGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            newGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
            if (uvs) {
                newGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
            }
            if (uv2s) {
                newGeo.setAttribute('uv2', new THREE.BufferAttribute(uv2s, 2));
            }
            if (colors) {
                newGeo.setAttribute('color', new THREE.BufferAttribute(colors, colorItemSize));
            }
            for (let gi = 0; gi < outGroups.length; gi++) {
                const og = outGroups[gi];
                newGeo.addGroup(og.start, og.count, og.materialIndex);
            }
            newGeo.computeBoundingBox();
            newGeo.computeBoundingSphere();
            newGeo.userData.preserveBuffers = true;
            return newGeo;
        }

        const slicedCounts = { doorFL: 0, doorFR: 0, hood: 0, trunk: 0 };

        // 4. Partition real GLB mesh triangles into static, doorFL, doorFR, hood, trunk
        candidateMeshes.forEach(item => {
            const { mesh, role0, roles, origMatNames, relMat, normalMat, wholeBucket } = item;
            if (wholeBucket === 'static') return;
            if (!wholeBucket && role0 === 'interior') return; // Keep cabin seats/dashboard static

            const geo = mesh.geometry;
            const posAttr = geo.attributes.position;
            const normAttr = geo.attributes.normal;
            const idxAttr = geo.index;
            const triCount = idxAttr ? Math.floor(idxAttr.count / 3) : Math.floor(posAttr.count / 3);
            if (triCount <= 0) return;

            const buckets = {
                static: [],
                doorFL: [],
                doorFR: [],
                hood: [],
                trunk: []
            };

            if (wholeBucket && buckets[wholeBucket]) {
                for (let t = 0; t < triCount; t++) {
                    buckets[wholeBucket].push(t);
                }
            } else {
                for (let t = 0; t < triCount; t++) {
                    const i0 = idxAttr ? idxAttr.getX(t * 3) : t * 3;
                    const i1 = idxAttr ? idxAttr.getX(t * 3 + 1) : t * 3 + 1;
                    const i2 = idxAttr ? idxAttr.getX(t * 3 + 2) : t * 3 + 2;

                    tv0.fromBufferAttribute(posAttr, i0).applyMatrix4(relMat);
                    tv1.fromBufferAttribute(posAttr, i1).applyMatrix4(relMat);
                    tv2.fromBufferAttribute(posAttr, i2).applyMatrix4(relMat);

                    const cx = (tv0.x + tv1.x + tv2.x) / 3;
                    const cy = (tv0.y + tv1.y + tv2.y) / 3;
                    const cz = (tv0.z + tv1.z + tv2.z) / 3;

                    const minX = Math.min(tv0.x, tv1.x, tv2.x);
                    const maxX = Math.max(tv0.x, tv1.x, tv2.x);
                    const minYTri = Math.min(tv0.y, tv1.y, tv2.y);
                    const maxYTri = Math.max(tv0.y, tv1.y, tv2.y);
                    const minZ = Math.min(tv0.z, tv1.z, tv2.z);
                    const maxZ = Math.max(tv0.z, tv1.z, tv2.z);
                    const triSpanX = maxX - minX;
                    const triSpanY = maxYTri - minYTri;
                    const triSpanZ = maxZ - minZ;

                    if (normAttr) {
                        tn0.fromBufferAttribute(normAttr, i0).applyMatrix3(normalMat).normalize();
                    } else {
                        te1.subVectors(tv1, tv0);
                        te2.subVectors(tv2, tv0);
                        tn0.crossVectors(te1, te2).normalize();
                    }
                    const nx = tn0.x;
                    const ny = tn0.y;
                    const nz = tn0.z;

                    let targetBucket = 'static';
                    // Guard against slicing long side planks, side skirts, fenders, or decals spanning across panel seams
                    const isCompactPanelTri = (
                        triSpanZ <= L * 0.22 &&
                        triSpanY <= H * 0.30 &&
                        triSpanX <= W * 0.38
                    );

                    if (isCompactPanelTri) {
                        // A. Hood region (all 3 vertices strictly within hood bounds)
                        if (!hasDedicated.hood && (role0 === 'body' || role0 === 'chrome' || role0 === 'trim') &&
                            Math.abs(cx) < W * 0.37 &&
                            minX >= -W * 0.39 && maxX <= W * 0.39 &&
                            minZ >= zHoodHinge - 0.02 && maxZ <= box.max.z - L * 0.03 &&
                            minYTri > hoodDeckY - 0.11 && ny > 0.35) {
                            targetBucket = 'hood';
                        }
                        // B. Trunk region (all 3 vertices strictly within trunk bounds)
                        else if (!hasDedicated.trunk && Math.abs(cx) < W * 0.37 &&
                            minX >= -W * 0.39 && maxX <= W * 0.39 &&
                            minZ >= box.min.z + L * 0.02 && maxZ <= zTrunkHinge + 0.02 &&
                            minYTri > trunkDeckY - 0.11) {
                            if (isHatch || isSUV) {
                                if ((role0 === 'body' || role0 === 'glass' || role0 === 'chrome' || role0 === 'trim') &&
                                    (ny > 0.25 || nz < -0.35)) {
                                    targetBucket = 'trunk';
                                }
                            } else {
                                if ((role0 === 'body' || role0 === 'chrome' || role0 === 'trim') &&
                                    maxYTri < minY + H * 0.78 &&
                                    (ny > 0.30 || (nz < -0.45 && cy > trunkDeckY - 0.05))) {
                                    targetBucket = 'trunk';
                                }
                            }
                        }
                        // C. Front Left Door region (all 3 vertices strictly within left door hinge box)
                        else if (!hasDedicated.doorFL && (role0 === 'body' || role0 === 'glass' || role0 === 'chrome' || role0 === 'trim') &&
                            cx < -W * 0.26 && maxX <= -W * 0.22 &&
                            minZ >= zDoorRear - 0.015 && maxZ <= zDoorFront + 0.015 &&
                            minYTri >= minY + H * 0.15 && maxYTri <= box.max.y - 0.015 &&
                            nx < -0.25 && !(role0 === 'glass' && Math.abs(nx) < 0.42)) {
                            targetBucket = 'doorFL';
                        }
                        // D. Front Right Door region (all 3 vertices strictly within right door hinge box)
                        else if (!hasDedicated.doorFR && (role0 === 'body' || role0 === 'glass' || role0 === 'chrome' || role0 === 'trim') &&
                            cx > W * 0.26 && minX >= W * 0.22 &&
                            minZ >= zDoorRear - 0.015 && maxZ <= zDoorFront + 0.015 &&
                            minYTri >= minY + H * 0.15 && maxYTri <= box.max.y - 0.015 &&
                            nx > 0.25 && !(role0 === 'glass' && Math.abs(nx) < 0.42)) {
                            targetBucket = 'doorFR';
                        }
                    }

                    buckets[targetBucket].push(t);
                }
            }

            const movedCount = buckets.doorFL.length + buckets.doorFR.length + buckets.hood.length + buckets.trunk.length;
            if (movedCount === 0) return;

            // Update static mesh geometry without mutating shared cached BufferAttributes
            if (buckets.static.length === 0) {
                const emptyGeo = new THREE.BufferGeometry();
                emptyGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
                mesh.geometry = emptyGeo;
            } else {
                mesh.geometry = buildSlicedGeometry(geo, buckets.static, null, null, null);
            }

            // Create child meshes inside each pivot for non-empty buckets
            ['doorFL', 'doorFR', 'hood', 'trunk'].forEach(bKey => {
                const triList = buckets[bKey];
                if (!triList || triList.length === 0) return;
                const pivotGrp = pivotMap[bKey];
                const subGeo = buildSlicedGeometry(geo, triList, relMat, normalMat, pivotGrp.position);
                const subMesh = new THREE.Mesh(subGeo, mesh.material);
                subMesh.name = `${mesh.name}_${bKey}`;
                subMesh.castShadow = mesh.castShadow;
                subMesh.receiveShadow = mesh.receiveShadow;
                subMesh.renderOrder = mesh.renderOrder || (role0 === 'glass' ? 2 : 0);
                subMesh.userData._stylingRoles = roles.slice();
                subMesh.userData._origMatNames = origMatNames.slice();
                if (mesh.userData && mesh.userData._origBodyMats) {
                    subMesh.userData._origBodyMats = mesh.userData._origBodyMats.slice();
                }
                subMesh.userData.isSlicedGLBPart = true;
                subMesh.userData.sliceBucket = bKey;
                subMesh.userData.preserveBuffers = true;
                if (role0 === 'body') subMesh.userData.isInteractiveBody = true;
                if (role0 === 'glass') subMesh.userData.isInteractiveGlass = true;
                pivotGrp.add(subMesh);
                slicedCounts[bKey] += triList.length;
            });
        });

        if (!modelRoot.userData) modelRoot.userData = {};
        modelRoot.userData.measuredHoodDeckY = hoodDeckY;
        modelRoot.userData.measuredTrunkDeckY = trunkDeckY;

        const cavityMat = new THREE.MeshStandardMaterial({
            color: 0x050507,
            roughness: 0.96,
            metalness: 0.05,
            name: 'InteractiveCavityBlack'
        });
        const engineMetalMat = new THREE.MeshStandardMaterial({
            color: 0x272a30,
            roughness: 0.45,
            metalness: 0.75,
            name: 'InteractiveEngineMetal'
        });
        const valveCoverColor = (carId === 'gtr' || carId === 'sf90' || carId === 'subaru' || carId === 'vesta' || carId === 'm5f90')
            ? 0xdc2626
            : (carId === 'huracan' || carId === 'jesko' ? 0xd97706 : 0x3b82f6);
        const valveMat = new THREE.MeshStandardMaterial({
            color: valveCoverColor,
            roughness: 0.30,
            metalness: 0.60,
            name: 'InteractiveValveCover'
        });
        const subCarpetMat = new THREE.MeshStandardMaterial({
            color: 0x111216,
            roughness: 0.92,
            metalness: 0.05,
            name: 'InteractiveSubCarpet'
        });
        const neonRingCol = parseColor(styling && styling.neon && styling.neon !== 'none' ? styling.neon : '#38bdf8', 0x38bdf8);
        const neonRingMat = new THREE.MeshStandardMaterial({
            color: neonRingCol,
            emissive: neonRingCol,
            emissiveIntensity: 1.5,
            roughness: 0.2,
            name: 'InteractiveSubNeon'
        });

        function createBufferQuadGeo(wX, hY, lZ) {
            const g = new THREE.BufferGeometry();
            const hx = wX * 0.5, hy = hY * 0.5, hz = lZ * 0.5;
            const pos = new Float32Array([
                -hx, -hy,  hz,   hx, -hy,  hz,   hx,  hy,  hz,
                -hx, -hy,  hz,   hx,  hy,  hz,  -hx,  hy,  hz,
                -hx,  hy, -hz,   hx,  hy, -hz,   hx,  hy,  hz,
                -hx,  hy, -hz,   hx,  hy,  hz,  -hx,  hy,  hz
            ]);
            const norm = new Float32Array([
                0, 0, 1,  0, 0, 1,  0, 0, 1,
                0, 0, 1,  0, 0, 1,  0, 0, 1,
                0, 1, 0,  0, 1, 0,  0, 1, 0,
                0, 1, 0,  0, 1, 0,  0, 1, 0
            ]);
            g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            g.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
            g.computeBoundingBox();
            g.computeBoundingSphere();
            g.userData.preserveBuffers = true;
            return g;
        }

        // 5. Fallback BufferGeometry panel only if a synthetic 12-tri BoxGeometry test mock had 0 sliced triangles
        const doorSpanL = zDoorFront - zDoorRear;
        const doorSpanH = H * 0.34;
        [-1, 1].forEach(side => {
            const pivot = side < 0 ? doorFLPivot : doorFRPivot;
            const bKey = side < 0 ? 'doorFL' : 'doorFR';
            if (slicedCounts[bKey] === 0) {
                const fallbackDoor = new THREE.Mesh(
                    createBufferQuadGeo(0.012, doorSpanH * 0.88, doorSpanL * 0.88),
                    styledPaint
                );
                fallbackDoor.position.set(-side * 0.008, -H * 0.04, -doorSpanL * 0.5);
                fallbackDoor.userData.isInteractiveBody = true;
                fallbackDoor.userData.isSlicedGLBPart = true;
                fallbackDoor.userData.isOpenOnlyLiner = true;
                fallbackDoor.visible = false;
                pivot.add(fallbackDoor);
            }
        });

        const hoodSpanW = W * 0.56;
        const hoodSpanL = L * 0.18;
        if (slicedCounts.hood === 0) {
            const fallbackHood = new THREE.Mesh(createBufferQuadGeo(hoodSpanW, 0.010, hoodSpanL), styledPaint);
            fallbackHood.position.set(0, -0.01, hoodSpanL * 0.5);
            fallbackHood.userData.isInteractiveBody = true;
            fallbackHood.userData.isSlicedGLBPart = true;
            fallbackHood.userData.isOpenOnlyLiner = true;
            fallbackHood.visible = false;
            hoodPivot.add(fallbackHood);
        }
        const trunkSpanW = W * 0.54;
        const trunkSpanL = L * 0.13;
        if (slicedCounts.trunk === 0) {
            const fallbackTrunk = new THREE.Mesh(createBufferQuadGeo(trunkSpanW, 0.010, trunkSpanL), styledPaint);
            fallbackTrunk.position.set(0, -0.01, -trunkSpanL * 0.5);
            fallbackTrunk.userData.isInteractiveBody = true;
            fallbackTrunk.userData.isSlicedGLBPart = true;
            fallbackTrunk.userData.isOpenOnlyLiner = true;
            fallbackTrunk.visible = false;
            trunkPivot.add(fallbackTrunk);
        }

        // 6. Recessed EngineBayGroup (strictly below hoodDeckY, top surface <= hoodDeckY - 0.02)
        const engZ = centerZ + L * 0.27;
        const engTopY = hoodDeckY - 0.05;
        const engineBayGroup = new THREE.Group();
        engineBayGroup.name = 'EngineBayGroup';
        engineBayGroup.position.set(0, engTopY, engZ);
        engineBayGroup.visible = false;

        const hoodCavity = new THREE.Mesh(new THREE.BoxGeometry(hoodSpanW, 0.02, hoodSpanL), cavityMat);
        hoodCavity.name = 'Hood_Cavity';
        hoodCavity.position.set(0, -0.11, 0);
        engineBayGroup.add(hoodCavity);

        const engBlock = new THREE.Mesh(new THREE.BoxGeometry(hoodSpanW * 0.54, 0.09, hoodSpanL * 0.62), engineMetalMat);
        engBlock.name = 'Engine_Block';
        engBlock.position.set(0, -0.06, 0);
        engineBayGroup.add(engBlock);

        const valveCover = new THREE.Mesh(new THREE.BoxGeometry(hoodSpanW * 0.44, 0.035, hoodSpanL * 0.52), valveMat);
        valveCover.name = 'Engine_ValveCover';
        valveCover.position.set(0, -0.005, 0);
        engineBayGroup.add(valveCover);

        const intakeGeo = new THREE.CylinderGeometry(0.020, 0.020, hoodSpanW * 0.40, 12);
        intakeGeo.rotateZ(Math.PI / 2);
        const intakeManifold = new THREE.Mesh(intakeGeo, mats.chrome);
        intakeManifold.name = 'Engine_IntakePipe';
        intakeManifold.position.set(-hoodSpanW * 0.12, 0.005, hoodSpanL * 0.14);
        engineBayGroup.add(intakeManifold);

        const filterGeo = new THREE.ConeGeometry(0.032, 0.10, 14);
        filterGeo.rotateZ(Math.PI / 2);
        const airFilter = new THREE.Mesh(filterGeo, valveMat);
        airFilter.name = 'Engine_AirFilter';
        airFilter.position.set(-hoodSpanW * 0.32, -0.008, hoodSpanL * 0.18);
        engineBayGroup.add(airFilter);

        const strutGeo = new THREE.CylinderGeometry(0.011, 0.011, hoodSpanW * 0.86, 10);
        strutGeo.rotateZ(Math.PI / 2);
        const strutBrace = new THREE.Mesh(strutGeo, mats.chrome);
        strutBrace.name = 'Engine_StrutBar';
        strutBrace.position.set(0, 0.015, -hoodSpanL * 0.12);
        engineBayGroup.add(strutBrace);

        rig.add(engineBayGroup);

        // 7. Recessed SubwooferGroup (strictly below trunkDeckY, top surface <= trunkDeckY - 0.02)
        const subZ = centerZ - L * 0.32;
        const subTopY = trunkDeckY - 0.06;
        const subwooferGroup = new THREE.Group();
        subwooferGroup.name = 'SubwooferGroup';
        subwooferGroup.position.set(0, subTopY, subZ);
        subwooferGroup.visible = false;

        const trunkCavity = new THREE.Mesh(new THREE.BoxGeometry(trunkSpanW, 0.02, trunkSpanL), cavityMat);
        trunkCavity.name = 'Trunk_Cavity';
        trunkCavity.position.set(0, -0.10, 0);
        subwooferGroup.add(trunkCavity);

        const subBox = new THREE.Mesh(new THREE.BoxGeometry(trunkSpanW * 0.84, 0.09, trunkSpanL * 0.72), subCarpetMat);
        subBox.name = 'Subwoofer_Box';
        subBox.position.set(0, -0.045, 0.01);
        subwooferGroup.add(subBox);

        [-1, 1].forEach((side, idx) => {
            const subX = side * (trunkSpanW * 0.22);
            const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.022, 0.032, 18), subCarpetMat);
            cone.name = idx === 0 ? 'Subwoofer_Cone_L' : 'Subwoofer_Cone_R';
            cone.position.set(subX, 0.005, 0.01);
            subwooferGroup.add(cone);

            const ringGeo = new THREE.TorusGeometry(0.068, 0.008, 8, 24);
            ringGeo.rotateX(Math.PI / 2);
            const subRing = new THREE.Mesh(ringGeo, neonRingMat);
            subRing.userData.isInteractiveNeon = true;
            subRing.position.set(subX, 0.020, 0.01);
            subwooferGroup.add(subRing);
        });

        const ampRack = new THREE.Mesh(new THREE.BoxGeometry(trunkSpanW * 0.38, 0.022, trunkSpanL * 0.32), mats.chrome);
        ampRack.position.set(0, 0.008, -trunkSpanL * 0.26);
        subwooferGroup.add(ampRack);

        rig.add(subwooferGroup);

        modelRoot.add(rig);
        return rig;
    }

    function applyInteractiveAnglesToModel(model, doorAngle, hoodAngle, trunkAngle) {
        if (!model) return;
        const dOpen = doorAngle > 0.005;
        const hOpen = hoodAngle > 0.005;
        const tOpen = trunkAngle > 0.005;

        const pFL = model.getObjectByName('Door_FL_Pivot');
        const pFR = model.getObjectByName('Door_FR_Pivot');
        const dCav = model.getObjectByName('Door_CavityGroup');
        const pHood = model.getObjectByName('Hood_Pivot');
        const engBay = model.getObjectByName('EngineBayGroup');
        const pTrunk = model.getObjectByName('Trunk_Pivot');
        const subGroup = model.getObjectByName('SubwooferGroup');

        if (dCav) dCav.visible = dOpen;
        if (pFL) {
            pFL.visible = (pFL.userData && pFL.userData.isSlicedGLBPivot) ? true : dOpen;
            pFL.children.forEach(ch => {
                if (ch.userData && ch.userData.isOpenOnlyLiner) ch.visible = dOpen;
            });
            if (!dOpen) {
                pFL.rotation.set(0, 0, 0);
            } else if (pFL.userData && pFL.userData.isButterflyDoor) {
                pFL.rotation.x = 0;
                pFL.rotation.y = doorAngle * 0.72;
                pFL.rotation.z = -doorAngle * 0.55;
            } else {
                pFL.rotation.x = 0;
                pFL.rotation.y = doorAngle;
                pFL.rotation.z = 0;
            }
        }
        if (pFR) {
            pFR.visible = (pFR.userData && pFR.userData.isSlicedGLBPivot) ? true : dOpen;
            pFR.children.forEach(ch => {
                if (ch.userData && ch.userData.isOpenOnlyLiner) ch.visible = dOpen;
            });
            if (!dOpen) {
                pFR.rotation.set(0, 0, 0);
            } else if (pFR.userData && pFR.userData.isButterflyDoor) {
                pFR.rotation.x = 0;
                pFR.rotation.y = -doorAngle * 0.72;
                pFR.rotation.z = doorAngle * 0.55;
            } else {
                pFR.rotation.x = 0;
                pFR.rotation.y = -doorAngle;
                pFR.rotation.z = 0;
            }
        }

        if (engBay) engBay.visible = hOpen;
        if (pHood) {
            pHood.visible = (pHood.userData && pHood.userData.isSlicedGLBPivot) ? true : hOpen;
            pHood.children.forEach(ch => {
                if (ch.userData && ch.userData.isOpenOnlyLiner) ch.visible = hOpen;
            });
            if (!hOpen) {
                pHood.rotation.set(0, 0, 0);
            } else {
                pHood.rotation.set(-hoodAngle, 0, 0);
            }
        }

        if (subGroup) subGroup.visible = tOpen;
        if (pTrunk) {
            pTrunk.visible = (pTrunk.userData && pTrunk.userData.isSlicedGLBPivot) ? true : tOpen;
            pTrunk.children.forEach(ch => {
                if (ch.userData && ch.userData.isOpenOnlyLiner) ch.visible = tOpen;
            });
            if (!tOpen) {
                pTrunk.rotation.set(0, 0, 0);
            } else {
                pTrunk.rotation.set(trunkAngle, 0, 0);
            }
        }

        // If car has a trunk-mounted spoiler, rotate it smoothly with the trunk lid
        const spoiler = model.getObjectByName('GLB_SpoilerGroup') || model.getObjectByName('SpoilerGroup');
        if (spoiler && pTrunk) {
            if (!spoiler.userData._basePos) {
                spoiler.userData._basePos = spoiler.position.clone();
            }
            if (tOpen) {
                spoiler.rotation.x = trunkAngle * 0.85;
                spoiler.position.y = spoiler.userData._basePos.y + Math.sin(trunkAngle) * 0.22;
                spoiler.position.z = spoiler.userData._basePos.z + (1 - Math.cos(trunkAngle)) * 0.14;
            } else {
                spoiler.rotation.x = 0;
                spoiler.position.copy(spoiler.userData._basePos);
            }
        }
    }

    function applyStylingToGLTF(THREE, modelRoot, styling = {}, carId = '') {
        if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraAeroKit?.release(modelRoot);if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraVehicleFinish?.release(modelRoot);
        const baseCarId = (
            carId === 'corvette_webster' ? 'corvette_cross' :
            carId === 'mustang_jewels' ? 'mustang_razor' :
            carId === 'gallardo_ming' ? 'huracan' :
            carId === 'clk_kaze' ? 'e63' :
            carId === 'cayman_baron' ? 'porsche911' :
            carId === 'is300_taz' ? 'mark2' :
            carId === 'golf_sonny' ? 'polo' :
            carId === 'viper_jv' ? 'silvia' :
            carId === 'm3_g80' ? 'm5e60' :
            carId === 'evo8_earl' ? 'jesko' :
            carId
        );
        const defColor = getDefaultCarColor('', carId);
        const bodyColorHex = parseColor(styling.color || defColor, defColor);
        const mats = createCarMaterials(THREE, styling, '', carId);

        let suspensionOffsetY = 0;
        if (typeof styling.rideHeight === 'number') suspensionOffsetY = styling.rideHeight;
        else if (styling.suspension === 'bpan' || (!styling.suspension && carId === 'priora')) suspensionOffsetY = -0.06;
        else if (styling.suspension === 'lowered') suspensionOffsetY = -0.03;
        else if (styling.suspension === 'lift') suspensionOffsetY = 0.06;

        if (modelRoot.userData._basePosY === undefined) {
            modelRoot.userData._basePosY = modelRoot.position.y;
        }
        modelRoot.position.y = modelRoot.userData._basePosY + suspensionOffsetY;
        applyStanceToWheelNodes(THREE, modelRoot, styling);

        function isTireMaterial(matName, meshName) {
            const mn = String(matName || '').toLowerCase();
            const ms = String(meshName || '').toLowerCase();
            if (mn === 'tirerubber') return true;
            if (baseCarId === 'm3gtr') return mn === 'tire' || ms.includes('m_tire_high');
            if (baseCarId === 'corvette_cross') return mn === 'material.027' || (ms.includes('front_tire_a') && mn === '1_car_paint.005');
            if (baseCarId === 'mustang_razor') return mn === 'llantas';
            if (baseCarId === 'audir8') return mn === 'meshpart22mtl' || mn === 'meshpart24mtl';
            if (baseCarId === 'rx7') return mn === 'material.011';
            if (baseCarId === 'mclaren') return mn === 'tires';
            if (baseCarId === 'db9') return mn.includes('tire');
            if (baseCarId === 'supra') return mn === 'tires';
            if (baseCarId === 'eclipse_lou') return mn.includes('tire') || mn === 'wheel_1';
            if (baseCarId === 'elantra_n') return mn.includes('tire');
            if (baseCarId === 'maserati') return mn === 'tire';
            if (baseCarId === 'panamera') return ms.includes('tire') || ms.includes('tyre') || (ms.includes('wheel') && mn.includes('base'));
            if (baseCarId === 'x5m') return mn.includes('tire');
            if (baseCarId === 'rs7') return mn.startsWith('tire');
            if (baseCarId === 'subaru' && (ms === 'object_24' || mn === 'material_21')) return true;
            if (baseCarId === 'vaz2107' && (mn === 'tire' || (mn === 'black' && ms.includes('wheel')))) return true;
            if (baseCarId === 'vaz2109' && (mn === 'standardmater50' || mn === 'standardmater52')) return true;
            if (baseCarId === 'gaz24' && (mn === 'rubber' || ms.includes('rubber') || ms.includes('tire'))) return true;
            if (baseCarId === 'priora' && (mn === 'priora_wheel2' || ms.includes('wheel2'))) return true;
            if (baseCarId === 'vesta' && (ms.includes('tire') || ms.includes('rubber') || (mn === 'plastic' && ms.includes('wheel')) || (mn === 'chern' && ms.includes('koles')))) return true;
            if (baseCarId === 'solaris' && (mn === 'camrytire' || mn.includes('wheel_rubber') || ms.includes('tire'))) return true;
            if (baseCarId === 'polo' && (ms.includes('tire') || ms.includes('tyre') || (ms.includes('wheel') && mn.includes('base')))) return true;
            if (baseCarId === 'mark2' && (mn === 'rezina' || (mn === 'black' && (ms.includes('wheel') || ms.includes('tire'))))) return true;
            if (baseCarId === 'm5e60' && (mn === 'tire' || ms.includes('tire'))) return true;
            if (baseCarId === 'silvia' && (mn === 'tire1mtl' || ms.includes('tire'))) return true;
            if (baseCarId === 'lc300' && (ms.includes('tire') || ms.includes('rubber'))) return true;
            if (baseCarId === 'gtr' && (ms.includes('tire') || ms.includes('rubber') || mn.includes('tire') || mn.includes('rubber'))) return true;
            if (baseCarId === 'e63' && (mn === 'tyre' || ms.includes('tyre') || ms.includes('tire') || ms.includes('wheel1_tyre') || ms.includes('wheel2_tyre'))) return true;
            if (baseCarId === 'rs6' && (ms.includes('tyre') || ms.includes('tire'))) return true;
            if (baseCarId === 'm5f90' && (ms.includes('tyre') || ms.includes('tire'))) return true;
            if (baseCarId === 'm8' && (ms.includes('tyre') || ms.includes('tire'))) return true;
            if (baseCarId === 'g63' && (mn.includes('performance tyre rubber') || ms.includes('sculpted carcass'))) return true;
            if (baseCarId === 'porsche911' && (mn === 'rubber' || (mn === 'full_black' && ms.includes('wheel')))) return true;
            if (baseCarId === 'huracan' && (mn === 'mt_tyres' || mn.includes('tyre') || (mn.includes('black_mat') && ms.includes('wheel')))) return true;
            if (baseCarId === 'cullinan' && (mn === 'tire' || ms.includes('tire'))) return true;
            if (baseCarId === 'sf90' && (mn === 'tires' || ms === 'wheel')) return true;
            if (baseCarId === 'chiron' && (mn === 'tyre' || ((ms.includes('wheel_fl') || ms.includes('wheel_fr') || ms.includes('wheel_rl') || ms.includes('wheel_rr')) && (mn.includes('tyre') || mn.includes('rubber'))))) return true;
            if (baseCarId === 'jesko' && (mn === 'tyre_rubber' || ms.includes('wheel_fl_tyre') || ms.includes('tyre'))) return true;
            return (
                mn.includes('tire') ||
                mn.includes('tyre') ||
                mn.includes('rubber') ||
                mn.includes('rezina') ||
                mn.includes('tread') ||
                (ms.includes('tire') && !ms.includes('rim')) ||
                (ms.includes('tyre') && !ms.includes('rim'))
            );
        }

        function isBrakeMaterial(matName, meshName) {
            const mn = String(matName || '').toLowerCase();
            const ms = String(meshName || '').toLowerCase();
            // Never classify brakelights/taillights/glass, interior brake pedals/handbrakes, or alloy wheel_disc rims as brake rotors
            if (mn.includes('light') || mn.includes('lamp') || mn.includes('glass') || ms.includes('light') || ms.includes('lamp') || ms.includes('glass')) return false;
            if (ms.includes('pedal') || ms.includes('parking') || ms.includes('handbrake') || ms.includes('lever')) return false;
            if (mn.includes('wheel_disc') || ms.includes('wheel_disc') || ms.includes('wheel_disk') || ms.includes('wheel00')) return false;
            if (baseCarId === 'm3gtr' && ms.includes('sm_hub_')) return false;
            if (baseCarId === 'corvette_cross') return mn === 'material.021';
            if (baseCarId === 'rx7') return mn === 'material.015';
            if (baseCarId === 'panamera') return mn.includes('callipergloss');
            if (baseCarId === 'rs7') return mn.startsWith('brake') || mn.includes('brakedisc');
            if (baseCarId === 'subaru' && (ms === 'object_4' || ms === 'object_16' || mn === 'material_1' || mn === 'material_13')) return true;
            if (baseCarId === 'vaz2109' && mn === 'standardmater48') return true;
            if (baseCarId === 'polo' && mn.includes('callipergloss')) return true;
            if (baseCarId === 'm5e60' && mn === 'etriers') return true;
            if (baseCarId === 'silvia' && (mn === 'caliper1mtl' || mn === 'rotor1mtl')) return true;
            if (baseCarId === 'lc300' && mn.includes('tmi_change_brake')) return true;
            if (baseCarId === 'gtr' && mn.includes('brakerotor')) return true;
            if (baseCarId === 'e63' && (ms.includes('wheel1_red_0') || ms.includes('wheel2_red_0'))) return true;
            if (baseCarId === 'rs6' && (mn.includes('armat_details_brake1') || mn.includes('armat_disk1'))) return true;
            if (baseCarId === 'm8' && (mn.includes('calliperbadge') || mn.includes('callipergloss'))) return true;
            if (baseCarId === 'g63' && (mn.includes('amg red caliper enamel') || mn.includes('brushed brake steel'))) return true;
            if (baseCarId === 'huracan' && mn === 'mt_brakecaliper') return true;
            if (baseCarId === 'cullinan' && mn === 'brake_3') return true;
            if (baseCarId === 'sf90' && (ms === 'brake' || ms === 'brakes')) return true;
            if (baseCarId === 'chiron' && (mn === 'caliper' || mn === 'brake_disc')) return true;
            if (baseCarId === 'm3gtr' && (mn === 'mmat_details_disk1' || (mn === 'mmat_tire_brake_048' && ms.includes('sm_brake_')))) return true;
            return (
                mn.includes('caliper') ||
                mn.includes('rotor') ||
                mn.includes('disc') ||
                mn.includes('brake') ||
                mn.includes('etrier') ||
                mn.includes('breaks') ||
                ms.includes('caliper') ||
                ms.includes('brake')
            );
        }

        function isLightMaterial(matName, meshName) {
            const mn = String(matName || '').toLowerCase();
            const ms = String(meshName || '').toLowerCase();
            if (baseCarId === 'corvette_cross') {
                return mn === 'headlightreflector_headlight_left' || mn === 'material.043' || mn === 'aluminum_brakelight_right' || mn === 'gl_glow_glass_g';
            }
            if (baseCarId === 'mustang_razor') {
                return mn === 'faros_glass' || mn === 'rojo_faros_tras' || mn === 'faros_tras' || mn === 'base_faros';
            }
            if (baseCarId === 'rx7') return mn === 'material.018' || mn === 'material.002';
            if (baseCarId === 'db9') return mn === 'lighta' || mn === 'glassred' || mn === 'glassamber';
            if (baseCarId === 'maserati') return mn === 'lights' || mn === 'glassred' || mn === 'glassamber';
            if (baseCarId === 'panamera') return mn.includes('lighta_material') || mn === 'red_glass';
            if (baseCarId === 'rs7') return mn.startsWith('faralights') || mn === 'stop';
            if (baseCarId === 'subaru' && (
                ms === 'object_14' || ms === 'object_18' ||
                ms === 'object_19' || ms === 'object_20' ||
                mn === 'material_11' || mn === 'material_15' ||
                mn === 'material_16' || mn === 'material_17' ||
                mn === 'material_14' || mn === 'material_7'
            )) return true;
            if (baseCarId === 'vaz2107' && (mn.includes('orange light') || mn.includes('red light') || mn === 'white')) return true;
            if (baseCarId === 'vaz2109' && (mn === 'standardmater7' || mn === 'standardmater3' || mn === 'standardmater5')) return true;
            if (baseCarId === 'gaz24' && (mn === 'orange_plastic' || mn === 'headlight' || mn === 'reverse_lights' || mn === 'tail_lights' || mn === 'reflector')) return true;
            if (baseCarId === 'priora' && (mn === 'priora_optik_rear' || mn === 'priora_red')) return true;
            if (baseCarId === 'vesta' && (mn === 'fari' || mn === 'peredfar' || mn === 'svetplas' || mn === 'stopar')) return true;
            if (baseCarId === 'solaris' && (mn === 'orangeglass' || mn === 'redglass' || mn.includes('front_lamps') || mn.includes('brakelights_red'))) return true;
            if (baseCarId === 'polo' && (mn.includes('lighta_material1') || mn === 'red_glass')) return true;
            if (baseCarId === 'mark2' && (mn === 'red1' || mn === 'red2' || mn === 'orange')) return true;
            if (baseCarId === 'm5e60' && (mn.includes('wire_060110190') || mn.includes('wire_087225143') || mn.includes('wire_135110008') || mn.includes('taillight_reflector') || mn === 'r_glass' || mn.includes('bmw_e30_m3_lens'))) return true;
            if (baseCarId === 'silvia' && mn.includes('lights1mtl')) return true;
            if (baseCarId === 'lc300' && (mn.includes('tmi_glass_light') || mn.includes('tmi_light') || mn.includes('chromered_squarepattern'))) return true;
            if (baseCarId === 'e63' && (mn === 'bulb' || mn === 'rear_bulb' || mn === 'bulb_red' || ms.includes('bulb'))) return true;
            if (baseCarId === 'rs6' && mn.includes('mat_lights.001')) return true;
            if (baseCarId === 'm5f90' && (ms.includes('headlight') || mn.includes('material_706') || mn.includes('material_701') || mn.includes('material_707') || mn.includes('material_708'))) return true;
            if (baseCarId === 'm8' && (mn.includes('i8elite_2017lighta') || mn === 'emis' || mn === 'red_glass')) return true;
            if (baseCarId === 'g63' && (mn.includes('headlamp optical') || mn.includes('ruby led taillamp') || mn.includes('amber indicator') || mn.includes('light guides') || mn.includes('passive ruby reflector'))) return true;
            if (baseCarId === 'porsche911' && mn === 'lights') return true;
            if (baseCarId === 'huracan' && (mn.includes('mt_headlight') || mn.includes('mt_reflector') || mn.includes('mt_turnlights') || mn.includes('mt_light_emissive'))) return true;
            if (baseCarId === 'cullinan' && (mn.includes('front_lite') || mn.includes('front_head_light') || mn === 'light')) return true;
            if (baseCarId === 'sf90' && (mn === 'taillight_glass' || mn === 'projector_glass' || mn === 'turn_signal_led' || ms === 'lights_red' || ms === 'steering_red_lights')) return true;
            if (baseCarId === 'chiron' && (mn.includes('headlight') || mn.includes('taillight'))) return true;
            if (baseCarId === 'jesko' && (mn === 'light_white' || mn === 'light_red' || ms.includes('frontlight') || ms.includes('taillight'))) return true;
            if (baseCarId === 'm3gtr' && (mn === 'mmat_lights_014' || mn === 'red_glass')) return true;
            return (
                mn.includes('taillight') ||
                mn.includes('headlight') ||
                mn.includes('taillamp') ||
                mn.includes('turnlight') ||
                mn.includes('indicator') ||
                mn.includes('blinker') ||
                mn.includes('brakelight') ||
                mn.includes('projector') ||
                mn.includes('light_red') ||
                mn.includes('light_white') ||
                mn.includes('bulb') ||
                mn.includes('fari') ||
                mn.includes('svetplas') ||
                mn.includes('stopar') ||
                mn.includes('reflector') ||
                ms.includes('headlight') ||
                ms.includes('taillight') ||
                ms.includes('lamp')
            );
        }

        function isExhaustMaterial(matName, meshName) {
            const mn = String(matName || '').toLowerCase();
            const ms = String(meshName || '').toLowerCase();
            if (baseCarId === 'corvette_cross' && mn === 'escapes') return true;
            if (baseCarId === 'subaru' && (ms === 'object_25' || mn === 'material_22')) return true;
            if (baseCarId === 'vaz2109' && mn === 'standardmater4') return true;
            if (baseCarId === 'priora' && mn === 'priora_glush') return true;
            if (baseCarId === 'm5e60' && mn === 'chrome_ok' && (ms.includes('exhaust') || ms.includes('pot'))) return true;
            if (baseCarId === 'silvia' && mn.includes('lodaexhaust')) return true;
            if (baseCarId === 'lc300' && mn.includes('tmi_exhaust')) return true;
            if (baseCarId === 'huracan' && (ms.includes('exhaust') || ms.includes('pipes'))) return true;
            if (baseCarId === 'chiron' && mn === 'exhaust') return true;
            return (
                mn.includes('exhaust') ||
                mn.includes('muffler') ||
                mn.includes('tailpipe') ||
                mn.includes('glush') ||
                ms.includes('exhaust') ||
                ms.includes('muffler')
            );
        }

        function isInteriorMaterial(matName, meshName) {
            const mn = String(matName || '').toLowerCase();
            const ms = String(meshName || '').toLowerCase();
            if (baseCarId === 'corvette_cross') return ms.includes('base_b') || mn === 'material.052' || mn === 'material.051';
            if (baseCarId === 'mustang_razor') return mn === 'interiores';
            if (baseCarId === 'rx7') return mn === 'material.001';
            if (baseCarId === 'mclaren') return mn.startsWith('int_');
            if (baseCarId === 'panamera') return mn.includes('interiora_material') || mn.includes('seatbelt');
            if (baseCarId === 'rs7') return mn === 'salon';
            if (baseCarId === 'subaru' && (ms === 'object_3' || ms === 'object_6' || mn === 'material_0' || mn === 'material_3')) return true;
            if (baseCarId === 'vaz2107' && (mn === 'interior_01' || mn === 'interior_02' || ms.includes('interior_01') || ms.includes('interior_02'))) return true;
            if (baseCarId === 'vaz2109' && (
                mn === 'standardmater32' || mn === 'standardmater34' || mn === 'standardmater35' ||
                mn === 'standardmater36' || mn === 'standardmater37' || mn === 'standardmater10' ||
                mn === 'standardmater12' || mn === 'standardmater13' || mn === 'standardmater14' ||
                mn === 'standardmater15' || mn === 'standardmater16' || mn === 'standardmater17' ||
                mn === 'standardmater8' || mn === 'standardmater9' || mn === 'standardmater18' ||
                mn === 'standardmater39' || mn === 'standardmater41' || mn === 'standardmater43' ||
                mn === 'standardmater44' || mn === 'standardmater54' || mn === 'standardmater57' ||
                mn === 'standardmater59' || mn === 'standardmater62'
            )) return true;
            if (baseCarId === 'gaz24' && (mn.includes('interior') || mn === 'derma')) return true;
            if (baseCarId === 'priora' && (mn.includes('priora_leather') || mn.includes('priora_salon') || mn.includes('priora_prib') || mn.includes('priora_bar') || mn.includes('priora_polik') || mn.includes('priora_pedals') || mn.includes('priora_obivka'))) return true;
            if (baseCarId === 'vesta' && mn === 'kover') return true;
            if (baseCarId === 'polo' && (mn.includes('interiora_material1') || mn.includes('seatbelt'))) return true;
            if (baseCarId === 'mark2' && mn === 'inrteer') return true;
            if (baseCarId === 'm5e60' && (mn.includes('interior') || mn === 'sieges')) return true;
            if (baseCarId === 'silvia' && mn.includes('lodainterior')) return true;
            if (baseCarId === 'lc300' && (mn.includes('tmi_cabin') || mn.includes('tmi_dashboard'))) return true;
            if (baseCarId === 'e63' && mn === 'interior_plastic') return true;
            if (baseCarId === 'rs6' && mn.includes('mat_details_int')) return true;
            if (baseCarId === 'm5f90' && (mn.includes('i8elite_2017interior') || mn.includes('interiortillingcolourzone'))) return true;
            if (baseCarId === 'm8' && (mn.includes('i8elite_2017interior') || mn.includes('interiortillingcolourzone'))) return true;
            if (baseCarId === 'g63' && (mn.includes('anthracite cabin') || mn.includes('deep oxblood nappa') || mn.includes('mbux display'))) return true;
            if (baseCarId === 'huracan' && (mn === 'mt_interior_black' || ms.includes('digital_gauge') || ms.includes('bump_plastic3'))) return true;
            if (baseCarId === 'cullinan' && (mn.includes('interior_side_box') || mn.includes('interior_ac') || mn.includes('inside_button') || mn.includes('car_stearning') || mn.includes('steering_box') || mn.includes('back_speaker'))) return true;
            if (baseCarId === 'sf90' && (mn.includes('leather') || mn.includes('interior') || mn === 'carpet' || ms.includes('steering'))) return true;
            if (baseCarId === 'm3gtr') return mn.includes('mmat_details_int') || mn === 'driver' || (ms.includes('sm_interior') && mn === 'mmat_carbon1');
            return (
                mn.includes('interior') ||
                mn.includes('salon') ||
                mn.includes('seat') ||
                mn.includes('sieges') ||
                mn.includes('leather') ||
                mn.includes('alcantara') ||
                mn.includes('dashboard') ||
                mn.includes('cockpit') ||
                mn.includes('steering') ||
                mn.includes('carpet') ||
                mn.includes('kover') ||
                ms.includes('interior') ||
                ms.includes('cabin') ||
                ms.includes('seat') ||
                ms.includes('steering') ||
                ms.includes('dash')
            );
        }

        function isGrilleMaterial(matName, meshName) {
            const mn = String(matName || '').toLowerCase();
            const ms = String(meshName || '').toLowerCase();
            if (baseCarId === 'audir8') return false;
            if (baseCarId === 'corvette_cross') return mn === 'grill_grill_01' || mn === 'grill_engine' || mn === 'rejas_tras' || mn === 'rejitas';
            if (baseCarId === 'mustang_razor') return mn === 'parrillas_frontal' || mn === 'rejjas_lat';
            if (baseCarId === 'panamera') return mn.includes('grille1a') || mn.includes('grille2a') || mn.includes('grille3a');
            if (baseCarId === 'subaru' && (ms === 'object_10' || ms === 'object_22' || mn === 'material_7' || mn === 'material_19')) return true;
            if (baseCarId === 'vaz2107' && (ms.includes('grille') || ms.includes('radiator'))) return true;
            if (baseCarId === 'polo' && (mn.includes('grille1a') || mn.includes('grille2a'))) return true;
            if (baseCarId === 'lc300' && mn.includes('cabin_grid')) return true;
            if (baseCarId === 'rs6' && mn === 'mat_details_grid01') return true;
            if (baseCarId === 'm8' && mn.includes('i8elite_2017grille')) return true;
            if (baseCarId === 'cullinan' && mn === 'font_grill_cover') return true;
            if (baseCarId === 'chiron' && mn === 'grill') return true;
            if (baseCarId === 'jesko' && (mn === 'hypercar_intakeblack' || ms.includes('intake') || ms.includes('diffuser'))) return true;
            if (baseCarId === 'm3gtr' && (mn.includes('mmat_details_grid') || mn === 'mmat_details_1')) return true;
            return (
                mn.includes('grille') ||
                mn.includes('grill') ||
                (mn.includes('mesh') && !mn.startsWith('meshpart')) ||
                mn.includes('intercooler') ||
                mn.includes('radiator') ||
                mn.includes('intake') ||
                ms.includes('grille') ||
                ms.includes('intercooler')
            );
        }

        function isGlassMaterial(mat, matName, meshName) {
            const mn = String(matName || '').toLowerCase();
            const ms = String(meshName || '').toLowerCase();

            // Never classify carbon fiber splitters/wings/seats (e.g. KIT00_FRONT_WINDOW_A_fibra carbono_0 on corvette_cross) as glass!
            if (mn.includes('carbon') || mn.includes('fibra')) return false;

            if (baseCarId === 'corvette_cross') return mn.includes('gl_basic_glass');
            if (baseCarId === 'mustang_razor') return mn === 'ventans' || mn === 'detalles_ventanas' || mn === 'detalle_parabrisas';
            if (baseCarId === 'audir8') return mn === 'meshpart8mtl' || mn === 'meshpart16mtl' || mn === 'meshpart20mtl';
            if (baseCarId === 'rx7') return mn === 'material.003' || mn === 'material.008' || mn === 'material.016';
            if (baseCarId === 'mclaren') return mn === 'windows' || mn === 'windows_alpha' || mn === 'clear_glass';
            if (baseCarId === 'db9') return mn === 'glassmtl';
            if (baseCarId === 'supra') return mn === 'glass';
            if (baseCarId === 'eclipse_lou') return mn === 'window';
            if (baseCarId === 'elantra_n') return mn.includes('glass');
            if (baseCarId === 'maserati') return mn === 'window' || mn === 'windowdark' || mn === 'glassclear';
            if (baseCarId === 'panamera') return mn.includes('window_material');
            if (baseCarId === 'x5m') return mn === 'windows';
            if (baseCarId === 'rs7') return mn === 'glass' && ms === 'glass';
            if (baseCarId === 'subaru' && (ms === 'object_12' || ms === 'object_23' || mn === 'material_9' || mn === 'material_20')) return true;
            if (baseCarId === 'vaz2107' && (mn === 'glass' || ms.includes('object_722_glass'))) return true;
            if (baseCarId === 'vaz2109' && (mn === 'fenster' || ms.includes('fenster'))) return true;
            if (baseCarId === 'gaz24' && (mn.includes('lens') || mn === 'glass')) return true;
            if (baseCarId === 'priora' && (mn.includes('vehglass') || mn.includes('glass') || mn.includes('window'))) return true;
            if (baseCarId === 'vesta' && (mn === 'steklo' || mn === 'stekloton' || mn.includes('windows') || mn.includes('glass'))) return true;
            if (baseCarId === 'solaris' && (mn === 'clearglass' || mn === 'windowglass' || mn === 'darkglass')) return true;
            if (baseCarId === 'polo' && (mn.includes('window_material1') || ms.includes('window_geo') || ms.includes('windowinside'))) return true;
            if (baseCarId === 'mark2' && (mn === 'glass' || mn.includes('window') || mn.includes('glass'))) return true;
            if (baseCarId === 'm5e60' && (mn === 'glass' || mn === 'glass_toit')) return true;
            if (baseCarId === 'silvia' && mn.includes('windows1mtl')) return true;
            if (baseCarId === 'lc300' && mn === 'tmi_glass_011') return true;
            if (baseCarId === 'gtr' && mn === 'マテリアル.653') return true;
            if (baseCarId === 'e63' && (mn === 'glass' || ms.includes('body_glass'))) return true;
            if (baseCarId === 'rs6' && mn === 'mat_glass') return true;
            if (baseCarId === 'm5f90' && (ms.includes('glsslight') || mn === 'material_161' || mn === 'material_716' || mn === 'material_717' || mn === 'material_718')) return true;
            if (baseCarId === 'm8' && mn.includes('i8elite_2017window')) return true;
            if (baseCarId === 'g63' && (mn.includes('tinted automotive glass') || mn.includes('privacy rear glazing'))) return true;
            if (baseCarId === 'porsche911' && (mn === 'window' || mn === 'glass')) return true;
            if (baseCarId === 'huracan' && (mn === 'mt_windscreens' || mn === 'mt_glass_translucent')) return true;
            if (baseCarId === 'cullinan' && (mn === 'car_glass' || mn.includes('glass_rim'))) return true;
            if (baseCarId === 'sf90' && mn === 'glass_gray') return true;
            if (baseCarId === 'chiron' && (mn === 'glass_window' || mn === 'mirror_glass')) return true;
            if (baseCarId === 'jesko' && (mn === 'glass_darktint' || ms.includes('canopy'))) return true;
            if (baseCarId === 'm3gtr' && mn === 'mmat_glass_013') return true;

            if (mat && (mat.transparent === true || (mat.opacity !== undefined && mat.opacity < 0.85))) {
                if (mn === 'body' || mn.includes('paint') || mn.includes('light') || mn.includes('lamp') || mn.includes('blinker') || mn.includes('indicator') || mn.includes('brake') || mn.includes('wheel') || mn.includes('interior')) {
                    return false;
                }
                return true;
            }
            return (
                mn.includes('glass') ||
                mn.includes('window') ||
                mn.includes('windshield') ||
                mn.includes('tint') ||
                mn.includes('glazing') ||
                mn.includes('clearglass') ||
                mn.includes('darkglass') ||
                ms.includes('glass') ||
                ms.includes('window') ||
                ms.includes('windshield')
            );
        }

        function isRimMaterial(matName, meshName) {
            const mn = String(matName || '').toLowerCase();
            const ms = String(meshName || '').toLowerCase();

            if (isTireMaterial(matName, meshName)) return false;
            if (mn.includes('primary') || ms.includes('primary') || mn.includes('perimeter') || ms.includes('perimeter') || mn.includes('trim') || mn.includes('fender') || ms.includes('fender') || mn.includes('door') || ms.includes('door') || mn.includes('hood') || ms.includes('hood') || mn.includes('body') || ms.includes('body')) {
                return false;
            }

            if (baseCarId === 'corvette_cross') return mn === 'material.018';
            if (baseCarId === 'mustang_razor') return ms.includes('oz_style01') && mn !== 'llantas';
            if (baseCarId === 'audir8') return mn === 'meshpart23mtl';
            if (baseCarId === 'rx7') return mn === 'material.014';
            if (baseCarId === 'mclaren') return mn === 'wheels';
            if (baseCarId === 'db9') return mn === 'rim1mtl' || mn === 'rim2mtl';
            if (baseCarId === 'supra') return mn === 'chrome' || mn === 'graychrome' || mn === 'metallic';
            if (baseCarId === 'eclipse_lou') return mn === 'rim_2' || mn === 'rim_chrome';
            if (baseCarId === 'elantra_n') return mn.includes('rim') || mn.includes('wheel');
            if (baseCarId === 'maserati') return mn === 'rim' || mn === 'wheel' || mn === 'chrome';
            if (baseCarId === 'panamera') return mn.includes('3dwheel1a_material');
            if (baseCarId === 'x5m') return mn.includes('rim');
            if (baseCarId === 'rs7') return mn.startsWith('disc') && !mn.includes('brakedisc');
            if (baseCarId === 'subaru' && (ms === 'object_15' || mn === 'material_12')) return true;
            if (baseCarId === 'vaz2107' && (mn === 'silver' || (mn === 'chrome' && ms.includes('wheel')))) return true;
            if (baseCarId === 'vaz2109' && (mn === 'standardmater46' || mn === 'standardmater47' || mn === 'standardmater49')) return true;
            if (baseCarId === 'gaz24' && (mn === 'wheel' || mn === 'steel')) return true;
            if (baseCarId === 'priora' && mn === 'priora_wheel5') return true;
            if (baseCarId === 'vesta' && (mn === 'disk' || ms.includes('wheel_disk'))) return true;
            if (baseCarId === 'solaris' && (mn === 'camryrim' || mn === 'hubcaps' || (mn === 'metal' && ms.includes('wheel')))) return true;
            if (baseCarId === 'polo' && mn.includes('3dwheel1a_material1')) return true;
            if (baseCarId === 'mark2' && (mn === 'chrome' || mn === 'chrome2') && (ms.includes('wheel') || ms.includes('rim') || ms === 'object_3' || ms === 'object_4' || ms === 'object_5')) return true;
            if (baseCarId === 'm5e60' && (mn === 'alum' || mn.includes('bmw_e30_m3_rim'))) return true;
            if (baseCarId === 'silvia' && mn === 'rim1mtl') return true;
            if (baseCarId === 'lc300' && (mn.includes('rimmi_changea_rim') || mn.includes('aluminiumbrushed_wheel'))) return true;
            if (baseCarId === 'e63' && (mn === 'metallic_rim' || ms.includes('metallic rim'))) return true;
            if (baseCarId === 'rs6' && mn.includes('audi_rs3sedanrewardrecycled_2023_wheel1a')) return true;
            if (baseCarId === 'm5f90' && ms.includes('wheel') && !ms.includes('tyre')) return true;
            if (baseCarId === 'm8' && mn.includes('bmw_i8rewardrecycled_2017_wheel1a')) return true;
            if (baseCarId === 'g63' && mn.includes('graphite forged alloy')) return true;
            if (baseCarId === 'porsche911' && (mn === 'silver' || (mn === 'material.001' && ms.includes('wheel')))) return true;
            if (baseCarId === 'huracan' && mn === 'mt_alloywheels') return true;
            if (baseCarId === 'cullinan' && mn === 'mettal_in_w') return true;
            if (baseCarId === 'sf90' && (ms.startsWith('rim_') || (mn === 'metal_gray' && ms.includes('rim')))) return true;
            if (baseCarId === 'chiron' && (mn === 'rim' || mn === 'rim_accent' || mn === 'wheel_nut')) return true;
            if (baseCarId === 'jesko' && (mn === 'wheel_disc' || ms.includes('wheel_fl_disc') || ms.includes('wheel_fl_ring') || ms.includes('wheel_fl_cap'))) return true;
            if (baseCarId === 'm3gtr' && (mn === 'mmat_tire_brake_048' && ms.includes('sm_hub_'))) return true;

            return (
                mn.includes('rim') ||
                mn.includes('wheel_disc') ||
                mn.includes('forged alloy') ||
                mn.includes('alloywheel') ||
                mn.includes('hc2_rim') ||
                mn.includes('camryrim') ||
                (mn.includes('wheel') && !mn.includes('steer') && !mn.includes('tyre') && !mn.includes('rubber')) ||
                ms.includes('rim')
            );
        }

        function isBodyMaterial(matName, meshName, mat) {
            const mn = String(matName || '').toLowerCase();
            const ms = String(meshName || '').toLowerCase();

            // First check if it is ANY non-body material
            if (isTireMaterial(matName, meshName) ||
                isGlassMaterial(null, matName, meshName) ||
                isRimMaterial(matName, meshName) ||
                isBrakeMaterial(matName, meshName) ||
                isLightMaterial(matName, meshName) ||
                isExhaustMaterial(matName, meshName) ||
                isInteriorMaterial(matName, meshName) ||
                isGrilleMaterial(matName, meshName)) {
                return false;
            }

            if (mn.includes('badge') || mn.includes('emblem') || mn.includes('logo') || mn.includes('plate') || mn.includes('underbody') || mn.includes('bottom') || mn.includes('shadow')) {
                return false;
            }

            if (baseCarId === 'subaru') {
                return (
                    ms === 'object_2' || ms === 'object_7' || ms === 'object_8' || ms === 'object_9' ||
                    ms === 'object_13' || ms === 'object_17' || ms === 'object_21' || ms === 'object_28' ||
                    mn === 'material_26' || mn === 'material_4' || mn === 'material_5' || mn === 'material_6' ||
                    mn === 'material_10' || mn === 'material_18' || mn === 'material_25'
                );
            }
            if (baseCarId === 'vaz2107') return mn === 'body' || ms.includes('object_128_body') || ms.includes('_body_');
            if (baseCarId === 'vaz2109') return mn === '2109' || ms.endsWith('_2109_0');
            if (baseCarId === 'gaz24') return mn === 'paint_new' || mn === 'paint' || mn === 'body' || mn === 'black_paint';
            if (baseCarId === 'priora') return mn.includes('priora_skin') || mn.includes('priora_mirr') || mn === 'carpaint' || mn.includes('paint');
            if (baseCarId === 'vesta') return mn === 'kuzov' || ms.includes('kuzov_kuzov_0');
            if (baseCarId === 'solaris') return mn === 'carpaint' || mn.includes('carpaint') || mn === 'varnish';
            if (baseCarId === 'polo') return mn.includes('golfgti_2014paint');
            if (baseCarId === 'mark2') return mn === 'metall' || mn.includes('paint');
            if (baseCarId === 'm5e60') return mn === 'body' || ms.includes('body_body') || mn.includes('paint');
            if (baseCarId === 'silvia') return mn === 'meshpart1mtl' || mn.includes('lodarearbumpermmext1');
            if (baseCarId === 'camry') return mn === 'camry';
            if (baseCarId === 'lc300') return mn === 'phong1' || mn.includes('1350010001') || mn === 'palettematerial001' || (mn.includes('plasticdiffuse') && ms.includes('primitive0'));
            if (baseCarId === 'gtr') return mn === 'bodycolor';
            if (baseCarId === 'e63') return mn === 'body' || ms === 'body_body_0';
            if (baseCarId === 'rs6') return mn.includes('rs3_2018_base') || (mn === 'material' && ms === 'car');
            if (baseCarId === 'm5f90') return mn === 'material_692' || mn === 'material_697' || ms.includes('body_material #692') || ms.includes('body_material #697');
            if (baseCarId === 'm8') return mn.includes('i8elite_2017paint') || mn.includes('i8elite_2017coloured');
            if (baseCarId === 'g63') return mn.includes('monza grey satin') || mn.includes('manufaktur');
            if (baseCarId === 'porsche911') return mn === 'paint' || mn === 'coat' || ms.includes('boot') || ms.includes('bumper');
            if (baseCarId === 'huracan') return mn === 'mt_body' || ms.includes('mesh_boot') || ms.includes('mesh_bumper') || ms.includes('mesh_hood') || ms.includes('mesh_door');
            if (baseCarId === 'cullinan') return mn === 'car_body_in';
            if (baseCarId === 'sf90') return mn === 'body_color' || mn === '_0098_dodgerblue';
            if (baseCarId === 'chiron') return mn === 'paint_primary' || mn === 'paint_secondary';
            if (baseCarId === 'jesko') return mn === 'paint_satingraphite' || ms.includes('hypercar_body');
            if (baseCarId === 'm3gtr') return mn === 'mmat_carpaint_blue1' || mn === 'mmat_details_mat_025';
            if (baseCarId === 'corvette_cross') return mn === 'material.040';
            if (baseCarId === 'mustang_razor') return mn === 'carroceria';
            if (baseCarId === 'audir8') return mn === 'meshpart2mtl';
            if (baseCarId === 'rx7') return mn === 'material.007';
            if (baseCarId === 'mclaren') return mn === 'carpaint';
            if (baseCarId === 'db9') return mn === 'oempaint' || mn === 'coloured';
            if (baseCarId === 'supra') return mn === 'supra_body_paint';
            if (baseCarId === 'eclipse_lou') return mn === 'carpaint';
            if (baseCarId === 'elantra_n') return mn.includes('ceramic_white');
            if (baseCarId === 'maserati') return mn === 'paint';
            if (baseCarId === 'panamera') return mn.includes('paint_material');
            if (baseCarId === 'x5m') return mn.includes('paint1mtl') || mn.includes('colouredmtl');
            if (baseCarId === 'rs7') return mn === 'material' && (ms === 'car' || ms === 'fronthood' || ms === 'sidemirrorrcase');

            if (
                mn.includes('carpaint') ||
                mn.includes('paint') ||
                mn.includes('bodycolor') ||
                mn.includes('car_color') ||
                mn.includes('varnish') ||
                mn.includes('coat') ||
                ms.includes('body') ||
                ms.includes('hood') ||
                ms.includes('door') ||
                ms.includes('boot') ||
                ms.includes('trunk') ||
                ms.includes('fender') ||
                ms.includes('bumper') ||
                ms.includes('chassis') ||
                ms.includes('exterior')
            ) {
                return true;
            }

            // Fallback for untextured near-white GLB shell materials (r > 0.9, g > 0.9, b > 0.9 and no texture map)
            if (mat && !mat.map && mat.color &&
                mat.color.r > 0.9 && mat.color.g > 0.9 && mat.color.b > 0.9 &&
                !mn.includes('chrom') && !ms.includes('chrom') &&
                !mn.includes('trim') && !mn.includes('plastic') && !mn.includes('carpet') &&
                !mn.includes('diffuser') && !mn.includes('arch') && !mn.includes('vent')) {
                return true;
            }

            return false;
        }

        const styledPaint = mats.paint.clone();
        styledPaint.color.setHex(bodyColorHex);
        styledPaint.roughness = 0.14;
        styledPaint.metalness = 0.70;
        if (styledPaint.clearcoat !== undefined) {
            styledPaint.clearcoat = 1.0;
            styledPaint.clearcoatRoughness = 0.05;
        }
        if (styling.vinyl && styling.vinyl !== 'none') {
            const vinylTex = createVinylCanvasTexture(THREE, styling.vinyl, bodyColorHex);
            if (vinylTex) styledPaint.map = vinylTex;
        } else {
            styledPaint.map = null;
        }
        styledPaint.name = 'StyledPaint_' + bodyColorHex.toString(16);
        styledPaint.needsUpdate = true;

        modelRoot.traverse(child => {
            if (isIgnoredAccessoryOrRigNode(child, modelRoot)) return;
            const mName = String(child.name || '').toLowerCase();
            // Automatically hide foreign license plates and flat caliper sticker planes, while preserving 3D car emblems/badges
            if (mName.includes('logo_plane') || mName.includes('license_plate') || mName.includes('illinois') || mName.includes('reg plate') || mName.includes('2025_103') || (baseCarId === 'gaz24' && mName.includes('object_174')) || mName.includes('plane_material.046') || mName.includes('placa')) {
                child.visible = false;
            }

            // In Subaru, hide factory STI wing if an aftermarket spoiler is active
            if (baseCarId === 'subaru' && styling.spoiler && styling.spoiler !== 'none') {
                if (mName === 'object_8' || (child.parent && child.parent.name === 'object_8')) {
                    child.visible = false;
                }
            }

            if (child.isMesh && child.material) {
                child.castShadow = true;
                child.receiveShadow = true;

                const isMulti = Array.isArray(child.material);
                const matList = isMulti ? child.material : [child.material];

                // Cache material roles on first pass so subsequent styling updates never lose material assignments
                if (!child.userData._stylingRoles) {
                    child.userData._stylingRoles = matList.map(mat => {
                        if (!mat) return 'stock';
                        const matName = String(mat.name || '').toLowerCase();
                        if (matName.startsWith('edge_color') || matName.includes('illinois') || matName.includes('philippine_license') || matName === 'plate' || matName === 'placa' || matName === 'material.046' || matName.includes('2020-2026')) {
                            child.visible = false;
                            return 'badge';
                        }
                        if (matName.includes('badge') || matName.includes('emblem') || matName.includes('logo') || mName.includes('emblem') || mName.includes('badge')) {
                            return mat.map ? 'stock' : 'chrome';
                        }
                        if(baseCarId==='camry'){
                            if(matName==='camry')return 'body';
                            if(matName==='camry_rin')return 'rim';
                            if(matName==='vidrios')return 'glass';
                            if(matName==='camry_int')return 'interior';
                            if(matName==='cromo')return 'chrome';
                            if(matName==='camry_plast'||matName==='bajo')return 'trim';
                            return 'stock';
                        }
                        if (isTireMaterial(matName, mName)) return 'tire';
                        if (isRimMaterial(matName, mName)) return 'rim';
                        if (isBrakeMaterial(matName, mName)) return 'brake';
                        if (isLightMaterial(matName, mName)) return 'light';
                        if (isExhaustMaterial(matName, mName)) return 'exhaust';
                        if (isGrilleMaterial(matName, mName)) return 'grille';
                        if (isInteriorMaterial(matName, mName)) return 'interior';
                        if (isGlassMaterial(mat, matName, mName)) return 'glass';
                        if (isBodyMaterial(matName, mName, mat)) return 'body';
                        if (baseCarId === 'm5e60' && (matName === 'palettematerial001' || matName === 'gris' || matName === 'black' || matName === 'black_dessous')) return 'trim';
                        if (baseCarId === 'corvette_cross' && (matName === 'espejo' || matName === 'chrome_headlight_left')) return 'chrome';
                        if (baseCarId === 'corvette_cross' && (matName === 'material.042' || matName === 'material.044' || matName === 'material.045' || matName === 'nwgros')) return 'trim';
                        if (baseCarId === 'mustang_razor' && matName === 'cromados') return 'chrome';
                        if (baseCarId === 'mustang_razor' && (matName === 'kit00_left_headlight_a__0' || matName === 'negro' || matName === 'goma_ventana')) return 'trim';
                        if (mName.includes('chrom') || matName.toLowerCase().includes('chrom')) return 'chrome';
                        if (mName.includes('carpet') || matName.includes('carpet') || mName.includes('floor')) return 'carpet';
                        if (matName.includes('diffuser') || matName.includes('trim') || matName.includes('arch') || matName.includes('plastic') || matName.includes('underbody') || matName.includes('vent') || mName.includes('diffuser') || mName.includes('trim') || mName.includes('underbody') || (baseCarId === 'vaz2109' && (
                            matName.toLowerCase() === 'standardmater24' ||
                            matName.toLowerCase() === 'standardmater27' ||
                            matName.toLowerCase() === 'standardmater1' ||
                            matName.toLowerCase() === 'standardmater2'
                        ))) return 'trim';
                        if (!mat.map && mat.color && mat.color.r > 0.9 && mat.color.g > 0.9 && mat.color.b > 0.9) return 'body';
                        return 'stock';
                    });
                    child.userData._origMatNames = matList.map(mat => mat ? (mat.name || '') : '');
                    child.userData._origBodyMats = matList.map(mat => (mat && mat.map) ? mat.clone() : null);
                }

                const updatedMats = matList.map((mat, idx) => {
                    if (!mat) return mat;
                    const role = child.userData._stylingRoles ? child.userData._stylingRoles[idx] : 'stock';
                    const origMatName = (child.userData._origMatNames && child.userData._origMatNames[idx]) || String(mat.name || '');
                    const matName = origMatName.toLowerCase();
                    const mName = String(child.name || '').toLowerCase();

                    if (role === 'badge') {
                        child.visible = false;
                        return mat;
                    }

                    // 1. Rubber Tires (Always deep black/charcoal realistic rubber)
                    if (role === 'tire') {
                        if (!styling.wheels || styling.wheels === 'stock') child.visible = true;
                        return mats.tireRubber;
                    }

                    // 2. Wheels / Rims
                    if (role === 'rim') {
                        if(window.NOMERA_AUTHORS_PREVIEW&&window.NomeraVehicleFinish?.preserveMaterial(baseCarId,origMatName)) return mat;
                        if (!styling.wheels || styling.wheels === 'stock') child.visible = true;
                        if (styling.wheels === 'stamps') {
                            return new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.72, metalness: 0.35, name: 'Rim_Stamps' });
                        } else if (styling.wheels === 'deepdish') {
                            return mats.chrome;
                        } else if (styling.wheels === 'forged') {
                            return new THREE.MeshStandardMaterial({ color: 0xc89d4c, roughness: 0.25, metalness: 0.88, name: 'Rim_Forged' });
                        } else if (styling.wheels === 'bbs_gtr') {
                            return new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.16, metalness: 0.94, name: 'Rim_BBS_GTR' });
                        } else if (styling.wheels === 'oz_racing') {
                            return new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.22, metalness: 0.90, name: 'Rim_OZ_Racing' });
                        }
                        // If model has baked wheel texture (e.g. Golf, RS3, i8, M3 GTR BBS) and stock wheels, enhance PBR with sheen
                        if (mat.map && (!styling.wheels || styling.wheels === 'stock')) {
                            mat.roughness = 0.24;
                            mat.metalness = 0.78;
                            mat.needsUpdate = true;
                            return mat;
                        }
                        // Default alloy rim: high-sheen metallic alloy with realistic highlights
                        return mats.alloyRim;
                    }

                    // 3. Brake Rotors & Calipers
                    if (role === 'brake') {
                        if (!styling.wheels || styling.wheels === 'stock') child.visible = true;
                        const isCaliperPart = mName.includes('caliper') || matName.includes('caliper') || matName.includes('etrier') || mName === 'object_4' || matName === 'material_1' || matName.includes('red');
                        if (!isCaliperPart && child) {
                            child.userData = child.userData || {};
                            child.userData.isBrakeRotor = true;
                        }
                        if (mat && (mat.map || mat.alphaMap || mat.transparent)) {
                            const cloned = mat.clone();
                            cloned.roughness = isCaliperPart ? 0.28 : 0.35;
                            cloned.metalness = isCaliperPart ? 0.55 : 0.85;
                            if (!isCaliperPart && THREE && THREE.Color) {
                                cloned.emissive = new THREE.Color(0xff3300);
                                cloned.emissiveIntensity = 0;
                            }
                            cloned.needsUpdate = true;
                            return cloned;
                        }
                        if (isCaliperPart) {
                            return mats.brakeCaliper;
                        }
                        return mats.brakeDisc;
                    }

                    // 4. Lights (Headlights, Taillights, Indicators)
                    if (role === 'light') {
                        if (mName.includes('taillight') || matName.includes('taillight') || mName.includes('brakelight') || matName.includes('brakelight') || matName === 'gl_glow_glass_g' || matName === 'rojo_faros_tras' || matName === 'faros_tras' || matName === 'glassred' || matName === 'r_glass' || matName === 'stop' || matName.includes('red') || matName.includes('ruby') || mName === 'object_20' || matName === 'material_17' || matName === 'stopar' || (baseCarId === 'vaz2109' && matName.toLowerCase() === 'standardmater5')) {
                            return mats.taillightRed;
                        }
                        if (baseCarId === 'vaz2109' && matName.toLowerCase() === 'standardmater3') {
                            return mats.chrome;
                        }
                        if (mName.includes('indicator') || matName.includes('amber') || matName.includes('orange') || mName === 'object_14' || mName === 'object_19') {
                            return mats.amberIndicator;
                        }
                        if (mName.includes('reverse') || mName === 'object_21') {
                            return mats.reverseWhite;
                        }
                        if (mat.map) {
                            mat.roughness = 0.15;
                            mat.metalness = 0.10;
                            mat.needsUpdate = true;
                            return mat;
                        }
                        return mats.headlightGlass;
                    }

                    // 5. Exhaust Tips
                    if (role === 'exhaust') {
                        return mats.exhaustChrome;
                    }

                    // 6. Grilles & Intercooler Mesh
                    if (role === 'grille') {
                        return mats.grilleMesh;
                    }

                    // 7. Interior Cockpit (renderOrder 0)
                    if (role === 'interior') {
                        child.renderOrder = 0;
                        return mats.interior;
                    }

                    // 8. Glass & Tint (renderOrder 2, depthWrite false)
                    if (role === 'glass') {
                        child.renderOrder = 2;
                        return mats.glass;
                    }

                    // 9. Car Body Paint (Preserve authentic factory/racing livery textures on M3 GTR, Corvette C6.R, and Mustang GT unless custom vinyl/paint override is active; exclude mmat_details_mat_025 white placeholder texture so it gets metallic body paint)
                    if (role === 'body') {
                        const origBodyMat = child.userData._origBodyMats && child.userData._origBodyMats[idx];
                        const isPlaceholderWhiteMap = (baseCarId === 'm3gtr' && matName === 'mmat_details_mat_025');
                        if ((carId === 'm3gtr' || carId === 'corvette_cross' || carId === 'mustang_razor') && !isPlaceholderWhiteMap && origBodyMat && origBodyMat.map && !styling.customPaintOverride && (!styling.vinyl || styling.vinyl === 'none')&&!globalThis.NomeraLivery?.active(styling.livery)) {
                            const liveryMat = origBodyMat.clone();
                            liveryMat.roughness = 0.15;
                            liveryMat.metalness = 0.52;
                            if (liveryMat.color && THREE && THREE.Color) {
                                liveryMat.color.setHex(0xffffff);
                            }
                            liveryMat.userData = Object.assign({}, liveryMat.userData, { preserveLiveryMap: true });
                            liveryMat.needsUpdate = true;
                            return liveryMat;
                        }
                        if(baseCarId==='camry'&&origBodyMat?.map){
                            const paint=styledPaint.clone();paint.map=origBodyMat.map;paint.needsUpdate=true;
                            return paint;
                        }
                        return styledPaint;
                    }

                    // 10. Chrome Trim
                    if (role === 'chrome') {
                        return mats.chrome;
                    }

                    // 11. Carpet & Floorpan
                    if (role === 'carpet') {
                        return new THREE.MeshStandardMaterial({
                            color: 0x111114,
                            roughness: 0.95,
                            metalness: 0.05,
                            name: 'DarkCarpet'
                        });
                    }

                    // 12. Black Trim, Diffusers, Moldings, Plastic, Underbody, Vents
                    if (role === 'trim') {
                        return mats.trim;
                    }

                    // Fix SketchUp export materials on Audi R8 that had accidental transparency
                    if (baseCarId === 'audir8' && mat.transparent) {
                        mat.transparent = false;
                        mat.opacity = 1.0;
                        mat.depthWrite = true;
                        mat.needsUpdate = true;
                    }

                    return mat;
                });

                child.material = isMulti ? updatedMats : updatedMats[0];
            }
        });

        // Clean up previous accessories before attaching new ones
        ['GLB_SpoilerGroup', 'GLB_Spoiler', 'GLB_BodykitGroup', 'GLB_RoofScoopGroup', 'GLB_HoodGroup', 'SGUGroup', 'GLB_NeonTubes', 'ChassisUndertray', 'GLB_Undertray'].forEach(accName => {
            const oldAcc = modelRoot.getObjectByName(accName);
            if (oldAcc) {
                disposeObject3D(oldAcc);
                modelRoot.remove(oldAcc);
            }
        });

        // Compute local bounding box for accessories placement (excluding interactive rig & accessories)
        modelRoot.updateMatrixWorld(true);
        let box;
        if (modelRoot.userData && modelRoot.userData.baseBoundingBox && !modelRoot.userData.baseBoundingBox.isEmpty()) {
            box = modelRoot.userData.baseBoundingBox.clone();
        } else {
            box = new THREE.Box3();
            modelRoot.traverse(c => {
                if (!c.isMesh || !c.geometry) return;
                if (isIgnoredAccessoryOrRigNode(c, modelRoot)) return;
                if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
                if (c.geometry.boundingBox && !c.geometry.boundingBox.isEmpty()) {
                    const wb = c.geometry.boundingBox.clone().applyMatrix4(c.matrixWorld);
                    wb.min.sub(modelRoot.position);
                    wb.max.sub(modelRoot.position);
                    box.union(wb);
                }
            });
            if (box.isEmpty()) {
                box.setFromObject(modelRoot);
                box.min.sub(modelRoot.position);
                box.max.sub(modelRoot.position);
            }
            if (!modelRoot.userData) modelRoot.userData = {};
            modelRoot.userData.baseBoundingBox = box.clone();
        }
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        if(!(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW&&window.NomeraAeroKit)){
        // 3D Spoilers on GLB models (skip duplicate procedural wing on BMW M3 GTR unless user selects a different custom spoiler)
        if (styling.spoiler && styling.spoiler !== 'none' && !(carId === 'm3gtr' && styling.spoiler === 'gtr')) {
            const spoilerGroup = new THREE.Group();
            spoilerGroup.name = 'GLB_SpoilerGroup';

            const spanW = (carId === 'vaz2109' || carId === 'polo' || carId === 'golf_sonny') ? Math.min(size.x * 0.72, 1.32) : Math.min(size.x * 0.76, 1.45);
            let deckY, deckZ;
            if (carId === 'vaz2109' || carId === 'polo' || carId === 'golf_sonny') {
                // Hatchback: mount roof spoiler / visor flush at the top rear edge of the tailgate
                deckY = box.max.y - 0.02;
                deckZ = box.min.z + size.z * 0.16;
            } else {
                // Sedan / Coupe: mount directly on trunk lid
                deckY = box.min.y + size.y * 0.68;
                deckZ = box.min.z + size.z * 0.10;
            }

            if (styling.spoiler === 'ducktail') {
                const duckGeo = new THREE.BoxGeometry(spanW, 0.05, 0.18);
                duckGeo.rotateX(Math.PI / 10);
                const duck = new THREE.Mesh(duckGeo, mats.carbon);
                duck.position.set(0, deckY + 0.02, deckZ);
                spoilerGroup.add(duck);
            } else if (styling.spoiler === 'high') {
                [-1, 1].forEach(side => {
                    const legGeo = new THREE.BoxGeometry(0.04, 0.28, 0.10);
                    legGeo.rotateX(-Math.PI / 18);
                    const leg = new THREE.Mesh(legGeo, mats.trim);
                    leg.position.set(side * (spanW * 0.38), deckY + 0.14, deckZ);
                    spoilerGroup.add(leg);
                });
                const wingGeo = new THREE.BoxGeometry(spanW * 1.08, 0.04, 0.26);
                wingGeo.rotateX(Math.PI / 16);
                const wing = new THREE.Mesh(wingGeo, mats.carbon);
                wing.position.set(0, deckY + 0.30, deckZ - 0.02);
                spoilerGroup.add(wing);

                [-1, 1].forEach(side => {
                    const epGeo = new THREE.BoxGeometry(0.02, 0.18, 0.32);
                    const ep = new THREE.Mesh(epGeo, mats.carbon);
                    ep.position.set(side * (spanW * 0.54), deckY + 0.30, deckZ - 0.02);
                    spoilerGroup.add(ep);
                });
            } else if (styling.spoiler === 'gt' || styling.spoiler === 'gtr') {
                const isGtrWing = styling.spoiler === 'gtr';
                [-1, 1].forEach(side => {
                    const stanchGeo = new THREE.BoxGeometry(0.035, isGtrWing ? 0.42 : 0.38, 0.09);
                    stanchGeo.rotateX(-Math.PI / 14);
                    const stanch = new THREE.Mesh(stanchGeo, mats.trim);
                    stanch.position.set(side * (spanW * 0.30), deckY + (isGtrWing ? 0.21 : 0.19), deckZ);
                    spoilerGroup.add(stanch);
                });
                const mainBladeGeo = new THREE.BoxGeometry(spanW * (isGtrWing ? 1.22 : 1.15), 0.035, 0.30);
                mainBladeGeo.rotateX(Math.PI / 14);
                const mainBlade = new THREE.Mesh(mainBladeGeo, mats.carbon);
                mainBlade.position.set(0, deckY + (isGtrWing ? 0.43 : 0.40), deckZ - 0.04);
                spoilerGroup.add(mainBlade);

                if (isGtrWing) {
                    const lowerDeckGeo = new THREE.BoxGeometry(spanW * 1.14, 0.028, 0.22);
                    lowerDeckGeo.rotateX(Math.PI / 18);
                    const lowerDeck = new THREE.Mesh(lowerDeckGeo, mats.carbon);
                    lowerDeck.position.set(0, deckY + 0.31, deckZ - 0.02);
                    spoilerGroup.add(lowerDeck);
                }

                [-1, 1].forEach(side => {
                    const epGeo = new THREE.BoxGeometry(0.022, isGtrWing ? 0.28 : 0.24, 0.38);
                    const ep = new THREE.Mesh(epGeo, mats.carbon);
                    ep.position.set(side * (spanW * (isGtrWing ? 0.61 : 0.58)), deckY + (isGtrWing ? 0.41 : 0.40), deckZ - 0.04);
                    spoilerGroup.add(ep);
                });
            }
            modelRoot.add(spoilerGroup);
        }

        // 3D Aero Bodykits (Recessed Under-Bumper Carbon Splitter, Rocker Sill Blades & Rear Diffuser)
        // Skip duplicate BoxGeometry aero on models that already have native widebody/GT aero sculpted into the GLB mesh
        const hasNativeWidebodyMesh = (
            baseCarId === 'm3gtr' ||
            baseCarId === 'corvette_cross' ||
            baseCarId === 'mustang_razor'
        );
        if (styling.bodykit && styling.bodykit !== 'stock' && styling.bodykit !== 'none' && !hasNativeWidebodyMesh) {
            const bkGroup = new THREE.Group();
            bkGroup.name = 'GLB_BodykitGroup';
            const bkType = styling.bodykit;
            const halfW = size.x * 0.5;
            const groundY = Math.max(0.05, box.min.y + 0.06);

            // 1. Sleek Recessed Front Carbon Lip Splitter
            const lipW = size.x * (bkType === 'nfsmw_gtr' ? 0.86 : (bkType === 'widebody' ? 0.84 : 0.80));
            const lipGeo = new THREE.BoxGeometry(lipW, 0.024, 0.14);
            const frontLip = new THREE.Mesh(lipGeo, mats.carbon);
            frontLip.name = 'Bodykit_FrontSplitter';
            frontLip.position.set(0, groundY, box.max.z - 0.14);
            bkGroup.add(frontLip);

            // 2. Low-Profile Side Sill Blades (Tucked cleanly under rocker panels between wheels)
            [-1, 1].forEach(side => {
                const skirtGeo = new THREE.BoxGeometry(0.035, 0.028, size.z * 0.42);
                const skirt = new THREE.Mesh(skirtGeo, bkType === 'street' ? mats.trim : mats.carbon);
                skirt.name = side < 0 ? 'Bodykit_Skirt_L' : 'Bodykit_Skirt_R';
                skirt.position.set(side * (halfW - 0.045), groundY + 0.01, center.z);
                bkGroup.add(skirt);
            });

            // 3. Rear Under-Bumper Carbon Diffuser
            if (bkType === 'widebody' || bkType === 'nfsmw_gtr') {
                const diffGeo = new THREE.BoxGeometry(size.x * 0.68, 0.045, 0.14);
                const diffuser = new THREE.Mesh(diffGeo, mats.carbon);
                diffuser.name = 'Bodykit_RearDiffuser';
                diffuser.position.set(0, groundY + 0.02, box.min.z + 0.14);
                bkGroup.add(diffuser);
            }

            modelRoot.add(bkGroup);
        }

        // 3D Roof Scoops (Single, Dual, Vortex Generators)
        if (styling.roofScoop && styling.roofScoop !== 'none') {
            const rsGroup = new THREE.Group();
            rsGroup.name = 'GLB_RoofScoopGroup';
            const roofY = box.max.y - 0.015;
            const roofZ = center.z + size.z * 0.04;

            if (styling.roofScoop === 'single') {
                const scoopGeo = new THREE.BoxGeometry(0.34, 0.085, 0.52);
                const scoop = new THREE.Mesh(scoopGeo, mats.carbon);
                scoop.position.set(0, roofY + 0.03, roofZ);
                rsGroup.add(scoop);
            } else if (styling.roofScoop === 'dual') {
                [-1, 1].forEach(side => {
                    const scoopGeo = new THREE.BoxGeometry(0.24, 0.08, 0.48);
                    const scoop = new THREE.Mesh(scoopGeo, mats.carbon);
                    scoop.position.set(side * 0.22, roofY + 0.03, roofZ);
                    rsGroup.add(scoop);
                });
            } else if (styling.roofScoop === 'vortex') {
                for (let i = -3; i <= 3; i++) {
                    const finGeo = new THREE.BoxGeometry(0.022, 0.065, 0.14);
                    const fin = new THREE.Mesh(finGeo, mats.carbon);
                    fin.position.set(i * 0.13, roofY + 0.025, center.z - size.z * 0.14);
                    rsGroup.add(fin);
                }
            }
            modelRoot.add(rsGroup);
        }

        // 3D Custom Hoods (Carbon Hood, GTR Louver Vents, Muscle Supercharger Blower)
        if (styling.hood && styling.hood !== 'stock' && styling.hood !== 'none') {
            const hoodGroup = new THREE.Group();
            hoodGroup.name = 'GLB_HoodGroup';
            const hoodY = box.min.y + size.y * 0.67;
            const hoodZ = center.z + size.z * 0.28;

            if (styling.hood === 'carbon') {
                const panelGeo = new THREE.BoxGeometry(size.x * 0.68, 0.022, size.z * 0.26);
                const panel = new THREE.Mesh(panelGeo, mats.carbon);
                panel.position.set(0, hoodY, hoodZ);
                hoodGroup.add(panel);
            } else if (styling.hood === 'gtr_vents') {
                [-1, 1].forEach(side => {
                    for (let v = 0; v < 3; v++) {
                        const louverGeo = new THREE.BoxGeometry(0.22, 0.028, 0.08);
                        louverGeo.rotateX(-0.22);
                        const louver = new THREE.Mesh(louverGeo, mats.carbon);
                        louver.position.set(side * 0.26, hoodY + 0.01, hoodZ - 0.12 + v * 0.12);
                        hoodGroup.add(louver);
                    }
                });
            } else if (styling.hood === 'blower') {
                const baseGeo = new THREE.BoxGeometry(0.38, 0.14, 0.46);
                const blowerBase = new THREE.Mesh(baseGeo, mats.chrome);
                blowerBase.position.set(0, hoodY + 0.07, hoodZ);
                hoodGroup.add(blowerBase);
                const intakeGeo = new THREE.BoxGeometry(0.42, 0.09, 0.32);
                const blowerIntake = new THREE.Mesh(intakeGeo, mats.carbon);
                blowerIntake.position.set(0, hoodY + 0.16, hoodZ + 0.04);
                hoodGroup.add(blowerIntake);
            }
            modelRoot.add(hoodGroup);
        }

        }
        // Roof-Mounted Police/Government SGU Flasher Bar removed per user request: "убери все мигалки которые можно ставить на машину, они только мешают"

        // Underglow Neon (Soft Ground Light Pool + Deeply Recessed Chassis Emitters)
        if (styling.neon && styling.neon !== 'none') {
            const neonGroup = new THREE.Group();
            neonGroup.name = 'GLB_NeonTubes';
            const neonCol = parseColor(styling.neon, 0x00f0ff);

            const groundGlowTex = createUnderglowGroundTexture(THREE, neonCol);
            const groundGlowMat = new THREE.MeshBasicMaterial({
                map: groundGlowTex,
                color: neonCol,
                transparent: true,
                opacity: 0.90,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            const groundGlowPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(size.x * 1.28, size.z * 0.96),
                groundGlowMat
            );
            groundGlowPlane.name = 'NeonGroundGlowPlane';
            groundGlowPlane.rotation.x = -Math.PI / 2;
            groundGlowPlane.position.set(0, Math.max(0.008, box.min.y + 0.008) - suspensionOffsetY, center.z);
            groundGlowPlane.renderOrder = 4;
            groundGlowPlane.userData.isNeonGroundGlow = true;
            neonGroup.add(groundGlowPlane);

            const neonMat = new THREE.MeshStandardMaterial({
                color: neonCol,
                emissive: neonCol,
                emissiveIntensity: 1.8,
                roughness: 0.15
            });
            [-1, 1].forEach(side => {
                const tubeGeo = new THREE.CylinderGeometry(0.005, 0.005, size.z * 0.36, 8);
                tubeGeo.rotateX(Math.PI / 2);
                const tube = new THREE.Mesh(tubeGeo, neonMat);
                tube.position.set(side * (size.x * 0.28), Math.max(0.16, box.min.y + 0.16), center.z);
                tube.userData.isNeonEmitterBar = true;
                neonGroup.add(tube);
            });
            modelRoot.add(neonGroup);
        }

        // Interactive Doors, Hood, Engine Bay, Trunk, and Subwoofer Rig for all GLB Models
        ensureGLBInteractiveRig(THREE, modelRoot, styling, carId, mats, styledPaint);
        if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraAeroKit?.apply(THREE,modelRoot,styling,{box,carId,baseCarId});if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraVehicleFinish?.apply(THREE,modelRoot,styling,carId);

        // Multi-country License Plates
        const plateVal = (styling && styling.plate !== undefined) ? styling.plate : 'А 777 АА | 77 RUS';
        applyLicensePlateToModel(THREE, modelRoot, plateVal, styling.frameStyle || 'none', styling.plateStyle || 'classic');

        // Aerodynamic Undercarriage Undertray (for specific models requiring undercarriage sealing, e.g. SF90)
        if (carId === 'sf90') {
            const undertrayGeo = new THREE.PlaneGeometry(size.x * 0.70, size.z * 0.60);
            undertrayGeo.rotateX(Math.PI / 2);
            const undertrayMat = new THREE.MeshStandardMaterial({
                color: 0x09090b,
                roughness: 0.95,
                metalness: 0.1,
                side: THREE.DoubleSide,
                name: 'ChassisUndertray'
            });
            const undertray = new THREE.Mesh(undertrayGeo, undertrayMat);
            undertray.position.set(0, Math.max(0.04, box.min.y + 0.05), center.z);
            modelRoot.add(undertray);
        }
        if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraLivery?.apply(THREE,modelRoot,styling.livery);
    }

    function loadCarModel(THREE, carName, styling = {}, onLoaded, onProgress) {
        const carId = identifyCarModel(carName);
        const modelUrl = resolveModelUrl(carId);
        const loader = getGLTFLoader(THREE);

        // If no external GLB mapped (e.g. VAZ-2107, VAZ-2109, GAZ-24, Priora, Vesta, LC300, Cullinan)
        // or if loader is not available, render our bespoke procedural 3D model!
        if (!loader || !modelUrl) {
            const fallbackModel = buildDetailedCarModel(THREE, carName, styling);
            if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraLivery?.apply(THREE,fallbackModel,styling.livery);
            if (onLoaded) onLoaded(fallbackModel);
            return;
        }

        function denormalizeBufferAttribute(attr) {
            if (!attr || !attr.normalized || !attr.array || (attr.array instanceof Float32Array)) return attr;
            const src = attr.array;
            let divisor = 1;
            if (src instanceof Int16Array) divisor = 32767.0;
            else if (src instanceof Uint16Array) divisor = 65535.0;
            else if (src instanceof Int8Array) divisor = 127.0;
            else if (src instanceof Uint8Array) divisor = 255.0;
            else return attr;

            const itemSize = attr.itemSize || 3;
            const count = attr.count !== undefined ? attr.count : Math.floor(src.length / itemSize);
            if (attr.isInterleavedBufferAttribute && attr.data) {
                const out = new Float32Array(count * itemSize);
                for (let i = 0; i < count; i++) {
                    for (let k = 0; k < itemSize; k++) {
                        const raw = k === 0 ? attr.getX(i) : (k === 1 ? attr.getY(i) : (k === 2 ? attr.getZ(i) : attr.getW(i)));
                        out[i * itemSize + k] = Math.max(-1.0, raw / divisor);
                    }
                }
                return new THREE.BufferAttribute(out, itemSize, false);
            }

            const out = new Float32Array(src.length);
            for (let i = 0; i < src.length; i++) {
                out[i] = Math.max(-1.0, src[i] / divisor);
            }
            return new THREE.BufferAttribute(out, itemSize, false);
        }

        function denormalizeSceneGeometries(rootObj) {
            if (!rootObj || typeof rootObj.traverse !== 'function') return rootObj;
            rootObj.traverse(child => {
                if (!child.isMesh || !child.geometry || !child.geometry.attributes) return;
                const geom = child.geometry;
                const attrs = geom.attributes;
                let changedPos = false;
                ['position', 'normal', 'uv', 'uv2'].forEach(attrName => {
                    const attr = attrs[attrName];
                    if (attr && attr.normalized && attr.array && !(attr.array instanceof Float32Array)) {
                        const denorm = denormalizeBufferAttribute(attr);
                        geom.setAttribute(attrName, denorm);
                        if (attrName === 'position') changedPos = true;
                    }
                });
                if (changedPos) {
                    if (typeof geom.computeBoundingBox === 'function') geom.computeBoundingBox();
                    if (typeof geom.computeBoundingSphere === 'function') geom.computeBoundingSphere();
                }
            });
            return rootObj;
        }

        function protectSceneBuffers(scene) {
            if (!scene || typeof scene.traverse !== 'function') return scene;
            denormalizeSceneGeometries(scene);
            scene.traverse(child => {
                child.userData.preserveBuffers = true;
                if (child.geometry) child.geometry.userData.preserveBuffers = true;
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => { m.userData.preserveBuffers = true; });
                    else child.material.userData.preserveBuffers = true;
                }
            });
            return scene;
        }

        function computeTightBoundingBox(rootObj) {
            const tightBox = new THREE.Box3();
            const v = new THREE.Vector3();
            rootObj.updateMatrixWorld(true);
            rootObj.traverse(c => {
                if (!c.isMesh || !c.geometry || !c.visible) return;
                const pos = c.geometry.attributes && c.geometry.attributes.position;
                if (pos && pos.count > 0 && typeof pos.getX === 'function') {
                    const step = Math.max(1, Math.floor(pos.count / 600));
                    for (let i = 0; i < pos.count; i += step) {
                        v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(c.matrixWorld);
                        tightBox.expandByPoint(v);
                    }
                    const last = pos.count - 1;
                    v.set(pos.getX(last), pos.getY(last), pos.getZ(last)).applyMatrix4(c.matrixWorld);
                    tightBox.expandByPoint(v);
                }
            });
            if (tightBox.isEmpty()) {
                tightBox.setFromObject(rootObj);
            }
            return tightBox;
        }

        function setupModel(gltfScene) {
            try {
                const modelGroup = new THREE.Group();
                modelGroup.name = 'CarModel_' + carId;

                let rootToUse = gltfScene;
                if (carId === 'gaz24') {
                    let newVolga = null;
                    gltfScene.traverse(c => {
                        if (!newVolga && c.name && (c.name.includes('Volga_(new)') || c.name.includes('Volga (new)'))) {
                            newVolga = c;
                        }
                    });
                    if (newVolga) {
                        rootToUse = newVolga;
                    }
                }
                const clonedScene = rootToUse.clone(true);
                denormalizeSceneGeometries(clonedScene);
                const toRemove = [];
                clonedScene.traverse(c => {
                    const nm = String(c.name || '').toLowerCase();
                    if (/shadow.*plane|ground.*shadow|floor.*shadow|shadow_plane|obj_shadow/i.test(nm)) {
                        toRemove.push(c);
                    }
                    if (carId === 'gaz24') {
                        if (nm.includes('object_174') || nm.includes('reg plate') || nm.includes('2020') || nm.includes('plate')) {
                            toRemove.push(c);
                        }
                    }
                });
                toRemove.forEach(c => {
                    if (c.parent) c.parent.remove(c);
                });
                clonedScene.updateMatrixWorld(true);

                let box = computeTightBoundingBox(clonedScene);
                let size = box.getSize(new THREE.Vector3());
                let center = box.getCenter(new THREE.Vector3());

                // 1. If height is greater than length and width (Z-up coordinate system from Blender/3ds Max)
                if (size.y > size.z * 1.2 && size.y > size.x * 1.2) {
                    clonedScene.rotation.x = -Math.PI / 2;
                    clonedScene.updateMatrixWorld(true);
                    box = computeTightBoundingBox(clonedScene);
                    size = box.getSize(new THREE.Vector3());
                    center = box.getCenter(new THREE.Vector3());
                }

                // 2. If length is along X axis, rotate 90 degrees so the car aligns forward along Z
                if (size.x > size.z * 1.15) {
                    clonedScene.rotation.y = Math.PI / 2;
                    clonedScene.updateMatrixWorld(true);
                    box = computeTightBoundingBox(clonedScene);
                    size = box.getSize(new THREE.Vector3());
                    center = box.getCenter(new THREE.Vector3());
                }

                // 3. Align car forward facing along +Z
                // VAZ-2107 is natively modeled facing forward (+Z); VAZ-2109, SF90, RS6, Silvia, Vesta, Viper JV (370Z), and M3 G80 require 180° rotation
                if (carId === 'vaz2109' || carId === 'sf90' || carId === 'rs6' || carId === 'silvia' || carId === 'viper_jv' || carId === 'm3_g80' || carId === 'vesta') {
                    clonedScene.rotation.y += Math.PI;
                    clonedScene.updateMatrixWorld(true);
                    box = computeTightBoundingBox(clonedScene);
                    size = box.getSize(new THREE.Vector3());
                    center = box.getCenter(new THREE.Vector3());
                }

                // Standardize car dimensions with realistic relative scale (capped at <= 4.80 units to fit comfortably inside the 3.0-radius showroom podium ring)
                let targetLength = 4.45;
                if (carId === 'vaz2107' || carId === 'vaz2109' || carId === 'polo' || carId === 'golf_sonny') {
                    targetLength = 4.05;
                } else if (carId === 'cullinan') {
                    targetLength = 4.80;
                } else if (carId === 'g63' || carId === 'lc300' || carId === 'x5m' || carId === 'panamera') {
                    targetLength = 4.78;
                } else if (carId === 'camry' || carId === 'e63' || carId === 'clk_kaze' || carId === 'rs6' || carId === 'rs7' || carId === 'm8' || carId === 'gaz24' || carId === 'db9' || carId === 'maserati') {
                    targetLength = 4.72;
                } else if (carId === 'jesko' || carId === 'chiron' || carId === 'sf90' || carId === 'huracan' || carId === 'gallardo_ming' || carId === 'porsche911' || carId === 'cayman_baron' || carId === 'mclaren' || carId === 'audir8' || carId === 'corvette_cross' || carId === 'corvette_webster' || carId === 'mustang_razor' || carId === 'mustang_jewels') {
                    targetLength = 4.50;
                } else if (carId === 'priora' || carId === 'solaris' || carId === 'vesta' || carId === 'eclipse_lou') {
                    targetLength = 4.35;
                } else if (carId === 'mark2' || carId === 'is300_taz' || carId === 'subaru' || carId === 'evo8_earl' || carId === 'm5e60' || carId === 'm3_g80' || carId === 'm5f90' || carId === 'gtr' || carId === 'silvia' || carId === 'viper_jv' || carId === 'rx7' || carId === 'supra' || carId === 'elantra_n') {
                    targetLength = 4.55;
                }
                targetLength = Math.min(4.80, targetLength);
                const currentLength = size.z || 1;
                const scaleFactor = targetLength / currentLength;
                clonedScene.scale.setScalar(scaleFactor);
                clonedScene.updateMatrixWorld(true);

                const scaledBox = computeTightBoundingBox(clonedScene);
                const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

                clonedScene.position.x = -scaledCenter.x;
                clonedScene.position.z = -scaledCenter.z;
                clonedScene.position.y = -scaledBox.min.y;

                modelGroup.add(clonedScene);
                modelGroup.updateMatrixWorld(true);
                modelGroup.userData.baseBoundingBox = computeTightBoundingBox(clonedScene);
                modelGroup.userData.vehicleLodFile = GLB_MODEL_MAP[carId]?.split('/').pop();
                modelGroup.userData.vehicleLodId = carId;
                if(carId==='camry')modelGroup.userData.modelIdentity='Toyota Camry XV40';
                fitModelToShowroom(THREE, modelGroup, 4.8);
                applyStylingToGLTF(THREE, modelGroup, styling, carId);

                return modelGroup;
            } catch (err) {
                console.warn('Failed to setup cloned GLTF scene, falling back to detailed procedural model:', err);
                return buildDetailedCarModel(THREE, carName, styling);
            }
        }

        if (rawGLBCache.has(modelUrl)) {
            const cachedScene = rawGLBCache.get(modelUrl);
            const finalModel = setupModel(cachedScene);
            if (onLoaded) onLoaded(finalModel);
            return;
        }

        if (inFlightGLBPromises.has(modelUrl)) {
            inFlightGLBPromises.get(modelUrl).then(scene => {
                if (scene) {
                    const finalModel = setupModel(scene);
                    if (onLoaded) onLoaded(finalModel);
                } else {
                    const fallbackModel = buildDetailedCarModel(THREE, carName, styling);
                    if (onLoaded) onLoaded(fallbackModel);
                }
            }).catch(() => {
                const fallbackModel = buildDetailedCarModel(THREE, carName, styling);
                if (onLoaded) onLoaded(fallbackModel);
            });
            return;
        }

        const loadPromise = new Promise(resolve => {
            let loadUrl=modelUrl;
            const fallbackLoad = () => {
                try {
                    loader.load(
                        loadUrl,
                        gltf => {
                            if (gltf && gltf.scene) {
                                rawGLBCache.set(modelUrl, protectSceneBuffers(gltf.scene));
                                resolve(gltf.scene);
                            } else {
                                resolve(null);
                            }
                        },
                        xhr => {
                            if (xhr && xhr.lengthComputable && xhr.total > 0 && typeof onProgress === 'function') {
                                const pct = Math.round((xhr.loaded / xhr.total) * 100);
                                onProgress(pct);
                            }
                        },
                        err => {
                            if(loadUrl.includes('/models-mobile/')){const source=GLB_MODEL_MAP[carId],meta=window.NomeraModelAssets?.[source.split('/').pop()];loadUrl=source+(meta?'?v='+meta.version:'');fallbackLoad();return;}
                            console.warn('Failed to load GLB model, falling back to procedural:', err);
                            resolve(null);
                        }
                    );
                } catch (err) {
                    resolve(null);
                }
            };

            if (typeof window !== 'undefined' && window.caches && typeof loader.parse === 'function') {
                fetchCachedGLBBuffer(modelUrl).then(buffer => {
                    if (buffer) {
                        try {
                            const baseUrl = modelUrl.substring(0, modelUrl.lastIndexOf('/') + 1);
                            loader.parse(
                                buffer,
                                baseUrl,
                                gltf => {
                                    if (gltf && gltf.scene) {
                                        rawGLBCache.set(modelUrl, protectSceneBuffers(gltf.scene));
                                        resolve(gltf.scene);
                                    } else {
                                        fallbackLoad();
                                    }
                                },
                                () => fallbackLoad()
                            );
                        } catch (_) {
                            fallbackLoad();
                        }
                    } else {
                        fallbackLoad();
                    }
                }).catch(() => fallbackLoad());
            } else {
                fallbackLoad();
            }
        });

        inFlightGLBPromises.set(modelUrl, loadPromise);

        loadPromise.then(scene => {
            inFlightGLBPromises.delete(modelUrl);
            if (scene) {
                const finalModel = setupModel(scene);
                if (onLoaded) onLoaded(finalModel);
            } else {
                const fallbackModel = buildDetailedCarModel(THREE, carName, styling);
                if (onLoaded) onLoaded(fallbackModel);
            }
        }).catch(() => {
            inFlightGLBPromises.delete(modelUrl);
            const fallbackModel = buildDetailedCarModel(THREE, carName, styling);
            if (onLoaded) onLoaded(fallbackModel);
        });
    }

    function fitModelToShowroom(THREE, modelRoot, maxLength = 4.8) {
        if (!THREE || !modelRoot) return modelRoot;
        try {
            let box = (modelRoot.userData && modelRoot.userData.baseBoundingBox && !modelRoot.userData.baseBoundingBox.isEmpty())
                ? modelRoot.userData.baseBoundingBox.clone()
                : null;
            if (!box) {
                box = new THREE.Box3().setFromObject(modelRoot);
            }
            if (box && !box.isEmpty()) {
                const spanZ = box.max.z - box.min.z;
                const spanX = box.max.x - box.min.x;
                const length = Math.max(spanZ || 0, spanX || 0);
                if (Number.isFinite(length) && length > maxLength && modelRoot.scale && typeof modelRoot.scale.multiplyScalar === 'function') {
                    const factor = maxLength / length;
                    modelRoot.scale.multiplyScalar(factor);
                    if (typeof modelRoot.updateMatrixWorld === 'function') {
                        modelRoot.updateMatrixWorld(true);
                    }
                    if (modelRoot.userData && modelRoot.userData.baseBoundingBox) {
                        modelRoot.userData.baseBoundingBox.min.multiplyScalar(factor);
                        modelRoot.userData.baseBoundingBox.max.multiplyScalar(factor);
                    }
                }
            }
        } catch (_) {}
        return modelRoot;
    }

    function preloadCarModel(THREE, carName) {
        if (!THREE) return;
        const carId = identifyCarModel(carName);
        const modelUrl = resolveModelUrl(carId);
        const loader = getGLTFLoader(THREE);
        if (!loader || !modelUrl || rawGLBCache.has(modelUrl) || inFlightGLBPromises.has(modelUrl)) return;
        loadCarModel(THREE, carName, {}, () => {});
    }

    // Automotive Studio HDRI Environment Generator
    let cachedStudioEnvTexture = null;
    function createStudioEnvironment(THREE, renderer) {
        if (!THREE.PMREMGenerator || !renderer) return null;
        if (cachedStudioEnvTexture) return cachedStudioEnvTexture;
        try {
            const pmrem = new THREE.PMREMGenerator(renderer);
            if (pmrem.compileEquirectangularShader) {
                pmrem.compileEquirectangularShader();
            }

            const envScene = new THREE.Scene();
            envScene.background = new THREE.Color(0x0e1117);

            // 1. Overhead Main Softbox (Soft white rectangular studio diffuser)
            const softboxGeo = new THREE.PlaneGeometry(12, 16);
            softboxGeo.rotateX(Math.PI / 2);
            const softboxMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const softbox = new THREE.Mesh(softboxGeo, softboxMat);
            softbox.position.set(0, 7, 0);
            envScene.add(softbox);

            // 2. Lateral Accent Strip Lights (Creates crisp curved shoulder line reflections)
            [-7, 7].forEach(x => {
                const stripGeo = new THREE.PlaneGeometry(1.2, 16);
                stripGeo.rotateY(x > 0 ? -Math.PI / 2 : Math.PI / 2);
                const stripMat = new THREE.MeshBasicMaterial({ color: 0xbcd4e6 });
                const strip = new THREE.Mesh(stripGeo, stripMat);
                strip.position.set(x, 2.5, 0);
                envScene.add(strip);
            });

            // 3. Front and Rear Rim Fill Lights
            [-9, 9].forEach(z => {
                const fillGeo = new THREE.PlaneGeometry(8, 2.5);
                fillGeo.rotateY(z > 0 ? Math.PI : 0);
                const fillMat = new THREE.MeshBasicMaterial({ color: 0xcfd8dc });
                const fill = new THREE.Mesh(fillGeo, fillMat);
                fill.position.set(0, 3, z);
                envScene.add(fill);
            });

            const rt = pmrem.fromScene(envScene);
            cachedStudioEnvTexture = rt ? rt.texture : null;
            pmrem.dispose();
            return cachedStudioEnvTexture;
        } catch (err) {
            console.warn('Could not generate studio environment:', err);
            return null;
        }
    }

    // =========================================================================
    // 🛠️ HINGE ROTATION UTILITIES FOR ACCURATE 3D DOORS, HOOD & TRUNK MECHANICS
    // =========================================================================
    function findTopNodes(root, regex) {
        const list = [];
        if (!root || typeof root.traverse !== 'function') return list;
        root.traverse(c => {
            if (c.name && regex.test(c.name)) list.push(c);
        });
        if (list.length <= 1) return list;
        return list.filter(node => {
            let p = node.parent;
            while (p && p !== root) {
                if (list.includes(p)) return false;
                p = p.parent;
            }
            return true;
        });
    }

    function setupNodeHinge(node, partType, THREE) {
        if (!node || !THREE) return;
        if (!node.userData) node.userData = {};
        if (node.userData._hingeInitialized) return;
        node.userData._hingeInitialized = true;
        node.userData._basePos = node.position.clone();
        node.userData._baseQuat = node.quaternion.clone();

        node.updateMatrixWorld(true);
        const box = new THREE.Box3();
        node.traverse(child => {
            if (child.isMesh && child.geometry) {
                if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
                const cb = child.geometry.boundingBox.clone();
                child.updateMatrixWorld(true);
                const m = new THREE.Matrix4();
                if (node.parent) {
                    m.copy(node.parent.matrixWorld).invert().multiply(child.matrixWorld);
                } else {
                    m.copy(child.matrixWorld);
                }
                cb.applyMatrix4(m);
                box.union(cb);
            }
        });

        if (box.isEmpty()) {
            box.setFromCenterAndSize(node.position, new THREE.Vector3(0.6, 0.4, 0.6));
        }

        const center = box.getCenter(new THREE.Vector3());
        const hingePoint = new THREE.Vector3();
        const hingeAxis = new THREE.Vector3();

        if (partType === 'hood') {
            hingePoint.set(center.x, box.max.y, box.min.z);
            hingeAxis.set(-1, 0, 0);
        } else if (partType === 'trunk') {
            hingePoint.set(center.x, box.max.y, box.max.z);
            hingeAxis.set(1, 0, 0);
        } else if (partType === 'door_l') {
            hingePoint.set(box.min.x, center.y, box.max.z);
            hingeAxis.set(0, 1, 0);
        } else if (partType === 'door_r') {
            hingePoint.set(box.max.x, center.y, box.max.z);
            hingeAxis.set(0, -1, 0);
        }

        node.userData._hingePoint = hingePoint;
        node.userData._hingeAxis = hingeAxis;
    }

    function applyHingeRotation(node, angle, THREE) {
        if (!node || !node.userData || !node.userData._hingePoint || !node.userData._basePos) return;
        if (Math.abs(angle) < 0.001) {
            node.position.copy(node.userData._basePos);
            node.quaternion.copy(node.userData._baseQuat);
            return;
        }
        const qDelta = new THREE.Quaternion().setFromAxisAngle(node.userData._hingeAxis, angle);
        node.quaternion.copy(qDelta).multiply(node.userData._baseQuat);
        const rel = node.userData._basePos.clone().sub(node.userData._hingePoint);
        rel.applyQuaternion(qDelta);
        node.position.copy(node.userData._hingePoint).add(rel);
    }

    function disposeMaterial(mat) {
        if (!mat) return;
        const texKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'envMap', 'alphaMap', 'aoMap'];
        for (let i = 0; i < texKeys.length; i++) {
            const tex = mat[texKeys[i]];
            if (tex && typeof tex.dispose === 'function') {
                try { tex.dispose(); } catch (_) {}
            }
        }
        if (typeof mat.dispose === 'function') {
            try { mat.dispose(); } catch (_) {}
        }
    }

    function deepDispose(obj) {
        if(typeof window!=='undefined')window.NomeraAeroKit?.release(obj);if(typeof window!=='undefined')window.NomeraVehicleFinish?.release(obj);if(typeof window!=='undefined')obj?.traverse?.(n=>window.NomeraWheelRig?.cancel(n));
        if(typeof window!=='undefined')window.NomeraLivery?.release(obj);
        if(typeof window!=='undefined')window.NomeraPlayerRender?.release(obj);
        if(typeof window!=='undefined')window.NomeraVehicleLOD?.release(obj);
        if (!obj) return;
        try {
            if (typeof obj.traverse === 'function') {
                obj.traverse(child => {
                    if (child.userData && child.userData.preserveBuffers) return;
                    if (child.geometry && typeof child.geometry.dispose === 'function') {
                        if (!child.geometry.userData || !child.geometry.userData.preserveBuffers) {
                            try { child.geometry.dispose(); } catch (_) {}
                        }
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => {
                                if (!m.userData || !m.userData.preserveBuffers) disposeMaterial(m);
                            });
                        } else {
                            if (!child.material.userData || !child.material.userData.preserveBuffers) {
                                disposeMaterial(child.material);
                            }
                        }
                    }
                });
            }
        } catch (_) {}
    }

    function disposeObject3D(obj) {
        deepDispose(obj);
    }

    // =========================================================================
    // 🌟 MAIN CAR 3D SHOWROOM CLASS
    // =========================================================================
    class Car3DShowroom {
        constructor(container, options = {}) {
            if (!isWebGLAvailable()) {
                console.warn('WebGL is not available on this browser.');
                return;
            }

            this.THREE = window.THREE;
            if (!this.THREE) {
                console.error('Three.js must be loaded before Car3DShowroom.');
                return;
            }

            this.container = typeof container === 'string' ? document.getElementById(container) : container;
            if (!this.container) {
                console.error('Car3DShowroom: container element not found.');
                return;
            }

            this.options = Object.assign({
                autoRotate: false,
                autoRotateSpeed: 0.007,
                showPodium: true,
                enableZoom: true,
                minDistance: 2.2,
                maxDistance: 6.8
            }, options);
            this.minDistance = this.options.minDistance;

            this.width = this.container.clientWidth || 320;
            this.height = this.container.clientHeight || 200;
            this.active = false;
            this.paused = false;
            this.animFrameId = null;
            this._tempRainbowColor = new this.THREE.Color();

            // Camera angles and orbit controls (current & target for smooth animation)
            this.cameraAngleY = Math.PI / 4.2;
            this.cameraAngleX = 0.26;
            this.cameraDistance = 4.3;
            this.cameraDist = this.cameraDistance;
            this.targetY = 0.52;

            this.targetAngleY = this.cameraAngleY;
            this.targetAngleX = this.cameraAngleX;
            this.targetDistance = this.cameraDistance;
            this.targetCenterY = this.targetY;
            this.currentPreset = 'isometric';
            this.activeViewPreset = this.currentPreset;

            this.isDragging = false;
            this.dragVelX = 0;
            this.dragVelY = 0;
            this.needsRender = true;
            this.prevPointerX = 0;
            this.prevPointerY = 0;
            this.pinchStartDist = 0;

            this.currentCarName = '';
            this.currentStyling = {};
            this.carGroup = null;

            // Interactive Body & Lighting State
            this.doorsOpen = false;
            this.doorAngle = 0;
            this.targetDoorAngle = 0;

            this.hoodOpen = false;
            this.hoodAngle = 0;
            this.targetHoodAngle = 0;

            this.trunkOpen = false;
            this.trunkAngle = 0;
            this.targetTrunkAngle = 0;

            this.headlightsOn = false;
            this.fsoActive = false;
            this.stanceMode = 'stock';
            this.stanceOffsetY = 0;
            this.targetStanceOffsetY = 0;
            this.stanceCamberRad = 0;
            this.envTheme = 'studio';

            // Interactive capabilities (doors, hood, trunk, headlights)
            this.capabilities = {
                doors: true,
                hood: true,
                trunk: true,
                headlights: true
            };
            this.onCapabilitiesChange = null;
            this._resizeObserver = null;

            this.initScene();
            this.bindEvents();
            this.start();
        }

        requestRender() {
            this.needsRender = true;
            if (!this.active) {
                this.start();
            }
        }

        initScene() {
            const THREE = this.THREE;

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(36, this.width / this.height, 0.1, 100);
            this.updateCameraPosition();

            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
            this.renderer.setSize(this.width, this.height);
            this.renderer.outputEncoding = THREE.sRGBEncoding || 3001;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.08;

            if (this.renderer.shadowMap) {
                this.renderer.shadowMap.enabled = false;
            }
            if (this.renderer.debug) {
                this.renderer.debug.checkShaderErrors = false;
            }

            this.container.innerHTML = '';
            this.container.style.position = 'relative';
            this.container.style.overflow = 'hidden';
            this.container.appendChild(this.renderer.domElement);

            // Studio Showroom Environment for Photorealistic Automotive PBR Reflections
            const studioEnv = createStudioEnvironment(THREE, this.renderer);
            if (studioEnv) {
                this.scene.environment = studioEnv;
            }

            // Studio Showroom Lighting
            this.ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
            this.scene.add(this.ambientLight);

            this.keyLight = new THREE.DirectionalLight(0xffffff, 1.20);
            this.keyLight.position.set(4, 5, 4);
            this.scene.add(this.keyLight);

            this.fillLight = new THREE.DirectionalLight(0xa5c4d4, 0.55);
            this.fillLight.position.set(-4, 3, -2);
            this.scene.add(this.fillLight);

            this.rimLight = new THREE.DirectionalLight(0xffffff, 0.85);
            this.rimLight.position.set(0, 4, -5);
            this.scene.add(this.rimLight);

            this.softboxLight = new THREE.DirectionalLight(0xffffff, 0.70);
            this.softboxLight.position.set(0, 6, 0);
            this.scene.add(this.softboxLight);

            this.neonLight = new THREE.PointLight(0x00f0ff, 0, 4.0);
            this.neonLight.position.set(0, 0.14, 0);
            this.scene.add(this.neonLight);

            // Forward Headlight Floor Beams in Showroom
            this.headlightSpotL = new THREE.SpotLight(0xffffff, 0, 10, Math.PI / 4.5, 0.45, 1.2);
            this.headlightSpotL.position.set(-0.65, 0.65, 1.8);
            this.headlightSpotR = new THREE.SpotLight(0xffffff, 0, 10, Math.PI / 4.5, 0.45, 1.2);
            this.headlightSpotR.position.set(0.65, 0.65, 1.8);

            this.headlightTargetL = new THREE.Object3D();
            this.headlightTargetL.position.set(-0.65, 0, 5.0);
            this.scene.add(this.headlightTargetL);
            this.headlightSpotL.target = this.headlightTargetL;

            this.headlightTargetR = new THREE.Object3D();
            this.headlightTargetR.position.set(0.65, 0, 5.0);
            this.scene.add(this.headlightTargetR);
            this.headlightSpotR.target = this.headlightTargetR;

            this.scene.add(this.headlightSpotL);
            this.scene.add(this.headlightSpotR);

            if (this.options.showPodium) {
                this.createPodium();
            }
        }

        createPodium() {
            const THREE = this.THREE;
            this.podiumGroup = new THREE.Group();

            // Circular reflective disc
            const discGeo = new THREE.CylinderGeometry(2.9, 3.0, 0.08, 48);
            const discMat = new THREE.MeshStandardMaterial({
                color: 0x0f1422,
                roughness: 0.16,
                metalness: 0.70
            });
            this.podiumDiscMat = discMat;
            const disc = new THREE.Mesh(discGeo, discMat);
            disc.position.y = -0.04;
            this.podiumGroup.add(disc);

            // Outer glowing neon ring on podium rim
            const ringGeo = new THREE.TorusGeometry(2.98, 0.026, 8, 64);
            ringGeo.rotateX(Math.PI / 2);
            this.podiumRingMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.85
            });
            const ring = new THREE.Mesh(ringGeo, this.podiumRingMat);
            ring.position.y = 0.005;
            this.podiumGroup.add(ring);

            // Soft realistic ambient occlusion contact shadow under car
            const shadowCvs = document.createElement('canvas');
            shadowCvs.width = 128;
            shadowCvs.height = 128;
            const sCtx = shadowCvs.getContext('2d');
            const sGrad = sCtx.createRadialGradient(64, 64, 12, 64, 64, 64);
            sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
            sGrad.addColorStop(0.40, 'rgba(0, 0, 0, 0.55)');
            sGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.18)');
            sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            sCtx.fillStyle = sGrad;
            sCtx.fillRect(0, 0, 128, 128);

            const shadowTex = new THREE.CanvasTexture(shadowCvs);
            const shadowGeo = new THREE.PlaneGeometry(2.8, 5.0);
            shadowGeo.rotateX(-Math.PI / 2);
            const shadowMat = new THREE.MeshBasicMaterial({
                map: shadowTex,
                transparent: true,
                opacity: 0.90,
                depthWrite: false
            });
            const shadow = new THREE.Mesh(shadowGeo, shadowMat);
            shadow.position.y = 0.003;
            this.podiumGroup.add(shadow);

            this.scene.add(this.podiumGroup);
        }

        updateCameraPosition() {
            const rawAspect = (this.camera && Number.isFinite(this.camera.aspect) && this.camera.aspect > 0)
                ? this.camera.aspect
                : ((this.width || 320) / Math.max(1, this.height || 240));
            const aspect = Math.max(0.45, rawAspect);
            const preset = this.activeViewPreset || this.currentPreset || 'isometric';
            const isCloseUpPlate = preset === 'plate_zoom' || preset === 'plate_front' || preset === 'plate_rear';
            const aspectFitMult = isCloseUpPlate
                ? (aspect < 1.15 ? Math.min(1.35, 1.15 / aspect) : 1.0)
                : (aspect < 1.55 ? Math.min(1.85, 1.55 / Math.pow(aspect, 0.78)) : 1.0);
            this.cameraDist = this.cameraDistance;
            this.activeViewPreset = this.currentPreset;
            let effectiveDist = this.cameraDistance * aspectFitMult;
            // Optional framing: project all eight model bounds onto the camera axes.
            // Cache bounds on model/viewport changes; the render loop does no traversal.
            if (this.options.fitModelBounds && this.modelFrameCorners && !isCloseUpPlate) {
                const halfVertical = this.camera.fov * Math.PI / 360;
                const halfHorizontal = Math.atan(Math.tan(halfVertical) * rawAspect);
                const sy = Math.sin(this.cameraAngleY), cy = Math.cos(this.cameraAngleY);
                const sx = Math.sin(this.cameraAngleX), cx = Math.cos(this.cameraAngleX);
                let fitDistance = 0;
                for (const p of this.modelFrameCorners) {
                    const y = p.y - this.targetY;
                    const right = p.x * cy - p.z * sy;
                    const up = -p.x * sy * sx + y * cx - p.z * cy * sx;
                    const depth = p.x * sy * cx + y * sx + p.z * cy * cx;
                    fitDistance = Math.max(fitDistance, Math.abs(right) / Math.tan(halfHorizontal) + depth,
                        Math.abs(up) / Math.tan(halfVertical) + depth);
                }
                fitDistance *= 1.16;
                effectiveDist = fitDistance * (this.cameraDistance / 4.3);
            }
            const cx = Math.sin(this.cameraAngleY) * Math.cos(this.cameraAngleX) * effectiveDist;
            const cy = Math.sin(this.cameraAngleX) * effectiveDist + this.targetY;
            const cz = Math.cos(this.cameraAngleY) * Math.cos(this.cameraAngleX) * effectiveDist;
            this.camera.position.set(cx, cy, cz);
            this.camera.lookAt(0, this.targetY, 0);
        }

        fitCameraToCar() {
            if (this.container && this.camera) {
                const rect = (typeof this.container.getBoundingClientRect === 'function') ? this.container.getBoundingClientRect() : null;
                const w = Math.floor(rect && rect.width ? rect.width : (this.container.clientWidth || this.width || 320));
                const h = Math.floor(rect && rect.height ? rect.height : (this.container.clientHeight || this.height || 240));
                if (w > 0 && h > 0) {
                    this.width = w;
                    this.height = h;
                    this.camera.aspect = w / h;
                    if (typeof this.camera.updateProjectionMatrix === 'function') {
                        this.camera.updateProjectionMatrix();
                    }
                    if (this.renderer && typeof this.renderer.setSize === 'function') {
                        this.renderer.setSize(w, h, false);
                    }
                }
            }
            const activeModel = this.glbCar || this.proceduralCar || this.carGroup;
            if (activeModel && this.THREE) {
                fitModelToShowroom(this.THREE, activeModel, 4.8);
                if (this.options.fitModelBounds) {
                    activeModel.updateMatrixWorld(true);
                    const bounds = new this.THREE.Box3().setFromObject(activeModel);
                    this.modelFrameCorners = [];
                    for (const x of [bounds.min.x, bounds.max.x])
                        for (const y of [bounds.min.y, bounds.max.y])
                            for (const z of [bounds.min.z, bounds.max.z]) this.modelFrameCorners.push({x,y,z});
                }
            }
            this.updateCameraPosition();
            this.needsRender = true;
        }

        setLoading(isLoading, text) {
            if (typeof document === 'undefined') return;
            const loaderId = (this.options && this.options.loaderId) || 'styling-3d-loader';
            const textId = (this.options && this.options.loaderTextId) || 'styling-3d-loader-text';
            const loader = document.getElementById(loaderId);
            const label = document.getElementById(textId);
            if (loader) {
                loader.style.display = isLoading ? 'flex' : 'none';
                if (label && text) label.textContent = text;
            }
        }

        setCar(carName, styling = {}) {
            this.currentCarName = carName || 'ВАЗ-2107 «Жигули»';
            this.currentStyling = Object.assign({}, styling);

            const THREE = this.THREE;
            const carId = identifyCarModel(this.currentCarName);
            const hasGlb = !!GLB_MODEL_MAP[carId];
            const loader = getGLTFLoader(THREE);

            // If the same GLB model is already loaded and active, just re-apply styling in place
            if (hasGlb && loader && this.glbCar && this.glbCar.userData && this.glbCar.userData.carId === carId) {
                this.setLoading(false);
                applyStylingToGLTF(THREE, this.glbCar, this.currentStyling, carId);
                applyInteractiveAnglesToModel(this.glbCar, this.doorAngle, this.hoodAngle, this.trunkAngle);
                this.updateActiveCarVisibility();
                this.updateNeonLight();
                this.updateCapabilities();
                this.updateLightsRigPositions();
                this.updateHeadlightsState();
                this.fitCameraToCar();
                this.needsRender = true;
                if (!this.active) this.start();
                return;
            }

            this._loadRequestId = (this._loadRequestId || 0) + 1;
            const reqId = this._loadRequestId;

            if (hasGlb && loader) {
                // Instant procedural preview on podium so user never stares into an empty void!
                if (!this.glbCar && !this.proceduralCar) {
                    try {
                        this.proceduralCar = buildDetailedCarModel(THREE, this.currentCarName, this.currentStyling);
                        if (this.proceduralCar) {
                            fitModelToShowroom(THREE, this.proceduralCar, 4.8);
                            applyInteractiveAnglesToModel(this.proceduralCar, this.doorAngle, this.hoodAngle, this.trunkAngle);
                            this.scene.add(this.proceduralCar);
                            this.carGroup = this.proceduralCar;
                            this.updateActiveCarVisibility();
                            this.updateCapabilities();
                            this.fitCameraToCar();
                        }
                    } catch (_) {}
                }

                this.setLoading(true, 'Загрузка 3D модели...');

                loadCarModel(
                    THREE,
                    this.currentCarName,
                    this.currentStyling,
                    loadedModel => {
                        this.setLoading(false);
                        if (this._loadRequestId !== reqId || !loadedModel) { if(loadedModel)deepDispose(loadedModel); return; }

                        if (this.glbCar) {
                            this.scene.remove(this.glbCar);
                            deepDispose(this.glbCar);
                            this.glbCar = null;
                        }
                        if (this.proceduralCar) {
                            this.scene.remove(this.proceduralCar);
                            deepDispose(this.proceduralCar);
                            this.proceduralCar = null;
                        }
                        if (this.carGroup) {
                            this.scene.remove(this.carGroup);
                            this.carGroup = null;
                        }

                        loadedModel.userData.carId = carId;
                        loadedModel.traverse(c => {
                            if (c.userData && c.userData.isSteerable) {
                                c.rotation.y = c.userData.baseRotY || 0;
                            }
                        });
                        fitModelToShowroom(THREE, loadedModel, 4.8);
                        applyInteractiveAnglesToModel(loadedModel, this.doorAngle, this.hoodAngle, this.trunkAngle);
                        this.glbCar = loadedModel;
                        this.carGroup = loadedModel;
                        this.scene.add(loadedModel);

                        this.updateActiveCarVisibility();
                        this.updateNeonLight();
                        this.updateCapabilities();
                        this.updateLightsRigPositions();
                        this.updateHeadlightsState();
                        this.fitCameraToCar();
                        this.needsRender = true;
                    },
                    pct => {
                        if (this._loadRequestId === reqId) {
                            this.setLoading(true, `Загрузка 3D модели ${pct}%...`);
                        }
                    }
                );
            } else {
                // Fallback (or in test environments without GLTFLoader): build detailed procedural model
                this.setLoading(false);
                if (this.glbCar) {
                    this.scene.remove(this.glbCar);
                    deepDispose(this.glbCar);
                    this.glbCar = null;
                }
                if (this.proceduralCar) {
                    this.scene.remove(this.proceduralCar);
                    deepDispose(this.proceduralCar);
                    this.proceduralCar = null;
                }
                if (this.carGroup) {
                    this.scene.remove(this.carGroup);
                    deepDispose(this.carGroup);
                    this.carGroup = null;
                }

                try {
                    this.proceduralCar = buildDetailedCarModel(THREE, this.currentCarName, this.currentStyling);
                    if (this.proceduralCar) {
                        fitModelToShowroom(THREE, this.proceduralCar, 4.8);
                        this.proceduralCar.traverse(c => {
                            if (c.userData && c.userData.isSteerable) {
                                c.rotation.y = c.userData.baseRotY || 0;
                            }
                        });
                        if (this.currentStyling && this.currentStyling.plate !== undefined) {
                            applyLicensePlateToModel(
                                THREE,
                                this.proceduralCar,
                                this.currentStyling.plate,
                                this.currentStyling.frameStyle || 'none',
                                this.currentStyling.plateStyle || 'classic'
                            );
                        }
                        applyInteractiveAnglesToModel(this.proceduralCar, this.doorAngle, this.hoodAngle, this.trunkAngle);
                        this.scene.add(this.proceduralCar);
                        this.carGroup = this.proceduralCar;
                    }
                } catch (_) {}

                this.updateActiveCarVisibility();
                this.updateNeonLight();
                this.updateCapabilities();
                this.updateLightsRigPositions();
                this.updateHeadlightsState();
                this.fitCameraToCar();
                this.needsRender = true;
            }
        }

        updateActiveCarVisibility() {
            if (this.glbCar) {
                this.glbCar.visible = true;
                this.carGroup = this.glbCar;
                if (this.proceduralCar && this.proceduralCar !== this.glbCar) {
                    this.proceduralCar.visible = false;
                }
            } else if (this.proceduralCar) {
                this.proceduralCar.visible = true;
                this.carGroup = this.proceduralCar;
            }
            if (this.currentStyling && this.currentStyling.stanceMode && this.currentStyling.stanceMode !== this.stanceMode) {
                this.setPneumoStance(this.currentStyling.stanceMode);
            } else {
                this.applyStanceToActiveCar();
            }
            if (this.fsoActive) {
                this.ensureFsoRig();
            }
        }

        updatePlate(plateText, frameStyle, plateStyle) {
            this.currentStyling.plate = plateText;
            if (frameStyle !== undefined) this.currentStyling.frameStyle = frameStyle;
            if (plateStyle !== undefined) this.currentStyling.plateStyle = plateStyle;
            const fStyle = this.currentStyling.frameStyle || 'none';
            const pStyle = this.currentStyling.plateStyle || 'classic';
            if (this.proceduralCar && this.THREE) {
                applyLicensePlateToModel(this.THREE, this.proceduralCar, plateText, fStyle, pStyle);
            }
            if (this.glbCar && this.THREE) {
                applyLicensePlateToModel(this.THREE, this.glbCar, plateText, fStyle, pStyle);
            }
            if (this.carGroup && this.THREE) {
                applyLicensePlateToModel(this.THREE, this.carGroup, plateText, fStyle, pStyle);
            }
            this.needsRender = true;
        }

        updateStyling(styling = {}) {
            Object.assign(this.currentStyling, styling);
            if ((styling.plate !== undefined || styling.frameStyle !== undefined || styling.plateStyle !== undefined) && this.THREE) {
                this.updatePlate(
                    this.currentStyling.plate !== undefined ? this.currentStyling.plate : 'А 777 АА | 77 RUS',
                    this.currentStyling.frameStyle,
                    this.currentStyling.plateStyle
                );
            }
            const carId = identifyCarModel(this.currentCarName);
            if (this.glbCar && GLB_MODEL_MAP[carId]) {
                applyStylingToGLTF(this.THREE, this.glbCar, this.currentStyling, carId);
                applyInteractiveAnglesToModel(this.glbCar, this.doorAngle, this.hoodAngle, this.trunkAngle);
                this.updateNeonLight();
                this.updateCapabilities();
                this.updateLightsRigPositions();
                this.updateHeadlightsState();
                this.updateActiveCarVisibility();
                this.needsRender = true;
                return;
            }
            this.setCar(this.currentCarName, this.currentStyling);
            this.needsRender = true;
        }

        get styling() {
            return this.currentStyling;
        }

        updateNeonLight() {
            const neonVal = this.currentStyling.neon;
            if (!neonVal || neonVal === 'none') {
                this.neonLight.intensity = 0;
            } else {
                const col = parseColor(neonVal, 0x00f0ff);
                this.neonLight.color.setHex(col);
                this.neonLight.intensity = 1.6;
                if (this.podiumRingMat) {
                    this.podiumRingMat.color.setHex(col);
                }
            }
        }

        updateCapabilities() {
            const activeModel = this.glbCar || this.proceduralCar || this.carGroup;
            if (!activeModel) {
                this.capabilities = { doors: true, hood: true, trunk: true, headlights: true };
                return;
            }
            const hasDoorPivots = !!activeModel.getObjectByName('Door_FL_Pivot');
            const hasHoodPivots = !!activeModel.getObjectByName('Hood_Pivot');
            const hasTrunkPivots = !!activeModel.getObjectByName('Trunk_Pivot');

            this.capabilities = {
                doors: hasDoorPivots,
                hood: hasHoodPivots,
                trunk: hasTrunkPivots,
                headlights: true
            };

            if (!hasDoorPivots) {
                this.doorsOpen = false;
                this.targetDoorAngle = 0;
                this.doorAngle = 0;
            }
            if (!hasHoodPivots) {
                this.hoodOpen = false;
                this.targetHoodAngle = 0;
                this.hoodAngle = 0;
            }
            if (!hasTrunkPivots) {
                this.trunkOpen = false;
                this.targetTrunkAngle = 0;
                this.trunkAngle = 0;
            }

            if (typeof this.onCapabilitiesChange === 'function') {
                this.onCapabilitiesChange(this.capabilities);
            }
        }

        hasCapability(feature) {
            if (!this.capabilities) return true;
            return this.capabilities[feature] !== false;
        }

        syncInteractiveModels() {
            if (this.glbCar) applyInteractiveAnglesToModel(this.glbCar, this.doorAngle, this.hoodAngle, this.trunkAngle);
            if (this.proceduralCar && this.proceduralCar !== this.glbCar) applyInteractiveAnglesToModel(this.proceduralCar, this.doorAngle, this.hoodAngle, this.trunkAngle);
            if (this.carGroup && this.carGroup !== this.proceduralCar && this.carGroup !== this.glbCar) applyInteractiveAnglesToModel(this.carGroup, this.doorAngle, this.hoodAngle, this.trunkAngle);
        }

        toggleDoors() {
            if (!this.hasCapability('doors')) {
                this.doorsOpen = false;
                this.targetDoorAngle = 0;
                return false;
            }
            this.doorsOpen = !this.doorsOpen;
            this.targetDoorAngle = this.doorsOpen ? 1.05 : 0;
            if (this.doorsOpen && this.doorAngle <= 0.005) {
                this.doorAngle = 0.01;
            } else if (!this.doorsOpen && this.doorAngle <= 0.02) {
                this.doorAngle = 0;
            }
            this.syncInteractiveModels();
            this.updateActiveCarVisibility();
            this.needsRender = true;
            return this.doorsOpen;
        }

        toggleHood() {
            if (!this.hasCapability('hood')) {
                this.hoodOpen = false;
                this.targetHoodAngle = 0;
                return false;
            }
            this.hoodOpen = !this.hoodOpen;
            this.targetHoodAngle = this.hoodOpen ? 0.85 : 0;
            if (this.hoodOpen && this.hoodAngle <= 0.005) {
                this.hoodAngle = 0.01;
            } else if (!this.hoodOpen && this.hoodAngle <= 0.02) {
                this.hoodAngle = 0;
            }
            this.syncInteractiveModels();
            this.updateActiveCarVisibility();
            this.needsRender = true;
            return this.hoodOpen;
        }

        toggleTrunk() {
            if (!this.hasCapability('trunk')) {
                this.trunkOpen = false;
                this.targetTrunkAngle = 0;
                return false;
            }
            this.trunkOpen = !this.trunkOpen;
            this.targetTrunkAngle = this.trunkOpen ? 0.90 : 0;
            if (this.trunkOpen && this.trunkAngle <= 0.005) {
                this.trunkAngle = 0.01;
            } else if (!this.trunkOpen && this.trunkAngle <= 0.02) {
                this.trunkAngle = 0;
            }
            this.syncInteractiveModels();
            this.updateActiveCarVisibility();
            this.needsRender = true;
            return this.trunkOpen;
        }

        toggleHeadlights() {
            this.headlightsOn = !this.headlightsOn;
            this.updateHeadlightsState();
            this.needsRender = true;
            return this.headlightsOn;
        }

        setViewPreset(presetName, immediate = false) {
            this.currentPreset = presetName || 'isometric';
            this.activeViewPreset = this.currentPreset;
            switch (presetName) {
                case 'front':
                    this.targetAngleY = 0;
                    this.targetAngleX = 0.12;
                    this.targetDistance = 4.2;
                    this.targetCenterY = 0.50;
                    break;
                case 'rear':
                    this.targetAngleY = Math.PI;
                    this.targetAngleX = 0.12;
                    this.targetDistance = 4.2;
                    this.targetCenterY = 0.50;
                    break;
                case 'plate_zoom':
                case 'plate_front':
                    this.targetAngleY = 0;
                    this.targetAngleX = 0.08;
                    this.targetDistance = Math.max(this.minDistance || this.options.minDistance || 2.2, 4.2 * 0.72);
                    this.targetCenterY = 0.44;
                    break;
                case 'plate_rear':
                    this.targetAngleY = Math.PI;
                    this.targetAngleX = 0.08;
                    this.targetDistance = Math.max(this.minDistance || this.options.minDistance || 2.2, 4.2 * 0.72);
                    this.targetCenterY = 0.48;
                    break;
                case 'side':
                    this.targetAngleY = Math.PI / 2;
                    this.targetAngleX = 0.08;
                    this.targetDistance = 4.4;
                    this.targetCenterY = 0.52;
                    break;
                case 'top':
                    this.targetAngleY = 0;
                    this.targetAngleX = Math.PI / 2.05;
                    this.targetDistance = 5.8;
                    this.targetCenterY = 0.50;
                    break;
                case 'isometric':
                case '3d':
                default:
                    this.currentPreset = 'isometric';
                    this.activeViewPreset = 'isometric';
                    this.targetAngleY = Math.PI / 4.2;
                    this.targetAngleX = 0.26;
                    this.targetDistance = 4.3;
                    this.targetCenterY = 0.52;
                    break;
            }
            if (immediate) {
                this.cameraAngleY = this.targetAngleY;
                this.cameraAngleX = this.targetAngleX;
                this.cameraDistance = this.targetDistance;
                this.cameraDist = this.cameraDistance;
                this.targetY = this.targetCenterY;
                this.updateCameraPosition();
            }
            this.needsRender = true;
        }

        setCameraView(presetName, immediate = false) {
            this.setViewPreset(presetName, immediate);
        }

        resetCamera() {
            this.setViewPreset('isometric');
        }

        toggleAutoRotate() {
            this.options.autoRotate = !this.options.autoRotate;
            return this.options.autoRotate;
        }

        rotateBy(angleDelta = 0.45) {
            this.targetAngleY += angleDelta;
            this.cameraAngleY += angleDelta;
            this.updateCameraPosition();
            this.needsRender = true;
            if (!this.active) this.start();
            if (this.renderer && this.scene && this.camera) {
                if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraLivery?.update(this.scene);this.renderer.render(this.scene, this.camera);
                this.needsRender = false;
            }
        }

        updateLightsRigPositions() {
            const activeModel = this.glbCar || this.proceduralCar || this.carGroup;
            if (!activeModel || !this.THREE) return;
            const THREE = this.THREE;

            try {
                const carId = (activeModel.userData && activeModel.userData.carId) || identifyCarModel(this.currentCarName);
                const lightPos = detectVehicleLightPositions(activeModel, carId, THREE);

                if (this.headlightSpotL && this.headlightSpotR) {
                    this.headlightSpotL.position.copy(lightPos.hlL);
                    this.headlightSpotR.position.copy(lightPos.hlR);
                }
                if (this.headlightTargetL && this.headlightTargetR) {
                    this.headlightTargetL.position.set(lightPos.hlL.x * 1.05, 0, lightPos.hlL.z + 5.5);
                    this.headlightTargetR.position.set(lightPos.hlR.x * 1.05, 0, lightPos.hlR.z + 5.5);
                }
                if (this.frontLightL) this.frontLightL.position.set(lightPos.hlL.x, lightPos.hlL.y, lightPos.hlL.z + 0.02);
                if (this.frontLightR) this.frontLightR.position.set(lightPos.hlR.x, lightPos.hlR.y, lightPos.hlR.z + 0.02);

                if (this.flareMeshL) this.flareMeshL.position.copy(lightPos.hlL);
                if (this.flareMeshR) this.flareMeshR.position.copy(lightPos.hlR);

                if (this.taillightFlareL) this.taillightFlareL.position.copy(lightPos.tlL);
                if (this.taillightFlareR) this.taillightFlareR.position.copy(lightPos.tlR);

                if (this.rearLightL) this.rearLightL.position.set(lightPos.tlL.x, lightPos.tlL.y, lightPos.tlL.z - 0.03);
                if (this.rearLightR) this.rearLightR.position.set(lightPos.tlR.x, lightPos.tlR.y, lightPos.tlR.z - 0.03);
            } catch (_) {}
        }

        updateHeadlightsState() {
            const THREE = this.THREE;
            if (this.headlightSpotL) this.headlightSpotL.intensity = this.headlightsOn ? 3.8 : 0;
            if (this.headlightSpotR) this.headlightSpotR.intensity = this.headlightsOn ? 3.8 : 0;

            // Forward Showroom PointLights for realistic bumper & ground illumination
            if (!this.frontLightL && THREE) {
                this.frontLightL = new THREE.PointLight(0xfffae8, 0, 7, 1.6);
                this.frontLightL.position.set(-0.65, 0.65, 2.15);
                this.scene.add(this.frontLightL);
            }
            if (!this.frontLightR && THREE) {
                this.frontLightR = new THREE.PointLight(0xfffae8, 0, 7, 1.6);
                this.frontLightR.position.set(0.65, 0.65, 2.15);
                this.scene.add(this.frontLightR);
            }
            if (this.frontLightL) this.frontLightL.intensity = this.headlightsOn ? 3.5 : 0;
            if (this.frontLightR) this.frontLightR.intensity = this.headlightsOn ? 3.5 : 0;

            // Rear Taillight Soft Red PointLights
            if (!this.rearLightL && THREE) {
                this.rearLightL = new THREE.PointLight(0xff1122, 0, 5, 1.8);
                this.rearLightL.position.set(-0.65, 0.70, -2.15);
                this.scene.add(this.rearLightL);
            }
            if (!this.rearLightR && THREE) {
                this.rearLightR = new THREE.PointLight(0xff1122, 0, 5, 1.8);
                this.rearLightR.position.set(0.65, 0.70, -2.15);
                this.scene.add(this.rearLightR);
            }
            if (this.rearLightL) this.rearLightL.intensity = this.headlightsOn ? 2.0 : 0;
            if (this.rearLightR) this.rearLightR.intensity = this.headlightsOn ? 2.0 : 0;

            const createSoftGlowTexture = (colorHex) => {
                if (!THREE) return null;
                try {
                    if (typeof document !== 'undefined' && document.createElement) {
                        const canvas = document.createElement('canvas');
                        canvas.width = 64;
                        canvas.height = 64;
                        const ctx = canvas.getContext('2d');
                        if (ctx && ctx.createRadialGradient) {
                            const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
                            grad.addColorStop(0, colorHex || '#ffffff');
                            grad.addColorStop(0.2, colorHex || '#ffffff');
                            grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.35)');
                            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                            ctx.fillStyle = grad;
                            ctx.fillRect(0, 0, 64, 64);
                            return new THREE.CanvasTexture(canvas);
                        }
                    }
                } catch (_) {}
                return null;
            };

            // Visible glowing headlight lens flares flush on the car front lenses
            if (!this.headlightFlares && THREE) {
                this.headlightFlares = new THREE.Group();
                this.headlightFlares.name = 'ShowroomHeadlightFlares';
                const hlTex = createSoftGlowTexture('#ffffff');
                const flareMat = new THREE.SpriteMaterial({
                    map: hlTex,
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.85,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                this.flareMeshL = new THREE.Sprite(flareMat);
                this.flareMeshL.scale.set(0.18, 0.18, 1);
                this.flareMeshL.position.set(-0.65, 0.62, 2.15);
                this.flareMeshR = new THREE.Sprite(flareMat);
                this.flareMeshR.scale.set(0.18, 0.18, 1);
                this.flareMeshR.position.set(0.65, 0.62, 2.15);
                this.headlightFlares.add(this.flareMeshL);
                this.headlightFlares.add(this.flareMeshR);
                this.scene.add(this.headlightFlares);
            }
            if (this.headlightFlares) {
                this.headlightFlares.visible = !!this.headlightsOn;
            }

            // Visible glowing taillight lens flares flush on the car rear lenses
            if (!this.taillightFlares && THREE) {
                this.taillightFlares = new THREE.Group();
                this.taillightFlares.name = 'ShowroomTaillightFlares';
                const tlTex = createSoftGlowTexture('#ff1a2a');
                const tailMat = new THREE.SpriteMaterial({
                    map: tlTex,
                    color: 0xff1a2a,
                    transparent: true,
                    opacity: 0.85,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                this.taillightFlareL = new THREE.Sprite(tailMat);
                this.taillightFlareL.scale.set(0.15, 0.15, 1);
                this.taillightFlareL.position.set(-0.65, 0.70, -2.15);
                this.taillightFlareR = new THREE.Sprite(tailMat);
                this.taillightFlareR.scale.set(0.15, 0.15, 1);
                this.taillightFlareR.position.set(0.65, 0.70, -2.15);
                this.taillightFlares.add(this.taillightFlareL);
                this.taillightFlares.add(this.taillightFlareR);
                this.scene.add(this.taillightFlares);
            }
            if (this.taillightFlares) {
                this.taillightFlares.visible = !!this.headlightsOn;
            }

            this.updateLightsRigPositions();

            const updateModelLights = (model) => {
                if (!model) return;
                const hlGroup = model.getObjectByName('HeadlightsGroup');
                if (hlGroup) {
                    hlGroup.traverse(obj => {
                        if (obj.isPointLight) obj.intensity = this.headlightsOn ? 3.5 : 0;
                    });
                }
                const badWords = /interior|seat|dash|mirror|cabin|roof|wheel|tire|caliper|disc|brake_disc|bumper|grille|radiator/i;
                model.traverse(obj => {
                    if (isIgnoredAccessoryOrRigNode(obj, model)) return;
                    if (obj.isMesh && obj.material) {
                        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                        mats.forEach(mat => {
                            const matName = String(mat.name || '').toLowerCase();
                            const meshName = String(obj.name || '').toLowerCase();
                            if (badWords.test(matName) || badWords.test(meshName)) return;

                            const isHeadlightMat = (/headlight|head.*light|head.*lamp|headlamp|headglass|lens.*front|front.*light|fara|fary|glass.*light|mt_light_emissive/i.test(matName) ||
                                                    /headlight|head.*light|head.*lamp|headlamp|headglass|fara|fary/i.test(meshName)) &&
                                                   !/taillight|tail|rear|back|brake/i.test(matName) && !/taillight|tail|rear|back|brake/i.test(meshName);

                            const isTaillightMat = /taillight|tail.*light|tail.*lamp|tailglass|tailpiece|reflector.*tl|reflector.*bl|brake.*light|rear.*light|stop.*light|zadn.*fara/i.test(matName) ||
                                                   /taillight|tail.*light|tail.*lamp|tailglass|tailpiece|brake.*light|rear.*light|stop.*light|zadn.*fara|backlight/i.test(meshName);

                            if (isHeadlightMat) {
                                if (mat.emissive) {
                                    if (this.headlightsOn) {
                                        if (!mat.userData._origEmissive) mat.userData._origEmissive = mat.emissive.clone();
                                        mat.emissive.setHex(0xffffff);
                                        mat.emissiveIntensity = 3.2;
                                    } else {
                                        if (mat.userData._origEmissive) mat.emissive.copy(mat.userData._origEmissive);
                                        mat.emissiveIntensity = 0.4;
                                    }
                                } else if (mat.color && typeof mat.color.setHex === 'function') {
                                    if (this.headlightsOn) {
                                        if (!mat.userData._origColor) mat.userData._origColor = mat.color.getHex();
                                        mat.color.setHex(0xffffff);
                                    } else if (mat.userData._origColor) {
                                        mat.color.setHex(mat.userData._origColor);
                                    }
                                }
                            } else if (isTaillightMat) {
                                if (mat.emissive) {
                                    if (this.headlightsOn) {
                                        if (!mat.userData._origEmissive) mat.userData._origEmissive = mat.emissive.clone();
                                        mat.emissive.setHex(0xff0820);
                                        mat.emissiveIntensity = 2.4;
                                    } else {
                                        if (mat.userData._origEmissive) mat.emissive.copy(mat.userData._origEmissive);
                                        mat.emissiveIntensity = 0.3;
                                    }
                                }
                            }
                        });
                    }
                });
            };

            if (this.glbCar) updateModelLights(this.glbCar);
            if (this.proceduralCar) updateModelLights(this.proceduralCar);
            if (this.carGroup && this.carGroup !== this.glbCar && this.carGroup !== this.proceduralCar) {
                updateModelLights(this.carGroup);
            }
        }

        getInteractiveState() {
            return {
                doorsOpen: this.doorsOpen,
                hoodOpen: this.hoodOpen,
                trunkOpen: this.trunkOpen,
                headlightsOn: this.headlightsOn,
                fsoActive: this.fsoActive,
                stanceMode: this.stanceMode,
                envTheme: this.envTheme
            };
        }

        ensureFsoRig() {
            const THREE = this.THREE;
            if (!THREE || !this.scene) return;
            if (!this.fsoGroup) {
                this.fsoGroup = new THREE.Group();
                this.fsoGroup.name = 'ShowroomFsoGroup';

                const podGeo = new THREE.BoxGeometry(0.11, 0.045, 0.04);
                this.fsoMatL = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
                this.fsoMatR = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });

                this.fsoPodL = new THREE.Mesh(podGeo, this.fsoMatL);
                this.fsoPodR = new THREE.Mesh(podGeo, this.fsoMatR);
                this.fsoPodL.position.set(-0.22, 0.56, 2.12);
                this.fsoPodR.position.set(0.22, 0.56, 2.12);

                this.fsoPointL = new THREE.PointLight(0x93c5fd, 0, 6.5, 1.5);
                this.fsoPointR = new THREE.PointLight(0x93c5fd, 0, 6.5, 1.5);
                this.fsoPointL.position.set(-0.22, 0.56, 2.22);
                this.fsoPointR.position.set(0.22, 0.56, 2.22);

                // Magnetic VIP Roof Beacon (blue/red special signal dome)
                const baseGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.025, 16);
                const baseMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.8 });
                this.roofBeaconBase = new THREE.Mesh(baseGeo, baseMat);
                this.roofBeaconBase.position.set(0.24, 1.42, 0.08);

                const domeGeo = new THREE.CylinderGeometry(0.062, 0.072, 0.075, 16);
                this.roofBeaconMat = new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.92 });
                this.roofBeaconDome = new THREE.Mesh(domeGeo, this.roofBeaconMat);
                this.roofBeaconDome.position.set(0.24, 1.465, 0.08);

                this.roofBeaconLight = new THREE.PointLight(0x2563eb, 0, 7.5, 1.5);
                this.roofBeaconLight.position.set(0.24, 1.55, 0.08);

                this.fsoGroup.add(this.fsoPodL);
                this.fsoGroup.add(this.fsoPodR);
                this.fsoGroup.add(this.fsoPointL);
                this.fsoGroup.add(this.fsoPointR);
                this.fsoGroup.add(this.roofBeaconBase);
                this.fsoGroup.add(this.roofBeaconDome);
                this.fsoGroup.add(this.roofBeaconLight);
                this.fsoGroup.visible = false;
                this.scene.add(this.fsoGroup);
            }

            // Align FSO pods & roof beacon to current vehicle bounding box / light rig
            const activeModel = this.glbCar || this.proceduralCar || this.carGroup;
            if (activeModel) {
                try {
                    const carId = (activeModel.userData && activeModel.userData.carId) || identifyCarModel(this.currentCarName);
                    const lightPos = detectVehicleLightPositions(activeModel, carId, THREE);
                    const fsoY = Math.max(0.38, lightPos.hlL.y - 0.03) + (this.stanceOffsetY || 0);
                    const fsoZ = lightPos.hlL.z + 0.02;
                    const fsoX = Math.max(0.16, Math.abs(lightPos.hlL.x) * 0.38);
                    this.fsoPodL.position.set(-fsoX, fsoY, fsoZ);
                    this.fsoPodR.position.set(fsoX, fsoY, fsoZ);
                    this.fsoPointL.position.set(-fsoX, fsoY, fsoZ + 0.12);
                    this.fsoPointR.position.set(fsoX, fsoY, fsoZ + 0.12);

                    const box = new THREE.Box3().setFromObject(activeModel);
                    const roofY = (Number.isFinite(box.max.y) && box.max.y > 0.8 ? box.max.y : 1.38);
                    this.roofBeaconBase.position.set(0.22, roofY + 0.01, 0.05);
                    this.roofBeaconDome.position.set(0.22, roofY + 0.055, 0.05);
                    this.roofBeaconLight.position.set(0.22, roofY + 0.14, 0.05);
                } catch (_) {}
            }
        }

        toggleFsoStrobes(forceState) {
            this.fsoActive = typeof forceState === 'boolean' ? forceState : !this.fsoActive;
            this.ensureFsoRig();
            if (this.fsoGroup) {
                this.fsoGroup.visible = this.fsoActive;
                if (!this.fsoActive) {
                    if (this.fsoPointL) this.fsoPointL.intensity = 0;
                    if (this.fsoPointR) this.fsoPointR.intensity = 0;
                    if (this.roofBeaconLight) this.roofBeaconLight.intensity = 0;
                } else {
                    this.updateFsoRig(typeof performance !== 'undefined' ? performance.now() : Date.now());
                }
            }
            this.needsRender = true;
            if (!this.active) this.start();
            return this.fsoActive;
        }

        updateFsoRig(time) {
            if (!this.fsoActive || !this.fsoGroup) return;
            const phase = Math.floor((time || 0) / 55) % 8;
            // Double-burst alternating pattern: Left flashes on 0, 2; Right flashes on 4, 6
            const leftOn = phase === 0 || phase === 2;
            const rightOn = phase === 4 || phase === 6;

            if (this.fsoPodL) this.fsoPodL.visible = true;
            if (this.fsoPodR) this.fsoPodR.visible = true;
            if (this.fsoMatL) this.fsoMatL.color.setHex(leftOn ? 0xffffff : 0x1e293b);
            if (this.fsoMatR) this.fsoMatR.color.setHex(rightOn ? 0xffffff : 0x1e293b);
            if (this.fsoPointL) this.fsoPointL.intensity = leftOn ? 5.2 : 0;
            if (this.fsoPointR) this.fsoPointR.intensity = rightOn ? 5.2 : 0;

            // Roof beacon alternates blue / red high-intensity police strobe
            const beaconPhase = Math.floor((time || 0) / 110) % 4;
            const isBlue = beaconPhase === 0;
            const isRed = beaconPhase === 2;
            if (this.roofBeaconMat) {
                this.roofBeaconMat.color.setHex(isRed ? 0xff1e38 : (isBlue ? 0x2563eb : 0x1e3a8a));
            }
            if (this.roofBeaconLight) {
                this.roofBeaconLight.color.setHex(isRed ? 0xff1e38 : 0x2563eb);
                this.roofBeaconLight.intensity = (isBlue || isRed) ? 4.5 : 0.4;
            }
            this.needsRender = true;
        }

        setPneumoStance(mode) {
            const normalized = ['stock', 'sport', 'bpan'].includes(mode) ? mode : 'stock';
            this.stanceMode = normalized;
            if (normalized === 'sport') {
                this.targetStanceOffsetY = -0.048;
                this.stanceCamberRad = -0.048;
            } else if (normalized === 'bpan') {
                this.targetStanceOffsetY = -0.096;
                this.stanceCamberRad = -0.098;
            } else {
                this.targetStanceOffsetY = 0;
                this.stanceCamberRad = 0;
            }
            this.stanceOffsetY = this.targetStanceOffsetY;
            this.applyStanceToActiveCar();
            if (this.fsoActive) this.ensureFsoRig();
            this.needsRender = true;
            if (!this.active) this.start();
            return {
                mode: this.stanceMode,
                offsetY: this.stanceOffsetY,
                camberDeg: Math.round((this.stanceCamberRad * 180) / Math.PI * 10) / 10
            };
        }

        cyclePneumoStance() {
            const order = ['stock', 'sport', 'bpan'];
            const nextIdx = (order.indexOf(this.stanceMode) + 1) % order.length;
            return this.setPneumoStance(order[nextIdx]);
        }

        applyStanceToActiveCar() {
            const applyToModel = (model) => {
                if (!model) return;
                if (model.userData._baseStanceY === undefined) {
                    model.userData._baseStanceY = model.position.y || 0;
                }
                model.position.y = model.userData._baseStanceY + (this.stanceOffsetY || 0);
                model.userData.stanceMode = this.stanceMode;
                model.userData.stanceOffsetY = this.stanceOffsetY;
                model.userData.stanceCamberRad = this.stanceCamberRad;

                // Apply negative camber tilt to wheel nodes while keeping wheels grounded
                model.traverse(node => {
                    if (!node || node === model) return;
                    const nm = String(node.name || '').toLowerCase();
                    const isWheel = (node.userData && node.userData.isWheel) || /^(wheel|tire|rim)_/i.test(nm) || /wheel_fl|wheel_fr|wheel_rl|wheel_rr/i.test(nm);
                    if (isWheel) {
                        if (node.userData._baseWheelY === undefined) {
                            node.userData._baseWheelY = node.position.y || 0;
                        }
                        if (node.userData._baseWheelRotZ === undefined) {
                            node.userData._baseWheelRotZ = node.rotation.z || 0;
                        }
                        node.position.y = node.userData._baseWheelY - (this.stanceOffsetY || 0);
                        const sideSign = (node.position.x < 0 || /_fl|_rl|left/i.test(nm)) ? -1 : 1;
                        node.rotation.z = node.userData._baseWheelRotZ + sideSign * (this.stanceCamberRad || 0);
                    }
                });
            };
            if (this.glbCar) applyToModel(this.glbCar);
            if (this.proceduralCar && this.proceduralCar !== this.glbCar) applyToModel(this.proceduralCar);
            if (this.carGroup && this.carGroup !== this.glbCar && this.carGroup !== this.proceduralCar) applyToModel(this.carGroup);
        }

        ensureRainRig() {
            const THREE = this.THREE;
            if (!THREE || !this.scene) return;
            if (!this.rainGroup) {
                this.rainGroup = new THREE.Group();
                this.rainGroup.name = 'ShowroomRainGroup';
                const dropGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.26, 4);
                const dropMat = new THREE.MeshBasicMaterial({
                    color: 0xbae6fd,
                    transparent: true,
                    opacity: 0.45
                });
                for (let i = 0; i < 64; i++) {
                    const drop = new THREE.Mesh(dropGeo, dropMat);
                    const angle = (i / 64) * Math.PI * 2 + (i % 7) * 0.3;
                    const radius = 0.4 + ((i * 17) % 24) * 0.1;
                    drop.position.set(
                        Math.cos(angle) * radius,
                        ((i * 29) % 30) * 0.1,
                        Math.sin(angle) * radius
                    );
                    drop.userData.fallSpeed = 0.065 + (i % 5) * 0.012;
                    this.rainGroup.add(drop);
                }
                this.rainGroup.visible = false;
                this.scene.add(this.rainGroup);
            }
        }

        updateRainRig() {
            if (this.envTheme !== 'rain' || !this.rainGroup || !this.rainGroup.visible) return;
            this.rainGroup.children.forEach(drop => {
                drop.position.y -= (drop.userData.fallSpeed || 0.07);
                if (drop.position.y < 0.05) {
                    drop.position.y = 2.8 + Math.random() * 0.4;
                }
            });
            this.needsRender = true;
        }

        setEnvironmentTheme(theme) {
            const validThemes = ['studio', 'night', 'sunset', 'rain'];
            const nextTheme = validThemes.includes(theme) ? theme : 'studio';
            this.envTheme = nextTheme;
            this.ensureRainRig();

            if (this.rainGroup) {
                this.rainGroup.visible = nextTheme === 'rain';
            }

            if (nextTheme === 'night') {
                if (this.ambientLight) { this.ambientLight.color.setHex(0x3b82f6); this.ambientLight.intensity = 0.22; }
                if (this.keyLight) { this.keyLight.color.setHex(0x93c5fd); this.keyLight.intensity = 0.58; }
                if (this.fillLight) { this.fillLight.color.setHex(0x6366f1); this.fillLight.intensity = 0.40; }
                if (this.rimLight) { this.rimLight.color.setHex(0xec4899); this.rimLight.intensity = 1.15; }
                if (this.podiumDiscMat) { this.podiumDiscMat.color.setHex(0x070a14); this.podiumDiscMat.roughness = 0.10; this.podiumDiscMat.metalness = 0.82; }
                if (this.podiumRingMat) { this.podiumRingMat.color.setHex(0xa855f7); }
                if (!this.headlightsOn) this.toggleHeadlights();
            } else if (nextTheme === 'sunset') {
                if (this.ambientLight) { this.ambientLight.color.setHex(0xfed7aa); this.ambientLight.intensity = 0.45; }
                if (this.keyLight) { this.keyLight.color.setHex(0xf97316); this.keyLight.intensity = 1.65; }
                if (this.fillLight) { this.fillLight.color.setHex(0xa855f7); this.fillLight.intensity = 0.65; }
                if (this.rimLight) { this.rimLight.color.setHex(0xfbbf24); this.rimLight.intensity = 1.25; }
                if (this.podiumDiscMat) { this.podiumDiscMat.color.setHex(0x1c1219); this.podiumDiscMat.roughness = 0.14; this.podiumDiscMat.metalness = 0.75; }
                if (this.podiumRingMat) { this.podiumRingMat.color.setHex(0xf59e0b); }
            } else if (nextTheme === 'rain') {
                if (this.ambientLight) { this.ambientLight.color.setHex(0x94a3b8); this.ambientLight.intensity = 0.30; }
                if (this.keyLight) { this.keyLight.color.setHex(0xbae6fd); this.keyLight.intensity = 0.85; }
                if (this.fillLight) { this.fillLight.color.setHex(0x38bdf8); this.fillLight.intensity = 0.50; }
                if (this.rimLight) { this.rimLight.color.setHex(0xe0f2fe); this.rimLight.intensity = 1.05; }
                if (this.podiumDiscMat) { this.podiumDiscMat.color.setHex(0x060b14); this.podiumDiscMat.roughness = 0.03; this.podiumDiscMat.metalness = 0.94; }
                if (this.podiumRingMat) { this.podiumRingMat.color.setHex(0x0ea5e9); }
                if (!this.headlightsOn) this.toggleHeadlights();
            } else {
                if (this.ambientLight) { this.ambientLight.color.setHex(0xffffff); this.ambientLight.intensity = 0.42; }
                if (this.keyLight) { this.keyLight.color.setHex(0xffffff); this.keyLight.intensity = 1.20; }
                if (this.fillLight) { this.fillLight.color.setHex(0xa5c4d4); this.fillLight.intensity = 0.55; }
                if (this.rimLight) { this.rimLight.color.setHex(0xffffff); this.rimLight.intensity = 0.85; }
                if (this.podiumDiscMat) { this.podiumDiscMat.color.setHex(0x0f1422); this.podiumDiscMat.roughness = 0.16; this.podiumDiscMat.metalness = 0.70; }
                if (this.podiumRingMat) { this.podiumRingMat.color.setHex(0x38bdf8); }
            }

            this.needsRender = true;
            if (!this.active) this.start();
            return this.envTheme;
        }

        cycleEnvironmentTheme() {
            const order = ['studio', 'night', 'sunset', 'rain'];
            const nextIdx = (order.indexOf(this.envTheme || 'studio') + 1) % order.length;
            return this.setEnvironmentTheme(order[nextIdx]);
        }

        capturePhotoPoster(meta = {}) {
            if (this.renderer && this.scene && this.camera) {
                try { if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraLivery?.update(this.scene);this.renderer.render(this.scene, this.camera); } catch (_) {}
            }
            const carName = String(meta.carName || this.currentCarName || 'Автомобиль');
            const plateText = String(meta.plateText || (this.currentStyling && this.currentStyling.plate) || 'БЕЗ НОМЕРА');
            const synergyTitle = String(meta.synergyTitle || '');
            const priceText = String(meta.priceText || '');
            const width = 1280;
            const height = 720;
            let dataUrl = 'data:image/png;base64,';

            if (typeof document !== 'undefined' && document.createElement) {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const grad = ctx.createLinearGradient(0, 0, 0, height);
                    if (this.envTheme === 'sunset') {
                        grad.addColorStop(0, '#2e1035');
                        grad.addColorStop(0.55, '#7c2d12');
                        grad.addColorStop(1, '#090d16');
                    } else if (this.envTheme === 'night') {
                        grad.addColorStop(0, '#040711');
                        grad.addColorStop(0.6, '#0f172a');
                        grad.addColorStop(1, '#020409');
                    } else if (this.envTheme === 'rain') {
                        grad.addColorStop(0, '#0b1528');
                        grad.addColorStop(0.6, '#1e293b');
                        grad.addColorStop(1, '#060a12');
                    } else {
                        grad.addColorStop(0, '#0f172a');
                        grad.addColorStop(0.6, '#1e293b');
                        grad.addColorStop(1, '#090d16');
                    }
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, width, height);

                    if (this.renderer && this.renderer.domElement) {
                        try {
                            ctx.drawImage(this.renderer.domElement, 0, 0, width, height - 110);
                        } catch (_) {}
                    }

                    // Bottom glassmorphic collector banner
                    ctx.fillStyle = 'rgba(9, 13, 22, 0.92)';
                    ctx.fillRect(0, height - 120, width, 120);
                    ctx.fillStyle = '#f59e0b';
                    ctx.fillRect(0, height - 120, width, 3);

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 32px sans-serif';
                    ctx.fillText(carName, 40, height - 68);

                    ctx.fillStyle = '#38bdf8';
                    ctx.font = 'bold 22px monospace';
                    ctx.fillText('🏷️ ' + plateText, 40, height - 28);

                    if (synergyTitle) {
                        ctx.fillStyle = '#34d399';
                        ctx.font = 'bold 20px sans-serif';
                        ctx.fillText('⚡ ' + synergyTitle, 460, height - 28);
                    }
                    if (priceText) {
                        ctx.fillStyle = '#fbbf24';
                        ctx.font = 'bold 28px sans-serif';
                        ctx.fillText(priceText, width - 340, height - 50);
                    }
                    try {
                        dataUrl = canvas.toDataURL('image/png');
                    } catch (_) {}
                }
            }

            return {
                width,
                height,
                dataUrl,
                carName,
                plateText,
                synergyTitle,
                theme: this.envTheme || 'studio',
                stanceMode: this.stanceMode || 'stock',
                fsoActive: Boolean(this.fsoActive)
            };
        }

        bindEvents() {
            const dom = this.renderer.domElement;

            this._onPointerDown = (e) => {
                this.isDragging = true;
                this.dragVelX = 0;
                this.dragVelY = 0;
                this.prevPointerX = e.clientX || 0;
                this.prevPointerY = e.clientY || 0;
                this.needsRender = true;
                if (!this.active) this.start();
            };

            this._onTouchStart = (e) => {
                if (e.touches && e.touches.length === 1) {
                    this.touchStartX = e.touches[0].clientX;
                    this.touchStartY = e.touches[0].clientY;
                    this.prevPointerX = e.touches[0].clientX;
                    this.prevPointerY = e.touches[0].clientY;
                    this.touchLockedDir = null;
                    this.isDragging = false;
                    this.dragVelX = 0;
                    this.dragVelY = 0;
                } else if (e.touches && e.touches.length === 2) {
                    this.touchLockedDir = 'pinch';
                    this.isDragging = false;
                    this.pinchStartDist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                }
            };

            this._onPointerMove = (e) => {
                if (!this.isDragging) return;
                const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
                const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
                const deltaX = clientX - this.prevPointerX;
                const deltaY = clientY - this.prevPointerY;
                this.prevPointerX = clientX;
                this.prevPointerY = clientY;

                const vx = -deltaX * 0.0075;
                const vy = deltaY * 0.0055;
                this.dragVelX = vx;
                this.dragVelY = vy;

                // Immediate 1:1 direct tracking when dragging - fluid 60 FPS response
                this.cameraAngleY += vx;
                this.targetAngleY = this.cameraAngleY;
                this.cameraAngleX = Math.max(0.04, Math.min(Math.PI / 2.05, this.cameraAngleX + vy));
                this.targetAngleX = this.cameraAngleX;
                this.updateCameraPosition();
                this.needsRender = true;
                if (!this.active) this.start();
                if (this.renderer && this.scene && this.camera) {
                    if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraLivery?.update(this.scene);this.renderer.render(this.scene, this.camera);
                    this.needsRender = false;
                }
            };

            this._onPointerUp = () => {
                this.isDragging = false;
                this.needsRender = true;
            };

            this._onWheel = (e) => {
                if (!this.options.enableZoom) return;
                e.preventDefault();
                const delta = Math.sign(e.deltaY) * 0.25;
                this.targetDistance = Math.max(this.options.minDistance, Math.min(this.options.maxDistance, this.targetDistance + delta));
                this.needsRender = true;
                if (!this.active) this.start();
            };

            this._onTouchMove = (e) => {
                if (e.touches.length === 2 && this.options.enableZoom) {
                    if (e.cancelable) e.preventDefault();
                    const dist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    if (this.pinchStartDist > 0) {
                        const delta = (this.pinchStartDist - dist) * 0.01;
                        this.targetDistance = Math.max(this.options.minDistance, Math.min(this.options.maxDistance, this.targetDistance + delta));
                        this.needsRender = true;
                        if (!this.active) this.start();
                    }
                    this.pinchStartDist = dist;
                    return;
                }
                if (e.touches.length === 1) {
                    const cx = e.touches[0].clientX;
                    const cy = e.touches[0].clientY;
                    const totalDx = Math.abs(cx - this.touchStartX);
                    const totalDy = Math.abs(cy - this.touchStartY);

                    if (!this.touchLockedDir) {
                        if (totalDx > 12 || totalDy > 12) {
                            this.touchLockedDir = (totalDy >= totalDx * 0.6) ? 'vertical' : 'horizontal';
                        }
                    } else if (this.touchLockedDir === 'horizontal' && totalDy > totalDx * 0.8 && totalDy > 14) {
                        // Dynamically release to vertical scroll if the user shifts to scrolling down the page
                        this.touchLockedDir = 'vertical';
                        this.isDragging = false;
                        return;
                    }

                    if (this.touchLockedDir === 'vertical') {
                        // User wants to scroll the page vertically past the 3D podium
                        // Do NOT call e.preventDefault(), do NOT drag the car
                        this.isDragging = false;
                        return;
                    }

                    if (this.touchLockedDir === 'horizontal') {
                        if (e.cancelable) e.preventDefault();
                        const deltaX = cx - this.prevPointerX;
                        this.prevPointerX = cx;
                        this.prevPointerY = cy;

                        this.isDragging = true;
                        const vx = -deltaX * 0.0075;
                        this.dragVelX = vx;
                        this.cameraAngleY += vx;
                        this.targetAngleY = this.cameraAngleY;
                        this.updateCameraPosition();
                        this.needsRender = true;
                        if (!this.active) this.start();
                        if (this.renderer && this.scene && this.camera) {
                            if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraLivery?.update(this.scene);this.renderer.render(this.scene, this.camera);
                            this.needsRender = false;
                        }
                    }
                }
            };

            this._onTouchEnd = () => {
                this.isDragging = false;
                this.pinchStartDist = 0;
                this.touchLockedDir = null;
                this.needsRender = true;
            };

            this._onResize = () => this.resize();

            dom.addEventListener('mousedown', this._onPointerDown);
            window.addEventListener('mousemove', this._onPointerMove);
            window.addEventListener('mouseup', this._onPointerUp);

            dom.addEventListener('touchstart', this._onTouchStart, { passive: true });
            dom.addEventListener('touchmove', this._onTouchMove, { passive: false });
            dom.addEventListener('touchend', this._onTouchEnd, { passive: true });
            dom.addEventListener('touchcancel', this._onTouchEnd, { passive: true });

            dom.addEventListener('wheel', this._onWheel, { passive: false });
            window.addEventListener('resize', this._onResize);

            if (typeof ResizeObserver !== 'undefined' && this.container) {
                try {
                    this._resizeObserver = new ResizeObserver(() => {
                        this.resize();
                    });
                    this._resizeObserver.observe(this.container);
                } catch (_) {}
            }

            if (typeof document !== 'undefined') {
                this._visHandler = () => {
                    if (document.hidden) {
                        this.stop();
                    } else if (this.container && this.container.offsetParent !== null && !this.active) {
                        this.start();
                    }
                };
                document.addEventListener('visibilitychange', this._visHandler);
            }
        }

        onResize() {
            this.resize();
        }

        resize() {
            if (!this.container || !this.renderer || !this.camera) return;
            const rect = (typeof this.container.getBoundingClientRect === 'function') ? this.container.getBoundingClientRect() : null;
            const w = Math.floor(rect && rect.width ? rect.width : (this.container.clientWidth || 0));
            const h = Math.floor(rect && rect.height ? rect.height : (this.container.clientHeight || 0));
            if (w <= 0 || h <= 0) return;
            if (this.width === w && this.height === h) return;
            this.width = w;
            this.height = h;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h, false);
            this.fitCameraToCar();
            this.needsRender = true;
        }

        pause() {
            this.paused = true;
            this.stop();
        }

        resume() {
            this.paused = false;
            this.needsRender = true;
            this.start();
        }

        start() {
            if (this.active || this.paused) return;
            if (typeof document !== 'undefined' && document.hidden) {
                return;
            }
            if (this.container && this.container.offsetParent === null) {
                setTimeout(() => {
                    if (!this.active && !this.paused && this.container && this.container.offsetParent !== null) {
                        this.start();
                    }
                }, 100);
                return;
            }
            this.fitCameraToCar();
            this.active = true;
            this.needsRender = true;
            let lastTime = performance.now();

            const loop = (time) => {
                if (!this.active || this.paused) return;
                lastTime = time;

                // Stop rendering cleanly if hidden, container disconnected, or race is active
                if (typeof document !== 'undefined' && document.hidden) {
                    this.stop();
                    return;
                }
                if (typeof window !== 'undefined' && window.isRaceRunning && !(this.container?.id === 'styling-preview-3d-wrap' && window.nomeraRacePreviewAllowsViewer?.())) {
                    this.stop();
                    return;
                }
                if (this.container && this.container.offsetParent === null) {
                    this.stop();
                    return;
                }

                // Skip rendering background garage-preview-3d-wrap while #styling-modal is open so two WebGL showrooms never render at 60 FPS simultaneously
                if (this.container && this.container.id === 'garage-preview-3d-wrap' && typeof document !== 'undefined' && typeof document.getElementById === 'function') {
                    const stylingModal = document.getElementById('styling-modal');
                    if (stylingModal && stylingModal.classList && typeof stylingModal.classList.contains === 'function') {
                        const isModalHidden = stylingModal.classList.contains('hidden') || (stylingModal.classList.contains('modal-overlay') && !stylingModal.classList.contains('show'));
                        if (!isModalHidden) {
                            this.animFrameId = requestAnimationFrame(loop);
                            return;
                        }
                    }
                }

                if (this.options.autoRotate && !this.isDragging) {
                    this.targetAngleY += this.options.autoRotateSpeed;
                    this.cameraAngleY += this.options.autoRotateSpeed;
                    this.updateCameraPosition();
                    this.needsRender = true;
                }

                // Smooth momentum glide after release
                if (!this.isDragging) {
                    if (Math.abs(this.dragVelX) > 0.0001) {
                        this.cameraAngleY += this.dragVelX;
                        this.targetAngleY = this.cameraAngleY;
                        this.dragVelX *= 0.90;
                        this.updateCameraPosition();
                        this.needsRender = true;
                    } else {
                        this.dragVelX = 0;
                    }
                    if (Math.abs(this.dragVelY) > 0.0001) {
                        this.cameraAngleX = Math.max(0.04, Math.min(Math.PI / 2.05, this.cameraAngleX + this.dragVelY));
                        this.targetAngleX = this.cameraAngleX;
                        this.dragVelY *= 0.90;
                        this.updateCameraPosition();
                        this.needsRender = true;
                    } else {
                        this.dragVelY = 0;
                    }

                    // Preset view transition smoothing (only when not dragging)
                    let diffY = this.targetAngleY - this.cameraAngleY;
                    diffY = ((diffY + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

                    const diffX = this.targetAngleX - this.cameraAngleX;
                    const diffDist = this.targetDistance - this.cameraDistance;
                    const diffCenterY = this.targetCenterY - this.targetY;

                    const camMoving = Math.abs(diffY) > 0.0002 || Math.abs(diffX) > 0.0002 || Math.abs(diffDist) > 0.0005 || Math.abs(diffCenterY) > 0.0005;

                    if (camMoving) {
                        this.cameraAngleY += diffY * 0.12;
                        this.cameraAngleX += diffX * 0.12;
                        this.cameraDistance += diffDist * 0.12;
                        this.targetY += diffCenterY * 0.12;
                        this.updateCameraPosition();
                        this.needsRender = true;
                    }
                }

                // Smooth interpolation for interactive doors, hood, and trunk
                const diffDoor = this.targetDoorAngle - this.doorAngle;
                const diffHood = this.targetHoodAngle - this.hoodAngle;
                const diffTrunk = this.targetTrunkAngle - this.trunkAngle;
                const bodyMoving = Math.abs(diffDoor) > 0.001 || Math.abs(diffHood) > 0.001 || Math.abs(diffTrunk) > 0.001;

                if (bodyMoving) {
                    this.doorAngle = Math.abs(diffDoor) <= 0.005 ? this.targetDoorAngle : this.doorAngle + diffDoor * 0.14;
                    this.hoodAngle = Math.abs(diffHood) <= 0.005 ? this.targetHoodAngle : this.hoodAngle + diffHood * 0.14;
                    this.trunkAngle = Math.abs(diffTrunk) <= 0.005 ? this.targetTrunkAngle : this.trunkAngle + diffTrunk * 0.14;

                    this.syncInteractiveModels();
                    this.needsRender = true;
                }

                // Live FSO Strobes, Roof Beacon & Rain Animation
                if (this.fsoActive) {
                    this.updateFsoRig(time);
                }
                if (this.envTheme === 'rain') {
                    this.updateRainRig();
                }

                // Dynamic Neon Modes: Rainbow / Pulse
                if (this.currentStyling.neonMode === 'rainbow') {
                    const hue = (time * 0.0006) % 1.0;
                    if (!this._tempRainbowColor) this._tempRainbowColor = new this.THREE.Color();
                    const rCol = this._tempRainbowColor.setHSL(hue, 1.0, 0.55);
                    if (this.neonLight) {
                        this.neonLight.color = rCol;
                        this.neonLight.intensity = 1.8;
                    }
                    if (this.podiumRingMat) {
                        this.podiumRingMat.color = rCol;
                    }
                    if (this.carGroup) {
                        const nGroup = this.carGroup.getObjectByName('NeonGroup') || this.carGroup.getObjectByName('GLB_NeonTubes');
                        if (nGroup) {
                            nGroup.traverse(m => {
                                if (m.material) {
                                    m.material.color = rCol;
                                    if (m.material.emissive) m.material.emissive = rCol;
                                }
                            });
                        }
                        const subGroup = this.carGroup.getObjectByName('SubwooferGroup');
                        if (subGroup && subGroup.visible) {
                            subGroup.traverse(m => {
                                if (m.userData && m.userData.isInteractiveNeon && m.material) {
                                    m.material.color = rCol;
                                    if (m.material.emissive) m.material.emissive = rCol;
                                }
                            });
                        }
                    }
                    this.needsRender = true;
                } else if (this.currentStyling.neonMode === 'pulse') {
                    const pulse = (Math.sin(time * 0.005) + 1) * 0.5;
                    if (this.neonLight && this.neonLight.intensity > 0) {
                        this.neonLight.intensity = 0.6 + pulse * 2.0;
                    }
                    if (this.carGroup) {
                        const nGroup = this.carGroup.getObjectByName('NeonGroup') || this.carGroup.getObjectByName('GLB_NeonTubes');
                        if (nGroup) {
                            nGroup.traverse(m => {
                                if (m.material) {
                                    if (m.userData && m.userData.isNeonGroundGlow) {
                                        m.material.opacity = 0.45 + pulse * 0.50;
                                    } else if (m.material.emissiveIntensity !== undefined) {
                                        m.material.emissiveIntensity = 0.8 + pulse * 1.6;
                                    }
                                }
                            });
                        }
                    }
                    this.needsRender = true;
                }

                if (this.needsRender) {
                    if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraLivery?.update(this.scene);this.renderer.render(this.scene, this.camera);
                    this.needsRender = false;
                }

                this.animFrameId = requestAnimationFrame(loop);
            };

            this.animFrameId = requestAnimationFrame(loop);
        }

        stop() {
            this.setLoading(false);
            this.active = false;
            if (this.animFrameId) {
                cancelAnimationFrame(this.animFrameId);
                this.animFrameId = null;
            }
        }

        destroy() {
            this.stop();
            if (this.renderer && this.renderer.domElement) {
                const dom = this.renderer.domElement;
                if (this._onPointerDown) {
                    try { dom.removeEventListener('mousedown', this._onPointerDown); } catch (_) {}
                    try { dom.removeEventListener('touchstart', this._onPointerDown); } catch (_) {}
                }
                if (this._onTouchStart) {
                    try { dom.removeEventListener('touchstart', this._onTouchStart); } catch (_) {}
                }
                if (this._onTouchMove) {
                    try { dom.removeEventListener('touchmove', this._onTouchMove); } catch (_) {}
                }
                if (this._onTouchEnd) {
                    try { dom.removeEventListener('touchend', this._onTouchEnd); } catch (_) {}
                    try { dom.removeEventListener('touchcancel', this._onTouchEnd); } catch (_) {}
                }
                if (this._onWheel) {
                    try { dom.removeEventListener('wheel', this._onWheel); } catch (_) {}
                }
            }
            if (typeof window !== 'undefined') {
                if (this._onPointerMove) {
                    try { window.removeEventListener('mousemove', this._onPointerMove); } catch (_) {}
                }
                if (this._onTouchMove) {
                    try { window.removeEventListener('touchmove', this._onTouchMove); } catch (_) {}
                }
                if (this._onPointerUp) {
                    try { window.removeEventListener('mouseup', this._onPointerUp); } catch (_) {}
                }
                if (this._onTouchEnd) {
                    try { window.removeEventListener('touchend', this._onTouchEnd); } catch (_) {}
                    try { window.removeEventListener('touchcancel', this._onTouchEnd); } catch (_) {}
                }
                if (this._onResize) {
                    try { window.removeEventListener('resize', this._onResize); } catch (_) {}
                }
            }
            if (this._visHandler && typeof document !== 'undefined') {
                try { document.removeEventListener('visibilitychange', this._visHandler); } catch (_) {}
                this._visHandler = null;
            }
            if (this._resizeObserver) {
                try { this._resizeObserver.disconnect(); } catch (_) {}
                this._resizeObserver = null;
            }
            if (this.carGroup) {
                try { this.scene.remove(this.carGroup); } catch (_) {}
                deepDispose(this.carGroup);
                this.carGroup = null;
            }
            if (this.glbCar) {
                try { this.scene.remove(this.glbCar); } catch (_) {}
                deepDispose(this.glbCar);
                this.glbCar = null;
            }
            if (this.proceduralCar) {
                try { this.scene.remove(this.proceduralCar); } catch (_) {}
                deepDispose(this.proceduralCar);
                this.proceduralCar = null;
            }
            if (this.scene) {
                deepDispose(this.scene);
            }
            if (this.renderer) {
                if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                    this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
                }
                if (typeof this.renderer.dispose === 'function') this.renderer.dispose();
                if (typeof this.renderer.forceContextLoss === 'function') this.renderer.forceContextLoss();
            }
        }
    }

    // =========================================================================
    // 📸 OFFLINE 3D SIDE PROFILE THUMBNAIL RENDERER FOR AUTO SALON & GARAGE
    // =========================================================================
    const STATIC_3D_THUMBNAILS = {
        m3gtr: './assets/thumbnails/mw-m3gtr.webp',
        mustang_razor: './assets/thumbnails/mw-mustang_razor.webp',
        mustang_jewels: './assets/thumbnails/mw-mustang_jewels.webp',
        corvette_cross: './assets/thumbnails/mw-corvette_cross.webp',
        corvette_webster: './assets/thumbnails/mw-corvette_webster.webp',
        vaz2107: './assets/thumbnails/vaz2107.png',
        vaz2109: './assets/thumbnails/vaz2109.png',
        gaz24: './assets/thumbnails/gaz24.png',
        priora: './assets/thumbnails/priora.png',
        solaris: './assets/thumbnails/solaris.png',
        vesta: './assets/thumbnails/vesta.png',
        polo: './assets/thumbnails/polo.png',
        mark2: './assets/thumbnails/mark2.png',
        subaru: './assets/thumbnails/subaru.png',
        m5e60: './assets/thumbnails/m5e60.png',
        silvia: './assets/thumbnails/silvia.png',
        camry: './assets/thumbnails/camry-xv40.png',
        lc300: './assets/thumbnails/lc300.png',
        gtr: './assets/thumbnails/gtr.png',
        e63: './assets/thumbnails/e63.png',
        rs6: './assets/thumbnails/rs6.png',
        m5f90: './assets/thumbnails/m5f90.png',
        m8: './assets/thumbnails/m8.png',
        g63: './assets/thumbnails/g63.png',
        porsche911: './assets/thumbnails/porsche911.png',
        huracan: './assets/thumbnails/huracan.png',
        cullinan: './assets/thumbnails/cullinan.png',
        sf90: './assets/thumbnails/sf90.png',
        chiron: './assets/thumbnails/chiron.png',
        jesko: './assets/thumbnails/jesko.png'
    };

    function getStaticThumbnail(carName) {
        const carId = identifyCarModel(carName);
        return STATIC_3D_THUMBNAILS[carId] || null;
    }

    const sideThumbnailCache = new Map();
    const thumbnailCallbacks = new Map();
    const thumbnailQueue = [];
    let isProcessingQueue = false;
    let offscreenRenderer = null;
    let offscreenScene = null;
    let offscreenCamera = null;

    function getThumbnailKey(carName, styling = {}) {
        const c = styling.color || '';
        const t = styling.tint || '';
        const w = styling.wheels || 'stock';
        const s = styling.suspension || 'stock';
        const n = styling.neon || 'none';
        const sp = styling.spoiler || 'none';
        const v = (styling.vinyl || 'none')+(styling.livery?JSON.stringify(styling.livery):'');
        const bk = styling.bodykit || 'stock';
        const hd = styling.hood || 'stock';
        const rs = styling.roofScoop || 'none';
        const sg = styling.sgu || 'none';
        const pl = styling.plate || '';
        return `${carName}__${c}_${t}_${w}_${s}_${n}_${sp}_${v}_${bk}_${hd}_${rs}_${sg}_${pl}`;
    }

    function hasCustomStylingForThumbnail(styling, carName = '') {
        if (!styling || typeof styling !== 'object') return false;
        if (styling.color && styling.color !== 'none' && styling.color !== 'stock') {
            if (carName) {
                const defHex = getDefaultCarColor(carName);
                const colHex = parseColor(styling.color, defHex);
                if (colHex !== defHex) return true;
            } else {
                return true;
            }
        }
        if (styling.wheels && styling.wheels !== 'stock') return true;
        if (styling.spoiler && styling.spoiler !== 'none' && styling.spoiler !== 'stock') return true;
        if (styling.vinyl && styling.vinyl !== 'none') return true;
        if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW&&window.NomeraLivery?.active(styling.livery))return true;
        if (styling.bodykit && styling.bodykit !== 'stock' && styling.bodykit !== 'none') return true;
        if (styling.hood && styling.hood !== 'stock' && styling.hood !== 'none') return true;
        if (styling.roofScoop && styling.roofScoop !== 'none' && styling.roofScoop !== 'stock') return true;
        if (styling.sgu && styling.sgu !== 'none') return true;
        if (styling.neon && styling.neon !== 'none') return true;
        if (styling.suspension && styling.suspension !== 'stock') return true;
        if (styling.tint && styling.tint !== 0 && styling.tint !== '0' && styling.tint !== 'none') return true;
        return false;
    }

    function getSideThumbnail(carName, styling = {}) {
        const key = getThumbnailKey(carName, styling);
        if (sideThumbnailCache.has(key)) {
            return sideThumbnailCache.get(key);
        }
        if (hasCustomStylingForThumbnail(styling, carName)) {
            return null;
        }
        return getStaticThumbnail(carName);
    }

    function initOffscreenPipeline(THREE) {
        if (offscreenRenderer) return;
        if (typeof document === 'undefined') return;

        const canvas = document.createElement('canvas');
        canvas.width = 440;
        canvas.height = 240;

        offscreenRenderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance'
        });
        if (typeof offscreenRenderer.setSize === 'function') offscreenRenderer.setSize(440, 240, false);
        if (typeof offscreenRenderer.setPixelRatio === 'function') offscreenRenderer.setPixelRatio(1.0);
        if (offscreenRenderer.shadowMap) {
            offscreenRenderer.shadowMap.enabled = false;
        }
        if (offscreenRenderer.debug) {
            offscreenRenderer.debug.checkShaderErrors = false;
        }
        offscreenRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        offscreenRenderer.toneMappingExposure = 1.20;
        if (typeof offscreenRenderer.setClearColor === 'function') {
            offscreenRenderer.setClearColor(0x000000, 0);
        }

        offscreenScene = new THREE.Scene();
        const offscreenEnv = createStudioEnvironment(THREE, offscreenRenderer);
        if (offscreenEnv) {
            offscreenScene.environment = offscreenEnv;
        }

        // Balanced studio lighting tailored for crisp side-profile reflections
        const ambient = new THREE.AmbientLight(0xffffff, 0.95);
        offscreenScene.add(ambient);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
        keyLight.position.set(7, 7, 5);
        offscreenScene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xbfdbfe, 0.85);
        fillLight.position.set(7, 4, -5);
        offscreenScene.add(fillLight);

        const topLight = new THREE.DirectionalLight(0xffffff, 0.65);
        topLight.position.set(0, 9, 0);
        offscreenScene.add(topLight);

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.45);
        rimLight.position.set(-6, 3, 0);
        offscreenScene.add(rimLight);

        // Ground shadow plane
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.42 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        offscreenScene.add(floor);

        offscreenCamera = new THREE.PerspectiveCamera(23, 440 / 240, 0.1, 100);
    }

    function clearThumbnailQueue() {
        thumbnailQueue.length = 0;
        isProcessingQueue = false;
        thumbnailCallbacks.clear();
    }

    function processThumbnailQueue(THREE) {
        if (isProcessingQueue || thumbnailQueue.length === 0) return;
        if (typeof window !== 'undefined' && window.isRaceRunning) {
            clearThumbnailQueue();
            return;
        }
        isProcessingQueue = true;

        const task = thumbnailQueue.shift();
        initOffscreenPipeline(THREE);

        const onThumbnailDone = (dataUrl) => {
            if (dataUrl && dataUrl.startsWith('data:image')) {
                sideThumbnailCache.set(task.key, dataUrl);
            }
            const cbs = thumbnailCallbacks.get(task.key) || [];
            thumbnailCallbacks.delete(task.key);
            cbs.forEach(cb => {
                try { cb(dataUrl); } catch (_) {}
            });
            isProcessingQueue = false;
            if (thumbnailQueue.length > 0 && !(typeof window !== 'undefined' && window.isRaceRunning)) {
                setTimeout(() => processThumbnailQueue(THREE), 4);
            }
        };

        const finishWithModel = (model) => {
            if (model && offscreenRenderer && offscreenScene && offscreenCamera) {
                try {
                    model.updateMatrixWorld(true);
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());

                    // Center model horizontally and position flush on floor
                    model.position.x -= center.x;
                    model.position.z -= center.z;
                    model.position.y -= box.min.y;
                    model.updateMatrixWorld(true);

                    offscreenScene.add(model);

                    // Compute framing for side camera (+X axis looking towards -X)
                    const finalBox = new THREE.Box3().setFromObject(model);
                    const carHeight = Math.max(1.0, finalBox.max.y - finalBox.min.y);
                    const targetY = finalBox.min.y + carHeight * 0.46;
                    const carLength = Math.max(3.8, finalBox.max.z - finalBox.min.z);
                    const camDist = Math.max(8.2, carLength * 1.88);

                    // Dynamic 3D 3/4 perspective to reveal car bodywork, hood, wheels and front styling
                    const camX = camDist * 0.90;
                    const camY = targetY + carHeight * 0.32;
                    const camZ = carLength * 0.40;
                    offscreenCamera.position.set(camX, camY, camZ);
                    offscreenCamera.lookAt(0, targetY, 0);

                    if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraLivery?.update(offscreenScene);
                    offscreenRenderer.render(offscreenScene, offscreenCamera);
                    let dataUrl = null;
                    if (offscreenRenderer.domElement && typeof offscreenRenderer.domElement.toDataURL === 'function') {
                        try {
                            dataUrl = offscreenRenderer.domElement.toDataURL('image/png');
                        } catch (_) {
                            dataUrl = null;
                        }
                    }
                    if (!dataUrl) {
                        dataUrl = 'data:image/png;base64,mock3d';
                    }

                    offscreenScene.remove(model);
                    deepDispose(model);

                    onThumbnailDone(dataUrl);
                } catch (renderErr) {
                    console.warn('Error during offscreen thumbnail render:', renderErr);
                    onThumbnailDone(null);
                }
            } else {
                onThumbnailDone(null);
            }
        };

        try {
            const carId = identifyCarModel(task.carName);
            const modelUrl = resolveModelUrl(carId);
            if (modelUrl && rawGLBCache.has(modelUrl)) {
                loadCarModel(THREE, task.carName, task.styling, finishWithModel);
            } else {
                const proc = buildDetailedCarModel(THREE, task.carName, task.styling);
                finishWithModel(proc);
            }
        } catch (err) {
            console.warn('Error rendering 3D thumbnail:', err);
            onThumbnailDone(null);
        }
    }

    function renderSideThumbnail(carName, styling = {}, callback) {
        if (!isWebGLAvailable()) {
            if (callback) callback(null);
            return;
        }
        if (typeof window !== 'undefined' && window.isRaceRunning) {
            if (callback) callback(null);
            return;
        }
        const key = getThumbnailKey(carName, styling);
        if (sideThumbnailCache.has(key)) {
            if (callback) callback(sideThumbnailCache.get(key));
            return;
        }
        const THREE = (typeof window !== 'undefined' && window.THREE) ? window.THREE : null;
        if (!THREE) {
            if (callback) callback(null);
            return;
        }
        if (!thumbnailCallbacks.has(key)) {
            thumbnailCallbacks.set(key, []);
            thumbnailQueue.push({ carName, styling, key });
        }
        if (callback) thumbnailCallbacks.get(key).push(callback);
        processThumbnailQueue(THREE);
    }

    // ==========================================
    // 3D HIGHWAY RACING ENGINE (CHASE CAMERA)
    // ==========================================
    class Car3DRacingEngine {
        constructor(container, options = {}) {
            this.container = container;
            this.options = options;
            this.THREE = (typeof window !== 'undefined' && window.THREE) ? window.THREE : null;
            if (!this.THREE) {
                throw new Error('Three.js is required for Car3DRacingEngine');
            }
            if (!isWebGLAvailable()) {
                throw new Error('WebGL is not available on this browser / device');
            }

            this.width = container.clientWidth || 800;
            this.height = container.clientHeight || 500;
            this.isRunning = false;
            this._destroyed = false;
            this.engineTremorRoll = 0;
            this.onGameOver = options.onGameOver || null;
            this.onPopup = options.onPopup || null;
            this.animFrameId = null;
            this.lastTime = 0;
            this._loopBound = this.loop.bind(this);
            this.lightningTimer = 4.5;
            this.lightningFlash = 0;
            this.nearMissCount = 0;
            this.shashkiCombo = 0;
            this.shashkiComboTimer = 0;
            this.earnedCash = 0;
            this.cameraShake = 0;
            this.pitchAngle = 0;
            this.rollAngle = 0;
            this.weatherGrip = 1.0;

            // Camera Modes:
            // 0: Dynamic Chase (default 3rd-person behind & above car)
            // 1: Close Sports Chase (lower & closer)
            // 2: Hood / Bumper POV
            // 3: Overhead / Top-Down View
            // 4: First-Person Cockpit Interior View (with steering wheel, digital dash & wipers)
            this.cameraMode = 0;
            this.cameraModes = [
                { name: 'chase', offset: new this.THREE.Vector3(0, 2.05, -5.8), lookOffset: new this.THREE.Vector3(0, 1.05, 14.0), fov: 58 },
                { name: 'chase_close', offset: new this.THREE.Vector3(0, 1.55, -4.4), lookOffset: new this.THREE.Vector3(0, 0.85, 13.0), fov: 62 },
                { name: 'hood', offset: new this.THREE.Vector3(0, 1.15, 0.6), lookOffset: new this.THREE.Vector3(0, 1.00, 25.0), fov: 68 },
                { name: 'top', offset: new this.THREE.Vector3(0, 30.0, -5.5), lookOffset: new this.THREE.Vector3(0, 0.0, 18.0), fov: 68 }, // zoomed out from 11.5m so full car + traffic are visible
                { name: 'cockpit', offset: new this.THREE.Vector3(0.32, 1.22, -0.24), lookOffset: new this.THREE.Vector3(0.32, 1.12, 32.0), fov: 68 }
            ];
            this.camPos = new this.THREE.Vector3(0, 2.05, -5.8);
            this.camLook = new this.THREE.Vector3(0, 1.05, 14.0);
            this.camRoll = 0;
            this._lastCameraFov = 0;
            this._tempRainbowColor = new this.THREE.Color();

            // Controls state
            this.keys = {
                gas: false,
                brake: false,
                left: false,
                right: false,
                drift: false,
                nitro: false,
                horn: false,
                speedbreaker: false
            };

            // Player state
            this.playerCar = null;
            this.playerHeadlights = [];
            this.playerTaillights = [];
            this.playerBrakeLight = null;
            this.playerNitroFlames = [];
            this.playerFireTrails = [];
            this.playerNeonLight = null;
            this.playerSguLight = null;
            this.helicopterLight = null;
            this.playerWheels = [];
            this.playerSteerWheels = [];
            this.cockpitGroup = null;
            this.cockpitSteeringWheel = null;
            this.cockpitShiftLights = null;
            this.cockpitWiperL = null;
            this.cockpitWiperR = null;
            this.wiperPhase = 0;
            this.wiperAngle = 0;
            this.currentBiome = 'highway';
            this.forcedBiome = null;
            this.isHypersonic = false;
            this.hypersonicPopupTimer = 0;

            this.carName = '';
            this.styling = {};
            this.performance = {};

            this.state = {
                x: 0,
                z: 0,
                vx: 0,
                speed: 0, // km/h
                targetSpeed: 0,
                accel: 25,
                maxSpeed: 190,
                handling: 5.5,
                driftFactor: 1.35,
                rewardMult: 1.0,
                fuelLiters: 0,
                fuelCurrent: 45,
                fuelConsumption: 9.0,
                distanceKm: 0,
                peakSpeed: 0,
                earnedCash: 0,
                driftScore: 0,
                driftCurrentScore: 0,
                driftCombo: 1,
                driftDuration: 0,
                isDrifting: false,
                isNitroActive: false,
                isDrafting: false,
                isHypersonic: false,
                currentBiome: 'highway',
                slipstreamFactor: 0,
                nitroLevel: 100, // 0 - 100%
                nitroTimer: 0,
                overtakesCount: 0,
                overtakeCombo: 0,
                overtakeComboTimer: 0,
                nearMissCount: 0,
                shashkiCombo: 0,
                shashkiComboTimer: 0,
                damageTaken: 0,
                bodyRoll: 0,
                rollAngle: 0,
                rollVelocity: 0,
                pitchSquat: 0,
                pitchAngle: 0,
                pitchVelocity: 0,
                yawAngle: 0,
                yawVelocity: 0,
                steerAngle: 0,
                suspensionY: 0,
                suspensionVelocityY: 0,
                weatherGrip: 1.0,
                scrapeTimer: 0,
                sguTimer: 0,
                sguActive: false,
                shakeAmount: 0,
                raceMode: 'circuit',
                roadCurve: 0,
                targetRoadCurve: 0,
                roadCurvature: 0,
                targetCurvature: 0,
                curveTimer: 0.3,

                // NFS Most Wanted Speedbreaker & Circuit Telemetry
                speedbreakerCharge: 100,
                isSpeedbreakerActive: false,
                position: 1,
                totalRacers: 4,
                currentLap: 1,
                totalLaps: 2,
                lapTimeSec: 0,
                bestLapTimeSec: null,
                raceTimeSec: 0,
                racePhase: 'racing',
                countdownTimer: 0,
                countdownText: '',
                trackId: 'rockport_eastfield',
                trackName: 'Городское Кольцо',
                checkpointIndex: 1,
                totalCheckpoints: 4,

                // Police Pursuit & Wanted Level
                wantedStars: 0,
                escapeTimer: 0,
                isPursuitActive: false,
                nearestPoliceDist: 999,
                bustedTimer: 0,
                isBusted: false
            };

            // Road track & chunks
            this.chunkLength = 60;
            this.numChunks = 6;
            this.roadChunks = [];
            this.highestChunkZ = 0;
            this.weather = 'night';
            this.mode = 'circuit';
            this.roadCurve = 0;
            this.targetRoadCurve = 0;
            this.roadCurvature = 0;
            this.targetCurvature = 0;
            this.curveTimer = 0.3;

            // Traffic & NFS Blacklist Rivals
            this.trafficCars = [];
            this.trafficCount = 10;
            this.trafficLanes = [-6.375, -2.125, 2.125, 6.375];
            this.nfsRivals = [];
            this.nfsCheckpointGate = null;
            this.nfsNextCheckpointZ = 300;
            this.nfsLapLength = 1200;
            this.circuitHudEl = null;
            this.circuitTelemetryEl = null;
            this.minimapCanvas = null;
            this.minimapCtx = null;

            // FX Particles
            this.smokeParticles = [];
            this.sparkParticles = [];

            this.initScene();
            this.bindResize();
        }

        initScene() {
            const THREE = this.THREE;

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(58, Math.max(0.1, this.width / Math.max(1, this.height)), 0.2, 320);

            try {
                this.renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: false,
                    powerPreference: 'high-performance'
                });
            } catch (e) {
                this.renderer = new THREE.WebGLRenderer({
                    antialias: false,
                    alpha: false
                });
            }
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
            if (this.renderer.debug) {
                this.renderer.debug.checkShaderErrors = false;
            }
            this.renderer.setSize(this.width, this.height);
            if (THREE.sRGBEncoding) {
                this.renderer.outputEncoding = THREE.sRGBEncoding;
            }

            // Shared particle assets (zero per-frame GPU allocations)
            this.sharedSparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
            this.sharedSparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

            this.sharedSmokeGeo = new THREE.SphereGeometry(0.24, 6, 6);
            this.sharedSmokeMat = new THREE.MeshBasicMaterial({
                color: 0xd1d5db,
                transparent: true,
                opacity: 0.45
            });

            this.sharedSprayGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
            this.sharedSprayMat = new THREE.MeshBasicMaterial({
                color: 0x94a3b8,
                transparent: true,
                opacity: 0.35,
                depthWrite: false
            });

            this.container.innerHTML = '';
            this.container.style.position = 'relative';
            this.container.style.overflow = 'hidden';
            this.container.appendChild(this.renderer.domElement);

            // Set up atmosphere & sky
            this.setupEnvironment('night');

            // Build endless highway road segments
            this.buildHighwayChunks();

            // Spawn traffic vehicles
            this.initTraffic();

            // Initialize 3D Visual Effects System (VFX Specialist)
            if (RaceEffectsManagerClass) {
                try {
                    this.vfx = new RaceEffectsManagerClass(this);
                } catch (vfxErr) {
                    console.warn('RaceEffectsManager init error:', vfxErr);
                }
            }
        }

        getWeatherPreset(key) {
            const presets = {
                day: {
                    id: 'day',
                    name: 'Ясный день',
                    icon: '☀️',
                    bgColor: 0x38bdf8,
                    horizonGlowColor: 0xbae6fd,
                    fogDensity: 0.0035,
                    ambientColor: 0xfff7ed,
                    ambientIntensity: 0.85,
                    sunColor: 0xfffaed,
                    sunIntensity: 1.25,
                    sunPos: [16, 28, 20],
                    asphaltColor: 0x1e2024,
                    asphaltRoughness: 0.88,
                    asphaltMetalness: 0.12,
                    grassColor: 0x15803d,
                    treeColor: 0x064e3b,
                    curbRedColor: 0xdc2626,
                    lampEmissive: 0.20,
                    headlightIntensity: 0.25,
                    headlightDistance: 26,
                    gripMultiplier: 1.0,
                    studEmissive: 0.35,
                    hasStars: false,
                    starOpacity: 0.0,
                    hasRain: false,
                    hasSnow: false
                },
                sunset: {
                    id: 'sunset',
                    name: 'Золотой закат',
                    icon: '🌅',
                    bgColor: 0x2d0b28,
                    horizonGlowColor: 0xf97316,
                    fogDensity: 0.0055,
                    ambientColor: 0xfbcfe8,
                    ambientIntensity: 0.60,
                    sunColor: 0xf97316,
                    sunIntensity: 0.95,
                    sunPos: [25, 12, 35],
                    asphaltColor: 0x1f1624,
                    asphaltRoughness: 0.82,
                    asphaltMetalness: 0.18,
                    grassColor: 0x3b1d28,
                    treeColor: 0x1c1917,
                    curbRedColor: 0xdc2626,
                    lampEmissive: 1.6,
                    headlightIntensity: 1.65,
                    headlightDistance: 46,
                    gripMultiplier: 1.0,
                    studEmissive: 1.15,
                    hasStars: true,
                    starOpacity: 0.45,
                    hasRain: false,
                    hasSnow: false
                },
                night: {
                    id: 'night',
                    name: 'Ночной мегаполис',
                    icon: '🌃',
                    bgColor: 0x030712,
                    horizonGlowColor: 0x0f172a,
                    fogDensity: 0.0075,
                    ambientColor: 0x1e293b,
                    ambientIntensity: 0.40,
                    sunColor: 0x94a3b8,
                    sunIntensity: 0.45,
                    sunPos: [12, 24, 20],
                    asphaltColor: 0x111622,
                    asphaltRoughness: 0.85,
                    asphaltMetalness: 0.15,
                    grassColor: 0x091410,
                    treeColor: 0x064e3b,
                    curbRedColor: 0xdc2626,
                    lampEmissive: 2.2,
                    headlightIntensity: 2.35,
                    headlightDistance: 58,
                    gripMultiplier: 1.0,
                    studEmissive: 1.45,
                    hasStars: true,
                    starOpacity: 0.90,
                    hasRain: false,
                    hasSnow: false
                },
                rain: {
                    id: 'rain',
                    name: 'Грозовой ливень',
                    icon: '🌧️',
                    bgColor: 0x080f19,
                    horizonGlowColor: 0x1e293b,
                    fogDensity: 0.012,
                    ambientColor: 0x384959,
                    ambientIntensity: 0.40,
                    sunColor: 0x64748b,
                    sunIntensity: 0.35,
                    sunPos: [10, 22, 15],
                    asphaltColor: 0x0c121c,
                    asphaltRoughness: 0.14, // Mirror wet asphalt sheen
                    asphaltMetalness: 0.78, // High wet surface reflection
                    grassColor: 0x071e16,
                    treeColor: 0x042f2e,
                    curbRedColor: 0xb91c1c,
                    lampEmissive: 1.9,
                    headlightIntensity: 2.60,
                    headlightDistance: 54,
                    gripMultiplier: 0.82,
                    studEmissive: 1.65,
                    hasStars: false,
                    starOpacity: 0.0,
                    hasRain: true,
                    hasSnow: false
                },
                fog: {
                    id: 'fog',
                    name: 'Густой туман',
                    icon: '🌫️',
                    bgColor: 0x78909c,
                    horizonGlowColor: 0x94a3b8,
                    fogDensity: 0.022,
                    ambientColor: 0x94a3b8,
                    ambientIntensity: 0.65,
                    sunColor: 0xcfd8dc,
                    sunIntensity: 0.50,
                    sunPos: [8, 18, 12],
                    asphaltColor: 0x263238,
                    asphaltRoughness: 0.75,
                    asphaltMetalness: 0.25,
                    grassColor: 0x1b382b,
                    treeColor: 0x14342b,
                    curbRedColor: 0xdc2626,
                    lampEmissive: 2.0,
                    headlightIntensity: 2.80,
                    headlightDistance: 40,
                    gripMultiplier: 0.94,
                    studEmissive: 1.55,
                    hasStars: false,
                    starOpacity: 0.0,
                    hasRain: false,
                    hasSnow: false
                },
                snow: {
                    id: 'snow',
                    name: 'Зимняя метель',
                    icon: '❄️',
                    bgColor: 0x334155,
                    horizonGlowColor: 0xcbd5e1,
                    fogDensity: 0.010,
                    ambientColor: 0x94a3b8,
                    ambientIntensity: 0.60,
                    sunColor: 0xe2e8f0,
                    sunIntensity: 0.65,
                    sunPos: [14, 20, 18],
                    asphaltColor: 0x1e293b,
                    asphaltRoughness: 0.42, // Icy road surface reflection
                    asphaltMetalness: 0.38,
                    grassColor: 0xe2e8f0, // Frosted white verge
                    treeColor: 0xcfd8dc, // Frosted pines
                    curbRedColor: 0xf43f5e, // Snow-dusted curb tint
                    lampEmissive: 1.8,
                    headlightIntensity: 2.20,
                    headlightDistance: 48,
                    gripMultiplier: 0.72,
                    studEmissive: 1.35,
                    hasStars: false,
                    starOpacity: 0.0,
                    hasRain: false,
                    hasSnow: true
                }
            };
            return presets[key] || presets.night;
        }

        getAutoWeatherKey(distKm = 0) {
            if (distKm < 2.5) return 'night';
            if (distKm < 5.0) return 'fog';
            if (distKm < 8.0) return 'day';
            if (distKm < 11.0) return 'sunset';
            if (distKm < 13.5) return 'rain';
            return 'snow';
        }

        setupEnvironment(weather = 'night') {
            const THREE = this.THREE;
            this.weatherMode = (weather === 'auto') ? 'auto' : 'manual';
            this.selectedWeather = weather || 'auto';
            const activeKey = (this.weatherMode === 'auto')
                ? this.getAutoWeatherKey(this.state ? this.state.distanceKm : 0)
                : weather;
            this.currentActiveWeather = activeKey;
            this.weather = activeKey;
            const preset = this.getWeatherPreset(activeKey);
            this.weatherGrip = preset.gripMultiplier || 1.0;
            if (this.state) this.state.weatherGrip = this.weatherGrip;

            if (!this.scene.background) {
                this.scene.background = new THREE.Color(preset.bgColor);
            } else {
                this.scene.background.setHex(preset.bgColor);
            }

            if (!this.scene.fog) {
                this.scene.fog = new THREE.FogExp2(preset.bgColor, preset.fogDensity);
            } else {
                this.scene.fog.color.setHex(preset.bgColor);
                this.scene.fog.density = preset.fogDensity;
            }

            if (!this.ambientLight) {
                this.ambientLight = new THREE.AmbientLight(preset.ambientColor, preset.ambientIntensity);
                this.scene.add(this.ambientLight);
            } else {
                this.ambientLight.color.setHex(preset.ambientColor);
                this.ambientLight.intensity = preset.ambientIntensity;
            }

            if (!this.sunLight) {
                this.sunLight = new THREE.DirectionalLight(preset.sunColor, preset.sunIntensity);
                this.sunLight.position.set(preset.sunPos[0], preset.sunPos[1], preset.sunPos[2]);
                this.scene.add(this.sunLight);
            } else {
                this.sunLight.color.setHex(preset.sunColor);
                this.sunLight.intensity = preset.sunIntensity;
                this.sunLight.position.set(preset.sunPos[0], preset.sunPos[1], preset.sunPos[2]);
            }

            // Starfield dome for night / sunset
            if (!this.starfield) {
                const starGeo = new THREE.BufferGeometry();
                const starCoords = [];
                for (let i = 0; i < 450; i++) {
                    const sx = (Math.random() - 0.5) * 400;
                    const sy = 15 + Math.random() * 120;
                    const sz = (Math.random() - 0.5) * 400;
                    starCoords.push(sx, sy, sz);
                }
                starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
                const starMat = new THREE.PointsMaterial({
                    color: 0xffffff,
                    size: 1.2,
                    transparent: true,
                    opacity: preset.starOpacity
                });
                this.starfield = new THREE.Points(starGeo, starMat);
                this.scene.add(this.starfield);
            }
            if (this.starfield) {
                this.starfield.visible = preset.hasStars;
                if (this.starfield.material) {
                    this.starfield.material.opacity = preset.starOpacity;
                }
            }

            this.initRainSystem();
            this.initSnowSystem();
            if (this.rainSystem) this.rainSystem.visible = !!preset.hasRain;
            if (this.snowSystem) this.snowSystem.visible = !!preset.hasSnow;

            this.applyWeatherMaterials(preset);
        }

        applyWeatherMaterials(preset) {
            if (!preset) return;
            this.weatherGrip = preset.gripMultiplier || 1.0;
            if (this.state) this.state.weatherGrip = this.weatherGrip;

            if (this.asphaltMat) {
                if (this.asphaltMat.color) this.asphaltMat.color.setHex(preset.asphaltColor);
                this.asphaltMat.roughness = preset.asphaltRoughness;
                this.asphaltMat.metalness = preset.asphaltMetalness;
                this.asphaltMat.needsUpdate = true;
            }
            if (this.grassMat) {
                if (this.grassMat.color) this.grassMat.color.setHex(preset.grassColor);
                this.grassMat.roughness = preset.grassRoughness || 0.95;
                this.grassMat.needsUpdate = true;
            }
            if (this.treeFoliageMat) {
                if (this.treeFoliageMat.color) this.treeFoliageMat.color.setHex(preset.treeColor);
                this.treeFoliageMat.needsUpdate = true;
            }
            if (this.curbRedMat && preset.curbRedColor !== undefined) {
                if (this.curbRedMat.color) this.curbRedMat.color.setHex(preset.curbRedColor);
                this.curbRedMat.needsUpdate = true;
            }
            if (this.lampLightMat) {
                this.lampLightMat.emissiveIntensity = preset.lampEmissive;
                this.lampLightMat.needsUpdate = true;
            }
            if (this.catsEyeWhiteMat) {
                this.catsEyeWhiteMat.emissiveIntensity = preset.studEmissive !== undefined ? preset.studEmissive : 1.2;
                this.catsEyeWhiteMat.needsUpdate = true;
            }
            if (this.catsEyeAmberMat) {
                this.catsEyeAmberMat.emissiveIntensity = preset.studEmissive !== undefined ? preset.studEmissive * 1.1 : 1.3;
                this.catsEyeAmberMat.needsUpdate = true;
            }
            // Automatic headlight beam intensity & distance adaptation per weather
            if (this.playerHeadlights && this.playerHeadlights.length > 0) {
                const hlInt = preset.headlightIntensity !== undefined ? preset.headlightIntensity : 2.0;
                const hlDist = preset.headlightDistance !== undefined ? preset.headlightDistance : 52;
                this.playerHeadlights.forEach(hl => {
                    hl.intensity = hlInt;
                    hl.distance = hlDist;
                });
            }
        }

        setWeather(weatherName, isManual = false) {
            if (isManual) {
                this.weatherMode = (weatherName === 'auto') ? 'auto' : 'manual';
                this.selectedWeather = weatherName;
            }
            const activeKey = (this.weatherMode === 'auto')
                ? this.getAutoWeatherKey(this.state ? this.state.distanceKm : 0)
                : (weatherName || 'night');

            this.currentActiveWeather = activeKey;
            this.weather = activeKey;
            const preset = this.getWeatherPreset(activeKey);
            this.lightningFlash = 0;

            if (this.scene && this.scene.background) {
                this.scene.background.setHex(preset.bgColor);
            }
            if (this.scene && this.scene.fog) {
                this.scene.fog.color.setHex(preset.bgColor);
                this.scene.fog.density = preset.fogDensity;
            }
            if (this.ambientLight) {
                this.ambientLight.color.setHex(preset.ambientColor);
                this.ambientLight.intensity = preset.ambientIntensity;
            }
            if (this.sunLight) {
                this.sunLight.color.setHex(preset.sunColor);
                this.sunLight.intensity = preset.sunIntensity;
                this.sunLight.position.set(preset.sunPos[0], preset.sunPos[1], preset.sunPos[2]);
            }
            if (this.starfield) {
                this.starfield.visible = preset.hasStars;
                if (this.starfield.material) {
                    this.starfield.material.opacity = preset.starOpacity;
                }
            }
            if (this.rainSystem) {
                this.rainSystem.visible = !!preset.hasRain;
            }
            if (this.snowSystem) {
                this.snowSystem.visible = !!preset.hasSnow;
            }

            this.applyWeatherMaterials(preset);
            if (this.vfx && typeof this.vfx.setWeather === 'function') {
                this.vfx.setWeather(activeKey);
            }
            return activeKey;
        }

        cycleWeather() {
            const order = ['auto', 'day', 'sunset', 'night', 'rain', 'fog', 'snow'];
            let cur = this.selectedWeather || this.weather || 'auto';
            let idx = order.indexOf(cur);
            if (idx < 0) idx = 0;
            const next = order[(idx + 1) % order.length];
            this.setWeather(next, true);
            return next;
        }

        initRainSystem() {
            const THREE = this.THREE;
            if (this.rainSystem || !this.scene) return;
            const count = 1200;
            const positions = new Float32Array(count * 3);
            const velocities = new Float32Array(count);
            for (let i = 0; i < count; i++) {
                positions[i * 3 + 0] = (Math.random() - 0.5) * 65;
                positions[i * 3 + 1] = Math.random() * 26;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 85;
                velocities[i] = 38 + Math.random() * 25;
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({
                color: 0x93c5fd,
                size: 0.28,
                transparent: true,
                opacity: 0.65,
                depthWrite: false
            });
            this.rainSystem = new THREE.Points(geo, mat);
            this.rainSystem.userData = { velocities };
            this.rainSystem.visible = false;
            this.scene.add(this.rainSystem);
        }

        initSnowSystem() {
            const THREE = this.THREE;
            if (this.snowSystem || !this.scene) return;
            const count = 800;
            const positions = new Float32Array(count * 3);
            const speeds = new Float32Array(count);
            const driftPhases = new Float32Array(count);
            for (let i = 0; i < count; i++) {
                positions[i * 3 + 0] = (Math.random() - 0.5) * 55;
                positions[i * 3 + 1] = Math.random() * 24;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 75;
                speeds[i] = 5.0 + Math.random() * 4.0;
                driftPhases[i] = Math.random() * Math.PI * 2;
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.42,
                transparent: true,
                opacity: 0.85,
                depthWrite: false
            });
            this.snowSystem = new THREE.Points(geo, mat);
            this.snowSystem.userData = { speeds, driftPhases };
            this.snowSystem.visible = false;
            this.scene.add(this.snowSystem);
        }

        spawnWaterSpray(x, y, z) {
            if (this.smokeParticles.length >= 28) return;
            const THREE = this.THREE;
            const geo = this.sharedSprayGeo || new THREE.BoxGeometry(0.18, 0.18, 0.18);
            const mat = this.sharedSprayMat || new THREE.MeshBasicMaterial({
                color: 0x94a3b8,
                transparent: true,
                opacity: 0.35,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y, z);
            mesh.userData = {
                life: 0.28,
                maxLife: 0.28,
                vy: 0.45 + Math.random() * 0.85,
                isWaterSpray: true
            };
            this.scene.add(mesh);
            this.smokeParticles.push(mesh);
        }

        triggerLightningFlash() {
            this.lightningFlash = 0.16;
            this.lightningTimer = 4.2 + Math.random() * 6.5;
            if (this.ambientLight) this.ambientLight.intensity = 2.1;
            if (this.sunLight) this.sunLight.intensity = 2.6;
            if (this.scene && this.scene.background) this.scene.background.setHex(0xdbeafe);
            if (this.scene && this.scene.fog) this.scene.fog.color.setHex(0xdbeafe);
        }

        updateWeatherParticles(dt) {
            const state = this.state;
            if (!state) return;
            const forwardSpeedMps = (state.speed || 0) / 3.6;
            if(window.NOMERA_AUTHORS_PREVIEW)window.NomeraScene?.weather(this);

            // 1. Rain streaks & dense dual-wheel water spray
            if (this.rainSystem && this.rainSystem.visible) {
                const posAttr = this.rainSystem.geometry.attributes.position;
                const pos = posAttr.array;
                const vels = this.rainSystem.userData.velocities;
                const count = vels.length;
                for (let i = 0; i < count; i++) {
                    const i3 = i * 3;
                    pos[i3 + 1] -= (vels[i] + forwardSpeedMps * 0.25) * dt;
                    pos[i3 + 2] -= forwardSpeedMps * 0.15 * dt;

                    if (pos[i3 + 1] <= 0 || pos[i3 + 2] < state.z - 35) {
                        pos[i3 + 0] = state.x + (Math.random() - 0.5) * 65;
                        pos[i3 + 1] = 20 + Math.random() * 8;
                        pos[i3 + 2] = state.z + (Math.random() - 0.5) * 85;
                    }
                }
                posAttr.needsUpdate = true;

                // Denser wet road spray behind both rear wheels of player car
                if (state.speed > 30 && Math.random() < 0.70) {
                    this.spawnWaterSpray(state.x - 0.75 + (Math.random() - 0.5) * 0.35, 0.16, state.z - 2.1);
                    this.spawnWaterSpray(state.x + 0.75 + (Math.random() - 0.5) * 0.35, 0.16, state.z - 2.1);
                }
            }

            // 2. Snow swirling flakes with crosswind drift
            if (this.snowSystem && this.snowSystem.visible) {
                const posAttr = this.snowSystem.geometry.attributes.position;
                const pos = posAttr.array;
                const speeds = this.snowSystem.userData.speeds;
                const phases = this.snowSystem.userData.driftPhases;
                this.snowWindTime = (this.snowWindTime || 0) + dt;
                const time = (state.time || 0) + this.snowWindTime;
                const count = speeds.length;
                const windDriftX = Math.cos(time * 0.9) * 1.6;
                for (let i = 0; i < count; i++) {
                    const i3 = i * 3;
                    pos[i3 + 1] -= (speeds[i] + forwardSpeedMps * 0.08) * dt;
                    pos[i3 + 0] += (Math.sin(time * 2.4 + phases[i]) * 3.6 + windDriftX) * dt;
                    pos[i3 + 2] += Math.cos(time * 1.8 + phases[i]) * 1.8 * dt;

                    if (pos[i3 + 1] <= 0 || pos[i3 + 2] < state.z - 30) {
                        pos[i3 + 0] = state.x + (Math.random() - 0.5) * 55;
                        pos[i3 + 1] = 18 + Math.random() * 6;
                        pos[i3 + 2] = state.z + (Math.random() - 0.5) * 75;
                    }
                }
                posAttr.needsUpdate = true;
            }

            // 3. Thunderstorm lightning flash in rain
            if (this.currentActiveWeather === 'rain' && this.currentBiome !== 'tunnel') {
                const preset = this.getWeatherPreset('rain');
                this.lightningTimer = (this.lightningTimer !== undefined ? this.lightningTimer : 4.5) - dt;
                if (this.lightningTimer <= 0) {
                    this.triggerLightningFlash();
                } else if (this.lightningFlash > 0) {
                    this.lightningFlash = Math.max(0, this.lightningFlash - dt);
                    if (this.lightningFlash <= 0) {
                        if (this.ambientLight) this.ambientLight.intensity = preset.ambientIntensity;
                        if (this.sunLight) this.sunLight.intensity = preset.sunIntensity;
                        if (this.scene && this.scene.background) this.scene.background.setHex(preset.bgColor);
                        if (this.scene && this.scene.fog) this.scene.fog.color.setHex(preset.bgColor);
                    }
                }
            }

            // 4. Dynamic Auto-Weather Progression
            if (this.weatherMode === 'auto') {
                const targetWeather = this.getAutoWeatherKey(state.distanceKm);
                if (targetWeather !== this.currentActiveWeather) {
                    this.setWeather(targetWeather, false);
                    const p = this.getWeatherPreset(targetWeather);
                    const popupFn = this.onPopup || (this.options && this.options.onPopup);
                    if (popupFn && p) {
                        popupFn(`🌦️ ПОГОДА: ${p.icon} ${p.name.toUpperCase()}`, '#38bdf8');
                    }
                }
            }
        }

        buildHighwayChunks() {
            const THREE = this.THREE;
            const L = this.chunkLength;
            const roadW = 17.5; // 4 lanes

            // Shared reusable geometries across all chunks
            this.roadGeo = new THREE.PlaneGeometry(roadW, L, 7, Math.ceil(L/2));
            this.roadGeo.rotateX(-Math.PI / 2);

            this.grassGeo = new THREE.PlaneGeometry(35, L, 14, Math.ceil(L/2));
            this.grassGeo.rotateX(-Math.PI / 2);

            this.dashGeo = new THREE.PlaneGeometry(0.20, 3.6);
            this.dashGeo.rotateX(-Math.PI / 2);

            this.outerGeo = new THREE.PlaneGeometry(0.25, L, 1, Math.ceil(L/2));
            this.outerGeo.rotateX(-Math.PI / 2);

            this.curbBoxGeo = new THREE.BoxGeometry(0.35, 0.04, 1.4);

            // Cat's-eye reflective road studs (botts' dots)
            this.catsEyeGeo = new THREE.BoxGeometry(0.12, 0.03, 0.12);

            this.beamGeo = new THREE.BoxGeometry(0.12, 0.28, L, 1, 1, Math.ceil(L/2));
            this.lowerBeamGeo = new THREE.BoxGeometry(0.10, 0.20, L, 1, 1, Math.ceil(L/2));
            this.postGeo = new THREE.BoxGeometry(0.10, 0.65, 0.10);
            this.refGeo = new THREE.BoxGeometry(0.06, 0.12, 0.06);

            this.mastGeo = new THREE.CylinderGeometry(0.12, 0.18, 7.5, 12);
            this.armGeo = new THREE.BoxGeometry(2.4, 0.10, 0.10);
            this.lumGeo = new THREE.BoxGeometry(0.70, 0.12, 0.35);

            this.treeTrunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.2, 8);
            this.treeConeGeo = new THREE.ConeGeometry(2.0, 1.9, 7);

            // Roadside kilometer / chevron sign & building geometries
            this.kmSignBoardGeo = new THREE.BoxGeometry(0.55, 0.75, 0.06);
            this.chevronSignGeo = new THREE.BoxGeometry(0.65, 0.65, 0.05);
            this.buildingBoxGeo = new THREE.BoxGeometry(6.5, 14.0, 8.5);
            this.buildingWinGeo = new THREE.BoxGeometry(6.56, 0.35, 7.2);
            this.archPylonGeo = new THREE.BoxGeometry(0.85, 9.2, 1.1);
            this.archBeamGeo = new THREE.BoxGeometry(roadW + 5.2, 0.65, 0.95);

            // Shared materials for highway assets
            this.asphaltMat = new THREE.MeshStandardMaterial({
                color: 0x1e2024,
                roughness: 0.88,
                metalness: 0.12
            });

            this.grassMat = new THREE.MeshStandardMaterial({
                color: 0x142817,
                roughness: 0.95
            });

            this.lineMat = new THREE.MeshBasicMaterial({
                color: 0xf1f5f9
            });

            this.yellowLineMat = new THREE.MeshBasicMaterial({
                color: 0xf59e0b
            });

            this.curbRedMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
            this.curbWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });

            // Reflective cat's-eye road stud materials (glint in headlights)
            this.catsEyeWhiteMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0xbae6fd,
                emissiveIntensity: 1.35,
                roughness: 0.12,
                metalness: 0.88
            });
            this.catsEyeAmberMat = new THREE.MeshStandardMaterial({
                color: 0xfbbf24,
                emissive: 0xf59e0b,
                emissiveIntensity: 1.45,
                roughness: 0.12,
                metalness: 0.88
            });

            this.guardrailMat = new THREE.MeshStandardMaterial({
                color: 0x94a3b8,
                roughness: 0.35,
                metalness: 0.85
            });

            this.lampPostMat = new THREE.MeshStandardMaterial({
                color: 0x475569,
                roughness: 0.5,
                metalness: 0.7
            });

            this.lampLightMat = new THREE.MeshStandardMaterial({
                color: 0xfef08a,
                emissive: 0xfef08a,
                emissiveIntensity: 1.8
            });

            this.signGreenMat = new THREE.MeshStandardMaterial({
                color: 0x065f46,
                roughness: 0.6
            });

            this.ledMatrixMat = new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: 0x0ea5e9,
                emissiveIntensity: 2.0,
                roughness: 0.2
            });

            this.ledAmberMat = new THREE.MeshStandardMaterial({
                color: 0xfbbf24,
                emissive: 0xf59e0b,
                emissiveIntensity: 2.2,
                roughness: 0.2
            });

            this.chevronSignMat = new THREE.MeshStandardMaterial({
                color: 0xfacc15,
                emissive: 0xca8a04,
                emissiveIntensity: 0.65,
                roughness: 0.35
            });

            this.buildingMat = new THREE.MeshStandardMaterial({
                color: 0x1e293b,
                roughness: 0.75,
                metalness: 0.25
            });

            this.buildingWindowMat = new THREE.MeshStandardMaterial({
                color: 0xfef08a,
                emissive: 0xfde047,
                emissiveIntensity: 1.4
            });

            this.treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x452311, roughness: 0.9 });
            this.treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.85 });

            // Tunnel & Cable-Stayed Bridge Biome Geometries & Materials
            this.tunnelWallGeo = new THREE.BoxGeometry(0.95, 8.6, L);
            this.tunnelRoofGeo = new THREE.BoxGeometry(roadW + 4.4, 0.85, L);
            this.tunnelLightStripGeo = new THREE.BoxGeometry(0.42, 0.14, 5.2);
            this.tunnelReflectorGeo = new THREE.BoxGeometry(0.08, 0.24, L);
            this.tunnelFanGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.8, 12);
            this.tunnelFanGeo.rotateX(Math.PI / 2);

            this.tunnelConcreteMat = new THREE.MeshStandardMaterial({
                color: 0x334155,
                roughness: 0.82,
                metalness: 0.18
            });
            this.tunnelSodiumMat = new THREE.MeshStandardMaterial({
                color: 0xffb703,
                emissive: 0xfb8500,
                emissiveIntensity: 2.8,
                roughness: 0.15
            });
            this.tunnelReflectorMat = new THREE.MeshStandardMaterial({
                color: 0xf97316,
                emissive: 0xea580c,
                emissiveIntensity: 1.9,
                roughness: 0.2
            });

            this.bridgeTowerLegGeo = new THREE.BoxGeometry(1.35, 22.0, 1.65);
            this.bridgeCrossBeamGeo = new THREE.BoxGeometry(roadW + 5.6, 1.25, 1.45);
            this.bridgeCableGeo = new THREE.CylinderGeometry(0.055, 0.055, 18.5, 8);
            this.bridgeWaterGeo = new THREE.PlaneGeometry(42, L);
            this.bridgeWaterGeo.rotateX(-Math.PI / 2);

            this.bridgeTowerMat = new THREE.MeshStandardMaterial({
                color: 0xb91c1c,
                roughness: 0.38,
                metalness: 0.65
            });
            this.bridgeCableMat = new THREE.MeshStandardMaterial({
                color: 0xe2e8f0,
                emissive: 0x38bdf8,
                emissiveIntensity: 0.35,
                roughness: 0.22,
                metalness: 0.88
            });
            this.bridgeWaterMat = new THREE.MeshStandardMaterial({
                color: 0x082f49,
                roughness: 0.14,
                metalness: 0.82
            });

            if (this.currentActiveWeather) {
                this.applyWeatherMaterials(this.getWeatherPreset(this.currentActiveWeather));
            }

            // Create initial chunks from Z = -chunkLength to (numChunks - 1) * chunkLength
            this.roadChunks = [];
            for (let i = 0; i < this.numChunks; i++) {
                const chunkZ = (i - 1) * this.chunkLength;
                const chunk = this.createRoadChunk(chunkZ, i % 4 === 2);
                this.roadChunks.push(chunk);
                this.scene.add(chunk);
                if (chunkZ > this.highestChunkZ) {
                    this.highestChunkZ = chunkZ;
                }
            }
        }

        getBiomeForZ(zPos) {
            if (this.forcedBiome) return this.forcedBiome;
            if (this.mode === 'drift') return 'highway';
            // Cycle highway -> tunnel -> bridge every 600 meters (starting with highway for 0..600m)
            const sector = Math.floor(Math.max(0, zPos) / 600) % 3;
            if (sector === 1) return 'tunnel';
            if (sector === 2) return 'bridge';
            return 'highway';
        }

        applyChunkBiome(chunk, biome) {
            if (!chunk || !chunk.userData) return;
            chunk.userData.biome = biome;
            if (chunk.userData.sceneryGroup) {
                chunk.userData.sceneryGroup.visible = (biome === 'highway');
            }
            if (chunk.userData.tunnelGroup) {
                chunk.userData.tunnelGroup.visible = (biome === 'tunnel');
            }
            if (chunk.userData.bridgeGroup) {
                chunk.userData.bridgeGroup.visible = (biome === 'bridge');
            }
        }

        setBiome(biome) {
            const valid = ['highway', 'tunnel', 'bridge'];
            const next = valid.includes(biome) ? biome : 'highway';
            this.forcedBiome = next;
            this.currentBiome = next;
            this.state.currentBiome = next;
            if (this.roadChunks && this.roadChunks.length > 0) {
                this.roadChunks.forEach(ch => this.applyChunkBiome(ch, next));
            }
            return next;
        }

        createRoadChunk(zPos, hasGantry = false) {
            const THREE = this.THREE;
            const chunk = new THREE.Group();
            chunk.position.z = zPos;
            chunk.userData.hasGantry = !!hasGantry;
            chunk.userData.catsEyeStuds = [];

            const L = this.chunkLength;
            const roadW = 17.5; // 4 lanes
            const dummy = new THREE.Object3D();

            // 1. Asphalt Road Bed
            const roadMesh = new THREE.Mesh(this.roadGeo, this.asphaltMat);
            roadMesh.position.y = 0;
            chunk.add(roadMesh);

            // 2. Roadside Grass Verges
            [-1, 1].forEach(side => {
                const grass = new THREE.Mesh(this.grassGeo, this.grassMat);
                grass.position.set(side * (roadW * 0.5 + 17.5), -0.01, 0);
                chunk.add(grass);
            });

            // 3. Lane Divider Markings (3 dashed white lines, instanced) + Reflective Cat's-Eye Road Studs (Botts' Dots)
            const laneStep = roadW / 4; // 4.375m per lane
            const dashL = 3.6;
            const gapL = 3.4;
            const totalDashes = Math.floor(L / (dashL + gapL));

            if (typeof THREE.InstancedMesh === 'function') {
                const dashInst = new THREE.InstancedMesh(this.dashGeo, this.lineMat, totalDashes * 3);
                const catsEyeLaneInst = new THREE.InstancedMesh(this.catsEyeGeo, this.catsEyeWhiteMat, totalDashes * 3);
                catsEyeLaneInst.name = 'CatsEyeLaneStuds';
                let dIdx = 0;
                let studIdx = 0;
                [-laneStep * 0.5, 0, laneStep * 0.5].forEach(lineX => {
                    for (let d = 0; d < totalDashes; d++) {
                        const dashCenterZ = -L * 0.5 + d * (dashL + gapL) + dashL * 0.5;
                        dummy.position.set(lineX, 0.005, dashCenterZ);
                        dummy.rotation.set(0, 0, 0);
                        dummy.scale.set(1, 1, 1);
                        dummy.updateMatrix();
                        dashInst.setMatrixAt(dIdx++, dummy.matrix);

                        // Cat's-eye road stud centered in the gap between dashes
                        dummy.position.set(lineX, 0.016, dashCenterZ + (dashL + gapL) * 0.5);
                        dummy.updateMatrix();
                        catsEyeLaneInst.setMatrixAt(studIdx++, dummy.matrix);
                    }
                });
                dashInst.instanceMatrix.needsUpdate = true;
                catsEyeLaneInst.instanceMatrix.needsUpdate = true;
                chunk.add(dashInst);
                chunk.add(catsEyeLaneInst);
                chunk.userData.catsEyeStuds.push(catsEyeLaneInst);
            } else {
                [-laneStep * 0.5, 0, laneStep * 0.5].forEach(lineX => {
                    for (let d = 0; d < totalDashes; d++) {
                        const dashCenterZ = -L * 0.5 + d * (dashL + gapL) + dashL * 0.5;
                        const dash = new THREE.Mesh(this.dashGeo, this.lineMat);
                        dash.position.set(lineX, 0.005, dashCenterZ);
                        chunk.add(dash);

                        const stud = new THREE.Mesh(this.catsEyeGeo, this.catsEyeWhiteMat);
                        stud.name = 'CatsEyeLaneStud';
                        stud.position.set(lineX, 0.016, dashCenterZ + (dashL + gapL) * 0.5);
                        chunk.add(stud);
                        chunk.userData.catsEyeStuds.push(stud);
                    }
                });
            }

            // 4. Solid Outer Edge Lines (White/Yellow) + Shoulder Edge Cat's-Eye Studs
            [-1, 1].forEach(side => {
                const outerLine = new THREE.Mesh(this.outerGeo, side === -1 ? this.yellowLineMat : this.lineMat);
                outerLine.position.set(side * (roadW * 0.5 - 0.4), 0.006, 0);
                chunk.add(outerLine);
            });

            if (typeof THREE.InstancedMesh === 'function') {
                const shoulderStudInst = new THREE.InstancedMesh(this.catsEyeGeo, this.catsEyeAmberMat, totalDashes * 2);
                shoulderStudInst.name = 'CatsEyeShoulderStuds';
                let sIdx = 0;
                [-1, 1].forEach(side => {
                    const edgeX = side * (roadW * 0.5 - 0.55);
                    for (let d = 0; d < totalDashes; d++) {
                        dummy.position.set(edgeX, 0.016, -L * 0.5 + d * (dashL + gapL) + 1.5);
                        dummy.rotation.set(0, 0, 0);
                        dummy.scale.set(1, 1, 1);
                        dummy.updateMatrix();
                        shoulderStudInst.setMatrixAt(sIdx++, dummy.matrix);
                    }
                });
                shoulderStudInst.instanceMatrix.needsUpdate = true;
                chunk.add(shoulderStudInst);
                chunk.userData.catsEyeStuds.push(shoulderStudInst);
            }

            // 5. Rumble Curb Strips (Alternating Red and White, instanced)
            const curbDashes = Math.floor(L / 1.5);
            if (typeof THREE.InstancedMesh === 'function') {
                const curbRedInst = new THREE.InstancedMesh(this.curbBoxGeo, this.curbRedMat, curbDashes);
                const curbWhiteInst = new THREE.InstancedMesh(this.curbBoxGeo, this.curbWhiteMat, curbDashes);
                let rIdx = 0, wIdx = 0;
                [-1, 1].forEach(side => {
                    const curbX = side * (roadW * 0.5 - 0.05);
                    for (let c = 0; c < curbDashes; c++) {
                        dummy.position.set(curbX, 0.02, -L * 0.5 + c * 1.5 + 0.75);
                        dummy.rotation.set(0, 0, 0);
                        dummy.scale.set(1, 1, 1);
                        dummy.updateMatrix();
                        if (c % 2 === 0) {
                            curbRedInst.setMatrixAt(rIdx++, dummy.matrix);
                        } else {
                            curbWhiteInst.setMatrixAt(wIdx++, dummy.matrix);
                        }
                    }
                });
                curbRedInst.instanceMatrix.needsUpdate = true;
                curbWhiteInst.instanceMatrix.needsUpdate = true;
                chunk.add(curbRedInst);
                chunk.add(curbWhiteInst);
            } else {
                [-1, 1].forEach(side => {
                    const curbX = side * (roadW * 0.5 - 0.05);
                    for (let c = 0; c < curbDashes; c++) {
                        const mat = (c % 2 === 0) ? this.curbRedMat : this.curbWhiteMat;
                        const curb = new THREE.Mesh(this.curbBoxGeo, mat);
                        curb.position.set(curbX, 0.02, -L * 0.5 + c * 1.5 + 0.75);
                        chunk.add(curb);
                    }
                });
            }

            // 6. Double Corrugated Steel Guardrails (Crash Barriers)
            [-1, 1].forEach(side => {
                const railX = side * (roadW * 0.5 + 0.45);
                // Upper beam
                const beam = new THREE.Mesh(this.beamGeo, this.guardrailMat);
                beam.position.set(railX, 0.52, 0);
                chunk.add(beam);

                // Lower beam
                const lowerBeam = new THREE.Mesh(this.lowerBeamGeo, this.guardrailMat);
                lowerBeam.position.set(railX, 0.24, 0);
                chunk.add(lowerBeam);
            });

            // Guardrail Posts & Reflectors (Instanced)
            const postCount = Math.floor(L / 4.0);
            if (typeof THREE.InstancedMesh === 'function') {
                const postInst = new THREE.InstancedMesh(this.postGeo, this.guardrailMat, postCount * 2);
                const refWhiteInst = new THREE.InstancedMesh(this.refGeo, this.curbWhiteMat, postCount);
                const refRedInst = new THREE.InstancedMesh(this.refGeo, this.curbRedMat, postCount);
                let pIdx = 0;
                [-1, 1].forEach((side) => {
                    const railX = side * (roadW * 0.5 + 0.45);
                    for (let p = 0; p < postCount; p++) {
                        const postZ = -L * 0.5 + p * 4.0;
                        dummy.position.set(railX, 0.32, postZ);
                        dummy.rotation.set(0, 0, 0);
                        dummy.scale.set(1, 1, 1);
                        dummy.updateMatrix();
                        postInst.setMatrixAt(pIdx++, dummy.matrix);

                        dummy.position.set(railX - side * 0.06, 0.56, postZ);
                        dummy.updateMatrix();
                        if (side === -1) {
                            refWhiteInst.setMatrixAt(p, dummy.matrix);
                        } else {
                            refRedInst.setMatrixAt(p, dummy.matrix);
                        }
                    }
                });
                postInst.instanceMatrix.needsUpdate = true;
                refWhiteInst.instanceMatrix.needsUpdate = true;
                refRedInst.instanceMatrix.needsUpdate = true;
                chunk.add(postInst);
                chunk.add(refWhiteInst);
                chunk.add(refRedInst);
            } else {
                [-1, 1].forEach((side) => {
                    const railX = side * (roadW * 0.5 + 0.45);
                    for (let p = 0; p < postCount; p++) {
                        const post = new THREE.Mesh(this.postGeo, this.guardrailMat);
                        post.position.set(railX, 0.32, -L * 0.5 + p * 4.0);
                        chunk.add(post);

                        const refMat = (side === 1) ? this.curbRedMat : this.curbWhiteMat;
                        const refMesh = new THREE.Mesh(this.refGeo, refMat);
                        refMesh.position.set(railX - side * 0.06, 0.56, -L * 0.5 + p * 4.0);
                        chunk.add(refMesh);
                    }
                });
            }

            // 6b. Roadside Kilometer Marker & Chevron Warning Signs on Outer Guardrails
            const signGroup = new THREE.Group();
            signGroup.name = 'RoadsideSignsGroup';
            [-1, 1].forEach((side, sIdx) => {
                const signX = side * (roadW * 0.5 + 0.95);
                const signZ = (sIdx === 0) ? -L * 0.25 : L * 0.25;
                const pole = new THREE.Mesh(this.postGeo, this.lampPostMat);
                pole.position.set(signX, 0.75, signZ);
                pole.scale.set(0.8, 2.2, 0.8);
                signGroup.add(pole);

                if (side === 1) {
                    // Green/white kilometer marker board
                    const kmBoard = new THREE.Mesh(this.kmSignBoardGeo, this.signGreenMat);
                    kmBoard.name = 'KilometerSign';
                    kmBoard.position.set(signX, 1.45, signZ);
                    signGroup.add(kmBoard);
                } else {
                    // Glowing yellow chevron curve sign
                    const chevBoard = new THREE.Mesh(this.chevronSignGeo, this.chevronSignMat);
                    chevBoard.name = 'RoadsideChevronSign';
                    chevBoard.position.set(signX, 1.45, signZ);
                    signGroup.add(chevBoard);
                }
            });
            chunk.add(signGroup);

            // 7. Highway Lampposts (every 40 meters)
            [-1, 1].forEach(side => {
                const lampX = side * (roadW * 0.5 + 1.6);
                const lampGroup = new THREE.Group();
                lampGroup.position.set(lampX, 0, 0);

                // Arched Vertical Mast
                const mast = new THREE.Mesh(this.mastGeo, this.lampPostMat);
                mast.position.y = 3.75;
                lampGroup.add(mast);

                // Horizontal Cantilever Arm over road
                const arm = new THREE.Mesh(this.armGeo, this.lampPostMat);
                arm.position.set(-side * 1.1, 7.3, 0);
                arm.rotation.z = side * 0.14;
                lampGroup.add(arm);

                // Glowing Lamp Luminaire Head
                const lum = new THREE.Mesh(this.lumGeo, this.lampLightMat);
                lum.position.set(-side * 2.2, 7.1, 0);
                lampGroup.add(lum);

                chunk.add(lampGroup);
            });

            // 8. Overhead Highway Gantry Sign (every 240m on selected chunks) with LED Matrix & Speed Radar
            if (hasGantry) {
                const gantryGroup = new THREE.Group();
                gantryGroup.name = 'HighwayGantry';
                gantryGroup.position.set(0, 0, 0);

                // Dual Support Pillars on shoulders
                [-1, 1].forEach(side => {
                    const colGeo = new THREE.CylinderGeometry(0.22, 0.26, 7.8, 12);
                    const col = new THREE.Mesh(colGeo, this.guardrailMat);
                    col.position.set(side * (roadW * 0.5 + 1.2), 3.9, 0);
                    gantryGroup.add(col);
                });

                // Cross Truss Beam
                const trussGeo = new THREE.BoxGeometry(roadW + 3.0, 0.90, 0.70);
                const truss = new THREE.Mesh(trussGeo, this.guardrailMat);
                truss.position.set(0, 7.4, 0);
                gantryGroup.add(truss);

                // Large Green Russian Highway Information Signs + Glowing LED Matrix Display Panels
                [-3.8, 3.8].forEach((signX, idx) => {
                    const signGeo = new THREE.BoxGeometry(5.2, 1.8, 0.12);
                    const signMesh = new THREE.Mesh(signGeo, this.signGreenMat);
                    signMesh.position.set(signX, 6.8, -0.42);
                    gantryGroup.add(signMesh);

                    // Sign border
                    const borderGeo = new THREE.BoxGeometry(5.3, 1.9, 0.04);
                    const borderMesh = new THREE.Mesh(borderGeo, this.lineMat);
                    borderMesh.position.set(signX, 6.8, -0.44);
                    gantryGroup.add(borderMesh);

                    // Glowing LED Matrix VMS Board embedded on gantry
                    const ledPanelGeo = new THREE.BoxGeometry(2.8, 0.52, 0.06);
                    const ledPanel = new THREE.Mesh(ledPanelGeo, idx === 0 ? this.ledMatrixMat : this.ledAmberMat);
                    ledPanel.name = 'LEDMatrixDisplay';
                    ledPanel.position.set(signX, 6.8, -0.50);
                    gantryGroup.add(ledPanel);
                });

                // Speed Camera Radar Module (📸 Автоураган / Кордон) in center
                const camBoxGeo = new THREE.BoxGeometry(0.95, 0.55, 0.65);
                const camBox = new THREE.Mesh(camBoxGeo, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 }));
                camBox.name = 'SpeedRadarModule';
                camBox.position.set(0, 6.7, -0.42);
                gantryGroup.add(camBox);

                const lensGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 16);
                lensGeo.rotateX(Math.PI / 2);
                const lens = new THREE.Mesh(lensGeo, new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
                lens.position.set(-0.18, 6.7, -0.76);
                gantryGroup.add(lens);

                const irStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.06), this.curbRedMat);
                irStrobe.name = 'RadarIRFlash';
                irStrobe.position.set(0.20, 6.7, -0.76);
                gantryGroup.add(irStrobe);

                chunk.add(gantryGroup);
                chunk.userData.gantryGroup = gantryGroup;
            }

            // 9. Roadside Low-Poly Pine and Birch Trees along shoulders (Instanced)
            if (typeof THREE.InstancedMesh === 'function') {
                const trunkInst = new THREE.InstancedMesh(this.treeTrunkGeo, this.treeTrunkMat, 6);
                const coneInst = new THREE.InstancedMesh(this.treeConeGeo, this.treeFoliageMat, 18);
                let coneIdx = 0;
                for (let t = 0; t < 6; t++) {
                    const side = (t % 2 === 0) ? -1 : 1;
                    const treeX = side * (roadW * 0.5 + 4.0 + (t * 2.3) % 4.5);
                    const treeZ = -L * 0.5 + t * (L / 6) + 3.5;
                    const scale = 0.85 + (t % 3) * 0.22;

                    // Trunk
                    dummy.position.set(treeX, 1.1 * scale, treeZ);
                    dummy.rotation.set(0, t * 1.05, 0);
                    dummy.scale.set(scale, scale, scale);
                    dummy.updateMatrix();
                    trunkInst.setMatrixAt(t, dummy.matrix);

                    // 3 Foliage Cones
                    for (let tier = 0; tier < 3; tier++) {
                        const tierScale = scale * (1.0 - tier * 0.18);
                        dummy.position.set(treeX, (1.4 + tier * 1.05) * scale, treeZ);
                        dummy.rotation.set(0, t * 1.05 + tier * 0.5, 0);
                        dummy.scale.set(tierScale, scale, tierScale);
                        dummy.updateMatrix();
                        coneInst.setMatrixAt(coneIdx++, dummy.matrix);
                    }
                }
                trunkInst.instanceMatrix.needsUpdate = true;
                coneInst.instanceMatrix.needsUpdate = true;
                chunk.add(trunkInst);
                chunk.add(coneInst);
            } else {
                for (let t = 0; t < 6; t++) {
                    const side = (t % 2 === 0) ? -1 : 1;
                    const treeX = side * (roadW * 0.5 + 4.0 + (t * 2.3) % 4.5);
                    const treeZ = -L * 0.5 + t * (L / 6) + 3.5;
                    const tree = new THREE.Group();
                    tree.position.set(treeX, 0, treeZ);
                    const trunk = new THREE.Mesh(this.treeTrunkGeo, this.treeTrunkMat);
                    trunk.position.y = 1.1;
                    tree.add(trunk);
                    for (let tier = 0; tier < 3; tier++) {
                        const cone = new THREE.Mesh(this.treeConeGeo, this.treeFoliageMat);
                        cone.position.y = 1.4 + tier * 1.05;
                        tree.add(cone);
                    }
                    chunk.add(tree);
                }
            }

            // 10. Richer Roadside Scenery Variation: Skyline Buildings & Bridge Arch Pylons
            const chunkIndex = Math.abs(Math.round(zPos / Math.max(1, L)));
            const sceneryGroup = new THREE.Group();
            sceneryGroup.name = 'RoadsideSceneryGroup';

            [-1, 1].forEach((side, sIdx) => {
                const bldgX = side * (roadW * 0.5 + 16.5 + ((chunkIndex + sIdx) % 3) * 2.8);
                const bldgZ = (sIdx === 0 ? -12.0 : 14.0);
                const hScale = 0.8 + ((chunkIndex + sIdx * 2) % 4) * 0.35;
                const bldg = new THREE.Mesh(this.buildingBoxGeo, this.buildingMat);
                bldg.name = 'RoadsideBuilding';
                bldg.scale.set(1.0, hScale, 1.0);
                bldg.position.set(bldgX, 7.0 * hScale, bldgZ);
                sceneryGroup.add(bldg);

                // Illuminated window band on building
                const winStrip = new THREE.Mesh(this.buildingWinGeo, this.buildingWindowMat);
                winStrip.position.set(bldgX, 9.5 * hScale, bldgZ);
                sceneryGroup.add(winStrip);
            });

            if (!hasGantry && chunkIndex % 2 === 1) {
                const archGroup = new THREE.Group();
                archGroup.name = 'HighwayBridgeArch';
                [-1, 1].forEach(side => {
                    const pylon = new THREE.Mesh(this.archPylonGeo, this.guardrailMat);
                    pylon.position.set(side * (roadW * 0.5 + 2.1), 4.6, L * 0.3);
                    archGroup.add(pylon);
                });
                const archBeam = new THREE.Mesh(this.archBeamGeo, this.guardrailMat);
                archBeam.position.set(0, 8.9, L * 0.3);
                archGroup.add(archBeam);
                archBeam.userData.solidBody=true;
                sceneryGroup.add(archGroup);
            }

            chunk.add(sceneryGroup);
            chunk.userData.sceneryGroup = sceneryGroup;

            // 11. Lefortovo Tunnel Biome Group (concrete walls, vaulted roof, sodium orange ceiling lights & jet fans)
            const tunnelGroup = new THREE.Group();
            tunnelGroup.name = 'LefortovoTunnelGroup';
            [-1, 1].forEach(side => {
                const wallX = side * (roadW * 0.5 + 1.65);
                const wall = new THREE.Mesh(this.tunnelWallGeo, this.tunnelConcreteMat);
                wall.name = side < 0 ? 'TunnelWallL' : 'TunnelWallR';
                wall.position.set(wallX, 4.2, 0);
                tunnelGroup.add(wall);

                const refStrip = new THREE.Mesh(this.tunnelReflectorGeo, this.tunnelReflectorMat);
                refStrip.name = 'TunnelReflectorStrip';
                refStrip.position.set(wallX - side * 0.50, 1.25, 0);
                tunnelGroup.add(refStrip);
            });
            const roof = new THREE.Mesh(this.tunnelRoofGeo, (window.NOMERA_AUTHORS_PREVIEW && this.authorsTunnelRoofMaterial) || this.tunnelConcreteMat);
            roof.name = 'TunnelVaultRoof';
            roof.position.set(0, 8.6, 0);
            tunnelGroup.add(roof);

            for (let lz = -L * 0.38; lz <= L * 0.38; lz += L * 0.38) {
                [-4.2, 4.2].forEach(lx => {
                    const sodiumLamp = new THREE.Mesh(this.tunnelLightStripGeo, this.tunnelSodiumMat);
                    sodiumLamp.name = 'TunnelSodiumLight';
                    sodiumLamp.position.set(lx, 8.12, lz);
                    tunnelGroup.add(sodiumLamp);
                });
            }
            [-2.2, 2.2].forEach(fx => {
                const fan = new THREE.Mesh(this.tunnelFanGeo, this.guardrailMat);
                fan.name = 'TunnelJetFan';
                fan.position.set(fx, 7.85, 0);
                tunnelGroup.add(fan);
            });
            chunk.add(tunnelGroup);
            chunk.userData.tunnelGroup = tunnelGroup;

            // 12. Cable-Stayed Bridge Biome Group (tall crimson pylon towers, diagonal stay cables & river water below)
            const bridgeGroup = new THREE.Group();
            bridgeGroup.name = 'CableBridgeGroup';
            [-1, 1].forEach(side => {
                const water = new THREE.Mesh(this.bridgeWaterGeo, this.bridgeWaterMat);
                water.name = 'BridgeRiverWater';
                water.position.set(side * (roadW * 0.5 + 21.5), -2.5, 0);
                bridgeGroup.add(water);

                const towerLeg = new THREE.Mesh(this.bridgeTowerLegGeo, this.bridgeTowerMat);
                towerLeg.name = 'CableBridgeTower';
                towerLeg.position.set(side * (roadW * 0.5 + 2.2), 10.5, 0);
                bridgeGroup.add(towerLeg);

                // Diagonal stay cables fanning from tower top to bridge deck
                [-1, 1].forEach(dirZ => {
                    const cable = new THREE.Mesh(this.bridgeCableGeo, this.bridgeCableMat);
                    cable.name = 'BridgeStayCable';
                    cable.position.set(side * (roadW * 0.5 + 1.8), 9.2, dirZ * (L * 0.24));
                    cable.rotation.x = dirZ * 0.68;
                    bridgeGroup.add(cable);
                });
            });
            const crossCrown = new THREE.Mesh(this.bridgeCrossBeamGeo, this.bridgeTowerMat);
            crossCrown.position.set(0, 18.8, 0);
            bridgeGroup.add(crossCrown);
            chunk.add(bridgeGroup);
            chunk.userData.bridgeGroup = bridgeGroup;

            this.applyChunkBiome(chunk, this.getBiomeForZ(zPos));

            return chunk;
        }

        initTraffic() {
            const THREE = this.THREE;
            if (this.trafficCars && this.trafficCars.length > 0) {
                this.trafficCars.forEach(car => {
                    try {
                        if (this.scene) this.scene.remove(car);
                        deepDispose(car);
                    } catch (_) {}
                });
            }
            this.trafficCars = [];

            const typesPool = ['sedan', 'suv', 'sport', 'police', 'taxi', 'ambulance', 'kamaz', 'truck', 'hatchback', 'police'];

            // Spawn pool of traffic cars with authentic lane distribution
            for (let i = 0; i < this.trafficCount; i++) {
                const type = typesPool[i % typesPool.length];
                let laneIdx;
                if (type === 'truck' || type === 'kamaz') {
                    laneIdx = 3;
                } else if (type === 'sport' || type === 'police') {
                    laneIdx = 0;
                } else if (type === 'ambulance' || type === 'suv') {
                    laneIdx = 1;
                } else if (type === 'taxi') {
                    laneIdx = 2;
                } else {
                    laneIdx = (i % 2 === 0) ? 1 : 2;
                }
                const laneX = this.trafficLanes[laneIdx];
                const spawnZ = 55 + i * 34 + Math.random() * 12;

                const trafficCar = this.createTrafficVehicle(type);
                const laneSpeed = this.getLaneSpeed(laneIdx, type);
                Object.assign(trafficCar.userData, {
                    type: type,
                    laneIndex: laneIdx,
                    targetX: laneX,
                    baseSpeed: laneSpeed,
                    speed: laneSpeed,
                    overtaken: false,
                    nearMissed: false,
                    changingLane: false,
                    isBraking: false,
                    hazardTimer: 0,
                    evadeBoostTimer: 0,
                    laneChangeTimer: 4 + Math.random() * 8,
                    cruiseTimer: 3 + Math.random() * 4,
                    speedPacingOffset: 0,
                    deflectVx: 0,
                    blinkTimer: 0
                });
                trafficCar.position.set(laneX, 0, spawnZ);

                this.trafficCars.push(trafficCar);
                this.scene.add(trafficCar);
                if(window.NOMERA_AUTHORS_PREVIEW&&window.NomeraTraffic){this.trafficGroundAt=(x,z)=>window.NomeraRoadSurface.highway(x,z);window.NomeraTraffic.spawn(this,trafficCar,{lane:laneIdx,ahead:180+i*34});}
            }
        }

        getLaneSpeed(laneIdx, type) {
            if (type === 'truck' || type === 'kamaz') {
                return 65 + Math.random() * 12; // 65-77 км/ч (тяжелые длинномеры КАМАЗ)
            }
            if (type === 'sport') {
                return 130 + Math.random() * 20; // 130-150 км/ч (быстрые спорткары)
            }
            if (type === 'ambulance') {
                return 112 + Math.random() * 16; // 112-128 км/ч (скорая помощь)
            }
            if (type === 'taxi') {
                return 92 + Math.random() * 16;  // 92-108 км/ч (городское такси)
            }
            if (laneIdx === 0) {
                return 122 + Math.random() * 18; // 122-140 км/ч (скоростной левый ряд)
            }
            if (laneIdx === 1) {
                return 98 + Math.random() * 16;  // 98-114 км/ч (средне-левый крейсерский)
            }
            if (laneIdx === 2) {
                return 84 + Math.random() * 14;  // 84-98 км/ч (средне-правый умеренный)
            }
            return 65 + Math.random() * 15;      // 65-80 км/ч (правый медленный ряд)
        }

        createTrafficVehicle(type = 'sedan') {
            const THREE = this.THREE;
            const group = new THREE.Group();

            const colors = ['#1e3a8a', '#374151', '#d97706', '#059669', '#b91c1c', '#f8fafc', '#18181b', '#94a3b8', '#ca8a04', '#475569'];
            const sportColors = ['#ef4444', '#0ea5e9', '#facc15', '#10b981', '#a855f7', '#f97316'];
            const bodyColor = (type === 'police' || type === 'ambulance')
                ? '#f8fafc'
                : (type === 'taxi')
                    ? '#facc15'
                    : (type === 'sport')
                        ? sportColors[Math.floor(Math.random() * sportColors.length)]
                        : colors[Math.floor(Math.random() * colors.length)];

            group.userData.type = type;
            group.userData.wheels = [];
            group.userData.changingLane = false;
            group.userData.isBraking = false;

            if (type === 'truck' || type === 'kamaz') {
                // High-detail KamAZ Freight Truck with articulated cab, sun visor, marker lights, and trailer underrun guards
                const truckGroup = new THREE.Group();
                truckGroup.name = 'DetailedTruck';

                const kamazColors = ['#ea580c', '#0284c7', '#b91c1c', '#f8fafc'];
                const cabColor = kamazColors[Math.floor(Math.random() * kamazColors.length)];
                const cabMat = new THREE.MeshStandardMaterial({ color: cabColor, roughness: 0.35, metalness: 0.50 });
                const containerColors = [0x1e3a8a, 0x065f46, 0x991b1b, 0x475569, 0xb45309];
                const boxMat = new THREE.MeshStandardMaterial({ color: containerColors[Math.floor(Math.random() * containerColors.length)], roughness: 0.65, metalness: 0.25 });
                const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 });
                const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.90 });
                const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 });
                const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                const fogLightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
                const taillightMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.5 });
                const amberMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.4 });

                // 1. KamAZ Cab-Over-Engine Tractor (Тягач КАМАЗ)
                const cabW = 2.45, cabH = 2.45, cabL = 2.15;
                const cab = new THREE.Mesh(new THREE.BoxGeometry(cabW, cabH, cabL), cabMat);
                cab.position.set(0, cabH * 0.5 + 0.44, 2.75);
                truckGroup.add(cab);

                // Windshield with central split divider
                const ws = new THREE.Mesh(new THREE.BoxGeometry(cabW * 0.88, cabH * 0.38, 0.08), glassMat);
                ws.position.set(0, cabH * 0.68 + 0.44, 2.75 + cabL * 0.5 + 0.02);
                truckGroup.add(ws);

                // Cab Exterior Sun Visor (Солнцезащитный козырек кабины КАМАЗ)
                const cabVisor = new THREE.Mesh(new THREE.BoxGeometry(cabW * 0.94, 0.16, 0.28), darkMat);
                cabVisor.name = 'CabVisor';
                cabVisor.position.set(0, cabH * 0.90 + 0.44, 2.75 + cabL * 0.5 + 0.10);
                cabVisor.rotation.x = 0.22;
                truckGroup.add(cabVisor);
                group.userData.cabVisor = cabVisor;

                // Rooftop Amber Road-Train Marker Lights (Огни автопоезда на крыше кабины)
                const markerLightsGroup = new THREE.Group();
                markerLightsGroup.name = 'CabMarkerLights';
                [-0.36, -0.18, 0, 0.18, 0.36].forEach(mx => {
                    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.08), amberMat);
                    marker.position.set(mx, cabH + 0.48, 2.75 + cabL * 0.42);
                    markerLightsGroup.add(marker);
                });
                truckGroup.add(markerLightsGroup);
                group.userData.markerLights = markerLightsGroup;

                // Dual windshield wipers
                [-0.45, 0.45].forEach(wx => {
                    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.02), darkMat);
                    wiper.position.set(wx, cabH * 0.58 + 0.44, 2.75 + cabL * 0.5 + 0.07);
                    wiper.rotation.z = 0.25;
                    truckGroup.add(wiper);
                });

                // Dual KamAZ horizontal front air intake grilles
                [-0.14, 0.14].forEach(gy => {
                    const grilleSlot = new THREE.Mesh(new THREE.BoxGeometry(cabW * 0.74, 0.18, 0.06), darkMat);
                    grilleSlot.position.set(0, cabH * 0.32 + 0.44 + gy, 2.75 + cabL * 0.5 + 0.03);
                    truckGroup.add(grilleSlot);
                });

                // KamAZ central emblem badge
                const badge = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.08), chromeMat);
                badge.position.set(0, cabH * 0.32 + 0.44, 2.75 + cabL * 0.5 + 0.05);
                truckGroup.add(badge);

                // Side windows and heavy-duty mirrors
                [-cabW * 0.5 - 0.01, cabW * 0.5 + 0.01].forEach(x => {
                    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.04, cabH * 0.34, cabL * 0.45), glassMat);
                    sw.position.set(x, cabH * 0.68 + 0.44, 2.75);
                    truckGroup.add(sw);

                    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.18), darkMat);
                    mirror.position.set(x + (x > 0 ? 0.16 : -0.16), cabH * 0.65 + 0.44, 2.75 + 0.5);
                    truckGroup.add(mirror);

                    // Side boarding steps
                    const step = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.36), darkMat);
                    step.position.set(x + (x > 0 ? 0.04 : -0.04), 0.52, 2.75);
                    truckGroup.add(step);
                });

                // Aerodynamic cab roof wind deflector (спойлер на крыше кабины)
                const deflector = new THREE.Mesh(new THREE.BoxGeometry(cabW * 0.92, 0.40, 1.25), cabMat);
                deflector.position.set(0, cabH + 0.58, 2.5);
                deflector.rotation.x = -0.28;
                truckGroup.add(deflector);

                // Dual polished air horns on cab roof
                [-0.60, 0.60].forEach(hx => {
                    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.65, 8), chromeMat);
                    horn.rotation.x = Math.PI / 2;
                    horn.position.set(hx, cabH + 0.48, 2.75);
                    truckGroup.add(horn);
                });

                // Heavy steel bumper with headlights and yellow fog lamps
                const bumper = new THREE.Mesh(new THREE.BoxGeometry(cabW * 1.02, 0.36, 0.32), darkMat);
                bumper.position.set(0, 0.52, 2.75 + cabL * 0.5 + 0.12);
                truckGroup.add(bumper);

                [-0.88, 0.88].forEach(side => {
                    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.18, 0.06), headlightMat);
                    hl.position.set(side, 0.55, 2.75 + cabL * 0.5 + 0.28);
                    truckGroup.add(hl);

                    const fog = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.06), fogLightMat);
                    fog.position.set(side * 0.62, 0.44, 2.75 + cabL * 0.5 + 0.28);
                    truckGroup.add(fog);
                });

                // Vertical chrome exhaust stack behind cab
                const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.8, 12), chromeMat);
                exhaust.position.set(cabW * 0.42, 1.95, 1.55);
                truckGroup.add(exhaust);

                // Tractor unit chassis frame
                const tractorChassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.30, 4.4), darkMat);
                tractorChassis.position.set(0, 0.48, 1.8);
                truckGroup.add(tractorChassis);

                // Cylindrical fuel tank (left) and battery/air tank (right)
                const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.6, 16), chromeMat);
                tank.rotation.z = Math.PI / 2;
                tank.position.set(-1.08, 0.50, 1.7);
                truckGroup.add(tank);

                const battBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.95), darkMat);
                battBox.position.set(1.08, 0.50, 1.7);
                truckGroup.add(battBox);

                // 2. Fifth-Wheel Articulation Coupling (Седельно-сцепное устройство / 5th-wheel turntable)
                const fifthWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.12, 16), darkMat);
                fifthWheel.position.set(0, 0.68, 0.65);
                truckGroup.add(fifthWheel);

                // 3. Articulated Cargo Container Semi-Trailer (Полуприцеп-контейнеровоз)
                const trailerChassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.28, 7.6), darkMat);
                trailerChassis.position.set(0, 0.56, -2.4);
                truckGroup.add(trailerChassis);

                // Retracted landing gear legs
                [-0.65, 0.65].forEach(lx => {
                    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.12), darkMat);
                    leg.position.set(lx, 0.40, 0.35);
                    truckGroup.add(leg);
                });

                // Side Underrun Protection Guards (Боковая противоподкатная защита полуприцепа)
                const underrunGroup = new THREE.Group();
                underrunGroup.name = 'TrailerUnderrunGuards';
                [-1.16, 1.16].forEach(ux => {
                    const railUpper = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.10, 2.6), chromeMat);
                    railUpper.position.set(ux, 0.54, -1.6);
                    underrunGroup.add(railUpper);
                    const railLower = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.10, 2.6), chromeMat);
                    railLower.position.set(ux, 0.36, -1.6);
                    underrunGroup.add(railLower);
                });
                truckGroup.add(underrunGroup);
                group.userData.underrunGuards = underrunGroup;

                // High-cube corrugated ISO freight container
                const boxW = 2.55, boxL = 6.6, boxH = 2.85;
                const freightBox = new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, boxL), boxMat);
                freightBox.position.set(0, boxH * 0.5 + 0.70, -2.4);
                truckGroup.add(freightBox);

                // Corrugated side ribs on shipping container
                for (let r = 0; r < 7; r++) {
                    const rz = -2.4 - boxL * 0.42 + r * (boxL * 0.84 / 6);
                    [-boxW * 0.505, boxW * 0.505].forEach(rx => {
                        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.04, boxH * 0.88, 0.10), boxMat);
                        rib.position.set(rx, boxH * 0.5 + 0.70, rz);
                        truckGroup.add(rib);
                    });
                }

                // Rear double cargo doors with dual vertical locking bars
                [-0.42, 0.42].forEach(rx => {
                    const lockRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, boxH * 0.85, 8), chromeMat);
                    lockRod.position.set(rx, boxH * 0.5 + 0.70, -2.4 - boxL * 0.505);
                    truckGroup.add(lockRod);
                });

                // Amber reflective hazard stripe along container bottom
                const hazardStrip = new THREE.Mesh(new THREE.BoxGeometry(boxW * 1.01, 0.14, boxL * 1.002), amberMat);
                hazardStrip.position.set(0, 0.78, -2.4);
                truckGroup.add(hazardStrip);

                // Heavy DOT underrun protection bumper and mudflaps
                const dotBumper = new THREE.Mesh(new THREE.BoxGeometry(boxW * 0.98, 0.18, 0.12), darkMat);
                dotBumper.name = 'RearUnderrunGuard';
                dotBumper.position.set(0, 0.44, -2.4 - boxL * 0.502);
                truckGroup.add(dotBumper);

                [-0.95, 0.95].forEach(side => {
                    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.20, 0.08), taillightMat);
                    tl.position.set(side, 0.62, -2.4 - boxL * 0.505);
                    truckGroup.add(tl);

                    const mudflap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.03), darkMat);
                    mudflap.position.set(side, 0.32, -2.4 - boxL * 0.501);
                    truckGroup.add(mudflap);
                });

                // Truck Wheels (Tractor steering axle + drive axle + Semi-trailer dual tandem axles = 8 wheels)
                const wheelPositions = [
                    { x: -1.08, y: 0.48, z: 3.5, isFront: true },
                    { x: 1.08, y: 0.48, z: 3.5, isFront: true },
                    { x: -1.08, y: 0.48, z: 0.8, isFront: false },
                    { x: 1.08, y: 0.48, z: 0.8, isFront: false },
                    { x: -1.08, y: 0.48, z: -3.8, isFront: false },
                    { x: 1.08, y: 0.48, z: -3.8, isFront: false },
                    { x: -1.08, y: 0.48, z: -5.1, isFront: false },
                    { x: 1.08, y: 0.48, z: -5.1, isFront: false }
                ];
                wheelPositions.forEach(wp => {
                    const wGroup = new THREE.Group();
                    wGroup.position.set(wp.x, wp.y, wp.z);

                    const tire = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.48, 0.48, wp.isFront ? 0.28 : 0.45, 16),
                        darkMat
                    );
                    tire.rotation.z = Math.PI / 2;
                    wGroup.add(tire);

                    const hub = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.24, 0.24, (wp.isFront ? 0.29 : 0.46), 12),
                        chromeMat
                    );
                    hub.rotation.z = Math.PI / 2;
                    wGroup.add(hub);

                    wGroup.userData.isWheelSpinner = true;
                    truckGroup.add(wGroup);
                    group.userData.wheels.push(wGroup);
                });

                const trafficPlatesPool = [
                    'А 777 АА | 77 RUS',
                    'Е 001 КХ | 777 RUS',
                    'В 555 ОО | 97 RUS',
                    '777 AAA | 02 KZ',
                    '001 VIP | 01 KZ',
                    'SPD 777 | CA USA',
                    'GTR 001 | NY USA',
                    'DXB A 7777 | UAE',
                    'AUH 1 88 | UAE',
                    'SHJ 3 555 | UAE'
                ];
                const truckPlateText = trafficPlatesPool[Math.floor(Math.random() * trafficPlatesPool.length)];
                const truckFP = createLicensePlate(THREE, truckPlateText, true, 'classic', 'classic');
                truckFP.name = 'FrontLicensePlate';
                truckFP.position.set(0, 0.44, 2.75 + cabL * 0.5 + 0.30);
                truckGroup.add(truckFP);

                const truckRP = createLicensePlate(THREE, truckPlateText, false, 'classic', 'classic');
                truckRP.name = 'RearLicensePlate';
                truckRP.position.set(0, 0.44, -2.4 - boxL * 0.502 - 0.08);
                truckGroup.add(truckRP);

                group.add(truckGroup);
                group.userData.isTruck = true;
                group.userData.halfWidth = 1.35;
                group.userData.halfLength = 4.8;
                if(window.NOMERA_AUTHORS_PREVIEW)window.NomeraVehicleFinish?.truck(THREE,group);
            } else if (type === 'ambulance') {
                // High-Roof Ambulance Van / Sprinter («Скорая медицинская помощь» 03 / 112)
                const ambGroup = new THREE.Group();
                ambGroup.name = 'DetailedAmbulance';

                const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.25 });
                const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xb91c1c, emissiveIntensity: 0.45, roughness: 0.35 });
                const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 });
                const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.88 });
                const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 });
                const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

                const vanW = 2.02, vanH = 1.72, vanL = 3.65;
                // Main high-roof medical box cabin
                const vanBox = new THREE.Mesh(new THREE.BoxGeometry(vanW, vanH, vanL), whiteMat);
                vanBox.position.set(0, vanH * 0.5 + 0.38, -0.45);
                ambGroup.add(vanBox);

                // Front cab nose & sloped hood
                const hood = new THREE.Mesh(new THREE.BoxGeometry(vanW * 0.96, 0.86, 1.15), whiteMat);
                hood.position.set(0, 0.82, 1.85);
                ambGroup.add(hood);

                // Sloped windshield
                const ws = new THREE.Mesh(new THREE.BoxGeometry(vanW * 0.88, 0.72, 0.08), glassMat);
                ws.position.set(0, 1.52, 1.48);
                ws.rotation.x = -0.32;
                ambGroup.add(ws);

                // Red longitudinal emergency stripes along both sides & hood
                [-vanW * 0.5 - 0.01, vanW * 0.5 + 0.01].forEach(sx => {
                    const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, vanL * 0.96), redMat);
                    sideStripe.name = 'AmbulanceStripe';
                    sideStripe.position.set(sx, 1.05, -0.45);
                    ambGroup.add(sideStripe);

                    // Iconic Red Cross Emblem on both sides
                    const crossVert = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.46, 0.14), redMat);
                    crossVert.name = 'AmbulanceCross';
                    crossVert.position.set(sx, 1.56, -0.65);
                    ambGroup.add(crossVert);

                    const crossHoriz = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.46), redMat);
                    crossHoriz.name = 'AmbulanceCross';
                    crossHoriz.position.set(sx, 1.56, -0.65);
                    ambGroup.add(crossHoriz);
                });

                // Hood red stripe & cross
                const hoodStripe = new THREE.Mesh(new THREE.BoxGeometry(vanW * 0.76, 0.03, 0.28), redMat);
                hoodStripe.position.set(0, 1.26, 1.92);
                ambGroup.add(hoodStripe);

                // Front grille, bumper & headlights
                const bumper = new THREE.Mesh(new THREE.BoxGeometry(vanW * 1.02, 0.30, 0.26), darkMat);
                bumper.position.set(0, 0.46, 2.38);
                ambGroup.add(bumper);

                [-0.74, 0.74].forEach(hx => {
                    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.06), hlMat);
                    hl.position.set(hx, 0.82, 2.43);
                    ambGroup.add(hl);
                });

                // Flashing Blue/Red Emergency Beacons on Roof
                const barBase = new THREE.Mesh(new THREE.BoxGeometry(vanW * 0.68, 0.07, 0.22), darkMat);
                barBase.position.set(0, vanH + 0.42, 0.85);
                ambGroup.add(barBase);

                const ambRed = new THREE.Mesh(
                    new THREE.BoxGeometry(0.32, 0.12, 0.20),
                    new THREE.MeshBasicMaterial({ color: 0xef4444 })
                );
                ambRed.name = 'AmbulanceBeaconRed';
                ambRed.position.set(-0.34, vanH + 0.48, 0.85);
                ambGroup.add(ambRed);

                const ambBlue = new THREE.Mesh(
                    new THREE.BoxGeometry(0.32, 0.12, 0.20),
                    new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
                );
                ambBlue.name = 'AmbulanceBeaconBlue';
                ambBlue.position.set(0.34, vanH + 0.48, 0.85);
                ambGroup.add(ambBlue);

                const ambLight = new THREE.PointLight(0x3b82f6, 1.6, 15, 2.0);
                ambLight.position.set(0, vanH + 0.65, 0.85);
                ambGroup.add(ambLight);

                group.userData.ambulanceRed = ambRed;
                group.userData.ambulanceBlue = ambBlue;
                group.userData.ambulanceLight = ambLight;

                // 4 Sprinter Wheels
                [
                    { x: -0.92, y: 0.38, z: 1.55 },
                    { x: 0.92, y: 0.38, z: 1.55 },
                    { x: -0.92, y: 0.38, z: -1.35 },
                    { x: 0.92, y: 0.38, z: -1.35 }
                ].forEach(wp => {
                    const wGroup = new THREE.Group();
                    wGroup.position.set(wp.x, wp.y, wp.z);
                    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.24, 16), darkMat);
                    tire.rotation.z = Math.PI / 2;
                    wGroup.add(tire);
                    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.25, 12), chromeMat);
                    hub.rotation.z = Math.PI / 2;
                    wGroup.add(hub);
                    wGroup.userData.isWheelSpinner = true;
                    ambGroup.add(wGroup);
                    group.userData.wheels.push(wGroup);
                });

                const ambPlate = 'О 003 МР | 77 RUS';
                const ambFP = createLicensePlate(THREE, ambPlate, true, 'classic', 'classic');
                ambFP.name = 'FrontLicensePlate';
                ambFP.position.set(0, 0.44, 2.52);
                ambGroup.add(ambFP);

                const ambRP = createLicensePlate(THREE, ambPlate, false, 'classic', 'classic');
                ambRP.name = 'RearLicensePlate';
                ambRP.position.set(0, 0.48, -2.30);
                ambGroup.add(ambRP);

                group.add(ambGroup);
                group.userData.halfWidth = 1.05;
                group.userData.halfLength = 2.50;
            } else {
                // Authentic detailed car models for Sedans, Sport Coupes, SUVs, Taxis, Hatchbacks, and Police
                let modelName;
                if (type === 'suv') {
                    const suvList = ['Toyota Land Cruiser 300', 'Mercedes-Benz G63 AMG «Гелик»', 'Rolls-Royce Cullinan'];
                    modelName = suvList[Math.floor(Math.random() * suvList.length)];
                    group.userData.halfWidth = 1.05;
                    group.userData.halfLength = 2.45;
                } else if (type === 'sport') {
                    const sportList = ['Porsche 911 GT3 RS', 'BMW M5 F90', 'Mercedes-Benz E63 AMG'];
                    modelName = sportList[Math.floor(Math.random() * sportList.length)];
                    group.userData.halfWidth = 0.98;
                    group.userData.halfLength = 2.25;
                } else if (type === 'taxi') {
                    const taxiList = ['Toyota Camry 3.5', 'Hyundai Solaris', 'Volkswagen Polo'];
                    modelName = taxiList[Math.floor(Math.random() * taxiList.length)];
                    group.userData.halfWidth = 0.95;
                    group.userData.halfLength = 2.25;
                } else if (type === 'police') {
                    const policeModels = ['ВАЗ-2107 «Жигули»', 'Toyota Camry 3.5', 'BMW M5 F90', 'Volkswagen Polo'];
                    modelName = policeModels[Math.floor(Math.random() * policeModels.length)];
                    group.userData.halfWidth = 0.95;
                    group.userData.halfLength = 2.25;
                } else if (type === 'hatchback') {
                    const hatchbackList = ['ВАЗ-2109 «Девятка»', 'Volkswagen Polo', 'Hyundai Solaris', 'Lada Priora', 'ВАЗ-2107 «Жигули»'];
                    modelName = hatchbackList[Math.floor(Math.random() * hatchbackList.length)];
                    group.userData.halfWidth = 0.90;
                    group.userData.halfLength = 2.15;
                } else {
                    const civilianList = [
                        'ВАЗ-2107 «Жигули»',
                        'ВАЗ-2109 «Девятка»',
                        'Hyundai Solaris',
                        'Volkswagen Polo',
                        'Toyota Camry 3.5',
                        'BMW M5 F90',
                        'Mercedes-Benz E63 AMG'
                    ];
                    modelName = civilianList[Math.floor(Math.random() * civilianList.length)];
                    group.userData.halfWidth = 0.95;
                    group.userData.halfLength = 2.25;
                }

                const trafficPlateSamples = [
                    'А 777 АА | 77 RUS',
                    'М 555 ММ | 97 RUS',
                    'Х 100 ХХ | 777 RUS',
                    '777 AAA | 02 KZ',
                    '888 ZZZ | 01 KZ',
                    'SPD 777 | CA USA',
                    'VIP 001 | NY USA',
                    'DXB A 7777 | UAE',
                    'D 7 | DXB UAE',
                    'AUH 01 99 | UAE'
                ];
                const randomTrafficPlate = (type === 'police')
                    ? 'А 001 МР | 97 RUS'
                    : (type === 'taxi')
                        ? 'Е 777 ТХ | 77 RUS'
                        : trafficPlateSamples[Math.floor(Math.random() * trafficPlateSamples.length)];

                const styling = {
                    color: bodyColor,
                    tint: (type === 'police') ? 'clear' : (Math.random() > 0.4 ? 'medium' : 'stock'),
                    wheels: (type === 'police') ? 'stamp' : (type === 'sport' ? 'sport' : (Math.random() > 0.5 ? 'stock' : 'torus')),
                    spoiler: (type === 'sport') ? 'high' : 'none',
                    plate: randomTrafficPlate
                };

                const carModel = buildDetailedCarModel(THREE, modelName, styling);
                if (carModel) {
                    group.add(carModel);
                    if(window.NOMERA_AUTHORS_PREVIEW)window.NomeraScene?.traffic(THREE,group,carModel,type);

                    // Collect wheels for live rotation
                    carModel.traverse(c => {
                        if (c.userData && c.userData.isWheelSpinner) {
                            group.userData.wheels.push(c);
                        }
                    });

                    // SUV Expedition Roof Rack & Rear Spare Wheel Cover (G-Class / Land Cruiser silhouette)
                    if (type === 'suv') {
                        const rackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.75 });
                        const roofRack = new THREE.Group();
                        roofRack.name = 'SUVRoofRack';
                        [-0.58, 0.58].forEach(rx => {
                            const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.65), rackMat);
                            sideRail.position.set(rx, 1.56, -0.25);
                            roofRack.add(sideRail);
                        });
                        [-0.95, -0.45, 0.05, 0.45].forEach(rz => {
                            const crossBar = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.04, 0.05), rackMat);
                            crossBar.position.set(0, 1.57, rz);
                            roofRack.add(crossBar);
                        });
                        carModel.add(roofRack);
                        group.userData.roofRack = roofRack;

                        // Rear Tailgate Spare Wheel Cover
                        const spareGroup = new THREE.Group();
                        spareGroup.name = 'SUVSpareWheelCover';
                        const spareCyl = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.38, 0.38, 0.22, 18),
                            new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.25, metalness: 0.65 })
                        );
                        spareCyl.rotation.x = Math.PI / 2;
                        spareCyl.position.set(0, 0.88, -2.22);
                        spareGroup.add(spareCyl);
                        carModel.add(spareGroup);
                        group.userData.spareWheelCover = spareGroup;
                    }

                    // Taxi Livery: Yellow Body, Black-and-White Checkered Side Stripes & Glowing Orange Roof Sign
                    if (type === 'taxi') {
                        const W = 1.82, H = 1.38;
                        const blackCheckerMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
                        const whiteCheckerMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
                        const checkerGroup = new THREE.Group();
                        checkerGroup.name = 'TaxiCheckeredStripe';

                        [-W * 0.5 - 0.012, W * 0.5 + 0.012].forEach(sx => {
                            for (let c = 0; c < 8; c++) {
                                const cz = -0.70 + c * 0.20;
                                const sqTop = new THREE.Mesh(
                                    new THREE.BoxGeometry(0.02, 0.06, 0.18),
                                    c % 2 === 0 ? blackCheckerMat : whiteCheckerMat
                                );
                                sqTop.position.set(sx, 0.72, cz);
                                checkerGroup.add(sqTop);

                                const sqBot = new THREE.Mesh(
                                    new THREE.BoxGeometry(0.02, 0.06, 0.18),
                                    c % 2 === 0 ? whiteCheckerMat : blackCheckerMat
                                );
                                sqBot.position.set(sx, 0.65, cz);
                                checkerGroup.add(sqBot);
                            }
                        });
                        carModel.add(checkerGroup);
                        group.userData.taxiCheckers = checkerGroup;

                        // Glowing Orange Roof Taxi Sign («Шашечки такси»)
                        const signBase = new THREE.Mesh(
                            new THREE.BoxGeometry(0.46, 0.04, 0.20),
                            blackCheckerMat
                        );
                        signBase.position.set(0, H + 0.06, -0.10);
                        carModel.add(signBase);

                        const taxiLanternMat = new THREE.MeshStandardMaterial({
                            color: 0xff8800,
                            emissive: 0xff6600,
                            emissiveIntensity: 1.9,
                            roughness: 0.2
                        });
                        const taxiSign = new THREE.Mesh(
                            new THREE.BoxGeometry(0.42, 0.13, 0.16),
                            taxiLanternMat
                        );
                        taxiSign.name = 'TaxiRoofSign';
                        taxiSign.position.set(0, H + 0.14, -0.10);
                        carModel.add(taxiSign);
                        group.userData.taxiSign = taxiSign;
                    }

                    // Sport Coupe Aerodynamic Carbon GT Wing
                    if (type === 'sport') {
                        const carbonMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.25, metalness: 0.8 });
                        const wingGroup = new THREE.Group();
                        wingGroup.name = 'SportGTWing';
                        const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.04, 0.26), carbonMat);
                        wingBlade.position.set(0, 1.08, -2.02);
                        wingBlade.rotation.x = 0.12;
                        wingGroup.add(wingBlade);
                        [-0.52, 0.52].forEach(wx => {
                            const strut = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.16), carbonMat);
                            strut.position.set(wx, 0.96, -2.00);
                            wingGroup.add(strut);
                        });
                        carModel.add(wingGroup);
                        group.userData.sportWing = wingGroup;
                    }

                    // Police livery & dual lightbar
                    if (type === 'police') {
                        const W = 1.82, H = 1.35, L = 4.3;

                        // Blue DPS side stripes
                        const stripeMat = new THREE.MeshBasicMaterial({ color: 0x1d4ed8 });
                        const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, L * 0.72), stripeMat);
                        stripeL.position.set(-W * 0.5 - 0.01, 0.68, 0);
                        carModel.add(stripeL);

                        const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, L * 0.72), stripeMat);
                        stripeR.position.set(W * 0.5 + 0.01, 0.68, 0);
                        carModel.add(stripeR);

                        // Blue DPS hood badge
                        const hoodStripe = new THREE.Mesh(new THREE.BoxGeometry(W * 0.6, 0.02, 0.22), stripeMat);
                        hoodStripe.position.set(0, 0.76, L * 0.32);
                        carModel.add(hoodStripe);

                        // Dual lightbar: Roof SGU aerodynamic bar base with chrome stanchions
                        const barBase = new THREE.Mesh(
                            new THREE.BoxGeometry(W * 0.64, 0.06, 0.18),
                            new THREE.MeshBasicMaterial({ color: 0x0f172a })
                        );
                        barBase.position.set(0, H + 0.08, -0.15);
                        carModel.add(barBase);

                        // Central siren speaker horn module
                        const hornSiren = new THREE.Mesh(
                            new THREE.BoxGeometry(0.14, 0.08, 0.16),
                            new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.85, roughness: 0.2 })
                        );
                        hornSiren.position.set(0, H + 0.13, -0.15);
                        carModel.add(hornSiren);

                        // Dual lightbar strobe pod: Red lens (left)
                        const sguRed = new THREE.Mesh(
                            new THREE.BoxGeometry(0.24, 0.09, 0.16),
                            new THREE.MeshBasicMaterial({ color: 0xef4444 })
                        );
                        sguRed.position.set(-0.25, H + 0.13, -0.15);
                        carModel.add(sguRed);
                        group.userData.policeRed = sguRed;

                        // Dual lightbar strobe pod: Blue lens (right)
                        const sguBlue = new THREE.Mesh(
                            new THREE.BoxGeometry(0.24, 0.09, 0.16),
                            new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
                        );
                        sguBlue.position.set(0.25, H + 0.13, -0.15);
                        carModel.add(sguBlue);
                        group.userData.policeBlue = sguBlue;

                        // Forward takedown LED spotlights
                        [-0.12, 0.12].forEach(spotX => {
                            const spotlight = new THREE.Mesh(
                                new THREE.BoxGeometry(0.06, 0.05, 0.04),
                                new THREE.MeshBasicMaterial({ color: 0xffffff })
                            );
                            spotlight.position.set(spotX, H + 0.10, -0.07);
                            carModel.add(spotlight);
                        });

                        // Flashing pursuit point light
                        const sguLight = new THREE.PointLight(0xef4444, 0, 18, 2.0);
                        sguLight.position.set(0, H + 0.35, -0.15);
                        carModel.add(sguLight);
                        group.userData.policeLight = sguLight;
                    }
                }
            }

            // Attach Amber Turn-Signal Blinkers (blinkerL, blinkerR) & Dynamic Rear Brake Lights to all traffic vehicles
            const halfW = group.userData.halfWidth || 0.95;
            const halfL = group.userData.halfLength || 2.25;
            const blinkerGeo = new THREE.BoxGeometry(0.16, 0.09, 0.06);

            const blinkerLMat = new THREE.MeshStandardMaterial({
                color: 0xf59e0b,
                emissive: 0xfbbf24,
                emissiveIntensity: 0.0,
                transparent: true,
                opacity: 0.25
            });
            const blinkerL = new THREE.Mesh(blinkerGeo, blinkerLMat);
            blinkerL.name = 'blinkerL';
            blinkerL.position.set(-halfW * 0.82, 0.62, -halfL - 0.03);
            blinkerL.visible = false;
            const blinkerLFront = new THREE.Mesh(blinkerGeo, blinkerLMat);
            blinkerLFront.position.set(0, -0.04, halfL * 2.0 + 0.06);
            blinkerL.add(blinkerLFront);
            group.add(blinkerL);

            const blinkerRMat = new THREE.MeshStandardMaterial({
                color: 0xf59e0b,
                emissive: 0xfbbf24,
                emissiveIntensity: 0.0,
                transparent: true,
                opacity: 0.25
            });
            const blinkerR = new THREE.Mesh(blinkerGeo, blinkerRMat);
            blinkerR.name = 'blinkerR';
            blinkerR.position.set(halfW * 0.82, 0.62, -halfL - 0.03);
            blinkerR.visible = false;
            const blinkerRFront = new THREE.Mesh(blinkerGeo, blinkerRMat);
            blinkerRFront.position.set(0, -0.04, halfL * 2.0 + 0.06);
            blinkerR.add(blinkerRFront);
            group.add(blinkerR);

            group.userData.blinkerL = blinkerL;
            group.userData.blinkerR = blinkerR;
            group.blinkerL = blinkerL;
            group.blinkerR = blinkerR;

            const brakeLightMat = new THREE.MeshStandardMaterial({
                color: 0xef4444,
                emissive: 0xdc2626,
                emissiveIntensity: 0.55
            });
            const brakeGeo = new THREE.BoxGeometry(0.24, 0.11, 0.05);
            const brakeL = new THREE.Mesh(brakeGeo, brakeLightMat);
            brakeL.name = 'TrafficBrakeLightL';
            brakeL.position.set(-halfW * 0.66, 0.64, -halfL - 0.025);
            group.add(brakeL);

            const brakeR = new THREE.Mesh(brakeGeo, brakeLightMat);
            brakeR.name = 'TrafficBrakeLightR';
            brakeR.position.set(halfW * 0.66, 0.64, -halfL - 0.025);
            group.add(brakeR);

            group.userData.brakeLights = [brakeL, brakeR];
            group.userData.brakeLightMat = brakeLightMat;
            group.userData.brakeLightIntensity = 0.55;

            return group;
        }

        hasSpecialPlateImmunity() {
            if (this.hasSgu || (this.styling && (this.styling.sgu === 'installed' || this.styling.sgu === true))) return true;
            const cfgPlate = (this.config && this.config.plate) ? (typeof this.config.plate === 'string' ? this.config.plate : (this.config.plate.text || '')) : '';
            const rawPlate = cfgPlate || ((this.styling && typeof this.styling.plate === 'string') ? this.styling.plate : '');
            if (!rawPlate || rawPlate === 'none') return false;
            const latinToCyr = { A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', Y: 'У', X: 'Х' };
            const upper = String(rawPlate).toUpperCase();
            const norm = upper.replace(/[ABEKMHOPCTYX]/g, ch => latinToCyr[ch] || ch);
            const mainPart = norm.split('|')[0] || norm;
            const lettersOnly = mainPart.replace(/[^А-ЯЁ]/g, '');
            const govSeries = ['АМР', 'ЕКХ', 'ООО', 'СКР', 'ФСО'];
            for (const s of govSeries) {
                if (norm.includes(s) || lettersOnly.includes(s)) return true;
            }
            const digits = (mainPart.match(/\d+/g) || []).join('');
            if (digits.length === 1 && (upper.includes('UAE') || upper.includes('DUBAI') || upper.includes('ABU') || /^\s*[A-ZА-ЯЁ]?\s*\d\s*(\||$)/i.test(upper))) {
                return true;
            }
            return false;
        }

        createCollectibleMesh(type) {
            const THREE = this.THREE;
            const group = new THREE.Group();
            group.name = 'HighwayCollectible_' + type;

            const colors = {
                fuel: { main: 0xef4444, ring: 0x10b981 },
                nitro: { main: 0x2563eb, ring: 0x38bdf8 },
                cash: { main: 0xfbbf24, ring: 0x10b981 },
                repair: { main: 0xf97316, ring: 0xe2e8f0 }
            };
            const palette = colors[type] || colors.cash;

            const ringGeo = new THREE.TorusGeometry(0.68, 0.06, 8, 20);
            const ringMat = new THREE.MeshStandardMaterial({
                color: palette.ring,
                emissive: palette.ring,
                emissiveIntensity: 1.4,
                roughness: 0.2,
                metalness: 0.6
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            group.add(ring);

            const coreMat = new THREE.MeshStandardMaterial({
                color: palette.main,
                emissive: palette.main,
                emissiveIntensity: 0.9,
                roughness: 0.25,
                metalness: 0.5
            });
            let coreMesh;
            if (type === 'nitro') {
                coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.72, 12), coreMat);
            } else if (type === 'fuel') {
                coreMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.28), coreMat);
            } else if (type === 'repair') {
                coreMesh = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.42, 0.36), coreMat);
            } else {
                coreMesh = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.40, 0.18), coreMat);
            }
            group.add(coreMesh);

            group.userData = {
                type: type,
                collected: false,
                phase: Math.random() * Math.PI * 2
            };
            return group;
        }

        initCollectibles() {
            if (!this.scene || !this.THREE) return;
            if (this.collectibles && this.collectibles.length > 0) {
                this.collectibles.forEach(c => {
                    try { this.scene.remove(c); } catch (_) {}
                });
            }
            this.collectibles = [];
            const types = ['fuel', 'nitro', 'cash', 'repair'];
            for (let i = 0; i < types.length; i++) {
                const mesh = this.createCollectibleMesh(types[i]);
                const laneIdx = i % 4;
                mesh.position.set(this.trafficLanes[laneIdx], 0.75, 220 + i * 85);
                mesh.userData.laneIndex = laneIdx;
                this.scene.add(mesh);
                this.collectibles.push(mesh);
            }
        }

        updateCollectibles(dt) {
            if (!this.collectibles || this.collectibles.length === 0) return;
            const state = this.state;
            for (let i = 0; i < this.collectibles.length; i++) {
                const item = this.collectibles[i];
                const u = item.userData || {};
                u.phase = (u.phase || 0) + dt * 3.2;
                item.rotation.y += dt * 2.4;
                item.position.y = 0.75 + Math.sin(u.phase) * 0.14+(this.mwLongitudinal&&window.NomeraRoadSurface?window.NomeraRoadSurface.highway(item.position.x,item.position.z).height:0);

                const dz = Math.abs(item.position.z - state.z);
                const dx = Math.abs(item.position.x - state.x);
                if (!u.collected && dz < 3.2 && dx < 1.65 && Math.abs((this.mwLongitudinal?.state.y||0)-(item.position.y-.75))<1.2) {
                    u.collected = true;
                    u.pickupCount = (u.pickupCount || 0) + 1;
                    const cType = u.type || 'cash';
                    if (cType === 'fuel') {
                        const maxFuel = state.fuelTankCapacity || 45;
                        state.fuelCurrent = Math.min(maxFuel, (state.fuelCurrent || 0) + 15);
                        if (typeof state.fuel === 'number') {
                            state.fuel = Math.min(100, state.fuel + 15);
                        }
                        if (this.options.onPopup) this.options.onPopup('⛽ КАНИСТРА ТОПЛИВА +15 Л!', '#10b981');
                    } else if (cType === 'nitro') {
                        state.nitroLevel = Math.min(100, (state.nitroLevel || 0) + 50);
                        if (this.options.onPopup) this.options.onPopup('🚀 БАЛЛОН N2O +50%!', '#38bdf8');
                    } else if (cType === 'repair') {
                        state.damageTaken = Math.max(0, (state.damageTaken || 0) - 25);
                        if (this.options.onPopup) this.options.onPopup('🔧 РЕМОНТ КУЗОВА +25%!', '#f59e0b');
                    } else {
                        const bonus = Math.round(5000 * (state.rewardMult || 1.0));
                        state.earnedCash += bonus;
                        this.earnedCash = state.earnedCash;
                        if (this.options.onPopup) this.options.onPopup(`💰 КЕЙС НА ДОРОГЕ! +${bonus.toLocaleString('ru-RU')} ₽`, '#fbbf24');
                    }
                    if (this.options.onSound) this.options.onSound('cash');
                    item.position.z = state.z - 60; // trigger recycle below
                }

                if (item.position.z < state.z - 25) {
                    const nextLane = Math.floor(Math.random() * 4);
                    item.position.set(this.trafficLanes[nextLane], 0.75, state.z + 210 + i * 65 + Math.random() * 45);
                    u.laneIndex = nextLane;
                    u.collected = false;
                }
            }
        }

        start(config = {}) {
            this._destroyed = false;
            this.config = Object.assign({}, config || {});
            this.mode = config.mode || 'circuit';
            this.isNfsCircuit = (this.mode === 'nfs_circuit' || this.mode === 'nfs');
            this.state.raceMode = this.mode;
            this.carName = config.carName || 'ВАЗ-2107 «Жигули»';
            this.styling = Object.assign({}, config.styling || {});
            this.performance = Object.assign({}, config.performance || {});

            const trackCatalog = {
                rockport_eastfield: { id: 'rockport_eastfield', name: 'Городское Кольцо', lapLength: 1000, checkpoints: 4, curveAmp: 0.85 },
                canyon_pass: { id: 'canyon_pass', name: 'Горный Каньон · Серпантин', lapLength: 1200, checkpoints: 4, curveAmp: 1.45 },
                bayview_sprint: { id: 'bayview_sprint', name: 'Ночная Магистраль · Порт', lapLength: 1250, checkpoints: 5, curveAmp: 0.70 }
            };
            const trackId = config.trackId || (this.options && this.options.trackId) || 'rockport_eastfield';
            this.nfsTrackMeta = trackCatalog[trackId] || trackCatalog.rockport_eastfield;
            this.nfsLapLength = this.nfsTrackMeta.lapLength;
            this.nfsCheckpointsPerLap = this.nfsTrackMeta.checkpoints;
            this.nfsCheckpointStep = this.nfsLapLength / this.nfsCheckpointsPerLap;
            this.nfsNextCheckpointZ = this.nfsCheckpointStep;
            this.nfsDifficulty = config.difficulty || (this.options && this.options.difficulty) || 'medium';

            if (this.mode === 'drift' || (this.isNfsCircuit && trackId === 'canyon_pass')) {
                const initSign = Math.random() < 0.5 ? 1 : -1;
                this.targetRoadCurve = initSign > 0 ? (1.4 + Math.random() * 1.1) : -(1.4 + Math.random() * 1.1);
                this.roadCurve = this.targetRoadCurve * 0.45;
                this.targetCurvature = initSign * (0.0045 + Math.random() * 0.0045);
                this.roadCurvature = this.targetCurvature * 0.45;
                this.curveTimer = 0.35;
            } else {
                this.roadCurve = 0;
                this.targetRoadCurve = 0;
                this.roadCurvature = 0;
                this.targetCurvature = 0;
                this.curveTimer = 2.0;
            }
            this.state.roadCurve = this.roadCurve;
            this.state.targetRoadCurve = this.targetRoadCurve;
            this.state.roadCurvature = this.roadCurvature;
            this.state.targetCurvature = this.targetCurvature;
            this.state.curveTimer = this.curveTimer;

            // Initialize player physics parameters (including NFS MW Junkman & Pro Tuning modifiers)
            const stTuning = this.styling || {};
            const jmEngine = !!stTuning.junkmanEngine;
            const jmTurbo = !!stTuning.junkmanTurbo;
            const jmTires = !!stTuning.junkmanTires;
            const jmNitro = !!stTuning.junkmanNitro;
            const gearBias = Math.max(-1, Math.min(1, Number(stTuning.gearRatioBias) || 0));
            const aeroBias = Math.max(-1, Math.min(1, Number(stTuning.aeroDownforce) || 0));
            const driftBias = Math.max(-1, Math.min(1, Number(stTuning.gripDriftBias) || 0));

            const jmSpeedMult = (jmEngine ? 1.045 : 1.0) * (jmTurbo ? 1.04 : 1.0) * (1 + gearBias * 0.055 - Math.max(0, aeroBias) * 0.02);
            const jmAccelMult = (jmEngine ? 1.08 : 1.0) * (jmTurbo ? 1.07 : 1.0) * (1 - gearBias * 0.065);
            const basePerfSpeed = this.performance.speed || 190;
            const tunedMaxSpeed = Math.round(basePerfSpeed * jmSpeedMult);
            const baseAccelVal = 24 + ((this.performance.accel || 3.0) < 2.5 ? 12 : 6);
            const tunedAccelVal = Number((baseAccelVal * jmAccelMult).toFixed(2));
            const tunedHandlingVal = Number(Math.max(2, Math.min(10, (this.performance.handling || 5.5) + (jmTires ? 0.55 : 0) + aeroBias * 0.35 - driftBias * 0.25)).toFixed(2));
            const tunedDriftFactor = Number(Math.max(0.85, Math.min(2.45, (this.performance.driftFactor || 1.35) * (1 + driftBias * 0.25))).toFixed(2));

            this.state.x = 2.125; // start in lane 2
            this.state.z = 0;
            this.state.vx = 0;
            this.state.bodyRoll = 0;
            this.camRoll = 0;
            this.state.speed = this.isNfsCircuit ? 0 : 40; // standing grid start in NFS circuit, rolling start in highway
            this.state.targetSpeed = tunedMaxSpeed * 0.75;
            this.state.accel = tunedAccelVal;
            this.state.maxSpeed = tunedMaxSpeed;
            this.state.handling = tunedHandlingVal;
            this.state.driftFactor = tunedDriftFactor;
            this.state.junkmanNitro = jmNitro;
            this.state.proAeroDownforce = aeroBias;
            this.state.rewardMult = this.performance.rewardMult || 1.0;
            this.state.fuelCurrent = this.performance.tankCapacity || 45;
            this.state.fuelConsumption = this.performance.consumption || 9.0;
            this.state.fuelLiters = 0;
            // The road runner keeps its traffic, economy and road coordinates.
            // Only its drive forces and tire response opt into the MW adapter.
            this.mwLongitudinal = config.physicsKernel ? new window.NomeraNfsPhysics.NfsVehiclePhysics({
                carName: this.carName, performance: this.performance,
                upgrades: config.upgrades || {}, styling: this.styling,
                physicsKernel: config.physicsKernel, speedKmh: this.state.speed,
                sampleGroundContact: window.NomeraRoadSurface ? window.NomeraRoadSurface.highway : null,
                weather: config.weather === 'auto' ? 'night' : (config.weather || 'night')
            }) : null;
            this.mwRoadSteering = config.physicsKernel ? new config.physicsKernel.SteeringController() : null;
            this.state.distanceKm = 0;
            this.state.peakSpeed = this.isNfsCircuit ? 0 : 40;
            this.state.earnedCash = 0;
            this.earnedCash = 0;
            this.state.driftScore = 0;
            this.state.driftCurrentScore = 0;
            this.state.driftCombo = 1;
            this.state.maxDriftCombo = 1;
            this.state.driftDuration = 0;
            this.state.isDrifting = false;
            this.state.isNitroActive = false;
            this.state.nitroLevel = 100;
            this.state.overtakesCount = 0;
            this.state.overtakeCombo = 0;
            this.state.overtakeComboTimer = 0;
            this.state.nearMissCount = 0;
            this.nearMissCount = 0;
            this.state.shashkiCombo = 0;
            this.shashkiCombo = 0;
            this.state.shashkiComboTimer = 0;
            this.shashkiComboTimer = 0;
            this.state.damageTaken = 0;
            this.state.crashed = false;
            this.state.finished = false;
            this.state.bodyRoll = 0;
            this.state.rollAngle = 0;
            this.rollAngle = 0;
            this.state.rollVelocity = 0;
            this.state.pitchSquat = 0;
            this.state.pitchAngle = 0;
            this.pitchAngle = 0;
            this.state.pitchVelocity = 0;
            this.state.downforceY = 0;
            this.state.yawAngle = 0;
            this.state.yawVelocity = 0;
            this.state.steerAngle = 0;
            this.state.suspensionY = 0;
            this.state.suspensionVelocityY = 0;
            this.state.scrapeTimer = 0;
            this.state.shakeAmount = 0;
            this.state.cameraShake = 0;
            this.cameraShake = 0;
            this.state.isDrafting = false;
            this.isDrafting = false;
            this.state.slipstreamFactor = 0;
            this.slipstreamFactor = 0;

            // NFS Most Wanted Speedbreaker & Circuit Lap State
            this.state.speedbreakerCharge = 100;
            this.state.isSpeedbreakerActive = false;
            this.state.trackId = this.nfsTrackMeta.id;
            this.state.trackName = this.nfsTrackMeta.name;
            this.state.currentLap = 1;
            this.state.totalLaps = config.totalLaps || (this.options && this.options.totalLaps) || 2;
            this.state.lapTimeSec = 0;
            this.state.bestLapTimeSec = null;
            this.state.raceTimeSec = 0;
            this.state.checkpointIndex = 1;
            this.state.totalCheckpoints = this.nfsCheckpointsPerLap;
            this.state.position = this.isNfsCircuit ? 4 : 1;
            this.state.totalRacers = 4;
            const skipCd = !!(config.skipCountdown || (this.options && this.options.skipCountdown));
            this.state.racePhase = (this.isNfsCircuit && !skipCd) ? 'countdown' : 'racing';
            this.state.countdownTimer = this.state.racePhase === 'countdown' ? 1.8 : 0;
            this.state.countdownText = '3';

            // Police pursuit & wanted state reset
            this.authorsPursuit=null;
            this.state.wantedStars = 0;
            this.state.escapeTimer = 0;
            this.state.isPursuitActive = false;
            this.state.nearestPoliceDist = 999;
            this.state.bustedTimer = 0;
            this.state.isBusted = false;
            if (this.helicopterLight) {
                try {
                    if (this.helicopterLight.target && this.helicopterLight.target.parent) this.helicopterLight.target.parent.remove(this.helicopterLight.target);
                    if (this.helicopterLight.parent) this.helicopterLight.parent.remove(this.helicopterLight);
                } catch (_) {}
                this.helicopterLight = null;
            }

            // 7-speed transmission, RPM and spring-damper suspension state
            this.state.gear = 1;
            this.state.prevGear = 1;
            this.state.rpm = 1200;
            const carId = identifyCarModel(this.carName);
            const isSupercar = ['sf90', 'huracan', 'porsche911', 'chiron', 'jesko', 'gtr', 'm3gtr', 'corvette_cross', 'mclaren', 'db9', 'viper_jv', 'gallardo_ming', 'audir8', 'rx7'].includes(carId);
            this.state.maxRpm = carId === 'm3gtr' ? 9000 : (carId === 'rx7' ? 9200 : (isSupercar ? 8800 : (['m5e60', 'm5f90', 'm8', 'e63', 'rs6', 'g63', 'supra', 'evo8_earl'].includes(carId) ? 7500 : 6500)));
            this.state.idleRpm = isSupercar ? 1100 : 900;
            this.state.shiftShock = 0;
            this.state.gasHoldTime = 0;
            this.state.prevGas = false;
            this.state.wasBraking = false;
            this.state.backfireTimer = 0;
            this.state.backfireColor = 'orange';
            this.state.brakeHeat = 0;
            this.state.time = 0;
            this.playerNitroFlames = [];
            this.playerBackfireFlames = [];
            this.playerBrakeDiscs = [];
            this.playerActiveAero = [];
            this.playerNitroLight = null;
            this.playerBackfireLight = null;
            if (this.camera && typeof this.camera.fov === 'number') {
                this.baseFov = this.camera.fov;
            } else {
                this.baseFov = 60;
            }

            // Reset road chunks to start coordinates
            this.highestChunkZ = 0;
            if (this.roadChunks && this.roadChunks.length > 0) {
                this.roadChunks.forEach((chunk, i) => {
                    const chunkZ = (i - 1) * this.chunkLength;
                    chunk.position.set(0, 0, chunkZ);
                    chunk.rotation.set(0, 0, 0);
                    this.deformHighwayChunk(chunk);
                    if (chunkZ > this.highestChunkZ) {
                        this.highestChunkZ = chunkZ;
                    }
                });
            }

            // Reset camera positions to start
            const initialMode = this.cameraModes[this.cameraMode] || this.cameraModes[0];
            this.camPos.set(this.state.x, initialMode.offset.y, this.state.z + initialMode.offset.z);
            this.camLook.set(this.state.x, initialMode.lookOffset.y, this.state.z + initialMode.lookOffset.z);
            this.camRoll = 0;

            // Re-initialize traffic pool and highway collectibles at start
            this.initTraffic();
            this.initCollectibles();

            // Initialize or clean up NFS Most Wanted Blacklist Rivals, 3D Checkpoint Arch & Circuit HUD
            this.clearNfsCircuitEntities();
            if (this.isNfsCircuit) {
                this.initNfsRivals(this.nfsDifficulty);
                this.initNfsCheckpointGate();
                this.initNfsCircuitHud();
            }

            // Load Player's authentic 3D car model
            this.loadPlayerCar();

            // Setup atmosphere
            this.setupEnvironment(config.weather || 'night');

            this.isRunning = true;
            this.lastTime = performance.now();
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            this.animFrameId = requestAnimationFrame(this._loopBound);

            setTimeout(() => {
                if (this._onResize) this._onResize();
            }, 60);
        }

        clearNfsCircuitEntities() {
            if (this.nfsRivals && this.nfsRivals.length > 0) {
                for (const r of this.nfsRivals) {
                    if (r.mesh && this.scene) {
                        try {
                            this.scene.remove(r.mesh);
                            deepDispose(r.mesh);
                        } catch (_) {}
                    }
                }
            }
            this.nfsRivals = [];
            if (this.nfsCheckpointGate && this.scene) {
                try {
                    this.scene.remove(this.nfsCheckpointGate);
                    deepDispose(this.nfsCheckpointGate);
                } catch (_) {}
            }
            this.nfsCheckpointGate = null;
            if (this.circuitHudEl && this.circuitHudEl.parentNode) {
                try { this.circuitHudEl.parentNode.removeChild(this.circuitHudEl); } catch (_) {}
            }
            this.circuitHudEl = null;
            this.circuitTelemetryEl = null;
            this.minimapCanvas = null;
            this.minimapCtx = null;
        }

        initNfsRivals(difficulty = 'medium') {
            const THREE = this.THREE;
            if (!THREE || !this.scene) return;
            const diffScale = difficulty === 'hard' ? 1.04 : (difficulty === 'easy' ? 0.88 : 0.96);
            const playerBaseMax = this.state.maxSpeed || 200;

            const rivalPool = [
                {
                    id: 'm3_gtr',
                    driverName: 'BMW M3 E46 GTR',
                    shortTag: 'M3 GTR',
                    carName: 'BMW M3 E46 GTR',
                    skill: 1.02 * diffScale,
                    styling: { color: '#cbd5e1', vinyl: 'none', spoiler: 'gtr', neon: '#38bdf8', plate: 'M 001 GT | 777 RUS' }
                },
                {
                    id: 'corvette_c6r',
                    driverName: 'Chevrolet Corvette C6.R',
                    shortTag: 'C6.R',
                    carName: 'Chevrolet Corvette C6.R',
                    skill: 0.99 * diffScale,
                    styling: { color: '#1e293b', vinyl: 'none', spoiler: 'none', neon: '#ef4444', sgu: true, plate: 'К 001 СР | 77 RUS' }
                },
                {
                    id: 'slr_mclaren',
                    driverName: 'Mercedes-Benz SLR McLaren',
                    shortTag: 'SLR',
                    carName: 'Mercedes-Benz SLR McLaren',
                    skill: 0.98 * diffScale,
                    styling: { color: '#18181b', vinyl: 'mw_blacklist', spoiler: 'gt', neon: '#ef4444', plate: 'С 002 ЛР | 777 RUS' }
                },
                {
                    id: 'aston_db9',
                    driverName: 'Aston Martin DB9',
                    shortTag: 'DB9',
                    carName: 'Aston Martin DB9',
                    skill: 0.96 * diffScale,
                    styling: { color: '#eab308', vinyl: 'stripes', spoiler: 'gt', neon: '#fbbf24', plate: 'А 003 МТ | 777 RUS' }
                },
                {
                    id: 'dodge_viper',
                    driverName: 'Dodge Viper SRT10',
                    shortTag: 'VIPER',
                    carName: 'Dodge Viper SRT10',
                    skill: 0.95 * diffScale,
                    styling: { color: '#16a34a', vinyl: 'mw_blacklist', spoiler: 'gtr', neon: '#22c55e', plate: 'В 004 СР | 777 RUS' }
                },
                {
                    id: 'gallardo',
                    driverName: 'Lamborghini Gallardo',
                    shortTag: 'GALLARDO',
                    carName: 'Lamborghini Gallardo',
                    skill: 0.95 * diffScale,
                    styling: { color: '#334155', vinyl: 'stripes', spoiler: 'none', neon: '#f59e0b', plate: 'Л 006 ГЛ | 777 RUS' }
                },
                {
                    id: 'lancer_evo',
                    driverName: 'Mitsubishi Lancer Evo VIII',
                    shortTag: 'EVO VIII',
                    carName: 'Mitsubishi Lancer Evo VIII',
                    skill: 0.94 * diffScale,
                    styling: { color: '#f8fafc', vinyl: 'drift', spoiler: 'gt', roofScoop: 'vortex', neon: '#ef4444', plate: 'Е 009 ВО | 777 RUS' }
                },
                {
                    id: 'mazda_rx8',
                    driverName: 'Mazda RX-8',
                    shortTag: 'RX-8',
                    carName: 'Mazda RX-8',
                    skill: 0.93 * diffScale,
                    styling: { color: '#ef4444', vinyl: 'drift', spoiler: 'gt', neon: '#38bdf8', plate: 'Р 012 Х8 | 777 RUS' }
                },
                {
                    id: 'toyota_supra',
                    driverName: 'Toyota Supra MK4',
                    shortTag: 'SUPRA',
                    carName: 'Toyota Supra MK4',
                    skill: 0.93 * diffScale,
                    styling: { color: '#f97316', vinyl: 'mw_blacklist', spoiler: 'gtr', bodykit: 'widebody', neon: '#f97316', plate: 'С 013 ПР | 777 RUS' }
                },
                {
                    id: 'mustang_gt',
                    driverName: 'Ford Mustang GT',
                    shortTag: 'MUSTANG',
                    carName: 'Ford Mustang GT',
                    skill: 0.94 * diffScale,
                    styling: { color: '#0f172a', vinyl: 'none', spoiler: 'none', neon: '#f59e0b', plate: 'М 015 ГТ | 77 RUS' }
                }
            ];

            const thirdRivalIdx = (this.nfsTrackMeta && this.nfsTrackMeta.id === 'canyon_pass')
                ? 2
                : ((this.nfsTrackMeta && this.nfsTrackMeta.id === 'bayview_sprint') ? 8 : 9);
            const roster = [
                Object.assign({}, rivalPool[0], { laneIndex: 1, startZ: 14, name: rivalPool[0].driverName }),
                Object.assign({}, rivalPool[1], { laneIndex: 2, startZ: 9.5, name: rivalPool[1].driverName }),
                Object.assign({}, rivalPool[thirdRivalIdx] || rivalPool[9], { laneIndex: 0, startZ: 5.0, name: (rivalPool[thirdRivalIdx] || rivalPool[9]).driverName })
            ];

            for (let i = 0; i < roster.length; i++) {
                const tpl = roster[i];
                const rootGroup = new THREE.Group();
                const bodyGroup = new THREE.Group();
                rootGroup.add(bodyGroup);

                const startX = this.trafficLanes[tpl.laneIndex] || 0;
                rootGroup.position.set(startX, 0, tpl.startZ);

                const attachRivalFX = (targetGroup) => {
                    const nitroFlames = [];
                    if (THREE.ConeGeometry && THREE.MeshBasicMaterial) {
                        [-0.42, 0.42].forEach(ox => {
                            const fGeo = new THREE.ConeGeometry(0.045, 0.42, 12);
                            fGeo.rotateX(-Math.PI / 2);
                            const fMat = new THREE.MeshBasicMaterial({
                                color: 0x00d4ff,
                                transparent: true,
                                opacity: 0.8,
                                blending: THREE.AdditiveBlending,
                                depthWrite: false
                            });
                            const fMesh = new THREE.Mesh(fGeo, fMat);
                            fMesh.position.set(ox, 0.24, -2.28);
                            fMesh.visible = false;
                            targetGroup.add(fMesh);
                            nitroFlames.push(fMesh);
                        });
                    }
                    return nitroFlames;
                };

                let wheels = [];
                let syncLoaded = false;
                try {
                    loadCarModel(THREE, tpl.carName, tpl.styling, (loadedModel) => {
                        if (this._destroyed || !loadedModel || !this.isNfsCircuit) { if(loadedModel)deepDispose(loadedModel); return; }
                        syncLoaded = true;
                        while (bodyGroup.children.length > 0) {
                            const old = bodyGroup.children[0];
                            bodyGroup.remove(old);
                            try { deepDispose(old); } catch (_) {}
                        }
                        if (tpl.styling && tpl.styling.plate) {
                            try {
                                applyLicensePlateToModel(THREE, loadedModel, tpl.styling.plate, 'none', 'classic');
                            } catch (_) {}
                        }
                        bodyGroup.add(loadedModel);
                    });
                } catch (_) {}

                if (!syncLoaded) {
                    try {
                        const procModel = buildDetailedCarModel(THREE, tpl.carName, tpl.styling);
                        if (procModel) {
                            if (tpl.styling && tpl.styling.plate) {
                                try {
                                    applyLicensePlateToModel(THREE, procModel, tpl.styling.plate, 'none', 'classic');
                                } catch (_) {}
                            }
                            bodyGroup.add(procModel);
                        }
                    } catch (_) {}
                }

                const nitroFlames = attachRivalFX(rootGroup);
                this.scene.add(rootGroup);

                this.nfsRivals.push({
                    id: tpl.id,
                    driverName: tpl.driverName,
                    shortTag: tpl.shortTag,
                    carName: tpl.carName,
                    mesh: rootGroup,
                    bodyGroup,
                    wheels,
                    nitroFlames,
                    x: startX,
                    z: tpl.startZ,
                    vx: 0,
                    speed: 0,
                    maxSpeed: Math.max(175, Math.min(395, playerBaseMax * tpl.skill)),
                    accel: (this.state.accel || 26) * tpl.skill,
                    laneIndex: tpl.laneIndex,
                    targetX: startX,
                    laneTimer: 1.2 + i * 0.7,
                    yawAngle: 0,
                    bodyRoll: 0,
                    pitchSquat: 0,
                    isNitroActive: false,
                    skill: tpl.skill,
                    overtakenByPlayer: false
                });
            }
        }

        initNfsCheckpointGate() {
            const THREE = this.THREE;
            if (!THREE || !this.scene || !THREE.BoxGeometry) return;

            const gate = new THREE.Group();
            const pillarGeo = new THREE.BoxGeometry(0.65, 6.8, 0.65);
            const pillarMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
            const beamGeo = new THREE.BoxGeometry(19.2, 1.15, 0.9);
            const beamMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
            const neonStripGeo = new THREE.BoxGeometry(19.4, 0.24, 1.0);
            const neonStripMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

            const pL = new THREE.Mesh(pillarGeo, pillarMat);
            pL.position.set(-9.1, 3.4, 0);
            const pR = new THREE.Mesh(pillarGeo, pillarMat);
            pR.position.set(9.1, 3.4, 0);
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.set(0, 6.4, 0);
            const stripTop = new THREE.Mesh(neonStripGeo, neonStripMat);
            stripTop.position.set(0, 7.0, 0);
            const stripBot = new THREE.Mesh(neonStripGeo, pillarMat);
            stripBot.position.set(0, 5.8, 0);

            gate.add(pL, pR, beam, stripTop, stripBot);
            gate.position.set(0, 0, this.nfsNextCheckpointZ);
            this.scene.add(gate);
            this.nfsCheckpointGate = gate;
            this.nfsGateNeonMat = neonStripMat;
            this.nfsGatePillarMat = pillarMat;
        }

        initNfsCircuitHud() {
            if (typeof document === 'undefined' || !this.container || typeof document.createElement !== 'function') return;
            const hostEl = this.container.parentElement || this.container;
            if (typeof hostEl.querySelectorAll === 'function') {
                const oldList = hostEl.querySelectorAll('.nfs-circuit-hud-overlay');
                for (const el of oldList) {
                    if (el && el.parentNode) el.parentNode.removeChild(el);
                }
            }

            const overlay = document.createElement('div');
            overlay.className = 'nfs-circuit-hud-overlay';
            overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:18;font-family:Inter,sans-serif;';

            const banner = document.createElement('div');
            banner.id = 'nfs-circuit-telemetry-bar';
            banner.style.cssText = 'position:absolute;top:56px;left:50%;transform:translateX(-50%);background:rgba(10,15,29,0.88);border:1px solid rgba(56,189,248,0.48);border-radius:12px;padding:6px 14px;color:#fff;font-size:11px;line-height:1.4;backdrop-filter:blur(8px);text-align:center;white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,0.45);';
            overlay.appendChild(banner);
            this.circuitTelemetryEl = banner;

            const mapCanvas = document.createElement('canvas');
            mapCanvas.className = 'nfs-minimap-canvas';
            mapCanvas.width = 136;
            mapCanvas.height = 136;
            mapCanvas.style.cssText = 'position:absolute;top:68px;right:16px;width:132px;height:132px;background:rgba(10,15,29,0.84);border:1.5px solid rgba(56,189,248,0.52);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.5);';
            if (mapCanvas.style && typeof mapCanvas.style.setProperty === 'function') {
                mapCanvas.style.setProperty('width', '132px', 'important');
                mapCanvas.style.setProperty('height', '132px', 'important');
                mapCanvas.style.setProperty('top', '68px', 'important');
                mapCanvas.style.setProperty('right', '16px', 'important');
                mapCanvas.style.setProperty('position', 'absolute', 'important');
            }
            overlay.appendChild(mapCanvas);
            this.minimapCanvas = mapCanvas;
            this.minimapCtx = typeof mapCanvas.getContext === 'function' ? mapCanvas.getContext('2d') : null;

            if (typeof hostEl.appendChild === 'function') {
                hostEl.appendChild(overlay);
            } else if (typeof this.container.appendChild === 'function') {
                this.container.appendChild(overlay);
            }
            this.circuitHudEl = overlay;
            this.updateNfsCircuitHud();
        }

        updateNfsCircuitHud() {
            if (!this.isNfsCircuit) return;
            const st = this.state;
            if (this.circuitTelemetryEl) {
                const bestStr = st.bestLapTimeSec !== null ? `${st.bestLapTimeSec.toFixed(2)}с` : '—';
                const countdownHtml = st.racePhase === 'countdown'
                    ? `<div style="color:#fbbf24;font-weight:900;font-size:13px;margin-top:2px;">🚦 СТАРТ ЧЕРЕЗ: ${st.countdownText} (ГАЗУЙ НА СТАРТЕ!)</div>`
                    : '';
                this.circuitTelemetryEl.innerHTML =
                    `<div style="font-weight:900;color:#38bdf8;font-size:12px;">🏆 ${st.trackName} · Место: <b style="color:#fbbf24;font-size:13px;">#${st.position}/${st.totalRacers}</b> · Круг: <b style="color:#34d399;">${st.currentLap}/${st.totalLaps}</b> · Чекпоинт: <b>${st.checkpointIndex}/${st.totalCheckpoints}</b></div>` +
                    `<div style="color:#e2e8f0;">⏱️ Круг: <b>${st.lapTimeSec.toFixed(1)}с</b> · Лучший круг: <b style="color:#c084fc;">${bestStr}</b></div>` +
                    countdownHtml;
            }

            if (this.minimapCtx && this.minimapCanvas) {
                const ctx = this.minimapCtx;
                const W = this.minimapCanvas.width;
                const H = this.minimapCanvas.height;
                ctx.clearRect(0, 0, W, H);

                const cx = W * 0.5;
                const cy = H * 0.5;
                const rx = 46;
                const ry = 38;
                const lapLen = Math.max(100, this.nfsLapLength || 1000);

                // Draw track circuit loop
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
                ctx.lineWidth = 6;
                ctx.beginPath();
                for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.1) {
                    const wobble = Math.sin(a * 3) * 4.5;
                    const px = cx + Math.sin(a) * (rx + wobble);
                    const py = cy - Math.cos(a) * (ry - wobble * 0.6);
                    if (a === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();

                // Start/Finish marker at top of loop (angle = 0)
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(cx - 4, cy - ry - 4, 8, 8);

                const pointForZ = (zVal) => {
                    const a = ((zVal % lapLen) / lapLen) * Math.PI * 2;
                    const wobble = Math.sin(a * 3) * 4.5;
                    return {
                        x: cx + Math.sin(a) * (rx + wobble),
                        y: cy - Math.cos(a) * (ry - wobble * 0.6)
                    };
                };

                // Rivals dots (Red)
                for (const r of this.nfsRivals) {
                    const pt = pointForZ(r.z);
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 4.0, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Player dot (Emerald Green)
                const pPt = pointForZ(st.z);
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.arc(pPt.x, pPt.y, 5.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        setPlayerPlate(plateText, frameStyle, plateStyle) {
            if (!this.styling) this.styling = {};
            this.styling.plate = plateText;
            if (frameStyle !== undefined) this.styling.frameStyle = frameStyle;
            if (plateStyle !== undefined) this.styling.plateStyle = plateStyle;
            if (this.playerCar && this.THREE) {
                applyLicensePlateToModel(
                    this.THREE,
                    this.playerCar,
                    plateText,
                    this.styling.frameStyle || 'none',
                    this.styling.plateStyle || 'classic'
                );
            }
        }

        loadPlayerCar() {
            const THREE = this.THREE;
            if (this.playerCar) {
                try {
                    if (this.scene) this.scene.remove(this.playerCar);
                    deepDispose(this.playerCar);
                } catch (_) {}
                this.playerCar = null;
            }

            let syncLoaded = false;
            try {
                loadCarModel(THREE, this.carName, this.styling, (model) => {
                    if (this._destroyed || !model) { if(model)deepDispose(model); return; }
                    syncLoaded = true;
                    if (this.playerCar) {
                        try {
                            if (this.scene) this.scene.remove(this.playerCar);
                            deepDispose(this.playerCar);
                        } catch (_) {}
                        this.playerCar = null;
                    }
                    this.playerCar = model;
                    this.authorsWheelRig = (window.NOMERA_AUTHORS_PREVIEW && window.NomeraWheelRig) ? window.NomeraWheelRig.prepareAsync(THREE,model) : null;
                    if (this.styling && this.styling.plate !== undefined) {
                        applyLicensePlateToModel(
                            THREE,
                            this.playerCar,
                            this.styling.plate,
                            this.styling.frameStyle || 'none',
                            this.styling.plateStyle || 'classic'
                        );
                    }
                    this.playerCar.position.set(this.state.x, (this.state.downforceY || 0), this.state.z);
                    this.playerCar.updateMatrixWorld(true);
                    if (this.scene) {
                        this.scene.add(this.playerCar);
                        this.setupCarLightingAndFX();
                    }
                });
            } catch (err) {
                console.warn('loadCarModel error:', err);
            }

            // If GLB model is still fetching over network, spawn procedural placeholder on frame 1
            // (will be automatically swapped out as soon as loadCarModel resolves)
            if (!syncLoaded && !this.playerCar) {
                try {
                    const immediateModel = buildDetailedCarModel(THREE, this.carName, this.styling);
                    if (immediateModel) {
                        this.playerCar = immediateModel;
                        this.authorsWheelRig = (window.NOMERA_AUTHORS_PREVIEW && window.NomeraWheelRig) ? window.NomeraWheelRig.prepare(THREE,immediateModel) : null;
                        if (this.styling && this.styling.plate !== undefined) {
                            applyLicensePlateToModel(
                                THREE,
                                this.playerCar,
                                this.styling.plate,
                                this.styling.frameStyle || 'none',
                                this.styling.plateStyle || 'classic'
                            );
                        }
                        this.playerCar.position.set(this.state.x, 0, this.state.z);
                        if (this.scene) {
                            this.scene.add(this.playerCar);
                            this.setupCarLightingAndFX();
                        }
                    }
                } catch (e) {
                    console.warn('Could not build immediate procedural model:', e);
                }
            }
        }

        setupCarLightingAndFX() {
            const THREE = this.THREE;
            if (!this.playerCar) return;

            try {
                this.playerCar.updateMatrixWorld(true);
                if (this.playerHeadlights) {
                    this.playerHeadlights.forEach(hl => {
                        try {
                            if (hl.target && hl.target.parent) hl.target.parent.remove(hl.target);
                            if (hl.parent) hl.parent.remove(hl);
                        } catch (_) {}
                    });
                }
                if (this.playerBrakeLight && this.playerBrakeLight.parent) {
                    try { this.playerBrakeLight.parent.remove(this.playerBrakeLight); } catch (_) {}
                }
                if (this.playerNitroLight && this.playerNitroLight.parent) {
                    try { this.playerNitroLight.parent.remove(this.playerNitroLight); } catch (_) {}
                }
                if (this.playerBackfireLight && this.playerBackfireLight.parent) {
                    try { this.playerBackfireLight.parent.remove(this.playerBackfireLight); } catch (_) {}
                }
                if (this.playerNitroFlames && this.playerNitroFlames.length > 0) {
                    this.playerNitroFlames.forEach(f => {
                        try {
                            if (f.parent) f.parent.remove(f);
                            if (f.geometry) f.geometry.dispose();
                            if (f.material) f.material.dispose();
                        } catch (_) {}
                    });
                }
                if (this.playerBackfireFlames && this.playerBackfireFlames.length > 0) {
                    this.playerBackfireFlames.forEach(bf => {
                        try {
                            if (bf.parent) bf.parent.remove(bf);
                            if (bf.geometry) bf.geometry.dispose();
                            if (bf.material) bf.material.dispose();
                        } catch (_) {}
                    });
                }

                // Compute bounds of player model (excluding accessories/interactive rig)
                const box = new THREE.Box3();
                if (this.playerCar.userData && this.playerCar.userData.baseBoundingBox && !this.playerCar.userData.baseBoundingBox.isEmpty()) {
                    box.copy(this.playerCar.userData.baseBoundingBox);
                } else {
                    this.playerCar.traverse(c => {
                        if (!c.isMesh || !c.geometry) return;
                        if (isIgnoredAccessoryOrRigNode(c, this.playerCar)) return;
                        if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
                        if (c.geometry.boundingBox && !c.geometry.boundingBox.isEmpty()) {
                            const wb = c.geometry.boundingBox.clone().applyMatrix4(c.matrixWorld);
                            wb.min.sub(this.playerCar.position);
                            wb.max.sub(this.playerCar.position);
                            box.union(wb);
                        }
                    });
                    if (box.isEmpty()) {
                        box.setFromObject(this.playerCar);
                    }
                }
                const size = box.getSize(new THREE.Vector3());
                const halfL = (size.z || 4.4) * 0.5;
                const halfW = (size.x || 1.9) * 0.5;

                // 1. Two forward Headlight Beams
                this.playerHeadlights = [];
                const carId = identifyCarModel(this.carName);
                const lightPos = detectVehicleLightPositions(this.playerCar, carId, THREE);
                const localHlL = lightPos.hlL.clone();
                const localHlR = lightPos.hlR.clone();
                this.playerCar.worldToLocal(localHlL);
                this.playerCar.worldToLocal(localHlR);

                const activeWeatherPreset = this.getWeatherPreset(this.currentActiveWeather || 'night');
                const hlIntensity = (activeWeatherPreset && typeof activeWeatherPreset.headlightIntensity === 'number') ? activeWeatherPreset.headlightIntensity : 2.0;
                const hlDistance = (activeWeatherPreset && typeof activeWeatherPreset.headlightDistance === 'number') ? activeWeatherPreset.headlightDistance : 52;

                [-1, 1].forEach(side => {
                    // Subtle, realistic Three.js SpotLight angled forward down the road
                    const hlSpot = new THREE.SpotLight(0xf8fafc, hlIntensity, hlDistance, Math.PI / 6.5, 0.55, 1.2);
                    const localP = side < 0 ? localHlL : localHlR;
                    hlSpot.position.copy(localP);
                    hlSpot.target.position.set(localP.x * 1.05, 0.15, localP.z + 32);
                    this.playerCar.add(hlSpot);
                    this.playerCar.add(hlSpot.target);
                    this.playerHeadlights.push(hlSpot);
                });

                // 2. Taillight Braking Emissive Glow & Dynamic Brake Point Light
                this.playerTaillights = [];
                this.playerCar.traverse(child => {
                    if (isIgnoredAccessoryOrRigNode(child, this.playerCar)) return;
                    if (child.isMesh && child.material) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        mats.forEach(m => {
                            const mName = String(m.name || '').toLowerCase();
                            const nName = String(child.name || '').toLowerCase();
                            if (mName.includes('taillight') || mName.includes('brake') || mName.includes('lights_red') ||
                                nName.includes('taillight') || nName.includes('tail_light') || nName.includes('lights_red') || nName.includes('obj_tail_light')) {
                                this.playerTaillights.push({ mesh: child, material: m });
                            }
                        });
                    }
                });

                // Dynamic rear brake glow light (casts authentic red glow onto road and bumper when braking, zero floating boxes)
                const localTlL = lightPos.tlL.clone();
                const localTlR = lightPos.tlR.clone();
                this.playerCar.worldToLocal(localTlL);
                this.playerCar.worldToLocal(localTlR);
                const localTlMid = localTlL.clone().lerp(localTlR, 0.5);

                this.playerBrakeLight = new THREE.PointLight(0xdc2626, 0.2, 5.0, 1.5);
                this.playerBrakeLight.position.set(0, localTlMid.y, localTlMid.z - 0.04);
                this.playerCar.add(this.playerBrakeLight);

                // 3. Streamlined Subtle Nitro Exhaust Flame Meshes & Dynamic Road Light (with custom N2O color)
                this.playerNitroFlames = [];
                const exhaustY = Math.max(0.18, Math.min(0.28, (size.y || 1.4) * 0.16));
                const exhaustSpanX = (carId === 'vaz2107' || carId === 'vaz2109') ? halfW * 0.34 : halfW * 0.40;
                const exhaustZ = -halfL - 0.04;
                const nitroColorMap = {
                    blue: 0x00d4ff,
                    purple: 0xa855f7,
                    emerald: 0x10b981,
                    crimson: 0xef4444,
                    gold: 0xf59e0b
                };
                const rawNitroCol = this.styling && this.styling.nitroColor;
                const nitroFlameHex = nitroColorMap[rawNitroCol] || parseColor(rawNitroCol, 0x00d4ff);

                [-1, 1].forEach(side => {
                    // Outer streamlined nitro flame jet
                    const flameGeo = new THREE.ConeGeometry(0.042, 0.38, 16);
                    flameGeo.rotateX(-Math.PI / 2);
                    const flameMat = new THREE.MeshBasicMaterial({
                        color: nitroFlameHex,
                        transparent: true,
                        opacity: 0.70,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });
                    const flame = new THREE.Mesh(flameGeo, flameMat);
                    flame.position.set(side * exhaustSpanX, exhaustY, exhaustZ - 0.14);
                    flame.visible = false;
                    this.playerCar.add(flame);
                    this.playerNitroFlames.push(flame);

                    // Inner intense white-hot ignition core
                    const coreGeo = new THREE.ConeGeometry(0.022, 0.22, 16);
                    coreGeo.rotateX(-Math.PI / 2);
                    const coreMat = new THREE.MeshBasicMaterial({
                        color: 0xffffff,
                        transparent: true,
                        opacity: 0.90,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });
                    const core = new THREE.Mesh(coreGeo, coreMat);
                    core.position.set(side * exhaustSpanX, exhaustY, exhaustZ - 0.08);
                    core.visible = false;
                    this.playerCar.add(core);
                    this.playerNitroFlames.push(core);
                });

                this.playerNitroLight = new THREE.PointLight(nitroFlameHex, 0, 5.0, 2.0);
                this.playerNitroLight.position.set(0, exhaustY + 0.08, exhaustZ - 0.20);
                this.playerCar.add(this.playerNitroLight);

                // 4. Compact Exhaust Backfire Flame Pops & Road Flash Light
                this.playerBackfireFlames = [];
                [-1, 1].forEach(side => {
                    const bfGeo = new THREE.ConeGeometry(0.048, 0.30, 16);
                    bfGeo.rotateX(-Math.PI / 2);
                    const bfMat = new THREE.MeshBasicMaterial({
                        color: 0xff6a00,
                        transparent: true,
                        opacity: 0.75,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });
                    const bf = new THREE.Mesh(bfGeo, bfMat);
                    bf.position.set(side * exhaustSpanX, exhaustY, exhaustZ - 0.10);
                    bf.visible = false;
                    this.playerCar.add(bf);
                    this.playerBackfireFlames.push(bf);
                });

                this.playerBackfireLight = new THREE.PointLight(0xff7700, 0, 4.5, 2.0);
                this.playerBackfireLight.position.set(0, exhaustY + 0.08, exhaustZ - 0.16);
                this.playerCar.add(this.playerBackfireLight);

                // 5. Glowing Brake Discs Collection (with non-intrusive thermal glow fallback)
                const oldHelperMeshes = [];
                this.playerCar.traverse(child => {
                    if (child.name && (child.name.startsWith('BrakeDiscGlowMesh_') || child.name === 'ActiveAeroSpoiler')) {
                        oldHelperMeshes.push(child);
                    }
                });
                oldHelperMeshes.forEach(m => { if (m.parent) m.parent.remove(m); });

                this.playerBrakeDiscs = [];
                this.playerCar.traverse(child => {
                    if (!child.isMesh || !child.material) return;
                    const n = String(child.name || '').toLowerCase();
                    if (n.includes('wheel_disc') || n.includes('wheel_disk') || n.includes('wheel00') || n.includes('light') || n.includes('glass')) return;
                    if (
                        (child.userData && child.userData.isBrakeRotor) ||
                        child.name.includes('BrakeDisc') ||
                        n.includes('brakedisc') ||
                        n.includes('brake_disc') ||
                        n.includes('hub_brake_disc') ||
                        n.includes('brakerotor') ||
                        n.includes('rotor') ||
                        (child.parent && child.parent.name === 'BrakeCaliperGroup')
                    ) {
                        if (typeof child.material.clone === 'function' && !child.userData._clonedRotorMat) {
                            child.material = child.material.clone();
                            child.userData._clonedRotorMat = true;
                        }
                        if (!child.material.emissive && THREE.Color) {
                            child.material.emissive = new THREE.Color(0xff3300);
                            child.material.emissiveIntensity = 0;
                        }
                        this.playerBrakeDiscs.push(child);
                    }
                });
                if (this.playerBrakeDiscs.length < 4) {
                    const discGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16);
                    discGeo.rotateZ(Math.PI / 2);
                    const wheelCoords = [
                        [-halfW * 0.82, 0.32, halfL * 0.60],
                        [halfW * 0.82, 0.32, halfL * 0.60],
                        [-halfW * 0.82, 0.32, -halfL * 0.60],
                        [halfW * 0.82, 0.32, -halfL * 0.60]
                    ];
                    wheelCoords.forEach((pos, idx) => {
                        const discMat = new THREE.MeshStandardMaterial({
                            color: 0x334155,
                            roughness: 0.35,
                            metalness: 0.85,
                            transparent: true,
                            opacity: 0,
                            depthWrite: false,
                            emissive: new THREE.Color(0xff3300),
                            emissiveIntensity: 0
                        });
                        const discMesh = new THREE.Mesh(discGeo, discMat);
                        discMesh.name = 'BrakeDiscGlowMesh_' + idx;
                        discMesh.userData = { isFallbackGlowDisc: true };
                        discMesh.position.set(pos[0], pos[1], pos[2]);
                        this.playerCar.add(discMesh);
                        this.playerBrakeDiscs.push(discMesh);
                    });
                }

                // 6. Active Aero Spoiler / Air-Brake Flaps (with deployable active wing fallback)
                this.playerActiveAero = [];
                if(!window.NOMERA_AUTHORS_PREVIEW)this.playerCar.traverse(child => {
                    const n = String(child.name || '').toLowerCase();
                    if (child.isMesh && (n.includes('spoiler') || n.includes('wing') || n.includes('aero_wing'))) {
                        this.playerActiveAero.push({
                            mesh: child,
                            baseRotX: child.rotation.x,
                            basePosY: child.position.y
                        });
                    }
                });
                if (!window.NOMERA_AUTHORS_PREVIEW && this.playerActiveAero.length === 0) {
                    const aeroWingGeo = new THREE.BoxGeometry(halfW * 1.45, 0.03, 0.22);
                    const aeroWingMat = new THREE.MeshStandardMaterial({
                        color: 0x111827,
                        roughness: 0.28,
                        metalness: 0.75,
                        transparent: true,
                        opacity: 0,
                        depthWrite: false
                    });
                    const aeroWingMesh = new THREE.Mesh(aeroWingGeo, aeroWingMat);
                    aeroWingMesh.name = 'ActiveAeroSpoiler';
                    aeroWingMesh.position.set(0, 0.92, -halfL * 0.88);
                    this.playerCar.add(aeroWingMesh);
                    this.playerActiveAero.push({
                        mesh: aeroWingMesh,
                        baseRotX: 0,
                        basePosY: 0.92
                    });
                }

                // 7. Hypersonic 300+ km/h Twin Fire Trails («Огненный след»)
                this.playerFireTrails = [];
                [-1, 1].forEach((side, idx) => {
                    const trailGroup = new THREE.Group();
                    trailGroup.name = 'HypersonicFireTrail_' + idx;
                    const outerGeo = new THREE.PlaneGeometry(0.28, 4.8);
                    outerGeo.rotateX(-Math.PI / 2);
                    const outerMat = new THREE.MeshBasicMaterial({
                        color: 0xff5500,
                        transparent: true,
                        opacity: 0.85,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false,
                        side: THREE.DoubleSide
                    });
                    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
                    outerMesh.name = 'FireTrailOuter';
                    trailGroup.add(outerMesh);

                    const coreGeo = new THREE.PlaneGeometry(0.14, 4.2);
                    coreGeo.rotateX(-Math.PI / 2);
                    const coreMat = new THREE.MeshBasicMaterial({
                        color: 0xfef08a,
                        transparent: true,
                        opacity: 0.92,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false,
                        side: THREE.DoubleSide
                    });
                    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
                    coreMesh.position.y = 0.005;
                    coreMesh.name = 'FireTrailCore';
                    trailGroup.add(coreMesh);

                    trailGroup.position.set(side * halfW * 0.74, 0.04, exhaustZ - 2.45);
                    trailGroup.visible = false;
                    trailGroup.userData = { outerMat, coreMat, side };
                    this.playerCar.add(trailGroup);
                    this.playerFireTrails.push(trailGroup);
                });

                // 8. 1st-Person 3D Cockpit Interior Rig
                this.buildCockpitRig();

                // 4. Underglow Neon (if player has neon tuning)
                const neonVal = this.styling.neon;
                if (neonVal && neonVal !== 'none' && !(window.NOMERA_AUTHORS_PREVIEW&&window.NomeraVehicleFinish)) {
                    const col = parseColor(neonVal, 0x00f0ff);
                    let neonTexture = null;
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = 128;
                        canvas.height = 128;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
                            const cObj = new THREE.Color(col);
                            const r = Math.round(cObj.r * 255), g = Math.round(cObj.g * 255), b = Math.round(cObj.b * 255);
                            grad.addColorStop(0, `rgba(${r},${g},${b},0.85)`);
                            grad.addColorStop(0.35, `rgba(${r},${g},${b},0.45)`);
                            grad.addColorStop(0.70, `rgba(${r},${g},${b},0.12)`);
                            grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
                            ctx.fillStyle = grad;
                            ctx.fillRect(0, 0, 128, 128);
                            neonTexture = new THREE.CanvasTexture(canvas);
                        }
                    } catch (_) {}

                    const neonDiscGeo = new THREE.PlaneGeometry(halfW * 2.2, halfL * 2.0);
                    neonDiscGeo.rotateX(-Math.PI / 2);
                    const neonDiscMat = new THREE.MeshBasicMaterial({
                        color: col,
                        map: neonTexture,
                        transparent: true,
                        opacity: 0.75,
                        depthWrite: false,
                        blending: THREE.AdditiveBlending
                    });
                    const neonMesh = new THREE.Mesh(neonDiscGeo, neonDiscMat);
                    neonMesh.position.set(0, 0.03, 0);
                    this.playerCar.add(neonMesh);

                    // Authentic ground bounce illumination
                    const neonPointLight = new THREE.PointLight(col, 1.6, 4.5, 1.8);
                    neonPointLight.position.set(0, 0.20, 0);
                    this.playerNeonLight = neonPointLight;
                    this.playerNeonMesh = neonMesh;
                    this.playerCar.add(neonPointLight);
                }

                // 5. Roof SGU Flasher Strobe Light removed per user request: "убери все мигалки которые можно ставить на машину, они только мешают"
                this.playerSguLight = null;

                // Find wheel spinner objects inside player car (ONLY dedicated validated wheel spinners)
                this.playerWheels = [];
                this.playerSteerWheels = [];
                this.playerCar.traverse(c => {
                    if (c.userData && c.userData.isWheelSpinner) {
                        this.playerWheels.push(c);
                    }
                    if (c.userData && c.userData.isSteerable) {
                        this.playerSteerWheels.push(c);
                    }
                });

                if (this.vfx && typeof this.vfx.onCarLoaded === 'function') {
                    this.vfx.onCarLoaded(this.playerCar);
                }
            } catch (err) {
                console.warn('setupCarLightingAndFX non-critical error:', err);
            }
        }

        buildCockpitRig() {
            if(window.NOMERA_AUTHORS_PREVIEW&&window.NomeraDriverCamera)return window.NomeraDriverCamera.prepare(this,this.playerCar);
            const THREE = this.THREE;
            if (!THREE || !this.playerCar) return;
            if (this.cockpitGroup && this.cockpitGroup.parent) {
                this.cockpitGroup.parent.remove(this.cockpitGroup);
            }

            // Note: In Three.js looking forward along +Z, +X is SCREEN LEFT (driver side) and -X is SCREEN RIGHT (passenger side)
            const driverX = 0.32;
            const cockpit = new THREE.Group();
            cockpit.name = 'CockpitInteriorRig';

            const alcantaraMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.78, metalness: 0.15 });
            const leatherMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.25 });
            const carbonMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.30, metalness: 0.75 });
            const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.92 });
            const bodyHex = parseColor((this.styling && this.styling.color) || '#2563eb', 0x2563eb);
            const hoodPaintMat = new THREE.MeshStandardMaterial({ color: bodyHex, roughness: 0.22, metalness: 0.72 });

            // 0. Interior Cabin Illumination (so steering wheel, spokes, and dashboard are clearly lit at night/tunnels)
            if (THREE.PointLight) {
                const cabinLight = new THREE.PointLight(0xe2e8f0, 0.95, 2.5);
                cabinLight.name = 'CockpitCabinLight';
                cabinLight.position.set(driverX, 1.16, 0.12);
                cockpit.add(cabinLight);
            }

            // 1. Sculpted Exterior Front Hood & Fender Ridges (visible beyond the windshield)
            const hoodMesh = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.06, 1.15), hoodPaintMat);
            hoodMesh.name = 'CockpitHood';
            hoodMesh.position.set(0, 0.78, 1.46);
            hoodMesh.rotation.x = 0.08;
            cockpit.add(hoodMesh);

            const fenderGeo = new THREE.BoxGeometry(0.16, 0.075, 1.10);
            const fenderL = new THREE.Mesh(fenderGeo, hoodPaintMat);
            fenderL.name = 'CockpitFenderL';
            fenderL.position.set(0.72, 0.80, 1.44);
            fenderL.rotation.x = 0.07;
            cockpit.add(fenderL);

            const fenderR = new THREE.Mesh(fenderGeo, hoodPaintMat);
            fenderR.name = 'CockpitFenderR';
            fenderR.position.set(-0.72, 0.80, 1.44);
            fenderR.rotation.x = 0.07;
            cockpit.add(fenderR);

            // 2. Sculpted Dashboard Cowl, Ambient LED Trim & Driver Instrument Binnacle
            const dashCowl = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.22, 0.52), alcantaraMat);
            dashCowl.name = 'CockpitDashCowl';
            dashCowl.position.set(0, 0.75, 0.82);
            cockpit.add(dashCowl);

            const ambientMat = new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: new THREE.Color(0x38bdf8),
                emissiveIntensity: 1.6
            });
            const ambientStrip = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.008, 0.015), ambientMat);
            ambientStrip.name = 'CockpitAmbientStrip';
            ambientStrip.position.set(0, 0.855, 0.56);
            cockpit.add(ambientStrip);

            const binnacle = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.14, 0.24), carbonMat);
            binnacle.name = 'CockpitBinnacle';
            binnacle.position.set(driverX, 0.87, 0.72);
            cockpit.add(binnacle);

            // Live Canvas Digital Instrument Cluster (Speed, Gear, RPM bar)
            let dashTex = null;
            this._cockpitDashCanvas = null;
            this._cockpitDashCtx = null;
            this._lastCockpitDashSpeed = -1;
            this._lastCockpitDashGear = -1;
            try {
                if (typeof document !== 'undefined') {
                    const canvas = document.createElement('canvas');
                    canvas.width = 256;
                    canvas.height = 128;
                    const ctx = canvas.getContext('2d');
                    if (ctx && THREE.CanvasTexture) {
                        this._cockpitDashCanvas = canvas;
                        this._cockpitDashCtx = ctx;
                        dashTex = new THREE.CanvasTexture(canvas);
                        this._cockpitDashTexture = dashTex;
                    }
                }
            } catch (_) {}

            const dashGlowMat = new THREE.MeshStandardMaterial({
                color: 0x0f172a,
                map: dashTex || null,
                emissive: new THREE.Color(dashTex ? 0xffffff : 0x38bdf8),
                emissiveMap: dashTex || null,
                emissiveIntensity: dashTex ? 0.95 : 1.4
            });

            const digitalDash = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.125), dashGlowMat);
            digitalDash.name = 'CockpitDigitalDash';
            digitalDash.position.set(driverX, 0.87, 0.595);
            digitalDash.rotation.y = Math.PI;
            cockpit.add(digitalDash);
            this.cockpitDigitalDash = digitalDash;
            this.updateCockpitDashTexture(this.state || { speed: 0, rpm: 1000, maxRpm: 8000, gear: 1 });

            // Center Console Multimedia Display
            const centerScreenMat = new THREE.MeshStandardMaterial({
                color: 0x0f172a,
                emissive: new THREE.Color(0x1e40af),
                emissiveIntensity: 0.9
            });
            const centerScreen = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.025), centerScreenMat);
            centerScreen.name = 'CockpitCenterScreen';
            centerScreen.position.set(-0.06, 0.88, 0.64);
            centerScreen.rotation.y = -0.18;
            cockpit.add(centerScreen);

            // 3. RPM Shift Light Strip (6 LEDs on top of instrument binnacle, left-to-right from +X to -X)
            this.cockpitShiftLights = [];
            const ledGeo = new THREE.BoxGeometry(0.032, 0.015, 0.018);
            for (let i = 0; i < 6; i++) {
                const baseCol = i < 2 ? 0x22c55e : (i < 4 ? 0xf59e0b : 0xef4444);
                const ledMat = new THREE.MeshStandardMaterial({
                    color: 0x1e293b,
                    emissive: new THREE.Color(baseCol),
                    emissiveIntensity: 0.18
                });
                const led = new THREE.Mesh(ledGeo, ledMat);
                led.name = 'CockpitShiftLight_' + i;
                led.position.set((driverX + 0.115) - i * 0.046, 0.948, 0.605);
                led.userData = { baseColor: baseCol, index: i };
                cockpit.add(led);
                this.cockpitShiftLights.push(led);
            }

            // 4. Connected Windshield Frame: Left/Right A-Pillars + Top Roof Header + Rearview Mirror on Stalk
            const pillarGeo = new THREE.BoxGeometry(0.065, 0.78, 0.085);
            const pillarL = new THREE.Mesh(pillarGeo, alcantaraMat);
            pillarL.name = 'CockpitAPillarL';
            pillarL.position.set(0.96, 1.20, 0.62);
            pillarL.rotation.x = -0.46;
            pillarL.rotation.z = 0.16;
            cockpit.add(pillarL);

            const pillarR = new THREE.Mesh(pillarGeo, alcantaraMat);
            pillarR.name = 'CockpitAPillarR';
            pillarR.position.set(-0.68, 1.20, 0.62);
            pillarR.rotation.x = -0.46;
            pillarR.rotation.z = -0.16;
            cockpit.add(pillarR);

            const roofHeader = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.065, 0.22), alcantaraMat);
            roofHeader.name = 'CockpitRoofHeader';
            roofHeader.position.set(0.14, 1.60, 0.44);
            cockpit.add(roofHeader);

            const mirrorStalk = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.10, 0.022), carbonMat);
            mirrorStalk.position.set(-0.02, 1.53, 0.50);
            cockpit.add(mirrorStalk);

            const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.058, 0.030), carbonMat);
            mirrorFrame.name = 'CockpitRearMirror';
            mirrorFrame.position.set(-0.02, 1.47, 0.51);
            mirrorFrame.rotation.y = -0.12;
            const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.046), chromeMat);
            mirrorGlass.position.set(0, 0, -0.016);
            mirrorGlass.rotation.y = Math.PI;
            mirrorFrame.add(mirrorGlass);
            cockpit.add(mirrorFrame);

            // 5. Detailed 3-Spoke Sport Steering Wheel with Paddle Shifters & 12-o'clock Red Stripe
            const wheelGroup = new THREE.Group();
            wheelGroup.name = 'CockpitSteeringWheel';
            wheelGroup.position.set(driverX, 0.82, 0.54);
            wheelGroup.rotation.x = 0.18;

            const rimGeo = new THREE.TorusGeometry ? new THREE.TorusGeometry(0.155, 0.021, 14, 32) : new THREE.CylinderGeometry(0.155, 0.155, 0.028, 20);
            const rimMesh = new THREE.Mesh(rimGeo, leatherMat);
            wheelGroup.add(rimMesh);

            // Steering column shaft connecting wheel to dashboard
            const columnMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.18, 12), alcantaraMat);
            columnMesh.rotation.x = Math.PI / 2;
            columnMesh.position.set(0, -0.01, 0.09);
            wheelGroup.add(columnMesh);

            // Center Airbag Hub & Chrome Emblem Ring
            const hubMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.036, 16), leatherMat);
            hubMesh.rotation.x = Math.PI / 2;
            wheelGroup.add(hubMesh);

            if (THREE.TorusGeometry) {
                const badgeRing = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0035, 8, 20), chromeMat);
                badgeRing.position.set(0, 0, -0.019);
                wheelGroup.add(badgeRing);
            }

            // 3 Sculpted Carbon/Metallic Spokes (Left, Right, Bottom)
            const spokeH = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.026, 0.020), carbonMat);
            spokeH.position.set(0, -0.012, 0);
            wheelGroup.add(spokeH);

            const spokeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.008, 0.022), chromeMat);
            spokeTrim.position.set(0, -0.012, -0.002);
            wheelGroup.add(spokeTrim);

            const spokeV = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.135, 0.020), carbonMat);
            spokeV.position.set(0, -0.082, 0);
            wheelGroup.add(spokeV);

            // Aluminum Shift Paddles (- Left / + Right)
            const paddleGeo = new THREE.BoxGeometry(0.026, 0.075, 0.008);
            const paddleL = new THREE.Mesh(paddleGeo, chromeMat);
            paddleL.name = 'PaddleShifterL';
            paddleL.position.set(0.11, 0.02, 0.022);
            wheelGroup.add(paddleL);

            const paddleR = new THREE.Mesh(paddleGeo, chromeMat);
            paddleR.name = 'PaddleShifterR';
            paddleR.position.set(-0.11, 0.02, 0.022);
            wheelGroup.add(paddleR);

            // 12-o'clock Glowing Red Racing Stripe
            const stripeMat = new THREE.MeshStandardMaterial({
                color: 0xef4444,
                emissive: new THREE.Color(0xef4444),
                emissiveIntensity: 0.95
            });
            const centerStripe = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.044, 0.046), stripeMat);
            centerStripe.name = 'SteeringCenterStripe';
            centerStripe.position.set(0, 0.155, 0);
            wheelGroup.add(centerStripe);

            cockpit.add(wheelGroup);
            this.cockpitSteeringWheel = wheelGroup;

            // 6. Low-Profile Windshield Wipers (tucked flat to the right along cowl when dry, sweeping in rain/snow)
            const wiperMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 });
            const wiperBladeGeo = new THREE.BoxGeometry(0.010, 0.36, 0.010);

            const wiperPivotL = new THREE.Group();
            wiperPivotL.name = 'CockpitWiperL';
            wiperPivotL.position.set(0.44, 0.85, 0.88);
            const bladeL = new THREE.Mesh(wiperBladeGeo, wiperMat);
            bladeL.position.set(0, 0.18, 0);
            wiperPivotL.add(bladeL);
            wiperPivotL.rotation.z = 1.48;
            cockpit.add(wiperPivotL);
            this.cockpitWiperL = wiperPivotL;

            const wiperPivotR = new THREE.Group();
            wiperPivotR.name = 'CockpitWiperR';
            wiperPivotR.position.set(-0.04, 0.85, 0.88);
            const bladeR = new THREE.Mesh(wiperBladeGeo, wiperMat);
            bladeR.position.set(0, 0.18, 0);
            wiperPivotR.add(bladeR);
            wiperPivotR.rotation.z = 1.48;
            cockpit.add(wiperPivotR);
            this.cockpitWiperR = wiperPivotR;

            const isCockpitNow = (this.cameraMode === 4 || this.cameraMode === 'cockpit');
            cockpit.visible = isCockpitNow;
            this.playerCar.add(cockpit);
            this.cockpitGroup = cockpit;
            this.syncCockpitCarVisibility(isCockpitNow);
            return cockpit;
        }

        updateCockpitDashTexture(state) {
            const ctx = this._cockpitDashCtx;
            const tex = this._cockpitDashTexture;
            if (!ctx || !tex || !state) return;
            const spd = Math.round(state.speed || 0);
            const rpmFrac = Math.max(0, Math.min(1, ((state.rpm || 1000) - (state.idleRpm || 1000)) / Math.max(1, (state.maxRpm || 8500) - (state.idleRpm || 1000))));
            const gear = state.gear || (spd < 45 ? 1 : spd < 90 ? 2 : spd < 140 ? 3 : spd < 195 ? 4 : spd < 255 ? 5 : 6);
            if (spd === this._lastCockpitDashSpeed && gear === this._lastCockpitDashGear && Math.abs(rpmFrac - (this._lastCockpitDashRpm || 0)) < 0.04) {
                return;
            }
            this._lastCockpitDashSpeed = spd;
            this._lastCockpitDashGear = gear;
            this._lastCockpitDashRpm = rpmFrac;
            try {
                ctx.fillStyle = '#070b14';
                ctx.fillRect(0, 0, 256, 128);
                // Top RPM bar background
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(16, 12, 224, 14);
                // Active RPM bar
                ctx.fillStyle = rpmFrac > 0.85 ? '#ef4444' : (rpmFrac > 0.65 ? '#f59e0b' : '#38bdf8');
                ctx.fillRect(16, 12, Math.round(224 * rpmFrac), 14);
                // Digital Speed readout
                ctx.fillStyle = '#f8fafc';
                ctx.font = 'bold 54px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(String(spd), 112, 84);
                ctx.fillStyle = '#38bdf8';
                ctx.font = 'bold 14px sans-serif';
                ctx.fillText('KM/H', 112, 108);
                // Gear badge
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(188, 44, 48, 52);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 28px sans-serif';
                ctx.fillText('D' + gear, 212, 80);
                tex.needsUpdate = true;
            } catch (_) {}
        }

        syncCockpitCarVisibility(isCockpit) {
            if(window.NOMERA_AUTHORS_PREVIEW&&window.NomeraDriverCamera)return window.NomeraDriverCamera.sync(this,isCockpit);
            if (!this.playerCar) return;
            if (this.cockpitGroup) {
                this.cockpitGroup.visible = !!isCockpit;
            }
            const isInsideCockpitGroup = (obj) => {
                let p = obj;
                while (p) {
                    if (p === this.cockpitGroup) return true;
                    p = p.parent;
                }
                return false;
            };
            this.playerCar.traverse(child => {
                if (child === this.playerCar || child === this.cockpitGroup) return;
                if (isInsideCockpitGroup(child)) return;
                if (child.isLight) return;
                if (child.isMesh) {
                    child.userData = child.userData || {};
                    if (isCockpit) {
                        if (!child.userData._hiddenForCockpit) {
                            child.userData._savedPreCockpitVisible = child.visible;
                            child.userData._hiddenForCockpit = true;
                        }
                        child.visible = false;
                    } else if (child.userData._hiddenForCockpit) {
                        child.visible = child.userData._savedPreCockpitVisible !== undefined ? child.userData._savedPreCockpitVisible : true;
                        child.userData._hiddenForCockpit = false;
                    }
                }
            });
        }

        stop() {
            this.isRunning = false;
            this.authorsRecoverButton?.remove();this.authorsRecoverButton=null;
            if (this.animFrameId) {
                cancelAnimationFrame(this.animFrameId);
                this.animFrameId = null;
            }
        }

        setKey(key, isDown) {
            if (this.keys.hasOwnProperty(key)) {
                if (key === 'drift' && isDown && !this.keys.drift) {
                    if (this.options.onSound) this.options.onSound('handbrake');
                }
                this.keys[key] = !!isDown;
            }
        }

        toggleSpeedbreaker() {
            if (this.state) {
                this.state.isSpeedbreakerActive = false;
            }
            return false;
        }

        resetKeys() {
            this.authorsSteerInput = 0;
            if(this.mwRoadSteering){
                this.mwRoadSteering=new this.config.physicsKernel.SteeringController();this.state.steerAngle=0;
                if(this.mwLongitudinal){
                    this.mwLongitudinal.mwSteering=this.mwRoadSteering;
                    Object.assign(this.mwLongitudinal.state,{steerInput:0,steerAngleDeg:0,steerAngleRad:0,steerLeftRad:0,steerRightRad:0});
                }
            }
            Object.keys(this.keys).forEach(k => { this.keys[k] = false; });
        }

        setCameraMode(mode) {
            if (typeof mode === 'string') {
                const idx = this.cameraModes.findIndex(m => m.name === mode);
                this.cameraMode = idx >= 0 ? idx : 0;
            } else if (typeof mode === 'number') {
                this.cameraMode = ((mode % this.cameraModes.length) + this.cameraModes.length) % this.cameraModes.length;
            }
            this.syncCockpitCarVisibility(this.cameraMode === 4 || this.cameraMode === 'cockpit');
            this.updateChaseCamera(0.016);
            return this.cameraMode;
        }

        cycleCamera() {
            const curIdx = typeof this.cameraMode === 'number'
                ? this.cameraMode
                : Math.max(0, this.cameraModes.findIndex(m => m.name === this.cameraMode));
            this.cameraMode = (curIdx + 1) % this.cameraModes.length;
            this.syncCockpitCarVisibility(this.cameraMode === 4 || this.cameraMode === 'cockpit');
            this.updateChaseCamera(0.016);
            if (this.options.onSound) this.options.onSound('camera');
            const modeNames = [
                'Вид сзади (Динамический)',
                'Вид сзади (Спортивный)',
                'Капот / Бампер',
                'Вид сверху',
                '🕹️ Салон (От 1-го лица)'
            ];
            if (this.options.onPopup) this.options.onPopup('📷 ' + (modeNames[this.cameraMode] || 'Камера'), '#38bdf8');
            return this.cameraMode;
        }

        addWantedStars(amount, reason = '') {
            const prev = this.state.wantedStars || 0;
            const next = Math.min(5, Math.max(0, prev + amount));
            if(window.NOMERA_AUTHORS_PREVIEW&&this.authorsPursuit){const a=this.authorsPursuit;if(next===prev||prev===0&&a.time<a.quietUntil||prev>0&&a.time-(a.lastStarAt??-100)<12)return;a.lastStarAt=a.time;}
            this.state.wantedStars = next;
            this.state.wantedLevel = next;
            this.state.escapeTimer = 8.0;
            if (next > prev) {
                this.state.isPursuitActive = true;
                if (this.options.onSound) this.options.onSound('siren_start');
                const starStr = '⭐'.repeat(next);
                if (this.options.onPopup) {
                    this.options.onPopup(`🚨 РОЗЫСК: ${starStr} ${reason}!`, '#ef4444');
                }
                if (this.options.onHaptic) this.options.onHaptic('crash');
            }
        }

        clearPursuit() {
            this.state.wantedStars = 0;
            this.state.wantedLevel = 0;
            this.state.escapeTimer = 0;
            this.state.isPursuitActive = false;
            this.state.bustedTimer = 0;
            if (this.options.onSound) this.options.onSound('siren_stop');
            if (this.helicopterLight) {
                try {
                    if (this.helicopterLight.target && this.helicopterLight.target.parent) this.helicopterLight.target.parent.remove(this.helicopterLight.target);
                    if (this.helicopterLight.parent) this.helicopterLight.parent.remove(this.helicopterLight);
                } catch (_) {}
                this.helicopterLight = null;
            }
        }

        loop(timestamp) {
            if (!this.isRunning) return;
            if (typeof document !== 'undefined' && document.hidden) {
                this.animFrameId = requestAnimationFrame(this._loopBound);
                return;
            }
            const now = (typeof timestamp === 'number' && Number.isFinite(timestamp)) ? timestamp : performance.now();
            const dt = Math.min(Math.max(0, (now - (this.lastTime || now)) / 1000), 0.05);
            this.lastTime = now;

            this.update(dt);
            this.render();

            if (this.isRunning) {
                this.animFrameId = requestAnimationFrame(this._loopBound);
            }
        }

        update(rawDt) {
            const state = this.state;
            const keys = this.keys;

            state.isSpeedbreakerActive = false;
            this._wasSpeedbreakerActive = false;
            const dt = rawDt;

            // 3-2-1 Starting Grid Countdown
            if (this.isNfsCircuit && state.racePhase === 'countdown') {
                state.countdownTimer -= rawDt;
                const prevCd = state.countdownText;
                if (state.countdownTimer > 1.2) state.countdownText = '3';
                else if (state.countdownTimer > 0.6) state.countdownText = '2';
                else if (state.countdownTimer > 0.0) state.countdownText = '1';
                else {
                    state.countdownText = '🟢 СТАРТ!';
                    state.racePhase = 'racing';
                    if (this.options && this.options.onSound) this.options.onSound('countdown_go');
                    const isPerfectLaunch = state.rpm >= (state.maxRpm || 7500) * 0.62 && state.rpm <= (state.maxRpm || 7500) * 0.92;
                    if (isPerfectLaunch) {
                        state.speed = 46;
                        state.pitchVelocity = -0.42;
                        state.backfireTimer = 0.22;
                        state.backfireColor = 'blue';
                        if (this.options && this.options.onPopup) {
                            this.options.onPopup('⚡ ИДЕАЛЬНЫЙ СТАРТ! +46 КМ/Ч!', '#10b981');
                        }
                        if (this.options && this.options.onSound) this.options.onSound('backfire');
                    } else {
                        state.speed = 18;
                        if (this.options && this.options.onPopup) {
                            this.options.onPopup('🟢 СТАРТ ГОНКИ!', '#10b981');
                        }
                    }
                }
                if (state.countdownText !== prevCd && state.racePhase === 'countdown') {
                    if (this.options && this.options.onPopup) {
                        this.options.onPopup(`🚦 ${state.countdownText}...`, '#fbbf24');
                    }
                    if (this.options && this.options.onSound) {
                        this.options.onSound('countdown_beep');
                    }
                }
                if (keys.gas) {
                    state.rpm = Math.min((state.maxRpm || 7500) * 0.90, (state.rpm || 1100) + 5200 * rawDt);
                    if (Math.random() < 0.18) {
                        state.backfireTimer = 0.14;
                        state.backfireColor = 'orange';
                    }
                } else {
                    state.rpm = Math.max(state.idleRpm || 1000, (state.rpm || 1100) - 3600 * rawDt);
                }
                this.updateChaseCamera(rawDt);
                this.updateNfsCircuitHud();
                this.notifyHUD();
                return;
            }

            if (this.isNfsCircuit && state.racePhase === 'racing') {
                state.raceTimeSec = (state.raceTimeSec || 0) + rawDt;
                state.lapTimeSec = (state.lapTimeSec || 0) + rawDt;
            }

            if (state.invulnerableTimer > 0) {
                state.invulnerableTimer = Math.max(0, state.invulnerableTimer - dt);
            }

            const hasFuel = state.fuelCurrent === undefined || state.fuelCurrent > 0;
            const authorsDriving = (typeof window !== 'undefined' && window.NOMERA_AUTHORS_PREVIEW) ? window.NomeraAuthorsDriving : null;
            const gasActive = authorsDriving ? authorsDriving.throttle(keys.gas, keys.brake, hasFuel) : !!(keys.gas && hasFuel);
            const nitroActive = !!(keys.nitro && state.nitroLevel > 0 && hasFuel);
            if (!hasFuel) {
                state.targetSpeed = 0;
                state.isNitroActive = false;
                state.nitroActive = false;
            }

            // MW owns the tank/cooldown in its fixed-step engine. The legacy
            // branch retains its existing rates; pickups still edit host level.
            if(!this.mwLongitudinal){
                state.isNitroActive=nitroActive;
                if(nitroActive)state.nitroLevel=Math.max(0,state.nitroLevel-30*dt);
                else if(!keys.nitro&&hasFuel&&state.speed>60)state.nitroLevel=Math.min(100,state.nitroLevel+(state.isDrifting?12:5)*dt);
            }

            // 2. TRANSMISSION, SLIPSTREAM DRAFTING, THROTTLE, ACCELERATION & BRAKING
            let bestSlipstream = 0;
            if (state.speed > 100 && this.trafficCars && this.trafficCars.length > 0) {
                for (let i = 0; i < this.trafficCars.length; i++) {
                    const tCar = this.trafficCars[i];
                    if (!tCar || !tCar.position || tCar.position.y < -500) continue;
                    const tu = tCar.userData || {};
                    if (tu.isWrecked) continue;
                    const tDz = tCar.position.z - state.z;
                    const tDx = Math.abs(state.x - tCar.position.x);
                    if (tDz > 2.0 && tDz < 28.0 && tDx < 1.85) {
                        const distFactor = 1.0 - Math.max(0, (tDz - 4.0) / 24.0);
                        const draftStrength = Math.min(1.0, Math.max(0.18, distFactor));
                        if (draftStrength > bestSlipstream) bestSlipstream = draftStrength;
                    }
                }
            }
            state.isDrafting = bestSlipstream > 0;
            state.slipstreamFactor = bestSlipstream;
            this.isDrafting = state.isDrafting;
            this.slipstreamFactor = state.slipstreamFactor;

            const nitroMult = state.isNitroActive ? 1.25 : 1.0;
            const targetMaxSpeed = state.maxSpeed * nitroMult * (1.0 + bestSlipstream * 0.06);

            let netAccel = 0;
            let brakeBite = 0;
            let handbrakeBite = 0;
            const isHandbrake = !!keys.drift;
            if (this.mwLongitudinal) {
                const physical = this.mwLongitudinal;
                // MW owns its pose and velocity. No road-axis heading magnet,
                // render-rate reintegration, or legacy lateral-speed governor.
                const rawRoadInput=(keys.left?1:0)-(keys.right?1:0);
                physical.state.handbrake=isHandbrake;
                const roadInput=window.NOMERA_AUTHORS_PREVIEW&&window.NomeraTraffic&&this.mode!=='drift'&&!this.isNfsCircuit?window.NomeraTraffic.highwaySteer(rawRoadInput,physical.state):rawRoadInput;
                state.highwaySteerCommand=roadInput;
                physical.state.fuelCurrent = state.fuelCurrent;
                physical.state.nitroLevel = state.nitroLevel;
                physical.state.slipstreamFactor = bestSlipstream;
                physical.setWeather(this.currentActiveWeather || 'night');
                const oldSpeed = state.speed;
                physical.collisionPreviousPose={x:physical.x,y:physical.y,z:physical.z};
                physical.update(dt, { gas: gasActive, brake: keys.brake, steer:roadInput,handbrake: isHandbrake, nitro: keys.nitro });
                // Highway has no reverse lane traversal; circuit retains reverse.
                // Preserve the integrated world velocity through yaw/roll.
                physical.state.gear = Math.max(1, physical.state.gear);
                state.speed = Math.max(0,physical.state.vz) * 3.6;state.x=physical.state.x;state.z=physical.state.z;
                state.nitroLevel=physical.state.nitroLevel;
                state.isNitroActive=physical.state.isNitroActive;
                state.nitroDepleted=physical.state.nitroDepleted;
                state.nosCooldown=physical.state.nosCooldown;
                state.rpm = physical.state.rpm;
                state.idleRpm = physical.profile.idleRpm;
                state.maxRpm = physical.profile.redlineRpm;
                if (state.gear !== physical.state.gear && this.options.onSound) this.options.onSound('backfire');
                state.gear = physical.state.gear;
                netAccel = (state.speed - oldSpeed) / Math.max(.0001, dt);
                brakeBite = keys.brake ? Math.max(0, -netAccel) : 0;
                handbrakeBite = isHandbrake ? Math.max(0, -netAccel) : 0;
            } else {

            // 7-speed automatic gearbox definition
            const gearWindows = [
                { min: 0, max: 62, down: 0 },
                { min: 45, max: 115, down: 38 },
                { min: 92, max: 172, down: 82 },
                { min: 145, max: 235, down: 135 },
                { min: 205, max: 298, down: 195 },
                { min: 270, max: 365, down: 255 },
                { min: 335, max: 550, down: 318 }
            ];

            // Up-shift check
            const curGw = gearWindows[Math.min(gearWindows.length - 1, (state.gear || 1) - 1)];
            if (state.speed > curGw.max && state.gear < gearWindows.length) {
                state.gear++;
                state.shiftShock = 0.12; // brief clutch shift delay
                state.pitchVelocity += 0.38; // punchy forward impulse
                state.backfireTimer = 0.18; // backfire exhaust pop animation
                state.backfireColor = Math.random() < 0.6 ? 'blue' : 'orange';
                if (this.options.onSound) this.options.onSound('backfire');
                if (this.options.onHaptic) this.options.onHaptic('medium');
            } else if (state.speed < curGw.down && state.gear > 1) {
                state.gear--;
                state.rpm = Math.min(state.maxRpm, state.rpm + 1200);
            }

            // Dynamic RPM calculation
            const activeGw = gearWindows[Math.min(gearWindows.length - 1, (state.gear || 1) - 1)];
            const gearProg = Math.min(1.0, Math.max(0.0, (state.speed - activeGw.min) / (activeGw.max - activeGw.min || 1)));
            const targetRpm = state.idleRpm + gearProg * (state.maxRpm - state.idleRpm) * 0.90 + (gasActive ? (state.maxRpm * 0.10) : 0);
            state.rpm = (state.rpm || state.idleRpm) + (targetRpm - (state.rpm || state.idleRpm)) * Math.min(1.0, 16.0 * dt);

            // Shift torque interruption
            const shiftTorque = state.shiftShock > 0 ? 0.35 : 1.0;
            if (state.shiftShock > 0) state.shiftShock = Math.max(0, state.shiftShock - dt);

            // Throttle & Braking (including Handbrake)

            if (isHandbrake) {
                // Handbrake applies strong rear braking force (~85-110 km/h per second deceleration)
                handbrakeBite = 92 + Math.min(18, (state.speed / 100) * 12);
                if (gasActive) {
                    // Holding gas while pulling handbrake: cut / dramatically overpower engine acceleration
                    netAccel = 0;
                }
                if (keys.brake) {
                    const aeroAirBrake = (state.speed > 100) ? Math.pow(state.speed / 120, 2) * 8.0 : 0;
                    brakeBite = 105 + (state.speed / 100) * 20 + aeroAirBrake;
                    const combinedBrake = Math.max(brakeBite, handbrakeBite) + 30;
                    state.speed = Math.max(0, state.speed - combinedBrake * dt);
                } else {
                    state.speed = Math.max(0, state.speed - handbrakeBite * dt);
                }
                if (!state.wasHandbraking && state.speed > 25) {
                    if (this.options.onSound) this.options.onSound('drift');
                }
            } else if (gasActive) {
                state.gasHoldTime = (state.gasHoldTime || 0) + dt;
                // High low-gear wheel torque (hypercar launch feeling)
                const gearTorque = Math.max(0.70, 1.45 - ((state.gear || 1) - 1) * 0.11);
                // Realistic aerodynamic drag (proportional to v^2), reduced by up to 45% when drafting in slipstream
                const aeroDrag = Math.pow(state.speed / 100, 2) * 1.85 * (1.0 - bestSlipstream * 0.45);
                const slipstreamBoost = bestSlipstream * 7.5;
                const rawAccel = state.accel * gearTorque * (state.isNitroActive ? 1.70 : 1.0) * shiftTorque + slipstreamBoost;
                netAccel = Math.max(3.0, rawAccel - aeroDrag);
                state.speed = Math.min(targetMaxSpeed, state.speed + netAccel * dt);
            } else if (keys.brake) {
                if (!state.wasBraking && state.speed > 60) {
                    if (this.options.onSound) this.options.onSound('brake');
                }
                // Air-brake wing adds high-speed aero braking resistance (>100 km/h)
                const aeroAirBrake = (state.speed > 100) ? Math.pow(state.speed / 120, 2) * 8.0 : 0;
                brakeBite = 105 + (state.speed / 100) * 20 + aeroAirBrake;
                state.speed = Math.max(0, state.speed - brakeBite * dt);
            } else {
                // Natural engine braking & aerodynamic coasting drag
                if (state.prevGas && state.speed > 80 && state.gasHoldTime > 0.6) {
                    state.backfireTimer = 0.15;
                    state.backfireColor = 'orange';
                    if (this.options.onSound) this.options.onSound('blowOff');
                }
                const coastingDrag = (9.0 + Math.pow(state.speed / 100, 2) * 4.2) * (1.0 - bestSlipstream * 0.35);
                state.speed = Math.max(0, state.speed - coastingDrag * dt);
            }
            }
            if (!gasActive || isHandbrake) state.gasHoldTime = 0;
            state.prevGas = !!gasActive && !isHandbrake;
            state.wasBraking = !!keys.brake;
            state.wasHandbraking = isHandbrake;

            // 1. NITRO BOOST HANDLING
            if (state.isNitroActive) {

                // High-frequency organic combustion flutter and aerodynamic speed stretch
                const flutterLen = 0.88 + Math.random() * 0.26;
                const flutterW = 0.94 + Math.random() * 0.12;
                const speedStretch = 1.0 + Math.min(0.35, state.speed / 450);

                this.playerNitroFlames.forEach((flame, idx) => {
                    flame.visible = true;
                    const isCore = (idx % 2 === 1);
                    const curW = flutterW * (isCore ? 0.92 : 1.0);
                    const curL = flutterLen * speedStretch * (isCore ? 0.85 : 1.0);
                    flame.scale.set(curW, curW, curL);
                    if (flame.material) {
                        flame.material.opacity = (isCore ? 0.85 : 0.65) * (0.85 + Math.random() * 0.30);
                    }
                });
                if (this.playerNitroLight) {
                    this.playerNitroLight.intensity = 2.0 + Math.random() * 0.7;
                }
                if (Math.random() < 0.25) {
                    this.spawnSparks(state.x + (Math.random() - 0.5) * 0.5, 0.22, state.z - 2.1, 2);
                }
                if (this.options.onSound && Math.random() < 0.2) {
                    this.options.onSound('nitro');
                }
            } else {
                this.playerNitroFlames.forEach(flame => { flame.visible = false; });
                if (this.playerNitroLight) {
                    this.playerNitroLight.intensity = 0;
                }
            }


            // 1. WEIGHT TRANSFER & BODY DYNAMICS (Dynamic Chassis Pitch & Squat)
            // Dynamic chassis pitch (rear squat on hard acceleration, nose dive under heavy braking)
            // Scaled dynamically by instantaneous longitudinal acceleration / brake bite
            let targetPitch = 0.0;
            if (isHandbrake) {
                targetPitch = Math.min(0.055, 0.035 + (handbrakeBite / 120.0) * 0.015);
            } else if (gasActive) {
                targetPitch = -Math.min(0.062, 0.038 + (netAccel / 75.0) * 0.020 + (state.isNitroActive ? 0.012 : 0.0));
            } else if (keys.brake) {
                targetPitch = Math.min(0.072, 0.048 + (brakeBite / 140.0) * 0.020 + (state.speed > 120 ? 0.008 : 0.0));
            } else {
                targetPitch = Math.min(0.012, Math.pow(state.speed / 160, 2) * 0.010);
            }
            const springK = 50.0;
            const damperC = 11.0;
            const pitchForce = (targetPitch - (state.pitchSquat || 0)) * springK - (state.pitchVelocity || 0) * damperC;
            state.pitchVelocity = (state.pitchVelocity || 0) + pitchForce * dt;
            state.pitchSquat = (state.pitchSquat || 0) + state.pitchVelocity * dt;
            state.pitchSquat = Math.max(-0.065, Math.min(0.075, state.pitchSquat));
            state.pitchAngle = state.pitchSquat;
            this.pitchAngle = state.pitchSquat;

            // Aerodynamic high-speed downforce (chassis lowers to ground and stabilizes rear axle)
            state.downforceY = -Math.min(0.038, Math.pow(state.speed / 380, 2) * 0.038);

            // Taillight emissive intensity & dynamic brake light on braking
            const isBraking = !!keys.brake;
            const tlIntensity = isBraking ? 2.8 : 0.35;
            this.playerTaillights.forEach(tl => {
                if (tl.material) tl.material.emissiveIntensity = tlIntensity;
            });
            if (this.playerBrakeLight) {
                this.playerBrakeLight.intensity = isBraking ? 2.8 : 0.2;
            }

            // Dynamic Player Neon Modes (Rainbow / Pulse) during 3D race
            if (this.playerNeonLight && this.styling) {
                if (this.styling.neonMode === 'rainbow') {
                    const hue = ((this.lastTime || 0) * 0.00025) % 1.0;
                    if (!this._tempRainbowColor) this._tempRainbowColor = new this.THREE.Color();
                    const rCol = this._tempRainbowColor.setHSL(hue, 1.0, 0.55);
                    this.playerNeonLight.color = rCol;
                    if (this.playerNeonMesh && this.playerNeonMesh.material) {
                        this.playerNeonMesh.material.color = rCol;
                    }
                } else if (this.styling.neonMode === 'pulse') {
                    const pulse = (Math.sin((this.lastTime || 0) * 0.006) + 1) * 0.5;
                    this.playerNeonLight.intensity = 0.6 + pulse * 2.2;
                }
            }

            // Peak speed tracking
            if (state.speed > state.peakSpeed) {
                state.peakSpeed = state.speed;
            }

            // 3. FORWARD DISPLACEMENT (DISTANCE), BIOME SECTORS & RACE INCOME
            const forwardSpeedMps = state.speed / 3.6;
            const dz = forwardSpeedMps * dt;
            if(!this.mwLongitudinal)state.z += dz;
            state.distanceKm = state.z / 1000;

            // Dynamic Highway Biome Transitions (Highway -> Lefortovo Tunnel -> Cable-Stayed Bridge)
            const detectedBiome = (this.mode === 'drift') ? 'highway' : this.getBiomeForZ(state.z);
            if (detectedBiome !== this.currentBiome) {
                this.currentBiome = detectedBiome;
                state.currentBiome = detectedBiome;
                if (detectedBiome === 'tunnel') {
                    state.backfireTimer = 0.22;
                    state.backfireColor = 'blue';
                    if (this.playerHeadlights) {
                        this.playerHeadlights.forEach(hl => { hl.intensity = 6.2; });
                    }
                    if (this.options && this.options.onPopup) {
                        this.options.onPopup('🚇 ЛЕФОРТОВСКИЙ ТУННЕЛЬ! АКУСТИЧЕСКИЙ ВЫХЛОП!', '#f59e0b');
                    }
                    if (this.options && this.options.onSound) this.options.onSound('backfire');
                } else if (detectedBiome === 'bridge') {
                    if (this.playerHeadlights) {
                        const wp = this.getWeatherPreset(this.currentActiveWeather || 'night');
                        this.playerHeadlights.forEach(hl => { hl.intensity = wp ? wp.headlightIntensity : 4.2; });
                    }
                    if (this.options && this.options.onPopup) {
                        this.options.onPopup('🌉 ВАНТОВЫЙ МОСТ! +15% К СКОРОСТНОМУ ДОХОДУ!', '#38bdf8');
                    }
                } else {
                    if (this.playerHeadlights) {
                        const wp = this.getWeatherPreset(this.currentActiveWeather || 'night');
                        this.playerHeadlights.forEach(hl => { hl.intensity = wp ? wp.headlightIntensity : 4.2; });
                    }
                }
            }
            state.currentBiome = this.currentBiome;

            // Continuous speed earnings on the highway (+15% bonus on Cable-Stayed Bridge)
            const biomeCashMult = (this.currentBiome === 'bridge') ? 1.15 : 1.0;
            if (state.speed > 25) {
                const cashRatePerSec = (state.speed * 4.0) * (state.rewardMult || 1.0) * biomeCashMult;
                state.earnedCash += cashRatePerSec * dt;
            }

            // 3b. HYPERSONIC 300+ KM/H AFTERBURNER & TWIN FIRE TRAILS («Огненный след»)
            const isHypersonicNow = state.speed >= 300;
            state.isHypersonic = isHypersonicNow;
            this.isHypersonic = isHypersonicNow;
            if ((this.hypersonicPopupCooldown || 0) > 0) {
                this.hypersonicPopupCooldown = Math.max(0, this.hypersonicPopupCooldown - dt);
            }
            if (isHypersonicNow) {
                state.hypersonicTime = (state.hypersonicTime || 0) + dt;
                const hyperBonus = 450 * (state.rewardMult || 1.0) * dt;
                state.earnedCash += hyperBonus;
                if ((this.hypersonicPopupCooldown || 0) <= 0) {
                    this.hypersonicPopupCooldown = 8.0;
                    const hyperMsg = '🔥 ОГНЕННЫЙ СЛЕД 300+ КМ/Ч! x1.5 ФОРСАЖ!';
                    if (typeof this.onPopup === 'function') this.onPopup(hyperMsg, '#f97316');
                    else if (this.options && typeof this.options.onPopup === 'function') this.options.onPopup(hyperMsg, '#f97316');
                }
                if (this.playerFireTrails && this.playerFireTrails.length > 0) {
                    const stretch = 1.0 + Math.min(0.65, (state.speed - 300) / 140) + Math.random() * 0.18;
                    const flicker = 0.80 + Math.random() * 0.20;
                    this.playerFireTrails.forEach(trail => {
                        trail.visible = true;
                        trail.scale.set(0.92 + Math.random() * 0.16, 1.0, stretch);
                        const tu = trail.userData || {};
                        if (tu.outerMat) tu.outerMat.opacity = 0.82 * flicker;
                        if (tu.coreMat) tu.coreMat.opacity = 0.94 * flicker;
                    });
                }
                if (Math.random() < 0.35) {
                    this.spawnSparks(state.x + (Math.random() - 0.5) * 1.1, 0.12, state.z - 2.3, 3);
                }
            } else if (this.playerFireTrails && this.playerFireTrails.length > 0) {
                this.playerFireTrails.forEach(trail => { trail.visible = false; });
            }

            this.earnedCash = state.earnedCash;

            // Milestone distance bonus for every full 1 km driven
            const currentKm = Math.floor(state.distanceKm);
            if (!state.lastMilestoneKm) state.lastMilestoneKm = 0;
            if (currentKm > state.lastMilestoneKm) {
                state.lastMilestoneKm = currentKm;
                const kmBonus = Math.round(10000 * (state.rewardMult || 1.0));
                state.earnedCash += kmBonus;
                this.earnedCash = state.earnedCash;
                if (this.options.onPopup) {
                    this.options.onPopup(`🏁 ДИСТАНЦИЯ ${currentKm} КМ! +${kmBonus.toLocaleString('ru-RU')} ₽`, '#10b981');
                }
                if (this.options.onSound) this.options.onSound('cash');
            }

            // 4. REAL FUEL CONSUMPTION
            const fuelNomera = (typeof window !== 'undefined' && window.NomeraRaceEconomy) ? window.NomeraRaceEconomy : null;
            if (fuelNomera && typeof fuelNomera.fuelForFrame === 'function') {
                const burned = fuelNomera.fuelForFrame({
                    speed: state.speed,
                    seconds: dt,
                    consumption: state.fuelConsumption,
                    gas: gasActive,
                    nitro: state.isNitroActive,
                    drafting: !!state.isDrafting
                });
                state.fuelLiters += burned;
                state.fuelCurrent = Math.max(0, state.fuelCurrent - burned);
            }
            if (state.fuelCurrent !== undefined && state.fuelCurrent <= 0 && state.speed <= 5 && !state.crashed && !state.finished) {
                this.isRunning = false;
                this.stop();
                if (this.sound) {
                    if (typeof this.sound.stopEngine === 'function') this.sound.stopEngine();
                    if (typeof this.sound.stopSiren === 'function') this.sound.stopSiren();
                }
                if (typeof this.onGameOver === 'function') this.onGameOver('fuel', this.getState());
                else if (this.options && typeof this.options.onGameOver === 'function') this.options.onGameOver('fuel', this.getState());
                return;
            }

            // 5. STEERING, HANDBRAKE, WEATHER-DEPENDENT TIRE GRIP & DRIFT MECHANICS
            const isDriftMode = (this.mode === 'drift' || (state && state.raceMode === 'drift'));
            const driftMult = state.driftFactor || (isDriftMode ? 1.6 : 1.35);
            const curWeatherPreset = this.getWeatherPreset(this.currentActiveWeather || 'night');
            const baseWeatherGrip = (curWeatherPreset && typeof curWeatherPreset.gripMultiplier === 'number') ? curWeatherPreset.gripMultiplier : 1.0;
            const weatherGrip = state.isSpeedbreakerActive ? Math.min(1.35, baseWeatherGrip * 1.35) : baseWeatherGrip;
            state.weatherGrip = weatherGrip;
            this.weatherGrip = weatherGrip;

            // 4. AERODYNAMICS & TOP SPEED (Downforce stabilizes rear axle at speeds over 200 km/h)
            const speedStability = Math.max(0.68, 1.0 - (state.speed / 380) * 0.32);
            const highSpeedDownforceStabilization = state.speed > 200 ? Math.min(0.35, Math.pow((state.speed - 200) / 160, 1.4) * 0.35) : 0;
            const downforceGripMult = 1.0 + Math.min(0.22, Math.pow(state.speed / 380, 2) * 0.22);
            const lateralMax = (state.handling * 2.8 * speedStability * downforceGripMult) * (isHandbrake ? (1 + (driftMult - 1) * 0.7) : 1.0) * (state.isSpeedbreakerActive ? 1.25 : 1.0);

            let steerInput = 0;
            if (keys.left) steerInput += 1;  // In Three.js with camera facing +Z: +X moves to screen LEFT
            if (keys.right) steerInput -= 1; // -X moves to screen RIGHT
            if (this.mwRoadSteering) {
                this.mwRoadSteering=this.mwLongitudinal.mwSteering;
                const turn={angleDeg:this.mwRoadSteering.angle,maxSteerDeg:this.mwRoadSteering.lastMaximum};
                steerInput=turn.angleDeg/Math.max(1,turn.maxSteerDeg);
                this.authorsSteerInput=steerInput;
            } else if (authorsDriving) {
                this.authorsSteerInput = authorsDriving.steer(this.authorsSteerInput, steerInput, dt);
                steerInput = this.authorsSteerInput;
            }

            // Steering authority: tied to forward rolling motion and throttle. Car cannot steer sideways on the spot when stationary!
            const speedSteerAuthority = Math.min(1.0, Math.max(0, state.speed / 18));
            const throttleSteerAuthority = gasActive ? 1.0 : (state.speed > 5 ? Math.min(1.0, 0.40 + (state.speed / 50) * 0.60) : 0);
            const effectiveSteerAuthority = speedSteerAuthority * throttleSteerAuthority * (state.isSpeedbreakerActive ? 1.45 : 1.0);

            // 2. TIRE GRIP & SLIP ANGLE (Pacejka-inspired curve scaled by weather grip)
            // Kinematic travel heading vs steering wheel angle
            const travelHeading = Math.atan2(state.vx, Math.max(2.5, forwardSpeedMps));
            const steerAngleRad = this.mwRoadSteering ? this.mwRoadSteering.angle * Math.PI/180 : steerInput*.32;
            const slipAngle = steerAngleRad - travelHeading;

            // Pacejka Magic Formula normalized lateral curve: Fy = D * sin(C * atan(B*a - E*(B*a - atan(B*a))))
            const B_pacejka = 9.5 * weatherGrip;
            const C_pacejka = 1.35;
            const D_pacejka = weatherGrip;
            const E_pacejka = -0.12;
            const Ba = B_pacejka * slipAngle;
            const pacejkaGrip = D_pacejka * Math.sin(C_pacejka * Math.atan(Ba - E_pacejka * (Ba - Math.atan(Ba))));
            state.pacejkaGrip = pacejkaGrip;

            const isSteeringNeutral = (steerInput === 0);
            const hasLateralSlide = Math.abs(state.vx) > (1.2 * weatherGrip) && state.speed > 30;
            const isCounterSteering = this.mwLongitudinal ? this.mwLongitudinal.state.isCounterSteering : state.vx * steerInput < 0;
            const isWetSlide = (weatherGrip < 0.88 && Math.abs(steerInput) > 0 && state.speed > 95 && Math.abs(state.vx) > lateralMax * 0.62);
            const isDriftingNow = this.mwLongitudinal ? this.mwLongitudinal.state.isDrifting : (isHandbrake && (Math.abs(steerInput) > 0 || hasLateralSlide)) || (state.isDrifting && hasLateralSlide) || isWetSlide;
            if(this.mwLongitudinal){
                state.driftAngle=this.mwLongitudinal.state.chassisSlipAngle;
                state.tractionControl=this.mwLongitudinal.state.tractionControl;
                state.driftControl=this.mwLongitudinal.state.driftControl;
            }

            // Cornering stiffness factor scales with weatherGrip and Pacejka tire saturation curve
            const pacejkaSaturation = Math.abs(slipAngle) > 0.01
                ? Math.min(1.15, Math.max(0.65, Math.abs(pacejkaGrip) / Math.min(1.0, Math.abs(slipAngle) * 3.5)))
                : 1.0;
            const corneringStiffness = (0.55 + 0.45 * weatherGrip) * (0.85 + 0.15 * pacejkaSaturation);

            if (this.mwLongitudinal) {
                const previousVx=state.vx;
                state.vx=this.mwLongitudinal.state.vx;
                state.authorsLateralAccel=(state.vx-previousVx)/Math.max(.0001,dt);
            } else if (authorsDriving && !isDriftingNow && !isHandbrake) {
                state.vx = authorsDriving.lateral(state.vx, steerInput, state.speed, lateralMax, effectiveSteerAuthority, weatherGrip, dt);
            } else if (steerInput !== 0 && effectiveSteerAuthority > 0) {
                state.vx += steerInput * lateralMax * 4.2 * effectiveSteerAuthority * corneringStiffness * dt;
                state.vx = Math.max(-lateralMax, Math.min(lateralMax, state.vx));
            } else if (!isDriftingNow && !isHandbrake) {
                // High-speed straight-line directional stability: damp lateral velocity rapidly and eliminate wandering
                const straightLineDamping = ((effectiveSteerAuthority < 0.05) ? 16.0 : (12.0 + Math.min(10.0, (state.speed / 100) * 5.0))) * weatherGrip;
                state.vx *= Math.max(0, 1 - straightLineDamping * dt);
                if (Math.abs(state.vx) < 0.015) {
                    state.vx = 0;
                }
            } else {
                const lateralDecay = (effectiveSteerAuthority < 0.05 ? 14.0 : 7.5) * weatherGrip;
                state.vx *= Math.max(0, 1 - lateralDecay * dt);
            }

            // High-speed aerodynamic stabilization: dampens high-speed lateral twitchiness above 200 km/h
            if (!this.mwLongitudinal && highSpeedDownforceStabilization > 0 && isSteeringNeutral && !isHandbrake) {
                state.vx *= Math.max(0, 1 - highSpeedDownforceStabilization * 4.2 * dt);
                if (Math.abs(state.vx) < 0.01) state.vx = 0;
            }

            // Dynamic Touge, NFS Circuit & Highway curves
            this.curveTimer = (this.curveTimer !== undefined ? this.curveTimer : 0.3) - dt;
            if (isDriftMode && Math.abs(this.targetRoadCurve || 0) < 0.1) {
                this.curveTimer = 0;
            }
            if (this.curveTimer <= 0) {
                if (isDriftMode) {
                    // Continuous S-curves & hairpins in drift mode: short transitions (0.8s-1.6s), NO straight sections
                    this.curveTimer = 0.8 + Math.random() * 0.8;
                    const prevSign = this.targetRoadCurve > 0 ? 1 : (this.targetRoadCurve < 0 ? -1 : (Math.random() < 0.5 ? 1 : -1));
                    const nextSign = (Math.random() < 0.75) ? -prevSign : prevSign;
                    if (nextSign > 0) this.targetRoadCurve = 1.6 + Math.random() * 1.2;
                    else this.targetRoadCurve = -(1.6 + Math.random() * 1.2);
                    this.targetCurvature = nextSign * (0.0050 + Math.random() * 0.0060);
                } else if (this.isNfsCircuit && this.nfsTrackMeta) {
                    this.curveTimer = 2.2 + Math.random() * 1.8;
                    const amp = this.nfsTrackMeta.curveAmp || 1.2;
                    const wave = Math.sin(state.z * 0.0045) + 0.5 * Math.cos(state.z * 0.0095);
                    this.targetRoadCurve = Math.abs(wave) > 0.35 ? wave * amp * 0.65 : 0;
                    this.targetCurvature = this.targetRoadCurve * 0.0022;
                } else {
                    this.curveTimer = 3.5 + Math.random() * 3.0;
                    // In highway mode, eliminate arbitrary random lateral pushing on straight sections
                    this.targetRoadCurve = 0;
                    this.targetCurvature = 0;
                }
            }
            const curveRate = isDriftMode ? 4.2 : (this.isNfsCircuit ? 2.4 : 1.2);
            this.roadCurve = (this.roadCurve || 0) + (this.targetRoadCurve - (this.roadCurve || 0)) * Math.min(1.0, curveRate * dt);
            this.roadCurvature = (this.roadCurvature || 0) + ((this.targetCurvature || 0) - (this.roadCurvature || 0)) * Math.min(1.0, curveRate * dt);
            if (!isDriftMode && !this.isNfsCircuit && Math.abs(this.roadCurve) < 0.01) {
                this.roadCurve = 0;
                this.roadCurvature = 0;
            }
            state.roadCurve = this.roadCurve;
            state.targetRoadCurve = this.targetRoadCurve;
            state.roadCurvature = this.roadCurvature;
            state.targetCurvature = this.targetCurvature || 0;
            state.curveTimer = this.curveTimer;

            // Apply centrifugal push in drift mode when actively steering or drifting
            if (!this.mwLongitudinal && isDriftMode && Math.abs(this.roadCurve) > 0.15 && (steerInput !== 0 || isDriftingNow)) {
                const centrifugal3D = -this.roadCurve * (state.speed / 105) * 8.2 * dt;
                state.vx += centrifugal3D;
            } else if (!this.mwLongitudinal && this.isNfsCircuit && Math.abs(this.roadCurve) > 0.25 && state.speed > 90 && !state.isSpeedbreakerActive) {
                const circuitCentrifugal = -this.roadCurve * (state.speed / 195) * 2.4 * dt;
                state.vx += circuitCentrifugal;
            }

            if (isDriftingNow) {
                state.isDrifting = true;
                state.driftDuration += dt;
                state.driftCombo = Math.min(5, 1 + Math.floor(state.driftDuration / 1.8));
                if (state.driftCombo > (state.maxDriftCombo || 1)) {
                    state.maxDriftCombo = state.driftCombo;
                }

                // Realistic slip-angle yaw: smoothly rotate body into drift direction (deeper slip angles in wet/icy weather)
                const slipRatio = Math.max(-1, Math.min(1, state.vx / (lateralMax || 1)));
                const weatherSlipMult = 1.0 + (1.0 - weatherGrip) * 0.85;
                const baseDriftAngle = slipRatio * 0.52 * weatherSlipMult; // car angles into the slide (+X yaw > 0 points to screen left)
                // Counter-steer adjustment: nose aligns slightly with counter-steer
                const targetYaw = this.mwLongitudinal ? this.mwLongitudinal.heading : baseDriftAngle + (isCounterSteering ? steerInput * 0.12 : 0);
                state.yawAngle += (targetYaw - state.yawAngle) * Math.min(1, 10 * dt);

                let driftMultiplier = state.driftCombo;
                if (isCounterSteering) driftMultiplier *= 1.5;

                const driftRate = Math.round((state.speed * 0.32) * (Math.abs(state.vx) / lateralMax) * 22 * driftMultiplier * dt);
                state.driftCurrentScore += driftRate;
                state.driftScore += driftRate;

                // Tire smoke particles
                this.spawnDriftSmoke(dt);

                if (this.options.onSound && Math.random() < 0.25) {
                    this.options.onSound('drift');
                }
            } else {
                state.isDrifting = false;
                // Return nose forward smoothly when exiting drift or steering normally
                if (isSteeringNeutral) {
                    // Straight-line heading lock: keep car aligned dead forward along road Z axis
                    const alignRate = (14.0 + Math.min(8.0, (state.speed / 100) * 4.0)) * weatherGrip;
                    state.yawAngle += (0 - state.yawAngle) * Math.min(1.0, alignRate * dt);
                    if (Math.abs(state.yawAngle) < 0.0008) state.yawAngle = 0;
                } else {
                    const weatherSlipMult = 1.0 + (1.0 - weatherGrip) * 0.75;
                    const normalTurnYaw = this.mwLongitudinal ? this.mwLongitudinal.heading : steerInput * Math.min(0.24 * weatherSlipMult, (Math.abs(state.vx) / lateralMax) * 0.18 * weatherSlipMult);
                    state.yawAngle += (normalTurnYaw - state.yawAngle) * Math.min(1, 8 * dt);
                }
                if (state.driftDuration > 0 || state.driftCurrentScore > 0) {
                    if (state.driftCurrentScore > 30) {
                        const bankedCash = Math.round(state.driftCurrentScore * 4.0 * state.rewardMult);
                        state.earnedCash += bankedCash;
                        this.earnedCash = state.earnedCash;
                        if (this.options.onPopup) {
                            this.options.onPopup(`🌪️ ЗАНОС: +${Math.round(state.driftCurrentScore)} PTS (+${bankedCash.toLocaleString('ru-RU')} ₽)`, '#fbbf24');
                        }
                        if (this.options.onSound) this.options.onSound('cash');
                    }
                    state.driftCurrentScore = 0;
                    state.driftDuration = 0;
                    state.driftCombo = 1;
                }
            }

            // Spawn smoke when handbraking at speed even in straight-line stops
            if (isHandbrake && state.speed > 15 && !isDriftingNow) {
                this.spawnDriftSmoke(dt);
            }

            // Apply lateral movement
            if(!this.mwLongitudinal)state.x += state.vx * dt;
            else state.yawAngle=this.mwLongitudinal.heading;

            // 6. GUARDRAIL & COLLISION PHYSICS (Tangential Sliding & Velocity Deflection)
            const roadLimit = 8.2;
            if (this.mwLongitudinal&&(Math.abs(state.x)+this.mwLongitudinal.profile.wheelbase*.85>9.1)) {
                const physical=this.mwLongitudinal,wallSide=state.x>0?1:-1;
                physical.state.x=state.x;physical.state.vx=state.vx;physical.state.vz=state.speed/3.6;
                const contact=physical.resolveWallCollision({normalX:-wallSide,normalZ:0,penetration:Math.max(0,Math.abs(state.x)-9.1),planePoint:[wallSide*9.1,0,state.z],restitution:.18,friction:.18,duration:dt,wallHeight:.7,groundHeight:window.NomeraRoadSurface?window.NomeraRoadSurface.highway(state.x,state.z).height:0});
                state.x=physical.x;state.vx=physical.state.vx;state.speed=Math.max(0,physical.state.vz*3.6);
                state.damageTaken=Math.min(100,(state.damageTaken||0)+contact.damageAdded);
                if(contact.closingSpeedMps>1){
                    state.shakeAmount=Math.min(.55,(state.shakeAmount||0)+contact.impactSeverity*.2);
                    this.spawnSparks(state.x,.45,state.z-.6,Math.min(10,Math.ceil(contact.closingSpeedMps)));
                    if(this.options.onSound)this.options.onSound(contact.closingSpeedMps>8?'crash':'scrape');
                }
            } else if (state.x < -roadLimit || state.x > roadLimit) {
                const wallSide = state.x > 0 ? 1 : -1;
                state.x = wallSide * roadLimit;

                // Tangential velocity deflection: soft inward deflection impulse (elastic restitution ~0.18)
                const impactVx = Math.abs(state.vx);
                state.vx = -wallSide * Math.max(0.35, impactVx * 0.18);

                // Tangential sliding friction along barrier: continuous progressive deceleration rather than dead stop
                const scrapeFriction = 24.0 + impactVx * 10.0;
                state.speed = Math.max(15, state.speed - scrapeFriction * dt);

                // Deflection alignment: barrier torques car body parallel to guardrail
                state.yawAngle += (0 - state.yawAngle) * Math.min(1.0, 14.0 * dt);
                state.yawVelocity = 0;

                // Body roll leans slightly against guardrail
                state.bodyRoll = wallSide * 0.032;
                state.rollAngle = state.bodyRoll;
                this.rollAngle = state.bodyRoll;

                // Suspension shock impulse
                state.suspensionVelocityY = (state.suspensionVelocityY || 0) + 0.08;

                // Progressive scrape damage and tactile screen shake
                state.damageTaken = Math.min(100, (state.damageTaken || 0) + 1.8 * dt * 10);
                state.shakeAmount = Math.min(0.55, (state.shakeAmount || 0) + 0.12);
                state.cameraShake = state.shakeAmount;
                this.cameraShake = state.shakeAmount;

                // Streams of sparks sliding along the contact flank
                const sparkCount = Math.min(14, Math.max(4, Math.floor(state.speed / 28)));
                this.spawnSparks(state.x, 0.45, state.z - 0.6, sparkCount);

                if (state.isDrifting) {
                    if (this.options.onPopup) this.options.onPopup('💥 ДРИФТ СОРВАН!', '#ef4444');
                    state.driftCurrentScore = 0;
                    state.driftDuration = 0;
                    state.driftCombo = 1;
                    state.isDrifting = false;
                }

                // Tangential scrape sound cadence
                state.scrapeTimer = (state.scrapeTimer || 0) - dt;
                if (state.scrapeTimer <= 0) {
                    if (this.options.onSound) this.options.onSound('scrape');
                    state.scrapeTimer = 0.22;
                }

                if (state.damageTaken >= 100 && !state.crashed) {
                    state.crashed = true;
                    state.speed = 0;
                    this.isRunning = false;
                    this.stop();
                    if (this.sound) {
                        if (typeof this.sound.stopEngine === 'function') this.sound.stopEngine();
                        if (typeof this.sound.stopSiren === 'function') this.sound.stopSiren();
                    }
                    if (this.options && this.options.onPopup) this.options.onPopup('💥 АВТОМОБИЛЬ РАЗБИТ В ТОТАЛ!', '#ef4444');
                    if (typeof this.onGameOver === 'function') this.onGameOver(true, this.getState());
                    else if (this.options && typeof this.options.onGameOver === 'function') this.options.onGameOver(true, this.getState());
                    return;
                }
            } else {
                if (state.scrapeTimer > 0) state.scrapeTimer -= dt;
            }

            // 1b. DYNAMIC ROLL DURING CORNERING (2nd-Order Spring-Damper Suspension Response)
            const targetBodyRoll = Math.max(-0.062, Math.min(0.062, state.vx * 0.0045));
            const rollSpringK = 54.0;
            const rollDamperC = 11.5;
            const rollForce = (targetBodyRoll - (state.bodyRoll || 0)) * rollSpringK - (state.rollVelocity || 0) * rollDamperC;
            state.rollVelocity = (state.rollVelocity || 0) + rollForce * dt;
            state.bodyRoll = (state.bodyRoll || 0) + state.rollVelocity * dt;
            state.bodyRoll = Math.max(-0.065, Math.min(0.065, state.bodyRoll));
            state.rollAngle = state.bodyRoll;
            this.rollAngle = state.bodyRoll;

            state.time = (state.time || 0) + dt;

            // Engine tremor calculation (idle rumble & rev-limiter mechanical shudder)
            const idleTremor = (1.0 - Math.min(1.0, state.speed / 25)) * 0.0018 * Math.sin(state.time * 24);
            const redlineProg = Math.max(0, (state.rpm - (state.maxRpm * 0.90)) / (state.maxRpm * 0.10 || 1));
            const redlineTremor = redlineProg * 0.0032 * Math.sin(state.time * 72);
            const engineTremorY = idleTremor + redlineTremor;
            const engineTremorRoll = (idleTremor + redlineTremor) * 0.75;
            this.engineTremorRoll = engineTremorRoll;

            // 5b. SUSPENSION REBOUND & ROAD FEEL (Damped Spring-Damper Response)
            const speedFactor = Math.min(1.0, state.speed / 35);
            // Road surface profile: undulating asphalt waves + bridge expansion joints + rumble strips
            const wave1 = Math.sin(state.z * 0.14) * 0.0045;
            const wave2 = Math.sin(state.z * 0.38) * 0.0025;
            // Periodic highway slab / expansion joint seams (every 85 meters)
            const jointPhase = (state.z % 85.0);
            const jointImpulse = (jointPhase > 0 && jointPhase < 1.4 && state.speed > 25) ? -0.008 * Math.sin((jointPhase / 1.4) * Math.PI) : 0;
            // Highway shoulder rumble strips on edges (|x| > 6.8m)
            const onRumbleStrip = Math.abs(state.x) > 6.8 && Math.abs(state.x) <= 8.2;
            const rumbleStripVibe = (onRumbleStrip && state.speed > 30) ? Math.sin(state.z * 3.2) * 0.006 * Math.min(1.0, state.speed / 45) : 0;
            const roadSurfaceY = (wave1 + wave2 + jointImpulse + rumbleStripVibe) * speedFactor;

            // 2nd-order suspension spring-damper vertical dynamics
            const suspSpringK = 135.0;
            const suspDamperC = 17.5;
            const suspForce = (roadSurfaceY - (state.suspensionY || 0)) * suspSpringK - (state.suspensionVelocityY || 0) * suspDamperC;
            state.suspensionVelocityY = (state.suspensionVelocityY || 0) + suspForce * dt;
            state.suspensionY = (state.suspensionY || 0) + state.suspensionVelocityY * dt;
            state.suspensionY = Math.max(-0.038, Math.min(0.038, state.suspensionY));

            // Glowing hot brake discs under heavy deceleration
            if (keys.brake && state.speed > 70) {
                state.brakeHeat = Math.min(1.0, (state.brakeHeat || 0) + dt * 0.55);
            } else {
                state.brakeHeat = Math.max(0, (state.brakeHeat || 0) - dt * 0.22);
            }
            if (this.playerBrakeDiscs && this.playerBrakeDiscs.length > 0) {
                const heat = state.brakeHeat || 0;
                this.playerBrakeDiscs.forEach(disc => {
                    if (disc.material) {
                        if (heat > 0.08) {
                            if (!disc.material.emissive) disc.material.emissive = new THREE.Color(0xff3300);
                            disc.material.emissive.setHex(0xff3300);
                            disc.material.emissiveIntensity = heat * 2.5;
                            if (disc.userData && disc.userData.isFallbackGlowDisc) {
                                disc.material.opacity = Math.min(0.65, heat * 0.65);
                            }
                        } else {
                            disc.material.emissiveIntensity = 0;
                            if (disc.userData && disc.userData.isFallbackGlowDisc) {
                                disc.material.opacity = 0;
                            }
                        }
                    }
                });
            }

            // Active aerodynamics: deployable rear wing lift at high speed (>180 km/h) + air-brake tilt on hard braking
            if (this.playerActiveAero && this.playerActiveAero.length > 0) {
                const isAirBraking = keys.brake && state.speed > 100;
                const isHighSpeedAero = state.speed > 180;
                const targetWingTilt = isAirBraking ? 0.34 : (isHighSpeedAero ? 0.09 : 0);
                const targetWingLift = (isAirBraking || isHighSpeedAero) ? 0.055 : 0;
                this.playerActiveAero.forEach(aero => {
                    const curRot = aero.mesh.rotation.x;
                    aero.mesh.rotation.x = curRot + (aero.baseRotX + targetWingTilt - curRot) * Math.min(1.0, 9.0 * dt);
                    if (typeof aero.basePosY === 'number' && aero.mesh.position) {
                        const curY = aero.mesh.position.y;
                        aero.mesh.position.y = curY + (aero.basePosY + targetWingLift - curY) * Math.min(1.0, 8.0 * dt);
                    }
                });
            }

            // Exhaust backfire animation update (short, punchy pops on shifts; boosted reverb in Lefortovo Tunnel)
            if (this.currentBiome === 'tunnel' && gasActive && state.speed > 160 && state.backfireTimer <= 0 && Math.random() < 0.04) {
                state.backfireTimer = 0.14;
                state.backfireColor = 'blue';
            }
            if (state.backfireTimer > 0) {
                state.backfireTimer -= dt;
                const tunnelBoost = (this.currentBiome === 'tunnel') ? 1.45 : 1.0;
                const progress = Math.max(0, Math.min(1.0, state.backfireTimer / 0.18));
                const bfScaleW = (0.80 + Math.random() * 0.30) * Math.min(1.0, progress * 1.4) * tunnelBoost;
                const bfScaleL = (0.85 + Math.random() * 0.40) * (0.45 + progress * 0.55) * tunnelBoost;
                const isBlue = state.backfireColor === 'blue';
                this.playerBackfireFlames.forEach(bf => {
                    bf.visible = true;
                    bf.scale.set(bfScaleW, bfScaleW, bfScaleL);
                    if (bf.material) {
                        bf.material.color.setHex(isBlue ? 0x38bdf8 : (Math.random() < 0.5 ? 0xff5500 : 0xff9900));
                        bf.material.opacity = Math.min(1.0, 0.80 * progress * tunnelBoost);
                    }
                });
                if (this.playerBackfireLight) {
                    this.playerBackfireLight.color.setHex(isBlue ? 0x38bdf8 : 0xff7700);
                    this.playerBackfireLight.intensity = 2.4 * progress * tunnelBoost;
                }
                if (Math.random() < 0.3) {
                    this.spawnSparks(state.x + (Math.random() - 0.5) * 0.5, 0.22, state.z - 2.1, 2);
                }
            } else {
                this.playerBackfireFlames.forEach(bf => { bf.visible = false; });
                if (this.playerBackfireLight) {
                    this.playerBackfireLight.intensity = 0;
                }
            }

            if(this.mwLongitudinal?.mwKernel.RigidBody){const p=this.mwLongitudinal;p.mwKernel.RigidBody.meshContacts(this,p);state.x=p.x;state.z=p.z;state.vx=p.state.vx;state.speed=Math.max(0,p.state.vz*3.6);}
            // 6. UPDATE PLAYER CAR 3D MESH & 1ST-PERSON COCKPIT RIG
            if (this.playerCar) {
                this.playerCar.position.set(state.x, (state.downforceY || 0) + engineTremorY + (state.suspensionY || 0), state.z);
                this.playerCar.rotation.set(state.pitchSquat, state.yawAngle, state.bodyRoll + engineTremorRoll);
                if(this.mwLongitudinal?.suspension){
                    const body=this.mwLongitudinal.state;
                    this.playerCar.position.y=body.y+engineTremorY;
                    this.playerCar.rotation.order='YZX';
                    if(body.orientation)this.playerCar.quaternion.fromArray(body.orientation);else this.playerCar.rotation.set(body.pitch,state.yawAngle,body.roll+engineTremorRoll);
                }

                // Rotate dedicated procedural wheel spinners around local hub axis
                if (this.authorsWheelRig) {
                    const physical=this.mwLongitudinal?.state;
                    window.NomeraWheelRig.update(this.authorsWheelRig,{dt,speedMps:forwardSpeedMps,steer:steerAngleRad,angles:physical?.wheelAngles,
                        steerAngles:physical?{fl:physical.steerLeftRad,fr:physical.steerRightRad}:null,swapSides:!!physical,handbrake:isHandbrake,compression:physical?.suspensionOffsets});
                } else if (this.playerWheels && this.playerWheels.length > 0) {
                    const wheelRotSpeed = (forwardSpeedMps / 0.33) * dt;
                    this.playerWheels.forEach(spinner => {
                        const parent = spinner.parent;
                        const side = (parent && parent.userData && parent.userData.side) ? parent.userData.side : 1;
                        spinner.rotation.x += (side === -1 ? -wheelRotSpeed : wheelRotSpeed);
                    });
                }

                // 3. INERTIA & STEERING MOMENTUM (Front wheel visual steering vs chassis yaw delay)
                const targetSteerAngle = this.mwRoadSteering ? steerAngleRad : steerInput * .32;
                state.steerAngle = (state.steerAngle || 0) + (targetSteerAngle - (state.steerAngle || 0)) * Math.min(1.0, 22.0 * dt);
                if (!this.authorsWheelRig && this.playerSteerWheels && this.playerSteerWheels.length > 0) {
                    this.playerSteerWheels.forEach(w => {
                        const baseY = w.userData.baseRotY || 0;
                        w.rotation.y = baseY + state.steerAngle;
                    });
                }

                // 4. 1st-Person Cockpit Interior Rig Animations (Steering wheel, Digital Dash, RPM Shift Lights, Wipers)
                if (this.cockpitGroup && this.cockpitGroup.visible) {
                    this.updateCockpitDashTexture(state);
                }
                if (this.cockpitSteeringWheel) {
                    this.cockpitSteeringWheel.rotation.z = -(state.steerAngle || 0) * 2.35;
                }
                if (this.cockpitShiftLights && this.cockpitShiftLights.length > 0) {
                    const rpmSpan = Math.max(1, (state.maxRpm || 8500) - (state.idleRpm || 1000));
                    const rpmFrac = Math.max(0, Math.min(1, ((state.rpm || 1000) - (state.idleRpm || 1000)) / rpmSpan));
                    const isRedlineFlash = rpmFrac >= 0.90 && (Math.floor((state.time || 0) * 20) % 2 === 0);
                    this.cockpitShiftLights.forEach((led, idx) => {
                        const threshold = (idx + 1) / (this.cockpitShiftLights.length + 0.5);
                        if (led.material) {
                            if (isRedlineFlash) {
                                led.material.emissive.setHex(0xef4444);
                                led.material.emissiveIntensity = 3.2;
                            } else if (rpmFrac >= threshold) {
                                led.material.emissive.setHex(led.userData.baseColor || 0x22c55e);
                                led.material.emissiveIntensity = 2.2;
                            } else {
                                led.material.emissiveIntensity = 0.12;
                            }
                        }
                    });
                }
                if (this.cockpitWiperL && this.cockpitWiperR) {
                    const isWetWeather = (this.currentActiveWeather === 'rain' || this.currentActiveWeather === 'snow') && this.currentBiome !== 'tunnel';
                    if (isWetWeather) {
                        const wiperSpeed = this.currentActiveWeather === 'rain' ? 6.5 : 4.2;
                        this.wiperPhase = (this.wiperPhase || 0) + dt * wiperSpeed;
                        const sweep = (Math.sin(this.wiperPhase) + 1) * 0.5; // 0..1
                        const wiperAngle = 1.48 - sweep * 1.15;
                        this.cockpitWiperL.rotation.z = wiperAngle;
                        this.cockpitWiperR.rotation.z = wiperAngle;
                    } else {
                        this.cockpitWiperL.rotation.z += (1.48 - this.cockpitWiperL.rotation.z) * Math.min(1.0, 8.0 * dt);
                        this.cockpitWiperR.rotation.z += (1.48 - this.cockpitWiperR.rotation.z) * Math.min(1.0, 8.0 * dt);
                    }
                }

                // SGU Flasher strobe oscillation
                if (this.playerSguLight) {
                    state.sguTimer += dt * 10;
                    const isRed = Math.floor(state.sguTimer) % 2 === 0;
                    this.playerSguLight.color.setHex(isRed ? 0xef4444 : 0x3b82f6);
                    this.playerSguLight.intensity = (state.sguTimer % 1 < 0.6) ? 3.5 : 0.2;
                }
            }

            if(window.NOMERA_AUTHORS_PREVIEW)window.NomeraRoadEvents?.step(this,dt);
            // 7. TRAFFIC VEHICLES AI, OVERTAKES & COLLISIONS
            this.updateTraffic(dt);
            if (!this.isRunning || state.crashed || state.isBusted) return;

            // 7b. CIRCUIT RIVALS & LAP PROGRESS
            if (this.isNfsCircuit) {
                this.updateNfsRivals(dt);
                this.updateNfsCircuitProgress(dt);
                if (!this.isRunning || state.finished) return;
                this.updateNfsCircuitHud();
            }

            // 8. HIGHWAY ROAD CHUNKS RECYCLING & 3D COLLECTIBLES
            this.updateRoadChunks();
            this.updateCollectibles(dt);

            // 9. SMOKE & SPARK PARTICLES & MODULAR VFX UPDATE
            if (this.vfx && typeof this.vfx.update === 'function') {
                this.vfx.update(dt);
            }
            this.updateSmokeParticles(dt);

            // Spark particles update
            for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
                const sp = this.sparkParticles[i];
                sp.userData.life -= dt;
                sp.position.x += sp.userData.vx * dt;
                sp.position.y += sp.userData.vy * dt;
                sp.position.z += sp.userData.vz * dt;
                if (sp.userData.life <= 0) {
                    this.scene.remove(sp);
                    this.sparkParticles.splice(i, 1);
                }
            }

            // 9. CHASE CAMERA UPDATE (3RD-PERSON VIEW)
            this.updateChaseCamera(dt);

            // 10. WEATHER PARTICLES & DYNAMIC CYCLE UPDATE
            this.updateWeatherParticles(dt);
            if(window.NOMERA_AUTHORS_PREVIEW){window.NomeraScene?.update(this,dt);if(this.state.crashed)return;window.NomeraBodyDamage?.update(this);}

            // 11. NOTIFY HUD CALLBACK
            this.notifyHUD();
        }

        updateNfsRivals(dt) {
            if (!this.isNfsCircuit || !this.nfsRivals || this.nfsRivals.length === 0) return;
            const state = this.state;
            const lanes = this.trafficLanes || [-6.375, -2.125, 2.125, 6.375];
            const playerBaseRef = Math.max(210, (state.maxSpeed || 260) * 0.90);

            for (let i = 0; i < this.nfsRivals.length; i++) {
                const r = this.nfsRivals[i];
                const prevDz = state.z - r.z;

                // 1. Rubber-banding target speed around player's pace + rival skill
                const gapToPlayer = state.z - r.z; // >0 means player is ahead of rival
                let rubberBandBoost = 0;
                if (gapToPlayer > 28) {
                    rubberBandBoost = Math.min(52, (gapToPlayer - 28) * 0.45);
                } else if (gapToPlayer < -36) {
                    rubberBandBoost = Math.max(-42, (gapToPlayer + 36) * 0.38);
                }
                const cornerFactor = 1.0 - Math.min(0.14, Math.abs(this.roadCurve || 0) * 0.045);
                const targetSpd = Math.max(125, (playerBaseRef * r.skill * cornerFactor) + rubberBandBoost);

                const isUsingNitro = (gapToPlayer > 35 && r.nitroCharge > 20) || (r.speed < targetSpd - 18 && r.nitroCharge > 40);
                if (isUsingNitro) {
                    r.nitroCharge = Math.max(0, r.nitroCharge - 24 * dt);
                } else {
                    r.nitroCharge = Math.min(100, r.nitroCharge + 10 * dt);
                }
                const accelRate = isUsingNitro ? 58 : 38;
                if (r.speed < targetSpd) {
                    r.speed = Math.min(targetSpd + (isUsingNitro ? 22 : 0), r.speed + accelRate * dt);
                } else {
                    r.speed = Math.max(targetSpd, r.speed - 32 * dt);
                }

                // 2. Traffic & rival lane-change avoidance
                r.laneChangeTimer = (r.laneChangeTimer || 1.2) - dt;
                if (r.laneChangeTimer <= 0) {
                    let laneBlocked = false;
                    for (let tIdx = 0; tIdx < this.trafficCars.length; tIdx++) {
                        const tCar = this.trafficCars[tIdx];
                        if (!tCar || tCar.position.y < -100) continue;
                        const dzT = tCar.position.z - r.z;
                        const dxT = Math.abs(tCar.position.x - r.targetX);
                        if (dzT > 0 && dzT < 38 && dxT < 2.2) {
                            laneBlocked = true;
                            break;
                        }
                    }
                    if (laneBlocked || Math.random() < 0.28) {
                        const candidates = [0, 1, 2, 3].filter(l => Math.abs(lanes[l] - r.x) > 1.5);
                        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
                        if (chosen !== undefined) {
                            r.targetX = lanes[chosen];
                        }
                    }
                    r.laneChangeTimer = laneBlocked ? 0.55 : (1.5 + Math.random() * 1.8);
                }

                const steerErr = r.targetX - r.x;
                const maxStep = 6.2 * dt;
                const stepX = Math.max(-maxStep, Math.min(maxStep, steerErr * 4.2 * dt));
                r.vx = stepX / Math.max(0.001, dt);
                r.x = Math.max(-7.6, Math.min(7.6, r.x + stepX));
                r.z += (r.speed / 3.6) * dt;

                // Keep rivals within reasonable visual horizon so they don't disappear 800m away
                if (r.z < state.z - 160) {
                    r.z = state.z - 95 - i * 18;
                    r.speed = Math.max(r.speed, state.speed + 25);
                } else if (r.z > state.z + 240) {
                    r.z = state.z + 185 + i * 16;
                }

                // 3. Door-to-door collision with player car
                const dzNow = state.z - r.z;
                const dxNow = Math.abs(state.x - r.x);
                if (dxNow < 1.95 && Math.abs(dzNow) < 4.1) {
                    const pushDir = (state.x >= r.x) ? 1 : -1;
                    state.x = Math.max(-8.0, Math.min(8.0, state.x + pushDir * 0.42));
                    r.x = Math.max(-7.8, Math.min(7.8, r.x - pushDir * 0.42));
                    state.vx += pushDir * 2.8;
                    state.shakeAmount = Math.max(state.shakeAmount || 0, 0.32);
                    this.spawnSparks((state.x + r.x) * 0.5, 0.5, state.z, 10);
                    if (this.options && typeof this.options.onSound === 'function') {
                        this.options.onSound('scrape');
                    }
                } else if (prevDz < -1.0 && dzNow >= 1.2 && state.speed > 90 && (r.overtakeCooldown || 0) <= 0) {
                    r.overtakeCooldown = 5.0;
                    state.overtakesCount = (state.overtakesCount || 0) + 1;
                    const ovBonus = Math.round(3500 * (state.rewardMult || 1.0));
                    state.earnedCash += ovBonus;
                    this.earnedCash = state.earnedCash;
                    if (this.options && typeof this.options.onPopup === 'function') {
                        this.options.onPopup(`🔥 ЧИСТЫЙ ОБГОН (${r.name})! +${ovBonus.toLocaleString('ru-RU')} ₽`, '#f59e0b');
                    }
                }
                if ((r.overtakeCooldown || 0) > 0) r.overtakeCooldown -= dt;

                // 4. Update Rival 3D Mesh, Nitro Flames & Wheel Spin
                if (r.mesh) {
                    r.mesh.position.set(r.x, 0, r.z);
                    const targetYaw = Math.max(-0.14, Math.min(0.14, -steerErr * 0.06));
                    r.mesh.rotation.y += (targetYaw - r.mesh.rotation.y) * Math.min(1, 10 * dt);
                    r.mesh.rotation.z = -r.mesh.rotation.y * 0.35;
                }
                if (r.nitroFlames && r.nitroFlames.length > 0) {
                    const flicker = 0.8 + Math.random() * 0.4;
                    r.nitroFlames.forEach(flame => {
                        flame.visible = isUsingNitro;
                        if (isUsingNitro) flame.scale.set(1, 1, flicker);
                    });
                }
            }
            if ((this.rivalRamPopupTimer || 0) > 0) {
                this.rivalRamPopupTimer = Math.max(0, this.rivalRamPopupTimer - dt);
            }

            // 5. Recompute live race standing (1..4)
            let aheadCount = 0;
            for (let i = 0; i < this.nfsRivals.length; i++) {
                if (this.nfsRivals[i].z > state.z) aheadCount++;
            }
            state.position = 1 + aheadCount;
            this.position = state.position;
        }

        updateNfsCircuitProgress(dt) {
            if (!this.isNfsCircuit) return;
            const state = this.state;
            state.lapTimeSec = (state.lapTimeSec || 0) + dt;

            // Animate checkpoint gantry arch pulse
            if (this.nfsCheckpointGate) {
                const u = this.nfsCheckpointGate.userData || {};
                const pulse = 1.6 + Math.sin((state.time || 0) * 6.0) * 0.6;
                if (u.postMat) u.postMat.emissiveIntensity = pulse;
                if (u.flareMat) u.flareMat.opacity = 0.55 + Math.sin((state.time || 0) * 8.0) * 0.25;
            }

            // Check if player crossed the active checkpoint gate
            if (state.z >= (this.nfsNextCheckpointZ || 225)) {
                state.checkpointIndex = (state.checkpointIndex || 0) + 1;
                const cpBonus = Math.round(3500 * (state.rewardMult || 1.0));
                state.earnedCash += cpBonus;
                this.earnedCash = state.earnedCash;
                state.nitroLevel = Math.min(100, (state.nitroLevel || 0) + 18);
                state.speedbreakerCharge = Math.min(100, (state.speedbreakerCharge || 0) + 15);
                this.speedbreakerCharge = state.speedbreakerCharge;

                // Advance checkpoint gate to next sector
                this.nfsNextCheckpointZ += (this.nfsCheckpointStep || 225);
                if (this.nfsCheckpointGate) {
                    this.nfsCheckpointGate.position.z = this.nfsNextCheckpointZ;
                }

                // Check if this checkpoint completes a full lap
                const currentCompletedLaps = Math.floor(state.z / (this.nfsLapLength || 900));
                if (currentCompletedLaps >= state.currentLap) {
                    const finishedLapTime = state.lapTimeSec;
                    if (!state.bestLapTimeSec || finishedLapTime < state.bestLapTimeSec) {
                        state.bestLapTimeSec = finishedLapTime;
                    }
                    if (currentCompletedLaps >= state.totalLaps) {
                        // RACE FINISHED! Award Podium Purse!
                        const podiumPrizes = [75000, 45000, 25000, 10000];
                        const posIdx = Math.max(0, Math.min(3, (state.position || 1) - 1));
                        const basePrize = podiumPrizes[posIdx] || 10000;
                        const finalPrize = Math.round(basePrize * (state.rewardMult || 1.0));
                        state.earnedCash += finalPrize;
                        this.earnedCash = state.earnedCash;
                        state.finished = true;
                        state.racePhase = 'finished';
                        this.racePhase = 'finished';

                        const posMedals = ['🥇 1 МЕСТО (ПОБЕДА!)', '🥈 2 МЕСТО (ПОДИУМ!)', '🥉 3 МЕСТО (ПОДИУМ!)', '🏁 4 МЕСТО (ФИНИШ)'];
                        const finishColor = posIdx === 0 ? '#fbbf24' : (posIdx <= 2 ? '#38bdf8' : '#94a3b8');
                        if (this.options && typeof this.options.onPopup === 'function') {
                            this.options.onPopup(`${posMedals[posIdx]} +${finalPrize.toLocaleString('ru-RU')} ₽`, finishColor);
                        }
                        if (this.options && typeof this.options.onSound === 'function') {
                            this.options.onSound('cash');
                        }

                        this.updateNfsCircuitHud();
                        this.notifyHUD();
                        this.isRunning = false;
                        this.stop();
                        if (typeof this.onGameOver === 'function') {
                            this.onGameOver(false, this.getState());
                        } else if (this.options && typeof this.options.onGameOver === 'function') {
                            this.options.onGameOver(false, this.getState());
                        }
                        return;
                    } else {
                        state.currentLap = currentCompletedLaps + 1;
                        this.currentLap = state.currentLap;
                        state.lapTimeSec = 0;
                        const lapBonus = Math.round(15000 * (state.rewardMult || 1.0));
                        state.earnedCash += lapBonus;
                        this.earnedCash = state.earnedCash;
                        if (this.options && typeof this.options.onPopup === 'function') {
                            const lapStr = finishedLapTime.toFixed(1);
                            this.options.onPopup(`🏁 КРУГ ${state.currentLap}/${state.totalLaps}! (${lapStr}с) +${lapBonus.toLocaleString('ru-RU')} ₽`, '#22c55e');
                        }
                        if (this.options && typeof this.options.onSound === 'function') {
                            this.options.onSound('cash');
                        }
                    }
                } else {
                    if (this.options && typeof this.options.onPopup === 'function') {
                        this.options.onPopup(`⏱️ СЕКТОР ПРОЙДЕН! +${cpBonus.toLocaleString('ru-RU')} ₽ (+НИТРО)`, '#38bdf8');
                    }
                }
            }
        }

        updateTraffic(dt) {
            const state = this.state;
            const ai=window.NOMERA_AUTHORS_PREVIEW&&window.NomeraTraffic;if(ai)ai.begin(this,dt);
            this.resetTrafficDamage=car=>window.NomeraBodyDamage?.reset(car);
            this.trafficGroundAt=(x,z)=>window.NomeraRoadSurface.highway(x,z);
            this.authorsTrafficImpact=(car,event)=>{window.NomeraBodyDamage?.record(car.userData.contactBody.state,event.point,event.normal,event);if(car.userData.type==='police'&&ai?.policeHit(this,car,event).disabled){car.userData.isWrecked=true;car.userData.wrecked=true;ai.retire(this,car);}};
            let minPoliceDist = 999;

            this.trafficCars.forEach((car, idx) => {
                const u = car.userData;
                u.collisionPreviousPose={x:car.position.x,y:car.position.y,z:car.position.z};

                if(u.contactBody&&this.mwLongitudinal){
                    if(Math.abs(car.position.z-u.contactBody.state.z)>30){u.contactBody=null;}
                    else{const R=this.mwLongitudinal.mwKernel.RigidBody;R.stepFree(u.contactBody,dt,(x,z)=>window.NomeraRoadSurface.highway(x,z));car.position.set(u.contactBody.state.x,u.contactBody.suspension.y,u.contactBody.state.z);car.quaternion.fromArray(u.contactBody.suspension.orientation);u.speed=u.contactBody.state.vz*3.6;
                        if(u.isWrecked){u.wreckTimer=(u.wreckTimer||2.5)-dt;if(u.wreckTimer<=0){u.contactBody=null;car.position.y=-999;u.isWrecked=false;u.respawnTimer=ai?35:4.5;}return;}
                    }
                }
                // 0. Handle wrecked / spinning police cars (after successful player takedown)
                if (u.isWrecked) {
                    u.wreckTimer = (u.wreckTimer || 2.5) - dt;
                    car.position.x += (ai?u.wreckSpinVx||0:u.wreckSpinVx||7.0) * dt;
                    car.position.z += (u.speed / 3.6) * dt;
                    u.speed = Math.max(0, u.speed - 140 * dt);
                    car.rotation.y += (ai?.3:12) * dt;
                    car.rotation.z = Math.sin((u.wreckTimer || 0) * 12) * 0.3;
                    if (u.policeLight) {
                        u.policeLight.intensity = Math.max(0, u.policeLight.intensity - 3 * dt);
                    }
                    if (car.position.z < state.z - 45 || u.wreckTimer <= 0) {
                        car.position.y = -999;
                        u.isWrecked = false;
                        u.wrecked = false;
                        u.speed = 0;
                        u.respawnTimer = ai?35:4.5;
                    }
                    return;
                }

                if (car.position.y < -500) {
                    if (u.type === 'police') {
                        if (state.wantedStars > 0) {
                            u.respawnTimer = (u.respawnTimer !== undefined ? u.respawnTimer : 3.0) - dt;
                            if (u.respawnTimer <= 0 && (!ai||ai.dispatch(this,car))) {
                                const lanes = this.trafficLanes || [-6.375, -2.125, 2.125, 6.375];
                                const newLane = Math.floor(Math.random() * lanes.length);
                                u.isWrecked = false;
                                u.wrecked = false;
                                u.wreckTimer = 0;
                                u.hitCooldown = 0;
                                u.laneIndex = newLane;
                                u.targetX = lanes[newLane];
                                car.rotation.set(0, 0, 0);
                                if(ai){if(!ai.spawn(this,car,{lane:newLane}))return;}else car.position.set(lanes[newLane],0,state.z+55+idx*15);
                                u.speed = ai?Math.min(165,Math.max(85,u.baseSpeed)):Math.max(120, state.speed * 0.95);
                            } else {
                                return;
                            }
                        } else {
                            return;
                        }
                    } else {
                        return;
                    }
                }

                // 0b. Realistic traffic interaction: vehicles do not pass through each other like ghosts,
                // and brighten rear brake lights when slowing down behind another vehicle
                let brakingBehindTraffic = false;
                for (let j = 0; !ai && j < this.trafficCars.length; j++) {
                    const otherCar = this.trafficCars[j];
                    if (otherCar === car || otherCar.position.y < -500) continue;
                    const ou = otherCar.userData;
                    if (ou.isWrecked) continue;

                    const cdx = Math.abs(otherCar.position.x - car.position.x);
                    const cdz = otherCar.position.z - car.position.z;

                    // Traffic car ahead on roughly the same lane
                    if (cdz > 0.1 && cdz < 18 && cdx < 2.2) {
                        if (u.type === 'police' && !u.isWrecked) {
                            // Police AI tries to overtake / swerve around civilian car
                            const steerOffset = (car.position.x <= otherCar.position.x) ? -3.8 : 3.8;
                            u.targetX = Math.max(-7.5, Math.min(7.5, otherCar.position.x + steerOffset));

                            // Physical collision if police contacts civilian vehicle at speed
                            if (cdz < 3.2 && cdx < 1.8) {
                                const push = (car.position.x < otherCar.position.x ? 1 : -1);
                                otherCar.position.x += push * 3.5 * dt;
                                otherCar.rotation.y = push * 0.18;
                                this.spawnSparks((car.position.x + otherCar.position.x) * 0.5, 0.6, car.position.z + 1.5, 12);
                                if (this.options.onSound) this.options.onSound('scrape');
                                u.speed = Math.max(45, u.speed - 25 * dt);
                                brakingBehindTraffic = true;
                            }
                        } else {
                            // Civilian traffic smooth speed matching, brake light activation, and lane-change queuing
                            if (u.speed > ou.speed - 4) {
                                brakingBehindTraffic = true;
                                u.speed = Math.max(ou.speed * 0.95, u.speed - 26 * dt);
                            }
                            if (u.type !== 'truck' && u.type !== 'kamaz' && (u.laneChangeTimer || 0) <= 0) {
                                u.laneChangeTimer = 5 + Math.random() * 6;
                                const curL = u.laneIndex !== undefined ? u.laneIndex : 1;
                                const candL = curL === 0 ? 1 : (curL === 3 ? 2 : (Math.random() < 0.5 ? curL - 1 : curL + 1));
                                u.laneChangeDirection = (this.trafficLanes[candL] > car.position.x) ? 1 : -1;
                                u.laneIndex = candL;
                                u.targetX = this.trafficLanes[candL];
                                u.changingLane = true;
                                u.plannedLaneIndex = null;
                            }
                        }
                    }
                }

                // Update rear brake light emissive brightness when slowing down behind traffic
                if(ai){u.isBraking=false;ai.cruise(this,car,dt);brakingBehindTraffic=u.isBraking;}
                u.isBraking = brakingBehindTraffic;
                if (u.brakeLightMat) {
                    u.brakeLightMat.emissiveIntensity = brakingBehindTraffic ? 3.2 : 0.65;
                    if (u.brakeLightMat.color) {
                        u.brakeLightMat.color.setHex(brakingBehindTraffic ? 0xff2222 : 0xef4444);
                    }
                }
                if (u.brakeLights && u.brakeLights.length > 0) {
                    u.brakeLights.forEach(bl => {
                        if (bl && bl.material && bl.material !== u.brakeLightMat) {
                            bl.material.emissiveIntensity = brakingBehindTraffic ? 3.2 : 0.65;
                        }
                    });
                }

                // 1. Move traffic car forward along Z and apply lateral deflection impulses
                const prevDz = (typeof u.prevDz === 'number') ? u.prevDz : (car.position.z - state.z);
                const tSpeedMps = u.speed / 3.6;
                if(!u.contactBody)car.position.z += tSpeedMps * dt;
                if (!u.contactBody && Math.abs(u.deflectVx || 0) > 0.05) {
                    car.position.x += u.deflectVx * dt;
                    u.deflectVx -= u.deflectVx * Math.min(1.0, 5.0 * dt);
                }

                // Dynamic speed pacing (cruising speed breathing cycle)
                u.cruiseTimer = (u.cruiseTimer || 4.0) - dt;
                if (u.cruiseTimer <= 0) {
                    u.cruiseTimer = 3.5 + Math.random() * 4.5;
                    u.speedPacingOffset = (Math.random() - 0.5) * 6;
                }
                const targetCruiseSpeed = (u.baseSpeed || 90) + (u.speedPacingOffset || 0);
                if (!u.contactBody && !u.isBraking && (u.type !== 'police' || state.wantedStars === 0)) {
                    const pacing=(targetCruiseSpeed-u.speed)*Math.min(1,1.2*dt);
                    u.speed += ai?Math.max(-3*3.6*dt,Math.min(2.2*3.6*dt,pacing)):pacing;
                }

                // Animate traffic wheels rotation
                if(u.trafficVisualRig&&window.NomeraWheelRig){window.NomeraWheelRig.update(u.trafficVisualRig,{dt,speedMps:tSpeedMps,steer:Math.max(-.13,Math.min(.13,(u.targetX-car.position.x)*.08))});}
                else if (u.wheels && u.wheels.length > 0) {
                    const rotSpeed = (tSpeedMps / 0.32) * dt;
                    u.wheels.forEach(w => {
                        w.rotation.x += rotSpeed;
                    });
                }

                // Traffic suspension micro-bounce
                if(!u.contactBody)car.position.y = Math.sin(car.position.z * 0.16 + (u.laneIndex || 0)) * 0.005+(this.mwLongitudinal&&window.NomeraRoadSurface?window.NomeraRoadSurface.highway(car.position.x,car.position.z).height:0);

                // Relative distances to player
                const dx = Math.abs(state.x - car.position.x);
                const dz = car.position.z - state.z;
                u.prevDz = dz;
                const distToPlayer = Math.hypot(dx, dz);

                // Ambulance emergency beacon strobe animation
                if (u.type === 'ambulance' && (u.ambulanceRed || u.ambulanceBlue)) {
                    u.sguStrobeTimer = (u.sguStrobeTimer || 0) + dt * 15;
                    const isRed = Math.floor(u.sguStrobeTimer) % 2 === 0;
                    if (u.ambulanceRed && u.ambulanceRed.material) {
                        u.ambulanceRed.material.color.setHex(isRed ? 0xef4444 : 0x450a0a);
                    }
                    if (u.ambulanceBlue && u.ambulanceBlue.material) {
                        u.ambulanceBlue.material.color.setHex(isRed ? 0x1e3a8a : 0x3b82f6);
                    }
                    if (u.ambulanceLight) {
                        u.ambulanceLight.color.setHex(isRed ? 0xef4444 : 0x3b82f6);
                        u.ambulanceLight.intensity = 1.6;
                    }
                }

                // Police strobe flashing animation & AI
                if (u.type === 'police' && !u.isWrecked) {
                    if (distToPlayer < minPoliceDist) {
                        minPoliceDist = distToPlayer;
                    }

                    if (u.policeRed && u.policeBlue) {
                        u.sguStrobeTimer = (u.sguStrobeTimer || 0) + dt * 14;
                        const isRed = Math.floor(u.sguStrobeTimer) % 2 === 0;
                        u.policeRed.material.color.setHex(isRed ? 0xef4444 : 0x450a0a);
                        u.policeBlue.material.color.setHex(isRed ? 0x1e3a8a : 0x3b82f6);
                        if (u.policeLight) {
                            const isActive = (state.wantedStars > 0);
                            u.policeLight.color.setHex(isRed ? 0xef4444 : 0x3b82f6);
                            u.policeLight.intensity = isActive ? 2.8 : 0.6;
                        }
                    }

                    // Speeding violation check (within 18m along Z and 6m along X)
                    if(ai)ai.observe(this,car,dt,dx,dz);
                    else if (Math.abs(dz) < 18 && dx < 6.0) {
                        if (state.speed > 220 && state.wantedStars < 3) {
                            this.addWantedStars(1, 'Опасное превышение > 220 км/ч');
                        } else if (state.speed > 150 && state.wantedStars === 0) {
                            this.addWantedStars(1, 'Превышение > 150 км/ч');
                        }
                        if (this.keys && this.keys.horn && state.wantedStars < 2) {
                            this.addWantedStars(1, 'Провокация ДПС сигналом');
                        }
                    }

                    // Perception-led Authors pursuit, with the legacy policy retained.
                    if(ai)ai.policeStep(this,car,dt);
                    else if (state.wantedStars > 0) {
                        const maxPoliceSpeedByStars = [130, 155, 185, 210, 235, 255];
                        const maxTgtSpeed = maxPoliceSpeedByStars[Math.min(5, state.wantedStars)] || 185;

                        if (car.position.z < state.z) {
                            // Chasing from behind - follow towards player's lane with dynamic catch-up
                            u.targetX = Math.max(-7.5, Math.min(7.5, state.x));
                            const targetSpeed = Math.min(maxTgtSpeed, Math.max(130, state.speed + 4));
                            u.speed += (targetSpeed - u.speed) * Math.min(1.0, 2.0 * dt);
                        } else {
                            // Ahead of player - pace slightly to the side to box in rather than instant brake-check
                            const sideOffset = (car.position.x >= state.x ? 1.5 : -1.5);
                            u.targetX = Math.max(-7.5, Math.min(7.5, state.x + sideOffset));
                            const blockSpeed = Math.max(80, Math.min(maxTgtSpeed, state.speed));
                            u.speed += (blockSpeed - u.speed) * Math.min(1.0, 1.4 * dt);
                        }
                    }
                }

                // 1e. SGU / Horn VIP Lane-Clearing ([H]): civilian traffic ahead yields the lane when honked at
                if (this.keys && this.keys.horn && u.type !== 'police' && u.type !== 'truck' && u.type !== 'kamaz') {
                    if (dz > 3.0 && dz < 42.0 && dx < 1.9 && !u.changingLane) {
                        const curLane = u.laneIndex !== undefined ? u.laneIndex : 1;
                        const yieldLane = (curLane === 0) ? 1 : (curLane === 3) ? 2 : (car.position.x >= state.x ? Math.min(3, curLane + 1) : Math.max(0, curLane - 1));
                        u.plannedLaneIndex = null;
                        u.laneChangeDirection = (this.trafficLanes[yieldLane] > car.position.x) ? 1 : -1;
                        u.laneIndex = yieldLane;
                        u.targetX = this.trafficLanes[yieldLane];
                        u.changingLane = true;
                        u.yieldedToHorn = true;
                        u.laneChangeTimer = 6.0;
                    }
                }

                // 2. Periodic lane changing behavior & pre-lane-change turn-signal blinker anticipation
                if ((state.wantedStars === 0 || u.type !== 'police') && u.type !== 'truck' && u.type !== 'kamaz') {
                    u.laneChangeTimer -= dt;
                    // Signal intention ~1.6s before executing lane change
                    if (u.laneChangeTimer <= 1.6 && u.laneChangeTimer > 0 && u.plannedLaneIndex === null) {
                        const curLane = u.laneIndex !== undefined ? u.laneIndex : 1;
                        const planned = (curLane === 0) ? 1 : (curLane === 3) ? 2 : (Math.random() < 0.5 ? curLane - 1 : curLane + 1);
                        u.plannedLaneIndex = planned;
                        u.laneChangeDirection = (this.trafficLanes[planned] > car.position.x) ? 1 : -1;
                    }
                    if (u.laneChangeTimer <= 0) {
                        u.laneChangeTimer = 6 + Math.random() * 10;
                        const curLane = u.laneIndex !== undefined ? u.laneIndex : 1;
                        const newLane = (typeof u.plannedLaneIndex === 'number')
                            ? u.plannedLaneIndex
                            : ((curLane === 0) ? 1 : (curLane === 3) ? 2 : (Math.random() < 0.5 ? curLane - 1 : curLane + 1));
                        u.plannedLaneIndex = null;
                        u.laneChangeDirection = (this.trafficLanes[newLane] > car.position.x) ? 1 : -1;
                        u.laneIndex = newLane;
                        u.targetX = this.trafficLanes[newLane];
                        u.changingLane = true;
                    }
                }

                // Smoothly steer towards target lane with body roll lean
                if(ai)ai.moveLateral(this,car,dt);
                else {
                const steerDist = u.targetX - car.position.x;
                if (Math.abs(steerDist) > 0.05) {
                    const dir = steerDist > 0 ? 1 : -1;
                    u.changingLane = true;
                    u.laneChangeDirection = dir;
                    const steerSpeed = (u.type === 'police' && state.wantedStars > 0) ? 2.8 : 2.2;
                    const step = dir * Math.min(Math.abs(steerDist), steerSpeed * dt);
                    car.position.x += step;
                    car.rotation.y = (dir > 0 ? 0.06 : -0.06);
                    car.rotation.z = (dir > 0 ? -0.03 : 0.03);
                } else {
                    car.position.x = u.targetX;
                    car.rotation.y = 0;
                    car.rotation.z = 0;
                    if (u.plannedLaneIndex === null) {
                        u.changingLane = false;
                    }
                }

                }
                // 2b. Amber Turn-Signal Blinkers (blinkerL / blinkerR) & Post-Impact Hazard Flashers
                const blinkerL = u.blinkerL || car.blinkerL;
                const blinkerR = u.blinkerR || car.blinkerR;
                if (blinkerL && blinkerR) {
                    u.blinkerTimer = (u.blinkerTimer || 0) + dt;
                    const blinkPulse = (Math.floor(u.blinkerTimer * 7.5) % 2 === 0);
                    const isPreSignaling = (u.plannedLaneIndex !== null) || (u.laneChangeTimer !== undefined && u.laneChangeTimer < 1.6 && u.laneChangeTimer > 0 && u.type !== 'truck' && u.type !== 'kamaz');

                    if ((u.hazardTimer || 0) > 0) {
                        u.hazardTimer = Math.max(0, u.hazardTimer - dt);
                        if (blinkerL.material) {
                            blinkerL.material.emissiveIntensity = blinkPulse ? 3.2 : 0.05;
                            blinkerL.material.opacity = blinkPulse ? 1.0 : 0.25;
                        }
                        if (blinkerR.material) {
                            blinkerR.material.emissiveIntensity = blinkPulse ? 3.2 : 0.05;
                            blinkerR.material.opacity = blinkPulse ? 1.0 : 0.25;
                        }
                    } else if (u.changingLane || isPreSignaling) {
                        const signalDir = u.laneChangeDirection || ((u.targetX >= car.position.x) ? 1 : -1);
                        const activeBlinker = signalDir > 0 ? blinkerR : blinkerL;
                        const inactiveBlinker = signalDir > 0 ? blinkerL : blinkerR;
                        if (activeBlinker && activeBlinker.material) {
                            activeBlinker.material.emissiveIntensity = blinkPulse ? 3.2 : 0.05;
                            activeBlinker.material.opacity = blinkPulse ? 1.0 : 0.25;
                        }
                        if (inactiveBlinker && inactiveBlinker.material) {
                            inactiveBlinker.material.emissiveIntensity = 0.0;
                            inactiveBlinker.material.opacity = 0.25;
                        }
                    } else {
                        if (blinkerL.material) {
                            blinkerL.material.emissiveIntensity = 0.0;
                            blinkerL.material.opacity = 0.25;
                        }
                        if (blinkerR.material) {
                            blinkerR.material.emissiveIntensity = 0.0;
                            blinkerR.material.opacity = 0.25;
                        }
                    }
                }

                if(u.contactBody){car.position.set(u.contactBody.state.x,u.contactBody.suspension.y,u.contactBody.state.z);car.quaternion.fromArray(u.contactBody.suspension.orientation);}
                // 3. Collision Detection with Player Car, Takedown, and Near-Miss «Шашки впритирку»
                const speedDiff = state.speed - u.speed;
                const trafficHalfW = car.userData.halfWidth || 0.95;
                const trafficHalfL = car.userData.halfLength || 2.2;
                const lateralClearance = trafficHalfW + 0.55;
                const longitudinalClearance = trafficHalfL + 1.6;
                let contact3D=null,contactOwner=null;
                if(this.mwLongitudinal?.mwKernel.RigidBody&&dx<7&&Math.abs(dz)<14){const R=this.mwLongitudinal.mwKernel.RigidBody,truck=u.type==='truck'||u.type==='kamaz';contactOwner=ai?ai.owner(this,car):u.contactBody||R.createBody({position:car.position.toArray(),velocity:[u.deflectVx||0,0,u.speed/3.6],orientation:car.quaternion.toArray(),half:[trafficHalfW,truck?1.4:.7,trafficHalfL],mass:truck?6500:1500});contactOwner.collisionPreviousPose=u.collisionPreviousPose;contact3D=this.mwLongitudinal.getVehicleContact(contactOwner);}
                const isColliding = this.mwLongitudinal?.mwKernel.RigidBody?!!contact3D:(dx < lateralClearance && Math.abs(dz) < longitudinalClearance&&Math.abs((this.mwLongitudinal?.state.y||0)-car.position.y)<1.25);

                // 3a. Near-Miss «Шашки впритирку» & Overtake Detection (when NOT colliding)
                if (!isColliding) {
                    const crossedZeroDz = (prevDz >= -0.5 && dz <= 0.35) || (dz <= 0.25 && dz > -5.5);
                    if (!u.nearMissed && state.speed >= 120 && dx < 2.15 && crossedZeroDz) {
                        u.nearMissed = true;
                        u.overtaken = true;
                        this.nearMissCount = (this.nearMissCount || 0) + 1;
                        state.nearMissCount = this.nearMissCount;
                        this.shashkiCombo = (this.shashkiCombo || 0) + 1;
                        state.shashkiCombo = this.shashkiCombo;
                        this.shashkiComboTimer = 4.0;
                        state.shashkiComboTimer = 4.0;

                        state.overtakesCount++;
                        state.overtakeCombo = this.shashkiCombo;
                        state.overtakeComboTimer = 4.0;

                        const shashkiPts = 300 * Math.min(this.shashkiCombo, 10);
                        const shashkiCash = Math.round(shashkiPts * 4.0 * (state.rewardMult || 1.0));
                        state.earnedCash += shashkiCash;
                        this.earnedCash = state.earnedCash;

                        // Subtle spark / speed-streak burst on tight pass
                        this.spawnSparks((state.x + car.position.x) * 0.5, 0.45, state.z, 6);

                        const shashkiMsg = '⚡ ШАШКА x' + this.shashkiCombo + '!';
                        if (typeof this.onPopup === 'function') {
                            this.onPopup(shashkiMsg, '#38bdf8');
                        } else if (this.options && typeof this.options.onPopup === 'function') {
                            this.options.onPopup(shashkiMsg, '#38bdf8');
                        }
                        if (this.options && typeof this.options.onSound === 'function') {
                            this.options.onSound('nearMiss');
                        }
                    } else if (!u.overtaken && dz < 0 && dz > -5.0 && dx < 2.3 && speedDiff > 25) {
                        u.overtaken = true;
                        state.overtakesCount++;
                        state.overtakeCombo++;
                        state.overtakeComboTimer = 3.5;

                        const pts = 250 * Math.min(state.overtakeCombo, 10);
                        const cash = Math.round(pts * 4.0 * state.rewardMult);
                        state.earnedCash += cash;
                        this.earnedCash = state.earnedCash;

                        if (this.options.onPopup) {
                            this.options.onPopup(`🔥 ОПАСНЫЙ ОБГОН +${pts} PTS (+${cash.toLocaleString('ru-RU')} ₽) x${state.overtakeCombo}`, '#f59e0b');
                        }
                        if (this.options.onSound) {
                            this.options.onSound('nearMiss');
                        }
                    }
                }

                // 4. Collision Resolution (Takedown, Rear-End Impact, or Sideswipe)
                if (isColliding) {
                    let spatialImpact=null;const impactSpeed=state.speed;
                    if(contact3D){u.contactBody=contactOwner;spatialImpact=this.mwLongitudinal._resolve3DContact(contactOwner,[contact3D],{restitution:.18,friction:.3});const p=this.mwLongitudinal;state.x=p.x;state.z=p.z;state.vx=p.state.vx;state.speed=Math.max(0,p.state.vz*3.6);car.position.set(contactOwner.state.x,contactOwner.suspension.y,contactOwner.state.z);u.speed=contactOwner.state.vz*3.6;}
                    // 💥 TAKEDOWN MECHANIC FOR POLICE: Player CAN ram & knock out pursuit cars!
                    if (u.type === 'police' && !u.isWrecked) {
                        const isNitroActive = !!(state.isNitroActive || state.nitroActive || (this.keys && this.keys.nitro));
                        const isSpeedbreakerRam = !!state.isSpeedbreakerActive;
                        const isFastRam = impactSpeed > 80;
                        const isHardSideHit = Math.abs(state.vx) > 0.35 || (this.keys && (this.keys.left || this.keys.right));
                        const isOvertakeRam = (state.speed - u.speed) > 5;
                        const isDirectRam = dz > -1.0 && state.speed > 60;
                        const isTakedown = ai?ai.policeHit(this,car,spatialImpact||{closingSpeedMps:Math.abs(speedDiff)/3.6,normalImpulse:Math.abs(speedDiff)/3.6*800}).disabled:isSpeedbreakerRam || ((state.wantedStars > 0 || isNitroActive) && (isNitroActive || isFastRam || isHardSideHit || isOvertakeRam || isDirectRam));

                        if (isTakedown) {
                            // TAKEDOWN! СБИТ ЭКИПАЖ ДПС!
                            u.isWrecked = true;
                            u.wrecked = true;
                            u.wreckTimer = 2.8;
                            u.wreckSpinVx = ai?0:(car.position.x >= state.x ? 9.5 : -9.5);
                            if(ai)ai.retire(this,car);
                            if(!ai)u.speed = Math.max(0, u.speed - 120);

                            // Player takes minimal impact damage instead of instant crash
                            if(!ai)state.speed = Math.max(50, state.speed - 10);
                            state.damageTaken = Math.min(100, (state.damageTaken || 0) + (ai?spatialImpact?.damageAdded||1:1));
                            state.shakeAmount = 0.65;
                            state.cameraShake = 0.65;
                            this.cameraShake = 0.65;

                            // Huge sparks and sound
                            this.spawnSparks(car.position.x, 0.7, car.position.z, 45);
                            const takedownBounty = 35000;
                            state.earnedCash += takedownBounty;
                            this.earnedCash = state.earnedCash;
                            if (this.options.onPopup) {
                                this.options.onPopup(`💥 ТАРАН! ЭКИПАЖ ДПС СБИТ! +${takedownBounty.toLocaleString('ru-RU')} ₽`, '#22c55e');
                            }
                            if (this.options.onSound) {
                                this.options.onSound('crash');
                            }

                            if (state.wantedStars === 0) {
                                this.addWantedStars(1, 'Таран экипажа ДПС');
                            } else if (!ai && state.wantedStars > 1) {
                                state.wantedStars = Math.max(1, state.wantedStars - 1);
                            }
                            state.escapeTimer = Math.max(1.0, state.escapeTimer - 3.0);
                            return;
                        } else if(!ai) {
                            this.addWantedStars(1, 'Таран экипажа ДПС');
                        }
                    }

                    if ((state.invulnerableTimer || 0) > 0) {
                        return;
                    }

                    if(spatialImpact){state.damageTaken=Math.min(100,state.damageTaken+spatialImpact.damageAdded);state.invulnerableTimer=.2;state.shakeAmount=Math.min(.7,spatialImpact.impactSeverity);if(spatialImpact.closingSpeedMps>2){this.spawnSparks(state.x,.6,state.z,12);this.options.onSound?.('crash');}return;}
                    const playerHalfW = 0.95;
                    const playerHalfL = 2.2;
                    const isAlongsideSideswipe = dx > (playerHalfW + trafficHalfW) * 0.55 && Math.abs(dz) < (playerHalfL + trafficHalfL) * 0.80;
                    const isRearEndHit = !isAlongsideSideswipe && dz > -1.5;
                    if (isRearEndHit && speedDiff > 20 && u.type !== 'police') {
                        // High-speed direct rear-end / heavy collision: MOMENTUM EXCHANGE, HAZARD LIGHTS & SWERVE!
                        const ramPushDir = (car.position.x >= state.x ? 1 : -1);

                        // 1. Kinetic momentum exchange: push traffic car forward and make it swerve/accelerate away
                        const speedTransfer = Math.min(48, speedDiff * 0.45 + 16);
                        u.speed = Math.min(175, u.speed + speedTransfer);
                        u.baseSpeed = Math.max(u.baseSpeed || 90, u.speed * 0.92);
                        car.position.z += 2.2;

                        // Struck traffic car flashes hazard lights and swerves into an adjacent lane
                        u.hazardTimer = 4.0;
                        if (u.blinkerL && u.blinkerL.material) {
                            u.blinkerL.material.emissiveIntensity = 3.2;
                            u.blinkerL.material.opacity = 1.0;
                        }
                        if (u.blinkerR && u.blinkerR.material) {
                            u.blinkerR.material.emissiveIntensity = 3.2;
                            u.blinkerR.material.opacity = 1.0;
                        }
                        const curL = u.laneIndex !== undefined ? u.laneIndex : 1;
                        const deflL = ramPushDir > 0 ? Math.min(3, curL + 1) : Math.max(0, curL - 1);
                        u.laneIndex = deflL;
                        u.targetX = this.trafficLanes[deflL];
                        u.changingLane = true;
                        u.laneChangeDirection = ramPushDir;
                        u.deflectVx = ramPushDir * 4.2;
                        car.rotation.y = ramPushDir * 0.14;

                        // 2. Anti-glitch physical separation
                        state.x -= ramPushDir * 0.35;
                        car.position.x += ramPushDir * 0.35;

                        // 3. Player progressive deceleration, pitch jolt & camera shake (Speedbreaker heavy mass reduces damage & speed loss)
                        const baseDmg = (u.type === 'truck' || u.type === 'kamaz') ? 32 : 25;
                        const dmg = state.isSpeedbreakerActive ? Math.round(baseDmg * 0.35) : baseDmg;
                        state.damageTaken = Math.min(100, (state.damageTaken || 0) + dmg);
                        state.shakeAmount = 1.0;
                        state.cameraShake = 1.0;
                        this.cameraShake = 1.0;
                        state.pitchSquat = 0.055;
                        state.pitchAngle = 0.055;
                        this.pitchAngle = 0.055;
                        state.invulnerableTimer = 1.2;
                        state.speed = Math.max(45, state.speed * (state.isSpeedbreakerActive ? 0.80 : 0.48));

                        // 4. Dense collision sparks
                        this.spawnSparks((state.x + car.position.x) * 0.5, 0.8, state.z + 1.0, 48);
                        if (this.options.onSound) this.options.onSound('crash');

                        if (state.damageTaken >= 100 && !state.crashed) {
                            // Totaled after multiple severe crashes
                            state.crashed = true;
                            state.speed = 0;
                            this.isRunning = false;
                            this.stop();
                            if (this.sound) {
                                if (typeof this.sound.stopEngine === 'function') this.sound.stopEngine();
                                if (typeof this.sound.stopSiren === 'function') this.sound.stopSiren();
                            }
                            if (this.options.onPopup) this.options.onPopup('💥 АВТОМОБИЛЬ РАЗБИТ В ТОТАЛ!', '#ef4444');
                            if (typeof this.onGameOver === 'function') this.onGameOver(true, this.getState());
                            else if (this.options.onGameOver) this.options.onGameOver(true, this.getState());
                            return;
                        } else {
                            if (this.options.onPopup) {
                                this.options.onPopup(`💥 СИЛЬНЫЙ УДАР! ПРОЧНОСТЬ ${(100 - Math.round(state.damageTaken))}%`, '#ef4444');
                            }
                            return;
                        }
                    } else {
                        // Glancing sideswipe / side contact: lateral bounce, spark burst, chassis roll jolt & moderate damage
                        const pushDir = (car.position.x >= state.x ? 1 : -1);

                        // 1. Smooth physics deflection: push traffic car sideways into adjacent lane & trigger hazards
                        u.deflectVx = pushDir * 4.5;
                        u.hazardTimer = 2.5;
                        const curL = u.laneIndex !== undefined ? u.laneIndex : (car.position.x < -4 ? 0 : car.position.x < 0 ? 1 : car.position.x < 4 ? 2 : 3);
                        const deflL = pushDir > 0 ? Math.min(3, curL + 1) : Math.max(0, curL - 1);
                        u.laneIndex = deflL;
                        u.targetX = this.trafficLanes[deflL];
                        u.changingLane = true;
                        u.laneChangeDirection = pushDir;
                        car.rotation.z = pushDir * -0.14;

                        // 2. Lateral bounce & chassis roll jolt on player car
                        state.vx = (state.vx || 0) - pushDir * 3.8;
                        state.bodyRoll = Math.max(-0.065, Math.min(0.065, -pushDir * 0.048));
                        state.rollAngle = state.bodyRoll;
                        this.rollAngle = state.bodyRoll;

                        // 3. Anti-glitch physical separation: prevent vehicles from sticking or glitching into each other
                        const minClearanceX = trafficHalfW + 0.58;
                        if (dx < minClearanceX) {
                            const overlap = (minClearanceX - dx) * 0.65;
                            state.x -= pushDir * overlap;
                            car.position.x += pushDir * overlap;
                        }

                        // 4. Progressive deceleration & moderate sideswipe damage
                        const speedLoss = Math.min(20, 5 + Math.abs(speedDiff) * 0.10) * (state.isSpeedbreakerActive ? 0.35 : 1.0);
                        state.speed = state.speed > 0 ? Math.max(18, state.speed - speedLoss) : 0;
                        state.damageTaken = Math.min(100, (state.damageTaken || 0) + (state.isSpeedbreakerActive ? 2.0 : 6.0));

                        // 5. Tactical screen shake scaled to impact momentum
                        state.shakeAmount = Math.min(0.75, 0.35 + Math.abs(state.vx || 0) * 0.05);
                        state.cameraShake = state.shakeAmount;
                        this.cameraShake = state.shakeAmount;
                        state.invulnerableTimer = 0.35; // grace buffer against multi-frame collision glitching

                        // 6. Dynamic sparks along the contact seam
                        this.spawnSparks((state.x + car.position.x) * 0.5, 0.5, state.z + 0.5, 26);
                        if (this.options.onPopup) this.options.onPopup('⚡ БОКОВОЙ ТАРАН!', '#f59e0b');
                        if (this.options.onSound) this.options.onSound('scrape');

                        if (state.damageTaken >= 100 && !state.crashed) {
                            state.crashed = true;
                            state.speed = 0;
                            this.isRunning = false;
                            this.stop();
                            if (this.sound) {
                                if (typeof this.sound.stopEngine === 'function') this.sound.stopEngine();
                                if (typeof this.sound.stopSiren === 'function') this.sound.stopSiren();
                            }
                            if (this.options.onPopup) this.options.onPopup('💥 АВТОМОБИЛЬ РАЗБИТ В ТОТАЛ!', '#ef4444');
                            if (typeof this.onGameOver === 'function') this.onGameOver(true, this.getState());
                            else if (this.options.onGameOver) this.options.onGameOver(true, this.getState());
                            return;
                        }
                    }
                }

                // 5. Recycle traffic when it falls behind player
                const recycleBehindZ = (u.type === 'police' && state.wantedStars > 0) ? (state.z - 75) : (state.z - 35);
                if (car.position.z < recycleBehindZ) {
                    u.contactBody=null;
                    if (u.type === 'police' && state.wantedStars > 0) {
                        // Outrun police car despawns behind and respawns after cooldown
                        car.position.y = -999;
                        u.isWrecked = false;
                        u.wrecked = false;
                        u.speed = 0;
                        u.respawnTimer = ai?12:2.0;
                        return;
                    }
                    const newLane = (u.type === 'truck' || u.type === 'kamaz') ? (Math.random() < 0.8 ? 3 : 2) : Math.floor(Math.random() * 4);
                    if(ai){ai.spawn(this,car,{lane:newLane});return;}
                    car.position.set(this.trafficLanes[newLane], 0, state.z + 180 + Math.random() * 120);
                    u.laneIndex = newLane;
                    u.targetX = this.trafficLanes[newLane];
                    u.baseSpeed = this.getLaneSpeed(newLane, u.type);
                    u.speed = u.baseSpeed;
                    u.overtaken = false;
                    u.nearMissed = false;
                    u.isWrecked = false;
                    u.deflectVx = 0;
                    u.changingLane = false;
                    u.plannedLaneIndex = null;
                    u.hazardTimer = 0;
                    u.prevDz = car.position.z - state.z;
                }
            });

            // Overtake & Shashki combo timeouts
            if (state.overtakeComboTimer > 0) {
                state.overtakeComboTimer -= dt;
                if (state.overtakeComboTimer <= 0) {
                    state.overtakeCombo = 0;
                }
            }
            if ((this.shashkiComboTimer || 0) > 0) {
                this.shashkiComboTimer = Math.max(0, this.shashkiComboTimer - dt);
                state.shashkiComboTimer = this.shashkiComboTimer;
                if (this.shashkiComboTimer <= 0) {
                    this.shashkiCombo = 0;
                    state.shashkiCombo = 0;
                }
            }

            if(ai)ai.finish(this,dt);
            // --- Pursuit, Escape & Busted Resolution ---
            const threat=ai?ai.threat(this):null;
            if(threat){minPoliceDist=threat.nearest;state.policeSight=threat.seen;state.pursuitPhase=threat.seen?'chase':'search';}
            state.nearestPoliceDist = minPoliceDist;
            if(ai){const nearest=this.trafficCars.filter(c=>c.userData.type==='police'&&!c.userData.isWrecked&&c.position.y> -500).sort((a,b)=>Math.hypot(a.position.x-state.x,a.position.z-state.z)-Math.hypot(b.position.x-state.x,b.position.z-state.z))[0];state.nearestPoliceIntegrity=nearest?Math.round(nearest.userData.integrity??100):null;}

            // Five-star pursuit keeps its gameplay, without a helicopter light.
            if(this.helicopterLight){this.helicopterLight.target?.removeFromParent?.();this.helicopterLight.removeFromParent?.();this.helicopterLight=null;}

            if (state.wantedStars > 0) {
                state.isPursuitActive = true;

                // Escape countdown logic: starts when distance >= 38m (allows outrunning DPS at high speeds)
                if (ai?!threat.seen:minPoliceDist >= 38) {
                    state.escapeTimer = Math.max(0, state.escapeTimer - dt);
                    if (state.escapeTimer <= 0) {
                        const starsWon = state.wantedStars;
                        const bounty = Math.round(starsWon * 35000 * (state.rewardMult || 1.0));
                        state.earnedCash += bounty;
                        this.earnedCash = state.earnedCash;
                        if (this.options.onPopup) {
                            this.options.onPopup(`🎉 УХОД ОТ ПОГОНИ! +${bounty.toLocaleString('ru-RU')} ₽`, '#22c55e');
                        }
                        if (this.options.onSound) {
                            this.options.onSound('escape');
                        }
                        this.clearPursuit();
                    }
                } else {
                    // Police is in visual sight: only recover timer if very close (< 22m), and do it gradually
                    if (minPoliceDist < 22) {
                        state.escapeTimer = Math.min(8.0, state.escapeTimer + 0.8 * dt);
                    }
                }

                // Busted logic: if player slowed down < 25 km/h while cornered by DPS (< 12m) for 2.8s
                if (state.wantedStars > 0 && state.speed < 25 && (ai?threat.blocking:minPoliceDist < 12)) {
                    state.bustedTimer += dt;
                    if (state.bustedTimer >= 2.8) {
                        state.isBusted = true;
                        this.stop();
                        if (this.options.onSound) this.options.onSound('busted');
                        if (typeof this.onGameOver === 'function') this.onGameOver('busted', this.getState());
                        else if (this.options.onGameOver) this.options.onGameOver('busted', this.getState());
                        return;
                    }
                } else {
                    state.bustedTimer = Math.max(0, state.bustedTimer - dt * 2.0);
                }
            } else {
                state.isPursuitActive = false;
                state.escapeTimer = 0;
                state.bustedTimer = 0;
            }
        }

        deformHighwayChunk(chunk) {
            const T=this.THREE,sample=this.mwLongitudinal&&window.NomeraRoadSurface?window.NomeraRoadSurface.highway:()=>({height:0,normal:[0,1,0]});
            if(chunk.userData.mwDeformedZ===chunk.position.z&&chunk.userData.mwDeformedActive===!!this.mwLongitudinal)return;
            const v=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3(),matrix=new T.Matrix4(),up=new T.Vector3(0,1,0);
            for(const node of chunk.children){
                if(!node.userData.mwTerrainBase)node.userData.mwTerrainBase=node.position.clone();
                const base=node.userData.mwTerrainBase;
                const isRibbon=node.isMesh&&[this.roadGeo,this.grassGeo,this.outerGeo,this.beamGeo,this.lowerBeamGeo].includes(node.userData.mwOriginalGeometry||node.geometry);
                if(isRibbon){
                    if(!node.userData.mwTerrainVertices){node.userData.mwOriginalGeometry=node.geometry;node.geometry=node.geometry.clone();node.userData.mwTerrainVertices=node.geometry.attributes.position.array.slice();}
                    node.userData.mwRoadSurface=node.userData.mwOriginalGeometry===this.roadGeo;
                    const p=node.geometry.attributes.position,original=node.userData.mwTerrainVertices;
                    for(let i=0;i<p.count;i++)p.setY(i,original[i*3+1]+sample(base.x+original[i*3],chunk.position.z+base.z+original[i*3+2]).height);
                    p.needsUpdate=true;node.geometry.computeVertexNormals();node.geometry.computeBoundingBox();node.geometry.computeBoundingSphere();
                }else if(node.isInstancedMesh){
                    if(!node.userData.mwTerrainMatrices)node.userData.mwTerrainMatrices=node.instanceMatrix.array.slice();
                    const original=node.userData.mwTerrainMatrices;
                    for(let i=0;i<node.count;i++){
                        matrix.fromArray(original,i*16);matrix.decompose(v,q,scale);const g=sample(v.x+base.x,v.z+base.z+chunk.position.z);v.y+=g.height;
                        if(node.geometry===this.dashGeo||node.geometry===this.catsEyeGeo||node.geometry===this.curbBoxGeo)q.premultiply(new T.Quaternion().setFromUnitVectors(up,new T.Vector3(...g.normal)));
                        matrix.compose(v,q,scale);node.setMatrixAt(i,matrix);
                    }
                    node.instanceMatrix.needsUpdate=true;
                }else node.position.y=base.y+sample(base.x,chunk.position.z+base.z).height;
            }
            chunk.userData.mwDeformedZ=chunk.position.z;chunk.userData.mwDeformedActive=!!this.mwLongitudinal;
        }

        updateRoadChunks() {
            const state = this.state;
            this.roadChunks.forEach(chunk => {
                const cu = chunk.userData || {};
                const gantryWorldZ = chunk.position.z + (this.chunkLength || 50) * 0.4;
                if (cu.hasGantry && !cu.radarTriggered && state.z >= 240 && (Math.abs(chunk.position.z - state.z) < 4.5 || Math.abs(gantryWorldZ - state.z) < 4.5)) {
                    cu.radarTriggered = true;
                    if (state.speed > 160 && this.mode !== 'drift') {
                        if (this.hasSpecialPlateImmunity()) {
                            const vipBonus = 2000;
                            state.earnedCash += vipBonus;
                            this.earnedCash = state.earnedCash;
                            if (this.options.onPopup) this.options.onPopup('🛡️ ИММУНИТЕТ СПЕЦСЕРИИ! +2 000 ₽', '#38bdf8');
                            if (this.options.onSound) this.options.onSound('cash');
                        } else {
                            this.addWantedStars(1, 'Камера Автоураган > 160 км/ч');
                        }
                    }
                }
                if (chunk.position.z < state.z - 50) {
                    chunk.position.z = this.highestChunkZ + this.chunkLength;
                    this.highestChunkZ = chunk.position.z;
                    if (chunk.userData) chunk.userData.radarTriggered = false;
                }
                const targetChunkBiome = (this.mode === 'drift') ? 'highway' : this.getBiomeForZ(chunk.position.z);
                if (!chunk.userData || chunk.userData.biome !== targetChunkBiome) {
                    this.applyChunkBiome(chunk, targetChunkBiome);
                }
                chunk.position.x = 0;
                chunk.rotation.y = 0;
                this.deformHighwayChunk(chunk);
            });
        }

        updateChaseCamera(dt) {
            if(window.NOMERA_AUTHORS_PREVIEW&&window.NomeraDriverCamera){window.NomeraDriverCamera.recoveryUI(this,this.mwLongitudinal);if(window.NomeraDriverCamera.update(this,this.cameraMode,dt))return;}
            const state = this.state;
            const isCockpit = this.cameraMode === 4 || this.cameraMode === 'cockpit';
            const isHood = this.cameraMode === 2 || this.cameraMode === 'hood';
            const isTopDown = this.cameraMode === 3 || this.cameraMode === 'top';
            const modeIdx = isCockpit ? 4 : (isTopDown ? 3 : (isHood ? 2 : (this.cameraMode === 'chase_close' ? 1 : (typeof this.cameraMode === 'number' ? this.cameraMode : 0))));
            const mode = this.cameraModes[modeIdx] || this.cameraModes[0];
            const isPortrait = this.camera && this.camera.aspect < 1.0;
            const mwPortraitChase=!!this.mwLongitudinal&&isPortrait&&!isHood&&!isTopDown&&!isCockpit;

            if (this.cockpitGroup && this.cockpitGroup.visible !== isCockpit) {
                this.syncCockpitCarVisibility(isCockpit);
            } else if (this.cockpitGroup) {
                this.cockpitGroup.visible = isCockpit;
            }

            // 1. Target camera offset based on camera mode and viewport aspect
            // In portrait aspect, elevate camera slightly so the vehicle sits higher in frame,
            // preventing lower HUD gauges (speedometer & nitro) from covering the bumper and plate.
            const accelLag = (!isHood && !isTopDown && !isCockpit) ? ((this.keys && this.keys.gas) ? 0.30 : ((this.keys && this.keys.brake) ? -0.25 : 0)) : 0;
            const yaw = state.yawAngle || 0;
            const cosYaw = Math.cos(yaw);
            const sinYaw = Math.sin(yaw);
            const targetCamX = isCockpit
                ? (state.x + mode.offset.x * cosYaw + mode.offset.z * sinYaw)
                : (isTopDown ? (state.x * 0.65) : (isHood||!!this.mwLongitudinal ? state.x : state.x * 0.75));
            const terrainY=this.mwLongitudinal?.state.y||0;
            const targetCamY = terrainY+(isCockpit
                ? (mode.offset.y + (state.downforceY || 0) + (state.suspensionY || 0))
                : (mode.offset.y + (isPortrait && !isHood && !isTopDown ? 0.85 : 0)));
            const targetCamZ = isCockpit
                ? (state.z - mode.offset.x * sinYaw + mode.offset.z * cosYaw)
                : (state.z + mode.offset.z - (isPortrait && !isHood && !isTopDown && !isCockpit ? 1.05 : 0) - accelLag * Math.min(1.0, state.speed / 100));

            // 2. Smooth spring follow for camera position (glides smoothly across lanes without snapping)
            const posLerp = isCockpit ? 28.0 : (isHood ? 16.0 : (isTopDown||mwPortraitChase ? 12.0 : 6.0));
            if (isCockpit || Math.abs(targetCamY - this.camPos.y) > 8.0) {
                this.camPos.x = targetCamX;
                this.camPos.y = targetCamY;
            } else {
                this.camPos.x += (targetCamX - this.camPos.x) * Math.min(1.0, posLerp * dt);
                this.camPos.y += (targetCamY - this.camPos.y) * Math.min(1.0, (isTopDown ? 12.0 : 6.0) * dt);
            }
            this.camPos.z = targetCamZ;

            // 3. Screen shake on collision / wall hit
            let shakeX = 0, shakeY = 0;
            if (state.shakeAmount > 0) {
                state.shakeAmount = Math.max(0, state.shakeAmount - 2.5 * dt);
                state.cameraShake = state.shakeAmount;
                this.cameraShake = state.shakeAmount;
                const shakeScale = isCockpit ? 0.14 : 0.35;
                shakeX = (Math.random() - 0.5) * state.shakeAmount * shakeScale;
                shakeY = (Math.random() - 0.5) * state.shakeAmount * shakeScale;
            }

            // High-speed subtle road vibration (>200 km/h)
            if (state.speed > 200) {
                const vib = ((state.speed - 200) / 140) * (isCockpit ? 0.006 : 0.012);
                shakeX += (Math.random() - 0.5) * vib;
                shakeY += (Math.random() - 0.5) * vib;
            }

            this.camera.position.set(this.camPos.x + shakeX, this.camPos.y + shakeY, this.camPos.z);

            // 4. Stable look-at point:
            // Aligned forward along the camera trajectory so the road ahead does NOT violently whip
            // diagonally across the screen when steering. In drift, adds gentle slide anticipation.
            const driftLookBias = (state.isDrifting && !isHood && !isTopDown && !isCockpit) ? state.yawAngle * 0.16 : 0;
            const targetLookX = isCockpit
                ? (state.x + mode.lookOffset.x * cosYaw + mode.lookOffset.z * sinYaw)
                : (isTopDown ? (state.x * 0.65) : (isHood||mwPortraitChase ? state.x : (this.camPos.x * 0.82 + state.x * 0.18 + driftLookBias)));
            const targetLookY = terrainY+(isCockpit
                ? (mode.lookOffset.y - (state.pitchSquat || 0) * mode.lookOffset.z)
                : (mode.lookOffset.y - (isPortrait && !isHood && !isTopDown ? 0.45 : 0)));
            const targetLookZ = isCockpit
                ? (state.z - mode.lookOffset.x * sinYaw + mode.lookOffset.z * cosYaw)
                : (state.z + mode.lookOffset.z);

            const lookLerp = isCockpit ? 24.0 : ((isHood || isTopDown) ? 16.0 : 6.5);
            if (isCockpit) {
                this.camLook.x = targetLookX;
            } else {
                this.camLook.x += (targetLookX - this.camLook.x) * Math.min(1.0, lookLerp * dt);
            }
            this.camLook.y = targetLookY;
            this.camLook.z = targetLookZ;

            this.camera.lookAt(this.camLook);

            // 5. Cinematic camera banking roll:
            // Smoothly damped and clamped to realistic tilt (max ~3 deg / 0.052 rad in chase, ~0.8 deg in hood/topdown/cockpit).
            // Completely eliminates abrupt jerks, violent swaying, and horizon rocking.
            const maxCamRoll = (isHood || isTopDown || isCockpit) ? 0.018 : 0.052;
            const targetRoll = Math.max(-maxCamRoll, Math.min(maxCamRoll, -state.vx * 0.0032));
            this.camRoll = (this.camRoll || 0) + (targetRoll - (this.camRoll || 0)) * Math.min(1.0, 5.0 * dt);
            this.camera.rotateZ(this.camRoll);

            // 6. Dynamic FOV warp with speed & nitro + Speedbreaker bullet-time zoom
            const speedRatio = Math.min(1.0, state.speed / state.maxSpeed);
            let targetFov = mode.fov + (speedRatio * (isCockpit ? 8 : 14)) + (state.isNitroActive ? (isCockpit ? 4 : 7) : 0) - (state.isSpeedbreakerActive ? 7 : 0);
            if (this.vfx && typeof this.vfx.enhanceCameraFOV === 'function') {
                targetFov = this.vfx.enhanceCameraFOV(targetFov, state);
            }
            this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, 5.0 * dt);
            if (Math.abs(this.camera.fov - (this._lastCameraFov || 0)) > 0.05) {
                this._lastCameraFov = this.camera.fov;
                this.camera.updateProjectionMatrix();
            }

            // Starfield follows camera Z
            if (this.starfield) {
                this.starfield.position.z = state.z;
            }
        }

        spawnDriftSmoke(dt) {
            if (this.vfx && typeof this.vfx.spawnDriftSmoke === 'function') {
                this.vfx.spawnDriftSmoke(dt);
                return;
            }
            const THREE = this.THREE;
            if (Math.random() < 0.6 && this.smokeParticles.length < 25) {
                const smokeColorMap = {
                    white: 0xd1d5db,
                    blue: 0x38bdf8,
                    red: 0xef4444,
                    purple: 0xc084fc,
                    gold: 0xfbbf24,
                    green: 0x22c55e
                };
                const rawSmokeCol = this.styling && this.styling.smokeColor;
                const smokeHex = smokeColorMap[rawSmokeCol] || parseColor(rawSmokeCol, 0xd1d5db);
                const geo = this.sharedSmokeGeo || new THREE.SphereGeometry(0.24, 6, 6);
                const mat = this.sharedSmokeMat ? this.sharedSmokeMat.clone() : new THREE.MeshBasicMaterial({
                    color: smokeHex,
                    transparent: true,
                    opacity: 0.48
                });
                if (mat.color && typeof mat.color.setHex === 'function') {
                    mat.color.setHex(smokeHex);
                }
                const smoke = new THREE.Mesh(geo, mat);
                smoke.position.set(this.state.x + (Math.random() - 0.5) * 1.4, 0.2, this.state.z - 1.8);
                smoke.userData = { life: 0.55, maxLife: 0.55 };
                this.scene.add(smoke);
                this.smokeParticles.push(smoke);
            }
        }

        updateSmokeParticles(dt) {
            for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
                const p = this.smokeParticles[i];
                p.userData.life -= dt;
                p.scale.addScalar(dt * 3.5);
                p.position.y += dt * 0.6;
                if (p.material) {
                    p.material.opacity = Math.max(0, (p.userData.life / p.userData.maxLife) * 0.45);
                }
                if (p.userData.life <= 0) {
                    this.scene.remove(p);
                    if (p.material && p.material !== this.sharedSmokeMat && p.material !== this.sharedSprayMat && typeof p.material.dispose === 'function') {
                        p.material.dispose();
                    }
                    this.smokeParticles.splice(i, 1);
                }
            }
        }

        spawnSparks(x, y, z, count = 8) {
            if (this.vfx && typeof this.vfx.spawnSparks === 'function') {
                this.vfx.spawnSparks(x, y, z, count);
                return;
            }
            const THREE = this.THREE;
            const forwardSpeedMps = (this.state.speed || 0) / 3.6;
            const geo = this.sharedSparkGeo || new THREE.BoxGeometry(0.06, 0.06, 0.06);
            const mat = this.sharedSparkMat || new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

            const actualCount = Math.min(count, Math.max(2, 40 - this.sparkParticles.length));
            for (let i = 0; i < actualCount; i++) {
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4);
                mesh.userData = {
                    vx: (Math.random() - 0.5) * 8.0,
                    vy: 1.5 + Math.random() * 4.0,
                    vz: -forwardSpeedMps * 0.3 + (Math.random() - 0.5) * 6.0,
                    life: 0.35
                };
                this.scene.add(mesh);
                this.sparkParticles.push(mesh);
            }
        }

        notifyHUD() {
            if (!this.options.onUpdateHUD) return;
            const state = this.state;

            // Transmission gear (D1 - D7)
            const gearNum = Math.max(1, Math.min(7, state.gear || 1));
            const gear = 'D' + gearNum;

            // Tachometer / RPM
            const rpm = Math.round(state.rpm || 1000);
            const idleRpm = state.idleRpm || 1000;
            const maxRpm = state.maxRpm || 8500;
            const rpmRange = maxRpm - idleRpm || 1;
            const rpmPercent = Math.min(100, Math.max(0, Math.round(((rpm - idleRpm) / rpmRange) * 100)));

            const curPreset = this.getWeatherPreset(this.currentActiveWeather);

            this.options.onUpdateHUD({
                mode: this.mode,
                speed: Math.round(state.speed),
                gear: gear,
                rpm: rpm,
                maxRpm: maxRpm,
                rpmPercent: rpmPercent,
                distanceKm: state.distanceKm,
                earnedCash: state.earnedCash,
                fuelCurrent: state.fuelCurrent,
                nitroLevel: Math.round(state.nitroLevel),
                isNitroActive: state.isNitroActive,
                speedbreakerCharge: Math.round(state.speedbreakerCharge || 0),
                isSpeedbreakerActive: !!state.isSpeedbreakerActive,
                position: state.position || 1,
                totalRacers: state.totalRacers || 4,
                currentLap: state.currentLap || 1,
                totalLaps: state.totalLaps || 2,
                lapTimeSec: state.lapTimeSec || 0,
                bestLapTimeSec: state.bestLapTimeSec || 0,
                isHypersonic: !!state.isHypersonic,
                currentBiome: this.currentBiome || 'highway',
                driftScore: Math.round(state.driftScore),
                driftCombo: state.driftCombo,
                isDrifting: state.isDrifting,
                overtakesCount: state.overtakesCount,
                overtakeCombo: state.overtakeCombo,
                nearMissCount: this.nearMissCount || 0,
                shashkiCombo: this.shashkiCombo || 0,
                isDrafting: !!state.isDrafting,
                damageTaken: Math.round(state.damageTaken || 0),
                hullIntegrity: Math.max(0, 100 - Math.round(state.damageTaken || 0)),
                cameraMode: this.cameraMode,
                weather: this.currentActiveWeather,
                weatherIcon: curPreset ? curPreset.icon : '🌃',
                weatherTitle: curPreset ? curPreset.name : 'Ночь',
                weatherMode: this.weatherMode,
                wantedStars: state.wantedStars || 0,
                policeIntegrity: state.nearestPoliceIntegrity??null,
                isPursuitActive: !!state.isPursuitActive,
                escapeTimer: Math.max(0, Number((state.escapeTimer || 0).toFixed(1))),
                escapePercent: state.wantedStars > 0 ? Math.min(100, Math.max(0, Math.round(((8.0 - (state.escapeTimer || 0)) / 8.0) * 100))) : 0,
                nearestPoliceDist: Math.round(state.nearestPoliceDist || 999),
                bustedTimer: Number((state.bustedTimer || 0).toFixed(1)),
                isBusted: !!state.isBusted
            });
        }

        getState() {
            return Object.assign({}, this.state);
        }

        render() {
            if (this.renderer && this.scene && this.camera) {
                window.NomeraScenePerf?.render(this);
                this.vehicleLodTelemetry=window.NomeraVehicleLOD?.updateScene(window.THREE,this.scene,this.camera,this.renderer);
                window.NomeraPlayerRender?.render(this);
                if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraLivery?.update(this.scene);this.renderer.render(this.scene, this.camera);
            }
        }

        bindResize() {
            this._onResize = () => {
                if (!this.container || !this.renderer || !this.camera) return;
                const rect = (typeof this.container.getBoundingClientRect === 'function') ? this.container.getBoundingClientRect() : null;
                const w = Math.floor(rect && rect.width ? rect.width : (this.container.clientWidth || 800));
                const h = Math.floor(rect && rect.height ? rect.height : (this.container.clientHeight || 500));
                if (w > 0 && h > 0) {
                    if (this.width === w && this.height === h) return;
                    this.width = w;
                    this.height = h;
                    this.camera.aspect = w / h;
                    this.camera.updateProjectionMatrix();
                    this.renderer.setSize(w, h, false);
                }
            };
            this._onOrientationChange = () => {
                setTimeout(() => { if (this._onResize) this._onResize(); }, 120);
            };
            if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                window.addEventListener('resize', this._onResize);
                window.addEventListener('orientationchange', this._onOrientationChange);
            }
            if (typeof ResizeObserver !== 'undefined' && this.container) {
                try {
                    this._resizeObserver = new ResizeObserver(() => {
                        if (this._onResize) this._onResize();
                    });
                    this._resizeObserver.observe(this.container);
                } catch (_) {}
            }
        }

        onResize() {
            if (this._onResize) this._onResize();
        }

        destroy() {
            this.authorsRecoverButton?.remove();this.authorsRecoverButton=null;
            if(window.NOMERA_AUTHORS_PREVIEW)window.NomeraScene?.destroy(this);
            this._destroyed = true;
            if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)window.NomeraWheelRig?.cancelAll();
            this.stop();
            this.clearNfsCircuitEntities();
            if (this._resizeObserver) {
                try { this._resizeObserver.disconnect(); } catch (_) {}
                this._resizeObserver = null;
            }
            if (this.helicopterLight) {
                try {
                    if (this.helicopterLight.target && this.helicopterLight.target.parent) this.helicopterLight.target.parent.remove(this.helicopterLight.target);
                    if (this.helicopterLight.parent) this.helicopterLight.parent.remove(this.helicopterLight);
                } catch (_) {}
                this.helicopterLight = null;
            }
            if (this._onResize && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
                window.removeEventListener('resize', this._onResize);
            }
            if (this._onOrientationChange && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
                window.removeEventListener('orientationchange', this._onOrientationChange);
            }
            if (this.vfx) {
                try { this.vfx.destroy(); } catch (_) {}
                this.vfx = null;
            }
            if (this.sharedSparkGeo) { try { this.sharedSparkGeo.dispose(); } catch (_) {} this.sharedSparkGeo = null; }
            if (this.sharedSparkMat) { try { this.sharedSparkMat.dispose(); } catch (_) {} this.sharedSparkMat = null; }
            if (this.sharedSmokeGeo) { try { this.sharedSmokeGeo.dispose(); } catch (_) {} this.sharedSmokeGeo = null; }
            if (this.sharedSmokeMat) { try { this.sharedSmokeMat.dispose(); } catch (_) {} this.sharedSmokeMat = null; }
            if (this.sharedSprayGeo) { try { this.sharedSprayGeo.dispose(); } catch (_) {} this.sharedSprayGeo = null; }
            if (this.sharedSprayMat) { try { this.sharedSprayMat.dispose(); } catch (_) {} this.sharedSprayMat = null; }
            if (this.catsEyeGeo) { try { this.catsEyeGeo.dispose(); } catch (_) {} this.catsEyeGeo = null; }
            if (this.catsEyeWhiteMat) { try { this.catsEyeWhiteMat.dispose(); } catch (_) {} this.catsEyeWhiteMat = null; }
            if (this.catsEyeAmberMat) { try { this.catsEyeAmberMat.dispose(); } catch (_) {} this.catsEyeAmberMat = null; }
            if (this.kmSignBoardGeo) { try { this.kmSignBoardGeo.dispose(); } catch (_) {} this.kmSignBoardGeo = null; }
            if (this.chevronSignGeo) { try { this.chevronSignGeo.dispose(); } catch (_) {} this.chevronSignGeo = null; }
            if (this.buildingBoxGeo) { try { this.buildingBoxGeo.dispose(); } catch (_) {} this.buildingBoxGeo = null; }
            if (this.buildingWinGeo) { try { this.buildingWinGeo.dispose(); } catch (_) {} this.buildingWinGeo = null; }
            if (this.archPylonGeo) { try { this.archPylonGeo.dispose(); } catch (_) {} this.archPylonGeo = null; }
            if (this.archBeamGeo) { try { this.archBeamGeo.dispose(); } catch (_) {} this.archBeamGeo = null; }
            if (this.ledMatrixMat) { try { this.ledMatrixMat.dispose(); } catch (_) {} this.ledMatrixMat = null; }
            if (this.ledAmberMat) { try { this.ledAmberMat.dispose(); } catch (_) {} this.ledAmberMat = null; }
            if (this.chevronSignMat) { try { this.chevronSignMat.dispose(); } catch (_) {} this.chevronSignMat = null; }
            if (this.buildingMat) { try { this.buildingMat.dispose(); } catch (_) {} this.buildingMat = null; }
            if (this.buildingWindowMat) { try { this.buildingWindowMat.dispose(); } catch (_) {} this.buildingWindowMat = null; }
            if (this.scene) {
                try { deepDispose(this.scene); } catch (_) {}
                this.scene = null;
            }
            if (this.renderer) {
                try {
                    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
                    }
                    if (typeof this.renderer.dispose === 'function') {
                        this.renderer.dispose();
                    }
                    if (typeof this.renderer.forceContextLoss === 'function') {
                        this.renderer.forceContextLoss();
                    }
                } catch (_) {}
                this.renderer = null;
            }
            if (this.container) {
                this.container.innerHTML = '';
            }
        }
    }

    return {
        isWebGLAvailable,
        Car3DShowroom,
        createShowroom: (container, options) => new Car3DShowroom(container, options),
        Car3DRacingEngine,
        RaceEffectsManager: RaceEffectsManagerClass,
        buildDetailedCarModel,
        proceduralModelVersions: Object.freeze({camry: 'xv70-1'}),
        identifyCarModel,
        STATIC_3D_THUMBNAILS,
        getStaticThumbnail,
        hasCustomStylingForThumbnail,
        renderSideThumbnail,
        getSideThumbnail,
        loadCarModel,
        preloadCarModel,
        applyStylingToGLTF,
        ensureGLBInteractiveRig,
        applyInteractiveAnglesToModel,
        createUnderglowGroundTexture,
        createCarMaterials,
        createStudioEnvironment,
        applyLicensePlateToModel,
        createLicensePlate,
        formatPlateComponents,
        detectVehicleLightPositions,
        clearThumbnailQueue,
        deepDispose,
        disposeObject3D
    };
}));


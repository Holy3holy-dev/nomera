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

    // Material library factory
    function createCarMaterials(THREE, styling = {}) {
        const bodyHex = parseColor(styling.color, 0xefefef);

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
    function createDetailedWheel(THREE, mats, style = 'stock', scale = 1.0) {
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
        const tireGeo = new THREE.CylinderGeometry(R, R, W, 28);
        tireGeo.rotateZ(Math.PI / 2);
        const tireMat = new THREE.MeshStandardMaterial({
            color: 0x131518,
            roughness: 0.9,
            metalness: 0.05
        });
        const tire = new THREE.Mesh(tireGeo, tireMat);
        spinner.add(tire);

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
        const discMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.3, metalness: 0.95 });
        spinner.add(new THREE.Mesh(discGeo, discMat));

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

    // Russian License Plate parser & formatter
    function formatPlateComponents(rawText) {
        if (!rawText || rawText === 'none' || rawText === 'null') {
            return { main: 'А 777 АА', region: '77', isNone: true };
        }
        let str = String(rawText).trim();
        if (str.includes('|')) {
            const parts = str.split('|');
            const main = parts[0].trim();
            const regStr = parts[1].trim();
            const regMatch = regStr.match(/\d+/);
            const region = regMatch ? regMatch[0] : '77';
            return { main: main || 'А 777 АА', region: region, isNone: false };
        }
        // Match plates with 1-2 letters, 1-4 digits, 1-2 letters, 2-3 digits region (e.g. А777АА77, В2109АЗ63)
        const m = str.match(/^([А-ЯA-Z]{1,2})\s*(\d{1,4})\s*([А-ЯA-Z]{1,2})\s*(\d{2,3})$/i);
        if (m) {
            const l1 = m[1].toUpperCase();
            const digits = m[2];
            const l2 = m[3].toUpperCase();
            const reg = m[4];
            return { main: `${l1} ${digits} ${l2}`, region: reg, isNone: false };
        }
        // Match standard Russian plate prefix
        const m2 = str.match(/^([А-ЯA-Z]?)\s*(\d{1,3})\s*([А-ЯA-Z]{0,2})\s*(\d{2,3})?/i);
        if (m2 && m2[2]) {
            const l1 = (m2[1] || 'А').toUpperCase();
            const digits = m2[2].padStart(3, '0');
            const l2 = (m2[3] || 'АА').toUpperCase();
            const reg = m2[4] || '77';
            return { main: `${l1} ${digits} ${l2}`, region: reg, isNone: false };
        }
        const spaceIdx = str.lastIndexOf(' ');
        if (spaceIdx > 0 && /^\d{2,3}$/.test(str.slice(spaceIdx + 1))) {
            return { main: str.slice(0, spaceIdx).toUpperCase(), region: str.slice(spaceIdx + 1), isNone: false };
        }
        return { main: str.slice(0, 9).toUpperCase(), region: '77', isNone: false };
    }

    // Russian License Plate (A 777 AA | 77 RUS) with high-res crisp canvas texture & tricolor flag
    function createLicensePlate(THREE, text = 'А 777 АА | 77 RUS', isFront = true) {
        const group = new THREE.Group();
        group.name = isFront ? 'FrontLicensePlate' : 'RearLicensePlate';
        group.userData.isLicensePlate = true;

        if (text === null || text === 'none' || text === false) {
            group.visible = false;
            return group;
        }

        const comp = formatPlateComponents(text);
        if (comp.isNone) {
            group.visible = false;
            return group;
        }

        const plateW = 0.54;
        const plateH = 0.12;

        if (typeof document !== 'undefined') {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 128;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // 1. White Crisp Background
                    ctx.fillStyle = '#f8fafc';
                    ctx.fillRect(0, 0, 512, 128);

                    // 2. Outer Embossed Black Border
                    ctx.strokeStyle = '#090d16';
                    ctx.lineWidth = 8;
                    ctx.strokeRect(6, 6, 500, 116);

                    // 3. Region Divider
                    ctx.beginPath();
                    ctx.moveTo(384, 8);
                    ctx.lineTo(384, 120);
                    ctx.lineWidth = 5;
                    ctx.stroke();

                    // 4. Main Plate Text
                    ctx.fillStyle = '#090d16';
                    const mainText = comp.main;
                    const fontSize = mainText.length > 9 ? 56 : 68;
                    ctx.font = `bold ${fontSize}px "Inter", "Arial Black", sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(mainText, 196, 68);

                    // 5. Region Digits
                    const regDigits = comp.region;
                    const regFontSize = regDigits.length > 2 ? 40 : 48;
                    ctx.font = `bold ${regFontSize}px "Inter", "Arial Black", sans-serif`;
                    ctx.fillText(regDigits, 448, 46);

                    // 6. RUS & Russian Flag
                    ctx.font = '800 22px "Inter", sans-serif';
                    ctx.fillText('RUS', 426, 98);

                    const fx = 456, fy = 86, fw = 38, fh = 22;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(fx, fy, fw, 7.2);
                    ctx.fillStyle = '#2563eb';
                    ctx.fillRect(fx, fy + 7.2, fw, 7.2);
                    ctx.fillStyle = '#dc2626';
                    ctx.fillRect(fx, fy + 14.4, fw, 7.6);

                    const tex = new THREE.CanvasTexture(canvas);
                    tex.generateMipmaps = true;
                    tex.minFilter = THREE.LinearMipmapLinearFilter;

                    const meshGeo = new THREE.PlaneGeometry(plateW, plateH);
                    if (!isFront) meshGeo.rotateY(Math.PI);
                    const meshMat = new THREE.MeshStandardMaterial({
                        map: tex,
                        roughness: 0.25,
                        metalness: 0.15
                    });
                    const plateMesh = new THREE.Mesh(meshGeo, meshMat);
                    plateMesh.userData.isLicensePlate = true;
                    group.add(plateMesh);

                    const backGeo = new THREE.BoxGeometry(plateW + 0.02, plateH + 0.02, 0.012);
                    const backMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
                    const back = new THREE.Mesh(backGeo, backMat);
                    back.position.z = isFront ? -0.007 : 0.007;
                    group.add(back);

                    group.userData.plateText = text;
                    return group;
                }
            } catch (_) {}
        }

        const plateGeo = new THREE.BoxGeometry(plateW, plateH, 0.015);
        const plateMat = new THREE.MeshStandardMaterial({ color: 0xfdfdfd, roughness: 0.2, metalness: 0.1 });
        const mesh = new THREE.Mesh(plateGeo, plateMat);
        mesh.userData.isLicensePlate = true;
        group.add(mesh);

        const frameGeo = new THREE.BoxGeometry(plateW + 0.02, plateH + 0.02, 0.012);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.z = isFront ? -0.003 : 0.003;
        group.add(frame);

        group.userData.plateText = text;
        return group;
    }

    // Universal License Plate attacher/updater for procedural & GLTF 3D models
    function applyLicensePlateToModel(THREE, modelRoot, plateText) {
        if (!modelRoot) return;

        let text = (typeof plateText === 'object' && plateText) ? plateText.text : plateText;
        const isNone = (text === null || text === 'none' || text === false || text === '');

        // 1. Search for existing plates
        let frontPlates = [];
        let rearPlates = [];
        modelRoot.traverse(child => {
            if (child.name === 'FrontLicensePlate' || child.name === 'GLB_FrontLicensePlate') {
                frontPlates.push(child);
            }
            if (child.name === 'RearLicensePlate' || child.name === 'GLB_RearLicensePlate') {
                rearPlates.push(child);
            }
        });

        if (isNone) {
            frontPlates.forEach(p => { p.visible = false; });
            rearPlates.forEach(p => { p.visible = false; });
            return;
        }

        // 2. If plates already exist, update them with new text
        if (frontPlates.length > 0 || rearPlates.length > 0) {
            frontPlates.forEach(oldFP => {
                oldFP.visible = true;
                const newFP = createLicensePlate(THREE, text, true);
                while (oldFP.children.length > 0) {
                    oldFP.remove(oldFP.children[0]);
                }
                while (newFP.children.length > 0) {
                    oldFP.add(newFP.children[0]);
                }
                oldFP.userData.plateText = text;
            });

            rearPlates.forEach(oldRP => {
                oldRP.visible = true;
                const newRP = createLicensePlate(THREE, text, false);
                while (oldRP.children.length > 0) {
                    oldRP.remove(oldRP.children[0]);
                }
                while (newRP.children.length > 0) {
                    oldRP.add(newRP.children[0]);
                }
                oldRP.userData.plateText = text;
            });
            return;
        }

        // 3. If plates do NOT exist (e.g. fresh GLTF model like Ferrari, BMW, etc.)
        modelRoot.updateMatrixWorld(true);
        const box = new THREE.Box3();
        modelRoot.traverse(child => {
            if (child.isMesh && child.visible && child.geometry) {
                const mb = new THREE.Box3().setFromObject(child);
                if (mb.max.y - mb.min.y > 0.05) {
                    box.union(mb);
                }
            }
        });
        if (box.isEmpty()) box.setFromObject(modelRoot);

        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const frontY = box.min.y + Math.max(0.18, Math.min(0.55, size.y * 0.22));
        const rearY = box.min.y + Math.max(0.24, Math.min(0.65, size.y * 0.28));
        const frontZ = box.max.z + 0.015;
        const rearZ = box.min.z - 0.015;

        const fp = createLicensePlate(THREE, text, true);
        fp.name = 'GLB_FrontLicensePlate';
        fp.position.set(center.x, frontY, frontZ);
        modelRoot.add(fp);

        const rp = createLicensePlate(THREE, text, false);
        rp.name = 'GLB_RearLicensePlate';
        rp.position.set(center.x, rearY, rearZ);
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

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.33, wheelTrack: W * 0.48, wheelR: 0.32, defaultWheels: 'stamps' };
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
            const L = 4.42, W = 1.84, H = 0.52;
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

            const wsGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.86, 0.05);
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

            // MASSIVE CAMRY XV70 LOWER BUMPER GRILLE WITH WIDE HORIZONTAL FINS
            const grilleGeo = new THREE.BoxGeometry(W * 0.82, H * 0.48, 0.08);
            const grille = new THREE.Mesh(grilleGeo, mats.darkPlastic);
            grille.position.set(0, baseY + H * 0.34, L * 0.504);
            root.add(grille);

            for (let i = -2; i <= 2; i++) {
                const finGeo = new THREE.BoxGeometry(W * 0.78, 0.015, 0.02);
                const fin = new THREE.Mesh(finGeo, mats.trim);
                fin.position.set(0, baseY + H * 0.34 + i * 0.045, L * 0.546);
                root.add(fin);
            }

            // Sharp Bi-Beam LED Headlights with triple-slash DRL ribbons
            [-1, 1].forEach(side => {
                const hlGeo = new THREE.BoxGeometry(W * 0.22, 0.09, 0.16);
                hlGeo.rotateY(side * Math.PI / 20);
                const hl = new THREE.Mesh(hlGeo, mats.headlightLED);
                hl.position.set(side * W * 0.36, baseY + H * 0.62, L * 0.47);
                root.add(hl);
            });

            const beakGeo = new THREE.BoxGeometry(W * 0.32, 0.04, 0.06);
            const beak = new THREE.Mesh(beakGeo, mats.chrome);
            beak.position.set(0, baseY + H * 0.64, L * 0.508);
            root.add(beak);

            [-1, 1].forEach(side => {
                const tlGeo = new THREE.BoxGeometry(W * 0.26, 0.10, 0.06);
                const tl = new THREE.Mesh(tlGeo, mats.taillightRed);
                tl.position.set(side * W * 0.35, baseY + H * 0.56, -L * 0.503);
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

            const fp = createLicensePlate(THREE, 'К 070 КК | 777 RUS', true);
            fp.position.set(0, baseY + 0.14, L * 0.51);
            root.add(fp);

            const rp = createLicensePlate(THREE, 'К 070 КК | 777 RUS', false);
            rp.position.set(0, baseY + H * 0.36, -L * 0.505);
            root.add(rp);

            return { root, bodyLength: L, bodyWidth: W, wheelBase: L * 0.34, wheelTrack: W * 0.49, wheelR: 0.33 };
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
                hlPod.position.set(side * (W * 0.35), baseY + H * 0.92, L * 0.38);
                root.add(hlPod);

                // 4-Point Matrix LED DRL points
                [-0.04, 0.04].forEach(dx => {
                    [-0.04, 0.04].forEach(dy => {
                        const ptGeo = new THREE.BoxGeometry(0.018, 0.018, 0.02);
                        const pt = new THREE.Mesh(ptGeo, mats.chrome);
                        pt.position.set(side * (W * 0.35) + dx, baseY + H * 0.92 + dy, L * 0.41);
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

        const mats = createCarMaterials(THREE, styling);
        const carId = identifyCarModel(carName);

        // Suspension ride height offset
        let suspensionOffsetY = 0;
        if (styling.suspension === 'bpan') {
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
            applyLicensePlateToModel(THREE, spec.root, styling.plate);
        }

        // Tuning: Spoilers
        const spoilerGroup = new THREE.Group();
        spoilerGroup.name = 'SpoilerGroup';
        chassisGroup.add(spoilerGroup);

        const trunkY = 0.34 + 0.55 * 0.94;
        const trunkZ = -spec.bodyLength * 0.502 + 0.30;

        if (styling.spoiler === 'ducktail') {
            const duckGeo = new THREE.BoxGeometry(spec.bodyWidth * 0.78, 0.08, 0.22);
            duckGeo.rotateX(Math.PI / 8);
            const duck = new THREE.Mesh(duckGeo, mats.trim);
            duck.position.set(0, trunkY + 0.05, trunkZ);
            spoilerGroup.add(duck);
        } else if (styling.spoiler === 'high') {
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
        } else if (styling.spoiler === 'gt') {
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

        // Tuning: SGU Strobe Lights (Roof flasher bar)
        const sguGroup = new THREE.Group();
        sguGroup.name = 'SGUGroup';
        chassisGroup.add(sguGroup);

        if (styling.sgu && styling.sgu !== 'none') {
            const barGeo = new THREE.BoxGeometry(spec.bodyWidth * 0.55, 0.06, 0.12);
            const barMesh = new THREE.Mesh(barGeo, mats.trim);
            barMesh.position.set(0, 0.34 + 0.55 + 0.50 + 0.03, -0.10);
            sguGroup.add(barMesh);

            const blueGeo = new THREE.BoxGeometry(spec.bodyWidth * 0.24, 0.05, 0.10);
            const blueMat = new THREE.MeshStandardMaterial({
                color: 0x0088ff,
                emissive: 0x0088ff,
                emissiveIntensity: 0.9,
                name: 'SGU_Blue'
            });
            const blueStrobe = new THREE.Mesh(blueGeo, blueMat);
            blueStrobe.position.set(-spec.bodyWidth * 0.13, 0.34 + 0.55 + 0.50 + 0.04, -0.10);
            sguGroup.add(blueStrobe);

            const redGeo = new THREE.BoxGeometry(spec.bodyWidth * 0.24, 0.05, 0.10);
            const redMat = new THREE.MeshStandardMaterial({
                color: 0xff0044,
                emissive: 0xff0044,
                emissiveIntensity: 0.9,
                name: 'SGU_Red'
            });
            const redStrobe = new THREE.Mesh(redGeo, redMat);
            redStrobe.position.set(spec.bodyWidth * 0.13, 0.34 + 0.55 + 0.50 + 0.04, -0.10);
            sguGroup.add(redStrobe);
        }

        // Tuning: Neon Underglow Tubes
        const neonGroup = new THREE.Group();
        neonGroup.name = 'NeonGroup';
        chassisGroup.add(neonGroup);

        if (styling.neon && styling.neon !== 'none') {
            const neonCol = parseColor(styling.neon, 0x00f0ff);
            const neonMat = new THREE.MeshStandardMaterial({
                color: neonCol,
                emissive: neonCol,
                emissiveIntensity: 1.2,
                roughness: 0.1
            });

            [-1, 1].forEach(side => {
                const tubeGeo = new THREE.CylinderGeometry(0.02, 0.02, spec.bodyLength * 0.65, 8);
                tubeGeo.rotateX(Math.PI / 2);
                const tube = new THREE.Mesh(tubeGeo, neonMat);
                tube.position.set(side * (spec.bodyWidth * 0.44), 0.14, 0);
                neonGroup.add(tube);
            });
        }

        // 4 Wheels Assembly (Fixed to ground height, not affected by chassis drop)
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

        // Front Left
        const wFL = createDetailedWheel(THREE, mats, wheelStyle, wRadius / 0.33);
        wFL.position.set(-spec.wheelTrack, wCenterY, spec.wheelBase);
        wFL.rotation.y = Math.PI;
        wFL.userData.isSteerable = true;
        wFL.userData.side = -1;
        wFL.userData.baseRotY = Math.PI;
        wheelsRig.add(wFL);

        // Front Right
        const wFR = createDetailedWheel(THREE, mats, wheelStyle, wRadius / 0.33);
        wFR.position.set(spec.wheelTrack, wCenterY, spec.wheelBase);
        wFR.userData.isSteerable = true;
        wFR.userData.side = 1;
        wFR.userData.baseRotY = 0;
        wheelsRig.add(wFR);

        // Rear Left
        const wRL = createDetailedWheel(THREE, mats, wheelStyle, wRadius / 0.33);
        wRL.position.set(-spec.wheelTrack, wCenterY, -spec.wheelBase);
        wRL.rotation.y = Math.PI;
        wRL.userData.side = -1;
        wRL.userData.baseRotY = Math.PI;
        wheelsRig.add(wRL);

        // Rear Right
        const wRR = createDetailedWheel(THREE, mats, wheelStyle, wRadius / 0.33);
        wRR.position.set(spec.wheelTrack, wCenterY, -spec.wheelBase);
        wRR.userData.side = 1;
        wRR.userData.baseRotY = 0;
        wheelsRig.add(wRR);

        return root;
    }

    // =========================================================================
    // 🚘 GLB / GLTF REAL 3D MODEL LOADER & STYLING ENGINE
    // =========================================================================
    const GLB_MODEL_MAP = {
        // Budget & Classic Russian
        vaz2107: './assets/models/vaz2107.glb',       // Real VAZ-2107 «Жигули» (57.45 MB, 724 meshes)
        vaz2109: './assets/models/vaz2109.glb',       // Authentic VAZ-2109 «Девятка» (3.83 MB)
        gaz24: './assets/models/gaz24.glb',           // Authentic GAZ-24 «Волга» (6.28 MB)
        priora: './assets/models/priora.glb',         // Authentic Lada Priora (6.33 MB)
        vesta: './assets/models/vesta.glb',           // Authentic Lada Vesta Sport (7.15 MB)
        solaris: './assets/models/sonata.glb',        // Authentic Hyundai 4-door sedan (36.16 MB)
        polo: './assets/models/golf7.glb',            // Real 2014 Volkswagen Golf GTI (2.4 MB, 98k polygons)

        // JDM & Sport Legends
        mark2: './assets/models/mark2.glb',          // Authentic Toyota Mark II JZX100 (599 KB)
        subaru: './assets/models/subaru_wrx.glb',     // Authentic Subaru Impreza WRX STI sports sedan (3.79 MB)
        m5e60: './assets/models/bmw_m3_sedan.glb',   // Real BMW M Sport Sedan with quad exhausts (47.63 MB)
        silvia: './assets/models/nissan_370z.glb',    // Real Nissan Z34 JDM Drift Sport Coupe (3.54 MB)
        camry: './assets/models/arrizo8.glb',         // Real Executive Business Sedan (3.69 MB)
        lc300: './assets/models/lc300.glb',           // Real 2022 Toyota Land Cruiser 300 VX.R (16.89 MB)
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

    const rawGLBCache = new Map();

    function getGLTFLoader(THREE) {
        if (!THREE.GLTFLoader) return null;
        if (THREE._nomeraGLTFLoader) return THREE._nomeraGLTFLoader;
        const loader = new THREE.GLTFLoader();
        if (THREE.DRACOLoader) {
            const draco = new THREE.DRACOLoader();
            draco.setDecoderPath('./js/vendor/draco/');
            loader.setDRACOLoader(draco);
        }
        if (typeof window !== 'undefined' && window.MeshoptDecoder) {
            if (window.MeshoptDecoder.ready) {
                window.MeshoptDecoder.ready.then(() => {
                    loader.setMeshoptDecoder(window.MeshoptDecoder);
                }).catch(() => {
                    loader.setMeshoptDecoder(window.MeshoptDecoder);
                });
            } else {
                loader.setMeshoptDecoder(window.MeshoptDecoder);
            }
        }
        THREE._nomeraGLTFLoader = loader;
        return loader;
    }

    function applyStylingToGLTF(THREE, modelRoot, styling = {}, carId = '') {
        const bodyColorHex = parseColor(styling.color, 0xefefef);
        const mats = createCarMaterials(THREE, styling);

        let suspensionOffsetY = 0;
        if (styling.suspension === 'bpan' || (!styling.suspension && carId === 'priora')) suspensionOffsetY = -0.06;
        else if (styling.suspension === 'lowered') suspensionOffsetY = -0.03;
        else if (styling.suspension === 'lift') suspensionOffsetY = 0.06;

        modelRoot.position.y += suspensionOffsetY;

        function isTireMaterial(matName, meshName) {
            const mn = String(matName || '').toLowerCase();
            const ms = String(meshName || '').toLowerCase();
            if (carId === 'subaru' && (ms === 'object_24' || mn === 'material_21')) return true;
            if (carId === 'vaz2107' && (mn === 'tire' || (mn === 'black' && ms.includes('wheel')))) return true;
            if (carId === 'vaz2109' && (mn === 'standardmater50' || mn === 'standardmater52')) return true;
            if (carId === 'gaz24' && (mn === 'rubber' || ms.includes('rubber') || ms.includes('tire'))) return true;
            if (carId === 'priora' && (mn === 'priora_wheel2' || ms.includes('wheel2'))) return true;
            if (carId === 'vesta' && (ms.includes('tire') || ms.includes('rubber') || (mn === 'plastic' && ms.includes('wheel')) || (mn === 'chern' && ms.includes('koles')))) return true;
            if (carId === 'solaris' && (mn === 'camrytire' || ms.includes('tire'))) return true;
            if (carId === 'polo' && (ms.includes('tire') || ms.includes('tyre') || (ms.includes('wheel') && mn.includes('base')))) return true;
            if (carId === 'mark2' && (mn === 'rezina' || (mn === 'black' && (ms.includes('wheel') || ms.includes('tire'))))) return true;
            if (carId === 'm5e60' && (mn === 'tire' || ms.includes('tire'))) return true;
            if (carId === 'silvia' && (mn === 'tire1mtl' || ms.includes('tire'))) return true;
            if (carId === 'camry' && (mn === 'tire' || ms.includes('tire') || mn.includes('b_tire') || ms.includes('hub_tire'))) return true;
            if (carId === 'lc300' && (ms.includes('tire') || ms.includes('rubber'))) return true;
            if (carId === 'gtr' && (ms.includes('tire') || ms.includes('rubber') || mn.includes('tire') || mn.includes('rubber'))) return true;
            if (carId === 'e63' && (mn === 'tyre' || ms.includes('tyre') || ms.includes('tire') || ms.includes('wheel1_tyre') || ms.includes('wheel2_tyre'))) return true;
            if (carId === 'rs6' && (ms.includes('tyre') || ms.includes('tire'))) return true;
            if (carId === 'm5f90' && (ms.includes('tyre') || ms.includes('tire'))) return true;
            if (carId === 'm8' && (ms.includes('tyre') || ms.includes('tire'))) return true;
            if (carId === 'g63' && (mn.includes('performance tyre rubber') || ms.includes('sculpted carcass'))) return true;
            if (carId === 'porsche911' && (mn === 'rubber' || (mn === 'full_black' && ms.includes('wheel')))) return true;
            if (carId === 'huracan' && (mn === 'mt_tyres' || mn.includes('tyre') || (mn.includes('black_mat') && ms.includes('wheel')))) return true;
            if (carId === 'cullinan' && (mn === 'tire' || ms.includes('tire'))) return true;
            if (carId === 'sf90' && (mn === 'tires' || ms === 'wheel')) return true;
            if (carId === 'chiron' && (mn === 'tyre' || ((ms.includes('wheel_fl') || ms.includes('wheel_fr') || ms.includes('wheel_rl') || ms.includes('wheel_rr')) && (mn.includes('tyre') || mn.includes('rubber'))))) return true;
            if (carId === 'jesko' && (mn === 'tyre_rubber' || ms.includes('wheel_fl_tyre') || ms.includes('tyre'))) return true;
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
            if (carId === 'subaru' && (ms === 'object_4' || ms === 'object_16' || mn === 'material_1' || mn === 'material_13')) return true;
            if (carId === 'vaz2109' && mn === 'standardmater48') return true;
            if (carId === 'polo' && mn.includes('callipergloss')) return true;
            if (carId === 'm5e60' && mn === 'etriers') return true;
            if (carId === 'silvia' && (mn === 'caliper1mtl' || mn === 'rotor1mtl')) return true;
            if (carId === 'camry' && (mn === 'breaks' || ms.includes('hub_brake_disc'))) return true;
            if (carId === 'lc300' && mn.includes('tmi_change_brake')) return true;
            if (carId === 'gtr' && mn.includes('brakerotor')) return true;
            if (carId === 'e63' && (ms.includes('wheel1_red_0') || ms.includes('wheel2_red_0'))) return true;
            if (carId === 'rs6' && (mn.includes('armat_details_brake1') || mn.includes('armat_disk1'))) return true;
            if (carId === 'm8' && (mn.includes('calliperbadge') || mn.includes('callipergloss'))) return true;
            if (carId === 'g63' && (mn.includes('amg red caliper enamel') || mn.includes('brushed brake steel'))) return true;
            if (carId === 'huracan' && mn === 'mt_brakecaliper') return true;
            if (carId === 'cullinan' && mn === 'brake_3') return true;
            if (carId === 'sf90' && (ms === 'brake' || ms === 'brakes')) return true;
            if (carId === 'chiron' && (mn === 'caliper' || mn === 'brake_disc')) return true;
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
            if (carId === 'subaru' && (
                ms === 'object_13' || ms === 'object_14' || ms === 'object_18' ||
                ms === 'object_19' || ms === 'object_20' || ms === 'object_21' ||
                mn === 'material_10' || mn === 'material_11' || mn === 'material_15' ||
                mn === 'material_16' || mn === 'material_17' || mn === 'material_18'
            )) return true;
            if (carId === 'vaz2107' && (mn.includes('orange light') || mn.includes('red light') || mn === 'white')) return true;
            if (carId === 'vaz2109' && (mn === 'standardmater7' || mn === 'standardmater3' || mn === 'standardmater5')) return true;
            if (carId === 'gaz24' && (mn === 'orange_plastic' || mn === 'headlight' || mn === 'reverse_lights' || mn === 'tail_lights' || mn === 'reflector')) return true;
            if (carId === 'priora' && (mn === 'priora_optik_rear' || mn === 'priora_red')) return true;
            if (carId === 'vesta' && (mn === 'fari' || mn === 'peredfar' || mn === 'svetplas' || mn === 'stopar')) return true;
            if (carId === 'solaris' && (mn === 'orangeglass' || mn === 'redglass')) return true;
            if (carId === 'polo' && (mn.includes('lighta_material1') || mn === 'red_glass')) return true;
            if (carId === 'mark2' && (mn === 'red1' || mn === 'red2' || mn === 'orange')) return true;
            if (carId === 'm5e60' && (mn.includes('wire_060110190') || mn.includes('wire_087225143') || mn.includes('wire_135110008'))) return true;
            if (carId === 'silvia' && mn.includes('lights1mtl')) return true;
            if (carId === 'camry' && (ms.includes('weideng_red_plastic') || ms.includes('weideng_map_c'))) return true;
            if (carId === 'lc300' && (mn.includes('tmi_glass_light') || mn.includes('tmi_light'))) return true;
            if (carId === 'e63' && (mn === 'bulb' || mn === 'rear_bulb' || mn === 'bulb_red' || ms.includes('bulb'))) return true;
            if (carId === 'rs6' && mn.includes('mat_lights.001')) return true;
            if (carId === 'm5f90' && (ms.includes('headlight') || mn.includes('material_706') || mn.includes('material_701') || mn.includes('material_707') || mn.includes('material_708'))) return true;
            if (carId === 'm8' && (mn.includes('i8elite_2017lighta') || mn === 'emis' || mn === 'red_glass')) return true;
            if (carId === 'g63' && (mn.includes('headlamp optical') || mn.includes('ruby led taillamp') || mn.includes('amber indicator') || mn.includes('light guides') || mn.includes('passive ruby reflector'))) return true;
            if (carId === 'porsche911' && mn === 'lights') return true;
            if (carId === 'huracan' && (mn.includes('mt_headlight') || mn.includes('mt_reflector') || mn.includes('mt_turnlights') || mn.includes('mt_light_emissive'))) return true;
            if (carId === 'cullinan' && (mn.includes('front_lite') || mn.includes('front_head_light') || mn === 'light')) return true;
            if (carId === 'sf90' && (mn === 'taillight_glass' || mn === 'projector_glass' || mn === 'turn_signal_led' || ms === 'lights_red' || ms === 'steering_red_lights')) return true;
            if (carId === 'chiron' && (mn.includes('headlight') || mn.includes('taillight'))) return true;
            if (carId === 'jesko' && (mn === 'light_white' || mn === 'light_red' || ms.includes('frontlight') || ms.includes('taillight'))) return true;
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
            if (carId === 'subaru' && (ms === 'object_25' || mn === 'material_22')) return true;
            if (carId === 'vaz2109' && mn === 'standardmater4') return true;
            if (carId === 'priora' && mn === 'priora_glush') return true;
            if (carId === 'm5e60' && mn === 'chrome_ok' && (ms.includes('exhaust') || ms.includes('pot'))) return true;
            if (carId === 'silvia' && mn.includes('lodaexhaust')) return true;
            if (carId === 'lc300' && mn.includes('tmi_exhaust')) return true;
            if (carId === 'huracan' && (ms.includes('exhaust') || ms.includes('pipes'))) return true;
            if (carId === 'chiron' && mn === 'exhaust') return true;
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
            if (carId === 'subaru' && (ms === 'object_3' || ms === 'object_6' || mn === 'material_0' || mn === 'material_3')) return true;
            if (carId === 'vaz2107' && (mn === 'interior_01' || mn === 'interior_02' || ms.includes('interior_01') || ms.includes('interior_02'))) return true;
            if (carId === 'vaz2109' && (
                mn === 'standardmater32' || mn === 'standardmater34' || mn === 'standardmater35' ||
                mn === 'standardmater36' || mn === 'standardmater37' || mn === 'standardmater10' ||
                mn === 'standardmater12' || mn === 'standardmater13' || mn === 'standardmater14' ||
                mn === 'standardmater15' || mn === 'standardmater16' || mn === 'standardmater17' ||
                mn === 'standardmater8' || mn === 'standardmater9' || mn === 'standardmater18' ||
                mn === 'standardmater39' || mn === 'standardmater41' || mn === 'standardmater43' ||
                mn === 'standardmater44' || mn === 'standardmater54' || mn === 'standardmater57' ||
                mn === 'standardmater59' || mn === 'standardmater62'
            )) return true;
            if (carId === 'gaz24' && (mn.includes('interior') || mn === 'derma')) return true;
            if (carId === 'priora' && (mn.includes('priora_leather') || mn.includes('priora_salon') || mn.includes('priora_prib') || mn.includes('priora_bar') || mn.includes('priora_polik') || mn.includes('priora_pedals') || mn.includes('priora_obivka'))) return true;
            if (carId === 'vesta' && mn === 'kover') return true;
            if (carId === 'polo' && (mn.includes('interiora_material1') || mn.includes('seatbelt'))) return true;
            if (carId === 'mark2' && mn === 'inrteer') return true;
            if (carId === 'm5e60' && (mn.includes('interior') || mn === 'sieges')) return true;
            if (carId === 'silvia' && mn.includes('lodainterior')) return true;
            if (carId === 'camry' && (mn.includes('interior_map') || mn.includes('seats_map') || mn.includes('trunk_map'))) return true;
            if (carId === 'lc300' && (mn.includes('tmi_cabin') || mn.includes('tmi_dashboard'))) return true;
            if (carId === 'e63' && mn === 'interior_plastic') return true;
            if (carId === 'rs6' && mn.includes('mat_details_int')) return true;
            if (carId === 'm8' && (mn.includes('i8elite_2017interior') || mn.includes('interiortillingcolourzone'))) return true;
            if (carId === 'g63' && (mn.includes('anthracite cabin') || mn.includes('deep oxblood nappa') || mn.includes('mbux display'))) return true;
            if (carId === 'huracan' && (mn === 'mt_interior_black' || ms.includes('digital_gauge') || ms.includes('bump_plastic3'))) return true;
            if (carId === 'cullinan' && (mn.includes('interior_side_box') || mn.includes('interior_ac') || mn.includes('inside_button') || mn.includes('car_stearning') || mn.includes('steering_box') || mn.includes('back_speaker'))) return true;
            if (carId === 'sf90' && (mn.includes('leather') || mn.includes('interior') || mn === 'carpet' || ms.includes('steering'))) return true;
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
            if (carId === 'subaru' && (ms === 'object_10' || ms === 'object_22' || mn === 'material_7' || mn === 'material_19')) return true;
            if (carId === 'vaz2107' && (ms.includes('grille') || ms.includes('radiator'))) return true;
            if (carId === 'polo' && (mn.includes('grille1a') || mn.includes('grille2a'))) return true;
            if (carId === 'camry' && ms.includes('qianzhongwang')) return true;
            if (carId === 'lc300' && mn.includes('cabin_grid')) return true;
            if (carId === 'rs6' && mn === 'mat_details_grid01') return true;
            if (carId === 'm8' && mn.includes('i8elite_2017grille')) return true;
            if (carId === 'cullinan' && mn === 'font_grill_cover') return true;
            if (carId === 'chiron' && mn === 'grill') return true;
            if (carId === 'jesko' && (mn === 'hypercar_intakeblack' || ms.includes('intake') || ms.includes('diffuser'))) return true;
            return (
                mn.includes('grille') ||
                mn.includes('grill') ||
                mn.includes('mesh') ||
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

            if (carId === 'subaru' && (ms === 'object_12' || ms === 'object_23' || mn === 'material_9' || mn === 'material_20')) return true;
            if (carId === 'vaz2107' && (mn === 'glass' || ms.includes('object_722_glass'))) return true;
            if (carId === 'vaz2109' && (mn === 'fenster' || ms.includes('fenster'))) return true;
            if (carId === 'gaz24' && (mn.includes('lens') || mn === 'glass')) return true;
            if (carId === 'priora' && (mn.includes('vehglass') || mn.includes('glass') || mn.includes('window'))) return true;
            if (carId === 'vesta' && (mn === 'steklo' || mn === 'stekloton' || mn.includes('windows') || mn.includes('glass'))) return true;
            if (carId === 'solaris' && (mn === 'clearglass' || mn === 'windowglass' || mn === 'darkglass')) return true;
            if (carId === 'polo' && (mn.includes('window_material1') || ms.includes('window_geo') || ms.includes('windowinside'))) return true;
            if (carId === 'mark2' && (mn === 'glass' || mn.includes('window') || mn.includes('glass'))) return true;
            if (carId === 'm5e60' && (mn === 'glass' || mn === 'glass_toit' || mn === 'r_glass')) return true;
            if (carId === 'silvia' && mn.includes('windows1mtl')) return true;
            if (carId === 'camry' && (ms.includes('d_glass') || ms.includes('weideng_glass_light'))) return true;
            if (carId === 'lc300' && mn === 'tmi_glass_011') return true;
            if (carId === 'gtr' && mn === 'マテリアル.653') return true;
            if (carId === 'e63' && (mn === 'glass' || ms.includes('body_glass'))) return true;
            if (carId === 'rs6' && mn === 'mat_glass') return true;
            if (carId === 'm5f90' && (ms.includes('glsslight') || mn === 'material_161' || mn === 'material_716' || mn === 'material_717' || mn === 'material_718')) return true;
            if (carId === 'm8' && mn.includes('i8elite_2017window')) return true;
            if (carId === 'g63' && (mn.includes('tinted automotive glass') || mn.includes('privacy rear glazing'))) return true;
            if (carId === 'porsche911' && (mn === 'window' || mn === 'glass')) return true;
            if (carId === 'huracan' && (mn === 'mt_windscreens' || mn === 'mt_glass_translucent')) return true;
            if (carId === 'cullinan' && (mn === 'car_glass' || mn.includes('glass_rim'))) return true;
            if (carId === 'sf90' && mn === 'glass_gray') return true;
            if (carId === 'chiron' && (mn === 'glass_window' || mn === 'mirror_glass')) return true;
            if (carId === 'jesko' && (mn === 'glass_darktint' || ms.includes('canopy'))) return true;

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

            if (carId === 'subaru' && (ms === 'object_15' || mn === 'material_12')) return true;
            if (carId === 'vaz2107' && (mn === 'silver' || (mn === 'chrome' && ms.includes('wheel')))) return true;
            if (carId === 'vaz2109' && (mn === 'standardmater46' || mn === 'standardmater47' || mn === 'standardmater49')) return true;
            if (carId === 'gaz24' && (mn === 'wheel' || mn === 'steel')) return true;
            if (carId === 'priora' && mn === 'priora_wheel5') return true;
            if (carId === 'vesta' && (mn === 'disk' || ms.includes('wheel_disk'))) return true;
            if (carId === 'solaris' && (mn === 'camryrim' || mn === 'hubcaps')) return true;
            if (carId === 'polo' && mn.includes('3dwheel1a_material1')) return true;
            if (carId === 'mark2' && (mn === 'chrome' || mn === 'chrome2') && (ms.includes('wheel') || ms.includes('rim') || ms === 'object_3' || ms === 'object_4' || ms === 'object_5')) return true;
            if (carId === 'm5e60' && mn === 'alum') return true;
            if (carId === 'silvia' && mn === 'rim1mtl') return true;
            if (carId === 'camry' && (mn.includes('metal_r') || ms.includes('hub_metal') || (mn === 'metal' && ms.includes('hub')))) return true;
            if (carId === 'lc300' && mn.includes('rimmi_changea_rim')) return true;
            if (carId === 'e63' && (mn === 'metallic_rim' || ms.includes('metallic rim'))) return true;
            if (carId === 'rs6' && mn.includes('audi_rs3sedanrewardrecycled_2023_wheel1a')) return true;
            if (carId === 'm5f90' && ms.includes('wheel') && !ms.includes('tyre')) return true;
            if (carId === 'm8' && mn.includes('bmw_i8rewardrecycled_2017_wheel1a')) return true;
            if (carId === 'g63' && mn.includes('graphite forged alloy')) return true;
            if (carId === 'porsche911' && (mn === 'silver' || (mn === 'material.001' && ms.includes('wheel')))) return true;
            if (carId === 'huracan' && mn === 'mt_alloywheels') return true;
            if (carId === 'cullinan' && mn === 'mettal_in_w') return true;
            if (carId === 'sf90' && (ms.startsWith('rim_') || (mn === 'metal_gray' && ms.includes('rim')))) return true;
            if (carId === 'chiron' && (mn === 'rim' || mn === 'rim_accent' || mn === 'wheel_nut')) return true;
            if (carId === 'jesko' && (mn === 'wheel_disc' || ms.includes('wheel_fl_disc') || ms.includes('wheel_fl_ring') || ms.includes('wheel_fl_cap'))) return true;

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

        function isBodyMaterial(matName, meshName) {
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

            if (carId === 'subaru') {
                return (
                    ms === 'object_2' || ms === 'object_7' || ms === 'object_8' || ms === 'object_9' || ms === 'object_17' || ms === 'object_28' ||
                    mn === 'material_26' || mn === 'material_4' || mn === 'material_5' || mn === 'material_6' || mn === 'material_14' || mn === 'material_25'
                );
            }
            if (carId === 'vaz2107') return mn === 'body' || ms.includes('object_128_body') || ms.includes('_body_');
            if (carId === 'vaz2109') return mn === '2109' || ms.endsWith('_2109_0');
            if (carId === 'gaz24') return mn === 'paint_new' || mn === 'paint' || mn === 'body' || mn === 'black_paint';
            if (carId === 'priora') return mn.includes('priora_skin') || mn.includes('priora_mirr') || mn === 'carpaint' || mn.includes('paint');
            if (carId === 'vesta') return mn === 'kuzov' || ms.includes('kuzov_kuzov_0');
            if (carId === 'solaris') return mn === 'carpaint' || mn.includes('carpaint');
            if (carId === 'polo') return mn.includes('golfgti_2014paint');
            if (carId === 'mark2') return mn === 'metall' || mn.includes('paint');
            if (carId === 'm5e60') return mn === 'body' || ms.includes('body_body');
            if (carId === 'silvia') return mn === 'meshpart1mtl' || mn.includes('lodarearbumpermmext1');
            if (carId === 'camry') return mn === 'carpaint' || ms.includes('carpaint');
            if (carId === 'lc300') return mn === 'phong1' || mn.includes('1350010001');
            if (carId === 'gtr') return mn === 'bodycolor';
            if (carId === 'e63') return mn === 'body' || ms === 'body_body_0';
            if (carId === 'rs6') return mn.includes('rs3_2018_base') || (mn === 'material' && ms === 'car');
            if (carId === 'm5f90') return mn === 'material_692' || mn === 'material_697' || ms.includes('body_material #692') || ms.includes('body_material #697');
            if (carId === 'm8') return mn.includes('i8elite_2017paint') || mn.includes('i8elite_2017coloured');
            if (carId === 'g63') return mn.includes('monza grey satin') || mn.includes('manufaktur');
            if (carId === 'porsche911') return mn === 'paint' || mn === 'coat' || ms.includes('boot') || ms.includes('bumper');
            if (carId === 'huracan') return mn === 'mt_body' || ms.includes('mesh_boot') || ms.includes('mesh_bumper') || ms.includes('mesh_hood') || ms.includes('mesh_door');
            if (carId === 'cullinan') return mn === 'car_body_in';
            if (carId === 'sf90') return mn === 'body_color' || mn === '_0098_dodgerblue';
            if (carId === 'chiron') return mn === 'paint_primary' || mn === 'paint_secondary';
            if (carId === 'jesko') return mn === 'paint_satingraphite' || ms.includes('hypercar_body');

            return (
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
            );
        }

        modelRoot.traverse(child => {
            const mName = String(child.name || '').toLowerCase();
            // Automatically hide any stray manufacturer badge/logo planes on base models
            if (mName.includes('logo_plane') || mName.includes('emblem') || mName.includes('badge') || mName.includes('bmw_logo') || mName.includes('hyundai_logo') || mName.includes('logo') || mName.includes('license_plate') || mName.includes('illinois') || mName.includes('symbol') || mName.includes('reg plate') || mName.includes('2025_103') || mName.includes('object_174')) {
                child.visible = false;
            }

            // In Subaru, hide factory STI wing if an aftermarket spoiler is active
            if (carId === 'subaru' && styling.spoiler && styling.spoiler !== 'none') {
                if (mName === 'object_8' || (child.parent && child.parent.name === 'object_8')) {
                    child.visible = false;
                }
            }

            if (child.isMesh && child.material) {
                child.castShadow = true;
                child.receiveShadow = true;

                const isMulti = Array.isArray(child.material);
                const matList = isMulti ? child.material : [child.material];
                const updatedMats = matList.map(mat => {
                    if (!mat) return mat;
                    const matName = String(mat.name || '').toLowerCase();
                    if (matName.includes('badge') || matName.includes('emblem') || matName.includes('logo') || matName.includes('illinois') || matName.includes('philippine_license') || matName === 'plate' || matName.includes('2020-2026')) {
                        child.visible = false;
                    }
                    const mName = String(child.name || '').toLowerCase();

                    // 1. Rubber Tires (Always deep black/charcoal realistic rubber)
                    if (isTireMaterial(matName, mName)) {
                        return mats.tireRubber;
                    }

                    // 2. Wheels / Rims
                    if (isRimMaterial(matName, mName)) {
                        if (styling.wheels === 'stamps') {
                            return new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.72, metalness: 0.35, name: 'Rim_Stamps' });
                        } else if (styling.wheels === 'deepdish') {
                            return mats.chrome;
                        } else if (styling.wheels === 'forged') {
                            return new THREE.MeshStandardMaterial({ color: 0xc89d4c, roughness: 0.25, metalness: 0.88, name: 'Rim_Forged' });
                        }
                        // If model has baked wheel texture (e.g. Golf, RS3, i8) and stock wheels, enhance PBR with sheen
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
                    if (isBrakeMaterial(matName, mName)) {
                        if (mName.includes('caliper') || matName.includes('caliper') || mName === 'object_4' || matName === 'material_1' || matName.includes('red')) {
                            return mats.brakeCaliper;
                        }
                        return mats.brakeDisc;
                    }

                    // 4. Lights (Headlights, Taillights, Indicators)
                    if (isLightMaterial(matName, mName)) {
                        if (mName.includes('taillight') || matName.includes('red') || matName.includes('ruby') || mName === 'object_20' || matName === 'material_17' || matName === 'stopar' || (carId === 'vaz2109' && matName.toLowerCase() === 'standardmater5')) {
                            return mats.taillightRed;
                        }
                        if (carId === 'vaz2109' && matName.toLowerCase() === 'standardmater3') {
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
                    if (isExhaustMaterial(matName, mName)) {
                        return mats.exhaustChrome;
                    }

                    // 6. Grilles & Intercooler Mesh
                    if (isGrilleMaterial(matName, mName)) {
                        return mats.grilleMesh;
                    }

                    // 7. Interior Cockpit, Seats, Steering Wheel
                    if (isInteriorMaterial(matName, mName)) {
                        return mats.interior;
                    }

                    // 8. Glass & Tint
                    if (isGlassMaterial(mat, matName, mName)) {
                        return mats.glass;
                    }

                    // 9. Car Body Paint
                    if (isBodyMaterial(matName, mName)) {
                        const styledPaint = mats.paint.clone();
                        styledPaint.color.setHex(bodyColorHex);
                        styledPaint.roughness = 0.14;
                        styledPaint.metalness = 0.70;
                        if (styledPaint.clearcoat !== undefined) {
                            styledPaint.clearcoat = 1.0;
                            styledPaint.clearcoatRoughness = 0.05;
                        }
                        styledPaint.name = 'StyledPaint_' + bodyColorHex.toString(16);
                        styledPaint.needsUpdate = true;
                        return styledPaint;
                    }

                    // 10. Chrome Trim
                    if (mName.includes('chrom') || matName.toLowerCase().includes('chrom')) {
                        return mats.chrome;
                    }

                    // 11. Carpet & Floorpan
                    if (mName.includes('carpet') || matName.includes('carpet') || mName.includes('floor') || matName.includes('floor')) {
                        return new THREE.MeshStandardMaterial({
                            color: 0x111114,
                            roughness: 0.95,
                            metalness: 0.05,
                            name: 'DarkCarpet'
                        });
                    }

                    // 12. Black Trim, Diffusers, Moldings, Plastic, Underbody, Vents
                    if (matName.includes('diffuser') || matName.includes('trim') || matName.includes('arch') || matName.includes('plastic') || matName.includes('underbody') || matName.includes('vent') || mName.includes('diffuser') || mName.includes('trim') || mName.includes('underbody') || (carId === 'vaz2109' && (
                        matName.toLowerCase() === 'standardmater24' ||
                        matName.toLowerCase() === 'standardmater27' ||
                        matName.toLowerCase() === 'standardmater1' ||
                        matName.toLowerCase() === 'standardmater2'
                    ))) {
                        return mats.trim;
                    }

                    return mat;
                });

                child.material = isMulti ? updatedMats : updatedMats[0];
            }
        });

        // Compute world bounding box for accessories placement from visible meshes
        modelRoot.updateMatrixWorld(true);
        const box = new THREE.Box3();
        modelRoot.traverse(child => {
            if (child.isMesh && child.visible && child.geometry) {
                const mb = new THREE.Box3().setFromObject(child);
                if (mb.max.y - mb.min.y > 0.05) {
                    box.union(mb);
                }
            }
        });
        if (box.isEmpty()) {
            box.setFromObject(modelRoot);
        }
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // 3D Spoilers on GLB models
        if (styling.spoiler && styling.spoiler !== 'none') {
            const spoilerGroup = new THREE.Group();
            spoilerGroup.name = 'GLB_SpoilerGroup';

            const spanW = (carId === 'vaz2109' || carId === 'polo') ? Math.min(size.x * 0.72, 1.32) : Math.min(size.x * 0.76, 1.45);
            let deckY, deckZ;
            if (carId === 'vaz2109' || carId === 'polo') {
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
            } else if (styling.spoiler === 'gt') {
                [-1, 1].forEach(side => {
                    const stanchGeo = new THREE.BoxGeometry(0.035, 0.38, 0.08);
                    stanchGeo.rotateX(-Math.PI / 14);
                    const stanch = new THREE.Mesh(stanchGeo, mats.trim);
                    stanch.position.set(side * (spanW * 0.32), deckY + 0.19, deckZ);
                    spoilerGroup.add(stanch);
                });
                const mainBladeGeo = new THREE.BoxGeometry(spanW * 1.15, 0.035, 0.30);
                mainBladeGeo.rotateX(Math.PI / 14);
                const mainBlade = new THREE.Mesh(mainBladeGeo, mats.carbon);
                mainBlade.position.set(0, deckY + 0.40, deckZ - 0.04);
                spoilerGroup.add(mainBlade);

                [-1, 1].forEach(side => {
                    const epGeo = new THREE.BoxGeometry(0.02, 0.24, 0.36);
                    const ep = new THREE.Mesh(epGeo, mats.carbon);
                    ep.position.set(side * (spanW * 0.58), deckY + 0.40, deckZ - 0.04);
                    spoilerGroup.add(ep);
                });
            }
            modelRoot.add(spoilerGroup);
        }

        // Roof-Mounted Police/Government SGU Flasher Bar
        if (styling.sgu && styling.sgu !== 'none') {
            const roofY = box.max.y;
            const roofZ = center.z;
            const sguWidth = Math.min(size.x * 0.52, 0.82);

            const sguGroup = new THREE.Group();
            sguGroup.name = 'SGUGroup';

            const barGeo = new THREE.BoxGeometry(sguWidth, 0.06, 0.14);
            const barMesh = new THREE.Mesh(barGeo, mats.trim);
            barMesh.position.set(0, roofY + 0.03, roofZ);
            sguGroup.add(barMesh);

            const half = sguWidth * 0.44;
            const blueGeo = new THREE.BoxGeometry(half, 0.06, 0.14);
            const blueMat = new THREE.MeshStandardMaterial({ color: 0x0088ff, emissive: 0x0088ff, emissiveIntensity: 1.0, name: 'SGU_Blue' });
            const blueMesh = new THREE.Mesh(blueGeo, blueMat);
            blueMesh.position.set(-half * 0.52, roofY + 0.04, roofZ);
            sguGroup.add(blueMesh);

            const redGeo = new THREE.BoxGeometry(half, 0.06, 0.14);
            const redMat = new THREE.MeshStandardMaterial({ color: 0xff0044, emissive: 0xff0044, emissiveIntensity: 1.0, name: 'SGU_Red' });
            const redMesh = new THREE.Mesh(redGeo, redMat);
            redMesh.position.set(half * 0.52, roofY + 0.04, roofZ);
            sguGroup.add(redMesh);

            modelRoot.add(sguGroup);
        }

        // Underglow Neon Tubes
        if (styling.neon && styling.neon !== 'none') {
            const neonCol = parseColor(styling.neon, 0x00f0ff);
            const neonMat = new THREE.MeshStandardMaterial({ color: neonCol, emissive: neonCol, emissiveIntensity: 1.2, roughness: 0.1 });
            [-1, 1].forEach(side => {
                const tubeGeo = new THREE.CylinderGeometry(0.02, 0.02, size.z * 0.65, 8);
                tubeGeo.rotateX(Math.PI / 2);
                const tube = new THREE.Mesh(tubeGeo, neonMat);
                tube.position.set(side * (size.x * 0.44), 0.10 + suspensionOffsetY, center.z);
                modelRoot.add(tube);
            });
        }

        // Russian License Plates
        const plateVal = (styling && styling.plate !== undefined) ? styling.plate : 'А 777 АА | 77 RUS';
        applyLicensePlateToModel(THREE, modelRoot, plateVal);

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
    }

    function loadCarModel(THREE, carName, styling = {}, onLoaded) {
        const carId = identifyCarModel(carName);
        const modelUrl = GLB_MODEL_MAP[carId];
        const loader = getGLTFLoader(THREE);

        // If no external GLB mapped (e.g. VAZ-2107, VAZ-2109, GAZ-24, Priora, Vesta, LC300, Cullinan)
        // or if loader is not available, render our bespoke procedural 3D model!
        if (!loader || !modelUrl) {
            const fallbackModel = buildDetailedCarModel(THREE, carName, styling);
            if (onLoaded) onLoaded(fallbackModel);
            return;
        }

        function setupModel(gltfScene) {
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
            if (carId === 'gaz24') {
                const toRemove = [];
                clonedScene.traverse(c => {
                    const nm = String(c.name || '').toLowerCase();
                    if (nm.includes('object_174') || nm.includes('reg plate') || nm.includes('2020') || nm.includes('plate')) {
                        toRemove.push(c);
                    }
                });
                toRemove.forEach(c => {
                    if (c.parent) c.parent.remove(c);
                });
            }
            clonedScene.updateMatrixWorld(true);

            let box = new THREE.Box3().setFromObject(clonedScene);
            let size = box.getSize(new THREE.Vector3());
            let center = box.getCenter(new THREE.Vector3());

            // 1. If height is greater than length and width (Z-up coordinate system from Blender/3ds Max)
            if (size.y > size.z * 1.2 && size.y > size.x * 1.2) {
                clonedScene.rotation.x = -Math.PI / 2;
                clonedScene.updateMatrixWorld(true);
                box = new THREE.Box3().setFromObject(clonedScene);
                size = box.getSize(new THREE.Vector3());
                center = box.getCenter(new THREE.Vector3());
            }

            // 2. If length is along X axis, rotate 90 degrees so the car aligns forward along Z
            if (size.x > size.z * 1.15) {
                clonedScene.rotation.y = Math.PI / 2;
                clonedScene.updateMatrixWorld(true);
                box = new THREE.Box3().setFromObject(clonedScene);
                size = box.getSize(new THREE.Vector3());
                center = box.getCenter(new THREE.Vector3());
            }

            // 3. Align car forward facing along +Z
            if (carId === 'vaz2109' || carId === 'sf90') {
                clonedScene.rotation.y += Math.PI;
                clonedScene.updateMatrixWorld(true);
                box = new THREE.Box3().setFromObject(clonedScene);
                size = box.getSize(new THREE.Vector3());
                center = box.getCenter(new THREE.Vector3());
            }

            // Standardize car dimensions with realistic relative scale
            let targetLength = 4.45;
            if (carId === 'vaz2107' || carId === 'vaz2109' || carId === 'polo') {
                targetLength = 4.05;
            } else if (carId === 'cullinan') {
                targetLength = 5.25;
            } else if (carId === 'g63' || carId === 'lc300') {
                targetLength = 4.90;
            } else if (carId === 'camry' || carId === 'e63' || carId === 'rs6' || carId === 'm8' || carId === 'gaz24') {
                targetLength = 4.75;
            } else if (carId === 'jesko' || carId === 'chiron' || carId === 'sf90' || carId === 'huracan' || carId === 'porsche911') {
                targetLength = 4.50;
            } else if (carId === 'priora' || carId === 'solaris' || carId === 'vesta') {
                targetLength = 4.35;
            } else if (carId === 'mark2' || carId === 'subaru' || carId === 'm5e60' || carId === 'm5f90' || carId === 'gtr' || carId === 'silvia') {
                targetLength = 4.55;
            }
            const currentLength = size.z || 1;
            const scaleFactor = targetLength / currentLength;
            clonedScene.scale.setScalar(scaleFactor);
            clonedScene.updateMatrixWorld(true);

            const scaledBox = new THREE.Box3().setFromObject(clonedScene);
            const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

            clonedScene.position.x = -scaledCenter.x;
            clonedScene.position.z = -scaledCenter.z;
            clonedScene.position.y = -scaledBox.min.y;

            modelGroup.add(clonedScene);
            applyStylingToGLTF(THREE, modelGroup, styling, carId);

            return modelGroup;
        }

        if (rawGLBCache.has(modelUrl)) {
            const cachedScene = rawGLBCache.get(modelUrl);
            const finalModel = setupModel(cachedScene);
            if (onLoaded) onLoaded(finalModel);
            return;
        }

        loader.load(
            modelUrl,
            gltf => {
                rawGLBCache.set(modelUrl, gltf.scene);
                const finalModel = setupModel(gltf.scene);
                if (onLoaded) onLoaded(finalModel);
            },
            undefined,
            err => {
                console.warn('Failed to load GLB model, falling back to procedural:', err);
                const fallbackModel = buildDetailedCarModel(THREE, carName, styling);
                if (onLoaded) onLoaded(fallbackModel);
            }
        );
    }

    // Automotive Studio HDRI Environment Generator
    function createStudioEnvironment(THREE, renderer) {
        if (!THREE.PMREMGenerator || !renderer) return null;
        try {
            const pmrem = new THREE.PMREMGenerator(renderer);
            pmrem.compileEquirectangularShader();

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
            pmrem.dispose();
            return rt.texture;
        } catch (err) {
            console.warn('Could not generate studio environment:', err);
            return null;
        }
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
                autoRotate: true,
                autoRotateSpeed: 0.007,
                showPodium: true,
                enableZoom: true,
                minDistance: 2.2,
                maxDistance: 6.8
            }, options);

            this.width = this.container.clientWidth || 320;
            this.height = this.container.clientHeight || 200;
            this.active = false;
            this.animFrameId = null;

            // Camera angles and orbit controls
            this.cameraAngleY = Math.PI / 4.2;
            this.cameraAngleX = 0.26;
            this.cameraDistance = 4.3;
            this.targetY = 0.52;

            this.isDragging = false;
            this.prevPointerX = 0;
            this.prevPointerY = 0;
            this.pinchStartDist = 0;

            this.currentCarName = '';
            this.currentStyling = {};
            this.carGroup = null;

            this.initScene();
            this.bindEvents();
            this.start();
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
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.setSize(this.width, this.height);
            this.renderer.outputEncoding = THREE.sRGBEncoding || 3001;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.15;

            if (this.renderer.shadowMap) {
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
            this.ambientLight = new THREE.AmbientLight(0xffffff, 0.70);
            this.scene.add(this.ambientLight);

            this.keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
            this.keyLight.position.set(4, 5, 4);
            this.scene.add(this.keyLight);

            this.fillLight = new THREE.DirectionalLight(0xa5c4d4, 0.65);
            this.fillLight.position.set(-4, 3, -2);
            this.scene.add(this.fillLight);

            this.rimLight = new THREE.DirectionalLight(0xffffff, 0.90);
            this.rimLight.position.set(0, 4, -5);
            this.scene.add(this.rimLight);

            this.neonLight = new THREE.PointLight(0x00f0ff, 0, 4.0);
            this.neonLight.position.set(0, 0.14, 0);
            this.scene.add(this.neonLight);

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
            const cx = Math.sin(this.cameraAngleY) * Math.cos(this.cameraAngleX) * this.cameraDistance;
            const cy = Math.sin(this.cameraAngleX) * this.cameraDistance + this.targetY;
            const cz = Math.cos(this.cameraAngleY) * Math.cos(this.cameraAngleX) * this.cameraDistance;
            this.camera.position.set(cx, cy, cz);
            this.camera.lookAt(0, this.targetY, 0);
        }

        setCar(carName, styling = {}) {
            this.currentCarName = carName || 'ВАЗ-2107 «Жигули»';
            this.currentStyling = Object.assign({}, styling);

            const THREE = this.THREE;

            loadCarModel(THREE, this.currentCarName, this.currentStyling, loadedModel => {
                if (this.carGroup) {
                    this.scene.remove(this.carGroup);
                    this.carGroup = null;
                }
                this.carGroup = loadedModel;
                this.scene.add(this.carGroup);
                this.updateNeonLight();
            });
        }

        updatePlate(plateText) {
            this.currentStyling.plate = plateText;
            if (this.carGroup && this.THREE) {
                applyLicensePlateToModel(this.THREE, this.carGroup, plateText);
            }
        }

        updateStyling(styling = {}) {
            if (styling.plate !== undefined && this.carGroup && this.THREE) {
                this.updatePlate(styling.plate);
            }
            Object.assign(this.currentStyling, styling);
            this.setCar(this.currentCarName, this.currentStyling);
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

        bindEvents() {
            const dom = this.renderer.domElement;

            const onPointerDown = (e) => {
                this.isDragging = true;
                this.prevPointerX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
                this.prevPointerY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            };

            const onPointerMove = (e) => {
                if (!this.isDragging) return;
                const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
                const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
                const deltaX = clientX - this.prevPointerX;
                const deltaY = clientY - this.prevPointerY;
                this.prevPointerX = clientX;
                this.prevPointerY = clientY;

                this.cameraAngleY -= deltaX * 0.009;
                this.cameraAngleX = Math.max(0.04, Math.min(Math.PI / 2.2, this.cameraAngleX + deltaY * 0.007));
                this.updateCameraPosition();
            };

            const onPointerUp = () => {
                this.isDragging = false;
            };

            const onWheel = (e) => {
                if (!this.options.enableZoom) return;
                e.preventDefault();
                const delta = Math.sign(e.deltaY) * 0.25;
                this.cameraDistance = Math.max(this.options.minDistance, Math.min(this.options.maxDistance, this.cameraDistance + delta));
                this.updateCameraPosition();
            };

            const onTouchMove = (e) => {
                if (e.touches.length === 2 && this.options.enableZoom) {
                    const dist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    if (this.pinchStartDist > 0) {
                        const delta = (this.pinchStartDist - dist) * 0.01;
                        this.cameraDistance = Math.max(this.options.minDistance, Math.min(this.options.maxDistance, this.cameraDistance + delta));
                        this.updateCameraPosition();
                    }
                    this.pinchStartDist = dist;
                } else if (e.touches.length === 1) {
                    onPointerMove(e);
                }
            };

            const onTouchEnd = () => {
                this.isDragging = false;
                this.pinchStartDist = 0;
            };

            dom.addEventListener('mousedown', onPointerDown);
            window.addEventListener('mousemove', onPointerMove);
            window.addEventListener('mouseup', onPointerUp);

            dom.addEventListener('touchstart', onPointerDown, { passive: true });
            dom.addEventListener('touchmove', onTouchMove, { passive: false });
            dom.addEventListener('touchend', onTouchEnd);

            dom.addEventListener('wheel', onWheel, { passive: false });
            window.addEventListener('resize', () => this.resize());
        }

        resize() {
            if (!this.container || !this.renderer) return;
            const w = this.container.clientWidth;
            const h = this.container.clientHeight;
            if (w <= 0 || h <= 0) return;
            this.width = w;
            this.height = h;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        }

        start() {
            if (this.active) return;
            this.active = true;
            let lastTime = performance.now();

            const loop = (time) => {
                if (!this.active) return;
                lastTime = time;

                if (this.options.autoRotate && !this.isDragging) {
                    this.cameraAngleY += this.options.autoRotateSpeed;
                    this.updateCameraPosition();
                }

                // SGU Strobe Lights Live Flashing Animation
                if (this.currentStyling.sgu && this.currentStyling.sgu !== 'none' && this.carGroup) {
                    const sgu = this.carGroup.getObjectByName('SGUGroup');
                    if (sgu) {
                        const pulse = Math.floor(time * 0.009) % 2 === 0;
                        const blue = sgu.getObjectByName('SGU_Blue');
                        const red = sgu.getObjectByName('SGU_Red');
                        if (blue && blue.material) blue.material.emissiveIntensity = pulse ? 1.8 : 0.1;
                        if (red && red.material) red.material.emissiveIntensity = pulse ? 0.1 : 1.8;
                    }
                }

                // Breathing showroom turntable idle animation
                if (this.carGroup) {
                    this.carGroup.position.y = Math.sin(time * 0.002) * 0.004;
                }
                if (this.neonLight && this.neonLight.intensity > 0) {
                    this.neonLight.intensity = 1.6 + Math.sin(time * 0.004) * 0.25;
                }

                this.renderer.render(this.scene, this.camera);
                this.animFrameId = requestAnimationFrame(loop);
            };

            this.animFrameId = requestAnimationFrame(loop);
        }

        stop() {
            this.active = false;
            if (this.animFrameId) {
                cancelAnimationFrame(this.animFrameId);
                this.animFrameId = null;
            }
        }

        destroy() {
            this.stop();
            if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
                this.renderer.dispose();
            }
        }
    }

    // =========================================================================
    // 📸 OFFLINE 3D SIDE PROFILE THUMBNAIL RENDERER FOR AUTO SALON & GARAGE
    // =========================================================================
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
        const sg = styling.sgu || 'none';
        const pl = styling.plate || '';
        return `${carName}__${c}_${t}_${w}_${s}_${n}_${sp}_${sg}_${pl}`;
    }

    function getSideThumbnail(carName, styling = {}) {
        const key = getThumbnailKey(carName, styling);
        return sideThumbnailCache.get(key) || null;
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
        offscreenRenderer.setSize(440, 240, false);
        offscreenRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        offscreenRenderer.shadowMap.enabled = true;
        offscreenRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
        offscreenRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        offscreenRenderer.toneMappingExposure = 1.20;
        offscreenRenderer.setClearColor(0x000000, 0);

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
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
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

    function processThumbnailQueue(THREE) {
        if (isProcessingQueue || thumbnailQueue.length === 0) return;
        isProcessingQueue = true;

        const task = thumbnailQueue.shift();
        initOffscreenPipeline(THREE);

        loadCarModel(THREE, task.carName, task.styling, model => {
            try {
                if (model && offscreenRenderer && offscreenScene && offscreenCamera) {
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
                    const carHeight = finalBox.max.y - finalBox.min.y;
                    const targetY = finalBox.min.y + carHeight * 0.46;
                    const carLength = Math.max(3.8, finalBox.max.z - finalBox.min.z);
                    const camDist = Math.max(8.2, carLength * 1.88);

                    offscreenCamera.position.set(camDist, targetY, 0);
                    offscreenCamera.lookAt(0, targetY, 0);

                    offscreenRenderer.render(offscreenScene, offscreenCamera);
                    const dataUrl = offscreenRenderer.domElement.toDataURL('image/png');

                    offscreenScene.remove(model);

                    if (dataUrl && dataUrl.startsWith('data:image')) {
                        sideThumbnailCache.set(task.key, dataUrl);
                    }

                    const cbs = thumbnailCallbacks.get(task.key) || [];
                    thumbnailCallbacks.delete(task.key);
                    cbs.forEach(cb => {
                        try { cb(dataUrl); } catch (_) {}
                    });
                } else {
                    const cbs = thumbnailCallbacks.get(task.key) || [];
                    thumbnailCallbacks.delete(task.key);
                    cbs.forEach(cb => {
                        try { cb(null); } catch (_) {}
                    });
                }
            } catch (err) {
                console.warn('Error rendering 3D thumbnail:', err);
                const cbs = thumbnailCallbacks.get(task.key) || [];
                thumbnailCallbacks.delete(task.key);
                cbs.forEach(cb => {
                    try { cb(null); } catch (_) {}
                });
            } finally {
                isProcessingQueue = false;
                if (thumbnailQueue.length > 0) {
                    setTimeout(() => processThumbnailQueue(THREE), 16);
                }
            }
        });
    }

    function renderSideThumbnail(carName, styling = {}, callback) {
        if (!isWebGLAvailable()) {
            if (callback) callback(null);
            return;
        }

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
            this.animFrameId = null;
            this.lastTime = 0;

            // Camera Modes:
            // 0: Dynamic Chase (default 3rd-person behind & above car)
            // 1: Close Sports Chase (lower & closer)
            // 2: Hood / Bumper POV
            this.cameraMode = 0;
            this.cameraModes = [
                { offset: new this.THREE.Vector3(0, 2.05, -5.8), lookOffset: new this.THREE.Vector3(0, 1.05, 14.0), fov: 58 },
                { offset: new this.THREE.Vector3(0, 1.55, -4.4), lookOffset: new this.THREE.Vector3(0, 0.85, 13.0), fov: 62 },
                { offset: new this.THREE.Vector3(0, 1.15, 0.6), lookOffset: new this.THREE.Vector3(0, 1.00, 25.0), fov: 68 }
            ];
            this.camPos = new this.THREE.Vector3(0, 2.05, -5.8);
            this.camLook = new this.THREE.Vector3(0, 1.05, 14.0);
            this.camRoll = 0;

            // Controls state
            this.keys = {
                gas: false,
                brake: false,
                left: false,
                right: false,
                drift: false,
                nitro: false
            };

            // Player state
            this.playerCar = null;
            this.playerHeadlights = [];
            this.playerTaillights = [];
            this.playerBrakeLight = null;
            this.playerNitroFlames = [];
            this.playerNeonLight = null;
            this.playerSguLight = null;
            this.playerWheels = [];
            this.playerSteerWheels = [];

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
                nitroLevel: 100, // 0 - 100%
                nitroTimer: 0,
                overtakesCount: 0,
                overtakeCombo: 0,
                overtakeComboTimer: 0,
                damageTaken: 0,
                bodyRoll: 0,
                pitchSquat: 0,
                yawAngle: 0,
                sguTimer: 0,
                sguActive: false,
                shakeAmount: 0
            };

            // Road track & chunks
            this.chunkLength = 60;
            this.numChunks = 8;
            this.roadChunks = [];
            this.highestChunkZ = 0;
            this.weather = 'night';

            // Traffic
            this.trafficCars = [];
            this.trafficCount = 10;
            this.trafficLanes = [-6.375, -2.125, 2.125, 6.375];

            // FX Particles
            this.smokeParticles = [];
            this.sparkParticles = [];

            this.initScene();
            this.bindResize();
        }

        initScene() {
            const THREE = this.THREE;

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(58, Math.max(0.1, this.width / Math.max(1, this.height)), 0.2, 550);

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
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.setSize(this.width, this.height);
            if (THREE.sRGBEncoding) {
                this.renderer.outputEncoding = THREE.sRGBEncoding;
            }

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
        }

        getWeatherPreset(key) {
            const presets = {
                day: {
                    id: 'day',
                    name: 'Ясный день',
                    icon: '☀️',
                    bgColor: 0x38bdf8,
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
                    lampEmissive: 0.20,
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
                    lampEmissive: 1.6,
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
                    lampEmissive: 2.2,
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
                    fogDensity: 0.012,
                    ambientColor: 0x384959,
                    ambientIntensity: 0.40,
                    sunColor: 0x64748b,
                    sunIntensity: 0.35,
                    sunPos: [10, 22, 15],
                    asphaltColor: 0x0c121c,
                    asphaltRoughness: 0.16, // Mirror wet asphalt
                    asphaltMetalness: 0.75, // High surface reflection
                    grassColor: 0x071e16,
                    treeColor: 0x042f2e,
                    lampEmissive: 1.9,
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
                    lampEmissive: 2.0,
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
                    fogDensity: 0.010,
                    ambientColor: 0x94a3b8,
                    ambientIntensity: 0.60,
                    sunColor: 0xe2e8f0,
                    sunIntensity: 0.65,
                    sunPos: [14, 20, 18],
                    asphaltColor: 0x1e293b,
                    asphaltRoughness: 0.65,
                    asphaltMetalness: 0.22,
                    grassColor: 0xe2e8f0, // Frosted white verge
                    treeColor: 0xcfd8dc, // Frosted pines
                    lampEmissive: 1.8,
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
            if (this.lampLightMat) {
                this.lampLightMat.emissiveIntensity = preset.lampEmissive;
                this.lampLightMat.needsUpdate = true;
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
            const THREE = this.THREE;
            const mat = new THREE.MeshBasicMaterial({
                color: 0x94a3b8,
                transparent: true,
                opacity: 0.35,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat);
            mesh.position.set(x, y, z);
            mesh.userData = {
                life: 0.25,
                maxLife: 0.25,
                vy: 0.4 + Math.random() * 0.8
            };
            this.scene.add(mesh);
            this.smokeParticles.push(mesh);
        }

        updateWeatherParticles(dt) {
            const state = this.state;
            if (!state) return;
            const forwardSpeedMps = (state.speed || 0) / 3.6;

            // 1. Rain streaks
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

                // Wet road spray behind player car
                if (state.speed > 35 && Math.random() < 0.45) {
                    this.spawnWaterSpray(state.x + (Math.random() - 0.5) * 1.6, 0.15, state.z - 2.1);
                }
            }

            // 2. Snow swirling flakes
            if (this.snowSystem && this.snowSystem.visible) {
                const posAttr = this.snowSystem.geometry.attributes.position;
                const pos = posAttr.array;
                const speeds = this.snowSystem.userData.speeds;
                const phases = this.snowSystem.userData.driftPhases;
                const time = state.time || 0;
                const count = speeds.length;
                for (let i = 0; i < count; i++) {
                    const i3 = i * 3;
                    pos[i3 + 1] -= (speeds[i] + forwardSpeedMps * 0.08) * dt;
                    pos[i3 + 0] += Math.sin(time * 2.2 + phases[i]) * 3.0 * dt;

                    if (pos[i3 + 1] <= 0 || pos[i3 + 2] < state.z - 30) {
                        pos[i3 + 0] = state.x + (Math.random() - 0.5) * 55;
                        pos[i3 + 1] = 18 + Math.random() * 6;
                        pos[i3 + 2] = state.z + (Math.random() - 0.5) * 75;
                    }
                }
                posAttr.needsUpdate = true;
            }

            // 3. Lightning flash in rain
            if (this.currentActiveWeather === 'rain') {
                const preset = this.getWeatherPreset('rain');
                this.lightningTimer = (this.lightningTimer !== undefined ? this.lightningTimer : 5.0) - dt;
                if (this.lightningTimer <= 0) {
                    this.lightningFlash = 0.14;
                    this.lightningTimer = 4.5 + Math.random() * 7.0;
                    if (this.ambientLight) this.ambientLight.intensity = 1.9;
                    if (this.sunLight) this.sunLight.intensity = 2.4;
                    if (this.scene.background) this.scene.background.setHex(0xdbeafe);
                    if (this.scene.fog) this.scene.fog.color.setHex(0xdbeafe);
                }
                if (this.lightningFlash > 0) {
                    this.lightningFlash -= dt;
                    if (this.lightningFlash <= 0) {
                        if (this.ambientLight) this.ambientLight.intensity = preset.ambientIntensity;
                        if (this.sunLight) this.sunLight.intensity = preset.sunIntensity;
                        if (this.scene.background) this.scene.background.setHex(preset.bgColor);
                        if (this.scene.fog) this.scene.fog.color.setHex(preset.bgColor);
                    }
                }
            }

            // 4. Dynamic Auto-Weather Progression
            if (this.weatherMode === 'auto') {
                const targetWeather = this.getAutoWeatherKey(state.distanceKm);
                if (targetWeather !== this.currentActiveWeather) {
                    this.setWeather(targetWeather, false);
                    const p = this.getWeatherPreset(targetWeather);
                    if (this.options.onPopup && p) {
                        this.options.onPopup(`🌦️ ПОГОДА: ${p.icon} ${p.name.toUpperCase()}`, '#38bdf8');
                    }
                }
            }
        }

        buildHighwayChunks() {
            const THREE = this.THREE;

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

            this.treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x452311, roughness: 0.9 });
            this.treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.85 });

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

        createRoadChunk(zPos, hasGantry = false) {
            const THREE = this.THREE;
            const chunk = new THREE.Group();
            chunk.position.z = zPos;

            const L = this.chunkLength;
            const roadW = 17.5; // 4 lanes

            // 1. Asphalt Road Bed
            const roadGeo = new THREE.PlaneGeometry(roadW, L);
            roadGeo.rotateX(-Math.PI / 2);
            const roadMesh = new THREE.Mesh(roadGeo, this.asphaltMat);
            roadMesh.position.y = 0;
            chunk.add(roadMesh);

            // 2. Roadside Grass Verges
            [-1, 1].forEach(side => {
                const grassGeo = new THREE.PlaneGeometry(35, L);
                grassGeo.rotateX(-Math.PI / 2);
                const grass = new THREE.Mesh(grassGeo, this.grassMat);
                grass.position.set(side * (roadW * 0.5 + 17.5), -0.01, 0);
                chunk.add(grass);
            });

            // 3. Lane Divider Markings (3 dashed white lines)
            const laneStep = roadW / 4; // 4.375m per lane
            const dashL = 3.6;
            const gapL = 3.4;
            const totalDashes = Math.floor(L / (dashL + gapL));

            [-1.5, -0.5, 0.5, 1.5].forEach((laneMult, idx) => {
                if (idx > 0 && idx < 3) {
                    // Dashed lines between lanes
                    const lineX = (idx - 1.5) * laneStep;
                    for (let d = 0; d < totalDashes; d++) {
                        const dashGeo = new THREE.PlaneGeometry(0.18, dashL);
                        dashGeo.rotateX(-Math.PI / 2);
                        const dash = new THREE.Mesh(dashGeo, this.lineMat);
                        dash.position.set(lineX, 0.005, -L * 0.5 + d * (dashL + gapL) + dashL * 0.5);
                        chunk.add(dash);
                    }
                }
            });

            // Center dashed line (X = 0)
            for (let d = 0; d < totalDashes; d++) {
                const dashGeo = new THREE.PlaneGeometry(0.20, dashL);
                dashGeo.rotateX(-Math.PI / 2);
                const dash = new THREE.Mesh(dashGeo, this.lineMat);
                dash.position.set(0, 0.005, -L * 0.5 + d * (dashL + gapL) + dashL * 0.5);
                chunk.add(dash);
            }

            // 4. Solid Outer Edge Lines (White/Yellow)
            [-1, 1].forEach(side => {
                const outerGeo = new THREE.PlaneGeometry(0.25, L);
                outerGeo.rotateX(-Math.PI / 2);
                const outerLine = new THREE.Mesh(outerGeo, side === -1 ? this.yellowLineMat : this.lineMat);
                outerLine.position.set(side * (roadW * 0.5 - 0.4), 0.006, 0);
                chunk.add(outerLine);
            });

            // 5. Rumble Curb Strips (Alternating Red and White)
            const curbDashes = Math.floor(L / 1.5);
            [-1, 1].forEach(side => {
                const curbX = side * (roadW * 0.5 - 0.05);
                for (let c = 0; c < curbDashes; c++) {
                    const mat = (c % 2 === 0) ? this.curbRedMat : this.curbWhiteMat;
                    const curbGeo = new THREE.BoxGeometry(0.35, 0.04, 1.4);
                    const curb = new THREE.Mesh(curbGeo, mat);
                    curb.position.set(curbX, 0.02, -L * 0.5 + c * 1.5 + 0.75);
                    chunk.add(curb);
                }
            });

            // 6. Double Corrugated Steel Guardrails (Crash Barriers)
            [-1, 1].forEach(side => {
                const railX = side * (roadW * 0.5 + 0.45);
                // Upper beam
                const beamGeo = new THREE.BoxGeometry(0.12, 0.28, L);
                const beam = new THREE.Mesh(beamGeo, this.guardrailMat);
                beam.position.set(railX, 0.52, 0);
                chunk.add(beam);

                // Lower beam
                const lowerBeamGeo = new THREE.BoxGeometry(0.10, 0.20, L);
                const lowerBeam = new THREE.Mesh(lowerBeamGeo, this.guardrailMat);
                lowerBeam.position.set(railX, 0.24, 0);
                chunk.add(lowerBeam);

                // Guardrail Posts every 4.0 meters
                const postCount = Math.floor(L / 4.0);
                for (let p = 0; p < postCount; p++) {
                    const postGeo = new THREE.BoxGeometry(0.10, 0.65, 0.10);
                    const post = new THREE.Mesh(postGeo, this.guardrailMat);
                    post.position.set(railX, 0.32, -L * 0.5 + p * 4.0);
                    chunk.add(post);

                    // Reflective warning marker on post
                    const refMat = (side === 1) ? this.curbRedMat : this.curbWhiteMat;
                    const refMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), refMat);
                    refMesh.position.set(railX - side * 0.06, 0.56, -L * 0.5 + p * 4.0);
                    chunk.add(refMesh);
                }
            });

            // 7. Highway Lampposts (every 40 meters)
            [-1, 1].forEach(side => {
                const lampX = side * (roadW * 0.5 + 1.6);
                const lampGroup = new THREE.Group();
                lampGroup.position.set(lampX, 0, 0);

                // Arched Vertical Mast
                const mastGeo = new THREE.CylinderGeometry(0.12, 0.18, 7.5, 12);
                const mast = new THREE.Mesh(mastGeo, this.lampPostMat);
                mast.position.y = 3.75;
                lampGroup.add(mast);

                // Horizontal Cantilever Arm over road
                const armGeo = new THREE.BoxGeometry(2.4, 0.10, 0.10);
                const arm = new THREE.Mesh(armGeo, this.lampPostMat);
                arm.position.set(-side * 1.1, 7.3, 0);
                arm.rotation.z = side * 0.14;
                lampGroup.add(arm);

                // Glowing Lamp Luminaire Head
                const lumGeo = new THREE.BoxGeometry(0.70, 0.12, 0.35);
                const lum = new THREE.Mesh(lumGeo, this.lampLightMat);
                lum.position.set(-side * 2.2, 7.1, 0);
                lampGroup.add(lum);

                chunk.add(lampGroup);
            });

            // 8. Overhead Highway Gantry Sign (every 240m on selected chunks)
            if (hasGantry) {
                const gantryGroup = new THREE.Group();
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

                // Large Green Russian Highway Information Signs
                [-3.8, 3.8].forEach((signX, sIdx) => {
                    const signGeo = new THREE.BoxGeometry(5.2, 1.8, 0.12);
                    const signMesh = new THREE.Mesh(signGeo, this.signGreenMat);
                    signMesh.position.set(signX, 6.8, -0.42);
                    gantryGroup.add(signMesh);

                    // Sign border
                    const borderGeo = new THREE.BoxGeometry(5.3, 1.9, 0.04);
                    const borderMesh = new THREE.Mesh(borderGeo, this.lineMat);
                    borderMesh.position.set(signX, 6.8, -0.44);
                    gantryGroup.add(borderMesh);
                });

                // Speed Camera Flash Box (📸) in center
                const camBoxGeo = new THREE.BoxGeometry(0.8, 0.5, 0.6);
                const camBox = new THREE.Mesh(camBoxGeo, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 }));
                camBox.position.set(0, 6.7, -0.42);
                gantryGroup.add(camBox);

                const lensGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 16);
                lensGeo.rotateX(Math.PI / 2);
                const lens = new THREE.Mesh(lensGeo, new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
                lens.position.set(0, 6.7, -0.73);
                gantryGroup.add(lens);

                chunk.add(gantryGroup);
            }

            // 9. Roadside Low-Poly Pine and Birch Trees along shoulders
            for (let t = 0; t < 6; t++) {
                const side = (t % 2 === 0) ? -1 : 1;
                const treeX = side * (roadW * 0.5 + 3.5 + Math.random() * 6.0);
                const treeZ = -L * 0.5 + t * (L / 6) + (Math.random() - 0.5) * 4.0;
                const treeH = 5.0 + Math.random() * 3.5;

                const tree = new THREE.Group();
                tree.position.set(treeX, 0, treeZ);

                // Trunk
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, treeH * 0.4, 8), this.treeTrunkMat);
                trunk.position.y = treeH * 0.2;
                tree.add(trunk);

                // Foliage Cones (Pine style)
                for (let tier = 0; tier < 3; tier++) {
                    const coneR = (2.2 - tier * 0.5);
                    const coneH = treeH * 0.35;
                    const cone = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneH, 7), this.treeFoliageMat);
                    cone.position.y = treeH * 0.28 + tier * (coneH * 0.7);
                    tree.add(cone);
                }

                chunk.add(tree);
            }

            return chunk;
        }

        initTraffic() {
            const THREE = this.THREE;
            this.trafficCars = [];

            // Spawn pool of traffic cars
            for (let i = 0; i < this.trafficCount; i++) {
                const type = (i % 4 === 0) ? 'truck' : (i % 4 === 1) ? 'suv' : (i % 4 === 2) ? 'sedan' : (i === 7) ? 'police' : 'sedan';
                const laneIdx = (type === 'truck') ? 3 : (type === 'suv') ? 0 : (i % 4);
                const laneX = this.trafficLanes[laneIdx];
                const spawnZ = 55 + i * 34 + Math.random() * 12;

                const trafficCar = this.createTrafficVehicle(type);
                Object.assign(trafficCar.userData, {
                    type: type,
                    laneIndex: laneIdx,
                    targetX: laneX,
                    baseSpeed: (type === 'truck') ? 74 + Math.random() * 10 : (type === 'suv') ? 115 + Math.random() * 15 : (type === 'police') ? 125 : 92 + Math.random() * 20,
                    speed: 90,
                    overtaken: false,
                    laneChangeTimer: 4 + Math.random() * 8,
                    blinkTimer: 0
                });
                trafficCar.userData.speed = trafficCar.userData.baseSpeed;
                trafficCar.position.set(laneX, 0, spawnZ);

                this.trafficCars.push(trafficCar);
                this.scene.add(trafficCar);
            }
        }

        createTrafficVehicle(type = 'sedan') {
            const THREE = this.THREE;
            const group = new THREE.Group();

            const glassMat = new THREE.MeshStandardMaterial({
                color: 0x0f172a,
                roughness: 0.1,
                metalness: 0.9,
                transparent: true,
                opacity: 0.85
            });

            const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
            const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.9 });
            const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const taillightMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.4 });

            const colors = [0x1e3a8a, 0x374151, 0xd97706, 0x059669, 0xb91c1c, 0xf8fafc, 0x475569];
            const bodyColor = (type === 'police') ? 0xf8fafc : colors[Math.floor(Math.random() * colors.length)];
            const bodyMat = new THREE.MeshStandardMaterial({
                color: bodyColor,
                roughness: 0.28,
                metalness: 0.65
            });

            if (type === 'truck') {
                // Heavy Truck (KAMAZ / Scania Box Freight)
                const cabW = 2.4, cabL = 2.2, cabH = 2.8;
                const cabGeo = new THREE.BoxGeometry(cabW, cabH, cabL);
                const cab = new THREE.Mesh(cabGeo, bodyMat);
                cab.position.set(0, cabH * 0.5 + 0.35, cabL * 0.5 + 1.8);
                group.add(cab);

                // Windshield
                const ws = new THREE.Mesh(new THREE.BoxGeometry(cabW * 0.9, cabH * 0.35, 0.1), glassMat);
                ws.position.set(0, cabH * 0.65 + 0.35, cabL + 1.8);
                group.add(ws);

                // Freight Cargo Box
                const boxW = 2.5, boxL = 6.2, boxH = 3.2;
                const boxGeo = new THREE.BoxGeometry(boxW, boxH, boxL);
                const boxMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
                const freightBox = new THREE.Mesh(boxGeo, boxMat);
                freightBox.position.set(0, boxH * 0.5 + 0.5, -boxL * 0.5 + 1.6);
                group.add(freightBox);

                // Taillights
                [-0.9, 0.9].forEach(side => {
                    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), taillightMat);
                    tl.position.set(side, 0.6, -boxL + 1.6);
                    group.add(tl);
                });

                // Headlights
                [-0.9, 0.9].forEach(side => {
                    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.1), headlightMat);
                    hl.position.set(side, 0.7, cabL + 1.8);
                    group.add(hl);
                });

                group.userData.halfWidth = 1.35;
                group.userData.halfLength = 4.4;
            } else if (type === 'suv') {
                // Large SUV (Land Cruiser 300 / G63 style)
                const W = 2.05, L = 4.8, H = 1.65;
                const lower = new THREE.Mesh(new THREE.BoxGeometry(W, H * 0.6, L), bodyMat);
                lower.position.y = H * 0.3 + 0.32;
                group.add(lower);

                const cabin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, H * 0.55, L * 0.6), bodyMat);
                cabin.position.set(0, H * 0.75 + 0.32, -L * 0.08);
                group.add(cabin);

                const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(W * 0.93, H * 0.48, L * 0.58), glassMat);
                cabinGlass.position.set(0, H * 0.75 + 0.32, -L * 0.08);
                group.add(cabinGlass);

                // Taillights
                [-0.8, 0.8].forEach(side => {
                    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.08), taillightMat);
                    tl.position.set(side, H * 0.5 + 0.32, -L * 0.505);
                    group.add(tl);
                });

                // Headlights
                [-0.8, 0.8].forEach(side => {
                    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.08), headlightMat);
                    hl.position.set(side, H * 0.5 + 0.32, L * 0.505);
                    group.add(hl);
                });

                group.userData.halfWidth = 1.05;
                group.userData.halfLength = 2.45;
            } else {
                // Sedan / Hatchback (Lada / Solaris / Camry)
                const W = 1.85, L = 4.4, H = 1.35;
                const lower = new THREE.Mesh(new THREE.BoxGeometry(W, H * 0.52, L), bodyMat);
                lower.position.y = H * 0.26 + 0.28;
                group.add(lower);

                const cabin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.88, H * 0.55, L * 0.52), bodyMat);
                cabin.position.set(0, H * 0.65 + 0.28, -L * 0.05);
                group.add(cabin);

                const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(W * 0.89, H * 0.50, L * 0.50), glassMat);
                cabinGlass.position.set(0, H * 0.65 + 0.28, -L * 0.05);
                group.add(cabinGlass);

                // Police specific markings & SGU flasher
                if (type === 'police') {
                    const stripe = new THREE.Mesh(new THREE.BoxGeometry(W * 1.01, 0.18, L * 0.8), new THREE.MeshBasicMaterial({ color: 0x1d4ed8 }));
                    stripe.position.y = H * 0.38 + 0.28;
                    group.add(stripe);

                    // SGU roof flasher bar
                    const sguBar = new THREE.Mesh(new THREE.BoxGeometry(W * 0.65, 0.08, 0.18), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
                    sguBar.position.set(0, H + 0.32, -L * 0.05);
                    group.add(sguBar);

                    const sguRed = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.16), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
                    sguRed.position.set(-0.25, H + 0.37, -L * 0.05);
                    group.add(sguRed);
                    group.userData.policeRed = sguRed;

                    const sguBlue = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.16), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
                    sguBlue.position.set(0.25, H + 0.37, -L * 0.05);
                    group.add(sguBlue);
                    group.userData.policeBlue = sguBlue;
                }

                // Taillights
                [-0.72, 0.72].forEach(side => {
                    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.08), taillightMat);
                    tl.position.set(side, H * 0.42 + 0.28, -L * 0.504);
                    group.add(tl);
                });

                // Headlights
                [-0.72, 0.72].forEach(side => {
                    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.08), headlightMat);
                    hl.position.set(side, H * 0.42 + 0.28, L * 0.504);
                    group.add(hl);
                });

                group.userData.halfWidth = 0.95;
                group.userData.halfLength = 2.25;
            }

            // Wheels
            const wheelRadius = 0.32;
            const wheelWidth = 0.24;
            const halfW = group.userData.halfWidth * 0.95;
            const halfL = group.userData.halfLength * 0.65;
            group.userData.wheels = [];

            [-halfW, halfW].forEach(wx => {
                [-halfL, halfL].forEach(wz => {
                    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
                    wheelGeo.rotateZ(Math.PI / 2);
                    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
                    wheel.position.set(wx, wheelRadius, wz);
                    group.add(wheel);
                    group.userData.wheels.push(wheel);

                    // Hubcap
                    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, wheelWidth * 1.05, 12), chromeMat);
                    cap.rotateZ(Math.PI / 2);
                    cap.position.set(wx, wheelRadius, wz);
                    group.add(cap);
                    group.userData.wheels.push(cap);
                });
            });

            return group;
        }

        start(config = {}) {
            this.carName = config.carName || 'ВАЗ-2107 «Жигули»';
            this.styling = Object.assign({}, config.styling || {});
            this.performance = Object.assign({}, config.performance || {});

            // Initialize player physics parameters
            this.state.x = 2.125; // start in lane 2
            this.state.z = 0;
            this.state.vx = 0;
            this.state.bodyRoll = 0;
            this.camRoll = 0;
            this.state.speed = 40; // rolling start
            this.state.targetSpeed = (this.performance.speed || 180) * 0.75;
            this.state.accel = 24 + ((this.performance.accel || 3.0) < 2.5 ? 12 : 6);
            this.state.maxSpeed = this.performance.speed || 190;
            this.state.handling = this.performance.handling || 5.5;
            this.state.driftFactor = this.performance.driftFactor || 1.35;
            this.state.rewardMult = this.performance.rewardMult || 1.0;
            this.state.fuelCurrent = this.performance.tankCapacity || 45;
            this.state.fuelConsumption = this.performance.consumption || 9.0;
            this.state.fuelLiters = 0;
            this.state.distanceKm = 0;
            this.state.peakSpeed = 40;
            this.state.earnedCash = 0;
            this.state.driftScore = 0;
            this.state.driftCurrentScore = 0;
            this.state.driftCombo = 1;
            this.state.driftDuration = 0;
            this.state.isDrifting = false;
            this.state.isNitroActive = false;
            this.state.nitroLevel = 100;
            this.state.overtakesCount = 0;
            this.state.overtakeCombo = 0;
            this.state.overtakeComboTimer = 0;
            this.state.damageTaken = 0;
            this.state.bodyRoll = 0;
            this.state.pitchSquat = 0;
            this.state.pitchVelocity = 0;
            this.state.downforceY = 0;
            this.state.yawAngle = 0;
            this.state.shakeAmount = 0;

            // 7-speed transmission, RPM and spring-damper suspension state
            this.state.gear = 1;
            this.state.prevGear = 1;
            this.state.rpm = 1200;
            const carId = identifyCarModel(this.carName);
            const isSupercar = ['sf90', 'huracan', 'porsche911', 'chiron', 'jesko', 'gtr'].includes(carId);
            this.state.maxRpm = isSupercar ? 8800 : (['m5e60', 'm5f90', 'm8', 'e63', 'rs6', 'g63'].includes(carId) ? 7500 : 6500);
            this.state.idleRpm = isSupercar ? 1100 : 900;
            this.state.shiftShock = 0;
            this.state.gasHoldTime = 0;
            this.state.prevGas = false;
            this.state.wasBraking = false;
            this.state.backfireTimer = 0;
            this.state.backfireColor = 'orange';
            this.state.brakeHeat = 0;
            this.state.time = 0;
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

            // Load Player's authentic 3D car model
            this.loadPlayerCar();

            // Setup atmosphere
            this.setupEnvironment(config.weather || 'night');

            this.isRunning = true;
            this.lastTime = performance.now();
            if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
            this.animFrameId = requestAnimationFrame(this.loop.bind(this));

            setTimeout(() => {
                if (this._onResize) this._onResize();
            }, 60);
        }

        setPlayerPlate(plateText) {
            if (!this.styling) this.styling = {};
            this.styling.plate = plateText;
            if (this.playerCar && this.THREE) {
                applyLicensePlateToModel(this.THREE, this.playerCar, plateText);
            }
        }

        loadPlayerCar() {
            const THREE = this.THREE;
            if (!this.playerCar) {
                // Immediately spawn the detailed procedural 3D model so the car is on track on frame 1
                try {
                    const immediateModel = buildDetailedCarModel(THREE, this.carName, this.styling);
                    if (immediateModel) {
                        this.playerCar = immediateModel;
                        if (this.styling && this.styling.plate !== undefined) {
                            applyLicensePlateToModel(THREE, this.playerCar, this.styling.plate);
                        }
                        this.playerCar.position.set(this.state.x, 0, this.state.z);
                        this.scene.add(this.playerCar);
                        this.setupCarLightingAndFX();
                    }
                } catch (e) {
                    console.warn('Could not build immediate procedural model:', e);
                }
            }

            // Load high-resolution model asynchronously with timeout guard
            let hasLoaded = false;
            const loadTimer = setTimeout(() => {
                if (!hasLoaded) {
                    console.info('GLB model loading took longer than 2.5s, keeping detailed procedural model active.');
                }
            }, 2500);

            try {
                loadCarModel(THREE, this.carName, this.styling, (model) => {
                    hasLoaded = true;
                    clearTimeout(loadTimer);
                    if (!this.isRunning || !this.scene) return;
                    if (this.playerCar) {
                        this.scene.remove(this.playerCar);
                        this.playerCar = null;
                    }
                    this.playerCar = model;
                    if (this.styling && this.styling.plate !== undefined) {
                        applyLicensePlateToModel(THREE, this.playerCar, this.styling.plate);
                    }
                    this.playerCar.position.set(this.state.x, 0, this.state.z);
                    this.scene.add(this.playerCar);
                    this.setupCarLightingAndFX();
                });
            } catch (err) {
                console.warn('loadCarModel error:', err);
            }
        }

        setupCarLightingAndFX() {
            const THREE = this.THREE;
            if (!this.playerCar) return;

            try {
                // Compute bounds of player model
                const box = new THREE.Box3().setFromObject(this.playerCar);
                const size = box.getSize(new THREE.Vector3());
                const halfL = (size.z || 4.4) * 0.5;
                const halfW = (size.x || 1.9) * 0.5;

                // 1. Two forward Headlight Beams
                this.playerHeadlights = [];
                [-1, 1].forEach(side => {
                    const hlSpot = new THREE.SpotLight(0xffffff, 2.2, 55, Math.PI / 7, 0.45, 1.2);
                    hlSpot.position.set(side * (halfW * 0.75), 0.75, halfL - 0.2);
                    hlSpot.target.position.set(side * (halfW * 0.5), 0.2, halfL + 30);
                    this.playerCar.add(hlSpot);
                    this.playerCar.add(hlSpot.target);
                    this.playerHeadlights.push(hlSpot);
                });

                // 2. Taillight Braking Emissive Glow & Dynamic Brake Point Light
                this.playerTaillights = [];
                this.playerCar.traverse(child => {
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
                this.playerBrakeLight = new THREE.PointLight(0xdc2626, 0.2, 5.0, 1.5);
                this.playerBrakeLight.position.set(0, 0.65, -halfL - 0.05);
                this.playerCar.add(this.playerBrakeLight);

                // 3. Multi-Layer Nitro Exhaust Flame Meshes & Dynamic Road Light
                this.playerNitroFlames = [];
                [-1, 1].forEach(side => {
                    const flameGeo = new THREE.ConeGeometry(0.14, 0.95, 12);
                    flameGeo.rotateX(-Math.PI / 2);
                    const flameMat = new THREE.MeshBasicMaterial({
                        color: 0x00f0ff,
                        transparent: true,
                        opacity: 0.95
                    });
                    const flame = new THREE.Mesh(flameGeo, flameMat);
                    flame.position.set(side * (halfW * 0.42), 0.28, -halfL - 0.48);
                    flame.visible = false;
                    this.playerCar.add(flame);
                    this.playerNitroFlames.push(flame);

                    const coreGeo = new THREE.ConeGeometry(0.07, 0.65, 8);
                    coreGeo.rotateX(-Math.PI / 2);
                    const coreMat = new THREE.MeshBasicMaterial({
                        color: 0xffffff,
                        transparent: true,
                        opacity: 0.95
                    });
                    const core = new THREE.Mesh(coreGeo, coreMat);
                    core.position.set(side * (halfW * 0.42), 0.28, -halfL - 0.35);
                    core.visible = false;
                    this.playerCar.add(core);
                    this.playerNitroFlames.push(core);
                });

                this.playerNitroLight = new THREE.PointLight(0x00d4ff, 0, 7.0, 1.8);
                this.playerNitroLight.position.set(0, 0.35, -halfL - 0.5);
                this.playerCar.add(this.playerNitroLight);

                // 4. Exhaust Backfire Flame Pops & Road Flash Light
                this.playerBackfireFlames = [];
                [-1, 1].forEach(side => {
                    const bfGeo = new THREE.ConeGeometry(0.18, 0.72, 10);
                    bfGeo.rotateX(-Math.PI / 2);
                    const bfMat = new THREE.MeshBasicMaterial({
                        color: 0xff6600,
                        transparent: true,
                        opacity: 0.95
                    });
                    const bf = new THREE.Mesh(bfGeo, bfMat);
                    bf.position.set(side * (halfW * 0.42), 0.28, -halfL - 0.36);
                    bf.visible = false;
                    this.playerCar.add(bf);
                    this.playerBackfireFlames.push(bf);
                });

                this.playerBackfireLight = new THREE.PointLight(0xff7700, 0, 6.0, 2.0);
                this.playerBackfireLight.position.set(0, 0.35, -halfL - 0.4);
                this.playerCar.add(this.playerBackfireLight);

                // 5. Glowing Brake Discs Collection
                this.playerBrakeDiscs = [];
                this.playerCar.traverse(child => {
                    if (child.isMesh && child.material && (
                        child.name.includes('BrakeDisc') || child.name.includes('disc') ||
                        (child.parent && child.parent.name === 'BrakeCaliperGroup')
                    )) {
                        this.playerBrakeDiscs.push(child);
                    }
                });

                // 6. Active Aero Spoiler / Air-Brake Flaps
                this.playerActiveAero = [];
                this.playerCar.traverse(child => {
                    const n = String(child.name || '').toLowerCase();
                    if (child.isMesh && (n.includes('spoiler') || n.includes('wing') || n.includes('aero_wing'))) {
                        this.playerActiveAero.push({
                            mesh: child,
                            baseRotX: child.rotation.x
                        });
                    }
                });

                // 4. Underglow Neon (if player has neon tuning)
                const neonVal = this.styling.neon;
                if (neonVal && neonVal !== 'none') {
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
                    this.playerCar.add(neonPointLight);
                }

                // 5. Roof SGU Flasher Strobe Light (if car has SGU flasher)
                if (this.styling.sgu) {
                    this.playerSguLight = new THREE.PointLight(0xef4444, 0, 15);
                    this.playerSguLight.position.set(0, size.y + 0.1, 0);
                    this.playerCar.add(this.playerSguLight);
                }

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
            } catch (err) {
                console.warn('setupCarLightingAndFX non-critical error:', err);
            }
        }

        stop() {
            this.isRunning = false;
            if (this.animFrameId) {
                cancelAnimationFrame(this.animFrameId);
                this.animFrameId = null;
            }
        }

        setKey(key, isDown) {
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = !!isDown;
            }
        }

        resetKeys() {
            Object.keys(this.keys).forEach(k => { this.keys[k] = false; });
        }

        cycleCamera() {
            this.cameraMode = (this.cameraMode + 1) % this.cameraModes.length;
            if (this.options.onSound) this.options.onSound('camera');
            const modeNames = ['Вид сзади (Динамический)', 'Вид сзади (Спортивный)', 'Капот / Бампер'];
            if (this.options.onPopup) this.options.onPopup('📷 ' + modeNames[this.cameraMode], '#38bdf8');
            return this.cameraMode;
        }

        loop(timestamp) {
            if (!this.isRunning) return;
            const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
            this.lastTime = timestamp;

            this.update(dt);
            this.render();

            if (this.isRunning) {
                this.animFrameId = requestAnimationFrame(this.loop.bind(this));
            }
        }

        update(dt) {
            const state = this.state;
            const keys = this.keys;

            // 1. NITRO BOOST HANDLING
            if (keys.nitro && state.nitroLevel > 0) {
                state.isNitroActive = true;
                state.nitroLevel = Math.max(0, state.nitroLevel - 30 * dt);
                const nScale = 0.9 + Math.random() * 0.45;
                this.playerNitroFlames.forEach(flame => {
                    flame.visible = true;
                    flame.scale.set(nScale, nScale, nScale * (1.1 + Math.random() * 0.35));
                });
                if (this.playerNitroLight) {
                    this.playerNitroLight.intensity = 2.8 + Math.random() * 0.8;
                }
                if (Math.random() < 0.35) {
                    this.spawnSparks(state.x + (Math.random() - 0.5) * 0.8, 0.28, state.z - 2.3, 2);
                }
                if (this.options.onSound && Math.random() < 0.2) {
                    this.options.onSound('nitro');
                }
            } else {
                state.isNitroActive = false;
                this.playerNitroFlames.forEach(flame => { flame.visible = false; });
                if (this.playerNitroLight) {
                    this.playerNitroLight.intensity = 0;
                }
                // Slow passive nitro recharge when driving fast or drifting
                if (!keys.nitro && state.speed > 60) {
                    state.nitroLevel = Math.min(100, state.nitroLevel + (state.isDrifting ? 12 : 5) * dt);
                }
            }

            // 2. TRANSMISSION, THROTTLE, ACCELERATION & BRAKING
            const nitroMult = state.isNitroActive ? 1.25 : 1.0;
            const targetMaxSpeed = state.maxSpeed * nitroMult;

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
            const targetRpm = state.idleRpm + gearProg * (state.maxRpm - state.idleRpm) * 0.90 + (keys.gas ? (state.maxRpm * 0.10) : 0);
            state.rpm = (state.rpm || state.idleRpm) + (targetRpm - (state.rpm || state.idleRpm)) * Math.min(1.0, 16.0 * dt);

            // Shift torque interruption
            const shiftTorque = state.shiftShock > 0 ? 0.35 : 1.0;
            if (state.shiftShock > 0) state.shiftShock = Math.max(0, state.shiftShock - dt);

            // Throttle & Braking
            if (keys.gas) {
                state.gasHoldTime = (state.gasHoldTime || 0) + dt;
                // High low-gear wheel torque (hypercar launch feeling)
                const gearTorque = Math.max(0.70, 1.45 - ((state.gear || 1) - 1) * 0.11);
                // Realistic aerodynamic drag (proportional to v^2)
                const aeroDrag = Math.pow(state.speed / 100, 2) * 1.85;
                const rawAccel = state.accel * gearTorque * (state.isNitroActive ? 1.70 : 1.0) * shiftTorque;
                const netAccel = Math.max(3.0, rawAccel - aeroDrag);
                state.speed = Math.min(targetMaxSpeed, state.speed + netAccel * dt);
            } else if (keys.brake) {
                if (!state.wasBraking && state.speed > 60) {
                    if (this.options.onSound) this.options.onSound('brake');
                }
                const brakeBite = 105 + (state.speed / 100) * 20;
                state.speed = Math.max(0, state.speed - brakeBite * dt);
            } else {
                // Natural engine braking & aerodynamic coasting drag
                if (state.prevGas && state.speed > 80 && state.gasHoldTime > 0.6) {
                    state.backfireTimer = 0.15;
                    state.backfireColor = 'orange';
                    if (this.options.onSound) this.options.onSound('blowOff');
                }
                const coastingDrag = 9.0 + Math.pow(state.speed / 100, 2) * 4.2;
                state.speed = Math.max(0, state.speed - coastingDrag * dt);
            }
            if (!keys.gas) state.gasHoldTime = 0;
            state.prevGas = !!keys.gas;
            state.wasBraking = !!keys.brake;

            // Spring-damper suspension model for pitch (rear squat on acceleration, nose-dive on braking)
            const targetPitch = keys.gas ? -0.042 : (keys.brake ? 0.055 : 0.0);
            const springK = 48.0;
            const damperC = 10.5;
            const pitchForce = (targetPitch - (state.pitchSquat || 0)) * springK - (state.pitchVelocity || 0) * damperC;
            state.pitchVelocity = (state.pitchVelocity || 0) + pitchForce * dt;
            state.pitchSquat = (state.pitchSquat || 0) + state.pitchVelocity * dt;
            state.pitchSquat = Math.max(-0.065, Math.min(0.075, state.pitchSquat));

            // Aerodynamic high-speed downforce (chassis lowers to ground)
            state.downforceY = -Math.min(0.035, Math.pow(state.speed / 380, 2) * 0.035);

            // Taillight emissive intensity & dynamic brake light on braking
            const isBraking = !!keys.brake;
            const tlIntensity = isBraking ? 2.8 : 0.35;
            this.playerTaillights.forEach(tl => {
                if (tl.material) tl.material.emissiveIntensity = tlIntensity;
            });
            if (this.playerBrakeLight) {
                this.playerBrakeLight.intensity = isBraking ? 2.8 : 0.2;
            }

            // Peak speed tracking
            if (state.speed > state.peakSpeed) {
                state.peakSpeed = state.speed;
            }

            // 3. FORWARD DISPLACEMENT (DISTANCE) & RACE INCOME
            const forwardSpeedMps = state.speed / 3.6;
            const dz = forwardSpeedMps * dt;
            state.z += dz;
            state.distanceKm = state.z / 1000;

            // Continuous speed earnings on the highway
            if (state.speed > 25) {
                const cashRatePerSec = (state.speed * 4.0) * (state.rewardMult || 1.0);
                state.earnedCash += cashRatePerSec * dt;
            }

            // Milestone distance bonus for every full 1 km driven
            const currentKm = Math.floor(state.distanceKm);
            if (!state.lastMilestoneKm) state.lastMilestoneKm = 0;
            if (currentKm > state.lastMilestoneKm) {
                state.lastMilestoneKm = currentKm;
                const kmBonus = Math.round(10000 * (state.rewardMult || 1.0));
                state.earnedCash += kmBonus;
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
                    gas: keys.gas,
                    nitro: state.isNitroActive,
                    drafting: false
                });
                state.fuelLiters += burned;
                state.fuelCurrent = Math.max(0, state.fuelCurrent - burned);
                if (state.fuelCurrent <= 0 && state.speed <= 5) {
                    this.stop();
                    if (this.options.onGameOver) this.options.onGameOver('fuel', this.getState());
                    return;
                }
            }

            // 5. STEERING, HANDBRAKE & DRIFT MECHANICS
            const isHandbrake = !!keys.drift;
            const driftMult = state.driftFactor || 1.35;
            // High-speed steering stability: heavier feel and high directional stability at 200+ km/h
            const speedStability = Math.max(0.68, 1.0 - (state.speed / 380) * 0.32);
            const lateralMax = (state.handling * 2.8 * speedStability) * (isHandbrake ? (1 + (driftMult - 1) * 0.7) : 1.0);

            let steerInput = 0;
            if (keys.left) steerInput += 1;  // In Three.js with camera facing +Z: +X moves to screen LEFT
            if (keys.right) steerInput -= 1; // -X moves to screen RIGHT

            if (steerInput !== 0) {
                state.vx += steerInput * lateralMax * 4.2 * dt;
                state.vx = Math.max(-lateralMax, Math.min(lateralMax, state.vx));
            } else {
                state.vx *= Math.max(0, 1 - 7.5 * dt);
            }

            // Drift detection: initiated with handbrake, maintained while sliding
            const hasLateralSlide = Math.abs(state.vx) > 1.2 && state.speed > 30;
            const isCounterSteering = state.vx * steerInput < 0; // steering opposite to slide
            const isDriftingNow = (isHandbrake && (Math.abs(steerInput) > 0 || hasLateralSlide)) || (state.isDrifting && hasLateralSlide);

            if (isDriftingNow) {
                state.isDrifting = true;
                state.driftDuration += dt;

                // Realistic slip-angle yaw: smoothly rotate body into drift direction
                const slipRatio = Math.max(-1, Math.min(1, state.vx / (lateralMax || 1)));
                const baseDriftAngle = slipRatio * 0.52; // car angles into the slide (+X yaw > 0 points to screen left)
                // Counter-steer adjustment: nose aligns slightly with counter-steer
                const targetYaw = baseDriftAngle + (isCounterSteering ? steerInput * 0.12 : 0);
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
                const normalTurnYaw = steerInput * Math.min(0.20, (Math.abs(state.vx) / lateralMax) * 0.18);
                state.yawAngle += (normalTurnYaw - state.yawAngle) * Math.min(1, 8 * dt);
                if (state.driftCurrentScore > 30) {
                    const bankedCash = Math.round(state.driftCurrentScore * 4.0 * state.rewardMult);
                    state.earnedCash += bankedCash;
                    if (this.options.onPopup) {
                        this.options.onPopup(`🌪️ ЗАНОС: +${Math.round(state.driftCurrentScore)} PTS (+${bankedCash.toLocaleString('ru-RU')} ₽)`, '#fbbf24');
                    }
                    if (this.options.onSound) this.options.onSound('cash');
                    state.driftCurrentScore = 0;
                    state.driftCombo = 1;
                }
            }

            // Apply lateral movement
            state.x += state.vx * dt;

            // Guardrail Collision Boundaries (-8.2 to +8.2)
            const roadLimit = 8.2;
            if (state.x < -roadLimit || state.x > roadLimit) {
                state.x = Math.max(-roadLimit, Math.min(roadLimit, state.x));
                state.vx = -state.vx * 0.35;
                state.speed = Math.max(10, state.speed * 0.75);
                state.damageTaken += 2.5;
                state.shakeAmount = 0.45;
                this.spawnSparks(state.x, 0.4, state.z, 15);
                if (state.isDrifting) {
                    if (this.options.onPopup) this.options.onPopup('💥 ДРИФТ СОРВАН!', '#ef4444');
                    state.driftCurrentScore = 0;
                    state.driftCombo = 1;
                    state.isDrifting = false;
                }
                if (this.options.onSound) this.options.onSound('scrape');
            }

            // Body roll tilt: car chassis leans gently outwards into turn with realistic suspension damping
            const targetBodyRoll = Math.max(-0.065, Math.min(0.065, state.vx * 0.0045));
            state.bodyRoll = (state.bodyRoll || 0) + (targetBodyRoll - (state.bodyRoll || 0)) * Math.min(1.0, 9.0 * dt);

            state.time = (state.time || 0) + dt;

            // Engine tremor calculation (idle rumble & rev-limiter mechanical shudder)
            const idleTremor = (1.0 - Math.min(1.0, state.speed / 25)) * 0.0018 * Math.sin(state.time * 24);
            const redlineProg = Math.max(0, (state.rpm - (state.maxRpm * 0.90)) / (state.maxRpm * 0.10 || 1));
            const redlineTremor = redlineProg * 0.0032 * Math.sin(state.time * 72);
            const engineTremorY = idleTremor + redlineTremor;
            const engineTremorRoll = (idleTremor + redlineTremor) * 0.75;

            // Subtle asphalt expansion joint and road heave
            const roadHeave = (Math.sin(state.z * 0.14) * 0.005 + Math.sin(state.z * 0.36) * 0.003) * Math.min(1.0, state.speed / 35);

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
                        } else {
                            disc.material.emissiveIntensity = 0;
                        }
                    }
                });
            }

            // Active aerodynamics: air-brake rear wing tilt on hard braking
            if (this.playerActiveAero && this.playerActiveAero.length > 0) {
                const isAirBraking = keys.brake && state.speed > 100;
                const targetWingTilt = isAirBraking ? 0.32 : 0;
                this.playerActiveAero.forEach(aero => {
                    const cur = aero.mesh.rotation.x;
                    aero.mesh.rotation.x = cur + (aero.baseRotX + targetWingTilt - cur) * Math.min(1.0, 9.0 * dt);
                });
            }

            // Exhaust backfire animation update
            if (state.backfireTimer > 0) {
                state.backfireTimer -= dt;
                const bfScale = 0.85 + Math.random() * 0.65;
                const isBlue = state.backfireColor === 'blue';
                this.playerBackfireFlames.forEach(bf => {
                    bf.visible = true;
                    bf.scale.set(bfScale, bfScale, bfScale * 1.25);
                    if (bf.material) {
                        bf.material.color.setHex(isBlue ? 0x38bdf8 : (Math.random() < 0.5 ? 0xff5500 : 0xffaa00));
                    }
                });
                if (this.playerBackfireLight) {
                    this.playerBackfireLight.color.setHex(isBlue ? 0x38bdf8 : 0xff7700);
                    this.playerBackfireLight.intensity = 3.6;
                }
                if (Math.random() < 0.4) {
                    this.spawnSparks(state.x + (Math.random() - 0.5) * 0.6, 0.3, state.z - 2.2, 3);
                }
            } else {
                this.playerBackfireFlames.forEach(bf => { bf.visible = false; });
                if (this.playerBackfireLight) {
                    this.playerBackfireLight.intensity = 0;
                }
            }

            // 6. UPDATE PLAYER CAR 3D MESH
            if (this.playerCar) {
                this.playerCar.position.set(state.x, (state.downforceY || 0) + engineTremorY + roadHeave, state.z);
                this.playerCar.rotation.set(state.pitchSquat, state.yawAngle, state.bodyRoll + engineTremorRoll);

                // Rotate dedicated procedural wheel spinners around local hub axis
                if (this.playerWheels && this.playerWheels.length > 0) {
                    const wheelRotSpeed = (forwardSpeedMps / 0.33) * dt;
                    this.playerWheels.forEach(spinner => {
                        const parent = spinner.parent;
                        const side = (parent && parent.userData && parent.userData.side) ? parent.userData.side : 1;
                        spinner.rotation.x += (side === -1 ? -wheelRotSpeed : wheelRotSpeed);
                    });
                }

                // Smooth front-wheel steering angle
                if (this.playerSteerWheels && this.playerSteerWheels.length > 0) {
                    const targetSteerAngle = steerInput * 0.32;
                    this.playerSteerWheels.forEach(w => {
                        const baseY = w.userData.baseRotY || 0;
                        w.rotation.y = baseY + targetSteerAngle;
                    });
                }

                // SGU Flasher strobe oscillation
                if (this.playerSguLight) {
                    state.sguTimer += dt * 10;
                    const isRed = Math.floor(state.sguTimer) % 2 === 0;
                    this.playerSguLight.color.setHex(isRed ? 0xef4444 : 0x3b82f6);
                    this.playerSguLight.intensity = (state.sguTimer % 1 < 0.6) ? 3.5 : 0.2;
                }
            }

            // 7. TRAFFIC VEHICLES AI, OVERTAKES & COLLISIONS
            this.updateTraffic(dt);

            // 8. HIGHWAY ROAD CHUNKS RECYCLING
            this.updateRoadChunks();

            // 9. SMOKE & SPARK PARTICLES UPDATE
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

            // 11. NOTIFY HUD CALLBACK
            this.notifyHUD();
        }

        updateTraffic(dt) {
            const state = this.state;

            this.trafficCars.forEach(car => {
                const u = car.userData;

                // 1. Move traffic car forward along Z
                const tSpeedMps = u.speed / 3.6;
                car.position.z += tSpeedMps * dt;

                // Animate traffic wheels rotation
                if (u.wheels && u.wheels.length > 0) {
                    const rotSpeed = (tSpeedMps / 0.32) * dt;
                    u.wheels.forEach(w => {
                        w.rotation.x += rotSpeed;
                    });
                }

                // Traffic suspension micro-bounce
                car.position.y = Math.sin(car.position.z * 0.16 + (u.laneIndex || 0)) * 0.005;

                // Police strobe flashing animation
                if (u.type === 'police' && u.policeRed && u.policeBlue) {
                    u.sguStrobeTimer = (u.sguStrobeTimer || 0) + dt * 14;
                    const isRed = Math.floor(u.sguStrobeTimer) % 2 === 0;
                    u.policeRed.material.color.setHex(isRed ? 0xef4444 : 0x450a0a);
                    u.policeBlue.material.color.setHex(isRed ? 0x1e3a8a : 0x3b82f6);
                }

                // 2. Periodic lane changing behavior
                u.laneChangeTimer -= dt;
                if (u.laneChangeTimer <= 0) {
                    u.laneChangeTimer = 6 + Math.random() * 10;
                    // Change to adjacent lane
                    const curLane = u.laneIndex;
                    const newLane = (curLane === 0) ? 1 : (curLane === 3) ? 2 : (Math.random() < 0.5 ? curLane - 1 : curLane + 1);
                    u.laneIndex = newLane;
                    u.targetX = this.trafficLanes[newLane];
                }

                // Smoothly steer towards target lane with body roll lean
                if (Math.abs(car.position.x - u.targetX) > 0.05) {
                    const dir = u.targetX > car.position.x ? 1 : -1;
                    const step = dir * 2.2 * dt;
                    car.position.x += step;
                    car.rotation.y = (dir > 0 ? 0.08 : -0.08);
                    car.rotation.z = (dir > 0 ? -0.04 : 0.04);
                } else {
                    car.position.x = u.targetX;
                    car.rotation.y = 0;
                    car.rotation.z = 0;
                }

                // 3. Near-Miss Overtake Detection
                const dx = Math.abs(state.x - car.position.x);
                const dz = car.position.z - state.z;
                const speedDiff = state.speed - u.speed;

                if (!u.overtaken && dz < 0 && dz > -5.0 && dx < 2.3 && speedDiff > 25) {
                    u.overtaken = true;
                    state.overtakesCount++;
                    state.overtakeCombo++;
                    state.overtakeComboTimer = 3.5;

                    const pts = 250 * Math.min(state.overtakeCombo, 10);
                    const cash = Math.round(pts * 4.0 * state.rewardMult);
                    state.earnedCash += cash;

                    if (this.options.onPopup) {
                        this.options.onPopup(`🔥 ОПАСНЫЙ ОБГОН +${pts} PTS (+${cash.toLocaleString('ru-RU')} ₽) x${state.overtakeCombo}`, '#f59e0b');
                    }
                    if (this.options.onSound) {
                        this.options.onSound('nearMiss');
                    }
                }

                // 4. Collision Detection with Player Car
                const trafficHalfW = car.userData.halfWidth || 1.0;
                const trafficHalfL = car.userData.halfLength || 2.2;
                const lateralClearance = trafficHalfW + 0.55;
                const longitudinalClearance = trafficHalfL + 1.2;

                // Contact occurs only when overlapping in front or sides (not behind)
                if (dx < lateralClearance && dz > -0.6 && dz < longitudinalClearance) {
                    const isRearEndHit = dz > 0.4 && dx < (trafficHalfW * 0.65);
                    if (isRearEndHit && speedDiff > 35) {
                        // High-speed direct rear-end collision -> CRASH
                        this.stop();
                        state.damageTaken += 12;
                        this.spawnSparks(state.x, 0.8, state.z + 1.0, 45);
                        if (this.options.onSound) this.options.onSound('crash');
                        if (this.options.onGameOver) this.options.onGameOver(true, this.getState());
                        return;
                    } else {
                        // Glancing sideswipe / low-speed bumper nudge
                        state.speed = Math.max(15, state.speed * 0.80);
                        state.damageTaken += 3.5;
                        state.shakeAmount = 0.5;
                        car.position.x += (car.position.x > state.x ? 0.7 : -0.7);
                        this.spawnSparks(state.x, 0.5, state.z + 0.5, 20);
                        if (this.options.onPopup) this.options.onPopup('💥 КАСАТЕЛЬНЫЙ УДАР!', '#ef4444');
                        if (this.options.onSound) this.options.onSound('scrape');
                    }
                }

                // 5. Recycle traffic when it falls behind player
                if (car.position.z < state.z - 35) {
                    const newLane = (u.type === 'truck') ? 3 : Math.floor(Math.random() * 4);
                    car.position.set(this.trafficLanes[newLane], 0, state.z + 180 + Math.random() * 120);
                    u.laneIndex = newLane;
                    u.targetX = this.trafficLanes[newLane];
                    u.speed = u.baseSpeed;
                    u.overtaken = false;
                }
            });

            // Overtake combo timeout
            if (state.overtakeComboTimer > 0) {
                state.overtakeComboTimer -= dt;
                if (state.overtakeComboTimer <= 0) {
                    state.overtakeCombo = 0;
                }
            }
        }

        updateRoadChunks() {
            const state = this.state;
            this.roadChunks.forEach(chunk => {
                if (chunk.position.z < state.z - 50) {
                    chunk.position.z = this.highestChunkZ + this.chunkLength;
                    this.highestChunkZ = chunk.position.z;
                }
            });
        }

        updateChaseCamera(dt) {
            const state = this.state;
            const mode = this.cameraModes[this.cameraMode] || this.cameraModes[0];
            const isPortrait = this.camera && this.camera.aspect < 1.0;
            const isHood = this.cameraMode === 2;

            // 1. Target camera offset based on camera mode and viewport aspect
            // In portrait aspect, elevate camera slightly so the vehicle sits higher in frame,
            // preventing lower HUD gauges (speedometer & nitro) from covering the bumper and plate.
            const accelLag = !isHood ? ((this.keys && this.keys.gas) ? 0.30 : ((this.keys && this.keys.brake) ? -0.25 : 0)) : 0;
            const targetCamX = state.x * (isHood ? 1.0 : 0.75);
            const targetCamY = mode.offset.y + (isPortrait && !isHood ? 0.45 : 0);
            const targetCamZ = state.z + mode.offset.z - (isPortrait && !isHood ? 0.35 : 0) - accelLag * Math.min(1.0, state.speed / 100);

            // 2. Smooth spring follow for camera position (glides smoothly across lanes without snapping)
            const posLerp = isHood ? 16.0 : 6.0;
            this.camPos.x += (targetCamX - this.camPos.x) * Math.min(1.0, posLerp * dt);
            this.camPos.y += (targetCamY - this.camPos.y) * Math.min(1.0, 6.0 * dt);
            this.camPos.z = targetCamZ;

            // 3. Screen shake on collision / wall hit
            let shakeX = 0, shakeY = 0;
            if (state.shakeAmount > 0) {
                state.shakeAmount = Math.max(0, state.shakeAmount - 2.5 * dt);
                shakeX = (Math.random() - 0.5) * state.shakeAmount * 0.35;
                shakeY = (Math.random() - 0.5) * state.shakeAmount * 0.35;
            }

            // High-speed subtle road vibration (>200 km/h)
            if (state.speed > 200) {
                const vib = ((state.speed - 200) / 140) * 0.012;
                shakeX += (Math.random() - 0.5) * vib;
                shakeY += (Math.random() - 0.5) * vib;
            }

            this.camera.position.set(this.camPos.x + shakeX, this.camPos.y + shakeY, this.camPos.z);

            // 4. Stable look-at point:
            // Aligned forward along the camera trajectory so the road ahead does NOT violently whip
            // diagonally across the screen when steering. In drift, adds gentle slide anticipation.
            const driftLookBias = (state.isDrifting && !isHood) ? state.yawAngle * 0.16 : 0;
            const targetLookX = isHood ? state.x : (this.camPos.x * 0.82 + state.x * 0.18 + driftLookBias);
            const targetLookY = mode.lookOffset.y - (isPortrait && !isHood ? 0.20 : 0);
            const targetLookZ = state.z + mode.lookOffset.z;

            const lookLerp = isHood ? 16.0 : 6.5;
            this.camLook.x += (targetLookX - this.camLook.x) * Math.min(1.0, lookLerp * dt);
            this.camLook.y = targetLookY;
            this.camLook.z = targetLookZ;

            this.camera.lookAt(this.camLook);

            // 5. Cinematic camera banking roll:
            // Smoothly damped and clamped to realistic tilt (max ~3 deg / 0.052 rad in chase, ~0.8 deg in hood).
            // Completely eliminates abrupt jerks, violent swaying, and horizon rocking.
            const maxCamRoll = isHood ? 0.015 : 0.052;
            const targetRoll = Math.max(-maxCamRoll, Math.min(maxCamRoll, -state.vx * 0.0032));
            this.camRoll = (this.camRoll || 0) + (targetRoll - (this.camRoll || 0)) * Math.min(1.0, 5.0 * dt);
            this.camera.rotateZ(this.camRoll);

            // 6. Dynamic FOV warp with speed & nitro
            const speedRatio = Math.min(1.0, state.speed / state.maxSpeed);
            const targetFov = mode.fov + (speedRatio * 14) + (state.isNitroActive ? 7 : 0);
            this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, 5.0 * dt);
            this.camera.updateProjectionMatrix();

            // Starfield follows camera Z
            if (this.starfield) {
                this.starfield.position.z = state.z;
            }
        }

        spawnDriftSmoke(dt) {
            const THREE = this.THREE;
            if (Math.random() < 0.6) {
                const smokeMat = new THREE.MeshBasicMaterial({
                    color: 0xd1d5db,
                    transparent: true,
                    opacity: 0.45
                });
                const smokeGeo = new THREE.SphereGeometry(0.24, 6, 6);
                const smoke = new THREE.Mesh(smokeGeo, smokeMat);
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
                p.material.opacity = Math.max(0, (p.userData.life / p.userData.maxLife) * 0.45);
                if (p.userData.life <= 0) {
                    this.scene.remove(p);
                    this.smokeParticles.splice(i, 1);
                }
            }
        }

        spawnSparks(x, y, z, count = 10) {
            const THREE = this.THREE;
            const forwardSpeedMps = (this.state.speed || 0) / 3.6;
            for (let i = 0; i < count; i++) {
                const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), mat);
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
                driftScore: Math.round(state.driftScore),
                driftCombo: state.driftCombo,
                isDrifting: state.isDrifting,
                overtakesCount: state.overtakesCount,
                overtakeCombo: state.overtakeCombo,
                cameraMode: this.cameraMode,
                weather: this.currentActiveWeather,
                weatherIcon: curPreset ? curPreset.icon : '🌃',
                weatherTitle: curPreset ? curPreset.name : 'Ночь',
                weatherMode: this.weatherMode
            });
        }

        getState() {
            return Object.assign({}, this.state);
        }

        render() {
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        }

        bindResize() {
            this._onResize = () => {
                if (!this.container || !this.renderer || !this.camera) return;
                this.width = this.container.clientWidth || 800;
                this.height = this.container.clientHeight || 500;
                this.camera.aspect = this.width / this.height;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(this.width, this.height);
            };
            if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                window.addEventListener('resize', this._onResize);
                window.addEventListener('orientationchange', () => {
                    setTimeout(() => { if (this._onResize) this._onResize(); }, 120);
                });
            }
        }

        destroy() {
            this.stop();
            if (this._onResize && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
                window.removeEventListener('resize', this._onResize);
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
        Car3DRacingEngine,
        buildDetailedCarModel,
        identifyCarModel,
        renderSideThumbnail,
        getSideThumbnail,
        loadCarModel,
        applyStylingToGLTF,
        createCarMaterials,
        createStudioEnvironment,
        applyLicensePlateToModel,
        createLicensePlate,
        formatPlateComponents
    };
}));


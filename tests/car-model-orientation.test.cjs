'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function setupTestContext() {
    function makeMockElement() {
        return {
            getContext: () => ({
                fillRect: () => {},
                clearRect: () => {},
                fillText: () => {},
                drawImage: () => {},
                measureText: () => ({ width: 100 }),
                createRadialGradient: () => ({ addColorStop: () => {} }),
                createLinearGradient: () => ({ addColorStop: () => {} }),
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                stroke: () => {}
            }),
            width: 512,
            height: 512,
            style: {},
            classList: {
                add: () => {},
                remove: () => {},
                contains: () => false,
                toggle: () => {}
            },
            addEventListener: (evt, cb) => {
                if (evt === 'load') setTimeout(cb, 1);
            },
            removeEventListener: () => {},
            appendChild: () => {},
            removeChild: () => {},
            innerHTML: ''
        };
    }
    const domElementMock = makeMockElement();

    global.window = global;
    global.self = global;
    global.document = {
        createElement: () => makeMockElement(),
        createElementNS: () => makeMockElement(),
        getElementById: () => domElementMock,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {}
    };

    global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
    global.cancelAnimationFrame = (id) => clearTimeout(id);

    const THREE = require('../js/vendor/three.min.js');
    THREE.WebGLRenderer = class MockRenderer {
        constructor() {
            this.domElement = global.document.createElement('canvas');
            this.shadowMap = { enabled: false, type: 0 };
        }
        setPixelRatio() {}
        setSize() {}
        render() {}
        getRenderTarget() { return null; }
        setRenderTarget() {}
        getClearColor() { return new THREE.Color(0x000000); }
        dispose() {}
    };
    global.THREE = THREE;

    delete require.cache[require.resolve('../js/race-effects.js')];
    delete require.cache[require.resolve('../js/car-3d.js')];
    const RaceEffectsManager = require('../js/race-effects.js');
    global.RaceEffectsManager = RaceEffectsManager;
    const Car3DManager = require('../js/car-3d.js');

    return { THREE, RaceEffectsManager, Car3DManager };
}

test('Car model identification recognizes rs6, silvia, and vesta correctly', () => {
    const { Car3DManager } = setupTestContext();
    assert.strictEqual(Car3DManager.identifyCarModel('Audi RS6 Avant'), 'rs6');
    assert.strictEqual(Car3DManager.identifyCarModel('Audi RS3 Sportback'), 'rs6');
    assert.strictEqual(Car3DManager.identifyCarModel('Nissan Silvia S15'), 'silvia');
    assert.strictEqual(Car3DManager.identifyCarModel('Silvia S15 Spec-R'), 'silvia');
    assert.strictEqual(Car3DManager.identifyCarModel('Lada Vesta Sport'), 'vesta');
    assert.strictEqual(Car3DManager.identifyCarModel('Лада Веста'), 'vesta');
    assert.strictEqual(Car3DManager.identifyCarModel('ВАЗ-2107 «Жигули»'), 'vaz2107');
    assert.strictEqual(Car3DManager.identifyCarModel('ВАЗ-2109 «Девятка»'), 'vaz2109');
    assert.strictEqual(Car3DManager.identifyCarModel('Ferrari SF90 Stradale'), 'sf90');
});

test('GLTF setupModel aligns rs6, silvia, and vesta forward facing along +Z with 180° rotation', () => {
    const car3dCode = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');

    // Verify rs6, silvia, and vesta are included in the rotation check
    const rotationMatch = car3dCode.match(/if\s*\(([^)]+)\)\s*\{\s*clonedScene\.rotation\.y\s*\+=\s*Math\.PI/);
    for (const id of ['vaz2109', 'sf90', 'rs6', 'silvia', 'vesta']) {
        assert.ok(
            rotationMatch && rotationMatch[1].includes(`'${id}'`),
            `${id} must be rotated 180° so its front faces +Z`
        );
    }

    // Verify vaz2107 is NOT included in the Math.PI rotation check
    assert.ok(
        rotationMatch && !rotationMatch[1].includes('vaz2107'),
        "vaz2107 must remain naturally oriented facing +Z without Math.PI rotation"
    );
});

test('Procedural and 3D models for rs6, silvia, and vesta have headlights at +Z and taillights at -Z', () => {
    const { THREE, Car3DManager } = setupTestContext();

    const carTests = [
        { name: 'Audi RS6 Avant', id: 'rs6' },
        { name: 'Nissan Silvia S15', id: 'silvia' },
        { name: 'Lada Vesta Sport', id: 'vesta' },
        { name: 'ВАЗ-2107 «Жигули»', id: 'vaz2107' },
        { name: 'ВАЗ-2109 «Девятка»', id: 'vaz2109' }
    ];

    for (const { name, id } of carTests) {
        const car = Car3DManager.buildDetailedCarModel(THREE, name, {
            plate: 'А 777 АА | 77 RUS'
        });
        car.updateMatrixWorld(true);

        const lightPos = Car3DManager.detectVehicleLightPositions(car, id, THREE);

        // Headlights must be at +Z (forward along road)
        assert.ok(
            lightPos.hlL.z > 0.8,
            `Car ${id} left headlight must be at +Z (forward), got ${lightPos.hlL.z}`
        );
        assert.ok(
            lightPos.hlR.z > 0.8,
            `Car ${id} right headlight must be at +Z (forward), got ${lightPos.hlR.z}`
        );

        // Taillights must be at -Z (rearward towards camera)
        assert.ok(
            lightPos.tlL.z < -0.8,
            `Car ${id} left taillight must be at -Z (rearward), got ${lightPos.tlL.z}`
        );
        assert.ok(
            lightPos.tlR.z < -0.8,
            `Car ${id} right taillight must be at -Z (rearward), got ${lightPos.tlR.z}`
        );

        // Headlights Z must be greater than taillights Z
        assert.ok(
            lightPos.hlL.z > lightPos.tlL.z,
            `Car ${id} headlights Z must be greater than taillights Z`
        );

        // License plates: Front at +Z, Rear at -Z
        const fp = car.getObjectByName('FrontLicensePlate');
        const rp = car.getObjectByName('RearLicensePlate');
        assert.ok(fp, `Car ${id} must have FrontLicensePlate`);
        assert.ok(rp, `Car ${id} must have RearLicensePlate`);
        assert.ok(fp.position.z > 0, `Car ${id} front plate must be at +Z, got ${fp.position.z}`);
        assert.ok(rp.position.z < 0, `Car ${id} rear plate must be at -Z, got ${rp.position.z}`);
        assert.ok(fp.position.z > rp.position.z, `Car ${id} front plate Z > rear plate Z`);
    }
});

test('3D Racing Engine: Spotlight headlights cast forward (+Z) and exhaust flames emit rearward (-Z) for rs6, silvia, vesta', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = {
        clientWidth: 800,
        clientHeight: 500,
        style: {},
        appendChild: () => {},
        removeChild: () => {}
    };

    const models = [
        'Audi RS6 Avant',
        'Nissan Silvia S15',
        'Lada Vesta Sport'
    ];

    for (const carName of models) {
        const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});
        engine.start({
            carName: carName,
            performance: { speed: 220, accel: 3.8 }
        });

        // Verify spotlights aim forward (+Z) down the highway
        assert.ok(engine.playerHeadlights.length >= 2, `${carName} must have headlights`);
        engine.playerHeadlights.forEach(hl => {
            assert.ok(hl.target, 'Headlight spotlight must have target');
            // Target Z must be forward of spotlight origin
            assert.ok(
                hl.target.position.z > hl.position.z,
                `${carName} spotlight target Z (${hl.target.position.z}) must be ahead of origin Z (${hl.position.z})`
            );
        });

        // Verify nitro flames are positioned at rear of car (-Z)
        assert.ok(engine.playerNitroFlames.length >= 2, `${carName} must have nitro flames`);
        engine.playerNitroFlames.forEach(flame => {
            assert.ok(
                flame.position.z < 0,
                `${carName} nitro flame must be positioned at rear (-Z), got ${flame.position.z}`
            );
        });

        // Verify backfire flames are positioned at rear of car (-Z)
        assert.ok(engine.playerBackfireFlames.length >= 2, `${carName} must have backfire flames`);
        engine.playerBackfireFlames.forEach(bf => {
            assert.ok(
                bf.position.z < 0,
                `${carName} backfire flame must be positioned at rear (-Z), got ${bf.position.z}`
            );
        });

        engine.destroy();
    }
});

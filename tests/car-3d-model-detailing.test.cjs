const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

function setupTestContext() {
    global.window = global;
    global.self = global;
    global.document = {
        createElement: (tag) => ({
            getContext: () => ({
                fillRect: () => {},
                clearRect: () => {},
                fillText: () => {},
                drawImage: () => {},
                measureText: () => ({ width: 100 }),
                createRadialGradient: () => ({ addColorStop: () => {} })
            }),
            width: 512,
            height: 512,
            style: {}
        }),
        createElementNS: () => ({ style: {} }),
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    global.navigator = { userAgent: 'NodeTest' };
    global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
    global.cancelAnimationFrame = (id) => clearTimeout(id);

    // Load Three.js
    const THREE = require('../js/vendor/three.min.js');
    THREE.WebGLRenderer = class MockRenderer {
        constructor() {
            this.domElement = global.document.createElement('canvas');
        }
        setPixelRatio() {}
        setSize() {}
        render() {}
    };
    global.THREE = THREE;

    // Load Car3DManager
    delete require.cache[require.resolve('../js/car-3d.js')];
    const Car3DManager = require('../js/car-3d.js');

    return { THREE, Car3DManager };
}

test('createCarMaterials creates realistic MeshPhysicalMaterial with automotive clearcoat and submaterials', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mats = Car3DManager.createCarMaterials(THREE, { color: '#00ff00', wheels: 'alloy' });

    assert.ok(mats.paint, 'paint material must exist');
    assert.strictEqual(mats.paint.clearcoat, 1.0, 'paint clearcoat must be 1.0 for glossy automotive finish');
    assert.strictEqual(mats.paint.clearcoatRoughness, 0.05, 'paint clearcoatRoughness must be 0.05');
    assert.ok(mats.tireRubber, 'tireRubber material must exist');
    assert.strictEqual(mats.tireRubber.roughness, 0.90, 'tireRubber must have high matte roughness');
    assert.ok(mats.brakeCaliper, 'brakeCaliper material must exist');
    assert.ok(mats.brakeDisc, 'brakeDisc material must exist');
    assert.ok(mats.alloyRim, 'alloyRim material must exist');
    assert.strictEqual(mats.alloyRim.metalness, 0.86, 'alloyRim must have high metallic sheen');
    assert.ok(mats.exhaustChrome, 'exhaustChrome material must exist');
    assert.ok(mats.grilleMesh, 'grilleMesh material must exist');
});

test('Subaru WRX STI GLB model detailing separates tires, rims, brakes, glass, lights, and body', () => {
    const { THREE, Car3DManager } = setupTestContext();

    // Mock Subaru hierarchy mimicking assets/models/subaru_wrx.glb
    const root = new THREE.Group();
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'material_26' }));
    bodyMesh.name = 'Object_2';
    root.add(bodyMesh);

    const tireMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'material_21' }));
    tireMesh.name = 'Object_24';
    root.add(tireMesh);

    const rimMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'material_12' }));
    rimMesh.name = 'Object_15';
    root.add(rimMesh);

    const caliperMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'material_1' }));
    caliperMesh.name = 'Object_4';
    root.add(caliperMesh);

    const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'material_9' }));
    glassMesh.name = 'Object_12';
    root.add(glassMesh);

    const taillightMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'material_17' }));
    taillightMesh.name = 'Object_20';
    root.add(taillightMesh);

    const exhaustMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'material_22' }));
    exhaustMesh.name = 'Object_25';
    root.add(exhaustMesh);

    const stockWing = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'material_5' }));
    stockWing.name = 'Object_8';
    root.add(stockWing);

    // Apply bright green paint
    Car3DManager.applyStylingToGLTF(THREE, root, { color: '#00ff00', spoiler: 'none' }, 'subaru');

    // Body mesh should receive painted material
    assert.ok(bodyMesh.material.name.startsWith('StyledPaint_'), 'Body mesh Object_2 should receive StyledPaint');
    assert.strictEqual(bodyMesh.material.color.getHexString(), '00ff00', 'Body paint color should match');

    // Tires MUST NOT receive body paint
    assert.strictEqual(tireMesh.material.name, 'TireRubber', 'Object_24 must receive TireRubber, not green paint');

    // Rims MUST NOT receive body paint
    assert.strictEqual(rimMesh.material.name, 'AlloyRim', 'Object_15 must receive AlloyRim, not green paint');

    // Calipers MUST NOT receive body paint
    assert.strictEqual(caliperMesh.material.name, 'BrakeCaliper_Red', 'Object_4 must receive BrakeCaliper_Red');

    // Glass MUST NOT receive body paint
    assert.strictEqual(glassMesh.material.name, 'CarGlass', 'Object_12 must receive CarGlass');

    // Taillights MUST NOT receive body paint
    assert.strictEqual(taillightMesh.material.name, 'TaillightRed', 'Object_20 must receive TaillightRed');

    // Exhaust MUST NOT receive body paint
    assert.strictEqual(exhaustMesh.material.name, 'ExhaustChrome', 'Object_25 must receive ExhaustChrome');

    // Stock STI wing should remain visible when spoiler is 'none'
    assert.strictEqual(stockWing.visible, true, 'Stock STI wing Object_8 should be visible when spoiler is none');
});

test('Subaru WRX STI hides stock wing when custom aftermarket spoiler is installed', () => {
    const { THREE, Car3DManager } = setupTestContext();

    const root = new THREE.Group();
    const stockWing = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'material_5' }));
    stockWing.name = 'Object_8';
    root.add(stockWing);

    Car3DManager.applyStylingToGLTF(THREE, root, { color: '#00ff00', spoiler: 'gt' }, 'subaru');
    assert.strictEqual(stockWing.visible, false, 'Stock STI wing should be hidden when aftermarket GT spoiler is installed');
});

test('Chiron multi-material body mesh isolates paint_primary while preserving grille, trim, and exhaust', () => {
    const { THREE, Car3DManager } = setupTestContext();

    const root = new THREE.Group();
    const matPrimary = new THREE.MeshBasicMaterial({ name: 'paint_primary' });
    const matGrill = new THREE.MeshBasicMaterial({ name: 'grill' });
    const matExhaust = new THREE.MeshBasicMaterial({ name: 'exhaust' });
    const matGlass = new THREE.MeshBasicMaterial({ name: 'glass_window' });
    const matDiffuser = new THREE.MeshBasicMaterial({ name: 'diffuser' });

    const chironBody = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [
        matPrimary, matGrill, matExhaust, matGlass, matDiffuser
    ]);
    chironBody.name = 'body';
    root.add(chironBody);

    Car3DManager.applyStylingToGLTF(THREE, root, { color: '#3b82f6' }, 'chiron');

    assert.ok(chironBody.material[0].name.startsWith('StyledPaint_'), 'paint_primary should be StyledPaint');
    assert.strictEqual(chironBody.material[1].name, 'GrilleMesh', 'grill should be GrilleMesh');
    assert.strictEqual(chironBody.material[2].name, 'ExhaustChrome', 'exhaust should be ExhaustChrome');
    assert.strictEqual(chironBody.material[3].name, 'CarGlass', 'glass_window should be CarGlass');
    assert.strictEqual(chironBody.material[4].name, 'BlackTrim', 'diffuser should be BlackTrim');
});

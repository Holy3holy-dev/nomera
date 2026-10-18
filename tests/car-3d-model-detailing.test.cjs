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

test('VAZ-2109 Девятка GLB detailing isolates body paint from tires, rims, bumpers, glass, lights, and interior', () => {
    const { THREE, Car3DManager } = setupTestContext();

    const root = new THREE.Group();

    // Body (Mesh 0)
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: '2109' }));
    bodyMesh.name = ' 2109_2109_0';
    root.add(bodyMesh);

    // Glass (Mesh 1)
    const glassMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'Fenster' }));
    glassMesh.name = ' 2109_Fenster_0';
    root.add(glassMesh);

    // Tires (Mesh 11, 12)
    const tireMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'Standardmater50' }));
    tireMesh.name = ' 2109_Standardmater50_0';
    root.add(tireMesh);

    // Rims (Mesh 7, 8, 10)
    const rimMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'Standardmater46' }));
    rimMesh.name = ' 2109_Standardmater46_0';
    root.add(rimMesh);

    // Brake discs (Mesh 9)
    const brakeMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'Standardmater48' }));
    brakeMesh.name = ' 2109_Standardmater48_0';
    root.add(brakeMesh);

    // Headlight lens (Mesh 13)
    const headLensMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'Standardmater7' }));
    headLensMesh.name = ' 2109_Standardmater7_0';
    root.add(headLensMesh);

    // Headlight reflector (Mesh 28)
    const headReflMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'Standardmater3' }));
    headReflMesh.name = ' 2109_Standardmater3_0';
    root.add(headReflMesh);

    // Taillight red lens (Mesh 30)
    const tailLensMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'Standardmater5' }));
    tailLensMesh.name = ' 2109_Standardmater5_0';
    root.add(tailLensMesh);

    // Front Bumper (Mesh 24)
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'Standardmater24' }));
    frontBumper.name = ' 2109_Standardmater24_0';
    root.add(frontBumper);

    // Rear Bumper (Mesh 25)
    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'Standardmater27' }));
    rearBumper.name = ' 2109_Standardmater27_0';
    root.add(rearBumper);

    // Interior cabin / door card (Mesh 2)
    const interiorMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'Standardmater32' }));
    interiorMesh.name = ' 2109_Standardmater32_0';
    root.add(interiorMesh);

    // Exhaust pipe (Mesh 29)
    const exhaustMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ name: 'Standardmater4' }));
    exhaustMesh.name = ' 2109_Standardmater4_0';
    root.add(exhaustMesh);

    // Apply cyan paint
    Car3DManager.applyStylingToGLTF(THREE, root, { color: '#00e5ff' }, 'vaz2109');

    // 1. Body MUST be painted cyan
    assert.ok(bodyMesh.material.name.startsWith('StyledPaint_'), 'Body mesh must receive StyledPaint');
    assert.strictEqual(bodyMesh.material.color.getHexString(), '00e5ff', 'Body paint color should match cyan');

    // 2. Glass MUST be CarGlass, NOT cyan paint
    assert.strictEqual(glassMesh.material.name, 'CarGlass', 'Window glass must be CarGlass, not body paint');

    // 3. Tires MUST be TireRubber, NOT cyan paint
    assert.strictEqual(tireMesh.material.name, 'TireRubber', 'Tires must be TireRubber, not body paint');

    // 4. Rims MUST be AlloyRim (or stamps), NOT cyan paint
    assert.strictEqual(rimMesh.material.name, 'AlloyRim', 'Rims must be AlloyRim, not body paint');

    // 5. Brakes MUST be BrakeDisc, NOT cyan paint
    assert.strictEqual(brakeMesh.material.name, 'BrakeDisc_Steel', 'Brake disc must be BrakeDisc_Steel, not body paint');

    // 6. Lights: Headlight lens, reflector, taillight
    assert.strictEqual(headLensMesh.material.name, 'HeadlightGlass', 'Headlight lens must be HeadlightGlass');
    assert.strictEqual(headReflMesh.material.name, 'Chrome', 'Headlight reflector bowl must be Chrome');
    assert.strictEqual(tailLensMesh.material.name, 'TaillightRed', 'Taillight lens must be TaillightRed');

    // 7. Bumpers MUST be BlackTrim, NOT cyan paint
    assert.strictEqual(frontBumper.material.name, 'BlackTrim', 'Front bumper must be BlackTrim');
    assert.strictEqual(rearBumper.material.name, 'BlackTrim', 'Rear bumper must be BlackTrim');

    // 8. Interior MUST be Interior, NOT cyan paint
    assert.strictEqual(interiorMesh.material.name, 'Interior', 'Interior must be Interior, not body paint');

    // 9. Exhaust MUST be ExhaustChrome, NOT cyan paint
    assert.strictEqual(exhaustMesh.material.name, 'ExhaustChrome', 'Exhaust must be ExhaustChrome, not body paint');

    // 10. No artificial protruding ChassisUndertray should exist
    let undertrayFound = false;
    root.traverse(child => {
        if (child.material && child.material.name === 'ChassisUndertray') undertrayFound = true;
    });
    assert.strictEqual(undertrayFound, false, 'No artificial ChassisUndertray should protrude under the car');
});

test('BMW M5 E60 (bmw.glb) KHR_mesh_quantization Int16Array attributes denormalize to Float32Array and keep wheels, grille, lights, and emblems visible at full scale', async () => {
    const { THREE, Car3DManager } = setupTestContext();

    // Build a quantized scene with normalized Int16Array positions (-32767..32767) and a parent quantization scale (like KHR_mesh_quantization)
    const gltfScene = new THREE.Group();
    const quantNode = new THREE.Group();
    quantNode.scale.set(2.2, 0.7, 2.2);
    gltfScene.add(quantNode);

    function makeQuantizedMesh(name, matName, minX, maxX, minY, maxY, minZ, maxZ) {
        const geom = new THREE.BufferGeometry();
        const raw = new Int16Array([
            Math.round(minX * 32767), Math.round(minY * 32767), Math.round(minZ * 32767),
            Math.round(maxX * 32767), Math.round(minY * 32767), Math.round(minZ * 32767),
            Math.round(maxX * 32767), Math.round(maxY * 32767), Math.round(maxZ * 32767),
            Math.round(minX * 32767), Math.round(maxY * 32767), Math.round(maxZ * 32767)
        ]);
        geom.setAttribute('position', new THREE.BufferAttribute(raw, 3, true));
        geom.setIndex([0, 1, 2, 0, 2, 3]);
        const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ name: matName }));
        mesh.name = name;
        return mesh;
    }

    const bodyMesh = makeQuantizedMesh('Object_4', 'paint', -0.45, 0.45, -0.4, 0.5, -0.95, 0.95);
    const grilleTrimMesh = makeQuantizedMesh('Object_5', 'PaletteMaterial001', -0.42, 0.42, -0.35, 0.35, -0.92, 0.92);
    const glassMesh = makeQuantizedMesh('Object_7', 'glass', -0.40, 0.40, 0.1, 0.48, -0.5, 0.45);
    const tailMesh = makeQuantizedMesh('Object_10', 'BMW_E30_M3_TAILLIGHT_REFLECTOR', -0.40, 0.40, 0.0, 0.15, -0.95, -0.88);
    const emblemMesh = makeQuantizedMesh('Object_12', 'BMW_E30_M3_EMBLEMS', -0.05, 0.05, 0.15, 0.20, 0.85, 0.92);
    const headLensMesh = makeQuantizedMesh('Object_13', 'BMW_E30_M3_LENS', -0.38, 0.38, 0.0, 0.12, 0.88, 0.95);
    const rimMesh = makeQuantizedMesh('Object_15', 'BMW_E30_M3_RIM', -0.44, -0.35, -0.45, -0.10, 0.55, 0.82);
    const tireMesh = makeQuantizedMesh('Object_17', 'BMW_E30_M3_TIRE', -0.45, -0.34, -0.48, -0.08, 0.52, 0.85);
    const discMesh = makeQuantizedMesh('Object_19', 'Brake_Disc', -0.42, -0.38, -0.40, -0.15, 0.60, 0.78);
    const caliperMesh = makeQuantizedMesh('Object_21', 'Brembo_Calipers', -0.42, -0.38, -0.35, -0.20, 0.62, 0.72);

    quantNode.add(bodyMesh, grilleTrimMesh, glassMesh, tailMesh, emblemMesh, headLensMesh, rimMesh, tireMesh, discMesh, caliperMesh);

    THREE.GLTFLoader = function () {};
    THREE.GLTFLoader.prototype.load = function (_url, onLoad) {
        onLoad({ scene: gltfScene });
    };

    const loadedModel = await new Promise(resolve => {
        Car3DManager.loadCarModel(THREE, 'BMW M5 E60', { color: '#ffffff', tint: 'none', wheels: 'stock' }, resolve);
    });

    assert.ok(loadedModel, 'BMW M5 E60 model should load');
    loadedModel.updateMatrixWorld(true);

    const meshByName = {};
    loadedModel.traverse(c => {
        if (c.isMesh && c.name) meshByName[c.name] = c;
    });

    // Verify all quantized meshes were converted from normalized Int16Array to non-normalized Float32Array
    for (const name of ['Object_4', 'Object_5', 'Object_10', 'Object_12', 'Object_13', 'Object_15', 'Object_17', 'Object_19', 'Object_21']) {
        const m = meshByName[name];
        assert.ok(m, `Mesh ${name} must exist in loaded model`);
        assert.strictEqual(m.visible, true, `Mesh ${name} must remain visible`);
        const pos = m.geometry.attributes.position;
        assert.strictEqual(pos.normalized, false, `Mesh ${name} position attribute must be denormalized (normalized: false)`);
        assert.ok(pos.array instanceof Float32Array, `Mesh ${name} position attribute array must be Float32Array`);

        const ws = new THREE.Vector3();
        m.getWorldScale(ws);
        assert.ok(ws.length() > 0.5, `Mesh ${name} worldScale (${ws.length()}) must not shrink by 32767x`);
    }

    // Verify material classifications on BMW M5 E60
    assert.strictEqual(meshByName['Object_5'].material.name, 'BlackTrim', 'PaletteMaterial001 (grille/trim/interior) must be BlackTrim');
    assert.strictEqual(meshByName['Object_10'].material.name, 'TaillightRed', 'Taillight reflector must be TaillightRed');
    assert.strictEqual(meshByName['Object_13'].material.name, 'HeadlightGlass', 'Headlight lens must be HeadlightGlass');
    assert.strictEqual(meshByName['Object_15'].material.name, 'AlloyRim', 'Wheel rim must be AlloyRim');
    assert.strictEqual(meshByName['Object_17'].material.name, 'TireRubber', 'Tire must be TireRubber');
    assert.strictEqual(meshByName['Object_19'].material.name, 'BrakeDisc_Steel', 'Brake disc must be BrakeDisc_Steel');
    assert.strictEqual(meshByName['Object_21'].material.name, 'BrakeCaliper_Red', 'Brembo caliper must be BrakeCaliper_Red');
});



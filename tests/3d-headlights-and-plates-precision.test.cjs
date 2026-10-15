const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function setupTestContext() {
    const domElementMock = {
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
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        appendChild: () => {},
        innerHTML: ''
    };

    global.window = global;
    global.self = global;
    global.addEventListener = () => {};
    global.removeEventListener = () => {};
    global.window.addEventListener = () => {};
    global.window.removeEventListener = () => {};

    global.document = {
        createElement: () => domElementMock,
        createElementNS: () => ({ style: {} }),
        getElementById: () => domElementMock,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    global.Image = function() { return domElementMock; };
    global.navigator = { userAgent: 'NodeTest' };
    global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
    global.cancelAnimationFrame = (id) => clearTimeout(id);

    const THREE = require('../js/vendor/three.min.js');
    THREE.WebGLRenderer = class MockRenderer {
        constructor() {
            this.domElement = domElementMock;
        }
        setPixelRatio() {}
        setSize() {}
        render() {}
        compile() {}
        getRenderTarget() { return null; }
        setRenderTarget() {}
        getClearColor() { return new THREE.Color(0x000000); }
        dispose() {}
    };
    global.THREE = THREE;

    delete require.cache[require.resolve('../js/car-3d.js')];
    const Car3DManager = require('../js/car-3d.js');

    return { THREE, Car3DManager };
}

test('detectVehicleLightPositions calculates physically calibrated headlight and taillight coordinates', () => {
    const { THREE, Car3DManager } = setupTestContext();

    assert.strictEqual(typeof Car3DManager.detectVehicleLightPositions, 'function');

    // 1. Procedural car test
    const car = Car3DManager.buildDetailedCarModel(THREE, 'Lada Priora', { color: '#ffffff' });
    const lightPos = Car3DManager.detectVehicleLightPositions(car, 'priora', THREE);

    assert.ok(lightPos.hlL, 'Left headlight position must exist');
    assert.ok(lightPos.hlR, 'Right headlight position must exist');
    assert.ok(lightPos.tlL, 'Left taillight position must exist');
    assert.ok(lightPos.tlR, 'Right taillight position must exist');

    // Headlights must be separated horizontally across centerline
    assert.ok(lightPos.hlL.x < -0.2, 'Left headlight must be on driver side (negative X)');
    assert.ok(lightPos.hlR.x > 0.2, 'Right headlight must be on passenger side (positive X)');

    // Headlights must be in front half (positive Z), taillights in rear half (negative Z)
    assert.ok(lightPos.hlL.z > 1.2, 'Headlights must be forward in positive Z');
    assert.ok(lightPos.tlL.z < -1.2, 'Taillights must be rearward in negative Z');

    // Height must be realistic (not scraping ground, not hovering above hood)
    assert.ok(lightPos.hlL.y >= 0.35 && lightPos.hlL.y <= 1.2, 'Headlight height must be realistic (0.35m - 1.2m)');
    assert.ok(lightPos.tlL.y >= 0.35 && lightPos.tlL.y <= 1.2, 'Taillight height must be realistic (0.35m - 1.2m)');
});

test('applyLicensePlateToModel places front and rear plates flush on bumper surface without floating air gap', () => {
    const { THREE, Car3DManager } = setupTestContext();

    // 1. Test procedural car
    const proceduralCar = Car3DManager.buildDetailedCarModel(THREE, 'ВАЗ-2107 «Жигули»', {
        plate: 'А 777 АА | 77 RUS'
    });
    const pBox = new THREE.Box3().setFromObject(proceduralCar);
    const pFP = proceduralCar.getObjectByName('FrontLicensePlate');
    const pRP = proceduralCar.getObjectByName('RearLicensePlate');

    assert.ok(pFP, 'FrontLicensePlate must exist on procedural car');
    assert.ok(pRP, 'RearLicensePlate must exist on procedural car');
    assert.strictEqual(pFP.visible, true);
    assert.strictEqual(pRP.visible, true);

    const pFPBox = new THREE.Box3().setFromObject(pFP);
    const pRPBox = new THREE.Box3().setFromObject(pRP);

    // Front plate must not float ahead of front bumper
    const frontFloatGap = pFPBox.max.z - pBox.max.z;
    assert.ok(Math.abs(frontFloatGap) < 0.05, `Front plate must be flush with bumper (gap: ${frontFloatGap.toFixed(3)}m)`);

    // Rear plate must be securely placed on the rear
    assert.ok(pRPBox.min.z < 0, 'Rear plate must be located at rear of vehicle');

    // 2. Test GLTF mock car root
    const mockRoot = new THREE.Group();
    mockRoot.userData.carId = 'vesta';
    const bodyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.78, 1.45, 4.42),
        new THREE.MeshStandardMaterial()
    );
    mockRoot.add(bodyMesh);

    Car3DManager.applyLicensePlateToModel(THREE, mockRoot, 'Х 777 ХХ | 777 RUS');

    const glbFP = mockRoot.getObjectByName('GLB_FrontLicensePlate');
    const glbRP = mockRoot.getObjectByName('GLB_RearLicensePlate');

    assert.ok(glbFP, 'GLB_FrontLicensePlate must be created');
    assert.ok(glbRP, 'GLB_RearLicensePlate must be created');
    assert.strictEqual(glbFP.visible, true);
    assert.strictEqual(glbRP.visible, true);

    const rootBox = new THREE.Box3().setFromObject(mockRoot);
    const glbFPBox = new THREE.Box3().setFromObject(glbFP);
    const glbRPBox = new THREE.Box3().setFromObject(glbRP);

    // Front plate must sit flush on front face (within 2cm clearance)
    const glbFrontGap = Math.abs(glbFPBox.max.z - rootBox.max.z);
    assert.ok(glbFrontGap <= 0.025, `GLB front plate must sit flush on front surface (gap: ${glbFrontGap.toFixed(3)}m)`);

    // Rear plate must sit flush on rear face (within 2cm clearance)
    const glbRearGap = Math.abs(rootBox.min.z - glbRPBox.min.z);
    assert.ok(glbRearGap <= 0.025, `GLB rear plate must sit flush on rear surface (gap: ${glbRearGap.toFixed(3)}m)`);

    // Height must be realistic (not scraping ground, not high on hood)
    assert.ok(glbFP.position.y >= -0.30 && glbFP.position.y <= 0.30, 'Plate Y must be positioned on bumper');

    // 3. Test hiding plates with 'none'
    Car3DManager.applyLicensePlateToModel(THREE, mockRoot, 'none');
    assert.strictEqual(glbFP.visible, false, 'Front plate must hide when none');
    assert.strictEqual(glbRP.visible, false, 'Rear plate must hide when none');
});

test('Car3DShowroom headlight flares and spotlights align flush with vehicle lenses without hanging in air', () => {
    const { THREE, Car3DManager } = setupTestContext();

    const showroom = new Car3DManager.Car3DShowroom('showroom-container', { autoRotate: false });
    showroom.setCar('Toyota Camry 3.5', { color: '#111111' });

    // Turn headlights ON
    showroom.toggleHeadlights();
    assert.strictEqual(showroom.headlightsOn, true);

    const car = showroom.proceduralCar || showroom.carGroup;
    const box = new THREE.Box3().setFromObject(car);

    // Verify spotlights originate at headlight height and Z (not floating 50cm in front)
    assert.ok(showroom.headlightSpotL, 'Left spotlight must exist');
    assert.ok(showroom.headlightSpotR, 'Right spotlight must exist');
    assert.ok(showroom.headlightSpotL.intensity > 0, 'Spotlight intensity must be > 0 when on');

    const spotZ = showroom.headlightSpotL.position.z;
    assert.ok(spotZ <= box.max.z + 0.05, `Spotlight origin must not float ahead of car (spotZ: ${spotZ.toFixed(2)}, boxMaxZ: ${box.max.z.toFixed(2)})`);
    assert.ok(spotZ >= box.max.z - 0.50, 'Spotlight origin must be positioned on front fascia');

    // Verify optical lens flare discs are flush on the headlight lens
    assert.ok(showroom.headlightFlares, 'Headlight flares must exist');
    assert.strictEqual(showroom.headlightFlares.visible, true);
    assert.ok(showroom.flareMeshL, 'Left flare mesh must exist');

    const flareZ = showroom.flareMeshL.position.z;
    assert.ok(flareZ <= box.max.z + 0.03, `Flare mesh must not float in front of car (flareZ: ${flareZ.toFixed(2)}, boxMaxZ: ${box.max.z.toFixed(2)})`);

    // Verify taillight flares and rear point lights
    assert.ok(showroom.taillightFlares, 'Taillight flares must exist');
    assert.strictEqual(showroom.taillightFlares.visible, true);
    assert.ok(showroom.taillightFlareL, 'Left taillight flare mesh must exist');

    const tailFlareZ = showroom.taillightFlareL.position.z;
    assert.ok(tailFlareZ >= box.min.z - 0.03, `Taillight flare must not float behind car (tailFlareZ: ${tailFlareZ.toFixed(2)}, boxMinZ: ${box.min.z.toFixed(2)})`);

    // Turn headlights OFF: flares must hide and spotlights intensity must drop to 0
    showroom.toggleHeadlights();
    assert.strictEqual(showroom.headlightsOn, false);
    assert.strictEqual(showroom.headlightFlares.visible, false);
    assert.strictEqual(showroom.taillightFlares.visible, false);
    assert.strictEqual(showroom.headlightSpotL.intensity, 0);

    showroom.stop();
});

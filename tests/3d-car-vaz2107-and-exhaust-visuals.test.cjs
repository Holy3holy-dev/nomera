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
                createRadialGradient: () => ({ addColorStop: () => {} })
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
        removeEventListener: () => {},
        head: { appendChild: () => {} }
    };
    global.Image = function() { return makeMockElement(); };
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

test('VAZ-2107 procedural fallback model faces forward (+Z down road, -Z to camera)', () => {
    const { THREE, Car3DManager } = setupTestContext();

    const car = Car3DManager.buildDetailedCarModel(THREE, 'ВАЗ-2107 «Жигули»', {
        plate: 'А 777 АА | 77 RUS'
    });
    car.updateMatrixWorld(true);

    const lightPos = Car3DManager.detectVehicleLightPositions(car, 'vaz2107', THREE);

    // Headlights must be forward in +Z
    assert.ok(lightPos.hlL.z > 1.2, `VAZ-2107 headlights must be at +Z, got ${lightPos.hlL.z}`);
    // Taillights must be rearward in -Z
    assert.ok(lightPos.tlL.z < -1.2, `VAZ-2107 taillights must be at -Z, got ${lightPos.tlL.z}`);

    // License plates orientation
    const fp = car.getObjectByName('FrontLicensePlate');
    const rp = car.getObjectByName('RearLicensePlate');
    assert.ok(fp && rp, 'Both front and rear license plates must exist');
    assert.ok(fp.position.z > 0, `Front plate must be at +Z, got ${fp.position.z}`);
    assert.ok(rp.position.z < 0, `Rear plate must be at -Z, got ${rp.position.z}`);
    assert.ok(fp.position.z > rp.position.z, 'Front plate Z must be greater than rear plate Z');
});

test('VAZ-2107 GLTF loader setup does not flip vaz2107 by Math.PI and preserves +Z forward orientation', () => {
    const car3dCode = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');

    // Ensure vaz2107 is excluded from the Math.PI rotation around line 5429
    assert.ok(
        !car3dCode.includes("carId === 'vaz2107' || carId === 'vaz2109' || carId === 'sf90'"),
        "vaz2107 must NOT be in the Math.PI rotation check that turns it backward towards camera"
    );
    assert.ok(
        car3dCode.includes("if (carId === 'vaz2109' || carId === 'sf90')"),
        "Only vaz2109 and sf90 should have Math.PI rotation applied"
    );
});

test('Nitro exhaust flames are streamlined, realistic, and use additive blending without giant opaque cones', () => {
    const { THREE, Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});
    engine.start({
        carName: 'ВАЗ-2107 «Жигули»',
        performance: { speed: 200, accel: 3.5 }
    });

    // Verify nitro flame objects exist
    assert.ok(engine.playerNitroFlames.length >= 2, 'Must have at least 2 nitro flame meshes (dual jets/cores)');

    // Verify flame dimensions are streamlined (not giant 0.95m cones with 0.14+ radius)
    engine.playerNitroFlames.forEach((flame, idx) => {
        assert.ok(flame.geometry instanceof THREE.ConeGeometry, 'Flame must be ConeGeometry');
        const radius = flame.geometry.parameters.radius;
        const height = flame.geometry.parameters.height;
        assert.ok(radius <= 0.06, `Flame radius must be slender (<= 0.06m), got ${radius}`);
        assert.ok(height <= 0.45, `Flame length must be compact and realistic (<= 0.45m), got ${height}`);

        // Material must use AdditiveBlending and depthWrite: false for glowing flame visuals
        const mat = flame.material;
        assert.equal(mat.blending, THREE.AdditiveBlending, 'Flame material must use AdditiveBlending for glowing plasma jet');
        assert.equal(mat.depthWrite, false, 'Flame material must have depthWrite: false to prevent polygon depth artifacts');
        assert.equal(mat.transparent, true, 'Flame material must be transparent');
    });

    // Backfire flames must also be compact with additive blending
    assert.ok(engine.playerBackfireFlames.length >= 2, 'Must have backfire flame meshes');
    engine.playerBackfireFlames.forEach(bf => {
        const radius = bf.geometry.parameters.radius;
        const height = bf.geometry.parameters.height;
        assert.ok(radius <= 0.06, `Backfire radius must be slender (<= 0.06m), got ${radius}`);
        assert.ok(height <= 0.45, `Backfire length must be compact (<= 0.45m), got ${height}`);
        assert.equal(bf.material.blending, THREE.AdditiveBlending, 'Backfire must use AdditiveBlending');
        assert.equal(bf.material.depthWrite, false, 'Backfire must have depthWrite: false');
    });

    // Test nitro activation dynamics
    engine.keys.nitro = true;
    engine.update(0.05);
    assert.ok(engine.state.isNitroActive, 'Nitro must activate');
    assert.ok(engine.playerNitroFlames.every(f => f.visible), 'Flames must be visible during nitro');
    // Check that scale is realistic and dynamic
    const flameSample = engine.playerNitroFlames[0];
    assert.ok(flameSample.scale.x < 1.5, `Flame scale width must be slender, got ${flameSample.scale.x}`);

    // Deactivation
    engine.keys.nitro = false;
    engine.update(0.05);
    assert.ok(engine.playerNitroFlames.every(f => !f.visible), 'Flames must turn off immediately when nitro is released');

    engine.destroy();
});

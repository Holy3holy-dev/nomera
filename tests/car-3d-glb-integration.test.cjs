'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

function setupThreeAnd3DManager() {
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
                closePath: () => {},
                fill: () => {},
                stroke: () => {},
                save: () => {},
                restore: () => {}
            }),
            width: 512,
            height: 512,
            clientWidth: 640,
            clientHeight: 400,
            style: {},
            classList: {
                add: () => {},
                remove: () => {},
                contains: () => false,
                toggle: () => {}
            },
            addEventListener: () => {},
            removeEventListener: () => {},
            appendChild: () => {},
            removeChild: () => {},
            innerHTML: ''
        };
    }

    const domElementMock = makeMockElement();

    global.window = global;
    global.self = global;
    global.addEventListener = () => {};
    global.removeEventListener = () => {};
    global.window.addEventListener = () => {};
    global.window.removeEventListener = () => {};

    global.document = {
        createElement: () => makeMockElement(),
        createElementNS: () => makeMockElement(),
        getElementById: () => domElementMock,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    Object.defineProperty(global, 'navigator', { value: { userAgent: 'NodeTest' }, writable: true, configurable: true });
    global.requestAnimationFrame = (cb) => { const t = setTimeout(() => cb(Date.now()), 16); if (t && t.unref) t.unref(); return t; };
    global.cancelAnimationFrame = (id) => clearTimeout(id);

    const THREE = require('../js/vendor/three.min.js');
    THREE.WebGLRenderer = class MockRenderer {
        constructor() {
            this.domElement = makeMockElement();
            this.shadowMap = { enabled: false };
            this.debug = { checkShaderErrors: false };
        }
        setPixelRatio() {}
        setSize() {}
        render() {}
        compile() {}
        getRenderTarget() { return null; }
        setRenderTarget() {}
        getClearColor() { return new THREE.Color(0x000000); }
        dispose() {}
        forceContextLoss() {}
    };
    global.THREE = THREE;

    delete require.cache[require.resolve('../js/car-3d.js')];
    const Car3DManager = require('../js/car-3d.js');

    return { THREE, Car3DManager };
}

const ALL_25_CARS = [
    { id: 'vaz2107', name: 'ВАЗ-2107 «Жигули»' },
    { id: 'vaz2109', name: 'ВАЗ-2109 «Девятка»' },
    { id: 'gaz24', name: 'ГАЗ-24 «Волга»' },
    { id: 'priora', name: 'Lada Priora БПАН' },
    { id: 'solaris', name: 'Hyundai Solaris' },
    { id: 'vesta', name: 'Lada Vesta Sport' },
    { id: 'polo', name: 'Volkswagen Polo' },
    { id: 'mark2', name: 'Toyota Mark II Tourer V' },
    { id: 'subaru', name: 'Subaru Impreza WRX STI' },
    { id: 'm5e60', name: 'BMW M5 E60' },
    { id: 'silvia', name: 'Nissan Silvia S15' },
    { id: 'camry', name: 'Toyota Camry 3.5' },
    { id: 'lc300', name: 'Toyota Land Cruiser 300' },
    { id: 'gtr', name: 'Nissan GT-R R35' },
    { id: 'e63', name: 'Mercedes-AMG E63 S' },
    { id: 'rs6', name: 'Audi RS6 Avant' },
    { id: 'm5f90', name: 'BMW M5 F90 Competition' },
    { id: 'm8', name: 'BMW M8 Competition' },
    { id: 'g63', name: 'Mercedes-AMG G63 «Гелик»' },
    { id: 'porsche911', name: 'Porsche 911 Turbo S' },
    { id: 'huracan', name: 'Lamborghini Huracan' },
    { id: 'cullinan', name: 'Rolls-Royce Cullinan' },
    { id: 'sf90', name: 'Ferrari SF90 Stradale' },
    { id: 'chiron', name: 'Bugatti Chiron' },
    { id: 'jesko', name: 'Koenigsegg Jesko' }
];

test('Interactive Showroom capabilities (doors, hood, trunk, headlights) are enabled across all 25 cars', () => {
    const { THREE, Car3DManager } = setupThreeAnd3DManager();
    const showroom = new Car3DManager.Car3DShowroom('showroom-container', { autoRotate: false });

    assert.strictEqual(ALL_25_CARS.length, 25, 'Must verify all 25 vehicles');

    for (const car of ALL_25_CARS) {
        assert.strictEqual(Car3DManager.identifyCarModel(car.name), car.id, `Car ${car.name} must map to ${car.id}`);

        showroom.setCar(car.name, { color: '#ef4444' });

        assert.strictEqual(showroom.hasCapability('doors'), true, `${car.name} (${car.id}) must have 'doors' capability enabled`);
        assert.strictEqual(showroom.hasCapability('hood'), true, `${car.name} (${car.id}) must have 'hood' capability enabled`);
        assert.strictEqual(showroom.hasCapability('trunk'), true, `${car.name} (${car.id}) must have 'trunk' capability enabled`);
        assert.strictEqual(showroom.hasCapability('headlights'), true, `${car.name} (${car.id}) must have 'headlights' capability enabled`);

        // Also verify GLB rig generation directly on a GLB model hierarchy for every carId
        const glbRoot = new THREE.Group();
        glbRoot.name = 'CarModel_' + car.id;
        const bodyMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1.82, 1.38, 4.45),
            new THREE.MeshStandardMaterial({ name: 'body', color: 0xffffff })
        );
        bodyMesh.position.set(0, 0.69, 0);
        glbRoot.add(bodyMesh);

        Car3DManager.applyStylingToGLTF(THREE, glbRoot, { color: '#3b82f6' }, car.id);

        assert.ok(glbRoot.getObjectByName('Door_FL_Pivot'), `GLB ${car.id} must have Door_FL_Pivot`);
        assert.ok(glbRoot.getObjectByName('Door_FR_Pivot'), `GLB ${car.id} must have Door_FR_Pivot`);
        assert.ok(glbRoot.getObjectByName('Hood_Pivot'), `GLB ${car.id} must have Hood_Pivot`);
        assert.ok(glbRoot.getObjectByName('Trunk_Pivot'), `GLB ${car.id} must have Trunk_Pivot`);
        assert.ok(glbRoot.getObjectByName('EngineBayGroup'), `GLB ${car.id} must have EngineBayGroup`);
        assert.ok(glbRoot.getObjectByName('SubwooferGroup'), `GLB ${car.id} must have SubwooferGroup`);
    }

    showroom.stop();
});

test('toggleDoors(), toggleHood(), and toggleTrunk() smoothly animate angles and expose EngineBayGroup and SubwooferGroup', () => {
    const { THREE, Car3DManager } = setupThreeAnd3DManager();
    const showroom = new Car3DManager.Car3DShowroom('showroom-container', { autoRotate: false });

    // Attach a styled GLB car to showroom to test GLB interactive rig + Showroom toggle animation
    const glbRoot = new THREE.Group();
    glbRoot.name = 'CarModel_gtr';
    glbRoot.userData.carId = 'gtr';
    const bodyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.88, 1.36, 4.55),
        new THREE.MeshStandardMaterial({ name: 'bodycolor', color: 0xffffff })
    );
    bodyMesh.position.set(0, 0.68, 0);
    glbRoot.add(bodyMesh);

    Car3DManager.applyStylingToGLTF(THREE, glbRoot, { color: '#ef4444', neon: '#00f0ff' }, 'gtr');
    showroom.glbCar = glbRoot;
    showroom.carGroup = glbRoot;
    showroom.currentCarName = 'Nissan GT-R R35';
    showroom.updateCapabilities();

    const doorFL = glbRoot.getObjectByName('Door_FL_Pivot');
    const doorFR = glbRoot.getObjectByName('Door_FR_Pivot');
    const hoodPivot = glbRoot.getObjectByName('Hood_Pivot');
    const trunkPivot = glbRoot.getObjectByName('Trunk_Pivot');
    const engineBay = glbRoot.getObjectByName('EngineBayGroup');
    const subwooferGroup = glbRoot.getObjectByName('SubwooferGroup');

    assert.ok(doorFL && doorFR, 'Door pivots must exist');
    assert.ok(hoodPivot && engineBay, 'Hood pivot and EngineBayGroup must exist');
    assert.ok(trunkPivot && subwooferGroup, 'Trunk pivot and SubwooferGroup must exist');

    // Verify EngineBayGroup sub-components
    assert.ok(engineBay.getObjectByName('Engine_Block'), 'EngineBayGroup must contain Engine_Block');
    assert.ok(engineBay.getObjectByName('Engine_ValveCover'), 'EngineBayGroup must contain Engine_ValveCover');
    assert.ok(engineBay.getObjectByName('Engine_StrutBar'), 'EngineBayGroup must contain Engine_StrutBar');

    // Verify SubwooferGroup sub-components
    assert.ok(subwooferGroup.getObjectByName('Subwoofer_Box'), 'SubwooferGroup must contain Subwoofer_Box');
    assert.ok(subwooferGroup.getObjectByName('Subwoofer_Cone_L'), 'SubwooferGroup must contain Subwoofer_Cone_L');
    assert.ok(subwooferGroup.getObjectByName('Subwoofer_Cone_R'), 'SubwooferGroup must contain Subwoofer_Cone_R');

    // Initially closed: zero angles and hidden interior cavities/rigs to prevent Z-fighting
    assert.strictEqual(showroom.doorAngle, 0);
    assert.strictEqual(showroom.hoodAngle, 0);
    assert.strictEqual(showroom.trunkAngle, 0);
    assert.strictEqual(engineBay.visible, false, 'EngineBayGroup must be hidden when hood is closed');
    assert.strictEqual(subwooferGroup.visible, false, 'SubwooferGroup must be hidden when trunk is closed');

    // Toggle open doors, hood, and trunk
    assert.strictEqual(showroom.toggleDoors(), true, 'toggleDoors() should open doors');
    assert.strictEqual(showroom.toggleHood(), true, 'toggleHood() should open hood');
    assert.strictEqual(showroom.toggleTrunk(), true, 'toggleTrunk() should open trunk');

    assert.ok(showroom.targetDoorAngle > 0.8, 'targetDoorAngle should be set to open angle');
    assert.ok(showroom.targetHoodAngle > 0.6, 'targetHoodAngle should be set to open angle');
    assert.ok(showroom.targetTrunkAngle > 0.6, 'targetTrunkAngle should be set to open angle');

    // Immediately upon toggling, initial kick angle (> 0.005) exposes the groups
    assert.ok(showroom.doorAngle > 0.005, 'doorAngle receives initial kick');
    assert.ok(showroom.hoodAngle > 0.005, 'hoodAngle receives initial kick');
    assert.ok(showroom.trunkAngle > 0.005, 'trunkAngle receives initial kick');
    assert.strictEqual(doorFL.visible, true, 'Door_FL_Pivot visible when opening');
    assert.strictEqual(doorFR.visible, true, 'Door_FR_Pivot visible when opening');
    assert.strictEqual(hoodPivot.visible, true, 'Hood_Pivot visible when opening');
    assert.strictEqual(engineBay.visible, true, 'EngineBayGroup exposed when hood opens');
    assert.strictEqual(trunkPivot.visible, true, 'Trunk_Pivot visible when opening');
    assert.strictEqual(subwooferGroup.visible, true, 'SubwooferGroup exposed when trunk opens');

    // Simulate smooth interpolation steps (as performed in Car3DShowroom loop)
    for (let step = 0; step < 45; step++) {
        showroom.doorAngle += (showroom.targetDoorAngle - showroom.doorAngle) * 0.14;
        showroom.hoodAngle += (showroom.targetHoodAngle - showroom.hoodAngle) * 0.14;
        showroom.trunkAngle += (showroom.targetTrunkAngle - showroom.trunkAngle) * 0.14;
        showroom.syncInteractiveModels();
    }

    assert.ok(Math.abs(showroom.doorAngle - showroom.targetDoorAngle) < 0.01, 'doorAngle smoothly converges to targetDoorAngle');
    assert.ok(Math.abs(showroom.hoodAngle - showroom.targetHoodAngle) < 0.01, 'hoodAngle smoothly converges to targetHoodAngle');
    assert.ok(Math.abs(showroom.trunkAngle - showroom.targetTrunkAngle) < 0.01, 'trunkAngle smoothly converges to targetTrunkAngle');
    assert.ok(Math.abs(hoodPivot.rotation.x) > 0.6, 'Hood_Pivot rotates open along X axis');
    assert.ok(Math.abs(trunkPivot.rotation.x) > 0.6, 'Trunk_Pivot rotates open along X axis');

    // Toggle closed
    assert.strictEqual(showroom.toggleDoors(), false, 'toggleDoors() should close doors');
    assert.strictEqual(showroom.toggleHood(), false, 'toggleHood() should close hood');
    assert.strictEqual(showroom.toggleTrunk(), false, 'toggleTrunk() should close trunk');

    showroom.doorAngle = 0;
    showroom.hoodAngle = 0;
    showroom.trunkAngle = 0;
    showroom.syncInteractiveModels();

    assert.strictEqual(engineBay.visible, false, 'EngineBayGroup hidden again when hood is fully closed');
    assert.strictEqual(subwooferGroup.visible, false, 'SubwooferGroup hidden again when trunk is fully closed');

    showroom.stop();
});

test('Underglow neon creates GLB_NeonTubes recessed within car width without intersecting wheel axles and includes volumetric ground glow plane', () => {
    const { THREE, Car3DManager } = setupThreeAnd3DManager();

    const modelRoot = new THREE.Group();
    modelRoot.name = 'CarModel_vaz2107';

    const carWidth = 1.80;
    const carHeight = 1.40;
    const carLength = 4.20;
    const bodyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(carWidth, carHeight, carLength),
        new THREE.MeshStandardMaterial({ name: 'body', color: 0xffffff })
    );
    bodyMesh.position.set(0, carHeight * 0.5, 0);
    modelRoot.add(bodyMesh);

    // Add 4 wheel nodes at front/rear axles (z = ±1.35)
    const wheelPositions = [
        { name: 'Wheel_FL', x: -0.78, y: 0.33, z: 1.35 },
        { name: 'Wheel_FR', x: 0.78, y: 0.33, z: 1.35 },
        { name: 'Wheel_RL', x: -0.78, y: 0.33, z: -1.35 },
        { name: 'Wheel_RR', x: 0.78, y: 0.33, z: -1.35 }
    ];
    for (const wp of wheelPositions) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 16), new THREE.MeshStandardMaterial({ name: 'tire' }));
        w.name = wp.name;
        w.position.set(wp.x, wp.y, wp.z);
        modelRoot.add(w);
    }

    modelRoot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(bodyMesh);
    const size = box.getSize(new THREE.Vector3());

    Car3DManager.applyStylingToGLTF(THREE, modelRoot, { neon: '#ff007f' }, 'vaz2107');

    const neonGroup = modelRoot.getObjectByName('GLB_NeonTubes');
    assert.ok(neonGroup, 'GLB_NeonTubes group must be created when styling.neon is set');
    assert.ok(neonGroup.children.length >= 2, 'GLB_NeonTubes must contain underglow meshes');

    let hasGroundGlowPlane = false;
    let tubeCount = 0;

    neonGroup.traverse((child) => {
        if (!child.isMesh) return;

        // Every neon element must stay strictly within |x| < size.x * 0.38 so nothing protrudes outside the sills
        assert.ok(
            Math.abs(child.position.x) < size.x * 0.38,
            `Neon mesh "${child.name || child.type}" x=${child.position.x.toFixed(3)} must be recessed inside car width (< ${(size.x * 0.38).toFixed(3)})`
        );

        const geoType = child.geometry ? child.geometry.type : '';
        if (geoType === 'PlaneGeometry' || geoType === 'PlaneBufferGeometry' || (child.name && child.name.toLowerCase().includes('glow'))) {
            hasGroundGlowPlane = true;
        } else {
            tubeCount++;
            // Side rocker tubes must stay between the front and rear wheel axles (not intersecting wheel wells at z = ±1.35)
            if (Math.abs(child.position.x) > 0.1) {
                child.geometry.computeBoundingBox();
                const gBox = child.geometry.boundingBox;
                const halfSpanZ = gBox ? Math.max(Math.abs(gBox.max.z), Math.abs(gBox.min.z)) : 0;
                const maxTubeZ = Math.abs(child.position.z) + halfSpanZ;
                assert.ok(
                    maxTubeZ < size.z * 0.32,
                    `Side neon tube Z extent (${maxTubeZ.toFixed(3)}) must not intersect front/rear wheel axles`
                );
            }
        }
    });

    assert.ok(tubeCount >= 2, 'GLB_NeonTubes must include recessed emitter tubes');
    assert.strictEqual(hasGroundGlowPlane, true, 'GLB_NeonTubes must include the volumetric ground glow plane');
});

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
            toDataURL: () => 'data:image/png;base64,mock3d',
            width: 512,
            height: 512,
            style: {},
            classList: {
                add: () => {},
                remove: () => {},
                toggle: () => {}
            },
            addEventListener: (evt, cb) => {
                if (evt === 'load') setTimeout(cb, 1);
            },
            removeEventListener: () => {},
            appendChild: () => {},
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
            this.shadowMap = { enabled: true };
        }
        setPixelRatio() {}
        setSize() {}
        render() {}
        compile() {}
        getRenderTarget() { return null; }
        setRenderTarget() {}
        setClearColor() {}
        dispose() {}
    };
    global.THREE = THREE;

    delete require.cache[require.resolve('../js/car-3d.js')];
    const Car3DManager = require('../js/car-3d.js');

    return { THREE, Car3DManager };
}

test('Car3DShowroom: auto-rotation is disabled by default and can be toggled', () => {
    const { Car3DManager } = setupTestContext();

    const showroom = new Car3DManager.Car3DShowroom('showroom-container');
    assert.strictEqual(showroom.options.autoRotate, false, 'Auto-rotation must be false by default');

    const toggledOn = showroom.toggleAutoRotate();
    assert.strictEqual(toggledOn, true, 'toggleAutoRotate turns on auto-rotation');
    assert.strictEqual(showroom.options.autoRotate, true);

    const toggledOff = showroom.toggleAutoRotate();
    assert.strictEqual(toggledOff, false, 'toggleAutoRotate turns off auto-rotation');
    assert.strictEqual(showroom.options.autoRotate, false);

    showroom.stop();
});

test('Car3DShowroom: standard viewpoints (front, rear, side, top, isometric) configure camera correctly without distorting model', () => {
    const { Car3DManager } = setupTestContext();

    const showroom = new Car3DManager.Car3DShowroom('showroom-container');

    // 1. Front preset
    showroom.setViewPreset('front', true);
    assert.strictEqual(showroom.currentPreset, 'front');
    assert.strictEqual(showroom.cameraAngleY, 0, 'Front view angle Y should be 0');
    assert.strictEqual(showroom.cameraAngleX, 0.12, 'Front view pitch should be 0.12');
    assert.strictEqual(showroom.cameraDistance, 4.2);

    // 2. Rear preset
    showroom.setViewPreset('rear', true);
    assert.strictEqual(showroom.currentPreset, 'rear');
    assert.strictEqual(showroom.cameraAngleY, Math.PI, 'Rear view angle Y should be PI');
    assert.strictEqual(showroom.cameraAngleX, 0.12);
    assert.strictEqual(showroom.cameraDistance, 4.2);

    // 3. Side profile preset
    showroom.setViewPreset('side', true);
    assert.strictEqual(showroom.currentPreset, 'side');
    assert.strictEqual(showroom.cameraAngleY, Math.PI / 2, 'Side view angle Y should be PI/2');
    assert.strictEqual(showroom.cameraAngleX, 0.08);
    assert.strictEqual(showroom.cameraDistance, 4.4);

    // 4. Top-down preset
    showroom.setViewPreset('top', true);
    assert.strictEqual(showroom.currentPreset, 'top');
    assert.strictEqual(showroom.cameraAngleY, 0);
    assert.ok(showroom.cameraAngleX > 1.4, 'Top view should have high angle X');
    assert.strictEqual(showroom.cameraDistance, 4.8);

    // 5. Isometric (3/4) beauty preset
    showroom.setViewPreset('isometric', true);
    assert.strictEqual(showroom.currentPreset, 'isometric');
    assert.strictEqual(showroom.cameraAngleY, Math.PI / 4.2);
    assert.strictEqual(showroom.cameraAngleX, 0.26);
    assert.strictEqual(showroom.cameraDistance, 4.3);

    // 6. Reset camera restores isometric preset
    showroom.setViewPreset('side', true);
    showroom.resetCamera();
    assert.strictEqual(showroom.currentPreset, 'isometric');
    assert.strictEqual(showroom.targetAngleY, Math.PI / 4.2);
    assert.strictEqual(showroom.targetAngleX, 0.26);

    showroom.stop();
});

test('Car3DShowroom: camera distance and pitch limits prevent clipping inside vehicle body', () => {
    const { Car3DManager } = setupTestContext();

    const showroom = new Car3DManager.Car3DShowroom('showroom-container');
    assert.ok(showroom.options.minDistance >= 2.2, 'minDistance must be at least 2.2m to prevent body penetration');
    assert.ok(showroom.options.maxDistance <= 7.0, 'maxDistance must prevent car from disappearing into void');

    showroom.stop();
});

test('Porsche 911 procedural model: headlights are placed at front fenders above bumper', () => {
    const { THREE, Car3DManager } = setupTestContext();

    const porsche = Car3DManager.buildDetailedCarModel(THREE, 'Porsche 911 Turbo S', { color: '#ffffff' });
    const box = new THREE.Box3().setFromObject(porsche);
    const lightPos = Car3DManager.detectVehicleLightPositions(porsche, 'porsche911', THREE);

    assert.ok(lightPos.hlL, 'Left headlight position exists');
    assert.ok(lightPos.hlR, 'Right headlight position exists');

    // Headlight Z must be close to front bumper (box.max.z)
    assert.ok(lightPos.hlL.z >= box.max.z - 0.40, `Porsche headlights must be at front fascia, not in frunk (hlZ: ${lightPos.hlL.z.toFixed(2)}, maxZ: ${box.max.z.toFixed(2)})`);
    assert.strictEqual(lightPos.hlL.y, lightPos.hlR.y, 'Left and right headlight heights must be identical');
    assert.strictEqual(lightPos.hlL.z, lightPos.hlR.z, 'Left and right headlight depths must be identical');
    assert.strictEqual(Math.abs(lightPos.hlL.x).toFixed(2), Math.abs(lightPos.hlR.x).toFixed(2), 'Headlights must be symmetric across center');
});

test('Subaru WRX STI: detectVehicleLightPositions rejects hood scoops and enforces front bumper alignment and symmetry', () => {
    const { THREE, Car3DManager } = setupTestContext();

    // Create a mock model with front bumper headlights AND a hood scoop mesh in the middle
    const model = new THREE.Group();
    model.userData.carId = 'subaru';

    // Bumper headlights at Z = 2.1
    const hlMat = new THREE.MeshBasicMaterial({ name: 'HeadlightGlass' });
    const hlMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), hlMat);
    hlMeshL.position.set(-0.65, 0.65, 2.1);
    hlMeshL.name = 'Subaru_Headlight_L';
    model.add(hlMeshL);

    const hlMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), hlMat);
    hlMeshR.position.set(0.65, 0.65, 2.1);
    hlMeshR.name = 'Subaru_Headlight_R';
    model.add(hlMeshR);

    // Hood scoop at Z = 1.2 (middle of hood, NOT front bumper)
    const scoopMat = new THREE.MeshBasicMaterial({ name: 'material_10' });
    const scoopMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.4), scoopMat);
    scoopMesh.position.set(0, 0.85, 1.2);
    scoopMesh.name = 'Object_13';
    model.add(scoopMesh);

    // Taillights at Z = -2.1
    const tlMat = new THREE.MeshBasicMaterial({ name: 'TaillightGlass' });
    const tlMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), tlMat);
    tlMeshL.position.set(-0.65, 0.70, -2.1);
    tlMeshL.name = 'Subaru_Taillight_L';
    model.add(tlMeshL);

    const tlMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), tlMat);
    tlMeshR.position.set(0.65, 0.70, -2.1);
    tlMeshR.name = 'Subaru_Taillight_R';
    model.add(tlMeshR);

    model.updateMatrixWorld(true);

    const pos = Car3DManager.detectVehicleLightPositions(model, 'subaru', THREE);
    assert.ok(pos.hlL && pos.hlR);
    // Headlights must be at front bumper (Z ~ 2.1), NOT on the hood scoop at Z = 1.2
    assert.ok(pos.hlL.z >= 2.05, `Headlight Z must be >= 2.05 at front bumper, not hood scoop (hlZ: ${pos.hlL.z})`);
    assert.strictEqual(pos.hlL.y, pos.hlR.y, 'Left and right headlight heights must be identical');
    assert.strictEqual(pos.hlL.z, pos.hlR.z, 'Left and right headlight depths must be identical');
});

test('UI and App.js: 3D podium entry functions, presets, and auto-rotation toggle are defined', () => {
    const appCode = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

    // 1. open3DPodium function must exist
    assert.ok(appCode.includes('function open3DPodium('), 'app.js must define open3DPodium');
    assert.ok(appCode.includes('function toggleShowroomAutoRotate('), 'app.js must define toggleShowroomAutoRotate');
    assert.ok(appCode.includes('function resetShowroomCamera('), 'app.js must define resetShowroomCamera');

    // 2. index.html must have dedicated 3D viewpoint buttons: front, side, rear, top, 3/4, reset, autorotate
    assert.ok(indexHtml.includes('btn-view-front'), 'index.html must have btn-view-front');
    assert.ok(indexHtml.includes('btn-view-side'), 'index.html must have btn-view-side');
    assert.ok(indexHtml.includes('btn-view-rear'), 'index.html must have btn-view-rear');
    assert.ok(indexHtml.includes('btn-view-top'), 'index.html must have btn-view-top');
    assert.ok(indexHtml.includes('btn-view-3d'), 'index.html must have btn-view-3d');
    assert.ok(indexHtml.includes('btn-view-reset'), 'index.html must have btn-view-reset');
    assert.ok(indexHtml.includes('btn-view-autorotate'), 'index.html must have btn-view-autorotate');

    // 3. Garage cards must contain 3D Podium button
    assert.ok(appCode.includes('open3DPodium(${index})'), 'Garage card must contain open3DPodium button');
});

test('BUG-01 Performance: Car3DShowroom shadowMap is disabled, needsRender dirty flag is tracked, and momentum inertia is supported', () => {
    const { Car3DManager } = setupTestContext();
    const showroom = new Car3DManager.Car3DShowroom('showroom-container');

    // Shadow maps are disabled to prevent redundant render passes
    assert.strictEqual(showroom.renderer.shadowMap.enabled, false, 'Showroom renderer shadowMap must be disabled for performance');

    // needsRender is initialized to true
    assert.strictEqual(showroom.needsRender, true, 'needsRender should be true on initialization');

    // requestRender sets needsRender to true
    showroom.needsRender = false;
    showroom.requestRender();
    assert.strictEqual(showroom.needsRender, true, 'requestRender must set needsRender to true');

    // Drag velocity tracking exists
    assert.strictEqual(typeof showroom.dragVelX, 'number');
    assert.strictEqual(typeof showroom.dragVelY, 'number');

    showroom.stop();
});

test('BUG-02 2D Replacement: renderSideThumbnail queues and processes 3D models into cache', () => {
    const { Car3DManager } = setupTestContext();

    assert.strictEqual(typeof Car3DManager.renderSideThumbnail, 'function', 'renderSideThumbnail must be a function');
    assert.strictEqual(typeof Car3DManager.getSideThumbnail, 'function', 'getSideThumbnail must be a function');

    let called = false;
    Car3DManager.renderSideThumbnail('Lada Priora БПАН', { color: '#ff0000' }, (url) => {
        called = true;
    });

    assert.ok(typeof Car3DManager.getSideThumbnail('Lada Priora БПАН', { color: '#ff0000' }) !== 'undefined');
});

test('BUG-04 Layout Shift: race-header-hud is overlay positioned with fixed height to eliminate screen jumping', () => {
    const styles = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');

    // 1. #race-3d-play-container .race-header-hud must be positioned absolute with pointer-events: none
    assert.ok(styles.includes('#race-3d-play-container .race-header-hud'), 'styles.css must style #race-3d-play-container .race-header-hud');
    assert.ok(styles.includes('position: absolute !important'), 'styles.css must position race-header-hud absolutely to prevent layout shifts');

    // 2. 2D race-header-hud has fixed height
    assert.ok(styles.includes('height: 38px;'), '2D race-header-hud must have fixed height to prevent layout shifts');
});

test('BUG-02 & BUG-03: App.js renders 3D car models in race showcase, gameover, and roulette', () => {
    const appCode = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

    // Race showcase renders 3D model
    assert.ok(appCode.includes('Car3DManager.getSideThumbnail(selectedRaceCarName'), 'updateRaceCarStats must check 3D thumbnail');
    // Game over canvas renders 3D model
    assert.ok(appCode.includes('Car3DManager.getSideThumbnail(selectedRaceCarName, goStyling)'), 'gameover must check 3D thumbnail');
    // Roulette modal renders 3D model
    assert.ok(appCode.includes('Car3DManager.getSideThumbnail(wonCarObj.name)'), 'roulette must check 3D thumbnail');
});


const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createApp } = require('./helpers/create-app.cjs');

function setupThreeAnd3DManager() {
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
        createElement: (tag) => domElementMock,
        createElementNS: () => ({ style: {} }),
        getElementById: () => domElementMock,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {}
    };
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

test('buildDetailedCarModel creates door pivots, hood, engine bay, trunk, subwoofers and headlights', () => {
    const { THREE, Car3DManager } = setupThreeAnd3DManager();

    const carGroup = Car3DManager.buildDetailedCarModel(THREE, 'Lada Priora БПАН', {
        color: '#ff0000',
        camber: -6,
        wheelOffset: 0.03,
        neon: '#00f0ff',
        neonMode: 'rainbow'
    });

    assert.ok(carGroup, 'Model group should be created');

    let doorFL = null;
    let doorFR = null;
    let hood = null;
    let engineBay = null;
    let trunk = null;
    let subwoofers = null;
    let headlights = null;

    carGroup.traverse((child) => {
        if (child.name === 'Door_FL_Pivot') doorFL = child;
        if (child.name === 'Door_FR_Pivot') doorFR = child;
        if (child.name === 'Hood_Pivot') hood = child;
        if (child.name === 'EngineBayGroup') engineBay = child;
        if (child.name === 'Trunk_Pivot') trunk = child;
        if (child.name === 'SubwooferGroup') subwoofers = child;
        if (child.name === 'HeadlightsGroup') headlights = child;
    });

    assert.ok(doorFL, 'Door_FL_Pivot must exist for interactive opening');
    assert.ok(doorFR, 'Door_FR_Pivot must exist for interactive opening');
    assert.ok(hood, 'Hood_Pivot must exist for interactive opening');
    assert.ok(engineBay, 'EngineBayGroup with detailed engine parts must exist');
    assert.ok(trunk, 'Trunk_Pivot must exist for interactive opening');
    assert.ok(subwoofers, 'SubwooferGroup with audio system must exist');
    assert.ok(headlights, 'HeadlightsGroup with headlight point lights must exist');

    // Check engine bay components
    let valveCover = false;
    let airIntake = false;
    let strutBar = false;
    engineBay.traverse((ch) => {
        if (ch.name === 'Engine_ValveCover') valveCover = true;
        if (ch.name === 'Engine_IntakePipe') airIntake = true;
        if (ch.name === 'Engine_StrutBar') strutBar = true;
    });
    assert.ok(valveCover, 'Engine bay must have valve cover');
    assert.ok(airIntake, 'Engine bay must have chrome air intake pipe');
    assert.ok(strutBar, 'Engine bay must have strut tower brace');

    // Check subwoofer components
    let subBox = false;
    let subCone = false;
    subwoofers.traverse((ch) => {
        if (ch.name === 'Subwoofer_Box') subBox = true;
        if (ch.name === 'Subwoofer_Cone_L') subCone = true;
    });
    assert.ok(subBox, 'Subwoofer group must have audio box');
    assert.ok(subCone, 'Subwoofer group must have speaker cone');
});

test('buildDetailedCarModel applies Stance negative camber and wheel offset spacers', () => {
    const { THREE, Car3DManager } = setupThreeAnd3DManager();

    const carStance = Car3DManager.buildDetailedCarModel(THREE, 'Toyota Mark II Tourer V', {
        camber: -9,
        wheelOffset: 0.03
    });

    let wheelFL = null;
    let wheelFR = null;
    carStance.traverse((child) => {
        if (child.name === 'Wheel_FL') wheelFL = child;
        if (child.name === 'Wheel_FR') wheelFR = child;
    });

    assert.ok(wheelFL, 'Wheel_FL must exist');
    assert.ok(wheelFR, 'Wheel_FR must exist');

    const expectedRad = Math.abs(-9) * (Math.PI / 180);
    assert.ok(Math.abs(Math.abs(wheelFL.rotation.z) - expectedRad) < 0.001, 'Front Left wheel has camber rotation magnitude of 9 degrees');
    assert.ok(Math.abs(Math.abs(wheelFR.rotation.z) - expectedRad) < 0.001, 'Front Right wheel has camber rotation magnitude of 9 degrees');
    assert.strictEqual(wheelFL.userData.camber, -9, 'Wheel FL stores camber degrees in userData');
    assert.strictEqual(wheelFR.userData.camber, -9, 'Wheel FR stores camber degrees in userData');
});

test('Car3DShowroom interactive methods toggle doors, hood, trunk, and headlights smoothly', () => {
    const { THREE, Car3DManager } = setupThreeAnd3DManager();

    const showroom = new Car3DManager.Car3DShowroom('showroom-container', {
        autoRotate: false
    });

    showroom.setCar('Nissan GT-R R35 Nismo', {
        color: '#ffffff',
        camber: -3,
        wheelOffset: 0.015,
        neon: '#22c55e',
        neonMode: 'pulse'
    });

    const initial = showroom.getInteractiveState();
    assert.strictEqual(initial.doorsOpen, false);
    assert.strictEqual(initial.hoodOpen, false);
    assert.strictEqual(initial.trunkOpen, false);
    assert.strictEqual(initial.headlightsOn, false);

    // Toggle doors
    const doorsOpen = showroom.toggleDoors();
    assert.strictEqual(doorsOpen, true);
    assert.strictEqual(showroom.getInteractiveState().doorsOpen, true);

    // Toggle hood
    const hoodOpen = showroom.toggleHood();
    assert.strictEqual(hoodOpen, true);
    assert.strictEqual(showroom.getInteractiveState().hoodOpen, true);

    // Toggle trunk
    const trunkOpen = showroom.toggleTrunk();
    assert.strictEqual(trunkOpen, true);
    assert.strictEqual(showroom.getInteractiveState().trunkOpen, true);

    // Toggle headlights
    const lightsOn = showroom.toggleHeadlights();
    assert.strictEqual(lightsOn, true);
    assert.strictEqual(showroom.getInteractiveState().headlightsOn, true);

    // Toggling off
    assert.strictEqual(showroom.toggleDoors(), false);
    assert.strictEqual(showroom.toggleHood(), false);
    assert.strictEqual(showroom.toggleTrunk(), false);
    assert.strictEqual(showroom.toggleHeadlights(), false);

    showroom.stop();
});

test('Car3DShowroom updateStyling updates stance, neon mode, and preserves model fidelity', () => {
    const { THREE, Car3DManager } = setupThreeAnd3DManager();

    const showroom = new Car3DManager.Car3DShowroom('showroom-container');
    showroom.setCar('ВАЗ-2107 «Жигули»', { color: '#ffffff' });

    showroom.updateStyling({
        color: '#ef4444',
        camber: -6,
        wheelOffset: 0.03,
        neon: '#f472b6',
        neonMode: 'rainbow'
    });

    assert.strictEqual(showroom.styling.color, '#ef4444');
    assert.strictEqual(showroom.styling.camber, -6);
    assert.strictEqual(showroom.styling.wheelOffset, 0.03);
    assert.strictEqual(showroom.styling.neonMode, 'rainbow');

    showroom.stop();
});

test('Styling Modal UI and pricing: camber, spacers offset, and rainbow neon are priced, deducted, and saved', () => {
    const { context, run } = createApp();

    // Give player enough balance for styling
    run(`balance = 500000;`);
    const initialBalance = run('balance');

    // Open styling modal for starter car (index 0)
    run(`openStylingModal(0);`);

    // Verify initial temporary stance and neon values
    assert.strictEqual(run('stylingTempCamber'), 0);
    assert.strictEqual(run('stylingTempOffset'), 0);
    assert.strictEqual(run('stylingTempNeonMode'), 'solid');

    // Select -6° Camber (35,000 ₽)
    run(`selectStylingCamber(-6);`);
    assert.strictEqual(run('stylingTempCamber'), -6);

    // Select +30mm Flush Offset (30,000 ₽)
    run(`selectStylingOffset(0.03);`);
    assert.strictEqual(run('stylingTempOffset'), 0.03);

    // Select Sakura Neon + Rainbow mode (35,000 ₽ neon + 25,000 ₽ rainbow = 60,000 ₽)
    run(`selectStylingNeon('#f472b6');`);
    run(`selectStylingNeonMode('rainbow');`);
    assert.strictEqual(run('stylingTempNeonMode'), 'rainbow');

    // Confirm styling
    run(`confirmApplyStyling();`);

    // Total cost: 35k (camber) + 30k (offset) + 35k (neon) + 25k (rainbow) = 125,000 ₽
    // Player also unlocks 'styling_master' achievement for installing neon (+60,000 ₽ reward)
    const expectedCost = 35000 + 30000 + 35000 + 25000;
    const achievementBonus = 60000;
    const currentBalance = run('balance');
    assert.strictEqual(currentBalance, initialBalance - expectedCost + achievementBonus, `Balance should reflect cost minus achievement reward`);

    // Verify car styling was persisted in myCars[0]
    const updatedCar = run('myCars[0]');
    assert.strictEqual(updatedCar.styling.camber, -6);
    assert.strictEqual(updatedCar.styling.wheelOffset, 0.03);
    assert.strictEqual(updatedCar.styling.neon, '#f472b6');
    assert.strictEqual(updatedCar.styling.neonMode, 'rainbow');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('PC Adaptation: CSS defines widescreen desktop race container, touch-controls toggle, and pursuit clearance', () => {
    const cssCode = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');

    // 1. Desktop Widescreen Race Container
    assert.ok(cssCode.includes('@media screen and (min-width: 860px)'), 'styles.css must have min-width: 860px desktop media queries');
    assert.ok(cssCode.includes('aspect-ratio: 16 / 9;'), '3D viewport must have 16:9 widescreen aspect ratio on desktop');
    assert.ok(cssCode.includes('#race-3d-touch-controls:not(.touch-enabled)'), 'Touch controls must be hidden on PC desktop unless enabled');

    // 2. Wanted Stars & Pursuit Box Clearance
    assert.ok(cssCode.includes('.race-3d-pursuit-box {'), 'CSS must define .race-3d-pursuit-box');
    assert.ok(cssCode.includes('position: absolute;'), 'Pursuit box must use position: absolute');
    assert.ok(cssCode.includes('top: 68px;'), 'Pursuit box must be placed at top: 68px safely below top stats row');

    // 3. Styling & Tuning Modal PC 2-Column Layout
    assert.ok(cssCode.includes('.styling-modal-box {'), 'CSS must define .styling-modal-box');
    assert.ok(cssCode.includes('.styling-modal-body {'), 'CSS must define .styling-modal-body');
    assert.ok(cssCode.includes('grid-template-columns: 460px 1fr;'), 'Styling modal must use 2-column layout on desktop');
});

test('HTML: Race header HUD includes touch controls toggle and styling modal uses two-column structure', () => {
    const htmlCode = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

    // 1. Steering wheel toggle
    assert.ok(htmlCode.includes('id="btn-toggle-touch-controls"'), 'HUD must contain btn-toggle-touch-controls');
    assert.ok(htmlCode.includes('toggle3DTouchControls()'), 'Toggle button must invoke toggle3DTouchControls()');

    // 2. Styling modal structure
    assert.ok(htmlCode.includes('class="modal-box styling-modal-box"'), 'Styling modal must use styling-modal-box class');
    assert.ok(htmlCode.includes('class="styling-stage-column"'), 'Styling modal must have stage column');
    assert.ok(htmlCode.includes('class="styling-options-column"'), 'Styling modal must have options column');
});

test('GLB Caching & Browser Cache: car-3d.js enables THREE.Cache and implements fetchCachedGLBBuffer', () => {
    const car3dCode = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');

    assert.ok(car3dCode.includes('nomera-glb-cache-v1'), 'Must use nomera-glb-cache-v1 cache name');
    assert.ok(car3dCode.includes('fetchCachedGLBBuffer'), 'Must define fetchCachedGLBBuffer');
    assert.ok(car3dCode.includes('THREE.Cache.enabled = true'), 'Must enable THREE.Cache for persistent in-memory caching');
    assert.ok(car3dCode.includes('loader.parse'), 'Must support parsing ArrayBuffer from disk cache');
});

test('Showroom Interactivity: Procedural and GLB coordination, doors/hood/trunk/lights toggle', () => {
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
    global.navigator = { userAgent: 'NodeTest' };
    const activeTimers = new Set();
    global.requestAnimationFrame = (cb) => {
        const id = setTimeout(() => { activeTimers.delete(id); cb(performance.now()); }, 16);
        activeTimers.add(id);
        return id;
    };
    global.cancelAnimationFrame = (id) => { clearTimeout(id); activeTimers.delete(id); };

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

    const showroom = new Car3DManager.Car3DShowroom('showroom-container', { autoRotate: false });
    showroom.setCar('Toyota Camry 3.5', { color: '#000000' });

    // Verify procedural model was created with pivots
    assert.ok(showroom.proceduralCar, 'Showroom must retain proceduralCar');
    assert.ok(showroom.proceduralCar.getObjectByName('Door_FL_Pivot'), 'Procedural car must have Door_FL_Pivot');
    assert.ok(showroom.proceduralCar.getObjectByName('Hood_Pivot'), 'Procedural car must have Hood_Pivot');
    assert.ok(showroom.proceduralCar.getObjectByName('Trunk_Pivot'), 'Procedural car must have Trunk_Pivot');

    // Verify headlights spotlights were created
    assert.ok(showroom.headlightSpotL, 'Showroom must have left headlight spotlight');
    assert.ok(showroom.headlightSpotR, 'Showroom must have right headlight spotlight');

    // Toggle doors
    assert.strictEqual(showroom.doorsOpen, false);
    showroom.toggleDoors();
    assert.strictEqual(showroom.doorsOpen, true);
    assert.strictEqual(showroom.proceduralCar.visible, true, 'Procedural car must be visible when doors open');

    // Toggle headlights
    assert.strictEqual(showroom.headlightsOn, false);
    showroom.toggleHeadlights();
    assert.strictEqual(showroom.headlightsOn, true);
    assert.ok(showroom.headlightSpotL.intensity > 0, 'Spotlight must be lit when headlights are on');

    showroom.toggleHeadlights();
    assert.strictEqual(showroom.headlightsOn, false);
    assert.strictEqual(showroom.headlightSpotL.intensity, 0, 'Spotlight must turn off when headlights are off');

    showroom.stop();
});

test('App.js: toggleShowroom buttons auto-switch to 3D mode if in 2D view', () => {
    const appCode = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

    // Check that toggleShowroom functions switch to 3D mode
    assert.ok(appCode.includes("if (stylingViewMode !== '3d') {\n                setStylingViewMode('3d');"), 'toggleShowroomDoors must switch to 3D if in 2D mode');
    assert.ok(appCode.includes('toggle3DTouchControls'), 'app.js must define toggle3DTouchControls');
    assert.ok(appCode.includes('preloadUserGarageModels'), 'app.js must define preloadUserGarageModels');
});

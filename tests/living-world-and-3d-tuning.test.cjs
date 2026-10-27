'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

function setupThreeAnd3DManager() {
    const domElementMock = {
        getContext: () => ({
            fillRect: () => {},
            clearRect: () => {},
            fillText: () => {},
            drawImage: () => {},
            measureText: () => ({ width: 100 }),
            beginPath: () => {},
            ellipse: () => {},
            fill: () => {},
            createRadialGradient: () => ({ addColorStop: () => {} }),
            createLinearGradient: () => ({ addColorStop: () => {} })
        }),
        width: 512,
        height: 512,
        clientWidth: 800,
        clientHeight: 600,
        style: {},
        classList: {
            add: () => {},
            remove: () => {},
            contains: () => false
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        appendChild: () => {},
        removeChild: () => {},
        closest: () => null,
        innerHTML: ''
    };
    domElementMock.parentNode = domElementMock;

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
    try {
        Object.defineProperty(global, 'navigator', { value: { userAgent: 'NodeTest' }, configurable: true });
    } catch (_) {}
    global.requestAnimationFrame = () => 1;
    global.cancelAnimationFrame = () => {};

    const THREE = require('../js/vendor/three.min.js');
    THREE.WebGLRenderer = class MockRenderer {
        constructor() {
            this.domElement = domElementMock;
            this.shadowMap = { enabled: false };
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

    delete require.cache[require.resolve('../js/race-effects.js')];
    delete require.cache[require.resolve('../js/car-3d.js')];
    const RaceEffectsManager = require('../js/race-effects.js');
    global.RaceEffectsManager = RaceEffectsManager;
    const Car3DManager = require('../js/car-3d.js');

    return { THREE, Car3DManager, domElementMock };
}

test('Option 5: Rim color, caliper color, and headlight tint apply to materials, procedural model, showroom beams, and racing headlights', () => {
    const { THREE, Car3DManager, domElementMock } = setupThreeAnd3DManager();

    assert.equal(Car3DManager.resolveRimColorSpec('gold').hex, 0xd4af37);
    assert.equal(Car3DManager.resolveCaliperColorHex('acid'), 0x84cc16);
    assert.equal(Car3DManager.resolveHeadlightColorSpec('purple').beam, 0xc084fc);

    const mats = Car3DManager.createCarMaterials(THREE, {
        color: '#112233',
        rimColor: 'gold',
        caliperColor: 'blue',
        headlightColor: 'yellow'
    });
    assert.equal(mats.rim.color.getHex(), 0xd4af37, 'Rim material uses gold hex');
    assert.equal(mats.caliper.color.getHex(), 0x2563eb, 'Caliper material uses blue hex');
    assert.equal(mats.headlight.emissive.getHex(), 0xfacc15, 'Headlight lens uses yellow rally tint');

    const carGroup = Car3DManager.buildDetailedCarModel(THREE, 'Lada Priora БПАН', {
        color: '#112233',
        wheels: 'forged',
        rimColor: 'bronze',
        caliperColor: 'acid',
        headlightColor: 'purple',
        suspension: 'airride'
    });

    let foundBronzeRim = false;
    let foundAcidCaliper = false;
    carGroup.traverse((child) => {
        if (child.isMesh && child.name === 'WheelRim' && child.material.color.getHex() === 0x9a6b3b) {
            foundBronzeRim = true;
        }
        if (child.isMesh && child.name === 'BrakeCaliper' && child.material.color.getHex() === 0x84cc16) {
            foundAcidCaliper = true;
        }
    });
    assert.ok(foundBronzeRim, 'Procedural wheel rims receive bronze paint');
    assert.ok(foundAcidCaliper, 'Procedural brake calipers receive acid green paint');

    // Showroom headlight beam color & animated Air Ride
    const sounds = [];
    const showroom = new Car3DManager.Car3DShowroom(domElementMock, {
        autoRotate: false,
        onSound: (s) => sounds.push(s)
    });
    showroom.setCar('Lada Priora БПАН', {
        color: '#112233',
        headlightColor: 'purple',
        suspension: 'stock'
    });
    showroom.toggleHeadlights(true);
    assert.equal(showroom.headlightSpotL.color.getHex(), 0xc084fc, 'Showroom left spotlight uses purple tint');
    assert.equal(showroom.headlightSpotR.color.getHex(), 0xc084fc, 'Showroom right spotlight uses purple tint');

    // Toggle Air Ride with smooth animation
    const slammed = showroom.toggleAirRide(false);
    assert.equal(slammed.isLowered, true, 'toggleAirRide enters airride mode');
    assert.equal(showroom.stanceMode, 'airride');
    assert.equal(showroom.airRideAnimating, true, 'airRideAnimating started for smooth interpolation');
    assert.ok(sounds.includes('airRideDown'), 'Air Ride release sound triggered');

    // Step animation halfway and to completion
    showroom.stepAirRideAnimation(0.12);
    assert.ok(showroom.stanceOffsetY < 0 && showroom.stanceOffsetY > -0.118, 'Mid-animation body height is interpolated');
    for (let i = 0; i < 20; i++) showroom.stepAirRideAnimation(0.1);
    assert.ok(Math.abs(showroom.stanceOffsetY - (-0.118)) < 1e-3, 'Completed Air Ride reaches -0.118 slammed drop');
    showroom.stop();
});

test('Option 5: NomeraAtelier quotes rimColor, caliperColor, headlightColor, and airride suspension accurately', () => {
    delete require.cache[require.resolve('../js/authors-atelier.js')];
    const Atelier = require('../js/authors-atelier.js');
    const car = {
        name: 'BMW M5 F90 Competition',
        styling: {
            color: '#ffffff',
            rimColor: 'silver',
            caliperColor: 'red',
            headlightColor: 'xenon',
            suspension: 'stock'
        }
    };
    const draft = {
        color: '#ffffff',
        rimColor: 'gold',
        caliperColor: 'acid',
        headlightColor: 'purple',
        suspension: 'airride'
    };
    const quote = Atelier.quote(car, draft);
    assert.equal(quote.changed, true);
    assert.equal(quote.total, 45000 + 15000 + 30000 + 85000);
});

test('Option 3: Smart Traffic AI flashes high-beams, honks, and blinks turn indicators when player approaches fast or cuts closely', () => {
    const { Car3DManager, domElementMock } = setupThreeAnd3DManager();
    const sounds = [];
    const engine = new Car3DManager.Car3DRacingEngine(domElementMock, {
        onSound: (s) => sounds.push(s)
    });
    engine.carName = 'Lada Priora БПАН';
    engine.styling = { headlightColor: 'yellow' };
    engine.loadPlayerCar();

    assert.ok(engine.playerHeadlights && engine.playerHeadlights.length === 2, 'Player headlights initialized');
    assert.equal(engine.playerHeadlights[0].color.getHex(), 0xfde047, 'Racing engine headlight uses yellow rally tint');
    assert.ok(engine.trafficCars.length > 0, 'Traffic pool initialized');

    const tc = engine.trafficCars[0];
    const u = tc.userData;
    assert.ok(Array.isArray(u.headlights) && u.headlights.length === 2 && u.headlightMat, 'Traffic vehicle has front headlight meshes and material');
    assert.ok(u.blinkerL && u.blinkerR, 'Traffic vehicle has turn indicator meshes');

    // Place traffic vehicle just ahead of player in the same lane while player approaches fast
    engine.state.x = engine.trafficLanes[2];
    engine.state.z = 100;
    engine.state.speed = 240; // ~66.6 m/s
    u.type = 'sedan';
    u.laneIndex = 2;
    u.plannedLaneIndex = null;
    u.changingLane = false;
    u.targetX = engine.trafficLanes[2];
    tc.position.set(engine.trafficLanes[2], 0, 118); // dz = 18m ahead
    u.speed = 60; // km/h -> closingSpeed = 240 - 60 = 180 km/h > 45
    u.laneChangeTimer = 5.0;
    u.headlightFlashTimer = 0;
    u.hornCooldown = 0;

    engine.updateTraffic(0.05);

    assert.ok(u.headlightFlashTimer > 0, 'Traffic vehicle flashes high-beams when player approaches rapidly');
    assert.ok(u.headlightMat.emissiveIntensity >= 3.0, 'Traffic headlight emissiveIntensity spikes during high-beam flash');
    assert.ok(sounds.includes('trafficHorn'), 'Traffic vehicle honks warning horn');
    assert.equal(u.yieldedToFastPlayer, true, 'Traffic vehicle yields lane to fast approaching player');
    assert.notEqual(u.laneIndex, 2, 'Traffic vehicle selects adjacent yield lane');

    engine.destroy();
});

test('Option 3: Destructible roadside props (cones & water barriers) launch with 3D tumble physics and award bonus on hit', () => {
    const { Car3DManager, domElementMock } = setupThreeAnd3DManager();
    const sounds = [];
    const popups = [];
    const engine = new Car3DManager.Car3DRacingEngine(domElementMock, {
        onSound: (s) => sounds.push(s),
        onPopup: (txt) => popups.push(txt)
    });

    assert.ok(Array.isArray(engine.roadProps) && engine.roadProps.length === 8, '8 destructible roadside props spawned');
    const prop = engine.roadProps[0];
    const u = prop.userData;
    u.propType = 'cone';
    u.hit = false;
    prop.position.set(0, 0, 50);

    engine.state.x = 0;
    engine.state.z = 50;
    engine.state.speed = 160;
    const cashBefore = engine.state.earnedCash;

    engine.updateRoadProps(0.016);

    assert.equal(u.hit, true, 'Roadside prop marked hit upon player contact');
    assert.ok(u.vy > 0 && u.vz > 0, 'Prop launched upward and forward');
    assert.equal(engine.state.conesSmashed, 1, 'conesSmashed counter incremented');
    assert.equal(engine.state.earnedCash, cashBefore + 1500, 'Cone smash awards +1500 ₽ bonus');
    assert.ok(sounds.includes('coneHit'), 'coneHit sound played');
    assert.ok(popups.some(p => p.includes('СБИТ КОНУС')), 'Popup notification shown for smashed cone');

    // Step physics while airborne
    engine.updateRoadProps(0.08);
    assert.ok(prop.position.y > 0, 'Prop rises into the air');
    engine.destroy();
});

test('Option 3: Smooth weather transition interpolates sky, fog, lighting, and wet-road reflections', () => {
    const { Car3DManager, domElementMock } = setupThreeAnd3DManager();
    const engine = new Car3DManager.Car3DRacingEngine(domElementMock, {});
    engine.setWeather('day', true);

    assert.equal(engine.currentActiveWeather, 'day');
    assert.equal(engine.roadWetness, 0);

    // Trigger smooth weather transition to rain (isManual = false)
    engine.weatherMode = 'manual';
    engine.setWeather('rain', false);
    assert.equal(engine.currentActiveWeather, 'rain');
    assert.ok(engine.weatherTransition, 'Smooth weatherTransition created');

    engine.stepWeatherTransition(1.75); // 50% of 3.5s transition
    assert.ok(engine.roadWetness > 0.3 && engine.roadWetness < 0.7, 'roadWetness interpolates smoothly mid-transition');
    assert.ok(engine.asphaltMat.roughness < 0.88 && engine.asphaltMat.roughness > 0.14, 'Asphalt roughness interpolates toward wet reflection');

    engine.stepWeatherTransition(2.0); // Complete transition
    assert.equal(engine.weatherTransition, null, 'weatherTransition finishes cleanly');
    assert.ok(Math.abs(engine.roadWetness - 1.0) < 1e-4, 'roadWetness reaches 1.0 in rain');
    assert.ok(Math.abs(engine.asphaltMat.roughness - 0.14) < 1e-3, 'Asphalt roughness reaches wet mirror state');

    engine.destroy();
});

test('Option 3 & Option 5: SoundEngine synthesizes airRide, trafficHorn, and coneHit effects cleanly', () => {
    delete require.cache[require.resolve('../js/audio.js')];
    const { createAudio } = require('../js/audio.js');
    const created = [];
    const param = () => ({ setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {} });
    const node = () => ({ gain: param(), frequency: param(), connect() {}, disconnect() {}, start() {}, stop() {} });
    const ctx = {
        currentTime: 1,
        state: 'running',
        destination: {},
        createGain: node,
        createBiquadFilter: node,
        createOscillator: () => { const n = node(); created.push(n); return n; },
        suspend: () => Promise.resolve(),
        resume: () => Promise.resolve()
    };
    const sound = createAudio({ contextFactory: () => ctx });
    sound.unlock();
    assert.equal(typeof sound.airRide, 'function');
    assert.equal(typeof sound.trafficHorn, 'function');
    assert.equal(typeof sound.coneHit, 'function');
    sound.airRide(true);
    sound.airRide(false);
    sound.trafficHorn();
    sound.coneHit();
    assert.ok(created.length >= 6, 'Oscillator nodes synthesized for airRide, trafficHorn, and coneHit');
});


'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

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

    delete require.cache[require.resolve('../js/car-3d.js')];
    const Car3DManager = require('../js/car-3d.js');
    return { THREE, Car3DManager, domElementMock };
}

test('Car3DShowroom playCaseRevealAnimation and stepCaseRevealAnimation roll car out onto podium and flash headlights', () => {
    const { Car3DManager, domElementMock } = setupThreeAnd3DManager();
    const showroom = Car3DManager.createShowroom(domElementMock, {
        width: 360,
        height: 196,
        showPodium: true
    });
    assert.ok(showroom, 'Showroom should be created');
    showroom.setCar('BMW M5 F90 Competition', {});

    const revState = showroom.playCaseRevealAnimation({
        mode: 'car',
        tier: 'mythic',
        duration: 1.0
    });
    assert.equal(revState.active, true);
    assert.equal(revState.mode, 'car');
    assert.equal(revState.tier, 'mythic');
    assert.ok(revState.currentZ < -2.0, 'Car must start back inside the container gate (Z < -2.0)');
    assert.equal(showroom.podiumRingMat.color.getHex(), 0xfbbf24, 'Mythic tier sets gold podium ring');

    // Step past 55% progress so headlights flash on automatically
    showroom.stepCaseRevealAnimation(0.6);
    assert.equal(revState.headlightsFlashed, true, 'Headlights must flash on past 52% reveal progress');
    assert.equal(showroom.headlightsOn, true, 'Showroom headlights must be switched on');
    assert.ok(revState.currentZ > -1.0 && revState.currentZ < 0, 'Car rolls forward toward Z = 0');
    assert.ok(revState.wheelSpinRad > 0, 'Wheels spin forward during roll-out');

    // Finish roll-out
    showroom.stepCaseRevealAnimation(0.5);
    assert.equal(revState.active, false, 'Reveal animation finishes at t >= 1');
    assert.equal(revState.currentZ, 0, 'Car settles at center of podium (Z = 0)');
    assert.equal(revState.pitchAngle, 0, 'Suspension pitch settles to 0');

    // Plate reveal mode mounts plate and focuses camera on front plate
    const plateState = showroom.playCaseRevealAnimation({
        mode: 'plate',
        tier: 'legendary',
        plateText: 'А 777 АА | 77 RUS'
    });
    assert.equal(plateState.mode, 'plate');
    assert.equal(showroom.currentPreset, 'plate_front', 'Plate mode focuses camera on plate_front preset');
    assert.equal(showroom.currentStyling.plate, 'А 777 АА | 77 RUS');
});

test('Audio caseGateReveal synthesizes container gate unseal + engine rev', () => {
    const NomeraAudio = require('../js/audio.js');
    const createdOscs = [];
    const createdBuffers = [];
    const mockGain = () => ({
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
        connect() {}
    });
    const mockFilter = () => ({
        type: 'lowpass',
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        Q: { setValueAtTime() {} },
        connect() {}
    });
    const mockCtx = {
        state: 'running',
        currentTime: 0,
        sampleRate: 44100,
        destination: {},
        createGain: mockGain,
        createBiquadFilter: mockFilter,
        createOscillator() {
            const osc = {
                type: 'sine',
                frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
                connect() {},
                start() {},
                stop() {}
            };
            createdOscs.push(osc);
            return osc;
        },
        createBuffer(ch, len) {
            return { getChannelData: () => new Float32Array(len) };
        },
        createBufferSource() {
            const src = { buffer: null, loop: false, connect() {}, start() {}, stop() {} };
            createdBuffers.push(src);
            return src;
        }
    };

    const audio = NomeraAudio.createAudio({
        contextFactory: () => mockCtx
    });
    audio.unlock();
    const beforeOsc = createdOscs.length;
    audio.caseGateReveal('mythic');
    assert.ok(createdOscs.length > beforeOsc + 2, 'caseGateReveal should synthesize multiple oscillator layers');
    assert.ok(createdBuffers.length >= 1, 'caseGateReveal should trigger pneumatic noise burst');
});

test('App triggerLoot3DShowcase & mountRoulette3DPodium activate 3D Podium Stage for cars and rare plates', () => {
    const app = createApp();
    const { context } = app;
    const document = context.document;

    // Provide a lightweight mock Car3DManager in the VM context
    let lastCreatedShowroom = null;
    context.window.Car3DManager = {
        createShowroom(container, opts) {
            lastCreatedShowroom = {
                container,
                opts,
                currentCarName: '',
                currentStyling: {},
                currentPreset: 'isometric',
                headlightsOn: false,
                doorsOpen: false,
                stanceMode: 'stock',
                paused: false,
                lastRevealOpts: null,
                setCar(name, styling) {
                    this.currentCarName = name;
                    this.currentStyling = Object.assign({}, styling);
                },
                playCaseRevealAnimation(revOpts) {
                    this.lastRevealOpts = revOpts;
                    this.currentPreset = revOpts.mode === 'plate' ? 'plate_front' : 'isometric';
                    return { active: true, ...revOpts };
                },
                setViewPreset(preset) {
                    this.currentPreset = preset;
                },
                toggleHeadlights() {
                    this.headlightsOn = !this.headlightsOn;
                    return this.headlightsOn;
                },
                toggleDoors() {
                    this.doorsOpen = !this.doorsOpen;
                    return this.doorsOpen;
                },
                toggleAirRide() {
                    this.stanceMode = this.stanceMode === 'airride' ? 'stock' : 'airride';
                    return { mode: this.stanceMode, isLowered: this.stanceMode === 'airride' };
                },
                getInteractiveState() {
                    return {
                        headlightsOn: this.headlightsOn,
                        doorsOpen: this.doorsOpen,
                        stanceMode: this.stanceMode
                    };
                },
                pause() { this.paused = true; },
                resume() { this.paused = false; }
            };
            return lastCreatedShowroom;
        }
    };
    context.Car3DManager = context.window.Car3DManager;

    // 1. Car drop automatically opens the 3D Case Reveal Podium in 'car' mode
    const wonCar = {
        isCar: true,
        name: 'Bugatti Chiron Super Sport',
        category: 'Гиперкар',
        price: 38000000,
        rarity: { text: 'МИФИЧЕСКИЙ', bg: '#ef4444', color: '#fff' }
    };
    context.window.triggerLoot3DShowcase(wonCar);

    const podiumStage = document.getElementById('roulette-3d-podium-stage');
    const gateOverlay = document.getElementById('roulette-3d-gate-overlay');
    assert.ok(!podiumStage.classList.contains('hidden'), '3D podium stage must be visible for car drops');
    assert.equal(podiumStage.dataset.revealMode, 'car');
    assert.equal(podiumStage.dataset.lootTier, 'mythic');
    assert.ok(gateOverlay.classList.contains('gate-opening'), 'Gate overlay must animate open');
    assert.ok(lastCreatedShowroom, 'roulette3DShowroom must be instantiated');
    assert.equal(lastCreatedShowroom.currentCarName, 'Bugatti Chiron Super Sport');
    assert.equal(lastCreatedShowroom.lastRevealOpts.mode, 'car');

    // Interactive toolbar controls on the 3D Case Reveal stage
    assert.equal(context.window.cycleRoulette3DCamera(), 'plate_front');
    assert.equal(context.window.toggleRoulette3DHeadlights(), true);
    assert.equal(context.window.toggleRoulette3DDoors(), true);
    assert.equal(context.window.toggleRoulette3DAirRide().mode, 'airride');

    // 2. Common plate drop hides 3D podium by default, but allows 1-click 3D try-on
    const commonPlate = {
        isCar: false,
        text: 'В 234 КА | 77 RUS',
        price: 5000,
        rarity: { text: 'Обычный', bg: 'transparent', color: '#fff' }
    };
    context.window.triggerLoot3DShowcase(commonPlate);
    assert.ok(podiumStage.classList.contains('hidden'), 'Common plate hides 3D podium by default');

    const toggledOn = context.window.toggleRoulette3DPlateStage();
    assert.equal(toggledOn, true, 'toggleRoulette3DPlateStage opens 3D podium for won plate');
    assert.ok(!podiumStage.classList.contains('hidden'));
    assert.equal(podiumStage.dataset.revealMode, 'plate');
    assert.equal(lastCreatedShowroom.currentStyling.plate, 'В 234 КА | 77 RUS');

    // 3. Closing roulette modal pauses the 3D showroom
    context.window.closeRouletteModal();
    assert.equal(lastCreatedShowroom.paused, true, 'closeRouletteModal must pause roulette3DShowroom');
});

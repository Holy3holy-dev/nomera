'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Controls = require('../js/authors-screen-controls.js');
const NfsCircuit = require('../js/nfs-circuit-race.js');
const { createApp } = require('./helpers/create-app.cjs');

test('Ergonomics 1: NomeraScreenControls.computeSlideSteer provides deadzone-filtered proportional steering and seamless left-to-right thumb slide', () => {
    assert.equal(typeof Controls.computeSlideSteer, 'function', 'Must export computeSlideSteer(clientX, rect)');

    const rect = { left: 10, width: 200 };
    // Center (110px -> relX = 0.5) must be inside deadzone (0)
    const center = Controls.computeSlideSteer(110, rect);
    assert.equal(center.steer, 0);
    assert.equal(center.left, false);
    assert.equal(center.right, false);

    // Slight left slide (relX = 0.30) -> proportional negative steer
    const partialLeft = Controls.computeSlideSteer(70, rect);
    assert.ok(partialLeft.steer < -0.2 && partialLeft.steer > -0.9, `Expected partial left steer, got ${partialLeft.steer}`);
    assert.equal(partialLeft.left, true);
    assert.equal(partialLeft.right, false);

    // Full left edge (relX = 0.05) -> full left lock (-1)
    const fullLeft = Controls.computeSlideSteer(20, rect);
    assert.equal(fullLeft.steer, -1);
    assert.equal(fullLeft.left, true);
    assert.equal(fullLeft.right, false);

    // Slide thumb directly across to right side (relX = 0.85) without lifting -> switches to right!
    const slideRight = Controls.computeSlideSteer(180, rect);
    assert.ok(slideRight.steer > 0.6 && slideRight.steer <= 1, `Expected right steer on slide, got ${slideRight.steer}`);
    assert.equal(slideRight.left, false);
    assert.equal(slideRight.right, true);
});

test('Ergonomics 2: Tilt / Gyroscope steering converts deviceorientation into proportional steer for portrait and landscape', () => {
    assert.equal(typeof Controls.tiltSteerFromOrientation, 'function', 'Must export tiltSteerFromOrientation');

    // Flat phone (0 deg) -> 0 steer (deadzone)
    assert.equal(Controls.tiltSteerFromOrientation({ gamma: 1.2, beta: 0 }, 0), 0);

    // Portrait (angle 0): tilting phone right (+15 deg gamma) -> positive steer
    const portraitRight = Controls.tiltSteerFromOrientation({ gamma: 15, beta: 0 }, 0);
    assert.ok(portraitRight > 0.35 && portraitRight < 0.85, `Expected proportional right steer in portrait, got ${portraitRight}`);

    // Portrait (angle 0): tilting phone full left (-28 deg gamma) -> -1 steer
    assert.equal(Controls.tiltSteerFromOrientation({ gamma: -30, beta: 0 }, 0), -1);

    // Landscape primary (angle 90): beta controls left/right tilt
    const landscapeRight = Controls.tiltSteerFromOrientation({ gamma: 0, beta: 15 }, 90);
    assert.ok(landscapeRight > 0.35 && landscapeRight < 0.85, `Expected proportional right steer in landscape 90, got ${landscapeRight}`);

    // Landscape secondary (angle -90 or 270): inverted beta controls left/right tilt
    const landscapeInvRight = Controls.tiltSteerFromOrientation({ gamma: 0, beta: -15 }, -90);
    assert.ok(landscapeInvRight > 0.35 && landscapeInvRight < 0.85, `Expected proportional right steer in landscape -90, got ${landscapeInvRight}`);
});

test('Ergonomics 3: Auto-Gas drives the car immediately in racing phase (even in Gamepad buttons mode) and yields to brake or handbrake', () => {
    const prevPreview = global.NOMERA_AUTHORS_PREVIEW;
    global.NOMERA_AUTHORS_PREVIEW = true;
    try {
        const keyState = { left: false, right: false, gas: false, brake: false, drift: false, nitro: false };
        global.setRaceKey = (k, v) => { keyState[k] = v; };

        const fakeEngine = {
            keys: keyState,
            state: { crashed: false, racePhase: 'racing' },
            onResize() {}
        };

        // Test pure auto-gas computation helper
        assert.equal(typeof Controls.shouldApplyAutoGas, 'function', 'Must export shouldApplyAutoGas');
        // In buttons mode (screen: false) with auto: true and racing phase -> must apply gas immediately without needing engaged=true!
        assert.equal(
            Controls.shouldApplyAutoGas({ auto: true, screen: false, engaged: false }, fakeEngine),
            true,
            'Auto-gas must apply immediately in racing phase even in buttons mode without prior viewport tap'
        );

        // Pressing brake must immediately cut auto-gas
        keyState.brake = true;
        assert.equal(
            Controls.shouldApplyAutoGas({ auto: true, screen: false, engaged: true }, fakeEngine),
            false,
            'Auto-gas must yield when brake is pressed'
        );

        // Pressing handbrake/drift must cut auto-gas so drift initiation is clean
        keyState.brake = false;
        keyState.drift = true;
        assert.equal(
            Controls.shouldApplyAutoGas({ auto: true, screen: false, engaged: true }, fakeEngine),
            false,
            'Auto-gas must yield when handbrake (drift) is held'
        );
    } finally {
        global.NOMERA_AUTHORS_PREVIEW = prevPreview;
    }
});

test('Ergonomics 4: NomeraCircuitRaceEngine and app.js setRaceAnalogSteer forward proportional analog steering to vehicle physics', () => {
    const engine = new NfsCircuit.NomeraCircuitRaceEngine(null, { rivalCount: 0 });
    try {
        engine.start({ skipCountdown: true });
        engine.stop();
        engine.setKey('gas', true);
        engine.setAnalogSteer(0.45);
        assert.equal(engine.analogSteer, 0.45);

        const { run } = createApp();
        assert.equal(run('typeof window.setRaceAnalogSteer'), 'function', 'window.setRaceAnalogSteer must be exposed');
        run('window.setRaceAnalogSteer(-0.65)');
        assert.equal(run('raceKeys.left'), true, 'Negative analog steer beyond threshold must activate left indicator');
        assert.equal(run('raceKeys.right'), false);
        run('resetRaceKeys()');
        assert.equal(run('raceKeys.left'), false);
    } finally {
        engine.stop();
    }
});

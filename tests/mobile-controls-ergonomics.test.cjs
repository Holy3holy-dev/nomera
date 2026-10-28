'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Controls = require('../js/authors-screen-controls.js');
const NfsCircuit = require('../js/nfs-circuit-race.js');
const Traffic = require('../js/authors-traffic.js');
const mw = require('../js/authors-mw-physics.js');
const { NfsVehiclePhysics } = require('../js/nfs-physics.js');
const OtaSync = require('../js/ota-asset-sync.js');
const { createApp } = require('./helpers/create-app.cjs');

test('Ergonomics 1: NomeraScreenControls.computeSlideSteer provides deadzone-filtered proportional steering and seamless left-to-right thumb slide', () => {
    assert.equal(typeof Controls.computeSlideSteer, 'function', 'Must export computeSlideSteer(clientX, rect)');

    const rect = { left: 10, width: 200 };
    const center = Controls.computeSlideSteer(110, rect);
    assert.equal(center.steer, 0);
    assert.equal(center.left, false);
    assert.equal(center.right, false);

    const partialLeft = Controls.computeSlideSteer(70, rect);
    assert.ok(partialLeft.steer < -0.2 && partialLeft.steer > -0.9, `Expected partial left steer, got ${partialLeft.steer}`);
    assert.equal(partialLeft.left, true);
    assert.equal(partialLeft.right, false);

    const fullLeft = Controls.computeSlideSteer(20, rect);
    assert.equal(fullLeft.steer, -1);
    assert.equal(fullLeft.left, true);
    assert.equal(fullLeft.right, false);

    const slideRight = Controls.computeSlideSteer(180, rect);
    assert.ok(slideRight.steer > 0.6 && slideRight.steer <= 1, `Expected right steer on slide, got ${slideRight.steer}`);
    assert.equal(slideRight.left, false);
    assert.equal(slideRight.right, true);
});

test('Ergonomics 2: Tilt / Gyroscope steering converts deviceorientation into proportional steer for portrait and landscape', () => {
    assert.equal(typeof Controls.tiltSteerFromOrientation, 'function', 'Must export tiltSteerFromOrientation');

    assert.equal(Controls.tiltSteerFromOrientation({ gamma: 1.2, beta: 0 }, 0), 0);

    const portraitRight = Controls.tiltSteerFromOrientation({ gamma: 15, beta: 0 }, 0);
    assert.ok(portraitRight > 0.35 && portraitRight < 0.85, `Expected proportional right steer in portrait, got ${portraitRight}`);

    assert.equal(Controls.tiltSteerFromOrientation({ gamma: -30, beta: 0 }, 0), -1);

    const landscapeRight = Controls.tiltSteerFromOrientation({ gamma: 0, beta: 15 }, 90);
    assert.ok(landscapeRight > 0.35 && landscapeRight < 0.85, `Expected proportional right steer in landscape 90, got ${landscapeRight}`);

    const landscapeInvRight = Controls.tiltSteerFromOrientation({ gamma: 0, beta: -15 }, -90);
    assert.ok(landscapeInvRight > 0.35 && landscapeInvRight < 0.85, `Expected proportional right steer in landscape -90, got ${landscapeInvRight}`);
});

test('Ergonomics 3: Gas is manual by default (releasable at any time) and optional Auto-Gas yields to brake or handbrake', () => {
    assert.equal(Controls.DEFAULT_AUTO_GAS, false, 'Auto-Gas must default to false so the player can release gas at any time');

    const keyState = { left: false, right: false, gas: false, brake: false, drift: false, nitro: false };
    const fakeEngine = {
        keys: keyState,
        state: { crashed: false, racePhase: 'racing' },
        onResize() {}
    };

    // With default auto: false, shouldApplyAutoGas is false so releasing the gas button stops throttle
    assert.equal(
        Controls.shouldApplyAutoGas({ auto: Controls.DEFAULT_AUTO_GAS, screen: false }, fakeEngine),
        false,
        'Default manual gas mode must not force gas when button is released'
    );

    // When player explicitly enables auto: true, it drives until brake or handbrake is pressed
    assert.equal(
        Controls.shouldApplyAutoGas({ auto: true, screen: false }, fakeEngine),
        true
    );
    keyState.brake = true;
    assert.equal(Controls.shouldApplyAutoGas({ auto: true, screen: false }, fakeEngine), false);
    keyState.brake = false;
    keyState.drift = true;
    assert.equal(Controls.shouldApplyAutoGas({ auto: true, screen: false }, fakeEngine), false);
});

test('Ergonomics 4: Spun-around / reversing car does NOT center steering when braking and turns around cleanly', () => {
    // When car is spun around (heading = 171 deg) and reversing with brake + steer(1),
    // highwaySteer must return raw input (1) instead of centering/inverting to -1!
    const spunCar = new NfsVehiclePhysics({
        carName: 'Subaru Impreza WRX STI',
        physicsKernel: mw,
        heading: Math.PI * 0.95,
        speedKmh: 0
    });

    for (let i = 0; i < 180; i++) {
        const steerCmd = Traffic.highwaySteer(1, spunCar.state);
        assert.equal(steerCmd, 1, 'highwaySteer must not invert or center steering when car is spun around or reversing');
        spunCar.update(1 / 60, { gas: false, brake: true, steer: steerCmd });
    }

    const finalHeadingDeg = Math.abs(spunCar.state.heading * 180 / Math.PI);
    assert.ok(
        finalHeadingDeg < 65,
        `Expected spun car to turn around toward forward (<65 deg), but got stuck at ${finalHeadingDeg.toFixed(1)} deg`
    );
});

test('Ergonomics 5: Anti-Assistant protection & In-App APK download support exist in web and native Android layers', () => {
    assert.equal(typeof OtaSync.APK_DOWNLOAD_URL, 'string', 'OtaSync must export APK_DOWNLOAD_URL');
    assert.ok(OtaSync.APK_DOWNLOAD_URL.includes('releases/latest/download/nomera-bundled-ota.apk'));

    const mainActivity = fs.readFileSync(
        path.join(__dirname, '../android/app/src/main/java/com/h3h/nomera/MainActivity.kt'),
        'utf8'
    );
    assert.ok(
        mainActivity.includes('systemGestureExclusionRects') && mainActivity.includes('isLongClickable = false'),
        'MainActivity must exclude bottom control zones from system Assistant gestures and disable WebView long-click'
    );

    const jsBridge = fs.readFileSync(
        path.join(__dirname, '../android/app/src/main/java/com/h3h/nomera/ui/shell/NomeraJsBridge.kt'),
        'utf8'
    );
    assert.ok(
        jsBridge.includes('fun openExternalUrl('),
        'NomeraJsBridge must expose openExternalUrl for one-tap APK updates'
    );
});

test('Ergonomics 6: Multi-touch Gas+Turn and Brake+Turn consume touchstart/touchmove (passive:false), isolate text spans, and block Android two-finger Assistant hooks', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    const screenControlsJs = fs.readFileSync(path.join(__dirname, '../js/authors-screen-controls.js'), 'utf8');
    const drivingCss = fs.readFileSync(path.join(__dirname, '../authors-driving.css'), 'utf8');
    const expansionCss = fs.readFileSync(path.join(__dirname, '../authors-expansion.css'), 'utf8');
    const motorsportCss = fs.readFileSync(path.join(__dirname, '../authors-motorsport.css'), 'utf8');
    const mainActivity = fs.readFileSync(
        path.join(__dirname, '../android/app/src/main/java/com/h3h/nomera/MainActivity.kt'),
        'utf8'
    );

    // 1. Both app.js and authors-screen-controls.js must consume touchstart & touchmove with { passive: false }
    assert.ok(
        appJs.includes("'touchstart'") && appJs.includes('passive: false'),
        'app.js must bind touchstart with { passive: false } on touch controls so two-finger holds (Gas+Turn / Brake+Turn) are marked CONSUMED in Android WebView'
    );
    assert.ok(
        screenControlsJs.includes('touchstart') && screenControlsJs.includes('passive:false'),
        'authors-screen-controls.js must bind touchstart with { passive: false } to block OEM two-finger Assistant triggers'
    );

    // 2. Inner text spans inside .touch-btn must have pointer-events: none so touches never target text nodes or steal pointer capture
    assert.ok(
        drivingCss.includes('.touch-btn>*{pointer-events:none!important') || drivingCss.includes('.touch-btn *{pointer-events:none!important'),
        'authors-driving.css must disable pointer-events on inner text spans of .touch-btn'
    );

    // 3. Landscape and screen-mode CSS must NOT reset padding back to 4px or 6px at the bottom corners
    assert.ok(
        !expansionCss.includes('race-3d-touch-controls){max-height:110px!important;padding:4px!important'),
        'authors-expansion.css landscape rule must not reset touch-controls padding to 4px!important'
    );
    assert.ok(
        !motorsportCss.includes('padding:6px 8px max(6px,env(safe-area-inset-bottom))!important'),
        'authors-motorsport.css must not reset touch-controls bottom padding to 6px'
    );

    // 4. Native Android WebView must block onProvideVirtualStructure, startActionMode, and performLongClick
    assert.ok(
        mainActivity.includes('onProvideVirtualStructure') &&
        mainActivity.includes('startActionMode') &&
        mainActivity.includes('performLongClick'),
        'MainActivity WebView must override onProvideVirtualStructure, startActionMode, and performLongClick to block OEM two-finger Assistant / Screen Recognition'
    );
});

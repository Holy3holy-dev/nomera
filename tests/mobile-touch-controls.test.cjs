const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./helpers/create-app.cjs');

test('Mobile UX: 1. Touch controls are visible and active on mobile phones, tablets, and touchscreen viewports', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');

    // 1. In index.html, #race-3d-touch-controls is touch-enabled by default for instant activation
    assert.match(html, /<div[^>]*class="[^"]*race-touch-controls[^"]*touch-enabled[^"]*"[^>]*id="race-3d-touch-controls"/,
        '3D touch controls must have touch-enabled class by default in HTML');

    // 2. In index.html, 2D #race-touch-controls is present and active
    assert.ok(html.includes('id="race-touch-controls"'), '2D race-touch-controls must be present');

    // 3. In styles.css, touchscreen / tablet coarse pointer media query guarantees display: flex !important
    assert.match(css, /@media\s*\(\s*pointer:\s*coarse\s*\)[^{]*\{[^}]*#race-3d-touch-controls\s*\{[^}]*display:\s*flex\s*!important/s,
        'styles.css must display 3D touch controls on all coarse pointer / touchscreen devices');

    // 4. In app.js, isTouchOrMobileDevice and syncMobileTouchControlsVisibility are defined
    const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    assert.ok(appJs.includes('function isTouchOrMobileDevice()'), 'app.js must provide isTouchOrMobileDevice detection');
    assert.ok(appJs.includes('function syncMobileTouchControlsVisibility()'), 'app.js must provide syncMobileTouchControlsVisibility');
});

test('Mobile UX: 2. Direct touch / swipe on-canvas steering with immediate visual indicator feedback', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');
    const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

    // 1. Both 2D and 3D containers must have steer feedback indicators in HTML
    assert.ok(html.includes('steer-feedback-indicator steer-left-indicator'), 'Must include left steer feedback indicator in HTML');
    assert.ok(html.includes('steer-feedback-indicator steer-right-indicator'), 'Must include right steer feedback indicator in HTML');

    // 2. styles.css must define .steer-feedback-indicator and active state
    assert.ok(css.includes('.steer-feedback-indicator'), 'styles.css must style .steer-feedback-indicator');
    assert.ok(css.includes('.steer-feedback-indicator.active'), 'styles.css must define active state for steer indicator');
    assert.ok(css.includes('.steer-left-indicator'), 'styles.css must define left neon edge indicator');
    assert.ok(css.includes('.steer-right-indicator'), 'styles.css must define right neon edge indicator');

    // 3. app.js must implement initCanvasDirectTouchSteering
    assert.ok(appJs.includes('function initCanvasDirectTouchSteering()'), 'app.js must define initCanvasDirectTouchSteering');

    // 4. updateTouchBtnUI must toggle active class on indicators
    assert.ok(appJs.includes("el.classList.toggle('active', leftActive)"), 'updateTouchBtnUI must update left indicator');
    assert.ok(appJs.includes("el.classList.toggle('active', rightActive)"), 'updateTouchBtnUI must update right indicator');

    // 5. Functional test in app context: test direct steering via setRaceKey
    const { run } = createApp();
    run(`
        isRaceRunning = true;
        selectedRaceCarName = 'ВАЗ-2107 «Жигули»';
        selectedRaceCarIndex = 0;
        startRaceGame();
    `);

    // Steering left
    run("setRaceKey('left', true)");
    assert.strictEqual(run('raceKeys.left'), true, 'left key must be active');
    assert.strictEqual(run('raceKeys.right'), false, 'right key must be inactive');

    // Steering right
    run("setRaceKey('left', false)");
    run("setRaceKey('right', true)");
    assert.strictEqual(run('raceKeys.left'), false, 'left key must be released');
    assert.strictEqual(run('raceKeys.right'), true, 'right key must be active');

    // Resetting keys clears all
    run('resetRaceKeys()');
    assert.strictEqual(run('raceKeys.left'), false, 'resetRaceKeys must clear left');
    assert.strictEqual(run('raceKeys.right'), false, 'resetRaceKeys must clear right');
});

test('Mobile UX: 3. Ergonomic button layout, min 56px height, high contrast, tactile pressed state and zero sticking', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const css = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');
    const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

    // 1. Min 56px height in styles.css for base .touch-btn and .touch-steer
    assert.match(css, /\.touch-btn\s*\{[^}]*min-height:\s*56px;/s, 'Base .touch-btn must have min-height: 56px');
    assert.match(css, /\.touch-steer\s*\{[^}]*min-height:\s*56px;/s, 'Base .touch-steer must have min-height: 56px');

    // 2. Safe area insets in padding
    assert.ok(css.includes('env(safe-area-inset-bottom)'), 'Must position touch controls above safe-area-inset-bottom');

    // 3. Tactile pressed states with scale and intense glow
    assert.ok(css.includes('.touch-btn:active, .touch-btn.pressed'), 'Must define tactile pressed state for touch buttons');
    assert.ok(css.includes('.touch-steer:active, .touch-steer.pressed'), 'Must define tactile pressed state for steer buttons');
    assert.ok(css.includes('.touch-brake:active, .touch-brake.pressed'), 'Must define tactile pressed state for brake pedal');
    assert.ok(css.includes('.touch-gas:active, .touch-gas.pressed'), 'Must define tactile pressed state for gas pedal');

    // 4. Zero input sticking: all 2D and 3D buttons declare onlostpointercapture, onpointercancel, onpointerleave
    const requiredButtons = [
        'btn-touch-left', 'btn-touch-right', 'btn-touch-brake', 'btn-touch-gas', 'btn-touch-drift', 'btn-touch-nitro', 'btn-touch-horn',
        'btn-3d-touch-left', 'btn-3d-touch-right', 'btn-3d-touch-brake', 'btn-3d-touch-gas', 'btn-3d-touch-drift', 'btn-3d-touch-nitro', 'btn-3d-touch-horn'
    ];

    for (const btnId of requiredButtons) {
        assert.ok(html.includes(`id="${btnId}"`), `HTML must contain button ${btnId}`);
        const regex = new RegExp(`id="${btnId}"[^>]*onlostpointercapture=`);
        assert.match(html, regex, `Button ${btnId} must define onlostpointercapture to prevent sticking`);
    }

    // 5. bindTouchButtons binds lostpointercapture and pointercancel dynamically
    assert.ok(appJs.includes("button.addEventListener('lostpointercapture', onUp);"),
        'bindTouchButtons must attach lostpointercapture listener');
    assert.ok(appJs.includes("button.addEventListener('pointercancel', onUp);"),
        'bindTouchButtons must attach pointercancel listener');
});

test('Mobile UX: 4. Portrait and landscape mobile layouts with non-overlapping action bars', () => {
    const css = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');

    // 1. Portrait media query: absolute bottom positioning above safe-area insets
    assert.match(css, /body\.race-active \.race-touch-controls\s*\{[^}]*position:\s*absolute\s*!important/s,
        'Portrait mobile touch controls must be anchored to bottom');

    // 2. Landscape media query: 56px height on primary driving buttons
    assert.match(css, /body\.race-active \.touch-cluster-steer \.touch-btn\s*\{[^}]*min-height:\s*56px\s*!important/s,
        'Landscape steer buttons must have min-height: 56px');
    assert.match(css, /body\.race-active \.touch-cluster-pedals \.touch-btn\s*\{[^}]*min-height:\s*56px\s*!important/s,
        'Landscape pedal buttons must have min-height: 56px');

    // 3. Landscape 2D action bar supports 4 buttons without clipping
    assert.ok(css.includes('body.race-active #race-touch-controls .touch-actions-bar'),
        'Landscape 2D touch actions bar must have dedicated layout rule');
    assert.ok(css.includes('grid-template-columns: repeat(4, 1fr)'),
        'Landscape 2D touch actions bar must configure 4 columns for 4 buttons');
});

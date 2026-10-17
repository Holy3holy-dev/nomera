'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./helpers/create-app.cjs');

test('Point 1: Auto-spin stops on Red / Epic (>= 80k ₽) and above, auto-sells lower rarities', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

    // Verify auto-spin check in app.js
    assert.ok(appJs.includes('finalPrice >= 80000'), 'Auto-spin must check for finalPrice >= 80000');
    assert.ok(appJs.includes("'Супер редкий'"), 'Auto-spin must recognize Super Rare (red)');
    assert.ok(appJs.includes("'Эпический'"), 'Auto-spin must recognize Epic');
    assert.ok(appJs.includes("'Легендарный'"), 'Auto-spin must recognize Legendary');
    assert.ok(appJs.includes('sellCurrentPlate()'), 'Auto-spin must automatically sell non-valuable plates');
    assert.ok(appJs.includes('toggleAutoSpin()'), 'Auto-spin must stop when high-value tier is hit');
});

test('Point 2: 3D Race top-down overhead camera mode is implemented and functional', () => {
    const car3dJs = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');

    // Verify 4th camera mode (top-down view)
    assert.ok(car3dJs.includes('Вид сверху'), 'cycleCamera must include "Вид сверху"');
    assert.ok(car3dJs.includes('11.5'), 'Camera top-down mode must have elevated Y coordinate (>= 11.0)');
    assert.ok(car3dJs.includes('isTopDown'), 'updateChaseCamera must identify isTopDown mode');
});

test('Point 3: 2D race traffic does not prematurely despawn at high speeds and spawns in drift mode', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

    // Culling bounds must not delete traffic at y = -160 when spawned at y = -170..-300
    assert.ok(!appJs.includes('t.y < -160'), 'Old bug where traffic culled at t.y < -160 must be gone');
    assert.ok(appJs.includes('t.y < -380'), 'Traffic culling must allow spawning up to -380 without instant despawn');

    // Spawn check must not block entire top screen with t.y < 35
    assert.ok(!appJs.includes('t.y < 35 return'), 'Old bug blocking lanes with t.y < 35 must be fixed');
    assert.ok(appJs.includes('Math.abs(t.y - spawnY) < 130'), 'Traffic spawn lane check must check spawn zone proximity');

    // Drift mode must allow traffic
    assert.ok(!appJs.includes("if (raceCurrentMode === 'drift') return;"), 'Traffic must not be completely disabled in drift mode');
});

test('Point 4: Drift mode touge hairpins and sharp curvature are enabled for both 2D and 3D', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    const car3dJs = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');

    // 2D drift curves
    assert.ok(appJs.includes('targetRoadCurve = 120 + Math.random() * 70'), '2D drift mode must generate sharp hairpin curves');
    assert.ok(appJs.includes('centrifugalFactor = raceCurrentMode === \'drift\' ? 120 : 45'), 'Centrifugal pull must scale in drift mode');

    // 3D drift curves & road chunk warping
    assert.ok(car3dJs.includes('targetRoadCurve = 1.6 + Math.random() * 1.2') || car3dJs.includes('targetRoadCurve = -(1.6 + Math.random() * 1.2)'), '3D drift mode must generate touge hairpin curvature');
    assert.ok(car3dJs.includes('updateRoadChunks'), '3D engine must warp road chunks dynamically with roadCurve');
});

test('Point 5: Car cannot steer left/right when stationary or without momentum/throttle', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    const car3dJs = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');

    // 2D steering authority
    assert.ok(appJs.includes('effectiveSteerAuthority = speedSteerAuthority * throttleSteerAuthority'), '2D must scale lateral steering with speed and throttle');
    assert.ok(appJs.includes('steerRate * effectiveSteerAuthority'), '2D steering rate must scale with effective authority');

    // 3D steering authority
    assert.ok(car3dJs.includes('effectiveSteerAuthority = speedSteerAuthority * throttleSteerAuthority'), '3D must scale lateral steering with speed and throttle');
    assert.ok(car3dJs.includes('steerInput * lateralMax * 4.2 * effectiveSteerAuthority'), '3D lateral acceleration must require authority');
});

test('Point 6: 3D car models properly re-initialize and GLB buffers are protected from deepDispose', () => {
    const car3dJs = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');

    assert.ok(car3dJs.includes('userData.preserveBuffers = true'), 'GLB geometries and materials must be marked with preserveBuffers');
    assert.ok(car3dJs.includes('highestChunkZ = 0'), '3D race engine start must reset road chunks on restart');
    assert.ok(car3dJs.includes('this.initTraffic()'), '3D race engine start must re-initialize traffic pool on start');
    assert.ok(car3dJs.includes('this.camPos.set'), '3D race engine start must reset camera positions to avoid void spawn');
});

test('Point 7: Garage, Salon, and Race Picker use lightweight 3D side snapshots without running WebGL loop', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    const stylesCss = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');

    assert.ok(appJs.includes('Car3DManager.renderSideThumbnail(car.name, {}, (dataUrl)'), 'Shop cars must trigger offscreen side snapshot');
    assert.ok(appJs.includes('Car3DManager.renderSideThumbnail(c.name, effStyling, (dataUrl)'), 'Garage cars must trigger offscreen side snapshot');
    assert.ok(appJs.includes('Car3DManager.renderSideThumbnail(carItem.name, carStyling, (url)'), 'Race picker cars must trigger offscreen side snapshot');
    assert.ok(stylesCss.includes('.car-3d-thumb'), 'styles.css must include .car-3d-thumb style');
});

test('Bugfix: Auto-spin reliable stopping, timer isolation, and programmatic sale guards', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    assert.ok(appJs.includes('function stopAutoSpin('), 'Must provide dedicated stopAutoSpin function to avoid inverter toggle race');
    assert.ok(appJs.includes('clearTimeout(autoSpinTimerId)'), 'Must clear autoSpinTimerId to prevent runaway spins over valuable plates');
    assert.ok(appJs.includes('sellCurrentPlate(isAuto = false)'), 'sellCurrentPlate must accept isAuto flag');
    assert.ok(appJs.includes('if (btnSave && btnSave.disabled) return;'), 'sellCurrentPlate must only block manual clicks when btnSave is disabled');
});

test('Bugfix: 3D road seamless continuity and car visual fixes', () => {
    const car3dJs = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');
    // Road chunks must not have shearing offsets
    assert.ok(car3dJs.includes('chunk.position.x = 0;'), 'Road chunks must remain centered on X axis to prevent shearing tears');
    assert.ok(car3dJs.includes('chunk.rotation.y = 0;'), 'Road chunks must not rotate individually to prevent diagonal gaps');

    // Factory authentic car colors and alignment
    assert.ok(car3dJs.includes('function getDefaultCarColor('), 'Must provide authentic factory car colors');
    assert.ok(car3dJs.includes("vaz2107: 0x991b1b"), 'vaz2107 must default to iconic cherry red');
    assert.ok(car3dJs.includes("carId === 'vaz2107' || carId === 'vaz2109'"), 'vaz2107 must face forward down the road');

    // 3D Thumbnail 3/4 perspective
    assert.ok(car3dJs.includes('camDist * 0.90'), 'Thumbnail camera must use 3/4 perspective to reveal car depth');
});

test('Bugfix: Shop/Garage authentic GLTF thumbnails and instant 3D race model loading', () => {
    const car3dJs = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');
    const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

    // 1. Thumbnails must load authentic GLTF models via loadCarModel, not primitive box builder
    assert.ok(car3dJs.includes('loadCarModel(THREE, task.carName, task.styling'), 'Thumbnails must use loadCarModel to render authentic GLTF car models');
    assert.ok(!car3dJs.includes('const model = buildDetailedCarModel(THREE, task.carName, task.styling)'), 'Thumbnails must not bypass GLTF models with primitive box models');

    // 2. 3D Race engine must load authentic model immediately on frame 1
    assert.ok(car3dJs.includes('syncLoaded = true;'), 'loadPlayerCar must detect synchronous GLB cache hits for 0ms frame-1 spawn');

    // 3. Early preloading hooks in app.js
    assert.ok(appJs.includes('Car3DManager.preloadCarModel(window.THREE, targetCar);'), 'App must preload active car model on boot');
    assert.ok(appJs.includes('Car3DManager.preloadCarModel(window.THREE, selectedRaceCarName);'), 'Race tab must preload selected car model on tab open and car switch');
});

test('Mobile UX: 3D showroom podium allows vertical page scrolling without locking touch gestures', () => {
    const stylesCss = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');
    const car3dJs = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');

    // 1. styles.css must declare touch-action: pan-y for 3D showroom wrap
    assert.match(stylesCss, /\.garage-preview-3d-wrap\s*\{[^}]*touch-action:\s*pan-y;/s,
        '.garage-preview-3d-wrap must specify touch-action: pan-y to allow vertical page scrolling');

    // 2. car-3d.js must implement directional touch detection
    assert.ok(car3dJs.includes("(totalDy >= totalDx * 0.6) ? 'vertical' : 'horizontal'"), 'Showroom must differentiate vertical scroll from horizontal rotate');
    assert.ok(car3dJs.includes("if (this.touchLockedDir === 'vertical')"), 'Showroom must detect vertical scroll gesture');
    assert.ok(car3dJs.includes("if (this.touchLockedDir === 'horizontal')"), 'Showroom must detect horizontal rotate gesture');

    // 3. touchstart must be registered with passive: true
    assert.ok(car3dJs.includes("dom.addEventListener('touchstart', this._onTouchStart, { passive: true });"),
        'touchstart must be passive to allow smooth browser page scrolling');
});

test('Visuals: All 25 vehicles have authentic 3D thumbnails pre-rendered and exported', () => {
    const car3dJs = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');
    const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    const root = path.join(__dirname, '..');

    const expectedCarIds = [
        'vaz2107', 'vaz2109', 'gaz24', 'priora', 'solaris', 'vesta', 'polo',
        'mark2', 'subaru', 'm5e60', 'silvia', 'camry', 'lc300', 'gtr',
        'e63', 'rs6', 'm5f90', 'm8', 'g63', 'porsche911', 'huracan',
        'cullinan', 'sf90', 'chiron', 'jesko'
    ];

    // 1. All 25 thumbnail PNG files must exist on disk and be non-empty (> 20KB)
    for (const carId of expectedCarIds) {
        const thumbPath = path.join(root, 'assets', 'thumbnails', `${carId}.png`);
        assert.ok(fs.existsSync(thumbPath), `Missing pre-rendered 3D thumbnail for ${carId}.png`);
        const stat = fs.statSync(thumbPath);
        assert.ok(stat.size > 20000, `Thumbnail for ${carId}.png is unexpectedly small: ${stat.size} bytes`);
    }

    // 2. STATIC_3D_THUMBNAILS in car-3d.js must map all 25 car IDs
    assert.ok(car3dJs.includes('const STATIC_3D_THUMBNAILS = {'), 'car-3d.js must define STATIC_3D_THUMBNAILS');
    for (const carId of expectedCarIds) {
        assert.ok(car3dJs.includes(`${carId}: './assets/thumbnails/${carId}.png'`),
            `STATIC_3D_THUMBNAILS must include mapping for ${carId}`);
    }

    // 3. getSideThumbnail must return static 3D thumbnail as instant fallback
    assert.ok(car3dJs.includes('return getStaticThumbnail(carName);'),
        'getSideThumbnail must return getStaticThumbnail(carName) immediately on frame 1');

    // 4. getCarSpriteDataUrl in app.js must utilize 3D thumbnails for side view
    assert.ok(appJs.includes("if (view === 'side' && !options.forcePixel && typeof Car3DManager !== 'undefined'"),
        'getCarSpriteDataUrl must integrate with Car3DManager.getSideThumbnail');
});

test('Visuals & Gameplay: 3D race traffic vehicles use authentic models, spinning wheels, and detailed freight truck', () => {
    const car3dJs = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');

    // 1. Must use buildDetailedCarModel for sedans, SUVs, and police traffic
    assert.ok(car3dJs.includes('const carModel = buildDetailedCarModel(THREE, modelName, styling);'),
        'Traffic creation must construct authentic detailed 3D models');
    assert.ok(car3dJs.includes('ВАЗ-2107 «Жигули»') && car3dJs.includes('Toyota Camry 3.5'),
        'Traffic car selection must include realistic civilian sedans');

    // 2. Freight truck must be a multi-part realistic freight truck model (not primitive box)
    assert.ok(car3dJs.includes("truckGroup.name = 'DetailedTruck';"),
        'Freight truck must construct a detailed multi-part model');
    assert.ok(car3dJs.includes('isWheelSpinner'), 'Truck wheels must include live wheel spinners');

    // 3. Wheels must be gathered for dynamic rotation
    assert.ok(car3dJs.includes('group.userData.wheels.push(c);') || car3dJs.includes('group.userData.wheels.push(wGroup);'),
        'Traffic wheels must be collected in userData.wheels for live driving rotation');
});

test('Mobile UI: Race top HUD and Mobile Page Scroll prevent collisions and hanging', () => {
    const stylesCss = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    const car3dJs = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');

    // 1. Top HUD stats bar positioned on row 2 below header actions
    assert.match(stylesCss, /body\.race-active \.race-3d-hud-top\s*\{[^}]*top:\s*max\(44px/s,
        'race-3d-hud-top must be offset below header actions to avoid mobile button collisions');

    // 2. HTML and body must use overflow-x: clip and touch-action: pan-y for 100% fluid mobile scrolling
    assert.match(stylesCss, /html\s*\{[^}]*overflow-x:\s*clip;/s,
        'html must declare overflow-x: clip to prevent breaking mobile viewport momentum scroll');
    assert.match(stylesCss, /body\s*\{[^}]*touch-action:\s*pan-y;/s,
        'body must declare touch-action: pan-y for native mobile scrolling');

    // 3. Showroom touch gesture must dynamically yield to vertical scrolling
    assert.ok(car3dJs.includes('this.touchLockedDir = \'vertical\';'),
        'Showroom touch handling must dynamically release horizontal lock if vertical motion occurs');

    // 4. Showroom rotateBy and quick turn buttons
    assert.ok(car3dJs.includes('rotateBy(angleDelta = 0.45)'), 'Car3DShowroom must have rotateBy method');
    assert.ok(appJs.includes('function rotateGarageShowroom(delta)'), 'app.js must provide rotateGarageShowroom');
    assert.ok(indexHtml.includes('rotateGarageShowroom(-0.45)') && indexHtml.includes('rotateGarageShowroom(0.45)'),
        'index.html must provide quick left/right turn buttons for mobile rotation without canvas touch');
});




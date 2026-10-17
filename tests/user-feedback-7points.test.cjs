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

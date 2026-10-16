const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('BUG-04 Garage 3D Stage: index.html contains garage-3d-podium-card with full 3D interactive controls', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

    // Garage 3D container and header
    assert.ok(html.includes('id="garage-3d-podium-card"'), 'index.html must define #garage-3d-podium-card');
    assert.ok(html.includes('id="garage-3d-car-title"'), 'index.html must define #garage-3d-car-title');
    assert.ok(html.includes('id="garage-preview-3d-wrap"'), 'index.html must define #garage-preview-3d-wrap');
    assert.ok(html.includes('id="garage-3d-loader"'), 'index.html must define #garage-3d-loader');

    // Viewpoint buttons
    assert.ok(html.includes('id="btn-gview-3d"'), 'index.html must define 3D view button');
    assert.ok(html.includes('id="btn-gview-front"'), 'index.html must define front view button');
    assert.ok(html.includes('id="btn-gview-side"'), 'index.html must define side view button');
    assert.ok(html.includes('id="btn-gview-rear"'), 'index.html must define rear view button');
    assert.ok(html.includes('id="btn-gview-top"'), 'index.html must define top view button');
    assert.ok(html.includes('id="btn-gview-reset"'), 'index.html must define reset camera button');
    assert.ok(html.includes('id="btn-gview-autorotate"'), 'index.html must define auto-rotate button');

    // Interactive parts toolbar
    assert.ok(html.includes('id="btn-gshow-doors"'), 'index.html must define doors button');
    assert.ok(html.includes('id="btn-gshow-hood"'), 'index.html must define hood button');
    assert.ok(html.includes('id="btn-gshow-trunk"'), 'index.html must define trunk button');
    assert.ok(html.includes('id="btn-gshow-lights"'), 'index.html must define lights button');
});

test('BUG-04 Garage 3D Stage: styles.css contains styles for garage 3D podium and responsive views', () => {
    const css = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');

    assert.ok(css.includes('.garage-3d-podium-card'), 'styles.css must style .garage-3d-podium-card');
    assert.ok(css.includes('.garage-preview-stage'), 'styles.css must style .garage-preview-stage');
    assert.ok(css.includes('.garage-preview-3d-wrap'), 'styles.css must style .garage-preview-3d-wrap');
    assert.ok(css.includes('.active-podium-card'), 'styles.css must style .active-podium-card');
});

test('BUG-04 Garage 3D Stage: app.js defines garage 3D lifecycle and interactive inspection handlers', () => {
    const appCode = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

    assert.ok(appCode.includes('function initGarage3DShowroom('), 'app.js must define initGarage3DShowroom');
    assert.ok(appCode.includes('function selectGarageCarForPodium('), 'app.js must define selectGarageCarForPodium');
    assert.ok(appCode.includes('function setGarageViewMode('), 'app.js must define setGarageViewMode');
    assert.ok(appCode.includes('function resetGarageCamera('), 'app.js must define resetGarageCamera');
    assert.ok(appCode.includes('function toggleGarageAutoRotate('), 'app.js must define toggleGarageAutoRotate');
    assert.ok(appCode.includes('function toggleGarageDoors('), 'app.js must define toggleGarageDoors');
    assert.ok(appCode.includes('function toggleGarageHood('), 'app.js must define toggleGarageHood');
    assert.ok(appCode.includes('function toggleGarageTrunk('), 'app.js must define toggleGarageTrunk');
    assert.ok(appCode.includes('function toggleGarageHeadlights('), 'app.js must define toggleGarageHeadlights');
    assert.ok(appCode.includes('function openStylingForActiveGarageCar('), 'app.js must define openStylingForActiveGarageCar');
    assert.ok(appCode.includes('function start3DRaceWithActiveGarageCar('), 'app.js must define start3DRaceWithActiveGarageCar');
});

test('BUG-01, BUG-02, BUG-03: Performance isolation halts background 3D tasks during races', () => {
    const appCode = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    const car3dCode = fs.readFileSync(path.join(__dirname, '../js/car-3d.js'), 'utf8');

    // Both race start functions stop active showrooms and clear thumbnail queue
    assert.ok(appCode.includes('if (garage3DShowroom) garage3DShowroom.stop();'), 'Race start must stop garage3DShowroom');
    assert.ok(appCode.includes('Car3DManager.clearThumbnailQueue();'), 'Race start must clear background thumbnail queue');

    // car-3d.js exports clearThumbnailQueue and deepDispose
    assert.ok(car3dCode.includes('clearThumbnailQueue,'), 'Car3DManager must export clearThumbnailQueue');
    assert.ok(car3dCode.includes('deepDispose'), 'Car3DManager must export deepDispose');

    // Car3DRacingEngine binds loop once to avoid closure thrashing and disposes scene on destroy
    assert.ok(car3dCode.includes('this._loopBound = this.loop.bind(this);'), 'Car3DRacingEngine must pre-bind loop');
    assert.ok(car3dCode.includes('deepDispose(this.scene);'), 'Car3DRacingEngine.destroy must deepDispose scene');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function setupTestContext() {
    function makeMockElement() {
        return {
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
            addEventListener: (evt, cb) => {
                if (evt === 'load') setTimeout(cb, 1);
            },
            removeEventListener: () => {},
            appendChild: () => {},
            innerHTML: ''
        };
    }
    const domElementMock = makeMockElement();

    global.window = global;
    global.self = global;
    global.addEventListener = () => {};
    global.removeEventListener = () => {};
    global.window.addEventListener = () => {};
    global.window.removeEventListener = () => {};

    global.document = {
        createElement: () => makeMockElement(),
        createElementNS: () => makeMockElement(),
        getElementById: () => domElementMock,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        head: { appendChild: () => {} }
    };
    global.Image = function() { const image=makeMockElement();Object.defineProperty(image,'src',{set(value){if(String(value).startsWith('data:image/webp;')){image.height=1;queueMicrotask(()=>image.onload?.());}}});return image; };
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

test('detectVehicleLightPositions calculates physically calibrated headlight and taillight coordinates', () => {
    const { THREE, Car3DManager } = setupTestContext();

    assert.strictEqual(typeof Car3DManager.detectVehicleLightPositions, 'function');

    // 1. Procedural car test
    const car = Car3DManager.buildDetailedCarModel(THREE, 'Lada Priora', { color: '#ffffff' });
    const lightPos = Car3DManager.detectVehicleLightPositions(car, 'priora', THREE);

    assert.ok(lightPos.hlL, 'Left headlight position must exist');
    assert.ok(lightPos.hlR, 'Right headlight position must exist');
    assert.ok(lightPos.tlL, 'Left taillight position must exist');
    assert.ok(lightPos.tlR, 'Right taillight position must exist');

    // Headlights must be separated horizontally across centerline
    assert.ok(lightPos.hlL.x < -0.2, 'Left headlight must be on driver side (negative X)');
    assert.ok(lightPos.hlR.x > 0.2, 'Right headlight must be on passenger side (positive X)');

    // Headlights must be in front half (positive Z), taillights in rear half (negative Z)
    assert.ok(lightPos.hlL.z > 1.2, 'Headlights must be forward in positive Z');
    assert.ok(lightPos.tlL.z < -1.2, 'Taillights must be rearward in negative Z');

    // Height must be realistic (not scraping ground, not hovering above hood)
    assert.ok(lightPos.hlL.y >= 0.35 && lightPos.hlL.y <= 1.2, 'Headlight height must be realistic (0.35m - 1.2m)');
    assert.ok(lightPos.tlL.y >= 0.35 && lightPos.tlL.y <= 1.2, 'Taillight height must be realistic (0.35m - 1.2m)');
});

test('applyLicensePlateToModel places front and rear plates flush on bumper surface without floating air gap', () => {
    const { THREE, Car3DManager } = setupTestContext();

    // 1. Test procedural car
    const proceduralCar = Car3DManager.buildDetailedCarModel(THREE, 'ВАЗ-2107 «Жигули»', {
        plate: 'А 777 АА | 77 RUS'
    });
    const pBox = new THREE.Box3().setFromObject(proceduralCar);
    const pFP = proceduralCar.getObjectByName('FrontLicensePlate');
    const pRP = proceduralCar.getObjectByName('RearLicensePlate');

    assert.ok(pFP, 'FrontLicensePlate must exist on procedural car');
    assert.ok(pRP, 'RearLicensePlate must exist on procedural car');
    assert.strictEqual(pFP.visible, true);
    assert.strictEqual(pRP.visible, true);

    const pFPBox = new THREE.Box3().setFromObject(pFP);
    const pRPBox = new THREE.Box3().setFromObject(pRP);

    // Front plate must not float ahead of front bumper
    const frontFloatGap = pFPBox.max.z - pBox.max.z;
    assert.ok(Math.abs(frontFloatGap) < 0.05, `Front plate must be flush with bumper (gap: ${frontFloatGap.toFixed(3)}m)`);

    // Rear plate must be securely placed on the rear
    assert.ok(pRPBox.min.z < 0, 'Rear plate must be located at rear of vehicle');

    // 2. Test GLTF mock car root
    const mockRoot = new THREE.Group();
    mockRoot.userData.carId = 'vesta';
    const bodyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.78, 1.45, 4.42),
        new THREE.MeshStandardMaterial()
    );
    mockRoot.add(bodyMesh);

    Car3DManager.applyLicensePlateToModel(THREE, mockRoot, 'Х 777 ХХ | 777 RUS');

    const glbFP = mockRoot.getObjectByName('GLB_FrontLicensePlate');
    const glbRP = mockRoot.getObjectByName('GLB_RearLicensePlate');

    assert.ok(glbFP, 'GLB_FrontLicensePlate must be created');
    assert.ok(glbRP, 'GLB_RearLicensePlate must be created');
    assert.strictEqual(glbFP.visible, true);
    assert.strictEqual(glbRP.visible, true);

    const rootBox = new THREE.Box3().setFromObject(mockRoot);
    const glbFPBox = new THREE.Box3().setFromObject(glbFP);
    const glbRPBox = new THREE.Box3().setFromObject(glbRP);

    // Front plate must sit flush on front face (within 2cm clearance)
    const glbFrontGap = Math.abs(glbFPBox.max.z - rootBox.max.z);
    assert.ok(glbFrontGap <= 0.025, `GLB front plate must sit flush on front surface (gap: ${glbFrontGap.toFixed(3)}m)`);

    // Rear plate must sit flush on rear face (within 2cm clearance)
    const glbRearGap = Math.abs(rootBox.min.z - glbRPBox.min.z);
    assert.ok(glbRearGap <= 0.025, `GLB rear plate must sit flush on rear surface (gap: ${glbRearGap.toFixed(3)}m)`);

    // Height must be realistic (not scraping ground, not high on hood)
    assert.ok(glbFP.position.y >= -0.30 && glbFP.position.y <= 0.30, 'Plate Y must be positioned on bumper');

    // 3. Test hiding plates with 'none'
    Car3DManager.applyLicensePlateToModel(THREE, mockRoot, 'none');
    assert.strictEqual(glbFP.visible, false, 'Front plate must hide when none');
    assert.strictEqual(glbRP.visible, false, 'Rear plate must hide when none');
});

test('Car3DShowroom headlight flares and spotlights align flush with vehicle lenses without hanging in air', () => {
    const { THREE, Car3DManager } = setupTestContext();

    const showroom = new Car3DManager.Car3DShowroom('showroom-container', { autoRotate: false });
    showroom.setCar('Toyota Camry 3.5', { color: '#111111' });

    // Turn headlights ON
    showroom.toggleHeadlights();
    assert.strictEqual(showroom.headlightsOn, true);

    const car = showroom.proceduralCar || showroom.carGroup;
    const box = new THREE.Box3().setFromObject(car);

    // Verify spotlights originate at headlight height and Z (not floating 50cm in front)
    assert.ok(showroom.headlightSpotL, 'Left spotlight must exist');
    assert.ok(showroom.headlightSpotR, 'Right spotlight must exist');
    assert.ok(showroom.headlightSpotL.intensity > 0, 'Spotlight intensity must be > 0 when on');

    const spotZ = showroom.headlightSpotL.position.z;
    assert.ok(spotZ <= box.max.z + 0.05, `Spotlight origin must not float ahead of car (spotZ: ${spotZ.toFixed(2)}, boxMaxZ: ${box.max.z.toFixed(2)})`);
    assert.ok(spotZ >= box.max.z - 0.50, 'Spotlight origin must be positioned on front fascia');

    // Verify optical lens flare discs are flush on the headlight lens
    assert.ok(showroom.headlightFlares, 'Headlight flares must exist');
    assert.strictEqual(showroom.headlightFlares.visible, true);
    assert.ok(showroom.flareMeshL, 'Left flare mesh must exist');

    const flareZ = showroom.flareMeshL.position.z;
    assert.ok(flareZ <= box.max.z + 0.03, `Flare mesh must not float in front of car (flareZ: ${flareZ.toFixed(2)}, boxMaxZ: ${box.max.z.toFixed(2)})`);

    // Verify taillight flares and rear point lights
    assert.ok(showroom.taillightFlares, 'Taillight flares must exist');
    assert.strictEqual(showroom.taillightFlares.visible, true);
    assert.ok(showroom.taillightFlareL, 'Left taillight flare mesh must exist');

    const tailFlareZ = showroom.taillightFlareL.position.z;
    assert.ok(tailFlareZ >= box.min.z - 0.03, `Taillight flare must not float behind car (tailFlareZ: ${tailFlareZ.toFixed(2)}, boxMinZ: ${box.min.z.toFixed(2)})`);

    // Turn headlights OFF: flares must hide and spotlights intensity must drop to 0
    showroom.toggleHeadlights();
    assert.strictEqual(showroom.headlightsOn, false);
    assert.strictEqual(showroom.headlightFlares.visible, false);
    assert.strictEqual(showroom.taillightFlares.visible, false);
    assert.strictEqual(showroom.headlightSpotL.intensity, 0);

    showroom.stop();
});

test('detectVehicleLightPositions correctly splits symmetric combined meshes and aligns with physical lenses on GLB', async () => {
    const { THREE, Car3DManager } = setupTestContext();
    require('../js/vendor/GLTFLoader.js');

    const GLTFLoader = THREE.GLTFLoader;
    const loader = new GLTFLoader().setMeshoptDecoder(require('../js/vendor/meshopt_decoder'));
    const lamboPath = path.join(__dirname, '..', 'assets', 'models', 'lamborghini.glb');
    if (!fs.existsSync(lamboPath)) return;

    const buf = fs.readFileSync(lamboPath);
    await new Promise((resolve, reject) => {
        loader.parse(buf.buffer, '', (gltf) => {
            try {
                const scene = gltf.scene;
                // Strip shadow plane as setupModel does
                const toRemove = [];
                scene.traverse(c => {
                    if (/shadow.*plane|ground.*shadow|floor.*shadow|shadow_plane|obj_shadow/i.test(c.name)) toRemove.push(c);
                });
                toRemove.forEach(c => { if (c.parent) c.parent.remove(c); });

                scene.updateMatrixWorld(true);
                let box = new THREE.Box3().setFromObject(scene);
                let size = box.getSize(new THREE.Vector3());

                if (size.x > size.z * 1.15) {
                    scene.rotation.y = Math.PI / 2;
                    scene.updateMatrixWorld(true);
                    box = new THREE.Box3().setFromObject(scene);
                    size = box.getSize(new THREE.Vector3());
                }

                const sf = 4.50 / size.z;
                scene.scale.setScalar(sf);
                scene.updateMatrixWorld(true);

                const scaledBox = new THREE.Box3().setFromObject(scene);
                const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
                scene.position.x = -scaledCenter.x;
                scene.position.z = -scaledCenter.z;
                scene.position.y = -scaledBox.min.y;
                scene.updateMatrixWorld(true);

                const modelGroup = new THREE.Group();
                modelGroup.add(scene);
                modelGroup.userData.carId = 'huracan';
                modelGroup.updateMatrixWorld(true);

                const lights = Car3DManager.detectVehicleLightPositions(modelGroup, 'huracan', THREE);

                // Headlights must be placed on physical Huracan headlight lenses (~1.81m Z, ~±0.65m X, ~0.57m Y)
                assert.ok(lights.hlL.z > 1.65 && lights.hlL.z < 1.95, `Headlights Z must be on physical lens (~1.81m, got ${lights.hlL.z.toFixed(2)})`);
                assert.ok(Math.abs(lights.hlL.x) > 0.50 && Math.abs(lights.hlL.x) < 0.75, `Headlights X must match Huracan lens width (~±0.65m, got ${lights.hlL.x.toFixed(2)})`);
                assert.ok(lights.hlL.y > 0.45 && lights.hlL.y < 0.70, `Headlights Y must match Huracan lens height (~0.57m, got ${lights.hlL.y.toFixed(2)})`);

                // Taillights must be placed on physical Huracan taillight lenses (~ -2.00m Z, ~±0.65m X, ~0.76m Y)
                assert.ok(lights.tlL.z < -1.85 && lights.tlL.z > -2.15, `Taillights Z must be on physical lens (~ -2.00m, got ${lights.tlL.z.toFixed(2)})`);
                assert.ok(Math.abs(lights.tlL.x) > 0.50 && Math.abs(lights.tlL.x) < 0.75, `Taillights X must match Huracan lens width (~±0.65m, got ${lights.tlL.x.toFixed(2)})`);
                assert.ok(lights.tlL.y > 0.60 && lights.tlL.y < 0.90, `Taillights Y must match Huracan lens height (~0.77m, got ${lights.tlL.y.toFixed(2)})`);

                // Front and Rear plates must sit flush on true bumpers
                Car3DManager.applyLicensePlateToModel(THREE, modelGroup, 'В 606 ОР | 777 RUS');
                const fp = modelGroup.getObjectByName('GLB_FrontLicensePlate');
                const rp = modelGroup.getObjectByName('GLB_RearLicensePlate');

                assert.ok(fp, 'Front plate must exist on GLB');
                assert.ok(rp, 'Rear plate must exist on GLB');
                assert.ok(fp.position.z >= 2.20, `Front plate must be on front bumper tip (~2.25m, got ${fp.position.z.toFixed(2)})`);
                assert.ok(rp.position.z <= -2.20, `Rear plate must be on rear bumper tip (~ -2.25m, got ${rp.position.z.toFixed(2)})`);
                resolve();
            } catch (err) {
                reject(err);
            }
        }, reject);
    });
});

test('Audi RS6, Nissan Silvia, and Lada Vesta face forward (+Z) with headlights & front plate at +Z and taillights & rear plate at -Z', async () => {
    const { THREE, Car3DManager } = setupTestContext();
    const cars = [
        { id: 'vesta', name: 'Lada Vesta Sport', file: 'vesta.glb', length: 4.35 },
        { id: 'silvia', name: 'Nissan Silvia S15', file: 'nissan_370z.glb', length: 4.55 },
        { id: 'rs6', name: 'Audi RS6 Avant', file: 'rs3.glb', length: 4.75 }
    ];

    // 1. Verify procedural models face forward (+Z)
    for (const c of cars) {
        const carModel = Car3DManager.buildDetailedCarModel(THREE, c.name, { plate: 'А 777 АА | 77 RUS' });
        const lights = Car3DManager.detectVehicleLightPositions(carModel, c.id, THREE);

        assert.ok(lights.hlL.z > 1.2, `${c.id} headlights must be at front (+Z), got ${lights.hlL.z}`);
        assert.ok(lights.tlL.z < -1.2, `${c.id} taillights must be at rear (-Z), got ${lights.tlL.z}`);

        const fp = carModel.getObjectByName('FrontLicensePlate') || carModel.getObjectByName('GLB_FrontLicensePlate');
        const rp = carModel.getObjectByName('RearLicensePlate') || carModel.getObjectByName('GLB_RearLicensePlate');

        assert.ok(fp, `${c.id} front license plate must exist`);
        assert.ok(rp, `${c.id} rear license plate must exist`);
        assert.ok(fp.position.z > 1.5, `${c.id} front plate must be on front bumper (+Z), got ${fp.position.z}`);
        assert.ok(rp.position.z < -1.5, `${c.id} rear plate must be on rear bumper (-Z), got ${rp.position.z}`);
    }

    // 2. Verify authentic GLB models with setupModel normalization (vesta & silvia)
    require('../js/vendor/GLTFLoader.js');
    const GLTFLoader = THREE.GLTFLoader;
    const loader = new GLTFLoader().setMeshoptDecoder(require('../js/vendor/meshopt_decoder'));

    for (const c of cars.filter(item => item.file !== 'rs3.glb')) {
        const filePath = path.join(__dirname, '..', 'assets', 'models', c.file);
        if (!fs.existsSync(filePath)) continue;

        const buf = fs.readFileSync(filePath);
        await new Promise((resolve, reject) => {
            loader.parse(buf.buffer, '', (gltf) => {
                try {
                    const scene = gltf.scene;
                    const toRemove = [];
                    scene.traverse(node => {
                        if (/shadow.*plane|ground.*shadow|floor.*shadow|shadow_plane|obj_shadow/i.test(node.name)) {
                            toRemove.push(node);
                        }
                    });
                    toRemove.forEach(node => { if (node.parent) node.parent.remove(node); });

                    scene.updateMatrixWorld(true);
                    let box = new THREE.Box3().setFromObject(scene);
                    let size = box.getSize(new THREE.Vector3());

                    if (size.x > size.z * 1.15) {
                        scene.rotation.y = Math.PI / 2;
                        scene.updateMatrixWorld(true);
                        box = new THREE.Box3().setFromObject(scene);
                        size = box.getSize(new THREE.Vector3());
                    }

                    // 180° rotation alignment for backwards-facing models
                    if (c.id === 'vaz2109' || c.id === 'sf90' || c.id === 'rs6' || c.id === 'silvia' || c.id === 'vesta') {
                        scene.rotation.y += Math.PI;
                        scene.updateMatrixWorld(true);
                        box = new THREE.Box3().setFromObject(scene);
                        size = box.getSize(new THREE.Vector3());
                    }

                    const scaleFactor = c.length / (size.z || 1);
                    scene.scale.setScalar(scaleFactor);
                    scene.updateMatrixWorld(true);

                    const scaledBox = new THREE.Box3().setFromObject(scene);
                    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
                    scene.position.x = -scaledCenter.x;
                    scene.position.z = -scaledCenter.z;
                    scene.position.y = -scaledBox.min.y;

                    const modelGroup = new THREE.Group();
                    modelGroup.userData.carId = c.id;
                    modelGroup.add(scene);
                    modelGroup.updateMatrixWorld(true);

                    Car3DManager.applyStylingToGLTF(THREE, modelGroup, { plate: 'А 777 АА | 77 RUS' }, c.id);

                    const lights = Car3DManager.detectVehicleLightPositions(modelGroup, c.id, THREE);
                    const fp = modelGroup.getObjectByName('GLB_FrontLicensePlate');
                    const rp = modelGroup.getObjectByName('GLB_RearLicensePlate');

                    assert.ok(lights.hlL.z > 1.5, `${c.id} GLB headlights must face forward (+Z), got ${lights.hlL.z.toFixed(2)}`);
                    assert.ok(lights.tlL.z < -1.5, `${c.id} GLB taillights must face rearward (-Z), got ${lights.tlL.z.toFixed(2)}`);
                    assert.ok(fp, `${c.id} GLB front plate must exist`);
                    assert.ok(rp, `${c.id} GLB rear plate must exist`);
                    assert.ok(fp.position.z > 1.8, `${c.id} GLB front plate must be on front bumper (+Z), got ${fp.position.z.toFixed(2)}`);
                    assert.ok(rp.position.z < -1.8, `${c.id} GLB rear plate must be on rear bumper (-Z), got ${rp.position.z.toFixed(2)}`);
                    assert.ok(fp.position.z > rp.position.z + 3.5, `${c.id} Front plate Z must be > rear plate Z`);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            }, reject);
        });
    }
});



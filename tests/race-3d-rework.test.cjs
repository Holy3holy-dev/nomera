const test = require('node:test');
const assert = require('node:assert/strict');

function setupTestContext() {
    global.window = global;
    global.self = global;
    global.document = {
        createElement: () => ({
            getContext: () => ({
                fillRect: () => {},
                clearRect: () => {},
                fillText: () => {},
                strokeRect: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                closePath: () => {},
                fill: () => {},
                stroke: () => {},
                arc: () => {},
                roundRect: () => {},
                drawImage: () => {},
                measureText: () => ({ width: 80 }),
                createRadialGradient: () => ({ addColorStop: () => {} }),
                createLinearGradient: () => ({ addColorStop: () => {} })
            }),
            width: 512,
            height: 512,
            style: {}
        }),
        createElementNS: () => ({ style: {} }),
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    global.navigator = { userAgent: 'NodeTest' };
    global.requestAnimationFrame = () => 1;
    global.cancelAnimationFrame = () => {};

    const THREE = require('../js/vendor/three.min.js');
    THREE.WebGLRenderer = class MockRenderer {
        constructor() {
            this.domElement = global.document.createElement('canvas');
        }
        setPixelRatio() {}
        setSize() {}
        render() {}
        dispose() {}
        forceContextLoss() {}
    };
    global.THREE = THREE;

    delete require.cache[require.resolve('../js/race-effects.js')];
    delete require.cache[require.resolve('../js/car-3d.js')];
    global.RaceEffectsManager = require('../js/race-effects.js');
    const Car3DManager = require('../js/car-3d.js');

    return { THREE, Car3DManager };
}

function collectNodeNames(root) {
    const names = new Set();
    if (!root || typeof root.traverse !== 'function') return names;
    root.traverse(node => {
        if (node && node.name) names.add(node.name);
    });
    return names;
}

test('1. 3D Road & Highway Architecture: reflective cat-eye studs, LED gantries with radar, kilometer/chevron signs, and varied scenery', () => {
    const { Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});

    try {
        engine.start({
            carName: 'ВАЗ-2107 «Жигули»',
            performance: { speed: 200 }
        });

        assert.ok(engine.roadChunks && engine.roadChunks.length >= 6, 'Road chunks must be built');

        const allNames = new Set();
        engine.roadChunks.forEach(chunk => {
            collectNodeNames(chunk).forEach(n => allNames.add(n));
        });

        // Cat's-eye road studs along lane dividers and shoulder edges
        assert.ok(allNames.has('CatsEyeLaneStuds'), 'Must include reflective cat-eye studs along lane dividers');
        assert.ok(allNames.has('CatsEyeShoulderStuds'), 'Must include amber cat-eye studs along shoulder edges');

        // Overhead highway gantries with glowing LED matrix signs & speed radar modules
        assert.ok(allNames.has('HighwayGantry'), 'Must include overhead highway gantry');
        assert.ok(allNames.has('LEDMatrixDisplay'), 'Must include glowing LED matrix sign display on gantry');
        assert.ok(allNames.has('SpeedRadarModule'), 'Must include speed radar camera module on gantry');
        assert.ok(allNames.has('RadarIRFlash'), 'Must include infrared flash lens on speed radar');

        // Roadside kilometer and chevron signs on outer guardrails
        assert.ok(allNames.has('KilometerSign'), 'Must include roadside kilometer signs');
        assert.ok(allNames.has('RoadsideChevronSign'), 'Must include roadside directional chevron signs');

        // Richer roadside scenery variation across chunks (buildings, bridge arches, trees)
        assert.ok(allNames.has('RoadsideBuilding'), 'Must include distant skyline buildings with lit windows');
        assert.ok(allNames.has('HighwayBridgeArch'), 'Must include overhead bridge arch pylons');

        // Chunk recycling
        const initialMaxZ = engine.highestChunkZ;
        engine.state.z = 250;
        engine.updateRoadChunks();
        assert.ok(engine.highestChunkZ > initialMaxZ, 'updateRoadChunks must recycle trailing road chunks ahead of player');
    } finally {
        engine.destroy();
    }
});

test('2. 3D Traffic Models & AI: SUV, Taxi, Ambulance, Kamaz/Truck, Sport, Police, turn-signal blinkers, and brake light brightening', () => {
    const { Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});

    try {
        engine.start({
            carName: 'BMW M5 F90',
            performance: { speed: 240 }
        });

        // Verify all required traffic vehicle types can be created with authentic details
        const suv = engine.createTrafficVehicle('suv');
        const suvNames = collectNodeNames(suv);
        assert.ok(suvNames.has('SUVRoofRack'), 'SUV traffic vehicle must have roof rack');
        assert.ok(suvNames.has('SUVSpareWheelCover'), 'SUV traffic vehicle must have rear spare wheel cover');
        assert.ok(suv.userData.blinkerL && suv.userData.blinkerR, 'SUV must have left and right amber turn-signal blinkers');

        const taxi = engine.createTrafficVehicle('taxi');
        const taxiNames = collectNodeNames(taxi);
        assert.ok(taxiNames.has('TaxiCheckeredStripe'), 'Taxi traffic vehicle must have black-and-white checkered side stripe');
        assert.ok(taxiNames.has('TaxiRoofSign'), 'Taxi traffic vehicle must have glowing orange roof taxi sign');

        const ambulance = engine.createTrafficVehicle('ambulance');
        const ambNames = collectNodeNames(ambulance);
        assert.ok(ambNames.has('DetailedAmbulance'), 'Ambulance traffic vehicle must build Sprinter/van body');
        assert.ok(ambulance.userData.ambulanceRed && ambulance.userData.ambulanceBlue, 'Ambulance must have red and blue emergency beacons');
        assert.ok(ambulance.userData.ambulanceLight, 'Ambulance must have emergency strobe point light');

        const kamaz = engine.createTrafficVehicle('kamaz');
        const kamazNames = collectNodeNames(kamaz);
        assert.ok(kamazNames.has('CabVisor'), 'Kamaz/truck must have cab sun visor');
        assert.ok(kamazNames.has('CabMarkerLights'), 'Kamaz/truck must have amber roof marker lights');
        assert.ok(kamazNames.has('TrailerUnderrunGuards'), 'Kamaz/truck must have trailer side underrun guards');

        const sport = engine.createTrafficVehicle('sport');
        const sportNames = collectNodeNames(sport);
        assert.ok(sportNames.has('SportGTWing'), 'Sport traffic car must have rear GT wing');

        // Verify traffic pool contains diverse vehicle types
        const poolTypes = new Set(engine.trafficCars.map(c => c.userData.type));
        assert.ok(poolTypes.has('suv'), 'Traffic pool must include SUV');
        assert.ok(poolTypes.has('taxi'), 'Traffic pool must include Taxi');
        assert.ok(poolTypes.has('ambulance'), 'Traffic pool must include Ambulance');
        assert.ok(poolTypes.has('police'), 'Traffic pool must include Police');
        assert.ok(poolTypes.has('kamaz') || poolTypes.has('truck'), 'Traffic pool must include Kamaz/Truck');

        // Test turn-signal blinkers during lane change
        const civilian = engine.trafficCars.find(c => c.userData.type === 'taxi' || c.userData.type === 'sedan');
        assert.ok(civilian, 'Must find a civilian car');
        civilian.position.set(-2.125, 0, 80);
        civilian.userData.laneIndex = 2;
        civilian.userData.targetX = 2.125; // changing lane toward +X (right blinker active)
        civilian.userData.changingLane = true;
        civilian.userData.blinkerTimer = 0.01;
        engine.updateTraffic(0.02);

        assert.ok(civilian.userData.blinkerR.material.emissiveIntensity > 1.0, 'Active turn-signal blinker must illuminate during lane change');
        assert.equal(civilian.userData.blinkerL.material.emissiveIntensity, 0, 'Opposite turn-signal blinker must remain off during single-direction lane change');

        // Test brake light brightening when slowing down behind another traffic car
        const leadCar = engine.trafficCars[0];
        const followCar = engine.trafficCars[1];
        leadCar.userData.isWrecked = false;
        followCar.userData.isWrecked = false;
        leadCar.position.set(-2.125, 0, 120);
        leadCar.userData.speed = 70;
        followCar.position.set(-2.125, 0, 110); // 10m behind leadCar in same lane
        followCar.userData.speed = 110;

        engine.updateTraffic(0.05);
        assert.equal(followCar.userData.isBraking, true, 'Following traffic car must brake when approaching slower car ahead');
        assert.ok(followCar.userData.brakeLightMat.emissiveIntensity > 2.0, 'Brake light material emissiveIntensity must brighten when braking');
    } finally {
        engine.destroy();
    }
});

test('3. 3D Weather Effects & Atmosphere: rain lightning flashes, dual-wheel water spray, snow crosswind swirl, and adaptive headlights', () => {
    const { Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});

    try {
        engine.start({
            carName: 'Porsche 911 GT3 RS',
            weather: 'rain',
            performance: { speed: 240 }
        });

        // 1. Rain thunderstorm lightning flash & wet mirror sheen
        assert.equal(engine.currentActiveWeather, 'rain');
        assert.ok(engine.asphaltMat.roughness <= 0.15, 'Rain asphalt must have mirror sheen low roughness');
        const baseAmbientIntensity = engine.ambientLight.intensity;
        const baseSunIntensity = engine.sunLight.intensity;
        engine.triggerLightningFlash();
        assert.ok(engine.lightningFlash > 0.1, 'triggerLightningFlash must set lightningFlash duration');
        assert.ok(engine.ambientLight.intensity > baseAmbientIntensity, 'Lightning flash must temporarily boost ambient light intensity');
        assert.ok(engine.sunLight.intensity > baseSunIntensity, 'Lightning flash must temporarily boost directional sun light intensity');

        // Dual-wheel water spray at high speed in rain
        engine.smokeParticles = [];
        engine.state.speed = 160;
        for (let i = 0; i < 15; i++) {
            engine.updateWeatherParticles(0.05);
        }
        assert.ok(engine.smokeParticles.length >= 2, 'updateWeatherParticles must emit dual-wheel water spray plumes in rain');

        // 2. Snow crosswind swirl and icy surface reflections
        engine.setWeather('snow', true);
        assert.equal(engine.currentActiveWeather, 'snow');
        assert.equal(engine.snowSystem.visible, true);
        const initialSnowWindTime = engine.snowWindTime || 0;
        engine.updateWeatherParticles(0.1);
        assert.ok(engine.snowWindTime > initialSnowWindTime, 'Snow weather must advance swirling crosswind timer');
        assert.ok(engine.curbRedMat.color.getHex() !== 0xdc2626, 'Snow mode must frost road shoulders and curbs');

        // 3. Adaptive headlight intensity across day, fog, sunset, and night
        engine.setWeather('day', true);
        const dayHlIntensity = engine.playerHeadlights[0].intensity;
        engine.setWeather('fog', true);
        const fogHlIntensity = engine.playerHeadlights[0].intensity;
        engine.setWeather('night', true);
        const nightHlIntensity = engine.playerHeadlights[0].intensity;

        assert.ok(nightHlIntensity > dayHlIntensity, `Night headlights (${nightHlIntensity}) must be brighter than daytime headlights (${dayHlIntensity})`);
        assert.ok(fogHlIntensity > dayHlIntensity, `Fog headlights (${fogHlIntensity}) must be brighter than daytime headlights (${dayHlIntensity})`);
    } finally {
        engine.destroy();
    }
});

test('4. 3D Vehicle Physics: weight transfer (pitchAngle/rollAngle), weather-dependent tire grip, and slipstream drafting (>100 km/h)', () => {
    const { Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {});

    try {
        engine.start({
            carName: 'BMW M5 F90',
            weather: 'night',
            performance: { speed: 260, accel: 3.0, handling: 6.0 }
        });
        engine.trafficCars.forEach(c => { c.position.set(-6.375, -999, -500); });

        // 1. Weight transfer pitchAngle and rollAngle sync with playerCar rotation
        engine.state.speed = 90;
        engine.keys.gas = true;
        for (let i = 0; i < 10; i++) engine.update(0.02);
        assert.ok(engine.pitchAngle < 0, `Acceleration must cause rear squat (pitchAngle < 0), got ${engine.pitchAngle}`);
        assert.equal(engine.playerCar.rotation.x, engine.pitchAngle, 'playerCar.rotation.x must reflect pitchAngle');

        engine.keys.gas = false;
        engine.keys.brake = true;
        for (let i = 0; i < 12; i++) engine.update(0.02);
        assert.ok(engine.pitchAngle > 0, `Braking must cause nose dive (pitchAngle > 0), got ${engine.pitchAngle}`);

        engine.keys.brake = false;
        engine.state.speed = 130;
        engine.keys.left = true;
        for (let i = 0; i < 10; i++) engine.update(0.02);
        assert.ok(Math.abs(engine.rollAngle) > 0.01, `Cornering must produce chassis rollAngle, got ${engine.rollAngle}`);

        // 2. Weather-dependent tire grip: dry ('night') vs wet ('rain') vs icy ('snow')
        engine.keys.left = false;
        engine.setWeather('night', true);
        engine.state.vx = 0;
        engine.state.speed = 120;
        engine.keys.right = true;
        engine.update(0.03);
        const dryVx = Math.abs(engine.state.vx);
        const dryGrip = engine.weatherGrip;

        engine.setWeather('snow', true);
        engine.state.vx = 0;
        engine.state.speed = 120;
        engine.keys.right = true;
        engine.update(0.03);
        const snowVx = Math.abs(engine.state.vx);
        const snowGrip = engine.weatherGrip;

        assert.ok(snowGrip < dryGrip, `Snow weatherGrip (${snowGrip}) must be lower than dry grip (${dryGrip})`);
        assert.ok(snowVx < dryVx, `Icy snow cornering stiffness (${snowVx}) must be reduced compared to dry asphalt (${dryVx})`);
        engine.keys.right = false;

        // 3. Slipstream / aerodynamic drafting behind traffic vehicle at > 100 km/h
        engine.setWeather('night', true);
        engine.state.x = 2.125;
        engine.state.z = 100;
        engine.state.speed = 150;
        engine.keys.gas = true;
        engine.update(0.05);
        const cleanAirGain = engine.state.speed - 150;
        assert.equal(engine.isDrafting, false, 'Should not draft in clean air');

        // Place a traffic vehicle 12m ahead in the same lane
        const leadCar = engine.trafficCars[0];
        leadCar.userData.isWrecked = false;
        leadCar.position.set(2.125, 0, 212);
        leadCar.userData.speed = 140;
        engine.state.x = 2.125;
        engine.state.z = 200;
        engine.state.speed = 150;
        engine.keys.gas = true;
        engine.update(0.05);
        const slipstreamGain = engine.state.speed - 150;

        assert.equal(engine.isDrafting, true, 'Must activate slipstream drafting behind same-lane traffic at > 100 km/h');
        assert.ok(engine.slipstreamFactor > 0.3, `slipstreamFactor should be active (> 0.3), got ${engine.slipstreamFactor}`);
        assert.ok(slipstreamGain > cleanAirGain, `Slipstream acceleration gain (${slipstreamGain}) must exceed clean air gain (${cleanAirGain})`);
    } finally {
        engine.destroy();
    }
});

test('5. 3D Collisions & Near-Miss «Шашки»: sideswipe vs rear-end impact differentiation and Near-Miss Shashki combo & popup', () => {
    const { Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };
    const popups = [];
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {
        onPopup: (msg, color) => popups.push({ msg, color })
    });

    try {
        engine.start({
            carName: 'BMW M5 F90',
            performance: { speed: 260, accel: 3.0, handling: 6.0 }
        });

        // Clear all traffic cars away first
        engine.trafficCars.forEach(c => {
            c.position.set(-6.375, 0, -500);
        });

        // 1. Near-Miss («Шашки впритирку») detection at speed >= 120 km/h within dx < 2.15 and dz crossing 0
        const targetCar = engine.trafficCars[0];
        targetCar.userData.type = 'sedan';
        targetCar.userData.isWrecked = false;
        targetCar.userData.nearMissed = false;
        targetCar.userData.overtaken = false;
        targetCar.userData.halfWidth = 0.95;
        targetCar.userData.halfLength = 2.2;
        targetCar.userData.speed = 80;

        engine.state.x = 0;
        engine.state.z = 100;
        engine.state.speed = 160;
        // Position traffic car at dx = 1.85m (< 2.15m near-miss threshold, >= 1.50m collision clearance) and dz crossing 0
        targetCar.position.set(1.85, 0, 99.8);
        targetCar.userData.prevDz = 0.5;

        const cashBefore = engine.earnedCash;
        engine.updateTraffic(0.02);

        assert.equal(engine.nearMissCount, 1, 'nearMissCount must increment on tight high-speed pass');
        assert.equal(engine.shashkiCombo, 1, 'shashkiCombo must increment on tight high-speed pass');
        assert.ok(engine.earnedCash > cashBefore, 'earnedCash must increase with Shashki bonus');
        assert.ok(popups.some(p => p.msg === '⚡ ШАШКА x1!' && p.color === '#38bdf8'), 'Must trigger ⚡ ШАШКА x1! popup with #38bdf8');

        // 2. Differentiated Sideswipe impact: lateral bounce, chassis roll jolt, moderate damage
        const sideCar = engine.trafficCars[1];
        sideCar.userData.type = 'suv';
        sideCar.userData.isWrecked = false;
        sideCar.userData.halfWidth = 1.0;
        sideCar.userData.halfLength = 2.3;
        sideCar.userData.speed = 100;

        engine.state.invulnerableTimer = 0;
        engine.state.damageTaken = 0;
        engine.state.x = 0;
        engine.state.z = 200;
        engine.state.vx = 0;
        engine.state.speed = 115;
        sideCar.position.set(1.2, 0, 199.0); // alongside player

        engine.updateTraffic(0.02);
        const sideswipeDamage = engine.state.damageTaken;
        assert.ok(sideswipeDamage > 0 && sideswipeDamage <= 12, `Sideswipe should inflict moderate damage (got ${sideswipeDamage})`);
        assert.ok(engine.state.vx < 0, 'Sideswipe from right (+X) must bounce player laterally to -X');
        assert.ok(Math.abs(engine.rollAngle) > 0.02, 'Sideswipe must impart a chassis roll jolt');

        // 3. Differentiated Rear-End heavy impact: momentum transfer, cameraShake, hazard lights & swerve
        const rearCar = engine.trafficCars[2];
        rearCar.userData.type = 'taxi';
        rearCar.userData.isWrecked = false;
        rearCar.userData.halfWidth = 0.95;
        rearCar.userData.halfLength = 2.2;
        rearCar.userData.speed = 80;
        rearCar.userData.laneIndex = 2;

        engine.state.invulnerableTimer = 0;
        engine.state.damageTaken = 0;
        engine.state.x = 2.125;
        engine.state.z = 300;
        engine.state.speed = 170;
        rearCar.position.set(2.125, 0, 301.0); // directly ahead of player

        engine.updateTraffic(0.02);
        const rearEndDamage = engine.state.damageTaken;
        assert.ok(rearEndDamage >= 20, `Rear-end heavy impact must inflict higher damage than sideswipe (got ${rearEndDamage})`);
        assert.ok(rearCar.userData.speed > 95, 'Struck traffic car must receive forward momentum transfer and accelerate away');
        assert.ok(rearCar.userData.hazardTimer > 0, 'Struck traffic car must activate flashing hazard lights');
        assert.equal(rearCar.userData.changingLane, true, 'Struck traffic car must swerve into an adjacent lane');
        assert.ok(engine.cameraShake >= 0.8, `Heavy rear-end impact must trigger strong cameraShake, got ${engine.cameraShake}`);
    } finally {
        engine.destroy();
    }
});

test('6. 3D Highway Collectibles (Fuel/Nitro/Cash/Repair), Horn [H] VIP Lane Clearing, and Gantry Speed Radar + Special Plate Immunity', () => {
    const { Car3DManager } = setupTestContext();
    const mockContainer = { clientWidth: 800, clientHeight: 500, style: {}, appendChild: () => {}, removeChild: () => {} };
    const popups = [];
    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, {
        onPopup: (msg, color) => popups.push({ msg, color })
    });

    try {
        engine.start({
            carName: 'BMW M5 F90',
            plate: { text: 'А 777 МР | 97 RUS', isSpecial: true },
            performance: { speed: 260, accel: 3.0, handling: 6.0 }
        });

        // 1. Verify 3D Highway Collectibles exist and picking up Fuel & Repair restores state
        assert.ok(Array.isArray(engine.collectibles) && engine.collectibles.length >= 4, '3D engine must spawn highway collectibles');
        const fuelItem = engine.collectibles.find(c => c.userData.type === 'fuel') || engine.collectibles[0];
        fuelItem.userData.type = 'fuel';
        fuelItem.userData.collected = false;
        fuelItem.position.set(2.125, 0.7, 250);

        engine.state.x = 2.125;
        engine.state.z = 250;
        engine.state.fuel = 40;
        engine.updateCollectibles(0.05);
        assert.ok((fuelItem.userData.pickupCount || 0) >= 1, 'Fuel collectible must record pickup');
        assert.equal(engine.state.fuel, 55, 'Fuel collectible must restore +15L fuel');

        const repairItem = engine.collectibles[1];
        repairItem.userData.type = 'repair';
        repairItem.userData.collected = false;
        repairItem.position.set(2.125, 0.7, 260);
        engine.state.x = 2.125;
        engine.state.z = 260;
        engine.state.damageTaken = 45;
        engine.updateCollectibles(0.05);
        assert.ok((repairItem.userData.pickupCount || 0) >= 1, 'Repair collectible must record pickup');
        assert.equal(engine.state.damageTaken, 20, 'Repair collectible must repair 25% hull damage');

        // 2. Horn [H] / SGU VIP Lane Clearing: civilian car ahead yields to adjacent lane
        const yieldCar = engine.trafficCars.find(c => c.userData.type !== 'police');
        yieldCar.userData.isWrecked = false;
        yieldCar.userData.changingLane = false;
        yieldCar.userData.yieldedToHorn = false;
        yieldCar.userData.laneIndex = 2;
        yieldCar.position.set(2.125, 0, 320);

        engine.state.x = 2.125;
        engine.state.z = 300; // 20m behind yieldCar in same lane
        engine.state.speed = 150;
        engine.keys.horn = true;
        engine.updateTraffic(0.05);
        engine.keys.horn = false;

        assert.equal(yieldCar.userData.yieldedToHorn, true, 'Civilian traffic car ahead must yield when player presses Horn [H]');
        assert.equal(yieldCar.userData.changingLane, true, 'Yielding traffic car must initiate lane change out of player lane');

        // 3. 3D Gantry Speed Radar: Special Plate (АМР) gets VIP immunity + 2000 ₽, regular plate gets +1 Wanted Star
        assert.equal(engine.hasSpecialPlateImmunity(), true, 'А 777 МР plate must grant special plate immunity');
        const gantryChunk = engine.roadChunks.find(ch => ch.userData && ch.userData.hasGantry);
        assert.ok(gantryChunk, 'Must have at least one HighwayGantry chunk');
        gantryChunk.position.z = 400; // Gantry at world z = 400 + 20 = 420
        gantryChunk.userData.radarTriggered = false;

        const cashBeforeRadar = engine.earnedCash;
        engine.state.z = 420;
        engine.state.speed = 210; // > 160 km/h
        engine.state.wantedLevel = 0;
        engine.updateRoadChunks();

        assert.equal(gantryChunk.userData.radarTriggered, true, 'Gantry radar must trigger when player passes under it at > 160 km/h');
        assert.equal(engine.state.wantedLevel, 0, 'Special plate АМР must be immune to gantry speed radar wanted level');
        assert.ok(engine.earnedCash >= cashBeforeRadar + 2000, 'Special plate АМР must receive +2000 ₽ immunity bonus under radar gantry');

        // Regular plate check
        engine.config.plate = { text: 'В 123 СМ | 77 RUS', isSpecial: false };
        engine.hasSgu = false;
        assert.equal(engine.hasSpecialPlateImmunity(), false, 'Regular plate without SGU must not have radar immunity');
        gantryChunk.position.z = 500; // Gantry at world z = 520
        gantryChunk.userData.radarTriggered = false;
        engine.state.z = 520;
        engine.state.speed = 205;
        engine.updateRoadChunks();

        assert.equal(gantryChunk.userData.radarTriggered, true, 'Gantry radar must trigger for regular plate');
        assert.equal(engine.state.wantedLevel, 1, 'Regular plate exceeding 160 km/h under 3D gantry radar must receive +1 Wanted Star');
    } finally {
        engine.destroy();
    }
});


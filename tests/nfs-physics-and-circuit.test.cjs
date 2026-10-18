const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const NfsPhysics = require('../js/nfs-physics.js');
const NfsCircuit = require('../js/nfs-circuit-race.js');
const RaceEconomy = require('../js/race-economy.js');

const {
    NfsVehiclePhysics,
    buildVehicleSpec,
    detectDrivetrain,
    computeSteeringLimitRad,
    tireLateralForce,
    sampleTorqueCurve,
    computeWeatherGripMultiplier
} = NfsPhysics;

const {
    TRACK_PRESETS,
    AI_RIVAL_ROSTER,
    buildCircuitTrack,
    projectPointToTrack,
    NomeraCircuitRaceEngine
} = NfsCircuit;

test('1. Разгон с нуля при нажатии газа и покой без газа', () => {
    const car = new NfsVehiclePhysics({
        carName: 'BMW M5 F90',
        performance: { speed: 305, accel: 4.5, handling: 8.5, nitroCapacity: 100 }
    });

    // Без газа автомобиль стоит на месте и не ускоряется сам
    for (let i = 0; i < 60; i++) {
        car.step({ gas: false, brake: false, left: false, right: false, handbrake: false, nitro: false }, 1 / 60);
    }
    assert.equal(car.speedKmh, 0, 'Машина без нажатия газа должна оставаться на 0 км/ч');

    // С нажатым газом машина плавно разгоняется с места и переключает передачи вверх
    for (let i = 0; i < 180; i++) {
        car.step({ gas: true, brake: false, left: false, right: false, handbrake: false, nitro: false }, 1 / 60);
    }
    assert.ok(car.speedKmh > 95, `Ожидался разгон свыше 95 км/ч за 3с, получено ${car.speedKmh.toFixed(1)}`);
    assert.ok(car.gear >= 2, `Ожидалось автоматическое переключение на 2+ передачу, получено ${car.gear}`);
    assert.ok(car.z > 40, 'Машина должна продвинуться вперёд в мировых координатах');
    assert.ok(car.pitchAngle > 0, 'При разгоне нос кузова должен слегка приподниматься (weight transfer)');
});

test('2. Торможение до полной остановки и переход на задний ход (R)', () => {
    const car = new NfsVehiclePhysics({
        carName: 'Porsche 911 GT3 RS',
        performance: { speed: 315, accel: 4.8, handling: 9.2 }
    });

    // Разгоняем до ~120 км/ч
    for (let i = 0; i < 150; i++) {
        car.step({ gas: true }, 1 / 60);
    }
    assert.ok(car.forwardSpeedKmh > 80);

    // Зажимаем тормоз (S) — сначала машина тормозит до 0, затем включает заднюю передачу (gear = -1)
    let hitZero = false;
    for (let i = 0; i < 300; i++) {
        car.step({ gas: false, brake: true }, 1 / 60);
        if (Math.abs(car.forwardSpeedKmh) < 2) hitZero = true;
    }
    assert.ok(hitZero, 'Автомобиль должен пройти через полную остановку перед включением заднего хода');
    assert.equal(car.gear, -1, 'После остановки при удержании тормоза должна включиться задняя передача (R = -1)');
    assert.ok(car.forwardSpeedKmh < -10, `Автомобиль должен ехать назад, forwardSpeedKmh=${car.forwardSpeedKmh.toFixed(1)}`);
});

test('3. Ограничение максимальной скорости (отсутствие бесконечного разгона)', () => {
    const maxCfgSpeed = 240;
    const car = new NfsVehiclePhysics({
        carName: 'Toyota Camry 3.5',
        performance: { speed: maxCfgSpeed, accel: 3.4, handling: 7.5 }
    });

    // 25 секунд полного газа по прямой
    for (let i = 0; i < 25 * 60; i++) {
        car.step({ gas: true }, 1 / 60);
    }
    assert.ok(car.speedKmh <= maxCfgSpeed + 2, `Скорость без нитро (${car.speedKmh.toFixed(1)}) не должна превышать лимит ${maxCfgSpeed} км/ч`);
    assert.ok(car.speedKmh >= maxCfgSpeed * 0.88, `Машина должна выходить близко к своей максималке (${car.speedKmh.toFixed(1)} км/ч)`);
});

test('4. Поворот на малой и высокой скорости + запрет руления на месте', () => {
    const spec = buildVehicleSpec({ carName: 'BMW M5 F90', performance: { speed: 300, accel: 4.2, handling: 8.5 } });

    const lowSpeedSteer = computeSteeringLimitRad(20, spec);
    const highSpeedSteer = computeSteeringLimitRad(260, spec);
    assert.ok(lowSpeedSteer > highSpeedSteer * 2.2, 'На малой скорости максимальный угол поворота колёс должен быть значительно больше, чем на 260 км/ч');

    // Проверка запрета вращения на месте при 0 км/ч
    const stationaryCar = new NfsVehiclePhysics({ carName: 'BMW M5 F90' });
    for (let i = 0; i < 60; i++) {
        stationaryCar.step({ gas: false, left: true }, 1 / 60);
    }
    assert.equal(stationaryCar.heading, 0, 'Стоящая на месте машина не должна поворачивать кузов без движения');
    assert.equal(stationaryCar.x, 0, 'Стоящая на месте машина не должна смещаться по X');

    // Поворот в движении меняет курс (heading) и траекторию в 2D плоскости (X, Z)
    const movingCar = new NfsVehiclePhysics({ carName: 'BMW M5 F90' });
    for (let i = 0; i < 90; i++) movingCar.step({ gas: true }, 1 / 60);
    for (let i = 0; i < 90; i++) movingCar.step({ gas: true, right: true }, 1 / 60);
    assert.ok(movingCar.heading > 0.25, `Курс автомобиля должен повернуться вправо, heading=${movingCar.heading.toFixed(3)}`);
    assert.ok(movingCar.x > 5, `Автомобиль должен сместиться по новой траектории X=${movingCar.x.toFixed(2)}`);
});

test('5. Ручной тормоз, вход в управляемый дрифт (D_ENTER/D_IN) и контрруление', () => {
    const car = new NfsVehiclePhysics({
        carName: 'Nissan Skyline GT-R R34',
        performance: { speed: 295, accel: 4.3, handling: 8.6 }
    });

    // Разгон до ~130 км/ч
    for (let i = 0; i < 160; i++) {
        car.step({ gas: true }, 1 / 60);
    }

    // Инициация заноса ручником и поворотом влево
    for (let i = 0; i < 45; i++) {
        car.step({ gas: true, left: true, handbrake: true }, 1 / 60);
    }
    assert.ok(car.isDrifting || car.driftAngleDeg >= 10, `Машина должна войти в занос (driftAngle=${car.driftAngleDeg.toFixed(1)}°, state=${car.driftState})`);

    // Контрруление в противоположную сторону заноса
    const slipSign = Math.sign(car.lateralSpeedMs || car.yawRate);
    const counterInput = slipSign >= 0
        ? { gas: true, left: true, right: false, handbrake: false }
        : { gas: true, left: false, right: true, handbrake: false };

    let sawCounterSteer = false;
    for (let i = 0; i < 60; i++) {
        car.step(counterInput, 1 / 60);
        if (car.isCounterSteering) sawCounterSteer = true;
    }
    assert.ok(sawCounterSteer || car.driftScore > 0, 'Должно фиксироваться контрруление и начисление очков дрифта');

    // Стабилизация на прямой после отпускания руля
    for (let i = 0; i < 150; i++) {
        car.step({ gas: true, left: false, right: false, handbrake: false }, 1 / 60);
    }
    assert.equal(car.driftState, 'D_OUT', 'После выравнивания руля автомобиль должен стабилизироваться и выйти из дрифта');
});

test('6. Различия приводов FWD, RWD и AWD', () => {
    assert.equal(detectDrivetrain('Lada Priora'), 'FWD');
    assert.equal(detectDrivetrain('ВАЗ-2107 «Жигули»'), 'RWD');
    assert.equal(detectDrivetrain('Lamborghini Huracan'), 'AWD');

    const fwdCar = new NfsVehiclePhysics({ carName: 'Lada Priora', drivetrain: 'FWD', performance: { speed: 260, accel: 3.8, handling: 8.0 } });
    const rwdCar = new NfsVehiclePhysics({ carName: 'ВАЗ-2107 «Жигули»', drivetrain: 'RWD', performance: { speed: 260, accel: 3.8, handling: 8.0 } });
    const awdCar = new NfsVehiclePhysics({ carName: 'Audi RS6 Avant', drivetrain: 'AWD', performance: { speed: 260, accel: 3.8, handling: 8.0 } });

    assert.equal(fwdCar.spec.drivetrain, 'FWD');
    assert.equal(rwdCar.spec.drivetrain, 'RWD');
    assert.equal(awdCar.spec.drivetrain, 'AWD');

    // Разгон в крутом повороте с ручником: RWD развивает больший угол заноса, чем FWD
    for (let i = 0; i < 120; i++) {
        fwdCar.step({ gas: true }, 1 / 60);
        rwdCar.step({ gas: true }, 1 / 60);
        awdCar.step({ gas: true }, 1 / 60);
    }
    let maxRwdDrift = 0;
    let maxFwdDrift = 0;
    for (let i = 0; i < 70; i++) {
        fwdCar.step({ gas: true, left: true, handbrake: i < 20 }, 1 / 60);
        rwdCar.step({ gas: true, left: true, handbrake: i < 20 }, 1 / 60);
        awdCar.step({ gas: true, left: true, handbrake: i < 20 }, 1 / 60);
        maxRwdDrift = Math.max(maxRwdDrift, rwdCar.driftAngleDeg);
        maxFwdDrift = Math.max(maxFwdDrift, fwdCar.driftAngleDeg);
    }
    assert.ok(maxRwdDrift > maxFwdDrift, `RWD должен охотнее уходить в силовой занос (${maxRwdDrift.toFixed(1)}°), чем FWD (${maxFwdDrift.toFixed(1)}°)`);
});

test('7. Влияние апгрейдов гаража (двигатель, подвеска, нитро) на физику', () => {
    const baseStats = { speed: 220, accel: 2.8, handling: 6.5, consumption: 9.0 };
    const stockPerf = RaceEconomy.performance(baseStats, {
        condition: 100,
        upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 }
    });
    const tunedPerf = RaceEconomy.performance(baseStats, {
        condition: 100,
        upgrades: { engine: 5, handling: 5, economy: 5, nitro: 5 }
    });

    const stockCar = new NfsVehiclePhysics({ carName: 'BMW M5 F90', performance: stockPerf });
    const tunedCar = new NfsVehiclePhysics({ carName: 'BMW M5 F90', performance: tunedPerf });

    assert.ok(tunedCar.spec.maxSpeedKmh > stockCar.spec.maxSpeedKmh, 'Тюнинг двигателя должен повышать максимальную скорость');
    assert.ok(tunedCar.spec.peakEngineForce > stockCar.spec.peakEngineForce, 'Тюнинг двигателя должен повышать пиковую тягу');
    assert.ok(tunedCar.spec.frontCorneringStiffness > stockCar.spec.frontCorneringStiffness, 'Тюнинг подвески должен повышать угловую жёсткость шин');

    for (let i = 0; i < 240; i++) {
        stockCar.step({ gas: true, nitro: true }, 1 / 60);
        tunedCar.step({ gas: true, nitro: true }, 1 / 60);
    }
    assert.ok(tunedCar.speedKmh > stockCar.speedKmh + 15, `Прокачанная машина (${tunedCar.speedKmh.toFixed(1)}) должна разгоняться быстрее стоковой (${stockCar.speedKmh.toFixed(1)})`);
});

test('8. Независимость физики от FPS (30, 60, 120 FPS через фиксированный sub-stepping)', () => {
    const runAtFps = (fps) => {
        const car = new NfsVehiclePhysics({
            carName: 'BMW M5 F90',
            performance: { speed: 290, accel: 4.0, handling: 8.2 }
        });
        const totalSec = 3.0;
        const frames = Math.round(totalSec * fps);
        const dt = 1 / fps;
        for (let i = 0; i < frames; i++) {
            const steerRight = i >= Math.floor(frames * 0.4);
            car.update({ gas: true, right: steerRight }, dt);
        }
        return car;
    };

    const car30 = runAtFps(30);
    const car60 = runAtFps(60);
    const car120 = runAtFps(120);

    assert.ok(Math.abs(car30.speedKmh - car120.speedKmh) < 1.5, `Разница скорости между 30 и 120 FPS должна быть минимальной: ${car30.speedKmh.toFixed(2)} vs ${car120.speedKmh.toFixed(2)}`);
    assert.ok(Math.abs(car60.speedKmh - car120.speedKmh) < 1.0, `Разница скорости между 60 и 120 FPS: ${car60.speedKmh.toFixed(2)} vs ${car120.speedKmh.toFixed(2)}`);
    assert.ok(Math.abs(car30.distanceKm - car120.distanceKm) < 0.005, 'Пройденная дистанция на 30 и 120 FPS должна совпадать');
    assert.ok(Math.abs(car30.heading - car120.heading) < 0.03, 'Угол поворота на 30 и 120 FPS должен совпадать');
});

test('9. Погодные условия и покрытия (асфальт, дождь, снег, обочина)', () => {
    const dryGrip = computeWeatherGripMultiplier('day', 'asphalt');
    const rainGrip = computeWeatherGripMultiplier('rain', 'asphalt');
    const snowGrip = computeWeatherGripMultiplier('snow', 'asphalt');
    const shoulderGrip = computeWeatherGripMultiplier('day', 'shoulder');

    assert.equal(dryGrip, 1.0);
    assert.ok(rainGrip < dryGrip && rainGrip > snowGrip, 'В дождь сцепление ниже сухого асфальта, но выше гололёда');
    assert.ok(snowGrip < 0.80, 'В снег сцепление должно заметно снижаться');
    assert.ok(shoulderGrip < dryGrip, 'На обочине сцепление ниже, чем на асфальте');
});

test('10. Столкновения со стенами и автомобилями соперников без застревания', () => {
    const carA = new NfsVehiclePhysics({ carName: 'BMW M5 F90' });
    const carB = new NfsVehiclePhysics({ carName: 'Porsche 911 GT3 RS' });

    carA.reset({ x: 0, z: 0, heading: 0, speedKmh: 160 });
    carA.vx = 12; // скользит в правую стену

    // Удар о правый отбойник (нормаль направлена влево: -1, 0)
    const wallImpact = carA.resolveWallCollision(-1, 0, 0.8);
    assert.ok(wallImpact > 0, 'Должен быть зафиксирован импульс удара о стену');
    assert.ok(carA.x < 0, 'Машина должна быть вытолкнута внутрь трассы из стены');
    assert.ok(carA.vx <= 0, 'Нормальная компонента скорости в стену должна быть погашена');
    assert.ok(carA.speedKmh > 80, 'Машина должна продолжать скользить вдоль стены без полной блокировки');

    // Столкновение двух машин
    carA.reset({ x: 0, z: 0, heading: 0, speedKmh: 150 });
    carB.reset({ x: 0.9, z: -1.5, heading: 0, speedKmh: 100 });
    const collided = carA.resolveVehicleCollision(carB);
    assert.equal(collided, true, 'Должно сработать физическое столкновение двух машин');
    const distAfter = Math.hypot(carB.x - carA.x, carB.z - carA.z);
    assert.ok(distAfter > 1.8, 'После столкновения коллайдеры машин должны быть раздвинуты');
});

test('11. Замкнутая сплайн-трасса, чекпоинты и подсчёт кругов', () => {
    for (const presetId of Object.keys(TRACK_PRESETS)) {
        const track = buildCircuitTrack(presetId);
        assert.ok(track.totalLength >= 900, `Трасса ${presetId} должна иметь длину >= 900м (получено ${track.totalLength.toFixed(1)}м)`);
        assert.equal(track.checkpoints.length, 6, `На трассе ${presetId} должно быть 6 чекпоинтов`);

        // Проекция точки на полотно и за пределы стены
        const sample0 = track.samples[0];
        const onRoad = projectPointToTrack(track, sample0.x, sample0.z, 0);
        assert.equal(onRoad.surface, 'asphalt');
        assert.equal(onRoad.wallPenetration, 0);

        const outsideWall = projectPointToTrack(track, sample0.x + sample0.nx * (sample0.halfWidth + 2.5), sample0.z + sample0.nz * (sample0.halfWidth + 2.5), 0);
        assert.ok(outsideWall.wallPenetration > 1.5, 'При выходе за ширину трассы должно определяться проникновение в отбойник');
    }
});

test('12. ИИ-соперники проходят замкнутую трассу и круги засчитываются без WebGL', () => {
    let finishCalled = false;
    let lastHud = null;

    const engine = new NomeraCircuitRaceEngine(null, {
        trackId: 'rockport_ring',
        difficulty: 'medium',
        totalLaps: 1,
        rivalCount: 3,
        skipCountdown: true,
        onUpdateHUD: (hud) => { lastHud = hud; },
        onGameOver: (reason) => { if (reason === false || reason === 'finished') finishCalled = true; }
    });

    engine.start({
        carName: 'BMW M5 F90',
        performance: { speed: 310, accel: 4.5, handling: 8.8, tankCapacity: 60 },
        weather: 'night',
        skipCountdown: true
    });

    assert.equal(engine.rivals.length, 3, 'Должны быть созданы 3 ИИ-соперника');
    assert.ok(AI_RIVAL_ROSTER.length >= 4, 'Ростер соперников Чёрного списка должен содержать минимум 4 гонщиков');

    // Симулируем 10 секунд гонки: ИИ-соперники и игрок под управлением автопилота едут по трассе
    for (let step = 0; step < 600; step++) {
        const proj = engine.playerTrackProj;
        const desiredHeading = Math.atan2(proj.tx, proj.tz);
        let diff = desiredHeading - engine.playerPhysics.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        engine.setKey('gas', true);
        engine.setKey('left', diff < -0.04);
        engine.setKey('right', diff > 0.04);
        engine.stepSimulation(1 / 60);
    }

    assert.ok(engine.playerPhysics.distanceKm > 0.25, `Игрок должен проехать по трассе > 250м (проехал ${(engine.playerPhysics.distanceKm * 1000).toFixed(0)}м)`);
    for (const rival of engine.rivals) {
        const rName = rival.template ? rival.template.driverName : rival.id;
        assert.ok(rival.physics.distanceKm > 0.20, `ИИ-соперник ${rName} должен самостоятельно ехать вперёд по трассе (проехал ${(rival.physics.distanceKm * 1000).toFixed(0)}м)`);
        assert.ok(rival.physics.speedKmh > 40, `ИИ-соперник ${rName} не должен застревать в стенах`);
    }
    assert.ok(lastHud && lastHud.position >= 1 && lastHud.position <= 4, 'HUD должен передавать текущую позицию в гонке (1..4)');

    // Проверяем работу Speedbreaker
    const sbActivated = engine.toggleSpeedbreaker();
    assert.equal(sbActivated, true, 'Speedbreaker должен активироваться при заряде >= 25%');
    assert.equal(engine.speedbreakerActive, true);

    // Проверяем закрытие всех промежуточных чекпоинтов и засчитывание круга на финише (checkpoint 0)
    engine.playerProgress.checkpointsPassed = engine.track.checkpoints.length - 1;
    engine.playerProgress.nextCheckpoint = 0;
    const startCp = engine.track.checkpoints[0];
    engine.playerPhysics.x = startCp.x;
    engine.playerPhysics.z = startCp.z;
    engine.stepSimulation(1 / 60);

    assert.equal(engine.finished, true, 'При пересечении линии старт/финиш со всеми чекпоинтами гонка должна завершаться победой/финишем');
    assert.equal(finishCalled, true, 'Должен вызываться колбэк onGameOver при финише');

    engine.destroy();
    assert.equal(engine.isRunning, false, 'После destroy() движок должен быть остановлен');
});

test('13. Интеграция режима 3D Круг (NFS MW) во все точки входа UI (index.html и js/app.js)', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

    assert.ok(html.includes('id="nav-tab-nfs-race"'), 'В верхней панели навигации должна быть вкладка #nav-tab-nfs-race (3D NFS Кольцо)');
    assert.ok(html.includes('id="nfs-quickstart-hero"'), 'В меню гонок должен быть баннер быстрого старта новых трасс NFS MW (#nfs-quickstart-hero)');
    assert.ok(html.includes('id="btn-garage-podium-nfs-race"'), 'На 3D-подиуме гаража должна быть кнопка быстрого старта в 3D Кольцо NFS');
    assert.ok(html.includes('id="btn-switch-nfs-3d"'), 'В 3D HUD должна быть кнопка переключения в Кольцо NFS / смены трассы');
    assert.ok(html.includes('id="btn-race-mode-nfs"'), 'В index.html должна быть вкладка режима 3D Круг (NFS)');
    assert.ok(html.includes('id="btn-mode-nfs-circuit"'), 'В index.html должна быть кнопка выбора режима 3D Круг (NFS MW)');
    assert.ok(html.includes('id="nfs-circuit-settings-card"'), 'В index.html должна быть карточка выбора трассы и сложности ИИ');
    assert.ok(html.includes('./js/nfs-physics.js'), 'В index.html должен быть подключён скрипт nfs-physics.js');
    assert.ok(html.includes('./js/nfs-circuit-race.js'), 'В index.html должен быть подключён скрипт nfs-circuit-race.js');

    assert.ok(appJs.includes('NomeraCircuitRace.NomeraCircuitRaceEngine'), 'В js/app.js должен создаваться экземпляр NomeraCircuitRaceEngine для режима NFS');
    assert.ok(appJs.includes('function setNfsCircuitTrack('), 'В js/app.js должна быть функция выбора трассы setNfsCircuitTrack');
    assert.ok(appJs.includes('function setNfsCircuitDifficulty('), 'В js/app.js должна быть функция выбора сложности setNfsCircuitDifficulty');
    assert.ok(appJs.includes('function quickStartNfsCircuit('), 'В js/app.js должна быть функция быстрого запуска трассы quickStartNfsCircuit');
    assert.ok(appJs.includes('function startNfsRaceWithCar('), 'В js/app.js должна быть функция запуска NFS гонки с карточки машины в гараже');
    assert.ok(appJs.includes('function startNfsRaceWithActiveGarageCar('), 'В js/app.js должна быть функция запуска NFS гонки с 3D-подиума гаража');
    assert.ok(appJs.includes('function toggle3DSpeedbreaker('), 'В js/app.js должна быть функция активации Speedbreaker');
});

test('14. Изоляция миникарты (.nfs-minimap-canvas) от растягивания на весь экран и подключение 3D GLB моделей + студийного освещения', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
    const circuitJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'nfs-circuit-race.js'), 'utf8');

    assert.ok(
        css.includes('.race-3d-canvas-container > canvas:not(.nfs-minimap-canvas)'),
        'Правило 100% размера canvas в styles.css не должно растягивать .nfs-minimap-canvas на весь экран'
    );
    assert.ok(
        css.includes('.nfs-minimap-canvas'),
        'В styles.css должны быть заданы явные размеры .nfs-minimap-canvas'
    );
    assert.ok(
        circuitJs.includes("mapCanvas.className = 'nfs-minimap-canvas'"),
        'Миникарта в nfs-circuit-race.js должна иметь класс nfs-minimap-canvas'
    );
    assert.ok(
        circuitJs.includes('c3d.loadCarModel(THREE, carName, styling'),
        'NomeraCircuitRaceEngine должен подгружать детализированные 3D GLB-модели машин через Car3DManager.loadCarModel'
    );
    assert.ok(
        circuitJs.includes('c3d.createStudioEnvironment(THREE)'),
        'NomeraCircuitRaceEngine должен устанавливать scene.environment через createStudioEnvironment для корректного отражения краски кузова'
    );
});

test('15. Интеграция физики и механик NFS Most Wanted (Speedbreaker, Blacklist-соперники, 3-2-1 Старт, круги и подиум) в основной движок Car3DRacingEngine (js/car-3d.js)', () => {
    const car3dJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'car-3d.js'), 'utf8');

    assert.ok(car3dJs.includes('initNfsRivals('), 'В Car3DRacingEngine должен быть метод инициализации соперников Чёрного списка initNfsRivals');
    assert.ok(car3dJs.includes('updateNfsRivals('), 'В Car3DRacingEngine должен быть метод обновления ИИ-соперников updateNfsRivals');
    assert.ok(car3dJs.includes('initNfsCheckpointGate('), 'В Car3DRacingEngine должен быть метод 3D-арки чекпоинта initNfsCheckpointGate');
    assert.ok(car3dJs.includes('updateNfsCircuitProgress('), 'В Car3DRacingEngine должен быть метод подсчёта секторов, кругов и подиума updateNfsCircuitProgress');
    assert.ok(car3dJs.includes('toggleSpeedbreaker('), 'В Car3DRacingEngine должен быть метод активации Speedbreaker toggleSpeedbreaker');
    assert.ok(car3dJs.includes('ИДЕАЛЬНЫЙ СТАРТ NFS!'), 'В Car3DRacingEngine должен поддерживаться Идеальный Старт (Perfect Launch) на отсчёте 3-2-1');
    assert.ok(car3dJs.includes('Рейзор (#1 Blacklist)'), 'В Car3DRacingEngine должен присутствовать главный босс Чёрного списка Рейзор (#1 Blacklist)');
});

test('16. Оригинальные 3D GLB-рипы из NFS Most Wanted 2005 (BMW M3 E46 GTR, Corvette C6.R Кросса, Mustang GT Рейзора)', () => {
    const modelsDir = path.join(__dirname, '..', 'assets', 'models');
    const expectedGlbs = [
        { file: 'bmw_m3_gtr.glb', minBytes: 1000000 },
        { file: 'corvette_cross.glb', minBytes: 1000000 },
        { file: 'mustang_razor.glb', minBytes: 500000 }
    ];

    for (const item of expectedGlbs) {
        const fullPath = path.join(modelsDir, item.file);
        assert.ok(fs.existsSync(fullPath), `Файл 3D-модели ${item.file} должен существовать в assets/models/`);
        const stat = fs.statSync(fullPath);
        assert.ok(stat.size >= item.minBytes, `Файл ${item.file} должен быть полноценной 3D-моделью (${stat.size} байт)`);
        const fd = fs.openSync(fullPath, 'r');
        const header = Buffer.alloc(4);
        fs.readSync(fd, header, 0, 4, 0);
        fs.closeSync(fd);
        assert.equal(header.toString('ascii'), 'glTF', `Файл ${item.file} должен иметь валидный бинарный заголовок glTF`);
    }

    const car3dJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'car-3d.js'), 'utf8');
    assert.ok(car3dJs.includes("m3gtr: './assets/models/bmw_m3_gtr.glb'"), 'GLB_MODEL_MAP должен мапить m3gtr на bmw_m3_gtr.glb');
    assert.ok(car3dJs.includes("corvette_cross: './assets/models/corvette_cross.glb'"), 'GLB_MODEL_MAP должен мапить corvette_cross на corvette_cross.glb');
    assert.ok(car3dJs.includes("mustang_razor: './assets/models/mustang_razor.glb'"), 'GLB_MODEL_MAP должен мапить mustang_razor на mustang_razor.glb');
    assert.ok(car3dJs.includes('preserveLiveryMap'), 'applyStylingToGLTF должен сохранять оригинальные ливреи NFS Most Wanted (preserveLiveryMap)');

    const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
    assert.ok(appJs.includes('function claimAndSelectNfsMwCar('), 'В js/app.js должна быть функция выдачи и выбора легенд NFS MW claimAndSelectNfsMwCar');
    assert.ok(appJs.includes('"BMW M3 E46 GTR (NFS Most Wanted)"'), 'В carRaceStats должен быть BMW M3 E46 GTR (NFS Most Wanted)');
    assert.ok(appJs.includes('"Chevrolet Corvette C6.R (Cross NFS MW)"'), 'В carRaceStats должен быть Chevrolet Corvette C6.R (Cross NFS MW)');
    assert.ok(appJs.includes('"Ford Mustang GT (Razor NFS MW)"'), 'В carRaceStats должен быть Ford Mustang GT (Razor NFS MW)');
});


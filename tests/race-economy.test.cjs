const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/race-economy.js');
const {createApp} = require('./helpers/create-app.cjs');

test('legacy cars normalize without losing their plate or any unknown attributes', () => {
    const car={name:'ВАЗ-2107 «Жигули»', plate:{text:'А777АА'}, extra:77};
    E.ensureCar(car);
    assert.equal(car.condition,100);
    assert.equal(car.upgrades.engine,0);
    assert.equal(car.upgrades.nitro,0);
    assert.equal(car.plate.text,'А777АА');
    assert.equal(car.extra,77);
    E.ensureCar(car);
    assert.equal(car.condition,100);
});

test('malformed cloud garage stats cannot grant unbounded upgrades or negative repair prices', () => {
    const car=E.normalizeCar({condition:-20,upgrades:{engine:Infinity,handling:-10,economy:500}});
    assert.equal(car.condition,0);
    assert.equal(car.upgrades.engine,0);
    assert.equal(car.upgrades.nitro,0);
    assert.equal(car.upgrades.handling,0);
    assert.equal(car.upgrades.economy,5);
    assert.equal(E.upgradeCost(80000,'economy',5),null);
    assert.equal(E.upgradeCost(80000,'not-a-type',0),null);
    assert.equal(E.repairCost(80000,100),0);
    assert(E.repairCost(80000,40)>0);
});

test('engine improves speed and acceleration, suspension improves control, eco reduces consumption', () => {
    const base={speed:160,accel:2.2,handling:4.8,rewardMult:1};
    const standard=E.performance(base,{condition:100});
    const full=E.performance(base,{condition:100, upgrades:{engine:5,handling:5,economy:5,nitro:5}});
    assert(full.speed>standard.speed);
    assert(full.accel>standard.accel);
    assert(full.handling>standard.handling);
    assert(full.consumption<standard.consumption);
    assert(full.nitroDrain<standard.nitroDrain);
    assert(full.nitroRecharge>standard.nitroRecharge);
    assert(full.nitroSpeedBonus>standard.nitroSpeedBonus);
    assert(E.performance(base,{condition:30}).speed<standard.speed);
    assert.equal(standard.rewardMult,1);
});

test('fuel depends on distance and throttle; nitro costs more, economy reduces', () => {
    const standard=E.fuelForFrame({speed:200,seconds:0.05,consumption:16});
    const nitro=E.fuelForFrame({speed:200,seconds:0.05,consumption:16,gas:true,nitro:true});
    const eco=E.fuelForFrame({speed:200,seconds:0.05,consumption:9});
    assert(standard>0);assert(nitro>standard);assert(eco<standard);
    assert.equal(E.fuelForFrame({speed:0,seconds:0.05,consumption:16}),0);
    assert.equal(E.fuelForFrame({speed:200,seconds:0,consumption:16}),0);
});

test('finish deducts fuel cost exactly once, allows negative profit but no negative wallet', () => {
    const bill=E.settle(12000,2.5,100);
    assert.equal(bill.gross,12000);assert.equal(bill.fuelCost,205);assert.equal(bill.net,11795);
    assert.equal(bill.walletAfter,11895);
    const loss=E.settle(0,2.5,100);
    assert.equal(loss.net,-205);assert.equal(loss.credited,-100);assert.equal(loss.walletAfter,0);
});

test('garage tune/repair charge once and preserve car plate, duplicates stay distinct', () => {
    const app=createApp();
    app.run(`myCars = [
        {name:'ВАЗ-2107 «Жигули»',basePrice:80000,plate:{text:'М 777 ММ'}},
        {name:'ВАЗ-2107 «Жигули»',basePrice:80000,plate:null}];balance=50000;`);
    app.run('upgradeGarageCar(1,"engine")');
    assert.equal(app.run('myCars[1].upgrades.engine'),1);
    assert.equal(app.run('myCars[0].upgrades?.engine || 0'),0);
    assert.equal(app.run('myCars[0].plate.text'),'М 777 ММ');
    assert(app.run('balance')<50000);
    app.run('myCars[1].condition=55;repairGarageCar(1)');
    assert.equal(app.run('myCars[1].condition'),100);
    assert.equal(app.run('myCars[0].plate.text'),'М 777 ММ');
    const after=app.run('balance');app.run('repairGarageCar(1)');assert.equal(app.run('balance'),after);
    assert.equal(JSON.parse(app.data.get('nomera_player_account')).myCars[1].upgrades.engine,1);
});

test('race crash settles net payout, fuel, wear and XP once; voluntary exit still pays for fuel', () => {
    const app=createApp();
    app.run(`selectedRaceCarName='ВАЗ-2107 «Жигули»';selectedRaceCarIndex=0;startRaceGame();racePlayer.earnedCash=900;racePlayer.fuelLiters=2;
        racePlayer.distanceKm=4;racePlayer.damageTaken=3;racePlayer.peakSpeed=175;triggerRaceCrash();`);
    assert.equal(app.run('balance'),50000+900-164);
    assert.equal(app.elements.get('go-stat-fuel').innerText,'2.00 л × 82 ₽ = −164 ₽');
    assert.equal(app.elements.get('go-stat-cash').innerText,'+736 ₽');
    assert(app.run('myCars[0].condition')<100);
    const before=app.run('balance');app.run('triggerRaceCrash()');assert.equal(app.run('balance'),before);
    app.run('restartRaceGame();racePlayer.earnedCash=0;racePlayer.fuelLiters=1;exitRaceGame()');
    assert.equal(app.run('balance'),before-82);
    assert.equal(app.elements.get('gameover-title').innerText,'🏁 Заезд завершён');
});

test('physics actually burns fuel during motion and upgrading economy reduces liters per km', () => {
    const app=createApp();
    app.run(`selectedRaceCarName='ВАЗ-2107 «Жигули»';selectedRaceCarIndex=0;startRaceGame();raceKeys.gas=true;updateRacePhysics(0.05)`);
    const used=app.run('racePlayer.fuelLiters');
    assert(used>0);
    const fuelConsumption=app.run('racePlayer.fuelConsumption');
    app.run('exitRaceGame(); myCars[0].upgrades.economy=5; startRaceGame()');
    assert(app.run('racePlayer.fuelConsumption')<fuelConsumption);
});

test('car plate rarity applies reward multiplier and sets plateBonus in performance stats', () => {
    const base = { speed: 200, accel: 3.0, handling: 6.0, rewardMult: 2.0 };
    // No plate or standard
    const noPlate = E.performance(base, { condition: 100 });
    assert.equal(noPlate.rewardMult, 2.0);
    assert.equal(noPlate.plateBonus, 0);

    // Common
    const common = E.performance(base, { condition: 100, plate: { text: 'А 123 ВС | 77 RUS', rarity: { text: 'Обычный' } } });
    assert.equal(common.rewardMult, 2.0);
    assert.equal(common.plateBonus, 0);

    // Rare (+5%)
    const rare = E.performance(base, { condition: 100, plate: { text: 'А 123 ВС | 77 RUS', rarity: { text: 'Редкий' } } });
    assert.equal(rare.rewardMult, 2.1); // 2.0 * 1.05
    assert.equal(rare.plateBonus, 5);

    // Super rare (+10%)
    const superRare = E.performance(base, { condition: 100, plate: { text: 'А 123 ВС | 77 RUS', rarity: { text: 'Супер редкий' } } });
    assert.equal(superRare.rewardMult, 2.2); // 2.0 * 1.10
    assert.equal(superRare.plateBonus, 10);

    // Epic (+15%)
    const epic = E.performance(base, { condition: 100, plate: { text: 'А 777 ВС | 77 RUS', rarity: { text: 'Эпический' } } });
    assert.equal(epic.rewardMult, 2.3); // 2.0 * 1.15
    assert.equal(epic.plateBonus, 15);

    // Legendary (+25%)
    const legendary = E.performance(base, { condition: 100, plate: { text: 'А 777 АА | 77 RUS', rarity: { text: 'Легендарный' } } });
    assert.equal(legendary.rewardMult, 2.5); // 2.0 * 1.25
    assert.equal(legendary.plateBonus, 25);

    // Blatnoy / Krutoy (+35%)
    const blatnoy = E.performance(base, { condition: 100, plate: { text: 'А 011 АА | 777 RUS', rarity: { text: 'БЛАТНОЙ' } } });
    assert.equal(blatnoy.rewardMult, 2.7); // 2.0 * 1.35
    assert.equal(blatnoy.plateBonus, 35);
});

(function (root) {
    'use strict';
    // Game economy constants; these are fictional in-game tariffs, not live pump prices.
    const FUEL_PRICE = 82; // ₽/l
    const MAX_LEVEL = 5;
    const UPGRADE_TYPES = Object.freeze(['engine', 'handling', 'economy', 'nitro']);
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const finite = (value, otherwise = 0) => typeof value === 'number' && Number.isFinite(value) ? value : otherwise;
    const level = value => Math.floor(clamp(finite(value), 0, MAX_LEVEL));
    function normalizeCar(car) {
        const upgrades = car && typeof car.upgrades === 'object' && car.upgrades !== null ? car.upgrades : {};
        return {
            condition: clamp(finite(car?.condition, 100), 0, 100),
            upgrades: {
                engine: level(upgrades.engine),
                handling: level(upgrades.handling),
                economy: level(upgrades.economy),
                nitro: level(upgrades.nitro)
            }
        };
    }
    function ensureCar(car) {
        if (!car || typeof car !== 'object') return null;
        const normalized = normalizeCar(car);
        car.condition = normalized.condition;
        car.upgrades = normalized.upgrades;
        return car;
    }
    function upgradeCost(basePrice, type, currentLevel) {
        if (!UPGRADE_TYPES.includes(type)) return null;
        const l = level(currentLevel);
        if (l >= MAX_LEVEL) return null;
        const base = clamp(finite(basePrice, 80000), 10000, 200000000);
        return Math.round(Math.max(1600, base * 0.035) * (l + 1) * Math.pow(1.45, l));
    }
    function repairCost(basePrice, condition) {
        const damage = 100 - normalizeCar({condition}).condition;
        if (damage < 0.01) return 0;
        const base = clamp(finite(basePrice, 80000), 10000, 200000000);
        const carFactor = Math.pow(base, 0.42);
        return Math.max(150, Math.round(carFactor * 18 * damage / 100));
    }
    const UAE_ROYAL_CARS = Object.freeze([
        'Mercedes-Benz G63 AMG «Гелик»',
        'Rolls-Royce Cullinan',
        'Bugatti Chiron Super Sport',
        'Koenigsegg Jesko Attack',
        'Ferrari SF90 Stradale',
        'Lamborghini Huracan Performante',
        'Toyota Land Cruiser 300'
    ]);
    const UAE_SHEIKH_CARS = Object.freeze([
        'Mercedes-Benz G63 AMG «Гелик»',
        'Rolls-Royce Cullinan',
        'Bugatti Chiron Super Sport',
        'Koenigsegg Jesko Attack',
        'Ferrari SF90 Stradale',
        'Lamborghini Huracan Performante',
        'Toyota Land Cruiser 300',
        'Porsche 911 Turbo S',
        'BMW M8 Gran Coupe',
        'Mercedes-Benz E63s AMG'
    ]);
    const KZ_VIP_CARS = Object.freeze([
        'Toyota Camry 3.5',
        'Toyota Land Cruiser 300',
        'Mercedes-Benz G63 AMG «Гелик»',
        'BMW M5 F90 Competition',
        'Mercedes-Benz E63s AMG',
        'BMW M5 E60 V10'
    ]);
    const RUS_KORTEZH_CARS = Object.freeze([
        'BMW M5 F90 Competition',
        'BMW M5 E60 V10',
        'BMW M8 Gran Coupe',
        'Mercedes-Benz E63s AMG',
        'Mercedes-Benz G63 AMG «Гелик»',
        'Audi RS6 Avant',
        'Toyota Land Cruiser 300',
        'Rolls-Royce Cullinan',
        'ГАЗ-24 «Волга»'
    ]);
    const USA_HIGHWAY_CARS = Object.freeze([
        'Porsche 911 Turbo S',
        'Lamborghini Huracan Performante',
        'Ferrari SF90 Stradale',
        'Bugatti Chiron Super Sport',
        'Koenigsegg Jesko Attack',
        'Nissan GT-R R35 Nismo',
        'Nissan Silvia S15 Spec-R',
        'Subaru Impreza WRX STI',
        'Toyota Mark II Tourer V',
        'BMW M8 Gran Coupe'
    ]);
    const JDM_LEGEND_CARS = Object.freeze([
        'Toyota Mark II Tourer V',
        'Nissan Silvia S15 Spec-R',
        'Subaru Impreza WRX STI',
        'Nissan GT-R R35 Nismo'
    ]);
    const OPER_BPAN_CARS = Object.freeze([
        'ВАЗ-2107 «Жигули»',
        'ВАЗ-2109 «Девятка»',
        'Lada Priora БПАН',
        'Lada Vesta Sport',
        'ГАЗ-24 «Волга»'
    ]);

    function getCarPlateSynergy(carOrName, plateTextOrObj) {
        const carName = String(typeof carOrName === 'string' ? carOrName : (carOrName?.name || '')).trim();
        const rawInput = typeof plateTextOrObj === 'string'
            ? plateTextOrObj
            : (plateTextOrObj?.text || plateTextOrObj?.plate?.text || (typeof carOrName === 'object' ? (carOrName?.plate?.text || carOrName?.attachedPlate?.text || carOrName?.attachedPlate || carOrName?.plate || '') : ''));
        const rawPlate = String(rawInput || '').trim().toUpperCase();
        if (!carName || !rawPlate || rawPlate === 'NONE') return null;

        const parts = rawPlate.split('|');
        const mainPart = (parts[0] || '').trim();
        const regionPart = (parts[1] || '').trim();
        const lettersOnly = mainPart.replace(/[^А-ЯЁA-Z]/gi, '').toUpperCase();

        const makeResult = (id, title, icon, mult) => ({
            id,
            title,
            icon,
            mult,
            bonusPct: Math.round(mult * 100)
        });

        // 1. uae_royal (+35%)
        if (
            UAE_ROYAL_CARS.includes(carName) &&
            /\bUAE$/i.test(rawPlate) &&
            (/^[A-Z]{1,2}\s+\d{1,2}$/i.test(mainPart) || /^([A-Z])\1\s+\d{1,3}$/i.test(mainPart) || /\b777\b/.test(mainPart))
        ) {
            return makeResult('uae_royal', 'Королевский Кортеж ОАЭ', '👑', 0.35);
        }
        // 2. uae_sheikh (+25%)
        if (UAE_SHEIKH_CARS.includes(carName) && /\bUAE$/i.test(rawPlate)) {
            return makeResult('uae_sheikh', 'Шейх Дубая', '🇦🇪', 0.25);
        }
        // 3. kz_vip (+25%)
        if (KZ_VIP_CARS.includes(carName) && /\bKZ$/i.test(rawPlate)) {
            return makeResult('kz_vip', 'Астана — Алматы VIP', '🇰🇿', 0.25);
        }
        // 4. rus_kortezh (+25%)
        if (
            RUS_KORTEZH_CARS.includes(carName) &&
            (/\bRUS$/i.test(rawPlate) || !/\b(UAE|USA|KZ)$/i.test(rawPlate)) &&
            (
                /(АМР|ЕКХ|ООО|ААА|СКР|ВОР|ККК|ХХХ|МММ|ССС|ФСБ|КРА)/i.test(mainPart) ||
                /^(АМР|ЕКХ|ООО|ААА|СКР|ВОР|ККК|ХХХ|МММ|ССС|ФСБ|КРА)$/i.test(lettersOnly) ||
                /\b(777|001)\b/.test(mainPart)
            )
        ) {
            return makeResult('rus_kortezh', 'Федеральный Спецборт', '🚨', 0.25);
        }
        // 5. usa_highway (+22%)
        if (USA_HIGHWAY_CARS.includes(carName) && /\bUSA$/i.test(rawPlate)) {
            return makeResult('usa_highway', 'Калифорнийский Хайвей', '🇺🇸', 0.22);
        }
        // 6. jdm_legend (+20%)
        if (
            JDM_LEGEND_CARS.includes(carName) &&
            (/\b(777|888|001|007|111|222|333|444|555|666|999|101|202|303|707|100)\b/.test(mainPart) || /\b(25|125|27|65|41)\s+RUS$/i.test(rawPlate))
        ) {
            return makeResult('jdm_legend', 'Легенда Токио JDM', '⛩️', 0.20);
        }
        // 7. oper_bpan (+18%)
        if (
            OPER_BPAN_CARS.includes(carName) &&
            (
                /(\d)\1\1/.test(mainPart) ||
                /\b(00[1-9]|005|007|666|777|999|095)\b/.test(mainPart) ||
                /\b(\d)0\1\b/.test(mainPart) ||
                /(ВОР|ХХХ|АУЕ|ОМР|КРА)/i.test(mainPart) ||
                /^(ВОР|ХХХ|АУЕ|ОМР|КРА)$/i.test(lettersOnly) ||
                /^([А-ЯЁA-Z])\s*\d{3}\s*\1\1/i.test(mainPart) ||
                /^([А-ЯЁA-Z])\1\1$/i.test(lettersOnly)
            )
        ) {
            return makeResult('oper_bpan', 'Опер-Стайл / Авторитет', '🕶️', 0.18);
        }

        return null;
    }

    function performance(baseStats, car) {
        const {condition, upgrades} = normalizeCar(car);
        // At 0% condition the car remains drivable to prevent deadlocks on an empty wallet.
        const health = 0.65 + condition / 100 * 0.35;
        let plateMult = 1.0;
        const rarityText = car?.plate?.rarity?.text || '';
        if (rarityText === 'БЛАТНОЙ' || rarityText === 'Крутой') plateMult = 1.35;
        else if (rarityText === 'Легендарный') plateMult = 1.25;
        else if (rarityText === 'Эпический') plateMult = 1.15;
        else if (rarityText === 'Супер редкий') plateMult = 1.10;
        else if (rarityText === 'Редкий') plateMult = 1.05;

        const plateText = String(car?.plate?.text || '').trim().toUpperCase();
        if (/\bUAE$/.test(plateText)) plateMult += 0.08;
        else if (/\bUSA$/.test(plateText)) plateMult += 0.05;
        else if (/\bKZ$/.test(plateText)) plateMult += 0.03;

        const synergy = getCarPlateSynergy(car, car?.plate);
        if (synergy) {
            plateMult += synergy.mult;
        }

        return {
            ...baseStats,
            speed: Math.round(baseStats.speed * (1 + upgrades.engine * 0.055) * health),
            accel: Number((baseStats.accel * (1 + upgrades.engine * 0.07) * health).toFixed(2)),
            handling: Number(clamp(baseStats.handling + upgrades.handling * 0.65 - (1-health) * 3, 2, 10).toFixed(2)),
            consumption: Number(((8 + baseStats.speed / 29) * (1 - upgrades.economy * 0.085) * (1 + (1-health) * 0.45)).toFixed(2)),
            rewardMult: Number(((baseStats.rewardMult || 1) * plateMult).toFixed(3)),
            plateBonus: Math.round((plateMult - 1) * 100),
            synergyTitle: synergy ? synergy.title : null,
            synergyBonus: synergy ? synergy.bonusPct : 0,
            synergyIcon: synergy ? synergy.icon : null,
            nitroDrain: 28 * (1 - upgrades.nitro * 0.1),
            nitroRecharge: 4 + upgrades.nitro * 0.8,
            nitroSpeedBonus: 1.35 + upgrades.nitro * 0.025
        };
    }
    // Measured distance only: 0 speed/0 dt consumes 0, no idle/time exploit.
    function fuelForFrame({speed, seconds, consumption, gas = false, nitro = false, drafting = false}) {
        const distance = clamp(finite(speed), 0, 1000) / 3600 * clamp(finite(seconds), 0, 0.1);
        const litersPer100Km = clamp(finite(consumption, 12), 1, 100);
        const drivingFactor = (gas ? 1.35 : 1) * (nitro ? 1.85 : 1) * (drafting ? 0.88 : 1);
        const arcadeBurn = 4.2;
        return distance * litersPer100Km / 100 * drivingFactor * arcadeBurn;
    }
    function settle(gross, usedLiters, availableBalance) {
        const revenue = Math.max(0, Math.round(finite(gross)));
        const liters = Math.max(0, finite(usedLiters));
        const fuelCost = Math.round(liters * FUEL_PRICE);
        const net = revenue - fuelCost;
        const walletBefore = Math.max(0, finite(availableBalance));
        const walletAfter = Math.max(0, walletBefore + net);
        return {gross: revenue, liters, fuelCost, net, credited: walletAfter - walletBefore, walletAfter};
    }
    const api = {FUEL_PRICE, MAX_LEVEL, UPGRADE_TYPES, normalizeCar, ensureCar, upgradeCost, repairCost, performance, fuelForFrame, settle, getCarPlateSynergy};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.NomeraRaceEconomy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

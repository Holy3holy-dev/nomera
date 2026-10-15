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
        return Math.ceil(Math.max(400, clamp(finite(basePrice, 80000), 10000, 200000000) * 0.07 * damage / 100));
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

        return {
            ...baseStats,
            speed: Math.round(baseStats.speed * (1 + upgrades.engine * 0.055) * health),
            accel: Number((baseStats.accel * (1 + upgrades.engine * 0.07) * health).toFixed(2)),
            handling: Number(clamp(baseStats.handling + upgrades.handling * 0.65 - (1-health) * 3, 2, 10).toFixed(2)),
            consumption: Number(((8 + baseStats.speed / 29) * (1 - upgrades.economy * 0.085) * (1 + (1-health) * 0.45)).toFixed(2)),
            rewardMult: Number(((baseStats.rewardMult || 1) * plateMult).toFixed(3)),
            plateBonus: Math.round((plateMult - 1) * 100),
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
    const api = {FUEL_PRICE, MAX_LEVEL, UPGRADE_TYPES, normalizeCar, ensureCar, upgradeCost, repairCost, performance, fuelForFrame, settle};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.NomeraRaceEconomy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

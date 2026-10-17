'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const adminCore = require('../netlify/functions/lib/admin-core.cjs');
const onlineCore = require('../netlify/functions/lib/online-core.cjs');
const NomeraRaceEconomy = require('../js/race-economy.js');

const adminImport = import('../netlify/functions/admin.mjs');
const onlineImport = import('../netlify/functions/online.mjs');

function createMockDb(initial = {}) {
    const store = structuredClone(initial);
    const updates = [];
    const removedPaths = [];

    function getAt(pathStr) {
        const parts = String(pathStr || '').split('/').filter(Boolean);
        let cur = store;
        for (const p of parts) {
            if (!cur || typeof cur !== 'object' || !(p in cur)) return undefined;
            cur = cur[p];
        }
        return cur;
    }

    function setAt(pathStr, val) {
        const parts = String(pathStr || '').split('/').filter(Boolean);
        if (!parts.length) return;
        let cur = store;
        for (let i = 0; i < parts.length - 1; i++) {
            const p = parts[i];
            if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
            cur = cur[p];
        }
        const last = parts[parts.length - 1];
        if (val === null || val === undefined) {
            delete cur[last];
        } else {
            cur[last] = structuredClone(val);
        }
    }

    function makeSnap(val) {
        return {
            exists: () => val !== undefined && val !== null,
            val: () => (val === undefined ? null : structuredClone(val))
        };
    }

    function ref(pathStr) {
        return {
            async get() {
                return makeSnap(getAt(pathStr));
            },
            async once() {
                return makeSnap(getAt(pathStr));
            },
            async set(val) {
                setAt(pathStr, val);
            },
            async update(patch) {
                updates.push({ path: pathStr, patch: structuredClone(patch) });
                const cur = getAt(pathStr);
                const next = (cur && typeof cur === 'object') ? { ...cur } : {};
                for (const [k, v] of Object.entries(patch || {})) {
                    if (v === null || v === undefined) delete next[k];
                    else next[k] = structuredClone(v);
                }
                setAt(pathStr, next);
            },
            async remove() {
                removedPaths.push(pathStr);
                setAt(pathStr, null);
            },
            async push(val) {
                const cur = getAt(pathStr) || {};
                const id = 'push_' + (Object.keys(cur).length + 1);
                setAt(pathStr + '/' + id, val);
                return { key: id };
            },
            async transaction(updater) {
                const cur = getAt(pathStr);
                const next = updater(cur === undefined ? null : structuredClone(cur));
                if (next === undefined) {
                    return { committed: false, snapshot: makeSnap(cur) };
                }
                setAt(pathStr, next);
                return { committed: true, snapshot: makeSnap(getAt(pathStr)) };
            }
        };
    }

    return { ref, store, updates, removedPaths, getAt };
}

function setup3DRaceEngine(options = {}) {
    global.window = global;
    global.self = global;
    global.NomeraRaceEconomy = NomeraRaceEconomy;
    global.document = {
        createElement: () => {
            const el = {
                getContext: () => ({
                    fillRect: () => {},
                    clearRect: () => {},
                    fillText: () => {},
                    drawImage: () => {},
                    measureText: () => ({ width: 100 }),
                    beginPath: () => {},
                    ellipse: () => {},
                    fill: () => {},
                    createRadialGradient: () => ({ addColorStop: () => {} }),
                    createLinearGradient: () => ({ addColorStop: () => {} })
                }),
                width: 512,
                height: 512,
                style: {},
                classList: { add: () => {}, remove: () => {}, contains: () => false },
                appendChild: () => {},
                removeChild: () => {},
                parentNode: null,
                closest: () => null
            };
            el.parentNode = el;
            return el;
        },
        createElementNS: () => ({ style: {} }),
        getElementById: () => null,
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    try {
        if (!global.navigator) {
            Object.defineProperty(global, 'navigator', { value: { userAgent: 'NodeTest' }, configurable: true });
        }
    } catch (_) {}
    global.requestAnimationFrame = () => 0;
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
    };
    global.THREE = THREE;

    delete require.cache[require.resolve('../js/race-effects.js')];
    delete require.cache[require.resolve('../js/car-3d.js')];
    global.RaceEffectsManager = require('../js/race-effects.js');
    const Car3DManager = require('../js/car-3d.js');

    const mockContainer = {
        clientWidth: 800,
        clientHeight: 500,
        style: {},
        appendChild: () => {},
        removeChild: () => {}
    };

    const engine = new Car3DManager.Car3DRacingEngine(mockContainer, options);
    engine.start({
        carName: 'ВАЗ-2107 «Жигули»',
        styling: { wheels: 'stamps' },
        performance: { speed: 180, accel: 3.5 }
    });
    return engine;
}

test('Admin renameUser rejects overwriting an existing account and deleteUser cleans up presence/<key>', async () => {
    const { default: admin } = await adminImport;
    const secret = 'admin-secret-key-for-audit-tests-0123456789abcdef';
    const oldSecret = process.env.NOMERA_ADMIN_SESSION_SECRET;
    const oldHash = process.env.NOMERA_ADMIN_PASSWORD_HASH;
    process.env.NOMERA_ADMIN_SESSION_SECRET = secret;
    process.env.NOMERA_ADMIN_PASSWORD_HASH = adminCore.hashPassword('admin-pass-123');

    try {
        const mockDb = createMockDb({
            onlineV4: {
                accounts: {
                    racer_one: { nickname: 'Racer_One', balance: 50000 },
                    taken_nick: { nickname: 'Taken_Nick', balance: 900000 }
                },
                market: {}
            },
            users: {
                racer_one: { nickname: 'Racer_One', balance: 50000 },
                taken_nick: { nickname: 'Taken_Nick', balance: 900000 }
            },
            presence: {
                racer_one: { nickname: 'Racer_One', online: true }
            },
            online: {
                racer_one: { online: true }
            },
            leaderboard: {
                racer_one: { nickname: 'Racer_One', balance: 50000 }
            }
        });

        const cookieHeader = `${adminCore.COOKIE}=${adminCore.token(secret)}`;
        const headers = {
            'content-type': 'application/json',
            host: 'nomera1.netlify.app',
            origin: 'https://nomera1.netlify.app',
            cookie: cookieHeader
        };

        // 1. Attempt to rename racer_one -> Taken_Nick (already exists)
        const renameRes = await admin(
            new Request('https://nomera1.netlify.app/.netlify/functions/admin', {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'renameUser', key: 'racer_one', newNickname: 'Taken_Nick' })
            }),
            { db: mockDb }
        );
        assert.equal(renameRes.status, 400);
        const renameBody = await renameRes.json();
        assert.equal(renameBody.ok, false);
        assert.match(renameBody.error, /занят/i);
        // Existing target account must remain untouched
        assert.equal(mockDb.getAt('onlineV4/accounts/taken_nick').balance, 900000);
        assert.equal(mockDb.getAt('onlineV4/accounts/racer_one').balance, 50000);

        // 2. deleteUser removes presence/<key> as well as account paths
        const deleteRes = await admin(
            new Request('https://nomera1.netlify.app/.netlify/functions/admin', {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'deleteUser', key: 'racer_one' })
            }),
            { db: mockDb }
        );
        assert.equal(deleteRes.status, 200);
        assert.ok(mockDb.removedPaths.includes('presence/racer_one'), 'deleteUser must remove presence/<key>');
        assert.equal(mockDb.getAt('presence/racer_one'), undefined);
        assert.equal(mockDb.getAt('onlineV4/accounts/racer_one'), undefined);
    } finally {
        if (oldSecret === undefined) delete process.env.NOMERA_ADMIN_SESSION_SECRET;
        else process.env.NOMERA_ADMIN_SESSION_SECRET = oldSecret;
        if (oldHash === undefined) delete process.env.NOMERA_ADMIN_PASSWORD_HASH;
        else process.env.NOMERA_ADMIN_PASSWORD_HASH = oldHash;
    }
});

test('Legacy PIN migration clears plaintext pin and password fields in memory and in Firebase update', async () => {
    const { default: online } = await onlineImport;
    const secret = 'online-secret-key-for-audit-tests-0123456789abcdef';
    const oldSecret = process.env.NOMERA_ADMIN_SESSION_SECRET;
    process.env.NOMERA_ADMIN_SESSION_SECRET = secret;

    try {
        // Direct helper check
        const legacyMem = { nickname: 'LegacyUser', balance: 50000, pin: '123456', password: '123456' };
        const patch = onlineCore.migrateLegacyPin(legacyMem, '123456');
        assert.equal('pin' in legacyMem, false, 'migrateLegacyPin must delete plaintext pin in memory');
        assert.equal('password' in legacyMem, false, 'migrateLegacyPin must delete plaintext password in memory');
        assert.equal(patch.pin, null, 'Firebase update patch must set pin: null');
        assert.equal(patch.password, null, 'Firebase update patch must set password: null');
        assert.ok(onlineCore.checkPin('123456', patch.pinHash));

        // End-to-end online login migration check
        const mockDb = createMockDb({
            onlineV4: {
                accounts: {
                    legacy_driver: {
                        nickname: 'Legacy_Driver',
                        balance: 50000,
                        pin: 'secret99',
                        password: 'secret99',
                        inventory: [],
                        myCars: []
                    }
                }
            }
        });

        const loginRes = await online(
            new Request('https://nomera1.netlify.app/.netlify/functions/online', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    origin: 'https://nomera1.netlify.app'
                },
                body: JSON.stringify({ action: 'login', nickname: 'Legacy_Driver', pin: 'secret99' })
            }),
            { db: mockDb, ip: '127.0.0.1' }
        );
        assert.equal(loginRes.status, 200);
        const acctUpdate = mockDb.updates.find(u => u.path === 'onlineV4/accounts/legacy_driver');
        assert.ok(acctUpdate, 'Should issue Firebase .update() for legacy account migration');
        assert.equal(acctUpdate.patch.pin, null);
        assert.equal(acctUpdate.patch.password, null);
        assert.ok(onlineCore.checkPin('secret99', acctUpdate.patch.pinHash));

        const storedAfter = mockDb.getAt('onlineV4/accounts/legacy_driver');
        assert.equal(storedAfter.pin, undefined);
        assert.equal(storedAfter.password, undefined);
    } finally {
        if (oldSecret === undefined) delete process.env.NOMERA_ADMIN_SESSION_SECRET;
        else process.env.NOMERA_ADMIN_SESSION_SECRET = oldSecret;
    }
});

test('Car3DRacingEngine fuel depletion stops throttle/nitro and triggers onGameOver("fuel", ...) when speed drops <= 5', () => {
    let gameOverReason = null;
    let gameOverState = null;
    const engine = setup3DRaceEngine({
        onGameOver: (reason, state) => {
            gameOverReason = reason;
            gameOverState = state;
        }
    });

    try {
        engine.trafficCars = [];
        engine.state.fuelCurrent = 0;
        engine.state.speed = 60;
        engine.state.nitroLevel = 100;
        engine.keys.gas = true;
        engine.keys.nitro = true;

        const speedBefore = engine.state.speed;
        engine.update(0.1);

        assert.equal(engine.state.isNitroActive, false, 'Nitro must not activate when fuel is depleted');
        assert.ok(engine.state.speed < speedBefore, `Car must decelerate without fuel even when holding gas & nitro (was ${speedBefore}, now ${engine.state.speed})`);
        assert.equal(gameOverReason, null, 'Should not trigger fuel game over while still coasting above 5 km/h');

        // Coast down until speed drops <= 5
        engine.state.speed = 5;
        engine.update(0.05);

        assert.equal(gameOverReason, 'fuel', 'Must trigger onGameOver("fuel", ...) once speed drops <= 5 with 0 fuel');
        assert.ok(gameOverState && gameOverState.fuelCurrent <= 0);
    } finally {
        engine.destroy();
    }
});

test('Car3DRacingEngine guardrail and sideswipe damage caps at 100 and triggers crash game over at 100', () => {
    let crashCalls = [];
    const engine = setup3DRaceEngine({
        onGameOver: (reason, state) => {
            crashCalls.push({ reason, state });
        }
    });

    try {
        // 1. Guardrail scrape damage reaches 100 -> caps at 100 and triggers crash game over
        engine.trafficCars = [];
        engine.state.damageTaken = 99;
        engine.state.speed = 120;
        engine.state.x = 9.0; // beyond roadLimit (8.2)
        engine.state.vx = 5.0;

        engine.update(0.1);

        assert.equal(engine.state.damageTaken, 100, 'Guardrail damageTaken must cap at 100');
        assert.equal(crashCalls.length, 1, 'Guardrail damage reaching 100 must trigger onGameOver');
        assert.ok(crashCalls[0].reason === true || crashCalls[0].reason === 'crash');
        assert.equal(crashCalls[0].state.damageTaken, 100);
    } finally {
        engine.destroy();
    }

    // 2. Sideswipe traffic collision damage reaches 100 -> caps at 100 and triggers crash game over
    let sideswipeCalls = [];
    const engine2 = setup3DRaceEngine({
        onGameOver: (reason, state) => {
            sideswipeCalls.push({ reason, state });
        }
    });

    try {
        engine2.state.damageTaken = 99;
        engine2.state.speed = 110;
        engine2.state.x = 0;
        engine2.state.z = 50;
        engine2.state.invulnerableTimer = 0;

        // Place a civilian traffic car alongside player (dz = -2.0 so isRearEndHit is false -> glancing sideswipe branch)
        assert.ok(engine2.trafficCars.length > 0, 'Traffic pool should be initialized');
        const targetCar = engine2.trafficCars[0];
        targetCar.userData.type = 'sedan';
        targetCar.userData.isWrecked = false;
        targetCar.userData.speed = 100;
        targetCar.userData.halfWidth = 1.0;
        targetCar.userData.halfLength = 2.2;
        targetCar.position.set(0.5, 0, 48.0);

        engine2.updateTraffic(0.05);

        assert.equal(engine2.state.damageTaken, 100, 'Sideswipe damageTaken must cap at 100');
        assert.equal(sideswipeCalls.length, 1, 'Sideswipe damage reaching 100 must trigger onGameOver');
        assert.ok(sideswipeCalls[0].reason === true || sideswipeCalls[0].reason === 'crash');
        assert.equal(sideswipeCalls[0].state.damageTaken, 100);
    } finally {
        engine2.destroy();
    }
});

test('Backend pity counter clamps client pity and prioritizes authoritative server draft.pityCounter', () => {
    const state = {
        accounts: {
            racer: {
                nickname: 'Racer',
                balance: 50000,
                inventory: [],
                myCars: [],
                draft: {
                    num: '124',
                    letters: ['А', 'В', 'Е'],
                    reg: '77',
                    hasNumbers: true,
                    hasLetters: true,
                    changedNumbers: true,
                    changedLetters: true,
                    pityCounter: 5
                }
            }
        },
        market: {},
        chat: {}
    };

    // Forged huge client pity is ignored when server account.draft.pityCounter > 0
    const next = onlineCore.mutate(state, 'roll', 'racer', {
        roll: { mode: 'both', num: '125', letters: ['А', 'В', 'К'] },
        region: '77',
        pity: 99999
    });
    assert.equal(next.accounts.racer.draft.pityCounter, 6);
});

test('2D Race: Car does not drive by itself without gas, coasts to 0 km/h, and caps top speed realistically when gas/nitro are held', () => {
    const { createApp } = require('./helpers/create-app.cjs');
    const app = createApp();

    // 1. Start 2D race: car starts stationary at 0 km/h and stays at 0 km/h when gas is not pressed
    app.run(`
        raceAutoGasEnabled = false;
        selectedRaceCarName = 'ВАЗ-2107 «Жигули»';
        selectedRaceCarIndex = 0;
        startRaceGame();
        raceKeys = { gas: false, brake: false, left: false, right: false, nitro: false, drift: false };
    `);
    assert.equal(app.run('racePlayer.speed'), 0, '2D race must start at 0 km/h');
    for (let i = 0; i < 20; i++) {
        app.run('updateRacePhysics(0.05)');
    }
    assert.equal(app.run('racePlayer.speed'), 0, 'Car must NOT accelerate by itself when gas and auto-gas are off');

    // 2. Releasing gas at speed decelerates smoothly down to 0 km/h
    app.run(`
        racePlayer.speed = 120;
        raceKeys.gas = false;
        updateRacePhysics(0.1);
    `);
    const coastingSpd = app.run('racePlayer.speed');
    assert.ok(coastingSpd < 120 && coastingSpd > 100, `Coasting should decelerate smoothly (got ${coastingSpd})`);
    for (let i = 0; i < 60; i++) {
        app.run('updateRacePhysics(0.1)');
    }
    assert.equal(app.run('racePlayer.speed'), 0, 'Coasting without gas must eventually bring the car to 0 km/h');

    // 3. Pressing gas on a maxed hypercar with nitro + drafting accelerates progressively and never exceeds 425 km/h
    app.run(`
        racePlayer.maxSpeed = 612;
        racePlayer.accel = 11.0;
        racePlayer.speed = 0;
        racePlayer.nitro = 100;
        racePlayer.isNitroActive = true;
        racePlayer.isDrafting = true;
        raceKeys.gas = true;
        raceKeys.nitro = true;
        updateRacePhysics(0.1);
    `);
    const after100ms = app.run('racePlayer.speed');
    assert.ok(after100ms > 5 && after100ms < 35, `Acceleration over 0.1s must be realistic, not instant (got ${after100ms})`);

    for (let i = 0; i < 200; i++) {
        app.run(`
            racePlayer.nitro = 100;
            racePlayer.isNitroActive = true;
            racePlayer.isDrafting = true;
            updateRacePhysics(0.1);
        `);
    }
    const maxReached = app.run('racePlayer.speed');
    assert.ok(maxReached >= 350 && maxReached <= 425, `Top speed with nitro & drafting must stay within 350..425 km/h (got ${maxReached})`);
});



'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./helpers/create-app.cjs');
const { safeCar, mutate } = require('../netlify/functions/lib/online-core.cjs');
const Livery = require('../js/authors-livery.js');
const Playground = require('../js/authors-playground.js');
const RaceExperience = require('../js/authors-race-experience.js');

const root = path.resolve(__dirname, '..');

test('Production release mode enables Author’s Edition while keeping real storage and server endpoints live', async () => {
    const app = createApp({
        saved: {
            nickname: 'РеальныйИгрок',
            balance: 540000,
            playerLevel: 12,
            playerExp: 450,
            inventory: [{ id: 'plate_real_1', text: 'А777АА 77', price: 250000, country: 'RUS', reg: '77', rarity: { text: 'Легендарный' } }],
            myCars: [{
                name: 'BMW M5 F90 Competition',
                basePrice: 12500000,
                condition: 98,
                upgrades: { engine: 3, handling: 2, economy: 1, nitro: 2, junkmanEngine: true },
                ownedProParts: ['junkmanEngine', 'junkmanTurbo'],
                styling: {
                    color: '#112233',
                    spoiler: 'high',
                    stanceMode: 'sport',
                    fsoStrobes: true,
                    livery: { pattern: 'twin', color: '#d9fb70', width: 0.12, offset: 0, number: '07', team: 'NOMERA' }
                }
            }],
            levelRewardsThrough: 10,
            activityRewards: { repairs: 2, extraAchievements: ['first_million'] }
        }
    });

    app.context.NomeraProgression = require('../js/authors-progression.js');
    app.context.NomeraActivities = require('../js/authors-activities.js');
    app.run('window.NOMERA_AUTHORS_PREVIEW = true; window.NOMERA_AUTHORS_RELEASE = true; window.NOMERA_STORAGE_PREFIX = ""; loadProgress();');
    assert.equal(app.run('isAuthorsSandbox()'), false);

    // Real account data is preserved and saved to unprefixed nomera_player_account
    app.run('balance += 10000; saveProgress(false);');
    const savedRaw = app.run("localStorage.getItem('nomera_player_account')");
    assert(savedRaw, 'Real nomera_player_account must exist');
    assert.equal(app.run("localStorage.getItem('nomera_authors_v1:nomera_player_account')"), null);

    const saved = JSON.parse(savedRaw);
    assert.equal(saved.nickname, 'РеальныйИгрок');
    assert.equal(saved.balance, 550000);
    assert.equal(saved.levelRewardsThrough, 10);
    assert.deepEqual(saved.activityRewards, { repairs: 2, extraAchievements: ['first_million'] });
    assert.deepEqual(saved.myCars[0].ownedProParts, ['junkmanEngine', 'junkmanTurbo']);
    assert.equal(saved.myCars[0].styling.spoiler, 'high');
    assert.equal(saved.myCars[0].styling.livery.pattern, 'twin');
    assert.equal(saved.myCars[0].styling.livery.number, '07');

    // Online and admin requests are NOT blocked by the sandbox guard in release mode
    let fetchedUrls = [];
    app.context.fetch = async (url) => {
        fetchedUrls.push(String(url));
        return {
            status: 200,
            ok: true,
            json: async () => ({ ok: true, publicState: { market: {}, leaderboard: [] } })
        };
    };
    const res = await app.run("onlineRequest('public', {}, 'GET')");
    assert.equal(res.ok, true);
    assert(fetchedUrls.some(u => u.includes('/.netlify/functions/online')), 'onlineRequest must reach /.netlify/functions/online in release mode');
});

test('Server safeCar and syncGarage preserve Author’s Edition livery, ownedProParts, high spoiler, stanceMode, and fsoStrobes', () => {
    const rawCar = {
        name: 'BMW M3 GTR (E46)',
        basePrice: 15000000,
        condition: 100,
        category: 'Спорт',
        spoiler: 'high',
        ownedProParts: ['junkmanEngine', 'junkmanTurbo', 'junkmanEngine', 'invalidPart'],
        upgrades: { engine: 5, handling: 5, economy: 3, nitro: 5, junkmanEngine: true, gearRatioBias: 2 },
        styling: {
            color: '#1a2b3c',
            spoiler: 'high',
            wheels: 'bbs_gtr',
            stanceMode: 'bpan',
            fsoStrobes: true,
            livery: {
                pattern: 'chevron',
                color: '#d9fb70',
                width: 0.15,
                offset: -0.05,
                number: '24',
                team: 'MIDNIGHT 02'
            }
        }
    };

    const cleaned = safeCar(rawCar);
    assert.equal(cleaned.spoiler, 'high');
    assert.deepEqual(cleaned.ownedProParts, ['junkmanEngine', 'junkmanTurbo']);
    assert.equal(cleaned.styling.spoiler, 'high');
    assert.equal(cleaned.styling.stanceMode, 'bpan');
    assert.equal(cleaned.styling.fsoStrobes, true);
    assert.deepEqual(cleaned.styling.livery, {
        pattern: 'chevron',
        color: '#d9fb70',
        width: 0.15,
        offset: -0.05,
        number: '24',
        team: 'MIDNIGHT 02'
    });

    // Verify full syncGarage mutation preserves the fields
    const state = {
        accounts: {
            player1: {
                nickname: 'Player1',
                balance: 500000,
                inventory: [],
                myCars: []
            }
        },
        market: {}
    };
    const next = mutate(state, 'syncGarage', 'player1', { myCars: [rawCar] }, Date.now());
    assert.equal(next.accounts.player1.myCars.length, 1);
    assert.deepEqual(next.accounts.player1.myCars[0].ownedProParts, ['junkmanEngine', 'junkmanTurbo']);
    assert.deepEqual(next.accounts.player1.myCars[0].styling.livery, cleaned.styling.livery);
});

test('Release storage keys for Livery, Playground, and RaceExperience do not leak into sandbox prefix when NOMERA_STORAGE_PREFIX is empty', () => {
    const store = new Map();
    const fakeRoot = {
        NOMERA_AUTHORS_PREVIEW: true,
        NOMERA_AUTHORS_RELEASE: true,
        NOMERA_STORAGE_PREFIX: '',
        localStorage: {
            getItem: k => store.has(k) ? store.get(k) : null,
            setItem: (k, v) => store.set(k, String(v))
        }
    };
    const raceExp = RaceExperience;
    assert.equal(typeof raceExp.begin, 'function');
    assert.equal(typeof Livery.normalize, 'function');
    assert.equal(typeof Playground.create, 'function');

    const e = { currentActiveWeather: 'clear', state: { raceTimeSec: 0, damageTaken: 0 } };
    const prevPrefix = globalThis.NOMERA_STORAGE_PREFIX;
    const prevRelease = globalThis.NOMERA_AUTHORS_RELEASE;
    const prevPreview = globalThis.NOMERA_AUTHORS_PREVIEW;
    const prevLS = globalThis.localStorage;
    try {
        globalThis.NOMERA_AUTHORS_PREVIEW = true;
        globalThis.NOMERA_AUTHORS_RELEASE = true;
        globalThis.NOMERA_STORAGE_PREFIX = '';
        globalThis.localStorage = fakeRoot.localStorage;
        raceExp.begin(e, { trackId: 'ring', carName: 'M5' }, 'RealUser');
        assert.equal(e.authorsRun.storageKey, 'sector_records:realuser');
        assert(!e.authorsRun.storageKey.startsWith('nomera_authors_v1:'));
        raceExp.destroy(e);
    } finally {
        globalThis.NOMERA_STORAGE_PREFIX = prevPrefix;
        globalThis.NOMERA_AUTHORS_RELEASE = prevRelease;
        globalThis.NOMERA_AUTHORS_PREVIEW = prevPreview;
        globalThis.localStorage = prevLS;
    }
});

test('authors-release.html and dist/ bundle satisfy all production release, security, and asset delivery invariants', () => {
    require('../scripts/build.cjs');
    const releaseHtml = fs.readFileSync(path.join(root, 'authors-release.html'), 'utf8');
    const sandboxHtml = fs.readFileSync(path.join(root, 'authors.html'), 'utf8');
    const distIndexHtml = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
    const distLegacyHtml = fs.readFileSync(path.join(root, 'dist', 'legacy.html'), 'utf8');

    // dist/index.html is the Author's Edition release entry
    assert.equal(distIndexHtml, releaseHtml);
    assert(distLegacyHtml.includes('<title>H3H Nomera</title>'), 'dist/legacy.html must preserve rollback entry');

    // Release HTML must enable both NOMERA_AUTHORS_PREVIEW (feature flag) and NOMERA_AUTHORS_RELEASE (production mode)
    assert.match(releaseHtml, /window\.NOMERA_AUTHORS_PREVIEW=true;window\.NOMERA_AUTHORS_RELEASE=true;window\.NOMERA_STORAGE_PREFIX='';/);
    assert(!releaseHtml.includes('authors-preview.js'), 'Release HTML must not load sandbox fixture authors-preview.js');
    assert(!releaseHtml.includes('authors-preview-market.js'), 'Release HTML must not load sandbox market authors-preview-market.js');
    assert(releaseHtml.includes('/.netlify/functions/firebase-web-config'), 'Release HTML must include runtime Firebase config endpoint');
    assert(releaseHtml.includes('firebase-app-compat.js'), 'Release HTML must include Firebase SDK');
    assert(releaseHtml.includes('rel="manifest"'), 'Release HTML must include web app manifest');

    // Sandbox HTML must still load authors-preview.js for isolated QA
    assert(sandboxHtml.includes('authors-preview.js'), 'Sandbox authors.html must retain authors-preview.js');
    assert(sandboxHtml.includes('authors-preview-market.js'), 'Sandbox authors.html must retain authors-preview-market.js');

    // Every local asset referenced by dist/index.html must exist inside dist/
    for (const match of distIndexHtml.matchAll(/(?:src|href)="(\.\/[^"?#]+)(?:\?[^"#]*)?"/g)) {
        const assetPath = path.join(root, 'dist', match[1]);
        assert(fs.existsSync(assetPath), 'Missing asset in dist/: ' + match[1]);
    }

    // No server code, secrets, or test suites in dist/
    assert(!fs.existsSync(path.join(root, 'dist', 'netlify')), 'Server functions must not be copied to dist/');
    assert(!fs.existsSync(path.join(root, 'dist', 'tests')), 'Tests must not be copied to dist/');
    assert(!fs.existsSync(path.join(root, 'dist', '.env')), '.env must not exist in dist/');

    // Verify all Author's Edition asset directories are present in dist/
    for (const dir of ['models', 'models-lod', 'models-mobile', 'authors-mw/textures', 'authors-mw/traffic', 'authors-mw/world', 'authors-brand', 'audio']) {
        assert(fs.existsSync(path.join(root, 'dist', 'assets', dir)), 'Missing asset directory in dist/assets/' + dir);
    }
});

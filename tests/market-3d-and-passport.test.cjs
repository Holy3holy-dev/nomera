const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

test('renderMarketListings renders 3D inspect button, clickable seller badge and tuning badges', () => {
    const app = createApp({
        saved: {
            nickname: 'MarketBrowser',
            balance: 5000000
        }
    });
    app.run('loadProgress()');
    app.run(`
        marketLots = {
            lot_car_test_1: {
                sellerName: 'StreetRacer99',
                sellerKey: 'streetracer99',
                sellerAvatar: '',
                type: 'car',
                price: 2400000,
                createdAt: Date.now() - 3600000,
                car: {
                    name: 'BMW M3 GTR',
                    category: 'Спорт',
                    condition: 95,
                    plate: { text: 'Х 777 АМ | 77 RUS' },
                    upgrades: { engine: 4, handling: 3, nitro: 2, economy: 1 },
                    ownedProParts: ['junkmanEngine'],
                    styling: { wheels: 'bbs_gtr', spoiler: 'gtr', color: '#1e3a8a' }
                }
            }
        };
        currentMarketFilter = 'cars';
        renderMarketListings();
    `);

    const grid = app.elements.get('market-listings-grid');
    assert.ok(grid, '#market-listings-grid must exist');
    const html = grid.innerHTML;

    assert.ok(html.includes("inspectMarketCar3D") && html.includes("lot_car_test_1"), 'Must contain inspectMarketCar3D button action with lot ID');
    assert.ok(html.includes('Осмотреть в 3D') || html.includes('3D'), 'Inspect button must have 3D inspect label');
    assert.ok(html.includes("openPlayerViewModal") && html.includes("streetracer99"), 'Seller badge must be clickable to open player passport');
    assert.ok(html.includes('StreetRacer99'), 'Seller nickname must be visible');
    assert.ok(html.includes('BMW M3 GTR'), 'Car name must be visible');
    assert.ok(html.includes('Тюнинг 10/20 + 1 Pro'), 'Tuning summary badge must be rendered');
});

test('inspectMarketCar3D populates car title, specs, seller, plate, camera toolbar, and actions', () => {
    const app = createApp({
        saved: {
            nickname: 'ViewerPlayer',
            balance: 10000000
        }
    });
    app.run('loadProgress()');
    app.run(`
        marketLots = {
            lot_m3_inspect: {
                sellerName: 'TurboBoss',
                sellerKey: 'turboboss',
                type: 'car',
                price: 3200000,
                createdAt: Date.now() - 100000,
                car: {
                    name: 'Nissan Skyline GT-R R34',
                    category: 'Суперкар',
                    condition: 96,
                    plate: { text: 'О 001 ОО | 77 RUS' },
                    upgrades: { engine: 5, handling: 4, nitro: 3, economy: 2 },
                    ownedProParts: ['junkmanEngine'],
                    styling: { wheels: 'forged', bodykit: 'widebody', spoiler: 'gt', stanceMode: true, color: '#0f172a' }
                }
            }
        };
        inspectMarketCar3D('lot_m3_inspect');
    `);

    const modal = app.elements.get('market-car-3d-modal');
    const title = app.elements.get('market-3d-car-title');
    const carClass = app.elements.get('market-3d-car-class');
    const sellerBar = app.elements.get('market-3d-seller-bar');
    const plateBox = app.elements.get('market-3d-plate-box');
    const specsGrid = app.elements.get('market-3d-specs-grid');
    const actions = app.elements.get('market-3d-actions');

    assert.ok(modal, 'Modal element must exist');
    assert.ok(modal.classList.contains('show'), 'Modal must have .show class');
    assert.equal(title.innerText, 'Nissan Skyline GT-R R34');
    assert.ok(carClass.innerText.includes('Stage+') || carClass.innerText.length > 0, 'Class badge must be populated');
    assert.ok(sellerBar.innerHTML.includes('TurboBoss'), 'Seller bar must display seller nickname');
    assert.ok(sellerBar.innerHTML.includes('openPlayerViewModal') && sellerBar.innerHTML.includes('turboboss'), 'Seller bar must link to seller passport');
    assert.ok(plateBox.innerHTML.includes('001') && plateBox.innerHTML.includes('mini-plate'), 'Plate box must show installed plate');
    assert.ok(plateBox.innerHTML.includes('Госномер') || plateBox.innerHTML.includes('Синергия'), 'Plate box must show plate info or synergy');
    assert.ok(specsGrid.innerHTML.includes('км/ч') || specsGrid.innerHTML.includes('Скорость'), 'Specs grid must contain speed metric');
    assert.ok(specsGrid.innerHTML.includes('96%') || specsGrid.innerHTML.includes('Состояние'), 'Specs grid must contain car condition');
    assert.ok(actions.innerHTML.includes('buyMarketLotFrom3D') && actions.innerHTML.includes('lot_m3_inspect'), 'Actions must contain 3D buy button');

    // Test camera view modes & body controls
    app.run(`
        setMarket3DViewMode('2d');
    `);
    const fallbackImg = app.elements.get('market-3d-fallback-img');
    const previewWrap = app.elements.get('market-3d-preview-wrap');
    assert.equal(fallbackImg.style.display, 'block', '2D view must show fallback img');
    assert.equal(previewWrap.style.display, 'none', '2D view must hide 3D canvas wrap');

    app.run(`
        setMarket3DViewMode('3d');
    `);
    assert.equal(fallbackImg.style.display, 'none', '3D view must hide 2D fallback');
    assert.equal(previewWrap.style.display, 'block', '3D view must display 3D canvas wrap');

    // Test interactive body toggles
    assert.doesNotThrow(() => {
        app.run(`
            toggleMarket3DDoors();
            toggleMarket3DHood();
            toggleMarket3DTrunk();
            toggleMarket3DHeadlights();
            toggleMarket3DAutoRotate();
        `);
    }, 'Body and rotation toggles must execute safely');

    // Test close
    app.run('closeMarketCar3DModal()');
    assert.equal(modal.classList.contains('show'), false, 'Closing modal must remove .show class');
});

test('openPlayerViewModal populates player passport with garage list and active market lots', () => {
    const app = createApp({
        saved: {
            nickname: 'InspectorAgent',
            balance: 2000000
        }
    });
    app.run('loadProgress()');
    app.run(`
        cloudLeaderboardList = [
            {
                nickname: 'ApexLegend',
                balance: 15000000,
                playerLevel: 55,
                playerTitle: 'drifter',
                bestPlate: 'А 777 АА | 77 RUS',
                carsCount: 5,
                bestSpeed: 345,
                updatedAt: Date.now() - 50000
            }
        ];
        marketLots = {
            lot_apex_car: {
                sellerName: 'ApexLegend',
                sellerKey: 'apexlegend',
                type: 'car',
                price: 8500000,
                createdAt: Date.now() - 20000,
                car: {
                    name: 'Porsche 911 GT3 RS',
                    category: 'Суперкар',
                    condition: 99,
                    plate: { text: 'Р 001 РР | 77 RUS' },
                    upgrades: { engine: 5 },
                    styling: { wheels: 'forged', spoiler: 'gt' }
                }
            }
        };
        openPlayerViewModal('apexlegend');
    `);

    const pvModal = app.elements.get('player-view-modal');
    const pvName = app.elements.get('pv-name');
    const pvTitleBadge = app.elements.get('pv-title-badge');
    const pvGarageList = app.elements.get('pv-garage-list');
    const pvMarketList = app.elements.get('pv-market-list');

    assert.ok(pvModal.classList.contains('show'), '#player-view-modal must be open');
    assert.equal(pvName.innerText, 'ApexLegend');
    assert.ok(pvTitleBadge.innerHTML.includes('Дрифтер') || pvTitleBadge.innerText.length > 0, 'Title badge must be rendered');
    assert.ok(pvGarageList.innerHTML.includes('inspectPlayerGarageCar3D(0)'), 'Garage list must render 3D inspect button for cars');
    assert.ok(pvMarketList.innerHTML.includes('lot_apex_car'), 'Market section in passport must show player active lots');
    assert.ok(pvMarketList.innerHTML.includes("inspectMarketCar3D") && pvMarketList.innerHTML.includes("lot_apex_car"), 'Market lot in passport must have 3D inspect button');

    // Test inspecting a car directly from the player garage in 3D
    app.run('inspectPlayerGarageCar3D(0)');
    const market3DModal = app.elements.get('market-car-3d-modal');
    assert.ok(market3DModal.classList.contains('show'), 'Inspecting player garage car must open 3D inspector');
    const m3dTitle = app.elements.get('market-3d-car-title');
    assert.ok(m3dTitle.innerText.length > 0, 'Car title must be present in 3D inspector');
});

test('buyMarketLotFrom3D purchases car lot, deducts balance and closes 3D modal', async () => {
    const app = createApp({
        saved: {
            nickname: 'BuyerGuy',
            balance: 5000000
        }
    });
    app.run('loadProgress()');
    app.run(`
        marketLots = {
            lot_buy_me_now: {
                sellerName: 'SellerBot',
                sellerKey: 'sellerbot',
                type: 'car',
                price: 1800000,
                createdAt: Date.now() - 5000,
                car: {
                    name: 'Audi RS6 Avant',
                    category: 'Универсал',
                    condition: 97,
                    plate: { text: 'В 888 ВВ | 77 RUS' },
                    upgrades: { engine: 2, handling: 2 },
                    styling: { wheels: 'forged' }
                }
            }
        };
        inspectMarketCar3D('lot_buy_me_now');
    `);

    const initialCarsCount = app.run('myCars.length');
    const initialBalance = app.run('balance');

    await app.run("buyMarketLotFrom3D('lot_buy_me_now')");

    const newCarsCount = app.run('myCars.length');
    const newBalance = app.run('balance');
    const modal = app.elements.get('market-car-3d-modal');

    assert.equal(newCarsCount, initialCarsCount + 1, 'Car must be added to myCars');
    assert.equal(newBalance, initialBalance - 1800000, 'Price must be deducted from balance');
    assert.equal(modal.classList.contains('show'), false, '3D modal must close after purchase');
    assert.equal(app.run('myCars[myCars.length - 1].name'), 'Audi RS6 Avant', 'Purchased car name must match lot');
    assert.equal(app.run('myCars[myCars.length - 1].plate.text'), 'В 888 ВВ | 77 RUS', 'Purchased car must carry lot plate');
});

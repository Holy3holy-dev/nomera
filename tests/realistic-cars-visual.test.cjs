const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/create-app.cjs');

test('all 49 realistic prototype cars render cleanly via getCarSpriteDataUrl and drawPixelCar', () => {
    const app = createApp();
    const cars = app.run('carsData.map(c => c.name)');

    assert.equal(cars.length, 49, 'There should be exactly 49 car models in dealership');

    for (const carName of cars) {
        // Test base styling
        const sprite = app.run(`getCarSpriteDataUrl(${JSON.stringify(carName)})`);
        assert.ok(typeof sprite === 'string' && sprite.length > 20, `Sprite for ${carName} should not be empty`);

        // Test custom styling (color, tint, neon)
        const customSprite = app.run(`getCarSpriteDataUrl(${JSON.stringify(carName)}, { color: '#ef4444', tint: 80, neon: '#00f0ff' })`);
        assert.ok(typeof customSprite === 'string' && customSprite.length > 20, `Custom sprite for ${carName} should not be empty`);
    }
});

test('traffic models (police, kamaz truck, cone) render without throwing errors', () => {
    const app = createApp();
    const traffic = ['ДПС / Полиция', 'КАМАЗ / Фура', 'Дорожный конус'];

    for (const name of traffic) {
        app.run(`
            (() => {
                const cvs = document.getElementById('race-canvas');
                const c = cvs.getContext('2d');
                drawPixelCar(c, 100, 100, ${JSON.stringify(name)}, 1.0, { lightsOn: true, braking: true, blinkerLeft: true, blinkerRight: true });
            })();
        `);
    }
});

test('race visual options (nitro flame, braking lights, tilt, headlights) execute cleanly', () => {
    const app = createApp();

    app.run(`
        (() => {
            const cvs = document.getElementById('race-canvas');
            const c = cvs.getContext('2d');
            drawPixelCar(c, 150, 150, 'Koenigsegg Jesko Attack', 1.5, {
                nitro: true,
                braking: true,
                lightsOn: true,
                tilt: 0.25,
                neon: '#10b981',
                color: '#38bdf8',
                tint: 95
            });
            drawPixelCar(c, 150, 150, 'Mercedes-Benz G63 AMG «Гелик»', 1.5, {
                lightsOn: true,
                braking: false,
                tilt: -0.15
            });
        })();
    `);
});

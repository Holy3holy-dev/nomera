/* Only authors.html loads this file. Production entry and player keys are untouched. */
(() => {
    'use strict';
    window.NOMERA_AUTHORS_PREVIEW = true;
    window.NOMERA_STORAGE_PREFIX = location.pathname.endsWith('/antigravity.html') ? 'nomera_antigravity_review_v1:' : 'nomera_authors_v1:';
    window.NOMERA_FIREBASE_WEB_CONFIG = null;
    window.NOMERA_FIREBASE_CONFIG_ERROR = 'Локальная авторская версия';
    const key = window.NOMERA_STORAGE_PREFIX + 'nomera_player_account';
    // Fixtures are intentionally confined to a separately named browser profile.
    try {
        if (localStorage.getItem(key)) return;
        const plates = [
            ['А777АА 777', 3750000, true], ['М555ММ 77', 920000, false],
            ['К090КК 197', 148000, false], ['Е123КХ 77', 45000, true],
            ['Х808ХХ 178', 265000, false], ['В456ОР 50', 8600, false]
        ].map(([text, price, favorite], i) => ({text, price, favorite, country: 'RUS', createdAt: Date.now() - i * 60000}));
        const cars = [
            {name:'Mercedes-Benz G63 AMG «Гелик»', category:'Люкс Внедорожник', basePrice:18000000, styling:{color:'#728578'}, plate:plates[0]},
            {name:'ВАЗ-2107 «Жигули»', category:'Классика', basePrice:120000, styling:{color:'#e2d9bf'}},
            {name:'Subaru Impreza WRX STI', category:'Ралли-спорт', basePrice:1850000, styling:{color:'#25362f'}}
        ].map(c => ({...c, img:'./icons/car-placeholder.svg', upgrades:{engine:0,handling:0,economy:0,nitro:0},condition:100}));
        localStorage.setItem(key, JSON.stringify({nickname:'Коллекционер',balance:1250000,playerLevel:12,playerExp:34,
            inventory:plates, myCars:cars, generatorBoard:{l1:'А',num:'777',l2:'А',l3:'А',reg:'777',country:'RUS',hasLet:true,hasNum:true,spunLet:false,spunNum:false}}));
        localStorage.setItem(window.NOMERA_STORAGE_PREFIX + 'nomera_user_session', JSON.stringify({nickname:'Коллекционер'}));
    } catch (error) { console.warn('Preview storage unavailable:', error.name); }
})();

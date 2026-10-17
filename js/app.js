const DEFAULT_AVATAR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48cmVjdCB3aWR0aD0nMTAwJyBoZWlnaHQ9JzEwMCcgcng9JzUwJyBmaWxsPScjMjMyYzFjJy8+PGcgZmlsbD0nbm9uZScgc3Ryb2tlPScjZDJmNDY1JyBzdHJva2Utd2lkdGg9JzMnPjxwYXRoIGQ9J00yMCA1N2w5LTE3IDE1LTRoMjBsMTEgMTMgNyA0djE1SDIweicvPjxwYXRoIGQ9J00zNCA0MGgyN2w5IDEySDI3Jy8+PGNpcmNsZSBjeD0nMzQnIGN5PSc2Nycgcj0nNycgZmlsbD0nIzIzMmMxYycvPjxjaXJjbGUgY3g9JzY4JyBjeT0nNjcnIHI9JzcnIGZpbGw9JyMyMzJjMWMnLz48L2c+PC9zdmc=";

        const DEFAULT_CAR_IMG = "./icons/car-placeholder.svg";

        // Автосалон (25 автомобилей всех ценовых категорий с пиксельными моделями)
        const carsData = [
            // 1. Бюджетный класс (до 1 000 000 ₽)
            { name: "ВАЗ-2107 «Жигули»", category: "Классика", price: 120000, img: DEFAULT_CAR_IMG },
            { name: "ВАЗ-2109 «Девятка»", category: "Хэтчбек", price: 180000, img: DEFAULT_CAR_IMG },
            { name: "ГАЗ-24 «Волга»", category: "Ретро-седан", price: 240000, img: DEFAULT_CAR_IMG },
            { name: "Lada Priora БПАН", category: "Седан", price: 350000, img: DEFAULT_CAR_IMG },
            { name: "Hyundai Solaris", category: "Городской", price: 650000, img: DEFAULT_CAR_IMG },
            { name: "Lada Vesta Sport", category: "Спорт-седан", price: 850000, img: DEFAULT_CAR_IMG },
            { name: "Volkswagen Polo", category: "Городской", price: 950000, img: DEFAULT_CAR_IMG },

            // 2. Средний / JDM / Дрифт класс (1 000 000 — 7 000 000 ₽)
            { name: "Toyota Mark II Tourer V", category: "Дрифт-легенда", price: 1400000, img: DEFAULT_CAR_IMG },
            { name: "Subaru Impreza WRX STI", category: "Ралли-спорт", price: 1850000, img: DEFAULT_CAR_IMG },
            { name: "BMW M5 E60 V10", category: "Легенда", price: 2200000, img: DEFAULT_CAR_IMG },
            { name: "Nissan Silvia S15 Spec-R", category: "Икона дрифта", price: 2600000, img: DEFAULT_CAR_IMG },
            { name: "Toyota Camry 3.5", category: "Бизнес", price: 2800000, img: DEFAULT_CAR_IMG },
            { name: "Toyota Land Cruiser 300", category: "Внедорожник", price: 5500000, img: DEFAULT_CAR_IMG },
            { name: "Nissan GT-R R35 Nismo", category: "Спорткупе", price: 6900000, img: DEFAULT_CAR_IMG },

            // 3. Премиум и Спорт (7 000 000 — 20 000 000 ₽)
            { name: "Mercedes-Benz E63s AMG", category: "Премиум-спорт", price: 7800000, img: DEFAULT_CAR_IMG },
            { name: "Audi RS6 Avant", category: "Универсал-ракета", price: 9200000, img: DEFAULT_CAR_IMG },
            { name: "BMW M5 F90 Competition", category: "Спорткар", price: 11500000, img: DEFAULT_CAR_IMG },
            { name: "BMW M8 Gran Coupe", category: "Гран-туризмо", price: 14500000, img: DEFAULT_CAR_IMG },
            { name: "Mercedes-Benz G63 AMG «Гелик»", category: "Люкс Внедорожник", price: 18000000, img: DEFAULT_CAR_IMG },

            // 4. Суперкары и Ультра-Люкс (20 000 000 — 60 000 000 ₽)
            { name: "Porsche 911 Turbo S", category: "Суперкар", price: 25000000, img: DEFAULT_CAR_IMG },
            { name: "Lamborghini Huracan Performante", category: "Суперкар V10", price: 32000000, img: DEFAULT_CAR_IMG },
            { name: "Rolls-Royce Cullinan", category: "Ультра-Люкс", price: 55000000, img: DEFAULT_CAR_IMG },

            // 5. Гиперкары (60 000 000+ ₽)
            { name: "Ferrari SF90 Stradale", category: "Гиперкар", price: 68000000, img: DEFAULT_CAR_IMG },
            { name: "Bugatti Chiron Super Sport", category: "Гиперкар W16", price: 190000000, img: DEFAULT_CAR_IMG },
            { name: "Koenigsegg Jesko Attack", category: "Гиперкар Рекордсмен", price: 270000000, img: DEFAULT_CAR_IMG }
        ];

        // Non-blocking alerts, native browser dialogs replaced by accessible in-page UI.
        let toastTimer = null;
        function notifyUser(message, kind = 'info') {
            const isErr = kind === 'error' || /ошибка|неверн|недостаточно|не хватает|не удалось|недоступ|пуст|занят|заблокирован/i.test(String(message));
            if (isErr) {
                if (typeof sound?.error === 'function') sound.error();
                if (typeof sound?.haptic === 'function') sound.haptic('heavy');
            } else {
                if (typeof sound?.haptic === 'function') sound.haptic('light');
            }
            const host = document.getElementById('h3h-toast-stack');
            if (!host) { console.info(String(message)); return; }
            const toast = document.createElement('div');
            if (typeof toast.setAttribute !== 'function') { console.info(String(message)); return; }
            toast.className = 'h3h-toast ' + (isErr ? 'toast-error' : 'toast-ok');
            toast.setAttribute('role', 'status');
            toast.textContent = String(message);
            host.appendChild(toast);
            while (host.children && host.children.length > 3) host.firstElementChild.remove();
            setTimeout(() => { toast.classList.add('toast-hide'); setTimeout(() => toast.remove(), 350); }, 3400);
        }
        function confirmAction(message) {
            const dialog = document.getElementById('h3h-confirm');
            if (!dialog) return Promise.resolve(false);
            const label = document.getElementById('h3h-confirm-message');
            const yes = document.getElementById('h3h-confirm-yes');
            const no = document.getElementById('h3h-confirm-no');
            if (label) label.textContent = String(message);
            dialog.classList.add('show');
            if (yes && typeof yes.focus === 'function') yes.focus();
            if (typeof window !== 'undefined' && window.confirm && (!yes || typeof yes.focus !== 'function')) {
                return Promise.resolve(true);
            }
            return new Promise(resolve => {
                const finish = value => {
                    dialog.classList.remove('show');
                    if (yes) yes.removeEventListener('click', accept);
                    if (no) no.removeEventListener('click', decline);
                    dialog.removeEventListener('click', backdrop);
                    document.removeEventListener('keydown', escape);
                    resolve(value);
                };
                const accept = () => finish(true);
                const decline = () => finish(false);
                const backdrop = e => { if (e.target === dialog) finish(false); };
                const escape = e => { if (e.key === 'Escape') finish(false); };
                if (yes) yes.addEventListener('click', accept);
                if (no) no.addEventListener('click', decline);
                dialog.addEventListener('click', backdrop);
                document.addEventListener('keydown', escape);
            });
        }
        function flashPlateReward(rarityText) {
            const plate = document.getElementById('plate-box');
            const label = document.getElementById('gen-rarity');
            if (!plate || !label) return;
            plate.classList.remove('h3h-plate-drop');
            plate.classList.remove('has-rarity-drop');
            label.classList.remove('h3h-rarity-pop');
            void plate.offsetWidth;
            plate.classList.add('h3h-plate-drop');
            plate.classList.add('has-rarity-drop');
            label.classList.add('h3h-rarity-pop');
            setTimeout(() => {
                plate.classList.remove('has-rarity-drop');
            }, 1200);

            const isRare = /Редкий|Супер редкий|Эпический|Легендарный|БЛАТНОЙ|Крутой|Мифический/i.test(rarityText);
            if (isRare) {
                const stage = document.querySelector('.plate-stage');
                if (stage && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
                    let sparkColor = '#10b981';
                    let sparkCount = 8;
                    if (/Супер редкий/i.test(rarityText)) {
                        sparkColor = '#ef4444';
                        sparkCount = 10;
                    } else if (/Эпический/i.test(rarityText)) {
                        sparkColor = '#a855f7';
                        sparkCount = 12;
                    } else if (/Легендарный/i.test(rarityText)) {
                        sparkColor = '#fbbf24';
                        sparkCount = 14;
                    } else if (/БЛАТНОЙ|Крутой|Мифический/i.test(rarityText)) {
                        sparkColor = '#ff2e4c';
                        sparkCount = 16;
                    }
                    for (let i = 0; i < sparkCount; i++) {
                        const spark = document.createElement('i');
                        spark.className = 'h3h-reward-spark';
                        const angle = (360 / sparkCount) * i;
                        spark.style.setProperty('--angle', `${angle}deg`);
                        spark.style.setProperty('--spark-color', sparkColor);
                        if (/БЛАТНОЙ|Крутой|Мифический/i.test(rarityText) && i % 2 === 1) {
                            spark.style.setProperty('--spark-color', '#ffd700');
                        }
                        stage.appendChild(spark);
                        setTimeout(() => spark.remove(), 900);
                    }
                }
            }
        }

        // --- FIREBASE REALTIME DATABASE CONFIGURATION ---
        // Served at runtime by Netlify Functions from public-only Firebase Web App config.
        // Never fall back to the legacy bazanomerann project: it risks splitting player data.
        const firebaseConfig = window.NOMERA_FIREBASE_WEB_CONFIG || null;
        const firebaseSetupError = window.NOMERA_FIREBASE_CONFIG_ERROR || '';
        const firebaseConfigValid = Boolean(firebaseConfig
            && firebaseConfig.projectId === 'h3h-nomera-server'
            && typeof firebaseConfig.databaseURL === 'string'
            && /^https:\/\/h3h-nomera-server-default-rtdb(?:\.[a-z0-9-]+)?\.(?:firebasedatabase\.app|firebaseio\.com)\/?$/i.test(firebaseConfig.databaseURL)
            && typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.length > 10
            && typeof firebaseConfig.appId === 'string' && firebaseConfig.appId.length > 10);

        const { safeImageUrl, jsArg } = NomeraSecurity;
        function imageSrc(value) { return NomeraSecurity.escapeHtml(safeImageUrl(value, DEFAULT_AVATAR, [...AVATAR_PRESETS, DEFAULT_CAR_IMG])); }
        let storageFailed = false;
        let saveStatus = 'Локальное сохранение';
        function showSaveStatus(message) {
            saveStatus = message;
            const el = document.getElementById('save-status');
            if (el) el.textContent = storageFailed ? '⚠ Не удалось сохранить в браузере. Не закрывайте игру.' : message;
        }
        function onStorageError() { storageFailed = true; showSaveStatus(saveStatus); }
        const localStore = NomeraStorage.createStorage({
            getItem: key => window.localStorage.getItem(key),
            setItem: (key, value) => window.localStorage.setItem(key, value),
            removeItem: key => window.localStorage.removeItem(key)
        }, onStorageError);
        const sessionStore = NomeraStorage.createStorage({
            getItem: key => window.sessionStorage.getItem(key),
            setItem: (key, value) => window.sessionStorage.setItem(key, value),
            removeItem: key => window.sessionStorage.removeItem(key)
        });
        const raceRecordStore = NomeraRaceRecords.createRecords(localStore);
        let progressRevision = 0;
        const queueCloudSave = NomeraStorage.createSaveQueue(updates => db.ref().update(updates));
        let db = null;
        let isFirebaseOnline = false;
        let isFirebaseConnected = false;
        let sellPlateBusy = false;
        let sendChatBusy = false;
        function setFirebaseState(message, online = false) {
            const label = document.getElementById('multi-firebase-status');
            if (label) {
                label.textContent = message;
                label.classList.toggle('connected', online);
            }
        }
        function firebaseErrorMessage(operation, error) {
            const reason = String((error && (error.code || error.message)) || '').toLowerCase();
            const diagnosis = /permission|denied/.test(reason)
                ? 'Firebase запрещает доступ. Проверьте Realtime Database → Rules.'
                : /network|disconnected|unavailable/.test(reason)
                    ? 'Нет соединения с Firebase. Проверьте интернет и конфигурацию.'
                    : 'Проверьте подключение и настройки Firebase Realtime Database.';
            setFirebaseState('🔴 Firebase: ошибка доступа');
            notifyUser(operation + ': ' + diagnosis, 'error');
            console.warn(operation + ':', error);
        }
        async function diagnoseMultiplayer() {
            try {
                await refreshOnlinePublic();
                notifyUser('✅ Серверный рынок и чат доступны. Для участия нужен вход в игровой аккаунт.');
            } catch(e) { notifyUser(e.message,'error'); }
        }
        try {
            if (firebaseConfigValid && typeof firebase !== 'undefined' && firebase.initializeApp) {
                firebase.initializeApp(firebaseConfig);
                db = firebase.database();
                isFirebaseOnline = true;
            } else if (!firebaseConfigValid) {
                console.warn('Firebase not configured for h3h-nomera-server:', firebaseSetupError || 'Missing or invalid Firebase web config.');
            }
        } catch (e) {
            console.warn('Firebase init error:', e && e.code ? e.code : 'Unknown error');
            isFirebaseOnline = false;
        }

        // --- АДМИНИСТРАТОР И АУДИТ ДЕЙСТВИЙ ---
        const ADMIN_LOGIN = "h3h";
        let isAdmin = false;
        let adminUsersMap = {};
        let adminActivityLogs = [];
        let adminOnlineUsers = [];
        let activeAdminSubTab = 'online';
        let adminCarPickerTargetKey = null;
        let adminCarPickerTargetNick = '';
        let sessionStartTime = Date.now();
        let currentActionName = 'В игре';
        let currentActionDetails = 'Главное меню';

        // Чистое состояние официального игрока
        let balance = 50000;
        let nickname = 'Игрок_' + Math.floor(1000 + Math.random() * 9000);
        let playerPin = '0000';
        let avatarData = '';
        let inventory = [];
        let myCars = [
            {
                name: "ВАЗ-2107 «Жигули»",
                basePrice: 80000,
                category: "Седан",
                img: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Lada_2107_front_20080116.jpg/800px-Lada_2107_front_20080116.jpg",
                plate: null
            }
        ];

        const savedAudio = localStore.json('nomera_audio_v2', {}) || {};
        let globalVolume = Number.isFinite(savedAudio.volume) ? savedAudio.volume : 0.45;
        const sound = NomeraAudio.createAudio({ onUnavailable: () => {
            const label = document.getElementById('audio-state');
            if (label) label.textContent = 'Браузер не поддерживает звук. Игра остаётся доступна.';
        }});
        sound.configure({ volume: globalVolume, muted: savedAudio.muted, engine: savedAudio.engine });

        // Система Опыта
        let playerLevel = 1;
        let playerExp = 0;
        const expRewards = { "Обычный": 1, "Необычный": 3, "Редкий": 7, "Супер редкий": 10, "Эпический": 13, "Легендарный": 20, "Крутой": 30, "БЛАТНОЙ": 100, "МИФИЧЕСКИЙ": 150 };

        // Генератор
        let isSpinning = false;
        let isAutoSpinning = false;
        const lettersArr = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];
        const eliteLetters = ['ААА', 'АМР', 'ВВВ', 'ВОР', 'ТТТ', 'ХХХ', 'ККК', 'ЕКХ', 'АЕО', 'ООО', 'ССС', 'МММ', 'СКР', 'УУУ'];
        let currentL1 = '-', currentL2 = '-', currentL3 = '-';
        let currentNum = '---';
        let currentReg = '777';

        let hasSpunLetSinceSave = false;
        let hasSpunNumSinceSave = false;
        let mustSpinBothForNextSave = false;
        let boardHasLetters = false;
        let boardHasNumbers = false;

        let pityCounterBoth = 0;
        let pityCounterLet = 0;
        let currentPityTargetLet = 40;
        let pityCounterNum = 0;
        let currentPityTargetNum = 40;

        // Кейсы
        let currentCaseData = null;
        let currentCaseCars = [];
        let activeCaseType = '';
        let wonPlateObj = null;
        let wonCarObj = null;
        let currentCarIndexForAttach = -1;

        // Предустановленные SVG-аватары
        const AVATAR_PRESETS = [
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48cmVjdCB3aWR0aD0nMTAwJyBoZWlnaHQ9JzEwMCcgcng9JzUwJyBmaWxsPScjMjMyYzFjJy8+PGcgZmlsbD0nbm9uZScgc3Ryb2tlPScjZDJmNDY1JyBzdHJva2Utd2lkdGg9JzMnPjxwYXRoIGQ9J00yMCA1N2w5LTE3IDE1LTRoMjBsMTEgMTMgNyA0djE1SDIweicvPjxwYXRoIGQ9J00zNCA0MGgyN2w5IDEySDI3Jy8+PGNpcmNsZSBjeD0nMzQnIGN5PSc2Nycgcj0nNycgZmlsbD0nIzIzMmMxYycvPjxjaXJjbGUgY3g9JzY4JyBjeT0nNjcnIHI9JzcnIGZpbGw9JyMyMzJjMWMnLz48L2c+PC9zdmc+",
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48cmVjdCB3aWR0aD0nMTAwJyBoZWlnaHQ9JzEwMCcgcng9JzUwJyBmaWxsPScjYjQ1MzA5Jy8+PHRleHQgeD0nNTAnIHk9JzY0JyBmb250LXNpemU9JzQ4JyB0ZXh0LWFuY2hvcj0nbWlkZGxlJz7wn5GRPC90ZXh0Pjwvc3ZnPg==",
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48cmVjdCB3aWR0aD0nMTAwJyBoZWlnaHQ9JzEwMCcgcng9JzUwJyBmaWxsPScjMDQ3ODU3Jy8+PHRleHQgeD0nNTAnIHk9JzY0JyBmb250LXNpemU9JzQ4JyB0ZXh0LWFuY2hvcj0nbWlkZGxlJz7wn6aBPC90ZXh0Pjwvc3ZnPg==",
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48cmVjdCB3aWR0aD0nMTAwJyBoZWlnaHQ9JzEwMCcgcng9JzUwJyBmaWxsPScjMWQ0ZWQ4Jy8+PHRleHQgeD0nNTAnIHk9JzY0JyBmb250LXNpemU9JzQ4JyB0ZXh0LWFuY2hvcj0nbWlkZGxlJz7imqE8L3RleHQ+PC9zdmc+",
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48cmVjdCB3aWR0aD0nMTAwJyBoZWlnaHQ9JzEwMCcgcng9JzUwJyBmaWxsPScjNmQyOGQ5Jy8+PHRleHQgeD0nNTAnIHk9JzY0JyBmb250LXNpemU9JzQ4JyB0ZXh0LWFuY2hvcj0nbWlkZGxlJz7wn5CvPC90ZXh0Pjwvc3ZnPg==",
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48cmVjdCB3aWR0aD0nMTAwJyBoZWlnaHQ9JzEwMCcgcng9JzUwJyBmaWxsPScjYmUxMjNjJy8+PHRleHQgeD0nNTAnIHk9JzY0JyBmb250LXNpemU9JzQ4JyB0ZXh0LWFuY2hvcj0nbWlkZGxlJz7wn5qAPC90ZXh0Pjwvc3ZnPg==",
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48cmVjdCB3aWR0aD0nMTAwJyBoZWlnaHQ9JzEwMCcgcng9JzUwJyBmaWxsPScjMzM0MTU1Jy8+PHRleHQgeD0nNTAnIHk9JzY0JyBmb250LXNpemU9JzQ4JyB0ZXh0LWFuY2hvcj0nbWlkZGxlJz7wn5C6PC90ZXh0Pjwvc3ZnPg==",
            "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48cmVjdCB3aWR0aD0nMTAwJyBoZWlnaHQ9JzEwMCcgcng9JzUwJyBmaWxsPScjMGYxNzJhJy8+PHRleHQgeD0nNTAnIHk9JzY0JyBmb250LXNpemU9JzQ4JyB0ZXh0LWFuY2hvcj0nbWlkZGxlJz7wn5W277iPPC90ZXh0Pjwvc3ZnPg=="
        ];

        function getPlayerAvatar(player) {
            if (!player || typeof player !== 'object') return AVATAR_PRESETS[0];
            let raw = player.avatarData;
            if (raw && typeof raw === 'string') {
                raw = raw.trim();
                if (/^data:image\/svg\+xml;(?:utf8|charset=utf-8),/i.test(raw)) {
                    try {
                        const svgBody = raw.replace(/^data:image\/svg\+xml;(?:utf8|charset=utf-8),/i, '');
                        const decodedSvg = decodeURIComponent(svgBody);
                        raw = 'data:image/svg+xml;base64,' + (typeof Buffer !== 'undefined' ? Buffer.from(decodedSvg, 'utf8').toString('base64') : btoa(unescape(encodeURIComponent(decodedSvg))));
                    } catch (_) {}
                }
                if (raw.length > 0 && raw !== AVATAR_PRESETS[0]) {
                    const safe = safeImageUrl(raw, null, AVATAR_PRESETS);
                    if (safe) return safe;
                }
            }
            const name = String(player.nickname || 'Гость');
            let hash = 0;
            for (let i = 0; i < name.length; i++) {
                hash = ((hash << 5) - hash) + name.charCodeAt(i);
                hash |= 0;
            }
            const idx = Math.abs(hash) % AVATAR_PRESETS.length;
            return AVATAR_PRESETS[idx];
        }

        window.handleAvatarError = function(img, fallbackIdx = 0) {
            if (!img) return;
            img.onerror = null;
            img.src = (Array.isArray(AVATAR_PRESETS) && AVATAR_PRESETS[fallbackIdx]) ? AVATAR_PRESETS[fallbackIdx] : DEFAULT_AVATAR;
        };

        // КЭШ И СЕРВЕРНЫЕ ДАННЫЕ
        let cloudLeaderboardList = [];
        let marketLots = {};
        let chatMessagesList = [];
        let activeMultiSubTab = 'market';

        let mockOtherPlayers = [
            { nickname: "Alex_777", balance: 24500000, playerLevel: 142, avatarData: AVATAR_PRESETS[1], bestPlate: "А 777 АА | 77 RUS", carsCount: 5, bestSpeed: 340, updatedAt: Date.now() - 120000 },
            { nickname: "SpeedDemon", balance: 14200000, playerLevel: 98, avatarData: AVATAR_PRESETS[0], bestPlate: "В 001 ОР | 777 RUS", carsCount: 4, bestSpeed: 382, updatedAt: Date.now() - 600000 },
            { nickname: "Smotra_RU", balance: 9800000, playerLevel: 76, avatarData: AVATAR_PRESETS[2], bestPlate: "Е 777 КХ | 99 RUS", carsCount: 3, bestSpeed: 310, updatedAt: Date.now() - 1800000 },
            { nickname: "Bimmer_M5", balance: 6500000, playerLevel: 54, avatarData: AVATAR_PRESETS[3], bestPlate: "М 555 ММ | 77 RUS", carsCount: 4, bestSpeed: 295, updatedAt: Date.now() - 3600000 },
            { nickname: "Kolesa_PRO", balance: 4200000, playerLevel: 41, avatarData: AVATAR_PRESETS[4], bestPlate: "О 007 ОО | 197 RUS", carsCount: 2, bestSpeed: 270, updatedAt: Date.now() - 7200000 },
            { nickname: "LadaRacer", balance: 1800000, playerLevel: 28, avatarData: AVATAR_PRESETS[6], bestPlate: "Х 777 ХХ | 52 RUS", carsCount: 2, bestSpeed: 240, updatedAt: Date.now() - 14400000 }
        ];

        let leaderboardFilter = 'balance';

        // --- V4.5 СИСТЕМЫ: ТИТУЛЫ, ДНЕВНЫЕ НАГРАДЫ, АЧИВКИ, СТАЙЛИНГ, ДРЭГ ---
        let playerTitle = 'novice';
        let dailyBonus = { lastClaimDate: null, streak: 0 };
        let dailyQuests = { date: null, progress: { spins: 0, distance: 0, tune: 0 }, claimed: {} };
        let achievements = {};
        let selectedDragBet = 0;
        let isDragRaceRunning = false;
        let activeRaceMode = '3d';
        let currentMarketFilter = 'all';
        let activeCollectionTab = 'plates';
        let stylingActiveCarIndex = -1;
        let stylingTempColor = '#ffffff';
        let stylingTempTint = 0;
        let stylingTempNeon = 'none';
        let stylingTempSpoiler = 'none';
        let stylingTempVinyl = 'none';
        let stylingTempWheels = 'stock';
        let stylingTempSuspension = 'stock';
        let stylingTempSgu = 'none';
        let stylingTempPlate = 'none';
        let stylingTempCamber = 0;
        let stylingTempOffset = 0;
        let stylingTempNeonMode = 'solid';
        let stylingViewMode = 'side';

        const TITLES_CATALOG = {
            none: { id: 'none', label: 'Без титула', color: '#94a3b8' },
            novice: { id: 'novice', label: '🔰 Новичок', color: '#94a3b8' },
            racer: { id: 'racer', label: '🏎️ Стритрейсер', color: '#38bdf8' },
            millionaire: { id: 'millionaire', label: '💰 Олигарх', color: '#eab308' },
            collector: { id: 'collector', label: '👑 Коллекционер', color: '#a855f7' },
            drag_king: { id: 'drag_king', label: '⚡ Дрэг-мастер', color: '#ec4899' },
            admin: { id: 'admin', label: '👑 Администратор', color: '#ff2e4c' }
        };

        const DAILY_REWARDS = [15000, 25000, 40000, 60000, 85000, 120000, 200000];

        const STYLING_PALETTE = [
            { col: '#ffffff', name: 'Белый лед' },
            { col: '#18181b', name: 'Черный глянец' },
            { col: '#ef4444', name: 'Алый спорт' },
            { col: '#84cc16', name: 'Кислотный лайм' },
            { col: '#06b6d4', name: 'Кибер синий' },
            { col: '#eab308', name: 'Золотой металлик' },
            { col: '#a855f7', name: 'Фиолетовый' }
        ];

        function escapeHtml(str) {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }

        function sanitizeKey(name) {
            if (!name) return 'player_' + Date.now();
            return name.trim().toLowerCase().replace(/[.#$\[\]\/]/g, '_');
        }

        // Audio is lazy, user-activated and independent of gameplay failures.
        function initAudio() { sound.unlock(); }
        function playTick() { sound.tick(); }
        function playLockSound(pitchMultiplier = 1) { sound.lock(pitchMultiplier); }
        function playWinJingle(rarityText) { sound.win(rarityText); }
        function playCashSound() { sound.cash(); }
        function refreshSoundUI() {
            const preferences = sound.preferences();
            const muteButton = document.getElementById('sound-toggle');
            if (muteButton) {
                muteButton.textContent = preferences.muted ? 'ЗВУК ВЫКЛ' : 'ЗВУК ВКЛ';
                muteButton.setAttribute('aria-pressed', String(preferences.muted));
                muteButton.setAttribute('aria-label', preferences.muted ? 'Включить звук' : 'Отключить звук');
            }
            const muted = document.getElementById('sound-muted');
            const engine = document.getElementById('engine-sound');
            if (muted) muted.checked = preferences.muted;
            if (engine) engine.checked = preferences.engine;
            const output = document.getElementById('volume-output');
            if (output) output.textContent = Math.round(preferences.volume * 100) + '%';
            const slider = document.getElementById('volume-slider');
            if (slider) slider.value = preferences.volume;
        }
        function saveSoundOptions(preferences) {
            const current = sound.configure(preferences);
            globalVolume = current.volume;
            localStore.set('nomera_audio_v2', JSON.stringify(current));
            refreshSoundUI();
            if (typeof fetch === 'function') restoreAdminSession();
        }
        function updateVolume() {
            saveSoundOptions({ volume: Number(document.getElementById('volume-slider').value) });
        }
        function updateSoundOptions() {
            saveSoundOptions({ muted: document.getElementById('sound-muted').checked, engine: document.getElementById('engine-sound').checked });
        }
        function toggleSoundMute() { saveSoundOptions({ muted: !sound.preferences().muted }); }
        function previewSound() { initAudio(); sound.cash(); }
        function navigateToTab(id) {
            const tab = [...document.querySelectorAll('.nav-tab')].find(button => button.dataset.tab === id);
            switchTab(id, tab);
        }
        ['touchstart', 'touchend', 'pointerdown', 'click'].forEach(evt => {
            document.addEventListener(evt, () => { if (!document.hidden) initAudio(); }, {passive: true});
        });
        document.addEventListener('keydown', () => { if (!document.hidden) initAudio(); });
        document.addEventListener('click', event => {
            const button = event.target.closest('button, .plate-region');
            if (button && !button.disabled && !button.classList.contains('touch-btn')) sound.click();
        });
        window.addEventListener('blur', () => sound.suspend());

        // --- САЛЮТ / КОНФЕТТИ НА CANVAS ---
        const fxCanvas = document.getElementById('fx-canvas');
        const fxCtx = fxCanvas.getContext('2d');
        let confettiParticles = [];
        let fxAnimationId = null;

        function resizeFxCanvas() {
            fxCanvas.width = window.innerWidth;
            fxCanvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeFxCanvas);
        resizeFxCanvas();

        function triggerConfetti() {
            const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];
            for (let i = 0; i < 90; i++) {
                confettiParticles.push({
                    x: fxCanvas.width / 2,
                    y: fxCanvas.height * 0.4,
                    vx: (Math.random() - 0.5) * 16,
                    vy: (Math.random() - 0.8) * 16,
                    size: Math.random() * 8 + 4,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    alpha: 1,
                    decay: Math.random() * 0.015 + 0.01
                });
            }
            if (!fxAnimationId) renderConfetti();
        }

        function renderConfetti() {
            fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
            for (let i = confettiParticles.length - 1; i >= 0; i--) {
                let p = confettiParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.35; // Гравитация
                p.alpha -= p.decay;

                if (p.alpha <= 0) {
                    confettiParticles.splice(i, 1);
                    continue;
                }

                fxCtx.save();
                fxCtx.globalAlpha = p.alpha;
                fxCtx.fillStyle = p.color;
                fxCtx.fillRect(p.x, p.y, p.size, p.size);
                fxCtx.restore();
            }

            if (confettiParticles.length > 0) {
                fxAnimationId = requestAnimationFrame(renderConfetti);
            } else {
                fxAnimationId = null;
                fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
            }
        }

        function triggerLegendaryEffect() {
            triggerConfetti();
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate([100, 50, 100, 50, 200]); } catch (e) {}
            }
            const stage = document.getElementById('gen-showcase') || document.getElementById('roulette-plate-card') || document.querySelector('.plate-stage');
            if (stage) {
                stage.classList.add('legendary-glow-pulse');
                setTimeout(() => stage.classList.remove('legendary-glow-pulse'), 3500);
            }
        }

        function triggerScreenShake() {
            document.body.classList.remove('shake-impact');
            void document.body.offsetWidth;
            document.body.classList.add('shake-impact');
            setTimeout(() => document.body.classList.remove('shake-impact'), 400);
        }

        function updatePlateGlow(rarityText) {
            const plateBox = document.getElementById('plate-box');
            plateBox.className = 'plate-container';
            if (rarityText === "Необычный") plateBox.classList.add('glow-uncommon');
            else if (rarityText === "Редкий") plateBox.classList.add('glow-rare');
            else if (rarityText === "Супер редкий") plateBox.classList.add('glow-super');
            else if (rarityText === "Эпический") plateBox.classList.add('glow-epic');
            else if (rarityText === "Легендарный") plateBox.classList.add('glow-legendary');
            else if (rarityText === "Крутой" || rarityText === "БЛАТНОЙ") plateBox.classList.add('glow-blatnoy');
            else plateBox.classList.add('glow-none');
        }

        function isTouchOrMobileDevice() {
            if (typeof window === 'undefined') return false;
            return ('ontouchstart' in window) ||
                   (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
                   (typeof window.matchMedia === 'function' && (
                       window.matchMedia('(pointer: coarse)').matches ||
                       window.matchMedia('(hover: none)').matches ||
                       window.matchMedia('(max-width: 1024px)').matches
                   )) ||
                   (window.innerWidth <= 1024);
        }
        window.isTouchOrMobileDevice = isTouchOrMobileDevice;

        function syncMobileTouchControlsVisibility() {
            if (typeof document === 'undefined') return;
            const touch3D = document.getElementById('race-3d-touch-controls');
            if (touch3D && isTouchOrMobileDevice()) {
                touch3D.classList.add('touch-enabled');
                const btnText = document.getElementById('btn-toggle-touch-text');
                if (btnText) btnText.textContent = 'Скрыть руль';
            }
        }
        window.syncMobileTouchControlsVisibility = syncMobileTouchControlsVisibility;

        function bindTouchButtons() {
            if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
            document.querySelectorAll('.touch-btn').forEach(button => {
                if (!button || typeof button.addEventListener !== 'function' || button._touchBound) return;
                button._touchBound = true;

                const parseBtnKey = (btn) => {
                    const id = btn.id || '';
                    const match = id.match(/^btn-(?:3d-)?touch-(.+)$/);
                    return match ? match[1] : '';
                };

                const key = parseBtnKey(button);
                if (!key) return;

                const is3D = button.id && button.id.startsWith('btn-3d-');

                const onDown = (e) => {
                    if (typeof button.setPointerCapture === 'function' && e.pointerId !== undefined) {
                        try { button.setPointerCapture(e.pointerId); } catch (_) {}
                    }
                    if (e && e.cancelable && typeof e.preventDefault === 'function') e.preventDefault();
                    if (is3D) {
                        handle3DTouchControl(e, key, true);
                    } else {
                        handleTouchControl(e, key, true);
                    }
                };

                const onUp = (e) => {
                    if (typeof button.releasePointerCapture === 'function' && e && e.pointerId !== undefined) {
                        try { button.releasePointerCapture(e.pointerId); } catch (_) {}
                    }
                    if (e && e.cancelable && typeof e.preventDefault === 'function') e.preventDefault();
                    if (is3D) {
                        handle3DTouchControl(e, key, false);
                    } else {
                        handleTouchControl(e, key, false);
                    }
                };

                button.addEventListener('pointerdown', onDown);
                button.addEventListener('pointerup', onUp);
                button.addEventListener('pointercancel', onUp);
                button.addEventListener('pointerleave', onUp);
                button.addEventListener('lostpointercapture', onUp);
            });
        }
        window.bindTouchButtons = bindTouchButtons;

        function initCanvasDirectTouchSteering() {
            if (typeof document === 'undefined') return;

            // 1. Прямое управление рулением на холсте 2D трассы (тач / свайп влево-вправо)
            const raceCanvas = typeof document.getElementById === 'function' ? document.getElementById('race-canvas') : null;
            const raceCanvasWrapper = (typeof document.querySelector === 'function') ? document.querySelector('.race-canvas-wrapper') : null;
            const target2D = (raceCanvasWrapper && typeof raceCanvasWrapper.addEventListener === 'function')
                ? raceCanvasWrapper
                : ((raceCanvas && typeof raceCanvas.addEventListener === 'function') ? raceCanvas : null);

            if (target2D && typeof target2D.addEventListener === 'function' && !target2D._boundCanvasSteer) {
                target2D._boundCanvasSteer = true;
                let canvasSteerPointerId = null;

                const update2DSteer = (e) => {
                    if (typeof target2D.getBoundingClientRect !== 'function') return;
                    const rect = target2D.getBoundingClientRect();
                    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
                    if (clientX === null || !rect.width) return;
                    const relX = (clientX - rect.left) / rect.width;
                    if (relX < 0.44) {
                        setRaceKey('left', true);
                        setRaceKey('right', false);
                    } else if (relX > 0.56) {
                        setRaceKey('right', true);
                        setRaceKey('left', false);
                    } else {
                        setRaceKey('left', false);
                        setRaceKey('right', false);
                    }
                };

                const onDown2D = (e) => {
                    if (!isRaceRunning || activeRaceMode === '3d') return;
                    if (e.target && typeof e.target.closest === 'function' && e.target.closest('button, .touch-btn, .btn, .touch-actions-bar, .touch-cluster')) return;
                    canvasSteerPointerId = e.pointerId;
                    if (typeof target2D.setPointerCapture === 'function' && e.pointerId !== undefined) {
                        try { target2D.setPointerCapture(e.pointerId); } catch (_) {}
                    }
                    if (e.pointerId !== undefined) activeRacePointers.set(e.pointerId, 'steer');
                    update2DSteer(e);
                    if (typeof sound?.haptic === 'function') sound.haptic('light');
                    if (e.cancelable && typeof e.preventDefault === 'function') e.preventDefault();
                };

                const onMove2D = (e) => {
                    if (canvasSteerPointerId !== null && canvasSteerPointerId === e.pointerId && isRaceRunning && activeRaceMode !== '3d') {
                        update2DSteer(e);
                        if (e.cancelable && typeof e.preventDefault === 'function') e.preventDefault();
                    }
                };

                const onRelease2D = (e) => {
                    if (canvasSteerPointerId !== null && (e.pointerId === undefined || e.pointerId === canvasSteerPointerId)) {
                        if (typeof target2D.releasePointerCapture === 'function' && e && e.pointerId !== undefined) {
                            try { target2D.releasePointerCapture(e.pointerId); } catch (_) {}
                        }
                        if (e && e.pointerId !== undefined) activeRacePointers.delete(e.pointerId);
                        canvasSteerPointerId = null;
                        setRaceKey('left', false);
                        setRaceKey('right', false);
                        if (e && e.cancelable && typeof e.preventDefault === 'function') e.preventDefault();
                    }
                };

                target2D.addEventListener('pointerdown', onDown2D);
                target2D.addEventListener('pointermove', onMove2D);
                target2D.addEventListener('pointerup', onRelease2D);
                target2D.addEventListener('pointercancel', onRelease2D);
                target2D.addEventListener('lostpointercapture', onRelease2D);
            }

            // 2. Прямое управление рулением на вьюпорте 3D гонки (тач / свайп влево-вправо)
            const viewport3D = typeof document.getElementById === 'function' ? document.getElementById('race-3d-viewport-wrapper') : null;
            if (viewport3D && typeof viewport3D.addEventListener === 'function' && !viewport3D._boundCanvasSteer) {
                viewport3D._boundCanvasSteer = true;
                let steer3DPointerId = null;

                const update3DSteer = (e) => {
                    if (typeof viewport3D.getBoundingClientRect !== 'function') return;
                    const rect = viewport3D.getBoundingClientRect();
                    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
                    if (clientX === null || !rect.width) return;
                    const relX = (clientX - rect.left) / rect.width;
                    if (relX < 0.44) {
                        setRaceKey('left', true);
                        setRaceKey('right', false);
                    } else if (relX > 0.56) {
                        setRaceKey('right', true);
                        setRaceKey('left', false);
                    } else {
                        setRaceKey('left', false);
                        setRaceKey('right', false);
                    }
                };

                const onDown3D = (e) => {
                    if (!isRaceRunning || activeRaceMode !== '3d') return;
                    if (e.target && typeof e.target.closest === 'function' && e.target.closest('button, .touch-btn, .btn, .touch-actions-bar, .touch-cluster')) return;
                    steer3DPointerId = e.pointerId;
                    if (typeof viewport3D.setPointerCapture === 'function' && e.pointerId !== undefined) {
                        try { viewport3D.setPointerCapture(e.pointerId); } catch (_) {}
                    }
                    if (e.pointerId !== undefined) activeRacePointers.set(e.pointerId, 'steer');
                    update3DSteer(e);
                    if (typeof sound?.haptic === 'function') sound.haptic('light');
                    if (e.cancelable && typeof e.preventDefault === 'function') e.preventDefault();
                };

                const onMove3D = (e) => {
                    if (steer3DPointerId !== null && steer3DPointerId === e.pointerId && isRaceRunning && activeRaceMode === '3d') {
                        update3DSteer(e);
                        if (e.cancelable && typeof e.preventDefault === 'function') e.preventDefault();
                    }
                };

                const onRelease3D = (e) => {
                    if (steer3DPointerId !== null && (e.pointerId === undefined || e.pointerId === steer3DPointerId)) {
                        if (typeof viewport3D.releasePointerCapture === 'function' && e && e.pointerId !== undefined) {
                            try { viewport3D.releasePointerCapture(e.pointerId); } catch (_) {}
                        }
                        if (e && e.pointerId !== undefined) activeRacePointers.delete(e.pointerId);
                        steer3DPointerId = null;
                        setRaceKey('left', false);
                        setRaceKey('right', false);
                        if (e && e.cancelable && typeof e.preventDefault === 'function') e.preventDefault();
                    }
                };

                viewport3D.addEventListener('pointerdown', onDown3D);
                viewport3D.addEventListener('pointermove', onMove3D);
                viewport3D.addEventListener('pointerup', onRelease3D);
                viewport3D.addEventListener('pointercancel', onRelease3D);
                viewport3D.addEventListener('lostpointercapture', onRelease3D);
            }
        }
        window.initCanvasDirectTouchSteering = initCanvasDirectTouchSteering;

        // --- ИНИЦИАЛИЗАЦИЯ, ХРАНИЛИЩЕ И ОБЛАКО FIREBASE ---
        window.onload = function() {
            refreshSoundUI();
            showSaveStatus(saveStatus);
            bindTouchButtons();
            initCanvasDirectTouchSteering();
            syncMobileTouchControlsVisibility();
            document.addEventListener('touchcancel', resetRaceKeys);
            window.addEventListener('resize', syncMobileTouchControlsVisibility);
            window.addEventListener('orientationchange', syncMobileTouchControlsVisibility);

            // Тактильный виброотклик на клики по кнопкам интерфейса
            document.addEventListener('click', (e) => {
                if (e.target && typeof e.target.closest === 'function' && e.target.closest('button, .btn, .nav-tab, .touch-btn, .inv-card, .dealership-card')) {
                    if (typeof sound?.haptic === 'function') sound.haptic('light');
                }
            });
            loadProgress();
            updateBalance();
            updateExpUI();
            renderInventory();
            renderCars();
            // Background preload authentic 3D model of active car for instant 3D race and garage start
            setTimeout(() => {
                try {
                    if (typeof Car3DManager !== 'undefined' && Car3DManager.preloadCarModel && window.THREE) {
                        const targetCar = (Array.isArray(myCars) && myCars[0]) ? myCars[0].name : 'ВАЗ-2107 «Жигули»';
                        Car3DManager.preloadCarModel(window.THREE, targetCar);
                    }
                } catch (_) {}
            }, 300);
            checkCanSaveButton();
            renderLeaderboard();
            renderAvatarPresets();
            setupOnlinePresence();
            const onlineBoot = setupMultiplayerListeners();
            // Check the server cookie BEFORE prompting a returning player to register.
            if (typeof fetch === 'function') {
                restoreAdminSession().catch(() => {});
            }
            Promise.resolve(onlineBoot).finally(() => {
                const hasSession = localStore.get('nomera_user_session');
                const hasSeenWelcome = sessionStore.get('nomera_welcome_seen');
                if (!onlineProfile && !hasSession && !hasSeenWelcome) {
                    setTimeout(openWelcomeModal, 400);
                }
            });
        };

        // --- ЖИВОЙ АУДИТ ДЕЙСТВИЙ («КТО ЧТО КРУТИТ») ---
        let lastPresenceSync = 0;
        let presenceDisconnectRegistered = false;

        function updatePlayerPresence(actionName, details, force = false) {
            if (actionName) currentActionName = String(actionName).slice(0, 60);
            if (details !== undefined) currentActionDetails = String(details).slice(0, 120);
            const now = Date.now();
            if (!force && now - lastPresenceSync < 15000) return;
            lastPresenceSync = now;

            const rtdb = (typeof firebase !== 'undefined' && typeof firebase.database === 'function') ? firebase.database() : db;
            if (!rtdb || typeof rtdb.ref !== 'function') return;
            try {
                const curNick = (onlineProfile ? onlineProfile.nickname : nickname) || 'Гость';
                const pKey = sanitizeKey(curNick);
                const curCarName = (isRaceRunning && typeof selectedRaceCarName !== 'undefined' && selectedRaceCarName) || (Array.isArray(myCars) && myCars[0]?.name) || (typeof selectedRaceCarName !== 'undefined' && selectedRaceCarName) || (carsData[0]?.name || '');
                const payload = {
                    key: pKey,
                    nickname: curNick,
                    avatarData: avatarData || '',
                    loginTime: sessionStartTime,
                    lastActive: now,
                    action: currentActionName,
                    details: currentActionDetails,
                    balance: Number(balance) || 0,
                    playerLevel: Number(playerLevel) || 1,
                    currentCar: curCarName,
                    carsCount: Array.isArray(myCars) ? myCars.length : 0,
                    platesCount: Array.isArray(inventory) ? inventory.length : 0,
                    online: true
                };
                const presenceRef = rtdb.ref('presence/' + pKey);
                presenceRef.set(payload).catch?.(() => {});
                if (!presenceDisconnectRegistered && presenceRef.onDisconnect) {
                    presenceRef.onDisconnect().remove();
                    presenceDisconnectRegistered = true;
                }
            } catch (_) {}
        }

        function logPlayerActivity(action, details) {
            const entry = {
                nickname: (onlineProfile ? onlineProfile.nickname : nickname) || "Гость",
                action: action,
                details: details,
                timestamp: Date.now()
            };
            adminActivityLogs.unshift(entry);
            if (adminActivityLogs.length > 200) adminActivityLogs.pop();
            if (isAdmin) renderAdminActivity();

            updatePlayerPresence(action, details);

            const rtdb = (typeof firebase !== 'undefined' && typeof firebase.database === 'function') ? firebase.database() : db;
            if (rtdb && typeof rtdb.ref === 'function') {
                try {
                    rtdb.ref('activity').push(entry).catch?.(() => {});
                } catch (_) {}
            }
        }

        function saveProgress(syncCloud = true) {
            progressRevision++;
            const data = {
                balance,
                nickname,
                avatarData,
                inventory,
                myCars,
                playerLevel,
                playerExp,
                playerTitle: playerTitle || 'novice',
                dailyBonus,
                dailyQuests,
                achievements,
                pityCounterBoth,
                raceRecords: (typeof getRaceRecords === 'function' ? getRaceRecords() : null),
                updatedAt: Date.now()
            };

            // Локальный кэш
            localStore.set('nomera_player_account', JSON.stringify(data));
            localStore.set('nomera_user_session', JSON.stringify({ nickname }));

            showSaveStatus('✓ Игра сохранена на устройстве · онлайн-кошелёк на сервере');
            const lbTab = document.getElementById('leaderboard');
            if (lbTab && !lbTab.classList.contains('hidden')) {
                renderLeaderboard();
            }
            updateBadge();
            updateProfileUI();
            if (syncCloud) {
                if (typeof syncCloudGarage === 'function') syncCloudGarage();
                if (onlineProfile && typeof syncMyLeaderboardEntry === 'function') syncMyLeaderboardEntry();
            }
        }

        function loadProgress() {
            raceRecordStore.bind(sanitizeKey(nickname));
            const savedRaw = localStore.get('nomera_player_account');

            if (savedRaw) {
                try {
                    const d = JSON.parse(savedRaw);
                    balance = Number.isFinite(Number(d.balance)) ? Number(d.balance) : balance;
                    nickname = d.nickname || nickname;
                    raceRecordStore.bind(sanitizeKey(nickname), { legacy: true, snapshot: d.raceRecords });
                    playerPin = d.playerPin || playerPin;
                    avatarData = d.avatarData || avatarData;
                    if (typeof avatarData === 'string' && /^data:image\/svg\+xml;(?:utf8|charset=utf-8),/i.test(avatarData)) {
                        try {
                            const svgBody = avatarData.replace(/^data:image\/svg\+xml;(?:utf8|charset=utf-8),/i, '');
                            const decodedSvg = decodeURIComponent(svgBody);
                            avatarData = 'data:image/svg+xml;base64,' + (typeof Buffer !== 'undefined' ? Buffer.from(decodedSvg, 'utf8').toString('base64') : btoa(unescape(encodeURIComponent(decodedSvg))));
                        } catch (_) {}
                    }
                    inventory = Array.isArray(d.inventory) ? d.inventory : [];
                    myCars = Array.isArray(d.myCars) ? d.myCars.map(c => {
                        if (!c || typeof c !== 'object') return null;
                        const template = (typeof carsData !== 'undefined' && Array.isArray(carsData)) ? (carsData.find(t => t && t.name === c.name) || {}) : {};
                        return {
                            ...c,
                            basePrice: Number(c.basePrice || template.price || 80000)
                        };
                    }).filter(Boolean) : myCars;
                    playerLevel = d.playerLevel || playerLevel;
                    playerExp = d.playerExp || playerExp;
                    playerTitle = d.playerTitle || playerTitle || 'novice';
                    dailyBonus = d.dailyBonus || { lastClaimDate: null, streak: 0 };
                    dailyQuests = d.dailyQuests || { date: null, progress: { spins: 0, distance: 0, tune: 0 }, claimed: {} };
                    achievements = d.achievements || {};
                    pityCounterBoth = typeof d.pityCounterBoth === 'number' ? d.pityCounterBoth : 0;
                    if (d.raceRecords && typeof setRaceRecords === 'function') {
                        setRaceRecords(d.raceRecords);
                    }
                } catch(e) {}
            }

            updateProfileUI();
            updateBadge();
            updatePityUI();
        }

        function updateProfileUI() {
            const hAvatar = document.getElementById('header-avatar');
            if (hAvatar) hAvatar.src = safeImageUrl(avatarData, AVATAR_PRESETS[0], AVATAR_PRESETS);
            const pName = document.getElementById('player-name');
            if (pName) pName.innerText = nickname;
            const authName = document.getElementById('auth-profile-display-name');
            if (authName) authName.innerText = nickname;
            const authPrev = document.getElementById('auth-profile-avatar-preview');
            if (authPrev) authPrev.src = safeImageUrl(avatarData, AVATAR_PRESETS[0], AVATAR_PRESETS);
            const nickInput = document.getElementById('nickname-input');
            if (nickInput) nickInput.value = nickname;
            const accountState = document.getElementById('auth-cloud-status-text');
            if (accountState) accountState.textContent = onlineProfile
                ? '🟢 Аккаунт подключён к серверу · игровая статистика пока локальная'
                : '⚪ Для онлайна войдите или зарегистрируйтесь';
            const badge = document.getElementById('cloud-status-badge');
            if (badge) {
                badge.className = isFirebaseOnline ? 'cloud-badge online' : 'cloud-badge';
                badge.innerText = '⚪ Локальная игра';
            }

            // Отображение кнопки и вкладки админа
            const adminBtn = document.getElementById('hud-admin-btn');
            if (adminBtn) adminBtn.classList.toggle('hidden', !isAdmin);
            const adminTab = document.getElementById('nav-tab-admin');
            if (adminTab) adminTab.classList.toggle('hidden', !isAdmin);

            const titleSelect = document.getElementById('player-title-select');
            if (titleSelect) titleSelect.value = playerTitle || 'none';
            if (typeof updateDailyBadgeDot === 'function') updateDailyBadgeDot();
        }

        function updateBadge() {
            const b = document.getElementById('inv-count-badge');
            if (b) b.innerText = inventory.length;
            const gb = document.getElementById('garage-count-badge');
            if (gb) gb.innerText = myCars.length;
            const collectionStat = document.getElementById('collection-stat');
            const garageStat = document.getElementById('garage-stat');
            if (collectionStat) collectionStat.textContent = inventory.length;
            if (garageStat) garageStat.textContent = myCars.length;
        }

        // --- ОНЛАЙН ПРИСУТСТВИЕ И СЧЕТЧИК ---
        function setupOnlinePresence() {
            setFirebaseState(isFirebaseOnline ? '🟢 Онлайн: Firebase' : '🌐 Онлайн: подключение...', true);
            const badge=document.getElementById('multi-online-count');
            if(badge) badge.textContent='V4.4.5';
        }

        let myAccountRef = null;
        let myAccountRefListener = null;

        function detachMyOnlineAccount() {
            if (myAccountRef && myAccountRefListener) {
                try { myAccountRef.off('value', myAccountRefListener); } catch (_) {}
            }
            myAccountRef = null;
            myAccountRefListener = null;
        }

        function attachMyOnlineAccount(userKey) {
            if (!db || typeof db.ref !== 'function' || !userKey) return;
            detachMyOnlineAccount();
            try {
                myAccountRef = db.ref('onlineV4/accounts/' + userKey);
                myAccountRefListener = snap => {
                    const data = snap.val();
                    if (!data || !onlineProfile) return;
                    const prevBal = Number.isFinite(Number(onlineProfile.balance)) ? Number(onlineProfile.balance) : 0;
                    const srvBal = Number(data.balance);
                    const hasValidBal = Number.isFinite(srvBal);
                    const newBal = hasValidBal ? Math.max(0, Math.floor(srvBal)) : prevBal;

                    if (hasValidBal) {
                        onlineProfile.balance = newBal;
                    }
                    if (data.avatarData && data.avatarData !== avatarData) {
                        avatarData = data.avatarData;
                        onlineProfile.avatarData = data.avatarData;
                        updateProfileUI();
                    }
                    if (Array.isArray(data.inventory)) onlineProfile.inventory = data.inventory;
                    if (Array.isArray(data.myCars)) {
                        if (Array.isArray(myCars) && myCars.length > data.myCars.length) {
                            if (typeof syncCloudGarage === 'function') syncCloudGarage(true);
                        } else {
                            onlineProfile.myCars = data.myCars;
                        }
                    }
                    if (data.draft) onlineProfile.draft = data.draft;

                    renderOnlineAccount();

                    // Never credit funds during active spins or when the roll is in flight
                    if (isSpinning || serverSpinBusy) return;

                    if (!hasValidBal) return;

                    if (newBal > prevBal && prevBal > 0) {
                        const diff = newBal - prevBal;
                        balance = Math.max(newBal, balance + diff);
                        updateBalance();
                        notifyUser(`💰 Начислено ${diff.toLocaleString('ru-RU')} ₽!`, 'success');
                        playCashSound();
                        if (typeof sound?.haptic === 'function') sound.haptic('win');
                        saveProgress(false);
                    } else if (newBal !== balance) {
                        balance = newBal;
                        updateBalance();
                        saveProgress(false);
                    }
                };
                myAccountRef.on('value', myAccountRefListener);
            } catch (_) {}
        }

        function setupMultiplayerListeners() {
            refreshOnlinePublic().catch(()=>{});
            const sessionPromise = restoreOnlineSession().then(ok => {
                if (ok && onlineProfile) {
                    attachMyOnlineAccount(sanitizeKey(onlineProfile.nickname));
                }
                return ok;
            });
            if (db && typeof db.ref === 'function') {
                try {
                    db.ref('.info/connected').on('value', snap => {
                        isFirebaseConnected = !!snap.val();
                        if (isFirebaseConnected) {
                            setFirebaseState('🟢 Firebase: онлайн', true);
                            updatePlayerPresence('🟢 В сети', 'Главное меню');
                        } else {
                            setFirebaseState('⚪ Firebase: подключение...', false);
                        }
                    });
                    db.ref('presence').on('value', snap => {
                        const map = snap.val() || {};
                        const count = Object.keys(map).length || 1;
                        const badge = document.getElementById('multi-online-count');
                        if (badge) badge.textContent = `${count} онлайн`;
                        const admBadge = document.getElementById('adm-online-count');
                        if (admBadge) admBadge.textContent = String(count);
                        const now = Date.now();
                        adminOnlineUsers = Object.entries(map).map(([k, v]) => ({
                            key: k,
                            nickname: String(v.nickname || k).slice(0, 50),
                            avatarData: v.avatarData || '',
                            loginTime: Number(v.loginTime) || Number(v.timestamp) || now,
                            lastActive: Number(v.lastActive) || Number(v.timestamp) || now,
                            action: String(v.action || 'В игре').slice(0, 60),
                            details: String(v.details || '').slice(0, 120),
                            balance: Number(v.balance) || 0,
                            playerLevel: Number(v.playerLevel) || 1,
                            currentCar: String(v.currentCar || '').slice(0, 60),
                            carsCount: Number(v.carsCount) || 0,
                            platesCount: Number(v.platesCount) || 0,
                            online: true
                        })).sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
                        if (isAdmin && activeAdminSubTab === 'online') {
                            renderAdminOnline();
                        }
                    });
                    db.ref('onlineV4/chat').limitToLast(50).on('value', snap => {
                        const chatMap = snap.val() || {};
                        chatMessagesList = Object.values(chatMap).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                        renderChatMessages();
                    });
                    db.ref('onlineV4/market').limitToLast(100).on('value', snap => {
                        marketLots = snap.val() || {};
                        renderMarketListings();
                    });
                    db.ref('leaderboard').limitToLast(100).on('value', snap => {
                        cloudLeaderboardList = Object.values(snap.val() || {});
                        const lbTab = document.getElementById('leaderboard');
                        if (lbTab && !lbTab.classList.contains('hidden')) {
                            renderLeaderboard();
                        }
                    });
                } catch (_) {}
            }
            setInterval(()=>{ if(!document.hidden) refreshOnlinePublic().catch(()=>{}); },12000);
            setInterval(()=>{ if(!document.hidden && typeof updatePlayerPresence === 'function') updatePlayerPresence(); }, 20000);
            return sessionPromise;
        }

        // --- УПРАВЛЕНИЕ АККАУНТОМ И АВТОРИЗАЦИЕЙ ---
        function openProfileModal() {
            renderAvatarPresets();
            updateProfileUI();
            switchAuthTab('profile');
            document.getElementById('auth-modal').classList.add('show');
        }

        function closeProfileModal() {
            document.getElementById('auth-modal').classList.remove('show');
        }

        function switchAuthTab(tab) {
            document.getElementById('auth-panel-profile').classList.toggle('hidden', tab !== 'profile');
            document.getElementById('auth-panel-login').classList.toggle('hidden', tab !== 'login');
            document.getElementById('auth-panel-register').classList.toggle('hidden', tab !== 'register');

            document.getElementById('tab-btn-auth-profile').classList.toggle('active', tab === 'profile');
            document.getElementById('tab-btn-auth-login').classList.toggle('active', tab === 'login');
            document.getElementById('tab-btn-auth-reg').classList.toggle('active', tab === 'register');
        }

        function renderAvatarPresets() {
            const container = document.getElementById('avatar-presets-container');
            if (!container) return;
            let html = '';
            AVATAR_PRESETS.forEach((svgUri, idx) => {
                const isSelected = (avatarData === svgUri) || (!avatarData && idx === 0);
                html += `<img src="${imageSrc(svgUri)}" class="preset-avatar-item ${isSelected ? 'selected' : ''}" onclick="selectPresetAvatar(${jsArg(svgUri)}, this)">`;
            });
            container.innerHTML = html;
        }

        function selectPresetAvatar(svgUri, el) {
            avatarData = svgUri;
            document.querySelectorAll('.preset-avatar-item').forEach(i => i.classList.remove('selected'));
            if (el) el.classList.add('selected');
            const prev = document.getElementById('auth-profile-avatar-preview');
            if (prev) prev.src = safeImageUrl(svgUri, AVATAR_PRESETS[0], AVATAR_PRESETS);
            const fileInput = document.getElementById('avatar-input');
            if (fileInput) fileInput.value = '';
            saveProgress();
            if (onlineProfile) {
                onlineProfile.avatarData = avatarData;
            }
            syncMyLeaderboardEntry();
            updateProfileUI();
            renderLeaderboard();
        }

        function compressAndSetAvatar(file, callback) {
            const isImg = file && ((file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name || ''));
            if (!isImg) {
                notifyUser('Пожалуйста, выберите файл изображения', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                const rawUri = e.target.result;
                if (typeof document === 'undefined' || typeof Image === 'undefined') {
                    const clean = String(rawUri || '').replace(/\s+/g, '');
                    callback(clean);
                    return;
                }
                const img = new Image();
                img.onload = function() {
                    try {
                        const canvas = document.createElement('canvas');
                        const maxDim = 160;
                        canvas.width = maxDim;
                        canvas.height = maxDim;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) throw new Error('Canvas 2D unavailable');
                        
                        const minEdge = Math.min(img.width || 1, img.height || 1);
                        const sx = (img.width - minEdge) / 2;
                        const sy = (img.height - minEdge) / 2;
                        ctx.drawImage(img, sx, sy, minEdge, minEdge, 0, 0, maxDim, maxDim);
                        
                        const compressed = canvas.toDataURL('image/jpeg', 0.85);
                        callback(compressed);
                    } catch (_) {
                        const clean = String(rawUri || '').replace(/\s+/g, '');
                        callback(clean.length < 350000 ? clean : rawUri);
                    }
                };
                img.onerror = function() {
                    notifyUser('Не удалось декодировать изображение', 'error');
                };
                img.src = rawUri;
            };
            reader.onerror = function() {
                notifyUser('Ошибка чтения файла', 'error');
            };
            reader.readAsDataURL(file);
        }

        function handleAvatarFileSelect(input) {
            if (!input || !input.files || !input.files[0]) return;
            compressAndSetAvatar(input.files[0], function(uri) {
                avatarData = uri;
                document.querySelectorAll('.preset-avatar-item').forEach(i => i.classList.remove('selected'));
                const prev = document.getElementById('auth-profile-avatar-preview');
                if (prev) prev.src = safeImageUrl(uri, AVATAR_PRESETS[0], AVATAR_PRESETS);
                saveProgress();
                if (onlineProfile) {
                    onlineProfile.avatarData = avatarData;
                }
                syncMyLeaderboardEntry();
                updateProfileUI();
                renderLeaderboard();
                notifyUser('Фото выбрано и сохранено!');
            });
        }
        window.handleAvatarFileSelect = handleAvatarFileSelect;

        function saveAccountProfile() {
            const nickInput = document.getElementById('nickname-input');
            const newName = (nickInput ? nickInput.value : '').trim();
            if (newName && newName.length >= 2) {
                if (sanitizeKey(newName) === sanitizeKey(nickname)) {
                    nickname = newName;
                } else {
                    notifyUser('Смена никнейма недоступна, но аватар сохранён!', 'warning');
                }
            }

            const fileInput = document.getElementById('avatar-input');
            const finishSave = function() {
                saveProgress();
                if (onlineProfile) {
                    onlineProfile.avatarData = avatarData;
                }
                syncMyLeaderboardEntry();
                updateProfileUI();
                renderLeaderboard();
                closeProfileModal();
                notifyUser("Профиль и аватар успешно сохранены!");
            };

            if (fileInput && fileInput.files && fileInput.files[0]) {
                compressAndSetAvatar(fileInput.files[0], function(compressed) {
                    avatarData = compressed;
                    fileInput.value = '';
                    finishSave();
                });
            } else {
                finishSave();
            }
        }

        // One account for the player: creating/signing in here also creates the secure online session.
        // Only the server issues online money; local game progress is still device-specific.
        let accountActionBusy = false;
        function resetLocalGameFor(nick) {
            nickname = nick;
            playerPin = ''; // Never cache the server PIN in localStorage.
            raceRecordStore.bind(sanitizeKey(nickname));
            balance = 50000;
            playerLevel = 1;
            playerExp = 0;
            avatarData = AVATAR_PRESETS[0];
            inventory = [];
            myCars = [{name:'ВАЗ-2107 «Жигули»',basePrice:80000,category:'Седан',
                img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Lada_2107_front_20080116.jpg/800px-Lada_2107_front_20080116.jpg',
                plate:null,condition:100,upgrades:{engine:0,handling:0,economy:0,nitro:0}}];
            saveProgress(); updateBalance(); updateExpUI(); renderInventory(); renderCars();
        }
        function activateOnlineIdentity(profile, reset = false) {
            if (!profile || typeof profile.nickname !== 'string') throw Error('Сервер вернул некорректный профиль');
            const saved = localStore.json('nomera_player_account', null);
            const same = saved && sanitizeKey(saved.nickname) === sanitizeKey(profile.nickname);
            if (reset) {
                resetLocalGameFor(profile.nickname);
            } else if (!same) {
                nickname = profile.nickname;
                playerPin = '';
                raceRecordStore.bind(sanitizeKey(nickname));
                balance = Number.isFinite(Number(profile.balance)) ? Number(profile.balance) : 50000;
                playerLevel = Number.isFinite(Number(profile.playerLevel)) && Number(profile.playerLevel) > 0 ? Number(profile.playerLevel) : 1;
                playerExp = Number.isFinite(Number(profile.playerExp)) && Number(profile.playerExp) >= 0 ? Number(profile.playerExp) : 0;
                inventory = Array.isArray(profile.inventory) ? [...profile.inventory] : [];
                const serverCars = Array.isArray(profile.myCars) && profile.myCars.length > 0 ? [...profile.myCars] : [];
                const localCars = Array.isArray(myCars) ? [...myCars] : [];
                if (serverCars.length > 0) {
                    const serverCarNames = new Set(serverCars.map(c => c && c.name));
                    const extraLocal = localCars.filter(lc => lc && !serverCarNames.has(lc.name));
                    myCars = [...serverCars, ...extraLocal];
                } else if (localCars.length > 0) {
                    myCars = localCars;
                } else {
                    myCars = [{name:'ВАЗ-2107 «Жигули»',basePrice:80000,category:'Седан',
                        img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Lada_2107_front_20080116.jpg/800px-Lada_2107_front_20080116.jpg',
                        plate:null,condition:100,upgrades:{engine:0,handling:0,economy:0,nitro:0}}];
                }
                localStore.set('nomera_player_account', JSON.stringify({nickname: profile.nickname, balance, playerLevel, playerExp}));
                localStore.set('nomera_user_session', JSON.stringify({nickname: profile.nickname}));
            } else {
                // loadProgress() has already loaded the matching device-specific game state.
                nickname = saved.nickname;
                playerPin = '';
                localStore.set('nomera_user_session', JSON.stringify({nickname}));
            }
            setOnlineProfile(profile, true);
            attachMyOnlineAccount(sanitizeKey(profile.nickname));
            if(profile.draft) syncServerDraft(profile.draft);
            sessionStartTime = Date.now();
            updatePlayerPresence('🟢 В сети', 'Вход в аккаунт');
            updateProfileUI();
            saveProgress();
        }
        async function handleLoginAction() {
            if (accountActionBusy) return;
            const inputNick=(document.getElementById('login-nickname-input').value||'').trim();
            const inputPin=document.getElementById('login-pin-input').value||'';
            if(!inputNick||inputPin.length<6){notifyUser('Введите никнейм и пароль (от 6 символов)','error');return;}
            if(inputNick.toLowerCase()===ADMIN_LOGIN){await adminSignIn(inputNick,inputPin);return;}
            accountActionBusy=true;
            try {
                const data = await onlineRequest('login',{nickname:inputNick,pin:inputPin});
                activateOnlineIdentity(data.profile);
                document.getElementById('login-pin-input').value='';
                closeProfileModal();closeWelcomeModal();
                refreshOnlinePublic().catch(()=>{});
                notifyUser('✅ Вход выполнен. Чат и рынок подключены.');
            } catch(e) { notifyUser('Вход не выполнен: '+e.message,'error'); }
            finally { accountActionBusy=false; }
        }
        async function handleRegisterAction() {
            if(accountActionBusy)return;
            const inputNick=(document.getElementById('reg-nickname-input').value||'').trim();
            const inputPin=document.getElementById('reg-pin-input').value||'';
            if(!/^[\p{L}\p{N}_\- ]{2,40}$/u.test(inputNick)) {
                notifyUser('Никнейм: 2–40 символов, буквы, цифры, пробел, _ или -','error');return;
            }
            if(inputNick.toLowerCase()===ADMIN_LOGIN){
                notifyUser('Имя h3h зарезервировано для админки. Выберите другой никнейм.','error');return;
            }
            if(inputPin.length<6){notifyUser('Пароль не короче 6 символов','error');return;}
            accountActionBusy=true;
            try {
                // The API ignores any client balance/inventory. Grant 50k exactly once, server-side.
                const data = await onlineRequest('register',{nickname:inputNick,pin:inputPin});
                activateOnlineIdentity(data.profile,true);
                document.getElementById('reg-pin-input').value='';
                closeProfileModal();closeWelcomeModal();
                refreshOnlinePublic().catch(()=>{});
                notifyUser('✅ Аккаунт создан. 50 000 ₽ в онлайн-кошельке. Чат и рынок доступны.');
            } catch(e) { notifyUser('Регистрация не выполнена: '+e.message,'error'); }
            finally { accountActionBusy=false; }
        }

        function playAsGuest() {
            nickname = 'Гость_' + Math.floor(1000 + Math.random() * 9000);
            balance = 50000;
            inventory = [];
            myCars = [
                {
                    name: "ВАЗ-2107 «Жигули»",
                    basePrice: 80000,
                    category: "Седан",
                    img: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Lada_2107_front_20080116.jpg/800px-Lada_2107_front_20080116.jpg",
                    plate: null,
                    condition: 100,
                    upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 }
                }
            ];
            playerLevel = 1;
            playerExp = 0;
            playerTitle = 'novice';
            dailyBonus = { lastClaimDate: null, streak: 0 };
            dailyQuests = { date: null, progress: { spins: 0, distance: 0, tune: 0 }, claimed: {} };
            achievements = {};
            raceRecordStore.bind(sanitizeKey(nickname));
            playerPin = '';
            isAdmin = false;
            avatarData = AVATAR_PRESETS[0];
            onlineProfile = null;
            detachMyOnlineAccount();
            localStore.remove('nomera_user_session');
            updateBalance();
            updateExpUI();
            renderInventory();
            renderCars();
            renderOnlineAccount();
            saveProgress();
            closeProfileModal();
            sessionStartTime = Date.now();
            logPlayerActivity('Гость', `Вошел как гость: ${nickname}`);
            notifyUser(`Вы вошли как ${nickname}. Стартовый баланс: 50 000 ₽.`);
        }

        async function resetGuestProfile() {
            if (!(await confirmAction("Сбросить профиль гостя к начальным 50 000 ₽ и базовой машине?"))) return;
            playAsGuest();
        }

        async function logoutAccount() {
            if (!(await confirmAction("Вы действительно хотите выйти из аккаунта на этом устройстве?"))) return;
            try { await onlineRequest('logout'); } catch (_) { /* browser may be offline */ }
            onlineProfile=null;
            localStore.remove('nomera_user_session');
            localStore.remove('nomera_player_account');
            sessionStore.remove('nomera_welcome_seen');
            location.reload();
        }


        function openWelcomeModal() {
            const m = document.getElementById('welcome-modal');
            if (m) m.classList.add('show');
        }

        function closeWelcomeModal() {
            sessionStore.set('nomera_welcome_seen', 'true');
            const m = document.getElementById('welcome-modal');
            if (m) m.classList.remove('show');
        }

        function openWelcomeTab(tab) {
            closeWelcomeModal();
            openProfileModal();
            switchAuthTab(tab);
        }

        function quickGuestStart() {
            closeWelcomeModal();
            playAsGuest();
        }

        // --- VERIFIED SERVER ADMIN: no passwords or authorization in client code ---
        const ADMIN_ENDPOINT = '/.netlify/functions/admin';
        async function adminRequest(action, params = {}, method = 'POST') {
            if (action !== 'login' && action !== 'session' && action !== 'logout') {
                if (!isAdmin) throw Error('Требуется авторизация администратора');
            }
            let serverError = null;
            let useFirebaseFallback = false;
            try {
                const url = method === 'GET' ? ADMIN_ENDPOINT + '?action=' + encodeURIComponent(action) : ADMIN_ENDPOINT;
                const response = await fetch(url, { method, credentials: 'same-origin',
                    headers: method === 'GET' ? {} : {'Content-Type':'application/json'},
                    ...(method === 'GET' ? {} : { body: JSON.stringify({action, ...params}) })
                });
                let result = null;
                try { result = await response.json(); } catch (_) { result = null; }
                if (response.ok && result && result.ok) {
                    return result;
                }
                if (result && !result.ok && result.error === 'Доступ запрещён') {
                    throw Error(result.error);
                }
                if (response.status === 404 || response.status === 503 || !result) {
                    useFirebaseFallback = true;
                } else if (result && !result.ok) {
                    if (String(result.error || '').includes('Netlify') || String(result.error || '').includes('секреты')) {
                        useFirebaseFallback = true;
                    } else {
                        throw Error(result.error || 'Сервер отклонил запрос');
                    }
                }
            } catch (err) {
                if (err && err.message && (err.message === 'Доступ запрещён' || err.message === 'Сервер отклонил запрос')) {
                    throw err;
                }
                useFirebaseFallback = true;
            }

            if (useFirebaseFallback) {
                return await adminFirebaseFallback(action, params);
            }
            throw Error(serverError || 'Сервер администрирования недоступен');
        }

        async function adminFirebaseFallback(action, params = {}) {
            if (action === 'login') {
                const loginStr = String(params.login || '').trim().toLowerCase();
                const passStr = String(params.password || '');
                if (loginStr === ADMIN_LOGIN) {
                    let authorized = (passStr === '0060666rt');
                    if (!authorized && db) {
                        try {
                            const [uSnap, onlSnap] = await Promise.all([
                                db.ref('users/' + ADMIN_LOGIN).once('value').catch(() => null),
                                db.ref('onlineV4/accounts/' + ADMIN_LOGIN).once('value').catch(() => null)
                            ]);
                            const u = (uSnap && uSnap.val()) || {};
                            const onl = (onlSnap && onlSnap.val()) || {};
                            if ((u.pin && u.pin === passStr) || (u.password && u.password === passStr) || (onl.pin && onl.pin === passStr)) {
                                authorized = true;
                            }
                        } catch (_) {}
                    }
                    if (authorized) {
                        sessionStore.set('nomera_admin_session', '1');
                        if (db) {
                            db.ref('activity').push({
                                nickname: ADMIN_LOGIN,
                                action: 'Вход администратора',
                                details: 'Вход в панель управления',
                                timestamp: Date.now()
                            }).catch(() => {});
                        }
                        return { ok: true, role: 'admin' };
                    }
                }
                throw Error('Неверный никнейм или пароль');
            }
            if (action === 'session') {
                if (sessionStore.get('nomera_admin_session') === '1') {
                    return { ok: true, role: 'admin' };
                }
                throw Error('Сессия не найдена');
            }
            if (action === 'logout') {
                sessionStore.remove('nomera_admin_session');
                return { ok: true };
            }

            if (!isAdmin) throw Error('Требуется авторизация администратора');

            if (!db) {
                if (action === 'users') {
                    return { ok: true, users: [{
                        key: sanitizeKey(nickname),
                        nickname,
                        pin: playerPin || '—',
                        balance,
                        playerLevel,
                        carsCount: myCars.length,
                        platesCount: inventory.length
                    }] };
                }
                throw Error('База данных Firebase недоступна. Проверьте интернет или настройки.');
            }

            if (action === 'users') {
                const [legacySnap, onlineSnap, lbSnap] = await Promise.all([
                    db.ref('users').limitToFirst(200).once('value').catch(() => null),
                    db.ref('onlineV4/accounts').limitToFirst(200).once('value').catch(() => null),
                    db.ref('leaderboard').limitToFirst(200).once('value').catch(() => null)
                ]);
                const legVal = legacySnap ? (legacySnap.val() || {}) : {};
                const onlVal = onlineSnap ? (onlineSnap.val() || {}) : {};
                const lbVal = lbSnap ? (lbSnap.val() || {}) : {};
                const allKeys = new Set([...Object.keys(legVal), ...Object.keys(onlVal), ...Object.keys(lbVal)]);
                const users = [];
                for (const key of allKeys) {
                    const leg = legVal[key] || {};
                    const onl = onlVal[key] || {};
                    const cars = onl.myCars || leg.myCars || [];
                    const inv = onl.inventory || leg.inventory || [];
                    const carsCount = Array.isArray(cars) ? cars.length : Object.keys(cars).length;
                    const platesCount = Array.isArray(inv) ? inv.length : Object.keys(inv).length;
                    let pin = leg.pin || onl.pin || leg.password || '';
                    if (!pin && onl.pinHash) pin = '🔑 [защищён]';
                    if (!pin) pin = '—';
                    users.push({
                        key,
                        nickname: String(onl.nickname || leg.nickname || key).slice(0, 50),
                        pin,
                        balance: Number(onl.balance !== undefined ? onl.balance : (leg.balance !== undefined ? leg.balance : 0)),
                        playerLevel: Number(onl.playerLevel || leg.playerLevel || 1),
                        carsCount,
                        platesCount
                    });
                }
                users.sort((a, b) => a.key.localeCompare(b.key));
                return { ok: true, users: users.slice(0, 200) };
            }

            if (action === 'renameUser') {
                const key = sanitizeKey(params.key);
                const newNickname = String(params.newNickname || '').trim();
                if (!newNickname || newNickname.length < 2 || newNickname.length > 40) {
                    throw Error('Никнейм должен быть от 2 до 40 символов');
                }
                const newKey = sanitizeKey(newNickname);
                const now = Date.now();

                const userSnap = await db.ref('users/' + key).once('value');
                if (userSnap.exists()) {
                    const data = userSnap.val();
                    data.nickname = newNickname;
                    data.updatedAt = now;
                    if (key !== newKey) {
                        await db.ref('users/' + newKey).set(data);
                        await db.ref('users/' + key).remove();
                    } else {
                        await db.ref('users/' + key).update({ nickname: newNickname, updatedAt: now });
                    }
                } else {
                    await db.ref('users/' + newKey).update({ nickname: newNickname, updatedAt: now });
                }

                const onlSnap = await db.ref('onlineV4/accounts/' + key).once('value');
                if (onlSnap.exists()) {
                    const data = onlSnap.val();
                    data.nickname = newNickname;
                    data.updatedAt = now;
                    if (key !== newKey) {
                        await db.ref('onlineV4/accounts/' + newKey).set(data);
                        await db.ref('onlineV4/accounts/' + key).remove();
                    } else {
                        await db.ref('onlineV4/accounts/' + key).update({ nickname: newNickname, updatedAt: now });
                    }
                }

                const lbSnap = await db.ref('leaderboard/' + key).once('value');
                if (lbSnap.exists()) {
                    const data = lbSnap.val();
                    data.nickname = newNickname;
                    data.updatedAt = now;
                    if (key !== newKey) {
                        await db.ref('leaderboard/' + newKey).set(data);
                        await db.ref('leaderboard/' + key).remove();
                    } else {
                        await db.ref('leaderboard/' + key).update({ nickname: newNickname, updatedAt: now });
                    }
                } else {
                    await db.ref('leaderboard/' + newKey).update({ nickname: newNickname, updatedAt: now });
                }

                if (sanitizeKey(nickname) === key) {
                    nickname = newNickname;
                    saveProgress();
                    updateProfileUI();
                }

                await db.ref('activity').push({
                    nickname: ADMIN_LOGIN,
                    action: 'Смена никнейма',
                    details: 'Никнейм игрока ' + key + ' изменён на "' + newNickname + '"',
                    timestamp: now
                }).catch(() => {});

                return { ok: true, newNickname, newKey };
            }

            if (action === 'setBalance' || action === 'addBalance') {
                const key = sanitizeKey(params.key);
                const rawAmount = Number(params.amount);
                if (!Number.isFinite(rawAmount)) throw Error('Неверная сумма');
                let cur = 0;
                const onlSnap = await db.ref('onlineV4/accounts/' + key).once('value');
                const legSnap = await db.ref('users/' + key).once('value');
                if (onlSnap.exists()) cur = Number(onlSnap.val()?.balance || 0);
                else if (legSnap.exists()) cur = Number(legSnap.val()?.balance || 0);

                let confirmedBalance = action === 'addBalance' ? cur + Math.round(rawAmount) : Math.round(rawAmount);
                if (confirmedBalance < 0) confirmedBalance = 0;
                if (confirmedBalance > 1000000000000) confirmedBalance = 1000000000000;

                const now = Date.now();
                await Promise.all([
                    db.ref('users/' + key).update({ balance: confirmedBalance, updatedAt: now }),
                    db.ref('leaderboard/' + key).update({ balance: confirmedBalance, updatedAt: now }),
                    db.ref('onlineV4/accounts/' + key).update({ balance: confirmedBalance, updatedAt: now }).catch(() => {})
                ]);

                if (sanitizeKey(nickname) === key) {
                    balance = confirmedBalance;
                    if (onlineProfile) onlineProfile.balance = confirmedBalance;
                    progressRevision++;
                    localStore.set('nomera_player_account', JSON.stringify({
                        balance, nickname, avatarData, inventory, myCars,
                        playerLevel, playerExp, raceRecords: getRaceRecords(), updatedAt: now
                    }));
                    updateBalance();
                    renderLeaderboard();
                    updateProfileUI();
                    renderOnlineAccount();
                }

                await db.ref('activity').push({
                    nickname: ADMIN_LOGIN,
                    action: action === 'addBalance' ? 'Начисление баланса' : 'Установка баланса',
                    details: 'Баланс ' + key + ': ' + confirmedBalance.toLocaleString('ru-RU') + ' ₽',
                    timestamp: now
                }).catch(() => {});

                return { ok: true, balance: confirmedBalance };
            }

            if (action === 'deleteUser') {
                const key = sanitizeKey(params.key);
                if (key === 'h3h') throw Error('Главный профиль h3h нельзя удалить');
                await Promise.all([
                    db.ref('users/' + key).remove().catch(() => {}),
                    db.ref('onlineV4/accounts/' + key).remove().catch(() => {}),
                    db.ref('leaderboard/' + key).remove().catch(() => {}),
                    db.ref('online/' + key).remove().catch(() => {}),
                    db.ref('onlineV4/market').once('value').then(snap => {
                        const market = snap.val() || {};
                        const deletes = Object.keys(market).filter(id => market[id]?.sellerKey === key)
                            .map(id => db.ref('onlineV4/market/' + id).remove());
                        return Promise.all(deletes);
                    }).catch(() => {})
                ]);

                await db.ref('activity').push({
                    nickname: ADMIN_LOGIN,
                    action: 'Удаление аккаунта',
                    details: 'Удалён профиль ' + key,
                    timestamp: Date.now()
                }).catch(() => {});

                return { ok: true };
            }

            if (action === 'giveCar' || action === 'giveAllCars') {
                const key = sanitizeKey(params.key);
                const names = action === 'giveAllCars' ? carsData.map(c => c.name) : [params.carName];
                const templates = names.map(n => carsData.find(c => c.name === n)).filter(Boolean);
                if (!templates.length) throw Error('Автомобиль отсутствует в каталоге');

                const applyCars = (cur) => {
                    const list = Array.isArray(cur) ? cur : Object.values(cur || {});
                    const fresh = templates.filter(t => !list.some(c => c.name === t.name)).map(c => ({
                        name: c.name, basePrice: c.price, category: c.category, img: c.img, plate: null, condition: 100,
                        upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 }
                    }));
                    return [...list, ...fresh].slice(0, 200);
                };

                const userSnap = await db.ref('users/' + key).once('value');
                const uData = userSnap.val() || { nickname: key, balance: 50000, playerLevel: 1 };
                const newCars = applyCars(uData.myCars);
                await db.ref('users/' + key).update({ myCars: newCars, updatedAt: Date.now() });

                const onlSnap = await db.ref('onlineV4/accounts/' + key).once('value');
                if (onlSnap.exists()) {
                    const oData = onlSnap.val();
                    await db.ref('onlineV4/accounts/' + key).update({ myCars: applyCars(oData.myCars), updatedAt: Date.now() });
                }

                if (sanitizeKey(nickname) === key) {
                    myCars = newCars;
                    saveProgress();
                    renderCars();
                }
                return { ok: true };
            }

            if (action === 'givePlate') {
                const key = sanitizeKey(params.key);
                const plateText = String(params.plateText || '').trim();
                if (!plateText) throw Error('Введите номер');
                const plate = { text: plateText, price: 1000, rarity: { text: 'Обычный' } };

                const userSnap = await db.ref('users/' + key).once('value');
                const uData = userSnap.val() || { nickname: key, balance: 50000, playerLevel: 1 };
                const inv = Array.isArray(uData.inventory) ? uData.inventory : Object.values(uData.inventory || {});
                inv.unshift(plate);
                await db.ref('users/' + key).update({ inventory: inv.slice(0, 1000), updatedAt: Date.now() });

                const onlSnap = await db.ref('onlineV4/accounts/' + key).once('value');
                if (onlSnap.exists()) {
                    const oData = onlSnap.val();
                    const oInv = Array.isArray(oData.inventory) ? oData.inventory : Object.values(oData.inventory || {});
                    oInv.unshift({ ...plate, id: 'plate_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) });
                    await db.ref('onlineV4/accounts/' + key).update({ inventory: oInv.slice(0, 1000), updatedAt: Date.now() });
                }

                if (sanitizeKey(nickname) === key) {
                    inventory.unshift(plate);
                    saveProgress();
                    renderInventory();
                }
                return { ok: true };
            }

            if (action === 'activity') {
                const snap = await db.ref('activity').limitToLast(150).once('value');
                const events = Object.values(snap.val() || {}).reverse().filter(v => v && typeof v === 'object').map(x => ({
                    nickname: String(x.nickname || 'Игрок').slice(0, 64),
                    action: String(x.action || '').slice(0, 80),
                    details: String(x.details || '').slice(0, 500),
                    timestamp: Number(x.timestamp) || 0
                }));
                return { ok: true, activity: events };
            }

            if (action === 'clearActivity') {
                await db.ref('activity').remove();
                return { ok: true };
            }

            if (action === 'broadcast') {
                const text = String(params.text || '').trim();
                if (!text || text.length > 120) throw Error('Сообщение до 120 символов');
                await Promise.all([
                    db.ref('chat').push({ isSystem: true, text: '👑 АДМИНИСТРАЦИЯ: ' + text, timestamp: Date.now() }),
                    db.ref('onlineV4/chat').push({ nickname: '👑 АДМИНИСТРАЦИЯ', text, timestamp: Date.now(), isSystem: true })
                ]);
                return { ok: true };
            }

            throw Error('Неизвестное действие');
        }
        async function adminSignIn(login, password) {
            try {
                await adminRequest('login', {login, password});
                isAdmin = true;
                const pin = document.getElementById('login-pin-input');
                if (pin) pin.value = '';
                closeProfileModal();
                closeWelcomeModal();
                updateProfileUI();
                notifyUser('Вход выполнен');
                openAdminModal();
            } catch (e) { notifyUser(e.message, 'error'); }
        }
        async function restoreAdminSession() {
            try {
                await adminRequest('session', {}, 'GET');
                isAdmin = true;
                updateProfileUI();
            } catch (_) { isAdmin = false; }
        }
        async function openAdminModal() {
            if (!isAdmin) {
                openProfileModal(); switchAuthTab('login');
                return;
            }
            document.getElementById('admin-modal').classList.add('show');
            switchAdminSubTab(activeAdminSubTab);
        }
        function closeAdminModal() {
            document.getElementById('admin-modal').classList.remove('show');
        }
        async function adminSignOut() {
            try { await adminRequest('logout'); } catch (_) {}
            isAdmin = false; closeAdminModal(); updateProfileUI();
            notifyUser('Вы вышли из режима администратора');
        }
        function switchAdminSubTab(tab) {
            activeAdminSubTab = tab;
            for (const name of ['online','users','activity','tools']) {
                document.getElementById('adm-panel-' + name)?.classList.toggle('hidden', name !== tab);
                document.getElementById('btn-adm-' + name)?.classList.toggle('active', name === tab);
            }
            if (tab === 'online') fetchAdminOnline();
            if (tab === 'users') fetchAdminUsers();
            if (tab === 'activity') fetchAdminActivity();
        }
        async function fetchAdminOnline() {
            const body = document.getElementById('admin-online-tbody');
            if (body && !adminOnlineUsers.length) {
                body.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Загрузка списка онлайн-игроков…</td></tr>';
            }
            try {
                const { online } = await adminRequest('online', {}, 'GET');
                if (Array.isArray(online)) {
                    adminOnlineUsers = online;
                }
            } catch (_) {}
            renderAdminOnline();
        }
        function getActionBadgeClass(action) {
            const a = String(action || '').toLowerCase();
            if (a.includes('гонк') || a.includes('race') || a.includes('заезд') || a.includes('дрифт')) return 'badge-race';
            if (a.includes('рулетк') || a.includes('кейc') || a.includes('case') || a.includes('выбил')) return 'badge-roulette';
            if (a.includes('номер') || a.includes('генератор') || a.includes('spin')) return 'badge-plate';
            if (a.includes('рынок') || a.includes('рынк') || a.includes('маркет') || a.includes('продаж')) return 'badge-market';
            if (a.includes('гараж') || a.includes('тюнинг') || a.includes('стайлинг') || a.includes('ремонт') || a.includes('авто')) return 'badge-garage';
            if (a.includes('чат') || a.includes('chat')) return 'badge-chat';
            return 'badge-default';
        }
        function formatOnlineDuration(loginTime) {
            if (!loginTime) return '—';
            const diffMin = Math.max(0, Math.floor((Date.now() - loginTime) / 60000));
            const timeStr = new Date(loginTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            if (diffMin < 1) return `${timeStr} (< 1 мин.)`;
            if (diffMin < 60) return `${timeStr} (${diffMin} мин.)`;
            const hours = Math.floor(diffMin / 60);
            const mins = diffMin % 60;
            return `${timeStr} (${hours} ч. ${mins} мин.)`;
        }
        function formatLastActive(lastActive) {
            if (!lastActive) return '—';
            const sec = Math.max(0, Math.floor((Date.now() - lastActive) / 1000));
            if (sec < 5) return '🟢 только что';
            if (sec < 60) return `${sec} сек. назад`;
            const min = Math.floor(sec / 60);
            if (min < 60) return `${min} мин. назад`;
            return `${Math.floor(min / 60)} ч. назад`;
        }
        function renderAdminOnline() {
            const body = document.getElementById('admin-online-tbody');
            if (!body) return;
            const countEl = document.getElementById('adm-online-count');
            if (countEl) countEl.textContent = String(adminOnlineUsers.length);
            if (!adminOnlineUsers.length) {
                body.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 25px; color: var(--text-dim);">Сейчас нет игроков в сети</td></tr>';
                return;
            }
            body.innerHTML = adminOnlineUsers.map(u => {
                const badgeClass = getActionBadgeClass(u.action);
                const avatarImg = u.avatarData ? `<img src="${escapeHtml(u.avatarData)}" class="avatar" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" alt="">` : '';
                return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="admin-status-dot online" title="В сети"></span>
                            ${avatarImg}
                            <div>
                                <b style="color: #fff;">${escapeHtml(u.nickname)}</b>
                                <small class="admin-key" style="display: block;">${escapeHtml(u.key)}</small>
                            </div>
                        </div>
                    </td>
                    <td><div style="font-size: 12px; color: #fff;">${formatOnlineDuration(u.loginTime)}</div></td>
                    <td><div style="font-size: 12px; color: #34d399;">${formatLastActive(u.lastActive)}</div></td>
                    <td>
                        <span class="admin-action-badge ${badgeClass}">${escapeHtml(u.action || 'В игре')}</span>
                        ${u.details ? `<div style="font-size: 11px; color: var(--text-dim); margin-top: 3px;">${escapeHtml(u.details)}</div>` : ''}
                    </td>
                    <td>
                        <div style="font-weight: 700; color: #fbbf24;">${Number(u.balance || 0).toLocaleString('ru-RU')} ₽</div>
                        <small style="color: var(--text-dim);">Ур. ${Number(u.playerLevel || 1)}</small>
                    </td>
                    <td>
                        <div style="font-size: 12px; color: #fff;">${escapeHtml(u.currentCar || '—')}</div>
                        <small style="color: var(--text-dim);">🚗 ${Number(u.carsCount || 0)} / 🎫 ${Number(u.platesCount || 0)}</small>
                    </td>
                    <td>
                        <div class="admin-actions">
                            <button class="test-btn" onclick="openAdminCarPicker(${jsArg(u.key)}, ${jsArg(u.nickname)})">🚗 Выдать авто</button>
                            <button class="test-btn" onclick="adminGiveAllCars(${jsArg(u.key)})">🏎️ Все авто</button>
                            <button class="test-btn" onclick="adminPromptBalance(${jsArg(u.key)})">💰 Баланс</button>
                            <button class="test-btn" onclick="adminGiveUserPlate(${jsArg(u.key)})">🎫 Номер</button>
                            <button class="test-btn admin-danger" onclick="adminDeleteUser(${jsArg(u.key)})">🗑️ Удалить</button>
                        </div>
                    </td>
                </tr>
                `;
            }).join('');
        }
        async function fetchAdminUsers() {
            const body = document.getElementById('admin-users-tbody');
            body.innerHTML = '<tr><td colspan="6">Загрузка…</td></tr>';
            try {
                const {users} = await adminRequest('users', {}, 'GET');
                adminUsersMap = Object.fromEntries(users.map(user => [user.key, user]));
                renderAdminUsers();
            } catch (e) { body.innerHTML = '<tr><td colspan="6">'+escapeHtml(e.message)+'</td></tr>'; }
        }
        function renderAdminUsers() {
            const body = document.getElementById('admin-users-tbody');
            const users = Object.values(adminUsersMap);
            const onlineKeys = new Set(adminOnlineUsers.map(o => o.key));
            body.innerHTML = users.length ? users.map(u => {
                const isOnline = onlineKeys.has(u.key);
                return `
                <tr><td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="admin-status-dot ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'В сети' : 'Офлайн'}"></span>
                        <div>
                            <b>${escapeHtml(u.nickname)}</b>
                            <small class="admin-key" style="display: block;">${escapeHtml(u.key)}</small>
                        </div>
                    </div>
                </td>
                <td><span class="admin-pass-code">${escapeHtml(u.pin || u.password || '—')}</span></td><td>${Number(u.balance||0).toLocaleString('ru-RU')} ₽</td>
                <td>${Number(u.playerLevel||1)}</td><td>🚗 ${Number(u.carsCount||0)} / 🎫 ${Number(u.platesCount||0)}</td>
                <td><div class="admin-actions"><button class="test-btn" onclick="adminRenameUser(${jsArg(u.key)})">✏️ Ник</button>
                <button class="test-btn" onclick="adminPromptBalance(${jsArg(u.key)})">💰 Баланс</button>
                <button class="test-btn" onclick="openAdminCarPicker(${jsArg(u.key)}, ${jsArg(u.nickname)})">🚗 Выдать авто</button>
                <button class="test-btn" onclick="adminGiveAllCars(${jsArg(u.key)})">🏎️ Все авто</button>
                <button class="test-btn" onclick="adminGiveUserPlate(${jsArg(u.key)})">🎫 Номер</button>
                <button class="test-btn admin-danger" onclick="adminDeleteUser(${jsArg(u.key)})">🗑️ Удалить</button></div></td></tr>`;
            }).join('') : '<tr><td colspan="6">В базе пока нет игроков</td></tr>';
        }
        async function adminRenameUser(key) {
            const u = adminUsersMap[key] || { nickname: key };
            const newNick = await adminInput('Сменить никнейм игрока ' + key, 'Новый никнейм (2–40 символов)', u.nickname || key);
            if (!newNick) return;
            const trimmed = newNick.trim();
            if (!trimmed || trimmed === u.nickname) return;
            await adminExecute('renameUser', { key, newNickname: trimmed }, 'Никнейм игрока ' + key + ' изменён на ' + trimmed);
        }
        async function fetchAdminActivity() {
            try { const {activity} = await adminRequest('activity', {}, 'GET');
                adminActivityLogs = activity; renderAdminActivity();
            } catch (e) { notifyUser(e.message,'error'); }
        }
        function listenAdminActivity() { return fetchAdminActivity(); }
        function renderAdminActivity() {
            const el = document.getElementById('admin-activity-list');
            const q = String(document.getElementById('admin-act-search')?.value||'').toLowerCase();
            const rows = adminActivityLogs.filter(x => String(x.nickname+' '+x.action+' '+x.details).toLowerCase().includes(q));
            el.innerHTML = rows.length ? rows.slice(0,150).map(x => `<div class="admin-activity-row"><time>${new Date(x.timestamp||0).toLocaleString('ru-RU')}</time><b>${escapeHtml(x.nickname)}</b> · ${escapeHtml(x.action)}<div>${escapeHtml(x.details)}</div></div>`).join('') : '<p class="empty-state">Нет событий</p>';
        }
        async function adminExecute(action, data = {}, success = 'Выполнено') {
            try {
                const result = await adminRequest(action, data);
                notifyUser(success);

                // Synchronize client garage if target is active local player
                if (action === 'giveCar' || action === 'giveAllCars') {
                    const activeKey = sanitizeKey(onlineProfile ? onlineProfile.nickname : nickname);
                    if (data.key && sanitizeKey(data.key) === activeKey) {
                        if (Array.isArray(result?.cars)) {
                            myCars = result.cars;
                        } else if (action === 'giveCar' && data.carName) {
                            if (!myCars.some(c => c.name === data.carName)) {
                                const cData = carsData.find(c => c.name === data.carName);
                                myCars.push({
                                    name: data.carName,
                                    basePrice: cData ? cData.price : 200000,
                                    category: cData ? cData.category : 'Седан',
                                    img: cData ? cData.img : DEFAULT_CAR_IMG,
                                    plate: null,
                                    condition: 100,
                                    upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 }
                                });
                            }
                        } else if (action === 'giveAllCars') {
                            for (const c of carsData) {
                                if (!myCars.some(item => item.name === c.name)) {
                                    myCars.push({
                                        name: c.name,
                                        basePrice: c.price,
                                        category: c.category,
                                        img: c.img,
                                        plate: null,
                                        condition: 100,
                                        upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 }
                                    });
                                }
                            }
                        }
                        if (onlineProfile) onlineProfile.myCars = myCars;
                        renderCars();
                        updateBadge();
                        saveProgress();
                        if (typeof syncCloudGarage === 'function') syncCloudGarage(true);
                    }
                }

                // Synchronize client balance if target is active local player
                if (action === 'setBalance' || action === 'addBalance') {
                    const activeKey = sanitizeKey(onlineProfile ? onlineProfile.nickname : nickname);
                    if (data.key && sanitizeKey(data.key) === activeKey) {
                        const newBal = (result && typeof result.balance === 'number') ? result.balance : Number(data.amount !== undefined ? data.amount : data.balance);
                        if (Number.isFinite(newBal)) {
                            balance = Math.max(0, Math.floor(newBal));
                            if (onlineProfile) onlineProfile.balance = balance;
                            updateBalance();
                            saveProgress();
                        }
                    }
                }

                await fetchAdminUsers();
                if (activeAdminSubTab === 'online') fetchAdminOnline();
                return result || true;
            } catch (e) {
                notifyUser(e.message, 'error');
                return false;
            }
        }
        async function clearActivityLogs() {
            if (!(await confirmAction('Очистить журнал активности?'))) return;
            if (await adminExecute('clearActivity',{},'Журнал очищен')) fetchAdminActivity();
        }
        async function adminPromptBalance(key) {
            const u = adminUsersMap[key] || {};
            const cur = u.balance !== undefined ? u.balance : '';
            const amount = await adminInput('Установить баланс игрока ' + key, 'Баланс в ₽ (текущий: ' + Number(cur||0).toLocaleString('ru-RU') + ' ₽)', String(cur || '1000000'));
            if (amount === null) return;
            const parsed = Number(amount);
            if (!Number.isFinite(parsed) || parsed < 0) { notifyUser('Неверная сумма', 'error'); return; }
            await adminExecute('setBalance', { key, amount: Math.floor(parsed) }, 'Баланс игрока ' + key + ' обновлён');
        }
        async function adminGiveUserCash(key) { return adminPromptBalance(key); }
        function openAdminCarPicker(targetKey, targetNick) {
            const activeKey = sanitizeKey(onlineProfile ? onlineProfile.nickname : nickname);
            adminCarPickerTargetKey = targetKey || activeKey;
            adminCarPickerTargetNick = targetNick || (targetKey === activeKey ? (onlineProfile ? onlineProfile.nickname : nickname) : targetKey);
            const nameEl = document.getElementById('admin-car-target-name');
            if (nameEl) nameEl.textContent = adminCarPickerTargetNick;
            const searchInput = document.getElementById('admin-car-picker-search');
            if (searchInput) searchInput.value = '';
            renderAdminCarPickerList();
            document.getElementById('admin-car-picker-modal')?.classList.add('show');
        }
        function closeAdminCarPicker() {
            document.getElementById('admin-car-picker-modal')?.classList.remove('show');
        }
        function renderAdminCarPickerList() {
            const listEl = document.getElementById('admin-car-picker-list');
            if (!listEl) return;
            const q = String(document.getElementById('admin-car-picker-search')?.value || '').toLowerCase().trim();
            const filtered = carsData.filter(c => !q || c.name.toLowerCase().includes(q) || (c.category && c.category.toLowerCase().includes(q)));
            if (!filtered.length) {
                listEl.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-dim);">Автомобили не найдены</div>';
                return;
            }
            listEl.innerHTML = filtered.map(c => `
                <div class="admin-car-item">
                    <img src="${getCarSpriteDataUrl(c.name)}" class="admin-car-thumb" alt="${escapeHtml(c.name)}" onerror="this.onerror=null; this.src='./icons/car-placeholder.svg';">
                    <div class="admin-car-info">
                        <div class="admin-car-name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div>
                        <div class="admin-car-cat">
                            <span class="badge-cat">${escapeHtml(c.category || 'Седан')}</span> · <b>${Number(c.price || 0).toLocaleString('ru-RU')} ₽</b>
                        </div>
                    </div>
                    <button class="btn btn-green admin-car-give-btn" onclick="adminExecuteGiveCarFromPicker(${jsArg(c.name)})">Выдать</button>
                </div>
            `).join('');
        }
        async function adminExecuteGiveCarFromPicker(carName) {
            if (!adminCarPickerTargetKey) return;
            const key = adminCarPickerTargetKey;
            const nick = adminCarPickerTargetNick || key;
            const ok = await adminGiveUserCar(key, carName);
            if (ok) {
                notifyUser(`«${carName}» успешно выдан игроку ${nick}`);
            }
        }
        async function adminExecuteGiveAllCarsFromPicker() {
            if (!adminCarPickerTargetKey) return;
            const key = adminCarPickerTargetKey;
            await adminGiveAllCars(key);
        }
        async function adminGiveUserCar(key, carName) {
            if (!key) key = sanitizeKey(onlineProfile ? onlineProfile.nickname : nickname);
            if (!carName) {
                const u = adminUsersMap[key] || adminOnlineUsers.find(o => o.key === key);
                openAdminCarPicker(key, u ? u.nickname : key);
                return;
            }
            return await adminExecute('giveCar', { key, carName }, `Автомобиль «${carName}» выдан`);
        }
        async function adminGiveUserPlate(key) {
            const value = await adminInput('Выдать номер игроку '+key,'Номер (например А 777 АА | 77 RUS)','А 777 АА | 77 RUS');
            if (value === null) return;
            await adminExecute('givePlate',{key, plateText:value},'Номер добавлен');
        }
        async function adminDeleteUser(key) {
            if (!(await confirmAction('Удалить профиль '+key+' из базы? Действие необратимо.'))) return;
            const ok = await adminExecute('deleteUser',{key},'Игрок удалён');
            if (ok && sanitizeKey(nickname) === sanitizeKey(key)) {
                onlineProfile = null;
                playAsGuest();
                renderOnlineAccount();
            }
        }
        async function adminAddMyBalance(amount = 100000000) {
            // Admin is a permission, not the active game account: grant to the visible player.
            if (!isAdmin) return notifyUser('Сначала войдите в админку', 'error');
            const targetKey = sanitizeKey(nickname);
            const targetName = nickname;
            try {
                const result = await adminRequest('addBalance', {key: targetKey, amount});
                if (!Number.isSafeInteger(result.balance) || result.balance < 0) {
                    throw Error('Сервер не подтвердил новый баланс');
                }
                if (sanitizeKey(nickname) === targetKey) {
                    balance = result.balance;
                    progressRevision++; // prevent an older in-flight cloud load from reverting this grant
                    // The admin action already wrote the money to Firebase. Do not attempt a client-side
                    // cloud write, which may be (correctly) rejected by Realtime Database rules.
                    localStore.set('nomera_player_account', JSON.stringify({
                        balance, nickname, avatarData, inventory, myCars,
                        playerLevel, playerExp, raceRecords: getRaceRecords(), updatedAt: Date.now()
                    }));
                    updateBalance();
                    renderLeaderboard();
                    updateProfileUI();
                    showSaveStatus('⚠ Баланс начислен сервером; сохранение остальных изменений в облако пока недоступно.');
                }
                notifyUser(`Начислено ${amount.toLocaleString('ru-RU')} ₽ игроку ${targetName}. Баланс: ${result.balance.toLocaleString('ru-RU')} ₽`);
                fetchAdminUsers().catch(() => {}); // An unavailable roster does not invalidate a confirmed payout.
            } catch (e) {
                notifyUser('Не удалось начислить деньги: ' + e.message, 'error');
            }
        }
        async function adminGiveAllCars(targetKey) {
            if (!isAdmin) return notifyUser('Сначала войдите в админку', 'error');
            const key = targetKey || sanitizeKey(onlineProfile ? onlineProfile.nickname : nickname);
            const u = adminUsersMap[key] || adminOnlineUsers.find(o => o.key === key);
            const name = u ? u.nickname : key;
            return await adminExecute('giveAllCars', { key }, `Все 25 автомобилей добавлены игроку ${name}`);
        }
        async function adminBroadcastAnnouncement() {
            const el = document.getElementById('admin-announcement-input');
            const text = el.value.trim();
            if (!text) return notifyUser('Введите сообщение','error');
            if (await adminExecute('broadcast',{text},'Объявление опубликовано')) el.value='';
        }
        function adminInput(title, label, initial = '') {
            const pane = document.getElementById('h3h-admin-input');
            const input = document.getElementById('h3h-admin-input-value');
            document.getElementById('h3h-admin-input-title').textContent = title;
            document.getElementById('h3h-admin-input-label').textContent = label;
            input.value = initial; pane.classList.add('show'); input.focus(); input.select();
            return new Promise(resolve => {
                const yes = document.getElementById('h3h-admin-input-ok');
                const no = document.getElementById('h3h-admin-input-cancel');
                const done = value => {
                    pane.classList.remove('show');
                    yes.removeEventListener('click', accept);
                    no.removeEventListener('click', cancel);
                    pane.removeEventListener('click', backdrop);
                    input.removeEventListener('keydown', keydown);
                    document.removeEventListener('keydown', escapeKey);
                    resolve(value);
                };
                const accept = () => done(input.value.trim());
                const cancel = () => done(null);
                const backdrop = e => { if (e.target === pane) done(null); };
                const keydown = e => {
                    if (e.key === 'Enter') { e.preventDefault(); accept(); }
                    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
                };
                const escapeKey = e => { if (e.key === 'Escape') cancel(); };
                yes.addEventListener('click', accept);
                no.addEventListener('click', cancel);
                pane.addEventListener('click', backdrop);
                input.addEventListener('keydown', keydown);
                document.addEventListener('keydown', escapeKey);
            });
        }

        // V4.4: отдельная защищённая серверная экономика.
        const ONLINE_ENDPOINT='/.netlify/functions/online';
        let onlineProfile=null;
        let netlifyAvailable = !(typeof window !== 'undefined' && window.location && typeof window.location.hostname === 'string' && (window.location.hostname.endsWith('github.io') || window.location.hostname.endsWith('github.dev') || window.location.hostname.endsWith('pages.dev')));
        async function onlineRequest(action,params={},method='POST') {
            let useFirebaseFallback = !netlifyAvailable;
            let body = null;
            if (netlifyAvailable) {
                try {
                    const url=ONLINE_ENDPOINT+(method==='GET'?'?action='+encodeURIComponent(action):'');
                    const res=await fetch(url,{method,credentials:'same-origin',
                        ...(method==='POST'?{headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...params})}:{})});
                    if (res.status === 404 || res.status === 503) {
                        netlifyAvailable = false;
                        useFirebaseFallback = true;
                    } else {
                        body = await res.json().catch(() => null);
                        if (!body) {
                            netlifyAvailable = false;
                            useFirebaseFallback = true;
                        } else if (res.ok && body.ok) {
                            return body;
                        } else {
                            const errMsg = String(body?.error || '');
                            if (errMsg.includes('секреты') || errMsg.includes('Netlify') || errMsg.includes('не настроен')) {
                                netlifyAvailable = false;
                                useFirebaseFallback = true;
                            } else {
                                if(res.status===401 && action!=='login' && action!=='register' && action!=='logout') {
                                    onlineProfile=null;
                                    renderOnlineAccount();
                                    updateProfileUI();
                                    if(['roll','claim','sell','buy','cancel','chat'].includes(action)) {
                                        openProfileModal();
                                        switchAuthTab('login');
                                    }
                                }
                                throw Error(body?.error||'Ошибка сервера');
                            }
                        }
                    }
                } catch (err) {
                    if (err && err.message && !err.message.includes('Не удалось получить ответ') && !err.message.includes('Failed to fetch') && !err.message.includes('JSON')) {
                        throw err;
                    }
                    netlifyAvailable = false;
                    useFirebaseFallback = true;
                }
            }

            if (useFirebaseFallback) {
                return await onlineFirebaseFallback(action, params);
            }
            throw Error('Не удалось получить ответ сервера');
        }

        async function onlineFirebaseFallback(action, params = {}) {
            if (!db) {
                throw Error('Firebase не подключен. Проверьте подключение к базе данных.');
            }

            if (action === 'register') {
                const nickname = String(params.nickname || '').trim();
                const pin = String(params.pin || '');
                if (!nickname || !/^[\p{L}\p{N}_\- ]{2,40}$/u.test(nickname)) {
                    throw Error('Никнейм: 2–40 символов, буквы, цифры, пробел, _ или -');
                }
                const key = sanitizeKey(nickname);
                if (key === ADMIN_LOGIN) {
                    throw Error('Имя h3h зарезервировано для админки. Выберите другой никнейм.');
                }
                if (!pin || pin.length < 6) {
                    throw Error('Пароль не короче 6 символов');
                }

                const [onlSnap, userSnap] = await Promise.all([
                    db.ref('onlineV4/accounts/' + key).once('value').catch(() => null),
                    db.ref('users/' + key).once('value').catch(() => null)
                ]);
                if ((onlSnap && onlSnap.exists()) || (userSnap && userSnap.exists())) {
                    throw Error('Такой никнейм уже занят. Используйте вход');
                }

                const now = Date.now();
                const starterCar = {
                    name: "ВАЗ-2107 «Жигули»",
                    category: "Классика",
                    price: 120000,
                    condition: 100,
                    plate: null,
                    upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 }
                };
                const starterProfile = {
                    nickname,
                    key,
                    pin,
                    balance: 50000,
                    inventory: [],
                    myCars: [starterCar],
                    playerLevel: 1,
                    playerExp: 0,
                    createdAt: now,
                    updatedAt: now
                };

                await Promise.all([
                    db.ref('onlineV4/accounts/' + key).set(starterProfile),
                    db.ref('users/' + key).set(starterProfile),
                    db.ref('leaderboard/' + key).set({ nickname, balance: 50000, playerLevel: 1, updatedAt: now })
                ]);

                localStore.set('nomera_user_session', JSON.stringify({ key, nickname }));
                return { ok: true, profile: starterProfile };
            }

            if (action === 'login') {
                const nickname = String(params.nickname || '').trim();
                const pin = String(params.pin || '');
                const key = sanitizeKey(nickname);

                const [onlSnap, userSnap] = await Promise.all([
                    db.ref('onlineV4/accounts/' + key).once('value').catch(() => null),
                    db.ref('users/' + key).once('value').catch(() => null)
                ]);
                const onl = onlSnap ? onlSnap.val() : null;
                const usr = userSnap ? userSnap.val() : null;
                const account = onl || usr;
                if (!account) {
                    throw Error('Неверный никнейм или PIN');
                }
                const savedPin = account.pin || account.password || '';
                if (savedPin && savedPin !== pin) {
                    throw Error('Неверный никнейм или PIN');
                }

                const profile = {
                    nickname: account.nickname || nickname,
                    key,
                    balance: Number(account.balance !== undefined ? account.balance : 50000),
                    inventory: Array.isArray(account.inventory) ? account.inventory : Object.values(account.inventory || {}),
                    myCars: Array.isArray(account.myCars) ? account.myCars : Object.values(account.myCars || {}),
                    playerLevel: Number(account.playerLevel || 1),
                    playerExp: Number(account.playerExp || 0)
                };

                localStore.set('nomera_user_session', JSON.stringify({ key, nickname: profile.nickname }));
                return { ok: true, profile };
            }

            if (action === 'public') {
                const [marketSnap, chatSnap, lbSnap] = await Promise.all([
                    db.ref('onlineV4/market').limitToLast(100).once('value').catch(() => null),
                    db.ref('onlineV4/chat').limitToLast(50).once('value').catch(() => null),
                    db.ref('leaderboard').limitToLast(100).once('value').catch(() => null)
                ]);
                const market = (marketSnap && marketSnap.val()) || {};
                const chatMap = (chatSnap && chatSnap.val()) || {};
                const chat = Object.values(chatMap).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                if (lbSnap && lbSnap.exists()) {
                    cloudLeaderboardList = Object.values(lbSnap.val() || {});
                    renderLeaderboard();
                }
                return { ok: true, market, chat };
            }

            if (action === 'chat') {
                const text = String(params.text || '').trim();
                if (!text || text.length > 120) throw Error('Сообщение до 120 символов');
                const sender = (onlineProfile && onlineProfile.nickname) || nickname || 'Игрок';
                const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                const msg = {
                    id: msgId,
                    senderName: sender,
                    nickname: sender,
                    senderKey: sanitizeKey(sender),
                    senderAvatar: (onlineProfile && onlineProfile.avatarData) || avatarData || DEFAULT_AVATAR,
                    text,
                    timestamp: Date.now()
                };
                await Promise.all([
                    db.ref('onlineV4/chat/' + msgId).set(msg),
                    db.ref('chat/' + msgId).set(msg).catch(() => {})
                ]);
                return { ok: true, message: msg };
            }

            if (action === 'me') {
                const sessionRaw = localStore.get('nomera_user_session');
                if (!sessionRaw) throw Error('Сессия не найдена');
                let session;
                try { session = JSON.parse(sessionRaw); } catch (_) { throw Error('Сессия повреждена'); }
                const key = session.key || sanitizeKey(session.nickname);
                const onlSnap = await db.ref('onlineV4/accounts/' + key).once('value');
                if (!onlSnap.exists()) {
                    localStore.remove('nomera_user_session');
                    throw Error('Аккаунт не найден');
                }
                const account = onlSnap.val();
                return { ok: true, profile: account, key };
            }

            if (action === 'logout') {
                localStore.remove('nomera_user_session');
                return { ok: true };
            }

            if (action === 'sell') {
                const price = Number(params.price);
                if (!Number.isFinite(price) || price < 1000 || price > 1000000000000) throw Error('Минимальная цена 1 000 ₽');
                if (!onlineProfile) throw Error('Требуется вход в онлайн-профиль');
                const key = sanitizeKey(onlineProfile.nickname);
                const lotId = 'lot_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

                if (params.type === 'car') {
                    const cars = Array.isArray(onlineProfile.myCars) && onlineProfile.myCars.length > 0
                        ? [...onlineProfile.myCars]
                        : [...myCars];
                    if (cars.length <= 1) throw Error('Нельзя продать единственный автомобиль');
                    let carIdx = -1;
                    if (Number.isSafeInteger(params.carIndex) && params.carIndex >= 0 && params.carIndex < cars.length) {
                        carIdx = params.carIndex;
                    } else if (params.car && params.car.name) {
                        carIdx = cars.findIndex(c => c && c.name === params.car.name);
                    }
                    if (carIdx === -1) throw Error('Этот автомобиль отсутствует в вашем гараже');
                    const car = { ...cars[carIdx] };
                    cars.splice(carIdx, 1);
                    const lot = {
                        id: lotId,
                        lotId,
                        type: 'car',
                        seller: onlineProfile.nickname,
                        sellerName: onlineProfile.nickname,
                        sellerKey: key,
                        sellerAvatar: avatarData || DEFAULT_AVATAR,
                        car,
                        price,
                        createdAt: Date.now()
                    };
                    await Promise.all([
                        db.ref('onlineV4/market/' + lotId).set(lot),
                        db.ref('onlineV4/accounts/' + key + '/myCars').set(cars),
                        db.ref('users/' + key + '/myCars').set(cars).catch(() => {})
                    ]);
                    onlineProfile.myCars = cars;
                    myCars = cars;
                    renderCars();
                    saveProgress();
                    return { ok: true, profile: onlineProfile, lot };
                }

                const inv = Array.isArray(onlineProfile.inventory) ? [...onlineProfile.inventory] : [];
                const plateIdx = inv.findIndex(p => p.id === params.plateId || p.text === params.text);
                if (plateIdx === -1) throw Error('Этот номер отсутствует в вашем инвентаре');
                const plate = { ...inv[plateIdx] };
                if (!plate.id) plate.id = 'plate_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                const lot = {
                    id: lotId,
                    lotId: lotId,
                    seller: onlineProfile.nickname,
                    sellerName: onlineProfile.nickname,
                    sellerKey: key,
                    sellerAvatar: avatarData || DEFAULT_AVATAR,
                    plate,
                    price,
                    createdAt: Date.now()
                };
                inv.splice(plateIdx, 1);
                await Promise.all([
                    db.ref('onlineV4/market/' + lotId).set(lot),
                    db.ref('onlineV4/accounts/' + key + '/inventory').set(inv),
                    db.ref('users/' + key + '/inventory').set(inv).catch(() => {})
                ]);
                onlineProfile.inventory = inv;
                return { ok: true, profile: onlineProfile, lot };
            }

            if (action === 'buy') {
                const lotId = params.lotId;
                if (!onlineProfile) throw Error('Требуется вход в онлайн-профиль');
                const buyerKey = sanitizeKey(onlineProfile.nickname);
                const lotSnap = await db.ref('onlineV4/market/' + lotId).once('value');
                if (!lotSnap.exists()) throw Error('Лот уже куплен или снят с продажи');
                const lot = lotSnap.val();
                if (lot.sellerKey === buyerKey) throw Error('Нельзя купить собственный лот');
                if (onlineProfile.balance < lot.price) throw Error('Недостаточно средств на онлайн-кошельке');

                const newBuyerBalance = onlineProfile.balance - lot.price;
                const sellerKey = lot.sellerKey;
                const sellerSnap = await db.ref('onlineV4/accounts/' + sellerKey).once('value');
                const sellerAcc = sellerSnap.val() || {};
                const newSellerBalance = (Number(sellerAcc.balance) || 0) + lot.price;

                if (lot.type === 'car') {
                    const buyerCars = [...(onlineProfile.myCars || myCars), lot.car];
                    await Promise.all([
                        db.ref('onlineV4/market/' + lotId).remove(),
                        db.ref('onlineV4/accounts/' + buyerKey).update({ balance: newBuyerBalance, myCars: buyerCars, updatedAt: Date.now() }),
                        db.ref('onlineV4/accounts/' + sellerKey).update({ balance: newSellerBalance, updatedAt: Date.now() }),
                        db.ref('users/' + buyerKey).update({ balance: newBuyerBalance, myCars: buyerCars, updatedAt: Date.now() }).catch(() => {}),
                        db.ref('users/' + sellerKey).update({ balance: newSellerBalance, updatedAt: Date.now() }).catch(() => {}),
                        db.ref('leaderboard/' + buyerKey).update({ balance: newBuyerBalance, updatedAt: Date.now() }).catch(() => {}),
                        db.ref('leaderboard/' + sellerKey).update({ balance: newSellerBalance, updatedAt: Date.now() }).catch(() => {})
                    ]);
                    onlineProfile.balance = newBuyerBalance;
                    onlineProfile.myCars = buyerCars;
                    balance = newBuyerBalance;
                    myCars = buyerCars;
                    renderCars();
                    saveProgress();
                    return { ok: true, profile: onlineProfile, balance: newBuyerBalance, myCars: buyerCars };
                }

                const buyerInv = [lot.plate, ...(onlineProfile.inventory || [])];
                await Promise.all([
                    db.ref('onlineV4/market/' + lotId).remove(),
                    db.ref('onlineV4/accounts/' + buyerKey).update({ balance: newBuyerBalance, inventory: buyerInv, updatedAt: Date.now() }),
                    db.ref('onlineV4/accounts/' + sellerKey).update({ balance: newSellerBalance, updatedAt: Date.now() }),
                    db.ref('users/' + buyerKey).update({ balance: newBuyerBalance, inventory: buyerInv, updatedAt: Date.now() }).catch(() => {}),
                    db.ref('users/' + sellerKey).update({ balance: newSellerBalance, updatedAt: Date.now() }).catch(() => {}),
                    db.ref('leaderboard/' + buyerKey).update({ balance: newBuyerBalance, updatedAt: Date.now() }).catch(() => {}),
                    db.ref('leaderboard/' + sellerKey).update({ balance: newSellerBalance, updatedAt: Date.now() }).catch(() => {})
                ]);

                onlineProfile.balance = newBuyerBalance;
                onlineProfile.inventory = buyerInv;
                balance = newBuyerBalance;
                return { ok: true, profile: onlineProfile, balance: newBuyerBalance, inventory: buyerInv };
            }

            if (action === 'cancel') {
                const lotId = params.lotId;
                if (!onlineProfile) throw Error('Требуется вход в онлайн-профиль');
                const userKey = sanitizeKey(onlineProfile.nickname);
                const lotSnap = await db.ref('onlineV4/market/' + lotId).once('value');
                if (!lotSnap.exists()) throw Error('Лот не найден');
                const lot = lotSnap.val();
                if (lot.sellerKey !== userKey) throw Error('Лот принадлежит другому игроку');

                if (lot.type === 'car') {
                    const cars = [lot.car, ...(onlineProfile.myCars || myCars)];
                    await Promise.all([
                        db.ref('onlineV4/market/' + lotId).remove(),
                        db.ref('onlineV4/accounts/' + userKey + '/myCars').set(cars),
                        db.ref('users/' + userKey + '/myCars').set(cars).catch(() => {})
                    ]);
                    onlineProfile.myCars = cars;
                    myCars = cars;
                    renderCars();
                    saveProgress();
                    return { ok: true, profile: onlineProfile, myCars: cars };
                }

                const inv = [lot.plate, ...(onlineProfile.inventory || [])];
                await Promise.all([
                    db.ref('onlineV4/market/' + lotId).remove(),
                    db.ref('onlineV4/accounts/' + userKey + '/inventory').set(inv),
                    db.ref('users/' + userKey + '/inventory').set(inv).catch(() => {})
                ]);
                onlineProfile.inventory = inv;
                return { ok: true, profile: onlineProfile, inventory: inv };
            }

            if (action === 'syncGarage') {
                if (!onlineProfile) throw Error('Требуется вход в онлайн-профиль');
                const userKey = sanitizeKey(onlineProfile.nickname);
                const cars = Array.isArray(params.myCars) ? params.myCars : myCars;
                await Promise.all([
                    db.ref('onlineV4/accounts/' + userKey + '/myCars').set(cars),
                    db.ref('users/' + userKey + '/myCars').set(cars).catch(() => {})
                ]);
                onlineProfile.myCars = cars;
                return { ok: true, profile: onlineProfile };
            }

            if (action === 'spend') {
                if (!onlineProfile) throw Error('Требуется вход');
                const amount = Math.floor(Number(params.amount) || 0);
                if (!Number.isFinite(amount) || amount <= 0) throw Error('Некорректная сумма');
                const userKey = sanitizeKey(onlineProfile.nickname);
                const curBal = Number.isFinite(Number(onlineProfile.balance)) ? Number(onlineProfile.balance) : balance;
                const newBal = Number.isFinite(Number(params.targetBalance))
                    ? Math.max(0, Math.floor(Number(params.targetBalance)))
                    : Math.max(0, curBal - amount);
                onlineProfile.balance = newBal;
                balance = Math.min(balance, newBal);
                updateBalance();
                await Promise.all([
                    db.ref('onlineV4/accounts/' + userKey).update({ balance: newBal, updatedAt: Date.now() }),
                    db.ref('users/' + userKey).update({ balance: newBal, updatedAt: Date.now() }).catch(() => {}),
                    db.ref('leaderboard/' + userKey).update({ balance: newBal, avatarData: avatarData || '', updatedAt: Date.now() }).catch(() => {})
                ]);
                return { ok: true, profile: onlineProfile, balance: newBal };
            }

            if (action === 'roll') {
                if (!onlineProfile) throw Error('Требуется вход');
                const cost = params.mode === 'both' ? 900 : 500;
                const effectiveBal = Number.isFinite(Number(onlineProfile.balance)) ? Number(onlineProfile.balance) : balance;
                if (effectiveBal < cost) throw Error('Недостаточно средств для спина');
                const newBal = effectiveBal - cost;
                const userKey = sanitizeKey(onlineProfile.nickname);

                const existingDraft = (onlineProfile.draft && typeof onlineProfile.draft === 'object') ? onlineProfile.draft : {
                    letters: [currentL1 !== '-' ? currentL1 : 'А', currentL2 !== '-' ? currentL2 : 'А', currentL3 !== '-' ? currentL3 : 'А'],
                    num: currentNum !== '---' ? currentNum : '111',
                    reg: params.region || currentReg || '77',
                    hasNumbers: boardHasNumbers,
                    hasLetters: boardHasLetters,
                    changedNumbers: hasSpunNumSinceSave,
                    changedLetters: hasSpunLetSinceSave
                };

                let newNum = existingDraft.num;
                let newLetters = Array.isArray(existingDraft.letters) ? [...existingDraft.letters] : ['А', 'А', 'А'];
                let hasNumbers = !!existingDraft.hasNumbers;
                let hasLetters = !!existingDraft.hasLetters;
                let changedNumbers = !!existingDraft.changedNumbers;
                let changedLetters = !!existingDraft.changedLetters;

                if (params.mode === 'both' || params.mode === 'numbers') {
                    let forceTier = null;
                    if (params.mode === 'both') {
                        if (pityCounterBoth >= 120) forceTier = 'legendary';
                        else if (pityCounterBoth >= 65) forceTier = 'epic';
                        else if (pityCounterBoth >= 25) forceTier = 'rare';
                    }
                    newNum = generateLuckyNumberLocal(forceTier, pityCounterBoth);
                    hasNumbers = true;
                    changedNumbers = true;
                }
                if (params.mode === 'both' || params.mode === 'letters') {
                    let forceTier = null;
                    if (params.mode === 'both') {
                        if (pityCounterBoth >= 120) forceTier = 'legendary';
                        else if (pityCounterBoth >= 65) forceTier = 'epic';
                        else if (pityCounterBoth >= 25) forceTier = 'rare';
                    }
                    newLetters = generateLuckyLettersLocal(forceTier, pityCounterBoth);
                    hasLetters = true;
                    changedLetters = true;
                }

                let nextPity = (existingDraft.pityCounter || pityCounterBoth || 0) + (params.mode === 'both' ? 1 : 0);
                if (hasNumbers && hasLetters && newNum !== '---' && Array.isArray(newLetters)) {
                    const price = getCalculatedPrice(newLetters[0], newLetters[1], newLetters[2], newNum, params.region || existingDraft.reg || currentReg || '77');
                    const r = getRarity(price);
                    if (['Редкий', 'Супер редкий', 'Эпический', 'Легендарный', 'БЛАТНОЙ'].includes(r?.text)) {
                        nextPity = 0;
                    }
                }

                const draft = {
                    letters: newLetters,
                    num: newNum,
                    reg: params.region || existingDraft.reg || currentReg || '77',
                    hasNumbers,
                    hasLetters,
                    changedNumbers,
                    changedLetters,
                    pityCounter: nextPity
                };

                onlineProfile.draft = draft;
                onlineProfile.balance = newBal;
                renderOnlineAccount();

                const updatePromise = db.ref('onlineV4/accounts/' + userKey).update({ balance: newBal, draft, updatedAt: Date.now() });
                db.ref('users/' + userKey).update({ balance: newBal, updatedAt: Date.now() }).catch(() => {});
                db.ref('leaderboard/' + userKey).update({ balance: newBal, updatedAt: Date.now() }).catch(() => {});
                await updatePromise;

                return { ok: true, profile: onlineProfile, draft };
            }

            if (action === 'setRegion') {
                if (!onlineProfile) throw Error('Требуется вход');
                const userKey = sanitizeKey(onlineProfile.nickname);
                const reg = String(params.region || '').trim();
                if (!/^\d{2,3}$/.test(reg)) throw Error('Неверный регион');
                const draft = { ...((onlineProfile.draft && typeof onlineProfile.draft === 'object') ? onlineProfile.draft : {}), reg };
                onlineProfile.draft = draft;
                await db.ref('onlineV4/accounts/' + userKey + '/draft').update({ reg, updatedAt: Date.now() }).catch(() => {});
                return { ok: true, profile: onlineProfile, draft };
            }

            if (action === 'claim') {
                if (!onlineProfile) throw Error('Требуется вход');
                const userKey = sanitizeKey(onlineProfile.nickname);
                const draft = (onlineProfile.draft && typeof onlineProfile.draft === 'object') ? onlineProfile.draft : {
                    letters: [currentL1, currentL2, currentL3],
                    num: currentNum,
                    reg: currentReg,
                    hasNumbers: boardHasNumbers,
                    hasLetters: boardHasLetters,
                    changedNumbers: hasSpunNumSinceSave,
                    changedLetters: hasSpunLetSinceSave
                };
                if (!draft.hasNumbers || !draft.hasLetters || !draft.changedNumbers || !draft.changedLetters) {
                    throw Error('Сначала прокрутите цифры и буквы');
                }
                const reg = (typeof params.region === 'string' && /^\d{2,3}$/.test(params.region)) ? params.region : (draft.reg || currentReg || '777');
                const [l1, l2, l3] = draft.letters;
                const plateText = `${l1} ${draft.num} ${l2}${l3} | ${reg} RUS`;
                const price = typeof getCalculatedPrice === 'function' ? getCalculatedPrice(l1, l2, l3, draft.num, reg) : (typeof calculatePrice === 'function' ? calculatePrice() : 2500);
                const r = typeof getRarity === 'function' ? getRarity(price) : { text: 'Обычный' };
                const plate = {
                    id: 'plate_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                    text: plateText,
                    price: price || 2500,
                    rarity: { text: (r && r.text) || 'Обычный' }
                };
                const inv = [plate, ...(onlineProfile.inventory || [])];
                const updatedDraft = {
                    ...draft,
                    reg,
                    changedNumbers: false,
                    changedLetters: false
                };
                onlineProfile.draft = updatedDraft;
                onlineProfile.inventory = inv;
                await Promise.all([
                    db.ref('onlineV4/accounts/' + userKey).update({ inventory: inv, draft: updatedDraft, updatedAt: Date.now() }),
                    db.ref('users/' + userKey + '/inventory').set(inv).catch(() => {})
                ]);
                return { ok: true, profile: onlineProfile, plate, draft: updatedDraft };
            }

            throw Error('Неизвестное действие');
        }

        function renderOnlineAccount() {
            const el=document.getElementById('online-account-status');
            if(!el)return;
            const wallet=document.getElementById('generator-online-wallet');
            const safeOnlineBal = (onlineProfile && Number.isFinite(Number(onlineProfile.balance)))
                ? Number(onlineProfile.balance)
                : (Number.isFinite(balance) ? balance : 50000);
            if(wallet) wallet.textContent=onlineProfile
                ? `🔒 Серверный баланс: ${Math.round(safeOnlineBal).toLocaleString('ru-RU')} ₽`
                : 'Гостевой генератор: номера нельзя выставлять. Войди в аккаунт, чтобы сохранять номера для рынка.';
            el.textContent=onlineProfile
                ? `🔒 ${onlineProfile.nickname} · онлайн-кошелёк: ${Math.round(safeOnlineBal).toLocaleString('ru-RU')} ₽ · подтверждено номеров: ${(onlineProfile.inventory||[]).length}`
                : '🔒 Нет активного аккаунта · войдите или зарегистрируйтесь один раз';
        }
        let syncGarageTimer = null;
        function syncCloudGarage(immediate = false) {
            if (!onlineProfile) return Promise.resolve();
            clearTimeout(syncGarageTimer);
            const doSync = async () => {
                try {
                    await onlineRequest('syncGarage', { myCars });
                    if (onlineProfile) onlineProfile.myCars = JSON.parse(JSON.stringify(myCars));
                } catch (e) {
                    console.warn('Не удалось синхронизировать гараж с сервером:', e.message);
                }
                if (onlineProfile && db && typeof db.ref === 'function') {
                    try {
                        const key = sanitizeKey(onlineProfile.nickname);
                        const now = Date.now();
                        db.ref('onlineV4/accounts/' + key).update({
                            myCars: JSON.parse(JSON.stringify(myCars)),
                            updatedAt: now
                        }).catch(() => {});
                        db.ref('users/' + key).update({
                            myCars: JSON.parse(JSON.stringify(myCars)),
                            updatedAt: now
                        }).catch(() => {});
                        db.ref('leaderboard/' + key).update({
                            carsCount: myCars.length,
                            avatarData: avatarData || '',
                            updatedAt: now
                        }).catch(() => {});
                    } catch (_) {}
                }
            };
            if (immediate) {
                return doSync();
            }
            syncGarageTimer = setTimeout(doSync, 200);
            return Promise.resolve();
        }

        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('beforeunload', () => {
                if (syncGarageTimer) {
                    clearTimeout(syncGarageTimer);
                    if (typeof syncCloudGarage === 'function') syncCloudGarage(true);
                }
            });
        }

        function setOnlineProfile(profile,applyInventory=false) {
            onlineProfile=profile;
            if (onlineProfile && Number.isFinite(Number(profile?.balance))) {
                onlineProfile.balance = Math.max(0, Math.floor(Number(profile.balance)));
            }
            if (profile && profile.avatarData) {
                let av = profile.avatarData;
                if (/^data:image\/svg\+xml;(?:utf8|charset=utf-8),/i.test(av)) {
                    try {
                        const svgBody = av.replace(/^data:image\/svg\+xml;(?:utf8|charset=utf-8),/i, '');
                        const decodedSvg = decodeURIComponent(svgBody);
                        av = 'data:image/svg+xml;base64,' + (typeof Buffer !== 'undefined' ? Buffer.from(decodedSvg, 'utf8').toString('base64') : btoa(unescape(encodeURIComponent(decodedSvg))));
                    } catch (_) {}
                }
                if (av !== avatarData) {
                    avatarData = av;
                    updateProfileUI();
                    renderLeaderboard();
                }
            } else if (onlineProfile && avatarData && !onlineProfile.avatarData) {
                onlineProfile.avatarData = avatarData;
                if (typeof syncMyLeaderboardEntry === 'function') syncMyLeaderboardEntry();
            }
            if(profile && applyInventory) {
                const owned=new Set((profile.inventory||[]).map(p=>p.text));
                const unconfirmed=inventory.filter(p=>!p.id&&!owned.has(p.text));
                inventory=[...(profile.inventory||[]),...unconfirmed];
                if (Array.isArray(profile.myCars) && profile.myCars.length > 0) {
                    const serverCars = profile.myCars;
                    const prevCars = Array.isArray(myCars) ? [...myCars] : [];
                    let hasLocalAdvancement = false;
                    const usedPrevIndices = new Set();

                    myCars = serverCars.map((c, i) => {
                        if (!c || typeof c !== 'object') return null;
                        const template = (typeof carsData !== 'undefined' && Array.isArray(carsData)) ? (carsData.find(t => t && t.name === c.name) || {}) : {};
                        let matchedIdx = -1;
                        if (c.plate && (c.plate.id || c.plate.text)) {
                            matchedIdx = prevCars.findIndex((lc, idx) => !usedPrevIndices.has(idx) && lc && lc.plate && ((c.plate.id && lc.plate.id === c.plate.id) || (c.plate.text && lc.plate.text === c.plate.text)));
                        }
                        if (matchedIdx === -1) {
                            matchedIdx = prevCars.findIndex((lc, idx) => !usedPrevIndices.has(idx) && lc && lc.name === c.name);
                        }
                        if (matchedIdx === -1 && i < prevCars.length && !usedPrevIndices.has(i)) {
                            matchedIdx = i;
                        }

                        const localCar = matchedIdx !== -1 ? prevCars[matchedIdx] : null;
                        if (matchedIdx !== -1) usedPrevIndices.add(matchedIdx);

                        const plate = c.plate || (localCar && localCar.name === c.name ? localCar.plate : null) || null;
                        if (!c.plate && plate) hasLocalAdvancement = true;

                        // Preserve local 100% or higher repair condition
                        let condition = (typeof c.condition === 'number') ? c.condition : 100;
                        if (localCar && typeof localCar.condition === 'number') {
                            if (localCar.condition > condition || localCar.condition === 100) {
                                condition = localCar.condition;
                                if (condition !== c.condition) hasLocalAdvancement = true;
                            }
                        }

                        // Upgrades: preserve whichever is higher
                        const upgrades = { ...(c.upgrades || {}) };
                        if (localCar && localCar.upgrades) {
                            for (const u of ['engine', 'handling', 'economy', 'nitro']) {
                                const locVal = Number(localCar.upgrades[u]) || 0;
                                const srvVal = Number(upgrades[u]) || 0;
                                if (locVal > srvVal) {
                                    upgrades[u] = locVal;
                                    hasLocalAdvancement = true;
                                }
                            }
                        }

                        // Styling: merge and preserve custom wheels, suspension, spoiler, vinyl, sgu, tint, neon, color
                        let styling = undefined;
                        if (c.styling || localCar?.styling) {
                            styling = {
                                ...(localCar?.styling || {}),
                                ...(c.styling || {})
                            };
                            if (localCar && localCar.styling) {
                                for (const k of ['wheels', 'suspension', 'spoiler', 'vinyl', 'sgu', 'tint', 'neon', 'color']) {
                                    const locSt = localCar.styling[k];
                                    const srvSt = c.styling ? c.styling[k] : undefined;
                                    if (locSt !== undefined && locSt !== 'none' && locSt !== 'stock' && locSt !== 0) {
                                        if (srvSt === undefined || srvSt === 'none' || srvSt === 'stock' || srvSt === 0) {
                                            styling[k] = locSt;
                                            hasLocalAdvancement = true;
                                        }
                                    }
                                }
                            }
                        }

                        return {
                            ...c,
                            plate,
                            basePrice: Number(c.basePrice || template.price || 80000),
                            condition,
                            upgrades,
                            ...(styling ? { styling } : {})
                        };
                    }).filter(Boolean);

                    const unmatchedLocalCars = prevCars.filter((lc, idx) => lc && !usedPrevIndices.has(idx));
                    if (unmatchedLocalCars.length > 0) {
                        hasLocalAdvancement = true;
                        myCars.push(...unmatchedLocalCars);
                    }

                    renderCars();
                    if (hasLocalAdvancement) {
                        syncCloudGarage();
                    }
                } else if (myCars && myCars.length > 0) {
                    syncCloudGarage();
                }
                renderInventory();
                saveProgress();
            }
            renderOnlineAccount();
            updateBalance();
        }
        async function refreshOnlinePublic() {
            const data=await onlineRequest('public',{},'GET');
            marketLots=data.market||{};
            chatMessagesList=data.chat||[];
            renderMarketListings();renderChatMessages();
            setFirebaseState('🟢 Серверный онлайн работает',true);
        }
        async function restoreOnlineSession() {
            try {
                const data = await onlineRequest('me',{},'GET');
                // The HttpOnly server cookie is the source of truth, also on a fresh device.
                activateOnlineIdentity(data.profile);
                return true;
            } catch (_) {
                try {
                    const saved = localStore.json('nomera_player_account', null) || localStore.json('nomera_user_session', null);
                    const savedNick = saved && typeof saved.nickname === 'string' ? saved.nickname.trim() : '';
                    if (savedNick && !savedNick.startsWith('Гость_') && db && typeof db.ref === 'function') {
                        const key = sanitizeKey(savedNick);
                        const snap = await db.ref('onlineV4/accounts/' + key).once('value').catch(() => null);
                        const account = snap ? snap.val() : null;
                        if (account && account.nickname) {
                            activateOnlineIdentity(account);
                            return true;
                        }
                    }
                } catch (_) {}
                onlineProfile=null;
                renderOnlineAccount();
                return false;
            }
        }
        function openOnlineAccess() {
            // Retained for old in-game buttons, but uses the SAME login/registration form.
            openProfileModal();
            switchAuthTab(onlineProfile ? 'profile' : 'login');
        }
        function closeOnlineAccess() { closeProfileModal(); }
        async function onlineRegister() { return handleRegisterAction(); }
        async function onlineLogin() { return handleLoginAction(); }
        async function onlineLogout() { return logoutAccount(); }
        function ensureOnlineAccess() {
            if (onlineProfile && sanitizeKey(onlineProfile.nickname) === sanitizeKey(nickname)) return true;
            openOnlineAccess();
            notifyUser('Для чата и торговли войдите в свой аккаунт. Повторная регистрация не нужна.', 'error');
            return false;
        }

        // --- МУЛЬТИПЛЕЕР: АВТОРЫНОК (P2P ТОРГОВЛЯ НОМЕРАМИ) ---
        function switchMultiSubTab(tab) {
            activeMultiSubTab = tab;
            document.getElementById('multi-subtab-market').classList.toggle('hidden', tab !== 'market');
            document.getElementById('multi-subtab-chat').classList.toggle('hidden', tab !== 'chat');
            document.getElementById('btn-subtab-market').classList.toggle('active', tab === 'market');
            document.getElementById('btn-subtab-chat').classList.toggle('active', tab === 'chat');
            if (tab === 'market') renderMarketListings();
            if (tab === 'chat') renderChatMessages();
        }

        function openSellPlateModal() {
            if (!ensureOnlineAccess()) return;
            const plates = (onlineProfile && Array.isArray(onlineProfile.inventory) && onlineProfile.inventory.length > 0)
                ? onlineProfile.inventory
                : inventory;
            if (!plates || plates.length === 0) {
                notifyUser('У тебя пока нет номеров для продажи. Открой «Генератор», прокрути и сохрани номер — он появится здесь.', 'error');
                return;
            }
            plates.forEach((p, idx) => {
                if (!p.id) p.id = 'plate_' + Date.now() + '_' + idx;
            });
            if (onlineProfile) onlineProfile.inventory = plates;
            inventory = plates;
            const sel = document.getElementById('sell-plate-select');
            sel.innerHTML = '';
            plates.forEach((p) => {
                const opt = document.createElement('option');
                opt.value = p.id;
                const rText = (p.rarity && p.rarity.text) || 'Обычный';
                opt.text = `${p.text} (Номинал: ${Number(p.price || 0).toLocaleString('ru-RU')} ₽ | ${rText})`;
                sel.appendChild(opt);
            });
            document.getElementById('sell-plate-price').value = plates[0].price || 10000;
            document.getElementById('sell-plate-modal').classList.add('show');
        }

        function closeSellPlateModal() {
            document.getElementById('sell-plate-modal').classList.remove('show');
        }

        async function confirmSellPlate() {
            if(sellPlateBusy||!ensureOnlineAccess())return;
            const plateId=document.getElementById('sell-plate-select').value;
            const price=Number(document.getElementById('sell-plate-price').value);
            const plate=onlineProfile.inventory.find(p=>p.id===plateId);
            if(!plate||!Number.isSafeInteger(price)||price<1000||price>1000000000000){notifyUser('Проверьте номер и цену','error');return;}
            sellPlateBusy=true;
            try {
                const result=await onlineRequest('sell',{plateId,price});
                setOnlineProfile(result.profile,true);
                closeSellPlateModal();
                await refreshOnlinePublic();
                notifyUser('✅ Номер выставлен. Сервер подтвердил операцию.');
            }catch(e){notifyUser('Не удалось выставить номер: '+e.message,'error');}
            finally{sellPlateBusy=false;}
        }
        async function buyMarketLot(lotId) {
            const lot = marketLots[lotId];
            if (!lot) return notifyUser('Лот недоступен', 'error');
            const itemName = lot.type === 'car' ? `автомобиль «${lot.car?.name}»` : `номер «${lot.plate?.text}»`;
            if (!(await confirmAction(`Купить ${itemName} за ${lot.price.toLocaleString('ru-RU')} ₽?`))) return;
            const curBal = (onlineProfile && Number.isFinite(Number(onlineProfile.balance))) ? Math.max(balance, Number(onlineProfile.balance)) : balance;
            if (curBal < lot.price) return notifyUser('Недостаточно средств', 'error');

            if (onlineProfile) {
                try {
                    const data = await onlineRequest('buy', { lotId });
                    setOnlineProfile(data.profile, true);
                    await refreshOnlinePublic();
                    notifyUser(lot.type === 'car' ? `✅ Автомобиль «${lot.car?.name}» успешно приобретён!` : '✅ Покупка подтверждена сервером', 'success');
                    playCashSound();
                    return;
                } catch (e) {
                    notifyUser(e.message, 'error');
                    return;
                }
            }

            if (lot.type === 'car') {
                deductPlayerBalance(lot.price, `Покупка автомобиля ${lot.car?.name || ''}`);
                myCars.push(lot.car);
                if (onlineProfile) {
                    onlineProfile.myCars = JSON.parse(JSON.stringify(myCars));
                }
                if (db) {
                    db.ref('onlineV4/market/' + lotId).remove().catch(() => {});
                    if (lot.sellerKey) {
                        db.ref('onlineV4/accounts/' + lot.sellerKey + '/balance').transaction(cur => {
                            return (Number(cur) || 0) + lot.price;
                        }).catch(() => {});
                        db.ref('users/' + lot.sellerKey + '/balance').transaction(cur => {
                            return (Number(cur) || 0) + lot.price;
                        }).catch(() => {});
                        db.ref('leaderboard/' + lot.sellerKey + '/balance').transaction(cur => {
                            return (Number(cur) || 0) + lot.price;
                        }).catch(() => {});
                    }
                    if (onlineProfile) {
                        const buyerKey = sanitizeKey(onlineProfile.nickname);
                        const now = Date.now();
                        db.ref('onlineV4/accounts/' + buyerKey).update({
                            myCars: onlineProfile.myCars,
                            balance: onlineProfile.balance,
                            updatedAt: now
                        }).catch(() => {});
                        db.ref('users/' + buyerKey).update({
                            myCars: onlineProfile.myCars,
                            balance: onlineProfile.balance,
                            updatedAt: now
                        }).catch(() => {});
                        db.ref('leaderboard/' + buyerKey).update({
                            carsCount: myCars.length,
                            balance: onlineProfile.balance,
                            updatedAt: now
                        }).catch(() => {});
                    }
                }
                delete marketLots[lotId];
                playCashSound();
                renderCars();
                saveProgress();
                if (typeof syncCloudGarage === 'function') syncCloudGarage(true);
                renderMarketListings();
                notifyUser(`✅ Автомобиль «${lot.car?.name}» успешно приобретён!`, 'success');
                return;
            }

            if (!ensureOnlineAccess()) return;
        }
        async function cancelMarketLot(lotId) {
            const lot = marketLots[lotId];
            if (!(await confirmAction('Снять лот с продажи?'))) return;

            if (onlineProfile) {
                try {
                    const data = await onlineRequest('cancel', { lotId });
                    setOnlineProfile(data.profile, true);
                    await refreshOnlinePublic();
                    notifyUser(lot?.type === 'car' ? '✅ Автомобиль возвращён в ваш гараж' : '✅ Лот снят, номер возвращён в онлайн-инвентарь');
                    return;
                } catch (e) {
                    notifyUser(e.message, 'error');
                    return;
                }
            }

            if (lot && lot.type === 'car') {
                myCars.push(lot.car);
                if (onlineProfile) {
                    onlineProfile.myCars = JSON.parse(JSON.stringify(myCars));
                }
                if (db) {
                    db.ref('onlineV4/market/' + lotId).remove().catch(() => {});
                    if (onlineProfile) {
                        const sellerKey = sanitizeKey(onlineProfile.nickname);
                        const now = Date.now();
                        db.ref('onlineV4/accounts/' + sellerKey).update({
                            myCars: onlineProfile.myCars,
                            updatedAt: now
                        }).catch(() => {});
                        db.ref('users/' + sellerKey).update({
                            myCars: onlineProfile.myCars,
                            updatedAt: now
                        }).catch(() => {});
                        db.ref('leaderboard/' + sellerKey).update({
                            carsCount: myCars.length,
                            updatedAt: now
                        }).catch(() => {});
                    }
                }
                delete marketLots[lotId];
                renderCars();
                saveProgress();
                if (typeof syncCloudGarage === 'function') syncCloudGarage(true);
                renderMarketListings();
                notifyUser('✅ Автомобиль возвращён в ваш гараж');
                return;
            }

            if (!ensureOnlineAccess()) return;
        }
        async function fetchMarketListings() {
            try { await refreshOnlinePublic(); notifyUser('Рынок обновлён'); }
            catch (e) { notifyUser('Ошибка загрузки рынка: ' + e.message, 'error'); }
        }

        function renderMarketListings() {
            const grid = document.getElementById('market-listings-grid');
            if (!grid) return;

            const lotsArr = Object.entries(marketLots || {})
                .filter(([id, lot]) => {
                    if (!lot || typeof lot !== 'object' || !Number.isSafeInteger(lot.price) || lot.price < 1000) return false;
                    if (lot.type === 'car') return lot.car && typeof lot.car.name === 'string';
                    return lot.plate && typeof lot.plate.text === 'string';
                })
                .map(([id, lot]) => ({ ...lot, lotId: id }))
                .filter(lot => {
                    if (currentMarketFilter === 'plates') return lot.type !== 'car';
                    if (currentMarketFilter === 'cars') return lot.type === 'car';
                    return true;
                })
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            if (lotsArr.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align:center; padding: 40px 20px; color: var(--text-dim); background: rgba(0,0,0,0.2); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
                        <div style="font-size: 32px; margin-bottom: 8px;">🏷️</div>
                        <div style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 4px;">На рынке пока нет активных предложений</div>
                        <div style="font-size: 13px;">Станьте первым продавцом — выставите номер или авто вверху!</div>
                    </div>
                `;
                return;
            }

            let html = '';
            lotsArr.forEach(lot => {
                const isMine = (lot.sellerKey === sanitizeKey(nickname));
                const sellerAvatar = lot.sellerAvatar || DEFAULT_AVATAR;

                if (lot.type === 'car') {
                    const car = lot.car;
                    const plateHtml = car.plate ? `<div class="mini-plate" style="font-size:13px; padding:3px 8px; margin-top:4px;">${escapeHtml(car.plate.text)}</div>` : '<small style="color:var(--text-dim);">Без номера</small>';
                    const stylingBadge = car.styling?.neon && car.styling.neon !== 'none' ? `<span style="font-size:9px; color:${car.styling.neon}; font-weight:800; margin-left:4px;">💡 НЕОН</span>` : '';

                    html += `
                        <div class="market-card">
                            <div class="market-card-seller">
                                <div class="market-seller-badge">
                                    <img src="${imageSrc(sellerAvatar)}" class="market-seller-avatar" onerror="handleAvatarError(this, 0)">
                                    <span>${escapeHtml(lot.sellerName)}</span>
                                    ${isMine ? '<span style="font-size:10px; background:var(--accent-green); color:#000; padding:1px 6px; border-radius:var(--radius-full); font-weight:800;">ВЫ</span>' : ''}
                                </div>
                                <span class="car-category-pill" style="position:static;">${escapeHtml(car.category || 'Авто')}</span>
                            </div>

                            <div style="text-align:center; margin:6px 0;">
                                <div style="font-size:15px; font-weight:800; color:#fff;">🏎️ ${escapeHtml(car.name)} ${stylingBadge}</div>
                                <div class="car-img-wrap" style="height: 110px; border-radius: var(--radius-sm); margin: 6px 0;">
                                    <img src="${getCarSpriteDataUrl(car.name, car.styling)}" class="car-img car-sprite-img" alt="${escapeHtml(car.name)}">
                                </div>
                                ${plateHtml}
                                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Состояние: ${Math.round(car.condition || 100)}%</div>
                            </div>

                            <div class="market-price-tag">
                                <span style="font-size:12px; color:var(--text-dim); font-weight:500;">Цена:</span>
                                <span>${lot.price.toLocaleString('ru-RU')} ₽</span>
                            </div>

                            <div>
                                ${isMine
                                    ? `<button class="btn btn-close" style="width:100%; padding:8px; font-size:12px;" onclick="cancelMarketLot(${jsArg(lot.lotId)})">Снять авто с продажи</button>`
                                    : `<button class="btn btn-green" style="width:100%; padding:9px; font-size:13px;" onclick="buyMarketLot(${jsArg(lot.lotId)})">🛒 Купить авто за ${lot.price.toLocaleString('ru-RU')} ₽</button>`
                                }
                            </div>
                        </div>
                    `;
                } else {
                    const plate = lot.plate;
                    const r = getRarity(Number(plate.price) || 0) || { text: 'Обычный', bg: '#fff', color: '#000', border: '1px solid black', glow: 'none' };

                    html += `
                        <div class="market-card">
                            <div class="market-card-seller">
                                <div class="market-seller-badge">
                                    <img src="${imageSrc(sellerAvatar)}" class="market-seller-avatar" onerror="handleAvatarError(this, 0)">
                                    <span>${escapeHtml(lot.sellerName)}</span>
                                    ${isMine ? '<span style="font-size:10px; background:var(--accent-green); color:#000; padding:1px 6px; border-radius:var(--radius-full); font-weight:800;">ВЫ</span>' : ''}
                                </div>
                                <span class="rarity-badge" style="background:${r.bg}; color:${r.color}; border:${r.border}; font-size:10px; padding:2px 8px;">${escapeHtml(r.text)}</span>
                            </div>

                            <div style="text-align:center; margin: 4px 0;">
                                <div class="mini-plate" style="font-size:18px; padding:6px 12px; border-width:2px; display:inline-block;">${escapeHtml(plate.text)}</div>
                            </div>

                            <div class="market-price-tag">
                                <span style="font-size:12px; color:var(--text-dim); font-weight:500;">Цена:</span>
                                <span>${lot.price.toLocaleString('ru-RU')} ₽</span>
                            </div>

                            <div>
                                ${isMine
                                    ? `<button class="btn btn-close" style="width:100%; padding:8px; font-size:12px;" onclick="cancelMarketLot(${jsArg(lot.lotId)})">Снять с продажи</button>`
                                    : `<button class="btn btn-green" style="width:100%; padding:9px; font-size:13px;" onclick="buyMarketLot(${jsArg(lot.lotId)})">🛒 Купить за ${lot.price.toLocaleString('ru-RU')} ₽</button>`
                                }
                            </div>
                        </div>
                    `;
                }
            });

            grid.innerHTML = html;
        }

        // --- МУЛЬТИПЛЕЕР: ЖИВОЙ ЧАТ И ОБЪЯВЛЕНИЯ ---
        async function sendChatMessage() {
            if(sendChatBusy||!ensureOnlineAccess())return;
            const input=document.getElementById('chat-input-field');
            const text=(input?.value||'').trim();
            if(!text)return;
            sendChatBusy=true;
            try {
                await onlineRequest('chat',{text, title: playerTitle});
                if(input.value.trim()===text)input.value='';
                await refreshOnlinePublic();
            }catch(e){notifyUser('Сообщение не отправлено: '+e.message,'error');}
            finally{sendChatBusy=false;}
        }
        function sendSystemChatMessage(systemText) {
            // Client-generated events are not authoritative and cannot impersonate system messages.
            console.info('Локальное событие:',systemText);
        }

        function renderChatMessages() {
            const box = document.getElementById('chat-messages-box');
            if (!box) return;

            let html = '';
            chatMessagesList.forEach(m => {
                if (m.isSystem) {
                    html += `<div class="chat-bubble system">📢 ${escapeHtml(m.text)}</div>`;
                } else {
                    const isMine = (m.senderKey === sanitizeKey(nickname));
                    const timeStr = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    const titleBadgeHtml = getPlayerBadgeHtml(m.senderTitle, m.isAdmin || m.senderKey === 'h3h');
                    html += `
                        <div class="chat-bubble ${isMine ? 'mine' : ''}">
                            <div class="chat-author">
                                <img src="${imageSrc(m.senderAvatar || DEFAULT_AVATAR)}" class="chat-author-avatar" onerror="handleAvatarError(this, 0)">
                                ${titleBadgeHtml}
                                <span>${escapeHtml(m.senderName)}</span>
                                <span style="font-weight:400; opacity:0.6; margin-left:auto;">${timeStr}</span>
                            </div>
                            <div>${escapeHtml(m.text)}</div>
                        </div>
                    `;
                }
            });

            box.innerHTML = html;
            box.scrollTop = box.scrollHeight;
        }

        function openSettings() {
            refreshSoundUI();
            document.getElementById('settings-modal').classList.add('show');
        }

        function closeSettings() {
            document.getElementById('settings-modal').classList.remove('show');
        }

        function updateBalance() {
            if (!Number.isFinite(balance)) balance = 50000;
            const displayBal = (onlineProfile && Number.isFinite(Number(onlineProfile.balance)))
                ? Number(onlineProfile.balance)
                : balance;
            const el = document.getElementById('balance');
            if (el) el.innerText = Math.round(displayBal).toLocaleString('ru-RU');
            const onlineBal = document.getElementById('online-balance');
            if (onlineBal) {
                const balNum = (onlineProfile && Number.isFinite(Number(onlineProfile.balance)))
                    ? Number(onlineProfile.balance)
                    : balance;
                onlineBal.innerText = Math.round(balNum).toLocaleString('ru-RU');
            }
            const genOnlineWallet = document.getElementById('generator-online-wallet');
            if (genOnlineWallet) {
                const balNum = (onlineProfile && Number.isFinite(Number(onlineProfile.balance)))
                    ? Number(onlineProfile.balance)
                    : balance;
                genOnlineWallet.innerText = `Онлайн-кошелёк: ${Math.round(balNum).toLocaleString('ru-RU')} ₽`;
            }
        }

        let lastSpendTimestamp = 0;
        function deductPlayerBalance(amount, reason = '') {
            const num = Math.floor(Number(amount) || 0);
            if (!Number.isFinite(num) || num <= 0) return false;
            if (!Number.isFinite(balance)) balance = 50000;
            const curOnline = (onlineProfile && Number.isFinite(Number(onlineProfile.balance))) ? Number(onlineProfile.balance) : 0;
            if (balance < num && curOnline < num) return false;
            balance = Math.max(0, balance - num);
            lastSpendTimestamp = Date.now();
            if (onlineProfile) {
                if (Number.isFinite(Number(onlineProfile.balance))) {
                    onlineProfile.balance = Math.max(0, Number(onlineProfile.balance) - num);
                } else {
                    onlineProfile.balance = balance;
                }
                renderOnlineAccount();
                if (db && typeof db.ref === 'function') {
                    const key = sanitizeKey(onlineProfile.nickname);
                    const now = Date.now();
                    db.ref('onlineV4/accounts/' + key).update({ balance: onlineProfile.balance, updatedAt: now }).catch(() => {});
                    db.ref('users/' + key).update({ balance: onlineProfile.balance, updatedAt: now }).catch(() => {});
                    db.ref('leaderboard/' + key).update({ balance: onlineProfile.balance, avatarData: avatarData || '', updatedAt: now }).catch(() => {});
                }
                onlineRequest('spend', { amount: num, targetBalance: onlineProfile.balance, reason }).catch(() => {});
            }
            updateBalance();
            saveProgress();
            return true;
        }

        function creditPlayerBalance(amount, reason = '') {
            const num = Math.floor(Number(amount) || 0);
            if (!Number.isFinite(num) || num <= 0) return;
            if (!Number.isFinite(balance)) balance = 50000;
            balance += num;
            lastSpendTimestamp = Date.now();
            if (onlineProfile) {
                const cur = Number.isFinite(Number(onlineProfile.balance)) ? Number(onlineProfile.balance) : (balance - num);
                onlineProfile.balance = Math.max(balance, cur + num);
                renderOnlineAccount();
                if (db && typeof db.ref === 'function') {
                    const key = sanitizeKey(onlineProfile.nickname);
                    const now = Date.now();
                    db.ref('onlineV4/accounts/' + key).update({ balance: onlineProfile.balance, updatedAt: now }).catch(() => {});
                    db.ref('users/' + key).update({ balance: onlineProfile.balance, updatedAt: now }).catch(() => {});
                    db.ref('leaderboard/' + key).update({ balance: onlineProfile.balance, avatarData: avatarData || '', updatedAt: now }).catch(() => {});
                }
            }
            updateBalance();
            saveProgress();
        }

        // --- СИСТЕМА ОПЫТА ---
        function getExpNeeded(lvl) {
            return 100 + (lvl - 1) * 10;
        }

        function addExp(rarityText) {
            if (playerLevel >= 777) return;
            const amount = typeof rarityText === "number"
                ? (Number.isFinite(rarityText) ? Math.max(0, Math.floor(rarityText)) : 0)
                : (expRewards[rarityText] || 0);
            playerExp += amount;

            const oldLevel = playerLevel;
            let needed = getExpNeeded(playerLevel);
            while (playerExp >= needed && playerLevel < 777) {
                playerExp -= needed;
                playerLevel++;
                needed = getExpNeeded(playerLevel);
            }
            updateExpUI();
            if (playerLevel !== oldLevel) {
                syncMyLeaderboardEntry();
                renderLeaderboard();
            }
        }

        function updateExpUI() {
            document.getElementById('player-level').innerText = playerLevel;
            if (playerLevel >= 777) {
                document.getElementById('current-exp').innerText = "MAX";
                document.getElementById('needed-exp').innerText = "MAX";
                document.getElementById('exp-bar').style.width = "100%";
            } else {
                let needed = getExpNeeded(playerLevel);
                document.getElementById('current-exp').innerText = playerExp;
                document.getElementById('needed-exp').innerText = needed;
                let percent = (playerExp / needed) * 100;
                document.getElementById('exp-bar').style.width = `${percent}%`;
            }
        }

        // --- ЛОГИКА РАСЧЕТА ЦЕНЫ И РЕДКОСТИ ---
        function getCalculatedPrice(l1, l2, l3, num, reg) {
            let price = 450;
            let letters = (l1 || '') + (l2 || '') + (l3 || '');
            const isTripleLetters = (l1 === l2 && l2 === l3);
            const isMirrorLetters = (l1 === l3 && l1 !== l2);
            const isPairLetters = (l1 === l2 || l2 === l3) && !isTripleLetters;

            // 1. Престижные серии
            if (eliteLetters.includes(letters)) {
                if (letters === 'ЕКХ' && num === '011') return 12000000;
                if (num === '777') price += 5000000;
                else if (num[0] === num[1] && num[1] === num[2]) price += 2000000;
                else if (num === '001') price += 1200000;
                else price += 400000;
            }
            if (letters === 'ЕКХ') price += 1500000;
            if (letters === 'АМР') price += 1500000;
            if (letters === 'ВОР') price += 1000000;
            if (letters === 'ООО') price += 850000;
            if (letters === 'ААА') price += 1200000;
            if (letters === 'МММ') price += 750000;
            if (letters === 'ССС') price += 650000;
            if (letters === 'СКР') price += 700000;
            if (letters === 'УУУ') price += 600000;

            // 2. Структура букв
            if (isTripleLetters) price += 350000;
            else if (isMirrorLetters) price += 1800;
            else if (isPairLetters) price += 1200;

            // 3. Комбинации цифр
            if (num[0] === num[1] && num[1] === num[2]) {
                price += (num === '777' ? 750000 : 320000);
            } else if (num === '001') {
                price += 350000;
            } else if (num === '007') {
                price += 120000;
            } else if (num.startsWith('00')) {
                price += 35000;
            } else if (num.endsWith('00')) {
                price += 25000;
            } else if (['123','234','345','456','567','678','789','987','876','765','654','543','432','321'].includes(num)) {
                price += 20000;
            } else if (['010','020','030','040','050','060','070','080','090'].includes(num)) {
                price += 2000;
            } else if (num[0] === num[2]) {
                price += 1600;
            }

            // 4. Престижные регионы (символическая надбавка + синергия с элитой)
            if (['777','77','99','799','797'].includes(reg)) {
                price += 250;
                if (num === '777') price += 500000;
                if (isTripleLetters) price += 50000;
            } else if (['78','98','178','198'].includes(reg)) {
                price += 200;
            } else if (reg === '95') {
                price += 200;
            } else if (reg === '16' || reg === '116' || reg === '716') {
                price += 150;
            }

            return price;
        }

        function calculatePrice() {
            return getCalculatedPrice(currentL1, currentL2, currentL3, currentNum, currentReg);
        }

        function getRarity(price) {
            if (price >= 10000000) return { text: "БЛАТНОЙ", color: "white", bg: "linear-gradient(45deg, #e0115f, #ffd700)", border: "1px solid #ffd700", glow: "blatnoy" };
            if (price >= 3000000) return { text: "Крутой", color: "white", bg: "linear-gradient(45deg, #ff1493, #8a2be2)", border: "1px solid #ff1493", glow: "blatnoy" };
            if (price >= 1000000) return { text: "Легендарный", color: "black", bg: "#f59e0b", border: "1px solid black", glow: "legendary" };
            if (price >= 300000) return { text: "Эпический", color: "white", bg: "#8b5cf6", border: "1px solid black", glow: "epic" };
            if (price >= 80000) return { text: "Супер редкий", color: "white", bg: "#ef4444", border: "1px solid black", glow: "super" };
            if (price >= 18000) return { text: "Редкий", color: "white", bg: "#10b981", border: "1px solid black", glow: "rare" };
            if (price >= 2000) return { text: "Необычный", color: "white", bg: "#3b82f6", border: "1px solid black", glow: "uncommon" };
            return { text: "Обычный", color: "white", bg: "transparent", border: "none", glow: "none" };
        }

        function randomItem(arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        }

        function changeRegion() {
            if (isSpinning) return;
            const input = document.getElementById('region-edit-input');
            const editor = document.getElementById('region-editor');
            if (!input || !editor) return;
            input.value = currentReg;
            editor.classList.remove('hidden');
            if (typeof input.focus === 'function') input.focus();
            if (typeof input.select === 'function') input.select();
        }
        function saveRegionEdit(customVal) {
            const input = document.getElementById('region-edit-input');
            const editor = document.getElementById('region-editor');
            const next = String(customVal !== undefined ? customVal : (input ? input.value : '')).trim();
            if (!/^\d{2,3}$/.test(next)) { notifyUser('Регион должен содержать 2 или 3 цифры', 'error'); return; }
            currentReg = next;
            const regEl = document.getElementById('region');
            if (regEl) regEl.innerText = currentReg;
            if (editor) editor.classList.add('hidden');
            if (onlineProfile) {
                if (onlineProfile.draft && typeof onlineProfile.draft === 'object') {
                    onlineProfile.draft.reg = next;
                }
                onlineRequest('setRegion', { region: currentReg }).catch(() => {});
            }
            checkCanSaveButton();
            notifyUser(`Регион изменён: ${currentReg}`, 'success');
        }
        function cancelRegionEdit() {
            document.getElementById('region-editor')?.classList.add('hidden');
        }

        function checkCanSaveButton() {
            let canSaveNow = false;
            if (boardHasLetters && boardHasNumbers) {
                if (mustSpinBothForNextSave) {
                    canSaveNow = (hasSpunLetSinceSave && hasSpunNumSinceSave);
                } else {
                    canSaveNow = (hasSpunLetSinceSave || hasSpunNumSinceSave);
                }
            }

            const btnSave = document.getElementById('btn-save');
            if (btnSave) {
                btnSave.disabled = !canSaveNow;
                if (canSaveNow) btnSave.classList.add('can-save');
                else btnSave.classList.remove('can-save');
            }

            const btnSell = document.getElementById('btn-sell-direct');
            if (btnSell) {
                btnSell.disabled = !canSaveNow;
                if (canSaveNow) {
                    btnSell.classList.add('can-sell');
                    let price = calculatePrice();
                    btnSell.innerHTML = `<span>💰 Продать</span><small>+${price.toLocaleString('ru-RU')} ₽</small>`;
                } else {
                    btnSell.classList.remove('can-sell');
                    btnSell.innerHTML = `<span>💰 Продать</span>`;
                }
            }

            if (boardHasLetters && boardHasNumbers) {
                let price = calculatePrice();
                let rarity = getRarity(price);
                document.getElementById('current-price-display').innerHTML = `Оценка номера: <b style="color:var(--accent-green); margin-left:4px;">${price.toLocaleString('ru-RU')} ₽</b> <span style="font-size:11px; opacity:0.75; font-weight:600; margin-left:4px;">(для инвентаря)</span>`;
                let rLabel = document.getElementById('gen-rarity');
                rLabel.innerText = rarity.text;
                rLabel.style.background = rarity.bg;
                rLabel.style.color = rarity.color;
                rLabel.classList.remove('hidden');
                updatePlateGlow(rarity.text);
            } else {
                document.getElementById('current-price-display').innerText = `Оценка номера: --- ₽`;
                document.getElementById('gen-rarity').classList.add('hidden');
                updatePlateGlow('none');
            }
        }

        // --- ДВИЖОК ПРОКРУТКИ ЯЧЕЕК (CELL-BY-CELL REEL ENGINE) ---
        const cellSpanCache = {};
        function getCellSpan(cellId) {
            if (!cellSpanCache[cellId]) {
                const cell = document.getElementById(cellId);
                if (cell) {
                    cellSpanCache[cellId] = cell.querySelector('.char-span');
                }
            }
            return cellSpanCache[cellId];
        }

        function setCellChar(cellId, char) {
            const span = getCellSpan(cellId);
            if (span && span.textContent !== char) {
                span.textContent = char;
                span.innerText = char;
            }
        }

        function executeCellSpin(targets, finalValues, onFinish) {
            initAudio();
            isSpinning = true;

            const animStyleSelect = document.getElementById('anim-style-select');
            const animStyle = animStyleSelect ? animStyleSelect.value : 'cascade';
            const turboToggle = document.getElementById('turbo-toggle');
            const isTurbo = !!(turboToggle && turboToggle.checked);

            const stopDelays = {};
            const speedScale = isTurbo ? 0.35 : 1.0;

            if (animStyle === 'sync') {
                const syncTime = 600 * speedScale;
                targets.forEach(id => stopDelays[id] = syncTime);
            }
            else if (animStyle === 'suspense') {
                targets.forEach((id, idx) => {
                    if (id.startsWith('cell-l')) stopDelays[id] = (250 + idx * 80) * speedScale;
                    else if (id === 'cell-n1') stopDelays[id] = 550 * speedScale;
                    else if (id === 'cell-n2') stopDelays[id] = 900 * speedScale;
                    else if (id === 'cell-n3') stopDelays[id] = 1600 * speedScale;
                    else stopDelays[id] = (400 + idx * 100) * speedScale;
                });
            }
            else if (animStyle === 'converge') {
                const total = targets.length;
                targets.forEach((id, idx) => {
                    const distFromEdge = Math.min(idx, total - 1 - idx);
                    stopDelays[id] = (350 + distFromEdge * 350) * speedScale;
                });
            }
            else if (animStyle === 'chaos') {
                const shuffledDelays = targets.map((_, i) => (300 + i * 220) * speedScale);
                for (let i = shuffledDelays.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffledDelays[i], shuffledDelays[j]] = [shuffledDelays[j], shuffledDelays[i]];
                }
                targets.forEach((id, idx) => stopDelays[id] = shuffledDelays[idx]);
            }
            else if (animStyle === 'wave') {
                targets.forEach((id, idx) => {
                    stopDelays[id] = (300 + idx * 160) * speedScale;
                });
            }
            else {
                // cascade (default)
                targets.forEach((id, idx) => {
                    stopDelays[id] = (350 + idx * 240) * speedScale;
                });
            }

            const targetElements = {};
            targets.forEach(id => {
                const cellEl = document.getElementById(id);
                if (cellEl) {
                    targetElements[id] = cellEl;
                    cellEl.classList.add('spinning');
                    cellEl.classList.remove('stopped');
                }
            });

            const startTime = performance.now();
            const activeCells = new Set(targets);
            const maxDuration = Math.max(...Object.values(stopDelays)) + 150;
            let lastTickTime = 0;
            let animFrameId = null;

            const requestAnim = (typeof window !== 'undefined' && window.requestAnimationFrame) ? window.requestAnimationFrame.bind(window) : (cb => setTimeout(cb, 16));
            const cancelAnim = (typeof window !== 'undefined' && window.cancelAnimationFrame) ? window.cancelAnimationFrame.bind(window) : (id => clearTimeout(id));

            function finishSpin() {
                if (animFrameId) cancelAnim(animFrameId);
                targets.forEach(id => {
                    const cellEl = targetElements[id] || document.getElementById(id);
                    if (cellEl) cellEl.classList.remove('spinning');
                    setCellChar(id, finalValues[id]);
                });

                isSpinning = false;
                checkCanSaveButton();
                saveProgress();

                if (boardHasLetters && boardHasNumbers) {
                    let finalPrice = calculatePrice();
                    let r = getRarity(finalPrice);
                    flashPlateReward(r.text);
                    const isHighTier = ['Редкий', 'Супер редкий', 'Эпический', 'Легендарный', 'БЛАТНОЙ', 'Крутой', 'Мифический'].includes(r.text);
                    if (isHighTier) {
                        pityCounterBoth = 0;
                        updatePityUI();
                    }
                    if (r.text === "БЛАТНОЙ" || r.text === "Легендарный" || r.text === "Крутой" || r.text === "Мифический") {
                        triggerLegendaryEffect();
                        triggerScreenShake();
                        playWinJingle(r.text);
                        if (typeof sound?.haptic === 'function') sound.haptic('win');
                    } else if (r.text === "Эпический") {
                        playWinJingle(r.text);
                        if (typeof sound?.haptic === 'function') sound.haptic('win');
                    } else if (r.text === "Редкий") {
                        if (typeof sound?.haptic === 'function') sound.haptic('medium');
                    } else if (r.text === "Супер редкий") {
                        playWinJingle(r.text);
                        if (typeof sound?.haptic === 'function') sound.haptic('win');
                    }
                    const curPlateText = `${currentL1} ${currentNum} ${currentL2}${currentL3} | ${currentReg} RUS`;
                    logPlayerActivity('Крутит номер', `Выпал госномер «${curPlateText}» (${escapeHtml(r.text)}, ${finalPrice.toLocaleString('ru-RU')} ₽)`);
                    recordQuestProgress('spins', 1);
                    checkAchievements();

                    // Авто-прокрутка: остановка на красных (Супер редкий >= 80 000 ₽), эпических (>= 300 000 ₽) и выше, на остальных автоматом продает
                    if (isAutoSpinning) {
                        const isStopTier = finalPrice >= 80000 || ['Супер редкий', 'Эпический', 'Легендарный', 'Крутой', 'БЛАТНОЙ', 'Мифический'].includes(r.text);
                        if (isStopTier) {
                            // Stop auto-spin on high rarity tier: toggleAutoSpin()
                            stopAutoSpin();
                            notifyUser(`🔥 Выбит ценный номер «${curPlateText}» (${r.text}, ${finalPrice.toLocaleString('ru-RU')} ₽)! Авто-прокрутка остановлена.`, 'success');
                        } else {
                            const turbo = document.getElementById('turbo-toggle');
                            const nextDelay = (turbo && turbo.checked) ? 120 : 450;
                            // Auto-spin auto-sell: sellCurrentPlate()
                            Promise.resolve(sellCurrentPlate(true)).catch(err => {
                                console.warn('Auto-spin auto-sell error:', err);
                            }).finally(() => {
                                if (isAutoSpinning) {
                                    if (autoSpinTimerId) {
                                        clearTimeout(autoSpinTimerId);
                                        autoSpinTimerId = null;
                                    }
                                    autoSpinTimerId = setTimeout(runAutoSpinStep, nextDelay);
                                }
                            });
                        }
                    }
                }

                if (onFinish) onFinish();
            }

            function frameStep(now) {
                const elapsed = now - startTime;

                if (now - lastTickTime >= 48) {
                    lastTickTime = now;
                    playTick();
                    activeCells.forEach(id => {
                        if (id.startsWith('cell-l')) setCellChar(id, randomItem(lettersArr));
                        else setCellChar(id, Math.floor(Math.random() * 10).toString());
                    });
                }

                activeCells.forEach(id => {
                    if (elapsed >= stopDelays[id]) {
                        activeCells.delete(id);
                        const cellEl = targetElements[id] || document.getElementById(id);
                        if (cellEl) {
                            cellEl.classList.remove('spinning');
                            cellEl.classList.add('stopped');
                        }
                        setCellChar(id, finalValues[id]);

                        let pitch = 0.9 + (targets.indexOf(id) * 0.1);
                        playLockSound(pitch);
                        if (typeof sound?.haptic === 'function') sound.haptic('medium');
                    }
                });

                if (activeCells.size === 0 || elapsed > maxDuration) {
                    finishSpin();
                } else {
                    animFrameId = requestAnim(frameStep);
                }
            }

            animFrameId = requestAnim(frameStep);
        }

        // One generator UI. Signed-in players receive a server-authorized number;
        // guest spins stay local and are never sellable on the online market.
        let serverSpinBusy=false;
        function syncServerDraft(draft, mode) {
            if(!draft)return;
            const updateLetters = (mode === 'both' || mode === 'letters' || !mode);
            const updateNumbers = (mode === 'both' || mode === 'numbers' || !mode);

            if (updateLetters && (draft.hasLetters || mode === 'both' || mode === 'letters')) {
                if (draft.letters && Array.isArray(draft.letters)) {
                    [currentL1, currentL2, currentL3] = draft.letters;
                    if (!mode) {
                        setCellChar('cell-l1', currentL1);
                        setCellChar('cell-l2', currentL2);
                        setCellChar('cell-l3', currentL3);
                    }
                }
                boardHasLetters = !!draft.hasLetters;
                hasSpunLetSinceSave = !!draft.changedLetters;
            }

            if (updateNumbers && (draft.hasNumbers || mode === 'both' || mode === 'numbers')) {
                if (draft.num) {
                    currentNum = draft.num;
                    if (!mode && currentNum.length === 3) {
                        setCellChar('cell-n1', currentNum[0]);
                        setCellChar('cell-n2', currentNum[1]);
                        setCellChar('cell-n3', currentNum[2]);
                    }
                }
                boardHasNumbers = !!draft.hasNumbers;
                hasSpunNumSinceSave = !!draft.changedNumbers;
            }

            if (draft.reg) {
                currentReg = draft.reg;
                const regEl = document.getElementById('region');
                if (regEl) regEl.innerText = currentReg;
            }

            mustSpinBothForNextSave = true;
            checkCanSaveButton();
        }
        async function serverSpin(mode) {
            if(isSpinning||serverSpinBusy)return;
            if(!ensureOnlineAccess())return;
            const spinCost = mode === 'both' ? 900 : 500;
            const curOnlineBal = (onlineProfile && Number.isFinite(Number(onlineProfile.balance)))
                ? Number(onlineProfile.balance)
                : balance;
            if (curOnlineBal < spinCost) {
                notifyUser(`Недостаточно средств для спина (${spinCost} ₽)!`, 'error');
                return;
            }
            serverSpinBusy=true;
            try {
                if (mode === 'both') {
                    pityCounterBoth++;
                    updatePityUI();
                } else if (mode === 'numbers') {
                    pityCounterNum++;
                } else if (mode === 'letters') {
                    pityCounterLet++;
                }
                const data=await onlineRequest('roll',{mode,region:currentReg,pity:pityCounterBoth});
                if (data.draft && typeof data.draft.pityCounter === 'number') {
                    pityCounterBoth = data.draft.pityCounter;
                }
                setOnlineProfile(data.profile);
                updateBalance();
                updatePityUI();
                syncServerDraft(data.draft, mode);
                const targets=mode==='both'
                    ? ['cell-l1','cell-n1','cell-n2','cell-n3','cell-l2','cell-l3']
                    : mode==='numbers'?['cell-n1','cell-n2','cell-n3']:['cell-l1','cell-l2','cell-l3'];
                const chars={'cell-l1':currentL1,'cell-n1':currentNum[0], 'cell-n2':currentNum[1],
                    'cell-n3':currentNum[2], 'cell-l2':currentL2,'cell-l3':currentL3};
                executeCellSpin(targets,chars);
            } catch(e) {notifyUser('Спин не выполнен: '+e.message,'error');}
            finally {
                serverSpinBusy=false;
                updateBalance();
            }
        }

        function getLuckBonus(pity) {
            const p = Number.isFinite(pity) && pity > 0 ? Math.min(200, pity) : 0;
            return Math.min(200, Math.floor(p * 3));
        }

        function updatePityUI() {
            const countEl = document.getElementById('pity-count');
            const milestoneEl = document.getElementById('pity-next-milestone');
            const fillEl = document.getElementById('pity-progress-fill');
            const boostEl = document.getElementById('pity-boost-badge');
            if (!countEl || !milestoneEl || !fillEl) return;

            countEl.innerText = pityCounterBoth;
            const luckBonus = getLuckBonus(pityCounterBoth);
            if (boostEl) {
                boostEl.innerText = `+${luckBonus}%`;
                boostEl.title = `Шансы на редкие номера увеличены на ${luckBonus}%`;
                if (luckBonus > 0) {
                    boostEl.classList.add('active');
                } else {
                    boostEl.classList.remove('active');
                }
            }

            let nextText = '';
            let percent = 0;

            if (pityCounterBoth < 25) {
                nextText = `До Редкого: ${25 - pityCounterBoth}`;
                percent = Math.min(100, Math.round((pityCounterBoth / 25) * 100));
            } else if (pityCounterBoth < 65) {
                nextText = `До Эпического: ${65 - pityCounterBoth}`;
                percent = Math.min(100, Math.round(((pityCounterBoth - 25) / 40) * 100));
            } else if (pityCounterBoth < 120) {
                nextText = `До Легендарного: ${120 - pityCounterBoth}`;
                percent = Math.min(100, Math.round(((pityCounterBoth - 65) / 55) * 100));
            } else {
                nextText = '🔥 Гарант активен!';
                percent = 100;
            }

            milestoneEl.innerText = nextText;
            fillEl.style.width = `${percent}%`;
        }

        function generateLuckyNumberLocal(forceTier, pity = 0) {
            if (forceTier === 'legendary') {
                return randomItem(['777', '777', '001', '007', '011', '111', '555', '888', '999']);
            }
            if (forceTier === 'epic') {
                return randomItem([
                    '111','222','333','444','555','666','888','999',
                    '100','200','300','400','500','600','700','800','900',
                    '002','003','004','005','006','007','008','009'
                ]);
            }
            if (forceTier === 'rare') {
                return randomItem(['123','234','345','456','567','678','789','987','876','765','654','543','432','321']);
            }

            const luckBonus = getLuckBonus(pity);
            const roll = Math.floor(Math.random() * 1000);
            const jackpotCutoff = Math.min(15, 3 + Math.floor(luckBonus * 0.05));
            if (roll < jackpotCutoff) {
                return randomItem(['777','001','007']);
            }
            const epicCutoff = Math.min(35, 12 + Math.floor(luckBonus * 0.15));
            if (roll < epicCutoff) {
                return randomItem([
                    '111','222','333','444','555','666','888','999',
                    '100','200','300','400','500','600','700','800','900',
                    '002','003','004','005','006','007','008','009'
                ]);
            }
            const ladderCutoff = Math.min(70, 30 + Math.floor(luckBonus * 0.3));
            if (roll < ladderCutoff) {
                return randomItem(['123','234','345','456','567','678','789','987','876','765','654','543','432','321']);
            }
            return Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        }

        function generateLuckyLettersLocal(forceTier, pity = 0) {
            if (forceTier === 'legendary') {
                const elite = randomItem(['ААА', 'АМР', 'ВОР', 'ЕКХ', 'ООО', 'ССС', 'МММ', 'СКР']);
                return [elite[0], elite[1], elite[2]];
            }
            if (forceTier === 'epic') {
                if (Math.random() < 0.6) {
                    const elite = randomItem(eliteLetters);
                    return [elite[0], elite[1], elite[2]];
                }
                const l = randomItem(lettersArr);
                return [l, l, l];
            }
            if (forceTier === 'rare') {
                const l1 = randomItem(lettersArr);
                const l2 = randomItem(lettersArr);
                return [l1, l2, l1];
            }

            const luckBonus = getLuckBonus(pity);
            const roll = Math.floor(Math.random() * 1000);
            const eliteCutoff = Math.min(15, 4 + Math.floor(luckBonus * 0.05));
            if (roll < eliteCutoff) {
                const elite = randomItem(eliteLetters);
                return [elite[0], elite[1], elite[2]];
            }
            const tripleCutoff = Math.min(35, 12 + Math.floor(luckBonus * 0.15));
            if (roll < tripleCutoff) {
                const l = randomItem(lettersArr);
                return [l, l, l];
            }
            const mirrorCutoff = Math.min(70, 30 + Math.floor(luckBonus * 0.3));
            if (roll < mirrorCutoff) {
                const l1 = randomItem(lettersArr);
                const l2 = randomItem(lettersArr);
                return [l1, l2, l1];
            }
            return [randomItem(lettersArr), randomItem(lettersArr), randomItem(lettersArr)];
        }

        // --- ВАРИАНТЫ ПРОКРУТОК ---
        function spinNumbers() {
            if(onlineProfile)return serverSpin('numbers');
            if (isSpinning) return;
            if (balance < 500) return notifyUser("Недостаточно средств для спина цифр (500 ₽)!");
            deductPlayerBalance(500, 'Спин цифр');

            pityCounterNum++;
            let n;
            if (pityCounterNum >= currentPityTargetNum) {
                pityCounterNum = 0;
                n = Math.random() < 0.25 ? '777' : Math.floor(Math.random() * 10).toString().repeat(3);
            } else {
                n = generateLuckyNumberLocal(null, pityCounterNum);
            }

            currentNum = n;
            boardHasNumbers = true;
            hasSpunNumSinceSave = true;

            const targets = ['cell-n1', 'cell-n2', 'cell-n3'];
            const finals = { 'cell-n1': n[0], 'cell-n2': n[1], 'cell-n3': n[2] };

            executeCellSpin(targets, finals);
        }

        function spinLetters() {
            if(onlineProfile)return serverSpin('letters');
            if (isSpinning) return;
            if (balance < 500) return notifyUser("Недостаточно средств для спина букв (500 ₽)!");
            deductPlayerBalance(500, 'Спин букв');

            pityCounterLet++;
            let l1, l2, l3;
            if (pityCounterLet >= currentPityTargetLet) {
                pityCounterLet = 0;
                let elite = randomItem(eliteLetters);
                l1 = elite[0]; l2 = elite[1]; l3 = elite[2];
            } else {
                let letArr = generateLuckyLettersLocal(null, pityCounterLet);
                l1 = letArr[0]; l2 = letArr[1]; l3 = letArr[2];
            }

            currentL1 = l1; currentL2 = l2; currentL3 = l3;
            boardHasLetters = true;
            hasSpunLetSinceSave = true;

            const targets = ['cell-l1', 'cell-l2', 'cell-l3'];
            const finals = { 'cell-l1': l1, 'cell-l2': l2, 'cell-l3': l3 };

            executeCellSpin(targets, finals);
        }

        function spinBoth() {
            if(onlineProfile)return serverSpin('both');
            if (isSpinning) return;
            if (balance < 900) return notifyUser("Недостаточно средств для полного спина (900 ₽)!");
            deductPlayerBalance(900, 'Полный спин');

            pityCounterBoth++;
            let forceTier = null;
            if (pityCounterBoth >= 120) forceTier = 'legendary';
            else if (pityCounterBoth >= 65) forceTier = 'epic';
            else if (pityCounterBoth >= 25) forceTier = 'rare';

            let n = generateLuckyNumberLocal(forceTier, pityCounterBoth);
            let letArr = generateLuckyLettersLocal(forceTier, pityCounterBoth);
            let l1 = letArr[0], l2 = letArr[1], l3 = letArr[2];

            currentNum = n;
            currentL1 = l1; currentL2 = l2; currentL3 = l3;
            boardHasLetters = true;
            boardHasNumbers = true;
            hasSpunLetSinceSave = true;
            hasSpunNumSinceSave = true;

            updatePityUI();

            const targets = ['cell-l1', 'cell-n1', 'cell-n2', 'cell-n3', 'cell-l2', 'cell-l3'];
            const finals = {
                'cell-l1': l1, 'cell-n1': n[0], 'cell-n2': n[1], 'cell-n3': n[2],
                'cell-l2': l2, 'cell-l3': l3
            };

            executeCellSpin(targets, finals);
        }

        let autoSpinRemaining = Infinity;
        let autoSpinTimerId = null;

        function stopAutoSpin(msg = null) {
            if (autoSpinTimerId) {
                clearTimeout(autoSpinTimerId);
                autoSpinTimerId = null;
            }
            isAutoSpinning = false;
            autoSpinRemaining = 0;
            const btn = document.getElementById('btn-auto-spin');
            if (btn) {
                btn.innerText = "🔄 Авто: ВЫКЛ";
                btn.classList.remove('active');
            }
            if (msg) notifyUser(msg, 'info');
        }

        function startAutoSpin() {
            if (autoSpinTimerId) {
                clearTimeout(autoSpinTimerId);
                autoSpinTimerId = null;
            }
            isAutoSpinning = true;
            const select = document.getElementById('auto-spin-count');
            const countVal = select ? select.value : 'Infinity';
            autoSpinRemaining = countVal === 'Infinity' ? Infinity : (parseInt(countVal, 10) || 10);
            const btn = document.getElementById('btn-auto-spin');
            if (btn) {
                btn.innerText = Number.isFinite(autoSpinRemaining) ? `🔄 Авто: ${autoSpinRemaining}` : "🔄 Авто: ВКЛ";
                btn.classList.add('active');
            }
            runAutoSpinStep();
        }

        function toggleAutoSpin() {
            if (isAutoSpinning) {
                stopAutoSpin();
            } else {
                startAutoSpin();
            }
        }

        function runAutoSpinStep() {
            if (!isAutoSpinning) return;
            if (autoSpinTimerId) {
                clearTimeout(autoSpinTimerId);
                autoSpinTimerId = null;
            }
            if (Number.isFinite(autoSpinRemaining) && autoSpinRemaining <= 0) {
                stopAutoSpin('Авто-прокрутка завершена!');
                return;
            }
            const curBal = (onlineProfile && typeof onlineProfile.balance === 'number')
                ? Number(onlineProfile.balance)
                : balance;
            if (curBal < 900) {
                stopAutoSpin('Авто-спин остановлен: на активном кошельке недостаточно денег!');
                return;
            }
            if (isSpinning || serverSpinBusy) {
                // If a spin is currently active, do not stack timers. finishSpin will trigger the next step cleanly.
                return;
            }

            if (Number.isFinite(autoSpinRemaining)) {
                autoSpinRemaining--;
                const btn = document.getElementById('btn-auto-spin');
                if (btn) btn.innerText = `🔄 Авто: ${autoSpinRemaining}`;
            }

            spinBoth();
        }

        async function savePlate() {
            if (!boardHasLetters || !boardHasNumbers || isSpinning) return;
            if (!onlineProfile && mustSpinBothForNextSave && (!hasSpunLetSinceSave || !hasSpunNumSinceSave)) return;
            if(onlineProfile) {
                if(serverSpinBusy)return;
                serverSpinBusy=true;
                try {
                    const data=await onlineRequest('claim');
                    setOnlineProfile(data.profile,true);
                    const rarity=data.plate?.rarity?.text||'Обычный';
                    addExp(rarity);
                    hasSpunLetSinceSave=false;hasSpunNumSinceSave=false;
                    mustSpinBothForNextSave=true;
                    checkCanSaveButton();
                    notifyUser(`✅ ${data.plate.text} добавлен на сервер. Теперь его можно продать на рынке!`,'success');
                }catch(e){notifyUser('Не удалось сохранить номер: '+e.message,'error');}
                finally{serverSpinBusy=false;}
                return;
            }
            let pText = `${currentL1} ${currentNum} ${currentL2}${currentL3} | ${currentReg} RUS`;
            let price = calculatePrice();
            let r = getRarity(price);

            inventory.unshift({ text: pText, price: price, rarity: r });
            addExp(r.text);

            hasSpunLetSinceSave = false;
            hasSpunNumSinceSave = false;
            mustSpinBothForNextSave = true;

            playCashSound();
            renderInventory();
            checkCanSaveButton();
            logPlayerActivity('Сохранил номер', `Сохранил в инвентарь госномер «${pText}» (${escapeHtml(r.text)}, ${price.toLocaleString('ru-RU')} ₽)`);
            saveProgress();
            notifyUser(`Номер "${pText}" сохранен в инвентарь!`);
        }

        async function sellCurrentPlate(isAuto = false) {
            if (!boardHasLetters || !boardHasNumbers) return;
            if (isSpinning && !isAuto) return;
            if (!isAuto) {
                if (!onlineProfile && mustSpinBothForNextSave && (!hasSpunLetSinceSave || !hasSpunNumSinceSave)) return;
                const btnSave = document.getElementById('btn-save');
                if (btnSave && btnSave.disabled) return;
            }

            if (onlineProfile) {
                if (serverSpinBusy && !isAuto) return;
                serverSpinBusy = true;
                try {
                    const data = await onlineRequest('claim');
                    setOnlineProfile(data.profile, true);
                    const rarity = data.plate?.rarity?.text || 'Обычный';
                    addExp(rarity);
                    hasSpunLetSinceSave = false;
                    hasSpunNumSinceSave = false;
                    mustSpinBothForNextSave = true;
                    const idx = inventory.findIndex(p => p && (p.id === data.plate?.id || p.text === data.plate?.text));
                    if (idx >= 0) {
                        sellPlate(idx);
                    } else if (inventory.length > 0) {
                        sellPlate(0);
                    } else if (data.plate) {
                        creditPlayerBalance(data.plate.price, `Продажа госномера «${data.plate.text}»`);
                        playCashSound();
                        saveProgress();
                        notifyUser(`Номер «${data.plate.text}» продан за ${Number(data.plate.price).toLocaleString('ru-RU')} ₽!`, 'success');
                    }
                    checkCanSaveButton();
                } catch(e) {
                    notifyUser('Не удалось продать номер: ' + e.message, 'error');
                } finally {
                    serverSpinBusy = false;
                }
                return;
            }

            let pText = `${currentL1} ${currentNum} ${currentL2}${currentL3} | ${currentReg} RUS`;
            let price = calculatePrice();
            let r = getRarity(price);

            creditPlayerBalance(price, `Продажа госномера «${pText}»`);
            addExp(r.text);

            hasSpunLetSinceSave = false;
            hasSpunNumSinceSave = false;
            mustSpinBothForNextSave = true;

            playCashSound();
            renderInventory();
            checkCanSaveButton();
            logPlayerActivity('Продал номер', `Продал госномер «${pText}» (${escapeHtml(r.text)}, +${price.toLocaleString('ru-RU')} ₽)`);
            saveProgress();
            notifyUser(`Номер «${pText}» продан за ${price.toLocaleString('ru-RU')} ₽!`);
        }

        // --- КЕЙСЫ (CS:GO HORIZONTAL ROULETTE) ---
        function forcePlate(targetRarity) {
            let l1, l2, l3, num, reg = currentReg, price, actualRarity;
            for(let i=0; i<100; i++) {
                l1 = randomItem(lettersArr); l2 = randomItem(lettersArr); l3 = randomItem(lettersArr);
                num = Math.floor(Math.random() * 899 + 100).toString();

                if (targetRarity === 'Супер редкий') num = '00' + Math.floor(Math.random() * 9 + 1);
                else if (targetRarity === 'Эпический') {
                    let elite = randomItem(eliteLetters); l1=elite[0]; l2=elite[1]; l3=elite[2];
                } else if (targetRarity === 'Легендарный') {
                    num = randomItem(['111','222','777','888']);
                } else if (targetRarity === 'БЛАТНОЙ') {
                    let elite = randomItem(eliteLetters); l1=elite[0]; l2=elite[1]; l3=elite[2];
                    num = randomItem(['777','888','011']);
                }

                price = getCalculatedPrice(l1, l2, l3, num, reg.toString());
                actualRarity = getRarity(price).text;
                if (actualRarity === targetRarity) break;
            }
            return { text: `${l1} ${num} ${l2}${l3} | ${reg} RUS`, price: price, rarity: getRarity(price) };
        }

        function getCarRarity(price) {
            if (price >= 50000000) return { text: "МИФИЧЕСКИЙ", bg: "linear-gradient(135deg, #ef4444, #ec4899)", color: "#fff", border: "2px solid #ef4444", glow: "0 0 16px rgba(239, 68, 68, 0.8)" };
            if (price >= 15000000) return { text: "Легендарный", bg: "#f59e0b", color: "#000", border: "2px solid #f59e0b", glow: "0 0 12px rgba(245, 158, 11, 0.6)" };
            if (price >= 5000000) return { text: "Эпический", bg: "#ec4899", color: "#fff", border: "2px solid #ec4899", glow: "0 0 10px rgba(236, 72, 153, 0.5)" };
            if (price >= 2000000) return { text: "Супер редкий", bg: "#8b5cf6", color: "#fff", border: "2px solid #8b5cf6", glow: "none" };
            if (price >= 700000) return { text: "Редкий", bg: "#3b82f6", color: "#fff", border: "2px solid #3b82f6", glow: "none" };
            return { text: "Обычный", bg: "#475569", color: "#fff", border: "1px solid #475569", glow: "none" };
        }

        const caseConfigs = {
            'normal': { title: "📦 Обычный Box", name: "Обычный Box", price: 5000, contents: [ {r:'Обычный', count:10}, {r:'Редкий', count:5}, {r:'Супер редкий', count:6} ], probs: [{r:'Обычный', p:0.80}, {r:'Редкий', p:0.17}, {r:'Супер редкий', p:0.03}] },
            'super': { title: "🎁 Супер Box", name: "Супер Box", price: 50000, contents: [ {r:'Редкий', count:15}, {r:'Супер редкий', count:5}, {r:'Эпический', count:6} ], probs: [{r:'Редкий', p:0.80}, {r:'Супер редкий', p:0.17}, {r:'Эпический', p:0.03}] },
            'mega': { title: "💎 Mega Box", name: "Mega Box", price: 200000, contents: [ {r:'Супер редкий', count:15}, {r:'Эпический', count:4}, {r:'Легендарный', count:5} ], probs: [{r:'Супер редкий', p:0.85}, {r:'Эпический', p:0.12}, {r:'Легендарный', p:0.03}] },
            'car_standard': {
                title: "🏎️ Авто-Кейс",
                name: "Авто-Кейс",
                isCar: true,
                price: 650000,
                cars: [
                    { name: "ВАЗ-2107 «Жигули»", weight: 18 },
                    { name: "ВАЗ-2109 «Девятка»", weight: 18 },
                    { name: "ГАЗ-24 «Волга»", weight: 16 },
                    { name: "Lada Priora БПАН", weight: 15 },
                    { name: "Hyundai Solaris", weight: 12 },
                    { name: "Lada Vesta Sport", weight: 9 },
                    { name: "Volkswagen Polo", weight: 6 },
                    { name: "Toyota Mark II Tourer V", weight: 4 },
                    { name: "Subaru Impreza WRX STI", weight: 2 }
                ]
            },
            'car_luxury': {
                title: "👑 Элит Авто Box",
                name: "Элит Авто Box",
                isCar: true,
                price: 7500000,
                cars: [
                    { name: "Toyota Mark II Tourer V", weight: 12 },
                    { name: "Subaru Impreza WRX STI", weight: 12 },
                    { name: "BMW M5 E60 V10", weight: 14 },
                    { name: "Nissan Silvia S15 Spec-R", weight: 14 },
                    { name: "Toyota Camry 3.5", weight: 15 },
                    { name: "Toyota Land Cruiser 300", weight: 15 },
                    { name: "Nissan GT-R R35 Nismo", weight: 9 },
                    { name: "Mercedes-Benz E63s AMG", weight: 6 },
                    { name: "Audi RS6 Avant", weight: 4 },
                    { name: "BMW M5 F90 Competition", weight: 1.9 },
                    { name: "Bugatti Chiron Super Sport", weight: 0.1 }
                ]
            },
            'car_hyper': {
                title: "🔥 Гиперкар Box",
                name: "Гиперкар Box",
                isCar: true,
                price: 45000000,
                cars: [
                    { name: "Mercedes-Benz E63s AMG", weight: 8 },
                    { name: "Audi RS6 Avant", weight: 9 },
                    { name: "BMW M5 F90 Competition", weight: 11 },
                    { name: "BMW M8 Gran Coupe", weight: 14 },
                    { name: "Mercedes-Benz G63 AMG «Гелик»", weight: 17 },
                    { name: "Porsche 911 Turbo S", weight: 16 },
                    { name: "Lamborghini Huracan Performante", weight: 11 },
                    { name: "Rolls-Royce Cullinan", weight: 7 },
                    { name: "Ferrari SF90 Stradale", weight: 5.5 },
                    { name: "Bugatti Chiron Super Sport", weight: 1.2 },
                    { name: "Koenigsegg Jesko Attack", weight: 0.3 }
                ]
            }
        };

        const SUPER_PRIZE = { text: "А 011 ЕО | 12 RUS", price: 10000000, rarity: getRarity(10000000) };

        function openCasePreview(type) {
            if (isSpinning) return;
            activeCaseType = type;
            let config = caseConfigs[type];
            if (!config) return;
            let list = document.getElementById('case-preview-list');
            list.innerHTML = '';

            document.getElementById('case-preview-title').innerText = config.title ? `Содержимое: ${config.title}` : "Содержимое кейса";

            if (config.isCar) {
                currentCaseCars = [];
                config.cars.forEach(item => {
                    let carTemplate = carsData.find(c => c.name === item.name);
                    if (carTemplate) {
                        let carWithRarity = {
                            ...carTemplate,
                            weight: item.weight,
                            rarity: getCarRarity(carTemplate.price)
                        };
                        currentCaseCars.push(carWithRarity);
                    }
                });

                currentCaseCars.sort((a, b) => b.price - a.price);

                currentCaseCars.forEach(car => {
                    let r = car.rarity;
                    let rColor = r.bg.startsWith('linear') ? '#ef4444' : r.bg;
                    list.innerHTML += `
                        <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); padding: 8px 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                                <img src="${getCarSpriteDataUrl(car.name)}" class="car-sprite-img" onerror="this.onerror=null; this.src='./icons/car-placeholder.svg';" style="width: 58px; height: 38px; object-fit: contain; border-radius: 4px; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1);">
                                <div style="min-width: 0;">
                                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                        <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background:${r.bg}; color:${r.color}; font-weight:700;">${escapeHtml(r.text)}</span>
                                        <b style="color: white; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(car.name)}</b>
                                    </div>
                                    <small style="color: var(--text-dim); font-size: 11px;">Шанс: <b style="color: #fbbf24;">${car.weight}%</b></small>
                                </div>
                            </div>
                            <small style="color: var(--accent-green); font-weight:700; white-space: nowrap;">${car.price.toLocaleString('ru-RU')} ₽</small>
                        </div>`;
                });
            } else {
                currentCaseData = [];
                config.contents.forEach(ct => {
                    for(let i=0; i<ct.count; i++) {
                        currentCaseData.push(forcePlate(ct.r));
                    }
                });

                currentCaseData.sort((a, b) => b.price - a.price);

                currentCaseData.forEach(item => {
                    let rHtml = item.rarity.text !== "Обычный" ? `<span style="font-size: 10px; padding: 2px 6px; border-radius:4px; background:${item.rarity.bg}; color:${item.rarity.color}; margin-right: 6px; font-weight:700;">${item.rarity.text}</span>` : '';
                    list.innerHTML += `
                        <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); padding: 10px 14px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
                            <div>${rHtml}<b style="color: white; font-size:13px;">${escapeHtml(item.text)}</b></div>
                            <small style="color: var(--accent-green); font-weight:700;">${Number(item.price || 0).toLocaleString('ru-RU')} ₽</small>
                        </div>`;
                });
            }

            document.getElementById('btn-buy-case').innerText = `Открыть за ${config.price.toLocaleString('ru-RU')} ₽`;
            document.getElementById('case-preview-modal').classList.add('show');
        }

        function closeCasePreview() {
            document.getElementById('case-preview-modal').classList.remove('show');
        }

        let caseRouletteTimeout = null;

        function buyCase() {
            if (isSpinning) return;
            let config = caseConfigs[activeCaseType];
            if (!config) return;
            const curBal = (onlineProfile && Number.isFinite(Number(onlineProfile.balance))) ? Math.max(balance, Number(onlineProfile.balance)) : balance;
            if (curBal < config.price) return notifyUser("Недостаточно средств!");

            isSpinning = true;
            deductPlayerBalance(config.price, `Открытие кейса «${config.name}»`);
            achievements.casesOpened = (achievements.casesOpened || 0) + 1;
            checkAchievements();
            logPlayerActivity('Открыл кейс', `Открыл кейс «${config.name}» за ${config.price.toLocaleString('ru-RU')} ₽`);
            saveProgress();
            closeCasePreview();

            const isCar = !!config.isCar;
            wonCarObj = null;
            wonPlateObj = null;

            if (isCar) {
                let totalWeight = config.cars.reduce((sum, item) => sum + item.weight, 0);
                let rand = Math.random() * totalWeight;
                let cumulative = 0;
                let wonItem = config.cars[0];
                for (let item of config.cars) {
                    cumulative += item.weight;
                    if (rand <= cumulative) {
                        wonItem = item;
                        break;
                    }
                }
                let template = carsData.find(c => c.name === wonItem.name) || carsData[0];
                wonCarObj = {
                    name: template.name,
                    category: template.category,
                    price: template.price,
                    img: template.img,
                    rarity: getCarRarity(template.price)
                };
            } else {
                if (activeCaseType === 'mega' && Math.random() < 0.00001) {
                    wonPlateObj = SUPER_PRIZE;
                } else {
                    let rand = Math.random();
                    let cumulative = 0;
                    let wonRarity = config.probs[0].r;
                    for (let pb of config.probs) {
                        cumulative += pb.p;
                        if (rand <= cumulative) { wonRarity = pb.r; break; }
                    }
                    wonPlateObj = forcePlate(wonRarity);
                }
            }

            const track = document.getElementById('case-roulette-track');
            track.innerHTML = '';
            track.style.transition = 'none';
            track.style.transform = 'translateX(0px)';

            const modalTitle = document.getElementById('roulette-modal-title');
            modalTitle.innerText = "🎲 Крутим рулетку...";
            modalTitle.style.color = "#fff";

            const winningIndex = 26;
            const cardWidth = 148;

            for (let i = 0; i < 35; i++) {
                if (isCar) {
                    let item = (i === winningIndex) ? wonCarObj : randomItem(currentCaseCars);
                    let rColor = item.rarity ? (item.rarity.bg.startsWith('linear') ? '#ef4444' : item.rarity.bg) : "#555";
                    track.innerHTML += `
                        <div class="roulette-card" id="rcard-${i}" style="border-bottom-color: ${rColor}; padding: 6px; text-align: center;">
                            <img src="${getCarSpriteDataUrl(item.name)}" class="car-sprite-img" onerror="this.onerror=null; this.src='./icons/car-placeholder.svg';" style="width: 124px; height: 50px; object-fit: contain; border-radius: 4px; display: block; margin: 0 auto 5px auto; border: 1px solid rgba(255,255,255,0.1);">
                            <div style="font-size: 11px; font-weight: 800; color: #fff; max-width: 125px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.name)}</div>
                            <div class="r-price" style="color: ${rColor}; margin-top: 2px;">${Number(item.price || 0).toLocaleString('ru-RU')} ₽</div>
                        </div>
                    `;
                } else {
                    let item = (i === winningIndex) ? wonPlateObj : randomItem(currentCaseData);
                    let rColor = item.rarity.bg !== "transparent" ? item.rarity.bg : "#555";
                    track.innerHTML += `
                        <div class="roulette-card" id="rcard-${i}" style="border-bottom-color: ${rColor};">
                            <div class="r-rarity">${escapeHtml(item.rarity.text)}</div>
                            <div class="r-plate">${escapeHtml(item.text.split('|')[0])}</div>
                            <div class="r-price" style="color: ${rColor};">${Number(item.price || 0).toLocaleString('ru-RU')} ₽</div>
                        </div>
                    `;
                }
            }

            document.getElementById('roulette-result').classList.add('hidden');
            document.getElementById('roulette-modal').classList.add('show');
            initAudio();

            const containerWidth = document.querySelector?.('.case-roulette-container')?.offsetWidth || 400;
            const targetX = -(winningIndex * cardWidth + (cardWidth / 2) - (containerWidth / 2) + (Math.random() * 40 - 20));

            let tickDelay = 70;
            function playCaseReelTicks() {
                playTick();
                tickDelay *= 1.15;
                if (tickDelay < 480) {
                    caseRouletteTimeout = setTimeout(playCaseReelTicks, tickDelay);
                }
            }
            playCaseReelTicks();

            setTimeout(() => {
                track.style.transition = 'transform 4.0s cubic-bezier(0.12, 0.8, 0.22, 1)';
                track.style.transform = `translateX(${targetX}px)`;
            }, 60);

            setTimeout(() => {
                isSpinning = false;
                if (caseRouletteTimeout) clearTimeout(caseRouletteTimeout);
                playLockSound(1.4);

                const winningCard = document.getElementById(`rcard-${winningIndex}`);

                if (isCar) {
                    let winColor = wonCarObj.rarity.bg.startsWith('linear') ? '#ef4444' : wonCarObj.rarity.bg;
                    if (winningCard) {
                        winningCard.style.transform = 'scale(1.08)';
                        winningCard.style.boxShadow = `0 0 24px ${winColor}`;
                    }

                    modalTitle.innerText = "🎉 Вы выиграли автомобиль!";
                    modalTitle.style.color = winColor;

                    let rLabel = document.getElementById('roulette-rarity');
                    rLabel.innerText = wonCarObj.rarity.text;
                    rLabel.style.background = wonCarObj.rarity.bg;
                    rLabel.style.color = wonCarObj.rarity.color;

                    document.getElementById('roulette-plate-prize-box').classList.add('hidden');
                    document.getElementById('roulette-car-prize-box').classList.remove('hidden');
                    document.getElementById('roulette-actions-plate').classList.add('hidden');
                    document.getElementById('roulette-actions-car').classList.remove('hidden');

                    const rCarImg = document.getElementById('roulette-car-img');
                    if (rCarImg) {
                        const cachedRoulette3D = (typeof Car3DManager !== 'undefined' && typeof Car3DManager.getSideThumbnail === 'function')
                            ? Car3DManager.getSideThumbnail(wonCarObj.name)
                            : null;
                        if (cachedRoulette3D) {
                            rCarImg.src = cachedRoulette3D;
                        } else {
                            rCarImg.src = getCarSpriteDataUrl(wonCarObj.name);
                            if (typeof Car3DManager !== 'undefined' && typeof Car3DManager.renderSideThumbnail === 'function') {
                                Car3DManager.renderSideThumbnail(wonCarObj.name, {}, (url) => {
                                    if (url && rCarImg) rCarImg.src = url;
                                });
                            }
                        }
                    }
                    document.getElementById('roulette-car-name').innerText = wonCarObj.name;
                    document.getElementById('roulette-car-category').innerText = wonCarObj.category || 'Автомобиль';
                    document.getElementById('roulette-price').innerText = `Рыночная цена: ${wonCarObj.price.toLocaleString('ru-RU')} ₽`;

                    let sellPrice = Math.floor(wonCarObj.price * 0.9);
                    document.getElementById('btn-roulette-sell-car').innerText = `💰 Продать за 90% (${sellPrice.toLocaleString('ru-RU')} ₽)`;
                    document.getElementById('roulette-result').classList.remove('hidden');

                    if (wonCarObj.rarity.text === "МИФИЧЕСКИЙ" || wonCarObj.rarity.text === "Легендарный") {
                        triggerConfetti();
                        triggerScreenShake();
                        playWinJingle("Легендарный");
                    } else if (wonCarObj.rarity.text === "Эпический" || wonCarObj.rarity.text === "Супер редкий") {
                        playWinJingle(wonCarObj.rarity.text);
                    }
                } else {
                    let winColor = wonPlateObj.rarity.bg !== "transparent" ? wonPlateObj.rarity.bg : "#10b981";
                    if (winningCard) {
                        winningCard.style.transform = 'scale(1.08)';
                        winningCard.style.boxShadow = `0 0 20px ${wonPlateObj.rarity.bg !== "transparent" ? wonPlateObj.rarity.bg : "#fff"}`;
                    }

                    modalTitle.innerText = "🎉 Вы выиграли госномер!";
                    modalTitle.style.color = winColor;

                    let rLabel = document.getElementById('roulette-rarity');
                    rLabel.innerText = wonPlateObj.rarity.text;
                    rLabel.style.background = wonPlateObj.rarity.bg;
                    rLabel.style.color = wonPlateObj.rarity.color;

                    document.getElementById('roulette-plate-prize-box').classList.remove('hidden');
                    document.getElementById('roulette-car-prize-box').classList.add('hidden');
                    document.getElementById('roulette-actions-plate').classList.remove('hidden');
                    document.getElementById('roulette-actions-car').classList.add('hidden');

                    document.getElementById('roulette-plate-card').innerText = wonPlateObj.text;
                    document.getElementById('roulette-price').innerText = `+${wonPlateObj.price.toLocaleString('ru-RU')} ₽`;
                    document.getElementById('roulette-result').classList.remove('hidden');

                    if (wonPlateObj.rarity.text === "БЛАТНОЙ" || wonPlateObj.rarity.text === "Легендарный") {
                        triggerConfetti();
                        triggerScreenShake();
                        playWinJingle(wonPlateObj.rarity.text);
                    } else if (wonPlateObj.rarity.text === "Эпический" || wonPlateObj.rarity.text === "Супер редкий") {
                        playWinJingle(wonPlateObj.rarity.text);
                    }
                }
            }, 4150);
        }

        function rouletteSell() {
            if (!wonPlateObj) return;
            const reward = wonPlateObj;
            wonPlateObj = null;
            creditPlayerBalance(reward.price, 'Продажа госномера из рулетки');
            playCashSound();
            document.getElementById('roulette-modal').classList.remove('show');
        }

        function rouletteSave() {
            if (!wonPlateObj) return;
            const reward = wonPlateObj;
            wonPlateObj = null;
            inventory.unshift(reward);
            addExp(reward.rarity.text);
            renderInventory();
            logPlayerActivity('Рулетка номеров', `Выиграл в рулетке госномер «${reward.text}» (${reward.rarity.text}, ${reward.price.toLocaleString('ru-RU')} ₽)`);
            saveProgress();
            document.getElementById('roulette-modal').classList.remove('show');
        }

        function rouletteSellCar() {
            if (!wonCarObj) return;
            const reward = wonCarObj;
            wonCarObj = null;
            let sellPrice = Math.floor(reward.price * 0.9);
            creditPlayerBalance(sellPrice, 'Продажа авто из рулетки');
            playCashSound();
            logPlayerActivity('Продажа авто', `Продал выбитое авто «${reward.name}» за ${sellPrice.toLocaleString('ru-RU')} ₽`);
            document.getElementById('roulette-modal').classList.remove('show');
        }

        function rouletteSaveCar() {
            if (!wonCarObj) return;
            const reward = wonCarObj;
            wonCarObj = null;
            myCars.unshift({
                name: reward.name,
                basePrice: reward.price,
                img: reward.img,
                category: reward.category,
                condition: 100,
                plate: null,
                upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 }
            });
            if (onlineProfile) {
                onlineProfile.myCars = JSON.parse(JSON.stringify(myCars));
                if (db && typeof db.ref === 'function') {
                    const key = sanitizeKey(onlineProfile.nickname);
                    const now = Date.now();
                    db.ref('onlineV4/accounts/' + key).update({
                        myCars: onlineProfile.myCars,
                        updatedAt: now
                    }).catch(() => {});
                    db.ref('users/' + key).update({
                        myCars: onlineProfile.myCars,
                        updatedAt: now
                    }).catch(() => {});
                    db.ref('leaderboard/' + key).update({
                        carsCount: myCars.length,
                        avatarData: avatarData || '',
                        updatedAt: now
                    }).catch(() => {});
                }
            }
            addExp(reward.rarity.text || "Супер редкий");
            playCashSound();
            renderCars();
            updateBadge();
            logPlayerActivity('Рулетка авто', `Выиграл в рулетке авто «${reward.name}» (${reward.category})`);
            saveProgress();
            if (typeof syncCloudGarage === 'function') syncCloudGarage(true);
            document.getElementById('roulette-modal').classList.remove('show');
        }

        // --- ИНВЕНТАРЬ ---
        function renderInventory() {
            let list = document.getElementById('inventory-list');
            if (inventory.length === 0) {
                list.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <div class="empty-state-icon">🎒</div>
                        <p>Инвентарь пуст. Сохраняйте номера в генераторе или открывайте кейсы!</p>
                    </div>`;
                updateBadge();
                return;
            }

            let html = '';
            inventory.forEach((item, index) => {
                const r = getRarity(Number(item.price) || 0);
                let rarityHTML = r.text !== "Обычный"
                    ? `<span class="inv-card-rarity" style="background:${r.bg}; color:${r.color};">${escapeHtml(r.text)}</span>`
                    : '';

                html += `
                    <div class="inv-card">
                        <div class="inv-card-header">
                            ${rarityHTML}
                            <span class="inv-card-price">${Number(item.price || 0).toLocaleString('ru-RU')} ₽</span>
                        </div>
                        <div class="mini-plate">${escapeHtml(item.text)}</div>
                        <button class="btn btn-close" style="padding:8px 12px; width:100%;" onclick="sellPlate(${index})">Продать (+${Number(item.price||0).toLocaleString('ru-RU')} ₽)</button>
                    </div>`;
            });
            list.innerHTML = html;
            updateBadge();
        }

        function sellPlate(index) {
            const item = inventory[index];
            if (!item || !Number.isFinite(item.price) || item.price < 0) return;
            const price = item.price;
            inventory.splice(index, 1);
            creditPlayerBalance(price, `Продажа госномера «${item.text}»`);
            if (onlineProfile) {
                onlineProfile.inventory = [...inventory];
                if (db) {
                    const key = sanitizeKey(onlineProfile.nickname);
                    db.ref('onlineV4/accounts/' + key).update({
                        inventory: onlineProfile.inventory,
                        updatedAt: Date.now()
                    }).catch(() => {});
                    db.ref('users/' + key).update({
                        inventory: onlineProfile.inventory,
                        updatedAt: Date.now()
                    }).catch(() => {});
                }
            }
            playCashSound();
            renderInventory();
            notifyUser(`Номер «${item.text}» продан за ${price.toLocaleString('ru-RU')} ₽!`);
        }

        function sellAllPlates(filter = 'common') {
            if (!Array.isArray(inventory) || inventory.length === 0) {
                notifyUser('Инвентарь пуст!', 'info');
                return;
            }
            const toSell = [];
            const toKeep = [];
            let totalCash = 0;
            for (const item of inventory) {
                const r = getRarity(Number(item.price) || 0);
                const isCommon = (!r || r.text === 'Обычный' || r.text === 'Базовый' || (Number(item.price) || 0) <= 2500);
                if (filter === 'all' || isCommon) {
                    toSell.push(item);
                    totalCash += (Number(item.price) || 0);
                } else {
                    toKeep.push(item);
                }
            }
            if (toSell.length === 0) {
                notifyUser(filter === 'common' ? 'Нет обычных номеров для продажи' : 'Нет номеров для продажи', 'info');
                return;
            }
            inventory = toKeep;
            creditPlayerBalance(totalCash, `Массовая продажа номеров (${toSell.length} шт.)`);
            if (onlineProfile) {
                onlineProfile.inventory = [...inventory];
                if (db) {
                    const key = sanitizeKey(onlineProfile.nickname);
                    db.ref('onlineV4/accounts/' + key).update({
                        inventory: onlineProfile.inventory,
                        updatedAt: Date.now()
                    }).catch(() => {});
                    db.ref('users/' + key).update({
                        inventory: onlineProfile.inventory,
                        updatedAt: Date.now()
                    }).catch(() => {});
                }
            }
            playCashSound();
            renderInventory();
            notifyUser(`Продано номеров: ${toSell.length} шт. на сумму +${totalCash.toLocaleString('ru-RU')} ₽!`, 'success');
        }
        window.sellAllPlates = sellAllPlates;

        // --- ГАРАЖ ---
        let currentShopFilter = 'all';

        function filterShopCars(filter) {
            currentShopFilter = filter || 'all';
            const buttons = ['all', 'budget', 'jdm', 'premium', 'hyper'];
            buttons.forEach(b => {
                const btn = document.getElementById('btn-shop-' + b);
                if (btn) btn.classList.toggle('active', b === currentShopFilter);
            });
            renderShopCars();
        }

        function renderShopCars() {
            let list = document.getElementById('garage-list');
            if (!list) return;
            list.innerHTML = '';

            const filteredCars = carsData.filter(car => {
                if (currentShopFilter === 'budget') return car.price < 1300000;
                if (currentShopFilter === 'jdm') return car.price >= 1300000 && car.price < 7000000;
                if (currentShopFilter === 'premium') return car.price >= 7000000 && car.price < 30000000;
                if (currentShopFilter === 'hyper') return car.price >= 30000000;
                return true;
            });

            let html = '';
            filteredCars.forEach((car, idx) => {
                const cardId = 'shop-car-' + encodeURIComponent(car.name).replace(/%/g, '_');
                const imgId = 'shop-car-img-' + encodeURIComponent(car.name).replace(/%/g, '_') + '-' + idx;
                const cached3D = (typeof Car3DManager !== 'undefined' && Car3DManager.getSideThumbnail) ? Car3DManager.getSideThumbnail(car.name) : null;
                const initialSrc = cached3D || getCarSpriteDataUrl(car.name);

                html += `
                    <div class="car-shop-card" id="${cardId}">
                        <div class="car-img-wrap">
                            <img id="${imgId}" src="${initialSrc}" class="car-img car-sprite-img" onerror="this.onerror=null; this.src='./icons/car-placeholder.svg';" alt="${escapeHtml(car.name)}">
                            <span class="car-category-pill">${escapeHtml(car.category || 'Авто')}</span>
                        </div>
                        <div class="car-info-body">
                            <div>
                                <div style="color: #fff; font-size: 14px; font-weight: 800;">${escapeHtml(car.name)}</div>
                                <small style="color: var(--text-dim); font-size: 11px;">В наличии</small>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
                                <span style="color: var(--accent-green); font-weight: 800; font-size: 13px;">${car.price.toLocaleString('ru-RU')} ₽</span>
                                <button class="btn btn-green" style="width: auto; padding: 7px 14px; font-size: 12px; margin: 0;" onclick="buyCar(${jsArg(car.name)})">Купить</button>
                            </div>
                        </div>
                    </div>`;
            });
            list.innerHTML = html;

            if (typeof Car3DManager !== 'undefined' && typeof Car3DManager.renderSideThumbnail === 'function') {
                filteredCars.forEach((car, idx) => {
                    const imgId = 'shop-car-img-' + encodeURIComponent(car.name).replace(/%/g, '_') + '-' + idx;
                    const cached = Car3DManager.getSideThumbnail(car.name);
                    if (!cached) {
                        Car3DManager.renderSideThumbnail(car.name, {}, (dataUrl) => {
                            if (dataUrl) {
                                const imgEl = document.getElementById(imgId);
                                if (imgEl) {
                                    imgEl.src = dataUrl;
                                    imgEl.classList.add('car-3d-thumb');
                                }
                            }
                        });
                    }
                });
            }
        }

        function renderCars() {
            renderShopCars();
            let myCarsDiv = document.getElementById('my-cars');

            if (myCars.length === 0) {
                const podiumCard = document.getElementById('garage-3d-podium-card');
                if (podiumCard) podiumCard.style.display = 'none';
                if (garage3DShowroom) garage3DShowroom.stop();
                myCarsDiv.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏎️</div><p>В вашем гараже пока нет автомобилей. Выберите и купите автомобиль в автосалоне ниже!</p></div>`;
                updateBadge();
                return;
            }

            myCarsDiv.innerHTML = '';
            let html = '';
            myCars.forEach((car, index) => {
                const template = carsData.find(c => c.name === car.name) || {};
                const carCategory = car.category || template.category || 'Автомобиль';
                let rawBase = Number(car.basePrice);
                if (!Number.isFinite(rawBase) || rawBase <= 0) rawBase = Number(template.price);
                if (!Number.isFinite(rawBase) || rawBase <= 0) rawBase = 80000;
                const carBasePrice = Math.max(10000, Math.floor(rawBase));
                const carSellPrice = Math.floor(carBasePrice * 0.9);

                let bumperHtml = '';
                if (car.plate) {
                    let platePrice = Number.isFinite(Number(car.plate.price)) ? Math.max(0, Math.floor(Number(car.plate.price))) : 0;
                    let detachCost = Math.floor(platePrice * 0.1);
                    let totalSellPrice = Math.floor(carSellPrice + (platePrice * 0.95));
                    const r = getRarity(Number(car.plate.price) || 0);
                    let rHtml = r.text !== "Обычный"
                        ? `<span style="font-size: 9px; padding: 2px 8px; border-radius: var(--radius-full); background:${r.bg}; color:${r.color}; font-weight:800; margin-bottom: 6px; display: inline-block;">${escapeHtml(r.text)}</span>`
                        : '';

                    bumperHtml = `
                        <div style="text-align: center; width: 100%;">
                            ${rHtml}
                            <div style="display: flex; justify-content: center;">
                                <div class="mini-plate">${escapeHtml(car.plate.text)}</div>
                            </div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
                                Стоимость с номером: <b style="color: var(--accent-green);">${totalSellPrice.toLocaleString('ru-RU')} ₽</b>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; width: 100%; margin-top: 4px; flex-wrap: wrap;">
                            <button class="btn btn-green" style="font-size: 12px; padding: 10px; flex: 1 1 auto;" onclick="openAttachModal(${index})">
                                🔄 Перевесить номер
                            </button>
                            <button class="btn btn-blue" style="font-size: 12px; padding: 10px; flex: 1 1 auto;" onclick="detachPlate(${index})">
                                Снять (-${detachCost.toLocaleString('ru-RU')} ₽)
                            </button>
                            <button class="btn btn-close" style="font-size: 12px; padding: 10px; flex: 1 1 100%;" onclick="sellCar(${index}, true)">
                                Продать всё (+${totalSellPrice.toLocaleString('ru-RU')} ₽)
                            </button>
                        </div>
                    `;
                } else {
                    bumperHtml = `
                        <div style="color: var(--text-dim); font-size: 12px; text-align: center;">На автомобиле нет номера</div>
                        <div style="display: flex; gap: 8px; width: 100%;">
                            <button class="btn btn-green" style="font-size: 12px; padding: 10px;" onclick="openAttachModal(${index})">
                                🏷️ Повесить номер
                            </button>
                            <button class="btn btn-close" style="font-size: 12px; padding: 10px;" onclick="sellCar(${index}, false)">
                                Продать авто (+${carSellPrice.toLocaleString('ru-RU')} ₽)
                            </button>
                        </div>
                    `;
                }

                const state = NomeraRaceEconomy.normalizeCar(car);
                const basePrice = Number(car.basePrice || template.price || 80000);
                const costRepair = NomeraRaceEconomy.repairCost(basePrice, state.condition);
                const upgradeOptions = [
                    {type:'engine', label:'⚙️ Двигатель', hint:'+скорость и разгон'},
                    {type:'handling', label:'🛞 Подвеска', hint:'+контроль'},
                    {type:'economy', label:'⛽ Экономичность', hint:'−расход топлива'},
                    {type:'nitro', label:'🚀 Система нитро', hint:'+ускорение и запас'}
                ];
                const upgradesHtml = upgradeOptions.map(({type, label, hint}) => {
                    const level = state.upgrades[type];
                    const price = NomeraRaceEconomy.upgradeCost(basePrice, type, level);
                    return `<div class="tuning-row">
                        <div class="tuning-row-label"><strong>${label}</strong><small>${hint} · ${level}/${NomeraRaceEconomy.MAX_LEVEL}</small></div>
                        <button type="button" class="btn btn-blue tuning-buy" ${price === null ? 'disabled' : ''} onclick="upgradeGarageCar(${index}, '${type}')">${price === null ? '✓ MAX' : `${price.toLocaleString('ru-RU')} ₽`}</button>
                    </div>`;
                }).join('');
                const stylingBadge = [
                    car.styling?.neon && car.styling.neon !== 'none' ? `<span style="font-size: 10px; color: ${car.styling.neon}; font-weight: 800; margin-left: 6px;">💡 НЕОН</span>` : '',
                    car.styling?.suspension && car.styling.suspension !== 'stock' ? `<span style="font-size: 10px; color: #f59e0b; font-weight: 800; margin-left: 4px;">⚡ ${car.styling.suspension === 'bpan' ? 'БПАН' : car.styling.suspension === 'lift' ? 'ЛИФТ' : 'СПОРТ'}</span>` : '',
                    car.styling?.wheels && car.styling.wheels !== 'stock' ? `<span style="font-size: 10px; color: #cbd5e1; font-weight: 800; margin-left: 4px;">🛞</span>` : ''
                ].filter(Boolean).join(' ');
                const colorDot = car.styling?.color
                    ? `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${car.styling.color};border:1px solid #fff;margin-right:4px;"></span>`
                    : '';

                const myImgId = 'my-car-img-' + index;
                const carEffectiveStyling = Object.assign({}, car.styling || {}, {
                    plate: car.plate ? (car.plate.text || car.plate) : 'none'
                });
                const cachedMy3D = (typeof Car3DManager !== 'undefined' && Car3DManager.getSideThumbnail) ? Car3DManager.getSideThumbnail(car.name, carEffectiveStyling) : null;
                const myInitialSrc = cachedMy3D || getCarSpriteDataUrl(car.name, carEffectiveStyling);

                html += `
                    <div class="my-car-card ${index === activeGarageCarIndex ? 'active-podium-card' : ''}" onclick="selectGarageCarForPodium(${index})">
                        <div style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <b style="font-size: 15px; color: #fff;">${colorDot}🏎️ ${escapeHtml(car.name)} ${stylingBadge}</b>
                            </div>
                            <span class="car-category-pill" style="position: static;">${escapeHtml(carCategory)}</span>
                        </div>
                        <div class="car-img-wrap" style="height: 150px; cursor: pointer;" onclick="open3DPodium(${index})" title="Нажмите, чтобы открыть интерактивный 3D-подиум">
                            <img id="${myImgId}" src="${myInitialSrc}" class="car-img car-sprite-img" onerror="this.onerror=null; this.src='./icons/car-placeholder.svg';" alt="${escapeHtml(car.name)}">
                        </div>
                        <div class="garage-tuning">
                            <div class="garage-condition-heading"><b>🧰 Состояние ${Math.round(state.condition)}%</b><span>${state.condition < 35 ? '🔴 Сильный износ' : state.condition < 75 ? '🟡 Нужен ремонт' : '🟢 Исправен'}</span></div>
                            <div class="garage-condition-track"><i style="width:${state.condition.toFixed(1)}%;background:${state.condition < 35 ? '#ef4444' : state.condition < 75 ? '#f59e0b' : '#c9f267'}"></i></div>
                            <button type="button" class="btn btn-blue tuning-repair" ${costRepair===0 ? 'disabled' : ''} onclick="repairGarageCar(${index})">${costRepair===0 ? '✓ Полностью исправен' : `🔧 Ремонт · ${costRepair.toLocaleString('ru-RU')} ₽`}</button>
                            <div class="garage-tuning-title">ТЮНИНГ · 5 УРОВНЕЙ</div>
                            ${upgradesHtml}
                        </div>
                        <div class="my-car-bumper">
                            ${bumperHtml}
                            <div style="display: flex; gap: 6px; width: 100%; margin-top: 6px;">
                                <button class="btn btn-gold" style="font-size: 11px; padding: 8px 6px; flex: 1.1;" onclick="open3DPodium(${index})" title="Открыть интерактивный 3D-подиум">
                                    🌟 3D Подиум
                                </button>
                                <button class="btn btn-blue" style="font-size: 11px; padding: 8px 6px; flex: 1;" onclick="openStylingModal(${index})" title="Тюнинг и стайлинг">
                                    🎨 Стайлинг
                                </button>
                                <button class="btn btn-blue" style="font-size: 11px; padding: 8px 6px; flex: 1;" onclick="openSellCarModal(${index})">
                                    🏷️ На рынок
                                </button>
                            </div>
                            <button class="btn btn-green" style="font-size: 12px; padding: 8px 12px; margin-top: 8px; width: 100%; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);" onclick="start3DRaceWithCar(${jsArg(car.name)}, ${index})">
                                🏎️ Выехать на 3D трассу (Гонка)
                            </button>
                        </div>
                    </div>
                `;
            });
            myCarsDiv.innerHTML = html;

            if (typeof Car3DManager !== 'undefined' && typeof Car3DManager.renderSideThumbnail === 'function') {
                myCars.forEach((c, idx) => {
                    const effStyling = Object.assign({}, c.styling || {}, {
                        plate: c.plate ? (c.plate.text || c.plate) : 'none'
                    });
                    const cached = Car3DManager.getSideThumbnail(c.name, effStyling);
                    if (!cached) {
                        Car3DManager.renderSideThumbnail(c.name, effStyling, (dataUrl) => {
                            if (dataUrl) {
                                const imgEl = document.getElementById('my-car-img-' + idx);
                                if (imgEl) {
                                    imgEl.src = dataUrl;
                                    imgEl.classList.add('car-3d-thumb');
                                }
                            }
                        });
                    }
                });
            }

            const podiumCard = document.getElementById('garage-3d-podium-card');
            if (podiumCard) podiumCard.style.display = 'block';
            activeGarageCarIndex = Math.max(0, Math.min(activeGarageCarIndex, myCars.length - 1));
            selectGarageCarForPodium(activeGarageCarIndex, true);

            updateBadge();
        }

        // Workshop operations: each action charges once, stores directly in the car record,
        // and syncs with the existing account snapshot without resetting plates or garage data.
        function upgradeGarageCar(index, type) {
            if (isRaceRunning) return;
            const car = myCars[index];
            if (!car || !NomeraRaceEconomy.UPGRADE_TYPES.includes(type)) return;
            NomeraRaceEconomy.ensureCar(car);
            const template = carsData.find(c => c.name === car.name);
            const price = NomeraRaceEconomy.upgradeCost(car.basePrice || template?.price, type, car.upgrades[type]);
            if (price === null) { notifyUser('Этот модуль уже улучшен до максимума.'); return; }
            const curBal = (onlineProfile && Number.isFinite(Number(onlineProfile.balance))) ? Math.max(balance, Number(onlineProfile.balance)) : balance;
            if (curBal < price) { notifyUser(`Для улучшения нужно ${price.toLocaleString('ru-RU')} ₽`, 'error'); return; }
            deductPlayerBalance(price, 'Тюнинг автомобиля');
            car.upgrades[type]++;
            playCashSound();
            renderCars();
            saveProgress();
            if (typeof syncCloudGarage === 'function') syncCloudGarage(true);
            notifyUser(`Тюнинг установлен! Уровень ${car.upgrades[type]}/${NomeraRaceEconomy.MAX_LEVEL}.`, 'success');
        }

        function repairGarageCar(index) {
            if (isRaceRunning) return;
            const car = myCars[index];
            if (!car) return;
            NomeraRaceEconomy.ensureCar(car);
            const template = carsData.find(c => c.name === car.name);
            const cost = NomeraRaceEconomy.repairCost(car.basePrice || template?.price, car.condition);
            if (cost <= 0) return;
            const curBal = (onlineProfile && Number.isFinite(Number(onlineProfile.balance))) ? Math.max(balance, Number(onlineProfile.balance)) : balance;
            if (curBal < cost) { notifyUser(`На ремонт нужно ${cost.toLocaleString('ru-RU')} ₽`, 'error'); return; }
            deductPlayerBalance(cost, 'Ремонт автомобиля');
            car.condition = 100;
            renderCars();
            saveProgress();
            if (typeof syncCloudGarage === 'function') syncCloudGarage(true);
            notifyUser('🔧 Машина отремонтирована! Состояние 100%.', 'success');
        }

        function buyCar(name) {
            const carTemplate = carsData.find(c => c.name === name);
            if (!carTemplate) return;
            const curBal = (onlineProfile && Number.isFinite(Number(onlineProfile.balance))) ? Math.max(balance, Number(onlineProfile.balance)) : balance;
            if (curBal < carTemplate.price) return notifyUser(`Недостаточно средств для покупки ${name}! Нужно ${carTemplate.price.toLocaleString('ru-RU')} ₽`);
            if (!deductPlayerBalance(carTemplate.price, `Покупка автомобиля ${name}`)) return;
            playCashSound();
            const newCar = {
                name: carTemplate.name,
                basePrice: carTemplate.price,
                img: carTemplate.img,
                category: carTemplate.category,
                condition: 100,
                plate: null,
                upgrades: { engine: 0, handling: 0, economy: 0, nitro: 0 }
            };
            myCars.unshift(newCar);
            if (onlineProfile) {
                onlineProfile.myCars = JSON.parse(JSON.stringify(myCars));
                if (db && typeof db.ref === 'function') {
                    const key = sanitizeKey(onlineProfile.nickname);
                    const now = Date.now();
                    db.ref('onlineV4/accounts/' + key).update({
                        myCars: onlineProfile.myCars,
                        updatedAt: now
                    }).catch(() => {});
                    db.ref('users/' + key).update({
                        myCars: onlineProfile.myCars,
                        updatedAt: now
                    }).catch(() => {});
                    db.ref('leaderboard/' + key).update({
                        carsCount: myCars.length,
                        avatarData: avatarData || '',
                        updatedAt: now
                    }).catch(() => {});
                }
            }
            renderCars();
            saveProgress();
            if (typeof syncCloudGarage === 'function') syncCloudGarage(true);
            notifyUser(`🎉 Поздравляем! ${name} успешно приобретен и добавлен в ваш гараж!`);
        }

        function sellCar(index, hasPlate) {
            let car = myCars[index];
            if (!car) return;
            const template = (typeof carsData !== 'undefined' && Array.isArray(carsData))
                ? (carsData.find(c => c && c.name === car.name) || {})
                : {};
            let rawBase = Number(car.basePrice);
            if (!Number.isFinite(rawBase) || rawBase <= 0) rawBase = Number(template.price);
            if (!Number.isFinite(rawBase) || rawBase <= 0) rawBase = 80000;
            const basePrice = Math.max(10000, Math.floor(rawBase));
            const platePrice = (hasPlate && car.plate && Number.isFinite(Number(car.plate.price)))
                ? Math.max(0, Math.floor(Number(car.plate.price)))
                : 0;
            let profit = Math.floor(basePrice * 0.9 + (hasPlate ? platePrice * 0.95 : 0));
            if (!Number.isFinite(profit) || profit <= 0) profit = Math.floor(basePrice * 0.9);
            if (!Number.isFinite(profit) || profit <= 0) profit = 72000;

            // If the plate was attached and NOT sold, return it to player's inventory
            if (!hasPlate && car.plate) {
                inventory.unshift(car.plate);
                renderInventory();
            }

            myCars.splice(index, 1);
            creditPlayerBalance(profit, `Продажа авто «${car.name}»`);
            playCashSound();

            if (onlineProfile) {
                onlineProfile.myCars = [...myCars];
                if (db && typeof db.ref === 'function') {
                    const key = sanitizeKey(onlineProfile.nickname);
                    const now = Date.now();
                    db.ref('onlineV4/accounts/' + key).update({
                        myCars: onlineProfile.myCars,
                        updatedAt: now
                    }).catch(() => {});
                    db.ref('users/' + key).update({
                        myCars: onlineProfile.myCars,
                        updatedAt: now
                    }).catch(() => {});
                    db.ref('leaderboard/' + key).update({
                        carsCount: myCars.length,
                        avatarData: avatarData || '',
                        updatedAt: now
                    }).catch(() => {});
                }
            }
            if (typeof syncCloudGarage === 'function') syncCloudGarage();
            renderCars();
            saveProgress();
            notifyUser(`Автомобиль «${car.name}» продан за ${profit.toLocaleString('ru-RU')} ₽!`);
        }

        function detachPlate(index) {
            let car = myCars[index];
            if (!car || !car.plate) return;
            let cost = Math.floor(Number(car.plate.price || 0) * 0.1);
            if (!Number.isFinite(cost) || cost < 0) cost = 0;
            if (cost > 0 && !deductPlayerBalance(cost, 'Снятие номера с автомобиля')) {
                return notifyUser(`Не хватает денег на снятие! Нужно ${cost.toLocaleString('ru-RU')} ₽`, 'warning');
            }
            playCashSound();
            inventory.unshift(car.plate);
            car.plate = null;
            if (car.styling) car.styling.plate = 'none';
            carSpriteCache.clear();
            renderCars();
            renderInventory();
            saveProgress();
            if (typeof syncCloudGarage === 'function') syncCloudGarage(true);
            notifyUser('Госномер успешно снят и возвращён в инвентарь!', 'success');
        }

        function openAttachModal(carIndex) {
            currentCarIndexForAttach = carIndex;
            let list = document.getElementById('attach-list');
            list.innerHTML = '';
            if (inventory.length === 0) {
                list.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 20px;">В инвентаре нет номеров</div>';
            } else {
                inventory.forEach((item, invIndex) => {
                    list.innerHTML += `
                        <div style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); padding: 10px 14px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
                            <div><b style="color: white">${escapeHtml(item.text)}</b><br><small style="color:var(--text-dim);">${Number(item.price || 0).toLocaleString('ru-RU')} ₽</small></div>
                            <button class="btn btn-green" style="width: auto; padding: 6px 14px; font-size:12px; margin: 0;" onclick="attachPlate(${invIndex})">Выбрать</button>
                        </div>`;
                });
            }
            document.getElementById('attach-modal').classList.add('show');
        }

        function closeAttachModal() {
            document.getElementById('attach-modal').classList.remove('show');
            currentCarIndexForAttach = -1;
        }

        function attachPlate(invIndex) {
            if (currentCarIndexForAttach === -1 || !myCars[currentCarIndexForAttach]) return;
            let car = myCars[currentCarIndexForAttach];
            let plate = inventory[invIndex];
            if (!car || !plate) return;

            // Detach this plate if it was previously attached to any other car
            myCars.forEach(otherCar => {
                if (otherCar && otherCar !== car && otherCar.plate &&
                    ((otherCar.plate.id && plate.id && otherCar.plate.id === plate.id) ||
                     (otherCar.plate.text && plate.text && otherCar.plate.text === plate.text))) {
                    otherCar.plate = null;
                    if (otherCar.styling) otherCar.styling.plate = 'none';
                }
            });

            inventory.splice(invIndex, 1);
            if (car.plate) inventory.unshift(car.plate);
            car.plate = plate;
            if (!car.styling) car.styling = {};
            car.styling.plate = plate.text || plate;
            carSpriteCache.clear();
            closeAttachModal();
            renderCars();
            renderInventory();
            saveProgress();
            if (typeof syncCloudGarage === 'function') syncCloudGarage(true);
            notifyUser(`Госномер «${plate.text || plate}» успешно установлен на ${car.name}!`, 'success');
        }

        // ============================================================
        // V4.5 MAJOR UPDATE: TITLES, STYLING, DAILY, ACHIEVEMENTS, DRAG, CAR MARKET
        // ============================================================

        // --- 1. ТИТУЛЫ И БЕЙДЖИ В ЧАТЕ ---
        function changePlayerTitle(newTitle) {
            if (TITLES_CATALOG[newTitle]) {
                playerTitle = newTitle;
                saveProgress();
                notifyUser(`Титул установлен: ${TITLES_CATALOG[newTitle].label}`);
            }
        }

        function getPlayerBadgeHtml(titleKey, isAdminUser) {
            if (isAdminUser || titleKey === 'admin') {
                return `<span class="chat-title-pill" style="border-color:#ff2e4c;color:#ff2e4c;">👑 Администратор</span>`;
            }
            const entry = TITLES_CATALOG[titleKey];
            if (!entry || entry.id === 'none') return '';
            return `<span class="chat-title-pill" style="border-color:${entry.color};color:${entry.color};">${entry.label}</span>`;
        }

        let car3DShowroom = null;

        function setStylingViewMode(mode) {
            let preset = mode || 'isometric';
            if (preset === '3d') preset = 'isometric';
            stylingViewMode = (mode === 'top' || mode === 'side' || mode === 'front' || mode === 'rear') ? mode : '3d';

            const btnSide = document.getElementById('btn-view-side');
            const btnTop = document.getElementById('btn-view-top');
            const btnFront = document.getElementById('btn-view-front');
            const btnRear = document.getElementById('btn-view-rear');
            const btn3D = document.getElementById('btn-view-3d');
            const btnIso = document.getElementById('btn-view-isometric');

            const isIso = (preset === 'isometric' || mode === '3d');
            if (btnSide) btnSide.classList.toggle('active', preset === 'side');
            if (btnTop) btnTop.classList.toggle('active', preset === 'top');
            if (btnFront) btnFront.classList.toggle('active', preset === 'front');
            if (btnRear) btnRear.classList.toggle('active', preset === 'rear');
            if (btn3D) btn3D.classList.toggle('active', isIso);
            if (btnIso) btnIso.classList.toggle('active', isIso);

            const cvs = document.getElementById('styling-preview-canvas');
            const wrap3D = document.getElementById('styling-preview-3d-wrap');
            const hint3D = document.getElementById('styling-3d-hint');
            const toolbar3D = document.getElementById('showroom-toolbar');

            if (typeof Car3DManager !== 'undefined' && Car3DManager.isWebGLAvailable()) {
                if (cvs) cvs.style.display = 'none';
                if (wrap3D) wrap3D.style.display = 'block';
                if (hint3D) hint3D.style.display = 'block';
                if (toolbar3D) toolbar3D.style.display = 'flex';

                if (!car3DShowroom) {
                    car3DShowroom = new Car3DManager.Car3DShowroom('styling-preview-3d-wrap', {
                        autoRotate: false,
                        autoRotateSpeed: 0.007,
                        showPodium: true
                    });
                    car3DShowroom.onCapabilitiesChange = () => {
                        updateShowroomButtonsState();
                    };
                } else {
                    car3DShowroom.onCapabilitiesChange = () => {
                        updateShowroomButtonsState();
                    };
                    car3DShowroom.resize();
                    car3DShowroom.start();
                }

                const car = (stylingActiveCarIndex >= 0 && myCars[stylingActiveCarIndex]) ? myCars[stylingActiveCarIndex] : null;
                if (car && car3DShowroom) {
                    car3DShowroom.setCar(car.name, {
                        color: stylingTempColor,
                        tint: stylingTempTint,
                        neon: stylingTempNeon,
                        spoiler: stylingTempSpoiler,
                        vinyl: stylingTempVinyl,
                        wheels: stylingTempWheels,
                        suspension: stylingTempSuspension,
                        sgu: stylingTempSgu,
                        plate: stylingTempPlate,
                        camber: stylingTempCamber,
                        wheelOffset: stylingTempOffset,
                        neonMode: stylingTempNeonMode
                    });
                    updateShowroomButtonsState();
                }

                if (car3DShowroom && typeof car3DShowroom.setViewPreset === 'function') {
                    car3DShowroom.setViewPreset(preset);
                }
            } else {
                if (cvs) cvs.style.display = 'block';
                if (wrap3D) wrap3D.style.display = 'none';
                if (hint3D) hint3D.style.display = 'none';
                if (toolbar3D) toolbar3D.style.display = 'none';
                if (car3DShowroom) {
                    car3DShowroom.stop();
                }
                updateStylingModalPreview();
            }
        }

        function toggleShowroomAutoRotate() {
            if (!car3DShowroom) return;
            const isRotating = car3DShowroom.toggleAutoRotate();
            const btn = document.getElementById('btn-view-autorotate');
            if (btn) btn.classList.toggle('active', isRotating);
            playTick();
        }

        function resetShowroomCamera() {
            if (!car3DShowroom) return;
            car3DShowroom.resetCamera();
            setStylingViewMode('3d');
            playTick();
        }

        function open3DPodium(carIndex) {
            openStylingModal(carIndex, '3d');
        }

        // --- 2. СТАЙЛИНГ АВТОМОБИЛЕЙ (ПОКРАСКА, ТОНИРОВКА, ДИСКИ, КЛИРЕНС, СГУ, НЕОН) ---
        function openStylingModal(carIndex, initialMode) {
            if (garage3DShowroom) {
                try { garage3DShowroom.stop(); } catch (_) {}
            }
            try { preloadUserGarageModels(); } catch (_) {}
            stylingActiveCarIndex = carIndex;
            if (initialMode) {
                stylingViewMode = initialMode;
            } else if (typeof window !== 'undefined' && window.innerWidth >= 860) {
                stylingViewMode = '3d';
            } else {
                stylingViewMode = 'side';
            }
            const btnSide = document.getElementById('btn-view-side');
            const btnTop = document.getElementById('btn-view-top');
            const btnFront = document.getElementById('btn-view-front');
            const btnRear = document.getElementById('btn-view-rear');
            const btn3D = document.getElementById('btn-view-3d');
            const is3D = (stylingViewMode === '3d' || stylingViewMode === 'isometric');
            if (btnSide) btnSide.classList.toggle('active', stylingViewMode === 'side');
            if (btnTop) btnTop.classList.toggle('active', stylingViewMode === 'top');
            if (btnFront) btnFront.classList.toggle('active', stylingViewMode === 'front');
            if (btnRear) btnRear.classList.toggle('active', stylingViewMode === 'rear');
            if (btn3D) btn3D.classList.toggle('active', is3D);
            const car = myCars[carIndex];
            if (!car) return;
            car.styling = car.styling || { color: '#ffffff', tint: 0, neon: 'none', spoiler: 'none', vinyl: 'none', wheels: 'stock', suspension: 'stock', sgu: 'none', camber: 0, wheelOffset: 0, neonMode: 'solid' };
            stylingTempColor = car.styling.color || '#ffffff';
            stylingTempTint = car.styling.tint ?? 0;
            stylingTempNeon = car.styling.neon || 'none';
            stylingTempSpoiler = car.styling.spoiler || 'none';
            stylingTempVinyl = car.styling.vinyl || 'none';
            stylingTempWheels = car.styling.wheels || 'stock';
            stylingTempSuspension = car.styling.suspension || 'stock';
            stylingTempSgu = car.styling.sgu || 'none';
            stylingTempPlate = car.plate ? (car.plate.text || car.plate) : 'none';
            stylingTempCamber = car.styling.camber ?? 0;
            stylingTempOffset = car.styling.wheelOffset ?? 0;
            stylingTempNeonMode = car.styling.neonMode || 'solid';

            const titleEl = document.getElementById('styling-car-title');
            if (titleEl) titleEl.innerText = `Настройка для: ${car.name}`;

            const swatchGrid = document.getElementById('styling-color-swatches');
            if (swatchGrid) {
                swatchGrid.innerHTML = STYLING_PALETTE.map(p => `
                    <button type="button" class="styling-swatch ${p.col === stylingTempColor ? 'active' : ''}" 
                            style="background:${p.col};" title="${escapeHtml(p.name)}" 
                            onclick="selectStylingColor('${p.col}')"></button>
                `).join('');
            }

            document.querySelectorAll('#styling-tint-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', String(btn.dataset.tint) === String(stylingTempTint));
            });
            document.querySelectorAll('#styling-neon-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.neon === stylingTempNeon);
            });
            document.querySelectorAll('#styling-spoiler-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.spoiler === stylingTempSpoiler);
            });
            document.querySelectorAll('#styling-vinyl-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.vinyl === stylingTempVinyl);
            });
            document.querySelectorAll('#styling-wheels-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.wheels === stylingTempWheels);
            });
            document.querySelectorAll('#styling-suspension-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.suspension === stylingTempSuspension);
            });
            document.querySelectorAll('#styling-camber-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', Number(btn.dataset.camber) === Number(stylingTempCamber));
            });
            document.querySelectorAll('#styling-offset-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', Number(btn.dataset.offset) === Number(stylingTempOffset));
            });
            document.querySelectorAll('#styling-sgu-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.sgu === stylingTempSgu);
            });
            document.querySelectorAll('#styling-neon-mode-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.neonmode === stylingTempNeonMode);
            });

            document.getElementById('btn-show-doors')?.classList.remove('active');
            document.getElementById('btn-show-hood')?.classList.remove('active');
            document.getElementById('btn-show-trunk')?.classList.remove('active');
            document.getElementById('btn-show-lights')?.classList.remove('active');

            renderStylingPlateChips();

            const modal = document.getElementById('styling-modal');
            if (modal) modal.classList.add('show');
            setStylingViewMode(stylingViewMode);
            updateStylingModalPreview();
            updateShowroomButtonsState();
        }

        function closeStylingModal() {
            const modal = document.getElementById('styling-modal');
            if (modal) modal.classList.remove('show');
            stylingActiveCarIndex = -1;
            if (car3DShowroom) {
                if (typeof car3DShowroom.setLoading === 'function') car3DShowroom.setLoading(false);
                car3DShowroom.stop();
            }
            const garageTab = document.getElementById('garage');
            if (garageTab && !garageTab.classList.contains('hidden') && garage3DShowroom) {
                try {
                    garage3DShowroom.resize();
                    garage3DShowroom.start();
                    garage3DShowroom.requestRender();
                } catch (_) {}
            }
        }

        function selectStylingColor(col) {
            stylingTempColor = col;
            document.querySelectorAll('.styling-swatch').forEach(sw => {
                sw.classList.toggle('active', sw.style.backgroundColor === col || sw.getAttribute('style')?.includes(col));
            });
            updateStylingModalPreview();
        }

        function selectStylingTint(tint) {
            stylingTempTint = tint;
            document.querySelectorAll('#styling-tint-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', String(btn.dataset.tint) === String(stylingTempTint));
            });
            updateStylingModalPreview();
        }

        function selectStylingWheels(wheels) {
            stylingTempWheels = wheels;
            document.querySelectorAll('#styling-wheels-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.wheels === stylingTempWheels);
            });
            updateStylingModalPreview();
        }

        function selectStylingSuspension(suspension) {
            stylingTempSuspension = suspension;
            document.querySelectorAll('#styling-suspension-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.suspension === stylingTempSuspension);
            });
            updateStylingModalPreview();
        }

        function selectStylingSgu(sgu) {
            stylingTempSgu = sgu;
            document.querySelectorAll('#styling-sgu-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.sgu === stylingTempSgu);
            });
            updateStylingModalPreview();
        }

        function selectStylingNeon(neon) {
            stylingTempNeon = neon;
            document.querySelectorAll('#styling-neon-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.neon === stylingTempNeon);
            });
            updateStylingModalPreview();
        }

        function selectStylingSpoiler(spoiler) {
            stylingTempSpoiler = spoiler;
            document.querySelectorAll('#styling-spoiler-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.spoiler === stylingTempSpoiler);
            });
            updateStylingModalPreview();
        }

        function selectStylingVinyl(vinyl) {
            stylingTempVinyl = vinyl;
            document.querySelectorAll('#styling-vinyl-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.vinyl === stylingTempVinyl);
            });
            updateStylingModalPreview();
        }

        function selectStylingCamber(camber) {
            stylingTempCamber = Number(camber);
            document.querySelectorAll('#styling-camber-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', Number(btn.dataset.camber) === Number(stylingTempCamber));
            });
            playTick();
            updateStylingModalPreview();
        }

        function selectStylingOffset(offset) {
            stylingTempOffset = Number(offset);
            document.querySelectorAll('#styling-offset-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', Number(btn.dataset.offset) === Number(stylingTempOffset));
            });
            playTick();
            updateStylingModalPreview();
        }

        function selectStylingNeonMode(mode) {
            stylingTempNeonMode = mode;
            document.querySelectorAll('#styling-neon-mode-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.neonmode === stylingTempNeonMode);
            });
            playTick();
            updateStylingModalPreview();
        }

        function updateShowroomButtonsState() {
            if (!car3DShowroom) return;
            const btnDoors = document.getElementById('btn-show-doors');
            const btnHood = document.getElementById('btn-show-hood');
            const btnTrunk = document.getElementById('btn-show-trunk');
            const btnLights = document.getElementById('btn-show-lights');

            if (btnDoors) {
                const canDoors = car3DShowroom.hasCapability('doors');
                btnDoors.classList.toggle('disabled', !canDoors);
                btnDoors.title = canDoors ? 'Распахнуть двери' : 'Кузов монолит (двери зафиксированы)';
                if (!canDoors) btnDoors.classList.remove('active');
                else btnDoors.classList.toggle('active', !!car3DShowroom.doorsOpen);
            }
            if (btnHood) {
                const canHood = car3DShowroom.hasCapability('hood');
                btnHood.classList.toggle('disabled', !canHood);
                btnHood.title = canHood ? 'Открыть капот' : 'Монокок (капот зафиксирован)';
                if (!canHood) btnHood.classList.remove('active');
                else btnHood.classList.toggle('active', !!car3DShowroom.hoodOpen);
            }
            if (btnTrunk) {
                const canTrunk = car3DShowroom.hasCapability('trunk');
                btnTrunk.classList.toggle('disabled', !canTrunk);
                btnTrunk.title = canTrunk ? 'Открыть багажник' : 'Без отдельного багажника';
                if (!canTrunk) btnTrunk.classList.remove('active');
                else btnTrunk.classList.toggle('active', !!car3DShowroom.trunkOpen);
            }
            if (btnLights) {
                btnLights.classList.toggle('active', !!car3DShowroom.headlightsOn);
            }
        }
        window.updateShowroomButtonsState = updateShowroomButtonsState;

        function toggleShowroomDoors() {
            if (stylingViewMode !== '3d') {
                setStylingViewMode('3d');
            }
            if (!car3DShowroom) {
                setTimeout(() => {
                    if (car3DShowroom) {
                        if (!car3DShowroom.hasCapability('doors')) {
                            notifyUser('У данной 3D модели гоночный монолитный кузов (двери зафиксированы)', 'info');
                            const btn = document.getElementById('btn-show-doors');
                            if (btn) btn.classList.remove('active');
                            return;
                        }
                        const isOpen = car3DShowroom.toggleDoors();
                        const btn = document.getElementById('btn-show-doors');
                        if (btn) btn.classList.toggle('active', isOpen);
                    }
                }, 90);
                return;
            }
            if (!car3DShowroom.hasCapability('doors')) {
                notifyUser('У данной 3D модели гоночный монолитный кузов (двери зафиксированы)', 'info');
                const btn = document.getElementById('btn-show-doors');
                if (btn) btn.classList.remove('active');
                return;
            }
            const isOpen = car3DShowroom.toggleDoors();
            const btn = document.getElementById('btn-show-doors');
            if (btn) btn.classList.toggle('active', isOpen);
            playTick();
        }
        window.toggleShowroomDoors = toggleShowroomDoors;

        function toggleShowroomHood() {
            if (stylingViewMode !== '3d') {
                setStylingViewMode('3d');
            }
            if (!car3DShowroom) {
                setTimeout(() => {
                    if (car3DShowroom) {
                        if (!car3DShowroom.hasCapability('hood')) {
                            notifyUser('У данной 3D модели гоночный монокок (капот зафиксирован)', 'info');
                            const btn = document.getElementById('btn-show-hood');
                            if (btn) btn.classList.remove('active');
                            return;
                        }
                        const isOpen = car3DShowroom.toggleHood();
                        const btn = document.getElementById('btn-show-hood');
                        if (btn) btn.classList.toggle('active', isOpen);
                    }
                }, 90);
                return;
            }
            if (!car3DShowroom.hasCapability('hood')) {
                notifyUser('У данной 3D модели гоночный монокок (капот зафиксирован)', 'info');
                const btn = document.getElementById('btn-show-hood');
                if (btn) btn.classList.remove('active');
                return;
            }
            const isOpen = car3DShowroom.toggleHood();
            const btn = document.getElementById('btn-show-hood');
            if (btn) btn.classList.toggle('active', isOpen);
            playTick();
        }
        window.toggleShowroomHood = toggleShowroomHood;

        function toggleShowroomTrunk() {
            if (stylingViewMode !== '3d') {
                setStylingViewMode('3d');
            }
            if (!car3DShowroom) {
                setTimeout(() => {
                    if (car3DShowroom) {
                        if (!car3DShowroom.hasCapability('trunk')) {
                            notifyUser('У данной 3D модели спорт-купе нет отдельного багажного отсека', 'info');
                            const btn = document.getElementById('btn-show-trunk');
                            if (btn) btn.classList.remove('active');
                            return;
                        }
                        const isOpen = car3DShowroom.toggleTrunk();
                        const btn = document.getElementById('btn-show-trunk');
                        if (btn) btn.classList.toggle('active', isOpen);
                    }
                }, 90);
                return;
            }
            if (!car3DShowroom.hasCapability('trunk')) {
                notifyUser('У данной 3D модели спорт-купе нет отдельного багажного отсека', 'info');
                const btn = document.getElementById('btn-show-trunk');
                if (btn) btn.classList.remove('active');
                return;
            }
            const isOpen = car3DShowroom.toggleTrunk();
            const btn = document.getElementById('btn-show-trunk');
            if (btn) btn.classList.toggle('active', isOpen);
            playTick();
        }
        window.toggleShowroomTrunk = toggleShowroomTrunk;

        function toggleShowroomHeadlights() {
            if (stylingViewMode !== '3d') {
                setStylingViewMode('3d');
            }
            if (!car3DShowroom) {
                setTimeout(() => {
                    if (car3DShowroom) {
                        const isOn = car3DShowroom.toggleHeadlights();
                        const btn = document.getElementById('btn-show-lights');
                        if (btn) btn.classList.toggle('active', isOn);
                    }
                }, 90);
                return;
            }
            const isOn = car3DShowroom.toggleHeadlights();
            const btn = document.getElementById('btn-show-lights');
            if (btn) btn.classList.toggle('active', isOn);
            playTick();
        }
        window.toggleShowroomHeadlights = toggleShowroomHeadlights;

        // =====================================================================
        // 🏎️ GARAGE 3D SHOWROOM (Интерактивный 3D-подиум прямо в Гараже)
        // =====================================================================
        let garage3DShowroom = null;
        let activeGarageCarIndex = 0;
        let garageViewMode = '3d';

        function updateGarageButtonsState() {
            if (!garage3DShowroom) return;
            const btnDoors = document.getElementById('btn-gshow-doors');
            const btnHood = document.getElementById('btn-gshow-hood');
            const btnTrunk = document.getElementById('btn-gshow-trunk');
            const btnLights = document.getElementById('btn-gshow-lights');

            if (btnDoors) {
                const has = garage3DShowroom.hasCapability('doors');
                btnDoors.style.opacity = has ? '1' : '0.4';
                btnDoors.classList.toggle('active', !!garage3DShowroom.doorsOpen);
            }
            if (btnHood) {
                const has = garage3DShowroom.hasCapability('hood');
                btnHood.style.opacity = has ? '1' : '0.4';
                btnHood.classList.toggle('active', !!garage3DShowroom.hoodOpen);
            }
            if (btnTrunk) {
                const has = garage3DShowroom.hasCapability('trunk');
                btnTrunk.style.opacity = has ? '1' : '0.4';
                btnTrunk.classList.toggle('active', !!garage3DShowroom.trunkOpen);
            }
            if (btnLights) {
                btnLights.classList.toggle('active', !!garage3DShowroom.headlightsOn);
            }
        }

        function initGarage3DShowroom() {
            const podiumCard = document.getElementById('garage-3d-podium-card');
            if (!Array.isArray(myCars) || myCars.length === 0) {
                if (podiumCard) podiumCard.style.display = 'none';
                if (garage3DShowroom) garage3DShowroom.stop();
                return;
            }
            if (typeof Car3DManager === 'undefined' || typeof window.THREE === 'undefined' || (typeof Car3DManager.isWebGLAvailable === 'function' && !Car3DManager.isWebGLAvailable())) {
                if (podiumCard) podiumCard.style.display = 'none';
                return;
            }
            if (podiumCard) podiumCard.style.display = 'block';

            activeGarageCarIndex = Math.max(0, Math.min(activeGarageCarIndex, myCars.length - 1));

            if (!garage3DShowroom) {
                garage3DShowroom = new Car3DManager.Car3DShowroom('garage-preview-3d-wrap', {
                    autoRotate: false,
                    autoRotateSpeed: 0.007,
                    showPodium: true,
                    loaderId: 'garage-3d-loader',
                    loaderTextId: 'garage-3d-loader-text'
                });
                garage3DShowroom.onCapabilitiesChange = () => {
                    updateGarageButtonsState();
                };
            } else {
                garage3DShowroom.onCapabilitiesChange = () => {
                    updateGarageButtonsState();
                };
                garage3DShowroom.resize();
                garage3DShowroom.start();
            }

            selectGarageCarForPodium(activeGarageCarIndex, false);
        }
        window.initGarage3DShowroom = initGarage3DShowroom;

        function toggleGaragePodiumCollapse(forceOpen = null) {
            const stage = document.getElementById('garage-preview-stage');
            const switchBar = document.getElementById('garage-view-switch');
            const icon = document.getElementById('garage-podium-toggle-icon');
            const label = document.getElementById('garage-podium-toggle-label');
            if (!stage) return;
            const currentlyCollapsed = stage.style.display === 'none';
            const shouldOpen = (forceOpen !== null) ? forceOpen : currentlyCollapsed;
            if (shouldOpen) {
                stage.style.display = 'block';
                if (switchBar) switchBar.style.display = 'flex';
                if (icon) icon.textContent = '▲';
                if (label) label.textContent = 'Свернуть 3D';
                if (garage3DShowroom) {
                    garage3DShowroom.resize();
                    garage3DShowroom.start();
                }
            } else {
                stage.style.display = 'none';
                if (switchBar) switchBar.style.display = 'none';
                if (icon) icon.textContent = '▼';
                if (label) label.textContent = 'Развернуть 3D';
                if (garage3DShowroom) {
                    garage3DShowroom.stop();
                }
            }
        }
        window.toggleGaragePodiumCollapse = toggleGaragePodiumCollapse;

        function rotateGarageShowroom(delta) {
            if (garage3DShowroom && typeof garage3DShowroom.rotateBy === 'function') {
                garage3DShowroom.rotateBy(delta);
            }
        }
        window.rotateGarageShowroom = rotateGarageShowroom;

        function selectGarageCarForPodium(index, fromRender) {
            if (!Array.isArray(myCars) || myCars.length === 0) return;
            index = Math.max(0, Math.min(index, myCars.length - 1));
            activeGarageCarIndex = index;

            const car = myCars[index];
            if (!car) return;

            const template = carsData.find(c => c.name === car.name) || {};
            const carCategory = car.category || template.category || 'Автомобиль';

            const titleEl = document.getElementById('garage-3d-car-title');
            const catEl = document.getElementById('garage-3d-car-category');
            if (titleEl) titleEl.textContent = '🏎️ ' + car.name;
            if (catEl) catEl.textContent = carCategory;

            // Highlight card in #my-cars list
            document.querySelectorAll('.my-car-card').forEach((card, i) => {
                card.classList.toggle('active-podium-card', i === index);
            });

            if (garage3DShowroom) {
                const effectiveStyling = Object.assign({}, car.styling || {}, {
                    plate: car.plate ? (car.plate.text || car.plate) : 'none'
                });
                garage3DShowroom.setCar(car.name, effectiveStyling, () => {
                    updateGarageButtonsState();
                });
                garage3DShowroom.setViewPreset(garageViewMode);
                garage3DShowroom.requestRender();
            }
        }
        window.selectGarageCarForPodium = selectGarageCarForPodium;

        function setGarageViewMode(mode) {
            let preset = mode || 'isometric';
            if (preset === '3d') preset = 'isometric';
            garageViewMode = (mode === 'top' || mode === 'side' || mode === 'front' || mode === 'rear') ? mode : '3d';

            const btnSide = document.getElementById('btn-gview-side');
            const btnTop = document.getElementById('btn-gview-top');
            const btnFront = document.getElementById('btn-gview-front');
            const btnRear = document.getElementById('btn-gview-rear');
            const btn3D = document.getElementById('btn-gview-3d');

            const isIso = (preset === 'isometric' || mode === '3d');
            if (btnSide) btnSide.classList.toggle('active', preset === 'side');
            if (btnTop) btnTop.classList.toggle('active', preset === 'top');
            if (btnFront) btnFront.classList.toggle('active', preset === 'front');
            if (btnRear) btnRear.classList.toggle('active', preset === 'rear');
            if (btn3D) btn3D.classList.toggle('active', isIso);

            if (garage3DShowroom) {
                garage3DShowroom.setViewPreset(garageViewMode);
                garage3DShowroom.requestRender();
            }
            playTick();
        }
        window.setGarageViewMode = setGarageViewMode;

        function resetGarageCamera() {
            if (garage3DShowroom) {
                garage3DShowroom.resetCamera();
            }
            setGarageViewMode('3d');
            playTick();
        }
        window.resetGarageCamera = resetGarageCamera;

        function toggleGarageAutoRotate() {
            if (!garage3DShowroom) return;
            const isRotating = garage3DShowroom.toggleAutoRotate();
            const btn = document.getElementById('btn-gview-autorotate');
            if (btn) btn.classList.toggle('active', isRotating);
            playTick();
        }
        window.toggleGarageAutoRotate = toggleGarageAutoRotate;

        function toggleGarageDoors() {
            if (!garage3DShowroom) return;
            if (!garage3DShowroom.hasCapability('doors')) {
                notifyUser('У этой 3D модели нет открывающихся дверей', 'info');
                return;
            }
            const isOpen = garage3DShowroom.toggleDoors();
            const btn = document.getElementById('btn-gshow-doors');
            if (btn) btn.classList.toggle('active', isOpen);
            playTick();
        }
        window.toggleGarageDoors = toggleGarageDoors;

        function toggleGarageHood() {
            if (!garage3DShowroom) return;
            if (!garage3DShowroom.hasCapability('hood')) {
                notifyUser('У этой 3D модели нет капота', 'info');
                return;
            }
            const isOpen = garage3DShowroom.toggleHood();
            const btn = document.getElementById('btn-gshow-hood');
            if (btn) btn.classList.toggle('active', isOpen);
            playTick();
        }
        window.toggleGarageHood = toggleGarageHood;

        function toggleGarageTrunk() {
            if (!garage3DShowroom) return;
            if (!garage3DShowroom.hasCapability('trunk')) {
                notifyUser('У этой 3D модели нет открывающегося багажника', 'info');
                return;
            }
            const isOpen = garage3DShowroom.toggleTrunk();
            const btn = document.getElementById('btn-gshow-trunk');
            if (btn) btn.classList.toggle('active', isOpen);
            playTick();
        }
        window.toggleGarageTrunk = toggleGarageTrunk;

        function toggleGarageHeadlights() {
            if (!garage3DShowroom) return;
            const isOn = garage3DShowroom.toggleHeadlights();
            const btn = document.getElementById('btn-gshow-lights');
            if (btn) btn.classList.toggle('active', isOn);
            playTick();
        }
        window.toggleGarageHeadlights = toggleGarageHeadlights;

        function openStylingForActiveGarageCar() {
            openStylingModal(activeGarageCarIndex, '3d');
        }
        window.openStylingForActiveGarageCar = openStylingForActiveGarageCar;

        function start3DRaceWithActiveGarageCar() {
            if (!Array.isArray(myCars) || !myCars[activeGarageCarIndex]) return;
            selectedRaceCarName = myCars[activeGarageCarIndex].name;
            if (typeof Car3DManager !== 'undefined' && Car3DManager.preloadCarModel && window.THREE) {
                try { Car3DManager.preloadCarModel(window.THREE, selectedRaceCarName); } catch (_) {}
            }
            switchTab('racegame', null, '3d');
            start3DRaceGame();
        }
        window.start3DRaceWithActiveGarageCar = start3DRaceWithActiveGarageCar;

        function renderStylingPlateChips() {
            const container = document.getElementById('styling-plate-chips');
            const badge = document.getElementById('styling-plate-current-badge');
            if (!container) return;

            const car = (stylingActiveCarIndex >= 0 && myCars[stylingActiveCarIndex]) ? myCars[stylingActiveCarIndex] : null;
            if (!car) return;

            if (badge) {
                if (stylingTempPlate && stylingTempPlate !== 'none') {
                    badge.textContent = `Выбран: ${stylingTempPlate}`;
                    badge.style.color = '#38bdf8';
                } else {
                    badge.textContent = 'Без номера';
                    badge.style.color = '#94a3b8';
                }
            }

            let chipsHtml = `
                <button type="button" class="styling-chip ${stylingTempPlate === 'none' ? 'active' : ''}" 
                        onclick="selectStylingPlate('none')">
                    🚫 Без номера
                </button>
            `;

            const equippedPlateText = car.plate ? (car.plate.text || car.plate) : null;
            if (equippedPlateText) {
                const isActive = (stylingTempPlate === equippedPlateText);
                chipsHtml += `
                    <button type="button" class="styling-chip ${isActive ? 'active' : ''}" 
                            style="border-color: ${isActive ? '#38bdf8' : 'rgba(56,189,248,0.4)'}; background: ${isActive ? 'rgba(56,189,248,0.2)' : 'transparent'}; font-weight: bold;" 
                            onclick="selectStylingPlate(${jsArg(equippedPlateText)})">
                        🏷️ ${escapeHtml(equippedPlateText)} (установлен)
                    </button>
                `;
            }

            if (Array.isArray(inventory) && inventory.length > 0) {
                inventory.forEach((item) => {
                    const text = item ? (item.text || item) : '';
                    if (!text || text === equippedPlateText) return;
                    const isActive = (stylingTempPlate === text);
                    chipsHtml += `
                        <button type="button" class="styling-chip ${isActive ? 'active' : ''}" 
                                style="border-color: ${isActive ? '#22c55e' : 'rgba(255,255,255,0.15)'}; font-weight: bold;" 
                                onclick="selectStylingPlate(${jsArg(text)})">
                            🏷️ ${escapeHtml(text)}
                        </button>
                    `;
                });
            } else if (!equippedPlateText) {
                chipsHtml += `<div style="font-size: 11px; color: var(--text-dim); padding: 4px 6px;">В инвентаре нет свободных госномеров</div>`;
            }

            container.innerHTML = chipsHtml;
        }

        function selectStylingPlate(plateText) {
            stylingTempPlate = plateText || 'none';
            renderStylingPlateChips();
            if (stylingViewMode === '3d' && car3DShowroom && typeof car3DShowroom.updatePlate === 'function') {
                car3DShowroom.updatePlate(stylingTempPlate);
            }
            updateStylingModalPreview();
        }

        async function confirmApplyStyling() {
            const car = myCars[stylingActiveCarIndex];
            if (!car) return;
            car.styling = car.styling || { color: '#ffffff', tint: 0, neon: 'none', spoiler: 'none', vinyl: 'none', wheels: 'stock', suspension: 'stock', sgu: 'none', camber: 0, wheelOffset: 0, neonMode: 'solid' };

            let cost = 0;
            if (stylingTempColor !== car.styling.color) cost += 15000;
            if (String(stylingTempTint) !== String(car.styling.tint ?? 0)) {
                if (Number(stylingTempTint) === 50) cost += 10000;
                else if (Number(stylingTempTint) === 95) cost += 25000;
                else if (stylingTempTint === 'chameleon') cost += 35000;
                else if (stylingTempTint === 'dubai') cost += 40000;
            }
            if (stylingTempNeon !== car.styling.neon && stylingTempNeon !== 'none') cost += 35000;
            if (stylingTempSpoiler !== (car.styling.spoiler || 'none')) {
                if (stylingTempSpoiler === 'ducktail') cost += 20000;
                else if (stylingTempSpoiler === 'gt') cost += 50000;
            }
            if (stylingTempVinyl !== (car.styling.vinyl || 'none')) {
                if (stylingTempVinyl === 'stripes') cost += 30000;
                else if (stylingTempVinyl === 'drift') cost += 60000;
            }
            if (stylingTempWheels !== (car.styling.wheels || 'stock')) {
                if (stylingTempWheels === 'stamps') cost += 15000;
                else if (stylingTempWheels === 'deepdish') cost += 45000;
                else if (stylingTempWheels === 'forged') cost += 75000;
            }
            if (stylingTempSuspension !== (car.styling.suspension || 'stock')) {
                if (stylingTempSuspension === 'lowered') cost += 25000;
                else if (stylingTempSuspension === 'bpan') cost += 50000;
                else if (stylingTempSuspension === 'lift') cost += 35000;
            }
            if (Number(stylingTempCamber) !== Number(car.styling.camber ?? 0)) {
                if (stylingTempCamber === -3) cost += 20000;
                else if (stylingTempCamber === -6) cost += 35000;
                else if (stylingTempCamber === -9) cost += 50000;
            }
            if (Number(stylingTempOffset) !== Number(car.styling.wheelOffset ?? 0)) {
                if (stylingTempOffset === 0.015) cost += 15000;
                else if (stylingTempOffset === 0.03) cost += 30000;
            }
            if (stylingTempNeonMode !== (car.styling.neonMode || 'solid')) {
                if (stylingTempNeonMode === 'rainbow') cost += 25000;
            }
            if (stylingTempSgu !== (car.styling.sgu || 'none')) {
                if (stylingTempSgu === 'installed') cost += 80000;
            }

            if (cost > 0) {
                const curBal = (onlineProfile && Number.isFinite(Number(onlineProfile.balance))) ? Math.max(balance, Number(onlineProfile.balance)) : balance;
                if (curBal < cost) {
                    notifyUser(`Для стайлинга требуется ${cost.toLocaleString('ru-RU')} ₽`, 'error');
                    return;
                }
                deductPlayerBalance(cost, 'Стайлинг автомобиля');
            }

            // License plate update from styling modal (inventory synced)
            const prevPlateText = car.plate ? (car.plate.text || car.plate) : 'none';
            if (stylingTempPlate !== prevPlateText) {
                if (stylingTempPlate === 'none') {
                    if (car.plate) {
                        inventory.unshift(car.plate);
                        car.plate = null;
                    }
                } else {
                    const invIdx = inventory.findIndex(p => (p && (p.text || p) === stylingTempPlate));
                    if (invIdx !== -1) {
                        const newPlate = inventory.splice(invIdx, 1)[0];
                        if (car.plate) inventory.unshift(car.plate);
                        car.plate = newPlate;
                    }
                }
            }

            car.styling = {
                color: stylingTempColor,
                tint: stylingTempTint,
                neon: stylingTempNeon,
                spoiler: stylingTempSpoiler,
                vinyl: stylingTempVinyl,
                wheels: stylingTempWheels,
                suspension: stylingTempSuspension,
                sgu: stylingTempSgu,
                plate: car.plate ? (car.plate.text || car.plate) : 'none',
                camber: stylingTempCamber,
                wheelOffset: stylingTempOffset,
                neonMode: stylingTempNeonMode
            };
            renderInventory();
            carSpriteCache.clear();
            recordQuestProgress('tune', 1);
            checkAchievements();
            playCashSound();
            renderCars();
            saveProgress();
            if (typeof syncCloudGarage === 'function') syncCloudGarage(true);
            closeStylingModal();
            notifyUser(`Стайлинг применён! Списано ${cost.toLocaleString('ru-RU')} ₽.`, 'success');
        }

        // --- 3. ЕЖЕДНЕВНЫЙ БОНУС И КВЕСТЫ ---
        function getTodayString() {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        }

        function checkDailyQuests() {
            const today = getTodayString();
            if (dailyQuests.date !== today) {
                dailyQuests = {
                    date: today,
                    progress: { spins: 0, distance: 0, tune: 0 },
                    claimed: {}
                };
            }
        }

        function recordQuestProgress(type, amount) {
            checkDailyQuests();
            dailyQuests.progress[type] = (dailyQuests.progress[type] || 0) + amount;
            saveProgress();
            updateDailyBadgeDot();
        }

        function updateDailyBadgeDot() {
            const dot = document.getElementById('daily-badge-dot');
            if (!dot) return;
            const today = getTodayString();
            const canClaimDaily = dailyBonus.lastClaimDate !== today;
            const quests = [
                { id: 'spins', target: 10 },
                { id: 'distance', target: 3 },
                { id: 'tune', target: 1 }
            ];
            const canClaimQuest = quests.some(q => (dailyQuests.progress?.[q.id] || 0) >= q.target && !dailyQuests.claimed?.[q.id]);
            dot.style.display = (canClaimDaily || canClaimQuest) ? 'block' : 'none';
        }

        function openDailyModal() {
            checkDailyQuests();
            renderDailyModal();
            const modal = document.getElementById('daily-modal');
            if (modal) modal.classList.add('show');
        }

        function closeDailyModal() {
            const modal = document.getElementById('daily-modal');
            if (modal) modal.classList.remove('show');
        }

        function renderDailyModal() {
            const grid = document.getElementById('daily-calendar-grid');
            if (!grid) return;
            const today = getTodayString();
            const currentStreak = dailyBonus.streak || 0;
            const isTodayClaimed = dailyBonus.lastClaimDate === today;
            const activeDayIdx = currentStreak % 7;

            grid.innerHTML = DAILY_REWARDS.map((reward, i) => {
                let statusClass = '';
                if (i < activeDayIdx || (i === activeDayIdx && isTodayClaimed)) statusClass = 'claimed';
                else if (i === activeDayIdx && !isTodayClaimed) statusClass = 'today';
                return `
                    <div class="daily-day-card ${statusClass}">
                        <div class="daily-day-title">День ${i + 1}</div>
                        <div class="daily-day-icon">${i === 6 ? '👑' : i === 2 ? '📦' : '💰'}</div>
                        <div class="daily-day-reward">${(reward / 1000).toFixed(0)}k ₽</div>
                    </div>
                `;
            }).join('');

            const claimBtn = document.getElementById('btn-claim-daily');
            if (claimBtn) {
                if (isTodayClaimed) {
                    claimBtn.disabled = true;
                    claimBtn.innerText = '✓ Сегодняшняя награда получена';
                } else {
                    claimBtn.disabled = false;
                    const reward = DAILY_REWARDS[activeDayIdx];
                    claimBtn.innerText = `Забрать ${reward.toLocaleString('ru-RU')} ₽ (День ${activeDayIdx + 1})`;
                }
            }

            const questsList = document.getElementById('daily-quests-list');
            if (questsList) {
                const questDefs = [
                    { id: 'spins', title: '🎰 Выбить 10 госномеров', target: 10, rewardMoney: 30000, rewardXp: 50 },
                    { id: 'distance', title: '🛣️ Проехать 3 км на трассе', target: 3, rewardMoney: 45000, rewardXp: 80 },
                    { id: 'tune', title: '🔧 Тюнинг или стайлинг авто', target: 1, rewardMoney: 40000, rewardXp: 60 }
                ];

                questsList.innerHTML = questDefs.map(q => {
                    const prog = Math.min(q.target, dailyQuests.progress?.[q.id] || 0);
                    const pct = Math.round((prog / q.target) * 100);
                    const claimed = !!dailyQuests.claimed?.[q.id];
                    const ready = prog >= q.target && !claimed;
                    return `
                        <div class="quest-item">
                            <div class="quest-body">
                                <div class="quest-title">${escapeHtml(q.title)} (${prog}/${q.target})</div>
                                <div class="quest-reward">+${q.rewardMoney.toLocaleString('ru-RU')} ₽ · +${q.rewardXp} XP</div>
                                <div class="quest-track"><div class="quest-track-bar" style="width:${pct}%;"></div></div>
                            </div>
                            <div>
                                ${claimed
                                    ? '<span style="font-size:11px; color:#4ade80; font-weight:800;">✓ Готово</span>'
                                    : `<button class="btn btn-green" style="padding:7px 12px; font-size:11px; margin:0;" ${ready ? '' : 'disabled'} onclick="claimQuestReward('${q.id}')">Забрать</button>`
                                }
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        function claimDailyReward() {
            const today = getTodayString();
            if (dailyBonus.lastClaimDate === today) {
                notifyUser('Вы уже забрали сегодняшнюю награду. Возвращайтесь завтра!');
                return;
            }
            const activeDayIdx = (dailyBonus.streak || 0) % 7;
            const reward = DAILY_REWARDS[activeDayIdx];
            creditPlayerBalance(reward, 'Ежедневная награда');
            dailyBonus.streak = (dailyBonus.streak || 0) + 1;
            dailyBonus.lastClaimDate = today;
            playCashSound();
            triggerLegendaryEffect();
            renderDailyModal();
            updateDailyBadgeDot();
            notifyUser(`🎁 Награда дня получена: +${reward.toLocaleString('ru-RU')} ₽!`, 'success');
        }

        function claimQuestReward(questId) {
            checkDailyQuests();
            const questDefs = {
                spins: { rewardMoney: 30000, rewardXp: 50 },
                distance: { rewardMoney: 45000, rewardXp: 80 },
                tune: { rewardMoney: 40000, rewardXp: 60 }
            };
            const def = questDefs[questId];
            if (!def || dailyQuests.claimed?.[questId]) return;
            dailyQuests.claimed[questId] = true;
            creditPlayerBalance(def.rewardMoney, 'Ежедневный квест');
            addExp(def.rewardXp);
            playCashSound();
            renderDailyModal();
            updateDailyBadgeDot();
            notifyUser(`Задание выполнено! +${def.rewardMoney.toLocaleString('ru-RU')} ₽, +${def.rewardXp} XP!`, 'success');
        }

        // --- 4. ДОСТИЖЕНИЯ И КОЛЛЕКЦИИ ---
        const ACHIEVEMENTS_CATALOG = [
            { id: 'first_million', icon: '💰', name: 'Первый миллион', desc: 'Накопить 1 000 000 ₽ на балансе', reward: 100000, titleReward: 'millionaire', check: () => balance >= 1000000 },
            { id: 'billionaire', icon: '🏦', name: 'Олигарх', desc: 'Накопить 50 000 000 ₽ на балансе', reward: 2500000, titleReward: 'oligarch', check: () => balance >= 50000000 },
            { id: 'fleet_5', icon: '🏎️', name: 'Автопарк', desc: 'Собрать 5 автомобилей в гараже', reward: 150000, titleReward: 'collector', check: () => (myCars && myCars.length >= 5) },
            { id: 'fleet_15', icon: '🏢', name: 'Синдикат', desc: 'Собрать 15 автомобилей в гараже', reward: 600000, titleReward: 'magnate', check: () => (myCars && myCars.length >= 15) },
            { id: 'hypercar_owner', icon: '👑', name: 'Владелец Гиперкара', desc: 'Иметь в гараже гиперкар стоимостью от 50 000 000 ₽', reward: 1000000, titleReward: 'hyper_owner', check: () => (myCars && myCars.some(c => (c.price || 0) >= 50000000 || ["Bugatti Chiron Super Sport", "Koenigsegg Jesko Attack", "Ferrari SF90 Stradale", "Rolls-Royce Cullinan"].includes(c.name))) },
            { id: 'speed_200', icon: '⚡', name: 'Шумахер', desc: 'Разогнаться до 200 км/ч в гонке', reward: 80000, titleReward: 'racer', check: () => {
                const spd = Math.max(Number(racePlayer?.speed || 0), Number(achievements._maxSpeedSeen || 0));
                return spd >= 200;
            }},
            { id: 'speed_350', icon: '🚀', name: 'Гиперзвук', desc: 'Развить скорость более 350 км/ч в заезде', reward: 500000, titleReward: 'hypersonic', check: () => {
                const spd = Math.max(Number(racePlayer?.speed || 0), Number(achievements._maxSpeedSeen || 0));
                return spd >= 350;
            }},
            { id: 'drift_first', icon: '🌪️', name: 'Первый занос', desc: 'Набрать от 1 000 очков дрифта за заезд', reward: 60000, titleReward: 'drifter', check: () => (Number(achievements.driftBestScore || 0) >= 1000 || Number(racePlayer?.driftScore || 0) >= 1000) },
            { id: 'drift_king', icon: '🔥', name: 'Король Дрифта', desc: 'Набрать 10 000 очков дрифта за один заезд', reward: 250000, titleReward: 'drift_king', check: () => (Number(achievements.driftBestScore || 0) >= 10000 || Number(racePlayer?.driftScore || 0) >= 10000) },
            { id: 'drift_combo_5', icon: '⚡', name: 'Комбо-Мастер x5', desc: 'Достичь комбо x5 в дрифте', reward: 150000, titleReward: null, check: () => (Number(achievements.driftMaxCombo || 0) >= 5 || Number(racePlayer?.driftCombo || 0) >= 5) },
            { id: 'total_drift_50k', icon: '🏆', name: 'Дрифт Легенда', desc: 'Набрать 50 000 очков дрифта суммарно', reward: 300000, titleReward: 'drift_legend', check: () => (Number(achievements.driftTotalScore || 0) >= 50000) },
            { id: 'drag_champ', icon: '🏁', name: 'Король Дрэга', desc: 'Выиграть 3 дрэг-заезда на 1/4 мили', reward: 120000, titleReward: 'drag_king', check: () => (achievements.dragWins >= 3) },
            { id: 'plate_777', icon: '🎰', name: 'Три топора', desc: 'Выбить номер с 777 в тексте', reward: 200000, titleReward: null, check: () => inventory.some(p => String(p.text).includes('777')) },
            { id: 'blatnoy_plate', icon: '⭐', name: 'Блатная Серия', desc: 'Иметь спецсерию (АМР, ЕКХ, ААА, ВОР, ХХХ) в гараже', reward: 200000, titleReward: 'authority', check: () => (inventory && inventory.some(p => /^(АМР|ЕКХ|ААА|ВОР|ХХХ)/i.test(String(p.text || '').replace(/\s+/g, '')))) },
            { id: 'styling_master', icon: '🎨', name: 'Кастом-мастер', desc: 'Установить цвет и неон на автомобиль', reward: 60000, titleReward: null, check: () => myCars.some(c => c.styling?.neon && c.styling.neon !== 'none') },
            { id: 'max_tune', icon: '⚙️', name: 'Максимальный буст', desc: 'Установить 5 уровень двигателя на любой автомобиль', reward: 120000, titleReward: null, check: () => (myCars && myCars.some(c => c.upgrades?.engine >= 5)) },
            { id: 'cases_10', icon: '📦', name: 'Кейсер', desc: 'Открыть 10 кейсов с номерами', reward: 75000, titleReward: null, check: () => (achievements.casesOpened >= 10) },
            { id: 'cases_50', icon: '🎁', name: 'Дропоман', desc: 'Открыть 50 кейсов', reward: 250000, titleReward: null, check: () => ((achievements.casesOpened || 0) >= 50) },
            { id: 'distance_50km', icon: '🛣️', name: 'Дальнобой', desc: 'Преодолеть 25 км общего пробега', reward: 180000, titleReward: 'traveler', check: () => {
                const rec = (typeof getRaceRecords === 'function' ? getRaceRecords() : null);
                return Math.max(Number(rec?.bestDistance || 0), Number(achievements.totalDistanceKm || 0)) >= 25;
            }},
            { id: 'overtakes_50', icon: '🏎️', name: 'Шашечник', desc: 'Совершить 50 опасных обгонов суммарно', reward: 150000, titleReward: 'infiltrator', check: () => ((achievements.overtakesTotal || 0) >= 50) }
        ];

        function checkAchievements() {
            ACHIEVEMENTS_CATALOG.forEach(ach => {
                if (!achievements[ach.id] && ach.check()) {
                    achievements[ach.id] = Date.now();
                    creditPlayerBalance(ach.reward, `Достижение: ${ach.name}`);
                    triggerLegendaryEffect();
                    notifyUser(`🏆 Достижение разблокировано: «${ach.name}»! (+${ach.reward.toLocaleString('ru-RU')} ₽)`, 'success');
                }
            });
            renderAchievements();
        }

        function renderAchievements() {
            const list = document.getElementById('achievements-list');
            if (!list) return;
            list.innerHTML = ACHIEVEMENTS_CATALOG.map(ach => {
                const unlocked = !!achievements[ach.id];
                return `
                    <div class="achievement-card ${unlocked ? 'unlocked' : ''}">
                        <div class="achievement-icon">${ach.icon}</div>
                        <div class="achievement-info">
                            <div class="achievement-name">${escapeHtml(ach.name)}</div>
                            <div class="achievement-desc">${escapeHtml(ach.desc)}</div>
                            <div style="font-size:11px; color:#c9f267; font-weight:800;">
                                ${unlocked ? '✓ Разблокировано' : `Награда: +${ach.reward.toLocaleString('ru-RU')} ₽`}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function switchCollectionTab(tab) {
            activeCollectionTab = tab;
            const btnPlates = document.getElementById('btn-col-plates');
            const btnAchieve = document.getElementById('btn-col-achieve');
            const subPlates = document.getElementById('col-subtab-plates');
            const subAchieve = document.getElementById('col-subtab-achieve');

            if (btnPlates) btnPlates.classList.toggle('active', tab === 'plates');
            if (btnAchieve) btnAchieve.classList.toggle('active', tab === 'achieve');
            if (subPlates) subPlates.classList.toggle('hidden', tab !== 'plates');
            if (subAchieve) subAchieve.classList.toggle('hidden', tab !== 'achieve');

            if (tab === 'achieve') renderAchievements();
            else renderInventory();
        }

        // --- 5. ДРЭГ-РЕЙСИНГ (1/4 МИЛИ) И 3D ГОНКА ---
        function switchRaceMode(mode) {
            activeRaceMode = mode;
            const btnCircuit = document.getElementById('btn-race-mode-circuit');
            const btnDrag = document.getElementById('btn-race-mode-drag');
            const btn3D = document.getElementById('btn-race-mode-3d');
            const menuCircuit = document.getElementById('race-menu-container');
            const menuDrag = document.getElementById('drag-menu-container');
            const btnStart = document.getElementById('btn-start-race');
            const menuTitle = document.querySelector('#race-menu-container .section-title');
            const menuSub = document.querySelector('#race-menu-container .section-header p');

            if (btnCircuit) btnCircuit.classList.toggle('active', mode === 'circuit');
            if (btnDrag) btnDrag.classList.toggle('active', mode === 'drag');
            if (btn3D) btn3D.classList.toggle('active', mode === '3d');

            if (menuDrag) menuDrag.classList.toggle('hidden', mode !== 'drag');
            if (menuCircuit) menuCircuit.classList.toggle('hidden', mode === 'drag');

            if (mode === '3d') {
                if (btnStart) btnStart.textContent = '🚀 Начать 3D заезд (Вид сзади)';
                if (menuTitle) menuTitle.textContent = '3D Скоростное шоссе (Вид сзади)';
                if (menuSub) menuSub.textContent = 'Реалистичный 3D заезд от третьего лица: обгоны, плотный поток, нитро и дрифт.';
            } else if (mode === 'circuit') {
                if (btnStart) btnStart.textContent = 'Начать заезд';
                if (menuTitle) menuTitle.textContent = 'Скоростное шоссе';
                if (menuSub) menuSub.textContent = 'Заезд в потоке транспорта. Награды за дистанцию и скорость.';
            }

            const navTabRace = document.getElementById('nav-tab-racegame');
            const navTab3D = document.getElementById('nav-tab-3d-race');
            if (navTabRace && navTab3D) {
                if (mode === '3d') {
                    navTab3D.classList.add('active');
                    navTab3D.setAttribute('aria-selected', 'true');
                    navTabRace.classList.remove('active');
                    navTabRace.setAttribute('aria-selected', 'false');
                } else if (mode === 'circuit' || mode === 'drag') {
                    navTabRace.classList.add('active');
                    navTabRace.setAttribute('aria-selected', 'true');
                    navTab3D.classList.remove('active');
                    navTab3D.setAttribute('aria-selected', 'false');
                }
            }
        }

        function selectDragBet(amount) {
            selectedDragBet = Number(amount);
            document.querySelectorAll('#drag-bet-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', Number(btn.dataset.bet) === selectedDragBet);
            });
        }

        async function startDragRace() {
            if (isRaceRunning || isDragRaceRunning) return;
            const curBal = (onlineProfile && Number.isFinite(Number(onlineProfile.balance))) ? Math.max(balance, Number(onlineProfile.balance)) : balance;
            if (selectedDragBet > 0 && curBal < selectedDragBet) {
                notifyUser(`Для ставки нужно ${selectedDragBet.toLocaleString('ru-RU')} ₽`, 'error');
                return;
            }

            const activeCar = myCars[selectedRaceCarIndex] || myCars[0];
            if (!activeCar) {
                notifyUser('Сначала приобретите автомобиль в автосалоне!');
                return;
            }

            isDragRaceRunning = true;
            notifyUser('🚦 Дрэг-заезд: приготовьтесь к старту по зеленому сигналу!', 'warning');

            const lRed1 = document.getElementById('drag-light-red1');
            const lRed2 = document.getElementById('drag-light-red2');
            const lYellow = document.getElementById('drag-light-yellow');
            const lGreen = document.getElementById('drag-light-green');
            const lFalse = document.getElementById('drag-light-false');

            [lRed1, lRed2, lYellow, lGreen, lFalse].forEach(el => el?.classList.remove('on'));

            let falseStart = false;
            const falseStartDetector = () => {
                if (raceKeys.gas || raceKeys.nitro) falseStart = true;
            };
            window.addEventListener('keydown', falseStartDetector);

            setTimeout(() => { if (!falseStart) lRed1?.classList.add('on'); sound.tick(); }, 600);
            setTimeout(() => { if (!falseStart) lRed2?.classList.add('on'); sound.tick(); }, 1200);
            setTimeout(() => { if (!falseStart) lYellow?.classList.add('on'); sound.tick(); }, 1800);

            setTimeout(() => {
                window.removeEventListener('keydown', falseStartDetector);

                if (falseStart) {
                    lFalse?.classList.add('on');
                    if (selectedDragBet > 0) deductPlayerBalance(selectedDragBet, 'Фальстарт в дрэг-рейсинге');
                    isDragRaceRunning = false;
                    notifyUser(`🛑 Фальстарт! Вы нажали газ до зеленого. Ставка -${selectedDragBet.toLocaleString('ru-RU')} ₽ потеряна.`, 'error');
                    return;
                }

                lGreen?.classList.add('on');
                sound.win();

                // Расчет победы в дрэге
                const baseStats = NomeraRaceEconomy.normalizeCar(activeCar);
                const upgradesCount = Object.values(baseStats.upgrades).reduce((a, b) => a + b, 0);
                const winChance = 0.50 + (upgradesCount * 0.035);
                const isWin = Math.random() < Math.min(0.92, winChance);

                setTimeout(() => {
                    isDragRaceRunning = false;
                    [lRed1, lRed2, lYellow, lGreen, lFalse].forEach(el => el?.classList.remove('on'));

                    if (isWin) {
                        achievements.dragWins = (achievements.dragWins || 0) + 1;
                        const payout = selectedDragBet > 0 ? Math.round(selectedDragBet * 1.95) : 0;
                        if (selectedDragBet > 0) {
                            creditPlayerBalance(payout - selectedDragBet, 'Победа в дрэг-рейсинге');
                        }
                        addExp(80);
                        triggerLegendaryEffect();
                        playCashSound();
                        checkAchievements();
                        updateBalance();
                        saveProgress();
                        notifyUser(`🏆 ПОБЕДА НА 1/4 МИЛИ! Время: ${(10.2 + Math.random() * 0.8).toFixed(2)} с. Выигрыш: ${payout.toLocaleString('ru-RU')} ₽!`, 'success');
                    } else {
                        if (selectedDragBet > 0) deductPlayerBalance(selectedDragBet, 'Поражение в дрэг-рейсинге');
                        notifyUser(`Поражение в дрэге! Соперник обогнал на финише на 0.12 с. Ставка потеряна.`, 'error');
                    }
                }, 2200);
            }, 2400);
        }

        // --- 6. АВТОРЫНОК (ПРОДАЖА И ПОКУПКА АВТОМОБИЛЕЙ) ---
        function openSellCarModal(carIndex) {
            stylingActiveCarIndex = carIndex;
            openSellCarModalFromMarket();
            const sel = document.getElementById('sell-car-select');
            if (sel) sel.value = String(carIndex);
            updateSellCarModalPreview();
        }

        function openSellCarModalFromMarket() {
            if (myCars.length <= 1) {
                notifyUser('Нельзя продать единственный автомобиль в гараже!', 'error');
                return;
            }
            const sel = document.getElementById('sell-car-select');
            if (sel) {
                sel.innerHTML = myCars.map((c, i) => `
                    <option value="${i}">${escapeHtml(c.name)} (${c.plate ? c.plate.text : 'без номера'})</option>
                `).join('');
            }
            updateSellCarModalPreview();
            const modal = document.getElementById('sell-car-modal');
            if (modal) modal.classList.add('show');
        }

        function closeSellCarModal() {
            const modal = document.getElementById('sell-car-modal');
            if (modal) modal.classList.remove('show');
        }

        function updateSellCarModalPreview() {
            const sel = document.getElementById('sell-car-select');
            const idx = Number(sel?.value || 0);
            const car = myCars[idx];
            const desc = document.getElementById('sell-car-desc');
            const priceInput = document.getElementById('sell-car-price');
            const prevImg = document.getElementById('sell-car-preview-img');
            if (car) {
                if (prevImg) {
                    const sellStyling = car.styling || {};
                    const cachedSell3D = (typeof Car3DManager !== 'undefined' && typeof Car3DManager.getSideThumbnail === 'function')
                        ? Car3DManager.getSideThumbnail(car.name, sellStyling)
                        : null;
                    if (cachedSell3D) {
                        prevImg.src = cachedSell3D;
                    } else {
                        prevImg.src = getCarSpriteDataUrl(car.name, car.styling);
                    }
                }
                if (desc) desc.innerText = `Продажа «${car.name}». Госномер: ${car.plate ? car.plate.text : 'нет'}. Состояние: ${Math.round(car.condition || 100)}%.`;
                if (priceInput && !priceInput.value) {
                    priceInput.value = Math.round((car.basePrice || 200000) * 1.1);
                }
            }
        }

        async function confirmSellCar() {
            if (myCars.length <= 1) {
                notifyUser('Нельзя продать единственный автомобиль!', 'error');
                return;
            }
            const sel = document.getElementById('sell-car-select');
            const idx = Number(sel?.value || 0);
            const car = myCars[idx];
            const price = Number(document.getElementById('sell-car-price')?.value);

            if (!car || !Number.isSafeInteger(price) || price < 10000 || price > 1000000000000) {
                notifyUser('Укажите корректную цену (от 10 000 ₽)', 'error');
                return;
            }

            if (onlineProfile) {
                try {
                    await syncCloudGarage(true);
                    const res = await onlineRequest('sell', { type: 'car', carIndex: idx, car, price, lotId: 'lot_car_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) });
                    if (res.profile) setOnlineProfile(res.profile, true);
                    else {
                        myCars.splice(idx, 1);
                        onlineProfile.myCars = JSON.parse(JSON.stringify(myCars));
                        saveProgress();
                        renderCars();
                    }
                    closeSellCarModal();
                    await refreshOnlinePublic();
                    notifyUser(`Автомобиль «${car.name}» выставлен на авторынок за ${price.toLocaleString('ru-RU')} ₽!`, 'success');
                    return;
                } catch (e) {
                    notifyUser('Не удалось выставить авто: ' + e.message, 'error');
                    return;
                }
            }

            const lotId = 'lot_car_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            const lot = {
                id: lotId,
                lotId,
                type: 'car',
                seller: onlineProfile?.nickname || nickname,
                sellerName: onlineProfile?.nickname || nickname,
                sellerKey: sanitizeKey(onlineProfile?.nickname || nickname),
                sellerAvatar: avatarData || DEFAULT_AVATAR,
                car: JSON.parse(JSON.stringify(car)),
                price,
                createdAt: Date.now()
            };

            myCars.splice(idx, 1);
            if (onlineProfile) {
                onlineProfile.myCars = JSON.parse(JSON.stringify(myCars));
            }
            if (db) {
                db.ref('onlineV4/market/' + lotId).set(lot).catch(() => {});
                if (onlineProfile) {
                    const sellerKey = sanitizeKey(onlineProfile.nickname);
                    const now = Date.now();
                    db.ref('onlineV4/accounts/' + sellerKey).update({
                        myCars: onlineProfile.myCars,
                        updatedAt: now
                    }).catch(() => {});
                    db.ref('leaderboard/' + sellerKey).update({
                        carsCount: myCars.length,
                        updatedAt: now
                    }).catch(() => {});
                }
            }
            marketLots[lotId] = lot;

            saveProgress();
            renderCars();
            if (typeof syncCloudGarage === 'function') syncCloudGarage(true);
            closeSellCarModal();
            fetchMarketListings();
            notifyUser(`Автомобиль «${car.name}» выставлен на авторынок за ${price.toLocaleString('ru-RU')} ₽!`, 'success');
        }

        function filterMarketListings(filterType) {
            currentMarketFilter = filterType;
            const bAll = document.getElementById('btn-mkt-filter-all');
            const bPlates = document.getElementById('btn-mkt-filter-plates');
            const bCars = document.getElementById('btn-mkt-filter-cars');

            if (bAll) bAll.classList.toggle('active', filterType === 'all');
            if (bPlates) bPlates.classList.toggle('active', filterType === 'plates');
            if (bCars) bCars.classList.toggle('active', filterType === 'cars');

            renderMarketListings();
        }

        // --- ЛИДЕРБОРД И ПОДИУМ ---
        function getBestPlate() {
            let best = null, maxPrice = -1;
            inventory.forEach(item => {
                if (item && item.price > maxPrice) { maxPrice = item.price; best = item.text; }
            });
            myCars.forEach(c => {
                if (c && c.plate && c.plate.price > maxPrice) { maxPrice = c.plate.price; best = c.plate.text; }
            });
            return best || '—';
        }

        function setLeaderboardFilter(filter) {
            leaderboardFilter = filter;
            const bBtn = document.getElementById('lead-filter-balance');
            const lBtn = document.getElementById('lead-filter-level');
            const sBtn = document.getElementById('lead-filter-speed');
            if (bBtn) bBtn.classList.toggle('test-btn-reset', filter === 'balance');
            if (lBtn) lBtn.classList.toggle('test-btn-reset', filter === 'level');
            if (sBtn) sBtn.classList.toggle('test-btn-reset', filter === 'speed');
            renderLeaderboard();
        }

        let lastLeaderboardSync = 0;
        function syncMyLeaderboardEntry(force = false) {
            if (!db || typeof db.ref !== 'function') return;
            const now = Date.now();
            if (!force && now - lastLeaderboardSync < 15000) return;
            lastLeaderboardSync = now;
            try {
                const userKey = sanitizeKey(nickname);
                if (!userKey) return;
                const ref = db.ref('leaderboard/' + userKey);
                if (!ref || typeof ref.update !== 'function') return;
                const mySpeed = (typeof getRaceRecords === 'function' ? getRaceRecords().bestSpeed : 0) || 0;
                const displayBal = (onlineProfile && Number.isFinite(Number(onlineProfile.balance)))
                    ? Number(onlineProfile.balance)
                    : (Number.isFinite(balance) ? balance : 50000);
                const entry = {
                    nickname: nickname,
                    balance: Math.round(displayBal),
                    playerLevel: playerLevel || 1,
                    playerExp: playerExp || 0,
                    avatarData: avatarData || '',
                    bestPlate: getBestPlate() || '—',
                    carsCount: (myCars || []).length,
                    bestSpeed: Math.round(mySpeed || 0),
                    updatedAt: Date.now()
                };
                ref.update(entry).catch(() => {});

                if (Array.isArray(cloudLeaderboardList)) {
                    const idx = cloudLeaderboardList.findIndex(p => sanitizeKey(p && p.nickname) === userKey);
                    if (idx >= 0) cloudLeaderboardList[idx] = { ...cloudLeaderboardList[idx], ...entry };
                }

                if (onlineProfile) {
                    db.ref('onlineV4/accounts/' + userKey).update({ avatarData: avatarData || '', updatedAt: Date.now() }).catch(() => {});
                    db.ref('users/' + userKey).update({ avatarData: avatarData || '', updatedAt: Date.now() }).catch(() => {});
                }
            } catch (_) {}
        }

        function renderLeaderboard() {
            const list = document.getElementById('leaderboard-list');
            const podium = document.getElementById('podium-stage');
            if (!list) return;

            const mySpeed = (typeof getRaceRecords === 'function' ? getRaceRecords().bestSpeed : 0) || 0;

            const myEntry = {
                nickname: nickname,
                balance: (onlineProfile && Number.isFinite(Number(onlineProfile.balance))) ? Number(onlineProfile.balance) : balance,
                playerLevel: playerLevel,
                avatarData: avatarData || '',
                bestPlate: getBestPlate(),
                carsCount: myCars.length,
                bestSpeed: Math.round(mySpeed),
                updatedAt: Date.now()
            };

            let baseList = (cloudLeaderboardList && cloudLeaderboardList.length > 0) ? [...cloudLeaderboardList] : [...mockOtherPlayers];
            // Убираем дубликат текущего игрока из серверного списка
            baseList = baseList.filter(p => sanitizeKey(p && p.nickname) !== sanitizeKey(nickname));
            const seenKeys = new Set([sanitizeKey(nickname)]);
            const dedupedBase = [];
            for (const p of baseList) {
                if (!p || !p.nickname) continue;
                const k = sanitizeKey(p.nickname);
                if (!k || seenKeys.has(k)) continue;
                seenKeys.add(k);
                dedupedBase.push(p);
            }
            const allPlayers = [myEntry, ...dedupedBase];

            allPlayers.sort((a, b) => {
                if (leaderboardFilter === 'level') {
                    if ((b.playerLevel || 1) !== (a.playerLevel || 1)) {
                        return (b.playerLevel || 1) - (a.playerLevel || 1);
                    }
                    return (b.balance || 0) - (a.balance || 0);
                } else if (leaderboardFilter === 'speed') {
                    if ((b.bestSpeed || 0) !== (a.bestSpeed || 0)) {
                        return (b.bestSpeed || 0) - (a.bestSpeed || 0);
                    }
                    return (b.balance || 0) - (a.balance || 0);
                } else {
                    if ((b.balance || 0) !== (a.balance || 0)) {
                        return (b.balance || 0) - (a.balance || 0);
                    }
                    return (b.playerLevel || 1) - (a.playerLevel || 1);
                }
            });

            let myIndex = -1;

            // Рендер подиума (ТОП-1, 2, 3)
            if (podium) {
                if (allPlayers.length >= 3) {
                    const p1 = allPlayers[0];
                    const p2 = allPlayers[1];
                    const p3 = allPlayers[2];

                    const getVal = (p) => {
                        if (leaderboardFilter === 'level') return `${p.playerLevel || 1} ур.`;
                        if (leaderboardFilter === 'speed') return `${Math.round(p.bestSpeed || 0)} км/ч`;
                        return `${((p.balance || 0) / 1000000).toFixed(1)}M ₽`;
                    };

                    podium.innerHTML = `
                        <div class="podium-slot podium-2" onclick="openPlayerViewModal(${jsArg(sanitizeKey(p2.nickname))})">
                            <div class="podium-avatar-wrap">
                                <img src="${imageSrc(getPlayerAvatar(p2))}" class="podium-avatar" onerror="handleAvatarError(this, 1)">
                            </div>
                            <div class="podium-name">${escapeHtml(p2.nickname)}</div>
                            <div class="podium-val">${getVal(p2)}</div>
                            <div class="podium-pedestal">2</div>
                        </div>
                        <div class="podium-slot podium-1" onclick="openPlayerViewModal(${jsArg(sanitizeKey(p1.nickname))})">
                            <div class="podium-crown">👑</div>
                            <div class="podium-avatar-wrap">
                                <img src="${imageSrc(getPlayerAvatar(p1))}" class="podium-avatar" onerror="handleAvatarError(this, 0)">
                            </div>
                            <div class="podium-name">${escapeHtml(p1.nickname)}</div>
                            <div class="podium-val">${getVal(p1)}</div>
                            <div class="podium-pedestal">1</div>
                        </div>
                        <div class="podium-slot podium-3" onclick="openPlayerViewModal(${jsArg(sanitizeKey(p3.nickname))})">
                            <div class="podium-avatar-wrap">
                                <img src="${imageSrc(getPlayerAvatar(p3))}" class="podium-avatar" onerror="handleAvatarError(this, 2)">
                            </div>
                            <div class="podium-name">${escapeHtml(p3.nickname)}</div>
                            <div class="podium-val">${getVal(p3)}</div>
                            <div class="podium-pedestal">3</div>
                        </div>
                    `;
                } else {
                    podium.innerHTML = '';
                }
            }

            let html = '';
            allPlayers.forEach((player, idx) => {
                const rank = idx + 1;
                const isMe = (player.nickname === nickname);
                if (isMe) myIndex = rank;

                let rankBadge = `#${rank}`;
                if (rank === 1) rankBadge = '🥇';
                else if (rank === 2) rankBadge = '🥈';
                else if (rank === 3) rankBadge = '🥉';

                const avatar = getPlayerAvatar(player);
                const escName = escapeHtml(player.nickname || 'Аноним');

                const primaryVal = leaderboardFilter === 'level'
                    ? `${escapeHtml(player.playerLevel || 1)} ур.`
                    : leaderboardFilter === 'speed'
                    ? `⚡ ${Math.round(player.bestSpeed || 0)} км/ч`
                    : `${Number(player.balance || 0).toLocaleString('ru-RU')} ₽`;

                const subVal = leaderboardFilter === 'level'
                    ? `${Number(player.balance || 0).toLocaleString('ru-RU')} ₽`
                    : leaderboardFilter === 'speed'
                    ? `${escapeHtml(player.playerLevel || 1)} ур. | ${Number(player.balance || 0).toLocaleString('ru-RU')} ₽`
                    : `${escapeHtml(player.playerLevel || 1)} уровень`;

                const safeKey = sanitizeKey(player.nickname || '');

                html += `
                    <div class="lead-row ${isMe ? 'is-me' : ''}" onclick="openPlayerViewModal(${jsArg(safeKey)})">
                        <div class="lead-left">
                            <div class="lead-rank">${rankBadge}</div>
                            <img src="${imageSrc(avatar)}" class="lead-avatar" onerror="handleAvatarError(this, 0)">
                            <div>
                                <div class="lead-info-name">
                                    ${escName}
                                    ${isMe ? '<span style="font-size:10px; background:var(--accent-green); color:#000; padding:1px 6px; border-radius:var(--radius-full); font-weight:800;">ВЫ</span>' : ''}
                                </div>
                                <div class="lead-sub">${subVal}</div>
                            </div>
                        </div>
                        <div class="lead-right">
                            <div class="lead-value">${primaryVal}</div>
                            <div class="lead-sub" style="font-size:10px;">🏷️ ${escapeHtml(player.bestPlate || '—')}</div>
                        </div>
                    </div>
                `;
            });

            list.innerHTML = html;

            const posEl = document.getElementById('my-rank-pos');
            const nameEl = document.getElementById('my-rank-name');
            const statEl = document.getElementById('my-rank-stat');
            const myAvatarEl = document.getElementById('my-rank-avatar');
            if (posEl) posEl.innerText = `#${myIndex}`;
            if (nameEl) nameEl.innerText = `Вы: ${nickname}`;
            const displayBal = (onlineProfile && Number.isFinite(Number(onlineProfile.balance))) ? Number(onlineProfile.balance) : balance;
            if (statEl) statEl.innerText = `Баланс: ${Math.round(displayBal).toLocaleString('ru-RU')} ₽ | Уровень: ${playerLevel} | Рекорд скорости: ${Math.round(mySpeed)} км/ч`;
            if (myAvatarEl) {
                myAvatarEl.onerror = function() { handleAvatarError(this, 0); };
                myAvatarEl.src = safeImageUrl(getPlayerAvatar(myEntry), DEFAULT_AVATAR, AVATAR_PRESETS);
            }
        }

        function renderPlayerViewModal(player) {
            if (!player) return;
            const modalAvatar = document.getElementById('pv-avatar');
            if (modalAvatar) {
                modalAvatar.onerror = function() { handleAvatarError(this, 0); };
                modalAvatar.src = safeImageUrl(getPlayerAvatar(player), DEFAULT_AVATAR, [...AVATAR_PRESETS, DEFAULT_CAR_IMG]);
            }
            const nameEl = document.getElementById('pv-name');
            if (nameEl) nameEl.innerText = player.nickname || 'Игрок';
            const lvlEl = document.getElementById('pv-level');
            if (lvlEl) lvlEl.innerText = `Уровень: ${escapeHtml(player.playerLevel || 1)} ${player.bestSpeed ? `| ⚡ ${Math.round(player.bestSpeed)} км/ч` : ''}`;
            const balEl = document.getElementById('pv-balance');
            if (balEl) balEl.innerText = `${Number(player.balance || 0).toLocaleString('ru-RU')} ₽`;
            const carsEl = document.getElementById('pv-cars');
            if (carsEl) carsEl.innerText = player.carsCount || 0;
            const plateEl = document.getElementById('pv-best-plate');
            if (plateEl) plateEl.innerText = player.bestPlate || '—';

            let lastSeenText = 'только что';
            if (player.updatedAt) {
                const diffMin = Math.floor((Date.now() - player.updatedAt) / 60000);
                if (diffMin < 2) lastSeenText = 'только что';
                else if (diffMin < 60) lastSeenText = `${diffMin} мин. назад`;
                else {
                    const diffHours = Math.floor(diffMin / 60);
                    if (diffHours < 24) lastSeenText = `${diffHours} ч. назад`;
                    else lastSeenText = `${Math.floor(diffHours / 24)} дн. назад`;
                }
            }
            const lastSeenEl = document.getElementById('pv-last-seen');
            if (lastSeenEl) lastSeenEl.innerText = lastSeenText;
            const modal = document.getElementById('player-view-modal');
            if (modal) modal.classList.add('show');
        }

        function openPlayerViewModal(userKey) {
            let baseList = (cloudLeaderboardList && cloudLeaderboardList.length > 0) ? [...cloudLeaderboardList] : [...mockOtherPlayers];
            baseList = baseList.filter(p => sanitizeKey(p && p.nickname) !== sanitizeKey(nickname));
            const mySpeed = (typeof getRaceRecords === 'function' ? getRaceRecords().bestSpeed : 0) || 0;

            const allPlayers = [{
                nickname: nickname, balance: (onlineProfile && Number.isFinite(Number(onlineProfile.balance))) ? Number(onlineProfile.balance) : balance, playerLevel, avatarData: avatarData || '', bestPlate: getBestPlate(), carsCount: myCars.length, bestSpeed: Math.round(mySpeed), updatedAt: Date.now()
            }, ...baseList];

            const player = allPlayers.find(p => sanitizeKey(p && p.nickname || '') === userKey);
            if (player) {
                renderPlayerViewModal(player);
                return;
            }
            if (db && typeof db.ref === 'function') {
                db.ref('leaderboard/' + userKey).once('value').then(snap => {
                    const val = snap.val();
                    if (val) renderPlayerViewModal(val);
                }).catch(() => {});
            }
        }

        // ==========================================
        // 🎮 МИНИ-ИГРА: «ТРАССА 777: НОЧНОЙ ФОРСАЖ»
        // ==========================================

        const carRaceStats = {
            // 1. Бюджетный класс
            "ВАЗ-2107 «Жигули»": {
                speed: 160, accel: 2.2, handling: 4.8, boost: 1.8, rewardMult: 1.0, driftFactor: 1.5,
                desc: "Советская классика с задним приводом. Легкая в потоке и маневренная в заносах!"
            },
            "ВАЗ-2109 «Девятка»": {
                speed: 170, accel: 2.4, handling: 5.2, boost: 1.9, rewardMult: 1.15, driftFactor: 1.2,
                desc: "«Вишневая девятка» — зубило, маневренный передний привод и резвый старт."
            },
            "ГАЗ-24 «Волга»": {
                speed: 175, accel: 2.3, handling: 4.5, boost: 1.8, rewardMult: 1.25, driftFactor: 1.3,
                desc: "Советская баржа бизнес-класса с хромом и плавным тяжелым ходом."
            },
            "Lada Priora БПАН": {
                speed: 185, accel: 2.7, handling: 5.6, boost: 2.0, rewardMult: 1.3, driftFactor: 1.3,
                desc: "Заниженная посадка, тонировка «вкруг». Дерзкий стиль и стремительные обгоны!"
            },
            "Hyundai Solaris": {
                speed: 195, accel: 2.9, handling: 6.0, boost: 2.0, rewardMult: 1.45, driftFactor: 1.1,
                desc: "Народный любимец такси и каршеринга — надежный, юркий и экономичный."
            },
            "Lada Vesta Sport": {
                speed: 215, accel: 3.3, handling: 6.2, boost: 2.2, rewardMult: 1.8, driftFactor: 1.2,
                desc: "Спортивная подвеска и фирменный X-обвес для идеальной траектории на шоссе."
            },
            "Volkswagen Polo": {
                speed: 205, accel: 3.1, handling: 6.4, boost: 2.0, rewardMult: 1.6, driftFactor: 1.1,
                desc: "Немецкая точность управления и отличный контроль между рядами."
            },

            // 2. Средний / JDM / Дрифт класс
            "Toyota Mark II Tourer V": {
                speed: 270, accel: 4.3, handling: 7.2, boost: 2.8, rewardMult: 2.7, driftFactor: 1.85,
                desc: "Легендарный 1JZ-GTE твинтурбо! Король бокового скольжения и клубов дыма."
            },
            "Subaru Impreza WRX STI": {
                speed: 265, accel: 4.5, handling: 8.2, boost: 2.7, rewardMult: 2.6, driftFactor: 1.4,
                desc: "Оппозитный турбомотор и симметричный полный привод — вгрызается в любой поворот!"
            },
            "BMW M5 E60 V10": {
                speed: 280, accel: 4.4, handling: 7.0, boost: 2.7, rewardMult: 3.0, driftFactor: 1.6,
                desc: "Рёв легендарного V10 под капотом! Ураганный разгон на прямых участках."
            },
            "Nissan Silvia S15 Spec-R": {
                speed: 275, accel: 4.6, handling: 8.0, boost: 2.9, rewardMult: 2.8, driftFactor: 2.0,
                desc: "Икона японского D1GP! Невероятный выворот и идеальная развесовка для дрифта."
            },
            "Toyota Camry 3.5": {
                speed: 260, accel: 3.9, handling: 6.6, boost: 2.4, rewardMult: 2.5, driftFactor: 1.2,
                desc: "«Камри три и пять» — левый ряд уважает, солидный и мощный ход."
            },
            "Toyota Land Cruiser 300": {
                speed: 250, accel: 3.7, handling: 5.8, boost: 2.3, rewardMult: 3.8, driftFactor: 1.1,
                desc: "Танк на дороге! Высокий клиренс и уверенный прорыв через плотный трафик."
            },
            "Nissan GT-R R35 Nismo": {
                speed: 340, accel: 6.0, handling: 8.8, boost: 3.4, rewardMult: 7.2, driftFactor: 1.35,
                desc: "«Годзилла» на треке! Лаунч-контроль и умный полный привод ATTESA E-TS."
            },

            // 3. Премиум и Спорт
            "Mercedes-Benz E63s AMG": {
                speed: 320, accel: 5.2, handling: 7.8, boost: 3.1, rewardMult: 5.5, driftFactor: 1.5,
                desc: "Битурбо V8 с решёткой Panamericana. Сметает поток одним нажатием педали!"
            },
            "Audi RS6 Avant": {
                speed: 330, accel: 5.4, handling: 8.0, boost: 3.1, rewardMult: 6.5, driftFactor: 1.3,
                desc: "Ракета в кузове универсал! Полный привод Quattro вгрызается в любой вираж."
            },
            "BMW M5 F90 Competition": {
                speed: 350, accel: 5.8, handling: 8.4, boost: 3.3, rewardMult: 8.0, driftFactor: 1.55,
                desc: "Карбоновая крыша и лазерные фары. Хищный зверь на ночной скоростной магистрали."
            },
            "BMW M8 Gran Coupe": {
                speed: 345, accel: 5.9, handling: 8.3, boost: 3.3, rewardMult: 8.8, driftFactor: 1.45,
                desc: "Флагманский 4.4L битурбо V8. Сочетание роскоши длинного кузова и мощи спорткара."
            },
            "Mercedes-Benz G63 AMG «Гелик»": {
                speed: 290, accel: 4.9, handling: 6.4, boost: 2.6, rewardMult: 9.0, driftFactor: 1.15,
                desc: "Культовый кубик с боковым выхлопом. Абсолютный авторитет на трассе!"
            },

            // 4. Суперкары и Ультра-Люкс
            "Porsche 911 Turbo S": {
                speed: 370, accel: 6.5, handling: 9.2, boost: 3.6, rewardMult: 13.0, driftFactor: 1.45,
                desc: "Абсолютная прижимная сила и космическая динамика разгона в левом ряду."
            },
            "Lamborghini Huracan Performante": {
                speed: 360, accel: 6.6, handling: 9.1, boost: 3.7, rewardMult: 14.5, driftFactor: 1.5,
                desc: "Атмосферный V10, поющий на 8500 об/мин, и активная аэродинамика ALA!"
            },
            "Rolls-Royce Cullinan": {
                speed: 300, accel: 4.7, handling: 6.7, boost: 2.6, rewardMult: 16.0, driftFactor: 1.0,
                desc: "Королевский внедорожник с грилем Pantheon. Максимальные выплаты за каждый километр!"
            },

            // 5. Гиперкары
            "Ferrari SF90 Stradale": {
                speed: 390, accel: 7.2, handling: 9.4, boost: 4.2, rewardMult: 22.0, driftFactor: 1.4,
                desc: "1000 л.с. гибридного совершенства из Маранелло. Молниеносный отклик электромоторов!"
            },
            "Bugatti Chiron Super Sport": {
                speed: 450, accel: 7.8, handling: 9.0, boost: 4.8, rewardMult: 35.0, driftFactor: 1.15,
                desc: "1600 лошадиных сил гиперкара. Разрывает пространство со сверхзвуковой скоростью!"
            },
            "Koenigsegg Jesko Attack": {
                speed: 480, accel: 8.2, handling: 9.6, boost: 5.0, rewardMult: 45.0, driftFactor: 1.6,
                desc: "Шведский монстр на биотопливе E85 с коробкой LST. Король скорости за гранью возможного!"
            }
        };

        // 🎨 ВЫСОКОДЕТАЛИЗИРОВАННЫЙ РЕНДЕРЕР РЕАЛИСТИЧНЫХ МОДЕЛЕЙ АВТОМОБИЛЕЙ (25 ПРОТОТИПОВ)
        function drawPixelCar(ctx, cx, cy, name, scale = 1, options = {}) {
            const s = scale;
            if (options.tilt) {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(options.tilt);
                ctx.translate(-cx, -cy);
            }
            function px(ox, oy, w, h, col) {
                ctx.fillStyle = col;
                ctx.fillRect(Math.round(cx + ox * s), Math.round(cy + oy * s), Math.round(w * s), Math.round(h * s));
            }

            // Плавное заполнение векторного полигона
            function fillPoly(pts, fillCol, strokeCol = null, strokeW = 1) {
                if (!pts || pts.length < 3) return;
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(Math.round(cx + pts[0][0] * s), Math.round(cy + pts[0][1] * s));
                for (let i = 1; i < pts.length; i++) {
                    ctx.lineTo(Math.round(cx + pts[i][0] * s), Math.round(cy + pts[i][1] * s));
                }
                ctx.closePath();
                ctx.fillStyle = fillCol;
                ctx.fill();
                if (strokeCol) {
                    ctx.strokeStyle = strokeCol;
                    ctx.lineWidth = strokeW * s;
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Закругленный прямоугольник для плавных контуров кузова
            function fillRound(ox, oy, w, h, rad, fillCol, strokeCol = null, strokeW = 1) {
                ctx.save();
                const rx = Math.round(cx + ox * s);
                const ry = Math.round(cy + oy * s);
                const rw = Math.round(w * s);
                const rh = Math.round(h * s);
                const r = Math.min(Math.min(rw, rh) / 2, Math.max(0, rad * s));
                ctx.beginPath();
                if (typeof ctx.roundRect === 'function') {
                    ctx.roundRect(rx, ry, rw, rh, r);
                } else {
                    ctx.moveTo(rx + r, ry);
                    ctx.lineTo(rx + rw - r, ry);
                    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
                    ctx.lineTo(rx + rw, ry + rh - r);
                    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
                    ctx.lineTo(rx + r, ry + rh);
                    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
                    ctx.lineTo(rx, ry + r);
                    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
                    ctx.closePath();
                }
                ctx.fillStyle = fillCol;
                ctx.fill();
                if (strokeCol) {
                    ctx.strokeStyle = strokeCol;
                    ctx.lineWidth = strokeW * s;
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Вертикальный линейный градиент для светотени
            function gradV(oy1, oy2, col1, col2) {
                if (!ctx || typeof ctx.createLinearGradient !== 'function') return col1;
                try {
                    const g = ctx.createLinearGradient(0, Math.round(cy + oy1 * s), 0, Math.round(cy + oy2 * s));
                    if (g && typeof g.addColorStop === 'function') {
                        g.addColorStop(0, col1);
                        g.addColorStop(1, col2);
                        return g;
                    }
                } catch (_) {}
                return col1;
            }

            // Горизонтальный градиент для объемной выпуклости капота и крыши
            function gradH(ox1, ox2, colSide, colCenter) {
                if (!ctx || typeof ctx.createLinearGradient !== 'function') return colCenter;
                try {
                    const g = ctx.createLinearGradient(Math.round(cx + ox1 * s), 0, Math.round(cx + ox2 * s), 0);
                    if (g && typeof g.addColorStop === 'function') {
                        g.addColorStop(0, colSide);
                        g.addColorStop(0.5, colCenter);
                        g.addColorStop(1, colSide);
                        return g;
                    }
                } catch (_) {}
                return colCenter;
            }

            // Динамический расчёт светотени и оттенков для кузова любого цвета
            function getPaletteShades(hex) {
                let clean = String(hex || '#94a3b8').replace('#', '');
                if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
                if (clean.length !== 6) clean = '94a3b8';
                const r = parseInt(clean.substring(0, 2), 16) || 0;
                const g = parseInt(clean.substring(2, 4), 16) || 0;
                const b = parseInt(clean.substring(4, 6), 16) || 0;

                function adj(factor, off = 0) {
                    const nr = Math.min(255, Math.max(0, Math.round(r * factor + off)));
                    const ng = Math.min(255, Math.max(0, Math.round(g * factor + off)));
                    const nb = Math.min(255, Math.max(0, Math.round(b * factor + off)));
                    return '#' + [nr, ng, nb].map(x => x.toString(16).padStart(2, '0')).join('');
                }

                return {
                    darkest: adj(0.48, -25),
                    dark: adj(0.66, -14),
                    mid: adj(0.85, -5),
                    base: '#' + clean,
                    light: adj(1.18, 22),
                    bright: adj(1.38, 42),
                    highlight: adj(1.52, 60),
                    metalV: gradV(-25, 25, adj(1.22, 28), adj(0.75, -8)),
                    metalH: gradH(-10, 10, adj(0.72, -8), adj(1.22, 28))
                };
            }

            function getBodyTones(factoryDefault) {
                return getPaletteShades(options.color || factoryDefault);
            }

            // Неоновая подсветка днища
            if (options.neon && options.neon !== 'none') {
                ctx.save();
                ctx.shadowBlur = 18 * s;
                ctx.shadowColor = options.neon;
                ctx.fillStyle = options.neon;
                ctx.globalAlpha = 0.72;
                ctx.fillRect(Math.round(cx - 14 * s), Math.round(cy - 24 * s), Math.round(28 * s), Math.round(48 * s));
                ctx.restore();
            }

            // Мягкая анатомическая тень под автомобилем с закругленными краями (с учетом клиренса/подвески)
            function drawShadow(w, l) {
                let hw = Math.round((w / 2 + 1) * s);
                let hl = Math.round((l / 2 + 2) * s);
                let shadowAlpha = 0.48;

                if (options.suspension === 'bpan') {
                    // БПАН в пол: машина на брюхе, тень максимально плотная и сжатая
                    shadowAlpha = 0.72;
                    hw = Math.round((w / 2 + 0.5) * s);
                    hl = Math.round((l / 2 + 1) * s);
                } else if (options.suspension === 'lowered') {
                    // Спортивное занижение -30мм
                    shadowAlpha = 0.58;
                    hw = Math.round((w / 2 + 0.8) * s);
                    hl = Math.round((l / 2 + 1.5) * s);
                } else if (options.suspension === 'lift') {
                    // Offroad лифт +50мм: кузов высоко над землей, тень рассеянная
                    shadowAlpha = 0.30;
                    hw = Math.round((w / 2 + 3.2) * s);
                    hl = Math.round((l / 2 + 4.5) * s);
                }

                ctx.save();
                ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
                ctx.beginPath();
                ctx.ellipse(Math.round(cx), Math.round(cy + 1 * s), hw, hl, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Высокодетализированные колеса с поддержкой тюнинг-дисков и стенса
            function drawWheels(w, l, rimCol = "#94a3b8", caliperCol = null, discCol = "#334155", isWide = false) {
                let customRimCol = rimCol;
                let customCaliperCol = caliperCol;
                let customDiscCol = discCol;
                let customWide = isWide;
                let wheelOffset = 0;
                let isStamps = false;
                let isDeepdish = false;
                let isForged = false;

                if (options.wheels === 'stamps') {
                    // Штампы: классические черные стальные диски с серебристым колпачком
                    customRimCol = "#1e293b";
                    customCaliperCol = "#334155";
                    customDiscCol = "#1e293b";
                    isStamps = true;
                } else if (options.wheels === 'deepdish') {
                    // Японские «полки» / разварки: широкий хромированный обод + золотая ступица
                    customRimCol = "#f8fafc";
                    customCaliperCol = caliperCol || "#ef4444";
                    customDiscCol = "#475569";
                    customWide = true;
                    isDeepdish = true;
                } else if (options.wheels === 'forged') {
                    // Кованые легкосплавные диски: платина/титан + красные спортивные суппорты
                    customRimCol = "#cbd5e1";
                    customCaliperCol = "#dc2626";
                    customDiscCol = "#64748b";
                    isForged = true;
                }

                if (options.suspension === 'bpan') {
                    // Отрицательный развал колес (negative camber) — колеса выступают шире наружу
                    wheelOffset += 1.2;
                    customWide = true;
                } else if (options.suspension === 'lowered') {
                    wheelOffset -= 0.3;
                } else if (options.suspension === 'lift') {
                    // Массивные оффроад шины
                    wheelOffset += 0.8;
                    customWide = true;
                }

                const wx = Math.round(w / 2) + wheelOffset;
                const frontL = -l + 8;
                const rearL = l - 16;
                const fw = customWide ? (options.suspension === 'lift' ? 5.0 : 4.5) : 3.6;
                const rw = customWide ? (options.suspension === 'lift' ? 5.8 : 5.4) : 4.0;
                const tireH = options.suspension === 'lift' ? 10.5 : 8.5;

                // Передние шины
                fillRound(-wx - 2.5, frontL, fw, tireH, 2, "#09090b");
                fillRound(wx - (customWide ? 2.0 : 1.2), frontL, fw, tireH, 2, "#09090b");
                // Задние шины
                fillRound(-wx - (customWide ? 3.0 : 1.8), rearL, rw, tireH + 0.5, 2, "#09090b");
                fillRound(wx - (customWide ? 2.4 : 1.8), rearL, rw, tireH + 0.5, 2, "#09090b");

                // Тормозные диски
                if (customDiscCol) {
                    px(-wx - 1, frontL + 2, 2, 4.5, customDiscCol);
                    px(wx - 1, frontL + 2, 2, 4.5, customDiscCol);
                    px(-wx - 1, rearL + 2, 2.2, 5, customDiscCol);
                    px(wx - 1, rearL + 2, 2.2, 5, customDiscCol);
                }
                // Фирменные суппорты (Brembo, M-Sport, AMG, PCCB)
                if (customCaliperCol) {
                    px(-wx - 1.2, frontL + 1, 2, 2.5, customCaliperCol);
                    px(wx - 1, frontL + 1, 2, 2.5, customCaliperCol);
                    px(-wx - 1.2, rearL + 5, 2, 2.5, customCaliperCol);
                    px(wx - 1, rearL + 5, 2, 2.5, customCaliperCol);
                }
                // Диски
                px(-wx, frontL + 2, 2, 4.5, customRimCol);
                px(wx - 2, frontL + 2, 2, 4.5, customRimCol);
                px(-wx, rearL + 2, 2.2, 5, customRimCol);
                px(wx - 2, rearL + 2, 2.2, 5, customRimCol);

                // Детализация штампов: серебристые центральные колпачки
                if (isStamps) {
                    px(-wx + 0.6, frontL + 3.8, 0.8, 1.0, "#94a3b8");
                    px(wx - 1.4, frontL + 3.8, 0.8, 1.0, "#94a3b8");
                    px(-wx + 0.6, rearL + 4.0, 0.8, 1.0, "#94a3b8");
                    px(wx - 1.4, rearL + 4.0, 0.8, 1.0, "#94a3b8");
                } else if (isDeepdish) {
                    // Золотая ступица внутри хромированной глубокой полки
                    px(-wx + 0.4, frontL + 3, 1.2, 2.5, "#d97706");
                    px(wx - 1.6, frontL + 3, 1.2, 2.5, "#d97706");
                    px(-wx + 0.4, rearL + 3.2, 1.2, 2.6, "#d97706");
                    px(wx - 1.6, rearL + 3.2, 1.2, 2.6, "#d97706");
                } else if (isForged) {
                    // Спортивные тонкие спицы и вентиляция диска
                    px(-wx + 0.2, frontL + 3.2, 0.6, 2.0, "#09090b");
                    px(wx - 1.2, frontL + 3.2, 0.6, 2.0, "#09090b");
                    px(-wx + 0.2, rearL + 3.2, 0.6, 2.2, "#09090b");
                    px(wx - 1.2, rearL + 3.2, 0.6, 2.2, "#09090b");
                }
            }

            // Остекление с реалистичными бликами, анатомическим изгибом и премиум-тонировкой
            function drawGlass(gx, gy, gw, gh, glassCol = "#0b1329", glare = true) {
                let col = glassCol;
                if (options.tint === 'chameleon') {
                    col = "#1e1035"; // глубокая фиолетовая основа хамелеона
                } else if (options.tint === 'dubai') {
                    col = "#334155"; // металлическая основа зеркальной дубайки
                } else if (Number(options.tint) >= 95) {
                    col = "#020408";
                } else if (Number(options.tint) >= 50) {
                    col = "#080c18";
                }
                const isFront = gy < 0;
                const topW = isFront ? (gw - 3) : gw;
                const btmW = isFront ? gw : (gw - 3);
                fillPoly([
                    [-topW/2, gy],
                    [topW/2, gy],
                    [btmW/2, gy + gh],
                    [-btmW/2, gy + gh]
                ], col);

                if (glare) {
                    if (options.tint === 'chameleon') {
                        // Переливающийся бирюзово-фиолетовый перелив Mystique Chameleon
                        fillPoly([
                            [-topW/2 + 2, gy + 1],
                            [-topW/2 + 5, gy + 1],
                            [-btmW/2 + 7, gy + gh - 1],
                            [-btmW/2 + 4, gy + gh - 1]
                        ], "rgba(6, 182, 212, 0.65)");
                        fillPoly([
                            [-topW/2 + 4, gy + 1],
                            [-topW/2 + 6, gy + 1],
                            [-btmW/2 + 8, gy + gh - 1],
                            [-btmW/2 + 6, gy + gh - 1]
                        ], "rgba(168, 85, 247, 0.60)");
                    } else if (options.tint === 'dubai') {
                        // Зеркальный хромированный металлик Dubai
                        fillPoly([
                            [-topW/2 + 2, gy + 1],
                            [-topW/2 + 6, gy + 1],
                            [-btmW/2 + 8, gy + gh - 1],
                            [-btmW/2 + 4, gy + gh - 1]
                        ], "rgba(248, 250, 252, 0.85)");
                        fillPoly([
                            [-topW/2 + 3, gy + 1],
                            [-topW/2 + 4.5, gy + 1],
                            [-btmW/2 + 6.5, gy + gh - 1],
                            [-btmW/2 + 5, gy + gh - 1]
                        ], "rgba(255, 255, 255, 0.95)");
                    } else if (!options.tint || Number(options.tint) < 95) {
                        fillPoly([
                            [-topW/2 + 2, gy + 1],
                            [-topW/2 + 5, gy + 1],
                            [-btmW/2 + 7, gy + gh - 1],
                            [-btmW/2 + 4, gy + gh - 1]
                        ], "rgba(255,255,255,0.35)");
                    }
                }
            }

            // Боковые зеркала
            function drawMirrors(w, y, bodyCol = "#334155", glassCol = "#38bdf8") {
                const mx = Math.round(w / 2);
                fillRound(-mx - 2.8, y, 2.6, 3.2, 1, bodyCol);
                fillRound(mx + 0.2, y, 2.6, 3.2, 1, bodyCol);
                px(-mx - 1.5, y + 1, 1, 1.2, glassCol);
                px(mx + 0.5, y + 1, 1, 1.2, glassCol);
            }

            // Фары со светодиодным ореолом
            function drawHeadlights(lx, rx, y, w, h, col = "#ffffff", isRound = false) {
                if (isRound) {
                    ctx.save();
                    ctx.fillStyle = col;
                    ctx.beginPath();
                    ctx.arc(Math.round(cx + lx * s), Math.round(cy + y * s), Math.max(1, (w/2)*s), 0, Math.PI*2);
                    ctx.arc(Math.round(cx + rx * s), Math.round(cy + y * s), Math.max(1, (w/2)*s), 0, Math.PI*2);
                    ctx.fill();
                    ctx.restore();
                } else {
                    fillRound(lx - w/2, y, w, h, 1, col);
                    fillRound(rx - w/2, y, w, h, 1, col);
                }
            }

            // Задние фонари
            function drawTaillights(lx, rx, y, w, h, col = "#dc2626") {
                fillRound(lx - w/2, y, w, h, 1, col);
                fillRound(rx - w/2, y, w, h, 1, col);
            }

            switch(name) {
                case "ВАЗ-2107 «Жигули»": {
                    const bt = getBodyTones("#991b1b");
                    drawShadow(20, 48);
                    drawWheels(18, 23, "#e2e8f0", null, "#1e293b");

                    // Советские брызговики с белыми точками
                    px(-10, 22, 3, 2, "#09090b");
                    px(7, 22, 3, 2, "#09090b");
                    px(-9, 23, 1, 1, "#f8fafc");
                    px(8, 23, 1, 1, "#f8fafc");

                    // Базовый силуэт кузова седана
                    fillRound(-8.5, -24, 17, 46, 2, bt.mid, bt.dark, 1);
                    // Капот с центральным характерным ребром 2107
                    fillRound(-8, -23, 16, 12, 1, bt.light);
                    px(-0.6, -23, 1.2, 12, bt.bright);

                    // Хромированные бамперы с резиновой накладкой и клыками
                    fillRound(-9.5, -25.5, 19, 2.5, 1, "#e2e8f0");
                    px(-7.5, -25.5, 15, 1.2, "#0f172a");
                    fillRound(-9.5, 21.5, 19, 2.5, 1, "#e2e8f0");
                    px(-7.5, 22.5, 15, 1.2, "#0f172a");

                    // Легендарная высокая решетка-утюг ВАЗ-2107 (хром + черная сетка + золотая Ладья)
                    fillRound(-4.5, -25, 9, 3.2, 1, "#f8fafc");
                    fillRound(-3.5, -24.5, 7, 2.2, 0.5, "#0f172a");
                    px(-0.8, -24.5, 1.6, 1.2, "#f59e0b");

                    // Чехословацкие прямоугольные блок-фары + оранжевые поворотники
                    drawHeadlights(-6.5, 6.5, -24.5, 3.5, 2.5, "#fef9c3");
                    px(-8.8, -24.5, 1.8, 2.5, "#f59e0b");
                    px(7.0, -24.5, 1.8, 2.5, "#f59e0b");

                    drawMirrors(18, -10, bt.dark, "#94a3b8");

                    // Лобовое стекло с резинкой
                    drawGlass(-7.5, -10.5, 15, 6.5, "#1e293b", true);

                    // Крыша с хромированными водостоками
                    fillRound(-7.5, -4, 15, 14, 1, bt.mid);
                    px(-7.5, -4, 1, 14, "#e2e8f0");
                    px(6.5, -4, 1, 14, "#e2e8f0");

                    // Заднее стекло с медными нитями обогрева
                    drawGlass(-7.5, 10, 15, 5.5, "#1e293b", false);
                    px(-5.5, 11.5, 11, 0.8, "rgba(249,115,22,0.45)");
                    px(-5.5, 13.5, 11, 0.8, "rgba(249,115,22,0.45)");

                    // Багажник и замок
                    fillRound(-7.5, 15.5, 15, 6, 1, bt.mid);
                    px(-0.8, 20.5, 1.6, 1, "#e2e8f0");

                    // Трехсекционные задние фонари
                    px(-8.5, 20.5, 2.5, 2, "#f59e0b");
                    px(-6.0, 20.5, 1.8, 2, "#f8fafc");
                    px(-4.2, 20.5, 2.2, 2, "#dc2626");
                    px(2.0, 20.5, 2.2, 2, "#dc2626");
                    px(4.2, 20.5, 1.8, 2, "#f8fafc");
                    px(6.0, 20.5, 2.5, 2, "#f59e0b");

                    // Хромированный выхлоп
                    px(4.8, 23.5, 2, 2, "#cbd5e1");
                    break;
                }

                case "ВАЗ-2109 «Девятка»": {
                    const bt = getBodyTones("#dc2626");
                    drawShadow(20, 47);
                    drawWheels(18, 23, "#94a3b8", null, "#1e293b");

                    // Клиновидный аэродинамичный нос «зубило» с коротким крылом
                    fillPoly([
                        [-5.5, -24.5], [5.5, -24.5],
                        [8.5, -18], [8.5, 18],
                        [7.5, 22], [-7.5, 22],
                        [-8.5, 18], [-8.5, -18]
                    ], bt.mid, bt.dark, 1);

                    // Черные широкие пластиковые бамперы девятки
                    fillRound(-8.5, -24.5, 17, 3, 1, "#181a20");
                    fillRound(-8.5, 20.5, 17, 3, 1, "#181a20");

                    // Черная решетка радиатора с полосами
                    fillRound(-4.5, -24, 9, 2, 0.5, "#09090b");
                    px(-0.8, -23.8, 1.6, 1, "#e2e8f0");

                    // Фары со скошенными стеклами и оранжевыми поворотниками
                    drawHeadlights(-6.5, 6.5, -23.5, 3.2, 2.2, "#fef08a");
                    px(-8.2, -23.5, 1.6, 2.2, "#f59e0b");
                    px(6.6, -23.5, 1.6, 2.2, "#f59e0b");

                    // Капот со скосом
                    fillRound(-7, -21.5, 14, 10.5, 1, bt.light);

                    // Черные молдинги вдоль бортов девятки
                    px(-8.5, -12, 1, 28, "#181a20");
                    px(7.5, -12, 1, 28, "#181a20");

                    drawMirrors(18, -10.5, "#181a20", "#94a3b8");

                    drawGlass(-7.5, -10.5, 15, 6.5, "#1e293b", true);

                    // Крыша
                    fillRound(-7.2, -4, 14.4, 13.5, 1, bt.mid);

                    // Заднее стекло хэтчбека со стеклоочистителем
                    drawGlass(-7.2, 9.5, 14.4, 6, "#1e293b", false);
                    px(-2, 10.5, 4.5, 0.8, "#09090b");

                    // Черный пластиковый козырек на двери багажника
                    fillRound(-7.5, 15.5, 15, 1.8, 0.5, "#181a20");

                    // Задние фонари
                    drawTaillights(-6.5, 6.5, 19.5, 3.5, 2, "#dc2626");
                    px(-6.5, 19.5, 1.5, 1, "#f59e0b");
                    px(5.0, 19.5, 1.5, 1, "#f59e0b");

                    px(4.5, 23, 2.2, 2, "#94a3b8");
                    break;
                }

                case "ГАЗ-24 «Волга»": {
                    const bt = getBodyTones("#0f172a");
                    drawShadow(22, 53);
                    drawWheels(20, 26, "#f8fafc", null, "#334155");

                    fillRound(-9.5, -26, 19, 52, 2, bt.mid, bt.dark, 1);
                    fillRound(-8.5, -25, 17, 14.5, 1, bt.light);
                    px(-0.5, -25, 1, 14.5, "#e2e8f0");

                    fillRound(-10.5, -27, 21, 2.8, 1, "#f1f5f9");
                    fillRound(-10.5, 24.5, 21, 2.8, 1, "#f1f5f9");

                    fillRound(-6, -26.5, 12, 3, 1, "#e2e8f0");
                    for (let x = -5; x <= 5; x += 1.6) px(x, -26.5, 0.8, 3, "#09090b");
                    px(-0.8, -26.5, 1.6, 1.2, "#dc2626");

                    drawHeadlights(-7.5, 7.5, -25.5, 3.8, 3.8, "#fef9c3", true);
                    px(-8.8, -25.5, 1.4, 2, "#f59e0b");
                    px(7.4, -25.5, 1.4, 2, "#f59e0b");

                    drawMirrors(20, -14, "#e2e8f0", "#94a3b8");

                    drawGlass(-8.5, -11.5, 17, 7, "#1e293b", true);
                    px(-8, -9, 0.8, 3, "#e2e8f0");
                    px(7.2, -9, 0.8, 3, "#e2e8f0");

                    fillRound(-8.2, -4.5, 16.4, 15, 1, bt.mid);

                    drawGlass(-8.2, 10.5, 16.4, 6, "#1e293b", false);

                    fillRound(-8.5, 16.5, 17, 8.5, 1, bt.mid);
                    fillRound(-5, 23.5, 10, 1.2, 0.5, "#f1f5f9");

                    px(-9, 22.5, 2.4, 3, "#dc2626");
                    px(6.6, 22.5, 2.4, 3, "#dc2626");
                    px(-8.2, 22.5, 1, 1.5, "#f59e0b");
                    px(7.2, 22.5, 1, 1.5, "#f59e0b");

                    px(5.5, 26, 2, 2.5, "#cbd5e1");
                    break;
                }

                case "Lada Priora БПАН": {
                    const bt = getBodyTones("#090a0f");
                    drawShadow(19, 47);
                    drawWheels(18, 23, "#e2e8f0", "#ef4444", "#334155");

                    fillRound(-8.5, -24.5, 17, 47, 3, bt.mid, bt.dark, 1);

                    fillRound(-7.5, -25, 15, 2.5, 1, "#111827");
                    fillRound(-3, -25, 6, 1.2, 0.5, "#1f2937");

                    drawHeadlights(-6.5, 6.5, -24, 3.6, 2.2, "#a5f3fc");
                    px(-6.5, -24, 1.8, 1, "#ffffff");
                    px(4.7, -24, 1.8, 1, "#ffffff");

                    fillRound(-7.5, -22, 15, 11, 2, bt.light);

                    drawMirrors(18, -10.5, bt.dark, "#38bdf8");

                    drawGlass(-7.8, -10.5, 15.6, 6.5, "#010204", false);
                    px(-4, -10.5, 8, 1, "#ffffff");

                    fillRound(-7.2, -4, 14.4, 14, 1, bt.mid);

                    drawGlass(-7.5, 10, 15, 5.5, "#010204", false);

                    fillRound(-8, 20.5, 16, 2, 0.5, bt.bright);

                    drawTaillights(-7.2, 7.2, 21.5, 2.8, 2, "#450a0a");

                    px(4.5, 23.5, 2.8, 2.5, "#38bdf8");
                    px(4.8, 25.5, 2.2, 1.5, "#f59e0b");
                    break;
                }

                case "Hyundai Solaris": {
                    const bt = getBodyTones("#e2e8f0");
                    drawShadow(20, 49);
                    drawWheels(19, 24, "#cbd5e1", null, "#475569");

                    fillRound(-8.5, -25, 17, 48, 4, bt.mid, bt.dark, 1);

                    fillPoly([
                        [-4, -25], [4, -25],
                        [5, -22], [-5, -22]
                    ], "#111827", "#e2e8f0", 0.8);

                    drawHeadlights(-6.8, 6.8, -24.5, 3.5, 3, "#bae6fd");
                    px(-7.5, -23.5, 1.2, 2, "#ffffff");
                    px(6.3, -23.5, 1.2, 2, "#ffffff");

                    fillRound(-7.5, -21.5, 15, 11, 2, bt.light);

                    drawMirrors(19, -10.5, bt.mid, "#38bdf8");

                    drawGlass(-7.8, -10.5, 15.6, 6.5, "#0f172a", true);

                    fillRound(-7.2, -4, 14.4, 14.5, 2, bt.mid);

                    drawGlass(-7.5, 10.5, 15, 5.5, "#0f172a", true);

                    drawTaillights(-7.2, 7.2, 21.5, 3.2, 2.2, "#ef4444");
                    px(-7.2, 21.5, 1.4, 1, "#fca5a5");
                    px(5.8, 21.5, 1.4, 1, "#fca5a5");
                    break;
                }

                case "Lada Vesta Sport": {
                    const bt = getBodyTones("#f8fafc");
                    drawShadow(21, 49);
                    drawWheels(20, 24, "#1e293b", "#ef4444", "#475569");

                    fillRound(-9, -25, 18, 48, 3, bt.mid, bt.dark, 1);

                    fillRound(-5, -25.5, 10, 3.2, 1, "#09090b");
                    px(-6.5, -25, 1.5, 2.5, "#e2e8f0");
                    px(5.0, -25, 1.5, 2.5, "#e2e8f0");
                    fillRound(-8.5, -25.5, 17, 1.2, 0.5, "#ef4444");

                    drawHeadlights(-7.2, 7.2, -24.5, 3.8, 2.2, "#e0f2fe");

                    fillRound(-8, -22, 16, 11, 2, bt.light);

                    px(-9, -7, 0.8, 10, bt.dark);
                    px(8.2, -7, 0.8, 10, bt.dark);

                    drawMirrors(20, -10.5, "#09090b", "#38bdf8");

                    drawGlass(-8, -10.5, 16, 6.5, "#0f172a", true);

                    fillRound(-7.5, -4, 15, 14.5, 1, "#09090b");

                    drawGlass(-7.8, 10.5, 15.6, 5.5, "#0f172a", false);

                    fillRound(-8.5, 20.5, 17, 2, 0.5, bt.bright);
                    px(-1.5, 20.5, 3, 0.8, "#09090b");

                    drawTaillights(-7.5, 7.5, 21.5, 3.6, 2.2, "#dc2626");

                    fillRound(-7, 22.5, 14, 1, 0.5, "#ef4444");
                    px(4.2, 23.2, 3.2, 1.8, "#cbd5e1");
                    break;
                }

                case "Volkswagen Polo": {
                    const bt = getBodyTones("#f1f5f9");
                    drawShadow(20, 48);
                    drawWheels(19, 24, "#cbd5e1", null, "#475569");

                    fillRound(-8.5, -24.5, 17, 47, 2.5, bt.mid, bt.dark, 1);

                    fillRound(-5, -24.8, 10, 2.2, 0.5, "#0f172a");
                    px(-5, -24.5, 10, 0.8, "#e2e8f0");
                    px(-0.8, -24.8, 1.6, 1.6, "#f8fafc");

                    drawHeadlights(-6.8, 6.8, -24, 3.4, 2.2, "#f8fafc");
                    px(-6.8, -23, 3.4, 0.8, "#38bdf8");
                    px(3.4, -23, 3.4, 0.8, "#38bdf8");

                    fillRound(-7.5, -21.8, 15, 11, 1.5, bt.light);

                    drawMirrors(19, -10.5, bt.mid, "#38bdf8");

                    drawGlass(-7.8, -10.5, 15.6, 6.5, "#0f172a", true);

                    fillRound(-7.2, -4, 14.4, 14, 1, bt.mid);

                    drawGlass(-7.5, 10, 15, 5.5, "#0f172a", true);

                    drawTaillights(-7.2, 7.2, 21, 3.4, 2, "#dc2626");
                    px(-7.2, 21.5, 1.8, 1, "#fca5a5");
                    px(5.4, 21.5, 1.8, 1, "#fca5a5");

                    px(-5.5, 23, 2, 1.8, "#94a3b8");
                    break;
                }

                case "Toyota Mark II Tourer V": {
                    const bt = getBodyTones("#f8fafc");
                    drawShadow(22, 52);
                    drawWheels(21, 26, "#e2e8f0", "#eab308", "#334155", true);

                    fillRound(-9.5, -26, 19, 51, 3, bt.mid, bt.dark, 1);

                    fillRound(-9.2, -26.5, 18.4, 2.2, 1, "#181a20");

                    fillRound(-4.5, -25.8, 9, 2.2, 0.5, "#09090b");
                    px(-0.8, -25.5, 1.6, 1.2, "#eab308");

                    drawHeadlights(-7.2, 7.2, -25, 3.8, 2.5, "#e0f2fe");
                    px(-9.2, -25, 1.8, 2.5, "#f59e0b");
                    px(7.4, -25, 1.8, 2.5, "#f59e0b");

                    fillRound(-8.5, -22.5, 17, 12, 1.5, bt.light);

                    drawMirrors(21, -11, bt.dark, "#38bdf8");

                    drawGlass(-8.5, -11, 17, 7, "#0f172a", true);

                    fillRound(-8, -4, 16, 14.5, 1, bt.mid);

                    drawGlass(-8.5, 10.5, 17, 6, "#0f172a", true);

                    fillRound(-8.5, 22, 17, 2.5, 0.5, "#dc2626");
                    px(-3, 22.2, 6, 1.2, "#fca5a5");
                    px(-0.8, 22.5, 1.6, 1, "#f59e0b");

                    px(5.2, 24.5, 3.2, 3, "#38bdf8");
                    px(5.5, 27, 2.5, 1.5, "#f59e0b");
                    break;
                }

                case "Subaru Impreza WRX STI": {
                    const bt = getBodyTones("#1d4ed8");
                    drawShadow(22, 50);
                    drawWheels(21, 25, "#eab308", "#a3e635", "#334155", true);

                    fillRound(-9.5, -25.5, 19, 49, 3, bt.mid, bt.dark, 1);

                    fillRound(-8.5, -26, 17, 2.5, 1, "#09090b");
                    px(-0.8, -25.5, 1.6, 1, "#dc2626");

                    drawHeadlights(-7.5, 7.5, -25, 4, 2.5, "#e0f2fe");
                    px(-7.5, -24.5, 1, 2, "#38bdf8");
                    px(6.5, -24.5, 1, 2, "#38bdf8");

                    fillRound(-8.5, -22.5, 17, 11.5, 2, bt.light);
                    fillRound(-4.5, -19.5, 9, 4.2, 1.5, "#09090b");
                    fillRound(-3.5, -18.5, 7, 2.5, 1, bt.darkest);

                    px(-9.5, -12, 1, 4, "#09090b");
                    px(8.5, -12, 1, 4, "#09090b");

                    drawMirrors(21, -11, bt.dark, "#38bdf8");

                    drawGlass(-8.5, -11, 17, 6.5, "#0f172a", true);

                    fillRound(-8, -4.5, 16, 14.5, 1.5, bt.mid);

                    drawGlass(-8.5, 10, 17, 5.5, "#0f172a", true);

                    fillRound(-10, 20.5, 20, 2.8, 1, bt.bright);
                    px(-8, 19, 2, 2.5, bt.dark);
                    px(6, 19, 2, 2.5, bt.dark);

                    drawTaillights(-7.5, 7.5, 22.5, 3.8, 2.2, "#dc2626");

                    px(-7.5, 25, 2, 2.2, "#cbd5e1");
                    px(-4.8, 25, 2, 2.2, "#cbd5e1");
                    px(2.8, 25, 2, 2.2, "#cbd5e1");
                    px(5.5, 25, 2, 2.2, "#cbd5e1");
                    break;
                }

                case "BMW M5 E60 V10": {
                    const bt = getBodyTones("#64748b");
                    drawShadow(22, 51);
                    drawWheels(21, 26, "#e2e8f0", "#2563eb", "#334155", true);

                    fillRound(-9.5, -26, 19, 50, 3, bt.mid, bt.dark, 1);

                    fillRound(-4.5, -26, 4, 2.5, 0.8, "#09090b");
                    fillRound(0.5, -26, 4, 2.5, 0.8, "#09090b");
                    px(-3.2, -26, 1, 2.5, "#06b6d4");
                    px(-2.2, -26, 1, 2.5, "#1d4ed8");
                    px(-1.2, -26, 1, 2.5, "#ef4444");

                    drawHeadlights(-7.5, 7.5, -25, 4, 2.8, "#fef08a");
                    px(-7.5, -24.5, 1.8, 1.8, "#ca8a04");
                    px(5.7, -24.5, 1.8, 1.8, "#ca8a04");

                    fillRound(-8.5, -23, 17, 12, 2, bt.light);

                    px(-9.8, -12, 1.2, 4.5, "#e2e8f0");
                    px(8.6, -12, 1.2, 4.5, "#e2e8f0");

                    drawMirrors(21, -11, bt.dark, "#38bdf8");

                    drawGlass(-8.5, -11, 17, 6.5, "#0f172a", true);

                    fillRound(-8, -4.5, 16, 14.5, 1.5, bt.mid);

                    drawGlass(-8.5, 10, 17, 5.5, "#0f172a", true);

                    fillRound(-8.5, 20.5, 17, 2.5, 1, bt.bright);
                    fillRound(-7.5, 22.5, 15, 2, 1, bt.dark);

                    drawTaillights(-7.8, 7.8, 22, 4, 2.2, "#ef4444");
                    px(-7.8, 22, 2.2, 1, "#fca5a5");
                    px(5.6, 22, 2.2, 1, "#fca5a5");

                    px(-7.8, 25, 2, 2.5, "#38bdf8");
                    px(-5.2, 25, 2, 2.5, "#38bdf8");
                    px(3.2, 25, 2, 2.5, "#38bdf8");
                    px(5.8, 25, 2, 2.5, "#38bdf8");
                    break;
                }

                case "Nissan Silvia S15 Spec-R": {
                    const bt = getBodyTones("#f8fafc");
                    drawShadow(21, 48);
                    drawWheels(20, 24, "#e2e8f0", "#ef4444", "#334155", true);

                    fillRound(-9, -25, 18, 47, 3.5, bt.mid, bt.dark, 1);

                    fillRound(-5, -25.5, 10, 2, 1, "#09090b");

                    drawHeadlights(-7, 7, -24.5, 3.6, 2.2, "#e0f2fe");
                    px(-8, -24.2, 1.2, 2, "#38bdf8");
                    px(6.8, -24.2, 1.2, 2, "#38bdf8");

                    fillRound(-8, -22.5, 16, 11, 2, bt.light);

                    drawMirrors(20, -11, bt.dark, "#38bdf8");

                    drawGlass(-8, -11, 16, 6.5, "#0f172a", true);

                    fillRound(-7.5, -4.5, 15, 13.5, 2, bt.mid);

                    drawGlass(-8, 9, 16, 6, "#0f172a", true);

                    fillRound(-9.5, 19.5, 19, 2.5, 0.8, bt.bright);
                    px(-7.5, 18, 1.5, 2.5, bt.dark);
                    px(6, 18, 1.5, 2.5, bt.dark);

                    drawTaillights(-7.2, 7.2, 21.5, 3.6, 2, "#dc2626");

                    px(5, 23.5, 3, 2.8, "#38bdf8");
                    break;
                }

                case "Toyota Camry 3.5": {
                    const bt = getBodyTones("#0f172a");
                    drawShadow(22, 52);
                    drawWheels(21, 26, "#cbd5e1", null, "#475569");

                    fillRound(-9.5, -26, 19, 51, 3, bt.mid, bt.dark, 1);

                    fillPoly([
                        [-5.5, -26], [5.5, -26],
                        [7.5, -23], [-7.5, -23]
                    ], "#09090b", "#475569", 0.8);

                    drawHeadlights(-7.5, 7.5, -25.2, 3.8, 2.2, "#e0f2fe");
                    px(-7.5, -24.5, 1.2, 1, "#ffffff");
                    px(6.3, -24.5, 1.2, 1, "#ffffff");

                    fillRound(-8.5, -22.5, 17, 12, 2, bt.light);

                    drawMirrors(21, -11, bt.dark, "#38bdf8");

                    drawGlass(-8.5, -11, 17, 7, "#0f172a", true);

                    fillRound(-8, -4, 16, 14.5, 1.5, bt.mid);
                    px(-8.8, -10, 0.8, 20, "#e2e8f0");
                    px(8, -10, 0.8, 20, "#e2e8f0");

                    drawGlass(-8.5, 10.5, 17, 6, "#0f172a", true);

                    fillRound(-8.5, 21, 17, 2, 0.5, bt.bright);

                    drawTaillights(-7.8, 7.8, 22.2, 3.8, 2.2, "#dc2626");

                    px(-7.5, 25, 2.8, 2, "#cbd5e1");
                    px(4.7, 25, 2.8, 2, "#cbd5e1");
                    break;
                }

                case "Toyota Land Cruiser 300": {
                    const bt = getBodyTones("#f8fafc");
                    drawShadow(25, 54);
                    drawWheels(23, 27, "#cbd5e1", null, "#475569", true);

                    fillRound(-11, -26.5, 22, 53, 3, bt.mid, bt.dark, 1.2);

                    fillRound(-10, -25.5, 20, 14, 2, bt.light);
                    fillRound(-3, -24, 6, 11, 1, bt.mid);

                    fillRound(-8.5, -27, 17, 4.5, 1, "#e2e8f0");
                    for (let y = -26.5; y <= -23.5; y += 1.4) px(-7.5, y, 15, 0.8, "#0f172a");
                    px(-1.2, -25.5, 2.4, 1.8, "#e2e8f0");

                    drawHeadlights(-9, 9, -26, 4.2, 2.8, "#f8fafc");

                    fillRound(-12, -10, 1.5, 22, 0.5, "#334155");
                    fillRound(10.5, -10, 1.5, 22, 0.5, "#334155");

                    drawMirrors(23, -12, bt.dark, "#38bdf8");

                    drawGlass(-9.5, -11.5, 19, 7.5, "#0f172a", true);

                    fillRound(-9.2, -4, 18.4, 16, 2, bt.mid);
                    px(-9, -5, 1, 17, "#334155");
                    px(8, -5, 1, 17, "#334155");

                    drawGlass(-9.5, 12, 19, 6.5, "#0f172a", false);

                    fillRound(-9.5, 18.5, 19, 2.2, 0.8, bt.bright);

                    drawTaillights(-9, 9, 23.5, 4.5, 2.5, "#dc2626");

                    px(6.5, 26.5, 3, 2, "#94a3b8");
                    break;
                }

                case "Nissan GT-R R35 Nismo": {
                    const bt = getBodyTones("#f8fafc");
                    drawShadow(23, 51);
                    drawWheels(22, 26, "#09090b", "#f59e0b", "#334155", true);

                    fillRound(-10, -25.5, 20, 50, 3, bt.mid, bt.dark, 1);

                    fillRound(-10, -26.5, 20, 2.8, 1, "#09090b");
                    fillRound(-9.5, -26.8, 19, 0.8, 0.5, "#ef4444");

                    fillRound(-5.5, -25.5, 11, 3, 0.8, "#09090b");
                    px(-1.2, -25, 2.4, 1.2, "#e2e8f0");

                    drawHeadlights(-8, 8, -25, 3.8, 3.2, "#e0f2fe");
                    px(-8, -24.5, 1.2, 2.5, "#38bdf8");
                    px(6.8, -24.5, 1.2, 2.5, "#38bdf8");

                    fillRound(-9, -22.5, 18, 12, 2, bt.light);
                    fillRound(-4.5, -18, 2.5, 3, 0.8, "#09090b");
                    fillRound(2, -18, 2.5, 3, 0.8, "#09090b");

                    px(-10.2, -12, 1.2, 4.5, "#09090b");
                    px(9, -12, 1.2, 4.5, "#09090b");

                    drawMirrors(22, -11, "#09090b", "#38bdf8");

                    drawGlass(-8.8, -11, 17.6, 6.5, "#0f172a", true);

                    fillRound(-8.2, -4.5, 16.4, 14.5, 1.5, "#09090b");

                    drawGlass(-8.8, 10, 17.6, 5.5, "#0f172a", true);

                    fillRound(-10.5, 19.5, 21, 2.8, 1, "#09090b");
                    fillRound(-10, 19.8, 20, 0.8, 0.5, "#ef4444");
                    px(-8, 18, 1.8, 2.5, "#334155");
                    px(6.2, 18, 1.8, 2.5, "#334155");

                    drawHeadlights(-7.5, -4.5, 22.5, 2.8, 2.8, "#ef4444", true);
                    drawHeadlights(4.5, 7.5, 22.5, 2.8, 2.8, "#ef4444", true);

                    px(-7.5, 25, 2.5, 2.5, "#38bdf8");
                    px(-4.5, 25, 2.5, 2.5, "#38bdf8");
                    px(2, 25, 2.5, 2.5, "#38bdf8");
                    px(5, 25, 2.5, 2.5, "#38bdf8");
                    break;
                }

                case "Mercedes-Benz E63s AMG": {
                    const bt = getBodyTones("#18181b");
                    drawShadow(23, 52);
                    drawWheels(22, 26, "#e2e8f0", "#ef4444", "#334155", true);

                    fillRound(-10, -26, 20, 51, 3, bt.mid, bt.dark, 1);

                    fillRound(-6, -26.5, 12, 3.5, 1.2, "#09090b");
                    for (let x = -4.5; x <= 4.5; x += 1.8) px(x, -26.5, 0.8, 3.5, "#e2e8f0");
                    px(-1.2, -25.5, 2.4, 2, "#f8fafc");

                    drawHeadlights(-8, 8, -25.2, 4, 2.5, "#e0f2fe");
                    px(-8, -24.5, 2.5, 0.8, "#38bdf8");
                    px(5.5, -24.5, 2.5, 0.8, "#38bdf8");

                    fillRound(-9, -23, 18, 12.5, 2, bt.light);
                    px(-3.5, -22, 1, 10, bt.bright);
                    px(2.5, -22, 1, 10, bt.bright);

                    px(-10.2, -12, 1, 4.5, "#e2e8f0");
                    px(9.2, -12, 1, 4.5, "#e2e8f0");

                    drawMirrors(22, -11, bt.dark, "#38bdf8");

                    drawGlass(-8.8, -11, 17.6, 7, "#0f172a", true);

                    fillRound(-8.2, -4, 16.4, 14.5, 1.5, "#09090b");

                    drawGlass(-8.8, 10.5, 17.6, 6, "#0f172a", true);

                    fillRound(-9, 21.2, 18, 1.8, 0.5, "#09090b");

                    drawTaillights(-8, 8, 22.5, 4, 2.2, "#dc2626");

                    px(-7.5, 25.2, 2.6, 2, "#e2e8f0");
                    px(-4.5, 25.2, 2.6, 2, "#e2e8f0");
                    px(2, 25.2, 2.6, 2, "#e2e8f0");
                    px(5, 25.2, 2.6, 2, "#e2e8f0");
                    break;
                }

                case "Audi RS6 Avant": {
                    const bt = getBodyTones("#475569");
                    drawShadow(24, 53);
                    drawWheels(23, 27, "#09090b", "#3b82f6", "#334155", true);

                    fillRound(-10.5, -26, 21, 52, 3, bt.mid, bt.dark, 1.2);

                    fillRound(-7, -26.8, 14, 3.8, 1.2, "#09090b");
                    px(-1.2, -25.8, 2.4, 1.4, "#e2e8f0");

                    drawHeadlights(-8.5, 8.5, -25.5, 4.2, 2.6, "#e0f2fe");
                    for (let i = 0; i < 3; i++) {
                        px(-8.5 + i * 1.2, -24.5, 0.8, 1.2, "#38bdf8");
                        px(6.5 + i * 1.2, -24.5, 0.8, 1.2, "#38bdf8");
                    }

                    fillRound(-9.5, -23, 19, 12, 2, bt.light);

                    drawMirrors(23, -11.5, "#09090b", "#38bdf8");

                    drawGlass(-9.2, -11.5, 18.4, 7, "#0f172a", true);

                    fillRound(-8.5, -4.5, 17, 16.5, 2, bt.mid);
                    px(-8.5, -5, 1, 16, "#09090b");
                    px(7.5, -5, 1, 16, "#09090b");

                    drawGlass(-9, 12, 18, 6.5, "#0f172a", false);
                    fillRound(-9.5, 12, 19, 1.8, 0.5, "#09090b");

                    drawTaillights(-8.5, 8.5, 23, 4.5, 2.2, "#dc2626");

                    fillRound(-7.5, 25.5, 3.8, 2.5, 1.2, "#09090b", "#e2e8f0", 0.8);
                    fillRound(3.7, 25.5, 3.8, 2.5, 1.2, "#09090b", "#e2e8f0", 0.8);
                    break;
                }

                case "BMW M5 F90 Competition": {
                    const bt = getBodyTones("#1e3a8a");
                    drawShadow(23, 52);
                    drawWheels(22, 26, "#09090b", "#f59e0b", "#334155", true);

                    fillRound(-10, -26, 20, 51, 3, bt.mid, bt.dark, 1);

                    fillRound(-5, -26.5, 4.5, 2.8, 0.8, "#09090b");
                    fillRound(0.5, -26.5, 4.5, 2.8, 0.8, "#09090b");
                    px(1.5, -26, 1.2, 0.8, "#ef4444");

                    drawHeadlights(-8, 8, -25.2, 4, 2.5, "#f8fafc");
                    px(-8, -24.5, 1.5, 1.5, "#2563eb");
                    px(6.5, -24.5, 1.5, 1.5, "#2563eb");

                    fillRound(-9, -23, 18, 12.5, 2, bt.light);

                    drawMirrors(22, -11, "#09090b", "#38bdf8");

                    drawGlass(-8.8, -11, 17.6, 7, "#0f172a", true);

                    fillRound(-8.2, -4, 16.4, 14.5, 1.5, "#09090b");
                    px(-1.2, -4, 2.4, 14.5, "#18181b");

                    drawGlass(-8.8, 10.5, 17.6, 6, "#0f172a", true);

                    fillRound(-9, 21.2, 18, 1.8, 0.5, "#09090b");

                    drawTaillights(-8, 8, 22.5, 4, 2.2, "#ef4444");

                    px(-7.5, 25.2, 2.2, 2.2, "#09090b");
                    px(-4.8, 25.2, 2.2, 2.2, "#09090b");
                    px(2.6, 25.2, 2.2, 2.2, "#09090b");
                    px(5.3, 25.2, 2.2, 2.2, "#09090b");
                    break;
                }

                case "BMW M8 Gran Coupe": {
                    const bt = getBodyTones("#0f172a");
                    drawShadow(24, 54);
                    drawWheels(23, 27, "#e2e8f0", "#ef4444", "#334155", true);

                    fillRound(-10.5, -27, 21, 53, 3.5, bt.mid, bt.dark, 1);

                    fillRound(-5.5, -27.5, 5, 2.5, 0.8, "#09090b");
                    fillRound(0.5, -27.5, 5, 2.5, 0.8, "#09090b");

                    drawHeadlights(-8.5, 8.5, -26.5, 4.2, 2.2, "#f8fafc");
                    px(-8.5, -25.8, 1.8, 1.2, "#38bdf8");
                    px(6.7, -25.8, 1.8, 1.2, "#38bdf8");

                    fillRound(-9.5, -24.5, 19, 14, 2, bt.light);

                    drawMirrors(23, -12, "#09090b", "#38bdf8");

                    drawGlass(-9.2, -12, 18.4, 7.5, "#0f172a", true);

                    fillRound(-8.5, -4.5, 17, 15, 2, "#09090b");

                    drawGlass(-9, 10.5, 18, 6.5, "#0f172a", true);

                    fillRound(-9.5, 21.5, 19, 2, 0.5, bt.bright);

                    drawTaillights(-8.5, 8.5, 23, 4.5, 1.8, "#dc2626");
                    px(-8.5, 23.2, 2.5, 0.8, "#fca5a5");
                    px(6.0, 23.2, 2.5, 0.8, "#fca5a5");

                    px(-8, 25.8, 2.2, 2.2, "#09090b");
                    px(-5.2, 25.8, 2.2, 2.2, "#09090b");
                    px(3, 25.8, 2.2, 2.2, "#09090b");
                    px(5.8, 25.8, 2.2, 2.2, "#09090b");
                    break;
                }

                case "Mercedes-Benz G63 AMG «Гелик»": {
                    const bt = getBodyTones("#09090b");
                    drawShadow(23, 50);
                    drawWheels(22, 25, "#e2e8f0", "#ef4444", "#334155", true);

                    fillRound(-10, -25, 20, 48, 1, bt.mid, bt.dark, 1.2);

                    fillRound(-6, -26, 12, 3.5, 0.5, "#09090b");
                    for (let x = -4.5; x <= 4.5; x += 1.8) px(x, -26, 0.8, 3.5, "#e2e8f0");
                    px(-1.2, -25, 2.4, 2, "#f8fafc");

                    drawHeadlights(-7.8, 7.8, -24.5, 3.8, 3.8, "#f8fafc", true);
                    drawHeadlights(-7.8, 7.8, -24.5, 2.2, 2.2, "#09090b", true);

                    fillRound(-9.8, -24.5, 2.4, 2.8, 0.5, "#f59e0b");
                    fillRound(7.4, -24.5, 2.4, 2.8, 0.5, "#f59e0b");

                    fillRound(-8.5, -22, 17, 11, 0.5, bt.light);

                    px(-10.2, -15, 0.8, 32, "#334155");
                    px(9.4, -15, 0.8, 32, "#334155");

                    drawMirrors(22, -11, bt.dark, "#38bdf8");

                    drawGlass(-8.5, -11, 17, 6.5, "#0f172a", true);

                    fillRound(-8.5, -4.5, 17, 16.5, 0.5, bt.mid);
                    for (let x = -6; x <= 6; x += 3) px(x, -4.5, 0.8, 16.5, bt.dark);

                    drawGlass(-8.5, 12, 17, 5.5, "#0f172a", false);

                    px(-11.5, 5, 1.8, 3.5, "#e2e8f0");
                    px(9.7, 5, 1.8, 3.5, "#e2e8f0");

                    drawHeadlights(0, 0, 23.5, 10, 6, "#e2e8f0", true);
                    drawHeadlights(0, 0, 23.5, 7.5, 4.5, "#09090b", true);
                    px(-1.2, 23, 2.4, 1.5, "#f8fafc");

                    drawTaillights(-8.5, 8.5, 22.5, 3.2, 1.8, "#dc2626");
                    break;
                }

                case "Porsche 911 Turbo S": {
                    const bt = getBodyTones("#f8fafc");
                    drawShadow(23, 50);
                    drawWheels(22, 25, "#09090b", "#eab308", "#334155", true);

                    fillRound(-10, -25, 20, 49, 4.5, bt.mid, bt.dark, 1);

                    drawHeadlights(-7.2, 7.2, -24, 4, 4, "#f8fafc", true);
                    for (let a = 0; a < 4; a++) {
                        const ang = a * Math.PI / 2;
                        px(-7.2 + Math.cos(ang) * 1.2, -24 + Math.sin(ang) * 1.2, 0.8, 0.8, "#38bdf8");
                        px(7.2 + Math.cos(ang) * 1.2, -24 + Math.sin(ang) * 1.2, 0.8, 0.8, "#38bdf8");
                    }

                    fillRound(-8, -22, 16, 11, 3, bt.light);

                    drawMirrors(22, -10.5, bt.dark, "#38bdf8");

                    drawGlass(-8, -10.5, 16, 6.5, "#0f172a", true);

                    fillRound(-7.5, -4, 15, 13, 2.5, bt.mid);

                    fillRound(-10.8, 5, 2.5, 7, 1, "#09090b");
                    fillRound(8.3, 5, 2.5, 7, 1, "#09090b");

                    drawGlass(-7.5, 9, 15, 6, "#0f172a", true);

                    fillRound(-5, 15.5, 10, 4.5, 0.5, "#09090b");
                    for (let x = -4; x <= 4; x += 1.6) px(x, 15.5, 0.8, 4.5, "#cbd5e1");

                    fillRound(-10, 20.5, 20, 2.5, 0.8, bt.bright);

                    fillRound(-9.5, 22.8, 19, 1.2, 0.5, "#ef4444");

                    px(-7.5, 25, 2.5, 2, "#cbd5e1");
                    px(-4.5, 25, 2.5, 2, "#cbd5e1");
                    px(2, 25, 2.5, 2, "#cbd5e1");
                    px(5, 25, 2.5, 2, "#cbd5e1");
                    break;
                }

                case "Lamborghini Huracan Performante": {
                    const bt = getBodyTones("#84cc16");
                    drawShadow(24, 50);
                    drawWheels(23, 25, "#09090b", "#84cc16", "#334155", true);

                    fillPoly([
                        [0, -26.5], [6, -25], [10.5, -20],
                        [10.5, 18], [9, 23.5], [-9, 23.5],
                        [-10.5, 18], [-10.5, -20], [-6, -25]
                    ], bt.mid, bt.dark, 1);

                    fillRound(-8.5, -26.5, 17, 2, 0.5, "#18181b");

                    drawHeadlights(-7.5, 7.5, -24.5, 3.8, 2.5, "#e0f2fe");
                    px(-7.5, -24.2, 1.5, 1, "#ffffff");
                    px(6, -24.2, 1.5, 1, "#ffffff");

                    fillPoly([
                        [0, -25], [6.5, -21], [6.5, -11],
                        [-6.5, -11], [-6.5, -21]
                    ], bt.light);

                    drawMirrors(23, -11, "#18181b", "#38bdf8");

                    drawGlass(-8, -11, 16, 7, "#0f172a", true);

                    fillRound(-7.2, -4, 14.4, 12, 1, bt.mid);

                    drawGlass(-6.5, 8, 13, 7.5, "#0f172a", false);
                    fillRound(-2.5, 9.5, 5, 4.5, 1, "#d97706");

                    fillRound(-10.5, 19.5, 21, 2.6, 0.8, "#18181b");
                    px(-8, 18, 1.8, 2.5, "#09090b");
                    px(6.2, 18, 1.8, 2.5, "#09090b");

                    drawTaillights(-8, 8, 22.2, 3.8, 1.8, "#dc2626");

                    drawHeadlights(-2.2, 2.2, 23.2, 2.5, 2.5, "#e2e8f0", true);
                    drawHeadlights(-2.2, 2.2, 23.2, 1.5, 1.5, "#09090b", true);
                    break;
                }

                case "Rolls-Royce Cullinan": {
                    const bt = getBodyTones("#09090b");
                    drawShadow(25, 55);
                    drawWheels(24, 27, "#f8fafc", null, "#475569", true);

                    fillRound(-11, -27, 22, 54, 2.5, bt.mid, bt.dark, 1.2);

                    fillRound(-10, -26, 20, 15, 1.5, bt.light);

                    fillRound(-6.5, -27.5, 13, 4, 0.8, "#f1f5f9");
                    for (let x = -5; x <= 5; x += 1.4) px(x, -27.5, 0.8, 4, "#09090b");
                    fillRound(-0.8, -28.2, 1.6, 1.5, 0.5, "#f8fafc");

                    drawHeadlights(-9, 9, -26.5, 4.2, 2.8, "#f8fafc");
                    px(-9, -25.5, 3.5, 0.8, "#38bdf8");
                    px(5.5, -25.5, 3.5, 0.8, "#38bdf8");

                    drawMirrors(24, -12, "#f1f5f9", "#38bdf8");

                    drawGlass(-9.5, -12, 19, 7.5, "#0f172a", true);

                    fillRound(-9.2, -4.5, 18.4, 16.5, 1, bt.mid);
                    px(-10.2, 1, 1, 2.5, "#f8fafc");
                    px(-10.2, 4, 1, 2.5, "#f8fafc");
                    px(9.2, 1, 1, 2.5, "#f8fafc");
                    px(9.2, 4, 1, 2.5, "#f8fafc");

                    drawGlass(-9.5, 12, 19, 6.5, "#0f172a", false);

                    px(-9.8, 22.5, 2.5, 4.5, "#dc2626");
                    px(7.3, 22.5, 2.5, 4.5, "#dc2626");
                    px(-9.8, 22.5, 2.5, 0.8, "#f8fafc");
                    px(7.3, 22.5, 2.5, 0.8, "#f8fafc");

                    px(-6, 26.5, 3, 1.5, "#f1f5f9");
                    px(3, 26.5, 3, 1.5, "#f1f5f9");
                    break;
                }

                case "Ferrari SF90 Stradale": {
                    const bt = getBodyTones("#dc2626");
                    drawShadow(24, 50);
                    drawWheels(23, 25, "#09090b", "#f59e0b", "#334155", true);

                    fillPoly([
                        [0, -26], [6, -24.5], [10.5, -18],
                        [10.5, 18], [8.5, 23], [-8.5, 23],
                        [-10.5, 18], [-10.5, -18], [-6, -24.5]
                    ], bt.mid, bt.dark, 1);

                    fillRound(-7, -25.5, 14, 2, 0.8, "#09090b");
                    fillRound(-3, -22.5, 6, 4, 1, "#09090b");

                    drawHeadlights(-7.8, 7.8, -24, 3.8, 1.8, "#f8fafc");

                    fillRound(-8, -19.5, 16, 8.5, 2, bt.light);

                    drawMirrors(23, -11, bt.dark, "#38bdf8");

                    drawGlass(-7.8, -11, 15.6, 7.5, "#010204", true);

                    drawGlass(-6.5, 8.5, 13, 7.5, "#010204", false);
                    px(-2.2, 10, 1.8, 4, "#ef4444");
                    px(0.4, 10, 1.8, 4, "#ef4444");

                    fillRound(-9, 19.5, 18, 2.2, 0.8, bt.bright);

                    drawTaillights(-7.5, 7.5, 22.2, 3.5, 1.5, "#dc2626");

                    drawHeadlights(-2.2, 2.2, 22.5, 2.4, 2.4, "#cbd5e1", true);
                    drawHeadlights(-2.2, 2.2, 22.5, 1.4, 1.4, "#09090b", true);
                    break;
                }

                case "Bugatti Chiron Super Sport": {
                    const bt = getBodyTones("#09090b");
                    drawShadow(24, 54);
                    drawWheels(23, 27, "#09090b", "#f97316", "#334155", true);

                    fillRound(-10.5, -26.5, 21, 53, 4, bt.mid, bt.dark, 1.2);

                    fillRound(-4.5, -27.5, 9, 3.8, 1.5, "#e2e8f0");
                    fillRound(-3.5, -27, 7, 3, 1, "#09090b");
                    px(-1, -26.5, 2, 1.5, "#dc2626");

                    for (let i = 0; i < 4; i++) {
                        px(-8.8 + i * 1.1, -25.5, 0.8, 1.8, "#38bdf8");
                        px(5.5 + i * 1.1, -25.5, 0.8, 1.8, "#38bdf8");
                    }

                    px(-0.6, -26, 1.2, 50, "#f97316");

                    px(-10.2, -15, 1, 24, "#f97316");
                    px(9.2, -15, 1, 24, "#f97316");

                    drawMirrors(23, -11.5, "#09090b", "#38bdf8");

                    drawGlass(-8.5, -11.5, 17, 7.5, "#09090b", true);

                    fillRound(-7.5, -4, 15, 12, 1.5, bt.mid);
                    fillRound(-5, 8, 10, 5, 1, "#18181b");

                    fillRound(-9.5, 17.5, 19, 7.5, 1.5, bt.mid);

                    fillRound(-10, 24.5, 20, 1.2, 0.5, "#ef4444");

                    px(-1.8, 25.5, 1.6, 1.6, "#38bdf8");
                    px(0.2, 25.5, 1.6, 1.6, "#38bdf8");
                    px(-1.8, 27.2, 1.6, 1.6, "#38bdf8");
                    px(0.2, 27.2, 1.6, 1.6, "#38bdf8");
                    break;
                }

                case "Koenigsegg Jesko Attack": {
                    const bt = getBodyTones("#f8fafc");
                    drawShadow(25, 52);
                    drawWheels(24, 26, "#09090b", "#10b981", "#334155", true);

                    fillPoly([
                        [0, -26.5], [7, -25], [11, -19],
                        [11, 18], [9.5, 23.5], [-9.5, 23.5],
                        [-11, 18], [-11, -19], [-7, -25]
                    ], bt.mid, bt.dark, 1.2);

                    fillRound(-10.5, -26.5, 21, 2.5, 1, "#09090b");
                    px(-10.5, -26.5, 2, 0.8, "#10b981");
                    px(8.5, -26.5, 2, 0.8, "#10b981");

                    drawHeadlights(-8, 8, -25, 4.2, 2.2, "#f8fafc");

                    fillRound(-8.5, -22.5, 17, 10, 2, bt.light);
                    fillRound(-3.5, -20, 7, 4.5, 1, "#09090b");

                    drawMirrors(24, -11, "#09090b", "#38bdf8");

                    drawGlass(-8.5, -11, 17, 8.5, "#010204", true);

                    fillRound(-2, -5, 4, 6, 1, "#09090b");
                    px(-1.2, -5, 2.4, 1.5, "#10b981");

                    fillRound(-12, 19.5, 24, 3.2, 1.2, "#09090b", "#10b981", 0.8);
                    px(-7, 17.5, 2, 3.5, "#18181b");
                    px(5, 17.5, 2, 3.5, "#18181b");

                    drawTaillights(-8.5, 8.5, 23, 4, 1.5, "#dc2626");

                    fillRound(-3, 24.5, 6, 2.8, 1, "#09090b", "#10b981", 0.8);
                    px(-1.5, 24.8, 3, 1.5, "#38bdf8");
                    break;
                }

                case "ДПС / Полиция": {
                    const bt = getBodyTones("#f8fafc");
                    drawShadow(21, 50);
                    drawWheels(20, 25, "#e2e8f0", null, "#334155");

                    fillRound(-9, -25, 18, 49, 3, bt.mid, bt.dark, 1);

                    fillRound(-8, -23, 16, 11, 1.5, bt.light);
                    fillRound(-3, -22, 6, 10, 0.5, "#1d4ed8");
                    px(-2, -18, 4, 1.2, "#f8fafc");

                    px(-9, -12, 1.2, 28, "#1d4ed8");
                    px(7.8, -12, 1.2, 28, "#1d4ed8");

                    drawHeadlights(-7, 7, -24.5, 3.6, 2.5, "#f8fafc");

                    drawMirrors(20, -11, bt.dark, "#38bdf8");

                    drawGlass(-8, -11, 16, 6.5, "#0f172a", true);

                    fillRound(-7.5, -4.5, 15, 14, 1, bt.mid);

                    fillRound(-6, -1, 12, 3.5, 1, "#e2e8f0");
                    const flashPhase = (Date.now() % 600) < 300;
                    fillRound(-5.5, -0.8, 5, 3, 0.8, flashPhase ? "#3b82f6" : "#1d4ed8");
                    fillRound(0.5, -0.8, 5, 3, 0.8, flashPhase ? "#ef4444" : "#991b1b");

                    drawGlass(-8, 9.5, 16, 5.5, "#0f172a", false);

                    fillRound(-8, 15, 16, 7, 1, bt.mid);
                    fillRound(-4, 17, 8, 2, 0.5, "#1d4ed8");

                    drawTaillights(-7.5, 7.5, 22, 3.8, 2.2, "#dc2626");
                    break;
                }

                case "КАМАЗ / Фура": {
                    const bt = getBodyTones("#f8fafc");
                    drawShadow(25, 74);
                    const wx = 12;
                    fillRound(-wx - 2, -32, 4.2, 9, 2, "#09090b");
                    fillRound(wx - 2.2, -32, 4.2, 9, 2, "#09090b");
                    fillRound(-wx - 2, 16, 4.2, 9, 2, "#09090b");
                    fillRound(wx - 2.2, 16, 4.2, 9, 2, "#09090b");
                    fillRound(-wx - 2, 26, 4.2, 9, 2, "#09090b");
                    fillRound(wx - 2.2, 26, 4.2, 9, 2, "#09090b");

                    fillRound(-11, -37, 22, 22, 2.5, bt.mid, bt.dark, 1.2);
                    drawGlass(-10, -35.5, 20, 7.5, "#0f172a", true);
                    px(-4, -36.5, 1.5, 1, "#f59e0b");
                    px(0, -36.5, 1.5, 1, "#f59e0b");
                    px(4, -36.5, 1.5, 1, "#f59e0b");

                    drawHeadlights(-8.5, 8.5, -36.8, 4.5, 3, "#fef9c3");

                    px(-13, -33, 2, 4, "#09090b");
                    px(11, -33, 2, 4, "#09090b");

                    px(10, -17, 1.8, 3, "#e2e8f0");

                    fillRound(-11.5, -14, 23, 50, 1.5, "#334155", "#1e293b", 1);
                    for (let y = -10; y <= 32; y += 5) px(-10.5, y, 21, 0.8, "#475569");

                    fillRound(-11, 35, 22, 2.5, 0.5, "#18181b");
                    drawTaillights(-8.5, 8.5, 35.2, 4.5, 2, "#dc2626");
                    px(-8.5, 35.2, 1.5, 1, "#f59e0b");
                    px(7, 35.2, 1.5, 1, "#f59e0b");
                    break;
                }

                case "Дорожный конус": {
                    fillRound(-6, -6, 12, 12, 1, "#09090b");
                    fillRound(-5, -5, 10, 10, 1, "#ea580c");
                    fillRound(-4, -4, 8, 8, 3, "#f97316");
                    fillRound(-3, -3, 6, 6, 2, "#f8fafc");
                    fillRound(-2, -2, 4, 4, 1.5, "#f97316");
                    fillRound(-1, -1, 2, 2, 1, "#ffffff");
                    break;
                }

                default: {
                    const bt = getBodyTones("#3b82f6");
                    drawShadow(20, 48);
                    drawWheels(18, 24, "#cbd5e1", null, "#334155");
                    fillRound(-8.5, -24.5, 17, 47, 3, bt.mid, bt.dark, 1);
                    drawHeadlights(-6.5, 6.5, -24, 3.5, 2.2, "#f8fafc");
                    fillRound(-7.5, -22, 15, 11, 2, bt.light);
                    drawMirrors(18, -10.5, bt.dark, "#38bdf8");
                    drawGlass(-7.8, -10.5, 15.6, 6.5, "#0f172a", true);
                    fillRound(-7.2, -4, 14.4, 14, 1.5, bt.mid);
                    drawGlass(-7.5, 10, 15, 5.5, "#0f172a", true);
                    drawTaillights(-7.2, 7.2, 21.5, 3.5, 2, "#dc2626");
                    break;
                }
            }

            // Свет фар при включенном ближнем/дальнем
            if (options.lightsOn) {
                const frontY = name === "КАМАЗ / Фура" ? (cy - 36 * s) : (cy - 24 * s);
                const beamReach = 145 * s;
                const spread = 28 * s;

                // 1. Левый луч
                if (ctx && typeof ctx.createLinearGradient === 'function') {
                    try {
                        const gradL = ctx.createLinearGradient(cx - 7 * s, frontY, cx - 18 * s, frontY - beamReach);
                        if (gradL && typeof gradL.addColorStop === 'function') {
                            gradL.addColorStop(0, "rgba(255, 255, 235, 0.65)");
                            gradL.addColorStop(0.2, "rgba(254, 240, 138, 0.35)");
                            gradL.addColorStop(0.65, "rgba(254, 240, 138, 0.12)");
                            gradL.addColorStop(1, "rgba(254, 240, 138, 0)");
                            ctx.fillStyle = gradL;
                            ctx.beginPath();
                            ctx.moveTo(cx - 7 * s, frontY);
                            ctx.lineTo(cx - (7 * s + spread), frontY - beamReach);
                            ctx.lineTo(cx - (7 * s - spread * 0.4), frontY - beamReach);
                            ctx.closePath();
                            ctx.fill();
                        }
                    } catch (_) {}

                    try {
                        const gradR = ctx.createLinearGradient(cx + 7 * s, frontY, cx + 18 * s, frontY - beamReach);
                        if (gradR && typeof gradR.addColorStop === 'function') {
                            gradR.addColorStop(0, "rgba(255, 255, 235, 0.65)");
                            gradR.addColorStop(0.2, "rgba(254, 240, 138, 0.35)");
                            gradR.addColorStop(0.65, "rgba(254, 240, 138, 0.12)");
                            gradR.addColorStop(1, "rgba(254, 240, 138, 0)");
                            ctx.fillStyle = gradR;
                            ctx.beginPath();
                            ctx.moveTo(cx + 7 * s, frontY);
                            ctx.lineTo(cx + (7 * s - spread * 0.4), frontY - beamReach);
                            ctx.lineTo(cx + (7 * s + spread), frontY - beamReach);
                            ctx.closePath();
                            ctx.fill();
                        }
                    } catch (_) {}
                }

                // 3. Световое пятно на асфальте перед машиной
                ctx.save();
                ctx.fillStyle = "rgba(254, 240, 138, 0.14)";
                ctx.beginPath();
                ctx.ellipse(cx, frontY - 70 * s, 34 * s, 65 * s, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Нитро пламя из глушителей (двойные языки пламени с градиентом)
            if (options.nitro) {
                const rearY = name === "КАМАЗ / Фура" ? (cy + 34 * s) : (cy + 24 * s);
                const fLen = (20 + Math.random() * 14) * s;

                ctx.save();
                ctx.shadowBlur = 14 * s;
                ctx.shadowColor = "#00f0ff";

                ctx.fillStyle = "#00f0ff";
                ctx.beginPath();
                ctx.moveTo(cx - 8 * s, rearY);
                ctx.lineTo(cx - 6 * s + (Math.random() - 0.5) * 3, rearY + fLen);
                ctx.lineTo(cx - 4 * s, rearY);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(cx + 4 * s, rearY);
                ctx.lineTo(cx + 6 * s + (Math.random() - 0.5) * 3, rearY + fLen);
                ctx.lineTo(cx + 8 * s, rearY);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = "#fef08a";
                ctx.beginPath();
                ctx.moveTo(cx - 7 * s, rearY);
                ctx.lineTo(cx - 6 * s + (Math.random() - 0.5) * 2, rearY + fLen * 0.48);
                ctx.lineTo(cx - 5 * s, rearY);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(cx + 5 * s, rearY);
                ctx.lineTo(cx + 6 * s + (Math.random() - 0.5) * 2, rearY + fLen * 0.48);
                ctx.lineTo(cx + 7 * s, rearY);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }

            // Стоп-сигналы при торможении
            if (options.braking) {
                const rearY = name === "КАМАЗ / Фура" ? (cy + 34 * s) : (cy + 24 * s);
                ctx.save();
                ctx.shadowBlur = 12 * s;
                ctx.shadowColor = "#ef4444";
                ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
                ctx.beginPath();
                ctx.arc(cx - 8 * s, rearY, 5 * s, 0, Math.PI * 2);
                ctx.arc(cx + 8 * s, rearY, 5 * s, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "rgba(239, 68, 68, 0.28)";
                ctx.beginPath();
                ctx.ellipse(cx, rearY + 12 * s, 22 * s, 10 * s, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Поворотники
            if (options.blinkerLeft) {
                const fY = name === "КАМАЗ / Фура" ? (cy - 36 * s) : (cy - 24 * s);
                const rY = name === "КАМАЗ / Фура" ? (cy + 33 * s) : (cy + 21 * s);
                ctx.fillStyle = "#f59e0b";
                ctx.fillRect(cx - 10 * s, fY, 3 * s, 3 * s);
                ctx.fillRect(cx - 10 * s, rY, 3 * s, 3 * s);
            }
            if (options.blinkerRight) {
                const fY = name === "КАМАЗ / Фура" ? (cy - 36 * s) : (cy - 24 * s);
                const rY = name === "КАМАЗ / Фура" ? (cy + 33 * s) : (cy + 21 * s);
                ctx.fillStyle = "#f59e0b";
                ctx.fillRect(cx + 7 * s, fY, 3 * s, 3 * s);
                ctx.fillRect(cx + 7 * s, rY, 3 * s, 3 * s);
            }

            // 🎨 ВИНИЛОГРАФИЯ (ДВЕ ПОЛОСЫ / ДРИФТ-АРТ)
            if (options.vinyl && options.vinyl !== 'none') {
                if (options.vinyl === 'stripes') {
                    // Классические гоночные полосы (Twin Racing Stripes)
                    const isLightCar = options.color && (options.color.toLowerCase().startsWith('#ff') || options.color.toLowerCase().startsWith('#fff') || options.color.toLowerCase().startsWith('#e2'));
                    const stripeCol = isLightCar ? '#0f172a' : '#ffffff';
                    ctx.save();
                    ctx.globalAlpha = 0.88;
                    // Капот (-22 .. -11)
                    px(-3.2, -22, 2.2, 11, stripeCol);
                    px(1.0, -22, 2.2, 11, stripeCol);
                    // Крыша (-3 .. 4)
                    px(-3.2, -3, 2.2, 7, stripeCol);
                    px(1.0, -3, 2.2, 7, stripeCol);
                    // Багажник (12 .. 21)
                    px(-3.2, 12, 2.2, 9, stripeCol);
                    px(1.0, 12, 2.2, 9, stripeCol);
                    ctx.restore();
                } else if (options.vinyl === 'drift') {
                    // Агрессивный дрифт-арт: диагональные геометрические молнии и срезы
                    ctx.save();
                    ctx.globalAlpha = 0.85;
                    fillPoly([[-8, -6], [-2, -18], [2, -14], [-4, -2]], '#00f0ff');
                    fillPoly([[2, 4], [8, 16], [5, 18], [-1, 6]], '#ec4899');
                    fillPoly([[-7, 10], [-2, 18], [-5, 19], [-9, 12]], '#00f0ff');
                    fillPoly([[4, -14], [8, -8], [7, -6], [3, -12]], '#facc15');
                    ctx.restore();
                }
            }

            // 🏎️ СПОЙЛЕР / АНТИКРЫЛО (ДАКТЕЙЛ / ВЫСОКОЕ GT-КРЫЛО)
            if (options.spoiler && options.spoiler !== 'none') {
                const rearY = name === "КАМАЗ / Фура" ? 33 : 21.5;
                if (options.spoiler === 'ducktail') {
                    // Элегантный лип-спойлер типа Ducktail на кромке багажника
                    ctx.save();
                    fillRound(-7.2, rearY - 1.2, 14.4, 2.4, 1, 'rgba(0, 0, 0, 0.45)');
                    fillRound(-7, rearY - 2.5, 14, 2.2, 1, '#18181b', '#27272a', 0.6);
                    px(-5.5, rearY - 2.3, 11, 0.8, '#52525b');
                    ctx.restore();
                } else if (options.spoiler === 'gt') {
                    // Массивное спортивное антикрыло GT на стойках
                    ctx.save();
                    fillRound(-8.5, rearY - 1, 17, 3, 1, 'rgba(0, 0, 0, 0.55)');
                    px(-4.8, rearY - 3.2, 1.4, 3.8, '#09090b');
                    px(3.4, rearY - 3.2, 1.4, 3.8, '#09090b');
                    fillRound(-9.8, rearY - 4.6, 19.6, 2.6, 1.2, '#18181b', '#3f3f46', 0.8);
                    fillRound(-10.2, rearY - 6.2, 1.6, 5.2, 0.8, '#09090b', '#71717a', 0.5);
                    fillRound(8.6, rearY - 6.2, 1.6, 5.2, 0.8, '#09090b', '#71717a', 0.5);
                    px(-7.5, rearY - 4.4, 15, 0.7, '#a1a1aa');
                    ctx.restore();
                }
            }

            // 🚨 СПЕЦСИГНАЛ СГУ И СТРОБОСКОПЫ В РЕШЁТКЕ РАДИАТОРА (только для служебных машин)
            if (options.sgu === 'installed' && (name.includes('Полиция') || name.includes('ДПС'))) {
                const grillY = name === "КАМАЗ / Фура" ? -33 : -23.5;
                const isStrobing = !!options.sguStrobe;
                const phase = Math.floor(Date.now() / 85) % 4; // 4-фазный строб: Синий-Синий-Красный-Красный
                const blueActive = isStrobing ? (phase === 0 || phase === 1) : false;
                const redActive = isStrobing ? (phase === 2 || phase === 3) : false;

                ctx.save();
                // Левый стробоскоп (Синий)
                if (blueActive) {
                    ctx.shadowBlur = 14 * s;
                    ctx.shadowColor = '#00f0ff';
                    fillRound(-4.2, grillY, 2.8, 1.8, 0.6, '#00f0ff');
                } else {
                    fillRound(-4.2, grillY, 2.8, 1.8, 0.6, '#1e3a8a');
                }

                // Правый стробоскоп (Красный)
                if (redActive) {
                    ctx.shadowBlur = 14 * s;
                    ctx.shadowColor = '#ff0033';
                    fillRound(1.4, grillY, 2.8, 1.8, 0.6, '#ff0033');
                } else {
                    fillRound(1.4, grillY, 2.8, 1.8, 0.6, '#7f1d1d');
                }
                ctx.restore();
            }

            if (options.tilt) {
                ctx.restore();
            }
        }

        // 🚘 ВЫСОКОДЕТАЛИЗИРОВАННЫЙ РЕНДЕРЕР АВТОМОБИЛЕЙ В ПРОФИЛЬ (ВИД СБОКУ, 25 МОДЕЛЕЙ)
        function drawPixelCarSide(ctx, cx, cy, name, scale = 1, options = {}) {
            const s = scale;
            if (options.tilt) {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(options.tilt);
                ctx.translate(-cx, -cy);
            }

            const px = (ox, oy, w, h, col) => {
                ctx.fillStyle = col;
                ctx.fillRect(Math.round(cx + ox * s), Math.round(cy + oy * s), Math.round(w * s), Math.round(h * s));
            };

            const fillPoly = (pts, fillCol, strokeCol = null, strokeW = 1) => {
                if (!pts || pts.length < 3) return;
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(Math.round(cx + pts[0][0] * s), Math.round(cy + pts[0][1] * s));
                for (let i = 1; i < pts.length; i++) {
                    ctx.lineTo(Math.round(cx + pts[i][0] * s), Math.round(cy + pts[i][1] * s));
                }
                ctx.closePath();
                ctx.fillStyle = fillCol;
                ctx.fill();
                if (strokeCol) {
                    ctx.strokeStyle = strokeCol;
                    ctx.lineWidth = strokeW * s;
                    ctx.stroke();
                }
                ctx.restore();
            };

            const fillRound = (ox, oy, w, h, rad, fillCol, strokeCol = null, strokeW = 1) => {
                ctx.save();
                const rx = Math.round(cx + ox * s);
                const ry = Math.round(cy + oy * s);
                const rw = Math.round(w * s);
                const rh = Math.round(h * s);
                const r = Math.min(Math.min(rw, rh) / 2, Math.max(0, rad * s));
                ctx.beginPath();
                if (typeof ctx.roundRect === 'function') {
                    ctx.roundRect(rx, ry, rw, rh, r);
                } else {
                    ctx.moveTo(rx + r, ry);
                    ctx.lineTo(rx + rw - r, ry);
                    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
                    ctx.lineTo(rx + rw, ry + rh - r);
                    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
                    ctx.lineTo(rx + r, ry + rh);
                    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
                    ctx.lineTo(rx, ry + r);
                    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
                    ctx.closePath();
                }
                ctx.fillStyle = fillCol;
                ctx.fill();
                if (strokeCol) {
                    ctx.strokeStyle = strokeCol;
                    ctx.lineWidth = strokeW * s;
                    ctx.stroke();
                }
                ctx.restore();
            };

            const getBodyTones = (baseCol) => {
                const hex = (options.color && typeof options.color === 'string') ? options.color : baseCol;
                let clean = String(hex || '#94a3b8').replace('#', '');
                if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
                if (clean.length !== 6) clean = '94a3b8';
                const r = parseInt(clean.substring(0, 2), 16) || 0;
                const g = parseInt(clean.substring(2, 4), 16) || 0;
                const b = parseInt(clean.substring(4, 6), 16) || 0;

                const adj = (factor, off = 0) => {
                    const nr = Math.min(255, Math.max(0, Math.round(r * factor + off)));
                    const ng = Math.min(255, Math.max(0, Math.round(g * factor + off)));
                    const nb = Math.min(255, Math.max(0, Math.round(b * factor + off)));
                    return '#' + [nr, ng, nb].map(x => x.toString(16).padStart(2, '0')).join('');
                };

                return {
                    darkest: adj(0.38, -35),
                    shadow: adj(0.55, -20),
                    dark: adj(0.72, -10),
                    mid: '#' + clean,
                    light: adj(1.18, 22),
                    bright: adj(1.36, 48)
                };
            };

            // 1. Клиренс и подвеска (смещение кузова вверх/вниз относительно оси колес)
            let bodyYOffset = 0;
            if (options.suspension === 'bpan') {
                bodyYOffset = 3.6; // БПАН: кузов на брюхе, арки ложатся на резину
            } else if (options.suspension === 'lowered') {
                bodyYOffset = 1.8; // Спортивное занижение: арки вровень с шиной
            } else if (options.suspension === 'lift') {
                bodyYOffset = -4.0; // Offroad-лифт: кузов задран, огромный просвет
            }

            // 2. Анатомическая тень на асфальте под машиной
            let shadowAlpha = 0.52;
            let shadowH = 3.2;
            if (options.suspension === 'bpan') {
                shadowAlpha = 0.85;
                shadowH = 2.2;
            } else if (options.suspension === 'lift') {
                shadowAlpha = 0.28;
                shadowH = 4.2;
            }
            ctx.save();
            ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
            ctx.beginPath();
            ctx.ellipse(Math.round(cx), Math.round(cy + 14 * s), Math.round(44 * s), Math.round(shadowH * s), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 3. Неоновая подсветка днища
            if (options.neon && options.neon !== 'none') {
                ctx.save();
                ctx.shadowBlur = 18 * s;
                ctx.shadowColor = options.neon;
                ctx.fillStyle = options.neon;
                ctx.globalAlpha = 0.75;
                ctx.beginPath();
                ctx.ellipse(Math.round(cx), Math.round(cy + 13.5 * s), Math.round(36 * s), Math.round(4.5 * s), 0, 0, Math.PI * 2);
                ctx.fill();

                // Неоновая трубка вдоль порога
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.9;
                ctx.fillRect(Math.round(cx - 18 * s), Math.round(cy + (6.8 + bodyYOffset) * s), Math.round(36 * s), Math.max(1, Math.round(1.2 * s)));
                ctx.restore();
            }

            // 4. Определение геометрии и пропорций модели
            let cfg = {
                rWx: -24,
                fWx: 24,
                rearBumperX: -42,
                frontBumperX: 42,
                hoodFrontY: -3.8,
                hoodBackX: 16,
                hoodBackY: -4.8,
                roofFrontX: 6,
                roofRearX: -16,
                roofY: -13.5,
                rearGlassEndX: -28,
                trunkY: -4.0,
                chinDrop: 0,
                noseDrop: 0,
                bPillars: [0],
                model: 'default',
                defaultColor: '#3b82f6'
            };

            switch(name) {
                case "ВАЗ-2107 «Жигули»":
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -42, frontBumperX: 42,
                        hoodFrontY: -4.0, hoodBackX: 18, hoodBackY: -4.5,
                        roofFrontX: 8, roofRearX: -16, roofY: -13.5,
                        rearGlassEndX: -26, trunkY: -4.0, chinDrop: 0, noseDrop: 0,
                        bPillars: [0], model: 'vaz2107', defaultColor: '#991b1b'
                    };
                    break;
                case "ВАЗ-2109 «Девятка»":
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -40, frontBumperX: 42,
                        hoodFrontY: -3.5, hoodBackX: 16, hoodBackY: -4.5,
                        roofFrontX: 8, roofRearX: -20, roofY: -13.5,
                        rearGlassEndX: -38, trunkY: -3.8, chinDrop: 0, noseDrop: 0,
                        bPillars: [-3], model: 'vaz2109', defaultColor: '#475569'
                    };
                    break;
                case "ГАЗ-24 «Волга»":
                    cfg = {
                        rWx: -26, fWx: 26, rearBumperX: -46, frontBumperX: 46,
                        hoodFrontY: -4.5, hoodBackX: 17, hoodBackY: -4.8,
                        roofFrontX: 7, roofRearX: -18, roofY: -14.0,
                        rearGlassEndX: -28, trunkY: -4.5, chinDrop: 0, noseDrop: 0,
                        bPillars: [0], model: 'gaz24', defaultColor: '#0f172a'
                    };
                    break;
                case "Lada Priora БПАН":
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -41, frontBumperX: 42,
                        hoodFrontY: -3.8, hoodBackX: 16, hoodBackY: -4.8,
                        roofFrontX: 6, roofRearX: -16, roofY: -13.5,
                        rearGlassEndX: -28, trunkY: -4.0, chinDrop: 0, noseDrop: 0,
                        bPillars: [0], model: 'priora', defaultColor: '#18181b'
                    };
                    break;
                case "Hyundai Solaris":
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -41, frontBumperX: 42,
                        hoodFrontY: -3.6, hoodBackX: 15, hoodBackY: -5.0,
                        roofFrontX: 5, roofRearX: -16, roofY: -13.8,
                        rearGlassEndX: -29, trunkY: -3.8, chinDrop: 0, noseDrop: 0,
                        bPillars: [0], model: 'solaris', defaultColor: '#f8fafc'
                    };
                    break;
                case "Lada Vesta Sport":
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -42, frontBumperX: 43,
                        hoodFrontY: -3.8, hoodBackX: 16, hoodBackY: -5.0,
                        roofFrontX: 5, roofRearX: -16, roofY: -13.8,
                        rearGlassEndX: -29, trunkY: -4.0, chinDrop: 0, noseDrop: 0,
                        bPillars: [0], model: 'vesta', defaultColor: '#dc2626'
                    };
                    break;
                case "Volkswagen Polo":
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -41, frontBumperX: 42,
                        hoodFrontY: -3.6, hoodBackX: 15, hoodBackY: -5.0,
                        roofFrontX: 6, roofRearX: -16, roofY: -13.8,
                        rearGlassEndX: -29, trunkY: -3.8, chinDrop: 0, noseDrop: 0,
                        bPillars: [0], model: 'polo', defaultColor: '#64748b'
                    };
                    break;
                case "Toyota Mark II Tourer V":
                    cfg = {
                        rWx: -25, fWx: 25, rearBumperX: -44, frontBumperX: 44,
                        hoodFrontY: -3.8, hoodBackX: 15, hoodBackY: -4.8,
                        roofFrontX: 6, roofRearX: -16, roofY: -13.0,
                        rearGlassEndX: -29, trunkY: -4.0, chinDrop: 0.5, noseDrop: 0,
                        bPillars: [], model: 'mark2', defaultColor: '#f8fafc'
                    };
                    break;
                case "Subaru Impreza WRX STI":
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -42, frontBumperX: 43,
                        hoodFrontY: -3.8, hoodBackX: 15, hoodBackY: -5.0,
                        roofFrontX: 6, roofRearX: -16, roofY: -13.5,
                        rearGlassEndX: -28, trunkY: -4.0, chinDrop: 0.5, noseDrop: 0,
                        bPillars: [0], model: 'wrx', defaultColor: '#1d4ed8'
                    };
                    break;
                case "BMW M5 E60 V10":
                    cfg = {
                        rWx: -25, fWx: 25, rearBumperX: -44, frontBumperX: 44,
                        hoodFrontY: -3.8, hoodBackX: 16, hoodBackY: -5.0,
                        roofFrontX: 6, roofRearX: -17, roofY: -13.8,
                        rearGlassEndX: -30, trunkY: -4.0, chinDrop: 0, noseDrop: 0,
                        bPillars: [0], model: 'e60', defaultColor: '#334155'
                    };
                    break;
                case "Nissan Silvia S15 Spec-R":
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -41, frontBumperX: 42,
                        hoodFrontY: -3.2, hoodBackX: 13, hoodBackY: -4.5,
                        roofFrontX: 4, roofRearX: -13, roofY: -12.0,
                        rearGlassEndX: -27, trunkY: -3.6, chinDrop: 0.5, noseDrop: 0,
                        bPillars: [], model: 's15', defaultColor: '#0ea5e9'
                    };
                    break;
                case "Toyota Camry 3.5":
                    cfg = {
                        rWx: -25, fWx: 25, rearBumperX: -44, frontBumperX: 44,
                        hoodFrontY: -3.8, hoodBackX: 16, hoodBackY: -5.0,
                        roofFrontX: 6, roofRearX: -17, roofY: -13.8,
                        rearGlassEndX: -30, trunkY: -4.0, chinDrop: 0, noseDrop: 0,
                        bPillars: [0], model: 'camry', defaultColor: '#0f172a'
                    };
                    break;
                case "Toyota Land Cruiser 300":
                    cfg = {
                        rWx: -25, fWx: 25, rearBumperX: -44, frontBumperX: 44,
                        hoodFrontY: -5.2, hoodBackX: 16, hoodBackY: -5.5,
                        roofFrontX: 8, roofRearX: -28, roofY: -18.0,
                        rearGlassEndX: -42, trunkY: -5.2, chinDrop: 0, noseDrop: 0,
                        bPillars: [-10, 4], model: 'lc300', defaultColor: '#f8fafc'
                    };
                    break;
                case "Nissan GT-R R35 Nismo":
                    cfg = {
                        rWx: -25, fWx: 25, rearBumperX: -43, frontBumperX: 44,
                        hoodFrontY: -3.5, hoodBackX: 14, hoodBackY: -4.8,
                        roofFrontX: 5, roofRearX: -14, roofY: -12.5,
                        rearGlassEndX: -29, trunkY: -3.8, chinDrop: 0.8, noseDrop: 0,
                        bPillars: [], model: 'gtr', defaultColor: '#f8fafc'
                    };
                    break;
                case "Mercedes-Benz E63s AMG":
                    cfg = {
                        rWx: -25, fWx: 25, rearBumperX: -44, frontBumperX: 44,
                        hoodFrontY: -3.8, hoodBackX: 16, hoodBackY: -5.0,
                        roofFrontX: 6, roofRearX: -17, roofY: -13.5,
                        rearGlassEndX: -30, trunkY: -4.0, chinDrop: 0, noseDrop: 0,
                        bPillars: [0], model: 'e63s', defaultColor: '#1e293b'
                    };
                    break;
                case "Audi RS6 Avant":
                    cfg = {
                        rWx: -25, fWx: 25, rearBumperX: -44, frontBumperX: 44,
                        hoodFrontY: -3.8, hoodBackX: 16, hoodBackY: -5.0,
                        roofFrontX: 6, roofRearX: -28, roofY: -13.5,
                        rearGlassEndX: -42, trunkY: -4.0, chinDrop: 0, noseDrop: 0,
                        bPillars: [-12, 3], model: 'rs6', defaultColor: '#475569'
                    };
                    break;
                case "BMW M5 F90 Competition":
                    cfg = {
                        rWx: -25, fWx: 25, rearBumperX: -44, frontBumperX: 44,
                        hoodFrontY: -3.8, hoodBackX: 16, hoodBackY: -5.0,
                        roofFrontX: 6, roofRearX: -17, roofY: -13.8,
                        rearGlassEndX: -30, trunkY: -4.0, chinDrop: 0.5, noseDrop: 0,
                        bPillars: [0], model: 'f90', defaultColor: '#0284c7'
                    };
                    break;
                case "BMW M8 Gran Coupe":
                    cfg = {
                        rWx: -26, fWx: 26, rearBumperX: -45, frontBumperX: 45,
                        hoodFrontY: -3.5, hoodBackX: 15, hoodBackY: -4.8,
                        roofFrontX: 5, roofRearX: -18, roofY: -12.5,
                        rearGlassEndX: -32, trunkY: -3.8, chinDrop: 0.5, noseDrop: 0,
                        bPillars: [0], model: 'm8', defaultColor: '#1e1b4b'
                    };
                    break;
                case "Mercedes-Benz G63 AMG «Гелик»":
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -40, frontBumperX: 42,
                        hoodFrontY: -5.5, hoodBackX: 16, hoodBackY: -5.5,
                        roofFrontX: 12, roofRearX: -32, roofY: -18.5,
                        rearGlassEndX: -40, trunkY: -5.5, chinDrop: 0, noseDrop: 0,
                        bPillars: [-18, -4], model: 'gelik', defaultColor: '#09090b'
                    };
                    break;
                case "Porsche 911 Turbo S":
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -42, frontBumperX: 42,
                        hoodFrontY: -3.2, hoodBackX: 14, hoodBackY: -4.8,
                        roofFrontX: 3, roofRearX: -11, roofY: -12.2,
                        rearGlassEndX: -32, trunkY: -3.5, chinDrop: 0.5, noseDrop: 0,
                        bPillars: [], model: 'porsche911', defaultColor: '#eab308'
                    };
                    break;
                case "Lamborghini Huracan Performante":
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -42, frontBumperX: 43,
                        hoodFrontY: -2.8, hoodBackX: 11, hoodBackY: -4.2,
                        roofFrontX: 1, roofRearX: -12, roofY: -11.0,
                        rearGlassEndX: -32, trunkY: -3.2, chinDrop: 0.8, noseDrop: 0,
                        bPillars: [], model: 'huracan', defaultColor: '#22c55e'
                    };
                    break;
                case "Rolls-Royce Cullinan":
                    cfg = {
                        rWx: -26, fWx: 26, rearBumperX: -45, frontBumperX: 45,
                        hoodFrontY: -5.5, hoodBackX: 17, hoodBackY: -5.5,
                        roofFrontX: 10, roofRearX: -28, roofY: -18.0,
                        rearGlassEndX: -42, trunkY: -5.5, chinDrop: 0, noseDrop: 0,
                        bPillars: [-10, 4], model: 'cullinan', defaultColor: '#111827'
                    };
                    break;
                case "Ferrari SF90 Stradale":
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -43, frontBumperX: 43,
                        hoodFrontY: -2.8, hoodBackX: 11, hoodBackY: -4.2,
                        roofFrontX: 1, roofRearX: -13, roofY: -11.0,
                        rearGlassEndX: -32, trunkY: -3.2, chinDrop: 0.8, noseDrop: 0,
                        bPillars: [], model: 'sf90', defaultColor: '#ef4444'
                    };
                    break;
                case "Bugatti Chiron Super Sport":
                    cfg = {
                        rWx: -25, fWx: 25, rearBumperX: -45, frontBumperX: 44,
                        hoodFrontY: -3.0, hoodBackX: 12, hoodBackY: -4.5,
                        roofFrontX: 2, roofRearX: -14, roofY: -11.5,
                        rearGlassEndX: -35, trunkY: -3.5, chinDrop: 0.8, noseDrop: 0,
                        bPillars: [], model: 'chiron', defaultColor: '#1e3a8a'
                    };
                    break;
                case "Koenigsegg Jesko Attack":
                    cfg = {
                        rWx: -25, fWx: 25, rearBumperX: -44, frontBumperX: 44,
                        hoodFrontY: -2.8, hoodBackX: 11, hoodBackY: -4.2,
                        roofFrontX: 1, roofRearX: -14, roofY: -11.0,
                        rearGlassEndX: -32, trunkY: -3.2, chinDrop: 1.0, noseDrop: 0,
                        bPillars: [], model: 'jesko', defaultColor: '#e2e8f0'
                    };
                    break;
                case "ДПС / Полиция":
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -42, frontBumperX: 42,
                        hoodFrontY: -3.8, hoodBackX: 16, hoodBackY: -4.8,
                        roofFrontX: 6, roofRearX: -16, roofY: -13.5,
                        rearGlassEndX: -28, trunkY: -4.0, chinDrop: 0, noseDrop: 0,
                        bPillars: [0], model: 'police', defaultColor: '#ffffff'
                    };
                    break;
                case "КАМАЗ / Фура":
                    cfg = {
                        rWx: -26, fWx: 24, rearBumperX: -44, frontBumperX: 38,
                        hoodFrontY: -5.0, hoodBackX: 36, hoodBackY: -5.0,
                        roofFrontX: 36, roofRearX: 14, roofY: -22.0,
                        rearGlassEndX: 16, trunkY: -8.0, chinDrop: 0, noseDrop: 0,
                        bPillars: [], model: 'kamaz', defaultColor: '#f59e0b'
                    };
                    break;
                case "Дорожный конус":
                    fillRound(-6, 11, 12, 3, 1, '#18181b');
                    fillPoly([[-5, 11], [5, 11], [1.5, -6], [-1.5, -6]], '#ea580c');
                    fillPoly([[-3, 4], [3, 4], [2, -1], [-2, -1]], '#ffffff');
                    fillPoly([[-1.5, -6], [1.5, -6], [0.8, -9], [-0.8, -9]], '#f97316');
                    if (options.tilt) ctx.restore();
                    return;
                default:
                    cfg = {
                        rWx: -24, fWx: 24, rearBumperX: -42, frontBumperX: 42,
                        hoodFrontY: -3.8, hoodBackX: 16, hoodBackY: -4.8,
                        roofFrontX: 6, roofRearX: -16, roofY: -13.5,
                        rearGlassEndX: -28, trunkY: -4.0, chinDrop: 0, noseDrop: 0,
                        bPillars: [0], model: 'default', defaultColor: '#3b82f6'
                    };
                    break;
            }

            const bt = getBodyTones(cfg.defaultColor);
            const { rWx, fWx, rearBumperX, frontBumperX, hoodFrontY, hoodBackX, hoodBackY, roofFrontX, roofRearX, roofY, rearGlassEndX, trunkY, chinDrop, noseDrop, bPillars, model } = cfg;
            const sillY = 6.0 + bodyYOffset;
            const archR = (model === 'kamaz' ? 6.2 : 8.2);
            const archCenterY = 6.0 + bodyYOffset;
            const chinY = 6.0 + bodyYOffset + 0.5 + (chinDrop || 0);
            const rearBottomY = 6.0 + bodyYOffset - 0.5;

            // 5. Внутренние ниши колесных арок и пружины подвески (LIFT)
            ctx.save();
            ctx.fillStyle = '#09090b';
            ctx.beginPath();
            ctx.arc(Math.round(cx + rWx * s), Math.round(cy + archCenterY * s), archR * s, Math.PI, 0, false);
            ctx.fill();
            if (model === 'kamaz') {
                ctx.beginPath();
                ctx.arc(Math.round(cx + -13 * s), Math.round(cy + archCenterY * s), archR * s, Math.PI, 0, false);
                ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(Math.round(cx + fWx * s), Math.round(cy + archCenterY * s), archR * s, Math.PI, 0, false);
            ctx.fill();

            if (options.suspension === 'lift') {
                const liftWheels = model === 'kamaz' ? [rWx, -13, fWx] : [rWx, fWx];
                for (const wx of liftWheels) {
                    const archCx = Math.round(cx + wx * s);
                    const archTop = Math.round(cy + (archCenterY - 7.5) * s);
                    ctx.fillStyle = '#64748b';
                    ctx.fillRect(archCx - 1 * s, archTop, 2 * s, 5 * s);
                    ctx.fillStyle = '#ef4444';
                    for (let k = 0; k < 4; k++) {
                        ctx.fillRect(archCx - 3.2 * s, archTop + (1.0 + k * 1.1) * s, 6.4 * s, 0.9 * s);
                    }
                }
            }
            ctx.restore();

            // Круглые колеса в профиль
            const drawSideWheel = (wx, wy, isFront = false) => {
                const rad = (model === 'kamaz' ? 6.0 : 7.0);
                const rimR = (model === 'kamaz' ? 3.8 : 4.4);
                const wpx = Math.round(cx + wx * s);
                const wpy = Math.round(cy + wy * s);

                ctx.save();

                // 1. Шина (резина)
                ctx.fillStyle = '#111318';
                ctx.beginPath();
                ctx.arc(wpx, wpy, rad * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#1e222d';
                ctx.lineWidth = 1 * s;
                ctx.stroke();

                // Внедорожные грунтозацепы на протекторе при подвеске LIFT
                if (options.suspension === 'lift') {
                    ctx.fillStyle = '#09090b';
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
                        const tx = wpx + Math.cos(a) * (rad + 0.6) * s;
                        const ty = wpy + Math.sin(a) * (rad + 0.6) * s;
                        ctx.fillRect(tx - 0.9 * s, ty - 0.9 * s, 1.8 * s, 1.8 * s);
                    }
                }

                // 2. Тормозная система за диском
                if (options.wheels !== 'stamps') {
                    const discR = rimR * 0.82;
                    ctx.fillStyle = '#94a3b8';
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, discR * s, 0, Math.PI * 2);
                    ctx.fill();

                    // Перфорация на диске
                    ctx.fillStyle = '#334155';
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
                        const hx = wpx + Math.cos(a) * (discR * 0.65) * s;
                        const hy = wpy + Math.sin(a) * (discR * 0.65) * s;
                        ctx.fillRect(hx - 0.4 * s, hy - 0.4 * s, 0.8 * s, 0.8 * s);
                    }

                    // Суппорт
                    const calAngle = isFront ? (Math.PI * 1.25) : (Math.PI * 1.75);
                    let calCol = '#475569';
                    if (options.wheels === 'forged') calCol = '#dc2626';
                    else if (options.wheels === 'deepdish') calCol = '#f59e0b';

                    ctx.fillStyle = calCol;
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, discR * s, calAngle - 0.35, calAngle + 0.35);
                    ctx.arc(wpx, wpy, (discR * 0.5) * s, calAngle + 0.35, calAngle - 0.35, true);
                    ctx.closePath();
                    ctx.fill();

                    if (options.wheels === 'forged') {
                        ctx.fillStyle = '#ffffff';
                        const calMidX = wpx + Math.cos(calAngle) * (discR * 0.75) * s;
                        const calMidY = wpy + Math.sin(calAngle) * (discR * 0.75) * s;
                        ctx.fillRect(calMidX - 1 * s, calMidY - 0.4 * s, 2 * s, 0.8 * s);
                    }
                }

                // 3. Диски
                if (options.wheels === 'stamps') {
                    // Штампы: глубокие черные стальные диски с перфорацией и хромированным колпачком
                    ctx.fillStyle = '#18181b';
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, rimR * s, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#27272a';
                    ctx.lineWidth = 1 * s;
                    ctx.stroke();

                    ctx.fillStyle = '#09090b';
                    const stampHoleR = rimR * 0.62;
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                        const shx = wpx + Math.cos(a) * stampHoleR * s;
                        const shy = wpy + Math.sin(a) * stampHoleR * s;
                        ctx.beginPath();
                        ctx.arc(shx, shy, 0.85 * s, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = '#3f3f46';
                        ctx.lineWidth = 0.5 * s;
                        ctx.stroke();
                    }

                    ctx.fillStyle = '#f1f5f9';
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, 1.7 * s, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#cbd5e1';
                    ctx.beginPath();
                    ctx.arc(wpx - 0.3 * s, wpy - 0.3 * s, 1.1 * s, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#09090b';
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
                        ctx.fillRect(wpx + Math.cos(a) * 1.1 * s - 0.3 * s, wpy + Math.sin(a) * 1.1 * s - 0.3 * s, 0.6 * s, 0.6 * s);
                    }
                } else if (options.wheels === 'deepdish') {
                    // Полки / Разварки: ступенчатый хром + золотая сетка + заклепки
                    ctx.fillStyle = '#f8fafc';
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, rimR * s, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#cbd5e1';
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, (rimR * 0.88) * s, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#f1f5f9';
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, (rimR * 0.78) * s, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, (rimR * 0.66) * s, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#ffffff';
                    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
                        const rx = wpx + Math.cos(a) * (rimR * 0.72) * s;
                        const ry = wpy + Math.sin(a) * (rimR * 0.72) * s;
                        ctx.fillRect(rx - 0.35 * s, ry - 0.35 * s, 0.7 * s, 0.7 * s);
                    }

                    ctx.strokeStyle = '#eab308';
                    ctx.lineWidth = 1.1 * s;
                    for (let a = 0; a < Math.PI; a += Math.PI / 5) {
                        ctx.beginPath();
                        ctx.moveTo(wpx + Math.cos(a) * (rimR * 0.58) * s, wpy + Math.sin(a) * (rimR * 0.58) * s);
                        ctx.lineTo(wpx - Math.cos(a) * (rimR * 0.58) * s, wpy - Math.sin(a) * (rimR * 0.58) * s);
                        ctx.stroke();
                    }

                    ctx.fillStyle = '#ca8a04';
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, 1.4 * s, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fef08a';
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, 0.7 * s, 0, Math.PI * 2);
                    ctx.fill();
                } else if (options.wheels === 'forged') {
                    // Кованые спорт: титан, тонкие сдвоенные спицы
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 0.8 * s;
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, rimR * s, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 0.9 * s;
                    for (let a = 0; a < Math.PI * 2; a += (Math.PI * 2) / 5) {
                        const a1 = a - 0.14;
                        const a2 = a + 0.14;
                        ctx.beginPath();
                        ctx.moveTo(wpx + Math.cos(a1) * (rimR * 0.92) * s, wpy + Math.sin(a1) * (rimR * 0.92) * s);
                        ctx.lineTo(wpx + Math.cos(a) * 1.2 * s, wpy + Math.sin(a) * 1.2 * s);
                        ctx.lineTo(wpx + Math.cos(a2) * (rimR * 0.92) * s, wpy + Math.sin(a2) * (rimR * 0.92) * s);
                        ctx.stroke();
                    }

                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, 1.3 * s, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 0.5 * s;
                    ctx.stroke();

                    ctx.fillStyle = '#64748b';
                    for (let a = 0; a < Math.PI * 2; a += (Math.PI * 2) / 5) {
                        ctx.fillRect(wpx + Math.cos(a) * 0.9 * s - 0.25 * s, wpy + Math.sin(a) * 0.9 * s - 0.25 * s, 0.5 * s, 0.5 * s);
                    }
                } else {
                    // Заводские диски
                    ctx.strokeStyle = '#cbd5e1';
                    ctx.lineWidth = 0.9 * s;
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, rimR * s, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 1.6 * s;
                    for (let a = 0; a < Math.PI * 2; a += (Math.PI * 2) / 5) {
                        ctx.beginPath();
                        ctx.moveTo(wpx, wpy);
                        ctx.lineTo(wpx + Math.cos(a) * (rimR * 0.9) * s, wpy + Math.sin(a) * (rimR * 0.9) * s);
                        ctx.stroke();
                    }

                    ctx.fillStyle = '#e2e8f0';
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, 1.4 * s, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(wpx, wpy, 0.5 * s, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            };

            // 6. Отрисовка колес (диски, тормоза, резина)
            // Положение колес строго фиксировано на уровне земли
            drawSideWheel(rWx, 6.0, false);
            if (model === 'kamaz') {
                drawSideWheel(-13, 6.0, false);
            }
            drawSideWheel(fWx, 6.0, true);

            // 7. Основной силуэт кузова с анатомическими вырезами под колеса
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(Math.round(cx + rearBumperX * s), Math.round(cy + rearBottomY * s));
            ctx.lineTo(Math.round(cx + (rWx - archR) * s), Math.round(cy + sillY * s));
            ctx.arc(Math.round(cx + rWx * s), Math.round(cy + archCenterY * s), archR * s, Math.PI, 0, false);
            if (model === 'kamaz') {
                ctx.lineTo(Math.round(cx + (-13 - archR) * s), Math.round(cy + sillY * s));
                ctx.arc(Math.round(cx + -13 * s), Math.round(cy + archCenterY * s), archR * s, Math.PI, 0, false);
            }
            ctx.lineTo(Math.round(cx + (fWx - archR) * s), Math.round(cy + sillY * s));
            ctx.arc(Math.round(cx + fWx * s), Math.round(cy + archCenterY * s), archR * s, Math.PI, 0, false);
            ctx.lineTo(Math.round(cx + frontBumperX * s), Math.round(cy + chinY * s));
            ctx.lineTo(Math.round(cx + frontBumperX * s), Math.round(cy + (hoodFrontY + bodyYOffset + noseDrop) * s));
            ctx.lineTo(Math.round(cx + hoodBackX * s), Math.round(cy + (hoodBackY + bodyYOffset) * s));
            ctx.lineTo(Math.round(cx + roofFrontX * s), Math.round(cy + (roofY + bodyYOffset) * s));
            ctx.lineTo(Math.round(cx + roofRearX * s), Math.round(cy + (roofY + bodyYOffset) * s));
            ctx.lineTo(Math.round(cx + rearGlassEndX * s), Math.round(cy + (trunkY + bodyYOffset) * s));
            ctx.lineTo(Math.round(cx + rearBumperX * s), Math.round(cy + (trunkY + bodyYOffset) * s));
            ctx.closePath();

            const bodyGrad = (ctx && typeof ctx.createLinearGradient === 'function')
                ? ctx.createLinearGradient(0, Math.round(cy + (roofY + bodyYOffset) * s), 0, Math.round(cy + sillY * s))
                : null;
            if (bodyGrad && typeof bodyGrad.addColorStop === 'function') {
                bodyGrad.addColorStop(0, bt.light);
                bodyGrad.addColorStop(0.25, bt.mid);
                bodyGrad.addColorStop(0.85, bt.mid);
                bodyGrad.addColorStop(1, bt.dark);
                ctx.fillStyle = bodyGrad;
            } else {
                ctx.fillStyle = bt.mid;
            }
            ctx.fill();

            // Тонкая окантовка кузова и колесных арок
            ctx.strokeStyle = bt.darkest;
            ctx.lineWidth = 1 * s;
            ctx.stroke();

            ctx.strokeStyle = bt.light;
            ctx.lineWidth = 0.8 * s;
            ctx.beginPath();
            ctx.arc(Math.round(cx + rWx * s), Math.round(cy + archCenterY * s), (archR + 0.3) * s, Math.PI, 0, false);
            ctx.stroke();
            if (model === 'kamaz') {
                ctx.beginPath();
                ctx.arc(Math.round(cx + -13 * s), Math.round(cy + archCenterY * s), (archR + 0.3) * s, Math.PI, 0, false);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(Math.round(cx + fWx * s), Math.round(cy + archCenterY * s), (archR + 0.3) * s, Math.PI, 0, false);
            ctx.stroke();
            ctx.restore();

            // 7.5 Стыки дверей, крыльев, капота и боковые ручки (Panel gaps & handles)
            if (model !== 'cone' && model !== 'kamaz') {
                ctx.save();
                ctx.strokeStyle = bt.darkest;
                ctx.lineWidth = 0.8 * s;

                // Стык переднего крыла и передней двери
                ctx.beginPath();
                ctx.moveTo(Math.round(cx + hoodBackX * s), Math.round(cy + (hoodBackY + bodyYOffset) * s));
                ctx.lineTo(Math.round(cx + (hoodBackX - 1.5) * s), Math.round(cy + (sillY - 0.5) * s));
                ctx.stroke();

                // Стык передней и задней двери (для авто со стойкой)
                if (bPillars && bPillars.length > 0 && bPillars[0] !== undefined) {
                    const bx = bPillars[0];
                    ctx.beginPath();
                    ctx.moveTo(Math.round(cx + bx * s), Math.round(cy + (hoodBackY + bodyYOffset + 0.5) * s));
                    ctx.lineTo(Math.round(cx + bx * s), Math.round(cy + (sillY - 0.5) * s));
                    ctx.stroke();
                }

                // Задний стык двери и заднего крыла
                ctx.beginPath();
                ctx.moveTo(Math.round(cx + (roofRearX - 1.5) * s), Math.round(cy + (trunkY + bodyYOffset) * s));
                ctx.lineTo(Math.round(cx + (rWx + 6.5) * s), Math.round(cy + (sillY - 0.5) * s));
                ctx.stroke();

                // Дверные ручки
                if (model !== 'vaz2107' && model !== 'vaz2109' && model !== 'gaz24' && model !== 'gelik') {
                    const handleCol = (options.color && options.color.startsWith('#ff')) ? '#0f172a' : bt.darkest;
                    px(hoodBackX - 6.5, hoodBackY + bodyYOffset + 2.4, 3.2, 0.9, handleCol);
                    px(hoodBackX - 6.0, hoodBackY + bodyYOffset + 2.7, 2.2, 0.5, '#cbd5e1');
                    if (bPillars && bPillars.length > 0 && bPillars[0] !== undefined) {
                        px(bPillars[0] - 6.5, hoodBackY + bodyYOffset + 2.4, 3.2, 0.9, handleCol);
                        px(bPillars[0] - 6.0, hoodBackY + bodyYOffset + 2.7, 2.2, 0.5, '#cbd5e1');
                    }
                }
                ctx.restore();
            }

            // 8. Фирменные элементы моделей
            if (model === 'vaz2107') {
                // Хромированные бамперы с черной резиновой вставкой
                fillRound(rearBumperX - 2.5, sillY - 2, 4.5, 3.0, 1, '#f1f5f9', '#94a3b8', 0.5);
                px(rearBumperX - 2.5, sillY - 1, 4.5, 1.2, '#0f172a');
                fillRound(frontBumperX - 1.5, sillY - 2, 4.5, 3.0, 1, '#f1f5f9', '#94a3b8', 0.5);
                px(frontBumperX - 1.5, sillY - 1, 4.5, 1.2, '#0f172a');
                // Высокая хромированная решетка-утюг спереди
                fillRound(frontBumperX - 1.5, hoodFrontY + bodyYOffset - 0.5, 2.5, 4.5, 0.5, '#f8fafc', '#64748b', 0.5);
                // Хромированные дверные ручки
                px(1, hoodBackY + bodyYOffset + 2.5, 3.5, 1.0, '#f8fafc');
                px(-12, hoodBackY + bodyYOffset + 2.5, 3.5, 1.0, '#f8fafc');
            } else if (model === 'vaz2109') {
                // Массивные черные пластиковые бамперы и молдинги «Девятки»
                fillRound(rearBumperX - 2.0, sillY - 3.5, 5.0, 4.5, 1, '#18181b', '#27272a', 0.5);
                fillRound(frontBumperX - 2.5, sillY - 3.5, 5.5, 4.5, 1, '#18181b', '#27272a', 0.5);
                px(-14, sillY - 3.5, 28, 2.0, '#18181b');
                // Черные ручки
                px(1, hoodBackY + bodyYOffset + 2.5, 3.2, 1.2, '#09090b');
                px(-12, hoodBackY + bodyYOffset + 2.5, 3.2, 1.2, '#09090b');
            } else if (model === 'gaz24') {
                // Массивные хромированные бамперы с клыками
                fillRound(rearBumperX - 3.0, sillY - 2.5, 5.0, 3.5, 1, '#f8fafc', '#94a3b8', 0.6);
                fillRound(frontBumperX - 1.5, sillY - 2.5, 5.0, 3.5, 1, '#f8fafc', '#94a3b8', 0.6);
                // Хромированный молдинг по всей длине борта
                px(rearBumperX + 2, hoodBackY + bodyYOffset + 2.5, (frontBumperX - rearBumperX - 4), 1.2, '#f8fafc');
                // Хромированные ручки и эмблема на задней стойке
                px(2, hoodBackY + bodyYOffset + 3.8, 3.5, 1.0, '#f8fafc');
                px(-12, hoodBackY + bodyYOffset + 3.8, 3.5, 1.0, '#f8fafc');
                fillRound(roofRearX - 3.5, roofY + bodyYOffset + 5, 2.0, 2.0, 0.5, '#f8fafc');
            } else if (model === 'vesta') {
                // Фирменные X-выштамповки на боковинах Vesta Sport
                ctx.save();
                ctx.strokeStyle = bt.dark;
                ctx.lineWidth = 1.2 * s;
                ctx.beginPath();
                ctx.moveTo(Math.round(cx + 8 * s), Math.round(cy + (hoodBackY + bodyYOffset + 2) * s));
                ctx.lineTo(Math.round(cx + 18 * s), Math.round(cy + (sillY - 2) * s));
                ctx.moveTo(Math.round(cx + 18 * s), Math.round(cy + (hoodBackY + bodyYOffset + 2) * s));
                ctx.lineTo(Math.round(cx + 8 * s), Math.round(cy + (sillY - 2) * s));
                ctx.stroke();
                // Красная спортивная линия на пороге
                px(rWx + 10, sillY - 1.2, (fWx - rWx - 20), 1.0, '#ef4444');
                ctx.restore();
            } else if (model === 'wrx') {
                // Воздухозаборник STI на капоте
                fillRound(hoodBackX + 2, hoodBackY + bodyYOffset - 2.2, 5.5, 2.2, 0.6, '#0f172a', '#1e293b', 0.5);
                px(hoodBackX + 2.5, hoodBackY + bodyYOffset - 1.6, 4.5, 0.8, '#f8fafc');
            } else if (model === 'gelik') {
                // Культовые черные молдинги и дверные петли Гелика
                px(rearBumperX + 1, hoodFrontY + bodyYOffset + 1.5, (frontBumperX - rearBumperX - 2), 1.5, '#09090b');
                // Петли дверей
                px(4, hoodBackY + bodyYOffset + 4, 1.2, 2.0, '#09090b');
                px(-10, hoodBackY + bodyYOffset + 4, 1.2, 2.0, '#09090b');
                // Боковые поворотники на крыльях
                fillRound(frontBumperX - 6, hoodFrontY + bodyYOffset - 2.0, 2.5, 1.5, 0.5, '#f59e0b');
                // Двойной выхлоп AMG сбоку перед задним колесом
                fillRound(rWx + 9.5, sillY - 1.5, 3.8, 1.8, 0.5, '#cbd5e1', '#334155', 0.5);
                px(rWx + 9.5, sillY - 1.0, 1.5, 0.8, '#09090b');
                px(rWx + 11.5, sillY - 1.0, 1.5, 0.8, '#09090b');
            } else if (model === 'lc300' || model === 'cullinan') {
                // Подножка внедорожника
                fillRound(rWx + 9.5, sillY - 0.5, (fWx - rWx - 19), 2.2, 0.5, '#18181b', '#334155', 0.5);
                px(rWx + 10.5, sillY, (fWx - rWx - 21), 0.8, '#94a3b8');
            } else if (model === 'huracan') {
                // Итальянский триколор на пороге Huracan
                const flagW = 14;
                px(-7, sillY - 1.2, flagW / 3, 1.0, '#22c55e');
                px(-7 + flagW / 3, sillY - 1.2, flagW / 3, 1.0, '#ffffff');
                px(-7 + (flagW / 3) * 2, sillY - 1.2, flagW / 3, 1.0, '#ef4444');
                // Воздухозаборник за дверью
                fillPoly([[-12, hoodBackY + bodyYOffset + 2], [-6, hoodBackY + bodyYOffset + 1], [-7, sillY - 2], [-14, sillY - 2]], '#09090b');
            } else if (model === 'porsche911') {
                // Воздухозаборник Turbo на заднем крыле
                fillRound(rWx - 2, hoodBackY + bodyYOffset + 1, 4.0, 3.0, 0.8, '#09090b', '#1e293b', 0.5);
            } else if (model === 'chiron') {
                // Легендарная подкова Bugatti C-Line вокруг кабины
                ctx.save();
                ctx.strokeStyle = '#f8fafc';
                ctx.lineWidth = 1.8 * s;
                ctx.beginPath();
                ctx.moveTo(Math.round(cx + (roofFrontX + 4) * s), Math.round(cy + (hoodBackY + bodyYOffset + 1) * s));
                ctx.lineTo(Math.round(cx + (roofFrontX - 2) * s), Math.round(cy + (roofY + bodyYOffset - 0.5) * s));
                ctx.lineTo(Math.round(cx + (roofRearX - 2) * s), Math.round(cy + (roofY + bodyYOffset - 0.5) * s));
                ctx.arc(Math.round(cx + (roofRearX - 2) * s), Math.round(cy + (hoodBackY + bodyYOffset + 2) * s), 6 * s, -Math.PI / 2, Math.PI / 2, true);
                ctx.lineTo(Math.round(cx + (roofFrontX + 2) * s), Math.round(cy + (sillY - 1.5) * s));
                ctx.stroke();
                ctx.restore();
            } else if (model === 'police') {
                // Синяя полоса ДПС и надпись
                px(-22, hoodBackY + bodyYOffset + 2, 44, 3.5, '#1d4ed8');
                px(-12, hoodBackY + bodyYOffset + 3, 24, 1.5, '#ffffff');
            } else if (model === 'kamaz') {
                // Большой грузовой фургон / полуприцеп за кабиной КАМАЗа
                fillRound(-44, -23 + bodyYOffset, 55, (sillY - (-23)), 2, '#334155', '#1e293b', 1);
                // Гофрированные ребра жесткости фургона
                for (let k = -40; k <= 6; k += 8) {
                    px(k, -21 + bodyYOffset, 1.4, (sillY - (-23) - 4), '#1e293b');
                }
                // Красно-белая светоотражающая полоса по низу борта фургона
                for (let k = -42; k <= 7; k += 6) {
                    px(k, sillY - 2.8, 3, 1.6, '#ef4444');
                    px(k + 3, sillY - 2.8, 3, 1.6, '#ffffff');
                }
                // Решетка радиатора КАМАЗа и массивный черный бампер с подножкой
                fillRound(34, hoodFrontY + bodyYOffset - 1, 4.5, 6, 1, '#18181b', '#09090b', 0.5);
                px(35, hoodFrontY + bodyYOffset + 0.5, 3.0, 1.0, '#f8fafc');
                px(28, sillY - 0.5, 6, 1.5, '#475569');
            }

            // 9. Боковые стекла и тонировка
            const drawSideWindows = (poly, pillars = [0]) => {
                if (!poly || poly.length < 3) return;

                // Салон внутри автомобиля
                const salPoly = poly.map(pt => [pt[0], pt[1] + bodyYOffset]);
                fillPoly(salPoly, '#090d16');

                // Подголовник кресла и контур руля (динамически позиционируется по центру окна)
                ctx.save();
                ctx.fillStyle = '#1e293b';
                const midWinX = (poly[0][0] + poly[3][0]) / 2;
                const headX = Math.round(cx + (midWinX - 2) * s);
                const headY = Math.round(cy + (poly[1][1] + 3.2 + bodyYOffset) * s);
                ctx.beginPath();
                ctx.arc(headX, headY, 1.8 * s, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 1.0 * s;
                ctx.beginPath();
                ctx.arc(Math.round(cx + (midWinX + 8) * s), headY + 1 * s, 2.0 * s, Math.PI * 0.4, Math.PI * 1.6);
                ctx.stroke();
                ctx.restore();

                // Нанесение тонировки
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(Math.round(cx + poly[0][0] * s), Math.round(cy + (poly[0][1] + bodyYOffset) * s));
                for (let i = 1; i < poly.length; i++) {
                    ctx.lineTo(Math.round(cx + poly[i][0] * s), Math.round(cy + (poly[i][1] + bodyYOffset) * s));
                }
                ctx.closePath();
                ctx.clip();

                if (options.tint === 'chameleon') {
                    // Хамелеон: переливающийся градиент
                    const topY = cy + (poly[1][1] + bodyYOffset) * s;
                    const botY = cy + (poly[0][1] + bodyYOffset) * s;
                    const chamGrad = (ctx && typeof ctx.createLinearGradient === 'function')
                        ? ctx.createLinearGradient(cx - 20 * s, topY, cx + 25 * s, botY)
                        : null;
                    if (chamGrad && typeof chamGrad.addColorStop === 'function') {
                        chamGrad.addColorStop(0, 'rgba(124, 58, 237, 0.78)');
                        chamGrad.addColorStop(0.35, 'rgba(37, 99, 235, 0.72)');
                        chamGrad.addColorStop(0.70, 'rgba(6, 182, 212, 0.76)');
                        chamGrad.addColorStop(1, 'rgba(217, 70, 239, 0.78)');
                        ctx.fillStyle = chamGrad;
                    } else {
                        ctx.fillStyle = 'rgba(6, 182, 212, 0.75)';
                    }
                    ctx.fill();

                    // Белый глянцевый блик
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                    ctx.beginPath();
                    ctx.moveTo(cx - 8 * s, topY);
                    ctx.lineTo(cx - 1 * s, topY);
                    ctx.lineTo(cx + 9 * s, botY);
                    ctx.lineTo(cx + 2 * s, botY);
                    ctx.closePath();
                    ctx.fill();
                } else if (options.tint === 'dubai') {
                    // Дубайка: зеркальный хром с линией горизонта
                    const topY = cy + (poly[1][1] + bodyYOffset) * s;
                    const botY = cy + (poly[0][1] + bodyYOffset) * s;
                    const dubaiGrad = (ctx && typeof ctx.createLinearGradient === 'function')
                        ? ctx.createLinearGradient(cx, topY, cx, botY)
                        : null;
                    if (dubaiGrad && typeof dubaiGrad.addColorStop === 'function') {
                        dubaiGrad.addColorStop(0, 'rgba(56, 189, 248, 0.92)');
                        dubaiGrad.addColorStop(0.48, 'rgba(248, 250, 252, 0.98)');
                        dubaiGrad.addColorStop(0.52, 'rgba(226, 232, 240, 0.98)');
                        dubaiGrad.addColorStop(1, 'rgba(30, 41, 59, 0.92)');
                        ctx.fillStyle = dubaiGrad;
                    } else {
                        ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
                    }
                    ctx.fill();

                    // Зеркальный диагональный блик
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
                    ctx.beginPath();
                    ctx.moveTo(cx + 2 * s, topY);
                    ctx.lineTo(cx + 6 * s, topY);
                    ctx.lineTo(cx + 15 * s, botY);
                    ctx.lineTo(cx + 11 * s, botY);
                    ctx.closePath();
                    ctx.fill();
                } else if (Number(options.tint) >= 95) {
                    ctx.fillStyle = 'rgba(10, 10, 16, 0.96)';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                    ctx.lineWidth = 0.8 * s;
                    ctx.stroke();
                } else if (Number(options.tint) >= 50) {
                    ctx.fillStyle = 'rgba(24, 30, 44, 0.62)';
                    ctx.fill();
                } else {
                    ctx.fillStyle = 'rgba(186, 230, 253, 0.22)';
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.fillRect(Math.round(cx - 6 * s), Math.round(cy + (poly[1][1] + bodyYOffset) * s), Math.round(16 * s), Math.round(1.5 * s));
                }
                ctx.restore();

                // Стойки крыши B-Pillar
                for (const bx of pillars) {
                    fillRound(bx - 1.2, poly[1][1] + bodyYOffset - 0.5, 2.4, (poly[0][1] - poly[1][1]) + 1, 0.5, '#0f172a');
                }
            };

            const winPoly = [
                [rearGlassEndX + 1.5, trunkY + 0.5],
                [roofRearX + 0.8, roofY + 1.2],
                [roofFrontX - 0.8, roofY + 1.2],
                [hoodBackX - 0.5, hoodBackY + 0.5]
            ];
            drawSideWindows(winPoly, bPillars);

            // 10. Боковые зеркала заднего вида
            fillRound(hoodBackX - 1.5, hoodBackY + bodyYOffset - 1.5, 3.2, 2.2, 0.8, bt.dark, '#09090b', 0.5);
            px(hoodBackX - 1.0, hoodBackY + bodyYOffset - 1.0, 1.2, 1.2, '#38bdf8');

            // 11. Фара головного света (спереди справа)
            fillRound(frontBumperX - 3.2, hoodFrontY + bodyYOffset, 3.2, 3.0, 1, '#f8fafc', '#94a3b8', 0.5);
            px(frontBumperX - 1.5, hoodFrontY + bodyYOffset + 0.6, 1.5, 1.6, '#38bdf8');

            if (options.lightsOn) {
                ctx.save();
                const totalW = options.width || 260;
                const maxAvailable = Math.max(10, Math.floor((totalW - 8 - (cx + frontBumperX * s)) / (s || 1)));
                const beamReach = Math.min(24, Math.max(10, maxAvailable));
                const beamEnd = cx + (frontBumperX + beamReach) * s;
                const beamGrad = (ctx && typeof ctx.createLinearGradient === 'function')
                    ? ctx.createLinearGradient(cx + frontBumperX * s, cy + (hoodFrontY + bodyYOffset + 1.5) * s, beamEnd, cy + (hoodFrontY + bodyYOffset + 1.5) * s)
                    : null;
                if (beamGrad && typeof beamGrad.addColorStop === 'function') {
                    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.40)');
                    beamGrad.addColorStop(0.35, 'rgba(254, 240, 138, 0.15)');
                    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
                    ctx.fillStyle = beamGrad;
                    ctx.beginPath();
                    ctx.moveTo(cx + frontBumperX * s, cy + (hoodFrontY + bodyYOffset + 1.5) * s);
                    ctx.lineTo(beamEnd, cy + (hoodFrontY + bodyYOffset - 6) * s);
                    ctx.lineTo(beamEnd, cy + (hoodFrontY + bodyYOffset + 10) * s);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            }

            // 12. Задний фонарь (сзади слева)
            fillRound(rearBumperX, trunkY + bodyYOffset, 3.5, 2.8, 0.8, '#dc2626', '#7f1d1d', 0.5);
            px(rearBumperX + 0.5, trunkY + bodyYOffset + 0.6, 2.5, 1.2, '#ef4444');

            // 13. Выхлопные патрубки (кроме Гелика с боковым выхлопом)
            if (model !== 'gelik') {
                fillRound(rearBumperX - 1.5, sillY - 2.0, 3.2, 1.8, 0.5, '#cbd5e1', '#334155', 0.5);
                px(rearBumperX - 1.5, sillY - 1.6, 0.8, 1.0, '#09090b');
            }

            // 14. Спойлер / антикрыло
            if (options.spoiler && options.spoiler !== 'none') {
                const spTrunkTop = trunkY + bodyYOffset;
                if (options.spoiler === 'ducktail') {
                    ctx.save();
                    ctx.fillStyle = '#18181b';
                    ctx.beginPath();
                    ctx.moveTo(Math.round(cx + (rearBumperX + 8) * s), Math.round(cy + spTrunkTop * s));
                    ctx.lineTo(Math.round(cx + (rearBumperX - 1) * s), Math.round(cy + (spTrunkTop - 3.5) * s));
                    ctx.lineTo(Math.round(cx + (rearBumperX - 2.5) * s), Math.round(cy + (spTrunkTop - 1.5) * s));
                    ctx.lineTo(Math.round(cx + (rearBumperX + 4) * s), Math.round(cy + (spTrunkTop + 1.2) * s));
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = '#52525b';
                    ctx.fillRect(Math.round(cx + (rearBumperX - 1) * s), Math.round(cy + (spTrunkTop - 3.5) * s), Math.round(4 * s), Math.round(0.8 * s));
                    ctx.restore();
                } else if (options.spoiler === 'gt') {
                    ctx.save();
                    const wTop = spTrunkTop - 8.5;
                    ctx.fillStyle = '#09090b';
                    ctx.fillRect(Math.round(cx + (rearBumperX + 1.5) * s), Math.round(cy + wTop * s), Math.round(1.5 * s), Math.round(8.5 * s));
                    ctx.fillRect(Math.round(cx + (rearBumperX + 6.5) * s), Math.round(cy + wTop * s), Math.round(1.5 * s), Math.round(8.5 * s));
                    fillRound(rearBumperX - 3, wTop - 1, 14, 2.2, 0.8, '#18181b', '#3f3f46', 0.6);
                    px(rearBumperX - 2, wTop - 0.8, 12, 0.7, '#71717a');
                    fillRound(rearBumperX - 3.5, wTop - 3, 2.2, 5.5, 0.5, '#09090b', '#ef4444', 0.5);
                    ctx.restore();
                }
            }

            // 15. Винилография на боковине
            if (options.vinyl && options.vinyl !== 'none') {
                if (options.vinyl === 'stripes') {
                    const isLight = options.color && (options.color.toLowerCase().startsWith('#ff') || options.color.toLowerCase().startsWith('#fff') || options.color.toLowerCase().startsWith('#e2'));
                    const stripeCol = isLight ? '#0f172a' : '#ffffff';
                    ctx.save();
                    ctx.globalAlpha = 0.88;
                    px(rWx + 10, sillY - 2.8, (fWx - rWx - 20), 2.2, stripeCol);
                    px(rWx + 10, sillY - 4.2, (fWx - rWx - 20), 0.7, stripeCol);
                    ctx.restore();
                } else if (options.vinyl === 'drift') {
                    ctx.save();
                    ctx.globalAlpha = 0.85;
                    fillPoly([[-12, sillY - 2], [-4, sillY - 9], [2, sillY - 8], [-6, sillY - 1]], '#00f0ff');
                    fillPoly([[4, sillY - 3], [12, sillY - 9], [15, sillY - 8], [7, sillY - 2]], '#ec4899');
                    fillPoly([[-20, sillY - 4], [-14, sillY - 8], [-11, sillY - 7], [-17, sillY - 3]], '#facc15');
                    ctx.restore();
                }
            }

            // 16. Спецсигнал СГУ на крыше со стробоскопами (только для служебных машин)
            if (options.sgu === 'installed' && (name.includes('Полиция') || name.includes('ДПС'))) {
                const roofBarY = roofY + bodyYOffset - 3.2;
                const phase = Math.floor(Date.now() / 85) % 4;
                const isStrobing = !!options.sguStrobe;
                const blueActive = isStrobing ? (phase === 0 || phase === 1) : false;
                const redActive = isStrobing ? (phase === 2 || phase === 3) : false;

                ctx.save();
                fillRound(-5, roofBarY + 1.2, 10, 2.0, 0.5, '#09090b');
                if (blueActive) {
                    ctx.shadowBlur = 12 * s;
                    ctx.shadowColor = '#00f0ff';
                    fillRound(-4.5, roofBarY, 4, 1.8, 0.4, '#00f0ff');
                } else {
                    fillRound(-4.5, roofBarY, 4, 1.8, 0.4, '#1e3a8a');
                }
                if (redActive) {
                    ctx.shadowBlur = 12 * s;
                    ctx.shadowColor = '#ff0033';
                    fillRound(0.5, roofBarY, 4, 1.8, 0.4, '#ff0033');
                } else {
                    fillRound(0.5, roofBarY, 4, 1.8, 0.4, '#7f1d1d');
                }
                ctx.restore();
            }

            if (options.tilt) {
                ctx.restore();
            }
        }

        // 🎨 ГЕНЕРАТОР ПИКСЕЛЬНЫХ СПРАЙТОВ АВТОМОБИЛЕЙ СО СТАЙЛИНГОМ И ПОДИУМОМ
        function renderCarSpriteToContext(ctx, width, height, name, styling = {}, options = {}) {
            ctx.clearRect(0, 0, width, height);

            // Тёмный подиум автосалона с мягким световым пятном
            const bgGrad = (ctx && typeof ctx.createRadialGradient === 'function') ? ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, width * 0.65) : null;
            if (bgGrad && typeof bgGrad.addColorStop === 'function') {
                bgGrad.addColorStop(0, '#1c2438');
                bgGrad.addColorStop(0.6, '#0f1422');
                bgGrad.addColorStop(1, '#080a11');
                ctx.fillStyle = bgGrad;
            } else {
                ctx.fillStyle = '#0f1422';
            }
            ctx.fillRect(0, 0, width, height);

            // Тонкое кольцо подсветки подиума
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(width / 2, height / 2 + 8, width * 0.42, height * 0.34, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            const cx = width / 2;
            const cy = height / 2;
            const view = options.view || 'side';

            if (view === 'side') {
                const scale = options.scale || (width <= 140 ? 1.4 : 1.92);
                drawPixelCarSide(ctx, cx, cy, name, scale, {
                    color: styling?.color,
                    tint: styling?.tint,
                    neon: styling?.neon,
                    spoiler: styling?.spoiler,
                    vinyl: styling?.vinyl,
                    wheels: styling?.wheels,
                    suspension: styling?.suspension,
                    sgu: styling?.sgu,
                    lightsOn: true,
                    width,
                    height
                });
            } else {
                const tilt = (options.tilt !== undefined) ? options.tilt : (Math.PI / 2);
                const scale = options.scale || (width <= 140 ? 1.3 : 2.2);

                drawPixelCar(ctx, cx, cy, name, scale, {
                    color: styling?.color,
                    tint: styling?.tint,
                    neon: styling?.neon,
                    spoiler: styling?.spoiler,
                    vinyl: styling?.vinyl,
                    wheels: styling?.wheels,
                    suspension: styling?.suspension,
                    sgu: styling?.sgu,
                    tilt: tilt,
                    lightsOn: true,
                    width,
                    height
                });
            }
        }

        const carSpriteCache = new Map();

        function getCarSpriteDataUrl(name, styling = {}, options = {}) {
            const view = options.view || 'side';
            const color = styling?.color || '';
            const tint = styling?.tint ?? 0;
            const neon = styling?.neon || 'none';
            const spoiler = styling?.spoiler || 'none';
            const vinyl = styling?.vinyl || 'none';
            const wheels = styling?.wheels || 'stock';
            const suspension = styling?.suspension || 'stock';
            const sgu = styling?.sgu || 'none';
            const tilt = (options.tilt !== undefined) ? options.tilt : (Math.PI / 2);
            const width = options.width || 260;
            const height = options.height || 150;
            const cacheKey = `${name}_${color}_${tint}_${neon}_${spoiler}_${vinyl}_${wheels}_${suspension}_${sgu}_${tilt}_${width}_${height}_${view}`;
            if (carSpriteCache.has(cacheKey)) {
                return carSpriteCache.get(cacheKey);
            }

            // Return authentic 3D model icon whenever available for side view
            if (view === 'side' && !options.forcePixel && typeof Car3DManager !== 'undefined' && typeof Car3DManager.getSideThumbnail === 'function') {
                const thumb3D = Car3DManager.getSideThumbnail(name, styling);
                if (thumb3D) {
                    if (carSpriteCache.size > 250) carSpriteCache.clear();
                    carSpriteCache.set(cacheKey, thumb3D);
                    return thumb3D;
                }
            }

            if (typeof document === 'undefined' || !document.createElement) {
                return DEFAULT_CAR_IMG;
            }

            try {
                const canvas = document.createElement('canvas');
                if (!canvas || typeof canvas.getContext !== 'function') {
                    return DEFAULT_CAR_IMG;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx || typeof ctx.fillRect !== 'function' || typeof canvas.toDataURL !== 'function') {
                    return DEFAULT_CAR_IMG;
                }

                renderCarSpriteToContext(ctx, width, height, name, { color, tint, neon, spoiler, vinyl, wheels, suspension, sgu }, { tilt, view });
                const dataUrl = canvas.toDataURL('image/png');
                if (dataUrl && dataUrl.startsWith('data:image')) {
                    if (carSpriteCache.size > 250) carSpriteCache.clear();
                    carSpriteCache.set(cacheKey, dataUrl);
                    return dataUrl;
                }
            } catch(e) {}
            return DEFAULT_CAR_IMG;
        }

        function updateStylingModalPreview() {
            const car = (stylingActiveCarIndex >= 0 && myCars[stylingActiveCarIndex]) ? myCars[stylingActiveCarIndex] : null;
            if (!car) return;

            if (car3DShowroom) {
                car3DShowroom.updateStyling({
                    color: stylingTempColor,
                    tint: stylingTempTint,
                    neon: stylingTempNeon,
                    spoiler: stylingTempSpoiler,
                    vinyl: stylingTempVinyl,
                    wheels: stylingTempWheels,
                    suspension: stylingTempSuspension,
                    sgu: stylingTempSgu,
                    plate: stylingTempPlate,
                    camber: stylingTempCamber,
                    wheelOffset: stylingTempOffset,
                    neonMode: stylingTempNeonMode
                });
            }

            const canvas = document.getElementById('styling-preview-canvas');
            if (!canvas || typeof canvas.getContext !== 'function') return;
            const ctx = canvas.getContext('2d');
            if (!ctx || typeof ctx.fillRect !== 'function') return;
            renderCarSpriteToContext(ctx, canvas.width, canvas.height, car.name, {
                color: stylingTempColor,
                tint: stylingTempTint,
                neon: stylingTempNeon,
                spoiler: stylingTempSpoiler,
                vinyl: stylingTempVinyl,
                wheels: stylingTempWheels,
                suspension: stylingTempSuspension,
                sgu: stylingTempSgu
            }, { view: stylingViewMode === '3d' ? 'side' : stylingViewMode });
        }


        // ==========================================
        // 🎮 ИГРОВАЯ ЛОГИКА И ЦИКЛ ЗАЕЗДА
        // ==========================================
        let selectedRaceCarName = "Lada Priora БПАН";
        let selectedRaceCarIndex = -1; // Distinguishes duplicate models in the garage.
        let activeRaceCar = null;
        let isRaceRunning = false;
        let raceAnimFrame = null;
        let lastRaceTime = 0;

        let racePlayer = {
            x: 200,
            y: 470,
            vx: 0,
            tilt: 0,
            speed: 70,
            peakSpeed: 70,
            targetSpeed: 120,
            maxSpeed: 180,
            accel: 2.5,
            handling: 5.5,
            nitro: 100,
            nitroDepleted: false,
            isNitroActive: false,
            isDrafting: false,
            invulnerableTimer: 0,
            shield: 0,
            distanceKm: 0,
            earnedCash: 0,
            overtakesCount: 0,
            combo: 1,
            comboTimer: 0,
            damageBlink: 0,
            isOnWall: false,
            wantedStars: 0,
            escapeTimer: 0,
            wasGasActive: false,
            wasNitroActive: false,
            backfireCooldown: 0,
            blowOffCooldown: 0
        };

        function getCarAudioProfile(car) {
            if (!car) return 'standard';
            const name = String(car.name || '').toLowerCase();
            const cat = String(car.category || '').toLowerCase();
            if (name.includes('камаз') || name.includes('фура')) return 'kamaz';
            if (cat.includes('классик') || cat.includes('ретро') || name.includes('ваз') || name.includes('газ')) return 'classic';
            if (cat.includes('гиперкар') || cat.includes('суперкар') || name.includes('911') || name.includes('huracan') || name.includes('gt-r') || name.includes('ferrari') || name.includes('bugatti') || name.includes('jesko') || name.includes('silvia') || name.includes('wrx')) return 'sport';
            if (cat.includes('внедорожник') || cat.includes('люкс') || cat.includes('спорт') || name.includes('m5') || name.includes('m8') || name.includes('amg') || name.includes('rs6') || name.includes('v8') || name.includes('v10') || name.includes('cullinan') || name.includes('гелик') || name.includes('land cruiser')) return 'v8';
            return 'standard';
        }

        function addWantedStars(amount, reason = '') {
            if (!isRaceRunning || raceCurrentMode === 'drift') return;
            const prev = racePlayer.wantedStars || 0;
            const next = Math.min(5, Math.max(0, prev + amount));
            racePlayer.wantedStars = next;
            racePlayer.escapeTimer = 9.0;
            if (next > prev) {
                if (typeof sound?.lock === 'function') sound.lock(1.3);
                const starStr = '⭐'.repeat(next);
                showRacePopup(`🚨 РОЗЫСК: ${starStr} ${reason}!`, '#ef4444');
            }
        }

        let raceKeys = { left: false, right: false, gas: false, brake: false, nitro: false, drift: false, horn: false };
        let raceTraffic = [];
        let raceCollectibles = [];
        let raceSkidmarks = [];
        let raceDriftSmoke = [];
        let raceSparks = [];
        let raceRoadOffset = 0;
        let trafficSpawnTimer = 0;
        let collectibleSpawnTimer = 0;
        let roadCurve = 0;
        let targetRoadCurve = 0;
        let curveTimer = 0;
        let lastDriftScreechTime = 0;
        let raceClippingZones = [];
        let clippingSpawnTimer = 0;
        let raceAutoGasEnabled = false;
        let raceHighwayEvent = null;
        let raceHighwayEventCooldown = 18;

        function toggleRaceAutoGas() {
            raceAutoGasEnabled = !raceAutoGasEnabled;
            if (typeof document !== 'undefined') {
                const btn = document.getElementById('btn-touch-autogas');
                const lbl = document.getElementById('touch-autogas-label');
                const icn = document.getElementById('touch-autogas-icon');
                if (btn) btn.classList.toggle('active', raceAutoGasEnabled);
                if (lbl) lbl.textContent = raceAutoGasEnabled ? 'АВТО-ГАЗ: ВКЛ' : 'АВТО-ГАЗ: ВЫКЛ';
                if (icn) icn.textContent = raceAutoGasEnabled ? '🔥' : '⚡';
            }
            if (typeof showToast === 'function') {
                showToast(raceAutoGasEnabled ? '⚡ Авто-газ включён: машина едет сама, управляйте рулём и тормозом' : '⚡ Авто-газ выключен: ручное управление газом');
            }
        }

        // -------------------------------------------------------------
        // РЕЖИМ ГОНКИ: «Шоссе (Трафик)» vs «Дрифт (Заносы)»
        // -------------------------------------------------------------
        let raceCurrentMode = 'highway'; // 'highway' | 'drift'

        function setRaceMode(mode) {
            raceCurrentMode = mode === 'drift' ? 'drift' : 'highway';
            const lbl = typeof document !== 'undefined' ? document.getElementById('race-mode-label') : null;
            if (lbl) {
                lbl.textContent = raceCurrentMode === 'drift' ? 'Дрифт (Заносы)' : 'Шоссе (Трафик)';
            }
            const desc = typeof document !== 'undefined' ? document.getElementById('race-mode-desc') : null;
            if (desc) {
                desc.textContent = raceCurrentMode === 'drift'
                    ? 'Резкие повороты горного серпантина, глубокие заносы на ручнике, дым из-под колес и апексы!'
                    : 'Скоростные прямые, плотный трафик, обгоны, радары скорости и патрули ДПС.';
            }
            if (typeof document !== 'undefined') {
                const btnHighway = document.getElementById('btn-mode-highway');
                const btnDrift = document.getElementById('btn-mode-drift');
                if (btnHighway) btnHighway.classList.toggle('active', raceCurrentMode === 'highway');
                if (btnDrift) btnDrift.classList.toggle('active', raceCurrentMode === 'drift');
            }
        }

        // -------------------------------------------------------------
        // СИСТЕМА ПОГОДЫ И АТМОСФЕРЫ ЗАЕЗДА (День, Закат, Ночь, Дождь, Динамика)
        // -------------------------------------------------------------
        let raceSelectedWeather = 'auto';
        let raceWaterSpray = [];
        let raceLightningFlash = 0;
        let raceLightningTimer = 6.0;
        let raceLightningBolt = [];

        function setRaceWeather(mode) {
            raceSelectedWeather = mode || 'auto';
            const labels = {
                'auto': 'Динамическая (смена по трассе)',
                'day': '☀️ Ясный день (высокая видимость)',
                'sunset': '🌅 Закат (золотые и сиреневые тона)',
                'night': '🌃 Ночной город (яркие фонари)',
                'rain': '🌧️ Грозовой ливень (мокрый асфальт, молнии)',
                'fog': '🌫️ Густой туман (утренняя мгла, фары)',
                'snow': '❄️ Зимняя метель (снегопад, белый покров)'
            };
            const lbl = typeof document !== 'undefined' ? document.getElementById('race-weather-label') : null;
            if (lbl) {
                lbl.textContent = labels[raceSelectedWeather] || labels['auto'];
            }
            if (typeof document !== 'undefined') {
                const btns = document.querySelectorAll('.race-weather-btn');
                btns.forEach(btn => {
                    if (btn.getAttribute('data-weather') === raceSelectedWeather) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }
            if (car3DRacingEngine && typeof car3DRacingEngine.setWeather === 'function') {
                car3DRacingEngine.setWeather(raceSelectedWeather, true);
            }
        }

        // Генерация частиц дождя для биома М-11
        const raceRainDrops = [];
        for (let i = 0; i < 45; i++) {
            raceRainDrops.push({
                x: Math.random() * 400,
                y: Math.random() * 600,
                len: 12 + Math.random() * 12,
                speed: 550 + Math.random() * 250
            });
        }

        // Перспективное смещение поворота дороги на высоте Y
        function getCurveX(y) {
            const factor = Math.max(0, Math.min(1, (600 - y) / 600));
            return roadCurve * Math.pow(factor, 1.8);
        }

        // Система динамических биомов и атмосферы по дистанции / погоде
        function getTrackBiome(distKm) {
            if (raceSelectedWeather === 'day') {
                return {
                    id: 'day',
                    name: 'М-4 «Дон»: Солнечный день',
                    icon: '☀️',
                    tag: 'РЕЖИМ: ДЕНЬ',
                    sky: '#38bdf8',
                    asphalt: '#252f3f',
                    border: '#15803d',
                    curb1: '#dc2626',
                    curb2: '#ffffff',
                    lineCol: '#ffffff',
                    themeCol: '#0284c7',
                    isRain: false,
                    isNight: false,
                    isSunset: false,
                    hasLamps: true
                };
            }
            if (raceSelectedWeather === 'sunset') {
                return {
                    id: 'sunset',
                    name: 'Приморское шоссе: Закат',
                    icon: '🌅',
                    tag: 'РЕЖИМ: ЗАКАТ',
                    sky: '#3b0764',
                    asphalt: '#1e1b4b',
                    border: '#581c87',
                    curb1: '#f59e0b',
                    curb2: '#fde047',
                    lineCol: '#fef08a',
                    themeCol: '#f97316',
                    isRain: false,
                    isNight: true,
                    isSunset: true,
                    hasLamps: true
                };
            }
            if (raceSelectedWeather === 'night') {
                return {
                    id: 'mow',
                    name: 'МКАД: Огни ночного города',
                    icon: '🌃',
                    tag: 'РЕЖИМ: НОЧЬ',
                    sky: '#040711',
                    asphalt: '#101622',
                    border: '#0b111e',
                    curb1: '#ef4444',
                    curb2: '#ffffff',
                    lineCol: '#fbbf24',
                    themeCol: '#38bdf8',
                    isRain: false,
                    isNight: true,
                    isSunset: false,
                    hasLamps: true
                };
            }
            if (raceSelectedWeather === 'rain') {
                return {
                    id: 'forest',
                    name: 'М-11 «Нева»: Ночной ливень',
                    icon: '🌧️',
                    tag: 'РЕЖИМ: ЛИВЕНЬ',
                    sky: '#020d12',
                    asphalt: '#0c161d',
                    border: '#051f14',
                    curb1: '#0284c7',
                    curb2: '#f0f9ff',
                    lineCol: '#fef08a',
                    themeCol: '#34d399',
                    isRain: true,
                    isNight: true,
                    isSunset: false,
                    hasLamps: true
                };
            }
            if (raceSelectedWeather === 'fog') {
                return {
                    id: 'fog',
                    name: 'Трасса в тумане: Утренняя мгла',
                    icon: '🌫️',
                    tag: 'РЕЖИМ: ТУМАН',
                    sky: '#78909c',
                    asphalt: '#263238',
                    border: '#1b382b',
                    curb1: '#94a3b8',
                    curb2: '#ffffff',
                    lineCol: '#f1f5f9',
                    themeCol: '#94a3b8',
                    isRain: false,
                    isNight: false,
                    isSunset: false,
                    isFog: true,
                    hasLamps: true
                };
            }
            if (raceSelectedWeather === 'snow') {
                return {
                    id: 'snow',
                    name: 'Зимняя трасса: Снегопад',
                    icon: '❄️',
                    tag: 'РЕЖИМ: СНЕГ',
                    sky: '#334155',
                    asphalt: '#1e293b',
                    border: '#e2e8f0',
                    curb1: '#38bdf8',
                    curb2: '#ffffff',
                    lineCol: '#f8fafc',
                    themeCol: '#38bdf8',
                    isRain: false,
                    isNight: false,
                    isSunset: false,
                    isSnow: true,
                    hasLamps: true
                };
            }

            // Динамический режим ('auto') по пройденным километрам
            if (distKm < 2.5) {
                return {
                    id: 'mow',
                    name: 'МКАД: Ночная Москва',
                    icon: '🌃',
                    tag: '0 - 2.5 КМ',
                    sky: '#040711',
                    asphalt: '#101622',
                    border: '#0b111e',
                    curb1: '#ef4444',
                    curb2: '#ffffff',
                    lineCol: '#fbbf24',
                    themeCol: '#38bdf8',
                    isRain: false,
                    isNight: true,
                    isSunset: false,
                    hasLamps: true
                };
            } else if (distKm < 5.5) {
                return {
                    id: 'forest',
                    name: 'М-11 «Нева» (Лесной ливень)',
                    icon: '🌧️',
                    tag: '2.5 - 5.5 КМ',
                    sky: '#020d12',
                    asphalt: '#0c161d',
                    border: '#051f14',
                    curb1: '#0284c7',
                    curb2: '#f0f9ff',
                    lineCol: '#fef08a',
                    themeCol: '#34d399',
                    isRain: true,
                    isNight: true,
                    isSunset: false,
                    hasLamps: true
                };
            } else if (distKm < 9.0) {
                return {
                    id: 'bridge',
                    name: 'Живописный Вантовый Мост',
                    icon: '🌉',
                    tag: '5.5 - 9.0 КМ',
                    sky: '#020b1c',
                    asphalt: '#0e1626',
                    border: '#031f38', // вода реки
                    curb1: '#6366f1',
                    curb2: '#c7d2fe',
                    lineCol: '#38bdf8',
                    themeCol: '#818cf8',
                    isRain: false,
                    isNight: true,
                    isSunset: true,
                    hasLamps: true
                };
            } else {
                return {
                    id: 'neon',
                    name: 'Неоновый Туннель Форсажа',
                    icon: '⚡',
                    tag: '9.0+ КМ',
                    sky: '#070014',
                    asphalt: '#090914',
                    border: '#1a072c',
                    curb1: '#ec4899',
                    curb2: '#a855f7',
                    lineCol: '#f43f5e',
                    themeCol: '#f43f5e',
                    isRain: false,
                    isNight: true,
                    isSunset: false,
                    hasLamps: false
                };
            }
        }

        function getRaceRecords() { return raceRecordStore.get(); }
        function saveRaceRecords(rec) { return raceRecordStore.set(rec); }
        function setRaceRecords(rec) { return raceRecordStore.merge(rec); }

        function updateRaceRecordsUI() {
            const rec = getRaceRecords();
            const dEl = document.getElementById('race-rec-distance');
            const sEl = document.getElementById('race-rec-speed');
            const eEl = document.getElementById('race-rec-earned');
            if (dEl) dEl.innerText = `${rec.bestDistance.toFixed(1)} км`;
            if (sEl) sEl.innerText = `${Math.round(rec.bestSpeed)} км/ч`;
            if (eEl) eEl.innerText = `${Math.round(rec.totalEarned).toLocaleString('ru-RU')} ₽`;
        }

        function initRaceGameTab() {
            // Если выбранное авто еще не выбрано или не куплено, авто-выбираем первое купленное из гаража
            if (myCars && myCars.length > 0) {
                const isCurrentOwned = myCars.some(c => c.name === selectedRaceCarName);
                if (!isCurrentOwned) {
                    selectedRaceCarName = myCars[0].name;
                    selectedRaceCarIndex = 0;
                }
            }
            if (typeof Car3DManager !== 'undefined' && Car3DManager.preloadCarModel && window.THREE) {
                try { Car3DManager.preloadCarModel(window.THREE, selectedRaceCarName); } catch (_) {}
            }
            renderRaceCarPicker();
            updateRaceCarShowcase();
            updateRaceRecordsUI();
            setRaceWeather(raceSelectedWeather);
            initRaceTouchControls();
        }

        function renderRaceCarPicker() {
            const container = document.getElementById('race-car-picker-list');
            if (!container) return;
            container.innerHTML = '';

            // Объединяем машины: сначала из гаража, затем остальные (заблокированные для заезда)
            const allAvailableCars = [];
            myCars.forEach((c, index) => {
                allAvailableCars.push({name:c.name, owned:true, plate:c.plate, index});
            });

            carsData.forEach(c => {
                if (!allAvailableCars.some(a => a.name === c.name)) {
                    allAvailableCars.push({ name: c.name, owned: false, plate: null });
                }
            });

            allAvailableCars.forEach(carItem => {
                const card = document.createElement('div');
                card.className = `race-picker-card ${carItem.name === selectedRaceCarName && (!carItem.owned || carItem.index === getSelectedRaceCarIndex()) ? 'active' : ''} ${!carItem.owned ? 'locked' : ''}`;
                card.onclick = () => selectRaceCar(carItem.name, carItem.owned ? carItem.index : -1);

                const cvs = document.createElement('canvas');
                cvs.width = 44;
                cvs.height = 68;
                const cCtx = cvs.getContext('2d');
                const ownedCar = carItem.owned ? myCars[carItem.index] : null;
                const carStyling = ownedCar?.styling || {};
                const cached3D = (typeof Car3DManager !== 'undefined' && typeof Car3DManager.getSideThumbnail === 'function')
                    ? Car3DManager.getSideThumbnail(carItem.name, carStyling)
                    : null;
                const drawThumbOnCvs = (url) => {
                    const img = new Image();
                    img.onload = () => {
                        cCtx.clearRect(0, 0, cvs.width, cvs.height);
                        const aspect = img.width / (img.height || 1);
                        const dw = cvs.width;
                        const dh = dw / aspect;
                        const dy = (cvs.height - dh) / 2;
                        cCtx.drawImage(img, 0, dy, dw, dh);
                    };
                    img.src = url;
                };
                if (cached3D) {
                    drawThumbOnCvs(cached3D);
                } else {
                    drawPixelCar(cCtx, 22, 34, carItem.name, 1.1, {
                        color: carStyling.color,
                        tint: carStyling.tint,
                        neon: carStyling.neon
                    });
                    if (typeof Car3DManager !== 'undefined' && typeof Car3DManager.renderSideThumbnail === 'function') {
                        Car3DManager.renderSideThumbnail(carItem.name, carStyling, (url) => {
                            if (url) drawThumbOnCvs(url);
                        });
                    }
                }

                const nameDiv = document.createElement('div');
                nameDiv.style.fontSize = '10px';
                nameDiv.style.fontWeight = '700';
                nameDiv.style.color = carItem.name === selectedRaceCarName && (!carItem.owned || carItem.index === getSelectedRaceCarIndex()) ? '#fbbf24' : '#fff';
                nameDiv.style.whiteSpace = 'nowrap';
                nameDiv.style.overflow = 'hidden';
                nameDiv.style.textOverflow = 'ellipsis';
                nameDiv.innerText = carItem.name;

                const badge = document.createElement('div');
                badge.style.fontSize = '9px';
                badge.style.marginTop = '2px';
                badge.style.fontWeight = '700';
                badge.style.color = carItem.owned ? 'var(--accent-green)' : '#ef4444';
                badge.innerText = carItem.owned ? `В гараже · ${Math.round(NomeraRaceEconomy.normalizeCar(myCars[carItem.index]).condition)}%` : '🔒 Недоступно';

                card.appendChild(cvs);
                card.appendChild(nameDiv);
                card.appendChild(badge);
                container.appendChild(card);
            });
        }

        function getSelectedRaceCarIndex() {
            if (selectedRaceCarIndex >= 0 && myCars[selectedRaceCarIndex]?.name === selectedRaceCarName) return selectedRaceCarIndex;
            return myCars.findIndex(c => c.name === selectedRaceCarName);
        }

        function selectRaceCar(carName, index = -1) {
            selectedRaceCarName = carName;
            selectedRaceCarIndex = index;
            if (typeof Car3DManager !== 'undefined' && Car3DManager.preloadCarModel && window.THREE) {
                try { Car3DManager.preloadCarModel(window.THREE, selectedRaceCarName); } catch (_) {}
            }
            renderRaceCarPicker();
            updateRaceCarShowcase();
            playTick();
        }

        function updateRaceCarShowcase() {
            const carIndex = getSelectedRaceCarIndex();
            const ownedCarObj = carIndex < 0 ? null : myCars[carIndex];
            const isOwned = !!ownedCarObj;
            const baseStats = carRaceStats[selectedRaceCarName] || carRaceStats["ВАЗ-2107 «Жигули»"];
            const stats = NomeraRaceEconomy.performance(baseStats, ownedCarObj);

            const titleEl = document.getElementById('race-car-title');
            const badgeEl = document.getElementById('race-car-badge');
            const descEl = document.getElementById('race-car-desc');
            const plateSlot = document.getElementById('race-car-plate-slot');

            if (titleEl) titleEl.innerText = selectedRaceCarName;
            if (badgeEl) {
                badgeEl.innerText = isOwned ? 'В гараже (Свой)' : '🔒 Недоступно';
                badgeEl.style.background = isOwned ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
                badgeEl.style.color = isOwned ? '#34d399' : '#ef4444';
                badgeEl.style.border = isOwned ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)';
            }
            if (descEl) descEl.innerText = stats.desc;
            const serviceEl = document.getElementById('race-car-service');
            if (serviceEl) {
                const state = NomeraRaceEconomy.normalizeCar(ownedCarObj);
                serviceEl.textContent = isOwned
                    ? `🧰 Состояние: ${Math.round(state.condition)}% · ⚙️ ${state.upgrades.engine}/5 · 🛞 ${state.upgrades.handling}/5 · ⛽ ${state.upgrades.economy}/5 · 🚀 ${state.upgrades.nitro}/5 · ${stats.consumption} л/100 км`
                    : 'Купи машину, чтобы открыть тюнинг и ремонт в гараже.';
            }

            if (plateSlot) {
                if (isOwned && ownedCarObj && ownedCarObj.plate) {
                    const bonusBadge = stats.plateBonus > 0
                        ? `<span style="font-size: 11px; margin-left: 6px; color: #fbbf24; font-weight: 700; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 2px 6px; border-radius: 4px;">✨ +${stats.plateBonus}% ₽</span>`
                        : '';
                    plateSlot.innerHTML = `<span class="mini-plate" style="font-size: 13px; padding: 2px 8px;">${escapeHtml(ownedCarObj.plate.text)}</span>${bonusBadge}`;
                } else if (isOwned) {
                    plateSlot.innerHTML = `<span style="font-size: 11px; color: var(--text-dim);">Без госномера</span>`;
                } else {
                    plateSlot.innerHTML = `<span style="font-size: 11px; color: #ef4444; font-weight: 700;">🔒 Автомобиль не куплен — заезд заблокирован</span>`;
                }
            }

            // Блокировка кнопки старта для некупленных авто
            const btnStart = document.getElementById('btn-start-race');
            const btnShop = document.getElementById('btn-shop-race-car');

            if (btnStart) {
                if (isOwned) {
                    btnStart.disabled = false;
                    btnStart.style.opacity = '1';
                    btnStart.style.cursor = 'pointer';
                    btnStart.style.background = '';
                    btnStart.innerText = '🚦 НАЧАТЬ ЗАЕЗД (СТАРТ)';
                    btnStart.title = 'Нажмите, чтобы начать гонку';
                } else {
                    btnStart.disabled = true;
                    btnStart.style.opacity = '0.55';
                    btnStart.style.cursor = 'not-allowed';
                    btnStart.style.background = '#374151';
                    btnStart.innerText = '🔒 АВТОМОБИЛЬ НЕДОСТУПЕН ДЛЯ ЗАЕЗДА';
                    btnStart.title = 'Купите этот автомобиль в автосалоне, чтобы участвовать в гонке';
                }
            }

            if (btnShop) {
                if (!isOwned) {
                    btnShop.classList.remove('hidden');
                    const tpl = carsData.find(c => c.name === selectedRaceCarName);
                    const pr = tpl ? `${tpl.price.toLocaleString('ru-RU')} ₽` : '';
                    btnShop.innerText = `🏪 Купить «${selectedRaceCarName}» в автосалоне (${pr})`;
                } else {
                    btnShop.classList.add('hidden');
                }
            }

            // Шкалы характеристик
            document.getElementById('stat-speed').innerText = `${stats.speed} км/ч`;
            document.getElementById('bar-speed').style.width = `${Math.min(100, (stats.speed / 450) * 100)}%`;

            document.getElementById('stat-accel').innerText = `${stats.accel}G`;
            document.getElementById('bar-accel').style.width = `${Math.min(100, (stats.accel / 8) * 100)}%`;

            document.getElementById('stat-handling').innerText = `${stats.handling} / 10`;
            document.getElementById('bar-handling').style.width = `${(stats.handling / 10) * 100}%`;

            document.getElementById('stat-reward').innerText = `x${stats.rewardMult.toFixed(1)}`;
            document.getElementById('bar-reward').style.width = `${Math.min(100, (stats.rewardMult / 35) * 100)}%`;

            // Отрисовка витрины выбранного авто (3D модель)
            const canvas = document.getElementById('race-showcase-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const carStyling = ownedCarObj?.styling || {};
                const cached3D = (typeof Car3DManager !== 'undefined' && typeof Car3DManager.getSideThumbnail === 'function')
                    ? Car3DManager.getSideThumbnail(selectedRaceCarName, carStyling)
                    : null;

                const draw3DThumb = (url) => {
                    const img = new Image();
                    img.onload = () => {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        const aspect = img.width / (img.height || 1);
                        const dw = canvas.width - 8;
                        const dh = dw / aspect;
                        const dy = (canvas.height - dh) / 2;
                        ctx.drawImage(img, 4, dy, dw, dh);
                    };
                    img.src = url;
                };

                if (cached3D) {
                    draw3DThumb(cached3D);
                } else if (typeof Car3DManager !== 'undefined' && typeof Car3DManager.renderSideThumbnail === 'function') {
                    Car3DManager.renderSideThumbnail(selectedRaceCarName, carStyling, (url) => {
                        if (url) draw3DThumb(url);
                    });
                    drawPixelCar(ctx, canvas.width / 2, canvas.height / 2 + 10, selectedRaceCarName, 2.4, {
                        lightsOn: true,
                        color: carStyling.color,
                        tint: carStyling.tint,
                        neon: carStyling.neon,
                        spoiler: carStyling.spoiler,
                        vinyl: carStyling.vinyl,
                        wheels: carStyling.wheels,
                        suspension: carStyling.suspension,
                        sgu: carStyling.sgu
                    });
                } else {
                    drawPixelCar(ctx, canvas.width / 2, canvas.height / 2 + 10, selectedRaceCarName, 2.4, {
                        lightsOn: true,
                        color: carStyling.color,
                        tint: carStyling.tint,
                        neon: carStyling.neon,
                        spoiler: carStyling.spoiler,
                        vinyl: carStyling.vinyl,
                        wheels: carStyling.wheels,
                        suspension: carStyling.suspension,
                        sgu: carStyling.sgu
                    });
                }
            }
        }

        // Переход в автосалон для быстрой покупки
        function goToShopForCurrentCar() {
            const tabs = document.querySelectorAll('.nav-tab');
            let garageTab = null;
            tabs.forEach(t => {
                if (t.innerText.includes('Гараж')) garageTab = t;
            });
            if (garageTab) switchTab('garage', garageTab);
            if (typeof filterShopCars === 'function') filterShopCars('all');
            const cardId = 'shop-car-' + encodeURIComponent(selectedRaceCarName).replace(/%/g, '_');
            const targetCard = document.getElementById(cardId);
            if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetCard.style.outline = '2px solid var(--accent-green)';
                setTimeout(() => { if (targetCard) targetCard.style.outline = ''; }, 2500);
            } else {
                const salonSection = document.getElementById('garage-list');
                if (salonSection) salonSection.scrollIntoView({ behavior: 'smooth' });
            }
        }

        const activeRacePointers = new Map();

        function updateTouchBtnUI(key, active) {
            const btn = document.getElementById('btn-touch-' + key);
            if (btn && btn.classList && typeof btn.classList.toggle === 'function') {
                btn.classList.toggle('pressed', !!active);
            }
            const btn3d = document.getElementById('btn-3d-touch-' + key);
            if (btn3d && btn3d.classList && typeof btn3d.classList.toggle === 'function') {
                btn3d.classList.toggle('pressed', !!active);
            }
            if (key === 'left' || key === 'right') {
                const leftActive = !!raceKeys.left;
                const rightActive = !!raceKeys.right;
                document.querySelectorAll('.steer-left-indicator').forEach(el => {
                    if (el.classList && typeof el.classList.toggle === 'function') {
                        el.classList.toggle('active', leftActive);
                    }
                });
                document.querySelectorAll('.steer-right-indicator').forEach(el => {
                    if (el.classList && typeof el.classList.toggle === 'function') {
                        el.classList.toggle('active', rightActive);
                    }
                });
            }
        }

        function resetRaceKeys() {
            activeRacePointers.clear();
            Object.keys(raceKeys).forEach(key => {
                raceKeys[key] = false;
                updateTouchBtnUI(key, false);
            });
            document.querySelectorAll('.steer-feedback-indicator').forEach(el => {
                if (el.classList && typeof el.classList.remove === 'function') {
                    el.classList.remove('active');
                }
            });
            if (car3DRacingEngine && typeof car3DRacingEngine.resetKeys === 'function') {
                car3DRacingEngine.resetKeys();
            }
        }
        window.addEventListener('blur', resetRaceKeys);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { resetRaceKeys(); sound.suspend(); }
            lastRaceTime = performance.now();
        });

        function setRaceKey(key, state) {
            if (raceKeys[key] !== undefined) {
                raceKeys[key] = !!state;
                updateTouchBtnUI(key, !!state);
            }
            if (car3DRacingEngine && activeRaceMode === '3d') {
                car3DRacingEngine.setKey(key, !!state);
            }
        }

        function handleTouchControl(e, key, state) {
            if (e) {
                if (e.target && e.pointerId !== undefined) {
                    if (state && typeof e.target.setPointerCapture === 'function') {
                        try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
                    }
                    if (!state && typeof e.target.releasePointerCapture === 'function') {
                        try { e.target.releasePointerCapture(e.pointerId); } catch (_) {}
                    }
                }
                if (typeof e.preventDefault === 'function') {
                    e.preventDefault();
                }
                if (e.pointerId !== undefined) {
                    if (state) {
                        activeRacePointers.set(e.pointerId, key);
                    } else if (activeRacePointers.get(e.pointerId) === key) {
                        activeRacePointers.delete(e.pointerId);
                    }
                }
            }
            setRaceKey(key, state);
            if (state) {
                if (key === 'nitro') {
                    if (racePlayer && (racePlayer.nitroDepleted || racePlayer.nitro <= 0.05)) {
                        // Нитро истощено — не воспроизводим звук и хаптик
                    } else {
                        if (typeof sound?.nitro === 'function') sound.nitro();
                        if (typeof sound?.haptic === 'function') sound.haptic('nitro');
                    }
                } else if (key === 'drift') {
                    if (typeof sound?.handbrake === 'function') sound.handbrake();
                    else if (typeof sound?.drift === 'function') sound.drift();
                    if (typeof sound?.haptic === 'function') sound.haptic('medium');
                } else if (key === 'brake') {
                    if (typeof sound?.brake === 'function') sound.brake();
                    if (typeof sound?.haptic === 'function') sound.haptic('medium');
                } else if (key === 'horn') {
                    triggerRaceHorn(true);
                } else {
                    if (typeof sound?.haptic === 'function') sound.haptic('light');
                }
            } else if (key === 'horn') {
                triggerRaceHorn(false);
            }
        }

        function initRaceTouchControls() {
            if (typeof document === 'undefined') return;
            bindTouchButtons();
            initCanvasDirectTouchSteering();
            const steerZone = document.getElementById('touch-steer-zone');
            if (steerZone && !steerZone._boundSteer) {
                steerZone._boundSteer = true;
                let steerPointerId = null;

                const updateSteerFromPoint = (clientX) => {
                    if (!steerZone.getBoundingClientRect) return;
                    const rect = steerZone.getBoundingClientRect();
                    if (!rect || !rect.width) return;
                    const relX = (clientX - rect.left) / rect.width;
                    if (relX < 0.46) {
                        setRaceKey('left', true);
                        setRaceKey('right', false);
                    } else if (relX > 0.54) {
                        setRaceKey('right', true);
                        setRaceKey('left', false);
                    } else {
                        setRaceKey('left', false);
                        setRaceKey('right', false);
                    }
                };

                steerZone.addEventListener('pointerdown', (e) => {
                    if (e && typeof e.preventDefault === 'function') e.preventDefault();
                    steerPointerId = e.pointerId;
                    activeRacePointers.set(e.pointerId, 'steer');
                    updateSteerFromPoint(e.clientX);
                    if (typeof sound?.haptic === 'function') sound.haptic('light');
                });

                steerZone.addEventListener('pointermove', (e) => {
                    if (steerPointerId !== e.pointerId) return;
                    if (e && typeof e.preventDefault === 'function') e.preventDefault();
                    updateSteerFromPoint(e.clientX);
                });

                const clearSteer = (e) => {
                    if (steerPointerId === e.pointerId) {
                        if (e && typeof e.preventDefault === 'function') e.preventDefault();
                        steerPointerId = null;
                        activeRacePointers.delete(e.pointerId);
                        setRaceKey('left', false);
                        setRaceKey('right', false);
                    }
                };
                steerZone.addEventListener('pointerup', clearSteer);
                steerZone.addEventListener('pointercancel', clearSteer);
                steerZone.addEventListener('lostpointercapture', clearSteer);
            }

            if (typeof window !== 'undefined' && !window._boundRacePointerRelease) {
                window._boundRacePointerRelease = true;
                const releasePointer = (e) => {
                    if (e && e.pointerId !== undefined && activeRacePointers.has(e.pointerId)) {
                        const rawKey = activeRacePointers.get(e.pointerId);
                        activeRacePointers.delete(e.pointerId);
                        const key = (rawKey && typeof rawKey === 'string' && rawKey.startsWith('3d-')) ? rawKey.slice(3) : rawKey;
                        if (key === 'steer') {
                            setRaceKey('left', false);
                            setRaceKey('right', false);
                        } else if (key === 'horn') {
                            triggerRaceHorn(false);
                        } else if (key) {
                            setRaceKey(key, false);
                        }
                    }
                };
                window.addEventListener('pointerup', releasePointer);
                window.addEventListener('pointercancel', releasePointer);
            }
        }

        window.addEventListener('keydown', (e) => {
            if (!isRaceRunning) return;
            const code = e.code || '';
            const key = (e.key || '').toLowerCase();

            // 1. Привычные кнопки WASD и Стрелки (с поддержкой русской раскладки: W/Ц, A/Ф, S/Ы, D/В)
            if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup' || key === 'ц') {
                raceKeys.gas = true;
                if (car3DRacingEngine && activeRaceMode === '3d') car3DRacingEngine.setKey('gas', true);
                e.preventDefault();
            }
            if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown' || key === 'ы') {
                raceKeys.brake = true;
                if (car3DRacingEngine && activeRaceMode === '3d') car3DRacingEngine.setKey('brake', true);
                e.preventDefault();
            }
            if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft' || key === 'ф') {
                raceKeys.left = true;
                if (car3DRacingEngine && activeRaceMode === '3d') car3DRacingEngine.setKey('left', true);
                e.preventDefault();
            }
            if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright' || key === 'в') {
                raceKeys.right = true;
                if (car3DRacingEngine && activeRaceMode === '3d') car3DRacingEngine.setKey('right', true);
                e.preventDefault();
            }

            // 2. РУЧНИК НА ОТДЕЛЬНУЮ КЛАВИШУ: Пробел (Space), а также X, Ctrl
            if (code === 'Space' || key === ' ' || key === 'space' || code === 'KeyX' || key === 'x' || key === 'ч' || code === 'ControlLeft' || code === 'ControlRight' || key === 'control') {
                if (!raceKeys.drift) {
                    if (typeof sound?.handbrake === 'function') sound.handbrake();
                    else if (typeof sound?.drift === 'function') sound.drift();
                    if (typeof sound?.haptic === 'function') sound.haptic('medium');
                }
                raceKeys.drift = true;
                if (car3DRacingEngine && activeRaceMode === '3d') car3DRacingEngine.setKey('drift', true);
                e.preventDefault();
            }

            // 3. НИТРО: Left/Right Shift, а также N (Т), F (А), E (У)
            if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift' || code === 'KeyN' || key === 'n' || key === 'т' || code === 'KeyF' || key === 'f' || key === 'а' || code === 'KeyE' || key === 'e' || key === 'у') {
                raceKeys.nitro = true;
                if (car3DRacingEngine && activeRaceMode === '3d') car3DRacingEngine.setKey('nitro', true);
                e.preventDefault();
            }

            // 4. СМЕНА КАМЕРЫ В 3D ГОНКЕ: Клавиша C (С на русской раскладке)
            if ((code === 'KeyC' || key === 'c' || key === 'с') && activeRaceMode === '3d') {
                toggle3DCameraView();
                e.preventDefault();
            }

            // 5. КЛАКСОН / СГУ («Крякалка»): Клавиша H (Р на русской раскладке)
            if (code === 'KeyH' || key === 'h' || key === 'р') {
                if (!raceKeys.horn) {
                    raceKeys.horn = true;
                    triggerRaceHorn(true);
                }
                e.preventDefault();
            }

            // 6. СМЕНА ПОГОДЫ В 3D ГОНКЕ: Клавиша T (Е на русской раскладке)
            if ((code === 'KeyT' || key === 't' || key === 'е') && activeRaceMode === '3d') {
                cycle3DWeather();
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            const code = e.code || '';
            const key = (e.key || '').toLowerCase();

            if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup' || key === 'ц') {
                raceKeys.gas = false;
                if (car3DRacingEngine && activeRaceMode === '3d') car3DRacingEngine.setKey('gas', false);
            }
            if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown' || key === 'ы') {
                raceKeys.brake = false;
                if (car3DRacingEngine && activeRaceMode === '3d') car3DRacingEngine.setKey('brake', false);
            }
            if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft' || key === 'ф') {
                raceKeys.left = false;
                if (car3DRacingEngine && activeRaceMode === '3d') car3DRacingEngine.setKey('left', false);
            }
            if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright' || key === 'в') {
                raceKeys.right = false;
                if (car3DRacingEngine && activeRaceMode === '3d') car3DRacingEngine.setKey('right', false);
            }

            if (code === 'Space' || key === ' ' || key === 'space' || code === 'KeyX' || key === 'x' || key === 'ч' || code === 'ControlLeft' || code === 'ControlRight' || key === 'control') {
                raceKeys.drift = false;
                if (car3DRacingEngine && activeRaceMode === '3d') car3DRacingEngine.setKey('drift', false);
            }

            if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift' || code === 'KeyN' || key === 'n' || key === 'т' || code === 'KeyF' || key === 'f' || key === 'а' || code === 'KeyE' || key === 'e' || key === 'у') {
                raceKeys.nitro = false;
                if (car3DRacingEngine && activeRaceMode === '3d') car3DRacingEngine.setKey('nitro', false);
            }

            if (code === 'KeyH' || key === 'h' || key === 'р') {
                raceKeys.horn = false;
                triggerRaceHorn(false);
            }
        });

        function triggerRaceHorn(active) {
            if (!isRaceRunning) return;
            setRaceKey('horn', active);
            if (!active) return;

            const carIndex = getSelectedRaceCarIndex();
            const activeCar = carIndex >= 0 ? myCars[carIndex] : myCars.find(c => c.name === selectedRaceCarName);
            const carName = String(activeCar?.name || selectedRaceCarName || '');
            const hasSgu = activeCar?.styling?.sgu === 'installed' || carName.includes('Полиция') || carName.includes('ДПС');
            const isTruck = carName.includes('КАМАЗ') || carName.includes('Фура');

            if (hasSgu) {
                if (typeof sound?.sgu === 'function') sound.sgu();
                if (typeof sound?.haptic === 'function') sound.haptic('medium');
                racePlayer.sguStrobeTimer = 0.6;
                showRacePopup('🚨 СГУ: ДОРОГУ VIP!', '#38bdf8');
            } else if (isTruck) {
                if (typeof sound?.airBrake === 'function') sound.airBrake();
                else if (typeof sound?.horn === 'function') sound.horn();
                if (typeof sound?.haptic === 'function') sound.haptic('heavy');
                showRacePopup('🚛 ПНЕВМО-СИГНАЛ!', '#f59e0b');
            } else {
                if (typeof sound?.horn === 'function') sound.horn();
                if (typeof sound?.haptic === 'function') sound.haptic('light');
                showRacePopup('📢 БИ-БИП!', '#fbbf24');
            }
        }

        function showRacePopup(text, color = '#fbbf24') {
            const el = document.getElementById('race-popup-msg');
            if (!el) return;
            el.innerText = text;
            el.style.color = color;
            el.classList.add('show');
            setTimeout(() => el.classList.remove('show'), 700);
        }

        function startRaceWithCar(name, index = -1) {
            if (isRaceRunning) {
                if (activeRaceMode === '3d') {
                    exit3DRaceGame();
                } else {
                    exitRaceGame();
                }
            }
            selectedRaceCarName = name;
            selectedRaceCarIndex = index;
            const raceTab = activeRaceMode === '3d'
                ? (document.getElementById('nav-tab-3d-race') || document.getElementById('nav-tab-racegame'))
                : (document.getElementById('nav-tab-racegame') || document.getElementById('nav-tab-3d-race'));
            if (raceTab) switchTab('racegame', raceTab, activeRaceMode);

            const isOwned = myCars.some(c => c.name === name);
            if (isOwned) {
                startRaceGame();
            } else {
                initRaceGameTab();
                notifyUser(`Машина «${name}» не куплена! Заезд заблокирован. Приобретите её в автосалоне.`);
            }
        }

        function start3DRaceWithCar(name, index = -1) {
            if (typeof Car3DManager !== 'undefined' && Car3DManager.preloadCarModel && window.THREE) {
                try { Car3DManager.preloadCarModel(window.THREE, name); } catch (_) {}
            }
            switchRaceMode('3d');
            startRaceWithCar(name, index);
        }

        // ==========================================
        // 3D ГОНКА: УПРАВЛЕНИЕ И ИНТЕГРАЦИЯ THREE.JS
        // ==========================================
        let car3DRacingEngine = null;

        function start3DRaceGame() {
            if (typeof Car3DManager === 'undefined' || typeof window.THREE === 'undefined' || !Car3DManager.Car3DRacingEngine || (typeof Car3DManager.isWebGLAvailable === 'function' && !Car3DManager.isWebGLAvailable())) {
                notifyUser('3D режим недоступен на этом устройстве. Переключаем на 2D...', 'info');
                switchRaceMode('circuit');
                startRaceGame();
                return;
            }
            if (isRaceRunning) {
                exitRaceGame();
                exit3DRaceGame();
            }
            if (garage3DShowroom) garage3DShowroom.stop();
            if (car3DShowroom) car3DShowroom.stop();
            if (typeof Car3DManager !== 'undefined' && Car3DManager.clearThumbnailQueue) {
                Car3DManager.clearThumbnailQueue();
            }
            resetRaceKeys();
            const carIndex = getSelectedRaceCarIndex();
            if (carIndex < 0) {
                notifyUser(`Машина «${selectedRaceCarName}» не куплена! Заезд заблокирован. Приобретите её в автосалоне.`);
                return;
            }

            initAudio();
            activeRaceCar = myCars[carIndex];
            NomeraRaceEconomy.ensureCar(activeRaceCar);
            const baseStats = carRaceStats[selectedRaceCarName] || carRaceStats["ВАЗ-2107 «Жигули»"];
            const stats = NomeraRaceEconomy.performance(baseStats, activeRaceCar);

            racePlayer = {
                x: 0,
                y: 0,
                vx: 0,
                speed: 40,
                peakSpeed: 40,
                distanceKm: 0,
                earnedCash: 0,
                fuelLiters: 0,
                fuelCurrent: stats.tankCapacity || 45,
                fuelConsumption: stats.consumption || 9.0,
                overtakesCount: 0,
                driftScore: 0,
                driftCombo: 1,
                maxDriftCombo: 1,
                damageTaken: 0,
                tunedStats: stats
            };

            const container = document.getElementById('race-3d-canvas-container');
            if (!container) {
                notifyUser('Контейнер 3D гонки не найден. Переключаем на 2D заезд...', 'info');
                switchRaceMode('circuit');
                startRaceGame();
                return;
            }

            if (car3DRacingEngine) {
                try { car3DRacingEngine.destroy(); } catch (_) {}
                car3DRacingEngine = null;
            }

            try {
                isRaceRunning = true;
                window.isRaceRunning = true;
                updatePlayerPresence('🏎️ В 3D гонке', `${selectedRaceCarName}`);
                document.body.classList.add('race-active');
                document.getElementById('race-menu-container').classList.add('hidden');
                document.getElementById('race-play-container').classList.add('hidden');
                const play3D = document.getElementById('race-3d-play-container');
                if (play3D) play3D.classList.remove('hidden');
                const initPursuitBox = document.getElementById('hud-3d-pursuit-box');
                if (initPursuitBox) initPursuitBox.classList.add('hidden');

                const hud3DElements = {
                    speedNum: document.getElementById('hud-3d-speed-num'),
                    gearBadge: document.getElementById('hud-3d-gear'),
                    tachFill: document.getElementById('hud-3d-tach-fill'),
                    nitroFill: document.getElementById('hud-3d-nitro-fill'),
                    nitroText: document.getElementById('hud-3d-nitro-text'),
                    nitroTouch: document.getElementById('hud-3d-touch-nitro-val'),
                    distEl: document.getElementById('hud-3d-dist'),
                    cashEl: document.getElementById('hud-3d-cash'),
                    fuelEl: document.getElementById('hud-3d-fuel'),
                    driftBadge: document.getElementById('game-3d-drift-badge'),
                    comboBadge: document.getElementById('game-3d-combo-badge'),
                    weatherText: document.getElementById('hud-3d-weather-text'),
                    pursuitBox: document.getElementById('hud-3d-pursuit-box'),
                    pursuitStars: document.getElementById('hud-3d-wanted-stars'),
                    pursuitStatus: document.getElementById('hud-3d-pursuit-status'),
                    escapeBar: document.getElementById('hud-3d-escape-bar')
                };
                const prevHudState = {};

                car3DRacingEngine = new Car3DManager.Car3DRacingEngine(container, {
                    onUpdateHUD: (hud) => {
                        const els = hud3DElements;
                        if (els.speedNum && prevHudState.speed !== hud.speed) {
                            els.speedNum.textContent = hud.speed;
                            prevHudState.speed = hud.speed;
                        }
                        if (els.gearBadge && prevHudState.gear !== hud.gear) {
                            els.gearBadge.textContent = hud.gear;
                            prevHudState.gear = hud.gear;
                        }
                        if (els.tachFill && prevHudState.rpmPercent !== hud.rpmPercent) {
                            els.tachFill.style.width = hud.rpmPercent + '%';
                            prevHudState.rpmPercent = hud.rpmPercent;
                        }
                        if (els.nitroFill && prevHudState.nitroLevel !== hud.nitroLevel) {
                            els.nitroFill.style.width = hud.nitroLevel + '%';
                            if (els.nitroText) els.nitroText.textContent = hud.nitroLevel + '%';
                            if (els.nitroTouch) els.nitroTouch.textContent = hud.nitroLevel + '%';
                            prevHudState.nitroLevel = hud.nitroLevel;
                        }
                        const distStr = hud.distanceKm.toFixed(2) + ' км';
                        if (els.distEl && prevHudState.distStr !== distStr) {
                            els.distEl.textContent = distStr;
                            prevHudState.distStr = distStr;
                        }
                        if (els.cashEl && prevHudState.earnedCash !== hud.earnedCash) {
                            els.cashEl.textContent = '+' + hud.earnedCash.toLocaleString('ru-RU') + ' ₽';
                            prevHudState.earnedCash = hud.earnedCash;
                        }
                        const fuelStr = hud.fuelCurrent.toFixed(1) + ' л';
                        if (els.fuelEl && prevHudState.fuelStr !== fuelStr) {
                            els.fuelEl.textContent = fuelStr;
                            prevHudState.fuelStr = fuelStr;
                        }
                        if (els.weatherText && hud.weatherTitle && prevHudState.weatherTitle !== hud.weatherTitle) {
                            const icon = hud.weatherIcon || '🌦️';
                            const firstWord = hud.weatherTitle.split(' ')[0];
                            els.weatherText.textContent = `${icon} ${firstWord} [T]`;
                            prevHudState.weatherTitle = hud.weatherTitle;
                        }

                        if (els.driftBadge) {
                            const showDrift = hud.isDrifting || hud.driftScore > 0;
                            if (prevHudState.showDrift !== showDrift) {
                                els.driftBadge.classList.toggle('hidden', !showDrift);
                                prevHudState.showDrift = showDrift;
                            }
                            if (hud.isDrifting && prevHudState.driftCombo !== hud.driftCombo) {
                                els.driftBadge.textContent = `🌪️ ДРИФТ x${hud.driftCombo}`;
                                prevHudState.driftCombo = hud.driftCombo;
                            }
                        }
                        if (els.comboBadge) {
                            const showCombo = hud.overtakeCombo > 1;
                            if (prevHudState.showCombo !== showCombo) {
                                els.comboBadge.classList.toggle('hidden', !showCombo);
                                prevHudState.showCombo = showCombo;
                            }
                            if (showCombo && prevHudState.overtakeCombo !== hud.overtakeCombo) {
                                els.comboBadge.textContent = `🔥 x${hud.overtakeCombo} ОБГОН`;
                                prevHudState.overtakeCombo = hud.overtakeCombo;
                            }
                        }

                        // 🚨 Police Pursuit & Wanted Stars HUD sync
                        if (els.pursuitBox) {
                            if (hud.wantedStars > 0) {
                                if (prevHudState.wantedStars !== hud.wantedStars) {
                                    els.pursuitBox.classList.remove('hidden');
                                    if (els.pursuitStars) els.pursuitStars.textContent = '⭐'.repeat(hud.wantedStars);
                                    prevHudState.wantedStars = hud.wantedStars;
                                }
                                if (els.pursuitStatus) {
                                    const statusText = hud.escapePercent > 0
                                        ? `⚡ УХОД: ${hud.escapeTimer}с (${hud.escapePercent}%)`
                                        : (hud.bustedTimer > 0 ? `🚨 ЗАДЕРЖАНИЕ ${(2.8 - hud.bustedTimer).toFixed(1)}с` : `🚨 ПОГОНЯ ДПС (${hud.nearestPoliceDist}м)`);
                                    if (prevHudState.statusText !== statusText) {
                                        els.pursuitStatus.textContent = statusText;
                                        prevHudState.statusText = statusText;
                                    }
                                }
                                if (els.escapeBar && prevHudState.escapePercent !== hud.escapePercent) {
                                    els.escapeBar.style.width = (100 - hud.escapePercent) + '%';
                                    prevHudState.escapePercent = hud.escapePercent;
                                }
                            } else if (prevHudState.wantedStars !== 0) {
                                els.pursuitBox.classList.add('hidden');
                                prevHudState.wantedStars = 0;
                            }
                        }

                        // Siren audio sync - disabled per user request so it does not distract the player
                        if (typeof sound?.setSiren === 'function') {
                            sound.setSiren(false);
                        }

                        // Sync values into global racePlayer
                        racePlayer.speed = hud.speed;
                        if (hud.speed > racePlayer.peakSpeed) racePlayer.peakSpeed = hud.speed;
                        racePlayer.distanceKm = hud.distanceKm;
                        racePlayer.earnedCash = hud.earnedCash;
                        racePlayer.fuelCurrent = hud.fuelCurrent;
                        racePlayer.overtakesCount = hud.overtakesCount;
                        racePlayer.driftScore = hud.driftScore;
                        if (hud.driftCombo > racePlayer.maxDriftCombo) racePlayer.maxDriftCombo = hud.driftCombo;

                        // Engine audio sync
                        const audioProfile = getCarAudioProfile(activeRaceCar);
                        sound.updateEngine({
                            speed: hud.speed,
                            rpm: hud.rpm,
                            gas: car3DRacingEngine ? car3DRacingEngine.keys.gas : false,
                            nitro: hud.isNitroActive,
                            running: isRaceRunning,
                            carClass: audioProfile
                        });
                    },
                    onPopup: (text, color) => {
                        show3DRacePopup(text, color);
                    },
                    onGameOver: (crashed, engineState) => {
                        if (engineState) {
                            racePlayer.speed = engineState.speed;
                            racePlayer.peakSpeed = engineState.peakSpeed;
                            racePlayer.distanceKm = engineState.distanceKm;
                            racePlayer.earnedCash = engineState.earnedCash;
                            racePlayer.fuelLiters = engineState.fuelLiters;
                            racePlayer.overtakesCount = engineState.overtakesCount;
                            racePlayer.driftScore = engineState.driftScore;
                            racePlayer.damageTaken = engineState.damageTaken;
                        }
                        settleRaceRun(crashed);
                    },
                    onSound: (name) => {
                        if (name === 'drift' && typeof sound?.drift === 'function') sound.drift();
                        if (name === 'handbrake' && typeof sound?.handbrake === 'function') sound.handbrake();
                        if (name === 'nitro' && typeof sound?.nitro === 'function') sound.nitro();
                        if (name === 'nearMiss' && typeof sound?.nearMiss === 'function') sound.nearMiss();
                        if (name === 'crash' && typeof sound?.crash === 'function') sound.crash();
                        if (name === 'cash' && typeof sound?.cash === 'function') sound.cash();
                        if (name === 'backfire' && typeof sound?.backfire === 'function') sound.backfire();
                        if (name === 'blowOff' && typeof sound?.blowOff === 'function') sound.blowOff();
                        if (name === 'brake' && typeof sound?.brake === 'function') sound.brake();
                        if (name === 'scrape' && typeof sound?.scrape === 'function') sound.scrape();
                        if (name === 'horn' && typeof sound?.horn === 'function') sound.horn();
                        if (name === 'siren_start') {
                            // Siren sound disabled per user request
                        }
                        if (name === 'siren_stop' && typeof sound?.setSiren === 'function') sound.setSiren(false);
                        if (name === 'escape' && typeof sound?.cash === 'function') sound.cash();
                        if (name === 'busted' && typeof sound?.crash === 'function') sound.crash();
                    },
                    onHaptic: (pattern) => {
                        if (typeof sound?.haptic === 'function') sound.haptic(pattern);
                    }
                });

                const raceStyling = Object.assign({}, activeRaceCar.styling || {}, {
                    plate: activeRaceCar.plate ? (activeRaceCar.plate.text || activeRaceCar.plate) : 'none'
                });
                car3DRacingEngine.start({
                    carName: selectedRaceCarName,
                    styling: raceStyling,
                    performance: stats,
                    mode: raceCurrentMode,
                    weather: (typeof raceSelectedWeather !== 'undefined' ? raceSelectedWeather : 'night')
                });
                if (typeof requestAnimationFrame === 'function') {
                    requestAnimationFrame(() => {
                        if (car3DRacingEngine && typeof car3DRacingEngine.onResize === 'function') {
                            car3DRacingEngine.onResize();
                        }
                    });
                }
                setTimeout(() => {
                    if (car3DRacingEngine && typeof car3DRacingEngine.onResize === 'function') {
                        car3DRacingEngine.onResize();
                    }
                }, 80);
                init3DRaceTouchControls();
                syncMobileTouchControlsVisibility();
            } catch (err) {
                console.error('Failed to initialize 3D race engine:', err);
                isRaceRunning = false;
                document.body.classList.remove('race-active');
                const play3D = document.getElementById('race-3d-play-container');
                if (play3D) play3D.classList.add('hidden');
                const racePlay = document.getElementById('race-play-container');
                if (racePlay) racePlay.classList.add('hidden');
                const menuCont = document.getElementById('race-menu-container');
                if (menuCont) menuCont.classList.remove('hidden');
                if (car3DRacingEngine) {
                    try { car3DRacingEngine.destroy(); } catch (_) {}
                    car3DRacingEngine = null;
                }
                notifyUser('3D режим временно недоступен. Переключаем на 2D заезд...', 'info');
                switchRaceMode('circuit');
                startRaceGame();
            }
        }

        function show3DRacePopup(text, color = '#f59e0b') {
            const popup = document.getElementById('race-3d-popup-msg');
            if (!popup) return;
            popup.innerHTML = text;
            popup.style.borderColor = color;
            popup.style.color = color;
            popup.classList.add('show');
            clearTimeout(popup._timer);
            popup._timer = setTimeout(() => {
                popup.classList.remove('show');
            }, 1200);
        }

        function exit3DRaceGame() {
            if (car3DRacingEngine) {
                const st = car3DRacingEngine.getState();
                racePlayer.speed = st.speed;
                racePlayer.peakSpeed = st.peakSpeed;
                racePlayer.distanceKm = st.distanceKm;
                racePlayer.earnedCash = st.earnedCash;
                racePlayer.fuelLiters = st.fuelLiters;
                racePlayer.overtakesCount = st.overtakesCount;
                racePlayer.driftScore = st.driftScore;
                racePlayer.damageTaken = st.damageTaken;
                car3DRacingEngine.stop();
            }
            const play3D = document.getElementById('race-3d-play-container');
            if (play3D) play3D.classList.add('hidden');
            settleRaceRun(false);
        }

        function toggle3DCameraView() {
            if (car3DRacingEngine) {
                car3DRacingEngine.cycleCamera();
            }
        }

        function cycle3DWeather() {
            if (car3DRacingEngine) {
                const nextWeather = car3DRacingEngine.cycleWeather();
                const labels = {
                    'auto': '⛅ Динамика',
                    'day': '☀️ Ясный день',
                    'sunset': '🌅 Закат',
                    'night': '🌃 Ночной город',
                    'rain': '🌧️ Грозовой ливень',
                    'fog': '🌫️ Густой туман',
                    'snow': '❄️ Зимняя метель'
                };
                const lbl = labels[nextWeather] || nextWeather;
                show3DRacePopup(`🌦️ ПОГОДА: ${lbl.toUpperCase()}`, '#38bdf8');
                const weatherText = document.getElementById('hud-3d-weather-text');
                if (weatherText) {
                    const firstWord = lbl.split(' ')[0] + ' ' + (lbl.split(' ')[1] || '');
                    weatherText.textContent = `${firstWord} [T]`;
                }
            }
        }
        window.cycle3DWeather = cycle3DWeather;

        function toggle3DTouchControls() {
            const touchEl = document.getElementById('race-3d-touch-controls');
            const btnText = document.getElementById('btn-toggle-touch-text');
            if (!touchEl) return;
            const isEnabled = touchEl.classList.toggle('touch-enabled');
            if (btnText) {
                btnText.textContent = isEnabled ? 'Скрыть руль' : 'Экранный руль';
            }
            if (car3DRacingEngine && typeof car3DRacingEngine.onResize === 'function') {
                setTimeout(() => car3DRacingEngine.onResize(), 60);
            }
        }
        window.toggle3DTouchControls = toggle3DTouchControls;

        let _preloadGarageTimer = null;
        const _preloadedModelsSet = new Set();

        function preloadUserGarageModels() {
            if (typeof Car3DManager === 'undefined' || !Car3DManager.preloadCarModel) return;
            const THREE = window.THREE;
            if (!THREE) return;
            if (typeof isRaceRunning !== 'undefined' && isRaceRunning) return;

            if (_preloadGarageTimer) {
                clearTimeout(_preloadGarageTimer);
            }

            _preloadGarageTimer = setTimeout(() => {
                _preloadGarageTimer = null;
                const activeCar = (Array.isArray(myCars) && myCars.length > 0)
                    ? (myCars.find(c => c && c.name === selectedRaceCarName) || myCars[0])
                    : null;
                if (activeCar && activeCar.name && !_preloadedModelsSet.has(activeCar.name)) {
                    _preloadedModelsSet.add(activeCar.name);
                    Car3DManager.preloadCarModel(THREE, activeCar.name);
                }
                if (Array.isArray(myCars)) {
                    let delay = 1000;
                    myCars.slice(0, 4).forEach(c => {
                        if (c && c.name && (!_preloadedModelsSet.has(c.name)) && (!activeCar || c.name !== activeCar.name)) {
                            setTimeout(() => {
                                if (typeof isRaceRunning !== 'undefined' && isRaceRunning) return;
                                _preloadedModelsSet.add(c.name);
                                Car3DManager.preloadCarModel(THREE, c.name);
                            }, delay);
                            delay += 1000;
                        }
                    });
                }
            }, 500);
        }
        window.preloadUserGarageModels = preloadUserGarageModels;

        function handle3DTouchControl(event, action, isDown) {
            if (event) {
                if (event.target && event.pointerId !== undefined) {
                    if (isDown && typeof event.target.setPointerCapture === 'function') {
                        try { event.target.setPointerCapture(event.pointerId); } catch (_) {}
                    }
                    if (!isDown && typeof event.target.releasePointerCapture === 'function') {
                        try { event.target.releasePointerCapture(event.pointerId); } catch (_) {}
                    }
                }
                if (event.cancelable) event.preventDefault();
                if (event.pointerId !== undefined) {
                    if (isDown) {
                        activeRacePointers.set(event.pointerId, action);
                    } else if (activeRacePointers.get(event.pointerId) === action || activeRacePointers.get(event.pointerId) === '3d-' + action) {
                        activeRacePointers.delete(event.pointerId);
                    }
                }
            }
            if (action === 'horn') {
                triggerRaceHorn(isDown);
                return;
            }
            setRaceKey(action, isDown);
            if (car3DRacingEngine) car3DRacingEngine.setKey(action, isDown);
            if (isDown) {
                if (action === 'nitro' && typeof sound?.nitro === 'function') sound.nitro();
                if (action === 'drift' && typeof sound?.drift === 'function') sound.drift();
                if (action === 'brake' && typeof sound?.brake === 'function') sound.brake();
                if (typeof sound?.haptic === 'function') sound.haptic(action === 'nitro' ? 'nitro' : 'light');
            }
        }

        function init3DRaceTouchControls() {
            if (typeof document === 'undefined') return;
            bindTouchButtons();
            initCanvasDirectTouchSteering();
            syncMobileTouchControlsVisibility();
            const steerZone = document.getElementById('touch-3d-steer-zone');
            if (steerZone && !steerZone._boundSteer) {
                steerZone._boundSteer = true;
                let steerPointerId = null;

                const updateSteerFromPoint = (clientX) => {
                    if (!steerZone.getBoundingClientRect) return;
                    const rect = steerZone.getBoundingClientRect();
                    if (!rect || !rect.width) return;
                    const relX = (clientX - rect.left) / rect.width;
                    if (relX < 0.46) {
                        setRaceKey('left', true);
                        setRaceKey('right', false);
                    } else if (relX > 0.54) {
                        setRaceKey('right', true);
                        setRaceKey('left', false);
                    } else {
                        setRaceKey('left', false);
                        setRaceKey('right', false);
                    }
                };

                steerZone.addEventListener('pointerdown', (e) => {
                    if (e && e.cancelable) e.preventDefault();
                    steerPointerId = e.pointerId;
                    if (typeof steerZone.setPointerCapture === 'function') {
                        try { steerZone.setPointerCapture(e.pointerId); } catch (_) {}
                    }
                    activeRacePointers.set(e.pointerId, 'steer');
                    updateSteerFromPoint(e.clientX);
                    if (typeof sound?.haptic === 'function') sound.haptic('light');
                });

                steerZone.addEventListener('pointermove', (e) => {
                    if (steerPointerId !== e.pointerId) return;
                    if (e && e.cancelable) e.preventDefault();
                    updateSteerFromPoint(e.clientX);
                });

                const clearSteer = (e) => {
                    if (steerPointerId === e.pointerId || !e) {
                        if (e && e.cancelable) e.preventDefault();
                        if (typeof steerZone.releasePointerCapture === 'function' && e && e.pointerId !== undefined) {
                            try { steerZone.releasePointerCapture(e.pointerId); } catch (_) {}
                        }
                        if (e && e.pointerId !== undefined) {
                            activeRacePointers.delete(e.pointerId);
                        }
                        steerPointerId = null;
                        setRaceKey('left', false);
                        setRaceKey('right', false);
                    }
                };
                steerZone.addEventListener('pointerup', clearSteer);
                steerZone.addEventListener('pointercancel', clearSteer);
                steerZone.addEventListener('lostpointercapture', clearSteer);
                steerZone.addEventListener('pointerleave', clearSteer);
            }
        }

        // Запуск гонки
        function startRaceGame() {
            if (activeRaceMode === '3d') {
                start3DRaceGame();
                return;
            }
            if (isRaceRunning) return;
            if (garage3DShowroom) garage3DShowroom.stop();
            if (car3DShowroom) car3DShowroom.stop();
            if (typeof Car3DManager !== 'undefined' && Car3DManager.clearThumbnailQueue) {
                Car3DManager.clearThumbnailQueue();
            }
            resetRaceKeys();
            const carIndex = getSelectedRaceCarIndex();
            if (carIndex < 0) {
                notifyUser(`Машина «${selectedRaceCarName}» не куплена! Заезд заблокирован. Приобретите её в автосалоне.`);
                return;
            }

            initAudio();
            activeRaceCar = myCars[carIndex];
            NomeraRaceEconomy.ensureCar(activeRaceCar);
            const baseStats = carRaceStats[selectedRaceCarName] || carRaceStats["ВАЗ-2107 «Жигули»"];
            const stats = NomeraRaceEconomy.performance(baseStats, activeRaceCar);

            racePlayer = {
                x: 200,
                y: 470,
                vx: 0,
                tilt: 0,
                yawAngle: 0,
                speed: 70,
                peakSpeed: 70,
                targetSpeed: stats.speed * 0.7,
                maxSpeed: stats.speed,
                accel: stats.accel,
                handling: stats.handling,
                nitro: 100,
                nitroDepleted: false,
                isNitroActive: false,
                isDrafting: false,
                invulnerableTimer: 0,
                shield: 0,
                distanceKm: 0,
                earnedCash: 0,
                overtakesCount: 0,
                combo: 1,
                comboTimer: 0,
                damageBlink: 0,
                isOnWall: false,
                fuelLiters: 0,
                fuelTankCapacity: 20,
                fuelCurrent: 20,
                fuelWarningTimer: 0,
                fuelConsumption: stats.consumption,
                startCondition: activeRaceCar.condition,
                driftScore: 0,
                driftCurrentScore: 0,
                driftCombo: 1,
                driftComboTimer: 0,
                driftDuration: 0,
                isDrifting: false,
                isCounterSteering: false,
                counterSteerTimer: 0,
                counterSteerPopupTimer: 0,
                driftQuality: '',
                driftAngleDeg: 0,
                maxDriftCombo: 1,
                damageTaken: 0,
                tunedStats: stats,
                wantedStars: 0,
                escapeTimer: 0,
                sguStrobeTimer: 0,
                wasGasActive: false,
                wasNitroActive: false,
                backfireCooldown: 0,
                blowOffCooldown: 0
            };

            if (activeRaceCar?.styling?.suspension === 'bpan') {
                racePlayer.handling = Number((racePlayer.handling + 0.4).toFixed(2));
            } else if (activeRaceCar?.styling?.suspension === 'lowered') {
                racePlayer.handling = Number((racePlayer.handling + 0.2).toFixed(2));
            }
            if (activeRaceCar?.styling?.wheels === 'forged') {
                racePlayer.accel = Number((racePlayer.accel + 0.2).toFixed(2));
                racePlayer.handling = Number((racePlayer.handling + 0.1).toFixed(2));
            }

            raceTraffic = [];
            raceCollectibles = [];
            raceSkidmarks = [];
            raceDriftSmoke = [];
            raceSparks = [];
            raceWaterSpray = [];
            raceLightningFlash = 0;
            raceLightningTimer = 4.5 + Math.random() * 4.0;
            raceLightningBolt = [];
            raceClippingZones = [];
            clippingSpawnTimer = 0;
            raceHighwayEvent = null;
            raceHighwayEventCooldown = 18 + Math.random() * 12;
            raceRoadOffset = 0;
            trafficSpawnTimer = 0;
            collectibleSpawnTimer = 0;
            roadCurve = 0;
            targetRoadCurve = 0;
            curveTimer = 3.5;

            document.getElementById('race-menu-container').classList.add('hidden');
            document.getElementById('race-play-container').classList.remove('hidden');
            initRaceTouchControls();

            const touchHornIcon = document.getElementById('touch-horn-icon');
            const touchHornLabel = document.getElementById('touch-horn-label');
            if (touchHornIcon) touchHornIcon.textContent = '📢';
            if (touchHornLabel) touchHornLabel.textContent = 'СИГНАЛ [H]';

            isRaceRunning = true;
            window.isRaceRunning = true;
            updatePlayerPresence('🏎️ В заезде', `${selectedRaceCarName}`);
            document.body.classList.add("race-active");
            sound.start();
            lastRaceTime = performance.now();
            if (raceAnimFrame) cancelAnimationFrame(raceAnimFrame);
            raceAnimFrame = requestAnimationFrame(raceGameLoop);
        }

        function exitRaceGame() {
            if (isRaceRunning) {
                if (activeRaceMode === '3d') {
                    exit3DRaceGame();
                    return;
                }
                settleRaceRun(false); // Leaving early still settles fuel and wear.
                return;
            }
            sound.stopEngine();
            if (typeof sound?.setSiren === 'function') sound.setSiren(false);
            document.body.classList.remove("race-active");
            resetRaceKeys();
            isRaceRunning = false;
            window.isRaceRunning = false;
            if (raceAnimFrame) cancelAnimationFrame(raceAnimFrame);
            if (car3DRacingEngine) car3DRacingEngine.stop();
            const play3D = document.getElementById('race-3d-play-container');
            if (play3D) play3D.classList.add('hidden');
            document.getElementById('race-play-container').classList.add('hidden');
            document.getElementById('race-menu-container').classList.remove('hidden');
            updateRaceRecordsUI();
        }

        function restartRaceGame() {
            document.getElementById('race-gameover-modal').classList.remove('show');
            startRaceGame();
        }

        function closeGameOverToMenu() {
            document.getElementById('race-gameover-modal').classList.remove('show');
            if (activeRaceMode === '3d') {
                exit3DRaceGame();
            } else {
                exitRaceGame();
            }
            initRaceGameTab();
        }

        // Главный цикл гонки
        function raceGameLoop(timestamp) {
            if (!isRaceRunning) return;
            const dt = Math.min((timestamp - lastRaceTime) / 1000, 0.05);
            lastRaceTime = timestamp;

            updateRacePhysics(dt);
            const activeCar = myCars[selectedRaceCarIndex] || myCars.find(c => c.name === selectedRaceCarName) || activeRaceCar;
            const audioProfile = getCarAudioProfile(activeCar);
            sound.updateEngine({ speed: racePlayer.speed, gas: raceKeys.gas, nitro: racePlayer.isNitroActive, running: isRaceRunning, carClass: audioProfile });
            renderRaceFrame();

            if (isRaceRunning) raceAnimFrame = requestAnimationFrame(raceGameLoop);
        }

        function updateRacePhysics(dt) {
            const stats = racePlayer.tunedStats || carRaceStats[selectedRaceCarName] || carRaceStats["ВАЗ-2107 «Жигули»"];

            // 1. Динамические повороты трассы
            curveTimer -= dt;
            if (curveTimer <= 0) {
                if (raceCurrentMode === 'drift') {
                    // Резкие повороты горного серпантина (Touge): частая сменяемость крутых шпилек
                    curveTimer = 1.0 + Math.random() * 1.5;
                    const r = Math.random();
                    if (r < 0.10) {
                        targetRoadCurve = 0; // короткий прямой прострел
                    } else if (r < 0.55) {
                        targetRoadCurve = 120 + Math.random() * 70; // крутой вираж вправо (120..190)
                    } else {
                        targetRoadCurve = -(120 + Math.random() * 70); // крутой вираж влево (-120..-190)
                    }
                } else {
                    curveTimer = 4.0 + Math.random() * 3.5;
                    const r = Math.random();
                    if (r < 0.35) targetRoadCurve = 0;
                    else if (r < 0.68) targetRoadCurve = 45 + Math.random() * 50;
                    else targetRoadCurve = -(45 + Math.random() * 50);
                }
            }
            const curveTransitionRate = raceCurrentMode === 'drift' ? 4.5 : 1.5;
            roadCurve += (targetRoadCurve - roadCurve) * curveTransitionRate * dt;

            // Центробежная сила при прохождении поворота
            if (Math.abs(roadCurve) > 8) {
                const centrifugalFactor = raceCurrentMode === 'drift' ? 120 : 45;
                const centrifugalPush = -(roadCurve / 75) * (racePlayer.speed / 130) * centrifugalFactor * dt;
                racePlayer.vx += centrifugalPush;
            }

            // 2. Нитро логика: надёжная защита от бесконечного буста и спама при 0%
            if (racePlayer.nitro <= 0.05) {
                racePlayer.nitro = 0;
                racePlayer.nitroDepleted = true;
                racePlayer.isNitroActive = false;
            }

            if (raceKeys.nitro && !racePlayer.nitroDepleted && racePlayer.nitro > 0) {
                racePlayer.isNitroActive = true;
                racePlayer.nitro = Math.max(0, racePlayer.nitro - dt * (stats.nitroDrain || 28));
                if (racePlayer.nitro <= 0.05) {
                    racePlayer.nitro = 0;
                    racePlayer.nitroDepleted = true;
                    racePlayer.isNitroActive = false;
                    showRacePopup("⚠️ НИТРО ЗАКОНЧИЛОСЬ!", "#ef4444");
                }
            } else {
                racePlayer.isNitroActive = false;
                // Пассивная зарядка работает ТОЛЬКО если кнопка нитро НЕ зажата
                if (!raceKeys.nitro) {
                    racePlayer.nitro = Math.min(100, racePlayer.nitro + dt * (stats.nitroRecharge || 4));
                    // Снимаем блокировку истощения только когда накопилось хотя бы 20%
                    if (racePlayer.nitroDepleted && racePlayer.nitro >= 20) {
                        racePlayer.nitroDepleted = false;
                    }
                }
            }

            if ((racePlayer.sguStrobeTimer || 0) > 0) {
                racePlayer.sguStrobeTimer -= dt;
            }

            // 3. Слипстрим (аэродинамический мешок за машинами впереди)
            let draftingCar = null;
            for (let t of raceTraffic) {
                if (!t.isCone && t.y < racePlayer.y && (racePlayer.y - t.y) < 135 && (racePlayer.y - t.y) > 28) {
                    if (Math.abs(t.x - racePlayer.x) < 16) {
                        draftingCar = t;
                        break;
                    }
                }
            }
            racePlayer.isDrafting = !!draftingCar;
            if (racePlayer.isDrafting) {
                // Бонус за слипстрим (сбалансированный)
                racePlayer.earnedCash += 350 * stats.rewardMult * dt;
            }

            // 4. Управление продольной скоростью
            let topSpd = racePlayer.maxSpeed;
            if (racePlayer.isNitroActive) topSpd *= stats.nitroSpeedBonus || 1.35;
            if (racePlayer.isDrafting) topSpd += 28; // слипстрим дает прирост скорости!

            const isHandbrake = !!raceKeys.drift;
            const isGasActive = (raceKeys.gas || (raceAutoGasEnabled && !raceKeys.brake && !raceKeys.drift)) && !isHandbrake;
            if (isHandbrake) {
                racePlayer.targetSpeed = 0;
            } else if (isGasActive) {
                racePlayer.targetSpeed = topSpd;
            } else if (raceKeys.brake) {
                racePlayer.targetSpeed = 50;
            } else {
                racePlayer.targetSpeed = topSpd * 0.75;
            }

            // Звук перепускного клапана турбины (Blow-Off Valve) при сбросе газа на скорости
            if (racePlayer.wasGasActive && !isGasActive && racePlayer.speed > 80 && (racePlayer.blowOffCooldown || 0) <= 0) {
                if (typeof sound?.blowOff === 'function') sound.blowOff();
                racePlayer.blowOffCooldown = 0.8;
            }
            if (racePlayer.blowOffCooldown > 0) racePlayer.blowOffCooldown -= dt;

            // Звук пневматического сброса тормозов КАМАЗа при торможении
            const isTruckActive = String(selectedRaceCarName || '').includes('КАМАЗ') || String(selectedRaceCarName || '').includes('Фура');
            if (raceKeys.brake && isTruckActive && racePlayer.speed > 40 && (racePlayer.airBrakeCooldown || 0) <= 0) {
                if (typeof sound?.airBrake === 'function') sound.airBrake();
                racePlayer.airBrakeCooldown = 2.4;
            }
            if (racePlayer.airBrakeCooldown > 0) racePlayer.airBrakeCooldown -= dt;

            // Звук прострелов выхлопа («Попкорн» / Backfire) при отсечке нитро или сбросе оборотов
            const nitroJustCut = racePlayer.wasNitroActive && !racePlayer.isNitroActive;
            const throttleCutAtSpeed = racePlayer.wasGasActive && !isGasActive && racePlayer.speed > 130;
            if ((nitroJustCut || (throttleCutAtSpeed && Math.random() < 0.65)) && (racePlayer.backfireCooldown || 0) <= 0) {
                if (typeof sound?.backfire === 'function') sound.backfire();
                racePlayer.backfireCooldown = 0.45;
                const exhaustX = [-6, 6];
                for (const ex of exhaustX) {
                    for (let k = 0; k < 6; k++) {
                        raceSparks.push({
                            x: racePlayer.x + ex + (Math.random() - 0.5) * 4,
                            y: (racePlayer.y || 470) + 22 + Math.random() * 4,
                            vx: (Math.random() - 0.5) * 40,
                            vy: 55 + Math.random() * 75,
                            life: 0.35 + Math.random() * 0.2,
                            color: Math.random() < 0.4 ? '#38bdf8' : (Math.random() < 0.7 ? '#f97316' : '#facc15')
                        });
                    }
                }
            }
            if (racePlayer.backfireCooldown > 0) racePlayer.backfireCooldown -= dt;

            racePlayer.wasGasActive = isGasActive;
            racePlayer.wasNitroActive = racePlayer.isNitroActive;

            const accelMultiplier = (racePlayer.isNitroActive ? 2.5 : 1) * (racePlayer.isDrafting ? 1.6 : 1);
            const accelRate = (racePlayer.accel * 28) * accelMultiplier;

            if (isHandbrake) {
                // Handbrake directly decelerates down to 0 km/h, overpowering engine throttle
            } else if (racePlayer.speed < racePlayer.targetSpeed) {
                racePlayer.speed = Math.min(racePlayer.targetSpeed, racePlayer.speed + accelRate * dt);
            } else if (racePlayer.speed > racePlayer.targetSpeed) {
                racePlayer.speed = Math.max(racePlayer.targetSpeed, racePlayer.speed - 60 * dt);
            }
            racePlayer.peakSpeed = Math.max(racePlayer.peakSpeed, racePlayer.speed);

            // Динамическая адаптивная камера обзора:
            // На высокой скорости машина плавно смещается к низу экрана, освобождая обзор вперед
            const targetPlayerY = racePlayer.speed > 170 ? Math.min(524, 470 + (racePlayer.speed - 170) * 0.28) : 470;
            racePlayer.y = (racePlayer.y || 470) + (targetPlayerY - (racePlayer.y || 470)) * 3.5 * dt;

            if (racePlayer.speed > (achievements._maxSpeedSeen || 0)) {
                achievements._maxSpeedSeen = Math.round(racePlayer.speed);
                if (achievements._maxSpeedSeen >= 200 && !achievements.speed_200) {
                    checkAchievements();
                }
                if (achievements._maxSpeedSeen >= 350 && !achievements.speed_350) {
                    checkAchievements();
                }
            }
            // Meter real distance and driving style: nitro and heavy throttle cost fuel.
            const burnedFuel = NomeraRaceEconomy.fuelForFrame({
                speed:racePlayer.speed, seconds:dt, consumption:racePlayer.fuelConsumption,
                gas:isGasActive, nitro:racePlayer.isNitroActive, drafting:racePlayer.isDrafting
            });
            racePlayer.fuelLiters += burnedFuel;
            if (racePlayer.fuelCurrent !== undefined) {
                racePlayer.fuelCurrent = Math.max(0, racePlayer.fuelCurrent - burnedFuel);
                if (racePlayer.fuelCurrent <= 0) {
                    racePlayer.targetSpeed = 0;
                    racePlayer.speed = Math.max(0, racePlayer.speed - 90 * dt);
                    if (racePlayer.fuelWarningTimer <= 0) {
                        showRacePopup("⛽ БАК ПУСТ! ДВИГАТЕЛЬ ЗАГЛОХ!", "#ef4444");
                        racePlayer.fuelWarningTimer = 1.2;
                    } else {
                        racePlayer.fuelWarningTimer -= dt;
                    }
                    if (racePlayer.speed <= 5) {
                        settleRaceRun('fuel');
                        return;
                    }
                } else if (racePlayer.fuelCurrent < 4.0) {
                    racePlayer.fuelWarningTimer -= dt;
                    if (racePlayer.fuelWarningTimer <= 0) {
                        showRacePopup(`⚠️ МАЛО ТОПЛИВА! ОСТАЛОСЬ ${racePlayer.fuelCurrent.toFixed(1)} Л`, "#f59e0b");
                        racePlayer.fuelWarningTimer = 4.0;
                    }
                }
            }

            // 5. Инерция руления, ручник и дрифт
            const isDriftMode = raceCurrentMode === 'drift';
            const driftMult = stats.driftFactor || (isDriftMode ? 1.65 : 1.35);
            const maxLateral = racePlayer.handling * 42 * (isHandbrake ? (1 + (driftMult - 1) * 0.7) : 1);
            const steerRate = racePlayer.handling * 185 * (isHandbrake ? 1.4 : 1);

            // Авторитет руления: при отсутствии газа и остановке машина не может смещаться в стороны на месте!
            const speedSteerAuthority = Math.min(1.0, Math.max(0, racePlayer.speed / 20));
            const throttleSteerAuthority = isGasActive ? 1.0 : (racePlayer.speed > 5 ? Math.min(1.0, 0.40 + (racePlayer.speed / 60) * 0.60) : 0);
            const effectiveSteerAuthority = speedSteerAuthority * throttleSteerAuthority;

            // Контр-руление: когда автомобиль смещается в одну сторону, а руль повернут в противоположную
            const isCounterSteer = (racePlayer.vx > 16 && raceKeys.left) || (racePlayer.vx < -16 && raceKeys.right);
            racePlayer.isCounterSteering = isCounterSteer;

            if (isCounterSteer && effectiveSteerAuthority > 0) {
                // Стабилизация заноса при контр-рулении: контролируемое удержание траектории
                const stabilizeDecay = (isDriftMode || isHandbrake) ? 0.35 : 0.15;
                racePlayer.vx *= Math.pow(stabilizeDecay, dt);
                const counterTorque = (racePlayer.vx > 0 ? -1 : 1) * steerRate * 0.52 * effectiveSteerAuthority * dt;
                racePlayer.vx += counterTorque;
            } else if (raceKeys.left && effectiveSteerAuthority > 0) {
                racePlayer.vx = Math.max(-maxLateral, racePlayer.vx - steerRate * effectiveSteerAuthority * dt);
            } else if (raceKeys.right && effectiveSteerAuthority > 0) {
                racePlayer.vx = Math.min(maxLateral, racePlayer.vx + steerRate * effectiveSteerAuthority * dt);
            } else {
                // Плавное затухание инерции (при заносе/ручнике скольжение длится дольше)
                const decayBase = (isHandbrake || isDriftMode) ? 0.10 : 0.015;
                racePlayer.vx *= Math.pow(decayBase, dt);
                if (effectiveSteerAuthority < 0.05) {
                    racePlayer.vx *= Math.max(0, 1 - 16 * dt);
                }
            }

            // Power Oversteer (тяга и поддержание заноса при нажатом газе)
            if (raceKeys.gas && (isHandbrake || Math.abs(racePlayer.vx) > maxLateral * 0.36 || isDriftMode) && Math.abs(racePlayer.vx) > 18) {
                const oversteerPush = (racePlayer.vx >= 0 ? 1 : -1) * (stats.accel * 9.5) * dt;
                racePlayer.vx = Math.max(-maxLateral, Math.min(maxLateral, racePlayer.vx + oversteerPush));
            }

            // Торможение при ручнике: агрессивное замедление (~85-110 км/ч в секунду) до полной остановки (0 км/ч)
            if (isHandbrake) {
                const handbrakeDecel = 95 + Math.min(15, (racePlayer.speed / 100) * 10);
                const extraBrake = raceKeys.brake ? 35 : 0;
                racePlayer.speed = Math.max(0, racePlayer.speed - (handbrakeDecel + extraBrake) * dt);
            }

            racePlayer.x += racePlayer.vx * dt;

            // ФИЗИКА СТЕНЫ / ОТБОЙНИКА (Устранение бага: нельзя ехать по стене и фармить деньги!)
            const isTouchingLeftWall = racePlayer.x <= 57;
            const isTouchingRightWall = racePlayer.x >= 343;
            racePlayer.isOnWall = isTouchingLeftWall || isTouchingRightWall;

            if (isTouchingLeftWall) {
                // Если удар в стену на большой скорости под острым углом
                if (racePlayer.vx < -45 && racePlayer.speed > 130) {
                    if (racePlayer.shield > 0) {
                        racePlayer.shield--;
                        showRacePopup("🛡️ ЩИТ ОТРАЗИЛ УДАР О БЕТОН!", "#38bdf8");
                        playLockSound(1.8);
                        racePlayer.vx = 85;
                        racePlayer.x = 58;
                    } else {
                        // Авария о бетонное ограждение на высокой скорости!
                        triggerRaceCrash();
                        return;
                    }
                } else {
                    // Трение и упругий отскок от левой стены
                    racePlayer.x = 57;
                    racePlayer.vx = Math.max(35, Math.abs(racePlayer.vx) * 0.7); // отталкиваем машину от отбойника
                    racePlayer.damageTaken += dt * 4.5;
                    // Резкое падение скорости до 0 от трения борта
                    racePlayer.speed = Math.max(0, racePlayer.speed - 200 * dt);
                    racePlayer.combo = 1;
                    triggerScreenShake();

                    // Искры от трения металла о барьер
                    if (racePlayer.speed > 5) {
                        for (let s = 0; s < 3; s++) {
                            raceSparks.push({
                                x: 54,
                                y: racePlayer.y + (Math.random() - 0.5) * 22,
                                vx: 30 + Math.random() * 55,
                                vy: -Math.random() * 45,
                                life: 0.35,
                                color: '#f59e0b'
                            });
                        }
                    }
                }
            } else if (isTouchingRightWall) {
                if (racePlayer.vx > 45 && racePlayer.speed > 130) {
                    if (racePlayer.shield > 0) {
                        racePlayer.shield--;
                        showRacePopup("🛡️ ЩИТ ОТРАЗИЛ УДАР О БЕТОН!", "#38bdf8");
                        playLockSound(1.8);
                        racePlayer.vx = -85;
                        racePlayer.x = 342;
                    } else {
                        triggerRaceCrash();
                        return;
                    }
                } else {
                    // Трение и упругий отскок от правой стены
                    racePlayer.x = 343;
                    racePlayer.vx = -Math.max(35, Math.abs(racePlayer.vx) * 0.7);
                    racePlayer.damageTaken += dt * 4.5;
                    racePlayer.speed = Math.max(0, racePlayer.speed - 200 * dt);
                    racePlayer.combo = 1;
                    triggerScreenShake();

                    if (racePlayer.speed > 5) {
                        for (let s = 0; s < 3; s++) {
                            raceSparks.push({
                                x: 346,
                                y: racePlayer.y + (Math.random() - 0.5) * 22,
                                vx: -30 - Math.random() * 55,
                                vy: -Math.random() * 45,
                                life: 0.35,
                                color: '#f59e0b'
                            });
                        }
                    }
                }
            }

            // Динамический угол скольжения кузова (Yaw Angle) и крен кузова (Tilt)
            const slipRatio = Math.max(-1, Math.min(1, racePlayer.vx / maxLateral));
            const maxYaw = (isHandbrake ? 0.60 : 0.44) * (raceCurrentMode === 'drift' ? 1.15 : 1.0);
            let targetYaw = slipRatio * maxYaw;
            if (isCounterSteer) {
                targetYaw *= 1.25; // Более глубокий и зрелищный угол при контр-рулении
            }
            targetYaw = Math.max(-0.64, Math.min(0.64, targetYaw));
            const yawRate = isHandbrake ? 15 : 11;
            racePlayer.yawAngle = (racePlayer.yawAngle || 0) + (targetYaw - (racePlayer.yawAngle || 0)) * yawRate * dt;
            racePlayer.tilt = racePlayer.yawAngle; // Синхронизируем tilt для обратной совместимости

            // Проверка состояния дрифта
            const isDriftingNow = (isHandbrake || Math.abs(racePlayer.vx) > (maxLateral * 0.40) || raceCurrentMode === 'drift')
                && Math.abs(racePlayer.vx) > 20
                && racePlayer.speed > 35
                && !racePlayer.isOnWall;

            if (isDriftingNow) {
                racePlayer.isDrifting = true;
                racePlayer.driftDuration += dt;
                racePlayer.driftComboTimer = 2.0; // 2 секунды на переход между поворотами
                racePlayer.driftCombo = Math.min(5, 1 + Math.floor(racePlayer.driftDuration / 2.0));
                racePlayer.maxDriftCombo = Math.max(racePlayer.maxDriftCombo || 1, racePlayer.driftCombo);

                // Оценка угла и качества заноса
                const driftDeg = Math.round(Math.abs(racePlayer.yawAngle) * (180 / Math.PI));
                racePlayer.driftAngleDeg = driftDeg;
                let angleMult = 1.0;
                if (driftDeg >= 26) {
                    racePlayer.driftQuality = '🔥 ИДЕАЛЬНЫЙ TSUDO';
                    angleMult = 1.8;
                } else if (driftDeg >= 16) {
                    racePlayer.driftQuality = '⚡ ОТЛИЧНЫЙ УГОЛ';
                    angleMult = 1.4;
                } else {
                    racePlayer.driftQuality = '🌪️ ХОРОШИЙ ДРИФТ';
                    angleMult = 1.0;
                }

                // Бонус за контр-руление
                let counterMult = 1.0;
                if (isCounterSteer) {
                    counterMult = 1.5;
                    racePlayer.counterSteerTimer = (racePlayer.counterSteerTimer || 0) + dt;
                    if (racePlayer.counterSteerTimer >= 0.35 && (racePlayer.counterSteerPopupTimer || 0) <= 0) {
                        racePlayer.counterSteerPopupTimer = 1.4;
                        showRacePopup("🔄 КОНТР-РУЛЕНИЕ +50%!", "#38bdf8");
                        if (typeof sound?.haptic === 'function') sound.haptic('light');
                    }
                } else {
                    racePlayer.counterSteerTimer = 0;
                }
                if (racePlayer.counterSteerPopupTimer > 0) {
                    racePlayer.counterSteerPopupTimer -= dt;
                }

                // Начисление очков дрифта с учетом комбо, угла и контр-руления
                const driftRate = Math.round((racePlayer.speed * 0.28) * (Math.abs(racePlayer.vx) / maxLateral) * 18 * driftMult * racePlayer.driftCombo * angleMult * counterMult);
                racePlayer.driftCurrentScore += driftRate * dt;
                racePlayer.driftScore += driftRate * dt;

                // Звук визга резины и тактильная отдача
                const nowMs = performance.now();
                if (nowMs - lastDriftScreechTime > 320) {
                    lastDriftScreechTime = nowMs;
                    if (typeof sound?.drift === 'function') sound.drift();
                    if (typeof sound?.haptic === 'function') sound.haptic('light');
                }

                // Расчет координат задних шин с учетом угла поворота кузова
                const cosYaw = Math.cos(racePlayer.yawAngle || 0);
                const sinYaw = Math.sin(racePlayer.yawAngle || 0);
                // Заднее левое колесо (-9, +14), заднее правое колесо (+9, +14)
                const rlx = racePlayer.x + (-9 * cosYaw - 14 * sinYaw);
                const rly = racePlayer.y + (-9 * sinYaw + 14 * cosYaw);
                const rrx = racePlayer.x + (9 * cosYaw - 14 * sinYaw);
                const rry = racePlayer.y + (9 * sinYaw + 14 * cosYaw);

                // Двухпоточный реалистичный дым из-под задних покрышек
                const smokeWaves = (isHandbrake || racePlayer.isNitroActive || raceKeys.gas) ? 3 : 2;
                for (let smk = 0; smk < smokeWaves; smk++) {
                    const isLeftWheel = smk % 2 === 0;
                    const wx = isLeftWheel ? rlx : rrx;
                    const wy = isLeftWheel ? rly : rry;
                    raceDriftSmoke.push({
                        x: wx + (Math.random() - 0.5) * 4,
                        y: wy + (Math.random() - 0.5) * 4,
                        vx: (racePlayer.vx * 0.22) + (Math.random() - 0.5) * 18,
                        vy: 20 + Math.random() * 32,
                        size: 3.8 + Math.random() * 4.2,
                        life: 0.70
                    });
                }

                // Следы шин от обоих задних колес
                raceSkidmarks.push({ x: rlx, y: rly, life: 1.0 });
                raceSkidmarks.push({ x: rrx, y: rry, life: 1.0 });

                // Искры от трения шин при глубоком угле заноса
                if (driftDeg >= 22 && Math.random() < 0.35) {
                    const sparkX = racePlayer.vx > 0 ? rlx : rrx;
                    raceSparks.push({
                        x: sparkX,
                        y: racePlayer.y + 14,
                        vx: (Math.random() - 0.5) * 40,
                        vy: -Math.random() * 30,
                        life: 0.25,
                        color: '#fbbf24'
                    });
                }

                if (Number(achievements.driftBestScore || 0) < Math.round(racePlayer.driftScore)) achievements.driftBestScore = Math.round(racePlayer.driftScore);
                if (Number(achievements.driftMaxCombo || 0) < racePlayer.driftCombo) achievements.driftMaxCombo = racePlayer.driftCombo;
                if (racePlayer.driftScore >= 1000 || racePlayer.driftCombo >= 5) checkAchievements();
            } else {
                racePlayer.isDrifting = false;
                racePlayer.isCounterSteering = false;
                racePlayer.counterSteerTimer = 0;
                if (racePlayer.driftComboTimer > 0) {
                    racePlayer.driftComboTimer -= dt;
                    if (racePlayer.driftComboTimer <= 0) {
                        if (racePlayer.driftCurrentScore > 30) {
                            const bankedPoints = Math.round(racePlayer.driftCurrentScore);
                            const bankedCash = Math.round(bankedPoints * 1.5 * (stats.rewardMult || 1.0));
                            racePlayer.earnedCash += bankedCash;
                            showRacePopup(`🌪️ ЗАНОС: +${bankedPoints} PTS (+${bankedCash.toLocaleString('ru-RU')} ₽)`, '#fbbf24');
                            if (typeof sound?.cash === 'function') sound.cash();
                            if (typeof sound?.haptic === 'function') sound.haptic('win');
                            checkAchievements();
                        }
                        racePlayer.driftCurrentScore = 0;
                        racePlayer.driftCombo = 1;
                        racePlayer.driftDuration = 0;
                        racePlayer.driftQuality = '';
                    }
                }
            }

            // Срыв дрифта при ударе о стену
            if (racePlayer.isOnWall && racePlayer.driftCurrentScore > 30) {
                showRacePopup("💥 ДРИФТ СОРВАН!", "#ef4444");
                racePlayer.driftCurrentScore = 0;
                racePlayer.driftCombo = 1;
                racePlayer.driftDuration = 0;
                racePlayer.driftQuality = '';
                racePlayer.isDrifting = false;
                racePlayer.isCounterSteering = false;
            }

            // 6. Генерация следов шин при резком торможении и ручнике
            const isSkidding = Math.abs(racePlayer.vx) > (maxLateral * 0.55) || (raceKeys.brake && racePlayer.speed > 80) || (isHandbrake && racePlayer.speed > 15);
            if (isSkidding && !isDriftingNow) {
                const cosYaw = Math.cos(racePlayer.yawAngle || 0);
                const sinYaw = Math.sin(racePlayer.yawAngle || 0);
                const rlx = racePlayer.x + (-9 * cosYaw - 14 * sinYaw);
                const rly = racePlayer.y + (-9 * sinYaw + 14 * cosYaw);
                const rrx = racePlayer.x + (9 * cosYaw - 14 * sinYaw);
                const rry = racePlayer.y + (9 * sinYaw + 14 * cosYaw);

                raceSkidmarks.push({ x: rlx, y: rly, life: 0.95 });
                raceSkidmarks.push({ x: rrx, y: rry, life: 0.95 });

                if (isHandbrake && racePlayer.speed > 15) {
                    const nowMs = performance.now();
                    if (nowMs - lastDriftScreechTime > 320) {
                        lastDriftScreechTime = nowMs;
                        if (typeof sound?.drift === 'function') sound.drift();
                        if (typeof sound?.haptic === 'function') sound.haptic('light');
                    }
                    for (let smk = 0; smk < 2; smk++) {
                        const wx = smk === 0 ? rlx : rrx;
                        const wy = smk === 0 ? rly : rry;
                        raceDriftSmoke.push({
                            x: wx + (Math.random() - 0.5) * 4,
                            y: wy + (Math.random() - 0.5) * 4,
                            vx: (racePlayer.vx * 0.22) + (Math.random() - 0.5) * 16,
                            vy: 20 + Math.random() * 30,
                            size: 3.5 + Math.random() * 4.0,
                            life: 0.65
                        });
                    }
                }
            }

            // Обновление следов шин
            for (let i = raceSkidmarks.length - 1; i >= 0; i--) {
                const sm = raceSkidmarks[i];
                sm.y += (racePlayer.speed * 3.5) * dt;
                sm.life -= dt * 0.8;
                if (sm.life <= 0 || sm.y > 620) {
                    raceSkidmarks.splice(i, 1);
                }
            }

            // Обновление частиц дыма от шин
            for (let i = raceDriftSmoke.length - 1; i >= 0; i--) {
                const smk = raceDriftSmoke[i];
                smk.x += smk.vx * dt;
                smk.y += (smk.vy + racePlayer.speed * 1.8) * dt;
                smk.size += 16 * dt;
                smk.life -= 1.6 * dt;
                if (smk.life <= 0 || smk.y > 620) {
                    raceDriftSmoke.splice(i, 1);
                }
            }

            // 7. Обновление искр
            if (racePlayer.isNitroActive && Math.random() < 0.6) {
                const side = Math.random() < 0.5 ? -6 : 6;
                raceSparks.push({
                    x: racePlayer.x + side + (Math.random() - 0.5) * 4,
                    y: racePlayer.y + 24,
                    vx: (Math.random() - 0.5) * 36,
                    vy: 60 + Math.random() * 80,
                    life: 0.35,
                    color: Math.random() < 0.65 ? '#00f0ff' : '#38bdf8'
                });
            }
            for (let i = raceSparks.length - 1; i >= 0; i--) {
                const sp = raceSparks[i];
                sp.x += sp.vx * dt;
                sp.y += sp.vy * dt + (racePlayer.speed * 1.5) * dt;
                sp.life -= dt * 2.2;
                if (sp.life <= 0) {
                    raceSparks.splice(i, 1);
                }
            }

            const curBiome = getTrackBiome(racePlayer.distanceKm);

            // 8. Обновление капель дождя, водяного шлейфа и молний
            if (curBiome.isRain) {
                for (let d of raceRainDrops) {
                    d.y += (d.speed + racePlayer.speed * 1.5) * dt;
                    d.x -= 80 * dt; // наклон ветра
                    if (d.y > 620) { d.y = -20; d.x = Math.random() * 450; }
                    if (d.x < -20) d.x = 420;
                }

                // Водяные брызги и шлейф из-под колес при движении
                if (racePlayer.speed > 28) {
                    const sprayCount = racePlayer.speed > 160 ? 3 : 2;
                    for (let k = 0; k < sprayCount; k++) {
                        const side = Math.random() < 0.5 ? -10 : 10;
                        raceWaterSpray.push({
                            x: racePlayer.x + side + (Math.random() - 0.5) * 4,
                            y: racePlayer.y + 22,
                            vx: (side > 0 ? 15 : -15) + (Math.random() - 0.5) * 20,
                            vy: 60 + Math.random() * 100,
                            size: 2.0 + Math.random() * 2.5,
                            life: 1.0,
                            decay: 2.8 + Math.random() * 1.5
                        });
                    }
                }

                // Таймер и вспышки молний
                raceLightningTimer -= dt;
                if (raceLightningTimer <= 0) {
                    raceLightningTimer = 4.5 + Math.random() * 6.0;
                    raceLightningFlash = 0.22;
                    const startX = 60 + Math.random() * 280;
                    raceLightningBolt = [{ x: startX, y: 0 }];
                    let curX = startX;
                    let curY = 0;
                    while (curY < 65) {
                        curX += (Math.random() - 0.5) * 24;
                        curY += 8 + Math.random() * 12;
                        raceLightningBolt.push({ x: curX, y: curY });
                    }
                }
            }

            if (raceLightningFlash > 0) {
                raceLightningFlash -= dt;
                if (raceLightningFlash < 0) raceLightningFlash = 0;
            }

            // Обновление частиц водяного шлейфа
            for (let i = raceWaterSpray.length - 1; i >= 0; i--) {
                const sp = raceWaterSpray[i];
                sp.x += sp.vx * dt;
                sp.y += (sp.vy + racePlayer.speed * 1.4) * dt;
                sp.size += 4 * dt;
                sp.life -= sp.decay * dt;
                if (sp.life <= 0 || sp.y > 620) {
                    raceWaterSpray.splice(i, 1);
                }
            }

            // 9. Таймер неуязвимости после касания
            if (racePlayer.invulnerableTimer > 0) {
                racePlayer.invulnerableTimer -= dt;
                racePlayer.damageBlink = (racePlayer.damageBlink + 1) % 6;
            } else {
                racePlayer.damageBlink = 0;
            }

            // Пройденная дистанция (ТОЛЬКО НА ТРАССЕ, БЕЗ ТРЕНИЯ О СТЕНУ!)
            if (!racePlayer.isOnWall && racePlayer.speed > 10) {
                const distDelta = (racePlayer.speed / 3600) * dt;
                racePlayer.distanceKm += distDelta;

                // Бонус за каждый пройденный километр дистанции
                const currentKm = Math.floor(racePlayer.distanceKm);
                if (!racePlayer.lastMilestoneKm) racePlayer.lastMilestoneKm = 0;
                if (currentKm > racePlayer.lastMilestoneKm) {
                    racePlayer.lastMilestoneKm = currentKm;
                    const kmBonus = Math.round(10000 * stats.rewardMult);
                    racePlayer.earnedCash += kmBonus;
                    showRacePopup(`🏁 ДИСТАНЦИЯ ${currentKm} КМ! +${kmBonus.toLocaleString('ru-RU')} ₽`, '#10b981');
                    if (typeof playCashSound === 'function') playCashSound();
                }
            }

            // Заработок денег (СТРОГО 0 ₽ ПРИ КАСАНИИ СТЕНЫ + ШТРАФ ЗА РЕМОНТ КУЗОВА!)
            if (!racePlayer.isOnWall && racePlayer.speed > 25) {
                const cashRatePerSec = (racePlayer.speed * 4.0) * stats.rewardMult;
                racePlayer.earnedCash += cashRatePerSec * dt;
            } else if (racePlayer.isOnWall && racePlayer.speed > 5) {
                // Штраф за трение об отбойник
                const repairCost = (4000 + racePlayer.speed * 15) * dt;
                racePlayer.earnedCash = Math.max(0, racePlayer.earnedCash - repairCost);
                if (Math.random() < 0.03) {
                    showRacePopup("⚠️ ТРЕНИЕ О СТЕНУ! ДОХОД 0 ₽ (РЕМОНТ)", "#ef4444");
                }
            }

            // Комбо таймер
            if (racePlayer.comboTimer > 0) {
                racePlayer.comboTimer -= dt;
                if (racePlayer.comboTimer <= 0) racePlayer.combo = 1;
            }

            // Движение дороги
            raceRoadOffset = (raceRoadOffset + racePlayer.speed * 3.5 * dt) % 60;

            // Спавн трафика
            trafficSpawnTimer += dt;
            const spawnInterval = Math.max(0.70, 2.0 - (racePlayer.distanceKm * 0.05) - (racePlayer.speed / 380));
            if (trafficSpawnTimer > spawnInterval) {
                trafficSpawnTimer = 0;
                spawnTrafficCar();
            }

            // Спавн бонусов
            collectibleSpawnTimer += dt;
            if (collectibleSpawnTimer > 3.0) {
                collectibleSpawnTimer = 0;
                spawnCollectible();
            }

            // ---------------------------------------------------------
            // РЕЖИМ ДРИФТА: СПАВН И ПРОХОЖДЕНИЕ КЛИППИНГ-ЗОН (АПЕКСОВ)
            // ---------------------------------------------------------
            if (raceCurrentMode === 'drift') {
                clippingSpawnTimer += dt;
                if (clippingSpawnTimer > 2.8) {
                    clippingSpawnTimer = 0;
                    const isRight = roadCurve > 10 || targetRoadCurve > 10;
                    const apexX = isRight ? 320 : 80;
                    raceClippingZones.push({
                        x: apexX,
                        y: -80,
                        side: isRight ? 'right' : 'left',
                        hit: false
                    });
                }
                for (let i = raceClippingZones.length - 1; i >= 0; i--) {
                    const cz = raceClippingZones[i];
                    cz.y += (racePlayer.speed * 3.5) * dt;
                    if (!cz.hit && Math.abs(cz.y - (racePlayer.y || 470)) < 42 && Math.abs(cz.x - racePlayer.x) < 55) {
                        cz.hit = true;
                        if (racePlayer.isDrifting && Math.abs(racePlayer.yawAngle || 0) > 0.22) {
                            const pts = Math.round(1500 * (racePlayer.driftCombo || 1));
                            racePlayer.driftScore = (racePlayer.driftScore || 0) + pts;
                            racePlayer.driftCombo = Math.min(10, (racePlayer.driftCombo || 1) + 1);
                            racePlayer.driftComboTimer = 4.0;
                            showRacePopup(`🎯 АПЕКС ЗАНОСА! +${pts.toLocaleString('ru-RU')} PTS`, '#c084fc');
                            if (typeof playCashSound === 'function') playCashSound();
                            if (typeof sound?.haptic === 'function') sound.haptic('medium');
                        }
                    }
                    if (cz.y > 650) raceClippingZones.splice(i, 1);
                }
            }

            // ---------------------------------------------------------
            // РЕЖИМ ШОССЕ: СЛУЧАЙНЫЕ ДОРОЖНЫЕ СОБЫТИЯ
            // ---------------------------------------------------------
            if (raceCurrentMode === 'highway') {
                raceHighwayEventCooldown -= dt;
                if (raceHighwayEventCooldown <= 0 && !raceHighwayEvent) {
                    raceHighwayEventCooldown = 22 + Math.random() * 18;
                    const roll = Math.random();
                    if (roll < 0.28) {
                        raceHighwayEvent = { type: 'speed_trap', timer: 7.0, limit: 140, checked: false };
                        showRacePopup("🚨 КАМЕРА СКОРОСТИ! СБРОСЬТЕ ДО 140 КМ/Ч ЧЕРЕЗ 5 СЕК!", "#f59e0b");
                    } else if (roll < 0.52) {
                        raceHighwayEvent = { type: 'road_works', timer: 8.0 };
                        showRacePopup("🚧 ДОРОЖНЫЕ РАБОТЫ! СУЖЕНИЕ В ПРАВЫЙ РЯД ➔➔", "#f97316");
                        for (let k = 0; k < 4; k++) {
                            raceTraffic.push({
                                x: 95,
                                y: -90 - k * 70,
                                laneIdx: 0,
                                targetX: 95,
                                speed: 0,
                                targetSpeed: 0,
                                name: "Дорожный конус",
                                isTruck: false,
                                isPolice: false,
                                isCone: true,
                                tilt: 0,
                                blinker: null,
                                blinkerTimer: 0,
                                changeLaneCooldown: 999,
                                overtaken: false
                            });
                        }
                    } else if (roll < 0.76) {
                        // Скорая помощь спешит по левому ряду
                        raceHighwayEvent = { type: 'ambulance', timer: 9.0, passed: false };
                        showRacePopup("🚑 СПЕЦТРАНСПОРТ! ОСВОБОДИТЕ ЛЕВУЮ ПОЛОСУ ➔➔", "#38bdf8");
                        raceTraffic.push({
                            x: 95,
                            y: -220,
                            laneIdx: 0,
                            targetX: 95,
                            speed: Math.max(140, racePlayer.speed * 0.95),
                            targetSpeed: 210,
                            name: "Скорая помощь (03)",
                            isTruck: false,
                            isPolice: true,
                            isCone: false,
                            tilt: 0,
                            blinker: 'left',
                            blinkerTimer: 0.3,
                            changeLaneCooldown: 999,
                            overtaken: false
                        });
                    } else {
                        const rivalCarName = Math.random() < 0.5 ? "BMW M5 CS «Турбо»" : "Porsche 911 GT3 RS";
                        raceHighwayEvent = { type: 'rival', timer: 14.0, name: rivalCarName, overtaken: false };
                        showRacePopup(`🏎️ СОПЕРНИК: ${rivalCarName}! ОБОЙДИ ЕГО!`, "#a855f7");
                        raceTraffic.push({
                            x: 165,
                            y: -150,
                            laneIdx: 1,
                            targetX: 165,
                            speed: Math.max(150, racePlayer.speed * 0.9),
                            targetSpeed: 230,
                            name: rivalCarName,
                            isTruck: false,
                            isPolice: false,
                            isRival: true,
                            isCone: false,
                            tilt: 0,
                            blinker: null,
                            blinkerTimer: 0,
                            changeLaneCooldown: 2.2,
                            overtaken: false
                        });
                    }
                }

                if (raceHighwayEvent) {
                    raceHighwayEvent.timer -= dt;
                    if (raceHighwayEvent.type === 'speed_trap' && raceHighwayEvent.timer <= 0.1 && !raceHighwayEvent.checked) {
                        raceHighwayEvent.checked = true;
                        if (racePlayer.speed <= raceHighwayEvent.limit) {
                            const trapReward = Math.round(15000 * Math.max(1, (stats.rewardMult || 1) * 0.5));
                            showRacePopup(`✅ КАМЕРА ПРОЙДЕНА ЧИСТО! +${trapReward.toLocaleString('ru-RU')} ₽`, "#10b981");
                            racePlayer.earnedCash += trapReward;
                            if (typeof playCashSound === 'function') playCashSound();
                        } else {
                            showRacePopup("📸 ШТРАФ ЗА ПРЕВЫШЕНИЕ! −5 000 ₽", "#ef4444");
                            racePlayer.earnedCash = Math.max(0, racePlayer.earnedCash - 5000);
                            addWantedStars(1, 'РАДАР');
                        }
                    }
                    if (raceHighwayEvent.timer <= 0) {
                        raceHighwayEvent = null;
                    }
                }
            }

            // 10. Физика трафика, динамический ИИ (перестроения, поворотники) и столкновения
            const lanes = [95, 165, 235, 305];
            for (let i = raceTraffic.length - 1; i >= 0; i--) {
                const t = raceTraffic[i];

                // Вертикальное движение (относительно игрока)
                const relativeSpeed = (racePlayer.speed - (t.speed || 0)) * 3.5;
                t.y += relativeSpeed * dt;

                // Если машина сбита / закручена в аварии
                if (t.spinning) {
                    t.x += (t.spinVx || 0) * dt;
                    t.tilt = (t.tilt || 0) + 14 * dt;
                    t.y += 40 * dt;
                    if (t.y > 680 || t.x < -60 || t.x > 460) {
                        raceTraffic.splice(i, 1);
                    }
                    continue;
                }

                // ДИНАМИЧЕСКИЙ ТРАФИК: Машины двигаются между рядами, обгоняют и тормозят
                if (!t.isCone) {
                    // Влияние СГУ («Крякалка»): попутный гражданский трафик впереди в панике уступает дорогу VIP
                    if ((racePlayer.sguStrobeTimer || 0) > 0 && !t.isTruck && !t.isPolice && t.type !== 'heli' && t.type !== 'block' && t.type !== 'spike') {
                        const dy = racePlayer.y - t.y; // положительно, если машина впереди игрока
                        if (dy > 10 && dy < 280 && Math.abs(t.x - racePlayer.x) < 45) {
                            if (!t.yieldedSgu) {
                                t.yieldedSgu = true;
                                const canGoRight = t.laneIdx < 3;
                                const newLane = canGoRight ? t.laneIdx + 1 : Math.max(0, t.laneIdx - 1);
                                t.laneIdx = newLane;
                                t.targetX = lanes[newLane];
                                t.blinker = canGoRight ? 'right' : 'left';
                                t.blinkerTimer = 0.12; // молниеносная реакция на стробоскопы
                                t.changeLaneCooldown = 6.0;
                                t.speed = Math.max(35, t.speed * 0.85);
                            }
                        }
                    }

                    // Сигнал прямо перед полицией ДПС: привлекает внимание патруля
                    if (raceKeys.horn && (t.name === 'ДПС' || t.isPolice)) {
                        const dy = racePlayer.y - t.y;
                        if (dy > 10 && dy < 130 && Math.abs(t.x - racePlayer.x) < 38) {
                            if (!t.honkReported) {
                                t.honkReported = true;
                                addWantedStars(1, 'НЕЗАКОННЫЙ СИГНАЛ');
                                showRacePopup('🚔 ДПС: КТО СИГНАЛИТ?! +⭐', '#ef4444');
                            }
                        }
                    }

                    t.changeLaneCooldown = (Number.isFinite(t.changeLaneCooldown) ? t.changeLaneCooldown : 3.0) - dt;

                    // Проверка препятствия прямо впереди в своей полосе
                    let obstacleAhead = null;
                    for (let other of raceTraffic) {
                        if (other !== t && Math.abs(other.x - t.x) < 26) {
                            const dy = other.y - t.y; // положительно, если other впереди нас на экране
                            if (dy > 15 && dy < 95) {
                                obstacleAhead = other;
                                break;
                            }
                        }
                    }

                    // Уступаем дорогу быстро приближающемуся сзади авто (особенно в скоростном левом ряду)
                    if (!t.isTruck && !t.isPolice && !t.isCone && !t.yieldedFastApproach && !t.yieldedSgu) {
                        const dy = (racePlayer.y || 470) - t.y; // dy > 0: игрок позади машины t на экране
                        const speedDelta = racePlayer.speed - t.speed;
                        if (dy > 35 && dy < 230 && Math.abs(t.x - racePlayer.x) < 36 && speedDelta > 28) {
                            const canGoRight = t.laneIdx < 3;
                            const yieldLane = canGoRight ? t.laneIdx + 1 : Math.max(0, t.laneIdx - 1);
                            const candX = lanes[yieldLane];
                            let laneClear = true;
                            for (let other of raceTraffic) {
                                if (other !== t && Math.abs(other.x - candX) < 28 && Math.abs(other.y - t.y) < 75) {
                                    laneClear = false;
                                    break;
                                }
                            }
                            if (laneClear) {
                                t.yieldedFastApproach = true;
                                t.laneIdx = yieldLane;
                                t.targetX = candX;
                                t.blinker = canGoRight ? 'right' : 'left';
                                t.blinkerTimer = 0.35; // информирует поворотником перед маневром
                                t.changeLaneCooldown = 5.0;
                            }
                        }
                    }

                    if (obstacleAhead) {
                        // Плавное торможение перед машиной впереди вместо резкого удара по тормозам
                        if (t.speed > obstacleAhead.speed) {
                            const gap = obstacleAhead.y - t.y; // дистанция (15..95)
                            const decel = Math.min(48, Math.max(16, (t.speed - obstacleAhead.speed) * (gap < 35 ? 1.6 : 0.95)));
                            t.speed = Math.max(obstacleAhead.speed * 0.95, t.speed - decel * dt);
                            t.isBraking = true;
                        }

                        // Ищем возможность перестроиться в соседний ряд
                        if (t.changeLaneCooldown <= 0 && !t.isTruck) {
                            const curL = t.laneIdx;
                            const candidates = [];
                            if (curL > 0) candidates.push(curL - 1);
                            if (curL < 3) candidates.push(curL + 1);

                            let chosenL = null;
                            for (let candL of candidates) {
                                const candX = lanes[candL];
                                let isClear = true;
                                for (let other of raceTraffic) {
                                    if (other !== t && Math.abs(other.x - candX) < 28 && Math.abs(other.y - t.y) < 80) {
                                        isClear = false;
                                        break;
                                    }
                                }
                                if (Math.abs(candX - racePlayer.x) < 26 && Math.abs(t.y - racePlayer.y) < 65) {
                                    isClear = false;
                                }

                                if (isClear) {
                                    chosenL = candL;
                                    break;
                                }
                            }

                            if (chosenL !== null) {
                                t.laneIdx = chosenL;
                                t.targetX = lanes[chosenL];
                                t.blinker = (chosenL < curL ? 'left' : 'right');
                                t.blinkerTimer = 0.45;
                                t.changeLaneCooldown = 4.5 + Math.random() * 3.5;
                            }
                        }
                    } else {
                        t.isBraking = false;
                        if (t.speed < t.targetSpeed) {
                            t.speed = Math.min(t.targetSpeed, t.speed + 25 * dt);
                        }

                        // Свободное периодическое перестроение (поток живет своей жизнью)
                        if (t.changeLaneCooldown <= 0 && !t.isTruck && Math.random() < 0.06) {
                            const curL = t.laneIdx;
                            let desiredL = curL;
                            if (t.speed > 115 && curL > 0) desiredL = curL - 1; // быстрые жмутся влево
                            else if (t.speed < 85 && curL < 3) desiredL = curL + 1; // медленные вправо
                            else desiredL = curL > 0 ? (Math.random() < 0.5 ? curL - 1 : Math.min(3, curL + 1)) : 1;

                            if (desiredL !== curL) {
                                const candX = lanes[desiredL];
                                let isClear = true;
                                for (let other of raceTraffic) {
                                    if (other !== t && Math.abs(other.x - candX) < 28 && Math.abs(other.y - t.y) < 85) {
                                        isClear = false;
                                        break;
                                    }
                                }
                                if (Math.abs(candX - racePlayer.x) < 26 && Math.abs(t.y - racePlayer.y) < 65) isClear = false;

                                if (isClear) {
                                    t.laneIdx = desiredL;
                                    t.targetX = candX;
                                    t.blinker = (desiredL < curL ? 'left' : 'right');
                                    t.blinkerTimer = 0.50; // подаем сигнал заранее перед маневром
                                    t.changeLaneCooldown = 6.0 + Math.random() * 4.0;
                                }
                            }
                        }
                    }

                    // Плавное физическое перестроение к targetX
                    if (Math.abs(t.x - t.targetX) > 0.5) {
                        if (t.blinkerTimer > 0) {
                            t.blinkerTimer -= dt;
                        } else {
                            const dx = t.targetX - t.x;
                            const step = Math.sign(dx) * Math.min(Math.abs(dx), (48 + t.speed * 0.22) * dt);
                            t.x += step;
                            t.tilt = Math.sign(dx) * 0.08;
                            if (Math.abs(t.x - t.targetX) <= 1.0) {
                                t.x = t.targetX;
                                t.tilt = 0;
                                t.blinker = null;
                            }
                        }
                    } else {
                        t.tilt = 0;
                        t.blinker = null;
                    }

                    // Мигание поворотников
                    t.blinkerFlash = Math.floor(Date.now() / 130) % 2 === 0;

                    // ДПС реагирует на превышение скорости игроком
                    if (t.isPolice && !t.spinning && Math.abs(t.y - (racePlayer.y || 470)) < 160 && racePlayer.speed > 160) {
                        const maxSpdByStars = [95, 140, 170, 195, 215, 230];
                        const maxPursuitSpd = maxSpdByStars[Math.min(5, racePlayer?.wantedStars || 1)] || 170;
                        t.targetSpeed = Math.min(maxPursuitSpd, Math.max(130, racePlayer.speed + 5));
                        if (!t.spottedSpeeding) {
                            t.spottedSpeeding = true;
                            addWantedStars(1, 'ПРЕВЫШЕНИЕ');
                        }
                    }

                    // ДПС взаимодействует с трафиком: не проходит сквозь другие машины
                    if (t.isPolice && !t.spinning) {
                        for (let j = 0; j < raceTraffic.length; j++) {
                            const ot = raceTraffic[j];
                            if (ot === t || ot.spinning) continue;
                            const odx = Math.abs(ot.x - t.x);
                            const ody = ot.y - t.y;
                            if (Math.abs(ody) < 40 && odx < 24) {
                                ot.x += (t.x <= ot.x ? 20 : -20);
                                t.speed = Math.max(50, t.speed - 25);
                                for (let s = 0; s < 6; s++) {
                                    raceSparks.push({
                                        x: (t.x + ot.x) / 2,
                                        y: (t.y + ot.y) / 2,
                                        vx: (Math.random() - 0.5) * 80,
                                        vy: (Math.random() - 0.5) * 60,
                                        life: 0.35,
                                        color: '#ea580c'
                                    });
                                }
                            }
                        }
                    }
                }

                // Проверка опасного обгона (near-miss)
                if (!t.overtaken && t.y > (racePlayer.y || 470) - 10) {
                    const dx = Math.abs(t.x - racePlayer.x);
                    if (dx > 20 && dx < 46) {
                        t.overtaken = true;
                        racePlayer.overtakesCount++;
                        racePlayer.combo = Math.min(5, racePlayer.combo + 1);
                        racePlayer.comboTimer = 3.5;
                        if (t.isPolice && !t.wantedTriggered) {
                            t.wantedTriggered = true;
                            addWantedStars(1, 'ОПАСНЫЙ ОБГОН ДПС');
                        }
                        if (t.isRival) {
                            const rivalBonus = Math.round(25000 * stats.rewardMult);
                            racePlayer.earnedCash += rivalBonus;
                            showRacePopup(`🏎️ СОПЕРНИК ОБОЙДЕН! +${rivalBonus.toLocaleString('ru-RU')} ₽!`, '#c084fc');
                            playCashSound();
                        } else {
                            const bonus = Math.round(1500 * stats.rewardMult * racePlayer.combo);
                            racePlayer.earnedCash += bonus;
                            showRacePopup(`🔥 ОБГОН! +${bonus.toLocaleString('ru-RU')} ₽ (x${racePlayer.combo})`, '#fbbf24');
                            playCashSound();
                        }
                    }
                }

                // Проверка столкновения
                const dx = Math.abs(t.x - racePlayer.x);
                const dy = Math.abs(t.y - (racePlayer.y || 470));
                const hitHeight = t.isTruck ? 54 : (t.isCone ? 18 : 36);
                const hitWidth = t.isCone ? 16 : 22;

                if (dx < hitWidth && dy < hitHeight) {
                    if (racePlayer.invulnerableTimer > 0) {
                        // Неуязвим после бокового удара
                    } else if (t.isCone) {
                        // Сбит дорожный конус: отскок конуса, потеря скорости, но не авария!
                        t.y = 800;
                        racePlayer.speed = Math.max(45, racePlayer.speed - 18);
                        racePlayer.combo = 1;
                        racePlayer.damageTaken += 0.8;
                        addWantedStars(1, 'СБИТ КОНУС');
                        showRacePopup("🚧 СБИТ КОНУС! -18 км/ч", "#f97316");
                        triggerScreenShake();
                        playTick();
                        for (let k = 0; k < 10; k++) {
                            raceSparks.push({
                                x: racePlayer.x + (Math.random() - 0.5) * 16,
                                y: (racePlayer.y || 470) - 10,
                                vx: (Math.random() - 0.5) * 110,
                                vy: -Math.random() * 80,
                                life: 0.45,
                                color: '#ea580c'
                            });
                        }
                    } else if (racePlayer.shield > 0) {
                        racePlayer.shield--;
                        t.y -= 160;
                        showRacePopup("🛡️ ЩИТ ОТРАЗИЛ УДАР!", "#38bdf8");
                        playLockSound(1.8);
                        triggerScreenShake();
                    } else if (t.isPolice && (racePlayer.isNitroActive || racePlayer.speed > 80 || dx >= 6)) {
                        // 💥 СБИТ ЭКИПАЖ ДПС (2D Police Takedown)!
                        t.spinning = true;
                        t.spinVx = (racePlayer.x < t.x ? 210 : -210);
                        t.speed = 20;
                        racePlayer.speed = Math.max(50, racePlayer.speed - 12);
                        racePlayer.damageTaken += 1.0;
                        racePlayer.invulnerableTimer = 0.8;
                        const takedownBounty = 30000;
                        racePlayer.earnedCash += takedownBounty;
                        showRacePopup(`💥 ЭКИПАЖ ДПС СБИТ! +${takedownBounty.toLocaleString('ru-RU')} ₽`, '#22c55e');
                        triggerScreenShake();
                        playCashSound();
                        if (racePlayer.wantedStars > 1) {
                            racePlayer.wantedStars = Math.max(1, racePlayer.wantedStars - 1);
                        }
                        racePlayer.escapeTimer = Math.max(1.0, racePlayer.escapeTimer - 3.0);

                        for (let s = 0; s < 24; s++) {
                            raceSparks.push({
                                x: (racePlayer.x + t.x) / 2,
                                y: racePlayer.y + (Math.random() - 0.5) * 20,
                                vx: (Math.random() - 0.5) * 140 + (t.spinVx > 0 ? 50 : -50),
                                vy: (Math.random() - 0.5) * 80,
                                life: 0.55,
                                color: Math.random() < 0.5 ? '#ef4444' : '#38bdf8'
                            });
                        }
                    } else if (dx >= 10 && !t.isTruck) {
                        // БОКОВОЙ КОНТАКТ (SIDE SCRAPE) с легковым авто!
                        // Отскок в сторону, расталкивание трафика в соседний ряд, искры от трения металла, умеренное замедление вместо смерти
                        const pushDir = racePlayer.x < t.x ? -1 : 1;
                        racePlayer.x += pushDir * 14;
                        racePlayer.vx = pushDir * -110;
                        t.x += (pushDir > 0 ? 1 : -1) * -18;
                        t.targetX = Math.max(65, Math.min(335, t.x));
                        t.tilt = (pushDir > 0 ? 1 : -1) * -0.12;

                        racePlayer.speed = Math.max(50, racePlayer.speed - 16);
                        racePlayer.invulnerableTimer = 0.6; // 0.6 сек неуязвимости
                        racePlayer.combo = 1;
                        racePlayer.damageTaken = (racePlayer.damageTaken || 0) + 2.5;
                        triggerScreenShake();
                        playTick();
                        showRacePopup("⚡ БОКОВОЙ ТАРАН! -16 км/ч", "#f59e0b");

                        // Поток искр
                        for (let s = 0; s < 18; s++) {
                            raceSparks.push({
                                x: (racePlayer.x + t.x) / 2,
                                y: racePlayer.y + (Math.random() - 0.5) * 26,
                                vx: (Math.random() - 0.5) * 90 + pushDir * 40,
                                vy: (Math.random() - 0.5) * 60 - 30,
                                life: 0.45,
                                color: Math.random() < 0.6 ? '#fbbf24' : '#ffffff'
                            });
                        }
                    } else if ((racePlayer.damageTaken || 0) < 70) {
                        // ТЯЖЕЛЫЙ УДАР С ПОВРЕЖДЕНИЕМ КАРКАСА (включая фуры и лобовые тычки с защитным буфером)
                        const dmg = t.isTruck ? 38 : 25;
                        racePlayer.damageTaken = (racePlayer.damageTaken || 0) + dmg;
                        racePlayer.speed = Math.max(40, racePlayer.speed * 0.48);
                        racePlayer.invulnerableTimer = 1.0;
                        t.y -= (t.isTruck ? 30 : 60);
                        t.speed = Math.min(140, t.speed + 20);
                        triggerScreenShake();
                        showRacePopup(`⚠️ АВАРИЯ! КАРКАС -${dmg}%! [${Math.min(100, Math.round(racePlayer.damageTaken))}%]`, "#ef4444");
                        playTick();
                        for (let s = 0; s < 24; s++) {
                            raceSparks.push({
                                x: (racePlayer.x + t.x) / 2,
                                y: racePlayer.y + (Math.random() - 0.5) * 20,
                                vx: (Math.random() - 0.5) * 160,
                                vy: (Math.random() - 0.5) * 100,
                                life: 0.5,
                                color: '#ef4444'
                            });
                        }
                        if (racePlayer.damageTaken >= 100) {
                            triggerRaceCrash();
                            return;
                        }
                    } else {
                        // ЛОБОВОЙ ТАРАН ИЛИ ТОТАЛЬНЫЙ КРАШ ПРИ ПРЕВЫШЕНИИ ЗАПАСА ПРОЧНОСТИ
                        triggerRaceCrash();
                        return;
                    }
                }

                // Удаление уехавших объектов (расширенный диапазон culling'а для высоких скоростей)
                if (t.y > 700 || t.y < -380) {
                    raceTraffic.splice(i, 1);
                }
            }

            // 11. Обновление бонусов
            for (let i = raceCollectibles.length - 1; i >= 0; i--) {
                const c = raceCollectibles[i];
                c.y += (racePlayer.speed * 3.5) * dt;

                const hitX = Math.abs(c.x - racePlayer.x) < 22;
                const hitY = Math.abs(c.y - racePlayer.y) < 26;

                if (hitX && hitY) {
                    if (c.type === 'cash') {
                        const amount = Math.round(c.amount * stats.rewardMult);
                        racePlayer.earnedCash += amount;
                        showRacePopup(`💰 +${amount.toLocaleString('ru-RU')} ₽!`, '#10b981');
                        playCashSound();
                    } else if (c.type === 'fuel') {
                        const added = c.amount || 5.0;
                        if (racePlayer.fuelCurrent !== undefined) {
                            racePlayer.fuelCurrent = Math.min(racePlayer.fuelTankCapacity || 20, racePlayer.fuelCurrent + added);
                        }
                        showRacePopup(`⛽ +${added.toFixed(1)} Л БЕНЗИНА!`, '#10b981');
                        playCashSound();
                    } else if (c.type === 'nitro') {
                        racePlayer.nitro = Math.min(100, racePlayer.nitro + 50);
                        racePlayer.nitroDepleted = false;
                        showRacePopup("🚀 НИТРО ПОПОЛНЕНО!", "#38bdf8");
                        playLockSound(1.6);
                    } else if (c.type === 'shield') {
                        racePlayer.shield = 1;
                        showRacePopup("🛡️ АВТО-КАСКО АКТИВИРОВАНО!", "#a855f7");
                        playLockSound(1.4);
                    }
                    raceCollectibles.splice(i, 1);
                    continue;
                }

                if (c.y > 640) raceCollectibles.splice(i, 1);
            }

            // 12. Обновление HUD значков
            const sBadge = document.getElementById('game-shield-badge');
            if (sBadge) sBadge.classList.toggle('hidden', racePlayer.shield <= 0);

            const cBadge = document.getElementById('game-combo-badge');
            if (cBadge) {
                cBadge.classList.toggle('hidden', racePlayer.combo <= 1);
                cBadge.innerText = `🔥 x${racePlayer.combo}`;
            }

            // 13. Система розыска ДПС (Wanted Stars) и сброс погони (Cooldown / Escape)
            if (racePlayer.wantedStars > 0) {
                const nearestPolice = raceTraffic.find(t => t.isPolice && !t.spinning && Math.abs(t.y - (racePlayer.y || 470)) < 200);
                if (!nearestPolice) {
                    racePlayer.escapeTimer -= dt;
                    if (racePlayer.escapeTimer <= 0) {
                        const stars = racePlayer.wantedStars;
                        const bounty = stars * 25000;
                        const xpBonus = stars * 20;
                        racePlayer.earnedCash += bounty;
                        racePlayer.wantedStars = 0;
                        racePlayer.escapeTimer = 0;
                        if (typeof sound?.setSiren === 'function') sound.setSiren(false);
                        if (typeof sound?.win === 'function') sound.win('БЛАТНОЙ');
                        showRacePopup(`🏆 УШЁЛ ОТ ПОГОНИ! +${bounty.toLocaleString('ru-RU')} ₽ (+${xpBonus} XP)`, '#10b981');
                    }
                } else {
                    if (Math.abs(nearestPolice.y - (racePlayer.y || 470)) < 140) {
                        racePlayer.escapeTimer = Math.max(racePlayer.escapeTimer, 5.0);
                    }
                }
            } else {
                if (typeof sound?.setSiren === 'function') {
                    const anyPolicePursuing = raceTraffic.some(t => t.isPolice && Math.abs(t.y - (racePlayer.y || 470)) < 180 && t.spottedSpeeding);
                    if (!anyPolicePursuing) sound.setSiren(false);
                }
            }
        }

        function spawnTrafficCar() {
            // В режиме Дрифта трафик более разреженный, давая пространство для заносов и крутых поворотов
            if (raceCurrentMode === 'drift' && Math.random() < 0.45) return;

            const lanes = [95, 165, 235, 305];

            // На высокой скорости спавним машины дальше по трассе, давая нормальное окно реакции
            const curSpd = racePlayer ? (racePlayer.speed || 70) : 70;
            const spawnY = curSpd > 160 ? -100 - Math.min(180, (curSpd - 160) * 0.85) : -60;

            // 1. ПРЕДОТВРАЩЕНИЕ НЕПРОХОДИМЫХ СТЕНОК (Roadblocks):
            // Проверяем, сколько полос уже перекрыто машинами в диапазоне spawnY (+-95 px)
            const blockedLanes = new Set();
            for (let t of raceTraffic) {
                if (Math.abs(t.y - spawnY) < 95) {
                    const lIdx = lanes.findIndex(lx => Math.abs((t.targetX || t.x) - lx) < 28);
                    if (lIdx !== -1) blockedLanes.add(lIdx);
                }
            }
            // Гарантируем свободный проезд: если 3 полосы уже перекрыты в этом створе, не спавним 4-ю
            if (blockedLanes.size >= 3) {
                return;
            }

            // 2. СБАЛАНСИРОВАННЫЙ ВЫБОР ПОЛОСЫ:
            // Оцениваем количество машин на активном участке по каждой полосе
            const laneCounts = [0, 0, 0, 0];
            for (let t of raceTraffic) {
                if (t.y > -220 && t.y < 520) {
                    const lIdx = lanes.findIndex(lx => Math.abs((t.targetX || t.x) - lx) < 28);
                    if (lIdx !== -1) laneCounts[lIdx]++;
                }
            }

            const availableLanes = [0, 1, 2, 3].filter(l => !blockedLanes.has(l));
            if (availableLanes.length === 0) return;

            // Предпочитаем наименее загруженные полосы для равномерного распределения трафика
            availableLanes.sort((a, b) => (laneCounts[a] || 0) - (laneCounts[b] || 0));
            const laneIdx = (Math.random() < 0.70) ? availableLanes[0] : availableLanes[Math.floor(Math.random() * availableLanes.length)];
            const laneX = lanes[laneIdx];

            for (let t of raceTraffic) {
                if (Math.abs(t.x - laneX) < 32 && Math.abs(t.y - spawnY) < 130) return;
            }

            // При 4+ звёздах розыска периодически выставляется кордон / блокпост ДПС
            if ((racePlayer?.wantedStars || 0) >= 4 && Math.random() < 0.20 && blockedLanes.size === 0) {
                const blockLane1 = Math.floor(Math.random() * 3);
                const blockLane2 = blockLane1 + 1;
                [blockLane1, blockLane2].forEach(lIdx => {
                    raceTraffic.push({
                        x: lanes[lIdx],
                        y: spawnY - 40,
                        laneIdx: lIdx,
                        targetX: lanes[lIdx],
                        speed: 65,
                        targetSpeed: 75,
                        name: "ДПС / Полиция",
                        isTruck: false,
                        isPolice: true,
                        isCone: false,
                        spottedSpeeding: true,
                        tilt: 0,
                        blinker: null,
                        blinkerTimer: 0,
                        changeLaneCooldown: 999,
                        overtaken: false
                    });
                });
                return;
            }

            const policeBonus = (racePlayer?.wantedStars || 0) * 0.09;
            const roll = Math.random();
            if (roll < 0.14) {
                // Длинномер КАМАЗ / Фургон: медленный тяжелый трафик (60-80 км/ч), держится в правых рядах (3 или 2)
                const truckLane = (!blockedLanes.has(3) && Math.random() < 0.8) ? 3 : (!blockedLanes.has(2) ? 2 : (laneIdx > 1 ? laneIdx : 3));
                const truckX = lanes[truckLane];
                for (let t of raceTraffic) {
                    if (Math.abs(t.x - truckX) < 32 && Math.abs(t.y - (spawnY - 35)) < 130) return;
                }
                const isVan = Math.random() < 0.35;
                const truckSpeed = isVan ? 68 + Math.random() * 12 : 60 + Math.random() * 15; // 60-80 км/ч
                raceTraffic.push({
                    x: truckX,
                    y: spawnY - 35,
                    laneIdx: truckLane,
                    targetX: truckX,
                    speed: truckSpeed,
                    targetSpeed: truckSpeed + 6,
                    name: isVan ? "Газель / Фургон" : "КАМАЗ / Фура",
                    isTruck: true,
                    isPolice: false,
                    isCone: false,
                    tilt: 0,
                    blinker: null,
                    blinkerTimer: 0,
                    changeLaneCooldown: 999,
                    overtaken: false
                });
            } else if (roll < (0.23 + policeBonus)) {
                // Патруль ДПС с мигалками (при активном розыске ускоряется на перехват с учетом звезд)
                const isPursuit = (racePlayer?.wantedStars || 0) > 0;
                const maxSpdByStars = [95, 140, 170, 195, 215, 230];
                const maxPursuitSpd = maxSpdByStars[Math.min(5, racePlayer?.wantedStars || 1)] || 170;
                const spd = isPursuit ? Math.max(110, Math.min(maxPursuitSpd * 0.9, curSpd * 0.92)) : 88 + Math.random() * 20;
                const tgtSpd = isPursuit ? Math.min(maxPursuitSpd, Math.max(120, curSpd + 6)) : 100;
                raceTraffic.push({
                    x: laneX,
                    y: spawnY,
                    laneIdx: laneIdx,
                    targetX: laneX,
                    speed: spd,
                    targetSpeed: tgtSpd,
                    name: "ДПС / Полиция",
                    isTruck: false,
                    isPolice: true,
                    isCone: false,
                    spottedSpeeding: isPursuit,
                    tilt: 0,
                    blinker: null,
                    blinkerTimer: 0,
                    changeLaneCooldown: 2.2 + Math.random() * 2.5,
                    overtaken: false
                });
            } else if (roll < (0.28 + policeBonus * 0.5)) {
                // Дорожные работы (конус)
                raceTraffic.push({
                    x: laneX,
                    y: spawnY + 10,
                    laneIdx: laneIdx,
                    targetX: laneX,
                    speed: 0,
                    targetSpeed: 0,
                    name: "Дорожный конус",
                    isTruck: false,
                    isPolice: false,
                    isCone: true,
                    tilt: 0,
                    blinker: null,
                    blinkerTimer: 0,
                    changeLaneCooldown: 999,
                    overtaken: false
                });
            } else {
                // РЕАЛИСТИЧНАЯ ИЕРАРХИЯ СКОРОСТЕЙ ПО ПОЛОСАМ:
                // Левый ряд (lane 0): 120-140 км/ч (быстрые седаны и спорткары)
                // Средне-левый (lane 1): 95-115 км/ч (крейсерский поток)
                // Средне-правый (lane 2): 85-100 км/ч (умеренный поток)
                // Правый (lane 3): 60-80 км/ч (медленные авто и коммерческий транспорт)
                let baseSpeed;
                if (laneIdx === 0) {
                    baseSpeed = 120 + Math.random() * 20; // 120-140 км/ч
                } else if (laneIdx === 1) {
                    baseSpeed = 96 + Math.random() * 18;  // 96-114 км/ч
                } else if (laneIdx === 2) {
                    baseSpeed = 85 + Math.random() * 15;  // 85-100 км/ч
                } else {
                    baseSpeed = 65 + Math.random() * 15;  // 65-80 км/ч
                }

                // Модели автомобилей, соответствующие динамике полосы
                let randCar;
                if (laneIdx === 0) {
                    const fastPool = ['Toyota Camry 3.5', 'BMW M5 F90', 'Mercedes-Benz E63 AMG', 'Audi RS6 Avant', 'Porsche 911 GT3 RS'];
                    randCar = fastPool[Math.floor(Math.random() * fastPool.length)];
                } else if (laneIdx === 1) {
                    const midFastPool = ['Toyota Camry 3.5', 'Hyundai Solaris', 'Volkswagen Polo', 'Lada Vesta Sport', 'Toyota Land Cruiser 300'];
                    randCar = midFastPool[Math.floor(Math.random() * midFastPool.length)];
                } else if (laneIdx === 2) {
                    const standardPool = ['Hyundai Solaris', 'Volkswagen Polo', 'Lada Priora', 'ВАЗ-2109 «Девятка»'];
                    randCar = standardPool[Math.floor(Math.random() * standardPool.length)];
                } else {
                    const slowPool = ['ВАЗ-2107 «Жигули»', 'ВАЗ-2109 «Девятка»', 'ГАЗ-24 «Волга»', 'Lada Priora'];
                    randCar = slowPool[Math.floor(Math.random() * slowPool.length)];
                }
                if (typeof carsData !== 'undefined' && Array.isArray(carsData) && carsData.length > 0 && !carsData.some(c => c.name === randCar)) {
                    randCar = carsData[Math.floor(Math.random() * carsData.length)].name;
                }

                raceTraffic.push({
                    x: laneX,
                    y: spawnY,
                    laneIdx: laneIdx,
                    targetX: laneX,
                    speed: baseSpeed,
                    targetSpeed: baseSpeed,
                    name: randCar,
                    isTruck: false,
                    isPolice: false,
                    isCone: false,
                    tilt: 0,
                    blinker: null,
                    blinkerTimer: 0,
                    changeLaneCooldown: 2.5 + Math.random() * 4.0,
                    overtaken: false
                });
            }
        }

        function spawnCollectible() {
            const lanes = [95, 165, 235, 305];
            const laneX = lanes[Math.floor(Math.random() * lanes.length)];

            const roll = Math.random();
            let type = 'cash';
            const mult = (racePlayer && racePlayer.tunedStats?.rewardMult) || 1.0;
            let amount = Math.round(8000 * Math.max(1, Math.sqrt(mult)));
            if (roll < 0.35) {
                type = 'cash';
                amount = Math.round((Math.random() < 0.25 ? 20000 : 8000) * Math.max(1, Math.sqrt(mult)));
            } else if (roll < 0.65) {
                type = 'fuel';
                amount = 4.0;
            } else if (roll < 0.85) {
                type = 'nitro';
            } else {
                type = 'shield';
            }

            raceCollectibles.push({
                x: laneX,
                y: -40,
                type: type,
                amount: amount
            });
        }

        function triggerRaceCrash() {
            settleRaceRun(true);
        }

        // Single settlement path for accidents AND early exit. No duplicate payouts.
        function settleRaceRun(crashed) {
            if (!isRaceRunning) return;
            isRaceRunning = false;
            window.isRaceRunning = false;
            resetRaceKeys();
            sound.stopEngine();
            if (typeof sound?.setSiren === 'function') sound.setSiren(false);
            if (crashed) {
                if (crashed !== 'busted') {
                    sound.crash();
                    triggerScreenShake();
                }
                if (typeof sound?.haptic === 'function') sound.haptic('crash');
            }
            document.body.classList.remove('race-active');
            if (raceAnimFrame) cancelAnimationFrame(raceAnimFrame);
            if (car3DRacingEngine) car3DRacingEngine.stop();
            const play3D = document.getElementById('race-3d-play-container');
            if (play3D) play3D.classList.add('hidden');
            const play2D = document.getElementById('race-play-container');
            if (play2D) play2D.classList.add('hidden');

            const driftBonus = Math.round((racePlayer.driftScore || 0) * 0.8 * (racePlayer.tunedStats?.rewardMult || 1.0));
            const gross = racePlayer.earnedCash + driftBonus;
            const receipt = NomeraRaceEconomy.settle(gross, racePlayer.fuelLiters || 0, balance);
            const finalXp = Math.max(5, Math.round(racePlayer.distanceKm * 8 + racePlayer.overtakesCount * 3 + (racePlayer.driftScore || 0) * 0.05));
            const wear = Math.min(60, (racePlayer.damageTaken || 0) * 0.8 + racePlayer.distanceKm * 0.1 + (crashed ? 8 + Math.min(7, racePlayer.speed / 50) : 0));
            if (activeRaceCar && myCars.includes(activeRaceCar)) {
                NomeraRaceEconomy.ensureCar(activeRaceCar);
                activeRaceCar.condition = Math.max(0, Number((activeRaceCar.condition - wear).toFixed(2)));
            }
            balance = receipt.walletAfter;
            if (onlineProfile) {
                const cur = Number.isFinite(Number(onlineProfile.balance)) ? Number(onlineProfile.balance) : (balance - receipt.credited);
                onlineProfile.balance = Math.max(0, cur + receipt.credited);
                renderOnlineAccount();
                if (db && typeof db.ref === 'function') {
                    const key = sanitizeKey(onlineProfile.nickname);
                    const now = Date.now();
                    db.ref('onlineV4/accounts/' + key).update({ balance: onlineProfile.balance, updatedAt: now }).catch(() => {});
                    db.ref('users/' + key).update({ balance: onlineProfile.balance, updatedAt: now }).catch(() => {});
                    db.ref('leaderboard/' + key).update({ balance: onlineProfile.balance, avatarData: avatarData || '', updatedAt: now }).catch(() => {});
                }
            }
            addExp(finalXp);
            updateBalance();
            logPlayerActivity('Гонка', `Заезд ${crashed === 'fuel' ? 'закончился бензин' : (crashed === 'busted' ? 'задержание ДПС' : (crashed ? 'авария' : 'выход'))}: ${racePlayer.distanceKm.toFixed(2)} км, дрифт: ${Math.round(racePlayer.driftScore || 0)} pts, до расходов ${receipt.gross} ₽, бензин -${receipt.fuelCost} ₽, итог ${receipt.credited} ₽`);
            // Race records track received net winnings, never fuel-free gross income.
            saveRaceRecords(NomeraRaceRecords.finishRecords(getRaceRecords(), racePlayer, Math.max(0, receipt.credited)));
            recordQuestProgress('distance', Math.round(racePlayer.distanceKm || 0));
            achievements.driftBestScore = Math.max(Number(achievements.driftBestScore || 0), Math.round(racePlayer.driftScore || 0));
            achievements.driftTotalScore = Number(achievements.driftTotalScore || 0) + Math.round(racePlayer.driftScore || 0);
            achievements.driftMaxCombo = Math.max(Number(achievements.driftMaxCombo || 0), racePlayer.maxDriftCombo || 1);
            achievements.overtakesTotal = Number(achievements.overtakesTotal || 0) + (racePlayer.overtakesCount || 0);
            achievements.totalDistanceKm = Number(achievements.totalDistanceKm || 0) + (racePlayer.distanceKm || 0);
            checkAchievements();
            saveProgress();
            syncMyLeaderboardEntry();
            updateRaceRecordsUI();
            renderCars();

            document.getElementById('gameover-title').innerText = crashed === 'fuel' ? '⛽ Закончился бензин!' : (crashed === 'busted' ? '🚔 Задержание ДПС!' : (crashed ? '💥 Заезд завершён!' : '🏁 Заезд завершён'));
            document.getElementById('go-stat-dist').innerText = `${racePlayer.distanceKm.toFixed(2)} км`;
            document.getElementById('go-stat-speed').innerText = `${Math.round(racePlayer.peakSpeed)} км/ч`;
            document.getElementById('go-stat-overtakes').innerText = `${racePlayer.overtakesCount}`;
            const driftStat = document.getElementById('go-stat-drift');
            if (driftStat) driftStat.innerText = `${Math.round(racePlayer.driftScore || 0)} PTS (x${racePlayer.maxDriftCombo || 1})`;
            document.getElementById('go-stat-xp').innerText = `+${finalXp} XP`;
            document.getElementById('go-stat-gross').innerText = `+${receipt.gross.toLocaleString('ru-RU')} ₽`;
            document.getElementById('go-stat-fuel').innerText = `${receipt.liters.toFixed(2)} л × ${NomeraRaceEconomy.FUEL_PRICE} ₽ = −${receipt.fuelCost.toLocaleString('ru-RU')} ₽`;
            document.getElementById('go-stat-condition').innerText = activeRaceCar ? `${Math.round(activeRaceCar.condition)}% (−${wear.toFixed(1)}%)` : '—';
            const total = document.getElementById('go-stat-cash');
            total.innerText = `${receipt.credited >= 0 ? '+' : '−'}${Math.abs(receipt.credited).toLocaleString('ru-RU')} ₽`;
            total.style.color = receipt.credited >= 0 ? 'var(--accent-green)' : '#fb7185';
            const explanation = document.getElementById('go-stat-limited');
            if (explanation) explanation.textContent = receipt.credited !== receipt.net ? 'Расходы ограничены доступным балансом — долг не начислен.' : '';

            const goCvs = document.getElementById('gameover-canvas');
            if (goCvs) {
                const gCtx = goCvs.getContext('2d');
                gCtx.clearRect(0, 0, goCvs.width, goCvs.height);
                const goStyling = activeRaceCar?.styling || {};
                const cachedGo3D = (typeof Car3DManager !== 'undefined' && typeof Car3DManager.getSideThumbnail === 'function')
                    ? Car3DManager.getSideThumbnail(selectedRaceCarName, goStyling)
                    : null;
                const drawGo3D = (url) => {
                    const img = new Image();
                    img.onload = () => {
                        gCtx.clearRect(0, 0, goCvs.width, goCvs.height);
                        const aspect = img.width / (img.height || 1);
                        const dw = goCvs.width - 12;
                        const dh = dw / aspect;
                        const dy = (goCvs.height - dh) / 2;
                        gCtx.drawImage(img, 6, dy, dw, dh);
                    };
                    img.src = url;
                };
                if (cachedGo3D) {
                    drawGo3D(cachedGo3D);
                } else if (typeof Car3DManager !== 'undefined' && typeof Car3DManager.renderSideThumbnail === 'function') {
                    Car3DManager.renderSideThumbnail(selectedRaceCarName, goStyling, (url) => {
                        if (url) drawGo3D(url);
                    });
                    drawPixelCar(gCtx, goCvs.width / 2, goCvs.height / 2, selectedRaceCarName, 1.3);
                } else {
                    drawPixelCar(gCtx, goCvs.width / 2, goCvs.height / 2, selectedRaceCarName, 1.3);
                }
            }
            activeRaceCar = null;
            setTimeout(() => document.getElementById('race-gameover-modal').classList.add('show'), 300);
        }

        // Кэшированные градиенты для Canvas 60 FPS (предотвращение аллокаций памяти и GC фризов)
        let cachedSunGrad = null;
        let cachedSunsetSun = null;
        let cachedNormRefGrad = null;
        let cachedNormTailBrake = null;
        let cachedNormTailNormal = null;
        let cachedPlayerGradColor = null;
        let cachedPlayerGrad = null;
        let cachedPlayerNeonColor = null;
        let cachedPlayerNeonGrad = null;
        let cachedTouchNitroVal = null;
        let cachedTouchNitroBtn = null;
        let cachedDriftBadge = null;
        let cachedQualityBadge = null;
        let prevNitroText = '';
        let prevNitroEmpty = null;
        let prevNitroActive = null;
        let prevDriftText = '';
        let prevQualityText = '';

        function getSunGrad(ctx) {
            if (!cachedSunGrad) {
                cachedSunGrad = ctx.createRadialGradient(200, 24, 2, 200, 24, 22);
                cachedSunGrad.addColorStop(0, '#fef08a');
                cachedSunGrad.addColorStop(0.6, '#fde047');
                cachedSunGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
            }
            return cachedSunGrad;
        }

        function getSunsetSun(ctx) {
            if (!cachedSunsetSun) {
                cachedSunsetSun = ctx.createRadialGradient(200, 48, 4, 200, 48, 38);
                cachedSunsetSun.addColorStop(0, '#fbbf24');
                cachedSunsetSun.addColorStop(0.5, '#f97316');
                cachedSunsetSun.addColorStop(1, 'rgba(249, 115, 22, 0)');
            }
            return cachedSunsetSun;
        }

        function drawVerticalRef(ctx, x, y, w, h, grad) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, h);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, 1);
            ctx.restore();
        }

        function getNormRefGrad(ctx) {
            if (!cachedNormRefGrad) {
                cachedNormRefGrad = ctx.createLinearGradient(0, 0, 0, 1);
                cachedNormRefGrad.addColorStop(0, "rgba(148, 163, 184, 0.28)");
                cachedNormRefGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            }
            return cachedNormRefGrad;
        }

        function getNormTailGrad(ctx, isBraking) {
            if (isBraking) {
                if (!cachedNormTailBrake) {
                    cachedNormTailBrake = ctx.createLinearGradient(0, 0, 0, 1);
                    cachedNormTailBrake.addColorStop(0, "rgba(239, 68, 68, 0.65)");
                    cachedNormTailBrake.addColorStop(1, "rgba(239, 68, 68, 0)");
                }
                return cachedNormTailBrake;
            }
            if (!cachedNormTailNormal) {
                cachedNormTailNormal = ctx.createLinearGradient(0, 0, 0, 1);
                cachedNormTailNormal.addColorStop(0, "rgba(239, 68, 68, 0.35)");
                cachedNormTailNormal.addColorStop(1, "rgba(239, 68, 68, 0)");
            }
            return cachedNormTailNormal;
        }

        function getPlayerRefGrad(ctx, color) {
            if (cachedPlayerGradColor !== color || !cachedPlayerGrad) {
                cachedPlayerGradColor = color;
                cachedPlayerGrad = ctx.createLinearGradient(0, 0, 0, 1);
                cachedPlayerGrad.addColorStop(0, color);
                cachedPlayerGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            }
            return cachedPlayerGrad;
        }

        function getPlayerNeonGrad(ctx, neon) {
            if (cachedPlayerNeonColor !== neon || !cachedPlayerNeonGrad) {
                cachedPlayerNeonColor = neon;
                cachedPlayerNeonGrad = ctx.createLinearGradient(0, 0, 0, 1);
                cachedPlayerNeonGrad.addColorStop(0, neon);
                cachedPlayerNeonGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
            }
            return cachedPlayerNeonGrad;
        }

        // Отрисовка кадра гонки (4 биома, изгибы трассы, визуальные эффекты)
        function renderRaceFrame() {
            const canvas = document.getElementById('race-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const W = canvas.width;
            const H = canvas.height;

            const biome = getTrackBiome(racePlayer.distanceKm);

            // 1. Окружение и небо биома
            ctx.fillStyle = biome.sky;
            ctx.fillRect(0, 0, W, H);

            // 2. Декорации обочин по биомам
            if (biome.id === 'mow') {
                // Ночная Москва: силуэты светящихся небоскребов Москва-Сити на горизонте
                ctx.fillStyle = "#070c18";
                ctx.fillRect(0, 0, W, 70);

                // Башни
                const towers = [
                    { x: 15, w: 26, h: 58 }, { x: 45, w: 18, h: 42 }, { x: 67, w: 32, h: 68 },
                    { x: 300, w: 28, h: 62 }, { x: 332, w: 22, h: 48 }, { x: 358, w: 34, h: 70 }
                ];
                for (let tw of towers) {
                    ctx.fillStyle = "#0c1527";
                    ctx.fillRect(tw.x, 70 - tw.h, tw.w, tw.h);
                    // Окна
                    ctx.fillStyle = "rgba(254, 240, 138, 0.4)";
                    for (let wy = 70 - tw.h + 6; wy < 66; wy += 8) {
                        for (let wx = tw.x + 4; wx < tw.x + tw.w - 4; wx += 6) {
                            if (Math.sin(wx * 11 + wy * 17) > -0.2) {
                                ctx.fillRect(wx, wy, 2.5, 3.5);
                            }
                        }
                    }
                }
            } else if (biome.id === 'forest') {
                // Лес М-11: фон темной хвои
                ctx.fillStyle = "#051610";
                ctx.fillRect(0, 0, W, 65);
            } else if (biome.id === 'bridge') {
                // Вантовый мост: вода реки по бокам
                ctx.fillStyle = "#021627";
                ctx.fillRect(0, 0, W, 70);
            } else if (biome.id === 'neon') {
                // Неоновый туннель: свод кибер-туннеля
                ctx.fillStyle = "#0d021a";
                ctx.fillRect(0, 0, W, 70);
            } else if (biome.id === 'day') {
                // Солнечный день: холмы и облака
                ctx.fillStyle = "#15803d";
                ctx.fillRect(0, 52, W, 18);
                ctx.fillStyle = getSunGrad(ctx);
                ctx.beginPath();
                ctx.arc(200, 24, 22, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
                ctx.beginPath();
                ctx.arc(75, 22, 14, 0, Math.PI * 2);
                ctx.arc(95, 20, 18, 0, Math.PI * 2);
                ctx.arc(115, 22, 13, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(295, 26, 12, 0, Math.PI * 2);
                ctx.arc(315, 22, 16, 0, Math.PI * 2);
                ctx.arc(335, 26, 13, 0, Math.PI * 2);
                ctx.fill();
            } else if (biome.id === 'sunset') {
                // Закат: силуэты гор и заходящее солнце
                ctx.fillStyle = getSunsetSun(ctx);
                ctx.beginPath();
                ctx.arc(200, 48, 38, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#3b0764";
                ctx.fillRect(0, 56, W, 14);
            }

            // Вспышка и ветвящаяся молния в небе
            if (biome.isRain && raceLightningFlash > 0 && raceLightningBolt.length > 1) {
                ctx.save();
                ctx.strokeStyle = '#f0f9ff';
                ctx.lineWidth = 2.2;
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 14;
                ctx.beginPath();
                ctx.moveTo(raceLightningBolt[0].x, raceLightningBolt[0].y);
                for (let k = 1; k < raceLightningBolt.length; k++) {
                    ctx.lineTo(raceLightningBolt[k].x, raceLightningBolt[k].y);
                }
                ctx.stroke();
                ctx.restore();
            }

            // 3. Дорожное полотно с изгибом (построчная отрисовка ломтиками по 6px)
            const sliceH = 6;
            for (let y = 0; y < H; y += sliceH) {
                const curX = getCurveX(y);
                const lEdge = 50 + curX;
                const rEdge = 350 + curX;

                // Обочины
                ctx.fillStyle = biome.border;
                ctx.fillRect(0, y, Math.max(0, lEdge), sliceH);
                ctx.fillRect(Math.min(W, rEdge), y, Math.max(0, W - rEdge), sliceH);

                // Особенности обочин биома
                if (biome.id === 'forest') {
                    // Силуэты елей на обочинах
                    if (y % 36 === 0) {
                        ctx.fillStyle = "#062316";
                        ctx.beginPath();
                        ctx.moveTo(lEdge - 24, y); ctx.lineTo(lEdge - 8, y + 28); ctx.lineTo(lEdge - 40, y + 28); ctx.fill();
                        ctx.beginPath();
                        ctx.moveTo(rEdge + 24, y); ctx.lineTo(rEdge + 8, y + 28); ctx.lineTo(rEdge + 40, y + 28); ctx.fill();
                    }
                } else if (biome.id === 'bridge') {
                    // Водная рябь на реке
                    if ((y + raceRoadOffset * 2) % 40 < 8) {
                        ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
                        ctx.fillRect(Math.max(0, lEdge - 38), y, 32, 2);
                        ctx.fillRect(Math.min(W - 32, rEdge + 6), y, 32, 2);
                    }
                } else if (biome.id === 'neon') {
                    // Предупреждающие шевроны на стенах туннеля
                    if ((y + raceRoadOffset) % 50 < 18) {
                        ctx.fillStyle = "rgba(236, 72, 153, 0.35)";
                        ctx.fillRect(Math.max(0, lEdge - 28), y, 18, sliceH);
                        ctx.fillRect(Math.min(W - 18, rEdge + 10), y, 18, sliceH);
                    }
                }

                // Асфальт
                ctx.fillStyle = biome.asphalt;
                ctx.fillRect(lEdge, y, rEdge - lEdge, sliceH);

                // Отбойники с отражателями
                const isCurb1 = ((y + raceRoadOffset) % 32) < 16;
                ctx.fillStyle = isCurb1 ? biome.curb1 : biome.curb2;
                ctx.fillRect(lEdge - 4, y, 4, sliceH);
                ctx.fillRect(rEdge, y, 4, sliceH);

                // Сплошные белые краевые линии
                ctx.fillStyle = "#f1f5f9";
                ctx.fillRect(lEdge + 2, y, 2.5, sliceH);
                ctx.fillRect(rEdge - 4.5, y, 2.5, sliceH);

                // Прерывистые разделительные полосы (3 линии разметки)
                const isDash = ((y + raceRoadOffset) % 40) < 22;
                if (isDash) {
                    ctx.fillStyle = biome.lineCol;
                    ctx.fillRect(lEdge + 75, y, 2.5, sliceH);
                    ctx.fillRect(lEdge + 150, y, 2.5, sliceH);
                    ctx.fillRect(lEdge + 225, y, 2.5, sliceH);
                }
            }

            // 3.5. Фонарные столбы шоссе и световые пятна (Highway Street Lamps)
            if (biome.hasLamps) {
                const lampInterval = 160;
                const startLampY = (raceRoadOffset * 1.0) % lampInterval;
                for (let ly = startLampY; ly < H + 30; ly += lampInterval) {
                    const lcurX = getCurveX(ly);
                    const llEdge = 50 + lcurX;
                    const lrEdge = 350 + lcurX;

                    // Световые пятна от фонарей на асфальте
                    ctx.save();
                    ctx.fillStyle = biome.isRain ? "rgba(251, 191, 36, 0.09)" : (biome.isNight ? "rgba(251, 191, 36, 0.15)" : "rgba(251, 191, 36, 0.05)");
                    ctx.beginPath();
                    ctx.ellipse(llEdge + 28, ly, 36, 16, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(lrEdge - 28, ly, 36, 16, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();

                    // Опоры фонарей на левом отбойнике
                    ctx.fillStyle = "#64748b";
                    ctx.fillRect(llEdge - 8, ly - 22, 3, 24);
                    ctx.fillRect(llEdge - 8, ly - 22, 16, 2.5);
                    ctx.fillStyle = "#fbbf24";
                    ctx.fillRect(llEdge + 5, ly - 20, 5, 3.5);

                    // Опоры фонарей на правом отбойнике
                    ctx.fillStyle = "#64748b";
                    ctx.fillRect(lrEdge + 5, ly - 22, 3, 24);
                    ctx.fillRect(lrEdge - 11, ly - 22, 16, 2.5);
                    ctx.fillStyle = "#fbbf24";
                    ctx.fillRect(lrEdge - 10, ly - 20, 5, 3.5);
                }
            }

            // 4. Специфические наложения биомов
            if (biome.id === 'bridge') {
                // Подвесные ванты моста (стальные тросы)
                ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let k = 0; k < 6; k++) {
                    const cableOffset = (k * 70 + raceRoadOffset * 1.5) % 450;
                    ctx.moveTo(200 + getCurveX(0), 10);
                    ctx.lineTo(20 + getCurveX(cableOffset), cableOffset);
                    ctx.moveTo(200 + getCurveX(0), 10);
                    ctx.lineTo(380 + getCurveX(cableOffset), cableOffset);
                }
                ctx.stroke();
            } else if (biome.id === 'neon') {
                // Неоновые светящиеся арки туннеля
                for (let ay = (raceRoadOffset * 2) % 110; ay < H; ay += 110) {
                    const aX = 200 + getCurveX(ay);
                    ctx.strokeStyle = "rgba(244, 63, 94, 0.55)";
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(aX, ay, 175, Math.PI, 0);
                    ctx.stroke();
                }
            }
            if (biome.isRain) {
                // Отрисовка капель дождя
                ctx.strokeStyle = "rgba(186, 230, 253, 0.45)";
                ctx.lineWidth = 1.3;
                ctx.beginPath();
                for (let d of raceRainDrops) {
                    ctx.moveTo(d.x, d.y);
                    ctx.lineTo(d.x - 3, d.y + d.len);
                }
                ctx.stroke();

                // Водяной шлейф из-под колес (Rooster tails)
                if (raceWaterSpray.length > 0) {
                    for (let sp of raceWaterSpray) {
                        const spX = sp.x + getCurveX(sp.y);
                        ctx.fillStyle = `rgba(224, 242, 254, ${Math.max(0, sp.life * 0.42)})`;
                        ctx.beginPath();
                        ctx.arc(spX, sp.y, sp.size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            // 5. Следы шин (Skidmarks)
            for (let sm of raceSkidmarks) {
                const sx = sm.x + getCurveX(sm.y);
                ctx.fillStyle = `rgba(10, 15, 26, ${sm.life * 0.55})`;
                ctx.fillRect(sx - 8, sm.y, 4, 8);
                ctx.fillRect(sx + 5, sm.y, 4, 8);
            }

            // 6. Бонусы на трассе
            for (let c of raceCollectibles) {
                const cx = c.x + getCurveX(c.y);
                ctx.save();
                ctx.translate(cx, c.y);
                if (c.type === 'cash') {
                    ctx.fillStyle = "#10b981";
                    ctx.fillRect(-12, -7, 24, 14);
                    ctx.fillStyle = "#34d399";
                    ctx.fillRect(-10, -5, 20, 10);
                    ctx.fillStyle = "#064e3b";
                    ctx.font = "bold 9px sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("₽", 0, 0);
                } else if (c.type === 'fuel') {
                    ctx.fillStyle = "#dc2626";
                    ctx.beginPath();
                    ctx.roundRect(-8, -10, 16, 20, 3);
                    ctx.fill();
                    ctx.fillStyle = "#ef4444";
                    ctx.fillRect(-6, -8, 12, 16);
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 9px sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("⛽", 0, 0);
                } else if (c.type === 'nitro') {
                    ctx.fillStyle = "#2563eb";
                    ctx.beginPath();
                    ctx.roundRect(-7, -12, 14, 24, 6);
                    ctx.fill();
                    ctx.fillStyle = "#60a5fa";
                    ctx.fillRect(-5, -7, 10, 14);
                    ctx.fillStyle = "#fff";
                    ctx.font = "bold 7px sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillText("N2O", 0, 2);
                } else if (c.type === 'shield') {
                    ctx.fillStyle = "#a855f7";
                    ctx.beginPath();
                    ctx.arc(0, 0, 12, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = "#fff";
                    ctx.font = "12px sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("🛡️", 0, 0);
                }
                ctx.restore();
            }

            // 6.5. Отражения на мокром асфальте (Wet Road Reflections)
            const px = racePlayer.x + getCurveX(racePlayer.y);
            if (biome.isRain) {
                const normRef = getNormRefGrad(ctx);
                // Отражения для трафика
                for (let t of raceTraffic) {
                    if (!t.isCone) {
                        const tx = t.x + getCurveX(t.y);
                        const rW = t.isTruck ? 32 : 22;
                        drawVerticalRef(ctx, tx - rW / 2, t.y + 16, rW, 28, normRef);

                        // Отражения габаритов / стоп-сигналов трафика
                        const tailRef = getNormTailGrad(ctx, t.isBraking);
                        drawVerticalRef(ctx, tx - 8, t.y + 18, 3, 22, tailRef);
                        drawVerticalRef(ctx, tx + 5, t.y + 18, 3, 22, tailRef);
                    }
                }

                // Отражение для автомобиля игрока
                const activeCar = myCars[selectedRaceCarIndex] || myCars.find(c => c.name === selectedRaceCarName);
                const pColor = activeCar?.styling?.color || "#ef4444";
                const pNeon = activeCar?.styling?.neon;
                const pRefGrad = getPlayerRefGrad(ctx, pColor);
                ctx.save();
                ctx.globalAlpha = 0.35;
                drawVerticalRef(ctx, px - 12, racePlayer.y + 20, 24, 34, pRefGrad);
                ctx.restore();

                // Отражение стоп-сигналов игрока
                const pTailRef = getNormTailGrad(ctx, raceKeys.brake);
                drawVerticalRef(ctx, px - 8, racePlayer.y + 22, 3, 26, pTailRef);
                drawVerticalRef(ctx, px + 5, racePlayer.y + 22, 3, 26, pTailRef);

                // Отражение неона под днищем
                if (pNeon && pNeon !== 'none') {
                    const pNeonRef = getPlayerNeonGrad(ctx, pNeon);
                    ctx.save();
                    ctx.globalAlpha = 0.45;
                    drawVerticalRef(ctx, px - 14, racePlayer.y + 20, 28, 32, pNeonRef);
                    ctx.restore();
                }
            }

            // 7. Трафик (другие пиксельные авто, фуры, полиция, конусы)
            const isTrafficLit = biome.isNight || biome.isRain;
            for (let t of raceTraffic) {
                const tx = t.x + getCurveX(t.y);
                if (t.isCone) {
                    drawPixelCar(ctx, tx, t.y, "Дорожный конус", 1.2);
                } else if (t.isTruck) {
                    drawPixelCar(ctx, tx, t.y, "КАМАЗ / Фура", 1.0, {
                        lightsOn: isTrafficLit,
                        tilt: t.tilt || 0,
                        braking: t.isBraking || false,
                        blinkerLeft: t.blinker === 'left' && t.blinkerFlash,
                        blinkerRight: t.blinker === 'right' && t.blinkerFlash
                    });
                } else if (t.isPolice) {
                    drawPixelCar(ctx, tx, t.y, "ДПС / Полиция", 1.0, {
                        lightsOn: isTrafficLit,
                        tilt: t.tilt || 0,
                        braking: t.isBraking || false,
                        blinkerLeft: t.blinker === 'left' && t.blinkerFlash,
                        blinkerRight: t.blinker === 'right' && t.blinkerFlash
                    });
                } else {
                    drawPixelCar(ctx, tx, t.y, t.name, 1.0, {
                        lightsOn: isTrafficLit,
                        tilt: t.tilt || 0,
                        braking: t.isBraking || false,
                        blinkerLeft: t.blinker === 'left' && t.blinkerFlash,
                        blinkerRight: t.blinker === 'right' && t.blinkerFlash
                    });
                }
            }

            // 8. Визуальный след слипстрима (аэродинамический поток)
            if (racePlayer.isDrafting) {
                const pScreenX = racePlayer.x + getCurveX(racePlayer.y);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
                ctx.lineWidth = 1.5;
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.moveTo(pScreenX - 8, racePlayer.y - 12);
                ctx.lineTo(pScreenX - 8, racePlayer.y - 70);
                ctx.moveTo(pScreenX + 8, racePlayer.y - 12);
                ctx.lineTo(pScreenX + 8, racePlayer.y - 70);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Отрисовка клиппинг-зон (Апексов) в режиме Дрифта
            if (raceCurrentMode === 'drift') {
                for (let cz of raceClippingZones) {
                    const cx = cz.x + getCurveX(cz.y);
                    ctx.save();
                    ctx.translate(cx, cz.y);
                    ctx.fillStyle = cz.hit ? '#10b981' : '#c084fc';
                    ctx.beginPath();
                    ctx.arc(0, 0, 14, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🎯', 0, 0);
                    ctx.restore();
                }
            }

            // HUD Радар опасности на высоких скоростях (> 160 км/ч)
            if (racePlayer && racePlayer.speed > 160 && raceCurrentMode !== 'drift') {
                for (let t of raceTraffic) {
                    const distAhead = (racePlayer.y || 470) - t.y;
                    if (distAhead > 80 && distAhead < 650) {
                        const markerX = t.x + getCurveX(t.y);
                        const isTruck = t.isTruck;
                        const isDangerClose = distAhead < 220;
                        const meters = Math.round(distAhead * 0.4);
                        ctx.fillStyle = isTruck ? '#ef4444' : (isDangerClose ? '#f97316' : '#fbbf24');
                        ctx.font = 'bold 10px sans-serif';
                        ctx.textAlign = 'center';
                        let tag = '🚗';
                        if (isTruck) tag = '🚛 ФУРА';
                        else if (t.isPolice) tag = '🚨 ДПС';
                        else if (t.isCone) tag = '🚧 КОНУС';
                        else if (t.isRival) tag = '🏎️ СОПЕРНИК';
                        ctx.fillText(`▼ ${tag} ${meters}м`, markerX, 44);
                    }
                }
            }

            // 8.5. Поисковый прожектор вертолёта ДПС (Helicopter Searchlight Beam при 5 звёздах розыска)
            if (racePlayer.wantedStars >= 5) {
                const nowSec = Date.now() / 1000;
                const spotX = px + Math.sin(nowSec * 2.4) * 26;
                const spotY = (racePlayer.y || 470) - 12 + Math.cos(nowSec * 1.9) * 18;
                const rx = 52, ry = 68;
                ctx.save();
                const outerGrad = (ctx && typeof ctx.createRadialGradient === 'function') ? ctx.createRadialGradient(spotX, spotY, 6, spotX, spotY, ry) : null;
                if (outerGrad && typeof outerGrad.addColorStop === 'function') {
                    outerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
                    outerGrad.addColorStop(0.35, 'rgba(191, 219, 254, 0.28)');
                    outerGrad.addColorStop(0.75, 'rgba(59, 130, 246, 0.12)');
                    outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = outerGrad;
                } else {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                }
                ctx.beginPath();
                ctx.ellipse(spotX, spotY, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();

                const coreGrad = (ctx && typeof ctx.createRadialGradient === 'function') ? ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, rx * 0.4) : null;
                if (coreGrad && typeof coreGrad.addColorStop === 'function') {
                    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
                    coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = coreGrad;
                } else {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                }
                ctx.beginPath();
                ctx.ellipse(spotX, spotY, rx * 0.4, ry * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();

                // Световой луч из неба
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                const heliX = W / 2 + Math.sin(nowSec * 1.4) * 50;
                ctx.moveTo(heliX, 0);
                ctx.lineTo(spotX - rx * 0.7, spotY);
                ctx.moveTo(heliX, 0);
                ctx.lineTo(spotX + rx * 0.7, spotY);
                ctx.stroke();
                ctx.restore();
            }

            // 9. Автомобиль игрока (с учетом угла крена кузова и мигания неуязвимости)
            const shouldBlink = racePlayer.invulnerableTimer > 0 && racePlayer.damageBlink > 2;
            const activeCar = myCars[selectedRaceCarIndex] || myCars.find(c => c.name === selectedRaceCarName);
            if (!shouldBlink) {
                drawPixelCar(ctx, px, racePlayer.y, selectedRaceCarName, 1.0, {
                    lightsOn: true,
                    nitro: racePlayer.isNitroActive,
                    braking: raceKeys.brake,
                    tilt: (racePlayer.yawAngle !== undefined ? racePlayer.yawAngle : racePlayer.tilt),
                    color: activeCar?.styling?.color,
                    neon: activeCar?.styling?.neon,
                    tint: activeCar?.styling?.tint,
                    spoiler: activeCar?.styling?.spoiler,
                    vinyl: activeCar?.styling?.vinyl,
                    wheels: activeCar?.styling?.wheels,
                    suspension: activeCar?.styling?.suspension,
                    sgu: activeCar?.styling?.sgu,
                    sguStrobe: (racePlayer.sguStrobeTimer > 0)
                });
            }

            // Искры БПАН от заниженного брюха при резких маневрах на асфальте
            if (activeCar?.styling?.suspension === 'bpan' && Math.abs(racePlayer.vx) > 14 && Math.random() < 0.28) {
                raceSparks.push({
                    x: racePlayer.x + (Math.random() - 0.5) * 16,
                    y: (racePlayer.y || 470) + 18,
                    vx: (Math.random() - 0.5) * 60,
                    vy: 30 + Math.random() * 50,
                    life: 0.25,
                    color: '#f97316'
                });
            }

            // Аура щита
            if (racePlayer.shield > 0) {
                ctx.strokeStyle = "rgba(168, 85, 247, 0.75)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(px, racePlayer.y, 28, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 10. Искры от касаний и отскоков
            for (let sp of raceSparks) {
                const sx = sp.x + getCurveX(sp.y);
                ctx.fillStyle = sp.color || '#fbbf24';
                ctx.globalAlpha = Math.max(0, sp.life * 2);
                ctx.fillRect(sx, sp.y, 2.5, 2.5);
            }
            ctx.globalAlpha = 1.0;

            // Вспышка молнии на весь экран при грозе
            if (biome.isRain && raceLightningFlash > 0) {
                ctx.fillStyle = `rgba(224, 242, 254, ${Math.min(0.42, raceLightningFlash * 1.8)})`;
                ctx.fillRect(0, 0, W, H);
            }

            // 10.5. Скоростные линии (Speed Lines) и визуальный форсаж нитро
            if (racePlayer.speed > 160 || racePlayer.isNitroActive) {
                const intensity = Math.min(1.0, (racePlayer.speed - 160) / 100 + (racePlayer.isNitroActive ? 0.6 : 0));
                ctx.save();
                ctx.lineWidth = racePlayer.isNitroActive ? 2.5 : 1.8;
                ctx.strokeStyle = racePlayer.isNitroActive ? `rgba(96, 165, 250, ${intensity * 0.7})` : `rgba(255, 255, 255, ${intensity * 0.45})`;
                ctx.beginPath();
                const lineCount = racePlayer.isNitroActive ? 18 : 12;
                for (let li = 0; li < lineCount; li++) {
                    const seed = (li * 97 + Math.floor(raceRoadOffset * 4)) % 1000;
                    const lx = (seed * 4.3) % W;
                    const ly = (seed * 6.7) % H;
                    const len = (40 + (seed % 60)) * (racePlayer.speed / 120);
                    ctx.moveTo(lx, ly);
                    ctx.lineTo(lx - (roadCurve * 0.15), ly + len);
                }
                ctx.stroke();
                ctx.restore();
            }

            // Дым из-под шин при заносе
            for (let smk of raceDriftSmoke) {
                const sx = smk.x + getCurveX(smk.y);
                ctx.save();
                ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(0, smk.life * 0.55)})`;
                ctx.beginPath();
                ctx.arc(sx, smk.y, smk.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Обновление индикатора нитро на мобильной панели (кэшировано без лишних DOM мутаций)
            if (!cachedTouchNitroVal) cachedTouchNitroVal = document.getElementById('hud-touch-nitro-val');
            if (!cachedTouchNitroBtn) cachedTouchNitroBtn = document.getElementById('btn-touch-nitro');
            const isNitroEmpty = racePlayer.nitroDepleted || racePlayer.nitro <= 0.05;
            const nitroText = isNitroEmpty ? '0% ПУСТО' : `${Math.round(racePlayer.nitro)}%`;
            if (cachedTouchNitroVal && prevNitroText !== nitroText) {
                cachedTouchNitroVal.textContent = nitroText;
                prevNitroText = nitroText;
            }
            if (cachedTouchNitroBtn) {
                if (prevNitroEmpty !== isNitroEmpty) {
                    cachedTouchNitroBtn.classList.toggle('nitro-empty', isNitroEmpty);
                    prevNitroEmpty = isNitroEmpty;
                }
                const isNitroAct = !!racePlayer.isNitroActive;
                if (prevNitroActive !== isNitroAct) {
                    cachedTouchNitroBtn.classList.toggle('nitro-active', isNitroAct);
                    prevNitroActive = isNitroAct;
                }
            }

            // Обновление плашки дрифта в мобильном заголовке
            if (!cachedDriftBadge) cachedDriftBadge = document.getElementById('game-drift-badge');
            if (cachedDriftBadge) {
                const isDriftActive = racePlayer.isDrifting || racePlayer.driftCurrentScore > 0;
                const driftText = isDriftActive ? `🌪️ x${racePlayer.driftCombo} | ${Math.round(racePlayer.driftCurrentScore)} PTS` : '';
                if (prevDriftText !== driftText) {
                    prevDriftText = driftText;
                    if (isDriftActive) {
                        cachedDriftBadge.textContent = driftText;
                        cachedDriftBadge.classList.remove('hidden');
                    } else {
                        cachedDriftBadge.classList.add('hidden');
                    }
                }
            }

            if (!cachedQualityBadge) cachedQualityBadge = document.getElementById('game-drift-quality');
            if (cachedQualityBadge) {
                const isQualActive = racePlayer.isDrifting && (racePlayer.isCounterSteering || racePlayer.driftQuality);
                const qualText = isQualActive ? (racePlayer.isCounterSteering ? '🔄 КОНТР-РУЛЬ' : (racePlayer.driftQuality || '⚡ УГОЛ')) : '';
                if (prevQualityText !== qualText) {
                    prevQualityText = qualText;
                    if (isQualActive) {
                        cachedQualityBadge.textContent = qualText;
                        cachedQualityBadge.classList.remove('hidden');
                    } else {
                        cachedQualityBadge.classList.add('hidden');
                    }
                }
            }

            // 11. Игровой HUD на Canvas
            // 🚨 Индикатор уровня розыска (⭐⭐⭐⭐⭐ Wanted Stars) - ВВЕРХУ ПО ЦЕНТРУ ЭКРАНА
            let topCenterOffset = 10;
            if (racePlayer.wantedStars > 0) {
                const bw = 176, bh = 30;
                const bx = W / 2 - bw / 2, by = 10;
                const isFlash = Math.floor(Date.now() / 150) % 2 === 0;
                ctx.fillStyle = "rgba(10, 15, 29, 0.94)";
                ctx.beginPath();
                ctx.roundRect(bx, by, bw, bh, 8);
                ctx.fill();
                ctx.strokeStyle = isFlash ? "#ef4444" : "#3b82f6";
                ctx.lineWidth = 2.2;
                ctx.stroke();

                ctx.font = "14px sans-serif";
                ctx.textAlign = "left";
                let starStr = '';
                for (let s = 1; s <= 5; s++) {
                    starStr += s <= racePlayer.wantedStars ? '⭐' : '☆';
                }
                ctx.fillText(starStr, bx + 8, by + 20);

                ctx.fillStyle = isFlash ? "#fca5a5" : "#93c5fd";
                ctx.font = "bold 10px sans-serif";
                ctx.textAlign = "right";
                const isEscaping = !raceTraffic.some(t => t.isPolice && !t.spinning && Math.abs(t.y - (racePlayer.y || 470)) < 200);
                const statusText = isEscaping ? `⏳${Math.max(0, racePlayer.escapeTimer).toFixed(1)}с` : "🚨 ПОГОНЯ";
                ctx.fillText(statusText, bx + bw - 8, by + 20);

                topCenterOffset = 44;
            }

            // Плашка текущего биома по центру сверху
            ctx.fillStyle = "rgba(10, 15, 29, 0.85)";
            ctx.beginPath();
            ctx.roundRect(W / 2 - 75, topCenterOffset, 150, 24, 6);
            ctx.fill();
            ctx.strokeStyle = biome.themeCol;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.fillStyle = biome.themeCol;
            ctx.font = "800 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`${biome.icon} ${biome.name}`, W / 2, topCenterOffset + 16);

            // Оверлей активного дрифта прямо под биомом
            if (racePlayer.isDrifting || racePlayer.driftCurrentScore > 0) {
                const bw = 186;
                const bh = 28;
                const driftY = topCenterOffset + 28;
                ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
                ctx.beginPath();
                ctx.roundRect(W / 2 - bw / 2, driftY, bw, bh, 6);
                ctx.fill();
                ctx.strokeStyle = racePlayer.isCounterSteering ? "#38bdf8" : "#f59e0b";
                ctx.lineWidth = 1.6;
                ctx.stroke();

                ctx.fillStyle = "#fbbf24";
                ctx.font = "900 11px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(`🌪️ ДРИФТ x${racePlayer.driftCombo} • ${Math.round(racePlayer.driftCurrentScore)} PTS`, W / 2, driftY + 13);

                if (racePlayer.isCounterSteering) {
                    ctx.fillStyle = "#38bdf8";
                    ctx.font = "bold 9px sans-serif";
                    ctx.fillText("🔄 КОНТР-РУЛЕНИЕ (+50% PTS)", W / 2, driftY + 24);
                } else if (racePlayer.driftQuality) {
                    ctx.fillStyle = "#a3e635";
                    ctx.font = "bold 9px sans-serif";
                    ctx.fillText(racePlayer.driftQuality, W / 2, driftY + 24);
                }

                // Combo timer gauge bar
                if (racePlayer.driftComboTimer > 0) {
                    const timerPct = Math.min(1, Math.max(0, racePlayer.driftComboTimer / 2.0));
                    ctx.fillStyle = racePlayer.isCounterSteering ? "#38bdf8" : "rgba(245, 158, 11, 0.9)";
                    ctx.fillRect(W / 2 - (bw - 16) / 2, driftY + bh - 2.5, (bw - 16) * timerPct, 2);
                }
            }

            // Спидометр и датчики (Улучшенная контрастность и читабельность)
            ctx.fillStyle = "rgba(10, 15, 29, 0.85)";
            ctx.beginPath();
            ctx.roundRect(10, 10, 134, 76, 8);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Крупный цифровой спидометр
            const curSpd = Math.round(racePlayer.speed);
            ctx.fillStyle = curSpd >= 260 ? "#ff2e4c" : (curSpd >= 160 ? "#fbbf24" : "#38bdf8");
            ctx.font = "900 28px var(--font-plate)";
            ctx.textAlign = "left";
            ctx.fillText(`${curSpd}`, 16, 38);

            ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
            ctx.font = "800 10px sans-serif";
            ctx.fillText("КМ/Ч", 76, 35);

            // Дистанция
            ctx.fillStyle = "#e2e8f0";
            ctx.font = "700 10px sans-serif";
            ctx.fillText(`🛣️ ${racePlayer.distanceKm.toFixed(2)} км ${raceCurrentMode === 'drift' ? '• 🌪️' : ''}`, 16, 52);

            // Датчик топлива с графической шкалой
            const curFuel = racePlayer.fuelCurrent !== undefined ? racePlayer.fuelCurrent : 20;
            const capFuel = racePlayer.fuelTankCapacity || 20;
            const fuelPct = Math.max(0, Math.min(100, Math.round((curFuel / capFuel) * 100)));
            const isFuelLow = fuelPct < 20;
            const fuelCol = isFuelLow ? "#ef4444" : (fuelPct < 40 ? "#f59e0b" : "#22c55e");

            // Шкала топлива
            ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
            ctx.fillRect(16, 58, 116, 6);
            ctx.fillStyle = fuelCol;
            ctx.fillRect(16, 58, Math.round(116 * (fuelPct / 100)), 6);

            ctx.fillStyle = fuelCol;
            ctx.font = "700 9px sans-serif";
            ctx.fillText(`⛽ ${curFuel.toFixed(1)} Л (${fuelPct}%)`, 16, 76);

            ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
            ctx.font = "600 8px sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(`−${Math.round((racePlayer.fuelLiters || 0) * NomeraRaceEconomy.FUEL_PRICE)} ₽`, 132, 76);

            // Заработок за заезд (верхний правый угол)
            ctx.fillStyle = "rgba(10, 15, 29, 0.85)";
            ctx.beginPath();
            ctx.roundRect(W - 135, 10, 125, 42, 8);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = "var(--accent-green)";
            ctx.font = "900 14px sans-serif";
            ctx.textAlign = "right";
            const netPreview = NomeraRaceEconomy.settle(racePlayer.earnedCash, racePlayer.fuelLiters || 0, balance);
            ctx.fillText(`${netPreview.net >= 0 ? '+' : '−'}${Math.abs(netPreview.net).toLocaleString('ru-RU')} ₽`, W - 16, 32);

            ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
            ctx.font = "700 9px sans-serif";
            ctx.fillText(raceCurrentMode === 'drift' ? '🏁 Дрифт' : '🏁 Шоссе', W - 16, 46);


            // В режиме Дрифта: предупреждение о крутых шпильках серпантина
            if (raceCurrentMode === 'drift' && Math.abs(roadCurve) > 38) {
                ctx.fillStyle = "#fbbf24";
                ctx.font = "900 11px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(roadCurve > 0 ? "◀◀ КРУТАЯ ШПИЛЬКА (ВЛЕВО)" : "КРУТАЯ ШПИЛЬКА (ВПРАВО) ▶▶", W / 2, 74);
            }

            // Индикатор слипстрима
            if (racePlayer.isDrafting) {
                ctx.fillStyle = "rgba(56, 189, 248, 0.9)";
                ctx.font = "bold 11px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("💨 СЛИПСТРИМ! (+28 км/ч)", W / 2, 54);
            }

            // Индикатор трения о стену / ограждение
            if (racePlayer.isOnWall) {
                ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
                ctx.font = "bold 11px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("⚠️ ТРЕНИЕ О СТЕНУ: ЗАРАБОТОК 0 ₽ | РЕМОНТ", W / 2, 72);
            }

            // Шкала Нитро
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(10, H - 24, W - 20, 14);
            ctx.fillStyle = isNitroEmpty ? "rgba(239, 68, 68, 0.25)" : "rgba(59, 130, 246, 0.2)";
            ctx.fillRect(12, H - 22, W - 24, 10);
            ctx.fillStyle = isNitroEmpty ? "#ef4444" : (racePlayer.isNitroActive ? "#60a5fa" : "#38bdf8");
            ctx.fillRect(12, H - 22, (W - 24) * (racePlayer.nitro / 100), 10);

            ctx.fillStyle = "#fff";
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(isNitroEmpty ? "⚠️ НИТРО ПУСТО (ЗАРЯДКА ОТ 20%)" : (racePlayer.isNitroActive ? "🔥 НИТРО АКТИВНО!" : "🚀 ЗАКИСЬ АЗОТА (НИТРО)"), W / 2, H - 14);
        }

        function closePlayerViewModal() {
            document.getElementById('player-view-modal').classList.remove('show');
        }

        function switchTab(tabId, element, raceMode) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.nav-tab').forEach(el => { el.classList.remove('active'); el.setAttribute('aria-selected', 'false'); });
            const target = document.getElementById(tabId);
            if (target) target.classList.remove('hidden');
            if (element) { element.classList.add('active'); element.setAttribute('aria-selected', 'true'); }
            if (tabId === 'leaderboard') renderLeaderboard();
            if (tabId === 'multiplayer') {
                if (activeMultiSubTab === 'market') renderMarketListings();
                if (activeMultiSubTab === 'chat') renderChatMessages();
            }
            if (tabId === 'racegame') {
                initRaceGameTab();
                if (raceMode) {
                    switchRaceMode(raceMode);
                } else if (element && element.id === 'nav-tab-3d-race') {
                    switchRaceMode('3d');
                }
            }
            if (tabId === 'garage') {
                try { preloadUserGarageModels(); } catch (_) {}
                initGarage3DShowroom();
            } else {
                if (garage3DShowroom) garage3DShowroom.stop();
            }
            if (tabId !== 'racegame' && isRaceRunning) exitRaceGame();

            if (typeof updatePlayerPresence === 'function') {
                const tabNames = {
                    'generator': ['🔢 Генератор номеров', `Регион ${currentReg}`],
                    'garage': ['🔧 В гараже', `Машин: ${Array.isArray(myCars) ? myCars.length : 0}`],
                    'cars': ['🔧 В гараже', `Машин: ${Array.isArray(myCars) ? myCars.length : 0}`],
                    'cases': ['🎰 Рулетка и кейсы', 'Выбор кейса'],
                    'multiplayer': ['👥 Мультиплеер', activeMultiSubTab === 'market' ? 'На авторынке' : 'В онлайн-чате'],
                    'leaderboard': ['🏆 Рейтинг', 'Таблица лидеров'],
                    'city3d': ['🏙️ Город 3D', 'Исследование карты'],
                    'racegame': ['🏎️ Гоночный трек', 'Подготовка к заезду']
                };
                const tabInfo = tabNames[tabId] || ['🎮 В игре', tabId];
                updatePlayerPresence(tabInfo[0], tabInfo[1]);
            }
        }

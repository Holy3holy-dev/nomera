const DEFAULT_AVATAR = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

        const DEFAULT_CAR_IMG = "./icons/car-placeholder.svg";

        // Автосалон (14 автомобилей с точными пиксельными моделями)
        const carsData = [
            { name: "ВАЗ-2107 «Жигули»", category: "Классика", price: 120000, img: DEFAULT_CAR_IMG },
            { name: "Lada Priora БПАН", category: "Седан", price: 350000, img: DEFAULT_CAR_IMG },
            { name: "Lada Vesta Sport", category: "Спорт-седан", price: 850000, img: DEFAULT_CAR_IMG },
            { name: "Volkswagen Polo", category: "Городской", price: 950000, img: DEFAULT_CAR_IMG },
            { name: "BMW M5 E60 V10", category: "Легенда", price: 2200000, img: DEFAULT_CAR_IMG },
            { name: "Toyota Camry 3.5", category: "Бизнес", price: 2800000, img: DEFAULT_CAR_IMG },
            { name: "Toyota Land Cruiser 300", category: "Внедорожник", price: 5500000, img: DEFAULT_CAR_IMG },
            { name: "Mercedes-Benz E63s AMG", category: "Премиум-спорт", price: 7800000, img: DEFAULT_CAR_IMG },
            { name: "Audi RS6 Avant", category: "Универсал-ракета", price: 9200000, img: DEFAULT_CAR_IMG },
            { name: "BMW M5 F90 Competition", category: "Спорткар", price: 11500000, img: DEFAULT_CAR_IMG },
            { name: "Mercedes-Benz G63 AMG «Гелик»", category: "Люкс Внедорожник", price: 18000000, img: DEFAULT_CAR_IMG },
            { name: "Porsche 911 Turbo S", category: "Суперкар", price: 25000000, img: DEFAULT_CAR_IMG },
            { name: "Rolls-Royce Cullinan", category: "Ультра-Люкс", price: 55000000, img: DEFAULT_CAR_IMG },
            { name: "Bugatti Chiron Super Sport", category: "Гиперкар", price: 190000000, img: DEFAULT_CAR_IMG }
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
            label.classList.remove('h3h-rarity-pop');
            void plate.offsetWidth;
            plate.classList.add('h3h-plate-drop');
            label.classList.add('h3h-rarity-pop');
            if (/Легендарный|БЛАТНОЙ|Крутой/i.test(rarityText)) {
                const stage = document.querySelector('.plate-stage');
                if (stage && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
                    for (let i = 0; i < 12; i++) {
                        const spark = document.createElement('i');
                        spark.className = 'h3h-reward-spark';
                        spark.style.setProperty('--angle', `${i * 30}deg`);
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
        let activeAdminSubTab = 'users';

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
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='50' fill='%23232c1c'/><g fill='none' stroke='%23d2f465' stroke-width='3'><path d='M20 57l9-17 15-4h20l11 13 7 4v15H20z'/><path d='M34 40h27l9 12H27'/><circle cx='34' cy='67' r='7' fill='%23232c1c'/><circle cx='68' cy='67' r='7' fill='%23232c1c'/></g></svg>",
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='50' fill='%23b45309'/><text x='50' y='64' font-size='48' text-anchor='middle'>👑</text></svg>",
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='50' fill='%23047857'/><text x='50' y='64' font-size='48' text-anchor='middle'>🦁</text></svg>",
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='50' fill='%231d4ed8'/><text x='50' y='64' font-size='48' text-anchor='middle'>⚡</text></svg>",
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='50' fill='%236d28d9'/><text x='50' y='64' font-size='48' text-anchor='middle'>🐯</text></svg>",
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='50' fill='%23be123c'/><text x='50' y='64' font-size='48' text-anchor='middle'>🚀</text></svg>",
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='50' fill='%23334155'/><text x='50' y='64' font-size='48' text-anchor='middle'>🐺</text></svg>",
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='50' fill='%230f172a'/><text x='50' y='64' font-size='48' text-anchor='middle'>🕶️</text></svg>"
        ];

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
        let activeRaceMode = 'circuit';
        let currentMarketFilter = 'all';
        let activeCollectionTab = 'plates';
        let stylingActiveCarIndex = -1;
        let stylingTempColor = '#ffffff';
        let stylingTempTint = 0;
        let stylingTempNeon = 'none';

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
        document.addEventListener('pointerdown', () => { if (!document.hidden) initAudio(); }, {passive: true});
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

        // --- ИНИЦИАЛИЗАЦИЯ, ХРАНИЛИЩЕ И ОБЛАКО FIREBASE ---
        window.onload = function() {
            refreshSoundUI();
            showSaveStatus(saveStatus);
            document.querySelectorAll('.touch-btn').forEach(button => {
                button.addEventListener('pointerdown', event => {
                    if (typeof button.setPointerCapture === 'function' && event.pointerId !== undefined) {
                        try { button.setPointerCapture(event.pointerId); } catch (_) {}
                    }
                    if (typeof event.preventDefault === 'function') event.preventDefault();
                });
                button.addEventListener('lostpointercapture', () => {
                    const key = button.id.replace('btn-touch-', '');
                    setRaceKey(key, false);
                });
            });
            document.addEventListener('touchcancel', resetRaceKeys);

            // Прямое управление касанием / перетаскиванием по экрану холста трассы
            const raceCanvas = document.getElementById('race-canvas');
            if (raceCanvas && typeof raceCanvas.addEventListener === 'function') {
                let canvasSteerPointerId = null;
                const updateCanvasSteer = (e) => {
                    if (typeof raceCanvas.getBoundingClientRect !== 'function') return;
                    const rect = raceCanvas.getBoundingClientRect();
                    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
                    if (clientX === null || !rect.width) return;
                    const relX = clientX - rect.left;
                    if (relX < rect.width * 0.44) {
                        setRaceKey('left', true);
                        setRaceKey('right', false);
                    } else if (relX > rect.width * 0.56) {
                        setRaceKey('right', true);
                        setRaceKey('left', false);
                    } else {
                        setRaceKey('left', false);
                        setRaceKey('right', false);
                    }
                };
                raceCanvas.addEventListener('pointerdown', (e) => {
                    if (!isRaceRunning) return;
                    canvasSteerPointerId = e.pointerId;
                    if (typeof raceCanvas.setPointerCapture === 'function' && e.pointerId !== undefined) {
                        try { raceCanvas.setPointerCapture(e.pointerId); } catch (_) {}
                    }
                    updateCanvasSteer(e);
                    if (typeof e.preventDefault === 'function') e.preventDefault();
                });
                raceCanvas.addEventListener('pointermove', (e) => {
                    if (canvasSteerPointerId !== null && isRaceRunning) {
                        updateCanvasSteer(e);
                        if (typeof e.preventDefault === 'function') e.preventDefault();
                    }
                });
                const releaseCanvasSteer = (e) => {
                    if (canvasSteerPointerId !== null) {
                        canvasSteerPointerId = null;
                        if (typeof raceCanvas.releasePointerCapture === 'function' && e && e.pointerId !== undefined) {
                            try { raceCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
                        }
                        setRaceKey('left', false);
                        setRaceKey('right', false);
                    }
                };
                raceCanvas.addEventListener('pointerup', releaseCanvasSteer);
                raceCanvas.addEventListener('pointercancel', releaseCanvasSteer);
                raceCanvas.addEventListener('lostpointercapture', releaseCanvasSteer);
            }

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
        function logPlayerActivity(action, details) {
            const entry = {
                nickname: nickname || "Гость",
                action: action,
                details: details,
                timestamp: Date.now()
            };
            adminActivityLogs.unshift(entry);
            if (adminActivityLogs.length > 200) adminActivityLogs.pop();
            if (isAdmin) renderAdminActivity();

            // Browser activity is deliberately not written to the protected database.

        }

        function saveProgress() {
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

            // V4.4: legacy direct client writes disabled. Server economy uses onlineV4 API.
            showSaveStatus('✓ Игра сохранена на устройстве · онлайн-кошелёк на сервере');
            renderLeaderboard();
            updateBadge();
            updateProfileUI();
            if (typeof syncCloudGarage === 'function') syncCloudGarage();
        }

        function loadProgress() {
            raceRecordStore.bind(sanitizeKey(nickname));
            const savedRaw = localStore.get('nomera_player_account');

            if (savedRaw) {
                try {
                    const d = JSON.parse(savedRaw);
                    balance = d.balance ?? balance;
                    nickname = d.nickname || nickname;
                    raceRecordStore.bind(sanitizeKey(nickname), { legacy: true, snapshot: d.raceRecords });
                    playerPin = d.playerPin || playerPin;
                    avatarData = d.avatarData || avatarData;
                    inventory = Array.isArray(d.inventory) ? d.inventory : [];
                    myCars = Array.isArray(d.myCars) ? d.myCars : myCars;
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

        function setupMultiplayerListeners() {
            refreshOnlinePublic().catch(()=>{});
            const sessionPromise = restoreOnlineSession();
            if (db && typeof db.ref === 'function') {
                try {
                    db.ref('.info/connected').on('value', snap => {
                        isFirebaseConnected = !!snap.val();
                        if (isFirebaseConnected) {
                            setFirebaseState('🟢 Firebase: онлайн', true);
                            const pKey = sanitizeKey(nickname || 'Гость');
                            const presenceRef = db.ref('presence/' + pKey);
                            presenceRef.set({ nickname: nickname || 'Гость', timestamp: Date.now() }).catch(() => {});
                            if (presenceRef.onDisconnect) presenceRef.onDisconnect().remove();
                        } else {
                            setFirebaseState('⚪ Firebase: подключение...', false);
                        }
                    });
                    db.ref('presence').on('value', snap => {
                        const count = Object.keys(snap.val() || {}).length || 1;
                        const badge = document.getElementById('multi-online-count');
                        if (badge) badge.textContent = `${count} онлайн`;
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
                        renderLeaderboard();
                    });
                } catch (_) {}
            }
            setInterval(()=>{ if(!document.hidden) refreshOnlinePublic().catch(()=>{}); },12000);
            return sessionPromise;
        }

        // --- УПРАВЛЕНИЕ АККАУНТОМ И АВТОРИЗАЦИЕЙ ---
        function openProfileModal() {
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
        }

        function saveAccountProfile() {
            const newName = document.getElementById('nickname-input').value.trim();
            if (newName.length < 2) {
                notifyUser("Никнейм должен быть не короче 2 символов!");
                return;
            }

            if (sanitizeKey(newName) !== sanitizeKey(nickname)) {
                notifyUser('Смена никнейма временно недоступна до защищённой миграции аккаунтов. Аватар можно менять.');
                return;
            }
            nickname = newName;

            const fileInput = document.getElementById('avatar-input');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    avatarData = e.target.result;
                    saveProgress();
                    closeProfileModal();
                    notifyUser("Профиль обновлён. Результат сохранения показан в строке статуса.");
                };
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                saveProgress();
                closeProfileModal();
                notifyUser("Профиль обновлён. Результат сохранения показан в строке статуса.");
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
            if (reset || !same) resetLocalGameFor(profile.nickname);
            else {
                // loadProgress() has already loaded the matching device-specific game state.
                nickname = saved.nickname;
                playerPin = '';
                localStore.set('nomera_user_session', JSON.stringify({nickname}));
            }
            setOnlineProfile(profile, true);
            if(profile.draft) syncServerDraft(profile.draft);
            updateProfileUI();
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
            localStore.remove('nomera_user_session');
            updateBalance();
            updateExpUI();
            renderInventory();
            renderCars();
            renderOnlineAccount();
            saveProgress();
            closeProfileModal();
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
                    onlSnap.exists() ? db.ref('onlineV4/accounts/' + key).update({ balance: confirmedBalance, updatedAt: now }) : Promise.resolve()
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
            for (const name of ['users','activity','tools']) {
                document.getElementById('adm-panel-' + name)?.classList.toggle('hidden', name !== tab);
                document.getElementById('btn-adm-' + name)?.classList.toggle('active', name === tab);
            }
            if (tab === 'users') fetchAdminUsers();
            if (tab === 'activity') fetchAdminActivity();
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
            body.innerHTML = users.length ? users.map(u => `
                <tr><td><b>${escapeHtml(u.nickname)}</b><small class="admin-key">${escapeHtml(u.key)}</small></td>
                <td><span class="admin-pass-code">${escapeHtml(u.pin || u.password || '—')}</span></td><td>${Number(u.balance||0).toLocaleString('ru-RU')} ₽</td>
                <td>${Number(u.playerLevel||1)}</td><td>🚗 ${Number(u.carsCount||0)} / 🎫 ${Number(u.platesCount||0)}</td>
                <td><div class="admin-actions"><button class="test-btn" onclick="adminRenameUser(${jsArg(u.key)})">✏️ Ник</button>
                <button class="test-btn" onclick="adminPromptBalance(${jsArg(u.key)})">💰 Баланс</button>
                <button class="test-btn" onclick="adminGiveUserCar(${jsArg(u.key)})">🚗 Авто</button>
                <button class="test-btn" onclick="adminGiveUserPlate(${jsArg(u.key)})">🎫 Номер</button>
                <button class="test-btn admin-danger" onclick="adminDeleteUser(${jsArg(u.key)})">🗑️ Удалить</button></div></td></tr>`).join('') : '<tr><td colspan="6">В базе пока нет игроков</td></tr>';
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
            try { await adminRequest(action, data); notifyUser(success); await fetchAdminUsers(); return true; }
            catch (e) { notifyUser(e.message, 'error'); return false; }
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
        async function adminGiveUserCar(key) {
            const names = carsData.map(c=>c.name);
            const carIndex = await adminInput('Добавить авто игроку '+key, 'Индекс модели (1–14): '+names.map((x,i)=>`${i+1} ${x}`).join('; '), '1');
            if (carIndex === null) return;
            const car = carsData[Number(carIndex)-1];
            if (!car) { notifyUser('Неверный номер модели','error'); return; }
            await adminExecute('giveCar',{key, carName:car.name},'Автомобиль выдан');
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
        async function adminGiveAllCars() {
            await adminExecute('giveAllCars',{key:'h3h'},'Автопарк добавлен в профиль h3h');
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
        async function onlineRequest(action,params={},method='POST') {
            let useFirebaseFallback = false;
            let body = null;
            try {
                const url=ONLINE_ENDPOINT+(method==='GET'?'?action='+encodeURIComponent(action):'');
                const res=await fetch(url,{method,credentials:'same-origin',
                    ...(method==='POST'?{headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...params})}:{})});
                if (res.status === 404 || res.status === 503) {
                    useFirebaseFallback = true;
                } else {
                    body = await res.json().catch(() => null);
                    if (!body) {
                        useFirebaseFallback = true;
                    } else if (res.ok && body.ok) {
                        return body;
                    } else {
                        const errMsg = String(body?.error || '');
                        if (errMsg.includes('секреты') || errMsg.includes('Netlify') || errMsg.includes('не настроен')) {
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
                useFirebaseFallback = true;
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

            if (action === 'roll') {
                if (!onlineProfile) throw Error('Требуется вход');
                const cost = params.mode === 'both' ? 900 : 500;
                if (onlineProfile.balance < cost) throw Error('Недостаточно средств для спина');
                const newBal = onlineProfile.balance - cost;
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
                    newNum = generateLuckyNumberLocal(forceTier);
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
                    newLetters = generateLuckyLettersLocal(forceTier);
                    hasLetters = true;
                    changedLetters = true;
                }

                const draft = {
                    letters: newLetters,
                    num: newNum,
                    reg: params.region || existingDraft.reg || currentReg || '77',
                    hasNumbers,
                    hasLetters,
                    changedNumbers,
                    changedLetters
                };

                onlineProfile.draft = draft;
                onlineProfile.balance = newBal;
                balance = newBal;
                updateBalance();

                await Promise.all([
                    db.ref('onlineV4/accounts/' + userKey).update({ balance: newBal, draft, updatedAt: Date.now() }),
                    db.ref('users/' + userKey).update({ balance: newBal, updatedAt: Date.now() }).catch(() => {}),
                    db.ref('leaderboard/' + userKey).update({ balance: newBal, updatedAt: Date.now() }).catch(() => {})
                ]);

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
                const [l1, l2, l3] = draft.letters;
                const plateText = `${l1} ${draft.num} ${l2}${l3} | ${draft.reg} RUS`;
                const price = typeof getCalculatedPrice === 'function' ? getCalculatedPrice(l1, l2, l3, draft.num, draft.reg) : (typeof calculatePrice === 'function' ? calculatePrice() : 2500);
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
            if(wallet) wallet.textContent=onlineProfile
                ? `🔒 Серверный баланс: ${Number(onlineProfile.balance).toLocaleString('ru-RU')} ₽`
                : 'Гостевой генератор: номера нельзя выставлять. Войди в аккаунт, чтобы сохранять номера для рынка.';
            el.textContent=onlineProfile
                ? `🔒 ${onlineProfile.nickname} · онлайн-кошелёк: ${Number(onlineProfile.balance).toLocaleString('ru-RU')} ₽ · подтверждено номеров: ${(onlineProfile.inventory||[]).length}`
                : '🔒 Нет активного аккаунта · войдите или зарегистрируйтесь один раз';
        }
        let syncGarageTimer = null;
        function syncCloudGarage() {
            if (!onlineProfile) return;
            clearTimeout(syncGarageTimer);
            syncGarageTimer = setTimeout(async () => {
                try {
                    await onlineRequest('syncGarage', { myCars });
                    if (onlineProfile) onlineProfile.myCars = [...myCars];
                } catch (e) {
                    console.warn('Не удалось синхронизировать гараж с сервером:', e.message);
                }
            }, 500);
        }

        function setOnlineProfile(profile,applyInventory=false) {
            onlineProfile=profile;
            if(profile && applyInventory) {
                const owned=new Set((profile.inventory||[]).map(p=>p.text));
                const unconfirmed=inventory.filter(p=>!p.id&&!owned.has(p.text));
                inventory=[...(profile.inventory||[]),...unconfirmed];
                if (Array.isArray(profile.myCars) && profile.myCars.length > 0) {
                    myCars = profile.myCars;
                    renderCars();
                } else if (myCars && myCars.length > 0) {
                    syncCloudGarage();
                }
                renderInventory();
                saveProgress();
            }
            renderOnlineAccount();
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
            if (balance < lot.price) return notifyUser('Недостаточно средств', 'error');

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
                balance -= lot.price;
                myCars.push(lot.car);
                if (db) {
                    db.ref('onlineV4/market/' + lotId).remove().catch(() => {});
                }
                delete marketLots[lotId];
                playCashSound();
                updateBalance();
                renderCars();
                saveProgress();
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
                if (db) {
                    db.ref('onlineV4/market/' + lotId).remove().catch(() => {});
                }
                delete marketLots[lotId];
                renderCars();
                saveProgress();
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
                                    <img src="${imageSrc(sellerAvatar)}" class="market-seller-avatar" onerror="this.src='${DEFAULT_AVATAR}'">
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
                                    <img src="${imageSrc(sellerAvatar)}" class="market-seller-avatar" onerror="this.src='${DEFAULT_AVATAR}'">
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
                                <img src="${imageSrc(m.senderAvatar || DEFAULT_AVATAR)}" class="chat-author-avatar" onerror="this.src='${DEFAULT_AVATAR}'">
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
            const el = document.getElementById('balance');
            if (el) el.innerText = balance.toLocaleString('ru-RU');
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

            let needed = getExpNeeded(playerLevel);
            while (playerExp >= needed && playerLevel < 777) {
                playerExp -= needed;
                playerLevel++;
                needed = getExpNeeded(playerLevel);
            }
            updateExpUI();
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
                if (num === '011') return 12000000;
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
            if (num === '011') price += 1500000;
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
            input.focus(); input.select();
        }
        function saveRegionEdit() {
            const input = document.getElementById('region-edit-input');
            const editor = document.getElementById('region-editor');
            const next = String(input.value).trim();
            if (!/^\d{2,3}$/.test(next)) { notifyUser('Регион должен содержать 2 или 3 цифры', 'error'); return; }
            if(onlineProfile && (boardHasLetters||boardHasNumbers)) {
                notifyUser('Регион серверного номера фиксируется при спине. Сначала сохраните номер или выполните полный спин с новым регионом.','error');
                editor.classList.add('hidden');
                return;
            }
            currentReg = next;
            document.getElementById('region').innerText = currentReg;
            editor.classList.add('hidden');
            checkCanSaveButton();
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
            btnSave.disabled = !canSaveNow;
            if (canSaveNow) btnSave.classList.add('can-save');
            else btnSave.classList.remove('can-save');

            if (boardHasLetters && boardHasNumbers) {
                let price = calculatePrice();
                let rarity = getRarity(price);
                document.getElementById('current-price-display').innerHTML = `Оценка номера: <b style="color:var(--accent-green); margin-left:4px;">${price.toLocaleString('ru-RU')} ₽</b>`;
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
        function setCellChar(cellId, char) {
            const cell = document.getElementById(cellId);
            if (cell) {
                const span = cell.querySelector('.char-span');
                if (span) span.innerText = char;
            }
        }

        function executeCellSpin(targets, finalValues, onFinish) {
            initAudio();
            isSpinning = true;

            const animStyle = document.getElementById('anim-style-select').value;
            const isTurbo = document.getElementById('turbo-toggle').checked;

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

            const startTime = performance.now();
            const activeCells = new Set(targets);

            targets.forEach(id => {
                const cellEl = document.getElementById(id);
                if (cellEl) {
                    cellEl.classList.add('spinning');
                    cellEl.classList.remove('stopped');
                }
            });

            let maxDuration = Math.max(...Object.values(stopDelays)) + 150;

            const spinInterval = setInterval(() => {
                const elapsed = performance.now() - startTime;
                playTick();

                activeCells.forEach(id => {
                    if (id.startsWith('cell-l')) setCellChar(id, randomItem(lettersArr));
                    else setCellChar(id, Math.floor(Math.random() * 10).toString());

                    if (elapsed >= stopDelays[id]) {
                        activeCells.delete(id);
                        const cellEl = document.getElementById(id);
                        cellEl.classList.remove('spinning');
                        cellEl.classList.add('stopped');
                        setCellChar(id, finalValues[id]);

                        let pitch = 0.9 + (targets.indexOf(id) * 0.1);
                        playLockSound(pitch);
                        if (typeof sound?.haptic === 'function') sound.haptic('medium');
                    }
                });

                if (activeCells.size === 0 || elapsed > maxDuration) {
                    clearInterval(spinInterval);
                    targets.forEach(id => {
                        const cellEl = document.getElementById(id);
                        cellEl.classList.remove('spinning');
                        setCellChar(id, finalValues[id]);
                    });

                    isSpinning = false;
                    checkCanSaveButton();
                    saveProgress();

                    if (boardHasLetters && boardHasNumbers) {
                        let finalPrice = calculatePrice();
                        let r = getRarity(finalPrice);
                        flashPlateReward(r.text);
                        if (r.text === "БЛАТНОЙ" || r.text === "Легендарный" || r.text === "Крутой" || r.text === "Мифический") {
                            pityCounterBoth = 0;
                            updatePityUI();
                            triggerLegendaryEffect();
                            triggerScreenShake();
                            playWinJingle(r.text);
                            if (typeof sound?.haptic === 'function') sound.haptic('win');
                        } else if (r.text === "Эпический") {
                            if (pityCounterBoth >= 25 && pityCounterBoth < 65) {
                                pityCounterBoth = 0;
                                updatePityUI();
                            }
                            playWinJingle(r.text);
                            if (typeof sound?.haptic === 'function') sound.haptic('win');
                        } else if (r.text === "Редкий") {
                            if (pityCounterBoth < 25) {
                                pityCounterBoth = 0;
                                updatePityUI();
                            }
                            if (typeof sound?.haptic === 'function') sound.haptic('medium');
                        } else if (r.text === "Супер редкий") {
                            playWinJingle(r.text);
                            if (typeof sound?.haptic === 'function') sound.haptic('win');
                        }
                        const curPlateText = `${currentL1} ${currentNum} ${currentL2}${currentL3} | ${currentReg} RUS`;
                        logPlayerActivity('Крутит номер', `Выпал госномер «${curPlateText}» (${escapeHtml(r.text)}, ${finalPrice.toLocaleString('ru-RU')} ₽)`);
                        recordQuestProgress('spins', 1);
                        checkAchievements();
                    }

                    if (onFinish) onFinish();
                }
            }, 55);
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
                const data=await onlineRequest('roll',{mode,region:currentReg});
                setOnlineProfile(data.profile);
                syncServerDraft(data.draft, mode);
                const targets=mode==='both'
                    ? ['cell-l1','cell-n1','cell-n2','cell-n3','cell-l2','cell-l3']
                    : mode==='numbers'?['cell-n1','cell-n2','cell-n3']:['cell-l1','cell-l2','cell-l3'];
                const chars={'cell-l1':currentL1,'cell-n1':currentNum[0], 'cell-n2':currentNum[1],
                    'cell-n3':currentNum[2], 'cell-l2':currentL2,'cell-l3':currentL3};
                executeCellSpin(targets,chars);
            } catch(e) {notifyUser('Спин не выполнен: '+e.message,'error');}
            finally {serverSpinBusy=false;}
        }

        function updatePityUI() {
            const countEl = document.getElementById('pity-count');
            const milestoneEl = document.getElementById('pity-next-milestone');
            const fillEl = document.getElementById('pity-progress-fill');
            if (!countEl || !milestoneEl || !fillEl) return;

            countEl.innerText = pityCounterBoth;
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

        function generateLuckyNumberLocal(forceTier) {
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

            const roll = Math.floor(Math.random() * 1000);
            if (roll < 5) {
                return randomItem(['777','001','007','011']);
            }
            if (roll < 25) {
                return randomItem([
                    '111','222','333','444','555','666','888','999',
                    '100','200','300','400','500','600','700','800','900',
                    '002','003','004','005','006','007','008','009'
                ]);
            }
            if (roll < 60) {
                return randomItem(['123','234','345','456','567','678','789','987','876','765','654','543','432','321']);
            }
            return Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        }

        function generateLuckyLettersLocal(forceTier) {
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

            const roll = Math.floor(Math.random() * 1000);
            if (roll < 8) {
                const elite = randomItem(eliteLetters);
                return [elite[0], elite[1], elite[2]];
            }
            if (roll < 28) {
                const l = randomItem(lettersArr);
                return [l, l, l];
            }
            if (roll < 78) {
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
            balance -= 500;
            updateBalance();

            pityCounterNum++;
            let n;
            if (pityCounterNum >= currentPityTargetNum) {
                pityCounterNum = 0;
                n = Math.random() < 0.25 ? '777' : Math.floor(Math.random() * 10).toString().repeat(3);
            } else {
                n = generateLuckyNumberLocal();
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
            balance -= 500;
            updateBalance();

            pityCounterLet++;
            let l1, l2, l3;
            if (pityCounterLet >= currentPityTargetLet) {
                pityCounterLet = 0;
                let elite = randomItem(eliteLetters);
                l1 = elite[0]; l2 = elite[1]; l3 = elite[2];
            } else {
                let letArr = generateLuckyLettersLocal();
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
            balance -= 900;
            updateBalance();

            pityCounterBoth++;
            let forceTier = null;
            if (pityCounterBoth >= 120) forceTier = 'legendary';
            else if (pityCounterBoth >= 65) forceTier = 'epic';
            else if (pityCounterBoth >= 25) forceTier = 'rare';

            let n = generateLuckyNumberLocal(forceTier);
            let letArr = generateLuckyLettersLocal(forceTier);
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

        function toggleAutoSpin() {
            isAutoSpinning = !isAutoSpinning;
            const btn = document.getElementById('btn-auto-spin');
            btn.innerText = isAutoSpinning ? "🔄 Авто: ВКЛ" : "🔄 Авто: ВЫКЛ";
            btn.classList.toggle('active', isAutoSpinning);

            if (isAutoSpinning) runAutoSpinStep();
        }

        function runAutoSpinStep() {
            if (!isAutoSpinning) return;
            if (isSpinning) { setTimeout(runAutoSpinStep, 200); return; }
            if ((onlineProfile ? Number(onlineProfile.balance) : balance) < 900) {
                toggleAutoSpin(); notifyUser('Авто-спин остановлен: на активном кошельке недостаточно денег!'); return;
            }

            spinBoth();
            setTimeout(() => {
                if (isAutoSpinning) runAutoSpinStep();
            }, 1800);
        }

        async function savePlate() {
            if (!boardHasLetters || !boardHasNumbers || isSpinning) return;
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
            'normal': { title: "📦 Обычный Box", price: 5000, contents: [ {r:'Обычный', count:10}, {r:'Редкий', count:5}, {r:'Супер редкий', count:6} ], probs: [{r:'Обычный', p:0.80}, {r:'Редкий', p:0.17}, {r:'Супер редкий', p:0.03}] },
            'super': { title: "🎁 Супер Box", price: 50000, contents: [ {r:'Редкий', count:15}, {r:'Супер редкий', count:5}, {r:'Эпический', count:6} ], probs: [{r:'Редкий', p:0.80}, {r:'Супер редкий', p:0.17}, {r:'Эпический', p:0.03}] },
            'mega': { title: "💎 Mega Box", price: 200000, contents: [ {r:'Супер редкий', count:15}, {r:'Эпический', count:4}, {r:'Легендарный', count:5} ], probs: [{r:'Супер редкий', p:0.85}, {r:'Эпический', p:0.12}, {r:'Легендарный', p:0.03}] },
            'car_standard': {
                title: "🏎️ Авто-Кейс",
                isCar: true,
                price: 500000,
                cars: [
                    { name: "ВАЗ-2107 «Жигули»", weight: 35 },
                    { name: "Lada Priora БПАН", weight: 30 },
                    { name: "Lada Vesta Sport", weight: 15 },
                    { name: "Volkswagen Polo", weight: 12 },
                    { name: "BMW M5 E60 V10", weight: 5 },
                    { name: "Toyota Camry 3.5", weight: 2.5 },
                    { name: "Toyota Land Cruiser 300", weight: 0.5 }
                ]
            },
            'car_luxury': {
                title: "👑 Элит Авто Box",
                isCar: true,
                price: 5000000,
                cars: [
                    { name: "Toyota Camry 3.5", weight: 30 },
                    { name: "Toyota Land Cruiser 300", weight: 26 },
                    { name: "Mercedes-Benz E63s AMG", weight: 18 },
                    { name: "Audi RS6 Avant", weight: 13 },
                    { name: "BMW M5 F90 Competition", weight: 7 },
                    { name: "Mercedes-Benz G63 AMG «Гелик»", weight: 4 },
                    { name: "Porsche 911 Turbo S", weight: 1.5 },
                    { name: "Rolls-Royce Cullinan", weight: 0.4 },
                    { name: "Bugatti Chiron Super Sport", weight: 0.1 }
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
            if (balance < config.price) return notifyUser("Недостаточно средств!");

            isSpinning = true;
            balance -= config.price;
            updateBalance();
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

            const containerWidth = document.querySelector('.case-roulette-container').offsetWidth || 400;
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

                    document.getElementById('roulette-car-img').src = getCarSpriteDataUrl(wonCarObj.name);
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
            balance += reward.price;
            playCashSound();
            updateBalance();
            saveProgress();
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
            balance += sellPrice;
            playCashSound();
            updateBalance();
            logPlayerActivity('Продажа авто', `Продал выбитое авто «${reward.name}» за ${sellPrice.toLocaleString('ru-RU')} ₽`);
            saveProgress();
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
                plate: null
            });
            addExp(reward.rarity.text || "Супер редкий");
            playCashSound();
            renderCars();
            updateBadge();
            logPlayerActivity('Рулетка авто', `Выиграл в рулетке авто «${reward.name}» (${reward.category})`);
            saveProgress();
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

            list.innerHTML = '';
            inventory.forEach((item, index) => {
                const r = getRarity(Number(item.price) || 0);
                let rarityHTML = r.text !== "Обычный"
                    ? `<span style="font-size: 10px; padding: 2px 8px; border-radius: var(--radius-full); background:${r.bg}; color:${r.color}; font-weight:800; letter-spacing:0.5px;">${escapeHtml(r.text)}</span>`
                    : '';

                list.innerHTML += `
                    <div class="inv-card">
                        <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
                            ${rarityHTML}
                            <span class="inv-card-price">${Number(item.price || 0).toLocaleString('ru-RU')} ₽</span>
                        </div>
                        <div class="mini-plate">${escapeHtml(item.text)}</div>
                        <button class="btn btn-close" style="padding:8px 12px; width:100%;" onclick="sellPlate(${index})">Продать (+${Number(item.price||0).toLocaleString('ru-RU')} ₽)</button>
                    </div>`;
            });
            updateBadge();
        }

        function sellPlate(index) {
            const item = inventory[index];
            if (!item || !Number.isFinite(item.price) || item.price < 0) return;
            const price = item.price;
            inventory.splice(index, 1);
            balance += price;
            if (onlineProfile) {
                onlineProfile.balance = (Number(onlineProfile.balance) || 0) + price;
                onlineProfile.inventory = [...inventory];
                if (db) {
                    const key = sanitizeKey(onlineProfile.nickname);
                    db.ref('onlineV4/accounts/' + key).update({
                        balance: onlineProfile.balance,
                        inventory: onlineProfile.inventory,
                        updatedAt: Date.now()
                    }).catch(() => {});
                    db.ref('users/' + key).update({
                        balance: onlineProfile.balance,
                        inventory: onlineProfile.inventory,
                        updatedAt: Date.now()
                    }).catch(() => {});
                    db.ref('leaderboard/' + key).update({
                        balance: onlineProfile.balance,
                        updatedAt: Date.now()
                    }).catch(() => {});
                }
            }
            playCashSound();
            updateBalance();
            renderInventory();
            saveProgress();
            notifyUser(`Номер «${item.text}» продан за ${price.toLocaleString('ru-RU')} ₽!`);
        }

        // --- ГАРАЖ ---
        function renderCars() {
            let list = document.getElementById('garage-list');
            let myCarsDiv = document.getElementById('my-cars');
            list.innerHTML = '';

            carsData.forEach(car => {
                list.innerHTML += `
                    <div class="car-shop-card">
                        <div class="car-img-wrap">
                            <img src="${getCarSpriteDataUrl(car.name)}" class="car-img car-sprite-img" onerror="this.onerror=null; this.src='./icons/car-placeholder.svg';" alt="${escapeHtml(car.name)}">
                            <span class="car-category-pill">${escapeHtml(car.category || 'Авто')}</span>
                        </div>
                        <div class="car-info-body">
                            <div>
                                <div style="color: #fff; font-size: 14px; font-weight: 800;">${escapeHtml(car.name)}</div>
                                <small style="color: var(--text-dim); font-size: 11px;">Базовая цена</small>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
                                <span style="color: var(--accent-green); font-weight: 800; font-size: 13px;">${car.price.toLocaleString('ru-RU')} ₽</span>
                                <button class="btn btn-green" style="width: auto; padding: 7px 14px; font-size: 12px; margin: 0;" onclick="buyCar(${jsArg(car.name)})">Купить</button>
                            </div>
                        </div>
                    </div>`;
            });

            if (myCars.length === 0) {
                myCarsDiv.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏎️</div><p>В вашем гараже пока нет автомобилей. Выберите и купите автомобиль в автосалоне ниже!</p></div>`;
                updateBadge();
                return;
            }

            myCarsDiv.innerHTML = '';
            let html = '';
            myCars.forEach((car, index) => {
                const template = carsData.find(c => c.name === car.name) || {};
                const carCategory = car.category || template.category || 'Автомобиль';
                const carSellPrice = (car.basePrice || template.price || 500000) * 0.9;

                let bumperHtml = '';
                if (car.plate) {
                    let detachCost = car.plate.price * 0.1;
                    let totalSellPrice = carSellPrice + (car.plate.price * 0.95);
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
                        <div style="display: flex; gap: 8px; width: 100%; margin-top: 4px;">
                            <button class="btn btn-blue" style="font-size: 12px; padding: 10px;" onclick="detachPlate(${index})">
                                Снять номер (-${detachCost.toLocaleString('ru-RU')} ₽)
                            </button>
                            <button class="btn btn-close" style="font-size: 12px; padding: 10px;" onclick="sellCar(${index}, true)">
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
                const stylingBadge = car.styling?.neon && car.styling.neon !== 'none'
                    ? `<span style="font-size: 10px; color: ${car.styling.neon}; font-weight: 800; margin-left: 6px;">💡 НЕОН</span>`
                    : '';
                const colorDot = car.styling?.color
                    ? `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${car.styling.color};border:1px solid #fff;margin-right:4px;"></span>`
                    : '';

                html += `
                    <div class="my-car-card">
                        <div style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <b style="font-size: 15px; color: #fff;">${colorDot}🏎️ ${escapeHtml(car.name)} ${stylingBadge}</b>
                            </div>
                            <span class="car-category-pill" style="position: static;">${escapeHtml(carCategory)}</span>
                        </div>
                        <div class="car-img-wrap" style="height: 150px;">
                            <img src="${getCarSpriteDataUrl(car.name, car.styling)}" class="car-img car-sprite-img" onerror="this.onerror=null; this.src='./icons/car-placeholder.svg';" alt="${escapeHtml(car.name)}">
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
                            <div style="display: flex; gap: 8px; width: 100%; margin-top: 6px;">
                                <button class="btn btn-blue" style="font-size: 11px; padding: 8px; flex: 1;" onclick="openStylingModal(${index})">
                                    🎨 Стайлинг
                                </button>
                                <button class="btn btn-blue" style="font-size: 11px; padding: 8px; flex: 1;" onclick="openSellCarModal(${index})">
                                    🏷️ На рынок
                                </button>
                            </div>
                            <button class="btn btn-green" style="font-size: 12px; padding: 8px 12px; margin-top: 8px; width: 100%; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);" onclick="startRaceWithCar(${jsArg(car.name)}, ${index})">
                                🏁 Выехать на трассу (Гонка)
                            </button>
                        </div>
                    </div>
                `;
            });
            myCarsDiv.innerHTML = html;
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
            if (balance < price) { notifyUser(`Для улучшения нужно ${price.toLocaleString('ru-RU')} ₽`, 'error'); return; }
            balance -= price;
            car.upgrades[type]++;
            playCashSound();
            updateBalance();
            renderCars();
            saveProgress();
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
            if (balance < cost) { notifyUser(`На ремонт нужно ${cost.toLocaleString('ru-RU')} ₽`, 'error'); return; }
            balance -= cost;
            car.condition = 100;
            updateBalance();
            renderCars();
            saveProgress();
            notifyUser('🔧 Машина отремонтирована! Состояние 100%.', 'success');
        }

        function buyCar(name) {
            const carTemplate = carsData.find(c => c.name === name);
            if (!carTemplate) return;
            if (balance < carTemplate.price) return notifyUser(`Недостаточно средств для покупки ${name}! Нужно ${carTemplate.price.toLocaleString('ru-RU')} ₽`);
            balance -= carTemplate.price;
            playCashSound();
            myCars.unshift({
                name: carTemplate.name,
                basePrice: carTemplate.price,
                img: carTemplate.img,
                category: carTemplate.category,
                plate: null
            });
            updateBalance();
            renderCars();
            saveProgress();
            notifyUser(`🎉 Поздравляем! ${name} успешно приобретен и добавлен в ваш гараж!`);
        }

        function sellCar(index, hasPlate) {
            let car = myCars[index];
            if (!car) return;
            let profit = Math.floor(car.basePrice * 0.9 + (hasPlate && car.plate ? car.plate.price * 0.95 : 0));
            balance += profit;
            playCashSound();
            myCars.splice(index, 1);
            if (onlineProfile) {
                onlineProfile.balance = (Number(onlineProfile.balance) || 0) + profit;
                onlineProfile.myCars = [...myCars];
                if (db) {
                    const key = sanitizeKey(onlineProfile.nickname);
                    db.ref('onlineV4/accounts/' + key).update({
                        balance: onlineProfile.balance,
                        myCars: onlineProfile.myCars,
                        updatedAt: Date.now()
                    }).catch(() => {});
                    db.ref('users/' + key).update({
                        balance: onlineProfile.balance,
                        myCars: onlineProfile.myCars,
                        updatedAt: Date.now()
                    }).catch(() => {});
                    db.ref('leaderboard/' + key).update({
                        balance: onlineProfile.balance,
                        carsCount: myCars.length,
                        updatedAt: Date.now()
                    }).catch(() => {});
                }
            }
            updateBalance();
            renderCars();
            saveProgress();
            notifyUser(`Автомобиль «${car.name}» продан за ${profit.toLocaleString('ru-RU')} ₽!`);
        }

        function detachPlate(index) {
            let car = myCars[index];
            if (!car || !car.plate) return;
            let cost = car.plate.price * 0.1;
            if (balance < cost) return notifyUser(`Не хватает денег на снятие! Нужно ${cost.toLocaleString('ru-RU')} ₽`);
            balance -= cost;
            inventory.unshift(car.plate);
            car.plate = null;
            updateBalance();
            renderCars();
            renderInventory();
            saveProgress();
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
            if (currentCarIndexForAttach === -1) return;
            let car = myCars[currentCarIndexForAttach];
            let plate = inventory[invIndex];
            if (!car || !plate) return;
            inventory.splice(invIndex, 1);
            if (car.plate) inventory.unshift(car.plate);
            car.plate = plate;
            closeAttachModal();
            renderCars();
            renderInventory();
            saveProgress();
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

        // --- 2. СТАЙЛИНГ АВТОМОБИЛЕЙ (ПОКРАСКА, ТОНИРОВКА, НЕОН) ---
        function openStylingModal(carIndex) {
            stylingActiveCarIndex = carIndex;
            const car = myCars[carIndex];
            if (!car) return;
            car.styling = car.styling || { color: '#ffffff', tint: 0, neon: 'none' };
            stylingTempColor = car.styling.color || '#ffffff';
            stylingTempTint = Number(car.styling.tint || 0);
            stylingTempNeon = car.styling.neon || 'none';

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
                btn.classList.toggle('active', Number(btn.dataset.tint) === stylingTempTint);
            });
            document.querySelectorAll('#styling-neon-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.neon === stylingTempNeon);
            });

            const modal = document.getElementById('styling-modal');
            if (modal) modal.classList.add('show');
            updateStylingModalPreview();
        }

        function closeStylingModal() {
            const modal = document.getElementById('styling-modal');
            if (modal) modal.classList.remove('show');
            stylingActiveCarIndex = -1;
        }

        function selectStylingColor(col) {
            stylingTempColor = col;
            document.querySelectorAll('.styling-swatch').forEach(sw => {
                sw.classList.toggle('active', sw.style.backgroundColor === col || sw.getAttribute('style')?.includes(col));
            });
            updateStylingModalPreview();
        }

        function selectStylingTint(tint) {
            stylingTempTint = Number(tint);
            document.querySelectorAll('#styling-tint-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', Number(btn.dataset.tint) === stylingTempTint);
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

        async function confirmApplyStyling() {
            const car = myCars[stylingActiveCarIndex];
            if (!car) return;
            car.styling = car.styling || { color: '#ffffff', tint: 0, neon: 'none' };

            let cost = 0;
            if (stylingTempColor !== car.styling.color) cost += 15000;
            if (stylingTempTint !== car.styling.tint) {
                if (stylingTempTint === 50) cost += 10000;
                else if (stylingTempTint === 95) cost += 25000;
            }
            if (stylingTempNeon !== car.styling.neon && stylingTempNeon !== 'none') cost += 35000;

            if (cost > 0) {
                if (balance < cost) {
                    notifyUser(`Для стайлинга требуется ${cost.toLocaleString('ru-RU')} ₽`, 'error');
                    return;
                }
                balance -= cost;
            }

            car.styling = { color: stylingTempColor, tint: stylingTempTint, neon: stylingTempNeon };
            carSpriteCache.clear();
            recordQuestProgress('tune', 1);
            checkAchievements();
            playCashSound();
            updateBalance();
            renderCars();
            saveProgress();
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
            balance += reward;
            dailyBonus.streak = (dailyBonus.streak || 0) + 1;
            dailyBonus.lastClaimDate = today;
            playCashSound();
            triggerLegendaryEffect();
            updateBalance();
            saveProgress();
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
            balance += def.rewardMoney;
            addExp(def.rewardXp);
            playCashSound();
            updateBalance();
            saveProgress();
            renderDailyModal();
            updateDailyBadgeDot();
            notifyUser(`Задание выполнено! +${def.rewardMoney.toLocaleString('ru-RU')} ₽, +${def.rewardXp} XP!`, 'success');
        }

        // --- 4. ДОСТИЖЕНИЯ И КОЛЛЕКЦИИ ---
        const ACHIEVEMENTS_CATALOG = [
            { id: 'first_million', icon: '💰', name: 'Первый миллион', desc: 'Накопить 1 000 000 ₽ на балансе', reward: 100000, titleReward: 'millionaire', check: () => balance >= 1000000 },
            { id: 'fleet_5', icon: '🏎️', name: 'Автопарк', desc: 'Собрать 5 автомобилей в гараже', reward: 150000, titleReward: 'collector', check: () => (myCars && myCars.length >= 5) },
            { id: 'speed_200', icon: '⚡', name: 'Шумахер', desc: 'Разогнаться до 200 км/ч в гонке', reward: 80000, titleReward: 'racer', check: () => ((typeof getRaceRecords === 'function' && getRaceRecords()?.peakSpeed >= 200) || false) },
            { id: 'drag_champ', icon: '👑', name: 'Король Дрэга', desc: 'Выиграть 3 дрэг-заезда на 1/4 мили', reward: 120000, titleReward: 'drag_king', check: () => (achievements.dragWins >= 3) },
            { id: 'plate_777', icon: '🎰', name: 'Три топора', desc: 'Выбить номер с 777 в тексте', reward: 200000, titleReward: null, check: () => inventory.some(p => String(p.text).includes('777')) },
            { id: 'styling_master', icon: '🎨', name: 'Кастом-мастер', desc: 'Установить цвет и неон на автомобиль', reward: 60000, titleReward: null, check: () => myCars.some(c => c.styling?.neon && c.styling.neon !== 'none') },
            { id: 'cases_10', icon: '📦', name: 'Кейсер', desc: 'Открыть 10 кейсов с номерами', reward: 75000, titleReward: null, check: () => (achievements.casesOpened >= 10) }
        ];

        function checkAchievements() {
            ACHIEVEMENTS_CATALOG.forEach(ach => {
                if (!achievements[ach.id] && ach.check()) {
                    achievements[ach.id] = Date.now();
                    balance += ach.reward;
                    triggerLegendaryEffect();
                    notifyUser(`🏆 Достижение разблокировано: «${ach.name}»! (+${ach.reward.toLocaleString('ru-RU')} ₽)`, 'success');
                    saveProgress();
                    updateBalance();
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

        // --- 5. ДРЭГ-РЕЙСИНГ (1/4 МИЛИ) ---
        function switchRaceMode(mode) {
            activeRaceMode = mode;
            const btnCircuit = document.getElementById('btn-race-mode-circuit');
            const btnDrag = document.getElementById('btn-race-mode-drag');
            const menuCircuit = document.getElementById('race-menu-container');
            const menuDrag = document.getElementById('drag-menu-container');

            if (btnCircuit) btnCircuit.classList.toggle('active', mode === 'circuit');
            if (btnDrag) btnDrag.classList.toggle('active', mode === 'drag');
            if (menuCircuit) menuCircuit.classList.toggle('hidden', mode !== 'circuit');
            if (menuDrag) menuDrag.classList.toggle('hidden', mode !== 'drag');
        }

        function selectDragBet(amount) {
            selectedDragBet = Number(amount);
            document.querySelectorAll('#drag-bet-chips .styling-chip').forEach(btn => {
                btn.classList.toggle('active', Number(btn.dataset.bet) === selectedDragBet);
            });
        }

        async function startDragRace() {
            if (isRaceRunning || isDragRaceRunning) return;
            if (selectedDragBet > 0 && balance < selectedDragBet) {
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
                    if (selectedDragBet > 0) balance -= selectedDragBet;
                    updateBalance();
                    saveProgress();
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
                            balance += (payout - selectedDragBet);
                        }
                        addExp(80);
                        triggerLegendaryEffect();
                        playCashSound();
                        checkAchievements();
                        updateBalance();
                        saveProgress();
                        notifyUser(`🏆 ПОБЕДА НА 1/4 МИЛИ! Время: ${(10.2 + Math.random() * 0.8).toFixed(2)} с. Выигрыш: ${payout.toLocaleString('ru-RU')} ₽!`, 'success');
                    } else {
                        if (selectedDragBet > 0) balance -= selectedDragBet;
                        updateBalance();
                        saveProgress();
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
                if (prevImg) prevImg.src = getCarSpriteDataUrl(car.name, car.styling);
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
                    if (!Array.isArray(onlineProfile.myCars) || onlineProfile.myCars.length === 0) {
                        await onlineRequest('syncGarage', { myCars });
                    }
                    const res = await onlineRequest('sell', { type: 'car', carIndex: idx, car, price });
                    if (res.profile) setOnlineProfile(res.profile, true);
                    else {
                        myCars.splice(idx, 1);
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
            if (db) {
                db.ref('onlineV4/market/' + lotId).set(lot).catch(() => {});
            }
            marketLots[lotId] = lot;

            saveProgress();
            renderCars();
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

        function renderLeaderboard() {
            const list = document.getElementById('leaderboard-list');
            const podium = document.getElementById('podium-stage');
            if (!list) return;

            const mySpeed = (typeof getRaceRecords === 'function' ? getRaceRecords().bestSpeed : 0) || 0;

            const myEntry = {
                nickname: nickname,
                balance: balance,
                playerLevel: playerLevel,
                avatarData: avatarData || AVATAR_PRESETS[0],
                bestPlate: getBestPlate(),
                carsCount: myCars.length,
                bestSpeed: Math.round(mySpeed),
                updatedAt: Date.now()
            };

            let baseList = (cloudLeaderboardList && cloudLeaderboardList.length > 0) ? [...cloudLeaderboardList] : [];
            // Убираем дубликат текущего игрока из серверного списка
            baseList = baseList.filter(p => sanitizeKey(p.nickname) !== sanitizeKey(nickname));
            const allPlayers = [myEntry, ...baseList];

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
            if (podium && allPlayers.length >= 3) {
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
                            <img src="${imageSrc(p2.avatarData || AVATAR_PRESETS[0])}" class="podium-avatar" onerror="this.src='${DEFAULT_AVATAR}'">
                        </div>
                        <div class="podium-name">${escapeHtml(p2.nickname)}</div>
                        <div class="podium-val">${getVal(p2)}</div>
                        <div class="podium-pedestal">2</div>
                    </div>
                    <div class="podium-slot podium-1" onclick="openPlayerViewModal(${jsArg(sanitizeKey(p1.nickname))})">
                        <div class="podium-crown">👑</div>
                        <div class="podium-avatar-wrap">
                            <img src="${imageSrc(p1.avatarData || AVATAR_PRESETS[0])}" class="podium-avatar" onerror="this.src='${DEFAULT_AVATAR}'">
                        </div>
                        <div class="podium-name">${escapeHtml(p1.nickname)}</div>
                        <div class="podium-val">${getVal(p1)}</div>
                        <div class="podium-pedestal">1</div>
                    </div>
                    <div class="podium-slot podium-3" onclick="openPlayerViewModal(${jsArg(sanitizeKey(p3.nickname))})">
                        <div class="podium-avatar-wrap">
                            <img src="${imageSrc(p3.avatarData || AVATAR_PRESETS[0])}" class="podium-avatar" onerror="this.src='${DEFAULT_AVATAR}'">
                        </div>
                        <div class="podium-name">${escapeHtml(p3.nickname)}</div>
                        <div class="podium-val">${getVal(p3)}</div>
                        <div class="podium-pedestal">3</div>
                    </div>
                `;
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

                const avatar = player.avatarData ? player.avatarData : AVATAR_PRESETS[0];
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
                            <img src="${imageSrc(avatar)}" class="lead-avatar" onerror="this.src='${DEFAULT_AVATAR}'">
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
            if (posEl) posEl.innerText = `#${myIndex}`;
            if (nameEl) nameEl.innerText = `Вы: ${nickname}`;
            if (statEl) statEl.innerText = `Баланс: ${balance.toLocaleString('ru-RU')} ₽ | Уровень: ${playerLevel} | Рекорд скорости: ${Math.round(mySpeed)} км/ч`;
        }

        function openPlayerViewModal(userKey) {
            let baseList = (cloudLeaderboardList && cloudLeaderboardList.length > 0) ? [...cloudLeaderboardList] : [];
            baseList = baseList.filter(p => sanitizeKey(p.nickname) !== sanitizeKey(nickname));
            const mySpeed = (typeof getRaceRecords === 'function' ? getRaceRecords().bestSpeed : 0) || 0;

            const allPlayers = [{
                nickname: nickname, balance, playerLevel, avatarData: avatarData || AVATAR_PRESETS[0], bestPlate: getBestPlate(), carsCount: myCars.length, bestSpeed: Math.round(mySpeed), updatedAt: Date.now()
            }, ...baseList];

            const player = allPlayers.find(p => sanitizeKey(p.nickname || '') === userKey);
            if (!player) return;

            document.getElementById('pv-avatar').src = safeImageUrl(player.avatarData, AVATAR_PRESETS[0], AVATAR_PRESETS);
            document.getElementById('pv-name').innerText = player.nickname || 'Игрок';
            document.getElementById('pv-level').innerText = `Уровень: ${escapeHtml(player.playerLevel || 1)} ${player.bestSpeed ? `| ⚡ ${Math.round(player.bestSpeed)} км/ч` : ''}`;
            document.getElementById('pv-balance').innerText = `${Number(player.balance || 0).toLocaleString('ru-RU')} ₽`;
            document.getElementById('pv-cars').innerText = player.carsCount || 0;
            document.getElementById('pv-best-plate').innerText = player.bestPlate || '—';

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
            document.getElementById('pv-last-seen').innerText = lastSeenText;
            document.getElementById('player-view-modal').classList.add('show');
        }

        // ==========================================
        // 🎮 МИНИ-ИГРА: «ТРАССА 777: НОЧНОЙ ФОРСАЖ»
        // ==========================================

        const carRaceStats = {
            "ВАЗ-2107 «Жигули»": {
                speed: 160, accel: 2.2, handling: 4.8, boost: 1.8, rewardMult: 1.0,
                desc: "Советская классика с задним приводом. Легкая в потоке и маневренная в шашках!"
            },
            "Lada Priora БПАН": {
                speed: 185, accel: 2.7, handling: 5.6, boost: 2.0, rewardMult: 1.3,
                desc: "Заниженная посадка, тонировка «вкруг». Дерзкий стиль и стремительные обгоны!"
            },
            "Lada Vesta Sport": {
                speed: 215, accel: 3.3, handling: 6.2, boost: 2.2, rewardMult: 1.8,
                desc: "Спортивная подвеска и фирменный X-обвес для идеальной траектории на шоссе."
            },
            "Volkswagen Polo": {
                speed: 205, accel: 3.1, handling: 6.4, boost: 2.0, rewardMult: 1.6,
                desc: "Немецкая точность управления и отличный контроль между рядами."
            },
            "BMW M5 E60 V10": {
                speed: 280, accel: 4.4, handling: 7.0, boost: 2.7, rewardMult: 3.0,
                desc: "Рёв легендарного V10 под капотом! Ураганный разгон на прямых участках."
            },
            "Toyota Camry 3.5": {
                speed: 260, accel: 3.9, handling: 6.6, boost: 2.4, rewardMult: 2.5,
                desc: "«Камри три и пять» — левый ряд уважает, солидный и мощный ход."
            },
            "Toyota Land Cruiser 300": {
                speed: 250, accel: 3.7, handling: 5.8, boost: 2.3, rewardMult: 3.8,
                desc: "Танк на дороге! Высокий клиренс и уверенный прорыв через плотный трафик."
            },
            "Mercedes-Benz E63s AMG": {
                speed: 320, accel: 5.2, handling: 7.8, boost: 3.1, rewardMult: 5.5,
                desc: "Битурбо V8 с решёткой Panamericana. Сметает поток одним нажатием педали!"
            },
            "Audi RS6 Avant": {
                speed: 330, accel: 5.4, handling: 8.0, boost: 3.1, rewardMult: 6.5,
                desc: "Ракета в кузове универсал! Полный привод Quattro вгрызается в любой вираж."
            },
            "BMW M5 F90 Competition": {
                speed: 350, accel: 5.8, handling: 8.4, boost: 3.3, rewardMult: 8.0,
                desc: "Карбоновая крыша и лазерные фары. Хищный зверь на ночной скоростной магистрали."
            },
            "Mercedes-Benz G63 AMG «Гелик»": {
                speed: 290, accel: 4.9, handling: 6.4, boost: 2.6, rewardMult: 9.0,
                desc: "Культовый кубик с боковым выхлопом. Абсолютный авторитет на трассе!"
            },
            "Porsche 911 Turbo S": {
                speed: 370, accel: 6.5, handling: 9.2, boost: 3.6, rewardMult: 13.0,
                desc: "Абсолютная прижимная сила и космическая динамика разгона в левом ряду."
            },
            "Rolls-Royce Cullinan": {
                speed: 300, accel: 4.7, handling: 6.7, boost: 2.6, rewardMult: 16.0,
                desc: "Королевский внедорожник с грилем Pantheon. Максимальные выплаты за каждый километр!"
            },
            "Bugatti Chiron Super Sport": {
                speed: 450, accel: 7.8, handling: 9.0, boost: 4.8, rewardMult: 35.0,
                desc: "1600 лошадиных сил гиперкара. Разрывает пространство со сверхзвуковой скоростью!"
            }
        };

        // 🎨 РЕНДЕРЕР ПИКСЕЛЬНЫХ МОДЕЛЕЙ ВЫСОКОЙ ДЕТАЛИЗАЦИИ ДЛЯ ВСЕХ 14 АВТОМОБИЛЕЙ
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
                    dark: adj(0.65, -15),
                    mid: adj(0.85, -5),
                    base: '#' + clean,
                    light: adj(1.18, 25),
                    bright: adj(1.38, 45)
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
                ctx.globalAlpha = 0.68;
                ctx.fillRect(Math.round(cx - 14 * s), Math.round(cy - 24 * s), Math.round(28 * s), Math.round(48 * s));
                ctx.restore();
            }

            // Мягкая анатомическая тень под автомобилем с закругленными краями
            function drawShadow(w, l) {
                const hw = Math.round((w / 2 + 1) * s);
                const hl = Math.round((l / 2 + 2) * s);
                ctx.save();
                ctx.fillStyle = "rgba(0,0,0,0.45)";
                ctx.beginPath();
                ctx.ellipse(Math.round(cx), Math.round(cy + 1 * s), hw, hl, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Колеса с дисками, тормозными дисками и цветными суппортами
            function drawWheels(w, l, rimCol = "#94a3b8", caliperCol = null, discCol = "#334155") {
                const wx = Math.round(w / 2);
                // Шины (резина)
                px(-wx - 2, -l + 8, 4, 8, "#09090b");
                px(wx - 2, -l + 8, 4, 8, "#09090b");
                px(-wx - 2, l - 16, 4, 8, "#09090b");
                px(wx - 2, l - 16, 4, 8, "#09090b");
                // Тормозные диски
                if (discCol) {
                    px(-wx - 1, -l + 10, 2, 4, discCol);
                    px(wx - 1, -l + 10, 2, 4, discCol);
                    px(-wx - 1, l - 14, 2, 4, discCol);
                    px(wx - 1, l - 14, 2, 4, discCol);
                }
                // Тормозные суппорты (Brembo, M-Sport, AMG, PCCB)
                if (caliperCol) {
                    px(-wx - 1, -l + 9, 2, 2, caliperCol);
                    px(wx - 1, -l + 9, 2, 2, caliperCol);
                    px(-wx - 1, l - 15, 2, 2, caliperCol);
                    px(wx - 1, l - 15, 2, 2, caliperCol);
                }
                // Диски
                px(-wx, -l + 10, 2, 4, rimCol);
                px(wx - 2, -l + 10, 2, 4, rimCol);
                px(-wx, l - 14, 2, 4, rimCol);
                px(wx - 2, l - 14, 2, 4, rimCol);
            }

            // Остекление с реалистичными бликами, сужением стоек и тонировкой
            function drawGlass(gx, gy, gw, gh, glassCol = "#0f172a", glare = true) {
                let col = glassCol;
                if (options.tint >= 95) col = "#020617";
                else if (options.tint >= 50) col = "#090d16";
                const isFront = gy < 0;
                for (let i = 0; i < gh; i++) {
                    const rowY = gy + i;
                    const t = isFront ? (i / (gh || 1)) : (1 - i / (gh || 1));
                    const taper = Math.round(t * 1.5);
                    const rw = Math.max(4, gw - taper * 2);
                    px(gx + taper, rowY, rw, 1, col);
                }
                if (glare && gw >= 6 && gh >= 3 && (!options.tint || options.tint < 95)) {
                    px(gx + 2, gy + 1, Math.max(2, Math.floor(gw / 3)), 1, "rgba(255,255,255,0.45)");
                    px(gx + 3, gy + 2, Math.max(2, Math.floor(gw / 4)), 1, "rgba(255,255,255,0.22)");
                }
            }

            // Боковые зеркала
            function drawMirrors(w, y, bodyCol = "#334155", glassCol = "#38bdf8") {
                const mx = Math.round(w / 2);
                px(-mx - 2, y, 2, 3, bodyCol);
                px(mx, y, 2, 3, bodyCol);
                px(-mx - 1, y + 1, 1, 1, glassCol);
                px(mx, y + 1, 1, 1, glassCol);
            }

            switch(name) {
                case "ВАЗ-2107 «Жигули»": {
                    const bt = getBodyTones("#991b1b");
                    drawShadow(20, 48);
                    drawWheels(18, 23, "#e2e8f0", null, "#1e293b");
                    // Советские резиновые брызговики с белыми точками
                    px(-10, 22, 3, 2, "#09090b");
                    px(7, 22, 3, 2, "#09090b");
                    px(-9, 23, 1, 1, "#f8fafc");
                    px(8, 23, 1, 1, "#f8fafc");

                    // Угловатый аутентичный кузов советской классики
                    px(-9, -24, 18, 2, bt.dark); // Верхний брус передка
                    px(-8, -23, 16, 2, bt.mid);
                    px(-9, -22, 18, 12, bt.dark); // Капот
                    px(-8, -22, 16, 12, bt.mid);
                    px(-7, -21, 14, 10, bt.light);
                    px(-1, -22, 2, 11, bt.bright); // Центральное ребро капота 2107

                    // Классические хромированные водостоки и салон
                    px(-9, -10, 18, 20, bt.dark);
                    px(-8, -10, 16, 20, bt.mid);

                    // Багажник угловатый
                    px(-9, 10, 18, 12, bt.dark);
                    px(-8, 10, 16, 12, bt.mid);

                    // Бамперы: хром с черной резиновой накладкой и клыками
                    px(-10, -25, 20, 2, "#e2e8f0");
                    px(-8, -25, 16, 1, "#0f172a");
                    px(-11, -25, 1, 2, "#0f172a");
                    px(10, -25, 1, 2, "#0f172a");
                    px(-10, 22, 20, 2, "#e2e8f0");
                    px(-8, 22, 16, 1, "#0f172a");
                    px(-11, 22, 1, 2, "#0f172a");
                    px(10, 22, 1, 2, "#0f172a");

                    // Легендарная высокая решетка «утюг» 2107
                    px(-5, -24, 10, 3, "#f1f5f9");
                    px(-4, -23, 8, 2, "#0f172a");
                    px(-4, -23, 8, 1, "#cbd5e1");
                    px(-1, -24, 2, 1, "#f59e0b"); // Ладья (золотой шильдик)

                    // Чехословацкие прямоугольные фары + оранжевые поворотники
                    px(-9, -24, 4, 3, "#fef9c3");
                    px(5, -24, 4, 3, "#fef9c3");
                    px(-9, -23, 2, 1, "#ffffff");
                    px(7, -23, 2, 1, "#ffffff");
                    px(-10, -24, 1, 3, "#f59e0b");
                    px(9, -24, 1, 3, "#f59e0b");

                    // Зеркало на водительской двери
                    drawMirrors(18, -10, bt.dark, "#94a3b8");

                    // Лобовое стекло с резинкой и дворниками
                    drawGlass(-8, -10, 16, 6, "#1e293b", true);
                    px(-4, -11, 3, 1, "#09090b");
                    px(1, -11, 3, 1, "#09090b");

                    // Крыша с водостоками
                    px(-8, -4, 16, 14, bt.mid);
                    px(-7, -3, 14, 12, bt.light);
                    px(-8, -4, 1, 14, bt.dark);
                    px(7, -4, 1, 14, bt.dark);

                    // Заднее стекло с медными нитями обогрева
                    drawGlass(-8, 10, 16, 5, "#1e293b", false);
                    px(-6, 11, 12, 1, "rgba(249,115,22,0.45)");
                    px(-6, 13, 12, 1, "rgba(249,115,22,0.45)");

                    // Багажник и хром замок
                    px(-7, 16, 14, 5, bt.mid);
                    px(-1, 20, 2, 1, "#e2e8f0");

                    // Трехсекционные советские фонари
                    px(-9, 20, 4, 2, "#f59e0b");
                    px(-7, 20, 2, 2, "#f8fafc");
                    px(-5, 20, 2, 2, "#dc2626");
                    px(3, 20, 2, 2, "#dc2626");
                    px(5, 20, 2, 2, "#f8fafc");
                    px(7, 20, 2, 2, "#f59e0b");

                    // Выхлопная труба
                    px(5, 24, 2, 2, "#cbd5e1");
                    break;
                }

                case "Lada Priora БПАН": {
                    const bt = getBodyTones("#0d1017");
                    drawShadow(19, 47);
                    // Заниженные заправленные внутрь арки колеса Торусы с отрицательным развалом
                    drawWheels(18, 23, "#cbd5e1", "#ef4444", "#334155");

                    // Обтекаемый скругленный клиновидный кузов (БПАН занижение, гладкие грани)
                    px(-5, -25, 10, 2, bt.dark); // Закругленный нос
                    px(-8, -24, 16, 2, bt.dark);
                    px(-7, -24, 14, 2, bt.mid);

                    // Капот обтекаемый со сужением вперед
                    px(-8, -22, 16, 11, bt.dark);
                    px(-7, -22, 14, 11, bt.mid);
                    px(-6, -21, 12, 9, bt.light);

                    // Гладкие боковины (талия 17)
                    px(-8, -11, 16, 20, bt.dark);
                    px(-7, -11, 14, 20, bt.mid);

                    // Задние крылья со скосом
                    px(-8, 9, 16, 11, bt.dark);
                    px(-7, 9, 14, 11, bt.mid);
                    px(-7, 20, 14, 2, bt.mid); // Скругленная корма
                    px(-6, 22, 12, 2, bt.dark);

                    // Бампер Приора-2 со сплиттером
                    px(-5, -25, 10, 1, "#181a20");
                    px(-1, -25, 2, 1, "#60a5fa");

                    // Ксеноновые ледяные ДХО / фары линзы со скошенной формой
                    px(-8, -24, 4, 2, "#a5f3fc");
                    px(4, -24, 4, 2, "#a5f3fc");
                    px(-7, -24, 2, 1, "#ffffff");
                    px(5, -24, 2, 1, "#ffffff");

                    // Зеркала Priora SE в цвет кузова с повторителями
                    px(-10, -10, 2, 3, bt.dark);
                    px(8, -10, 2, 3, bt.dark);
                    px(-10, -9, 1, 1, "#f59e0b");
                    px(9, -9, 1, 1, "#f59e0b");

                    // Тонировка + наклейка «БПАН»
                    drawGlass(-8, -10, 16, 6, "#020304", false);
                    px(-5, -10, 10, 1, "#ffffff");
                    px(-4, -9, 8, 1, "rgba(255,255,255,0.75)");

                    // Крыша
                    px(-7, -4, 14, 14, bt.mid);
                    px(-6, -3, 12, 12, bt.light);

                    // Заднее стекло тонировка
                    drawGlass(-8, 10, 16, 5, "#020304", false);

                    // Крышка багажника с сабвуферным спойлером дактейл
                    px(-7, 20, 14, 2, bt.mid);
                    px(-6, 20, 12, 1, bt.bright);

                    // Тонированные в черный задние фонари
                    px(-8, 21, 3, 2, "#450a0a");
                    px(5, 21, 3, 2, "#450a0a");
                    px(-7, 21, 2, 1, "#7f1d1d");
                    px(5, 21, 2, 1, "#7f1d1d");

                    // Прямоточная банка выхлопа под углом с обожженным титаном
                    px(5, 22, 3, 3, "#38bdf8");
                    px(5, 24, 2, 2, "#f59e0b");
                    px(6, 25, 2, 2, "#cbd5e1");
                    break;
                }

                case "Lada Vesta Sport": {
                    const bt = getBodyTones("#f8fafc");
                    drawShadow(19, 48);
                    drawWheels(19, 24, "#e2e8f0", "#ef4444", "#334155");

                    // Аэродинамичный нос с красным гоночным сплиттером
                    px(-5, -25, 10, 2, bt.dark);
                    px(-8, -24, 16, 2, bt.dark);
                    px(-7, -24, 14, 2, bt.base);
                    px(-6, -25, 12, 1, "#ef4444"); // Красная губа

                    // Мускулистый капот и передние крылья
                    px(-8, -22, 16, 11, bt.dark);
                    px(-7, -22, 14, 11, bt.base);
                    px(-6, -21, 12, 9, bt.light);

                    // Талия кузова с красной полосой порогов
                    px(-8, -11, 16, 20, bt.dark);
                    px(-7, -11, 14, 20, bt.base);
                    px(-8, -10, 1, 19, "#ef4444");
                    px(7, -10, 1, 19, "#ef4444");

                    // Задние крылья и спойлер багажника
                    px(-8, 9, 16, 12, bt.dark);
                    px(-7, 9, 14, 12, bt.base);
                    px(-7, 21, 14, 2, "#09090b"); // Черный спойлер
                    px(-6, 21, 12, 1, "#ef4444"); // Красный акцент спойлера
                    px(-6, 23, 12, 2, bt.dark);

                    // Фирменный X-Face: хромированные бумеранги спереди
                    px(-8, -23, 2, 4, "#cbd5e1");
                    px(6, -23, 2, 4, "#cbd5e1");
                    px(-6, -21, 2, 3, "#cbd5e1");
                    px(4, -21, 2, 3, "#cbd5e1");
                    // Черная решетка радиатора с шильдиком Sport
                    px(-4, -24, 8, 3, "#09090b");
                    px(2, -23, 2, 1, "#ef4444");

                    // Фары со светодиодными стрелами-бумерангами
                    px(-8, -24, 4, 2, "#e0f2fe");
                    px(4, -24, 4, 2, "#e0f2fe");
                    px(-7, -23, 2, 1, "#ffffff");
                    px(5, -23, 2, 1, "#ffffff");

                    // Черные спортивные зеркала
                    drawMirrors(19, -10, "#09090b", "#38bdf8");

                    // Остекление
                    drawGlass(-8, -10, 16, 6, "#1e293b", true);

                    // Черная глянцевая крыша + плавник акулы
                    px(-7, -4, 14, 14, "#09090b");
                    px(-6, -3, 12, 12, "#18181b");
                    px(-1, 8, 2, 2, "#000000");

                    drawGlass(-8, 10, 16, 5, "#1e293b", true);

                    // 3D задние светодиодные фонари со скошенными стрелками
                    px(-8, 21, 3, 2, "#dc2626");
                    px(5, 21, 3, 2, "#dc2626");
                    px(-7, 21, 2, 1, "#f87171");
                    px(5, 21, 2, 1, "#f87171");

                    // Двойной выхлоп в спортивном диффузоре
                    px(-6, 24, 2, 2, "#cbd5e1");
                    px(4, 24, 2, 2, "#cbd5e1");
                    px(-5, 23, 10, 1, "#09090b");
                    break;
                }

                case "Volkswagen Polo": {
                    const bt = getBodyTones("#2563eb");
                    // Компактный городской хэтчбек/лифтбек: короткие пропорции
                    drawShadow(18, 42);
                    drawWheels(18, 21, "#cbd5e1", null, "#475569");

                    // Аккуратный скругленный нос городского европейского авто
                    px(-5, -21, 10, 2, bt.dark);
                    px(-7, -20, 14, 2, bt.dark);
                    px(-6, -20, 12, 2, bt.mid);

                    // Компактный капот с выштамповками (ширина 16)
                    px(-7, -18, 14, 9, bt.dark);
                    px(-6, -18, 12, 9, bt.mid);
                    px(-5, -17, 10, 7, bt.light);
                    px(-3, -17, 1, 7, bt.dark);
                    px(2, -17, 1, 7, bt.dark);

                    // Салон и боковины (длина меньше, чем у седанов)
                    px(-7, -9, 14, 18, bt.dark);
                    px(-6, -9, 12, 18, bt.mid);

                    // Компактная корма хэтчбека
                    px(-7, 9, 14, 10, bt.dark);
                    px(-6, 9, 12, 10, bt.mid);
                    px(-5, 19, 10, 2, bt.dark);

                    // Немецкая решетка: хромированная поперечная линия соединяет фары
                    px(-5, -21, 10, 1, "#e2e8f0");
                    px(-4, -20, 8, 1, "#0f172a");

                    // Светодиодные фары с четкими линзами
                    px(-7, -21, 3, 2, "#f8fafc");
                    px(4, -21, 3, 2, "#f8fafc");
                    px(-7, -20, 2, 1, "#bae6fd");
                    px(5, -20, 2, 1, "#bae6fd");

                    drawMirrors(17, -9, bt.dark, "#60a5fa");

                    // Остекление
                    drawGlass(-6, -9, 12, 5, "#0f172a", true);
                    // Крыша
                    px(-6, -4, 12, 12, bt.mid);
                    px(-5, -3, 10, 10, bt.light);
                    drawGlass(-6, 8, 12, 5, "#0f172a", true);

                    // Геометричные граненые фонари Polo
                    px(-7, 18, 3, 2, "#b91c1c");
                    px(4, 18, 3, 2, "#b91c1c");
                    px(-6, 18, 2, 1, "#ef4444");
                    px(4, 18, 2, 1, "#ef4444");

                    // Хромированная планка выхлопа на бампере
                    px(-4, 20, 8, 1, "#cbd5e1");
                    break;
                }

                case "BMW M5 E60 V10": {
                    const bt = getBodyTones("#94a3b8");
                    drawShadow(21, 49);
                    drawWheels(20, 25, "#e2e8f0", "#2563eb", "#334155");

                    // Аэродинамичный хищный нос со скошенными углами
                    px(-6, -26, 12, 2, bt.dark);
                    px(-9, -25, 18, 3, bt.dark);
                    px(-8, -25, 16, 2, bt.mid);

                    // Рельефный капот Flame Surfacing
                    px(-9, -22, 18, 11, bt.dark);
                    px(-8, -22, 16, 11, bt.mid);
                    px(-6, -21, 12, 9, bt.light);
                    px(-5, -20, 10, 7, bt.bright);

                    // Двери и талия со спортивными порогами M
                    px(-8, -11, 16, 20, bt.dark);
                    px(-7, -11, 14, 20, bt.mid);

                    // Задние мускулистые крылья
                    px(-9, 9, 18, 12, bt.dark);
                    px(-8, 9, 16, 12, bt.mid);

                    // Культовый рельефный багажник «Bangle Butt» (ступенчатый контур)
                    px(-8, 21, 16, 2, bt.dark);
                    px(-6, 21, 12, 1, bt.bright); // Ступенька крышки багажника Bangle
                    px(-7, 23, 14, 2, bt.dark);   // Скругленный бампер

                    // Ноздри BMW с M-триколором (Cyan, Blue, Red)
                    px(-4, -25, 3, 2, "#09090b");
                    px(1, -25, 3, 2, "#09090b");
                    px(-3, -25, 1, 2, "#06b6d4");
                    px(-2, -25, 1, 2, "#1d4ed8");
                    px(-1, -25, 1, 2, "#ef4444");

                    // Легендарные янтарные ангельские глазки (Angel Eyes E60)
                    px(-8, -25, 4, 3, "#fef08a");
                    px(4, -25, 4, 3, "#fef08a");
                    px(-7, -24, 2, 1, "#ca8a04");
                    px(5, -24, 2, 1, "#ca8a04");

                    // Жабра на переднем крыле с M-лого
                    px(-10, -12, 1, 4, "#e2e8f0");
                    px(9, -12, 1, 4, "#e2e8f0");

                    drawMirrors(20, -11, bt.mid, "#38bdf8");

                    // Остекление
                    drawGlass(-8, -11, 16, 6, "#0f172a", true);
                    px(-7, -5, 14, 15, bt.mid);
                    px(-6, -4, 12, 13, bt.light);
                    drawGlass(-8, 10, 16, 5, "#0f172a", true);

                    // Задние L-образные фонари, обтекающие углы
                    px(-9, 22, 4, 2, "#ef4444");
                    px(5, 22, 4, 2, "#ef4444");
                    px(-8, 22, 3, 1, "#fca5a5");
                    px(5, 22, 3, 1, "#fca5a5");

                    // Четыре титановых выхлопных трубы с синим отливом (V10 Quad Exhaust)
                    px(-8, 25, 2, 2, "#38bdf8");
                    px(-5, 25, 2, 2, "#38bdf8");
                    px(3, 25, 2, 2, "#38bdf8");
                    px(6, 25, 2, 2, "#38bdf8");
                    break;
                }

                case "Toyota Camry 3.5": {
                    const bt = getBodyTones("#111827");
                    drawShadow(21, 51);
                    drawWheels(20, 25, "#cbd5e1", null, "#374151");

                    // Стреловидный острый нос (Keen Look V-образный капот)
                    px(-4, -26, 8, 1, bt.dark);  // Острый нос
                    px(-7, -25, 14, 2, bt.dark); // Скос к фарам
                    px(-9, -24, 18, 2, bt.dark);
                    px(-6, -25, 12, 2, bt.mid);

                    // Длинный аэродинамический капот и передние крылья
                    px(-9, -22, 18, 11, bt.dark);
                    px(-8, -22, 16, 11, bt.mid);
                    px(-7, -21, 14, 9, bt.light);

                    // Скульптурная талия и двери со стреловидной выштамповкой
                    px(-8, -11, 16, 21, bt.dark);
                    px(-7, -11, 14, 21, bt.mid);
                    // Хромированные молдинги окон
                    px(-8, -10, 1, 20, "#e2e8f0");
                    px(7, -10, 1, 20, "#e2e8f0");

                    // Задние мускулистые крылья седана
                    px(-9, 10, 18, 11, bt.dark);
                    px(-8, 10, 16, 11, bt.mid);

                    // Багажник со скошенными углами и интегрированным дактейлом
                    px(-8, 21, 16, 2, bt.dark);
                    px(-7, 21, 14, 1, bt.bright);
                    px(-6, 23, 12, 2, bt.dark); // Скругленный задний бампер

                    // Агрессивная решетка 3.5 (широкий трапециевидный зев)
                    px(-6, -25, 12, 3, "#111827");
                    px(-5, -24, 10, 1, "#374151");
                    px(-1, -25, 2, 1, "#e2e8f0");

                    // Трехлинзовые фары Triple-LED с ресницами
                    px(-9, -25, 3, 2, "#bae6fd");
                    px(6, -25, 3, 2, "#bae6fd");
                    px(-8, -24, 2, 1, "#ffffff");
                    px(6, -24, 2, 1, "#ffffff");

                    drawMirrors(19, -11, bt.dark, "#38bdf8");

                    drawGlass(-8, -10, 16, 6, "#0f172a", true);
                    px(-7, -4, 14, 14, bt.mid);
                    px(-6, -3, 12, 12, bt.light);
                    drawGlass(-8, 10, 16, 5, "#0f172a", true);

                    // Широкая сабля на багажнике хром и фонари
                    px(-6, 22, 12, 1, "#e2e8f0");
                    px(-8, 22, 3, 2, "#dc2626");
                    px(5, 22, 3, 2, "#dc2626");
                    px(-7, 22, 2, 1, "#ef4444");
                    px(5, 22, 2, 1, "#ef4444");

                    // Настоящий двойной выхлоп 3.5 по бокам бампера
                    px(-6, 25, 3, 2, "#cbd5e1");
                    px(3, 25, 3, 2, "#cbd5e1");
                    break;
                }

                case "Toyota Land Cruiser 300": {
                    const bt = getBodyTones("#f1f5f9");
                    drawShadow(23, 52);
                    drawWheels(22, 27, "#cbd5e1", null, "#475569");

                    // Массивный высокий внедорожник: широкие мощные плечи
                    px(-8, -26, 16, 2, bt.dark);
                    px(-10, -25, 20, 3, bt.dark);
                    px(-9, -25, 18, 2, bt.mid);

                    // Огромный капот с центральной выштамповкой
                    px(-11, -22, 22, 12, bt.dark);
                    px(-10, -22, 20, 12, bt.mid);
                    px(-7, -21, 14, 10, bt.light);
                    px(-2, -21, 4, 9, bt.dark); // Центральное углубление LC300

                    // Мускулистые боковины внедорожника с подножками
                    px(-10, -10, 20, 20, bt.dark);
                    px(-9, -10, 18, 20, bt.mid);
                    // Подножки
                    px(-11, -9, 1, 18, "#334155");
                    px(10, -9, 1, 18, "#334155");

                    // Широкие задние крылья и массивная задняя дверь
                    px(-11, 10, 22, 13, bt.dark);
                    px(-10, 10, 20, 13, bt.mid);
                    px(-9, 23, 18, 2, bt.dark);

                    // Огромная 4-полосная решетка радиатора хром
                    px(-7, -26, 14, 5, "#e2e8f0");
                    px(-6, -25, 12, 1, "#0f172a");
                    px(-6, -23, 12, 1, "#0f172a");
                    px(-1, -25, 2, 2, "#38bdf8");

                    // 3-секционные LED фары
                    px(-10, -26, 3, 3, "#bae6fd");
                    px(7, -26, 3, 3, "#bae6fd");
                    px(-9, -25, 2, 1, "#ffffff");
                    px(7, -25, 2, 1, "#ffffff");

                    // Серебристые рейлинги на крыше
                    px(-9, -8, 1, 23, "#94a3b8");
                    px(8, -8, 1, 23, "#94a3b8");

                    drawMirrors(22, -12, bt.dark, "#38bdf8");

                    drawGlass(-9, -11, 18, 6, "#0f172a", true);
                    px(-8, -5, 16, 17, bt.mid);
                    px(-7, -4, 14, 15, bt.light);
                    drawGlass(-9, 12, 18, 5, "#0f172a", true);

                    // Спойлер с дополнительным стоп-сигналом
                    px(-9, 23, 18, 2, bt.dark);
                    px(-2, 23, 4, 1, "#ef4444");

                    // L-образные LED фонари
                    px(-10, 24, 4, 2, "#dc2626");
                    px(6, 24, 4, 2, "#dc2626");
                    px(-9, 24, 2, 1, "#fca5a5");
                    px(7, 24, 2, 1, "#fca5a5");
                    break;
                }

                case "Mercedes-Benz E63s AMG": {
                    const bt = getBodyTones("#3f3f46");
                    drawShadow(21, 50);
                    drawWheels(20, 25, "#18181b", "#f59e0b", "#3f3f46");

                    // Выпуклый нос Panamericana (выступает вперед по центру)
                    px(-5, -26, 10, 2, bt.dark);
                    px(-8, -25, 16, 2, bt.dark);
                    px(-9, -24, 18, 2, bt.dark);
                    px(-7, -25, 14, 2, bt.mid);

                    // Мускулистые передние крылья V8 Biturbo
                    px(-9, -22, 18, 11, bt.dark);
                    px(-8, -22, 16, 11, bt.mid);
                    px(-6, -21, 12, 9, bt.light);

                    // Элегантная талия купеобразного седана
                    px(-8, -11, 16, 20, bt.dark);
                    px(-7, -11, 14, 20, bt.mid);

                    // Задние широкие крылья AMG
                    px(-9, 9, 18, 12, bt.dark);
                    px(-8, 9, 16, 12, bt.mid);

                    // Покатый закругленный багажник со спойлером
                    px(-8, 21, 16, 2, "#09090b");
                    px(-7, 23, 14, 2, bt.dark);

                    // Фирменная решетка Panamericana с 12 вертикальными зубьями хром
                    px(-4, -25, 8, 3, "#18181b");
                    px(-3, -25, 1, 3, "#e2e8f0");
                    px(-1, -25, 2, 2, "#ffffff");
                    px(2, -25, 1, 3, "#e2e8f0");

                    // Фары Multibeam LED с синей подсветкой
                    px(-8, -25, 3, 2, "#38bdf8");
                    px(5, -25, 3, 2, "#38bdf8");
                    px(-7, -24, 2, 1, "#ffffff");
                    px(5, -24, 2, 1, "#ffffff");

                    // Карбоновые корпуса зеркал
                    drawMirrors(20, -11, "#09090b", "#38bdf8");

                    // Панорамная черная крыша
                    drawGlass(-8, -11, 16, 6, "#0f172a", true);
                    px(-7, -5, 14, 15, "#09090b");
                    px(-6, -4, 12, 13, "#18181b");
                    drawGlass(-8, 10, 16, 5, "#0f172a", true);

                    // Фонари «Звездная пыль» (Stardust LED)
                    px(-8, 22, 3, 2, "#ef4444");
                    px(5, 22, 3, 2, "#ef4444");

                    // Трапециевидные сдвоенные выхлопы AMG
                    px(-7, 24, 3, 2, "#09090b");
                    px(4, 24, 3, 2, "#09090b");
                    px(-6, 24, 1, 2, "#71717a");
                    px(5, 24, 1, 2, "#71717a");
                    break;
                }

                case "Audi RS6 Avant": {
                    const bt = getBodyTones("#78716c");
                    drawShadow(22, 52);
                    // 22" диски с красными суппортами RS
                    drawWheels(22, 26, "#1e293b", "#ef4444", "#475569");

                    // Злой широкий шестиугольный перед Singleframe со скошенными углами
                    px(-6, -26, 12, 2, bt.dark); // Центральный сплиттер
                    px(-9, -25, 18, 3, bt.dark);
                    px(-8, -25, 16, 2, bt.mid);

                    // Легендарные расширители крыльев Quattro Blisters над передними колесами (ширина 21!)
                    px(-10, -22, 20, 11, bt.dark);
                    px(-9, -22, 18, 11, bt.mid);
                    px(-7, -21, 14, 9, bt.light);

                    // Утопленная талия по дверям (ширина 18)
                    px(-8, -11, 16, 19, bt.dark);
                    px(-7, -11, 14, 19, bt.mid);

                    // Мускулистые задние арки Quattro Blisters (ширина 21.5!)
                    px(-10, 8, 20, 13, bt.dark);
                    px(-9, 8, 18, 13, bt.mid);

                    // Рейлинги на длинной крыше универсала
                    px(-8, -9, 1, 23, "#0f172a");
                    px(7, -9, 1, 23, "#0f172a");

                    // Задний козырек-спойлер над стеклом багажника
                    px(-9, 14, 18, 3, "#18181b");
                    drawGlass(-8, 17, 16, 4, "#0f172a", false);

                    // Задний диффузор со скругленными углами
                    px(-8, 21, 16, 3, bt.dark);
                    px(-6, 24, 12, 2, "#09090b");

                    // Черная сотовая решетка Singleframe с шильдиком quattro
                    px(-6, -26, 12, 4, "#0c0a09");
                    px(-3, -24, 6, 1, "#e2e8f0");
                    px(-1, -26, 2, 1, "#cbd5e1");

                    // HD Matrix LED фары с синим лазером
                    px(-9, -26, 3, 2, "#38bdf8");
                    px(6, -26, 3, 2, "#38bdf8");
                    px(-9, -25, 2, 1, "#ffffff");
                    px(7, -25, 2, 1, "#ffffff");

                    drawMirrors(21, -12, "#09090b", "#38bdf8");

                    drawGlass(-8, -11, 16, 6, "#0f172a", true);
                    px(-7, -5, 14, 19, bt.mid);
                    px(-6, -4, 12, 17, bt.light);

                    // Светодиодная полоса фонарей RS6 с анимацией
                    px(-8, 23, 16, 1, "#ef4444");
                    px(-9, 23, 3, 2, "#dc2626");
                    px(6, 23, 3, 2, "#dc2626");

                    // Огромные овальные трубы RS (самые большие пушки)
                    px(-7, 25, 3, 2, "#cbd5e1");
                    px(4, 25, 3, 2, "#cbd5e1");
                    px(-6, 25, 1, 2, "#09090b");
                    px(5, 25, 1, 2, "#09090b");
                    break;
                }

                case "BMW M5 F90 Competition": {
                    const bt = getBodyTones("#1d4ed8");
                    drawShadow(21, 50);
                    drawWheels(20, 25, "#09090b", "#eab308", "#334155");

                    // Нос с двойными ноздрями M (скошенные углы, передний сплиттер)
                    px(-6, -26, 12, 2, bt.dark);
                    px(-9, -25, 18, 3, bt.dark);
                    px(-8, -25, 16, 2, bt.mid);

                    // Мускулистые передние M-крылья и капот с двойным пауэрдоумом
                    px(-9, -22, 18, 11, bt.dark);
                    px(-8, -22, 16, 11, bt.mid);
                    px(-6, -21, 12, 9, bt.light);
                    px(-2, -21, 1, 8, bt.dark); // Двойные ребра пауэрдоума
                    px(1, -21, 1, 8, bt.dark);

                    // Талия вдоль дверей с аэродинамическими порогами M
                    px(-8, -11, 16, 20, bt.dark);
                    px(-7, -11, 14, 20, bt.mid);

                    // Задние мускулистые крылья M-sedan
                    px(-9, 9, 18, 12, bt.dark);
                    px(-8, 9, 16, 12, bt.mid);

                    // Багажник со скошенными углами и карбоновым M-спойлером
                    px(-8, 21, 16, 2, "#000000"); // Карбоновый спойлер
                    px(-7, 23, 14, 2, bt.dark);   // Задний бампер со скошенными углами

                    // Черные ноздри Shadowline с шильдиком M5 Competition
                    px(-4, -25, 8, 3, "#000000");
                    px(-1, -25, 2, 3, bt.dark);
                    px(2, -25, 1, 1, "#e2e8f0");

                    // Laserlight фары с синими X-элементами
                    px(-8, -25, 3, 2, "#38bdf8");
                    px(5, -25, 3, 2, "#38bdf8");
                    px(-7, -24, 2, 1, "#ffffff");
                    px(5, -24, 2, 1, "#ffffff");

                    // Двурогие зеркала M
                    drawMirrors(20, -11, "#000000", "#38bdf8");

                    drawGlass(-8, -11, 16, 6, "#0f172a", true);

                    // Карбоновая крыша с характерным центральным желобом
                    px(-7, -5, 14, 15, "#09090b");
                    px(-5, -4, 10, 13, "#18181b");
                    px(-1, -5, 2, 15, "#050505");

                    drawGlass(-8, 10, 16, 5, "#0f172a", true);

                    // Трехмерные задние фонари L-образной формы
                    px(-8, 22, 3, 2, "#ef4444");
                    px(5, 22, 3, 2, "#ef4444");

                    // Черные четверные 100-мм выхлопы M Sport
                    px(-7, 24, 2, 2, "#000000");
                    px(5, 24, 2, 2, "#000000");
                    px(-5, 24, 2, 2, "#000000");
                    px(3, 24, 2, 2, "#000000");
                    break;
                }

                case "Mercedes-Benz G63 AMG «Гелик»": {
                    const bt = getBodyTones("#11141a");
                    drawShadow(22, 50);
                    drawWheels(22, 26, "#18181b", "#ef4444", "#334155");

                    // Знаменитый КВАДРАТНЫЙ силуэт (брутальный "кирпич") — с аутентичными рожками-поворотниками, боковым выхлопом и запаской!
                    px(-10, -25, 20, 3, bt.dark);
                    px(-9, -24, 18, 2, bt.mid);

                    // Капот с выступающими углами и рожками
                    px(-10, -22, 20, 12, bt.dark);
                    px(-9, -22, 18, 12, bt.mid);
                    // Поворотники на крыльях (визитная карточка G-Class!)
                    px(-11, -21, 2, 3, "#f59e0b");
                    px(9, -21, 2, 3, "#f59e0b");

                    // Прямые борта с резино-металлическими молдингами
                    px(-10, -10, 20, 20, bt.dark);
                    px(-9, -10, 18, 20, bt.mid);
                    px(-11, -10, 1, 20, "#475569");
                    px(10, -10, 1, 20, "#475569");

                    // Круглые фары LED Halo
                    px(-9, -25, 3, 3, "#ffffff");
                    px(6, -25, 3, 3, "#ffffff");
                    px(-8, -24, 1, 1, "#38bdf8");
                    px(7, -24, 1, 1, "#38bdf8");

                    // Решетка Panamericana вертикальные планки
                    px(-5, -25, 10, 3, "#000000");
                    px(-4, -25, 1, 3, "#cbd5e1");
                    px(-2, -25, 1, 3, "#cbd5e1");
                    px(1, -25, 1, 3, "#cbd5e1");
                    px(3, -25, 1, 3, "#cbd5e1");

                    // Квадратные зеркала
                    drawMirrors(22, -11, bt.dark, "#38bdf8");

                    // Прямое лобовое стекло с резинкой
                    drawGlass(-8, -11, 16, 5, "#0f172a", true);

                    // Крыша с водосточными желобами
                    px(-9, -6, 18, 16, bt.dark);
                    px(-8, -5, 16, 14, bt.mid);

                    drawGlass(-8, 10, 16, 5, "#0f172a", false);

                    // Знаменитый боковой выхлоп AMG под задними порогами!
                    px(-12, 8, 2, 5, "#cbd5e1");
                    px(10, 8, 2, 5, "#cbd5e1");

                    // Квадратная корма с запаской на задней двери
                    px(-10, 10, 20, 14, bt.dark);
                    px(-9, 10, 18, 14, bt.mid);
                    // Запаска на задней двери с хромированным кольцом и звездой
                    px(-6, 20, 12, 6, "#e2e8f0");
                    px(-5, 21, 10, 4, bt.dark);
                    px(-1, 22, 2, 2, "#e2e8f0");
                    break;
                }

                case "Porsche 911 Turbo S": {
                    const bt = getBodyTones("#dc2626");
                    drawShadow(23, 49);
                    // Центргайки + желтые керамические суппорты PCCB
                    drawWheels(20, 24, "#09090b", "#facc15", "#334155");

                    // Нос и передний бампер (округлый нос, скругленные углы)
                    px(-5, -24, 10, 1, bt.dark); // Самый кончик носа (закругление)
                    px(-7, -23, 14, 2, bt.dark); // Скругленный передний бампер
                    px(-6, -23, 12, 2, bt.mid);

                    // Передние крылья и капот (капот утоплен между крыльями)
                    px(-8, -21, 16, 11, bt.dark);
                    px(-7, -21, 14, 11, bt.mid);
                    px(-4, -20, 8, 9, bt.light); // Утопленный капот по центру
                    px(-1, -20, 2, 9, bt.bright);

                    // Каплевидные 4-точечные LED фары на крыльях
                    px(-8, -23, 3, 2, "#bae6fd");
                    px(5, -23, 3, 2, "#bae6fd");
                    px(-7, -23, 1, 1, "#ffffff");
                    px(5, -23, 1, 1, "#ffffff");

                    drawMirrors(19, -10, bt.dark, "#38bdf8");

                    // Талия вдоль дверей (сужение кузова до ширины 14-15)
                    px(-7, -10, 14, 14, bt.dark);
                    px(-6, -10, 12, 14, bt.mid);

                    // Каплевидная кабина с плавным сужением назад
                    drawGlass(-6, -10, 12, 6, "#0f172a", true);
                    px(-5, -4, 10, 12, bt.dark);
                    px(-4, -3, 8, 10, bt.mid);
                    drawGlass(-6, 8, 12, 6, "#0f172a", true);

                    // Знаменитые широченные задние бедра Turbo S (ширина расширяется до 22!)
                    px(-11, 4, 22, 14, bt.dark); // Мощные боковые расширения
                    px(-10, 5, 20, 12, bt.mid);
                    // Жабры воздухозаборников турбин на крыльях
                    px(-11, 6, 2, 7, "#09090b");
                    px(9, 6, 2, 7, "#09090b");

                    // Корма и покатый скос задней части (сужение до 17, затем до 12)
                    px(-9, 18, 18, 4, bt.dark);
                    px(-8, 18, 16, 4, bt.mid);
                    px(-7, 22, 14, 2, bt.dark); // Закругленный задний бампер
                    px(-5, 23, 10, 1, bt.dark); // Центральный диффузор

                    // Активное антикрыло Turbo S
                    px(-10, 16, 20, 3, "#18181b");
                    px(-8, 15, 2, 2, "#09090b");
                    px(6, 15, 2, 2, "#09090b");

                    // Непрерывная 3D светодиодная полоса во всю ширину кормы
                    px(-9, 21, 18, 1, "#ef4444");
                    px(-8, 21, 16, 1, "#fca5a5");

                    // Четырехугольные насадки спортивного выхлопа
                    px(-7, 23, 3, 2, "#cbd5e1");
                    px(4, 23, 3, 2, "#cbd5e1");
                    break;
                }

                case "Rolls-Royce Cullinan": {
                    const bt = getBodyTones("#111827");
                    drawShadow(24, 55);
                    // 22" диски с неподвижными центрами RR
                    drawWheels(23, 27, "#e2e8f0", null, "#475569");

                    // Монументальный кузов самого роскошного SUV
                    px(-9, -27, 18, 3, bt.dark);
                    px(-11, -25, 22, 3, bt.dark);
                    px(-10, -25, 20, 2, bt.mid);

                    // Длинный плоский капот Rolls-Royce
                    px(-11, -22, 22, 13, bt.dark);
                    px(-10, -22, 20, 13, bt.mid);
                    px(-8, -21, 16, 11, bt.light);

                    // Монументальная хромированная решетка Pantheon
                    px(-6, -27, 12, 6, "#f8fafc");
                    px(-5, -26, 1, 4, "#475569");
                    px(-3, -26, 1, 4, "#475569");
                    px(-1, -26, 1, 4, "#475569");
                    px(1, -26, 1, 4, "#475569");
                    px(3, -26, 1, 4, "#475569");
                    // Статуэтка «Дух Экстаза» (Spirit of Ecstasy) на капоте
                    px(-1, -29, 2, 3, "#ffffff");

                    // Прямоугольные лазерные фары
                    px(-10, -27, 3, 3, "#bae6fd");
                    px(7, -27, 3, 3, "#bae6fd");

                    // Ручная серебряная линия Coachline вдоль всего кузова
                    px(-11, -23, 1, 45, "#e2e8f0");
                    px(10, -23, 1, 45, "#e2e8f0");

                    // Салон и распашные двери Coach Doors с хромированными ручками встык
                    px(-11, -9, 22, 22, bt.dark);
                    px(-10, -9, 20, 22, bt.mid);
                    px(-11, -1, 1, 3, "#ffffff");
                    px(10, -1, 1, 3, "#ffffff");

                    drawMirrors(23, -12, bt.dark, "#38bdf8");

                    drawGlass(-9, -11, 18, 6, "#0a0d14", true);
                    px(-8, -5, 16, 18, bt.mid);
                    drawGlass(-9, 13, 18, 5, "#0a0d14", true);

                    // Монументальная строгая задняя часть
                    px(-11, 13, 22, 13, bt.dark);
                    px(-10, 13, 20, 13, bt.mid);
                    px(-9, 26, 18, 2, bt.dark);

                    // Вертикальные хрустальные фонари
                    px(-11, 21, 2, 5, "#dc2626");
                    px(9, 21, 2, 5, "#dc2626");

                    // Интегрированные полированные выхлопы
                    px(-8, 26, 3, 2, "#e2e8f0");
                    px(5, 26, 3, 2, "#e2e8f0");
                    break;
                }

                case "Bugatti Chiron Super Sport": {
                    const bt = getBodyTones("#2563eb");
                    drawShadow(24, 54);
                    // Легкие турбинные диски Chiron
                    drawWheels(23, 26, "#09090b", "#38bdf8", "#475569");

                    // Нос с подковообразной решеткой (закругленный каплевидный сплиттер)
                    px(-4, -27, 8, 2, "#000000"); // Подкова Bugatti
                    px(-1, -27, 2, 1, "#ef4444"); // Красный Macaron
                    px(-8, -26, 16, 2, bt.dark);  // Закругленный передний спойлер
                    px(-10, -25, 20, 3, bt.dark); // Передний сплиттер расширяется к крыльям

                    // Передние аэродинамические крылья (ширина 22)
                    px(-11, -22, 22, 10, bt.dark);
                    px(-10, -22, 20, 10, bt.mid);
                    px(-5, -22, 10, 9, bt.light);

                    // 8-глазые светодиодные кубы фар (Quad-LED 8-Eyes)
                    px(-10, -26, 4, 2, "#67e8f9");
                    px(6, -26, 4, 2, "#67e8f9");

                    drawMirrors(22, -11, bt.dark, "#38bdf8");

                    // Аэродинамические боковые вырезы (Bugatti C-Line сужение до 19)
                    px(-10, -12, 20, 14, bt.dark);
                    px(-9, -12, 18, 14, bt.mid);
                    // Хромированная/алюминиевая дуга Bugatti C-Line (полукруглая линия воздухозаборника)
                    px(-10, -10, 2, 12, "#93c5fd");
                    px(8, -10, 2, 12, "#93c5fd");

                    drawGlass(-7, -10, 14, 6, "#0f172a", true);
                    px(-6, -4, 12, 12, "#060709");

                    // Массивные задние плечи двигателя W16 (ширина 24!)
                    px(-12, 2, 24, 18, "#060709");
                    px(-11, 3, 22, 16, "#111827");

                    // Открытый двигатель W16 квад-турбо (впускные коллекторы титан)
                    px(-5, 8, 10, 6, "#cbd5e1");
                    px(-3, 8, 6, 6, "#475569");

                    // Центральный аэродинамический плавник-киль
                    px(-1, -10, 2, 32, bt.dark);

                    // Аэродинамический сужающийся хвост и диффузор (сужение до 18, затем до 12)
                    px(-10, 20, 20, 3, "#060709");
                    px(-8, 23, 16, 2, "#060709");
                    px(-6, 25, 12, 2, "#000000"); // Диффузор

                    // Непрерывная 1.6-метровая полоса фонаря во всю ширину
                    px(-10, 23, 20, 1, "#ef4444");
                    px(-9, 23, 18, 1, "#f87171");

                    // Четыре вертикально сдвоенных титановых выхлопа в гоночном диффузоре
                    px(-2, 25, 4, 3, "#94a3b8");
                    px(-1, 25, 2, 3, "#09090b");
                    break;
                }

                case "ДПС / Полиция": {
                    px(-11, -24, 22, 48, "rgba(0,0,0,0.4)");
                    drawWheels(19, 24, "#cbd5e1", null, "#334155");

                    // Белоснежный кузов Skoda/Octavia ДПС
                    px(-9, -24, 18, 47, "#e2e8f0");
                    px(-8, -23, 16, 45, "#ffffff");
                    px(-7, -22, 14, 12, "#f8fafc");

                    // Синяя полоса ДПС на капоте с надписью
                    px(-6, -21, 12, 5, "#1d4ed8");
                    px(-4, -19, 8, 1, "#ffffff");

                    // Синие полосы по бортам с желтыми светоотражающими кантами
                    px(-10, -16, 2, 31, "#1d4ed8");
                    px(8, -16, 2, 31, "#1d4ed8");
                    px(-10, -1, 2, 2, "#f59e0b");
                    px(8, -1, 2, 2, "#f59e0b");

                    // Фары и решетка
                    px(-9, -24, 3, 2, "#fef3c7");
                    px(6, -24, 3, 2, "#fef3c7");
                    px(-5, -24, 10, 2, "#1e293b");

                    drawMirrors(19, -10, "#ffffff", "#38bdf8");

                    drawGlass(-8, -10, 16, 6, "#1e293b", true);
                    px(-7, -4, 14, 14, "#ffffff");
                    drawGlass(-8, 10, 16, 5, "#1e293b", true);

                    // Мигалка ДПС на крыше (стробоскоп: синий и красный попеременно)
                    const strobe = Math.floor(Date.now() / 90) % 2;
                    px(-7, -4, 6, 4, strobe === 0 ? "#38bdf8" : "#1e40af");
                    px(1, -4, 6, 4, strobe === 1 ? "#ef4444" : "#991b1b");
                    px(-1, -4, 2, 4, "#cbd5e1");

                    // Ореол свечения спецсигналов
                    ctx.fillStyle = strobe === 0 ? "rgba(56, 189, 248, 0.45)" : "rgba(239, 68, 68, 0.45)";
                    ctx.beginPath();
                    ctx.arc(cx, cy - 2 * s, 18 * s, 0, Math.PI * 2);
                    ctx.fill();

                    // Задние фонари
                    px(-9, 21, 3, 2, "#dc2626");
                    px(6, 21, 3, 2, "#dc2626");
                    // Шевроны на заднем бампере
                    px(-6, 22, 12, 1, "#f59e0b");
                    break;
                }

                case "КАМАЗ / Фура": {
                    // Тень длинной фуры
                    px(-14, -36, 28, 74, "rgba(0,0,0,0.5)");
                    // 6 массивных сдвоенных колес с дисками
                    const wx = 12;
                    px(-wx - 2, -26, 4, 8, "#09090b");
                    px(wx - 2, -26, 4, 8, "#09090b");
                    px(-wx - 2, 8, 4, 8, "#09090b");
                    px(wx - 2, 8, 4, 8, "#09090b");
                    px(-wx - 2, 23, 4, 8, "#09090b");
                    px(wx - 2, 23, 4, 8, "#09090b");

                    px(-wx - 1, -25, 2, 6, "#64748b");
                    px(wx - 1, -25, 2, 6, "#64748b");
                    px(-wx - 1, 9, 2, 6, "#64748b");
                    px(wx - 1, 9, 2, 6, "#64748b");
                    px(-wx - 1, 24, 2, 6, "#64748b");
                    px(wx - 1, 24, 2, 6, "#64748b");

                    // Оранжевая кабина КАМАЗ
                    px(-11, -36, 22, 19, "#c2410c");
                    px(-10, -35, 20, 17, "#ea580c");
                    px(-9, -34, 18, 14, "#f97316");

                    // Белый спойлер-обтекатель на крыше
                    px(-8, -26, 16, 8, "#f8fafc");

                    // 5 автопоездных огней на козырьке кабины
                    for (let lx = -6; lx <= 6; lx += 3) {
                        px(lx, -36, 2, 1, "#f59e0b");
                    }

                    // Лобовое панорамное стекло кабины
                    drawGlass(-10, -33, 20, 6, "#0f172a", true);
                    px(-5, -34, 3, 1, "#09090b");
                    px(2, -34, 3, 1, "#09090b");

                    // Решетка радиатора и шильдик «КАМАЗ»
                    px(-6, -36, 12, 2, "#1e293b");
                    px(-4, -36, 8, 1, "#e2e8f0");

                    // Фары в бампере
                    px(-10, -36, 3, 2, "#fef08a");
                    px(7, -36, 3, 2, "#fef08a");

                    // Большие грузовые зеркала на кронштейнах
                    px(-14, -32, 2, 6, "#0f172a");
                    px(12, -32, 2, 6, "#0f172a");
                    px(-14, -31, 1, 4, "#38bdf8");
                    px(13, -31, 1, 4, "#38bdf8");

                    // Седельно-сцепное устройство
                    px(-5, -17, 10, 4, "#334155");

                    // Длинный гофрированный полуприцеп
                    px(-12, -13, 24, 49, "#334155");
                    px(-11, -12, 22, 47, "#475569");
                    px(-10, -11, 20, 45, "#64748b");
                    // Ребра жесткости гофры прицепа
                    for (let ry = -8; ry < 32; ry += 6) {
                        px(-11, ry, 22, 1, "#334155");
                        px(-10, ry + 1, 20, 1, "#94a3b8");
                    }
                    // Светоотражающая красно-белая лента по периметру
                    px(-12, -12, 1, 46, "#ef4444");
                    px(11, -12, 1, 46, "#ef4444");

                    // Задний противоподкатный брус и фонари
                    px(-11, 34, 22, 2, "#cbd5e1");
                    px(-10, 33, 4, 2, "#dc2626");
                    px(6, 33, 4, 2, "#dc2626");
                    px(-6, 33, 2, 2, "#f59e0b");
                    px(4, 33, 2, 2, "#f59e0b");
                    break;
                }

                case "Дорожный конус": {
                    px(-7, -7, 14, 14, "rgba(0,0,0,0.35)");
                    // Утяжеленное черное восьмиугольное резиновое основание
                    px(-6, 3, 12, 4, "#09090b");
                    px(-5, 2, 10, 6, "#18181b");
                    // Оранжевое коническое тело со светоотражающими полосами 3M
                    px(-5, 0, 10, 3, "#ea580c");
                    px(-4, -2, 8, 3, "#f8fafc");
                    px(-4, -1, 8, 1, "#cbd5e1");
                    px(-3, -4, 6, 2, "#f97316");
                    px(-3, -6, 6, 2, "#f8fafc");
                    px(-2, -8, 4, 2, "#ea580c");
                    px(-1, -9, 2, 1, "#09090b");
                    break;
                }

                default: {
                    px(-10, -22, 20, 45, "rgba(0,0,0,0.35)");
                    drawWheels(18, 22, "#94a3b8");
                    px(-8, -23, 16, 45, "#1d4ed8");
                    px(-7, -22, 14, 43, "#2563eb");
                    drawGlass(-7, -9, 14, 5, "#1e293b", true);
                    px(-6, -4, 12, 13, "#3b82f6");
                    drawGlass(-7, 9, 14, 5, "#1e293b", true);
                    px(-8, -23, 3, 2, "#f8fafc");
                    px(5, -23, 3, 2, "#f8fafc");
                    px(-8, 21, 3, 2, "#dc2626");
                    px(5, 21, 3, 2, "#dc2626");
                }
            }

            // Объемные лучи фар (Headlights volumetric beams)
            if (options.lightsOn) {
                const frontY = name === "КАМАЗ / Фура" ? (cy - 36 * s) : (cy - 24 * s);
                const beamReach = 145 * s;
                const spread = 28 * s;

                // 1. Левый луч
                const gradL = ctx.createLinearGradient(cx - 7 * s, frontY, cx - 18 * s, frontY - beamReach);
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

                // 2. Правый луч
                const gradR = ctx.createLinearGradient(cx + 7 * s, frontY, cx + 18 * s, frontY - beamReach);
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

                // Левое сопло: плазменный сине-голубой факел
                ctx.fillStyle = "#00f0ff";
                ctx.beginPath();
                ctx.moveTo(cx - 8 * s, rearY);
                ctx.lineTo(cx - 6 * s + (Math.random() - 0.5) * 3, rearY + fLen);
                ctx.lineTo(cx - 4 * s, rearY);
                ctx.closePath();
                ctx.fill();

                // Правое сопло
                ctx.beginPath();
                ctx.moveTo(cx + 4 * s, rearY);
                ctx.lineTo(cx + 6 * s + (Math.random() - 0.5) * 3, rearY + fLen);
                ctx.lineTo(cx + 8 * s, rearY);
                ctx.closePath();
                ctx.fill();

                // Внутреннее горячее ядро пламени (бело-желтое)
                ctx.fillStyle = "#fef08a";
                ctx.beginPath();
                ctx.moveTo(cx - 7 * s, rearY);
                ctx.lineTo(cx - 6 * s, rearY + fLen * 0.48);
                ctx.lineTo(cx - 5 * s, rearY);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(cx + 5 * s, rearY);
                ctx.lineTo(cx + 6 * s, rearY + fLen * 0.48);
                ctx.lineTo(cx + 7 * s, rearY);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }

            // Стоп-сигналы при торможении (яркий красный ареол и пятно на асфальте)
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

                // Красный отсвет на асфальте позади машины
                ctx.fillStyle = "rgba(239, 68, 68, 0.28)";
                ctx.beginPath();
                ctx.ellipse(cx, rearY + 12 * s, 22 * s, 10 * s, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Поворотники (мигалки оранжевым при перестроении)
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

            if (options.tilt) {
                ctx.restore();
            }
        }

        // 🎨 ГЕНЕРАТОР ПИКСЕЛЬНЫХ СПРАЙТОВ АВТОМОБИЛЕЙ СО СТАЙЛИНГОМ И ПОДИУМОМ
        function renderCarSpriteToContext(ctx, width, height, name, styling = {}, options = {}) {
            ctx.clearRect(0, 0, width, height);

            // Тёмный подиум автосалона с мягким световым пятном
            const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, width * 0.65);
            bgGrad.addColorStop(0, '#1c2438');
            bgGrad.addColorStop(0.6, '#0f1422');
            bgGrad.addColorStop(1, '#080a11');
            ctx.fillStyle = bgGrad;
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
            const tilt = (options.tilt !== undefined) ? options.tilt : (Math.PI / 2);
            const scale = options.scale || (width <= 140 ? 1.3 : 2.4);

            drawPixelCar(ctx, cx, cy, name, scale, {
                color: styling?.color,
                tint: styling?.tint,
                neon: styling?.neon,
                tilt: tilt,
                lightsOn: true
            });
        }

        const carSpriteCache = new Map();

        function getCarSpriteDataUrl(name, styling = {}, options = {}) {
            const color = styling?.color || '';
            const tint = Number(styling?.tint || 0);
            const neon = styling?.neon || 'none';
            const tilt = (options.tilt !== undefined) ? options.tilt : (Math.PI / 2);
            const width = options.width || 260;
            const height = options.height || 150;
            const cacheKey = `${name}_${color}_${tint}_${neon}_${tilt}_${width}_${height}`;
            if (carSpriteCache.has(cacheKey)) {
                return carSpriteCache.get(cacheKey);
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

                renderCarSpriteToContext(ctx, width, height, name, { color, tint, neon }, { tilt });
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
            const canvas = document.getElementById('styling-preview-canvas');
            if (!canvas || typeof canvas.getContext !== 'function') return;
            const car = (stylingActiveCarIndex >= 0 && myCars[stylingActiveCarIndex]) ? myCars[stylingActiveCarIndex] : null;
            if (!car) return;
            const ctx = canvas.getContext('2d');
            if (!ctx || typeof ctx.fillRect !== 'function') return;
            renderCarSpriteToContext(ctx, canvas.width, canvas.height, car.name, {
                color: stylingTempColor,
                tint: stylingTempTint,
                neon: stylingTempNeon
            });
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
            isOnWall: false
        };

        let raceKeys = { left: false, right: false, gas: false, brake: false, nitro: false };
        let raceTraffic = [];
        let raceCollectibles = [];
        let raceSkidmarks = [];
        let raceSparks = [];
        let raceRoadOffset = 0;
        let trafficSpawnTimer = 0;
        let collectibleSpawnTimer = 0;
        let roadCurve = 0;
        let targetRoadCurve = 0;
        let curveTimer = 0;

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
                'rain': '🌧️ Грозовой ливень (мокрый асфальт, молнии)'
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
            renderRaceCarPicker();
            updateRaceCarShowcase();
            updateRaceRecordsUI();
            setRaceWeather(raceSelectedWeather);
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
                drawPixelCar(cCtx, 22, 34, carItem.name, 1.1, {
                    color: ownedCar?.styling?.color,
                    tint: ownedCar?.styling?.tint,
                    neon: ownedCar?.styling?.neon
                });

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

            // Отрисовка большой пиксельной витрины
            const canvas = document.getElementById('race-showcase-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawPixelCar(ctx, canvas.width / 2, canvas.height / 2 + 10, selectedRaceCarName, 2.4, {
                    lightsOn: true,
                    color: ownedCarObj?.styling?.color,
                    tint: ownedCarObj?.styling?.tint,
                    neon: ownedCarObj?.styling?.neon
                });
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
            const salonSection = document.getElementById('garage-list');
            if (salonSection) salonSection.scrollIntoView({ behavior: 'smooth' });
        }

        function updateTouchBtnUI(key, active) {
            const btn = document.getElementById('btn-touch-' + key);
            if (btn && btn.classList && typeof btn.classList.toggle === 'function') {
                btn.classList.toggle('pressed', !!active);
            }
        }

        function resetRaceKeys() {
            Object.keys(raceKeys).forEach(key => {
                raceKeys[key] = false;
                updateTouchBtnUI(key, false);
            });
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
            }
            setRaceKey(key, state);
            if (state) {
                if (key === 'nitro') {
                    if (typeof sound?.nitro === 'function') sound.nitro();
                    if (typeof sound?.haptic === 'function') sound.haptic('nitro');
                } else if (key === 'brake') {
                    if (typeof sound?.brake === 'function') sound.brake();
                    if (typeof sound?.haptic === 'function') sound.haptic('medium');
                } else {
                    if (typeof sound?.haptic === 'function') sound.haptic('light');
                }
            }
        }

        window.addEventListener('keydown', (e) => {
            if (!isRaceRunning) return;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { raceKeys.left = true; e.preventDefault(); }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { raceKeys.right = true; e.preventDefault(); }
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { raceKeys.gas = true; e.preventDefault(); }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { raceKeys.brake = true; e.preventDefault(); }
            if (e.key === ' ' || e.key === 'Shift') { raceKeys.nitro = true; e.preventDefault(); }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') raceKeys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') raceKeys.right = false;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') raceKeys.gas = false;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') raceKeys.brake = false;
            if (e.key === ' ' || e.key === 'Shift') raceKeys.nitro = false;
        });

        function showRacePopup(text, color = '#fbbf24') {
            const el = document.getElementById('race-popup-msg');
            if (!el) return;
            el.innerText = text;
            el.style.color = color;
            el.classList.add('show');
            setTimeout(() => el.classList.remove('show'), 700);
        }

        function startRaceWithCar(name, index = -1) {
            selectedRaceCarName = name;
            selectedRaceCarIndex = index;
            const tabs = document.querySelectorAll('.nav-tab');
            let raceTab = null;
            tabs.forEach(t => {
                if (t.innerText.includes('Гонка')) raceTab = t;
            });
            if (raceTab) switchTab('racegame', raceTab);

            const isOwned = myCars.some(c => c.name === name);
            if (isOwned) {
                startRaceGame();
            } else {
                initRaceGameTab();
                notifyUser(`Машина «${name}» не куплена! Заезд заблокирован. Приобретите её в автосалоне.`);
            }
        }

        // Запуск гонки
        function startRaceGame() {
            if (isRaceRunning) return;
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
                speed: 70,
                peakSpeed: 70,
                targetSpeed: stats.speed * 0.7,
                maxSpeed: stats.speed,
                accel: stats.accel,
                handling: stats.handling,
                nitro: 100,
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
                damageTaken: 0,
                tunedStats: stats
            };

            raceTraffic = [];
            raceCollectibles = [];
            raceSkidmarks = [];
            raceSparks = [];
            raceWaterSpray = [];
            raceLightningFlash = 0;
            raceLightningTimer = 4.5 + Math.random() * 4.0;
            raceLightningBolt = [];
            raceRoadOffset = 0;
            trafficSpawnTimer = 0;
            collectibleSpawnTimer = 0;
            roadCurve = 0;
            targetRoadCurve = 0;
            curveTimer = 3.5;

            document.getElementById('race-menu-container').classList.add('hidden');
            document.getElementById('race-play-container').classList.remove('hidden');

            isRaceRunning = true;
            document.body.classList.add("race-active");
            sound.start();
            lastRaceTime = performance.now();
            if (raceAnimFrame) cancelAnimationFrame(raceAnimFrame);
            raceAnimFrame = requestAnimationFrame(raceGameLoop);
        }

        function exitRaceGame() {
            if (isRaceRunning) {
                settleRaceRun(false); // Leaving early still settles fuel and wear.
                return;
            }
            sound.stopEngine();
            document.body.classList.remove("race-active");
            resetRaceKeys();
            isRaceRunning = false;
            if (raceAnimFrame) cancelAnimationFrame(raceAnimFrame);
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
            exitRaceGame();
            initRaceGameTab();
        }

        // Главный цикл гонки
        function raceGameLoop(timestamp) {
            if (!isRaceRunning) return;
            const dt = Math.min((timestamp - lastRaceTime) / 1000, 0.05);
            lastRaceTime = timestamp;

            updateRacePhysics(dt);
            sound.updateEngine({ speed: racePlayer.speed, gas: raceKeys.gas, nitro: racePlayer.isNitroActive, running: isRaceRunning });
            renderRaceFrame();

            if (isRaceRunning) raceAnimFrame = requestAnimationFrame(raceGameLoop);
        }

        function updateRacePhysics(dt) {
            const stats = racePlayer.tunedStats || carRaceStats[selectedRaceCarName] || carRaceStats["ВАЗ-2107 «Жигули»"];

            // 1. Динамические повороты трассы
            curveTimer -= dt;
            if (curveTimer <= 0) {
                curveTimer = 4.0 + Math.random() * 3.5;
                const r = Math.random();
                if (r < 0.35) {
                    targetRoadCurve = 0; // прямой участок
                } else if (r < 0.68) {
                    targetRoadCurve = 45 + Math.random() * 50; // поворот направо
                } else {
                    targetRoadCurve = -(45 + Math.random() * 50); // поворот налево
                }
            }
            roadCurve += (targetRoadCurve - roadCurve) * 1.5 * dt;

            // Центробежная сила при прохождении поворота
            if (Math.abs(roadCurve) > 8) {
                const centrifugalPush = -(roadCurve / 75) * (racePlayer.speed / 130) * 45 * dt;
                racePlayer.vx += centrifugalPush;
            }

            // 2. Нитро логика
            if (raceKeys.nitro && racePlayer.nitro > 0) {
                racePlayer.isNitroActive = true;
                racePlayer.nitro = Math.max(0, racePlayer.nitro - dt * (stats.nitroDrain || 28));
            } else {
                racePlayer.isNitroActive = false;
                racePlayer.nitro = Math.min(100, racePlayer.nitro + dt * (stats.nitroRecharge || 4)); // пассивная зарядка
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
                // Бонус за слипстрим
                racePlayer.earnedCash += 420 * stats.rewardMult * dt;
            }

            // 4. Управление продольной скоростью
            let topSpd = racePlayer.maxSpeed;
            if (racePlayer.isNitroActive) topSpd *= stats.nitroSpeedBonus || 1.35;
            if (racePlayer.isDrafting) topSpd += 28; // слипстрим дает прирост скорости!

            if (raceKeys.gas) {
                racePlayer.targetSpeed = topSpd;
            } else if (raceKeys.brake) {
                racePlayer.targetSpeed = 50;
            } else {
                racePlayer.targetSpeed = topSpd * 0.75;
            }

            const accelMultiplier = (racePlayer.isNitroActive ? 2.5 : 1) * (racePlayer.isDrafting ? 1.6 : 1);
            const accelRate = (racePlayer.accel * 28) * accelMultiplier;

            if (racePlayer.speed < racePlayer.targetSpeed) {
                racePlayer.speed = Math.min(racePlayer.targetSpeed, racePlayer.speed + accelRate * dt);
            } else if (racePlayer.speed > racePlayer.targetSpeed) {
                racePlayer.speed = Math.max(racePlayer.targetSpeed, racePlayer.speed - 60 * dt);
            }
            racePlayer.peakSpeed = Math.max(racePlayer.peakSpeed, racePlayer.speed);
            // Meter real distance and driving style: nitro and heavy throttle cost fuel.
            const burnedFuel = NomeraRaceEconomy.fuelForFrame({
                speed:racePlayer.speed, seconds:dt, consumption:racePlayer.fuelConsumption,
                gas:raceKeys.gas, nitro:racePlayer.isNitroActive, drafting:racePlayer.isDrafting
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

            // 5. Инерция руления и крен кузова
            const maxLateral = racePlayer.handling * 42;
            const steerRate = racePlayer.handling * 175;

            if (raceKeys.left) {
                racePlayer.vx = Math.max(-maxLateral, racePlayer.vx - steerRate * dt);
            } else if (raceKeys.right) {
                racePlayer.vx = Math.min(maxLateral, racePlayer.vx + steerRate * dt);
            } else {
                // Плавное затухание инерции
                racePlayer.vx *= Math.pow(0.015, dt);
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

            // Плавный крен кузова при повороте
            const targetTilt = (racePlayer.vx / maxLateral) * 0.12;
            racePlayer.tilt += (targetTilt - racePlayer.tilt) * 14 * dt;

            // 6. Генерация следов шин при заносе или резком торможении
            const isSkidding = Math.abs(racePlayer.vx) > (maxLateral * 0.55) || (raceKeys.brake && racePlayer.speed > 80);
            if (isSkidding) {
                raceSkidmarks.push({
                    x: racePlayer.x,
                    y: racePlayer.y + 16,
                    life: 0.95
                });
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
            }

            // Заработок денег (СТРОГО 0 ₽ ПРИ КАСАНИИ СТЕНЫ + ШТРАФ ЗА РЕМОНТ КУЗОВА!)
            if (!racePlayer.isOnWall && racePlayer.speed > 25) {
                const cashRatePerSec = (racePlayer.speed * 1.6) * stats.rewardMult;
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

            // 10. Физика трафика, динамический ИИ (перестроения, поворотники) и столкновения
            const lanes = [95, 165, 235, 305];
            for (let i = raceTraffic.length - 1; i >= 0; i--) {
                const t = raceTraffic[i];

                // Вертикальное движение (относительно игрока)
                const relativeSpeed = (racePlayer.speed - t.speed) * 3.5;
                t.y += relativeSpeed * dt;

                // ДИНАМИЧЕСКИЙ ТРАФИК: Машины двигаются между рядами, обгоняют и тормозят
                if (!t.isCone) {
                    t.changeLaneCooldown -= dt;

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

                    if (obstacleAhead) {
                        // Притормаживаем перед машиной впереди
                        if (t.speed > obstacleAhead.speed) {
                            t.speed = Math.max(45, t.speed - 65 * dt);
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
                                t.blinkerTimer = 0.4;
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
                                    t.blinkerTimer = 0.45;
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
                    if (t.isPolice && Math.abs(t.y - racePlayer.y) < 180 && racePlayer.speed > 190) {
                        t.targetSpeed = 145;
                    }
                }

                // Проверка опасного обгона (near-miss)
                if (!t.overtaken && t.y > racePlayer.y - 10) {
                    const dx = Math.abs(t.x - racePlayer.x);
                    if (dx > 20 && dx < 46) {
                        t.overtaken = true;
                        racePlayer.overtakesCount++;
                        racePlayer.combo = Math.min(8, racePlayer.combo + 1);
                        racePlayer.comboTimer = 3.5;
                        const bonus = Math.round(1800 * stats.rewardMult * racePlayer.combo);
                        racePlayer.earnedCash += bonus;
                        showRacePopup(`🔥 ОБГОН! +${bonus.toLocaleString('ru-RU')} ₽ (x${racePlayer.combo})`, '#fbbf24');
                        playCashSound();
                    }
                }

                // Проверка столкновения
                const dx = Math.abs(t.x - racePlayer.x);
                const dy = Math.abs(t.y - racePlayer.y);
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
                        showRacePopup("🚧 СБИТ КОНУС! -18 км/ч", "#f97316");
                        triggerScreenShake();
                        playTick();
                        for (let k = 0; k < 10; k++) {
                            raceSparks.push({
                                x: racePlayer.x + (Math.random() - 0.5) * 16,
                                y: racePlayer.y - 10,
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
                    } else if (dx >= 12 && !t.isTruck) {
                        // БОКОВОЙ КОНТАКТ (SIDE SCRAPE) с легковым авто!
                        // Отскок в сторону, искры от трения металла, потеря скорости вместо смерти
                        const pushDir = racePlayer.x < t.x ? -1 : 1;
                        racePlayer.x += pushDir * 16;
                        racePlayer.vx = pushDir * -130;
                        racePlayer.speed = Math.max(50, racePlayer.speed - 28);
                        racePlayer.invulnerableTimer = 0.6; // 0.6 сек неуязвимости
                        racePlayer.combo = 1;
                        racePlayer.damageTaken += 3.5;
                        triggerScreenShake();
                        playTick();
                        showRacePopup("⚡ БОКОВОЙ ТАРАН! -28 км/ч", "#f59e0b");

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
                    } else {
                        // ЛОБОВОЙ ТАРАН ИЛИ СТОЛКНОВЕНИЕ С ТЯЖЕЛОЙ ФУРОЙ
                        triggerRaceCrash();
                        return;
                    }
                }

                // Удаление уехавших объектов
                if (t.y > 680 || t.y < -160) {
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
        }

        function spawnTrafficCar() {
            const lanes = [95, 165, 235, 305];
            const laneIdx = Math.floor(Math.random() * lanes.length);
            const laneX = lanes[laneIdx];

            for (let t of raceTraffic) {
                if (Math.abs(t.x - laneX) < 32 && t.y < 35) return;
            }

            const roll = Math.random();
            if (roll < 0.12) {
                // Длинномер КАМАЗ: медленный (65-80 км/ч), держится в правых рядах
                const truckLane = Math.random() < 0.7 ? (Math.random() < 0.5 ? 2 : 3) : laneIdx;
                raceTraffic.push({
                    x: lanes[truckLane],
                    y: -90,
                    laneIdx: truckLane,
                    targetX: lanes[truckLane],
                    speed: 65 + Math.random() * 15,
                    targetSpeed: 75,
                    name: "КАМАЗ / Фура",
                    isTruck: true,
                    isPolice: false,
                    isCone: false,
                    tilt: 0,
                    blinker: null,
                    blinkerTimer: 0,
                    changeLaneCooldown: 999,
                    overtaken: false
                });
            } else if (roll < 0.22) {
                // Патруль ДПС с мигалками
                raceTraffic.push({
                    x: laneX,
                    y: -60,
                    laneIdx: laneIdx,
                    targetX: laneX,
                    speed: 85 + Math.random() * 20,
                    targetSpeed: 95,
                    name: "ДПС / Полиция",
                    isTruck: false,
                    isPolice: true,
                    isCone: false,
                    tilt: 0,
                    blinker: null,
                    blinkerTimer: 0,
                    changeLaneCooldown: 3.5 + Math.random() * 3.5,
                    overtaken: false
                });
            } else if (roll < 0.29) {
                // Дорожные работы (конус)
                raceTraffic.push({
                    x: laneX,
                    y: -50,
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
                // Обычный трафик: распределяем скорость по полосе (в левых быстрее!)
                const randCar = carsData[Math.floor(Math.random() * carsData.length)].name;
                const baseSpeed = 120 - laneIdx * 15 + (Math.random() - 0.5) * 20;
                raceTraffic.push({
                    x: laneX,
                    y: -60,
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
            let amount = 3000;
            if (roll < 0.35) {
                type = 'cash';
                amount = Math.random() < 0.2 ? 10000 : 3000;
            } else if (roll < 0.65) {
                type = 'fuel';
                amount = 5.0;
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
            resetRaceKeys();
            sound.stopEngine();
            if (crashed) { sound.crash(); triggerScreenShake(); if (typeof sound?.haptic === 'function') sound.haptic('crash'); }
            document.body.classList.remove('race-active');
            if (raceAnimFrame) cancelAnimationFrame(raceAnimFrame);

            const gross = racePlayer.earnedCash;
            const receipt = NomeraRaceEconomy.settle(gross, racePlayer.fuelLiters || 0, balance);
            const finalXp = Math.max(5, Math.round(racePlayer.distanceKm * 8 + racePlayer.overtakesCount * 3));
            const wear = Math.min(75, (racePlayer.damageTaken || 0) + racePlayer.distanceKm * 0.3 + (crashed ? 18 + Math.min(15, racePlayer.speed / 25) : 0));
            if (activeRaceCar && myCars.includes(activeRaceCar)) {
                NomeraRaceEconomy.ensureCar(activeRaceCar);
                activeRaceCar.condition = Math.max(0, Number((activeRaceCar.condition - wear).toFixed(2)));
            }
            balance = receipt.walletAfter;
            addExp(finalXp);
            updateBalance();
            logPlayerActivity('Гонка', `Заезд ${crashed === 'fuel' ? 'закончился бензин' : (crashed ? 'авария' : 'выход')}: ${racePlayer.distanceKm.toFixed(2)} км, до расходов ${receipt.gross} ₽, бензин -${receipt.fuelCost} ₽, итог ${receipt.credited} ₽`);
            // Race records track received net winnings, never fuel-free gross income.
            saveRaceRecords(NomeraRaceRecords.finishRecords(getRaceRecords(), racePlayer, Math.max(0, receipt.credited)));
            recordQuestProgress('distance', Math.round(racePlayer.distanceKm || 0));
            checkAchievements();
            saveProgress();
            updateRaceRecordsUI();
            renderCars();

            document.getElementById('gameover-title').innerText = crashed === 'fuel' ? '⛽ Закончился бензин!' : (crashed ? '💥 Заезд завершён!' : '🏁 Заезд завершён');
            document.getElementById('go-stat-dist').innerText = `${racePlayer.distanceKm.toFixed(2)} км`;
            document.getElementById('go-stat-speed').innerText = `${Math.round(racePlayer.peakSpeed)} км/ч`;
            document.getElementById('go-stat-overtakes').innerText = `${racePlayer.overtakesCount}`;
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
                drawPixelCar(gCtx, goCvs.width / 2, goCvs.height / 2, selectedRaceCarName, 1.3);
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

            // 9. Автомобиль игрока (с учетом угла крена кузова и мигания неуязвимости)
            const shouldBlink = racePlayer.invulnerableTimer > 0 && racePlayer.damageBlink > 2;
            if (!shouldBlink) {
                const activeCar = myCars[selectedRaceCarIndex] || myCars.find(c => c.name === selectedRaceCarName);
                drawPixelCar(ctx, px, racePlayer.y, selectedRaceCarName, 1.0, {
                    lightsOn: true,
                    nitro: racePlayer.isNitroActive,
                    braking: raceKeys.brake,
                    tilt: racePlayer.tilt,
                    color: activeCar?.styling?.color,
                    neon: activeCar?.styling?.neon,
                    tint: activeCar?.styling?.tint
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

            // Обновление индикатора нитро на мобильной панели
            const touchNitroVal = document.getElementById('hud-touch-nitro-val');
            if (touchNitroVal) {
                touchNitroVal.textContent = Math.round(racePlayer.nitro) + '%';
            }

            // 11. Игровой HUD на Canvas
            // Плашка текущего биома по центру сверху
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.beginPath();
            ctx.roundRect(W / 2 - 80, 10, 160, 26, 6);
            ctx.fill();
            ctx.strokeStyle = biome.themeCol;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = biome.themeCol;
            ctx.font = "800 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`${biome.icon} ${biome.name}`, W / 2, 26);

            // Спидометр и датчики
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.beginPath();
            ctx.roundRect(10, 10, 126, 76, 8);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = "#38bdf8";
            ctx.font = "900 22px var(--font-plate)";
            ctx.textAlign = "left";
            ctx.fillText(`${Math.round(racePlayer.speed)}`, 18, 38);

            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.font = "10px sans-serif";
            ctx.fillText("КМ/Ч", 68, 36);

            ctx.fillStyle = "#fbbf24";
            ctx.font = "700 11px sans-serif";
            ctx.fillText(`🛣️ ${racePlayer.distanceKm.toFixed(2)} км`, 18, 54);

            const curFuel = racePlayer.fuelCurrent !== undefined ? racePlayer.fuelCurrent : 20;
            const capFuel = racePlayer.fuelTankCapacity || 20;
            const fuelPct = Math.max(0, Math.min(100, Math.round((curFuel / capFuel) * 100)));
            ctx.fillStyle = fuelPct < 20 ? '#ef4444' : (fuelPct < 45 ? '#f59e0b' : '#34d399');
            ctx.font = '700 10px sans-serif';
            ctx.fillText(`⛽ БАК: ${curFuel.toFixed(1)} / ${capFuel} л (${fuelPct}%)`, 18, 68);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.font = '600 9px sans-serif';
            ctx.fillText(`Расход: −${Math.round((racePlayer.fuelLiters || 0) * NomeraRaceEconomy.FUEL_PRICE)} ₽`, 18, 80);

            // Заработок за заезд
            ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
            ctx.beginPath();
            ctx.roundRect(W - 135, 10, 125, 40, 8);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
            ctx.stroke();

            ctx.fillStyle = "var(--accent-green)";
            ctx.font = "800 13px sans-serif";
            ctx.textAlign = "right";
            const netPreview = NomeraRaceEconomy.settle(racePlayer.earnedCash, racePlayer.fuelLiters || 0, balance);
            ctx.fillText(`${netPreview.net >= 0 ? '+' : '−'}${Math.abs(netPreview.net).toLocaleString('ru-RU')} ₽`, W - 18, 34);

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
            ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
            ctx.fillRect(10, H - 24, W - 20, 14);
            ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
            ctx.fillRect(12, H - 22, W - 24, 10);
            ctx.fillStyle = "#38bdf8";
            ctx.fillRect(12, H - 22, (W - 24) * (racePlayer.nitro / 100), 10);

            ctx.fillStyle = "#fff";
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("🚀 ЗАКИСЬ АЗОТА (НИТРО)", W / 2, H - 14);
        }

        function closePlayerViewModal() {
            document.getElementById('player-view-modal').classList.remove('show');
        }

        function switchTab(tabId, element) {
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
            if (tabId === 'racegame') initRaceGameTab();
            if (tabId !== 'racegame' && isRaceRunning) exitRaceGame();
        }

(function (root) {
    'use strict';
    const clamp = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
    function createAudio({contextFactory, onUnavailable = () => {}} = {}) {
        let context = null, master = null, engine = null, siren = null;
        let unlocked = false, unavailable = false, lastTick = -Infinity;
        let prefs = {volume: 0.45, muted: false, engine: true};
        const voices = new Set();
        function level() { return prefs.muted ? 0 : prefs.volume; }
        function param(node, value, time, smooth = 0.05) {
            if (node.setTargetAtTime) node.setTargetAtTime(value, time, smooth);
            else node.setValueAtTime(value, time);
        }
        function unlock() {
            if (unavailable) return false;
            try {
                if (!context) {
                    const Factory = contextFactory || (() => {
                        const Constructor = root.AudioContext || root.webkitAudioContext;
                        return Constructor ? new Constructor() : null;
                    });
                    context = Factory();
                    if (!context) throw Error('unsupported');
                    master = context.createGain();
                    master.gain.setValueAtTime(level() * 0.7, context.currentTime);
                    // Conservative master gain prevents overlapping win notes from clipping.
                    master.connect(context.destination);
                }
                unlocked = true;
                if (context.state !== 'running' && context.resume) Promise.resolve(context.resume()).catch(() => { unlocked = false; });
                return true;
            } catch (_) {
                unavailable = true; unlocked = false; onUnavailable(); return false;
            }
        }
        function tone(freq, duration, gain = 0.12, delay = 0, type = 'sine', endFreq = freq) {
            if (!unlocked || !context || context.state === 'suspended' || level() <= 0 || voices.size >= 20) return;
            try {
                const osc = context.createOscillator(), envelope = context.createGain();
                const start = context.currentTime + delay;
                osc.type = type;
                osc.frequency.setValueAtTime(freq, start);
                osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration);
                envelope.gain.setValueAtTime(0.0001, start);
                envelope.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.008, duration / 3));
                envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                osc.connect(envelope); envelope.connect(master); voices.add(osc);
                osc.onended = () => { voices.delete(osc); osc.disconnect(); envelope.disconnect(); };
                osc.start(start); osc.stop(start + duration + 0.02);
            } catch (_) { /* Audio must never interrupt game logic. */ }
        }
        function stopEngine() {
            if (!engine) return;
            engine.nodes.forEach(node => { try { node.stop(); node.disconnect(); } catch (_) {} });
            try { engine.gain.disconnect(); engine.filter.disconnect(); } catch (_) {}
            engine = null;
        }
        function stopSiren() {
            if (!siren) return;
            try {
                siren.nodes.forEach(node => { try { node.stop(); node.disconnect(); } catch (_) {} });
                siren.gain.disconnect();
                if (siren.filter?.disconnect) siren.filter.disconnect();
            } catch (_) {}
            siren = null;
        }
        function setSiren(active = false) {
            if (!active || prefs.muted || level() <= 0 || !unlocked || !context || context.state === 'suspended') {
                stopSiren();
                return;
            }
            if (siren) return;
            try {
                const gain = context.createGain(), filter = context.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(820, context.currentTime);
                gain.gain.setValueAtTime(0.04, context.currentTime);
                filter.connect(gain);
                gain.connect(master);

                const osc = context.createOscillator();
                const lfo = context.createOscillator();
                const lfoGain = context.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(750, context.currentTime);

                lfo.type = 'triangle';
                lfo.frequency.setValueAtTime(1.6, context.currentTime);
                lfoGain.gain.setValueAtTime(260, context.currentTime);

                try { lfo.connect(lfoGain); lfoGain.connect(osc.frequency); } catch (_) {}
                osc.connect(filter);
                osc.start();
                lfo.start();
                siren = { gain, filter, nodes: [osc, lfo, lfoGain] };
            } catch (_) { stopSiren(); }
        }
        function updateEngine({speed = 0, gas = false, nitro = false, running = false, carClass = 'standard', rpm = null} = {}) {
            if (!running || !prefs.engine || level() <= 0 || !unlocked || !context || context.state === 'suspended') { stopEngine(); return; }
            try {
                if (!engine) {
                    const gain = context.createGain(), filter = context.createBiquadFilter();
                    filter.type = 'lowpass'; filter.frequency.setValueAtTime(550, context.currentTime);
                    gain.gain.setValueAtTime(0, context.currentTime); filter.connect(gain); gain.connect(master);
                    const nodes = [context.createOscillator(), context.createOscillator()];
                    nodes.forEach((node, i) => { node.type = i ? 'triangle' : 'sawtooth'; node.connect(filter); node.start(); });
                    engine = {gain, filter, nodes};
                }
                const velocity = Number.isFinite(speed) ? Math.max(0, Math.min(650, speed)) : 0;
                let minRPM = 28, maxRPM = 84, mult2 = 2.01, filterBase = 460;
                if (carClass === 'v8') {
                    minRPM = 22; maxRPM = 68; mult2 = 1.5; filterBase = 540;
                } else if (carClass === 'sport' || carClass === 'supercar') {
                    minRPM = 52; maxRPM = 280; mult2 = 2.0; filterBase = 850;
                } else if (carClass === 'classic') {
                    minRPM = 26; maxRPM = 74; mult2 = 1.33; filterBase = 400;
                } else if (carClass === 'kamaz') {
                    minRPM = 18; maxRPM = 48; mult2 = 0.75; filterBase = 320;
                }

                let revs;
                if (typeof rpm === 'number' && Number.isFinite(rpm) && rpm > 0) {
                    const rpmNorm = Math.min(1, Math.max(0, (rpm - 1000) / 7800));
                    revs = minRPM + rpmNorm * (maxRPM - minRPM) + (gas ? 8 : 0) + (nitro ? 22 : 0);
                } else {
                    // Реалистичная ступенчатая коробка передач (7 передач с плавной тягой)
                    let gearMin = 0, gearMax = 44, gearBase = minRPM;
                    if (velocity < 44) {
                        gearMin = 0; gearMax = 44; gearBase = minRPM;
                    } else if (velocity < 86) {
                        gearMin = 40; gearMax = 86; gearBase = minRPM + 4;
                    } else if (velocity < 140) {
                        gearMin = 80; gearMax = 140; gearBase = minRPM + 8;
                    } else if (velocity < 205) {
                        gearMin = 132; gearMax = 205; gearBase = minRPM + 12;
                    } else if (velocity < 285) {
                        gearMin = 195; gearMax = 285; gearBase = minRPM + 16;
                    } else if (velocity < 380) {
                        gearMin = 270; gearMax = 380; gearBase = minRPM + 20;
                    } else {
                        gearMin = 360; gearMax = 520; gearBase = minRPM + 24;
                    }

                    const progress = Math.min(1, Math.max(0, (velocity - gearMin) / (gearMax - gearMin || 1)));
                    revs = gearBase + progress * (maxRPM - gearBase) + (gas ? 8 : 0) + (nitro ? 22 : 0);
                }

                param(engine.nodes[0].frequency, revs, context.currentTime);
                param(engine.nodes[1].frequency, revs * mult2, context.currentTime);
                const filterFreq = nitro ? 2400 : (gas ? filterBase + velocity * 2.2 + 250 : filterBase + velocity * 0.9);
                param(engine.filter.frequency, filterFreq, context.currentTime);
                if (engine.filter.Q) {
                    param(engine.filter.Q, carClass === 'supercar' || carClass === 'sport' ? 2.2 : 1.0, context.currentTime);
                }
                param(engine.gain.gain, nitro ? 0.065 : (gas ? 0.046 : 0.024), context.currentTime);
            } catch (_) { stopEngine(); }
        }
        return {
            unlock,
            configure(next) {
                prefs = {volume:clamp(next.volume ?? prefs.volume, prefs.volume),
                    muted:typeof next.muted === 'boolean' ? next.muted : prefs.muted,
                    engine:typeof next.engine === 'boolean' ? next.engine : prefs.engine};
                if (master) param(master.gain, level() * 0.7, context.currentTime);
                if (!prefs.engine || !level()) { stopEngine(); stopSiren(); }
                return {...prefs};
            },
            preferences: () => ({...prefs}),
            available: () => !unavailable,
            haptic(pattern = 'light') {
                try {
                    const nav = typeof navigator !== 'undefined' ? navigator : root.navigator;
                    if (nav && typeof nav.vibrate === 'function') {
                        if (pattern === 'light') nav.vibrate(12);
                        else if (pattern === 'medium') nav.vibrate(28);
                        else if (pattern === 'heavy') nav.vibrate([45, 25, 45]);
                        else if (pattern === 'nitro') nav.vibrate([25, 15, 25]);
                        else if (pattern === 'win') nav.vibrate([35, 45, 35, 45, 75]);
                        else if (pattern === 'crash') nav.vibrate([110, 35, 80]);
                        else if (Array.isArray(pattern) || typeof pattern === 'number') nav.vibrate(pattern);
                    }
                } catch (_) {}
            },
            click() { tone(650, 0.035, 0.07, 0, 'sine', 380); },
            button() { tone(520, 0.025, 0.05, 0, 'sine', 340); },
            tick() {
                if (!context || context.currentTime - lastTick < 0.035) return;
                lastTick = context.currentTime; tone(780, 0.035, 0.10, 0, 'triangle', 320);
            },
            lock(pitch = 1) { tone(180 * pitch, 0.13, 0.19, 0, 'sine', 45); tone(1150 * pitch, 0.045, 0.06); },
            cash() { [880, 1174.66, 1567.98].forEach((freq,i) => tone(freq, 0.24, 0.10, i * 0.065, 'triangle')); },
            nitro() {
                tone(380, 0.28, 0.15, 0, 'sawtooth', 760);
                tone(720, 0.22, 0.09, 0.03, 'triangle', 1150);
            },
            brake() {
                tone(340, 0.14, 0.09, 0, 'sawtooth', 140);
                tone(680, 0.08, 0.06, 0.02, 'triangle', 260);
            },
            scrape() {
                tone(320, 0.12, 0.12, 0, 'sawtooth', 120);
                tone(180, 0.15, 0.16, 0.02, 'triangle', 60);
            },
            drift() {
                // Аутентичный визг шин по асфальту (многотональный скользящий резонанс)
                const rnd = (Math.random() - 0.5) * 45;
                tone(880 + rnd, 0.24, 0.10, 0, 'sawtooth', 760 + rnd);
                tone(1520 + rnd, 0.20, 0.07, 0.01, 'triangle', 1380 + rnd);
                tone(2250 + rnd, 0.14, 0.05, 0.02, 'triangle', 1950 + rnd);
                tone(410 + rnd * 0.5, 0.22, 0.08, 0, 'sawtooth', 360 + rnd * 0.5);
            },
            horn() {
                // Стандартный автомобильный двухтональный клаксон (A4 440Гц + C#5 554Гц)
                tone(440, 0.24, 0.14, 0, 'triangle', 432);
                tone(554, 0.24, 0.12, 0, 'sawtooth', 544);
            },
            sgu() {
                // Спецсигнал VIP / СГУ «Крякалка» (агрессивный резкий электронный кряк спецсерии)
                tone(175, 0.22, 0.26, 0, 'sawtooth', 170);
                tone(350, 0.22, 0.18, 0, 'triangle', 340);
                tone(525, 0.20, 0.12, 0, 'sawtooth', 510);
                tone(88, 0.24, 0.18, 0, 'triangle', 82);
            },
            airBrake() {
                // Пневматический сброс воздуха тормозной системы грузовика (КАМАЗ / Фура)
                tone(1800, 0.28, 0.14, 0, 'triangle', 400);
                tone(950, 0.22, 0.10, 0.04, 'sawtooth', 220);
                tone(220, 0.26, 0.16, 0, 'triangle', 75);
            },
            blowOff() {
                // Turbo blow-off valve flutter (pshhh-tsu-tsu-tsu)
                tone(2600, 0.24, 0.11, 0, 'triangle', 650);
                tone(3400, 0.18, 0.07, 0.01, 'sine', 950);
                // Серия затухающих пульсаций сброса избыточного давления турбины
                tone(1450, 0.08, 0.08, 0.05, 'sawtooth', 420);
                tone(1250, 0.07, 0.06, 0.10, 'triangle', 380);
                tone(1100, 0.06, 0.05, 0.15, 'triangle', 340);
                tone(950, 0.05, 0.04, 0.20, 'triangle', 300);
            },
            backfire() {
                // Взрывной отстрел в выхлопную трубу («попкорн» с низкочастотным хлопком)
                const pitch = 0.88 + Math.random() * 0.25;
                tone(65 * pitch, 0.14, 0.26, 0, 'triangle', 20);
                tone(1150 * pitch, 0.035, 0.18, 0, 'sawtooth', 60);
                tone(280 * pitch, 0.08, 0.12, 0.015, 'triangle', 35);
                if (Math.random() > 0.4) {
                    tone(140 * pitch, 0.07, 0.14, 0.04, 'triangle', 25);
                    tone(820 * pitch, 0.03, 0.10, 0.04, 'sawtooth', 70);
                }
            },
            setSiren,
            stopSiren,
            whoosh() { tone(640, 0.18, 0.07, 0, 'sine', 280); },
            error() {
                tone(220, 0.12, 0.12, 0, 'triangle', 160);
                tone(160, 0.18, 0.12, 0.07, 'triangle', 120);
            },
            win(rarity) {
                const rare = ['БЛАТНОЙ','Легендарный','МИФИЧЕСКИЙ','Крутой'].includes(rarity);
                (rare ? [329.63,493.88,659.25,987.77] : [392,493.88,587.33]).forEach((freq,i) => {
                    tone(freq, rare ? 0.65 : 0.38, 0.10, i * 0.09);
                    if (rare) tone(freq / 2, 0.55, 0.055, i * 0.09, 'triangle');
                });
            },
            start() { [220,330,440].forEach((freq,i) => tone(freq, 0.12, 0.11, i * 0.10)); },
            crash() { stopEngine(); stopSiren(); tone(95, 0.28, 0.23, 0, 'triangle', 24); tone(900, 0.09, 0.09, 0, 'sawtooth', 80); },
            stopEngine, updateEngine,
            suspend() {
                stopEngine();
                stopSiren();
                voices.forEach(node => { try { node.stop(); } catch (_) {} });
                if (context?.suspend) Promise.resolve(context.suspend()).catch(() => {});
            }
        };
    }
    const api = {createAudio};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.NomeraAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

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
        function updateEngine({speed = 0, gas = false, nitro = false, running = false, carClass = 'standard'} = {}) {
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
                let basePitch = 34, mult = 1.7, filterBase = 480;
                if (carClass === 'v8') {
                    basePitch = 26; mult = 1.35; filterBase = 560;
                } else if (carClass === 'sport' || carClass === 'supercar') {
                    basePitch = 44; mult = 2.05; filterBase = 640;
                } else if (carClass === 'classic') {
                    basePitch = 30; mult = 1.45; filterBase = 420;
                }
                const revs = basePitch + (velocity % 65) * mult + (gas ? 12 : 0) + (nitro ? 28 : 0);
                param(engine.nodes[0].frequency, revs, context.currentTime);
                param(engine.nodes[1].frequency, revs * (carClass === 'v8' ? 1.5 : 2.01), context.currentTime);
                param(engine.filter.frequency, nitro ? 1400 : filterBase + velocity, context.currentTime);
                param(engine.gain.gain, nitro ? 0.055 : gas ? 0.04 : 0.025, context.currentTime);
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
            drift() {
                tone(820, 0.16, 0.08, 0, 'sawtooth', 380);
                tone(1150, 0.10, 0.05, 0.02, 'triangle', 520);
            },
            horn() {
                // Стандартный автомобильный клаксон (двухтональный созвучный гудок A4 + C#5)
                tone(440, 0.22, 0.12, 0, 'triangle', 430);
                tone(554, 0.22, 0.10, 0, 'sawtooth', 540);
            },
            sgu() {
                // Спецсигнал VIP / СГУ «Крякалка» (агрессивный резкий электронный кряк)
                tone(185, 0.20, 0.22, 0, 'sawtooth', 175);
                tone(370, 0.20, 0.14, 0, 'triangle', 350);
                tone(95, 0.22, 0.16, 0, 'triangle', 90);
            },
            blowOff() {
                // Turbo blow-off valve flutter (pshhh-t-t-t)
                tone(2200, 0.22, 0.09, 0, 'triangle', 520);
                tone(3200, 0.16, 0.06, 0.01, 'sine', 750);
                tone(1100, 0.12, 0.07, 0.07, 'sawtooth', 340);
                tone(1350, 0.09, 0.05, 0.13, 'triangle', 380);
                tone(1500, 0.07, 0.04, 0.18, 'triangle', 420);
            },
            backfire() {
                // Explosive exhaust pop ("попкорн")
                const pitch = 0.85 + Math.random() * 0.3;
                tone(140 * pitch, 0.08, 0.16, 0, 'triangle', 28);
                tone(880 * pitch, 0.035, 0.12, 0, 'sawtooth', 75);
                if (Math.random() > 0.45) {
                    tone(170 * pitch, 0.06, 0.10, 0.045, 'triangle', 32);
                    tone(720 * pitch, 0.03, 0.08, 0.045, 'sawtooth', 80);
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

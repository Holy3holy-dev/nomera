(function (root) {
    'use strict';
    const clamp = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
    function createAudio({contextFactory, onUnavailable = () => {}} = {}) {
        let context = null, master = null, engine = null;
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
        function updateEngine({speed = 0, gas = false, nitro = false, running = false} = {}) {
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
                const revs = 34 + (velocity % 65) * 1.7 + (gas ? 12 : 0) + (nitro ? 28 : 0);
                param(engine.nodes[0].frequency, revs, context.currentTime);
                param(engine.nodes[1].frequency, revs * 2.01, context.currentTime);
                param(engine.filter.frequency, nitro ? 1400 : 480 + velocity, context.currentTime);
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
                if (!prefs.engine || !level()) stopEngine();
                return {...prefs};
            },
            preferences: () => ({...prefs}),
            available: () => !unavailable,
            click() { tone(650, 0.035, 0.07, 0, 'sine', 380); },
            tick() {
                if (!context || context.currentTime - lastTick < 0.035) return;
                lastTick = context.currentTime; tone(780, 0.035, 0.10, 0, 'triangle', 320);
            },
            lock(pitch = 1) { tone(180 * pitch, 0.13, 0.19, 0, 'sine', 45); tone(1150 * pitch, 0.045, 0.06); },
            cash() { [880, 1174.66, 1567.98].forEach((freq,i) => tone(freq, 0.24, 0.10, i * 0.065, 'triangle')); },
            win(rarity) {
                const rare = ['БЛАТНОЙ','Легендарный','МИФИЧЕСКИЙ','Крутой'].includes(rarity);
                (rare ? [329.63,493.88,659.25,987.77] : [392,493.88,587.33]).forEach((freq,i) => {
                    tone(freq, rare ? 0.65 : 0.38, 0.10, i * 0.09);
                    if (rare) tone(freq / 2, 0.55, 0.055, i * 0.09, 'triangle');
                });
            },
            start() { [220,330,440].forEach((freq,i) => tone(freq, 0.12, 0.11, i * 0.10)); },
            crash() { stopEngine(); tone(95, 0.28, 0.23, 0, 'triangle', 24); tone(900, 0.09, 0.09, 0, 'sawtooth', 80); },
            stopEngine, updateEngine,
            suspend() {
                stopEngine();
                voices.forEach(node => { try { node.stop(); } catch (_) {} });
                if (context?.suspend) Promise.resolve(context.suspend()).catch(() => {});
            }
        };
    }
    const api = {createAudio};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.NomeraAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

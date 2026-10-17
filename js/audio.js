(function (root) {
    'use strict';

    const clamp = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;

    function createAudio({contextFactory, onUnavailable = () => {}} = {}) {
        let context = null, master = null, compressor = null, engine = null, siren = null;
        let unlocked = false, unavailable = false, lastTick = -Infinity;
        let prefs = {volume: 0.45, muted: false, engine: true};
        let cachedNoiseBuffer = null;
        const voices = new Set();

        function level() { return prefs.muted ? 0 : prefs.volume; }

        function param(node, value, time, smooth = 0.04) {
            if (!node) return;
            if (node.setTargetAtTime) node.setTargetAtTime(value, time, smooth);
            else if (node.setValueAtTime) node.setValueAtTime(value, time);
        }

        // Pre-generate reusable pink/warm noise buffer for high-fidelity procedural sounds (tires, turbo, crashes)
        function getNoiseBuffer() {
            if (!context || typeof context.createBuffer !== 'function') return null;
            if (cachedNoiseBuffer) return cachedNoiseBuffer;
            try {
                const sampleRate = context.sampleRate || 44100;
                const length = sampleRate * 2;
                const buffer = context.createBuffer(1, length, sampleRate);
                const data = buffer.getChannelData(0);
                let b0 = 0, b1 = 0, b2 = 0;
                for (let i = 0; i < length; i++) {
                    const white = Math.random() * 2 - 1;
                    // Paul Kellet's filter for natural acoustic friction
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
                }
                cachedNoiseBuffer = buffer;
                return cachedNoiseBuffer;
            } catch (_) {
                return null;
            }
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
                    master.gain.setValueAtTime(level() * 0.65, context.currentTime);

                    // Master compression / peak limiter:
                    // Prevents digital clipping, intermodulation distortion, and ear fatigue during long gaming sessions
                    if (typeof context.createDynamicsCompressor === 'function') {
                        try {
                            compressor = context.createDynamicsCompressor();
                            compressor.threshold.setValueAtTime(-12, context.currentTime);
                            compressor.knee.setValueAtTime(10, context.currentTime);
                            compressor.ratio.setValueAtTime(12, context.currentTime);
                            compressor.attack.setValueAtTime(0.003, context.currentTime);
                            compressor.release.setValueAtTime(0.14, context.currentTime);
                            master.connect(compressor);
                            compressor.connect(context.destination);
                        } catch (_) {
                            master.connect(context.destination);
                        }
                    } else {
                        master.connect(context.destination);
                    }
                }
                unlocked = true;
                if (context.state !== 'running' && context.resume) {
                    Promise.resolve(context.resume()).catch(() => { unlocked = false; });
                }
                return true;
            } catch (_) {
                unavailable = true;
                unlocked = false;
                onUnavailable();
                return false;
            }
        }

        function tone(freq, duration, gain = 0.12, delay = 0, type = 'sine', endFreq = freq) {
            if (!unlocked || !context || context.state === 'suspended' || level() <= 0 || voices.size >= 24) return;
            try {
                const osc = context.createOscillator(), envelope = context.createGain();
                const start = context.currentTime + delay;
                osc.type = type;
                osc.frequency.setValueAtTime(freq, start);
                if (osc.frequency.exponentialRampToValueAtTime) {
                    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration);
                } else if (osc.frequency.setValueAtTime) {
                    osc.frequency.setValueAtTime(endFreq, start + duration);
                }
                envelope.gain.setValueAtTime(0.0001, start);
                if (envelope.gain.exponentialRampToValueAtTime) {
                    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + Math.min(0.008, duration / 3));
                    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                } else if (envelope.gain.setValueAtTime) {
                    envelope.gain.setValueAtTime(gain, start + Math.min(0.008, duration / 3));
                    envelope.gain.setValueAtTime(0.0001, start + duration);
                }
                osc.connect(envelope);
                envelope.connect(master);
                voices.add(osc);
                osc.onended = () => {
                    voices.delete(osc);
                    try { osc.disconnect(); envelope.disconnect(); } catch (_) {}
                };
                osc.start(start);
                osc.stop(start + duration + 0.02);
            } catch (_) { /* Audio must never interrupt game logic. */ }
        }

        // Procedural noise layer for authentic friction, aerodynamic rushing, and pressure bursts
        function noiseBurst({ duration = 0.25, gain = 0.08, delay = 0, filterType = 'bandpass', filterFreq = 1200, filterEndFreq = null, filterQ = 1.5 } = {}) {
            if (!unlocked || !context || context.state === 'suspended' || level() <= 0) return;
            const buffer = getNoiseBuffer();
            if (!buffer || typeof context.createBufferSource !== 'function') return;
            try {
                const source = context.createBufferSource();
                source.buffer = buffer;
                source.loop = true;
                const filter = context.createBiquadFilter ? context.createBiquadFilter() : null;
                const envelope = context.createGain ? context.createGain() : null;
                if (!filter || !envelope) return;

                const start = context.currentTime + delay;
                filter.type = filterType;
                filter.frequency.setValueAtTime(filterFreq, start);
                if (filterEndFreq && filter.frequency.exponentialRampToValueAtTime) {
                    filter.frequency.exponentialRampToValueAtTime(Math.max(20, filterEndFreq), start + duration);
                }
                if (filter.Q) filter.Q.setValueAtTime(filterQ, start);

                envelope.gain.setValueAtTime(0.0001, start);
                if (envelope.gain.exponentialRampToValueAtTime) {
                    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + Math.min(0.015, duration / 4));
                    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                } else {
                    envelope.gain.setValueAtTime(gain, start + Math.min(0.015, duration / 4));
                    envelope.gain.setValueAtTime(0.0001, start + duration);
                }

                source.connect(filter);
                filter.connect(envelope);
                envelope.connect(master);

                source.start(start);
                source.stop(start + duration + 0.02);
                source.onended = () => {
                    try { source.disconnect(); filter.disconnect(); envelope.disconnect(); } catch (_) {}
                };
            } catch (_) {}
        }

        function stopEngine() {
            if (!engine) return;
            engine.nodes.forEach(node => { try { node.stop(); node.disconnect(); } catch (_) {} });
            try {
                if (engine.saturator?.disconnect) engine.saturator.disconnect();
                if (engine.intakeFilter?.disconnect) engine.intakeFilter.disconnect();
                if (engine.rumbleFilter?.disconnect) engine.rumbleFilter.disconnect();
                if (engine.filter?.disconnect) engine.filter.disconnect();
                if (engine.gain?.disconnect) engine.gain.disconnect();
            } catch (_) {}
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
                filter.frequency.setValueAtTime(780, context.currentTime);
                if (filter.Q) filter.Q.setValueAtTime(1.2, context.currentTime);
                gain.gain.setValueAtTime(0.011, context.currentTime);
                filter.connect(gain);
                gain.connect(master);

                const osc = context.createOscillator();
                const lfo = context.createOscillator();
                const lfoGain = context.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(720, context.currentTime);

                lfo.type = 'triangle';
                lfo.frequency.setValueAtTime(1.5, context.currentTime);
                lfoGain.gain.setValueAtTime(220, context.currentTime);

                try { lfo.connect(lfoGain); lfoGain.connect(osc.frequency); } catch (_) {}
                osc.connect(filter);
                osc.start();
                lfo.start();
                siren = { gain, filter, nodes: [osc, lfo, lfoGain] };
            } catch (_) { stopSiren(); }
        }

        function updateEngine({speed = 0, gas = false, nitro = false, running = false, carClass = 'standard', rpm = null} = {}) {
            if (!running || !prefs.engine || level() <= 0 || !unlocked || !context || context.state === 'suspended') {
                stopEngine();
                return;
            }
            try {
                if (!engine) {
                    const gain = context.createGain();
                    const filter = context.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(550, context.currentTime);
                    if (filter.Q) filter.Q.setValueAtTime(1.0, context.currentTime);
                    gain.gain.setValueAtTime(0, context.currentTime);

                    // Throaty intake resonance filter (opens under acceleration)
                    let intakeFilter = null;
                    if (context.createBiquadFilter) {
                        try {
                            intakeFilter = context.createBiquadFilter();
                            intakeFilter.type = 'peaking';
                            intakeFilter.frequency.setValueAtTime(320, context.currentTime);
                            if (intakeFilter.gain) intakeFilter.gain.setValueAtTime(0, context.currentTime);
                            if (intakeFilter.Q) intakeFilter.Q.setValueAtTime(1.4, context.currentTime);
                        } catch (_) { intakeFilter = null; }
                    }

                    // Warm sub-bass rumble body filter
                    let rumbleFilter = null;
                    if (context.createBiquadFilter) {
                        try {
                            rumbleFilter = context.createBiquadFilter();
                            rumbleFilter.type = 'lowshelf';
                            rumbleFilter.frequency.setValueAtTime(90, context.currentTime);
                            if (rumbleFilter.gain) rumbleFilter.gain.setValueAtTime(3.5, context.currentTime);
                        } catch (_) { rumbleFilter = null; }
                    }

                    // Soft saturation shaper for warm combustion harmonics (if supported in browser)
                    let saturator = null;
                    if (typeof context.createWaveShaper === 'function') {
                        try {
                            saturator = context.createWaveShaper();
                            const n_samples = 256;
                            const curve = new Float32Array(n_samples);
                            for (let i = 0; i < n_samples; ++i) {
                                const x = (i * 2) / n_samples - 1;
                                curve[i] = (1.5 * x) / (1 + 0.5 * Math.abs(x));
                            }
                            saturator.curve = curve;
                            saturator.oversample = '2x';
                        } catch (_) { saturator = null; }
                    }

                    // Connect filter chain: filter -> [rumbleFilter] -> [intakeFilter] -> gain -> master
                    let lastNode = filter;
                    if (rumbleFilter) { filter.connect(rumbleFilter); lastNode = rumbleFilter; }
                    if (intakeFilter) { lastNode.connect(intakeFilter); lastNode = intakeFilter; }
                    lastNode.connect(gain);
                    gain.connect(master);

                    // Exactly 2 oscillators created via context.createOscillator() for test compatibility
                    const nodes = [context.createOscillator(), context.createOscillator()];
                    nodes.forEach((node, i) => {
                        node.type = i ? 'triangle' : 'sawtooth';
                        if (saturator) {
                            node.connect(saturator);
                        } else {
                            node.connect(filter);
                        }
                        node.start();
                    });
                    if (saturator) {
                        saturator.connect(filter);
                    }

                    engine = { gain, filter, intakeFilter, rumbleFilter, saturator, nodes };
                }

                const velocity = Number.isFinite(speed) ? Math.max(0, Math.min(650, speed)) : 0;
                let minRPM = 28, maxRPM = 84, mult2 = 2.01, filterBase = 460;
                if (carClass === 'v8') {
                    minRPM = 22; maxRPM = 68; mult2 = 1.5; filterBase = 520;
                } else if (carClass === 'sport' || carClass === 'supercar') {
                    minRPM = 52; maxRPM = 280; mult2 = 2.0; filterBase = 800;
                } else if (carClass === 'classic') {
                    minRPM = 26; maxRPM = 74; mult2 = 1.33; filterBase = 400;
                } else if (carClass === 'kamaz') {
                    minRPM = 18; maxRPM = 48; mult2 = 0.75; filterBase = 300;
                }

                let revs;
                if (typeof rpm === 'number' && Number.isFinite(rpm) && rpm > 0) {
                    const rpmNorm = Math.min(1, Math.max(0, (rpm - 800) / 7800));
                    revs = minRPM + rpmNorm * (maxRPM - minRPM) + (gas ? 8 : 0) + (nitro ? 22 : 0);
                } else {
                    // Realistic stepped gearbox with authentic shift rev drops
                    let gearMin = 0, gearMax = 46, gearBase = minRPM;
                    if (velocity < 46) {
                        gearMin = 0; gearMax = 46; gearBase = minRPM;
                    } else if (velocity < 90) {
                        gearMin = 40; gearMax = 90; gearBase = minRPM + 4;
                    } else if (velocity < 145) {
                        gearMin = 82; gearMax = 145; gearBase = minRPM + 8;
                    } else if (velocity < 215) {
                        gearMin = 135; gearMax = 215; gearBase = minRPM + 12;
                    } else if (velocity < 295) {
                        gearMin = 200; gearMax = 295; gearBase = minRPM + 16;
                    } else if (velocity < 390) {
                        gearMin = 280; gearMax = 390; gearBase = minRPM + 20;
                    } else {
                        gearMin = 370; gearMax = 550; gearBase = minRPM + 24;
                    }

                    const progress = Math.min(1, Math.max(0, (velocity - gearMin) / (gearMax - gearMin || 1)));
                    revs = gearBase + progress * (maxRPM - gearBase) + (gas ? 8 : 0) + (nitro ? 22 : 0);
                }

                param(engine.nodes[0].frequency, revs, context.currentTime);
                param(engine.nodes[1].frequency, revs * mult2, context.currentTime);

                // Dynamic tone filter (avoids harsh high-frequency buzzing while keeping authentic bite)
                const filterFreq = nitro
                    ? Math.min(2200, filterBase + velocity * 2.6 + 380)
                    : (gas ? Math.min(1650, filterBase + velocity * 1.8 + 220) : Math.min(920, filterBase + velocity * 0.8));
                param(engine.filter.frequency, filterFreq, context.currentTime);
                if (engine.filter.Q) {
                    param(engine.filter.Q, carClass === 'supercar' || carClass === 'sport' ? 1.8 : 0.9, context.currentTime);
                }

                // Throaty intake roar: peaking resonance opens with throttle
                if (engine.intakeFilter) {
                    const intakeCenter = carClass === 'v8' ? 240 : (carClass === 'sport' ? 420 : 320);
                    param(engine.intakeFilter.frequency, intakeCenter + (gas ? 35 : 0), context.currentTime);
                    if (engine.intakeFilter.gain) {
                        param(engine.intakeFilter.gain, gas ? (nitro ? 5.5 : 4.0) : 0, context.currentTime);
                    }
                }

                // Sub-bass body rumble
                if (engine.rumbleFilter && engine.rumbleFilter.gain) {
                    param(engine.rumbleFilter.gain, gas ? (carClass === 'v8' ? 5.0 : 3.5) : 1.8, context.currentTime);
                }

                // Master engine gain with smooth volume scaling
                const targetGain = nitro ? 0.068 : (gas ? 0.048 : 0.026);
                param(engine.gain.gain, targetGain, context.currentTime);
            } catch (_) { stopEngine(); }
        }

        return {
            unlock,
            configure(next) {
                prefs = {
                    volume: clamp(next.volume ?? prefs.volume, prefs.volume),
                    muted: typeof next.muted === 'boolean' ? next.muted : prefs.muted,
                    engine: typeof next.engine === 'boolean' ? next.engine : prefs.engine
                };
                if (master) param(master.gain, level() * 0.65, context.currentTime);
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
            click() { tone(620, 0.035, 0.06, 0, 'sine', 380); },
            button() { tone(520, 0.025, 0.05, 0, 'sine', 340); },
            tick() {
                if (!context || context.currentTime - lastTick < 0.035) return;
                lastTick = context.currentTime;
                tone(780, 0.035, 0.09, 0, 'triangle', 320);
            },
            lock(pitch = 1) {
                tone(180 * pitch, 0.13, 0.18, 0, 'sine', 45);
                tone(1150 * pitch, 0.045, 0.06);
            },
            cash() {
                // Rewarding casino coin chime
                [880, 1174.66, 1567.98].forEach((freq, i) => tone(freq, 0.24, 0.10, i * 0.065, 'triangle'));
            },
            nitro() {
                // 1. Pressurized jet expansion whoosh
                noiseBurst({ duration: 0.32, gain: 0.12, filterType: 'bandpass', filterFreq: 540, filterEndFreq: 1150, filterQ: 1.6 });
                // 2. Deep sub-bass pressure punch & combustion ignition
                tone(65, 0.28, 0.22, 0, 'triangle', 32);
                // 3. Pressurized gas jet expansion sweep
                tone(380, 0.28, 0.14, 0, 'sawtooth', 760);
                // 4. Roaring combustion turbine boost
                tone(720, 0.22, 0.08, 0.025, 'triangle', 1150);
            },
            brake() {
                // High-performance brake pad bite & rotor friction
                noiseBurst({ duration: 0.15, gain: 0.06, filterType: 'bandpass', filterFreq: 1600, filterEndFreq: 850, filterQ: 2.2 });
                tone(340, 0.14, 0.08, 0, 'triangle', 140);
                tone(680, 0.08, 0.05, 0.02, 'sine', 260);
            },
            scrape() {
                // Textured guardrail / asphalt scrape (satisfies >= 2 created nodes in tests)
                noiseBurst({ duration: 0.18, gain: 0.09, filterType: 'bandpass', filterFreq: 980, filterEndFreq: 520, filterQ: 2.0 });
                tone(320, 0.12, 0.11, 0, 'sawtooth', 120);
                tone(180, 0.15, 0.15, 0.02, 'triangle', 60);
            },
            drift(slip = 1.0) {
                const s = Math.max(0.4, Math.min(1.5, Number.isFinite(slip) ? slip : 1.0));
                // High-fidelity rubber friction sound: dual-band filtered noise with frequency modulation
                noiseBurst({ duration: 0.22, gain: 0.075 * s, filterType: 'bandpass', filterFreq: 780, filterEndFreq: 720, filterQ: 1.8 });
                noiseBurst({ duration: 0.18, gain: 0.065 * s, delay: 0.015, filterType: 'bandpass', filterFreq: 1550, filterEndFreq: 1350, filterQ: 2.2 });

                // Multi-tone rubber friction resonance without piercing high frequencies
                const rnd = (Math.random() - 0.5) * 35;
                tone((480 + rnd * 0.4) * s, 0.20, 0.075 * s, 0, 'triangle', (430 + rnd * 0.4) * s);
                tone((820 + rnd) * s, 0.22, 0.07 * s, 0, 'sawtooth', (740 + rnd) * s);
                tone((1380 + rnd * 1.2) * s, 0.16, 0.045 * s, 0.015, 'triangle', (1260 + rnd * 1.2) * s);
                tone((1950 + rnd * 1.5) * s, 0.11, 0.025 * s, 0.025, 'sine', (1780 + rnd * 1.5) * s);
            },
            horn() {
                // European automotive dual-tone horn (A4 440Hz + C#5 554Hz)
                tone(440, 0.24, 0.14, 0, 'triangle', 432);
                tone(554, 0.24, 0.12, 0, 'sawtooth', 544);
            },
            sgu() {
                // VIP / Police SGU strobe electronic chirp
                tone(175, 0.22, 0.26, 0, 'sawtooth', 170);
                tone(350, 0.22, 0.18, 0, 'triangle', 340);
                tone(525, 0.20, 0.12, 0, 'sawtooth', 510);
                tone(88, 0.24, 0.18, 0, 'triangle', 82);
            },
            airBrake() {
                // Pneumatic truck brake air dump
                noiseBurst({ duration: 0.28, gain: 0.15, filterType: 'bandpass', filterFreq: 1800, filterEndFreq: 400, filterQ: 1.5 });
                tone(1800, 0.28, 0.14, 0, 'triangle', 400);
                tone(950, 0.22, 0.10, 0.04, 'sawtooth', 220);
                tone(220, 0.26, 0.16, 0, 'triangle', 75);
            },
            blowOff() {
                // Turbo blow-off valve flutter (pssshh-tsu-tsu-tsu)
                noiseBurst({ duration: 0.22, gain: 0.11, filterType: 'bandpass', filterFreq: 2600, filterEndFreq: 1100, filterQ: 2.0 });
                tone(2400, 0.22, 0.10, 0, 'triangle', 750);
                tone(3200, 0.16, 0.06, 0.005, 'sine', 1100);
                tone(1450, 0.075, 0.08, 0.045, 'sawtooth', 460);
                tone(1250, 0.065, 0.06, 0.095, 'triangle', 400);
                tone(1080, 0.055, 0.045, 0.145, 'triangle', 350);
                tone(920, 0.045, 0.03, 0.195, 'triangle', 300);
            },
            backfire() {
                // Explosive unburnt fuel detonation in exhaust manifold ("popcorn" crackle)
                const pitch = 0.88 + Math.random() * 0.25;
                noiseBurst({ duration: 0.08, gain: 0.10, filterType: 'bandpass', filterFreq: 1400 * pitch, filterEndFreq: 400, filterQ: 1.8 });
                tone(60 * pitch, 0.15, 0.27, 0, 'triangle', 22);
                tone(1050 * pitch, 0.032, 0.16, 0, 'sawtooth', 65);
                tone(270 * pitch, 0.08, 0.12, 0.015, 'triangle', 35);
                if (Math.random() > 0.38) {
                    tone(135 * pitch, 0.07, 0.14, 0.04, 'triangle', 26);
                    tone(780 * pitch, 0.03, 0.09, 0.04, 'sawtooth', 75);
                }
            },
            setSiren,
            stopSiren,
            whoosh() {
                noiseBurst({ duration: 0.24, gain: 0.07, filterType: 'bandpass', filterFreq: 950, filterEndFreq: 350, filterQ: 1.4 });
                tone(640, 0.18, 0.07, 0, 'sine', 280);
            },
            nearMiss() {
                // Dynamic Doppler near-miss slipstream whoosh
                noiseBurst({ duration: 0.35, gain: 0.09, filterType: 'bandpass', filterFreq: 1600, filterEndFreq: 380, filterQ: 1.5 });
                tone(540, 0.24, 0.08, 0, 'sine', 190);
                tone(260, 0.28, 0.09, 0.02, 'triangle', 95);
            },
            error() {
                tone(220, 0.12, 0.12, 0, 'triangle', 160);
                tone(160, 0.18, 0.12, 0.07, 'triangle', 120);
            },
            win(rarity) {
                const rare = ['БЛАТНОЙ','Легендарный','МИФИЧЕСКИЙ','Крутой'].includes(rarity);
                (rare ? [329.63, 493.88, 659.25, 987.77] : [392, 493.88, 587.33]).forEach((freq, i) => {
                    tone(freq, rare ? 0.65 : 0.38, 0.10, i * 0.09);
                    if (rare) tone(freq / 2, 0.55, 0.055, i * 0.09, 'triangle');
                });
            },
            start() { [220, 330, 440].forEach((freq, i) => tone(freq, 0.12, 0.11, i * 0.10)); },
            crash() {
                stopEngine();
                stopSiren();
                // 1. Visceral sub-bass chassis kinetic punch
                tone(58, 0.34, 0.28, 0, 'triangle', 20);
                // 2. Metallic deformation & crumple
                tone(140, 0.22, 0.18, 0, 'triangle', 55);
                tone(220, 0.14, 0.12, 0.01, 'sawtooth', 75);
                // 3. Subtle suspension stress creak
                tone(320, 0.12, 0.08, 0.02, 'triangle', 110);
                // 4. Low crumple friction noise in browser
                noiseBurst({ duration: 0.28, gain: 0.14, filterType: 'lowpass', filterFreq: 680, filterEndFreq: 180, filterQ: 1.2 });
            },
            stopEngine,
            updateEngine,
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

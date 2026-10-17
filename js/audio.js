(function (root) {
    'use strict';

    const clamp = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;

    function createAudio({contextFactory, onUnavailable = () => {}} = {}) {
        let context = null, master = null, compressor = null, engine = null, siren = null;
        let unlocked = false, unavailable = false, lastTick = -Infinity;
        let prefs = {volume: 0.45, muted: false, engine: true};
        let cachedNoiseBuffer = null;
        const cachedSamples = {};
        const voices = new Set();
        let activeNitroVoices = [];
        let lastNitroTime = -Infinity;
        let lastHandbrakeTime = -Infinity;
        let lastEngineNitroState = false;

        function hasSampleSupport() {
            return Boolean(context && typeof context.createBuffer === 'function' && typeof context.createBufferSource === 'function');
        }

        function playSampleBuffer(buffer, { gain = 0.45, delay = 0, registerNitro = false } = {}) {
            if (!unlocked || !context || context.state === 'suspended' || level() <= 0 || !buffer || !hasSampleSupport() || voices.size >= 64) return null;
            try {
                const source = context.createBufferSource();
                source.buffer = buffer;
                const envelope = context.createGain ? context.createGain() : null;
                if (!envelope) return null;

                const start = context.currentTime + Math.max(0, Number.isFinite(delay) ? delay : 0);
                const duration = buffer.duration || (buffer.length / (buffer.sampleRate || 44100)) || 0.4;
                const targetGain = Number.isFinite(gain) ? Math.max(0.0001, gain) : 0.45;

                envelope.gain.setValueAtTime(targetGain, start);
                if (envelope.gain.setValueAtTime && duration > 0.04) {
                    envelope.gain.setValueAtTime(targetGain, start + Math.max(0.01, duration - 0.025));
                }
                if (envelope.gain.exponentialRampToValueAtTime) {
                    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                } else if (envelope.gain.setValueAtTime) {
                    envelope.gain.setValueAtTime(0.0001, start + duration);
                }

                source.connect(envelope);
                envelope.connect(master);
                voices.add(source);
                source.onended = () => {
                    voices.delete(source);
                    try { source.disconnect(); envelope.disconnect(); } catch (_) {}
                };
                source.start(start);
                if (typeof source.stop === 'function') {
                    source.stop(start + duration + 0.02);
                }
                const voice = { source, envelope };
                if (registerNitro) registerNitroVoice(voice);
                return voice;
            } catch (_) {
                return null;
            }
        }

        // 1. Warm Cinematic Pressurized Air Whoosh + Deep Velvety Sub-Bass Turbine Thrust (0.85s PCM)
        function getNitroRealisticBuffer() {
            if (!hasSampleSupport()) return null;
            const sr = context.sampleRate || 44100;
            const key = 'nitro_' + sr;
            if (cachedSamples[key]) return cachedSamples[key];
            try {
                const duration = 0.85;
                const len = Math.floor(sr * duration);
                const buffer = context.createBuffer(1, len, sr);
                const data = buffer.getChannelData(0);

                let seed = 0x6D2B79F5;
                const rand = () => {
                    seed ^= seed << 13;
                    seed ^= seed >>> 17;
                    seed ^= seed << 5;
                    return ((seed >>> 0) / 4294967296) * 2 - 1;
                };

                // Warm brown/pink noise & cascaded low-pass resonator states (zero high-pitched whistle)
                let pink0 = 0, pink1 = 0, pink2 = 0, brown = 0;
                let lp1 = 0, lp2 = 0;
                let airLp = 0, airBand = 0;
                let finalLp1 = 0, finalLp2 = 0;
                let bassPhase1 = 0, bassPhase2 = 0, subPhase = 0;

                for (let i = 0; i < len; i++) {
                    const t = i / sr;
                    const white = rand();
                    pink0 = 0.99886 * pink0 + white * 0.0555179;
                    pink1 = 0.99332 * pink1 + white * 0.0750759;
                    pink2 = 0.96900 * pink2 + white * 0.1538520;
                    const pink = (pink0 + pink1 + pink2 + white * 0.5362) * 0.25;
                    brown = (brown + 0.045 * white) * 0.965;
                    const warmNoise = pink * 0.65 + brown * 0.35;

                    // Smooth 45ms cosine fade-in and 150ms cosine fade-out (never any click or pop)
                    const attackEnv = t < 0.045
                        ? 0.5 * (1 - Math.cos(Math.PI * (t / 0.045)))
                        : 1.0;
                    const releaseEnv = t > duration - 0.15
                        ? 0.5 * (1 + Math.cos(Math.PI * ((t - (duration - 0.15)) / 0.15)))
                        : 1.0;
                    const masterEnv = attackEnv * releaseEnv;

                    // A. Soft, warm pneumatic pressurized air whoosh ("ФШШШ-УУУХ!")
                    // Gently sweeps 380 Hz -> 620 Hz -> 420 Hz, rolling off everything above 750 Hz
                    const swell = Math.sin(Math.PI * Math.min(1, Math.pow(t / duration, 0.65)));
                    const whooshCutoff = 380 + 240 * swell;
                    const fAir = Math.min(0.45, 2 * Math.sin(Math.PI * whooshCutoff / sr));
                    airLp += fAir * airBand;
                    const airHp = warmNoise - airLp - 0.85 * airBand;
                    airBand += fAir * airHp;

                    // Cascaded 1-pole low-pass filters around 520 Hz for velvety aerodynamic rush
                    const alphaLp = Math.min(0.35, (2 * Math.PI * (420 + 180 * swell)) / sr);
                    lp1 += alphaLp * (warmNoise - lp1);
                    lp2 += alphaLp * (lp1 - lp2);

                    const whooshEnv = (0.72 + 0.28 * Math.exp(-Math.max(0, t - 0.05) * 3.2)) * masterEnv;
                    const airWhoosh = (lp2 * 0.68 + airLp * 0.42 + airBand * 0.28) * whooshEnv * 0.95;

                    // B. Deep, velvety sub-bass turbine & exhaust thrust (48 Hz -> 92 Hz warm swell)
                    const thrustProgress = 1 - Math.exp(-t * 3.6);
                    const fundFreq = 55 + 33 * thrustProgress;
                    const secondHarmFreq = fundFreq * 2.0;
                    const subOctFreq = fundFreq * 0.5 + 20.5; // ~48 Hz -> 64.5 Hz deep chest bass

                    bassPhase1 += (2 * Math.PI * fundFreq) / sr;
                    bassPhase2 += (2 * Math.PI * secondHarmFreq) / sr;
                    subPhase += (2 * Math.PI * subOctFreq) / sr;

                    // Soft initial low-end cushion thump (92 Hz -> 52 Hz) with smooth 25ms attack
                    const cushionEnv = (t < 0.025 ? 0.5 * (1 - Math.cos(Math.PI * (t / 0.025))) : 1) * Math.exp(-t * 7.5);
                    const bassCushion = Math.sin(2 * Math.PI * (92 - 40 * Math.min(1, t / 0.22)) * t) * cushionEnv * 0.28;

                    const rawBass =
                        Math.sin(subPhase) * 0.44 +
                        Math.sin(bassPhase1) * 0.48 +
                        Math.sin(bassPhase2 + 0.35) * 0.18 +
                        bassCushion;

                    // Gentle, warm soft-cosine saturation (zero harsh clipping)
                    const warmBass = (rawBass / (1 + 0.42 * Math.abs(rawBass))) * masterEnv * 0.58;

                    // Final warm low-pass smoothing at 680 Hz so zero high-frequency harshness can escape
                    const rawMix = airWhoosh + warmBass;
                    const finalAlpha = Math.min(0.45, (2 * Math.PI * 680) / sr);
                    finalLp1 += finalAlpha * (rawMix - finalLp1);
                    finalLp2 += finalAlpha * (finalLp1 - finalLp2);

                    data[i] = Math.max(-0.92, Math.min(0.92, finalLp2));
                }

                cachedSamples[key] = buffer;
                return buffer;
            } catch (_) {
                return null;
            }
        }

        // 1b. Soft, Warm Pneumatic Air Release Sigh ("ПШШШ...", 0.42s PCM)
        function getBlowOffFlutterBuffer() {
            if (!hasSampleSupport()) return null;
            const sr = context.sampleRate || 44100;
            const key = 'bov_' + sr;
            if (cachedSamples[key]) return cachedSamples[key];
            try {
                const duration = 0.42;
                const len = Math.floor(sr * duration);
                const buffer = context.createBuffer(1, len, sr);
                const data = buffer.getChannelData(0);

                let seed = 0x9E3779B9;
                const rand = () => {
                    seed ^= seed << 13;
                    seed ^= seed >>> 17;
                    seed ^= seed << 5;
                    return ((seed >>> 0) / 4294967296) * 2 - 1;
                };

                let pink0 = 0, pink1 = 0, pink2 = 0, brown = 0;
                let lpLow = 0, lpBand = 0;
                let postLp1 = 0, postLp2 = 0;
                let bodyPhase = 0;

                for (let i = 0; i < len; i++) {
                    const t = i / sr;
                    const white = rand();
                    pink0 = 0.99886 * pink0 + white * 0.0555179;
                    pink1 = 0.99332 * pink1 + white * 0.0750759;
                    pink2 = 0.96900 * pink2 + white * 0.1538520;
                    const pink = (pink0 + pink1 + pink2 + white * 0.5362) * 0.25;
                    brown = (brown + 0.05 * white) * 0.96;
                    const warmAir = pink * 0.6 + brown * 0.4;

                    // Smooth 22ms cosine fade-in & gentle pneumatic pressure release envelope
                    const attack = t < 0.022 ? 0.5 * (1 - Math.cos(Math.PI * (t / 0.022))) : 1.0;
                    const tail = t > duration - 0.08
                        ? 0.5 * (1 + Math.cos(Math.PI * ((t - (duration - 0.08)) / 0.08)))
                        : 1.0;
                    const gentlePulse = 0.86 + 0.14 * Math.sin(2 * Math.PI * 11.5 * t);
                    const env = attack * tail * Math.exp(-t * 3.8) * gentlePulse;

                    // Soft low-passed pneumatic air vent sweeping 320 Hz -> 140 Hz (zero shrill whistle)
                    const cutoff = 140 + 180 * Math.exp(-t * 5.2);
                    const f = Math.min(0.38, 2 * Math.sin(Math.PI * cutoff / sr));
                    lpLow += f * lpBand;
                    const hp = warmAir - lpLow - 0.9 * lpBand;
                    lpBand += f * hp;

                    // Warm low-frequency pneumatic valve cushion (92 Hz -> 48 Hz soft sine)
                    const bodyFreq = 48 + 44 * Math.exp(-t * 6.0);
                    bodyPhase += (2 * Math.PI * bodyFreq) / sr;
                    const warmBody = Math.sin(bodyPhase) * 0.34;

                    const raw = (lpLow * 1.35 + lpBand * 0.45 + warmBody) * env;
                    const postAlpha = Math.min(0.4, (2 * Math.PI * 480) / sr);
                    postLp1 += postAlpha * (raw - postLp1);
                    postLp2 += postAlpha * (postLp1 - postLp2);

                    data[i] = Math.max(-0.88, Math.min(0.88, postLp2 * 1.15));
                }

                cachedSamples[key] = buffer;
                return buffer;
            } catch (_) {
                return null;
            }
        }

        // 2. Realistic Mechanical Ratchet Lever Pull + Stick-Slip Rubber-on-Asphalt Tire Skid (0.58s PCM)
        function getHandbrakeRealisticBuffer() {
            if (!hasSampleSupport()) return null;
            const sr = context.sampleRate || 44100;
            const key = 'handbrake_' + sr;
            if (cachedSamples[key]) return cachedSamples[key];
            try {
                const duration = 0.58;
                const len = Math.floor(sr * duration);
                const buffer = context.createBuffer(1, len, sr);
                const data = buffer.getChannelData(0);

                let seed = 0x243F6A88;
                const rand = () => {
                    seed ^= seed << 13;
                    seed ^= seed >>> 17;
                    seed ^= seed << 5;
                    return ((seed >>> 0) / 4294967296) * 2 - 1;
                };

                // 4 steel pawl teeth clicks along the ratchet quadrant
                const clickTimes = [0.002, 0.022, 0.046, 0.074];
                const clickPitches = [1.0, 1.08, 1.17, 1.28];

                // 4 formant band-pass filters for tire tread block stick-slip resonances on asphalt
                let f1Low = 0, f1Band = 0;
                let f2Low = 0, f2Band = 0;
                let f3Low = 0, f3Band = 0;
                let f4Low = 0, f4Band = 0;
                let slipPhase = 0, jitterPhase1 = 0, jitterPhase2 = 0;

                for (let i = 0; i < len; i++) {
                    const t = i / sr;
                    const white = rand();

                    // A. 0.00s - 0.095s: Crisp Steel Ratchet Pawl Teeth Clicks & Lever Lock Thud
                    let ratchet = 0;
                    for (let c = 0; c < clickTimes.length; c++) {
                        const dt = t - clickTimes[c];
                        if (dt >= 0 && dt < 0.022) {
                            const p = clickPitches[c];
                            const env = Math.exp(-dt * 280);
                            const metalRing =
                                Math.sin(2 * Math.PI * 1850 * p * dt) * 0.46 +
                                Math.sin(2 * Math.PI * 2420 * p * dt) * 0.34 +
                                Math.sin(2 * Math.PI * 3100 * p * dt) * 0.25 +
                                white * Math.exp(-dt * 520) * 0.5;
                            ratchet += metalRing * env * (c === 3 ? 0.65 : 0.48);
                        }
                    }
                    // Final lever latch lock thud at t = 0.074s
                    if (t >= 0.072 && t < 0.14) {
                        const dt = t - 0.072;
                        ratchet += Math.sin(2 * Math.PI * (190 - 75 * (dt / 0.068)) * dt) * Math.exp(-dt * 55) * 0.38;
                    }

                    // B. 0.065s - 0.58s: Locked Rear Tires Skidding & Biting Asphalt (Stick-Slip Friction)
                    let skidSample = 0;
                    if (t >= 0.062) {
                        const st = t - 0.062;
                        const skidDur = duration - 0.062;
                        const decelDrop = 1 - 0.14 * (st / skidDur);

                        // Micro-slip chaotic relaxation oscillation (rubber tread blocks snapping on macadam)
                        jitterPhase1 += (2 * Math.PI * 45) / sr;
                        jitterPhase2 += (2 * Math.PI * 112) / sr;
                        const microJitter = 1 + 0.055 * Math.sin(jitterPhase1) + 0.035 * Math.cos(jitterPhase2) + 0.04 * white;
                        const stickSlipFundamental = (760 * decelDrop) * microJitter;
                        slipPhase = (slipPhase + stickSlipFundamental / sr) % 1;

                        // Asymmetric stick-slip sawtooth-pulse exciter + road-grit scrubbing noise
                        const stickExciter = (2 * slipPhase - 1) * 0.68 + Math.sin(2 * Math.PI * slipPhase) * 0.35 + white * 0.52;

                        // Vocal-like rubber formant resonators: 740Hz, 1180Hz, 1760Hz, 2520Hz
                        const cf1 = 740 * decelDrop;
                        const cf2 = 1180 * decelDrop;
                        const cf3 = 1760 * decelDrop;
                        const cf4 = 2520 * decelDrop;

                        const k1 = Math.min(0.72, 2 * Math.sin(Math.PI * cf1 / sr));
                        const k2 = Math.min(0.72, 2 * Math.sin(Math.PI * cf2 / sr));
                        const k3 = Math.min(0.72, 2 * Math.sin(Math.PI * cf3 / sr));
                        const k4 = Math.min(0.72, 2 * Math.sin(Math.PI * cf4 / sr));

                        f1Low += k1 * f1Band;
                        f1Band += k1 * (stickExciter - f1Low - 0.11 * f1Band);

                        f2Low += k2 * f2Band;
                        f2Band += k2 * (stickExciter - f2Low - 0.10 * f2Band);

                        f3Low += k3 * f3Band;
                        f3Band += k3 * (stickExciter - f3Low - 0.13 * f3Band);

                        f4Low += k4 * f4Band;
                        f4Band += k4 * (white - f4Low - 0.22 * f4Band);

                        const rawSkid = f1Band * 0.44 + f2Band * 0.38 + f3Band * 0.26 + f4Band * 0.22;
                        const amScrub = 0.84 + 0.16 * Math.sin(jitterPhase1 * 1.3);
                        const skidEnv = Math.min(1, st / 0.018) * (st > skidDur - 0.09 ? Math.max(0, (skidDur - st) / 0.09) : 1);
                        skidSample = Math.tanh(1.95 * rawSkid) * amScrub * skidEnv * 0.56;
                    }

                    data[i] = Math.max(-0.96, Math.min(0.96, ratchet + skidSample));
                }

                cachedSamples[key] = buffer;
                return buffer;
            } catch (_) {
                return null;
            }
        }

        // 3a. Realistic Bosch / Hella Supertone Dual-Diaphragm Brass Trumpet Horn (410 Hz + 495 Hz, 0.48s PCM)
        function getHornRealisticBuffer() {
            if (!hasSampleSupport()) return null;
            const sr = context.sampleRate || 44100;
            const key = 'horn_' + sr;
            if (cachedSamples[key]) return cachedSamples[key];
            try {
                const duration = 0.48;
                const len = Math.floor(sr * duration);
                const buffer = context.createBuffer(1, len, sr);
                const data = buffer.getChannelData(0);

                let seed = 0x13198A2E;
                const rand = () => {
                    seed ^= seed << 13;
                    seed ^= seed >>> 17;
                    seed ^= seed << 5;
                    return ((seed >>> 0) / 4294967296) * 2 - 1;
                };

                // 2.1ms early road/grille reflection delay line for real outdoor acoustic projection
                const combDelay = Math.max(1, Math.floor(sr * 0.0021));
                const combBuf = new Float32Array(combDelay);
                let combIdx = 0;

                let pLow = 0, pHigh = 0, pSub = 0;

                for (let i = 0; i < len; i++) {
                    const t = i / sr;
                    const white = rand();

                    // Initial 6ms electromagnetic relay & steel diaphragm strike transient
                    const relayStrike = t < 0.006
                        ? (Math.sin(2 * Math.PI * 1680 * t) * 0.5 + white * 0.5) * Math.exp(-t * 480) * 0.42
                        : 0;

                    // Natural electromagnetic pressure pitch warm-up over first 12ms
                    const pitchWarmup = 1 - 0.028 * Math.exp(-t * 210);
                    const fLow = 410 * pitchWarmup;
                    const fHigh = 495 * pitchWarmup;

                    pLow += (2 * Math.PI * fLow) / sr;
                    pHigh += (2 * Math.PI * fHigh) / sr;
                    pSub += (2 * Math.PI * (fLow * 0.5)) / sr;

                    // Dual steel diaphragms with rich odd & even harmonic overtones before trumpet flare
                    const diaphragmLow =
                        Math.sin(pLow) * 0.55 +
                        Math.sin(pLow * 2 + 0.2) * 0.28 +
                        Math.sin(pLow * 3 + 0.5) * 0.18 +
                        Math.sin(pLow * 4 + 0.9) * 0.09;
                    const diaphragmHigh =
                        Math.sin(pHigh) * 0.52 +
                        Math.sin(pHigh * 2 + 0.3) * 0.30 +
                        Math.sin(pHigh * 3 + 0.7) * 0.20 +
                        Math.sin(pHigh * 5 + 1.1) * 0.08;
                    const chassisSub = Math.sin(pSub) * 0.22;

                    // Non-linear brass horn flare saturation (generates up to 10th harmonic brass edge)
                    const rawMix = diaphragmLow * 0.56 + diaphragmHigh * 0.54 + chassisSub;
                    const flared = Math.tanh(2.8 * rawMix + 0.22 * rawMix * rawMix);

                    // Short 2.1ms comb reflection off front bumper / asphalt
                    const delayed = combBuf[combIdx];
                    combBuf[combIdx] = flared;
                    combIdx = (combIdx + 1) % combDelay;

                    const env = Math.min(1, t / 0.008) * (t > duration - 0.055 ? Math.max(0, (duration - t) / 0.055) : 1);
                    const sample = relayStrike + (flared * 0.82 + delayed * 0.18) * env * 0.58;
                    data[i] = Math.max(-0.96, Math.min(0.96, sample));
                }

                cachedSamples[key] = buffer;
                return buffer;
            } catch (_) {
                return null;
            }
        }

        // 3b. Authentic Russian ФСО / ДПС VIP SGU «Элина / СГУ-200П Крякалка» Air-Horn & Yelp Tail (0.36s PCM)
        function getSguRealisticBuffer() {
            if (!hasSampleSupport()) return null;
            const sr = context.sampleRate || 44100;
            const key = 'sgu_' + sr;
            if (cachedSamples[key]) return cachedSamples[key];
            try {
                const duration = 0.36;
                const len = Math.floor(sr * duration);
                const buffer = context.createBuffer(1, len, sr);
                const data = buffer.getChannelData(0);

                let carrierPhase = 0;
                let reedPhase = 0;
                let yelpPhase = 0;
                let hornBpLow = 0, hornBpBand = 0;

                for (let i = 0; i < len; i++) {
                    const t = i / sr;
                    let raw = 0;

                    if (t < 0.24) {
                        // Phase 1 (0.00s - 0.24s): Authentic 200W VIP Air-Horn "КРЯ-Я-К!"
                        // 34 Hz hard-clipped reed/pulse train modulating a sweeping 215Hz -> 142Hz -> 188Hz horn fundamental
                        const sweep = t < 0.13
                            ? 215 - (215 - 142) * (t / 0.13)
                            : 142 + (188 - 142) * ((t - 0.13) / 0.11);
                        carrierPhase += (2 * Math.PI * sweep) / sr;
                        reedPhase += (2 * Math.PI * 34) / sr;

                        const reedPulse = Math.tanh(4.2 * Math.sin(reedPhase));
                        const brassHarmonics =
                            Math.sin(carrierPhase) * 0.52 +
                            Math.sin(carrierPhase * 2) * 0.38 +
                            Math.sin(carrierPhase * 3 + 0.25) * 0.30 +
                            Math.sin(carrierPhase * 4 + 0.5) * 0.22 +
                            Math.sin(carrierPhase * 6 + 0.8) * 0.14;

                        // Hard compression-driver diaphragm clipping ("КРЯК")
                        const quackEnv = Math.min(1, t / 0.004) * (t > 0.215 ? (0.24 - t) / 0.025 : 1);
                        raw = Math.tanh(3.5 * brassHarmonics * (0.68 + 0.32 * reedPulse)) * quackEnv;
                    } else {
                        // Phase 2 (0.24s - 0.36s): High-voltage electronic PA yelp chirp tail (1650 Hz -> 880 Hz)
                        const yt = (t - 0.24) / 0.12;
                        const yelpFreq = 1650 * Math.pow(880 / 1650, yt);
                        yelpPhase += (2 * Math.PI * yelpFreq) / sr;
                        const chirpEnv = Math.min(1, (t - 0.24) / 0.006) * Math.max(0, 1 - yt);
                        raw = Math.tanh(2.6 * (Math.sin(yelpPhase) * 0.7 + Math.sin(yelpPhase * 2) * 0.3)) * chirpEnv * 0.78;
                    }

                    // Compression horn speaker throat resonance (~1150 Hz)
                    const f = Math.min(0.75, 2 * Math.sin(Math.PI * 1150 / sr));
                    hornBpLow += f * hornBpBand;
                    const hp = raw - hornBpLow - 0.35 * hornBpBand;
                    hornBpBand += f * hp;

                    const sample = (raw * 0.65 + hornBpBand * 0.45) * 0.62;
                    data[i] = Math.max(-0.96, Math.min(0.96, sample));
                }

                cachedSamples[key] = buffer;
                return buffer;
            } catch (_) {
                return null;
            }
        }

        function stopNitro(smooth = 0.06, playBlowOff = true) {
            if (!context) return;
            const hadActive = activeNitroVoices.length > 0;
            if (hadActive) {
                const now = context.currentTime;
                const fadeTime = Math.max(0.01, Number.isFinite(smooth) ? smooth : 0.06);
                activeNitroVoices.forEach(voice => {
                    try {
                        const env = voice.envelope;
                        if (env && env.gain) {
                            if (env.gain.cancelScheduledValues) {
                                env.gain.cancelScheduledValues(now);
                            }
                            if (env.gain.setTargetAtTime) {
                                env.gain.setTargetAtTime(0.0001, now, Math.max(0.01, fadeTime * 0.5));
                            } else if (env.gain.linearRampToValueAtTime) {
                                env.gain.linearRampToValueAtTime(0.0001, now + fadeTime);
                            } else if (env.gain.setValueAtTime) {
                                env.gain.setValueAtTime(0.0001, now + fadeTime);
                            }
                        }
                        if (voice.osc && typeof voice.osc.stop === 'function') {
                            try { voice.osc.stop(now + fadeTime + 0.02); } catch (_) {}
                            voices.delete(voice.osc);
                        }
                        if (voice.source && typeof voice.source.stop === 'function') {
                            try { voice.source.stop(now + fadeTime + 0.02); } catch (_) {}
                            voices.delete(voice.source);
                        }
                    } catch (_) {}
                });
                activeNitroVoices = [];
                lastNitroTime = -Infinity;

                if (playBlowOff && unlocked && context.state !== 'suspended' && level() > 0) {
                    const useSample = hasSampleSupport();
                    if (useSample) {
                        playSampleBuffer(getBlowOffFlutterBuffer(), { gain: 0.36 });
                    }
                    const oscScale = useSample ? 0.35 : 1.0;
                    // Soft, warm low-passed pneumatic air release ("ПШШШ...") without shrill high frequencies
                    noiseBurst({
                        duration: 0.24,
                        gain: 0.045 * oscScale,
                        filterType: 'lowpass',
                        filterFreq: 320,
                        filterEndFreq: 140,
                        filterQ: 0.7
                    });
                    tone(2100, 0.11, 0.0002, 0, 'sine', 720);
                    tone(1420, 0.07, 0.0002, 0.02, 'sine', 480);
                }
            }
        }

        function registerNitroVoice(voice) {
            if (!voice) return;
            activeNitroVoices.push(voice);
            const cleanup = () => {
                const idx = activeNitroVoices.indexOf(voice);
                if (idx !== -1) activeNitroVoices.splice(idx, 1);
            };
            if (voice.osc) {
                const prevOnEnded = voice.osc.onended;
                voice.osc.onended = (e) => {
                    cleanup();
                    if (typeof prevOnEnded === 'function') prevOnEnded(e);
                };
            } else if (voice.source) {
                const prevOnEnded = voice.source.onended;
                voice.source.onended = (e) => {
                    cleanup();
                    if (typeof prevOnEnded === 'function') prevOnEnded(e);
                };
            }
        }

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
                if (context.state !== 'running' && typeof context.resume === 'function') {
                    Promise.resolve(context.resume()).catch(() => {});
                }
                return true;
            } catch (_) {
                unavailable = true;
                unlocked = false;
                onUnavailable();
                return false;
            }
        }

        function tone(freq, duration, gain = 0.12, delay = 0, type = 'sine', endFreq = freq, filterFreq = null) {
            if (!unlocked || !context || context.state === 'suspended' || level() <= 0 || voices.size >= 64) return null;
            duration = Math.max(0.01, Number.isFinite(duration) ? duration : 0.1);
            freq = Math.max(20, Number.isFinite(freq) ? freq : 440);
            endFreq = Math.max(1, Number.isFinite(endFreq) ? endFreq : freq);
            delay = Math.max(0, Number.isFinite(delay) ? delay : 0);
            gain = Number.isFinite(gain) ? Math.max(0.0001, gain) : 0.12;
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
                const attackTime = Math.min(0.018, duration / 3);
                if (envelope.gain.exponentialRampToValueAtTime) {
                    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + attackTime);
                    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                } else if (envelope.gain.setValueAtTime) {
                    envelope.gain.setValueAtTime(gain, start + attackTime);
                    envelope.gain.setValueAtTime(0.0001, start + duration);
                }
                let filter = null;
                if (Number.isFinite(filterFreq) && filterFreq > 0 && typeof context.createBiquadFilter === 'function') {
                    filter = context.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(filterFreq, start);
                    if (filter.Q) filter.Q.setValueAtTime(0.7, start);
                    osc.connect(filter);
                    filter.connect(envelope);
                } else {
                    osc.connect(envelope);
                }
                envelope.connect(master);
                voices.add(osc);
                osc.onended = () => {
                    voices.delete(osc);
                    try { osc.disconnect(); if (filter) filter.disconnect(); envelope.disconnect(); } catch (_) {}
                };
                osc.start(start);
                osc.stop(start + duration + 0.02);
                return { osc, envelope, filter };
            } catch (_) {
                /* Audio must never interrupt game logic. */
                return null;
            }
        }

        // Procedural noise layer for authentic friction, aerodynamic rushing, and pressure bursts
        function noiseBurst({ duration = 0.25, gain = 0.08, delay = 0, filterType = 'bandpass', filterFreq = 1200, filterEndFreq = null, filterQ = 1.5 } = {}) {
            if (!unlocked || !context || context.state === 'suspended' || level() <= 0 || voices.size >= 64) return null;
            duration = Math.max(0.01, Number.isFinite(duration) ? duration : 0.1);
            filterFreq = Math.max(20, Number.isFinite(filterFreq) ? filterFreq : 1000);
            delay = Math.max(0, Number.isFinite(delay) ? delay : 0);
            gain = Number.isFinite(gain) ? Math.max(0.0001, gain) : 0.08;
            const buffer = getNoiseBuffer();
            if (!buffer || typeof context.createBufferSource !== 'function') return null;
            try {
                const source = context.createBufferSource();
                source.buffer = buffer;
                source.loop = true;
                const filter = context.createBiquadFilter ? context.createBiquadFilter() : null;
                const envelope = context.createGain ? context.createGain() : null;
                if (!filter || !envelope) return null;

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

                voices.add(source);
                source.onended = () => {
                    voices.delete(source);
                    try { source.disconnect(); filter.disconnect(); envelope.disconnect(); } catch (_) {}
                };
                source.start(start);
                source.stop(start + duration + 0.02);
                return { source, filter, envelope };
            } catch (_) {
                return null;
            }
        }

        function stopEngine() {
            stopNitro(0.04, false);
            lastEngineNitroState = false;
            if (!engine) return;
            engine.nodes.forEach(node => {
                if (!node) return;
                if (typeof node.stop === 'function') {
                    try { node.stop(); } catch (_) {}
                }
                if (typeof node.disconnect === 'function') {
                    try { node.disconnect(); } catch (_) {}
                }
            });
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
                siren.nodes.forEach(node => {
                    if (!node) return;
                    if (typeof node.stop === 'function') {
                        try { node.stop(); } catch (_) {}
                    }
                    if (typeof node.disconnect === 'function') {
                        try { node.disconnect(); } catch (_) {}
                    }
                });
                if (typeof siren.shaper?.disconnect === 'function') {
                    try { siren.shaper.disconnect(); } catch (_) {}
                }
                if (typeof siren.gain?.disconnect === 'function') {
                    try { siren.gain.disconnect(); } catch (_) {}
                }
                if (typeof siren.filter?.disconnect === 'function') {
                    try { siren.filter.disconnect(); } catch (_) {}
                }
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
                filter.frequency.setValueAtTime(1020, context.currentTime);
                if (filter.Q) filter.Q.setValueAtTime(1.45, context.currentTime);
                gain.gain.setValueAtTime(0.011, context.currentTime);
                filter.connect(gain);
                gain.connect(master);

                const osc = context.createOscillator();
                const lfo = context.createOscillator();
                const lfoGain = context.createGain();

                // Authentic Federal Signal PA300 / Premier Hazard pursuit wail-yelp loudspeaker profile
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(840, context.currentTime);

                lfo.type = 'triangle';
                lfo.frequency.setValueAtTime(1.65, context.currentTime);
                lfoGain.gain.setValueAtTime(320, context.currentTime);

                let shaper = null;
                if (typeof context.createWaveShaper === 'function') {
                    try {
                        shaper = context.createWaveShaper();
                        const curve = new Float32Array(256);
                        for (let i = 0; i < 256; i++) {
                            const x = (i * 2) / 256 - 1;
                            curve[i] = Math.tanh(2.4 * x + 0.15 * x * x);
                        }
                        shaper.curve = curve;
                        shaper.oversample = '2x';
                    } catch (_) { shaper = null; }
                }

                try { lfo.connect(lfoGain); lfoGain.connect(osc.frequency); } catch (_) {}
                if (shaper) {
                    osc.connect(shaper);
                    shaper.connect(filter);
                } else {
                    osc.connect(filter);
                }
                osc.start();
                lfo.start();
                siren = { gain, filter, shaper, nodes: [osc, lfo, lfoGain] };
            } catch (_) { stopSiren(); }
        }

        function updateEngine({speed = 0, gas = false, nitro = false, running = false, carClass = 'standard', rpm = null} = {}) {
            if (!running || !prefs.engine || level() <= 0 || !unlocked || !context || context.state === 'suspended') {
                stopEngine();
                return;
            }
            try {
                // Smooth cutoff when nitro is released / depleted
                if (lastEngineNitroState && !nitro) {
                    stopNitro(0.06, true);
                }
                lastEngineNitroState = !!nitro;

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

                // Dynamic tone filter (avoids harsh high-frequency buzzing while keeping authentic warm body)
                const filterFreq = nitro
                    ? Math.min(1150, filterBase + velocity * 1.4 + 140)
                    : (gas ? Math.min(1450, filterBase + velocity * 1.6 + 180) : Math.min(880, filterBase + velocity * 0.8));
                param(engine.filter.frequency, filterFreq, context.currentTime);
                if (engine.filter.Q) {
                    param(engine.filter.Q, carClass === 'supercar' || carClass === 'sport' ? 1.4 : 0.85, context.currentTime);
                }

                // Throaty intake roar: peaking resonance opens with throttle
                if (engine.intakeFilter) {
                    const intakeCenter = carClass === 'v8' ? 220 : (carClass === 'sport' ? 360 : 280);
                    param(engine.intakeFilter.frequency, intakeCenter + (gas ? 25 : 0), context.currentTime);
                    if (engine.intakeFilter.gain) {
                        param(engine.intakeFilter.gain, gas ? (nitro ? 3.2 : 3.5) : 0, context.currentTime);
                    }
                }

                // Sub-bass body rumble (deepens warmly during nitro)
                if (engine.rumbleFilter && engine.rumbleFilter.gain) {
                    param(engine.rumbleFilter.gain, nitro ? 6.0 : (gas ? (carClass === 'v8' ? 5.0 : 3.5) : 1.8), context.currentTime);
                }

                // Master engine gain with smooth volume scaling
                const targetGain = nitro ? 0.058 : (gas ? 0.048 : 0.026);
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
                if (!prefs.engine || !level()) { stopEngine(); stopSiren(); stopNitro(0.02, false); }
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
            nitro(active = true) {
                if (active === false) {
                    stopNitro(0.06, true);
                    return;
                }
                if (!unlocked || !context || context.state === 'suspended' || level() <= 0) return;

                const now = context.currentTime;
                // Debounce rapid re-triggering during continuous hold (e.g. 3D mode loop)
                if (now - lastNitroTime < 0.22) return;
                lastNitroTime = now;

                // Play warm PCM sample buffer of pressurized air whoosh + deep velvety sub-bass thrust
                const useSample = hasSampleSupport();
                if (useSample) {
                    playSampleBuffer(getNitroRealisticBuffer(), { gain: 0.48, registerNitro: true });
                }
                const oscScale = useSample ? 0.28 : 1.0;

                // 1. SOFT WARM PNEUMATIC PRESSURIZED AIR WHOOSH ("ФШШШ-УУУХ!") ON TRIGGER
                // Warm low-passed pneumatic air release rush (rolls off everything above 380 Hz)
                const purgeSpray = noiseBurst({
                    duration: 0.48,
                    gain: 0.08 * oscScale,
                    filterType: 'lowpass',
                    filterFreq: 380,
                    filterEndFreq: 240,
                    filterQ: 0.7
                });
                registerNitroVoice(purgeSpray);

                // Muted high-frequency valve node (0.0001 gain keeps ear completely free of clicks/whine)
                const purgeSnap = tone(2400, 0.045, 0.0001, 0, 'sine', 820, 280);
                registerNitroVoice(purgeSnap);

                // Warm low-end pressure cushion (108 Hz -> 44 Hz deep sub-bass sine)
                const subPunch = tone(108, 0.36, 0.18 * oscScale, 0, 'sine', 44, 240);
                registerNitroVoice(subPunch);

                // Warm low-mid air cushion (220 Hz -> 68 Hz lowpass-filtered triangle)
                const midPunch = tone(220, 0.22, 0.09 * oscScale, 0, 'triangle', 68, 260);
                registerNitroVoice(midPunch);

                // 2. WARM PNEUMATIC INTAKE AIRFLOW SWELL (high-frequency whistle nodes muted to 0.0001)
                const turboSpool1 = tone(680, 0.62, 0.0001, 0.015, 'sine', 2100, 280);
                registerNitroVoice(turboSpool1);

                const turboSpool2 = tone(1020, 0.58, 0.0001, 0.025, 'sine', 2850, 280);
                registerNitroVoice(turboSpool2);

                // Smooth, low-passed aerodynamic air rush (280 Hz -> 460 Hz warm lowpass)
                const intakeRush = noiseBurst({
                    duration: 0.62,
                    gain: 0.09 * oscScale,
                    delay: 0.02,
                    filterType: 'lowpass',
                    filterFreq: 280,
                    filterEndFreq: 460,
                    filterQ: 0.7
                });
                registerNitroVoice(intakeRush);

                // 3. DEEP VELVETY SUB-BASS TURBINE & EXHAUST THRUST (54 Hz -> 224 Hz warm lowpass-filtered sine/triangle)
                // Deep sub-bass thrust fundamental (54 Hz -> 72 Hz pure warm sine)
                const afterburner = tone(54, 0.74, 0.18 * oscScale, 0.01, 'sine', 72, 220);
                registerNitroVoice(afterburner);

                // Warm bass body harmonic (118 Hz -> 156 Hz triangle routed through 280 Hz lowpass)
                const exhaustGrowl = tone(118, 0.68, 0.11 * oscScale, 0.015, 'triangle', 156, 280);
                registerNitroVoice(exhaustGrowl);

                // Soft upper-bass air resonance (168 Hz -> 224 Hz sine routed through 280 Hz lowpass)
                const airExpansion = tone(168, 0.64, 0.08 * oscScale, 0.02, 'sine', 224, 280);
                registerNitroVoice(airExpansion);
            },
            stopNitro(smooth = 0.06) { stopNitro(smooth, true); },
            brake() {
                // High-performance brake pad bite & rotor friction
                noiseBurst({ duration: 0.16, gain: 0.08, filterType: 'bandpass', filterFreq: 1750, filterEndFreq: 900, filterQ: 2.2 });
                tone(360, 0.14, 0.09, 0, 'triangle', 160);
                tone(720, 0.09, 0.06, 0.015, 'sine', 280);
                tone(180, 0.15, 0.07, 0.01, 'triangle', 75);
            },
            handbrake() {
                if (!unlocked || !context || context.state === 'suspended' || level() <= 0) return;
                const now = context.currentTime;
                // Debounce rapid re-triggering within 250ms
                if (now - lastHandbrakeTime < 0.25) return;
                lastHandbrakeTime = now;

                // Play high-resolution PCM sample of steel ratchet pawl clicks + stick-slip rubber tire skid on asphalt
                const useSample = hasSampleSupport();
                if (useSample) {
                    playSampleBuffer(getHandbrakeRealisticBuffer(), { gain: 0.50 });
                }
                const oscScale = useSample ? 0.26 : 1.0;

                // 1. AUDIBLE MECHANICAL CABLE RATCHET ENGAGEMENT CLICK-CLACK ("krr-chk!")
                // Tooth 1 click (initial pull tension)
                tone(1350, 0.022, 0.11 * oscScale, 0, 'triangle', 920);
                // Tooth 2 click (cable ratchet slide)
                tone(1620, 0.024, 0.13 * oscScale, 0.024, 'triangle', 1100);
                // Pawl solid mechanical lock latch ("-chk!")
                tone(2150, 0.038, 0.15 * oscScale, 0.052, 'triangle', 780);
                tone(420, 0.048, 0.14 * oscScale, 0.054, 'sawtooth', 160); // metallic chassis latch thud
                // Metallic cable tension ping
                tone(860, 0.065, 0.09 * oscScale, 0.058, 'sine', 380);

                // Mechanical ratchet friction noise
                noiseBurst({
                    duration: 0.065,
                    gain: 0.09 * oscScale,
                    filterType: 'bandpass',
                    filterFreq: 2600,
                    filterEndFreq: 1400,
                    filterQ: 2.2
                });

                // 2. ASPHALT TIRE FRICTION BITE / SCREECH ("skrrr-eech!")
                // Calipers clamp rear axle, instantly biting asphalt (~0.068s delay)
                const delay = 0.068;

                // Deep asphalt rubber friction grain
                noiseBurst({
                    duration: 0.34,
                    gain: 0.13 * oscScale,
                    delay,
                    filterType: 'bandpass',
                    filterFreq: 1100,
                    filterEndFreq: 750,
                    filterQ: 1.8
                });

                // High friction asphalt bite screech
                noiseBurst({
                    duration: 0.28,
                    gain: 0.10 * oscScale,
                    delay: delay + 0.015,
                    filterType: 'bandpass',
                    filterFreq: 2100,
                    filterEndFreq: 1550,
                    filterQ: 2.4
                });

                // Tonal rubber shear resonance (violent asphalt friction slide)
                tone(820, 0.28, 0.11 * oscScale, delay, 'sawtooth', 660);
                tone(1380, 0.22, 0.07 * oscScale, delay + 0.012, 'triangle', 1120);
                tone(460, 0.30, 0.10 * oscScale, delay, 'triangle', 280);
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
            horn(options = {}) {
                if (options === 'sgu' || options?.sgu) {
                    this.sgu();
                    return;
                }
                if (options === 'truck' || options?.truck) {
                    this.airBrake();
                    return;
                }
                if (!unlocked || !context || context.state === 'suspended' || level() <= 0) return;

                // Play high-resolution PCM sample of Bosch / Hella Supertone dual-diaphragm trumpet horn
                const useSample = hasSampleSupport();
                if (useSample) {
                    playSampleBuffer(getHornRealisticBuffer(), { gain: 0.48 });
                }
                const oscScale = useSample ? 0.28 : 1.0;

                // Rich, authentic automotive dual-tone horn (Hella-style dual tone ~410 Hz & 495 Hz with warm chassis body resonance)
                // 1. Diaphragm electrical contact bite transient
                noiseBurst({
                    duration: 0.05,
                    gain: 0.07 * oscScale,
                    filterType: 'bandpass',
                    filterFreq: 1450,
                    filterEndFreq: 950,
                    filterQ: 2.0
                });

                // 2. Warm chassis body sub-resonance (~205 Hz, octave sub-harmonic)
                tone(205, 0.28, 0.10 * oscScale, 0, 'triangle', 202);

                // 3. Low tone fundamental (~410 Hz) - rich body
                tone(410, 0.28, 0.18 * oscScale, 0, 'triangle', 407);

                // 4. High tone fundamental (~495 Hz) - brass horn trumpet bite
                tone(495, 0.28, 0.16 * oscScale, 0, 'sawtooth', 491);

                // 5. 2nd harmonics for brass acoustic richness
                tone(820, 0.24, 0.07 * oscScale, 0.005, 'triangle', 814);
                tone(990, 0.24, 0.06 * oscScale, 0.005, 'sine', 982);
            },
            sgu() {
                if (!unlocked || !context || context.state === 'suspended' || level() <= 0) return;
                // Play high-resolution PCM sample of Russian ФСО / ДПС VIP «Элина / СГУ-200П Крякалка»
                const useSample = hasSampleSupport();
                if (useSample) {
                    playSampleBuffer(getSguRealisticBuffer(), { gain: 0.52 });
                }
                const oscScale = useSample ? 0.28 : 1.0;

                // VIP / Police SGU strobe electronic spec-wail / airhorn chirp
                tone(175, 0.22, 0.26 * oscScale, 0, 'sawtooth', 170);
                tone(350, 0.22, 0.18 * oscScale, 0, 'triangle', 340);
                tone(525, 0.20, 0.12 * oscScale, 0, 'sawtooth', 510);
                tone(700, 0.18, 0.08 * oscScale, 0.01, 'triangle', 680);
                tone(88, 0.24, 0.18 * oscScale, 0, 'triangle', 82);
                noiseBurst({ duration: 0.18, gain: 0.10 * oscScale, filterType: 'bandpass', filterFreq: 1850, filterEndFreq: 920, filterQ: 1.8 });
            },
            airBrake() {
                // Pneumatic truck brake air dump
                noiseBurst({ duration: 0.28, gain: 0.15, filterType: 'bandpass', filterFreq: 1800, filterEndFreq: 400, filterQ: 1.5 });
                tone(1800, 0.28, 0.14, 0, 'triangle', 400);
                tone(950, 0.22, 0.10, 0.04, 'sawtooth', 220);
                tone(220, 0.26, 0.16, 0, 'triangle', 75);
            },
            blowOff() {
                // Soft, warm pneumatic air release ("ПШШШ...")
                const useSample = hasSampleSupport();
                if (useSample) {
                    playSampleBuffer(getBlowOffFlutterBuffer(), { gain: 0.38 });
                }
                const oscScale = useSample ? 0.32 : 1.0;
                noiseBurst({ duration: 0.24, gain: 0.05 * oscScale, filterType: 'lowpass', filterFreq: 320, filterEndFreq: 140, filterQ: 0.7 });
                tone(2400, 0.22, 0.0002, 0, 'sine', 750);
                tone(3200, 0.16, 0.0002, 0.005, 'sine', 1100);
                tone(1450, 0.075, 0.0002, 0.045, 'sine', 460);
                tone(1250, 0.065, 0.0002, 0.095, 'sine', 400);
                tone(1080, 0.055, 0.0002, 0.145, 'sine', 350);
                tone(920, 0.045, 0.0002, 0.195, 'sine', 300);
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
                stopNitro(0.02, false);
                stopEngine();
                stopSiren();
                voices.forEach(node => {
                    if (typeof node?.stop === 'function') {
                        try { node.stop(); } catch (_) {}
                    }
                    if (typeof node?.disconnect === 'function') {
                        try { node.disconnect(); } catch (_) {}
                    }
                });
                voices.clear();
                if (context?.suspend) Promise.resolve(context.suspend()).catch(() => {});
            }
        };
    }

    const api = {createAudio};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.NomeraAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

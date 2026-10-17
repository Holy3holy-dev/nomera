const test = require('node:test');
const assert = require('node:assert/strict');
const {createAudio} = require('../js/audio.js');
function fakeContext() {
    const context = {currentTime:1,state:'running',destination:{},created:[],suspended:0};
    const parameter = () => ({values:[],setValueAtTime(v){this.values.push(v);},setTargetAtTime(v){this.values.push(v);},exponentialRampToValueAtTime(v){this.values.push(v);}});
    const node = () => ({gain:parameter(),frequency:parameter(),connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}});
    context.createGain = node; context.createBiquadFilter = node;
    context.createOscillator = () => {const result=node();context.created.push(result);return result;};
    context.suspend = () => {context.suspended++;context.state='suspended';return Promise.resolve();};
    context.resume = () => {context.state='running';return Promise.resolve();};
    return context;
}
test('sound is lazy and silent until a user gesture unlocks it', () => {
    const context=fakeContext();let calls=0;
    const sound=createAudio({contextFactory:()=>{calls++;return context;}});
    sound.cash();sound.updateEngine({running:true,speed:200});assert.equal(calls,0);
    sound.unlock();sound.cash();assert.equal(calls,1);assert.equal(context.created.length,3);
});
test('audio unavailability never interrupts gameplay or repeatedly retries',()=>{
    let attempts=0,notifications=0;
    const sound=createAudio({contextFactory:()=>{attempts++;throw Error('unavailable');},onUnavailable:()=>notifications++});
    assert.equal(sound.unlock(),false);sound.unlock();sound.cash();sound.crash();sound.updateEngine({running:true});
    assert.equal(attempts,1);assert.equal(notifications,1);assert.equal(sound.available(),false);
});
test('mute and engine preference release continuous engine nodes immediately',()=>{
    const context=fakeContext();const sound=createAudio({contextFactory:()=>context});sound.unlock();
    sound.updateEngine({running:true,speed:150,gas:true});const initial=context.created.slice();assert.equal(initial.length,2);
    sound.configure({muted:true});assert(initial.every(node=>node.stopped));
    const count=context.created.length;sound.win('Легендарный');sound.updateEngine({running:true});assert.equal(context.created.length,count);
    sound.configure({muted:false,engine:false});sound.updateEngine({running:true});assert.equal(context.created.length,count);
});
test('engine pitch responds to speed and nitro without creating nodes per frame',()=>{
    const context=fakeContext();const sound=createAudio({contextFactory:()=>context});sound.unlock();
    sound.updateEngine({running:true,speed:5});const base=context.created[0].frequency.values.at(-1);
    sound.updateEngine({running:true,speed:35,gas:true,nitro:true});assert(context.created[0].frequency.values.at(-1)>base);
    for(let i=0;i<100;i++)sound.updateEngine({running:true,speed:40});assert.equal(context.created.length,2);
    sound.updateEngine({running:false});assert(context.created.every(node=>node.stopped));
});
test('background suspension stops engine and active notes; volume is bounded',async()=>{
    const context=fakeContext();const sound=createAudio({contextFactory:()=>context});sound.unlock();
    assert.equal(sound.configure({volume:20}).volume,1);assert.equal(sound.configure({volume:-1}).volume,0);
    sound.configure({volume:.5});sound.cash();sound.updateEngine({running:true});sound.suspend();
    assert(context.created.every(node=>node.stopped));assert.equal(context.suspended,1);
    sound.unlock();await Promise.resolve();assert.equal(context.state,'running');
});
test('new audio tones and haptics trigger gracefully and create expected nodes',()=>{
    const context=fakeContext();const sound=createAudio({contextFactory:()=>context});sound.unlock();
    const vibrateCalled = [];
    const origNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { value: { vibrate: (p) => vibrateCalled.push(p) }, configurable: true, writable: true });
    sound.button();
    sound.nitro();
    sound.brake();
    sound.whoosh();
    sound.error();
    assert(context.created.length >= 5);
    sound.haptic('light');
    sound.haptic('nitro');
    sound.haptic('crash');
    assert.deepEqual(vibrateCalled, [12, [25, 15, 25], [110, 35, 80]]);
    if (origNav) Object.defineProperty(globalThis, 'navigator', origNav);
    else delete globalThis.navigator;
});

test('blowOff, backfire, siren, and engine profiles trigger cleanly', () => {
    const context = fakeContext();
    const sound = createAudio({ contextFactory: () => context });
    sound.unlock();
    const beforeCount = context.created.length;
    sound.blowOff();
    sound.backfire();
    assert(context.created.length > beforeCount, 'blowOff and backfire should create audio nodes');

    // Siren
    sound.setSiren(true);
    const sirenNodeCount = context.created.length;
    assert(sirenNodeCount > beforeCount);
    sound.setSiren(false);

    // Engine profiles on clean context
    const ctx2 = fakeContext();
    const sound2 = createAudio({ contextFactory: () => ctx2 });
    sound2.unlock();
    sound2.updateEngine({ running: true, speed: 100, gas: true, carClass: 'v8' });
    const v8Pitch = ctx2.created[0].frequency.values.at(-1);
    sound2.updateEngine({ running: true, speed: 100, gas: true, carClass: 'sport' });
    const sportPitch = ctx2.created[0].frequency.values.at(-1);
    assert(sportPitch > v8Pitch, 'Sport engine profile should rev higher than V8 profile');
    sound2.updateEngine({ running: true, speed: 100, gas: true, carClass: 'kamaz' });
    const kamazPitch = ctx2.created[0].frequency.values.at(-1);
    assert(kamazPitch < v8Pitch, 'KAMAZ diesel engine should have low, heavy rumble');
    sound2.stopEngine();
});

test('airBrake and sgu produce authentic procedural effects', () => {
    const context = fakeContext();
    const sound = createAudio({ contextFactory: () => context });
    sound.unlock();
    const beforeCount = context.created.length;
    sound.airBrake();
    assert(context.created.length >= beforeCount + 3, 'airBrake creates multi-layer pneumatic burst');
    sound.sgu();
    assert(context.created.length >= beforeCount + 6, 'sgu creates multi-harmonic VIP horn burst');
});

test('visceral arcade racing nitro boost produces purge burst, twin-turbo whine, afterburner roar, and clean blow-off release', () => {
    const context = fakeContext();
    const sound = createAudio({ contextFactory: () => context });
    sound.unlock();

    // 1. Trigger nitro
    sound.nitro();
    // 8 harmonic oscillators: purge snap (2400->820Hz), sub-punch (108->44Hz), mid-punch (220->68Hz),
    // primary turbo spool (680->2100Hz), twin-turbo whine (1020->2850Hz),
    // sub-bass afterburner fundamental (54->72Hz), exhaust growl (118->156Hz), air expansion roar (168->224Hz)
    assert.equal(context.created.length, 8, 'nitro should synthesize 8 oscillators for arcade burst, spool, and afterburner roar');

    const purgeSnapOsc = context.created[0];
    const subPunchOsc = context.created[1];
    const midPunchOsc = context.created[2];
    const turbo1Osc = context.created[3];
    const turbo2Osc = context.created[4];
    const afterburnerOsc = context.created[5];
    const exhaustOsc = context.created[6];
    const airExpansionOsc = context.created[7];

    // Purge valve snap
    assert.equal(purgeSnapOsc.frequency.values[0], 2400, 'Purge solenoid snap starts at 2400Hz');
    assert.equal(purgeSnapOsc.frequency.values.at(-1), 820, 'Purge solenoid snap resolves to 820Hz');

    // Visceral detonation punch ("-POW!")
    assert.equal(subPunchOsc.frequency.values[0], 108, 'Visceral detonation punch starts at 108Hz');
    assert.equal(subPunchOsc.frequency.values.at(-1), 44, 'Detonation punch drops into 44Hz deep sub-bass impact');
    assert.equal(midPunchOsc.frequency.values[0], 220, 'Combustion cylinder slam starts at 220Hz');
    assert.equal(midPunchOsc.frequency.values.at(-1), 68, 'Combustion cylinder slam drops to 68Hz');

    // Twin-turbo compressor spool/whine rising rapidly in pitch
    assert.equal(turbo1Osc.frequency.values[0], 680, 'Primary turbo compressor spool starts at 680Hz');
    assert.equal(turbo1Osc.frequency.values.at(-1), 2100, 'Primary turbo compressor spools up aggressively to 2100Hz');
    assert.equal(turbo2Osc.frequency.values[0], 1020, 'Secondary twin-turbo whine starts at 1020Hz');
    assert.equal(turbo2Osc.frequency.values.at(-1), 2850, 'Secondary twin-turbo overtone whines up to 2850Hz');

    // Deep resonant combustion afterburner roar
    assert.equal(afterburnerOsc.frequency.values[0], 54, 'Sub-bass afterburner fundamental starts at 54Hz');
    assert.equal(afterburnerOsc.frequency.values.at(-1), 72, 'Sub-bass afterburner rises under load to 72Hz');
    assert.equal(exhaustOsc.frequency.values[0], 118, 'Saturated exhaust manifold growl starts at 118Hz');
    assert.equal(exhaustOsc.frequency.values.at(-1), 156, 'Saturated exhaust manifold growl accelerates to 156Hz');
    assert.equal(airExpansionOsc.frequency.values[0], 168, 'Throaty air expansion roar starts at 168Hz');
    assert.equal(airExpansionOsc.frequency.values.at(-1), 224, 'Throaty air expansion roar climbs to 224Hz');

    // 2. Rapid re-trigger debounce: repeated calls within 220ms must not stack nodes
    sound.nitro();
    sound.nitro();
    assert.equal(context.created.length, 8, 'Rapid nitro calls within debounce window must not stack oscillators');

    // 3. Smooth cutoff via stopNitro() with clean, crisp blow-off gas release without pops
    assert.equal(typeof sound.stopNitro, 'function', 'stopNitro should be exported');
    sound.stopNitro();
    // 8 nitro nodes + 2 blow-off tones (2100->720Hz and 1420->480Hz)
    assert.equal(context.created.length, 10, 'stopNitro triggers clean blow-off release tones');

    // 4. Smooth cutoff via updateEngine nitro: true -> false transition
    const ctx2 = fakeContext();
    const sound2 = createAudio({ contextFactory: () => ctx2 });
    sound2.unlock();
    sound2.updateEngine({ running: true, speed: 120, gas: true, nitro: true });
    ctx2.currentTime += 0.5;
    sound2.nitro();
    assert.equal(ctx2.created.length, 10, '2 engine + 8 nitro oscillators');
    ctx2.currentTime += 0.1;
    sound2.updateEngine({ running: true, speed: 120, gas: true, nitro: false });
    sound2.stopEngine();
    assert.ok(ctx2.created.slice(0, 2).every(node => node.stopped));
});

test('authentic mechanical handbrake engages ratchet click-clack and asphalt tire friction bite', () => {
    const context = fakeContext();
    const sound = createAudio({ contextFactory: () => context });
    sound.unlock();

    assert.equal(typeof sound.handbrake, 'function', 'handbrake should be exported');
    sound.handbrake();

    // 5 ratchet clicks & lock tones + 3 asphalt friction screech tones = 8 oscillators
    assert.equal(context.created.length, 8, 'handbrake creates mechanical ratchet clicks and asphalt friction screech tones');

    const tooth1 = context.created[0];
    const tooth2 = context.created[1];
    const pawlLock = context.created[2];
    const chassisThud = context.created[3];
    const cablePing = context.created[4];
    const tireShear1 = context.created[5];
    const tireShear2 = context.created[6];
    const asphaltBite = context.created[7];

    // Ratchet click-clack ("krr-chk!")
    assert.equal(tooth1.frequency.values[0], 1350, 'Tooth 1 ratchet click starts at 1350Hz');
    assert.equal(tooth2.frequency.values[0], 1620, 'Tooth 2 ratchet slide click starts at 1620Hz');
    assert.equal(pawlLock.frequency.values[0], 2150, 'Pawl lock latch starts at 2150Hz');
    assert.equal(chassisThud.frequency.values[0], 420, 'Chassis latch thud starts at 420Hz');
    assert.equal(cablePing.frequency.values[0], 860, 'Metallic cable tension ping starts at 860Hz');

    // Asphalt tire friction bite / screech ("skrrr-eech!")
    assert.equal(tireShear1.frequency.values[0], 820, 'Tire friction shear screech starts at 820Hz');
    assert.equal(tireShear1.frequency.values.at(-1), 660, 'Tire friction shear settles into asphalt grip');
    assert.equal(tireShear2.frequency.values[0], 1380, 'Tire friction screech overtone starts at 1380Hz');
    assert.equal(asphaltBite.frequency.values[0], 460, 'Asphalt tire bite tone starts at 460Hz');

    // Debounce within 250ms
    sound.handbrake();
    sound.handbrake();
    assert.equal(context.created.length, 8, 'Rapid handbrake calls within debounce window must not stack oscillators');
});

test('rich authentic automotive dual-tone horn synthesizes Hella-style frequencies with chassis resonance', () => {
    const context = fakeContext();
    const sound = createAudio({ contextFactory: () => context });
    sound.unlock();

    assert.equal(typeof sound.horn, 'function', 'horn should be exported');
    sound.horn();

    // 5 oscillators: chassis resonance (205Hz), low tone (410Hz), high tone (495Hz), low 2nd harmonic (820Hz), high 2nd harmonic (990Hz)
    assert.equal(context.created.length, 5, 'horn synthesizes 5 harmonic and chassis oscillators');

    const chassisRes = context.created[0];
    const lowTone = context.created[1];
    const highTone = context.created[2];
    const lowHarmonic = context.created[3];
    const highHarmonic = context.created[4];

    assert.equal(chassisRes.frequency.values[0], 205, 'Warm chassis body resonance at ~205Hz sub-harmonic');
    assert.equal(lowTone.frequency.values[0], 410, 'Low tone fundamental at ~410Hz (Hella spec)');
    assert.equal(highTone.frequency.values[0], 495, 'High tone fundamental at ~495Hz (Hella spec)');
    assert.equal(lowHarmonic.frequency.values[0], 820, '2nd harmonic of low tone at 820Hz for brass richness');
    assert.equal(highHarmonic.frequency.values[0], 990, '2nd harmonic of high tone at 990Hz for brass edge');

    // Delegation to SGU and AirBrake
    const ctx2 = fakeContext();
    const sound2 = createAudio({ contextFactory: () => ctx2 });
    sound2.unlock();
    sound2.horn({ sgu: true });
    assert.equal(ctx2.created.length, 5, 'horn with sgu flag delegates to SGU');

    const ctx3 = fakeContext();
    const sound3 = createAudio({ contextFactory: () => ctx3 });
    sound3.unlock();
    sound3.horn({ truck: true });
    assert.equal(ctx3.created.length, 3, 'horn with truck flag delegates to airBrake');
});

test('nitro, stopNitro, handbrake, horn, and sgu synthesize and play realistic non-silent PCM AudioBuffers when supported', () => {
    const context = fakeContext();
    context.sampleRate = 44100;
    context.buffers = [];
    context.bufferSources = [];
    context.createBuffer = (channels, length, sampleRate) => {
        const data = new Float32Array(length);
        const buf = {
            numberOfChannels: channels,
            length,
            sampleRate,
            duration: length / sampleRate,
            getChannelData: () => data
        };
        context.buffers.push(buf);
        return buf;
    };
    context.createBufferSource = () => {
        const src = {
            buffer: null,
            loop: false,
            started: false,
            stopped: false,
            connect() {},
            disconnect() {},
            start() { this.started = true; },
            stop() { this.stopped = true; }
        };
        context.bufferSources.push(src);
        return src;
    };

    const sound = createAudio({ contextFactory: () => context });
    sound.unlock();

    const checkPcmSource = (src, label) => {
        assert.ok(src && src.started, `${label} should start a PCM AudioBufferSourceNode`);
        assert.ok(src.buffer, `${label} source should have an AudioBuffer assigned`);
        const samples = src.buffer.getChannelData(0);
        assert.ok(samples.length > 4000, `${label} buffer should have high-resolution sample length`);
        let energy = 0;
        let peak = 0;
        for (let i = 0; i < samples.length; i++) {
            const v = samples[i];
            assert.ok(Number.isFinite(v), `${label} sample at ${i} must be finite`);
            energy += v * v;
            const abs = Math.abs(v);
            if (abs > peak) peak = abs;
        }
        const rms = Math.sqrt(energy / samples.length);
        assert.ok(rms > 0.02 && peak > 0.15 && peak <= 1.0, `${label} PCM waveform must have realistic acoustic RMS (${rms.toFixed(4)}) and peak (${peak.toFixed(4)})`);
    };

    sound.nitro();
    const nitroSampleSrc = context.bufferSources.find(s => !s.loop);
    checkPcmSource(nitroSampleSrc, 'nitro');

    const beforeStopSources = context.bufferSources.length;
    sound.stopNitro();
    const bovSampleSrc = context.bufferSources.slice(beforeStopSources).find(s => !s.loop);
    checkPcmSource(bovSampleSrc, 'stopNitro blow-off flutter');

    const beforeHbSources = context.bufferSources.length;
    sound.handbrake();
    const hbSampleSrc = context.bufferSources.slice(beforeHbSources).find(s => !s.loop);
    checkPcmSource(hbSampleSrc, 'handbrake');

    const beforeHornSources = context.bufferSources.length;
    sound.horn();
    const hornSampleSrc = context.bufferSources.slice(beforeHornSources).find(s => !s.loop);
    checkPcmSource(hornSampleSrc, 'horn');

    const beforeSguSources = context.bufferSources.length;
    sound.sgu();
    const sguSampleSrc = context.bufferSources.slice(beforeSguSources).find(s => !s.loop);
    checkPcmSource(sguSampleSrc, 'sgu');
});




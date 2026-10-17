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

test('redesigned procedural nitro boost produces authentic harmonics and smooth cutoff', () => {
    const context = fakeContext();
    const sound = createAudio({ contextFactory: () => context });
    sound.unlock();

    // 1. Trigger nitro
    sound.nitro();
    // Verify 3 harmonic oscillators are created (combustion punch 74->52Hz, exhaust resonance 98->134Hz, turbo intake 152->218Hz)
    assert.equal(context.created.length, 3, 'nitro should create 3 harmonic combustion and exhaust oscillators');
    const punchOsc = context.created[0];
    const exhaustOsc = context.created[1];
    const turboOsc = context.created[2];

    assert.equal(punchOsc.frequency.values[0], 74, 'Combustion punch starts at solid 74Hz');
    assert.equal(punchOsc.frequency.values.at(-1), 52, 'Combustion punch settles into 52Hz sub-bass without alien sine drops');
    assert.equal(exhaustOsc.frequency.values[0], 98, 'Exhaust resonance starts at warm 98Hz');
    assert.equal(exhaustOsc.frequency.values.at(-1), 134, 'Exhaust resonance rises to 134Hz under acceleration');
    assert.equal(turboOsc.frequency.values[0], 152, 'Turbo intake whoosh starts at 152Hz');
    assert.equal(turboOsc.frequency.values.at(-1), 218, 'Turbo intake whoosh rises smoothly to 218Hz');

    // 2. Rapid re-trigger debounce: repeated calls within 220ms (e.g. 3D loop) must not stack nodes
    sound.nitro();
    sound.nitro();
    assert.equal(context.created.length, 3, 'Rapid nitro calls within debounce window must not stack oscillators');

    // 3. Smooth cutoff via stopNitro() / nitro(false)
    assert.equal(typeof sound.stopNitro, 'function', 'stopNitro should be exported');
    sound.stopNitro();

    // 4. Smooth cutoff via updateEngine nitro: true -> false transition
    const ctx2 = fakeContext();
    const sound2 = createAudio({ contextFactory: () => ctx2 });
    sound2.unlock();
    sound2.updateEngine({ running: true, speed: 120, gas: true, nitro: true });
    ctx2.currentTime += 0.5;
    sound2.nitro();
    assert.equal(ctx2.created.length, 5, '2 engine + 3 nitro oscillators');
    ctx2.currentTime += 0.1;
    sound2.updateEngine({ running: true, speed: 120, gas: true, nitro: false });
    sound2.stopEngine();
    assert.ok(ctx2.created.slice(0, 2).every(node => node.stopped));
});



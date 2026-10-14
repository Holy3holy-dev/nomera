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
    sound2.stopEngine();
});


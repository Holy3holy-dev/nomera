const test=require('node:test');const assert=require('node:assert/strict');
const {formats,sceneScale}=require('../js/plate-presentation.js');
test('National plates retain aspect and relative widths at a common scene scale',()=>{
 for(const width of [288,320,358,740,1000]){
  const scale=sceneScale(width,165);
  assert(formats.RUS.width*scale<=width-27);
  assert(Math.abs(formats.USA.width/formats.USA.height-2)<.001);
  assert(Math.abs(formats.JPN.width/formats.JPN.height-2)<.001);
  assert(formats.USA.width*scale<formats.RUS.width*scale*.6);
  assert(formats.JPN.width*scale<formats.RUS.width*scale*.65);
  assert.equal(formats.KZ.width,formats.RUS.width);
 }
});

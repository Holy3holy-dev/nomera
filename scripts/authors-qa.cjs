'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.NOMERA_PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.NOMERA_PREVIEW_URL || 'http://127.0.0.1:4317/';
const output = process.env.NOMERA_QA_DIR || path.resolve(__dirname,'../work/authors-qa');
fs.mkdirSync(output,{recursive:true});
const results = {viewports:[], interactions:[], errors:[], externalRequests:[],environmentBlockedRequests:[],models:[],consoleErrors:[]};
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const browser = await chromium.launch({channel:process.env.NOMERA_BROWSER_CHANNEL || 'msedge',headless:true});
 try {
  const context = await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',hasTouch:true});
  await context.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith(origin)||url.startsWith('data:')||url.startsWith('blob:')) return route.continue();
    // Local AdGuard injects scripts into Edge outside the application source.
    // Block these too, but report them separately from requests made by the game.
    if(new URL(url).hostname==='local.adguard.org') results.environmentBlockedRequests.push(url);
    else results.externalRequests.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror',e=>results.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')results.consoleErrors.push(m.text().slice(0,200));});
  page.on('response',r=>{if(r.status()>=400)results.consoleErrors.push(`${r.status()} ${r.url()}`);});
  await page.goto(origin);
  await page.waitForFunction(()=>typeof inventory !== 'undefined' && inventory.length>0);
  await page.evaluate(()=>localStorage.setItem('nomera_player_account',JSON.stringify({sentinel:'untouched',balance:12345})));
  const untouched = await page.evaluate(()=>localStorage.getItem('nomera_player_account'));
  const fixture = await page.evaluate(()=>localStorage.getItem(NOMERA_STORAGE_PREFIX+'nomera_player_account'));

  for(const width of [1440,1024,768,430,390,360,320]) {
    const height=width>=768?1000:844;
    await page.setViewportSize({width,height});
    await page.evaluate(fixture=>{localStorage.setItem(NOMERA_STORAGE_PREFIX+'nomera_player_account',fixture);loadProgress();document.querySelector('#h3h-toast-stack').replaceChildren();},fixture);
    const row={width,height,screens:[],countries:[]};
    for(const screen of ['generator','inventory','garage']) {
      await page.evaluate(screen=>{switchTab(screen);window.scrollTo(0,0);},screen);
      if(screen==='garage') await page.waitForFunction(()=>window.garageShowroom?.glbCar?.userData?.carId==='g63' && document.querySelector('#garage-3d-loader').style.display==='none',{timeout:30000});
      await pause(450);
      const bounds=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
      assert(bounds.scroll<=width+1 && bounds.body<=width+1,`${screen} overflow at ${width}: ${JSON.stringify(bounds)}`);
      await page.screenshot({path:path.join(output,`${screen}-${width}.png`),fullPage:true});
      row.screens.push({screen,...bounds});
      if(screen==='generator') {
        for(const country of ['RUS','KZ','USA','UAE','JPN']) {
          await page.locator('#btn-country-'+country).click();await pause(70);
          const box=await page.locator('#plate-box').boundingBox();
          const host=await page.locator('#gen-plate-stage').boundingBox();
          assert(box.x>=host.x-1 && box.x+box.width<=host.x+host.width+1,`${country} plate clipped at ${width}`);
          row.countries.push({country,width:Math.round(box.width)});
        }
        await page.evaluate(()=>selectPlateCountry('RUS',true));
        await page.evaluate(()=>document.querySelector('#h3h-toast-stack').replaceChildren());
      }
    }
    results.viewports.push(row);console.log(`PASS ${width}px: three screens, five country formats`);
  }

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>switchTab('generator'));
  await page.locator('.ae-settings summary').click();
  await page.locator('#turbo-toggle').check();
  // Settle already-earned fixture achievements before measuring the spin charge.
  await page.evaluate(()=>checkAchievements());
  const before = await page.evaluate(()=>({balance,count:inventory.length}));
  await page.locator('#btn-spin-both').click();
  await page.waitForFunction(()=>!isSpinning && !document.querySelector('#btn-save').disabled);
  const rolled = await page.evaluate(()=>({balance,price:calculatePrice()}));
  assert.equal(before.balance-rolled.balance,900,'One spin charges once');
  await page.locator('#btn-save').click();
  await page.evaluate(()=>savePlate());
  assert.equal(await page.evaluate(()=>inventory.length),before.count+1,'Reward saved once');
  assert.equal(await page.evaluate(()=>localStorage.getItem('nomera_player_account')),untouched,'Existing player key untouched');
  await page.reload();await pause(700);
  assert.equal(await page.evaluate(()=>inventory.length),before.count+1,'Inventory survives reload');
  results.interactions.push('Generation debits exactly 900; saving twice creates one plate; reload persists; original player key unchanged');

  await page.evaluate(()=>switchTab('inventory'));await pause(300);
  await page.locator('#inv-search-input').fill('М555');
  await pause(150);assert.equal(await page.locator('#inventory-list .inv-card').count(),1);
  await page.locator('#inventory-list .inv-fav-btn').click();
  assert.equal(await page.evaluate(()=>inventory.find(p=>p.text.includes('М555')).favorite),true);
  await page.locator('#inv-search-input').fill('not-a-plate');
  assert.equal(await page.locator('#inventory-list .inv-card').count(),0);
  await page.locator('#inv-search-input').fill('');
  await page.locator('.ae-collection-filters summary').click();
  await page.locator('#inv-sort-select').selectOption('price_asc');
  const prices=await page.locator('#inventory-list .inv-card-price').allTextContents();
  const numbers=prices.map(t=>Number(t.replace(/[^0-9]/g,'')));
  assert.deepEqual(numbers,[...numbers].sort((a,b)=>a-b));
  await page.locator('#inv-filter-country').selectOption('JPN');
  assert.equal(await page.locator('#inventory-list .inv-card').count(),0);
  await page.locator('#inv-filter-country').selectOption('all');
  await page.locator('.ae-collection-filters summary').click();
  await page.locator('#inventory-list .inv-card').first().click();
  assert(await page.locator('#plate-detail-modal').evaluate(el=>el.classList.contains('show')));
  await page.evaluate(()=>closePlateDetailModal());
  results.interactions.push('Search, no results, favorites, ascending price, country filter and detail modal');

  await page.evaluate(()=>switchTab('garage'));await pause(500);
  for(const index of [0,1,2]) {
    await page.locator('.garage-side-car-item').nth(index).click();
    await page.waitForFunction(()=>window.garageShowroom && document.querySelector('#garage-3d-loader').style.display==='none');
    await pause(300);
    const model = await page.evaluate(()=>{let meshes=0;garageShowroom.glbCar?.traverse(o=>{if(o.isMesh)meshes++;});return {name:garageShowroom.currentCarName,id:garageShowroom.glbCar?.userData.carId,meshes};});
    assert(model.meshes>20,`Actual model loaded: ${model.name}`);
    for(const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:844});
      for(const view of ['3d','front','side','rear','top']) {
        await page.evaluate(v=>garageShowroom.setViewPreset(v,true),view);await pause(60);
        const projection=await page.evaluate(()=>{
          const s=garageShowroom;s.camera.updateMatrixWorld(true);
          return s.modelFrameCorners.map(p=>new THREE.Vector3(p.x,p.y,p.z).project(s.camera)).reduce((m,p)=>({x:Math.max(m.x,Math.abs(p.x)),y:Math.max(m.y,Math.abs(p.y))}),{x:0,y:0});
        });
        assert(projection.x<1 && projection.y<1,`${model.id} ${width} ${view} clipped: ${JSON.stringify(projection)}`);
      }
    }
    results.models.push(model);console.log(`PASS real GLB: ${model.id}, ${model.meshes} meshes, 20 framing combinations`);
  }
  await page.evaluate(()=>{selectGarageCarForPodium(0);switchGarageInspectorTab('tuning');});await pause(500);
  const upgradeBefore=await page.evaluate(()=>({balance,level:myCars[0].upgrades.engine,cost:NomeraRaceEconomy.upgradeCost(myCars[0].basePrice,'engine',myCars[0].upgrades.engine)}));
  await page.locator('#inspector-tuning-box button').first().click();
  assert.equal(await page.evaluate(()=>myCars[0].upgrades.engine),upgradeBefore.level+1);
  assert.equal(await page.evaluate(()=>balance),upgradeBefore.balance-upgradeBefore.cost);
  const sceneBefore=await page.evaluate(()=>{window.__qaScene=garageShowroom;return true;});
  for(let i=0;i<3;i++) await page.evaluate(()=>{switchTab('generator');switchTab('garage');});
  assert(sceneBefore && await page.evaluate(()=>garageShowroom===window.__qaScene),'Showroom instance reused');
  await page.evaluate(()=>switchTab('generator'));await pause(100);
  assert.equal(await page.evaluate(()=>garageShowroom.active),false,'Hidden scene stopped');
  results.interactions.push('Three real GLBs; 60 camera/model/viewport fits; upgrade charges once; showroom reused and stopped when hidden');
  assert.equal(results.errors.length,0,results.errors.join('\n'));
  assert.equal(results.externalRequests.length,0,'No external requests');
  results.success = true;
  results.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({success:true,widths:results.viewports.length,errors:results.errors,externalRequests:results.externalRequests,consoleErrors:[...new Set(results.consoleErrors)]}));
 } finally {await browser.close();}
})().catch(e=>{results.failure=e.stack;fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));console.error(e);process.exitCode=1;});

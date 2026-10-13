const {chromium:pw}=require(process.env.NOMERA_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs');const http=require('node:http');const path=require('node:path');const os=require('node:os');
(async()=>{
 const root=path.join(__dirname,'..');
 const output=process.env.NOMERA_QA_DIR || path.join(os.tmpdir(),'nomera-ui-qa');
 fs.mkdirSync(output,{recursive:true});
 const server=http.createServer((req,res)=>{
  let file=new URL(req.url,'http://localhost').pathname; if(file==='/')file='/index.html';
  const absolute=path.resolve(root,'.'+file);
  if(!absolute.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
  res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');
  try{res.end(fs.readFileSync(absolute));}catch(e){res.statusCode=404;res.end('missing');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port+'/';

 const browser=await pw.launch({executablePath:process.env.NOMERA_CHROMIUM_EXECUTABLE || undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader'],headless:true});
 const reports=[];
 for(const [name,width,height] of [['desktop',1366,1000],['mobile',390,844],['small',320,740]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:name!=='desktop',hasTouch:name!=='desktop',serviceWorkers:'block'});
  await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.evaluate(()=>closeWelcomeModal());
  await page.screenshot({path:path.join(output,'ui-'+name+'.png'),fullPage:true});
  const size=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,tabs:[...document.querySelectorAll('.nav-tab:not(.hidden)')].map(b=>({tab:b.dataset.tab,width:b.getBoundingClientRect().width}))}));
  for(const id of ['inventory','garage','cases','leaderboard','multiplayer','generator']) {
   await page.locator('[data-tab="'+id+'"]').click();
   await page.waitForTimeout(80);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   if(overflow)throw Error(name+' overflow in '+id);
   if(await page.locator('#'+id).evaluate(el=>el.classList.contains('hidden')))throw Error(id+' did not open');
  }
  await page.locator('[data-tab="garage"]').click();
  if(await page.locator('#garage').evaluate(el=>el.classList.contains('hidden')))throw Error('Garage did not open');
  await page.locator('[data-tab="racegame"]').click();
  await page.locator('#btn-start-race').click();
  await page.waitForTimeout(250);
  await page.evaluate(()=>{exitRaceGame();openSettings();});
  await page.locator('#engine-sound').uncheck();
  await page.locator('#sound-muted').check();
  const prefs=await page.evaluate(()=>sound.preferences());
  if(prefs.engine||!prefs.muted)throw Error('Sound settings not applied');
  await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>closeWelcomeModal());
  const restored=await page.evaluate(()=>sound.preferences());
  if(restored.engine||!restored.muted)throw Error('Sound settings not persisted');
  if(errors.length)throw Error(errors.join('; '));
  reports.push({name,size,errors,allTabsChecked:true,audioPreferencesPersisted:true});
  await context.close();
 }
 await browser.close();server.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(reports,null,2));
 console.log(JSON.stringify(reports));
})().catch(e=>{console.error(e);process.exit(1);});

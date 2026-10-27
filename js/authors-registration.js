/* Shared physical formats and serial families for the five playable countries.
 * GOST/Hansen serial fonts; Japanese serials use permitted rendered TRM output.
 * Region-specific labels and KZ/UAE dies are documented approximations. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.NomeraRegistration=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';const formats={RUS:{width:520,height:112,font:'Nomera Registration RU'},KZ:{width:520,height:112,font:'Nomera Registration KZ'},BY:{width:520,height:112,font:'Nomera Registration KZ'},USSR:{width:465,height:112,font:'Nomera Registration RU'},USA:{width:304.8,height:152.4,font:'Nomera Registration US'},JPN:{width:330,height:165,font:'Nomera Registration JP'},UAE:{width:520,height:110,font:'Nomera Registration AE'}};
 const jp={TKY:['品川','330','さ'],YKH:['横浜','300','す'],OSK:['なにわ','330','せ'],NGY:['名古屋','350','そ'],SPR:['札幌','301','た'],FKO:['福岡','330','ち'],KBE:['神戸','302','つ'],KYO:['京都','310','て'],CHB:['千葉','320','と'],STM:['大宮','300','な']};
 const states={CA:['California','dmv.ca.gov','#1b365d'],NY:['NEW YORK','EXCELSIOR','#193957'],FL:['MYFLORIDA.COM','SUNSHINE STATE','#1e6747'],TX:['TEXAS','THE LONE STAR STATE','#171d21'],NV:['NEVADA','HOME MEANS NEVADA','#213d73'],IL:['ILLINOIS','LAND OF LINCOLN','#243c60'],WA:['WASHINGTON','EVERGREEN STATE','#234e6c'],MI:['MICHIGAN','WATER-WINTER WONDERLAND','#e7c263'],GA:['GEORGIA','IN GOD WE TRUST','#28452d'],NJ:['New Jersey','Garden State','#202525']};
 // Selected real design variants for every playable state; game serial identity stays intact.
 const usProfiles={
  CA:{family:'Nomera Registration US',size:67,top:48,ink:'#163e69',paper:'#fafbf8',variant:'Script'},
  NY:{family:'Nomera US East',size:71,top:43,ink:'#183e67',paper:'#fafbf8',variant:'Excelsior'},
  FL:{family:'Nomera US South',size:75,top:40,ink:'#246342',paper:'#fafbf8',variant:'Sunshine State'},
  TX:{family:'Nomera US Texas',size:75,top:40,ink:'#101719',paper:'#fafbf8',variant:'Texas Classic'},
  NV:{family:'Nomera US Texas',size:73,top:42,ink:'#111b24',paper:'#a6cadc',variant:'Home Means Nevada'},
  IL:{family:'Nomera US East',size:69,top:47,ink:'#23446a',paper:'#e4f0f3',variant:'Passenger'},
  WA:{family:'Nomera Registration US',size:72,top:43,ink:'#073c5b',paper:'#fafbf8',variant:'Mount Rainier'},
  MI:{family:'Nomera US Vintage',size:68,top:44,ink:'#f3ce5a',paper:'#153e60',variant:'Water-Winter Wonderland'},
  GA:{family:'Nomera US South',size:75,top:40,ink:'#141a18',paper:'#fafbf8',variant:'Peach / In God We Trust'},
  NJ:{family:'Nomera US East',size:70,top:44,ink:'#171c1a',paper:'#fff2a0',variant:'Garden State'}
 };
 const usImages={};
 function usArt(code){return './assets/registration/us-'+code.toLowerCase()+'.svg';}
 function usImagesReady(){if(!root.Image)return Promise.resolve();return Promise.all(Object.keys(usProfiles).map(code=>new Promise(resolve=>{const img=new root.Image();img.onload=()=>{usImages[code]=img;resolve();};img.onerror=()=>resolve();img.src=usArt(code);})));}
 const emirates={DXB:['DUBAI','دبي'],AUH:['ABU DHABI','أبوظبي'],AD:['ABU DHABI','أبوظبي'],SHJ:['SHARJAH','الشارقة'],AJM:['AJMAN','عجمان'],RAK:['R.A.K.','رأس الخيمة'],FUJ:['FUJAIRAH','الفجيرة'],UAQ:['U.A.Q.','أم القيوين']};
 function japanDigits(value){const raw=String(value||'---');if(/-/.test(raw))return '・---';const d=raw.replace(/\D/g,'').slice(-4).replace(/^0+(?=\d)/,'');return d.length===4?d.slice(0,2)+'-'+d.slice(2):'・'.repeat(4-d.length)+d;}
 function japanMarkup(value){return [...japanDigits(value)].map(c=>/^[0-9]$/.test(c)?'<i class="jp-serial-glyph" data-glyph="'+c+'" style="--jp-glyph:'+(Number(c)*100/9)+'%">'+c+'</i>':'<i class="jp-serial-mark">'+c+'</i>').join('');}
 const regionArt=Object.fromEntries(Object.keys(jp).map(code=>[code,{url:'./assets/registration/jp-'+code.toLowerCase()+'.svg',width:(['OSK','NGY'].includes(code)?179:169),height:40}]));
 const headerImages={};
 function regionalImages(){if(!root.Image)return Promise.resolve();return Promise.all(Object.entries(regionArt).map(([code,art])=>new Promise(resolve=>{const img=new root.Image();img.onload=()=>{headerImages[code]=img;resolve();};img.onerror=()=>resolve();img.src=art.url;})));}
 function japanHeaderMarkup(region,label){const a=regionArt[region];if(!a)return label;return '<b class="jp-regional-header" role="img" aria-label="'+label+'" style="--jp-header-image:url('+a.url+');--jp-header-aspect:'+a.width+'/40">'+label+'</b>';}
 function decorate(board,country,region){const button=root.document?.querySelector('.ae-country-toolbar .btn-region-trigger');if(button){const title=(country==='USA'?'Штат':country==='UAE'?'Эмират':'Регион')+' · '+region;if(button.dataset.regionTitle!==title){button.dataset.regionTitle=title;const label=root.document.createElement('span'),action=root.document.createElement('span');label.textContent=title;action.textContent='Сменить ↗';button.replaceChildren(label,action);button.setAttribute('aria-label',(country==='USA'?'Изменить штат США':'Изменить регион номера')+', текущий '+region);}}board.setAttribute('data-us-state-art',country==='USA'&&!!usProfiles[region]?'true':'false');const physical=formats[country]||formats.RUS;board.style.setProperty('--ae-board-width',physical.width+'px');board.style.setProperty('--ae-board-height',physical.height+'px');const a=country==='JPN'?regionArt[region]:null;board.setAttribute('data-jp-header-art',a?'true':'false');if(a){board.style.setProperty('--jp-header-image','url('+a.url+')');board.style.setProperty('--jp-header-width',a.width+'px');} }
 let ready,jpImage;
 function japanImage(){if(!root.Image||!root.document)return Promise.resolve();return new Promise(resolve=>{const img=new root.Image();img.onload=()=>{const c=root.document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#174d39';x.fillRect(0,0,c.width,c.height);jpImage=c;resolve();};img.onerror=()=>resolve();img.src='./assets/fonts/jp-registration-digits.png';});}

 function fonts(){if(!root.document?.fonts)return Promise.resolve();return ready||(ready=Promise.all([...Object.values(formats).map(f=>'70px "'+f.font+'"'),'600 30px "Nomera Japanese Labels"','600 30px "Nomera Arabic Labels"','30px "Nomera California Title"',...Object.values(usProfiles).map(p=>'75px "'+p.family+'"')].map(f=>root.document.fonts.load(f)).concat(japanImage(),regionalImages(),usImagesReady())));}
 function paint(ctx,comp,{front=true}={}){const country=comp.country||'RUS',f=formats[country]||formats.RUS,w=f.width,h=f.height,region=String(comp.region||''),digits=String(comp.digits||'---'),letters=String(comp.letters||'---'),ink=country==='JPN'?'#174d39':country==='USA'?(states[region]?.[2]||'#193957'):'#151b1e';ctx.save();ctx.setTransform(ctx.canvas.width/w,0,0,ctx.canvas.height/h,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle=country==='USA'&&region==='MI'?'#183d56':'#fafbf6';ctx.fillRect(0,0,w,h);ctx.strokeStyle=country==='JPN'?'#315442':'#3b4449';ctx.lineWidth=1.5;ctx.strokeRect(2,2,w-4,h-4);ctx.fillStyle=ink;ctx.textBaseline='alphabetic';ctx.textAlign='center';
  const text=(value,x,y,size,family=f.font,maxWidth)=>{ctx.font='400 '+size+'px "'+family+'",sans-serif';ctx.fillText(String(value),x,y,maxWidth);};
  if(country==='RUS'){const rw=region.length>2?136:112;ctx.fillRect(w-rw,2,2,h-4);const mainW=w-rw-26,start=18,end=w-rw-13,chars=[letters[0],...digits,letters[1],letters[2]],sizes=[76,76,76,76,76,76];let widths=chars.map((c,i)=>{ctx.font=sizes[i]+'px "'+f.font+'"';return ctx.measureText(c||'-').width;});const gap=(mainW-widths.reduce((a,b)=>a+b,0))/5;let x=start;chars.forEach((c,i)=>{ctx.textAlign='left';text(c||'-',x,90,sizes[i]);x+=widths[i]+gap;});ctx.textAlign='center';text(region,w-rw/2,65,58,f.font,rw-15);text('RUS',w-rw/2-17,102,20);const fx=w-rw/2+13;ctx.fillStyle='#fff';ctx.fillRect(fx,83,30,6);ctx.fillStyle='#2456b8';ctx.fillRect(fx,89,30,6);ctx.fillStyle='#ca343e';ctx.fillRect(fx,95,30,6);ctx.strokeStyle='#79858a';ctx.lineWidth=.5;ctx.strokeRect(fx,83,30,18);}
  else if(country==='KZ'){ctx.fillStyle='#23acc4';ctx.fillRect(13,24,43,25);ctx.fillStyle='#f3d14e';ctx.beginPath();ctx.arc(36,35,6,0,Math.PI*2);ctx.fill();ctx.fillStyle=ink;text('KZ',35,89,24);ctx.fillRect(436,2,2,h-4);text(digits,150,91,76,f.font,160);text(letters,337,93,52,f.font,170);text(region,479,93,76,f.font,67);}
  else if(country==='BY'){ctx.fillStyle='#c8313e';ctx.fillRect(13,24,43,16);ctx.fillStyle='#4aa657';ctx.fillRect(13,40,43,9);ctx.fillStyle=ink;text('BY',35,89,24);ctx.fillRect(436,2,2,h-4);text(digits,150,91,76,f.font,160);text(letters,337,93,52,f.font,170);text(region,479,93,76,f.font,67);}
  else if(country==='USSR'){ctx.fillStyle='#0b0f17';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#f8fafc';ctx.lineWidth=3;ctx.strokeRect(4,4,w-8,h-8);ctx.fillStyle='#f8fafc';const d3=digits.replace(/\D/g,'').padStart(3,'0').slice(-3),gost=`0${d3[0]}-${d3.slice(1)}`;text(gost,136,86,66,f.font,210);text(letters,346,86,56,f.font,160);ctx.fillStyle='#facc15';text('★ СССР ГОСТ',w/2,24,14,'Arial',180);}
  else if(country==='JPN'){const meta=jp[region]||jp.TKY,parts=root.getJpnPlateDisplayParts?.(letters[0],letters[1],letters[2],digits,region);const art=regionArt[region];if(art&&headerImages[region])ctx.drawImage(headerImages[region],(w-art.width)/2,15,art.width,40);else text(meta[0]+' '+meta[1],w/2,53,36,'Nomera Japanese Labels');text(parts?.hira||meta[2],42,125,38,'Nomera Japanese Labels');const d=japanDigits(digits),four=d.includes('-'),serial=d.replace('-','');for(let i=0;i<4;i++){const x=105+i*49+(four&&i>=2?12:0);if(serial[i]==='・'){ctx.beginPath();ctx.arc(x+17,112,2.8,0,Math.PI*2);ctx.fill();}else if(jpImage&&/^[0-9]$/.test(serial[i]))ctx.drawImage(jpImage,Number(serial[i])*128,0,128,224,x,73,40,76);else text(serial[i]||'-',x+20,148,73);}if(four){ctx.fillRect(193,109,12,3);}ctx.fillStyle='#a7b3b0';for(const x of[23,w-23]){ctx.beginPath();ctx.arc(x,32,!front&&x===23?7:3.5,0,Math.PI*2);ctx.fill();}}
  else if(country==='USA'){
   const p=usProfiles[region]||usProfiles.CA,m=states[region]||[region,'',p.ink];
   ctx.fillStyle=p.paper;ctx.fillRect(0,0,w,h);
   if(usImages[region])ctx.drawImage(usImages[region],0,0,w,h);
   else {ctx.fillStyle=region==='CA'?'#bd293b':p.ink;text(m[0],w/2,region==='CA'?34:29,region==='CA'?33:20,region==='CA'?'Nomera California Title':'Arial',w-70);text(m[1],w/2,h-9,9,'Arial',w-36);}
   ctx.fillStyle=p.ink;
   // Six preserved game characters; no fabricated prefix digits or real-world serial changes.
   const serial=letters+digits;ctx.font='400 '+p.size+'px "'+p.family+'"';ctx.textAlign='center';
   const available=w-32,gap=region==='MI'?6:7,total=[...serial].reduce((n,c)=>n+ctx.measureText(c).width,0)+gap*(serial.length-1)+7,scale=Math.min(1,available/total);
   let x=(w-total*scale)/2;for(let i=0;i<serial.length;i++){const cw=ctx.measureText(serial[i]).width*scale;text(serial[i],x+cw/2,p.top+p.size,p.size,p.family,cw);x+=cw+(gap+(i===2?7:0))*scale;}
   ctx.fillStyle=region==='MI'?'#d1cba4':'#8b999c';for(const x of[43,w-43]){ctx.beginPath();ctx.ellipse(x,16,3.5,2.4,0,0,Math.PI*2);ctx.fill();}
  }
  else{const m=emirates[region]||emirates.DXB,code=String(comp.uaeCode||comp.code||letters||'A'),ad=['AUH','AD'].includes(region),dubai=region==='DXB';
   if(ad){ctx.fillStyle='#b82c35';ctx.fillRect(2,2,77,h-4);ctx.fillStyle='#fff';text(code,40,80,45,f.font,60);ctx.fillStyle=ink;text(m[1],164,28,20,'Nomera Arabic Labels',132);text(m[0],164,43,10,'Arial',132);text(digits,313,97,70,f.font,365);}
   else{ctx.fillStyle=ink;text(m[1],62,29,23,'Nomera Arabic Labels',103);text(m[0],62,45,dubai?15:12,'Arial',103);text(code,62,95,43,f.font,100);text(digits,328,94,76,f.font,335);}}

  ctx.restore();return f;
 }
 return{formats,states,usProfiles,usArt,emirates,regionArt,japanDigits,japanMarkup,japanHeaderMarkup,decorate,fonts,paint};
});

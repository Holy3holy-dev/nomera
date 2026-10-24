/* A disposable, explicitly labelled local exchange. No online profile or server writes. */
(() => {
 'use strict';
 if(!window.NOMERA_AUTHORS_PREVIEW)return;
 let busy=false;
 const key='authors_market_lots_v1';
 const clone=value=>JSON.parse(JSON.stringify(value));
 function refresh(){localStore.set(key,JSON.stringify(marketLots));renderMarketListings();}
 function finish(){saveProgress(false);refresh();renderInventory();renderCars();}
 const mine=lot=>lot && lot.sellerKey===sanitizeKey(nickname);
 async function buy(id){
  if(busy)return;const lot=marketLots[id];if(!lot)return notifyUser('Этот локальный лот уже недоступен.');
  if(mine(lot))return notifyUser('Это ваше объявление. Его можно снять с продажи.');
  busy=true;
  try{
   if(!(await confirmAction(`Купить ${lot.type==='car'?lot.car.name:lot.plate.text} за ${lot.price.toLocaleString('ru-RU')} ₽ на тестовом рынке?`)))return;
   if(!marketLots[id])return;
   if([...inventory,...myCars].some(item=>item?._previewLotId===id)){delete marketLots[id];refresh();return;}
   if(balance<lot.price)return notifyUser('Недостаточно игровых средств.');
   if(!deductPlayerBalance(lot.price,'Покупка на локальном тестовом рынке'))return;
   const item={...clone(lot.type==='car'?lot.car:lot.plate),_previewLotId:id};
   (lot.type==='car'?myCars:inventory).unshift(item);delete marketLots[id];finish();
   notifyUser(lot.type==='car'?'Автомобиль добавлен в тестовый гараж.':'Номер добавлен в тестовую коллекцию.');
  }finally{busy=false;}
 }
 async function cancel(id){
  if(busy||!mine(marketLots[id]))return;busy=true;
  try{
   if(!(await confirmAction('Снять локальный лот с продажи и вернуть предмет?')))return;
   const lot=marketLots[id];if(!lot)return;
   (lot.type==='car'?myCars:inventory).unshift(clone(lot.type==='car'?lot.car:lot.plate));
   delete marketLots[id];finish();notifyUser('Предмет возвращён в тестовый инвентарь.');
  }finally{busy=false;}
 }
 function sellPlate(){
  if(busy)return;
  const id=document.getElementById('sell-plate-select').value;
  const price=Number(document.getElementById('sell-plate-price').value);
  const index=inventory.findIndex(p=>p?.id===id);
  if(index<0||!Number.isSafeInteger(price)||price<1000||price>1000000000000)return notifyUser('Проверьте предмет и цену от 1 000 ₽.');
  const plate=inventory[index];
  if(plate.favorite)return notifyUser('Сначала снимите защиту с номера в коллекции.');
  if(myCars.some(car=>car.plate?.text===plate.text))return notifyUser('Сначала снимите этот номер с автомобиля.');
  busy=true;
  try{
   const lotId='local_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
   marketLots[lotId]={type:'plate',plate:clone(plate),price,sellerName:nickname,sellerKey:sanitizeKey(nickname),sellerAvatar:DEFAULT_AVATAR,createdAt:Date.now()};
   inventory.splice(index,1);finish();closeSellPlateModal();notifyUser('Объявление создано на локальном тестовом рынке.');
  }finally{busy=false;}
 }
 function seed(){
  const now=Date.now();const result={};
  const plates=[['А 001 АА | 77 RUS',160000,'Northline'],['М 808 ММ | 178 RUS',240000,'Atlas'],['VIP 777 | CA USA',560000,'West Coast'],['JDM 008 | TKY JPN',430000,'Tokyo Club'],['777 VIP | 01 KZ',820000,'Nomad']];
  plates.forEach(([text,price,sellerName],index)=>result['demo_plate_'+index]={type:'plate',plate:{id:'demo_plate_'+index,text,price,createdAt:now-index*60000},price,sellerName,sellerKey:'demo_'+index,sellerAvatar:DEFAULT_AVATAR,createdAt:now-index*60000});
  for(const [index,name] of ['Toyota Mark II Tourer V','Mercedes-Benz G63 AMG «Гелик»','Subaru Impreza WRX STI'].entries()){
   const template=carsData.find(car=>car.name===name);if(!template)continue;
   result['demo_car_'+index]={type:'car',car:{...template,basePrice:template.price,condition:92+index*3,plate:null,upgrades:{engine:0,handling:0,economy:0,nitro:0}},price:Math.round(template.price*.92),sellerName:['Tracklab','Silverline','Apex'][index],sellerKey:'demo_car_seller_'+index,sellerAvatar:DEFAULT_AVATAR,createdAt:now-index*90000};
  }return result;
 }
 window.NomeraPreviewMarket={buy,cancel,sellPlate,refresh};
 window.addEventListener('load',()=>{marketLots=localStore.json(key,null)||seed();currentMarketFilter='plates';refresh();});
})();

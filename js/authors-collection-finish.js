/* Material cues belong to the display case, never obscure national glyphs. */
(()=>{'use strict';if(!window.NOMERA_AUTHORS_PREVIEW)return;
 const finishes={none:['01','Эмаль','Лаконичная коллекционная подача'],uncommon:['02','Сатин','Холодный металл и мягкий блик'],rare:['03','Платина','Полированная грань и зелёный акцент'],super:['04','Рубин','Тёмная эмаль и рубиновый свет'],epic:['05','Опал','Перламутровая грань и фиолетовый акцент'],legendary:['06','Золото','Тёплая фольга и гравированная рамка'],blatnoy:['07','Аурум','Многослойный свет для вершины коллекции']};
 function update(tier){const stage=document.getElementById('gen-plate-stage');if(!stage)return;let badge=stage.querySelector('.ae-material-label');if(!badge){badge=document.createElement('div');badge.className='ae-material-label';badge.innerHTML='<span></span><b></b><small>ОФОРМЛЕНИЕ ВИТРИНЫ</small>';stage.append(badge);}const f=finishes[tier]||finishes.none;badge.querySelector('span').textContent=f[0];badge.querySelector('b').textContent=f[1];badge.title=f[2];stage.dataset.finish=tier;}
 window.NomeraCollectionFinish={update};function mount(){const stage=document.getElementById('gen-plate-stage');update(stage?.dataset.rarityTier||'none');}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();

/* Presentation adapter. Original game objects, handlers and renderers remain in use. */
(() => {
    'use strict';
    const $ = s => document.querySelector(s);
    const make = (tag, cls, html = '') => { const el = document.createElement(tag); el.className = cls; el.innerHTML = html; return el; };
    const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-${name}"/></svg>`;
    const intro = (n, tag, title, desc) => make('div', 'ae-intro', `<div><div class="ae-eyebrow">H3H / ${tag} <span>VOL. 01</span></div><h1>${title}<span class="ae-title-dot">.</span></h1><p>${desc}</p></div><span class="ae-section-number">${n}</span>`);
    const isRelease = Boolean(window.NOMERA_AUTHORS_RELEASE);
    const edition = make('div', 'ae-edition-bar', `<span>AUTHOR’S EDITION <i> / </i> MIDNIGHT 02</span><span class="ae-preview-label">${isRelease ? 'Официальное издание' : 'Тестовый профиль'} <span class="ae-status-dot"></span></span>`);
    $('.brand-bar').after(edition);
    $('.brand-lockup').href = isRelease ? './index.html' : './authors.html';
    $('.brand-lockup').insertAdjacentHTML('beforeend','<small class="ae-brand-edition">COLLECT / DRIVE / TRADE</small>');
    $('.brand-word').textContent = 'NOMERA';

    const gen = $('#generator');
    gen.prepend(intro('01', 'НОМЕРНОЙ ФОНД', 'Генератор номеров', 'Следующий спин может стать главным в коллекции.'));
    const layout = $('.gen-garage-arena');
    const toolbar = make('div','ae-country-toolbar','<span class="ae-label">РЕГИСТРАЦИЯ</span>');
    toolbar.append($('#plate-country-selector'));
    toolbar.querySelector('#btn-country-UAE strong').textContent = 'ОАЭ';
    toolbar.querySelectorAll('.country-select-btn').forEach(btn=>btn.querySelector('strong').dataset.short=btn.dataset.country);
    const regionButton = $('.gen-region-sidebar-section .btn-region-trigger');
    regionButton.innerHTML = 'Регион / серия <span>↗</span>';
    toolbar.append(regionButton);
    layout.before(toolbar);
    window.NomeraRegistration?.decorate($('#plate-box'),$('#plate-box').dataset.country,$('#plate-box').dataset.reg);
    const stage = $('#gen-plate-stage');
    const controls = $('.gen-controls-dock');
    layout.prepend(stage);
    stage.insertAdjacentHTML('afterbegin','<div class="ae-stage-meta"><span><i></i> ВИТРИНА НОМЕРА</span><span>H3H / НОМЕРНОЙ ФОНД</span></div><div class="ae-studio-lights" aria-hidden="true"><i></i><i></i><i></i></div><div class="ae-stage-watermark" aria-hidden="true">NOMERA</div>');
    stage.insertAdjacentHTML('beforeend','<div class="ae-stage-caption"><span>КОЛЛЕКЦИЯ НАЧИНАЕТСЯ С ХАРАКТЕРА</span><span>AUTHOR’S EDITION / 02</span></div>');
    controls.prepend($('.podium-price-readout'));
    controls.querySelector('.podium-price-caption').textContent = 'ОЦЕНОЧНАЯ СТОИМОСТЬ';
    layout.append(controls);
    $('.gen-main-cta-wrap').after($('.gen-secondary-actions-grid'));
    const settings = make('details','ae-settings','<summary>Настройки генерации <span>＋</span></summary>');
    settings.append($('#gen-quick-toggles-bar'));
    controls.append(settings);
    $('#btn-gen-mobile-settings').remove();
    $('.gen-left-panel').hidden = true;
    $('.gen-center-stage').hidden = true;
    $('.garage-arena-backdrop').hidden = true;
    const stats = $('.gen-right-panel');
    gen.append(stats);
    $('#btn-gen-mobile-stats').remove();
    $('.gen-rarity-odds-strip').hidden = true; // Legacy hardcoded odds don't describe all countries/pity.
    $('.gen-sell-free-btn').hidden = true; // Bulk action remains in the inventory.
    $('.spin-cta-main').textContent = 'Сгенерировать';
    $('#btn-spin-both').insertAdjacentHTML('beforeend','<span class="ae-cta-arrow" aria-hidden="true">↗</span>');
    $('.gen-plate-desc-drawer summary').textContent = 'Паспорт номера и описание серии';
    if (!isRelease) $('#generator-online-wallet').hidden = true;

    const inv = $('#inventory');
    inv.prepend(intro('02','ЛИЧНЫЙ ИНВЕНТАРЬ','Твоя коллекция','Редкие серии. Знаковые сочетания. Номера с характером.'));
    const collectionMetrics = make('div','ae-collection-metrics','<div><span>СОБРАНО НОМЕРОВ</span><strong id="ae-total-count">—</strong></div><div><span>СТОИМОСТЬ КОЛЛЕКЦИИ</span><strong id="ae-total-value">—</strong></div><div><span>ИЗБРАННОЕ</span><strong id="ae-favorite-count">—</strong></div>');
    inv.querySelector('.ae-intro').after(collectionMetrics);
    $('#inv-search-input').placeholder = 'Найти номер или регион…';
    $('#inv-search-input').setAttribute('aria-label','Поиск по номеру или региону');
    $('#inventory .section-title').hidden = true;
    $('#col-plates-summary').classList.add('ae-collection-total');
    // The collection module owns these controls when the library browser is present.
    if (!window.NomeraCollection) {
    const filterDetails = make('details','ae-collection-filters','<summary>Фильтры и сортировка <span>＋</span></summary>');
    filterDetails.append($('.col-filters-group'));
    $('#col-actions-bar').append(filterDetails);
    $('#btn-mobile-col-filters').hidden = true;
    const bulk = make('details','ae-bulk','<summary>Продажа коллекции <span>＋</span></summary>');
    const bulkButtons = $('#btn-sell-all-plates').parentElement;
    bulkButtons.before(bulk);bulk.append(bulkButtons);
    }

    const garage = $('#garage');
    garage.prepend(intro('03','АВТОМОБИЛИ','Мой гараж','Выбери автомобиль. Настрой под себя. Выезжай на трассу.'));
    $('#garage > .section-box > .section-header .section-title').hidden = true;
    $('#btn-garage-sub-showroom').textContent = 'Мой гараж';
    $('#btn-garage-sub-shop').textContent = 'Автосалон';
    $('#btn-garage-sub-fleet').textContent = 'Кортеж и прокат';
    $('.garage-3d-badge').textContent = 'H3H / ШОУРУМ';
    $('#garage-3d-hint').textContent = 'Вращение — перетаскивание · Масштаб — колесо или два пальца';
    // One inspector navigation, rather than a duplicate row of the same five actions.
    $('.garage-podium-bottom-dock').hidden = true;
    const legends = make('details','ae-legends','<summary>Тест-драйв коллекции <span>↗</span></summary>');
    $('#garage-nfsmw-legends-bar').before(legends);
    legends.append($('#garage-nfsmw-legends-bar'));
    $('#btn-garage-podium-styling').hidden = true;
    $('#btn-garage-podium-nfs-race').hidden = true;
    $('#btn-garage-podium-toggle').hidden = true;
    $('#btn-garage-podium-race').textContent = 'На трассу ↗';
    $('.garage-buy-more-btn').textContent = 'Открыть автосалон ↗';
    $('#btn-mobile-garage-cars').hidden = true; // Roster is always accessible as a rail.

    for (const [id,name] of [['mob-nav-generator','plate'],['mob-nav-inventory','collection'],['mob-nav-cars','garage'],['mob-nav-market','online']]) {
        $('#'+id+' > span').innerHTML = icon(name);
    }
    $('#hud-daily-btn').innerHTML = icon('case');
    const footer = make('footer','ae-footer',`<span>H3H NOMERA <b>AUTHOR’S EDITION</b></span><span>${isRelease ? 'Официальное издание · облачное и локальное сохранение профиля' : 'Тестовый профиль · сохранение только в этом браузере'}</span><a href="#garage" onclick="switchTab(&quot;garage&quot;);return false">Вернуться в гараж ↗</a>`);
    $('.main-container').append(footer);

    // Retain the real plate renderer's national layouts, scale the whole object uniformly.
    const plate = $('#plate-box'), wrap = $('.plate-hero-scale-wrap');
    function fitPlate() {
        const format = NomeraPlatePresentation.formats[plate.dataset.country] || NomeraPlatePresentation.formats.RUS;
        plate.style.setProperty('--ae-board-width',format.width+'px');
        plate.style.setProperty('--ae-board-height',format.height+'px');
        wrap.style.setProperty('--ae-plate-scale',NomeraPlatePresentation.sceneScale(wrap.clientWidth,wrap.clientHeight));
    }
    new ResizeObserver(fitPlate).observe(wrap);
    new MutationObserver(fitPlate).observe(plate,{attributes:true,attributeFilter:['class','data-country']});

    // Clean presentation of inherited emoji labels without touching handlers or data.
    const emoji = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu;
    function refreshPassport() {
        if(!boardHasLetters || !boardHasNumbers || currentCountry === 'UAE') return;
        const price=calculatePrice(), rarity=getRarity(price);
        const info=NomeraPlatePassport.describe({country:currentCountry,letters:[currentL1,currentL2,currentL3],digits:currentNum,region:String(currentReg),price,rarity:rarity.text,eliteSeries:PLATE_COUNTRIES[currentCountry]?.eliteLetters||[],special:getUltraSpecialPlateMeta(currentL1,currentL2,currentL3,currentNum,currentReg,currentCountry)});
        if(!info)return;
        const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
        const html=`<article class="ae-plate-passport"><span class="ae-passport-country">${esc(info.country)} / ПАСПОРТ КОЛЛЕКЦИИ</span><h3>${esc(info.title)}</h3><p class="ae-passport-region">${esc(info.region)}</p><p>${esc(info.format)}</p><dl>${info.features.map(f=>`<div><dt>${esc(f.label)}</dt><dd>${esc(f.body)}</dd></div>`).join('')}</dl><strong class="ae-passport-value">${esc(info.valuation)}</strong><p class="ae-passport-note">${esc(info.note)}</p></article>`;
        const target=$('#current-plate-desc');
        if(target.innerHTML!==html)target.innerHTML=html;
    }
    function polish(root) {
        if(root === gen) refreshPassport();
        if(root === inv) {
            const items = Array.isArray(inventory) ? inventory : [];
            const metrics = {'ae-total-count':items.length.toLocaleString('ru-RU'),'ae-total-value':items.reduce((s,p)=>s+(Number(p?.price)||0),0).toLocaleString('ru-RU')+' ₽','ae-favorite-count':items.filter(p=>p?.favorite).length.toLocaleString('ru-RU')};
            for(const [id,value] of Object.entries(metrics)) {const el=document.getElementById(id);if(el.textContent!==value)el.textContent=value;}
        }
        const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
        const texts=[]; while(walker.nextNode()) texts.push(walker.currentNode);
        for (const node of texts) {
            if(node.parentElement?.closest('.plate-container,.mini-plate,.inv-fav-btn,script,style')) continue;
            const clean = node.nodeValue.replace(emoji,'');
            if(clean !== node.nodeValue) node.nodeValue = clean;
        }
        root.querySelectorAll('.inv-card').forEach(card => {
            card.tabIndex = 0; card.setAttribute('role','button');
            card.onkeydown = e => {if(e.target === card && (e.key === 'Enter' || e.key === ' ')){e.preventDefault();card.click();}};
            const fav = card.querySelector('.inv-fav-btn');
            if(fav) {fav.setAttribute('aria-label',fav.title);fav.setAttribute('aria-pressed',String(fav.classList.contains('active')));}
            if(!card.querySelector('.ae-card-country')) {
                const mini = card.querySelector('.mini-plate');
                const countries = {kz:'КАЗАХСТАН',usa:'США',uae:'ОАЭ',jpn:'ЯПОНИЯ'};
                let label = 'РОССИЯ';
                for(const [code,name] of Object.entries(countries)) if(mini.className.includes(code)) label=name;
                const status = card.querySelector('.status-garage') ? 'НА АВТО' : card.querySelector('.status-market') ? 'НА РЫНКЕ' : 'В КОЛЛЕКЦИИ';
                card.querySelector('.inv-card-plate-stage').after(make('div','ae-card-country',label+' <span>'+status+'</span>'));
            }
        });
        root.querySelectorAll('.mini-plate').forEach(plate => {
            if(plate.querySelector('.ae-mini-main')) return;
            const match = plate.textContent.trim().match(/^([А-ЯA-Z])\s*(\d{3})\s*([А-ЯA-Z]{2})\s*(?:\|\s*)?(\d{2,3})(?:\s*RUS)?$/);
            if(!match || /special-/.test(plate.className)) return;
            plate.setAttribute('aria-label',plate.textContent.trim());
            plate.classList.add('ae-rus-plate');
            plate.innerHTML = `<span class="ae-mini-main">${match[1]}<b>${match[2]}</b>${match[3]}</span><span class="ae-mini-region"><b>${match[4]}</b><small>RUS <i></i></small></span>`;
        });
        if (root === garage) {
            const empty = !Array.isArray(myCars) || myCars.length === 0;
            $('#garage-3d-podium-card').hidden = empty;
            $('#garage-active-inspector').hidden = empty;
            if (empty && !garage.querySelector('.ae-empty-garage')) {
                $('#garage-showroom-layout').before(make('div','ae-empty-garage','<h2>Первый автомобиль — начало истории.</h2><p>Выбери автомобиль в автосалоне, чтобы открыть личный шоурум.</p><button class="btn" type="button" onclick="switchGarageSubView(\'shop\')">Открыть автосалон ↗</button>'));
            }
            const emptyState = garage.querySelector('.ae-empty-garage');
            if (emptyState) emptyState.hidden = !empty;
            if (!empty && !window.garageShowroom && typeof Car3DManager !== 'undefined' && !Car3DManager.isWebGLAvailable()) {
                const view = $('#garage-preview-3d-wrap');
                if (!view.querySelector('.ae-webgl-fallback')) {
                    const fallback = make('div','ae-webgl-fallback','<img alt="Автомобиль из игрового каталога"><p>3D недоступно в этом браузере. Выбор автомобиля и управление доступны ниже.</p>');
                    view.replaceChildren(fallback);
                }
                const car = myCars[activeGarageCarIndex] || myCars[0];
                const img = view.querySelector('img');
                const src = getCarSpriteDataUrl(car.name);
                if(img.getAttribute('src')!==src) img.setAttribute('src',src);
            }
        }
        // Neutral showroom materials, retaining the original geometry and lighting.
        if (root === garage && window.garageShowroom) {
            const scene = window.garageShowroom;
            if (scene.podiumDiscMat) {scene.podiumDiscMat.color.setHex(0x101722);scene.podiumDiscMat.roughness=.38;scene.podiumDiscMat.metalness=.65;}
            if (scene.podiumRingMat) {scene.podiumRingMat.color.setHex(0x83a5c5);scene.podiumRingMat.opacity=.28;}
        }
    }
    let queued = false;
    const observer = new MutationObserver(() => {
        if(queued) return; queued=true;
        requestAnimationFrame(() => {observer.disconnect(); [gen,inv,garage].forEach(polish);watch();queued=false;});
    });
    function watch(){for(const el of [gen,inv,garage]) observer.observe(el,{childList:true,subtree:true,characterData:true});}
    [gen,inv,garage].forEach(polish);watch();
    window.addEventListener('load', () => {
        closeWelcomeModal(); fitPlate();
        const tab = new URLSearchParams(location.search).get('screen');
        if(['generator','inventory','garage'].includes(tab)) switchTab(tab);
    });
})();

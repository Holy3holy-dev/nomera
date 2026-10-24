/* Presentation and selection only. app.js owns every grant, debit and sale. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.NomeraCaseResults = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';
    const money = n => Number(n || 0).toLocaleString('ru-RU') + ' ₽';
    const escape = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const proceeds = item => item.isCar ? Math.floor(Number(item.price || 0) * .9) : Number(item.price || 0);
    const rank = item => /Мифич|БЛАТНОЙ|Крутой|Ультра/i.test(item.rarity?.text) ? 5 : /Легендар/i.test(item.rarity?.text) ? 4 : /Эпич|Супер редк/i.test(item.rarity?.text) ? 3 : /^Редк/i.test(item.rarity?.text) ? 2 : /Необыч/i.test(item.rarity?.text) ? 1 : 0;
    let context = null, signature = '', filter = 'all', sort = 'opening', query = '';
    const kept = new Set(), selected = new Set();
    const key = item => item._openingId;
    const canSell = item => Boolean(item && !item._sold && !kept.has(key(item)));
    function visibleItems(items, options = {}) {
        const f = options.filter || 'all', q = String(options.query || '').toLowerCase().trim();
        const rows = items.map((item, index) => ({item, index})).filter(({item}) => {
            const retained = (options.kept || kept).has(key(item));
            const match = f === 'all' || (f === 'new' && !item._isDuplicate && !item._sold) ||
                (f === 'duplicates' && item._isDuplicate && !item._sold) ||
                (f === 'kept' && retained && !item._sold) || (f === 'sold' && item._sold);
            return match && (!q || String(item.name || item.text).toLowerCase().includes(q));
        });
        if (options.sort === 'price') rows.sort((a,b) => proceeds(b.item) - proceeds(a.item) || a.index-b.index);
        if (options.sort === 'rarity') rows.sort((a,b) => rank(b.item)-rank(a.item) || a.index-b.index);
        return rows;
    }
    function render(data) {
        const next = data.items.map(key).join('|');
        const fresh = next !== signature;
        if (fresh) { signature = next; kept.clear(); selected.clear(); filter = 'all'; sort = 'opening'; query = ''; }
        context = data;
        mount();
        if (fresh) { const search = root.document?.querySelector('.ae-result-search'); if (search) search.open = false; }
        const doc = root.document, grid = doc.getElementById('roulette-batch-grid'), summary = doc.getElementById('roulette-batch-summary');
        if (!grid || !summary) return;
        const items = data.items, remaining = items.filter(i => !i._sold), duplicates = items.filter(i => i._isDuplicate && canSell(i));
        for (const id of selected) if (!items.some(i => key(i) === id && canSell(i))) selected.delete(id);
        const toolbar = doc.getElementById('ae-result-toolbar');
        toolbar.querySelector('input').value = query;
        toolbar.querySelector('select').value = sort;
        toolbar.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
        const rows = visibleItems(items, {filter, sort, query});
        const opening = doc.getElementById('roulette-modal')?.dataset.casePhase === 'opening';
        grid.innerHTML = rows.map(({item, index}) => {
            const held = kept.has(key(item)), sold = Boolean(item._sold), title = item.name || item.text;
            const visual = item.isCar
                ? `<img src="${data.carSprite(item.name)}" alt="${escape(item.name)}" width="240" height="104" loading="lazy">`
                : `<div class="mini-plate ${data.plateClass(item.text)}">${data.plateHtml(item.text)}</div>`;
            return `<article id="batch-drop-card-${index}" class="batch-drop-card ae-drop ${data.tierClass(item.rarity?.text)} ${opening ? 'revealing-card' : 'revealed-card'} ${sold ? 'sold-out' : ''} ${held ? 'ae-kept' : ''}">
                <div class="ae-drop-head"><label><input type="checkbox" data-select="${index}" ${selected.has(key(item)) ? 'checked' : ''} ${!canSell(item) ? 'disabled' : ''} aria-label="Выбрать ${escape(title)}"><span>${sold ? 'Продано' : held ? 'Оставлено' : item._isDuplicate ? 'Дубликат' : 'Новое'}</span></label><span class="ae-drop-rarity">${escape(item.rarity?.text || 'Обычный')}</span></div>
                <div class="ae-drop-visual">${visual}</div>
                <h4>${escape(title)}</h4><div class="ae-drop-value">Оценка <b>${money(item.price)}</b></div>
                <div class="ae-drop-actions">${sold ? '<span>✓ Сумма зачислена</span>' : `<button type="button" data-keep="${index}" aria-pressed="${held}">${held ? '✓ Оставлено' : 'Оставить'}</button><button type="button" data-sell="${index}" ${held ? 'disabled' : ''}>Продать <b>+${money(proceeds(item))}</b></button>`}</div>
                ${!sold && item.isCar ? '<small>Продажа автомобиля: 90% оценки</small>' : ''}</article>`;
        }).join('') || '<div class="ae-result-empty">Здесь пока нет предметов. Выберите другой фильтр.</div>';
        summary.innerHTML = `<div class="ae-result-heading"><div><span class="luxury-panel-eyebrow">ВАША КОЛЛЕКЦИЯ · ×${items.length}</span><h3>Награды · ×${items.length}</h3></div><span class="ae-result-saved">✓ Уже сохранено</span></div><p>«Оставить» защищает от продажи.</p><details class="ae-result-totals"><summary>Стоимость и итоги открытия</summary><div class="ae-result-stats"><span>Потрачено<b>${money(data.totalSpent)}</b></span><span>Оценка наград<b>${money(items.reduce((n,i)=>n+Number(i.price||0),0))}</b></span><span>В коллекции<b>${remaining.length} из ${items.length}</b></span></div></details>`;
        doc.getElementById('ae-result-count').textContent = `Показано ${rows.length} из ${items.length}`;
        const selection = items.filter(i => selected.has(key(i)) && canSell(i));
        const sellSelected = doc.getElementById('ae-sell-selected');
        sellSelected.disabled = !selection.length;
        sellSelected.textContent = selection.length ? `Продать выбранные (${selection.length}) · +${money(selection.reduce((n,i)=>n+proceeds(i),0))}` : 'Выберите предметы для продажи';
        const dups = doc.getElementById('btn-batch-sell-dups');
        dups.disabled = !duplicates.length; dups.style.opacity = ''; dups.textContent = `Продать дубликаты (${duplicates.length})`;
        const all = doc.getElementById('btn-batch-sell-all');
        all.disabled = !items.some(canSell); all.textContent = 'Продать всё неотмеченное';
        const claim = doc.querySelector('[onclick="claimBatchCaseResults()"]');
        if (claim) claim.textContent = 'Готово · в коллекцию';
    }
    function redraw() { if (context) render(context); }
    function mount() {
        const doc = root.document;
        if (!doc || doc.getElementById('ae-result-toolbar')) return;
        const grid = doc.getElementById('roulette-batch-grid');
        if (!grid) return;
        const layout = grid.parentElement;
        const toolbar = doc.createElement('section');
        toolbar.id = 'ae-result-toolbar';
        toolbar.innerHTML = `<div class="ae-result-filters" role="group" aria-label="Показать награды">${[['all','Все'],['new','Новое'],['duplicates','Дубликаты'],['kept','Оставлено'],['sold','Продано']].map(([v,t])=>`<button type="button" data-filter="${v}" aria-pressed="${v==='all'}">${t}</button>`).join('')}</div><details class="ae-result-search"><summary>Поиск и сортировка</summary><div class="ae-result-tools"><input type="search" placeholder="Найти номер или машину" aria-label="Поиск по наградам"><select aria-label="Порядок наград"><option value="opening">Порядок открытия</option><option value="rarity">Сначала редкие</option><option value="price">Дороже при продаже</option></select></div></details><div class="ae-result-selection"><span id="ae-result-count" role="status"></span><button type="button" id="ae-select-duplicates">Выделить дубликаты</button><button type="button" id="ae-clear-selection">Снять выбор</button></div>`;
        layout.insertBefore(toolbar, grid);
        const sell = doc.createElement('button'); sell.id = 'ae-sell-selected'; sell.type = 'button'; sell.className = 'btn';
        const selectionBar = toolbar.querySelector('.ae-result-selection');
        selectionBar.append(sell); layout.insertBefore(selectionBar, grid);
        for (const host of [toolbar, selectionBar]) host.addEventListener('click', event => {
            const button = event.target.closest('button'); if (!button || !context) return;
            if (button.dataset.filter) filter = button.dataset.filter;
            if (button.id === 'ae-select-duplicates') context.items.forEach(i => { if (i._isDuplicate && canSell(i)) selected.add(key(i)); });
            if (button.id === 'ae-clear-selection') selected.clear();
            redraw();
        });
        toolbar.querySelector('input').addEventListener('input', event => { query = event.target.value; redraw(); });
        toolbar.querySelector('select').addEventListener('change', event => { sort = event.target.value; redraw(); });
        grid.addEventListener('change', event => {
            if (!event.target.matches('[data-select]')) return;
            const item = context.items[Number(event.target.dataset.select)];
            if (canSell(item)) { if (event.target.checked) selected.add(key(item)); else selected.delete(key(item)); }
            redraw(); grid.querySelector(`[data-select="${event.target.dataset.select}"]`)?.focus({preventScroll:true});
        });
        grid.addEventListener('click', event => {
            const button = event.target.closest('button'); if (!button || !context) return;
            if (button.hasAttribute('data-keep')) {
                const item = context.items[Number(button.dataset.keep)]; if (!item || item._sold) return;
                if (kept.has(key(item))) kept.delete(key(item)); else { kept.add(key(item)); selected.delete(key(item)); }
                redraw(); grid.querySelector(`[data-keep="${button.dataset.keep}"]`)?.focus({preventScroll:true});
            } else if (button.hasAttribute('data-sell')) root.sellSingleBatchDrop?.(Number(button.dataset.sell));
        });
        sell.addEventListener('click', () => {
            const indices = context.items.flatMap((item,i) => selected.has(key(item)) && canSell(item) ? [i] : []);
            if (indices.length) root.sellBatchCaseResults?.(false, indices);
        });
        for (const id of ['case-roulette-container','batch-roulette-stage']) {
            const reel = doc.getElementById(id); if (!reel) continue;
            const details = doc.createElement('details'); details.className = 'ae-result-reel'; details.dataset.reelId = id; details.open = true;
            const label = doc.createElement('summary'); label.textContent = 'Посмотреть ленту открытия';
            reel.before(details); details.append(label,reel);
        }
        const note = doc.createElement('p'); note.className = 'ae-single-saved-note';
        note.textContent = 'Награда уже сохранена. Можно оставить её в коллекции или сразу продать.';
        doc.getElementById('roulette-price')?.after(note);
    }
    function begin() { mount(); const doc = root.document; doc?.querySelectorAll('.ae-result-reel').forEach(d => { d.hidden = false; d.open = true; if (d.dataset.reelId === 'case-roulette-container') doc.getElementById('roulette-result').before(d); else doc.getElementById('roulette-batch-result').prepend(d); }); }
    function complete() {
        root.requestAnimationFrame?.(() => {
            const doc = root.document;
            if (doc?.getElementById('roulette-modal')?.dataset.casePhase !== 'complete') return;
            doc.querySelectorAll('.ae-result-reel').forEach(d => { d.open = false; d.hidden = d.lastElementChild.classList.contains('hidden'); const target = doc.getElementById(d.dataset.reelId === 'case-roulette-container' ? 'roulette-result' : 'roulette-batch-result'); if (target.id === 'roulette-result') target.after(d); else target.append(d); });
            if (context && !doc.getElementById('roulette-batch-result').classList.contains('hidden')) redraw();
            const body = doc.querySelector('.ae-case-dialog-body'); if (body) body.scrollTop = 0;
        });
    }
    return {render, canSell, begin, complete, visibleItems, proceeds};
});

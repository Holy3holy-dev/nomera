(function (root) {
    'use strict';
    const fields = ['bestDistance', 'bestSpeed', 'totalEarned'];
    function normalize(records) {
        return Object.fromEntries(fields.map(field => [field,
            typeof records?.[field] === 'number' && Number.isFinite(records[field]) && records[field] >= 0 ? records[field] : 0]));
    }
    function merge(a, b) {
        a = normalize(a); b = normalize(b);
        return Object.fromEntries(fields.map(field => [field, Math.max(a[field], b[field])]));
    }
    function createRecords(store) {
        let owner = '';
        const key = () => 'nomera_race_records_v2:' + encodeURIComponent(owner);
        return {
            bind(nextOwner, { legacy = false, snapshot = null } = {}) {
                owner = String(nextOwner).trim().toLowerCase();
                const existing = store.json(key());
                let records = merge(existing, snapshot);
                // Only the saved local account can claim ambiguous v1 records. Keep v1 intact.
                if (legacy && !existing && !store.get('nomera_race_records_v1_owner')) {
                    records = merge(records, store.json('race_records_v1'));
                    store.set('nomera_race_records_v1_owner', owner);
                }
                this.set(records);
                return records;
            },
            get() { return normalize(store.json(key())); },
            set(records) { return store.set(key(), JSON.stringify(normalize(records))); },
            merge(records) { return this.set(merge(this.get(), records)); }
        };
    }
    function finishRecords(records, player, cash) {
        const next = normalize(records);
        next.bestDistance = Math.max(next.bestDistance, normalize({bestDistance: player.distanceKm}).bestDistance);
        next.bestSpeed = Math.max(next.bestSpeed, normalize({bestSpeed: player.peakSpeed}).bestSpeed);
        next.totalEarned += Number.isFinite(cash) && cash >= 0 ? cash : 0;
        return next;
    }
    const api = { normalize, merge, createRecords, finishRecords };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.NomeraRaceRecords = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

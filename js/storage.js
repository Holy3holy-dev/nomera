(function (root) {
    'use strict';
    function createStorage(storage, onError = () => {}) {
        const memory = new Map();
        return {
            get(key) {
                if (memory.has(key)) return memory.get(key);
                try { return storage.getItem(key); } catch (_) { onError(); return null; }
            },
            set(key, value) {
                memory.set(key, value);
                try { storage.setItem(key, value); return true; } catch (_) { onError(); return false; }
            },
            remove(key) {
                memory.set(key, null);
                try { storage.removeItem(key); } catch (_) { onError(); }
            },
            json(key, fallback = null) {
                try { const raw = this.get(key); return raw === null ? fallback : JSON.parse(raw); }
                catch (_) { onError(); return fallback; }
            }
        };
    }
    function createSaveQueue(write) {
        let tail = Promise.resolve();
        return payload => {
            // Snapshot values now; subsequent game mutations cannot alter a queued save.
            const snapshot = JSON.parse(JSON.stringify(payload));
            const result = tail.then(() => write(snapshot));
            tail = result.catch(() => {});
            return result;
        };
    }
    const api = { createStorage, createSaveQueue };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.NomeraStorage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

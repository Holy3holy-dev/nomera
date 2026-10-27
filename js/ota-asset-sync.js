/* Delta OTA Asset Synchronizer for Bundled Android APK & Web CacheStorage */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.NomeraOtaSync = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    const OVERLAY_CACHE_NAME = 'nomera-ota-overlay-v1';
    const GLB_CACHE_NAME = 'nomera-glb-cache-v4';
    const LOCAL_MANIFEST_STORAGE_KEY = 'nomera_ota_applied_manifest_v1';

    function normalizePath(p) {
        return String(p || '').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\\/g, '/');
    }

    /**
     * Pure delta planner: compares bundled/local manifest + active overlay cache against remote server manifest.
     * Schedules ONLY added/modified files for download and schedules removed/obsolete textures/models for deletion.
     */
    function computeDeltaPlan(localManifest, remoteManifest, cachedOverlayFiles = {}) {
        const localFiles = (localManifest && localManifest.files) || {};
        const remoteFiles = (remoteManifest && remoteManifest.files) || {};
        const overlayMap = cachedOverlayFiles || {};

        const toDownload = [];
        const toDeleteSet = new Map();
        let downloadBytes = 0;

        // 1. Identify added or updated files in remoteManifest
        const remotePaths = Object.keys(remoteFiles).sort();
        for (const rawPath of remotePaths) {
            const relPath = normalizePath(rawPath);
            const remoteEntry = remoteFiles[rawPath];
            if (!remoteEntry || !remoteEntry.version) continue;

            const localEntry = localFiles[relPath];
            const overlayVersion = overlayMap[relPath];
            const effectiveVersion = overlayVersion || (localEntry && localEntry.version) || null;

            if (effectiveVersion !== remoteEntry.version) {
                const reason = localEntry ? 'updated' : 'added';
                const bytes = Number(remoteEntry.bytes) || 0;
                toDownload.push({
                    path: relPath,
                    version: remoteEntry.version,
                    bytes,
                    reason
                });
                downloadBytes += bytes;
            }
        }

        // 2. Identify files present in localManifest that were removed from remoteManifest
        for (const rawPath of Object.keys(localFiles)) {
            const relPath = normalizePath(rawPath);
            if (!Object.prototype.hasOwnProperty.call(remoteFiles, relPath)) {
                toDeleteSet.set(relPath, { path: relPath, reason: 'removed' });
            }
        }

        // 3. Identify stale overlay files that are no longer in remoteManifest
        for (const rawPath of Object.keys(overlayMap)) {
            const relPath = normalizePath(rawPath);
            if (!Object.prototype.hasOwnProperty.call(remoteFiles, relPath)) {
                toDeleteSet.set(relPath, { path: relPath, reason: 'removed' });
            }
        }

        const toDelete = Array.from(toDeleteSet.values()).sort((a, b) => a.path.localeCompare(b.path));
        const upToDate = toDownload.length === 0 && toDelete.length === 0;
        const releaseChanged = Boolean(
            localManifest && remoteManifest && localManifest.release !== remoteManifest.release
        );

        return {
            upToDate,
            releaseChanged,
            fromRelease: (localManifest && localManifest.release) || null,
            toRelease: (remoteManifest && remoteManifest.release) || null,
            toDownload,
            toDelete,
            downloadBytes
        };
    }

    function createBrowserStorageAdapter(fetchFn) {
        return {
            async getLocalManifest() {
                try {
                    if (root && root.localStorage) {
                        const raw = root.localStorage.getItem(LOCAL_MANIFEST_STORAGE_KEY);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (parsed && parsed.files) return parsed;
                        }
                    }
                } catch (_) {}
                try {
                    const res = await fetchFn('./asset-manifest.json', { cache: 'no-store' });
                    if (res && res.ok) return await res.json();
                } catch (_) {}
                return { schemaVersion: 1, release: 'initial', files: {} };
            },
            async getOverlayVersions() {
                try {
                    if (root && root.localStorage) {
                        const raw = root.localStorage.getItem(LOCAL_MANIFEST_STORAGE_KEY + '_overlay');
                        if (raw) return JSON.parse(raw) || {};
                    }
                } catch (_) {}
                return {};
            },
            async writeOverlayFile(relPath, arrayBuffer, version) {
                if (root && root.caches && typeof Response === 'function') {
                    const cache = await root.caches.open(OVERLAY_CACHE_NAME);
                    const url = './' + normalizePath(relPath) + '?v=' + version;
                    await cache.put(url, new Response(arrayBuffer));
                }
                try {
                    if (root && root.localStorage) {
                        const map = await this.getOverlayVersions();
                        map[normalizePath(relPath)] = version;
                        root.localStorage.setItem(LOCAL_MANIFEST_STORAGE_KEY + '_overlay', JSON.stringify(map));
                    }
                } catch (_) {}
            },
            async deleteOverlayFile(relPath) {
                const clean = normalizePath(relPath);
                if (root && root.caches) {
                    for (const cacheName of [OVERLAY_CACHE_NAME, GLB_CACHE_NAME]) {
                        try {
                            const cache = await root.caches.open(cacheName);
                            const keys = await cache.keys();
                            for (const req of keys) {
                                if (req.url && req.url.includes(clean)) {
                                    await cache.delete(req);
                                }
                            }
                        } catch (_) {}
                    }
                }
                try {
                    if (root && root.localStorage) {
                        const map = await this.getOverlayVersions();
                        delete map[clean];
                        root.localStorage.setItem(LOCAL_MANIFEST_STORAGE_KEY + '_overlay', JSON.stringify(map));
                    }
                } catch (_) {}
            },
            async saveAppliedManifest(manifest) {
                try {
                    if (root && root.localStorage) {
                        root.localStorage.setItem(LOCAL_MANIFEST_STORAGE_KEY, JSON.stringify(manifest));
                    }
                } catch (_) {}
            }
        };
    }

    async function syncWithServer(options = {}) {
        const fetchFn = options.fetchImpl || (root && root.fetch ? root.fetch.bind(root) : null);
        if (!fetchFn) {
            return { updated: false, downloadedCount: 0, deletedCount: 0, reason: 'no_fetch' };
        }

        // If running inside Native Android APK with native OTA bridge, trigger native background sync too
        if (root && root.NomeraAndroidBridge && typeof root.NomeraAndroidBridge.triggerOtaSync === 'function' && !options.storageAdapter) {
            try {
                root.NomeraAndroidBridge.triggerOtaSync(String(options.remoteBaseUrl || ''));
            } catch (_) {}
        }

        const baseUrl = String(options.remoteBaseUrl || './').replace(/\/?$/, '/');
        const adapter = options.storageAdapter || createBrowserStorageAdapter(fetchFn);
        const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

        const localManifest = await adapter.getLocalManifest();
        const overlayVersions = await adapter.getOverlayVersions();

        let remoteManifest = null;
        try {
            const manifestUrl = baseUrl + 'asset-manifest.json?t=' + Date.now();
            const res = await fetchFn(manifestUrl, { cache: 'no-store' });
            if (!res || !res.ok) {
                return { updated: false, downloadedCount: 0, deletedCount: 0, reason: 'manifest_unreachable' };
            }
            remoteManifest = await res.json();
        } catch (_) {
            return { updated: false, downloadedCount: 0, deletedCount: 0, reason: 'offline' };
        }

        if (!remoteManifest || !remoteManifest.files) {
            return { updated: false, downloadedCount: 0, deletedCount: 0, reason: 'invalid_manifest' };
        }

        const plan = computeDeltaPlan(localManifest, remoteManifest, overlayVersions);
        if (plan.upToDate) {
            await adapter.saveAppliedManifest(remoteManifest);
            return {
                updated: false,
                upToDate: true,
                release: remoteManifest.release,
                downloadedCount: 0,
                deletedCount: 0,
                plan
            };
        }

        // 1. Delete obsolete or removed textures/models first to free storage immediately
        let deletedCount = 0;
        for (const item of plan.toDelete) {
            await adapter.deleteOverlayFile(item.path);
            deletedCount++;
        }

        // 2. Download added/updated files
        let downloadedCount = 0;
        for (let i = 0; i < plan.toDownload.length; i++) {
            const item = plan.toDownload[i];
            if (onProgress) {
                onProgress({
                    phase: 'downloading',
                    current: i + 1,
                    total: plan.toDownload.length,
                    path: item.path,
                    bytes: item.bytes
                });
            }
            const fileUrl = baseUrl + item.path + '?v=' + encodeURIComponent(item.version);
            const res = await fetchFn(fileUrl, { cache: 'no-store' });
            if (!res || !res.ok) {
                throw new Error('Failed to download OTA asset: ' + item.path);
            }
            const buffer = await res.arrayBuffer();
            await adapter.writeOverlayFile(item.path, buffer, item.version);
            downloadedCount++;
        }

        await adapter.saveAppliedManifest(remoteManifest);
        if (onProgress) {
            onProgress({
                phase: 'complete',
                downloadedCount,
                deletedCount,
                release: remoteManifest.release
            });
        }

        return {
            updated: true,
            upToDate: true,
            release: remoteManifest.release,
            downloadedCount,
            deletedCount,
            plan
        };
    }

    if (root && typeof root.addEventListener === 'function') {
        root.onNomeraAndroidOtaEvent = function (evt) {
            if (!evt || typeof evt !== 'object') return;
            if (evt.phase === 'complete' && evt.updated && typeof root.notifyUser === 'function') {
                const dl = Number(evt.downloadedCount) || 0;
                const rm = Number(evt.deletedCount) || 0;
                root.notifyUser(
                    `📲 Автообновление клиента: загружено ${dl} файл(ов)${rm > 0 ? `, удалено ${rm} устаревших текстур` : ''}!`,
                    'success'
                );
            }
        };
    }

    return {
        computeDeltaPlan,
        syncWithServer,
        normalizePath
    };
});

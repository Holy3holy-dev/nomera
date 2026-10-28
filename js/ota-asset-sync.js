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
    const APK_DOWNLOAD_URL = 'https://github.com/Holy3holy-dev/nomera/releases/latest/download/nomera-bundled-ota.apk';
    const APK_LATEST_VERSION = '1.1.0-ota';

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

    function triggerDirectApkDownload() {
        const doc = root && root.document;
        try {
            if (root && root.NomeraAndroidBridge && typeof root.NomeraAndroidBridge.openExternalUrl === 'function') {
                root.NomeraAndroidBridge.openExternalUrl(APK_DOWNLOAD_URL);
                return true;
            }
        } catch (_) {}
        if (doc && typeof doc.createElement === 'function' && doc.body) {
            const a = doc.createElement('a');
            a.href = APK_DOWNLOAD_URL;
            a.download = 'nomera-bundled-ota.apk';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.style.display = 'none';
            doc.body.appendChild(a);
            try { a.click(); } catch (_) {}
            setTimeout(() => { try { a.remove(); } catch (_) {} }, 1000);
        }
        try {
            if (root && typeof root.open === 'function') {
                root.open(APK_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
            }
        } catch (_) {}
        return true;
    }

    async function shareOrOpenApkUrl() {
        try {
            if (root && root.navigator && typeof root.navigator.share === 'function') {
                await root.navigator.share({
                    title: 'Номера — Android APK (с иконкой)',
                    text: 'Скачать обновлённый APK с фирменной иконкой А777АА:',
                    url: APK_DOWNLOAD_URL
                });
                return true;
            }
        } catch (_) {}
        return triggerDirectApkDownload();
    }

    async function copyApkUrlToClipboard() {
        const doc = root && root.document;
        try {
            if (root && root.navigator && root.navigator.clipboard && typeof root.navigator.clipboard.writeText === 'function') {
                await root.navigator.clipboard.writeText(APK_DOWNLOAD_URL);
                if (typeof root.notifyUser === 'function') {
                    root.notifyUser('📋 Ссылка на APK скопирована! Вставьте её в Chrome для скачивания.', 'success');
                }
                return true;
            }
        } catch (_) {}
        if (doc && typeof doc.createElement === 'function' && doc.body) {
            const ta = doc.createElement('textarea');
            ta.value = APK_DOWNLOAD_URL;
            ta.style.cssText = 'position:fixed;left:-9999px;top:0';
            doc.body.appendChild(ta);
            ta.focus();
            ta.select();
            try { doc.execCommand('copy'); } catch (_) {}
            ta.remove();
            if (typeof root.notifyUser === 'function') {
                root.notifyUser('📋 Ссылка на APK скопирована! Вставьте её в браузер.', 'success');
            }
            return true;
        }
        return false;
    }

    function openApkDownloadModal() {
        const doc = root && root.document;
        if (!doc || !doc.body) return null;
        let modal = doc.getElementById('nomera-apk-download-modal');
        if (!modal) {
            modal = doc.createElement('div');
            modal.id = 'nomera-apk-download-modal';
            modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(6,12,22,0.88);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
            modal.innerHTML = `
                <div style="width:100%;max-width:440px;background:linear-gradient(160deg,#14253b,#0c1726);border:1px solid #48739e;border-radius:14px;padding:20px;color:#e7f2ff;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,0.75);">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="width:42px;height:42px;border-radius:10px;background:#193452;border:1px solid #659bd0;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;color:#d9fb6a;">777</div>
                            <div>
                                <div style="font-size:16px;font-weight:800;color:#fff;">Обновление APK (${APK_LATEST_VERSION})</div>
                                <div style="font-size:11px;color:#93b3d6;">Фирменная иконка А777АА • Защита от жестов</div>
                            </div>
                        </div>
                        <button type="button" id="btn-close-apk-modal" style="background:#1e344d;border:1px solid #43668a;color:#cbe0f7;border-radius:8px;width:36px;height:36px;font-size:16px;font-weight:700;cursor:pointer;">✕</button>
                    </div>
                    <p style="font-size:12px;line-height:1.55;color:#b8d0eb;margin:0 0 14px;">
                        Игровые файлы и управление уже обновляются по облаку автоматически. Чтобы получить <b>новую иконку приложения на рабочем столе</b>, скачайте и установите свежий APK поверх текущего (ваш прогресс и гараж полностью сохранятся):
                    </p>
                    <div style="display:grid;gap:9px;margin-bottom:12px;">
                        <button type="button" id="btn-apk-direct-dl" style="min-height:48px;border-radius:9px;border:1px solid #d9fb6a;background:#d9fb6a;color:#142008;font:800 13px system-ui;cursor:pointer;padding:10px 14px;">
                            📲 Скачать APK напрямую (${APK_LATEST_VERSION})
                        </button>
                        <button type="button" id="btn-apk-share-open" style="min-height:46px;border-radius:9px;border:1px solid #5987b8;background:#1c3756;color:#e8f3ff;font:700 12px system-ui;cursor:pointer;padding:10px 14px;">
                            🌐 Открыть через меню Android (Chrome / Браузер)
                        </button>
                        <button type="button" id="btn-apk-copy-url" style="min-height:44px;border-radius:9px;border:1px solid #3f6082;background:#13263c;color:#bfd8f2;font:600 12px system-ui;cursor:pointer;padding:9px 14px;">
                            📋 Скопировать прямую ссылку на APK
                        </button>
                    </div>
                    <div style="background:#091320;border:1px solid #2b4562;border-radius:8px;padding:8px 10px;font:11px/1.4 monospace;color:#8fb4dc;word-break:break-all;user-select:all;-webkit-user-select:all;">
                        ${APK_DOWNLOAD_URL}
                    </div>
                </div>
            `;
            doc.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.hidden = true;
            });
            const closeBtn = modal.querySelector('#btn-close-apk-modal');
            if (closeBtn) closeBtn.addEventListener('click', () => { modal.hidden = true; });
            const dlBtn = modal.querySelector('#btn-apk-direct-dl');
            if (dlBtn) dlBtn.addEventListener('click', () => triggerDirectApkDownload());
            const shareBtn = modal.querySelector('#btn-apk-share-open');
            if (shareBtn) shareBtn.addEventListener('click', () => shareOrOpenApkUrl());
            const copyBtn = modal.querySelector('#btn-apk-copy-url');
            if (copyBtn) copyBtn.addEventListener('click', () => copyApkUrlToClipboard());
        }
        modal.hidden = false;
        modal.style.display = 'flex';
        const origHiddenDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidden');
        if (origHiddenDesc) {
            modal.querySelector('#btn-close-apk-modal').onclick = () => {
                modal.hidden = true;
                modal.style.display = 'none';
            };
        }
        return modal;
    }

    function mountApkUpdateBanner() {
        const doc = root && root.document;
        if (!doc || !doc.body) return;
        let clientVersion = null;
        try {
            if (root && root.NomeraAndroidBridge && typeof root.NomeraAndroidBridge.getClientInfo === 'function') {
                const info = JSON.parse(root.NomeraAndroidBridge.getClientInfo() || '{}');
                clientVersion = info.versionName || null;
            }
        } catch (_) {}

        // 1. Add a compact "📲 APK" button in the top header bar so user can always re-download APK
        if (!doc.getElementById('nomera-header-apk-btn')) {
            const hostBar = doc.querySelector('.ae-edition-bar') || doc.querySelector('.brand-bar .header-actions') || doc.querySelector('.brand-bar');
            if (hostBar) {
                const btn = doc.createElement('button');
                btn.type = 'button';
                btn.id = 'nomera-header-apk-btn';
                btn.textContent = clientVersion === '1.0.0-ota' ? '📲 Скачать APK (с иконкой!)' : '📲 APK';
                btn.style.cssText = 'min-height:34px;padding:6px 11px;border-radius:7px;border:1px solid #86b355;background:#1e3620;color:#d9fb6a;font:700 11px system-ui;cursor:pointer;margin-left:8px;flex-shrink:0;';
                btn.addEventListener('click', () => openApkDownloadModal());
                hostBar.appendChild(btn);
            }
        }

        // 2. If running inside the old 1.0.0-ota APK (without launcher icon), show a prominent top banner
        if (clientVersion === '1.0.0-ota' && !doc.getElementById('nomera-apk-upgrade-banner')) {
            const banner = doc.createElement('div');
            banner.id = 'nomera-apk-upgrade-banner';
            banner.style.cssText = 'position:sticky;top:0;z-index:9990;background:linear-gradient(90deg,#1a3320,#162c46);border-bottom:1px solid #86b355;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;color:#eaf6ff;font:700 11px/1.35 system-ui;';
            banner.innerHTML = `
                <span>🎨 Вышел новый APK <b>${APK_LATEST_VERSION}</b> с фирменной иконкой А777АА!</span>
                <button type="button" id="nomera-apk-upgrade-cta" style="min-height:34px;padding:6px 12px;border-radius:7px;border:1px solid #d9fb6a;background:#d9fb6a;color:#152208;font:800 11px system-ui;cursor:pointer;white-space:nowrap;">📲 Скачать APK</button>
            `;
            doc.body.prepend(banner);
            const cta = banner.querySelector('#nomera-apk-upgrade-cta');
            if (cta) cta.addEventListener('click', () => openApkDownloadModal());
        }
    }

    if (root && typeof root.addEventListener === 'function') {
        root.openNomeraApkDownloadModal = openApkDownloadModal;
        root.onNomeraAndroidOtaEvent = function (evt) {
            if (!evt || typeof evt !== 'object') return;
            if (evt.phase === 'complete' && evt.updated) {
                const dl = Number(evt.downloadedCount) || 0;
                const rm = Number(evt.deletedCount) || 0;
                if (typeof root.notifyUser === 'function') {
                    root.notifyUser(
                        `📲 Автообновление клиента: загружено ${dl} файл(ов)${rm > 0 ? `, удалено ${rm} устаревших текстур` : ''}!`,
                        'success'
                    );
                }
                if (!root.isRaceRunning && root.location && typeof root.location.reload === 'function') {
                    setTimeout(() => {
                        if (!root.isRaceRunning) root.location.reload();
                    }, 1500);
                }
            }
        };
        if (root.document && root.document.readyState === 'loading') {
            root.document.addEventListener('DOMContentLoaded', () => mountApkUpdateBanner(), { once: true });
        } else {
            setTimeout(() => mountApkUpdateBanner(), 0);
        }
    }

    return {
        APK_DOWNLOAD_URL,
        APK_LATEST_VERSION,
        computeDeltaPlan,
        syncWithServer,
        normalizePath,
        openApkDownloadModal,
        mountApkUpdateBanner
    };
});

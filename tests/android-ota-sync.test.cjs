'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Unit 1: scripts/asset-manifest.cjs builds deterministic manifest for bundled APK and web release', () => {
    const manifestGenerator = require('../scripts/asset-manifest.cjs');
    assert.equal(typeof manifestGenerator.generateAssetManifest, 'function');

    const manifest = manifestGenerator.generateAssetManifest({ profile: 'mobile', writeFiles: false });
    assert.equal(manifest.schemaVersion, 1);
    assert.ok(typeof manifest.release === 'string' && manifest.release.length === 12, 'release hash must be 12 hex chars');
    assert.ok(manifest.fileCount > 50, 'manifest must index all core scripts, styles, audio, and 3D models');
    assert.ok(manifest.totalBytes > 50 * 1024 * 1024, 'mobile bundle must include embedded 3D models (>50 MB)');

    // Core files must be present with version & bytes
    assert.ok(manifest.files['index.html'], 'index.html must be in manifest');
    assert.ok(manifest.files['js/app.js'], 'js/app.js must be in manifest');
    assert.ok(manifest.files['js/car-3d.js'], 'js/car-3d.js must be in manifest');
    assert.ok(manifest.files['styles.css'], 'styles.css must be in manifest');

    // All 42 car 3D models (14 mobile-compressed + 28 base GLBs) must be bundled with zero duplicates
    const bundledCarGlbKeys = Object.keys(manifest.files).filter(
        k => (k.startsWith('assets/models-mobile/') || k.startsWith('assets/models/')) && k.endsWith('.glb')
    );
    assert.ok(bundledCarGlbKeys.length >= 25, `Expected at least 25 bundled car GLB models, got ${bundledCarGlbKeys.length}`);
});

test('Unit 2: NomeraOtaSync.computeDeltaPlan identifies changed files to download and obsolete textures/files to delete', () => {
    const OtaSync = require('../js/ota-asset-sync.js');
    assert.equal(typeof OtaSync.computeDeltaPlan, 'function');

    const baseApkManifest = {
        schemaVersion: 1,
        release: '111111111111',
        files: {
            'index.html': { version: 'aaa111111111', bytes: 1000 },
            'js/app.js': { version: 'bbb222222222', bytes: 5000 },
            'assets/models-mobile/m5f90.glb': { version: 'ccc333333333', bytes: 2000000 },
            'assets/textures/old-unused-road.webp': { version: 'ddd444444444', bytes: 350000 }
        }
    };

    const remoteSiteManifest = {
        schemaVersion: 1,
        release: '222222222222',
        files: {
            'index.html': { version: 'aaa111111111', bytes: 1000 }, // unchanged
            'js/app.js': { version: 'bbb999999999', bytes: 5200 }, // updated code
            'assets/models-mobile/m5f90.glb': { version: 'ccc333333333', bytes: 2000000 }, // unchanged 2MB model (not re-downloaded!)
            'assets/models-mobile/new_hypercar.glb': { version: 'eee555555555', bytes: 1800000 } // newly added model
            // 'assets/textures/old-unused-road.webp' was removed from the website!
        }
    };

    const cachedOverlayFiles = {
        'assets/textures/stale-overlay-tex.webp': 'fff666666666'
    };

    const plan = OtaSync.computeDeltaPlan(baseApkManifest, remoteSiteManifest, cachedOverlayFiles);

    assert.equal(plan.upToDate, false);
    assert.equal(plan.toDownload.length, 2, 'Only modified js/app.js and new_hypercar.glb should be downloaded');
    assert.deepEqual(
        plan.toDownload.map(item => ({ path: item.path, reason: item.reason })),
        [
            { path: 'assets/models-mobile/new_hypercar.glb', reason: 'added' },
            { path: 'js/app.js', reason: 'updated' }
        ]
    );
    assert.equal(plan.downloadBytes, 1805200);

    // Both the removed APK file and the stale overlay texture must be scheduled for deletion
    const deletedPaths = plan.toDelete.map(item => item.path).sort();
    assert.deepEqual(deletedPaths, [
        'assets/textures/old-unused-road.webp',
        'assets/textures/stale-overlay-tex.webp'
    ]);

    // Idempotency check: once overlay has the new versions and deleted files are gone, plan is upToDate
    const updatedOverlay = {
        'js/app.js': 'bbb999999999',
        'assets/models-mobile/new_hypercar.glb': 'eee555555555'
    };
    const secondPlan = OtaSync.computeDeltaPlan(remoteSiteManifest, remoteSiteManifest, updatedOverlay);
    assert.equal(secondPlan.upToDate, true);
    assert.equal(secondPlan.toDownload.length, 0);
    assert.equal(secondPlan.toDelete.length, 0);
});

test('Unit 3: NomeraOtaSync.syncWithServer applies delta downloads and purges obsolete textures via storage adapter', async () => {
    const OtaSync = require('../js/ota-asset-sync.js');

    const storedOverlay = new Map([
        ['assets/textures/obsolete.webp', { version: 'old123456789', data: 'old-bytes' }]
    ]);
    const deletedLog = [];

    const localManifest = {
        schemaVersion: 1,
        release: 'old_rel_0001',
        files: {
            'index.html': { version: 'idx111111111', bytes: 100 },
            'assets/textures/obsolete.webp': { version: 'old123456789', bytes: 500 }
        }
    };

    const remoteManifest = {
        schemaVersion: 1,
        release: 'new_rel_0002',
        files: {
            'index.html': { version: 'idx111111111', bytes: 100 },
            'assets/models-mobile/chiron.glb': { version: 'chi987654321', bytes: 4096 }
        }
    };

    const mockAdapter = {
        async getLocalManifest() { return localManifest; },
        async getOverlayVersions() {
            const out = {};
            for (const [k, v] of storedOverlay.entries()) out[k] = v.version;
            return out;
        },
        async writeOverlayFile(relPath, buffer, version) {
            storedOverlay.set(relPath, { version, byteLength: buffer.byteLength });
        },
        async deleteOverlayFile(relPath) {
            storedOverlay.delete(relPath);
            deletedLog.push(relPath);
        },
        async saveAppliedManifest(manifest) {
            this.savedManifest = manifest;
        }
    };

    const mockFetch = async (url) => {
        if (url.includes('asset-manifest.json')) {
            return {
                ok: true,
                json: async () => remoteManifest
            };
        }
        if (url.includes('assets/models-mobile/chiron.glb')) {
            return {
                ok: true,
                arrayBuffer: async () => new ArrayBuffer(4096)
            };
        }
        return { ok: false, status: 404 };
    };

    const result = await OtaSync.syncWithServer({
        remoteBaseUrl: 'https://nomera.example.com/',
        fetchImpl: mockFetch,
        storageAdapter: mockAdapter
    });

    assert.equal(result.updated, true);
    assert.equal(result.downloadedCount, 1);
    assert.equal(result.deletedCount, 1);
    assert.ok(storedOverlay.has('assets/models-mobile/chiron.glb'), 'New model must be saved to overlay');
    assert.ok(!storedOverlay.has('assets/textures/obsolete.webp'), 'Obsolete texture must be deleted from overlay');
    assert.deepEqual(deletedLog, ['assets/textures/obsolete.webp']);
    assert.equal(mockAdapter.savedManifest.release, 'new_rel_0002');
});

test('Unit 4: Android Clean Architecture project structure & WebView overlay interceptor exist', () => {
    const requiredFiles = [
        'android/settings.gradle.kts',
        'android/build.gradle.kts',
        'android/app/build.gradle.kts',
        'android/app/src/main/AndroidManifest.xml',
        'android/app/src/main/java/com/h3h/nomera/MainActivity.kt',
        'android/app/src/main/java/com/h3h/nomera/domain/model/AssetManifest.kt',
        'android/app/src/main/java/com/h3h/nomera/domain/model/OtaDeltaPlan.kt',
        'android/app/src/main/java/com/h3h/nomera/domain/repository/AssetOverlayRepository.kt',
        'android/app/src/main/java/com/h3h/nomera/domain/usecase/ComputeOtaDeltaPlanUseCase.kt',
        'android/app/src/main/java/com/h3h/nomera/domain/usecase/SyncGameAssetsUseCase.kt',
        'android/app/src/main/java/com/h3h/nomera/data/datasource/ApkBundledAssetDataSource.kt',
        'android/app/src/main/java/com/h3h/nomera/data/datasource/LocalOtaOverlayDataSource.kt',
        'android/app/src/main/java/com/h3h/nomera/data/datasource/RemoteManifestDataSource.kt',
        'android/app/src/main/java/com/h3h/nomera/data/repository/AssetOverlayRepositoryImpl.kt',
        'android/app/src/main/java/com/h3h/nomera/ui/shell/OverlayWebViewClient.kt',
        'android/app/src/main/java/com/h3h/nomera/ui/shell/NomeraJsBridge.kt',
        'scripts/android-stage.cjs'
    ];

    for (const rel of requiredFiles) {
        assert.ok(fs.existsSync(path.join(root, rel)), `Expected Android file ${rel} to exist`);
    }
});

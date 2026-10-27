'use strict';
/**
 * Stages all embedded game files + asset-manifest.json into android/app/src/main/assets/public/
 * so the Android APK contains 100% of models, textures, audio, and scripts with zero network wait.
 */
const fs = require('node:fs');
const path = require('node:path');
const { generateAssetManifest } = require('./asset-manifest.cjs');

const root = path.resolve(__dirname, '..');
const androidPublicDir = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public');

function stageAndroidAssets({ profile = 'mobile' } = {}) {
    const manifest = generateAssetManifest({ sourceDir: root, profile, writeFiles: true });

    fs.rmSync(androidPublicDir, { recursive: true, force: true });
    fs.mkdirSync(androidPublicDir, { recursive: true });

    for (const relPath of Object.keys(manifest.files)) {
        const srcFile = path.join(root, relPath);
        const destFile = path.join(androidPublicDir, relPath);
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        fs.copyFileSync(srcFile, destFile);
    }

    fs.writeFileSync(
        path.join(androidPublicDir, 'asset-manifest.json'),
        JSON.stringify(manifest, null, 2) + '\n'
    );

    // Ensure local.properties points to local Android SDK if available on developer machine
    const localSdk = process.env.ANDROID_HOME ||
        (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : '');
    if (localSdk && fs.existsSync(localSdk)) {
        const escapedSdk = localSdk.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
        fs.writeFileSync(
            path.join(root, 'android', 'local.properties'),
            `sdk.dir=${escapedSdk}\n`
        );
    }

    return {
        release: manifest.release,
        fileCount: manifest.fileCount,
        totalBytes: manifest.totalBytes,
        androidPublicDir
    };
}

if (require.main === module) {
    const info = stageAndroidAssets({ profile: 'mobile' });
    console.log(
        `Staged ${info.fileCount} embedded files (${(info.totalBytes / (1024 * 1024)).toFixed(2)} MB, release ${info.release}) -> ${info.androidPublicDir}`
    );
}

module.exports = { stageAndroidAssets };

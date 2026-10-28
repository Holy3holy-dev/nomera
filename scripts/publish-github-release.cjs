#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const REPO = 'Holy3holy-dev/nomera';
const TAG = process.env.NOMERA_RELEASE_TAG || 'v1.1.0-ota';
const ASSET_NAME = 'nomera-bundled-ota.apk';

function resolveGitHubToken() {
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
    try {
        const remoteUrl = execSync('git config --get remote.origin.url', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
        const match = remoteUrl.match(/https:\/\/([^@]+)@github\.com\//);
        if (match && match[1]) {
            const creds = match[1];
            return creds.includes(':') ? creds.split(':').slice(1).join(':') : creds;
        }
    } catch (_) {}
    throw new Error('GitHub token not found in GITHUB_TOKEN or git remote.origin.url');
}

async function githubRequest(url, token, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'nomera-release-publisher',
            ...(options.headers || {})
        }
    });
    return res;
}

async function publishApkRelease() {
    const apkPath = [
        path.join(ROOT_DIR, ASSET_NAME),
        path.join(ROOT_DIR, 'dist', ASSET_NAME),
        path.join(ROOT_DIR, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
    ].find(p => fs.existsSync(p));

    if (!apkPath) {
        throw new Error(`APK file not found. Run "node scripts/build.cjs" first.`);
    }

    const token = resolveGitHubToken();
    const apkBytes = fs.readFileSync(apkPath);
    console.log(`[github-release] Publishing ${ASSET_NAME} (${(apkBytes.length / (1024 * 1024)).toFixed(2)} MB) to ${REPO} (${TAG})...`);

    // 1. Find or create release by tag
    let release = null;
    const byTagRes = await githubRequest(`https://api.github.com/repos/${REPO}/releases/tags/${TAG}`, token);
    if (byTagRes.ok) {
        release = await byTagRes.json();
    } else {
        const createRes = await githubRequest(`https://api.github.com/repos/${REPO}/releases`, token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tag_name: TAG,
                target_commitish: 'main',
                name: `Номера Android APK ${TAG} (С фирменной иконкой А777АА + Защита от жестов)`,
                body: [
                    `### 📲 Номера — Android APK (${TAG})`,
                    `- 🎨 **Фирменная адаптивная иконка** приложения с номером \`А777АА 777 RUS\``,
                    `- 🏎️ **Ручной газ по умолчанию** + плавный разворот с заднего хода без принудительного центрирования руля`,
                    `- 🛡️ **Защита от вызова голосового помощника** и системных жестов по краям экрана во время поворотов`,
                    `- ☁️ **Встроенное меню перекачки APK** прямо внутри приложения + автообновление ассетов по облаку`
                ].join('\n'),
                draft: false,
                prerelease: false
            })
        });
        if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`Failed to create GitHub release: ${createRes.status} ${errText}`);
        }
        release = await createRes.json();
    }

    // 2. Delete existing asset with same name if present
    if (Array.isArray(release.assets)) {
        for (const asset of release.assets) {
            if (asset.name === ASSET_NAME) {
                console.log(`[github-release] Removing previous asset ${ASSET_NAME} (id=${asset.id})...`);
                await githubRequest(`https://api.github.com/repos/${REPO}/releases/assets/${asset.id}`, token, {
                    method: 'DELETE'
                });
            }
        }
    }

    // 3. Upload APK binary to uploads.github.com
    const uploadUrl = `https://uploads.github.com/repos/${REPO}/releases/${release.id}/assets?name=${encodeURIComponent(ASSET_NAME)}`;
    const uploadRes = await githubRequest(uploadUrl, token, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Length': String(apkBytes.length)
        },
        body: apkBytes
    });

    if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Failed to upload APK asset: ${uploadRes.status} ${errText}`);
    }

    const uploaded = await uploadRes.json();
    console.log(`[github-release] Uploaded successfully: ${uploaded.browser_download_url}`);
    return uploaded;
}

if (require.main === module) {
    publishApkRelease().catch(err => {
        console.error('[github-release] Error:', err.message);
        process.exit(1);
    });
}

module.exports = { publishApkRelease };

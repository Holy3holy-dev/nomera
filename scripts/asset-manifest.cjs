'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');

const ROOT_FILES = [
    'index.html',
    'legacy.html',
    'authors-release.html',
    'authors.html',
    'manifest.json',
    'sw.js',
    'styles.css',
    'authors-legacy.css',
    'authors.css',
    'authors-expansion.css',
    'authors-secondary.css',
    'authors-plate-effects.css',
    'authors-rewards.css',
    'authors-refinement.css',
    'authors-motorsport.css',
    'authors-driving.css',
    'authors-workshop.css',
    'authors-prestige.css',
    'authors-atelier.css',
    'authors-garage.css',
    'authors-exchange.css',
    'authors-registration.css',
    'authors-progression.css',
    'authors-sound.css',
    'authors-reel-motion.css',
    'authors-case-results.css',
    'authors-collection.css'
];

const ASSET_DIRS = ['js', 'icons', 'assets'];

function sha256Short(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
}

function walkDirRelative(baseDir, relDir, out = []) {
    const absDir = path.join(baseDir, relDir);
    if (!fs.existsSync(absDir)) return out;
    const entries = fs.readdirSync(absDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
        const relPath = path.posix.join(relDir.replace(/\\/g, '/'), entry.name);
        if (entry.isDirectory()) {
            walkDirRelative(baseDir, relPath, out);
        } else if (entry.isFile()) {
            out.push(relPath);
        }
    }
    return out;
}

function generateAssetManifest({
    sourceDir = root,
    profile = 'mobile',
    writeFiles = true
} = {}) {
    const mobileModelsDir = path.join(sourceDir, 'assets', 'models-mobile');
    const mobileModelNames = new Set(
        fs.existsSync(mobileModelsDir)
            ? fs.readdirSync(mobileModelsDir).filter(f => f.endsWith('.glb'))
            : []
    );

    const candidatePaths = [];
    for (const rf of ROOT_FILES) {
        if (fs.existsSync(path.join(sourceDir, rf))) {
            candidatePaths.push(rf);
        }
    }
    for (const dir of ASSET_DIRS) {
        walkDirRelative(sourceDir, dir, candidatePaths);
    }

    const files = {};
    let totalBytes = 0;
    const hashParts = [];

    for (const relPath of candidatePaths.sort()) {
        if (profile === 'mobile' && relPath.startsWith('assets/models/')) {
            const baseName = path.posix.basename(relPath);
            if (mobileModelNames.has(baseName)) {
                // Mobile APK bundles assets/models-mobile/<name>.glb and aliases assets/models/<name>.glb to it
                continue;
            }
        }
        const absPath = path.join(sourceDir, relPath);
        if (!fs.existsSync(absPath)) continue;
        const buf = fs.readFileSync(absPath);
        const version = sha256Short(buf);
        const bytes = buf.length;
        files[relPath] = { version, bytes };
        totalBytes += bytes;
        hashParts.push(`${relPath}:${version}:${bytes}`);
    }

    const release = sha256Short(Buffer.from(hashParts.join('\n'), 'utf8'));
    const manifest = {
        schemaVersion: 1,
        profile,
        release,
        fileCount: Object.keys(files).length,
        totalBytes,
        files
    };

    if (writeFiles) {
        const jsonText = JSON.stringify(manifest, null, 2) + '\n';
        fs.writeFileSync(path.join(root, 'asset-manifest.json'), jsonText);
        const distDir = path.join(root, 'dist');
        if (fs.existsSync(distDir)) {
            fs.writeFileSync(path.join(distDir, 'asset-manifest.json'), jsonText);
        }
    }

    return manifest;
}

if (require.main === module) {
    const manifest = generateAssetManifest({ profile: 'mobile', writeFiles: true });
    console.log(
        `Generated asset-manifest.json: release=${manifest.release}, files=${manifest.fileCount}, size=${(manifest.totalBytes / (1024 * 1024)).toFixed(2)} MB`
    );
}

module.exports = {
    generateAssetManifest,
    sha256Short
};

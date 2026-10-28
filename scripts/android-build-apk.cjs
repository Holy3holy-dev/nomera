'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { stageAndroidAssets } = require('./android-stage.cjs');

const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'android');

function findJavaHome() {
    if (process.env.JAVA_HOME && fs.existsSync(path.join(process.env.JAVA_HOME, 'bin', 'java.exe'))) {
        return process.env.JAVA_HOME;
    }
    const studioJbr = 'C:\\Program Files\\Android\\Android Studio\\jbr';
    if (fs.existsSync(path.join(studioJbr, 'bin', 'java.exe'))) {
        return studioJbr;
    }
    return null;
}

function findGradleBinary() {
    const userProfile = process.env.USERPROFILE || process.env.HOME || '';
    const distsDir = path.join(userProfile, '.gradle', 'wrapper', 'dists');
    if (fs.existsSync(distsDir)) {
        const versions = fs.readdirSync(distsDir).filter(d => d.startsWith('gradle-')).sort().reverse();
        for (const verDir of versions) {
            const hashDirs = fs.readdirSync(path.join(distsDir, verDir));
            for (const h of hashDirs) {
                const subDirs = fs.readdirSync(path.join(distsDir, verDir, h));
                for (const sub of subDirs) {
                    const bat = path.join(distsDir, verDir, h, sub, 'bin', process.platform === 'win32' ? 'gradle.bat' : 'gradle');
                    if (fs.existsSync(bat)) return bat;
                }
            }
        }
    }
    return process.platform === 'win32' ? 'gradle.bat' : 'gradle';
}

function canBuildApkLocally() {
    const javaHome = findJavaHome();
    const gradleBin = findGradleBinary();
    const localSdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : '');
    return Boolean(javaHome && gradleBin && localSdk && fs.existsSync(localSdk));
}

function buildApk(options = {}) {
    if (!options.skipWebBuild) {
        process.env.NOMERA_SKIP_ANDROID_BUILD = '1';
        require('./build.cjs');
    }
    const staged = stageAndroidAssets({ profile: 'mobile' });
    console.log(`Staged ${staged.fileCount} files (${(staged.totalBytes / (1024 * 1024)).toFixed(2)} MB, release ${staged.release})`);

    const javaHome = findJavaHome();
    const gradleBin = findGradleBinary();
    const env = Object.assign({}, process.env);
    if (javaHome) {
        env.JAVA_HOME = javaHome;
        env.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${env.PATH || ''}`;
    }
    const localSdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT || (env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, 'Android', 'Sdk') : '');
    if (localSdk && fs.existsSync(localSdk)) {
        env.ANDROID_HOME = localSdk;
        env.ANDROID_SDK_ROOT = localSdk;
    }

    console.log(`Using JAVA_HOME=${env.JAVA_HOME || 'system'}`);
    console.log(`Using Gradle=${gradleBin}`);

    const res = spawnSync(gradleBin, ['assembleDebug', '--no-daemon'], {
        cwd: androidDir,
        env,
        stdio: 'inherit',
        shell: true
    });

    if (res.status !== 0) {
        process.exit(res.status || 1);
    }

    const builtApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    const outApk = path.join(root, 'nomera-bundled-ota.apk');
    if (fs.existsSync(builtApk)) {
        fs.copyFileSync(builtApk, outApk);
        const sizeMb = (fs.statSync(outApk).size / (1024 * 1024)).toFixed(2);
        console.log(`APK built successfully: ${outApk} (${sizeMb} MB)`);
    }
}

if (require.main === module) {
    buildApk();
}

module.exports = { buildApk, canBuildApkLocally, findJavaHome, findGradleBinary };

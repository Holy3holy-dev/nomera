'use strict';
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const androidResDir = path.join(root, 'android', 'app', 'src', 'main', 'res');
const webIconsDir = path.join(root, 'icons');

function buildIconSvg({ round = false } = {}) {
    const rx = round ? 256 : 112;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070B14"/>
      <stop offset="55%" stop-color="#120912"/>
      <stop offset="100%" stop-color="#1F0B16"/>
    </linearGradient>
    <radialGradient id="neonGlow" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="#FF2E4C" stop-opacity="0.42"/>
      <stop offset="55%" stop-color="#F59E0B" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#070B14" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="crimsonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF2E4C"/>
      <stop offset="100%" stop-color="#F97316"/>
    </linearGradient>
    <linearGradient id="plateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E2E8F0"/>
    </linearGradient>
  </defs>

  <!-- Base Icon Shape -->
  <rect x="0" y="0" width="512" height="512" rx="${rx}" fill="url(#bgGrad)"/>
  <rect x="0" y="0" width="512" height="512" rx="${rx}" fill="url(#neonGlow)"/>
  <rect x="10" y="10" width="492" height="492" rx="${Math.max(0, rx - 8)}" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-opacity="0.45"/>

  <!-- Speed Diagonal Stripes -->
  <path d="M70 430 L170 70 L205 70 L105 430 Z" fill="#FF2E4C" fill-opacity="0.10"/>
  <path d="M120 430 L220 70 L240 70 L140 430 Z" fill="#F59E0B" fill-opacity="0.08"/>

  <!-- VIP Golden Crown Emblem -->
  <path d="M196 118 L224 148 L256 102 L288 148 L316 118 L304 166 L208 166 Z" fill="url(#goldGrad)"/>
  <rect x="208" y="172" width="96" height="8" rx="4" fill="url(#goldGrad)"/>

  <!-- Aggressive Sports Car Front Silhouette & Neon Headlights -->
  <path d="M116 254 L158 196 L354 196 L396 254 L416 278 L96 278 Z" fill="#0F172A" stroke="url(#crimsonGrad)" stroke-width="5"/>
  <!-- Left & Right Angel-Eye Headlights -->
  <polygon points="122,250 184,244 176,262 114,264" fill="#38BDF8"/>
  <polygon points="390,250 328,244 336,262 398,264" fill="#38BDF8"/>
  <polygon points="128,252 178,247 172,259 122,261" fill="#E0F2FE"/>
  <polygon points="384,252 334,247 340,259 390,261" fill="#E0F2FE"/>

  <!-- Russian VIP License Plate (A 777 AA | 77 RUS) -->
  <g transform="translate(52, 266)">
    <!-- Outer Plate Shadow / Glow -->
    <rect x="-4" y="-4" width="416" height="116" rx="20" fill="url(#goldGrad)" fill-opacity="0.85"/>
    <!-- Plate Body -->
    <rect x="0" y="0" width="408" height="108" rx="16" fill="url(#plateGrad)" stroke="#0F172A" stroke-width="6"/>
    <!-- Region Partition Line -->
    <line x1="304" y1="4" x2="304" y2="104" stroke="#0F172A" stroke-width="5"/>

    <!-- Main Plate Characters: A 777 AA -->
    <text x="152" y="78" text-anchor="middle" font-family="Montserrat, Arial Black, Impact, sans-serif" font-weight="900" font-size="64" fill="#090D16" letter-spacing="2">А777АА</text>

    <!-- Region Code: 77 -->
    <text x="355" y="54" text-anchor="middle" font-family="Montserrat, Arial Black, Impact, sans-serif" font-weight="900" font-size="44" fill="#090D16">77</text>

    <!-- RUS + Tricolor Flag -->
    <text x="336" y="88" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="20" fill="#090D16">RUS</text>
    <g transform="translate(364, 70)">
      <rect x="0" y="0" width="28" height="6" fill="#FFFFFF" stroke="#475569" stroke-width="0.8"/>
      <rect x="0" y="6" width="28" height="6" fill="#1D4ED8"/>
      <rect x="0" y="12" width="28" height="6" fill="#DC2626"/>
    </g>
  </g>

  <!-- Bottom Brand Title: NOMERA -->
  <text x="256" y="438" text-anchor="middle" font-family="Montserrat, Arial Black, sans-serif" font-weight="900" font-size="42" fill="#F8FAFC" letter-spacing="9">NOMERA</text>
  <rect x="156" y="452" width="200" height="5" rx="2.5" fill="url(#crimsonGrad)"/>
</svg>`;
}

function writeAdaptiveIconXmls() {
    const drawableDir = path.join(androidResDir, 'drawable');
    const anyDpiDir = path.join(androidResDir, 'mipmap-anydpi-v26');
    fs.mkdirSync(drawableDir, { recursive: true });
    fs.mkdirSync(anyDpiDir, { recursive: true });

    const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:pathData="M0,0h108v108h-108z">
        <aapt:attr name="android:fillColor">
            <gradient
                android:startX="0"
                android:startY="0"
                android:endX="108"
                android:endY="108"
                android:type="linear">
                <item android:offset="0.0" android:color="#FF070B14" />
                <item android:offset="0.55" android:color="#FF140912" />
                <item android:offset="1.0" android:color="#FF220A16" />
            </gradient>
        </aapt:attr>
    </path>
    <!-- Diagonal speed accent -->
    <path
        android:fillColor="#1AFF2E4C"
        android:pathData="M18,108 L46,0 L56,0 L28,108 Z" />
    <path
        android:fillColor="#14F59E0B"
        android:pathData="M32,108 L60,0 L66,0 L38,108 Z" />
</vector>
`;

    const fgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">

    <!-- Golden VIP Crown -->
    <path
        android:fillColor="#FFF59E0B"
        android:pathData="M41,25 L47,31 L54,22 L61,31 L67,25 L65,35 L43,35 Z" />
    <path
        android:fillColor="#FFFBBF24"
        android:pathData="M43,36.5 h22 v2 h-22 z" />

    <!-- Sports Car Hood & Neon Headlights -->
    <path
        android:fillColor="#FF0F172A"
        android:strokeColor="#FFFF2E4C"
        android:strokeWidth="1.2"
        android:pathData="M28,50 L36,40 L72,40 L80,50 L84,55 L24,55 Z" />
    <path
        android:fillColor="#FF38BDF8"
        android:pathData="M29,49.5 L41,48.5 L39.5,52 L27.5,52.5 Z" />
    <path
        android:fillColor="#FF38BDF8"
        android:pathData="M79,49.5 L67,48.5 L68.5,52 L80.5,52.5 Z" />

    <!-- Gold Plate Border -->
    <path
        android:fillColor="#FFF59E0B"
        android:pathData="M21,53 L87,53 C89.2,53 91,54.8 91,57 L91,73 C91,75.2 89.2,77 87,77 L21,77 C18.8,77 17,75.2 17,73 L17,57 C17,54.8 18.8,53 21,53 Z" />

    <!-- White Russian License Plate Body -->
    <path
        android:fillColor="#FFF8FAFC"
        android:strokeColor="#FF0F172A"
        android:strokeWidth="1.4"
        android:pathData="M22,54.5 L86,54.5 C87.7,54.5 89,55.8 89,57.5 L89,72.5 C89,74.2 87.7,75.5 86,75.5 L22,75.5 C20.3,75.5 19,74.2 19,72.5 L19,57.5 C19,55.8 20.3,54.5 22,54.5 Z" />

    <!-- Region Divider Line -->
    <path
        android:fillColor="#FF0F172A"
        android:pathData="M68.5,55 h1.4 v20 h-1.4 z" />

    <!-- Bold '777' Center Glyph -->
    <path
        android:fillColor="#FF090D16"
        android:pathData="M28,59 h10 v2.6 l-5.2,9.4 h-3.1 l5.1,-9.2 h-6.8 z M40.5,59 h10 v2.6 l-5.2,9.4 h-3.1 l5.1,-9.2 h-6.8 z M53,59 h10 v2.6 l-5.2,9.4 h-3.1 l5.1,-9.2 h-6.8 z" />

    <!-- Tricolor Flag in Region Box -->
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M74,67 h10 v1.6 h-10 z" />
    <path
        android:fillColor="#FF1D4ED8"
        android:pathData="M74,68.6 h10 v1.6 h-10 z" />
    <path
        android:fillColor="#FFDC2626"
        android:pathData="M74,70.2 h10 v1.6 h-10 z" />

    <!-- Region '77' Glyph -->
    <path
        android:fillColor="#FF090D16"
        android:pathData="M73,58 h5 v1.5 l-2.6,5 h-1.6 l2.5,-4.8 h-3.3 z M79.5,58 h5 v1.5 l-2.6,5 h-1.6 l2.5,-4.8 h-3.3 z" />

    <!-- Bottom Crimson Accent Bar -->
    <path
        android:fillColor="#FFFF2E4C"
        android:pathData="M34,82 h40 v2.2 h-40 z" />
</vector>
`;

    const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
`;

    fs.writeFileSync(path.join(drawableDir, 'ic_launcher_background.xml'), bgXml);
    fs.writeFileSync(path.join(drawableDir, 'ic_launcher_foreground.xml'), fgXml);
    fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher.xml'), adaptiveXml);
    fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher_round.xml'), adaptiveXml);
}

async function generateIcons() {
    writeAdaptiveIconXmls();

    const squareSvg = Buffer.from(buildIconSvg({ round: false }));
    const roundSvg = Buffer.from(buildIconSvg({ round: true }));

    const densities = [
        { folder: 'mipmap-mdpi', size: 48 },
        { folder: 'mipmap-hdpi', size: 72 },
        { folder: 'mipmap-xhdpi', size: 96 },
        { folder: 'mipmap-xxhdpi', size: 144 },
        { folder: 'mipmap-xxxhdpi', size: 192 }
    ];

    for (const { folder, size } of densities) {
        const dir = path.join(androidResDir, folder);
        fs.mkdirSync(dir, { recursive: true });
        await sharp(squareSvg).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(dir, 'ic_launcher.png'));
        await sharp(roundSvg).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(dir, 'ic_launcher_round.png'));
    }

    fs.mkdirSync(webIconsDir, { recursive: true });
    await sharp(squareSvg).resize(192, 192).png({ compressionLevel: 9 }).toFile(path.join(webIconsDir, 'icon-192.png'));
    await sharp(squareSvg).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(webIconsDir, 'icon-512.png'));

    console.log('Generated NOMERA Android adaptive icons + mipmap PNGs + Web PWA icons.');
}

if (require.main === module) {
    generateIcons().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { generateIcons };

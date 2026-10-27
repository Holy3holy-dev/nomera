/**
 * 🏎️ 3D Race Visual Effects Engine (VFX Specialist System)
 * High-performance visual effects for high-speed racing & drifting in Three.js
 * 
 * 1. Tire Smoke Billows:
 *    Volumetric, expanding, and fading tire smoke puffs generated at the rear wheels
 *    during burnouts, high slip angle drifts, and hard braking locks.
 * 2. Sparks on Collision:
 *    Dynamic bright orange/yellow sparks with gravity, scatter, and asphalt surface bounce
 *    when brushing against barriers, curbs, or traffic vehicles.
 * 3. Tire Skid Marks on Asphalt:
 *    Dark continuous skid mark ribbon decals on the road surface during intense slides,
 *    burnouts, and locked-wheel braking that persist and fade smoothly.
 * 4. Sensation of High Speed:
 *    Dynamic camera FOV widening approaching 250+ km/h and hypersonic speeds,
 *    peripheral speed streak lines, and peripheral motion blur vignette.
 * 5. Headlight & Taillight Beams:
 *    Vivid projected light cones onto the asphalt surface at night/sunset/rain,
 *    and realistic optical brake light flares with rear road red wash when braking.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.RaceEffectsManager = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Helper: procedural canvas texture with fallback
    function createProceduralTexture(type, THREE) {
        if (typeof document === 'undefined') return null;
        try {
            const canvas = document.createElement('canvas');
            if (!canvas || typeof canvas.getContext !== 'function') return null;
            const ctx = canvas.getContext('2d');
            if (!ctx || typeof ctx.createRadialGradient !== 'function') return null;

            if (type === 'headlightGround') {
                canvas.width = 256;
                canvas.height = 512;
                if (typeof ctx.clearRect === 'function') ctx.clearRect(0, 0, 256, 512);

                // Smooth, soft asphalt ground illumination patch projecting forward on the road
                // Feathers smoothly and completely to 0 alpha at all borders (zero hard polygonal edges)
                if (typeof ctx.save === 'function' && typeof ctx.scale === 'function' && typeof ctx.translate === 'function') {
                    ctx.save();
                    ctx.translate(128, 230);
                    ctx.scale(1.0, 2.1);
                    const grad = ctx.createRadialGradient(0, -35, 6, 0, 0, 110);
                    grad.addColorStop(0.00, 'rgba(255, 255, 255, 0.95)');
                    grad.addColorStop(0.15, 'rgba(242, 248, 255, 0.75)');
                    grad.addColorStop(0.38, 'rgba(215, 235, 255, 0.42)');
                    grad.addColorStop(0.65, 'rgba(175, 210, 255, 0.16)');
                    grad.addColorStop(0.85, 'rgba(140, 190, 255, 0.04)');
                    grad.addColorStop(1.00, 'rgba(120, 180, 255, 0.00)');

                    ctx.fillStyle = grad;
                    if (typeof ctx.arc === 'function') {
                        ctx.beginPath();
                        ctx.arc(0, 0, 110, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (typeof ctx.fillRect === 'function') {
                        ctx.fillRect(-110, -110, 220, 220);
                    }
                    ctx.restore();
                } else {
                    const grad = ctx.createRadialGradient(128, 195, 8, 128, 230, 200);
                    grad.addColorStop(0.00, 'rgba(255, 255, 255, 0.95)');
                    grad.addColorStop(0.15, 'rgba(242, 248, 255, 0.75)');
                    grad.addColorStop(0.38, 'rgba(215, 235, 255, 0.42)');
                    grad.addColorStop(0.65, 'rgba(175, 210, 255, 0.16)');
                    grad.addColorStop(0.85, 'rgba(140, 190, 255, 0.04)');
                    grad.addColorStop(1.00, 'rgba(120, 180, 255, 0.00)');

                    ctx.fillStyle = grad;
                    if (typeof ctx.ellipse === 'function') {
                        ctx.beginPath();
                        ctx.ellipse(128, 230, 105, 200, 0, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (typeof ctx.fillRect === 'function') {
                        ctx.fillRect(0, 0, 256, 512);
                    }
                }
            } else if (type === 'headlightFlare') {
                canvas.width = 128;
                canvas.height = 128;
                if (typeof ctx.clearRect === 'function') ctx.clearRect(0, 0, 128, 128);

                // Multi-ring optical lens flare with white-hot core and sparkling diamond aura
                const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
                grad.addColorStop(0.00, 'rgba(255, 255, 255, 1.0)');
                grad.addColorStop(0.12, 'rgba(255, 255, 255, 0.95)');
                grad.addColorStop(0.28, 'rgba(235, 245, 255, 0.70)');
                grad.addColorStop(0.55, 'rgba(190, 225, 255, 0.25)');
                grad.addColorStop(0.80, 'rgba(140, 195, 255, 0.06)');
                grad.addColorStop(1.00, 'rgba(100, 170, 255, 0.00)');

                ctx.fillStyle = grad;
                if (typeof ctx.fillRect === 'function') {
                    ctx.fillRect(0, 0, 128, 128);
                }

                // Subtle horizontal streak for realistic anamorphic glass dispersion
                if (typeof ctx.createLinearGradient === 'function' && typeof ctx.fillRect === 'function') {
                    const streak = ctx.createLinearGradient(0, 64, 128, 64);
                    streak.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
                    streak.addColorStop(0.4, 'rgba(255, 255, 255, 0.25)');
                    streak.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
                    streak.addColorStop(0.6, 'rgba(255, 255, 255, 0.25)');
                    streak.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
                    ctx.fillStyle = streak;
                    ctx.fillRect(0, 62, 128, 4);
                }
            } else if (type === 'brakeFlare') {
                canvas.width = 128;
                canvas.height = 128;
                // Optical flare with white-hot core and saturated crimson halo
                const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
                grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
                grad.addColorStop(0.15, 'rgba(255, 180, 180, 0.95)');
                grad.addColorStop(0.35, 'rgba(255, 40, 40, 0.85)');
                grad.addColorStop(0.65, 'rgba(220, 20, 20, 0.35)');
                grad.addColorStop(1.0, 'rgba(180, 0, 0, 0.0)');

                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 128, 128);
            } else if (type === 'brakeGround') {
                canvas.width = 128;
                canvas.height = 128;
                // Soft red ground reflection behind bumper
                const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 58);
                grad.addColorStop(0.0, 'rgba(240, 30, 30, 0.80)');
                grad.addColorStop(0.35, 'rgba(220, 20, 20, 0.45)');
                grad.addColorStop(0.70, 'rgba(180, 10, 10, 0.15)');
                grad.addColorStop(1.0, 'rgba(140, 0, 0, 0.0)');

                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 128, 128);
            } else if (type === 'skidTexture') {
                canvas.width = 64;
                canvas.height = 128;
                // Realistic tire rubber tread striation
                ctx.fillStyle = '#141416';
                ctx.fillRect(0, 0, 64, 128);
                ctx.fillStyle = '#0a0a0c';
                ctx.fillRect(8, 0, 12, 128);
                ctx.fillRect(28, 0, 8, 128);
                ctx.fillRect(44, 0, 12, 128);
            }

            if (THREE && typeof THREE.CanvasTexture === 'function') {
                const tex = new THREE.CanvasTexture(canvas);
                if (tex) tex.needsUpdate = true;
                return tex;
            }
            return null;
        } catch (_) {
            return null;
        }
    }

    class RaceEffectsManager {
        constructor(engine) {
            this.engine = engine;
            this.THREE = (engine && engine.THREE) || (typeof window !== 'undefined' && window.THREE) || null;
            this.scene = engine ? engine.scene : null;
            this.camera = engine ? engine.camera : null;
            this.container = engine ? engine.container : null;

            // 1. Tire Smoke System
            this.smokePool = [];
            this.activeSmoke = [];
            this.smokeTimer = 0;
            this.sharedSmokeGeo = null;
            this.sharedSmokeMat = null;

            // 2. Sparks on Collision & Guardrail Brushing
            this.sparkPool = [];
            this.activeSparks = [];
            this.scrapeTimer = 0;
            this.sharedSparkGeo = null;
            this.sparkMats = [];

            // 3. Tire Skid Marks on Asphalt
            this.skidPool = [];
            this.activeSkids = [];
            this.lastSkidPos = {
                rl: null,
                rr: null,
                fl: null,
                fr: null
            };
            this.sharedSkidGeo = null;
            this.sharedSkidMat = null;

            // 4. Sensation of High Speed (FOV + Streaks + Blur Vignette)
            this.speedStreaksMesh = null;
            this.speedStreaksData = [];
            this.speedVignetteEl = null;

            // 5. Headlight & Taillight Lighting (Smooth Ground Decal + Subtle SpotLights + Lens Flares)
            this.headlightFlares = [];
            this.headlightCones = this.headlightFlares; // Backward compatibility alias
            this.headlightSpots = [];
            this.headlightGroundPatches = [];
            this.taillightFlares = [];
            this.brakeGroundDecal = null;
            this.lightPositions = null;

            // Internal weather & state
            this.currentWeather = (engine && engine.currentActiveWeather) || 'night';
            this.isBraking = false;
            this.isHardDrifting = false;
            this.isBurnout = false;

            if (this.engine && this.THREE && this.scene) {
                this.init();
            }
        }

        init() {
            const THREE = this.THREE;
            if (!THREE || !this.scene) return;

            // 1. Init Tire Smoke Assets
            try {
                this.sharedSmokeGeo = (typeof THREE.DodecahedronGeometry === 'function')
                    ? new THREE.DodecahedronGeometry(0.26, 1)
                    : new THREE.SphereGeometry(0.24, 6, 6);
            } catch (_) {
                this.sharedSmokeGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
            }
            this.sharedSmokeMat = new THREE.MeshBasicMaterial({
                color: 0xd9e0e8,
                transparent: true,
                opacity: 0.50,
                depthWrite: false
            });

            // Pre-allocate 50 smoke puff meshes to avoid runtime allocation
            for (let i = 0; i < 50; i++) {
                const mesh = new THREE.Mesh(this.sharedSmokeGeo, this.sharedSmokeMat.clone());
                mesh.visible = false;
                this.scene.add(mesh);
                this.smokePool.push({
                    mesh: mesh,
                    life: 0,
                    maxLife: 1.0,
                    startScale: 0.3,
                    maxScale: 2.2,
                    baseOpacity: 0.50,
                    vx: 0, vy: 0, vz: 0,
                    rotVx: 0, rotVy: 0, rotVz: 0
                });
            }

            // 2. Init Sparks Assets (Multi-tone white-hot & electric amber embers)
            this.sharedSparkGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
            const sparkColors = [0xffffff, 0xfacc15, 0xf97316, 0xef4444];
            this.sparkMats = sparkColors.map(col => new THREE.MeshBasicMaterial({ color: col }));

            // Pre-allocate 75 spark meshes
            for (let i = 0; i < 75; i++) {
                const mat = this.sparkMats[i % this.sparkMats.length];
                const mesh = new THREE.Mesh(this.sharedSparkGeo, mat);
                mesh.visible = false;
                this.scene.add(mesh);
                this.sparkPool.push({
                    mesh: mesh,
                    life: 0,
                    maxLife: 0.45,
                    vx: 0, vy: 0, vz: 0,
                    gravity: 13.5,
                    bounciness: 0.40,
                    friction: 0.74
                });
            }

            // 3. Init Tire Skid Marks (Asphalt quad ribbon decals)
            this.sharedSkidGeo = new THREE.PlaneGeometry(0.26, 1.0);
            this.sharedSkidGeo.rotateX(-Math.PI / 2); // Flat on XZ road surface

            const skidTex = createProceduralTexture('skidTexture', THREE);
            this.skidTex = skidTex;
            this.sharedSkidMat = new THREE.MeshBasicMaterial({
                color: 0x111114,
                map: skidTex || null,
                transparent: true,
                opacity: 0.65,
                depthWrite: false
            });

            // Pre-allocate 180 skid mark quad segments
            for (let i = 0; i < 180; i++) {
                const mesh = new THREE.Mesh(this.sharedSkidGeo, this.sharedSkidMat.clone());
                mesh.visible = false;
                this.scene.add(mesh);
                this.skidPool.push({
                    mesh: mesh,
                    life: 0,
                    maxLife: 6.0,
                    intensity: 1.0
                });
            }

            // 4. Init High Speed Effects (Streaks & DOM Vignette)
            this.initSpeedStreaks();
            this.initSpeedVignette();

            // 5. Init Projected Headlight & Brake Light Assets
            this.initLightBeams();
        }

        // ==========================================
        // 4. HIGH SPEED EFFECTS (FOV + STREAKS + VIGNETTE)
        // ==========================================
        initSpeedStreaks() {
            const THREE = this.THREE;
            if (!THREE) return;

            try {
                const count = 65;
                const positions = new Float32Array(count * 6);
                const colors = new Float32Array(count * 6);

                const c1 = new THREE.Color(0xa5f3fc); // Light cyan
                const c2 = new THREE.Color(0x38bdf8); // Bright sky blue

                this.speedStreaksData = [];
                for (let i = 0; i < count; i++) {
                    const side = Math.random() > 0.5 ? 1 : -1;
                    const x = side * (2.4 + Math.random() * 3.2);
                    const y = 0.6 + Math.random() * 3.4;
                    const z = 8.0 + Math.random() * 45.0;
                    const len = 2.0 + Math.random() * 3.5;

                    const idx = i * 6;
                    positions[idx] = x;
                    positions[idx + 1] = y;
                    positions[idx + 2] = z;
                    positions[idx + 3] = x;
                    positions[idx + 4] = y;
                    positions[idx + 5] = z + len;

                    const col = (i % 2 === 0) ? c1 : c2;
                    colors[idx] = col.r; colors[idx + 1] = col.g; colors[idx + 2] = col.b;
                    colors[idx + 3] = col.r * 0.3; colors[idx + 4] = col.g * 0.3; colors[idx + 5] = col.b * 0.3;

                    this.speedStreaksData.push({ x, y, z, len, speedMult: 0.9 + Math.random() * 0.4 });
                }

                const geo = new THREE.BufferGeometry();
                geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

                const mat = new THREE.LineBasicMaterial({
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.0,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });

                this.speedStreaksMesh = new THREE.LineSegments(geo, mat);
                this.speedStreaksMesh.visible = false;
                this.scene.add(this.speedStreaksMesh);
            } catch (err) {
                console.warn('initSpeedStreaks error:', err);
            }
        }

        initSpeedVignette() {
            if (typeof document === 'undefined') return;
            try {
                let el = document.getElementById('race-3d-speed-vignette');
                if (!el && this.container) {
                    const wrapper = this.container.closest('.race-3d-viewport-wrapper') || this.container.parentNode || this.container;
                    el = document.createElement('div');
                    el.id = 'race-3d-speed-vignette';
                    el.className = 'race-3d-speed-vignette';
                    wrapper.appendChild(el);
                }
                this.speedVignetteEl = el;
            } catch (_) {}
        }

        enhanceCameraFOV(baseFov, state) {
            if (!state) return baseFov;
            // Dynamic FOV expansion on Nitro boost and approaching 220+ km/h hypersonic speeds
            const speed = state.speed || 0;
            const nitroBonus = (state.isNitroActive && speed >= 60) ? 5.0 : 0.0;
            if (speed < 220) return baseFov + nitroBonus;

            const highSpeedProg = Math.max(0, Math.min(1.0, (speed - 220) / 180));
            // Power curve: smooth entry at 220-250, visceral warp at 300-400+
            const fovBonus = Math.pow(highSpeedProg, 1.25) * 15.0;
            return baseFov + fovBonus + (state.isNitroActive ? 5.0 : 0.0);
        }

        updateSpeedVFX(dt, state) {
            const speed = state.speed || 0;
            const isNitro = !!state.isNitroActive;

            // 1. 3D Speed Streaks update
            if (this.speedStreaksMesh && this.speedStreaksData.length > 0) {
                if (speed > 185 || (isNitro && speed > 85)) {
                    this.speedStreaksMesh.visible = true;
                    const speedRatio = Math.min(1.0, Math.max(0, (speed - 185) / 155));
                    const targetOpacity = Math.min(0.92, (speedRatio * 0.78) + (isNitro ? 0.28 : 0));
                    this.speedStreaksMesh.material.opacity = targetOpacity;

                    const geo = this.speedStreaksMesh.geometry;
                    const pos = geo.attributes.position.array;
                    const carZ = state.z || 0;
                    const carX = state.x || 0;
                    const forwardMps = (speed / 3.6);

                    for (let i = 0; i < this.speedStreaksData.length; i++) {
                        const s = this.speedStreaksData[i];
                        // Fly backward relative to car forward motion
                        s.z -= forwardMps * s.speedMult * 1.35 * dt;

                        // Wrap ahead when passing behind car
                        if (s.z < carZ - 4.0) {
                            s.z = carZ + 35.0 + Math.random() * 30.0;
                            const side = Math.random() > 0.5 ? 1 : -1;
                            s.x = carX + side * (2.2 + Math.random() * 3.5);
                        }

                        // Hypersonic stretch length
                        const curLen = s.len * (1.0 + speedRatio * 1.8 + (isNitro ? 1.0 : 0));
                        const idx = i * 6;
                        pos[idx] = s.x;
                        pos[idx + 1] = s.y;
                        pos[idx + 2] = s.z;
                        pos[idx + 3] = s.x;
                        pos[idx + 4] = s.y;
                        pos[idx + 5] = s.z + curLen;
                    }
                    geo.attributes.position.needsUpdate = true;
                } else {
                    this.speedStreaksMesh.visible = false;
                    this.speedStreaksMesh.material.opacity = 0;
                }
            }

            // 2. DOM Peripheral Speed Blur Vignette update
            if (this.speedVignetteEl) {
                if (speed > 185 || isNitro) {
                    const ratio = Math.min(1.0, Math.max(0, (speed - 185) / 165));
                    const vigOpacity = Math.min(0.85, (ratio * 0.70) + (isNitro ? 0.28 : 0));
                    this.speedVignetteEl.style.opacity = vigOpacity.toFixed(3);
                    if (speed >= 260 || isNitro) {
                        this.speedVignetteEl.classList.add('hypersonic');
                    } else {
                        this.speedVignetteEl.classList.remove('hypersonic');
                    }
                } else {
                    this.speedVignetteEl.style.opacity = '0';
                    this.speedVignetteEl.classList.remove('hypersonic');
                }
            }
        }

        // ==========================================
        // 5. PROJECTED HEADLIGHT & BRAKE LIGHT BEAMS
        // ==========================================
        initLightBeams() {
            const THREE = this.THREE;
            if (!THREE) return;

            // Clean previous meshes and textures if any
            [this.hlFlareTex, this.groundTex, this.flareTex, this.redGroundTex].forEach(tex => {
                if (tex && typeof tex.dispose === 'function') {
                    try { tex.dispose(); } catch (_) {}
                }
            });
            this.hlFlareTex = null;
            this.groundTex = null;
            this.flareTex = null;
            this.redGroundTex = null;

            if (this.headlightFlares) {
                this.headlightFlares.forEach(f => {
                    try {
                        if (f.parent) f.parent.remove(f);
                        if (f.geometry && typeof f.geometry.dispose === 'function') f.geometry.dispose();
                        if (f.material && typeof f.material.dispose === 'function') f.material.dispose();
                    } catch (_) {}
                });
            }
            if (this.headlightCones && this.headlightCones !== this.headlightFlares) {
                this.headlightCones.forEach(c => {
                    try {
                        if (c.parent) c.parent.remove(c);
                        if (c.geometry && typeof c.geometry.dispose === 'function') c.geometry.dispose();
                        if (c.material && typeof c.material.dispose === 'function') c.material.dispose();
                    } catch (_) {}
                });
            }
            this.headlightGroundPatches.forEach(g => {
                try {
                    if (g.parent) g.parent.remove(g);
                    if (g.geometry && typeof g.geometry.dispose === 'function') g.geometry.dispose();
                    if (g.material && typeof g.material.dispose === 'function') g.material.dispose();
                } catch (_) {}
            });
            this.taillightFlares.forEach(f => {
                try {
                    if (f.parent) f.parent.remove(f);
                    if (f.geometry && typeof f.geometry.dispose === 'function') f.geometry.dispose();
                    if (f.material && typeof f.material.dispose === 'function') f.material.dispose();
                } catch (_) {}
            });
            if (this.brakeGroundDecal && this.brakeGroundDecal.parent) {
                try {
                    this.brakeGroundDecal.parent.remove(this.brakeGroundDecal);
                    if (this.brakeGroundDecal.geometry && typeof this.brakeGroundDecal.geometry.dispose === 'function') this.brakeGroundDecal.geometry.dispose();
                    if (this.brakeGroundDecal.material && typeof this.brakeGroundDecal.material.dispose === 'function') this.brakeGroundDecal.material.dispose();
                } catch (_) {}
            }
            if (this.headlightSpots && this._ownsHeadlightSpots) {
                this.headlightSpots.forEach(spot => {
                    try {
                        if (spot.target && spot.target.parent) spot.target.parent.remove(spot.target);
                        if (spot.parent) spot.parent.remove(spot);
                    } catch (_) {}
                });
                if (this.engine && this.engine.playerHeadlights === this.headlightSpots) {
                    this.engine.playerHeadlights = [];
                }
            }

            this.headlightFlares = [];
            this.headlightCones = this.headlightFlares; // Backward compatibility alias
            this.headlightGroundPatches = [];
            this.taillightFlares = [];
            this.brakeGroundDecal = null;

            const playerCar = this.engine ? this.engine.playerCar : null;
            if (!playerCar) return;

            try {
                // Compute model dimensions (using clean base bounding box if available)
                playerCar.updateMatrixWorld(true);
                const box = (playerCar.userData && playerCar.userData.baseBoundingBox && !playerCar.userData.baseBoundingBox.isEmpty())
                    ? playerCar.userData.baseBoundingBox.clone()
                    : new THREE.Box3().setFromObject(playerCar);
                const size = box.getSize(new THREE.Vector3());
                const halfL = (size.z || 4.4) * 0.5;
                const halfW = (size.x || 1.9) * 0.5;

                // Detect light positions using helper or bounding box
                const carId = (this.engine.identifyCarModel && this.engine.carName)
                    ? this.engine.identifyCarModel(this.engine.carName)
                    : '';
                const detectFunc = (typeof Car3DManager !== 'undefined' && Car3DManager.detectVehicleLightPositions)
                    ? Car3DManager.detectVehicleLightPositions
                    : ((typeof window !== 'undefined' && window.Car3D && window.Car3D.detectVehicleLightPositions)
                        ? window.Car3D.detectVehicleLightPositions
                        : null);
                const detected = (detectFunc)
                    ? detectFunc(playerCar, carId, THREE)
                    : {
                        hlL: new THREE.Vector3(-halfW * 0.72, 0.65, halfL - 0.1),
                        hlR: new THREE.Vector3(halfW * 0.72, 0.65, halfL - 0.1),
                        tlL: new THREE.Vector3(-halfW * 0.72, 0.65, -halfL + 0.1),
                        tlR: new THREE.Vector3(halfW * 0.72, 0.65, -halfL + 0.1)
                    };

                const localHlL = detected.hlL.clone();
                const localHlR = detected.hlR.clone();
                const localTlL = detected.tlL.clone();
                const localTlR = detected.tlR.clone();
                playerCar.worldToLocal(localHlL);
                playerCar.worldToLocal(localHlR);
                playerCar.worldToLocal(localTlL);
                playerCar.worldToLocal(localTlR);

                this.lightPositions = { localHlL, localHlR, localTlL, localTlR, halfL, halfW };

                // A. Clean, Bright Lens Flare Point on Vehicle Headlight Glass (Zero 3D Volumetric Wedge Meshes)
                const hlFlareTex = createProceduralTexture('headlightFlare', THREE);
                this.hlFlareTex = hlFlareTex;
                [-1, 1].forEach((side) => {
                    const localP = side < 0 ? localHlL : localHlR;
                    const flareGeo = new THREE.PlaneGeometry(0.46, 0.46);
                    const flareMat = new THREE.MeshBasicMaterial({
                        color: 0xffffff,
                        map: hlFlareTex || null,
                        transparent: true,
                        opacity: 0.88,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false,
                        side: THREE.DoubleSide
                    });

                    const flareMesh = new THREE.Mesh(flareGeo, flareMat);
                    // Placed flush right on the vehicle's headlight glass
                    flareMesh.position.set(localP.x, localP.y, localP.z + 0.035);
                    playerCar.add(flareMesh);
                    this.headlightFlares.push(flareMesh);
                });
                this.headlightCones = this.headlightFlares; // Backward compatibility alias

                // B. Realistic Subtle Three.js SpotLight Angled Forward Down the Road
                if (this.engine && Array.isArray(this.engine.playerHeadlights) && this.engine.playerHeadlights.length > 0) {
                    this.headlightSpots = this.engine.playerHeadlights;
                    this._ownsHeadlightSpots = false;
                } else {
                    this.headlightSpots = [];
                    this._ownsHeadlightSpots = true;
                    [-1, 1].forEach((side) => {
                        const localP = side < 0 ? localHlL : localHlR;
                        const spot = new THREE.SpotLight(0xf8fafc, 2.0, 52, Math.PI / 6.5, 0.55, 1.2);
                        spot.position.copy(localP);
                        spot.target.position.set(localP.x * 1.05, 0.15, localP.z + 32);
                        playerCar.add(spot);
                        playerCar.add(spot.target);
                        this.headlightSpots.push(spot);
                    });
                    if (this.engine) {
                        this.engine.playerHeadlights = this.headlightSpots;
                    }
                }

                // C. Smooth, Soft Asphalt Ground Illumination Patch (Flat Quad with Soft Elliptical Alpha Gradient)
                const groundTex = createProceduralTexture('headlightGround', THREE);
                this.groundTex = groundTex;
                [-1, 1].forEach((side) => {
                    const localP = side < 0 ? localHlL : localHlR;
                    const patchGeo = new THREE.PlaneGeometry(3.6, 26.0);
                    patchGeo.rotateX(-Math.PI / 2); // Flat on asphalt

                    const patchMat = new THREE.MeshBasicMaterial({
                        color: 0xf8fafc,
                        map: groundTex || null,
                        transparent: true,
                        opacity: 0.42,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });

                    const patchMesh = new THREE.Mesh(patchGeo, patchMat);
                    // Sits just above asphalt (y = 0.012) spanning ahead of front bumper across road surface
                    patchMesh.position.set(localP.x * 1.08, 0.012, localP.z + 13.0);
                    playerCar.add(patchMesh);
                    this.headlightGroundPatches.push(patchMesh);
                });

                // D. Realistic Optical Brake Light Flares at Taillights
                const flareTex = createProceduralTexture('brakeFlare', THREE);
                this.flareTex = flareTex;
                [-1, 1].forEach((side) => {
                    const localP = side < 0 ? localTlL : localTlR;
                    const flareGeo = new THREE.PlaneGeometry(0.75, 0.75);
                    const flareMat = new THREE.MeshBasicMaterial({
                        color: 0xff3333,
                        map: flareTex || null,
                        transparent: true,
                        opacity: 0.30,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false,
                        side: THREE.DoubleSide
                    });

                    const flareMesh = new THREE.Mesh(flareGeo, flareMat);
                    flareMesh.position.set(localP.x, localP.y, localP.z - 0.04);
                    playerCar.add(flareMesh);
                    this.taillightFlares.push(flareMesh);
                });

                // E. Dynamic Rear Brake Red Ground Wash Decal
                const redGroundTex = createProceduralTexture('brakeGround', THREE);
                this.redGroundTex = redGroundTex;
                const redGroundGeo = new THREE.PlaneGeometry(4.2, 4.2);
                redGroundGeo.rotateX(-Math.PI / 2);
                const redGroundMat = new THREE.MeshBasicMaterial({
                    color: 0xdc2626,
                    map: redGroundTex || null,
                    transparent: true,
                    opacity: 0.06,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });

                this.brakeGroundDecal = new THREE.Mesh(redGroundGeo, redGroundMat);
                this.brakeGroundDecal.position.set(0, 0.010, -halfL - 1.2);
                playerCar.add(this.brakeGroundDecal);

                // Apply initial weather palette
                this.setWeather(this.currentWeather);
            } catch (err) {
                console.warn('initLightBeams error:', err);
            }
        }

        setWeather(weatherName) {
            this.currentWeather = weatherName || 'night';
            const w = this.currentWeather;

            // Palette values based on weather & time of day
            let flareCol = 0xf8fafc;
            let flareOp = 0.88;
            let groundCol = 0xf8fafc;
            let groundOp = 0.42;
            let spotInt = 2.10;
            let spotCol = 0xf8fafc;

            if (w === 'day') {
                flareOp = 0.28;
                groundOp = 0.06;
                spotInt = 0.40;
            } else if (w === 'sunset') {
                flareCol = 0xfef08a; // Golden twilight
                flareOp = 0.75;
                groundCol = 0xfde047;
                groundOp = 0.28;
                spotInt = 1.80;
                spotCol = 0xfef08a;
            } else if (w === 'rain') {
                flareCol = 0xbae6fd; // Blue-white rain reflection
                flareOp = 0.95;
                groundCol = 0xdbeafe;
                groundOp = 0.50; // Intense specular beam on wet asphalt
                spotInt = 2.60;
                spotCol = 0xbae6fd;
            } else if (w === 'snow') {
                flareCol = 0xffffff;
                flareOp = 0.90;
                groundCol = 0xffffff;
                groundOp = 0.35;
                spotInt = 2.20;
                spotCol = 0xffffff;
            } else { // night
                flareCol = 0xf8fafc;
                flareOp = 0.90;
                groundCol = 0xf8fafc;
                groundOp = 0.42;
                spotInt = 2.10;
                spotCol = 0xf8fafc;
            }

            this.headlightFlares.forEach(f => {
                if (f && f.material) {
                    f.material.color.setHex(flareCol);
                    f.material.opacity = flareOp;
                }
            });

            this.headlightGroundPatches.forEach(g => {
                if (g && g.material) {
                    g.material.color.setHex(groundCol);
                    g.material.opacity = groundOp;
                }
            });

            if (this.headlightSpots) {
                this.headlightSpots.forEach(s => {
                    if (s) {
                        s.intensity = spotInt;
                        if (s.color) s.color.setHex(spotCol);
                    }
                });
            }
        }

        updateLightsVFX(dt, isBraking) {
            this.isBraking = isBraking;

            // Stabilize ground illumination patches against vehicle pitch squat and body roll
            // Ensures the smooth light patch always hugs the asphalt surface at y = 0.012 without clipping
            const playerCar = (this.engine && this.engine.playerCar) ? this.engine.playerCar : null;
            const state = (this.engine && this.engine.state) ? this.engine.state : null;
            if (playerCar && state) {
                const pitch = state.pitchSquat || 0;
                const roll = (state.bodyRoll || 0) + ((this.engine && this.engine.engineTremorRoll) || 0);
                const carY = playerCar.position.y || 0;
                if (this.headlightGroundPatches && this.headlightGroundPatches.length > 0) {
                    for (let i = 0; i < this.headlightGroundPatches.length; i++) {
                        const p = this.headlightGroundPatches[i];
                        if (p) {
                            p.rotation.x = -pitch;
                            p.rotation.z = -roll;
                            p.position.y = 0.012 - carY;
                        }
                    }
                }
                if (this.brakeGroundDecal) {
                    this.brakeGroundDecal.rotation.x = -pitch;
                    this.brakeGroundDecal.rotation.z = -roll;
                    this.brakeGroundDecal.position.y = 0.010 - carY;
                }
            }

            // Taillight flares bloom & ground red wash on braking
            const flareScale = isBraking ? 1.35 : 0.42;
            const flareOpacity = isBraking ? 0.95 : 0.28;
            const redGroundOpacity = isBraking ? 0.58 : 0.06;

            this.taillightFlares.forEach(f => {
                if (f && f.material) {
                    f.scale.set(flareScale, flareScale, 1.0);
                    // Fast ease to bright flare
                    f.material.opacity += (flareOpacity - f.material.opacity) * Math.min(1.0, 14.0 * dt);
                }
            });

            if (this.brakeGroundDecal && this.brakeGroundDecal.material) {
                this.brakeGroundDecal.material.opacity += (redGroundOpacity - this.brakeGroundDecal.material.opacity) * Math.min(1.0, 12.0 * dt);
            }
        }

        // ==========================================
        // 1. TIRE SMOKE BILLOWS (BURNOUTS, DRIFTS, BRAKING)
        // ==========================================
        getWheelWorldPositions() {
            const playerCar = this.engine ? this.engine.playerCar : null;
            const THREE = this.THREE;
            const st = (this.engine && this.engine.state) ? this.engine.state : null;
            if (!playerCar || !THREE) {
                const x = st ? st.x : 0;
                const z = st ? st.z : 0;
                return {
                    rl: new THREE.Vector3(x - 0.85, 0.012, z - 1.4),
                    rr: new THREE.Vector3(x + 0.85, 0.012, z - 1.4),
                    fl: new THREE.Vector3(x - 0.85, 0.012, z + 1.4),
                    fr: new THREE.Vector3(x + 0.85, 0.012, z + 1.4)
                };
            }

            // The author edition follows the authoritative road contacts.
            if (typeof window !== 'undefined' && window.NOMERA_AUTHORS_PREVIEW) {
                const phys=this.engine.playerPhysics||this.engine.mwLongitudinal,wheels=phys?.suspension?.wheels;
                if(wheels?.length===4){const positions={};for(const w of wheels){const p=w.contact3D?.position,g=w.contact3D?.ground;if(!p||!g)break;const v=new THREE.Vector3(this.engine.toThreeX?this.engine.toThreeX(p[0]):p[0],g.height+.018,this.engine.toThreeZ?this.engine.toThreeZ(p[2]):p[2]);v.contact=!!w.contact;const n=g.normal||[0,1,0];v.roadNormal=new THREE.Vector3(this.engine.toThreeX?this.engine.toThreeX(n[0]):n[0],n[1],n[2]).normalize();positions[w.key]=v;}if(Object.keys(positions).length===4)return positions;}
            }
            // Keep playerCar synchronized with latest state coordinates
            if (st && (playerCar.position.x !== st.x || playerCar.position.z !== st.z)) {
                playerCar.position.x = st.x;
                playerCar.position.z = st.z;
            }

            const lp = this.lightPositions;
            const halfW = lp ? lp.halfW : 0.95;
            const halfL = lp ? lp.halfL : 2.2;

            const localRL = new THREE.Vector3(-halfW * 0.82, 0.012, -halfL * 0.60);
            const localRR = new THREE.Vector3(halfW * 0.82, 0.012, -halfL * 0.60);
            const localFL = new THREE.Vector3(-halfW * 0.82, 0.012, halfL * 0.60);
            const localFR = new THREE.Vector3(halfW * 0.82, 0.012, halfL * 0.60);

            playerCar.updateMatrixWorld(true);
            const rl = localRL.applyMatrix4(playerCar.matrixWorld);
            const rr = localRR.applyMatrix4(playerCar.matrixWorld);
            const fl = localFL.applyMatrix4(playerCar.matrixWorld);
            const fr = localFR.applyMatrix4(playerCar.matrixWorld);
            rl.y = 0.012;
            rr.y = 0.012;
            fl.y = 0.012;
            fr.y = 0.012;
            return { rl, rr, fl, fr };
        }

        spawnSmokePuff(pos, options = {}) {
            if (!this.smokePool || this.smokePool.length === 0 || pos.contact===false) return;
            const p = this.smokePool.pop();
            const carSpeed = (this.engine && this.engine.state) ? this.engine.state.speed : 0;
            const forwardMps = carSpeed / 3.6;

            p.mesh.position.set(
                pos.x + (Math.random() - 0.5) * 0.24,
                pos.y + 0.05 + Math.random() * 0.10,
                pos.z + (Math.random() - 0.5) * 0.24
            );

            p.life = 0;
            const author=typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW,wet=author&&this.engine.currentActiveWeather==='rain'&&this.engine.currentBiome!=='tunnel'&&!(window.NomeraEnvironment?.tunnelBlend(this.engine)>.5);
            if(author)p.mesh.material.color?.setHex(wet?0x9fb7bb:0xd9e0e8);
            p.maxLife = wet?.38:(options.maxLife || (0.75 + Math.random() * 0.45));
            p.startScale = options.startScale || (0.28 + Math.random() * 0.12);
            p.maxScale = options.maxScale || (1.8 + Math.random() * 0.9);
            p.baseOpacity = options.baseOpacity || 0.52;

            // Billowing velocities: rises upward, drifts backward with wake
            p.vx = (Math.random() - 0.5) * 0.8 + (options.vx || 0);
            p.vy = 0.55 + Math.random() * 0.65;
            p.vz = -forwardMps * 0.18 + (Math.random() - 0.5) * 1.5;

            // Tumbling rotation
            p.rotVx = (Math.random() - 0.5) * 2.2;
            p.rotVy = (Math.random() - 0.5) * 2.2;
            p.rotVz = (Math.random() - 0.5) * 2.2;

            if(wet){p.maxScale=.75;p.startScale=.15;p.baseOpacity=.22;p.vy=.25;}
            p.mesh.scale.setScalar(p.startScale);
            p.mesh.visible = true;
            this.activeSmoke.push(p);
        }

        getContactTireActivity() {
            if(typeof window==='undefined'||!window.NOMERA_AUTHORS_PREVIEW)return null;
            const physics=this.engine.playerPhysics||this.engine.mwLongitudinal;
            if(!physics?.mwTires||!physics.suspension?.wheels)return null;
            const st=this.engine.state||{},keys=this.engine.keys||{},speed=st.speed||0;
            const rearSlide=!!st.isDrifting||(!!(keys.drift||keys.handbrake)&&speed>18)||(Math.abs(st.vx||0)>2.2&&speed>55);
            const hardBrake=!!keys.brake&&speed>65;
            return physics.suspension.wheels.map(w=>{
                const tire=physics.mwTires[w.key];
                const isRear=!w.front||w.key==='rl'||w.key==='rr';
                const tireSlip=!!tire&&(Math.abs(tire.slip)>1.35||Math.abs(tire.slipAngle)>.12&&speed>18||tire.locked&&speed>20);
                return{key:w.key,active:!!w.contact&&(tireSlip||(isRear&&rearSlide)||hardBrake)};
            });
        }

        updateSmoke(dt, state, keys) {
            this.smokeTimer += dt;
            const speed = state.speed || 0;
            const isGas = keys && keys.gas;
            const isBrake = keys && keys.brake;
            const isHandbrake = !!(keys && (keys.drift || keys.handbrake));
            const isDrifting = !!state.isDrifting;
            const hasLateralSlide = Math.abs(state.vx || 0) > 1.0 && speed > 20;

            const isBurnout = isGas && !isHandbrake && speed < 32 && (state.rpm > 2800 || speed < 12);
            const isHardBrakingLock = isBrake && speed > 35;
            const isHandbrakingLock = isHandbrake && speed > 15;
            const isDriftSlide = isDrifting || hasLateralSlide;

            this.isBurnout = isBurnout;
            this.isHardDrifting = isDriftSlide || isHandbrakingLock;

            // Spawn smoke puffs based on triggers
            const author=typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW,wet=author&&this.engine.currentActiveWeather==='rain'&&this.engine.currentBiome!=='tunnel'&&!(window.NomeraEnvironment?.tunnelBlend(this.engine)>.5);
            const interval=author&&(window.NomeraScenePerf?.mobile()||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)?.085:.038;
            if (this.smokeTimer >= interval) {
                this.smokeTimer = 0;
                const wheels = this.getWheelWorldPositions();
                const contacts=this.getContactTireActivity();
                if(contacts){
                    let budget=2;
                    for(const tire of contacts)if(budget>0&&(tire.active||wet&&speed>45)&&wheels[tire.key].contact){this.spawnSmokePuff(wheels[tire.key],{startScale:.14,maxScale:1.05,baseOpacity:.28,maxLife:.65});budget--;}
                } else if (isHandbrakingLock) {
                    // Intense tire smoke billows from rear wheels while handbraking at speed
                    this.spawnSmokePuff(wheels.rl, { maxScale: 2.2, baseOpacity: 0.60, vy: 0.85 });
                    this.spawnSmokePuff(wheels.rr, { maxScale: 2.2, baseOpacity: 0.60, vy: 0.85 });
                } else if (isBurnout) {
                    // Standing or rolling burnout: dense white clouds from rear wheels
                    this.spawnSmokePuff(wheels.rl, { maxScale: 2.4, baseOpacity: 0.60, vy: 0.9 });
                    this.spawnSmokePuff(wheels.rr, { maxScale: 2.4, baseOpacity: 0.60, vy: 0.9 });
                } else if (isDriftSlide) {
                    // Slip-angle drift billows: intensity scales with combo & slip angle
                    const slipMult = Math.min(2.5, (Math.abs(state.vx) / 3.0) * (state.driftCombo || 1));
                    const outerIsRight = state.vx > 0;
                    this.spawnSmokePuff(wheels.rl, {
                        maxScale: 1.9 * slipMult,
                        baseOpacity: 0.50,
                        vx: outerIsRight ? -0.4 : 0.2
                    });
                    this.spawnSmokePuff(wheels.rr, {
                        maxScale: 1.9 * slipMult,
                        baseOpacity: 0.50,
                        vx: outerIsRight ? -0.2 : 0.4
                    });
                } else if (wet && speed>45) {
                    this.spawnSmokePuff(wheels.rl);this.spawnSmokePuff(wheels.rr);
                } else if (isHardBrakingLock) {
                    // Hard braking locked tires: acrid grey puffs
                    this.spawnSmokePuff(wheels.rl, { maxScale: 1.7, baseOpacity: 0.45 });
                    this.spawnSmokePuff(wheels.rr, { maxScale: 1.7, baseOpacity: 0.45 });
                    if (speed > 85) {
                        this.spawnSmokePuff(wheels.fl, { maxScale: 1.4, baseOpacity: 0.35 });
                        this.spawnSmokePuff(wheels.fr, { maxScale: 1.4, baseOpacity: 0.35 });
                    }
                }
            }

            // Step active smoke billows
            for (let i = this.activeSmoke.length - 1; i >= 0; i--) {
                const p = this.activeSmoke[i];
                p.life += dt;
                const prog = p.life / p.maxLife;

                if (prog >= 1.0) {
                    p.mesh.visible = false;
                    this.activeSmoke.splice(i, 1);
                    this.smokePool.push(p);
                } else {
                    // Drag deceleration
                    p.vx *= 0.96;
                    p.vz *= 0.96;

                    p.mesh.position.x += p.vx * dt;
                    p.mesh.position.y += p.vy * dt;
                    p.mesh.position.z += p.vz * dt;

                    p.mesh.rotation.x += p.rotVx * dt;
                    p.mesh.rotation.y += p.rotVy * dt;
                    p.mesh.rotation.z += p.rotVz * dt;

                    // Volumetric swelling expansion
                    const scaleProg = Math.sin(prog * Math.PI * 0.5);
                    const curScale = p.startScale + (p.maxScale - p.startScale) * scaleProg;
                    p.mesh.scale.setScalar(curScale);

                    // Opacity envelope: rapid swell -> plateau -> smooth fade out
                    let op = p.baseOpacity;
                    if (prog < 0.15) {
                        op = (prog / 0.15) * p.baseOpacity;
                    } else if (prog >= 0.45) {
                        op = p.baseOpacity * (1.0 - (prog - 0.45) / 0.55);
                    }
                    if (p.mesh.material) {
                        p.mesh.material.opacity = Math.max(0, op);
                    }
                }
            }
        }

        // ==========================================
        // 2. SPARKS ON COLLISION & GUARDRAIL BRUSHING
        // ==========================================
        spawnSparks(x, y, z, count = 12, options = {}) {
            if (!this.sparkPool) return;
            const forwardMps = (this.engine && this.engine.state) ? (this.engine.state.speed / 3.6) : 0;
            const actualCount = Math.min(count, this.sparkPool.length);

            for (let i = 0; i < actualCount; i++) {
                const s = this.sparkPool.pop();
                s.mesh.position.set(
                    x + (Math.random() - 0.5) * 0.35,
                    y + (Math.random() - 0.5) * 0.25,
                    z + (Math.random() - 0.5) * 0.35
                );

                s.life = 0;
                s.maxLife = options.maxLife || (0.35 + Math.random() * 0.30);
                s.gravity = options.gravity || 14.0;
                s.bounciness = 0.38 + Math.random() * 0.22;
                s.friction = 0.74;

                // 3D scatter velocity
                s.vx = (options.spreadX || 6.5) * (Math.random() - 0.5) + (options.biasX || 0);
                s.vy = 2.0 + Math.random() * (options.spreadY || 5.0);
                s.vz = -forwardMps * 0.32 + (Math.random() - 0.5) * 8.5;

                s.mesh.scale.set(1, 1, 1);
                s.mesh.visible = true;
                this.activeSparks.push(s);
            }
        }

        updateSparks(dt, state) {
            const speed = state.speed || 0;

            // Check continuous barrier or curb brushing
            if (Math.abs(state.x || 0) >= 7.6 && speed > 22) {
                this.scrapeTimer += dt;
                if (this.scrapeTimer >= 0.045) {
                    this.scrapeTimer = 0;
                    const side = state.x > 0 ? 1 : -1;
                    const lp = this.lightPositions;
                    const halfW = lp ? lp.halfW : 0.95;
                    const contactX = state.x + side * (halfW * 0.75);
                    const contactZ = state.z - (Math.random() * 1.5);
                    this.spawnSparks(contactX, 0.32, contactZ, 3, {
                        biasX: -side * 2.5,
                        spreadX: 4.0,
                        spreadY: 3.5
                    });
                }
            }

            // Underbody bottom-out & lowered/BPAN stance sparks on suspension compression or expansion joints
            const styling = (this.engine && (this.engine.styling || (this.engine.carConfig && this.engine.carConfig.styling))) || {};
            const isLowStance = styling.suspension === 'bpan' || styling.suspension === 'lowered' || styling.stanceMode === 'low';
            const suspY = state.suspensionY || 0;
            const pitchVel = Math.abs(state.pitchVelocity || 0);
            const pitchSq = Math.abs(state.pitchSquat || 0);
            const isBottomOut = speed > 95 && (
                (isLowStance && (suspY < -0.005 || pitchVel > 0.16 || pitchSq > 0.032)) ||
                suspY < -0.014 ||
                pitchVel > 0.28
            );
            if (isBottomOut) {
                this.bottomOutTimer = (this.bottomOutTimer || 0) + dt;
                const interval = isLowStance ? 0.065 : 0.10;
                if (this.bottomOutTimer >= interval) {
                    this.bottomOutTimer = 0;
                    const railSide = Math.random() < 0.5 ? -0.44 : 0.44;
                    this.spawnSparks(
                        (state.x || 0) + railSide,
                        0.08,
                        (state.z || 0) - 0.85 - Math.random() * 0.75,
                        isLowStance ? 4 : 3,
                        { spreadX: 3.2, spreadY: 2.2, maxLife: 0.28 }
                    );
                }
            } else {
                this.bottomOutTimer = 0;
            }

            // Step active sparks
            for (let i = this.activeSparks.length - 1; i >= 0; i--) {
                const s = this.activeSparks[i];
                s.life += dt;

                if (s.life >= s.maxLife) {
                    s.mesh.visible = false;
                    this.activeSparks.splice(i, 1);
                    this.sparkPool.push(s);
                } else {
                    // Real gravity acceleration
                    s.vy -= s.gravity * dt;

                    s.mesh.position.x += s.vx * dt;
                    s.mesh.position.y += s.vy * dt;
                    s.mesh.position.z += s.vz * dt;

                    // Road surface bounce & kinetic friction
                    if (s.mesh.position.y <= 0.02) {
                        s.mesh.position.y = 0.02;
                        s.vy = -s.vy * s.bounciness;
                        s.vx *= s.friction;
                        s.vz *= s.friction;
                    }

                    // Shrink & cool
                    const rem = Math.max(0.2, 1.0 - (s.life / s.maxLife));
                    s.mesh.scale.setScalar(rem);
                }
            }
        }

        onCollision(type, x, y, z, intensity = 25) {
            this.spawnSparks(x, y, z, intensity, {
                spreadX: 9.0,
                spreadY: 7.0,
                maxLife: 0.55
            });
        }

        // ==========================================
        // 3. TIRE SKID MARKS ON ASPHALT
        // ==========================================
        emitSkidSegment(pos, wheelKey, intensity = 1.0) {
            if (!this.skidPool || this.skidPool.length === 0) return;
            const author=typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW;
            if(author&&pos.contact===false){this.lastSkidPos[wheelKey]=null;return;}
            const lastPos = this.lastSkidPos[wheelKey];

            if (!lastPos) {
                this.lastSkidPos[wheelKey] = pos.clone();
                return;
            }

            const dist = pos.distanceTo(lastPos);
            if(author&&dist>4){this.lastSkidPos[wheelKey]=pos.clone();return;}
            // Minimum distance between skid segment anchors
            if (dist >= 0.50) {
                const s = this.skidPool.pop();
                const mid = lastPos.clone().lerp(pos, 0.5);
                mid.y = author?(pos.y+lastPos.y)*.5:0.012; // Follow contact height.

                s.mesh.position.copy(mid);

                // Align quad along direction vector
                const dx = pos.x - lastPos.x;
                const dz = pos.z - lastPos.z;
                s.mesh.rotation.set(0,Math.atan2(dx,dz),0);
                if(author&&pos.roadNormal){const tilt=new this.THREE.Quaternion().setFromUnitVectors(new this.THREE.Vector3(0,1,0),pos.roadNormal);s.mesh.quaternion.premultiply(tilt);}
                s.mesh.scale.set(1.0, 1.0, dist);

                s.life = 0;
                s.maxLife = 6.5;
                s.intensity = Math.min(1.0, Math.max(0.4, intensity));

                if (s.mesh.material) {
                    s.mesh.material.opacity = 0.65 * s.intensity;
                }
                s.mesh.visible = true;
                this.activeSkids.push(s);

                this.lastSkidPos[wheelKey].copy(pos);
            }
        }

        updateSkidMarks(dt, state, keys) {
            const speed = state.speed || 0;
            const isGas = keys && keys.gas;
            const isBrake = keys && keys.brake;
            const isHandbrake = !!(keys && (keys.drift || keys.handbrake));
            const isDrifting = !!state.isDrifting;
            const hasLateralSlide = Math.abs(state.vx || 0) > 1.1 && speed > 22;

            const isBurnout = isGas && !isHandbrake && speed < 28 && (state.rpm > 2800 || speed < 12);
            const isBrakeLock = isBrake && speed > 26;
            const isHandbrakeLock = isHandbrake && speed > 15;
            const isSlide = isDrifting || hasLateralSlide;

            const shouldSkid = isBurnout || isBrakeLock || isSlide || isHandbrakeLock;

            const contacts=this.getContactTireActivity();
            if(contacts){
                const wheels=this.getWheelWorldPositions(),wet=this.engine.currentActiveWeather==='rain';
                for(const tire of contacts){if(tire.active)this.emitSkidSegment(wheels[tire.key],tire.key,wet?.4:.85);else this.lastSkidPos[tire.key]=null;}
            } else if (shouldSkid) {
                const wheels = this.getWheelWorldPositions();
                const skidIntensity = (isDrifting ? 1.0 : (isHandbrakeLock ? 0.95 : (isBrakeLock ? 0.9 : 0.85)));

                const wet=typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW&&this.engine.currentActiveWeather==='rain';
                this.emitSkidSegment(wheels.rl, 'rl', wet?skidIntensity*.45:skidIntensity);
                this.emitSkidSegment(wheels.rr, 'rr', wet?skidIntensity*.45:skidIntensity);

                if (isBrakeLock && speed > 70) {
                    this.emitSkidSegment(wheels.fl, 'fl', skidIntensity * 0.7);
                    this.emitSkidSegment(wheels.fr, 'fr', skidIntensity * 0.7);
                }
            } else {
                // Break continuity when skid stops
                this.lastSkidPos.rl = null;
                this.lastSkidPos.rr = null;
                this.lastSkidPos.fl = null;
                this.lastSkidPos.fr = null;
            }

            // Step active skid mark decals: persist for 3.5s, then smooth fade
            const carZ = state.z || 0;
            for (let i = this.activeSkids.length - 1; i >= 0; i--) {
                const s = this.activeSkids[i];
                s.life += dt;

                // Recycle if expired or far behind car
                if (s.life >= s.maxLife || s.mesh.position.z < carZ - 80.0) {
                    s.mesh.visible = false;
                    this.activeSkids.splice(i, 1);
                    this.skidPool.push(s);
                } else {
                    // First 3.5s at full opacity, then smooth fade out
                    const fadeStart = 3.5;
                    const fadeDuration = s.maxLife - fadeStart;
                    let op = 0.65 * s.intensity;
                    if (s.life > fadeStart) {
                        const fadeRatio = 1.0 - ((s.life - fadeStart) / fadeDuration);
                        op *= Math.max(0, fadeRatio);
                    }
                    if (s.mesh.material) {
                        s.mesh.material.opacity = op;
                    }
                }
            }
        }

        // ==========================================
        // MAIN UPDATE CYCLE
        // ==========================================
        update(dt) {
            if (!this.engine) return;
            const state = this.engine.state;
            const keys = this.engine.keys;
            if (!state) return;

            // 1. Tire smoke puffs
            this.updateSmoke(dt, state, keys);

            // 2. Collision sparks & barrier brushing
            this.updateSparks(dt, state);

            // 3. Asphalt skid mark ribbons
            this.updateSkidMarks(dt, state, keys);

            // 4. High speed effects (FOV warp + peripheral streaks + DOM vignette)
            this.updateSpeedVFX(dt, state);

            // 5. Projected light cones & brake flares
            this.updateLightsVFX(dt, !!(keys && keys.brake));
        }

        onCarLoaded(playerCar) {
            // Re-bind lights and light positions when player car is loaded/swapped
            this.initLightBeams();
        }

        spawnDriftSmoke(dt) {
            // Author smoke is emitted by the fixed-rate updateSmoke pool only.
            if(typeof window!=='undefined'&&window.NOMERA_AUTHORS_PREVIEW)return;
            // Hook for existing engine callers
            const wheels = this.getWheelWorldPositions();
            this.spawnSmokePuff(wheels.rl);
            this.spawnSmokePuff(wheels.rr);
        }

        destroy() {
            // Cleanup all pooled meshes and remove from scene
            const cleanupList = [...this.smokePool, ...this.activeSmoke, ...this.sparkPool, ...this.activeSparks, ...this.skidPool, ...this.activeSkids];
            cleanupList.forEach(item => {
                const m = item.mesh || item;
                if (m && m.parent) {
                    try { m.parent.remove(m); } catch (_) {}
                }
                if (m && m.geometry && typeof m.geometry.dispose === 'function') {
                    try { m.geometry.dispose(); } catch (_) {}
                }
                if (m && m.material && typeof m.material.dispose === 'function') {
                    try { m.material.dispose(); } catch (_) {}
                }
            });

            // Dispose shared geometries and materials
            [this.sharedSmokeGeo, this.sharedSparkGeo, this.sharedSkidGeo].forEach(geo => {
                if (geo && typeof geo.dispose === 'function') {
                    try { geo.dispose(); } catch (_) {}
                }
            });
            [this.sharedSmokeMat, this.sharedSkidMat, ...(Array.isArray(this.sparkMats) ? this.sparkMats : [])].forEach(mat => {
                if (mat && typeof mat.dispose === 'function') {
                    try { mat.dispose(); } catch (_) {}
                }
            });
            [this.skidTex, this.hlFlareTex, this.groundTex, this.flareTex, this.redGroundTex].forEach(tex => {
                if (tex && typeof tex.dispose === 'function') {
                    try { tex.dispose(); } catch (_) {}
                }
            });
            this.sharedSmokeGeo = null;
            this.sharedSmokeMat = null;
            this.sharedSparkGeo = null;
            this.sparkMats = null;
            this.sharedSkidGeo = null;
            this.sharedSkidMat = null;
            this.skidTex = null;
            this.hlFlareTex = null;
            this.groundTex = null;
            this.flareTex = null;
            this.redGroundTex = null;

            if (this.headlightFlares) {
                this.headlightFlares.forEach(f => {
                    try {
                        if (f.parent) f.parent.remove(f);
                        if (f.geometry && typeof f.geometry.dispose === 'function') f.geometry.dispose();
                        if (f.material && typeof f.material.dispose === 'function') f.material.dispose();
                    } catch (_) {}
                });
            }
            if (this.headlightCones && this.headlightCones !== this.headlightFlares) {
                this.headlightCones.forEach(c => {
                    try {
                        if (c.parent) c.parent.remove(c);
                        if (c.geometry && typeof c.geometry.dispose === 'function') c.geometry.dispose();
                        if (c.material && typeof c.material.dispose === 'function') c.material.dispose();
                    } catch (_) {}
                });
            }
            this.headlightGroundPatches.forEach(g => {
                try {
                    if (g.parent) g.parent.remove(g);
                    if (g.geometry && typeof g.geometry.dispose === 'function') g.geometry.dispose();
                    if (g.material && typeof g.material.dispose === 'function') g.material.dispose();
                } catch (_) {}
            });
            this.taillightFlares.forEach(f => {
                try {
                    if (f.parent) f.parent.remove(f);
                    if (f.geometry && typeof f.geometry.dispose === 'function') f.geometry.dispose();
                    if (f.material && typeof f.material.dispose === 'function') f.material.dispose();
                } catch (_) {}
            });
            if (this.brakeGroundDecal) {
                try {
                    if (this.brakeGroundDecal.parent) this.brakeGroundDecal.parent.remove(this.brakeGroundDecal);
                    if (this.brakeGroundDecal.geometry && typeof this.brakeGroundDecal.geometry.dispose === 'function') this.brakeGroundDecal.geometry.dispose();
                    if (this.brakeGroundDecal.material && typeof this.brakeGroundDecal.material.dispose === 'function') this.brakeGroundDecal.material.dispose();
                } catch (_) {}
                this.brakeGroundDecal = null;
            }
            if (this.headlightSpots) {
                this.headlightSpots.forEach(spot => {
                    try {
                        if (spot.target && spot.target.parent) spot.target.parent.remove(spot.target);
                        if (spot.parent) spot.parent.remove(spot);
                    } catch (_) {}
                });
            }

            if (this.speedStreaksMesh) {
                try {
                    if (this.speedStreaksMesh.parent) this.speedStreaksMesh.parent.remove(this.speedStreaksMesh);
                    if (this.speedStreaksMesh.geometry && typeof this.speedStreaksMesh.geometry.dispose === 'function') this.speedStreaksMesh.geometry.dispose();
                    if (this.speedStreaksMesh.material && typeof this.speedStreaksMesh.material.dispose === 'function') this.speedStreaksMesh.material.dispose();
                } catch (_) {}
                this.speedStreaksMesh = null;
            }

            if (this.speedVignetteEl && this.speedVignetteEl.parentNode) {
                try { this.speedVignetteEl.parentNode.removeChild(this.speedVignetteEl); } catch (_) {}
            }

            this.smokePool = [];
            this.activeSmoke = [];
            this.sparkPool = [];
            this.activeSparks = [];
            this.skidPool = [];
            this.activeSkids = [];
            this.headlightFlares = [];
            this.headlightCones = [];
            this.headlightSpots = [];
            this.headlightGroundPatches = [];
            this.taillightFlares = [];
            this.speedStreaksData = [];
        }
    }

    RaceEffectsManager.createRaceEffects = function(engine) {
        return new RaceEffectsManager(engine);
    };

    return RaceEffectsManager;
}));

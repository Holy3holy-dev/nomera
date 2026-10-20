/**
 * H3H NOMERA — 3D Circuit / Sprint / Drift Racing Engine (`js/nfs-circuit-race.js`)
 * ====================================================================================
 * Built on top of the clean-room `NomeraNfsPhysics` vehicle simulation core (`js/nfs-physics.js`).
 *
 * Features:
 * 1. Closed-loop Catmull-Rom track spline generator (`TRACK_PRESETS`: Industrial Ring,
 *    Canyon Pass, Harbor Sprint) with variable track width, apex curbs,
 *    chevron barriers, checkpoints, and physics-derived corner speed hints.
 * 2. Fast O(1) spatial track projection (`projectPointToTrack`) returning arc-length `s`,
 *    signed lateral offset, track tangent/normal vectors, surface type (`asphalt`, `curb`,
 *    `shoulder`), and barrier penetration.
 * 3. AI Rivals (`NfsAiRival`) where every opponent runs its own full `NfsVehiclePhysics`
 *    rigid-body simulation, following racing-line offsets, braking for upcoming curvature,
 *    using Nitro on straights, and overtaking slower traffic/cars.
 * 4. Checkpoint validation, lap timing (`currentLap`, `totalLaps`, `bestLapTime`), live race
 *    standings (`position: 1..N`), wrong-way detection, and time dilation.
 * 5. Optimized Three.js 3D renderer with merged track ribbon geometry, pooled tire smoke &
 *    collision sparks, true 3D chase/hood/bumper/far cameras following vehicle heading &
 *    velocity vectors, and a live top-right mini-map radar overlay.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        const nfsPhysics = require('./nfs-physics.js');
        module.exports = factory(nfsPhysics, root, require('./authors-road-surface.js'));
    } else {
        root.NomeraCircuitRace = factory(root.NomeraNfsPhysics, root, root.NomeraRoadSurface);
    }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function (NomeraNfsPhysics, root, RoadSurface) {
    'use strict';

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
    const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

    function normalizeAngleRad(angle) {
        let a = angle % (Math.PI * 2);
        if (a > Math.PI) a -= Math.PI * 2;
        if (a < -Math.PI) a += Math.PI * 2;
        return a;
    }

    // =========================================================================
    // 1. CLOSED-CIRCUIT TRACK PRESETS & CATMULL-ROM SPLINE GENERATOR
    // =========================================================================
    // Coordinate system in physics plane:
    //   +Z = North (initial start heading = 0)
    //   +X = East  (right of initial start direction, heading = +PI/2)
    const TRACK_PRESETS = {
        rockport_ring: {
            id: 'rockport_ring',
            name: 'Городское Кольцо',
            subtitle: 'Скоростные прямые, S-шикана и крутая шпилька',
            defaultLaps: 2,
            halfWidth: 10.0, // 20m wide arcade circuit road
            waypoints: [
                { x: 0,    z: 0 },      // 0: Start/Finish grid (heading +Z)
                { x: 0,    z: 165 },    // 1: End of Main Straight
                { x: 45,   z: 285 },    // 2: Turn 1 sweeping right entry
                { x: 155,  z: 350 },    // 3: Turn 1 exit onto North Overpass
                { x: 295,  z: 335 },    // 4: High-speed bend
                { x: 385,  z: 245 },    // 5: East Harbor entry
                { x: 355,  z: 135 },    // 6: S-Chicane Left apex
                { x: 410,  z: 25 },     // 7: S-Chicane Right apex
                { x: 390,  z: -135 },   // 8: Back Straight South
                { x: 305,  z: -245 },   // 9: Braking zone for South Hairpin
                { x: 185,  z: -265 },   // 10: Hairpin Apex
                { x: 95,   z: -185 },   // 11: Hairpin Exit
                { x: 30,   z: -110 }    // 12: Final bend onto Main Straight
            ]
        },
        canyon_pass: {
            id: 'canyon_pass',
            name: 'Горный Каньон (Серпантин)',
            subtitle: 'Техничный серпантин с глубокими апексами и перекладками',
            defaultLaps: 2,
            halfWidth: 9.5,
            waypoints: [
                { x: 0,    z: 0 },
                { x: 0,    z: 130 },
                { x: 65,   z: 220 },
                { x: 175,  z: 210 },
                { x: 235,  z: 120 },
                { x: 195,  z: 30 },
                { x: 265,  z: -55 },
                { x: 325,  z: -155 },
                { x: 240,  z: -245 },
                { x: 115,  z: -225 },
                { x: 45,   z: -120 }
            ]
        },
        bayview_sprint: {
            id: 'bayview_sprint',
            name: 'Ночная Магистраль (Порт)',
            subtitle: 'Широкая скоростная магистраль для гиперкаров 300+ км/ч',
            defaultLaps: 2,
            halfWidth: 11.0,
            waypoints: [
                { x: 0,    z: 0 },
                { x: 0,    z: 220 },
                { x: 80,   z: 360 },
                { x: 240,  z: 410 },
                { x: 410,  z: 340 },
                { x: 470,  z: 160 },
                { x: 440,  z: -60 },
                { x: 340,  z: -230 },
                { x: 170,  z: -260 },
                { x: 40,   z: -150 }
            ]
        }
    };

    function catmullRomPoint(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        const x = 0.5 * (
            (2 * p1.x) +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );
        const z = 0.5 * (
            (2 * p1.z) +
            (-p0.z + p2.z) * t +
            (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
            (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3
        );
        return { x, z };
    }

    /**
     * Builds a closed-loop segmented track from a preset or custom waypoints.
     */
    function buildCircuitTrack(presetIdOrConfig = 'rockport_ring', samplesPerSpan = 20) {
        const preset = (typeof presetIdOrConfig === 'string')
            ? (TRACK_PRESETS[presetIdOrConfig] || TRACK_PRESETS.rockport_ring)
            : Object.assign({}, TRACK_PRESETS.rockport_ring, presetIdOrConfig || {});

        const wps = preset.waypoints;
        const n = wps.length;
        const rawPoints = [];
        const steps = Math.max(8, samplesPerSpan);

        for (let i = 0; i < n; i++) {
            const p0 = wps[(i - 1 + n) % n];
            const p1 = wps[i];
            const p2 = wps[(i + 1) % n];
            const p3 = wps[(i + 2) % n];
            for (let s = 0; s < steps; s++) {
                const t = s / steps;
                rawPoints.push(catmullRomPoint(p0, p1, p2, p3, t));
            }
        }

        const totalSamples = rawPoints.length;
        const segments = [];
        let cumulativeLength = 0;

        for (let i = 0; i < totalSamples; i++) {
            const pCurr = rawPoints[i];
            const pNext = rawPoints[(i + 1) % totalSamples];
            const dx = pNext.x - pCurr.x;
            const dz = pNext.z - pCurr.z;
            const segLen = Math.max(0.001, Math.hypot(dx, dz));
            const tx = dx / segLen;
            const tz = dz / segLen;
            // Right-hand normal in physics plane (+Z forward, +X right):
            // When tangent is (0, 1), right normal is (+1, 0) = (tz, -tx)
            const nx = tz;
            const nz = -tx;
            const heading = Math.atan2(tx, tz);

            segments.push({
                index: i,
                x: pCurr.x,
                z: pCurr.z,
                nextX: pNext.x,
                nextZ: pNext.z,
                tx,
                tz,
                nx,
                nz,
                heading,
                s: cumulativeLength,
                length: segLen,
                halfWidth: preset.halfWidth || 10.0,
                curvature: 0,
                speedHintKmh: 280,
                hasCurbLeft: false,
                hasCurbRight: false,
                hasChevronLeft: false,
                hasChevronRight: false
            });

            cumulativeLength += segLen;
        }

        // Compute signed curvature and physics-based corner speed hints
        for (let i = 0; i < totalSamples; i++) {
            const prevSeg = segments[(i - 2 + totalSamples) % totalSamples];
            const nextSeg = segments[(i + 2) % totalSamples];
            const currSeg = segments[i];
            const dHeading = normalizeAngleRad(nextSeg.heading - prevSeg.heading);
            const arcSpan = Math.max(1.0, prevSeg.length * 2 + currSeg.length * 2);
            const curvature = dHeading / arcSpan; // > 0 = turning right, < 0 = turning left
            currSeg.curvature = curvature;

            const absCurv = Math.abs(curvature);
            if (absCurv > 0.0015) {
                const radius = 1 / absCurv;
                // Max safe cornering speed v = sqrt(mu_lat * g * R)
                const safeLatAccel = 1.32 * 9.81;
                const safeSpeedMs = Math.sqrt(safeLatAccel * radius);
                currSeg.speedHintKmh = clamp(safeSpeedMs * 3.6, 72, 310);
            } else {
                currSeg.speedHintKmh = 310;
            }

            // Inside & outside apex curbs on turns
            if (absCurv > 0.0045) {
                currSeg.hasCurbLeft = true;
                currSeg.hasCurbRight = true;
            }
            if (absCurv > 0.0085) {
                if (curvature > 0) {
                    // Right turn -> outside wall is on the left (-nx)
                    currSeg.hasChevronLeft = true;
                } else {
                    // Left turn -> outside wall is on the right (+nx)
                    currSeg.hasChevronRight = true;
                }
            }
        }

        // Smooth speedHintKmh backwards so braking zones anticipate upcoming hairpins
        for (let pass = 0; pass < 3; pass++) {
            for (let i = totalSamples - 1; i >= 0; i--) {
                const curr = segments[i];
                const next = segments[(i + 1) % totalSamples];
                // Max deceleration across segment: v_curr <= sqrt(v_next^2 + 2 * a_brake * L)
                const nextMs = next.speedHintKmh / 3.6;
                const maxEntryMs = Math.sqrt(nextMs * nextMs + 2 * 13.5 * curr.length);
                const maxEntryKmh = maxEntryMs * 3.6;
                if (curr.speedHintKmh > maxEntryKmh) {
                    curr.speedHintKmh = maxEntryKmh;
                }
            }
        }

        // Build 6 evenly spaced checkpoints around the circuit
        const numCheckpoints = 6;
        const checkpoints = [];
        for (let c = 0; c < numCheckpoints; c++) {
            const targetS = (c / numCheckpoints) * cumulativeLength;
            let bestSeg = segments[0];
            for (let i = 0; i < totalSamples; i++) {
                if (segments[i].s <= targetS) bestSeg = segments[i];
                else break;
            }
            checkpoints.push({
                index: c,
                s: bestSeg.s,
                segIndex: bestSeg.index,
                x: bestSeg.x,
                z: bestSeg.z,
                tx: bestSeg.tx,
                tz: bestSeg.tz,
                nx: bestSeg.nx,
                nz: bestSeg.nz,
                halfWidth: bestSeg.halfWidth
            });
        }

        function projectPointToTrack(x, z, hintSegIndex = null) {
            let bestIdx = 0;
            let bestDistSq = Infinity;
            let bestT = 0;

            const evaluateSegment = (idx) => {
                const seg = segments[idx];
                const vx = x - seg.x;
                const vz = z - seg.z;
                const proj = vx * seg.tx + vz * seg.tz;
                const t = clamp(proj / seg.length, 0, 1);
                const cx = seg.x + seg.tx * (t * seg.length);
                const cz = seg.z + seg.tz * (t * seg.length);
                const dx = x - cx;
                const dz = z - cz;
                const dSq = dx * dx + dz * dz;
                if (dSq < bestDistSq) {
                    bestDistSq = dSq;
                    bestIdx = idx;
                    bestT = t;
                }
            };

            if (Number.isInteger(hintSegIndex) && hintSegIndex >= 0 && hintSegIndex < totalSamples) {
                const windowRadius = 18;
                for (let offset = -windowRadius; offset <= windowRadius; offset++) {
                    const idx = (hintSegIndex + offset + totalSamples) % totalSamples;
                    evaluateSegment(idx);
                }
                // Fallback to full scan if car teleported or is far from hint window
                if (bestDistSq > 1600) {
                    for (let i = 0; i < totalSamples; i++) evaluateSegment(i);
                }
            } else {
                for (let i = 0; i < totalSamples; i++) evaluateSegment(i);
            }

            const seg = segments[bestIdx];
            const nextSeg = segments[(bestIdx + 1) % totalSamples];
            const cx = seg.x + seg.tx * (bestT * seg.length);
            const cz = seg.z + seg.tz * (bestT * seg.length);

            // Signed lateral offset (+ right of centerline, - left of centerline)
            const relX = x - cx;
            const relZ = z - cz;
            const lateralOffset = relX * seg.nx + relZ * seg.nz;

            const s = (seg.s + bestT * seg.length) % cumulativeLength;
            const absLat = Math.abs(lateralOffset);
            const halfWidth = seg.halfWidth;

            let surface = 'asphalt';
            if (absLat > halfWidth - 0.35) {
                surface = 'shoulder';
            } else if (absLat > halfWidth - 1.45 && (seg.hasCurbLeft || seg.hasCurbRight)) {
                surface = 'curb';
            }

            const wallPenetration = Math.max(0, absLat - halfWidth);
            // Wall normal points INWARD toward the track centerline
            const wallSideSign = lateralOffset >= 0 ? 1 : -1;
            const wallNormalX = -seg.nx * wallSideSign;
            const wallNormalZ = -seg.nz * wallSideSign;

            const headingTrack = normalizeAngleRad(
                seg.heading + normalizeAngleRad(nextSeg.heading - seg.heading) * bestT
            );

            return {
                segIndex: bestIdx,
                s,
                centerX: cx,
                centerZ: cz,
                lateralOffset,
                halfWidth,
                tx: seg.tx,
                tz: seg.tz,
                nx: seg.nx,
                nz: seg.nz,
                curvature: lerp(seg.curvature, nextSeg.curvature, bestT),
                speedHintKmh: lerp(seg.speedHintKmh, nextSeg.speedHintKmh, bestT),
                surface,
                isOffTrack: absLat > halfWidth - 0.35,
                wallPenetration,
                wallNormalX,
                wallNormalZ,
                headingTrack
            };
        }

        function sampleTrackAtS(sMeters) {
            const total = cumulativeLength;
            const wrappedS = ((sMeters % total) + total) % total;
            // Binary search for segment containing wrappedS
            let lo = 0;
            let hi = totalSamples - 1;
            while (lo < hi) {
                const mid = (lo + hi + 1) >> 1;
                if (segments[mid].s <= wrappedS) lo = mid;
                else hi = mid - 1;
            }
            const seg = segments[lo];
            const nextSeg = segments[(lo + 1) % totalSamples];
            const localT = clamp((wrappedS - seg.s) / Math.max(0.001, seg.length), 0, 1);
            return {
                segIndex: lo,
                s: wrappedS,
                x: seg.x + seg.tx * (localT * seg.length),
                z: seg.z + seg.tz * (localT * seg.length),
                tx: seg.tx,
                tz: seg.tz,
                nx: seg.nx,
                nz: seg.nz,
                heading: normalizeAngleRad(seg.heading + normalizeAngleRad(nextSeg.heading - seg.heading) * localT),
                curvature: lerp(seg.curvature, nextSeg.curvature, localT),
                speedHintKmh: lerp(seg.speedHintKmh, nextSeg.speedHintKmh, localT),
                halfWidth: seg.halfWidth
            };
        }

        return {
            id: preset.id,
            name: preset.name,
            subtitle: preset.subtitle,
            defaultLaps: preset.defaultLaps || 2,
            halfWidth: preset.halfWidth || 10.0,
            totalLength: cumulativeLength,
            segments,
            samples: segments,
            checkpoints,
            projectPointToTrack,
            sampleTrackAtS
        };
    }

    // =========================================================================
    // 2. AI RIVAL ROSTER & CONTROLLER (POWERED BY REAL NfsVehiclePhysics)
    // =========================================================================
    const AI_RIVAL_ROSTER = [
        {
            id: 'm3_gtr',
            driverName: 'BMW M3 E46 GTR',
            carName: 'BMW M3 E46 GTR',
            plate: 'M 001 GT | 777 RUS',
            color: '#cbd5e1',
            vinyl: 'none',
            spoiler: 'gtr',
            preferredLineOffset: -2.2
        },
        {
            id: 'corvette_c6r',
            driverName: 'Chevrolet Corvette C6.R',
            carName: 'Chevrolet Corvette C6.R',
            plate: 'K 001 CP | 77 RUS',
            color: '#1e293b',
            vinyl: 'none',
            spoiler: 'none',
            preferredLineOffset: 2.2
        },
        {
            id: 'mustang_gt',
            driverName: 'Ford Mustang GT',
            carName: 'Ford Mustang GT',
            plate: 'M 015 GT | 99 RUS',
            color: '#0f172a',
            vinyl: 'none',
            spoiler: 'none',
            preferredLineOffset: -2.4
        },
        {
            id: 'slr_mclaren',
            driverName: 'Mercedes-Benz SLR McLaren',
            carName: 'Mercedes-Benz SLR McLaren',
            plate: 'C 002 MP | 777 RUS',
            color: '#18181b',
            vinyl: 'mw_blacklist',
            spoiler: 'gt',
            preferredLineOffset: 2.0
        },
        {
            id: 'aston_db9',
            driverName: 'Aston Martin DB9',
            carName: 'Aston Martin DB9',
            plate: 'A 003 MT | 777 RUS',
            color: '#eab308',
            vinyl: 'stripes',
            spoiler: 'gt',
            preferredLineOffset: -1.8
        },
        {
            id: 'dodge_viper',
            driverName: 'Dodge Viper SRT10',
            carName: 'Dodge Viper SRT10',
            plate: 'B 004 CP | 777 RUS',
            color: '#16a34a',
            vinyl: 'mw_blacklist',
            spoiler: 'gtr',
            preferredLineOffset: 1.8
        },
        {
            id: 'gallardo',
            driverName: 'Lamborghini Gallardo',
            carName: 'Lamborghini Gallardo',
            plate: 'M 006 KO | 777 RUS',
            color: '#334155',
            vinyl: 'stripes',
            spoiler: 'none',
            preferredLineOffset: -2.0
        },
        {
            id: 'lancer_evo',
            driverName: 'Mitsubishi Lancer Evo VIII',
            carName: 'Mitsubishi Lancer Evo VIII',
            plate: 'E 009 BO | 78 RUS',
            color: '#f8fafc',
            vinyl: 'drift',
            spoiler: 'gt',
            preferredLineOffset: 2.4
        },
        {
            id: 'mazda_rx8',
            driverName: 'Mazda RX-8',
            carName: 'Mazda RX-8',
            plate: 'X 012 PX | 777 RUS',
            color: '#ef4444',
            vinyl: 'drift',
            spoiler: 'gt',
            preferredLineOffset: -1.6
        },
        {
            id: 'toyota_supra',
            driverName: 'Toyota Supra MK4',
            carName: 'Toyota Supra MK4',
            plate: 'C 013 MK | 777 RUS',
            color: '#f97316',
            vinyl: 'mw_blacklist',
            spoiler: 'gtr',
            preferredLineOffset: 1.6
        },
        {
            id: 'lexus_is300',
            driverName: 'Lexus IS300',
            carName: 'Lexus IS300',
            plate: 'T 014 KC | 125 RUS',
            color: '#ca8a04',
            vinyl: 'drift',
            spoiler: 'ducktail',
            preferredLineOffset: 0.0
        },
        {
            id: 'golf_gti',
            driverName: 'Volkswagen Golf GTI',
            carName: 'Volkswagen Golf GTI',
            plate: 'C 015 GT | 777 RUS',
            color: '#1d4ed8',
            vinyl: 'drift',
            spoiler: 'ducktail',
            preferredLineOffset: -1.2
        }
    ];

    const DIFFICULTY_PRESETS = {
        easy: {
            id: 'easy',
            name: 'Лёгкий',
            cornerSpeedFactor: 0.84,
            throttleLimit: 0.88,
            nitroChance: 0.25,
            reactionSteerKp: 2.35,
            rubberBandBehindBoost: 1.03,
            rubberBandAheadCap: 0.90
        },
        medium: {
            id: 'medium',
            name: 'Средний',
            cornerSpeedFactor: 0.95,
            throttleLimit: 0.96,
            nitroChance: 0.55,
            reactionSteerKp: 2.75,
            rubberBandBehindBoost: 1.06,
            rubberBandAheadCap: 0.94
        },
        hard: {
            id: 'hard',
            name: 'Профи',
            cornerSpeedFactor: 1.04,
            throttleLimit: 1.00,
            nitroChance: 0.85,
            reactionSteerKp: 3.10,
            rubberBandBehindBoost: 1.10,
            rubberBandAheadCap: 0.97
        }
    };

    // =========================================================================
    // 3. CIRCUIT RACE ENGINE (`NomeraCircuitRaceEngine`)
    // =========================================================================
    class NomeraCircuitRaceEngine {
        constructor(container, options = {}) {
            this.container = container || null;
            this.options = Object.assign({
                trackId: 'rockport_ring',
                totalLaps: 2,
                rivalCount: 3,
                difficulty: 'medium',
                skipCountdown: false
            }, options);

            this.THREE = (typeof root !== 'undefined' && root.THREE) ? root.THREE : null;
            this.isRunning = false;
            this._destroyed = false;
            this.animFrame = null;
            this.lastTimestamp = 0;

            this.track = buildCircuitTrack(this.options.trackId || 'rockport_ring');
            this.totalLaps = Math.max(1, Number(this.options.totalLaps) || this.track.defaultLaps || 2);
            this.difficulty = DIFFICULTY_PRESETS[this.options.difficulty] || DIFFICULTY_PRESETS.medium;

            this.keys = {
                left: false,
                right: false,
                gas: false,
                brake: false,
                drift: false,
                nitro: false,
                horn: false,
                speedbreaker: false
            };

            this.cameraModes = root.NOMERA_AUTHORS_PREVIEW?['chase', 'far', 'hood', 'bumper','cockpit']:['chase', 'far', 'hood', 'bumper'];
            this.cameraModeIndex = 0;
            this.cameraMode = 'chase';
            this.weatherCycleOrder = ['auto', 'day', 'sunset', 'night', 'rain', 'fog', 'snow'];
            this.weatherMode = 'night';
            this.currentActiveWeather = 'night';

            this.playerPhysics = null;
            this.playerProgress = null;
            this.rivals = [];
            this.standings = [];

            // Legacy-compatible state object so `js/app.js` HUD & settlement work identically
            this.state = {
                x: 0,
                z: 0,
                vx: 0,
                vz: 0,
                speed: 0,
                peakSpeed: 0,
                maxSpeed: 240,
                accel: 3.0,
                handling: 6.5,
                gear: 1,
                rpm: 1000,
                idleRpm: 900,
                maxRpm: 7500,
                nitroLevel: 100,
                nitroDepleted: false,
                isNitroActive: false,
                isDrifting: false,
                driftAngle: 0,
                driftScore: 0,
                driftCurrentScore: 0,
                driftCombo: 1,
                driftComboTimer: 0,
                overtakesCount: 0,
                overtakeCombo: 1,
                nearMissCount: 0,
                shashkiCombo: 0,
                distanceKm: 0,
                earnedCash: 0,
                fuelCurrent: 45,
                fuelCapacity: 45,
                fuelLiters: 0,
                fuelConsumption: 9.0,
                damageTaken: 0,
                rewardMult: 1.5,
                wantedStars: 0,
                isPursuitActive: false,
                escapeTimer: 0,
                bustedTimer: 0,
                isBusted: false,
                // Circuit-specific telemetry
                racePhase: 'countdown', // 'countdown' | 'racing' | 'finished'
                countdownTimer: 2.4,
                countdownText: '3',
                raceTimeSec: 0,
                currentLap: 1,
                totalLaps: this.totalLaps,
                lapTimeSec: 0,
                bestLapTimeSec: null,
                lapTimes: [],
                position: 1,
                totalRacers: 4,
                isWrongWay: false,
                wrongWayTimer: 0,
                speedbreakerCharge: 100,
                isSpeedbreakerActive: false,
                trackName: this.track.name
            };

            // Three.js scene objects
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.playerCar = null;
            this.playerCarBodyGroup = null;
            this.playerWheels = [];
            this.disposableGeometries = [];
            this.disposableMaterials = [];
            this.disposableTextures = [];
            this.smokePool = [];
            this.sparkPool = [];
            this.minimapCanvas = null;
            this.minimapCtx = null;
            this.circuitHudEl = null;

            this._camPos = { x: 0, y: 3.5, z: -8 };
            this._camLook = { x: 0, y: 1.2, z: 12 };
        }

        // Convert physics world (x right, z forward, heading clockwise from +Z)
        // into Three.js right-handed world (-x, y, z, rotation.y = -heading)
        toThreeX(physX) {
            return -physX;
        }
        toThreeZ(physZ) {
            return physZ;
        }
        toThreeYaw(physHeading) {
            return -physHeading;
        }

        start(config = {}) {
            this.carConfig = Object.assign({
                carName: 'BMW M5 F90 Competition',
                styling: {},
                performance: { speed: 260, accel: 3.5, handling: 7.5, rewardMult: 2.0 },
                mode: 'nfs_circuit',
                weather: 'night'
            }, config);

            if (config.trackId && TRACK_PRESETS[config.trackId]) {
                this.track = buildCircuitTrack(config.trackId);
            }
            if(config.physicsKernel&&RoadSurface)this.track=buildCircuitTrack(this.track.id,100);
            this.roadSurface=config.physicsKernel&&RoadSurface?RoadSurface.circuit(this.track):null;
            if (config.totalLaps) {
                this.totalLaps = Math.max(1, Number(config.totalLaps));
            }
            if (config.difficulty && DIFFICULTY_PRESETS[config.difficulty]) {
                this.difficulty = DIFFICULTY_PRESETS[config.difficulty];
            }

            const perf = this.carConfig.performance || {};
            const skipCountdown = Boolean(config.skipCountdown !== undefined ? config.skipCountdown : this.options.skipCountdown);

            // Initialize Player NfsVehiclePhysics on starting grid (P4 / back-right slot)
            const startSeg = this.track.segments[0];
            const playerStartS = this.track.totalLength - 14;
            const playerGridSample = this.track.sampleTrackAtS(playerStartS);
            const playerLateral = 2.4;
            const playerStartX = playerGridSample.x + playerGridSample.nx * playerLateral;
            const playerStartZ = playerGridSample.z + playerGridSample.nz * playerLateral;

            this.playerPhysics = new NomeraNfsPhysics.NfsVehiclePhysics({
                carName: this.carConfig.carName,
                performance: perf,
                upgrades: Object.assign({}, this.carConfig.upgrades || {}, this.carConfig.styling || {}),
                styling: this.carConfig.styling || {},
                weather: config.weather === 'auto' ? 'night' : (config.weather || 'night'),
                transmissionMode: config.transmissionMode || 'auto',
                physicsKernel: config.physicsKernel || null,
                sampleGroundContact: this.roadSurface?(x,z)=>this.roadSurface.sample(x,z):null,
                x: playerStartX,
                z: playerStartZ,
                heading: playerGridSample.heading
            });

            this.playerProgress = this._createRacerProgress('player', 'Вы (' + this.carConfig.carName + ')', this.carConfig.carName, true, playerStartS, startSeg.index);
            this.playerProgress.lap = 1;
            this.playerProgress.unwrappedS = -14;
            this.playerProgress.totalDistanceMeters = 0;

            // Spawn AI Rivals on grid slots P1..P3 ahead of player
            this._initAiRivals(perf);

            const rivalCount = this.rivals.length;
            this.state = Object.assign(this.state, {
                x: playerStartX,
                z: playerStartZ,
                vx: 0,
                vz: 0,
                speed: 0,
                peakSpeed: 0,
                maxSpeed: this.playerPhysics.profile.topSpeedKmh,
                accel: perf.accel || 3.2,
                handling: perf.handling || 7.0,
                gear: 1,
                rpm: this.playerPhysics.state.rpm,
                idleRpm: this.playerPhysics.profile.idleRpm,
                maxRpm: this.playerPhysics.profile.redlineRpm,
                nitroLevel: 100,
                nitroDepleted: false,
                isNitroActive: false,
                isDrifting: false,
                driftAngle: 0,
                driftScore: 0,
                driftCurrentScore: 0,
                driftCombo: 1,
                driftComboTimer: 0,
                overtakesCount: 0,
                overtakeCombo: 1,
                nearMissCount: 0,
                shashkiCombo: 0,
                distanceKm: 0,
                earnedCash: 0,
                fuelCurrent: perf.tankCapacity || 45,
                fuelCapacity: perf.tankCapacity || 45,
                fuelLiters: 0,
                fuelConsumption: perf.consumption || 9.0,
                damageTaken: 0,
                rewardMult: perf.rewardMult || 1.5,
                racePhase: skipCountdown ? 'racing' : 'countdown',
                countdownTimer: skipCountdown ? 0 : 2.4,
                countdownText: skipCountdown ? 'GO!' : '3',
                raceTimeSec: 0,
                currentLap: 1,
                totalLaps: this.totalLaps,
                lapTimeSec: 0,
                bestLapTimeSec: null,
                lapTimes: [],
                position: rivalCount + 1,
                totalRacers: rivalCount + 1,
                isWrongWay: false,
                wrongWayTimer: 0,
                speedbreakerCharge: 100,
                isSpeedbreakerActive: false,
                trackName: this.track.name
            });

            this._updateStandings();

            // Initialize 3D Scene & UI Overlays if container and THREE exist
            if (this.container && this.THREE) {
                this._initThreeScene();
                this._initCircuitOverlayDOM();
            }

            this.isRunning = true;
            this.lastTimestamp = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            this._scheduleNextFrame();
            this.notifyHUD();
        }

        _createRacerProgress(id, driverName, carName, isPlayer, initialS, initialSegIdx) {
            return {
                id,
                driverName,
                carName,
                isPlayer: !!isPlayer,
                lap: 1,
                nextCheckpoint: 1,
                checkpointsPassed: 0,
                lastSegIndex: initialSegIdx || 0,
                lastS: initialS || 0,
                unwrappedS: 0,
                totalDistanceMeters: 0,
                lateralOffset: 0,
                lapStartTime: 0,
                currentLapTime: 0,
                bestLapTime: null,
                lapTimes: [],
                finished: false,
                finishTime: null,
                position: 1,
                stuckTimer: 0,
                reverseRecoveryTimer: 0
            };
        }

        _initAiRivals(playerPerf) {
            this.rivals = [];
            const count = clamp(Number(this.options.rivalCount ?? 3), 0, 5);
            if (count === 0) return;

            const playerTopSpeed = clamp(Number(playerPerf?.speed) || 235, 165, 415);
            const playerAccel = clamp(Number(playerPerf?.accel) || 3.0, 1.8, 7.5);
            const playerHandling = clamp(Number(playerPerf?.handling) || 6.5, 4.0, 10.0);

            for (let i = 0; i < count; i++) {
                const template = AI_RIVAL_ROSTER[i % AI_RIVAL_ROSTER.length];
                // Grid slots ahead of the player: P1 (-4m), P2 (-7m), P3 (-10.5m)
                const gridBackMeters = 4.0 + i * 3.5;
                const startS = this.track.totalLength - gridBackMeters;
                const gridSample = this.track.sampleTrackAtS(startS);
                const gridSide = (i % 2 === 0) ? -2.4 : 2.4;
                const startX = gridSample.x + gridSample.nx * gridSide;
                const startZ = gridSample.z + gridSample.nz * gridSide;

                // Scale AI car performance relative to player's car and difficulty so races are competitive
                const rankScale = 1.02 - i * 0.025;
                const diffScale = this.difficulty.cornerSpeedFactor;
                const rivalPerf = {
                    speed: clamp(Math.round(playerTopSpeed * rankScale * diffScale), 165, 410),
                    accel: clamp(Number((playerAccel * rankScale * diffScale).toFixed(2)), 1.8, 7.5),
                    handling: clamp(Number((playerHandling * rankScale).toFixed(2)), 4.5, 9.8),
                    rewardMult: 1.0
                };

                const physics = new NomeraNfsPhysics.NfsVehiclePhysics({
                    carName: template.carName,
                    performance: rivalPerf,
                    styling: {
                        color: template.color,
                        vinyl: template.vinyl,
                        spoiler: template.spoiler,
                        plate: template.plate
                    },
                    weather: this.currentActiveWeather,
                    transmissionMode: 'auto',
                    physicsKernel: this.carConfig.physicsKernel || null,
                    sampleGroundContact: this.roadSurface?(x,z)=>this.roadSurface.sample(x,z):null,
                    x: startX,
                    z: startZ,
                    heading: gridSample.heading
                });

                const progress = this._createRacerProgress(
                    `rival_${i}`,
                    template.driverName,
                    template.carName,
                    false,
                    startS,
                    gridSample.segIndex
                );
                progress.unwrappedS = -gridBackMeters;

                this.rivals.push({
                    id: `rival_${i}`,
                    template,
                    physics,
                    progress,
                    mesh: null,
                    wheels: [],
                    preferredLineOffset: template.preferredLineOffset || ((i % 2 === 0) ? -2.0 : 2.0),
                    currentLineOffset: gridSide,
                    lineNoisePhase: i * 1.7
                });
            }
        }

        // =====================================================================
        // INPUT & CONTROLS
        // =====================================================================
        setKey(key, isDown) {
            const val = !!isDown;
            if (this.keys[key] !== undefined) {
                this.keys[key] = val;
            }
        }

        resetKeys() {
            Object.keys(this.keys).forEach(k => { this.keys[k] = false; });
        }

        toggleSpeedbreaker() {
            if (this.playerPhysics) {
                this.playerPhysics.setSpeedbreaker(false);
            }
            this.state.isSpeedbreakerActive = false;
            return false;
        }

        cycleCamera() {
            this.cameraModeIndex = (this.cameraModeIndex + 1) % this.cameraModes.length;
            this.cameraMode = this.cameraModes[this.cameraModeIndex];
            const labels = {
                chase: '🎥 КАМЕРА: БЛИЖНЯЯ',
                far: '🎥 КАМЕРА: ДАЛЬНЯЯ (ОБЗОР)',
                hood: '🎥 КАМЕРА: С КАПОТА',cockpit:'🎥 КАМЕРА: ВОДИТЕЛЬ',
                bumper: '🎥 КАМЕРА: БАМПЕР (АСФАЛЬТ)'
            };
            if (this.options.onPopup) {
                this.options.onPopup(labels[this.cameraMode] || '🎥 КАМЕРА', '#38bdf8');
            }
            return this.cameraMode;
        }

        setWeather(mode, silent = false) {
            this.weatherMode = mode || 'night';
            this.currentActiveWeather = this.weatherMode === 'auto' ? 'night' : this.weatherMode;
            if (this.playerPhysics) this.playerPhysics.setWeather(this.currentActiveWeather);
            for (const r of this.rivals) {
                r.physics.setWeather(this.currentActiveWeather);
            }
            this._applyWeatherToScene();
            if (!silent) this.notifyHUD();
            return this.weatherMode;
        }

        cycleWeather() {
            const idx = this.weatherCycleOrder.indexOf(this.weatherMode);
            const next = this.weatherCycleOrder[(idx + 1) % this.weatherCycleOrder.length];
            return this.setWeather(next, false);
        }

        getWeatherPreset(w) {
            const presets = {
                day: { id: 'day', name: 'Солнечный день', icon: '☀️', sky: 0x38bdf8, fog: 0x7dd3fc, ambient: 1.25, sun: 1.55 },
                sunset: { id: 'sunset', name: 'Золотой закат', icon: '🌅', sky: 0x5b21b6, fog: 0x9a3412, ambient: 1.10, sun: 1.40 },
                night: { id: 'night', name: 'Ночной город', icon: '🌃', sky: 0x0c192c, fog: 0x11223b, ambient: 0.98, sun: 1.18 },
                rain: { id: 'rain', name: 'Грозовой ливень', icon: '🌧️', sky: 0x0f2032, fog: 0x162b40, ambient: 0.92, sun: 1.05 },
                fog: { id: 'fog', name: 'Густой туман', icon: '🌫️', sky: 0x64748b, fog: 0x64748b, ambient: 1.00, sun: 0.85 },
                snow: { id: 'snow', name: 'Зимний гололёд', icon: '❄️', sky: 0x3b4d63, fog: 0x475569, ambient: 1.15, sun: 1.20 }
            };
            return presets[w] || presets.night;
        }

        // =====================================================================
        // MAIN LOOP & DETERMINISTIC STEP
        // =====================================================================
        _scheduleNextFrame() {
            if (!this.isRunning || this._destroyed) return;
            const raf = (typeof root !== 'undefined' && typeof root.requestAnimationFrame === 'function')
                ? root.requestAnimationFrame.bind(root)
                : null;
            if (!raf) return;
            this.animFrame = raf((ts) => {
                if (!this.isRunning || this._destroyed) return;
                const rawDt = (ts - this.lastTimestamp) / 1000;
                this.lastTimestamp = ts;
                const dt = clamp(Number.isFinite(rawDt) && rawDt > 0 ? rawDt : (1 / 60), 0.001, 0.05);
                this.update(dt);
                this.render();
                this._scheduleNextFrame();
            });
        }

        stop() {
            this.isRunning = false;
            this.authorsRecoverButton?.remove();this.authorsRecoverButton=null;
            if (this.animFrame && typeof root !== 'undefined' && typeof root.cancelAnimationFrame === 'function') {
                try { root.cancelAnimationFrame(this.animFrame); } catch (_) {}
            }
            this.animFrame = null;
        }

        update(dt) {
            if (!this.playerPhysics) return this.state;
            const safeDt = clamp(Number.isFinite(dt) && dt > 0 ? dt : (1 / 60), 0.0005, 0.25);

            // 1. Handle Start Countdown (3 - 2 - 1 - GO!)
            if (this.state.racePhase === 'countdown') {
                this.state.countdownTimer -= safeDt;
                const rem = this.state.countdownTimer;
                const prevText = this.state.countdownText;
                if (rem > 1.6) this.state.countdownText = '3';
                else if (rem > 0.8) this.state.countdownText = '2';
                else if (rem > 0.0) this.state.countdownText = '1';
                else {
                    this.state.countdownText = '🟢 СТАРТ!';
                    this.state.racePhase = 'racing';
                    if (this.options.onPopup) this.options.onPopup('🟢 СТАРТ ГОНКИ!', '#10b981');
                    if (this.options.onSound) this.options.onSound('countdown_go');
                }
                if (this.state.countdownText !== prevText && this.state.racePhase === 'countdown') {
                    if (this.options.onPopup) this.options.onPopup(`🚦 ${this.state.countdownText}...`, '#fbbf24');
                    if (this.options.onSound) this.options.onSound('countdown_beep');
                }
                // Allow engine revving on the grid without moving
                if (this.keys.gas) {
                    this.playerPhysics.state.rpm = clamp(
                        this.playerPhysics.state.rpm + 4500 * safeDt,
                        this.playerPhysics.profile.idleRpm,
                        this.playerPhysics.profile.redlineRpm * 0.88
                    );
                } else {
                    this.playerPhysics.state.rpm = clamp(
                        this.playerPhysics.state.rpm - 3200 * safeDt,
                        this.playerPhysics.profile.idleRpm,
                        this.playerPhysics.profile.redlineRpm
                    );
                }
                this.state.rpm = Math.round(this.playerPhysics.state.rpm);
                this._sync3DMeshes(false,safeDt);
                this.notifyHUD();
                return this.state;
            }

            if (this.state.racePhase === 'racing') {
                this.state.raceTimeSec += safeDt;
                this.state.lapTimeSec += safeDt;
            }

            if(this.playerPhysics.mwKernel)for(const p of [this.playerPhysics,...this.rivals.map(r=>r.physics)])p.collisionPreviousPose={x:p.x,y:p.y,z:p.z};
            // 2. Project Player onto Track Spline to determine current surface & curvature
            const pState = this.playerPhysics.state;
            const pTrack = this.track.projectPointToTrack(pState.x, pState.z, this.playerProgress.lastSegIndex);
            this.playerPhysics.setSurface(pTrack.surface);

            // Fuel consumption check
            const hasFuel = this.state.fuelCurrent > 0.001;
            if (this.carConfig.physicsKernel) pState.fuelCurrent = this.state.fuelCurrent;
            const playerInput = {
                left: this.keys.left,
                right: this.keys.right,
                gas: hasFuel ? this.keys.gas : false,
                brake: this.keys.brake,
                handbrake: this.keys.drift,
                nitro: hasFuel ? this.keys.nitro : false,
                speedbreaker: this.keys.speedbreaker
            };

            // 3. Step Player Physics (Fixed-timestep accumulator inside NfsVehiclePhysics)
            this.playerPhysics.update(safeDt, playerInput);

            // Re-project after movement and resolve track barrier collision
            const pTrackAfter = this.track.projectPointToTrack(pState.x, pState.z, pTrack.segIndex);
            if (pTrackAfter.wallPenetration > 0 || this.playerPhysics.mwTires&&Math.abs(pTrackAfter.lateralOffset)+this.playerPhysics.profile.wheelbase*.85>pTrackAfter.halfWidth) {
                // Clamp position inside track wall and apply impulse
                const clampedLat = Math.sign(pTrackAfter.lateralOffset) * pTrackAfter.halfWidth;
                if(!this.playerPhysics.mwTires){
                    pState.x = pTrackAfter.centerX + pTrackAfter.nx * clampedLat;
                    pState.z = pTrackAfter.centerZ + pTrackAfter.nz * clampedLat;
                }
                const impact = this.playerPhysics.mwTires ? this.playerPhysics.resolveWallCollision({normalX:pTrackAfter.wallNormalX,normalZ:pTrackAfter.wallNormalZ,penetration:pTrackAfter.wallPenetration,planePoint:[pTrackAfter.centerX+pTrackAfter.nx*Math.sign(pTrackAfter.lateralOffset)*pTrackAfter.halfWidth,0,pTrackAfter.centerZ+pTrackAfter.nz*Math.sign(pTrackAfter.lateralOffset)*pTrackAfter.halfWidth],restitution:.28,duration:safeDt,wallHeight:1.15,groundHeight:this.roadSurface?this.roadSurface.heightAt(pTrackAfter.s,pTrackAfter.lateralOffset):0}).closingSpeedMps : this.playerPhysics.resolveWallCollision(
                    pTrackAfter.wallNormalX,
                    pTrackAfter.wallNormalZ,
                    pTrackAfter.wallPenetration,
                    0.28
                );
                if (impact > 4.5) {
                    const dmg = clamp((impact - 4.0) * 0.55, 0.5, 14);
                    this.state.damageTaken = clamp(this.state.damageTaken + dmg, 0, 100);
                    if (this.options.onSound) this.options.onSound(impact > 12 ? 'crash' : 'scrape');
                    this._spawnCollisionSparks(pState.x, pState.z, 6);
                }
            }

            // Update Player Checkpoint & Lap Progress
            this._updateRacerProgress(this.playerProgress, pState, pTrackAfter, safeDt);

            // Wrong-way check for player
            const headingDiff = Math.abs(normalizeAngleRad(pState.heading - pTrackAfter.headingTrack));
            if (headingDiff > Math.PI * 0.65 && pState.vForward > 3.5) {
                this.state.wrongWayTimer += safeDt;
                if (this.state.wrongWayTimer > 0.9 && !this.state.isWrongWay) {
                    this.state.isWrongWay = true;
                    if (this.options.onPopup) this.options.onPopup('⚠️ НЕВЕРНОЕ НАПРАВЛЕНИЕ! РАЗВЕРНИТЕСЬ!', '#ef4444');
                }
            } else {
                this.state.wrongWayTimer = 0;
                this.state.isWrongWay = false;
            }

            // 4. Step AI Rivals (Each running its own NfsVehiclePhysics)
            for (const rival of this.rivals) {
                this._updateAiRival(rival, safeDt);
            }

            // 5. Resolve Pairwise Vehicle-to-Vehicle Rigid-Body Collisions
            this._resolveAllVehicleCollisions();

            // 6. Update Live Race Standings & Overtake Detection
            const prevPos = this.state.position;
            this._updateStandings();
            if (this.state.position < prevPos && this.state.raceTimeSec > 1.5) {
                this.state.overtakesCount += (prevPos - this.state.position);
                const overtakeBonus = Math.round(1200 * (this.state.rewardMult || 1));
                this.state.earnedCash += overtakeBonus;
                if (this.options.onPopup) {
                    this.options.onPopup(`🔥 ОБГОН СОПЕРНИКА! ПОЗИЦИЯ ${this.state.position}/${this.state.totalRacers} (+${overtakeBonus} ₽)`, '#34d399');
                }
                if (this.options.onSound) this.options.onSound('nearMiss');
            }

            // 7. Update Economy, Fuel, Drift Score & Telemetry State
            const distDeltaKm = Math.max(0, pState.vForward * safeDt) / 1000;
            this.state.distanceKm += distDeltaKm;
            if (distDeltaKm > 0 && hasFuel) {
                const burned = (distDeltaKm * (this.state.fuelConsumption || 9.0)) / 100;
                this.state.fuelLiters += burned;
                this.state.fuelCurrent = Math.max(0, this.state.fuelCurrent - burned);
            }

            // Continuous clean-driving & speed cash reward
            if (!pState.isOnWall && pState.speedKmh > 30 && this.state.racePhase === 'racing') {
                this.state.earnedCash += (pState.speedKmh * 3.2 * (this.state.rewardMult || 1)) * safeDt;
            }

            this.state.x = pState.x;
            this.state.z = pState.z;
            this.state.vx = pState.vx;
            this.state.vz = pState.vz;
            this.state.speed = pState.speedKmh;
            if (pState.speedKmh > this.state.peakSpeed) {
                this.state.peakSpeed = pState.speedKmh;
            }
            this.state.gear = pState.gear;
            this.state.rpm = pState.rpm;
            this.state.nitroLevel = pState.nitro;
            this.state.nitroDepleted = pState.nitroDepleted;
            this.state.isNitroActive = pState.isNitroActive;
            this.state.isDrifting = pState.isDrifting;
            this.state.driftAngle = pState.driftAngleRad;
            this.state.driftScore = pState.driftScore;
            this.state.driftCurrentScore = pState.driftCurrentScore;
            this.state.driftCombo = pState.driftCombo;
            const wasSb = this.state.isSpeedbreakerActive;
            this.state.speedbreakerCharge = pState.speedbreakerCharge;
            this.state.isSpeedbreakerActive = pState.isSpeedbreakerActive;
            if (!wasSb && pState.isSpeedbreakerActive && this.options.onSound) {
                this.options.onSound('speedbreakerOn');
            } else if (wasSb && !pState.isSpeedbreakerActive && this.options.onSound) {
                this.options.onSound('speedbreakerOff');
            }

            // Spawn tire smoke when drifting
            if (pState.isDrifting && pState.speedKmh > 35) {
                this._spawnTireSmoke(pState.x, pState.z, pState.heading);
            }
            this._updateParticles(safeDt);

            // Check fuel exhaustion or total wreck
            if (this.state.damageTaken >= 100 && this.state.racePhase === 'racing') {
                this.state.racePhase = 'finished';
                this.stop();
                if (this.options.onGameOver) {
                    this.options.onGameOver('crash', this.getState());
                }
                return this.state;
            }
            if (this.state.fuelCurrent <= 0.001 && pState.speedKmh <= 5 && this.state.racePhase === 'racing') {
                this.state.racePhase = 'finished';
                this.stop();
                if (this.options.onGameOver) {
                    this.options.onGameOver('fuel', this.getState());
                }
                return this.state;
            }

            this._sync3DMeshes(false,safeDt);
            this._updateCircuitOverlayDOM();
            this.notifyHUD();
            return this.state;
        }

        _updateRacerProgress(progress, physState, trackProj, dt) {
            const L = this.track.totalLength;
            let deltaS = trackProj.s - progress.lastS;
            if (deltaS < -L * 0.5) deltaS += L;
            if (deltaS > L * 0.5) deltaS -= L;

            progress.lastS = trackProj.s;
            progress.lastSegIndex = trackProj.segIndex;
            progress.unwrappedS += deltaS;
            progress.totalDistanceMeters = Math.max(0, progress.unwrappedS);
            progress.lateralOffset = trackProj.lateralOffset;
            progress.currentLapTime += dt;

            // Checkpoint validation
            const checkpoints = this.track.checkpoints;
            const nextCp = checkpoints[progress.nextCheckpoint];
            if (nextCp) {
                const distToCp = Math.hypot(physState.x - nextCp.x, physState.z - nextCp.z);
                // Also accept crossing checkpoint arc-length s in forward order
                const sDiff = normalizeArcDiff(trackProj.s, nextCp.s, L);
                if (distToCp < nextCp.halfWidth * 2.4 || (sDiff >= 0 && sDiff < 28)) {
                    if (progress.nextCheckpoint === 0) {
                        // Crossed Start/Finish Line after completing all intermediate checkpoints!
                        const completedLapTime = Number(progress.currentLapTime.toFixed(2));
                        progress.lapTimes.push(completedLapTime);
                        if (progress.bestLapTime === null || completedLapTime < progress.bestLapTime) {
                            progress.bestLapTime = completedLapTime;
                        }
                        progress.currentLapTime = 0;
                        progress.checkpointsPassed++;

                        if (progress.lap >= this.totalLaps) {
                            progress.finished = true;
                            progress.finishTime = this.state.raceTimeSec;
                            if (progress.isPlayer && this.state.racePhase === 'racing') {
                                this._onPlayerFinishCircuit();
                            }
                        } else {
                            progress.lap++;
                            progress.nextCheckpoint = 1;
                            if (progress.isPlayer) {
                                this.state.currentLap = progress.lap;
                                this.state.lapTimeSec = 0;
                                this.state.bestLapTimeSec = progress.bestLapTime;
                                this.state.lapTimes = progress.lapTimes.slice();
                                const lapBonus = Math.round(15000 * (this.state.rewardMult || 1));
                                this.state.earnedCash += lapBonus;
                                if (this.options.onPopup) {
                                    this.options.onPopup(
                                        `🏁 КРУГ ${progress.lap}/${this.totalLaps}! ВРЕМЯ: ${completedLapTime.toFixed(2)}с (+${lapBonus.toLocaleString('ru-RU')} ₽)`,
                                        '#fbbf24'
                                    );
                                }
                                if (this.options.onSound) this.options.onSound('cash');
                            }
                        }
                    } else {
                        progress.checkpointsPassed++;
                        progress.nextCheckpoint = (progress.nextCheckpoint + 1) % checkpoints.length;
                        if (progress.isPlayer) {
                            const cpBonus = Math.round(2500 * (this.state.rewardMult || 1));
                            this.state.earnedCash += cpBonus;
                            if (this.options.onPopup) {
                                this.options.onPopup(`⏱️ ЧЕКПОИНТ ${progress.checkpointsPassed}! +${cpBonus.toLocaleString('ru-RU')} ₽`, '#38bdf8');
                            }
                        }
                    }
                }
            }
        }

        _onPlayerFinishCircuit() {
            this.state.racePhase = 'finished';
            this.state.bestLapTimeSec = this.playerProgress.bestLapTime;
            this.state.lapTimes = this.playerProgress.lapTimes.slice();
            this._updateStandings();

            const place = this.state.position;
            const podiumMultipliers = { 1: 45000, 2: 25000, 3: 15000, 4: 8000 };
            const basePrize = podiumMultipliers[place] || 8000;
            const prizeCash = Math.round(basePrize * (this.state.rewardMult || 1));
            this.state.earnedCash += prizeCash;

            const placeIcons = { 1: '🏆 1 МЕСТО! ПОБЕДА!', 2: '🥈 2 МЕСТО! ПОДИУМ!', 3: '🥉 3 МЕСТО! ПОДИУМ!' };
            const banner = placeIcons[place] || `🏁 ФИНИШ! ${place} МЕСТО`;
            if (this.options.onPopup) {
                this.options.onPopup(`${banner} (+${prizeCash.toLocaleString('ru-RU')} ₽)`, place === 1 ? '#10b981' : '#fbbf24');
            }
            if (this.options.onSound) this.options.onSound('cash');

            this.stop();
            if (this.options.onGameOver) {
                this.options.onGameOver(false, this.getState());
            }
        }

        _updateAiRival(rival, dt) {
            const rPhys = rival.physics;
            const rState = rPhys.state;
            const rProg = rival.progress;

            const proj = this.track.projectPointToTrack(rState.x, rState.z, rProg.lastSegIndex);
            rPhys.setSurface(proj.surface);

            // Rubber-banding within realistic physics limits
            const playerDist = this.playerProgress ? this.playerProgress.unwrappedS : 0;
            const gapToPlayer = rProg.unwrappedS - playerDist; // > 0 means AI is ahead of player
            let paceMult = this.difficulty.cornerSpeedFactor;
            if (gapToPlayer < -45) {
                paceMult *= this.difficulty.rubberBandBehindBoost;
            } else if (gapToPlayer > 55) {
                paceMult *= this.difficulty.rubberBandAheadCap;
            }

            // Look ahead along spline to steer smoothly along the racing line
            const lookAheadDist = clamp(16 + (rState.speedKmh / 3.6) * 0.85, 16, 48);
            const targetSample = this.track.sampleTrackAtS(proj.s + lookAheadDist);
            const farSample = this.track.sampleTrackAtS(proj.s + lookAheadDist * 1.65);

            // Apex-cutting racing line offset + obstacle avoidance
            let desiredOffset = rival.preferredLineOffset;
            if (Math.abs(targetSample.curvature) > 0.005) {
                // Cut toward inside apex of corner
                desiredOffset = Math.sign(targetSample.curvature) * (targetSample.halfWidth * 0.52);
            }

            // Check if player or another rival is directly ahead and shift laterally to overtake
            const allOthers = [
                { x: this.playerPhysics.state.x, z: this.playerPhysics.state.z, s: this.playerProgress.lastS, lat: this.playerProgress.lateralOffset },
                ...this.rivals.filter(o => o !== rival).map(o => ({
                    x: o.physics.state.x,
                    z: o.physics.state.z,
                    s: o.progress.lastS,
                    lat: o.progress.lateralOffset
                }))
            ];
            for (const other of allOthers) {
                const ds = normalizeArcDiff(other.s, proj.s, this.track.totalLength);
                if (ds > 2 && ds < 24 && Math.abs(other.lat - proj.lateralOffset) < 2.6) {
                    desiredOffset = other.lat >= 0
                        ? clamp(other.lat - 3.6, -proj.halfWidth + 2.2, proj.halfWidth - 2.2)
                        : clamp(other.lat + 3.6, -proj.halfWidth + 2.2, proj.halfWidth - 2.2);
                    break;
                }
            }

            rival.currentLineOffset = lerp(rival.currentLineOffset, desiredOffset, dt * 2.5);
            const targetX = targetSample.x + targetSample.nx * rival.currentLineOffset;
            const targetZ = targetSample.z + targetSample.nz * rival.currentLineOffset;

            const desiredHeading = Math.atan2(targetX - rState.x, targetZ - rState.z);
            const headingErr = normalizeAngleRad(desiredHeading - rState.heading);

            // PD Steering controller
            let steerCmd = clamp(
                headingErr * this.difficulty.reactionSteerKp - rState.yawRate * 0.16,
                -1,
                1
            );

            // Speed control for upcoming corner curvature
            const minSafeSpeedKmh = Math.min(proj.speedHintKmh, targetSample.speedHintKmh, farSample.speedHintKmh) * paceMult;
            let gasCmd = 0;
            let brakeCmd = 0;
            let nitroCmd = false;

            // Unstick recovery if wedged against a barrier
            if (rState.speedKmh < 6 && this.state.raceTimeSec > 2.0) {
                rProg.stuckTimer += dt;
                if (rProg.stuckTimer > 1.5) {
                    rProg.reverseRecoveryTimer = 1.0;
                    rProg.stuckTimer = 0;
                }
            } else {
                rProg.stuckTimer = 0;
            }

            if (rProg.reverseRecoveryTimer > 0) {
                rProg.reverseRecoveryTimer -= dt;
                gasCmd = 0;
                brakeCmd = 1;
                steerCmd = -steerCmd;
            } else if (rState.speedKmh > minSafeSpeedKmh + 14) {
                gasCmd = 0;
                brakeCmd = clamp((rState.speedKmh - minSafeSpeedKmh) / 65, 0.25, 0.95);
            } else if (rState.speedKmh > minSafeSpeedKmh) {
                gasCmd = 0.35;
                brakeCmd = 0;
            } else {
                gasCmd = this.difficulty.throttleLimit;
                brakeCmd = 0;
                if (Math.abs(targetSample.curvature) < 0.0025 && Math.abs(headingErr) < 0.14 && rState.speedKmh > 100 && rState.nitro > 45) {
                    nitroCmd = this.difficulty.nitroChance > 0.5;
                }
            }

            rPhys.update(dt, {
                steer: steerCmd,
                gas: gasCmd,
                brake: brakeCmd,
                handbrake: false,
                nitro: nitroCmd
            });

            const projAfter = this.track.projectPointToTrack(rState.x, rState.z, proj.segIndex);
            if (projAfter.wallPenetration > 0 || rPhys.mwTires&&Math.abs(projAfter.lateralOffset)+rPhys.profile.wheelbase*.85>projAfter.halfWidth) {
                const clampedLat = Math.sign(projAfter.lateralOffset) * projAfter.halfWidth;
                if(!rPhys.mwTires){
                    rState.x = projAfter.centerX + projAfter.nx * clampedLat;
                    rState.z = projAfter.centerZ + projAfter.nz * clampedLat;
                }
                if(rPhys.mwTires)rPhys.resolveWallCollision({normalX:projAfter.wallNormalX,normalZ:projAfter.wallNormalZ,penetration:projAfter.wallPenetration,planePoint:[projAfter.centerX+projAfter.nx*Math.sign(projAfter.lateralOffset)*projAfter.halfWidth,0,projAfter.centerZ+projAfter.nz*Math.sign(projAfter.lateralOffset)*projAfter.halfWidth],restitution:.25,duration:dt,wallHeight:1.15,groundHeight:this.roadSurface?this.roadSurface.heightAt(projAfter.s,projAfter.lateralOffset):0});
                else rPhys.resolveWallCollision(projAfter.wallNormalX, projAfter.wallNormalZ, projAfter.wallPenetration, 0.25);
            }

            this._updateRacerProgress(rProg, rState, projAfter, dt);
        }

        _resolveAllVehicleCollisions() {
            const racers = [
                this.playerPhysics,
                ...this.rivals.map(r => r.physics)
            ];
            const collisionRadius = 2.05; // Bounding cylinder radius (m)
            const minSep = collisionRadius * 2;

            for (let i = 0; i < racers.length; i++) {
                for (let j = i + 1; j < racers.length; j++) {
                    const a = racers[i];
                    const b = racers[j];
                    if(a.mwTires){
                        const contact=a.getVehicleContact(b);
                        if(contact){
                            const result=a._resolveMWContact(b,{...contact,restitution:.28});
                            if(i===0&&result.closingSpeedMps>5){
                                this.state.damageTaken=clamp(this.state.damageTaken+result.closingSpeedMps*.35,0,100);
                                if(this.options.onSound)this.options.onSound('crash');
                                this._spawnCollisionSparks((a.x+b.x)*.5,(a.z+b.z)*.5,8);
                            }
                        }
                        continue;
                    }
                    const dx = b.state.x - a.state.x;
                    const dz = b.state.z - a.state.z;
                    const dist = Math.hypot(dx, dz);
                    if (dist > 0.001 && dist < minSep) {
                        const nx = dx / dist;
                        const nz = dz / dist;
                        const overlap = minSep - dist;
                        const impact = a.resolveVehicleCollision(b, nx, nz, overlap, 0.38);
                        if (i === 0 && impact > 5.0) {
                            this.state.damageTaken = clamp(this.state.damageTaken + impact * 0.35, 0, 100);
                            if (this.options.onSound) this.options.onSound('crash');
                            this._spawnCollisionSparks((a.state.x + b.state.x) * 0.5, (a.state.z + b.state.z) * 0.5, 8);
                        }
                    }
                }
            }
        }

        _updateStandings() {
            const list = [];
            if (this.playerProgress) list.push(this.playerProgress);
            for (const r of this.rivals) list.push(r.progress);

            list.sort((a, b) => {
                if (a.finished && b.finished) return (a.finishTime || 0) - (b.finishTime || 0);
                if (a.finished !== b.finished) return a.finished ? -1 : 1;
                if (a.lap !== b.lap) return b.lap - a.lap;
                if (a.checkpointsPassed !== b.checkpointsPassed) return b.checkpointsPassed - a.checkpointsPassed;
                return b.unwrappedS - a.unwrappedS;
            });

            list.forEach((entry, idx) => {
                entry.position = idx + 1;
            });

            this.standings = list;
            if (this.playerProgress) {
                this.state.position = this.playerProgress.position;
                this.state.totalRacers = list.length;
            }
        }

        // =====================================================================
        // 3D RENDERING (THREE.JS) + MINI-MAP & TELEMETRY OVERLAY
        // =====================================================================
        _initThreeScene() {
            const THREE = this.THREE;
            if (!THREE || !this.container) return;

            this.container.innerHTML = '';
            const rect = (typeof this.container.getBoundingClientRect === 'function')
                ? this.container.getBoundingClientRect()
                : null;
            this.width = Math.max(320, Math.floor((rect && rect.width) || this.container.clientWidth || 800));
            this.height = Math.max(240, Math.floor((rect && rect.height) || this.container.clientHeight || 500));

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.3, 650);

            const c3d = (typeof root !== 'undefined' && root.Car3DManager) ? root.Car3DManager : null;
            if (c3d && typeof c3d.createStudioEnvironment === 'function') {
                try {
                    const envTex = c3d.createStudioEnvironment(THREE);
                    if (envTex) {
                        this.scene.environment = envTex;
                        this._trackDisposables(null, null, envTex);
                    }
                } catch (_) {}
            }

            try {
                this.renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: false,
                    powerPreference: 'high-performance'
                });
                if (THREE.sRGBEncoding !== undefined && 'outputEncoding' in this.renderer) {
                    this.renderer.outputEncoding = THREE.sRGBEncoding;
                }
                if (THREE.ACESFilmicToneMapping !== undefined && 'toneMapping' in this.renderer) {
                    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                    this.renderer.toneMappingExposure = this.carConfig.physicsKernel ? .95 : 1.28;
                }
                if (typeof this.renderer.setSize === 'function') {
                    this.renderer.setSize(this.width, this.height, false);
                }
                if (typeof this.renderer.setPixelRatio === 'function') {
                    const dpr = (typeof root !== 'undefined' && root.devicePixelRatio) ? root.devicePixelRatio : 1;
                    this.renderer.setPixelRatio(Math.min(dpr, 1.75));
                }
                if (this.renderer.domElement && typeof this.container.appendChild === 'function') {
                    this.renderer.domElement.style.width = '100%';
                    this.renderer.domElement.style.height = '100%';
                    this.renderer.domElement.style.display = 'block';
                    this.container.appendChild(this.renderer.domElement);
                }
            } catch (_) {
                this.renderer = null;
            }

            // Lighting (Ambient + Hemisphere + Sun + Fill Directional)
            this.ambientLight = new THREE.AmbientLight(0xffffff, 1.05);
            this.scene.add(this.ambientLight);

            if (THREE.HemisphereLight) {
                this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.95);
                this.hemiLight.position.set(0, 80, 0);
                this.scene.add(this.hemiLight);
            }

            this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
            this.sunLight.position.set(60, 120, 80);
            this.scene.add(this.sunLight);

            this.fillLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
            this.fillLight.position.set(-70, 85, -60);
            this.scene.add(this.fillLight);

            this._applyWeatherToScene();
            this._buildTrack3DMesh();
            this._buildCars3D();
            this._initParticlePools();
            this._bindResize();
            this._sync3DMeshes(true);
        }

        _applyWeatherToScene() {
            const THREE = this.THREE;
            if (!THREE || !this.scene) return;
            const preset = this.getWeatherPreset(this.currentActiveWeather);
            if (THREE.Color) {
                this.scene.background = new THREE.Color(preset.sky);
            }
            if (THREE.FogExp2) {
                this.scene.fog = new THREE.FogExp2(preset.fog, this.currentActiveWeather === 'fog' ? 0.0065 : 0.0016);
            }
            if (this.ambientLight) this.ambientLight.intensity = preset.ambient;
            if (this.sunLight) this.sunLight.intensity = preset.sun;
            if (this.carConfig.physicsKernel) {
                // This renderer was previously dormant in the main race flow.
                // Keep the asphalt/car readable when enabling it at night.
                const dark = ['night', 'rain'].includes(this.currentActiveWeather);
                if (this.hemiLight) this.hemiLight.intensity = dark ? .3 : .65;
                if (this.fillLight) this.fillLight.intensity = dark ? .2 : .45;
                if (dark) {
                    this.ambientLight.intensity = preset.ambient * .5;
                    this.sunLight.intensity = preset.sun * .4;
                }
            }
        }

        _trackDisposables(geo, mat, tex) {
            if (geo) this.disposableGeometries.push(geo);
            if (mat) this.disposableMaterials.push(mat);
            if (tex) this.disposableTextures.push(tex);
        }

        _buildTrack3DMesh() {
            const THREE = this.THREE;
            if (!THREE || !this.scene || !THREE.BufferGeometry || !THREE.Float32BufferAttribute) return;

            // Ground terrain plane
            const groundGeo = new THREE.PlaneGeometry(1600, 1600);
            const groundMat = new THREE.MeshLambertMaterial({ color: 0x0f1a2c });
            this._trackDisposables(groundGeo, groundMat);
            const ground = new THREE.Mesh(groundGeo, groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.05;
            ground.name = 'CircuitTerrain';
            this.scene.add(ground);

            const segs = this.track.segments;
            const n = segs.length;
            const roadY=(seg,lateral)=>this.roadSurface?this.roadSurface.heightAt(seg.s,lateral):0;

            // Build merged closed-loop ribbon for asphalt road + lane markings
            const roadPositions = [];
            const roadIndices = [];
            const linePositions = [];
            const lineColors = [];
            const lineIndices = [];
            const curbPositions = [];
            const curbColors = [];
            const curbIndices = [];
            const wallPositions = [];
            const wallIndices = [];

            let lineVertCount = 0;
            let curbVertCount = 0;
            let wallVertCount = 0;

            for (let i = 0; i <= n; i++) {
                const seg = segs[i % n];
                const hw = seg.halfWidth;
                // Left edge (-nx) and Right edge (+nx) in physics space
                const lx = this.toThreeX(seg.x - seg.nx * hw);
                const lz = this.toThreeZ(seg.z - seg.nz * hw);
                const rx = this.toThreeX(seg.x + seg.nx * hw);
                const rz = this.toThreeZ(seg.z + seg.nz * hw);

                roadPositions.push(lx, roadY(seg,-hw)+(this.roadSurface?0:.02), lz, rx, roadY(seg,hw)+(this.roadSurface?0:.02), rz);
                if (i < n) {
                    const base = i * 2;
                    roadIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
                }

                // Red/White Apex Curbs, Lane Markings & Concrete Guardrail Walls per segment
                if (i < n) {
                    const nextSeg = segs[(i + 1) % n];
                    const isRed = (i % 2 === 0);
                    const cr = isRed ? 0.92 : 0.97;
                    const cg = isRed ? 0.20 : 0.97;
                    const cb = isRed ? 0.20 : 0.99;

                    // Dashed center amber/white line + continuous inner edge lines
                    const addLaneStripe = (offsetLat, halfStripeW, rCol, gCol, bCol) => {
                        const x0 = this.toThreeX(seg.x + seg.nx * (offsetLat - halfStripeW));
                        const z0 = this.toThreeZ(seg.z + seg.nz * (offsetLat - halfStripeW));
                        const x1 = this.toThreeX(seg.x + seg.nx * (offsetLat + halfStripeW));
                        const z1 = this.toThreeZ(seg.z + seg.nz * (offsetLat + halfStripeW));
                        const x2 = this.toThreeX(nextSeg.x + nextSeg.nx * (offsetLat - halfStripeW));
                        const z2 = this.toThreeZ(nextSeg.z + nextSeg.nz * (offsetLat - halfStripeW));
                        const x3 = this.toThreeX(nextSeg.x + nextSeg.nx * (offsetLat + halfStripeW));
                        const z3 = this.toThreeZ(nextSeg.z + nextSeg.nz * (offsetLat + halfStripeW));
                        linePositions.push(x0, roadY(seg,offsetLat-halfStripeW)+.045, z0, x1, roadY(seg,offsetLat+halfStripeW)+.045, z1, x2, roadY(nextSeg,offsetLat-halfStripeW)+.045, z2, x3, roadY(nextSeg,offsetLat+halfStripeW)+.045, z3);
                        for (let k = 0; k < 4; k++) lineColors.push(rCol, gCol, bCol);
                        lineIndices.push(
                            lineVertCount, lineVertCount + 1, lineVertCount + 2,
                            lineVertCount + 1, lineVertCount + 3, lineVertCount + 2
                        );
                        lineVertCount += 4;
                    };
                    if (i % 2 === 0) {
                        addLaneStripe(0, 0.16, 0.98, 0.78, 0.18);
                    }
                    addLaneStripe(-(hw - 1.35), 0.11, 0.90, 0.94, 0.98);
                    addLaneStripe(hw - 1.35, 0.11, 0.90, 0.94, 0.98);

                    const addCurbStrip = (sideSign) => {
                        const innerOff = (hw - 1.15) * sideSign;
                        const outerOff = hw * sideSign;
                        const x0 = this.toThreeX(seg.x + seg.nx * innerOff);
                        const z0 = this.toThreeZ(seg.z + seg.nz * innerOff);
                        const x1 = this.toThreeX(seg.x + seg.nx * outerOff);
                        const z1 = this.toThreeZ(seg.z + seg.nz * outerOff);
                        const x2 = this.toThreeX(nextSeg.x + nextSeg.nx * innerOff);
                        const z2 = this.toThreeZ(nextSeg.z + nextSeg.nz * innerOff);
                        const x3 = this.toThreeX(nextSeg.x + nextSeg.nx * outerOff);
                        const z3 = this.toThreeZ(nextSeg.z + nextSeg.nz * outerOff);

                        curbPositions.push(x0, roadY(seg,innerOff)+.05, z0, x1, roadY(seg,outerOff)+.06, z1, x2, roadY(nextSeg,innerOff)+.05, z2, x3, roadY(nextSeg,outerOff)+.06, z3);
                        for (let k = 0; k < 4; k++) curbColors.push(cr, cg, cb);
                        curbIndices.push(
                            curbVertCount, curbVertCount + 1, curbVertCount + 2,
                            curbVertCount + 1, curbVertCount + 3, curbVertCount + 2
                        );
                        curbVertCount += 4;
                    };
                    addCurbStrip(-1);
                    addCurbStrip(1);

                    // Outer concrete walls at +/- (hw + 0.4)
                    const addWallStrip = (sideSign) => {
                        const wOff = (hw + 0.35) * sideSign;
                        const wx0 = this.toThreeX(seg.x + seg.nx * wOff);
                        const wz0 = this.toThreeZ(seg.z + seg.nz * wOff);
                        const wx1 = this.toThreeX(nextSeg.x + nextSeg.nx * wOff);
                        const wz1 = this.toThreeZ(nextSeg.z + nextSeg.nz * wOff);
                        const wallH = 1.15;
                        wallPositions.push(wx0, roadY(seg,wOff), wz0, wx0, roadY(seg,wOff)+wallH, wz0, wx1, roadY(nextSeg,wOff), wz1, wx1, roadY(nextSeg,wOff)+wallH, wz1);
                        wallIndices.push(
                            wallVertCount, wallVertCount + 1, wallVertCount + 2,
                            wallVertCount + 1, wallVertCount + 3, wallVertCount + 2
                        );
                        wallVertCount += 4;
                    };
                    addWallStrip(-1);
                    addWallStrip(1);
                }
            }

            const roadGeo = new THREE.BufferGeometry();
            if(this.roadSurface){
                const terrain=[];
                for(const t of this.roadSurface.triangles)if(t.surface==='grass'){
                    for(const[x,z]of [[t.a[0],t.a[2]],[t.a[0]+t.x1,t.a[2]+t.z1],[t.a[0]+t.x2,t.a[2]+t.z2]])terrain.push(this.toThreeX(x),t.a[1]+t.dx*(x-t.a[0])+t.dz*(z-t.a[2]),this.toThreeZ(z));
                }
                const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(terrain,3));geo.computeVertexNormals();
                const mat=new THREE.MeshLambertMaterial({color:0x182b20,side:THREE.DoubleSide});this._trackDisposables(geo,mat);const shoulders=new THREE.Mesh(geo,mat);shoulders.name='CircuitShoulders';this.scene.add(shoulders);
            }
            roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
            // Banking can put an edge below zero. The flat terrain must remain
            // below the lowest asphalt vertex, rather than cut through a bend.
            let lowestRoadY = 0;
            for (let i = 1; i < roadPositions.length; i += 3) lowestRoadY = Math.min(lowestRoadY, roadPositions[i]);
            ground.position.y = Math.min(ground.position.y, lowestRoadY - .12);
            roadGeo.setIndex(roadIndices);
            if (typeof roadGeo.computeVertexNormals === 'function') roadGeo.computeVertexNormals();
            const roadMat = THREE.MeshStandardMaterial
                ? new THREE.MeshStandardMaterial({ color: this.carConfig.physicsKernel ? 0x0b1018 : 0x263449, roughness: this.carConfig.physicsKernel ? .85 : .55, metalness: this.carConfig.physicsKernel ? .04 : .14, side: THREE.DoubleSide })
                : new THREE.MeshLambertMaterial({ color: 0x263449 });
            this._trackDisposables(roadGeo, roadMat);
            this.authorsRoadMaterial=roadMat;
            const roadMesh=new THREE.Mesh(roadGeo, roadMat);roadMesh.name='CircuitAsphalt';roadMesh.userData.mwRoadSurface=!!this.roadSurface;this.scene.add(roadMesh);

            if (linePositions.length > 0) {
                const lineGeo = new THREE.BufferGeometry();
                lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
                lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
                lineGeo.setIndex(lineIndices);
                const lineMat = new THREE.MeshBasicMaterial
                    ? new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
                    : new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
                this._trackDisposables(lineGeo, lineMat);
                this.scene.add(new THREE.Mesh(lineGeo, lineMat));
            }

            const curbGeo = new THREE.BufferGeometry();
            curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
            curbGeo.setAttribute('color', new THREE.Float32BufferAttribute(curbColors, 3));
            curbGeo.setIndex(curbIndices);
            const curbMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
            this._trackDisposables(curbGeo, curbMat);
            const curbMesh=new THREE.Mesh(curbGeo, curbMat);curbMesh.name='CircuitCurbs';curbMesh.userData.mwRoadSurface=!!this.roadSurface;this.scene.add(curbMesh);

            const wallGeo = new THREE.BufferGeometry();
            wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
            wallGeo.setIndex(wallIndices);
            if (typeof wallGeo.computeVertexNormals === 'function') wallGeo.computeVertexNormals();
            const wallMat = new THREE.MeshLambertMaterial({ color: 0x64748b, side: THREE.DoubleSide });
            this._trackDisposables(wallGeo, wallMat);
            const guardrail=new THREE.Mesh(wallGeo, wallMat);guardrail.name='CircuitGuardrail';this.scene.add(guardrail);

            // Start / Finish Gantry Arch + Checkpoint Pillars + Chevron Turn Signs + Streetlamps
            const pillarGeo = new THREE.BoxGeometry(1.2, 6.5, 1.2);
            const beamGeo = new THREE.BoxGeometry(this.track.halfWidth * 2.2, 1.4, 1.4);
            const startMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24 });
            const cpMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
            const chevGeo = new THREE.BoxGeometry(0.4, 1.4, 2.2);
            const chevMat = new THREE.MeshBasicMaterial
                ? new THREE.MeshBasicMaterial({ color: 0xf97316 })
                : new THREE.MeshLambertMaterial({ color: 0xf97316 });
            const poleGeo = new THREE.BoxGeometry(0.22, 6.2, 0.22);
            const poleMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
            const bulbGeo = new THREE.BoxGeometry(1.1, 0.25, 0.55);
            const bulbMat = new THREE.MeshBasicMaterial
                ? new THREE.MeshBasicMaterial({ color: 0xfef08a })
                : new THREE.MeshLambertMaterial({ color: 0xfef08a });
            this._trackDisposables(pillarGeo, startMat);
            this._trackDisposables(beamGeo, cpMat);
            this._trackDisposables(chevGeo, chevMat);
            this._trackDisposables(poleGeo, poleMat);
            this._trackDisposables(bulbGeo, bulbMat);

            for (const cp of this.track.checkpoints) {
                const isStart = cp.index === 0;
                const gateGroup = new THREE.Group();
                gateGroup.userData.authorsCheckpointGate=true;
                gateGroup.position.set(this.toThreeX(cp.x), this.roadSurface?this.roadSurface.sample(cp.x,cp.z).height:0, this.toThreeZ(cp.z));
                gateGroup.rotation.y = this.toThreeYaw(Math.atan2(cp.tx, cp.tz));

                const pL = new THREE.Mesh(pillarGeo, isStart ? startMat : cpMat);
                pL.position.set(-(cp.halfWidth + 0.8), 3.25, 0);
                const pR = new THREE.Mesh(pillarGeo, isStart ? startMat : cpMat);
                pR.position.set(cp.halfWidth + 0.8, 3.25, 0);
                gateGroup.add(pL, pR);

                if (isStart) {
                    const topBeam = new THREE.Mesh(beamGeo, startMat);
                    topBeam.position.set(0, 6.2, 0);
                    gateGroup.add(topBeam);
                }
                this.scene.add(gateGroup);
            }

            // Place NFS orange chevron signs on sharp turns, streetlamps & buildings along track
            const bldgGeo = new THREE.BoxGeometry(14, 26, 14);
            const bldgMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
            this._trackDisposables(bldgGeo, bldgMat);

            const propStride=this.roadSurface?5:1;
            for (let i = 0; i < n; i += 3*propStride) {
                const seg = segs[i];
                if (seg.hasChevronLeft || seg.hasChevronRight) {
                    const sideSign = seg.hasChevronLeft ? -1 : 1;
                    const cx = this.toThreeX(seg.x + seg.nx * (seg.halfWidth + 1.1) * sideSign);
                    const cz = this.toThreeZ(seg.z + seg.nz * (seg.halfWidth + 1.1) * sideSign);
                    const chev = new THREE.Mesh(chevGeo, chevMat);
                    chev.position.set(cx, roadY(seg,(seg.halfWidth+1.1)*sideSign)+1.6, cz);
                    chev.rotation.y = this.toThreeYaw(seg.heading);
                    this.scene.add(chev);
                }
                if (i % (6*propStride) === 0) {
                    const lampSide = (i % (12*propStride) === 0) ? -1 : 1;
                    const lx = this.toThreeX(seg.x + seg.nx * (seg.halfWidth + 1.2) * lampSide);
                    const lz = this.toThreeZ(seg.z + seg.nz * (seg.halfWidth + 1.2) * lampSide);
                    const pole = new THREE.Mesh(poleGeo, poleMat);
                    pole.userData.authorsLegacyScenery=true;
                    pole.position.set(lx, roadY(seg,(seg.halfWidth+1.2)*lampSide)+3.1, lz);
                    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
                    bulb.userData.authorsLegacyScenery=true;
                    bulb.position.set(
                        this.toThreeX(seg.x + seg.nx * (seg.halfWidth - 0.3) * lampSide),
                        roadY(seg,(seg.halfWidth-.3)*lampSide)+6.1,
                        this.toThreeZ(seg.z + seg.nz * (seg.halfWidth - 0.3) * lampSide)
                    );
                    bulb.rotation.y = this.toThreeYaw(seg.heading);
                    this.scene.add(pole, bulb);
                }
                if (i % (12*propStride) === 0) {
                    const bSide = (i % (24*propStride) === 0) ? -1 : 1;
                    const bx = this.toThreeX(seg.x + seg.nx * (seg.halfWidth + 24) * bSide);
                    const bz = this.toThreeZ(seg.z + seg.nz * (seg.halfWidth + 24) * bSide);
                    const bldg = new THREE.Mesh(bldgGeo, bldgMat);
                    bldg.userData.authorsLegacyScenery=true;
                    bldg.position.set(bx, 13, bz);
                    bldg.rotation.y = this.toThreeYaw(seg.heading);
                    this.scene.add(bldg);
                }
            }
        }

        _createCarMesh(carName, styling = {}) {
            const THREE = this.THREE;
            const c3d = (typeof root !== 'undefined' && root.Car3DManager) ? root.Car3DManager : null;
            const rootGroup = new THREE.Group();
            const bodyGroup = new THREE.Group();
            rootGroup.add(bodyGroup);

            const applyPlateIfAvailable = (targetMesh) => {
                if (targetMesh && styling && styling.plate !== undefined && c3d && typeof c3d.applyLicensePlateToModel === 'function') {
                    try {
                        c3d.applyLicensePlateToModel(
                            THREE,
                            targetMesh,
                            styling.plate,
                            styling.frameStyle || 'none',
                            styling.plateStyle || 'classic'
                        );
                    } catch (_) {}
                }
            };

            let wheels = [];
            let glbLoadedSync = false;

            // Load real high-detail .glb 3D model when available (swaps out procedural fallback)
            if (c3d && typeof c3d.loadCarModel === 'function') {
                try {
                    c3d.loadCarModel(THREE, carName, styling, (loadedModel) => {
                        if (this._destroyed || !loadedModel) return;
                        glbLoadedSync = true;
                        while (bodyGroup.children.length > 0) {
                            const prev = bodyGroup.children[0];
                            bodyGroup.remove(prev);
                            if (c3d && typeof c3d.deepDispose === 'function') {
                                try { c3d.deepDispose(prev); } catch (_) {}
                            }
                        }
                        applyPlateIfAvailable(loadedModel);
                        if(root.NOMERA_AUTHORS_PREVIEW && root.NomeraWheelRig){
                            root.NomeraWheelRig.prepareAsync(THREE,loadedModel,wheels);
                        }
                        bodyGroup.add(loadedModel);
                    });
                } catch (_) {}
            }

            if (!glbLoadedSync && c3d && typeof c3d.buildDetailedCarModel === 'function') {
                try {
                    const built = c3d.buildDetailedCarModel(THREE, carName, styling);
                    const mesh = built && built.root ? built.root : built;
                    if (mesh) {
                        applyPlateIfAvailable(mesh);
                        bodyGroup.add(mesh);
                    }
                    if(root.NOMERA_AUTHORS_PREVIEW && root.NomeraWheelRig && mesh){
                        wheels.splice(0,wheels.length,...root.NomeraWheelRig.prepare(THREE,mesh).wheels);
                    } else if (built && Array.isArray(built.wheels)) wheels = built.wheels;
                } catch (_) {}
            }
            if (bodyGroup.children.length === 0 && THREE.BoxGeometry) {
                const fallbackGeo = new THREE.BoxGeometry(1.9, 1.2, 4.4);
                const fallbackMat = new THREE.MeshLambertMaterial({ color: styling.color || 0xef4444 });
                this._trackDisposables(fallbackGeo, fallbackMat);
                const box = new THREE.Mesh(fallbackGeo, fallbackMat);
                box.position.y = 0.65;
                bodyGroup.add(box);
            }
            return { rootGroup, bodyGroup, wheels };
        }

        _buildCars3D() {
            const THREE = this.THREE;
            if (!THREE || !this.scene) return;
            const pBuilt = this._createCarMesh(this.carConfig.carName, this.carConfig.styling);
            this.playerCar = pBuilt.rootGroup;
            this.playerCarBodyGroup = pBuilt.bodyGroup;
            this.playerWheels = pBuilt.wheels;

            // Attach forward headlight beam + rear brake/nitro glow lights to player car
            if (THREE.SpotLight) {
                try {
                    const hl = new THREE.SpotLight(0xfffbeb, 2.8, 95, Math.PI / 3.5, 0.45, 1.1);
                    hl.position.set(0, 1.05, 1.8);
                    if (hl.target) {
                        hl.target.position.set(0, 0.35, 28);
                        this.playerCar.add(hl.target);
                    }
                    this.playerCar.add(hl);
                    this.playerHeadlight = hl;
                } catch (_) {}
            } else if (THREE.PointLight) {
                try {
                    const pl = new THREE.PointLight(0xfffbeb, 2.2, 45);
                    pl.position.set(0, 1.2, 3.0);
                    this.playerCar.add(pl);
                    this.playerHeadlight = pl;
                } catch (_) {}
            }

            if (THREE.PointLight) {
                try {
                    this.playerTailLight = new THREE.PointLight(0xff1e42, 1.2, 7.5);
                    this.playerTailLight.position.set(0, 0.75, -2.35);
                    this.playerCar.add(this.playerTailLight);

                    this.playerNitroLight = new THREE.PointLight(0x38bdf8, 0, 11);
                    this.playerNitroLight.position.set(0, 0.55, -2.55);
                    this.playerCar.add(this.playerNitroLight);
                } catch (_) {}
            }

            this.scene.add(this.playerCar);

            for (const rival of this.rivals) {
                const rBuilt = this._createCarMesh(rival.template.carName, {
                    color: rival.template.color,
                    vinyl: rival.template.vinyl,
                    spoiler: rival.template.spoiler,
                    plate: rival.template.plate
                });
                rival.mesh = rBuilt.rootGroup;
                rival.bodyGroup = rBuilt.bodyGroup;
                rival.wheels = rBuilt.wheels;
                this.scene.add(rival.mesh);
            }
        }

        _initParticlePools() {
            const THREE = this.THREE;
            if (!THREE || !this.scene || !THREE.BoxGeometry) return;

            const smokeGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
            const smokeMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.45 });
            const sparkGeo = new THREE.BoxGeometry(0.14, 0.14, 0.35);
            const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
            this._trackDisposables(smokeGeo, smokeMat);
            this._trackDisposables(sparkGeo, sparkMat);

            for (let i = 0; i < 24; i++) {
                const m = new THREE.Mesh(smokeGeo, smokeMat);
                m.visible = false;
                this.scene.add(m);
                this.smokePool.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0 });
            }
            for (let i = 0; i < 20; i++) {
                const m = new THREE.Mesh(sparkGeo, sparkMat);
                m.visible = false;
                this.scene.add(m);
                this.sparkPool.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0 });
            }
        }

        _spawnTireSmoke(physX, physZ, heading) {
            if (this.smokePool.length === 0) return;
            const slot = this.smokePool.find(p => p.life <= 0);
            if (!slot) return;
            const rx = physX - Math.sin(heading) * 1.6;
            const rz = physZ - Math.cos(heading) * 1.6;
            slot.mesh.position.set(this.toThreeX(rx), 0.25, this.toThreeZ(rz));
            slot.mesh.scale.set(1, 1, 1);
            slot.mesh.visible = true;
            slot.life = 0.45;
            slot.vx = (Math.random() - 0.5) * 2.5;
            slot.vy = 1.2 + Math.random() * 1.2;
            slot.vz = (Math.random() - 0.5) * 2.5;
        }

        _spawnCollisionSparks(physX, physZ, count = 6) {
            if (this.sparkPool.length === 0) return;
            let spawned = 0;
            for (const slot of this.sparkPool) {
                if (slot.life <= 0) {
                    slot.mesh.position.set(this.toThreeX(physX), 0.6, this.toThreeZ(physZ));
                    slot.mesh.visible = true;
                    slot.life = 0.28;
                    slot.vx = (Math.random() - 0.5) * 14;
                    slot.vy = 3 + Math.random() * 6;
                    slot.vz = (Math.random() - 0.5) * 14;
                    if (++spawned >= count) break;
                }
            }
        }

        _updateParticles(dt) {
            for (const s of this.smokePool) {
                if (s.life > 0) {
                    s.life -= dt;
                    s.mesh.position.x += s.vx * dt;
                    s.mesh.position.y += s.vy * dt;
                    s.mesh.position.z += s.vz * dt;
                    const sc = 1 + (0.45 - s.life) * 3.2;
                    s.mesh.scale.set(sc, sc, sc);
                    if (s.life <= 0) s.mesh.visible = false;
                }
            }
            for (const sp of this.sparkPool) {
                if (sp.life > 0) {
                    sp.life -= dt;
                    sp.vy -= 18 * dt;
                    sp.mesh.position.x += sp.vx * dt;
                    sp.mesh.position.y = Math.max(0.05, sp.mesh.position.y + sp.vy * dt);
                    sp.mesh.position.z += sp.vz * dt;
                    if (sp.life <= 0) sp.mesh.visible = false;
                }
            }
        }

        _sync3DMeshes(snapCamera = false, dt = 1/60) {
            if (!this.scene || !this.playerPhysics) return;
            const p = this.playerPhysics.state;
            if(root.NOMERA_AUTHORS_PREVIEW && root.NomeraWheelRig){
                root.NomeraWheelRig.update({wheels:this.playerWheels||[]},{angles:p.wheelAngles,steer:-p.steerAngleRad,steerAngles:{fl:-p.steerLeftRad,fr:-p.steerRightRad},compression:p.suspensionOffsets});
            }
            if (this.playerCar) {
                this.playerCar.position.set(this.toThreeX(p.renderX), p.heave, this.toThreeZ(p.renderZ));
                if(p.orientation)this.playerCar.quaternion.set(p.orientation[0],-p.orientation[1],-p.orientation[2],p.orientation[3]);else this.playerCar.rotation.y = this.toThreeYaw(p.renderHeading);
            }
            if (this.playerCarBodyGroup) {
                if(this.playerPhysics.mwKernel)this.playerCarBodyGroup.rotation.order='ZXY';
                this.playerCarBodyGroup.rotation.x = p.orientation?0:p.pitch;
                this.playerCarBodyGroup.rotation.z = p.orientation?0:(this.playerPhysics.mwKernel ? -p.roll : p.roll);
            }
            if (this.playerTailLight) {
                this.playerTailLight.intensity = (this.keys && (this.keys.brake || this.keys.drift)) ? 3.2 : 1.1;
            }
            if (this.playerNitroLight) {
                this.playerNitroLight.intensity = p.isNitroActive ? 3.8 : 0;
            }

            for (const rival of this.rivals) {
                if (rival.mesh) {
                    if(root.NomeraDriverCamera&&!rival.physics.collisionShape){const cp=root.NomeraCameraProfiles[root.Car3DManager.identifyCarModel(rival.template.carName)];if(cp)rival.physics.collisionShape=root.NomeraDriverCamera.shape(cp);}
                    const rs = rival.physics.state;
                    rival.mesh.position.set(this.toThreeX(rs.renderX), rs.heave, this.toThreeZ(rs.renderZ));
                    if(rs.orientation)rival.mesh.quaternion.set(rs.orientation[0],-rs.orientation[1],-rs.orientation[2],rs.orientation[3]);else rival.mesh.rotation.y = this.toThreeYaw(rs.renderHeading);
                    if (rival.bodyGroup) {
                    if(this.playerPhysics.mwKernel)rival.bodyGroup.rotation.order='ZXY';
                        rival.bodyGroup.rotation.x = rs.orientation?0:rs.pitch;
                        rival.bodyGroup.rotation.z = rs.orientation?0:(rival.physics.mwKernel ? -rs.roll : rs.roll);
                    }
                    if(root.NOMERA_AUTHORS_PREVIEW && root.NomeraWheelRig){
                        root.NomeraWheelRig.update({wheels:rival.wheels||[]},{angles:rs.wheelAngles,steer:-rs.steerAngleRad,steerAngles:{fl:-rs.steerLeftRad,fr:-rs.steerRightRad},compression:rs.suspensionOffsets});
                    }
                }
            }

            if(root.NOMERA_AUTHORS_PREVIEW){root.NomeraScene?.update(this);root.NomeraBodyDamage?.update(this);}
            if(root.NOMERA_AUTHORS_PREVIEW&&root.NomeraDriverCamera){root.NomeraDriverCamera.recoveryUI(this,this.playerPhysics);if(root.NomeraDriverCamera.update(this,this.cameraMode,dt))return;}
            if (this.camera) {
                const threeX = this.toThreeX(p.renderX);
                const threeZ = this.toThreeZ(p.renderZ);
                // Unit forward vector in Three.js space
                const fwdX = -Math.sin(p.renderHeading);
                const fwdZ = Math.cos(p.renderHeading);

                // Blend heading with velocity vector during drifts for authentic NFS chase camera
                let camDirX = fwdX;
                let camDirZ = fwdZ;
                if (p.speedMs > 5) {
                    const velThreeX = -p.vx / p.speedMs;
                    const velThreeZ = p.vz / p.speedMs;
                    camDirX = lerp(fwdX, velThreeX, 0.35);
                    camDirZ = lerp(fwdZ, velThreeZ, 0.35);
                    const len = Math.max(0.001, Math.hypot(camDirX, camDirZ));
                    camDirX /= len;
                    camDirZ /= len;
                }

                let distBack = 6.8;
                let heightUp = 2.35;
                let lookAhead = 12.0;

                if (this.cameraMode === 'far') {
                    distBack = 9.4;
                    heightUp = 3.35;
                    lookAhead = 16.0;
                } else if (this.cameraMode === 'hood') {
                    distBack = -0.35;
                    heightUp = 1.32;
                    lookAhead = 22.0;
                } else if (this.cameraMode === 'bumper') {
                    distBack = -1.75;
                    heightUp = 0.72;
                    lookAhead = 26.0;
                }

                const portraitMWChase=this.playerPhysics.mwKernel&&this.camera.aspect<1&&this.cameraMode!=='hood'&&this.cameraMode!=='bumper';
                if(portraitMWChase){distBack=Math.max(distBack,9.4);heightUp=Math.max(heightUp,3.35);lookAhead=Math.min(lookAhead,10);}
                const nitroPullback = p.isNitroActive ? 0.85 : 0;
                const targetCamX = threeX - camDirX * (distBack + nitroPullback);
                const targetCamY = heightUp + p.heave;
                const targetCamZ = threeZ - camDirZ * (distBack + nitroPullback);

                const targetLookX = threeX + (portraitMWChase?camDirX:fwdX) * lookAhead;
                const targetLookY = 0.95 + p.heave + p.pitch * 2.0;
                const targetLookZ = threeZ + (portraitMWChase?camDirZ:fwdZ) * lookAhead;

                const instant=snapCamera||this.cameraMode==='hood'||this.cameraMode==='bumper',base=portraitMWChase?.55:.22;
                const alpha=value=>instant?1:1-Math.pow(1-value,Math.max(0,dt)*60);
                const smooth=alpha(base),lookSmooth=alpha(Math.min(1,base*1.2));
                this._camPos.x = lerp(this._camPos.x, targetCamX, smooth);
                this._camPos.y = lerp(this._camPos.y, targetCamY, smooth);
                this._camPos.z = lerp(this._camPos.z, targetCamZ, smooth);

                this._camLook.x = lerp(this._camLook.x, targetLookX, lookSmooth);
                this._camLook.y = lerp(this._camLook.y, targetLookY, lookSmooth);
                this._camLook.z = lerp(this._camLook.z, targetLookZ, lookSmooth);

                this.camera.position.set(this._camPos.x, this._camPos.y, this._camPos.z);
                this.camera.lookAt(this._camLook.x, this._camLook.y, this._camLook.z);

                const targetFov = p.isSpeedbreakerActive ? 50 : (60 + clamp(p.speedKmh / 24, 0, 14) + (p.isNitroActive ? 6 : 0));
                if (Math.abs(this.camera.fov - targetFov) > 0.2) {
                    this.camera.fov = lerp(this.camera.fov, targetFov, alpha(.15));
                    if (typeof this.camera.updateProjectionMatrix === 'function') {
                        this.camera.updateProjectionMatrix();
                    }
                }
            }
        }

        _initCircuitOverlayDOM() {
            if (typeof document === 'undefined' || !this.container || typeof document.createElement !== 'function') return;

            const hostEl = this.container.parentElement || this.container;
            if (typeof hostEl.querySelectorAll === 'function') {
                const oldOverlays = hostEl.querySelectorAll('.nfs-circuit-hud-overlay');
                for (const old of oldOverlays) {
                    if (old && old.parentNode) old.parentNode.removeChild(old);
                }
            }

            // Create HUD badge for Position, Lap, Lap Time, and Speedbreaker + Top-Right Mini-Map
            const overlay = document.createElement('div');
            overlay.className = 'nfs-circuit-hud-overlay';
            overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:18;font-family:Inter,sans-serif;';

            const banner = document.createElement('div');
            banner.id = 'nfs-circuit-telemetry-bar';
            banner.style.cssText = 'position:absolute;top:56px;left:50%;transform:translateX(-50%);background:rgba(10,15,29,0.86);border:1px solid rgba(56,189,248,0.45);border-radius:12px;padding:6px 14px;color:#fff;font-size:11px;line-height:1.4;backdrop-filter:blur(8px);text-align:center;white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,0.45);';
            overlay.appendChild(banner);
            this.circuitTelemetryEl = banner;

            const mapCanvas = document.createElement('canvas');
            mapCanvas.className = 'nfs-minimap-canvas';
            mapCanvas.width = 136;
            mapCanvas.height = 136;
            mapCanvas.style.cssText = 'position:absolute;top:68px;right:16px;width:132px;height:132px;background:rgba(10,15,29,0.82);border:1.5px solid rgba(56,189,248,0.5);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.5);';
            if (mapCanvas.style && typeof mapCanvas.style.setProperty === 'function') {
                mapCanvas.style.setProperty('width', '132px', 'important');
                mapCanvas.style.setProperty('height', '132px', 'important');
                mapCanvas.style.setProperty('top', '68px', 'important');
                mapCanvas.style.setProperty('right', '16px', 'important');
                mapCanvas.style.setProperty('position', 'absolute', 'important');
            }
            overlay.appendChild(mapCanvas);
            this.minimapCanvas = mapCanvas;
            this.minimapCtx = typeof mapCanvas.getContext === 'function' ? mapCanvas.getContext('2d') : null;

            if (typeof hostEl.appendChild === 'function') {
                hostEl.appendChild(overlay);
            } else if (typeof this.container.appendChild === 'function') {
                this.container.appendChild(overlay);
            }
            this.circuitHudEl = overlay;
            this._updateCircuitOverlayDOM();
        }

        _updateCircuitOverlayDOM() {
            if (this.circuitTelemetryEl) {
                const st = this.state;
                const speedInt = Math.round(st.speedKmh || 0);
                const bestStr = st.bestLapTimeSec !== null ? `${st.bestLapTimeSec.toFixed(2)}с` : '—';
                const wrongWayHtml = st.isWrongWay
                    ? `<div style="color:#ef4444;font-weight:900;font-size:12px;margin-top:2px;">⚠️ НЕВЕРНОЕ НАПРАВЛЕНИЕ — РАЗВЕРНИТЕСЬ!</div>`
                    : '';
                const countdownHtml = st.racePhase === 'countdown'
                    ? `<div style="color:#fbbf24;font-weight:900;font-size:13px;margin-top:2px;">🚦 СТАРТ ЧЕРЕЗ: ${st.countdownText}</div>`
                    : '';
                const nextTelemetryHtml =
                    `<div style="font-weight:900;color:#38bdf8;font-size:12px;" data-speed="${speedInt}">🏆 ${st.trackName} · Позиция: <b style="color:#fbbf24;font-size:13px;">${st.position}/${st.totalRacers}</b> · Круг: <b style="color:#34d399;">${st.currentLap}/${st.totalLaps}</b></div>` +
                    `<div style="color:#e2e8f0;">⏱️ Круг: <b>${st.lapTimeSec.toFixed(1)}с</b> · Лучший круг: <b style="color:#c084fc;">${bestStr}</b></div>` +
                    countdownHtml +
                    wrongWayHtml;
                if (this._lastTelemetryHtml !== nextTelemetryHtml) {
                    this._lastTelemetryHtml = nextTelemetryHtml;
                    this.circuitTelemetryEl.innerHTML = nextTelemetryHtml;
                }
            }

            if (this.minimapCtx && this.minimapCanvas) {
                const ctx = this.minimapCtx;
                const W = this.minimapCanvas.width;
                const H = this.minimapCanvas.height;
                ctx.clearRect(0, 0, W, H);

                const segs = this.track.segments;
                if (!this.track._cachedBounds) {
                    let bMinX = Infinity, bMaxX = -Infinity, bMinZ = Infinity, bMaxZ = -Infinity;
                    for (let i = 0; i < segs.length; i += 2) {
                        const s = segs[i];
                        if (s.x < bMinX) bMinX = s.x;
                        if (s.x > bMaxX) bMaxX = s.x;
                        if (s.z < bMinZ) bMinZ = s.z;
                        if (s.z > bMaxZ) bMaxZ = s.z;
                    }
                    this.track._cachedBounds = { minX: bMinX, maxX: bMaxX, minZ: bMinZ, maxZ: bMaxZ };
                }
                const { minX, maxX, minZ, maxZ } = this.track._cachedBounds;
                const spanX = Math.max(10, maxX - minX);
                const spanZ = Math.max(10, maxZ - minZ);
                const pad = 16;
                const scale = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanZ);
                const mapX = (x) => pad + (x - minX) * scale;
                const mapY = (z) => H - (pad + (z - minZ) * scale);

                // Track outline
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
                ctx.lineWidth = 5;
                ctx.beginPath();
                for (let i = 0; i < segs.length; i += 2) {
                    const mx = mapX(segs[i].x);
                    const my = mapY(segs[i].z);
                    if (i === 0) ctx.moveTo(mx, my);
                    else ctx.lineTo(mx, my);
                }
                ctx.closePath();
                ctx.stroke();

                // Start/Finish marker
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(mapX(segs[0].x) - 3, mapY(segs[0].z) - 3, 6, 6);

                // AI Rivals dots
                for (const r of this.rivals) {
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(mapX(r.physics.state.x), mapY(r.physics.state.z), 3.5, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Player dot
                if (this.playerPhysics) {
                    ctx.fillStyle = '#10b981';
                    ctx.beginPath();
                    ctx.arc(mapX(this.playerPhysics.state.x), mapY(this.playerPhysics.state.z), 4.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        render() {
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        }

        notifyHUD() {
            if (!this.options.onUpdateHUD) return;
            const st = this.state;
            const gearLabel = st.gear === -1 ? 'R' : (st.gear === 0 ? 'N' : 'D' + st.gear);
            const rpmRange = Math.max(1, (st.maxRpm || 7500) - (st.idleRpm || 900));
            const rpmPercent = clamp(Math.round(((st.rpm - (st.idleRpm || 900)) / rpmRange) * 100), 0, 100);
            const preset = this.getWeatherPreset(this.currentActiveWeather);

            this.options.onUpdateHUD({
                mode: 'nfs_circuit',
                speed: Math.round(st.speed),
                gear: gearLabel,
                rpm: Math.round(st.rpm),
                maxRpm: st.maxRpm,
                rpmPercent,
                distanceKm: st.distanceKm,
                earnedCash: Math.round(st.earnedCash),
                fuelCurrent: st.fuelCurrent,
                nitroLevel: Math.round(st.nitroLevel),
                isNitroActive: st.isNitroActive,
                driftScore: Math.round(st.driftScore),
                driftCombo: st.driftCombo,
                isDrifting: st.isDrifting,
                overtakesCount: st.overtakesCount,
                overtakeCombo: st.overtakeCombo,
                nearMissCount: st.nearMissCount,
                shashkiCombo: st.shashkiCombo,
                isDrafting: false,
                damageTaken: Math.round(st.damageTaken),
                hullIntegrity: Math.max(0, 100 - Math.round(st.damageTaken)),
                cameraMode: this.cameraMode,
                weather: this.currentActiveWeather,
                weatherIcon: preset.icon,
                weatherTitle: preset.name,
                weatherMode: this.weatherMode,
                wantedStars: 0,
                isPursuitActive: false,
                escapeTimer: 0,
                escapePercent: 0,
                nearestPoliceDist: 999,
                bustedTimer: 0,
                isBusted: false,
                // Circuit fields
                position: st.position,
                totalRacers: st.totalRacers,
                currentLap: st.currentLap,
                totalLaps: st.totalLaps,
                lapTimeSec: st.lapTimeSec,
                bestLapTimeSec: st.bestLapTimeSec,
                isSpeedbreakerActive: st.isSpeedbreakerActive,
                speedbreakerCharge: st.speedbreakerCharge
            });
        }

        stepSimulation(dt = 1 / 60) {
            return this.update(dt);
        }

        get playerTrackProj() {
            if (!this.track || !this.playerPhysics) return null;
            return this.track.projectPointToTrack(
                this.playerPhysics.state.x,
                this.playerPhysics.state.z,
                this.playerProgress ? this.playerProgress.lastSegIndex : 0
            );
        }

        get speedbreakerActive() {
            return !!(this.state && this.state.isSpeedbreakerActive);
        }

        get finished() {
            return !!(this.state && this.state.racePhase === 'finished') || !!(this.playerProgress && this.playerProgress.finished);
        }

        getState() {
            return Object.assign({}, this.state, {
                earnedCash: Math.round(this.state.earnedCash)
            });
        }

        _bindResize() {
            this._onResize = () => {
                if (!this.container || !this.renderer || !this.camera) return;
                const rect = (typeof this.container.getBoundingClientRect === 'function')
                    ? this.container.getBoundingClientRect()
                    : null;
                const w = Math.floor((rect && rect.width) || this.container.clientWidth || 800);
                const h = Math.floor((rect && rect.height) || this.container.clientHeight || 500);
                if (w > 0 && h > 0 && (w !== this.width || h !== this.height)) {
                    this.width = w;
                    this.height = h;
                    this.camera.aspect = w / h;
                    if (typeof this.camera.updateProjectionMatrix === 'function') {
                        this.camera.updateProjectionMatrix();
                    }
                    if (typeof this.renderer.setSize === 'function') {
                        this.renderer.setSize(w, h, false);
                    }
                }
            };
            if (typeof root !== 'undefined' && typeof root.addEventListener === 'function') {
                root.addEventListener('resize', this._onResize);
            }
        }

        onResize() {
            if (this._onResize) this._onResize();
        }

        destroy() {
            this.authorsRecoverButton?.remove();this.authorsRecoverButton=null;
            if(root.NOMERA_AUTHORS_PREVIEW)root.NomeraScene?.destroy(this);
            if(root.NOMERA_AUTHORS_PREVIEW)root.NomeraWheelRig?.cancelAll();
            this._destroyed = true;
            this.stop();
            if (this._onResize && typeof root !== 'undefined' && typeof root.removeEventListener === 'function') {
                root.removeEventListener('resize', this._onResize);
            }
            if (this.circuitHudEl && this.circuitHudEl.parentNode) {
                try { this.circuitHudEl.parentNode.removeChild(this.circuitHudEl); } catch (_) {}
            }
            this.circuitHudEl = null;
            this.minimapCanvas = null;
            this.minimapCtx = null;

            for (const g of this.disposableGeometries) {
                try { if (g && typeof g.dispose === 'function') g.dispose(); } catch (_) {}
            }
            for (const m of this.disposableMaterials) {
                try { if (m && typeof m.dispose === 'function') m.dispose(); } catch (_) {}
            }
            for (const t of this.disposableTextures) {
                try { if (t && typeof t.dispose === 'function') t.dispose(); } catch (_) {}
            }
            this.disposableGeometries = [];
            this.disposableMaterials = [];
            this.disposableTextures = [];

            const c3d = (typeof root !== 'undefined' && root.Car3DManager) ? root.Car3DManager : null;
            if (this.scene && c3d && typeof c3d.deepDispose === 'function') {
                try { c3d.deepDispose(this.scene); } catch (_) {}
            }
            this.scene = null;

            if (this.renderer) {
                try {
                    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
                    }
                    if (typeof this.renderer.dispose === 'function') this.renderer.dispose();
                    if (typeof this.renderer.forceContextLoss === 'function') this.renderer.forceContextLoss();
                } catch (_) {}
                this.renderer = null;
            }
            if (this.container) {
                this.container.innerHTML = '';
            }
        }
    }

    function normalizeArcDiff(sCurrent, sTarget, totalLength) {
        let d = sCurrent - sTarget;
        if (d < -totalLength * 0.5) d += totalLength;
        if (d > totalLength * 0.5) d -= totalLength;
        return d;
    }

    function projectPointToTrack(track, x, z, hintSegIndex = null) {
        if (!track || typeof track.projectPointToTrack !== 'function') return null;
        return track.projectPointToTrack(x, z, hintSegIndex);
    }

    return {
        TRACK_PRESETS,
        AI_RIVAL_ROSTER,
        DIFFICULTY_PRESETS,
        buildCircuitTrack,
        projectPointToTrack,
        NomeraCircuitRaceEngine
    };
}));

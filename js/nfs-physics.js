/**
 * 🏎️ H3H NOMERA — Clean-Room Vehicle Physics Engine
 *
 * Independent, deterministic 2D/3D rigid-body & 4-wheel dynamic vehicle simulation module.
 * Default model is independent; an explicitly supplied physicsKernel enables
 * the MW adapter documented in docs/MW_PHYSICS_PORT.md.
 *
 * Coordinate Convention (Planar Physics World):
 *   - Origin (0, 0), +Z is North / initial forward (heading = 0)
 *   - +X is East / Right (heading = +PI/2)
 *   - heading (psi, radians): clockwise angle from +Z toward +X
 *     * Forward unit vector: (sin(heading), cos(heading))
 *     * Right unit vector:   (cos(heading), -sin(heading))
 *   - steerInput in [-1, +1]:
 *     * -1 = Full Left  (decreases heading, turns toward -X)
 *     * +1 = Full Right (increases heading, turns toward +X)
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.NomeraNfsPhysics = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
    'use strict';

    const FIXED_DT = 1 / 60;
    const MAX_SUBSTEPS = 8;
    const GRAVITY = 9.81;
    const DEG2RAD = Math.PI / 180;
    const RAD2DEG = 180 / Math.PI;

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
    const ramp = (v, lo, hi) => (hi <= lo ? 0 : clamp((v - lo) / (hi - lo), 0, 1));
    const wrapAngle = (rad) => {
        let a = (rad + Math.PI) % (Math.PI * 2);
        if (a < 0) a += Math.PI * 2;
        return a - Math.PI;
    };
    const lerpAngle = (a, b, t) => a + wrapAngle(b - a) * clamp(t, 0, 1);

    // =========================================================================
    // 1. SURFACE & WEATHER TAXONOMY (Continuous Grip, Drag & Road Feel)
    // =========================================================================
    const SURFACE_PRESETS = Object.freeze({
        asphalt:  Object.freeze({ id: 'asphalt',  lateralGrip: 1.00, driveGrip: 1.00, rollingResistance: 1.00, bumpAmp: 0.003 }),
        concrete: Object.freeze({ id: 'concrete', lateralGrip: 0.98, driveGrip: 0.98, rollingResistance: 1.02, bumpAmp: 0.004 }),
        curb:     Object.freeze({ id: 'curb',     lateralGrip: 0.91, driveGrip: 0.92, rollingResistance: 1.25, bumpAmp: 0.018 }),
        shoulder: Object.freeze({ id: 'shoulder', lateralGrip: 0.72, driveGrip: 0.70, rollingResistance: 2.10, bumpAmp: 0.022 }),
        dirt:     Object.freeze({ id: 'dirt',     lateralGrip: 0.68, driveGrip: 0.66, rollingResistance: 2.35, bumpAmp: 0.026 }),
        grass:    Object.freeze({ id: 'grass',    lateralGrip: 0.56, driveGrip: 0.54, rollingResistance: 3.00, bumpAmp: 0.030 }),
        sand:     Object.freeze({ id: 'sand',     lateralGrip: 0.50, driveGrip: 0.48, rollingResistance: 3.60, bumpAmp: 0.028 }),
        ice:      Object.freeze({ id: 'ice',      lateralGrip: 0.38, driveGrip: 0.36, rollingResistance: 0.90, bumpAmp: 0.002 })
    });

    const WEATHER_PRESETS = Object.freeze({
        dry:    Object.freeze({ id: 'dry',    lateralGrip: 1.00, driveGrip: 1.00 }),
        day:    Object.freeze({ id: 'day',    lateralGrip: 1.00, driveGrip: 1.00 }),
        night:  Object.freeze({ id: 'night',  lateralGrip: 1.00, driveGrip: 1.00 }),
        sunset: Object.freeze({ id: 'sunset', lateralGrip: 1.00, driveGrip: 1.00 }),
        fog:    Object.freeze({ id: 'fog',    lateralGrip: 0.95, driveGrip: 0.95 }),
        wet:    Object.freeze({ id: 'wet',    lateralGrip: 0.78, driveGrip: 0.76 }),
        rain:   Object.freeze({ id: 'rain',   lateralGrip: 0.78, driveGrip: 0.76 }),
        snow:   Object.freeze({ id: 'snow',   lateralGrip: 0.60, driveGrip: 0.58 })
    });

    // =========================================================================
    // 2. SPEED-SENSITIVE STEERING & DRIFT TABLES (Clean-Room Mathematical Curves)
    // =========================================================================
    // Speed points from 0 to 100 m/s (0 to 360 km/h) -> max steering lock in degrees
    const STEER_ANGLE_DEG_VS_SPEED = Object.freeze([
        39.0, // 0 km/h (tight U-turn lock)
        28.0, // 40 km/h
        19.0, // 80 km/h
        13.2, // 120 km/h
        9.6,  // 160 km/h
        7.5,  // 200 km/h
        6.1,  // 240 km/h
        5.2,  // 280 km/h
        4.6,  // 320 km/h
        4.2   // 360+ km/h
    ]);

    // Steering rate multiplier vs speed (0 to 360 km/h)
    const STEER_RATE_VS_SPEED = Object.freeze([
        1.00, 1.00, 0.94, 0.80, 0.68, 0.56, 0.48, 0.43, 0.40, 0.38
    ]);

    function sampleTable(arr, normalizedT) {
        const n = arr.length;
        if (n === 0) return 0;
        if (n === 1) return arr[0];
        const pos = clamp(normalizedT, 0, 1) * (n - 1);
        const idx = Math.min(n - 2, Math.floor(pos));
        const frac = pos - idx;
        return arr[idx] + (arr[idx + 1] - arr[idx]) * frac;
    }

    // =========================================================================
    // 3. AUTHENTIC PROFILES FOR ALL 25 H3H NOMERA VEHICLES
    // =========================================================================
    // Each car has distinct drivetrain ('FWD' | 'RWD' | 'AWD'), torqueSplit (front share 0..1),
    // massKg, wheelbase, trackWidth, cgHeight, frontWeightBias, engine curve, induction, and gearing.
    const VEHICLE_PROFILES = Object.freeze({
        "ВАЗ-2107 «Жигули»": {
            id: 'vaz2107', category: 'budget', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1060, wheelbase: 2.42, trackWidth: 1.36, cgHeight: 0.54, frontWeightBias: 0.54,
            idleRpm: 850, peakTorqueRpm: 3800, redlineRpm: 6200, maxRpm: 6500,
            baseTorqueNm: 215, topSpeedKmh: 160, accelRating: 2.2, handlingRating: 4.8, driftFactor: 1.55,
            inductionType: 'na', inductionBoost: 0.0, dragCoeff: 0.46, downforceCoeff: 0.05,
            gearRatios: [-3.40, 0, 3.67, 2.10, 1.36, 1.00, 0.82], finalDrive: 3.90, wheelRadius: 0.30,
            springStiffness: 34000, dampingRate: 4200, rollBalance: 0.48, yawSpeedMult: 1.18
        },
        "ВАЗ-2109 «Девятка»": {
            id: 'vaz2109', category: 'budget', drivetrain: 'FWD', torqueSplit: 1.0,
            massKg: 980, wheelbase: 2.46, trackWidth: 1.40, cgHeight: 0.51, frontWeightBias: 0.61,
            idleRpm: 850, peakTorqueRpm: 4100, redlineRpm: 6400, maxRpm: 6700,
            baseTorqueNm: 225, topSpeedKmh: 170, accelRating: 2.4, handlingRating: 5.2, driftFactor: 1.18,
            inductionType: 'na', inductionBoost: 0.0, dragCoeff: 0.41, downforceCoeff: 0.07,
            gearRatios: [-3.30, 0, 3.64, 1.95, 1.35, 0.94, 0.78], finalDrive: 3.94, wheelRadius: 0.30,
            springStiffness: 36000, dampingRate: 4400, rollBalance: 0.58, yawSpeedMult: 1.06
        },
        "ГАЗ-24 «Волга»": {
            id: 'gaz24', category: 'budget', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1420, wheelbase: 2.80, trackWidth: 1.47, cgHeight: 0.57, frontWeightBias: 0.55,
            idleRpm: 750, peakTorqueRpm: 3200, redlineRpm: 5400, maxRpm: 5700,
            baseTorqueNm: 285, topSpeedKmh: 175, accelRating: 2.3, handlingRating: 4.5, driftFactor: 1.35,
            inductionType: 'na', inductionBoost: 0.0, dragCoeff: 0.44, downforceCoeff: 0.06,
            gearRatios: [-3.20, 0, 3.50, 2.26, 1.45, 1.00, 0.84], finalDrive: 3.90, wheelRadius: 0.34,
            springStiffness: 31000, dampingRate: 3900, rollBalance: 0.50, yawSpeedMult: 0.96
        },
        "Lada Priora БПАН": {
            id: 'priora', category: 'budget', drivetrain: 'FWD', torqueSplit: 1.0,
            massKg: 1088, wheelbase: 2.49, trackWidth: 1.41, cgHeight: 0.47, frontWeightBias: 0.60,
            idleRpm: 850, peakTorqueRpm: 4500, redlineRpm: 6600, maxRpm: 6900,
            baseTorqueNm: 255, topSpeedKmh: 185, accelRating: 2.7, handlingRating: 5.6, driftFactor: 1.25,
            inductionType: 'na', inductionBoost: 0.05, dragCoeff: 0.36, downforceCoeff: 0.09,
            gearRatios: [-3.30, 0, 3.63, 1.95, 1.35, 0.94, 0.78], finalDrive: 3.70, wheelRadius: 0.31,
            springStiffness: 42000, dampingRate: 5100, rollBalance: 0.57, yawSpeedMult: 1.10
        },
        "Hyundai Solaris": {
            id: 'solaris', category: 'budget', drivetrain: 'FWD', torqueSplit: 1.0,
            massKg: 1150, wheelbase: 2.60, trackWidth: 1.49, cgHeight: 0.50, frontWeightBias: 0.59,
            idleRpm: 800, peakTorqueRpm: 4400, redlineRpm: 6500, maxRpm: 6800,
            baseTorqueNm: 270, topSpeedKmh: 195, accelRating: 2.9, handlingRating: 6.0, driftFactor: 1.10,
            inductionType: 'na', inductionBoost: 0.0, dragCoeff: 0.34, downforceCoeff: 0.10,
            gearRatios: [-3.20, 0, 3.61, 2.05, 1.37, 1.03, 0.84, 0.72], finalDrive: 3.65, wheelRadius: 0.31,
            springStiffness: 40000, dampingRate: 4900, rollBalance: 0.58, yawSpeedMult: 1.05
        },
        "Lada Vesta Sport": {
            id: 'vesta', category: 'budget', drivetrain: 'FWD', torqueSplit: 1.0,
            massKg: 1240, wheelbase: 2.63, trackWidth: 1.52, cgHeight: 0.48, frontWeightBias: 0.58,
            idleRpm: 850, peakTorqueRpm: 4800, redlineRpm: 6800, maxRpm: 7100,
            baseTorqueNm: 310, topSpeedKmh: 215, accelRating: 3.3, handlingRating: 6.2, driftFactor: 1.18,
            inductionType: 'na', inductionBoost: 0.08, dragCoeff: 0.33, downforceCoeff: 0.14,
            gearRatios: [-3.20, 0, 3.55, 2.04, 1.39, 1.03, 0.82], finalDrive: 3.85, wheelRadius: 0.32,
            springStiffness: 47000, dampingRate: 5600, rollBalance: 0.56, yawSpeedMult: 1.12
        },
        "Volkswagen Polo": {
            id: 'polo', category: 'budget', drivetrain: 'FWD', torqueSplit: 1.0,
            massKg: 1190, wheelbase: 2.59, trackWidth: 1.50, cgHeight: 0.49, frontWeightBias: 0.59,
            idleRpm: 800, peakTorqueRpm: 3800, redlineRpm: 6500, maxRpm: 6800,
            baseTorqueNm: 295, topSpeedKmh: 205, accelRating: 3.1, handlingRating: 6.4, driftFactor: 1.10,
            inductionType: 'turbo', inductionBoost: 0.16, spoolRpmRatio: 0.32, dragCoeff: 0.33, downforceCoeff: 0.12,
            gearRatios: [-3.20, 0, 3.60, 2.10, 1.42, 1.05, 0.85, 0.72], finalDrive: 3.60, wheelRadius: 0.31,
            springStiffness: 44000, dampingRate: 5300, rollBalance: 0.57, yawSpeedMult: 1.08
        },
        "Toyota Mark II Tourer V": {
            id: 'mark2', category: 'jdm', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1450, wheelbase: 2.73, trackWidth: 1.50, cgHeight: 0.48, frontWeightBias: 0.53,
            idleRpm: 850, peakTorqueRpm: 4600, redlineRpm: 7200, maxRpm: 7500,
            baseTorqueNm: 450, topSpeedKmh: 270, accelRating: 4.3, handlingRating: 7.2, driftFactor: 1.90,
            inductionType: 'turbo', inductionBoost: 0.32, spoolRpmRatio: 0.38, dragCoeff: 0.32, downforceCoeff: 0.18,
            gearRatios: [-3.20, 0, 3.35, 2.06, 1.40, 1.00, 0.76], finalDrive: 3.72, wheelRadius: 0.33,
            springStiffness: 52000, dampingRate: 6200, rollBalance: 0.46, yawSpeedMult: 1.32
        },
        "Subaru Impreza WRX STI": {
            id: 'wrx', category: 'jdm', drivetrain: 'AWD', torqueSplit: 0.41,
            massKg: 1470, wheelbase: 2.62, trackWidth: 1.53, cgHeight: 0.47, frontWeightBias: 0.55,
            idleRpm: 900, peakTorqueRpm: 4400, redlineRpm: 7400, maxRpm: 7700,
            baseTorqueNm: 465, topSpeedKmh: 265, accelRating: 4.5, handlingRating: 8.2, driftFactor: 1.42,
            inductionType: 'turbo', inductionBoost: 0.34, spoolRpmRatio: 0.36, dragCoeff: 0.33, downforceCoeff: 0.24,
            gearRatios: [-3.40, 0, 3.63, 2.23, 1.52, 1.13, 0.90, 0.75], finalDrive: 3.90, wheelRadius: 0.33,
            springStiffness: 58000, dampingRate: 6900, rollBalance: 0.51, yawSpeedMult: 1.24
        },
        "BMW M5 E60 V10": {
            id: 'm5e60', category: 'sport', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1755, wheelbase: 2.89, trackWidth: 1.58, cgHeight: 0.49, frontWeightBias: 0.52,
            idleRpm: 950, peakTorqueRpm: 6100, redlineRpm: 8250, maxRpm: 8500,
            baseTorqueNm: 530, topSpeedKmh: 280, accelRating: 4.4, handlingRating: 7.0, driftFactor: 1.65,
            inductionType: 'na', inductionBoost: 0.12, dragCoeff: 0.31, downforceCoeff: 0.22,
            gearRatios: [-3.20, 0, 3.98, 2.65, 1.80, 1.39, 1.16, 1.00, 0.83], finalDrive: 3.62, wheelRadius: 0.34,
            springStiffness: 56000, dampingRate: 6700, rollBalance: 0.48, yawSpeedMult: 1.22
        },
        "Nissan Silvia S15 Spec-R": {
            id: 's15', category: 'jdm', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1240, wheelbase: 2.52, trackWidth: 1.48, cgHeight: 0.45, frontWeightBias: 0.51,
            idleRpm: 900, peakTorqueRpm: 4800, redlineRpm: 7500, maxRpm: 7800,
            baseTorqueNm: 440, topSpeedKmh: 275, accelRating: 4.6, handlingRating: 8.0, driftFactor: 2.05,
            inductionType: 'turbo', inductionBoost: 0.36, spoolRpmRatio: 0.35, dragCoeff: 0.30, downforceCoeff: 0.22,
            gearRatios: [-3.30, 0, 3.62, 2.20, 1.54, 1.21, 1.00, 0.77], finalDrive: 3.69, wheelRadius: 0.32,
            springStiffness: 55000, dampingRate: 6500, rollBalance: 0.45, yawSpeedMult: 1.38
        },
        "Toyota Camry 3.5": {
            id: 'camry', category: 'sedan', drivetrain: 'FWD', torqueSplit: 1.0,
            massKg: 1590, wheelbase: 2.82, trackWidth: 1.58, cgHeight: 0.50, frontWeightBias: 0.60,
            idleRpm: 750, peakTorqueRpm: 4700, redlineRpm: 6600, maxRpm: 6800,
            baseTorqueNm: 410, topSpeedKmh: 260, accelRating: 3.9, handlingRating: 6.6, driftFactor: 1.16,
            inductionType: 'na', inductionBoost: 0.05, dragCoeff: 0.29, downforceCoeff: 0.14,
            gearRatios: [-3.20, 0, 3.54, 2.26, 1.52, 1.14, 0.87, 0.69], finalDrive: 3.65, wheelRadius: 0.34,
            springStiffness: 46000, dampingRate: 5500, rollBalance: 0.58, yawSpeedMult: 1.05
        },
        "Toyota Land Cruiser 300": {
            id: 'lc300', category: 'suv', drivetrain: 'AWD', torqueSplit: 0.45,
            massKg: 2520, wheelbase: 2.85, trackWidth: 1.66, cgHeight: 0.68, frontWeightBias: 0.54,
            idleRpm: 700, peakTorqueRpm: 3600, redlineRpm: 5800, maxRpm: 6100,
            baseTorqueNm: 650, topSpeedKmh: 250, accelRating: 3.7, handlingRating: 5.8, driftFactor: 1.12,
            inductionType: 'turbo', inductionBoost: 0.24, spoolRpmRatio: 0.28, dragCoeff: 0.38, downforceCoeff: 0.10,
            gearRatios: [-3.40, 0, 3.60, 2.30, 1.58, 1.18, 0.92, 0.74], finalDrive: 3.58, wheelRadius: 0.39,
            springStiffness: 54000, dampingRate: 6400, rollBalance: 0.53, yawSpeedMult: 0.95
        },
        "Nissan GT-R R35 Nismo": {
            id: 'gtr', category: 'supercar', drivetrain: 'AWD', torqueSplit: 0.32,
            massKg: 1720, wheelbase: 2.78, trackWidth: 1.60, cgHeight: 0.44, frontWeightBias: 0.54,
            idleRpm: 950, peakTorqueRpm: 4800, redlineRpm: 7200, maxRpm: 7500,
            baseTorqueNm: 690, topSpeedKmh: 340, accelRating: 6.0, handlingRating: 8.8, driftFactor: 1.38,
            inductionType: 'turbo', inductionBoost: 0.40, spoolRpmRatio: 0.34, dragCoeff: 0.26, downforceCoeff: 0.42,
            gearRatios: [-3.30, 0, 4.05, 2.30, 1.59, 1.24, 1.00, 0.79], finalDrive: 3.70, wheelRadius: 0.35,
            springStiffness: 74000, dampingRate: 8600, rollBalance: 0.50, yawSpeedMult: 1.28
        },
        "Mercedes-Benz E63s AMG": {
            id: 'e63', category: 'sport', drivetrain: 'AWD', torqueSplit: 0.30,
            massKg: 1940, wheelbase: 2.94, trackWidth: 1.62, cgHeight: 0.48, frontWeightBias: 0.53,
            idleRpm: 850, peakTorqueRpm: 4200, redlineRpm: 7000, maxRpm: 7300,
            baseTorqueNm: 680, topSpeedKmh: 320, accelRating: 5.2, handlingRating: 7.8, driftFactor: 1.52,
            inductionType: 'turbo', inductionBoost: 0.34, spoolRpmRatio: 0.30, dragCoeff: 0.28, downforceCoeff: 0.28,
            gearRatios: [-3.40, 0, 4.10, 2.52, 1.72, 1.32, 1.04, 0.84, 0.70], finalDrive: 3.45, wheelRadius: 0.35,
            springStiffness: 65000, dampingRate: 7600, rollBalance: 0.49, yawSpeedMult: 1.20
        },
        "Audi RS6 Avant": {
            id: 'rs6', category: 'sport', drivetrain: 'AWD', torqueSplit: 0.40,
            massKg: 2020, wheelbase: 2.93, trackWidth: 1.66, cgHeight: 0.48, frontWeightBias: 0.55,
            idleRpm: 850, peakTorqueRpm: 4300, redlineRpm: 7000, maxRpm: 7300,
            baseTorqueNm: 700, topSpeedKmh: 330, accelRating: 5.4, handlingRating: 8.0, driftFactor: 1.32,
            inductionType: 'turbo', inductionBoost: 0.35, spoolRpmRatio: 0.30, dragCoeff: 0.28, downforceCoeff: 0.32,
            gearRatios: [-3.40, 0, 4.15, 2.56, 1.75, 1.34, 1.05, 0.85, 0.71], finalDrive: 3.40, wheelRadius: 0.35,
            springStiffness: 68000, dampingRate: 7900, rollBalance: 0.52, yawSpeedMult: 1.18
        },
        "BMW M5 F90 Competition": {
            id: 'm5f90', category: 'sport', drivetrain: 'AWD', torqueSplit: 0.28,
            massKg: 1865, wheelbase: 2.98, trackWidth: 1.62, cgHeight: 0.47, frontWeightBias: 0.52,
            idleRpm: 850, peakTorqueRpm: 4500, redlineRpm: 7200, maxRpm: 7500,
            baseTorqueNm: 710, topSpeedKmh: 350, accelRating: 5.8, handlingRating: 8.4, driftFactor: 1.56,
            inductionType: 'turbo', inductionBoost: 0.36, spoolRpmRatio: 0.31, dragCoeff: 0.27, downforceCoeff: 0.34,
            gearRatios: [-3.40, 0, 4.20, 2.58, 1.76, 1.35, 1.06, 0.85, 0.70], finalDrive: 3.38, wheelRadius: 0.35,
            springStiffness: 70000, dampingRate: 8200, rollBalance: 0.48, yawSpeedMult: 1.25
        },
        "BMW M8 Gran Coupe": {
            id: 'm8', category: 'sport', drivetrain: 'AWD', torqueSplit: 0.28,
            massKg: 1920, wheelbase: 3.02, trackWidth: 1.63, cgHeight: 0.45, frontWeightBias: 0.52,
            idleRpm: 850, peakTorqueRpm: 4500, redlineRpm: 7200, maxRpm: 7500,
            baseTorqueNm: 715, topSpeedKmh: 345, accelRating: 5.9, handlingRating: 8.3, driftFactor: 1.48,
            inductionType: 'turbo', inductionBoost: 0.36, spoolRpmRatio: 0.31, dragCoeff: 0.27, downforceCoeff: 0.35,
            gearRatios: [-3.40, 0, 4.20, 2.58, 1.76, 1.35, 1.06, 0.85, 0.70], finalDrive: 3.38, wheelRadius: 0.35,
            springStiffness: 71000, dampingRate: 8300, rollBalance: 0.49, yawSpeedMult: 1.23
        },
        "Mercedes-Benz G63 AMG «Гелик»": {
            id: 'g63', category: 'suv', drivetrain: 'AWD', torqueSplit: 0.40,
            massKg: 2485, wheelbase: 2.89, trackWidth: 1.64, cgHeight: 0.66, frontWeightBias: 0.53,
            idleRpm: 800, peakTorqueRpm: 4000, redlineRpm: 6800, maxRpm: 7100,
            baseTorqueNm: 740, topSpeedKmh: 290, accelRating: 4.9, handlingRating: 6.4, driftFactor: 1.18,
            inductionType: 'turbo', inductionBoost: 0.32, spoolRpmRatio: 0.28, dragCoeff: 0.48, downforceCoeff: 0.12,
            gearRatios: [-3.40, 0, 4.10, 2.52, 1.72, 1.32, 1.04, 0.84, 0.72], finalDrive: 3.60, wheelRadius: 0.39,
            springStiffness: 58000, dampingRate: 6800, rollBalance: 0.52, yawSpeedMult: 1.02
        },
        "Porsche 911 Turbo S": {
            id: 'porsche911', category: 'supercar', drivetrain: 'AWD', torqueSplit: 0.26,
            massKg: 1640, wheelbase: 2.45, trackWidth: 1.58, cgHeight: 0.41, frontWeightBias: 0.39,
            idleRpm: 950, peakTorqueRpm: 4500, redlineRpm: 7400, maxRpm: 7700,
            baseTorqueNm: 760, topSpeedKmh: 370, accelRating: 6.5, handlingRating: 9.2, driftFactor: 1.45,
            inductionType: 'turbo', inductionBoost: 0.42, spoolRpmRatio: 0.32, dragCoeff: 0.25, downforceCoeff: 0.50,
            gearRatios: [-3.30, 0, 3.91, 2.29, 1.58, 1.18, 0.94, 0.79, 0.65], finalDrive: 3.44, wheelRadius: 0.34,
            springStiffness: 82000, dampingRate: 9400, rollBalance: 0.47, yawSpeedMult: 1.34
        },
        "Lamborghini Huracan Performante": {
            id: 'huracan', category: 'supercar', drivetrain: 'AWD', torqueSplit: 0.30,
            massKg: 1510, wheelbase: 2.62, trackWidth: 1.66, cgHeight: 0.40, frontWeightBias: 0.43,
            idleRpm: 1050, peakTorqueRpm: 6500, redlineRpm: 8500, maxRpm: 8800,
            baseTorqueNm: 640, topSpeedKmh: 360, accelRating: 6.6, handlingRating: 9.1, driftFactor: 1.50,
            inductionType: 'na', inductionBoost: 0.16, dragCoeff: 0.26, downforceCoeff: 0.52,
            gearRatios: [-3.30, 0, 3.91, 2.44, 1.81, 1.40, 1.12, 0.93, 0.78], finalDrive: 3.65, wheelRadius: 0.34,
            springStiffness: 84000, dampingRate: 9600, rollBalance: 0.48, yawSpeedMult: 1.35
        },
        "Rolls-Royce Cullinan": {
            id: 'cullinan', category: 'luxury', drivetrain: 'AWD', torqueSplit: 0.45,
            massKg: 2660, wheelbase: 3.29, trackWidth: 1.68, cgHeight: 0.62, frontWeightBias: 0.53,
            idleRpm: 700, peakTorqueRpm: 3500, redlineRpm: 6200, maxRpm: 6500,
            baseTorqueNm: 780, topSpeedKmh: 300, accelRating: 4.7, handlingRating: 6.7, driftFactor: 1.05,
            inductionType: 'turbo', inductionBoost: 0.30, spoolRpmRatio: 0.26, dragCoeff: 0.36, downforceCoeff: 0.16,
            gearRatios: [-3.40, 0, 4.10, 2.52, 1.72, 1.32, 1.04, 0.84, 0.70], finalDrive: 3.45, wheelRadius: 0.39,
            springStiffness: 56000, dampingRate: 6600, rollBalance: 0.52, yawSpeedMult: 0.98
        },
        "Ferrari SF90 Stradale": {
            id: 'sf90', category: 'hypercar', drivetrain: 'AWD', torqueSplit: 0.25,
            massKg: 1570, wheelbase: 2.65, trackWidth: 1.67, cgHeight: 0.39, frontWeightBias: 0.44,
            idleRpm: 1100, peakTorqueRpm: 6000, redlineRpm: 8200, maxRpm: 8600,
            baseTorqueNm: 820, topSpeedKmh: 390, accelRating: 7.2, handlingRating: 9.4, driftFactor: 1.42,
            inductionType: 'turbo', inductionBoost: 0.44, spoolRpmRatio: 0.25, dragCoeff: 0.24, downforceCoeff: 0.58,
            gearRatios: [-3.30, 0, 3.85, 2.40, 1.75, 1.34, 1.06, 0.86, 0.71], finalDrive: 3.40, wheelRadius: 0.34,
            springStiffness: 88000, dampingRate: 10000, rollBalance: 0.47, yawSpeedMult: 1.38
        },
        "Bugatti Chiron Super Sport": {
            id: 'chiron', category: 'hypercar', drivetrain: 'AWD', torqueSplit: 0.38,
            massKg: 1978, wheelbase: 2.71, trackWidth: 1.74, cgHeight: 0.41, frontWeightBias: 0.45,
            idleRpm: 1000, peakTorqueRpm: 4800, redlineRpm: 7100, maxRpm: 7400,
            baseTorqueNm: 1150, topSpeedKmh: 450, accelRating: 7.8, handlingRating: 9.0, driftFactor: 1.20,
            inductionType: 'turbo', inductionBoost: 0.52, spoolRpmRatio: 0.28, dragCoeff: 0.22, downforceCoeff: 0.65,
            gearRatios: [-3.20, 0, 3.65, 2.28, 1.66, 1.27, 1.00, 0.81, 0.66], finalDrive: 3.18, wheelRadius: 0.36,
            springStiffness: 92000, dampingRate: 10500, rollBalance: 0.50, yawSpeedMult: 1.28
        },
        "Koenigsegg Jesko Attack": {
            id: 'jesko', category: 'hypercar', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1420, wheelbase: 2.70, trackWidth: 1.72, cgHeight: 0.38, frontWeightBias: 0.43,
            idleRpm: 1100, peakTorqueRpm: 5800, redlineRpm: 8500, maxRpm: 8800,
            baseTorqueNm: 1080, topSpeedKmh: 480, accelRating: 8.2, handlingRating: 9.6, driftFactor: 1.62,
            inductionType: 'turbo', inductionBoost: 0.55, spoolRpmRatio: 0.30, dragCoeff: 0.21, downforceCoeff: 0.78,
            gearRatios: [-3.20, 0, 3.70, 2.32, 1.68, 1.28, 1.00, 0.80, 0.64], finalDrive: 3.12, wheelRadius: 0.35,
            springStiffness: 96000, dampingRate: 11000, rollBalance: 0.46, yawSpeedMult: 1.42
        },
        // =========================================================================
        // 3D SPORT, SUPERCAR & TUNER MODELS
        // =========================================================================
        "BMW M3 E46 GTR": {
            id: 'm3gtr', category: 'nfsmw', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1120, wheelbase: 2.73, trackWidth: 1.64, cgHeight: 0.37, frontWeightBias: 0.50,
            idleRpm: 1150, peakTorqueRpm: 7200, redlineRpm: 8800, maxRpm: 9200,
            baseTorqueNm: 540, topSpeedKmh: 388, accelRating: 7.4, handlingRating: 9.8, driftFactor: 1.52,
            inductionType: 'na', inductionBoost: 0.28, dragCoeff: 0.24, downforceCoeff: 0.76,
            gearRatios: [-3.15, 0, 3.68, 2.38, 1.72, 1.32, 1.04, 0.84], finalDrive: 3.42, wheelRadius: 0.33,
            springStiffness: 94000, dampingRate: 10800, rollBalance: 0.49, yawSpeedMult: 1.46,
            engineSoundClass: 'm3gtr'
        },
        "Chevrolet Corvette C6.R": {
            id: 'corvette_cross', category: 'nfsmw', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1290, wheelbase: 2.69, trackWidth: 1.66, cgHeight: 0.39, frontWeightBias: 0.51,
            idleRpm: 950, peakTorqueRpm: 5400, redlineRpm: 7400, maxRpm: 7700,
            baseTorqueNm: 780, topSpeedKmh: 382, accelRating: 7.1, handlingRating: 9.3, driftFactor: 1.64,
            inductionType: 'supercharger', inductionBoost: 0.38, spoolRpmRatio: 0.18, dragCoeff: 0.25, downforceCoeff: 0.68,
            gearRatios: [-3.20, 0, 3.55, 2.28, 1.64, 1.24, 0.98, 0.78], finalDrive: 3.42, wheelRadius: 0.34,
            springStiffness: 88000, dampingRate: 10000, rollBalance: 0.48, yawSpeedMult: 1.38,
            engineSoundClass: 'v8'
        },
        "Ford Mustang GT": {
            id: 'mustang_razor', category: 'nfsmw', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1540, wheelbase: 2.72, trackWidth: 1.59, cgHeight: 0.45, frontWeightBias: 0.54,
            idleRpm: 880, peakTorqueRpm: 4600, redlineRpm: 6800, maxRpm: 7100,
            baseTorqueNm: 690, topSpeedKmh: 342, accelRating: 6.2, handlingRating: 8.4, driftFactor: 1.82,
            inductionType: 'supercharger', inductionBoost: 0.36, spoolRpmRatio: 0.16, dragCoeff: 0.30, downforceCoeff: 0.44,
            gearRatios: [-3.30, 0, 3.65, 2.32, 1.65, 1.26, 1.00, 0.79], finalDrive: 3.55, wheelRadius: 0.34,
            springStiffness: 72000, dampingRate: 8400, rollBalance: 0.46, yawSpeedMult: 1.36,
            engineSoundClass: 'v8'
        },
        "Mercedes-Benz SLR McLaren": {
            id: 'mclaren', category: 'nfsmw', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1690, wheelbase: 2.70, trackWidth: 1.64, cgHeight: 0.41, frontWeightBias: 0.49,
            idleRpm: 900, peakTorqueRpm: 4000, redlineRpm: 7000, maxRpm: 7300,
            baseTorqueNm: 820, topSpeedKmh: 378, accelRating: 6.9, handlingRating: 9.0, driftFactor: 1.50,
            inductionType: 'supercharger', inductionBoost: 0.42, spoolRpmRatio: 0.15, dragCoeff: 0.25, downforceCoeff: 0.58,
            gearRatios: [-3.20, 0, 3.60, 2.30, 1.65, 1.25, 1.00, 0.80], finalDrive: 3.30, wheelRadius: 0.35,
            springStiffness: 84000, dampingRate: 9600, rollBalance: 0.48, yawSpeedMult: 1.34,
            engineSoundClass: 'v8'
        },
        "Aston Martin DB9": {
            id: 'db9', category: 'nfsmw', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1710, wheelbase: 2.74, trackWidth: 1.57, cgHeight: 0.43, frontWeightBias: 0.50,
            idleRpm: 950, peakTorqueRpm: 5000, redlineRpm: 7300, maxRpm: 7600,
            baseTorqueNm: 660, topSpeedKmh: 356, accelRating: 6.3, handlingRating: 8.9, driftFactor: 1.48,
            inductionType: 'na', inductionBoost: 0.22, dragCoeff: 0.27, downforceCoeff: 0.48,
            gearRatios: [-3.25, 0, 3.70, 2.35, 1.68, 1.28, 1.02, 0.82], finalDrive: 3.45, wheelRadius: 0.34,
            springStiffness: 78000, dampingRate: 9000, rollBalance: 0.49, yawSpeedMult: 1.32,
            engineSoundClass: 'supercar'
        },
        "Dodge Viper SRT10": {
            id: 'viper_jv', category: 'nfsmw', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1530, wheelbase: 2.51, trackWidth: 1.65, cgHeight: 0.40, frontWeightBias: 0.49,
            idleRpm: 850, peakTorqueRpm: 4200, redlineRpm: 6400, maxRpm: 6700,
            baseTorqueNm: 790, topSpeedKmh: 365, accelRating: 6.7, handlingRating: 8.7, driftFactor: 1.76,
            inductionType: 'supercharger', inductionBoost: 0.35, spoolRpmRatio: 0.18, dragCoeff: 0.27, downforceCoeff: 0.54,
            gearRatios: [-3.20, 0, 3.50, 2.24, 1.60, 1.22, 0.96, 0.76], finalDrive: 3.35, wheelRadius: 0.35,
            springStiffness: 82000, dampingRate: 9400, rollBalance: 0.46, yawSpeedMult: 1.40,
            engineSoundClass: 'v8'
        },
        "Chevrolet Corvette C6": {
            id: 'corvette_webster', category: 'nfsmw', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1460, wheelbase: 2.68, trackWidth: 1.62, cgHeight: 0.41, frontWeightBias: 0.51,
            idleRpm: 900, peakTorqueRpm: 4800, redlineRpm: 7000, maxRpm: 7300,
            baseTorqueNm: 710, topSpeedKmh: 360, accelRating: 6.5, handlingRating: 8.9, driftFactor: 1.60,
            inductionType: 'supercharger', inductionBoost: 0.34, spoolRpmRatio: 0.20, dragCoeff: 0.26, downforceCoeff: 0.52,
            gearRatios: [-3.20, 0, 3.58, 2.30, 1.65, 1.25, 0.99, 0.79], finalDrive: 3.42, wheelRadius: 0.34,
            springStiffness: 80000, dampingRate: 9200, rollBalance: 0.48, yawSpeedMult: 1.35,
            engineSoundClass: 'v8'
        },
        "Lamborghini Gallardo": {
            id: 'gallardo_ming', category: 'nfsmw', drivetrain: 'AWD', torqueSplit: 0.30,
            massKg: 1430, wheelbase: 2.56, trackWidth: 1.64, cgHeight: 0.40, frontWeightBias: 0.42,
            idleRpm: 1050, peakTorqueRpm: 6200, redlineRpm: 8200, maxRpm: 8500,
            baseTorqueNm: 630, topSpeedKmh: 362, accelRating: 6.6, handlingRating: 9.2, driftFactor: 1.44,
            inductionType: 'na', inductionBoost: 0.20, dragCoeff: 0.26, downforceCoeff: 0.54,
            gearRatios: [-3.30, 0, 3.88, 2.42, 1.79, 1.38, 1.10, 0.89], finalDrive: 3.60, wheelRadius: 0.34,
            springStiffness: 84000, dampingRate: 9600, rollBalance: 0.48, yawSpeedMult: 1.36,
            engineSoundClass: 'supercar'
        },
        "Mercedes-Benz CLK 500": {
            id: 'clk_kaze', category: 'nfsmw', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1580, wheelbase: 2.71, trackWidth: 1.56, cgHeight: 0.45, frontWeightBias: 0.53,
            idleRpm: 850, peakTorqueRpm: 4200, redlineRpm: 6800, maxRpm: 7100,
            baseTorqueNm: 610, topSpeedKmh: 332, accelRating: 5.7, handlingRating: 8.3, driftFactor: 1.58,
            inductionType: 'supercharger', inductionBoost: 0.32, spoolRpmRatio: 0.20, dragCoeff: 0.28, downforceCoeff: 0.38,
            gearRatios: [-3.30, 0, 3.75, 2.38, 1.70, 1.30, 1.02, 0.82], finalDrive: 3.50, wheelRadius: 0.34,
            springStiffness: 72000, dampingRate: 8300, rollBalance: 0.48, yawSpeedMult: 1.28,
            engineSoundClass: 'v8'
        },
        "Ford Mustang GT Coupe": {
            id: 'mustang_jewels', category: 'nfsmw', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1550, wheelbase: 2.72, trackWidth: 1.58, cgHeight: 0.45, frontWeightBias: 0.54,
            idleRpm: 860, peakTorqueRpm: 4500, redlineRpm: 6700, maxRpm: 7000,
            baseTorqueNm: 640, topSpeedKmh: 328, accelRating: 5.8, handlingRating: 8.1, driftFactor: 1.75,
            inductionType: 'supercharger', inductionBoost: 0.32, spoolRpmRatio: 0.18, dragCoeff: 0.31, downforceCoeff: 0.40,
            gearRatios: [-3.30, 0, 3.65, 2.32, 1.65, 1.26, 1.00, 0.79], finalDrive: 3.55, wheelRadius: 0.34,
            springStiffness: 70000, dampingRate: 8100, rollBalance: 0.46, yawSpeedMult: 1.32,
            engineSoundClass: 'v8'
        },
        "Mitsubishi Lancer Evo VIII": {
            id: 'evo8_earl', category: 'nfsmw', drivetrain: 'AWD', torqueSplit: 0.42,
            massKg: 1410, wheelbase: 2.62, trackWidth: 1.52, cgHeight: 0.46, frontWeightBias: 0.56,
            idleRpm: 950, peakTorqueRpm: 4500, redlineRpm: 7600, maxRpm: 7900,
            baseTorqueNm: 540, topSpeedKmh: 325, accelRating: 6.1, handlingRating: 9.0, driftFactor: 1.48,
            inductionType: 'turbo', inductionBoost: 0.42, spoolRpmRatio: 0.34, dragCoeff: 0.31, downforceCoeff: 0.46,
            gearRatios: [-3.40, 0, 3.72, 2.32, 1.62, 1.22, 0.96, 0.78], finalDrive: 3.85, wheelRadius: 0.33,
            springStiffness: 74000, dampingRate: 8600, rollBalance: 0.50, yawSpeedMult: 1.35,
            engineSoundClass: 'sport'
        },
        "Porsche Cayman S": {
            id: 'cayman_baron', category: 'nfsmw', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1340, wheelbase: 2.41, trackWidth: 1.54, cgHeight: 0.41, frontWeightBias: 0.44,
            idleRpm: 950, peakTorqueRpm: 4800, redlineRpm: 7500, maxRpm: 7800,
            baseTorqueNm: 510, topSpeedKmh: 330, accelRating: 5.9, handlingRating: 9.1, driftFactor: 1.46,
            inductionType: 'turbo', inductionBoost: 0.34, spoolRpmRatio: 0.30, dragCoeff: 0.27, downforceCoeff: 0.48,
            gearRatios: [-3.30, 0, 3.82, 2.36, 1.66, 1.26, 1.00, 0.81], finalDrive: 3.55, wheelRadius: 0.33,
            springStiffness: 78000, dampingRate: 9000, rollBalance: 0.48, yawSpeedMult: 1.36,
            engineSoundClass: 'sport'
        },
        "Mitsubishi Eclipse GT": {
            id: 'eclipse_lou', category: 'nfsmw', drivetrain: 'FWD', torqueSplit: 1.0,
            massKg: 1480, wheelbase: 2.57, trackWidth: 1.55, cgHeight: 0.46, frontWeightBias: 0.59,
            idleRpm: 880, peakTorqueRpm: 4400, redlineRpm: 7000, maxRpm: 7300,
            baseTorqueNm: 470, topSpeedKmh: 305, accelRating: 5.2, handlingRating: 8.0, driftFactor: 1.32,
            inductionType: 'turbo', inductionBoost: 0.34, spoolRpmRatio: 0.33, dragCoeff: 0.30, downforceCoeff: 0.36,
            gearRatios: [-3.30, 0, 3.68, 2.28, 1.60, 1.21, 0.96, 0.78], finalDrive: 3.70, wheelRadius: 0.33,
            springStiffness: 66000, dampingRate: 7700, rollBalance: 0.54, yawSpeedMult: 1.24,
            engineSoundClass: 'sport'
        },
        "Mazda RX-8": {
            id: 'rx7', category: 'nfsmw', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1310, wheelbase: 2.70, trackWidth: 1.52, cgHeight: 0.43, frontWeightBias: 0.50,
            idleRpm: 1100, peakTorqueRpm: 5800, redlineRpm: 9000, maxRpm: 9400,
            baseTorqueNm: 460, topSpeedKmh: 318, accelRating: 5.6, handlingRating: 8.9, driftFactor: 1.92,
            inductionType: 'turbo', inductionBoost: 0.38, spoolRpmRatio: 0.36, dragCoeff: 0.29, downforceCoeff: 0.40,
            gearRatios: [-3.35, 0, 3.76, 2.27, 1.65, 1.25, 1.00, 0.81], finalDrive: 3.90, wheelRadius: 0.32,
            springStiffness: 70000, dampingRate: 8200, rollBalance: 0.46, yawSpeedMult: 1.42,
            engineSoundClass: 'sport'
        },
        "Toyota Supra MK4": {
            id: 'supra', category: 'nfsmw', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1490, wheelbase: 2.55, trackWidth: 1.54, cgHeight: 0.44, frontWeightBias: 0.53,
            idleRpm: 950, peakTorqueRpm: 4800, redlineRpm: 7600, maxRpm: 8000,
            baseTorqueNm: 620, topSpeedKmh: 345, accelRating: 6.2, handlingRating: 8.6, driftFactor: 1.88,
            inductionType: 'turbo', inductionBoost: 0.44, spoolRpmRatio: 0.36, dragCoeff: 0.29, downforceCoeff: 0.44,
            gearRatios: [-3.30, 0, 3.65, 2.26, 1.58, 1.20, 0.96, 0.77], finalDrive: 3.62, wheelRadius: 0.33,
            springStiffness: 72000, dampingRate: 8400, rollBalance: 0.46, yawSpeedMult: 1.38,
            engineSoundClass: 'sport'
        },
        "Lexus IS300": {
            id: 'is300_taz', category: 'nfsmw', drivetrain: 'RWD', torqueSplit: 0.0,
            massKg: 1470, wheelbase: 2.67, trackWidth: 1.51, cgHeight: 0.46, frontWeightBias: 0.53,
            idleRpm: 880, peakTorqueRpm: 4500, redlineRpm: 7200, maxRpm: 7500,
            baseTorqueNm: 480, topSpeedKmh: 295, accelRating: 5.0, handlingRating: 8.1, driftFactor: 1.80,
            inductionType: 'turbo', inductionBoost: 0.34, spoolRpmRatio: 0.35, dragCoeff: 0.30, downforceCoeff: 0.32,
            gearRatios: [-3.30, 0, 3.62, 2.22, 1.55, 1.18, 0.95, 0.78], finalDrive: 3.72, wheelRadius: 0.33,
            springStiffness: 64000, dampingRate: 7500, rollBalance: 0.47, yawSpeedMult: 1.32,
            engineSoundClass: 'sport'
        },
        "Volkswagen Golf GTI": {
            id: 'golf_sonny', category: 'nfsmw', drivetrain: 'FWD', torqueSplit: 1.0,
            massKg: 1330, wheelbase: 2.58, trackWidth: 1.53, cgHeight: 0.47, frontWeightBias: 0.60,
            idleRpm: 850, peakTorqueRpm: 4200, redlineRpm: 6900, maxRpm: 7200,
            baseTorqueNm: 430, topSpeedKmh: 288, accelRating: 4.8, handlingRating: 8.2, driftFactor: 1.28,
            inductionType: 'turbo', inductionBoost: 0.34, spoolRpmRatio: 0.31, dragCoeff: 0.31, downforceCoeff: 0.32,
            gearRatios: [-3.30, 0, 3.65, 2.24, 1.56, 1.18, 0.94, 0.76], finalDrive: 3.75, wheelRadius: 0.32,
            springStiffness: 62000, dampingRate: 7300, rollBalance: 0.56, yawSpeedMult: 1.24,
            engineSoundClass: 'sport'
        },
        "Audi Le Mans Quattro R8": {
            id: 'audir8', category: 'nfsmw', drivetrain: 'AWD', torqueSplit: 0.30,
            massKg: 1530, wheelbase: 2.65, trackWidth: 1.66, cgHeight: 0.40, frontWeightBias: 0.43,
            idleRpm: 1050, peakTorqueRpm: 6400, redlineRpm: 8500, maxRpm: 8800,
            baseTorqueNm: 680, topSpeedKmh: 376, accelRating: 6.9, handlingRating: 9.4, driftFactor: 1.48,
            inductionType: 'turbo', inductionBoost: 0.38, spoolRpmRatio: 0.28, dragCoeff: 0.25, downforceCoeff: 0.58,
            gearRatios: [-3.30, 0, 3.88, 2.40, 1.76, 1.35, 1.08, 0.87], finalDrive: 3.55, wheelRadius: 0.34,
            springStiffness: 86000, dampingRate: 9800, rollBalance: 0.48, yawSpeedMult: 1.38,
            engineSoundClass: 'supercar'
        }
    });

    function resolveVehicleProfile(carOrName, customOverrides = {}, extraStyling = {}) {
        const carObj = (carOrName && typeof carOrName === 'object') ? carOrName : null;
        const mergedOverrides = Object.assign(
            {},
            carObj && carObj.performance ? carObj.performance : {},
            carObj || {},
            customOverrides || {}
        );
        const name = String(
            carObj
                ? (carObj.name || carObj.carName || mergedOverrides.carName || 'ВАЗ-2107 «Жигули»')
                : (carOrName || mergedOverrides.carName || 'ВАЗ-2107 «Жигули»')
        ).trim();

        let base = VEHICLE_PROFILES[name];
        if (!base) {
            const lower = name.toLowerCase();
            if (lower.includes('m3 e46') || lower.includes('m3 gtr') || lower.includes('m3gtr')) base = VEHICLE_PROFILES["BMW M3 E46 GTR"];
            else if (lower.includes('corvette c6.r') || lower.includes('c6r')) base = VEHICLE_PROFILES["Chevrolet Corvette C6.R"];
            else if (lower.includes('corvette')) base = VEHICLE_PROFILES["Chevrolet Corvette C6"];
            else if (lower.includes('mustang gt coupe')) base = VEHICLE_PROFILES["Ford Mustang GT Coupe"];
            else if (lower.includes('mustang')) base = VEHICLE_PROFILES["Ford Mustang GT"];
            else if (lower.includes('slr') || lower.includes('mclaren')) base = VEHICLE_PROFILES["Mercedes-Benz SLR McLaren"];
            else if (lower.includes('db9') || lower.includes('aston')) base = VEHICLE_PROFILES["Aston Martin DB9"];
            else if (lower.includes('viper')) base = VEHICLE_PROFILES["Dodge Viper SRT10"];
            else if (lower.includes('gallardo')) base = VEHICLE_PROFILES["Lamborghini Gallardo"];
            else if (lower.includes('clk')) base = VEHICLE_PROFILES["Mercedes-Benz CLK 500"];
            else if (lower.includes('evo') || lower.includes('lancer')) base = VEHICLE_PROFILES["Mitsubishi Lancer Evo VIII"];
            else if (lower.includes('cayman')) base = VEHICLE_PROFILES["Porsche Cayman S"];
            else if (lower.includes('eclipse') || lower.includes('veloster')) base = VEHICLE_PROFILES["Mitsubishi Eclipse GT"];
            else if (lower.includes('rx-8') || lower.includes('rx-7') || lower.includes('rx7') || lower.includes('rx8')) base = VEHICLE_PROFILES["Mazda RX-8"];
            else if (lower.includes('supra')) base = VEHICLE_PROFILES["Toyota Supra MK4"];
            else if (lower.includes('is300') || lower.includes('lexus')) base = VEHICLE_PROFILES["Lexus IS300"];
            else if (lower.includes('golf')) base = VEHICLE_PROFILES["Volkswagen Golf GTI"];
            else if (lower.includes('le mans') || lower.includes('r8')) base = VEHICLE_PROFILES["Audi Le Mans Quattro R8"];
            if (!base) {
                for (const [k, prof] of Object.entries(VEHICLE_PROFILES)) {
                    if (k.toLowerCase().includes(lower) || lower.includes(prof.id) || lower.includes(k.toLowerCase())) {
                        base = prof;
                        break;
                    }
                }
            }
            if (!base) {
                if (lower.includes('m5 f90') || lower.includes('m5') || lower.includes('m3')) base = VEHICLE_PROFILES["BMW M5 F90 Competition"];
                else if (lower.includes('m8') || lower.includes('maserati')) base = VEHICLE_PROFILES["BMW M8 Gran Coupe"];
                else if (lower.includes('911') || lower.includes('porsche') || lower.includes('panamera')) base = VEHICLE_PROFILES["Porsche 911 Turbo S"];
                else if (lower.includes('skyline') || lower.includes('gt-r') || lower.includes('gtr')) base = VEHICLE_PROFILES["Nissan GT-R R35 Nismo"];
                else if (lower.includes('silvia') || lower.includes('s15')) base = VEHICLE_PROFILES["Nissan Silvia S15 Spec-R"];
                else if (lower.includes('mark')) base = VEHICLE_PROFILES["Toyota Mark II Tourer V"];
                else if (lower.includes('camry') || lower.includes('камри')) base = VEHICLE_PROFILES["Toyota Camry 3.5"];
                else if (lower.includes('priora') || lower.includes('приора')) base = VEHICLE_PROFILES["Lada Priora БПАН"];
                else if (lower.includes('vesta') || lower.includes('веста') || lower.includes('elantra')) base = VEHICLE_PROFILES["Lada Vesta Sport"];
                else if (lower.includes('solaris') || lower.includes('солярис')) base = VEHICLE_PROFILES["Hyundai Solaris"];
                else if (lower.includes('polo') || lower.includes('поло')) base = VEHICLE_PROFILES["Volkswagen Polo"];
                else if (lower.includes('impreza') || lower.includes('subaru') || lower.includes('wrx')) base = VEHICLE_PROFILES["Subaru Impreza WRX STI"];
                else if (lower.includes('rs6') || lower.includes('rs7') || lower.includes('audi')) base = VEHICLE_PROFILES["Audi RS6 Avant"];
                else if (lower.includes('e63')) base = VEHICLE_PROFILES["Mercedes-Benz E63s AMG"];
                else if (lower.includes('g63') || lower.includes('гелик') || lower.includes('x5')) base = VEHICLE_PROFILES["Mercedes-Benz G63 AMG «Гелик»"];
                else if (lower.includes('huracan') || lower.includes('lamborghini')) base = VEHICLE_PROFILES["Lamborghini Huracan Performante"];
                else if (lower.includes('sf90') || lower.includes('ferrari')) base = VEHICLE_PROFILES["Ferrari SF90 Stradale"];
                else if (lower.includes('chiron') || lower.includes('bugatti')) base = VEHICLE_PROFILES["Bugatti Chiron Super Sport"];
                else if (lower.includes('jesko') || lower.includes('koenigsegg')) base = VEHICLE_PROFILES["Koenigsegg Jesko Attack"];
            }
        }
        if (!base) {
            base = VEHICLE_PROFILES["ВАЗ-2107 «Жигули»"];
        }

        // Apply garage upgrades & plate synergies via NomeraRaceEconomy if available
        const upgrades = (carObj && carObj.upgrades) ? carObj.upgrades : (mergedOverrides.upgrades || {});
        const engineLvl = clamp(Number(upgrades.engine) || 0, 0, 5);
        const handlingLvl = clamp(Number(upgrades.handling) || 0, 0, 5);
        const economyLvl = clamp(Number(upgrades.economy) || 0, 0, 5);
        const nitroLvl = clamp(Number(upgrades.nitro) || 0, 0, 5);
        const condition = clamp(Number(carObj?.condition ?? mergedOverrides.condition ?? 100), 0, 100);
        const health = 0.65 + (condition / 100) * 0.35;

        const baseStatsForEco = {
            speed: mergedOverrides.speed || base.topSpeedKmh,
            accel: mergedOverrides.accel || base.accelRating,
            handling: mergedOverrides.handling || base.handlingRating,
            rewardMult: mergedOverrides.rewardMult || 1.0
        };

        let tunedStats = null;
        const ecoApi = (typeof root !== 'undefined' && root.NomeraRaceEconomy)
            ? root.NomeraRaceEconomy
            : null;
        if (ecoApi && typeof ecoApi.performance === 'function' && carObj && (carObj.upgrades || carObj.plate) && !carObj.performance) {
            tunedStats = ecoApi.performance(baseStatsForEco, carObj);
        }

        // Styling, NFS MW BodyShop aero, Junkman Parts & Pro Tuning sliders
        const styling = Object.assign({}, carObj?.styling || {}, mergedOverrides.styling || {}, extraStyling || {});
        const junkmanEngine = !!(styling.junkmanEngine || mergedOverrides.junkmanEngine || upgrades.junkmanEngine);
        const junkmanTurbo = !!(styling.junkmanTurbo || mergedOverrides.junkmanTurbo || upgrades.junkmanTurbo);
        const junkmanTires = !!(styling.junkmanTires || mergedOverrides.junkmanTires || upgrades.junkmanTires);
        const junkmanNitro = !!(styling.junkmanNitro || mergedOverrides.junkmanNitro || upgrades.junkmanNitro);

        // Pro Tuning biases in [-1..+1]
        // gearRatioBias: -1 = short gears (acceleration), +1 = tall gears (top speed)
        const gearRatioBias = clamp(Number(styling.gearRatioBias ?? mergedOverrides.gearRatioBias ?? upgrades.gearRatioBias ?? 0) || 0, -1, 1);
        // aeroDownforce: -1 = low drag, +1 = max cornering downforce
        const aeroDownforceBias = clamp(Number(styling.aeroDownforce ?? mergedOverrides.aeroDownforce ?? upgrades.aeroDownforce ?? 0) || 0, -1, 1);
        // gripDriftBias: +1 = grip setup, -1 = drift angle setup
        const gripDriftBias = clamp(Number(styling.gripDriftBias ?? mergedOverrides.gripDriftBias ?? upgrades.gripDriftBias ?? 0) || 0, -1, 1);

        const junkmanSpeedMult = (junkmanEngine ? 1.045 : 1.0) * (junkmanTurbo ? 1.04 : 1.0);
        const junkmanAccelMult = (junkmanEngine ? 1.08 : 1.0) * (junkmanTurbo ? 1.07 : 1.0);
        const proGearSpeedMult = 1 + gearRatioBias * 0.055 - Math.max(0, aeroDownforceBias) * 0.02;
        const proGearAccelMult = 1 - gearRatioBias * 0.065;

        const rawTopSpeed = tunedStats
            ? tunedStats.speed
            : Math.round((mergedOverrides.speed || base.topSpeedKmh) * (1 + engineLvl * 0.055) * health);
        const effectiveTopSpeedKmh = Math.round(rawTopSpeed * junkmanSpeedMult * proGearSpeedMult);

        const rawAccel = tunedStats
            ? tunedStats.accel
            : Number(((mergedOverrides.accel || base.accelRating) * (1 + engineLvl * 0.07) * health).toFixed(2));
        const effectiveAccelRating = Number((rawAccel * junkmanAccelMult * proGearAccelMult).toFixed(2));

        const rawHandling = tunedStats
            ? tunedStats.handling
            : Number(clamp((mergedOverrides.handling || base.handlingRating) + handlingLvl * 0.65 - (1 - health) * 3, 2, 10).toFixed(2));
        const effectiveHandlingRating = Number(clamp(rawHandling + (junkmanTires ? 0.55 : 0) + aeroDownforceBias * 0.35, 2, 10).toFixed(2));

        let cgDrop = 0;
        let gripBonus = 0;
        if (styling.suspension === 'bpan') {
            cgDrop = 0.035;
            gripBonus += 0.04;
        } else if (styling.suspension === 'lowered') {
            cgDrop = 0.025;
            gripBonus += 0.03;
        }
        if (styling.wheels === 'forged' || styling.wheels === 'bbs_gtr' || styling.wheels === 'oz_racing') {
            gripBonus += 0.035;
        }
        if (styling.bodykit === 'widebody' || styling.bodykit === 'nfsmw_gtr') {
            gripBonus += 0.045;
            cgDrop += 0.015;
        } else if (styling.bodykit === 'street') {
            gripBonus += 0.02;
        }
        if (junkmanTires) {
            gripBonus += 0.065;
        }
        gripBonus += Math.max(-0.04, gripDriftBias * 0.045);

        let aeroBonus = Math.max(0, aeroDownforceBias * 0.18);
        if (styling.spoiler === 'gtr') aeroBonus += 0.14;
        else if (styling.spoiler === 'gt') aeroBonus += 0.09;
        else if (styling.spoiler === 'ducktail') aeroBonus += 0.04;
        if (styling.bodykit === 'nfsmw_gtr' || styling.bodykit === 'widebody') aeroBonus += 0.08;

        const engineTorqueScale = (1 + engineLvl * 0.085) * health * junkmanAccelMult * ((mergedOverrides.accel || base.accelRating) / Math.max(1, base.accelRating));
        const handlingGripScale = (0.85 + (effectiveHandlingRating / 10) * 0.55) + gripBonus;
        const resolvedDrivetrain = mergedOverrides.drivetrain || base.drivetrain;
        const resolvedTorqueSplit = mergedOverrides.torqueSplit !== undefined
            ? clamp(mergedOverrides.torqueSplit, 0, 1)
            : ((resolvedDrivetrain === 'FWD') ? 1.0 : (resolvedDrivetrain === 'RWD' ? 0.0 : base.torqueSplit));
        const effectiveBaseTorqueNm = base.baseTorqueNm * engineTorqueScale;
        const effectiveFinalDrive = Number((base.finalDrive * (1 - gearRatioBias * 0.045)).toFixed(3));
        const firstGearRatio = Math.abs(base.gearRatios[2] || 3.4);
        const effectiveDriftFactor = Number(clamp(base.driftFactor * (1 - gripDriftBias * 0.25), 0.85, 2.45).toFixed(3));
        const nitroMult = Number((1.48 + nitroLvl * 0.06 + (junkmanNitro ? 0.14 : 0)).toFixed(3));

        return {
            ...base,
            name: name || 'ВАЗ-2107 «Жигули»',
            drivetrain: resolvedDrivetrain,
            torqueSplit: resolvedTorqueSplit,
            topSpeedKmh: effectiveTopSpeedKmh,
            maxSpeedKmh: effectiveTopSpeedKmh,
            accelRating: effectiveAccelRating,
            handlingRating: effectiveHandlingRating,
            baseTorqueNm: effectiveBaseTorqueNm,
            finalDrive: effectiveFinalDrive,
            driftFactor: effectiveDriftFactor,
            downforceCoeff: Number(clamp(base.downforceCoeff + aeroBonus, 0.02, 1.15).toFixed(3)),
            inductionBoost: Number((base.inductionBoost + (junkmanTurbo ? 0.12 : 0)).toFixed(3)),
            peakEngineForce: (effectiveBaseTorqueNm * firstGearRatio * effectiveFinalDrive) / base.wheelRadius,
            cgHeight: Math.max(0.32, base.cgHeight - cgDrop),
            tireGripScale: handlingGripScale,
            frontCorneringStiffness: Number((9.2 * handlingGripScale * 1.05).toFixed(3)),
            rearCorneringStiffness: Number((9.2 * handlingGripScale * (1 - Math.max(0, -gripDriftBias) * 0.08)).toFixed(3)),
            nitroDrainRate: (tunedStats ? tunedStats.nitroDrain : (28 * (1 - nitroLvl * 0.1))) * (junkmanNitro ? 0.82 : 1.0),
            nitroRechargeRate: (tunedStats ? tunedStats.nitroRecharge : (4 + nitroLvl * 0.8)) * (junkmanNitro ? 1.25 : 1.0),
            nitroTorqueMult: nitroMult,
            nitroForceMultiplier: nitroMult,
            nitroTopSpeedMult: (tunedStats ? Math.min(1.26, tunedStats.nitroSpeedBonus - 0.12) : (1.18 + nitroLvl * 0.015)) + (junkmanNitro ? 0.035 : 0),
            fuelConsumption: tunedStats ? tunedStats.consumption : Number(((8 + base.topSpeedKmh / 29) * (1 - economyLvl * 0.085)).toFixed(2)),
            rewardMult: tunedStats ? tunedStats.rewardMult : (mergedOverrides.rewardMult || 1.0),
            upgrades: { engine: engineLvl, handling: handlingLvl, economy: economyLvl, nitro: nitroLvl },
            junkman: { engine: junkmanEngine, turbo: junkmanTurbo, tires: junkmanTires, nitro: junkmanNitro },
            proTuning: { gearRatioBias, aeroDownforce: aeroDownforceBias, gripDriftBias },
            condition
        };
    }

    // =========================================================================
    // 4. PACEJKA MAGIC FORMULA & LOAD SENSITIVITY TIRE MODEL
    // =========================================================================
    /**
     * Computes normalized Pacejka Magic Formula lateral grip factor in [-D, +D]
     * and scales by load-sensitive vertical force.
     */
    function computePacejkaNormalized(slipAngleRad, surfaceLateralGrip = 1.0, stiffnessScale = 1.0) {
        const B = 9.2 * surfaceLateralGrip * stiffnessScale;
        const C = 1.38;
        const D = surfaceLateralGrip;
        const E = -0.18;
        const Bx = B * slipAngleRad;
        return D * Math.sin(C * Math.atan(Bx - E * (Bx - Math.atan(Bx))));
    }

    /**
     * Load sensitivity (inspired by NFS MW's LoadSensitivityTable):
     * Tire lateral force increases sub-linearly as vertical load exceeds nominal corner load.
     */
    function computeEffectiveTireLoad(verticalLoadN, nominalLoadN) {
        if (verticalLoadN <= 0) return 0;
        const ratio = verticalLoadN / Math.max(500, nominalLoadN);
        const degressive = 1.0 - 0.14 * Math.max(0, ratio - 1.0);
        return verticalLoadN * clamp(degressive, 0.65, 1.12);
    }

    // =========================================================================
    // 5. VEHICLE PHYSICS INSTANCE (NFS-STYLE RIGID BODY + 4-WHEEL DYNAMICS)
    // =========================================================================
    class NfsVehiclePhysics {
        constructor(carOrName = 'ВАЗ-2107 «Жигули»', options = {}) {
            const mergedOptions = (carOrName && typeof carOrName === 'object')
                ? Object.assign({}, carOrName.performance || {}, carOrName, options)
                : Object.assign({}, options);
            this.profile = resolveVehicleProfile(carOrName, mergedOptions);
            this.spec = this.profile;
            this.options = Object.assign({
                weather: 'dry',
                surface: 'asphalt',
                transmissionMode: 'auto', // 'auto' | 'manual'
                stabilityAssist: true
            }, mergedOptions);
            this.mwKernel = this.options.physicsKernel || null;
            this.mwSpec = this.mwKernel ? this.mwKernel.createSpec(this.profile) : null;

            this.accumulator = 0;
            this.stepCount = 0;
            this._speedbreakerLatch = false;

            // Current and previous discrete states for fixed-timestep interpolation
            this.state = this._createInitialState(this.options);
            this.prevState = Object.assign({}, this.state);
            this.renderState = Object.assign({}, this.state);
        }

        _createInitialState(init = {}) {
            const p = this.profile;
            const totalWeightN = p.massKg * GRAVITY;
            const frontStaticN = totalWeightN * p.frontWeightBias * 0.5;
            const rearStaticN = totalWeightN * (1 - p.frontWeightBias) * 0.5;

            // Compute yaw moment of inertia (Dynamics::Inertia::Box)
            const lengthM = p.wheelbase * 1.65;
            const widthM = p.trackWidth * 1.15;
            const yawInertia = (p.massKg * (widthM * widthM + lengthM * lengthM)) / 12.0;

            const x0 = Number(init.x) || 0;
            const y0 = Number(init.y) || 0;
            const z0 = Number(init.z) || 0;
            const h0 = Number(init.heading) || 0;
            const spdKmh0 = Number(init.speedKmh) || 0;
            const spdMps0 = spdKmh0 / 3.6;
            const nitro0 = init.nitroLevel !== undefined ? Number(init.nitroLevel) : 100;

            return {
                // Spatial pose (meters & radians)
                x: x0,
                y: y0,
                z: z0,
                heading: h0,
                renderX: x0,
                renderZ: z0,
                renderHeading: h0,
                heave: y0,
                pitch: 0,
                roll: 0,
                pitchAngle: 0,
                rollAngle: 0,
                pitchVel: 0,
                rollVel: 0,
                heaveVel: 0,

                // Velocities
                vx: Math.sin(h0) * spdMps0,
                vz: Math.cos(h0) * spdMps0,
                vForward: spdMps0,
                vLateral: 0,
                forwardSpeedKmh: spdKmh0,
                lateralSpeedMs: 0,
                speedMps: spdMps0,
                speedMs: spdMps0,
                speedKmh: spdKmh0,
                peakSpeedKmh: spdKmh0,
                yawRate: 0,
                yawInertia,
                longitudinalAccelG: 0,
                lateralAccelG: 0,

                // Steering & Ackermann
                steerInput: 0,
                steerAngleRad: 0,
                steerAngleDeg: 0,
                steerLeftRad: 0,
                steerRightRad: 0,
                maxSteerDeg: 39.0,

                // Tire slip & grip
                slipAngleFront: 0,
                slipAngleRear: 0,
                chassisSlipAngle: 0,
                driftAngleRad: 0,
                pacejkaGrip: 0,
                pacejkaFront: 0,
                pacejkaRear: 0,
                lateralForceFront: 0,
                lateralForceRear: 0,
                longitudinalForceFront: 0,
                longitudinalForceRear: 0,
                wheelSlipRatio: 0,
                wheelLoads: {
                    fl: frontStaticN,
                    fr: frontStaticN,
                    rl: rearStaticN,
                    rr: rearStaticN
                },

                // Drift FSM (D_OUT, D_ENTER, D_IN, D_EXIT)
                driftState: 'D_OUT',
                driftValue: 0, // [0..1]
                isDrifting: false,
                isCounterSteering: false,
                driftAngleDeg: 0,
                driftScore: 0,
                driftCurrentScore: 0,
                driftCombo: 1,
                driftDuration: 0,

                // Powertrain & Gearbox
                gear: 1, // -1 = R, 0 = N, 1..N = forward gears
                rpm: p.idleRpm,
                engineTorqueNm: 0,
                wheelDriveTorqueNm: 0,
                clutchState: 'ENGAGED',
                clutchRatio: 1.0,
                shiftTimer: 0,
                turboSpool: 0,
                turboPsi: 0,
                reverseHoldTimer: 0,

                // Nitrous & Speedbreaker
                nitroLevel: nitro0,
                nitro: nitro0,
                nitroDepleted: nitro0 <= 0.2,
                isNitroActive: false,
                speedbreakerCharge: init.speedbreakerCharge !== undefined ? Number(init.speedbreakerCharge) : 100,
                isSpeedbreakerActive: false,
                timeScale: 1.0,

                // Surface, Weather & Drafting
                surface: init.surface || this.options.surface || 'asphalt',
                weather: init.weather || this.options.weather || 'dry',
                surfaceGrip: 1.0,
                weatherGrip: 1.0,
                effectiveGrip: 1.0,
                slipstreamFactor: 0,
                isDrafting: false,

                // Economy, Fuel & Damage
                distanceKm: 0,
                fuelCurrent: init.fuelCurrent !== undefined ? Number(init.fuelCurrent) : 45,
                fuelLitersUsed: 0,
                damageTaken: 0,
                collisionTimer: 0,
                wallContactSide: 0,
                isOnWall: false,
                time: 0
            };
        }

        reset(init = {}) {
            this.accumulator = 0;
            this.stepCount = 0;
            this._speedbreakerLatch = false;
            this.state = this._createInitialState(init);
            this.prevState = Object.assign({}, this.state);
            this.renderState = Object.assign({}, this.state);
            return this.state;
        }

        setSpeedbreaker(active) {
            const s = this.state;
            this._speedbreakerLatch = false;
            s.isSpeedbreakerActive = false;
            s.timeScale = 1.0;
            return false;
        }

        setWeather(weatherId) {
            this.options.weather = weatherId || 'dry';
            this.state.weather = this.options.weather;
        }

        setSurface(surfaceId) {
            this.options.surface = surfaceId || 'asphalt';
            this.state.surface = this.options.surface;
        }

        setTransmissionMode(mode) {
            this.options.transmissionMode = (mode === 'manual') ? 'manual' : 'auto';
        }

        shiftUp() {
            const s = this.state;
            const maxForwardGear = this.profile.gearRatios.length - 2; // index 0 is R, 1 is N
            if (s.gear < maxForwardGear && s.shiftTimer <= 0) {
                s.gear += 1;
                if (s.gear === 0) s.gear = 1;
                s.shiftTimer = this.mwSpec ? this.mwSpec.shiftTime : 0.11;
                s.clutchState = 'DISENGAGED';
                s.clutchRatio = 0.25;
                s.pitchVel += 0.25;
                return true;
            }
            return false;
        }

        shiftDown() {
            const s = this.state;
            if (s.gear > -1 && s.shiftTimer <= 0) {
                if (s.gear === 1 && s.vForward > 3.5) {
                    return false; // Prevent shifting into Reverse at forward speed
                }
                s.gear -= 1;
                if (s.gear === 0 && s.vForward <= 1.5) s.gear = -1;
                s.shiftTimer = this.mwSpec ? this.mwSpec.shiftTime : 0.08;
                s.clutchState = 'ENGAGING';
                s.clutchRatio = 0.45;
                return true;
            }
            return false;
        }

        /**
         * Fixed-timestep update with accumulator and render-state interpolation.
         * Guarantees identical physics behavior across 30, 60, 120, and 240 FPS.
         * Supports both update(dt, controls) and update(controls, dt).
         */
        update(arg1, arg2 = {}) {
            const isArg1Obj = (arg1 !== null && typeof arg1 === 'object');
            const dt = isArg1Obj ? arg2 : arg1;
            const controls = (isArg1Obj ? arg1 : arg2) || {};

            const clampedDt = clamp(Number(dt) || 0, 0, 0.25);
            if (clampedDt <= 0) return this.renderState;

            this.accumulator += clampedDt;
            let substeps = 0;
            while (this.accumulator >= FIXED_DT && substeps < MAX_SUBSTEPS) {
                this._copyPose(this.state, this.prevState);
                this.step(FIXED_DT, controls);
                this.accumulator -= FIXED_DT;
                substeps++;
            }
            if (substeps === MAX_SUBSTEPS && this.accumulator >= FIXED_DT) {
                this.accumulator = 0;
            }

            const alpha = clamp(this.accumulator / FIXED_DT, 0, 1);
            this._interpolateState(this.prevState, this.state, alpha, this.renderState);
            this._syncStateAliases(this.state, this.renderState);
            return this.renderState;
        }

        /**
         * Single deterministic physics step (normally FIXED_DT = 1/60s).
         * Supports both step(dt, controls) and step(controls, dt).
         */
        step(arg1 = FIXED_DT, arg2 = {}) {
            const isArg1Obj = (arg1 !== null && typeof arg1 === 'object');
            const dt = clamp(Number(isArg1Obj ? arg2 : arg1) || FIXED_DT, 0.0005, 0.1);
            const controls = (isArg1Obj ? arg1 : arg2) || {};

            const s = this.state;
            const p = this.profile;

            // 1. Parse normalized inputs
            const hasFuel = s.fuelCurrent === undefined || s.fuelCurrent > 0;
            const rawGas = hasFuel ? clamp(Number(controls.gas ? 1 : (controls.throttle || 0)), 0, 1) : 0;
            const rawBrake = clamp(Number(controls.brake ? 1 : (controls.brakeInput || 0)), 0, 1);
            const ebrake = clamp(Number((controls.handbrake || controls.drift || controls.ebrake) ? 1 : 0), 0, 1);
            let rawSteer = Number(controls.steer);
            if (!Number.isFinite(rawSteer)) {
                rawSteer = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
            }
            rawSteer = clamp(rawSteer, -1, 1);

            // Manual shift triggers
            if (controls.shiftUp) this.shiftUp();
            if (controls.shiftDown) this.shiftDown();

            // 2. Time scale (Speedbreaker disabled)
            this._speedbreakerLatch = false;
            s.isSpeedbreakerActive = false;
            s.timeScale = 1.0;
            const gameBreaker = 0.0;

            // 3. Surface & Weather continuous grip read (MWEncyclopedia Chapter 44)
            const surfPreset = SURFACE_PRESETS[controls.surface || s.surface] || SURFACE_PRESETS.asphalt;
            const weathPreset = WEATHER_PRESETS[controls.weather || s.weather] || WEATHER_PRESETS.dry;
            s.surface = surfPreset.id;
            s.weather = weathPreset.id;
            s.surfaceGrip = surfPreset.lateralGrip;
            s.weatherGrip = weathPreset.lateralGrip;
            const latGripMu = surfPreset.lateralGrip * weathPreset.lateralGrip;
            const driveGripMu = surfPreset.driveGrip * weathPreset.driveGrip;
            s.effectiveGrip = latGripMu * p.tireGripScale;

            // 4. Reverse / Forward gear transition logic (Brake-to-Reverse in Auto mode)
            let throttle = this.mwKernel && rawBrake > .1 ? 0 : rawGas;
            let brake = rawBrake;
            if (this.options.transmissionMode === 'auto') {
                if (s.gear === -1) {
                    if (rawGas > 0.1 && rawBrake < 0.1) {
                        // Pressing gas while in reverse slows down and switches back to 1st gear
                        if (s.vForward > -1.2) {
                            s.gear = 1;
                            s.reverseHoldTimer = 0;
                        } else {
                            throttle = 0;
                            brake = rawGas;
                        }
                    } else if (rawBrake > 0.1 && rawGas < 0.1) {
                        // Holding brake in reverse acts as reverse throttle
                        throttle = rawBrake;
                        brake = 0;
                    }
                } else {
                    if (s.vForward < 0.6 && rawBrake > 0.5 && rawGas < 0.1 && ebrake < 0.1) {
                        s.reverseHoldTimer += dt;
                        if (s.reverseHoldTimer >= 0.22) {
                            s.gear = -1;
                            throttle = rawBrake;
                            brake = 0;
                        }
                    } else {
                        s.reverseHoldTimer = 0;
                    }
                }
            }

            // 5. Nitrous (EngineRacer::DoNos — torque modifier + top speed boost)
            const canUseNitro = hasFuel && s.gear >= 1 && throttle > 0.2 && s.vForward > 2.2 && s.nitroLevel > 0.2;
            if (controls.nitro && canUseNitro) {
                s.isNitroActive = true;
                s.nitroLevel = Math.max(0, s.nitroLevel - p.nitroDrainRate * dt);
            } else {
                s.isNitroActive = false;
                if (!controls.nitro && hasFuel && s.speedKmh > 45) {
                    const rechargeMult = s.isDrifting ? 1.85 : 1.0;
                    s.nitroLevel = Math.min(100, s.nitroLevel + p.nitroRechargeRate * rechargeMult * dt);
                }
            }

            // 6. Speed-Sensitive Steering, Brake Boost, Rear-Slip Floor & Ackermann
            // (SuspensionRacer::DoHumanSteering, CalculateMaxSteering, Chassis::ComputeAckerman)
            const absFwdMps = Math.abs(s.vForward);
            const speedNorm = clamp(absFwdMps / 100.0, 0, 1); // 0..360 km/h
            let maxSteerDeg = this.mwKernel ? this.mwKernel.steeringRange(absFwdMps) : sampleTable(STEER_ANGLE_DEG_VS_SPEED, speedNorm);

            // Brake / Handbrake turn-in steering boost (BrakeSteeringRangeMultiplier)
            const brakeSteerBoost = 1.0 + (brake * 0.32 + ebrake * 0.45) * sampleTable(STEER_RATE_VS_SPEED, speedNorm);
            maxSteerDeg *= brakeSteerBoost;

            // Post-collision steering reduction (1.0s recovery window)
            if (s.collisionTimer > 0) {
                s.collisionTimer = Math.max(0, s.collisionTimer - dt);
                const recovery = 1.0 - s.collisionTimer * 0.45;
                maxSteerDeg *= clamp(recovery, 0.5, 1.0);
            }

            // Rear slip angle steering floor (CalculateMaxSteering lines 330-341):
            // Never let max steering angle drop below the rear slip angle when counter-steering!
            const rearSlipDeg = Math.abs(s.slipAngleRear) * RAD2DEG;
            const isCounterInput = (rawSteer * s.vLateral) > 0;
            if (isCounterInput && rearSlipDeg > maxSteerDeg) {
                maxSteerDeg = clamp(rearSlipDeg * 1.15, maxSteerDeg, 42.0);
            }

            // Speedbreaker instant steering range expansion (up to 55 deg)
            if (gameBreaker > 0) {
                maxSteerDeg = lerp(maxSteerDeg, 55.0, gameBreaker);
            }
            maxSteerDeg = clamp(maxSteerDeg, this.mwKernel ? 2.9 : 3.5, 55.0);
            s.maxSteerDeg = maxSteerDeg;

            const targetSteerDeg = rawSteer * maxSteerDeg;
            const steerSpeedDegPerSec = 195.0 * (this.mwKernel ? this.mwKernel.steeringRate(absFwdMps) : sampleTable(STEER_RATE_VS_SPEED, speedNorm)) * (isCounterInput ? 1.55 : 1.0);
            const maxStepDeg = steerSpeedDegPerSec * dt;
            s.steerAngleDeg = clamp(
                targetSteerDeg,
                s.steerAngleDeg - maxStepDeg,
                s.steerAngleDeg + maxStepDeg
            );
            s.steerAngleRad = s.steerAngleDeg * DEG2RAD;
            s.steerInput = rawSteer;

            // Ackermann geometry (Chassis::ComputeAckerman): inside wheel turns sharper than outside wheel
            const absSteerRad = Math.abs(s.steerAngleRad);
            const outsideSteerRad = (absSteerRad * p.wheelbase) / (absSteerRad * p.trackWidth + p.wheelbase);
            if (s.steerAngleRad >= 0) {
                // Turning Right: right wheel is inside, left wheel is outside
                s.steerRightRad = absSteerRad;
                s.steerLeftRad = outsideSteerRad;
            } else {
                // Turning Left: left wheel is inside, right wheel is outside
                s.steerLeftRad = -absSteerRad;
                s.steerRightRad = -outsideSteerRad;
            }

            // 7. Engine Torque Curve, Forced Induction, Clutch & Gearbox (EngineRacer)
            if (this.mwKernel) {
                // Gear change initiates engagement; original clutch ramp supplies
                // the torque interruption. Shift scheduling remains host policy.
                const clutch = this.mwKernel.clutch(s.shiftTimer > 0 ? 'ENGAGING' : 'ENGAGED', s.shiftTimer, this.mwSpec.shiftTime, dt);
                s.shiftTimer = clutch.time;
                s.clutchState = clutch.state;
                s.clutchRatio = clutch.ratio;
            } else if (s.shiftTimer > 0) {
                s.shiftTimer = Math.max(0, s.shiftTimer - dt);
                if (s.shiftTimer <= 0) {
                    s.clutchState = 'ENGAGED';
                    s.clutchRatio = 1.0;
                } else {
                    s.clutchState = 'ENGAGING';
                    s.clutchRatio = lerp(0.32, 1.0, 1.0 - s.shiftTimer / 0.11);
                }
            } else {
                s.clutchState = 'ENGAGED';
                s.clutchRatio = 1.0;
            }

            const gearIdx = clamp(s.gear + 1, 0, p.gearRatios.length - 1);
            const activeGearRatio = p.gearRatios[gearIdx] || p.gearRatios[2];
            const totalGearRatio = Math.abs(activeGearRatio) * p.finalDrive;

            // Wheel angular speed -> Engine RPM loop
            const wheelAngularVel = absFwdMps / p.wheelRadius;
            const wheelDrivenRpm = (wheelAngularVel * totalGearRatio * 60) / (2 * Math.PI);
            const launchFreeRevRpm = throttle * (p.peakTorqueRpm * 0.92);
            const targetRpm = clamp(
                Math.max(p.idleRpm, wheelDrivenRpm, absFwdMps < 6.0 ? launchFreeRevRpm : 0) + (s.isNitroActive ? 350 : 0),
                p.idleRpm,
                p.maxRpm
            );
            s.rpm = lerp(s.rpm, targetRpm, clamp(dt * 18.0, 0, 1));

            // Automatic transmission shift logic (Physics::Info::ShiftPoints & AutoShift)
            if (this.options.transmissionMode === 'auto' && s.gear >= 1 && s.shiftTimer <= 0) {
                const maxForwardGear = p.gearRatios.length - 2;
                const shiftUpRpm = this.mwSpec ? this.mwSpec.shifts.up[gearIdx] : p.redlineRpm * 0.94;
                const shiftDownRpm = this.mwSpec ? this.mwSpec.shifts.down[gearIdx] * .92 : p.idleRpm + (p.redlineRpm - p.idleRpm) * (throttle > 0.3 ? 0.42 : 0.28);
                if (s.rpm >= shiftUpRpm && s.gear < maxForwardGear && s.wheelSlipRatio < 0.45) {
                    this.shiftUp();
                } else if (s.rpm <= shiftDownRpm && s.gear > 1) {
                    this.shiftDown();
                }
            }

            // Forced induction spool (EngineRacer::DoInduction)
            if (p.inductionType === 'turbo') {
                const spoolThresholdRpm = p.idleRpm + (p.redlineRpm - p.idleRpm) * (p.spoolRpmRatio || 0.34);
                const wantSpool = (throttle > 0.25 && s.rpm >= spoolThresholdRpm && s.shiftTimer <= 0)
                    ? ramp(throttle, 0.2, 0.9) * ramp(s.rpm, spoolThresholdRpm, p.redlineRpm)
                    : 0;
                const spoolRate = wantSpool > s.turboSpool ? 2.8 : 4.5;
                s.turboSpool = clamp(s.turboSpool + (wantSpool - s.turboSpool) * spoolRate * dt, 0, 1);
                s.turboPsi = s.turboSpool * 18.5;
            } else if (p.inductionType === 'supercharger') {
                s.turboSpool = throttle * ramp(s.rpm, p.idleRpm, p.redlineRpm);
                s.turboPsi = s.turboSpool * 12.0;
            } else {
                s.turboSpool = 0;
                s.turboPsi = 0;
            }

            // Normalized engine torque curve (rises to peakTorqueRpm, tapers slightly to redline)
            const rpmSpan = Math.max(1000, p.redlineRpm - p.idleRpm);
            const rpmProgress = clamp((s.rpm - p.idleRpm) / rpmSpan, 0, 1.05);
            const peakNorm = clamp((p.peakTorqueRpm - p.idleRpm) / rpmSpan, 0.3, 0.85);
            let torqueShape;
            if (rpmProgress <= peakNorm) {
                torqueShape = 0.68 + 0.32 * Math.sin((rpmProgress / peakNorm) * (Math.PI * 0.5));
            } else {
                const over = (rpmProgress - peakNorm) / Math.max(0.15, 1.0 - peakNorm);
                torqueShape = 1.0 - 0.18 * clamp(over * over, 0, 1.2);
            }

            const inductionMult = 1.0 + (p.inductionBoost || 0) * s.turboSpool;
            const nosMult = s.isNitroActive ? p.nitroTorqueMult : 1.0;

            // ECU Top Speed Governor (EngineRacer::DoECU)
            const draftTopBonus = 1.0 + (s.slipstreamFactor || 0) * 0.06;
            const maxAllowedKmh = p.topSpeedKmh * (s.isNitroActive ? p.nitroTopSpeedMult : 1.0) * draftTopBonus;
            const maxAllowedMps = maxAllowedKmh / 3.6;
            let ecuCut = 1.0;
            if (s.gear >= 1 && absFwdMps > maxAllowedMps * 0.96) {
                ecuCut = 1.0 - ramp(absFwdMps, maxAllowedMps * 0.96, maxAllowedMps * 1.01);
            } else if (s.gear === -1 && absFwdMps > 22.0) {
                ecuCut = 1.0 - ramp(absFwdMps, 22.0, 25.0);
            }

            const curveTorque = this.mwKernel ? this.mwKernel.torque(this.mwSpec.engine, s.rpm) : p.baseTorqueNm * torqueShape;
            const grossEngineTorque = curveTorque * inductionMult * nosMult * throttle * ecuCut;
            const engineBrakingTorque = (throttle < 0.05 && absFwdMps > 1.0)
                ? -p.baseTorqueNm * 0.14 * (0.4 + 0.6 * rpmProgress)
                : 0;
            s.engineTorqueNm = grossEngineTorque + engineBrakingTorque;

            const gearDirection = s.gear < 0 ? -1 : (s.gear > 0 ? 1 : 0);
            const totalWheelDriveTorque = s.engineTorqueNm * totalGearRatio * 0.92 * s.clutchRatio * gearDirection;
            s.wheelDriveTorqueNm = totalWheelDriveTorque;

            // 8. Dynamic 4-Wheel Weight Transfer & Suspension (SuspensionRacer::DoWheelForces)
            // Aerodynamic downforce increases tire vertical load at high speed
            const forwardness = s.speedMps > 0.5 ? clamp(Math.abs(s.vForward) / s.speedMps, 0.4, 1.0) : 1.0;
            const aeroDownforceN = 0.5 * 1.225 * (p.downforceCoeff || 0.2) * 2.2 * (s.vForward * s.vForward) * Math.sqrt(forwardness);

            const totalWeightN = p.massKg * GRAVITY + aeroDownforceN;
            const longTransferN = clamp((p.massKg * (s.longitudinalAccelG * GRAVITY) * p.cgHeight) / p.wheelbase, -totalWeightN * 0.32, totalWeightN * 0.32);
            const latTransferN = clamp((p.massKg * (s.lateralAccelG * GRAVITY) * p.cgHeight) / p.trackWidth, -totalWeightN * 0.38, totalWeightN * 0.38);

            const frontAxleLoadN = clamp(totalWeightN * p.frontWeightBias - longTransferN, totalWeightN * 0.20, totalWeightN * 0.80);
            const rearAxleLoadN = clamp(totalWeightN * (1 - p.frontWeightBias) + longTransferN, totalWeightN * 0.20, totalWeightN * 0.80);

            const frontLatShift = latTransferN * p.rollBalance;
            const rearLatShift = latTransferN * (1 - p.rollBalance);

            // When turning right (lateralAccelG > 0), left (outside) wheels gain load and right (inside) wheels lose load
            s.wheelLoads.fl = clamp(frontAxleLoadN * 0.5 + frontLatShift, 400, totalWeightN * 0.65);
            s.wheelLoads.fr = clamp(frontAxleLoadN * 0.5 - frontLatShift, 400, totalWeightN * 0.65);
            s.wheelLoads.rl = clamp(rearAxleLoadN * 0.5 + rearLatShift, 400, totalWeightN * 0.65);
            s.wheelLoads.rr = clamp(rearAxleLoadN * 0.5 - rearLatShift, 400, totalWeightN * 0.65);

            // 9. Drivetrain Torque Split (FWD vs RWD vs AWD) & Braking Forces
            const frontShare = p.torqueSplit;       // 1.0 = FWD, 0.0 = RWD, 0.25..0.45 = AWD
            const rearShare = 1.0 - p.torqueSplit;

            const totalDriveForceN = totalWheelDriveTorque / p.wheelRadius;
            let fxDriveFront = totalDriveForceN * frontShare;
            let fxDriveRear = totalDriveForceN * rearShare;

            // Foot brake & Handbrake (ebrake applies strictly to rear axle, SuspensionRacer::TuneWheelParams)
            const velSign = Math.abs(s.vForward) > 0.25 ? Math.sign(s.vForward) : 0;
            const maxBrakeDecelForce = p.massKg * GRAVITY * 1.38;
            const fxBrakeFront = -velSign * brake * maxBrakeDecelForce * 0.64;
            const fxBrakeRear = -velSign * (brake * maxBrakeDecelForce * 0.36 + ebrake * p.massKg * GRAVITY * 0.95);

            // Cut rear drive torque when pulling handbrake unless doing a power drift
            if (ebrake > 0.2) {
                fxDriveRear *= 0.15;
            }

            let fxFront = fxDriveFront + fxBrakeFront;
            let fxRear = fxDriveRear + fxBrakeRear;

            // 10. Slip Angles, Drift State Machine & Tire Lateral Forces
            const Lf = p.wheelbase * (1 - p.frontWeightBias);
            const Lr = p.wheelbase * p.frontWeightBias;
            const effFwdSpeed = Math.max(2.2, Math.abs(s.vForward));
            const fwdDirSign = s.vForward >= -0.1 ? 1.0 : -1.0;
            // Gate lateral slip by wheel rolling velocity so a parked car cannot turn or slide in place
            const rollingActivity = clamp(Math.hypot(s.vForward, s.vLateral) / 1.5, 0, 1);

            // Slip angles at front and rear axles (radians)
            const vLatFront = s.vLateral + Lf * s.yawRate;
            const vLatRear = s.vLateral - Lr * s.yawRate;
            s.slipAngleFront = ((s.steerAngleRad * fwdDirSign) - Math.atan2(vLatFront, effFwdSpeed)) * rollingActivity;
            s.slipAngleRear = -Math.atan2(vLatRear, effFwdSpeed) * rollingActivity;
            s.chassisSlipAngle = Math.atan2(s.vLateral, effFwdSpeed) * rollingActivity;

            // NFS MW Drift State Machine (SuspensionRacer::DoDrifting)
            const chassisSlipDeg = Math.abs(s.chassisSlipAngle) * RAD2DEG;
            s.driftAngleDeg = chassisSlipDeg;
            const isAboveDriftSpeed = s.speedKmh > 38;
            if (isAboveDriftSpeed && (ebrake > 0.4 || chassisSlipDeg > 9.0)) {
                s.driftState = (s.driftValue > 0.35) ? 'D_IN' : 'D_ENTER';
                s.driftValue = clamp(s.driftValue + 6.5 * dt, 0, 1);
            } else {
                s.driftState = (s.driftValue > 0.05) ? 'D_EXIT' : 'D_OUT';
                s.driftValue = clamp(s.driftValue - 2.4 * dt, 0, 1);
            }
            s.isDrifting = s.driftValue > 0.18 && s.speedKmh > 32 && chassisSlipDeg > 5.5;
            s.isCounterSteering = s.isDrifting && ((rawSteer * s.vLateral) > 0.05);

            // Nominal axle load for load sensitivity
            const nominalAxleLoad = (p.massKg * GRAVITY) * 0.5;
            const effFrontLoad = computeEffectiveTireLoad(frontAxleLoadN, nominalAxleLoad);
            const effRearLoad = computeEffectiveTireLoad(rearAxleLoadN, nominalAxleLoad);

            // Pacejka normalized lateral curves (genuinely driving lateral forces!)
            const frontGameBreakerBoost = gameBreaker > 0 ? (1.0 + Math.abs(rawSteer) * 0.65 * gameBreaker) : 1.0;
            const pacejkaFront = computePacejkaNormalized(s.slipAngleFront, latGripMu, 1.05 * frontGameBreakerBoost);
            const pacejkaRear = computePacejkaNormalized(s.slipAngleRear, latGripMu, 1.00);
            s.pacejkaFront = pacejkaFront;
            s.pacejkaRear = pacejkaRear;
            s.pacejkaGrip = (pacejkaFront + pacejkaRear) * 0.5;

            // Maximum friction circle budgets per axle
            const maxGripFrontN = effFrontLoad * p.tireGripScale * 1.38 * frontGameBreakerBoost;
            let rearDriftGripMult = 1.0;
            if (ebrake > 0.2) {
                // Handbrake breaks rear lateral traction (DriftRearFrictionTable)
                rearDriftGripMult *= (1.0 - 0.52 * ebrake);
            }
            if (s.driftValue > 0) {
                // Controlled drift rear grip scaling: allows sustained slides while counter-steer restores bite
                const driftSlideFactor = clamp(0.72 + (s.isCounterSteering ? 0.22 : -0.08 * s.driftValue) * (p.driftFactor / 1.4), 0.52, 0.98);
                rearDriftGripMult *= driftSlideFactor;
            }
            // NFS MW PilotFactor & YawFrictionBoost at speed when not pulling ebrake
            if (ebrake < 0.1 && s.speedKmh > 50) {
                const yawBoost = 1.0 + clamp(Math.abs(s.chassisSlipAngle) * 0.35, 0, 0.22);
                rearDriftGripMult *= yawBoost;
            }
            const maxGripRearN = effRearLoad * p.tireGripScale * 1.38 * rearDriftGripMult;

            // Raw lateral forces from Pacejka curve
            let fyFront = pacejkaFront * maxGripFrontN;
            let fyRear = pacejkaRear * maxGripRearN;
            if (this.mwKernel) {
                // Evaluate both loaded tires, rather than treating the entire
                // axle as one tire: the source's load curve is nonlinear.
                const tire = this.mwKernel.tireForce;
                fyFront = (tire(s.wheelLoads.fl, s.slipAngleFront, p.tireGripScale) + tire(s.wheelLoads.fr, s.slipAngleFront, p.tireGripScale)) * latGripMu * frontGameBreakerBoost;
                fyRear = (tire(s.wheelLoads.rl, s.slipAngleRear, p.tireGripScale) + tire(s.wheelLoads.rr, s.slipAngleRear, p.tireGripScale)) * latGripMu * rearDriftGripMult;
            }

            // 11. Friction Circle / Ellipse Coupling (SuspensionRacer::Tire::UpdateLoaded)
            // Couples longitudinal drive/brake force with lateral cornering force!
            // - On FWD: heavy front drive torque consumes front friction circle -> understeer in corners.
            // - On RWD: heavy rear drive torque consumes rear friction circle -> power oversteer!
            // - On AWD: balanced split keeps both axles inside the friction ellipse longer.
            const frontMaxTotal = Math.max(100, maxGripFrontN * driveGripMu);
            const frontDriveUsage = clamp(Math.abs(fxDriveFront) / frontMaxTotal, 0, 0.95);
            if (p.drivetrain === 'FWD' && throttle > 0.3 && Math.abs(s.steerAngleRad) > 0.03) {
                // FWD torque understeer: front drive torque reduces front lateral cornering bite
                fyFront *= (1.0 - 0.34 * frontDriveUsage);
            }
            const frontTotalForce = Math.hypot(fxFront / 1.35, fyFront);
            if (frontTotalForce > frontMaxTotal) {
                const scaleF = frontMaxTotal / frontTotalForce;
                fxFront *= scaleF;
                fyFront *= scaleF;
            }

            const rearMaxTotal = Math.max(100, maxGripRearN * driveGripMu);
            const rearDriveUsage = clamp(Math.abs(fxDriveRear) / rearMaxTotal, 0, 1.25);
            if (p.drivetrain === 'RWD' && throttle > 0.45 && (Math.abs(s.steerAngleRad) > 0.035 || s.driftValue > 0.1)) {
                // RWD power oversteer: excess rear torque breaks rear lateral traction smoothly
                const oversteerCut = clamp(rearDriveUsage * 0.42 * (p.driftFactor / 1.4), 0, 0.48);
                fyRear *= (1.0 - oversteerCut);
            }
            const rearTotalForce = Math.hypot(fxRear / 1.35, fyRear);
            let rearSlip = 0;
            if (rearTotalForce > rearMaxTotal) {
                const scaleR = rearMaxTotal / rearTotalForce;
                rearSlip = (rearTotalForce - rearMaxTotal) / rearMaxTotal;
                fxRear *= scaleR;
                fyRear *= scaleR;
            }
            s.wheelSlipRatio = clamp(Math.max(frontDriveUsage * 0.3, rearSlip), 0, 1.5);

            s.lateralForceFront = fyFront;
            s.lateralForceRear = fyRear;
            s.longitudinalForceFront = fxFront;
            s.longitudinalForceRear = fxRear;

            // 12. Aerodynamic Drag & Rolling Resistance (Chassis::DoAerodynamics)
            const offThrottleFactor = 1.0 + (1.0 - throttle) * 0.85; // OffThrottleDragFactor
            const draftDragReduction = 1.0 - clamp(s.slipstreamFactor || 0, 0, 1) * 0.42;
            const aeroDragForce = -Math.sign(s.vForward) * 0.5 * 1.225 * (p.dragCoeff || 0.32) * 2.15 * (s.vForward * s.vForward) * offThrottleFactor * draftDragReduction;
            const rollingForce = -Math.sign(s.vForward) * (p.massKg * GRAVITY * 0.015 * surfPreset.rollingResistance);

            // Cornering scrub drag (sin(slipAngle) projection of front lateral force)
            const cornerScrubForce = -Math.sin(s.steerAngleRad) * fyFront * 0.28;

            // 13. Rigid-Body Planar Force & Yaw Torque Integration (Physics::IntegrateMotion)
            const totalFxBody = fxFront * Math.cos(s.steerAngleRad) + fxRear + aeroDragForce + rollingForce + cornerScrubForce;
            const totalFyBody = fyFront * Math.cos(s.steerAngleRad) + fyRear;

            const prevVForward = s.vForward;
            const prevVLateral = s.vLateral;

            // Body-frame equations of motion:
            // dv_fwd/dt = F_x / m + v_lat * yawRate * (1 - arcadeForwardPreserve)
            // dv_lat/dt = F_y / m - v_fwd * yawRate
            const axBody = (totalFxBody / p.massKg) + (s.vLateral * s.yawRate * 0.35);
            const ayBody = (totalFyBody / p.massKg) - (s.vForward * s.yawRate);

            s.vForward += axBody * dt;
            s.vLateral += ayBody * dt;

            // Stop cleanly near zero when no throttle is applied
            if (throttle < 0.02 && (brake > 0.1 || ebrake > 0.1 || Math.abs(s.vForward) < 0.35)) {
                if (Math.abs(s.vForward) < 0.45 && Math.sign(s.vForward) !== Math.sign(prevVForward || 1)) {
                    s.vForward = 0;
                } else if (Math.abs(s.vForward) < 0.22 && throttle < 0.01) {
                    s.vForward = 0;
                }
            }
            if (Math.abs(s.vForward) < 0.3 && Math.abs(s.vLateral) < 0.35) {
                s.vLateral *= Math.max(0, 1 - 18.0 * dt);
                if (Math.abs(s.vLateral) < 0.02) s.vLateral = 0;
            }

            // Yaw Moment (tau_yaw = Lf * Fy_front - Lr * Fy_rear + EBrake180 + DriftStabilizer)
            let yawTorque = (Lf * fyFront * Math.cos(s.steerAngleRad) - Lr * fyRear) * (p.yawSpeedMult || 1.15);

            // EBrake180 initiation torque when pulling handbrake & steering at moderate speeds
            if (ebrake > 0.3 && Math.abs(rawSteer) > 0.15 && s.speedKmh > 25 && s.speedKmh < 160 && Math.abs(s.chassisSlipAngle) < 0.65) {
                yawTorque += rawSteer * fwdDirSign * p.massKg * 5.2 * ebrake;
            }

            // RWD power-oversteer yaw moment under throttle in corners
            if (p.drivetrain === 'RWD' && throttle > 0.55 && Math.abs(rawSteer) > 0.2 && s.speedKmh > 30 && s.speedKmh < 190) {
                const powerYaw = Math.sign(s.steerAngleRad) * (p.baseTorqueNm * 1.8) * (p.driftFactor / 1.5);
                if (Math.abs(s.chassisSlipAngle) < 0.72) {
                    yawTorque += powerYaw * throttle;
                }
            }

            // AWD front-pull vectoring stabilization when counter-steering under throttle
            if (p.drivetrain === 'AWD' && throttle > 0.3 && s.isDrifting) {
                yawTorque -= s.chassisSlipAngle * p.massKg * 6.5 * throttle;
            }

            // NFS MW DriftStabilizerTable: damp yaw rate when yaw opposes slip angle or exceeds safe drift envelope
            const baseYawDamping = -s.yawRate * s.yawInertia * (s.isDrifting ? 2.6 : 4.2);
            let stabilizerTorque = 0;
            if ((s.yawRate * s.chassisSlipAngle) < 0 || Math.abs(s.chassisSlipAngle) > 0.55) {
                stabilizerTorque = -s.yawRate * s.yawInertia * 4.8 * (0.4 + s.driftValue * 0.6);
            }
            if (this.options.stabilityAssist && Math.abs(rawSteer) < 0.05 && ebrake < 0.1) {
                // Straight-line alignment damping
                stabilizerTorque -= s.yawRate * s.yawInertia * 5.5;
                s.vLateral *= Math.max(0, 1 - 5.2 * latGripMu * dt);
            }

            const angularAccel = (yawTorque + baseYawDamping + stabilizerTorque) / s.yawInertia;
            s.yawRate += angularAccel * dt;
            if (s.speedMps < 0.4) {
                s.yawRate *= Math.max(0, 1 - 20.0 * dt);
                if (Math.abs(s.yawRate) < 0.005) s.yawRate = 0;
            }

            // Integrate heading and world position (x, z)
            s.heading = wrapAngle(s.heading + s.yawRate * dt);

            const sinH = Math.sin(s.heading);
            const cosH = Math.cos(s.heading);
            // Forward = (sinH, cosH), Right = (cosH, -sinH)
            s.vx = sinH * s.vForward + cosH * s.vLateral;
            s.vz = cosH * s.vForward - sinH * s.vLateral;

            s.x += s.vx * dt;
            s.z += s.vz * dt;

            s.speedMps = Math.hypot(s.vForward, s.vLateral);
            s.speedKmh = s.speedMps * 3.6;
            if (s.speedKmh > s.peakSpeedKmh) s.peakSpeedKmh = s.speedKmh;

            // Compute G-forces for next step weight transfer & visual chassis pitch/roll
            s.longitudinalAccelG = clamp(((s.vForward - prevVForward) / dt) / GRAVITY, -2.5, 2.5);
            s.lateralAccelG = clamp((((s.vLateral - prevVLateral) / dt) + s.vForward * s.yawRate) / GRAVITY, -2.5, 2.5);

            // 14. Visual Chassis Pitch, Roll & Vertical Heave (2nd-order Spring-Damper)
            // Nose dives (+pitch) under braking, squats (-pitch) under acceleration
            const targetPitch = clamp(-s.longitudinalAccelG * 0.048, -0.068, 0.075);
            const pitchAccel = (targetPitch - s.pitch) * 52.0 - s.pitchVel * 11.5;
            s.pitchVel += pitchAccel * dt;
            s.pitch = clamp(s.pitch + s.pitchVel * dt, -0.075, 0.082);

            // Body leans away from cornering acceleration
            const targetRoll = clamp(s.lateralAccelG * 0.052, -0.075, 0.075);
            const rollAccel = (targetRoll - s.roll) * 56.0 - s.rollVel * 12.0;
            s.rollVel += rollAccel * dt;
            s.roll = clamp(s.roll + s.rollVel * dt, -0.082, 0.082);

            // Road surface micro-undulation & curb vibration
            const distMeters = s.distanceKm * 1000;
            const targetY = Math.sin(distMeters * 0.25) * surfPreset.bumpAmp * clamp(s.speedKmh / 60, 0, 1)
                - clamp((aeroDownforceN / 8000) * 0.025, 0, 0.032);
            const heaveAccel = (targetY - s.y) * 120.0 - s.heaveVel * 16.0;
            s.heaveVel += heaveAccel * dt;
            s.y = clamp(s.y + s.heaveVel * dt, -0.06, 0.08);

            // 15. Drift Scoring & Fuel / Distance Integration
            if (s.isDrifting) {
                s.driftDuration += dt;
                s.driftCombo = Math.min(10, 1 + Math.floor(s.driftDuration / 1.8));
                const csBonus = s.isCounterSteering ? 1.5 : 1.0;
                const pts = (s.speedKmh * 0.35) * (chassisSlipDeg / 18.0) * s.driftCombo * csBonus * dt * 15;
                s.driftCurrentScore += pts;
                s.driftScore += pts;
            } else if (s.driftValue <= 0.05) {
                s.driftDuration = 0;
                s.driftCurrentScore = 0;
                s.driftCombo = 1;
            }

            if (s.speedKmh > 1.0) {
                s.distanceKm += (Math.abs(s.vForward) * dt) / 1000;
            }

            // Fuel consumption via NomeraRaceEconomy if available
            const ecoApi = (typeof root !== 'undefined' && root.NomeraRaceEconomy) ? root.NomeraRaceEconomy : null;
            if (ecoApi && typeof ecoApi.fuelForFrame === 'function') {
                const burned = ecoApi.fuelForFrame({
                    speed: s.speedKmh,
                    seconds: dt,
                    consumption: p.fuelConsumption,
                    gas: throttle > 0.1,
                    nitro: s.isNitroActive,
                    drafting: s.isDrafting
                });
                s.fuelLitersUsed += burned;
                if (s.fuelCurrent !== undefined) {
                    s.fuelCurrent = Math.max(0, s.fuelCurrent - burned);
                }
            }

            s.isOnWall = false;
            s.time += dt;
            this.stepCount++;
            this._syncStateAliases(s, s);
            return s;
        }

        _syncStateAliases(s, renderSrc) {
            const r = renderSrc || s;
            s.renderX = r.x;
            s.renderZ = r.z;
            s.renderHeading = r.heading;
            s.heave = r.y;
            s.pitchAngle = -s.pitch;
            s.rollAngle = s.roll;
            s.speedMs = s.speedMps;
            s.forwardSpeedKmh = s.vForward * 3.6;
            s.lateralSpeedMs = s.vLateral;
            s.nitro = s.nitroLevel;
            s.nitroDepleted = s.nitroLevel <= 0.2;
            s.driftAngleRad = s.chassisSlipAngle;
        }

        /**
         * Rigid-body wall / barrier collision response (inspired by RBVehicle::ModifyCollision & SuspensionRacer::DoWallSteer).
         * Supports both object `{ normalX, normalZ, penetration, restitution }` and positional `(normalX, normalZ, penetration, restitution)`.
         */
        resolveWallCollision(contactOrNx = {}, argNz = 0, argPen = 0, argRestitution = 0.20) {
            const s = this.state;
            const isPositional = typeof contactOrNx === 'number';
            const contact = isPositional
                ? { normalX: contactOrNx, normalZ: argNz, penetration: argPen, restitution: argRestitution }
                : (contactOrNx || {});

            const nx = Number(contact.normalX) || 0;
            const nz = Number(contact.normalZ) || 0;
            const nLen = Math.hypot(nx, nz);
            if (nLen < 1e-5) return isPositional ? 0 : null;

            const unx = nx / nLen;
            const unz = nz / nLen;
            const pen = Math.max(0, Number(contact.penetration) || 0);

            // 1. Positional depenetration
            if (pen > 0) {
                s.x += unx * pen;
                s.z += unz * pen;
            }

            // 2. Decompose world velocity into normal and tangent components
            const vn = s.vx * unx + s.vz * unz;
            const tx = -unz;
            const tz = unx;
            const vt = s.vx * tx + s.vz * tz;

            const closingSpeedMps = Math.max(0, -vn);
            const restitution = clamp(Number(contact.restitution ?? 0.20), 0, 0.6);
            const wallFriction = clamp(Number(contact.friction ?? 0.16), 0.02, 0.6);

            const newVn = vn < 0 ? -vn * restitution : vn;
            const scrapeLoss = Math.min(Math.abs(vt), closingSpeedMps * wallFriction + Math.abs(vt) * 0.06);
            const newVt = vt - Math.sign(vt) * scrapeLoss;

            s.vx = unx * newVn + tx * newVt;
            s.vz = unz * newVn + tz * newVt;

            // 3. Head-on angular damping & tangential alignment (RBVehicle::ModifyCollision & DoWallSteer)
            const fwdX = Math.sin(s.heading);
            const fwdZ = Math.cos(s.heading);
            const noseDot = -(fwdX * unx + fwdZ * unz); // +1 = dead head-on into wall

            if (noseDot > 0.15 && noseDot < 0.92) {
                // Align heading smoothly toward wall tangent in direction of motion
                const tangentDir = (fwdX * tx + fwdZ * tz) >= 0 ? 1 : -1;
                const wallHeading = Math.atan2(tx * tangentDir, tz * tangentDir);
                s.heading = lerpAngle(s.heading, wallHeading, 0.28);
            }
            // Dampen violent spin on wall impact (Tweak_HeadOnDamp)
            s.yawRate *= 0.35;

            // DoWallSteer assist: if player is steering away from wall while pressing throttle, give a nose-out nudge
            if (Math.abs(s.steerInput) > 0.2) {
                const rightX = Math.cos(s.heading);
                const rightZ = -Math.sin(s.heading);
                const steerWorldDotNormal = (rightX * unx + rightZ * unz) * s.steerInput;
                if (steerWorldDotNormal > 0) {
                    s.yawRate += s.steerInput * 0.85;
                }
            }

            // Recompute body-frame velocities from updated world velocity and heading
            const sinH = Math.sin(s.heading);
            const cosH = Math.cos(s.heading);
            s.vForward = s.vx * sinH + s.vz * cosH;
            s.vLateral = s.vx * cosH - s.vz * sinH;
            s.speedMps = Math.hypot(s.vForward, s.vLateral);
            s.speedKmh = s.speedMps * 3.6;

            const impactSeverity = clamp(closingSpeedMps / 25.0, 0.05, 1.0);
            s.damageTaken = clamp(s.damageTaken + impactSeverity * 8.5, 0, 100);
            s.collisionTimer = Math.max(s.collisionTimer, 0.35 * impactSeverity);
            s.wallContactSide = contact.wallSide || 0;
            s.isOnWall = true;

            if (impactSeverity > 0.25 && s.isDrifting) {
                s.isDrifting = false;
                s.driftValue = 0;
                s.driftCurrentScore = 0;
                s.driftCombo = 1;
            }

            this._syncStateAliases(s, s);

            if (isPositional) {
                return Math.max(closingSpeedMps, pen > 0 ? 0.1 : 0);
            }
            return {
                closingSpeedMps,
                impactSeverity,
                damageAdded: impactSeverity * 8.5
            };
        }

        /**
         * Rigid-body vehicle-to-vehicle impulse collision response (inspired by CollisionReactionRecord).
         * Supports both `resolveVehicleCollision(otherVehicle, options)` and `resolveVehicleCollision(otherVehicle, nx, nz, overlap, restitution)`.
         */
        resolveVehicleCollision(otherVehicle, optionsOrNx = {}, argNz = 0, argOverlap = 0, argRestitution = 0.32) {
            if (!otherVehicle) return null;
            const sA = this.state;
            const sB = otherVehicle.state || otherVehicle;
            const isPositional = typeof optionsOrNx === 'number';
            const options = isPositional ? {} : (optionsOrNx || {});

            const dx = sA.x - sB.x;
            const dz = sA.z - sB.z;
            const dist = Math.hypot(dx, dz);
            const minSep = isPositional ? (dist + Math.max(0.01, Number(argOverlap) || 0)) : (Number(options.minSeparation) || 2.35);
            if (!isPositional && (dist >= minSep || dist < 1e-5)) return false;

            const nx = dist > 1e-5 ? (dx / dist) : (isPositional ? -optionsOrNx : 1);
            const nz = dist > 1e-5 ? (dz / dist) : (isPositional ? -argNz : 0);
            const penetration = isPositional ? Math.max(0.01, Number(argOverlap) || 0.1) : (minSep - dist);

            // Player gets a stability mass advantage in Speedbreaker (CollisionReactionRecord MassScale)
            const massA = this.profile.massKg * (sA.isSpeedbreakerActive ? 2.2 : 1.15);
            const massB = (otherVehicle.profile ? otherVehicle.profile.massKg : (Number(sB.massKg) || 1350));
            const invMassA = 1 / massA;
            const invMassB = 1 / massB;
            const totalInvMass = invMassA + invMassB;

            // Separate overlapping bodies proportionally to inverse mass
            sA.x += nx * penetration * (invMassA / totalInvMass);
            sA.z += nz * penetration * (invMassA / totalInvMass);
            sB.x -= nx * penetration * (invMassB / totalInvMass);
            sB.z -= nz * penetration * (invMassB / totalInvMass);

            const bVx = Number.isFinite(sB.vx) ? sB.vx : Math.sin(sB.heading || 0) * ((sB.speedKmh || 0) / 3.6);
            const bVz = Number.isFinite(sB.vz) ? sB.vz : Math.cos(sB.heading || 0) * ((sB.speedKmh || 0) / 3.6);

            const rvx = sA.vx - bVx;
            const rvz = sA.vz - bVz;
            const velAlongNormal = rvx * nx + rvz * nz;

            let impulseMag = 0;
            if (velAlongNormal < 0) {
                const restitution = isPositional ? clamp(Number(argRestitution) || 0.32, 0.1, 0.6) : 0.32;
                impulseMag = -(1 + restitution) * velAlongNormal / totalInvMass;
                const ix = impulseMag * nx;
                const iz = impulseMag * nz;

                sA.vx += ix * invMassA;
                sA.vz += iz * invMassA;
                sB.vx = bVx - ix * invMassB;
                sB.vz = bVz - iz * invMassB;
            } else {
                // Mild push apart even if already separating slowly
                const push = 3.5;
                sA.vx += nx * push * (invMassA / totalInvMass);
                sA.vz += nz * push * (invMassA / totalInvMass);
                sB.vx = bVx - nx * push * (invMassB / totalInvMass);
                sB.vz = bVz - nz * push * (invMassB / totalInvMass);
            }

            // Reproject A body velocities
            const sinHA = Math.sin(sA.heading);
            const cosHA = Math.cos(sA.heading);
            sA.vForward = sA.vx * sinHA + sA.vz * cosHA;
            sA.vLateral = sA.vx * cosHA - sA.vz * sinHA;
            sA.speedMps = Math.hypot(sA.vForward, sA.vLateral);
            sA.speedKmh = sA.speedMps * 3.6;

            // Reproject B body velocities if B is a full physics state
            if (typeof sB.heading === 'number') {
                const sinHB = Math.sin(sB.heading);
                const cosHB = Math.cos(sB.heading);
                sB.vForward = sB.vx * sinHB + sB.vz * cosHB;
                sB.vLateral = sB.vx * cosHB - sB.vz * sinHB;
                sB.speedMps = Math.hypot(sB.vForward, sB.vLateral);
                sB.speedKmh = sB.speedMps * 3.6;
            }

            const closingSpeed = Math.max(0, -velAlongNormal);
            const severity = clamp(closingSpeed / 22.0, 0.08, 1.0);
            sA.damageTaken = clamp(sA.damageTaken + severity * 6.0, 0, 100);
            sA.yawRate = clamp(sA.yawRate + (nx * cosHA - nz * sinHA) * severity * 0.65, -3.5, 3.5);

            this._syncStateAliases(sA, sA);
            if (otherVehicle && typeof otherVehicle._syncStateAliases === 'function') {
                otherVehicle._syncStateAliases(sB, sB);
            }

            if (isPositional) {
                return Math.max(0.5, closingSpeed);
            }
            return true;
        }

        // Convenience getters/setters delegating to `this.state`
        get x() { return this.state.x; }
        set x(v) { this.state.x = Number(v) || 0; this.state.renderX = this.state.x; }
        get y() { return this.state.y; }
        set y(v) { this.state.y = Number(v) || 0; this.state.heave = this.state.y; }
        get z() { return this.state.z; }
        set z(v) { this.state.z = Number(v) || 0; this.state.renderZ = this.state.z; }
        get vx() { return this.state.vx; }
        set vx(v) {
            this.state.vx = Number(v) || 0;
            const sinH = Math.sin(this.state.heading);
            const cosH = Math.cos(this.state.heading);
            this.state.vForward = this.state.vx * sinH + this.state.vz * cosH;
            this.state.vLateral = this.state.vx * cosH - this.state.vz * sinH;
            this.state.speedMps = Math.hypot(this.state.vForward, this.state.vLateral);
            this.state.speedKmh = this.state.speedMps * 3.6;
        }
        get vz() { return this.state.vz; }
        set vz(v) {
            this.state.vz = Number(v) || 0;
            const sinH = Math.sin(this.state.heading);
            const cosH = Math.cos(this.state.heading);
            this.state.vForward = this.state.vx * sinH + this.state.vz * cosH;
            this.state.vLateral = this.state.vx * cosH - this.state.vz * sinH;
            this.state.speedMps = Math.hypot(this.state.vForward, this.state.vLateral);
            this.state.speedKmh = this.state.speedMps * 3.6;
        }
        get heading() { return this.state.heading; }
        set heading(v) { this.state.heading = Number(v) || 0; this.state.renderHeading = this.state.heading; }
        get speedKmh() { return this.state.speedKmh; }
        get forwardSpeedKmh() { return this.state.vForward * 3.6; }
        get lateralSpeedMs() { return this.state.vLateral; }
        get gear() { return this.state.gear; }
        get rpm() { return this.state.rpm; }
        get yawRate() { return this.state.yawRate; }
        get pitchAngle() { return -this.state.pitch; }
        get rollAngle() { return this.state.roll; }
        get isDrifting() { return this.state.isDrifting; }
        get driftState() { return this.state.driftState; }
        get driftAngleDeg() { return this.state.driftAngleDeg; }
        get driftScore() { return this.state.driftScore; }
        get isCounterSteering() { return this.state.isCounterSteering; }
        get distanceKm() { return this.state.distanceKm; }
        get nitroLevel() { return this.state.nitroLevel; }
        get speedbreakerCharge() { return this.state.speedbreakerCharge; }
        get isSpeedbreakerActive() { return this.state.isSpeedbreakerActive; }

        _copyPose(src, dst) {
            dst.x = src.x;
            dst.y = src.y;
            dst.z = src.z;
            dst.heading = src.heading;
            dst.pitch = src.pitch;
            dst.roll = src.roll;
            dst.speedKmh = src.speedKmh;
            dst.rpm = src.rpm;
            dst.steerAngleRad = src.steerAngleRad;
            dst.steerAngleDeg = src.steerAngleDeg;
        }

        _interpolateState(prev, curr, alpha, out) {
            Object.assign(out, curr);
            out.x = lerp(prev.x, curr.x, alpha);
            out.y = lerp(prev.y, curr.y, alpha);
            out.z = lerp(prev.z, curr.z, alpha);
            out.heading = lerpAngle(prev.heading, curr.heading, alpha);
            out.pitch = lerp(prev.pitch, curr.pitch, alpha);
            out.roll = lerp(prev.roll, curr.roll, alpha);
            out.speedKmh = lerp(prev.speedKmh, curr.speedKmh, alpha);
            out.rpm = lerp(prev.rpm, curr.rpm, alpha);
            out.steerAngleRad = lerp(prev.steerAngleRad, curr.steerAngleRad, alpha);
            out.steerAngleDeg = lerp(prev.steerAngleDeg, curr.steerAngleDeg, alpha);
            out.interpolationAlpha = alpha;
            this._syncStateAliases(out, out);
        }

        getState() {
            return this.state;
        }

        getRenderState() {
            return this.renderState;
        }
    }

    function detectDrivetrain(carOrName) {
        return resolveVehicleProfile(carOrName).drivetrain;
    }

    function computeSteeringLimitRad(speedKmh = 0) {
        const speedNorm = clamp((Math.abs(Number(speedKmh) || 0) / 3.6) / 100.0, 0, 1);
        return sampleTable(STEER_ANGLE_DEG_VS_SPEED, speedNorm) * DEG2RAD;
    }

    function computeWeatherGripMultiplier(weatherId = 'dry', surfaceId = 'asphalt') {
        const w = WEATHER_PRESETS[weatherId] || WEATHER_PRESETS.dry;
        const s = SURFACE_PRESETS[surfaceId] || SURFACE_PRESETS.asphalt;
        return Number((w.lateralGrip * s.lateralGrip).toFixed(4));
    }

    return {
        FIXED_DT,
        MAX_SUBSTEPS,
        SURFACE_PRESETS,
        WEATHER_PRESETS,
        VEHICLE_PROFILES,
        resolveVehicleProfile,
        buildVehicleSpec: resolveVehicleProfile,
        detectDrivetrain,
        computeSteeringLimitRad,
        computePacejkaNormalized,
        tireLateralForce: computePacejkaNormalized,
        computeEffectiveTireLoad,
        computeWeatherGripMultiplier,
        NfsVehiclePhysics
    };
}));

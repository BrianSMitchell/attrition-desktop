"use strict";
// Universe Overhaul: shared data tables and computation helpers
// Implements star kinds, planetary terrains, base position modifiers, and deterministic selection.
// This module is framework-agnostic and can be used by both server and client.
Object.defineProperty(exports, "__esModule", { value: true });
exports.computePlanetStats = exports.pickTerrainFromCoord = exports.pickStarKindFromCoord = exports.normalizedFromSeed = exports.STAR_KIND_WEIGHTS = exports.getStarKindModifiers = exports.getBasePosition = exports.TERRAIN_BASELINES = void 0;
const random_1 = require("./random");
// Helper to accumulate resource deltas safely
const addResourceDelta = (existing, delta) => ({
    metal: (existing?.metal ?? 0) + (delta.metal ?? 0),
    gas: (existing?.gas ?? 0) + (delta.gas ?? 0),
    crystals: (existing?.crystals ?? 0) + (delta.crystals ?? 0),
});
// -------------------------
// Tables
// -------------------------
// Terrain baselines (Planetary and Asteroid) from spec
exports.TERRAIN_BASELINES = {
    Arid: { metal: 3, gas: 3, crystals: 0, fertility: 5, areaPlanet: 95, areaMoon: 83 },
    Asteroid: { metal: 4, gas: 2, crystals: 2, fertility: 4, areaMoon: 65 },
    Craters: { metal: 4, gas: 2, crystals: 2, fertility: 4, areaPlanet: 85, areaMoon: 75 },
    Crystalline: { metal: 3, gas: 2, crystals: 3, fertility: 4, areaPlanet: 80, areaMoon: 71 },
    Earthly: { metal: 3, gas: 3, crystals: 0, fertility: 6, areaPlanet: 85, areaMoon: 75 },
    Gaia: { metal: 3, gas: 2, crystals: 0, fertility: 6, areaPlanet: 90, areaMoon: 79 },
    Glacial: { metal: 2, gas: 4, crystals: 0, fertility: 5, areaPlanet: 95, areaMoon: 83 },
    Magma: { metal: 3, gas: 5, crystals: 0, fertility: 5, areaPlanet: 80, areaMoon: 71 },
    Metallic: { metal: 4, gas: 2, crystals: 2, fertility: 4, areaPlanet: 85, areaMoon: 75 },
    Oceanic: { metal: 2, gas: 4, crystals: 0, fertility: 6, areaPlanet: 80, areaMoon: 71 },
    Radioactive: { metal: 3, gas: 4, crystals: 0, fertility: 4, areaPlanet: 90, areaMoon: 79 },
    Rocky: { metal: 4, gas: 2, crystals: 0, fertility: 5, areaPlanet: 85, areaMoon: 75 },
    Toxic: { metal: 3, gas: 5, crystals: 0, fertility: 4, areaPlanet: 90, areaMoon: 79 },
    Tundra: { metal: 3, gas: 3, crystals: 0, fertility: 5, areaPlanet: 95, areaMoon: 83 },
    Volcanic: { metal: 3, gas: 5, crystals: 0, fertility: 5, areaPlanet: 80, areaMoon: 71 },
};
// Base Astro Position Modifiers (Standard System) P1..P8
// Solar Energy:  [5,4,3,2,1,0,0,0]
// Fertility:     [-1,0,1,1,2,2,3,3]
const BASE_SOLAR_ENERGY = [5, 4, 3, 2, 1, 0, 0, 0];
const BASE_FERTILITY = [-1, 0, 1, 1, 2, 2, 3, 3];
const getBasePosition = (position) => {
    const p = clampPosition(position);
    return {
        solarEnergy: BASE_SOLAR_ENERGY[p - 1],
        fertility: BASE_FERTILITY[p - 1],
    };
};
exports.getBasePosition = getBasePosition;
// -------------------------
// Star kind modifier rules (per spec)
// -------------------------
const isEven = (n) => n % 2 === 0;
const getStarKindModifiers = (kind, position) => {
    const p = clampPosition(position);
    // Defaults
    let solarEnergyDelta = 0;
    let fertilityDelta = 0;
    let resourceDelta = undefined;
    switch (kind) {
        case "RED_GIANT":
            // Fertility: P1–3: −1; P5–8: +1
            if (p >= 1 && p <= 3)
                fertilityDelta += -1;
            if (p >= 5 && p <= 8)
                fertilityDelta += 1;
            // Solar Energy: P1–4: −1
            if (p >= 1 && p <= 4)
                solarEnergyDelta += -1;
            // Resources: Gas +2 (all)
            resourceDelta = addResourceDelta(resourceDelta, { gas: 2 });
            break;
        case "SUPER_GIANT":
            // Solar Energy: P1–4: +2
            if (p >= 1 && p <= 4)
                solarEnergyDelta += 2;
            // Fertility: P1–4: −2
            if (p >= 1 && p <= 4)
                fertilityDelta += -2;
            // Resources: Crystals +1 (all)
            resourceDelta = addResourceDelta(resourceDelta, { crystals: 1 });
            break;
        case "BLUE":
            // Solar Energy: P1–3: +2
            if (p >= 1 && p <= 3)
                solarEnergyDelta += 2;
            // Fertility: P1–3: −2
            if (p >= 1 && p <= 3)
                fertilityDelta += -2;
            // Resources: P4–6: +1 Metal, +1 Gas
            if (p >= 4 && p <= 6) {
                resourceDelta = addResourceDelta(resourceDelta, { metal: 1, gas: 1 });
            }
            break;
        case "NEUTRON":
            // Fertility: P1–3: −3
            if (p >= 1 && p <= 3)
                fertilityDelta += -3;
            // Solar Energy: Even +2; Odd −2
            solarEnergyDelta += isEven(p) ? 2 : -2;
            // Resources: P4–8: +3 Metal
            if (p >= 4 && p <= 8) {
                resourceDelta = addResourceDelta(resourceDelta, { metal: 3 });
            }
            break;
        case "WHITE":
            // Solar Energy: P1–5: +1
            if (p >= 1 && p <= 5)
                solarEnergyDelta += 1;
            // Fertility: P2–4: +1
            if (p >= 2 && p <= 4)
                fertilityDelta += 1;
            // Resources: P3–6: +1 Gas; All: −1 Crystals
            if (p >= 3 && p <= 6) {
                resourceDelta = addResourceDelta(resourceDelta, { gas: 1 });
            }
            resourceDelta = addResourceDelta(resourceDelta, { crystals: -1 });
            break;
        case "WHITE_DWARF":
            // Solar Energy: All −2
            solarEnergyDelta += -2;
            // Fertility: P5–8: +2
            if (p >= 5 && p <= 8)
                fertilityDelta += 2;
            // Resources: P1–4: +2 Metal; All: −1 Gas
            if (p >= 1 && p <= 4) {
                resourceDelta = addResourceDelta(resourceDelta, { metal: 2 });
            }
            resourceDelta = addResourceDelta(resourceDelta, { gas: -1 });
            break;
        case "ORANGE":
            // Fertility: P3–6: +1
            if (p >= 3 && p <= 6)
                fertilityDelta += 1;
            // Solar Energy: No change
            // Resources: P1–3: +1 Gas
            if (p >= 1 && p <= 3) {
                resourceDelta = addResourceDelta(resourceDelta, { gas: 1 });
            }
            break;
        case "YELLOW":
            // Solar Energy: P2–4: +1
            if (p >= 2 && p <= 4)
                solarEnergyDelta += 1;
            // Fertility: All +1
            fertilityDelta += 1;
            // Resources: P6–8: −1 Gas
            if (p >= 6 && p <= 8) {
                resourceDelta = addResourceDelta(resourceDelta, { gas: -1 });
            }
            break;
    }
    return { solarEnergyDelta, fertilityDelta, resourceDelta };
};
exports.getStarKindModifiers = getStarKindModifiers;
// -------------------------
// Deterministic selection (independent randomization)
// -------------------------
// Proposed default distribution for star kinds (tunable):
// Yellow: 0.35, Orange: 0.30, White: 0.12, Blue: 0.08, Red Giant: 0.06, Super Giant: 0.03, White Dwarf: 0.04, Neutron: 0.02
exports.STAR_KIND_WEIGHTS = [
    { kind: "YELLOW", weight: 0.35 },
    { kind: "ORANGE", weight: 0.30 },
    { kind: "WHITE", weight: 0.12 },
    { kind: "BLUE", weight: 0.08 },
    { kind: "RED_GIANT", weight: 0.06 },
    { kind: "SUPER_GIANT", weight: 0.03 },
    { kind: "WHITE_DWARF", weight: 0.04 },
    { kind: "NEUTRON", weight: 0.02 },
];
const cumulativeWeights = (() => {
    const arr = [];
    let sum = 0;
    for (const e of exports.STAR_KIND_WEIGHTS) {
        sum += e.weight;
        arr.push(sum);
    }
    // Normalize to 1.0 if necessary
    const last = arr[arr.length - 1];
    if (Math.abs(last - 1) > 1e-6) {
        for (let i = 0; i < arr.length; i++) {
            arr[i] = arr[i] / last;
        }
    }
    return arr;
})();
/**
 * Deterministic normalized random in [0,1) from a numeric seed.
 */
const normalizedFromSeed = (seed) => {
    // Use a large modulus to improve distribution then normalize
    const n = Math.abs(seed % 1000000);
    return n / 1000000;
};
exports.normalizedFromSeed = normalizedFromSeed;
/**
 * Pick a StarKind deterministically from coord and an index (to disambiguate streams).
 */
const pickStarKindFromCoord = (coord, indexForKind = 101) => {
    const seed = (0, random_1.generateSeedFromCoordinate)(coord, indexForKind);
    const r = (0, exports.normalizedFromSeed)(seed);
    for (let i = 0; i < cumulativeWeights.length; i++) {
        if (r <= cumulativeWeights[i])
            return exports.STAR_KIND_WEIGHTS[i].kind;
    }
    return exports.STAR_KIND_WEIGHTS[exports.STAR_KIND_WEIGHTS.length - 1].kind;
};
exports.pickStarKindFromCoord = pickStarKindFromCoord;
const PLANET_TERRAINS = [
    "Arid",
    "Craters",
    "Crystalline",
    "Earthly",
    "Gaia",
    "Glacial",
    "Magma",
    "Metallic",
    "Oceanic",
    "Radioactive",
    "Rocky",
    "Toxic",
    "Tundra",
    "Volcanic",
];
/**
 * Pick terrain deterministically. If isAsteroid is true, returns "Asteroid".
 * Otherwise chooses equally among non-asteroid terrains.
 */
const pickTerrainFromCoord = (coord, bodyId, isAsteroid) => {
    if (isAsteroid)
        return "Asteroid";
    const seed = (0, random_1.generateSeedFromCoordinate)(coord, 202 + bodyId);
    const r = (0, exports.normalizedFromSeed)(seed);
    const idx = Math.floor(r * PLANET_TERRAINS.length);
    return PLANET_TERRAINS[Math.min(Math.max(idx, 0), PLANET_TERRAINS.length - 1)];
};
exports.pickTerrainFromCoord = pickTerrainFromCoord;
// -------------------------
// Computation
// -------------------------
const clampNonNegative = (n) => (n < 0 ? 0 : n);
const clampPosition = (p) => Math.min(8, Math.max(1, Math.floor(p || 1)));
const computePlanetStats = (inputs) => {
    const position = clampPosition(inputs.position);
    const baselineTerrain = exports.TERRAIN_BASELINES[inputs.terrain];
    const basePosition = (0, exports.getBasePosition)(position);
    const starMods = (0, exports.getStarKindModifiers)(inputs.kind, position);
    const metal = clampNonNegative((baselineTerrain.metal || 0) + (starMods.resourceDelta?.metal || 0));
    const gas = clampNonNegative((baselineTerrain.gas || 0) + (starMods.resourceDelta?.gas || 0));
    const crystals = clampNonNegative((baselineTerrain.crystals || 0) + (starMods.resourceDelta?.crystals || 0));
    const fertility = Math.max(0, (baselineTerrain.fertility || 0) + basePosition.fertility + (starMods.fertilityDelta || 0));
    const solarEnergy = basePosition.solarEnergy + (starMods.solarEnergyDelta || 0);
    const area = baselineTerrain.areaPlanet; // Future: moons not yet generated
    return {
        baselineTerrain,
        basePosition,
        starMods,
        result: {
            solarEnergy,
            fertility,
            yields: { metal, gas, crystals },
            area,
        },
    };
};
exports.computePlanetStats = computePlanetStats;

"use strict";
/**
 * Shared Energy Budget helper
 *
 * Single source of truth for computing energy production/consumption/balance and queued reservations.
 * Mirrors server semantics currently implemented in StructuresService.start:
 *  - Baseline +2 per base
 *  - Solar plants: +level × solarEnergy
 *  - Gas plants: +level × gasYield
 *  - Other buildings: BuildingSpec.energyDelta per level (>=0 -> produced, <0 -> consumed)
 *  - Reservations: include only queued/inactive negative items (consumers) and DO NOT pre-count queued producers
 *
 * Important parity note:
 *  - For reservedNegative, the current server sums the catalog delta (d) for queued items directly, without multiplying by level
 *    (each queue entry represents a single upgrade step). We preserve that parity here to avoid UI/server drift.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEnergyBalance = computeEnergyBalance;
exports.canStartWithDelta = canStartWithDelta;
const buildings_1 = require("./buildings");
/**
 * Computes the energy budget according to canonical rules and current server behavior.
 */
function computeEnergyBalance(input) {
    const { buildingsAtBase, location, includeQueuedReservations = true, baseline = 2, } = input;
    const solarEnergy = Math.max(0, Number(location?.solarEnergy ?? 0));
    const gasYield = Math.max(0, Number(location?.gasYield ?? 0));
    let produced = baseline; // innate baseline per base
    let consumed = 0;
    // Active buildings contribute to produced/consumed
    for (const b of buildingsAtBase || []) {
        if (!b?.isActive)
            continue;
        const key = String(b.key);
        const level = Math.max(1, Number(b.level || 1));
        if (key === "solar_plants") {
            produced += level * solarEnergy;
            continue;
        }
        if (key === "gas_plants") {
            produced += level * gasYield;
            continue;
        }
        const spec = safeGetSpec(key);
        const d = Number(spec?.energyDelta || 0);
        if (d >= 0)
            produced += level * d;
        else
            consumed += level * Math.abs(d);
    }
    // Queued reservations (only negative deltas; do not pre-count producers)
    let reservedNegative = 0;
    if (includeQueuedReservations) {
        for (const b of buildingsAtBase || []) {
            if (!b?.isQueuedConsumer)
                continue;
            const key = String(b.key);
            const spec = safeGetSpec(key);
            const d = Number(spec?.energyDelta || 0);
            // Preserve server parity: do NOT multiply by level for reservation
            if (d < 0) {
                reservedNegative += d; // d is negative
            }
        }
    }
    const balance = produced - consumed;
    return { produced, consumed, balance, reservedNegative };
}
/**
 * Start feasibility rule:
 *  - Producers (delta >= 0) are always allowed.
 *  - Consumers (delta < 0) only if balance + reservedNegative + delta >= 0.
 */
function canStartWithDelta(args) {
    const { balance, reservedNegative, delta } = args;
    if (delta >= 0)
        return true;
    const projectedEnergy = balance + reservedNegative + delta;
    return projectedEnergy >= 0;
}
function safeGetSpec(key) {
    try {
        return (0, buildings_1.getBuildingSpec)(key);
    }
    catch {
        // Unknown/missing spec: treat as neutral
        return undefined;
    }
}

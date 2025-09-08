import * as React from "react";
import { useMemo, useState } from "react";
import type { UnitKey, UnitSpec } from "@game/shared";
import type { UnitsStatusDTO } from "../../services/unitsService";

/**
 * UnitsBuildTable (Fleets — Quantity-based UI)
 *
 * Phase 1 (UI only):
 * - Replace per-row Start button with a numeric Quantity input
 * - Compute per-unit time from production capacity (credits/capacity per hour)
 * - Show running totals (credits and time) with Reset/Submit controls
 * - Submit is wired via onSubmit prop; server quantity support comes in a later phase
 */

interface UnitsBuildTableProps {
  catalog: UnitSpec[];
  status: UnitsStatusDTO | null;
  loading: boolean;
  onRefresh: () => void;
  onQueue?: (items: { key: UnitKey; quantity: number }[], totals: { credits: number; minutes: number }) => Promise<void>;
  isOffline?: boolean;

  // Production capacity (credits per hour) for this base
  productionPerHour?: number | null;

  // Called when user clicks Submit with non-zero quantities
  onSubmit?: (
    items: { key: UnitKey; quantity: number }[],
    totals: { credits: number; minutes: number }
  ) => void | Promise<void>;
}

const formatRequires = (u: UnitSpec): { text: string; hasRequirements: boolean } => {
  const techs = (u.techPrereqs || [])
    .map((p) => `${p.key.replace(/_/g, " ")} ${p.level}`)
    .join(", ");

  const shipyardReq =
    typeof u.requiredShipyardLevel === "number"
      ? typeof u.requiredOrbitalShipyardLevel === "number"
        ? `Shipyard ${u.requiredShipyardLevel} (Orbital ${u.requiredOrbitalShipyardLevel})`
        : `Shipyard ${u.requiredShipyardLevel}`
      : "";

  const parts: string[] = [];
  if (techs) parts.push(techs);
  if (shipyardReq) parts.push(shipyardReq);

  const text = parts.length ? parts.join(" • ") : "—";
  const hasRequirements = parts.length > 0;
  return { text, hasRequirements };
};

const getDescriptor = (u: UnitSpec): string => {
  const parts: string[] = [];
  parts.push(`Drive: ${u.drive ?? "—"}`);
  parts.push(`Weapon: ${u.weapon ?? "—"}`);
  if (typeof u.speed !== "undefined") parts.push(`Speed: ${u.speed}`);
  if (typeof u.hangar !== "undefined") parts.push(`Hangar: ${u.hangar}`);
  return parts.join(" • ");
};

function minutesFromCredits(creditsCost: number, productionPerHour?: number | null): number | null {
  const cap = Math.max(0, Number(productionPerHour || 0));
  if (!Number.isFinite(cap) || cap <= 0) return null;
  const hours = creditsCost / cap;
  const minutes = Math.max(1, Math.ceil(hours * 60));
  return minutes;
}

function formatMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0m";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const UnitsBuildTable: React.FC<UnitsBuildTableProps> = ({
  catalog,
  status,
  loading,
  onRefresh,
  productionPerHour,
  onSubmit,
}) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});


  const items = useMemo(() => catalog || [], [catalog]);

  const perUnitMinutesByKey = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const u of items) {
      map.set(u.key, minutesFromCredits(u.creditsCost, productionPerHour));
    }
    return map;
  }, [items, productionPerHour]);

  const totals = useMemo(() => {
    let totalCredits = 0;
    let totalMinutes = 0;
    for (const u of items) {
      const q = Math.max(0, Math.floor(quantities[u.key] || 0));
      if (q <= 0) continue;
      totalCredits += q * Math.max(0, Number(u.creditsCost || 0));
      const perMin = perUnitMinutesByKey.get(u.key) ?? null;
      if (perMin && perMin > 0) {
        totalMinutes += q * perMin;
      }
    }
    return { totalCredits, totalMinutes };
  }, [items, quantities, perUnitMinutesByKey]);

  const handleChangeQty = (key: string, value: string) => {
    const n = Math.max(0, Math.floor(Number(value || 0)));
    setQuantities((prev) => ({ ...prev, [key]: n }));
  };

  const handleReset = () => setQuantities({});

  const handleSubmit = async () => {
    const payload = items
      .map((u) => ({ key: u.key as UnitKey, quantity: Math.max(0, Math.floor(quantities[u.key] || 0)) }))
      .filter((p) => p.quantity > 0);

    if (payload.length === 0) return;

    if (typeof onSubmit === "function") {
      await onSubmit(payload, { credits: totals.totalCredits, minutes: totals.totalMinutes });
    } else {
      // Temporary placeholder if no handler provided
      // eslint-disable-next-line no-alert
      alert(
        `Submit not yet wired.\nTotal credits: ${totals.totalCredits.toLocaleString()}\nTotal time: ${formatMinutes(
          totals.totalMinutes
        )}`
      );
    }
  };

  const getEligibility = (u: UnitSpec): { canStart: boolean; reasons: string[] } => {
    const elig = status?.eligibility?.[u.key as UnitKey];
    return {
      canStart: !!elig?.canStart,
      reasons: elig?.reasons || [],
    };
  };

  return (
    <div className="game-card !bg-gray-900 border border-gray-700">
      {/* Header with summary & controls */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-empire-gold">Fleets</h3>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-300">
            <span className="mr-4">
              Total credits:{" "}
              <span className="font-mono text-white">{totals.totalCredits.toLocaleString()}</span>
            </span>
            <span>
              Total time: <span className="font-mono text-white">{formatMinutes(totals.totalMinutes)}</span>
            </span>
          </div>
          <button
            onClick={onRefresh}
            className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800"
          >
            Reset
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || totals.totalCredits <= 0}
            className={`text-xs px-3 py-1 rounded ${
              loading || totals.totalCredits <= 0
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            Submit
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="text-gray-300 border-b border-gray-700">
              <th className="py-2 px-3 text-left">Unit</th>
              <th className="py-2 px-3 text-left">Credits</th>
              <th className="py-2 px-3 text-left">Energy</th>
              <th className="py-2 px-3 text-left">Hangar</th>
              <th className="py-2 px-3 text-left">Time</th>
              <th className="py-2 px-3 text-right">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => {
              const key = u.key;
              const { canStart, reasons } = getEligibility(u);
              const reasonsLine =
                !canStart && Array.isArray(reasons) && reasons.length > 0 ? reasons.join("; ") : "";

              const perUnitMinutes = perUnitMinutesByKey.get(key) ?? null;

              return (
                <tr key={key} className="border-b border-gray-800 hover:bg-gray-800/60">
                  {/* Name + descriptor + reasons */}
                  <td className="py-2 px-3 align-top">
                    <div className="text-white">{u.name}</div>
                    <div className="text-xs text-gray-400">{getDescriptor(u)}</div>
                    {reasonsLine && (
                      <div className="text-xs text-red-300 mt-1">{reasonsLine}</div>
                    )}
                    {/* Requirements summary (tech/shipyard) */}
                    {formatRequires(u).hasRequirements && (
                      <div className="text-xs text-gray-500 mt-1">{formatRequires(u).text}</div>
                    )}
                  </td>

                  {/* Credits */}
                  <td className="py-2 px-3 align-top">
                    {u.creditsCost.toLocaleString()}
                  </td>

                  {/* Energy */}
                  <td className="py-2 px-3 align-top">
                    {u.energyDelta === 0 || typeof u.energyDelta !== "number" ? "" : String(u.energyDelta)}
                  </td>

                  {/* Hangar */}
                  <td className="py-2 px-3 align-top">
                    {typeof u.hangar === "number" && u.hangar !== 0 ? u.hangar : ""}
                  </td>

                  {/* Time (per unit) */}
                  <td className="py-2 px-3 align-top">
                    {perUnitMinutes && perUnitMinutes > 0 ? formatMinutes(perUnitMinutes) : "—"}
                  </td>

                  {/* Quantity input */}
                  <td className="py-2 px-3 align-top text-right">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={quantities[key] ?? ""}
                      onChange={(e) => handleChangeQty(key, e.target.value)}
                      disabled={!canStart || loading}
                      title={!canStart && reasonsLine ? reasonsLine : undefined}
                      className={`w-24 px-2 py-1 rounded text-right font-mono bg-gray-800 border ${
                        canStart && !loading
                          ? "border-gray-600 text-white"
                          : "border-gray-700 text-gray-400 cursor-not-allowed"
                      }`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note about capacity source */}
      <div className="px-3 py-2 text-xs text-gray-400">
        {productionPerHour && productionPerHour > 0
          ? `Time is computed from production capacity: ${productionPerHour.toLocaleString()} credits/hour`
          : "Time is unavailable until this base has production capacity."}
      </div>
    </div>
  );
};

export default UnitsBuildTable;

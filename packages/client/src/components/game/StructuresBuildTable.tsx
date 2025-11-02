import * as React from "react";
import type { StructureKey as BuildingKey, StructureSpec as BuildingSpec } from "@game/shared";
import { getStructureCreditCostForLevel } from "@game/shared";
import type { StructuresStatusDTO } from "../../services/structuresService";
import { useModalStore } from "../../stores/modalStore";
import BuildTable, { type Column, type Eligibility } from "./BuildTable";
import { TIMEOUTS } from '@game/shared';
import { BUTTON_TEXT, DISPLAY_TEXT } from '@game/shared';
import { GAME_TEXT, STATUS_TEXT } from '@game/shared';

interface StructuresBuildTableProps {
  catalog: BuildingSpec[];
  status: StructuresStatusDTO | null;
  levels?: Partial<Record<BuildingKey, number>>;
  loading: boolean;
  onRefresh: () => void;
  onStart: (key: BuildingKey) => Promise<void> | void;
  onQueue?: (key: BuildingKey) => Promise<{ success: boolean; eventId?: number }>;
  isOffline?: boolean;
  constructionPerHour?: number;
  activeConstruction?: { key: BuildingKey; completionAt: string } | null;
  locationCoord?: string;
  // Tech levels for requirement checking (from research status)
  techLevels?: Record<string, number>;
  // Planet context for displaying per-base energy gain hints
  planetSolarEnergy?: number;
  planetGasYield?: number;
  // Additional planet context for metal/crystals/fertility hints
  planetMetalYield?: number;
  planetCrystalsYield?: number;
  planetFertility?: number;
  actionLabel?: (s: BuildingSpec, eligible: boolean, isLoading: boolean, isOffline: boolean) => string;
}

/**
 * StructuresBuildTable
 * - Consolidated onto generic BuildTable with standardized styling/behavior
 * - Columns per .clinerules/tabular-build-ui-standard-and-test-plan.md:
 *   Structure | Credits | Energy | Economy | Population | Area | Advanced | Requires | Time | Build
 */
const StructuresBuildTable: React.FC<StructuresBuildTableProps> = ({
  catalog,
  status,
  levels,
  loading,
  onRefresh,
  onStart,
  constructionPerHour,
  activeConstruction,
  techLevels,
  planetSolarEnergy,
  planetGasYield,
  planetMetalYield,
  planetCrystalsYield,
  planetFertility,
}) => {
  const structs = React.useMemo<BuildingSpec[]>(
    () => (catalog || []).slice().sort((a, b) => a.creditsCost - b.creditsCost),
    [catalog]
  );

  const [expandedKey, setExpandedKey] = React.useState<string | null>(null);
  const { openModal } = useModalStore();

  // Active construction (global gray-out)
  const hasActive = !!activeConstruction;

  // Tick every second while construction is active to update countdown
  const [, forceTick] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    if (!hasActive) return;
    const id = window.setInterval(() => forceTick(), TIMEOUTS.ONE_SECOND);
    return () => window.clearInterval(id);
  }, [hasActive, activeConstruction?.completionAt]);



  const formatDuration = (credits: number, perHour: number): string => {
    const totalSeconds = Math.max(1, Math.round((credits / perHour) * 3600));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  // Copied/kept in sync with GameInfoModal.StructuresTable
  const getStructureEffect = (s: BuildingSpec): string => {
    switch (s.key) {
      case "urban_structures":
        return "Increases population capacity by base fertility.";
      case "solar_plants":
        return "Increases base energy output by base solar energy.";
      case "gas_plants":
        return "Increases base energy output by base gas resource.";
      case "fusion_plants":
      case "antimatter_plants":
      case "orbital_plants":
        return `Increases base energy output by ${s.energyDelta}.`;
      case "research_labs":
        return "Increases bases research by 8, allows new technologies.";
      case "metal_refineries":
        return "Increases production and construction by base metal resource.";
      case "crystal_mines":
        return "Increases economy by base crystals resource.";
      case "robotic_factories":
        return "Increases production and construction by 2.";
      case "shipyards":
        return "Increases production by 2 and allows new units.";
      case "orbital_shipyards":
        return "Increases production by 8 and allows new units.";
      case "spaceports":
        return `Increases economy by ${s.economy} and allows trade routes.`;
      case "command_centers":
        return "Adds 5% fleet attack power at base and allows 1 occupation.";
      case "nanite_factories":
        return "Increases production and construction by 4.";
      case "android_factories":
        return "Increases production and construction by 6.";
      case "economic_centers":
        return `Increases economy by ${s.economy}.`;
      case "terraform":
        return "Increases base area by 5.";
      case "multi_level_platforms":
        return "Increases base area by 10.";
      case "orbital_base":
        return "Increases population capacity by 10.";
      case "jump_gate":
        return "Increases fleet speed by 70% and allows travel between galaxies.";
      case "biosphere_modification":
        return "Increases planet fertility by 1.";
      case "capital":
        return "Increases economy by 10 and other bases by 1. -15% empire income while occupied.";
      default:
        if (s.energyDelta > 0) return `Increases base energy output by ${s.energyDelta}.`;
        if (s.energyDelta < 0) return `Consumes ${Math.abs(s.energyDelta)} energy.`;
        if (s.economy > 0) return `Increases economy by ${s.economy}.`;
        return "â€”";
    }
  };

  const NO_AREA_KEYS: Array<BuildingSpec["key"]> = ["orbital_base", "jump_gate"];
  const AREA_INCREASE: Partial<Record<BuildingSpec["key"], number>> = {
    terraform: 5,
    multi_level_platforms: 10,
  };

  const renderArea = (s: BuildingSpec): string => {
    if (NO_AREA_KEYS.includes(s.key)) return "";
    const inc = AREA_INCREASE[s.key as keyof typeof AREA_INCREASE];
    if (typeof inc === "number") return `+${inc}`;
    if (typeof s.areaRequired === "number") {
      return s.areaRequired === 0 ? "" : `-${s.areaRequired}`;
    }
    // Default: most items cost 1 area
    return "-1";
  };

  const getRequiresText = (s: BuildingSpec): string => {
    return s.techPrereqs.length === 0
      ? "â€”"
      : s.techPrereqs.map((p) => `${p.key.replace(/_/g, " ")} ${p.level}`).join(", ");
  };

  const columns: Column<BuildingSpec>[] = [
    {
      key: "credits",
      header: GAME_TEXT.CREDITS,
      align: "left",
      render: (s) => {
        const currentLevel = levels?.[s.key as BuildingKey] ?? 0;
        const nextLevel = currentLevel + 1;
        let nextCost: number | null = null;
        try {
          nextCost = getStructureCreditCostForLevel(s.key as BuildingKey, nextLevel);
        } catch {
          // If no canonical table is defined yet: allow L1 fallback, block upgrades
          nextCost = currentLevel === 0 ? s.creditsCost : null;
        }
        return typeof nextCost === "number" ? nextCost.toLocaleString() : "â€”";
      },
    },
    {
      key: "energy",
      header: GAME_TEXT.ENERGY,
      align: "left",
      render: (s) =>
        s.key === "solar_plants" || s.key === "gas_plants"
          ? ""
          : s.energyDelta === 0
          ? ""
          : String(s.energyDelta),
    },
    {
      key: "economy",
      header: "Economy",
      align: "left",
      render: (s) => (s.economy === 0 ? "" : s.economy),
    },
    {
      key: "population",
      header: "Population",
      align: "left",
      render: (s) => (s.key === "orbital_base" ? "+10" : s.populationRequired === 0 ? "" : `-${s.populationRequired}`),
    },
    {
      key: "area",
      header: "Area",
      align: "left",
      render: (s) => renderArea(s),
    },
    {
      key: "advanced",
      header: "Advanced",
      align: "left",
      render: (s) => (s.advanced ? "x" : ""),
    },
    {
      key: "requires",
      header: "Requires",
      align: "left",
      render: (s) => {
        const text = getRequiresText(s);
        const hasReq = s.techPrereqs.length > 0;
        if (!hasReq) {
          return <span className="text-gray-400">{text}</span>;
        }
        // Get current tech levels (prefer explicit prop; fall back to status.techLevels if present)
        const currentTechLevels = techLevels || (status as any)?.techLevels || {};
        // Check if all tech prerequisites are met
        const met = s.techPrereqs.every((p) => {
          const currentLevel = Math.max(0, currentTechLevels[p.key] ?? 0);
          return currentLevel >= p.level;
        });
        // Show green for met requirements, red for unmet requirements
        return <span className={met ? "text-green-400" : "text-red-400"}>{text}</span>;
      },
    },
    {
      key: "time",
      header: "Time",
      align: "left",
      render: (s) => {
        if (!(typeof constructionPerHour === "number" && constructionPerHour > 0)) return "â€”";
        const currentLevel = levels?.[s.key as BuildingKey] ?? 0;
        const nextLevel = currentLevel + 1;
        let nextCost: number | null = null;
        try {
          nextCost = getStructureCreditCostForLevel(s.key as BuildingKey, nextLevel);
        } catch {
          nextCost = currentLevel === 0 ? s.creditsCost : null;
        }
        if (typeof nextCost !== "number") return "â€”";
        const text = formatDuration(nextCost, constructionPerHour);
        const tip = `ETA = Credits (${nextCost.toLocaleString()}) / Construction Capacity (${constructionPerHour.toLocaleString()} cred/h)`;
        return <span title={tip}>{text}</span>;
      },
    },
  ];

  const getEligibility = (s: BuildingSpec): Eligibility => {
    const elig = status?.eligibility[s.key as BuildingKey];
    // v0: disable all starts while a construction is active at this base
    const canStart = !!elig?.canStart && !hasActive;
    const reasons = elig?.reasons || [];
    return { canStart, reasons };
  };

  const getTitleText = (s: BuildingSpec): React.ReactNode => {
    const lvl = levels?.[s.key as BuildingKey] ?? 0;

    // Determine per-base inline hint based on planet context
    let hintLabel: string | null = null;
    let hintValue: number | null = null;
    if (s.key === "solar_plants" && typeof planetSolarEnergy === "number") {
      hintLabel = "energy";
      hintValue = planetSolarEnergy;
    } else if (s.key === "gas_plants" && typeof planetGasYield === "number") {
      hintLabel = "energy";
      hintValue = planetGasYield;
    } else if (s.key === "metal_refineries" && typeof planetMetalYield === "number") {
      hintLabel = "metal";
      hintValue = planetMetalYield;
    } else if (s.key === "urban_structures" && typeof planetFertility === "number") {
      hintLabel = "fertility";
      hintValue = planetFertility;
    } else if (s.key === "crystal_mines" && typeof planetCrystalsYield === "number") {
      hintLabel = "crystals";
      hintValue = planetCrystalsYield;
    }

    return (
      <div
        className="text-white cursor-pointer"
        data-testid={`name-${s.key}`}
        onClick={() => setExpandedKey(expandedKey === s.key ? null : s.key)}
      >
        {s.name}
        {lvl > 0 ? ` (${GAME_TEXT.LEVEL} ${lvl})` : ""}
        {typeof hintValue === "number" && hintLabel && (
          <span className="ml-2 text-xs text-gray-400">{`(+${hintValue.toLocaleString()} ${hintLabel} here)`}</span>
        )}
      </div>
    );
  };

  const getDescriptionText = (s: BuildingSpec): React.ReactNode => {
    const elig = status?.eligibility[s.key as BuildingKey];
    // Align with getEligibility(): all eligible rows can start, including active ones
    const canStart = !!elig?.canStart;
    const reasons = elig?.reasons || [];
    const showReasons = !canStart && reasons.length > 0;

    return (
      <>
        <div className="text-xs text-gray-400">{getStructureEffect(s)}</div>
        {showReasons && <div className="text-xs text-red-300 mt-1">{reasons.join("; ")}</div>}
        {expandedKey === s.key && (
          <div className="mt-2 space-y-1">
            <div className="text-sm text-gray-300">
              <span className="text-gray-400">Population:</span> {s.populationRequired} per level
            </div>
            <div className="text-sm text-gray-300">
              <span className="text-gray-400">Area:</span>{" "}
              {(() => {
                if (NO_AREA_KEYS.includes(s.key)) return "â€”";
                if (typeof s.areaRequired === "number") {
                  return s.areaRequired === 0 ? "â€”" : `-${s.areaRequired} per level`;
                }
                return "-1 per level";
              })()}
            </div>
            <div className="text-sm text-gray-300">
              <span className="text-gray-400">Short Name:</span>{" "}
              {s.key
                .split("_")
                .map((w) => w[0]?.toUpperCase() || "")
                .join("")}
            </div>
            <div className="pt-1 flex gap-6 text-sm">
              <button
                className="text-empire-gold hover:underline"
                onClick={() => openModal("levels_table", { structureKey: s.key as BuildingKey })}
              >
                Levels Table
              </button>
              <button
                className="text-yellow-400 hover:underline"
                onClick={() => window.alert("Downgrade not yet implemented")}
              >
                Downgrade 1 Level
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <BuildTable<BuildingSpec>
      title={GAME_TEXT.BUILDINGS}
      firstColumnHeader={GAME_TEXT.BUILDING}
      actionHeader={BUTTON_TEXT.START}
      summary={undefined}
      loading={loading}
      onRefresh={onRefresh}
      items={structs}
      getKey={(s) => s.key}
      getTitleText={getTitleText}
      getDescriptionText={getDescriptionText}
      getEligibility={getEligibility}
      columns={columns}
      onAction={(s) => onStart(s.key as BuildingKey)}
      actionLabel={(_, eligible, isLoading) => {
        if (isLoading) return "...";
        if (hasActive) return `${GAME_TEXT.CONSTRUCTION} ${STATUS_TEXT.IN_PROGRESS}`;
        return eligible ? BUTTON_TEXT.START : DISPLAY_TEXT.UNAVAILABLE;
      }}
      actionTestIdPrefix="start"
      nameTestIdPrefix="name"
      defaultSort={(a, b) => a.creditsCost - b.creditsCost}
      tableTestId="build-table"
    />
  );
};

export default StructuresBuildTable;


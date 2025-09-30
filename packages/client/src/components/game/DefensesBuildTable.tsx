import React from "react";
import { useUIActions, useEnhancedAuth, useConnectionStatus } from '../../stores/enhancedAppStore';
import type { DefenseKey, DefenseSpec } from "@game/shared";
import type { DefensesStatusDTO } from "../../services/defensesService";
import BuildTable, { type Column, type Eligibility } from "./BuildTable";

/**
 * DefensesBuildTable
 * - Consolidated onto generic BuildTable to enforce unified styling/behavior
 * - Columns per .clinerules/tabular-build-ui-standard-and-test-plan.md:
 *   Defense | Credits | Energy | Area | Requires | Start
 */
interface DefensesBuildTableProps {
  catalog: DefenseSpec[];
  status: DefensesStatusDTO | null;
  levels?: Partial<Record<DefenseKey, number>>;
  loading: boolean;
  onRefresh: () => void;
  onStart: (key: DefenseKey) => Promise<void> | void;
  onQueue?: (payload: any) => Promise<any>;
  locationCoord?: string;
  citizenPerHour?: number; // for time calculation
}

const DefensesBuildTable: React.FC<DefensesBuildTableProps> = ({
  catalog,
  status,
  levels,
  loading,
  onRefresh,
  onStart,
  onQueue,
  locationCoord,
  citizenPerHour,
}) => {
  const formatRequires = (d: DefenseSpec): string => {
    if (!d.techPrereqs || d.techPrereqs.length === 0) return "—";
    return d.techPrereqs.map((p) => `${p.key.replace(/_/g, " ")} ${p.level}`).join(", ");
  };

  const renderArea = (d: DefenseSpec): string => {
    if (typeof d.areaRequired === "number") {
      return d.areaRequired === 0 ? "" : `-${d.areaRequired}`;
    }
    // Default: most items cost 1 area
    return "-1";
  };

  const getDefenseDescriptor = (d: DefenseSpec): string => {
    const parts: string[] = [];
    if (d.weapon) parts.push(`Weapon: ${d.weapon}`);
    if (typeof d.attack === "number") parts.push(`Attack ${d.attack}`);
    if (typeof d.armour === "number") parts.push(`Armour ${d.armour}`);
    if (typeof d.shield === "number") parts.push(`Shield ${d.shield}`);
    return parts.length ? parts.join(" • ") : "—";
  };

  // Optional: preserve prior UX when no status is available
  if (!status) {
    return (
      <div className="game-card !bg-gray-900 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-empire-gold">Defenses</h3>
          <button
            onClick={onRefresh}
            className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
        <div className="text-gray-400">
          {loading ? "Loading defenses..." : "No status available."}
        </div>
      </div>
    );
  }

  const formatDuration = (credits: number, perHour: number): string => {
    if (!(perHour > 0)) return "—";
    const totalSeconds = Math.max(1, Math.round((credits / perHour) * 3600));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const columns: Column<DefenseSpec>[] = [
    {
      key: "level",
      header: "Level",
      align: "left",
      render: (d) => String((levels?.[d.key as DefenseKey] ?? 0)),
    },
    {
      key: "credits",
      header: "Credits",
      align: "left",
      render: (d) => d.creditsCost.toLocaleString(),
    },
    {
      key: "energy",
      header: "Energy",
      align: "left",
      render: (d) => (d.energyDelta === 0 ? "" : String(d.energyDelta)),
    },
    {
      key: "area",
      header: "Area",
      align: "left",
      render: (d) => renderArea(d),
    },
    {
      key: "requires",
      header: "Requires",
      align: "left",
      render: (d) => {
        const text = formatRequires(d);
        const hasReq = !!d.techPrereqs && d.techPrereqs.length > 0;
        if (!hasReq) {
          return <span className="text-gray-400">{text}</span>;
        }
        const techLevels = (status?.techLevels as Record<string, number>) || {};
        const met = d.techPrereqs!.every((p) => (techLevels[p.key] ?? 0) >= p.level);
        return <span className={met ? "text-green-400" : "text-red-400"}>{text}</span>;
      },
    },
    {
      key: "time",
      header: "Time",
      align: "left",
      render: (d) => {
        if (!(typeof citizenPerHour === 'number' && citizenPerHour > 0)) return "—";
        const text = formatDuration(d.creditsCost, citizenPerHour);
        const tip = `ETA = Credits (${d.creditsCost.toLocaleString()}) / Citizen Capacity (${citizenPerHour.toLocaleString()} cred/h)`;
        return <span title={tip}>{text}</span>;
      },
    },
  ];

  const { isFullyConnected } = useConnectionStatus();
  const { addToast } = useUIActions();
  const auth = useEnhancedAuth();
  const { empire } = auth || {};

  const handleStart = async (key: string) => {
    if (!isFullyConnected) {
      if (!empire) {
        addToast({ type: 'error', message: 'Not authenticated' });
        return;
      }
      const payload = {
        empireId: empire._id,
        locationCoord,
        catalogKey: key,
      };
      const options = {
        identityKey: `${empire._id}:${locationCoord}:${key}`,
      };
      if (!window.desktop?.eventQueue) {
        addToast({ type: 'error', message: 'Desktop API not available' });
        return;
      }
      const res = await window.desktop.eventQueue.enqueue('defenses', payload, options);
      if (res?.success) {
        addToast({ type: 'success', message: `Queued ${key} for sync` });
      } else {
        addToast({ type: 'error', message: res?.error || 'Failed to queue defense' });
      }
      return;
    }
    onStart?.(key as DefenseKey);
  };
  
  const handleQueue = async (payload: any) => {
    return onQueue ? await onQueue(payload) : { success: false, error: 'Queue not available' };
  };

  const getEligibility = (d: DefenseSpec): Eligibility => {
    const elig = status.eligibility[d.key as DefenseKey];
    return {
      canStart: !!elig?.canStart,
      reasons: elig?.reasons || [],
    };
  };

  return (
    <BuildTable<DefenseSpec>
      title="Defenses"
      firstColumnHeader="Defense"
      actionHeader="Start"
      summary={undefined}
      loading={loading}
      onRefresh={onRefresh}
      items={(catalog || [])}
      getKey={(d) => d.key}
      getTitleText={(d) => d.name}
      getDescriptionText={(d) => getDefenseDescriptor(d)}
      getEligibility={getEligibility}
      columns={columns}
      onAction={(d) => handleStart(d.key as DefenseKey)}
      onQueue={handleQueue}
      isOffline={!isFullyConnected}
      actionLabel={(_d, eligible, isLoading, isOffline) => {
        if (isLoading) return "...";
        if (isOffline) {
          return eligible ? "Queue" : "Unavailable";
        }
        return eligible ? "Start" : "Unavailable";
      }}
      actionTestIdPrefix="start"
      nameTestIdPrefix="name"
      defaultSort={(a, b) => a.creditsCost - b.creditsCost}
      tableTestId="build-table"
    />
  );
};

export default DefensesBuildTable;

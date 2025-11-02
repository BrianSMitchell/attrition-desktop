import * as React from "react";
import { useUIActions, useEnhancedAuth, useConnectionStatus } from '../../stores/enhancedAppStore';
import type { TechnologyKey, TechnologySpec } from "@game/shared";
import { getTechCreditCostForLevel } from "@game/shared";
import type { TechStatusDTO } from "../../services/techService";
import { useModalStore } from "../../stores/modalStore";
import BuildTable, { type Column, type Eligibility } from "./BuildTable";
import { TIMEOUTS } from '@game/shared';

/**
 * ResearchBuildTable (Research)
 * - Consolidated onto generic BuildTable to enforce unified styling/behavior
 * - Columns per .clinerules/tabular-build-ui-standard-and-test-plan.md:
 *   Technology | Credits | Labs | Requires | Effect | Time | Start
 */
interface ResearchBuildTableProps {
  catalog: TechnologySpec[];
  status: TechStatusDTO | null;
  loading: boolean;
  onRefresh: () => void;
  onStart: (key: TechnologyKey) => Promise<void> | void;
  onQueue?: (payload: any) => Promise<void>;
  locationCoord?: string;
  researchPerHour?: number;
  activeResearch?: { key: TechnologyKey; completesAt: string } | null;
}

const ResearchBuildTable: React.FC<ResearchBuildTableProps> = ({
  catalog,
  status,
  loading,
  onRefresh,
  onStart,
  onQueue,
  locationCoord,
  researchPerHour,
  activeResearch,
}) => {
  const { openModal } = useModalStore();

  const { isFullyConnected } = useConnectionStatus();
  const isOffline = !isFullyConnected;

  const auth = useEnhancedAuth();
  const { empire } = auth || {};
  const empireId = empire?._id;

  const { addToast } = useUIActions();

  // Active research (global gray-out)
  const hasActive = !!activeResearch;

  const handleStart = async (key: TechnologyKey) => {
    if (isOffline) {
      if (!onQueue || !locationCoord || !empireId) {
        addToast({ type: 'error', message: 'Cannot queue: missing context' });
        return;
      }

      const payload = {
        kind: 'research' as const,
        empireId,
        locationCoord,
        catalogKey: key,
        identityKey: `${empireId}-research-${key}-${Date.now()}`,
      };

      try {
        await onQueue(payload);
        addToast({ type: 'success', message: 'Research queued for sync when online' });
      } catch (error) {
        console.error('Queue error:', error);
        addToast({ type: 'error', message: 'Failed to queue research' });
      }
      return;
    }

    // Online: call original onStart
    if (onStart) {
      await onStart(key);
    }
  };

  // Tick every second while research is active to update countdown
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, forceTick] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    if (!hasActive) return;
    const id = window.setInterval(() => forceTick(), TIMEOUTS.ONE_SECOND);
    return () => window.clearInterval(id);
  }, [hasActive, activeResearch?.completesAt]);



  const formatDuration = (credits: number, perHour: number): string => {
    const totalSeconds = Math.max(1, Math.round((credits / perHour) * 3600));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const formatRequires = (t: TechnologySpec): string => {
    if (!t || !t.prerequisites || t.prerequisites.length === 0) return "â€”";
    return t.prerequisites.map((p) => `${p.key.replace(/_/g, " ")} ${p.level}`).join(", ");
  };

  const columns: Column<TechnologySpec>[] = [
    {
      key: "credits",
      header: "Credits",
      align: "left",
      render: (t) => {
        if (!t || !t.key) return "â€”";
        const level = Math.max(0, status?.techLevels[t.key as TechnologyKey] ?? 0);
        const nextLevel = level + 1;
        const nextCost = getTechCreditCostForLevel(t.key as TechnologyKey, nextLevel);
        return nextCost.toLocaleString();
      },
    },
    {
      key: "labs",
      header: "Labs",
      align: "left",
      render: (t) => (t && t.requiredLabs) || "â€”",
    },
    {
      key: "requires",
      header: "Requires",
      align: "left",
      render: (t) => {
        if (!t) return <span className="text-gray-400">â€”</span>;
        const text = formatRequires(t);
        const hasReq = !!t.prerequisites && t.prerequisites.length > 0;
        if (!hasReq) {
          return <span className="text-gray-400">{text}</span>;
        }
        const met = t.prerequisites.every((p) => {
          const current = Math.max(0, status?.techLevels[p.key as TechnologyKey] ?? 0);
          return current >= p.level;
        });
        return <span className={met ? "text-green-400" : "text-red-400"}>{text}</span>;
      },
    },
    {
      key: "effect",
      header: "Effect",
      align: "left",
      render: (t) => (t && t.description ? "" : "â€”"),
    },
    {
      key: "time",
      header: "Time",
      align: "left",
      render: (t) => {
        if (!t || !t.key) return "â€”";
        const level = Math.max(0, status?.techLevels[t.key as TechnologyKey] ?? 0);
        const nextLevel = level + 1;
        const nextCost = getTechCreditCostForLevel(t.key as TechnologyKey, nextLevel);
        if (!(typeof researchPerHour === "number" && researchPerHour > 0)) return "â€”";
        const text = formatDuration(nextCost, researchPerHour);
        const tip = `ETA = Credits (${nextCost.toLocaleString()}) / Research Capacity (${researchPerHour.toLocaleString()} cred/h)`;
        return <span title={tip}>{text}</span>;
      },
    },
  ];

  const getEligibility = (t: TechnologySpec): Eligibility => {
    if (!t || !t.key) return { canStart: false, reasons: ['Invalid tech spec'] };
    const elig = status?.eligibility[t.key as TechnologyKey];
    const reasons = elig?.reasons || [];
    // Credits-only blocked rows are allowed to enqueue
    const creditsOnly = reasons.length > 0 && reasons.every((r) => /credit/i.test(String(r)));
    // Allow queue behavior: enable all eligible rows to Queue (including the active one)
    const canStart = !!elig?.canStart || creditsOnly;
    return { canStart, reasons };
  };

  const getTitleText = (t: TechnologySpec): React.ReactNode => {
    if (!t || !t.key) {
      console.error('[ResearchBuildTable] Invalid tech spec:', t);
      return <div className="text-red-400">Invalid tech spec</div>;
    }
    const level = Math.max(0, status?.techLevels[t.key as TechnologyKey] ?? 0);
    return (
      <div
        className="text-white cursor-pointer hover:underline"
        data-testid={`name-${t.key}`}
        onClick={() => openModal("research_levels_table", { techKey: t.key as TechnologyKey })}
      >
        {t.name || t.key}
        {level > 0 ? ` (Level ${level})` : ""}
      </div>
    );
  };

  const getDescriptionText = (t: TechnologySpec): React.ReactNode => {
    return (t && t.description) ? <div className="text-xs text-gray-400">{t.description}</div> : null;
  };

  // Summary (header right) per table standard: show Credits and Labs, plus Refresh button from BuildTable
  const summary = status && empire ? (
    <div className="flex items-center gap-3">
      <div className="text-sm text-gray-300">
        Credits: <span className="text-empire-gold font-mono">{empire.resources.credits.toLocaleString()}</span>
      </div>
      <div className="text-sm text-gray-300">
        Labs: <span className="text-blue-400 font-semibold">{status.baseLabTotal}</span>
      </div>
    </div>
  ) : (
    <div className="text-sm text-gray-300">Credits: â€” Â· Labs: â€”</div>
  );

  // Helper: determine if this row is credits-only blocked (eligible to queue even with no active)
  const isCreditsOnlyBlocked = (t: TechnologySpec) => {
    if (!t || !t.key) return false;
    const elig = status?.eligibility[t.key as TechnologyKey];
    const reasons = elig?.reasons || [];
    return reasons.length > 0 && reasons.every((r) => /credit/i.test(String(r)));
  };

  return (
    <BuildTable<TechnologySpec>
      title="Base Research"
      firstColumnHeader="Technology"
      actionHeader="Start / Queue"
      summary={summary}
      loading={loading}
      onRefresh={onRefresh}
      items={(catalog || []).filter(t => t && t.key).slice().sort((a, b) => a.creditsCost - b.creditsCost)}
      getKey={(t) => t.key}
      getTitleText={getTitleText}
      getDescriptionText={getDescriptionText}
      getEligibility={getEligibility}
      columns={columns}
      onAction={(t) => handleStart(t.key as TechnologyKey)}
      isOffline={isOffline}
      actionLabel={(t, eligible, isLoading) => {
        if (isLoading) return "...";
        const creditOnly = isCreditsOnlyBlocked(t);
        if (isOffline) {
          return eligible ? "Queue" : "Unavailable";
        }
        if (hasActive) {
          return eligible ? "Queue" : "Unavailable";
        }
        // No active research: if credits-only blocked, we enqueue
        if (eligible && creditOnly) return "Queue";
        return eligible ? "Start" : "Unavailable";
      }}
      actionTestIdPrefix="start"
      nameTestIdPrefix="name"
      defaultSort={(a, b) => a.creditsCost - b.creditsCost}
      tableTestId="build-table"
    />
  );
};

export default ResearchBuildTable;


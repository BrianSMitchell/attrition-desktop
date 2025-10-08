import * as React from "react";
import { useState, useEffect, useRef } from "react";
import type { BuildingKey, StructureSpec } from "@game/shared";

interface StructureConstructionProgressProps {
  /** Active construction data with level and cost info */
  activeConstruction: { 
    key: BuildingKey; 
    completionAt: string; 
    startedAt?: string;
    currentLevel: number;
    targetLevel: number;
    creditsCost: number;
    pendingUpgrade: boolean;
  } | null;
  /** Structures catalog for displaying structure names */
  structuresCatalog: StructureSpec[];
  /** Construction capacity (credits per hour) for time calculations */
  constructionPerHour?: number;
  /** Base coordinate for API calls */
  baseCoord: string;
  /** Refresh callback */
  onRefresh?: () => void;
  /** Cancel construction callback */
  onCancel?: (baseCoord: string) => Promise<void>;
}

/**
 * StructureConstructionProgress - Shows active structure construction similar to ship production
 * 
 * Features:
 * - Progress bars with real-time updates
 * - ETA display with countdown
 * - Cancel functionality
 */
const StructureConstructionProgress: React.FC<StructureConstructionProgressProps> = ({
  activeConstruction,
  structuresCatalog,
  constructionPerHour,
  baseCoord,
  onRefresh,
  onCancel,
}) => {
  // Local tick for progress bar updates without network calls
  const [, setProgressTick] = useState(0);
  const progressTimerRef = useRef<number | null>(null);

  // Start timer when there is active construction
  useEffect(() => {
    if (!activeConstruction) {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      return;
    }

    // Update every second
    progressTimerRef.current = window.setInterval(() => {
      setProgressTick((x) => x + 1);
    }, 1000);

    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [!!activeConstruction]);

  const formatEta = (completionAt: string): string => {
    const now = Date.now();
    const end = new Date(completionAt).getTime();
    const diff = Math.max(0, end - now);
    
    if (diff < 1000) return "Completed";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const calculateProgress = (construction: StructureConstructionProgressProps['activeConstruction']): number => {
    if (!construction) return 0;
    
    const now = Date.now();
    const end = new Date(construction.completionAt).getTime();
    
    if (!Number.isFinite(end)) {
      return now >= end ? 100 : 0;
    }
    
    // Use startedAt from server if available, otherwise derive from cost/capacity
    let start: number;
    if (construction.startedAt) {
      start = new Date(construction.startedAt).getTime();
    } else {
      // Fallback: derive from cost and capacity
      const perHour = constructionPerHour ?? 0;
      if (construction.creditsCost && perHour > 0) {
        const ms = (construction.creditsCost / perHour) * 3600 * 1000;
        start = end - ms;
      } else {
        return now >= end ? 100 : 0;
      }
    }
    
    if (!Number.isFinite(start) || start >= end) {
      return now >= end ? 100 : 0;
    }
    
    const total = end - start;
    const elapsed = Math.max(0, Math.min(total, now - start));
    const pct = (elapsed / total) * 100;
    
    return Math.max(0, Math.min(100, pct));
  };

  const getStructureDisplayName = (structureKey: BuildingKey): string => {
    const structure = structuresCatalog.find(s => s.key === structureKey);
    return structure?.name || structureKey;
  };

  const handleCancel = async () => {
    if (!onCancel || !activeConstruction) return;
    
    try {
      await onCancel(baseCoord);
      // Refresh will be handled by parent component
    } catch (error) {
      console.error('Failed to cancel construction:', error);
    }
  };

  if (!activeConstruction) {
    return null;
  }

  const progress = calculateProgress(activeConstruction);
  const eta = formatEta(activeConstruction.completionAt);
  const structureName = getStructureDisplayName(activeConstruction.key);
  const isCompleted = progress >= 100;

  // Use construction cost directly from server
  const constructionCost = activeConstruction.creditsCost;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-empire-gold">Structure Construction</h4>
        <div className="text-xs text-gray-400">
          Active construction
        </div>
      </div>

      <div className="p-3 bg-gray-800/60 border border-gray-600 rounded-md">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-200">
            <span className="font-medium">{structureName}</span>
            <span className="ml-2 text-gray-400">
              {activeConstruction.pendingUpgrade 
                ? `(Level ${activeConstruction.currentLevel} → ${activeConstruction.targetLevel})`
                : `(Level ${activeConstruction.targetLevel})`
              }
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-sm ${isCompleted ? 'text-green-400' : 'text-yellow-300'}`}>
              {isCompleted ? 'Completed' : `ETA: ${eta}`}
            </div>
            {onCancel && !isCompleted && (
              <button
                onClick={handleCancel}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                title="Cancel construction"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isCompleted ? 'bg-green-600' : 'bg-purple-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Additional info */}
        <div className="flex justify-between text-xs text-gray-400">
          <span>
            Cost: {constructionCost.toLocaleString()} credits
          </span>
          {constructionPerHour && constructionPerHour > 0 && (
            <span>
              Construction: {constructionPerHour.toLocaleString()} credits/hour
            </span>
          )}
        </div>
      </div>

      {onRefresh && (
        <div className="text-center">
          <button
            onClick={onRefresh}
            className="text-xs px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Refresh Status
          </button>
        </div>
      )}
    </div>
  );
};

export default StructureConstructionProgress;
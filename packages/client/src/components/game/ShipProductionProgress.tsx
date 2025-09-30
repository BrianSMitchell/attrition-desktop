import * as React from "react";
import { useMemo } from "react";
import type { UnitKey, UnitSpec } from "@game/shared";

// Enhanced store compatible types
export interface UnitProductionItem {
  id: string;
  unitKey: UnitKey;
  unitName: string;
  quantity: number;
  totalQuantity: number;
  startedAt: string;
  completesAt: string;
  creditsCost: number;
  baseCoord: string;
}

interface ShipProductionProgressProps {
  /** Current active ship production queue */
  productionQueue: UnitProductionItem[];
  /** Units catalog for displaying unit names and details */
  unitsCatalog: UnitSpec[];
  /** Production capacity (credits per hour) for time calculations */
  productionPerHour?: number;
  /** Refresh callback */
  onRefresh?: () => void;
  /** Cancel production callback */
  onCancel?: (itemId: string) => Promise<void>;
}

/**
 * ShipProductionProgress - Shows active ship production similar to structure construction
 * 
 * Features:
 * - Progress bars with real-time updates
 * - ETA display with countdown
 * - Quantity tracking (e.g., "Building Corvette 2/5")
 * - Cancel functionality
 */
const ShipProductionProgress: React.FC<ShipProductionProgressProps> = ({
  productionQueue,
  unitsCatalog,
  onRefresh,
}) => {

  const formatEta = (completesAt: string): string => {
    const now = Date.now();
    const end = new Date(completesAt).getTime();
    const diff = Math.max(0, end - now);
    
    if (diff < 1000) return "Completed";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };


  const getUnitDisplayName = (unitKey: UnitKey): string => {
    const unit = unitsCatalog.find(u => u.key === unitKey);
    return unit?.name || unitKey;
  };


  // Aggregate items by unit type and compute batch ETA (last item to complete)
  const grouped = useMemo(() => {
    const map = new Map<UnitKey, { count: number; lastCompletesAt: string }>();
    for (const it of productionQueue) {
      const key = it.unitKey as UnitKey;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { count: 1, lastCompletesAt: it.completesAt });
      } else {
        prev.count += 1;
        if (new Date(it.completesAt).getTime() > new Date(prev.lastCompletesAt).getTime()) {
          prev.lastCompletesAt = it.completesAt;
        }
      }
    }
    const arr = Array.from(map.entries()).map(([unitKey, v]) => ({ unitKey, ...v }));
    arr.sort((a, b) => new Date(a.lastCompletesAt).getTime() - new Date(b.lastCompletesAt).getTime());
    return arr;
  }, [productionQueue]);

  if (productionQueue.length === 0) {
    return null;
  }

  const totalItems = productionQueue.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-empire-gold">Ship Production</h4>
        <div className="text-xs text-gray-400">
          {grouped.length} type{grouped.length !== 1 ? 's' : ''}, {totalItems} item{totalItems !== 1 ? 's' : ''}
        </div>
      </div>

      {grouped.map((g) => {
        const unitName = getUnitDisplayName(g.unitKey);
        const eta = formatEta(g.lastCompletesAt);
        const done = new Date(g.lastCompletesAt).getTime() <= Date.now();
        return (
          <div key={g.unitKey} className="p-3 bg-gray-800/60 border border-gray-600 rounded-md flex items-center justify-between">
            <div className="text-sm text-gray-200">
              <span className="font-medium">{unitName}</span>
            </div>
            <div className="text-xs text-gray-300">
              <span className="font-mono text-white mr-1">{g.count}</span>
              in production
            </div>
            <div className={`text-sm ${done ? 'text-green-400' : 'text-yellow-300'}`}>
              {done ? 'Completed' : `ETA: ${eta}`}
            </div>
          </div>
        );
      })}

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

export default ShipProductionProgress;

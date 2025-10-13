/**
 * Defense panel component
 * Pure presentation component that shows defenses catalog, status, levels, and build table
 */

import React from 'react';
import DefensesBuildTable from '../../DefensesBuildTable';
import type { DefensesStatusDTO } from '../../../../services/defensesService';
import type { DefenseSpec, DefenseKey, StructureKey as BuildingKey } from '@game/shared';
import { LAYOUT_CLASSES } from '../constants/css-constants';

const formatEta = (date?: string | Date | null) => {
  if (!date) return '';
  const ms = new Date(date).getTime() - Date.now();
  if (ms <= 0) return 'Completing...';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
};

export interface DefensePanelProps {
  /** Base coordinate */
  baseCoord: string;
  /** Defense catalog */
  defensesCatalog: DefenseSpec[];
  /** Defense queue */
  defenseQueue: Array<{ id: string; defenseKey: string; startedAt?: string; completesAt?: string; baseCoord: string }>;
  /** Defense status */
  defensesStatus: DefensesStatusDTO | null;
  /** Loading state */
  defensesLoading: boolean;
  /** Error state */
  defensesError: string | null;
  /** Active construction */
  activeConstruction: { key: BuildingKey; completionAt: string } | null;
  /** Defense capacity */
  citizenPerHour: number | undefined;
  /** Event handlers */
  onRefresh: () => void;
  onStart: (defenseKey: DefenseKey) => Promise<void>;
}

export const DefensePanel: React.FC<DefensePanelProps> = ({
  baseCoord: _baseCoord,
  defensesCatalog,
  defenseQueue,
  defensesStatus,
  defensesLoading,
  defensesError,
  activeConstruction,
  citizenPerHour,
  onRefresh,
  onStart
}) => {

  // Pure presentation component - no data loading logic

  return (
    <div className="space-y-6">
      {defensesError && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
          {defensesError}
        </div>
      )}
      {/* Defense construction summary */}
      {(activeConstruction || (defenseQueue && defenseQueue.length > 0)) && (
        <div className="p-3 bg-gray-800/60 border border-gray-600 rounded-md text-gray-200">
          <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
            <div>
              <span className="text-empire-gold font-semibold">Construction in progress</span>
              <span className="ml-2 text-sm text-gray-400">(shared with Structures)</span>
            </div>
            <div className="text-sm">
              ETA: {activeConstruction ? formatEta(activeConstruction.completionAt) : 'â€”'}
            </div>
          </div>
        </div>
      )}
      <DefensesBuildTable
        catalog={defensesCatalog}
        status={defensesStatus}
        levels={defensesStatus?.currentLevels || {}}
        loading={defensesLoading}
        onRefresh={onRefresh}
        citizenPerHour={citizenPerHour}
        onStart={onStart}
      />
    </div>
  );
};

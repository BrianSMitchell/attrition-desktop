/**
 * Structures panel component
 * Pure presentation component that shows structures catalog, status, construction progress, and build table
 */

import React from 'react';
import StructuresBuildTable from '../../StructuresBuildTable';
import StructureConstructionProgress from '../../StructureConstructionProgress';
import type { StructureSpec as BuildingSpec, StructureKey as BuildingKey } from '@game/shared';

export interface StructuresPanelProps {
  /** Base coordinate */
  baseCoord: string;
  /** Structures catalog */
  structuresCatalog: BuildingSpec[];
  /** Structures status */
  structuresStatus: any;
  /** Loading state */
  structuresLoading: boolean;
  /** Error state */
  structuresError: string | null;
  /** Active construction with level and cost info */
  activeConstruction: { 
    key: BuildingKey; 
    completionAt: string; 
    startedAt?: string;
    currentLevel: number;
    targetLevel: number;
    creditsCost: number;
    pendingUpgrade: boolean;
  } | null;
  /** Construction rate */
  constructionPerHour: number | undefined;
  /** Planet resource yields */
  planetGasYield: number | undefined;
  planetMetalYield: number | undefined;
  planetCrystalsYield: number | undefined;
  planetSolarEnergy: number | undefined;
  planetFertility: number | undefined;
  /** Current tech levels (from Research status) used for requirement checks */
  techLevels?: Record<string, number>;
  /** Event handlers */
  onRefresh: () => void;
  onStart: (structureKey: BuildingKey) => Promise<void>;
  onQueue: (structureKey: BuildingKey) => Promise<{ success: boolean }>;
  onCancel?: () => Promise<void>;
}

export const StructuresPanel: React.FC<StructuresPanelProps> = ({
  baseCoord,
  structuresCatalog,
  structuresStatus,
  structuresLoading,
  structuresError,
  activeConstruction,
  constructionPerHour,
  planetGasYield,
  planetMetalYield,
  planetCrystalsYield,
  planetSolarEnergy,
  planetFertility,
  techLevels,
  onRefresh,
  onStart,
  onQueue,
  onCancel
}) => {

  // Pure presentation component - no data loading logic

  return (
    <div className="space-y-6">
      {structuresError && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
          {structuresError}
        </div>
      )}
      {activeConstruction && (
        <StructureConstructionProgress
          activeConstruction={activeConstruction}
          structuresCatalog={structuresCatalog}
          constructionPerHour={constructionPerHour}
          baseCoord={baseCoord}
          onRefresh={onRefresh}
          onCancel={onCancel ? async () => {
            await onCancel();
            onRefresh(); // Refresh after cancel to update the UI
          } : undefined}
        />
      )}
        <StructuresBuildTable
          catalog={structuresCatalog}
          status={structuresStatus}
          levels={structuresStatus?.currentLevels || {}}
          loading={structuresLoading}
          onRefresh={onRefresh}
          constructionPerHour={constructionPerHour}
          planetGasYield={planetGasYield}
          planetMetalYield={planetMetalYield}
          planetCrystalsYield={planetCrystalsYield}
          planetSolarEnergy={planetSolarEnergy}
          planetFertility={planetFertility}
          techLevels={techLevels}
          onStart={onStart}
          onQueue={onQueue}
        />
    </div>
  );
};
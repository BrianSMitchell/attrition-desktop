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
  /** Active construction */
  activeConstruction: { key: BuildingKey; completionAt: string } | null;
  /** Construction rate */
  constructionPerHour: number | undefined;
  /** Planet resource yields */
  planetGasYield: number | undefined;
  planetMetalYield: number | undefined;
  planetCrystalsYield: number | undefined;
  planetSolarEnergy: number | undefined;
  planetFertility: number | undefined;
  /** Event handlers */
  onRefresh: () => void;
  onStart: (structureKey: BuildingKey) => Promise<void>;
  onQueue: (structureKey: BuildingKey) => Promise<{ success: boolean }>;
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
  onRefresh,
  onStart,
  onQueue
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
          onStart={onStart}
          onQueue={onQueue}
        />
    </div>
  );
};
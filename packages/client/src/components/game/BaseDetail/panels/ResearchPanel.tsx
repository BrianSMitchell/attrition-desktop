/**
 * Research panel component
 * Pure presentation component that shows research catalog, status, queue, and build table
 */

import React from 'react';
import ResearchBuildTable from '../../ResearchBuildTable';
import ResearchQueuePanel from '../../ResearchQueuePanel';
import type { TechStatusDTO } from '../../../../services/techService';
import type { TechnologySpec, TechnologyKey } from '@game/shared';

export interface ResearchPanelProps {
  /** Base coordinate */
  baseCoord: string;
  /** Research catalog */
  catalog: TechnologySpec[];
  /** Research status */
  status: TechStatusDTO | null;
  /** Loading state */
  researchLoading: boolean;
  /** Error state */
  researchError: string | null;
  /** Active research */
  activeResearch: { key: TechnologyKey; completesAt: string } | null;
  /** Research capacity */
  researchPerHour: number | undefined;
  /** Event handlers */
  onRefresh: () => void;
  onStart: (techKey: TechnologyKey) => Promise<void>;
  onQueueChanged: () => Promise<void>;
}

export const ResearchPanel: React.FC<ResearchPanelProps> = ({
  baseCoord,
  catalog,
  status,
  researchLoading,
  researchError,
  activeResearch,
  researchPerHour,
  onRefresh,
  onStart,
  onQueueChanged
}) => {

  // Pure presentation component - no data loading logic

  return (
    <div className="space-y-6">
      <ResearchQueuePanel
        baseCoord={baseCoord}
        onChanged={onQueueChanged}
      />
      {researchError && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
          {researchError}
        </div>
      )}
      <ResearchBuildTable
        catalog={catalog}
        status={status}
        loading={researchLoading}
        researchPerHour={researchPerHour}
        activeResearch={activeResearch}
        onRefresh={onRefresh}
        onStart={onStart}
      />
    </div>
  );
};
import React from 'react';
import { Empire } from '@game/shared';
import BaseEventsTable from './BaseEventsTable';

interface BaseOverviewProps {
  bases: any[];
  empire: Empire;
  onBaseSelect: (baseId: string) => void;
  onUpdate: () => void;
}

const BaseOverview: React.FC<BaseOverviewProps> = ({ 
  bases, 
  onBaseSelect, 
  onUpdate 
}) => {

  if (bases.length === 0) {
    return (
      <div className="game-card text-center">
        <div className="py-12">
          <div className="text-6xl mb-4">🏗️</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-300">No Bases Found</h3>
          <p className="text-gray-400 mb-6">
            You haven't established any bases yet. Start by colonizing a location to build your first base.
          </p>
          <button 
            onClick={onUpdate}
            className="game-button"
          >
            Refresh Bases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">


      {/* Bases Events Summary Table */}
      <BaseEventsTable onRowClick={onBaseSelect} />



    </div>
  );
};

export default BaseOverview;

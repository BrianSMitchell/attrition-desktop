/**
 * Fleet/Production panel component
 * Shows ship production progress and units build table
 */

import React from 'react';
import ShipProductionProgress from '../../ShipProductionProgress';
import UnitsBuildTable from '../../UnitsBuildTable';

export interface FleetPanelProps {
  /** Units error */
  unitsError: string | null;
  /** Production queue */
  productionQueue: any[];
  /** Units catalog */
  unitsCatalog: any[];
  /** Capacities data */
  capacities: any;
  /** Units status */
  unitsStatus: any;
  /** Loading state */
  unitsLoading: boolean;
  /** Base coordinate */
  baseCoord: string;
  /** Event handlers */
  onRefreshProductionQueue: () => void;
  onCancelProduction: (itemId: string) => Promise<void>;
  onRefreshUnitsData: () => void;
  onSubmitProduction: (items: any[], totals: any) => Promise<void>;
}

export const FleetPanel: React.FC<FleetPanelProps> = ({
  unitsError,
  productionQueue,
  unitsCatalog,
  capacities,
  unitsStatus,
  unitsLoading,
  onRefreshProductionQueue,
  onCancelProduction,
  onRefreshUnitsData,
  onSubmitProduction
}) => {
  return (
    <div className="space-y-6">
      {unitsError && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
          {unitsError}
        </div>
      )}
      <ShipProductionProgress
        productionQueue={productionQueue}
        unitsCatalog={unitsCatalog}
        productionPerHour={capacities?.production?.value}
        onRefresh={onRefreshProductionQueue}
        onCancel={onCancelProduction}
      />
      <UnitsBuildTable
        catalog={unitsCatalog}
        status={unitsStatus}
        loading={unitsLoading}
        onRefresh={onRefreshUnitsData}
        productionPerHour={capacities?.production?.value}
        onSubmit={onSubmitProduction}
      />
    </div>
  );
};
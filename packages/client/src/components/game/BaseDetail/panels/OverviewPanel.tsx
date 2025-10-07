/**
 * Overview panel component
 * Shows planet info, fleets, and structures overview
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PlanetInfoBlock from '../../PlanetInfoBlock';
import PlanetVisual from '../../PlanetVisual';
import type { FleetListRow } from '../../../../services/fleetsService';
import { Countdown } from '../../../game/common/Countdown';
import fleetsService from '../../../../services/fleetsService';

export interface OverviewPanelProps {
  /** Base data */
  base: any;
  /** Refresh key for planet info */
  refreshKey: number;
  /** Fleets data */
  fleets: FleetListRow[];
  fleetsLoading: boolean;
  fleetsError: string | null;
  /** Buildings data */
  buildings: any[];
  buildingsLoading: boolean;
  buildingsError: string | null;
  /** Defense levels */
  defenseLevels: Array<{ key: string; name: string; level: number; energyDelta: number }>;
  /** Event handlers */
  onRefreshFleets: () => void;
  onRefreshBuildings: () => void;
}

const formatEta = (date?: string | Date | null) => {
  if (!date) return '';
  const ms = new Date(date).getTime() - Date.now();
  if (ms <= 0) return 'Completing...';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
};

const getBuildingLabel = (b: any): string => {
  if (b.displayName && b.displayName.trim().length > 0) return b.displayName;
  return b.catalogKey || 'Unknown Structure';
};

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  base,
  refreshKey,
  fleets: fleetsProp,
  fleetsLoading: fleetsLoadingProp,
  fleetsError: fleetsErrorProp,
  buildings,
  buildingsLoading,
  buildingsError,
  defenseLevels,
  onRefreshFleets,
  onRefreshBuildings
}) => {
  // DIRECT FLEET LOADING - bypass all the store complexity
  const [directFleets, setDirectFleets] = React.useState<FleetListRow[]>([]);
  const [directLoading, setDirectLoading] = React.useState(false);
  const [directError, setDirectError] = React.useState<string | null>(null);

  const loadFleetsDirectly = React.useCallback(async () => {
    if (!base?.locationCoord) return;
    
    setDirectLoading(true);
    setDirectError(null);
    
    try {
      const resp = await fleetsService.getFleetsOverview(base.locationCoord);
      if (resp.success && resp.data?.fleets) {
        console.log('[OverviewPanel] DIRECT FLEET LOAD SUCCESS:', resp.data.fleets);
        setDirectFleets(resp.data.fleets as any);
      } else {
        console.error('[OverviewPanel] DIRECT FLEET LOAD FAILED:', resp);
        setDirectError(resp.message || resp.error || 'Failed to load fleets');
      }
    } catch (error) {
      console.error('[OverviewPanel] DIRECT FLEET LOAD ERROR:', error);
      setDirectError('Network error loading fleets');
    } finally {
      setDirectLoading(false);
    }
  }, [base?.locationCoord]);

  // Load fleets directly on mount and when coordinate changes
  useEffect(() => {
    console.log('[OverviewPanel] MOUNTING - Loading fleets for:', base?.locationCoord);
    loadFleetsDirectly();
  }, [base?.locationCoord, loadFleetsDirectly]);

  // Use direct fleets if we have them, otherwise fall back to props
  const fleets = directFleets.length > 0 ? directFleets : fleetsProp;
  const fleetsLoading = directLoading || fleetsLoadingProp;
  const fleetsError = directError || fleetsErrorProp;

  // Ensure data loads naturally when arriving on the page
  useEffect(() => {
    const needsBuildings = !buildings || buildings.length === 0 || !defenseLevels || defenseLevels.length === 0;
    if (needsBuildings) {
      onRefreshBuildings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base?.locationCoord]);
  return (
    <div className="space-y-6">
      {/* Base Planet Info */}
      <div className="game-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Planet picture */}
          <div className="p-4 rounded-lg border border-gray-600 bg-gray-800/60 flex items-center justify-center">
            <PlanetVisual coord={base.locationCoord} className="w-56 h-56 md:w-64 md:h-64" />
          </div>

          {/* Right: Planet information */}
          <div className="p-4 rounded-lg border border-gray-600 bg-gray-800/60">
            <PlanetInfoBlock coord={base.locationCoord} refreshKey={refreshKey} showBudgets={false} />
          </div>
        </div>
      </div>

      {/* Fleets */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-empire-gold">Fleets</h3>
          <button
            onClick={() => { loadFleetsDirectly(); onRefreshFleets(); }}
            className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {fleetsLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {fleetsError && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 mb-3">
            {fleetsError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-gray-300">
              <tr className="border-b border-gray-700">
                <th className="text-left py-1 pr-4">Fleet</th>
                <th className="text-left py-1 pr-4">Player</th>
                <th className="text-left py-1 pr-4">Arrival</th>
                <th className="text-left py-1 pr-4">Status</th>
                <th className="text-right py-1">Size</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {fleets.length > 0 ? (
                fleets.map((f) => (
                  <tr key={f._id} className="border-b border-gray-800/60">
                    <td className="py-1 pr-4">
                      <Link to={`/fleets/${f._id}`} className="text-blue-300 hover:text-blue-200">
                        {f.name}
                      </Link>
                    </td>
                    <td className="py-1 pr-4 text-gray-200">{f.ownerName || '—'}</td>
                    <td className="py-1 pr-4 text-gray-300">{f.arrival ? <Countdown arrival={f.arrival} /> : ''}</td>
                    <td className="py-1 pr-4">{f.arrival ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Incoming</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">Stationed</span>
                    )}</td>
                    <td className="py-1 text-right font-mono">{f.sizeCredits.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-3 text-center text-gray-400">
                    No fleets detected in orbit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Structures */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-empire-gold">Structures</h3>
          <button
            onClick={onRefreshBuildings}
            className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {buildingsLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {buildingsError && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 mb-3">
            {buildingsError}
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left column - main structures */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-300">
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1 pr-4">Structures</th>
                  <th className="text-right py-1">Level</th>
                  <th className="text-left py-1 pl-4">Status</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {(buildings && buildings.length > 0) ? (
                  buildings
                    .filter((b) => Number(b?.level ?? 0) > 0)
                    .map((b, i) => (
                      <tr key={b._id || i} className="border-b border-gray-800/60">
                        <td className="py-1 pr-4 text-gray-200">{getBuildingLabel(b)}</td>
                        <td className="py-1 text-right font-mono">{b.level}</td>
                        <td className="py-1 pl-4">
                          {b.isActive ? (
                            <span className="text-green-400">Active</span>
                          ) : (
                            <span className="text-yellow-300">
                              Under construction • ETA {formatEta(b.constructionCompleted)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-3 text-center text-gray-400">No structures detected.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Right column - defenses */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-300">
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1 pr-4">Defenses</th>
                  <th className="text-right py-1">Level</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {(defenseLevels && defenseLevels.length > 0) ? (
                  defenseLevels
                    .filter((d) => Number(d?.level ?? 0) > 0)
                    .map((d) => (
                      <tr key={d.key} className="border-b border-gray-800/60">
                        <td className="py-1 pr-4 text-gray-200">{d.name}</td>
                        <td className="py-1 text-right font-mono">{d.level}</td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-3 text-center text-gray-400">No defenses detected.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
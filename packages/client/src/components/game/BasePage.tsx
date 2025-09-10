import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import universeService from '../../services/universeService';
import BaseDetail from './BaseDetail';
import PlanetInfoBlock from './PlanetInfoBlock';
import PlanetVisual from './PlanetVisual';
import basesService from '../../services/basesService';
import baseStatsService, { BaseStatsDTO } from '../../services/baseStatsService';
import fleetsService, { FleetListRow } from '../../services/fleetsService';
import type { Building, BuildingType } from '@game/shared';
import { getBuildingSpec } from '@game/shared';

const StatItem: React.FC<{ label: string; main: React.ReactNode; sub?: React.ReactNode }> = ({ label, main, sub }) => (
  <div className="bg-gray-800/60 border border-gray-700 rounded-md px-4 py-3">
    <div className="text-xs text-gray-400">{label}</div>
    <div className="mt-1 text-lg text-white font-mono">{main}</div>
    {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
  </div>
);


type FetchedBuildings = Array<{
  _id: string;
  type: string;
  level: number;
  isActive: boolean;
  constructionStarted?: string;
  constructionCompleted?: string;
}>;


type ClientBuilding = Building & {
  displayName?: string;
  catalogKey?: string;
};

const BUILDING_DISPLAY_NAME: Record<BuildingType, string> = {
  metal_mine: 'Metal Mine',
  energy_plant: 'Energy Plant',
  factory: 'Manufacturing Plant',
  research_lab: 'Research Laboratory',
  defense_station: 'Defense Station',
  shipyard: 'Shipyard',
  command_center: 'Command Center',
  habitat: 'Habitat Module',
};

const getBuildingLabel = (b: ClientBuilding): string => {
  if (b.displayName && b.displayName.trim().length > 0) return b.displayName;
  if (b.catalogKey) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return getBuildingSpec(b.catalogKey as any).name;
    } catch {
      // ignore and fall back
    }
  }
  return BUILDING_DISPLAY_NAME[b.type] ?? b.type;
};

const BasePage: React.FC = () => {
  const navigate = useNavigate();
  const { coord } = useParams<{ coord: string }>();
  const [searchParams] = useSearchParams();
  const apiInstance = api;
  const { user, empire } = useAuthStore();

  const tabParamRaw = searchParams.get('tab');
  // Support canonical deep-link aliases like ?tab=fleets -> 'fleet'
  const tabParam = tabParamRaw === 'fleets' ? 'fleet' : tabParamRaw;
  const initialPanel = (tabParam === 'overview' || tabParam === 'fleet' || tabParam === 'defense' || tabParam === 'research' || tabParam === 'structures' || tabParam === 'trade')
    ? (tabParam as 'overview' | 'fleet' | 'defense' | 'research' | 'structures' | 'trade')
    : undefined;

  // Keep ?tab= in URL in sync with the active panel so refresh/back/forward restore the same tab
  const handlePanelChange = (panel: 'overview' | 'fleet' | 'defense' | 'research' | 'structures' | 'trade') => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', panel);
    // Update just the search portion, keep current path (/base/:coord)
    navigate({ search: `?${next.toString()}` }, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Location/owner
  const [ownerUsername, setOwnerUsername] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Buildings/derived base for owner view
  const [baseObj, setBaseObj] = useState<any | null>(null);
  const [publicBuildings, setPublicBuildings] = useState<ClientBuilding[]>([]);
  const [publicBuildingsError, setPublicBuildingsError] = useState<string | null>(null);
  const [publicFleets, setPublicFleets] = useState<FleetListRow[]>([]);
  const [publicFleetsError, setPublicFleetsError] = useState<string | null>(null);
  const [baseStats, setBaseStats] = useState<BaseStatsDTO | null>(null);

  const isOwner = !!user && !!ownerId && user._id === ownerId;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!coord) {
        setError('Missing coordinate');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // 1) Fetch location to determine owner
        const locRes = await universeService.getLocationByCoord(coord);
        if (!mounted) return;
        if (!locRes.success || !locRes.data) {
          setError(locRes.error || 'Failed to load location');
          setLoading(false);
          return;
        }
        setOwnerUsername(locRes.data.owner?.username ?? null);
        setOwnerId(locRes.data.owner?.id ?? null);

        // 2a) Fetch base stats (area/energy/population budgets and owner income) for header display
        try {
          const bs = await baseStatsService.get(coord);
          if (mounted && bs.success && bs.data) {
            setBaseStats(bs.data.stats);
          }
        } catch {
          // ignore stats errors in public view
        }

        // 2) Fetch buildings: owner sees full BaseDetail, public view shows read-only structures
        if (user && locRes.data.owner?.id === user._id) {
          const bRes = await apiInstance.get(`/game/buildings/location/${encodeURIComponent(coord)}`);
          const buildingsRaw: FetchedBuildings = bRes.data?.data?.buildings || [];

          const constructionQueue = buildingsRaw.filter((b) => !b.isActive);
          

          const derivedBase = {
            _id: coord, // use coord as id
            empireId: empire?._id,
            locationCoord: coord,
            name: `Base ${coord}`,
            createdAt: new Date(),
            updatedAt: new Date(),
      
            constructionQueue,
          };

          setBaseObj(derivedBase);
          setPublicBuildings([]);
          setPublicBuildingsError(null);
        } else {
          setBaseObj(null);
          // public view: load real buildings and fleets at this location
          try {
            setPublicBuildingsError(null);
            const res = await basesService.getBaseStructures(coord);
            if (res.success && res.data) {
              // Convert to display format with catalogKey-first naming
              const displayBuildings: ClientBuilding[] = res.data.items.map((item: any) => ({
                ...item,
                displayName: item.name,
                catalogKey: item.key,
                level: item.currentLevel,
                isActive: true,
                _id: `${coord}-${item.key}`,
                type: item.type || 'unknown', // fallback for legacy display
                empireId: undefined,
                locationCoord: coord
              }));
              setPublicBuildings(displayBuildings);
            } else {
              setPublicBuildings([]);
              setPublicBuildingsError(res.error || 'Failed to load buildings');
            }
          } catch {
            setPublicBuildings([]);
            setPublicBuildingsError('Network error while loading buildings');
          }

          // Load real fleet data for public view
          try {
            setPublicFleetsError(null);
            const fleetsRes = await fleetsService.getFleets(coord);
            if (fleetsRes.success && fleetsRes.data && fleetsRes.data.fleets) {
              setPublicFleets(fleetsRes.data.fleets);
            } else {
              setPublicFleets([]);
              setPublicFleetsError(fleetsRes.error || 'Failed to load fleets');
            }
          } catch {
            setPublicFleets([]);
            setPublicFleetsError('Network error while loading fleets');
          }
        }
      } catch (e) {
        if (!mounted) return;
        setError('Network error while loading base');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [coord, api, user, empire?._id]);

  if (loading) {
    return (
      <div className="game-card">
        <div className="py-10 text-center text-gray-300">Loading base...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-card">
        <div className="py-6 text-center text-red-300">{error}</div>
      </div>
    );
  }

  // Owner view -> full BaseDetail
  if (isOwner && baseObj && empire) {
    return (
      <div className="space-y-6">
        <div className="game-card mb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-empire-gold">{baseObj.name}</h1>
              <p className="text-gray-400 font-mono">{coord}</p>
            </div>
            <button
              className="px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
              onClick={() => navigate(-1)}
            >
              ← Back
            </button>
          </div>
        </div>
        <BaseDetail
          base={baseObj}
          onBack={() => navigate(-1)}
          initialActivePanel={initialPanel}
          onPanelChange={handlePanelChange}
        />
      </div>
    );
  }

  // Public view (non-owner)




  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Base (Public View)</h1>
            <p className="text-sm text-gray-400">{coord}</p>
          </div>
          <button
            className="px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
        </div>
        <div className="text-sm text-gray-300">
          Owner: <span className="text-empire-gold">{ownerUsername ?? '—'}</span>
        </div>

        {baseStats && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatItem
              label="Area Usage"
              main={
                <span>
                  {baseStats.area.used.toLocaleString()} / {baseStats.area.total.toLocaleString()}
                </span>
              }
              sub={<span>(free {baseStats.area.free.toLocaleString()})</span>}
            />
            <StatItem
              label="Energy Balance"
              main={
                <span className={baseStats.energy.balance >= 0 ? 'text-green-300' : 'text-red-300'}>
                  {baseStats.energy.balance.toLocaleString()}
                </span>
              }
              sub={
                <span>
                  +{baseStats.energy.produced.toLocaleString()} prod {' '}−{baseStats.energy.consumed.toLocaleString()} cons
                </span>
              }
            />
            <StatItem
              label="Population"
              main={
                <span>
                  {baseStats.population.used.toLocaleString()} / {baseStats.population.capacity.toLocaleString()}
                </span>
              }
              sub={<span>(free {baseStats.population.free.toLocaleString()})</span>}
            />
          </div>
        )}
      </div>

      {/* Planet image + information */}
      <div className="game-card">
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="flex items-center justify-center">
            <PlanetVisual coord={coord!} className="w-56 h-56 md:w-72 md:h-72" />
          </div>
          <div>
            <PlanetInfoBlock coord={coord!} showLinkToPlanetPage={false} showBudgets={false} />
          </div>
        </div>
        <div className="mt-3 text-center">
          <span className="text-yellow-300">Move fleet here</span>
        </div>
      </div>

      {/* Fleets */}
      <div className="game-card">
        <h3 className="text-lg font-semibold text-empire-gold mb-3">Fleets</h3>
        {publicFleetsError && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 mb-3">
            {publicFleetsError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-gray-300">
              <tr className="border-b border-gray-700">
                <th className="text-left py-1 pr-4">Fleet</th>
                <th className="text-left py-1 pr-4">Player</th>
                <th className="text-left py-1 pr-4">Arrival</th>
                <th className="text-right py-1">Size</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {publicFleets.map((fleet) => (
                <tr key={fleet._id} className="border-b border-gray-800/60">
                  <td className="py-1 pr-4 text-blue-300 hover:text-blue-200 cursor-default">{fleet.name}</td>
                  <td className="py-1 pr-4 text-gray-200">{fleet.ownerName}</td>
                  <td className="py-1 pr-4 text-gray-300">{fleet.arrival || '—'}</td>
                  <td className="py-1 text-right font-mono">{fleet.sizeCredits.toLocaleString()}</td>
                </tr>
              ))}
              {publicFleets.length === 0 && !publicFleetsError && (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-gray-400">No fleets detected in orbit.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Structures */}
      <div className="game-card">
        <h3 className="text-lg font-semibold text-empire-gold mb-3">Structures</h3>
        {publicBuildingsError && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 mb-3">
            {publicBuildingsError}
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
                </tr>
              </thead>
              <tbody className="text-white">
                {publicBuildings
                  .filter((b) => b.type !== 'defense_station')
                  .map((b, i) => (
                    <tr key={b._id || i} className="border-b border-gray-800/60">
                      <td className="py-1 pr-4 text-gray-200">{getBuildingLabel(b)}</td>
                      <td className="py-1 text-right font-mono">{b.level}</td>
                    </tr>
                  ))}
                {publicBuildings.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-3 text-center text-gray-400">No structures detected.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Right column - special structures + defenses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Special structures */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-gray-300">
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-1 pr-4">Structures</th>
                    <th className="text-right py-1">Level</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {publicBuildings
                    .filter((b) => b.type === 'command_center' || b.type === 'shipyard')
                    .map((b, i) => (
                      <tr key={b._id || i} className="border-b border-gray-800/60">
                        <td className="py-1 pr-4 text-gray-200">{getBuildingLabel(b)}</td>
                        <td className="py-1 text-right font-mono">{b.level}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Defenses */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-gray-300">
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-1 pr-4">Defenses</th>
                    <th className="text-right py-1">Level</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {publicBuildings
                    .filter((b) => b.type === 'defense_station')
                    .map((b, i) => (
                      <tr key={b._id || i} className="border-b border-gray-800/60">
                        <td className="py-1 pr-4 text-gray-200">{getBuildingLabel(b)}</td>
                        <td className="py-1 text-right font-mono">{b.level}</td>
                      </tr>
                    ))}
                  {publicBuildings.filter((b) => b.type === 'defense_station').length === 0 && (
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
    </div>
  );
};

export default BasePage;

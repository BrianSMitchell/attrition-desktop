import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth, useGame, useGameActions } from '../../stores/enhancedAppStore';
import { gameApi } from '../../stores/services/gameApi';
import BaseDetail from './BaseDetail';
import PlanetInfoBlock from './PlanetInfoBlock';
import PlanetVisual from './PlanetVisual';
import { Countdown } from './common/Countdown';
import type { Building, BuildingType } from '@game/shared';
import { getBuildingSpec } from '@game/shared';
import { useFleetSocketEvents } from '../../hooks/useFleetSocketEvents';
import { FleetDebug } from '../debug/FleetDebug';
import { LAYOUT_CLASSES } from '../../constants/css-constants';
import { LOADING_MESSAGES, GAME_TEXT } from '@game/shared';

// Type definitions for API data
type BaseStatsDTO = any;

const StatItem: React.FC<{ label: string; main: React.ReactNode; sub?: React.ReactNode }> = ({ label, main, sub }) => (
  <div className="bg-gray-800/60 border border-gray-700 rounded-md px-4 py-3">
    <div className="text-xs text-gray-400">{label}</div>
    <div className="mt-1 text-lg text-white font-mono">{main}</div>
    {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
  </div>
);




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
  const auth = useAuth();
  const { user, empire } = auth;
  const gameState = useGame();
  const gameActions = useGameActions();
  
  // Listen for Socket.IO fleet updates
  useFleetSocketEvents();

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
  const [publicDefenses, setPublicDefenses] = useState<Array<{ key: string; name: string; level: number }>>([]);
  const [publicDefensesError, setPublicDefensesError] = useState<string | null>(null);
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
        const locRes = await gameApi.getLocationByCoord(coord);
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
          const bs = await gameApi.getBaseStats(coord);
          if (mounted && bs.success && bs.data) {
            setBaseStats(bs.data);
          }
        } catch {
          // ignore stats errors in public view
        }

        // 2) Fetch buildings and defenses for both owner and public views
        try {
          setPublicBuildingsError(null);
          const res = await gameApi.getBaseStructures(coord);
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
              // Only keep structures that have been built (level > 0)
              setPublicBuildings(displayBuildings.filter(b => Number(b.level) > 0));
            } else {
              setPublicBuildings([]);
              setPublicBuildingsError(res.error || 'Failed to load buildings');
            }
        } catch {
          setPublicBuildings([]);
          setPublicBuildingsError('Network error while loading buildings');
        }

        // Load defenses levels for both views
        try {
          setPublicDefensesError(null);
          const dres = await gameApi.getBaseDefenses(coord);
          if (dres.success && dres.data) {
            const items = dres.data.defenseLevels || [];
            setPublicDefenses(
              items
                .filter((x: any) => Number(x.level) > 0)
                .map((x: any) => ({ key: x.key, name: x.name, level: x.level, energyDelta: x.energyDelta }))
            );
          } else {
            setPublicDefenses([]);
            setPublicDefensesError(dres.error || 'Failed to load defenses');
          }
        } catch {
          setPublicDefenses([]);
          setPublicDefensesError('Network error while loading defenses');
        }

        if (user && locRes.data.owner?.id === user._id) {
          const derivedBase = {
            _id: coord, // use coord as id
            empireId: empire?._id,
            locationCoord: coord,
            name: `Base ${coord}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          setBaseObj(derivedBase);
          // Load fleets for owner view too
          console.log('[BasePage] ðŸš¢ ABOUT TO LOAD FLEETS FOR OWNER:', coord);
          await gameActions.loadFleetsForBase(coord);
          console.log('[BasePage] ðŸš¢ FLEET LOAD COMPLETE FOR OWNER');
        } else {
          setBaseObj(null);
          // public view: load fleets via enhanced store
          console.log('[BasePage] ðŸš¢ ABOUT TO LOAD FLEETS FOR PUBLIC:', coord);
          await gameActions.loadFleetsForBase(coord);
          console.log('[BasePage] ðŸš¢ FLEET LOAD COMPLETE FOR PUBLIC');
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
  }, [coord, user, empire?._id]);

  if (loading) {
    return (
      <div className="game-card">
        <div className="py-10 text-center text-gray-300">{LOADING_MESSAGES.DATA}</div>
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
    const refreshOverview = async () => {
      if (!coord) return;
      // structures
      try {
        setPublicBuildingsError(null);
        const res = await gameApi.getBaseStructures(coord);
        if (res.success && res.data) {
          const displayBuildings: ClientBuilding[] = res.data.items.map((item: any) => ({
            ...item,
            displayName: item.name,
            catalogKey: item.key,
            level: item.currentLevel,
            isActive: true,
            _id: `${coord}-${item.key}`,
            type: item.type || 'unknown',
            empireId: undefined,
            locationCoord: coord
          }));
          // Only show built structures on overview
          setPublicBuildings(displayBuildings.filter(b => Number(b.level) > 0));
        } else {
          setPublicBuildings([]);
          setPublicBuildingsError(res.error || 'Failed to load buildings');
        }
      } catch {
        setPublicBuildings([]);
        setPublicBuildingsError('Network error while loading buildings');
      }
      // defenses
      try {
        setPublicDefensesError(null);
        const dres = await gameApi.getBaseDefenses(coord);
        if (dres.success && dres.data) {
          const items = dres.data.defenseLevels || [];
          setPublicDefenses(
            items
              .filter((x: any) => Number(x.level) > 0)
              .map((x: any) => ({ key: x.key, name: x.name, level: x.level, energyDelta: x.energyDelta }))
          );
        } else {
          setPublicDefenses([]);
          setPublicDefensesError(dres.error || 'Failed to load defenses');
        }
      } catch {
        setPublicDefenses([]);
        setPublicDefensesError('Network error while loading defenses');
      }
      // fleets (shared via enhanced store)
      await gameActions.loadFleetsForBase(coord);
    };

    const testFleetLoad = async () => {
      console.log('[BasePage] ðŸ§ª MANUAL FLEET LOAD TEST for:', coord);
      if (coord) {
        await gameActions.loadFleetsForBase(coord);
        console.log('[BasePage] ðŸ§ª MANUAL FLEET LOAD COMPLETE');
      }
    };

    return (
      <div className="space-y-6">
        {/* Temporary debug panel */}
        <FleetDebug />
        
        {/* Manual test button */}
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={testFleetLoad}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow-lg font-bold"
          >
            ðŸ§ª TEST FLEET LOAD
          </button>
        </div>
        
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
              â† Back
            </button>
          </div>
        </div>
        <BaseDetail
          base={baseObj}
          onBack={() => navigate(-1)}
          initialActivePanel={initialPanel}
          onPanelChange={handlePanelChange}
          fleets={(coord && gameState?.fleets?.itemsByCoord?.[coord]) || []}
          fleetsError={(coord && gameState?.fleets?.errorByCoord?.[coord]) || null}
          fleetsLoading={!!(coord && gameState?.fleets?.loadingByCoord?.[coord])}
          buildings={publicBuildings}
          defenses={publicDefenses}
          buildingsError={publicBuildingsError}
          onRefreshBuildings={refreshOverview}
          onRefreshFleets={async () => { if (coord) await gameActions.loadFleetsForBase(coord); }}
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
            â† Back
          </button>
        </div>
        <div className="text-sm text-gray-300">
          Owner: <span className="text-empire-gold">{ownerUsername ?? 'â€”'}</span>
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
              main={(() => {
                // Use rawBalance (current energy without reservations) when available
                // This matches what the breakdown modal shows
                const value = baseStats.energy.rawBalance ?? baseStats.energy.balance ?? 0;
                const cls = value >= 0 ? 'text-green-300' : 'text-red-300';
                return <span className={cls}>{Number(value).toLocaleString()}</span>;
              })()}
              sub={
                <span>
                  +{baseStats.energy.produced.toLocaleString()} prod {' '}âˆ’{baseStats.energy.consumed.toLocaleString()} cons
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
          <div className={LAYOUT_CLASSES.FLEX_CENTER}>
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
        <h3 className="text-lg font-semibold text-empire-gold mb-3">{GAME_TEXT.FLEETS}</h3>
        {(coord && gameState?.fleets?.errorByCoord?.[coord]) && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 mb-3">
            {coord && gameState?.fleets?.errorByCoord?.[coord]}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-gray-300">
              <tr className="border-b border-gray-700">
                <th className="text-left py-1 pr-4">{GAME_TEXT.FLEET}</th>
                <th className="text-left py-1 pr-4">Player</th>
                <th className="text-left py-1 pr-4">Arrival</th>
                <th className="text-left py-1 pr-4">{GAME_TEXT.STATUS}</th>
                <th className="text-right py-1">Size</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {(coord && gameState?.fleets?.itemsByCoord?.[coord] || []).map((fleet: any) => (
                <tr key={fleet._id} className="border-b border-gray-800/60">
                  <td className="py-1 pr-4 text-blue-300 hover:text-blue-200 cursor-default">{fleet.name}</td>
                  <td className="py-1 pr-4 text-gray-200">{fleet.ownerName}</td>
                  <td className="py-1 pr-4 text-gray-300">{fleet.arrival ? <Countdown arrival={fleet.arrival} /> : ''}</td>
                  <td className="py-1 pr-4">{fleet.arrival ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Incoming</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">Stationed</span>
                  )}</td>
                  <td className="py-1 text-right font-mono">{fleet.sizeCredits.toLocaleString()}</td>
                </tr>
              ))}
              {(((coord && gameState?.fleets?.itemsByCoord?.[coord]) || []).length === 0) && !(coord && gameState?.fleets?.errorByCoord?.[coord]) && (
                <tr>
                  <td colSpan={5} className="py-3 text-center text-gray-400">No fleets detected in orbit.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Structures */}
      <div className="game-card">
        <h3 className="text-lg font-semibold text-empire-gold mb-3">{GAME_TEXT.BUILDINGS}</h3>
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
                  <th className="text-left py-1 pr-4">{GAME_TEXT.BUILDINGS}</th>
                  <th className="text-right py-1">{GAME_TEXT.LEVEL}</th>
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
                    <th className="text-left py-1 pr-4">{GAME_TEXT.BUILDINGS}</th>
                    <th className="text-right py-1">{GAME_TEXT.LEVEL}</th>
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
                    <th className="text-right py-1">{GAME_TEXT.LEVEL}</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {publicDefenses.length > 0 ? (
                    publicDefenses.map((d, i) => (
                      <tr key={`${d.key}-${i}`} className="border-b border-gray-800/60">
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
              {publicDefensesError && (
                <div className="mt-2 p-2 text-sm bg-red-900/50 border border-red-700 rounded text-red-200">{publicDefensesError}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasePage;


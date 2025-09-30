import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gameApi } from '../../stores/services/gameApi';
import { useModalStore } from '../../stores/modalStore';
import type { CapacityResult } from '@game/shared';

// Type for location data from the API
type UniverseLocationData = any;  // Using any for now since we're using gameApi
type BaseStatsDTO = any;          // Using any for now since we're using gameApi

type PlanetInfoBlockProps = {
  coord: string; // Full coordinate like A00:10:22:10
  showLinkToPlanetPage?: boolean;
  showBudgets?: boolean;
  refreshKey?: number;
};

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
};

const PlanetInfoBlock: React.FC<PlanetInfoBlockProps> = ({ coord, showLinkToPlanetPage = true, showBudgets = true, refreshKey }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UniverseLocationData | null>(null);
  const [caps, setCaps] = useState<{ construction?: number; production?: number; research?: number; citizen?: number } | null>(null);
  const [capResults, setCapResults] = useState<{
    construction: CapacityResult;
    production: CapacityResult;
    research: CapacityResult;
    citizen?: CapacityResult;
  } | null>(null);
  const [baseStats, setBaseStats] = useState<BaseStatsDTO | null>(null);
  const { openModal } = useModalStore();

  const fmt = (n: number | undefined | null) => {
    const val = typeof n === 'number' ? n : 0;
    const display = Math.round(val * 10) / 10;
    return (
      <span className="font-mono" title={val.toFixed(2)}>
        {display.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        <span className="text-gray-400"> cred./h</span>
      </span>
    );
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setData(null);
    setCaps(null);
    setCapResults(null);
    setBaseStats(null);

    // Fetch all data in parallel using gameApi
    const loadData = async () => {
      try {
        const [locationRes, capacitiesRes, baseStatsRes] = await Promise.all([
          gameApi.getLocationByCoord(coord),
          gameApi.getCapacities(coord),
          gameApi.getBaseStats(coord)
        ]);

        if (!mounted) return;

        // Handle location data
        if (locationRes.success && locationRes.data) {
          setData(locationRes.data);
        } else {
          setError(locationRes.error || 'Failed to load planet info.');
        }

        // Handle capacities data
        if (capacitiesRes.success && capacitiesRes.data) {
          const d = capacitiesRes.data;
          setCapResults(d as any);
          setCaps({
            construction: d.construction?.value ?? 0,
            production: d.production?.value ?? 0,
            research: d.research?.value ?? 0,
            citizen: d.citizen?.value ?? 0,
          });
        }

        // Handle base stats data
        if (baseStatsRes.success && baseStatsRes.data) {
          setBaseStats(baseStatsRes.data);
        }
      } catch (err) {
        if (mounted) {
          setError('Network error while loading planet info.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [coord, refreshKey]);

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-3 text-empire-gold">🪐 Planet Information</h3>

      {/* States */}
      {loading && <div className="text-gray-400 text-sm">Loading planet data...</div>}
      {error && (
        <div className="p-2 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Details */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Row label="Type" value={data?.type}></Row>
            <Row label="Owner" value={data?.owner?.username ?? 'Unclaimed'}></Row>
            {typeof data?.orbitPosition === 'number' && <Row label="Orbit Pos" value={data?.orbitPosition}></Row>}
            <Row label="Terrain" value={data?.terrain?.type}></Row>
            {typeof data?.result?.area === 'number' && (
              <Row label="Area" value={data?.result?.area}></Row>
            )}
          </div>

          <div className="space-y-1.5">
            {typeof data?.result?.solarEnergy === 'number' && (
              <Row label="Solar Energy" value={data?.result?.solarEnergy}></Row>
            )}
            {typeof data?.result?.fertility === 'number' && (
              <Row label="Fertility" value={data?.result?.fertility}></Row>
            )}
            {typeof data?.result?.yields?.metal === 'number' && (
              <Row label="Metal" value={data.result.yields.metal} />
            )}
            {typeof data?.result?.yields?.crystals === 'number' && (
              <Row label="Crystal" value={data.result.yields.crystals} />
            )}
            {typeof data?.result?.yields?.gas === 'number' && (
              <Row label="Gas" value={data.result.yields.gas} />
            )}
          </div>

          {/* Economy and income (mocked) */}
          <div className="md:col-span-2 space-y-1.5 pt-1 border-t border-gray-700">
            <Row
              label="Economy"
              value={fmt(baseStats?.ownerIncomeCredPerHour ?? 0)}
            />
            <Row
              label="Owner Income"
              value={
                <span className="font-mono">
                  {Math.round(baseStats?.ownerIncomeCredPerHour ?? 0).toLocaleString()}
                  <span className="text-gray-400"> cred./h</span>
                </span>
              }
            />
          </div>

          {/* Income breakdown */}
          <div className="md:col-span-2 space-y-1.5">
            <Row
              label="Construction"
              value={fmt(caps?.construction)}
            />
            <Row
              label="Production"
              value={fmt(caps?.production)}
            />
            <Row
              label="Research"
              value={fmt(caps?.research)}
            />
            <Row
              label="Citizen"
              value={fmt(caps?.citizen)}
            />
            <div className="text-right">
              <button
                onClick={() => {
                  if (capResults) {
                    openModal('capacity_breakdown', { coord, capacities: capResults });
                  }
                }}
                className="text-sm text-blue-400 hover:text-blue-300"
                title="View detailed capacity sources"
              >
                View breakdown ⟶
              </button>
            </div>
          </div>

          {/* Base Budgets */}
          {showBudgets && baseStats && (
            <div className="md:col-span-2 space-y-1.5 pt-1 border-t border-gray-700">
              <Row
                label="Area Usage"
                value={
                  <span className="font-mono">
                    {baseStats.area.used.toLocaleString()} / {baseStats.area.total.toLocaleString()}
                    <span className="text-gray-400"> (free {baseStats.area.free.toLocaleString()})</span>
                  </span>
                }
              />
              <Row
                label="Energy Balance"
                value={
                  <span className="font-mono">
                    +{baseStats.energy.produced.toLocaleString()}
                    <span className="text-gray-400"> prod</span>
                    {'  '}
                    −{baseStats.energy.consumed.toLocaleString()}
                    <span className="text-gray-400"> cons</span>
                    {'  '}
                    ={' '}
                    <span className={(baseStats.energy.rawBalance ?? baseStats.energy.balance ?? 0) >= 0 ? 'text-green-300' : 'text-red-300'}>
                      {(baseStats.energy.rawBalance ?? baseStats.energy.balance ?? 0).toLocaleString()}
                    </span>
                  </span>
                }
              />
              <Row
                label="Population"
                value={
                  <span className="font-mono">
                    {baseStats.population.used.toLocaleString()} / {baseStats.population.capacity.toLocaleString()}
                    <span className="text-gray-400"> (free {baseStats.population.free.toLocaleString()})</span>
                  </span>
                }
              />
            </div>
          )}

          {/* Star-specific fallback details if this coord points to a star */}
          {data?.starOverhaul?.kind && (
            <div className="md:col-span-2 text-sm text-gray-400">
              Star Kind: <span className="text-white">{data.starOverhaul.kind}</span>
            </div>
          )}
          {data?.starProperties && (
            <div className="md:col-span-2 text-xs text-gray-400">
              Star: class {data.starProperties.spectralClass}, {data.starProperties.temperatureK}K
            </div>
          )}
        </div>
      )}

      {/* Link to full page */}
      {!loading && !error && showLinkToPlanetPage && (
        <div className="mt-3 text-right">
          <Link
            to={`/planet/${encodeURIComponent(coord)}`}
            className="text-sm text-blue-400 hover:text-blue-300"
            title="Open full planet view"
          >
            View Planet ⟶
          </Link>
        </div>
      )}
    </div>
  );
};

export default PlanetInfoBlock;

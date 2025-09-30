import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { isValidCoordinate, parseCoord } from '@game/shared';
import useUniverseMapStore from '../../stores/universeMapStore';
import { gameApi } from '../../stores/services/gameApi';
import PlanetVisual from './PlanetVisual';

// Type definitions
type UniverseLocationData = any;

const PlanetPage: React.FC = () => {
  const navigate = useNavigate();
  const { coord } = useParams<{ coord: string }>();
  const { navigateToUniverse, navigateToGalaxy, navigateToRegion, navigateToSystem } = useUniverseMapStore();

  const isValid = !!coord && isValidCoordinate(coord);
  const components = useMemo(() => (isValid ? parseCoord(coord!) : null), [coord, isValid]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UniverseLocationData | null>(null);

  useEffect(() => {
    if (!isValid) {
      setLoading(false);
      setError('Invalid coordinate format. Expected A00:10:22:10');
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);
    gameApi.getLocationByCoord(coord!)
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.error || 'Unable to load data.');
        }
      })
      .catch(() => {
        if (mounted) setError('Network error occurred while loading data.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [coord, isValid]);

  const goUniverse = () => {
    navigateToUniverse();
    navigate('/universe');
  };
  const goGalaxy = () => {
    if (!components) return;
    navigateToGalaxy(components.galaxy);
    navigate('/galaxy');
  };
  const goRegion = () => {
    if (!components) return;
    navigateToRegion(components.galaxy, components.region);
    navigate('/galaxy');
  };
  const goSystem = () => {
    if (!components) return;
    navigateToSystem(components.galaxy, components.region, components.system);
    navigate('/galaxy');
  };

  // Visual now handled by PlanetVisual which reads terrain/type and serves
  // images from assets/planets via Vite publicDir. Removed gradient placeholder.

  // Type-aware display labels derived from API type and coordinate
  const bodyLabel = components ? components.body.toString().padStart(2, '0') : '';
  const apiType = data?.type; // 'planet' | 'asteroid' | 'star' | undefined
  const inferredType = apiType ?? (components?.body === 0 ? 'star' : undefined);
  const displayType =
    inferredType ?? ((loading || !!error) ? 'body' : 'body'); // generic fallback to avoid misleading labels
  const displayName =
    displayType === 'star'
      ? 'Star'
      : displayType === 'planet'
      ? `Planet ${bodyLabel}`
      : displayType === 'asteroid'
      ? `Asteroid ${bodyLabel}`
      : (components ? `Body ${bodyLabel}` : 'Body');

  return (
    <div className="space-y-6">
      {/* Header with breadcrumbs */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {displayName}
            </h1>
            <p className="text-sm text-gray-400">
              {isValid ? `A${components!.galaxy.toString().padStart(2, '0')}:${components!.region
                .toString()
                .padStart(2, '0')}:${components!.system.toString().padStart(2, '0')}:${components!.body
                .toString()
                .padStart(2, '0')}` : coord || 'Unknown'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
              onClick={() => navigate(-1)}
              title="Go Back"
            >
              ← Back
            </button>
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={goSystem}
              title="Back to System"
            >
              ⭯ System
            </button>
          </div>
        </div>

        {/* Breadcrumbs */}
        {components && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button className="text-blue-400 hover:text-blue-200" onClick={goUniverse}>Universe</button>
            <span className="text-gray-500">›</span>
            <button className="text-blue-400 hover:text-blue-200" onClick={goGalaxy}>
              Galaxy C{components.galaxy.toString().padStart(2, '0')}
            </button>
            <span className="text-gray-500">›</span>
            <button className="text-blue-400 hover:text-blue-200" onClick={goRegion}>
              Region {components.region.toString().padStart(2, '0')}
            </button>
            <span className="text-gray-500">›</span>
            <button className="text-blue-400 hover:text-blue-200" onClick={goSystem}>
              System {components.system.toString().padStart(2, '0')}
            </button>
            <span className="text-gray-500">›</span>
            <span className="text-gray-300">{displayName}</span>
          </div>
        )}

        {!isValid && (
          <div className="mt-3 text-red-400">
            Invalid coordinate format. Expected A00:10:22:10
          </div>
        )}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Planet Visual */}
        <div className="game-card flex items-center justify-center">
          {isValid ? (
            <PlanetVisual coord={coord!} className="w-64 h-64 md:w-80 md:h-80" />
          ) : (
            <div
              className="w-64 h-64 md:w-80 md:h-80 rounded-full shadow-lg bg-gray-700/60"
              aria-label="Planet preview unavailable"
            />
          )}
        </div>

        {/* Planet Details */}
        <div className="game-card">
          <h2 className="text-xl font-semibold text-white mb-4">
            {displayType === 'star'
              ? 'Star Information'
              : displayType === 'planet'
              ? 'Planet Information'
              : displayType === 'asteroid'
              ? 'Asteroid Information'
              : 'Body Information'}
          </h2>

          {loading ? (
            <div className="text-gray-400">Loading data...</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <div className="space-y-2 text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span className="text-white">{data?.type ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Owner</span>
                <span className="text-white">{data?.owner?.username ?? 'Unclaimed'}</span>
              </div>

              {/* Overhaul data (terrain/orbit/solar/fertility/yields/area; star info if available) */}
              {(data?.terrain || typeof data?.orbitPosition === 'number' || data?.result) && (
                <>
                  {data?.terrain?.type && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Terrain</span>
                      <span className="text-white">{data.terrain.type}</span>
                    </div>
                  )}
                  {typeof data?.orbitPosition === 'number' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Orbit Pos</span>
                      <span className="text-white">{data.orbitPosition}</span>
                    </div>
                  )}
                  {typeof data?.result?.solarEnergy === 'number' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Solar Energy</span>
                      <span className="text-white">{data.result.solarEnergy}</span>
                    </div>
                  )}
                  {typeof data?.result?.fertility === 'number' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fertility</span>
                      <span className="text-white">{data.result.fertility}</span>
                    </div>
                  )}
                  {data?.result?.yields && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Yields (M/G/C)</span>
                      <span className="text-white">
                        {data.result.yields.metal}/{data.result.yields.gas}/{data.result.yields.crystals}
                      </span>
                    </div>
                  )}
                  {typeof data?.result?.area === 'number' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Area</span>
                      <span className="text-white">{data.result.area}</span>
                    </div>
                  )}
                  {data?.starOverhaul?.kind && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Star Kind</span>
                      <span className="text-white">{data.starOverhaul.kind}</span>
                    </div>
                  )}
                </>
              )}

              {/* Star properties (fallback if coord points to star) */}
              {data?.starProperties && (
                <div className="mt-3 text-sm text-gray-400">
                  Star: class {data.starProperties.spectralClass}, {data.starProperties.temperatureK}K
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bases / Action area */}
      {data?.owner ? (
        <div className="game-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-indigo-900/60 to-indigo-700/40 border border-indigo-500/60">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-200">Base</th>
                  <th className="px-3 py-2 text-left text-gray-200">Owner</th>
                  <th className="px-3 py-2 text-left text-gray-200">Occupier</th>
                  <th className="px-3 py-2 text-right text-gray-200">Economy</th>
                </tr>
              </thead>
              <tbody className="border border-indigo-500/40">
                <tr className="border-t border-indigo-500/30">
                  <td className="px-3 py-2">
                    <Link
                      to={`/base/${encodeURIComponent(coord!)}`}
                      className="text-blue-300 underline decoration-dotted hover:text-blue-200"
                      title="Open base page"
                    >
                      Home Planet h
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-empire-gold">
                    {data?.owner?.username ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-300">—</td>
                  <td className="px-3 py-2 text-right text-yellow-300 font-mono">0 / 0</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-center">
            <span className="text-yellow-300 hover:text-yellow-200 cursor-default">
              Move fleet here
            </span>
          </div>
        </div>
      ) : (
        <div className="game-card">
          <div className="py-4 text-center">
            <span className="text-yellow-300 hover:text-yellow-200 cursor-default">
              Move fleet here
            </span>
          </div>
        </div>
      )}

    </div>
  );
};

export default PlanetPage;

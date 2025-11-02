import React, { useState, useEffect } from 'react';
import { Empire, getColonizationCost } from '@game/shared';
import { useNavigate } from 'react-router-dom';
import { useModalStore } from '../../stores/modalStore';
import { useEnhancedAppStore } from '../../stores/enhancedAppStore';
import { LAYOUT_CLASSES } from '../../constants/css-constants';

// Enhanced store compatible types
interface UniverseLocationData {
  coord: string;
  type: 'planet' | 'asteroid' | 'star';
  result?: {
    fertility: number;
    solarEnergy: number;
    yields: {
      metal: number;
      gas: number;
      crystals: number;
    };
    area?: number;
  };
  owner: { id: string; username: string } | null;
  terrain?: {
    type: string;
  };
  orbitPosition?: number;
  starOverhaul?: {
    kind: string;
  };
  context?: {
    server: string;
    galaxy: number;
    region: number;
    system: number;
    body: number;
  };
}


interface Territory {
  coord: string;
  type: 'planet' | 'asteroid';
  result?: {
    fertility: number;
    solarEnergy: number;
    yields: {
      metal: number;
      gas: number;
      crystals: number;
    };
  };
  owner: string;
}

interface GalaxyModalProps {
  empire: Empire;
  onUpdate: () => void;
}

const GalaxyModal: React.FC<GalaxyModalProps> = ({ empire, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'territories' | 'explore' | 'colonize' | 'map'>('map');
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [coordinateInput, setCoordinateInput] = useState('');
  const [locationData, setLocationData] = useState<UniverseLocationData | null>(null);
  const [colonyName, setColonyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get progressive colonization cost based on empire base count
  const colonizationCostCredits = getColonizationCost(empire.baseCount || 0, empire.hasDeletedBase || false);

  const navigate = useNavigate();
  const { closeModal } = useModalStore();
  
  // Enhanced store access for API calls
  const services = useEnhancedAppStore((state) => state.services);
  const gameApi = services?.gameApi;

  // Fetch empire territories
  const fetchTerritories = async () => {
    if (!gameApi?.getTerritories) {
      setError('Territories API not available');
      return;
    }
    
    try {
      const response = await gameApi.getTerritories();
      if (response.success) {
        setTerritories(response.data.territories || []);
      } else {
        setError(response.error || 'Failed to load territories');
      }
    } catch (err) {
      console.error('Error fetching territories:', err);
      setError('Failed to load territories');
    }
  };

  // Search for location
  const handleLocationSearch = async () => {
    const coord = coordinateInput.trim().toUpperCase();
    if (!coord) {
      setError('Please enter a coordinate');
      return;
    }
    const isValid = /^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$/.test(coord);
    if (!isValid) {
      setError('Invalid coordinate format. Use A00:10:22:10');
      return;
    }

    setLoading(true);
    setError(null);
    setLocationData(null);

    if (!gameApi?.getLocationByCoord) {
      setError('Location search API not available');
      setLoading(false);
      return;
    }

    try {
      const resp = await gameApi.getLocationByCoord(coord);
      if (resp.success && resp.data) {
        setLocationData(resp.data);
      } else {
        setLocationData(null);
        setError(resp.error || 'Location not found');
      }
    } catch (err: any) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Colonize location
  const handleColonize = async () => {
    if (!locationData) {
      setError('No location selected');
      return;
    }

    if (!colonyName.trim()) {
      setError('Please enter a colony name');
      return;
    }

    if (locationData.owner) {
      setError('Location is already owned');
      return;
    }

    // Check if empire can afford colonization (credits only)
    const canAfford = empire.resources.credits >= colonizationCostCredits;

    if (!canAfford) {
      setError('Insufficient resources for colonization');
      return;
    }

    if (!gameApi?.colonizeLocation) {
      setError('Colonization API not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await gameApi.colonizeLocation(locationData.coord, colonyName.trim());

      if (response.success) {
        await fetchTerritories();
        onUpdate(); // Update dashboard
        setActiveTab('territories');
        setLocationData(null);
        setColonyName('');
        setCoordinateInput('');
      } else {
        setError(response.error || 'Failed to colonize location');
      }
    } catch (err: any) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate random coordinate for exploration
  const generateRandomCoordinate = () => {
    const servers = ['A', 'B', 'C'];
    const server = servers[Math.floor(Math.random() * servers.length)];
    const galaxy = Math.floor(Math.random() * 10).toString().padStart(2, '0');
    const region = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const system = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const body = Math.floor(Math.random() * 20).toString().padStart(2, '0');
    
    return `${server}${galaxy}:${region}:${system}:${body}`;
  };

  // Get location type icon
  const getLocationIcon = (type: string) => {
    return type === 'planet' ? 'ðŸŒ' : 'â˜„ï¸';
  };

  // Get fertility color
  const getFertilityColor = (fertility: number) => {
    if (fertility >= 8) return 'text-green-400';
    if (fertility >= 6) return 'text-yellow-400';
    if (fertility >= 4) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get resource quality color
  const getResourceColor = (value: number) => {
    if (value >= 8) return 'text-green-400';
    if (value >= 6) return 'text-yellow-400';
    if (value >= 4) return 'text-orange-400';
    return 'text-red-400';
  };

  // Check if empire can afford colonization (credits only)
  const canAffordColonization = () => {
    return empire.resources.credits >= colonizationCostCredits;
  };

  useEffect(() => {
    fetchTerritories();
  }, []);

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg">
        <button
          onClick={() => {
            closeModal();
            navigate('/galaxy');
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'map'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600'
          }`}
        >
          ðŸ—ºï¸ Universe Map
        </button>
        <button
          onClick={() => setActiveTab('territories')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'territories'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600'
          }`}
        >
          ðŸ›ï¸ My Territories
        </button>
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'explore'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600'
          }`}
        >
          ðŸ” Explore
        </button>
        <button
          onClick={() => setActiveTab('colonize')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'colonize'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-600'
          }`}
        >
          ðŸš€ Colonize
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
          {error}
        </div>
      )}

      {/* Tab Content */}

      {activeTab === 'territories' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Empire Territories</h3>
          
          <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
            <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
              <span className="text-gray-300">Total Territories:</span>
              <span className="text-blue-400 font-mono text-lg">
                {territories.length}
              </span>
            </div>
          </div>

          {territories.length === 0 ? (
            <p className="text-gray-400">No territories found. Start exploring to find new worlds to colonize!</p>
          ) : (
            <div className="space-y-3">
              {territories.map((territory) => (
                <div key={territory.coord} className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white flex items-center gap-2">
                      {getLocationIcon(territory.type)} {territory.coord}
                    </h4>
                    <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded capitalize">
                      {territory.type}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Fertility:</span>
                      <div className={`font-mono ${getFertilityColor(territory.result?.fertility || 0)}`}>
                        {territory.result?.fertility || 'â€”'}/10
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Solar Energy:</span>
                      <div className={`font-mono ${getResourceColor(territory.result?.solarEnergy || 0)}`}>
                        {territory.result?.solarEnergy || 'â€”'}/10
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'explore' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Galaxy Explorer</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Enter Coordinate (Format: A00:10:22:10)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={coordinateInput}
                  onChange={(e) => setCoordinateInput(e.target.value.toUpperCase())}
                  placeholder="A00:10:22:10"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={12}
                />
                <button
                  onClick={handleLocationSearch}
                  disabled={loading || !coordinateInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Searching...' : 'Explore'}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCoordinateInput(generateRandomCoordinate())}
                className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
              >
                ðŸŽ² Random Location
              </button>
              <button
                onClick={() => setCoordinateInput(empire.homeSystem || '')}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                ðŸ  Home System
              </button>
            </div>
            
            {locationData && (
              <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                <h4 className="font-semibold mb-3 text-blue-400 flex items-center gap-2">
                  {getLocationIcon(locationData.type)} Location Details
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p><span className="text-gray-400">Coordinate:</span> {locationData.coord}</p>
                    <p><span className="text-gray-400">Type:</span> <span className="capitalize">{locationData.type}</span></p>
                    <p>
                      <span className="text-gray-400">Fertility:</span> 
                      <span className="ml-1 text-gray-200">
                        {locationData.result?.fertility ?? 'â€”'}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-400">Owner:</span> 
                      <span className={locationData.owner ? 'text-red-400' : 'text-green-400'}>
                        {locationData.owner ? locationData.owner.username : 'Unowned'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Overhaul:</p>
                    <p className="text-gray-200">
                      Terrain: {locationData.terrain?.type ?? 'â€”'}
                    </p>
                    <p className="text-gray-200">
                      Orbit Pos: {locationData.orbitPosition ?? 'â€”'}
                    </p>
                    <p className="text-gray-200">
                      Solar Energy: {locationData.result?.solarEnergy ?? 'â€”'}
                    </p>
                    {locationData.result?.yields && (
                      <p className="text-gray-200">
                        Yields (M/G/C): {locationData.result.yields.metal}/{locationData.result.yields.gas}/{locationData.result.yields.crystals}
                      </p>
                    )}
                    {typeof locationData.result?.area === 'number' && (
                      <p className="text-gray-200">Area: {locationData.result.area}</p>
                    )}
                    {locationData.starOverhaul?.kind && (
                      <p className="text-yellow-300">Star Kind: {locationData.starOverhaul.kind}</p>
                    )}
                  </div>
                </div>
                
                {locationData.context && (
                  <div className="text-xs text-gray-400 border-t border-gray-600 pt-3">
                    Galaxy {locationData.context.galaxy} â€¢ Region {locationData.context.region} â€¢ System {locationData.context.system} â€¢ Body {locationData.context.body}
                  </div>
                )}

                {!locationData.owner && (
                  <button
                    onClick={() => {
                      setActiveTab('colonize');
                      setCoordinateInput(locationData.coord);
                    }}
                    className="w-full mt-3 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                  >
                    ðŸš€ Colonize This Location
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'colonize' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Establish New Colony</h3>
          
          {/* Colonization Cost Display */}
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <h4 className="font-medium text-white mb-3">Colonization Cost</h4>
            <div className="text-center">
              <div className={empire.resources.credits >= colonizationCostCredits ? 'text-yellow-400' : 'text-red-400'}>
                ðŸ’° {colonizationCostCredits.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Credits</div>
              <div className="text-xs text-gray-500 mt-2">
                Base #{(empire.baseCount || 0) + 1} â€¢ {empire.hasDeletedBase ? '25% Discount Applied' : 'No Discount'}
              </div>
            </div>
            
            {!canAffordColonization() && (
              <div className="mt-3 p-2 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
                âš ï¸ Insufficient resources for colonization
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Target Location Coordinate
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={coordinateInput}
                  onChange={(e) => setCoordinateInput(e.target.value.toUpperCase())}
                  placeholder="A00:10:22:10"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={12}
                />
                <button
                  onClick={handleLocationSearch}
                  disabled={loading || !coordinateInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Checking...' : 'Check'}
                </button>
              </div>
            </div>

            {locationData && (
              <>
                <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                  <h4 className="font-semibold mb-3 text-blue-400">Target Location</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><span className="text-gray-400">Coordinate:</span> {locationData.coord}</p>
                      <p><span className="text-gray-400">Type:</span> <span className="capitalize">{locationData.type}</span></p>
                      <p>
                        <span className="text-gray-400">Status:</span> 
                        <span className={locationData.owner ? 'text-red-400' : 'text-green-400'}>
                          {locationData.owner ? 'Owned' : 'Available'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">Overhaul:</p>
                      <p className="text-gray-200">
                        Fertility: {locationData.result?.fertility ?? 'â€”'}
                      </p>
                      {locationData.result?.yields && (
                        <p className="text-gray-200">
                          Yields (M/G/C): {locationData.result.yields.metal}/{locationData.result.yields.gas}/{locationData.result.yields.crystals}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {!locationData.owner && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Colony Name
                    </label>
                    <input
                      type="text"
                      value={colonyName}
                      onChange={(e) => setColonyName(e.target.value)}
                      placeholder="Enter colony name..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                      maxLength={30}
                    />
                    
                    <button
                      onClick={handleColonize}
                      disabled={loading || !colonyName.trim() || !canAffordColonization()}
                      className={`w-full mt-3 py-3 px-4 rounded-md font-medium transition-colors ${
                        canAffordColonization() && colonyName.trim()
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {loading ? 'Establishing Colony...' : 'ðŸš€ Establish Colony'}
                    </button>
                  </div>
                )}

                {locationData.owner && (
                  <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
                    This location is already owned by {locationData.owner.username}. Find another location to colonize.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GalaxyModal;


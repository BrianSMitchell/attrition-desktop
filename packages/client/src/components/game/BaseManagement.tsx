import React, { useEffect, useState } from 'react';
import { useBaseStore } from '../../stores/baseStore';
import { Empire } from '@game/shared';
import { gameApi } from '../../stores/services/gameApi';
import BaseOverview from './BaseOverview';
import BaseDetail from './BaseDetail';

interface BaseManagementProps {
  empire: Empire;
  onUpdate: () => void;
}

const BaseManagement: React.FC<BaseManagementProps> = ({ empire }) => {
  const { 
    selectedBaseId, 
    bases, 
    loading, 
    error,
    setSelectedBase,
    setBases,
    setLoading,
    setError,
    getSelectedBase
  } = useBaseStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'detail'>('overview');

  // Fetch all bases for the empire
  const fetchBases = async () => {
    if (!empire) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch colonies
      const coloniesResponse = await gameApi.getTerritories();
      if (!coloniesResponse.success) {
        throw new Error(coloniesResponse.error || 'Failed to fetch territories');
      }

      const territories = coloniesResponse.data.territories;
      
      // For each territory, fetch buildings and calculate production
      const basesData = await Promise.all(
        territories.map(async (territory: any) => {
          try {
            // Fetch buildings for this location
            const buildingsResponse = await gameApi.getBuildingsByLocation(territory.coord);
            const buildings = buildingsResponse.success ? buildingsResponse.data.buildings : [];


            // Minimal base shape for UI; cast as any to satisfy store typing
            const base: any = {
              _id: territory._id ?? territory.coord,
              name: territory.name ?? territory.coord,
              locationCoord: territory.coord,
              buildings
            };

            return base;
          } catch (error) {
            console.error(`Error fetching buildings for ${territory.coord}:`, error);
            return null;
          }
        })
      );
      // Filter out any failed requests
      const validBases = basesData.filter(base => base !== null);
      setBases(validBases);
      
      // If no base is selected and we have bases, select the first one
      if (!selectedBaseId && validBases.length > 0) {
        setSelectedBase(validBases[0]._id);
        setActiveTab('detail');
      }
      
    } catch (err) {
      console.error('Error fetching bases:', err);
      setError('Failed to load bases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  
  // Handle base selection
  const handleBaseSelect = (baseId: string) => {
    setSelectedBase(baseId);
    setActiveTab('detail');
  };

  // Handle tab change
  const handleTabChange = (tab: 'overview' | 'detail') => {
    setActiveTab(tab);
    if (tab === 'overview') {
      setSelectedBase(null);
    }
  };

  useEffect(() => {
    if (empire) {
      fetchBases();
    }
  }, [empire]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading bases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-card">
        <div className="text-center">
          <div className="text-red-400 mb-4">⚠️ {error}</div>
          <button 
            onClick={fetchBases}
            className="game-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const selectedBase = getSelectedBase();

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-empire-gold">Empire Management</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {bases.length} {bases.length === 1 ? 'Base' : 'Bases'}
            </span>
            <button
              onClick={fetchBases}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-600">
          <button
            onClick={() => handleTabChange('overview')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            All Bases Overview
          </button>
          <button
            onClick={() => handleTabChange('detail')}
            disabled={!selectedBase}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'detail' && selectedBase
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {selectedBase ? `${selectedBase.name}` : 'Select a Base'}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'overview' ? (
        <BaseOverview 
          bases={bases}
          empire={empire}
          onBaseSelect={handleBaseSelect}
          onUpdate={fetchBases}
        />
      ) : selectedBase ? (
        <BaseDetail 
          base={selectedBase}
          onBack={() => handleTabChange('overview')}
          buildings={[]}
          defenses={[]}
        />
      ) : (
        <div className="game-card text-center">
          <p className="text-gray-400 mb-4">No base selected</p>
          <button
            onClick={() => handleTabChange('overview')}
            className="game-button"
          >
            View All Bases
          </button>
        </div>
      )}
    </div>
  );
};

export default BaseManagement;

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useGame, useGameActions, useServiceState } from '../../stores/enhancedAppStore';
import ModalManager from './ModalManager';
import { LAYOUT_CLASSES } from '../../constants/css-constants';
import { LOADING_MESSAGES, GAME_TEXT, ERROR_TEXT, PAGE_TEXT } from '@game/shared';


const Dashboard: React.FC = () => {
  const game = useGame();
  const gameActions = useGameActions();
  const [empireCreationName, setEmpireCreationName] = useState('');
  const [showCreateEmpire, setShowCreateEmpire] = useState(false);

  const dashboardData = game.dashboard?.data;
  const isLoading = game.loading?.dashboard;
  const error = game.dashboard?.error;
  
  // Wait for both services and game state to be ready
  const services = useServiceState();
  const servicesReady = services?.isReady && 
    services.connections?.auth && 
    services.connections?.network && 
    services.connections?.socket;
  
  console.log('ðŸŽ® Dashboard: Service state:', {
    isReady: services?.isReady,
    connections: services?.connections,
    servicesReady
  });

  // Early return if services aren't ready
  if (!servicesReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">{LOADING_MESSAGES.CONNECTING}</p>
        </div>
      </div>
    );
  }

  // Load dashboard data on component mount - run only once
  useEffect(() => {
    console.log('ðŸŽ® Dashboard: Attempting to load dashboard data...');
    gameActions.loadDashboard().catch(error => {
      console.error('âŒ Dashboard: Failed to load dashboard data:', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle empire creation
  const handleCreateEmpire = async () => {
    if (!empireCreationName.trim()) return;

    try {
      const success = await gameActions.createEmpire(empireCreationName);
      if (success) {
        setShowCreateEmpire(false);
        setEmpireCreationName('');
      }
    } catch (err) {
      console.error('Error creating empire:', err);
    }
  };

  // Refresh dashboard data
  const refreshDashboard = useCallback(() => {
    gameActions.loadDashboard();
  }, [gameActions]);

  // Helper to handle both Map and plain object techLevels from server
  const getTechEntries = (tl: any): [string, number][] => {
    if (!tl) return [];
    if (tl instanceof Map) return Array.from(tl.entries());
    if (typeof tl === 'object') return Object.entries(tl as Record<string, number>);
    return [];
  };

  const techEntries = useMemo(
    () => getTechEntries((dashboardData?.empire as any)?.techLevels),
    [dashboardData?.empire]
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <p className="text-lg font-semibold">{ERROR_TEXT.ERROR} Loading {PAGE_TEXT.DASHBOARD}</p>
            <p className="text-sm">{error}</p>
          </div>
          <button 
            onClick={refreshDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show service initialization state
  if (!servicesReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">{LOADING_MESSAGES.CONNECTING}</p>
        </div>
      </div>
    );
  }

  // Show loading state for dashboard data
  if (isLoading || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">{LOADING_MESSAGES.DATA}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="game-card">
        <h1 className="text-2xl font-bold mb-2">
          Welcome to {dashboardData.serverInfo?.name || 'Attrition'}, {dashboardData.user?.username}!
        </h1>
        <p className="text-gray-400">
          {dashboardData.empire
            ? `Home system: ${dashboardData.empire.homeSystem}`
            : 'Setting up your starter base...'}
        </p>
      </div>

      {/* Empire Creation Modal */}
      {showCreateEmpire && (
        <div className="game-card border-2 border-yellow-500">
          <h3 className="text-xl font-semibold mb-4 text-yellow-400">Create Your Empire</h3>
          <p className="text-gray-400 mb-4">
            Welcome, Commander! You're about to establish your space empire. Choose a name that will
            strike fear into your enemies and inspire your allies.
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="empireName" className="block text-sm font-medium mb-2">
                Empire Name
              </label>
              <input
                type="text"
                id="empireName"
                value={empireCreationName}
                onChange={(e) => setEmpireCreationName(e.target.value)}
                placeholder="Enter your empire name..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                maxLength={30}
              />
              <p className="text-xs text-gray-500 mt-1">3-30 characters</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateEmpire}
                disabled={!empireCreationName.trim() || empireCreationName.length < 3 || isLoading}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Establish Empire
              </button>
              <button
                onClick={() => setShowCreateEmpire(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empire Overview */}
      {dashboardData.empire ? (
        <div className="space-y-6">


          {/* Empire Territory & Technology */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Territory Information */}
            <div className="game-card">
              <h3 className="text-lg font-semibold text-green-400 mb-4">🌍 Territory & Home</h3>
              <div className="space-y-3">
                <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
                  <span className="text-gray-300">Home System:</span>
                  <span className="font-mono text-sm">{dashboardData.empire.homeSystem || 'Not set'}</span>
                </div>
                <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
                  <span className="text-gray-300">Territories:</span>
                  <span className="font-mono text-sm">{dashboardData.empire.territories?.length || 0}</span>
                </div>
                <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
                  <span className="text-gray-300">Controlled Systems:</span>
                  <span className="font-mono text-sm">
                    {dashboardData.empire.territories?.length > 0 
                      ? `${dashboardData.empire.territories.slice(0, 3).join(', ')}${dashboardData.empire.territories.length > 3 ? '...' : ''}`
                      : 'None'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Technology Levels */}
            <div className="game-card">
              <h3 className="text-lg font-semibold text-purple-400 mb-4">⚡ Technology</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {techEntries.length > 0 ? (
                  techEntries.map(([tech, level]) => (
                    <div key={tech} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 capitalize">{tech.replace(/_/g, ' ')}:</span>
                      <span className="font-mono">Level {level}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm">No technologies researched</div>
                )}
              </div>
            </div>
          </div>

          {/* Empire Statistics */}
          <div className="game-card">
            <h3 className="text-lg font-semibold text-empire-gold mb-4">📊 {GAME_TEXT.EMPIRE} Statistics</h3>

            <div className="text-sm divide-y divide-gray-700/60">
              <div className="flex items-center justify-between py-1.5">
                <span className="font-medium text-gray-300">{GAME_TEXT.EMPIRE} Name</span>
                <span className="font-mono">{dashboardData.empire.name}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-medium text-gray-300">Player</span>
                <span className="font-mono">{dashboardData.user?.username ?? 'â€”'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-medium text-gray-300">Player ID</span>
                <span className="font-mono">{dashboardData.user?._id ?? 'â€”'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-medium text-gray-300">Level</span>
                <span className="font-mono">
                  {dashboardData.profile ? dashboardData.profile.level.toFixed(2) : '0.00'} <span className="text-gray-400">(Rank 000)</span>
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-medium text-gray-300">Economy Rate</span>
                <span className="font-mono">{dashboardData.profile ? Math.round(dashboardData.profile.economyPerHour) : '0'} cred./h</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-medium text-gray-300">{GAME_TEXT.FLEET} Size</span>
                <span className="font-mono">{dashboardData.profile ? dashboardData.profile.fleetScore : '0'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-medium text-gray-300">Technology Score</span>
                <span className="font-mono">{dashboardData.profile ? dashboardData.profile.technologyScore : '0'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="game-card">
          <h3 className="text-lg font-semibold mb-3 text-yellow-400">Starter Setup</h3>
          <p className="text-gray-400 mb-4">
            Your starter base is being prepared. Please refresh shortly.
          </p>
        </div>
      )}

      {/* Game Tips / Info */}
      <div className="game-card">
        <h3 className="text-lg font-semibold mb-3 text-space-purple">Phase 3 Features - Now Available!</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2 text-green-400">🏗️ {GAME_TEXT.BUILDING} System</h4>
            <p className="text-gray-400">
              Construct mines, factories, research labs, and defense stations. Each building type provides unique benefits and can be upgraded.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-blue-400">⚡ Resource Management</h4>
            <p className="text-gray-400">
              Manage Credits, Metal, Energy, and Research points. Buildings automatically produce resources over time.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-purple-400"> {GAME_TEXT.RESEARCH} System</h4>
            <p className="text-gray-400">
              Advance your empire through Military, Economic, and Exploration technologies for powerful bonuses.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-yellow-400">🌍 Territory Expansion</h4>
            <p className="text-gray-400">
              Colonize new worlds to expand your empire. Each territory can support multiple buildings and colonies.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-md">
          <p className="text-blue-200 text-sm">
            <span className="font-medium">🎮 Real-time Gameplay:</span> Resources update automatically every minute. Buildings complete construction over time. Your empire grows even when you're offline!
          </p>
        </div>
      </div>

      {/* Modal Manager */}
      <ModalManager empire={dashboardData.empire} onUpdate={refreshDashboard} />
    </div>
  );
};

export default Dashboard;


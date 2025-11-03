import React from 'react';
import { useNavigate } from 'react-router-dom';
import FleetManagementPage from '../components/game/fleet/FleetManagementPage';
import { Empire } from '@game/shared';

// Mock empire data for demonstration
const mockEmpire: Empire = {
  _id: 'demo-empire',
  name: 'Demo Empire',
  userId: 'demo-user',
  homeSystem: 'A01:05:23:00',
  territories: ['A01:05:23:01', 'A01:05:23:02', 'A01:07:45:01'],
  baseCount: 3,
  hasDeletedBase: false,
  resources: {
    credits: 1000000
    // Note: Energy is calculated per-base from structures
  },
  lastResourceUpdate: new Date(),
  lastCreditPayout: new Date(),
  creditsRemainderMilli: 0,
  techLevels: new Map(),
  createdAt: new Date(),
  updatedAt: new Date()
};

const FleetManagementDemo: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Demo Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-empire-gold">Fleet Management System Demo</h1>
            <p className="text-gray-400 text-sm mt-1">
              Complete fleet dispatch system with map-based destination selection
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Back to Game
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Refresh Demo
            </button>
          </div>
        </div>
      </div>

      {/* Demo Info Panel */}
      <div className="bg-blue-900/30 border-b border-blue-700 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-blue-200 mb-2">🚀 Fleet Features</h3>
              <ul className="space-y-1 text-blue-300">
                <li>• Real-time fleet data loading</li>
                <li>• Map-based destination selection</li>
                <li>• Accurate travel time calculation</li>
                <li>• Fleet status tracking</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-200 mb-2">🗺️ Map Integration</h3>
              <ul className="space-y-1 text-blue-300">
                <li>• Visual fleet positioning</li>
                <li>• Multi-zoom level display</li>
                <li>• Interactive destination picking</li>
                <li>• Territory validation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-200 mb-2">⚙️ System Integration</h3>
              <ul className="space-y-1 text-blue-300">
                <li>• Real API service calls</li>
                <li>• Live fleet status updates</li>
                <li>• Error handling & fallbacks</li>
                <li>• Production-ready code</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Management Interface */}
      <div className="h-screen">
        <FleetManagementPage empire={mockEmpire} />
      </div>

      {/* Demo Footer */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400 text-sm">
            Fleet Management System v1.0 - Integrated map selection, real-time data, and production APIs
          </p>
          <div className="flex justify-center gap-4 mt-2 text-xs">
            <span className="text-green-400">✓ Real API Integration</span>
            <span className="text-green-400">✓ Map-Based Selection</span>
            <span className="text-green-400">✓ Travel Time Calculation</span>
            <span className="text-green-400">✓ Fleet Visualization</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetManagementDemo;

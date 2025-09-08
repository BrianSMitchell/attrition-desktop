import React from 'react';
import { Empire } from '@game/shared';

interface FleetModalProps {
  empire: Empire;
  onUpdate: () => void;
}

const FleetModal: React.FC<FleetModalProps> = () => {
  // This is a placeholder component for future fleet management features
  return (
    <div className="space-y-4">
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🚀</div>
        <h3 className="text-xl font-semibold text-white mb-2">Fleet Management</h3>
        <p className="text-gray-400 mb-4">
          Fleet management features are coming soon! This will include ship construction, 
          fleet deployment, and interstellar warfare capabilities.
        </p>
        
        <div className="p-4 bg-gray-700 rounded-lg border border-gray-600 text-left">
          <h4 className="font-medium text-white mb-3">Planned Features:</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-blue-400">🔧</span>
              Ship construction and customization
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">⚡</span>
              Fleet deployment and movement
            </li>
            <li className="flex items-center gap-2">
              <span className="text-red-400">⚔️</span>
              Combat and warfare systems
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-400">🛡️</span>
              Defense coordination
            </li>
            <li className="flex items-center gap-2">
              <span className="text-purple-400">🌌</span>
              Exploration missions
            </li>
          </ul>
        </div>

        <div className="mt-6 p-3 bg-blue-900/30 border border-blue-700 rounded-md">
          <p className="text-blue-200 text-sm">
            <span className="font-medium">💡 Tip:</span> Focus on building your economy and research capabilities first. 
            Strong infrastructure will be essential for supporting powerful fleets!
          </p>
        </div>
      </div>
    </div>
  );
};

export default FleetModal;

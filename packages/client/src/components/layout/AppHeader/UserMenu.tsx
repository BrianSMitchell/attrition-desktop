/**
 * User menu component
 * Shows user info and logout button in the header
 */

import React from 'react';
import { useAuth, useUIActions } from '../../../stores/enhancedAppStore';

export const UserMenu: React.FC = () => {
  const auth = useAuth();
  const { addToast } = useUIActions();

  const handleLogout = () => {
    // TODO: Implement proper logout in Phase 2
    addToast({
      type: 'info',
      message: 'Logout functionality will be implemented in Phase 2'
    });
  };

  if (!auth.user) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="text-right">
        <div className="text-sm font-medium">{auth.user.username}</div>
        {auth.empire && (
          <div className="text-xs text-gray-400">{auth.empire.name}</div>
        )}
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        Logout
      </button>
    </div>
  );
};

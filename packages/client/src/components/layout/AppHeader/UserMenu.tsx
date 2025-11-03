/**
 * User menu component
 * Shows user info and logout button in the header
 */

import React from 'react';
import { useAuth, useEnhancedAuthActions, useUIActions } from '../../../stores/enhancedAppStore';

export const UserMenu: React.FC = () => {
  const auth = useAuth();
  const { logoutWithService } = useEnhancedAuthActions();
  const { addToast } = useUIActions();

  const handleLogout = async () => {
    try {
      await logoutWithService();
      
      // Force a full page reload to login to avoid service initialization issues
      // This ensures clean state and prevents the "waiting on services" blank screen
      window.location.href = window.location.protocol === 'file:' 
        ? '#/login'  // Hash routing for desktop
        : '/login';  // Regular routing for web
      
      // Note: Toast won't show because we're doing a hard navigation
      // but that's better than getting stuck on a blank screen
    } catch (error) {
      addToast({
        type: 'error',
        message: 'Logout failed. Please try again.'
      });
    }
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

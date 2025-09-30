/**
 * App header component
 * Contains app title, version, resources, messages, and user menu
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ConnectionStatus } from './ConnectionStatus';
import { UserMenu } from './UserMenu';
import { ResourceDisplay } from '../../ui/data-display/ResourceDisplay';
import { useAuth } from '../../../stores/enhancedAppStore';
import { useModalStore } from '../../../stores/modalStore';
import { useMessageStore } from '../../../stores/messageStore';

export const AppHeader: React.FC = () => {
  const auth = useAuth();
  const { openModal } = useModalStore();
  const { getUnreadCount, loadSummary } = useMessageStore();
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    // Load app version
    const isDesktop = typeof window !== 'undefined' && (window as any).electronAPI;
    if (isDesktop) {
      setAppVersion('1.1.1');
    }
    
    // Load message summary for unread count
    loadSummary().catch((error) => {
      console.warn('Failed to load message summary:', error);
    });
  }, [loadSummary]);

  // Get real unread message count from enhanced store
  const unreadCount = getUnreadCount();

  return (
    <nav className="game-nav">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-blue-400">Attrition</h1>
          {appVersion && (
            <span className="text-sm text-gray-400">v{appVersion}</span>
          )}
          <span className="text-sm text-gray-400">Alpha Server</span>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* Connection status indicators */}
          <ConnectionStatus />

          {/* Galaxy button */}
          <button
            onClick={() => openModal('galaxy')}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Open Galaxy
          </button>

          {/* Resource Display */}
          {auth.empire && (
            <div className="flex items-center space-x-4">
              <ResourceDisplay
                name="credits"
                value={auth.empire.resources.credits}
                icon="💰"
                className="text-empire-gold"
              />
            </div>
          )}

          {/* Messages Button */}
          <Link
            to="/messages"
            className="relative flex items-center px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            <span className="mr-1">📧</span>
            Messages
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
          
          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </nav>
  );
};

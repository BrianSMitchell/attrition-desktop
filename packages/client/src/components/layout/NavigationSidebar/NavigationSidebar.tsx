/**
 * Navigation sidebar component
 * Contains main navigation menu and server status
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { NavigationItem } from '../../ui/navigation/NavigationItem';
import { ServerStatus } from './ServerStatus';
import { useModalStore } from '../../../stores/modalStore';
import { useMessageStore } from '../../../stores/messageStore';
// Migrated to enhanced store architecture

export const NavigationSidebar: React.FC = () => {
  const location = useLocation();
  const { openModal } = useModalStore();
  const { getUnreadCount, loadSummary } = useMessageStore();
  
  // Get real unread message count from enhanced store
  const unreadCount = getUnreadCount();
  const isDesktop = typeof window !== 'undefined' && (window as any).electronAPI;
  
  // Load message summary on mount
  useEffect(() => {
    loadSummary().catch((error) => {
      console.warn('Failed to load message summary in NavigationSidebar:', error);
    });
  }, [loadSummary]);

  return (
    <aside className="game-sidebar">
      <nav className="space-y-2">
        <NavigationItem
          to="/dashboard"
          label="Dashboard"
          isActive={location.pathname === '/dashboard'}
        />
        <NavigationItem
          to="/bases"
          label="Bases"
          isActive={location.pathname === '/bases'}
        />
        <NavigationItem
          to="/universe"
          label="Map"
          isActive={location.pathname === '/universe'}
        />
        <NavigationItem
          to="#"
          label="Game Info"
          asButton={true}
          onClick={() => openModal('game_info')}
        />
        <NavigationItem
          to="/help"
          label="Help"
          isActive={location.pathname === '/help'}
        />
        <NavigationItem
          to="/messages"
          label="Messages"
          isActive={location.pathname === '/messages'}
          badgeCount={unreadCount}
        />
        {isDesktop && (
          <NavigationItem
            to="/admin/performance"
            label="Performance"
            isActive={location.pathname === '/admin/performance'}
          />
        )}
        <NavigationItem
          to="#"
          label="Fleets"
          isActive={false}
        />
        <NavigationItem
          to="#"
          label="Research"
          isActive={false}
        />
        <NavigationItem
          to="#"
          label="Diplomacy"
          isActive={false}
        />
      </nav>
      
      <ServerStatus />
    </aside>
  );
};

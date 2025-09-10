import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Link } from 'react-router-dom';
import { statusService, ServerStatusData } from '../../services/statusService';
import { getSocket } from '../../services/socket';
import axios from 'axios';
import { useModalStore } from '../../stores/modalStore';
import ModalManager from '../game/ModalManager';
import { useNetwork } from '../../contexts/NetworkContext';
import StatusDot from '../ui/StatusDot';
import SyncDot from '../ui/SyncDot';
import { useSync } from '../../contexts/SyncContext';
import { useMessageStore } from '../../stores/messageStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, empire, logout } = useAuthStore();
  const { openModal } = useModalStore();
  const { status: networkStatus, isFullyConnected } = useNetwork();
  const isDesktop = typeof window !== 'undefined' && !!(window as any).desktop;
  const { status: syncStatus } = useSync();
  const { getUnreadCount, loadSummary, initializeSocketListeners, cleanupSocketListeners } = useMessageStore();
  const [appVersion, setAppVersion] = useState<string | null>(null);

  // Derive connection state for persistent header indicator
  const connectionState: 'online' | 'degraded' | 'offline' =
    !networkStatus.isOnline ? 'offline' : !networkStatus.isApiReachable ? 'degraded' : 'online';
  const showStatusLabel = connectionState !== 'online';
  const statusTitle =
    connectionState === 'offline'
      ? 'No internet connection. Actions are limited; queued items will sync later.'
      : connectionState === 'degraded'
      ? 'Server unreachable. Viewing cached data; actions are limited.'
      : 'Online';

  const [serverStatus, setServerStatus] = useState<ServerStatusData | null>(null);

  useEffect(() => {
    // Load message summary on component mount
    loadSummary();
    
    // Initialize socket listeners for real-time message updates
    initializeSocketListeners();
    
    // Cleanup socket listeners on unmount
    return () => {
      cleanupSocketListeners();
    };
  }, []);

  useEffect(() => {
    // Desktop-only: fetch app version once
    if (isDesktop && (window as any).desktop?.getVersion) {
      try {
        (window as any).desktop.getVersion().then((v: string) => {
          if (typeof v === 'string' && v.trim().length > 0) setAppVersion(v);
        }).catch(() => {});
      } catch {}
    }

    let intervalId: number | undefined;
    // Simple backoff window if the server responds with 429
    let pauseUntil = 0;
    const fetchStatus = async () => {
      if (Date.now() < pauseUntil) return;
      if (!isFullyConnected) return; // Don't fetch status when offline
      
      try {
        const res = await statusService.getStatus();
        if (res && (res as any).success && (res as any).data) {
          setServerStatus((res as any).data as ServerStatusData);
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 429) {
          // Back off for 60s on rate limit to avoid spamming
          pauseUntil = Date.now() + 60_000;
        }
        // Ignore other transient errors
      }
    };
    fetchStatus();
    // Poll less frequently; presence updates arrive via Socket.IO in real-time
    intervalId = window.setInterval(fetchStatus, 30000);
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [isFullyConnected]);

  // Push-based presence updates (instant Players refresh)
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (data: { playersOnline: number; socketsConnected: number }) => {
      setServerStatus(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          playersOnline: data.playersOnline,
        };
      });
    };

    socket.on('presence:update', handler);
    return () => {
      socket.off('presence:update', handler);
    };
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation Header */}
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
            {/* Persistent connection + sync status indicators (subtle, non-intrusive) */}
            <div className="flex items-center gap-4">
              {/* Network status */}
              <div className="flex items-center gap-2">
                <StatusDot
                  state={connectionState}
                  showLabel={showStatusLabel}
                  size="sm"
                  title={statusTitle}
                />
                {connectionState === 'online' && networkStatus.latencyMs ? (
                  <span className="text-xs text-gray-400">({networkStatus.latencyMs}ms)</span>
                ) : null}
              </div>

              {/* Sync status */}
              <div className="flex items-center gap-2">
                <SyncDot
                  state={syncStatus.state}
                  queuedCount={syncStatus.queuedCount}
                  showLabel={syncStatus.state !== 'idle'}
                  size="sm"
                  title={
                    syncStatus.state === 'error'
                      ? (syncStatus.lastError || 'Sync error')
                      : syncStatus.state === 'syncing'
                      ? 'Flushing queued changes…'
                      : 'Synced'
                  }
                />
              </div>
            </div>
            <button
              onClick={() => openModal('galaxy')}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Open Galaxy
            </button>
            {/* Resource Display */}
            {empire && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="resource-display">
                  <span className="text-empire-gold">💰</span>
                  <span>{empire.resources.credits.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Messages Button */}
            <Link
              to="/messages"
              className="relative flex items-center px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              <span className="mr-1">📧</span>
              Messages
              {getUnreadCount() > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {getUnreadCount() > 99 ? '99+' : getUnreadCount()}
                </span>
              )}
            </Link>
            
            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium">{user?.username}</div>
                {empire && (
                  <div className="text-xs text-gray-400">{empire.name}</div>
                )}
              </div>
              <button
                onClick={logout}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="game-sidebar">
          <nav className="space-y-2">
            <Link
              to="/dashboard"
              className="block px-3 py-2 rounded text-sm font-medium bg-gray-700 text-white"
            >
              Dashboard
            </Link>
            <Link
              to="/bases"
              className="block px-3 py-2 rounded text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Bases
            </Link>
            <Link
              to="/galaxy"
              className="block px-3 py-2 rounded text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Galaxy Map
            </Link>
            <button
              onClick={() => openModal('game_info')}
              className="block w-full text-left px-3 py-2 rounded text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Game Info
            </button>
            <Link
              to="/help"
              className="block px-3 py-2 rounded text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Help
            </Link>
            <Link
              to="/messages"
              className="relative block px-3 py-2 rounded text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Messages
              {getUnreadCount() > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {getUnreadCount()}
                </span>
              )}
            </Link>
            {isDesktop && (
              <Link
                to="/admin/performance"
                className="block px-3 py-2 rounded text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                Performance
              </Link>
            )}
            <a
              href="#"
              className="block px-3 py-2 rounded text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Fleets
            </a>
            <a
              href="#"
              className="block px-3 py-2 rounded text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Research
            </a>
            <a
              href="#"
              className="block px-3 py-2 rounded text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Diplomacy
            </a>
          </nav>
          
          {/* Server Status */}
          <div className="mt-8 p-3 bg-gray-700 rounded">
            <h3 className="text-sm font-medium mb-2">Server Status</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={serverStatus?.status === 'OK' ? 'status-online' : 'text-red-400'}>
                  {serverStatus?.status === 'OK' ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Players:</span>
                <span>{serverStatus ? serverStatus.playersOnline : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Uptime:</span>
                <span>{serverStatus ? formatUptime(serverStatus.uptimeSeconds) : '—'}</span>
              </div>
              {/* Network Status */}
              <div className="flex justify-between pt-1 border-t border-gray-600 mt-1">
                <span>Network:</span>
                <span className={isFullyConnected ? 'text-green-400' : 'text-red-400'}>
                  {isFullyConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {networkStatus.latencyMs && (
                <div className="flex justify-between text-gray-400">
                  <span>Latency:</span>
                  <span>{networkStatus.latencyMs}ms</span>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="game-main">
          {children}
        </main>
      </div>
      <ModalManager empire={empire || null} onUpdate={() => {}} />
    </div>
  );
};

export default Layout;

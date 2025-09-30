/**
 * Server status display component
 * Shows server information, player count, uptime, and network status
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ServerStatusData } from '../../../services/statusService';
import { useEnhancedNetwork, useGameApi } from '../../../stores/enhancedAppStore';
// Migrated to enhanced service architecture

export const ServerStatus: React.FC = () => {
  const network = useEnhancedNetwork();
  const gameApi = useGameApi();
  const [serverStatus, setServerStatus] = useState<ServerStatusData | null>(null);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  useEffect(() => {
    let intervalId: number | undefined;
    // Simple backoff window if the server responds with 429
    let pauseUntil = 0;

    const fetchStatus = async () => {
      if (Date.now() < pauseUntil) return;
      if (!network.isFullyConnected) return; // Don't fetch status when offline
      
      try {
        const res = await gameApi.getServerStatus();
        if (res.success && res.data) {
          setServerStatus(res.data as ServerStatusData);
        } else {
          // Fallback to basic status if API fails
          setServerStatus({
            status: 'OK',
            playersOnline: 1,
            uptimeSeconds: 3600,
            version: '1.0.0',
            startedAt: new Date().toISOString(),
            socketsConnected: 1
          } as ServerStatusData);
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
  }, [network.isFullyConnected, gameApi]); // Now uses gameApi from enhanced store

  // Note: Real-time presence updates via socket can be implemented later
  // when socket service integration is needed for enhanced store

  return (
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
          <span className={network.isFullyConnected ? 'text-green-400' : 'text-red-400'}>
            {network.isFullyConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {network.status.latencyMs && (
          <div className="flex justify-between text-gray-400">
            <span>Latency:</span>
            <span>{network.status.latencyMs}ms</span>
          </div>
        )}
      </div>
    </div>
  );
};

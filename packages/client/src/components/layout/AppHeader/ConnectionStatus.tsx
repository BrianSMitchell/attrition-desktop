/**
 * Connection status component
 * Shows network and sync status indicators in the header
 */

import React from 'react';
import { ConnectionIndicator } from '../../ui/indicators/ConnectionIndicator';
import { SyncIndicator } from '../../ui/indicators/SyncIndicator';
import { useEnhancedNetwork, useEnhancedSync } from '../../../stores/enhancedAppStore';

export const ConnectionStatus: React.FC = () => {
  const network = useEnhancedNetwork();
  const sync = useEnhancedSync();

  // Derive connection state for persistent header indicator
  const connectionState: 'online' | 'degraded' | 'offline' =
    !network.status.isOnline ? 'offline' : 
    !network.status.isApiReachable ? 'degraded' : 'online';

  const showStatusLabel = connectionState !== 'online';

  const statusTitle =
    connectionState === 'offline'
      ? 'No internet connection. Actions are limited; queued items will sync later.'
      : connectionState === 'degraded'
      ? 'Server unreachable. Viewing cached data; actions are limited.'
      : 'Online';

  const syncTitle =
    sync.status.state === 'error'
      ? (sync.status.lastError || 'Sync error')
      : sync.status.state === 'syncing'
      ? 'Flushing queued changes…'
      : 'Synced';

  return (
    <div className="flex items-center gap-4">
      {/* Network status */}
      <ConnectionIndicator
        state={connectionState}
        showLabel={showStatusLabel}
        size="sm"
        title={statusTitle}
        latencyMs={network.status.latencyMs}
      />

      {/* Sync status */}
      <SyncIndicator
        state={sync.status.state}
        queuedCount={sync.status.queuedCount}
        showLabel={sync.status.state !== 'idle'}
        size="sm"
        title={syncTitle}
      />
    </div>
  );
};

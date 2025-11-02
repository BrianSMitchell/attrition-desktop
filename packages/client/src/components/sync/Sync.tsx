import React, { useCallback, useEffect, useState } from 'react';
import { useServiceSync, useServiceToasts } from '../../hooks/useServiceIntegration';

import { TIMEOUTS } from '@game/shared';
/**
 * Sync status indicator showing current sync state and queue count
 */
const SyncStatusIndicator: React.FC<{
  showDetails?: boolean;
  showQueue?: boolean;
  compact?: boolean;
}> = ({ showDetails = true, showQueue = true, compact = false }) => {
  const sync = useServiceSync();

  const getStatusIcon = () => {
    if (!sync.serviceConnected) return '⚠️';
    switch (sync.state) {
      case 'idle': return '⏸️';
      case 'syncing': return '🔄';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusText = () => {
    if (!sync.serviceConnected) return 'Sync Service Offline';
    switch (sync.state) {
      case 'idle': return 'Sync Ready';
      case 'syncing': return 'Syncing...';
      case 'error': return 'Sync Error';
      default: return 'Unknown State';
    }
  };

  const getStatusColor = () => {
    if (!sync.serviceConnected) return '#f44336';
    switch (sync.state) {
      case 'idle': return '#757575';
      case 'syncing': return '#2196f3';
      case 'error': return '#f44336';
      default: return '#ff9800';
    }
  };

  if (compact) {
    return (
      <div 
        className="sync-status-compact"
        title={`${getStatusText()}${sync.queuedCount > 0 ? ` (${sync.queuedCount} queued)` : ''}`}
        style={{ color: getStatusColor() }}
      >
        {getStatusIcon()}
        {showQueue && sync.queuedCount > 0 && (
          <span className="queue-badge">{sync.queuedCount}</span>
        )}
      </div>
    );
  }

  return (
    <div className="sync-status-indicator">
      <div className="status-header">
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text" style={{ color: getStatusColor() }}>
          {getStatusText()}
        </span>
      </div>

      {showQueue && sync.queuedCount > 0 && (
        <div className="queue-info">
          <span className="queue-count">
            {sync.queuedCount} items queued
          </span>
        </div>
      )}

      {showDetails && (
        <div className="status-details">
          <div className="detail-item">
            <span>Auto Sync:</span>
            <span className={sync.autoSyncEnabled ? 'status-good' : 'status-warning'}>
              {sync.autoSyncEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {sync.lastRunAt && (
            <div className="detail-item">
              <span>Last Run:</span>
              <span>{new Date(sync.lastRunAt).toLocaleString()}</span>
            </div>
          )}

          <div className="detail-item">
            <span>Service:</span>
            <span className={sync.serviceConnected ? 'status-good' : 'status-bad'}>
              {sync.serviceConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      )}

      {sync.lastError && (
        <div className="sync-error">
          <strong>Last Error:</strong> {sync.lastError}
        </div>
      )}
    </div>
  );
};

/**
 * Sync control panel with manual sync and queue management
 */
const SyncControlPanel: React.FC<{
  showAdvanced?: boolean;
}> = ({ showAdvanced = false }) => {
  const sync = useServiceSync();
  const { addToast } = useServiceToasts();
  const [isOperating, setIsOperating] = useState(false);

  const handleStartSync = useCallback(async () => {
    if (!sync.serviceConnected) {
      addToast('error', 'Sync service is not connected');
      return;
    }

    setIsOperating(true);
    try {
      await sync.startSync();
      addToast('success', 'Sync started successfully');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Sync operation failed');
    } finally {
      setIsOperating(false);
    }
  }, [sync.serviceConnected, sync.startSync, addToast]);

  const handleFlushQueue = useCallback(async () => {
    if (!sync.serviceConnected) {
      addToast('error', 'Sync service is not connected');
      return;
    }

    setIsOperating(true);
    try {
      await sync.flushQueue();
      addToast('success', 'Queue processing started');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Queue flush failed');
    } finally {
      setIsOperating(false);
    }
  }, [sync.serviceConnected, sync.flushQueue, addToast]);

  const handleToggleAutoSync = useCallback(() => {
    try {
      const newEnabled = !sync.autoSyncEnabled;
      sync.toggleAutoSync(newEnabled);
      addToast('info', newEnabled ? 'Auto sync enabled' : 'Auto sync disabled');
    } catch (error) {
      addToast('error', 'Failed to toggle auto sync');
    }
  }, [sync.autoSyncEnabled, sync.toggleAutoSync, addToast]);

  const handleRefreshQueueCount = useCallback(async () => {
    try {
      await sync.getQueueCount();
      addToast('info', 'Queue count refreshed');
    } catch (error) {
      addToast('error', 'Failed to refresh queue count');
    }
  }, [sync.getQueueCount, addToast]);

  return (
    <div className="sync-control-panel">
      <SyncStatusIndicator showDetails showQueue />
      
      <div className="sync-controls">
        <div className="primary-controls">
          <button
            onClick={handleStartSync}
            disabled={isOperating || sync.state === 'syncing' || !sync.serviceConnected}
            className="sync-button primary"
          >
            {sync.state === 'syncing' ? 'Syncing...' : 'Start Sync'}
          </button>

          {sync.queuedCount > 0 && (
            <button
              onClick={handleFlushQueue}
              disabled={isOperating || !sync.serviceConnected}
              className="flush-button"
            >
              {isOperating ? 'Processing...' : `Flush Queue (${sync.queuedCount})`}
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="advanced-controls">
            <label className="auto-sync-toggle">
              <input
                type="checkbox"
                checked={sync.autoSyncEnabled}
                onChange={handleToggleAutoSync}
                disabled={!sync.serviceConnected}
              />
              <span>Enable Auto Sync</span>
            </label>

            <button
              onClick={handleRefreshQueueCount}
              disabled={!sync.serviceConnected}
              className="refresh-button"
            >
              Refresh Queue
            </button>
          </div>
        )}
      </div>

      {!sync.serviceConnected && (
        <div className="service-disconnected-warning">
          <p>Sync service is disconnected. Some features may not be available.</p>
        </div>
      )}
    </div>
  );
};

/**
 * Sync progress indicator for long-running sync operations
 */
const SyncProgressIndicator: React.FC<{
  showETA?: boolean;
}> = ({ showETA: _showETA = false }) => {
  const sync = useServiceSync();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  // Track elapsed time during sync
  useEffect(() => {
    if (sync.state !== 'syncing') {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, TIMEOUTS.ONE_SECOND);

    return () => clearInterval(interval);
  }, [sync.state, startTime]);

  if (sync.state !== 'syncing') {
    return null;
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="sync-progress-indicator">
      <div className="progress-bar">
        <div className="progress-bar-fill" />
      </div>
      
      <div className="progress-details">
        <span>Syncing... {formatTime(elapsedTime)}</span>
        {sync.queuedCount > 0 && (
          <span>{sync.queuedCount} items remaining</span>
        )}
      </div>
    </div>
  );
};

/**
 * Hook for components that need to react to sync state changes
 */
export const useSyncStateTransitions = () => {
  const sync = useServiceSync();
  const { addToast } = useServiceToasts();
  const [previousState, setPreviousState] = useState({
    state: sync.state,
    serviceConnected: sync.serviceConnected,
    queuedCount: sync.queuedCount,
  });

  useEffect(() => {
    const current = {
      state: sync.state,
      serviceConnected: sync.serviceConnected,
      queuedCount: sync.queuedCount,
    };

    // Sync completed (transitioned from syncing to idle)
    if (previousState.state === 'syncing' && current.state === 'idle') {
      addToast('success', 'Sync completed successfully');
    }

    // Sync failed
    if (previousState.state === 'syncing' && current.state === 'error') {
      addToast('error', sync.lastError || 'Sync failed');
    }

    // Service connection lost
    if (previousState.serviceConnected && !current.serviceConnected) {
      addToast('warning', 'Sync service connection lost');
    }

    // Service connection restored
    if (!previousState.serviceConnected && current.serviceConnected) {
      addToast('info', 'Sync service connection restored');
    }

    // Queue items added
    if (current.queuedCount > previousState.queuedCount) {
      const added = current.queuedCount - previousState.queuedCount;
      if (added <= 5) { // Don't spam for large batch additions
        addToast('info', `${added} items added to sync queue`);
      }
    }

    setPreviousState(current);
  }, [sync, previousState, addToast]);

  return {
    isTransitioning: sync.state === 'syncing',
    syncActive: sync.state === 'syncing',
    hasQueuedItems: sync.queuedCount > 0,
  };
};

// Export components (migration support is now built-in to the enhanced store)
export { 
  SyncStatusIndicator, 
  SyncControlPanel, 
  SyncProgressIndicator
};

// Default export
export default SyncStatusIndicator;

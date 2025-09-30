import React, { useCallback, useEffect, useState } from 'react';
import { useServiceNetwork, useServiceToasts } from '../../hooks/useServiceIntegration';

/**
 * Network status indicator component showing connection state
 */
const NetworkStatusIndicator: React.FC<{
  showDetails?: boolean;
  showLatency?: boolean;
  compact?: boolean;
}> = ({ showDetails = true, showLatency = false, compact = false }) => {
  const network = useServiceNetwork();
  
  const getStatusIcon = () => {
    if (!network.serviceConnected) return '⚠️';
    if (!network.isOnline) return '🔴';
    if (!network.isApiReachable) return '🟡';
    if (network.isFullyConnected) return '🟢';
    return '🟠';
  };

  const getStatusText = () => {
    if (!network.serviceConnected) return 'Service Offline';
    if (!network.isOnline) return 'No Internet';
    if (!network.isApiReachable) return 'API Unreachable';
    if (network.isFullyConnected) return 'Connected';
    return 'Partial Connection';
  };

  const getStatusColor = () => {
    if (!network.serviceConnected || !network.isOnline) return '#f44336';
    if (!network.isApiReachable) return '#ff9800';
    if (network.isFullyConnected) return '#4caf50';
    return '#ff9800';
  };

  if (compact) {
    return (
      <div 
        className="network-status-compact"
        title={getStatusText()}
        style={{ color: getStatusColor() }}
      >
        {getStatusIcon()}
      </div>
    );
  }

  return (
    <div className="network-status-indicator">
      <div className="status-header">
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text" style={{ color: getStatusColor() }}>
          {getStatusText()}
        </span>
      </div>

      {showDetails && (
        <div className="status-details">
          <div className="detail-item">
            <span>Online:</span>
            <span className={network.isOnline ? 'status-good' : 'status-bad'}>
              {network.isOnline ? 'Yes' : 'No'}
            </span>
          </div>
          
          <div className="detail-item">
            <span>API Reachable:</span>
            <span className={network.isApiReachable ? 'status-good' : 'status-bad'}>
              {network.isApiReachable ? 'Yes' : 'No'}
            </span>
          </div>

          {showLatency && network.latencyMs && (
            <div className="detail-item">
              <span>Latency:</span>
              <span className={network.latencyMs < 200 ? 'status-good' : network.latencyMs < 500 ? 'status-warning' : 'status-bad'}>
                {network.latencyMs}ms
              </span>
            </div>
          )}

          {network.lastChecked && (
            <div className="detail-item">
              <span>Last Checked:</span>
              <span>{new Date(network.lastChecked).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      )}

      {network.error && (
        <div className="network-error">
          <strong>Error:</strong> {network.error}
        </div>
      )}
    </div>
  );
};

/**
 * Network connectivity checker with manual refresh capability
 */
const NetworkConnectivityChecker: React.FC<{
  autoRefresh?: boolean;
  refreshInterval?: number;
}> = ({ autoRefresh = true, refreshInterval = 30000 }) => {
  const network = useServiceNetwork();
  const { addToast } = useServiceToasts();
  const [isManuallyChecking, setIsManuallyChecking] = useState(false);

  const handleManualCheck = useCallback(async () => {
    setIsManuallyChecking(true);
    try {
      await network.forceConnectivityCheck();
      addToast('info', 'Network connectivity refreshed');
    } catch (error) {
      addToast('error', 'Failed to check network connectivity');
    } finally {
      setIsManuallyChecking(false);
    }
  }, [network.forceConnectivityCheck, addToast]);

  // Auto refresh connectivity
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      network.checkConnectivity();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, network.checkConnectivity]);

  return (
    <div className="network-connectivity-checker">
      <NetworkStatusIndicator showDetails showLatency />
      
      <div className="connectivity-actions">
        <button
          onClick={handleManualCheck}
          disabled={isManuallyChecking || !network.serviceConnected}
          className="check-connectivity-button"
        >
          {isManuallyChecking ? 'Checking...' : 'Check Connectivity'}
        </button>

        {!network.serviceConnected && (
          <div className="service-offline-warning">
            Network service is offline. Please check your connection.
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Network-aware component wrapper that shows fallbacks during network issues
 */
const NetworkAwareWrapper: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireFullConnection?: boolean;
  showNetworkStatus?: boolean;
}> = ({ 
  children, 
  fallback, 
  requireFullConnection = true,
  showNetworkStatus = false
}) => {
  const network = useServiceNetwork();

  const shouldShowFallback = () => {
    if (!network.serviceConnected) return true;
    if (requireFullConnection && !network.isFullyConnected) return true;
    if (!network.isOnline) return true;
    return false;
  };

  if (shouldShowFallback()) {
    return (
      <div className="network-aware-fallback">
        {showNetworkStatus && (
          <NetworkStatusIndicator compact={false} showDetails />
        )}
        
        {fallback || (
          <div className="default-network-fallback">
            <h3>Connection Required</h3>
            <p>This feature requires a stable internet connection.</p>
            <NetworkConnectivityChecker autoRefresh />
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Connection quality indicator with visual feedback
 */
const ConnectionQualityIndicator: React.FC<{
  showLabel?: boolean;
}> = ({ showLabel = true }) => {
  const network = useServiceNetwork();

  const getQualityLevel = () => {
    if (!network.serviceConnected || !network.isOnline) return 0;
    if (!network.isApiReachable) return 1;
    if (network.latencyMs === undefined) return 2;
    if (network.latencyMs < 100) return 4;
    if (network.latencyMs < 300) return 3;
    if (network.latencyMs < 1000) return 2;
    return 1;
  };

  const getQualityText = (level: number) => {
    switch (level) {
      case 0: return 'Offline';
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Excellent';
      default: return 'Unknown';
    }
  };

  const qualityLevel = getQualityLevel();

  return (
    <div className="connection-quality-indicator">
      <div className="quality-bars">
        {[1, 2, 3, 4].map(bar => (
          <div
            key={bar}
            className={`quality-bar ${bar <= qualityLevel ? 'active' : 'inactive'}`}
            style={{
              backgroundColor: bar <= qualityLevel 
                ? qualityLevel >= 3 ? '#4caf50' 
                  : qualityLevel >= 2 ? '#ff9800' 
                  : '#f44336'
                : '#e0e0e0'
            }}
          />
        ))}
      </div>
      
      {showLabel && (
        <span className="quality-label">
          {getQualityText(qualityLevel)}
        </span>
      )}
    </div>
  );
};

/**
 * Hook for components that need to react to network state changes
 */
export const useNetworkStateTransitions = () => {
  const network = useServiceNetwork();
  const { addToast } = useServiceToasts();
  const [previousState, setPreviousState] = useState({
    isOnline: network.isOnline,
    isApiReachable: network.isApiReachable,
    serviceConnected: network.serviceConnected,
  });

  useEffect(() => {
    const current = {
      isOnline: network.isOnline,
      isApiReachable: network.isApiReachable,
      serviceConnected: network.serviceConnected,
    };

    // Network came online
    if (!previousState.isOnline && current.isOnline) {
      addToast('success', 'Internet connection restored');
    }

    // Network went offline
    if (previousState.isOnline && !current.isOnline) {
      addToast('error', 'Internet connection lost', { duration: 0 });
    }

    // API became reachable
    if (!previousState.isApiReachable && current.isApiReachable) {
      addToast('success', 'Server connection restored');
    }

    // API became unreachable
    if (previousState.isApiReachable && !current.isApiReachable) {
      addToast('warning', 'Server connection lost');
    }

    // Service connection restored
    if (!previousState.serviceConnected && current.serviceConnected) {
      addToast('info', 'Network monitoring restored');
    }

    setPreviousState(current);
  }, [network, previousState, addToast]);

  return {
    isTransitioning: false, // Could add loading states if needed
    connectionStable: network.isFullyConnected && network.serviceConnected,
  };
};

// Export components (migration support is now built-in to the enhanced store)
export { 
  NetworkStatusIndicator, 
  NetworkConnectivityChecker, 
  NetworkAwareWrapper,
  ConnectionQualityIndicator
};

// Default export
export default NetworkStatusIndicator;

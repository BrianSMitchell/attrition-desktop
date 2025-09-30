import React from 'react';
import { 
  useServiceNetwork, 
  useServiceSync, 
  useServiceHealth 
} from '../../hooks/useServiceIntegration';
import { withServiceMigration } from '../ServiceMigrationWrapper';
import StatusDot from './StatusDot';

interface ConnectionBadgeProps {
  /** Badge size */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Show detailed status text */
  showStatus?: boolean;
  /** Show quality indicator */
  showQuality?: boolean;
  /** Show sync status */
  showSync?: boolean;
  /** Show service health */
  showServices?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Custom className */
  className?: string;
  /** Click handler for badge */
  onClick?: () => void;
  /** Position for detailed popover */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Enhanced ConnectionBadge utility component
 * Provides comprehensive service status display with customizable detail levels
 */
const ConnectionBadgeComponent: React.FC<ConnectionBadgeProps> = ({
  size = 'sm',
  showStatus = false,
  showQuality = false,
  showSync = false,
  showServices = false,
  compact = false,
  className = '',
  onClick,
}) => {
  // Service integration hooks
  const network = useServiceNetwork();
  const sync = useServiceSync();
  const health = useServiceHealth();

  // Determine overall status
  const getOverallStatus = (): 'online' | 'offline' | 'error' | 'degraded' | 'loading' => {
    if (!health.ready) return 'loading';
    if (!network.status.isOnline) return 'offline';
    if (sync.status.state === 'error') return 'error';
    if (!network.isFullyConnected || sync.status.state === 'syncing') return 'degraded';
    return 'online';
  };

  const overallStatus = getOverallStatus();

  // Size configuration
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  // Status colors
  const statusColors = {
    online: 'bg-green-900/30 border-green-600 text-green-200',
    degraded: 'bg-yellow-900/30 border-yellow-600 text-yellow-200',
    offline: 'bg-red-900/30 border-red-600 text-red-200',
    syncing: 'bg-blue-900/30 border-blue-600 text-blue-200',
    error: 'bg-red-900/50 border-red-500 text-red-100',
    loading: 'bg-gray-900/30 border-gray-600 text-gray-200',
  };

  // Get status text
  const getStatusText = () => {
    switch (overallStatus) {
      case 'online': return 'Connected';
      case 'degraded': return sync.status.state === 'syncing' ? 'Syncing' : 'Limited';
      case 'offline': return 'Offline';
      case 'error': return 'Error';
      case 'loading': return 'Loading';
      default: return 'Unknown';
    }
  };

  // Generate detailed tooltip
  const getDetailedTooltip = () => {
    const parts = [];
    
    parts.push(`Status: ${getStatusText()}`);
    
    // NetworkStatus from our service doesn't have effectiveType or rtt
    // Use latencyMs instead for consistency
    if (showQuality && network.status.latencyMs) {
      parts.push(`Latency: ${Math.round(network.status.latencyMs)}ms`);
    }
    
    if (showSync) {
      const syncInfo = sync.status.queuedCount > 0 
        ? `${sync.status.state} (${sync.status.queuedCount} queued)`
        : sync.status.state;
      parts.push(`Sync: ${syncInfo}`);
    }
    
    if (showServices) {
      // Health object now has connections instead of services array
      const connectedCount = Object.values(health.connections).filter(Boolean).length;
      const totalServices = Object.keys(health.connections).length;
      parts.push(`Services: ${connectedCount}/${totalServices} connected`);
    }
    
    return parts.join('\n');
  };

  // Compact mode renders just the status dot
  if (compact) {
    return (
      <div 
        className={`inline-flex items-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
        title={getDetailedTooltip()}
      >
        <StatusDot 
          state={sync.status.state === 'syncing' ? 'syncing' : overallStatus}
          size={size}
          animate={sync.status.state === 'syncing' || overallStatus === 'loading'}
        />
      </div>
    );
  }

  return (
    <div 
      className={`inline-flex items-center gap-2 rounded border ${sizeClasses[size]} ${statusColors[overallStatus]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} transition-colors ${className}`}
      onClick={onClick}
      title={getDetailedTooltip()}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Status dot */}
      <StatusDot 
        state={sync.status.state === 'syncing' ? 'syncing' : overallStatus}
        size="xs"
        animate={sync.status.state === 'syncing' || overallStatus === 'loading'}
      />

      {/* Status text */}
      {showStatus && (
        <span className="font-medium">
          {getStatusText()}
        </span>
      )}

      {/* Sync indicator */}
      {showSync && sync.status.queuedCount > 0 && (
        <span className="bg-current text-black rounded-full px-1 text-xs min-w-[1rem] text-center">
          {sync.status.queuedCount > 99 ? '99+' : sync.status.queuedCount}
        </span>
      )}

      {/* Service health indicator */}
      {showServices && (
        <span className="text-xs opacity-75">
          {Object.values(health.connections).filter(Boolean).length}/{Object.keys(health.connections).length}
        </span>
      )}

      {/* Latency indicator (for online status) */}
      {overallStatus === 'online' && network.status.latencyMs && (
        <span className="text-xs opacity-60">
          {Math.round(network.status.latencyMs)}ms
        </span>
      )}
    </div>
  );
};

// Export the component wrapped with migration support
export const ConnectionBadge = withServiceMigration(ConnectionBadgeComponent);

// Export the unwrapped component for direct usage if needed
export { ConnectionBadgeComponent };

export default ConnectionBadge;
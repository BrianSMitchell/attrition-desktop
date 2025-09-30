import React, { useState, useCallback } from 'react';
import { 
  useServiceNetwork, 
  useServiceSync, 
  useServiceHealth, 
  useServiceToasts 
} from '../../hooks/useServiceIntegration';
import { withServiceMigration } from '../ServiceMigrationWrapper';
import LoadingSpinner from './LoadingSpinner';
import ConnectionBadge from './ConnectionBadge';

interface ActionButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: React.ReactNode;
  /** Enhanced action handler with service context */
  onAction?: (context: {
    isOnline: boolean;
    isFullyConnected: boolean;
    syncState: string;
    hasQueuedOperations: boolean;
    services: Array<{ name: string; status: string }>;
  }) => void | Promise<void>;
  /** Action type for better UX */
  actionType?: 'create' | 'update' | 'delete' | 'sync' | 'fetch' | 'custom';
  /** Requirements for the action */
  requirements?: {
    network?: boolean;
    services?: boolean;
    syncIdle?: boolean;
    confirmation?: boolean;
  };
  /** Custom messages */
  messages?: {
    loading?: string;
    success?: string;
    error?: string;
    confirmation?: string;
  };
  /** Button appearance */
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show additional indicators */
  showStatus?: boolean;
  showProgress?: boolean;
  /** Auto-retry configuration */
  autoRetry?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
  };
  /** Custom icon */
  icon?: React.ReactNode;
  /** Loading state override */
  loading?: boolean;
}

/**
 * Enhanced ActionButton utility component
 * Provides comprehensive action handling with service integration and enhanced UX patterns
 */
const ActionButtonComponent: React.FC<ActionButtonProps> = ({
  children,
  onAction,
  actionType = 'custom',
  requirements = {},
  messages = {},
  variant = 'primary',
  size = 'md',
  showStatus = false,
  showProgress = false,
  autoRetry,
  icon,
  loading: externalLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  // Service integration hooks
  const network = useServiceNetwork();
  const sync = useServiceSync();
  const health = useServiceHealth();
  const { addToast } = useServiceToasts();

  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Merge requirements with defaults based on action type
  const getDefaultRequirements = () => {
    switch (actionType) {
      case 'create':
      case 'update':
      case 'delete':
        return { network: true, services: true, confirmation: actionType === 'delete' };
      case 'sync':
        return { network: true, services: true, syncIdle: false };
      case 'fetch':
        return { network: true, services: false };
      default:
        return {};
    }
  };

  const finalRequirements = { ...getDefaultRequirements(), ...requirements };

  // Get default messages based on action type
  const getDefaultMessages = () => {
    const actionLabels = {
      create: 'Creating',
      update: 'Updating', 
      delete: 'Deleting',
      sync: 'Syncing',
      fetch: 'Loading',
      custom: 'Processing'
    };

    return {
      loading: `${actionLabels[actionType]}...`,
      success: `${actionType === 'delete' ? 'Deleted' : actionType === 'sync' ? 'Synced' : 'Completed'} successfully`,
      error: `Failed to ${actionType}`,
      confirmation: actionType === 'delete' ? 'Are you sure you want to delete this item?' : 'Are you sure you want to perform this action?',
    };
  };

  const finalMessages = { ...getDefaultMessages(), ...messages };

  // Check if action can be performed
  const canPerformAction = () => {
    if (disabled) return { can: false, reason: 'Button is disabled' };
    
    if (finalRequirements.network && !network.isFullyConnected) {
      return { can: false, reason: 'Internet connection required' };
    }
    
    if (finalRequirements.services && !health.ready) {
      return { can: false, reason: 'Services not ready' };
    }
    
    if (finalRequirements.syncIdle && sync.status.state === 'syncing') {
      return { can: false, reason: 'Please wait for sync to complete' };
    }
    
    return { can: true, reason: null };
  };

  // Enhanced action handler with retry logic
  const handleAction = useCallback(async () => {
    const actionCheck = canPerformAction();
    if (!actionCheck.can) {
      addToast('warning', actionCheck.reason!);
      return;
    }

    // Show confirmation if required
    if (finalRequirements.confirmation && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    // Reset confirmation state
    if (showConfirmation) {
      setShowConfirmation(false);
    }

    const executeAction = async (attempt: number = 1): Promise<void> => {
      try {
        setIsLoading(true);
        setProgress(0);

        // Simulate progress for better UX
        if (showProgress) {
          const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + 10, 90));
          }, 100);
          
          // Clear progress interval after action completes
          setTimeout(() => clearInterval(progressInterval), 1000);
        }

        const context = {
          isOnline: network.status.isOnline,
          isFullyConnected: network.isFullyConnected,
          syncState: sync.status.state,
          hasQueuedOperations: sync.status.queuedCount > 0,
          services: Object.entries(health.connections).map(([name, connected]) => ({ name, status: connected ? 'healthy' : 'error' }))
        };

        await onAction?.(context);

        // Complete progress
        if (showProgress) {
          setProgress(100);
        }

        // Reset retry count on success
        setRetryCount(0);
        
        addToast('success', finalMessages.success!);
      } catch (error) {
        console.error(`ActionButton ${actionType} failed:`, error);
        
        const errorMessage = error instanceof Error ? error.message : finalMessages.error!;
        
        // Handle retry logic
        if (autoRetry?.enabled && attempt < autoRetry.maxAttempts) {
          setRetryCount(attempt);
          addToast('warning', `${finalMessages.error}, retrying... (${attempt}/${autoRetry.maxAttempts})`);
          
          setTimeout(() => {
            executeAction(attempt + 1);
          }, autoRetry.delay);
          return;
        }
        
        // Final failure
        setRetryCount(0);
        addToast('error', errorMessage);
      } finally {
        setIsLoading(false);
        if (showProgress) {
          setTimeout(() => setProgress(0), 500);
        }
      }
    };

    await executeAction();
  }, [
    canPerformAction,
    finalRequirements.confirmation,
    showConfirmation,
    onAction,
    actionType,
    showProgress,
    network,
    sync,
    health,
    autoRetry,
    finalMessages,
    addToast
  ]);

  // Variant styling
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600 focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 text-white border-green-600 focus:ring-green-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 focus:ring-yellow-500',
    ghost: 'bg-transparent hover:bg-gray-700 text-gray-300 hover:text-white border-gray-600 focus:ring-gray-500',
  };

  // Size styling
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };

  const isActuallyLoading = isLoading || externalLoading;
  const actionCheck = canPerformAction();
  const isActuallyDisabled = !actionCheck.can || isActuallyLoading;

  // Button classes
  const buttonClasses = `
    inline-flex items-center justify-center gap-2 rounded-md border font-medium
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
    transition-colors duration-200 relative overflow-hidden
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${isActuallyDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <>
      <button
        {...props}
        onClick={handleAction}
        disabled={isActuallyDisabled}
        className={buttonClasses}
        title={actionCheck.reason || props.title}
        data-testid={`action-button-${actionType}`}
      >
        {/* Progress bar overlay */}
        {showProgress && progress > 0 && (
          <div 
            className="absolute inset-0 bg-white/10 transition-all duration-300 ease-out"
            style={{ 
              width: `${progress}%`,
              transformOrigin: 'left'
            }}
          />
        )}

        {/* Loading spinner */}
        {isActuallyLoading && (
          <LoadingSpinner size="xs" />
        )}

        {/* Retry indicator */}
        {retryCount > 0 && (
          <span className="bg-yellow-500 text-black px-1 rounded text-xs">
            {retryCount}
          </span>
        )}

        {/* Custom icon */}
        {!isActuallyLoading && icon && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}

        {/* Button content */}
        <span className="flex-1">
          {isActuallyLoading ? finalMessages.loading : children}
        </span>

        {/* Status indicator */}
        {showStatus && !isActuallyLoading && (
          <ConnectionBadge compact size="xs" />
        )}

        {/* Disabled state indicators */}
        {!isActuallyLoading && finalRequirements.network && !network.isFullyConnected && (
          <span className="text-xs opacity-75" title="Requires internet">📱</span>
        )}
        {!isActuallyLoading && finalRequirements.services && !health.ready && (
          <span className="text-xs opacity-75" title="Services not ready">⚠️</span>
        )}
        {!isActuallyLoading && finalRequirements.syncIdle && sync.status.state === 'syncing' && (
          <span className="text-xs opacity-75" title="Syncing">🔄</span>
        )}
      </button>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Confirm {actionType === 'delete' ? 'Deletion' : 'Action'}
            </h3>
            <p className="text-gray-300 mb-4">{finalMessages.confirmation}</p>
            <div className="flex space-x-3">
              <button
                onClick={handleAction}
                className={`px-4 py-2 rounded transition-colors ${
                  variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Export the component wrapped with migration support
export const ActionButton = withServiceMigration(ActionButtonComponent);

// Export the unwrapped component for direct usage if needed
export { ActionButtonComponent };

export default ActionButton;
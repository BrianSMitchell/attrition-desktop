import React, { useState, useEffect } from 'react';
import { useEnhancedNetwork } from '../../stores/enhancedAppStore';
import { ERROR_MESSAGES, TIMEOUTS } from '@game/shared';
const ConnectionBanner: React.FC = () => {
  const network = useEnhancedNetwork();
  const [isVisible, setIsVisible] = useState(false);

  const isFullyConnected = network.status.isOnline && network.status.isApiReachable;

  useEffect(() => {
    // Show banner when connection state changes
    if (!isFullyConnected) {
      setIsVisible(true);
      // Auto-hide success banner after 3 seconds
      const timer = setTimeout(() => {
        if (isFullyConnected) {
          setIsVisible(false);
        }
      }, TIMEOUTS.THREE_SECONDS);
      return () => clearTimeout(timer);
    } else {
      // Hide immediately when connected
      setIsVisible(false);
    }
  }, [isFullyConnected]);

  if (!isVisible) return null;

  const getMessage = () => {
    if (!network.status.isOnline) return ERROR_MESSAGES.NO_INTERNET_CONNECTION;
    if (!network.status.isApiReachable) return 'Server unreachable';
    return 'Connected to server';
  };

  const getType = () => {
    if (!network.status.isOnline) return 'offline';
    if (!network.status.isApiReachable) return 'degraded';
    return 'online';
  };

  const type = getType();
  const message = getMessage();
  const isSuccess = type === 'online';
  const isWarning = type === 'degraded';
  const isError = type === 'offline';

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div
        className={`
          flex items-center justify-between px-4 py-2 text-sm font-medium transition-all duration-300 ease-in-out
          ${isSuccess ? 'bg-green-600' : ''}
          ${isWarning ? 'bg-yellow-600' : ''}
          ${isError ? 'bg-red-600' : ''}
        `}
      >
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isSuccess ? 'bg-green-200' : isWarning ? 'bg-yellow-200' : 'bg-red-200'}`} />
          <span>{message}</span>
          {network.status.latencyMs && (
            <span className="text-xs opacity-75">
              ({network.status.latencyMs}ms)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {!isSuccess && network.status.lastChecked && (
            <span className="text-xs opacity-75">
              Last checked: {new Date(network.status.lastChecked).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => setIsVisible(false)}
            className="opacity-75 hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionBanner;




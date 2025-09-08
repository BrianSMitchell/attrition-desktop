import React, { useState, useEffect } from 'react';
import { useNetwork } from '../../contexts/NetworkContext';

const ConnectionBanner: React.FC = () => {
  const { status: networkStatus, isFullyConnected } = useNetwork();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner when connection state changes
    if (!isFullyConnected) {
      setIsVisible(true);
      // Auto-hide success banner after 3 seconds
      const timer = setTimeout(() => {
        if (isFullyConnected) {
          setIsVisible(false);
        }
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      // Hide immediately when connected
      setIsVisible(false);
    }
  }, [isFullyConnected]);

  if (!isVisible) return null;

  const getMessage = () => {
    if (!networkStatus.isOnline) return 'No internet connection';
    if (!networkStatus.isApiReachable) return 'Server unreachable';
    return 'Connected to server';
  };

  const getType = () => {
    if (!networkStatus.isOnline) return 'offline';
    if (!networkStatus.isApiReachable) return 'degraded';
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
          {networkStatus.latencyMs && (
            <span className="text-xs opacity-75">
              ({networkStatus.latencyMs}ms)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {!isSuccess && networkStatus.lastChecked && (
            <span className="text-xs opacity-75">
              Last checked: {new Date(networkStatus.lastChecked).toLocaleTimeString()}
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

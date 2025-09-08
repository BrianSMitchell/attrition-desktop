import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentApiConfig } from '../utils/apiConfig';

export interface NetworkStatus {
  isOnline: boolean;
  isApiReachable: boolean;
  lastChecked: number;
  latencyMs?: number;
  error?: string;
}

interface NetworkContextType {
  status: NetworkStatus;
  isFullyConnected: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

interface NetworkProviderProps {
  children: React.ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isApiReachable: true,
    lastChecked: Date.now(),
  });

  const isFullyConnected = status.isOnline && status.isApiReachable;

  useEffect(() => {
    // Check network connectivity
    const checkConnectivity = async () => {
      try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        // Use the full API URL for desktop app
        const apiConfig = getCurrentApiConfig();
        const statusUrl = `${apiConfig.apiUrl.replace('/api', '')}/api/status`;
        console.log('🔍 NetworkContext: Checking connectivity to:', statusUrl);

        const response = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const endTime = Date.now();
        const latencyMs = endTime - startTime;
        
        console.log('✅ NetworkContext: API connectivity check result:', {
          ok: response.ok,
          status: response.status,
          latencyMs
        });

        setStatus({
          isOnline: true,
          isApiReachable: response.ok,
          lastChecked: Date.now(),
          latencyMs: response.ok ? latencyMs : undefined,
          error: response.ok ? undefined : `HTTP ${response.status}`,
        });
      } catch (error: any) {
        setStatus({
          isOnline: true,
          isApiReachable: false,
          lastChecked: Date.now(),
          error: error.name === 'AbortError' ? 'timeout' : error.message || 'network_error',
        });
      }
    };

    // Initial check
    checkConnectivity();

    // Browser online/offline events
    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        lastChecked: Date.now(),
      }));
      checkConnectivity();
    };

    const handleOffline = () => {
      setStatus({
        isOnline: false,
        isApiReachable: false,
        lastChecked: Date.now(),
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic checks every 30 seconds
    const intervalId = setInterval(checkConnectivity, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  const contextValue: NetworkContextType = {
    status,
    isFullyConnected,
  };

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
};

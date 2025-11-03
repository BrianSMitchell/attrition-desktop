import { INetworkManager, NetworkState, ConnectionEventCallback, ServiceOptions } from './types';
import { CircuitBreaker } from '../utils/CircuitBreaker';
import { getCurrentApiConfig } from '../../utils/apiConfig';

import { TIMEOUTS } from '@game/shared';
/**
 * NetworkManager handles network connectivity monitoring without circular dependencies.
 * Uses circuit breaker pattern to prevent API hammering during outages.
 */
export class NetworkManager implements INetworkManager {
  private state: NetworkState = {
    isOnline: navigator.onLine,
    isApiReachable: false, // Start pessimistic
    lastChecked: 0,
  };

  private listeners = new Set<ConnectionEventCallback<NetworkState>>();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private circuitBreaker: CircuitBreaker;
  private isInitialized = false;

  constructor(private options: ServiceOptions = {}) {
    // More tolerant circuit breaker for development
    const failureThreshold = options.enableLogging ? 10 : 3; // More failures allowed in dev
    const resetTimeoutMs = options.enableLogging ? 10000 : 30000; // Faster reset in dev
    this.circuitBreaker = new CircuitBreaker(failureThreshold, resetTimeoutMs, 'NetworkManager');
    this.setupBrowserEvents();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🌐 NetworkManager: Initializing...');
    
    // Initial connectivity check
    await this.checkConnectivity();
    
    this.isInitialized = true;
    console.log('🌐 NetworkManager: Initialized');
  }

  cleanup(): void {
    console.log('🌐 NetworkManager: Cleaning up...');
    
    this.stopMonitoring();
    this.listeners.clear();
    
    // Remove browser event listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    this.isInitialized = false;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getState(): NetworkState {
    return { ...this.state };
  }

  async checkConnectivity(): Promise<void> {
    if (!this.state.isOnline) {
      // If browser reports offline, don't even try API check
      this.updateState({
        ...this.state,
        isApiReachable: false,
        lastChecked: Date.now(),
        error: 'browser_offline',
      });
      return;
    }

    try {
      await this.circuitBreaker.execute(async () => {
        await this.performConnectivityCheck();
      });
    } catch (error) {
      // Circuit breaker is open or check failed
      this.updateState({
        ...this.state,
        isApiReachable: false,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'connectivity_check_failed',
      });
    }
  }

  private async performConnectivityCheck(): Promise<void> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.THREE_SECONDS); // Reduced timeout

    try {
      const apiConfig = getCurrentApiConfig();
      const statusUrl = `${apiConfig.apiUrl.replace('/api', '')}/api/system/status`;

      if (this.options.enableLogging) {
        console.log(`🌐 NetworkManager: Checking connectivity to ${statusUrl}`);
      }

      const response = await fetch(statusUrl, {
        method: 'HEAD', // Use HEAD instead of GET for lighter check
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      const endTime = Date.now();
      const latencyMs = endTime - startTime;

      this.updateState({
        isOnline: true,
        isApiReachable: response.ok,
        lastChecked: Date.now(),
        latencyMs: response.ok ? latencyMs : undefined,
        error: response.ok ? undefined : `http_${response.status}`,
      });

      if (this.options.enableLogging) {
        console.log(`🌐 NetworkManager: Check result - OK: ${response.ok}, Latency: ${latencyMs}ms`);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      const errorType = error.name === 'AbortError' ? 'timeout' : 'network_error';
      const errorMessage = error.message || 'Unknown network error';
      
      if (this.options.enableLogging) {
        console.warn(`🌐 NetworkManager: Connectivity check failed - ${errorType}: ${errorMessage}`);
      }
      
      this.updateState({
        isOnline: true,
        isApiReachable: false,
        lastChecked: Date.now(),
        error: errorType,
      });

      // Don't re-throw - let the service continue in offline mode
      // throw error; 
    }
  }

  startMonitoring(intervalMs?: number): void {
    if (this.monitoringInterval) return;

    const interval = typeof intervalMs === 'number' && intervalMs > 0 ? intervalMs : 30000; // Default 30 seconds
    
    this.monitoringInterval = setInterval(() => {
      this.checkConnectivity();
    }, interval);

    console.log(`🌐 NetworkManager: Started monitoring (${interval}ms interval)`);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🌐 NetworkManager: Stopped monitoring');
    }
  }

  onStateChange(callback: ConnectionEventCallback<NetworkState>): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current state
    callback(this.getState());
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  private setupBrowserEvents(): void {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline = (): void => {
    console.log('🌐 NetworkManager: Browser online event');
    this.updateState({
      ...this.state,
      isOnline: true,
      lastChecked: Date.now(),
    });
    
    // Check API connectivity when coming online
    this.checkConnectivity();
  };

  private handleOffline = (): void => {
    console.log('🌐 NetworkManager: Browser offline event');
    this.updateState({
      isOnline: false,
      isApiReachable: false,
      lastChecked: Date.now(),
      error: 'browser_offline',
    });
  };

  private updateState(newState: NetworkState): void {
    const oldState = this.state;
    this.state = { ...newState };

    // Notify listeners if state actually changed
    if (this.hasStateChanged(oldState, newState)) {
      this.listeners.forEach(callback => {
        try {
          callback(this.getState());
        } catch (error) {
          console.error('🌐 NetworkManager: Error in state change callback:', error);
        }
      });
    }
  }

  private hasStateChanged(oldState: NetworkState, newState: NetworkState): boolean {
    return (
      oldState.isOnline !== newState.isOnline ||
      oldState.isApiReachable !== newState.isApiReachable ||
      oldState.error !== newState.error
    );
  }
}
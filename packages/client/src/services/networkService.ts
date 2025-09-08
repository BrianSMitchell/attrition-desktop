// Simple network service for renderer process
// This is a lightweight version that works in the browser context

import { API_BASE_URL } from './api';
export interface NetworkStatus {
  isOnline: boolean;
  isApiReachable: boolean;
  lastChecked: number;
  latencyMs?: number;
  error?: string;
}

class NetworkService {
  private status: NetworkStatus = {
    isOnline: navigator.onLine,
    isApiReachable: true,
    lastChecked: Date.now(),
  };

  private listeners: Array<(status: NetworkStatus) => void> = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = API_BASE_URL;
    this.setupEventListeners();
    this.startPeriodicChecks();
  }

  private setupEventListeners() {
    const handleOnline = () => {
      this.status.isOnline = true;
      this.status.lastChecked = Date.now();
      this.notifyListeners();
      this.checkApiConnectivity(); // Check API reachability when coming online
    };

    const handleOffline = () => {
      this.status.isOnline = false;
      this.status.isApiReachable = false;
      this.status.lastChecked = Date.now();
      this.notifyListeners();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  private startPeriodicChecks() {
    // Check API connectivity every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkApiConnectivity();
    }, 30000);
  }

  private async checkApiConnectivity() {
    if (!this.status.isOnline) {
      this.status.isApiReachable = false;
      this.notifyListeners();
      return;
    }

    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${this.apiBaseUrl}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const endTime = Date.now();
      const latencyMs = endTime - startTime;

      this.status.isApiReachable = response.ok;
      this.status.latencyMs = response.ok ? latencyMs : undefined;
      this.status.lastChecked = Date.now();
      this.status.error = response.ok ? undefined : `HTTP ${response.status}`;
      this.notifyListeners();
    } catch (error: any) {
      this.status.isApiReachable = false;
      this.status.lastChecked = Date.now();
      this.status.error = error.name === 'AbortError' ? 'timeout' : error.message || 'network_error';
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    // Create a copy of the status to prevent mutation
    const statusCopy = { ...this.status };
    this.listeners.forEach(listener => {
      try {
        listener(statusCopy);
      } catch (error) {
        console.error('[NetworkService] Error notifying listener:', error);
      }
    });
  }

  public subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);
    // Immediately notify with current status
    listener({ ...this.status });
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getCurrentStatus(): NetworkStatus {
    return { ...this.status };
  }

  public isFullyConnected(): boolean {
    return this.status.isOnline && this.status.isApiReachable;
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.listeners = [];
  }
}

// Export singleton instance
const networkService = new NetworkService();
export default networkService;

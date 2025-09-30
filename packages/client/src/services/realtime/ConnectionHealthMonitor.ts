// Simple browser-compatible EventEmitter implementation
class EventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners[event] || [];
    eventListeners.forEach(callback => callback(...args));
  }

  off(event: string, callback: Function): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}
import { desktopBridge } from '../platform';

export interface ConnectionHealth {
  isHealthy: boolean;
  latency: number;
  lastPing: number;
  consecutiveFailures: number;
  connectionUptime: number;
  reconnectAttempts: number;
  lastReconnectTime?: number;
}

export interface ReconnectStrategy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterRange: number;
}

export interface HealthCheckOptions {
  pingIntervalMs?: number;
  healthCheckTimeoutMs?: number;
  unhealthyThreshold?: number;
  enableLogging?: boolean;
}

/**
 * ConnectionHealthMonitor provides health monitoring and intelligent reconnection
 * with exponential backoff for WebSocket connections.
 */
export class ConnectionHealthMonitor extends EventEmitter {
  private health: ConnectionHealth = {
    isHealthy: true,
    latency: 0,
    lastPing: 0,
    consecutiveFailures: 0,
    connectionUptime: 0,
    reconnectAttempts: 0,
  };

  private reconnectStrategy: ReconnectStrategy = {
    maxAttempts: 10,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterRange: 0.3,
  };

  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionStartTime: number = 0;
  private isDestroyed = false;
  
  private readonly options: Required<HealthCheckOptions>;
  
  constructor(options: HealthCheckOptions = {}) {
    super();
    
    this.options = {
      pingIntervalMs: 30000, // 30 seconds
      healthCheckTimeoutMs: 5000, // 5 seconds
      unhealthyThreshold: 3, // 3 consecutive failures
      enableLogging: false,
      ...options,
    };
  }

  /**
   * Start health monitoring
   */
  startMonitoring(): void {
    if (this.isDestroyed) {
      return;
    }

    this.connectionStartTime = Date.now();
    this.health.reconnectAttempts = 0;
    this.health.consecutiveFailures = 0;
    this.health.isHealthy = true;
    
    this.log('💓 Starting connection health monitoring');
    this.schedulePing();
    
    this.emit('monitoring-started');
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    this.log('💓 Stopping connection health monitoring');
    
    this.clearPingTimer();
    this.clearReconnectTimer();
    
    this.emit('monitoring-stopped');
  }

  /**
   * Record a successful ping response
   */
  recordPingSuccess(latency: number): void {
    this.health.latency = latency;
    this.health.lastPing = Date.now();
    this.health.consecutiveFailures = 0;
    this.health.connectionUptime = Date.now() - this.connectionStartTime;

    const wasUnhealthy = !this.health.isHealthy;
    this.health.isHealthy = true;

    if (wasUnhealthy) {
      this.log('💚 Connection health restored - latency:', latency + 'ms');
      this.emit('health-restored', this.health);
    }

    this.emit('ping-success', { latency, health: this.health });
  }

  /**
   * Record a failed ping or connection error
   */
  recordFailure(error: Error): void {
    this.health.consecutiveFailures++;
    this.health.lastPing = Date.now();

    const wasHealthy = this.health.isHealthy;
    this.health.isHealthy = this.health.consecutiveFailures < this.options.unhealthyThreshold;

    if (wasHealthy && !this.health.isHealthy) {
      this.log('💔 Connection became unhealthy after', this.health.consecutiveFailures, 'failures');
      this.emit('health-degraded', { health: this.health, error });
    }

    this.emit('ping-failure', { error, health: this.health });

    // Schedule reconnection if connection is unhealthy
    if (!this.health.isHealthy) {
      this.scheduleReconnect();
    }
  }

  /**
   * Get current connection health
   */
  getHealth(): ConnectionHealth {
    // Update connection uptime
    if (this.connectionStartTime > 0) {
      this.health.connectionUptime = Date.now() - this.connectionStartTime;
    }
    
    return { ...this.health };
  }

  /**
   * Update reconnect strategy
   */
  setReconnectStrategy(strategy: Partial<ReconnectStrategy>): void {
    this.reconnectStrategy = { ...this.reconnectStrategy, ...strategy };
    this.log('🔄 Updated reconnect strategy:', this.reconnectStrategy);
  }

  /**
   * Force a ping check
   */
  async performPingCheck(pingFunction: () => Promise<number>): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.log('🏓 Performing ping check...');
      
      const latency = await Promise.race([
        pingFunction(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Ping timeout')), this.options.healthCheckTimeoutMs)
        ),
      ]);
      
      this.recordPingSuccess(latency);
      
      // Record performance metric
      desktopBridge.recordPerformanceMetric(
        'websocket_ping', 
        latency, 
        true
      ).catch(() => {
        // Ignore metrics errors
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordFailure(error as Error);
      
      // Record performance metric
      desktopBridge.recordPerformanceMetric(
        'websocket_ping', 
        duration, 
        false, 
        (error as Error).message
      ).catch(() => {
        // Ignore metrics errors
      });
    }
  }

  /**
   * Reset connection state (called when manually reconnecting)
   */
  resetConnectionState(): void {
    this.log('🔄 Resetting connection state');
    
    this.health.reconnectAttempts++;
    this.health.lastReconnectTime = Date.now();
    this.connectionStartTime = Date.now();
    
    this.clearReconnectTimer();
    
    this.emit('connection-reset', this.health);
  }

  /**
   * Cleanup the monitor
   */
  destroy(): void {
    this.log('🧹 ConnectionHealthMonitor: Destroying...');
    
    this.isDestroyed = true;
    this.stopMonitoring();
    this.removeAllListeners();
  }

  private schedulePing(): void {
    if (this.pingTimer || this.isDestroyed) {
      return;
    }

    this.pingTimer = setTimeout(() => {
      this.pingTimer = null;
      this.emit('ping-required');
      
      // Schedule next ping
      this.schedulePing();
    }, this.options.pingIntervalMs);
  }

  private clearPingTimer(): void {
    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isDestroyed) {
      return;
    }

    if (this.health.reconnectAttempts >= this.reconnectStrategy.maxAttempts) {
      this.log('❌ Max reconnect attempts reached, giving up');
      this.emit('reconnect-abandoned', this.health);
      return;
    }

    const delay = this.calculateReconnectDelay();
    
    this.log('🔄 Scheduling reconnect in', delay + 'ms', '(attempt', this.health.reconnectAttempts + 1 + ')');
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.emit('reconnect-required', this.health);
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private calculateReconnectDelay(): number {
    const { baseDelayMs, maxDelayMs, backoffMultiplier, jitterRange } = this.reconnectStrategy;
    
    // Exponential backoff
    const exponentialDelay = Math.min(
      baseDelayMs * Math.pow(backoffMultiplier, this.health.reconnectAttempts),
      maxDelayMs
    );
    
    // Add jitter to avoid thundering herd
    const jitterMultiplier = 1 + (Math.random() - 0.5) * jitterRange;
    const delayWithJitter = exponentialDelay * jitterMultiplier;
    
    return Math.floor(delayWithJitter);
  }

  private log(...args: any[]): void {
    if (this.options.enableLogging) {
      console.log('[ConnectionHealthMonitor]', ...args);
    }
  }
}
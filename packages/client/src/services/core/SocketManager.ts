import { io, Socket } from 'socket.io-client';
import { 
  ISocketManager, 
  SocketState, 
  ServiceOptions, 
  ConnectionEventCallback 
} from './types';
import { CircuitBreaker } from './CircuitBreaker';
import { AsyncMutex } from './AsyncMutex';
import { getCurrentApiConfig } from '../../utils/apiConfig';
import { createMessageRouter, createHealthMonitor, MessageRouter, ConnectionHealthMonitor } from '../realtime';
import { desktopBridge } from '../platform';
import { getToken } from '../tokenProvider';

/**
 * SocketManager handles WebSocket connection management with built-in resilience.
 * It implements exponential backoff, circuit breaking, and mutex protection.
 */
export class SocketManager implements ISocketManager {
  private socket: Socket | null = null;
  private state: SocketState = {
    isConnected: false,
    reconnectAttempts: 0,
  };

  private stateChangeCallbacks = new Set<ConnectionEventCallback<SocketState>>();
  private eventListeners = new Map<string, Set<(...args: any[]) => void>>();

  private circuitBreaker: CircuitBreaker;
  private connectionMutex: AsyncMutex;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // Real-time services
  private messageRouter: MessageRouter;
  private healthMonitor: ConnectionHealthMonitor;

  private isInitialized = false;
  private isDestroyed = false;

  constructor(private _options: ServiceOptions = {}) {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringPeriod: 60000,
    });

    this.connectionMutex = new AsyncMutex({
      timeout: 10000,
      debug: this._options.enableLogging,
    });
    
    // Initialize real-time services
    this.messageRouter = createMessageRouter({
      enableLogging: this._options.enableLogging,
    });
    
    this.healthMonitor = createHealthMonitor({
      enableLogging: this._options.enableLogging,
      pingIntervalMs: 15000, // Check connection health every 15 seconds
    });
    
    this.setupHealthMonitoring();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔌 SocketManager: Initializing...');
    this.isInitialized = true;
  }

  cleanup(): void {
    console.log('🔌 SocketManager: Cleaning up...');
    
    this.isDestroyed = true;
    this.clearReconnectTimer();
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    // Clean up real-time services
    this.messageRouter.destroy();
    this.healthMonitor.destroy();

    this.stateChangeCallbacks.clear();
    this.eventListeners.clear();
    this.updateState({ isConnected: false, reconnectAttempts: 0 });
  }

  isReady(): boolean {
    return this.isInitialized && !this.isDestroyed;
  }

  getState(): SocketState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  async connect(): Promise<void> {
    if (!this.isReady()) {
      throw new Error('SocketManager not initialized or destroyed');
    }

    // Use mutex to prevent concurrent connection attempts
    return this.connectionMutex.execute(async () => {
      // Check if already connected
      if (this.socket?.connected) {
        console.log('🔌 SocketManager: Already connected');
        return;
      }

      // Check circuit breaker
      if (!this.circuitBreaker.canExecute()) {
        const state = this.circuitBreaker.getState();
        throw new Error(`Socket connection circuit breaker is ${state.state}`);
      }

      try {
        console.log('🔌 SocketManager: Attempting connection...');
        await this.performConnection();
        this.circuitBreaker.recordSuccess();
        
        // Reset reconnect attempts on successful connection
        this.updateState({
          isConnected: true,
          connectionId: this.socket?.id,
          lastConnected: Date.now(),
          reconnectAttempts: 0,
        });

        console.log('🔌 SocketManager: Connected successfully');
      } catch (error) {
        this.circuitBreaker.recordFailure();
        this.updateState({
          isConnected: false,
          reconnectAttempts: this.state.reconnectAttempts + 1,
        });
        throw error;
      }
    });
  }

  async disconnect(): Promise<void> {
    console.log('🔌 SocketManager: Disconnecting...');
    
    this.clearReconnectTimer();
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateState({ 
      isConnected: false, 
      connectionId: undefined,
      reconnectAttempts: 0 
    });
  }

  emit(event: string, data?: any): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('🔌 SocketManager: Cannot emit - socket not connected');
      return;
    }

    const startTime = Date.now();
    
    try {
      this.socket.emit(event, data);
      
      // Record performance metric
      const duration = Date.now() - startTime;
      desktopBridge.recordPerformanceMetric(
        `socket_emit_${event}`, 
        duration, 
        true
      ).catch(() => {});
      
    } catch (error) {
      console.error('🔌 SocketManager: Error emitting event:', event, error);
      
      // Record error metric
      const duration = Date.now() - startTime;
      desktopBridge.recordPerformanceMetric(
        `socket_emit_${event}`, 
        duration, 
        false, 
        error instanceof Error ? error.message : 'Unknown error'
      ).catch(() => {});
    }
  }

  on(event: string, callback: (...args: any[]) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(callback);

    // Create wrapper that routes through MessageRouter for advanced handling
    const wrappedCallback = (...args: any[]) => {
      // Route through MessageRouter for intelligent handling
      this.messageRouter.routeMessage(event, args.length === 1 ? args[0] : args, {
        source: 'websocket',
        timestamp: Date.now(),
      }).catch((error) => {
        console.error('🔌 SocketManager: Error routing message:', event, error);
      });
      
      // Still directly call the callback for backward compatibility
      callback(...args);
    };
    
    // Store association between original and wrapped callback
    (callback as any)._wrappedCallback = wrappedCallback;

    // If socket exists, add the listener immediately
    if (this.socket) {
      this.socket.on(event, wrappedCallback);
    }

    // Return cleanup function
    return () => {
      const callbacks = this.eventListeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.eventListeners.delete(event);
        }
      }
      
      if (this.socket) {
        this.socket.off(event, (callback as any)._wrappedCallback || callback);
      }
    };
  }

  onStateChange(callback: ConnectionEventCallback<SocketState>): () => void {
    this.stateChangeCallbacks.add(callback);
    
    // Immediately notify with current state
    callback(this.getState());
    
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

 private async performConnection(): Promise<void> {
    const apiConfig = getCurrentApiConfig();
    const socketUrl = apiConfig.socketUrl;

    // Get authentication token (will be provided by ConnectionManager)
    const token = await this.getAuthToken();

    const socketOptions: any = {
      transports: ['websocket'], // Force websocket only to avoid polling CORS issues
      auth: { token: token || '' },
      autoConnect: false, // We control connection manually
      timeout: 15000,
    };

    // Development-specific configuration
    if (process.env.NODE_ENV === 'development') {
      socketOptions.transports = ['websocket']; // Explicit websocket only
      socketOptions.reconnection = true;
      socketOptions.reconnectionAttempts = 5;
      socketOptions.reconnectionDelay = 1000;
      socketOptions.secure = false;
    } else {
      // Configure security based on environment
      if (apiConfig.httpsEnforced) {
        socketOptions.secure = true;
        socketOptions.rejectUnauthorized = true;
        socketOptions.transports = ['websocket']; // Prefer WebSocket for security
      } else {
        socketOptions.secure = false;
      }
    }

    console.log('🔌 SocketManager: Creating socket connection to:', socketUrl);
    console.log('🔌 SocketManager: Socket options:', {
      ...socketOptions,
      auth: { token: token ? '[PRESENT]' : '[MISSING]' }
    });
    
    this.socket = io(socketUrl, socketOptions);
    this.setupSocketEventHandlers();

    // Connect with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 30000); // Increased timeout to 30 seconds

      const onConnect = () => {
        clearTimeout(timeout);
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onConnectError);
        resolve();
      };

      const onConnectError = (error: any) => {
        clearTimeout(timeout);
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onConnectError);
        reject(error);
      };

      this.socket!.on('connect', onConnect);
      this.socket!.on('connect_error', onConnectError);
      this.socket!.connect();
    });
  }

  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected, ID:', this.socket?.id);
      this.clearReconnectTimer();
      
      // Update state
      this.updateState({
        isConnected: true,
        connectionId: this.socket?.id,
        lastConnected: Date.now(),
        reconnectAttempts: 0,
      });
      
      // Start health monitoring
      this.healthMonitor.startMonitoring();
      
      // Record connection success
      desktopBridge.recordPerformanceMetric(
        'socket_connection', 
        0, 
        true
      ).catch(() => {});
      
      // Add a ping handler
      this.socket!.on('pong', (latency: number) => {
        this.healthMonitor.recordPingSuccess(latency);
      });
      
      // Send initial ping to verify connection
      this.ping().catch(() => {});
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected, reason:', reason);
      
      // Stop health monitoring
      this.healthMonitor.stopMonitoring();
      
      // Update state
      this.updateState({
        isConnected: false,
        connectionId: undefined,
      });
      
      // Record disconnect event
      desktopBridge.recordPerformanceMetric(
        'socket_disconnect', 
        0, 
        true, 
        reason
      ).catch(() => {});
      
      // If disconnect was unexpected, trigger reconnect
      if (reason === 'transport error' || reason === 'ping timeout') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔥 Socket connection error:', error);
      
      // Update state
      this.updateState({
        isConnected: false,
        reconnectAttempts: this.state.reconnectAttempts + 1,
      });
      
      // Record connection error
      desktopBridge.recordPerformanceMetric(
        'socket_connection_error', 
        0, 
        false, 
        error?.message || 'Unknown connection error'
      ).catch(() => {});
      
      // Notify health monitor
      this.healthMonitor.recordFailure(error instanceof Error ? error : new Error(String(error)));
      
      // Schedule reconnect
      this.scheduleReconnect();
    });
    
    // Special handler for server-side errors
    this.socket.on('error', (error) => {
      console.error('🔥 Socket server error:', error);
      
      // Record server error
      desktopBridge.recordPerformanceMetric(
        'socket_server_error', 
        0, 
        false, 
        error?.message || 'Unknown server error'
      ).catch(() => {});
    });

    // Re-attach any existing event listeners using wrapped callbacks
    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        const wrappedCallback = (callback as any)._wrappedCallback || callback;
        this.socket!.on(event, wrappedCallback);
      });
    });
  }

  private updateState(updates: Partial<SocketState>): void {
    this.state = { ...this.state, ...updates };
    
    // Notify all state change callbacks
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(this.getState());
      } catch (error) {
        console.error('🔌 SocketManager: Error in state change callback:', error);
      }
    });
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isDestroyed) {
      return;
    }

    // Let the health monitor handle reconnection timing
    this.healthMonitor.resetConnectionState();
  }
  
  /**
   * Send ping to measure latency
   */
  private async ping(): Promise<number> {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Cannot ping - socket not connected');
    }
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Setup timeout
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);
      
      // Send ping
      this.socket!.emit('ping', () => {
        clearTimeout(timeout);
        const latency = Date.now() - startTime;
        resolve(latency);
      });
    });
  }
  
  /**
   * Setup health monitoring
   */
  private setupHealthMonitoring(): void {
    // Listen for ping requests from health monitor
    this.healthMonitor.on('ping-required', () => {
      if (this.socket?.connected) {
        this.healthMonitor.performPingCheck(() => this.ping())
          .catch(() => {}); // Errors handled inside performPingCheck
      }
    });
    
    // Listen for reconnect requests from health monitor
    this.healthMonitor.on('reconnect-required', () => {
      console.log('🔄 SocketManager: Reconnection required by health monitor');
      
      // Only reconnect if not already connected
      if (!this.socket?.connected) {
        this.connect().catch((error) => {
          console.error('🔥 SocketManager: Reconnection failed:', error);
        });
      }
    });
    
    // Listen for health degradation
    this.healthMonitor.on('health-degraded', ({ error }: any) => {
      console.warn('⚠️ SocketManager: Connection health degraded:', error);
      
      // Update state to reflect health issue
      this.updateState({
        healthIssue: error?.message || 'Connection health degraded',
      });
    });
    
    // Listen for health restoration
    this.healthMonitor.on('health-restored', () => {
      console.log('✅ SocketManager: Connection health restored');
      
      // Update state to clear health issue
      this.updateState({
        healthIssue: undefined,
      });
    });
  }

  private async getAuthToken(): Promise<string | null> {
    // First try to get current access token from token provider
    try {
      const accessToken = getToken();
      if (accessToken) {
        return accessToken;
      }
    } catch (error) {
      console.warn('🔌 SocketManager: Failed to get access token:', error);
    }
    
    // If no access token, we can't authenticate the socket connection
    // The authentication should be handled at a higher level
    console.warn('🔌 SocketManager: No access token available for socket authentication');
    return null;
  }
}

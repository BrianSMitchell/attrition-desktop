import { User, Empire } from '@game/shared';

/**
 * Network connection state information
 */
export interface NetworkState {
  isOnline: boolean;
  isApiReachable: boolean;
  lastChecked: number;
  latencyMs?: number;
  error?: string;
}

/**
 * Authentication state information
 */
export interface AuthState {
  user: Omit<User, 'passwordHash'> | null;
  empire: Empire | null;
  token: string | null;
  isAuthenticated: boolean;
}

/**
 * Socket connection state
 */
export interface SocketState {
  isConnected: boolean;
  connectionId?: string;
  lastConnected?: number;
  reconnectAttempts: number;
  healthIssue?: string;
}

/**
 * Sync queue state information
 */
export interface SyncState {
  queuedCount: number;
  isActive: boolean;
  lastSyncAt?: number;
  lastError?: string;
}

/**
 * Connection manager events
 */
export type ConnectionEvent = 
  | 'network-change'
  | 'auth-change'
  | 'socket-connect'
  | 'socket-disconnect'
  | 'sync-start'
  | 'sync-complete'
  | 'sync-error';

/**
 * Event callback signature
 */
export type ConnectionEventCallback<T = any> = (data: T) => void;

/**
 * Base interface for all managers
 */
export interface BaseManager {
  initialize(): Promise<void>;
  cleanup(): void;
  isReady(): boolean;
}

/**
 * Network manager interface
 */
export interface INetworkManager extends BaseManager {
  getState(): NetworkState;
  checkConnectivity(): Promise<void>;
  startMonitoring(intervalMs?: number): void;
  stopMonitoring(): void;
  onStateChange(callback: ConnectionEventCallback<NetworkState>): () => void;
}

/**
 * Authentication manager interface
 */
export interface IAuthManager extends BaseManager {
  getState(): AuthState;
  login(email: string, password: string): Promise<boolean>;
  logout(): Promise<void>;
  refreshToken(): Promise<boolean>;
  checkAuthStatus(): Promise<boolean>;
  onStateChange(callback: ConnectionEventCallback<AuthState>): () => void;
}

/**
 * Socket manager interface
 */
export interface ISocketManager extends BaseManager {
  getState(): SocketState;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  emit(event: string, data?: any): void;
  on(event: string, callback: (...args: any[]) => void): () => void;
  onStateChange(callback: ConnectionEventCallback<SocketState>): () => void;
}

/**
 * Sync manager interface
 */
export interface ISyncManager extends BaseManager {
  getState(): SyncState;
  startSync(): Promise<void>;
  flushQueue(): Promise<void>;
  getQueueCount(): Promise<number>;
  onStateChange(callback: ConnectionEventCallback<SyncState>): () => void;
}

/**
 * Connection manager configuration
 */
export interface ConnectionManagerConfig {
  networkCheckInterval?: number;
  authRefreshThreshold?: number;
  socketReconnectDelay?: number;
  syncFlushInterval?: number;
}

/**
 * Service initialization options
 */
export interface ServiceOptions {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * AsyncMutex configuration options
 */
export interface AsyncMutexOptions {
  timeout?: number;
  debug?: boolean;
}

/**
 * CircuitBreaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

/**
 * CircuitBreaker state information
 */
export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

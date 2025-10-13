import { Socket } from "socket.io-client";
import { SocketManager } from "./core/SocketManager";
import { ENV_VARS } from '../../../shared/src/constants/env-vars';
import { ENV_VALUES } from '@shared/constants/configuration-keys';


// Singleton socket instance - initialized lazily to prevent race conditions
let _socket: Socket | null = null;

// Lazy socket getter to prevent initialization race conditions
export const socket = () => {
  if (!_socket) {
    _socket = getSocket();
  }
  return _socket;
};

/**
 * Legacy socket API - now acts as a compatibility layer that delegates to SocketManager.
 * This maintains existing API contracts while using the new architecture.
 * 
 * IMPORTANT: This service no longer contains auth refresh logic or token management.
 * All coordination is handled by the SocketManager and ConnectionManager.
 */

// Singleton SocketManager instance
let socketManager: SocketManager | null = null;

// Get or create SocketManager instance
const getSocketManager = (): SocketManager => {
  if (!socketManager) {
    socketManager = new SocketManager({ enableLogging: process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.DEVELOPMENT });
  }
  return socketManager;
};

/**
 * Initialize the SocketManager if not already initialized.
 * This should be called by the ConnectionManager during app startup.
 */
const ensureInitialized = async (): Promise<void> => {
  const manager = getSocketManager();
  if (!manager.isReady()) {
    await manager.initialize();
  }
};

/**
 * Legacy connectSocket function - now delegates to SocketManager
 * @param provideToken - Token provider function (ignored - handled by ConnectionManager)
 * @returns Socket-like object for compatibility
 */
export function connectSocket(): Socket | null {
  console.log('[SOCKET-SERVICE] connectSocket called (now delegating to SocketManager)');
  
  try {
    const manager = getSocketManager();
    
    // Initialize if needed (should normally be done by ConnectionManager)
    if (!manager.isReady()) {
      console.warn('[SOCKET-SERVICE] SocketManager not initialized, initializing now');
      manager.initialize().catch(console.error);
    }
    
    // Attempt connection
    manager.connect().catch((error) => {
      console.error('[SOCKET-SERVICE] Connection failed:', error);
    });
    
    // Return a Socket-like interface for compatibility
    return createLegacySocketInterface(manager);
  } catch (error) {
    console.error('[SOCKET-SERVICE] connectSocket error:', error);
    return null;
  }
}

/**
 * Legacy getSocket function - now delegates to SocketManager
 * @returns Socket-like object or null
 */
export function getSocket(): Socket | null {
  try {
    const manager = getSocketManager();
    
    if (!manager.isReady() || !manager.isConnected()) {
      return null;
    }
    
    return createLegacySocketInterface(manager);
  } catch (error) {
    console.error('[SOCKET-SERVICE] getSocket error:', error);
    return null;
  }
}

/**
 * Legacy disconnectSocket function - now delegates to SocketManager
 */
export function disconnectSocket(): void {
  console.log('[SOCKET-SERVICE] disconnectSocket called (now delegating to SocketManager)');
  
  try {
    const manager = getSocketManager();
    
    if (manager.isReady()) {
      manager.disconnect().catch(console.error);
    }
  } catch (error) {
    console.error('[SOCKET-SERVICE] disconnectSocket error:', error);
  }
}

/**
 * Creates a Socket.IO-like interface for backward compatibility
 * @param manager - The SocketManager instance
 * @returns Socket-like object
 */
function createLegacySocketInterface(manager: SocketManager): Socket {
  // Create a minimal Socket-like interface
  // We use 'any' to avoid the complex Socket type requirements
  const legacySocket: any = {
    get connected() {
      return manager.isConnected();
    },
    
    get id() {
      const state = manager.getState();
      return state.connectionId || undefined;
    },
    
    emit(event: string, data?: any) {
      manager.emit(event, data);
    },
    
    on(event: string, callback: (...args: any[]) => void) {
      return manager.on(event, callback);
    },
    
    off() {
      // The SocketManager's on() method returns a cleanup function
      // For full compatibility, we'd need to store the cleanup functions
      console.warn('[SOCKET-SERVICE] socket.off() called - limited compatibility');
      return legacySocket;
    },
    
    removeAllListeners() {
      console.warn('[SOCKET-SERVICE] removeAllListeners() called - handled by SocketManager cleanup');
      return legacySocket;
    },
    
    connect() {
      manager.connect().catch(console.error);
      return legacySocket;
    },
    
    disconnect() {
      manager.disconnect().catch(console.error);
      return legacySocket;
    },
    
    // Additional Socket.IO properties for compatibility
    auth: {},
  };
  
  return legacySocket as Socket;
}

// Additional exports for ConnectionManager integration
export { getSocketManager, ensureInitialized };

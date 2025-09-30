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

export interface MessageHandler {
  (data: any, metadata: MessageMetadata): void | Promise<void>;
}

export interface MessageMetadata {
  messageId?: string;
  timestamp: number;
  source: 'websocket' | 'local';
  processed?: boolean;
}

export interface MessageRoute {
  pattern: string | RegExp;
  handler: MessageHandler;
  priority: number;
}

export interface MessageRouterOptions {
  enableLogging?: boolean;
  maxQueueSize?: number;
  processingTimeout?: number;
}

/**
 * MessageRouter handles WebSocket message routing and processing.
 * It separates message routing logic from connection management for better maintainability.
 */
export class MessageRouter extends EventEmitter {
  private routes: MessageRoute[] = [];
  private messageQueue: Array<{ event: string; data: any; metadata: MessageMetadata }> = [];
  private isProcessing = false;
  private isDestroyed = false;
  
  private readonly options: Required<MessageRouterOptions>;
  
  constructor(options: MessageRouterOptions = {}) {
    super();
    
    this.options = {
      enableLogging: false,
      maxQueueSize: 1000,
      processingTimeout: 5000,
      ...options,
    };
    
    this.setupDefaultRoutes();
  }

  /**
   * Register a message route
   */
  registerRoute(pattern: string | RegExp, handler: MessageHandler, priority: number = 0): void {
    this.routes.push({ pattern, handler, priority });
    
    // Sort routes by priority (higher priority first)
    this.routes.sort((a, b) => b.priority - a.priority);
    
    this.log('📝 Registered route:', { pattern, priority });
  }

  /**
   * Unregister a message route
   */
  unregisterRoute(pattern: string | RegExp): void {
    const initialLength = this.routes.length;
    this.routes = this.routes.filter(route => route.pattern !== pattern);
    
    if (this.routes.length < initialLength) {
      this.log('🗑️ Unregistered route:', pattern);
    }
  }

  /**
   * Route an incoming message
   */
  async routeMessage(event: string, data: any, metadata?: Partial<MessageMetadata>): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    const fullMetadata: MessageMetadata = {
      timestamp: Date.now(),
      source: 'websocket',
      ...metadata,
    };

    // Add to queue for processing
    if (this.messageQueue.length >= this.options.maxQueueSize) {
      this.log('⚠️ Message queue full, dropping oldest message');
      this.messageQueue.shift();
    }

    this.messageQueue.push({ event, data, metadata: fullMetadata });
    
    this.log('📨 Message queued:', { event, queueSize: this.messageQueue.length });
    
    // Start processing if not already running
    this.processMessageQueue();
  }

  /**
   * Get message routing statistics
   */
  getStats() {
    return {
      routeCount: this.routes.length,
      queueSize: this.messageQueue.length,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Clear the message queue
   */
  clearQueue(): void {
    const cleared = this.messageQueue.length;
    this.messageQueue = [];
    this.log('🗑️ Cleared message queue:', cleared, 'messages');
  }

  /**
   * Cleanup the router
   */
  destroy(): void {
    this.log('🧹 MessageRouter: Destroying...');
    
    this.isDestroyed = true;
    this.clearQueue();
    this.routes = [];
    this.removeAllListeners();
  }

  private async processMessageQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0 || this.isDestroyed) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.messageQueue.length > 0 && !this.isDestroyed) {
        const message = this.messageQueue.shift();
        if (!message) break;

        await this.processMessage(message.event, message.data, message.metadata);
      }
    } catch (error) {
      this.log('Error processing message queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processMessage(event: string, data: any, metadata: MessageMetadata): Promise<void> {
    const startTime = Date.now();
    let handled = false;

    try {
      this.log('🔄 Processing message:', { event, metadata });

      // Find matching routes
      const matchingRoutes = this.findMatchingRoutes(event);

      if (matchingRoutes.length === 0) {
        this.log('⚠️ No routes found for message:', event);
        this.emit('unhandled-message', { event, data, metadata });
        return;
      }

      // Process through matching routes
      for (const route of matchingRoutes) {
        try {
          await Promise.race([
            route.handler(data, metadata),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Handler timeout')), this.options.processingTimeout)
            ),
          ]);
          
          handled = true;
          this.log('✅ Message handled by route:', { event, pattern: route.pattern });
          break; // First successful handler wins
          
        } catch (error) {
          this.log('❌ Route handler error:', { event, pattern: route.pattern, error });
          continue; // Try next route
        }
      }

      if (!handled) {
        this.emit('message-handler-failed', { event, data, metadata });
      }

    } catch (error) {
      this.log('❌ Message processing error:', { event, error });
      this.emit('message-processing-error', { event, data, metadata, error });
    }

    // Record performance metric
    const duration = Date.now() - startTime;
    desktopBridge.recordPerformanceMetric(
      `message_route_${event}`, 
      duration, 
      handled, 
      handled ? undefined : 'No handler succeeded'
    ).catch(() => {
      // Ignore metrics errors
    });

    this.emit('message-processed', { event, data, metadata, handled, duration });
  }

  private findMatchingRoutes(event: string): MessageRoute[] {
    return this.routes.filter(route => {
      if (typeof route.pattern === 'string') {
        return route.pattern === event;
      } else if (route.pattern instanceof RegExp) {
        return route.pattern.test(event);
      }
      return false;
    });
  }

  private setupDefaultRoutes(): void {
    // Game state updates
    this.registerRoute('game:state:update', async (data) => {
      this.emit('game-state-update', data);
    }, 10);

    // User events
    this.registerRoute(/^user:/, async (data) => {
      this.emit('user-event', data);
    }, 8);

    // Fleet updates
    this.registerRoute('fleet:update', async (data) => {
      this.emit('fleet-update', data);
    }, 9);

    // Battle events
    this.registerRoute(/^battle:/, async (data) => {
      this.emit('battle-event', data);
    }, 10);

    // System/server messages
    this.registerRoute('system:message', async (data) => {
      this.emit('system-message', data);
    }, 5);

    // Connection status
    this.registerRoute('connection:status', async (data) => {
      this.emit('connection-status', data);
    }, 15);

    // Error messages
    this.registerRoute('error', async (data) => {
      this.emit('error-message', data);
    }, 15);

    // Generic fallback
    this.registerRoute(/.+/, async (data) => {
      this.log('📢 Generic message handler:', { data });
      this.emit('generic-message', data);
    }, -10); // Lowest priority
  }

  private log(...args: any[]): void {
    if (this.options.enableLogging) {
      console.log('[MessageRouter]', ...args);
    }
  }
}
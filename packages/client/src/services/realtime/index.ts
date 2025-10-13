import { ENV_VARS } from '../../../shared/src/constants/env-vars';
import { ENV_VALUES } from '@shared/constants/configuration-keys';

// Message routing
export { 
  MessageRouter, 
  type MessageHandler, 
  type MessageMetadata, 
  type MessageRoute, 
  type MessageRouterOptions 
} from './MessageRouter';

// Connection health monitoring
export { 
  ConnectionHealthMonitor, 
  type ConnectionHealth, 
  type ReconnectStrategy, 
  type HealthCheckOptions 
} from './ConnectionHealthMonitor';

// Import types for convenience functions
import type { MessageRouterOptions } from './MessageRouter';
import type { HealthCheckOptions } from './ConnectionHealthMonitor';
import { MessageRouter } from './MessageRouter';
import { ConnectionHealthMonitor } from './ConnectionHealthMonitor';

// Convenience function to create a configured message router
export function createMessageRouter(options: MessageRouterOptions = {}) {
  return new MessageRouter({
    enableLogging: process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.DEVELOPMENT,
    ...options,
  });
}

// Convenience function to create a configured health monitor
export function createHealthMonitor(options: HealthCheckOptions = {}) {
  return new ConnectionHealthMonitor({
    enableLogging: process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.DEVELOPMENT,
    ...options,
  });
}

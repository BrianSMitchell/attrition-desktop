
/**
 * Legacy compatibility layer for existing services.
 * This provides the same interface as the old services while using the new architecture.
 */

// Legacy authService compatibility - now uses the refactored authService
// The refactored authService already acts as a compatibility layer
export { authService } from '../authService';

// Legacy networkService compatibility - now uses the refactored networkService
// The refactored networkService already acts as a compatibility layer
export { default as networkService } from '../networkService';

// Legacy socket compatibility - now uses the refactored socket service
// The refactored socket service already acts as a compatibility layer
export { getSocket, connectSocket, disconnectSocket } from '../socket';

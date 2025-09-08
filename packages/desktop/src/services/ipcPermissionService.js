/**
 * IPC Permission Service
 * Provides authorization checks for sensitive IPC operations
 * 
 * Features:
 * - Role-based access control
 * - Admin mode detection
 * - Debug mode permissions
 * - Operation-specific access control
 */

import errorLogger from './errorLoggingService.js';

class IPCPermissionService {
  constructor() {
    // Permission cache to avoid repeated checks
    this.permissionCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Admin mode detection
    this.isAdminMode = this.detectAdminMode();
    this.isDebugMode = this.detectDebugMode();
    
    // Sensitive operations that require special permissions
    this.restrictedOperations = new Set([
      'security:getAuditLog',
      'error:export',
      'perf:export',
      'error:clear',
      'perf:clear'
    ]);
    
    // Operations that require admin mode
    this.adminOperations = new Set([
      'security:getAuditLog',
      'error:export',
      'perf:export'
    ]);
    
    // Operations that require debug mode or admin
    this.debugOperations = new Set([
      'error:clear',
      'perf:clear'
    ]);
  }
  
  /**
   * Detect if running in admin/development mode
   * @returns {boolean} True if admin privileges detected
   */
  detectAdminMode() {
    try {
      // Check environment variables that indicate admin/dev mode
      const adminIndicators = [
        process.env.NODE_ENV === 'development',
        process.env.ELECTRON_IS_DEV === '1',
        process.env.DEBUG === '1',
        process.env.ADMIN_MODE === '1',
        // Check if running with --admin flag
        process.argv.includes('--admin'),
        process.argv.includes('--dev'),
        // Check if not packaged (development)
        !require('electron').app.isPackaged
      ];
      
      return adminIndicators.some(indicator => indicator === true);
    } catch (error) {
      errorLogger.warn('Failed to detect admin mode', error);
      return false;
    }
  }
  
  /**
   * Detect if running in debug mode
   * @returns {boolean} True if debug mode detected
   */
  detectDebugMode() {
    try {
      const debugIndicators = [
        process.env.NODE_ENV === 'development',
        process.env.DEBUG === '1',
        process.env.ELECTRON_ENABLE_LOGGING === '1',
        process.argv.includes('--debug'),
        process.argv.includes('--verbose')
      ];
      
      return debugIndicators.some(indicator => indicator === true);
    } catch (error) {
      errorLogger.warn('Failed to detect debug mode', error);
      return false;
    }
  }
  
  /**
   * Check if an operation requires special permissions
   * @param {string} channel - IPC channel name
   * @returns {boolean} True if operation is restricted
   */
  isRestrictedOperation(channel) {
    return this.restrictedOperations.has(channel);
  }
  
  /**
   * Check if user has permission for an operation
   * @param {string} channel - IPC channel name
   * @param {string} processId - Renderer process ID (for caching)
   * @returns {{ allowed: boolean, reason?: string }}
   */
  checkPermission(channel, processId = 'default') {
    // Check cache first
    const cacheKey = `${channel}:${processId}`;
    const cached = this.permissionCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
      return { allowed: cached.allowed, reason: cached.reason };
    }
    
    // Perform permission check
    let allowed = true;
    let reason = null;
    
    if (this.isRestrictedOperation(channel)) {
      if (this.adminOperations.has(channel)) {
        if (!this.isAdminMode) {
          allowed = false;
          reason = 'Admin privileges required';
        }
      } else if (this.debugOperations.has(channel)) {
        if (!this.isDebugMode && !this.isAdminMode) {
          allowed = false;
          reason = 'Debug mode or admin privileges required';
        }
      }
    }
    
    // Cache the result
    this.permissionCache.set(cacheKey, {
      allowed,
      reason,
      timestamp: Date.now()
    });
    
    // Log permission check for restricted operations
    if (this.isRestrictedOperation(channel)) {
      errorLogger.info(`Permission check: ${channel}`, {
        allowed,
        reason,
        processId,
        isAdminMode: this.isAdminMode,
        isDebugMode: this.isDebugMode
      });
    }
    
    return { allowed, reason };
  }
  
  /**
   * Clear permission cache (useful for testing or mode changes)
   */
  clearCache() {
    this.permissionCache.clear();
    
    // Re-detect modes
    this.isAdminMode = this.detectAdminMode();
    this.isDebugMode = this.detectDebugMode();
    
    errorLogger.info('IPC permission cache cleared', {
      isAdminMode: this.isAdminMode,
      isDebugMode: this.isDebugMode
    });
  }
  
  /**
   * Add a restricted operation
   * @param {string} channel - IPC channel to restrict
   * @param {string} type - Type of restriction (admin, debug)
   */
  addRestrictedOperation(channel, type = 'admin') {
    this.restrictedOperations.add(channel);
    
    if (type === 'admin') {
      this.adminOperations.add(channel);
    } else if (type === 'debug') {
      this.debugOperations.add(channel);
    }
    
    // Clear cache to ensure new restrictions take effect
    this.clearCache();
  }
  
  /**
   * Remove a restricted operation
   * @param {string} channel - IPC channel to unrestrict
   */
  removeRestrictedOperation(channel) {
    this.restrictedOperations.delete(channel);
    this.adminOperations.delete(channel);
    this.debugOperations.delete(channel);
    
    // Clear cache
    this.clearCache();
  }
  
  /**
   * Get permission statistics
   * @returns {object} Permission stats
   */
  getPermissionStats() {
    return {
      isAdminMode: this.isAdminMode,
      isDebugMode: this.isDebugMode,
      restrictedOperations: this.restrictedOperations.size,
      adminOperations: this.adminOperations.size,
      debugOperations: this.debugOperations.size,
      cachedPermissions: this.permissionCache.size
    };
  }
}

// Export singleton instance
const ipcPermissionService = new IPCPermissionService();
export default ipcPermissionService;

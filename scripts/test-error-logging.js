#!/usr/bin/env node

/**
 * Test script to verify error logging functionality without event queue spam
 * Run this from the desktop package directory: node ../../scripts/test-error-logging.js
 */

import { app } from 'electron';
import desktopDb from '../packages/desktop/src/db.js';
import { DesktopErrorLogger, ErrorSeverity, ErrorCategory } from '../packages/desktop/src/services/errorLoggingService.js';

// Mock app if not running in Electron context
if (!app) {
  global.app = {
    getPath: () => './test-logs'
  };
}

async function testErrorLogging() {
  console.log('🧪 Testing Error Logging System...\n');
  
  try {
    // Initialize database
    desktopDb.init();
    
    // Initialize error logger
    const logger = new DesktopErrorLogger();
    
    // Test different error levels
    console.log('Testing different error levels:');
    
    // DEBUG level (should not queue in any environment)
    logger.debug('Debug message - should not queue');
    
    // INFO level (should not queue in any environment)
    logger.info('Info message - should not queue');
    
    // WARN level (should not queue unless ENABLE_ERROR_SYNC=true)
    logger.warn('Warning message - should not queue in dev');
    
    // ERROR level (should not queue unless ENABLE_ERROR_SYNC=true)
    logger.error('Error message - should not queue in dev', new Error('Test error'));
    
    // FATAL level (should queue in production, not in dev unless ENABLE_ERROR_SYNC=true)
    logger.fatal('Fatal error - may queue depending on environment', new Error('Fatal test error'));
    
    // Get queue stats
    console.log('\\n📊 Queue Statistics After Testing:');
    const errorEventCount = desktopDb.getPendingEventsCount('error');
    const allEventStats = desktopDb.getEventStats();
    
    console.log(`Error events queued: ${errorEventCount}`);
    console.log('All event stats:', allEventStats);
    
    // Test environment variables
    console.log('\\n🌍 Environment Variables:');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`ENABLE_ERROR_SYNC: ${process.env.ENABLE_ERROR_SYNC || 'undefined'}`);
    
    // Test cleanup function
    console.log('\\n🧹 Testing Error Queue Cleanup:');
    const beforeCleanup = desktopDb.getPendingEventsCount('error');
    const clearedCount = desktopDb.clearEventsByKind('error');
    const afterCleanup = desktopDb.getPendingEventsCount('error');
    
    console.log(`Before cleanup: ${beforeCleanup} error events`);
    console.log(`Cleared: ${clearedCount} error events`);
    console.log(`After cleanup: ${afterCleanup} error events`);
    
    console.log('\\n✅ Error logging test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    desktopDb.close();
  }
}

// Run the test
testErrorLogging().catch(console.error);
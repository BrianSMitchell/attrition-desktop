#!/usr/bin/env node

/**
 * Emergency cleanup script to clear error events from the desktop database
 * This should be run to clean up the 5595+ error events that were queued
 */

import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine database path - should match the desktop app's path
const userDataPath = process.env.APPDATA || 
                    (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') :
                     path.join(process.env.HOME, '.local', 'share'));

const dbPath = path.join(userDataPath, '@game', 'desktop', 'attrition-desktop.db');

console.log('🗄️  Attrition Error Queue Cleanup Script');
console.log('==========================================');
console.log(`Database path: ${dbPath}`);

async function cleanupErrorQueue() {
  let db;
  
  try {
    // Connect to database
    db = new Database(dbPath);
    console.log('✅ Connected to database');
    
    // Check current error event count
    const beforeStmt = db.prepare(`
      SELECT COUNT(*) as count FROM event_queue WHERE kind = 'error'
    `);
    const beforeCount = beforeStmt.get().count;
    console.log(`📊 Current error events in queue: ${beforeCount}`);
    
    // Get total event count for context
    const totalStmt = db.prepare(`
      SELECT COUNT(*) as count FROM event_queue
    `);
    const totalCount = totalStmt.get().count;
    console.log(`📊 Total events in queue: ${totalCount}`);
    
    // Show event breakdown by kind
    const statsStmt = db.prepare(`
      SELECT kind, status, COUNT(*) as count 
      FROM event_queue 
      GROUP BY kind, status 
      ORDER BY count DESC
    `);
    const stats = statsStmt.all();
    console.log('\\n📈 Event Queue Breakdown:');
    stats.forEach(stat => {
      console.log(`   ${stat.kind} (${stat.status}): ${stat.count}`);
    });
    
    if (beforeCount === 0) {
      console.log('\\n✅ No error events to clean up!');
      return;
    }
    
    console.log('\\n🧹 Starting cleanup...');
    
    // Delete all error events
    const deleteStmt = db.prepare(`
      DELETE FROM event_queue WHERE kind = 'error'
    `);
    const result = deleteStmt.run();
    
    console.log(`✅ Deleted ${result.changes} error events`);
    
    // Verify cleanup
    const afterCount = beforeStmt.get().count;
    console.log(`📊 Error events remaining: ${afterCount}`);
    
    // Show new total
    const newTotalCount = totalStmt.get().count;
    console.log(`📊 New total events in queue: ${newTotalCount}`);
    
    console.log('\\n🎉 Error queue cleanup completed successfully!');
    console.log(`   Removed: ${beforeCount} error events`);
    console.log(`   Database size reduced significantly`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    
    if (error.code === 'SQLITE_CANTOPEN') {
      console.error('\\n💡 Possible solutions:');
      console.error('   1. Make sure the desktop app is not running');
      console.error('   2. Check if the database path is correct');
      console.error('   3. Run this script with appropriate permissions');
    }
    
  } finally {
    if (db) {
      db.close();
      console.log('📝 Database connection closed');
    }
  }
}

// Run cleanup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupErrorQueue()
    .then(() => {
      console.log('\\n🚀 You can now restart the desktop app - it should start much faster!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}
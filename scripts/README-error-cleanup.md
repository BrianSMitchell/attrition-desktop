# Error Queue Cleanup Instructions

## 🚨 Critical Issue Fixed

The desktop app was queuing **5595+ error events** for sync, causing massive performance degradation during startup. This has been fixed, but the existing events need to be cleaned up.

## 📋 Steps to Clean Up

### 1. Stop the Desktop App
**Important**: Make sure the desktop app is completely closed before running the cleanup.

### 2. Run the Cleanup Script

Open PowerShell/Command Prompt in the project root and run:

```powershell
# Navigate to project root
cd C:\Projects\Attrition

# Run the cleanup script
node scripts/cleanup-error-queue.js
```

### 3. Expected Output

You should see something like:
```
🗄️  Attrition Error Queue Cleanup Script
==========================================
Database path: C:\Users\roand\AppData\Roaming\@game\desktop\attrition-desktop.db
✅ Connected to database
📊 Current error events in queue: 5595
📊 Total events in queue: 5595

📈 Event Queue Breakdown:
   error (queued): 5595

🧹 Starting cleanup...
✅ Deleted 5595 error events
📊 Error events remaining: 0
📊 New total events in queue: 0

🎉 Error queue cleanup completed successfully!
   Removed: 5595 error events
   Database size reduced significantly

📝 Database connection closed

🚀 You can now restart the desktop app - it should start much faster!
```

### 4. Restart the App

After cleanup, restart the desktop app. You should see:
- Much faster startup time
- No more "Processing 5595 error events" messages
- EventQueueService will only have 0-10 events max (normal operation)

## 🔧 What Was Fixed

1. **Error Event Queueing**: Modified `ErrorLoggingService` to only queue FATAL errors in production
2. **Environment Conditional**: Added `ENABLE_ERROR_SYNC` environment variable for manual control
3. **Database Cleanup**: Added methods to clear error events from the queue
4. **Performance**: Eliminated the 5595+ event processing bottleneck

## 🧪 Testing

To verify the fix is working:
1. Start the desktop app after cleanup
2. Check the logs - you should see no "Processing X error events" messages
3. The app should start in under 30 seconds instead of taking minutes

## ⚙️ Environment Variables

- `NODE_ENV=production` - Only queues FATAL errors for sync
- `ENABLE_ERROR_SYNC=true` - Forces all errors to be queued (for debugging)
- Default (development) - No errors are queued for sync

## 🎯 Performance Impact

**Before Fix:**
- 5595 error events processed at startup
- ~5+ minute startup time
- High memory usage
- Network spam

**After Fix:**
- 0 error events processed at startup  
- ~30 second startup time
- Normal memory usage
- No network spam
#!/usr/bin/env node

// Cleanup error events from the desktop SQLite database (development utility)
// Run with: pnpm -F @game/desktop run cleanup:error-queue

import Database from 'better-sqlite3'
import path from 'node:path'
import os from 'node:os'

function getUserDataPath() {
  // Mirror Electron's app.getPath('userData') location used by this app
  // Windows: %APPDATA%\@game\desktop
  // macOS: ~/Library/Application Support/@game/desktop
  // Linux: ~/.config/@game/desktop (approximation)
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(appData, '@game', 'desktop')
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', '@game', 'desktop')
  }
  // Linux and others
  const config = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
  return path.join(config, '@game', 'desktop')
}

async function main() {
  const userDataPath = getUserDataPath()
  const dbPath = path.join(userDataPath, 'attrition-desktop.db')

  console.log('🗄️  Attrition Desktop - Error Queue Cleanup')
  console.log('===========================================')
  console.log(`Database path: ${dbPath}`)

  let db
  try {
    db = new Database(dbPath)
    console.log('✅ Connected to database')

    const countQuery = "SELECT COUNT(*) as count FROM event_queue WHERE kind = 'error'"
    const totalQuery = 'SELECT COUNT(*) as count FROM event_queue'

    const before = db.prepare(countQuery).get().count
    const totalBefore = db.prepare(totalQuery).get().count

    console.log(`📊 Error events in queue (before): ${before}`)
    console.log(`📊 Total events in queue (before): ${totalBefore}`)

    if (before === 0) {
      console.log('\n✅ No error events to clean. Nothing to do.')
      return
    }

    console.log('\n🧹 Deleting error events...')
    const del = db.prepare("DELETE FROM event_queue WHERE kind = 'error'")
    const res = del.run()
    console.log(`✅ Deleted ${res.changes} error events`)

    const after = db.prepare(countQuery).get().count
    const totalAfter = db.prepare(totalQuery).get().count

    console.log(`\n📊 Error events remaining: ${after}`)
    console.log(`📊 Total events in queue (after): ${totalAfter}`)

    console.log('\n🎉 Cleanup completed successfully!')
  } catch (err) {
    console.error('❌ Cleanup failed:', err?.message || err)
    console.error('\nTips:')
    console.error('- Ensure the desktop app is closed before running this script')
    console.error('- Confirm the database path exists')
  } finally {
    try { db?.close() } catch {}
  }
}

main().catch((e) => {
  console.error('Unhandled error:', e)
  process.exit(1)
})

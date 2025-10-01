#!/usr/bin/env node

// Cleanup error events using Electron runtime (matches better-sqlite3 ABI built for Electron)
// Run with: pnpm -F @game/desktop run cleanup:error-queue:electron

import { app } from 'electron'
import desktopDb from '../src/db.js'

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log('🗄️  Attrition Desktop - Error Queue Cleanup (Electron)')
  console.log('====================================================')

  try {
    await app.whenReady()
    const db = desktopDb.init()

    const before = desktopDb.getPendingEventsCount('error')
    const totalBefore = desktopDb.getPendingEventsCount(null)
    console.log(`📊 Error events in queue (before): ${before}`)
    console.log(`📊 Total queued events (before): ${totalBefore}`)

    if (before === 0) {
      console.log('\n✅ No error events to clean. Nothing to do.')
      await sleep(50)
      app.exit(0)
      return
    }

    console.log('\n🧹 Deleting error events...')
    const cleared = desktopDb.clearEventsByKind('error')
    console.log(`✅ Deleted ${cleared} error events`)

    const after = desktopDb.getPendingEventsCount('error')
    const totalAfter = desktopDb.getPendingEventsCount(null)
    console.log(`\n📊 Error events remaining: ${after}`)
    console.log(`📊 Total queued events (after): ${totalAfter}`)

    console.log('\n🎉 Cleanup completed successfully!')
  } catch (err) {
    console.error('❌ Cleanup failed:', err?.message || err)
  } finally {
    await sleep(50)
    app.exit(0)
  }
}

main().catch((e) => {
  console.error('Unhandled error:', e)
  app.exit(1)
})

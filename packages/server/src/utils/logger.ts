// Lightweight logger that respects DEBUG_RESOURCES
// Usage:
//   import { logger } from './utils/logger'
//   logger.info('message', ctx)
//   logger.warn('warn')
//   logger.error('error')
// Namespacing:
//   const log = logger.withNamespace('HybridLoop')
//   log.info('started')
// Console patch (optional):
//   import { initLogger } from './utils/logger'
//   initLogger() // redirects console.info/debug automatically; optionally console.log when DEBUG_PATCH_LOG=true

/* eslint-disable no-console */

export type LogMethod = (...args: any[]) => void

function isInfoEnabled(): boolean {
  return process.env.DEBUG_RESOURCES === 'true'
}

function fmtNs(ns?: string): string {
  return ns ? `[${ns}]` : ''
}

export interface ILogger {
  info: LogMethod
  debug: LogMethod
  warn: LogMethod
  error: LogMethod
  withNamespace(ns: string): ILogger
}

function createLogger(ns?: string): ILogger {
  const info: LogMethod = (...args) => {
    if (isInfoEnabled()) console.info(fmtNs(ns), ...args)
  }
  const debug: LogMethod = (...args) => {
    if (isInfoEnabled()) console.debug(fmtNs(ns), ...args)
  }
  const warn: LogMethod = (...args) => console.warn(fmtNs(ns), ...args)
  const error: LogMethod = (...args) => console.error(fmtNs(ns), ...args)

  return {
    info,
    debug,
    warn,
    error,
    withNamespace(childNs: string) {
      const merged = ns ? `${ns}:${childNs}` : childNs
      return createLogger(merged)
    },
  }
}

export const logger = createLogger()

/**
 * initLogger: optionally patch console methods so future logs follow DEBUG_RESOURCES
 * - Always redirects console.info/debug to gated versions
 * - If DEBUG_PATCH_LOG === 'true', also redirects console.log to gated version
 */
export function initLogger() {
  const gatedInfo: LogMethod = (...args) => {
    if (isInfoEnabled()) console.__orig_info ? console.__orig_info(...args) : console.log(...args)
  }
  const gatedDebug: LogMethod = (...args) => {
    if (isInfoEnabled()) console.__orig_debug ? console.__orig_debug(...args) : console.log(...args)
  }

  // Preserve original methods to avoid recursion
  ;(console as any).__orig_info = (console as any).__orig_info || console.info.bind(console)
  ;(console as any).__orig_debug = (console as any).__orig_debug || console.debug.bind(console)
  ;(console as any).__orig_log = (console as any).__orig_log || console.log.bind(console)

  // Patch info/debug unconditionally to respect DEBUG_RESOURCES
  console.info = gatedInfo as any
  console.debug = gatedDebug as any

  // Optional: also gate console.log if explicitly requested (safer opt-in)
  if (process.env.DEBUG_PATCH_LOG === 'true') {
    const gatedLog: LogMethod = (...args) => {
      if (isInfoEnabled()) (console as any).__orig_log(...args)
    }
    console.log = gatedLog as any
  }
}

import { ENV_VARS } from '@game/shared';
import { ENV_VALUES } from '@game/shared';

// Centralized runtime environment helpers

function parseBooleanEnv(name: string, defaultValue = false): boolean {
  const v = process.env[name];
  if (!v) return defaultValue;
  const s = v.toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

/**
 * Detect if TLS is terminated by a reverse proxy (e.g., Render, Cloudflare).
 * This enables proxy-aware behavior (no local HTTPS probes, etc.).
 */
export function isReverseProxySSL(): boolean {
  // Explicit project flag or platform-provided flag
  return parseBooleanEnv('USE_REVERSE_PROXY_SSL') || parseBooleanEnv('RENDER');
}

/** Convenience: whether we're in production mode */
export function isProduction(): boolean {
  return (process.env[ENV_VARS.NODE_ENV] || '').toLowerCase() === ENV_VALUES.PRODUCTION;
}

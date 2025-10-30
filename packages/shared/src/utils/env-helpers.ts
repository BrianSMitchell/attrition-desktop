/**
 * Safe environment variable access utilities
 *
 * Provides type-safe and validated access to environment variables
 * with proper null checking and type conversion.
 */

/**
 * Safely get a string environment variable
 * @param key Environment variable name
 * @param defaultValue Default value if not set (optional)
 * @returns The environment variable value or default
 */
export function getEnvString(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];
  return value !== undefined ? value : defaultValue;
}

/**
 * Safely get a boolean environment variable
 * @param key Environment variable name
 * @param defaultValue Default value if not set (optional)
 * @returns The environment variable value as boolean
 */
export function getEnvBoolean(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Safely get a number environment variable
 * @param key Environment variable name
 * @param defaultValue Default value if not set (optional)
 * @returns The environment variable value as number, or NaN if conversion fails
 */
export function getEnvNumber(key: string, defaultValue?: number): number | undefined {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Check if running behind a reverse proxy with SSL termination
 * @returns True if reverse proxy SSL termination detected
 */
export function isReverseProxySSL(): boolean {
  // Check common reverse proxy indicators
  const forwardedProto = getEnvString('X-Forwarded-Proto');
  const forwardedSSL = getEnvString('X-Forwarded-SSL');
  const sslOffloaded = getEnvString('X-SSL-Offloaded');
  const renderSSL = getEnvString('RENDER_SSL_REDIRECT_ENABLED');

  // Check for cloud platform SSL termination
  const render = process.env.RENDER_INSTANCE_ID !== undefined;
  const vercel = process.env.VERCEL_ENV !== undefined;
  const netlify = process.env.NETLIFY === 'true';

  return !!(
    forwardedProto === 'https' ||
    forwardedSSL === 'on' ||
    sslOffloaded === 'on' ||
    renderSSL === 'true' ||
    render ||
    vercel ||
    netlify
  );
}

/**
 * Safely get environment variable for external service URLs
 * @param key Environment variable key
 * @param defaultValue Default value (optional)
 * @returns Valid URL string or undefined
 */
export function getEnvUrl(key: string, defaultValue?: string): string | undefined {
  const value = getEnvString(key);
  if (!value && !defaultValue) return undefined;

  const url = value || defaultValue;
  if (!url) return undefined;

  try {
    new URL(url);
    return url;
  } catch {
    // If invalid URL, return undefined to indicate error
    console.warn(`Warning: Invalid URL in ${key}: ${url}`);
    return undefined;
  }
}

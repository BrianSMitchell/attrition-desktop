import type { HttpRequestParams, HttpResponse, Logger } from '../types/index.js';
import errorLogger from './errorLoggingService.js';
import { createPinnedHttpsAgent } from './certificatePinning.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { ERROR_MESSAGES, ENV_VARS } = require('../../../shared/dist/cjs/index.js');

/**
 * Secure HTTP client with SSL validation, timeout, robust parsing, and normalized error mapping.
 * Returns a transport-level result (not the server DTO), so main handlers can decide how to surface DTOs.
 *
 * Security features:
 * - SSL certificate validation for HTTPS requests
 * - Secure headers for production requests
 * - Certificate pinning support (optional)
 * - Request/response logging with security redaction
 */
export async function httpRequest({ url, method = 'GET', headers = {}, body, timeoutMs = 10000, tag = 'http', validateSsl }: HttpRequestParams): Promise<HttpResponse> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const start = Date.now();
  const requestId = Math.random().toString(36).slice(2);
  let urlPath = url;
  let isHttps = false;
  try { 
    const parsedUrl = new URL(url);
    urlPath = parsedUrl.pathname;
    isHttps = parsedUrl.protocol === 'https:';
  } catch {}

  // SSL validation configuration
  const shouldValidateSsl = validateSsl !== undefined ? validateSsl : (process.env[ENV_VARS.NODE_ENV] === 'production');
  
  // Add security headers for HTTPS requests in production
  const secureHeaders = { ...headers };
  if (isHttps && process.env[ENV_VARS.NODE_ENV] === 'production') {
    secureHeaders['User-Agent'] = secureHeaders['User-Agent'] || 'AttritionDesktop/1.0.0';
    secureHeaders['Accept'] = secureHeaders['Accept'] || 'application/json';
    // Add CSRF protection header for state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      secureHeaders['X-Requested-With'] = 'AttritionDesktop';
    }
  }
  
  // Create HTTPS agent with certificate pinning for production
  let agent;
  if (isHttps && process.env[ENV_VARS.NODE_ENV] === 'production') {
    try {
      const hostname = new URL(url).hostname;
      agent = createPinnedHttpsAgent(hostname);
    } catch (agentError) {
      errorLogger.warn('[DesktopMain.http] Failed to create pinned HTTPS agent', agentError, { tag, urlPath, requestId });
      // Fall back to default agent
    }
  }

  try {
    // Log HTTPS configuration for debugging
    if (isHttps && shouldValidateSsl) {
      errorLogger.info('[DesktopMain.http] HTTPS request with SSL validation', null, { tag, urlPath, validateSsl: shouldValidateSsl, requestId });
    } else if (isHttps && !shouldValidateSsl) {
      errorLogger.warn('[DesktopMain.http] HTTPS request without SSL validation (development only)', null, { tag, urlPath, requestId });
    }

    const fetchOptions = { method, headers: secureHeaders, body, signal: ac.signal };
    
    // Add HTTPS agent for certificate pinning
    if (agent) {
      fetchOptions.agent = agent;
    }
    
    const resp = await fetch(url, fetchOptions);
    const elapsed = Date.now() - start;

    // Read body as text once; try to parse JSON
    let text = '';
    try {
      text = await resp.text();
    } catch {
      text = '';
    }

    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }

    if (!resp.ok) {
      const code = `HTTP_${resp.status}`;
      const message =
        (json && (json.message || json.error)) ||
        resp.statusText ||
        'HTTP Error';

      errorLogger.warn('[DesktopMain.http] non-2xx response', null, { tag, urlPath, status: resp.status, durationMs: elapsed, code, message, requestId });

      return {
        ok: false,
        status: resp.status,
        json,
        text,
        error: { code, message, details: json ?? text ?? undefined },
        requestId,
        durationMs: elapsed
      };
    }

    return { ok: true, status: resp.status, json, text, requestId, durationMs: elapsed };
  } catch (err: unknown) {
    const elapsed = Date.now() - start;
    const error = err as Error;
    const aborted = error && error.name === 'AbortError';
    
    // Enhanced error categorization for HTTPS/SSL issues
    let code = 'NETWORK_UNAVAILABLE';
    let message = ERROR_MESSAGES.NETWORK_ERROR;
    
    if (aborted) {
      code = 'TIMEOUT';
      message = `Request timed out after ${timeoutMs}ms`;
    } else if (error && error.message) {
      // Check for SSL-related errors
      if (error.message.includes('certificate') || error.message.includes('SSL') || error.message.includes('TLS')) {
        code = 'SSL_ERROR';
        message = 'SSL certificate validation failed';
        errorLogger.error('[DesktopMain.http] SSL validation error', error, { tag, urlPath, isHttps, shouldValidateSsl, requestId });
      } else if (error.message.includes('ERR_CERT_')) {
        code = 'CERT_ERROR';
        message = 'Certificate error';
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        code = 'CONNECTION_REFUSED';
        message = 'Connection refused or host not found';
      }
    }

    // Ensure secrets are redacted by errorLogger policy
    errorLogger.error('[DesktopMain.http] exception', error, { tag, urlPath, durationMs: elapsed, aborted, requestId });

    return {
      ok: false,
      status: undefined,
      error: { code, message, details: { errorMessage: error?.message, aborted } },
      requestId,
      durationMs: elapsed
    };
  } finally {
    clearTimeout(timer);
  }
}



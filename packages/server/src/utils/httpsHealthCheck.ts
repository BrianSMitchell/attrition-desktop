import https from 'https';
import http from 'http';
import { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/response-formats';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ENV_VALUES, getEnvNumber } from '@game/shared';


import { TIMEOUTS, GAME_CONSTANTS } from '@game/shared';
import { ENV_VARS, isReverseProxySSL } from '@game/shared';

/**
 * HTTPS Health Check and Validation Utilities
 * 
 * Provides comprehensive health checks to ensure HTTPS is properly configured
 * and all endpoints are accessible via secure connections only.
 * 
 * Features:
 * - SSL certificate validation
 * - HTTPS endpoint accessibility checks
 * - HTTP to HTTPS redirect validation
 * - Certificate expiry monitoring
 * - Security header verification
 */

export interface HttpsHealthCheckResult {
  healthy: boolean;
  timestamp: string;
  checks: {
    httpsListening: boolean;
    httpRedirects: boolean;
    certificateValid: boolean;
    securityHeaders: boolean;
    errorDetails?: string[];
  };
  certificate?: {
    subject: string;
    issuer: string;
    validFrom: string;
    validTo: string;
    daysUntilExpiry: number;
  };
}

/**
 * Perform comprehensive HTTPS health checks
 * @param httpsPort HTTPS port to check
 * @param httpPort HTTP port to check for redirects
 * @param hostname Hostname to check
 * @returns Health check results
 */
export async function performHttpsHealthCheck(
  httpsPort: number = 443,
  httpPort: number = 80,
  hostname: string = 'localhost'
): Promise<HttpsHealthCheckResult> {
  const timestamp = new Date().toISOString();
  const errorDetails: string[] = [];
  
  console.log(`?? Performing HTTPS health checks for ${hostname}:${httpsPort}`);

  const result: HttpsHealthCheckResult = {
    healthy: false,
    timestamp,
    checks: {
      httpsListening: false,
      httpRedirects: false,
      certificateValid: false,
      securityHeaders: false
    }
  };

  try {
    // Check 1: HTTPS endpoint accessibility and certificate validation
    const httpsCheck = await checkHttpsEndpoint(hostname, httpsPort);
    result.checks.httpsListening = httpsCheck.listening;
    result.checks.certificateValid = httpsCheck.certificateValid;
    result.certificate = httpsCheck.certificate;
    
    if (!httpsCheck.listening) {
      errorDetails.push(`HTTPS server not listening on port ${httpsPort}`);
    }
    if (!httpsCheck.certificateValid) {
      errorDetails.push('SSL certificate validation failed');
    }

    // Check 2: HTTP to HTTPS redirect validation
    const redirectCheck = await checkHttpRedirect(hostname, httpPort, httpsPort);
    result.checks.httpRedirects = redirectCheck.redirectsToHttps;
    
    if (!redirectCheck.redirectsToHttps) {
      errorDetails.push(`HTTP requests not redirecting to HTTPS (${redirectCheck.error || 'unknown error'})`);
    }

    // Check 3: Security headers verification
    const headersCheck = await checkSecurityHeaders(hostname, httpsPort);
    result.checks.securityHeaders = headersCheck.hasRequiredHeaders;
    
    if (!headersCheck.hasRequiredHeaders) {
      errorDetails.push(`Missing security headers: ${headersCheck.missingHeaders.join(', ')}`);
    }

    // Overall health status
    result.healthy = (
      result.checks.httpsListening &&
      result.checks.certificateValid &&
      result.checks.httpRedirects &&
      result.checks.securityHeaders
    );

    if (errorDetails.length > 0) {
      result.checks.errorDetails = errorDetails;
    }

    console.log(`? HTTPS health check completed - Healthy: ${result.healthy}`);
    return result;

  } catch (error) {
    console.error('? HTTPS health check failed:', error);
    errorDetails.push(`Health check failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    
    result.checks.errorDetails = errorDetails;
    return result;
  }
}

/**
 * Check HTTPS endpoint accessibility and certificate
 */
async function checkHttpsEndpoint(hostname: string, port: number) {
  return new Promise<{
    listening: boolean;
    certificateValid: boolean;
    certificate?: any;
  }>((resolve) => {
    const req = https.request({
      hostname,
      port,
      path: API_ENDPOINTS.SYSTEM.HEALTH,
      method: 'GET',
      timeout: TIMEOUTS.FIVE_SECONDS,
      rejectUnauthorized: true // Enable certificate validation
    }, (res) => {
      let certificate;
      
      // Extract certificate information
      if (res.connection && (res.connection as any).getPeerCertificate) {
        try {
          const cert = (res.connection as any).getPeerCertificate();
          if (cert && cert.subject) {
            const now = new Date();
            const validTo = new Date(cert.valid_to);
            const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (GAME_CONSTANTS.MILLISECONDS_PER_SECOND * GAME_CONSTANTS.SECONDS_PER_MINUTE * 60 * 24));
            
            certificate = {
              subject: cert.subject.CN || cert.subject.O || 'Unknown',
              issuer: cert.issuer.CN || cert.issuer.O || 'Unknown',
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              daysUntilExpiry
            };
          }
        } catch (error) {
          console.warn('??  Could not extract certificate information:', error);
        }
      }

      resolve({
        listening: true,
        certificateValid: res.statusCode !== undefined && res.statusCode < 500,
        certificate
      });
    });

    req.on('error', (error) => {
      console.warn(`??  HTTPS endpoint check failed:`, error.message);
      resolve({
        listening: false,
        certificateValid: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        listening: false,
        certificateValid: false
      });
    });

    req.end();
  });
}

/**
 * Check HTTP to HTTPS redirect
 */
async function checkHttpRedirect(hostname: string, httpPort: number, httpsPort: number) {
  return new Promise<{
    redirectsToHttps: boolean;
    error?: string;
  }>((resolve) => {
    const req = http.request({
      hostname,
      port: httpPort,
      path: API_ENDPOINTS.SYSTEM.HEALTH,
      method: 'GET',
      timeout: TIMEOUTS.FIVE_SECONDS
    }, (res) => {
      // Check for redirect status codes (301, 302, 307, 308)
      const isRedirect = [301, 302, 307, 308].includes(res.statusCode || 0);
      
      if (isRedirect) {
        const location = res.headers.location;
        const redirectsToHttps = location?.startsWith('https://') || false;
        
        resolve({
          redirectsToHttps,
          error: redirectsToHttps ? undefined : `Redirect location: ${location}`
        });
      } else {
        resolve({
          redirectsToHttps: false,
          error: `Expected redirect, got status ${res.statusCode}`
        });
      }
    });

    req.on('error', (error) => {
      // In production, HTTP server might not be running if only HTTPS is used
      // This could be acceptable depending on architecture
      resolve({
        redirectsToHttps: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        redirectsToHttps: false,
        error: 'HTTP request timeout'
      });
    });

    req.end();
  });
}

/**
 * Check security headers on HTTPS endpoint
 */
async function checkSecurityHeaders(hostname: string, port: number) {
  return new Promise<{
    hasRequiredHeaders: boolean;
    missingHeaders: string[];
  }>((resolve) => {
    const req = https.request({
      hostname,
      port,
      path: API_ENDPOINTS.SYSTEM.HEALTH,
      method: 'HEAD', // Use HEAD to get headers without body
      timeout: TIMEOUTS.FIVE_SECONDS,
      rejectUnauthorized: false // Don't fail on certificate issues for header check
    }, (res) => {
      const requiredHeaders = [
        'strict-transport-security',
        'x-content-type-options',
        'x-frame-options',
        'content-security-policy'
      ];

      const missingHeaders: string[] = [];
      
      for (const header of requiredHeaders) {
        if (!res.headers[header] && !res.headers[header.toLowerCase()]) {
          missingHeaders.push(header);
        }
      }

      resolve({
        hasRequiredHeaders: missingHeaders.length === 0,
        missingHeaders
      });
    });

    req.on('error', (error) => {
      console.warn('??  Security headers check failed:', error.message);
      resolve({
        hasRequiredHeaders: false,
        missingHeaders: ['Unable to check headers due to connection error']
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        hasRequiredHeaders: false,
        missingHeaders: ['Unable to check headers due to timeout']
      });
    });

    req.end();
  });
}

/**
 * Express route handler for HTTPS health check endpoint
 */
export function httpsHealthCheckHandler(req: Request, res: Response) {
  // If running behind a reverse proxy that terminates TLS (e.g., Render),
  // local HTTPS is not expected to be listening. Short-circuit with a friendly response.
  const reverseProxySSL = isReverseProxySSL();
  if (reverseProxySSL) {
    const timestamp = new Date().toISOString();
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        healthy: true,
        timestamp,
        checks: {
          httpsListening: false,
          httpRedirects: true,
          certificateValid: true,
          securityHeaders: true,
          errorDetails: [
            'Reverse proxy SSL termination detected; local HTTPS endpoint not expected. Skipping local checks.'
          ]
        }
      },
      message: 'Using reverse proxy SSL (e.g., Render). Local HTTPS health checks are skipped.'
    });
  }

  const httpsPort = parseInt(process.env[ENV_VARS.HTTPS_PORT] || '443', 10);
  const httpPort = parseInt(process.env[ENV_VARS.PORT] || '80', 10);
  const hostname = req.get('host')?.split(':')[0] || 'localhost';

  performHttpsHealthCheck(httpsPort, httpPort, hostname)
    .then((result) => {
      const statusCode = result.healthy ? HTTP_STATUS.OK : 503;
      res.status(statusCode).json({
        success: result.healthy,
        data: result,
        message: result.healthy ? 'HTTPS configuration healthy' : 'HTTPS configuration issues detected'
      });
    })
    .catch((error) => {
      console.error('? HTTPS health check endpoint error:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'HTTPS health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    });
}

/**
 * Periodic HTTPS health monitoring
 */
export function shouldStartHttpsHealthMonitor(reverseProxy: boolean): boolean {
  return !reverseProxy;
}

export class HttpsHealthMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private lastResult: HttpsHealthCheckResult | null = null;

  constructor(
    private httpsPort: number = 443,
    private httpPort: number = 80,
    private hostname: string = 'localhost'
  ) {}

  start(intervalMinutes: number = 60) {
    console.log(`?? Starting HTTPS health monitoring (every ${intervalMinutes} minutes)`);
    
    // Initial check
    this.performCheck();
    
    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.performCheck();
    }, intervalMinutes * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('?? HTTPS health monitoring stopped');
    }
  }

  getLastResult(): HttpsHealthCheckResult | null {
    return this.lastResult;
  }

  private async performCheck() {
    try {
      this.lastResult = await performHttpsHealthCheck(this.httpsPort, this.httpPort, this.hostname);
      
      if (!this.lastResult.healthy) {
        console.error('?? HTTPS health check failed:', this.lastResult.checks.errorDetails);
        
        // In production, emit critical alert for HTTPS failures
        if (process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION) {
          this.emitCriticalAlert('HTTPS health check failed', this.lastResult.checks.errorDetails);
        }
      }
      
      // Enhanced certificate expiry monitoring with multiple thresholds
      if (this.lastResult.certificate) {
        const daysUntilExpiry = this.lastResult.certificate.daysUntilExpiry;
        
        if (daysUntilExpiry <= 7) {
          console.error(`?? CRITICAL: SSL certificate expires in ${daysUntilExpiry} days!`);
          this.emitCriticalAlert('SSL certificate expiring soon', [`Certificate expires in ${daysUntilExpiry} days`]);
        } else if (daysUntilExpiry <= 30) {
          console.warn(`??  WARNING: SSL certificate expires in ${daysUntilExpiry} days`);
        } else if (daysUntilExpiry <= 90) {
          console.log(`?? INFO: SSL certificate expires in ${daysUntilExpiry} days`);
        }
        
        // Log certificate details on first check
        if (this.lastResult.certificate.daysUntilExpiry > 0) {
          console.log(`?? Certificate: ${this.lastResult.certificate.subject} (Expires: ${this.lastResult.certificate.validTo})`);
        }
      }
      
      // Log successful health check (reduced frequency)
      if (this.lastResult.healthy && Math.random() < 0.1) { // Log ~10% of successful checks
        console.log(`? HTTPS health check passed - All systems secure`);
      }
      
    } catch (error) {
      console.error('? HTTPS health monitoring error:', error);
      
      if (process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION) {
        this.emitCriticalAlert('HTTPS monitoring failure', [error instanceof Error ? error.message : 'Unknown error']);
      }
    }
  }

  private emitCriticalAlert(title: string, details?: string[]) {
    // Emit custom event for external monitoring systems
    const alertData = {
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL',
      service: 'HTTPS',
      title,
      details: details || [],
      hostname: this.hostname,
      httpsPort: this.httpsPort
    };
    
    // Log structured alert data for external log aggregation
    console.error('?? HTTPS CRITICAL ALERT:', JSON.stringify(alertData));
    
    // Could be extended to integrate with external monitoring services:
    // - Send to Slack/Discord webhook
    // - Send to PagerDuty/Opsgenie
    // - Send to email notification service
    // - Send to monitoring dashboard API
  }
}

export default {
  performHttpsHealthCheck,
  httpsHealthCheckHandler,
  HttpsHealthMonitor
};

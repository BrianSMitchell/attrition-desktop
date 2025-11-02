import crypto from 'crypto';
import https from 'https';
import type { PeerCertificate } from 'tls';
import errorLogger from './errorLoggingService.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { ENV_VARS } = require('../../../shared/dist/cjs/index.js');

interface PinConfig {
  pins: string[];
  enforceInDev: boolean;
  alertOnChange: boolean;
}

interface ValidationResult {
  valid: boolean;
  reason: string;
  hostname: string;
  enforced: boolean;
  matchedPin?: string;
  expectedPins?: string[];
  actualFingerprints?: string[];
}

interface UpdateResult {
  success: boolean;
  hostname: string;
  oldPins?: string[];
  newPins?: string[];
  changed?: boolean;
  error?: string;
}

interface TestResult {
  success: boolean;
  hostname: string;
  statusCode?: number;
  certificate?: {
    subject: any;
    issuer: any;
    validFrom: string;
    validTo: string;
    fingerprint: string;
  };
  error?: string;
  code?: string;
  isPinningError?: boolean;
}

/**
 * Certificate Pinning Service
 * 
 * Implements certificate pinning to prevent man-in-the-middle attacks
 * by validating server certificates against known fingerprints.
 * 
 * Features:
 * - SHA-256 fingerprint validation
 * - Multiple certificate support (for rotation)
 * - Development vs production pinning
 * - Certificate change detection and alerting
 * - Graceful fallback handling
 */

/**
 * Certificate pin configuration
 */
const certificatePins: Record<string, PinConfig> = {
  // Production API server pins
  'api.yourgame.com': {
    pins: [
      // Primary certificate SHA-256 fingerprint
      // Generate with: openssl x509 -noout -fingerprint -sha256 -inform pem -in certificate.crt
      'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Replace with actual pin
      // Backup certificate for rotation
      'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='  // Replace with backup pin
    ],
    enforceInDev: false, // Set to true to test pinning in development
    alertOnChange: true  // Alert if certificate changes unexpectedly
  },
  
  // Development server (usually no pinning)
  'localhost': {
    pins: [],
    enforceInDev: false,
    alertOnChange: false
  }
};

/**
 * Extract SHA-256 fingerprint from certificate
 */
function getCertificateFingerprint(cert: Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(cert);
  return hash.digest('base64');
}

/**
 * Validate certificate against pins
 */
function validateCertificatePins(hostname: string, peerCertificateChain: PeerCertificate[]): ValidationResult {
  const pinConfig = certificatePins[hostname];
  
  if (!pinConfig || pinConfig.pins.length === 0) {
    // No pins configured for this hostname
    return {
      valid: true,
      reason: 'no_pins_configured',
      hostname,
      enforced: false
    };
  }

  // Check if pinning should be enforced
  const isDev = process.env[ENV_VARS.NODE_ENV] === 'development';
  const shouldEnforce = !isDev || pinConfig.enforceInDev;

  if (!shouldEnforce) {
    return {
      valid: true,
      reason: 'development_mode',
      hostname,
      enforced: false
    };
  }

  // Extract fingerprints from certificate chain
  const actualFingerprints = peerCertificateChain.map(cert => {
    const der = cert.raw;
    return 'sha256/' + getCertificateFingerprint(der);
  });

  // Check if any certificate in the chain matches our pins
  const matchedPin = pinConfig.pins.find(pin => 
    actualFingerprints.includes(pin)
  );

  if (matchedPin) {
    return {
      valid: true,
      reason: 'pin_matched',
      hostname,
      matchedPin,
      enforced: true
    };
  } else {
    return {
      valid: false,
      reason: 'pin_mismatch',
      hostname,
      expectedPins: pinConfig.pins,
      actualFingerprints,
      enforced: true
    };
  }
}

/**
 * Create HTTPS agent with certificate pinning
 */
export function createPinnedHttpsAgent(hostname: string): https.Agent {
  return new https.Agent({
    checkServerIdentity: (host, cert) => {
      // Perform standard hostname verification first
      const hostnameError = https.globalAgent.options.checkServerIdentity?.(host, cert);
      if (hostnameError) {
        return hostnameError;
      }

      // Get certificate chain
      const certChain = [cert];
      let current: PeerCertificate = cert;
      while ((current as any).issuerCertificate && current !== (current as any).issuerCertificate) {
        current = (current as any).issuerCertificate as PeerCertificate;
        certChain.push(current);
      }

      // Validate certificate pins
      const validation = validateCertificatePins(hostname, certChain);
      
      // Log validation result
      if (validation.enforced) {
        if (validation.valid) {
          errorLogger.info('[CertPinning] Certificate validation passed', null, {
            hostname: validation.hostname,
            reason: validation.reason,
            matchedPin: validation.matchedPin
          });
        } else {
          errorLogger.error('[CertPinning] Certificate pinning validation failed', null, {
            hostname: validation.hostname,
            reason: validation.reason,
            expectedPins: validation.expectedPins,
            actualFingerprints: validation.actualFingerprints
          });
        }
      }

      // Return error if validation failed
      if (!validation.valid && validation.enforced) {
        const error = new Error(`Certificate pinning validation failed for ${hostname}`) as Error & {
          code: string;
          hostname: string;
          expectedPins?: string[];
          actualFingerprints?: string[];
        };
        error.code = 'CERT_PIN_FAILURE';
        error.hostname = hostname;
        error.expectedPins = validation.expectedPins;
        error.actualFingerprints = validation.actualFingerprints;
        return error;
      }

      // Validation passed or not enforced
      return undefined;
    },
    
    // Other security options
    rejectUnauthorized: true,
    secureProtocol: 'TLSv1_2_method'
  });
}

/**
 * Enhanced fetch with certificate pinning
 */
export async function pinnedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const urlObj = new URL(url);
  
  if (urlObj.protocol === 'https:') {
    const agent = createPinnedHttpsAgent(urlObj.hostname);
    
    // Add agent to fetch options
    const enhancedOptions = {
      ...options,
      agent
    };

    try {
      return await fetch(url, enhancedOptions);
    } catch (error) {
      const err = error as Error & { code?: string; hostname?: string; originalError?: Error };
      if (err.code === 'CERT_PIN_FAILURE') {
        // Log certificate pinning failure
        errorLogger.error('[CertPinning] Fetch failed due to certificate pinning', err, {
          url,
          hostname: err.hostname
        });
        
        // Throw a more user-friendly error
        const userError = new Error('Secure connection failed: Certificate validation error') as Error & { originalError?: Error; code?: string };
        userError.originalError = err;
        userError.code = 'SECURE_CONNECTION_FAILED';
        throw userError;
      }
      
      // Re-throw other errors
      throw error;
    }
  } else {
    // HTTP request - use normal fetch
    return fetch(url, options);
  }
}

/**
 * Validate and update certificate pins configuration
 */
export function updateCertificatePins(hostname: string, newPins: string[]): UpdateResult {
  try {
    if (!certificatePins[hostname]) {
      certificatePins[hostname] = {
        pins: [],
        enforceInDev: false,
        alertOnChange: true
      };
    }

    const oldPins = [...certificatePins[hostname].pins];
    certificatePins[hostname].pins = newPins;

    errorLogger.info('[CertPinning] Certificate pins updated', null, {
      hostname,
      oldPinsCount: oldPins.length,
      newPinsCount: newPins.length,
      changed: JSON.stringify(oldPins) !== JSON.stringify(newPins)
    });

    return {
      success: true,
      hostname,
      oldPins,
      newPins,
      changed: JSON.stringify(oldPins) !== JSON.stringify(newPins)
    };
  } catch (error) {
    const err = error as Error;
    errorLogger.error('[CertPinning] Failed to update certificate pins', err, { hostname });
    return {
      success: false,
      error: err.message,
      hostname
    };
  }
}

/**
 * Get current certificate pins for a hostname
 */
export function getCertificatePins(hostname: string): PinConfig {
  return certificatePins[hostname] || {
    pins: [],
    enforceInDev: false,
    alertOnChange: false
  };
}

/**
 * Test certificate pinning by connecting to a server
 */
export async function testCertificatePinning(hostname: string, port: number = 443): Promise<TestResult> {
  return new Promise((resolve) => {
    const agent = createPinnedHttpsAgent(hostname);
    
    const req = https.request({
      hostname,
      port,
      path: '/',
      method: 'HEAD',
      agent,
      timeout: 10000
    }, (res) => {
      const peerCert = (res.socket as any).getPeerCertificate();
      resolve({
        success: true,
        hostname,
        statusCode: res.statusCode,
        certificate: {
          subject: peerCert.subject,
          issuer: peerCert.issuer,
          validFrom: peerCert.valid_from,
          validTo: peerCert.valid_to,
          fingerprint: getCertificateFingerprint(peerCert.raw)
        }
      });
    });

    req.on('error', (error: Error & { code?: string }) => {
      resolve({
        success: false,
        hostname,
        error: error.message,
        code: error.code,
        isPinningError: error.code === 'CERT_PIN_FAILURE'
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        hostname,
        error: 'Connection timeout',
        code: 'TIMEOUT'
      });
    });

    req.end();
  });
}

/**
 * Initialize certificate pinning service
 */
export function initializeCertificatePinning() {
  console.log('[CertPinning] Initializing certificate pinning service');
  
  const configuredHosts = Object.keys(certificatePins);
  console.log(`[CertPinning] Configured for hosts: ${configuredHosts.join(', ')}`);
  
  // Log pinning status for each host
  configuredHosts.forEach(hostname => {
    const config = certificatePins[hostname];
    const isDev = process.env[ENV_VARS.NODE_ENV] === 'development';
    const enforced = !isDev || config.enforceInDev;
    
    console.log(`[CertPinning] ${hostname}: ${config.pins.length} pins, enforced: ${enforced}`);
  });
}

export default {
  createPinnedHttpsAgent,
  pinnedFetch,
  updateCertificatePins,
  getCertificatePins,
  testCertificatePinning,
  initializeCertificatePinning
};

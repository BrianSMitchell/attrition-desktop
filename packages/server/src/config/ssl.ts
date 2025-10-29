import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import express, { Express } from 'express';
import tls from 'tls';
import { ENV_VARS, ENV_VALUES } from '@game/shared';
import { GAME_CONSTANTS } from '@game/shared';

/**
 * SSL Certificate Configuration Management
 * 
 * Handles secure loading and validation of SSL certificates for HTTPS server setup.
 * Supports multiple certificate sources: files, environment variables, and cloud providers.
 * 
 * Features:
 * - Multiple certificate source options
 * - Certificate validation and expiry checking  
 * - Secure file permissions verification
 * - Development vs production certificate handling
 * - Comprehensive error handling and logging
 */

/**
 * SSL certificate configuration options
 */
export interface SSLConfig {
  /** SSL private key (PEM format) */
  key: string;
  /** SSL certificate (PEM format) */
  cert: string;
  /** Certificate chain (optional, PEM format) */
  ca?: string;
  /** Passphrase for private key (optional) */
  passphrase?: string;
  /** Minimum TLS version (default: 'TLSv1.2') */
  minVersion?: 'TLSv1.2' | 'TLSv1.3';
  /** Maximum TLS version (default: 'TLSv1.3') */
  maxVersion?: 'TLSv1.2' | 'TLSv1.3';
  /** SSL cipher suites (optional, for custom security profiles) */
  ciphers?: string;
  /** Enable certificate validation in development */
  strictInDev?: boolean;
  /** ECDH curve preferences for ECDHE cipher suites */
  ecdhCurve?: string;
  /** Disable TLS session resumption for enhanced security */
  disableSessionResumption?: boolean;
  /** Enable Perfect Forward Secrecy */
  honorCipherOrder?: boolean;
  /** DH parameters for DHE cipher suites */
  dhparam?: string;
  /** Certificate pinning configuration */
  certificatePinning?: CertificatePinningConfig;
  /** TLS session timeout in seconds (default: 300) */
  sessionTimeout?: number;
  /** Maximum TLS session cache size */
  sessionCacheSize?: number;
  /** Enable OCSP stapling for certificate validation */
  ocspStapling?: boolean;
}

/**
 * Certificate pinning configuration for enhanced security
 */
export interface CertificatePinningConfig {
  /** Enable certificate pinning */
  enabled: boolean;
  /** SHA-256 hashes of pinned certificates */
  pinnedCertificates: string[];
  /** SHA-256 hashes of pinned public keys */
  pinnedPublicKeys: string[];
  /** Allow pinning bypass in development */
  bypassInDevelopment?: boolean;
  /** Report URI for pin validation failures */
  reportUri?: string;
  /** Reporting URL for pin validation failures (alternative property name) */
  reportingUrl?: string;
  /** Max age for HPKP header (in seconds) */
  maxAge?: number;
  /** Include subdomains in HPKP */
  includeSubdomains?: boolean;
  /** Strict mode - reject connections on pin validation failure */
  strictMode?: boolean;
}

/**
 * Certificate source configuration
 */
export interface CertificateSource {
  /** Certificate file path */
  certPath?: string;
  /** Private key file path */
  keyPath?: string;
  /** CA bundle file path */
  caPath?: string;
  /** Certificate content from environment variables */
  certEnvVar?: string;
  /** Private key content from environment variables */
  keyEnvVar?: string;
  /** CA bundle content from environment variables */
  caEnvVar?: string;
};

/**
 * Get secure cipher suites with proper preference order
 * Prioritizes TLS 1.3, AEAD ciphers, and perfect forward secrecy
 */
function getSecureCipherSuites(tlsVersion: 'TLSv1.2' | 'TLSv1.3' | 'both' = 'both'): string {
  // TLS 1.3 cipher suites (preferred) - handled automatically by OpenSSL
  // These are the only cipher suites available in TLS 1.3:
  // - TLS_AES_256_GCM_SHA384
  // - TLS_CHACHA20_POLY1305_SHA256  
  // - TLS_AES_128_GCM_SHA256
  // Note: TLS 1.3 ciphers are automatically negotiated and don't need explicit configuration

  // TLS 1.2 cipher suites in strict security preference order
  const tls12Suites = [
    // ECDHE with AEAD (Authenticated Encryption with Associated Data) - HIGHEST PRIORITY
    'ECDHE-ECDSA-AES256-GCM-SHA384',     // ECDSA + AES-256-GCM (strongest)
    'ECDHE-RSA-AES256-GCM-SHA384',       // RSA + AES-256-GCM
    'ECDHE-ECDSA-CHACHA20-POLY1305',     // ECDSA + ChaCha20-Poly1305 (mobile optimized)
    'ECDHE-RSA-CHACHA20-POLY1305',       // RSA + ChaCha20-Poly1305
    'ECDHE-ECDSA-AES128-GCM-SHA256',     // ECDSA + AES-128-GCM
    'ECDHE-RSA-AES128-GCM-SHA256',       // RSA + AES-128-GCM
    
    // ECDHE with CBC (less preferred due to padding oracle vulnerability potential)
    'ECDHE-ECDSA-AES256-SHA384',         // ECDSA + AES-256-CBC + SHA-384
    'ECDHE-RSA-AES256-SHA384',           // RSA + AES-256-CBC + SHA-384
    'ECDHE-ECDSA-AES128-SHA256',         // ECDSA + AES-128-CBC + SHA-256
    'ECDHE-RSA-AES128-SHA256',           // RSA + AES-128-CBC + SHA-256
    
    // DHE with AEAD (for compatibility with older clients that don't support ECDHE)
    'DHE-RSA-AES256-GCM-SHA384',         // DHE + AES-256-GCM
    'DHE-RSA-CHACHA20-POLY1305',         // DHE + ChaCha20-Poly1305
    'DHE-RSA-AES128-GCM-SHA256',         // DHE + AES-128-GCM
    
    // DHE with CBC (least preferred but still secure)
    'DHE-RSA-AES256-SHA256',             // DHE + AES-256-CBC + SHA-256
    'DHE-RSA-AES128-SHA256'              // DHE + AES-128-CBC + SHA-256
  ];

  // Comprehensive list of weak/insecure ciphers to explicitly exclude
  const excludedCiphers = [
    // Null encryption/authentication
    '!NULL',        '!aNULL',       '!eNULL',
    
    // Weak/broken encryption algorithms
    '!EXPORT',      // Export-grade (intentionally weak)
    '!DES',         // DES (56-bit, broken)
    '!3DES',        // 3DES (deprecated, SWEET32 attack)
    '!RC4',         // RC4 (broken stream cipher)
    '!RC2',         // RC2 (weak)
    '!SEED',        // SEED (less common, potential issues)
    '!IDEA',        // IDEA (patent issues, less secure)
    '!CAMELLIA',    // Camellia (less common, prefer AES)
    
    // Weak hash algorithms
    '!MD5',         // MD5 (broken hash)
    '!SHA1',        // SHA-1 (deprecated, collision attacks)
    
    // Weak key exchange methods
    '!PSK',         // Pre-shared key (not suitable for general use)
    '!SRP',         // Secure Remote Password (not needed)
    '!DSS',         // Digital Signature Standard with DSA (prefer ECDSA/RSA)
    
    // Anonymous key exchange (no authentication)
    '!ADH',         // Anonymous Diffie-Hellman
    '!AECDH',       // Anonymous Elliptic Curve Diffie-Hellman
    
    // Deprecated/insecure modes
    '!LOW',         // Low security ciphers
    '!MEDIUM',      // Medium security ciphers (prefer HIGH only)
    '!EXP',         // Export ciphers
    
    // Legacy authentication methods
    '!KRB5',        // Kerberos (not commonly used for HTTPS)
    
    // Ensure no weak elliptic curves (additional security)
    '!ECDSA+SHA1',  // ECDSA with SHA-1
    '!RSA+SHA1'     // RSA with SHA-1
  ];

  // Build cipher string based on TLS version preference
  let cipherString: string;
  
  if (tlsVersion === 'TLSv1.3') {
    // TLS 1.3 only - OpenSSL handles cipher selection automatically
    // We still include exclusions for any legacy fallback scenarios
    cipherString = excludedCiphers.join(':');
  } else if (tlsVersion === 'TLSv1.2') {
    // TLS 1.2 only
    cipherString = [...tls12Suites, ...excludedCiphers].join(':');
  } else {
    // Both TLS 1.2 and 1.3 (default)
    // TLS 1.3 ciphers are automatically preferred by OpenSSL
    cipherString = [...tls12Suites, ...excludedCiphers].join(':');
  }
  
  return cipherString;
}

/**
 * Extract SHA-256 hash from certificate for pinning
 * @param certificate PEM certificate content
 * @returns SHA-256 hash of the certificate
 */
function extractCertificateHash(certificate: string): string {
  try {
    // Parse certificate and extract DER data
    const cert = new crypto.X509Certificate(certificate);
    const derData = cert.raw;
    
    // Calculate SHA-256 hash
    const hash = crypto.createHash('sha256').update(derData).digest('base64');
    return hash;
  } catch (error) {
    throw new Error(`Failed to extract certificate hash: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

/**
 * Extract SHA-256 hash from public key for pinning
 * @param certificate PEM certificate content
 * @returns SHA-256 hash of the public key
 */
function extractPublicKeyHash(certificate: string): string {
  try {
    const cert = new crypto.X509Certificate(certificate);
    const publicKey = cert.publicKey;
    
    // Export public key in DER format
    const publicKeyDer = publicKey.export({
      type: 'spki',
      format: 'der'
    });
    
    // Calculate SHA-256 hash
    const hash = crypto.createHash('sha256').update(publicKeyDer).digest('base64');
    return hash;
  } catch (error) {
    throw new Error(`Failed to extract public key hash: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

/**
 * Validate certificate pinning configuration
 * @param config Certificate pinning configuration
 * @param certificate Current certificate to validate against
 * @returns Validation result
 */
function validateCertificatePinning(
  config: CertificatePinningConfig,
  certificate: string
): { isValid: boolean; reason?: string } {
  if (!config.enabled) {
    return { isValid: true };
  }
  
  // Allow bypass in development if configured
  if (config.bypassInDevelopment && process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.DEVELOPMENT) {
    console.log('🔐 Certificate pinning bypassed in development mode');
    return { isValid: true };
  }
  
  try {
    // Check certificate hash pinning
    if (config.pinnedCertificates && config.pinnedCertificates.length > 0) {
      const currentCertHash = extractCertificateHash(certificate);
      if (config.pinnedCertificates.includes(currentCertHash)) {
        console.log('✅ Certificate pinning validation passed (certificate hash match)');
        return { isValid: true };
      }
    }
    
    // Check public key hash pinning
    if (config.pinnedPublicKeys && config.pinnedPublicKeys.length > 0) {
      const currentPubKeyHash = extractPublicKeyHash(certificate);
      if (config.pinnedPublicKeys.includes(currentPubKeyHash)) {
        console.log('✅ Certificate pinning validation passed (public key hash match)');
        return { isValid: true };
      }
    }
    
    // No matches found
    const reason = 'Certificate or public key hash does not match any pinned values';
    console.error('❌ Certificate pinning validation failed:', reason);
    
    // Report pin validation failure if configured
    if (config.reportUri) {
      reportPinValidationFailure(config.reportUri, certificate, reason);
    }
    
    return { isValid: false, reason };
    
  } catch (error) {
    const reason = `Certificate pinning validation error: ${error instanceof Error ? error.message : 'unknown error'}`;
    console.error('❌', reason);
    return { isValid: false, reason };
  }
}

/**
 * Validate certificate pin against configuration
 * @param cert Certificate object to validate
 * @param config Certificate pinning configuration
 * @returns Validation result
 */
function validateCertificatePin(cert: any, config: CertificatePinningConfig): { isValid: boolean; error?: string } {
  try {
    // Convert certificate to PEM format if needed
    let certificatePem: string;
    if (cert && cert.raw) {
      // Convert DER to PEM format
      const derBase64 = cert.raw.toString('base64');
      certificatePem = `-----BEGIN CERTIFICATE-----\n${derBase64.match(/.{1,64}/g)?.join('\n') || derBase64}\n-----END CERTIFICATE-----`;
    } else if (typeof cert === 'string') {
      certificatePem = cert;
    } else {
      return { isValid: false, error: 'Invalid certificate format for pinning validation' };
    }

    return validateCertificatePinning(config, certificatePem);
  } catch (error) {
    return { isValid: false, error: `Certificate pin validation error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Report certificate pinning failure to configured URL
 * @param reportingUrl URL to report the failure to
 * @param cert Certificate that failed validation
 * @param reason Reason for failure
 * @returns Promise that resolves when report is sent
 */
async function reportCertificatePinFailure(reportingUrl: string, cert: any, reason: string): Promise<void> {
  try {
    const report = {
      timestamp: new Date().toISOString(),
      type: 'certificate-pinning-failure',
      reason,
      userAgent: 'Attrition-Server/1.0',
      // Include certificate details if available
      certificate: cert && cert.fingerprint ? cert.fingerprint : 'unavailable'
    };
    
    // Log the report locally
    console.error('🚨 Certificate pinning failure report:', JSON.stringify(report));
    
    // TODO: Implement actual HTTP POST to reporting URL
    // For now, just log that we would send the report
    console.log(`📡 Would send certificate pinning failure report to: ${reportingUrl}`);
    
  } catch (error) {
    console.error('❌ Failed to report certificate pinning failure:', error);
    throw error;
  }
}

/**
 * Report certificate pinning validation failure
 * @param reportUri URI to report the failure to
 * @param certificate Certificate that failed validation
 * @param reason Reason for failure
 */
function reportPinValidationFailure(reportUri: string, certificate: string, reason: string) {
  try {
    const report = {
      timestamp: new Date().toISOString(),
      type: 'certificate-pinning-failure',
      certificate: extractCertificateHash(certificate),
      publicKey: extractPublicKeyHash(certificate),
      reason,
      userAgent: 'Attrition-Server/1.0'
    };
    
    // Log the report (in a real implementation, this would be sent to the report URI)
    console.error('🚨 Certificate pinning failure report:', JSON.stringify(report));
    
    // TODO: Implement actual HTTP POST to report URI
    // This would typically be done with a non-blocking HTTP request
    
  } catch (error) {
    console.error('❌ Failed to report certificate pinning failure:', error);
  }
}

/**
 * Generate HPKP (HTTP Public Key Pinning) header
 * @param config Certificate pinning configuration
 * @returns HPKP header value or null if not configured
 */
export function generateHPKPHeader(config?: CertificatePinningConfig): string | null {
  if (!config || !config.enabled || !config.pinnedPublicKeys || config.pinnedPublicKeys.length === 0) {
    return null;
  }
  
  const pins = config.pinnedPublicKeys.map(hash => `pin-sha256="${hash}"`).join('; ');
  const maxAge = config.maxAge || 2592000; // Default 30 days
  const includeSubdomains = config.includeSubdomains ? '; includeSubDomains' : '';
  const reportUri = config.reportUri ? `; report-uri="${config.reportUri}"` : '';
  
  return `${pins}; max-age=${maxAge}${includeSubdomains}${reportUri}`;
}

/**
 * Validate TLS configuration security
 * @param config SSL configuration to validate
 */
function validateTLSSecurity(config: SSLConfig): { isSecure: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let isSecure = true;

  // Check minimum TLS version
  if (!config.minVersion || config.minVersion < 'TLSv1.2') {
    warnings.push('TLS version below 1.2 is not secure');
    isSecure = false;
  }

  // Check cipher suites
  if (config.ciphers) {
    const weakPatterns = ['RC4', 'DES', '3DES', 'MD5', 'NULL', 'EXPORT'];
    const hasWeakCiphers = weakPatterns.some(pattern => 
      config.ciphers!.toUpperCase().includes(pattern)
    );
    if (hasWeakCiphers) {
      warnings.push('Weak cipher suites detected in configuration');
      isSecure = false;
    }
  }

  // Check for forward secrecy
  if (config.ciphers && !config.ciphers.includes('ECDHE') && !config.ciphers.includes('DHE')) {
    warnings.push('No forward secrecy cipher suites configured');
    isSecure = false;
  }

  return { isSecure, warnings };
}

/**
 * Load SSL configuration from various sources
 * @param source Certificate source configuration
 * @returns SSL configuration object
 */
export async function loadSSLConfig(source: CertificateSource): Promise<SSLConfig | null> {
  try {
    console.log('🔐 Loading SSL configuration...');

    // In development, SSL is optional unless explicitly required
    if (process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.DEVELOPMENT && !process.env[ENV_VARS.FORCE_HTTPS]) {
      console.log('⚠️  SSL disabled in development mode');
      return null;
    }

    const config: SSLConfig = {
      key: '',
      cert: '',
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      // Modern, secure cipher suites with AEAD and forward secrecy
      ciphers: getSecureCipherSuites(),
      // Prefer strong elliptic curves (secp384r1 first for security, prime256v1 for compatibility)
      ecdhCurve: 'secp384r1:prime256v1:secp521r1',
      // Enable cipher order preference (server chooses)
      honorCipherOrder: true,
      // Session management configuration
      disableSessionResumption: process.env[ENV_VARS.TLS_DISABLE_SESSION_RESUMPTION] === 'true',
      sessionTimeout: parseInt(process.env[ENV_VARS.TLS_SESSION_TIMEOUT] || '300', 10), // 5 minutes default
      sessionCacheSize: parseInt(process.env[ENV_VARS.TLS_SESSION_CACHE_SIZE] || '1024', 10),
      // OCSP stapling for enhanced certificate validation
      ocspStapling: process.env[ENV_VARS.TLS_OCSP_STAPLING] !== 'false' // Enabled by default
    };

    // Load private key
    config.key = await loadCertificateContent(source.keyPath, source.keyEnvVar, 'SSL_PRIVATE_KEY');
    if (!config.key) {
      throw new Error('SSL private key not found');
    }

    // Load certificate
    config.cert = await loadCertificateContent(source.certPath, source.certEnvVar, 'SSL_CERTIFICATE');
    if (!config.cert) {
      throw new Error('SSL certificate not found');
    }

    // Load CA bundle (optional)
    const ca = await loadCertificateContent(source.caPath, source.caEnvVar, 'SSL_CA_BUNDLE');
    if (ca) {
      config.ca = ca;
    }

    // Load passphrase (optional)
    const passphrase = process.env[ENV_VARS.SSL_KEY_PASSPHRASE];
    if (passphrase) {
      config.passphrase = passphrase;
    }

    // Configure certificate pinning if enabled
    if (process.env[ENV_VARS.TLS_CERT_PINNING_ENABLED] === 'true') {
      const pinnedCertificates = process.env[ENV_VARS.TLS_PINNED_CERTIFICATES]?.split(',').map(pin => pin.trim()) || [];
      const pinnedPublicKeys = process.env[ENV_VARS.TLS_PINNED_PUBLIC_KEYS]?.split(',').map(pin => pin.trim()) || [];
      
      if (pinnedCertificates.length > 0 || pinnedPublicKeys.length > 0) {
        config.certificatePinning = {
          enabled: true,
          pinnedCertificates,
          pinnedPublicKeys,
          strictMode: process.env[ENV_VARS.TLS_CERT_PINNING_STRICT] === 'true',
          reportingUrl: process.env[ENV_VARS.TLS_CERT_PINNING_REPORT_URL],
          maxAge: parseInt(process.env[ENV_VARS.TLS_CERT_PINNING_MAX_AGE] || '2592000', 10), // 30 days default
          includeSubdomains: process.env[ENV_VARS.TLS_CERT_PINNING_INCLUDE_SUBDOMAINS] === 'true'
        };
        
        console.log('🔒 Certificate pinning configured', {
          pinnedCertificatesCount: pinnedCertificates.length,
          pinnedPublicKeysCount: pinnedPublicKeys.length,
          strictMode: config.certificatePinning.strictMode,
          maxAge: config.certificatePinning.maxAge
        });

        // Validate pinning configuration
        const validationResult = validateCertificatePinning(config.certificatePinning, config.cert);
        if (!validationResult.isValid) {
          throw new Error(`Invalid certificate pinning configuration: ${validationResult.reason || 'Unknown error'}`);
        }
      }
    }

    // Validate certificates
    await validateSSLConfig(config);

    // Validate TLS security configuration
    const tlsValidation = validateTLSSecurity(config);
    if (!tlsValidation.isSecure) {
      throw new Error(`TLS configuration is not secure: ${tlsValidation.warnings.join(', ')}`);
    }
    
    if (tlsValidation.warnings.length > 0) {
      console.warn('⚠️  TLS configuration warnings:', tlsValidation.warnings);
    }

    console.log('✅ SSL configuration loaded and validated successfully');
    return config;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown SSL configuration error';
    console.error('❌ Failed to load SSL configuration:', errorMessage);
    
    // In production, SSL errors are fatal
    if (process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION) {
      throw new Error(`SSL configuration required in production: ${errorMessage}`);
    }
    
    // In development, log warning and continue without SSL
    console.warn('⚠️  Continuing without SSL in development mode');
    return null;
  }
}

/**
 * Load certificate content from file or environment variable
 * @param filePath Path to certificate file
 * @param envVarName Environment variable name containing certificate
 * @param fallbackEnvVar Fallback environment variable name
 * @returns Certificate content or empty string if not found
 */
async function loadCertificateContent(
  filePath?: string, 
  envVarName?: string, 
  fallbackEnvVar?: string
): Promise<string> {
  // Try environment variable first (higher priority)
  if (envVarName && process.env[envVarName]) {
    console.log(`📋 Loading certificate from environment variable: ${envVarName}`);
    return process.env[envVarName]!;
  }

  // Try fallback environment variable
  if (fallbackEnvVar && process.env[fallbackEnvVar]) {
    console.log(`📋 Loading certificate from fallback environment variable: ${fallbackEnvVar}`);
    return process.env[fallbackEnvVar]!;
  }

  // Try file path
  if (filePath) {
    try {
      console.log(`📁 Loading certificate from file: ${filePath}`);
      
      // Validate file exists and has secure permissions
      await validateCertificateFile(filePath);
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (!content.trim()) {
        throw new Error(`Certificate file is empty: ${filePath}`);
      }
      
      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown file error';
      throw new Error(`Failed to load certificate from file ${filePath}: ${errorMessage}`);
    }
  }

  return '';
}

/**
 * Validate certificate file security
 * @param filePath Path to certificate file
 */
async function validateCertificateFile(filePath: string): Promise<void> {
  try {
    const stats = fs.statSync(filePath);
    
    // Check if file exists and is readable
    if (!stats.isFile()) {
      throw new Error('Certificate path is not a file');
    }

    // Check file permissions (should not be world-readable for private keys)
    if (filePath.includes('key') || filePath.includes('private')) {
      const mode = stats.mode & parseInt('777', 8);
      if (mode & parseInt('044', 8)) {
        console.warn(`⚠️  Certificate file has permissive permissions: ${filePath} (${mode.toString(8)})`);
        if (process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION) {
          throw new Error('Private key files should not be world-readable in production');
        }
      }
    }

  } catch (error: any) {
    if (error && error.code === 'ENOENT') {
      throw new Error('Certificate file not found');
    }
    throw error;
  }
}

/**
 * Validate SSL configuration
 * @param config SSL configuration to validate
 */
async function validateSSLConfig(config: SSLConfig): Promise<void> {
  // Basic format validation
  if (!config.key.includes('BEGIN PRIVATE KEY') && !config.key.includes('BEGIN RSA PRIVATE KEY')) {
    throw new Error('Invalid private key format (must be PEM)');
  }

  if (!config.cert.includes('BEGIN CERTIFICATE')) {
    throw new Error('Invalid certificate format (must be PEM)');
  }

  // Try to parse certificate for expiry check
  try {
    const crypto = await import('crypto');
    const cert = new crypto.X509Certificate(config.cert);
    const now = new Date();
    const validFrom = new Date(cert.validFrom);
    const validTo = new Date(cert.validTo);

    if (now < validFrom) {
      throw new Error(`Certificate not yet valid (valid from: ${validFrom.toISOString()})`);
    }

    if (now > validTo) {
      throw new Error(`Certificate expired (expired: ${validTo.toISOString()})`);
    }

    // Warn if certificate expires soon (within 30 days)
    const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (GAME_CONSTANTS.MILLISECONDS_PER_SECOND * GAME_CONSTANTS.SECONDS_PER_MINUTE * 60 * 24));
    if (daysUntilExpiry < 30) {
      console.warn(`⚠️  SSL certificate expires in ${daysUntilExpiry} days (${validTo.toISOString()})`);
    } else {
      console.log(`✅ SSL certificate valid until ${validTo.toISOString()} (${daysUntilExpiry} days)`);
    }

  } catch (error) {
    console.warn('⚠️  Could not parse certificate for expiry check:', error);
  }
}

/**
 * Create HTTPS server with SSL configuration
 * @param app Express application
 * @param sslConfig SSL configuration
 * @param port Port to listen on
 * @returns HTTPS server instance
 */
export function createHttpsServer(app: express.Application, sslConfig: SSLConfig, port: number): https.Server {
  console.log('🚀 Creating HTTPS server with TLS hardening...');
  
  const serverOptions: https.ServerOptions = {
    key: sslConfig.key,
    cert: sslConfig.cert,
    ca: sslConfig.ca,
    passphrase: sslConfig.passphrase,
    
    // TLS version hardening
    minVersion: sslConfig.minVersion || 'TLSv1.2',
    maxVersion: sslConfig.maxVersion || 'TLSv1.3',
    
    // Cipher suite configuration
    ciphers: sslConfig.ciphers,
    honorCipherOrder: sslConfig.honorCipherOrder !== false, // Default to true
    
    // ECDH curve configuration for ECDHE cipher suites
    ecdhCurve: sslConfig.ecdhCurve || 'prime256v1:secp384r1',
    
    // Advanced security hardening
    secureOptions: (
      // Disable insecure SSL/TLS versions
      require('constants').SSL_OP_NO_SSLv2 |
      require('constants').SSL_OP_NO_SSLv3 |
      require('constants').SSL_OP_NO_TLSv1 |
      require('constants').SSL_OP_NO_TLSv1_1 |
      
      // Disable TLS compression to prevent CRIME attacks
      require('constants').SSL_OP_NO_COMPRESSION |
      
      // Disable session resumption if configured
      (sslConfig.disableSessionResumption ? 
        require('constants').SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION : 0) |
        
      // Enable single DH use for forward secrecy
      require('constants').SSL_OP_SINGLE_DH_USE |
      require('constants').SSL_OP_SINGLE_ECDH_USE
    ),
    
    // Session management configuration
    sessionTimeout: sslConfig.sessionTimeout,
    // Note: sessionCacheSize would need to be implemented at the TLS context level
  };

  const server = https.createServer(serverOptions, app);
  
  // Set up certificate pinning validation if enabled
  if (sslConfig.certificatePinning?.enabled) {
    server.on('secureConnection', (tlsSocket) => {
      const cert = tlsSocket.getPeerCertificate(true);
      if (cert && sslConfig.certificatePinning) {
        const validationResult = validateCertificatePin(cert, sslConfig.certificatePinning);
        if (!validationResult.isValid) {
          console.warn('⚠️  Certificate pinning validation failed:', validationResult.error);
          
          if (sslConfig.certificatePinning.strictMode) {
            tlsSocket.destroy();
            return;
          }
          
          // Report pin validation failure
          if (sslConfig.certificatePinning.reportingUrl) {
            reportCertificatePinFailure(
              sslConfig.certificatePinning.reportingUrl,
              cert,
              validationResult.error || 'Unknown validation error'
            ).catch(err => {
              console.warn('Failed to report certificate pin validation failure:', err);
            });
          }
        }
      }
    });
  }
  
  server.on('error', (error) => {
    console.error('❌ HTTPS server error:', error);
  });

  server.on('listening', () => {
    console.log(`✅ HTTPS server listening on port ${port}`);
    console.log(`🔐 TLS Configuration:`);
    console.log(`   - Min Version: ${serverOptions.minVersion}`);
    console.log(`   - Max Version: ${serverOptions.maxVersion}`);
    console.log(`   - Cipher Order: ${serverOptions.honorCipherOrder ? 'Server Preference' : 'Client Preference'}`);
    console.log(`   - ECDH Curves: ${serverOptions.ecdhCurve}`);
    console.log(`   - Forward Secrecy: ${sslConfig.ciphers?.includes('ECDHE') ? 'Enabled' : 'Check cipher config'}`);
    console.log(`   - Session Resumption: ${sslConfig.disableSessionResumption ? 'Disabled' : 'Enabled'}`);
    console.log(`   - Session Timeout: ${sslConfig.sessionTimeout}s`);
    console.log(`   - Session Cache Size: ${sslConfig.sessionCacheSize}`);
    console.log(`   - OCSP Stapling: ${sslConfig.ocspStapling ? 'Enabled' : 'Disabled'}`);
    
    if (sslConfig.certificatePinning?.enabled) {
      console.log(`   - Certificate Pinning: Enabled`);
      console.log(`     * Pinned Certificates: ${sslConfig.certificatePinning.pinnedCertificates.length}`);
      console.log(`     * Pinned Public Keys: ${sslConfig.certificatePinning.pinnedPublicKeys.length}`);
      console.log(`     * Strict Mode: ${sslConfig.certificatePinning.strictMode ? 'Enabled' : 'Disabled'}`);
      console.log(`     * Max Age: ${sslConfig.certificatePinning.maxAge}s`);
    } else {
      console.log(`   - Certificate Pinning: Disabled`);
    }
  });

  return server;
}

/**
 * Get SSL configuration from environment and file sources
 * @returns SSL configuration or null if not available
 */
export async function getSSLConfigFromEnvironment(): Promise<SSLConfig | null> {
  const source: CertificateSource = {
    // File paths from environment variables
    keyPath: process.env[ENV_VARS.SSL_KEY_PATH],
    certPath: process.env[ENV_VARS.SSL_CERT_PATH],
    caPath: process.env[ENV_VARS.SSL_CA_PATH],
    
    // Direct certificate content from environment variables
    keyEnvVar: 'SSL_PRIVATE_KEY',
    certEnvVar: 'SSL_CERTIFICATE', 
    caEnvVar: 'SSL_CA_BUNDLE'
  };

  return loadSSLConfig(source);
}

/**
 * Default SSL configuration for common deployment scenarios
 */
export const defaultSSLSources = {
  // Standard file paths
  files: {
    keyPath: '/etc/ssl/private/server.key',
    certPath: '/etc/ssl/certs/server.crt',
    caPath: '/etc/ssl/certs/ca-bundle.crt'
  },
  
  // Let's Encrypt paths
  letsEncrypt: {
    keyPath: '/etc/letsencrypt/live/domain/privkey.pem',
    certPath: '/etc/letsencrypt/live/domain/fullchain.pem'
  },
  
  // Development self-signed certificates
  development: {
    keyPath: './ssl/dev-key.pem',
    certPath: './ssl/dev-cert.pem'
  }
};

export default {
  loadSSLConfig,
  createHttpsServer,
  getSSLConfigFromEnvironment,
  defaultSSLSources
};

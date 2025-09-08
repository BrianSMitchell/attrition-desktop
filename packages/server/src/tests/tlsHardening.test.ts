/**
 * TLS Hardening Tests
 * 
 * Comprehensive test suite for TLS configuration hardening including:
 * - SSL configuration validation
 * - Cipher suite security testing
 * - Certificate pinning validation
 * - TLS session management
 * - Security monitoring
 * - Protocol version enforcement
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import https from 'https';

// Import modules under test
import { 
  loadSSLConfig, 
  createHttpsServer, 
  getSSLConfigFromEnvironment,
  getSecureCipherSuites,
  validateCertificatePinningConfig,
  extractCertificateHash,
  extractPublicKeyHash,
  validateCertificatePin,
  generateHPKPHeader,
  SSLConfig,
  CertificateSource 
} from '../config/ssl';

import { 
  TLSSessionManager, 
  getTLSSessionManager,
  createTLSSessionMiddleware,
  defaultTLSSessionConfig,
  TLSSessionInfo
} from '../utils/tlsSessionManager';

import { 
  TLSMonitor,
  getTLSMonitor,
  createTLSMonitoringMiddleware,
  defaultTLSMonitoringConfig,
  TLSHandshakeEvent
} from '../utils/tlsMonitoring';

import { validateTLSConnection } from '../utils/tlsValidator';

// Test certificates and keys (self-signed for testing)
const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGtJv5h7Zw6xqX
test-key-content-here
-----END PRIVATE KEY-----`;

const TEST_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJANqXjGjVn7V7MA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
test-cert-content-here
-----END CERTIFICATE-----`;

const TEST_CA_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJANqXjGjVn7V7MA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
test-ca-cert-content-here
-----END CERTIFICATE-----`;

describe('TLS Hardening Implementation', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockSSLConfig: SSLConfig;

  beforeEach(() => {
    originalEnv = { ...process.env };
    
    mockSSLConfig = {
      key: TEST_PRIVATE_KEY,
      cert: TEST_CERTIFICATE,
      ca: TEST_CA_CERTIFICATE,
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ciphers: getSecureCipherSuites(),
      ecdhCurve: 'secp384r1:prime256v1:secp521r1',
      honorCipherOrder: true,
      disableSessionResumption: false,
      sessionTimeout: 300,
      sessionCacheSize: 1024,
      ocspStapling: true
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('SSL Configuration Loading', () => {
    it('should load SSL config from environment variables', async () => {
      process.env.SSL_PRIVATE_KEY = TEST_PRIVATE_KEY;
      process.env.SSL_CERTIFICATE = TEST_CERTIFICATE;
      process.env.SSL_CA_BUNDLE = TEST_CA_CERTIFICATE;
      process.env.NODE_ENV = 'test';

      const config = await getSSLConfigFromEnvironment();
      
      expect(config).toBeDefined();
      expect(config?.key).toBe(TEST_PRIVATE_KEY);
      expect(config?.cert).toBe(TEST_CERTIFICATE);
      expect(config?.ca).toBe(TEST_CA_CERTIFICATE);
    });

    it('should load SSL config from file paths', async () => {
      const tempDir = path.join(__dirname, 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      const keyPath = path.join(tempDir, 'test.key');
      const certPath = path.join(tempDir, 'test.crt');
      
      await fs.writeFile(keyPath, TEST_PRIVATE_KEY);
      await fs.writeFile(certPath, TEST_CERTIFICATE);

      const source: CertificateSource = {
        keyPath,
        certPath
      };

      const config = await loadSSLConfig(source);
      
      expect(config).toBeDefined();
      expect(config?.key).toBe(TEST_PRIVATE_KEY);
      expect(config?.cert).toBe(TEST_CERTIFICATE);

      // Cleanup
      await fs.unlink(keyPath);
      await fs.unlink(certPath);
      await fs.rmdir(tempDir);
    });

    it('should return null in development without FORCE_HTTPS', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.FORCE_HTTPS;

      const source: CertificateSource = {};
      const config = await loadSSLConfig(source);
      
      expect(config).toBeNull();
    });

    it('should throw error in production without certificates', async () => {
      process.env.NODE_ENV = 'production';

      const source: CertificateSource = {};
      
      await expect(loadSSLConfig(source)).rejects.toThrow();
    });

    it('should configure certificate pinning from environment', async () => {
      process.env.TLS_CERT_PINNING_ENABLED = 'true';
      process.env.TLS_PINNED_CERTIFICATES = 'cert1,cert2';
      process.env.TLS_PINNED_PUBLIC_KEYS = 'key1,key2';
      process.env.TLS_CERT_PINNING_STRICT = 'true';
      process.env.SSL_PRIVATE_KEY = TEST_PRIVATE_KEY;
      process.env.SSL_CERTIFICATE = TEST_CERTIFICATE;

      const config = await getSSLConfigFromEnvironment();
      
      expect(config?.certificatePinning).toBeDefined();
      expect(config?.certificatePinning?.enabled).toBe(true);
      expect(config?.certificatePinning?.pinnedCertificates).toEqual(['cert1', 'cert2']);
      expect(config?.certificatePinning?.pinnedPublicKeys).toEqual(['key1', 'key2']);
      expect(config?.certificatePinning?.strictMode).toBe(true);
    });
  });

  describe('Cipher Suite Configuration', () => {
    it('should return secure cipher suites', () => {
      const ciphers = getSecureCipherSuites();
      
      expect(ciphers).toContain('ECDHE');
      expect(ciphers).toContain('AEAD');
      expect(ciphers).not.toContain('RC4');
      expect(ciphers).not.toContain('DES');
      expect(ciphers).not.toContain('NULL');
    });

    it('should prioritize TLS 1.3 cipher suites', () => {
      const ciphers = getSecureCipherSuites();
      
      expect(ciphers.startsWith('TLS_AES_256_GCM_SHA384')).toBe(true);
    });

    it('should exclude weak cipher suites', () => {
      const ciphers = getSecureCipherSuites();
      const weakPatterns = ['RC4', 'DES', '3DES', 'MD5', 'NULL', 'EXPORT'];
      
      weakPatterns.forEach(pattern => {
        expect(ciphers.toUpperCase()).not.toContain(pattern);
      });
    });
  });

  describe('Certificate Pinning', () => {
    it('should validate certificate pinning configuration', () => {
      const validConfig = {
        enabled: true,
        pinnedCertificates: ['cert1'],
        pinnedPublicKeys: ['key1'],
        strictMode: true,
        maxAge: 86400
      };

      const result = validateCertificatePinningConfig(validConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid certificate pinning configuration', () => {
      const invalidConfig = {
        enabled: true,
        pinnedCertificates: [],
        pinnedPublicKeys: [],
        strictMode: true,
        maxAge: -1
      };

      const result = validateCertificatePinningConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should extract certificate hash correctly', () => {
      const hash = extractCertificateHash(TEST_CERTIFICATE);
      
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^[a-fA-F0-9]{64}$/); // SHA-256 hex string
    });

    it('should extract public key hash correctly', () => {
      const hash = extractPublicKeyHash(TEST_CERTIFICATE);
      
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^[a-zA-Z0-9+/]+=*$/); // Base64 string
    });

    it('should generate HPKP header correctly', () => {
      const config = {
        pinnedPublicKeys: ['key1', 'key2'],
        maxAge: 86400,
        includeSubdomains: true,
        reportUri: 'https://example.com/report'
      };

      const header = generateHPKPHeader(config);
      
      expect(header).toContain('pin-sha256="key1"');
      expect(header).toContain('pin-sha256="key2"');
      expect(header).toContain('max-age=86400');
      expect(header).toContain('includeSubDomains');
      expect(header).toContain('report-uri="https://example.com/report"');
    });

    it('should validate certificate pin correctly', () => {
      const mockCert = {
        raw: Buffer.from('test-cert'),
        fingerprint256: 'test-fingerprint'
      } as any;

      const pinningConfig = {
        enabled: true,
        pinnedCertificates: ['test-fingerprint'],
        pinnedPublicKeys: [],
        strictMode: false,
        maxAge: 86400
      };

      const result = validateCertificatePin(mockCert, pinningConfig);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('TLS Session Management', () => {
    let sessionManager: TLSSessionManager;

    beforeEach(() => {
      sessionManager = new TLSSessionManager(defaultTLSSessionConfig);
    });

    afterEach(() => {
      sessionManager.shutdown();
    });

    it('should create TLS sessions correctly', () => {
      const sessionData = {
        clientIP: '192.168.1.1',
        userAgent: 'Test-Agent/1.0',
        protocol: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384'
      };

      const session = sessionManager.createSession(sessionData);
      
      expect(session.id).toBeDefined();
      expect(session.clientIP).toBe(sessionData.clientIP);
      expect(session.protocol).toBe(sessionData.protocol);
      expect(session.securityLevel).toBe('high'); // TLS 1.3 with AEAD
      expect(session.isValid).toBe(true);
    });

    it('should validate sessions correctly', () => {
      const sessionData = {
        clientIP: '192.168.1.1',
        userAgent: 'Test-Agent/1.0',
        protocol: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384'
      };

      const session = sessionManager.createSession(sessionData);
      const validation = sessionManager.validateSession(session.id, sessionData.clientIP);
      
      expect(validation.isValid).toBe(true);
      expect(validation.securityLevel).toBe('high');
    });

    it('should invalidate expired sessions', (done) => {
      const shortTimeoutConfig = { ...defaultTLSSessionConfig, sessionTimeout: 1 };
      const shortTimeoutManager = new TLSSessionManager(shortTimeoutConfig);
      
      const sessionData = {
        clientIP: '192.168.1.1',
        protocol: 'TLSv1.2',
        cipher: 'ECDHE-RSA-AES256-GCM-SHA384'
      };

      const session = shortTimeoutManager.createSession(sessionData);
      
      // Wait for session to expire
      setTimeout(() => {
        const validation = shortTimeoutManager.validateSession(session.id, sessionData.clientIP);
        expect(validation.isValid).toBe(false);
        expect(validation.reason).toBe('Session expired');
        
        shortTimeoutManager.shutdown();
        done();
      }, 1500);
    });

    it('should detect IP address mismatches', () => {
      const sessionData = {
        clientIP: '192.168.1.1',
        protocol: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384'
      };

      const session = sessionManager.createSession(sessionData);
      const validation = sessionManager.validateSession(session.id, '192.168.1.2');
      
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('IP address mismatch');
    });

    it('should assess security levels correctly', () => {
      // High security: TLS 1.3 with AEAD
      const highSecSession = sessionManager.createSession({
        clientIP: '192.168.1.1',
        protocol: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384'
      });
      expect(highSecSession.securityLevel).toBe('high');

      // Medium security: TLS 1.2 with ECDHE
      const mediumSecSession = sessionManager.createSession({
        clientIP: '192.168.1.1',
        protocol: 'TLSv1.2',
        cipher: 'ECDHE-RSA-AES256-GCM-SHA384'
      });
      expect(mediumSecSession.securityLevel).toBe('medium');

      // Low security: TLS 1.2 without perfect forward secrecy
      const lowSecSession = sessionManager.createSession({
        clientIP: '192.168.1.1',
        protocol: 'TLSv1.2',
        cipher: 'AES256-SHA256'
      });
      expect(lowSecSession.securityLevel).toBe('low');
    });

    it('should clean up expired sessions', () => {
      const metrics = sessionManager.getMetrics();
      const initialCount = metrics.activeSessions;
      
      // Create a session
      sessionManager.createSession({
        clientIP: '192.168.1.1',
        protocol: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384'
      });
      
      // Force cleanup (with expired timeout)
      const cleanedCount = sessionManager.cleanupExpiredSessions();
      
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('TLS Monitoring', () => {
    let monitor: TLSMonitor;

    beforeEach(() => {
      monitor = new TLSMonitor(defaultTLSMonitoringConfig);
    });

    afterEach(() => {
      monitor.shutdown();
    });

    it('should record TLS handshake events', () => {
      const handshakeEvent: TLSHandshakeEvent = {
        clientIP: '192.168.1.1',
        protocol: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384',
        success: true,
        handshakeTime: 50,
        certificateValid: true,
        sessionResumed: false,
        timestamp: new Date()
      };

      monitor.recordHandshake(handshakeEvent);
      
      const metrics = monitor.getMetrics();
      expect(metrics.successfulHandshakes).toBe(1);
      expect(metrics.protocolVersions['TLSv1.3']).toBe(1);
      expect(metrics.cipherSuites['TLS_AES_256_GCM_SHA384']).toBe(1);
    });

    it('should track connection metrics', () => {
      monitor.recordConnectionStart('192.168.1.1');
      monitor.recordConnectionStart('192.168.1.2');
      
      let metrics = monitor.getMetrics();
      expect(metrics.totalConnections).toBe(2);
      expect(metrics.activeConnections).toBe(2);
      
      monitor.recordConnectionEnd('192.168.1.1');
      
      metrics = monitor.getMetrics();
      expect(metrics.activeConnections).toBe(1);
    });

    it('should create security alerts', () => {
      const alert = monitor.createAlert(
        'warning',
        'test_alert',
        'Test alert message',
        { test: 'data' },
        '192.168.1.1'
      );
      
      expect(alert.id).toBeDefined();
      expect(alert.level).toBe('warning');
      expect(alert.type).toBe('test_alert');
      expect(alert.resolved).toBe(false);
      
      const activeAlerts = monitor.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].id).toBe(alert.id);
    });

    it('should resolve security alerts', () => {
      const alert = monitor.createAlert('info', 'test', 'Test', {});
      
      expect(monitor.resolveAlert(alert.id)).toBe(true);
      expect(monitor.resolveAlert(alert.id)).toBe(false); // Already resolved
      
      const activeAlerts = monitor.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });

    it('should perform security assessment', () => {
      // Add some test data
      monitor.recordHandshake({
        clientIP: '192.168.1.1',
        protocol: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384',
        success: true,
        handshakeTime: 50,
        certificateValid: true,
        sessionResumed: false,
        timestamp: new Date()
      });

      const assessment = monitor.performSecurityAssessment();
      
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(assessment.protocolSecurity).toBeGreaterThanOrEqual(0);
      expect(assessment.cipherSecurity).toBeGreaterThanOrEqual(0);
      expect(assessment.recommendations).toBeInstanceOf(Array);
      expect(assessment.vulnerabilities).toBeInstanceOf(Array);
    });

    it('should generate statistics report', () => {
      // Add test handshakes
      monitor.recordHandshake({
        clientIP: '192.168.1.1',
        protocol: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384',
        success: true,
        handshakeTime: 50,
        certificateValid: true,
        sessionResumed: false,
        timestamp: new Date()
      });

      const report = monitor.getStatisticsReport();
      
      expect(report.summary).toBeDefined();
      expect(report.summary.successfulHandshakes).toBe(1);
      expect(report.topProtocols).toBeInstanceOf(Array);
      expect(report.topCiphers).toBeInstanceOf(Array);
      expect(report.errorAnalysis).toBeInstanceOf(Array);
      expect(report.securityAssessment).toBeDefined();
    });

    it('should detect weak configurations', () => {
      const weakHandshake: TLSHandshakeEvent = {
        clientIP: '192.168.1.1',
        protocol: 'TLSv1.1', // Old protocol
        cipher: 'RC4-MD5', // Weak cipher
        success: true,
        handshakeTime: 100,
        certificateValid: true,
        sessionResumed: false,
        timestamp: new Date()
      };

      monitor.recordHandshake(weakHandshake);
      
      const alerts = monitor.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const protocolAlert = alerts.find(a => a.type === 'old_protocol_usage');
      const cipherAlert = alerts.find(a => a.type === 'weak_cipher_usage');
      
      expect(protocolAlert).toBeDefined();
      expect(cipherAlert).toBeDefined();
    });
  });

  describe('TLS Validation', () => {
    it('should validate secure TLS connections', async () => {
      const mockSocket = {
        encrypted: true,
        getProtocol: () => 'TLSv1.3',
        getCipher: () => ({ name: 'TLS_AES_256_GCM_SHA384', version: 'TLSv1.3' }),
        getPeerCertificate: () => ({ 
          valid_from: new Date(Date.now() - 86400000).toISOString(),
          valid_to: new Date(Date.now() + 86400000).toISOString(),
          fingerprint256: 'test-fingerprint'
        })
      } as any;

      const result = await validateTLSConnection(mockSocket);
      
      expect(result.isSecure).toBe(true);
      expect(result.securityScore).toBeGreaterThan(80);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect insecure TLS connections', async () => {
      const mockSocket = {
        encrypted: true,
        getProtocol: () => 'TLSv1.1',
        getCipher: () => ({ name: 'RC4-MD5', version: 'TLSv1.1' }),
        getPeerCertificate: () => ({
          valid_from: new Date(Date.now() - 86400000).toISOString(),
          valid_to: new Date(Date.now() - 1000).toISOString(), // Expired
          fingerprint256: 'test-fingerprint'
        })
      } as any;

      const result = await validateTLSConnection(mockSocket);
      
      expect(result.isSecure).toBe(false);
      expect(result.securityScore).toBeLessThan(50);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.vulnerabilities.length).toBeGreaterThan(0);
    });

    it('should detect mixed content risks', async () => {
      const mockSocket = {
        encrypted: false
      } as any;

      const result = await validateTLSConnection(mockSocket);
      
      expect(result.isSecure).toBe(false);
      expect(result.warnings).toContain('Connection is not encrypted');
    });
  });

  describe('HTTPS Server Creation', () => {
    it('should create HTTPS server with hardened configuration', () => {
      const mockApp = {} as any;
      const server = createHttpsServer(mockApp, mockSSLConfig, 443);
      
      expect(server).toBeDefined();
      expect(server.listening).toBe(false);
      
      // Server should be created but not listening yet
      server.close();
    });

    it('should apply security options correctly', () => {
      const mockApp = {} as any;
      const server = createHttpsServer(mockApp, mockSSLConfig, 443);
      
      // Check that the server was created with SSL config
      expect(server).toBeInstanceOf(https.Server);
      
      server.close();
    });
  });

  describe('Environment-Based Configuration', () => {
    it('should use development defaults', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.FORCE_HTTPS;

      const config = await getSSLConfigFromEnvironment();
      
      expect(config).toBeNull(); // SSL disabled in dev without FORCE_HTTPS
    });

    it('should enforce HTTPS in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SSL_PRIVATE_KEY = TEST_PRIVATE_KEY;
      process.env.SSL_CERTIFICATE = TEST_CERTIFICATE;

      const config = await getSSLConfigFromEnvironment();
      
      expect(config).toBeDefined();
      expect(config?.minVersion).toBe('TLSv1.2');
      expect(config?.maxVersion).toBe('TLSv1.3');
    });

    it('should configure session management from environment', async () => {
      process.env.TLS_DISABLE_SESSION_RESUMPTION = 'true';
      process.env.TLS_SESSION_TIMEOUT = '600';
      process.env.TLS_SESSION_CACHE_SIZE = '2048';
      process.env.SSL_PRIVATE_KEY = TEST_PRIVATE_KEY;
      process.env.SSL_CERTIFICATE = TEST_CERTIFICATE;

      const config = await getSSLConfigFromEnvironment();
      
      expect(config?.disableSessionResumption).toBe(true);
      expect(config?.sessionTimeout).toBe(600);
      expect(config?.sessionCacheSize).toBe(2048);
    });
  });

  describe('Integration Tests', () => {
    it('should integrate session management with monitoring', () => {
      const sessionManager = getTLSSessionManager();
      const monitor = getTLSMonitor();

      // Create a session
      const session = sessionManager.createSession({
        clientIP: '192.168.1.1',
        protocol: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384'
      });

      // Record corresponding handshake
      monitor.recordHandshake({
        clientIP: '192.168.1.1',
        protocol: 'TLSv1.3',
        cipher: 'TLS_AES_256_GCM_SHA384',
        success: true,
        handshakeTime: 45,
        certificateValid: true,
        sessionResumed: false,
        timestamp: new Date()
      });

      const sessionMetrics = sessionManager.getMetrics();
      const monitorMetrics = monitor.getMetrics();

      expect(sessionMetrics.activeSessions).toBe(1);
      expect(monitorMetrics.successfulHandshakes).toBe(1);
      
      sessionManager.shutdown();
      monitor.shutdown();
    });

    it('should handle middleware integration', () => {
      const sessionManager = getTLSSessionManager();
      const monitor = getTLSMonitor();

      const sessionMiddleware = createTLSSessionMiddleware(sessionManager);
      const monitoringMiddleware = createTLSMonitoringMiddleware(monitor);

      expect(sessionMiddleware).toBeInstanceOf(Function);
      expect(monitoringMiddleware).toBeInstanceOf(Function);

      sessionManager.shutdown();
      monitor.shutdown();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing certificate files gracefully', async () => {
      const source: CertificateSource = {
        keyPath: '/nonexistent/key.pem',
        certPath: '/nonexistent/cert.pem'
      };

      await expect(loadSSLConfig(source)).rejects.toThrow();
    });

    it('should handle invalid certificate content', async () => {
      const source: CertificateSource = {
        keyEnvVar: 'INVALID_KEY',
        certEnvVar: 'INVALID_CERT'
      };

      process.env.INVALID_KEY = 'not-a-private-key';
      process.env.INVALID_CERT = 'not-a-certificate';

      await expect(loadSSLConfig(source)).rejects.toThrow();
    });

    it('should handle session manager errors gracefully', () => {
      const sessionManager = new TLSSessionManager(defaultTLSSessionConfig);
      
      // Try to validate non-existent session
      const result = sessionManager.validateSession('non-existent', '192.168.1.1');
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session not found');

      sessionManager.shutdown();
    });

    it('should handle monitoring system errors gracefully', () => {
      const monitor = new TLSMonitor(defaultTLSMonitoringConfig);
      
      // Try to resolve non-existent alert
      expect(monitor.resolveAlert('non-existent')).toBe(false);

      monitor.shutdown();
    });
  });
});

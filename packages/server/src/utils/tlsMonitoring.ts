/**
 * TLS Monitoring and Alerting Utilities
 * 
 * Provides comprehensive monitoring capabilities for TLS connections including:
 * - Connection metrics tracking
 * - Handshake failure monitoring
 * - Cipher suite usage analysis
 * - Protocol version statistics
 * - Security violation detection
 * - Performance metrics
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import * as tls from 'tls';

/**
 * TLS connection metrics
 */
export interface TLSConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  successfulHandshakes: number;
  failedHandshakes: number;
  handshakeErrors: { [error: string]: number };
  protocolVersions: { [version: string]: number };
  cipherSuites: { [cipher: string]: number };
  certificateValidationFailures: number;
  sessionResumptions: number;
  averageHandshakeTime: number;
  totalDataTransferred: number;
}

/**
 * TLS security alert levels
 */
export type TLSAlertLevel = 'info' | 'warning' | 'critical';

/**
 * TLS security alert
 */
export interface TLSSecurityAlert {
  id: string;
  level: TLSAlertLevel;
  timestamp: Date;
  type: string;
  message: string;
  details: any;
  clientIP?: string;
  resolved: boolean;
}

/**
 * TLS monitoring configuration
 */
export interface TLSMonitoringConfig {
  enableMetrics: boolean;
  enableAlerts: boolean;
  alertThresholds: {
    handshakeFailureRate: number; // Percentage (0-100)
    weakCipherUsage: number; // Percentage (0-100)
    oldProtocolUsage: number; // Percentage (0-100)
    certificateExpirationDays: number;
  };
  metricsRetentionHours: number;
  alertRetentionHours: number;
}

/**
 * TLS handshake event data
 */
export interface TLSHandshakeEvent {
  clientIP: string;
  protocol: string;
  cipher: string;
  success: boolean;
  error?: string;
  handshakeTime: number;
  certificateValid: boolean;
  sessionResumed: boolean;
  timestamp: Date;
}

/**
 * TLS security assessment
 */
export interface TLSSecurityAssessment {
  overallScore: number; // 0-100
  protocolSecurity: number;
  cipherSecurity: number;
  certificateSecurity: number;
  configurationSecurity: number;
  recommendations: string[];
  vulnerabilities: string[];
}

/**
 * Advanced TLS monitoring system
 */
export class TLSMonitor extends EventEmitter {
  private metrics: TLSConnectionMetrics;
  private alerts: TLSSecurityAlert[] = [];
  private handshakeEvents: TLSHandshakeEvent[] = [];
  private cleanupTimer?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;

  constructor(private config: TLSMonitoringConfig) {
    super();
    
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      successfulHandshakes: 0,
      failedHandshakes: 0,
      handshakeErrors: {},
      protocolVersions: {},
      cipherSuites: {},
      certificateValidationFailures: 0,
      sessionResumptions: 0,
      averageHandshakeTime: 0,
      totalDataTransferred: 0
    };

    this.startPeriodicTasks();
  }

  /**
   * Record a TLS handshake event
   */
  recordHandshake(event: TLSHandshakeEvent): void {
    if (!this.config.enableMetrics) {
      return;
    }

    this.handshakeEvents.push(event);
    this.updateMetrics(event);
    this.checkSecurityThresholds(event);

    this.emit('handshakeRecorded', event);

    // Log significant events
    if (!event.success) {
      console.warn(`🔴 TLS handshake failed from ${event.clientIP}: ${event.error}`);
    } else if (this.isWeakConfiguration(event.protocol, event.cipher)) {
      console.warn(`⚠️  Weak TLS configuration used: ${event.protocol}/${event.cipher} from ${event.clientIP}`);
    }
  }

  /**
   * Record TLS connection start
   */
  recordConnectionStart(clientIP: string): void {
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;
    
    if (this.config.enableMetrics) {
      console.log(`🔐 TLS connection started from ${clientIP} (active: ${this.metrics.activeConnections})`);
    }
  }

  /**
   * Record TLS connection end
   */
  recordConnectionEnd(clientIP: string, dataTransferred?: number): void {
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
    
    if (dataTransferred) {
      this.metrics.totalDataTransferred += dataTransferred;
    }

    if (this.config.enableMetrics) {
      console.log(`🔓 TLS connection ended from ${clientIP} (active: ${this.metrics.activeConnections})`);
    }
  }

  /**
   * Create a security alert
   */
  createAlert(
    level: TLSAlertLevel, 
    type: string, 
    message: string, 
    details: any, 
    clientIP?: string
  ): TLSSecurityAlert {
    const alert: TLSSecurityAlert = {
      id: crypto.randomUUID(),
      level,
      timestamp: new Date(),
      type,
      message,
      details,
      clientIP,
      resolved: false
    };

    this.alerts.push(alert);
    this.emit('alertCreated', alert);

    // Log alerts to console
    const logLevel = level === 'critical' ? 'error' : level === 'warning' ? 'warn' : 'info';
    console[logLevel](`🚨 TLS Alert [${level.toUpperCase()}]: ${message}`, details);

    return alert;
  }

  /**
   * Resolve a security alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      this.emit('alertResolved', alert);
      console.log(`✅ TLS Alert resolved: ${alert.message}`);
      return true;
    }
    return false;
  }

  /**
   * Get current TLS metrics
   */
  getMetrics(): TLSConnectionMetrics & { timestamp: Date } {
    return {
      ...this.metrics,
      timestamp: new Date()
    };
  }

  /**
   * Get active security alerts
   */
  getActiveAlerts(): TLSSecurityAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all security alerts
   */
  getAllAlerts(): TLSSecurityAlert[] {
    return [...this.alerts];
  }

  /**
   * Perform TLS security assessment
   */
  performSecurityAssessment(): TLSSecurityAssessment {
    const assessment: TLSSecurityAssessment = {
      overallScore: 0,
      protocolSecurity: this.assessProtocolSecurity(),
      cipherSecurity: this.assessCipherSecurity(),
      certificateSecurity: this.assessCertificateSecurity(),
      configurationSecurity: this.assessConfigurationSecurity(),
      recommendations: [],
      vulnerabilities: []
    };

    // Calculate overall score (weighted average)
    assessment.overallScore = Math.round(
      (assessment.protocolSecurity * 0.3 +
       assessment.cipherSecurity * 0.3 +
       assessment.certificateSecurity * 0.2 +
       assessment.configurationSecurity * 0.2)
    );

    // Generate recommendations based on scores
    if (assessment.protocolSecurity < 80) {
      assessment.recommendations.push('Upgrade to TLS 1.3 for better security');
      assessment.vulnerabilities.push('Legacy TLS protocol usage detected');
    }

    if (assessment.cipherSecurity < 80) {
      assessment.recommendations.push('Configure stronger cipher suites with AEAD encryption');
      assessment.vulnerabilities.push('Weak cipher suites in use');
    }

    if (assessment.certificateSecurity < 80) {
      assessment.recommendations.push('Implement certificate pinning and OCSP stapling');
      assessment.vulnerabilities.push('Certificate security could be improved');
    }

    if (assessment.configurationSecurity < 80) {
      assessment.recommendations.push('Harden TLS configuration and disable legacy features');
      assessment.vulnerabilities.push('TLS configuration weaknesses detected');
    }

    return assessment;
  }

  /**
   * Get TLS statistics report
   */
  getStatisticsReport(): {
    summary: any;
    topProtocols: Array<{ protocol: string; count: number; percentage: number }>;
    topCiphers: Array<{ cipher: string; count: number; percentage: number }>;
    errorAnalysis: Array<{ error: string; count: number; percentage: number }>;
    securityAssessment: TLSSecurityAssessment;
  } {
    const totalHandshakes = this.metrics.successfulHandshakes + this.metrics.failedHandshakes;
    const successRate = totalHandshakes > 0 ? (this.metrics.successfulHandshakes / totalHandshakes) * 100 : 0;

    return {
      summary: {
        totalConnections: this.metrics.totalConnections,
        activeConnections: this.metrics.activeConnections,
        successfulHandshakes: this.metrics.successfulHandshakes,
        failedHandshakes: this.metrics.failedHandshakes,
        successRate: Math.round(successRate * 100) / 100,
        averageHandshakeTime: this.metrics.averageHandshakeTime,
        totalDataTransferred: this.metrics.totalDataTransferred,
        activeAlertsCount: this.getActiveAlerts().length
      },
      topProtocols: this.getTopProtocols(this.metrics.protocolVersions, totalHandshakes),
      topCiphers: this.getTopCiphers(this.metrics.cipherSuites, totalHandshakes),
      errorAnalysis: this.getTopErrors(this.metrics.handshakeErrors, this.metrics.failedHandshakes),
      securityAssessment: this.performSecurityAssessment()
    };
  }

  /**
   * Clean up old data
   */
  cleanup(): void {
    const now = new Date();
    const metricsThreshold = new Date(now.getTime() - this.config.metricsRetentionHours * 60 * 60 * 1000);
    const alertsThreshold = new Date(now.getTime() - this.config.alertRetentionHours * 60 * 60 * 1000);

    // Clean up old handshake events
    const originalCount = this.handshakeEvents.length;
    this.handshakeEvents = this.handshakeEvents.filter(event => event.timestamp > metricsThreshold);
    const cleanedEvents = originalCount - this.handshakeEvents.length;

    // Clean up old resolved alerts
    const originalAlerts = this.alerts.length;
    this.alerts = this.alerts.filter(alert => 
      !alert.resolved || alert.timestamp > alertsThreshold
    );
    const cleanedAlerts = originalAlerts - this.alerts.length;

    if (cleanedEvents > 0 || cleanedAlerts > 0) {
      console.log(`🧹 TLS monitoring cleanup: ${cleanedEvents} events, ${cleanedAlerts} alerts removed`);
    }
  }

  /**
   * Shutdown the monitoring system
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    this.removeAllListeners();
    console.log('🛑 TLS monitoring system shutdown complete');
  }

  /**
   * Update metrics based on handshake event
   */
  private updateMetrics(event: TLSHandshakeEvent): void {
    if (event.success) {
      this.metrics.successfulHandshakes++;
      
      // Update protocol version stats
      this.metrics.protocolVersions[event.protocol] = 
        (this.metrics.protocolVersions[event.protocol] || 0) + 1;
      
      // Update cipher suite stats
      this.metrics.cipherSuites[event.cipher] = 
        (this.metrics.cipherSuites[event.cipher] || 0) + 1;
      
      if (event.sessionResumed) {
        this.metrics.sessionResumptions++;
      }
    } else {
      this.metrics.failedHandshakes++;
      
      if (event.error) {
        this.metrics.handshakeErrors[event.error] = 
          (this.metrics.handshakeErrors[event.error] || 0) + 1;
      }
    }

    if (!event.certificateValid) {
      this.metrics.certificateValidationFailures++;
    }

    // Update average handshake time
    const totalHandshakes = this.metrics.successfulHandshakes + this.metrics.failedHandshakes;
    const currentAvg = this.metrics.averageHandshakeTime;
    this.metrics.averageHandshakeTime = 
      ((currentAvg * (totalHandshakes - 1)) + event.handshakeTime) / totalHandshakes;
  }

  /**
   * Check security thresholds and create alerts
   */
  private checkSecurityThresholds(event: TLSHandshakeEvent): void {
    if (!this.config.enableAlerts) {
      return;
    }

    const totalHandshakes = this.metrics.successfulHandshakes + this.metrics.failedHandshakes;
    
    // Check handshake failure rate
    const failureRate = (this.metrics.failedHandshakes / totalHandshakes) * 100;
    if (failureRate > this.config.alertThresholds.handshakeFailureRate) {
      this.createAlert(
        'warning',
        'high_handshake_failure_rate',
        `High TLS handshake failure rate detected: ${failureRate.toFixed(1)}%`,
        { failureRate, threshold: this.config.alertThresholds.handshakeFailureRate }
      );
    }

    // Check weak cipher usage
    if (event.success && this.isWeakCipher(event.cipher)) {
      this.createAlert(
        'warning',
        'weak_cipher_usage',
        `Weak cipher suite detected: ${event.cipher}`,
        { cipher: event.cipher, clientIP: event.clientIP }
      );
    }

    // Check old protocol usage
    if (event.success && this.isOldProtocol(event.protocol)) {
      this.createAlert(
        'warning',
        'old_protocol_usage',
        `Legacy TLS protocol detected: ${event.protocol}`,
        { protocol: event.protocol, clientIP: event.clientIP }
      );
    }
  }

  /**
   * Check if TLS configuration is weak
   */
  private isWeakConfiguration(protocol: string, cipher: string): boolean {
    return this.isOldProtocol(protocol) || this.isWeakCipher(cipher);
  }

  /**
   * Check if cipher is weak
   */
  private isWeakCipher(cipher: string): boolean {
    const weakPatterns = ['RC4', 'DES', '3DES', 'MD5', 'NULL', 'EXPORT', 'CBC'];
    return weakPatterns.some(pattern => cipher.toUpperCase().includes(pattern));
  }

  /**
   * Check if protocol is old
   */
  private isOldProtocol(protocol: string): boolean {
    return ['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1.1'].includes(protocol);
  }

  /**
   * Assess protocol security score
   */
  private assessProtocolSecurity(): number {
    const versions = this.metrics.protocolVersions;
    const total = Object.values(versions).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) return 100; // No data yet
    
    let score = 0;
    for (const [protocol, count] of Object.entries(versions)) {
      const weight = count / total;
      if (protocol === 'TLSv1.3') {
        score += weight * 100;
      } else if (protocol === 'TLSv1.2') {
        score += weight * 80;
      } else if (protocol === 'TLSv1.1') {
        score += weight * 40;
      } else if (protocol === 'TLSv1') {
        score += weight * 20;
      } else {
        score += weight * 0; // SSL versions
      }
    }
    
    return Math.round(score);
  }

  /**
   * Assess cipher security score
   */
  private assessCipherSecurity(): number {
    const ciphers = this.metrics.cipherSuites;
    const total = Object.values(ciphers).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) return 100; // No data yet
    
    let score = 0;
    for (const [cipher, count] of Object.entries(ciphers)) {
      const weight = count / total;
      if (cipher.includes('AEAD') || cipher.includes('GCM')) {
        score += weight * 100;
      } else if (cipher.includes('ECDHE')) {
        score += weight * 80;
      } else if (cipher.includes('DHE')) {
        score += weight * 60;
      } else if (this.isWeakCipher(cipher)) {
        score += weight * 20;
      } else {
        score += weight * 40;
      }
    }
    
    return Math.round(score);
  }

  /**
   * Assess certificate security score
   */
  private assessCertificateSecurity(): number {
    const total = this.metrics.successfulHandshakes;
    if (total === 0) return 100; // No data yet
    
    const validRate = ((total - this.metrics.certificateValidationFailures) / total) * 100;
    return Math.round(validRate);
  }

  /**
   * Assess configuration security score
   */
  private assessConfigurationSecurity(): number {
    // Base score
    let score = 70;
    
    // Check session resumption rate (lower is better for security)
    const resumptionRate = this.metrics.sessionResumptions / this.metrics.successfulHandshakes;
    if (resumptionRate < 0.1) score += 10; // Low resumption is good
    else if (resumptionRate > 0.5) score -= 10; // High resumption might be risky
    
    // Check handshake failure rate
    const totalHandshakes = this.metrics.successfulHandshakes + this.metrics.failedHandshakes;
    const failureRate = this.metrics.failedHandshakes / totalHandshakes;
    if (failureRate < 0.01) score += 10; // Very low failure rate
    else if (failureRate > 0.1) score -= 20; // High failure rate indicates issues
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get top protocols from metrics
   */
  private getTopProtocols(
    items: { [key: string]: number }, 
    total: number
  ): Array<{ protocol: string; count: number; percentage: number }> {
    return Object.entries(items)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => ({
        protocol: key,
        count,
        percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0
      }));
  }

  /**
   * Get top ciphers from metrics
   */
  private getTopCiphers(
    items: { [key: string]: number }, 
    total: number
  ): Array<{ cipher: string; count: number; percentage: number }> {
    return Object.entries(items)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => ({
        cipher: key,
        count,
        percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0
      }));
  }

  /**
   * Get top errors from metrics
   */
  private getTopErrors(
    items: { [key: string]: number }, 
    total: number
  ): Array<{ error: string; count: number; percentage: number }> {
    return Object.entries(items)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => ({
        error: key,
        count,
        percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0
      }));
  }

  /**
   * Start periodic monitoring tasks
   */
  private startPeriodicTasks(): void {
    // Cleanup old data every hour
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);

    // Emit metrics every 5 minutes
    this.metricsInterval = setInterval(() => {
      const metrics = this.getMetrics();
      this.emit('metricsUpdate', metrics);
      
      if (this.config.enableMetrics) {
        console.log(`📊 TLS Metrics Update:`, {
          totalConnections: metrics.totalConnections,
          activeConnections: metrics.activeConnections,
          successRate: metrics.successfulHandshakes / 
            (metrics.successfulHandshakes + metrics.failedHandshakes) * 100,
          averageHandshakeTime: metrics.averageHandshakeTime
        });
      }
    }, 5 * 60 * 1000);
  }
}

/**
 * Default TLS monitoring configuration
 */
export const defaultTLSMonitoringConfig: TLSMonitoringConfig = {
  enableMetrics: process.env.TLS_MONITORING_ENABLED !== 'false',
  enableAlerts: process.env.TLS_ALERTS_ENABLED !== 'false',
  alertThresholds: {
    handshakeFailureRate: parseFloat(process.env.TLS_HANDSHAKE_FAILURE_THRESHOLD || '10'),
    weakCipherUsage: parseFloat(process.env.TLS_WEAK_CIPHER_THRESHOLD || '5'),
    oldProtocolUsage: parseFloat(process.env.TLS_OLD_PROTOCOL_THRESHOLD || '1'),
    certificateExpirationDays: parseInt(process.env.TLS_CERT_EXPIRATION_DAYS || '30')
  },
  metricsRetentionHours: parseInt(process.env.TLS_METRICS_RETENTION_HOURS || '168'), // 1 week
  alertRetentionHours: parseInt(process.env.TLS_ALERTS_RETENTION_HOURS || '720') // 30 days
};

/**
 * Global TLS monitor instance
 */
let globalTLSMonitor: TLSMonitor | undefined;

/**
 * Get or create the global TLS monitor
 */
export function getTLSMonitor(config?: Partial<TLSMonitoringConfig>): TLSMonitor {
  if (!globalTLSMonitor) {
    const finalConfig = { ...defaultTLSMonitoringConfig, ...config };
    globalTLSMonitor = new TLSMonitor(finalConfig);
  }
  return globalTLSMonitor;
}

/**
 * Create TLS monitoring middleware for Express
 */
export function createTLSMonitoringMiddleware(monitor: TLSMonitor) {
  return (req: any, res: any, next: any) => {
    // Only monitor HTTPS connections
    if (!req.secure || !req.connection.encrypted) {
      return next();
    }

    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Record connection start
    monitor.recordConnectionStart(clientIP);

    // Set up connection end tracking
    res.on('finish', () => {
      const endTime = Date.now();
      const handshakeTime = endTime - startTime;
      
      // Get TLS details
      const tlsSocket = req.connection;
      const protocol = tlsSocket.getProtocol() || 'unknown';
      const cipher = tlsSocket.getCipher();
      const cert = tlsSocket.getPeerCertificate();
      
      // Record handshake event
      const handshakeEvent: TLSHandshakeEvent = {
        clientIP,
        protocol,
        cipher: cipher?.name || cipher || 'unknown',
        success: true,
        handshakeTime,
        certificateValid: !!(cert && cert.valid_to),
        sessionResumed: !!tlsSocket.isSessionReused(),
        timestamp: new Date()
      };

      monitor.recordHandshake(handshakeEvent);
      monitor.recordConnectionEnd(clientIP);
    });

    // Handle connection errors
    req.connection.on('error', (error: Error) => {
      const handshakeEvent: TLSHandshakeEvent = {
        clientIP,
        protocol: 'unknown',
        cipher: 'unknown',
        success: false,
        error: error.message,
        handshakeTime: Date.now() - startTime,
        certificateValid: false,
        sessionResumed: false,
        timestamp: new Date()
      };

      monitor.recordHandshake(handshakeEvent);
      monitor.recordConnectionEnd(clientIP);
    });

    next();
  };
}

export default {
  TLSMonitor,
  getTLSMonitor,
  createTLSMonitoringMiddleware,
  defaultTLSMonitoringConfig
};

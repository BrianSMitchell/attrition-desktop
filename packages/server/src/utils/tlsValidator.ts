import https from 'https';
import tls from 'tls';
import { Request, Response } from 'express';

/**
 * TLS Security Validation and Monitoring Utilities
 * 
 * Provides comprehensive validation and monitoring of TLS configurations
 * to ensure security standards are met and detect potential issues.
 * 
 * Features:
 * - TLS configuration validation
 * - Handshake monitoring and analysis
 * - Cipher suite strength assessment
 * - Certificate validation monitoring
 * - Performance impact tracking
 */

export interface TLSValidationResult {
  isSecure: boolean;
  score: number; // Security score out of 100
  issues: TLSSecurityIssue[];
  recommendations: string[];
  tlsVersion?: string;
  cipherSuite?: string;
  keyExchange?: string;
  forwardSecrecy: boolean;
}

export interface TLSSecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'version' | 'cipher' | 'certificate' | 'configuration' | 'performance';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
}

export interface TLSHandshakeInfo {
  timestamp: string;
  clientIP: string;
  tlsVersion: string;
  cipherSuite: string;
  keyExchange: string;
  serverName?: string;
  handshakeDuration: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Validate TLS configuration security
 * @param tlsVersion TLS version used
 * @param cipherSuite Cipher suite negotiated
 * @param keyExchange Key exchange method
 * @returns Validation result with security assessment
 */
export function validateTLSConfiguration(
  tlsVersion?: string,
  cipherSuite?: string,
  keyExchange?: string
): TLSValidationResult {
  const issues: TLSSecurityIssue[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Validate TLS version
  if (!tlsVersion) {
    issues.push({
      severity: 'medium',
      category: 'version',
      title: 'Unknown TLS Version',
      description: 'TLS version could not be determined',
      impact: 'Cannot assess TLS version security',
      recommendation: 'Ensure TLS version information is available for monitoring'
    });
    score -= 10;
  } else if (tlsVersion.startsWith('TLSv1.3')) {
    // TLS 1.3 - Excellent
    score += 0; // Already at maximum
  } else if (tlsVersion.startsWith('TLSv1.2')) {
    // TLS 1.2 - Good
    score -= 5;
  } else if (tlsVersion.startsWith('TLSv1.1')) {
    // TLS 1.1 - Deprecated
    issues.push({
      severity: 'high',
      category: 'version',
      title: 'Deprecated TLS Version',
      description: 'TLS 1.1 is deprecated and should not be used',
      impact: 'Vulnerable to known attacks and lacks modern security features',
      recommendation: 'Upgrade to TLS 1.2 or 1.3 immediately'
    });
    score -= 30;
  } else if (tlsVersion.startsWith('TLSv1.0') || tlsVersion.startsWith('SSLv')) {
    // TLS 1.0 or SSL - Critical
    issues.push({
      severity: 'critical',
      category: 'version',
      title: 'Insecure TLS/SSL Version',
      description: `${tlsVersion} is insecure and must not be used`,
      impact: 'Highly vulnerable to attacks, no longer considered secure',
      recommendation: 'Immediately upgrade to TLS 1.2 or 1.3'
    });
    score -= 50;
  }

  // Validate cipher suite
  if (!cipherSuite) {
    issues.push({
      severity: 'medium',
      category: 'cipher',
      title: 'Unknown Cipher Suite',
      description: 'Cipher suite could not be determined',
      impact: 'Cannot assess cipher strength and security',
      recommendation: 'Ensure cipher suite information is available for monitoring'
    });
    score -= 10;
  } else {
    // Analyze cipher suite components
    const cipherAnalysis = analyzeCipherSuite(cipherSuite);
    issues.push(...cipherAnalysis.issues);
    score += cipherAnalysis.scoreAdjustment;
    recommendations.push(...cipherAnalysis.recommendations);
  }

  // Check for forward secrecy
  const hasForwardSecrecy = checkForwardSecrecy(cipherSuite, keyExchange);
  if (!hasForwardSecrecy) {
    issues.push({
      severity: 'high',
      category: 'cipher',
      title: 'No Forward Secrecy',
      description: 'Connection does not provide forward secrecy',
      impact: 'Past communications could be decrypted if private key is compromised',
      recommendation: 'Use ECDHE or DHE key exchange methods'
    });
    score -= 25;
  }

  // Generate overall recommendations
  if (score < 70) {
    recommendations.push('TLS configuration requires immediate attention');
  } else if (score < 90) {
    recommendations.push('TLS configuration should be improved for better security');
  }

  return {
    isSecure: score >= 70,
    score: Math.max(0, score),
    issues,
    recommendations,
    tlsVersion,
    cipherSuite,
    keyExchange,
    forwardSecrecy: hasForwardSecrecy
  };
}

/**
 * Analyze cipher suite security
 */
function analyzeCipherSuite(cipherSuite: string) {
  const issues: TLSSecurityIssue[] = [];
  const recommendations: string[] = [];
  let scoreAdjustment = 0;

  const cipher = cipherSuite.toUpperCase();

  // Check for weak encryption algorithms
  if (cipher.includes('RC4')) {
    issues.push({
      severity: 'critical',
      category: 'cipher',
      title: 'Weak Cipher Algorithm',
      description: 'RC4 cipher is cryptographically broken',
      impact: 'Communications can be decrypted by attackers',
      recommendation: 'Remove RC4 from cipher suite configuration'
    });
    scoreAdjustment -= 40;
  }

  if (cipher.includes('DES') || cipher.includes('3DES')) {
    issues.push({
      severity: 'high',
      category: 'cipher',
      title: 'Weak Encryption',
      description: 'DES/3DES provides insufficient encryption strength',
      impact: 'Vulnerable to brute force attacks',
      recommendation: 'Use AES encryption instead'
    });
    scoreAdjustment -= 30;
  }

  if (cipher.includes('MD5')) {
    issues.push({
      severity: 'critical',
      category: 'cipher',
      title: 'Weak Hash Algorithm',
      description: 'MD5 hash is cryptographically broken',
      impact: 'Vulnerable to collision attacks',
      recommendation: 'Use SHA-256 or SHA-384 instead'
    });
    scoreAdjustment -= 35;
  }

  if (cipher.includes('SHA1') || cipher.includes('SHA-1')) {
    issues.push({
      severity: 'high',
      category: 'cipher',
      title: 'Deprecated Hash Algorithm',
      description: 'SHA-1 is deprecated due to collision vulnerabilities',
      impact: 'May be vulnerable to collision attacks',
      recommendation: 'Upgrade to SHA-256 or SHA-384'
    });
    scoreAdjustment -= 20;
  }

  // Check for AEAD ciphers (preferred)
  if (cipher.includes('GCM') || cipher.includes('CHACHA20-POLY1305')) {
    scoreAdjustment += 5;
  } else if (cipher.includes('CBC')) {
    issues.push({
      severity: 'low',
      category: 'cipher',
      title: 'Non-AEAD Cipher Mode',
      description: 'CBC mode is less secure than AEAD modes',
      impact: 'Potentially vulnerable to padding oracle attacks',
      recommendation: 'Prefer GCM or ChaCha20-Poly1305 cipher modes'
    });
    scoreAdjustment -= 5;
  }

  // Check key sizes
  if (cipher.includes('128')) {
    // 128-bit is acceptable but not ideal
    scoreAdjustment -= 2;
  } else if (cipher.includes('256')) {
    // 256-bit is preferred
    scoreAdjustment += 3;
  }

  return { issues, recommendations, scoreAdjustment };
}

/**
 * Check if cipher suite provides forward secrecy
 */
function checkForwardSecrecy(cipherSuite?: string, keyExchange?: string): boolean {
  if (!cipherSuite) return false;
  
  const cipher = cipherSuite.toUpperCase();
  const kx = keyExchange?.toUpperCase() || '';
  
  // Check for forward secrecy indicators
  return cipher.includes('ECDHE') || cipher.includes('DHE') || 
         kx.includes('ECDHE') || kx.includes('DHE');
}

/**
 * Monitor TLS handshake and collect security information
 */
export class TLSHandshakeMonitor {
  private handshakeLog: TLSHandshakeInfo[] = [];
  private maxLogSize = 1000;

  /**
   * Log a TLS handshake event
   */
  logHandshake(info: TLSHandshakeInfo) {
    this.handshakeLog.push(info);
    
    // Keep log size manageable
    if (this.handshakeLog.length > this.maxLogSize) {
      this.handshakeLog = this.handshakeLog.slice(-this.maxLogSize);
    }

    // Log security issues
    if (info.success) {
      const validation = validateTLSConfiguration(info.tlsVersion, info.cipherSuite, info.keyExchange);
      if (!validation.isSecure) {
        console.warn(`🔒 TLS Security Issue: Client ${info.clientIP} used insecure configuration`, {
          tlsVersion: info.tlsVersion,
          cipherSuite: info.cipherSuite,
          score: validation.score,
          issues: validation.issues.length
        });
      }
    } else {
      console.error(`🔒 TLS Handshake Failed: Client ${info.clientIP}`, {
        error: info.errorCode,
        message: info.errorMessage
      });
    }
  }

  /**
   * Get recent handshake statistics
   */
  getStatistics(lastMinutes: number = 60) {
    const cutoff = Date.now() - (lastMinutes * 60 * 1000);
    const recentHandshakes = this.handshakeLog.filter(h => 
      new Date(h.timestamp).getTime() > cutoff
    );

    const total = recentHandshakes.length;
    const successful = recentHandshakes.filter(h => h.success).length;
    const failed = total - successful;

    // TLS version distribution
    const tlsVersions: Record<string, number> = {};
    recentHandshakes.forEach(h => {
      if (h.tlsVersion) {
        tlsVersions[h.tlsVersion] = (tlsVersions[h.tlsVersion] || 0) + 1;
      }
    });

    // Average handshake duration
    const avgDuration = total > 0 
      ? recentHandshakes.reduce((sum, h) => sum + h.handshakeDuration, 0) / total 
      : 0;

    return {
      period: `${lastMinutes} minutes`,
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageHandshakeDuration: avgDuration,
      tlsVersions
    };
  }

  /**
   * Get security assessment for recent connections
   */
  getSecurityAssessment(lastMinutes: number = 60) {
    const cutoff = Date.now() - (lastMinutes * 60 * 1000);
    const recentHandshakes = this.handshakeLog.filter(h => 
      new Date(h.timestamp).getTime() > cutoff && h.success
    );

    if (recentHandshakes.length === 0) {
      return { message: 'No recent successful handshakes to analyze' };
    }

    let totalScore = 0;
    let secureConnections = 0;
    const issueCategories: Record<string, number> = {};

    recentHandshakes.forEach(handshake => {
      const validation = validateTLSConfiguration(
        handshake.tlsVersion, 
        handshake.cipherSuite, 
        handshake.keyExchange
      );
      
      totalScore += validation.score;
      if (validation.isSecure) secureConnections++;
      
      validation.issues.forEach(issue => {
        issueCategories[issue.severity] = (issueCategories[issue.severity] || 0) + 1;
      });
    });

    const avgScore = totalScore / recentHandshakes.length;
    const securePercentage = (secureConnections / recentHandshakes.length) * 100;

    return {
      period: `${lastMinutes} minutes`,
      totalConnections: recentHandshakes.length,
      averageSecurityScore: Math.round(avgScore),
      secureConnections,
      securePercentage: Math.round(securePercentage),
      issueCategories
    };
  }
}

// Global handshake monitor instance
export const tlsMonitor = new TLSHandshakeMonitor();

/**
 * Express middleware to monitor TLS connections
 */
export function tlsMonitoringMiddleware(req: Request, res: Response, next: Function) {
  // Only monitor HTTPS connections
  if (!req.secure && req.get('X-Forwarded-Proto') !== 'https') {
    return next();
  }

  const startTime = Date.now();
  const socket = (req as any).socket || (req as any).connection;
  
  if (socket && socket.encrypted) {
    const tlsSocket = socket as tls.TLSSocket;
    
    const handshakeInfo: TLSHandshakeInfo = {
      timestamp: new Date().toISOString(),
      clientIP: req.ip || req.connection.remoteAddress || 'unknown',
      tlsVersion: tlsSocket.getProtocol() || 'unknown',
      cipherSuite: tlsSocket.getCipher()?.name || 'unknown',
      keyExchange: tlsSocket.getCipher()?.version || 'unknown',
      serverName: (tlsSocket as any).servername,
      handshakeDuration: Date.now() - startTime,
      success: true
    };

    tlsMonitor.logHandshake(handshakeInfo);
  }

  next();
}

/**
 * Express route handler for TLS security status
 */
export function tlsSecurityStatusHandler(req: Request, res: Response) {
  try {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const stats = tlsMonitor.getStatistics(minutes);
    const assessment = tlsMonitor.getSecurityAssessment(minutes);

    res.json({
      success: true,
      data: {
        statistics: stats,
        securityAssessment: assessment,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ TLS security status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get TLS security status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default {
  validateTLSConfiguration,
  TLSHandshakeMonitor,
  tlsMonitor,
  tlsMonitoringMiddleware,
  tlsSecurityStatusHandler
};

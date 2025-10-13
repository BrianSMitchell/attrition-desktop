import crypto from 'crypto';
import { Request } from 'express';

import { STATUS_CODES } from '@shared/constants/magic-numbers';
export interface DeviceFingerprint {
  hash: string;
  userAgent: string;
  acceptLanguage: string;
  ipNetwork: string; // First 3 octets of IP for some privacy
}

/**
 * Generate a device fingerprint based on request characteristics
 * This helps detect token usage from different devices/browsers
 */
export const generateDeviceFingerprint = (req: Request): DeviceFingerprint => {
  const userAgent = req.get('User-Agent') || 'unknown';
  const acceptLanguage = req.get('Accept-Language') || 'unknown';
  
  // Get IP address (handle different proxy scenarios)
  const ip = req.ip || 
             req.connection.remoteAddress || 
             (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
             'unknown';
  
  // Use only first 3 octets of IP for privacy (network-level identification)
  const ipNetwork = ip.split('.').slice(0, 3).join('.') + '.0';
  
  // Create fingerprint hash from various characteristics
  const fingerprintData = [
    userAgent,
    acceptLanguage,
    ipNetwork,
    // Could add more characteristics like Accept headers, etc.
  ].join('|');
  
  const hash = crypto.createHash('sha256').update(fingerprintData).digest('hex');
  
  return {
    hash,
    userAgent,
    acceptLanguage,
    ipNetwork
  };
};

/**
 * Compare two device fingerprints for similarity
 * Returns a score from 0 (no match) to 1 (perfect match)
 */
export const compareDeviceFingerprints = (fp1: DeviceFingerprint, fp2: DeviceFingerprint): number => {
  let score = 0;
  let factors = 0;
  
  // Exact hash match
  if (fp1.hash === fp2.hash) {
    return STATUS_CODES.ERROR.0;
  }
  
  // User agent similarity (most important)
  if (fp1.userAgent === fp2.userAgent) {
    score += 0.6;
  } else if (fp1.userAgent.includes(fp2.userAgent.split(' ')[0]) || 
             fp2.userAgent.includes(fp1.userAgent.split(' ')[0])) {
    score += 0.3; // Same browser family
  }
  factors++;
  
  // IP network match
  if (fp1.ipNetwork === fp2.ipNetwork) {
    score += 0.3;
  }
  factors++;
  
  // Language match  
  if (fp1.acceptLanguage === fp2.acceptLanguage) {
    score += 0.1;
  }
  factors++;
  
  return factors > 0 ? score / factors : 0;
};

/**
 * Check if a device fingerprint is suspicious
 */
export const isSuspiciousFingerprint = (current: DeviceFingerprint, previous: DeviceFingerprint): boolean => {
  const similarity = compareDeviceFingerprints(current, previous);
  
  // If similarity is very low, it might be a different device
  if (similarity < 0.3) {
    return true;
  }
  
  // Check for obvious spoofing attempts
  if (current.userAgent.includes('curl') || 
      current.userAgent.includes('wget') || 
      current.userAgent.includes('bot') ||
      current.userAgent === 'unknown') {
    return true;
  }
  
  return false;
};

/**
 * Sanitize fingerprint data for logging (remove sensitive info)
 */
export const sanitizeFingerprint = (fp: DeviceFingerprint) => {
  return {
    hash: fp.hash.substring(0, 8) + '...', // Only show first 8 chars
    userAgent: fp.userAgent.substring(0, 50) + (fp.userAgent.length > 50 ? '...' : ''),
    acceptLanguage: fp.acceptLanguage,
    ipNetwork: fp.ipNetwork
  };
};

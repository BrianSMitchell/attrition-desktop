import crypto from 'crypto';
import { Request } from 'express';

export interface DeviceFingerprint {
  hash: string;
  userAgent: string;
  acceptLanguage: string;
  ipNetwork: string;
  browserFamily?: string; // NEW: Extract browser family for better matching
  platform?: string;      // NEW: Extract platform info
}

/**
 * Enhanced device fingerprint generation with better browser detection
 */
export const generateDeviceFingerprint = (req: Request): DeviceFingerprint => {
  const userAgent = req.get('User-Agent') || 'unknown';
  const acceptLanguage = req.get('Accept-Language') || 'unknown';
  
  // Get IP address (handle different proxy scenarios)
  const ip = req.ip || 
             req.connection.remoteAddress || 
             (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
             'unknown';
  
  // Use only first 3 octets of IP for privacy
  const ipNetwork = ip.split('.').slice(0, 3).join('.') + '.0';
  
  // Extract browser family (Chrome, Firefox, Safari, etc.) - more robust
  const browserFamily = extractBrowserFamily(userAgent);
  const platform = extractPlatform(userAgent);
  
  // Create fingerprint hash from various characteristics
  const fingerprintData = [
    browserFamily, // Use browser family instead of full UA for more stability
    acceptLanguage,
    ipNetwork,
    platform
  ].join('|');
  
  const hash = crypto.createHash('sha256').update(fingerprintData).digest('hex');
  
  return {
    hash,
    userAgent,
    acceptLanguage,
    ipNetwork,
    browserFamily,
    platform
  };
};

/**
 * Extract browser family from user agent string
 */
function extractBrowserFamily(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  // Handle test/automation tools
  if (ua.includes('node') || ua.includes('postman') || ua.includes('insomnia')) {
    return 'automation';
  }
  
  // Real browsers
  if (ua.includes('chrome') && !ua.includes('edg')) return 'chrome';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('edg')) return 'edge';
  if (ua.includes('opera') || ua.includes('opr')) return 'opera';
  
  return 'unknown';
}

/**
 * Extract platform information from user agent
 */
function extractPlatform(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  
  return 'unknown';
}

/**
 * Enhanced fingerprint comparison with smarter browser transition handling
 */
export const compareDeviceFingerprints = (fp1: DeviceFingerprint, fp2: DeviceFingerprint): number => {
  // Exact hash match
  if (fp1.hash === fp2.hash) {
    return 1.0;
  }
  
  let score = 0;
  let totalWeight = 0;
  
  // Browser family match (high weight) - allows version updates
  const browserWeight = 0.5;
  if (fp1.browserFamily === fp2.browserFamily) {
    // Same browser family gets high score
    score += browserWeight;
  } else if (isValidBrowserTransition(fp1.browserFamily, fp2.browserFamily)) {
    // Valid transitions (like automation -> real browser) get partial score
    score += browserWeight * 0.6;
  }
  totalWeight += browserWeight;
  
  // Platform match (high weight)
  const platformWeight = 0.3;
  if (fp1.platform === fp2.platform) {
    score += platformWeight;
  }
  totalWeight += platformWeight;
  
  // IP network match (medium weight)
  const ipWeight = 0.15;
  if (fp1.ipNetwork === fp2.ipNetwork) {
    score += ipWeight;
  }
  totalWeight += ipWeight;
  
  // Language match (low weight)
  const langWeight = 0.05;
  if (fp1.acceptLanguage === fp2.acceptLanguage) {
    score += langWeight;
  }
  totalWeight += langWeight;
  
  return score / totalWeight;
};

/**
 * Check if browser transition is valid (e.g., from automation to real browser)
 */
function isValidBrowserTransition(from?: string, to?: string): boolean {
  if (!from || !to) return false;
  
  // Allow transitions from automation tools to real browsers
  if (from === 'automation' && ['chrome', 'firefox', 'safari', 'edge'].includes(to)) {
    return true;
  }
  
  // Allow transitions between modern browsers (user switching browsers)
  const modernBrowsers = ['chrome', 'firefox', 'safari', 'edge'];
  return modernBrowsers.includes(from) && modernBrowsers.includes(to);
}

/**
 * Enhanced suspicious fingerprint detection
 */
export const isSuspiciousFingerprint = (current: DeviceFingerprint, previous: DeviceFingerprint): boolean => {
  const similarity = compareDeviceFingerprints(current, previous);
  
  // If similarity is very low after enhanced comparison, it might be suspicious
  if (similarity < 0.2) {
    return true;
  }
  
  // Check for obvious spoofing attempts
  const ua = current.userAgent.toLowerCase();
  if (ua.includes('curl') || 
      ua.includes('wget') || 
      ua.includes('bot') ||
      ua === 'unknown') {
    return true;
  }
  
  // Check for impossible platform transitions
  if (previous.platform && current.platform && 
      previous.platform !== 'unknown' && current.platform !== 'unknown' &&
      previous.platform !== current.platform) {
    // Platform changes are suspicious unless explained by valid scenarios
    return !isValidPlatformTransition(previous.platform, current.platform);
  }
  
  return false;
};

/**
 * Check if platform transition is valid
 */
function isValidPlatformTransition(from: string, to: string): boolean {
  // Same platform is always valid
  if (from === to) return true;
  
  // Mobile to desktop or vice versa might be valid for same user
  const mobilePlatforms = ['android', 'ios'];
  const desktopPlatforms = ['windows', 'macos', 'linux'];
  
  return (mobilePlatforms.includes(from) && desktopPlatforms.includes(to)) ||
         (desktopPlatforms.includes(from) && mobilePlatforms.includes(to));
}

/**
 * Enhanced fingerprint sanitization for logging
 */
export const sanitizeFingerprint = (fp: DeviceFingerprint) => {
  return {
    hash: fp.hash.substring(0, 8) + '...',
    userAgent: fp.userAgent.substring(0, 50) + (fp.userAgent.length > 50 ? '...' : ''),
    acceptLanguage: fp.acceptLanguage,
    ipNetwork: fp.ipNetwork,
    browserFamily: fp.browserFamily,
    platform: fp.platform
  };
};
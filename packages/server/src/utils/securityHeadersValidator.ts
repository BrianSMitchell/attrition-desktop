import { Request, Response } from 'express';
import { ENV_VARS } from '@game/shared';
import { ENV_VALUES } from '@game/shared';


/**
 * Security Headers Validation Utility
 * 
 * Provides functions to validate that all required security headers are properly set
 * and meet OWASP security standards. Used for testing and monitoring.
 */

export interface SecurityHeadersReport {
  /** Overall security score (0-100) */
  score: number;
  /** Whether all critical headers are present */
  isCompliant: boolean;
  /** List of missing headers */
  missingHeaders: string[];
  /** List of misconfigured headers */
  misconfiguredHeaders: Array<{
    header: string;
    issue: string;
    recommendation: string;
  }>;
  /** List of properly configured headers */
  compliantHeaders: string[];
  /** Additional security recommendations */
  recommendations: string[];
}

export interface HeaderValidationRule {
  /** Header name */
  name: string;
  /** Whether this header is required */
  required: boolean;
  /** Function to validate header value */
  validator: (value: string | undefined) => {
    isValid: boolean;
    issue?: string;
    recommendation?: string;
  };
  /** Security importance weight (1-10) */
  weight: number;
}

/**
 * OWASP-compliant security header validation rules
 */
export const SECURITY_HEADER_RULES: HeaderValidationRule[] = [
  {
    name: 'Strict-Transport-Security',
    required: true,
    weight: 10,
    validator: (value) => {
      if (!value) {
        return {
          isValid: false,
          issue: 'Missing HSTS header',
          recommendation: 'Add HSTS header with max-age=31536000; includeSubDomains; preload'
        };
      }
      
      const hasMaxAge = /max-age=(\d+)/.exec(value);
      const maxAge = hasMaxAge ? parseInt(hasMaxAge[1]) : 0;
      
      if (maxAge < 31536000) { // 1 year minimum
        return {
          isValid: false,
          issue: `HSTS max-age too short: ${maxAge} seconds`,
          recommendation: 'Use max-age=31536000 (1 year) or longer'
        };
      }
      
      if (!value.includes('includeSubDomains')) {
        return {
          isValid: false,
          issue: 'HSTS missing includeSubDomains',
          recommendation: 'Add includeSubDomains directive to HSTS header'
        };
      }
      
      return { isValid: true };
    }
  },
  {
    name: 'Content-Security-Policy',
    required: true,
    weight: 9,
    validator: (value) => {
      if (!value) {
        return {
          isValid: false,
          issue: 'Missing CSP header',
          recommendation: 'Implement Content Security Policy to prevent XSS attacks'
        };
      }
      
      if (value.includes("'unsafe-eval'")) {
        return {
          isValid: false,
          issue: 'CSP allows unsafe-eval',
          recommendation: 'Remove unsafe-eval from CSP directives'
        };
      }
      
      if (!value.includes("default-src") && !value.includes("script-src")) {
        return {
          isValid: false,
          issue: 'CSP missing core directives',
          recommendation: 'Add default-src or script-src directive to CSP'
        };
      }
      
      return { isValid: true };
    }
  },
  {
    name: 'X-Frame-Options',
    required: true,
    weight: 8,
    validator: (value) => {
      if (!value) {
        return {
          isValid: false,
          issue: 'Missing X-Frame-Options header',
          recommendation: 'Add X-Frame-Options: DENY or SAMEORIGIN to prevent clickjacking'
        };
      }
      
      const validValues = ['DENY', 'SAMEORIGIN'];
      if (!validValues.includes(value.toUpperCase())) {
        return {
          isValid: false,
          issue: `Invalid X-Frame-Options value: ${value}`,
          recommendation: 'Use DENY or SAMEORIGIN for X-Frame-Options'
        };
      }
      
      return { isValid: true };
    }
  },
  {
    name: 'X-Content-Type-Options',
    required: true,
    weight: 7,
    validator: (value) => {
      if (!value) {
        return {
          isValid: false,
          issue: 'Missing X-Content-Type-Options header',
          recommendation: 'Add X-Content-Type-Options: nosniff to prevent MIME sniffing'
        };
      }
      
      if (value.toLowerCase() !== 'nosniff') {
        return {
          isValid: false,
          issue: `Invalid X-Content-Type-Options value: ${value}`,
          recommendation: 'Use "nosniff" for X-Content-Type-Options'
        };
      }
      
      return { isValid: true };
    }
  },
  {
    name: 'Referrer-Policy',
    required: true,
    weight: 6,
    validator: (value) => {
      if (!value) {
        return {
          isValid: false,
          issue: 'Missing Referrer-Policy header',
          recommendation: 'Add Referrer-Policy: strict-origin-when-cross-origin'
        };
      }
      
      const secureValues = [
        'no-referrer',
        'same-origin',
        'strict-origin',
        'strict-origin-when-cross-origin'
      ];
      
      if (!secureValues.includes(value.toLowerCase())) {
        return {
          isValid: false,
          issue: `Insecure Referrer-Policy value: ${value}`,
          recommendation: 'Use a privacy-preserving referrer policy'
        };
      }
      
      return { isValid: true };
    }
  },
  {
    name: 'X-XSS-Protection',
    required: false, // Optional for legacy browsers
    weight: 4,
    validator: (value) => {
      if (!value) {
        return { isValid: true }; // Optional header
      }
      
      const validValues = ['0', '1', '1; mode=block'];
      if (!validValues.includes(value)) {
        return {
          isValid: false,
          issue: `Invalid X-XSS-Protection value: ${value}`,
          recommendation: 'Use "1; mode=block" for X-XSS-Protection'
        };
      }
      
      return { isValid: true };
    }
  },
  {
    name: 'Permissions-Policy',
    required: false, // Optional but recommended
    weight: 5,
    validator: (value) => {
      if (!value) {
        return {
          isValid: true, // Optional
          recommendation: 'Consider adding Permissions-Policy to restrict browser features'
        };
      }
      
      // Basic validation - check for dangerous permissions
      const dangerousPermissions = ['camera', 'microphone', 'geolocation'];
      const allowsAll = dangerousPermissions.some(perm => 
        value.includes(`${perm}=*`) || value.includes(`${perm}=(*)`)
      );
      
      if (allowsAll) {
        return {
          isValid: false,
          issue: 'Permissions-Policy allows dangerous features to all origins',
          recommendation: 'Restrict camera, microphone, and geolocation permissions'
        };
      }
      
      return { isValid: true };
    }
  }
];

/**
 * Validate security headers on a response object
 * @param headers Response headers object or Response object
 * @returns Security validation report
 */
export function validateSecurityHeaders(headers: Record<string, string> | Response): SecurityHeadersReport {
  // Extract headers from Response object if needed
  const headerObj = 'getHeaders' in headers ? 
    (typeof headers.getHeaders === 'function' ? headers.getHeaders() : {}) : headers;
  
  // Convert header names to lowercase for case-insensitive comparison
  const normalizedHeaders: Record<string, string> = {};
  Object.keys(headerObj).forEach(key => {
    normalizedHeaders[key.toLowerCase()] = String(headerObj[key]);
  });
  
  const report: SecurityHeadersReport = {
    score: 0,
    isCompliant: true,
    missingHeaders: [],
    misconfiguredHeaders: [],
    compliantHeaders: [],
    recommendations: []
  };
  
  let totalWeight = 0;
  let achievedWeight = 0;
  
  // Validate each security header rule
  for (const rule of SECURITY_HEADER_RULES) {
    const headerName = rule.name.toLowerCase();
    const headerValue = normalizedHeaders[headerName];
    const validation = rule.validator(headerValue);
    
    totalWeight += rule.weight;
    
    if (validation.isValid) {
      achievedWeight += rule.weight;
      if (headerValue) {
        report.compliantHeaders.push(rule.name);
      }
    } else {
      if (rule.required && !headerValue) {
        report.missingHeaders.push(rule.name);
        report.isCompliant = false;
      } else if (headerValue) {
        report.misconfiguredHeaders.push({
          header: rule.name,
          issue: validation.issue || 'Configuration issue',
          recommendation: validation.recommendation || 'Review header configuration'
        });
        report.isCompliant = false;
      }
    }
    
    // Add recommendations
    if (validation.recommendation && validation.isValid) {
      report.recommendations.push(validation.recommendation);
    }
  }
  
  // Calculate security score (0-100)
  report.score = Math.round((achievedWeight / totalWeight) * 100);
  
  return report;
}

/**
 * Express middleware to validate and log security headers
 * Use this in development/testing to monitor header compliance
 */
export function securityHeadersValidationMiddleware(req: Request, res: Response, next: Function) {
  // Only validate in non-production environments to avoid overhead
  if (process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION) {
    return next();
  }
  
  // Intercept response end to validate headers
  const originalEnd = res.end.bind(res);
  res.end = function(...args: any[]) {
    const report = validateSecurityHeaders(res);
    
    // Log security compliance
    if (!report.isCompliant || report.score < 90) {
      console.warn('?? Security Headers Validation:', {
        url: req.originalUrl,
        score: report.score,
        missingHeaders: report.missingHeaders,
        misconfiguredHeaders: report.misconfiguredHeaders.map(h => h.header)
      });
    }
    
    return originalEnd(...args);
  };
  
  next();
}

/**
 * Generate a security headers report for monitoring/testing
 * @param headers Response headers
 * @returns Formatted report string
 */
export function generateSecurityReport(headers: Record<string, string>): string {
  const report = validateSecurityHeaders(headers);
  
  let output = `\n?? SECURITY HEADERS REPORT\n`;
  output += `Score: ${report.score}/100 ${report.isCompliant ? '?' : '?'}\n`;
  output += `Status: ${report.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}\n\n`;
  
  if (report.compliantHeaders.length > 0) {
    output += `? Compliant Headers (${report.compliantHeaders.length}):\n`;
    report.compliantHeaders.forEach(header => {
      output += `   • ${header}\n`;
    });
    output += `\n`;
  }
  
  if (report.missingHeaders.length > 0) {
    output += `? Missing Headers (${report.missingHeaders.length}):\n`;
    report.missingHeaders.forEach(header => {
      output += `   • ${header}\n`;
    });
    output += `\n`;
  }
  
  if (report.misconfiguredHeaders.length > 0) {
    output += `?? Misconfigured Headers (${report.misconfiguredHeaders.length}):\n`;
    report.misconfiguredHeaders.forEach(config => {
      output += `   • ${config.header}: ${config.issue}\n`;
      output += `     Recommendation: ${config.recommendation}\n`;
    });
    output += `\n`;
  }
  
  if (report.recommendations.length > 0) {
    output += `?? Recommendations:\n`;
    report.recommendations.forEach(rec => {
      output += `   • ${rec}\n`;
    });
  }
  
  return output;
}

export default {
  validateSecurityHeaders,
  securityHeadersValidationMiddleware,
  generateSecurityReport,
  SECURITY_HEADER_RULES
};

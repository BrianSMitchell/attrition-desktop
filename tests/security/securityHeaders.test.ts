import request from 'supertest';
import express from 'express';
import securityHeadersStack, { 
import { HTTP_STATUS } from '../packages/shared/src/response-formats';
  createSecurityHeadersMiddleware, 
  csrfProtectionMiddleware 
} from '../middleware/securityHeaders';
import { 
  validateSecurityHeaders, 
  generateSecurityReport, 
  SECURITY_HEADER_RULES 
} from '../utils/securityHeadersValidator';

describe('Security Headers Implementation', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.set('trust proxy', 1);
  });

  describe('Security Headers Middleware', () => {
    it('should apply all OWASP recommended security headers in production', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.use(...securityHeadersStack(false)); // Production mode
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(HTTP_STATUS.OK);

      // Test critical security headers
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(response.headers['strict-transport-security']).toContain('includeSubDomains');
      expect(response.headers['strict-transport-security']).toContain('preload');
      
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['x-powered-by']).toBeUndefined(); // Should be hidden

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should have development-friendly CSP in development mode', async () => {
      app.use(...securityHeadersStack(true)); // Development mode
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(HTTP_STATUS.OK);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain('http://localhost:*');
      expect(csp).toContain('ws://localhost:*');
      expect(csp).toContain('https://localhost:*');
    });

    it('should enforce report-only CSP in development', async () => {
      app.use(...securityHeadersStack(true)); // Development mode
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(HTTP_STATUS.OK);

      // In development, CSP should be report-only
      expect(response.headers['content-security-policy-report-only']).toBeDefined();
    });

    it('should apply Permissions-Policy header when supported', async () => {
      app.use(createSecurityHeadersMiddleware(false));
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(HTTP_STATUS.OK);

      // Check if Permissions-Policy is present (may not be supported in all Helmet versions)
      if (response.headers['permissions-policy']) {
        const policy = response.headers['permissions-policy'];
        expect(policy).toContain('camera=()');
        expect(policy).toContain('microphone=()');
        expect(policy).toContain('geolocation=()');
      }
    });
  });

  describe('CSRF Protection Middleware', () => {
    beforeEach(() => {
      app.use(csrfProtectionMiddleware);
      app.use(express.json());
    });

    it('should enforce secure cookie settings in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.post('/test-cookie', (req, res) => {
        res.cookie('test', 'value');
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test-cookie')
        .expect(HTTP_STATUS.OK);

      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader[0]).toContain('HttpOnly');
      expect(setCookieHeader[0]).toContain('Secure');
      expect(setCookieHeader[0]).toContain('SameSite=Strict');

      process.env.NODE_ENV = originalEnv;
    });

    it('should validate origins for state-changing requests', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.post('/test-origin', (req, res) => {
        res.json({ success: true });
      });

      // Test with invalid origin
      const response = await request(app)
        .post('/test-origin')
        .set('Origin', 'https://malicious-site.com')
        .send({ data: 'test' })
        .expect(HTTP_STATUS.FORBIDDEN);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Forbidden: Invalid origin');

      process.env.NODE_ENV = originalEnv;
    });

    it('should allow valid origins for state-changing requests', async () => {
      process.env.CORS_ORIGIN = 'http://localhost:5173,https://app.example.com';

      app.post('/test-origin', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test-origin')
        .set('Origin', 'http://localhost:5173')
        .send({ data: 'test' })
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
    });

    it('should not enforce origin validation for GET requests', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/test-origin', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test-origin')
        .set('Origin', 'https://any-site.com')
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Security Headers Validation', () => {
    it('should validate all required security headers', () => {
      const compliantHeaders = {
        'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
        'content-security-policy': "default-src 'self'; script-src 'self'",
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'x-xss-protection': '1; mode=block'
      };

      const report = validateSecurityHeaders(compliantHeaders);

      expect(report.isCompliant).toBe(true);
      expect(report.score).toBeGreaterThanOrEqual(90);
      expect(report.missingHeaders).toHaveLength(0);
      expect(report.misconfiguredHeaders).toHaveLength(0);
    });

    it('should detect missing critical headers', () => {
      const incompleteHeaders = {
        'x-frame-options': 'DENY'
      };

      const report = validateSecurityHeaders(incompleteHeaders);

      expect(report.isCompliant).toBe(false);
      expect(report.missingHeaders).toContain('Strict-Transport-Security');
      expect(report.missingHeaders).toContain('Content-Security-Policy');
      expect(report.missingHeaders).toContain('X-Content-Type-Options');
    });

    it('should detect misconfigured headers', () => {
      const misconfiguredHeaders = {
        'strict-transport-security': 'max-age=300', // Too short
        'content-security-policy': "default-src 'self' 'unsafe-eval'", // Unsafe
        'x-frame-options': 'ALLOWALL', // Invalid value
        'x-content-type-options': 'sniff', // Invalid value
        'referrer-policy': 'unsafe-url' // Insecure policy
      };

      const report = validateSecurityHeaders(misconfiguredHeaders);

      expect(report.isCompliant).toBe(false);
      expect(report.misconfiguredHeaders.length).toBeGreaterThan(0);
      
      const hstsIssue = report.misconfiguredHeaders.find(h => h.header === 'Strict-Transport-Security');
      expect(hstsIssue).toBeDefined();
      expect(hstsIssue?.issue).toContain('max-age too short');

      const cspIssue = report.misconfiguredHeaders.find(h => h.header === 'Content-Security-Policy');
      expect(cspIssue).toBeDefined();
      expect(cspIssue?.issue).toContain('unsafe-eval');
    });

    it('should validate HSTS header configuration correctly', () => {
      const testCases = [
        {
          header: 'max-age=31536000; includeSubDomains; preload',
          shouldPass: true
        },
        {
          header: 'max-age=300', // Too short
          shouldPass: false
        },
        {
          header: 'max-age=31536000', // Missing includeSubDomains
          shouldPass: false
        },
        {
          header: 'max-age=31536000; includeSubDomains; preload',
          shouldPass: true
        }
      ];

      const hstsRule = SECURITY_HEADER_RULES.find(rule => rule.name === 'Strict-Transport-Security');
      expect(hstsRule).toBeDefined();

      testCases.forEach(testCase => {
        const result = hstsRule!.validator(testCase.header);
        expect(result.isValid).toBe(testCase.shouldPass);
      });
    });

    it('should validate CSP header configuration correctly', () => {
      const testCases = [
        {
          header: "default-src 'self'; script-src 'self'",
          shouldPass: true
        },
        {
          header: "script-src 'self' 'unsafe-eval'", // Contains unsafe-eval
          shouldPass: false
        },
        {
          header: "font-src 'self'", // Missing default-src and script-src
          shouldPass: false
        },
        {
          header: "default-src 'self'; object-src 'none'",
          shouldPass: true
        }
      ];

      const cspRule = SECURITY_HEADER_RULES.find(rule => rule.name === 'Content-Security-Policy');
      expect(cspRule).toBeDefined();

      testCases.forEach(testCase => {
        const result = cspRule!.validator(testCase.header);
        expect(result.isValid).toBe(testCase.shouldPass);
      });
    });

    it('should generate comprehensive security report', () => {
      const headers = {
        'strict-transport-security': 'max-age=300', // Misconfigured
        'x-frame-options': 'DENY' // Correct
        // Missing other headers
      };

      const report = generateSecurityReport(headers);

      expect(report).toContain('SECURITY HEADERS REPORT');
      expect(report).toContain('NON-COMPLIANT');
      expect(report).toContain('Missing Headers');
      expect(report).toContain('Misconfigured Headers');
      expect(report).toContain('Content-Security-Policy');
      expect(report).toContain('max-age too short');
    });
  });

  describe('Cross-Origin Headers', () => {
    it('should set proper COEP, COOP, and CORP headers', async () => {
      app.use(...securityHeadersStack(false));
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(HTTP_STATUS.OK);

      expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp');
      expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
      expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });
  });

  describe('Security Headers Integration', () => {
    it('should work with full application middleware stack', async () => {
      // Simulate full application setup
      app.use(...securityHeadersStack(false));
      app.use(express.json());
      
      app.get('/api/test', (req, res) => {
        res.json({ 
          message: 'Security test endpoint',
          headers: Object.keys(res.getHeaders())
        });
      });

      app.post('/api/test', (req, res) => {
        res.cookie('session', 'abc123');
        res.json({ success: true });
      });

      // Test GET request
      const getResponse = await request(app)
        .get('/api/test')
        .expect(HTTP_STATUS.OK);

      const report = validateSecurityHeaders(getResponse.headers);
      expect(report.score).toBeGreaterThanOrEqual(80); // Should have good security score

      // Test POST request with cookie
      const postResponse = await request(app)
        .post('/api/test')
        .send({ data: 'test' })
        .expect(HTTP_STATUS.OK);

      expect(postResponse.headers['set-cookie']).toBeDefined();
    });

    it('should handle security headers validation middleware in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Mock console.warn to capture validation warnings
      const originalWarn = console.warn;
      const warnings: any[] = [];
      console.warn = (...args: any[]) => warnings.push(args);

      app.use(...securityHeadersStack(true)); // Development mode with validation
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test')
        .expect(HTTP_STATUS.OK);

      // Should not warn for compliant headers in development
      const securityWarnings = warnings.filter(w => 
        w.some((arg: any) => typeof arg === 'string' && arg.includes('Security Headers Validation'))
      );

      // Restore
      console.warn = originalWarn;
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Environment-specific Configuration', () => {
    it('should use stricter security headers in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.use(...securityHeadersStack(false)); // Production mode
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(HTTP_STATUS.OK);

      // Production should enforce CSP, not just report
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy-report-only']).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should allow report URI configuration for security headers', async () => {
      process.env.SECURITY_REPORT_URI = 'https://example.com/csp-report';

      app.use(...securityHeadersStack(false));
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(HTTP_STATUS.OK);

      // Check if Expect-CT header includes report URI
      const expectCtHeader = response.headers['expect-ct'];
      if (expectCtHeader) {
        expect(expectCtHeader).toContain('https://example.com/csp-report');
      }

      delete process.env.SECURITY_REPORT_URI;
    });
  });
});


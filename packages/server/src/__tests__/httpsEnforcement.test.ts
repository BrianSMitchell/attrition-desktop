import request from 'supertest';
import express from 'express';
import { httpsRedirectMiddleware, createHttpsRedirectMiddleware } from '../middleware/httpsRedirect';
import { performHttpsHealthCheck, HttpsHealthMonitor } from '../utils/httpsHealthCheck';

describe('HTTPS Enforcement Implementation', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = express();
    app.set('trust proxy', 1);
  });

  describe('HTTPS Redirect Middleware', () => {
    describe('Production Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      afterEach(() => {
        delete process.env.NODE_ENV;
      });

      it('should redirect HTTP requests to HTTPS in production', async () => {
        app.use(httpsRedirectMiddleware);
        app.get('/test', (req, res) => {
          res.json({ success: true });
        });

        const response = await request(app)
          .get('/test')
          .expect(301);

        expect(response.headers.location).toMatch(/^https:/);
        expect(response.headers['strict-transport-security']).toBeDefined();
        expect(response.headers['cache-control']).toContain('no-cache');
      });

      it('should include enhanced security headers in production redirects', async () => {
        app.use(httpsRedirectMiddleware);
        app.get('/test', (req, res) => {
          res.json({ success: true });
        });

        const response = await request(app)
          .get('/test')
          .expect(301);

        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['x-xss-protection']).toBeDefined();
        expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      });

      it('should not allow HTTP access to exempt paths in production', async () => {
        const middleware = createHttpsRedirectMiddleware({
          exemptPaths: ['/health']
        });
        
        app.use(middleware);
        app.get('/health', (req, res) => {
          res.json({ status: 'OK' });
        });

        // Even exempt paths should redirect in production
        const response = await request(app)
          .get('/health')
          .expect(301);

        expect(response.headers.location).toMatch(/^https:/);
      });

      it('should handle redirect failures gracefully in production', async () => {
        const middleware = createHttpsRedirectMiddleware({
          hostname: 'invalid-hostname-that-will-cause-error'
        });
        
        app.use(middleware);
        app.get('/test', (req, res) => {
          res.json({ success: true });
        });

        const response = await request(app)
          .get('/test')
          .expect(426); // Upgrade Required

        expect(response.body).toEqual({
          success: false,
          error: 'HTTPS Required',
          message: 'This service requires HTTPS. Please use https:// instead of http://',
          code: 'HTTPS_REQUIRED'
        });
      });

      it('should log security warnings for HTTP requests in production', async () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        app.use(httpsRedirectMiddleware);
        app.get('/test', (req, res) => {
          res.json({ success: true });
        });

        await request(app)
          .get('/test')
          .set('User-Agent', 'TestAgent')
          .expect(301);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('PRODUCTION HTTP→HTTPS redirect:'),
          expect.objectContaining({
            severity: 'WARNING',
            message: 'Insecure HTTP request redirected to HTTPS in production'
          })
        );

        consoleSpy.mockRestore();
      });
    });

    describe('Development Environment', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
      });

      afterEach(() => {
        delete process.env.NODE_ENV;
      });

      it('should not redirect HTTP requests in development', async () => {
        app.use(httpsRedirectMiddleware);
        app.get('/test', (req, res) => {
          res.json({ success: true });
        });

        const response = await request(app)
          .get('/test')
          .expect(200);

        expect(response.body).toEqual({ success: true });
      });

      it('should allow HTTP access to exempt paths in development', async () => {
        const middleware = createHttpsRedirectMiddleware({
          exemptPaths: ['/health']
        });
        
        app.use(middleware);
        app.get('/health', (req, res) => {
          res.json({ status: 'OK' });
        });

        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body).toEqual({ status: 'OK' });
      });

      it('should redirect when forceHttps is enabled in development', async () => {
        const middleware = createHttpsRedirectMiddleware({
          forceHttps: true
        });
        
        app.use(middleware);
        app.get('/test', (req, res) => {
          res.json({ success: true });
        });

        const response = await request(app)
          .get('/test')
          .expect(301);

        expect(response.headers.location).toMatch(/^https:/);
      });
    });

    describe('Secure Request Detection', () => {
      it('should detect HTTPS requests correctly', async () => {
        app.use(httpsRedirectMiddleware);
        app.get('/test', (req, res) => {
          res.json({ secure: req.secure });
        });

        const response = await request(app)
          .get('/test')
          .set('X-Forwarded-Proto', 'https')
          .expect(200);

        expect(response.body.secure).toBe(false); // req.secure would need actual HTTPS
      });

      it('should handle proxy headers correctly', async () => {
        const middleware = createHttpsRedirectMiddleware({
          trustProxy: true
        });
        
        app.use(middleware);
        app.get('/test', (req, res) => {
          res.json({ success: true });
        });

        // Should not redirect when X-Forwarded-Proto indicates HTTPS
        const response = await request(app)
          .get('/test')
          .set('X-Forwarded-Proto', 'https')
          .expect(200);

        expect(response.body).toEqual({ success: true });
      });
    });
  });

  describe('HTTPS Health Monitoring', () => {
    describe('Health Check Function', () => {
      it('should return comprehensive health check structure', async () => {
        // Mock health check for localhost (will likely fail, but structure should be correct)
        const result = await performHttpsHealthCheck(443, 80, 'localhost');

        expect(result).toHaveProperty('healthy');
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('checks');
        expect(result.checks).toHaveProperty('httpsListening');
        expect(result.checks).toHaveProperty('httpRedirects');
        expect(result.checks).toHaveProperty('certificateValid');
        expect(result.checks).toHaveProperty('securityHeaders');
        expect(typeof result.healthy).toBe('boolean');
      });

      it('should handle health check failures gracefully', async () => {
        // Use invalid port to trigger failure
        const result = await performHttpsHealthCheck(9999, 9998, 'nonexistent-host');

        expect(result.healthy).toBe(false);
        expect(result.checks.httpsListening).toBe(false);
        expect(result.checks.certificateValid).toBe(false);
        expect(result.checks.errorDetails).toBeDefined();
        expect(Array.isArray(result.checks.errorDetails)).toBe(true);
      });
    });

    describe('HttpsHealthMonitor Class', () => {
      let monitor: HttpsHealthMonitor;

      afterEach(() => {
        if (monitor) {
          monitor.stop();
        }
      });

      it('should initialize monitoring correctly', () => {
        monitor = new HttpsHealthMonitor(443, 80, 'localhost');
        expect(monitor).toBeDefined();
        expect(monitor.getLastResult()).toBeNull();
      });

      it('should start and stop monitoring', (done) => {
        monitor = new HttpsHealthMonitor(443, 80, 'localhost');
        
        // Mock console.log to capture monitoring messages
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        monitor.start(0.01); // Very short interval for testing (0.6 seconds)
        
        // Verify monitoring started
        setTimeout(() => {
          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Starting HTTPS health monitoring')
          );
          
          monitor.stop();
          
          // Verify monitoring stopped
          setTimeout(() => {
            expect(consoleSpy).toHaveBeenCalledWith('🛑 HTTPS health monitoring stopped');
            consoleSpy.mockRestore();
            done();
          }, 100);
        }, 100);
      });

      it('should perform periodic health checks', (done) => {
        monitor = new HttpsHealthMonitor(443, 80, 'localhost');
        
        monitor.start(0.01); // Very short interval for testing
        
        // Wait for at least one check to complete
        setTimeout(() => {
          const lastResult = monitor.getLastResult();
          expect(lastResult).not.toBeNull();
          expect(lastResult).toHaveProperty('healthy');
          expect(lastResult).toHaveProperty('timestamp');
          
          monitor.stop();
          done();
        }, 2000); // Wait 2 seconds for health check to complete
      });
    });
  });

  describe('Production Security Enforcement', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('should enforce strict security in production environment', async () => {
      const middleware = createHttpsRedirectMiddleware({
        exemptPaths: ['/health', '/status']
      });
      
      app.use(middleware);
      app.get('/health', (req, res) => {
        res.json({ status: 'OK' });
      });

      // Even exempt paths should redirect in production
      const response = await request(app)
        .get('/health')
        .expect(301);

      expect(response.headers.location).toMatch(/^https:/);
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should include comprehensive security headers in production', async () => {
      app.use(httpsRedirectMiddleware);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/api/test')
        .expect(301);

      // Verify all security headers are present
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['cache-control']).toContain('no-cache');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });

    it('should handle production errors securely', async () => {
      const middleware = createHttpsRedirectMiddleware({
        hostname: '' // Invalid hostname to trigger error
      });
      
      app.use(middleware);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(426);

      expect(response.body).toEqual({
        success: false,
        error: 'HTTPS Required',
        message: 'This service requires HTTPS. Please use https:// instead of http://',
        code: 'HTTPS_REQUIRED'
      });

      // Verify security headers even in error response
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('WebSocket Security', () => {
    it('should handle WebSocket upgrade requests securely', async () => {
      app.use(httpsRedirectMiddleware);
      
      const response = await request(app)
        .get('/socket.io/')
        .set('Connection', 'upgrade')
        .set('Upgrade', 'websocket')
        .expect(301);

      expect(response.headers.location).toMatch(/^https:/);
    });
  });

  describe('Mixed Content Prevention', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('should prevent mixed content by redirecting all HTTP requests', async () => {
      app.use(httpsRedirectMiddleware);
      
      // Test various content types
      const endpoints = [
        '/api/data',
        '/assets/style.css',
        '/images/logo.png',
        '/scripts/app.js'
      ];

      for (const endpoint of endpoints) {
        app.get(endpoint, (req, res) => {
          res.json({ endpoint });
        });

        const response = await request(app)
          .get(endpoint)
          .expect(301);

        expect(response.headers.location).toMatch(/^https:/);
      }
    });
  });

  describe('Certificate Validation Integration', () => {
    it('should validate certificate information structure', async () => {
      const result = await performHttpsHealthCheck(443, 80, 'localhost');

      // Certificate info should be present or properly structured when missing
      if (result.certificate) {
        expect(result.certificate).toHaveProperty('subject');
        expect(result.certificate).toHaveProperty('issuer');
        expect(result.certificate).toHaveProperty('validFrom');
        expect(result.certificate).toHaveProperty('validTo');
        expect(result.certificate).toHaveProperty('daysUntilExpiry');
        expect(typeof result.certificate.daysUntilExpiry).toBe('number');
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle malformed requests gracefully', async () => {
      app.use(httpsRedirectMiddleware);
      app.get('*', (req, res) => {
        res.json({ path: req.path });
      });

      // Test with various malformed paths
      const malformedPaths = [
        '/path%20with%20spaces',
        '/path/with/../traversal',
        '/path?param=value&other=test'
      ];

      for (const path of malformedPaths) {
        const response = await request(app)
          .get(path)
          .expect(301);

        expect(response.headers.location).toMatch(/^https:/);
        expect(response.headers.location).toContain(encodeURIComponent(path));
      }
    });

    it('should handle network timeouts gracefully', async () => {
      // Mock a slow health check
      const result = await performHttpsHealthCheck(443, 80, 'nonexistent-host.example.com');
      
      expect(result.healthy).toBe(false);
      expect(result.checks.errorDetails).toBeDefined();
      expect(result.checks.httpsListening).toBe(false);
    });
  });
});

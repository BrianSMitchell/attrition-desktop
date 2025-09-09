#!/usr/bin/env node

/**
 * Integration Testing Framework
 * Runs integration tests across the entire application stack
 */

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const TestDatabaseUtils = require('./test-db-utils');

class IntegrationTestFramework {
    constructor() {
        this.serverProcess = null;
        this.dbUtils = new TestDatabaseUtils();
        this.testResults = [];
        this.baseUrl = 'http://localhost:3002';
    }

    /**
     * Setup test environment
     */
    async setup() {
        console.log('🔧 Setting up integration test environment...');
        
        // Ensure test database is ready
        await this.dbUtils.connect();
        await this.dbUtils.seedAll();
        
        // Start test server
        await this.startTestServer();
        
        // Wait for server to be ready
        await this.waitForServer();
        
        console.log('✅ Integration test environment ready');
    }

    /**
     * Cleanup test environment
     */
    async cleanup() {
        console.log('🧹 Cleaning up integration test environment...');
        
        // Stop test server
        if (this.serverProcess) {
            this.serverProcess.kill();
            this.serverProcess = null;
        }
        
        // Clean test database
        await this.dbUtils.cleanDatabase();
        await this.dbUtils.disconnect();
        
        console.log('✅ Integration test cleanup complete');
    }

    /**
     * Start the test server
     */
    async startTestServer() {
        return new Promise((resolve, reject) => {
            const serverPath = path.join(__dirname, '../../packages/server/src/index.ts');
            
            this.serverProcess = spawn('npx', ['tsx', serverPath], {
                env: { 
                    ...process.env, 
                    NODE_ENV: 'test',
                    PORT: '3002' 
                },
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            this.serverProcess.stdout.on('data', (data) => {
                output += data.toString();
                if (output.includes('Server running on port 3002')) {
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                console.error('Server stderr:', data.toString());
            });

            this.serverProcess.on('error', reject);
            
            // Timeout after 30 seconds
            setTimeout(() => {
                reject(new Error('Server startup timeout'));
            }, 30000);
        });
    }

    /**
     * Wait for server to be responsive
     */
    async waitForServer(maxAttempts = 30) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                await this.makeRequest('GET', '/health');
                return;
            } catch (error) {
                if (i === maxAttempts - 1) {
                    throw new Error('Server not responding after maximum attempts');
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    /**
     * Make HTTP request to test server
     */
    async makeRequest(method, path, data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3002,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const parsedBody = body ? JSON.parse(body) : null;
                        resolve({ status: res.statusCode, body: parsedBody, headers: res.headers });
                    } catch (e) {
                        resolve({ status: res.statusCode, body: body, headers: res.headers });
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    /**
     * Run authentication tests
     */
    async testAuthentication() {
        console.log('🔐 Testing authentication...');
        const results = [];
        
        try {
            const credentials = this.dbUtils.getTestCredentials();
            
            // Test user registration
            const registerResponse = await this.makeRequest('POST', '/api/auth/register', {
                email: 'newuser@example.com',
                username: 'newuser',
                password: 'password123'
            });
            
            results.push({
                test: 'User Registration',
                passed: registerResponse.status === 201,
                details: registerResponse.body
            });
            
            // Test user login
            const loginResponse = await this.makeRequest('POST', '/api/auth/login', {
                email: credentials.user.email,
                password: credentials.user.password
            });
            
            results.push({
                test: 'User Login',
                passed: loginResponse.status === 200 && loginResponse.body?.token,
                details: loginResponse.body
            });
            
        } catch (error) {
            results.push({
                test: 'Authentication Tests',
                passed: false,
                error: error.message
            });
        }
        
        return results;
    }

    /**
     * Run all integration tests
     */
    async runAllTests() {
        console.log('🚀 Starting integration tests...');
        
        try {
            await this.setup();
            
            // Run test suites
            const authResults = await this.testAuthentication();
            
            this.testResults = [...authResults];
            
            // Generate report
            this.generateReport();
            
        } catch (error) {
            console.error('Integration test setup failed:', error);
            this.testResults.push({
                test: 'Test Setup',
                passed: false,
                error: error.message
            });
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Generate test report
     */
    generateReport() {
        console.log('\n📊 Integration Test Report');
        console.log('==========================');
        
        let passed = 0;
        let failed = 0;
        
        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.test}`);
            
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            
            result.passed ? passed++ : failed++;
        });
        
        console.log('\n📈 Summary');
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Total: ${this.testResults.length}`);
        console.log(`Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%`);
        
        // Exit with error code if tests failed
        if (failed > 0) {
            process.exit(1);
        }
    }
}

// CLI execution
if (require.main === module) {
    const framework = new IntegrationTestFramework();
    framework.runAllTests().catch(error => {
        console.error('Integration tests failed:', error);
        process.exit(1);
    });
}

module.exports = IntegrationTestFramework;

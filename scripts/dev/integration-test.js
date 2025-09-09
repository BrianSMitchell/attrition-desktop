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
        }\n    }\n\n    /**\n     * Make HTTP request to test server\n     */\n    async makeRequest(method, path, data = null, headers = {}) {\n        return new Promise((resolve, reject) => {\n            const options = {\n                hostname: 'localhost',\n                port: 3002,\n                path: path,\n                method: method,\n                headers: {\n                    'Content-Type': 'application/json',\n                    ...headers\n                }\n            };\n\n            const req = http.request(options, (res) => {\n                let body = '';\n                res.on('data', (chunk) => body += chunk);\n                res.on('end', () => {\n                    try {\n                        const parsedBody = body ? JSON.parse(body) : null;\n                        resolve({ status: res.statusCode, body: parsedBody, headers: res.headers });\n                    } catch (e) {\n                        resolve({ status: res.statusCode, body: body, headers: res.headers });\n                    }\n                });\n            });\n\n            req.on('error', reject);\n\n            if (data) {\n                req.write(JSON.stringify(data));\n            }\n\n            req.end();\n        });\n    }\n\n    /**\n     * Run authentication tests\n     */\n    async testAuthentication() {\n        console.log('🔐 Testing authentication...');\n        const results = [];\n        \n        try {\n            const credentials = this.dbUtils.getTestCredentials();\n            \n            // Test user registration\n            const registerResponse = await this.makeRequest('POST', '/api/auth/register', {\n                email: 'newuser@example.com',\n                username: 'newuser',\n                password: 'password123'\n            });\n            \n            results.push({\n                test: 'User Registration',\n                passed: registerResponse.status === 201,\n                details: registerResponse.body\n            });\n            \n            // Test user login\n            const loginResponse = await this.makeRequest('POST', '/api/auth/login', {\n                email: credentials.user.email,\n                password: credentials.user.password\n            });\n            \n            results.push({\n                test: 'User Login',\n                passed: loginResponse.status === 200 && loginResponse.body?.token,\n                details: loginResponse.body\n            });\n            \n            // Test protected route with token\n            if (loginResponse.body?.token) {\n                const profileResponse = await this.makeRequest('GET', '/api/auth/me', null, {\n                    'Authorization': `Bearer ${loginResponse.body.token}`\n                });\n                \n                results.push({\n                    test: 'Protected Route Access',\n                    passed: profileResponse.status === 200,\n                    details: profileResponse.body\n                });\n            }\n            \n        } catch (error) {\n            results.push({\n                test: 'Authentication Tests',\n                passed: false,\n                error: error.message\n            });\n        }\n        \n        return results;\n    }\n\n    /**\n     * Run game logic tests\n     */\n    async testGameLogic() {\n        console.log('🎮 Testing game logic...');\n        const results = [];\n        \n        try {\n            // First, login to get a token\n            const credentials = this.dbUtils.getTestCredentials();\n            const loginResponse = await this.makeRequest('POST', '/api/auth/login', credentials.user);\n            \n            if (!loginResponse.body?.token) {\n                throw new Error('Could not get authentication token');\n            }\n            \n            const authHeaders = { 'Authorization': `Bearer ${loginResponse.body.token}` };\n            \n            // Test empire creation\n            const empireResponse = await this.makeRequest('POST', '/api/game/empire', {\n                name: 'Test Integration Empire'\n            }, authHeaders);\n            \n            results.push({\n                test: 'Empire Creation',\n                passed: empireResponse.status === 201,\n                details: empireResponse.body\n            });\n            \n            // Test dashboard data\n            const dashboardResponse = await this.makeRequest('GET', '/api/game/dashboard', null, authHeaders);\n            \n            results.push({\n                test: 'Dashboard Data',\n                passed: dashboardResponse.status === 200,\n                details: dashboardResponse.body\n            });\n            \n            // Test universe data\n            const universeResponse = await this.makeRequest('GET', '/api/game/universe', null, authHeaders);\n            \n            results.push({\n                test: 'Universe Data',\n                passed: universeResponse.status === 200,\n                details: universeResponse.body\n            });\n            \n        } catch (error) {\n            results.push({\n                test: 'Game Logic Tests',\n                passed: false,\n                error: error.message\n            });\n        }\n        \n        return results;\n    }\n\n    /**\n     * Run API endpoint tests\n     */\n    async testAPIEndpoints() {\n        console.log('🌐 Testing API endpoints...');\n        const results = [];\n        \n        // Test health check\n        try {\n            const healthResponse = await this.makeRequest('GET', '/health');\n            results.push({\n                test: 'Health Check',\n                passed: healthResponse.status === 200,\n                details: healthResponse.body\n            });\n        } catch (error) {\n            results.push({\n                test: 'Health Check',\n                passed: false,\n                error: error.message\n            });\n        }\n        \n        // Test 404 handling\n        try {\n            const notFoundResponse = await this.makeRequest('GET', '/nonexistent');\n            results.push({\n                test: '404 Handling',\n                passed: notFoundResponse.status === 404,\n                details: notFoundResponse.body\n            });\n        } catch (error) {\n            results.push({\n                test: '404 Handling',\n                passed: false,\n                error: error.message\n            });\n        }\n        \n        return results;\n    }\n\n    /**\n     * Run all integration tests\n     */\n    async runAllTests() {\n        console.log('🚀 Starting integration tests...');\n        \n        try {\n            await this.setup();\n            \n            // Run test suites\n            const authResults = await this.testAuthentication();\n            const gameResults = await this.testGameLogic();\n            const apiResults = await this.testAPIEndpoints();\n            \n            this.testResults = [...authResults, ...gameResults, ...apiResults];\n            \n            // Generate report\n            this.generateReport();\n            \n        } catch (error) {\n            console.error('Integration test setup failed:', error);\n            this.testResults.push({\n                test: 'Test Setup',\n                passed: false,\n                error: error.message\n            });\n        } finally {\n            await this.cleanup();\n        }\n    }\n\n    /**\n     * Generate test report\n     */\n    generateReport() {\n        console.log('\\n📊 Integration Test Report');\n        console.log('==========================');\n        \n        let passed = 0;\n        let failed = 0;\n        \n        this.testResults.forEach(result => {\n            const status = result.passed ? '✅' : '❌';\n            console.log(`${status} ${result.test}`);\n            \n            if (result.error) {\n                console.log(`   Error: ${result.error}`);\n            }\n            \n            result.passed ? passed++ : failed++;\n        });\n        \n        console.log('\\n📈 Summary');\n        console.log(`Passed: ${passed}`);\n        console.log(`Failed: ${failed}`);\n        console.log(`Total: ${this.testResults.length}`);\n        console.log(`Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%`);\n        \n        // Save detailed report\n        const fs = require('fs');\n        const reportPath = path.join('logs', 'integration-test-report.json');\n        fs.mkdirSync(path.dirname(reportPath), { recursive: true });\n        fs.writeFileSync(reportPath, JSON.stringify({\n            timestamp: new Date().toISOString(),\n            summary: { passed, failed, total: this.testResults.length },\n            results: this.testResults\n        }, null, 2));\n        \n        console.log(`\\n📁 Detailed report saved to: ${reportPath}`);\n        \n        // Exit with error code if tests failed\n        if (failed > 0) {\n            process.exit(1);\n        }\n    }\n}\n\n// CLI execution\nif (require.main === module) {\n    const framework = new IntegrationTestFramework();\n    framework.runAllTests().catch(error => {\n        console.error('Integration tests failed:', error);\n        process.exit(1);\n    });\n}\n\nmodule.exports = IntegrationTestFramework;

#!/usr/bin/env node

/**
 * Comprehensive service integration test runner
 * This script runs all integration tests and provides detailed reporting
 */

import { execSync } from 'child_process';
// import * as path from 'path'; // Unused for now

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface TestReport {
  totalTests: number;
  passed: number;
  failed: number;
  totalDuration: number;
  results: TestResult[];
}

class IntegrationTestRunner {
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestReport> {
    console.log('🧪 Starting Service Integration Test Suite...\n');
    
    const testSuites = [
      {
        name: 'Core Services Unit Tests',
        path: './src/services/core/__tests__/CoreServices.test.ts'
      },
      {
        name: 'Service Integration Tests', 
        path: './src/services/integration/__tests__/ServiceIntegration.test.ts'
      },
      {
        name: 'Service Stress Tests',
        path: './src/services/integration/__tests__/StressTests.test.ts'
      }
    ];

    for (const suite of testSuites) {
      await this.runTestSuite(suite.name, suite.path);
    }

    return this.generateReport();
  }

  private async runTestSuite(name: string, testPath: string): Promise<void> {
    console.log(`📋 Running: ${name}`);
    const startTime = Date.now();

    try {
      // Run the test suite using vitest
      const command = `npx vitest run ${testPath} --reporter=verbose`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: process.cwd()
      });

      const duration = Date.now() - startTime;
      
      console.log(`✅ ${name} - PASSED (${duration}ms)`);
      console.log(output);
      
      this.results.push({
        suite: name,
        passed: true,
        duration
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      console.log(`❌ ${name} - FAILED (${duration}ms)`);
      console.error(error.stdout || error.message);
      
      this.results.push({
        suite: name,
        passed: false,
        duration,
        error: error.stdout || error.message
      });
    }

    console.log(); // Empty line for readability
  }

  private generateReport(): TestReport {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return {
      totalTests: this.results.length,
      passed,
      failed,
      totalDuration,
      results: this.results
    };
  }

  printReport(report: TestReport): void {
    console.log('📊 Integration Test Results Summary');
    console.log('='.repeat(50));
    console.log(`Total Test Suites: ${report.totalTests}`);
    console.log(`✅ Passed: ${report.passed}`);
    console.log(`❌ Failed: ${report.failed}`);
    console.log(`⏱️  Total Duration: ${report.totalDuration}ms`);
    console.log('');

    // Detailed results
    report.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.suite} (${result.duration}ms)`);
      
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error.split('\n')[0]}`);
      }
    });

    console.log('');
    
    if (report.failed === 0) {
      console.log('🎉 All integration tests passed! System is ready for production.');
    } else {
      console.log('⚠️  Some tests failed. Please review the failures before deploying.');
    }

    console.log('');
  }

  async runCoverageReport(): Promise<void> {
    console.log('📈 Generating Coverage Report...');
    
    try {
      const command = `npx vitest run --coverage src/services/`;
      execSync(command, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('✅ Coverage report generated');
    } catch (error) {
      console.warn('⚠️ Coverage report failed - this is optional');
    }
  }

  async runPerformanceTests(): Promise<void> {
    console.log('⚡ Running Performance Benchmarks...');
    
    // Simple performance test
    const iterations = 100;
    const startTime = Date.now();
    
    try {
      // Import and test core services directly
      const { AppInitializer } = await import('../../initialize');
      
      for (let i = 0; i < iterations; i++) {
        const initializer = AppInitializer.getInstance();
        const status = initializer.getSystemStatus();
        
        if (i === 0) {
          console.log(`Sample status check: ${JSON.stringify(status, null, 2)}`);
        }
      }
      
      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;
      
      console.log(`✅ Performance test completed:`);
      console.log(`   ${iterations} status checks in ${duration}ms`);
      console.log(`   Average: ${avgTime.toFixed(2)}ms per operation`);
      
      if (avgTime > 10) {
        console.warn('⚠️ Performance concern: Average operation time > 10ms');
      }
      
    } catch (error) {
      console.error('❌ Performance test failed:', error);
    }
  }
}

// Main execution
async function main() {
  const runner = new IntegrationTestRunner();
  
  try {
    // Run all integration tests
    const report = await runner.runAllTests();
    runner.printReport(report);
    
    // Run optional coverage report
    if (process.argv.includes('--coverage')) {
      await runner.runCoverageReport();
    }
    
    // Run performance benchmarks
    if (process.argv.includes('--performance')) {
      await runner.runPerformanceTests();
    }
    
    // Exit with appropriate code
    process.exit(report.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { IntegrationTestRunner };
#!/usr/bin/env node

/**
 * Test Result Feedback System
 * 
 * This script provides comprehensive feedback to developers about test results,
 * performance metrics, coverage changes, and actionable recommendations.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

class TestFeedbackSystem {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {};
    this.metrics = {};
    this.recommendations = [];
  }

  /**
   * Main feedback generation function
   */
  async generateFeedback() {
    console.log(`${colors.cyan}${colors.bright}🧪 Attrition Test Feedback System${colors.reset}\n`);

    try {
      await this.collectTestResults();
      await this.analyzeCoverage();
      await this.analyzePerformance();
      await this.generateRecommendations();
      
      this.displaySummary();
      this.displayRecommendations();
      
      if (process.env.CI) {
        await this.generateCIReport();
      }
      
    } catch (error) {
      console.error(`${colors.red}❌ Error generating feedback: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }

  /**
   * Collect test results from various sources
   */
  async collectTestResults() {
    console.log(`${colors.blue}📊 Collecting test results...${colors.reset}`);

    // Collect Jest results
    this.collectJestResults();
    
    // Collect Playwright results
    this.collectPlaywrightResults();
    
    // Collect game simulation results
    this.collectGameSimulationResults();
    
    // Collect multiplayer test results
    this.collectMultiplayerResults();
  }

  /**
   * Collect Jest test results
   */
  collectJestResults() {
    const jestResultPaths = [
      'packages/server/test-results/jest-results.json',
      'packages/client/test-results/jest-results.json',
      'packages/shared/test-results/jest-results.json'
    ];

    this.results.jest = {
      packages: {},
      totals: { tests: 0, passed: 0, failed: 0, skipped: 0 }
    };

    jestResultPaths.forEach(resultPath => {
      const fullPath = path.join(this.projectRoot, resultPath);
      if (fs.existsSync(fullPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          const packageName = path.dirname(resultPath).split('/')[1];
          
          this.results.jest.packages[packageName] = {
            success: data.success,
            testResults: data.testResults || [],
            numTotalTests: data.numTotalTests || 0,
            numPassedTests: data.numPassedTests || 0,
            numFailedTests: data.numFailedTests || 0,
            numPendingTests: data.numPendingTests || 0,
            runTime: data.testResults?.reduce((sum, test) => sum + (test.perfStats?.end - test.perfStats?.start || 0), 0) || 0
          };

          // Update totals
          this.results.jest.totals.tests += data.numTotalTests || 0;
          this.results.jest.totals.passed += data.numPassedTests || 0;
          this.results.jest.totals.failed += data.numFailedTests || 0;
          this.results.jest.totals.skipped += data.numPendingTests || 0;
          
        } catch (error) {
          console.warn(`${colors.yellow}⚠️  Could not parse Jest results from ${resultPath}${colors.reset}`);
        }
      }
    });
  }

  /**
   * Collect Playwright test results
   */
  collectPlaywrightResults() {
    const playwrightResultPath = path.join(this.projectRoot, 'test-results/playwright-report.json');
    
    if (fs.existsSync(playwrightResultPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(playwrightResultPath, 'utf8'));
        this.results.playwright = {
          success: data.success,
          tests: data.tests || [],
          duration: data.duration || 0
        };
      } catch (error) {
        console.warn(`${colors.yellow}⚠️  Could not parse Playwright results${colors.reset}`);
      }
    }
  }

  /**
   * Collect game simulation test results
   */
  collectGameSimulationResults() {
    const gameSimResultPath = path.join(this.projectRoot, 'packages/server/test-results/game-simulation.json');
    
    if (fs.existsSync(gameSimResultPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(gameSimResultPath, 'utf8'));
        this.results.gameSimulation = data;
      } catch (error) {
        console.warn(`${colors.yellow}⚠️  Could not parse game simulation results${colors.reset}`);
      }
    }
  }

  /**
   * Collect multiplayer test results
   */
  collectMultiplayerResults() {
    const multiplayerResultPath = path.join(this.projectRoot, 'packages/server/test-results/multiplayer-scenarios.json');
    
    if (fs.existsSync(multiplayerResultPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(multiplayerResultPath, 'utf8'));
        this.results.multiplayer = data;
      } catch (error) {
        console.warn(`${colors.yellow}⚠️  Could not parse multiplayer test results${colors.reset}`);
      }
    }
  }

  /**
   * Analyze test coverage
   */
  async analyzeCoverage() {
    console.log(`${colors.blue}📈 Analyzing test coverage...${colors.reset}`);

    const coveragePaths = [
      'packages/server/coverage/coverage-summary.json',
      'packages/client/coverage/coverage-summary.json',
      'packages/shared/coverage/coverage-summary.json'
    ];

    this.metrics.coverage = {
      packages: {},
      overall: { lines: 0, functions: 0, branches: 0, statements: 0 }
    };

    let totalLines = 0, totalFunctions = 0, totalBranches = 0, totalStatements = 0;
    let coveredLines = 0, coveredFunctions = 0, coveredBranches = 0, coveredStatements = 0;

    coveragePaths.forEach(coveragePath => {
      const fullPath = path.join(this.projectRoot, coveragePath);
      if (fs.existsSync(fullPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          const packageName = path.dirname(coveragePath).split('/')[1];
          
          this.metrics.coverage.packages[packageName] = data.total;

          // Aggregate totals
          totalLines += data.total.lines.total;
          coveredLines += data.total.lines.covered;
          totalFunctions += data.total.functions.total;
          coveredFunctions += data.total.functions.covered;
          totalBranches += data.total.branches.total;
          coveredBranches += data.total.branches.covered;
          totalStatements += data.total.statements.total;
          coveredStatements += data.total.statements.covered;
          
        } catch (error) {
          console.warn(`${colors.yellow}⚠️  Could not parse coverage from ${coveragePath}${colors.reset}`);
        }
      }
    });

    // Calculate overall percentages
    this.metrics.coverage.overall = {
      lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0,
      functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
      branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
      statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0
    };
  }

  /**
   * Analyze performance metrics
   */
  async analyzePerformance() {
    console.log(`${colors.blue}⚡ Analyzing performance metrics...${colors.reset}`);

    const performanceResultPath = path.join(this.projectRoot, 'performance-results/benchmark-results.json');
    
    if (fs.existsSync(performanceResultPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(performanceResultPath, 'utf8'));
        this.metrics.performance = data;
      } catch (error) {
        console.warn(`${colors.yellow}⚠️  Could not parse performance results${colors.reset}`);
      }
    }

    // Analyze test execution times
    this.metrics.executionTime = {
      jest: 0,
      playwright: this.results.playwright?.duration || 0,
      gameSimulation: this.results.gameSimulation?.duration || 0,
      multiplayer: this.results.multiplayer?.duration || 0
    };

    // Sum Jest execution times across packages
    if (this.results.jest?.packages) {
      this.metrics.executionTime.jest = Object.values(this.results.jest.packages)
        .reduce((sum, pkg) => sum + (pkg.runTime || 0), 0);
    }
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    console.log(`${colors.blue}🎯 Generating recommendations...${colors.reset}`);

    // Coverage recommendations
    this.generateCoverageRecommendations();
    
    // Performance recommendations
    this.generatePerformanceRecommendations();
    
    // Test quality recommendations
    this.generateTestQualityRecommendations();
    
    // Failure analysis recommendations
    this.generateFailureRecommendations();
  }

  /**
   * Generate coverage-based recommendations
   */
  generateCoverageRecommendations() {
    const { coverage } = this.metrics;
    const thresholds = { lines: 80, functions: 75, branches: 70, statements: 80 };

    Object.entries(thresholds).forEach(([metric, threshold]) => {
      if (coverage.overall[metric] < threshold) {
        this.recommendations.push({
          type: 'coverage',
          priority: coverage.overall[metric] < threshold - 10 ? 'high' : 'medium',
          title: `Improve ${metric} coverage`,
          description: `Current ${metric} coverage is ${coverage.overall[metric]}%, below the ${threshold}% threshold`,
          actions: [
            `Add unit tests for uncovered ${metric === 'lines' ? 'code paths' : metric}`,
            `Review coverage report: coverage/lcov-report/index.html`,
            `Focus on critical business logic first`
          ],
          command: 'pnpm run test:coverage'
        });
      }
    });

    // Package-specific coverage issues
    Object.entries(coverage.packages).forEach(([packageName, packageCoverage]) => {
      if (packageCoverage.lines?.pct < 75) {
        this.recommendations.push({
          type: 'coverage',
          priority: 'medium',
          title: `Improve coverage in ${packageName} package`,
          description: `${packageName} has ${packageCoverage.lines?.pct || 0}% line coverage`,
          actions: [
            `Add tests for ${packageName} package`,
            `pnpm --filter @game/${packageName} test:coverage`,
            `Review package-specific uncovered files`
          ],
          command: `pnpm --filter @game/${packageName} test:coverage`
        });
      }
    });
  }

  /**
   * Generate performance-based recommendations
   */
  generatePerformanceRecommendations() {
    const { executionTime, performance } = this.metrics;

    // Test execution time recommendations
    const totalExecutionTime = Object.values(executionTime).reduce((sum, time) => sum + time, 0);
    
    if (totalExecutionTime > 300000) { // 5 minutes
      this.recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Optimize test execution time',
        description: `Total test execution time is ${Math.round(totalExecutionTime / 1000)}s`,
        actions: [
          'Parallelize test execution where possible',
          'Review slow-running tests',
          'Consider test data optimization',
          'Use test.concurrent for independent tests'
        ],
        command: 'pnpm run test --verbose'
      });
    }

    // Performance regression recommendations
    if (performance?.regressions?.length > 0) {
      this.recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Address performance regressions',
        description: `${performance.regressions.length} performance regressions detected`,
        actions: [
          'Review performance benchmark results',
          'Profile slow operations',
          'Optimize database queries',
          'Consider caching improvements'
        ],
        command: 'pnpm run test:performance'
      });
    }
  }

  /**
   * Generate test quality recommendations
   */
  generateTestQualityRecommendations() {
    const { jest } = this.results;

    // Flaky test detection
    if (jest?.packages) {
      Object.entries(jest.packages).forEach(([packageName, packageResults]) => {
        const failedTests = packageResults.testResults?.filter(result => 
          result.status === 'failed'
        ) || [];

        if (failedTests.length > 0) {
          this.recommendations.push({
            type: 'quality',
            priority: 'high',
            title: `Fix failing tests in ${packageName}`,
            description: `${failedTests.length} tests are currently failing`,
            actions: [
              'Review test failure messages',
              'Check for race conditions',
              'Verify test data setup',
              'Run tests individually to isolate issues'
            ],
            command: `pnpm --filter @game/${packageName} test --verbose`
          });
        }
      });
    }

    // Test organization recommendations
    const totalTests = jest?.totals?.tests || 0;
    if (totalTests < 50) {
      this.recommendations.push({
        type: 'quality',
        priority: 'medium',
        title: 'Increase test coverage breadth',
        description: `Only ${totalTests} tests found across the project`,
        actions: [
          'Add unit tests for new features',
          'Create integration tests for critical workflows',
          'Add game simulation tests for game mechanics',
          'Follow test authoring guidelines'
        ],
        command: 'pnpm run test'
      });
    }
  }

  /**
   * Generate failure analysis recommendations
   */
  generateFailureRecommendations() {
    const failures = [];

    // Collect Jest failures
    if (this.results.jest?.packages) {
      Object.entries(this.results.jest.packages).forEach(([packageName, packageResults]) => {
        if (!packageResults.success) {
          failures.push({ type: 'jest', package: packageName, results: packageResults });
        }
      });
    }

    // Collect Playwright failures
    if (this.results.playwright && !this.results.playwright.success) {
      failures.push({ type: 'playwright', results: this.results.playwright });
    }

    // Generate recommendations for each failure type
    failures.forEach(failure => {
      if (failure.type === 'jest') {
        this.recommendations.push({
          type: 'failure',
          priority: 'high',
          title: `Fix test failures in ${failure.package}`,
          description: `${failure.results.numFailedTests} unit/integration tests failing`,
          actions: [
            'Run tests with --verbose flag for detailed output',
            'Check for environment-specific issues',
            'Review recent code changes that might have broken tests',
            'Verify test database setup'
          ],
          command: `pnpm --filter @game/${failure.package} test --verbose`
        });
      } else if (failure.type === 'playwright') {
        this.recommendations.push({
          type: 'failure',
          priority: 'high',
          title: 'Fix E2E test failures',
          description: 'End-to-end tests are failing',
          actions: [
            'Check application startup logs',
            'Verify test data setup',
            'Run tests in headed mode for visual debugging',
            'Check for timing issues in tests'
          ],
          command: 'pnpm run e2e:headed'
        });
      }
    });
  }

  /**
   * Display comprehensive test summary
   */
  displaySummary() {
    console.log(`${colors.cyan}${colors.bright}📊 Test Results Summary${colors.reset}\n`);

    // Jest results
    if (this.results.jest?.totals) {
      const { totals } = this.results.jest;
      const successRate = totals.tests > 0 ? Math.round((totals.passed / totals.tests) * 100) : 0;
      const statusColor = successRate >= 95 ? colors.green : successRate >= 80 ? colors.yellow : colors.red;
      
      console.log(`${colors.bright}Unit & Integration Tests:${colors.reset}`);
      console.log(`  ${statusColor}●${colors.reset} ${totals.passed}/${totals.tests} tests passed (${successRate}%)`);
      if (totals.failed > 0) console.log(`  ${colors.red}●${colors.reset} ${totals.failed} tests failed`);
      if (totals.skipped > 0) console.log(`  ${colors.yellow}●${colors.reset} ${totals.skipped} tests skipped`);
      console.log();
    }

    // Coverage summary
    if (this.metrics.coverage?.overall) {
      const { overall } = this.metrics.coverage;
      console.log(`${colors.bright}Test Coverage:${colors.reset}`);
      console.log(`  Lines:      ${this.formatCoveragePercent(overall.lines)}%`);
      console.log(`  Functions:  ${this.formatCoveragePercent(overall.functions)}%`);
      console.log(`  Branches:   ${this.formatCoveragePercent(overall.branches)}%`);
      console.log(`  Statements: ${this.formatCoveragePercent(overall.statements)}%`);
      console.log();
    }

    // Game-specific test results
    if (this.results.gameSimulation) {
      console.log(`${colors.bright}Game Simulation Tests:${colors.reset}`);
      console.log(`  Status: ${this.results.gameSimulation.success ? 
        `${colors.green}✅ Passed${colors.reset}` : 
        `${colors.red}❌ Failed${colors.reset}`}`);
      console.log();
    }

    if (this.results.multiplayer) {
      console.log(`${colors.bright}Multiplayer Scenario Tests:${colors.reset}`);
      console.log(`  Status: ${this.results.multiplayer.success ? 
        `${colors.green}✅ Passed${colors.reset}` : 
        `${colors.red}❌ Failed${colors.reset}`}`);
      console.log();
    }

    // Performance summary
    if (this.metrics.executionTime) {
      const totalTime = Object.values(this.metrics.executionTime).reduce((sum, time) => sum + time, 0);
      console.log(`${colors.bright}Execution Time:${colors.reset}`);
      console.log(`  Total: ${Math.round(totalTime / 1000)}s`);
      console.log();
    }
  }

  /**
   * Format coverage percentage with colors
   */
  formatCoveragePercent(percent) {
    const color = percent >= 80 ? colors.green : percent >= 70 ? colors.yellow : colors.red;
    return `${color}${percent}${colors.reset}`;
  }

  /**
   * Display actionable recommendations
   */
  displayRecommendations() {
    if (this.recommendations.length === 0) {
      console.log(`${colors.green}${colors.bright}🎉 Great job! No recommendations at this time.${colors.reset}\n`);
      return;
    }

    console.log(`${colors.cyan}${colors.bright}🎯 Recommendations${colors.reset}\n`);

    // Group recommendations by priority
    const grouped = this.recommendations.reduce((acc, rec) => {
      acc[rec.priority] = acc[rec.priority] || [];
      acc[rec.priority].push(rec);
      return acc;
    }, {});

    ['high', 'medium', 'low'].forEach(priority => {
      if (grouped[priority]) {
        const priorityColor = priority === 'high' ? colors.red : 
                             priority === 'medium' ? colors.yellow : colors.blue;
        
        console.log(`${priorityColor}${colors.bright}${priority.toUpperCase()} PRIORITY${colors.reset}`);
        
        grouped[priority].forEach((rec, index) => {
          const icon = this.getRecommendationIcon(rec.type);
          console.log(`\n${index + 1}. ${icon} ${colors.bright}${rec.title}${colors.reset}`);
          console.log(`   ${rec.description}\n`);
          
          console.log(`   ${colors.bright}Actions:${colors.reset}`);
          rec.actions.forEach(action => {
            console.log(`   • ${action}`);
          });
          
          if (rec.command) {
            console.log(`\n   ${colors.bright}Quick fix:${colors.reset} ${colors.cyan}${rec.command}${colors.reset}`);
          }
        });
        
        console.log();
      }
    });
  }

  /**
   * Get icon for recommendation type
   */
  getRecommendationIcon(type) {
    const icons = {
      coverage: '📈',
      performance: '⚡',
      quality: '🔧',
      failure: '🚨',
      security: '🔒'
    };
    return icons[type] || '💡';
  }

  /**
   * Generate CI-specific report
   */
  async generateCIReport() {
    console.log(`${colors.blue}📋 Generating CI report...${colors.reset}`);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        tests: this.results.jest?.totals || {},
        coverage: this.metrics.coverage?.overall || {},
        performance: this.metrics.performance || {},
        executionTime: this.metrics.executionTime || {}
      },
      recommendations: this.recommendations,
      environment: {
        ci: process.env.CI,
        nodeVersion: process.version,
        branch: process.env.GITHUB_REF_NAME || 'unknown',
        commit: process.env.GITHUB_SHA || 'unknown'
      }
    };

    // Write CI report
    const reportPath = path.join(this.projectRoot, 'test-results/ci-feedback-report.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Create markdown summary for GitHub
    await this.generateGitHubSummary(report);
  }

  /**
   * Generate GitHub Actions summary
   */
  async generateGitHubSummary(report) {
    if (!process.env.GITHUB_STEP_SUMMARY) return;

    const summary = [
      '# 🧪 Test Results Summary',
      '',
      '## 📊 Overview',
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| **Tests Run** | ${report.summary.tests.tests || 0} |`,
      `| **Tests Passed** | ${report.summary.tests.passed || 0} |`,
      `| **Tests Failed** | ${report.summary.tests.failed || 0} |`,
      `| **Coverage** | ${report.summary.coverage.lines || 0}% |`,
      '',
      '## 🎯 Recommendations',
      ''
    ];

    if (this.recommendations.length > 0) {
      this.recommendations.slice(0, 5).forEach((rec, index) => {
        const icon = this.getRecommendationIcon(rec.type);
        summary.push(`### ${index + 1}. ${icon} ${rec.title}`);
        summary.push(`${rec.description}`);
        summary.push('');
      });
    } else {
      summary.push('🎉 No recommendations - great job!');
    }

    fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n'));
  }
}

// Run the feedback system
if (require.main === module) {
  const feedbackSystem = new TestFeedbackSystem();
  feedbackSystem.generateFeedback().catch(error => {
    console.error('Failed to generate feedback:', error);
    process.exit(1);
  });
}

module.exports = TestFeedbackSystem;

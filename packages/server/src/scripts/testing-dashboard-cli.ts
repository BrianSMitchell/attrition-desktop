#!/usr/bin/env node

import { FILE_EXTENSIONS, FILE_PATHS } from '@game/shared';
import { ENV_VARS } from '@game/shared';
import { DB_FIELDS } from '../../../constants/database-fields';

/**
 * Testing Dashboard CLI Tool
 * 
 * Command-line interface for managing testing metrics, generating dashboards,
 * and sending reports for the Attrition MMO testing infrastructure.
 */

import { Command } from 'commander';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { TestingMetricsCollector } from '../test-utils/testing-metrics-framework';
import DashboardGenerator from '../test-utils/dashboard-generator';
import { HTTP_STATUS } from '../constants/response-formats';

const program = new Command();

// Initialize the testing systems
const metricsCollector = new TestingMetricsCollector({
  metricsRetentionDays: 90,
  alertThresholds: {
    coverageMinimum: 80,
    performanceRegressionThreshold: 15,
    flakyTestThreshold: 5,
    failureRateThreshold: 10
  },
  reportingConfig: {
    dailyReportEnabled: true,
    weeklyReportEnabled: true
  }
});

const dashboardGenerator = new DashboardGenerator(metricsCollector);

// Load configuration from environment or config file
const getNotificationConfig = (): NotificationConfig => {
  const config: NotificationConfig = {};

  if (process.env[ENV_VARS.SLACK_WEBHOOK_URL]) {
    config.slack = {
      webhookUrl: process.env[ENV_VARS.SLACK_WEBHOOK_URL],
      channel: process.env[ENV_VARS.SLACK_CHANNEL] || '#testing',
      username: process.env[ENV_VARS.SLACK_USERNAME] || 'Attrition Testing Bot'
    };
  }

  if (process.env[ENV_VARS.SMTP_HOST]) {
    config.email = {
      smtpHost: process.env[ENV_VARS.SMTP_HOST],
      smtpPort: parseInt(process.env[ENV_VARS.SMTP_PORT] || '587'),
      username: process.env[ENV_VARS.SMTP_USERNAME]!,
      password: process.env[ENV_VARS.SMTP_PASSWORD]!,
      from: process.env[ENV_VARS.EMAIL_FROM]!,
      recipients: (process.env[ENV_VARS.EMAIL_RECIPIENTS] || '').split(',').filter(Boolean)
    };
  }

  return config;
};

const reportingSystem = new AutomatedReportingSystem(
  metricsCollector,
  getNotificationConfig()
);

// CLI Program Configuration
program
  .name('testing-dashboard-cli')
  .description('CLI tool for testing metrics and dashboard management')
  .version('1.0.0');

// ============================
// Dashboard Commands
// ============================

const dashboardCommand = program
  .command('dashboard')
  .description('Generate testing dashboards');

dashboardCommand
  .command('generate')
  .description('Generate all testing dashboards')
  .option('-o, --output <dir>', 'Output directory for dashboards', 'test-dashboards')
  .option('--main-only', 'Generate only the main dashboard')
  .action(async (options) => {
    try {
      console.log('?? Generating testing dashboards...');
      
      // Ensure output directory exists
      if (!existsSync(options.output)) {
        mkdirSync(options.output, { recursive: true });
      }

      const generator = new DashboardGenerator(metricsCollector, options.output);
      
      if (options.mainOnly) {
        const path = generator.generateMainDashboard();
        console.log(`? Main dashboard generated: ${path}`);
      } else {
        const paths = generator.generateAllDashboards();
        console.log('? All dashboards generated:');
        paths.forEach(path => console.log(`   ?? ${path}`));
      }
    } catch (error) {
      console.error('? Failed to generate dashboards:', error);
      process.exit(1);
    }
  });

dashboardCommand
  .command('serve')
  .description('Start a local server to view dashboards')
  .option('-p, --port <port>', 'Port number', '8080')
  .option('-d, --dir <dir>', 'Dashboard directory', 'test-dashboards')
  .action(async (options) => {
    try {
      // Generate dashboards first
      const generator = new DashboardGenerator(metricsCollector, options.dir);
      generator.generateAllDashboards();
      
      console.log(`?? Starting dashboard server on port ${options.port}...`);
      console.log(`?? Dashboard available at: http://localhost:${options.port}`);
      
      // Simple static file server (in production, use proper web server)
      const http = require('http');
      const fs = require('fs');
      const path = require('path');
      
      const server = http.createServer((req: any, res: any) => {
        let filePath = path.join(options.dir, req.url === '/' ? FILE_PATHS.INDEX_HTML : req.url);
        
        if (!fs.existsSync(filePath)) {
          res.writeHead(404);
          res.end('File not found');
          return;
        }
        
        const ext = path.extname(filePath);
        const mimeTypes: Record<string, string> = {
          [FILE_EXTENSIONS.HTML]: 'text/html',
          [FILE_EXTENSIONS.CSS]: 'text/css',
          [FILE_EXTENSIONS.JAVASCRIPT]: 'text/javascript',
          [FILE_EXTENSIONS.JSON]: 'application/json'
        };
        
        res.writeHead(HTTP_STATUS.OK, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        fs.createReadStream(filePath).pipe(res);
      });
      
      server.listen(options.port);
      
      // Keep server running
      process.on('SIGINT', () => {
        console.log('\n?? Shutting down dashboard server...');
        server.close();
        process.exit(0);
      });
      
    } catch (error) {
      console.error('? Failed to start dashboard server:', error);
      process.exit(1);
    }
  });

// ============================
// Metrics Commands
// ============================

const metricsCommand = program
  .command('metrics')
  .description('Manage testing metrics');

metricsCommand
  .command('health')
  .description('Show current testing health metrics')
  .action(async () => {
    try {
      console.log('?? Calculating current testing health...');
      const health = metricsCollector.calculateHealthMetrics();
      
      console.log('\n?? Testing Health Report');
      console.log('========================');
      console.log(`Overall Health Score: ${health.overallHealthScore}% ${getHealthEmoji(health.overallHealthScore)}`);
      console.log(`Coverage Score: ${health.coverageScore}%`);
      console.log(`Performance Score: ${health.performanceScore}%`);
      console.log(`Reliability Score: ${health.reliabilityScore}%`);
      console.log('');
      console.log(`Total Tests: ${health.totalTests}`);
      console.log(`Passed: ${health.passedTests} ?`);
      console.log(`Failed: ${health.failedTests} ?`);
      console.log(`Skipped: ${health.skippedTests} ??`);
      
      if (health.flakyTests.length > 0) {
        console.log(`\n?? Flaky Tests (${health.flakyTests.length}):`);
        health.flakyTests.slice(0, 5).forEach(test => console.log(`  - ${test}`));
        if (health.flakyTests.length > 5) {
          console.log(`  ... and ${health.flakyTests.length - 5} more`);
        }
      }
      
      if (health.slowTests.length > 0) {
        console.log(`\n?? Slow Tests (${health.slowTests.length}):`);
        health.slowTests.slice(0, 5).forEach(test => 
          console.log(`  - ${test.name} (${(test.avgDuration / 1000).toFixed(1)}s)`)
        );
      }
      
    } catch (error) {
      console.error('? Failed to get health metrics:', error);
      process.exit(1);
    }
  });

metricsCommand
  .command('trends')
  .description('Show testing trends')
  .option('-p, --period <period>', 'Time period (daily, weekly, monthly)', 'daily')
  .action(async (options) => {
    try {
      console.log(`?? Generating ${options.period} testing trends...`);
      const trends = metricsCollector.generateTestTrends(options.period as 'daily' | 'weekly' | 'monthly');
      
      console.log('\n?? Testing Trends');
      console.log('=================');
      
      const latest = {
        success: trends.metrics.successRate[trends.metrics.successRate.length - 1]?.value || 0,
        coverage: trends.metrics.coverage[trends.metrics.coverage.length - 1]?.value || 0,
        performance: trends.metrics.performance[trends.metrics.performance.length - 1]?.value || 0,
        reliability: trends.metrics.reliability[trends.metrics.reliability.length - 1]?.value || 0
      };
      
      console.log(`Success Rate Trend: ${latest.success.toFixed(1)}% ${getTrendEmoji(trends.metrics.successRate)}`);
      console.log(`Coverage Trend: ${latest.coverage.toFixed(1)}% ${getTrendEmoji(trends.metrics.coverage)}`);
      console.log(`Performance Trend: ${latest.performance.toFixed(1)}% ${getTrendEmoji(trends.metrics.performance)}`);
      console.log(`Reliability Trend: ${latest.reliability.toFixed(1)}% ${getTrendEmoji(trends.metrics.reliability)}`);
      
      if (trends.alerts.length > 0) {
        console.log(`\n?? Active Alerts (${trends.alerts.length}):`);
        trends.alerts.slice(0, 5).forEach(alert => {
          const emoji = getSeverityEmoji(alert.severity);
          console.log(`  ${emoji} ${alert.message}`);
        });
      }
      
    } catch (error) {
      console.error('? Failed to get trends:', error);
      process.exit(1);
    }
  });

metricsCommand
  .command('export')
  .description('Export metrics in various formats')
  .option('-f, --format <format>', 'Export format (json, csv, prometheus)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    try {
      console.log(`?? Exporting metrics in ${options.format} format...`);
      const data = metricsCollector.exportMetrics(options.format as 'json' | 'csv' | 'prometheus');
      
      if (options.output) {
        require('fs').writeFileSync(options.output, data);
        console.log(`? Metrics exported to: ${options.output}`);
      } else {
        console.log('\n?? Exported Metrics:');
        console.log(data);
      }
      
    } catch (error) {
      console.error('? Failed to export metrics:', error);
      process.exit(1);
    }
  });

// ============================
// Report Commands
// ============================

const reportCommand = program
  .command('report')
  .description('Generate and send testing reports');

reportCommand
  .command('daily')
  .description('Generate and send daily report')
  .action(async () => {
    try {
      console.log('?? Generating daily testing report...');
      await reportingSystem.generateDailyReport();
      console.log('? Daily report generated and sent successfully');
    } catch (error) {
      console.error('? Failed to generate daily report:', error);
      process.exit(1);
    }
  });

reportCommand
  .command('weekly')
  .description('Generate and send weekly report')
  .action(async () => {
    try {
      console.log('?? Generating weekly testing report...');
      await reportingSystem.generateWeeklyReport();
      console.log('? Weekly report generated and sent successfully');
    } catch (error) {
      console.error('? Failed to generate weekly report:', error);
      process.exit(1);
    }
  });

reportCommand
  .command('test-alert')
  .description('Send a test alert notification')
  .option('-s, --severity <severity>', 'Alert severity (info, warning, error, critical)', 'info')
  .option('-m, --message <message>', 'Alert message', 'Test alert from CLI')
  .action(async (options) => {
    try {
      console.log('?? Sending test alert...');
      
      const alert = {
        id: `test-${Date.now()}`,
        timestamp: new Date(),
        severity: options.severity as 'info' | 'warning' | 'error' | 'critical',
        type: 'build_failure' as const,
        message: options.message,
        details: { source: 'CLI test', timestamp: new Date().toISOString() },
        acknowledged: false
      };
      
      await reportingSystem.sendAlertNotification(alert);
      console.log('? Test alert sent successfully');
    } catch (error) {
      console.error('? Failed to send test alert:', error);
      process.exit(1);
    }
  });

// ============================
// Utility Commands
// ============================

program
  .command(DB_FIELDS.TECH_QUEUE.STATUS)
  .description('Show overall testing system status')
  .action(async () => {
    try {
      console.log('?? Checking testing system status...\n');
      
      const dashboardData = metricsCollector.generateDashboardData();
      const health = dashboardData.health;
      const summary = dashboardData.summary;
      
      console.log('?? Attrition MMO Testing System Status');
      console.log('=====================================');
      console.log(`Overall Health: ${health.overallHealthScore}% ${getHealthEmoji(health.overallHealthScore)}`);
      console.log(`Tests Today: ${summary.testsToday}`);
      console.log(`Success Rate: ${summary.successRateToday.toFixed(1)}%`);
      console.log(`Critical Alerts: ${summary.criticalAlerts} ${summary.criticalAlerts > 0 ? '??' : '?'}`);
      console.log('');
      
      console.log('?? Health Breakdown:');
      console.log(`  Coverage: ${health.coverageScore}% ${getScoreEmoji(health.coverageScore)}`);
      console.log(`  Performance: ${health.performanceScore}% ${getScoreEmoji(health.performanceScore)}`);
      console.log(`  Reliability: ${health.reliabilityScore}% ${getScoreEmoji(health.reliabilityScore)}`);
      console.log('');
      
      if (dashboardData.alerts.length > 0) {
        console.log(`?? Recent Alerts (${dashboardData.alerts.length}):`);
        dashboardData.alerts.slice(0, 3).forEach(alert => {
          const emoji = getSeverityEmoji(alert.severity);
          console.log(`  ${emoji} ${alert.message}`);
        });
        if (dashboardData.alerts.length > 3) {
          console.log(`  ... and ${dashboardData.alerts.length - 3} more`);
        }
      }
      
    } catch (error) {
      console.error('? Failed to get system status:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize testing metrics and dashboard directories')
  .action(async () => {
    try {
      console.log('?? Initializing testing metrics system...');
      
      const directories = [
        'test-metrics',
        'test-metrics/executions',
        'test-metrics/coverage', 
        'test-metrics/performance',
        'test-metrics/health',
        'test-metrics/alerts',
        'test-dashboards',
        'test-reports'
      ];
      
      directories.forEach(dir => {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
          console.log(`?? Created directory: ${dir}`);
        }
      });
      
      // Generate initial dashboards
      dashboardGenerator.generateAllDashboards();
      console.log('?? Generated initial dashboards');
      
      console.log('\n? Testing metrics system initialized successfully!');
      console.log('?? Run `testing-dashboard-cli status` to check system status');
      console.log('?? Run `testing-dashboard-cli dashboard serve` to view dashboards');
      
    } catch (error) {
      console.error('? Failed to initialize system:', error);
      process.exit(1);
    }
  });

// ============================
// Helper Functions
// ============================

function getHealthEmoji(score: number): string {
  if (score >= 90) return '??';
  if (score >= 80) return '?';
  if (score >= 70) return '??';
  if (score >= 60) return '??';
  return '?';
}

function getScoreEmoji(score: number): string {
  if (score >= 80) return '?';
  if (score >= 60) return '??';
  return '?';
}

function getSeverityEmoji(severity: string): string {
  const emojis = {
    critical: '??',
    error: '?',
    warning: '??',
    info: '??'
  };
  return emojis[severity as keyof typeof emojis] || '??';
}

function getTrendEmoji(data: Array<{ date: string; value: number }>): string {
  if (data.length < 2) return '??';
  
  const recent = data.slice(-2);
  const change = recent[1].value - recent[0].value;
  const threshold = recent[0].value * 0.05;
  
  if (Math.abs(change) < threshold) return '??';
  return change > 0 ? '??' : '??';
}

// ============================
// Error Handling
// ============================

process.on('uncaughtException', (error) => {
  console.error('?? Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('?? Unhandled Rejection:', reason);
  process.exit(1);
});

// ============================
// Main Execution
// ============================

if (require.main === module) {
  program.parse(process.argv);
}

export {
  metricsCollector,
  dashboardGenerator,
  reportingSystem
};



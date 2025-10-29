import { FILE_PATHS, DIRECTORY_PATHS } from '@game/shared';

/**
 * Testing Dashboard Generator
 * 
 * This module generates comprehensive HTML dashboards for visualizing testing
 * metrics, trends, and health indicators for the Attrition MMO testing pipeline.
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { HTTP_STATUS } from '../constants/response-formats';

export interface DashboardTheme {
  primaryColor: string;
  secondaryColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  backgroundColor: string;
  textColor: string;
  cardBackground: string;
}

export class DashboardGenerator {
  private metricsCollector: TestingMetricsCollector;
  private outputDir: string;
  private theme: DashboardTheme;

  constructor(metricsCollector: TestingMetricsCollector, outputDir?: string) {
    this.metricsCollector = metricsCollector;
    this.outputDir = outputDir || join(process.cwd(), 'test-dashboards');
    this.theme = {
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      successColor: '#10b981',
      warningColor: '#f59e0b',
      errorColor: '#ef4444',
      backgroundColor: '#f8fafc',
      textColor: '#1e293b',
      cardBackground: '#ffffff'
    };

    this.ensureOutputDirectoryExists();
  }

  private ensureOutputDirectoryExists(): void {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate the main testing dashboard
   */
  generateMainDashboard(): string {
    const dashboardData = this.metricsCollector.generateDashboardData();
    const html = this.createMainDashboardHTML(dashboardData);
    
    const filePath = join(this.outputDir, FILE_PATHS.INDEX_HTML);
    writeFileSync(filePath, html);
    
    return filePath;
  }

  /**
   * Generate a coverage-focused dashboard
   */
  generateCoverageDashboard(): string {
    const dashboardData = this.metricsCollector.generateDashboardData();
    const html = this.createCoverageDashboardHTML(dashboardData);
    
    const filePath = join(this.outputDir, 'coverage.html');
    writeFileSync(filePath, html);
    
    return filePath;
  }

  /**
   * Generate a performance-focused dashboard
   */
  generatePerformanceDashboard(): string {
    const dashboardData = this.metricsCollector.generateDashboardData();
    const html = this.createPerformanceDashboardHTML(dashboardData);
    
    const filePath = join(this.outputDir, 'performance.html');
    writeFileSync(filePath, html);
    
    return filePath;
  }

  /**
   * Generate an alerts dashboard
   */
  generateAlertsDashboard(): string {
    const dashboardData = this.metricsCollector.generateDashboardData();
    const html = this.createAlertsDashboardHTML(dashboardData);
    
    const filePath = join(this.outputDir, 'alerts.html');
    writeFileSync(filePath, html);
    
    return filePath;
  }

  /**
   * Generate all dashboards
   */
  generateAllDashboards(): string[] {
    return [
      this.generateMainDashboard(),
      this.generateCoverageDashboard(),
      this.generatePerformanceDashboard(),
      this.generateAlertsDashboard()
    ];
  }

  private createMainDashboardHTML(data: any): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attrition MMO - Testing Dashboard</title>
    ${this.getCommonStyles()}
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    ${this.getNavigation('main')}
    
    <div class="container">
        <header class="dashboard-header">
            <h1>🧪 Testing Dashboard</h1>
            <p class="subtitle">Comprehensive testing metrics and health indicators</p>
            <div class="last-updated">Last updated: ${new Date().toLocaleString()}</div>
        </header>

        <!-- Summary Cards -->
        <div class="summary-grid">
            ${this.createSummaryCard('Tests Today', data.summary.testsToday.toString(), '🔬', this.theme.primaryColor)}
            ${this.createSummaryCard('Success Rate', `${data.summary.successRateToday.toFixed(1)}%`, '✅', this.getSuccessColor(data.summary.successRateToday))}
            ${this.createSummaryCard('Avg Execution Time', `${(data.summary.avgExecutionTime / 1000).toFixed(1)}s`, '⏱️', this.theme.secondaryColor)}
            ${this.createSummaryCard('Critical Alerts', data.summary.criticalAlerts.toString(), '🚨', data.summary.criticalAlerts > 0 ? this.theme.errorColor : this.theme.successColor)}
        </div>

        <!-- Health Score -->
        <div class="card">
            <h3>📊 Overall Health Score</h3>
            <div class="health-score-container">
                ${this.createHealthScoreGauge(data.health.overallHealthScore)}
                <div class="health-breakdown">
                    <div class="health-metric">
                        <span class="label">Coverage:</span>
                        <span class="value">${data.health.coverageScore}%</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${data.health.coverageScore}%; background-color: ${this.getScoreColor(data.health.coverageScore)}"></div>
                        </div>
                    </div>
                    <div class="health-metric">
                        <span class="label">Performance:</span>
                        <span class="value">${data.health.performanceScore}%</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${data.health.performanceScore}%; background-color: ${this.getScoreColor(data.health.performanceScore)}"></div>
                        </div>
                    </div>
                    <div class="health-metric">
                        <span class="label">Reliability:</span>
                        <span class="value">${data.health.reliabilityScore}%</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${data.health.reliabilityScore}%; background-color: ${this.getScoreColor(data.health.reliabilityScore)}"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Trends Charts -->
        <div class="charts-grid">
            <div class="card">
                <h3>📈 Success Rate Trend</h3>
                <canvas id="successRateChart"></canvas>
            </div>
            <div class="card">
                <h3>⏱️ Execution Time Trend</h3>
                <canvas id="executionTimeChart"></canvas>
            </div>
        </div>

        <!-- Test Results Overview -->
        <div class="card">
            <h3>🧪 Test Results Overview</h3>
            <div class="test-overview-grid">
                <div class="test-type-stats">
                    <h4>Recent Test Execution</h4>
                    <div class="stat-row">
                        <span>Total Tests:</span>
                        <span>${data.health.totalTests}</span>
                    </div>
                    <div class="stat-row">
                        <span>Passed:</span>
                        <span class="success">${data.health.passedTests}</span>
                    </div>
                    <div class="stat-row">
                        <span>Failed:</span>
                        <span class="error">${data.health.failedTests}</span>
                    </div>
                    <div class="stat-row">
                        <span>Skipped:</span>
                        <span class="warning">${data.health.skippedTests}</span>
                    </div>
                </div>
                <div class="test-issues">
                    <h4>Test Issues</h4>
                    ${data.health.flakyTests.length > 0 ? `
                        <div class="issue-section">
                            <h5>🔄 Flaky Tests (${data.health.flakyTests.length})</h5>
                            <ul class="flaky-tests-list">
${data.health.flakyTests.slice(0, 5).map((test: string) => `<li>${test}</li>`).join('')}
                                ${data.health.flakyTests.length > 5 ? `<li><em>... and ${data.health.flakyTests.length - 5} more</em></li>` : ''}
                            </ul>
                        </div>
                    ` : '<p class="no-issues">No flaky tests detected 🎉</p>'}
                    
                    ${data.health.slowTests.length > 0 ? `
                        <div class="issue-section">
                            <h5>🐌 Slow Tests (${data.health.slowTests.length})</h5>
                            <ul class="slow-tests-list">
${data.health.slowTests.slice(0, 5).map((test: { name: string; avgDuration: number }) => `<li>${test.name} <span class="duration">(${(test.avgDuration / 1000).toFixed(1)}s)</span></li>`).join('')}
                            </ul>
                        </div>
                    ` : '<p class="no-issues">No slow tests detected ⚡</p>'}
                </div>
            </div>
        </div>

        <!-- Recent Alerts -->
        ${this.createAlertsSection(data.alerts.slice(0, 5))}
    </div>

    <script>
        ${this.getChartJS(data)}
    </script>
</body>
</html>`;
  }

  private createCoverageDashboardHTML(data: any): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attrition MMO - Coverage Dashboard</title>
    ${this.getCommonStyles()}
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    ${this.getNavigation(DIRECTORY_PATHS.COVERAGE)}
    
    <div class="container">
        <header class="dashboard-header">
            <h1>📊 Coverage Dashboard</h1>
            <p class="subtitle">Code coverage metrics and trends</p>
        </header>

        <!-- Coverage Overview -->
        <div class="summary-grid">
            ${this.createSummaryCard('Overall Coverage', `${data.health.coverageScore}%`, '📊', this.getScoreColor(data.health.coverageScore))}
            ${this.createSummaryCard('Uncovered Files', data.coverage.length > 0 ? data.coverage[data.coverage.length - 1].uncoveredFiles.length.toString() : '0', '📁', this.theme.warningColor)}
            ${this.createSummaryCard('Coverage Trend', this.getCoverageTrend(data.trends), '📈', this.theme.primaryColor)}
        </div>

        <!-- Coverage Trend Chart -->
        <div class="card">
            <h3>📈 Coverage Trend (7 days)</h3>
            <canvas id="coverageTrendChart"></canvas>
        </div>

        <!-- Critical Files Coverage -->
        <div class="card">
            <h3>🎯 Critical Files Coverage</h3>
            <div class="critical-files-grid">
                ${this.createCriticalFilesCoverage(data.coverage)}
            </div>
        </div>

        <!-- Coverage Alerts -->
        ${this.createCoverageAlertsSection(data.alerts.filter((alert: TestAlert) => alert.type === 'coverage_drop'))}
    </div>

    <script>
        ${this.getCoverageChartJS(data)}
    </script>
</body>
</html>`;
  }

  private createPerformanceDashboardHTML(data: any): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attrition MMO - Performance Dashboard</title>
    ${this.getCommonStyles()}
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    ${this.getNavigation('performance')}
    
    <div class="container">
        <header class="dashboard-header">
            <h1>⚡ Performance Dashboard</h1>
            <p class="subtitle">Test performance metrics and regression analysis</p>
        </header>

        <!-- Performance Overview -->
        <div class="summary-grid">
            ${this.createSummaryCard('Performance Score', `${data.health.performanceScore}%`, '⚡', this.getScoreColor(data.health.performanceScore))}
            ${this.createSummaryCard('Avg Execution Time', `${(data.summary.avgExecutionTime / 1000).toFixed(1)}s`, '⏱️', this.theme.secondaryColor)}
            ${this.createSummaryCard('Performance Alerts', data.alerts.filter((a: TestAlert) => a.type === 'performance_regression').length.toString(), '🚨', this.theme.errorColor)}
        </div>

        <!-- Performance Trends -->
        <div class="charts-grid">
            <div class="card">
                <h3>📈 Performance Score Trend</h3>
                <canvas id="performanceScoreChart"></canvas>
            </div>
            <div class="card">
                <h3>⏱️ Execution Time Trend</h3>
                <canvas id="executionTimeTrendChart"></canvas>
            </div>
        </div>

        <!-- Performance Metrics Table -->
        <div class="card">
            <h3>📊 Recent Performance Metrics</h3>
            <div class="performance-table-container">
                ${this.createPerformanceTable(data.performance)}
            </div>
        </div>

        <!-- Performance Regressions -->
        ${this.createPerformanceRegressionsSection(data.alerts.filter((alert: TestAlert) => alert.type === 'performance_regression'))}
    </div>

    <script>
        ${this.getPerformanceChartJS(data)}
    </script>
</body>
</html>`;
  }

  private createAlertsDashboardHTML(data: any): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attrition MMO - Alerts Dashboard</title>
    ${this.getCommonStyles()}
</head>
<body>
    ${this.getNavigation('alerts')}
    
    <div class="container">
        <header class="dashboard-header">
            <h1>🚨 Alerts Dashboard</h1>
            <p class="subtitle">Active alerts and test issues</p>
        </header>

        <!-- Alert Summary -->
        <div class="summary-grid">
            ${this.createSummaryCard('Total Alerts', data.alerts.length.toString(), '🚨', this.theme.errorColor)}
            ${this.createSummaryCard('Critical', data.alerts.filter((a: TestAlert) => a.severity === 'critical').length.toString(), '💥', this.theme.errorColor)}
            ${this.createSummaryCard('Errors', data.alerts.filter((a: TestAlert) => a.severity === 'error').length.toString(), '❌', this.theme.errorColor)}
            ${this.createSummaryCard('Warnings', data.alerts.filter((a: TestAlert) => a.severity === 'warning').length.toString(), '⚠️', this.theme.warningColor)}
        </div>

        <!-- Alert Types Distribution -->
        <div class="card">
            <h3>📊 Alert Types Distribution</h3>
            <div class="alert-types-grid">
                ${this.createAlertTypesDistribution(data.alerts)}
            </div>
        </div>

        <!-- Active Alerts -->
        <div class="card">
            <h3>🔴 Active Alerts</h3>
            <div class="alerts-list">
                ${this.createAlertsList(data.alerts)}
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private getCommonStyles(): string {
    return `<style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: ${this.theme.backgroundColor};
            color: ${this.theme.textColor};
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .navigation {
            background: ${this.theme.cardBackground};
            padding: 15px 0;
            margin-bottom: 20px;
            border-bottom: 1px solid #e2e8f0;
        }

        .nav-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            align-items: center;
            gap: 30px;
        }

        .nav-brand {
            font-size: 18px;
            font-weight: bold;
            color: ${this.theme.primaryColor};
        }

        .nav-links {
            display: flex;
            gap: 20px;
        }

        .nav-link {
            text-decoration: none;
            color: ${this.theme.secondaryColor};
            padding: 8px 16px;
            border-radius: 6px;
            transition: all 0.2s;
        }

        .nav-link.active {
            background-color: ${this.theme.primaryColor};
            color: white;
        }

        .nav-link:hover:not(.active) {
            background-color: #e2e8f0;
        }

        .dashboard-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .dashboard-header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            color: ${this.theme.primaryColor};
        }

        .subtitle {
            font-size: 1.1rem;
            color: ${this.theme.secondaryColor};
            margin-bottom: 10px;
        }

        .last-updated {
            font-size: 0.9rem;
            color: ${this.theme.secondaryColor};
            font-style: italic;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .summary-card {
            background: ${this.theme.cardBackground};
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border-left: 4px solid;
        }

        .summary-card .icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }

        .summary-card .title {
            font-size: 0.9rem;
            color: ${this.theme.secondaryColor};
            margin-bottom: 5px;
        }

        .summary-card .value {
            font-size: 2rem;
            font-weight: bold;
            color: ${this.theme.textColor};
        }

        .card {
            background: ${this.theme.cardBackground};
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }

        .card h3 {
            margin-bottom: 20px;
            color: ${this.theme.textColor};
            font-size: 1.3rem;
        }

        .health-score-container {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 30px;
            align-items: center;
        }

        .health-gauge {
            width: 180px;
            height: 180px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            font-weight: bold;
            color: white;
            position: relative;
        }

        .health-breakdown {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .health-metric {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .health-metric .label {
            min-width: 100px;
            font-weight: HTTP_STATUS.INTERNAL_SERVER_ERROR;
        }

        .health-metric .value {
            min-width: 50px;
            font-weight: bold;
        }

        .progress-bar {
            flex: 1;
            height: 8px;
            background-color: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            transition: width 0.3s ease;
        }

        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .test-overview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }

        .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }

        .success { color: ${this.theme.successColor}; }
        .warning { color: ${this.theme.warningColor}; }
        .error { color: ${this.theme.errorColor}; }

        .issue-section {
            margin-bottom: 20px;
        }

        .issue-section h5 {
            margin-bottom: 10px;
            color: ${this.theme.textColor};
        }

        .flaky-tests-list,
        .slow-tests-list {
            list-style: none;
            padding: 0;
        }

        .flaky-tests-list li,
        .slow-tests-list li {
            padding: 5px 10px;
            margin: 3px 0;
            background-color: #fef3c7;
            border-radius: 4px;
            font-size: 0.9rem;
        }

        .duration {
            color: ${this.theme.secondaryColor};
            font-size: 0.8rem;
        }

        .no-issues {
            color: ${this.theme.successColor};
            font-style: italic;
        }

        .alerts-section {
            margin-top: 20px;
        }

        .alert-item {
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            border-left: 4px solid;
        }

        .alert-item.critical {
            background-color: #fef2f2;
            border-left-color: #dc2626;
        }

        .alert-item.error {
            background-color: #fef2f2;
            border-left-color: #ef4444;
        }

        .alert-item.warning {
            background-color: #fffbeb;
            border-left-color: #f59e0b;
        }

        .alert-item.info {
            background-color: #eff6ff;
            border-left-color: #3b82f6;
        }

        .alert-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }

        .alert-message {
            font-weight: HTTP_STATUS.INTERNAL_SERVER_ERROR;
        }

        .alert-time {
            font-size: 0.8rem;
            color: ${this.theme.secondaryColor};
        }

        .alert-details {
            font-size: 0.9rem;
            color: ${this.theme.secondaryColor};
            margin-top: 5px;
        }

        .performance-table-container {
            overflow-x: auto;
        }

        .performance-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        .performance-table th,
        .performance-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }

        .performance-table th {
            background-color: #f8fafc;
            font-weight: 600;
        }

        .performance-table td.regression-positive {
            color: ${this.theme.errorColor};
        }

        .performance-table td.regression-negative {
            color: ${this.theme.successColor};
        }

        .alert-types-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }

        .alert-type-card {
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }

        .alert-type-card.coverage { background-color: #fef3c7; }
        .alert-type-card.performance { background-color: #dbeafe; }
        .alert-type-card.reliability { background-color: #fce7f3; }
        .alert-type-card.build { background-color: #fef2f2; }

        .alert-type-count {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .alert-type-label {
            font-size: 0.9rem;
            color: ${this.theme.secondaryColor};
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }

            .dashboard-header h1 {
                font-size: 2rem;
            }

            .summary-grid {
                grid-template-columns: 1fr;
            }

            .charts-grid {
                grid-template-columns: 1fr;
            }

            .health-score-container {
                grid-template-columns: 1fr;
                text-align: center;
            }

            .test-overview-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>`;
  }

  private getNavigation(activeTab: string): string {
    const tabs = [
      { key: 'main', label: '🏠 Overview', href: FILE_PATHS.INDEX_HTML },
      { key: DIRECTORY_PATHS.COVERAGE, label: '📊 Coverage', href: 'coverage.html' },
      { key: 'performance', label: '⚡ Performance', href: 'performance.html' },
      { key: 'alerts', label: '🚨 Alerts', href: 'alerts.html' }
    ];

    return `
    <nav class="navigation">
        <div class="nav-container">
            <div class="nav-brand">Attrition MMO Testing</div>
            <div class="nav-links">
                ${tabs.map(tab => `
                    <a href="${tab.href}" class="nav-link ${tab.key === activeTab ? 'active' : ''}">${tab.label}</a>
                `).join('')}
            </div>
        </div>
    </nav>`;
  }

  private createSummaryCard(title: string, value: string, icon: string, color: string): string {
    return `
    <div class="summary-card" style="border-left-color: ${color}">
        <div class="icon">${icon}</div>
        <div class="title">${title}</div>
        <div class="value" style="color: ${color}">${value}</div>
    </div>`;
  }

  private createHealthScoreGauge(score: number): string {
    const color = this.getScoreColor(score);
    return `
    <div class="health-gauge" style="background: conic-gradient(${color} ${score * 3.6}deg, #e2e8f0 0deg);">
        <div style="background: ${this.theme.cardBackground}; width: 140px; height: 140px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${this.theme.textColor};">
            ${score}%
        </div>
    </div>`;
  }

  private createAlertsSection(alerts: TestAlert[]): string {
    if (alerts.length === 0) {
      return `
      <div class="card">
          <h3>🚨 Recent Alerts</h3>
          <p class="no-issues">No recent alerts 🎉</p>
      </div>`;
    }

    return `
    <div class="card">
        <h3>🚨 Recent Alerts</h3>
        <div class="alerts-section">
            ${alerts.map(alert => `
                <div class="alert-item ${alert.severity}">
                    <div class="alert-header">
                        <div class="alert-message">${alert.message}</div>
                        <div class="alert-time">${this.formatTime(alert.timestamp)}</div>
                    </div>
                    ${alert.details ? `<div class="alert-details">${this.formatAlertDetails(alert.details)}</div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>`;
  }

  private createCriticalFilesCoverage(coverage: any[]): string {
    if (coverage.length === 0) return '<p>No coverage data available</p>';
    
    const latestCoverage = coverage[coverage.length - 1];
    if (!latestCoverage.criticalFilesCoverage) {
      return '<p>No critical files coverage data available</p>';
    }

    return Object.entries(latestCoverage.criticalFilesCoverage)
      .map(([file, percent]: [string, any]) => `
        <div class="critical-file-item">
            <div class="file-name">${file}</div>
            <div class="coverage-bar">
                <div class="coverage-fill" style="width: ${percent}%; background-color: ${this.getScoreColor(percent)}"></div>
            </div>
            <div class="coverage-percent">${percent}%</div>
        </div>
      `).join('');
  }

  private createPerformanceTable(performance: any[]): string {
    if (performance.length === 0) {
      return '<p>No performance data available</p>';
    }

    const recentPerformance = performance.slice(-10);
    
    return `
    <table class="performance-table">
        <thead>
            <tr>
                <th>Operation</th>
                <th>Duration (ms)</th>
                <th>Memory (MB)</th>
                <th>Regression Score</th>
                <th>Error Rate</th>
                <th>Timestamp</th>
            </tr>
        </thead>
        <tbody>
            ${recentPerformance.map(perf => `
                <tr>
                    <td>${perf.operation}</td>
                    <td>${perf.duration.toFixed(1)}</td>
                    <td>${(perf.memoryUsage / 1024 / 1024).toFixed(1)}</td>
                    <td class="${perf.regressionScore < 0 ? 'regression-positive' : 'regression-negative'}">
                        ${(perf.regressionScore * 100).toFixed(1)}%
                    </td>
                    <td>${(perf.errorRate * 100).toFixed(1)}%</td>
                    <td>${this.formatTime(perf.timestamp)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>`;
  }

  private createAlertTypesDistribution(alerts: TestAlert[]): string {
    const alertTypes = {
      coverage: alerts.filter(a => a.type === 'coverage_drop').length,
      performance: alerts.filter(a => a.type === 'performance_regression').length,
      reliability: alerts.filter(a => a.type === 'reliability_decline' || a.type === 'flaky_test').length,
      build: alerts.filter(a => a.type === 'build_failure').length
    };

    return Object.entries(alertTypes)
      .map(([type, count]) => `
        <div class="alert-type-card ${type}">
            <div class="alert-type-count">${count}</div>
            <div class="alert-type-label">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
        </div>
      `).join('');
  }

  private createAlertsList(alerts: TestAlert[]): string {
    if (alerts.length === 0) {
      return '<p class="no-issues">No active alerts 🎉</p>';
    }

    return alerts.map(alert => `
      <div class="alert-item ${alert.severity}">
          <div class="alert-header">
              <div class="alert-message">${alert.message}</div>
              <div class="alert-time">${this.formatTime(alert.timestamp)}</div>
          </div>
          ${alert.details ? `<div class="alert-details">${this.formatAlertDetails(alert.details)}</div>` : ''}
      </div>
    `).join('');
  }

  private createCoverageAlertsSection(alerts: TestAlert[]): string {
    if (alerts.length === 0) {
      return `
      <div class="card">
          <h3>⚠️ Coverage Alerts</h3>
          <p class="no-issues">No coverage alerts 🎉</p>
      </div>`;
    }

    return `
    <div class="card">
        <h3>⚠️ Coverage Alerts</h3>
        <div class="alerts-section">
            ${this.createAlertsList(alerts)}
        </div>
    </div>`;
  }

  private createPerformanceRegressionsSection(alerts: TestAlert[]): string {
    if (alerts.length === 0) {
      return `
      <div class="card">
          <h3>📉 Performance Regressions</h3>
          <p class="no-issues">No performance regressions detected 🎉</p>
      </div>`;
    }

    return `
    <div class="card">
        <h3>📉 Performance Regressions</h3>
        <div class="alerts-section">
            ${this.createAlertsList(alerts)}
        </div>
    </div>`;
  }

  private getChartJS(data: any): string {
    return `
    // Success Rate Chart
    const successCtx = document.getElementById('successRateChart').getContext('2d');
    new Chart(successCtx, {
        type: 'line',
        data: {
            labels: ${JSON.stringify(data.trends.metrics.successRate.map((d: any) => d.date))},
            datasets: [{
                label: 'Success Rate (%)',
                data: ${JSON.stringify(data.trends.metrics.successRate.map((d: any) => d.value))},
                borderColor: '${this.theme.successColor}',
                backgroundColor: '${this.theme.successColor}20',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Execution Time Chart
    const execCtx = document.getElementById('executionTimeChart').getContext('2d');
    new Chart(execCtx, {
        type: 'line',
        data: {
            labels: ${JSON.stringify(data.trends.metrics.executionTime.map((d: any) => d.date))},
            datasets: [{
                label: 'Avg Execution Time (ms)',
                data: ${JSON.stringify(data.trends.metrics.executionTime.map((d: any) => d.value))},
                borderColor: '${this.theme.primaryColor}',
                backgroundColor: '${this.theme.primaryColor}20',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });`;
  }

  private getCoverageChartJS(data: any): string {
    return `
    const coverageCtx = document.getElementById('coverageTrendChart').getContext('2d');
    new Chart(coverageCtx, {
        type: 'line',
        data: {
            labels: ${JSON.stringify(data.trends.metrics.coverage.map((d: any) => d.date))},
            datasets: [{
                label: 'Coverage (%)',
                data: ${JSON.stringify(data.trends.metrics.coverage.map((d: any) => d.value))},
                borderColor: '${this.theme.primaryColor}',
                backgroundColor: '${this.theme.primaryColor}20',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });`;
  }

  private getPerformanceChartJS(data: any): string {
    return `
    // Performance Score Chart
    const perfScoreCtx = document.getElementById('performanceScoreChart').getContext('2d');
    new Chart(perfScoreCtx, {
        type: 'line',
        data: {
            labels: ${JSON.stringify(data.trends.metrics.performance.map((d: any) => d.date))},
            datasets: [{
                label: 'Performance Score (%)',
                data: ${JSON.stringify(data.trends.metrics.performance.map((d: any) => d.value))},
                borderColor: '${this.theme.successColor}',
                backgroundColor: '${this.theme.successColor}20',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Execution Time Trend Chart
    const execTrendCtx = document.getElementById('executionTimeTrendChart').getContext('2d');
    new Chart(execTrendCtx, {
        type: 'line',
        data: {
            labels: ${JSON.stringify(data.trends.metrics.executionTime.map((d: any) => d.date))},
            datasets: [{
                label: 'Avg Execution Time (ms)',
                data: ${JSON.stringify(data.trends.metrics.executionTime.map((d: any) => d.value))},
                borderColor: '${this.theme.primaryColor}',
                backgroundColor: '${this.theme.primaryColor}20',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });`;
  }

  // Helper methods
  private getSuccessColor(rate: number): string {
    if (rate >= 95) return this.theme.successColor;
    if (rate >= 85) return this.theme.warningColor;
    return this.theme.errorColor;
  }

  private getScoreColor(score: number): string {
    if (score >= 80) return this.theme.successColor;
    if (score >= 60) return this.theme.warningColor;
    return this.theme.errorColor;
  }

  private getCoverageTrend(trends: TestTrend): string {
    const recent = trends.metrics.coverage.slice(-2);
    if (recent.length < 2) return '📊';
    
    const change = recent[1].value - recent[0].value;
    if (change > 0) return '📈';
    if (change < 0) return '📉';
    return '➡️';
  }

  private formatTime(timestamp: Date | string): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  private formatAlertDetails(details: Record<string, any>): string {
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }
}

export default DashboardGenerator;



import { DIRECTORY_PATHS } from '@game/shared';

/**
 * Automated Testing Reporting System
 * 
 * This module provides automated reporting and notification capabilities
 * for testing metrics, including daily/weekly reports, Slack notifications,
 * and email alerts for the Attrition MMO testing pipeline.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { TestingMetricsCollector, TestAlert, TestHealthMetrics } from './testing-metrics-framework';
import DashboardGenerator from './dashboard-generator';

export interface NotificationConfig {
  slack?: {
    webhookUrl: string;
    channel: string;
    username?: string;
  };
  email?: {
    smtpHost: string;
    smtpPort: number;
    username: string;
    password: string;
    from: string;
    recipients: string[];
  };
  teams?: {
    webhookUrl: string;
  };
}

export interface ReportConfig {
  enabled: boolean;
  schedule: 'daily' | 'weekly' | 'monthly';
  includeCharts: boolean;
  includeTrends: boolean;
  includeAlerts: boolean;
  customThresholds?: {
    coverageWarning: number;
    performanceWarning: number;
    reliabilityWarning: number;
  };
}

export interface ReportData {
  timestamp: Date;
  period: string;
  summary: {
    totalTests: number;
    successRate: number;
    avgExecutionTime: number;
    coverageScore: number;
    performanceScore: number;
    reliabilityScore: number;
    overallHealthScore: number;
    criticalAlerts: number;
  };
  trends: {
    coverageTrend: 'up' | 'down' | 'stable';
    performanceTrend: 'up' | 'down' | 'stable';
    reliabilityTrend: 'up' | 'down' | 'stable';
    testVolumeTrend: 'up' | 'down' | 'stable';
  };
  topIssues: {
    flakyTests: string[];
    slowTests: Array<{ name: string; avgDuration: number }>;
    coverageGaps: string[];
    performanceRegressions: string[];
  };
  alerts: TestAlert[];
  recommendations: string[];
}

export class AutomatedReportingSystem {
  private metricsCollector: TestingMetricsCollector;
  private dashboardGenerator: DashboardGenerator;
  private notificationConfig: NotificationConfig;
  private reportConfig: ReportConfig;

  constructor(
    metricsCollector: TestingMetricsCollector,
    notificationConfig: NotificationConfig = {},
    reportConfig: Partial<ReportConfig> = {}
  ) {
    this.metricsCollector = metricsCollector;
    this.dashboardGenerator = new DashboardGenerator(metricsCollector);
    this.notificationConfig = notificationConfig;
    this.reportConfig = {
      enabled: true,
      schedule: 'daily',
      includeCharts: true,
      includeTrends: true,
      includeAlerts: true,
      customThresholds: {
        coverageWarning: 80,
        performanceWarning: 75,
        reliabilityWarning: 90
      },
      ...reportConfig
    };
  }

  /**
   * Generate and send daily testing report
   */
  async generateDailyReport(): Promise<void> {
    if (!this.reportConfig.enabled) return;

    console.log('📊 Generating daily testing report...');

    const reportData = this.generateReportData('daily');
    const reportHtml = this.generateReportHTML(reportData);
    
    // Save report to file
    const reportPath = join(process.cwd(), 'test-reports', `daily-report-${this.getDateString()}.html`);
    writeFileSync(reportPath, reportHtml);

    // Send notifications
    await this.sendSlackReport(reportData, 'daily');
    await this.sendEmailReport(reportData, 'daily', reportHtml);

    console.log(`✅ Daily report generated and sent: ${reportPath}`);
  }

  /**
   * Generate and send weekly testing report
   */
  async generateWeeklyReport(): Promise<void> {
    if (!this.reportConfig.enabled) return;

    console.log('📊 Generating weekly testing report...');

    const reportData = this.generateReportData('weekly');
    const reportHtml = this.generateReportHTML(reportData);
    
    // Save report to file
    const reportPath = join(process.cwd(), 'test-reports', `weekly-report-${this.getWeekString()}.html`);
    writeFileSync(reportPath, reportHtml);

    // Generate comprehensive dashboard
    this.dashboardGenerator.generateAllDashboards();

    // Send notifications
    await this.sendSlackReport(reportData, 'weekly');
    await this.sendEmailReport(reportData, 'weekly', reportHtml);

    console.log(`✅ Weekly report generated and sent: ${reportPath}`);
  }

  /**
   * Send immediate alert notification
   */
  async sendAlertNotification(alert: TestAlert): Promise<void> {
    console.log(`🚨 Sending alert notification: ${alert.message}`);

    // Send Slack notification
    if (this.notificationConfig.slack) {
      await this.sendSlackAlert(alert);
    }

    // Send email notification for critical alerts
    if (this.notificationConfig.email && (alert.severity === 'critical' || alert.severity === 'error')) {
      await this.sendEmailAlert(alert);
    }

    console.log('✅ Alert notification sent');
  }

  /**
   * Send health status update
   */
  async sendHealthStatusUpdate(health: TestHealthMetrics): Promise<void> {
    if (health.overallHealthScore < 70) { // Health score below 70%
      const alert: TestAlert = {
        id: `health-${Date.now()}`,
        timestamp: new Date(),
        severity: health.overallHealthScore < 50 ? 'critical' : 'warning',
        type: 'reliability_decline',
        message: `Testing health score dropped to ${health.overallHealthScore}%`,
        details: {
          coverage: health.coverageScore,
          performance: health.performanceScore,
          reliability: health.reliabilityScore,
          failedTests: health.failedTests,
          flakyTests: health.flakyTests.length
        },
        acknowledged: false
      };

      await this.sendAlertNotification(alert);
    }
  }

  /**
   * Generate comprehensive report data
   */
  private generateReportData(period: 'daily' | 'weekly' | 'monthly'): ReportData {
    const dashboardData = this.metricsCollector.generateDashboardData();
    const trends = this.metricsCollector.generateTestTrends(period);
    
    return {
      timestamp: new Date(),
      period,
      summary: {
        totalTests: dashboardData.summary.testsToday,
        successRate: dashboardData.summary.successRateToday,
        avgExecutionTime: dashboardData.summary.avgExecutionTime,
        coverageScore: dashboardData.health.coverageScore,
        performanceScore: dashboardData.health.performanceScore,
        reliabilityScore: dashboardData.health.reliabilityScore,
        overallHealthScore: dashboardData.health.overallHealthScore,
        criticalAlerts: dashboardData.summary.criticalAlerts
      },
      trends: {
        coverageTrend: this.calculateTrend(trends.metrics.coverage),
        performanceTrend: this.calculateTrend(trends.metrics.performance),
        reliabilityTrend: this.calculateTrend(trends.metrics.reliability),
        testVolumeTrend: this.calculateTrend(trends.metrics.executionTime.map(d => ({ ...d, value: 1 }))) // Simplified
      },
      topIssues: {
        flakyTests: dashboardData.health.flakyTests.slice(0, 5),
        slowTests: dashboardData.health.slowTests.slice(0, 5),
        coverageGaps: this.identifyCoverageGaps(dashboardData.coverage),
        performanceRegressions: this.identifyPerformanceRegressions(dashboardData.performance)
      },
      alerts: dashboardData.alerts.slice(0, 10),
      recommendations: this.generateRecommendations(dashboardData)
    };
  }

  /**
   * Generate HTML report
   */
  private generateReportHTML(data: ReportData): string {
    const trendIcon = (trend: 'up' | 'down' | 'stable') => {
      switch (trend) {
        case 'up': return '📈';
        case 'down': return '📉';
        case 'stable': return '➡️';
      }
    };

    const healthColor = (score: number) => {
      if (score >= 80) return '#10b981';
      if (score >= 60) return '#f59e0b';
      return '#ef4444';
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attrition MMO - ${data.period.charAt(0).toUpperCase() + data.period.slice(1)} Testing Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
        }
        .report-title {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        .report-date {
            opacity: 0.9;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid;
        }
        .card-title {
            font-size: 0.9rem;
            color: #666;
            margin-bottom: 8px;
        }
        .card-value {
            font-size: 1.8rem;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .card-trend {
            font-size: 0.8rem;
            color: #666;
        }
        .section {
            background: white;
            padding: 25px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-title {
            font-size: 1.3rem;
            margin-bottom: 15px;
            color: #2563eb;
        }
        .issue-list {
            list-style: none;
            padding: 0;
        }
        .issue-item {
            padding: 8px 12px;
            margin: 5px 0;
            background-color: #fef3c7;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        .alert-item {
            padding: 12px;
            margin: 8px 0;
            border-radius: 6px;
            border-left: 4px solid;
        }
        .alert-critical { background-color: #fef2f2; border-left-color: #dc2626; }
        .alert-error { background-color: #fef2f2; border-left-color: #ef4444; }
        .alert-warning { background-color: #fffbeb; border-left-color: #f59e0b; }
        .alert-info { background-color: #eff6ff; border-left-color: #3b82f6; }
        .recommendation-list {
            list-style: none;
            padding: 0;
        }
        .recommendation-item {
            padding: 10px 15px;
            margin: 8px 0;
            background-color: #e0f2fe;
            border-radius: 6px;
            border-left: 4px solid #0891b2;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #666;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="report-header">
        <h1 class="report-title">🧪 ${data.period.charAt(0).toUpperCase() + data.period.slice(1)} Testing Report</h1>
        <p class="report-date">Generated on ${data.timestamp.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
    </div>

    <div class="summary-grid">
        <div class="summary-card" style="border-left-color: #2563eb">
            <div class="card-title">Overall Health Score</div>
            <div class="card-value" style="color: ${healthColor(data.summary.overallHealthScore)}">${data.summary.overallHealthScore}%</div>
        </div>
        <div class="summary-card" style="border-left-color: ${healthColor(data.summary.successRate)}">
            <div class="card-title">Success Rate</div>
            <div class="card-value" style="color: ${healthColor(data.summary.successRate)}">${data.summary.successRate.toFixed(1)}%</div>
        </div>
        <div class="summary-card" style="border-left-color: #10b981">
            <div class="card-title">Total Tests</div>
            <div class="card-value">${data.summary.totalTests}</div>
            <div class="card-trend">${trendIcon(data.trends.testVolumeTrend)} Volume trend</div>
        </div>
        <div class="summary-card" style="border-left-color: ${data.summary.criticalAlerts > 0 ? '#ef4444' : '#10b981'}">
            <div class="card-title">Critical Alerts</div>
            <div class="card-value" style="color: ${data.summary.criticalAlerts > 0 ? '#ef4444' : '#10b981'}">${data.summary.criticalAlerts}</div>
        </div>
    </div>

    <div class="summary-grid">
        <div class="summary-card" style="border-left-color: ${healthColor(data.summary.coverageScore)}">
            <div class="card-title">Coverage Score</div>
            <div class="card-value" style="color: ${healthColor(data.summary.coverageScore)}">${data.summary.coverageScore}%</div>
            <div class="card-trend">${trendIcon(data.trends.coverageTrend)} Coverage trend</div>
        </div>
        <div class="summary-card" style="border-left-color: ${healthColor(data.summary.performanceScore)}">
            <div class="card-title">Performance Score</div>
            <div class="card-value" style="color: ${healthColor(data.summary.performanceScore)}">${data.summary.performanceScore}%</div>
            <div class="card-trend">${trendIcon(data.trends.performanceTrend)} Performance trend</div>
        </div>
        <div class="summary-card" style="border-left-color: ${healthColor(data.summary.reliabilityScore)}">
            <div class="card-title">Reliability Score</div>
            <div class="card-value" style="color: ${healthColor(data.summary.reliabilityScore)}">${data.summary.reliabilityScore}%</div>
            <div class="card-trend">${trendIcon(data.trends.reliabilityTrend)} Reliability trend</div>
        </div>
        <div class="summary-card" style="border-left-color: #64748b">
            <div class="card-title">Avg Execution Time</div>
            <div class="card-value">${(data.summary.avgExecutionTime / 1000).toFixed(1)}s</div>
        </div>
    </div>

    ${data.topIssues.flakyTests.length > 0 ? `
    <div class="section">
        <h2 class="section-title">🔄 Flaky Tests (${data.topIssues.flakyTests.length})</h2>
        <ul class="issue-list">
            ${data.topIssues.flakyTests.map(test => `<li class="issue-item">${test}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${data.topIssues.slowTests.length > 0 ? `
    <div class="section">
        <h2 class="section-title">🐌 Slow Tests (${data.topIssues.slowTests.length})</h2>
        <ul class="issue-list">
${data.topIssues.slowTests.map(test => `<li class=\"issue-item\">${test.name} - ${(test.avgDuration / 1000).toFixed(1)}s</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${data.alerts.length > 0 ? `
    <div class="section">
        <h2 class="section-title">🚨 Recent Alerts (${data.alerts.length})</h2>
        ${data.alerts.map(alert => `
            <div class="alert-item alert-${alert.severity}">
                <strong>${alert.message}</strong>
                <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">
                    ${alert.timestamp.toLocaleString()}
                </div>
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${data.recommendations.length > 0 ? `
    <div class="section">
        <h2 class="section-title">💡 Recommendations</h2>
        <ul class="recommendation-list">
            ${data.recommendations.map(rec => `<li class="recommendation-item">${rec}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="footer">
        <p>This report was automatically generated by the Attrition MMO Testing System</p>
        <p>For more detailed metrics, visit the <a href="./test-dashboards/index.html">Testing Dashboard</a></p>
    </div>
</body>
</html>`;
  }

  /**
   * Send Slack report notification
   */
  private async sendSlackReport(data: ReportData, period: string): Promise<void> {
    if (!this.notificationConfig.slack) return;

    const healthEmoji = data.summary.overallHealthScore >= 80 ? '✅' : 
                       data.summary.overallHealthScore >= 60 ? '⚠️' : '❌';

    const message = {
      username: this.notificationConfig.slack.username || 'Attrition Testing Bot',
      channel: this.notificationConfig.slack.channel,
      attachments: [{
        color: data.summary.overallHealthScore >= 80 ? 'good' : 
               data.summary.overallHealthScore >= 60 ? 'warning' : 'danger',
        title: `${healthEmoji} ${period.charAt(0).toUpperCase() + period.slice(1)} Testing Report`,
        fields: [
          {
            title: 'Overall Health',
            value: `${data.summary.overallHealthScore}%`,
            short: true
          },
          {
            title: 'Success Rate',
            value: `${data.summary.successRate.toFixed(1)}%`,
            short: true
          },
          {
            title: 'Total Tests',
            value: data.summary.totalTests.toString(),
            short: true
          },
          {
            title: 'Critical Alerts',
            value: data.summary.criticalAlerts.toString(),
            short: true
          },
          {
            title: DIRECTORY_PATHS.COVERAGE,
            value: `${data.summary.coverageScore}% ${this.getTrendEmoji(data.trends.coverageTrend)}`,
            short: true
          },
          {
            title: 'Performance',
            value: `${data.summary.performanceScore}% ${this.getTrendEmoji(data.trends.performanceTrend)}`,
            short: true
          }
        ],
        footer: 'Attrition MMO Testing System',
        ts: Math.floor(data.timestamp.getTime() / 1000)
      }]
    };

    try {
      const response = await fetch(this.notificationConfig.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Send Slack alert notification
   */
  private async sendSlackAlert(alert: TestAlert): Promise<void> {
    if (!this.notificationConfig.slack) return;

    const severityEmoji = {
      critical: '💥',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const severityColor = {
      critical: 'danger',
      error: 'danger',
      warning: 'warning',
      info: 'good'
    };

    const message = {
      username: this.notificationConfig.slack.username || 'Attrition Testing Bot',
      channel: this.notificationConfig.slack.channel,
      attachments: [{
        color: severityColor[alert.severity],
        title: `${severityEmoji[alert.severity]} Testing Alert: ${alert.type.replace('_', ' ').toUpperCase()}`,
        text: alert.message,
        fields: alert.details ? Object.entries(alert.details).map(([key, value]) => ({
          title: key.replace('_', ' ').toUpperCase(),
          value: value.toString(),
          short: true
        })) : [],
        footer: 'Attrition MMO Testing System',
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };

    try {
      const response = await fetch(this.notificationConfig.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  /**
   * Send email report (simplified - would need proper email service integration)
   */
  private async sendEmailReport(data: ReportData, period: string, htmlContent: string): Promise<void> {
    if (!this.notificationConfig.email) return;

    // This is a simplified placeholder - in production, you would use:
    // - nodemailer for SMTP
    // - AWS SES
    // - SendGrid
    // - Other email service providers

    console.log('📧 Email report would be sent to:', this.notificationConfig.email.recipients);
    console.log('📧 Subject:', `Attrition MMO - ${period} Testing Report - Health: ${data.summary.overallHealthScore}%`);
    
    // Save email content for reference
    const emailPath = join(process.cwd(), 'test-reports', `email-${period}-${this.getDateString()}.html`);
    writeFileSync(emailPath, htmlContent);
    console.log('📧 Email content saved to:', emailPath);
  }

  /**
   * Send email alert (simplified)
   */
  private async sendEmailAlert(alert: TestAlert): Promise<void> {
    if (!this.notificationConfig.email) return;

    console.log('📧 Alert email would be sent to:', this.notificationConfig.email.recipients);
    console.log('📧 Alert:', alert.message);
  }

  // Helper methods

  private calculateTrend(data: Array<{ date: string; value: number }>): 'up' | 'down' | 'stable' {
    if (data.length < 2) return 'stable';
    
    const recent = data.slice(-2);
    const change = recent[1].value - recent[0].value;
    const threshold = recent[0].value * 0.05; // 5% change threshold
    
    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  private getTrendEmoji(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
    }
  }

  private identifyCoverageGaps(coverage: any[]): string[] {
    // Simplified - would analyze actual coverage data
    return ['src/services/newFeature.ts', 'src/utils/helper.ts'];
  }

  private identifyPerformanceRegressions(performance: any[]): string[] {
    // Simplified - would analyze actual performance data
    const regressions = performance
      .filter(p => p.regressionScore < -0.15)
      .map(p => p.operation)
      .slice(0, 5);
    
    return regressions;
  }

  private generateRecommendations(dashboardData: any): string[] {
    const recommendations: string[] = [];

    if (dashboardData.health.coverageScore < 80) {
      recommendations.push('Increase test coverage by focusing on uncovered files and critical paths');
    }

    if (dashboardData.health.performanceScore < 75) {
      recommendations.push('Investigate performance regressions and optimize slow operations');
    }

    if (dashboardData.health.flakyTests.length > 5) {
      recommendations.push('Address flaky tests to improve reliability and reduce CI noise');
    }

    if (dashboardData.health.slowTests.length > 3) {
      recommendations.push('Optimize slow tests or consider splitting them into smaller units');
    }

    if (dashboardData.summary.criticalAlerts > 0) {
      recommendations.push('Address all critical alerts before next release');
    }

    return recommendations;
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getWeekString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = this.getWeekNumber(now);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}

export default AutomatedReportingSystem;

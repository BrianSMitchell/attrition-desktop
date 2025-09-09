# Testing Metrics Framework

A comprehensive testing metrics collection, analysis, and reporting system for the Attrition MMO project.

## Overview

This framework provides:
- **Metrics Collection**: Detailed tracking of test executions, coverage, performance, and reliability
- **Health Monitoring**: Real-time health scoring and trend analysis
- **Automated Reporting**: Daily/weekly reports with insights and recommendations
- **Alert System**: Proactive notifications for test failures and performance degradations
- **Visual Dashboards**: Interactive HTML dashboards with charts and metrics
- **CLI Management**: Command-line interface for easy system management

## Quick Start

### 1. Install Dependencies

```bash
npm install commander nodemailer
```

### 2. Environment Configuration

Create a `.env` file or set environment variables:

```bash
# Slack Integration (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Initialize the System

```bash
npm run test:init
```

### 4. Generate and View Dashboard

```bash
npm run test:dashboard
npm run test:serve
```

Visit `http://localhost:8080` to view the testing dashboard.

## Architecture

### Core Components

1. **TestingMetricsFramework** (`testing-metrics-framework.ts`)
   - Collects and stores test execution data
   - Calculates health scores and trends
   - Manages alerts and notifications

2. **DashboardGenerator** (`dashboard-generator.ts`)
   - Creates interactive HTML dashboards
   - Supports multiple view types (overview, coverage, performance, alerts)
   - Generates charts and visualizations

3. **AutomatedReporting** (`automated-reporting.ts`)
   - Sends daily/weekly reports
   - Provides Slack and email notifications
   - Generates insights and recommendations

4. **CLI Tool** (`testing-dashboard-cli.ts`)
   - Command-line interface for system management
   - Dashboard generation and serving
   - Metrics export and reporting

## Usage Examples

### Recording Test Metrics

```typescript
import { TestingMetricsFramework } from './testing-metrics-framework';

const framework = new TestingMetricsFramework();

// Record test execution
await framework.recordTestExecution({
  testSuite: 'unit-tests',
  testName: 'user-authentication',
  status: 'passed',
  duration: 150,
  timestamp: new Date(),
  metadata: {
    browser: 'chrome',
    environment: 'staging'
  }
});

// Record coverage data
await framework.recordCoverageMetrics({
  testSuite: 'integration-tests',
  linesCovered: 850,
  linesTotal: 1000,
  functionsCovered: 95,
  functionsTotal: 100,
  branchesCovered: 180,
  branchesTotal: 200
});
```

### Generating Reports

```typescript
import { AutomatedReporting } from './automated-reporting';

const reporting = new AutomatedReporting(framework);

// Generate daily report
const report = await reporting.generateDailyReport();
console.log(report);

// Send Slack notification
await reporting.sendSlackNotification(
  'Test suite health score dropped to 75%',
  'warning'
);
```

### Creating Dashboards

```typescript
import { DashboardGenerator } from './dashboard-generator';

const generator = new DashboardGenerator(framework);

// Generate main dashboard
await generator.generateDashboard('main');

// Start development server
generator.startDashboardServer(8080);
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npm run test:init` | Initialize system directories and configuration |
| `npm run test:dashboard` | Generate HTML dashboard |
| `npm run test:serve` | Start dashboard server on port 8080 |
| `npm run test:health` | Show current testing health status |
| `npm run test:trends` | Display testing trends and insights |
| `npm run test:export` | Export metrics to JSON/CSV/Prometheus format |
| `npm run test:report:daily` | Generate and display daily report |
| `npm run test:report:weekly` | Generate and display weekly report |
| `npm run test:alerts` | Send test failure notifications |
| `npm run test:status` | Check overall system status |

## Dashboard Views

### Main Dashboard
- Health score overview
- Test execution trends
- Coverage metrics
- Recent alerts

### Coverage Dashboard
- Line, function, and branch coverage trends
- Coverage by test suite
- Uncovered areas identification

### Performance Dashboard
- Test execution times
- Performance trends
- Slow test identification
- Resource utilization

### Alerts Dashboard
- Active alerts
- Alert history
- Resolution tracking
- Escalation management

## Health Scoring

The framework calculates a composite health score based on:

- **Test Success Rate** (40%): Percentage of tests passing
- **Coverage Score** (25%): Average of line, function, and branch coverage
- **Performance Score** (20%): Based on test execution times
- **Reliability Score** (15%): Consistency of test results over time

Health scores are categorized as:
- 🟢 **Excellent** (90-100%): All metrics performing well
- 🟡 **Good** (75-89%): Minor issues present
- 🟠 **Fair** (60-74%): Several areas need attention
- 🔴 **Poor** (<60%): Critical issues requiring immediate action

## Alert Types

1. **Test Failures**: Individual or suite-level failures
2. **Coverage Drops**: Significant decreases in code coverage
3. **Performance Issues**: Slow or degrading test execution
4. **Flaky Tests**: Tests with inconsistent results
5. **System Health**: Overall health score degradation

## Integration

### CI/CD Pipeline Integration

```yaml
# Example GitHub Actions integration
- name: Run Tests with Metrics
  run: |
    npm test
    node dist/testing/testing-dashboard-cli.js health
    node dist/testing/testing-dashboard-cli.js export --format prometheus

- name: Upload Coverage
  uses: actions/upload-artifact@v3
  with:
    name: coverage-report
    path: testing-data/dashboards/
```

### Monitoring Integration

The framework supports exporting metrics to:
- **Prometheus**: For integration with Grafana dashboards
- **JSON/CSV**: For data analysis and reporting tools
- **Webhook**: For custom integrations and notifications

## Configuration

### Thresholds

Default alert thresholds (configurable):

```typescript
const config = {
  healthScore: {
    critical: 60,
    warning: 75
  },
  coverage: {
    critical: 70,
    warning: 80
  },
  performance: {
    slowTest: 5000,    // 5 seconds
    timeoutAlert: 30000 // 30 seconds
  },
  reliability: {
    flakyThreshold: 0.1 // 10% failure rate
  }
};
```

### Retention

- **Metrics Data**: 30 days by default
- **Alert History**: 90 days
- **Dashboard Reports**: 7 days
- **Performance Logs**: 14 days

## Best Practices

1. **Regular Monitoring**: Check health scores daily
2. **Trend Analysis**: Review weekly reports for patterns
3. **Alert Responsiveness**: Address alerts promptly
4. **Coverage Goals**: Maintain >80% coverage across all metrics
5. **Performance Optimization**: Keep test execution under target times
6. **Flaky Test Management**: Identify and fix inconsistent tests

## Troubleshooting

### Common Issues

**Dashboard Not Generating**
- Check permissions on `testing-data/` directory
- Verify Node.js version compatibility
- Ensure all dependencies are installed

**Notifications Not Working**
- Verify environment variables are set correctly
- Check network connectivity for Slack/SMTP
- Validate webhook URLs and credentials

**Performance Issues**
- Monitor data retention settings
- Consider archiving old metrics
- Optimize dashboard queries for large datasets

### Debug Mode

Enable debug logging:

```bash
DEBUG=testing:* npm run test:dashboard
```

## Contributing

When adding new metrics or features:

1. Update the TypeScript interfaces
2. Add corresponding dashboard visualizations
3. Include alert configurations
4. Update CLI commands as needed
5. Add tests for new functionality
6. Update this documentation

## License

This testing framework is part of the Attrition MMO project and follows the same licensing terms.

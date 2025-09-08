/**
 * Attrition Issue Metrics and Reporting Dashboard
 * Provides comprehensive metrics and insights for issue resolution tracking
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class IssueMetricsDashboard extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            dataPath: config.dataPath || './data/metrics',
            retentionDays: config.retentionDays || 90,
            refreshInterval: config.refreshInterval || 300000, // 5 minutes
            githubToken: config.githubToken || process.env.GITHUB_TOKEN,
            repoOwner: config.repoOwner || 'attrition-org',
            repoName: config.repoName || 'attrition',
            ...config
        };

        // Metrics storage
        this.metrics = {
            issues: new Map(),
            dailyMetrics: [],
            teamMetrics: new Map(),
            componentMetrics: new Map(),
            slaMetrics: {
                responseTime: [],
                resolutionTime: [],
                breaches: []
            }
        };

        // Team performance tracking
        this.teamPerformance = {
            'frontend-team': { resolved: 0, assigned: 0, avgResolutionTime: 0 },
            'backend-team': { resolved: 0, assigned: 0, avgResolutionTime: 0 },
            'desktop-team': { resolved: 0, assigned: 0, avgResolutionTime: 0 },
            'security-team': { resolved: 0, assigned: 0, avgResolutionTime: 0 },
            'devops-team': { resolved: 0, assigned: 0, avgResolutionTime: 0 },
            'docs-team': { resolved: 0, assigned: 0, avgResolutionTime: 0 }
        };

        this.initializeMetricsDashboard();
    }

    /**
     * Initialize the metrics dashboard
     */
    async initializeMetricsDashboard() {
        console.log('📊 Initializing Issue Metrics Dashboard...');
        
        // Ensure data directory exists
        await fs.mkdir(this.config.dataPath, { recursive: true });
        
        // Load existing metrics data
        await this.loadMetricsData();
        
        // Start periodic metrics collection
        this.startMetricsCollection();
        
        console.log('✅ Issue Metrics Dashboard initialized');
    }

    /**
     * Collect current metrics snapshot
     */
    async collectMetricsSnapshot() {
        const timestamp = new Date().toISOString();
        console.log(`📊 Collecting metrics snapshot at ${timestamp}`);
        
        try {
            // Collect issue metrics
            const issueMetrics = await this.collectIssueMetrics();
            
            // Collect team metrics  
            const teamMetrics = await this.collectTeamMetrics();
            
            // Collect component metrics
            const componentMetrics = await this.collectComponentMetrics();
            
            // Collect SLA metrics
            const slaMetrics = await this.collectSLAMetrics();
            
            // Create daily snapshot
            const dailySnapshot = {
                timestamp,
                date: timestamp.split('T')[0],
                issues: issueMetrics,
                teams: teamMetrics,
                components: componentMetrics,
                sla: slaMetrics,
                summary: this.generateSummaryMetrics(issueMetrics, teamMetrics, slaMetrics)
            };
            
            // Store snapshot
            this.metrics.dailyMetrics.push(dailySnapshot);
            
            // Keep only recent snapshots
            const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
            this.metrics.dailyMetrics = this.metrics.dailyMetrics.filter(
                snapshot => new Date(snapshot.timestamp) > cutoff
            );
            
            // Save metrics data
            await this.saveMetricsData();
            
            // Emit metrics collected event
            this.emit('metricsCollected', dailySnapshot);
            
            return dailySnapshot;
            
        } catch (error) {
            console.error('Failed to collect metrics snapshot:', error);
            throw error;
        }
    }

    /**
     * Collect issue-related metrics
     */
    async collectIssueMetrics() {
        // In a real implementation, this would fetch from GitHub API
        // For now, we'll simulate the data structure
        
        const mockIssueData = {
            total: 145,
            open: 32,
            closed: 113,
            byType: {
                bug: 78,
                feature: 45,
                enhancement: 15,
                documentation: 7
            },
            bySeverity: {
                critical: 3,
                high: 12,
                medium: 28,
                low: 35
            },
            byPriority: {
                'P0': 2,
                'P1': 8,
                'P2': 22,
                'P3': 43
            },
            byStatus: {
                'triage-needed': 5,
                'in-progress': 12,
                'needs-reproduction': 8,
                'awaiting-response': 7,
                'ready-for-testing': 4,
                'resolved': 89,
                'closed': 24
            },
            ageDistribution: {
                'new': 15,      // < 1 day
                'recent': 28,   // 1-7 days  
                'aging': 22,    // 1-4 weeks
                'stale': 8      // > 4 weeks
            }
        };
        
        return mockIssueData;
    }

    /**
     * Collect team performance metrics
     */
    async collectTeamMetrics() {
        const teamMetrics = {};
        
        for (const [teamName, performance] of Object.entries(this.teamPerformance)) {
            // Calculate team-specific metrics
            const avgResolutionDays = performance.avgResolutionTime / (24 * 60 * 60 * 1000);
            const resolutionRate = performance.assigned > 0 ? 
                (performance.resolved / performance.assigned * 100) : 0;
            
            teamMetrics[teamName] = {
                assignedIssues: performance.assigned,
                resolvedIssues: performance.resolved,
                resolutionRate: Math.round(resolutionRate * 100) / 100,
                avgResolutionTime: Math.round(avgResolutionDays * 100) / 100,
                workload: performance.assigned - performance.resolved,
                efficiency: this.calculateTeamEfficiency(teamName)
            };
        }
        
        return teamMetrics;
    }

    /**
     * Collect component-based metrics
     */
    async collectComponentMetrics() {
        const componentMetrics = {
            'ui': { issues: 28, resolved: 22, avgResolution: 3.5 },
            'backend': { issues: 35, resolved: 28, avgResolution: 5.2 },
            'desktop': { issues: 18, resolved: 15, avgResolution: 4.1 },
            'database': { issues: 12, resolved: 10, avgResolution: 6.8 },
            'auth': { issues: 8, resolved: 7, avgResolution: 3.9 },
            'build': { issues: 15, resolved: 12, avgResolution: 2.3 },
            'docs': { issues: 6, resolved: 5, avgResolution: 1.8 }
        };
        
        // Calculate component health scores
        for (const [component, metrics] of Object.entries(componentMetrics)) {
            metrics.resolutionRate = (metrics.resolved / metrics.issues * 100).toFixed(1);
            metrics.healthScore = this.calculateComponentHealth(metrics);
        }
        
        return componentMetrics;
    }

    /**
     * Collect SLA compliance metrics
     */
    async collectSLAMetrics() {
        return {
            responseCompliance: {
                overall: 87.5,
                bySeverity: {
                    critical: 95.0,
                    high: 88.2,
                    medium: 85.1,
                    low: 82.3
                }
            },
            resolutionCompliance: {
                overall: 78.3,
                bySeverity: {
                    critical: 85.7,
                    high: 76.9,
                    medium: 75.8,
                    low: 82.1
                }
            },
            escalations: {
                total: 15,
                byLevel: {
                    level1: 8,
                    level2: 5,
                    level3: 2
                },
                resolved: 12
            },
            breaches: {
                response: 8,
                resolution: 15,
                totalIssuesAffected: 18
            }
        };
    }

    /**
     * Generate summary metrics
     */
    generateSummaryMetrics(issueMetrics, teamMetrics, slaMetrics) {
        const totalTeamResolved = Object.values(teamMetrics)
            .reduce((sum, team) => sum + team.resolvedIssues, 0);
        
        const avgTeamResolutionTime = Object.values(teamMetrics)
            .reduce((sum, team) => sum + team.avgResolutionTime, 0) / Object.keys(teamMetrics).length;
        
        return {
            issueVelocity: totalTeamResolved,
            overallHealth: this.calculateOverallHealth(issueMetrics, slaMetrics),
            productivity: this.calculateProductivityScore(teamMetrics),
            qualityScore: this.calculateQualityScore(issueMetrics, slaMetrics),
            avgResolutionTime: Math.round(avgTeamResolutionTime * 100) / 100,
            criticalIssuesOpen: issueMetrics.bySeverity.critical,
            slaComplianceOverall: (slaMetrics.responseCompliance.overall + slaMetrics.resolutionCompliance.overall) / 2
        };
    }

    /**
     * Generate comprehensive dashboard report
     */
    generateDashboardReport(timeRange = '30d') {
        const cutoffDate = new Date(Date.now() - this.parseTimeToMs(timeRange));
        const relevantSnapshots = this.metrics.dailyMetrics.filter(
            snapshot => new Date(snapshot.timestamp) > cutoffDate
        );
        
        if (relevantSnapshots.length === 0) {
            return { error: 'No data available for specified time range' };
        }
        
        const latestSnapshot = relevantSnapshots[relevantSnapshots.length - 1];
        
        return {
            generatedAt: new Date().toISOString(),
            timeRange,
            period: {
                start: cutoffDate.toISOString(),
                end: new Date().toISOString(),
                snapshots: relevantSnapshots.length
            },
            
            // Current state
            current: {
                timestamp: latestSnapshot.timestamp,
                summary: latestSnapshot.summary,
                issues: latestSnapshot.issues,
                teams: latestSnapshot.teams,
                sla: latestSnapshot.sla
            },
            
            // Trends and analysis
            trends: this.calculateTrends(relevantSnapshots),
            
            // Performance analysis
            performance: {
                topPerformingTeams: this.getTopPerformingTeams(latestSnapshot.teams),
                bottomPerformingComponents: this.getBottomPerformingComponents(latestSnapshot.components),
                slaViolations: this.analyzeSLAViolations(relevantSnapshots),
                issueFlowAnalysis: this.analyzeIssueFlow(relevantSnapshots)
            },
            
            // Recommendations
            recommendations: this.generateRecommendations(latestSnapshot, relevantSnapshots),
            
            // Alerts and warnings
            alerts: this.generateAlerts(latestSnapshot)
        };
    }

    /**
     * Calculate trends over time
     */
    calculateTrends(snapshots) {
        if (snapshots.length < 2) {
            return { insufficient_data: true };
        }
        
        const first = snapshots[0];
        const last = snapshots[snapshots.length - 1];
        
        return {
            issueVelocity: {
                current: last.summary.issueVelocity,
                previous: first.summary.issueVelocity,
                change: last.summary.issueVelocity - first.summary.issueVelocity,
                trend: last.summary.issueVelocity > first.summary.issueVelocity ? 'improving' : 'declining'
            },
            overallHealth: {
                current: last.summary.overallHealth,
                previous: first.summary.overallHealth,
                change: Math.round((last.summary.overallHealth - first.summary.overallHealth) * 100) / 100,
                trend: last.summary.overallHealth > first.summary.overallHealth ? 'improving' : 'declining'
            },
            slaCompliance: {
                current: last.summary.slaComplianceOverall,
                previous: first.summary.slaComplianceOverall,
                change: Math.round((last.summary.slaComplianceOverall - first.summary.slaComplianceOverall) * 100) / 100,
                trend: last.summary.slaComplianceOverall > first.summary.slaComplianceOverall ? 'improving' : 'declining'
            },
            criticalIssues: {
                current: last.summary.criticalIssuesOpen,
                previous: first.summary.criticalIssuesOpen,
                change: last.summary.criticalIssuesOpen - first.summary.criticalIssuesOpen,
                trend: last.summary.criticalIssuesOpen < first.summary.criticalIssuesOpen ? 'improving' : 'concerning'
            }
        };
    }

    /**
     * Generate actionable recommendations
     */
    generateRecommendations(latestSnapshot, historicalSnapshots) {
        const recommendations = [];
        
        // Check for high workload teams
        Object.entries(latestSnapshot.teams).forEach(([team, metrics]) => {
            if (metrics.workload > 10) {
                recommendations.push({
                    type: 'resource_allocation',
                    priority: 'high',
                    team: team,
                    message: `${team} has high workload (${metrics.workload} open issues). Consider redistributing work or adding resources.`,
                    action: 'redistribute_workload'
                });
            }
        });
        
        // Check for SLA compliance issues
        if (latestSnapshot.summary.slaComplianceOverall < 80) {
            recommendations.push({
                type: 'sla_compliance',
                priority: 'critical',
                message: `SLA compliance is below target (${latestSnapshot.summary.slaComplianceOverall}%). Review response and resolution processes.`,
                action: 'review_sla_processes'
            });
        }
        
        // Check for stale issues
        if (latestSnapshot.issues.ageDistribution.stale > 5) {
            recommendations.push({
                type: 'issue_management',
                priority: 'medium',
                message: `${latestSnapshot.issues.ageDistribution.stale} stale issues detected. Consider review and cleanup.`,
                action: 'cleanup_stale_issues'
            });
        }
        
        // Check for critical issues
        if (latestSnapshot.summary.criticalIssuesOpen > 1) {
            recommendations.push({
                type: 'critical_issues',
                priority: 'critical',
                message: `${latestSnapshot.summary.criticalIssuesOpen} critical issues are open. Immediate attention required.`,
                action: 'address_critical_issues'
            });
        }
        
        return recommendations;
    }

    /**
     * Generate alerts for dashboard
     */
    generateAlerts(latestSnapshot) {
        const alerts = [];
        
        // Critical issue alert
        if (latestSnapshot.summary.criticalIssuesOpen > 0) {
            alerts.push({
                severity: 'critical',
                type: 'critical_issues',
                message: `${latestSnapshot.summary.criticalIssuesOpen} critical issue(s) require immediate attention`,
                count: latestSnapshot.summary.criticalIssuesOpen
            });
        }
        
        // SLA breach alert
        if (latestSnapshot.summary.slaComplianceOverall < 75) {
            alerts.push({
                severity: 'high',
                type: 'sla_breach',
                message: `SLA compliance critically low at ${latestSnapshot.summary.slaComplianceOverall}%`,
                value: latestSnapshot.summary.slaComplianceOverall
            });
        }
        
        // Team overload alert
        Object.entries(latestSnapshot.teams).forEach(([team, metrics]) => {
            if (metrics.workload > 15) {
                alerts.push({
                    severity: 'medium',
                    type: 'team_overload',
                    message: `${team} is overloaded with ${metrics.workload} open issues`,
                    team: team,
                    workload: metrics.workload
                });
            }
        });
        
        return alerts;
    }

    /**
     * Get performance metrics for specific time periods
     */
    getPerformanceMetrics(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const relevantSnapshots = this.metrics.dailyMetrics.filter(snapshot => {
            const snapshotDate = new Date(snapshot.timestamp);
            return snapshotDate >= start && snapshotDate <= end;
        });
        
        if (relevantSnapshots.length === 0) {
            return { error: 'No data available for specified date range' };
        }
        
        return {
            period: { start: startDate, end: endDate },
            snapshots: relevantSnapshots.length,
            averages: this.calculateAverageMetrics(relevantSnapshots),
            totals: this.calculateTotalMetrics(relevantSnapshots),
            trends: this.calculatePeriodTrends(relevantSnapshots)
        };
    }

    /**
     * Export dashboard data for external tools
     */
    async exportDashboardData(format = 'json') {
        const reportData = this.generateDashboardReport('30d');
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `attrition-metrics-${timestamp}.${format}`;
        const filepath = path.join(this.config.dataPath, filename);
        
        if (format === 'json') {
            await fs.writeFile(filepath, JSON.stringify(reportData, null, 2));
        } else if (format === 'csv') {
            const csvData = this.convertToCSV(reportData);
            await fs.writeFile(filepath, csvData);
        }
        
        return { filepath, data: reportData };
    }

    /**
     * Helper calculation methods
     */
    calculateTeamEfficiency(teamName) {
        // Placeholder calculation - would use real team data
        return Math.round((Math.random() * 30 + 70) * 100) / 100; // 70-100%
    }

    calculateComponentHealth(metrics) {
        const resolutionFactor = metrics.resolutionRate / 100;
        const speedFactor = Math.max(0, (10 - metrics.avgResolution) / 10);
        return Math.round((resolutionFactor * 0.7 + speedFactor * 0.3) * 100);
    }

    calculateOverallHealth(issueMetrics, slaMetrics) {
        const criticalFactor = Math.max(0, (10 - issueMetrics.bySeverity.critical) / 10);
        const slaFactor = (slaMetrics.responseCompliance.overall + slaMetrics.resolutionCompliance.overall) / 200;
        return Math.round((criticalFactor * 0.4 + slaFactor * 0.6) * 100);
    }

    calculateProductivityScore(teamMetrics) {
        const teamScores = Object.values(teamMetrics).map(team => team.resolutionRate);
        const avgScore = teamScores.reduce((sum, score) => sum + score, 0) / teamScores.length;
        return Math.round(avgScore * 100) / 100;
    }

    calculateQualityScore(issueMetrics, slaMetrics) {
        const reopenRate = 5; // Placeholder - would calculate from real data
        const slaScore = (slaMetrics.responseCompliance.overall + slaMetrics.resolutionCompliance.overall) / 2;
        const qualityScore = (slaScore + (100 - reopenRate)) / 2;
        return Math.round(qualityScore * 100) / 100;
    }

    getTopPerformingTeams(teams) {
        return Object.entries(teams)
            .sort(([,a], [,b]) => b.efficiency - a.efficiency)
            .slice(0, 3)
            .map(([name, metrics]) => ({ team: name, ...metrics }));
    }

    getBottomPerformingComponents(components) {
        return Object.entries(components || {})
            .sort(([,a], [,b]) => a.healthScore - b.healthScore)
            .slice(0, 3)
            .map(([name, metrics]) => ({ component: name, ...metrics }));
    }

    analyzeSLAViolations(snapshots) {
        // Would analyze SLA violations over time
        return {
            trend: 'stable',
            frequentViolators: ['component:backend', 'component:database'],
            improvementNeeded: true
        };
    }

    analyzeIssueFlow(snapshots) {
        // Would analyze issue flow patterns
        return {
            avgTimeToTriage: 2.3,
            avgTimeInProgress: 5.8,
            avgTimeToClose: 7.2,
            bottlenecks: ['triage', 'testing']
        };
    }

    parseTimeToMs(timeString) {
        const timeMap = {
            '1d': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '90d': 90 * 24 * 60 * 60 * 1000
        };
        
        return timeMap[timeString] || timeMap['30d'];
    }

    /**
     * Data persistence methods
     */
    async loadMetricsData() {
        try {
            const metricsPath = path.join(this.config.dataPath, 'daily-metrics.json');
            const data = await fs.readFile(metricsPath, 'utf8');
            this.metrics.dailyMetrics = JSON.parse(data);
            
            console.log(`📊 Loaded ${this.metrics.dailyMetrics.length} metric snapshots`);
        } catch (error) {
            console.log('📊 No existing metrics data found, starting fresh');
        }
    }

    async saveMetricsData() {
        try {
            const metricsPath = path.join(this.config.dataPath, 'daily-metrics.json');
            await fs.writeFile(metricsPath, JSON.stringify(this.metrics.dailyMetrics, null, 2));
        } catch (error) {
            console.error('Failed to save metrics data:', error);
        }
    }

    startMetricsCollection() {
        // Collect initial snapshot
        this.collectMetricsSnapshot();
        
        // Set up periodic collection
        setInterval(() => {
            this.collectMetricsSnapshot();
        }, this.config.refreshInterval);
        
        console.log(`📊 Metrics collection started (${this.config.refreshInterval / 60000}-minute intervals)`);
    }

    convertToCSV(data) {
        // Basic CSV conversion - would be more sophisticated in real implementation
        const headers = ['Date', 'Total Issues', 'Open Issues', 'Resolved Issues', 'SLA Compliance'];
        const rows = [headers];
        
        // Add data rows (simplified example)
        rows.push([
            new Date().toISOString().split('T')[0],
            data.current.issues.total,
            data.current.issues.open,
            data.current.issues.closed,
            data.current.summary.slaComplianceOverall
        ]);
        
        return rows.map(row => row.join(',')).join('\n');
    }
}

module.exports = IssueMetricsDashboard;

/**
 * Beta Analytics and Monitoring System
 * Tracks user engagement, program health, and feedback analysis
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class BetaAnalytics extends EventEmitter {
    constructor(config) {
        super();
        
        this.config = {
            dataPath: config.dataPath || './data/analytics',
            retentionDays: config.retentionDays || 90,
            aggregationInterval: config.aggregationInterval || 3600000, // 1 hour
            alertThresholds: config.alertThresholds || {
                crashRate: 0.05, // 5% crash rate
                lowActivity: 0.3, // 30% of users inactive
                highSeverityBugs: 5, // 5+ high severity bugs per day
                userDropoff: 0.2 // 20% user dropoff
            },
            ...config
        };

        this.metrics = {
            users: new Map(),
            sessions: new Map(),
            crashes: new Map(),
            feedback: new Map(),
            downloads: new Map(),
            performance: new Map()
        };

        this.realTimeStats = {
            activeUsers: 0,
            totalSessions: 0,
            crashesLast24h: 0,
            feedbackLast24h: 0,
            avgSessionDuration: 0,
            topIssues: []
        };

        this.alerts = [];
        this.reports = new Map();
        
        this.initializeAnalytics();
    }

    async initializeAnalytics() {
        try {
            await fs.mkdir(this.config.dataPath, { recursive: true });
            await this.loadExistingData();
            this.startAggregationProcess();
            this.startHealthMonitoring();
            
            console.log('Beta analytics system initialized');
        } catch (error) {
            console.error('Failed to initialize analytics:', error);
        }
    }

    /**
     * Load existing analytics data
     */
    async loadExistingData() {
        const dataFiles = ['users.json', 'sessions.json', 'crashes.json', 'feedback.json', 'downloads.json'];
        
        for (const file of dataFiles) {
            try {
                const filePath = path.join(this.config.dataPath, file);
                const data = await fs.readFile(filePath, 'utf8');
                const parsed = JSON.parse(data);
                const metricName = file.replace('.json', '');
                
                if (parsed && Array.isArray(parsed)) {
                    this.metrics[metricName] = new Map(parsed);
                }
            } catch (error) {
                // File doesn't exist or is corrupt, start fresh
                console.log(`Creating new ${file} analytics data`);
            }
        }
    }

    /**
     * Save analytics data to disk
     */
    async saveAnalyticsData() {
        const dataToSave = {
            users: Array.from(this.metrics.users.entries()),
            sessions: Array.from(this.metrics.sessions.entries()),
            crashes: Array.from(this.metrics.crashes.entries()),
            feedback: Array.from(this.metrics.feedback.entries()),
            downloads: Array.from(this.metrics.downloads.entries()),
            performance: Array.from(this.metrics.performance.entries())
        };

        for (const [key, data] of Object.entries(dataToSave)) {
            try {
                const filePath = path.join(this.config.dataPath, `${key}.json`);
                await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            } catch (error) {
                console.error(`Failed to save ${key} analytics:`, error);
            }
        }
    }

    /**
     * Track user registration
     */
    trackUserRegistration(user) {
        const userId = user.id;
        const timestamp = new Date().toISOString();
        
        const userMetrics = {
            id: userId,
            phase: user.phase,
            role: user.role,
            registeredAt: timestamp,
            firstSession: null,
            lastActivity: null,
            totalSessions: 0,
            totalSessionTime: 0,
            crashCount: 0,
            feedbackCount: 0,
            platform: null,
            version: null,
            isActive: true,
            lifetimeValue: this.calculateUserLifetimeValue(user)
        };

        this.metrics.users.set(userId, userMetrics);
        this.emit('userRegistered', userMetrics);
        
        // Track registration by phase
        this.trackEvent('user_registration', {
            phase: user.phase,
            role: user.role,
            timestamp
        });
    }

    /**
     * Track user session
     */
    trackUserSession(sessionData) {
        const sessionId = sessionData.sessionId;
        const userId = sessionData.userId;
        const timestamp = new Date().toISOString();
        
        const session = {
            id: sessionId,
            userId: userId,
            startTime: timestamp,
            endTime: null,
            duration: null,
            platform: sessionData.platform,
            version: sessionData.version,
            actions: [],
            crashes: [],
            feedbackSubmitted: 0,
            features: sessionData.features || [],
            performance: {
                loadTime: sessionData.loadTime || null,
                memoryUsage: sessionData.memoryUsage || null,
                errors: []
            }
        };

        this.metrics.sessions.set(sessionId, session);
        
        // Update user metrics
        const userMetrics = this.metrics.users.get(userId);
        if (userMetrics) {
            if (!userMetrics.firstSession) {
                userMetrics.firstSession = timestamp;
            }
            userMetrics.lastActivity = timestamp;
            userMetrics.totalSessions++;
            userMetrics.platform = sessionData.platform;
            userMetrics.version = sessionData.version;
        }

        this.updateRealTimeStats();
        this.emit('sessionStarted', session);
    }

    /**
     * Track session end
     */
    trackSessionEnd(sessionId, endData = {}) {
        const session = this.metrics.sessions.get(sessionId);
        if (!session) return;

        const endTime = new Date().toISOString();
        const duration = new Date(endTime) - new Date(session.startTime);
        
        session.endTime = endTime;
        session.duration = duration;
        
        if (endData.actions) {
            session.actions = endData.actions;
        }

        // Update user total session time
        const userMetrics = this.metrics.users.get(session.userId);
        if (userMetrics) {
            userMetrics.totalSessionTime += duration;
        }

        this.updateRealTimeStats();
        this.emit('sessionEnded', session);
    }

    /**
     * Track crash report
     */
    trackCrash(crashData) {
        const crashId = crashData.id;
        const userId = crashData.userId;
        const timestamp = new Date().toISOString();
        
        const crash = {
            id: crashId,
            userId: userId,
            sessionId: crashData.sessionId,
            timestamp: timestamp,
            severity: crashData.severity,
            platform: crashData.platform,
            version: crashData.version,
            errorType: crashData.error?.type || 'Unknown',
            errorMessage: crashData.error?.message || '',
            route: crashData.appState?.route || '',
            features: crashData.appState?.activeFeatures || [],
            reproduced: false,
            fixed: false
        };

        this.metrics.crashes.set(crashId, crash);
        
        // Update user crash count
        const userMetrics = this.metrics.users.get(userId);
        if (userMetrics) {
            userMetrics.crashCount++;
        }

        // Add crash to session if exists
        const session = this.metrics.sessions.get(crashData.sessionId);
        if (session) {
            session.crashes.push(crashId);
        }

        this.checkCrashRateThreshold();
        this.updateRealTimeStats();
        this.emit('crashTracked', crash);
    }

    /**
     * Track feedback submission
     */
    trackFeedback(feedbackData) {
        const feedbackId = feedbackData.id;
        const userId = feedbackData.userId;
        const timestamp = new Date().toISOString();
        
        const feedback = {
            id: feedbackId,
            userId: userId,
            sessionId: feedbackData.sessionId,
            timestamp: timestamp,
            type: feedbackData.type,
            category: feedbackData.category || 'general',
            priority: feedbackData.priority || 'medium',
            sentiment: feedbackData.sentiment || 'neutral',
            platform: feedbackData.environment?.platform || 'unknown',
            version: feedbackData.environment?.version || 'unknown',
            resolved: false,
            helpful: null // Rating from developers
        };

        this.metrics.feedback.set(feedbackId, feedback);
        
        // Update user feedback count
        const userMetrics = this.metrics.users.get(userId);
        if (userMetrics) {
            userMetrics.feedbackCount++;
        }

        // Add feedback to session if exists
        const session = this.metrics.sessions.get(feedbackData.sessionId);
        if (session) {
            session.feedbackSubmitted++;
        }

        this.updateRealTimeStats();
        this.emit('feedbackTracked', feedback);
    }

    /**
     * Track download events
     */
    trackDownload(downloadData) {
        const downloadId = `${downloadData.platform}-${downloadData.timestamp}`;
        const timestamp = new Date().toISOString();
        
        const download = {
            id: downloadId,
            userId: downloadData.userId || null,
            timestamp: timestamp,
            platform: downloadData.platform,
            architecture: downloadData.arch || 'unknown',
            format: downloadData.format || 'unknown',
            version: downloadData.version || 'latest',
            source: downloadData.source || 'portal', // portal, discord, direct
            userAgent: downloadData.userAgent || null,
            ipAddress: this.hashIP(downloadData.ipAddress) // Privacy-safe hash
        };

        this.metrics.downloads.set(downloadId, download);
        this.emit('downloadTracked', download);
    }

    /**
     * Track performance metrics
     */
    trackPerformance(performanceData) {
        const metricId = `${performanceData.userId}-${Date.now()}`;
        const timestamp = new Date().toISOString();
        
        const performance = {
            id: metricId,
            userId: performanceData.userId,
            sessionId: performanceData.sessionId,
            timestamp: timestamp,
            metrics: {
                loadTime: performanceData.loadTime,
                memoryUsage: performanceData.memoryUsage,
                cpuUsage: performanceData.cpuUsage,
                renderTime: performanceData.renderTime,
                networkLatency: performanceData.networkLatency,
                diskIO: performanceData.diskIO
            },
            platform: performanceData.platform,
            version: performanceData.version,
            deviceSpecs: performanceData.deviceSpecs || {}
        };

        this.metrics.performance.set(metricId, performance);
        this.emit('performanceTracked', performance);
    }

    /**
     * Generate comprehensive analytics report
     */
    generateReport(timeRange = '7d') {
        const now = new Date();
        const startDate = this.getStartDate(now, timeRange);
        
        const report = {
            generatedAt: now.toISOString(),
            timeRange: timeRange,
            period: {
                start: startDate.toISOString(),
                end: now.toISOString()
            },
            overview: this.generateOverviewMetrics(startDate, now),
            users: this.generateUserMetrics(startDate, now),
            engagement: this.generateEngagementMetrics(startDate, now),
            quality: this.generateQualityMetrics(startDate, now),
            platforms: this.generatePlatformMetrics(startDate, now),
            feedback: this.generateFeedbackMetrics(startDate, now),
            performance: this.generatePerformanceMetrics(startDate, now),
            trends: this.generateTrendAnalysis(startDate, now),
            alerts: this.getActiveAlerts(),
            recommendations: this.generateRecommendations(startDate, now)
        };

        this.reports.set(now.getTime(), report);
        return report;
    }

    /**
     * Generate overview metrics
     */
    generateOverviewMetrics(startDate, endDate) {
        const users = Array.from(this.metrics.users.values());
        const sessions = Array.from(this.metrics.sessions.values());
        const crashes = Array.from(this.metrics.crashes.values());
        const feedback = Array.from(this.metrics.feedback.values());
        
        // Filter by date range
        const filteredSessions = sessions.filter(s => 
            new Date(s.startTime) >= startDate && new Date(s.startTime) <= endDate
        );
        const filteredCrashes = crashes.filter(c => 
            new Date(c.timestamp) >= startDate && new Date(c.timestamp) <= endDate
        );
        const filteredFeedback = feedback.filter(f => 
            new Date(f.timestamp) >= startDate && new Date(f.timestamp) <= endDate
        );

        return {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.isActive).length,
            totalSessions: filteredSessions.length,
            totalCrashes: filteredCrashes.length,
            totalFeedback: filteredFeedback.length,
            crashRate: filteredSessions.length > 0 ? filteredCrashes.length / filteredSessions.length : 0,
            avgSessionDuration: this.calculateAverageSessionDuration(filteredSessions),
            userGrowth: this.calculateUserGrowth(startDate, endDate)
        };
    }

    /**
     * Generate user metrics
     */
    generateUserMetrics(startDate, endDate) {
        const users = Array.from(this.metrics.users.values());
        
        const usersByPhase = {};
        const usersByRole = {};
        const usersByPlatform = {};
        
        users.forEach(user => {
            // By phase
            usersByPhase[user.phase] = (usersByPhase[user.phase] || 0) + 1;
            
            // By role
            usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;
            
            // By platform
            if (user.platform) {
                usersByPlatform[user.platform] = (usersByPlatform[user.platform] || 0) + 1;
            }
        });

        return {
            byPhase: usersByPhase,
            byRole: usersByRole,
            byPlatform: usersByPlatform,
            retention: this.calculateUserRetention(startDate, endDate),
            lifecycle: this.calculateUserLifecycleMetrics(users),
            topContributors: this.getTopContributors(users, 10)
        };
    }

    /**
     * Generate engagement metrics
     */
    generateEngagementMetrics(startDate, endDate) {
        const sessions = Array.from(this.metrics.sessions.values());
        const filteredSessions = sessions.filter(s => 
            new Date(s.startTime) >= startDate && new Date(s.startTime) <= endDate
        );

        const dailyActiveUsers = this.calculateDailyActiveUsers(filteredSessions, startDate, endDate);
        const featureUsage = this.calculateFeatureUsage(filteredSessions);
        const sessionPatterns = this.analyzeSessionPatterns(filteredSessions);

        return {
            dailyActiveUsers,
            featureUsage,
            sessionPatterns,
            avgSessionsPerUser: this.calculateAverageSessionsPerUser(filteredSessions),
            sessionDurationDistribution: this.calculateSessionDurationDistribution(filteredSessions)
        };
    }

    /**
     * Generate quality metrics
     */
    generateQualityMetrics(startDate, endDate) {
        const crashes = Array.from(this.metrics.crashes.values());
        const feedback = Array.from(this.metrics.feedback.values());
        
        const filteredCrashes = crashes.filter(c => 
            new Date(c.timestamp) >= startDate && new Date(c.timestamp) <= endDate
        );
        const filteredFeedback = feedback.filter(f => 
            new Date(f.timestamp) >= startDate && new Date(f.timestamp) <= endDate
        );

        const crashesBySeverity = {};
        const crashesByType = {};
        const crashesByPlatform = {};
        
        filteredCrashes.forEach(crash => {
            crashesBySeverity[crash.severity] = (crashesBySeverity[crash.severity] || 0) + 1;
            crashesByType[crash.errorType] = (crashesByType[crash.errorType] || 0) + 1;
            crashesByPlatform[crash.platform] = (crashesByPlatform[crash.platform] || 0) + 1;
        });

        const feedbackBySentiment = {};
        const feedbackByType = {};
        
        filteredFeedback.forEach(feedback => {
            feedbackBySentiment[feedback.sentiment] = (feedbackBySentiment[feedback.sentiment] || 0) + 1;
            feedbackByType[feedback.type] = (feedbackByType[feedback.type] || 0) + 1;
        });

        return {
            crashes: {
                total: filteredCrashes.length,
                bySeverity: crashesBySeverity,
                byType: crashesByType,
                byPlatform: crashesByPlatform,
                topIssues: this.getTopCrashIssues(filteredCrashes, 10)
            },
            feedback: {
                total: filteredFeedback.length,
                bySentiment: feedbackBySentiment,
                byType: feedbackByType,
                averageSentiment: this.calculateAverageSentiment(filteredFeedback)
            },
            qualityScore: this.calculateQualityScore(filteredCrashes, filteredFeedback)
        };
    }

    /**
     * Update real-time statistics
     */
    updateRealTimeStats() {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const sessions = Array.from(this.metrics.sessions.values());
        const crashes = Array.from(this.metrics.crashes.values());
        const feedback = Array.from(this.metrics.feedback.values());
        
        const recentSessions = sessions.filter(s => new Date(s.startTime) > last24h);
        const recentCrashes = crashes.filter(c => new Date(c.timestamp) > last24h);
        const recentFeedback = feedback.filter(f => new Date(f.timestamp) > last24h);
        
        this.realTimeStats = {
            activeUsers: this.calculateCurrentActiveUsers(),
            totalSessions: recentSessions.length,
            crashesLast24h: recentCrashes.length,
            feedbackLast24h: recentFeedback.length,
            avgSessionDuration: this.calculateAverageSessionDuration(recentSessions),
            topIssues: this.getTopCrashIssues(recentCrashes, 5)
        };
    }

    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        setInterval(() => {
            this.checkSystemHealth();
        }, 300000); // Check every 5 minutes
    }

    /**
     * Check system health and generate alerts
     */
    checkSystemHealth() {
        const now = new Date();
        const oneHour = new Date(now.getTime() - 60 * 60 * 1000);
        
        // Check crash rate
        this.checkCrashRateThreshold();
        
        // Check user activity
        this.checkUserActivity();
        
        // Check feedback sentiment
        this.checkFeedbackSentiment();
        
        // Check performance degradation
        this.checkPerformanceDegradation();
    }

    /**
     * Check crash rate threshold
     */
    checkCrashRateThreshold() {
        const now = new Date();
        const oneHour = new Date(now.getTime() - 60 * 60 * 1000);
        
        const sessions = Array.from(this.metrics.sessions.values());
        const crashes = Array.from(this.metrics.crashes.values());
        
        const recentSessions = sessions.filter(s => new Date(s.startTime) > oneHour);
        const recentCrashes = crashes.filter(c => new Date(c.timestamp) > oneHour);
        
        const crashRate = recentSessions.length > 0 ? recentCrashes.length / recentSessions.length : 0;
        
        if (crashRate > this.config.alertThresholds.crashRate) {
            this.createAlert('high_crash_rate', {
                crashRate: crashRate,
                threshold: this.config.alertThresholds.crashRate,
                sessions: recentSessions.length,
                crashes: recentCrashes.length
            });
        }
    }

    /**
     * Create an alert
     */
    createAlert(type, data) {
        const alert = {
            id: `${type}-${Date.now()}`,
            type: type,
            severity: this.getAlertSeverity(type),
            timestamp: new Date().toISOString(),
            data: data,
            acknowledged: false,
            resolved: false
        };

        this.alerts.push(alert);
        this.emit('alert', alert);
        
        console.warn(`Beta Alert [${alert.severity}]: ${type}`, data);
    }

    /**
     * Get alert severity level
     */
    getAlertSeverity(type) {
        const severityMap = {
            high_crash_rate: 'critical',
            low_activity: 'warning',
            high_severity_bugs: 'high',
            user_dropoff: 'medium',
            performance_degradation: 'medium'
        };
        
        return severityMap[type] || 'low';
    }

    /**
     * Helper functions
     */
    getStartDate(endDate, timeRange) {
        const ranges = {
            '1d': 1,
            '7d': 7,
            '30d': 30,
            '90d': 90
        };
        
        const days = ranges[timeRange] || 7;
        return new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    }

    calculateUserLifetimeValue(user) {
        // Simple LTV calculation based on phase and role
        const phaseValues = {
            INTERNAL: 100,
            CLOSED_ALPHA: 50,
            CLOSED_BETA: 25,
            OPEN_BETA: 10
        };
        
        const roleMultiplier = user.role === 'developer' ? 2 : 1;
        return (phaseValues[user.phase] || 10) * roleMultiplier;
    }

    calculateAverageSessionDuration(sessions) {
        const completedSessions = sessions.filter(s => s.duration !== null);
        if (completedSessions.length === 0) return 0;
        
        const totalDuration = completedSessions.reduce((sum, s) => sum + s.duration, 0);
        return totalDuration / completedSessions.length;
    }

    calculateCurrentActiveUsers() {
        const now = new Date();
        const oneHour = new Date(now.getTime() - 60 * 60 * 1000);
        
        const recentSessions = Array.from(this.metrics.sessions.values())
            .filter(s => new Date(s.startTime) > oneHour && !s.endTime);
            
        return new Set(recentSessions.map(s => s.userId)).size;
    }

    hashIP(ipAddress) {
        if (!ipAddress) return null;
        // Simple hash for privacy
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(ipAddress).digest('hex').substring(0, 8);
    }

    /**
     * Start aggregation process
     */
    startAggregationProcess() {
        setInterval(async () => {
            await this.saveAnalyticsData();
            this.updateRealTimeStats();
        }, this.config.aggregationInterval);
    }

    /**
     * Get dashboard data
     */
    getDashboardData() {
        return {
            realTimeStats: this.realTimeStats,
            recentAlerts: this.alerts.filter(a => !a.resolved).slice(-10),
            quickMetrics: {
                totalUsers: this.metrics.users.size,
                totalSessions: this.metrics.sessions.size,
                totalCrashes: this.metrics.crashes.size,
                totalFeedback: this.metrics.feedback.size
            },
            healthScore: this.calculateOverallHealthScore()
        };
    }

    calculateOverallHealthScore() {
        // Calculate a health score from 0-100 based on various metrics
        let score = 100;
        
        // Reduce score based on crash rate
        const crashRate = this.realTimeStats.crashesLast24h / Math.max(this.realTimeStats.totalSessions, 1);
        score -= crashRate * 100;
        
        // Reduce score based on negative feedback
        const feedback = Array.from(this.metrics.feedback.values());
        const negativeFeedback = feedback.filter(f => f.sentiment === 'negative').length;
        const negativeRatio = negativeFeedback / Math.max(feedback.length, 1);
        score -= negativeRatio * 50;
        
        return Math.max(0, Math.min(100, score));
    }

    /**
     * Shutdown analytics system
     */
    async shutdown() {
        await this.saveAnalyticsData();
        console.log('Beta analytics system shut down');
    }
}

module.exports = BetaAnalytics;

/**
 * Beta Feedback Collection System
 * Handles crash reports, user feedback, and telemetry data
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class BetaFeedbackCollector extends EventEmitter {
    constructor(config) {
        super();
        this.config = {
            crashReportsPath: config.crashReportsPath || './data/crash-reports',
            feedbackPath: config.feedbackPath || './data/feedback',
            telemetryPath: config.telemetryPath || './data/telemetry',
            maxCrashReportSize: config.maxCrashReportSize || 10 * 1024 * 1024, // 10MB
            telemetryBatchSize: config.telemetryBatchSize || 100,
            autoSubmitCrashes: config.autoSubmitCrashes || true,
            enableTelemetry: config.enableTelemetry || true,
            ...config
        };

        this.telemetryQueue = [];
        this.feedbackQueue = [];
        this.crashQueue = [];
        
        this.initializeDirectories();
        this.startTelemetryBatch();
    }

    async initializeDirectories() {
        const dirs = [
            this.config.crashReportsPath,
            this.config.feedbackPath,
            this.config.telemetryPath
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                console.error(`Failed to create directory ${dir}:`, error);
            }
        }
    }

    /**
     * Record a crash report
     */
    async recordCrashReport(crashData) {
        const crashId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        
        const crashReport = {
            id: crashId,
            timestamp,
            version: crashData.version,
            platform: crashData.platform,
            userId: crashData.userId,
            sessionId: crashData.sessionId,
            error: {
                message: crashData.error?.message,
                stack: crashData.error?.stack,
                type: crashData.error?.name || 'Unknown'
            },
            systemInfo: {
                os: crashData.systemInfo?.os,
                arch: crashData.systemInfo?.arch,
                memory: crashData.systemInfo?.memory,
                cpu: crashData.systemInfo?.cpu,
                gpu: crashData.systemInfo?.gpu
            },
            appState: {
                route: crashData.appState?.route,
                activeFeatures: crashData.appState?.activeFeatures,
                userData: this.sanitizeUserData(crashData.appState?.userData),
                settings: crashData.appState?.settings
            },
            reproduction: {
                steps: crashData.reproduction?.steps || [],
                frequency: crashData.reproduction?.frequency,
                userDescription: crashData.reproduction?.userDescription
            },
            attachments: crashData.attachments || [],
            severity: this.calculateCrashSeverity(crashData),
            tags: this.generateCrashTags(crashData)
        };

        // Save crash report to file
        const filename = `crash-${timestamp.split('T')[0]}-${crashId}.json`;
        const filepath = path.join(this.config.crashReportsPath, filename);
        
        try {
            await fs.writeFile(filepath, JSON.stringify(crashReport, null, 2));
            
            // Add to queue for batch processing
            this.crashQueue.push(crashReport);
            
            this.emit('crashReported', crashReport);
            
            // Auto-submit if enabled
            if (this.config.autoSubmitCrashes) {
                await this.submitCrashReport(crashReport);
            }
            
            return {
                success: true,
                crashId,
                report: crashReport
            };
        } catch (error) {
            console.error('Failed to save crash report:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Collect user feedback
     */
    async collectFeedback(feedbackData) {
        const feedbackId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        
        const feedback = {
            id: feedbackId,
            timestamp,
            userId: feedbackData.userId,
            sessionId: feedbackData.sessionId,
            type: feedbackData.type, // 'bug', 'feature', 'improvement', 'praise', 'complaint'
            category: feedbackData.category,
            priority: feedbackData.priority || 'medium',
            title: feedbackData.title,
            description: feedbackData.description,
            steps: feedbackData.steps || [],
            expectedBehavior: feedbackData.expectedBehavior,
            actualBehavior: feedbackData.actualBehavior,
            environment: {
                version: feedbackData.version,
                platform: feedbackData.platform,
                browser: feedbackData.browser,
                viewport: feedbackData.viewport,
                route: feedbackData.route
            },
            attachments: feedbackData.attachments || [],
            screenshots: feedbackData.screenshots || [],
            userInfo: {
                email: feedbackData.userEmail,
                role: feedbackData.userRole,
                experience: feedbackData.userExperience
            },
            sentiment: this.analyzeSentiment(feedbackData.description),
            tags: this.generateFeedbackTags(feedbackData),
            status: 'new' // 'new', 'reviewed', 'in-progress', 'resolved', 'closed'
        };

        // Save feedback to file
        const filename = `feedback-${timestamp.split('T')[0]}-${feedbackId}.json`;
        const filepath = path.join(this.config.feedbackPath, filename);
        
        try {
            await fs.writeFile(filepath, JSON.stringify(feedback, null, 2));
            
            this.feedbackQueue.push(feedback);
            this.emit('feedbackSubmitted', feedback);
            
            return {
                success: true,
                feedbackId,
                feedback: feedback
            };
        } catch (error) {
            console.error('Failed to save feedback:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Record telemetry data
     */
    recordTelemetry(telemetryData) {
        if (!this.config.enableTelemetry) return;

        const telemetry = {
            timestamp: new Date().toISOString(),
            sessionId: telemetryData.sessionId,
            userId: telemetryData.userId,
            event: telemetryData.event,
            properties: telemetryData.properties || {},
            metrics: telemetryData.metrics || {},
            platform: telemetryData.platform,
            version: telemetryData.version
        };

        this.telemetryQueue.push(telemetry);
        this.emit('telemetryRecorded', telemetry);

        // Trigger batch processing if queue is full
        if (this.telemetryQueue.length >= this.config.telemetryBatchSize) {
            this.processTelemetryBatch();
        }
    }

    /**
     * Process telemetry data in batches
     */
    async processTelemetryBatch() {
        if (this.telemetryQueue.length === 0) return;

        const batch = this.telemetryQueue.splice(0, this.config.telemetryBatchSize);
        const timestamp = new Date().toISOString();
        const batchId = crypto.randomUUID();
        
        const batchData = {
            batchId,
            timestamp,
            count: batch.length,
            events: batch
        };

        const filename = `telemetry-batch-${timestamp.split('T')[0]}-${batchId}.json`;
        const filepath = path.join(this.config.telemetryPath, filename);
        
        try {
            await fs.writeFile(filepath, JSON.stringify(batchData, null, 2));
            this.emit('telemetryBatchProcessed', batchData);
        } catch (error) {
            console.error('Failed to save telemetry batch:', error);
            // Put events back in queue for retry
            this.telemetryQueue.unshift(...batch);
        }
    }

    /**
     * Start periodic telemetry batch processing
     */
    startTelemetryBatch() {
        setInterval(() => {
            this.processTelemetryBatch();
        }, 30000); // Process every 30 seconds
    }

    /**
     * Calculate crash severity based on crash data
     */
    calculateCrashSeverity(crashData) {
        let severity = 'medium';

        // High severity conditions
        if (crashData.error?.type === 'FATAL' || 
            crashData.error?.message?.includes('CRITICAL') ||
            crashData.appState?.activeFeatures?.includes('data-sync')) {
            severity = 'high';
        }

        // Critical severity conditions
        if (crashData.error?.message?.includes('data loss') ||
            crashData.error?.message?.includes('corruption') ||
            crashData.appState?.route?.includes('setup')) {
            severity = 'critical';
        }

        // Low severity conditions
        if (crashData.error?.type === 'Warning' ||
            crashData.reproduction?.frequency === 'rare') {
            severity = 'low';
        }

        return severity;
    }

    /**
     * Generate tags for crash reports
     */
    generateCrashTags(crashData) {
        const tags = [];

        // Platform tags
        if (crashData.platform) tags.push(`platform:${crashData.platform.toLowerCase()}`);
        
        // Feature tags
        if (crashData.appState?.activeFeatures) {
            crashData.appState.activeFeatures.forEach(feature => {
                tags.push(`feature:${feature}`);
            });
        }

        // Error type tags
        if (crashData.error?.type) tags.push(`error:${crashData.error.type.toLowerCase()}`);
        
        // Route tags
        if (crashData.appState?.route) tags.push(`route:${crashData.appState.route}`);

        return tags;
    }

    /**
     * Generate tags for feedback
     */
    generateFeedbackTags(feedbackData) {
        const tags = [];

        // Type and category tags
        tags.push(`type:${feedbackData.type}`);
        if (feedbackData.category) tags.push(`category:${feedbackData.category}`);
        
        // Priority tags
        tags.push(`priority:${feedbackData.priority}`);
        
        // Platform tags
        if (feedbackData.platform) tags.push(`platform:${feedbackData.platform}`);

        return tags;
    }

    /**
     * Basic sentiment analysis for feedback
     */
    analyzeSentiment(text) {
        if (!text) return 'neutral';

        const positiveWords = ['good', 'great', 'awesome', 'love', 'excellent', 'amazing', 'perfect'];
        const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'broken', 'frustrating'];

        const words = text.toLowerCase().split(/\W+/);
        let positiveCount = 0;
        let negativeCount = 0;

        words.forEach(word => {
            if (positiveWords.includes(word)) positiveCount++;
            if (negativeWords.includes(word)) negativeCount++;
        });

        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    /**
     * Sanitize user data for privacy
     */
    sanitizeUserData(userData) {
        if (!userData) return null;

        const sanitized = { ...userData };
        
        // Remove or hash sensitive fields
        const sensitiveFields = ['email', 'name', 'password', 'token'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = this.hashSensitiveData(sanitized[field]);
            }
        });

        return sanitized;
    }

    /**
     * Hash sensitive data
     */
    hashSensitiveData(data) {
        return crypto.createHash('sha256').update(data.toString()).digest('hex').substring(0, 8);
    }

    /**
     * Submit crash report to external service
     */
    async submitCrashReport(crashReport) {
        // This would integrate with your crash reporting service
        // For now, just emit an event
        this.emit('crashSubmitted', crashReport);
        return { success: true };
    }

    /**
     * Get feedback statistics
     */
    async getFeedbackStats() {
        try {
            const feedbackFiles = await fs.readdir(this.config.feedbackPath);
            const feedbackData = [];

            for (const file of feedbackFiles) {
                if (file.endsWith('.json')) {
                    const content = await fs.readFile(path.join(this.config.feedbackPath, file), 'utf8');
                    feedbackData.push(JSON.parse(content));
                }
            }

            const stats = {
                total: feedbackData.length,
                byType: {},
                byPriority: {},
                bySentiment: {},
                recentCount: 0
            };

            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            feedbackData.forEach(feedback => {
                // Count by type
                stats.byType[feedback.type] = (stats.byType[feedback.type] || 0) + 1;
                
                // Count by priority
                stats.byPriority[feedback.priority] = (stats.byPriority[feedback.priority] || 0) + 1;
                
                // Count by sentiment
                stats.bySentiment[feedback.sentiment] = (stats.bySentiment[feedback.sentiment] || 0) + 1;
                
                // Count recent feedback
                if (new Date(feedback.timestamp) > weekAgo) {
                    stats.recentCount++;
                }
            });

            return stats;
        } catch (error) {
            console.error('Failed to get feedback stats:', error);
            return null;
        }
    }

    /**
     * Get crash report statistics
     */
    async getCrashStats() {
        try {
            const crashFiles = await fs.readdir(this.config.crashReportsPath);
            const crashData = [];

            for (const file of crashFiles) {
                if (file.endsWith('.json')) {
                    const content = await fs.readFile(path.join(this.config.crashReportsPath, file), 'utf8');
                    crashData.push(JSON.parse(content));
                }
            }

            const stats = {
                total: crashData.length,
                bySeverity: {},
                byPlatform: {},
                byErrorType: {},
                recentCount: 0
            };

            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            crashData.forEach(crash => {
                // Count by severity
                stats.bySeverity[crash.severity] = (stats.bySeverity[crash.severity] || 0) + 1;
                
                // Count by platform
                stats.byPlatform[crash.platform] = (stats.byPlatform[crash.platform] || 0) + 1;
                
                // Count by error type
                stats.byErrorType[crash.error.type] = (stats.byErrorType[crash.error.type] || 0) + 1;
                
                // Count recent crashes
                if (new Date(crash.timestamp) > weekAgo) {
                    stats.recentCount++;
                }
            });

            return stats;
        } catch (error) {
            console.error('Failed to get crash stats:', error);
            return null;
        }
    }
}

module.exports = BetaFeedbackCollector;

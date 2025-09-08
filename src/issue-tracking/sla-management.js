/**
 * Attrition SLA Management and Escalation System
 * Defines and enforces service level agreements for bug response and resolution
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class SLAManagement extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            dataPath: config.dataPath || './data/sla',
            escalationEnabled: config.escalationEnabled !== false,
            notificationChannels: config.notificationChannels || [],
            businessHours: config.businessHours || {
                start: 9,  // 9 AM
                end: 17,   // 5 PM
                timezone: 'UTC',
                workdays: [1, 2, 3, 4, 5] // Monday-Friday
            },
            ...config
        };

        // Service Level Agreement definitions
        this.slaDefinitions = {
            // Response SLAs (Time to first response/acknowledgment)
            response: {
                CRITICAL: {
                    businessHours: '2 hours',
                    afterHours: '4 hours',
                    weekends: '8 hours',
                    escalationLevels: [
                        { level: 1, after: '1 hour', notify: ['team-lead', 'on-call'] },
                        { level: 2, after: '2 hours', notify: ['manager', 'stakeholders'] },
                        { level: 3, after: '4 hours', notify: ['director', 'executive-team'] }
                    ]
                },
                HIGH: {
                    businessHours: '4 hours',
                    afterHours: '8 hours',
                    weekends: '24 hours',
                    escalationLevels: [
                        { level: 1, after: '2 hours', notify: ['team-lead'] },
                        { level: 2, after: '8 hours', notify: ['manager'] }
                    ]
                },
                MEDIUM: {
                    businessHours: '1 business day',
                    afterHours: '2 business days',
                    weekends: '2 business days',
                    escalationLevels: [
                        { level: 1, after: '1 business day', notify: ['team-lead'] }
                    ]
                },
                LOW: {
                    businessHours: '2 business days',
                    afterHours: '3 business days',
                    weekends: '3 business days',
                    escalationLevels: [
                        { level: 1, after: '3 business days', notify: ['team-lead'] }
                    ]
                }
            },
            
            // Resolution SLAs (Time to fix and deploy)
            resolution: {
                CRITICAL: {
                    target: '24 hours',
                    maximum: '48 hours',
                    escalationLevels: [
                        { level: 1, after: '12 hours', notify: ['manager', 'stakeholders'] },
                        { level: 2, after: '24 hours', notify: ['director', 'executive-team'] },
                        { level: 3, after: '36 hours', notify: ['ceo', 'board'] }
                    ]
                },
                HIGH: {
                    target: '3 business days',
                    maximum: '5 business days',
                    escalationLevels: [
                        { level: 1, after: '2 business days', notify: ['team-lead'] },
                        { level: 2, after: '4 business days', notify: ['manager'] }
                    ]
                },
                MEDIUM: {
                    target: '1 week',
                    maximum: '2 weeks',
                    escalationLevels: [
                        { level: 1, after: '1 week', notify: ['team-lead'] },
                        { level: 2, after: '10 business days', notify: ['manager'] }
                    ]
                },
                LOW: {
                    target: '2 weeks',
                    maximum: '1 month',
                    escalationLevels: [
                        { level: 1, after: '3 weeks', notify: ['team-lead'] }
                    ]
                }
            },
            
            // Update SLAs (Regular communication requirements)
            update: {
                CRITICAL: {
                    frequency: '4 hours',
                    requiredUntilResolution: true
                },
                HIGH: {
                    frequency: '1 business day',
                    requiredUntilResolution: true
                },
                MEDIUM: {
                    frequency: '2 business days',
                    requiredUntilResolution: false
                },
                LOW: {
                    frequency: '1 week',
                    requiredUntilResolution: false
                }
            }
        };

        // Escalation chain configuration
        this.escalationChains = {
            'team-lead': {
                name: 'Team Lead',
                contact: 'team-lead@attrition.app',
                slack: '@team-lead',
                phone: process.env.TEAM_LEAD_PHONE,
                role: 'primary'
            },
            'manager': {
                name: 'Engineering Manager',
                contact: 'manager@attrition.app',
                slack: '@eng-manager',
                phone: process.env.MANAGER_PHONE,
                role: 'secondary'
            },
            'director': {
                name: 'Engineering Director',
                contact: 'director@attrition.app',
                slack: '@eng-director',
                phone: process.env.DIRECTOR_PHONE,
                role: 'executive'
            },
            'stakeholders': {
                name: 'Product Stakeholders',
                contact: 'stakeholders@attrition.app',
                slack: '@channel',
                role: 'business'
            },
            'on-call': {
                name: 'On-Call Engineer',
                contact: 'on-call@attrition.app',
                slack: '@oncall',
                phone: process.env.ONCALL_PHONE,
                role: 'emergency'
            }
        };

        // SLA tracking storage
        this.activeSLAs = new Map();
        this.slaHistory = [];
        this.escalationHistory = [];
        
        this.initializeSLASystem();
    }

    /**
     * Initialize the SLA management system
     */
    async initializeSLASystem() {
        console.log('📋 Initializing SLA Management System...');
        
        // Ensure data directory exists
        await fs.mkdir(this.config.dataPath, { recursive: true });
        
        // Load existing SLA data
        await this.loadSLAData();
        
        // Start SLA monitoring
        this.startSLAMonitoring();
        
        console.log('✅ SLA Management System initialized');
    }

    /**
     * Create SLA tracking for a new issue
     */
    async createSLA(issue) {
        const slaId = this.generateSLAId(issue);
        const now = new Date();
        
        const sla = {
            id: slaId,
            issueId: issue.id,
            issueTitle: issue.title,
            severity: issue.severity || 'MEDIUM',
            priority: issue.priority || 'P2',
            createdAt: now.toISOString(),
            
            // Response SLA
            response: {
                target: this.calculateResponseTarget(issue.severity, now),
                actual: null,
                status: 'PENDING',
                escalations: []
            },
            
            // Resolution SLA
            resolution: {
                target: this.calculateResolutionTarget(issue.severity, now),
                maximum: this.calculateResolutionMaximum(issue.severity, now),
                actual: null,
                status: 'PENDING',
                escalations: []
            },
            
            // Update SLA
            update: {
                frequency: this.slaDefinitions.update[issue.severity].frequency,
                lastUpdate: now.toISOString(),
                nextUpdateDue: this.calculateNextUpdateDue(issue.severity, now),
                missedUpdates: 0
            },
            
            // Tracking
            assignedTo: issue.assignedTo || null,
            assignedTeam: issue.assignedTeam || null,
            status: 'ACTIVE',
            breaches: [],
            currentEscalationLevel: 0
        };

        // Store SLA
        this.activeSLAs.set(slaId, sla);
        await this.saveSLAData();
        
        // Emit SLA created event
        this.emit('slaCreated', sla);
        
        console.log(`📋 SLA created for issue: ${issue.title} (${issue.severity})`);
        console.log(`   Response target: ${sla.response.target.toISOString()}`);
        console.log(`   Resolution target: ${sla.resolution.target.toISOString()}`);
        
        return sla;
    }

    /**
     * Record response to an issue
     */
    async recordResponse(issueId, responseTime = new Date()) {
        const sla = this.findSLAByIssueId(issueId);
        if (!sla) {
            console.warn(`No SLA found for issue ${issueId}`);
            return;
        }
        
        sla.response.actual = responseTime.toISOString();
        sla.response.status = 'COMPLETED';
        
        // Check if response was within SLA
        const isWithinSLA = responseTime <= sla.response.target;
        
        if (!isWithinSLA) {
            const breach = {
                type: 'RESPONSE',
                targetTime: sla.response.target.toISOString(),
                actualTime: responseTime.toISOString(),
                delay: responseTime - sla.response.target,
                severity: sla.severity
            };
            
            sla.breaches.push(breach);
            this.emit('slaBreach', { sla, breach });
            
            console.warn(`⚠️  Response SLA breach: ${sla.issueTitle}`);
        } else {
            console.log(`✅ Response SLA met: ${sla.issueTitle}`);
        }
        
        await this.saveSLAData();
        this.emit('responseRecorded', { sla, isWithinSLA });
    }

    /**
     * Record resolution of an issue
     */
    async recordResolution(issueId, resolutionTime = new Date()) {
        const sla = this.findSLAByIssueId(issueId);
        if (!sla) {
            console.warn(`No SLA found for issue ${issueId}`);
            return;
        }
        
        sla.resolution.actual = resolutionTime.toISOString();
        sla.resolution.status = 'COMPLETED';
        sla.status = 'COMPLETED';
        
        // Check if resolution was within SLA
        const isWithinTarget = resolutionTime <= sla.resolution.target;
        const isWithinMaximum = resolutionTime <= sla.resolution.maximum;
        
        if (!isWithinMaximum) {
            const breach = {
                type: 'RESOLUTION_MAXIMUM',
                targetTime: sla.resolution.maximum.toISOString(),
                actualTime: resolutionTime.toISOString(),
                delay: resolutionTime - sla.resolution.maximum,
                severity: sla.severity
            };
            
            sla.breaches.push(breach);
            this.emit('slaBreach', { sla, breach });
            
            console.warn(`🚨 Resolution Maximum SLA breach: ${sla.issueTitle}`);
        } else if (!isWithinTarget) {
            const breach = {
                type: 'RESOLUTION_TARGET',
                targetTime: sla.resolution.target.toISOString(),
                actualTime: resolutionTime.toISOString(),
                delay: resolutionTime - sla.resolution.target,
                severity: sla.severity
            };
            
            sla.breaches.push(breach);
            this.emit('slaWarning', { sla, breach });
            
            console.warn(`⚠️  Resolution Target SLA missed (within maximum): ${sla.issueTitle}`);
        } else {
            console.log(`✅ Resolution SLA met: ${sla.issueTitle}`);
        }
        
        // Move to history
        this.slaHistory.push(sla);
        this.activeSLAs.delete(sla.id);
        
        await this.saveSLAData();
        this.emit('resolutionRecorded', { sla, isWithinTarget, isWithinMaximum });
    }

    /**
     * Record status update for an issue
     */
    async recordUpdate(issueId, updateTime = new Date()) {
        const sla = this.findSLAByIssueId(issueId);
        if (!sla) return;
        
        sla.update.lastUpdate = updateTime.toISOString();
        sla.update.nextUpdateDue = this.calculateNextUpdateDue(sla.severity, updateTime);
        
        await this.saveSLAData();
        this.emit('updateRecorded', { sla });
        
        console.log(`📝 Update recorded for: ${sla.issueTitle}`);
    }

    /**
     * Check for SLA breaches and escalations
     */
    async checkSLABreaches() {
        const now = new Date();
        
        for (const [slaId, sla] of this.activeSLAs) {
            await this.checkResponseEscalation(sla, now);
            await this.checkResolutionEscalation(sla, now);
            await this.checkUpdateEscalation(sla, now);
        }
    }

    /**
     * Check response escalation
     */
    async checkResponseEscalation(sla, now) {
        if (sla.response.status === 'COMPLETED') return;
        
        const responseDefinition = this.slaDefinitions.response[sla.severity];
        const escalationLevels = responseDefinition.escalationLevels;
        
        for (const escalation of escalationLevels) {
            if (sla.currentEscalationLevel >= escalation.level) continue;
            
            const escalationTime = new Date(sla.createdAt);
            escalationTime.setTime(escalationTime.getTime() + this.parseTimeToMs(escalation.after));
            
            if (now >= escalationTime) {
                await this.triggerEscalation(sla, 'RESPONSE', escalation);
            }
        }
    }

    /**
     * Check resolution escalation
     */
    async checkResolutionEscalation(sla, now) {
        if (sla.resolution.status === 'COMPLETED') return;
        
        const resolutionDefinition = this.slaDefinitions.resolution[sla.severity];
        const escalationLevels = resolutionDefinition.escalationLevels;
        
        for (const escalation of escalationLevels) {
            const existingEscalation = sla.resolution.escalations.find(e => e.level === escalation.level);
            if (existingEscalation) continue;
            
            const escalationTime = new Date(sla.createdAt);
            escalationTime.setTime(escalationTime.getTime() + this.parseTimeToMs(escalation.after));
            
            if (now >= escalationTime) {
                await this.triggerEscalation(sla, 'RESOLUTION', escalation);
            }
        }
    }

    /**
     * Check update escalation
     */
    async checkUpdateEscalation(sla, now) {
        const updateDefinition = this.slaDefinitions.update[sla.severity];
        if (!updateDefinition.requiredUntilResolution && sla.resolution.status === 'COMPLETED') {
            return;
        }
        
        const nextUpdateDue = new Date(sla.update.nextUpdateDue);
        
        if (now > nextUpdateDue) {
            sla.update.missedUpdates++;
            sla.update.nextUpdateDue = this.calculateNextUpdateDue(sla.severity, now);
            
            this.emit('updateMissed', { sla, missedCount: sla.update.missedUpdates });
            
            console.warn(`⚠️  Update SLA missed: ${sla.issueTitle} (${sla.update.missedUpdates} missed)`);
        }
    }

    /**
     * Trigger escalation
     */
    async triggerEscalation(sla, type, escalationConfig) {
        const escalation = {
            level: escalationConfig.level,
            type: type,
            triggeredAt: new Date().toISOString(),
            notifyList: escalationConfig.notify,
            escalationConfig: escalationConfig
        };
        
        // Add to appropriate escalation list
        if (type === 'RESPONSE') {
            sla.response.escalations.push(escalation);
        } else if (type === 'RESOLUTION') {
            sla.resolution.escalations.push(escalation);
        }
        
        // Update current escalation level
        sla.currentEscalationLevel = Math.max(sla.currentEscalationLevel, escalationConfig.level);
        
        // Send notifications
        await this.sendEscalationNotifications(sla, escalation);
        
        // Record in escalation history
        this.escalationHistory.push({
            slaId: sla.id,
            issueId: sla.issueId,
            escalation: escalation,
            timestamp: escalation.triggeredAt
        });
        
        await this.saveSLAData();
        
        this.emit('escalationTriggered', { sla, escalation });
        
        console.warn(`🚨 Escalation Level ${escalation.level} triggered for: ${sla.issueTitle} (${type})`);
    }

    /**
     * Send escalation notifications
     */
    async sendEscalationNotifications(sla, escalation) {
        const notifications = [];
        
        for (const recipient of escalation.notifyList) {
            const contact = this.escalationChains[recipient];
            if (!contact) {
                console.warn(`Unknown escalation contact: ${recipient}`);
                continue;
            }
            
            const notification = {
                type: 'escalation',
                level: escalation.level,
                escalationType: escalation.type,
                recipient: contact,
                issue: {
                    id: sla.issueId,
                    title: sla.issueTitle,
                    severity: sla.severity,
                    priority: sla.priority
                },
                message: this.generateEscalationMessage(sla, escalation, contact),
                channels: this.determineNotificationChannels(escalation.level)
            };
            
            notifications.push(notification);
        }
        
        // Send notifications through configured channels
        for (const notification of notifications) {
            await this.sendNotification(notification);
        }
    }

    /**
     * Generate escalation message
     */
    generateEscalationMessage(sla, escalation, contact) {
        const urgencyMap = {
            CRITICAL: '🚨 CRITICAL',
            HIGH: '⚠️ HIGH',
            MEDIUM: '📋 MEDIUM',
            LOW: '📝 LOW'
        };
        
        const escalationTypeMap = {
            RESPONSE: 'Response',
            RESOLUTION: 'Resolution'
        };
        
        return {
            subject: `${urgencyMap[sla.severity]} SLA Escalation: ${sla.issueTitle}`,
            body: `
Hello ${contact.name},

This is an automated SLA escalation notification.

Issue Details:
- Title: ${sla.issueTitle}
- Severity: ${sla.severity}
- Priority: ${sla.priority}
- Created: ${new Date(sla.createdAt).toLocaleString()}
- Assigned: ${sla.assignedTeam || 'Unassigned'}

Escalation Details:
- Type: ${escalationTypeMap[escalation.type]} SLA
- Level: ${escalation.level}
- Triggered: ${new Date(escalation.triggeredAt).toLocaleString()}

${escalation.type === 'RESPONSE' ? 
    `This issue requires immediate response. Target response time has been exceeded.` :
    `This issue requires immediate attention. Resolution target time is approaching or has been exceeded.`
}

Please take immediate action or coordinate with the assigned team.

Issue Link: ${this.config.issueUrl}/${sla.issueId}

--
Attrition SLA Management System
            `.trim()
        };
    }

    /**
     * Determine notification channels based on escalation level
     */
    determineNotificationChannels(level) {
        const channels = ['email'];
        
        if (level >= 2) {
            channels.push('slack');
        }
        
        if (level >= 3) {
            channels.push('sms', 'phone');
        }
        
        return channels;
    }

    /**
     * Send notification through appropriate channels
     */
    async sendNotification(notification) {
        // Email notification
        if (notification.channels.includes('email')) {
            await this.sendEmailNotification(notification);
        }
        
        // Slack notification
        if (notification.channels.includes('slack')) {
            await this.sendSlackNotification(notification);
        }
        
        // SMS notification
        if (notification.channels.includes('sms')) {
            await this.sendSMSNotification(notification);
        }
        
        // Phone call (for critical escalations)
        if (notification.channels.includes('phone')) {
            await this.initiatePhoneCall(notification);
        }
        
        this.emit('notificationSent', notification);
    }

    /**
     * Calculate SLA targets and deadlines
     */
    calculateResponseTarget(severity, createdAt) {
        const responseDefinition = this.slaDefinitions.response[severity];
        const timeString = this.selectTimeBasedOnSchedule(responseDefinition, createdAt);
        return this.addBusinessTime(createdAt, timeString);
    }

    calculateResolutionTarget(severity, createdAt) {
        const resolutionDefinition = this.slaDefinitions.resolution[severity];
        return this.addBusinessTime(createdAt, resolutionDefinition.target);
    }

    calculateResolutionMaximum(severity, createdAt) {
        const resolutionDefinition = this.slaDefinitions.resolution[severity];
        return this.addBusinessTime(createdAt, resolutionDefinition.maximum);
    }

    calculateNextUpdateDue(severity, lastUpdate) {
        const updateDefinition = this.slaDefinitions.update[severity];
        return this.addBusinessTime(lastUpdate, updateDefinition.frequency);
    }

    /**
     * Helper methods
     */
    generateSLAId(issue) {
        return `sla-${issue.id}-${Date.now()}`;
    }

    findSLAByIssueId(issueId) {
        for (const sla of this.activeSLAs.values()) {
            if (sla.issueId === issueId) {
                return sla;
            }
        }
        return null;
    }

    selectTimeBasedOnSchedule(definition, timestamp) {
        const hour = timestamp.getHours();
        const day = timestamp.getDay();
        
        // Check if it's business hours
        if (this.config.businessHours.workdays.includes(day) &&
            hour >= this.config.businessHours.start &&
            hour < this.config.businessHours.end) {
            return definition.businessHours;
        }
        
        // Check if it's weekend
        if (!this.config.businessHours.workdays.includes(day)) {
            return definition.weekends;
        }
        
        // After hours
        return definition.afterHours;
    }

    addBusinessTime(startTime, timeString) {
        // For now, simple implementation - would need more sophisticated business hours calculation
        const ms = this.parseTimeToMs(timeString);
        return new Date(startTime.getTime() + ms);
    }

    parseTimeToMs(timeString) {
        const timeMap = {
            'hour': 60 * 60 * 1000,
            'hours': 60 * 60 * 1000,
            'day': 24 * 60 * 60 * 1000,
            'days': 24 * 60 * 60 * 1000,
            'business day': 24 * 60 * 60 * 1000,
            'business days': 24 * 60 * 60 * 1000,
            'week': 7 * 24 * 60 * 60 * 1000,
            'weeks': 7 * 24 * 60 * 60 * 1000,
            'month': 30 * 24 * 60 * 60 * 1000
        };
        
        const parts = timeString.toLowerCase().split(' ');
        const number = parseInt(parts[0]);
        const unit = parts.slice(1).join(' ');
        
        return number * (timeMap[unit] || timeMap.hours);
    }

    async startSLAMonitoring() {
        // Check SLA breaches every 15 minutes
        setInterval(() => {
            this.checkSLABreaches();
        }, 15 * 60 * 1000);
        
        console.log('📊 SLA monitoring started (15-minute intervals)');
    }

    async loadSLAData() {
        try {
            const activePath = path.join(this.config.dataPath, 'active-slas.json');
            const historyPath = path.join(this.config.dataPath, 'sla-history.json');
            
            const activeData = await fs.readFile(activePath, 'utf8');
            const historyData = await fs.readFile(historyPath, 'utf8');
            
            this.activeSLAs = new Map(JSON.parse(activeData));
            this.slaHistory = JSON.parse(historyData);
            
            console.log(`📊 Loaded ${this.activeSLAs.size} active SLAs and ${this.slaHistory.length} historical records`);
        } catch (error) {
            console.log('📊 No existing SLA data found, starting fresh');
        }
    }

    async saveSLAData() {
        try {
            const activePath = path.join(this.config.dataPath, 'active-slas.json');
            const historyPath = path.join(this.config.dataPath, 'sla-history.json');
            const escalationPath = path.join(this.config.dataPath, 'escalation-history.json');
            
            await fs.writeFile(activePath, JSON.stringify(Array.from(this.activeSLAs.entries()), null, 2));
            await fs.writeFile(historyPath, JSON.stringify(this.slaHistory, null, 2));
            await fs.writeFile(escalationPath, JSON.stringify(this.escalationHistory, null, 2));
        } catch (error) {
            console.error('Failed to save SLA data:', error);
        }
    }

    // Notification method placeholders (to be implemented based on your infrastructure)
    async sendEmailNotification(notification) {
        console.log(`📧 Email notification sent to ${notification.recipient.contact}`);
        // Implement actual email sending logic
    }

    async sendSlackNotification(notification) {
        console.log(`💬 Slack notification sent to ${notification.recipient.slack}`);
        // Implement actual Slack API integration
    }

    async sendSMSNotification(notification) {
        console.log(`📱 SMS notification sent to ${notification.recipient.phone}`);
        // Implement actual SMS sending logic
    }

    async initiatePhoneCall(notification) {
        console.log(`📞 Phone call initiated to ${notification.recipient.phone}`);
        // Implement actual phone call logic (e.g., using Twilio)
    }

    /**
     * Get SLA metrics and reporting
     */
    getSLAMetrics(timeRange = '30d') {
        const now = new Date();
        const cutoff = new Date(now.getTime() - this.parseTimeToMs(timeRange));
        
        const relevantSLAs = this.slaHistory.filter(sla => 
            new Date(sla.createdAt) >= cutoff
        );
        
        return {
            totalIssues: relevantSLAs.length,
            responseCompliance: this.calculateResponseCompliance(relevantSLAs),
            resolutionCompliance: this.calculateResolutionCompliance(relevantSLAs),
            escalationRate: this.calculateEscalationRate(relevantSLAs),
            averageResponseTime: this.calculateAverageResponseTime(relevantSLAs),
            averageResolutionTime: this.calculateAverageResolutionTime(relevantSLAs),
            breachesBySeverity: this.calculateBreachesBySeverity(relevantSLAs)
        };
    }

    calculateResponseCompliance(slas) {
        const totalWithResponse = slas.filter(sla => sla.response.actual).length;
        const onTimeResponses = slas.filter(sla => 
            sla.response.actual && 
            new Date(sla.response.actual) <= sla.response.target
        ).length;
        
        return totalWithResponse > 0 ? (onTimeResponses / totalWithResponse * 100).toFixed(2) : 0;
    }

    calculateResolutionCompliance(slas) {
        const totalResolved = slas.filter(sla => sla.resolution.actual).length;
        const onTimeResolutions = slas.filter(sla =>
            sla.resolution.actual &&
            new Date(sla.resolution.actual) <= sla.resolution.target
        ).length;
        
        return totalResolved > 0 ? (onTimeResolutions / totalResolved * 100).toFixed(2) : 0;
    }

    calculateEscalationRate(slas) {
        const totalEscalations = slas.reduce((sum, sla) => 
            sum + sla.response.escalations.length + sla.resolution.escalations.length, 0
        );
        
        return slas.length > 0 ? (totalEscalations / slas.length * 100).toFixed(2) : 0;
    }

    calculateAverageResponseTime(slas) {
        const responseTimes = slas
            .filter(sla => sla.response.actual)
            .map(sla => new Date(sla.response.actual) - new Date(sla.createdAt));
        
        if (responseTimes.length === 0) return 0;
        
        const avgMs = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        return Math.round(avgMs / (60 * 60 * 1000) * 100) / 100; // Hours
    }

    calculateAverageResolutionTime(slas) {
        const resolutionTimes = slas
            .filter(sla => sla.resolution.actual)
            .map(sla => new Date(sla.resolution.actual) - new Date(sla.createdAt));
        
        if (resolutionTimes.length === 0) return 0;
        
        const avgMs = resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length;
        return Math.round(avgMs / (24 * 60 * 60 * 1000) * 100) / 100; // Days
    }

    calculateBreachesBySeverity(slas) {
        const breaches = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
        
        slas.forEach(sla => {
            if (sla.breaches.length > 0) {
                breaches[sla.severity] = (breaches[sla.severity] || 0) + sla.breaches.length;
            }
        });
        
        return breaches;
    }
}

module.exports = SLAManagement;

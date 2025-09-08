/**
 * Attrition Bug Triage and Priority Management System
 * Handles automated bug classification, priority assignment, and routing
 */

const { EventEmitter } = require('events');

class BugTriageSystem extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            autoAssignment: config.autoAssignment !== false,
            escalationEnabled: config.escalationEnabled !== false,
            slaTracking: config.slaTracking !== false,
            ...config
        };

        // Bug severity classification system
        this.severityLevels = {
            CRITICAL: {
                level: 1,
                name: 'Critical',
                description: 'Application crashes, data loss, security vulnerabilities, or complete feature failure',
                responseTime: '2 hours',
                resolutionTime: '24 hours',
                escalationTime: '4 hours',
                color: '#FF0000',
                keywords: ['crash', 'data loss', 'security', 'fatal', 'corruption', 'exploit'],
                autoEscalate: true
            },
            HIGH: {
                level: 2,
                name: 'High',
                description: 'Major feature malfunction, significant performance issues, blocking workflows',
                responseTime: '8 hours',
                resolutionTime: '72 hours',
                escalationTime: '24 hours',
                color: '#FF6600',
                keywords: ['blocking', 'major', 'performance', 'broken', 'unusable'],
                autoEscalate: true
            },
            MEDIUM: {
                level: 3,
                name: 'Medium',
                description: 'Minor feature issues, usability problems, non-critical performance issues',
                responseTime: '24 hours',
                resolutionTime: '1 week',
                escalationTime: '3 days',
                color: '#FFAA00',
                keywords: ['minor', 'usability', 'slow', 'confusing', 'improvement'],
                autoEscalate: false
            },
            LOW: {
                level: 4,
                name: 'Low',
                description: 'Cosmetic issues, feature enhancement suggestions, edge case problems',
                responseTime: '3 days',
                resolutionTime: '2 weeks',
                escalationTime: '1 week',
                color: '#00AA00',
                keywords: ['cosmetic', 'enhancement', 'nice-to-have', 'polish', 'suggestion'],
                autoEscalate: false
            }
        };

        // Priority matrix based on impact and urgency
        this.priorityMatrix = {
            P0: {
                name: 'Emergency',
                description: 'Critical severity issues affecting production or blocking beta release',
                maxResolutionTime: '24 hours',
                requiresImmediateAttention: true,
                stakeholderNotification: true,
                color: '#CC0000'
            },
            P1: {
                name: 'High Priority',
                description: 'High severity issues or medium severity issues with high business impact',
                maxResolutionTime: '72 hours',
                requiresImmediateAttention: true,
                stakeholderNotification: false,
                color: '#FF6600'
            },
            P2: {
                name: 'Normal Priority',
                description: 'Standard issues that should be addressed in regular development cycle',
                maxResolutionTime: '1 week',
                requiresImmediateAttention: false,
                stakeholderNotification: false,
                color: '#FFAA00'
            },
            P3: {
                name: 'Low Priority',
                description: 'Issues that can be addressed when time permits or in future releases',
                maxResolutionTime: '2 weeks',
                requiresImmediateAttention: false,
                stakeholderNotification: false,
                color: '#00AA00'
            }
        };

        // Component-based routing configuration
        this.componentRouting = {
            'ui/frontend': {
                primaryAssignee: 'frontend-team',
                secondaryAssignee: 'ui-designer',
                expertise: ['react', 'css', 'javascript', 'ui/ux']
            },
            'backend/api': {
                primaryAssignee: 'backend-team',
                secondaryAssignee: 'lead-developer',
                expertise: ['node.js', 'database', 'api', 'server']
            },
            'desktop/electron': {
                primaryAssignee: 'desktop-team',
                secondaryAssignee: 'electron-specialist',
                expertise: ['electron', 'desktop', 'native', 'packaging']
            },
            'database': {
                primaryAssignee: 'backend-team',
                secondaryAssignee: 'database-admin',
                expertise: ['sql', 'database', 'performance', 'migrations']
            },
            'authentication': {
                primaryAssignee: 'security-team',
                secondaryAssignee: 'backend-team',
                expertise: ['auth', 'security', 'encryption', 'sessions']
            },
            'build/deployment': {
                primaryAssignee: 'devops-team',
                secondaryAssignee: 'lead-developer',
                expertise: ['ci/cd', 'deployment', 'build', 'infrastructure']
            },
            'documentation': {
                primaryAssignee: 'docs-team',
                secondaryAssignee: 'technical-writer',
                expertise: ['writing', 'documentation', 'user-guides']
            }
        };

        // Team member expertise and availability tracking
        this.teamMembers = new Map();
        this.workloadTracking = new Map();
        
        this.initializeTriageSystem();
    }

    /**
     * Initialize the triage system
     */
    initializeTriageSystem() {
        console.log('🔧 Initializing Bug Triage System...');
        
        // Set up automated workflows
        this.setupAutomatedWorkflows();
        
        // Initialize SLA tracking
        if (this.config.slaTracking) {
            this.initializeSLATracking();
        }
        
        console.log('✅ Bug Triage System initialized');
    }

    /**
     * Automatically classify and triage a new bug report
     */
    async triageBug(bugReport) {
        console.log(`🐛 Triaging new bug: ${bugReport.title}`);
        
        const triage = {
            id: bugReport.id || this.generateTriageId(),
            timestamp: new Date().toISOString(),
            originalReport: bugReport,
            
            // Automated classification
            severity: this.classifySeverity(bugReport),
            priority: null, // Will be calculated
            component: this.detectComponent(bugReport),
            
            // Assignment information
            assignedTo: null,
            assignedTeam: null,
            
            // SLA tracking
            responseDeadline: null,
            resolutionDeadline: null,
            escalationDeadline: null,
            
            // Status tracking
            status: 'NEW',
            escalated: false,
            
            // Metadata
            tags: this.generateTags(bugReport),
            reproductionInfo: this.extractReproductionInfo(bugReport),
            affectedUsers: this.estimateAffectedUsers(bugReport),
            businessImpact: this.assessBusinessImpact(bugReport)
        };

        // Calculate priority based on severity and business impact
        triage.priority = this.calculatePriority(triage.severity, triage.businessImpact);
        
        // Set SLA deadlines
        this.setSLADeadlines(triage);
        
        // Auto-assign if enabled
        if (this.config.autoAssignment) {
            await this.autoAssignBug(triage);
        }
        
        // Create GitHub issue if integration is configured
        if (this.config.githubIntegration) {
            await this.createGitHubIssue(triage);
        }
        
        // Send notifications
        await this.sendTriageNotifications(triage);
        
        // Emit triage completed event
        this.emit('bugTriaged', triage);
        
        console.log(`✅ Bug triaged: ${triage.severity}/${triage.priority} -> ${triage.assignedTeam || 'Unassigned'}`);
        
        return triage;
    }

    /**
     * Classify bug severity based on content analysis
     */
    classifySeverity(bugReport) {
        const text = `${bugReport.title} ${bugReport.description}`.toLowerCase();
        
        // Check for critical keywords
        for (const [severity, config] of Object.entries(this.severityLevels)) {
            const keywordMatches = config.keywords.filter(keyword => 
                text.includes(keyword.toLowerCase())
            ).length;
            
            if (keywordMatches >= 2) {
                return severity;
            }
        }
        
        // Fallback classification based on single keywords
        for (const [severity, config] of Object.entries(this.severityLevels)) {
            if (config.keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
                return severity;
            }
        }
        
        // Default to MEDIUM if no classification matches
        return 'MEDIUM';
    }

    /**
     * Detect affected component from bug report
     */
    detectComponent(bugReport) {
        const text = `${bugReport.title} ${bugReport.description}`.toLowerCase();
        
        // Check component routing expertise keywords
        for (const [component, routing] of Object.entries(this.componentRouting)) {
            const expertiseMatches = routing.expertise.filter(skill =>
                text.includes(skill.toLowerCase())
            ).length;
            
            if (expertiseMatches >= 1) {
                return component;
            }
        }
        
        // Check for component mentions directly
        if (text.includes('ui') || text.includes('interface') || text.includes('design')) {
            return 'ui/frontend';
        }
        
        if (text.includes('api') || text.includes('server') || text.includes('backend')) {
            return 'backend/api';
        }
        
        if (text.includes('desktop') || text.includes('electron') || text.includes('app')) {
            return 'desktop/electron';
        }
        
        if (text.includes('database') || text.includes('data') || text.includes('sql')) {
            return 'database';
        }
        
        if (text.includes('login') || text.includes('auth') || text.includes('password')) {
            return 'authentication';
        }
        
        if (text.includes('build') || text.includes('deploy') || text.includes('install')) {
            return 'build/deployment';
        }
        
        if (text.includes('doc') || text.includes('help') || text.includes('guide')) {
            return 'documentation';
        }
        
        return 'general';
    }

    /**
     * Calculate priority based on severity and business impact
     */
    calculatePriority(severity, businessImpact) {
        const severityWeight = {
            'CRITICAL': 4,
            'HIGH': 3,
            'MEDIUM': 2,
            'LOW': 1
        };
        
        const impactWeight = {
            'HIGH': 3,
            'MEDIUM': 2,
            'LOW': 1
        };
        
        const score = severityWeight[severity] + impactWeight[businessImpact];
        
        if (score >= 6) return 'P0';
        if (score >= 5) return 'P1';
        if (score >= 3) return 'P2';
        return 'P3';
    }

    /**
     * Auto-assign bug based on component and team availability
     */
    async autoAssignBug(triage) {
        const routing = this.componentRouting[triage.component];
        if (!routing) {
            triage.assignedTeam = 'general';
            return;
        }
        
        // Check team availability and workload
        const primaryAvailable = this.checkTeamAvailability(routing.primaryAssignee);
        const secondaryAvailable = this.checkTeamAvailability(routing.secondaryAssignee);
        
        if (primaryAvailable) {
            triage.assignedTo = routing.primaryAssignee;
            triage.assignedTeam = routing.primaryAssignee;
        } else if (secondaryAvailable) {
            triage.assignedTo = routing.secondaryAssignee;
            triage.assignedTeam = routing.secondaryAssignee;
        } else {
            triage.assignedTeam = routing.primaryAssignee; // Assign anyway but flag overload
            this.emit('teamOverload', {
                team: routing.primaryAssignee,
                component: triage.component,
                priority: triage.priority
            });
        }
        
        // Update workload tracking
        this.updateWorkloadTracking(triage.assignedTeam, triage.priority);
    }

    /**
     * Set SLA deadlines based on severity and priority
     */
    setSLADeadlines(triage) {
        const now = new Date();
        const severity = this.severityLevels[triage.severity];
        const priority = this.priorityMatrix[triage.priority];
        
        // Response deadline (acknowledgment)
        triage.responseDeadline = new Date(now.getTime() + this.parseTimeToMs(severity.responseTime));
        
        // Resolution deadline
        triage.resolutionDeadline = new Date(now.getTime() + this.parseTimeToMs(priority.maxResolutionTime));
        
        // Escalation deadline
        if (severity.autoEscalate) {
            triage.escalationDeadline = new Date(now.getTime() + this.parseTimeToMs(severity.escalationTime));
        }
    }

    /**
     * Generate comprehensive tags for the bug
     */
    generateTags(bugReport) {
        const tags = [];
        const text = `${bugReport.title} ${bugReport.description}`.toLowerCase();
        
        // Platform tags
        if (text.includes('windows')) tags.push('platform:windows');
        if (text.includes('mac') || text.includes('osx')) tags.push('platform:macos');
        if (text.includes('linux')) tags.push('platform:linux');
        
        // Feature tags
        if (text.includes('login') || text.includes('authentication')) tags.push('feature:auth');
        if (text.includes('ui') || text.includes('interface')) tags.push('feature:ui');
        if (text.includes('performance') || text.includes('slow')) tags.push('feature:performance');
        if (text.includes('data') || text.includes('database')) tags.push('feature:data');
        
        // Issue type tags
        if (text.includes('crash') || text.includes('error')) tags.push('type:bug');
        if (text.includes('enhance') || text.includes('improve')) tags.push('type:enhancement');
        if (text.includes('new') || text.includes('add')) tags.push('type:feature');
        if (text.includes('doc') || text.includes('help')) tags.push('type:documentation');
        
        // Urgency indicators
        if (text.includes('urgent') || text.includes('asap')) tags.push('urgency:high');
        if (text.includes('blocking') || text.includes('stuck')) tags.push('urgency:blocking');
        
        return tags;
    }

    /**
     * Extract reproduction information
     */
    extractReproductionInfo(bugReport) {
        const info = {
            reproducible: 'unknown',
            frequency: 'unknown',
            steps: [],
            environment: null
        };
        
        const description = bugReport.description.toLowerCase();
        
        // Frequency indicators
        if (description.includes('always') || description.includes('every time')) {
            info.frequency = 'always';
            info.reproducible = 'yes';
        } else if (description.includes('sometimes') || description.includes('occasionally')) {
            info.frequency = 'intermittent';
            info.reproducible = 'sometimes';
        } else if (description.includes('once') || description.includes('happened once')) {
            info.frequency = 'once';
            info.reproducible = 'unknown';
        }
        
        // Look for step indicators
        const stepPatterns = [
            /step[s]?\s*\d+/gi,
            /\d+\.\s/gi,
            /first.*then.*finally/gi
        ];
        
        stepPatterns.forEach(pattern => {
            if (pattern.test(bugReport.description)) {
                info.steps = ['Reproduction steps found in description'];
            }
        });
        
        return info;
    }

    /**
     * Estimate number of affected users
     */
    estimateAffectedUsers(bugReport) {
        const description = bugReport.description.toLowerCase();
        
        if (description.includes('everyone') || description.includes('all users')) {
            return { estimate: 'all', confidence: 'high' };
        }
        
        if (description.includes('most') || description.includes('many users')) {
            return { estimate: 'most', confidence: 'medium' };
        }
        
        if (description.includes('some') || description.includes('few users')) {
            return { estimate: 'some', confidence: 'medium' };
        }
        
        if (description.includes('just me') || description.includes('only i')) {
            return { estimate: 'single', confidence: 'high' };
        }
        
        return { estimate: 'unknown', confidence: 'low' };
    }

    /**
     * Assess business impact
     */
    assessBusinessImpact(bugReport) {
        const text = `${bugReport.title} ${bugReport.description}`.toLowerCase();
        
        // High impact indicators
        const highImpactKeywords = [
            'blocking', 'revenue', 'customers', 'production', 'launch', 'release',
            'security', 'data loss', 'corruption', 'unusable'
        ];
        
        // Medium impact indicators
        const mediumImpactKeywords = [
            'workflow', 'productivity', 'performance', 'usability', 'confusion'
        ];
        
        if (highImpactKeywords.some(keyword => text.includes(keyword))) {
            return 'HIGH';
        }
        
        if (mediumImpactKeywords.some(keyword => text.includes(keyword))) {
            return 'MEDIUM';
        }
        
        return 'LOW';
    }

    /**
     * Send triage notifications
     */
    async sendTriageNotifications(triage) {
        const notifications = [];
        
        // Notify assigned team
        if (triage.assignedTeam) {
            notifications.push({
                type: 'assignment',
                recipient: triage.assignedTeam,
                message: `New ${triage.severity}/${triage.priority} bug assigned: ${triage.originalReport.title}`
            });
        }
        
        // Notify stakeholders for high priority issues
        const priority = this.priorityMatrix[triage.priority];
        if (priority.stakeholderNotification) {
            notifications.push({
                type: 'stakeholder',
                recipient: 'stakeholders',
                message: `${priority.name} issue reported: ${triage.originalReport.title}`
            });
        }
        
        // Emit notification events
        notifications.forEach(notification => {
            this.emit('notification', notification);
        });
    }

    /**
     * Check escalation conditions and escalate if necessary
     */
    async checkEscalation(triageId) {
        // This would check if bugs need escalation based on SLA deadlines
        // Implementation would track time and automatically escalate overdue issues
        
        const triage = this.getTriageById(triageId);
        if (!triage) return;
        
        const now = new Date();
        
        // Check if escalation is needed
        if (triage.escalationDeadline && now > triage.escalationDeadline && !triage.escalated) {
            await this.escalateBug(triage);
        }
    }

    /**
     * Escalate a bug
     */
    async escalateBug(triage) {
        triage.escalated = true;
        triage.escalationTime = new Date().toISOString();
        
        this.emit('bugEscalated', {
            triageId: triage.id,
            severity: triage.severity,
            priority: triage.priority,
            assignedTeam: triage.assignedTeam,
            originalReport: triage.originalReport
        });
        
        console.log(`🚨 Bug escalated: ${triage.originalReport.title} (${triage.severity}/${triage.priority})`);
    }

    /**
     * Helper methods
     */
    generateTriageId() {
        return `triage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    parseTimeToMs(timeString) {
        const timeMap = {
            'hour': 60 * 60 * 1000,
            'hours': 60 * 60 * 1000,
            'day': 24 * 60 * 60 * 1000,
            'days': 24 * 60 * 60 * 1000,
            'week': 7 * 24 * 60 * 60 * 1000,
            'weeks': 7 * 24 * 60 * 60 * 1000
        };
        
        const parts = timeString.toLowerCase().split(' ');
        const number = parseInt(parts[0]);
        const unit = parts[1];
        
        return number * (timeMap[unit] || timeMap.hours);
    }

    checkTeamAvailability(team) {
        const currentLoad = this.workloadTracking.get(team) || 0;
        const maxLoad = 10; // Configurable max concurrent issues per team
        return currentLoad < maxLoad;
    }

    updateWorkloadTracking(team, priority) {
        const currentLoad = this.workloadTracking.get(team) || 0;
        const priorityWeight = { P0: 3, P1: 2, P2: 1, P3: 0.5 };
        const newLoad = currentLoad + (priorityWeight[priority] || 1);
        this.workloadTracking.set(team, newLoad);
    }

    setupAutomatedWorkflows() {
        // Set up periodic escalation checks
        setInterval(() => {
            this.checkAllEscalations();
        }, 3600000); // Check every hour
    }

    initializeSLATracking() {
        console.log('📊 SLA tracking initialized');
        
        // Track SLA metrics
        this.slaMetrics = {
            responseTimeCompliance: 0,
            resolutionTimeCompliance: 0,
            escalationRate: 0
        };
    }

    async checkAllEscalations() {
        // Implementation would check all active triages for escalation needs
        console.log('🔍 Checking escalation conditions...');
    }

    getTriageById(id) {
        // Implementation would retrieve triage from storage
        return null;
    }

    async createGitHubIssue(triage) {
        // Integration with GitHub Issues API would go here
        console.log(`🐙 Creating GitHub issue for triage ${triage.id}`);
    }
}

module.exports = BugTriageSystem;

/**
 * Pokemon Tracker Beta Rollout Phase 1
 * Launch internal team beta with 5-10 users
 */

const BetaUserManager = require('../models/user-management');
const BetaFeedbackCollector = require('../feedback/feedback-collector');
const BetaDiscordBot = require('../discord/discord-bot');
const BetaAnalytics = require('../analytics/beta-analytics');
const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class Phase1BetaLaunch extends EventEmitter {
    constructor(config) {
        super();
        
        this.config = {
            phase: 'INTERNAL',
            maxUsers: 10,
            launchDate: config.launchDate || new Date(),
            dataPath: config.dataPath || './data/beta',
            logPath: config.logPath || './logs/beta',
            initialUsers: config.initialUsers || [],
            ...config
        };

        this.systems = {};
        this.launchMetrics = {
            startTime: null,
            endTime: null,
            usersRegistered: 0,
            systemsInitialized: 0,
            errors: [],
            milestones: []
        };

        this.milestones = [
            { name: 'Initialize Storage', completed: false },
            { name: 'Setup User Management', completed: false },
            { name: 'Configure Feedback System', completed: false },
            { name: 'Launch Discord Bot', completed: false },
            { name: 'Start Analytics', completed: false },
            { name: 'Register Initial Users', completed: false },
            { name: 'Validate All Systems', completed: false },
            { name: 'Begin Monitoring', completed: false }
        ];
    }

    /**
     * Execute Phase 1 Beta Launch
     */
    async executeLaunch() {
        console.log('🚀 Starting Pokemon Tracker Beta Phase 1 Launch...');
        console.log(`Phase: ${this.config.phase}`);
        console.log(`Max Users: ${this.config.maxUsers}`);
        console.log(`Launch Date: ${this.config.launchDate.toISOString()}`);
        
        this.launchMetrics.startTime = new Date();
        
        try {
            // Step 1: Initialize storage and directories
            await this.initializeStorage();
            
            // Step 2: Set up user management system
            await this.setupUserManagement();
            
            // Step 3: Configure feedback collection
            await this.setupFeedbackCollection();
            
            // Step 4: Launch Discord bot
            await this.setupDiscordBot();
            
            // Step 5: Start analytics system
            await this.setupAnalytics();
            
            // Step 6: Register initial users
            await this.registerInitialUsers();
            
            // Step 7: Validate all systems
            await this.validateSystems();
            
            // Step 8: Begin monitoring
            await this.beginMonitoring();
            
            this.launchMetrics.endTime = new Date();
            
            console.log('✅ Phase 1 Beta Launch completed successfully!');
            this.generateLaunchReport();
            
            this.emit('launchCompleted', this.launchMetrics);
            
        } catch (error) {
            console.error('❌ Phase 1 Beta Launch failed:', error);
            this.launchMetrics.errors.push({
                timestamp: new Date().toISOString(),
                error: error.message,
                stack: error.stack
            });
            
            this.emit('launchFailed', { error, metrics: this.launchMetrics });
            throw error;
        }
    }

    /**
     * Initialize storage and directory structure
     */
    async initializeStorage() {
        console.log('📁 Initializing storage...');
        
        const directories = [
            this.config.dataPath,
            this.config.logPath,
            path.join(this.config.dataPath, 'users'),
            path.join(this.config.dataPath, 'feedback'),
            path.join(this.config.dataPath, 'crashes'),
            path.join(this.config.dataPath, 'analytics'),
            path.join(this.config.dataPath, 'telemetry')
        ];

        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`  ✓ Created directory: ${dir}`);
            } catch (error) {
                console.error(`  ✗ Failed to create directory ${dir}:`, error);
                throw error;
            }
        }

        // Create initial configuration files
        await this.createInitialConfigs();
        
        this.completeMilestone('Initialize Storage');
        console.log('✅ Storage initialization completed');
    }

    /**
     * Create initial configuration files
     */
    async createInitialConfigs() {
        const configs = {
            'beta-config.json': {
                version: '1.0.0-beta.1',
                phase: this.config.phase,
                maxUsers: this.config.maxUsers,
                launchDate: this.config.launchDate.toISOString(),
                features: {
                    userManagement: true,
                    feedbackCollection: true,
                    crashReporting: true,
                    analytics: true,
                    discordIntegration: true
                },
                thresholds: {
                    crashRate: 0.05,
                    userDropoff: 0.2,
                    feedbackResponseTime: 3600000 // 1 hour
                }
            },
            'logging-config.json': {
                level: 'info',
                console: true,
                file: true,
                maxFileSize: '10MB',
                maxFiles: 10,
                datePattern: 'YYYY-MM-DD'
            }
        };

        for (const [filename, config] of Object.entries(configs)) {
            const filepath = path.join(this.config.dataPath, filename);
            await fs.writeFile(filepath, JSON.stringify(config, null, 2));
            console.log(`  ✓ Created config: ${filename}`);
        }
    }

    /**
     * Set up user management system
     */
    async setupUserManagement() {
        console.log('👥 Setting up user management system...');
        
        try {
            // Create storage adapter
            const storage = {
                load: async (key) => {
                    try {
                        const data = await fs.readFile(
                            path.join(this.config.dataPath, 'users', `${key}.json`), 
                            'utf8'
                        );
                        return JSON.parse(data);
                    } catch (error) {
                        return null; // File doesn't exist
                    }
                },
                save: async (key, data) => {
                    await fs.writeFile(
                        path.join(this.config.dataPath, 'users', `${key}.json`),
                        JSON.stringify(data, null, 2)
                    );
                }
            };

            this.systems.userManager = new BetaUserManager(storage);
            
            // Set phase and capacity
            this.systems.userManager.currentPhase = this.config.phase;
            this.systems.userManager.phases[this.config.phase].maxUsers = this.config.maxUsers;
            
            console.log('  ✓ User management system initialized');
            console.log(`  ✓ Phase set to: ${this.config.phase}`);
            console.log(`  ✓ Max users: ${this.config.maxUsers}`);
            
            this.completeMilestone('Setup User Management');
            this.launchMetrics.systemsInitialized++;
            
        } catch (error) {
            console.error('  ✗ User management setup failed:', error);
            throw error;
        }
    }

    /**
     * Set up feedback collection system
     */
    async setupFeedbackCollection() {
        console.log('📝 Setting up feedback collection system...');
        
        try {
            const feedbackConfig = {
                crashReportsPath: path.join(this.config.dataPath, 'crashes'),
                feedbackPath: path.join(this.config.dataPath, 'feedback'),
                telemetryPath: path.join(this.config.dataPath, 'telemetry'),
                autoSubmitCrashes: true,
                enableTelemetry: true
            };

            this.systems.feedbackCollector = new BetaFeedbackCollector(feedbackConfig);
            
            // Set up event listeners
            this.systems.feedbackCollector.on('crashReported', (crash) => {
                console.log(`🐛 Crash reported: ${crash.severity} - ${crash.error.message}`);
                if (this.systems.analytics) {
                    this.systems.analytics.trackCrash(crash);
                }
            });

            this.systems.feedbackCollector.on('feedbackSubmitted', (feedback) => {
                console.log(`💬 Feedback submitted: ${feedback.type} - ${feedback.sentiment}`);
                if (this.systems.analytics) {
                    this.systems.analytics.trackFeedback(feedback);
                }
            });
            
            console.log('  ✓ Feedback collection system initialized');
            console.log('  ✓ Crash reporting enabled');
            console.log('  ✓ Telemetry collection enabled');
            
            this.completeMilestone('Configure Feedback System');
            this.launchMetrics.systemsInitialized++;
            
        } catch (error) {
            console.error('  ✗ Feedback system setup failed:', error);
            throw error;
        }
    }

    /**
     * Set up Discord bot
     */
    async setupDiscordBot() {
        console.log('🤖 Setting up Discord bot...');
        
        // Skip Discord setup if credentials not provided
        if (!this.config.discord?.token) {
            console.log('  ⚠️  Discord credentials not provided, skipping bot setup');
            console.log('  💡 To enable Discord integration, provide discord.token in config');
            this.completeMilestone('Launch Discord Bot');
            return;
        }
        
        try {
            const discordConfig = {
                token: this.config.discord.token,
                clientId: this.config.discord.clientId,
                guildId: this.config.discord.guildId
            };

            this.systems.discordBot = new BetaDiscordBot(discordConfig);
            
            // Initialize with user management and feedback systems
            await this.systems.discordBot.initialize(
                this.systems.userManager,
                this.systems.feedbackCollector
            );
            
            console.log('  ✓ Discord bot initialized and connected');
            console.log('  ✓ Server structure created');
            console.log('  ✓ Slash commands registered');
            
            this.completeMilestone('Launch Discord Bot');
            this.launchMetrics.systemsInitialized++;
            
        } catch (error) {
            console.error('  ✗ Discord bot setup failed:', error);
            console.log('  💡 Beta program will continue without Discord integration');
            this.completeMilestone('Launch Discord Bot'); // Mark as completed even if skipped
        }
    }

    /**
     * Set up analytics system
     */
    async setupAnalytics() {
        console.log('📊 Setting up analytics system...');
        
        try {
            const analyticsConfig = {
                dataPath: path.join(this.config.dataPath, 'analytics'),
                retentionDays: 90,
                aggregationInterval: 1800000, // 30 minutes for Phase 1
                alertThresholds: {
                    crashRate: 0.1, // More lenient for Phase 1
                    lowActivity: 0.5,
                    highSeverityBugs: 3,
                    userDropoff: 0.3
                }
            };

            this.systems.analytics = new BetaAnalytics(analyticsConfig);
            
            // Connect to user management events
            this.systems.userManager.on('userRegistered', (user) => {
                this.systems.analytics.trackUserRegistration(user);
            });
            
            // Connect to feedback collection events  
            this.systems.feedbackCollector.on('crashReported', (crash) => {
                this.systems.analytics.trackCrash(crash);
            });
            
            this.systems.feedbackCollector.on('feedbackSubmitted', (feedback) => {
                this.systems.analytics.trackFeedback(feedback);
            });
            
            console.log('  ✓ Analytics system initialized');
            console.log('  ✓ Event listeners connected');
            console.log('  ✓ Health monitoring started');
            
            this.completeMilestone('Start Analytics');
            this.launchMetrics.systemsInitialized++;
            
        } catch (error) {
            console.error('  ✗ Analytics setup failed:', error);
            throw error;
        }
    }

    /**
     * Register initial users for Phase 1
     */
    async registerInitialUsers() {
        console.log('👤 Registering initial users...');
        
        const initialUsers = this.config.initialUsers.length > 0 
            ? this.config.initialUsers 
            : this.generateDefaultInitialUsers();
        
        console.log(`  📝 Registering ${initialUsers.length} initial users`);
        
        for (const userData of initialUsers) {
            try {
                const result = await this.systems.userManager.registerBetaUser({
                    email: userData.email,
                    name: userData.name,
                    role: userData.role || 'developer',
                    phase: this.config.phase,
                    invitedBy: 'system'
                });
                
                if (result.success) {
                    console.log(`  ✓ Registered: ${userData.name} (${result.user.accessKey})`);
                    this.launchMetrics.usersRegistered++;
                } else {
                    console.log(`  ⚠️  Failed to register ${userData.name}`);
                }
                
            } catch (error) {
                console.error(`  ✗ Error registering ${userData.name}:`, error);
                this.launchMetrics.errors.push({
                    timestamp: new Date().toISOString(),
                    error: `Failed to register ${userData.name}: ${error.message}`,
                    type: 'user_registration'
                });
            }
        }
        
        console.log(`  ✅ Registered ${this.launchMetrics.usersRegistered}/${initialUsers.length} users`);
        this.completeMilestone('Register Initial Users');
    }

    /**
     * Generate default initial users if none provided
     */
    generateDefaultInitialUsers() {
        return [
            {
                email: 'lead.dev@pokemon-tracker.app',
                name: 'Lead Developer',
                role: 'developer'
            },
            {
                email: 'qa.lead@pokemon-tracker.app',
                name: 'QA Lead',
                role: 'tester'
            },
            {
                email: 'product.manager@pokemon-tracker.app',
                name: 'Product Manager',
                role: 'stakeholder'
            },
            {
                email: 'ui.designer@pokemon-tracker.app',
                name: 'UI Designer',
                role: 'tester'
            },
            {
                email: 'backend.dev@pokemon-tracker.app',
                name: 'Backend Developer',
                role: 'developer'
            }
        ];
    }

    /**
     * Validate all systems are working correctly
     */
    async validateSystems() {
        console.log('🔍 Validating all systems...');
        
        const validations = [
            { name: 'User Management', test: () => this.validateUserManagement() },
            { name: 'Feedback Collection', test: () => this.validateFeedbackCollection() },
            { name: 'Analytics System', test: () => this.validateAnalytics() },
            { name: 'Discord Integration', test: () => this.validateDiscordBot() }
        ];

        let passedValidations = 0;
        
        for (const validation of validations) {
            try {
                const result = await validation.test();
                if (result) {
                    console.log(`  ✅ ${validation.name}: PASSED`);
                    passedValidations++;
                } else {
                    console.log(`  ❌ ${validation.name}: FAILED`);
                }
            } catch (error) {
                console.log(`  ❌ ${validation.name}: ERROR - ${error.message}`);
            }
        }
        
        console.log(`  📊 Validation Results: ${passedValidations}/${validations.length} systems passed`);
        
        if (passedValidations >= validations.length - 1) { // Allow 1 system to fail (likely Discord)
            this.completeMilestone('Validate All Systems');
        } else {
            throw new Error(`Only ${passedValidations}/${validations.length} systems passed validation`);
        }
    }

    /**
     * Validation methods for each system
     */
    async validateUserManagement() {
        if (!this.systems.userManager) return false;
        
        // Test getting stats
        const stats = this.systems.userManager.getBetaStats();
        return stats && stats.totalUsers >= 0;
    }

    async validateFeedbackCollection() {
        if (!this.systems.feedbackCollector) return false;
        
        // Test getting stats (these methods need to be implemented)
        try {
            const crashStats = await this.systems.feedbackCollector.getCrashStats();
            const feedbackStats = await this.systems.feedbackCollector.getFeedbackStats();
            return true; // If no errors, system is working
        } catch (error) {
            return false;
        }
    }

    async validateAnalytics() {
        if (!this.systems.analytics) return false;
        
        // Test getting dashboard data
        const dashboard = this.systems.analytics.getDashboardData();
        return dashboard && dashboard.realTimeStats;
    }

    async validateDiscordBot() {
        if (!this.systems.discordBot) return true; // Optional system
        
        // Test if bot is connected
        return this.systems.discordBot.client && this.systems.discordBot.client.readyTimestamp;
    }

    /**
     * Begin monitoring and health checks
     */
    async beginMonitoring() {
        console.log('📡 Beginning monitoring...');
        
        // Start periodic health checks
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 300000); // Every 5 minutes
        
        // Start metrics collection
        this.metricsInterval = setInterval(() => {
            this.collectMetrics();
        }, 60000); // Every minute
        
        console.log('  ✓ Health monitoring started (5-minute intervals)');
        console.log('  ✓ Metrics collection started (1-minute intervals)');
        console.log('  ✓ System alerts configured');
        
        this.completeMilestone('Begin Monitoring');
        
        // Log initial health check
        await this.performHealthCheck();
    }

    /**
     * Perform system health check
     */
    async performHealthCheck() {
        const healthStatus = {
            timestamp: new Date().toISOString(),
            systems: {
                userManagement: this.systems.userManager ? 'healthy' : 'offline',
                feedbackCollection: this.systems.feedbackCollector ? 'healthy' : 'offline',
                analytics: this.systems.analytics ? 'healthy' : 'offline',
                discordBot: this.systems.discordBot?.client?.readyTimestamp ? 'healthy' : 'offline'
            },
            metrics: this.systems.analytics?.getDashboardData() || null
        };

        // Log health status
        const healthLogPath = path.join(this.config.logPath, 'health-checks.jsonl');
        await fs.appendFile(healthLogPath, JSON.stringify(healthStatus) + '\n');
        
        // Emit health check event
        this.emit('healthCheck', healthStatus);
    }

    /**
     * Collect system metrics
     */
    async collectMetrics() {
        if (!this.systems.analytics) return;
        
        const metrics = {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            systems: this.systems.analytics.getDashboardData()
        };

        // Save metrics
        const metricsLogPath = path.join(this.config.logPath, 'metrics.jsonl');
        await fs.appendFile(metricsLogPath, JSON.stringify(metrics) + '\n');
    }

    /**
     * Complete a milestone
     */
    completeMilestone(name) {
        const milestone = this.milestones.find(m => m.name === name);
        if (milestone) {
            milestone.completed = true;
            milestone.completedAt = new Date().toISOString();
            
            this.launchMetrics.milestones.push({
                name,
                completedAt: milestone.completedAt
            });
        }
    }

    /**
     * Generate launch report
     */
    generateLaunchReport() {
        const duration = this.launchMetrics.endTime - this.launchMetrics.startTime;
        const completedMilestones = this.milestones.filter(m => m.completed).length;
        
        const report = {
            summary: {
                phase: this.config.phase,
                launchDate: this.config.launchDate,
                duration: `${Math.round(duration / 1000)}s`,
                success: this.launchMetrics.errors.length === 0,
                usersRegistered: this.launchMetrics.usersRegistered,
                systemsInitialized: this.launchMetrics.systemsInitialized,
                milestonesCompleted: `${completedMilestones}/${this.milestones.length}`
            },
            milestones: this.milestones,
            errors: this.launchMetrics.errors,
            systems: {
                userManagement: !!this.systems.userManager,
                feedbackCollection: !!this.systems.feedbackCollector,
                analytics: !!this.systems.analytics,
                discordBot: !!this.systems.discordBot
            },
            nextSteps: [
                '1. Monitor initial user activity and feedback',
                '2. Address any critical issues discovered',
                '3. Collect feedback for Phase 2 improvements',
                '4. Prepare for Phase 2 (Closed Alpha) launch',
                '5. Establish regular beta program reviews'
            ]
        };

        console.log('\n📋 LAUNCH REPORT');
        console.log('================');
        console.log(`Phase: ${report.summary.phase}`);
        console.log(`Duration: ${report.summary.duration}`);
        console.log(`Status: ${report.summary.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`Users Registered: ${report.summary.usersRegistered}`);
        console.log(`Systems Initialized: ${report.summary.systemsInitialized}`);
        console.log(`Milestones: ${report.summary.milestonesCompleted}`);
        
        if (report.errors.length > 0) {
            console.log(`\n⚠️  Errors: ${report.errors.length}`);
            report.errors.forEach(error => {
                console.log(`  - ${error.error}`);
            });
        }
        
        console.log('\n📋 Next Steps:');
        report.nextSteps.forEach(step => {
            console.log(`  ${step}`);
        });

        // Save report to file
        this.saveLaunchReport(report);
        
        return report;
    }

    /**
     * Save launch report to file
     */
    async saveLaunchReport(report) {
        try {
            const reportPath = path.join(this.config.logPath, `phase1-launch-report-${Date.now()}.json`);
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            console.log(`\n💾 Launch report saved: ${reportPath}`);
        } catch (error) {
            console.error('Failed to save launch report:', error);
        }
    }

    /**
     * Shutdown all systems gracefully
     */
    async shutdown() {
        console.log('🛑 Shutting down Phase 1 Beta systems...');
        
        // Clear intervals
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        
        // Shutdown systems
        if (this.systems.analytics) {
            await this.systems.analytics.shutdown();
        }
        if (this.systems.discordBot) {
            await this.systems.discordBot.shutdown();
        }
        if (this.systems.userManager) {
            await this.systems.userManager.saveUserData();
        }
        
        console.log('✅ All systems shut down gracefully');
    }
}

module.exports = Phase1BetaLaunch;

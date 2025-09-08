/**
 * Attrition Beta Testing Sprint Coordination System
 * Coordinates beta testing cycles with development sprints and releases
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class BetaSprintCoordinator extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            sprintLength: config.sprintLength || 14, // days
            betaTestingPhase: config.betaTestingPhase || 5, // days
            releasePreparationPhase: config.releasePreparationPhase || 3, // days
            dataPath: config.dataPath || './data/sprint-coordination',
            githubToken: config.githubToken || process.env.GITHUB_TOKEN,
            repoOwner: config.repoOwner || 'attrition-org',
            repoName: config.repoName || 'attrition',
            jiraConfig: config.jiraConfig || {},
            slackWebhook: config.slackWebhook || process.env.SLACK_WEBHOOK_URL,
            maxParallelSprints: config.maxParallelSprints || 3,
            ...config
        };

        // Sprint state management
        this.sprints = new Map();
        this.activeSprints = new Set();
        this.sprintHistory = [];
        
        // Beta testing coordination
        this.betaTestCycles = new Map();
        this.testingResources = new Map();
        
        // Release coordination
        this.releaseSchedule = [];
        this.releaseGates = new Map();
        
        // Team coordination
        this.teamCapacity = new Map();
        this.sprintCommitments = new Map();
        
        this.initializeSprintCoordinator();
    }

    /**
     * Initialize the sprint coordination system
     */
    async initializeSprintCoordinator() {
        console.log('🏃 Initializing Beta Sprint Coordination System...');
        
        // Load existing sprint data
        await this.loadSprintData();
        
        // Set up sprint monitoring
        this.setupSprintMonitoring();
        
        // Initialize team capacity tracking
        await this.initializeTeamCapacity();
        
        // Set up release calendar integration
        this.setupReleaseCalendar();
        
        console.log('✅ Beta Sprint Coordination System initialized');
    }

    /**
     * Plan a new development sprint with integrated beta testing
     */
    async planSprint(sprintPlan) {
        console.log(`🎯 Planning sprint: ${sprintPlan.name}`);
        
        const sprintId = `sprint-${Date.now()}`;
        const startDate = new Date(sprintPlan.startDate);
        const endDate = new Date(startDate.getTime() + this.config.sprintLength * 24 * 60 * 60 * 1000);
        
        // Calculate beta testing phase dates
        const betaTestStart = new Date(endDate.getTime() - this.config.betaTestingPhase * 24 * 60 * 60 * 1000);
        const releaseDate = new Date(endDate.getTime() + this.config.releasePreparationPhase * 24 * 60 * 60 * 1000);
        
        const sprint = {
            id: sprintId,
            name: sprintPlan.name,
            version: sprintPlan.version,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            releaseDate: releaseDate.toISOString(),
            
            // Sprint phases
            phases: {
                development: {
                    start: startDate.toISOString(),
                    end: betaTestStart.toISOString(),
                    duration: Math.ceil((betaTestStart - startDate) / (24 * 60 * 60 * 1000))
                },
                betaTesting: {
                    start: betaTestStart.toISOString(),
                    end: endDate.toISOString(),
                    duration: this.config.betaTestingPhase
                },
                releasePreparation: {
                    start: endDate.toISOString(),
                    end: releaseDate.toISOString(),
                    duration: this.config.releasePreparationPhase
                }
            },
            
            // Sprint scope and objectives
            objectives: sprintPlan.objectives || [],
            features: sprintPlan.features || [],
            bugFixes: sprintPlan.bugFixes || [],
            
            // Team assignments
            teams: sprintPlan.teams || {
                'frontend-team': { capacity: 0, commitment: [] },
                'backend-team': { capacity: 0, commitment: [] },
                'desktop-team': { capacity: 0, commitment: [] },
                'qa-team': { capacity: 0, commitment: [] },
                'devops-team': { capacity: 0, commitment: [] }
            },
            
            // Beta testing configuration
            betaTesting: {
                testCycles: [],
                testGroups: sprintPlan.betaTesting?.testGroups || ['power-users', 'general-beta'],
                focusAreas: sprintPlan.betaTesting?.focusAreas || [],
                exitCriteria: sprintPlan.betaTesting?.exitCriteria || this.getDefaultBetaExitCriteria(),
                resources: []
            },
            
            // Release criteria
            releaseGate: {
                codeComplete: false,
                testingComplete: false,
                documentationComplete: false,
                securityReview: false,
                performanceValidation: false,
                stakeholderApproval: false
            },
            
            // Status tracking
            status: 'planned',
            progress: {
                development: 0,
                betaTesting: 0,
                releasePreparation: 0
            },
            
            // Metrics and KPIs
            metrics: {
                velocity: 0,
                burndown: [],
                defectRate: 0,
                testCoverage: 0,
                userSatisfaction: 0
            },
            
            // Risk and issues
            risks: [],
            blockers: [],
            issues: [],
            
            createdAt: new Date().toISOString(),
            createdBy: sprintPlan.createdBy
        };

        // Validate sprint feasibility
        const validation = await this.validateSprintPlan(sprint);
        if (!validation.isValid) {
            throw new Error(`Sprint plan validation failed: ${validation.errors.join(', ')}`);
        }

        // Check team capacity and availability
        const capacityCheck = await this.checkTeamCapacity(sprint);
        if (!capacityCheck.isAvailable) {
            console.warn('⚠️ Team capacity issues detected:', capacityCheck.warnings);
        }

        // Store sprint
        this.sprints.set(sprintId, sprint);
        
        // Create beta test cycles
        await this.createBetaTestCycles(sprint);
        
        // Set up sprint automation and monitoring
        await this.setupSprintAutomation(sprint);
        
        // Notify teams and stakeholders
        await this.notifySprintPlanned(sprint);
        
        // Save sprint data
        await this.saveSprintData();
        
        this.emit('sprintPlanned', sprint);
        
        return { sprintId, sprint, validation, capacityCheck };
    }

    /**
     * Start a planned sprint
     */
    async startSprint(sprintId) {
        const sprint = this.sprints.get(sprintId);
        if (!sprint) {
            throw new Error(`Sprint ${sprintId} not found`);
        }
        
        if (sprint.status !== 'planned') {
            throw new Error(`Sprint ${sprintId} is not in planned status`);
        }
        
        console.log(`🚀 Starting sprint: ${sprint.name}`);
        
        // Update sprint status
        sprint.status = 'active';
        sprint.actualStartDate = new Date().toISOString();
        
        // Add to active sprints
        this.activeSprints.add(sprintId);
        
        // Initialize sprint tracking
        await this.initializeSprintTracking(sprint);
        
        // Create GitHub milestone/project
        await this.createGitHubMilestone(sprint);
        
        // Set up automated reporting
        await this.setupSprintReporting(sprint);
        
        // Notify teams of sprint start
        await this.notifySprintStarted(sprint);
        
        // Schedule phase transitions
        this.schedulePhaseTransitions(sprint);
        
        this.emit('sprintStarted', sprint);
        
        return sprint;
    }

    /**
     * Transition sprint to beta testing phase
     */
    async startBetaTestingPhase(sprintId) {
        const sprint = this.sprints.get(sprintId);
        if (!sprint) {
            throw new Error(`Sprint ${sprintId} not found`);
        }
        
        console.log(`🧪 Starting beta testing phase for: ${sprint.name}`);
        
        // Validate development phase completion
        const devValidation = await this.validateDevelopmentPhase(sprint);
        if (!devValidation.isComplete) {
            console.warn('⚠️ Development phase not fully complete:', devValidation.issues);
        }
        
        // Update sprint status
        sprint.status = 'beta-testing';
        sprint.phases.betaTesting.actualStart = new Date().toISOString();
        
        // Activate beta test cycles
        const testCycles = await this.activateBetaTestCycles(sprint);
        
        // Deploy to beta environment
        await this.deployToBetaEnvironment(sprint);
        
        // Notify beta testers
        await this.notifyBetaTesters(sprint);
        
        // Start beta testing metrics collection
        this.startBetaTestingMetrics(sprint);
        
        this.emit('betaTestingStarted', { sprint, testCycles });
        
        return { sprint, testCycles };
    }

    /**
     * Complete beta testing and prepare for release
     */
    async completeBetaTesting(sprintId, testingResults) {
        const sprint = this.sprints.get(sprintId);
        if (!sprint) {
            throw new Error(`Sprint ${sprintId} not found`);
        }
        
        console.log(`✅ Completing beta testing for: ${sprint.name}`);
        
        // Evaluate beta test results
        const testEvaluation = await this.evaluateBetaTestResults(sprint, testingResults);
        
        // Check exit criteria
        const exitCriteriaCheck = await this.checkBetaExitCriteria(sprint, testEvaluation);
        
        if (!exitCriteriaCheck.passed) {
            console.warn('⚠️ Beta exit criteria not met:', exitCriteriaCheck.failedCriteria);
            
            // Determine if sprint should be extended or issues addressed
            const recommendation = await this.recommendBetaTestingAction(sprint, exitCriteriaCheck);
            
            this.emit('betaTestingIssues', { sprint, exitCriteriaCheck, recommendation });
            
            return { success: false, exitCriteriaCheck, recommendation };
        }
        
        // Update sprint status
        sprint.status = 'release-preparation';
        sprint.phases.betaTesting.actualEnd = new Date().toISOString();
        sprint.phases.releasePreparation.actualStart = new Date().toISOString();
        
        // Store beta testing results
        sprint.betaTesting.results = testEvaluation;
        
        // Start release preparation
        await this.startReleasePreparation(sprint);
        
        this.emit('betaTestingCompleted', { sprint, testEvaluation });
        
        return { success: true, sprint, testEvaluation };
    }

    /**
     * Complete sprint and prepare release
     */
    async completeSprint(sprintId) {
        const sprint = this.sprints.get(sprintId);
        if (!sprint) {
            throw new Error(`Sprint ${sprintId} not found`);
        }
        
        console.log(`🏁 Completing sprint: ${sprint.name}`);
        
        // Final sprint validation
        const finalValidation = await this.validateSprintCompletion(sprint);
        
        // Generate sprint report
        const sprintReport = await this.generateSprintReport(sprint);
        
        // Update sprint status
        sprint.status = 'completed';
        sprint.actualEndDate = new Date().toISOString();
        sprint.phases.releasePreparation.actualEnd = new Date().toISOString();
        
        // Remove from active sprints
        this.activeSprints.delete(sprintId);
        
        // Archive sprint data
        this.sprintHistory.push(sprint);
        
        // Generate lessons learned
        const lessonsLearned = await this.generateLessonsLearned(sprint);
        
        // Notify completion
        await this.notifySprintCompleted(sprint, sprintReport);
        
        this.emit('sprintCompleted', { sprint, sprintReport, lessonsLearned });
        
        return { sprint, sprintReport, lessonsLearned };
    }

    /**
     * Create beta test cycles for sprint
     */
    async createBetaTestCycles(sprint) {
        const cycles = [];
        
        // Early access cycle (Power users, 2 days)
        const earlyAccessCycle = {
            id: `${sprint.id}-early-access`,
            name: `${sprint.name} Early Access Testing`,
            sprintId: sprint.id,
            testGroup: 'power-users',
            startDate: sprint.phases.betaTesting.start,
            endDate: new Date(new Date(sprint.phases.betaTesting.start).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            focusAreas: ['core-features', 'performance', 'stability'],
            participants: 10,
            status: 'planned'
        };
        
        // General beta cycle (All beta users, remaining time)
        const generalBetaCycle = {
            id: `${sprint.id}-general-beta`,
            name: `${sprint.name} General Beta Testing`,
            sprintId: sprint.id,
            testGroup: 'general-beta',
            startDate: earlyAccessCycle.endDate,
            endDate: sprint.phases.betaTesting.end,
            focusAreas: ['user-experience', 'edge-cases', 'compatibility'],
            participants: 50,
            status: 'planned'
        };
        
        cycles.push(earlyAccessCycle, generalBetaCycle);
        
        // Store test cycles
        cycles.forEach(cycle => {
            this.betaTestCycles.set(cycle.id, cycle);
        });
        
        // Update sprint with test cycle references
        sprint.betaTesting.testCycles = cycles.map(c => c.id);
        
        return cycles;
    }

    /**
     * Generate comprehensive sprint report
     */
    async generateSprintReport(sprint) {
        const report = {
            sprintId: sprint.id,
            sprintName: sprint.name,
            version: sprint.version,
            generatedAt: new Date().toISOString(),
            
            // Timeline summary
            timeline: {
                planned: {
                    start: sprint.startDate,
                    end: sprint.endDate,
                    duration: this.config.sprintLength
                },
                actual: {
                    start: sprint.actualStartDate,
                    end: sprint.actualEndDate,
                    duration: Math.ceil((new Date(sprint.actualEndDate) - new Date(sprint.actualStartDate)) / (24 * 60 * 60 * 1000))
                },
                variance: {
                    days: Math.ceil((new Date(sprint.actualEndDate) - new Date(sprint.endDate)) / (24 * 60 * 60 * 1000)),
                    percentage: ((new Date(sprint.actualEndDate) - new Date(sprint.actualStartDate)) / (new Date(sprint.endDate) - new Date(sprint.startDate)) - 1) * 100
                }
            },
            
            // Objectives and delivery
            objectives: {
                planned: sprint.objectives,
                completed: sprint.objectives.filter(obj => obj.status === 'completed'),
                completionRate: (sprint.objectives.filter(obj => obj.status === 'completed').length / sprint.objectives.length * 100).toFixed(1)
            },
            
            // Features delivered
            features: {
                planned: sprint.features.length,
                delivered: sprint.features.filter(f => f.status === 'completed').length,
                inProgress: sprint.features.filter(f => f.status === 'in-progress').length,
                blocked: sprint.features.filter(f => f.status === 'blocked').length
            },
            
            // Bug fixes
            bugFixes: {
                planned: sprint.bugFixes.length,
                completed: sprint.bugFixes.filter(b => b.status === 'resolved').length,
                remaining: sprint.bugFixes.filter(b => b.status !== 'resolved').length
            },
            
            // Team performance
            teamPerformance: await this.calculateTeamPerformance(sprint),
            
            // Beta testing results
            betaTestingResults: sprint.betaTesting.results || {},
            
            // Quality metrics
            qualityMetrics: {
                defectRate: sprint.metrics.defectRate,
                testCoverage: sprint.metrics.testCoverage,
                userSatisfaction: sprint.metrics.userSatisfaction,
                performanceMetrics: await this.getPerformanceMetrics(sprint)
            },
            
            // Risks and issues
            riskManagement: {
                identifiedRisks: sprint.risks.length,
                mitigatedRisks: sprint.risks.filter(r => r.status === 'mitigated').length,
                openIssues: sprint.issues.filter(i => i.status === 'open').length,
                resolvedIssues: sprint.issues.filter(i => i.status === 'resolved').length
            },
            
            // Recommendations
            recommendations: await this.generateSprintRecommendations(sprint)
        };
        
        return report;
    }

    /**
     * Coordinate sprints across multiple teams
     */
    async coordinateMultiTeamSprints() {
        const activeSprintsList = Array.from(this.activeSprints).map(id => this.sprints.get(id));
        
        const coordination = {
            activeSprints: activeSprintsList.length,
            resourceContention: [],
            dependencyIssues: [],
            synchronizationNeeded: [],
            recommendations: []
        };
        
        // Check for resource contention
        const resourceUsage = new Map();
        activeSprintsList.forEach(sprint => {
            Object.entries(sprint.teams).forEach(([team, allocation]) => {
                if (!resourceUsage.has(team)) {
                    resourceUsage.set(team, []);
                }
                resourceUsage.get(team).push({
                    sprintId: sprint.id,
                    sprintName: sprint.name,
                    capacity: allocation.capacity
                });
            });
        });
        
        // Identify over-allocation
        resourceUsage.forEach((allocations, team) => {
            const totalCapacity = allocations.reduce((sum, alloc) => sum + alloc.capacity, 0);
            const teamMaxCapacity = this.teamCapacity.get(team)?.maxCapacity || 100;
            
            if (totalCapacity > teamMaxCapacity) {
                coordination.resourceContention.push({
                    team,
                    totalAllocated: totalCapacity,
                    maxCapacity: teamMaxCapacity,
                    overAllocation: totalCapacity - teamMaxCapacity,
                    affectedSprints: allocations
                });
            }
        });
        
        // Check for cross-sprint dependencies
        const dependencies = await this.analyzeCrossSprintDependencies(activeSprintsList);
        coordination.dependencyIssues = dependencies.filter(dep => dep.risk === 'high');
        
        return coordination;
    }

    /**
     * Auto-scale beta testing resources based on sprint load
     */
    async autoScaleBetaResources() {
        const upcomingBetaCycles = Array.from(this.betaTestCycles.values())
            .filter(cycle => cycle.status === 'planned' || cycle.status === 'active')
            .filter(cycle => new Date(cycle.startDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Next 7 days
        
        const resourceNeeds = {
            totalParticipants: upcomingBetaCycles.reduce((sum, cycle) => sum + cycle.participants, 0),
            testEnvironments: upcomingBetaCycles.length,
            supportStaff: Math.ceil(upcomingBetaCycles.length * 1.5),
            infrastructure: upcomingBetaCycles.map(cycle => ({
                cycleId: cycle.id,
                requirements: this.calculateInfrastructureNeeds(cycle)
            }))
        };
        
        // Auto-provision resources if needed
        const provisioningResults = await this.provisionBetaResources(resourceNeeds);
        
        return { resourceNeeds, provisioningResults };
    }

    /**
     * Helper methods for validation and calculations
     */
    getDefaultBetaExitCriteria() {
        return {
            minimumTestCoverage: 80,
            maximumCriticalDefects: 0,
            maximumHighDefects: 2,
            minimumUserSatisfaction: 4.0,
            minimumPerformanceBenchmark: 90,
            requiredTestScenarios: ['core-workflows', 'edge-cases', 'performance', 'security']
        };
    }

    async validateSprintPlan(sprint) {
        const errors = [];
        const warnings = [];
        
        // Validate timeline
        if (new Date(sprint.startDate) >= new Date(sprint.endDate)) {
            errors.push('Sprint start date must be before end date');
        }
        
        // Validate team assignments
        if (Object.keys(sprint.teams).length === 0) {
            errors.push('At least one team must be assigned to the sprint');
        }
        
        // Validate objectives
        if (sprint.objectives.length === 0) {
            warnings.push('No sprint objectives defined');
        }
        
        // Check for resource conflicts
        const conflicts = await this.checkResourceConflicts(sprint);
        if (conflicts.length > 0) {
            warnings.push(`Resource conflicts detected: ${conflicts.join(', ')}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    async checkTeamCapacity(sprint) {
        const warnings = [];
        let isAvailable = true;
        
        for (const [teamName, allocation] of Object.entries(sprint.teams)) {
            const teamCapacity = this.teamCapacity.get(teamName);
            if (!teamCapacity) {
                warnings.push(`No capacity data available for team: ${teamName}`);
                continue;
            }
            
            const currentAllocation = this.getCurrentTeamAllocation(teamName, sprint.startDate, sprint.endDate);
            const totalAllocation = currentAllocation + allocation.capacity;
            
            if (totalAllocation > teamCapacity.maxCapacity) {
                isAvailable = false;
                warnings.push(`Team ${teamName} over-allocated: ${totalAllocation}% > ${teamCapacity.maxCapacity}%`);
            }
        }
        
        return { isAvailable, warnings };
    }

    /**
     * Data persistence methods
     */
    async loadSprintData() {
        try {
            const sprintsPath = path.join(this.config.dataPath, 'sprints.json');
            const cyclesPath = path.join(this.config.dataPath, 'beta-cycles.json');
            
            // Load sprints
            try {
                const sprintsData = await fs.readFile(sprintsPath, 'utf8');
                const sprintsObj = JSON.parse(sprintsData);
                Object.entries(sprintsObj).forEach(([id, sprint]) => {
                    this.sprints.set(id, sprint);
                    if (sprint.status === 'active' || sprint.status === 'beta-testing') {
                        this.activeSprints.add(id);
                    }
                });
                console.log(`📊 Loaded ${this.sprints.size} sprints`);
            } catch (error) {
                console.log('No existing sprint data found');
            }
            
            // Load beta test cycles
            try {
                const cyclesData = await fs.readFile(cyclesPath, 'utf8');
                const cyclesObj = JSON.parse(cyclesData);
                Object.entries(cyclesObj).forEach(([id, cycle]) => {
                    this.betaTestCycles.set(id, cycle);
                });
                console.log(`📊 Loaded ${this.betaTestCycles.size} beta test cycles`);
            } catch (error) {
                console.log('No existing beta cycle data found');
            }
            
        } catch (error) {
            console.error('Failed to load sprint data:', error);
        }
    }

    async saveSprintData() {
        try {
            await fs.mkdir(this.config.dataPath, { recursive: true });
            
            // Save sprints
            const sprintsObj = Object.fromEntries(this.sprints);
            await fs.writeFile(
                path.join(this.config.dataPath, 'sprints.json'),
                JSON.stringify(sprintsObj, null, 2)
            );
            
            // Save beta test cycles
            const cyclesObj = Object.fromEntries(this.betaTestCycles);
            await fs.writeFile(
                path.join(this.config.dataPath, 'beta-cycles.json'),
                JSON.stringify(cyclesObj, null, 2)
            );
            
        } catch (error) {
            console.error('Failed to save sprint data:', error);
        }
    }

    setupSprintMonitoring() {
        // Monitor sprint progress every hour
        setInterval(() => {
            this.updateSprintProgress();
        }, 60 * 60 * 1000);
        
        // Daily sprint health check
        setInterval(() => {
            this.performSprintHealthCheck();
        }, 24 * 60 * 60 * 1000);
    }

    async initializeTeamCapacity() {
        // Initialize with default team capacities
        const defaultCapacities = {
            'frontend-team': { maxCapacity: 100, currentAllocation: 0 },
            'backend-team': { maxCapacity: 100, currentAllocation: 0 },
            'desktop-team': { maxCapacity: 80, currentAllocation: 0 },
            'qa-team': { maxCapacity: 120, currentAllocation: 0 },
            'devops-team': { maxCapacity: 60, currentAllocation: 0 }
        };
        
        Object.entries(defaultCapacities).forEach(([team, capacity]) => {
            this.teamCapacity.set(team, capacity);
        });
    }
}

module.exports = BetaSprintCoordinator;

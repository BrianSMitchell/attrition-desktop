import { ERROR_MESSAGES } from '../constants/response-formats';

/**
 * Beta User Management System
 * Handles beta user registration, access controls, and permissions
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

class BetaUserManager extends EventEmitter {
    constructor(storage) {
        super();
        this.storage = storage;
        this.betaUsers = new Map();
        this.accessKeys = new Map();
        this.userSessions = new Map();
        
        // Beta phases configuration
        this.phases = {
            INTERNAL: { maxUsers: 10, priority: 1, features: ['all'] },
            CLOSED_ALPHA: { maxUsers: 50, priority: 2, features: ['core', 'advanced'] },
            CLOSED_BETA: { maxUsers: 200, priority: 3, features: ['core'] },
            OPEN_BETA: { maxUsers: 1000, priority: 4, features: ['core', 'limited'] }
        };
        
        this.currentPhase = 'INTERNAL';
        this.loadUserData();
    }

    async loadUserData() {
        try {
            const data = await this.storage.load('beta_users');
            if (data) {
                this.betaUsers = new Map(data.users || []);
                this.accessKeys = new Map(data.accessKeys || []);
                this.currentPhase = data.currentPhase || 'INTERNAL';
            }
        } catch (error) {
            console.log('No existing beta user data found, starting fresh');
        }
    }

    async saveUserData() {
        await this.storage.save('beta_users', {
            users: Array.from(this.betaUsers.entries()),
            accessKeys: Array.from(this.accessKeys.entries()),
            currentPhase: this.currentPhase
        });
    }

    /**
     * Generate a unique beta access key
     */
    generateAccessKey(phase = this.currentPhase) {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(8).toString('hex');
        const phaseCode = phase.substring(0, 2).toUpperCase();
        return `BETA-${phaseCode}-${timestamp}-${random}`.toUpperCase();
    }

    /**
     * Register a new beta user
     */
    async registerBetaUser(userInfo) {
        const { email, name, role = 'tester', phase = this.currentPhase, invitedBy = null } = userInfo;
        
        // Validate phase capacity
        const currentUsers = Array.from(this.betaUsers.values())
            .filter(user => user.phase === phase && user.status === 'active').length;
        
        if (currentUsers >= this.phases[phase].maxUsers) {
            throw new Error(`Phase ${phase} is at capacity (${this.phases[phase].maxUsers} users)`);
        }

        // Check if user already exists
        if (Array.from(this.betaUsers.values()).some(user => user.email === email)) {
            throw new Error('User already registered for beta program');
        }

        const userId = crypto.randomUUID();
        const accessKey = this.generateAccessKey(phase);
        
        const betaUser = {
            id: userId,
            email,
            name,
            role, // 'tester', 'developer', 'stakeholder'
            phase,
            status: 'active', // 'active', 'suspended', 'graduated'
            accessKey,
            invitedBy,
            registeredAt: new Date().toISOString(),
            lastActivity: null,
            feedbackCount: 0,
            permissions: this.getPhasePermissions(phase, role),
            metadata: {
                platform: null,
                version: null,
                firstLaunch: null,
                crashReports: 0,
                sessionsCount: 0
            }
        };

        this.betaUsers.set(userId, betaUser);
        this.accessKeys.set(accessKey, userId);
        
        await this.saveUserData();
        
        this.emit('userRegistered', betaUser);
        
        return {
            success: true,
            user: betaUser,
            instructions: this.generateWelcomeInstructions(betaUser)
        };
    }

    /**
     * Validate beta access key and return user info
     */
    async validateAccessKey(accessKey) {
        const userId = this.accessKeys.get(accessKey);
        if (!userId) {
            return { valid: false, reason: 'Invalid access key' };
        }

        const user = this.betaUsers.get(userId);
        if (!user) {
            return { valid: false, reason: ERROR_MESSAGES.USER_NOT_FOUND };
        }

        if (user.status !== 'active') {
            return { valid: false, reason: `Account status: ${user.status}` };
        }

        // Update last activity
        user.lastActivity = new Date().toISOString();
        await this.saveUserData();

        return {
            valid: true,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                phase: user.phase,
                permissions: user.permissions
            }
        };
    }

    /**
     * Get permissions based on phase and role
     */
    getPhasePermissions(phase, role) {
        const basePermissions = {
            downloadBeta: true,
            submitFeedback: true,
            accessForum: false,
            viewRoadmap: false,
            earlyFeatures: false,
            debugMode: false
        };

        // Phase-specific permissions
        switch (phase) {
            case 'INTERNAL':
                Object.assign(basePermissions, {
                    accessForum: true,
                    viewRoadmap: true,
                    earlyFeatures: true,
                    debugMode: true,
                    adminPanel: role === 'developer'
                });
                break;
            case 'CLOSED_ALPHA':
                Object.assign(basePermissions, {
                    accessForum: true,
                    viewRoadmap: true,
                    earlyFeatures: true,
                    debugMode: role === 'developer'
                });
                break;
            case 'CLOSED_BETA':
                Object.assign(basePermissions, {
                    accessForum: true,
                    viewRoadmap: role === 'stakeholder'
                });
                break;
            case 'OPEN_BETA':
                // Base permissions only
                break;
        }

        return basePermissions;
    }

    /**
     * Update user activity and metadata
     */
    async updateUserActivity(accessKey, activityData) {
        const validation = await this.validateAccessKey(accessKey);
        if (!validation.valid) return false;

        const userId = this.accessKeys.get(accessKey);
        const user = this.betaUsers.get(userId);

        // Update metadata
        if (activityData.platform) user.metadata.platform = activityData.platform;
        if (activityData.version) user.metadata.version = activityData.version;
        if (activityData.sessionStart && !user.metadata.firstLaunch) {
            user.metadata.firstLaunch = new Date().toISOString();
        }
        if (activityData.sessionStart) user.metadata.sessionsCount++;
        if (activityData.crashReport) user.metadata.crashReports++;

        user.lastActivity = new Date().toISOString();
        await this.saveUserData();

        this.emit('userActivity', { userId: user.id, activity: activityData });
        return true;
    }

    /**
     * Generate welcome instructions for new beta users
     */
    generateWelcomeInstructions(user) {
        return {
            welcomeMessage: `Welcome to the Attrition Beta Program, ${user.name}!`,
            accessKey: user.accessKey,
            phase: user.phase,
            downloadInstructions: [
                '1. Visit the beta portal: https://beta.attrition.app',
                '2. Enter your access key: ' + user.accessKey,
                '3. Download the appropriate version for your platform',
                '4. Follow the installation guide for your OS'
            ],
            importantNotes: [
                'Your access key is personal and should not be shared',
                'Beta versions may contain bugs - please report them!',
                'Data from beta versions may not carry over to final release',
                'Join our Discord community for discussions and support'
            ],
            supportChannels: {
                discord: 'https://discord.gg/attrition-beta',
                email: 'beta-support@attrition.app',
                forum: user.permissions.accessForum ? 'https://forum.attrition.app/beta' : null
            }
        };
    }

    /**
     * Get beta program statistics
     */
    getBetaStats() {
        const users = Array.from(this.betaUsers.values());
        const activeUsers = users.filter(u => u.status === 'active');
        
        const stats = {
            totalUsers: users.length,
            activeUsers: activeUsers.length,
            currentPhase: this.currentPhase,
            phaseCapacity: this.phases[this.currentPhase].maxUsers,
            phaseUsage: activeUsers.filter(u => u.phase === this.currentPhase).length,
            usersByPhase: {},
            usersByRole: {},
            recentActivity: users.filter(u => {
                if (!u.lastActivity) return false;
                const lastActivity = new Date(u.lastActivity);
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return lastActivity > weekAgo;
            }).length
        };

        // Count by phase
        Object.keys(this.phases).forEach(phase => {
            stats.usersByPhase[phase] = activeUsers.filter(u => u.phase === phase).length;
        });

        // Count by role
        ['tester', 'developer', 'stakeholder'].forEach(role => {
            stats.usersByRole[role] = activeUsers.filter(u => u.role === role).length;
        });

        return stats;
    }

    /**
     * Advance to next beta phase
     */
    async advancePhase() {
        const phases = Object.keys(this.phases);
        const currentIndex = phases.indexOf(this.currentPhase);
        
        if (currentIndex < phases.length - 1) {
            this.currentPhase = phases[currentIndex + 1];
            await this.saveUserData();
            
            this.emit('phaseAdvanced', {
                previousPhase: phases[currentIndex],
                newPhase: this.currentPhase
            });
            
            return true;
        }
        
        return false;
    }

    /**
     * Suspend or reactivate a beta user
     */
    async updateUserStatus(userId, newStatus, reason = null) {
        const user = this.betaUsers.get(userId);
        if (!user) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);

        const previousStatus = user.status;
        user.status = newStatus;
        user.statusChangeReason = reason;
        user.statusChangedAt = new Date().toISOString();

        await this.saveUserData();

        this.emit('userStatusChanged', {
            userId,
            previousStatus,
            newStatus,
            reason
        });

        return user;
    }
}

module.exports = BetaUserManager;



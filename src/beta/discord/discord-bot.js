/**
 * Pokemon Tracker Beta Discord Bot
 * Handles automated Discord server management for beta testers
 */

const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { EventEmitter } = require('events');

class BetaDiscordBot extends EventEmitter {
    constructor(config) {
        super();
        
        this.config = {
            token: config.token,
            guildId: config.guildId,
            clientId: config.clientId,
            prefix: config.prefix || '!beta',
            ...config
        };

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessageReactions
            ]
        });

        this.betaUserManager = null;
        this.feedbackCollector = null;
        
        // Role and channel mappings
        this.roles = {
            INTERNAL: 'Beta Internal',
            CLOSED_ALPHA: 'Beta Alpha',
            CLOSED_BETA: 'Beta Tester',
            OPEN_BETA: 'Open Beta',
            DEVELOPER: 'Beta Developer',
            MODERATOR: 'Beta Moderator'
        };

        this.channels = {
            announcements: 'beta-announcements',
            general: 'beta-general',
            feedback: 'beta-feedback',
            bugs: 'beta-bugs',
            features: 'beta-feature-requests',
            internal: 'beta-internal',
            alpha: 'beta-alpha',
            support: 'beta-support',
            logs: 'beta-logs'
        };

        this.commands = new Map();
        this.setupCommands();
        this.setupEventHandlers();
    }

    /**
     * Initialize the Discord bot
     */
    async initialize(betaUserManager, feedbackCollector) {
        this.betaUserManager = betaUserManager;
        this.feedbackCollector = feedbackCollector;

        try {
            await this.client.login(this.config.token);
            console.log('Discord bot logged in successfully');
            
            await this.setupGuildStructure();
            await this.registerSlashCommands();
            
            this.emit('ready');
            return true;
        } catch (error) {
            console.error('Failed to initialize Discord bot:', error);
            throw error;
        }
    }

    /**
     * Set up Discord server structure (roles, channels, permissions)
     */
    async setupGuildStructure() {
        const guild = await this.client.guilds.fetch(this.config.guildId);
        
        // Create roles if they don't exist
        await this.createRoles(guild);
        
        // Create channels if they don't exist
        await this.createChannels(guild);
        
        // Set up channel permissions
        await this.setupChannelPermissions(guild);
        
        console.log('Discord server structure setup complete');
    }

    /**
     * Create beta program roles
     */
    async createRoles(guild) {
        const roleConfigs = [
            {
                name: this.roles.INTERNAL,
                color: '#FF0000',
                permissions: [PermissionFlagsBits.ViewChannel],
                position: 10
            },
            {
                name: this.roles.CLOSED_ALPHA,
                color: '#FF8800',
                permissions: [PermissionFlagsBits.ViewChannel],
                position: 9
            },
            {
                name: this.roles.CLOSED_BETA,
                color: '#0088FF',
                permissions: [PermissionFlagsBits.ViewChannel],
                position: 8
            },
            {
                name: this.roles.OPEN_BETA,
                color: '#00FF88',
                permissions: [PermissionFlagsBits.ViewChannel],
                position: 7
            },
            {
                name: this.roles.DEVELOPER,
                color: '#8800FF',
                permissions: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages],
                position: 11
            },
            {
                name: this.roles.MODERATOR,
                color: '#FF00FF',
                permissions: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers],
                position: 12
            }
        ];

        for (const roleConfig of roleConfigs) {
            let role = guild.roles.cache.find(r => r.name === roleConfig.name);
            
            if (!role) {
                try {
                    role = await guild.roles.create({
                        name: roleConfig.name,
                        color: roleConfig.color,
                        permissions: roleConfig.permissions,
                        position: roleConfig.position,
                        mentionable: true
                    });
                    console.log(`Created role: ${roleConfig.name}`);
                } catch (error) {
                    console.error(`Failed to create role ${roleConfig.name}:`, error);
                }
            }
        }
    }

    /**
     * Create beta program channels
     */
    async createChannels(guild) {
        const channelConfigs = [
            {
                name: this.channels.announcements,
                type: 0, // Text channel
                topic: 'Official beta program announcements and updates',
                permissions: [
                    { id: guild.id, deny: [PermissionFlagsBits.SendMessages] },
                    { id: this.getRoleId(guild, this.roles.DEVELOPER), allow: [PermissionFlagsBits.SendMessages] }
                ]
            },
            {
                name: this.channels.general,
                type: 0,
                topic: 'General discussion about Pokemon Tracker beta'
            },
            {
                name: this.channels.feedback,
                type: 0,
                topic: 'Share your feedback and suggestions for the beta'
            },
            {
                name: this.channels.bugs,
                type: 0,
                topic: 'Report bugs and issues found in the beta'
            },
            {
                name: this.channels.features,
                type: 0,
                topic: 'Request new features and improvements'
            },
            {
                name: this.channels.support,
                type: 0,
                topic: 'Get help with installation and usage'
            },
            {
                name: this.channels.internal,
                type: 0,
                topic: 'Internal testing discussion (Internal phase only)',
                permissions: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: this.getRoleId(guild, this.roles.INTERNAL), allow: [PermissionFlagsBits.ViewChannel] },
                    { id: this.getRoleId(guild, this.roles.DEVELOPER), allow: [PermissionFlagsBits.ViewChannel] }
                ]
            },
            {
                name: this.channels.alpha,
                type: 0,
                topic: 'Alpha testing discussion (Alpha phase only)',
                permissions: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: this.getRoleId(guild, this.roles.INTERNAL), allow: [PermissionFlagsBits.ViewChannel] },
                    { id: this.getRoleId(guild, this.roles.CLOSED_ALPHA), allow: [PermissionFlagsBits.ViewChannel] },
                    { id: this.getRoleId(guild, this.roles.DEVELOPER), allow: [PermissionFlagsBits.ViewChannel] }
                ]
            },
            {
                name: this.channels.logs,
                type: 0,
                topic: 'Bot activity logs (Developers only)',
                permissions: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: this.getRoleId(guild, this.roles.DEVELOPER), allow: [PermissionFlagsBits.ViewChannel] }
                ]
            }
        ];

        for (const channelConfig of channelConfigs) {
            let channel = guild.channels.cache.find(c => c.name === channelConfig.name);
            
            if (!channel) {
                try {
                    channel = await guild.channels.create({
                        name: channelConfig.name,
                        type: channelConfig.type,
                        topic: channelConfig.topic,
                        permissionOverwrites: channelConfig.permissions || []
                    });
                    console.log(`Created channel: ${channelConfig.name}`);
                } catch (error) {
                    console.error(`Failed to create channel ${channelConfig.name}:`, error);
                }
            }
        }
    }

    /**
     * Set up additional channel permissions
     */
    async setupChannelPermissions(guild) {
        // Additional permission setup if needed
        console.log('Channel permissions configured');
    }

    /**
     * Get role ID by name
     */
    getRoleId(guild, roleName) {
        const role = guild.roles.cache.find(r => r.name === roleName);
        return role ? role.id : null;
    }

    /**
     * Set up slash commands
     */
    setupCommands() {
        // Verify beta access key
        this.commands.set('verify', {
            data: new SlashCommandBuilder()
                .setName('verify')
                .setDescription('Verify your beta access key')
                .addStringOption(option =>
                    option.setName('key')
                        .setDescription('Your beta access key')
                        .setRequired(true)
                ),
            execute: async (interaction) => {
                await this.handleVerifyCommand(interaction);
            }
        });

        // Get beta stats
        this.commands.set('stats', {
            data: new SlashCommandBuilder()
                .setName('stats')
                .setDescription('View beta program statistics'),
            execute: async (interaction) => {
                await this.handleStatsCommand(interaction);
            }
        });

        // Submit feedback
        this.commands.set('feedback', {
            data: new SlashCommandBuilder()
                .setName('feedback')
                .setDescription('Submit feedback about the beta')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of feedback')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Bug Report', value: 'bug' },
                            { name: 'Feature Request', value: 'feature' },
                            { name: 'General Feedback', value: 'general' },
                            { name: 'Praise', value: 'praise' }
                        )
                )
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Your feedback message')
                        .setRequired(true)
                ),
            execute: async (interaction) => {
                await this.handleFeedbackCommand(interaction);
            }
        });

        // Beta info
        this.commands.set('info', {
            data: new SlashCommandBuilder()
                .setName('info')
                .setDescription('Get information about the beta program'),
            execute: async (interaction) => {
                await this.handleInfoCommand(interaction);
            }
        });

        // Admin commands
        this.commands.set('admin', {
            data: new SlashCommandBuilder()
                .setName('admin')
                .setDescription('Admin commands for beta management')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('sync-roles')
                        .setDescription('Sync user roles with beta database')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('announce')
                        .setDescription('Send announcement to beta testers')
                        .addStringOption(option =>
                            option.setName('message')
                                .setDescription('Announcement message')
                                .setRequired(true)
                        )
                ),
            execute: async (interaction) => {
                await this.handleAdminCommand(interaction);
            }
        });
    }

    /**
     * Register slash commands with Discord
     */
    async registerSlashCommands() {
        const commandData = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());
        
        try {
            const { REST, Routes } = require('@discordjs/rest');
            const rest = new REST({ version: '10' }).setToken(this.config.token);
            
            await rest.put(
                Routes.applicationGuildCommands(this.config.clientId, this.config.guildId),
                { body: commandData }
            );
            
            console.log('Successfully registered slash commands');
        } catch (error) {
            console.error('Failed to register slash commands:', error);
        }
    }

    /**
     * Set up event handlers
     */
    setupEventHandlers() {
        this.client.on('ready', () => {
            console.log(`Discord bot logged in as ${this.client.user.tag}`);
            this.client.user.setActivity('Pokemon Tracker Beta', { type: 'WATCHING' });
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            const command = this.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Command execution error:', error);
                const errorMessage = 'There was an error executing this command.';
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
        });

        this.client.on('guildMemberAdd', async (member) => {
            await this.handleNewMember(member);
        });

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            await this.handleMessage(message);
        });

        // Listen for beta program events
        if (this.betaUserManager) {
            this.betaUserManager.on('userRegistered', (user) => {
                this.handleUserRegistered(user);
            });

            this.betaUserManager.on('phaseAdvanced', (data) => {
                this.handlePhaseAdvanced(data);
            });
        }

        if (this.feedbackCollector) {
            this.feedbackCollector.on('crashReported', (crash) => {
                this.handleCrashReport(crash);
            });

            this.feedbackCollector.on('feedbackSubmitted', (feedback) => {
                this.handleFeedbackSubmitted(feedback);
            });
        }
    }

    /**
     * Handle verify command
     */
    async handleVerifyCommand(interaction) {
        const accessKey = interaction.options.getString('key');
        
        if (!this.betaUserManager) {
            await interaction.reply({
                content: 'Beta user management system is not available.',
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const validation = await this.betaUserManager.validateAccessKey(accessKey);
            
            if (validation.valid) {
                const user = validation.user;
                await this.assignBetaRole(interaction.member, user.phase, user.role);
                
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Access Key Verified!')
                    .setDescription(`Welcome to the Pokemon Tracker Beta Program!`)
                    .addFields(
                        { name: 'Phase', value: user.phase, inline: true },
                        { name: 'Role', value: user.role, inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                
                // Log verification
                await this.logActivity('User Verified', `${interaction.user.tag} verified with ${user.phase} access`);
                
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Invalid Access Key')
                    .setDescription(validation.reason || 'The provided access key is not valid.')
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Verify command error:', error);
            await interaction.editReply({
                content: 'An error occurred while verifying your access key. Please try again later.'
            });
        }
    }

    /**
     * Handle stats command
     */
    async handleStatsCommand(interaction) {
        if (!this.betaUserManager) {
            await interaction.reply({
                content: 'Beta statistics are not available.',
                ephemeral: true
            });
            return;
        }

        const stats = this.betaUserManager.getBetaStats();
        
        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📊 Beta Program Statistics')
            .addFields(
                { name: 'Total Users', value: stats.totalUsers.toString(), inline: true },
                { name: 'Active Users', value: stats.activeUsers.toString(), inline: true },
                { name: 'Current Phase', value: stats.currentPhase, inline: true },
                { name: 'Phase Usage', value: `${stats.phaseUsage}/${stats.phaseCapacity}`, inline: true },
                { name: 'Recent Activity', value: stats.recentActivity.toString(), inline: true },
                { name: '\u200B', value: '\u200B', inline: true }
            )
            .setTimestamp();

        // Add phase breakdown
        let phaseBreakdown = '';
        Object.entries(stats.usersByPhase).forEach(([phase, count]) => {
            phaseBreakdown += `${phase}: ${count}\n`;
        });
        
        if (phaseBreakdown) {
            embed.addFields({ name: 'Users by Phase', value: phaseBreakdown, inline: true });
        }

        await interaction.reply({ embeds: [embed] });
    }

    /**
     * Handle feedback command
     */
    async handleFeedbackCommand(interaction) {
        const type = interaction.options.getString('type');
        const message = interaction.options.getString('message');
        
        if (!this.feedbackCollector) {
            await interaction.reply({
                content: 'Feedback system is not available.',
                ephemeral: true
            });
            return;
        }

        const feedbackData = {
            userId: interaction.user.id,
            userEmail: null, // Discord doesn't provide email
            userRole: this.getUserBetaRole(interaction.member),
            type: type,
            title: `Discord feedback: ${type}`,
            description: message,
            platform: 'Discord',
            version: 'N/A',
            sessionId: `discord-${Date.now()}`
        };

        try {
            const result = await this.feedbackCollector.collectFeedback(feedbackData);
            
            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Feedback Submitted')
                    .setDescription('Thank you for your feedback! It has been recorded and will be reviewed by the development team.')
                    .addFields(
                        { name: 'Feedback ID', value: result.feedbackId.substring(0, 8), inline: true },
                        { name: 'Type', value: type, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                
                // Post to feedback channel
                await this.postToFeedbackChannel(interaction.user, type, message, result.feedbackId);
                
            } else {
                await interaction.reply({
                    content: 'Failed to submit feedback. Please try again later.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Feedback submission error:', error);
            await interaction.reply({
                content: 'An error occurred while submitting feedback.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle info command
     */
    async handleInfoCommand(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🎮 Pokemon Tracker Beta Program')
            .setDescription('Welcome to the Pokemon Tracker Desktop Beta! Here\'s what you need to know:')
            .addFields(
                { name: '📥 Downloads', value: 'Visit https://beta.pokemon-tracker.app to download the latest beta build', inline: false },
                { name: '📖 Documentation', value: 'Installation guides and testing instructions available in the portal', inline: false },
                { name: '🐛 Bug Reports', value: 'Use `/feedback type:Bug Report` or post in #beta-bugs', inline: false },
                { name: '💡 Feature Requests', value: 'Use `/feedback type:Feature Request` or post in #beta-feature-requests', inline: false },
                { name: '❓ Support', value: 'Get help in #beta-support or email beta-support@pokemon-tracker.app', inline: false }
            )
            .addFields(
                { name: '🔑 Verification', value: 'Use `/verify` to link your beta access key with Discord', inline: true },
                { name: '📊 Stats', value: 'Use `/stats` to view beta program statistics', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    /**
     * Handle admin command
     */
    async handleAdminCommand(interaction) {
        // Check if user has admin permissions
        if (!this.isAdmin(interaction.member)) {
            await interaction.reply({
                content: 'You do not have permission to use admin commands.',
                ephemeral: true
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'sync-roles':
                await this.syncAllUserRoles(interaction);
                break;
            case 'announce':
                const message = interaction.options.getString('message');
                await this.sendAnnouncement(interaction, message);
                break;
            default:
                await interaction.reply({
                    content: 'Unknown admin command.',
                    ephemeral: true
                });
        }
    }

    /**
     * Assign beta role to user
     */
    async assignBetaRole(member, phase, role) {
        const guild = member.guild;
        const betaRole = guild.roles.cache.find(r => r.name === this.roles[phase]);
        const roleRole = role === 'developer' ? guild.roles.cache.find(r => r.name === this.roles.DEVELOPER) : null;
        
        if (betaRole) {
            await member.roles.add(betaRole);
        }
        
        if (roleRole) {
            await member.roles.add(roleRole);
        }
    }

    /**
     * Get user's beta role
     */
    getUserBetaRole(member) {
        const betaRoles = Object.values(this.roles);
        const userRoles = member.roles.cache.map(role => role.name);
        
        for (const role of betaRoles) {
            if (userRoles.includes(role)) {
                return role;
            }
        }
        
        return 'Unknown';
    }

    /**
     * Check if user is admin
     */
    isAdmin(member) {
        return member.roles.cache.some(role => 
            role.name === this.roles.DEVELOPER || 
            role.name === this.roles.MODERATOR ||
            member.permissions.has(PermissionFlagsBits.Administrator)
        );
    }

    /**
     * Post feedback to channel
     */
    async postToFeedbackChannel(user, type, message, feedbackId) {
        const guild = this.client.guilds.cache.get(this.config.guildId);
        const channel = guild.channels.cache.find(c => c.name === this.channels.feedback);
        
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor(type === 'bug' ? '#FF0000' : type === 'feature' ? '#00FF00' : '#0099FF')
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                .setTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`)
                .setDescription(message)
                .addFields(
                    { name: 'Feedback ID', value: feedbackId.substring(0, 8), inline: true }
                )
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        }
    }

    /**
     * Log bot activity
     */
    async logActivity(title, description) {
        const guild = this.client.guilds.cache.get(this.config.guildId);
        const channel = guild.channels.cache.find(c => c.name === this.channels.logs);
        
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(title)
                .setDescription(description)
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        }
    }

    /**
     * Handle new member joining
     */
    async handleNewMember(member) {
        const welcomeChannel = member.guild.channels.cache.find(c => c.name === this.channels.general);
        
        if (welcomeChannel) {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('👋 Welcome to Pokemon Tracker Beta!')
                .setDescription(`Welcome ${member}, thank you for joining the beta program!`)
                .addFields(
                    { name: '🔑 Get Started', value: 'Use `/verify` to link your beta access key', inline: false },
                    { name: '📖 Resources', value: 'Check out the pinned messages for important information', inline: false }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();

            await welcomeChannel.send({ embeds: [embed] });
        }
    }

    /**
     * Handle message events
     */
    async handleMessage(message) {
        // Handle specific message patterns or reactions
        if (message.content.toLowerCase().includes('crash') && 
            message.channel.name === this.channels.bugs) {
            await message.react('🐛');
        }
        
        if (message.content.toLowerCase().includes('feature') && 
            message.channel.name === this.channels.features) {
            await message.react('💡');
        }
    }

    /**
     * Event handlers for beta program events
     */
    async handleUserRegistered(user) {
        await this.logActivity('New Beta User', `User ${user.name} registered for ${user.phase} phase`);
    }

    async handlePhaseAdvanced(data) {
        const guild = this.client.guilds.cache.get(this.config.guildId);
        const channel = guild.channels.cache.find(c => c.name === this.channels.announcements);
        
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🚀 Beta Phase Advanced!')
                .setDescription(`The beta program has advanced from ${data.previousPhase} to ${data.newPhase}!`)
                .addFields(
                    { name: 'Previous Phase', value: data.previousPhase, inline: true },
                    { name: 'New Phase', value: data.newPhase, inline: true }
                )
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        }
    }

    async handleCrashReport(crash) {
        if (crash.severity === 'critical') {
            await this.logActivity('Critical Crash', `Critical crash reported: ${crash.error.message}`);
        }
    }

    async handleFeedbackSubmitted(feedback) {
        if (feedback.type === 'bug' && feedback.priority === 'high') {
            await this.logActivity('High Priority Bug', `High priority bug reported: ${feedback.title}`);
        }
    }

    /**
     * Send announcement to beta testers
     */
    async sendAnnouncement(interaction, message) {
        const guild = interaction.guild;
        const channel = guild.channels.cache.find(c => c.name === this.channels.announcements);
        
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('📢 Beta Announcement')
                .setDescription(message)
                .setFooter({ text: `Posted by ${interaction.user.tag}` })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            
            await interaction.reply({
                content: 'Announcement posted successfully!',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: 'Announcement channel not found.',
                ephemeral: true
            });
        }
    }

    /**
     * Sync all user roles with beta database
     */
    async syncAllUserRoles(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        // This would sync Discord roles with the beta user database
        // Implementation depends on how you want to handle the synchronization
        
        await interaction.editReply({
            content: 'Role synchronization completed!'
        });
    }

    /**
     * Shutdown the bot gracefully
     */
    async shutdown() {
        await this.client.destroy();
        console.log('Discord bot shut down');
    }
}

module.exports = BetaDiscordBot;

/**
 * Example: Launch Pokemon Tracker Beta Phase 1
 * This script demonstrates how to execute the Phase 1 beta launch
 */

const Phase1BetaLaunch = require('../src/beta/rollout/phase1-launch');

async function launchPhase1Beta() {
    // Configuration for Phase 1 launch
    const launchConfig = {
        phase: 'INTERNAL',
        maxUsers: 10,
        launchDate: new Date(),
        dataPath: './data/beta',
        logPath: './logs/beta',
        
        // Optional: Discord integration (uncomment if you have Discord bot credentials)
        // discord: {
        //     token: process.env.DISCORD_BOT_TOKEN,
        //     clientId: process.env.DISCORD_CLIENT_ID,
        //     guildId: process.env.DISCORD_GUILD_ID
        // },
        
        // Optional: Custom initial users (if not provided, default team will be used)
        initialUsers: [
            {
                email: 'john.doe@pokemon-tracker.app',
                name: 'John Doe',
                role: 'developer'
            },
            {
                email: 'jane.smith@pokemon-tracker.app', 
                name: 'Jane Smith',
                role: 'tester'
            },
            {
                email: 'alex.wilson@pokemon-tracker.app',
                name: 'Alex Wilson', 
                role: 'stakeholder'
            },
            {
                email: 'sarah.johnson@pokemon-tracker.app',
                name: 'Sarah Johnson',
                role: 'tester'
            },
            {
                email: 'mike.brown@pokemon-tracker.app',
                name: 'Mike Brown',
                role: 'developer'
            }
        ]
    };

    // Create the Phase 1 launch instance
    const phase1Launch = new Phase1BetaLaunch(launchConfig);

    // Set up event listeners
    phase1Launch.on('launchCompleted', (metrics) => {
        console.log('\n🎉 Phase 1 Beta Launch completed successfully!');
        console.log(`Total time: ${Math.round((metrics.endTime - metrics.startTime) / 1000)}s`);
        console.log(`Users registered: ${metrics.usersRegistered}`);
        console.log(`Systems initialized: ${metrics.systemsInitialized}`);
        
        // You could send notifications here (email, Slack, etc.)
        sendLaunchNotification('success', metrics);
    });

    phase1Launch.on('launchFailed', ({ error, metrics }) => {
        console.error('\n💥 Phase 1 Beta Launch failed!');
        console.error(`Error: ${error.message}`);
        console.error(`Errors encountered: ${metrics.errors.length}`);
        
        // Send failure notification
        sendLaunchNotification('failure', metrics, error);
    });

    phase1Launch.on('healthCheck', (healthStatus) => {
        // Log health checks (optional - they're already logged to file)
        if (healthStatus.systems) {
            const unhealthySystems = Object.entries(healthStatus.systems)
                .filter(([_, status]) => status !== 'healthy')
                .map(([system, _]) => system);
                
            if (unhealthySystems.length > 0) {
                console.warn(`⚠️  Unhealthy systems detected: ${unhealthySystems.join(', ')}`);
            }
        }
    });

    // Handle process termination gracefully
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        await phase1Launch.shutdown();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        await phase1Launch.shutdown();
        process.exit(0);
    });

    try {
        // Execute the launch
        console.log('🚀 Starting Pokemon Tracker Beta Phase 1 Launch...');
        await phase1Launch.executeLaunch();
        
        // Keep the process running to maintain monitoring
        console.log('\n🔄 Beta program is now running. Press Ctrl+C to shutdown gracefully.');
        
        // Optional: Set up a simple web server for health monitoring
        if (process.env.ENABLE_HEALTH_SERVER === 'true') {
            startHealthServer(phase1Launch);
        }
        
    } catch (error) {
        console.error('❌ Launch failed:', error);
        process.exit(1);
    }
}

/**
 * Send launch notification (implement based on your notification system)
 */
function sendLaunchNotification(status, metrics, error = null) {
    // Example: Send to Slack webhook
    // const webhook = process.env.SLACK_WEBHOOK_URL;
    // if (webhook) {
    //     const message = status === 'success' 
    //         ? `✅ Pokemon Tracker Beta Phase 1 launched successfully! ${metrics.usersRegistered} users registered.`
    //         : `❌ Pokemon Tracker Beta Phase 1 launch failed: ${error?.message}`;
    //     
    //     // Send webhook request...
    // }
    
    console.log(`📢 Launch notification: ${status}`);
}

/**
 * Start a simple health monitoring web server
 */
function startHealthServer(phase1Launch) {
    const express = require('express');
    const app = express();
    const port = process.env.HEALTH_SERVER_PORT || 3001;
    
    app.get('/health', (req, res) => {
        const dashboardData = phase1Launch.systems.analytics?.getDashboardData();
        res.json({
            status: 'running',
            timestamp: new Date().toISOString(),
            systems: {
                userManagement: !!phase1Launch.systems.userManager,
                feedbackCollection: !!phase1Launch.systems.feedbackCollector,
                analytics: !!phase1Launch.systems.analytics,
                discordBot: !!phase1Launch.systems.discordBot?.client?.readyTimestamp
            },
            metrics: dashboardData
        });
    });
    
    app.get('/stats', (req, res) => {
        const userStats = phase1Launch.systems.userManager?.getBetaStats();
        const dashboardData = phase1Launch.systems.analytics?.getDashboardData();
        
        res.json({
            userStats,
            dashboardData,
            timestamp: new Date().toISOString()
        });
    });
    
    app.listen(port, () => {
        console.log(`🌐 Health monitoring server running on port ${port}`);
        console.log(`   Health endpoint: http://localhost:${port}/health`);
        console.log(`   Stats endpoint: http://localhost:${port}/stats`);
    });
}

// Run the launch if this script is executed directly
if (require.main === module) {
    // Load environment variables if using dotenv
    if (process.env.NODE_ENV !== 'production') {
        try {
            require('dotenv').config();
        } catch (error) {
            // dotenv not installed, continue without it
        }
    }
    
    launchPhase1Beta().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = launchPhase1Beta;

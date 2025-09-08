# Discord Bot Setup Guide for Pokemon Tracker Beta

This guide will help you set up the Discord bot for automated beta program management.

## Prerequisites

1. **Discord Application & Bot**
   - Create a Discord Application at https://discord.com/developers/applications
   - Create a bot user within the application
   - Get the Bot Token and Application ID

2. **Discord Server**
   - Create or have admin access to a Discord server
   - Get the Guild (Server) ID

3. **Node.js Dependencies**
   ```bash
   npm install discord.js @discordjs/rest
   ```

## Bot Setup Steps

### 1. Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "Pokemon Tracker Beta Bot"
4. Go to the "Bot" section
5. Click "Add Bot"
6. Copy the Bot Token (keep it secure!)
7. Enable the following bot permissions:
   - Send Messages
   - Use Slash Commands
   - Manage Roles
   - Manage Channels
   - View Channels
   - Add Reactions
   - Embed Links
   - Read Message History

### 2. Invite Bot to Server

1. Go to "OAuth2" > "URL Generator"
2. Select scopes: `bot` and `applications.commands`
3. Select bot permissions:
   - Administrator (or the specific permissions listed above)
4. Copy the generated URL and visit it
5. Select your Discord server and authorize

### 3. Get Server ID

1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click your server name
3. Click "Copy ID"
4. This is your Guild ID

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
DISCORD_GUILD_ID=your_server_id_here

# Optional: Bot Settings
DISCORD_BOT_PREFIX=!beta
DISCORD_ACTIVITY_NAME=Pokemon Tracker Beta
```

### Bot Configuration

```javascript
// Example configuration
const botConfig = {
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
    prefix: process.env.DISCORD_BOT_PREFIX || '!beta'
};
```

## Server Structure

The bot will automatically create the following structure:

### Roles
- **Beta Internal** (Red) - Internal testing team
- **Beta Alpha** (Orange) - Closed alpha testers  
- **Beta Tester** (Blue) - Closed beta testers
- **Open Beta** (Green) - Open beta participants
- **Beta Developer** (Purple) - Development team
- **Beta Moderator** (Pink) - Community moderators

### Channels
- **beta-announcements** - Official updates (read-only for most users)
- **beta-general** - General discussion
- **beta-feedback** - Feedback and suggestions
- **beta-bugs** - Bug reports
- **beta-feature-requests** - Feature requests
- **beta-support** - Help and support
- **beta-internal** - Internal team only
- **beta-alpha** - Alpha testers only
- **beta-logs** - Bot activity logs (developers only)

## Usage Example

```javascript
const BetaDiscordBot = require('./src/beta/discord/discord-bot');
const BetaUserManager = require('./src/beta/models/user-management');
const BetaFeedbackCollector = require('./src/beta/feedback/feedback-collector');

// Initialize systems
const userManager = new BetaUserManager(storage);
const feedbackCollector = new BetaFeedbackCollector(feedbackConfig);

// Create and initialize Discord bot
const discordBot = new BetaDiscordBot({
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID
});

// Connect systems
await discordBot.initialize(userManager, feedbackCollector);

// Bot is now running and will:
// - Auto-create server structure
// - Handle slash commands
// - Manage user roles
// - Process feedback
// - Send notifications
```

## Available Commands

### User Commands

#### `/verify <access-key>`
- Links Discord account with beta access key
- Automatically assigns appropriate role
- Grants access to phase-specific channels

#### `/stats`
- Shows beta program statistics
- Total users, current phase, recent activity
- Available to all beta testers

#### `/feedback <type> <message>`
- Submit feedback directly through Discord
- Types: Bug Report, Feature Request, General, Praise
- Automatically posts to appropriate channel

#### `/info`
- Shows information about the beta program
- Links to documentation and resources
- Quick reference for new users

### Admin Commands

#### `/admin sync-roles`
- Synchronizes Discord roles with beta database
- Ensures role assignments are current
- Developer/Moderator only

#### `/admin announce <message>`
- Posts announcement to beta-announcements channel
- Formatted with embed and timestamp
- Developer/Moderator only

## Event Handling

The bot automatically handles these events:

### Beta Program Events
- **New User Registration**: Logs new beta sign-ups
- **Phase Advancement**: Announces when beta phases change
- **Critical Crashes**: Alerts developers to serious issues
- **High Priority Feedback**: Highlights important bugs

### Discord Events
- **New Member**: Welcomes new Discord members
- **Message Reactions**: Auto-reacts to bug/feature keywords
- **Role Updates**: Manages beta role assignments

## Security Features

1. **Access Control**
   - Commands restricted by role permissions
   - Admin commands require special roles
   - Ephemeral replies for sensitive information

2. **Data Privacy**
   - Access keys handled securely
   - User data sanitized in logs
   - Private channels for sensitive discussions

3. **Rate Limiting**
   - Built-in Discord API rate limiting
   - Prevents spam and abuse
   - Graceful error handling

## Monitoring & Logging

### Activity Logs
All bot activities are logged to the `#beta-logs` channel:
- User verifications
- Role assignments  
- Command usage
- Error conditions
- System events

### Console Logging
Detailed console output for debugging:
```
[2025-01-15 10:30:15] Discord bot logged in as Pokemon Tracker Beta#1234
[2025-01-15 10:30:16] Discord server structure setup complete
[2025-01-15 10:30:17] Successfully registered slash commands
[2025-01-15 10:35:22] User Verified: user#1234 verified with INTERNAL access
```

## Troubleshooting

### Common Issues

#### Bot Not Responding
- Check bot token is correct
- Verify bot has necessary permissions
- Check if bot is online in server member list

#### Commands Not Appearing
- Ensure `applications.commands` scope was selected
- Bot needs "Use Slash Commands" permission
- Commands are guild-specific, not global

#### Permission Errors
- Bot role must be higher than managed roles
- Check channel permission overrides
- Verify bot has "Manage Roles" permission

#### Role Assignment Failing
- Check role hierarchy (bot role above beta roles)
- Verify role names match exactly
- Ensure bot has "Manage Roles" permission

### Debugging Commands

```javascript
// Test bot connection
console.log('Bot ready:', discordBot.client.readyTimestamp);

// List guild roles
const guild = discordBot.client.guilds.cache.get(guildId);
console.log('Roles:', guild.roles.cache.map(r => r.name));

// Check bot permissions
const botMember = guild.members.cache.get(discordBot.client.user.id);
console.log('Bot permissions:', botMember.permissions.toArray());
```

## Advanced Configuration

### Custom Role Colors
```javascript
const customRoles = {
    INTERNAL: { color: '#FF0000', name: 'Alpha Team' },
    CLOSED_ALPHA: { color: '#FF8800', name: 'Beta Testers' },
    // ... customize as needed
};
```

### Channel Permissions
```javascript
const channelPermissions = [
    {
        id: guildId, // @everyone role
        deny: [PermissionFlagsBits.SendMessages]
    },
    {
        id: developerRoleId,
        allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
    }
];
```

### Webhook Integration
For external notifications:
```javascript
// Send webhook when critical bug reported
if (feedback.severity === 'critical') {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `Critical bug reported: ${feedback.title}`
    });
}
```

---

**Setup Time**: ~15-30 minutes  
**Dependencies**: discord.js v14+  
**Permissions Required**: Administrator (recommended)  
**Tested With**: Discord.js 14.14.1

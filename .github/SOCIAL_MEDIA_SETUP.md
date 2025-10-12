# Social Media Automation Setup

This document explains how to set up automated Twitter posting for Attrition MMO development updates.

## Overview

The social media automation system automatically posts to Twitter when:
- 🚀 **Code is pushed** to the main branch
- 🎉 **New releases** are published
- 🔧 **Manual triggers** are used for custom posts

## What Gets Posted

### For Code Commits
Example tweet for client updates:
```
🎮 Client update pushed to Attrition!

📝 Fix player movement bugs in space combat
🔧 12 files updated
👨‍💻 by BrianSMitchell

Development never stops! 💪

#GameDev #MMO #IndieGame #Coding
```

### For Releases
Example tweet for new releases:
```
🚀 New Attrition release v1.2.0 is live!

Attrition Desktop v1.2.0

Play now and experience the latest improvements! 🎮

#GameDev #MMO #IndieGame #Gaming
```

## Setup Instructions

### Step 1: Get Twitter API Access

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Apply for a developer account (free)
3. Create a new project/app
4. Generate these credentials:
   - API Key
   - API Key Secret
   - Access Token
   - Access Token Secret
   - Bearer Token

### Step 2: Add GitHub Secrets

Add the Twitter credentials as GitHub repository secrets:

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add these repository secrets:

```
TWITTER_API_KEY=your_api_key_here
TWITTER_API_KEY_SECRET=your_api_key_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here
TWITTER_BEARER_TOKEN=your_bearer_token_here
```

### Step 3: Test the Setup

You can test the workflow manually:

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **Social Media Updates** workflow
4. Click **Run workflow**
5. Optionally enter a custom message
6. Click **Run workflow**

## Customization

### Change What Triggers Posts

Edit `.github/workflows/social-media-updates.yml`:

```yaml
on:
  push:
    branches:
      - main        # Only main branch
      - develop     # Add develop branch
  pull_request:     # Add PR events
    types: [merged]
```

### Customize Tweet Content

Edit the message generation in the workflow:

```bash
# In the "Generate commit summary" step
TWEET_TEXT="🔥 Hot new update to Attrition!
Your custom message here...
#YourHashtags"
```

### Filter Certain Commits

The script automatically filters commits containing:
- "test"
- "debug" 
- "temporary"

Add more filters in `.github/scripts/post-to-twitter.js`:

```javascript
const bannedWords = ['test', 'debug', 'temporary', 'wip', 'draft'];
```

## Troubleshooting

### Common Issues

1. **Twitter API Errors**
   - Check if your API keys are correct
   - Ensure your Twitter app has write permissions
   - Verify rate limits haven't been exceeded

2. **Workflow Not Running**
   - Check if the workflow file syntax is valid
   - Ensure you're pushing to the `main` branch
   - Check GitHub Actions tab for error details

3. **Secrets Not Working**
   - Repository secrets are case-sensitive
   - Ensure no extra spaces in secret values
   - Re-add secrets if needed

### Manual Testing

Test the Twitter script locally:

```bash
# Set environment variables
export TWITTER_BEARER_TOKEN="your_token_here"

# Run the script
node .github/scripts/post-to-twitter.js "Test tweet from Attrition development!"
```

### Viewing Logs

Check the workflow execution:
1. Go to **Actions** tab in GitHub
2. Click on a workflow run
3. Expand the **Post to Twitter** step
4. Review the logs for any errors

## Security Notes

- ⚠️ **Never commit API keys** directly to your code
- 🔒 **Use GitHub Secrets** for all sensitive credentials
- 🛡️ **Limit Twitter app permissions** to only what's needed (tweet creation)
- 📝 **Review tweet content** before going live

## Rate Limits

Twitter API rate limits:
- **Tweet creation**: 300 tweets per 15 minutes
- **Bearer token**: 300 requests per 15 minutes

This shouldn't be an issue for normal development workflows.

## Support

If you need help setting this up:
1. Check the GitHub Actions logs first
2. Verify your Twitter API credentials
3. Test the script manually
4. Review this documentation

The workflow is designed to fail gracefully - if Twitter posting fails, your development workflow continues normally.
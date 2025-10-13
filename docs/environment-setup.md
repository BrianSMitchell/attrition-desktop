# Environment Setup Guide

## Method 1: Using .env File (Recommended)

This is the current setup we've configured:

1. Your `.env` file contains: `GITHUB_TOKEN=your_token_here`
2. The token is loaded using `dotenv` package
3. Access via `process.env.GITHUB_TOKEN` in your code
4. Use the helper functions in `config/github.js`

## Method 2: Windows System Environment Variables

If you prefer system-wide environment variables:

### Using PowerShell (Administrator):
```powershell
# Set user-level environment variable
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_token_here", "User")

# Or set system-level (requires admin)
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "your_token_here", "Machine")
```

### Using Command Prompt:
```cmd
# Set for current session
set GITHUB_TOKEN=your_token_here

# Set permanently for user
setx GITHUB_TOKEN "your_token_here"
```

### Using Windows GUI:
1. Press `Win + R`, type `sysdm.cpl`
2. Click "Environment Variables"
3. Add new variable: `GITHUB_TOKEN` with your token value

## Method 3: Git Configuration (For Git Operations Only)

For Git operations specifically:

```bash
# Set globally
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# For authentication, use GitHub CLI or credential manager
gh auth login
```

## Security Best Practices

1. **Never commit tokens to version control**
   - Your `.env` file is already in `.gitignore`
   - Always use `.env.example` for templates

2. **Use minimal token permissions**
   - Only grant necessary scopes when creating tokens
   - Regularly review and rotate tokens

3. **Environment-specific tokens**
   - Use different tokens for development/staging/production
   - Consider using GitHub Apps for production environments

4. **Token storage**
   - Use secure credential managers when possible
   - On Windows: Windows Credential Manager
   - On macOS: Keychain
   - On Linux: gnome-keyring or similar

## Troubleshooting

### Token not found error:
```javascript
// This will throw an error if GITHUB_TOKEN is not set
const { getGitHubToken } = require('./config/github');
console.log(getGitHubToken()); // Error: GitHub token not found...
```

### Testing your token:
```javascript
const { listMyRepositories } = require('./examples/github-api-example');
listMyRepositories(); // Should list your repositories if token is valid
```

### Checking environment variables:
```powershell
# In PowerShell
$env:GITHUB_TOKEN

# Or in Node.js
console.log(process.env.GITHUB_TOKEN);
```
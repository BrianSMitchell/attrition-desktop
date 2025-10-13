#!/usr/bin/env node

/**
 * GitHub Token Setup Script
 * Securely prompts for and saves GitHub Personal Access Token to .env file
 * 
 * Usage: node scripts/setup-github-token.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI colors for terminal output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Project root directory
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

/**
 * Read existing .env file content
 */
function readEnvFile() {
  try {
    if (fs.existsSync(envPath)) {
      return fs.readFileSync(envPath, 'utf8');
    }
    return '';
  } catch (error) {
    console.error('Error reading .env file:', error.message);
    return '';
  }
}

/**
 * Update or add GITHUB_TOKEN in .env file
 */
function updateEnvFile(token) {
  try {
    let envContent = readEnvFile();
    
    // Check if GITHUB_TOKEN already exists
    const tokenRegex = /^GITHUB_TOKEN=.*$/m;
    const newTokenLine = `GITHUB_TOKEN=${token}`;
    
    if (tokenRegex.test(envContent)) {
      // Replace existing token
      envContent = envContent.replace(tokenRegex, newTokenLine);
      colorLog('✅ Updated existing GITHUB_TOKEN in .env file', 'green');
    } else {
      // Add new token
      if (envContent && !envContent.endsWith('\n')) {
        envContent += '\n';
      }
      envContent += `\n# GitHub Configuration\n# Added on ${new Date().toISOString()}\n${newTokenLine}\n`;
      colorLog('✅ Added GITHUB_TOKEN to .env file', 'green');
    }
    
    // Write the updated content
    fs.writeFileSync(envPath, envContent, 'utf8');
    return true;
  } catch (error) {
    colorLog(`❌ Error updating .env file: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Validate GitHub token format
 */
function validateToken(token) {
  // GitHub tokens typically start with 'ghp_', 'github_pat_', or are 40 characters long (classic tokens)
  const patterns = [
    /^ghp_[A-Za-z0-9_]{36}$/,          // Personal access token (new format)
    /^github_pat_[A-Za-z0-9_]{22,}$/,  // Fine-grained personal access token (variable length)
    /^gho_[A-Za-z0-9_]{36}$/,          // OAuth token
    /^ghu_[A-Za-z0-9_]{36}$/,          // User token
    /^ghs_[A-Za-z0-9_]{36}$/,          // Server token
    /^ghr_[A-Za-z0-9_]{76}$/,          // Refresh token
    /^[A-Za-z0-9]{40}$/                // Classic personal access token (40 chars)
  ];
  
  return patterns.some(pattern => pattern.test(token));
}

/**
 * Test the token by making a simple API call
 */
async function testToken(token) {
  try {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: '/user',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Attrition-Setup-Script',
          'Accept': 'application/vnd.github.v3+json'
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            const user = JSON.parse(data);
            resolve(user);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  } catch (error) {
    throw new Error(`Token validation failed: ${error.message}`);
  }
}

/**
 * Create readline interface with hidden input for password
 */
function createSecureInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Hide input for token (doesn't work perfectly in all terminals, but helps)
  const originalWrite = process.stdout.write;
  let hiddenMode = false;

  return {
    rl,
    enableHiddenMode: () => {
      hiddenMode = true;
      process.stdout.write = function(string) {
        if (hiddenMode && string !== '\n') {
          return originalWrite.call(this, '*');
        }
        return originalWrite.call(this, string);
      };
    },
    disableHiddenMode: () => {
      hiddenMode = false;
      process.stdout.write = originalWrite;
    }
  };
}

/**
 * Prompt for GitHub token with secure input
 */
function promptForToken() {
  return new Promise((resolve) => {
    const { rl, enableHiddenMode, disableHiddenMode } = createSecureInput();
    
    colorLog('\n🔑 Please paste your GitHub Personal Access Token:', 'blue');
    colorLog('   (Input will be partially hidden for security)', 'yellow');
    colorLog('   Press Enter when done.\n', 'yellow');
    
    enableHiddenMode();
    
    rl.question('Token: ', (token) => {
      disableHiddenMode();
      rl.close();
      console.log(''); // New line after hidden input
      resolve(token.trim());
    });
  });
}

/**
 * Main setup function
 */
async function setupGitHubToken() {
  try {
    // Header
    colorLog('\n' + '='.repeat(60), 'blue');
    colorLog('🚀 GitHub Token Setup for Attrition Project', 'bold');
    colorLog('='.repeat(60), 'blue');
    
    colorLog('\n📋 Instructions:', 'yellow');
    colorLog('1. Go to: https://github.com/settings/tokens', 'reset');
    colorLog('2. Click "Generate new token (classic)"', 'reset');
    colorLog('3. Select scopes: repo, workflow, write:packages', 'reset');
    colorLog('4. Copy the generated token', 'reset');
    colorLog('5. Paste it below when prompted\n', 'reset');
    
    // Check if .env exists
    if (!fs.existsSync(envPath)) {
      colorLog('⚠️  .env file not found, will create it', 'yellow');
    }
    
    // Get token from user
    const token = await promptForToken();
    
    if (!token) {
      colorLog('❌ No token provided. Exiting.', 'red');
      process.exit(1);
    }
    
    // Validate token format
    colorLog('🔍 Validating token format...', 'blue');
    if (!validateToken(token)) {
      colorLog('⚠️  Token format doesn\'t match expected GitHub patterns', 'yellow');
      colorLog('   Continuing anyway - it might still work...', 'yellow');
    }
    
    // Test token with GitHub API
    colorLog('🌐 Testing token with GitHub API...', 'blue');
    try {
      const user = await testToken(token);
      colorLog(`✅ Token is valid! Authenticated as: ${user.login}`, 'green');
      if (user.name) {
        colorLog(`   Name: ${user.name}`, 'reset');
      }
    } catch (error) {
      colorLog(`❌ Token validation failed: ${error.message}`, 'red');
      colorLog('   Please check your token and try again.', 'red');
      process.exit(1);
    }
    
    // Save token to .env file
    colorLog('💾 Saving token to .env file...', 'blue');
    if (updateEnvFile(token)) {
      colorLog('\n🎉 Success! Your GitHub token has been securely saved.', 'green');
      colorLog('   File: ' + envPath, 'reset');
      colorLog('\n🔒 Security reminder:', 'yellow');
      colorLog('   • Your .env file is in .gitignore (won\'t be committed)', 'reset');
      colorLog('   • Never share your token publicly', 'reset');
      colorLog('   • You can regenerate it anytime at GitHub settings\n', 'reset');
      
      // Test the configuration
      colorLog('🧪 Testing configuration...', 'blue');
      try {
        require('dotenv').config({ path: envPath });
        if (process.env.GITHUB_TOKEN === token) {
          colorLog('✅ Configuration test passed!', 'green');
        } else {
          colorLog('⚠️  Configuration test failed - token mismatch', 'yellow');
        }
      } catch (error) {
        colorLog('⚠️  Could not test configuration: ' + error.message, 'yellow');
      }
      
    } else {
      colorLog('❌ Failed to save token. Please check file permissions.', 'red');
      process.exit(1);
    }
    
  } catch (error) {
    colorLog(`❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupGitHubToken();
}

module.exports = {
  setupGitHubToken,
  validateToken,
  testToken
};
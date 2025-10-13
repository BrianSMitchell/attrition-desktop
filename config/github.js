/**
 * GitHub Configuration
 * Provides secure access to GitHub API credentials from environment variables
 */

// Load environment variables from .env file
require('dotenv').config();

/**
 * Get GitHub token from environment variables
 * @returns {string} GitHub Personal Access Token
 * @throws {Error} If token is not found
 */
function getGitHubToken() {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    throw new Error(
      'GitHub token not found. Please ensure GITHUB_TOKEN is set in your .env file.\n' +
      'You can create a token at: https://github.com/settings/tokens'
    );
  }
  
  return token;
}

/**
 * Get GitHub API headers with authentication
 * @returns {Object} Headers object for GitHub API requests
 */
function getGitHubHeaders() {
  return {
    'Authorization': `Bearer ${getGitHubToken()}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Attrition-Game'
  };
}

/**
 * GitHub API configuration
 */
const githubConfig = {
  baseUrl: 'https://api.github.com',
  token: getGitHubToken,
  headers: getGitHubHeaders
};

module.exports = {
  githubConfig,
  getGitHubToken,
  getGitHubHeaders
};
/**
 * Example: Using GitHub API with the configured token
 * This demonstrates how to make authenticated requests to GitHub API
 */

const { getGitHubHeaders, githubConfig } = require('../config/github');
const https = require('https');

/**
 * Example: Get repository information
 */
async function getRepositoryInfo(owner, repo) {
  const headers = getGitHubHeaders();
  const url = `${githubConfig.baseUrl}/repos/${owner}/${repo}`;
  
  try {
    const response = await fetch(url, { headers });
    const data = await response.json();
    
    if (response.ok) {
      console.log(`Repository: ${data.full_name}`);
      console.log(`Stars: ${data.stargazers_count}`);
      console.log(`Forks: ${data.forks_count}`);
      console.log(`Description: ${data.description}`);
    } else {
      console.error('GitHub API Error:', data.message);
    }
  } catch (error) {
    console.error('Error fetching repository info:', error.message);
  }
}

/**
 * Example: Create a new issue
 */
async function createIssue(owner, repo, title, body) {
  const headers = getGitHubHeaders();
  headers['Content-Type'] = 'application/json';
  
  const url = `${githubConfig.baseUrl}/repos/${owner}/${repo}/issues`;
  
  const issueData = {
    title: title,
    body: body,
    labels: ['automated']
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(issueData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`Issue created: #${data.number}`);
      console.log(`URL: ${data.html_url}`);
    } else {
      console.error('Error creating issue:', data.message);
    }
  } catch (error) {
    console.error('Error creating issue:', error.message);
  }
}

/**
 * Example: List your repositories
 */
async function listMyRepositories() {
  const headers = getGitHubHeaders();
  const url = `${githubConfig.baseUrl}/user/repos?type=owner&sort=updated`;
  
  try {
    const response = await fetch(url, { headers });
    const repos = await response.json();
    
    if (response.ok) {
      console.log('Your repositories:');
      repos.slice(0, 10).forEach(repo => {
        console.log(`- ${repo.name} (${repo.private ? 'Private' : 'Public'})`);
      });
    } else {
      console.error('Error fetching repositories:', repos.message);
    }
  } catch (error) {
    console.error('Error fetching repositories:', error.message);
  }
}

// Example usage:
if (require.main === module) {
  // Replace with actual values
  // getRepositoryInfo('your-username', 'repository-name');
  // createIssue('your-username', 'repository-name', 'Test Issue', 'This is a test issue created via API');
  // listMyRepositories();
}

module.exports = {
  getRepositoryInfo,
  createIssue,
  listMyRepositories
};
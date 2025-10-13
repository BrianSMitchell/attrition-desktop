/**
 * Git Analysis Service
 * 
 * Analyzes git repository history, recent commits, changed files, and branch information
 * to provide meaningful development context for AI-enhanced workflows.
 * 
 * Key Features:
 * - Recent commit analysis with intelligent summarization
 * - Changed files tracking with impact assessment
 * - Branch and merge activity analysis
 * - Developer activity patterns
 * - File modification patterns and hotspots
 * - Integration with existing simple-git dependency
 * 
 * Uses the existing simple-git package already available in the project.
 */

const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs').promises;

/**
 * Git Analysis Service
 * Provides comprehensive git repository analysis for development context
 */
class GitAnalysisService {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.timeRange = options.timeRange || 7; // days
    this.maxCommits = options.maxCommits || 50;
    this.git = null;
    this.initialized = false;
  }

  /**
   * Initialize the git analysis service
   * @throws {Error} If git repository is not found or invalid
   */
  async initialize() {
    try {
      this.git = simpleGit(this.projectRoot);
      
      // Verify this is a git repository
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        throw new Error(`No git repository found at: ${this.projectRoot}`);
      }
      
      this.initialized = true;
      console.log('🔧 Git Analysis Service initialized');
      
    } catch (error) {
      throw new Error(`Failed to initialize Git Analysis Service: ${error.message}`);
    }
  }

  /**
   * Analyze recent git activity for development context
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Recent activity analysis
   */
  async analyzeRecentActivity(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const timeRangeHours = (options.timeRange || this.timeRange) * 24;
    const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const maxCommits = options.maxCommits || this.maxCommits;

    try {
      // Get recent commits
      const commits = await this.getRecentCommits(since, maxCommits);
      
      // Get current branch and status
      const [currentBranch, status] = await Promise.all([
        this.git.branch(),
        this.git.status()
      ]);

      // Analyze changed files
      const changedFiles = await this.analyzeChangedFiles(commits);
      
      // Get file modification patterns
      const filePatterns = await this.analyzeFilePatterns(commits);
      
      // Analyze commit patterns
      const commitPatterns = await this.analyzeCommitPatterns(commits);

      return {
        timeRange: {
          since: since.toISOString(),
          days: options.timeRange || this.timeRange
        },
        repository: {
          currentBranch: currentBranch.current,
          hasUncommittedChanges: !status.isClean(),
          uncommittedFiles: status.files.length,
          ahead: currentBranch.tracking ? currentBranch.ahead : 0,
          behind: currentBranch.tracking ? currentBranch.behind : 0
        },
        commits: {
          total: commits.length,
          recent: commits.slice(0, 10),
          patterns: commitPatterns
        },
        files: {
          changed: changedFiles,
          patterns: filePatterns,
          hotspots: this.identifyHotspots(changedFiles)
        },
        activity: {
          commitsPerDay: this.calculateCommitsPerDay(commits, timeRangeHours / 24),
          activeDays: this.getActiveDays(commits),
          primaryAreas: this.identifyPrimaryAreas(changedFiles)
        }
      };

    } catch (error) {
      throw new Error(`Failed to analyze recent activity: ${error.message}`);
    }
  }

  /**
   * Analyze changes for specific paths
   * @param {Array<string>} paths - Paths to analyze
   * @returns {Promise<Object>} Path-specific change analysis
   */
  async analyzePathChanges(paths) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const pathAnalysis = {};
      
      for (const targetPath of paths) {
        const log = await this.git.log({
          file: targetPath,
          maxCount: 20
        });

        const fileStats = await this.getFileStats(targetPath);
        
        pathAnalysis[targetPath] = {
          recentCommits: log.all.slice(0, 5).map(commit => ({
            hash: commit.hash,
            message: commit.message,
            date: commit.date,
            author: commit.author_name
          })),
          totalCommits: log.total,
          lastModified: log.latest ? log.latest.date : null,
          fileStats,
          changeFrequency: this.calculateChangeFrequency(log.all)
        };
      }

      return pathAnalysis;

    } catch (error) {
      throw new Error(`Failed to analyze path changes: ${error.message}`);
    }
  }

  /**
   * Get recent commits with enhanced information
   * @param {Date} since - Get commits since this date
   * @param {number} maxCount - Maximum number of commits
   * @returns {Promise<Array>} Enhanced commit information
   */
  async getRecentCommits(since, maxCount) {
    const log = await this.git.log({
      since: since.toISOString(),
      maxCount
    });

    const enhancedCommits = [];

    for (const commit of log.all) {
      try {
        // Get files changed in this commit
        const diffSummary = await this.git.diffSummary([`${commit.hash}^`, commit.hash]);
        
        const enhancedCommit = {
          hash: commit.hash,
          shortHash: commit.hash.substring(0, 8),
          message: commit.message,
          date: commit.date,
          author: {
            name: commit.author_name,
            email: commit.author_email
          },
          stats: {
            insertions: diffSummary.insertions,
            deletions: diffSummary.deletions,
            filesChanged: diffSummary.files.length
          },
          files: diffSummary.files.map(file => ({
            file: file.file,
            changes: file.changes,
            insertions: file.insertions,
            deletions: file.deletions,
            binary: file.binary
          })),
          type: this.categorizeCommit(commit.message),
          impact: this.assessCommitImpact(diffSummary)
        };

        enhancedCommits.push(enhancedCommit);

      } catch (error) {
        // If we can't get diff for this commit, include basic info
        enhancedCommits.push({
          hash: commit.hash,
          shortHash: commit.hash.substring(0, 8),
          message: commit.message,
          date: commit.date,
          author: {
            name: commit.author_name,
            email: commit.author_email
          },
          type: this.categorizeCommit(commit.message),
          error: `Could not analyze commit diff: ${error.message}`
        });
      }
    }

    return enhancedCommits;
  }

  /**
   * Analyze changed files across commits
   * @param {Array} commits - Commits to analyze
   * @returns {Object} Changed files analysis
   */
  async analyzeChangedFiles(commits) {
    const fileChanges = new Map();

    commits.forEach(commit => {
      if (commit.files) {
        commit.files.forEach(file => {
          const filePath = file.file;
          if (!fileChanges.has(filePath)) {
            fileChanges.set(filePath, {
              path: filePath,
              commits: [],
              totalChanges: 0,
              insertions: 0,
              deletions: 0,
              lastModified: null,
              type: this.getFileType(filePath)
            });
          }

          const fileData = fileChanges.get(filePath);
          fileData.commits.push({
            hash: commit.shortHash,
            message: commit.message,
            date: commit.date,
            changes: file.changes
          });
          fileData.totalChanges += file.changes || 0;
          fileData.insertions += file.insertions || 0;
          fileData.deletions += file.deletions || 0;
          
          if (!fileData.lastModified || new Date(commit.date) > new Date(fileData.lastModified)) {
            fileData.lastModified = commit.date;
          }
        });
      }
    });

    // Convert to array and sort by activity
    const sortedFiles = Array.from(fileChanges.values())
      .sort((a, b) => b.totalChanges - a.totalChanges);

    return {
      total: sortedFiles.length,
      mostActive: sortedFiles.slice(0, 10),
      byType: this.groupFilesByType(sortedFiles),
      recentlyModified: sortedFiles
        .filter(file => file.lastModified)
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
        .slice(0, 15)
    };
  }

  /**
   * Analyze file modification patterns
   * @param {Array} commits - Commits to analyze
   * @returns {Object} File pattern analysis
   */
  async analyzeFilePatterns(commits) {
    const patterns = {
      directories: new Map(),
      extensions: new Map(),
      sizes: { small: 0, medium: 0, large: 0 }
    };

    commits.forEach(commit => {
      if (commit.files) {
        commit.files.forEach(file => {
          const filePath = file.file;
          
          // Directory patterns
          const dir = path.dirname(filePath);
          patterns.directories.set(dir, (patterns.directories.get(dir) || 0) + 1);
          
          // Extension patterns
          const ext = path.extname(filePath) || 'no-extension';
          patterns.extensions.set(ext, (patterns.extensions.get(ext) || 0) + 1);
          
          // Change size patterns
          const changes = file.changes || 0;
          if (changes < 10) patterns.sizes.small++;
          else if (changes < 50) patterns.sizes.medium++;
          else patterns.sizes.large++;
        });
      }
    });

    return {
      topDirectories: Array.from(patterns.directories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      topExtensions: Array.from(patterns.extensions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      changeSizes: patterns.sizes
    };
  }

  /**
   * Analyze commit message patterns and categorization
   * @param {Array} commits - Commits to analyze
   * @returns {Object} Commit pattern analysis
   */
  async analyzeCommitPatterns(commits) {
    const patterns = {
      types: new Map(),
      keywords: new Map(),
      messageLength: { short: 0, medium: 0, long: 0 }
    };

    commits.forEach(commit => {
      // Categorize commit type
      const type = commit.type || this.categorizeCommit(commit.message);
      patterns.types.set(type, (patterns.types.get(type) || 0) + 1);

      // Extract keywords
      const keywords = this.extractCommitKeywords(commit.message);
      keywords.forEach(keyword => {
        patterns.keywords.set(keyword, (patterns.keywords.get(keyword) || 0) + 1);
      });

      // Message length patterns
      const length = commit.message.length;
      if (length < 50) patterns.messageLength.short++;
      else if (length < 100) patterns.messageLength.medium++;
      else patterns.messageLength.long++;
    });

    return {
      types: Array.from(patterns.types.entries())
        .sort((a, b) => b[1] - a[1]),
      keywords: Array.from(patterns.keywords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15),
      messageLength: patterns.messageLength
    };
  }

  /**
   * Categorize a commit based on its message
   * @param {string} message - Commit message
   * @returns {string} Commit category
   */
  categorizeCommit(message) {
    const lower = message.toLowerCase();
    
    if (lower.includes('feat') || lower.includes('feature')) return 'feature';
    if (lower.includes('fix') || lower.includes('bug')) return 'bugfix';
    if (lower.includes('refactor')) return 'refactor';
    if (lower.includes('test')) return 'test';
    if (lower.includes('docs') || lower.includes('documentation')) return 'documentation';
    if (lower.includes('style') || lower.includes('format')) return 'style';
    if (lower.includes('perf') || lower.includes('performance')) return 'performance';
    if (lower.includes('build') || lower.includes('deps')) return 'build';
    if (lower.includes('ci') || lower.includes('deploy')) return 'ci';
    if (lower.includes('chore')) return 'chore';
    if (lower.includes('merge')) return 'merge';
    if (lower.includes('initial') || lower.includes('init')) return 'initial';
    
    return 'other';
  }

  /**
   * Extract meaningful keywords from commit message
   * @param {string} message - Commit message
   * @returns {Array<string>} Extracted keywords
   */
  extractCommitKeywords(message) {
    const commonWords = new Set([
      'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'the', 'a', 'an'
    ]);

    return message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word))
      .slice(0, 5); // Limit to top 5 keywords per commit
  }

  /**
   * Assess the impact level of a commit
   * @param {Object} diffSummary - Git diff summary
   * @returns {string} Impact level (low, medium, high)
   */
  assessCommitImpact(diffSummary) {
    const totalChanges = diffSummary.insertions + diffSummary.deletions;
    const filesChanged = diffSummary.files.length;

    if (totalChanges > 500 || filesChanged > 20) return 'high';
    if (totalChanges > 100 || filesChanged > 5) return 'medium';
    return 'low';
  }

  /**
   * Get file type based on extension
   * @param {string} filePath - Path to file
   * @returns {string} File type category
   */
  getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    const typeMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'react',
      '.tsx': 'react',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'sass',
      '.json': 'config',
      '.md': 'documentation',
      '.txt': 'documentation',
      '.yml': 'config',
      '.yaml': 'config',
      '.xml': 'config',
      '.sql': 'database',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.sh': 'script',
      '.bat': 'script',
      '.png': 'image',
      '.jpg': 'image',
      '.gif': 'image',
      '.svg': 'image'
    };

    return typeMap[ext] || 'other';
  }

  /**
   * Group files by their type
   * @param {Array} files - Files to group
   * @returns {Object} Files grouped by type
   */
  groupFilesByType(files) {
    const groups = {};
    
    files.forEach(file => {
      const type = file.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(file);
    });

    return groups;
  }

  /**
   * Identify file hotspots (frequently changed files)
   * @param {Object} changedFiles - Changed files analysis
   * @returns {Array} Hotspot files
   */
  identifyHotspots(changedFiles) {
    if (!changedFiles.mostActive) return [];

    return changedFiles.mostActive
      .filter(file => file.commits.length > 2)
      .slice(0, 8)
      .map(file => ({
        path: file.path,
        changeCount: file.commits.length,
        totalChanges: file.totalChanges,
        riskLevel: file.commits.length > 5 ? 'high' : 
                  file.commits.length > 3 ? 'medium' : 'low'
      }));
  }

  /**
   * Calculate commits per day average
   * @param {Array} commits - Commits to analyze
   * @param {number} dayRange - Number of days in range
   * @returns {number} Average commits per day
   */
  calculateCommitsPerDay(commits, dayRange) {
    return Math.round((commits.length / dayRange) * 100) / 100;
  }

  /**
   * Get number of active development days
   * @param {Array} commits - Commits to analyze
   * @returns {number} Number of active days
   */
  getActiveDays(commits) {
    const activeDays = new Set();
    
    commits.forEach(commit => {
      const day = new Date(commit.date).toDateString();
      activeDays.add(day);
    });

    return activeDays.size;
  }

  /**
   * Identify primary development areas
   * @param {Object} changedFiles - Changed files analysis
   * @returns {Array} Primary development areas
   */
  identifyPrimaryAreas(changedFiles) {
    if (!changedFiles.byType) return [];

    return Object.entries(changedFiles.byType)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([type, files]) => ({
        area: type,
        fileCount: files.length,
        totalChanges: files.reduce((sum, file) => sum + file.totalChanges, 0)
      }));
  }

  /**
   * Get file statistics
   * @param {string} filePath - Path to file
   * @returns {Promise<Object>} File statistics
   */
  async getFileStats(filePath) {
    try {
      const fullPath = path.join(this.projectRoot, filePath);
      const stats = await fs.stat(fullPath);
      
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        exists: true
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate change frequency for a file
   * @param {Array} commits - Commits affecting the file
   * @returns {string} Frequency category
   */
  calculateChangeFrequency(commits) {
    const now = new Date();
    const recentCommits = commits.filter(commit => {
      const commitDate = new Date(commit.date);
      const daysDiff = (now - commitDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30; // Last 30 days
    });

    const frequency = recentCommits.length;
    
    if (frequency > 10) return 'very-high';
    if (frequency > 5) return 'high';
    if (frequency > 2) return 'medium';
    if (frequency > 0) return 'low';
    return 'none';
  }

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      projectRoot: this.projectRoot,
      timeRange: this.timeRange,
      maxCommits: this.maxCommits
    };
  }
}

module.exports = {
  GitAnalysisService
};
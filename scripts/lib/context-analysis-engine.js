/**
 * Context Analysis Engine
 * 
 * Main orchestrator that combines Git and Project analysis to provide intelligent context
 * for AI-enhanced development workflows. This engine analyzes recent development activity,
 * project structure, and provides prioritized insights for AI consumption.
 * 
 * Key Features:
 * - Git history analysis (recent commits, changed files, branch info)
 * - Project structure analysis (file types, dependencies, config files)
 * - Context aggregation and prioritization for AI prompts
 * - Caching and performance optimization
 * - Integration with existing AI service client
 * 
 * Architecture follows existing codebase patterns for consistency.
 */

const { GitAnalysisService } = require('./git-analysis-service');
const { ProjectAnalysisService } = require('./project-analysis-service');
const { ContextAggregator } = require('./context-aggregator');
const { getAIConfig } = require('../../config/ai-config');

/**
 * Context Analysis Engine
 * Orchestrates all context analysis services and provides a unified interface
 */
class ContextAnalysisEngine {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.config = null;
    this.initialized = false;
    
    // Analysis services
    this.gitService = null;
    this.projectService = null;
    this.aggregator = null;
    
    // Caching
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize the context analysis engine
   * @param {Object} options - Initialization options
   * @throws {Error} If initialization fails
   */
  async initialize(options = {}) {
    try {
      // Load configuration
      this.config = getAIConfig();
      
      // Initialize analysis services
      this.gitService = new GitAnalysisService({
        projectRoot: this.projectRoot,
        timeRange: this.config.context.timeRangeDays,
        maxCommits: this.config.context.maxCommits
      });
      
      this.projectService = new ProjectAnalysisService({
        projectRoot: this.projectRoot,
        cacheEnabled: this.config.context.cacheEnabled
      });
      
      this.aggregator = new ContextAggregator({
        maxContextLength: options.maxContextLength || 4000
      });
      
      // Initialize services
      await this.gitService.initialize();
      await this.projectService.initialize();
      
      this.initialized = true;
      console.log('🔍 Context Analysis Engine initialized');
      
    } catch (error) {
      throw new Error(`Failed to initialize Context Analysis Engine: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive context for AI requests
   * @param {Object} options - Analysis options
   * @param {string} options.type - Type of context needed ('development', 'project-overview', 'recent-changes')
   * @param {Array<string>} options.focus - Specific areas to focus on
   * @param {boolean} options.useCache - Whether to use cached results
   * @returns {Promise<Object>} Comprehensive context object
   */
  async generateContext(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      type = 'development',
      focus = [],
      useCache = true,
      includeGit = true,
      includeProject = true
    } = options;

    // Check cache first
    const cacheKey = this.getCacheKey({ type, focus, includeGit, includeProject });
    if (useCache && this.hasValidCache(cacheKey)) {
      console.log('📋 Using cached context');
      return this.cache.get(cacheKey).data;
    }

    try {
      // Gather raw data from services
      const analysisPromises = [];
      
      if (includeGit) {
        analysisPromises.push(this.gitService.analyzeRecentActivity());
      }
      
      if (includeProject) {
        analysisPromises.push(this.projectService.analyzeProjectStructure());
      }

      const results = await Promise.all(analysisPromises);
      
      // Separate git and project results
      let gitAnalysis = null;
      let projectAnalysis = null;
      
      if (includeGit && includeProject) {
        [gitAnalysis, projectAnalysis] = results;
      } else if (includeGit) {
        gitAnalysis = results[0];
      } else if (includeProject) {
        projectAnalysis = results[0];
      }

      // Aggregate and prioritize context
      const context = await this.aggregator.aggregate({
        git: gitAnalysis,
        project: projectAnalysis,
        type,
        focus
      });

      // Cache the result
      if (useCache) {
        this.cache.set(cacheKey, {
          data: context,
          timestamp: Date.now()
        });
      }

      return context;

    } catch (error) {
      throw new Error(`Failed to generate context: ${error.message}`);
    }
  }

  /**
   * Generate focused context for specific development activities
   * @param {string} activity - The development activity ('feature-development', 'debugging', 'refactoring', 'testing')
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Focused context for the activity
   */
  async generateActivityContext(activity, options = {}) {
    const activityConfigs = {
      'feature-development': {
        focus: ['recent-commits', 'changed-files', 'dependencies', 'project-structure'],
        includeGit: true,
        includeProject: true,
        type: 'development'
      },
      'debugging': {
        focus: ['recent-commits', 'changed-files', 'error-patterns', 'test-files'],
        includeGit: true,
        includeProject: true,
        type: 'debugging'
      },
      'refactoring': {
        focus: ['file-structure', 'dependencies', 'code-patterns', 'architecture'],
        includeGit: false,
        includeProject: true,
        type: 'refactoring'
      },
      'testing': {
        focus: ['test-files', 'changed-files', 'coverage-areas'],
        includeGit: true,
        includeProject: true,
        type: 'testing'
      },
      'social-posting': {
        focus: ['recent-commits', 'milestones', 'features', 'progress'],
        includeGit: true,
        includeProject: false,
        type: 'social-media'
      }
    };

    const config = activityConfigs[activity];
    if (!config) {
      throw new Error(`Unknown development activity: ${activity}`);
    }

    return await this.generateContext({
      ...config,
      ...options
    });
  }

  /**
   * Get quick development summary for immediate context
   * @returns {Promise<Object>} Quick summary of recent development
   */
  async getQuickSummary() {
    return await this.generateContext({
      type: 'quick-summary',
      focus: ['recent-commits', 'active-files'],
      useCache: true
    });
  }

  /**
   * Get project overview for new developers or AI orientation
   * @returns {Promise<Object>} Comprehensive project overview
   */
  async getProjectOverview() {
    return await this.generateContext({
      type: 'project-overview',
      focus: ['project-structure', 'main-technologies', 'architecture'],
      includeGit: false,
      includeProject: true,
      useCache: true
    });
  }

  /**
   * Get change analysis for specific files or directories
   * @param {Array<string>} paths - Paths to analyze
   * @returns {Promise<Object>} Analysis of changes for specified paths
   */
  async getChangeAnalysis(paths) {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.gitService.analyzePathChanges(paths);
  }

  /**
   * Generate cache key for context requests
   * @param {Object} options - Context options
   * @returns {string} Cache key
   */
  getCacheKey(options) {
    const key = [
      options.type || 'default',
      (options.focus || []).sort().join(','),
      options.includeGit ? 'git' : '',
      options.includeProject ? 'project' : ''
    ].filter(Boolean).join('|');
    
    return `context:${key}`;
  }

  /**
   * Check if cached context is still valid
   * @param {string} cacheKey - Cache key to check
   * @returns {boolean} True if cache is valid
   */
  hasValidCache(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    return age < this.cacheTimeout;
  }

  /**
   * Clear context cache
   * @param {string} pattern - Optional pattern to match cache keys (default: clear all)
   */
  clearCache(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      console.log('🗑️  Context cache cleared');
      return;
    }

    const keysToDelete = [...this.cache.keys()].filter(key => 
      key.includes(pattern)
    );
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️  Cleared ${keysToDelete.length} cache entries matching: ${pattern}`);
  }

  /**
   * Get engine status and diagnostics
   * @returns {Object} Engine status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      projectRoot: this.projectRoot,
      cacheSize: this.cache.size,
      services: {
        git: this.gitService?.getStatus() || 'not-initialized',
        project: this.projectService?.getStatus() || 'not-initialized',
        aggregator: this.aggregator?.getStatus() || 'not-initialized'
      },
      config: this.config ? {
        timeRange: this.config.context.timeRangeDays,
        maxCommits: this.config.context.maxCommits,
        cacheEnabled: this.config.context.cacheEnabled
      } : 'not-loaded'
    };
  }

  /**
   * Test context generation functionality
   * @returns {Promise<boolean>} True if test passes
   */
  async testContextGeneration() {
    try {
      const context = await this.generateContext({
        type: 'test',
        useCache: false,
        includeGit: true,
        includeProject: true
      });

      return context && 
             typeof context === 'object' && 
             (context.git || context.project);
             
    } catch (error) {
      console.error('Context generation test failed:', error.message);
      return false;
    }
  }
}

// Singleton instance for global access
let engineInstance = null;

/**
 * Get the singleton context analysis engine instance
 * @param {Object} options - Initialization options
 * @returns {ContextAnalysisEngine} Singleton engine instance
 */
function getContextAnalysisEngine(options = {}) {
  if (!engineInstance) {
    engineInstance = new ContextAnalysisEngine(options);
  }
  return engineInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
function resetContextAnalysisEngine() {
  engineInstance = null;
}

module.exports = {
  ContextAnalysisEngine,
  getContextAnalysisEngine,
  resetContextAnalysisEngine
};
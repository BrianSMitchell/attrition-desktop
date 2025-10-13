/**
 * Context Aggregator
 * 
 * Intelligently combines and prioritizes context from Git and Project analysis services
 * to create coherent, focused context suitable for AI consumption. This service applies
 * smart filtering, prioritization, and formatting to ensure AI prompts are effective.
 * 
 * Key Features:
 * - Context combination and deduplication
 * - Priority-based filtering for relevance
 * - Length optimization for AI token limits
 * - Activity-specific context customization
 * - Smart summarization of complex information
 * - Context freshness and importance scoring
 * 
 * Designed to create the best possible context for AI decision-making.
 */

/**
 * Context Aggregator
 * Combines and prioritizes analysis results into AI-ready context
 */
class ContextAggregator {
  constructor(options = {}) {
    this.maxContextLength = options.maxContextLength || 4000;
    this.priorityWeights = options.priorityWeights || {
      recentChanges: 1.0,
      fileActivity: 0.8,
      projectStructure: 0.6,
      dependencies: 0.4,
      configurations: 0.3
    };
  }

  /**
   * Aggregate context from multiple analysis sources
   * @param {Object} sources - Analysis sources
   * @param {Object} sources.git - Git analysis results
   * @param {Object} sources.project - Project analysis results
   * @param {string} sources.type - Context type ('development', 'debugging', etc.)
   * @param {Array<string>} sources.focus - Focus areas
   * @returns {Promise<Object>} Aggregated context
   */
  async aggregate(sources) {
    const { git, project, type = 'development', focus = [] } = sources;

    // Create context sections based on available data
    const contextSections = [];

    if (git) {
      contextSections.push(...this.processGitContext(git, type, focus));
    }

    if (project) {
      contextSections.push(...this.processProjectContext(project, type, focus));
    }

    // Prioritize and filter sections
    const prioritizedSections = this.prioritizeSections(contextSections, type, focus);
    
    // Optimize for length constraints
    const optimizedContext = this.optimizeContextLength(prioritizedSections);
    
    // Format for AI consumption
    const formattedContext = this.formatForAI(optimizedContext, type);

    return {
      type,
      focus,
      timestamp: new Date().toISOString(),
      sections: optimizedContext,
      summary: this.generateContextSummary(optimizedContext),
      formatted: formattedContext,
      metadata: {
        totalSections: contextSections.length,
        includedSections: optimizedContext.length,
        estimatedTokens: this.estimateTokenCount(formattedContext),
        sources: {
          git: !!git,
          project: !!project
        }
      }
    };
  }

  /**
   * Process git analysis into context sections
   * @param {Object} gitAnalysis - Git analysis results
   * @param {string} type - Context type
   * @param {Array<string>} focus - Focus areas
   * @returns {Array} Context sections
   */
  processGitContext(gitAnalysis, type, focus) {
    const sections = [];

    // Recent commits context
    if (this.shouldIncludeSection('recent-commits', focus) && gitAnalysis.commits?.recent?.length > 0) {
      sections.push({
        id: 'recent-commits',
        title: 'Recent Development Activity',
        priority: this.calculatePriority('recentChanges', gitAnalysis.commits.recent.length),
        content: this.formatRecentCommits(gitAnalysis.commits.recent),
        type: 'git-activity',
        freshness: this.calculateFreshness(gitAnalysis.commits.recent[0]?.date)
      });
    }

    // Changed files context
    if (this.shouldIncludeSection('changed-files', focus) && gitAnalysis.files?.changed) {
      sections.push({
        id: 'changed-files',
        title: 'Recently Modified Files',
        priority: this.calculatePriority('fileActivity', gitAnalysis.files.changed.total),
        content: this.formatChangedFiles(gitAnalysis.files.changed),
        type: 'file-activity',
        freshness: this.calculateAverageFileFreshness(gitAnalysis.files.changed.recentlyModified)
      });
    }

    // File hotspots context
    if (gitAnalysis.files?.hotspots?.length > 0) {
      sections.push({
        id: 'file-hotspots',
        title: 'File Change Hotspots',
        priority: this.calculatePriority('fileActivity', gitAnalysis.files.hotspots.length),
        content: this.formatFileHotspots(gitAnalysis.files.hotspots),
        type: 'risk-analysis',
        freshness: 0.8 // Hotspots are always relatively relevant
      });
    }

    // Repository status context
    if (gitAnalysis.repository) {
      sections.push({
        id: 'repository-status',
        title: 'Repository Status',
        priority: gitAnalysis.repository.hasUncommittedChanges ? 0.9 : 0.5,
        content: this.formatRepositoryStatus(gitAnalysis.repository),
        type: 'status',
        freshness: 1.0 // Current status is always fresh
      });
    }

    // Development activity patterns
    if (gitAnalysis.activity) {
      sections.push({
        id: 'activity-patterns',
        title: 'Development Patterns',
        priority: this.calculatePriority('fileActivity', gitAnalysis.activity.commitsPerDay * 10),
        content: this.formatActivityPatterns(gitAnalysis.activity),
        type: 'insights',
        freshness: 0.6
      });
    }

    return sections;
  }

  /**
   * Process project analysis into context sections
   * @param {Object} projectAnalysis - Project analysis results
   * @param {string} type - Context type
   * @param {Array<string>} focus - Focus areas
   * @returns {Array} Context sections
   */
  processProjectContext(projectAnalysis, type, focus) {
    const sections = [];

    // Project overview context
    if (this.shouldIncludeSection('project-overview', focus) && projectAnalysis.overview) {
      sections.push({
        id: 'project-overview',
        title: 'Project Overview',
        priority: this.calculatePriority('projectStructure', 1),
        content: this.formatProjectOverview(projectAnalysis.overview),
        type: 'overview',
        freshness: 0.7
      });
    }

    // Architecture context
    if (this.shouldIncludeSection('architecture', focus) && projectAnalysis.architecture) {
      sections.push({
        id: 'architecture',
        title: 'Project Architecture',
        priority: this.calculatePriority('projectStructure', projectAnalysis.architecture.complexity === 'complex' ? 2 : 1),
        content: this.formatArchitecture(projectAnalysis.architecture),
        type: 'architecture',
        freshness: 0.6
      });
    }

    // Technologies context
    if (this.shouldIncludeSection('technologies', focus) && projectAnalysis.technologies) {
      sections.push({
        id: 'technologies',
        title: 'Technology Stack',
        priority: this.calculatePriority('dependencies', 
          (projectAnalysis.technologies.languages?.length || 0) + 
          (projectAnalysis.technologies.frameworks?.length || 0)
        ),
        content: this.formatTechnologies(projectAnalysis.technologies),
        type: 'technologies',
        freshness: 0.5
      });
    }

    // Dependencies context
    if (this.shouldIncludeSection('dependencies', focus) && projectAnalysis.dependencies) {
      sections.push({
        id: 'dependencies',
        title: 'Project Dependencies',
        priority: this.calculatePriority('dependencies', 
          Object.keys(projectAnalysis.dependencies.package?.dependencies || {}).length
        ),
        content: this.formatDependencies(projectAnalysis.dependencies),
        type: 'dependencies',
        freshness: 0.4
      });
    }

    // Configuration context
    if (this.shouldIncludeSection('configurations', focus) && projectAnalysis.configurations) {
      sections.push({
        id: 'configurations',
        title: 'Project Configuration',
        priority: this.calculatePriority('configurations', this.countConfigurations(projectAnalysis.configurations)),
        content: this.formatConfigurations(projectAnalysis.configurations),
        type: 'configuration',
        freshness: 0.3
      });
    }

    // Recommendations context
    if (projectAnalysis.recommendations?.length > 0) {
      sections.push({
        id: 'recommendations',
        title: 'Project Recommendations',
        priority: this.calculatePriority('configurations', projectAnalysis.recommendations.length),
        content: this.formatRecommendations(projectAnalysis.recommendations),
        type: 'recommendations',
        freshness: 0.8 // Recommendations are actionable
      });
    }

    return sections;
  }

  /**
   * Check if a section should be included based on focus areas
   * @param {string} sectionId - Section identifier
   * @param {Array<string>} focus - Focus areas
   * @returns {boolean} True if should include
   */
  shouldIncludeSection(sectionId, focus) {
    if (focus.length === 0) return true;
    return focus.includes(sectionId) || focus.includes('all');
  }

  /**
   * Calculate priority score for a section
   * @param {string} category - Priority category
   * @param {number} magnitude - Magnitude factor
   * @returns {number} Priority score
   */
  calculatePriority(category, magnitude) {
    const baseWeight = this.priorityWeights[category] || 0.5;
    const magnitudeScore = Math.min(magnitude / 10, 1); // Normalize magnitude
    return baseWeight * (0.5 + magnitudeScore * 0.5);
  }

  /**
   * Calculate content freshness based on date
   * @param {string} dateString - Date string
   * @returns {number} Freshness score (0-1)
   */
  calculateFreshness(dateString) {
    if (!dateString) return 0;
    
    const date = new Date(dateString);
    const now = new Date();
    const ageHours = (now - date) / (1000 * 60 * 60);
    
    if (ageHours < 1) return 1.0;
    if (ageHours < 24) return 0.9;
    if (ageHours < 168) return 0.7; // 1 week
    if (ageHours < 720) return 0.5; // 1 month
    return 0.3;
  }

  /**
   * Prioritize context sections for inclusion
   * @param {Array} sections - Context sections
   * @param {string} type - Context type
   * @param {Array<string>} focus - Focus areas
   * @returns {Array} Prioritized sections
   */
  prioritizeSections(sections, type, focus) {
    // Calculate composite score for each section
    sections.forEach(section => {
      section.compositeScore = (
        section.priority * 0.6 +
        section.freshness * 0.3 +
        (focus.includes(section.id) ? 0.1 : 0)
      );
    });

    // Sort by composite score (descending)
    return sections.sort((a, b) => b.compositeScore - a.compositeScore);
  }

  /**
   * Optimize context length to stay within limits
   * @param {Array} sections - Prioritized sections
   * @returns {Array} Optimized sections
   */
  optimizeContextLength(sections) {
    const optimized = [];
    let currentLength = 0;

    for (const section of sections) {
      const sectionLength = this.estimateTextLength(section.content);
      
      if (currentLength + sectionLength <= this.maxContextLength) {
        optimized.push(section);
        currentLength += sectionLength;
      } else {
        // Try to include a truncated version
        const availableSpace = this.maxContextLength - currentLength;
        if (availableSpace > 200) { // Minimum meaningful space
          const truncatedSection = {
            ...section,
            content: this.truncateContent(section.content, availableSpace),
            truncated: true
          };
          optimized.push(truncatedSection);
        }
        break;
      }
    }

    return optimized;
  }

  /**
   * Format context for AI consumption
   * @param {Array} sections - Context sections
   * @param {string} type - Context type
   * @returns {string} Formatted context
   */
  formatForAI(sections, type) {
    const contextParts = [
      `# Development Context - ${this.getContextTypeTitle(type)}`,
      '',
      '## Current Development State'
    ];

    sections.forEach(section => {
      contextParts.push('');
      contextParts.push(`### ${section.title}`);
      contextParts.push(section.content);
      
      if (section.truncated) {
        contextParts.push('*(Content truncated for brevity)*');
      }
    });

    return contextParts.join('\n');
  }

  /**
   * Generate a brief summary of the context
   * @param {Array} sections - Context sections
   * @returns {string} Context summary
   */
  generateContextSummary(sections) {
    const summaryParts = [];
    
    const gitSections = sections.filter(s => s.type.startsWith('git') || s.type === 'status');
    const projectSections = sections.filter(s => !s.type.startsWith('git') && s.type !== 'status');
    
    if (gitSections.length > 0) {
      summaryParts.push(`Recent development activity with ${gitSections.length} git-related insights`);
    }
    
    if (projectSections.length > 0) {
      summaryParts.push(`Project structure analysis with ${projectSections.length} architectural insights`);
    }

    return summaryParts.join(' and ') || 'Basic development context';
  }

  /**
   * Estimate token count for text (rough approximation)
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokenCount(text) {
    // Rough approximation: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate text length for a content object
   * @param {string} content - Content to measure
   * @returns {number} Estimated character length
   */
  estimateTextLength(content) {
    if (typeof content === 'string') {
      return content.length;
    }
    return JSON.stringify(content).length;
  }

  /**
   * Truncate content to fit available space
   * @param {string} content - Content to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated content
   */
  truncateContent(content, maxLength) {
    if (content.length <= maxLength) {
      return content;
    }
    
    const truncated = content.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Get human-readable title for context type
   * @param {string} type - Context type
   * @returns {string} Human-readable title
   */
  getContextTypeTitle(type) {
    const titles = {
      'development': 'Active Development',
      'debugging': 'Debugging Session',
      'refactoring': 'Code Refactoring',
      'testing': 'Testing Focus',
      'social-media': 'Social Media Content',
      'project-overview': 'Project Overview',
      'quick-summary': 'Quick Summary'
    };
    
    return titles[type] || 'Development Context';
  }

  // Formatting methods for different content types

  /**
   * Format recent commits for context
   * @param {Array} commits - Recent commits
   * @returns {string} Formatted commits
   */
  formatRecentCommits(commits) {
    const formatted = commits.slice(0, 5).map(commit => 
      `- ${commit.shortHash}: ${commit.message} (${commit.author.name}, ${this.formatRelativeTime(commit.date)})`
    );
    
    return formatted.join('\n');
  }

  /**
   * Format changed files for context
   * @param {Object} changedFiles - Changed files data
   * @returns {string} Formatted changed files
   */
  formatChangedFiles(changedFiles) {
    const parts = [
      `Total files changed: ${changedFiles.total}`,
      '',
      'Most active files:'
    ];
    
    if (changedFiles.mostActive) {
      changedFiles.mostActive.slice(0, 5).forEach(file => {
        parts.push(`- ${file.path} (${file.totalChanges} changes, ${file.commits.length} commits)`);
      });
    }
    
    return parts.join('\n');
  }

  /**
   * Format file hotspots for context
   * @param {Array} hotspots - File hotspots
   * @returns {string} Formatted hotspots
   */
  formatFileHotspots(hotspots) {
    const parts = ['Files requiring attention:'];
    
    hotspots.slice(0, 5).forEach(hotspot => {
      const riskIndicator = hotspot.riskLevel === 'high' ? '⚠️' : 
                           hotspot.riskLevel === 'medium' ? '⚡' : 'ℹ️';
      parts.push(`${riskIndicator} ${hotspot.path} (${hotspot.changeCount} changes, risk: ${hotspot.riskLevel})`);
    });
    
    return parts.join('\n');
  }

  /**
   * Format repository status for context
   * @param {Object} repository - Repository status
   * @returns {string} Formatted repository status
   */
  formatRepositoryStatus(repository) {
    const parts = [
      `Current branch: ${repository.currentBranch}`,
    ];
    
    if (repository.hasUncommittedChanges) {
      parts.push(`⚠️ Uncommitted changes: ${repository.uncommittedFiles} files`);
    }
    
    if (repository.ahead > 0) {
      parts.push(`↑ ${repository.ahead} commits ahead`);
    }
    
    if (repository.behind > 0) {
      parts.push(`↓ ${repository.behind} commits behind`);
    }
    
    return parts.join('\n');
  }

  /**
   * Format activity patterns for context
   * @param {Object} activity - Activity data
   * @returns {string} Formatted activity patterns
   */
  formatActivityPatterns(activity) {
    const parts = [
      `Development velocity: ${activity.commitsPerDay} commits/day`,
      `Active development days: ${activity.activeDays}`,
    ];
    
    if (activity.primaryAreas && activity.primaryAreas.length > 0) {
      parts.push('', 'Primary development areas:');
      activity.primaryAreas.slice(0, 3).forEach(area => {
        parts.push(`- ${area.area}: ${area.fileCount} files`);
      });
    }
    
    return parts.join('\n');
  }

  /**
   * Format project overview for context
   * @param {Object} overview - Project overview
   * @returns {string} Formatted overview
   */
  formatProjectOverview(overview) {
    return [
      `Project: ${overview.name}`,
      `Type: ${overview.type}`,
      `Structure: ${overview.structure}`,
      `Size: ${overview.size} files`
    ].join('\n');
  }

  /**
   * Format architecture for context
   * @param {Object} architecture - Architecture data
   * @returns {string} Formatted architecture
   */
  formatArchitecture(architecture) {
    const parts = [
      `Pattern: ${architecture.pattern}`,
      `Complexity: ${architecture.complexity}`,
    ];
    
    const components = [];
    if (architecture.isMonorepo) components.push('monorepo');
    if (architecture.hasFrontend) components.push('frontend');
    if (architecture.hasBackend) components.push('backend');
    if (architecture.hasDatabase) components.push('database');
    if (architecture.hasTests) components.push('tests');
    
    if (components.length > 0) {
      parts.push(`Components: ${components.join(', ')}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Format technologies for context
   * @param {Object} technologies - Technologies data
   * @returns {string} Formatted technologies
   */
  formatTechnologies(technologies) {
    const parts = [];
    
    if (technologies.languages?.length > 0) {
      parts.push(`Languages: ${technologies.languages.join(', ')}`);
    }
    
    if (technologies.frameworks?.length > 0) {
      parts.push(`Frameworks: ${technologies.frameworks.join(', ')}`);
    }
    
    if (technologies.tools?.length > 0) {
      parts.push(`Tools: ${technologies.tools.slice(0, 5).join(', ')}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Format dependencies for context
   * @param {Object} dependencies - Dependencies data
   * @returns {string} Formatted dependencies
   */
  formatDependencies(dependencies) {
    const parts = [];
    
    if (dependencies.package?.name) {
      parts.push(`Package: ${dependencies.package.name}@${dependencies.package.version}`);
    }
    
    const depCount = Object.keys(dependencies.package?.dependencies || {}).length;
    const devDepCount = Object.keys(dependencies.package?.devDependencies || {}).length;
    
    parts.push(`Dependencies: ${depCount} runtime, ${devDepCount} development`);
    
    if (dependencies.workspaces?.length > 0) {
      parts.push(`Workspaces: ${dependencies.workspaces.length} packages`);
    }
    
    return parts.join('\n');
  }

  /**
   * Format configurations for context
   * @param {Object} configurations - Configuration data
   * @returns {string} Formatted configurations
   */
  formatConfigurations(configurations) {
    const parts = [];
    
    Object.entries(configurations).forEach(([category, configs]) => {
      if (configs.length > 0) {
        parts.push(`${category}: ${configs.length} files`);
      }
    });
    
    return parts.join('\n');
  }

  /**
   * Format recommendations for context
   * @param {Array} recommendations - Recommendations
   * @returns {string} Formatted recommendations
   */
  formatRecommendations(recommendations) {
    return recommendations.slice(0, 3).map(rec => 
      `[${rec.priority.toUpperCase()}] ${rec.message}`
    ).join('\n');
  }

  /**
   * Calculate average freshness for files
   * @param {Array} files - Files with modification dates
   * @returns {number} Average freshness score
   */
  calculateAverageFileFreshness(files) {
    if (!files || files.length === 0) return 0;
    
    const freshnessScores = files.map(file => 
      this.calculateFreshness(file.lastModified)
    );
    
    return freshnessScores.reduce((sum, score) => sum + score, 0) / freshnessScores.length;
  }

  /**
   * Count total configurations across categories
   * @param {Object} configurations - Configuration data
   * @returns {number} Total configuration count
   */
  countConfigurations(configurations) {
    return Object.values(configurations).reduce((total, configs) => 
      total + (Array.isArray(configs) ? configs.length : 0), 0
    );
  }

  /**
   * Format relative time for display
   * @param {string} dateString - Date string
   * @returns {string} Relative time description
   */
  formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  }

  /**
   * Get aggregator status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      maxContextLength: this.maxContextLength,
      priorityWeights: this.priorityWeights
    };
  }
}

module.exports = {
  ContextAggregator
};
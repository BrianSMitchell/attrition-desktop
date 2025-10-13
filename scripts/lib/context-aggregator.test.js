/**
 * Tests for Context Aggregator
 * 
 * Comprehensive unit tests for the Context Aggregator, testing context combination,
 * prioritization, length optimization, and AI-ready formatting.
 */

const { ContextAggregator } = require('./context-aggregator');

describe('ContextAggregator', () => {
  let aggregator;
  let mockGitAnalysis;
  let mockProjectAnalysis;

  beforeEach(() => {
    aggregator = new ContextAggregator({
      maxContextLength: 2000 // Shorter for testing
    });

    // Mock git analysis data
    mockGitAnalysis = {
      repository: {
        currentBranch: 'main',
        hasUncommittedChanges: true,
        uncommittedFiles: 3,
        ahead: 2,
        behind: 0
      },
      commits: {
        total: 15,
        recent: [
          {
            shortHash: 'abc123',
            message: 'feat: add user authentication',
            date: new Date().toISOString(),
            author: { name: 'John Doe', email: 'john@example.com' }
          },
          {
            shortHash: 'def456',
            message: 'fix: resolve login bug',
            date: new Date(Date.now() - 3600000).toISOString(),
            author: { name: 'Jane Smith', email: 'jane@example.com' }
          }
        ]
      },
      files: {
        changed: {
          total: 8,
          mostActive: [
            { path: 'src/auth.js', totalChanges: 45, commits: [1, 2, 3] },
            { path: 'src/login.js', totalChanges: 23, commits: [1, 2] }
          ],
          recentlyModified: [
            { path: 'src/auth.js', lastModified: new Date().toISOString() }
          ]
        },
        hotspots: [
          { path: 'src/auth.js', changeCount: 8, riskLevel: 'high' },
          { path: 'src/api.js', changeCount: 4, riskLevel: 'medium' }
        ]
      },
      activity: {
        commitsPerDay: 2.1,
        activeDays: 5,
        primaryAreas: [
          { area: 'javascript', fileCount: 6 },
          { area: 'config', fileCount: 2 }
        ]
      }
    };

    // Mock project analysis data
    mockProjectAnalysis = {
      overview: {
        name: 'attrition-game',
        type: 'monorepo',
        structure: 'complex',
        size: 1247
      },
      architecture: {
        pattern: 'monorepo',
        complexity: 'complex',
        isMonorepo: true,
        hasFrontend: true,
        hasBackend: true,
        hasDatabase: false,
        hasTests: true
      },
      technologies: {
        languages: ['JavaScript', 'TypeScript'],
        frameworks: ['React', 'Electron'],
        tools: ['Jest', 'ESLint', 'Webpack']
      },
      dependencies: {
        package: {
          name: 'attrition',
          version: '1.2.1',
          dependencies: { react: '^18.0.0', electron: '^31.0.0' },
          devDependencies: { jest: '^29.0.0', eslint: '^8.0.0' }
        },
        workspaces: ['client', 'server', 'shared']
      },
      configurations: {
        build: [{ file: 'webpack.config.js' }],
        testing: [{ file: 'jest.config.js' }],
        linting: [{ file: '.eslintrc.js' }]
      },
      recommendations: [
        { type: 'testing', priority: 'medium', message: 'Consider adding more unit tests' },
        { type: 'security', priority: 'high', message: 'Update dependencies with security vulnerabilities' }
      ]
    };
  });

  describe('Context Aggregation', () => {
    it('should aggregate git and project analysis successfully', async () => {
      const result = await aggregator.aggregate({
        git: mockGitAnalysis,
        project: mockProjectAnalysis,
        type: 'development',
        focus: []
      });

      expect(result).toHaveProperty('type', 'development');
      expect(result).toHaveProperty('sections');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('formatted');
      expect(result).toHaveProperty('metadata');

      expect(result.sections).toBeInstanceOf(Array);
      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.metadata.sources.git).toBe(true);
      expect(result.metadata.sources.project).toBe(true);
    });

    it('should aggregate only git analysis when project is null', async () => {
      const result = await aggregator.aggregate({
        git: mockGitAnalysis,
        project: null,
        type: 'development',
        focus: []
      });

      expect(result.metadata.sources.git).toBe(true);
      expect(result.metadata.sources.project).toBe(false);
      expect(result.sections.some(s => s.type.startsWith('git') || s.type === 'status')).toBe(true);
    });

    it('should aggregate only project analysis when git is null', async () => {
      const result = await aggregator.aggregate({
        git: null,
        project: mockProjectAnalysis,
        type: 'project-overview',
        focus: []
      });

      expect(result.metadata.sources.git).toBe(false);
      expect(result.metadata.sources.project).toBe(true);
      expect(result.sections.some(s => !s.type.startsWith('git') && s.type !== 'status')).toBe(true);
    });
  });

  describe('Section Processing', () => {
    describe('Git Context Processing', () => {
      it('should process git context into sections', () => {
        const sections = aggregator.processGitContext(mockGitAnalysis, 'development', []);

        expect(sections).toBeInstanceOf(Array);
        
        const sectionIds = sections.map(s => s.id);
        expect(sectionIds).toContain('recent-commits');
        expect(sectionIds).toContain('changed-files');
        expect(sectionIds).toContain('repository-status');
        expect(sectionIds).toContain('activity-patterns');

        // Check section structure
        sections.forEach(section => {
          expect(section).toHaveProperty('id');
          expect(section).toHaveProperty('title');
          expect(section).toHaveProperty('priority');
          expect(section).toHaveProperty('content');
          expect(section).toHaveProperty('type');
          expect(section).toHaveProperty('freshness');
        });
      });

      it('should include hotspots when available', () => {
        const sections = aggregator.processGitContext(mockGitAnalysis, 'development', []);
        
        const hotspotsSection = sections.find(s => s.id === 'file-hotspots');
        expect(hotspotsSection).toBeDefined();
        expect(hotspotsSection.title).toBe('File Change Hotspots');
      });

      it('should respect focus areas', () => {
        const sections = aggregator.processGitContext(mockGitAnalysis, 'development', ['recent-commits']);
        
        const recentCommitsSection = sections.find(s => s.id === 'recent-commits');
        expect(recentCommitsSection).toBeDefined();
      });
    });

    describe('Project Context Processing', () => {
      it('should process project context into sections', () => {
        const sections = aggregator.processProjectContext(mockProjectAnalysis, 'development', []);

        expect(sections).toBeInstanceOf(Array);
        
        const sectionIds = sections.map(s => s.id);
        expect(sectionIds).toContain('project-overview');
        expect(sectionIds).toContain('architecture');
        expect(sectionIds).toContain('technologies');
        expect(sectionIds).toContain('dependencies');
        expect(sectionIds).toContain('configurations');
        expect(sectionIds).toContain('recommendations');
      });

      it('should include recommendations when available', () => {
        const sections = aggregator.processProjectContext(mockProjectAnalysis, 'development', []);
        
        const recommendationsSection = sections.find(s => s.id === 'recommendations');
        expect(recommendationsSection).toBeDefined();
        expect(recommendationsSection.title).toBe('Project Recommendations');
      });
    });
  });

  describe('Prioritization and Optimization', () => {
    it('should calculate priority scores correctly', () => {
      const score1 = aggregator.calculatePriority('recentChanges', 5);
      const score2 = aggregator.calculatePriority('recentChanges', 10);
      
      expect(score2).toBeGreaterThan(score1); // Higher magnitude = higher score
      expect(score1).toBeGreaterThan(0);
      expect(score1).toBeLessThanOrEqual(1);
    });

    it('should calculate freshness scores correctly', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();
      const oneDayAgo = new Date(now.getTime() - 86400000).toISOString();
      const oneWeekAgo = new Date(now.getTime() - 604800000).toISOString();

      expect(aggregator.calculateFreshness(now.toISOString())).toBe(1.0);
      expect(aggregator.calculateFreshness(oneHourAgo)).toBe(0.9);
      expect(aggregator.calculateFreshness(oneDayAgo)).toBe(0.7);
      expect(aggregator.calculateFreshness(oneWeekAgo)).toBeLessThan(0.7);
    });

    it('should prioritize sections correctly', () => {
      const sections = [
        { id: 'low', priority: 0.3, freshness: 0.5 },
        { id: 'high', priority: 0.9, freshness: 0.8 },
        { id: 'medium', priority: 0.6, freshness: 0.6 }
      ];

      const prioritized = aggregator.prioritizeSections(sections, 'development', []);
      
      expect(prioritized[0].id).toBe('high');
      expect(prioritized[1].id).toBe('medium');
      expect(prioritized[2].id).toBe('low');
    });

    it('should optimize context length', () => {
      const longSections = Array(10).fill().map((_, i) => ({
        id: `section-${i}`,
        content: 'A'.repeat(300), // 300 chars each
        priority: 0.8 - i * 0.1
      }));

      const optimized = aggregator.optimizeContextLength(longSections);
      
      // Should include fewer sections due to length limit
      expect(optimized.length).toBeLessThan(longSections.length);
      
      // Total content should be within limit
      const totalLength = optimized.reduce((sum, section) => 
        sum + aggregator.estimateTextLength(section.content), 0);
      expect(totalLength).toBeLessThanOrEqual(aggregator.maxContextLength);
    });

    it('should truncate content when necessary', () => {
      const longContent = 'A'.repeat(1000);
      const truncated = aggregator.truncateContent(longContent, 100);
      
      expect(truncated.length).toBeLessThanOrEqual(100);
      expect(truncated).toMatch(/\.\.\.$/);
    });
  });

  describe('Content Formatting', () => {
    it('should format recent commits correctly', () => {
      const commits = mockGitAnalysis.commits.recent;
      const formatted = aggregator.formatRecentCommits(commits);

      expect(formatted).toContain('abc123');
      expect(formatted).toContain('feat: add user authentication');
      expect(formatted).toContain('John Doe');
    });

    it('should format changed files correctly', () => {
      const changedFiles = mockGitAnalysis.files.changed;
      const formatted = aggregator.formatChangedFiles(changedFiles);

      expect(formatted).toContain('Total files changed: 8');
      expect(formatted).toContain('src/auth.js');
      expect(formatted).toContain('45 changes');
    });

    it('should format file hotspots correctly', () => {
      const hotspots = mockGitAnalysis.files.hotspots;
      const formatted = aggregator.formatFileHotspots(hotspots);

      expect(formatted).toContain('Files requiring attention');
      expect(formatted).toContain('src/auth.js');
      expect(formatted).toContain('risk: high');
      expect(formatted).toMatch(/[⚠️⚡ℹ️]/); // Should contain emoji indicators
    });

    it('should format repository status correctly', () => {
      const repository = mockGitAnalysis.repository;
      const formatted = aggregator.formatRepositoryStatus(repository);

      expect(formatted).toContain('Current branch: main');
      expect(formatted).toContain('⚠️ Uncommitted changes: 3 files');
      expect(formatted).toContain('↑ 2 commits ahead');
    });

    it('should format project overview correctly', () => {
      const overview = mockProjectAnalysis.overview;
      const formatted = aggregator.formatProjectOverview(overview);

      expect(formatted).toContain('Project: attrition-game');
      expect(formatted).toContain('Type: monorepo');
      expect(formatted).toContain('Size: 1247 files');
    });

    it('should format architecture correctly', () => {
      const architecture = mockProjectAnalysis.architecture;
      const formatted = aggregator.formatArchitecture(architecture);

      expect(formatted).toContain('Pattern: monorepo');
      expect(formatted).toContain('Complexity: complex');
      expect(formatted).toContain('Components: monorepo, frontend, backend, tests');
    });

    it('should format technologies correctly', () => {
      const technologies = mockProjectAnalysis.technologies;
      const formatted = aggregator.formatTechnologies(technologies);

      expect(formatted).toContain('Languages: JavaScript, TypeScript');
      expect(formatted).toContain('Frameworks: React, Electron');
      expect(formatted).toContain('Tools: Jest, ESLint, Webpack');
    });
  });

  describe('AI Formatting', () => {
    it('should format context for AI consumption', async () => {
      const result = await aggregator.aggregate({
        git: mockGitAnalysis,
        project: mockProjectAnalysis,
        type: 'development',
        focus: []
      });

      const formatted = result.formatted;
      
      expect(formatted).toContain('# Development Context - Active Development');
      expect(formatted).toContain('## Current Development State');
      expect(formatted).toContain('### '); // Should have section headers
    });

    it('should generate context summary', async () => {
      const result = await aggregator.aggregate({
        git: mockGitAnalysis,
        project: mockProjectAnalysis,
        type: 'development',
        focus: []
      });

      const summary = result.summary;
      
      expect(summary).toContain('development activity');
      expect(summary).toContain('architectural insights');
    });

    it('should estimate token count', () => {
      const text = 'Hello world, this is a test message for token estimation.';
      const tokens = aggregator.estimateTokenCount(text);
      
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length); // Should be less than character count
    });
  });

  describe('Focus Areas and Filtering', () => {
    it('should include sections based on focus areas', () => {
      expect(aggregator.shouldIncludeSection('recent-commits', ['recent-commits'])).toBe(true);
      expect(aggregator.shouldIncludeSection('architecture', ['recent-commits'])).toBe(false);
      expect(aggregator.shouldIncludeSection('anything', ['all'])).toBe(true);
      expect(aggregator.shouldIncludeSection('anything', [])).toBe(true);
    });

    it('should boost priority for focused sections', () => {
      const sections = [
        { id: 'focused', priority: 0.5, freshness: 0.5 },
        { id: 'unfocused', priority: 0.6, freshness: 0.6 }
      ];

      const prioritized = aggregator.prioritizeSections(sections, 'development', ['focused']);
      
      expect(prioritized[0].id).toBe('focused'); // Should be boosted to top
    });
  });

  describe('Context Type Handling', () => {
    it('should return correct titles for context types', () => {
      expect(aggregator.getContextTypeTitle('development')).toBe('Active Development');
      expect(aggregator.getContextTypeTitle('debugging')).toBe('Debugging Session');
      expect(aggregator.getContextTypeTitle('refactoring')).toBe('Code Refactoring');
      expect(aggregator.getContextTypeTitle('unknown-type')).toBe('Development Context');
    });
  });

  describe('Utility Functions', () => {
    it('should format relative time correctly', () => {
      const now = Date.now();
      
      expect(aggregator.formatRelativeTime(new Date(now).toISOString())).toBe('just now');
      expect(aggregator.formatRelativeTime(new Date(now - 3600000).toISOString())).toBe('1h ago');
      expect(aggregator.formatRelativeTime(new Date(now - 86400000).toISOString())).toBe('1d ago');
      expect(aggregator.formatRelativeTime(new Date(now - 604800000).toISOString())).toBe('1w ago');
    });

    it('should calculate average file freshness', () => {
      const files = [
        { lastModified: new Date().toISOString() },
        { lastModified: new Date(Date.now() - 86400000).toISOString() }, // 1 day ago
        { lastModified: new Date(Date.now() - 3600000).toISOString() } // 1 hour ago
      ];

      const avgFreshness = aggregator.calculateAverageFileFreshness(files);
      
      expect(avgFreshness).toBeGreaterThan(0);
      expect(avgFreshness).toBeLessThanOrEqual(1);
    });

    it('should count configurations correctly', () => {
      const configurations = {
        build: [1, 2],
        testing: [1],
        linting: [1, 2, 3],
        deployment: []
      };

      const count = aggregator.countConfigurations(configurations);
      expect(count).toBe(6); // 2 + 1 + 3 + 0
    });
  });

  describe('Status and Diagnostics', () => {
    it('should return status information', () => {
      const status = aggregator.getStatus();

      expect(status).toEqual({
        maxContextLength: 2000,
        priorityWeights: expect.any(Object)
      });
    });
  });
});
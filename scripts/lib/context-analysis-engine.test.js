/**
 * Tests for Context Analysis Engine
 * 
 * Comprehensive unit tests for the main Context Analysis Engine orchestrator,
 * testing initialization, context generation, activity-specific contexts,
 * caching, and integration between services.
 */

const { ContextAnalysisEngine, getContextAnalysisEngine, resetContextAnalysisEngine } = require('./context-analysis-engine');

// Mock the dependencies
jest.mock('./git-analysis-service');
jest.mock('./project-analysis-service');
jest.mock('./context-aggregator');
jest.mock('../../config/ai-config');

const { GitAnalysisService } = require('./git-analysis-service');
const { ProjectAnalysisService } = require('./project-analysis-service');
const { ContextAggregator } = require('./context-aggregator');
const { getAIConfig } = require('../../config/ai-config');

describe('ContextAnalysisEngine', () => {
  let engine;
  let mockGitService;
  let mockProjectService;
  let mockAggregator;
  let mockConfig;

  beforeEach(() => {
    // Reset singleton
    resetContextAnalysisEngine();
    
    // Setup mocks
    mockConfig = {
      context: {
        timeRangeDays: 7,
        maxCommits: 50,
        cacheEnabled: true
      }
    };
    
    getAIConfig.mockReturnValue(mockConfig);

    mockGitService = {
      initialize: jest.fn().mockResolvedValue(),
      analyzeRecentActivity: jest.fn().mockResolvedValue({
        repository: { currentBranch: 'main', hasUncommittedChanges: false },
        commits: { total: 10, recent: [] },
        files: { changed: {}, hotspots: [] },
        activity: { commitsPerDay: 1.5 }
      }),
      analyzePathChanges: jest.fn().mockResolvedValue({}),
      getStatus: jest.fn().mockReturnValue({ initialized: true })
    };

    mockProjectService = {
      initialize: jest.fn().mockResolvedValue(),
      analyzeProjectStructure: jest.fn().mockResolvedValue({
        overview: { name: 'test-project', type: 'web-app' },
        architecture: { pattern: 'monorepo', complexity: 'moderate' },
        technologies: { languages: ['javascript'], frameworks: ['react'] }
      }),
      getStatus: jest.fn().mockReturnValue({ initialized: true })
    };

    mockAggregator = {
      aggregate: jest.fn().mockResolvedValue({
        type: 'development',
        sections: [],
        formatted: '# Test Context',
        metadata: { totalSections: 0, estimatedTokens: 100 }
      }),
      getStatus: jest.fn().mockReturnValue({ maxContextLength: 4000 })
    };

    GitAnalysisService.mockImplementation(() => mockGitService);
    ProjectAnalysisService.mockImplementation(() => mockProjectService);
    ContextAggregator.mockImplementation(() => mockAggregator);

    engine = new ContextAnalysisEngine();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with default options', async () => {
      await engine.initialize();

      expect(engine.initialized).toBe(true);
      expect(getAIConfig).toHaveBeenCalled();
      expect(GitAnalysisService).toHaveBeenCalledWith({
        projectRoot: process.cwd(),
        timeRange: 7,
        maxCommits: 50
      });
      expect(ProjectAnalysisService).toHaveBeenCalledWith({
        projectRoot: process.cwd(),
        cacheEnabled: true
      });
      expect(mockGitService.initialize).toHaveBeenCalled();
      expect(mockProjectService.initialize).toHaveBeenCalled();
    });

    it('should initialize with custom project root', async () => {
      const customEngine = new ContextAnalysisEngine({ projectRoot: '/custom/path' });
      await customEngine.initialize();

      expect(GitAnalysisService).toHaveBeenCalledWith({
        projectRoot: '/custom/path',
        timeRange: 7,
        maxCommits: 50
      });
    });

    it('should throw error if initialization fails', async () => {
      mockGitService.initialize.mockRejectedValue(new Error('Git init failed'));

      await expect(engine.initialize()).rejects.toThrow('Failed to initialize Context Analysis Engine: Git init failed');
    });
  });

  describe('Context Generation', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should generate context with both git and project analysis', async () => {
      const options = {
        type: 'development',
        focus: ['recent-commits', 'architecture'],
        useCache: false
      };

      const result = await engine.generateContext(options);

      expect(mockGitService.analyzeRecentActivity).toHaveBeenCalled();
      expect(mockProjectService.analyzeProjectStructure).toHaveBeenCalled();
      expect(mockAggregator.aggregate).toHaveBeenCalledWith({
        git: expect.any(Object),
        project: expect.any(Object),
        type: 'development',
        focus: ['recent-commits', 'architecture']
      });
      expect(result).toEqual(expect.objectContaining({
        type: 'development',
        sections: [],
        formatted: '# Test Context'
      }));
    });

    it('should generate context with only git analysis', async () => {
      const result = await engine.generateContext({
        includeGit: true,
        includeProject: false
      });

      expect(mockGitService.analyzeRecentActivity).toHaveBeenCalled();
      expect(mockProjectService.analyzeProjectStructure).not.toHaveBeenCalled();
      expect(mockAggregator.aggregate).toHaveBeenCalledWith({
        git: expect.any(Object),
        project: null,
        type: 'development',
        focus: []
      });
    });

    it('should generate context with only project analysis', async () => {
      const result = await engine.generateContext({
        includeGit: false,
        includeProject: true
      });

      expect(mockGitService.analyzeRecentActivity).not.toHaveBeenCalled();
      expect(mockProjectService.analyzeProjectStructure).toHaveBeenCalled();
      expect(mockAggregator.aggregate).toHaveBeenCalledWith({
        git: null,
        project: expect.any(Object),
        type: 'development',
        focus: []
      });
    });

    it('should use cached context when available and requested', async () => {
      // First call
      await engine.generateContext({ type: 'development' });
      
      // Second call should use cache
      const result = await engine.generateContext({ type: 'development', useCache: true });

      // Services should only be called once
      expect(mockGitService.analyzeRecentActivity).toHaveBeenCalledTimes(1);
      expect(mockProjectService.analyzeProjectStructure).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when useCache is false', async () => {
      // First call
      await engine.generateContext({ type: 'development' });
      
      // Second call with useCache: false
      await engine.generateContext({ type: 'development', useCache: false });

      // Services should be called twice
      expect(mockGitService.analyzeRecentActivity).toHaveBeenCalledTimes(2);
      expect(mockProjectService.analyzeProjectStructure).toHaveBeenCalledTimes(2);
    });
  });

  describe('Activity-Specific Context', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should generate feature development context', async () => {
      const result = await engine.generateActivityContext('feature-development');

      expect(mockAggregator.aggregate).toHaveBeenCalledWith({
        git: expect.any(Object),
        project: expect.any(Object),
        type: 'development',
        focus: ['recent-commits', 'changed-files', 'dependencies', 'project-structure']
      });
    });

    it('should generate debugging context', async () => {
      const result = await engine.generateActivityContext('debugging');

      expect(mockAggregator.aggregate).toHaveBeenCalledWith({
        git: expect.any(Object),
        project: expect.any(Object),
        type: 'debugging',
        focus: ['recent-commits', 'changed-files', 'error-patterns', 'test-files']
      });
    });

    it('should generate refactoring context without git analysis', async () => {
      const result = await engine.generateActivityContext('refactoring');

      expect(mockGitService.analyzeRecentActivity).not.toHaveBeenCalled();
      expect(mockProjectService.analyzeProjectStructure).toHaveBeenCalled();
      expect(mockAggregator.aggregate).toHaveBeenCalledWith({
        git: null,
        project: expect.any(Object),
        type: 'refactoring',
        focus: ['file-structure', 'dependencies', 'code-patterns', 'architecture']
      });
    });

    it('should generate social posting context without project analysis', async () => {
      const result = await engine.generateActivityContext('social-posting');

      expect(mockGitService.analyzeRecentActivity).toHaveBeenCalled();
      expect(mockProjectService.analyzeProjectStructure).not.toHaveBeenCalled();
      expect(mockAggregator.aggregate).toHaveBeenCalledWith({
        git: expect.any(Object),
        project: null,
        type: 'social-media',
        focus: ['recent-commits', 'milestones', 'features', 'progress']
      });
    });

    it('should throw error for unknown activity', async () => {
      await expect(engine.generateActivityContext('unknown-activity')).rejects.toThrow('Unknown development activity: unknown-activity');
    });
  });

  describe('Quick Access Methods', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should generate quick summary', async () => {
      const result = await engine.getQuickSummary();

      expect(mockAggregator.aggregate).toHaveBeenCalledWith({
        git: expect.any(Object),
        project: expect.any(Object),
        type: 'quick-summary',
        focus: ['recent-commits', 'active-files']
      });
    });

    it('should generate project overview', async () => {
      const result = await engine.getProjectOverview();

      expect(mockGitService.analyzeRecentActivity).not.toHaveBeenCalled();
      expect(mockProjectService.analyzeProjectStructure).toHaveBeenCalled();
      expect(mockAggregator.aggregate).toHaveBeenCalledWith({
        git: null,
        project: expect.any(Object),
        type: 'project-overview',
        focus: ['project-structure', 'main-technologies', 'architecture']
      });
    });

    it('should analyze path changes', async () => {
      const paths = ['src/components', 'tests/'];
      const result = await engine.getChangeAnalysis(paths);

      expect(mockGitService.analyzePathChanges).toHaveBeenCalledWith(paths);
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should generate correct cache keys', () => {
      const key1 = engine.getCacheKey({
        type: 'development',
        focus: ['commits', 'files'],
        includeGit: true,
        includeProject: true
      });

      const key2 = engine.getCacheKey({
        type: 'development',
        focus: ['files', 'commits'], // Different order
        includeGit: true,
        includeProject: true
      });

      expect(key1).toBe(key2); // Should be same due to sorting
      expect(key1).toContain('development');
      expect(key1).toContain('git');
      expect(key1).toContain('project');
    });

    it('should detect valid cache entries', async () => {
      // Generate context to populate cache
      await engine.generateContext({ type: 'development' });

      const cacheKey = engine.getCacheKey({
        type: 'development',
        focus: [],
        includeGit: true,
        includeProject: true
      });

      expect(engine.hasValidCache(cacheKey)).toBe(true);
    });

    it('should detect expired cache entries', async () => {
      // Set a very short cache timeout
      engine.cacheTimeout = 1; // 1ms
      
      await engine.generateContext({ type: 'development' });
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 2));

      const cacheKey = engine.getCacheKey({
        type: 'development',
        focus: [],
        includeGit: true,
        includeProject: true
      });

      expect(engine.hasValidCache(cacheKey)).toBe(false);
    });

    it('should clear all cache', async () => {
      await engine.generateContext({ type: 'development' });
      await engine.generateContext({ type: 'debugging' });

      expect(engine.cache.size).toBeGreaterThan(0);

      engine.clearCache();

      expect(engine.cache.size).toBe(0);
    });

    it('should clear cache by pattern', async () => {
      await engine.generateContext({ type: 'development' });
      await engine.generateContext({ type: 'debugging' });

      const initialSize = engine.cache.size;
      engine.clearCache('development');

      expect(engine.cache.size).toBeLessThan(initialSize);
    });
  });

  describe('Status and Diagnostics', () => {
    it('should return status before initialization', () => {
      const status = engine.getStatus();

      expect(status).toEqual({
        initialized: false,
        projectRoot: process.cwd(),
        cacheSize: 0,
        services: {
          git: 'not-initialized',
          project: 'not-initialized',
          aggregator: 'not-initialized'
        },
        config: 'not-loaded'
      });
    });

    it('should return status after initialization', async () => {
      await engine.initialize();
      const status = engine.getStatus();

      expect(status).toEqual({
        initialized: true,
        projectRoot: process.cwd(),
        cacheSize: 0,
        services: {
          git: { initialized: true },
          project: { initialized: true },
          aggregator: { maxContextLength: 4000 }
        },
        config: {
          timeRange: 7,
          maxCommits: 50,
          cacheEnabled: true
        }
      });
    });

    it('should test context generation functionality', async () => {
      await engine.initialize();
      
      const result = await engine.testContextGeneration();

      expect(result).toBe(true);
      expect(mockGitService.analyzeRecentActivity).toHaveBeenCalled();
      expect(mockProjectService.analyzeProjectStructure).toHaveBeenCalled();
    });

    it('should return false for failed context generation test', async () => {
      await engine.initialize();
      mockAggregator.aggregate.mockRejectedValue(new Error('Test failure'));

      const result = await engine.testContextGeneration();

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should handle git service errors gracefully', async () => {
      mockGitService.analyzeRecentActivity.mockRejectedValue(new Error('Git error'));

      await expect(engine.generateContext()).rejects.toThrow('Failed to generate context: Git error');
    });

    it('should handle project service errors gracefully', async () => {
      mockProjectService.analyzeProjectStructure.mockRejectedValue(new Error('Project error'));

      await expect(engine.generateContext()).rejects.toThrow('Failed to generate context: Project error');
    });

    it('should handle aggregator errors gracefully', async () => {
      mockAggregator.aggregate.mockRejectedValue(new Error('Aggregation error'));

      await expect(engine.generateContext()).rejects.toThrow('Failed to generate context: Aggregation error');
    });

    it('should auto-initialize when not initialized', async () => {
      const newEngine = new ContextAnalysisEngine();
      // Don't initialize manually
      
      await newEngine.generateContext();

      expect(newEngine.initialized).toBe(true);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance for getContextAnalysisEngine', () => {
      const instance1 = getContextAnalysisEngine();
      const instance2 = getContextAnalysisEngine();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getContextAnalysisEngine();
      
      resetContextAnalysisEngine();
      
      const instance2 = getContextAnalysisEngine();

      expect(instance1).not.toBe(instance2);
    });

    it('should pass options to singleton instance', () => {
      const options = { projectRoot: '/test/path' };
      const instance = getContextAnalysisEngine(options);

      expect(instance.projectRoot).toBe('/test/path');
    });
  });
});
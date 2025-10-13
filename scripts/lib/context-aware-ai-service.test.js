/**
 * Tests for Context-Aware AI Service
 * 
 * Comprehensive unit tests for the Context-Aware AI Service, testing the integration
 * between the Context Analysis Engine and AI service client for intelligent content generation.
 */

const { ContextAwareAIService, getContextAwareAIService, resetContextAwareAIService } = require('./context-aware-ai-service');

// Mock the dependencies
jest.mock('./ai-service-client');
jest.mock('./context-analysis-engine');

const { getAIServiceClient } = require('./ai-service-client');
const { getContextAnalysisEngine } = require('./context-analysis-engine');

describe('ContextAwareAIService', () => {
  let service;
  let mockAIClient;
  let mockContextEngine;

  beforeEach(() => {
    // Reset singleton
    resetContextAwareAIService();
    
    // Setup AI client mock
    mockAIClient = {
      isInitialized: jest.fn().mockReturnValue(true),
      initialize: jest.fn().mockResolvedValue(),
      generateContentWithFallback: jest.fn().mockResolvedValue({
        content: 'Generated AI content',
        source: 'ai',
        confidence: 0.9,
        tokens: 150
      }),
      getStatus: jest.fn().mockReturnValue({
        initialized: true,
        model: 'gpt-4o-mini'
      })
    };

    // Setup context engine mock
    mockContextEngine = {
      initialized: true,
      initialize: jest.fn().mockResolvedValue(),
      generateActivityContext: jest.fn().mockResolvedValue({
        type: 'development',
        summary: 'Recent development activity with 3 git-related insights',
        formatted: '# Development Context\n\n## Recent Activity\n- Recent commits\n- Changed files',
        sections: [
          { id: 'recent-commits', title: 'Recent Commits' },
          { id: 'changed-files', title: 'Changed Files' }
        ],
        metadata: { estimatedTokens: 200 }
      }),
      getStatus: jest.fn().mockReturnValue({
        initialized: true,
        cacheSize: 0
      })
    };

    getAIServiceClient.mockReturnValue(mockAIClient);
    getContextAnalysisEngine.mockReturnValue(mockContextEngine);

    service = new ContextAwareAIService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with both AI client and context engine', async () => {
      await service.initialize();

      expect(service.initialized).toBe(true);
      expect(mockAIClient.initialize).not.toHaveBeenCalled(); // Already initialized
      expect(mockContextEngine.initialize).not.toHaveBeenCalled(); // Already initialized
    });

    it('should initialize AI client if not already initialized', async () => {
      mockAIClient.isInitialized.mockReturnValue(false);
      
      await service.initialize();

      expect(mockAIClient.initialize).toHaveBeenCalled();
    });

    it('should initialize context engine if not already initialized', async () => {
      mockContextEngine.initialized = false;
      
      await service.initialize();

      expect(mockContextEngine.initialize).toHaveBeenCalled();
    });

    it('should work without context engine when disabled', async () => {
      const serviceWithoutContext = new ContextAwareAIService({ enableContext: false });
      
      await serviceWithoutContext.initialize();

      expect(serviceWithoutContext.initialized).toBe(true);
      expect(serviceWithoutContext.enableContext).toBe(false);
    });

    it('should throw error if initialization fails', async () => {
      mockAIClient.initialize.mockRejectedValue(new Error('AI client init failed'));
      mockAIClient.isInitialized.mockReturnValue(false);

      await expect(service.initialize()).rejects.toThrow('Failed to initialize Context-Aware AI Service: AI client init failed');
    });
  });

  describe('Context-Aware Content Generation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate content with context enhancement', async () => {
      const result = await service.generateContextAwareContent(
        'Create a social media post about our latest feature',
        {
          activity: 'social-posting',
          focus: ['recent-commits'],
          tone: 'excited'
        }
      );

      expect(mockContextEngine.generateActivityContext).toHaveBeenCalledWith('social-posting', {
        focus: ['recent-commits'],
        useCache: true
      });

      expect(mockAIClient.generateContentWithFallback).toHaveBeenCalledWith(
        expect.stringContaining('Development Context'),
        expect.any(Object),
        expect.objectContaining({ tone: 'excited' })
      );

      expect(result).toMatchObject({
        content: 'Generated AI content',
        context: {
          included: true,
          activity: 'social-posting',
          focus: ['recent-commits'],
          sections: 2
        },
        originalPrompt: 'Create a social media post about our latest feature',
        enhancedPrompt: expect.stringContaining('Development Context')
      });
    });

    it('should generate content without context when disabled', async () => {
      const result = await service.generateContextAwareContent(
        'Test prompt',
        { includeContext: false }
      );

      expect(mockContextEngine.generateActivityContext).not.toHaveBeenCalled();
      expect(result.context.included).toBe(false);
      expect(result.enhancedPrompt).toBe('Test prompt');
    });

    it('should fallback gracefully when context generation fails', async () => {
      mockContextEngine.generateActivityContext.mockRejectedValue(new Error('Context failed'));

      const result = await service.generateContextAwareContent(
        'Test prompt',
        { activity: 'development' }
      );

      expect(mockAIClient.generateContentWithFallback).toHaveBeenCalledWith(
        'Test prompt',
        {},
        expect.any(Object)
      );

      expect(result.context.included).toBe(false);
      expect(result.fallbackReason).toBe('context-enhancement-failed');
    });

    it('should auto-initialize if not initialized', async () => {
      const newService = new ContextAwareAIService();
      
      await newService.generateContextAwareContent('Test');

      expect(newService.initialized).toBe(true);
    });
  });

  describe('Activity-Specific Content Generation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate social media content', async () => {
      const result = await service.generateActivityContent(
        'social-posting',
        'Custom social prompt'
      );

      const enhancedPrompt = mockAIClient.generateContentWithFallback.mock.calls[0][0];
      expect(enhancedPrompt).toContain('Twitter/X post');
      expect(enhancedPrompt).toContain('#AttritionMMO');
      expect(enhancedPrompt).toContain('Custom social prompt');
    });

    it('should generate feature development content', async () => {
      const result = await service.generateActivityContent(
        'feature-development',
        'Help implement user authentication'
      );

      const enhancedPrompt = mockAIClient.generateContentWithFallback.mock.calls[0][0];
      expect(enhancedPrompt).toContain('senior developer');
      expect(enhancedPrompt).toContain('Technical implementation');
      expect(enhancedPrompt).toContain('Help implement user authentication');
    });

    it('should generate debugging content', async () => {
      const result = await service.generateActivityContent(
        'debugging',
        'Fix memory leak in game engine'
      );

      const enhancedPrompt = mockAIClient.generateContentWithFallback.mock.calls[0][0];
      expect(enhancedPrompt).toContain('expert debugger');
      expect(enhancedPrompt).toContain('root causes');
      expect(enhancedPrompt).toContain('Fix memory leak in game engine');
    });

    it('should generate refactoring content', async () => {
      const result = await service.generateActivityContent(
        'refactoring',
        'Refactor player management system'
      );

      const enhancedPrompt = mockAIClient.generateContentWithFallback.mock.calls[0][0];
      expect(enhancedPrompt).toContain('code quality expert');
      expect(enhancedPrompt).toContain('monorepo structure');
      expect(enhancedPrompt).toContain('Refactor player management system');
    });

    it('should generate testing content', async () => {
      const result = await service.generateActivityContent(
        'testing',
        'Add tests for new feature'
      );

      const enhancedPrompt = mockAIClient.generateContentWithFallback.mock.calls[0][0];
      expect(enhancedPrompt).toContain('testing expert');
      expect(enhancedPrompt).toContain('Jest');
      expect(enhancedPrompt).toContain('Add tests for new feature');
    });

    it('should throw error for unknown activity type', async () => {
      await expect(service.generateActivityContent('unknown-activity', 'test'))
        .rejects.toThrow('Unknown activity type: unknown-activity');
    });
  });

  describe('Social Media Content Generation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate multiple tone variants', async () => {
      const variants = await service.generateSocialMediaContent({
        tones: ['excited', 'professional'],
        platform: 'twitter'
      });

      expect(variants).toHaveLength(2);
      expect(mockAIClient.generateContentWithFallback).toHaveBeenCalledTimes(2);
      
      // Check that different tones were used
      const calls = mockAIClient.generateContentWithFallback.mock.calls;
      expect(calls[0][2].tone).toBe('excited');
      expect(calls[1][2].tone).toBe('professional');
    });

    it('should adjust token limits for different platforms', async () => {
      await service.generateSocialMediaContent({
        tones: ['professional'],
        platform: 'linkedin'
      });

      const aiOptions = mockAIClient.generateContentWithFallback.mock.calls[0][2];
      expect(aiOptions.maxTokens).toBe(200); // LinkedIn gets more tokens than Twitter
    });

    it('should handle generation failures gracefully', async () => {
      mockAIClient.generateContentWithFallback
        .mockRejectedValueOnce(new Error('Generation failed'))
        .mockResolvedValueOnce({ content: 'Success', source: 'ai' });

      const variants = await service.generateSocialMediaContent({
        tones: ['excited', 'professional']
      });

      expect(variants).toHaveLength(1); // Only the successful one
    });
  });

  describe('Context Caching', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should cache context data', async () => {
      // First call
      await service.getRelevantContext('development', ['recent-commits']);
      
      // Second call should use cache
      await service.getRelevantContext('development', ['recent-commits']);

      expect(mockContextEngine.generateActivityContext).toHaveBeenCalledTimes(1);
    });

    it('should use different cache keys for different activities', async () => {
      await service.getRelevantContext('development', ['recent-commits']);
      await service.getRelevantContext('debugging', ['recent-commits']);

      expect(mockContextEngine.generateActivityContext).toHaveBeenCalledTimes(2);
    });

    it('should detect valid cache entries', async () => {
      await service.getRelevantContext('development', []);
      
      expect(service.hasValidContextCache('development:')).toBe(true);
      expect(service.hasValidContextCache('nonexistent')).toBe(false);
    });

    it('should expire old cache entries', async () => {
      service.contextCacheTimeout = 1; // 1ms
      
      await service.getRelevantContext('development', []);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 2));
      
      expect(service.hasValidContextCache('development:')).toBe(false);
    });

    it('should clear cache', async () => {
      await service.getRelevantContext('development', []);
      await service.getRelevantContext('debugging', []);
      
      expect(service.contextCache.size).toBe(2);
      
      service.clearContextCache();
      
      expect(service.contextCache.size).toBe(0);
    });

    it('should clear cache by pattern', async () => {
      await service.getRelevantContext('development', []);
      await service.getRelevantContext('debugging', []);
      
      service.clearContextCache('development');
      
      expect(service.contextCache.size).toBe(1);
    });
  });

  describe('Prompt Enhancement', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should enhance prompt with context', () => {
      const contextData = {
        summary: 'Recent development activity summary',
        formatted: '# Development Context\n\n## Recent Activity\nSome activity details'
      };

      const enhanced = service.enhancePromptWithContext('Original prompt', contextData);

      expect(enhanced).toContain('## Development Context');
      expect(enhanced).toContain('Recent development activity summary');
      expect(enhanced).toContain('## Task');
      expect(enhanced).toContain('Original prompt');
    });

    it('should return original prompt when no context available', () => {
      const enhanced = service.enhancePromptWithContext('Original prompt', {});
      expect(enhanced).toBe('Original prompt');
    });
  });

  describe('Platform-Specific Prompts', () => {
    it('should create Twitter-specific prompts', () => {
      const prompt = service.createSocialMediaPrompt('Test content', { platform: 'twitter' });
      
      expect(prompt).toContain('Twitter/X post');
      expect(prompt).toContain('280 characters');
      expect(prompt).toContain('#AttritionMMO');
    });

    it('should create LinkedIn-specific prompts', () => {
      const prompt = service.createSocialMediaPrompt('Test content', { platform: 'linkedin' });
      
      expect(prompt).toContain('LinkedIn post');
      expect(prompt).toContain('professional');
      expect(prompt).toContain('500 characters');
    });

    it('should fall back to Twitter format for unknown platforms', () => {
      const prompt = service.createSocialMediaPrompt('Test content', { platform: 'unknown' });
      
      expect(prompt).toContain('Twitter/X post');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle context generation errors gracefully', async () => {
      mockContextEngine.generateActivityContext.mockRejectedValue(new Error('Context error'));

      const context = await service.getRelevantContext('development', []);

      expect(context).toEqual({});
      expect(mockContextEngine.generateActivityContext).toHaveBeenCalled();
    });

    it('should handle AI generation errors with fallback', async () => {
      mockAIClient.generateContentWithFallback.mockRejectedValueOnce(new Error('AI error'))
        .mockResolvedValueOnce({ content: 'Fallback content', source: 'fallback' });

      const result = await service.generateContextAwareContent('Test prompt');

      expect(result).toMatchObject({
        content: 'Fallback content',
        context: {
          included: false,
          error: 'AI error'
        },
        fallbackReason: 'context-enhancement-failed'
      });
    });
  });

  describe('Testing and Diagnostics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should test context-aware generation functionality', async () => {
      const result = await service.testContextAwareGeneration();

      expect(result).toBe(true);
      expect(mockAIClient.generateContentWithFallback).toHaveBeenCalled();
      expect(mockContextEngine.generateActivityContext).toHaveBeenCalled();
    });

    it('should return false when test fails', async () => {
      mockAIClient.generateContentWithFallback.mockRejectedValue(new Error('Test failed'));

      const result = await service.testContextAwareGeneration();

      expect(result).toBe(false);
    });

    it('should return comprehensive status', async () => {
      const status = service.getStatus();

      expect(status).toEqual({
        initialized: true,
        enableContext: true,
        contextCacheSize: 0,
        aiClient: {
          initialized: true,
          model: 'gpt-4o-mini'
        },
        contextEngine: {
          initialized: true,
          cacheSize: 0
        }
      });
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance for getContextAwareAIService', () => {
      const instance1 = getContextAwareAIService();
      const instance2 = getContextAwareAIService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getContextAwareAIService();
      
      resetContextAwareAIService();
      
      const instance2 = getContextAwareAIService();

      expect(instance1).not.toBe(instance2);
    });

    it('should pass options to singleton instance', () => {
      const options = { enableContext: false, contextCacheTimeout: 10000 };
      const instance = getContextAwareAIService(options);

      expect(instance.enableContext).toBe(false);
      expect(instance.contextCacheTimeout).toBe(10000);
    });
  });
});
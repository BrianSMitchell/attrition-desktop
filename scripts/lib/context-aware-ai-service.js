/**
 * Context-Aware AI Service
 * 
 * Enhanced AI service that integrates the Context Analysis Engine with the existing
 * AI service client to provide intelligent, context-aware content generation.
 * This service automatically enriches AI prompts with relevant development context.
 * 
 * Key Features:
 * - Automatic context enrichment for AI prompts
 * - Activity-specific context optimization
 * - Fallback support with context-aware templates
 * - Context caching for performance
 * - Integration with existing social media workflows
 * 
 * Builds upon the existing AI infrastructure while adding intelligent context awareness.
 */

const { getAIServiceClient } = require('./ai-service-client');
const { getContextAnalysisEngine } = require('./context-analysis-engine');

/**
 * Context-Aware AI Service
 * Provides AI content generation enhanced with intelligent development context
 */
class ContextAwareAIService {
  constructor(options = {}) {
    this.aiClient = null;
    this.contextEngine = null;
    this.initialized = false;
    this.contextCache = new Map();
    this.contextCacheTimeout = options.contextCacheTimeout || 5 * 60 * 1000; // 5 minutes
    this.enableContext = options.enableContext !== false; // Default to true
  }

  /**
   * Initialize the context-aware AI service
   * @throws {Error} If initialization fails
   */
  async initialize() {
    try {
      // Initialize AI service client
      this.aiClient = getAIServiceClient();
      if (!this.aiClient.isInitialized()) {
        await this.aiClient.initialize();
      }

      // Initialize context analysis engine
      if (this.enableContext) {
        this.contextEngine = getContextAnalysisEngine();
        if (!this.contextEngine.initialized) {
          await this.contextEngine.initialize();
        }
      }

      this.initialized = true;
      console.log('🧠 Context-Aware AI Service initialized');

    } catch (error) {
      throw new Error(`Failed to initialize Context-Aware AI Service: ${error.message}`);
    }
  }

  /**
   * Generate context-enhanced content
   * @param {string} prompt - Base prompt for content generation
   * @param {Object} options - Generation options
   * @param {string} options.activity - Development activity type
   * @param {Array<string>} options.focus - Context focus areas
   * @param {boolean} options.includeContext - Whether to include context (default: true)
   * @param {string} options.tone - Content tone
   * @param {Object} options.aiOptions - Additional AI generation options
   * @returns {Promise<Object>} Enhanced content with context
   */
  async generateContextAwareContent(prompt, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      activity = 'development',
      focus = [],
      includeContext = true,
      tone = 'professional',
      aiOptions = {}
    } = options;

    try {
      let contextData = {};
      let enhancedPrompt = prompt;

      // Generate context if enabled and requested
      if (this.enableContext && includeContext && this.contextEngine) {
        contextData = await this.getRelevantContext(activity, focus);
        enhancedPrompt = this.enhancePromptWithContext(prompt, contextData);
      }

      // Generate content using enhanced prompt
      const result = await this.aiClient.generateContentWithFallback(
        enhancedPrompt,
        contextData,
        { tone, ...aiOptions }
      );

      return {
        ...result,
        context: {
          included: includeContext && this.enableContext,
          activity,
          focus,
          summary: contextData.summary || 'No context available',
          sections: contextData.sections?.length || 0
        },
        originalPrompt: prompt,
        enhancedPrompt: enhancedPrompt
      };

    } catch (error) {
      console.warn('⚠️ Context-aware generation failed, falling back to basic AI:', error.message);
      
      // Fallback to basic AI generation without context
      const fallbackResult = await this.aiClient.generateContentWithFallback(
        prompt,
        {},
        { tone, ...aiOptions }
      );

      return {
        ...fallbackResult,
        context: {
          included: false,
          error: error.message,
          activity,
          focus
        },
        originalPrompt: prompt,
        enhancedPrompt: prompt,
        fallbackReason: 'context-enhancement-failed'
      };
    }
  }

  /**
   * Generate activity-specific content with optimized context
   * @param {string} activity - Development activity type
   * @param {string} basePrompt - Base prompt template
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Activity-optimized content
   */
  async generateActivityContent(activity, basePrompt, options = {}) {
    const activityPrompts = {
      'social-posting': this.createSocialMediaPrompt,
      'feature-development': this.createFeaturePrompt,
      'debugging': this.createDebuggingPrompt,
      'refactoring': this.createRefactoringPrompt,
      'testing': this.createTestingPrompt
    };

    const promptCreator = activityPrompts[activity];
    if (!promptCreator) {
      throw new Error(`Unknown activity type: ${activity}`);
    }

    const optimizedPrompt = promptCreator.call(this, basePrompt, options);
    
    return await this.generateContextAwareContent(optimizedPrompt, {
      activity,
      ...options
    });
  }

  /**
   * Generate social media content with development context
   * @param {Object} options - Social media options
   * @param {Array<string>} options.tones - Tones to generate
   * @param {string} options.platform - Target platform (twitter, linkedin, etc.)
   * @returns {Promise<Array>} Array of social media variants
   */
  async generateSocialMediaContent(options = {}) {
    const { tones = ['excited', 'professional', 'casual'], platform = 'twitter' } = options;

    const basePrompt = this.createSocialMediaPrompt('', { platform });
    const variants = [];

    for (const tone of tones) {
      try {
        const content = await this.generateContextAwareContent(basePrompt, {
          activity: 'social-posting',
          tone,
          focus: ['recent-commits', 'milestones', 'features'],
          aiOptions: {
            maxTokens: platform === 'twitter' ? 100 : 200
          }
        });

        variants.push(content);

      } catch (error) {
        console.warn(`⚠️ Failed to generate ${tone} social media content:`, error.message);
      }
    }

    return variants;
  }

  /**
   * Get relevant context for an activity
   * @param {string} activity - Development activity
   * @param {Array<string>} focus - Focus areas
   * @returns {Promise<Object>} Relevant context data
   */
  async getRelevantContext(activity, focus) {
    if (!this.contextEngine) {
      return {};
    }

    // Check cache first
    const cacheKey = `${activity}:${focus.join(',')}`;
    if (this.hasValidContextCache(cacheKey)) {
      console.log('📋 Using cached context for AI generation');
      return this.contextCache.get(cacheKey).data;
    }

    try {
      const context = await this.contextEngine.generateActivityContext(activity, {
        focus,
        useCache: true
      });

      // Cache the context
      this.contextCache.set(cacheKey, {
        data: context,
        timestamp: Date.now()
      });

      return context;

    } catch (error) {
      console.warn('⚠️ Failed to generate context, proceeding without:', error.message);
      return {};
    }
  }

  /**
   * Enhance prompt with development context
   * @param {string} basePrompt - Base prompt
   * @param {Object} contextData - Context data
   * @returns {string} Enhanced prompt
   */
  enhancePromptWithContext(basePrompt, contextData) {
    if (!contextData.formatted || !contextData.summary) {
      return basePrompt;
    }

    const contextSection = [
      '## Development Context',
      '',
      contextData.summary,
      '',
      '### Recent Development Activity',
      contextData.formatted.split('\n').slice(0, 20).join('\n'), // Truncate for prompt length
      '',
      '## Task',
      basePrompt
    ].join('\n');

    return contextSection;
  }

  /**
   * Create social media specific prompt
   * @param {string} basePrompt - Base prompt
   * @param {Object} options - Options
   * @returns {string} Social media prompt
   */
  createSocialMediaPrompt(basePrompt, options = {}) {
    const { platform = 'twitter' } = options;
    
    const platformSpecs = {
      twitter: 'Create a Twitter/X post (max 280 characters)',
      linkedin: 'Create a LinkedIn post (professional, up to 500 characters)', 
      discord: 'Create a Discord announcement (casual, community-focused)'
    };

    const spec = platformSpecs[platform] || platformSpecs.twitter;

    return `${spec} about recent development progress on Attrition MMO. 

Based on the development context provided, create engaging content that:
- Highlights recent development achievements
- Shows progress and momentum
- Includes relevant hashtags (#AttritionMMO #SpaceGame #GameDev)
- Maintains authentic indie game development voice
- Focuses on user benefits and excitement

${basePrompt}`;
  }

  /**
   * Create feature development specific prompt
   * @param {string} basePrompt - Base prompt
   * @param {Object} options - Options
   * @returns {string} Feature development prompt
   */
  createFeaturePrompt(basePrompt, options = {}) {
    return `As a senior developer working on Attrition MMO, provide guidance for feature development.

Consider the current development context including recent commits, changed files, and project architecture.

Focus on:
- Technical implementation approach
- Integration with existing codebase
- Potential impacts on other systems
- Testing strategies
- Performance considerations

${basePrompt}`;
  }

  /**
   * Create debugging specific prompt
   * @param {string} basePrompt - Base prompt
   * @param {Object} options - Options
   * @returns {string} Debugging prompt
   */
  createDebuggingPrompt(basePrompt, options = {}) {
    return `As an expert debugger analyzing the Attrition MMO codebase, help identify and resolve issues.

Use the development context including recent changes, file hotspots, and error patterns to:
- Identify potential root causes
- Suggest debugging approaches
- Recommend fixes that align with existing patterns
- Consider impacts on related systems

${basePrompt}`;
  }

  /**
   * Create refactoring specific prompt
   * @param {string} basePrompt - Base prompt
   * @param {Object} options - Options
   * @returns {string} Refactoring prompt
   */
  createRefactoringPrompt(basePrompt, options = {}) {
    return `As a code quality expert working on Attrition MMO, provide refactoring guidance.

Based on the project structure and architecture context:
- Suggest improvements that align with existing patterns
- Recommend modern best practices
- Consider maintainability and scalability
- Ensure compatibility with the monorepo structure

${basePrompt}`;
  }

  /**
   * Create testing specific prompt  
   * @param {string} basePrompt - Base prompt
   * @param {Object} options - Options
   * @returns {string} Testing prompt
   */
  createTestingPrompt(basePrompt, options = {}) {
    return `As a testing expert for Attrition MMO, provide comprehensive testing guidance.

Consider the current codebase context including recent changes and test coverage:
- Suggest appropriate testing strategies
- Recommend test types (unit, integration, e2e)
- Consider existing testing framework (Jest)
- Focus on areas with recent changes or hotspots

${basePrompt}`;
  }

  /**
   * Check if cached context is still valid
   * @param {string} cacheKey - Cache key
   * @returns {boolean} True if cache is valid
   */
  hasValidContextCache(cacheKey) {
    const cached = this.contextCache.get(cacheKey);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    return age < this.contextCacheTimeout;
  }

  /**
   * Clear context cache
   * @param {string} pattern - Optional pattern to match
   */
  clearContextCache(pattern = null) {
    if (!pattern) {
      this.contextCache.clear();
      console.log('🗑️  Context cache cleared');
      return;
    }

    const keysToDelete = [...this.contextCache.keys()].filter(key => 
      key.includes(pattern)
    );
    
    keysToDelete.forEach(key => this.contextCache.delete(key));
    console.log(`🗑️  Cleared ${keysToDelete.length} context cache entries matching: ${pattern}`);
  }

  /**
   * Test context-aware content generation
   * @returns {Promise<boolean>} True if test passes
   */
  async testContextAwareGeneration() {
    try {
      const result = await this.generateContextAwareContent(
        'Test prompt for context-aware generation',
        {
          activity: 'development',
          includeContext: true,
          tone: 'professional'
        }
      );

      return result && 
             typeof result.content === 'string' && 
             result.context && 
             result.enhancedPrompt;

    } catch (error) {
      console.error('Context-aware generation test failed:', error.message);
      return false;
    }
  }

  /**
   * Get service status and diagnostics
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      enableContext: this.enableContext,
      contextCacheSize: this.contextCache.size,
      aiClient: this.aiClient ? this.aiClient.getStatus() : 'not-initialized',
      contextEngine: this.contextEngine ? this.contextEngine.getStatus() : 'not-initialized'
    };
  }
}

// Singleton instance for global access
let serviceInstance = null;

/**
 * Get the singleton context-aware AI service instance
 * @param {Object} options - Initialization options
 * @returns {ContextAwareAIService} Singleton service instance
 */
function getContextAwareAIService(options = {}) {
  if (!serviceInstance) {
    serviceInstance = new ContextAwareAIService(options);
  }
  return serviceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
function resetContextAwareAIService() {
  serviceInstance = null;
}

module.exports = {
  ContextAwareAIService,
  getContextAwareAIService,
  resetContextAwareAIService
};
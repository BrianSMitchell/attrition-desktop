/**
 * Context-Aware Social Media Manager
 * 
 * Enhances social media posting with intelligent development context from the
 * Context Analysis Engine. Generates engaging, context-aware content that
 * highlights real development progress and achievements.
 * 
 * Key Features:
 * - Intelligent content generation based on git activity
 * - Multiple tone variants (excited, professional, casual)
 * - Context-aware hashtag selection
 * - Platform-specific optimizations
 * - Integration with existing Twitter posting infrastructure
 * - Fallback to manual content when AI fails
 * 
 * Integrates seamlessly with existing .github/scripts/post-to-twitter.js
 */

const { getContextAwareAIService } = require('./context-aware-ai-service');
const { TwitterPoster } = require('../../.github/scripts/post-to-twitter');

/**
 * Context-Aware Social Media Manager
 * Generates and posts intelligent social media content based on development context
 */
class ContextAwareSocialManager {
  constructor(options = {}) {
    this.aiService = null;
    this.twitterPoster = null;
    this.initialized = false;
    this.dryRun = options.dryRun || false;
    this.defaultTones = options.tones || ['excited', 'professional', 'casual'];
    this.maxRetries = options.maxRetries || 2;
  }

  /**
   * Initialize the social media manager
   * @throws {Error} If initialization fails
   */
  async initialize() {
    try {
      // Initialize context-aware AI service
      this.aiService = getContextAwareAIService();
      if (!this.aiService.initialized) {
        await this.aiService.initialize();
      }

      // Initialize Twitter poster (if not in dry run mode)
      if (!this.dryRun) {
        this.twitterPoster = new TwitterPoster();
      }

      this.initialized = true;
      console.log('📱 Context-Aware Social Media Manager initialized');

    } catch (error) {
      throw new Error(`Failed to initialize Social Media Manager: ${error.message}`);
    }
  }

  /**
   * Generate and post context-aware social media content
   * @param {Object} options - Posting options
   * @param {string} options.platform - Target platform (twitter, linkedin)
   * @param {string} options.tone - Content tone or 'auto' for AI selection
   * @param {string} options.customPrompt - Custom prompt for content generation
   * @param {Object} options.context - Additional context data
   * @returns {Promise<Object>} Posting result with content and metadata
   */
  async generateAndPost(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      platform = 'twitter',
      tone = 'auto',
      customPrompt = null,
      context = {}
    } = options;

    try {
      console.log('🤖 Generating context-aware social content...');

      // Generate content variants
      const variants = await this.generateContentVariants(platform, tone, customPrompt, context);
      
      if (!variants || variants.length === 0) {
        throw new Error('Failed to generate any content variants');
      }

      // Select best variant
      const selectedVariant = this.selectBestVariant(variants);
      console.log(`✨ Selected ${selectedVariant.context.activity} content with tone: ${selectedVariant.tone || 'auto'}`);

      // Post to platform
      const result = await this.postToSocialMedia(selectedVariant, platform);

      return {
        success: true,
        content: selectedVariant.content,
        platform,
        tone: selectedVariant.tone,
        context: selectedVariant.context,
        result,
        variants: variants.length,
        metadata: {
          timestamp: new Date().toISOString(),
          aiGenerated: selectedVariant.source === 'ai',
          contextIncluded: selectedVariant.context.included,
          tokensUsed: selectedVariant.tokens || 0
        }
      };

    } catch (error) {
      console.warn('⚠️ Context-aware content generation failed, falling back to basic posting:', error.message);
      return await this.fallbackToBasicPosting(options, error);
    }
  }

  /**
   * Generate multiple content variants for selection
   * @param {string} platform - Target platform
   * @param {string} tone - Content tone or 'auto'
   * @param {string} customPrompt - Custom prompt
   * @param {Object} contextData - Additional context
   * @returns {Promise<Array>} Content variants
   */
  async generateContentVariants(platform, tone, customPrompt, contextData) {
    const variants = [];
    let retries = 0;

    while (variants.length === 0 && retries < this.maxRetries) {
      try {
        if (tone === 'auto') {
          // Generate multiple tone variants and let AI/system choose best
          const toneVariants = await this.aiService.generateSocialMediaContent({
            tones: this.defaultTones,
            platform,
            contextData
          });
          
          variants.push(...toneVariants.filter(v => v && v.content));
          
        } else {
          // Generate specific tone content
          const specificContent = await this.aiService.generateContextAwareContent(
            customPrompt || this.createDefaultPrompt(platform),
            {
              activity: 'social-posting',
              tone,
              focus: ['recent-commits', 'milestones', 'features', 'progress'],
              aiOptions: {
                maxTokens: platform === 'twitter' ? 100 : 200
              }
            }
          );
          
          if (specificContent && specificContent.content) {
            variants.push(specificContent);
          }
        }

        // Add manual fallback content as last resort
        if (variants.length === 0) {
          variants.push(this.generateFallbackContent(platform, contextData));
        }

      } catch (error) {
        console.warn(`⚠️ Content generation attempt ${retries + 1} failed:`, error.message);
        retries++;
        
        if (retries < this.maxRetries) {
          console.log(`🔄 Retrying content generation (${retries}/${this.maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
        }
      }
    }

    return variants;
  }

  /**
   * Select the best content variant based on quality metrics
   * @param {Array} variants - Content variants to choose from
   * @returns {Object} Best content variant
   */
  selectBestVariant(variants) {
    if (!variants || variants.length === 0) {
      throw new Error('No content variants available for selection');
    }

    if (variants.length === 1) {
      return variants[0];
    }

    // Score variants based on multiple factors
    const scoredVariants = variants.map(variant => ({
      ...variant,
      score: this.calculateVariantScore(variant)
    }));

    // Sort by score (descending) and return best
    scoredVariants.sort((a, b) => b.score - a.score);

    console.log(`📊 Selected variant with score ${scoredVariants[0].score.toFixed(2)} from ${variants.length} options`);
    
    return scoredVariants[0];
  }

  /**
   * Calculate quality score for a content variant
   * @param {Object} variant - Content variant to score
   * @returns {number} Quality score (0-1)
   */
  calculateVariantScore(variant) {
    let score = 0;

    // AI-generated content gets higher base score
    if (variant.source === 'ai') {
      score += 0.4;
      
      // Higher confidence = higher score
      if (variant.confidence) {
        score += variant.confidence * 0.3;
      }
    } else {
      score += 0.2; // Fallback content gets lower base score
    }

    // Context inclusion bonus
    if (variant.context && variant.context.included) {
      score += 0.2;
      
      // More context sections = higher score
      const sections = variant.context.sections || 0;
      score += Math.min(sections / 10, 0.1);
    }

    // Content length optimization (for Twitter)
    if (variant.content) {
      const length = variant.content.length;
      if (length > 50 && length < 260) {
        score += 0.1; // Good length for Twitter
      } else if (length >= 260 && length <= 280) {
        score += 0.05; // Acceptable but near limit
      }
    }

    // Hashtag presence bonus
    if (variant.content && variant.content.includes('#')) {
      score += 0.05;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Post content to social media platform
   * @param {Object} content - Content to post
   * @param {string} platform - Target platform
   * @returns {Promise<Object>} Posting result
   */
  async postToSocialMedia(content, platform) {
    if (this.dryRun) {
      console.log('🔍 DRY RUN - Would post to', platform, ':');
      console.log('📝 Content:', content.content);
      console.log('🎯 Tone:', content.tone || 'auto');
      console.log('🤖 AI Generated:', content.source === 'ai');
      console.log('📊 Context Sections:', content.context?.sections || 0);
      
      return {
        success: true,
        platform,
        dryRun: true,
        content: content.content
      };
    }

    switch (platform.toLowerCase()) {
      case 'twitter':
        return await this.postToTwitter(content);
      
      case 'linkedin':
        console.warn('⚠️ LinkedIn posting not yet implemented, skipping...');
        return { success: false, reason: 'platform-not-supported' };
      
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Post content to Twitter
   * @param {Object} content - Content to post
   * @returns {Promise<Object>} Twitter posting result
   */
  async postToTwitter(content) {
    if (!this.twitterPoster) {
      throw new Error('Twitter poster not initialized');
    }

    // Validate content before posting
    if (!this.twitterPoster.validateTweet(content.content)) {
      throw new Error('Tweet content failed validation');
    }

    try {
      const response = await this.twitterPoster.postTweet(content.content);
      
      return {
        success: true,
        platform: 'twitter',
        tweetId: response.data?.id,
        response
      };

    } catch (error) {
      throw new Error(`Twitter posting failed: ${error.message}`);
    }
  }

  /**
   * Create default prompt for content generation
   * @param {string} platform - Target platform
   * @returns {string} Default prompt
   */
  createDefaultPrompt(platform) {
    const prompts = {
      twitter: 'Create an engaging Twitter post about recent development progress, highlighting achievements and momentum.',
      linkedin: 'Create a professional LinkedIn post about development milestones and technical achievements.',
      default: 'Create engaging social media content about recent development progress.'
    };

    return prompts[platform] || prompts.default;
  }

  /**
   * Generate fallback content when AI generation fails
   * @param {string} platform - Target platform
   * @param {Object} contextData - Context data if available
   * @returns {Object} Fallback content
   */
  generateFallbackContent(platform, contextData) {
    const fallbackMessages = [
      '🚀 Development continues on Attrition MMO! New features and improvements are constantly being added. Stay tuned for updates! #AttritionMMO #GameDev #SpaceGame',
      '⚙️ Behind the scenes work happening on Attrition MMO! Our space empire strategy game keeps getting better. #GameDev #MMO #IndieGame #Progress',
      '🌟 Exciting progress on Attrition MMO development! Building the ultimate space empire experience. #SpaceGame #GameDev #AttritionMMO #Innovation'
    ];

    const randomMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];

    return {
      content: randomMessage,
      source: 'fallback',
      tone: 'professional',
      context: {
        included: false,
        activity: 'social-posting',
        summary: 'Fallback content used due to AI generation failure'
      },
      confidence: 0.6
    };
  }

  /**
   * Fallback to basic posting when context-aware generation fails
   * @param {Object} options - Original posting options
   * @param {Error} originalError - The error that caused fallback
   * @returns {Promise<Object>} Fallback posting result
   */
  async fallbackToBasicPosting(options, originalError) {
    try {
      console.log('🔄 Attempting fallback to basic social posting...');
      
      const fallbackContent = this.generateFallbackContent(options.platform || 'twitter');
      const result = await this.postToSocialMedia(fallbackContent, options.platform || 'twitter');

      return {
        success: true,
        content: fallbackContent.content,
        platform: options.platform || 'twitter',
        tone: fallbackContent.tone,
        context: fallbackContent.context,
        result,
        fallbackUsed: true,
        originalError: originalError.message,
        metadata: {
          timestamp: new Date().toISOString(),
          aiGenerated: false,
          contextIncluded: false,
          fallbackReason: 'ai-generation-failed'
        }
      };

    } catch (fallbackError) {
      return {
        success: false,
        error: fallbackError.message,
        originalError: originalError.message,
        platform: options.platform || 'twitter',
        metadata: {
          timestamp: new Date().toISOString(),
          totalFailure: true
        }
      };
    }
  }

  /**
   * Test the social media manager functionality
   * @returns {Promise<Object>} Test results
   */
  async testSocialManager() {
    try {
      const testResult = await this.generateAndPost({
        platform: 'twitter',
        tone: 'professional',
        customPrompt: 'Test post for social media manager functionality'
      });

      return {
        success: testResult.success,
        initialized: this.initialized,
        aiServiceWorking: this.aiService?.initialized || false,
        twitterPosterReady: !this.dryRun && this.twitterPoster !== null,
        contentGenerated: !!testResult.content,
        contextIncluded: testResult.context?.included || false
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        initialized: this.initialized
      };
    }
  }

  /**
   * Get service status and diagnostics
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      dryRun: this.dryRun,
      defaultTones: this.defaultTones,
      maxRetries: this.maxRetries,
      services: {
        aiService: this.aiService ? this.aiService.getStatus() : 'not-initialized',
        twitterPoster: this.twitterPoster ? 'initialized' : 'not-initialized'
      }
    };
  }
}

// Singleton instance for global access
let managerInstance = null;

/**
 * Get the singleton context-aware social media manager instance
 * @param {Object} options - Initialization options
 * @returns {ContextAwareSocialManager} Singleton manager instance
 */
function getContextAwareSocialManager(options = {}) {
  if (!managerInstance) {
    managerInstance = new ContextAwareSocialManager(options);
  }
  return managerInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
function resetContextAwareSocialManager() {
  managerInstance = null;
}

module.exports = {
  ContextAwareSocialManager,
  getContextAwareSocialManager,
  resetContextAwareSocialManager
};
/**
 * AI Service Client Wrapper
 * Provides a robust wrapper around the OpenAI API with error handling, rate limiting, and retry logic
 */

const OpenAI = require('openai');
const { getAIConfig } = require('../../config/ai-config');
const { getAIFallbackHandler } = require('./ai-fallback-handler');

/**
 * AI Service Client with rate limiting and error handling
 */
class AIServiceClient {
  constructor() {
    this.client = null;
    this.config = null;
    this.rateLimiter = new RateLimiter();
    this.fallbackHandler = getAIFallbackHandler();
    this.initialized = false;
  }

  /**
   * Initialize the AI client with configuration
   * @throws {Error} If initialization fails
   */
  async initialize() {
    try {
      this.config = getAIConfig();
      this.client = new OpenAI({
        apiKey: this.config.service.apiKey
      });
      
      // Configure rate limiter
      this.rateLimiter.configure(this.config.service.rateLimit);
      
      this.initialized = true;
      console.log(`🤖 AI Service initialized with model: ${this.config.service.model}`);
      
    } catch (error) {
      // Record fallback for configuration errors
      const reason = error.message.includes('API key') ? 'api-key-missing' : 'configuration-error';
      this.fallbackHandler.recordFallback(reason, error);
      throw new Error(`Failed to initialize AI service: ${error.message}`);
    }
  }

  /**
   * Check if the client is properly initialized
   * @returns {boolean} True if initialized
   */
  isInitialized() {
    return this.initialized && this.client !== null;
  }

  /**
   * Generate content using the AI service with retry logic
   * @param {string} prompt - The prompt for content generation
   * @param {Object} options - Additional options for generation
   * @param {string} options.tone - Tone for content (excited, professional, casual)
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {number} options.temperature - Temperature for generation
   * @returns {Promise<string>} Generated content
   * @throws {Error} If generation fails after retries
   */
  async generateContent(prompt, options = {}) {
    if (!this.isInitialized()) {
      await this.initialize();
    }

    // Apply rate limiting
    await this.rateLimiter.waitForSlot();

    const requestConfig = {
      model: this.config.service.model,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(options.tone || 'professional')
        },
        {
          role: 'user', 
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || this.config.service.maxTokens,
      temperature: options.temperature || this.config.service.temperature
    };

    return await this.retryRequest(
      async () => await this.client.chat.completions.create(requestConfig),
      3 // max retries
    );
  }

  /**
   * Generate content with automatic fallback to manual templates
   * @param {string} prompt - The prompt for content generation
   * @param {Object} contextData - Git and project context data
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated content with fallback support
   */
  async generateContentWithFallback(prompt, contextData = {}, options = {}) {
    const { tone = 'professional', forceAI = false } = options;
    
    // Check if we should try AI service or use fallback
    if (!forceAI && !this.fallbackHandler.shouldTryAIService()) {
      console.log('🔄 Using fallback mode due to recent failures');
      return this.generateFallbackContent(contextData, tone);
    }
    
    try {
      // Try AI generation first
      const response = await this.generateContent(prompt, options);
      
      return {
        templateType: this.fallbackHandler.suggestTemplate(contextData),
        content: response.choices[0].message.content.trim(),
        tone,
        source: 'ai',
        confidence: 0.9,
        tokens: response.usage?.total_tokens || 0
      };
      
    } catch (error) {
      console.warn('⚠️ AI generation failed, falling back to templates');
      
      // Determine fallback reason
      let reason = 'ai-service-unavailable';
      if (error.message.includes('429') || error.response?.status === 429) {
        reason = 'rate-limit-exceeded';
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
        reason = 'network-error';
      }
      
      this.fallbackHandler.recordFallback(reason, error);
      return this.generateFallbackContent(contextData, tone);
    }
  }

  /**
   * Generate fallback content using the fallback handler
   * @param {Object} contextData - Context data for content generation
   * @param {string} tone - Desired tone
   * @returns {Object} Generated fallback content
   */
  generateFallbackContent(contextData, tone = 'professional') {
    const suggestedTemplate = this.fallbackHandler.suggestTemplate(contextData);
    return this.fallbackHandler.generateFallbackContent(suggestedTemplate, contextData, tone);
  }

  /**
   * Generate multiple content variants
   * @param {string} prompt - The prompt for content generation
   * @param {Array<string>} tones - Array of tones to generate ['excited', 'professional', 'casual']
   * @param {Object} options - Additional options
   * @returns {Promise<Array<Object>>} Array of generated variants with tone and content
   */
  async generateVariants(prompt, tones = ['excited', 'professional', 'casual'], options = {}) {
    const variants = [];
    const contextData = options.contextData || {};
    
    // Check if we should use fallback mode entirely
    if (!this.fallbackHandler.shouldTryAIService() && !options.forceAI) {
      console.log('🔄 Using fallback mode for all variants due to recent failures');
      
      for (const tone of tones) {
        try {
          const fallbackContent = this.generateFallbackContent(contextData, tone);
          variants.push(fallbackContent);
        } catch (error) {
          console.warn(`⚠️ Failed to generate ${tone} fallback variant: ${error.message}`);
        }
      }
      
      return variants.length > 0 ? variants : [this.generateFallbackContent(contextData, 'professional')];
    }
    
    // Try AI generation for each tone, with individual fallback
    for (const tone of tones) {
      try {
        const content = await this.generateContentWithFallback(prompt, contextData, { ...options, tone });
        variants.push(content);
        
        // Small delay between variants to be respectful of rate limits
        if (content.source === 'ai') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.warn(`⚠️ Failed to generate ${tone} variant: ${error.message}`);
        
        // Try fallback for this tone
        try {
          const fallbackContent = this.generateFallbackContent(contextData, tone);
          variants.push(fallbackContent);
        } catch (fallbackError) {
          console.warn(`⚠️ Fallback also failed for ${tone}: ${fallbackError.message}`);
        }
      }
    }

    if (variants.length === 0) {
      // Last resort: generate a simple fallback
      console.warn('😨 All variants failed, using emergency fallback');
      const emergencyFallback = this.generateFallbackContent(contextData, 'professional');
      return [emergencyFallback];
    }

    return variants;
  }

  /**
   * Get system prompt based on tone
   * @param {string} tone - The desired tone
   * @returns {string} System prompt
   */
  getSystemPrompt(tone) {
    const basePrompt = `You are a social media content creator for Attrition MMO, a space empire strategy game. 
Create engaging, authentic posts that highlight development progress and community engagement.

Key Guidelines:
- Always include relevant hashtags: #AttritionMMO, #SpaceGame, #GameDev
- Keep posts under 280 characters for Twitter/X
- Focus on user benefits and excitement about features
- Mention technical details when they enhance the story
- Maintain authenticity - this is a real indie game in development`;

    const tonePrompts = {
      excited: `${basePrompt}

Tone: EXCITED and energetic! Use emojis, exclamation points, and enthusiastic language. Show genuine passion for the game development process.`,
      
      professional: `${basePrompt}

Tone: Professional but approachable. Focus on development achievements and technical excellence while remaining accessible to the gaming community.`,
      
      casual: `${basePrompt}

Tone: Casual and conversational. Write like you're sharing cool progress with friends. Use informal language but stay informative.`
    };

    return tonePrompts[tone] || tonePrompts.professional;
  }

  /**
   * Retry request with exponential backoff
   * @param {Function} requestFn - Function that makes the API request
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<Object>} API response
   */
  async retryRequest(requestFn, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await requestFn();
        
        // Successful request - update rate limiter
        this.rateLimiter.recordSuccess();
        
        return response;
        
      } catch (error) {
        lastError = error;
        console.warn(`🔄 AI request attempt ${attempt}/${maxRetries} failed: ${error.message}`);
        
        // Check if we should retry
        if (attempt === maxRetries || !this.shouldRetry(error)) {
          break;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error(`AI request failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Determine if an error should trigger a retry
   * @param {Error} error - The error that occurred
   * @returns {boolean} True if should retry
   */
  shouldRetry(error) {
    // Retry on network errors, rate limiting, and temporary server errors
    const retryableErrors = [
      'ENOTFOUND',
      'ECONNRESET', 
      'ETIMEDOUT',
      '429', // Rate limited
      '500', // Internal server error
      '502', // Bad gateway
      '503', // Service unavailable
      '504'  // Gateway timeout
    ];
    
    return retryableErrors.some(code => 
      error.message.includes(code) || 
      error.code === code ||
      (error.response && error.response.status === parseInt(code))
    );
  }

  /**
   * Test the AI service connection
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      const response = await this.generateContent(
        'Test message: Say "AI service is working correctly" in exactly those words.',
        { maxTokens: 50, temperature: 0 }
      );
      
      const content = response.choices[0].message.content.trim();
      return content.includes('AI service is working correctly');
      
    } catch (error) {
      console.error('AI service test failed:', error.message);
      return false;
    }
  }

  /**
   * Get service status and configuration info
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      model: this.config?.service?.model || 'unknown',
      rateLimit: this.config?.service?.rateLimit || 0,
      rateLimiterStatus: this.rateLimiter.getStatus(),
      fallbackStatus: this.fallbackHandler.getStatus()
    };
  }
}

/**
 * Rate Limiter for API requests
 */
class RateLimiter {
  constructor() {
    this.requestsPerMinute = 60;
    this.requests = [];
    this.windowMs = 60 * 1000; // 1 minute
  }

  /**
   * Configure rate limiting parameters
   * @param {number} requestsPerMinute - Maximum requests per minute
   */
  configure(requestsPerMinute) {
    this.requestsPerMinute = requestsPerMinute;
  }

  /**
   * Wait for an available request slot
   * @returns {Promise<void>}
   */
  async waitForSlot() {
    this.cleanOldRequests();
    
    if (this.requests.length >= this.requestsPerMinute) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (Date.now() - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`⏳ Rate limit reached, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.cleanOldRequests();
      }
    }
    
    this.requests.push(Date.now());
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    // For future use - could track success rates
  }

  /**
   * Remove old requests outside the time window
   */
  cleanOldRequests() {
    const cutoff = Date.now() - this.windowMs;
    this.requests = this.requests.filter(time => time > cutoff);
  }

  /**
   * Get rate limiter status
   * @returns {Object} Status information
   */
  getStatus() {
    this.cleanOldRequests();
    
    return {
      requestsInWindow: this.requests.length,
      maxRequests: this.requestsPerMinute,
      windowMs: this.windowMs,
      slotsAvailable: this.requestsPerMinute - this.requests.length
    };
  }
}

// Export singleton instance
let clientInstance = null;

/**
 * Get the singleton AI service client instance
 * @returns {AIServiceClient} Singleton client instance
 */
function getAIServiceClient() {
  if (!clientInstance) {
    clientInstance = new AIServiceClient();
  }
  return clientInstance;
}

module.exports = {
  AIServiceClient,
  RateLimiter,
  getAIServiceClient
};
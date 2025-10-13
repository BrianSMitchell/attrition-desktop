/**
 * AI Service Configuration
 * Provides secure access to AI API credentials and configuration from environment variables
 * Follows the same pattern as config/github.js for consistency
 */

/**
 * AI Service Configuration Constants
 * These values are used throughout the AI-enhanced social posting system
 */
const AI_CONFIG_CONSTANTS = {
  // Default AI model to use
  DEFAULT_MODEL: 'gpt-4o-mini',
  
  // Content generation settings
  MAX_TOKENS: 500,
  TEMPERATURE: 0.7,
  
  // Rate limiting (requests per minute)
  RATE_LIMIT: 60,
  
  // Context analysis settings
  DEFAULT_TIME_RANGE_DAYS: 7,
  MAX_COMMITS_TO_ANALYZE: 50,
  
  // Content validation
  MAX_TWEET_LENGTH: 280,
  MIN_TWEET_LENGTH: 10,
  
  // Template types (must match existing social-post.js templates)
  TEMPLATE_TYPES: {
    FEATURE: 'feature',
    PROGRESS: 'progress', 
    COMMUNITY: 'community',
    HYPE: 'hype',
    MILESTONE: 'milestone',
    BEHIND_SCENES: 'behind_scenes',
    QUESTION: 'question',
    CUSTOM: 'custom'
  },
  
  // Tone options for content generation
  TONE_OPTIONS: {
    EXCITED: 'excited',
    PROFESSIONAL: 'professional', 
    CASUAL: 'casual'
  },
  
  // Required hashtags for Attrition MMO posts
  REQUIRED_HASHTAGS: ['#AttritionMMO', '#SpaceGame', '#GameDev'],
  
  // Optional hashtags that can be added based on context
  OPTIONAL_HASHTAGS: [
    '#IndieGame', '#MMO', '#SpaceEmpire', '#GalaxyConquest', 
    '#Gaming', '#BehindTheScenes', '#Community', '#Feedback',
    '#NewFeature', '#Progress', '#Milestone', '#Achievement'
  ]
};

/**
 * Get OpenAI API key from environment variables
 * @returns {string} OpenAI API Key
 * @throws {Error} If key is not found
 */
function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY;
  
  if (!key) {
    throw new Error(
      'OpenAI API key not found. Please ensure OPENAI_API_KEY is set in your .env file.\n' +
      'You can create an API key at: https://platform.openai.com/api-keys'
    );
  }
  
  return key;
}

/**
 * Get AI model to use (with fallback to default)
 * @returns {string} AI model name
 */
function getAIModel() {
  return process.env.AI_MODEL || AI_CONFIG_CONSTANTS.DEFAULT_MODEL;
}

/**
 * Get AI service configuration object
 * @returns {Object} Configuration object for AI service
 */
function getAIServiceConfig() {
  return {
    apiKey: getOpenAIKey(),
    model: getAIModel(),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS) || AI_CONFIG_CONSTANTS.MAX_TOKENS,
    temperature: parseFloat(process.env.AI_TEMPERATURE) || AI_CONFIG_CONSTANTS.TEMPERATURE,
    rateLimit: parseInt(process.env.AI_RATE_LIMIT) || AI_CONFIG_CONSTANTS.RATE_LIMIT
  };
}

/**
 * Get context analysis configuration
 * @returns {Object} Configuration for context analysis
 */
function getContextConfig() {
  return {
    timeRangeDays: parseInt(process.env.AI_CONTEXT_DAYS) || AI_CONFIG_CONSTANTS.DEFAULT_TIME_RANGE_DAYS,
    maxCommits: parseInt(process.env.AI_MAX_COMMITS) || AI_CONFIG_CONSTANTS.MAX_COMMITS_TO_ANALYZE,
    cacheEnabled: process.env.AI_CACHE_ENABLED !== 'false' // Default to true
  };
}

/**
 * Get content generation configuration
 * @returns {Object} Configuration for content generation
 */
function getContentConfig() {
  return {
    maxLength: parseInt(process.env.AI_MAX_TWEET_LENGTH) || AI_CONFIG_CONSTANTS.MAX_TWEET_LENGTH,
    minLength: parseInt(process.env.AI_MIN_TWEET_LENGTH) || AI_CONFIG_CONSTANTS.MIN_TWEET_LENGTH,
    requiredHashtags: AI_CONFIG_CONSTANTS.REQUIRED_HASHTAGS,
    optionalHashtags: AI_CONFIG_CONSTANTS.OPTIONAL_HASHTAGS,
    templateTypes: AI_CONFIG_CONSTANTS.TEMPLATE_TYPES,
    toneOptions: AI_CONFIG_CONSTANTS.TONE_OPTIONS
  };
}

/**
 * Validate AI configuration
 * @throws {Error} If configuration is invalid
 */
function validateAIConfig() {
  try {
    // Test that we can get the API key
    getOpenAIKey();
    
    // Validate numeric config values
    const serviceConfig = getAIServiceConfig();
    if (serviceConfig.maxTokens < 1 || serviceConfig.maxTokens > 4000) {
      throw new Error('AI_MAX_TOKENS must be between 1 and 4000');
    }
    
    if (serviceConfig.temperature < 0 || serviceConfig.temperature > 2) {
      throw new Error('AI_TEMPERATURE must be between 0 and 2');
    }
    
    const contextConfig = getContextConfig();
    if (contextConfig.timeRangeDays < 1 || contextConfig.timeRangeDays > 365) {
      throw new Error('AI_CONTEXT_DAYS must be between 1 and 365');
    }
    
    return true;
  } catch (error) {
    throw new Error(`AI Configuration validation failed: ${error.message}`);
  }
}

/**
 * Get complete AI configuration with validation
 * @returns {Object} Complete AI configuration object
 */
function getAIConfig() {
  validateAIConfig();
  
  return {
    service: getAIServiceConfig(),
    context: getContextConfig(),
    content: getContentConfig(),
    constants: AI_CONFIG_CONSTANTS
  };
}

/**
 * Check if AI services are properly configured
 * @returns {boolean} True if properly configured
 */
function isAIConfigured() {
  try {
    validateAIConfig();
    return true;
  } catch (error) {
    return false;
  }
}

// Main exports following the same pattern as config/github.js
module.exports = {
  // Main configuration getters
  getAIConfig,
  getAIServiceConfig,
  getContextConfig,
  getContentConfig,
  
  // Individual getters
  getOpenAIKey,
  getAIModel,
  
  // Validation functions
  validateAIConfig,
  isAIConfigured,
  
  // Constants for use throughout the application
  AI_CONFIG_CONSTANTS
};
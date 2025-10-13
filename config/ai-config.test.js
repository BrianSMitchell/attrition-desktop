/**
 * Unit Tests for AI Configuration Module
 * Tests environment variable management, validation, and configuration retrieval
 */

const { 
  getAIConfig,
  getAIServiceConfig,
  getContextConfig,
  getContentConfig,
  getOpenAIKey,
  getAIModel,
  validateAIConfig,
  isAIConfigured,
  AI_CONFIG_CONSTANTS
} = require('./ai-config');

// Mock environment variables
const originalEnv = process.env;

describe('AI Configuration Module', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_MODEL;
    delete process.env.AI_MAX_TOKENS;
    delete process.env.AI_TEMPERATURE;
    delete process.env.AI_RATE_LIMIT;
    delete process.env.AI_CONTEXT_DAYS;
    delete process.env.AI_MAX_COMMITS;
    delete process.env.AI_CACHE_ENABLED;
    delete process.env.AI_MAX_TWEET_LENGTH;
    delete process.env.AI_MIN_TWEET_LENGTH;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Constants', () => {
    test('should have all required constants defined', () => {
      expect(AI_CONFIG_CONSTANTS.DEFAULT_MODEL).toBe('gpt-4o-mini');
      expect(AI_CONFIG_CONSTANTS.MAX_TOKENS).toBe(500);
      expect(AI_CONFIG_CONSTANTS.TEMPERATURE).toBe(0.7);
      expect(AI_CONFIG_CONSTANTS.RATE_LIMIT).toBe(60);
      expect(AI_CONFIG_CONSTANTS.DEFAULT_TIME_RANGE_DAYS).toBe(7);
      expect(AI_CONFIG_CONSTANTS.MAX_COMMITS_TO_ANALYZE).toBe(50);
      expect(AI_CONFIG_CONSTANTS.MAX_TWEET_LENGTH).toBe(280);
      expect(AI_CONFIG_CONSTANTS.MIN_TWEET_LENGTH).toBe(10);
    });

    test('should have all template types defined', () => {
      const templateTypes = AI_CONFIG_CONSTANTS.TEMPLATE_TYPES;
      expect(templateTypes.FEATURE).toBe('feature');
      expect(templateTypes.PROGRESS).toBe('progress');
      expect(templateTypes.COMMUNITY).toBe('community');
      expect(templateTypes.HYPE).toBe('hype');
      expect(templateTypes.MILESTONE).toBe('milestone');
      expect(templateTypes.BEHIND_SCENES).toBe('behind_scenes');
      expect(templateTypes.QUESTION).toBe('question');
      expect(templateTypes.CUSTOM).toBe('custom');
    });

    test('should have all tone options defined', () => {
      const tones = AI_CONFIG_CONSTANTS.TONE_OPTIONS;
      expect(tones.EXCITED).toBe('excited');
      expect(tones.PROFESSIONAL).toBe('professional');
      expect(tones.CASUAL).toBe('casual');
    });

    test('should have required and optional hashtags', () => {
      expect(AI_CONFIG_CONSTANTS.REQUIRED_HASHTAGS).toContain('#AttritionMMO');
      expect(AI_CONFIG_CONSTANTS.REQUIRED_HASHTAGS).toContain('#SpaceGame');
      expect(AI_CONFIG_CONSTANTS.REQUIRED_HASHTAGS).toContain('#GameDev');
      expect(AI_CONFIG_CONSTANTS.OPTIONAL_HASHTAGS).toContain('#IndieGame');
      expect(AI_CONFIG_CONSTANTS.OPTIONAL_HASHTAGS.length).toBeGreaterThan(5);
    });
  });

  describe('getOpenAIKey', () => {
    test('should return API key when set', () => {
      process.env.OPENAI_API_KEY = 'test-api-key-12345';
      expect(getOpenAIKey()).toBe('test-api-key-12345');
    });

    test('should throw error when API key is not set', () => {
      expect(() => getOpenAIKey()).toThrow('OpenAI API key not found');
      expect(() => getOpenAIKey()).toThrow('OPENAI_API_KEY');
      expect(() => getOpenAIKey()).toThrow('https://platform.openai.com/api-keys');
    });

    test('should throw error when API key is empty string', () => {
      process.env.OPENAI_API_KEY = '';
      expect(() => getOpenAIKey()).toThrow('OpenAI API key not found');
    });
  });

  describe('getAIModel', () => {
    test('should return default model when not set', () => {
      expect(getAIModel()).toBe(AI_CONFIG_CONSTANTS.DEFAULT_MODEL);
    });

    test('should return custom model when set', () => {
      process.env.AI_MODEL = 'gpt-4';
      expect(getAIModel()).toBe('gpt-4');
    });

    test('should handle empty string by returning default', () => {
      process.env.AI_MODEL = '';
      expect(getAIModel()).toBe(AI_CONFIG_CONSTANTS.DEFAULT_MODEL);
    });
  });

  describe('getAIServiceConfig', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key';
    });

    test('should return default service configuration', () => {
      const config = getAIServiceConfig();
      
      expect(config.apiKey).toBe('test-key');
      expect(config.model).toBe(AI_CONFIG_CONSTANTS.DEFAULT_MODEL);
      expect(config.maxTokens).toBe(AI_CONFIG_CONSTANTS.MAX_TOKENS);
      expect(config.temperature).toBe(AI_CONFIG_CONSTANTS.TEMPERATURE);
      expect(config.rateLimit).toBe(AI_CONFIG_CONSTANTS.RATE_LIMIT);
    });

    test('should use custom values when environment variables are set', () => {
      process.env.AI_MODEL = 'gpt-4';
      process.env.AI_MAX_TOKENS = '1000';
      process.env.AI_TEMPERATURE = '0.9';
      process.env.AI_RATE_LIMIT = '30';

      const config = getAIServiceConfig();
      
      expect(config.model).toBe('gpt-4');
      expect(config.maxTokens).toBe(1000);
      expect(config.temperature).toBe(0.9);
      expect(config.rateLimit).toBe(30);
    });

    test('should handle invalid numeric values gracefully', () => {
      process.env.AI_MAX_TOKENS = 'invalid';
      process.env.AI_TEMPERATURE = 'not-a-number';
      process.env.AI_RATE_LIMIT = 'abc';

      const config = getAIServiceConfig();
      
      // Should fall back to defaults for invalid values
      expect(config.maxTokens).toBe(AI_CONFIG_CONSTANTS.MAX_TOKENS);
      expect(config.temperature).toBe(AI_CONFIG_CONSTANTS.TEMPERATURE);
      expect(config.rateLimit).toBe(AI_CONFIG_CONSTANTS.RATE_LIMIT);
    });
  });

  describe('getContextConfig', () => {
    test('should return default context configuration', () => {
      const config = getContextConfig();
      
      expect(config.timeRangeDays).toBe(AI_CONFIG_CONSTANTS.DEFAULT_TIME_RANGE_DAYS);
      expect(config.maxCommits).toBe(AI_CONFIG_CONSTANTS.MAX_COMMITS_TO_ANALYZE);
      expect(config.cacheEnabled).toBe(true);
    });

    test('should use custom values when environment variables are set', () => {
      process.env.AI_CONTEXT_DAYS = '14';
      process.env.AI_MAX_COMMITS = '100';
      process.env.AI_CACHE_ENABLED = 'false';

      const config = getContextConfig();
      
      expect(config.timeRangeDays).toBe(14);
      expect(config.maxCommits).toBe(100);
      expect(config.cacheEnabled).toBe(false);
    });

    test('should handle cache enabled as string', () => {
      process.env.AI_CACHE_ENABLED = 'true';
      expect(getContextConfig().cacheEnabled).toBe(true);
      
      process.env.AI_CACHE_ENABLED = 'false';
      expect(getContextConfig().cacheEnabled).toBe(false);
      
      process.env.AI_CACHE_ENABLED = 'anything';
      expect(getContextConfig().cacheEnabled).toBe(true);
    });
  });

  describe('getContentConfig', () => {
    test('should return default content configuration', () => {
      const config = getContentConfig();
      
      expect(config.maxLength).toBe(AI_CONFIG_CONSTANTS.MAX_TWEET_LENGTH);
      expect(config.minLength).toBe(AI_CONFIG_CONSTANTS.MIN_TWEET_LENGTH);
      expect(config.requiredHashtags).toEqual(AI_CONFIG_CONSTANTS.REQUIRED_HASHTAGS);
      expect(config.optionalHashtags).toEqual(AI_CONFIG_CONSTANTS.OPTIONAL_HASHTAGS);
      expect(config.templateTypes).toEqual(AI_CONFIG_CONSTANTS.TEMPLATE_TYPES);
      expect(config.toneOptions).toEqual(AI_CONFIG_CONSTANTS.TONE_OPTIONS);
    });

    test('should use custom values when environment variables are set', () => {
      process.env.AI_MAX_TWEET_LENGTH = '140';
      process.env.AI_MIN_TWEET_LENGTH = '20';

      const config = getContentConfig();
      
      expect(config.maxLength).toBe(140);
      expect(config.minLength).toBe(20);
    });
  });

  describe('validateAIConfig', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key';
    });

    test('should validate successfully with valid configuration', () => {
      expect(() => validateAIConfig()).not.toThrow();
      expect(validateAIConfig()).toBe(true);
    });

    test('should throw error when API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => validateAIConfig()).toThrow('AI Configuration validation failed');
      expect(() => validateAIConfig()).toThrow('OpenAI API key not found');
    });

    test('should validate maxTokens range', () => {
      process.env.AI_MAX_TOKENS = '0';
      expect(() => validateAIConfig()).toThrow('AI_MAX_TOKENS must be between 1 and 4000');
      
      process.env.AI_MAX_TOKENS = '5000';
      expect(() => validateAIConfig()).toThrow('AI_MAX_TOKENS must be between 1 and 4000');
      
      process.env.AI_MAX_TOKENS = '2000';
      expect(() => validateAIConfig()).not.toThrow();
    });

    test('should validate temperature range', () => {
      process.env.AI_TEMPERATURE = '-0.1';
      expect(() => validateAIConfig()).toThrow('AI_TEMPERATURE must be between 0 and 2');
      
      process.env.AI_TEMPERATURE = '2.1';
      expect(() => validateAIConfig()).toThrow('AI_TEMPERATURE must be between 0 and 2');
      
      process.env.AI_TEMPERATURE = '1.0';
      expect(() => validateAIConfig()).not.toThrow();
    });

    test('should validate context days range', () => {
      process.env.AI_CONTEXT_DAYS = '0';
      expect(() => validateAIConfig()).toThrow('AI_CONTEXT_DAYS must be between 1 and 365');
      
      process.env.AI_CONTEXT_DAYS = '400';
      expect(() => validateAIConfig()).toThrow('AI_CONTEXT_DAYS must be between 1 and 365');
      
      process.env.AI_CONTEXT_DAYS = '30';
      expect(() => validateAIConfig()).not.toThrow();
    });
  });

  describe('isAIConfigured', () => {
    test('should return true when properly configured', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      expect(isAIConfigured()).toBe(true);
    });

    test('should return false when not configured', () => {
      expect(isAIConfigured()).toBe(false);
    });

    test('should return false when configuration is invalid', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.AI_MAX_TOKENS = '0'; // Invalid value
      expect(isAIConfigured()).toBe(false);
    });
  });

  describe('getAIConfig', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key';
    });

    test('should return complete configuration object', () => {
      const config = getAIConfig();
      
      expect(config).toHaveProperty('service');
      expect(config).toHaveProperty('context');
      expect(config).toHaveProperty('content');
      expect(config).toHaveProperty('constants');
      
      expect(config.service.apiKey).toBe('test-key');
      expect(config.context.timeRangeDays).toBe(7);
      expect(config.content.maxLength).toBe(280);
      expect(config.constants).toBe(AI_CONFIG_CONSTANTS);
    });

    test('should validate configuration before returning', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => getAIConfig()).toThrow('AI Configuration validation failed');
    });

    test('should use custom environment values in complete config', () => {
      process.env.AI_MODEL = 'custom-model';
      process.env.AI_CONTEXT_DAYS = '14';
      process.env.AI_MAX_TWEET_LENGTH = '240';
      
      const config = getAIConfig();
      
      expect(config.service.model).toBe('custom-model');
      expect(config.context.timeRangeDays).toBe(14);
      expect(config.content.maxLength).toBe(240);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle undefined environment variables gracefully', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      delete process.env.AI_MODEL;
      delete process.env.AI_MAX_TOKENS;
      
      const config = getAIServiceConfig();
      expect(config.model).toBe(AI_CONFIG_CONSTANTS.DEFAULT_MODEL);
      expect(config.maxTokens).toBe(AI_CONFIG_CONSTANTS.MAX_TOKENS);
    });

    test('should handle zero values in environment variables', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.AI_MAX_TOKENS = '0';
      
      expect(() => validateAIConfig()).toThrow();
    });

    test('should handle boolean environment variables correctly', () => {
      process.env.AI_CACHE_ENABLED = 'false';
      expect(getContextConfig().cacheEnabled).toBe(false);
      
      process.env.AI_CACHE_ENABLED = 'true';
      expect(getContextConfig().cacheEnabled).toBe(true);
      
      delete process.env.AI_CACHE_ENABLED;
      expect(getContextConfig().cacheEnabled).toBe(true); // default
    });
  });
});
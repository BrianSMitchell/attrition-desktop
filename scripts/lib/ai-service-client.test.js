/**
 * Unit Tests for AI Service Client
 * Tests OpenAI integration, rate limiting, error handling, and retry logic with mocked responses
 */

const { AIServiceClient, RateLimiter, getAIServiceClient } = require('./ai-service-client');

// Mock the OpenAI module
jest.mock('openai');
const OpenAI = require('openai');

// Mock the AI configuration
jest.mock('../../config/ai-config');
const { getAIConfig } = require('../../config/ai-config');

// Mock console methods to prevent noise in tests
const originalConsole = global.console;

describe('AI Service Client', () => {
  let mockOpenAIClient;
  let mockConfig;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock console methods
    global.console = {
      ...originalConsole,
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    // Mock OpenAI client
    mockOpenAIClient = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };
    
    OpenAI.mockImplementation(() => mockOpenAIClient);
    
    // Mock configuration
    mockConfig = {
      service: {
        apiKey: 'test-api-key',
        model: 'gpt-4o-mini',
        maxTokens: 500,
        temperature: 0.7,
        rateLimit: 60
      },
      context: {
        timeRangeDays: 7,
        maxCommits: 50,
        cacheEnabled: true
      },
      content: {
        maxLength: 280,
        minLength: 10,
        requiredHashtags: ['#AttritionMMO', '#SpaceGame', '#GameDev'],
        optionalHashtags: ['#IndieGame', '#MMO'],
        templateTypes: {
          FEATURE: 'feature',
          PROGRESS: 'progress'
        },
        toneOptions: {
          EXCITED: 'excited',
          PROFESSIONAL: 'professional',
          CASUAL: 'casual'
        }
      },
      constants: {
        DEFAULT_MODEL: 'gpt-4o-mini'
      }
    };
    
    getAIConfig.mockReturnValue(mockConfig);
  });
  
  afterEach(() => {
    global.console = originalConsole;
  });

  describe('AIServiceClient Initialization', () => {
    test('should initialize properly with valid configuration', async () => {
      const client = new AIServiceClient();
      
      expect(client.isInitialized()).toBe(false);
      
      await client.initialize();
      
      expect(client.isInitialized()).toBe(true);
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
      expect(console.log).toHaveBeenCalledWith('🤖 AI Service initialized with model: gpt-4o-mini');
    });

    test('should throw error if configuration is invalid', async () => {
      getAIConfig.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      const client = new AIServiceClient();
      
      await expect(client.initialize()).rejects.toThrow('Failed to initialize AI service: Configuration error');
    });

    test('should auto-initialize when generating content if not already initialized', async () => {
      const client = new AIServiceClient();
      const mockResponse = {
        choices: [{ message: { content: 'Test response' } }],
        usage: { total_tokens: 50 }
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await client.generateContent('Test prompt');
      
      expect(client.isInitialized()).toBe(true);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalled();
    });
  });

  describe('Content Generation', () => {
    let client;
    
    beforeEach(async () => {
      client = new AIServiceClient();
      await client.initialize();
    });

    test('should generate content with default options', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Generated content for Attrition MMO' } }],
        usage: { total_tokens: 50 }
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const result = await client.generateContent('Create a social media post about new features');
      
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('You are a social media content creator for Attrition MMO')
          },
          {
            role: 'user',
            content: 'Create a social media post about new features'
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });
      
      expect(result).toBe(mockResponse);
    });

    test('should use custom options when provided', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Exciting content!' } }],
        usage: { total_tokens: 30 }
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      await client.generateContent('Test prompt', {
        tone: 'excited',
        maxTokens: 200,
        temperature: 0.9
      });
      
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 200,
          temperature: 0.9,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('EXCITED and energetic')
            })
          ])
        })
      );
    });

    test('should generate multiple variants with different tones', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Test content' } }],
        usage: { total_tokens: 25 }
      };
      
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);
      
      const variants = await client.generateVariants('Test prompt', ['excited', 'professional']);
      
      expect(variants).toHaveLength(2);
      expect(variants[0].tone).toBe('excited');
      expect(variants[1].tone).toBe('professional');
      expect(variants[0].content).toBe('Test content');
      expect(variants[0].tokens).toBe(25);
      
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    test('should continue generating variants even if some fail', async () => {
      mockOpenAIClient.chat.completions.create
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValue({
          choices: [{ message: { content: 'Success content' } }],
          usage: { total_tokens: 30 }
        });
      
      const variants = await client.generateVariants('Test prompt', ['excited', 'professional']);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].tone).toBe('professional');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate excited variant')
      );
    });

    test('should throw error if no variants are generated successfully', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error('API Error'));
      
      await expect(
        client.generateVariants('Test prompt', ['excited', 'professional'])
      ).rejects.toThrow('Failed to generate any content variants');
    });
  });

  describe('System Prompts', () => {
    let client;
    
    beforeEach(() => {
      client = new AIServiceClient();
    });

    test('should generate appropriate excited tone prompt', () => {
      const prompt = client.getSystemPrompt('excited');
      
      expect(prompt).toContain('You are a social media content creator for Attrition MMO');
      expect(prompt).toContain('#AttritionMMO, #SpaceGame, #GameDev');
      expect(prompt).toContain('EXCITED and energetic');
      expect(prompt).toContain('emojis, exclamation points');
    });

    test('should generate appropriate professional tone prompt', () => {
      const prompt = client.getSystemPrompt('professional');
      
      expect(prompt).toContain('You are a social media content creator for Attrition MMO');
      expect(prompt).toContain('Professional but approachable');
      expect(prompt).toContain('development achievements');
    });

    test('should generate appropriate casual tone prompt', () => {
      const prompt = client.getSystemPrompt('casual');
      
      expect(prompt).toContain('You are a social media content creator for Attrition MMO');
      expect(prompt).toContain('Casual and conversational');
      expect(prompt).toContain('sharing cool progress with friends');
    });

    test('should default to professional tone for unknown tone', () => {
      const prompt = client.getSystemPrompt('unknown');
      
      expect(prompt).toContain('Professional but approachable');
    });
  });

  describe('Error Handling and Retry Logic', () => {
    let client;
    
    beforeEach(async () => {
      client = new AIServiceClient();
      await client.initialize();
    });

    test('should retry on retryable errors', async () => {
      const retryableError = new Error('Rate limited');
      retryableError.response = { status: 429 };
      
      const mockResponse = {
        choices: [{ message: { content: 'Success after retry' } }],
        usage: { total_tokens: 40 }
      };
      
      mockOpenAIClient.chat.completions.create
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue(mockResponse);
      
      const result = await client.generateContent('Test prompt');
      
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(2);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('AI request attempt 1/3 failed')
      );
      expect(result).toBe(mockResponse);
    });

    test('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new Error('Invalid API key');
      nonRetryableError.response = { status: 401 };
      
      mockOpenAIClient.chat.completions.create.mockRejectedValue(nonRetryableError);
      
      await expect(client.generateContent('Test prompt')).rejects.toThrow(
        'AI request failed after 3 attempts: Invalid API key'
      );
      
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    test('should identify retryable errors correctly', () => {
      const errors = [
        { message: 'ENOTFOUND' },
        { message: 'ECONNRESET' },
        { message: 'ETIMEDOUT' },
        { response: { status: 429 } },
        { response: { status: 500 } },
        { response: { status: 502 } },
        { response: { status: 503 } },
        { response: { status: 504 } }
      ];
      
      errors.forEach(error => {
        expect(client.shouldRetry(error)).toBe(true);
      });
      
      const nonRetryableErrors = [
        { response: { status: 401 } },
        { response: { status: 403 } },
        { message: 'Invalid request' }
      ];
      
      nonRetryableErrors.forEach(error => {
        expect(client.shouldRetry(error)).toBe(false);
      });
    });

    test('should implement exponential backoff for retries', async () => {
      const retryableError = new Error('Server error');
      retryableError.response = { status: 500 };
      
      mockOpenAIClient.chat.completions.create.mockRejectedValue(retryableError);
      
      const startTime = Date.now();
      
      try {
        await client.generateContent('Test prompt');
      } catch (error) {
        // Should fail after retries
      }
      
      const elapsed = Date.now() - startTime;
      
      // Should have waited at least 1s + 2s = 3s for first two retries
      expect(elapsed).toBeGreaterThan(3000);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('Connection Testing', () => {
    let client;
    
    beforeEach(async () => {
      client = new AIServiceClient();
      await client.initialize();
    });

    test('should return true for successful connection test', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'AI service is working correctly' } }],
        usage: { total_tokens: 10 }
      });
      
      const result = await client.testConnection();
      
      expect(result).toBe(true);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('AI service is working correctly')
            })
          ])
        })
      );
    });

    test('should return false for failed connection test', async () => {
      mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error('Connection failed'));
      
      const result = await client.testConnection();
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'AI service test failed:', 'Connection failed'
      );
    });

    test('should return false if response does not contain expected text', async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Unexpected response' } }],
        usage: { total_tokens: 10 }
      });
      
      const result = await client.testConnection();
      
      expect(result).toBe(false);
    });
  });

  describe('Status and Configuration', () => {
    let client;
    
    beforeEach(async () => {
      client = new AIServiceClient();
      await client.initialize();
    });

    test('should return correct status information', () => {
      const status = client.getStatus();
      
      expect(status).toEqual({
        initialized: true,
        model: 'gpt-4o-mini',
        rateLimit: 60,
        rateLimiterStatus: expect.any(Object)
      });
    });

    test('should return unknown model when not initialized', () => {
      const uninitializedClient = new AIServiceClient();
      const status = uninitializedClient.getStatus();
      
      expect(status.initialized).toBe(false);
      expect(status.model).toBe('unknown');
      expect(status.rateLimit).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance when called multiple times', () => {
      const client1 = getAIServiceClient();
      const client2 = getAIServiceClient();
      
      expect(client1).toBe(client2);
      expect(client1).toBeInstanceOf(AIServiceClient);
    });
  });
});

describe('RateLimiter', () => {
  let rateLimiter;
  
  beforeEach(() => {
    rateLimiter = new RateLimiter();
    global.console = {
      ...originalConsole,
      log: jest.fn()
    };
  });
  
  afterEach(() => {
    global.console = originalConsole;
  });

  test('should allow requests within rate limit', async () => {
    rateLimiter.configure(5); // 5 requests per minute
    
    const promises = Array.from({ length: 5 }, () => rateLimiter.waitForSlot());
    
    await Promise.all(promises);
    
    const status = rateLimiter.getStatus();
    expect(status.requestsInWindow).toBe(5);
    expect(status.slotsAvailable).toBe(0);
  });

  test('should throttle requests when rate limit is exceeded', async () => {
    rateLimiter.configure(2); // 2 requests per minute
    
    // First 2 requests should be immediate
    await rateLimiter.waitForSlot();
    await rateLimiter.waitForSlot();
    
    const status = rateLimiter.getStatus();
    expect(status.slotsAvailable).toBe(0);
    
    // Third request should be throttled
    const startTime = Date.now();
    await rateLimiter.waitForSlot();
    const elapsed = Date.now() - startTime;
    
    expect(elapsed).toBeGreaterThan(0); // Should have waited
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Rate limit reached, waiting')
    );
  });

  test('should clean old requests outside time window', async () => {
    rateLimiter.configure(5);
    
    // Add some requests
    await rateLimiter.waitForSlot();
    await rateLimiter.waitForSlot();
    
    expect(rateLimiter.getStatus().requestsInWindow).toBe(2);
    
    // Manually set old timestamp to simulate time passing
    rateLimiter.requests[0] = Date.now() - 61000; // 61 seconds ago
    
    // Clean old requests
    rateLimiter.cleanOldRequests();
    
    expect(rateLimiter.getStatus().requestsInWindow).toBe(1);
  });

  test('should return correct status information', () => {
    rateLimiter.configure(10);
    rateLimiter.requests = [Date.now(), Date.now() - 30000]; // 2 recent requests
    
    const status = rateLimiter.getStatus();
    
    expect(status.requestsInWindow).toBe(2);
    expect(status.maxRequests).toBe(10);
    expect(status.windowMs).toBe(60000);
    expect(status.slotsAvailable).toBe(8);
  });

  test('should handle recordSuccess method', () => {
    expect(() => rateLimiter.recordSuccess()).not.toThrow();
  });
});
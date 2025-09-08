/**
 * Jest configuration for game balance and performance testing
 * 
 * This configuration extends the base Jest setup to specifically support
 * comprehensive balance and performance testing with appropriate timeouts,
 * setup/teardown procedures, and reporting.
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Display name for this configuration
  displayName: {
    name: 'Balance & Performance Tests',
    color: 'magenta'
  },

  // Test match patterns for balance and performance tests
  testMatch: [
    '<rootDir>/src/__tests__/game-balance/**/*.test.ts',
    '<rootDir>/src/__tests__/game-performance/**/*.test.ts'
  ],

  // Extended timeouts for complex balance and performance scenarios
  testTimeout: 120000, // 2 minutes for complex scenarios

  // Global setup and teardown for test environment
  globalSetup: '<rootDir>/src/__tests__/setup/balance-performance-setup.js',
  globalTeardown: '<rootDir>/src/__tests__/setup/balance-performance-teardown.js',

  // Per-test setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/jest.setup.ts',
    '<rootDir>/src/__tests__/setup/balance-performance.setup.ts'
  ],

  // Test environment configuration
  testEnvironment: 'node',
  testEnvironmentOptions: {
    // Increase memory limits for performance testing
    memory: '2048m'
  },

  // Module paths and aliases
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    '^@test-utils/(.*)$': '<rootDir>/src/test-utils/$1'
  },

  // Coverage configuration - focus on game logic and services
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/models/**/*.ts',
    'src/test-utils/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**'
  ],

  // Coverage thresholds for balance and performance critical code
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/capacityService.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/services/economyService.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },

  // Reporters for detailed test output
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results/balance-performance',
      outputName: 'balance-performance-results.xml',
      suiteName: 'Balance & Performance Tests'
    }],
    ['jest-html-reporters', {
      publicPath: './test-results/balance-performance/html',
      filename: 'balance-performance-report.html',
      pageTitle: 'Game Balance & Performance Test Results',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ],

  // Custom test result processor for performance metrics
  testResultsProcessor: '<rootDir>/src/__tests__/processors/balance-performance-processor.js',

  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache/balance-performance',

  // Transform configuration for TypeScript and ES modules
  transform: {
    ...baseConfig.transform
  },

  // File extensions to transform
  moduleFileExtensions: [
    'js',
    'json',
    'ts',
    'tsx'
  ],

  // Paths to ignore during transformation
  transformIgnorePatterns: [
    'node_modules/(?!(@game/shared)/)'
  ],

  // Test serialization options for complex objects
  snapshotSerializers: [
    'jest-serializer-path'
  ],

  // Performance and resource monitoring
  maxWorkers: '50%', // Use 50% of available CPU cores for balance tests
  workerIdleMemoryLimit: '1GB',

  // Verbose output for detailed test information
  verbose: true,

  // Detect open handles and async operations
  detectOpenHandles: true,
  detectLeaks: true,

  // Force exit after tests complete
  forceExit: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};

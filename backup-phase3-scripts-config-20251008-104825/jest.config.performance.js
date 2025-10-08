/** @type {import('jest').Config} */
module.exports = {
  displayName: {
    name: 'Performance Tests',
    color: 'yellow'
  },

  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/performance/**/*.test.ts',
    '<rootDir>/tests/performance/**/*.test.js'
  ],

  // Setup files for performance testing
  setupFilesAfterEnv: [
    '<rootDir>/tests/fixtures/setup/balance-performance.setup.ts'
  ],

  // Transform configuration
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      useESM: true
    }]
  },

  // Module resolution
  moduleNameMapper: {
    '^@game/shared$': '<rootDir>/packages/shared/src',
    '^@game/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@test-utils/(.*)$': '<rootDir>/tests/utils/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  extensionsToTreatAsEsm: ['.ts', '.js'],

  // Performance-focused coverage
  collectCoverageFrom: [
    'packages/server/src/services/**/*.ts',
    'packages/shared/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.test.*'
  ],

  coverageDirectory: '<rootDir>/tests/reports/coverage/performance',
  coverageReporters: ['text', 'lcov'],

  // Coverage thresholds for performance-critical code
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },

  // Extended timeouts for performance tests
  testTimeout: 120000, // 2 minutes
  maxWorkers: '25%', // Lower concurrency for accurate performance measurements

  // Performance test environment
  testEnvironmentOptions: {
    memory: '2048m'
  },

  // Reporters for performance metrics
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/tests/reports/performance',
      outputName: 'performance-results.xml',
      suiteName: 'Performance Tests'
    }]
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/temp/',
    '/AttritionPortable/'
  ],

  // Clear mocks for consistent performance measurements
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,tsx,js}'
  ],
  
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // Global test settings
  testTimeout: 30000,
  maxWorkers: '50%',
  
  // Coverage settings
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Global coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test environment setup
  globalSetup: '<rootDir>/scripts/dev/test-setup-global.js',
  globalTeardown: '<rootDir>/scripts/dev/test-teardown-global.js',

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/releases/',
    '/temp/',
    '/logs/'
  ],

  // Module path mapping for monorepo
  moduleNameMapper: {
    '^@game/shared$': '<rootDir>/packages/shared/src',
    '^@game/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@test-utils/(.*)$': '<rootDir>/tests/utils/$1'
  },

  // Watch plugins for better development experience
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};

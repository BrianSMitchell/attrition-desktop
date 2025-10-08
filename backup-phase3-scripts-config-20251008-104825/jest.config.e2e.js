/** @type {import('jest').Config} */
module.exports = {
  displayName: {
    name: 'E2E Tests',
    color: 'magenta'
  },

  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/e2e/**/*.test.ts',
    '<rootDir>/tests/e2e/**/*.test.js'
  ],

  // Global setup for E2E (may need to start servers, etc.)
  globalSetup: '<rootDir>/scripts/dev/test-setup-global.js',
  globalTeardown: '<rootDir>/scripts/dev/test-teardown-global.js',

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

  // E2E tests focus on end-to-end behavior, not coverage
  collectCoverage: false,

  // Very long timeouts for E2E tests
  testTimeout: 60000,
  maxWorkers: 1, // E2E tests often need to run sequentially

  // Detect resource leaks in E2E tests
  detectOpenHandles: true,
  forceExit: true,

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/temp/',
    '/AttritionPortable/'
  ]
};

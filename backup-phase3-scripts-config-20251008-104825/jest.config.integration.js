/** @type {import('jest').Config} */
module.exports = {
  displayName: {
    name: 'Integration Tests',
    color: 'green'
  },

  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.js'
  ],

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/fixtures/setup/jest.setup.ts'
  ],

  // Global setup and teardown
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

  // Coverage settings (integration tests focus on interaction coverage)
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,js}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.test.*'
  ],

  coverageDirectory: '<rootDir>/tests/reports/coverage/integration',
  coverageReporters: ['text', 'lcov'],

  // Extended timeouts for integration tests
  testTimeout: 30000,
  maxWorkers: '50%',

  // Test environment options
  testEnvironmentOptions: {
    memory: '1024m'
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/temp/',
    '/AttritionPortable/'
  ]
};

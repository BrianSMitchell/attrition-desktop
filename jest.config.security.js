/** @type {import('jest').Config} */
module.exports = {
  displayName: {
    name: 'Security Tests',
    color: 'red'
  },

  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/security/**/*.test.ts',
    '<rootDir>/tests/security/**/*.test.js'
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

  // Coverage settings for security tests
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,js}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.test.*'
  ],

  coverageDirectory: '<rootDir>/tests/reports/coverage/security',
  coverageReporters: ['text', 'lcov'],

  // Extended timeouts for security tests
  testTimeout: 30000,
  maxWorkers: '50%',

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/temp/',
    '/AttritionPortable/'
  ]
};

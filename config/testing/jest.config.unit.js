/** @type {import('jest').Config} */
module.exports = {
  displayName: {
    name: 'Unit Tests',
    color: 'blue'
  },

  rootDir: '../../',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/unit/**/*.test.tsx',
    '<rootDir>/tests/unit/**/*.test.js'
  ],

  // Setup files - removed missing test-setup.d.ts
  // setupFilesAfterEnv: [],

  // Transform configuration
  preset: 'ts-jest',
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', {
      tsconfig: {
        lib: ['ES2017', 'DOM'],
        target: 'ES2017'
      }
    }]
  },

  // Module resolution
  moduleNameMapper: {
    '^@game/shared$': '<rootDir>/packages/shared/src',
    '^@game/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@test-utils/(.*)$': '<rootDir>/tests/utils/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1' // Fix ESM imports
  },

  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Coverage settings
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx,js}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/__tests__/**',
    '!packages/*/src/**/test-*',
    '!packages/desktop/src/main.js' // Skip main process
  ],

  coverageDirectory: '<rootDir>/tests/reports/coverage/unit',
  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage thresholds for unit tests
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  testTimeout: 10000,
  maxWorkers: '75%',

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/temp/',
    '/AttritionPortable/'
  ]
};

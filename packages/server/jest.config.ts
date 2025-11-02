/**
 * Jest Configuration for Attrition Server Package
 * ================================================
 *
 * Core Jest setup for unit and integration testing of the server package.
 * This configuration defines test environment, module resolution, coverage
 * thresholds, and other testing parameters.
 *
 * Usage:
 * - npm test                          Run all tests
 * - npm test -- --watch               Run tests in watch mode
 * - npm test -- --coverage            Run tests with coverage report
 * - npm test -- --testNamePattern     Run specific test by name
 */

import type { Config } from 'jest';
import * as path from 'path';

const config: Config = {
  // Project display name for monorepo
  displayName: 'server',

  // Test environment - use Node.js (not jsdom, which is for browsers)
  testEnvironment: 'node',

  // File extensions Jest should look for
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Root directory for test resolution
  rootDir: path.resolve(__dirname),

  // Paths to module aliases (must match tsconfig.json)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@test-utils/(.*)$': '<rootDir>/src/test-utils/$1',
  },

  // Transform configuration - use ts-jest for TypeScript files
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        declaration: false,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        isolatedModules: true,
      },
      isolatedModules: true,
    }],
  },

  // Patterns for files to ignore during transformation
  transformIgnorePatterns: [
    'node_modules/(?!(@game|@attrition)/)',
  ],

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.spec.ts',
  ],

  // Files to setup before tests run
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/jest.setup.ts',
  ],

  // Collect coverage from these files
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/__tests__/**',
    '!src/test-utils/**',
  ],

  // Coverage thresholds - prevent coverage regression
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  // Jest reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'results.xml',
        suiteName: 'Server Tests',
        usePathAsTestName: true,
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePercentageFormatter: false,
      },
    ],
  ],

  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',

  // Test timeout (ms)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Max workers for parallel test execution
  maxWorkers: '50%',

  // Detect open handles and async operations
  detectOpenHandles: false,
  detectLeaks: false,

  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Module file extensions to check
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/node_modules/',
  ],

  // Allow unmocked ES modules
  unmockedModulePathPatterns: [],
};

export default config;

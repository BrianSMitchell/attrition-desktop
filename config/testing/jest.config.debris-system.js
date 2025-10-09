/** @type {import('jest').Config} */
const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  
  // Override test match to focus on debris system tests
  testMatch: [
    '<rootDir>/packages/server/src/systems/__tests__/DebrisSystem.test.ts',
    '<rootDir>/packages/shared/src/types/__tests__/debris.test.ts',
    '<rootDir>/packages/client/src/components/game/__tests__/DebrisIndicator.test.tsx'
  ],
  
  // Additional setup for debris system tests
  setupFilesAfterEnv: [
    '<rootDir>/config/testing/setup/debris-system.setup.ts'
  ],
  
  // Specific coverage thresholds for debris system
  coverageThreshold: {
    './packages/server/src/systems/DebrisSystem.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './packages/shared/src/types/debris.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
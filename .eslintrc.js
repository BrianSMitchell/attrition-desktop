/**
 * Root ESLint Configuration for Attrition Project
 * Extends server configuration for testing and root-level files
 */

module.exports = {
  root: true,
  extends: [
    './packages/server/.eslintrc.js'
  ],
  env: {
    node: true,
    es2020: true,
    jest: true
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    '*.d.ts',
    'packages/*/dist/',
    'packages/*/node_modules/',
    '**/*.test.ts',
    '**/*.spec.ts'
  ]
};
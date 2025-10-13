/**
 * ESLint Configuration for Attrition Server
 * Integrates custom code smell detection with standard JavaScript rules
 */

module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: [
    '@attrition/code-smell-detector'
  ],
  extends: [
    'eslint:recommended'
  ],
  env: {
    node: true,
    es2020: true,
    jest: true
  },
  rules: {
    // General JavaScript rules
    'no-console': 'off', // Handled by our custom plugin
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-unused-vars': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'indent': ['error', 2],
    'comma-dangle': ['error', 'always-multiline'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],

    // Custom Attrition rules - Recommended configuration
    '@attrition/code-smell-detector/id-consistency': 'error',
    '@attrition/code-smell-detector/no-excessive-logging': 'warn',
    '@attrition/code-smell-detector/no-legacy-database-checks': 'error',
    '@attrition/code-smell-detector/service-extraction-required': 'warn',
    '@attrition/code-smell-detector/max-complexity': 'warn'
  },
  overrides: [
    // Test files
    {
      files: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
      rules: {
        '@attrition/code-smell-detector/no-excessive-logging': 'off',
        '@attrition/code-smell-detector/max-complexity': 'off'
      }
    },

    // Migration scripts (temporary)
    {
      files: ['**/migrations/**/*.js', '**/scripts/**/*.js'],
      rules: {
        '@attrition/code-smell-detector/no-legacy-database-checks': 'warn',
        '@attrition/code-smell-detector/service-extraction-required': 'off'
      }
    },

    // Configuration files
    {
      files: ['**/*.config.js'],
      rules: {
        'no-console': 'off'
      }
    }
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '!.eslintrc.js',
    'coverage/',
    '*.d.ts',
    '**/*.ts' // Temporarily ignore TypeScript files until parser is available
  ]
};

/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '\\.module\\.css$': 'identity-obj-proxy',
    // Handle CSS imports (without CSS modules)
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
    // Handle static assets
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js'
  },
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      useESM: true
    }]
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.[jt]s?(x)'
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  // Handle ESM modules
  transformIgnorePatterns: [
    'node_modules/(?!(@game/shared)/)'
  ]
};
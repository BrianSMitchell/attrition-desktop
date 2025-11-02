/**
 * Jest Setup File
 * Runs before each test suite
 * Use for global test configuration, mocks, and utilities
 */

// Suppress console output in tests (unless explicitly logged)
if (process.env.DEBUG !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/attrition_test';

// Jest timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidId(): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidId(received) {
    const isValid = typeof received === 'string' && received.length > 0;
    return {
      pass: isValid,
      message: () => `Expected ${received} to be a valid ID`,
    };
  },
});

// Mock Supabase client (if not using real database in tests)
// This is optional - remove or modify based on your test needs
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    realtime: {
      on: jest.fn(),
      subscribe: jest.fn(),
    },
  })),
}));

// Cleanup after all tests
afterAll(async () => {
  // Add any cleanup code here
  // E.g., close database connections, clear mocks
});

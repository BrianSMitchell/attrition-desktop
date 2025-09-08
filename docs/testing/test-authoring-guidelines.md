# Test Authoring Guidelines and Templates

## 📋 Table of Contents

- [Introduction](#introduction)
- [General Testing Principles](#general-testing-principles)
- [Test Types and Templates](#test-types-and-templates)
- [Naming Conventions](#naming-conventions)
- [Test Structure and Organization](#test-structure-and-organization)
- [Code Quality Standards](#code-quality-standards)
- [Platform-Specific Guidelines](#platform-specific-guidelines)
- [Mocking and Test Data](#mocking-and-test-data)
- [Error Testing and Edge Cases](#error-testing-and-edge-cases)
- [Performance Testing Guidelines](#performance-testing-guidelines)
- [Accessibility Testing Guidelines](#accessibility-testing-guidelines)
- [Common Patterns and Examples](#common-patterns-and-examples)
- [Best Practices Checklist](#best-practices-checklist)

---

## 🎯 Introduction

This document provides comprehensive guidelines for writing high-quality, maintainable tests for the Attrition space empire MMO game. Following these guidelines ensures consistency across the testing codebase and helps create tests that are reliable, readable, and effective at catching regressions.

### Objectives

- **Consistency**: Standardize testing patterns across the entire codebase
- **Quality**: Ensure tests are reliable, maintainable, and effective
- **Efficiency**: Provide templates to speed up test development
- **Coverage**: Guide comprehensive testing of all application areas
- **Collaboration**: Enable team members to easily understand and modify tests

### Target Audience

- Frontend developers writing React component tests
- Backend developers creating API and service tests
- QA engineers developing end-to-end test scenarios
- DevOps engineers maintaining testing infrastructure

---

## 🏛️ General Testing Principles

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Bad - Testing implementation details
test('should call useState with initial value', () => {
  const setStateMock = jest.fn();
  jest.spyOn(React, 'useState').mockReturnValue([false, setStateMock]);
  render(<Component />);
  expect(React.useState).toHaveBeenCalledWith(false);
});

// ✅ Good - Testing behavior
test('should display loading spinner initially', () => {
  render(<Component />);
  expect(screen.getByRole('status')).toBeInTheDocument();
});
```

### 2. Write Tests That Fail for the Right Reasons

```typescript
// ❌ Bad - Too specific, breaks on style changes
expect(button).toHaveStyle('background-color: #007bff');

// ✅ Good - Tests functional behavior
expect(button).toHaveAttribute('aria-pressed', 'true');
```

### 3. Keep Tests Independent

```typescript
// ❌ Bad - Tests depend on each other
let sharedState: any;

test('should create user', () => {
  sharedState = createUser({ name: 'John' });
  expect(sharedState.id).toBeDefined();
});

test('should update user', () => {
  const updated = updateUser(sharedState.id, { name: 'Jane' });
  expect(updated.name).toBe('Jane');
});

// ✅ Good - Each test is independent
test('should create user', () => {
  const user = createUser({ name: 'John' });
  expect(user.id).toBeDefined();
});

test('should update user', () => {
  const user = createUser({ name: 'John' });
  const updated = updateUser(user.id, { name: 'Jane' });
  expect(updated.name).toBe('Jane');
});
```

### 4. Use Descriptive Test Names

```typescript
// ❌ Bad - Vague names
test('user creation');
test('login works');

// ✅ Good - Descriptive names
test('should create user with valid email and password');
test('should redirect to dashboard after successful login');
test('should display error message when login fails');
```

---

## 🧪 Test Types and Templates

### Unit Test Template

**Location**: `src/**/*.test.ts` or `src/**/__tests__/**/*.test.ts`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { ComponentName } from './ComponentName';

// Mock external dependencies
jest.mock('../services/apiService');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('ComponentName', () => {
  // Setup and cleanup
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // Test successful scenarios first
  describe('successful operations', () => {
    test('should render component with required props', () => {
      // Arrange
      const props = {
        title: 'Test Title',
        onAction: jest.fn(),
      };

      // Act
      render(<ComponentName {...props} />);

      // Assert
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    test('should call onAction when button is clicked', async () => {
      // Arrange
      const mockOnAction = jest.fn();
      const props = { title: 'Test', onAction: mockOnAction };

      // Act
      render(<ComponentName {...props} />);
      const button = screen.getByRole('button', { name: /action/i });
      fireEvent.click(button);

      // Assert
      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledTimes(1);
      });
    });
  });

  // Test error scenarios
  describe('error handling', () => {
    test('should display error message when operation fails', async () => {
      // Arrange
      const mockOnAction = jest.fn().mockRejectedValue(new Error('API Error'));
      const props = { title: 'Test', onAction: mockOnAction };

      // Act
      render(<ComponentName {...props} />);
      const button = screen.getByRole('button', { name: /action/i });
      fireEvent.click(button);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  // Test edge cases
  describe('edge cases', () => {
    test('should handle empty props gracefully', () => {
      // Arrange & Act
      render(<ComponentName />);

      // Assert
      expect(screen.getByText(/default/i)).toBeInTheDocument();
    });
  });
});
```

### Integration Test Template

**Location**: `tests/integration/**/*.test.ts`

```typescript
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDatabase, cleanupTestDatabase } from '../test-utils/database';
import { createTestUser, getAuthToken } from '../test-utils/auth';

describe('API Integration - /api/players', () => {
  let testUser: any;
  let authToken: string;

  // Setup test database and auth
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'test@example.com',
      username: 'testuser',
    });
    authToken = await getAuthToken(testUser.id);
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/players', () => {
    test('should create new player with valid data', async () => {
      // Arrange
      const playerData = {
        username: 'newplayer',
        email: 'newplayer@example.com',
        faction: 'terran',
      };

      // Act
      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${authToken}`)
        .send(playerData)
        .expect(201);

      // Assert
      expect(response.body.player).toMatchObject({
        username: 'newplayer',
        email: 'newplayer@example.com',
        faction: 'terran',
      });
      expect(response.body.player.id).toBeDefined();
      expect(response.body.player.createdAt).toBeDefined();
    });

    test('should return 400 for invalid email format', async () => {
      // Arrange
      const invalidPlayerData = {
        username: 'newplayer',
        email: 'invalid-email',
        faction: 'terran',
      };

      // Act & Assert
      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPlayerData)
        .expect(400);

      expect(response.body.error).toContain('email');
    });

    test('should return 401 for unauthenticated request', async () => {
      // Arrange
      const playerData = {
        username: 'newplayer',
        email: 'newplayer@example.com',
        faction: 'terran',
      };

      // Act & Assert
      await request(app)
        .post('/api/players')
        .send(playerData)
        .expect(401);
    });
  });
});
```

### End-to-End Test Template

**Location**: `e2e/tests/**/*.spec.ts`

```typescript
import { test, expect, Page } from '@playwright/test';
import { login, createTestUser, cleanupTestUser } from '../fixtures/auth-helpers';
import { seedGameData, cleanupGameData } from '../fixtures/game-helpers';

test.describe('Game Workflow - Resource Management', () => {
  let testUser: any;

  test.beforeAll(async () => {
    testUser = await createTestUser();
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser.id);
  });

  test.beforeEach(async ({ page }) => {
    await login(page, testUser);
    await seedGameData(testUser.id);
  });

  test.afterEach(async () => {
    await cleanupGameData(testUser.id);
  });

  test('should complete resource production cycle', async ({ page }) => {
    // Arrange - Navigate to base management
    await page.goto('/bases');
    await expect(page).toHaveURL(/\/bases/);

    // Act - Check initial resources
    const initialResources = await page.locator('[data-testid="resource-metals"]').textContent();
    
    // Navigate to production tab
    await page.click('[data-testid="tab-production"]');
    await expect(page.locator('[data-testid="production-panel"]')).toBeVisible();

    // Start metal production
    await page.click('[data-testid="production-metals-button"]');
    await expect(page.locator('[data-testid="production-active"]')).toBeVisible();

    // Wait for production cycle (or fast-forward in test)
    await page.evaluate(() => {
      // Fast-forward game time for testing
      window.gameTime?.fastForward(3600000); // 1 hour
    });

    // Assert - Check resources increased
    await page.reload();
    const finalResources = await page.locator('[data-testid="resource-metals"]').textContent();
    
    expect(parseInt(finalResources!)).toBeGreaterThan(parseInt(initialResources!));
  });

  test('should handle insufficient resources gracefully', async ({ page }) => {
    // Arrange
    await page.goto('/bases');
    await page.click('[data-testid="tab-construction"]');

    // Act - Try to build without sufficient resources
    await page.click('[data-testid="build-expensive-structure"]');

    // Assert - Error message displayed
    await expect(page.locator('[role="alert"]')).toContainText('Insufficient resources');
    await expect(page.locator('[data-testid="build-expensive-structure"]')).toBeDisabled();
  });
});
```

### Visual Regression Test Template

**Location**: `e2e/visual/**/*.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { login, createTestUser } from '../fixtures/auth-helpers';

test.describe('Visual Regression - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    const testUser = await createTestUser();
    await login(page, testUser);
  });

  test('dashboard layout should match expected design', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for dynamic content to load
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    await page.waitForTimeout(2000); // Allow for animations

    // Take screenshot with specific options
    await expect(page).toHaveScreenshot('dashboard-full.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        page.locator('[data-testid="timestamp"]'), // Mask dynamic timestamps
        page.locator('[data-testid="live-counter"]'), // Mask counters
      ],
    });
  });

  test('dashboard should look consistent across themes', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();

    // Test light theme
    await page.click('[data-testid="theme-light"]');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-light-theme.png');

    // Test dark theme  
    await page.click('[data-testid="theme-dark"]');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-dark-theme.png');

    // Test high contrast theme
    await page.click('[data-testid="theme-high-contrast"]');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-high-contrast-theme.png');
  });
});
```

### Performance Test Template

**Location**: `e2e/performance/**/*.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { login, createTestUser } from '../fixtures/auth-helpers';

test.describe('Performance - Game Load Times', () => {
  test('dashboard should load within performance thresholds', async ({ page }) => {
    // Setup performance monitoring
    await page.addInitScript(() => {
      window.performance.mark('test-start');
    });

    const testUser = await createTestUser();
    await login(page, testUser);

    // Start timing critical user journey
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    
    // Wait for all critical content to load
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="resource-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="base-list"]')).toBeVisible();

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // Assert performance thresholds
    expect(loadTime).toBeLessThan(3000); // 3 second max load time

    // Measure Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
          });
          
          resolve(vitals);
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
      });
    });

    expect(metrics.fcp).toBeLessThan(1500); // FCP < 1.5s
    expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s
  });
});
```

---

## 📝 Naming Conventions

### Test Files

```typescript
// Unit tests
Component.test.tsx          // React components
utils.test.ts              // Utility functions
service.test.ts            // Service classes
calculator.test.ts         // Business logic

// Integration tests  
api.integration.test.ts    // API integration
database.integration.test.ts // Database integration
auth.integration.test.ts   // Authentication integration

// E2E tests
user-journey.spec.ts       // Complete user workflows
authentication.spec.ts     // Auth workflows
game-mechanics.spec.ts     // Game-specific flows
cross-browser.spec.ts      // Cross-browser compatibility

// Performance tests
load-testing.perf.spec.ts  // Load testing
startup.perf.spec.ts       // Startup performance
memory-usage.perf.spec.ts  // Memory profiling

// Visual regression tests
dashboard.visual.spec.ts   // UI consistency
theme-switching.visual.spec.ts // Theme variations
responsive.visual.spec.ts  // Responsive design
```

### Test Names

Follow the pattern: `should [expected behavior] when [condition/context]`

```typescript
// ✅ Good test names
test('should display welcome message when user logs in successfully');
test('should show error alert when API request fails');
test('should disable submit button when form is invalid');
test('should navigate to dashboard when authentication is successful');
test('should calculate resource generation correctly with bonuses applied');

// ❌ Bad test names
test('login test');
test('button click');
test('API call');
test('error handling');
test('resource calculation');
```

### Describe Blocks

Use consistent hierarchical organization:

```typescript
describe('ComponentName', () => {
  describe('initialization', () => {
    // Tests for component mounting, initial state
  });

  describe('user interactions', () => {
    // Tests for clicks, form submissions, keyboard events
  });

  describe('API responses', () => {
    // Tests for handling different API response scenarios
  });

  describe('error handling', () => {
    // Tests for error states and edge cases
  });

  describe('accessibility', () => {
    // Tests for keyboard navigation, ARIA attributes
  });
});
```

### Variables and Functions

```typescript
// Test setup helpers
const mockApiService = jest.fn();
const createTestUser = () => ({ id: 1, name: 'Test User' });
const setupTestDatabase = async () => { /* setup logic */ };

// Test data
const validUserData = { email: 'test@example.com', password: 'password123' };
const invalidUserData = { email: 'invalid-email', password: '' };
const mockGameState = { bases: [], resources: { metals: 1000 } };

// Page objects and selectors
const loginButton = page.getByTestId('login-submit');
const errorMessage = page.locator('[role="alert"]');
const dashboardContent = page.locator('[data-testid="dashboard"]');
```

---

## 🏗️ Test Structure and Organization

### File Organization

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx           # Unit tests
│   │   └── Button.stories.tsx        # Storybook stories
│   └── Dashboard/
│       ├── Dashboard.tsx
│       ├── Dashboard.test.tsx
│       ├── components/               # Nested components
│       └── __tests__/               # Alternative test location
│           └── integration.test.tsx
├── services/
│   ├── apiService.ts
│   ├── apiService.test.ts
│   └── __tests__/
│       └── integration.test.ts
└── utils/
    ├── calculations.ts
    └── calculations.test.ts

e2e/
├── tests/
│   ├── authentication/
│   │   ├── login.spec.ts
│   │   ├── logout.spec.ts
│   │   └── password-reset.spec.ts
│   ├── gameplay/
│   │   ├── resource-management.spec.ts
│   │   ├── base-construction.spec.ts
│   │   └── fleet-operations.spec.ts
│   └── platform/
│       ├── windows/
│       ├── mobile/
│       └── cross-browser/
├── performance/
│   ├── load-testing.spec.ts
│   ├── memory-profiling.spec.ts
│   └── startup-performance.spec.ts
├── visual/
│   ├── dashboard.visual.spec.ts
│   ├── game-interface.visual.spec.ts
│   └── responsive-design.visual.spec.ts
└── fixtures/
    ├── auth-helpers.ts
    ├── game-helpers.ts
    └── test-data.ts
```

### Test Setup Patterns

#### Global Setup (for E2E)

```typescript
// e2e/fixtures/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Start test server
  await startTestServer();
  
  // Create test database
  await setupTestDatabase();
  
  // Create base test users
  await createBaseTestUsers();
}

export default globalSetup;
```

#### Test-Specific Setup

```typescript
// Component-level setup
describe('ResourcePanel', () => {
  let mockProps: ResourcePanelProps;

  beforeEach(() => {
    mockProps = {
      resources: { metals: 1000, energy: 500 },
      onUpdate: jest.fn(),
      loading: false,
    };
  });

  test('should display resource amounts correctly', () => {
    render(<ResourcePanel {...mockProps} />);
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });
});
```

#### Custom Hooks for Common Setup

```typescript
// test-utils/useTestSetup.ts
export function useGameTestSetup() {
  const [testUser, setTestUser] = useState(null);
  const [gameState, setGameState] = useState(null);

  beforeEach(async () => {
    const user = await createTestUser();
    const state = await seedGameState(user.id);
    setTestUser(user);
    setGameState(state);
  });

  afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  return { testUser, gameState };
}
```

---

## 🎯 Code Quality Standards

### Coverage Requirements

- **Statements**: 80% minimum
- **Branches**: 75% minimum
- **Functions**: 80% minimum
- **Lines**: 80% minimum

### Test Quality Metrics

```typescript
// ✅ Good - Single, focused assertion
test('should display user name when provided', () => {
  render(<UserProfile name="John Doe" />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});

// ❌ Bad - Multiple unrelated assertions
test('user profile test', () => {
  render(<UserProfile name="John Doe" email="john@example.com" />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
  expect(screen.getByRole('button')).toBeEnabled();
  // Too many unrelated assertions
});
```

### Error Handling Standards

```typescript
// Test both positive and negative scenarios
describe('API Error Handling', () => {
  test('should handle network errors gracefully', async () => {
    // Arrange
    mockApiService.getUsers.mockRejectedValue(new Error('Network error'));

    // Act
    render(<UserList />);
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText(/error loading users/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  test('should retry failed requests with exponential backoff', async () => {
    // Arrange
    mockApiService.getUsers
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValue({ users: [] });

    // Act
    render(<UserList />);

    // Assert
    await waitFor(() => {
      expect(mockApiService.getUsers).toHaveBeenCalledTimes(3);
    });
  });
});
```

### Async Testing Patterns

```typescript
// ✅ Good - Proper async handling
test('should load user data on mount', async () => {
  const userData = { id: 1, name: 'John' };
  mockApiService.getUser.mockResolvedValue(userData);

  render(<UserProfile userId={1} />);

  await waitFor(() => {
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});

// ❌ Bad - Missing await or waitFor
test('should load user data on mount', () => {
  const userData = { id: 1, name: 'John' };
  mockApiService.getUser.mockResolvedValue(userData);

  render(<UserProfile userId={1} />);

  expect(screen.getByText('John')).toBeInTheDocument(); // May fail due to timing
});
```

---

## 💻 Platform-Specific Guidelines

### Windows Desktop Testing

```typescript
// e2e/tests/platform/windows/windows-integration.spec.ts
import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Windows Platform Integration', () => {
  test('should integrate with Windows system tray', async () => {
    const electronApp = await electron.launch({
      args: ['./packages/desktop/src/main.js']
    });

    const window = await electronApp.firstWindow();
    
    // Test Windows-specific features
    await window.evaluate(() => {
      // Access Windows-specific APIs
      return window.electronAPI?.minimizeToTray();
    });

    // Verify system tray integration
    const trayVisible = await window.evaluate(() => {
      return window.electronAPI?.isTrayVisible();
    });
    
    expect(trayVisible).toBe(true);
    
    await electronApp.close();
  });

  test('should handle Windows file system paths correctly', async () => {
    const electronApp = await electron.launch({
      args: ['./packages/desktop/src/main.js']
    });

    const window = await electronApp.firstWindow();
    
    // Test Windows path handling
    const savePath = await window.evaluate(() => {
      return window.electronAPI?.getSaveDirectory();
    });
    
    expect(savePath).toMatch(/^[A-Z]:\\/); // Windows drive letter format
    
    await electronApp.close();
  });
});
```

### Mobile PWA Testing

```typescript
// e2e/tests/mobile/mobile-interface.spec.ts
test.describe('Mobile PWA Interface', () => {
  test.use({ 
    ...devices['iPhone 12'],
    geolocation: { latitude: 37.7749, longitude: -122.4194 },
    permissions: ['geolocation']
  });

  test('should adapt interface for mobile screen size', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify mobile-specific layout
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeHidden();
    
    // Test touch interactions
    await page.tap('[data-testid="resource-panel"]');
    await expect(page.locator('[data-testid="resource-details"]')).toBeVisible();
  });

  test('should work offline with service worker', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Go offline
    await page.context().setOffline(true);
    
    // Verify offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Test cached functionality still works
    await page.click('[data-testid="cached-page-link"]');
    await expect(page.locator('[data-testid="cached-content"]')).toBeVisible();
  });
});
```

### Cross-Browser Testing

```typescript
// e2e/tests/cross-browser/compatibility.spec.ts
test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test.describe(`${browserName} compatibility`, () => {
      test.use({ browserName });

      test('should render consistently across browsers', async ({ page }) => {
        await page.goto('/dashboard');
        
        // Test core functionality
        await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
        await expect(page.locator('[data-testid="game-interface"]')).toBeVisible();
        
        // Take browser-specific screenshots
        await expect(page).toHaveScreenshot(`dashboard-${browserName}.png`);
      });

      test('should handle browser-specific features', async ({ page }) => {
        await page.goto('/settings');
        
        // Test browser-specific APIs
        const supportsNotifications = await page.evaluate(() => {
          return 'Notification' in window;
        });
        
        if (supportsNotifications) {
          await page.click('[data-testid="enable-notifications"]');
          // Test notification functionality
        }
      });
    });
  });
});
```

---

## 🎭 Mocking and Test Data

### Service Mocking Patterns

```typescript
// Mock external services
jest.mock('../services/apiService');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock with different response patterns
describe('API Service Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle successful API response', async () => {
    // Arrange
    const mockResponse = {
      data: { users: [{ id: 1, name: 'John' }] },
      status: 200
    };
    mockApiService.getUsers.mockResolvedValue(mockResponse);

    // Act
    const result = await getUserList();

    // Assert
    expect(result).toEqual(mockResponse.data);
    expect(mockApiService.getUsers).toHaveBeenCalledTimes(1);
  });

  test('should handle API error responses', async () => {
    // Arrange
    const mockError = new Error('API Error');
    mockApiService.getUsers.mockRejectedValue(mockError);

    // Act & Assert
    await expect(getUserList()).rejects.toThrow('API Error');
  });
});
```

### Test Data Factories

```typescript
// test-utils/factories.ts
export const createTestUser = (overrides: Partial<User> = {}): User => ({
  id: Math.random().toString(36).substr(2, 9),
  email: 'test@example.com',
  username: 'testuser',
  faction: 'terran',
  createdAt: new Date(),
  ...overrides,
});

export const createTestGameState = (overrides: Partial<GameState> = {}): GameState => ({
  playerId: 'test-player-id',
  resources: {
    metals: 1000,
    energy: 500,
    darkMatter: 100,
  },
  bases: [
    createTestBase({ coord: 'A00:00:00:00' }),
  ],
  fleets: [],
  research: {},
  ...overrides,
});

export const createTestBase = (overrides: Partial<Base> = {}): Base => ({
  id: Math.random().toString(36).substr(2, 9),
  coord: 'A00:00:00:00',
  name: 'Test Base',
  structures: {
    metalMine: { level: 1, production: 100 },
    energyPlant: { level: 1, production: 50 },
  },
  ...overrides,
});
```

### Dynamic Test Data

```typescript
// Generate realistic test scenarios
describe('Resource Calculations', () => {
  test.each([
    { base: 100, efficiency: 1.0, bonuses: [], expected: 100 },
    { base: 100, efficiency: 1.2, bonuses: [0.1], expected: 132 },
    { base: 100, efficiency: 1.5, bonuses: [0.1, 0.05], expected: 172.5 },
    { base: 0, efficiency: 2.0, bonuses: [1.0], expected: 0 },
  ])('should calculate resource generation correctly with base=$base, efficiency=$efficiency, bonuses=$bonuses', 
    ({ base, efficiency, bonuses, expected }) => {
      const result = calculateResourceGeneration({ base, efficiency, bonuses });
      expect(result).toBeCloseTo(expected, 2);
    }
  );
});
```

### Mock Implementation Helpers

```typescript
// test-utils/mocks.ts
export const createMockApiService = () => ({
  getUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getUserBases: jest.fn(),
  createBase: jest.fn(),
  // Add standard mock implementations
  setupSuccessScenario: function() {
    this.getUser.mockResolvedValue({ id: '1', name: 'Test User' });
    this.getUserBases.mockResolvedValue([createTestBase()]);
  },
  setupErrorScenario: function() {
    this.getUser.mockRejectedValue(new Error('User not found'));
    this.getUserBases.mockRejectedValue(new Error('Database error'));
  }
});

// Usage in tests
test('should handle user data loading', async () => {
  const mockApi = createMockApiService();
  mockApi.setupSuccessScenario();
  
  const result = await loadUserDashboard('user-1');
  expect(result.user).toBeDefined();
  expect(result.bases).toHaveLength(1);
});
```

---

## ⚠️ Error Testing and Edge Cases

### Error Boundary Testing

```typescript
// Test React error boundaries
test('should display error boundary when component throws error', () => {
  // Arrange
  const ThrowError = () => {
    throw new Error('Test error');
  };

  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

  // Act & Assert
  render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  
  consoleError.mockRestore();
});
```

### Network Error Scenarios

```typescript
// Test various network conditions
describe('Network Error Handling', () => {
  test('should handle connection timeout', async () => {
    mockApiService.getData.mockRejectedValue(new Error('TIMEOUT'));
    
    render(<DataComponent />);
    
    await waitFor(() => {
      expect(screen.getByText(/connection timeout/i)).toBeInTheDocument();
    });
  });

  test('should handle server unavailable (503)', async () => {
    mockApiService.getData.mockRejectedValue({ 
      response: { status: 503 }, 
      message: 'Service Unavailable' 
    });
    
    render(<DataComponent />);
    
    await waitFor(() => {
      expect(screen.getByText(/server temporarily unavailable/i)).toBeInTheDocument();
    });
  });

  test('should handle rate limiting (429)', async () => {
    mockApiService.getData.mockRejectedValue({ 
      response: { status: 429 }, 
      message: 'Too Many Requests' 
    });
    
    render(<DataComponent />);
    
    await waitFor(() => {
      expect(screen.getByText(/please wait before trying again/i)).toBeInTheDocument();
    });
  });
});
```

### Edge Case Testing

```typescript
describe('Edge Case Scenarios', () => {
  test('should handle extremely large numbers', () => {
    const largeResource = 999999999999999;
    const result = formatResourceDisplay(largeResource);
    expect(result).toBe('999.99T'); // Formatted to trillions
  });

  test('should handle empty or null data gracefully', () => {
    render(<BaseList bases={null} />);
    expect(screen.getByText(/no bases found/i)).toBeInTheDocument();
  });

  test('should handle concurrent user actions', async () => {
    const mockAction = jest.fn().mockResolvedValue({});
    
    // Simulate multiple rapid clicks
    render(<ActionButton onAction={mockAction} />);
    const button = screen.getByRole('button');
    
    // Fire multiple events simultaneously
    await Promise.all([
      fireEvent.click(button),
      fireEvent.click(button),
      fireEvent.click(button),
    ]);
    
    // Should only process one action (debounced/throttled)
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  test('should handle malformed API responses', async () => {
    mockApiService.getData.mockResolvedValue({ 
      malformed: 'response',
      missing: 'expected fields'
    });
    
    render(<DataComponent />);
    
    await waitFor(() => {
      expect(screen.getByText(/data format error/i)).toBeInTheDocument();
    });
  });
});
```

---

## 🚀 Performance Testing Guidelines

### Component Performance Testing

```typescript
// Test rendering performance
test('should render large data set efficiently', async () => {
  const startTime = performance.now();
  
  const largeDataSet = Array.from({ length: 1000 }, (_, i) => 
    createTestBase({ id: `base-${i}`, name: `Base ${i}` })
  );
  
  render(<BaseList bases={largeDataSet} />);
  
  await waitFor(() => {
    expect(screen.getAllByTestId('base-item')).toHaveLength(1000);
  });
  
  const endTime = performance.now();
  const renderTime = endTime - startTime;
  
  // Assert performance threshold
  expect(renderTime).toBeLessThan(1000); // Should render in < 1 second
});
```

### Memory Usage Testing

```typescript
test('should not cause memory leaks on repeated renders', () => {
  const initialMemory = performance.memory?.usedJSHeapSize || 0;
  
  // Render and unmount component multiple times
  for (let i = 0; i < 100; i++) {
    const { unmount } = render(<ExpensiveComponent data={largeDataSet} />);
    unmount();
  }
  
  // Force garbage collection (if available)
  if (global.gc) {
    global.gc();
  }
  
  const finalMemory = performance.memory?.usedJSHeapSize || 0;
  const memoryIncrease = finalMemory - initialMemory;
  
  // Memory increase should be reasonable
  expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
});
```

### API Performance Testing

```typescript
test('should complete API calls within acceptable time limits', async () => {
  const startTime = Date.now();
  
  await request(app)
    .get('/api/game/galaxy')
    .expect(200);
  
  const responseTime = Date.now() - startTime;
  
  expect(responseTime).toBeLessThan(2000); // API should respond in < 2 seconds
});
```

---

## ♿ Accessibility Testing Guidelines

### Keyboard Navigation Testing

```typescript
test('should support keyboard navigation', async () => {
  render(<NavigationMenu />);
  
  const firstMenuItem = screen.getByRole('menuitem', { name: /dashboard/i });
  firstMenuItem.focus();
  
  // Test tab navigation
  await user.keyboard('{Tab}');
  expect(screen.getByRole('menuitem', { name: /bases/i })).toHaveFocus();
  
  // Test arrow key navigation
  await user.keyboard('{ArrowDown}');
  expect(screen.getByRole('menuitem', { name: /fleets/i })).toHaveFocus();
  
  // Test Enter key activation
  await user.keyboard('{Enter}');
  expect(mockNavigate).toHaveBeenCalledWith('/fleets');
});
```

### Screen Reader Testing

```typescript
test('should provide appropriate ARIA labels and descriptions', () => {
  render(<ResourcePanel resources={{ metals: 1000, energy: 500 }} />);
  
  // Check for proper labeling
  expect(screen.getByLabelText('Metal resources: 1,000 units')).toBeInTheDocument();
  expect(screen.getByLabelText('Energy resources: 500 units')).toBeInTheDocument();
  
  // Check for live region updates
  const liveRegion = screen.getByRole('status');
  expect(liveRegion).toHaveAttribute('aria-live', 'polite');
});

test('should announce important state changes', async () => {
  render(<BuildingQueue />);
  
  // Trigger state change
  fireEvent.click(screen.getByRole('button', { name: /start construction/i }));
  
  // Check for announcement
  await waitFor(() => {
    const announcement = screen.getByRole('status');
    expect(announcement).toHaveTextContent('Construction started');
  });
});
```

### Color Contrast Testing

```typescript
test('should maintain sufficient color contrast', () => {
  render(<AlertMessage type="error" message="Something went wrong" />);
  
  const errorElement = screen.getByRole('alert');
  const styles = window.getComputedStyle(errorElement);
  
  // You would typically use a color contrast library here
  const contrast = calculateColorContrast(
    styles.backgroundColor,
    styles.color
  );
  
  expect(contrast).toBeGreaterThanOrEqual(4.5); // WCAG AA standard
});
```

---

## 🔧 Common Patterns and Examples

### Testing Custom Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useResourceManager } from '../hooks/useResourceManager';

test('should update resources when production completes', async () => {
  const { result } = renderHook(() => useResourceManager({
    initialResources: { metals: 1000, energy: 500 }
  }));
  
  expect(result.current.resources.metals).toBe(1000);
  
  act(() => {
    result.current.addProduction({ type: 'metals', amount: 100 });
  });
  
  expect(result.current.resources.metals).toBe(1100);
});
```

### Testing Context Providers

```typescript
test('should provide game state to child components', () => {
  const testGameState = createTestGameState();
  
  render(
    <GameStateProvider initialState={testGameState}>
      <ComponentThatUsesGameState />
    </GameStateProvider>
  );
  
  expect(screen.getByText('Metals: 1,000')).toBeInTheDocument();
});
```

### Testing with React Router

```typescript
test('should navigate to correct route when link is clicked', () => {
  render(
    <BrowserRouter>
      <NavigationComponent />
    </BrowserRouter>
  );
  
  fireEvent.click(screen.getByRole('link', { name: /dashboard/i }));
  
  expect(window.location.pathname).toBe('/dashboard');
});
```

### Testing Forms

```typescript
test('should submit form with valid data', async () => {
  const mockOnSubmit = jest.fn();
  
  render(<CreateBaseForm onSubmit={mockOnSubmit} />);
  
  // Fill form
  await user.type(screen.getByLabelText(/base name/i), 'New Base');
  await user.selectOptions(screen.getByLabelText(/location/i), 'A00:00:00:01');
  
  // Submit
  fireEvent.click(screen.getByRole('button', { name: /create base/i }));
  
  await waitFor(() => {
    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'New Base',
      location: 'A00:00:00:01'
    });
  });
});

test('should display validation errors for invalid form data', async () => {
  render(<CreateBaseForm onSubmit={jest.fn()} />);
  
  // Submit without filling required fields
  fireEvent.click(screen.getByRole('button', { name: /create base/i }));
  
  await waitFor(() => {
    expect(screen.getByText('Base name is required')).toBeInTheDocument();
    expect(screen.getByText('Location must be selected')).toBeInTheDocument();
  });
});
```

### Testing Real-time Features

```typescript
test('should update UI when WebSocket message is received', async () => {
  const mockWebSocket = {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
  };
  
  global.WebSocket = jest.fn(() => mockWebSocket);
  
  render(<RealTimeResourceDisplay />);
  
  // Simulate WebSocket message
  act(() => {
    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify({
        type: 'RESOURCE_UPDATE',
        data: { metals: 1500 }
      })
    });
    
    mockWebSocket.addEventListener.mock.calls
      .find(([event]) => event === 'message')[1](messageEvent);
  });
  
  await waitFor(() => {
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });
});
```

---

## ✅ Best Practices Checklist

### Before Writing Tests

- [ ] Understand the component/feature requirements
- [ ] Identify critical user journeys and edge cases
- [ ] Plan test structure and organization
- [ ] Set up necessary test data and mocks
- [ ] Consider accessibility requirements

### During Test Development

- [ ] Use descriptive test names following naming conventions
- [ ] Follow AAA pattern (Arrange, Act, Assert)
- [ ] Test behavior, not implementation details
- [ ] Keep tests independent and isolated
- [ ] Use appropriate waiting strategies for async operations
- [ ] Mock external dependencies appropriately
- [ ] Include positive, negative, and edge case scenarios

### Test Quality Review

- [ ] Tests are readable and maintainable
- [ ] Assertions are specific and meaningful
- [ ] Error messages are helpful for debugging
- [ ] Test coverage meets minimum requirements
- [ ] No test interdependencies
- [ ] Performance thresholds are reasonable
- [ ] Accessibility requirements are verified

### Integration and E2E Specific

- [ ] Test data setup and cleanup is handled properly
- [ ] Tests work reliably in CI/CD environment
- [ ] Cross-browser compatibility is verified
- [ ] Platform-specific features are tested appropriately
- [ ] Visual regression tests cover important UI changes
- [ ] Performance benchmarks are established and monitored

### Documentation

- [ ] Complex test logic is commented
- [ ] Test purpose and context are clear
- [ ] Setup requirements are documented
- [ ] Troubleshooting guidance is provided

---

## 📚 Additional Resources

### Testing Tools Documentation

- [Jest Testing Framework](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright E2E Testing](https://playwright.dev/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about/)

### Best Practice Guides

- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Effective Test Patterns](https://github.com/goldbergyoni/javascript-testing-best-practices)

### Game-Specific Testing

- [Game Testing Strategies](./game-testing-strategies.md)
- [Performance Testing Guide](./performance-testing-guide.md)
- [Cross-Platform Testing Guide](./cross-platform-testing-guide.md)

---

**Document Status**: ✅ Active  
**Next Review**: 2024-12-07  
**Owner**: QA Team  
**Contributors**: Development Team

---

For questions, updates, or contributions to these guidelines, please create an issue in the project repository or contact the QA team.

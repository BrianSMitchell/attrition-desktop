# Testing Framework Workshop Exercises

## 📋 Workshop Exercise Collection

This document contains hands-on exercises for the Attrition Testing Framework Training Program. Each exercise is designed to build practical skills and reinforce learning objectives.

---

## 🧪 Exercise 1: Unit Testing Fundamentals

### Objective
Master basic unit testing with Jest and React Testing Library

### Duration
45 minutes

### Exercise: Test the `ResourceCalculator` utility

```typescript
// src/utils/ResourceCalculator.ts - Component to test
export class ResourceCalculator {
  static calculateProduction(
    baseRate: number, 
    efficiency: number, 
    bonuses: number[] = []
  ): number {
    if (baseRate < 0 || efficiency < 0) {
      throw new Error('Base rate and efficiency must be non-negative');
    }
    
    const totalBonus = bonuses.reduce((sum, bonus) => sum + bonus, 0);
    return Math.round(baseRate * efficiency * (1 + totalBonus));
  }

  static calculateUpgradeCost(
    baseCost: number, 
    currentLevel: number, 
    multiplier: number = 1.5
  ): number {
    return Math.round(baseCost * Math.pow(multiplier, currentLevel));
  }

  static formatResource(amount: number, type: 'credits' | 'energy' | 'metal'): string {
    const units = { credits: 'C', energy: 'E', metal: 'M' };
    
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M ${units[type]}`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K ${units[type]}`;
    }
    return `${amount} ${units[type]}`;
  }
}
```

### Your Task
Create comprehensive unit tests for the `ResourceCalculator` class.

### Test Requirements
1. Test `calculateProduction` with various inputs
2. Test error cases with negative values
3. Test `calculateUpgradeCost` progression
4. Test `formatResource` formatting logic
5. Test edge cases (zero values, very large numbers)

### Solution Template
```typescript
// src/utils/__tests__/ResourceCalculator.test.ts
import { ResourceCalculator } from '../ResourceCalculator';

describe('ResourceCalculator', () => {
  describe('calculateProduction', () => {
    test('should calculate basic production correctly', () => {
      // Your implementation here
    });

    test('should apply bonuses correctly', () => {
      // Your implementation here
    });

    test('should throw error for negative values', () => {
      // Your implementation here
    });
  });

  describe('calculateUpgradeCost', () => {
    test('should calculate upgrade costs with exponential growth', () => {
      // Your implementation here
    });
  });

  describe('formatResource', () => {
    test('should format small amounts without abbreviation', () => {
      // Your implementation here
    });

    test('should format thousands with K suffix', () => {
      // Your implementation here
    });

    test('should format millions with M suffix', () => {
      // Your implementation here
    });
  });
});
```

---

## 🔗 Exercise 2: Integration Testing Challenge

### Objective
Learn API integration testing with authentication and database operations

### Duration
75 minutes

### Exercise: Test the Empire Management API

```typescript
// Mock API endpoints to test
interface EmpireEndpoints {
  'POST /api/empires': {
    body: { name: string; faction: string; userId: string };
    response: { empire: Empire; success: boolean };
  };
  'GET /api/empires/:id': {
    response: { empire: Empire; success: boolean };
  };
  'PUT /api/empires/:id/resources': {
    body: { resources: ResourceUpdate };
    response: { empire: Empire; success: boolean };
  };
  'DELETE /api/empires/:id': {
    response: { success: boolean; message: string };
  };
}
```

### Your Task
Create integration tests that cover:

1. **Empire Creation**
   - Valid empire creation
   - Duplicate name handling
   - Invalid data validation
   - Authentication requirements

2. **Empire Retrieval**
   - Get existing empire
   - Handle non-existent empire
   - Authorization checks

3. **Resource Management**
   - Update empire resources
   - Validate resource constraints
   - Handle concurrent updates

4. **Empire Deletion**
   - Successful deletion
   - Cleanup of related data
   - Authorization validation

### Test Template
```typescript
// tests/integration/empire.integration.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { setupTestDb, cleanupTestDb } from '../utils/database';
import { createTestUser, getAuthToken } from '../utils/auth';

describe('Empire API Integration', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    await setupTestDb();
    const testUser = await createTestUser();
    testUserId = testUser.id;
    authToken = await getAuthToken(testUser.id);
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('POST /api/empires', () => {
    test('should create empire with valid data', async () => {
      // Implement test
    });

    test('should reject duplicate empire names', async () => {
      // Implement test
    });

    test('should validate required fields', async () => {
      // Implement test
    });
  });

  // Add more test suites...
});
```

---

## 🎭 Exercise 3: End-to-End Testing Mastery

### Objective
Build comprehensive E2E tests using Playwright with page objects

### Duration
90 minutes

### Exercise: Test Complete Game Onboarding Flow

### User Journey to Test
1. User registration and email verification
2. Empire creation and customization
3. Tutorial completion
4. First base establishment
5. Initial resource generation
6. First building construction

### Your Task
Create a complete E2E test suite with:

1. **Page Object Models** for each screen
2. **Test data management** for different scenarios  
3. **Visual regression testing** for key screens
4. **Performance benchmarks** for loading times

### Page Object Template
```typescript
// e2e/pages/RegistrationPage.ts
import { Page, Locator } from '@playwright/test';

export class RegistrationPage {
  private page: Page;
  
  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly usernameInput: Locator;
  readonly registerButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-testid="register-email"]');
    this.passwordInput = page.locator('[data-testid="register-password"]');
    this.confirmPasswordInput = page.locator('[data-testid="register-confirm-password"]');
    this.usernameInput = page.locator('[data-testid="register-username"]');
    this.registerButton = page.locator('[data-testid="register-submit"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async goto() {
    await this.page.goto('/register');
  }

  async fillRegistrationForm(userData: {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
  }) {
    // Implement form filling
  }

  async submitRegistration() {
    // Implement form submission
  }

  async waitForSuccessfulRegistration() {
    // Implement success verification
  }
}
```

### E2E Test Template
```typescript
// e2e/tests/onboarding.spec.ts
import { test, expect } from '@playwright/test';
import { RegistrationPage } from '../pages/RegistrationPage';
import { EmpireSetupPage } from '../pages/EmpireSetupPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TutorialPage } from '../pages/TutorialPage';

test.describe('Game Onboarding Flow', () => {
  test('should complete full onboarding journey', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    const empireSetupPage = new EmpireSetupPage(page);
    const tutorialPage = new TutorialPage(page);
    const dashboardPage = new DashboardPage(page);

    // Step 1: Registration
    await registrationPage.goto();
    // Implement registration steps

    // Step 2: Empire Setup
    // Implement empire creation

    // Step 3: Tutorial
    // Implement tutorial completion

    // Step 4: First Base
    // Implement base creation

    // Step 5: Verify Success
    // Implement final verification
  });

  test('should handle registration errors gracefully', async ({ page }) => {
    // Implement error scenario testing
  });

  test('should maintain performance benchmarks', async ({ page }) => {
    // Implement performance testing
  });
});
```

---

## 🎮 Exercise 4: Game Simulation Advanced Scenario

### Objective
Master the game simulation framework with complex multi-player scenarios

### Duration
120 minutes

### Exercise: Economic Warfare Simulation

### Scenario Description
Create a simulation testing economic competition between three empires with different strategies:

1. **Aggressive Expansionist**: Fast expansion, military focus
2. **Economic Powerhouse**: Resource generation focus, trade emphasis
3. **Technology Leader**: Research focus, advanced buildings

### Your Task
Build a comprehensive simulation that tests:

1. **Resource Competition** - Limited resource availability
2. **Trade Dynamics** - Inter-empire trading effects
3. **Military Pressure** - Defense vs expansion balance
4. **Technology Advantages** - Research benefits validation
5. **Economic Stability** - Long-term sustainability

### Simulation Template
```typescript
// tests/simulation/economic-warfare.test.ts
import {
  GameScenarioBuilder,
  GameAssertions,
  GameSimulationEngine
} from '../../src/test-utils/game-simulation-framework';

describe('Economic Warfare Simulation', () => {
  test('should handle three-way economic competition', async () => {
    const scenario = new GameScenarioBuilder({
      debug: true,
      startingResources: {
        credits: 50000,
        energy: 10000,
        metal: 5000,
        research: 1000
      },
      maxSimulationTime: 300000 // 5 minutes
    });

    // Create competing empires
    const expansionist = await scenario.addEmpire('expansionist', [
      'A00:00:00:00', 'A00:00:00:01'
    ]);
    
    const economist = await scenario.addEmpire('economist', [
      'A00:00:00:10'
    ]);
    
    const technologist = await scenario.addEmpire('technologist', [
      'A00:00:00:20'
    ]);

    // Setup initial strategies
    await setupExpansionistStrategy(scenario, expansionist);
    await setupEconomistStrategy(scenario, economist);
    await setupTechnologistStrategy(scenario, technologist);

    // Add competitive assertions
    scenario
      .addAssertion(GameAssertions.noNegativeResources(expansionist.empireId))
      .addAssertion(GameAssertions.noNegativeResources(economist.empireId))
      .addAssertion(GameAssertions.noNegativeResources(technologist.empireId))
      .assertResourceMinimum(expansionist.empireId, 'credits', 25000)
      .assertResourceMinimum(economist.empireId, 'credits', 40000)
      .assertResourceMinimum(technologist.empireId, 'credits', 30000);

    // Add custom competitive metrics
    scenario.addAssertion({
      type: 'custom',
      description: 'Economic balance should be maintained',
      condition: (state) => {
        // Implement balance validation logic
        return true;
      },
      required: true
    });

    // Run competitive simulation
    const result = await scenario.run(240000); // 4 minutes

    // Validate results
    expect(result.success).toBe(true);
    expect(result.finalState).toHaveLength(3);
    
    // Verify each strategy achieved its goals
    await validateExpansionistResults(result, expansionist.empireId);
    await validateEconomistResults(result, economist.empireId);
    await validateTechnologistResults(result, technologist.empireId);
  });

  test('should handle resource scarcity scenarios', async () => {
    // Implement scarcity testing
  });

  test('should validate economic model accuracy', async () => {
    // Implement model validation
  });
});

// Helper functions for strategy setup
async function setupExpansionistStrategy(
  scenario: GameScenarioBuilder,
  empire: EmpireTestState
) {
  // Focus on military and expansion
  await scenario.addBuilding(empire.empireId, 'A00:00:00:00', 'military_factories', 5);
  await scenario.addBuilding(empire.empireId, 'A00:00:00:00', 'shipyards', 3);
  await scenario.addBuilding(empire.empireId, 'A00:00:00:01', 'colonial_centers', 2);
  
  // Start expansion research
  const engine = scenario.getEngine();
  await engine.startTechnology(empire.empireId, 'A00:00:00:00', 'colonial_technology');
}

async function setupEconomistStrategy(
  scenario: GameScenarioBuilder,
  empire: EmpireTestState
) {
  // Focus on resource generation and trade
  await scenario.addBuilding(empire.empireId, 'A00:00:00:10', 'trade_centers', 4);
  await scenario.addBuilding(empire.empireId, 'A00:00:00:10', 'resource_extractors', 6);
  await scenario.addBuilding(empire.empireId, 'A00:00:00:10', 'credit_banks', 3);
  
  // Start economic research
  const engine = scenario.getEngine();
  await engine.startTechnology(empire.empireId, 'A00:00:00:10', 'economic_optimization');
}

async function setupTechnologistStrategy(
  scenario: GameScenarioBuilder,
  empire: EmpireTestState
) {
  // Focus on research and advanced technology
  await scenario.addBuilding(empire.empireId, 'A00:00:00:20', 'research_labs', 8);
  await scenario.addBuilding(empire.empireId, 'A00:00:00:20', 'technology_centers', 4);
  await scenario.addBuilding(empire.empireId, 'A00:00:00:20', 'advanced_facilities', 2);
  
  // Start multiple research projects
  const engine = scenario.getEngine();
  await engine.startTechnology(empire.empireId, 'A00:00:00:20', 'advanced_research');
  await engine.startTechnology(empire.empireId, 'A00:00:00:20', 'quantum_computing');
}

// Validation functions
async function validateExpansionistResults(
  result: GameScenarioResult,
  empireId: string
) {
  const empire = result.finalState.find(s => s.empireId === empireId);
  expect(empire).toBeDefined();
  expect(empire!.territories.length).toBeGreaterThanOrEqual(3); // Should have expanded
  expect(empire!.buildings.filter(b => b.buildingKey.includes('military')).length).toBeGreaterThan(5);
}

async function validateEconomistResults(
  result: GameScenarioResult,
  empireId: string
) {
  const empire = result.finalState.find(s => s.empireId === empireId);
  expect(empire).toBeDefined();
  expect(empire!.resources.credits).toBeGreaterThan(60000); // Should have high credits
  expect(empire!.buildings.filter(b => b.buildingKey.includes('trade')).length).toBeGreaterThan(0);
}

async function validateTechnologistResults(
  result: GameScenarioResult,
  empireId: string
) {
  const empire = result.finalState.find(s => s.empireId === empireId);
  expect(empire).toBeDefined();
  expect(empire!.technologies.size).toBeGreaterThan(3); // Should have multiple techs
  expect(empire!.buildings.filter(b => b.buildingKey.includes('research')).length).toBeGreaterThan(6);
}
```

---

## 🎯 Exercise 5: Test Debugging Challenge

### Objective
Master debugging skills for complex test failures

### Duration
60 minutes

### Exercise: Debug Failing Test Suite

### Scenario
You've inherited a failing test suite. Your task is to identify and fix all issues.

### Failing Test Code
```typescript
// Intentionally broken test - find and fix all issues
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameDashboard } from '../GameDashboard';

describe('GameDashboard', () => {
  test('should display empire information', async () => {
    const mockEmpire = {
      name: 'Test Empire',
      resources: { credits: 1000, energy: 500 },
      territories: ['A00:00:00:00']
    };

    render(<GameDashboard empire={mockEmpire} />);

    // Issue 1: Missing await
    expect(screen.getByText('Test Empire')).toBeInTheDocument();
    
    // Issue 2: Incorrect query
    expect(screen.getByText('1000 credits')).toBeInTheDocument();
    
    // Issue 3: Async operation without proper waiting
    fireEvent.click(screen.getByText('Refresh'));
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  test('should handle resource updates', () => {
    const mockOnUpdate = jest.fn();
    const mockEmpire = {
      name: 'Test Empire',
      resources: { credits: 1000 }
    };

    render(<GameDashboard empire={mockEmpire} onUpdate={mockOnUpdate} />);

    // Issue 4: Missing await for async operation
    fireEvent.click(screen.getByRole('button', { name: /update resources/i }));
    
    // Issue 5: Incorrect expectation
    expect(mockOnUpdate).toHaveBeenCalledWith({ credits: 1001 });
  });

  test('should display loading state', () => {
    // Issue 6: Missing required props
    render(<GameDashboard loading={true} />);
    
    // Issue 7: Incorrect loading check
    expect(screen.getByText('Loading...')).toBeVisible();
  });
});
```

### Your Task
1. **Identify all issues** in the failing test
2. **Fix each issue** with proper explanation
3. **Improve test reliability** and maintainability
4. **Add missing test cases** for complete coverage

### Debugging Checklist
- [ ] Check async operations have proper await/waitFor
- [ ] Verify component props are complete and correct
- [ ] Ensure queries match actual DOM structure  
- [ ] Validate mock expectations match actual behavior
- [ ] Check for proper setup and teardown
- [ ] Look for timing issues and race conditions

---

## 📊 Exercise 6: Performance Testing Workshop

### Objective
Learn performance testing and optimization techniques

### Duration
90 minutes

### Exercise: Dashboard Performance Optimization

### Performance Requirements
- **Load Time**: Dashboard should load in < 2 seconds
- **Render Time**: Component updates should complete in < 100ms
- **Memory Usage**: Should not exceed 50MB for dashboard
- **Bundle Size**: JavaScript bundle should be < 500KB

### Your Task
Create performance tests and optimize the dashboard component.

### Performance Test Template
```typescript
// tests/performance/dashboard-performance.test.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard Performance', () => {
  test('should meet load time requirements', async ({ page }) => {
    // Start performance monitoring
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    
    // Wait for critical content
    await expect(page.locator('[data-testid="dashboard-loaded"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Verify performance requirement
    expect(loadTime).toBeLessThan(2000);
    
    // Measure Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Implementation for measuring vitals
        resolve({
          fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
          lcp: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime
        });
      });
    });
    
    expect(vitals.fcp).toBeLessThan(1000);
    expect(vitals.lcp).toBeLessThan(1500);
  });

  test('should handle large dataset efficiently', async ({ page }) => {
    // Set up large dataset
    await page.evaluate(() => {
      window.testData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Empire ${i}`,
        resources: { credits: Math.random() * 10000 }
      }));
    });

    const renderStart = Date.now();
    
    await page.goto('/dashboard?dataset=large');
    await page.waitForSelector('[data-testid="empire-list-loaded"]');
    
    const renderTime = Date.now() - renderStart;
    expect(renderTime).toBeLessThan(3000);
  });

  test('should not have memory leaks', async ({ page }) => {
    // Implementation for memory leak detection
  });
});
```

---

## 🏆 Final Capstone Exercise

### Objective
Apply all learned skills in a comprehensive testing project

### Duration
4 hours (team project)

### Project: Diplomacy System Testing

### System Overview
The diplomacy system allows empires to:
- Form alliances and trade agreements
- Negotiate peace treaties
- Share technology and resources
- Coordinate military actions

### Your Mission
Create a complete testing solution including:

1. **Unit Tests** for diplomacy logic
2. **Integration Tests** for API endpoints
3. **E2E Tests** for user workflows
4. **Game Simulation** for complex scenarios
5. **Performance Tests** for system load
6. **Documentation** for future maintainers

### Deliverables
- Complete test suite with > 90% coverage
- Performance benchmarks and optimization
- User guide for diplomacy testing
- Presentation of testing approach

### Success Criteria
- All tests pass consistently
- Performance requirements are met
- Code is maintainable and well-documented
- Team demonstrates testing expertise

---

**Workshop Exercises Status**: ✅ Active  
**Last Updated**: 2024-09-07  
**Difficulty Levels**: Beginner to Expert  
**Estimated Total Time**: 8-12 hours

---

For questions about these exercises or additional support, contact the training team or visit the testing help channel.

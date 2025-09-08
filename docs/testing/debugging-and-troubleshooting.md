# Testing Debugging and Troubleshooting Guide

## 📋 Table of Contents

- [Introduction](#introduction)
- [Quick Diagnosis Guide](#quick-diagnosis-guide)
- [Unit Test Debugging](#unit-test-debugging)
- [Integration Test Debugging](#integration-test-debugging)
- [End-to-End Test Debugging](#end-to-end-test-debugging)
- [Performance Test Debugging](#performance-test-debugging)
- [Visual Regression Test Debugging](#visual-regression-test-debugging)
- [Platform-Specific Issues](#platform-specific-issues)
- [CI/CD Pipeline Debugging](#cicd-pipeline-debugging)
- [Environment and Infrastructure Issues](#environment-and-infrastructure-issues)
- [Common Error Patterns](#common-error-patterns)
- [Debugging Tools and Techniques](#debugging-tools-and-techniques)
- [Performance Debugging](#performance-debugging)
- [Test Data and Mock Issues](#test-data-and-mock-issues)
- [Escalation and Support](#escalation-and-support)

---

## 🎯 Introduction

This guide provides comprehensive troubleshooting procedures for the Attrition testing infrastructure. Whether you're dealing with flaky tests, CI/CD failures, or performance issues, this document will help you diagnose and resolve problems quickly.

### When to Use This Guide

- Tests are failing unexpectedly
- CI/CD pipeline is broken
- Tests are running slowly or timing out
- Visual regression tests are producing false positives
- Test environment setup is failing
- Mock services are not behaving as expected

### Quick Reference

| Issue Type | First Steps | Common Causes |
|------------|-------------|---------------|
| **Unit Test Failure** | Check mock setup, verify component props | Incorrect mocks, missing dependencies |
| **E2E Test Timeout** | Check element selectors, verify server status | Slow network, changed UI elements |
| **CI/CD Failure** | Check logs, verify environment variables | Missing secrets, dependency issues |
| **Visual Regression** | Review screenshots, check for UI changes | Timing issues, font loading, animations |
| **Performance Issues** | Profile test execution, check resource usage | Memory leaks, inefficient queries |

---

## 🔍 Quick Diagnosis Guide

### 1. Immediate Checks (< 5 minutes)

```bash
# Check if basic test commands work
npm test
npm run test:unit
npm run test:e2e

# Check current Git status
git status
git log --oneline -5

# Verify environment
node --version
npm --version
echo $NODE_ENV
```

### 2. Common Quick Fixes

```bash
# Clear caches and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear test caches
npm run test -- --clearCache
rm -rf .jest-cache

# Reset E2E test state
rm -rf e2e/test-results
rm -rf e2e/test-output
npx playwright install
```

### 3. Check Recent Changes

```bash
# Compare with last working commit
git diff HEAD~1 

# Check recent commits that might affect tests
git log --grep="test" --grep="spec" --oneline -10

# Check if specific files changed
git diff HEAD~1 -- "**/*.test.ts" "**/*.spec.ts" "**/playwright.config.ts"
```

---

## 🧪 Unit Test Debugging

### Common Unit Test Failures

#### 1. Mock Setup Issues

**Symptom**: Tests fail with "Cannot read property" or "Function not mocked"

**Diagnosis**:
```typescript
// Check if mocks are properly configured
console.log('Mock status:', jest.isMockFunction(mockApiService.getUsers));
console.log('Mock calls:', mockApiService.getUsers.mock.calls);
```

**Solutions**:
```typescript
// ✅ Proper mock setup
jest.mock('../services/apiService');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Reset mocks if needed
beforeEach(() => {
  jest.resetAllMocks();
});
```

#### 2. Async/Await Issues

**Symptom**: Tests pass sometimes, fail other times. "Act" warnings in console.

**Diagnosis**:
```typescript
// Add debugging to see async timing
test('debug async issue', async () => {
  console.log('Before render');
  render(<Component />);
  console.log('After render');
  
  console.log('Before waitFor');
  await waitFor(() => {
    console.log('Inside waitFor');
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
  console.log('After waitFor');
});
```

**Solutions**:
```typescript
// ✅ Proper async handling
test('should load data correctly', async () => {
  mockApiService.getData.mockResolvedValue({ data: 'test' });
  
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});

// ✅ Use act() for state updates
test('should update state correctly', async () => {
  const { result } = renderHook(() => useCustomHook());
  
  await act(async () => {
    result.current.updateValue('new value');
  });
  
  expect(result.current.value).toBe('new value');
});
```

#### 3. DOM Query Issues

**Symptom**: "Unable to find an element" or "TestingLibraryElementError"

**Diagnosis**:
```typescript
// Debug what's actually in the DOM
test('debug DOM issue', () => {
  const { debug } = render(<Component />);
  debug(); // Prints current DOM structure
  
  // Or query and log specific elements
  const elements = screen.queryAllByText(/search term/i);
  console.log('Found elements:', elements.length);
  
  // Check if element exists with different query
  console.log('By role:', screen.queryByRole('button'));
  console.log('By testid:', screen.queryByTestId('component'));
});
```

**Solutions**:
```typescript
// ✅ Use more robust queries
// Instead of getByText (throws immediately)
const element = screen.queryByText('text');
if (!element) {
  console.log('Element not found, DOM structure:', container.innerHTML);
}

// ✅ Use waitFor for elements that load asynchronously
await waitFor(() => {
  expect(screen.getByText('Async content')).toBeInTheDocument();
});

// ✅ Use data-testid for reliable queries
screen.getByTestId('unique-component-id');
```

### Unit Test Debugging Tools

#### 1. Jest Debug Mode

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Run specific test file
npm test -- --testNamePattern="specific test" src/components/Button.test.tsx
```

#### 2. React Testing Library Debug

```typescript
// Debug rendered component
const { debug } = render(<Component />);
debug(); // Full DOM
debug(screen.getByTestId('specific-element')); // Specific element
```

#### 3. Console Debugging

```typescript
test('debug component state', () => {
  const mockProps = { onClick: jest.fn() };
  render(<Button {...mockProps} />);
  
  // Debug props
  console.log('Props passed:', mockProps);
  
  // Debug mock calls
  fireEvent.click(screen.getByRole('button'));
  console.log('Mock called with:', mockProps.onClick.mock.calls);
});
```

---

## 🔗 Integration Test Debugging

### API Integration Issues

#### 1. Database Connection Problems

**Symptom**: "Connection refused" or "Database not found"

**Diagnosis**:
```bash
# Check database status
docker ps | grep database
docker logs attrition-test-db

# Check connection string
echo $TEST_DATABASE_URL
```

**Solutions**:
```bash
# Restart test database
docker-compose down
docker-compose up -d test-db

# Recreate test database
npm run test:db:reset
npm run test:db:seed
```

#### 2. Authentication Issues

**Symptom**: "401 Unauthorized" or "JWT token invalid"

**Diagnosis**:
```typescript
// Debug auth token creation
test('debug auth issue', async () => {
  const testUser = await createTestUser();
  const token = await getAuthToken(testUser.id);
  
  console.log('User ID:', testUser.id);
  console.log('Token:', token);
  console.log('Token valid:', await verifyToken(token));
});
```

**Solutions**:
```typescript
// ✅ Ensure fresh tokens for each test
beforeEach(async () => {
  testUser = await createTestUser();
  authToken = await getAuthToken(testUser.id);
});

// ✅ Check token expiration
const createAuthToken = (userId: string) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' } // Ensure sufficient time for tests
  );
};
```

#### 3. API Response Format Issues

**Symptom**: Tests fail with "Cannot read property of undefined"

**Diagnosis**:
```typescript
test('debug API response', async () => {
  const response = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${authToken}`);
  
  console.log('Status:', response.status);
  console.log('Headers:', response.headers);
  console.log('Body:', response.body);
});
```

**Solutions**:
```typescript
// ✅ Validate response structure
test('should return valid user data', async () => {
  const response = await request(app)
    .get('/api/users')
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200);
  
  // Validate response structure
  expect(response.body).toHaveProperty('users');
  expect(Array.isArray(response.body.users)).toBe(true);
  
  if (response.body.users.length > 0) {
    expect(response.body.users[0]).toHaveProperty('id');
    expect(response.body.users[0]).toHaveProperty('username');
  }
});
```

---

## 🎭 End-to-End Test Debugging

### Playwright E2E Issues

#### 1. Element Not Found

**Symptom**: "Element not found" or "Timeout waiting for element"

**Diagnosis**:
```typescript
test('debug element issue', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Take screenshot to see current state
  await page.screenshot({ path: './debug-screenshot.png' });
  
  // List all elements on page
  const allElements = await page.locator('*').all();
  console.log('Total elements:', allElements.length);
  
  // Check if element exists with different selector
  const byTestId = page.locator('[data-testid="target-element"]');
  const byRole = page.locator('button:has-text("Submit")');
  const byText = page.locator('text="Expected Text"');
  
  console.log('By testid count:', await byTestId.count());
  console.log('By role count:', await byRole.count());
  console.log('By text count:', await byText.count());
});
```

**Solutions**:
```typescript
// ✅ Wait for element to be ready
await page.waitForSelector('[data-testid="dashboard"]');
await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

// ✅ Use more robust selectors
// Instead of text-based selectors (fragile)
await page.click('text="Submit"');

// Use data-testid (robust)
await page.click('[data-testid="submit-button"]');

// ✅ Add explicit waits for dynamic content
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000); // Only as last resort
```

#### 2. Timing Issues

**Symptom**: Tests pass locally but fail in CI, intermittent failures

**Diagnosis**:
```typescript
test('debug timing issue', async ({ page }) => {
  console.log('Starting test at:', new Date().toISOString());
  
  await page.goto('/dashboard');
  console.log('Page loaded at:', new Date().toISOString());
  
  // Add timestamps to identify slow operations
  const start = Date.now();
  await page.click('[data-testid="load-data-button"]');
  console.log('Button clicked, time:', Date.now() - start);
  
  await page.waitForSelector('[data-testid="data-loaded"]');
  console.log('Data loaded, total time:', Date.now() - start);
});
```

**Solutions**:
```typescript
// ✅ Use proper waiting strategies
await page.waitForLoadState('domcontentloaded');
await page.waitForLoadState('networkidle');

// ✅ Wait for specific conditions
await page.waitForSelector('[data-testid="content"]', { state: 'visible' });
await page.waitForFunction(() => document.querySelectorAll('.item').length > 0);

// ✅ Configure timeouts appropriately
test.setTimeout(60000); // 60 seconds for slow tests

await expect(page.locator('[data-testid="slow-element"]')).toBeVisible({
  timeout: 30000
});
```

#### 3. Authentication State Issues

**Symptom**: Tests fail with "Not logged in" or "Unauthorized"

**Diagnosis**:
```typescript
test('debug auth state', async ({ page }) => {
  await page.goto('/login');
  
  // Check if already logged in
  const dashboardVisible = await page.locator('[data-testid="dashboard"]').isVisible();
  console.log('Already logged in:', dashboardVisible);
  
  // Check local storage
  const authToken = await page.evaluate(() => localStorage.getItem('auth-token'));
  console.log('Auth token:', authToken ? 'present' : 'missing');
  
  // Check cookies
  const cookies = await page.context().cookies();
  console.log('Cookies:', cookies.map(c => c.name));
});
```

**Solutions**:
```typescript
// ✅ Clear auth state before each test
test.beforeEach(async ({ page }) => {
  // Clear storage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Clear cookies
  await page.context().clearCookies();
});

// ✅ Use proper login helper
async function loginUser(page: Page, credentials: UserCredentials) {
  await page.goto('/login');
  
  await page.fill('[data-testid="email"]', credentials.email);
  await page.fill('[data-testid="password"]', credentials.password);
  
  await Promise.all([
    page.waitForURL('**/dashboard'),
    page.click('[data-testid="login-submit"]')
  ]);
  
  // Verify login was successful
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}
```

### Electron-Specific Issues

#### 1. App Launch Problems

**Symptom**: "Failed to launch Electron app" or timeout on launch

**Diagnosis**:
```bash
# Check Electron installation
npx electron --version

# Verify app entry point exists
ls -la packages/desktop/src/main.js

# Check for build issues
npm run build:electron
```

**Solutions**:
```typescript
// ✅ Proper Electron launch configuration
const electronApp = await electron.launch({
  args: [path.join(__dirname, '../packages/desktop/src/main.js')],
  timeout: 120000, // 2 minute timeout
  executablePath: process.env.ELECTRON_PATH, // If custom path needed
});
```

#### 2. Window Management Issues

**Symptom**: "Cannot get window" or window operations fail

**Diagnosis**:
```typescript
test('debug window issue', async () => {
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '../packages/desktop/src/main.js')]
  });
  
  console.log('App launched');
  
  // Check available windows
  const windows = electronApp.windows();
  console.log('Available windows:', windows.length);
  
  // Wait for main window
  const window = await electronApp.firstWindow();
  console.log('Got first window');
  
  // Check window state
  console.log('Window URL:', await window.url());
  console.log('Window title:', await window.title());
  
  await electronApp.close();
});
```

---

## 📊 Performance Test Debugging

### Slow Test Execution

#### 1. Identify Bottlenecks

```bash
# Run tests with timing information
npm test -- --verbose --passWithNoTests

# Profile specific test
npm test -- --testNamePattern="slow test" --verbose
```

#### 2. Memory Usage Issues

**Diagnosis**:
```typescript
test('debug memory usage', async () => {
  if (process.env.NODE_ENV === 'test' && global.gc) {
    // Force garbage collection
    global.gc();
  }
  
  const initialMemory = process.memoryUsage();
  console.log('Initial memory:', initialMemory);
  
  // Run test operations
  const largeArray = Array.from({ length: 100000 }, (_, i) => ({ id: i }));
  
  const afterOperationMemory = process.memoryUsage();
  console.log('After operation memory:', afterOperationMemory);
  
  // Cleanup
  largeArray.length = 0;
  
  if (global.gc) {
    global.gc();
  }
  
  const finalMemory = process.memoryUsage();
  console.log('Final memory:', finalMemory);
});
```

**Solutions**:
```typescript
// ✅ Optimize test data creation
// Instead of creating large datasets in every test
const createLargeDataset = () => Array.from({ length: 10000 }, createTestItem);

// Create once and reuse
let sharedDataset: TestItem[];
beforeAll(() => {
  sharedDataset = createLargeDataset();
});

// ✅ Clean up resources
afterEach(() => {
  // Clear large objects
  jest.clearAllMocks();
  
  // Force garbage collection in test environment
  if (global.gc) {
    global.gc();
  }
});
```

#### 3. Database Performance Issues

**Diagnosis**:
```typescript
test('debug database performance', async () => {
  const start = Date.now();
  
  // Monitor individual operations
  console.log('Starting database operations...');
  
  const createTime = Date.now();
  const user = await createTestUser();
  console.log('User creation took:', Date.now() - createTime, 'ms');
  
  const queryTime = Date.now();
  const userData = await getUserById(user.id);
  console.log('Query took:', Date.now() - queryTime, 'ms');
  
  const cleanupTime = Date.now();
  await deleteTestUser(user.id);
  console.log('Cleanup took:', Date.now() - cleanupTime, 'ms');
  
  console.log('Total test time:', Date.now() - start, 'ms');
});
```

**Solutions**:
```bash
# Optimize test database
# Use in-memory database for unit tests
TEST_DATABASE_URL=sqlite::memory: npm test

# Use connection pooling
# Configure database pool size in test environment
```

---

## 📷 Visual Regression Test Debugging

### Screenshot Comparison Issues

#### 1. Font Rendering Differences

**Symptom**: Screenshots differ between environments due to font rendering

**Diagnosis**:
```typescript
test('debug font rendering', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Check loaded fonts
  const fonts = await page.evaluate(() => {
    return document.fonts.ready.then(() => {
      const loadedFonts = [];
      document.fonts.forEach(font => {
        loadedFonts.push(`${font.family} ${font.style} ${font.weight}`);
      });
      return loadedFonts;
    });
  });
  
  console.log('Loaded fonts:', fonts);
  
  // Take screenshot after fonts are loaded
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: './debug-fonts.png' });
});
```

**Solutions**:
```typescript
// ✅ Wait for fonts to load
await page.waitForFunction(() => document.fonts.ready);

// ✅ Use consistent font configuration
// In playwright.config.ts
use: {
  screenshot: 'only-on-failure',
  // Disable font anti-aliasing for consistency
  launchOptions: {
    args: ['--disable-font-subpixel-positioning']
  }
}
```

#### 2. Animation and Timing Issues

**Symptom**: Screenshots capture animations mid-transition

**Diagnosis**:
```typescript
test('debug animations', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Check for running animations
  const animationsRunning = await page.evaluate(() => {
    return document.getAnimations().length > 0;
  });
  
  console.log('Animations running:', animationsRunning);
  
  // Wait for animations to complete
  await page.waitForFunction(() => document.getAnimations().length === 0);
  
  await page.screenshot({ path: './debug-no-animations.png' });
});
```

**Solutions**:
```typescript
// ✅ Disable animations in tests
// In playwright.config.ts
use: {
  screenshot: 'only-on-failure',
  // Disable animations
  reducedMotion: 'reduce'
}

// ✅ Wait for animations to complete
await page.waitForFunction(() => document.getAnimations().length === 0);

// ✅ Take screenshots with animation disabled
await expect(page).toHaveScreenshot('component.png', {
  animations: 'disabled'
});
```

#### 3. Dynamic Content Issues

**Symptom**: Screenshots fail due to changing timestamps or counters

**Solutions**:
```typescript
// ✅ Mask dynamic content
await expect(page).toHaveScreenshot('dashboard.png', {
  mask: [
    page.locator('[data-testid="timestamp"]'),
    page.locator('[data-testid="live-counter"]'),
    page.locator('.loading-spinner')
  ]
});

// ✅ Set fixed time in tests
await page.addInitScript(() => {
  // Mock Date.now() to return fixed timestamp
  const mockNow = new Date('2024-01-01T00:00:00.000Z').getTime();
  Date.now = () => mockNow;
});
```

---

## 💻 Platform-Specific Issues

### Windows Testing Issues

#### 1. Path Separator Problems

**Symptom**: Tests fail on Windows due to path issues

**Diagnosis**:
```typescript
// Check path handling
console.log('Platform:', process.platform);
console.log('Path separator:', path.sep);
console.log('Test path:', path.join('e2e', 'tests', 'test.spec.ts'));
```

**Solutions**:
```typescript
// ✅ Use path.join() for cross-platform paths
const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-data.json');

// ✅ Use forward slashes in Playwright selectors
const screenshotPath = 'screenshots/test.png'; // Not 'screenshots\\test.png'
```

#### 2. File Permission Issues

**Symptom**: "EACCES" or "Permission denied" errors on Windows

**Solutions**:
```bash
# Run tests as administrator (if needed)
# Or check file permissions

# Clean up locked files
taskkill /F /IM node.exe
taskkill /F /IM electron.exe
```

### macOS Testing Issues

#### 1. Quarantine Issues

**Symptom**: "App is damaged and can't be opened" on macOS

**Solutions**:
```bash
# Remove quarantine attribute
xattr -r -d com.apple.quarantine /path/to/app

# Or in CI
- name: Remove quarantine
  run: xattr -r -d com.apple.quarantine ./dist/mac/Attrition.app
```

### Linux Testing Issues

#### 1. Display Server Issues

**Symptom**: "Cannot connect to X display" in headless environment

**Solutions**:
```bash
# Install virtual display
sudo apt-get install xvfb

# Run tests with virtual display
xvfb-run -a npm run test:e2e

# Or in CI
- name: Run E2E tests
  run: xvfb-run -a npm run test:e2e
```

---

## 🔄 CI/CD Pipeline Debugging

### GitHub Actions Issues

#### 1. Environment Variables Missing

**Symptom**: Tests fail with "undefined" environment variables

**Diagnosis**:
```yaml
# Add debugging step in workflow
- name: Debug Environment
  run: |
    echo "NODE_ENV: $NODE_ENV"
    echo "TEST_DATABASE_URL: $TEST_DATABASE_URL"
    echo "Available vars:"
    env | grep -E '^(NODE_|TEST_|CI_)'
```

**Solutions**:
```yaml
# ✅ Set environment variables properly
env:
  NODE_ENV: test
  TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
  TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
  TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}

# ✅ Use GitHub secrets for sensitive data
steps:
  - name: Run tests
    env:
      API_KEY: ${{ secrets.API_KEY }}
    run: npm test
```

#### 2. Dependency Installation Issues

**Symptom**: "Module not found" or dependency-related errors

**Diagnosis**:
```yaml
- name: Debug Dependencies
  run: |
    node --version
    npm --version
    npm ls --depth=0
    cat package.json | grep -A 10 -B 2 '"dependencies"'
```

**Solutions**:
```yaml
# ✅ Use proper caching
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

# ✅ Install all dependencies including dev
- name: Install dependencies
  run: npm ci
```

#### 3. Test Timeout Issues

**Symptom**: Tests timeout in CI but pass locally

**Solutions**:
```yaml
# ✅ Increase timeout for CI
- name: Run E2E tests
  run: npm run test:e2e
  timeout-minutes: 30

# ✅ Use CI-specific configuration
# In playwright.config.ts
timeout: process.env.CI ? 60000 : 30000,
retries: process.env.CI ? 2 : 0,
```

### Docker Issues

#### 1. Container Resource Limits

**Symptom**: Tests fail with memory errors or timeouts

**Diagnosis**:
```bash
# Check container resources
docker stats

# Check memory usage during tests
docker exec -it container_name cat /proc/meminfo
```

**Solutions**:
```yaml
# Increase container resources
services:
  test:
    image: node:18
    mem_limit: 4g
    shm_size: 2g
```

---

## 🌐 Environment and Infrastructure Issues

### Database Issues

#### 1. Connection Pool Exhaustion

**Symptom**: "Connection pool exhausted" or "Too many connections"

**Diagnosis**:
```typescript
// Check active connections
test('debug connections', async () => {
  const pool = getDbPool();
  console.log('Active connections:', pool.totalCount);
  console.log('Idle connections:', pool.idleCount);
  console.log('Waiting requests:', pool.waitingCount);
});
```

**Solutions**:
```typescript
// ✅ Properly close connections
afterEach(async () => {
  await dbConnection.close();
});

afterAll(async () => {
  await dbPool.end();
});

// ✅ Configure connection pool for tests
const testDbConfig = {
  max: 5, // Max connections
  min: 1, // Min connections
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 30000
};
```

#### 2. Test Database State Issues

**Symptom**: Tests pass individually but fail when run together

**Diagnosis**:
```typescript
// Check database state
test('debug db state', async () => {
  const userCount = await User.count();
  const postCount = await Post.count();
  
  console.log('Users in DB:', userCount);
  console.log('Posts in DB:', postCount);
});
```

**Solutions**:
```typescript
// ✅ Proper test isolation
beforeEach(async () => {
  await clearTestDatabase();
  await seedBasicTestData();
});

afterEach(async () => {
  await cleanupTestData();
});

// ✅ Use transactions for isolation
beforeEach(async () => {
  testTransaction = await db.transaction();
});

afterEach(async () => {
  await testTransaction.rollback();
});
```

### Network Issues

#### 1. API Service Unavailable

**Symptom**: "ECONNREFUSED" or "Service unavailable"

**Diagnosis**:
```bash
# Check service status
curl -I http://localhost:3001/health
netstat -tlnp | grep 3001

# Check Docker services
docker-compose ps
docker-compose logs api
```

**Solutions**:
```bash
# Restart services
docker-compose down
docker-compose up -d

# Check service health
docker-compose exec api curl http://localhost:3001/health
```

#### 2. External Service Dependencies

**Symptom**: Tests fail due to external service downtime

**Solutions**:
```typescript
// ✅ Mock external services in tests
jest.mock('../services/externalApiService');

// ✅ Add circuit breaker for external calls
const callExternalService = async () => {
  try {
    return await externalApi.call();
  } catch (error) {
    console.warn('External service unavailable, using mock data');
    return getMockResponse();
  }
};
```

---

## 🔧 Debugging Tools and Techniques

### Browser DevTools Integration

#### 1. Playwright Debug Mode

```bash
# Run tests in headed mode with devtools
PWDEBUG=1 npx playwright test

# Run with browser console
npx playwright test --headed --debug
```

#### 2. Chrome DevTools Protocol

```typescript
// Enable CDP for debugging
test('debug with CDP', async ({ page }) => {
  // Enable CDP
  const cdpSession = await page.context().newCDPSession(page);
  
  // Enable console logging
  await cdpSession.send('Runtime.enable');
  cdpSession.on('Runtime.consoleAPICalled', (event) => {
    console.log('Browser console:', event.args[0].value);
  });
  
  await page.goto('/dashboard');
});
```

### Logging and Monitoring

#### 1. Structured Logging

```typescript
// Add structured logging to tests
const logger = {
  info: (message: string, context?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, context);
  },
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  }
};

test('test with logging', async ({ page }) => {
  logger.info('Starting test');
  
  try {
    await page.goto('/dashboard');
    logger.info('Page loaded successfully');
  } catch (error) {
    logger.error('Page load failed', error);
    throw error;
  }
});
```

#### 2. Test Execution Monitoring

```typescript
// Monitor test execution
test.beforeEach(async ({ page }, testInfo) => {
  console.log(`Starting test: ${testInfo.title}`);
  console.log(`File: ${testInfo.file}`);
  
  // Add performance marks
  await page.addInitScript(() => {
    performance.mark('test-start');
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const duration = Date.now() - testInfo.startTime.getTime();
  console.log(`Test completed in: ${duration}ms`);
  
  if (testInfo.status === 'failed') {
    await page.screenshot({ 
      path: `./debug-screenshots/${testInfo.title}-failure.png` 
    });
  }
});
```

### Performance Profiling

#### 1. Memory Profiling

```typescript
test('memory profile', async () => {
  const memoryBefore = process.memoryUsage();
  
  // Run test operations
  const result = await heavyOperation();
  
  const memoryAfter = process.memoryUsage();
  
  console.log('Memory usage:', {
    heapUsedDiff: memoryAfter.heapUsed - memoryBefore.heapUsed,
    heapTotalDiff: memoryAfter.heapTotal - memoryBefore.heapTotal,
    externalDiff: memoryAfter.external - memoryBefore.external
  });
});
```

#### 2. CPU Profiling

```bash
# Profile test execution
node --prof node_modules/.bin/jest
node --prof-process isolate-*.log > profile.txt

# Analyze profile
less profile.txt
```

---

## 🚨 Common Error Patterns

### 1. "ReferenceError: fetch is not defined"

**Cause**: Missing fetch polyfill in Node.js environment

**Solution**:
```typescript
// In jest.setup.ts or test file
import 'whatwg-fetch';

// Or mock fetch
global.fetch = jest.fn();
```

### 2. "Error: Not implemented: navigation"

**Cause**: Using browser-only APIs in Node.js test environment

**Solution**:
```typescript
// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    reload: jest.fn()
  }
});
```

### 3. "TypeError: Cannot read property 'addEventListener' of null"

**Cause**: Trying to access DOM elements before they're rendered

**Solution**:
```typescript
// Wait for element to exist
await waitFor(() => {
  expect(screen.getByTestId('element')).toBeInTheDocument();
});

// Or check if element exists first
const element = screen.queryByTestId('element');
if (element) {
  element.addEventListener('click', handler);
}
```

### 4. "Error: Actions may not be asynchronous"

**Cause**: Using async functions in act() or event handlers

**Solution**:
```typescript
// ✅ Proper async handling with act
await act(async () => {
  await result.current.asyncFunction();
});

// ✅ For event handlers
test('handle async event', async () => {
  const handleClick = async () => {
    await someAsyncOperation();
  };
  
  render(<Button onClick={handleClick} />);
  
  await act(async () => {
    fireEvent.click(screen.getByRole('button'));
  });
});
```

### 5. "Jest has detected the following 1 open handle"

**Cause**: Timers, database connections, or other resources not cleaned up

**Solution**:
```typescript
// Clear timers
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

// Close database connections
afterAll(async () => {
  await database.close();
});

// Clear intervals/timeouts
afterEach(() => {
  const timers = (global as any).__timers__;
  if (timers) {
    timers.forEach(clearTimeout);
    timers.forEach(clearInterval);
  }
});
```

---

## 📞 Escalation and Support

### When to Escalate

- Infrastructure issues affecting multiple developers
- CI/CD pipeline completely broken
- Security-related test failures
- Performance degradation > 50%
- Unknown errors with no clear resolution path

### Escalation Levels

#### Level 1: Team Lead (< 2 hours)
- Test failures blocking development
- Configuration issues
- Environment setup problems

#### Level 2: DevOps/Infrastructure (< 4 hours)
- CI/CD pipeline issues
- Database connectivity problems
- Environment configuration
- Performance issues

#### Level 3: Senior Engineering (< 8 hours)
- Complex technical issues
- Architecture-related problems
- Security concerns

### Information to Provide

#### For Test Failures
```
1. Test name and file location
2. Error message and stack trace
3. Environment (local, CI, staging)
4. Steps to reproduce
5. Recent changes that might be related
6. Screenshots (for E2E tests)
7. Logs and debug output
```

#### For Infrastructure Issues
```
1. Affected services/environments
2. Error messages from logs
3. Timeline of when issue started
4. Impact on team/users
5. Attempted resolution steps
6. Monitoring/metrics showing the issue
```

### Support Channels

- **Slack**: `#testing-support` for immediate help
- **GitHub Issues**: For bugs and feature requests
- **Documentation**: Internal wiki for procedures
- **On-call**: For critical production issues

---

## 📋 Quick Reference Cheat Sheet

### Common Commands

```bash
# Clear all caches and reset
npm run test:reset

# Run tests in debug mode
PWDEBUG=1 npx playwright test
DEBUG=* npm test

# Check test coverage
npm run test:coverage

# Run specific test pattern
npm test -- --testNamePattern="Login"
npx playwright test --grep "authentication"

# Generate test reports
npm run test:report
```

### Quick Fixes

```typescript
// Clear all mocks
jest.clearAllMocks();
jest.resetAllMocks();

// Reset timers
jest.clearAllTimers();
jest.useRealTimers();

// Clear DOM
cleanup();

// Force garbage collection
if (global.gc) global.gc();
```

### Environment Variables

```bash
# Common test environment variables
NODE_ENV=test
CI=true
DEBUG=true
HEADLESS=false
TIMEOUT=30000
```

---

**Document Status**: ✅ Active  
**Next Review**: 2024-12-07  
**Owner**: QA Team  
**Contributors**: Development Team, DevOps Team

---

For additional help or to report issues with this guide, contact the QA team or create an issue in the project repository.

# Windows Platform Testing Guide

This guide covers comprehensive testing procedures for the Attrition desktop application on Windows platforms, including local testing, CI/CD integration, and troubleshooting.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Local Testing Setup](#local-testing-setup)
- [Running Windows Tests](#running-windows-tests)
- [Test Categories](#test-categories)
- [CI/CD Integration](#cicd-integration)
- [Performance Benchmarks](#performance-benchmarks)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🎯 Overview

The Windows platform testing framework validates:

- **Platform Integration**: Windows-specific APIs, file system, registry, notifications
- **Performance**: Startup time, memory usage, CPU utilization, I/O operations
- **Compatibility**: Windows versions, hardware configurations, accessibility features
- **Distribution**: Executable validation, installer testing, code signing verification

## ⚙️ Prerequisites

### System Requirements

- **Windows 10** or later (Windows 11 recommended)
- **Node.js 18+** and **pnpm 8+**
- **PowerShell 5.1+** or **PowerShell Core 7+**
- **Visual Studio Build Tools** (for native dependencies)

### Development Dependencies

```powershell
# Install Node.js and pnpm
winget install OpenJS.NodeJS
npm install -g pnpm@8

# Install Visual Studio Build Tools
winget install Microsoft.VisualStudio.2022.BuildTools

# Install Windows SDK (if needed)
winget install Microsoft.WindowsSDK
```

### Project Setup

```powershell
# Clone and setup project
git clone https://github.com/your-org/attrition.git
cd attrition

# Install dependencies
pnpm install

# Build desktop application
pnpm --filter @game/desktop build
```

## 🏠 Local Testing Setup

### 1. Environment Configuration

Create a `.env.windows-test` file:

```env
# Windows Testing Configuration
ELECTRON_APP_PATH=packages/desktop/dist/win-unpacked/Attrition.exe
WINDOWS_TEST_MODE=true
NODE_ENV=test
PLAYWRIGHT_TEST=1

# Performance Testing
PERFORMANCE_BASELINE_ENABLED=true
PERFORMANCE_METRICS_DIR=./e2e/performance-results

# Screenshots and Artifacts
SCREENSHOT_ON_FAILURE=true
SCREENSHOT_MODE=fullPage
TEST_ARTIFACTS_DIR=./e2e/test-results
```

### 2. Build Desktop Application

```powershell
# Build for Windows testing
pnpm --filter @game/shared build
pnpm --filter @game/client build
pnpm --filter @game/desktop build --win --publish=never

# Verify build
$AppPath = Get-ChildItem -Path "packages/desktop/dist" -Filter "*.exe" -Recurse | Select-Object -First 1
if ($AppPath) {
    Write-Host "✅ Desktop app built: $($AppPath.FullName)"
} else {
    Write-Error "❌ Desktop app build failed"
}
```

### 3. Install Test Dependencies

```powershell
# Install E2E test dependencies
cd e2e
npm ci
npx playwright install --with-deps chromium

# Verify Playwright installation
npx playwright --version
```

## 🧪 Running Windows Tests

### Basic Test Execution

```powershell
# Run all Windows tests
cd e2e
npx playwright test windows-platform.spec.ts windows-performance.spec.ts --config=playwright-electron.config.ts

# Run specific test categories
npx playwright test windows-platform.spec.ts --config=playwright-electron.config.ts
npx playwright test windows-performance.spec.ts --config=playwright-electron.config.ts

# Run with specific tags
npx playwright test --grep "Windows Compatibility" --config=playwright-electron.config.ts
```

### Test Execution Options

```powershell
# Run with custom configuration
npx playwright test windows-platform.spec.ts `
    --config=playwright-electron.config.ts `
    --reporter=html,json `
    --output-dir=./custom-results

# Run in headed mode (visible windows)
npx playwright test windows-platform.spec.ts `
    --config=playwright-electron.config.ts `
    --headed

# Run with debug mode
npx playwright test windows-platform.spec.ts `
    --config=playwright-electron.config.ts `
    --debug

# Run specific test by name
npx playwright test --grep "should launch on Windows with proper window management"
```

### PowerShell Test Runner Script

Create `scripts/run-windows-tests.ps1`:

```powershell
#!/usr/bin/env pwsh
param(
    [string]$TestSuite = "all",
    [string]$Reporter = "html,json",
    [switch]$Headed,
    [switch]$Debug,
    [string]$OutputDir = "./test-results"
)

Write-Host "🖥️ Running Windows Platform Tests" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Set environment
$env:ELECTRON_APP_PATH = (Resolve-Path "packages/desktop/dist/win-unpacked/Attrition.exe").Path
$env:WINDOWS_TEST_MODE = "true"

# Build command
$Command = "npx playwright test"

switch ($TestSuite) {
    "platform" { $Command += " windows-platform.spec.ts" }
    "performance" { $Command += " windows-performance.spec.ts" }
    "compatibility" { $Command += " windows-performance.spec.ts --grep 'Windows Compatibility'" }
    default { $Command += " windows-platform.spec.ts windows-performance.spec.ts" }
}

$Command += " --config=playwright-electron.config.ts"
$Command += " --reporter=$Reporter"
$Command += " --output-dir=$OutputDir"

if ($Headed) { $Command += " --headed" }
if ($Debug) { $Command += " --debug" }

# Execute
Set-Location "e2e"
Write-Host "Running: $Command" -ForegroundColor Yellow
Invoke-Expression $Command

# Results summary
if (Test-Path $OutputDir) {
    $Results = Get-ChildItem -Path $OutputDir -Filter "*.json" | Select-Object -First 1
    if ($Results) {
        $Content = Get-Content $Results.FullName | ConvertFrom-Json
        Write-Host "`n📊 Test Results Summary:" -ForegroundColor Green
        Write-Host "  Passed: $($Content.stats.passed)" -ForegroundColor Green
        Write-Host "  Failed: $($Content.stats.failed)" -ForegroundColor Red
        Write-Host "  Skipped: $($Content.stats.skipped)" -ForegroundColor Yellow
    }
}
```

## 📂 Test Categories

### 1. Platform Integration Tests (`windows-platform.spec.ts`)

Tests Windows-specific functionality:

- **Window Management**: Maximize, minimize, resize, taskbar integration
- **File System**: Windows path handling, documents folder, permissions
- **Registry Operations**: Reading/writing registry values (HKCU only for safety)
- **System Notifications**: Windows notification system integration
- **Shell Integration**: File associations, external program launching
- **DPI Awareness**: High-DPI display handling and scaling
- **Power Management**: Sleep/wake events, power save blocking

```powershell
# Run platform integration tests
npx playwright test windows-platform.spec.ts --config=playwright-electron.config.ts

# Run specific platform test
npx playwright test --grep "should handle Windows file system operations"
```

### 2. Performance Tests (`windows-performance.spec.ts`)

Validates performance characteristics:

- **Startup Performance**: Application launch time, initial memory usage
- **Memory Management**: Memory growth, garbage collection efficiency
- **CPU Performance**: CPU usage under load, performance recovery
- **Graphics Performance**: WebGL capabilities, GPU acceleration
- **File I/O Performance**: Read/write speeds, bulk operations
- **Multi-Window Performance**: Resource usage with multiple windows

```powershell
# Run performance tests
npx playwright test windows-performance.spec.ts --config=playwright-electron.config.ts

# Run with performance profiling
npx playwright test windows-performance.spec.ts `
    --config=playwright-electron.config.ts `
    --reporter=json `
    --output-dir=./performance-results
```

### 3. Compatibility Tests

Tests compatibility across Windows versions and configurations:

- **Windows Version Detection**: OS version and feature detection
- **Architecture Support**: x64, ARM64 compatibility
- **Accessibility Features**: High contrast, screen reader support
- **Security Features**: UAC handling, Windows Defender integration
- **Power Events**: Battery/AC power transitions, sleep/wake

```powershell
# Run compatibility tests
npx playwright test windows-performance.spec.ts --grep "Windows Compatibility"
```

## 🚀 CI/CD Integration

### GitHub Actions Workflow

The automated Windows testing is configured in `.github/workflows/windows-platform-tests.yml`:

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests affecting desktop or E2E code
- Daily scheduled runs at 4 AM UTC
- Manual workflow dispatch with options

**Test Matrix:**
- Windows Server 2019, 2022, latest
- Multiple test suites (platform, performance, compatibility)
- Configurable timeouts and reporting

### Manual Workflow Execution

```yaml
# Via GitHub CLI
gh workflow run windows-platform-tests.yml \
    -f test_suite=all \
    -f windows_version=latest \
    -f test_timeout=60

# Via GitHub UI
# Go to Actions tab → Windows Platform Testing → Run workflow
```

### Local CI Simulation

```powershell
# Simulate CI environment locally
$env:CI = "true"
$env:GITHUB_ACTIONS = "true"
$env:NODE_ENV = "test"

# Run tests with CI configuration
cd e2e
npx playwright test windows-platform.spec.ts windows-performance.spec.ts `
    --config=playwright-electron.config.ts `
    --reporter=json,html `
    --workers=1 `
    --retries=1
```

## 📊 Performance Benchmarks

### Startup Performance Targets

| Metric | Target | Maximum |
|--------|--------|---------|
| Startup Time | < 5 seconds | < 10 seconds |
| Initial Memory | < 250MB | < 500MB |
| First Paint | < 2 seconds | < 5 seconds |

### Runtime Performance Targets

| Metric | Target | Maximum |
|--------|--------|---------|
| Memory Growth | < 50MB/hour | < 200MB/hour |
| CPU Usage (Idle) | < 5% | < 15% |
| File I/O (avg) | < 20ms read | < 50ms write |

### Monitoring Performance

```powershell
# Run performance baseline
cd e2e
npx playwright test windows-performance.spec.ts `
    --grep "should start up quickly" `
    --config=playwright-electron.config.ts `
    --reporter=json > baseline-results.json

# Compare performance
$Baseline = Get-Content baseline-results.json | ConvertFrom-Json
$Current = Get-Content current-results.json | ConvertFrom-Json

# Performance comparison logic here...
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Desktop App Not Found

```
Error: Electron app not found at packages/desktop/dist/win-unpacked/Attrition.exe
```

**Solution:**
```powershell
# Rebuild desktop application
pnpm --filter @game/desktop build --win

# Check build output
Get-ChildItem -Path "packages/desktop/dist" -Recurse -Filter "*.exe"
```

#### 2. Permission Errors

```
Error: Registry access denied / File system permission denied
```

**Solutions:**
```powershell
# Run tests with administrator privileges (if needed)
Start-Process PowerShell -Verb RunAs

# Or skip registry tests in restricted environments
npx playwright test windows-platform.spec.ts --grep-invert "registry"
```

#### 3. Playwright Browser Issues

```
Error: Browser not found or failed to launch
```

**Solution:**
```powershell
# Reinstall Playwright browsers
cd e2e
npx playwright install --with-deps chromium

# Clear Playwright cache if needed
npx playwright uninstall --all
npx playwright install chromium
```

#### 4. Performance Test Failures

```
Error: Memory usage exceeded maximum threshold
```

**Investigation:**
```powershell
# Run with detailed logging
$env:DEBUG = "pw:api"
npx playwright test windows-performance.spec.ts --reporter=list

# Check system resources
Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10
```

### Debug Helpers

#### Test Debug Mode

```powershell
# Run single test in debug mode
npx playwright test --grep "specific test name" --debug --config=playwright-electron.config.ts

# Pause on failure
npx playwright test windows-platform.spec.ts --headed --pause-on-failure
```

#### Screenshots and Videos

```powershell
# Enable screenshots on failure
$env:SCREENSHOT_ON_FAILURE = "true"
npx playwright test windows-platform.spec.ts --config=playwright-electron.config.ts

# Enable video recording
# (Configure in playwright-electron.config.ts)
# video: 'retain-on-failure'
```

#### Logging Configuration

```powershell
# Enable detailed Electron logging
$env:ELECTRON_ENABLE_LOGGING = "true"
$env:ELECTRON_LOG_LEVEL = "verbose"

# Enable Playwright debug logging
$env:DEBUG = "pw:api,pw:browser"
```

## 📈 Performance Monitoring

### Automated Performance Tracking

The performance tests automatically collect and compare metrics:

```typescript
// Example performance test structure
test('should track startup performance', async ({ electronApp }) => {
  const performanceTester = new PerformanceTester(electronApp);
  
  const metrics = {
    startupTime: await performanceTester.measureStartupTime(),
    memoryUsage: await performanceTester.measureMemoryUsage(),
    cpuUsage: await performanceTester.measureCPUUsage(),
  };
  
  // Store metrics for trending
  await storePerformanceMetrics(metrics);
  
  // Validate against thresholds
  expect(metrics.startupTime).toBeLessThan(10000);
  expect(metrics.memoryUsage).toBeLessThan(500);
});
```

### Performance Trends

```powershell
# Generate performance trend report
node scripts/analyze-performance-trends.js

# Compare against baseline
node scripts/compare-performance.js --baseline=baseline-results.json --current=current-results.json
```

## 🤝 Contributing

### Adding New Windows Tests

1. **Create test file**: Follow naming convention `windows-[category].spec.ts`
2. **Use Windows detection**: Always check `os.platform() !== 'win32'` and skip if not Windows
3. **Handle API availability**: Check for Windows-specific APIs before using
4. **Add to CI**: Update the GitHub Actions workflow to include new tests
5. **Document**: Add tests to this guide and include usage examples

### Example Test Template

```typescript
import { test, expect } from '../fixtures/electron-fixture';
import os from 'os';

test.describe('Windows [Feature] Tests', () => {
  test('should handle Windows [specific functionality]', async ({ electronApp, appPage }) => {
    // Skip on non-Windows platforms
    test.skip(os.platform() !== 'win32', 'Windows-only test');
    
    // Test implementation
    const result = await appPage.evaluate(async () => {
      if (!(window as any).desktop?.[feature]) {
        return { error: '[Feature] API not available' };
      }
      
      // Test logic here
      return { success: true };
    });
    
    // Handle graceful fallback
    if (result.error) {
      console.warn('[Feature] test skipped:', result.error);
      test.skip();
    } else {
      expect(result.success).toBe(true);
    }
  });
});
```

### Performance Test Guidelines

1. **Baseline Comparison**: Always compare against established baselines
2. **Cleanup Resources**: Ensure proper cleanup after performance tests
3. **Multiple Measurements**: Take multiple samples for accuracy
4. **Platform-Specific Thresholds**: Use Windows-specific performance expectations

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Electron Testing Guide](https://www.electronjs.org/docs/latest/tutorial/testing)
- [Windows API Documentation](https://docs.microsoft.com/en-us/windows/win32/)
- [PowerShell Documentation](https://docs.microsoft.com/en-us/powershell/)

## 🏷️ Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-09-07 | Initial Windows testing framework |
| 1.1.0 | TBD | Enhanced performance monitoring |

---

For questions or issues with Windows testing, please create an issue on GitHub or contact the development team.

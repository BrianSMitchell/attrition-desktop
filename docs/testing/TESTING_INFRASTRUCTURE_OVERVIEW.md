# Attrition Testing Infrastructure Overview

This document provides a comprehensive overview of the extensive testing infrastructure already in place for the Attrition project.

## 🏗️ Current Testing Architecture

### **1. Test Framework Configuration**

#### Root Level Jest Configuration
- **File**: `jest.config.js` 
- **Purpose**: Monorepo-wide test orchestration
- **Projects**: Configured for all packages (shared, server, client, desktop)

#### Package-Specific Configurations
- **Desktop**: `packages/desktop/jest.config.json` (Node environment, ES modules)
- **Client**: `packages/client/jest.config.cjs` (jsdom environment, TypeScript, React)
- **Server**: Multiple specialized configs including balance/performance testing
- **Shared**: TypeScript testing for utility functions

### **2. Existing Test Suites**

#### **Desktop Package Tests** (`packages/desktop/src/__tests__/`)
- **Bootstrap Tests**: `bootstrap.test.js` - Application startup and initialization
- **Database Tests**: `db.test.js`, `db.comprehensive.test.js` - Data layer testing
- **IPC Security Tests**: 
  - `ipc.security.test.js` - Inter-process communication security
  - `ipc.security.priority2.test.js` - Advanced security scenarios
  - `ipcInputValidation.test.js` - Input sanitization
  - `ipcSurfaceMinimization.test.js` - Attack surface reduction
- **Integration Tests**: `integration.e2e.test.js` - Full application integration
- **Performance Tests**: `perf.ipc.test.js`, `performanceMonitoringService.test.js`
- **Error Handling**: `errorLoggingService.redaction.test.js`
- **Event System**: `eventQueueService.test.js`
- **Main Process**: `main.ipc.test.js`, `main.ipc.comprehensive.test.js`

#### **Server Package Tests** (`packages/server/src/__tests__/`)
- **Game Logic Tests**:
  - `game-simulation.test.ts` - Complete game simulation scenarios
  - `generateUniverse.test.ts` - Universe generation algorithms
  - `gameLoop.*.test.ts` - Game loop mechanics (tech queue, unit queue, atomic operations)
  - `stars.test.ts` - Star system generation
- **Service Layer Tests**:
  - `*Service.*.test.ts` - Comprehensive service testing (structures, defenses, tech, units)
  - `capacityService.eta-parity.test.ts` - Capacity calculation verification
  - `buildingService.atomicActivation.test.ts` - Building activation atomicity
- **API Route Tests**:
  - `routes.*.test.ts` - API endpoint testing (bases, structures, idempotency, double-submit)
  - `httpsEnforcement.test.ts` - HTTPS security enforcement
  - `securityHeaders.test.ts` - Security header validation
- **Game Balance Tests**: `game-balance/balance.test.ts` - Game balance verification
- **Performance Tests**: `game-performance/performance.test.ts` - Performance benchmarking
- **E2E Energy Parity**: `e2e.energyParity.test.ts` - End-to-end energy system validation

#### **Client Package Tests** (`packages/client/src/__tests__/` & component tests)
- **Component Tests**:
  - `BuildTables.parity.test.tsx` - Build table parity validation
  - `GalaxyView.clickMapping.test.ts` - Galaxy interaction mapping
  - `HeaderStatLinks.test.tsx` - UI component testing
  - `ResearchLevelsModal.test.tsx` - Research interface testing
  - `SystemView.cache.test.tsx` - System view caching
  - `UniverseOverview.cache.test.tsx` - Universe overview caching
- **Service Tests**:
  - `api.refresh-single-flight.test.ts` - API call deduplication
  - `api.error-mapping.test.ts` - Error handling
  - `errorLoggingService.redaction.test.ts` - Client-side error logging
- **Helper Function Tests**: Map helpers, off-screen layers, etc.

#### **Shared Package Tests** (`packages/shared/src/__tests__/`)
- **Core Logic Tests**:
  - `bootstrap.validation.test.ts` - Initialization validation
  - `capacities.*.test.ts` - Capacity calculation testing
  - `energyBudget.test.ts` - Energy system testing
  - `overhaul.test.ts` - Major system overhaul testing
  - `structureLevels.test.ts` - Structure progression testing
  - `utils.test.ts` - Utility function testing

### **3. Advanced Testing Features**

#### **Testing Metrics Framework** (`packages/server/src/testing/`)
- **Comprehensive Metrics Collection**: Test execution, coverage, performance, reliability
- **Health Monitoring**: Real-time scoring and trend analysis
- **Automated Reporting**: Daily/weekly reports with insights
- **Alert System**: Proactive failure notifications
- **Visual Dashboards**: Interactive HTML dashboards
- **CLI Management**: Command-line testing tools

#### **Specialized Test Utilities** (`packages/server/src/test-utils/`)
- **Game Balance Framework**: `game-balance-framework.ts`
- **Game Performance Framework**: `game-performance-framework.ts`
- **Game Simulation Framework**: `game-simulation-framework.ts`
- **Multiplayer Testing Framework**: `multiplayer-testing-framework.ts`
- **Testing Metrics Framework**: `testing-metrics-framework.ts`
- **Dashboard Generator**: `dashboard-generator.ts`
- **Automated Reporting**: `automated-reporting.ts`

#### **Performance & Load Testing**
- **Balance Performance Config**: `jest.config.balance-performance.js`
- **Multiplayer Scenarios**: `multiplayer-scenarios.test.ts`
- **Performance Benchmarks**: Dedicated performance test suites
- **Memory & CPU Monitoring**: Built-in performance monitoring

### **4. Test Categories & Coverage**

#### **Unit Tests** ✅
- Service layer functions
- Utility functions
- Component logic
- Business rule validation

#### **Integration Tests** ✅
- API endpoint testing
- Database operations
- Service interactions
- IPC communication

#### **End-to-End Tests** ✅
- Complete user workflows
- Desktop application integration
- Full system validation
- Cross-service communication

#### **Performance Tests** ✅
- Game loop performance
- API response times
- Memory usage validation
- Load testing scenarios

#### **Security Tests** ✅
- IPC security validation
- Input sanitization
- HTTPS enforcement
- Security header verification

#### **Game Logic Tests** ✅
- Game balance verification
- Universe generation
- Economy simulation
- Combat mechanics

### **5. Testing Documentation**

- **Main Testing README**: `packages/server/src/testing/README.md`
- **Test Plans**: `docs/test-plans/` directory
- **Testing Strategy**: `docs/testing/` directory
- **Debugging Guide**: `docs/testing/debugging-and-troubleshooting.md`
- **Game Simulation Framework**: `docs/testing/game-simulation-framework.md`
- **Test Authoring Guidelines**: `docs/testing/test-authoring-guidelines.md`

### **6. Current Test Scripts Available**

From the existing package.json files, you have these test commands:
- `pnpm test` - Run all tests
- `pnpm test:balance` - Game balance tests
- `pnpm test:performance` - Performance tests
- `pnpm test:game-simulation` - Game simulation tests
- `pnpm test:multiplayer` - Multiplayer tests
- Individual package tests via `pnpm --filter <package> test`

## 🎯 Recommendations for Enhanced Organization

### **1. Move Tests to Standardized Locations**

#### **Create `tests/` Directory Structure:**
```
tests/
├── unit/           # Unit tests from all packages
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
├── performance/   # Performance & load tests
├── security/      # Security-specific tests
├── fixtures/      # Test data and fixtures
├── utils/         # Testing utilities and helpers
└── reports/       # Test reports and coverage
```

#### **Organize by Test Type Rather Than Package:**
- Move `packages/*/src/__tests__/` → `tests/unit/`
- Move integration tests → `tests/integration/`
- Move E2E tests → `tests/e2e/`
- Keep package-specific configs but point to central test directories

### **2. Consolidate Test Configurations**

- Update root `jest.config.js` to work with new structure
- Create specialized configs for different test types
- Maintain existing sophisticated configurations (balance, performance)

### **3. Enhanced Test Script Organization**

#### **Update package.json scripts:**
```json
{
  "test": "jest",
  "test:unit": "jest tests/unit",
  "test:integration": "jest tests/integration", 
  "test:e2e": "jest tests/e2e",
  "test:performance": "jest tests/performance",
  "test:security": "jest tests/security",
  "test:all": "jest tests/",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:balance": "jest --config jest.config.balance.js",
  "test:dashboard": "node tests/utils/dashboard-generator.js"
}
```

## 🚀 Action Plan

**Priority 1: Organize Existing Tests**
1. Create the new `tests/` directory structure
2. Move existing tests to appropriate categories
3. Update Jest configurations to point to new locations
4. Ensure all existing tests still run correctly

**Priority 2: Enhance Test Infrastructure**  
1. Integrate existing testing metrics framework
2. Set up centralized test reporting
3. Configure automated test dashboards
4. Implement test result notifications

**Priority 3: Documentation Update**
1. Update all testing documentation to reflect new structure
2. Create testing guidelines for the organized structure
3. Update README files with new test commands

## 📊 Current Test Statistics

Based on the extensive test files found:
- **200+ test files** across all packages
- **Comprehensive coverage** of game logic, security, performance
- **Advanced testing frameworks** already implemented
- **Sophisticated test utilities** for complex scenarios
- **Real-time monitoring** and reporting capabilities

## 🎉 Conclusion

Your Attrition project has an **exceptionally comprehensive and sophisticated testing infrastructure** that surpasses most production applications. The current challenge is organizational - moving from a package-based test structure to a more standardized test-type-based structure for better maintainability and discoverability.

The existing infrastructure includes advanced features like:
- Real-time testing dashboards
- Automated health scoring
- Performance benchmarking
- Security validation
- Game balance verification
- Multiplayer scenario testing

This is enterprise-grade testing infrastructure that just needs better organization!

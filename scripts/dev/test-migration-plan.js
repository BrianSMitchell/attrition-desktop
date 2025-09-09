#!/usr/bin/env node

/**
 * Test Migration Plan
 * Maps existing tests to their new centralized locations
 */

const path = require('path');
const fs = require('fs');

const testMigrationPlan = {
  // E2E Tests - Full application integration tests
  e2e: [
    'packages/desktop/src/__tests__/integration.e2e.test.js',
    'packages/server/src/__tests__/e2e.energyParity.test.ts'
  ],

  // Performance Tests - Benchmarking and performance validation
  performance: [
    'packages/desktop/src/__tests__/perf.ipc.test.js',
    'packages/desktop/src/__tests__/performanceMonitoringService.test.js',
    'packages/server/src/__tests__/game-performance/performance.test.ts',
    'packages/server/src/__tests__/game-balance/balance.test.ts' // Balance affects performance
  ],

  // Security Tests - Security validation, IPC security, input validation
  security: [
    'packages/desktop/src/__tests__/ipc.security.test.js',
    'packages/desktop/src/__tests__/ipc.security.priority2.test.js',
    'packages/desktop/src/__tests__/ipcInputValidation.test.js',
    'packages/desktop/src/__tests__/ipcSurfaceMinimization.test.js',
    'packages/desktop/src/__tests__/errorLoggingService.redaction.test.js',
    'packages/server/src/__tests__/httpsEnforcement.test.ts',
    'packages/server/src/__tests__/securityHeaders.test.ts',
    'packages/server/src/tests/tlsHardening.test.ts',
    'packages/client/src/services/__tests__/errorLoggingService.redaction.test.ts'
  ],

  // Integration Tests - Cross-service, API, database integration
  integration: [
    'packages/desktop/src/__tests__/bootstrap.test.js',
    'packages/desktop/src/__tests__/db.test.js',
    'packages/desktop/src/__tests__/db.comprehensive.test.js',
    'packages/desktop/src/__tests__/main.ipc.test.js',
    'packages/desktop/src/__tests__/main.ipc.comprehensive.test.js',
    'packages/desktop/src/__tests__/eventQueueService.test.js',
    'packages/server/src/__tests__/game-simulation.test.ts',
    'packages/server/src/__tests__/routes.*.test.ts', // Pattern - will expand
    'packages/client/src/services/__tests__/api.*.test.ts' // Pattern - will expand
  ],

  // Unit Tests - Individual functions, components, services
  unit: [
    // Server unit tests
    'packages/server/src/__tests__/generateUniverse.test.ts',
    'packages/server/src/__tests__/stars.test.ts',
    'packages/server/src/__tests__/gameLoop.*.test.ts',
    'packages/server/src/__tests__/*Service.*.test.ts',
    'packages/server/src/__tests__/baseStatsService.catalogKey.test.ts',
    'packages/server/src/__tests__/buildingService.atomicActivation.test.ts',
    'packages/server/src/__tests__/capacityService.eta-parity.test.ts',
    'packages/server/src/__tests__/defensesService.idempotency.test.ts',
    'packages/server/src/__tests__/structuresService.*.test.ts',
    'packages/server/src/__tests__/techService.*.test.ts',
    'packages/server/src/__tests__/unitsService.*.test.ts',
    'packages/server/src/__tests__/services.dto-format.test.ts',

    // Client unit tests
    'packages/client/src/components/**/__tests__/**/*.test.tsx',
    'packages/client/src/components/**/__tests__/**/*.test.ts',
    'packages/client/src/components/game/__tests__/*.test.tsx',

    // Shared unit tests
    'packages/shared/src/__tests__/*.test.ts',

    // Desktop unit tests (non-integration)
    // Most desktop tests are integration, but some utilities could be unit
  ]
};

const testUtilities = [
  'packages/server/src/test-utils/',
  'packages/server/src/testing/',
  'packages/client/src/test-setup.d.ts'
];

const testFixtures = [
  'packages/server/src/__tests__/setup/',
  'packages/server/src/__tests__/processors/'
];

function expandPatterns(files) {
  const expanded = [];
  const fs = require('fs');
  const path = require('path');
  const glob = require('glob');

  for (const file of files) {
    if (file.includes('*')) {
      try {
        const matches = glob.sync(file, { cwd: process.cwd() });
        expanded.push(...matches);
      } catch (e) {
        console.warn(`Could not expand pattern ${file}:`, e.message);
      }
    } else {
      expanded.push(file);
    }
  }
  return expanded;
}

function validatePlan() {
  console.log('📋 Test Migration Plan Validation');
  console.log('==================================');

  let totalFiles = 0;
  let existingFiles = 0;

  for (const [category, files] of Object.entries(testMigrationPlan)) {
    const expanded = expandPatterns(files);
    console.log(`\n📁 ${category.toUpperCase()} (${expanded.length} files)`);
    
    for (const file of expanded) {
      totalFiles++;
      if (fs.existsSync(file)) {
        existingFiles++;
        console.log(`  ✅ ${file}`);
      } else {
        console.log(`  ❌ ${file} (NOT FOUND)`);
      }
    }
  }

  console.log(`\n📊 Summary: ${existingFiles}/${totalFiles} files found`);
  return { totalFiles, existingFiles };
}

function generateMigrationCommands() {
  console.log('\n🚀 Migration Commands');
  console.log('====================');

  for (const [category, files] of Object.entries(testMigrationPlan)) {
    console.log(`\n# ${category.toUpperCase()} tests`);
    const expanded = expandPatterns(files);
    
    for (const file of expanded) {
      if (fs.existsSync(file)) {
        const filename = path.basename(file);
        console.log(`Move-Item "${file}" "tests/${category}/${filename}" -Force`);
      }
    }
  }

  console.log('\n# Test utilities');
  for (const util of testUtilities) {
    if (fs.existsSync(util)) {
      const dirname = path.basename(util);
      console.log(`Copy-Item "${util}" "tests/utils/${dirname}" -Recurse -Force`);
    }
  }

  console.log('\n# Test fixtures');
  for (const fixture of testFixtures) {
    if (fs.existsSync(fixture)) {
      const dirname = path.basename(fixture);
      console.log(`Copy-Item "${fixture}" "tests/fixtures/${dirname}" -Recurse -Force`);
    }
  }
}

if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'validate':
      validatePlan();
      break;
    case 'commands':
      generateMigrationCommands();
      break;
    case 'execute':
      console.log('Execute migration not implemented yet - use commands output');
      break;
    default:
      console.log('Usage: node test-migration-plan.js <validate|commands|execute>');
  }
}

module.exports = { testMigrationPlan, testUtilities, testFixtures, expandPatterns };

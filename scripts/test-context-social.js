#!/usr/bin/env node

/**
 * Test Script for Context-Aware Social Media System
 * 
 * This script tests all components of the context-aware social media system
 * to verify integration and functionality before deployment.
 * 
 * Usage:
 *   node test-context-social.js [--full]
 *   
 * Options:
 *   --full     Run full integration tests including AI generation
 *   --help     Show this help
 */

const path = require('path');

/**
 * Context-Aware Social Media System Tester
 */
class SocialMediaSystemTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      details: []
    };
  }

  /**
   * Run a test and record the result
   * @param {string} testName - Name of the test
   * @param {Function} testFn - Test function that returns boolean or throws
   * @returns {Promise<boolean>} Test result
   */
  async runTest(testName, testFn) {
    try {
      console.log(`🧪 Testing: ${testName}`);
      const result = await testFn();
      
      if (result) {
        console.log(`✅ PASS: ${testName}`);
        this.testResults.passed++;
        this.testResults.details.push({ name: testName, result: 'PASS' });
        return true;
      } else {
        console.log(`❌ FAIL: ${testName}`);
        this.testResults.failed++;
        this.testResults.details.push({ name: testName, result: 'FAIL', error: 'Test returned false' });
        return false;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${testName} - ${error.message}`);
      this.testResults.failed++;
      this.testResults.details.push({ name: testName, result: 'FAIL', error: error.message });
      return false;
    }
  }

  /**
   * Test that all required modules can be loaded
   */
  async testModuleLoading() {
    return await this.runTest('Module Loading', () => {
      // Test loading Context Analysis Engine
      const { ContextAnalysisEngine } = require('./lib/context-analysis-engine');
      if (!ContextAnalysisEngine) throw new Error('Context Analysis Engine not found');

      // Test loading Git Analysis Service
      const { GitAnalysisService } = require('./lib/git-analysis-service');
      if (!GitAnalysisService) throw new Error('Git Analysis Service not found');

      // Test loading Project Analysis Service
      const { ProjectAnalysisService } = require('./lib/project-analysis-service');
      if (!ProjectAnalysisService) throw new Error('Project Analysis Service not found');

      // Test loading Context Aggregator
      const { ContextAggregator } = require('./lib/context-aggregator');
      if (!ContextAggregator) throw new Error('Context Aggregator not found');

      // Test loading Context-Aware AI Service
      const { ContextAwareAIService } = require('./lib/context-aware-ai-service');
      if (!ContextAwareAIService) throw new Error('Context-Aware AI Service not found');

      // Test loading Context-Aware Social Manager
      const { getContextAwareSocialManager } = require('./lib/context-aware-social-manager');
      if (!getContextAwareSocialManager) throw new Error('Context-Aware Social Manager not found');

      // Test loading Enhanced Social Poster
      const { EnhancedSocialPoster } = require('./lib/context-aware-social-post');
      if (!EnhancedSocialPoster) throw new Error('Enhanced Social Poster not found');

      return true;
    });
  }

  /**
   * Test Context Analysis Engine initialization
   */
  async testContextEngineInit() {
    return await this.runTest('Context Analysis Engine Init', async () => {
      const { ContextAnalysisEngine } = require('./lib/context-analysis-engine');
      const engine = new ContextAnalysisEngine({
        projectPath: process.cwd(),
        maxCacheAge: 300000, // 5 minutes
        enableGitAnalysis: true,
        enableProjectAnalysis: true
      });

      await engine.initialize();
      return engine.initialized;
    });
  }

  /**
   * Test Context Analysis Engine functionality
   */
  async testContextEngineFunction() {
    return await this.runTest('Context Analysis Engine Functionality', async () => {
      const { ContextAnalysisEngine } = require('./lib/context-analysis-engine');
      const engine = new ContextAnalysisEngine({
        projectPath: process.cwd(),
        maxCacheAge: 300000,
        enableGitAnalysis: true,
        enableProjectAnalysis: true
      });

      await engine.initialize();
      const context = await engine.generateContext();
      
      return context && 
             context.git && 
             context.project && 
             typeof context.lastUpdated === 'number' &&
             Array.isArray(context.git.recentCommits) &&
             context.project.structure;
    });
  }

  /**
   * Test Context-Aware Social Manager initialization
   */
  async testSocialManagerInit() {
    return await this.runTest('Context-Aware Social Manager Init', async () => {
      const { getContextAwareSocialManager } = require('./lib/context-aware-social-manager');
      const manager = getContextAwareSocialManager({ dryRun: true });
      
      await manager.initialize();
      return manager.getStatus().initialized;
    });
  }

  /**
   * Test Enhanced Social Poster initialization
   */
  async testEnhancedPosterInit() {
    return await this.runTest('Enhanced Social Poster Init', async () => {
      const { EnhancedSocialPoster } = require('./lib/context-aware-social-post');
      const poster = new EnhancedSocialPoster({ dryRun: true });
      
      await poster.initialize();
      return poster.socialManager !== null;
    });
  }

  /**
   * Test full AI content generation (only if --full flag is provided)
   */
  async testFullAIGeneration() {
    return await this.runTest('Full AI Content Generation', async () => {
      const { getContextAwareSocialManager } = require('./lib/context-aware-social-manager');
      const manager = getContextAwareSocialManager({ dryRun: true });
      
      await manager.initialize();
      
      // Test content generation
      const result = await manager.generateAndPost({
        platform: 'twitter',
        tone: 'professional',
        customPrompt: 'Test integration with context analysis'
      });

      return result.success && 
             result.content && 
             result.content.length > 0 &&
             result.metadata;
    });
  }

  /**
   * Test command line argument parsing
   */
  async testArgumentParsing() {
    return await this.runTest('Argument Parsing', () => {
      const { EnhancedSocialPoster } = require('./lib/context-aware-social-post');
      
      // Temporarily modify process.argv to test parsing
      const originalArgv = process.argv;
      process.argv = ['node', 'script.js', '--tone', 'excited', '--platform', 'twitter', 'Custom message'];
      
      try {
        const poster = new EnhancedSocialPoster({ dryRun: true });
        const options = poster.parseArguments();
        
        const result = options.tone === 'excited' && 
                      options.platform === 'twitter' && 
                      options.customText === 'Custom message';
        
        return result;
      } finally {
        process.argv = originalArgv;
      }
    });
  }

  /**
   * Display test results summary
   */
  displayResults() {
    console.log('\n' + '='.repeat(50));
    console.log('🧪 CONTEXT-AWARE SOCIAL MEDIA SYSTEM TEST RESULTS');
    console.log('='.repeat(50));
    
    console.log(`✅ Tests Passed: ${this.testResults.passed}`);
    console.log(`❌ Tests Failed: ${this.testResults.failed}`);
    console.log(`📊 Total Tests: ${this.testResults.passed + this.testResults.failed}`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.details
        .filter(test => test.result === 'FAIL')
        .forEach(test => {
          console.log(`  • ${test.name}: ${test.error || 'Unknown error'}`);
        });
    }
    
    const success = this.testResults.failed === 0;
    console.log(`\n🎯 Overall Result: ${success ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (success) {
      console.log('\n🚀 Context-Aware Social Media System is ready for deployment!');
    } else {
      console.log('\n⚠️ Please fix failed tests before deployment.');
    }
    
    return success;
  }

  /**
   * Run all tests
   */
  async runAllTests(includeFullTests = false) {
    console.log('🚀 Starting Context-Aware Social Media System Tests...\n');

    // Core module tests
    await this.testModuleLoading();
    await this.testContextEngineInit();
    await this.testContextEngineFunction();
    await this.testSocialManagerInit();
    await this.testEnhancedPosterInit();
    await this.testArgumentParsing();

    // Full integration test (optional)
    if (includeFullTests) {
      console.log('\n🔍 Running full integration tests...');
      await this.testFullAIGeneration();
    } else {
      console.log('\n💡 Skipping AI generation test (use --full to include)');
    }

    return this.displayResults();
  }
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
🧪 Context-Aware Social Media System Tester

USAGE:
  node test-context-social.js [options]

OPTIONS:
  --full     Run full integration tests including AI content generation
  --help     Show this help

DESCRIPTION:
  This script tests the entire context-aware social media system to verify
  that all components work together correctly. It tests:
  
  • Module loading and dependencies
  • Context Analysis Engine initialization and functionality
  • Social Media Manager initialization
  • Enhanced Social Poster setup
  • Command-line argument parsing
  • (Optional) Full AI content generation

EXAMPLES:
  # Run basic tests
  node test-context-social.js

  # Run all tests including AI generation
  node test-context-social.js --full

  # Show help
  node test-context-social.js --help
`);
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    displayHelp();
    return;
  }

  const includeFullTests = args.includes('--full');
  
  const tester = new SocialMediaSystemTester();
  const success = await tester.runAllTests(includeFullTests);
  
  process.exit(success ? 0 : 1);
}

// Only run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal test error:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { SocialMediaSystemTester };
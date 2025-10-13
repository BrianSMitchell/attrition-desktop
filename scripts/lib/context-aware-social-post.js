#!/usr/bin/env node

/**
 * Context-Aware Social Media Posting Script
 * 
 * Enhanced version of the original post-to-twitter.js that integrates with the
 * Context Analysis Engine to generate intelligent, context-aware social media content.
 * 
 * This script can be used as a drop-in replacement for the original Twitter posting
 * script with backward compatibility while adding AI-powered intelligence.
 * 
 * Usage:
 *   node context-aware-social-post.js [options]
 *   node context-aware-social-post.js "Custom message"
 *   node context-aware-social-post.js --tone excited --platform twitter
 *   node context-aware-social-post.js --auto --platform twitter
 * 
 * Environment Variables:
 *   - TWEET_TEXT: Custom tweet text (backward compatibility)
 *   - SOCIAL_TONE: Content tone (excited, professional, casual, auto)
 *   - SOCIAL_PLATFORM: Target platform (twitter, linkedin)
 *   - SOCIAL_DRY_RUN: Set to 'true' to test without posting
 *   - Plus all existing Twitter API credentials
 */

const { getContextAwareSocialManager } = require('./context-aware-social-manager');

/**
 * Enhanced Social Media Poster
 * Provides backward compatibility while adding AI intelligence
 */
class EnhancedSocialPoster {
  constructor(options = {}) {
    this.dryRun = options.dryRun || process.env.SOCIAL_DRY_RUN === 'true';
    this.socialManager = null;
  }

  /**
   * Initialize the enhanced social poster
   */
  async initialize() {
    this.socialManager = getContextAwareSocialManager({
      dryRun: this.dryRun
    });
    
    await this.socialManager.initialize();
    console.log('🚀 Enhanced Social Media Poster ready');
  }

  /**
   * Parse command line arguments and environment variables
   * @returns {Object} Parsed options
   */
  parseArguments() {
    const args = process.argv.slice(2);
    const options = {
      customText: null,
      tone: 'auto',
      platform: 'twitter',
      help: false,
      test: false
    };

    // Parse command line flags
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--help':
        case '-h':
          options.help = true;
          break;
          
        case '--tone':
        case '-t':
          options.tone = args[++i] || 'auto';
          break;
          
        case '--platform':
        case '-p':
          options.platform = args[++i] || 'twitter';
          break;
          
        case '--auto':
        case '-a':
          options.tone = 'auto';
          break;
          
        case '--test':
          options.test = true;
          break;
          
        case '--dry-run':
          this.dryRun = true;
          break;
          
        default:
          // If it doesn't start with --, treat it as custom text
          if (!arg.startsWith('--')) {
            options.customText = arg;
          }
          break;
      }
    }

    // Check environment variables for backward compatibility
    if (!options.customText) {
      options.customText = process.env.TWEET_TEXT;
    }
    
    if (process.env.SOCIAL_TONE && options.tone === 'auto') {
      options.tone = process.env.SOCIAL_TONE;
    }
    
    if (process.env.SOCIAL_PLATFORM) {
      options.platform = process.env.SOCIAL_PLATFORM;
    }

    return options;
  }

  /**
   * Display help information
   */
  displayHelp() {
    console.log(`
🤖 Context-Aware Social Media Poster

USAGE:
  node context-aware-social-post.js [options]
  node context-aware-social-post.js "Custom message"

OPTIONS:
  --tone, -t <tone>      Content tone: excited, professional, casual, auto (default: auto)
  --platform, -p <name>  Target platform: twitter, linkedin (default: twitter)  
  --auto, -a             Use automatic AI content generation (default)
  --test                 Run functionality test
  --dry-run              Test without actually posting
  --help, -h             Show this help

ENVIRONMENT VARIABLES:
  TWEET_TEXT             Custom tweet text (backward compatibility)
  SOCIAL_TONE            Content tone override
  SOCIAL_PLATFORM        Target platform override  
  SOCIAL_DRY_RUN         Set to 'true' for dry run mode
  
  Twitter API credentials (required for posting):
  TWITTER_API_KEY, TWITTER_API_KEY_SECRET
  TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET
  TWITTER_BEARER_TOKEN

EXAMPLES:
  # Auto-generate content with development context
  node context-aware-social-post.js --auto

  # Generate excited tone content  
  node context-aware-social-post.js --tone excited

  # Post custom message with context enhancement
  node context-aware-social-post.js "Check out our latest feature!"

  # Dry run (test without posting)
  node context-aware-social-post.js --dry-run --auto

  # Test functionality
  node context-aware-social-post.js --test

FEATURES:
  ✨ AI-powered content generation based on git activity
  📊 Intelligent context from recent commits and project changes  
  🎯 Multiple tone variants with automatic selection
  📱 Platform-specific optimizations
  🛡️ Robust fallbacks when AI generation fails
  🔄 Full backward compatibility with existing scripts
`);
  }

  /**
   * Run functionality test
   * @returns {Promise<void>}
   */
  async runTest() {
    console.log('🧪 Running Enhanced Social Media Poster test...\n');

    try {
      if (!this.socialManager) {
        await this.initialize();
      }

      // Test the social manager
      const testResult = await this.socialManager.testSocialManager();
      
      console.log('📊 Test Results:');
      console.log(`  ✅ Initialized: ${testResult.initialized}`);
      console.log(`  🤖 AI Service: ${testResult.aiServiceWorking ? '✅ Working' : '❌ Failed'}`);
      console.log(`  🐦 Twitter Ready: ${testResult.twitterPosterReady ? '✅ Ready' : '⚠️ Dry Run'}`);
      console.log(`  📝 Content Generated: ${testResult.contentGenerated ? '✅ Yes' : '❌ No'}`);
      console.log(`  📊 Context Included: ${testResult.contextIncluded ? '✅ Yes' : '⚠️ No'}`);

      if (testResult.success) {
        console.log('\n🎉 Enhanced Social Media Poster is working correctly!');
        
        // Show service status
        const status = this.socialManager.getStatus();
        console.log('\n📋 Service Status:');
        console.log(`  • Dry Run Mode: ${status.dryRun ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`  • Default Tones: ${status.defaultTones.join(', ')}`);
        console.log(`  • Max Retries: ${status.maxRetries}`);
        
      } else {
        console.log('\n❌ Test failed:', testResult.error);
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Test failed with error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Generate and post social media content
   * @param {Object} options - Posting options
   * @returns {Promise<void>}
   */
  async generateAndPost(options) {
    try {
      if (!this.socialManager) {
        await this.initialize();
      }

      console.log('🤖 Generating context-aware social media content...');
      console.log(`📱 Platform: ${options.platform}`);
      console.log(`🎯 Tone: ${options.tone}`);
      
      if (options.customText) {
        console.log(`📝 Custom text provided: "${options.customText}"`);
      }

      // Generate and post content
      const result = await this.socialManager.generateAndPost({
        platform: options.platform,
        tone: options.tone,
        customPrompt: options.customText
      });

      if (result.success) {
        console.log('\n✅ Social media post successful!');
        console.log(`📝 Content: ${result.content}`);
        console.log(`🎯 Final tone: ${result.tone || 'auto-selected'}`);
        console.log(`🤖 AI Generated: ${result.metadata.aiGenerated ? '✅' : '❌'}`);
        console.log(`📊 Context Included: ${result.metadata.contextIncluded ? '✅' : '❌'}`);
        console.log(`🔢 Variants Considered: ${result.variants}`);

        if (result.metadata.tokensUsed > 0) {
          console.log(`🪙 Tokens Used: ${result.metadata.tokensUsed}`);
        }

        if (!this.dryRun && result.result.tweetId) {
          console.log(`🔗 Tweet ID: ${result.result.tweetId}`);
          console.log(`::notice::Tweet posted successfully with ID ${result.result.tweetId}`);
        }

        if (result.fallbackUsed) {
          console.log(`⚠️ Note: Used fallback content due to: ${result.originalError}`);
        }

      } else {
        console.error('❌ Social media posting failed:', result.error);
        if (result.originalError) {
          console.error('Original error:', result.originalError);
        }
        console.log('::warning::Social media posting failed, but continuing workflow');
        process.exit(0); // Don't fail the workflow
      }

    } catch (error) {
      console.error('❌ Unexpected error:', error.message);
      console.log('::warning::Social media posting encountered an unexpected error');
      process.exit(0); // Don't fail the workflow
    }
  }

  /**
   * Main execution method
   * @returns {Promise<void>}
   */
  async run() {
    const options = this.parseArguments();

    if (options.help) {
      this.displayHelp();
      return;
    }

    if (options.test) {
      await this.runTest();
      return;
    }

    // Validate required environment for posting (if not dry run)
    if (!this.dryRun && !process.env.TWITTER_API_KEY) {
      console.error('❌ Missing Twitter API credentials. Please set required environment variables.');
      console.log('Required: TWITTER_API_KEY, TWITTER_API_KEY_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET');
      process.exit(1);
    }

    // Generate and post content
    await this.generateAndPost(options);
  }
}

/**
 * Main execution function
 */
async function main() {
  const poster = new EnhancedSocialPoster();
  await poster.run();
}

// Only run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    console.log('::warning::Enhanced social posting failed with fatal error');
    process.exit(0); // Don't fail CI workflows
  });
}

module.exports = { EnhancedSocialPoster };
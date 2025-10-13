/**
 * AI Service Fallback Handler
 * Provides graceful degradation when AI services are unavailable
 * Falls back to manual template selection with smart defaults
 */

const { AI_CONFIG_CONSTANTS } = require('../../config/ai-config');

/**
 * Fallback handler for AI service failures
 */
class AIFallbackHandler {
  constructor() {
    this.fallbackReasons = [];
    this.lastFallbackTime = null;
    this.fallbackCount = 0;
  }

  /**
   * Record a fallback event with reason
   * @param {string} reason - Reason for fallback
   * @param {Error} error - Original error that caused fallback
   */
  recordFallback(reason, error = null) {
    this.fallbackCount++;
    this.lastFallbackTime = new Date();
    this.fallbackReasons.push({
      reason,
      error: error?.message || null,
      timestamp: this.lastFallbackTime,
      count: this.fallbackCount
    });

    // Keep only last 10 fallback reasons
    if (this.fallbackReasons.length > 10) {
      this.fallbackReasons.shift();
    }

    console.warn(`🔄 AI Service fallback activated: ${reason}`);
    if (error) {
      console.warn(`   Error details: ${error.message}`);
    }
  }

  /**
   * Determine if we should attempt AI service or use fallback
   * @returns {boolean} True if should try AI service, false if should use fallback
   */
  shouldTryAIService() {
    // If we've had recent failures, use fallback for a cooling period
    const coolingPeriod = 5 * 60 * 1000; // 5 minutes
    const now = new Date();
    
    if (this.lastFallbackTime && (now - this.lastFallbackTime) < coolingPeriod) {
      const recentFailures = this.fallbackReasons.filter(
        f => (now - f.timestamp) < coolingPeriod
      ).length;
      
      if (recentFailures >= 3) {
        console.warn('🚫 Too many recent AI failures, using fallback mode');
        return false;
      }
    }
    
    return true;
  }

  /**
   * Analyze git context to suggest appropriate template
   * @param {Object} contextData - Git and project context data
   * @returns {string} Suggested template type
   */
  suggestTemplate(contextData = {}) {
    const { commits = [], files = [], topic = '' } = contextData;
    
    // Analyze commit messages for template hints
    const commitMessages = commits.map(c => c.message?.toLowerCase() || '').join(' ');
    const topicLower = topic.toLowerCase();
    
    // Template suggestion logic based on keywords
    const templateKeywords = {
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.FEATURE]: [
        'feat', 'feature', 'add', 'implement', 'new', 'create', 'build'
      ],
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.PROGRESS]: [
        'progress', 'update', 'improve', 'enhance', 'work on', 'continue'
      ],
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.MILESTONE]: [
        'milestone', 'release', 'version', 'complete', 'finish', 'done', 'achieve'
      ],
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.BEHIND_SCENES]: [
        'refactor', 'optimize', 'performance', 'cleanup', 'internal', 'architecture'
      ],
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.COMMUNITY]: [
        'community', 'feedback', 'user', 'player', 'suggestion', 'request'
      ]
    };

    const searchText = `${commitMessages} ${topicLower}`;
    let bestMatch = AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.PROGRESS; // Default
    let highestScore = 0;

    for (const [templateType, keywords] of Object.entries(templateKeywords)) {
      const score = keywords.reduce((count, keyword) => {
        return count + (searchText.includes(keyword) ? 1 : 0);
      }, 0);

      if (score > highestScore) {
        highestScore = score;
        bestMatch = templateType;
      }
    }

    console.log(`💡 Template suggestion based on context: "${bestMatch}" (confidence: ${highestScore})`);
    return bestMatch;
  }

  /**
   * Generate fallback content using template placeholders and context
   * @param {string} templateType - The template type to use
   * @param {Object} contextData - Context data from git/project analysis
   * @param {string} tone - Desired tone (excited, professional, casual)
   * @returns {Object} Generated content with template and placeholders filled
   */
  generateFallbackContent(templateType, contextData = {}, tone = 'professional') {
    const templates = this.getFallbackTemplates();
    const template = templates[templateType] || templates[AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.PROGRESS];
    
    // Extract useful information from context
    const placeholders = this.extractPlaceholders(contextData, tone);
    
    // Fill template with extracted information
    let content = template.template;
    
    for (const [key, value] of Object.entries(placeholders)) {
      const placeholder = `{${key}}`;
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }

    // Add appropriate hashtags
    const hashtags = this.selectHashtags(templateType, contextData);
    if (!content.includes('#')) {
      content += ` ${hashtags.join(' ')}`;
    }

    // Apply tone adjustments
    content = this.adjustToneInFallback(content, tone);

    return {
      templateType,
      content: content.trim(),
      tone,
      source: 'fallback',
      placeholders,
      confidence: 0.6 // Lower confidence for fallback content
    };
  }

  /**
   * Get fallback templates (simplified versions of the original templates)
   * @returns {Object} Template definitions
   */
  getFallbackTemplates() {
    return {
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.FEATURE]: {
        template: "🚀 New feature alert! We've added {feature} to Attrition! {description} What do you think, commanders?"
      },
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.PROGRESS]: {
        template: "📈 Development update: Made great progress on {area}! {details} The universe keeps growing!"
      },
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.MILESTONE]: {
        template: "🎉 Milestone achieved! {achievement} Thank you to our amazing community! {next}"
      },
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.COMMUNITY]: {
        template: "👋 Commanders! {message} What would you like to see next in Attrition? Share your thoughts!"
      },
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.HYPE]: {
        template: "🌌 Ready to conquer the galaxy? Attrition offers {highlight}! {action}"
      },
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.BEHIND_SCENES]: {
        template: "🛠️ Behind the scenes: Working on {work}! Building an MMO is challenging but rewarding. {insight}"
      },
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.QUESTION]: {
        template: "🤔 Question for our community: {question} Your input shapes Attrition's future!"
      }
    };
  }

  /**
   * Extract meaningful placeholders from context data
   * @param {Object} contextData - Context information
   * @param {string} tone - Desired tone
   * @returns {Object} Extracted placeholder values
   */
  extractPlaceholders(contextData, tone) {
    const { commits = [], files = [], topic = '' } = contextData;
    
    // Extract common terms from recent commits
    const commitMessages = commits.slice(0, 5).map(c => c.message || '').join(' ');
    const recentFiles = files.slice(0, 3).map(f => f.path || '').join(', ');
    
    // Create generic but contextual placeholders
    const placeholders = {
      feature: topic || this.extractFeatureName(commitMessages) || 'exciting new functionality',
      area: topic || this.extractWorkArea(recentFiles) || 'core systems',
      description: this.generateDescription(commitMessages, tone),
      details: this.generateDetails(commitMessages, recentFiles),
      achievement: topic || 'another development milestone',
      message: 'We\'ve been hard at work improving the game experience',
      highlight: 'deep strategic gameplay and epic space battles',
      work: topic || this.extractWorkArea(recentFiles) || 'game improvements',
      question: 'What features are you most excited about?',
      action: 'Join the adventure today!',
      next: 'More exciting updates coming soon!',
      insight: 'Every line of code brings us closer to launch!'
    };

    return placeholders;
  }

  /**
   * Extract feature name from commit messages
   * @param {string} commitMessages - Combined commit messages
   * @returns {string} Extracted feature name
   */
  extractFeatureName(commitMessages) {
    const featurePatterns = [
      /add|implement|create (.+?)(?:\s|$|\.)/i,
      /feat(?:ure)?:\s*(.+?)(?:\s|$|\.)/i,
      /new (.+?)(?:\s|$|\.)/i
    ];

    for (const pattern of featurePatterns) {
      const match = commitMessages.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/[^\w\s-]/g, '').substring(0, 30);
      }
    }

    return null;
  }

  /**
   * Extract work area from file paths
   * @param {string} filePaths - Combined file paths
   * @returns {string} Extracted work area
   */
  extractWorkArea(filePaths) {
    const areaMap = {
      'ui|interface|component': 'user interface',
      'battle|combat|fight': 'battle system',
      'trade|market|economy': 'trading system',
      'fleet|ship': 'fleet management',
      'planet|territory': 'planetary systems',
      'auth|login|user': 'authentication',
      'database|db|model': 'data systems',
      'api|server|backend': 'server infrastructure',
      'test|spec': 'testing framework'
    };

    const lowerPaths = filePaths.toLowerCase();
    
    for (const [pattern, area] of Object.entries(areaMap)) {
      if (new RegExp(pattern).test(lowerPaths)) {
        return area;
      }
    }

    return null;
  }

  /**
   * Generate description based on commits and tone
   * @param {string} commitMessages - Commit messages
   * @param {string} tone - Desired tone
   * @returns {string} Generated description
   */
  generateDescription(commitMessages, tone) {
    const baseDescriptions = [
      'This brings exciting new possibilities to your space empire',
      'Another step forward in creating the ultimate MMO experience',
      'We think you\'ll love what this adds to the game'
    ];

    const toneVariations = {
      excited: 'This is going to be AMAZING for your galactic conquests! 🎉',
      professional: 'This enhancement improves gameplay mechanics and user experience.',
      casual: 'Pretty cool stuff that should make things more fun!'
    };

    return toneVariations[tone] || baseDescriptions[Math.floor(Math.random() * baseDescriptions.length)];
  }

  /**
   * Generate details based on context
   * @param {string} commitMessages - Commit messages
   * @param {string} files - File changes
   * @returns {string} Generated details
   */
  generateDetails(commitMessages, files) {
    if (commitMessages.includes('fix') || commitMessages.includes('bug')) {
      return 'Fixed several issues and improved stability.';
    }
    
    if (files.includes('ui') || files.includes('component')) {
      return 'Enhanced the user interface for better experience.';
    }
    
    if (files.includes('api') || files.includes('server')) {
      return 'Improved backend performance and reliability.';
    }

    return 'Lots of improvements under the hood!';
  }

  /**
   * Select appropriate hashtags based on template type and context
   * @param {string} templateType - Template type
   * @param {Object} contextData - Context data
   * @returns {Array<string>} Selected hashtags
   */
  selectHashtags(templateType, contextData) {
    const baseHashtags = AI_CONFIG_CONSTANTS.REQUIRED_HASHTAGS.slice();
    const optionalHashtags = AI_CONFIG_CONSTANTS.OPTIONAL_HASHTAGS;

    // Add template-specific hashtags
    const templateHashtags = {
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.FEATURE]: ['#NewFeature'],
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.PROGRESS]: ['#Progress'],
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.MILESTONE]: ['#Milestone', '#Achievement'],
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.COMMUNITY]: ['#Community', '#Feedback'],
      [AI_CONFIG_CONSTANTS.TEMPLATE_TYPES.BEHIND_SCENES]: ['#BehindTheScenes']
    };

    const specificHashtags = templateHashtags[templateType] || [];
    
    return [...baseHashtags, ...specificHashtags.slice(0, 2)]; // Limit total hashtags
  }

  /**
   * Adjust content tone for fallback content
   * @param {string} content - Original content
   * @param {string} tone - Desired tone
   * @returns {string} Tone-adjusted content
   */
  adjustToneInFallback(content, tone) {
    switch (tone) {
      case 'excited':
        return content
          .replace(/\./g, '! ')
          .replace(/We've/g, 'We\'ve just')
          .replace(/This/g, 'This amazing')
          + ' 🚀';
      
      case 'casual':
        return content
          .replace(/We have/g, 'We\'ve got')
          .replace(/We are/g, 'We\'re')
          .replace(/commanders/g, 'folks');
      
      case 'professional':
      default:
        return content;
    }
  }

  /**
   * Get fallback statistics and status
   * @returns {Object} Fallback handler status
   */
  getStatus() {
    return {
      fallbackCount: this.fallbackCount,
      lastFallbackTime: this.lastFallbackTime,
      recentFailures: this.fallbackReasons.slice(-5),
      isInCoolingPeriod: !this.shouldTryAIService(),
      cooldownRemaining: this.getCooldownRemaining()
    };
  }

  /**
   * Get remaining cooldown time in milliseconds
   * @returns {number} Milliseconds remaining in cooldown
   */
  getCooldownRemaining() {
    if (!this.lastFallbackTime) return 0;
    
    const coolingPeriod = 5 * 60 * 1000; // 5 minutes
    const elapsed = new Date() - this.lastFallbackTime;
    
    return Math.max(0, coolingPeriod - elapsed);
  }

  /**
   * Reset fallback state (useful for testing or manual reset)
   */
  reset() {
    this.fallbackReasons = [];
    this.lastFallbackTime = null;
    this.fallbackCount = 0;
    console.log('🔄 AI Fallback handler reset');
  }

  /**
   * Create user-friendly fallback explanation
   * @param {string} reason - Fallback reason
   * @returns {string} User-friendly explanation
   */
  getFallbackExplanation(reason) {
    const explanations = {
      'ai-service-unavailable': '🤖 AI service is temporarily unavailable. Using smart templates instead.',
      'api-key-missing': '🔑 AI API key not configured. Using manual template selection.',
      'rate-limit-exceeded': '⏳ API rate limit reached. Using fallback to avoid delays.',
      'network-error': '🌐 Network connectivity issues. Using offline template generation.',
      'configuration-error': '⚙️ AI configuration issue. Using fallback mode.',
      'too-many-failures': '🚫 Multiple AI failures detected. Using stable fallback mode.'
    };

    return explanations[reason] || '🔄 AI service issue detected. Using fallback content generation.';
  }
}

// Export singleton instance
let fallbackInstance = null;

/**
 * Get the singleton AI fallback handler instance
 * @returns {AIFallbackHandler} Singleton fallback handler instance
 */
function getAIFallbackHandler() {
  if (!fallbackInstance) {
    fallbackInstance = new AIFallbackHandler();
  }
  return fallbackInstance;
}

module.exports = {
  AIFallbackHandler,
  getAIFallbackHandler
};
/**
 * Game Metrics Collector Service
 * 
 * Collects real-time metrics from the Attrition MMO server for social media
 * content generation. Integrates with the existing Context Analysis Engine
 * to provide game-specific context alongside development updates.
 * 
 * Features:
 * - Live server status monitoring
 * - Player activity tracking  
 * - Game event detection
 * - Smart caching and rate limiting
 * - Integration with Context Analysis Engine
 */

const axios = require('axios');
const { getAIConfig } = require('../../config/ai-config');

/**
 * Game Metrics Collector
 * Monitors the MMO server and collects metrics for social media generation
 */
class GameMetricsCollector {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'http://localhost:3001';
    this.statusEndpoint = '/api/status';
    this.cacheTimeout = options.cacheTimeout || 30000; // 30 seconds
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    // Cached metrics
    this.cache = new Map();
    this.initialized = false;
    
    // Historical tracking for event detection
    this.history = {
      playerCounts: [],
      events: [],
      peaks: {
        dailyPeak: 0,
        weeklyPeak: 0,
        allTimePeak: 0
      }
    };
    
    this.config = null;
  }

  /**
   * Initialize the game metrics collector
   */
  async initialize() {
    try {
      this.config = getAIConfig();
      
      // Test connection to game server
      await this.testServerConnection();
      
      this.initialized = true;
      console.log('🎮 Game Metrics Collector initialized successfully');
      
    } catch (error) {
      console.warn('⚠️ Game Metrics Collector initialization failed:', error.message);
      // Don't throw - graceful degradation
      this.initialized = false;
    }
  }

  /**
   * Test connection to the game server
   */
  async testServerConnection() {
    try {
      const response = await axios.get(`${this.serverUrl}${this.statusEndpoint}`, {
        timeout: 5000
      });
      
      if (response.status === 200 && response.data.success) {
        return true;
      }
      
      throw new Error('Server responded but status check failed');
    } catch (error) {
      throw new Error(`Cannot connect to game server: ${error.message}`);
    }
  }

  /**
   * Get current server metrics
   * @param {boolean} useCache - Whether to use cached results
   * @returns {Promise<Object>} Server metrics
   */
  async getServerMetrics(useCache = true) {
    const cacheKey = 'server_metrics';
    
    // Check cache first
    if (useCache && this.hasValidCache(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      let lastError = null;
      
      // Retry logic
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const response = await axios.get(`${this.serverUrl}${this.statusEndpoint}`, {
            timeout: 10000
          });

          if (response.status === 200 && response.data.success) {
            const metrics = this.processServerMetrics(response.data.data);
            
            // Cache the result
            this.cache.set(cacheKey, {
              data: metrics,
              timestamp: Date.now()
            });

            // Update historical tracking
            this.updateHistory(metrics);

            return metrics;
          }
          
        } catch (error) {
          lastError = error;
          console.warn(`🎮 Server metrics attempt ${attempt}/${this.maxRetries} failed:`, error.message);
          
          if (attempt < this.maxRetries) {
            await this.delay(this.retryDelay * attempt);
          }
        }
      }
      
      throw new Error(`Failed to get server metrics after ${this.maxRetries} attempts: ${lastError?.message}`);
      
    } catch (error) {
      console.error('❌ Error fetching server metrics:', error.message);
      
      // Return cached data if available, otherwise return null
      if (this.cache.has(cacheKey)) {
        console.log('📋 Using cached server metrics due to error');
        return this.cache.get(cacheKey).data;
      }
      
      return null;
    }
  }

  /**
   * Process raw server metrics into standardized format
   * @param {Object} rawMetrics - Raw server response
   * @returns {Object} Processed metrics
   */
  processServerMetrics(rawMetrics) {
    const processed = {
      // Server Status
      status: rawMetrics.status,
      version: rawMetrics.version,
      environment: rawMetrics.environment,
      secure: rawMetrics.secure,
      
      // Timing
      startedAt: rawMetrics.startedAt,
      uptimeSeconds: rawMetrics.uptimeSeconds,
      uptimeFormatted: this.formatUptime(rawMetrics.uptimeSeconds),
      lastChecked: new Date().toISOString(),
      
      // Player Activity
      playersOnline: rawMetrics.playersOnline || 0,
      socketsConnected: rawMetrics.socketsConnected || 0,
      
      // Calculated Metrics
      serverLoad: this.calculateServerLoad(rawMetrics),
      activityLevel: this.calculateActivityLevel(rawMetrics.playersOnline),
      
      // Historical Context
      isPeakActivity: this.isPeakActivity(rawMetrics.playersOnline),
      trendDirection: this.getTrendDirection(rawMetrics.playersOnline)
    };

    return processed;
  }

  /**
   * Update historical tracking with new metrics
   * @param {Object} metrics - Current metrics
   */
  updateHistory(metrics) {
    const now = Date.now();
    const playerCount = metrics.playersOnline;

    // Add to player count history (keep last 24 hours)
    this.history.playerCounts.push({
      timestamp: now,
      count: playerCount
    });

    // Clean old history (24 hours = 86400000 ms)
    const cutoff = now - 86400000;
    this.history.playerCounts = this.history.playerCounts.filter(
      entry => entry.timestamp > cutoff
    );

    // Update peaks
    if (playerCount > this.history.peaks.dailyPeak) {
      this.history.peaks.dailyPeak = playerCount;
      
      // Generate peak event
      this.history.events.push({
        type: 'peak_activity',
        timestamp: now,
        data: { playerCount, type: 'daily' },
        significance: 'medium'
      });
    }

    if (playerCount > this.history.peaks.allTimePeak) {
      this.history.peaks.allTimePeak = playerCount;
      
      // Generate all-time peak event (high significance)
      this.history.events.push({
        type: 'peak_activity',
        timestamp: now,
        data: { playerCount, type: 'all_time' },
        significance: 'high'
      });
    }

    // Clean old events (keep last 7 days)
    const eventCutoff = now - (7 * 24 * 60 * 60 * 1000);
    this.history.events = this.history.events.filter(
      event => event.timestamp > eventCutoff
    );
  }

  /**
   * Calculate server load based on metrics
   * @param {Object} metrics - Server metrics
   * @returns {string} Load level: 'low', 'medium', 'high'
   */
  calculateServerLoad(metrics) {
    const players = metrics.playersOnline || 0;
    const sockets = metrics.socketsConnected || 0;
    
    // Simple heuristic - can be enhanced based on server capacity
    if (players >= 50 || sockets >= 100) return 'high';
    if (players >= 20 || sockets >= 40) return 'medium';
    return 'low';
  }

  /**
   * Calculate activity level based on player count
   * @param {number} playerCount - Current player count
   * @returns {string} Activity level
   */
  calculateActivityLevel(playerCount) {
    if (playerCount >= 30) return 'buzzing';
    if (playerCount >= 15) return 'active';
    if (playerCount >= 5) return 'steady';
    if (playerCount >= 1) return 'quiet';
    return 'empty';
  }

  /**
   * Check if current activity is peak activity
   * @param {number} currentPlayers - Current player count
   * @returns {boolean} True if peak activity
   */
  isPeakActivity(currentPlayers) {
    if (this.history.playerCounts.length < 10) return false;
    
    // Get average of last hour
    const oneHourAgo = Date.now() - 3600000;
    const recentCounts = this.history.playerCounts
      .filter(entry => entry.timestamp > oneHourAgo)
      .map(entry => entry.count);
    
    if (recentCounts.length === 0) return false;
    
    const average = recentCounts.reduce((sum, count) => sum + count, 0) / recentCounts.length;
    
    // Peak if current is 50% above recent average
    return currentPlayers > (average * 1.5);
  }

  /**
   * Get trend direction for player count
   * @param {number} currentPlayers - Current player count
   * @returns {string} Trend: 'rising', 'falling', 'stable'
   */
  getTrendDirection(currentPlayers) {
    if (this.history.playerCounts.length < 5) return 'stable';
    
    const recent = this.history.playerCounts.slice(-5);
    const older = this.history.playerCounts.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, entry) => sum + entry.count, 0) / recent.length;
    const olderAvg = older.reduce((sum, entry) => sum + entry.count, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (Math.abs(difference) < 2) return 'stable';
    return difference > 0 ? 'rising' : 'falling';
  }

  /**
   * Get recent game events for social media context
   * @param {Object} options - Filter options
   * @returns {Array} Recent events
   */
  getRecentEvents(options = {}) {
    const {
      since = Date.now() - 3600000, // Last hour
      significance = ['low', 'medium', 'high'],
      limit = 10
    } = options;

    return this.history.events
      .filter(event => 
        event.timestamp > since && 
        significance.includes(event.significance)
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Generate social media context from game metrics
   * @param {Object} options - Context options
   * @returns {Promise<Object>} Game context for social media
   */
  async generateSocialContext(options = {}) {
    if (!this.initialized) {
      return {
        available: false,
        reason: 'Game metrics collector not initialized'
      };
    }

    try {
      const metrics = await this.getServerMetrics();
      if (!metrics) {
        return {
          available: false,
          reason: 'Unable to fetch server metrics'
        };
      }

      const recentEvents = this.getRecentEvents(options);
      
      return {
        available: true,
        metrics,
        events: recentEvents,
        context: {
          serverStatus: metrics.status,
          playerActivity: {
            current: metrics.playersOnline,
            level: metrics.activityLevel,
            trend: metrics.trendDirection,
            isPeak: metrics.isPeakActivity
          },
          serverHealth: {
            uptime: metrics.uptimeFormatted,
            load: metrics.serverLoad,
            environment: metrics.environment
          }
        },
        suggestedTone: this.suggestToneFromMetrics(metrics),
        lastUpdated: metrics.lastChecked
      };

    } catch (error) {
      console.error('❌ Error generating social context from game metrics:', error.message);
      return {
        available: false,
        reason: error.message
      };
    }
  }

  /**
   * Suggest social media tone based on game metrics
   * @param {Object} metrics - Game metrics
   * @returns {string} Suggested tone
   */
  suggestToneFromMetrics(metrics) {
    if (metrics.isPeakActivity || metrics.playersOnline >= 25) {
      return 'excited';
    }
    
    if (metrics.trendDirection === 'rising') {
      return 'professional';
    }
    
    if (metrics.activityLevel === 'quiet' || metrics.playersOnline === 0) {
      return 'casual';
    }
    
    return 'auto';
  }

  /**
   * Format uptime in human readable format
   * @param {number} seconds - Uptime in seconds
   * @returns {string} Formatted uptime
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Check if cached data is still valid
   * @param {string} cacheKey - Cache key to check
   * @returns {boolean} True if cache is valid
   */
  hasValidCache(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    return age < this.cacheTimeout;
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get collector status and diagnostics
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      serverUrl: this.serverUrl,
      cacheSize: this.cache.size,
      historySize: {
        playerCounts: this.history.playerCounts.length,
        events: this.history.events.length
      },
      peaks: this.history.peaks,
      config: this.config ? 'loaded' : 'not-loaded'
    };
  }

  /**
   * Test the game metrics collection
   * @returns {Promise<Object>} Test results
   */
  async testCollection() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const metrics = await this.getServerMetrics(false); // Force fresh data
      const context = await this.generateSocialContext();
      
      return {
        success: true,
        serverConnection: metrics !== null,
        metricsCollected: metrics !== null,
        contextGenerated: context.available,
        sampleData: {
          playersOnline: metrics?.playersOnline || 0,
          serverStatus: metrics?.status || 'unknown',
          activityLevel: metrics?.activityLevel || 'unknown'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
let collectorInstance = null;

/**
 * Get the singleton game metrics collector instance
 * @param {Object} options - Initialization options
 * @returns {GameMetricsCollector} Singleton instance
 */
function getGameMetricsCollector(options = {}) {
  if (!collectorInstance) {
    collectorInstance = new GameMetricsCollector(options);
  }
  return collectorInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
function resetGameMetricsCollector() {
  collectorInstance = null;
}

module.exports = {
  GameMetricsCollector,
  getGameMetricsCollector,
  resetGameMetricsCollector
};
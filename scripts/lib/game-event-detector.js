/**
 * Game Event Detection Engine
 * 
 * Analyzes game metrics and historical data to detect significant events
 * that are worth posting about on social media. Prevents spam by using
 * intelligent significance scoring and rate limiting.
 * 
 * Features:
 * - Player milestone detection
 * - Peak activity recognition
 * - Server performance events
 * - Trending analysis
 * - Smart significance scoring
 * - Rate limiting and cooldowns
 */

/**
 * Game Event Detection Engine
 * Detects significant game events worthy of social media posts
 */
class GameEventDetector {
  constructor(options = {}) {
    this.options = {
      // Significance thresholds
      minPlayerCountForMilestone: 5,
      peakActivityThreshold: 1.5, // 50% above average
      uptimeMillestoneHours: [24, 72, 168, 720], // 1d, 3d, 1w, 1m
      
      // Rate limiting
      cooldownPeriods: {
        'peak_activity': 3600000, // 1 hour
        'player_milestone': 1800000, // 30 minutes
        'uptime_milestone': 43200000, // 12 hours
        'server_recovery': 7200000, // 2 hours
        'new_player': 300000 // 5 minutes
      },
      
      // Event history retention
      maxEventHistory: 1000,
      eventRetentionDays: 30,
      
      ...options
    };

    // Event tracking
    this.eventHistory = [];
    this.lastEventTimes = new Map();
    this.processedMilestones = new Set();
    
    this.initialized = false;
  }

  /**
   * Initialize the event detector
   */
  initialize() {
    this.initialized = true;
    console.log('🎯 Game Event Detector initialized');
  }

  /**
   * Analyze metrics and detect significant events
   * @param {Object} currentMetrics - Current server metrics
   * @param {Object} previousMetrics - Previous metrics for comparison
   * @param {Array} historicalData - Historical metrics data
   * @returns {Array} Detected events
   */
  detectEvents(currentMetrics, previousMetrics = null, historicalData = []) {
    if (!this.initialized) {
      this.initialize();
    }

    const events = [];
    const now = Date.now();

    try {
      // Clean up old events first
      this.cleanupOldEvents();

      // Detect various types of events
      events.push(...this.detectPeakActivity(currentMetrics, historicalData, now));
      events.push(...this.detectPlayerMilestones(currentMetrics, previousMetrics, now));
      events.push(...this.detectUptimeMilestones(currentMetrics, now));
      events.push(...this.detectServerEvents(currentMetrics, previousMetrics, now));
      events.push(...this.detectTrendingEvents(currentMetrics, historicalData, now));

      // Filter out events that are in cooldown
      const filteredEvents = events.filter(event => 
        this.isEventAllowed(event.type, now)
      );

      // Sort by significance (highest first)
      filteredEvents.sort((a, b) => b.significance - a.significance);

      // Update event tracking
      filteredEvents.forEach(event => {
        this.recordEvent(event, now);
      });

      return filteredEvents;

    } catch (error) {
      console.error('❌ Error detecting game events:', error.message);
      return [];
    }
  }

  /**
   * Detect peak activity events
   * @param {Object} metrics - Current metrics
   * @param {Array} historical - Historical data
   * @param {number} timestamp - Current timestamp
   * @returns {Array} Peak activity events
   */
  detectPeakActivity(metrics, historical, timestamp) {
    const events = [];
    const currentPlayers = metrics.playersOnline || 0;

    // Need historical data to determine peaks
    if (historical.length < 10) {
      return events;
    }

    // Calculate recent average (last 2 hours)
    const twoHoursAgo = timestamp - 7200000;
    const recentData = historical.filter(h => h.timestamp > twoHoursAgo);
    
    if (recentData.length < 5) {
      return events;
    }

    const recentAverage = recentData.reduce((sum, h) => sum + (h.playersOnline || 0), 0) / recentData.length;
    const isSignificantPeak = currentPlayers > (recentAverage * this.options.peakActivityThreshold);

    if (isSignificantPeak && currentPlayers >= this.options.minPlayerCountForMilestone) {
      // Determine peak significance
      let significance = 0.6; // Base significance
      
      if (currentPlayers > recentAverage * 2) {
        significance = 0.9; // Very significant peak
      } else if (currentPlayers > recentAverage * 1.8) {
        significance = 0.8; // High significance
      } else if (currentPlayers > recentAverage * 1.6) {
        significance = 0.7; // Medium-high significance
      }

      // Check if this is an all-time peak
      const allTimeMax = Math.max(...historical.map(h => h.playersOnline || 0));
      const isAllTimePeak = currentPlayers > allTimeMax;

      events.push({
        type: 'peak_activity',
        subtype: isAllTimePeak ? 'all_time_peak' : 'daily_peak',
        significance,
        timestamp,
        data: {
          currentPlayers,
          previousAverage: Math.round(recentAverage),
          peakMultiplier: Math.round((currentPlayers / recentAverage) * 100) / 100,
          isAllTimePeak,
          activityLevel: metrics.activityLevel
        },
        suggestedContent: {
          excited: isAllTimePeak 
            ? `🚀 ALL-TIME PEAK! ${currentPlayers} players are online right now in Attrition! This is our biggest moment yet! 🎮✨`
            : `🔥 Attrition is absolutely BUZZING! ${currentPlayers} players online right now - ${Math.round(((currentPlayers / recentAverage) - 1) * 100)}% above normal! Join the action! 🎮`,
          
          professional: isAllTimePeak
            ? `📈 Milestone achieved: ${currentPlayers} concurrent players - a new all-time record for Attrition! Thank you to our amazing community! 🎮`
            : `📊 Peak activity detected: ${currentPlayers} players online (${Math.round(((currentPlayers / recentAverage) - 1) * 100)}% above average). Great engagement today! 🎮`,
          
          casual: `Hey everyone! ${currentPlayers} players are exploring the Attrition universe right now ${isAllTimePeak ? '- our biggest crowd ever! 🚀' : '🌟'}`
        }
      });
    }

    return events;
  }

  /**
   * Detect player count milestones
   * @param {Object} metrics - Current metrics
   * @param {Object} previous - Previous metrics
   * @param {number} timestamp - Current timestamp
   * @returns {Array} Milestone events
   */
  detectPlayerMilestones(metrics, previous, timestamp) {
    const events = [];
    const currentPlayers = metrics.playersOnline || 0;
    const previousPlayers = previous?.playersOnline || 0;

    // Define milestone thresholds
    const milestones = [10, 25, 50, 75, 100, 150, 200];

    for (const milestone of milestones) {
      const milestoneKey = `players_${milestone}`;
      
      // Check if we just reached this milestone
      if (currentPlayers >= milestone && 
          previousPlayers < milestone && 
          !this.processedMilestones.has(milestoneKey)) {
        
        this.processedMilestones.add(milestoneKey);
        
        let significance = 0.5;
        if (milestone >= 100) significance = 0.9;
        else if (milestone >= 50) significance = 0.8;
        else if (milestone >= 25) significance = 0.7;
        else if (milestone >= 10) significance = 0.6;

        events.push({
          type: 'player_milestone',
          subtype: 'concurrent_players',
          significance,
          timestamp,
          data: {
            milestone,
            currentPlayers,
            previousPlayers
          },
          suggestedContent: {
            excited: `🎉 MILESTONE UNLOCKED! ${milestone}+ players online in Attrition! The universe is getting crowded and we LOVE IT! 🚀🎮`,
            professional: `📈 Player milestone achieved: ${milestone} concurrent players online. Thank you for being part of the Attrition community! 🎮`,
            casual: `Wow! Just hit ${milestone} players online at the same time! The Attrition universe is bustling! 🌟`
          }
        });
      }
    }

    return events;
  }

  /**
   * Detect uptime milestones
   * @param {Object} metrics - Current metrics
   * @param {number} timestamp - Current timestamp
   * @returns {Array} Uptime milestone events
   */
  detectUptimeMilestones(metrics, timestamp) {
    const events = [];
    const uptimeHours = Math.floor((metrics.uptimeSeconds || 0) / 3600);

    for (const milestoneHours of this.options.uptimeMillestoneHours) {
      const milestoneKey = `uptime_${milestoneHours}h`;
      
      if (uptimeHours >= milestoneHours && !this.processedMilestones.has(milestoneKey)) {
        this.processedMilestones.add(milestoneKey);
        
        let significance = 0.4; // Base uptime significance
        if (milestoneHours >= 720) significance = 0.8; // 1 month
        else if (milestoneHours >= 168) significance = 0.7; // 1 week
        else if (milestoneHours >= 72) significance = 0.6; // 3 days

        const uptimeDescription = this.formatUptimeDescription(milestoneHours);

        events.push({
          type: 'uptime_milestone',
          subtype: 'server_stability',
          significance,
          timestamp,
          data: {
            uptimeHours,
            milestone: milestoneHours,
            uptimeFormatted: metrics.uptimeFormatted
          },
          suggestedContent: {
            excited: `💪 Rock solid performance! Attrition server has been running ${uptimeDescription} straight without interruption! That's reliability! 🚀⚡`,
            professional: `🛡️ Server milestone: ${uptimeDescription} of continuous uptime. Committed to providing stable service for our players. 🎮`,
            casual: `Our server has been purring along for ${uptimeDescription} now! Smooth sailing in space! ⭐`
          }
        });
      }
    }

    return events;
  }

  /**
   * Detect server events (recovery, issues, etc.)
   * @param {Object} metrics - Current metrics
   * @param {Object} previous - Previous metrics
   * @param {number} timestamp - Current timestamp
   * @returns {Array} Server events
   */
  detectServerEvents(metrics, previous, timestamp) {
    const events = [];

    if (!previous) return events;

    // Server recovery detection
    if (previous.status !== 'OK' && metrics.status === 'OK') {
      events.push({
        type: 'server_recovery',
        subtype: 'status_restored',
        significance: 0.7,
        timestamp,
        data: {
          previousStatus: previous.status,
          currentStatus: metrics.status,
          downtime: timestamp - (previous.lastChecked ? new Date(previous.lastChecked).getTime() : timestamp)
        },
        suggestedContent: {
          excited: `🎉 We're back! Attrition server is fully operational again! Thanks for your patience, commanders! 🚀`,
          professional: `✅ Server status restored. All Attrition services are now operating normally. Thank you for your patience during the brief interruption.`,
          casual: `All good in space again! Server's back up and running smoothly! 🌟`
        }
      });
    }

    // Load improvement detection
    if (previous.serverLoad === 'high' && metrics.serverLoad === 'medium') {
      events.push({
        type: 'performance_improvement',
        subtype: 'load_reduced',
        significance: 0.5,
        timestamp,
        data: {
          previousLoad: previous.serverLoad,
          currentLoad: metrics.serverLoad,
          playersOnline: metrics.playersOnline
        },
        suggestedContent: {
          professional: `⚡ Performance optimization successful! Server load improved while maintaining ${metrics.playersOnline} active players. 🎮`,
          casual: `Server's running even smoother now! Performance upgrades paying off! 🔧✨`
        }
      });
    }

    return events;
  }

  /**
   * Detect trending events based on activity patterns
   * @param {Object} metrics - Current metrics
   * @param {Array} historical - Historical data
   * @param {number} timestamp - Current timestamp
   * @returns {Array} Trending events
   */
  detectTrendingEvents(metrics, historical, timestamp) {
    const events = [];

    if (historical.length < 20) return events;

    // Sustained activity growth
    if (metrics.trendDirection === 'rising') {
      const recentHour = historical.slice(-12); // Last hour (assuming 5min intervals)
      const consistentGrowth = recentHour.every((data, index) => {
        return index === 0 || data.playersOnline >= recentHour[index - 1].playersOnline;
      });

      if (consistentGrowth && recentHour.length >= 6) {
        const growthAmount = recentHour[recentHour.length - 1].playersOnline - recentHour[0].playersOnline;
        
        if (growthAmount >= 5) {
          events.push({
            type: 'trending_growth',
            subtype: 'sustained_increase',
            significance: 0.6,
            timestamp,
            data: {
              growthAmount,
              currentPlayers: metrics.playersOnline,
              trendDirection: metrics.trendDirection
            },
            suggestedContent: {
              excited: `📈 Trending up! Player count has been steadily climbing - ${growthAmount} more commanders joined in the last hour! 🚀`,
              professional: `📊 Positive engagement trend: Sustained player growth with ${growthAmount} additional active users in the past hour. 🎮`,
              casual: `Things are picking up! ${growthAmount} more players joined recently! 🌟`
            }
          });
        }
      }
    }

    return events;
  }

  /**
   * Check if an event type is allowed (not in cooldown)
   * @param {string} eventType - Type of event
   * @param {number} timestamp - Current timestamp
   * @returns {boolean} True if event is allowed
   */
  isEventAllowed(eventType, timestamp) {
    const lastTime = this.lastEventTimes.get(eventType);
    if (!lastTime) return true;

    const cooldown = this.options.cooldownPeriods[eventType] || 3600000; // 1 hour default
    return (timestamp - lastTime) > cooldown;
  }

  /**
   * Record an event for tracking and cooldown purposes
   * @param {Object} event - Event object
   * @param {number} timestamp - Current timestamp
   */
  recordEvent(event, timestamp) {
    // Update last event time for cooldown tracking
    this.lastEventTimes.set(event.type, timestamp);

    // Add to event history
    this.eventHistory.push({
      ...event,
      recorded: timestamp
    });

    // Trim history if it gets too long
    if (this.eventHistory.length > this.options.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-this.options.maxEventHistory);
    }
  }

  /**
   * Clean up old events and reset milestones
   */
  cleanupOldEvents() {
    const now = Date.now();
    const cutoff = now - (this.options.eventRetentionDays * 24 * 60 * 60 * 1000);

    // Clean event history
    this.eventHistory = this.eventHistory.filter(event => event.recorded > cutoff);

    // Reset milestone tracking for old milestones (daily reset)
    const dailyCutoff = now - (24 * 60 * 60 * 1000);
    const milestonesToRemove = [];
    
    for (const milestone of this.processedMilestones) {
      // Reset player milestones daily, keep uptime milestones permanently
      if (milestone.startsWith('players_') && Math.random() < 0.1) { // Random cleanup
        milestonesToRemove.push(milestone);
      }
    }
    
    milestonesToRemove.forEach(milestone => {
      this.processedMilestones.delete(milestone);
    });
  }

  /**
   * Format uptime description
   * @param {number} hours - Uptime in hours
   * @returns {string} Formatted description
   */
  formatUptimeDescription(hours) {
    if (hours >= 8760) return `${Math.floor(hours / 8760)} year${Math.floor(hours / 8760) > 1 ? 's' : ''}`;
    if (hours >= 720) return `${Math.floor(hours / 720)} month${Math.floor(hours / 720) > 1 ? 's' : ''}`;
    if (hours >= 168) return `${Math.floor(hours / 168)} week${Math.floor(hours / 168) > 1 ? 's' : ''}`;
    if (hours >= 24) return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  /**
   * Get the most significant recent events
   * @param {Object} options - Filter options
   * @returns {Array} Recent significant events
   */
  getRecentSignificantEvents(options = {}) {
    const {
      since = Date.now() - 3600000, // Last hour
      minSignificance = 0.6,
      limit = 5
    } = options;

    return this.eventHistory
      .filter(event => 
        event.recorded > since && 
        event.significance >= minSignificance
      )
      .sort((a, b) => b.significance - a.significance)
      .slice(0, limit);
  }

  /**
   * Get detector status and statistics
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      eventHistory: this.eventHistory.length,
      processedMilestones: this.processedMilestones.size,
      cooldownPeriods: Object.keys(this.options.cooldownPeriods).length,
      recentEvents: this.eventHistory.slice(-10).map(e => ({
        type: e.type,
        significance: e.significance,
        timestamp: e.timestamp
      }))
    };
  }

  /**
   * Reset the detector state (useful for testing)
   */
  reset() {
    this.eventHistory = [];
    this.lastEventTimes.clear();
    this.processedMilestones.clear();
  }
}

module.exports = {
  GameEventDetector
};
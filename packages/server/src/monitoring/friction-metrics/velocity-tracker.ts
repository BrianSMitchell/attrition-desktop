/**
 * Development velocity tracking system
 * Monitors PR throughput, cycle time, deployment frequency, and feature delivery speed
 */

import { HTTP_STATUS } from '../../constants/response-formats';
import {
  FrictionConfig,
  GitAnalytics,
  DevelopmentVelocity
} from './types';

export class VelocityTracker {
  private config: FrictionConfig;
  private gitData: GitAnalytics | null = null;
  private lastCollection: Date | null = null;

  constructor(config: FrictionConfig) {
    this.config = config;
  }

  /**
   * Collect current velocity metrics
   */
  async collectVelocityMetrics(): Promise<DevelopmentVelocity> {
    const now = new Date();
    const period = this.calculateCollectionPeriod(now);

    // Parallel collection for better performance
    const [prMetrics, cycleTimeMetrics, deploymentMetrics, featureMetrics] = await Promise.all([
      this.collectPRThroughput(period),
      this.collectCycleTimeMetrics(period),
      this.collectDeploymentMetrics(period),
      this.collectFeatureDeliveryMetrics(period)
    ]);

    this.lastCollection = now;

    return {
      prThroughput: prMetrics,
      cycleTime: cycleTimeMetrics,
      deploymentFrequency: deploymentMetrics,
      featureDeliverySpeed: featureMetrics
    };
  }

  /**
   * Calculate collection period based on configuration
   */
  private calculateCollectionPeriod(currentTime: Date) {
    const interval = this.config.collection.interval;
    const start = new Date(currentTime.getTime() - interval);

    return { start, end: currentTime, duration: interval };
  }

  /**
   * Collect PR throughput metrics
   */
  private async collectPRThroughput(period: { start: Date; end: Date }) {
    // In a real implementation, this would query Git data
    // For now, we'll use mock data that would be replaced with actual Git analytics

    const mockPRs = await this.getPRData(period);
    const count = mockPRs.length;
    const target = this.config.thresholds.velocity.minPrThroughput;

    // Calculate trend (simplified - would use historical data)
    const trend = this.calculatePRTrend(count, target);

    return {
      count,
      target,
      trend
    };
  }

  /**
   * Collect cycle time metrics (time from PR creation to merge)
   */
  private async collectCycleTimeMetrics(period: { start: Date; end: Date }) {
    const mockPRs = await this.getPRData(period);

    if (mockPRs.length === 0) {
      return {
        average: 0,
        median: 0,
        target: this.config.thresholds.velocity.maxCycleTime,
        trend: 'stable' as const
      };
    }

    const cycleTimes = mockPRs.map(pr => pr.cycleTimeHours);
    const average = cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length;
    const sorted = [...cycleTimes].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    const target = this.config.thresholds.velocity.maxCycleTime;
    const trend = this.calculateCycleTimeTrend(average, target);

    return {
      average,
      median,
      target,
      trend
    };
  }

  /**
   * Collect deployment frequency metrics
   */
  private async collectDeploymentMetrics(period: { start: Date; end: Date }) {
    const mockDeployments = await this.getDeploymentData(period);
    const count = mockDeployments.length;
    const target = this.config.thresholds.velocity.minDeploymentFrequency;

    // Calculate trend
    const trend = this.calculatePRTrend(count, target);

    return {
      count,
      target,
      trend
    };
  }

  /**
   * Collect feature delivery speed metrics
   */
  private async collectFeatureDeliveryMetrics(period: { start: Date; end: Date }) {
    const mockFeatures = await this.getFeatureData(period);

    if (mockFeatures.length === 0) {
      return {
        average: 0,
        trend: 'stable' as const
      };
    }

    const deliveryTimes = mockFeatures.map(feature => feature.deliveryTimeDays);
    const average = deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length;

    // Calculate trend (simplified)
    const trend = this.calculateFeatureTrend(average);

    return {
      average,
      trend
    };
  }

  /**
   * Mock Git data collection (replace with actual Git analytics)
   */
  private async getPRData(period: { start: Date; end: Date }) {
    // In production, this would:
    // 1. Query GitHub/GitLab API for PRs in time range
    // 2. Calculate cycle times from creation to merge
    // 3. Analyze PR sizes and complexity

    // Mock data for demonstration
    return [
      { id: '1', cycleTimeHours: 12, size: 150, complexity: 'medium' },
      { id: '2', cycleTimeHours: 8, size: 75, complexity: 'low' },
      { id: '3', cycleTimeHours: 24, size: 300, complexity: 'high' },
      { id: '4', cycleTimeHours: 6, size: 50, complexity: 'low' },
      { id: '5', cycleTimeHours: 16, size: HTTP_STATUS.OK, complexity: 'medium' }
    ];
  }

  /**
   * Mock deployment data collection
   */
  private async getDeploymentData(period: { start: Date; end: Date }) {
    // In production, this would query CI/CD systems
    return [
      { id: '1', timestamp: new Date(), status: 'success' },
      { id: '2', timestamp: new Date(Date.now() - 86400000), status: 'success' },
      { id: '3', timestamp: new Date(Date.now() - 172800000), status: 'failed' },
      { id: '4', timestamp: new Date(Date.now() - 259200000), status: 'success' }
    ];
  }

  /**
   * Mock feature delivery data collection
   */
  private async getFeatureData(period: { start: Date; end: Date }) {
    // In production, this would query project management tools
    return [
      { id: '1', name: 'User Authentication', deliveryTimeDays: 5, status: 'completed' },
      { id: '2', name: 'Dashboard UI', deliveryTimeDays: 8, status: 'completed' },
      { id: '3', name: 'API Endpoints', deliveryTimeDays: 12, status: 'completed' }
    ];
  }

  /**
   * Calculate trend based on current value vs target for PR metrics
   */
  private calculatePRTrend(current: number, target: number): 'increasing' | 'decreasing' | 'stable' {
    const ratio = current / target;

    if (ratio >= 1.1) return 'increasing'; // 10% above target
    if (ratio <= 0.9) return 'decreasing'; // 10% below target
    return 'stable';
  }

  /**
   * Calculate trend based on current value vs target for cycle time
   */
  private calculateCycleTimeTrend(current: number, target: number): 'improving' | 'degrading' | 'stable' {
    const ratio = current / target;

    if (ratio <= 0.9) return 'improving'; // 10% below target is better
    if (ratio >= 1.1) return 'degrading'; // 10% above target is worse
    return 'stable';
  }

  /**
   * Calculate trend for feature delivery speed
   */
  private calculateFeatureTrend(average: number): 'improving' | 'degrading' | 'stable' {
    if (average < 7) return 'improving'; // Less than 1 week is good
    if (average > 14) return 'degrading'; // More than 2 weeks is concerning
    return 'stable';
  }

  /**
   * Get cached Git analytics data
   */
  setGitData(analytics: GitAnalytics): void {
    this.gitData = analytics;
  }

  /**
   * Get last collection timestamp
   */
  getLastCollection(): Date | null {
    return this.lastCollection;
  }

  /**
   * Check if collection is due based on interval
   */
  isCollectionDue(): boolean {
    if (!this.lastCollection) return true;

    const now = Date.now();
    const timeSinceLastCollection = now - this.lastCollection.getTime();
    return timeSinceLastCollection >= this.config.collection.interval;
  }

  /**
   * Calculate velocity score (0-100)
   */
  calculateVelocityScore(velocity: DevelopmentVelocity): number {
    const prScore = Math.min(100, (velocity.prThroughput.count / velocity.prThroughput.target) * 100);
    const cycleScore = Math.max(0, 100 - ((velocity.cycleTime.average / velocity.cycleTime.target) * 100));
    const deploymentScore = Math.min(100, (velocity.deploymentFrequency.count / velocity.deploymentFrequency.target) * 100);
    const featureScore = velocity.featureDeliverySpeed.average < 7 ? 100 :
                        velocity.featureDeliverySpeed.average > 14 ? 50 : 75;

    // Weighted average
    return Math.round((prScore * 0.3) + (cycleScore * 0.4) + (deploymentScore * 0.2) + (featureScore * 0.1));
  }

  /**
   * Get velocity health status
   */
  getVelocityHealth(velocity: DevelopmentVelocity): 'healthy' | 'warning' | 'critical' {
    const score = this.calculateVelocityScore(velocity);

    if (score >= 80) return 'healthy';
    if (score >= 60) return 'warning';
    return 'critical';
  }
}


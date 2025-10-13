/**
}
import { STATUS_CODES } from '@shared/constants/magic-numbers';
/**
 * Correlation analysis engine for development friction monitoring
 * Identifies statistical relationships between code quality and development velocity
 */

import {
  FrictionCorrelations,
  FrictionMetrics,
  DevelopmentVelocity,
  QualityImpactMetrics,
  FrictionConfig
} from './types';
import { CodeMetrics } from '../../utils/codeMetrics/types';

export class CorrelationEngine {
  private config: FrictionConfig;
  private historicalData: FrictionMetrics[] = [];
  private codeMetricsHistory: CodeMetrics[] = [];

  constructor(config: FrictionConfig) {
    this.config = config;
  }

  /**
   * Analyze correlations between quality metrics and development velocity
   */
  async analyzeCorrelations(
    currentMetrics: FrictionMetrics,
    codeMetrics: CodeMetrics[]
  ): Promise<FrictionCorrelations> {
    this.addToHistory(currentMetrics);
    this.codeMetricsHistory = codeMetrics;

    // Parallel correlation analysis for better performance
    const [
      qualityVelocityCorrelation,
      technicalDebtImpact,
      migrationFriction,
      teamLearningCurve
    ] = await Promise.all([
      this.analyzeQualityVelocityCorrelation(),
      this.analyzeTechnicalDebtImpact(),
      this.analyzeMigrationFriction(),
      this.analyzeTeamLearningCurve()
    ]);

    return {
      qualityVelocityCorrelation,
      technicalDebtImpact,
      migrationFriction,
      teamLearningCurve
    };
  }

  /**
   * Analyze correlation between code quality and development velocity
   */
  private async analyzeQualityVelocityCorrelation() {
    if (this.historicalData.length < 3) {
      return {
        coefficient: 0,
        strength: 'none' as const,
        significance: 0
      };
    }

    // Extract quality scores and velocity metrics
    const dataPoints = this.historicalData.map(metrics => ({
      quality: this.calculateCompositeQualityScore(metrics),
      velocity: this.calculateCompositeVelocityScore(metrics.velocity),
      timestamp: metrics.timestamp
    }));

    // Calculate Pearson correlation coefficient
    const correlation = this.calculatePearsonCorrelation(
      dataPoints.map(d => d.quality),
      dataPoints.map(d => d.velocity)
    );

    // Calculate statistical significance (simplified)
    const significance = this.calculateStatisticalSignificance(correlation, dataPoints.length);

    // Determine correlation strength
    const strength = this.determineCorrelationStrength(Math.abs(correlation));

    return {
      coefficient: correlation,
      strength,
      significance
    };
  }

  /**
   * Analyze technical debt impact on development speed
   */
  private async analyzeTechnicalDebtImpact() {
    if (this.historicalData.length < 2) {
      return {
        correlation: 0,
        impact: 'low' as const,
        confidence: 0
      };
    }

    // Analyze technical debt trends vs velocity trends
    const debtTrend = this.calculateTechnicalDebtTrend();
    const velocityTrend = this.calculateVelocityTrend();

    // Inverse correlation: increasing debt usually correlates with decreasing velocity
    const correlation = -debtTrend * velocityTrend;

    // Calculate confidence based on data consistency
    const confidence = this.calculateTrendConfidence();

    // Determine impact level
    const impact = this.determineImpactLevel(Math.abs(correlation), confidence);

    return {
      correlation,
      impact,
      confidence
    };
  }

  /**
   * Analyze migration friction (Supabase migration impact)
   */
  private async analyzeMigrationFriction() {
    // Analyze legacy pattern trends vs development velocity
    const legacyPatterns = this.codeMetricsHistory.flatMap(metrics =>
      metrics.smells.filter(smell => smell.type === 'LegacyPattern')
    );

    const velocityTrend = this.calculateVelocityTrend();
    const legacyTrend = this.calculateLegacyPatternTrend();

    // Negative correlation: more legacy patterns = slower velocity
    const correlation = -legacyTrend * velocityTrend;

    // Identify affected metrics
    const affectedMetrics = this.identifyAffectedMetrics(legacyPatterns);

    return {
      correlation,
      affectedMetrics,
      trend: this.determineOverallTrend(correlation)
    };
  }

  /**
   * Analyze team learning curve impact
   */
  private async analyzeTeamLearningCurve() {
    // Analyze complexity trends vs productivity trends
    const complexityTrend = this.calculateComplexityTrend();
    const productivityTrend = this.calculateProductivityTrend();

    // Learning curve: initially high complexity may correlate with productivity changes
    const correlation = complexityTrend * productivityTrend;

    // Estimate onboarding impact
    const onboardingImpact = this.estimateOnboardingImpact(complexityTrend);

    // Estimate complexity effect on team
    const complexityEffect = this.estimateComplexityEffect(complexityTrend);

    return {
      correlation,
      onboardingImpact,
      complexityEffect
    };
  }

  /**
   * Calculate composite quality score from multiple metrics
   */
  private calculateCompositeQualityScore(metrics: FrictionMetrics): number {
    const quality = metrics.qualityImpact;

    // Weighted average of quality indicators
    const refactoringScore = Math.max(0, 100 - (quality.refactoringTime.percentage * 2));
    const bugFixScore = Math.max(0, 100 - (quality.bugFixRate.rate * 10));
    const debtScore = Math.max(0, 100 - (Math.abs(quality.technicalDebt.ratio) * 100));
    const reviewScore = Math.max(0, 100 - (quality.codeReviewEfficiency.averageReviewTime * 5));

    return (refactoringScore + bugFixScore + debtScore + reviewScore) / 4;
  }

  /**
   * Calculate composite velocity score
   */
  private calculateCompositeVelocityScore(velocity: DevelopmentVelocity): number {
    const prScore = Math.min(100, (velocity.prThroughput.count / velocity.prThroughput.target) * 100);
    const cycleScore = Math.max(0, 100 - ((velocity.cycleTime.average / velocity.cycleTime.target) * 100));
    const deploymentScore = Math.min(100, (velocity.deploymentFrequency.count / velocity.deploymentFrequency.target) * 100);
    const featureScore = velocity.featureDeliverySpeed.average < 7 ? 100 :
                        velocity.featureDeliverySpeed.average > 14 ? 50 : 75;

    return (prScore * 0.3) + (cycleScore * 0.4) + (deploymentScore * 0.2) + (featureScore * 0.1);
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;

    if (n !== y.length || n === 0) return STATUS_CODES.SUCCESS;

    // Calculate means
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    // Calculate correlation components
    let numerator = 0;
    let sumSquareX = 0;
    let sumSquareY = 0;

    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;

      numerator += deltaX * deltaY;
      sumSquareX += deltaX * deltaX;
      sumSquareY += deltaY * deltaY;
    }

    const denominator = Math.sqrt(sumSquareX * sumSquareY);

    if (denominator === 0) return STATUS_CODES.SUCCESS;

    return numerator / denominator;
  }

  /**
   * Calculate statistical significance (simplified p-value)
   */
  private calculateStatisticalSignificance(correlation: number, sampleSize: number): number {
    // Simplified significance calculation
    // In production, use proper statistical test (t-test)
    const tStatistic = Math.abs(correlation) * Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));
    const degreesOfFreedom = sampleSize - 2;

    // Simplified p-value calculation (approximation)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(tStatistic) / Math.sqrt(degreesOfFreedom)));

    return Math.max(0, Math.min(100, (1 - pValue) * 100)); // Convert to 0-100 scale
  }

  /**
   * Approximate normal cumulative distribution function
   */
  private normalCDF(x: number): number {
    // Approximation using erf function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return STATUS_CODES.SUCCESS.5 * (1.0 + sign * y);
  }

  /**
   * Determine correlation strength based on coefficient
   */
  private determineCorrelationStrength(coefficient: number): 'strong' | 'moderate' | 'weak' | 'none' {
    const abs = Math.abs(coefficient);

    if (abs >= 0.7) return 'strong';
    if (abs >= 0.5) return 'moderate';
    if (abs >= 0.3) return 'weak';
    return 'none';
  }

  /**
   * Calculate technical debt trend
   */
  private calculateTechnicalDebtTrend(): number {
    if (this.historicalData.length < 2) return STATUS_CODES.SUCCESS;

    const recent = this.historicalData.slice(-5); // Last 5 data points
    const debtRatios = recent.map(m => m.qualityImpact.technicalDebt.ratio);

    // Calculate trend slope
    return this.calculateTrendSlope(debtRatios);
  }

  /**
   * Calculate velocity trend
   */
  private calculateVelocityTrend(): number {
    if (this.historicalData.length < 2) return STATUS_CODES.SUCCESS;

    const recent = this.historicalData.slice(-5);
    const velocityScores = recent.map(m => this.calculateCompositeVelocityScore(m.velocity));

    return this.calculateTrendSlope(velocityScores);
  }

  /**
   * Calculate legacy pattern trend
   */
  private calculateLegacyPatternTrend(): number {
    // Analyze recent code metrics for legacy pattern trends
    const recentMetrics = this.codeMetricsHistory.slice(-10);
    const legacyCounts = recentMetrics.map(metrics => {
      return metrics.smells.filter(smell => smell.type === 'LegacyPattern').length;
    });

    return this.calculateTrendSlope(legacyCounts);
  }

  /**
   * Calculate complexity trend
   */
  private calculateComplexityTrend(): number {
    const recentMetrics = this.codeMetricsHistory.slice(-10);
    const complexityScores = recentMetrics.map(metrics => 100 - metrics.scores.complexity);

    return this.calculateTrendSlope(complexityScores);
  }

  /**
   * Calculate productivity trend
   */
  private calculateProductivityTrend(): number {
    if (this.historicalData.length < 2) return STATUS_CODES.SUCCESS;

    const recent = this.historicalData.slice(-5);
    const productivityScores = recent.map(m => {
      // Simplified productivity based on velocity and quality
      const velocityScore = this.calculateCompositeVelocityScore(m.velocity);
      const qualityScore = this.calculateCompositeQualityScore(m);
      return (velocityScore + qualityScore) / 2;
    });

    return this.calculateTrendSlope(productivityScores);
  }

  /**
   * Calculate trend slope using linear regression
   */
  private calculateTrendSlope(values: number[]): number {
    const n = values.length;
    if (n < 2) return STATUS_CODES.SUCCESS;

    const indices = values.map((_, i) => i);
    const meanX = (n - 1) / 2;
    const meanY = values.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (indices[i] - meanX) * (values[i] - meanY);
      denominator += (indices[i] - meanX) * (indices[i] - meanX);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate trend confidence based on data consistency
   */
  private calculateTrendConfidence(): number {
    if (this.historicalData.length < 3) return STATUS_CODES.SUCCESS;

    const recent = this.historicalData.slice(-5);
    const velocityScores = recent.map(m => this.calculateCompositeVelocityScore(m.velocity));

    // Calculate coefficient of variation
    const mean = velocityScores.reduce((sum, val) => sum + val, 0) / velocityScores.length;
    const variance = velocityScores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / velocityScores.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean === 0 ? 0 : (stdDev / mean) * 100;

    // Lower variation = higher confidence
    return Math.max(0, 100 - coefficientOfVariation);
  }

  /**
   * Determine impact level based on correlation and confidence
   */
  private determineImpactLevel(correlation: number, confidence: number): 'high' | 'medium' | 'low' {
    const absCorrelation = Math.abs(correlation);

    if (absCorrelation >= 0.7 && confidence >= 80) return 'high';
    if (absCorrelation >= 0.5 && confidence >= 60) return 'medium';
    return 'low';
  }

  /**
   * Determine overall trend direction
   */
  private determineOverallTrend(correlation: number): 'improving' | 'degrading' | 'stable' {
    if (correlation > 0.3) return 'improving';
    if (correlation < -0.3) return 'degrading';
    return 'stable';
  }

  /**
   * Identify metrics most affected by legacy patterns
   */
  private identifyAffectedMetrics(legacyPatterns: any[]): string[] {
    const affected: string[] = [];

    if (legacyPatterns.some(p => p.description.includes('mongoose'))) {
      affected.push('database_operations');
    }

    if (legacyPatterns.some(p => p.description.includes('ObjectId'))) {
      affected.push('data_consistency');
    }

    if (legacyPatterns.some(p => p.description.includes('getDatabaseType'))) {
      affected.push('code_maintainability');
    }

    return affected.length > 0 ? affected : ['general_productivity'];
  }

  /**
   * Estimate onboarding impact based on complexity trends
   */
  private estimateOnboardingImpact(complexityTrend: number): number {
    // Higher complexity trends make onboarding harder
    return Math.min(100, Math.abs(complexityTrend) * 50);
  }

  /**
   * Estimate complexity effect on team performance
   */
  private estimateComplexityEffect(complexityTrend: number): number {
    // Complexity affects team velocity and quality
    return Math.min(100, Math.abs(complexityTrend) * 25);
  }

  /**
   * Add current metrics to historical data for trend analysis
   */
  private addToHistory(metrics: FrictionMetrics): void {
    this.historicalData.push(metrics);

    // Keep only recent data (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.historicalData = this.historicalData.filter(m => m.timestamp > thirtyDaysAgo);
  }

  /**
   * Generate correlation insights for reporting
   */
  generateCorrelationInsights(correlations: FrictionCorrelations): string[] {
    const insights: string[] = [];

    // Quality-velocity correlation insight
    if (correlations.qualityVelocityCorrelation.strength !== 'none') {
      const direction = correlations.qualityVelocityCorrelation.coefficient > 0 ? 'positive' : 'negative';
      insights.push(
        `Found ${correlations.qualityVelocityCorrelation.strength} ${direction} correlation ` +
        `between code quality and development velocity (r = ${correlations.qualityVelocityCorrelation.coefficient.toFixed(2)})`
      );
    }

    // Technical debt impact insight
    if (correlations.technicalDebtImpact.impact === 'high') {
      insights.push(
        'High technical debt impact detected - consider prioritizing debt reduction initiatives'
      );
    }

    // Migration friction insight
    if (correlations.migrationFriction.affectedMetrics.length > 0) {
      insights.push(
        `Migration friction affecting: ${correlations.migrationFriction.affectedMetrics.join(', ')}`
      );
    }

    // Team learning curve insight
    if (Math.abs(correlations.teamLearningCurve.correlation) > 0.5) {
      insights.push(
        'Significant team learning curve detected - consider additional training or documentation'
      );
    }

    return insights;
  }

  /**
   * Get correlation health status
   */
  getCorrelationHealth(correlations: FrictionCorrelations): 'healthy' | 'warning' | 'critical' {
    const strength = correlations.qualityVelocityCorrelation.strength;
    const impact = correlations.technicalDebtImpact.impact;

    if (strength === 'strong' && correlations.qualityVelocityCorrelation.coefficient < -0.5) {
      return 'critical'; // Strong negative correlation is concerning
    }

    if (impact === 'high' || (strength === 'moderate' && correlations.qualityVelocityCorrelation.coefficient < -0.3)) {
      return 'warning';
    }

    return 'healthy';
  }
}
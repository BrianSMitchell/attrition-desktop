import { FrictionIndicatorsTracker } from '../../monitoring/friction-metrics/friction-indicators';

import { BUFFER_LIMITS } from '@shared/constants/magic-numbers';
/**
 * Velocity ROI Calculator
 * Calculates ROI for refactoring decisions based on development velocity improvements
 */
export class VelocityROICalculator {
  /**
   * Calculate development velocity ROI
   * @param refactoringInvestment - Time investment in refactoring (hours)
   * @param velocityBaseline - Current development velocity (features per sprint)
   * @param expectedVelocityGain - Expected velocity improvement (features per sprint)
   * @param timeHorizon - Time horizon for ROI calculation (sprints)
   * @returns ROI calculation result
   */
  static calculateVelocityROI(
    refactoringInvestment: number,
    velocityBaseline: number,
    expectedVelocityGain: number,
    timeHorizon: number
  ): VelocityROIResult {
    const totalVelocityGains = expectedVelocityGain * timeHorizon;
    const totalTimeInvestment = refactoringInvestment;
    const netBenefit = totalVelocityGains - totalTimeInvestment;

    const roi = totalTimeInvestment > 0 ? (netBenefit / totalTimeInvestment) * 100 : 0;
    const paybackPeriod = expectedVelocityGain > 0 ? refactoringInvestment / expectedVelocityGain : Infinity;

    return {
      refactoringInvestment,
      velocityBaseline,
      expectedVelocityGain,
      timeHorizon,
      totalVelocityGains,
      netBenefit,
      roi,
      paybackPeriod,
      recommendation: this.generateRecommendation(roi, paybackPeriod, timeHorizon),
      confidence: this.calculateConfidence(velocityBaseline, expectedVelocityGain, timeHorizon)
    };
  }

  /**
   * Calculate ROI based on historical friction metrics
   * @param refactoringTarget - Module or component being refactored
   * @param timeHorizon - Time horizon for ROI calculation (sprints)
   * @returns Historical data-based ROI calculation
   */
  static async calculateHistoricalVelocityROI(
    refactoringTarget: string,
    timeHorizon: number
  ): Promise<VelocityROIResult> {
    try {
      // Get current metrics for the target module
      const codeMetrics = await this.getCurrentCodeMetrics(refactoringTarget);

      // Create a friction tracker to analyze the module
      const frictionTracker = new FrictionIndicatorsTracker({
        collection: { interval: 300000, retention: 30, batchSize: BUFFER_LIMITS.BATCH_SIZE_LARGE },
        thresholds: {
          velocity: { minPrThroughput: 5, maxCycleTime: 24, minDeploymentFrequency: 1 },
          quality: { maxRefactoringTime: 20, maxBugFixRate: 1, maxTechnicalDebtRatio: 0.1 },
          performance: { maxBuildTime: 300, minTestSuccessRate: 95, minDeploymentSuccessRate: 99 }
        },
        alerting: { enabled: true, channels: ['console'], cooldown: 15 }
      });

      // Track friction indicators for the current module
      const frictionIndicators = await frictionTracker.trackFrictionIndicators(codeMetrics);

      // Calculate current velocity estimate (this would need to be implemented based on your velocity tracking)
      const currentSprintVelocity = await this.getCurrentSprintVelocity();

      // Estimate velocity gain based on friction reduction
      const frictionScore = frictionTracker.calculateOverallFrictionScore(frictionIndicators);
      const frictionImpact = (100 - frictionScore) * 0.1; // Convert friction score to velocity impact
      const expectedVelocityGain = Math.min(frictionImpact, currentSprintVelocity * 0.3); // Cap at 30% improvement

      // Estimate refactoring investment based on friction complexity
      const refactoringInvestment = frictionIndicators.serviceExtractionBottlenecks.complexity * 2; // 2 hours per complexity point

      return this.calculateVelocityROI(
        refactoringInvestment,
        currentSprintVelocity,
        expectedVelocityGain,
        timeHorizon
      );
    } catch (error) {
      throw new Error(`Failed to calculate historical velocity ROI: ${error}`);
    }
  }

  /**
   * Get current code metrics for a specific module (placeholder implementation)
   */
  private static async getCurrentCodeMetrics(refactoringTarget: string): Promise<any[]> {
    // This would integrate with your existing code metrics system
    // For now, return a placeholder structure
    return [{
      filePath: refactoringTarget,
      metadata: { linesOfCode: 1000 },
      smells: []
    }];
  }

  /**
   * Get current sprint velocity (placeholder implementation)
   */
  private static async getCurrentSprintVelocity(): Promise<number> {
    // This would integrate with your velocity tracking system
    // For now, return a placeholder value
    return 15; // 15 features per sprint
  }

  /**
   * Calculate ROI for different refactoring scenarios
   * @param scenarios - Array of refactoring scenarios to compare
   * @returns Comparative ROI analysis
   */
  static compareVelocityROIScenarios(scenarios: VelocityROIScenario[]): VelocityROIComparison {
    const results = scenarios.map(scenario =>
      this.calculateVelocityROI(
        scenario.investment,
        scenario.baselineVelocity,
        scenario.expectedGain,
        scenario.timeHorizon
      )
    );

    const bestROI = results.reduce((best, current) =>
      current.roi > best.roi ? current : best
    );

    const quickestPayback = results.reduce((quickest, current) =>
      current.paybackPeriod < quickest.paybackPeriod ? current : quickest
    );

    return {
      scenarios: results,
      bestROI,
      quickestPayback,
      recommendation: this.generateComparisonRecommendation(results)
    };
  }

  private static generateRecommendation(
    roi: number,
    paybackPeriod: number,
    timeHorizon: number
  ): ROIDecision {
    if (roi >= 300) return 'HIGHLY_RECOMMENDED';
    if (roi >= 150) return 'RECOMMENDED';
    if (roi >= 50 && paybackPeriod <= timeHorizon * 0.5) return 'CONDITIONAL';
    if (roi > 0 && paybackPeriod <= timeHorizon) return 'MARGINAL';
    return 'NOT_RECOMMENDED';
  }

  private static calculateConfidence(
    baseline: number,
    expectedGain: number,
    timeHorizon: number
  ): number {
    // Higher confidence with larger baseline, moderate gains, longer time horizon
    const baselineConfidence = Math.min(baseline / 10, 1) * 0.4;
    const gainConfidence = expectedGain > 0 && expectedGain <= baseline * 0.3 ? 0.4 : 0.2;
    const horizonConfidence = Math.min(timeHorizon / 6, 1) * 0.2;

    return Math.round((baselineConfidence + gainConfidence + horizonConfidence) * 100);
  }

  private static generateComparisonRecommendation(results: VelocityROIResult[]): string {
    const recommended = results.filter(r => r.recommendation === 'HIGHLY_RECOMMENDED' || r.recommendation === 'RECOMMENDED');

    if (recommended.length === 0) return 'No scenarios meet minimum ROI thresholds';
    if (recommended.length === 1) return `Proceed with: ${recommended[0].refactoringTarget || 'the recommended scenario'}`;

    return `Compare ${recommended.length} viable scenarios focusing on ROI and payback period`;
  }
}

/**
 * Velocity ROI calculation result interface
 */
export interface VelocityROIResult {
  refactoringInvestment: number;
  velocityBaseline: number;
  expectedVelocityGain: number;
  timeHorizon: number;
  totalVelocityGains: number;
  netBenefit: number;
  roi: number;
  paybackPeriod: number;
  recommendation: ROIDecision;
  confidence: number;
  refactoringTarget?: string;
}

/**
 * Velocity ROI scenario for comparison
 */
export interface VelocityROIScenario {
  name: string;
  investment: number;
  baselineVelocity: number;
  expectedGain: number;
  timeHorizon: number;
}

/**
 * ROI decision recommendation
 */
export type ROIDecision =
  | 'HIGHLY_RECOMMENDED'
  | 'RECOMMENDED'
  | 'CONDITIONAL'
  | 'MARGINAL'
  | 'NOT_RECOMMENDED';

/**
 * Comparative ROI analysis result
 */
export interface VelocityROIComparison {
  scenarios: VelocityROIResult[];
  bestROI: VelocityROIResult;
  quickestPayback: VelocityROIResult;
  recommendation: string;
}
import { HTTP_STATUS } from '../../constants/response-formats';
/**
 * Feature ROI Calculator
 * Calculates ROI for refactoring decisions based on feature delivery improvements
 */
export class FeatureROICalculator {
  /**
   * Calculate feature delivery ROI
   * @param refactoringInvestment - Time investment in refactoring (hours)
   * @param currentFeatureDeliveryRate - Current features delivered per sprint
   * @param expectedFeatureDeliveryGain - Expected increase in feature delivery rate
   * @param timeHorizon - Time horizon for ROI calculation (sprints)
   * @returns ROI calculation result
   */
  static calculateFeatureDeliveryROI(
    refactoringInvestment: number,
    currentFeatureDeliveryRate: number,
    expectedFeatureDeliveryGain: number,
    timeHorizon: number
  ): FeatureDeliveryROIResult {
    const totalFeatureGains = expectedFeatureDeliveryGain * timeHorizon;
    const totalTimeInvestment = refactoringInvestment;

    // Estimate business value per feature (placeholder - should be customized)
    const averageFeatureValue = 50000; // $50k average business value per feature
    const totalBusinessValue = totalFeatureGains * averageFeatureValue;

    // Calculate development cost savings
    const developmentCostSavings = this.calculateDevelopmentCostSavings(
      expectedFeatureDeliveryGain,
      timeHorizon,
      100 // $100/hour development cost
    );

    // Calculate opportunity cost savings
    const opportunityCostSavings = this.calculateOpportunityCostSavings(
      expectedFeatureDeliveryGain,
      timeHorizon,
      averageFeatureValue
    );

    const totalBenefit = totalBusinessValue + developmentCostSavings + opportunityCostSavings;
    const netBenefit = totalBenefit - (totalTimeInvestment * 100);

    const roi = totalTimeInvestment > 0 ? (netBenefit / (totalTimeInvestment * 100)) * 100 : 0;
    const paybackPeriod = expectedFeatureDeliveryGain > 0 ?
      (refactoringInvestment * 100) / (expectedFeatureDeliveryGain * averageFeatureValue) : Infinity;

    return {
      refactoringInvestment,
      currentFeatureDeliveryRate,
      expectedFeatureDeliveryGain,
      timeHorizon,
      totalFeatureGains,
      totalBusinessValue,
      developmentCostSavings,
      opportunityCostSavings,
      totalBenefit,
      netBenefit,
      roi,
      paybackPeriod,
      recommendation: this.generateFeatureRecommendation(roi, paybackPeriod, timeHorizon),
      confidence: this.calculateFeatureConfidence(currentFeatureDeliveryRate, expectedFeatureDeliveryGain, timeHorizon)
    };
  }

  /**
   * Calculate ROI for architectural improvements that enable new features
   * @param refactoringInvestment - Time investment in architectural refactoring (hours)
   * @param newFeaturesEnabled - Number of new features enabled by refactoring
   * @param averageFeatureValue - Average business value per new feature
   * @param timeToMarketReduction - Reduction in time to market (months)
   * @returns Architectural ROI calculation result
   */
  static calculateArchitecturalFeatureROI(
    refactoringInvestment: number,
    newFeaturesEnabled: number,
    averageFeatureValue: number,
    timeToMarketReduction: number
  ): ArchitecturalFeatureROIResult {
    // Calculate business value from new features
    const totalFeatureValue = newFeaturesEnabled * averageFeatureValue;

    // Calculate time-to-market savings
    const timeToMarketSavings = timeToMarketReduction * 250000; // Assume $250k/month opportunity cost

    // Calculate development efficiency gains
    const developmentEfficiencyGain = (newFeaturesEnabled * averageFeatureValue) * 0.2; // 20% efficiency gain

    const totalBenefit = totalFeatureValue + timeToMarketSavings + developmentEfficiencyGain;
    const investmentCost = refactoringInvestment * 100; // $100/hour

    const netBenefit = totalBenefit - investmentCost;
    const roi = investmentCost > 0 ? (netBenefit / investmentCost) * 100 : 0;

    const paybackPeriod = totalFeatureValue > 0 ? investmentCost / totalFeatureValue : Infinity;

    return {
      refactoringInvestment,
      newFeaturesEnabled,
      averageFeatureValue,
      timeToMarketReduction,
      totalFeatureValue,
      timeToMarketSavings,
      developmentEfficiencyGain,
      totalBenefit,
      investmentCost,
      netBenefit,
      roi,
      paybackPeriod,
      recommendation: roi >= 300 ? 'HIGHLY_RECOMMENDED' : roi >= 150 ? 'RECOMMENDED' : 'CONDITIONAL',
      featureVelocity: newFeaturesEnabled / Math.max(timeToMarketReduction, 1),
      confidence: this.calculateArchitecturalConfidence(newFeaturesEnabled, timeToMarketReduction)
    };
  }

  /**
   * Calculate ROI for different feature delivery scenarios
   * @param scenarios - Array of feature delivery scenarios to compare
   * @returns Comparative ROI analysis
   */
  static compareFeatureROIScenarios(scenarios: FeatureROIScenario[]): FeatureROIComparison {
    const results = scenarios.map(scenario =>
      this.calculateFeatureDeliveryROI(
        scenario.investment,
        scenario.currentDeliveryRate,
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
      recommendation: this.generateFeatureComparisonRecommendation(results)
    };
  }

  private static calculateDevelopmentCostSavings(
    expectedFeatureDeliveryGain: number,
    timeHorizon: number,
    hourlyRate: number
  ): number {
    // Assume 80 hours per feature for development
    const hoursPerFeature = 80;
    const totalHoursForNewFeatures = expectedFeatureDeliveryGain * timeHorizon * hoursPerFeature;
    return totalHoursForNewFeatures * hourlyRate;
  }

  private static calculateOpportunityCostSavings(
    expectedFeatureDeliveryGain: number,
    timeHorizon: number,
    featureValue: number
  ): number {
    // Assume 2 months opportunity cost per feature delay
    const opportunityCostPerFeature = featureValue * 0.15; // 15% of feature value
    return expectedFeatureDeliveryGain * timeHorizon * opportunityCostPerFeature;
  }

  private static generateFeatureRecommendation(
    roi: number,
    paybackPeriod: number,
    timeHorizon: number
  ): ROIDecision {
    if (roi >= HTTP_STATUS.BAD_REQUEST) return 'HIGHLY_RECOMMENDED';
    if (roi >= HTTP_STATUS.OK) return 'RECOMMENDED';
    if (roi >= 100 && paybackPeriod <= timeHorizon * 0.5) return 'CONDITIONAL';
    if (roi > 0 && paybackPeriod <= timeHorizon) return 'MARGINAL';
    return 'NOT_RECOMMENDED';
  }

  private static calculateFeatureConfidence(
    currentDeliveryRate: number,
    expectedGain: number,
    timeHorizon: number
  ): number {
    // Higher confidence with higher current delivery rate, moderate gains, longer time horizon
    const currentConfidence = Math.min(currentDeliveryRate / 5, 1) * 0.4;
    const gainConfidence = expectedGain > 0 && expectedGain <= currentDeliveryRate * 0.5 ? 0.4 : 0.2;
    const horizonConfidence = Math.min(timeHorizon / 6, 1) * 0.2;

    return Math.round((currentConfidence + gainConfidence + horizonConfidence) * 100);
  }

  private static calculateArchitecturalConfidence(newFeaturesEnabled: number, timeToMarketReduction: number): number {
    const featureConfidence = Math.min(newFeaturesEnabled / 5, 1) * 0.5;
    const timeConfidence = Math.min(timeToMarketReduction / 6, 1) * 0.5;
    return Math.round((featureConfidence + timeConfidence) * 100);
  }

  private static generateFeatureComparisonRecommendation(results: FeatureDeliveryROIResult[]): string {
    const recommended = results.filter(r => r.recommendation === 'HIGHLY_RECOMMENDED' || r.recommendation === 'RECOMMENDED');

    if (recommended.length === 0) return 'No scenarios meet minimum feature ROI thresholds';
    if (recommended.length === 1) return `Proceed with: ${recommended[0].refactoringTarget || 'the recommended scenario'}`;

    return `Compare ${recommended.length} viable scenarios focusing on business value and payback period`;
  }
}

/**
 * Feature delivery ROI calculation result interface
 */
export interface FeatureDeliveryROIResult {
  refactoringInvestment: number;
  currentFeatureDeliveryRate: number;
  expectedFeatureDeliveryGain: number;
  timeHorizon: number;
  totalFeatureGains: number;
  totalBusinessValue: number;
  developmentCostSavings: number;
  opportunityCostSavings: number;
  totalBenefit: number;
  netBenefit: number;
  roi: number;
  paybackPeriod: number;
  recommendation: ROIDecision;
  confidence: number;
  refactoringTarget?: string;
}

/**
 * Architectural feature ROI calculation result interface
 */
export interface ArchitecturalFeatureROIResult {
  refactoringInvestment: number;
  newFeaturesEnabled: number;
  averageFeatureValue: number;
  timeToMarketReduction: number;
  totalFeatureValue: number;
  timeToMarketSavings: number;
  developmentEfficiencyGain: number;
  totalBenefit: number;
  investmentCost: number;
  netBenefit: number;
  roi: number;
  paybackPeriod: number;
  recommendation: string;
  featureVelocity: number;
  confidence: number;
}

/**
 * Feature ROI scenario for comparison
 */
export interface FeatureROIScenario {
  name: string;
  investment: number;
  currentDeliveryRate: number;
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
 * Comparative feature ROI analysis result
 */
export interface FeatureROIComparison {
  scenarios: FeatureDeliveryROIResult[];
  bestROI: FeatureDeliveryROIResult;
  quickestPayback: FeatureDeliveryROIResult;
  recommendation: string;
}


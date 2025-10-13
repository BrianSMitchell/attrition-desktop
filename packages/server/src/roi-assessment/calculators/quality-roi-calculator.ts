import { HTTP_STATUS } from '../../constants/response-formats';
/**
 * Quality ROI Calculator
 * Calculates ROI for refactoring decisions based on code quality improvements
 */
export class QualityROICalculator {
  /**
   * Calculate quality improvement ROI
   * @param refactoringInvestment - Time investment in refactoring (hours)
   * @param currentBugRate - Current bugs per 1000 lines of code
   * @param expectedBugRateReduction - Expected reduction in bug rate (bugs per 1000 lines)
   * @param timeHorizon - Time horizon for ROI calculation (months)
   * @returns ROI calculation result
   */
  static calculateQualityROI(
    refactoringInvestment: number,
    currentBugRate: number,
    expectedBugRateReduction: number,
    timeHorizon: number
  ): QualityROIResult {
    const monthlyBugReduction = expectedBugRateReduction * 12 / timeHorizon;
    const totalBugReduction = expectedBugRateReduction * timeHorizon;
    const totalTimeInvestment = refactoringInvestment;

    // Estimate time saved from reduced bug fixing (assume 4 hours per bug)
    const timeSavedFromBugReduction = totalBugReduction * 4;

    // Additional quality benefits
    const codeReviewTimeSaved = this.calculateCodeReviewTimeSavings(currentBugRate, expectedBugRateReduction, timeHorizon);
    const maintenanceTimeSaved = this.calculateMaintenanceTimeSavings(currentBugRate, expectedBugRateReduction, timeHorizon);

    const totalTimeSaved = timeSavedFromBugReduction + codeReviewTimeSaved + maintenanceTimeSaved;
    const netBenefit = totalTimeSaved - totalTimeInvestment;

    const roi = totalTimeInvestment > 0 ? (netBenefit / totalTimeInvestment) * 100 : 0;
    const paybackPeriod = expectedBugRateReduction > 0 ? refactoringInvestment / (monthlyBugReduction * 4) : Infinity;

    return {
      refactoringInvestment,
      currentBugRate,
      expectedBugRateReduction,
      timeHorizon,
      totalBugReduction,
      timeSavedFromBugReduction,
      codeReviewTimeSaved,
      maintenanceTimeSaved,
      totalTimeSaved,
      netBenefit,
      roi,
      paybackPeriod,
      recommendation: this.generateQualityRecommendation(roi, paybackPeriod, timeHorizon),
      confidence: this.calculateQualityConfidence(currentBugRate, expectedBugRateReduction, timeHorizon)
    };
  }

  /**
   * Calculate ROI for security vulnerability fixes
   * @param refactoringInvestment - Time investment in security refactoring (hours)
   * @param currentVulnerabilityCount - Current number of known vulnerabilities
   * @param expectedVulnerabilityReduction - Expected reduction in vulnerabilities
   * @param riskLevel - Risk level (low, medium, high, critical)
   * @returns Security ROI calculation result
   */
  static calculateSecurityQualityROI(
    refactoringInvestment: number,
    currentVulnerabilityCount: number,
    expectedVulnerabilityReduction: number,
    riskLevel: SecurityRiskLevel
  ): SecurityQualityROIResult {
    // Risk multiplier for ROI calculation
    const riskMultiplier = this.getRiskMultiplier(riskLevel);

    // Estimate cost of potential security incidents (assume $10k per vulnerability for high risk)
    const incidentCostPerVulnerability = riskLevel === 'critical' ? 50000 :
                                         riskLevel === 'high' ? 25000 :
                                         riskLevel === 'medium' ? 10000 : 5000;

    const potentialCostAvoided = expectedVulnerabilityReduction * incidentCostPerVulnerability;
    const netBenefit = potentialCostAvoided - refactoringInvestment * 100; // Convert hours to cost

    const roi = refactoringInvestment > 0 ? (netBenefit / (refactoringInvestment * 100)) * 100 : 0;
    const paybackPeriod = potentialCostAvoided > 0 ? (refactoringInvestment * 100) / potentialCostAvoided : Infinity;

    return {
      refactoringInvestment,
      currentVulnerabilityCount,
      expectedVulnerabilityReduction,
      riskLevel,
      potentialCostAvoided,
      netBenefit,
      roi,
      paybackPeriod,
      recommendation: roi >= HTTP_STATUS.OK ? 'HIGHLY_RECOMMENDED' : roi >= 100 ? 'RECOMMENDED' : 'CONDITIONAL',
      riskReduction: expectedVulnerabilityReduction / Math.max(currentVulnerabilityCount, 1),
      confidence: this.calculateSecurityConfidence(riskLevel, expectedVulnerabilityReduction)
    };
  }

  /**
   * Calculate ROI for different quality improvement scenarios
   * @param scenarios - Array of quality improvement scenarios to compare
   * @returns Comparative ROI analysis
   */
  static compareQualityROIScenarios(scenarios: QualityROIScenario[]): QualityROIComparison {
    const results = scenarios.map(scenario =>
      this.calculateQualityROI(
        scenario.investment,
        scenario.currentBugRate,
        scenario.expectedBugRateReduction,
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
      recommendation: this.generateQualityComparisonRecommendation(results)
    };
  }

  private static calculateCodeReviewTimeSavings(
    currentBugRate: number,
    expectedBugRateReduction: number,
    timeHorizon: number
  ): number {
    // Assume 30% of code review time is spent on bug-related issues
    const reviewTimeReduction = (expectedBugRateReduction / currentBugRate) * 0.3;
    return reviewTimeReduction * timeHorizon * 40; // 40 hours per month for code reviews
  }

  private static calculateMaintenanceTimeSavings(
    currentBugRate: number,
    expectedBugRateReduction: number,
    timeHorizon: number
  ): number {
    // Assume 20% of maintenance time is spent on bug fixes
    const maintenanceTimeReduction = (expectedBugRateReduction / currentBugRate) * 0.2;
    return maintenanceTimeReduction * timeHorizon * 60; // 60 hours per month for maintenance
  }

  private static generateQualityRecommendation(
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

  private static calculateQualityConfidence(
    currentBugRate: number,
    expectedBugRateReduction: number,
    timeHorizon: number
  ): number {
    // Higher confidence with higher current bug rate, moderate reductions, longer time horizon
    const bugRateConfidence = Math.min(currentBugRate / 2, 1) * 0.4;
    const reductionConfidence = expectedBugRateReduction > 0 && expectedBugRateReduction <= currentBugRate * 0.5 ? 0.4 : 0.2;
    const horizonConfidence = Math.min(timeHorizon / 12, 1) * 0.2;

    return Math.round((bugRateConfidence + reductionConfidence + horizonConfidence) * 100);
  }

  private static calculateSecurityConfidence(riskLevel: SecurityRiskLevel, expectedReduction: number): number {
    const riskConfidence = riskLevel === 'critical' ? 0.9 : riskLevel === 'high' ? 0.7 : 0.5;
    const reductionConfidence = Math.min(expectedReduction / 10, 1) * 0.1;
    return Math.round((riskConfidence + reductionConfidence) * 100);
  }

  private static getRiskMultiplier(riskLevel: SecurityRiskLevel): number {
    return riskLevel === 'critical' ? 5 :
           riskLevel === 'high' ? 3 :
           riskLevel === 'medium' ? 2 : 1;
  }

  private static generateQualityComparisonRecommendation(results: QualityROIResult[]): string {
    const recommended = results.filter(r => r.recommendation === 'HIGHLY_RECOMMENDED' || r.recommendation === 'RECOMMENDED');

    if (recommended.length === 0) return 'No scenarios meet minimum quality ROI thresholds';
    if (recommended.length === 1) return `Proceed with: ${recommended[0].refactoringTarget || 'the recommended scenario'}`;

    return `Compare ${recommended.length} viable scenarios focusing on quality ROI and payback period`;
  }
}

/**
 * Quality ROI calculation result interface
 */
export interface QualityROIResult {
  refactoringInvestment: number;
  currentBugRate: number;
  expectedBugRateReduction: number;
  timeHorizon: number;
  totalBugReduction: number;
  timeSavedFromBugReduction: number;
  codeReviewTimeSaved: number;
  maintenanceTimeSaved: number;
  totalTimeSaved: number;
  netBenefit: number;
  roi: number;
  paybackPeriod: number;
  recommendation: ROIDecision;
  confidence: number;
  refactoringTarget?: string;
}

/**
 * Security quality ROI result interface
 */
export interface SecurityQualityROIResult {
  refactoringInvestment: number;
  currentVulnerabilityCount: number;
  expectedVulnerabilityReduction: number;
  riskLevel: SecurityRiskLevel;
  potentialCostAvoided: number;
  netBenefit: number;
  roi: number;
  paybackPeriod: number;
  recommendation: string;
  riskReduction: number;
  confidence: number;
}

/**
 * Security risk levels
 */
export type SecurityRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Quality ROI scenario for comparison
 */
export interface QualityROIScenario {
  name: string;
  investment: number;
  currentBugRate: number;
  expectedBugRateReduction: number;
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
 * Comparative quality ROI analysis result
 */
export interface QualityROIComparison {
  scenarios: QualityROIResult[];
  bestROI: QualityROIResult;
  quickestPayback: QualityROIResult;
  recommendation: string;
}


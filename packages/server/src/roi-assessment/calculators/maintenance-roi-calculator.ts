import { HTTP_STATUS } from '../../constants/response-formats';
/**
 * Maintenance ROI Calculator
 * Calculates ROI for refactoring decisions based on maintenance cost reductions
 */
export class MaintenanceROICalculator {
  /**
   * Calculate maintenance cost ROI
   * @param refactoringInvestment - Time investment in refactoring (hours)
   * @param currentMaintenanceHours - Current monthly maintenance hours
   * @param expectedMaintenanceReduction - Expected reduction in maintenance hours per month
   * @param timeHorizon - Time horizon for ROI calculation (months)
   * @returns ROI calculation result
   */
  static calculateMaintenanceROI(
    refactoringInvestment: number,
    currentMaintenanceHours: number,
    expectedMaintenanceReduction: number,
    timeHorizon: number
  ): MaintenanceROIResult {
    const monthlyMaintenanceSavings = expectedMaintenanceReduction;
    const totalMaintenanceSavings = monthlyMaintenanceSavings * timeHorizon;
    const totalTimeInvestment = refactoringInvestment;

    // Calculate operational cost savings (assume $100/hour for maintenance work)
    const hourlyRate = 100;
    const totalCostSavings = totalMaintenanceSavings * hourlyRate;

    // Include additional benefits
    const onboardingTimeSavings = this.calculateOnboardingTimeSavings(expectedMaintenanceReduction, timeHorizon);
    const knowledgeTransferSavings = this.calculateKnowledgeTransferSavings(expectedMaintenanceReduction, timeHorizon);

    const totalCostBenefit = totalCostSavings + onboardingTimeSavings + knowledgeTransferSavings;
    const netBenefit = totalCostBenefit - (totalTimeInvestment * hourlyRate);

    const roi = totalTimeInvestment > 0 ? (netBenefit / (totalTimeInvestment * hourlyRate)) * 100 : 0;
    const paybackPeriod = monthlyMaintenanceSavings > 0 ?
      (refactoringInvestment * hourlyRate) / (monthlyMaintenanceSavings * hourlyRate) : Infinity;

    return {
      refactoringInvestment,
      currentMaintenanceHours,
      expectedMaintenanceReduction,
      timeHorizon,
      totalMaintenanceSavings,
      totalCostSavings,
      onboardingTimeSavings,
      knowledgeTransferSavings,
      totalCostBenefit,
      netBenefit,
      roi,
      paybackPeriod,
      recommendation: this.generateMaintenanceRecommendation(roi, paybackPeriod, timeHorizon),
      confidence: this.calculateMaintenanceConfidence(currentMaintenanceHours, expectedMaintenanceReduction, timeHorizon)
    };
  }

  /**
   * Calculate ROI for technical debt reduction
   * @param refactoringInvestment - Time investment in debt reduction (hours)
   * @param currentTechnicalDebt - Current technical debt estimate (hours)
   * @param expectedDebtReduction - Expected debt reduction (hours)
   * @param debtInterestRate - Annual interest rate of technical debt (as percentage)
   * @returns Technical debt ROI calculation result
   */
  static calculateTechnicalDebtROI(
    refactoringInvestment: number,
    currentTechnicalDebt: number,
    expectedDebtReduction: number,
    debtInterestRate: number = 25
  ): TechnicalDebtROIResult {
    // Calculate annual debt service cost
    const annualDebtServiceCost = (currentTechnicalDebt * debtInterestRate) / 100;

    // Calculate debt reduction benefit over time
    const debtReductionBenefit = expectedDebtReduction;
    const futureDebtServiceSavings = (expectedDebtReduction * debtInterestRate) / 100;

    // Assume $100/hour for all work
    const hourlyRate = 100;
    const investmentCost = refactoringInvestment * hourlyRate;
    const debtReductionValue = debtReductionBenefit * hourlyRate;
    const annualServiceSavings = futureDebtServiceSavings * hourlyRate;

    const netBenefit = debtReductionValue + annualServiceSavings - investmentCost;

    const roi = investmentCost > 0 ? (netBenefit / investmentCost) * 100 : 0;
    const paybackPeriod = annualServiceSavings > 0 ? investmentCost / annualServiceSavings : Infinity;

    return {
      refactoringInvestment,
      currentTechnicalDebt,
      expectedDebtReduction,
      debtInterestRate,
      annualDebtServiceCost,
      debtReductionBenefit,
      futureDebtServiceSavings,
      investmentCost,
      debtReductionValue,
      annualServiceSavings,
      netBenefit,
      roi,
      paybackPeriod,
      recommendation: roi >= HTTP_STATUS.OK ? 'HIGHLY_RECOMMENDED' : roi >= 100 ? 'RECOMMENDED' : 'CONDITIONAL',
      riskReduction: expectedDebtReduction / Math.max(currentTechnicalDebt, 1),
      confidence: this.calculateDebtConfidence(currentTechnicalDebt, expectedDebtReduction, debtInterestRate)
    };
  }

  /**
   * Calculate ROI for different maintenance scenarios
   * @param scenarios - Array of maintenance scenarios to compare
   * @returns Comparative ROI analysis
   */
  static compareMaintenanceROIScenarios(scenarios: MaintenanceROIScenario[]): MaintenanceROIComparison {
    const results = scenarios.map(scenario =>
      this.calculateMaintenanceROI(
        scenario.investment,
        scenario.currentMaintenanceHours,
        scenario.expectedReduction,
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
      recommendation: this.generateMaintenanceComparisonRecommendation(results)
    };
  }

  private static calculateOnboardingTimeSavings(expectedMaintenanceReduction: number, timeHorizon: number): number {
    // Assume 15% of maintenance time savings translates to onboarding time savings
    const onboardingSavingsRate = 0.15;
    return (expectedMaintenanceReduction * onboardingSavingsRate) * timeHorizon * 100; // $100/hour
  }

  private static calculateKnowledgeTransferSavings(expectedMaintenanceReduction: number, timeHorizon: number): number {
    // Assume 10% of maintenance time savings translates to knowledge transfer savings
    const knowledgeTransferSavingsRate = 0.10;
    return (expectedMaintenanceReduction * knowledgeTransferSavingsRate) * timeHorizon * 100; // $100/hour
  }

  private static generateMaintenanceRecommendation(
    roi: number,
    paybackPeriod: number,
    timeHorizon: number
  ): ROIDecision {
    if (roi >= 300) return 'HIGHLY_RECOMMENDED';
    if (roi >= 150) return 'RECOMMENDED';
    if (roi >= 75 && paybackPeriod <= timeHorizon * 0.5) return 'CONDITIONAL';
    if (roi > 0 && paybackPeriod <= timeHorizon) return 'MARGINAL';
    return 'NOT_RECOMMENDED';
  }

  private static calculateMaintenanceConfidence(
    currentMaintenanceHours: number,
    expectedReduction: number,
    timeHorizon: number
  ): number {
    // Higher confidence with higher current maintenance, moderate reductions, longer time horizon
    const currentConfidence = Math.min(currentMaintenanceHours / 20, 1) * 0.4;
    const reductionConfidence = expectedReduction > 0 && expectedReduction <= currentMaintenanceHours * 0.4 ? 0.4 : 0.2;
    const horizonConfidence = Math.min(timeHorizon / 18, 1) * 0.2;

    return Math.round((currentConfidence + reductionConfidence + horizonConfidence) * 100);
  }

  private static calculateDebtConfidence(
    currentDebt: number,
    expectedReduction: number,
    interestRate: number
  ): number {
    const debtConfidence = Math.min(currentDebt / 100, 1) * 0.4;
    const reductionConfidence = Math.min(expectedReduction / currentDebt, 1) * 0.3;
    const rateConfidence = interestRate > 0 && interestRate <= 50 ? 0.3 : 0.1;

    return Math.round((debtConfidence + reductionConfidence + rateConfidence) * 100);
  }

  private static generateMaintenanceComparisonRecommendation(results: MaintenanceROIResult[]): string {
    const recommended = results.filter(r => r.recommendation === 'HIGHLY_RECOMMENDED' || r.recommendation === 'RECOMMENDED');

    if (recommended.length === 0) return 'No scenarios meet minimum maintenance ROI thresholds';
    if (recommended.length === 1) return `Proceed with: ${recommended[0].refactoringTarget || 'the recommended scenario'}`;

    return `Compare ${recommended.length} viable scenarios focusing on cost savings and payback period`;
  }
}

/**
 * Maintenance ROI calculation result interface
 */
export interface MaintenanceROIResult {
  refactoringInvestment: number;
  currentMaintenanceHours: number;
  expectedMaintenanceReduction: number;
  timeHorizon: number;
  totalMaintenanceSavings: number;
  totalCostSavings: number;
  onboardingTimeSavings: number;
  knowledgeTransferSavings: number;
  totalCostBenefit: number;
  netBenefit: number;
  roi: number;
  paybackPeriod: number;
  recommendation: ROIDecision;
  confidence: number;
  refactoringTarget?: string;
}

/**
 * Technical debt ROI calculation result interface
 */
export interface TechnicalDebtROIResult {
  refactoringInvestment: number;
  currentTechnicalDebt: number;
  expectedDebtReduction: number;
  debtInterestRate: number;
  annualDebtServiceCost: number;
  debtReductionBenefit: number;
  futureDebtServiceSavings: number;
  investmentCost: number;
  debtReductionValue: number;
  annualServiceSavings: number;
  netBenefit: number;
  roi: number;
  paybackPeriod: number;
  recommendation: string;
  riskReduction: number;
  confidence: number;
}

/**
 * Maintenance ROI scenario for comparison
 */
export interface MaintenanceROIScenario {
  name: string;
  investment: number;
  currentMaintenanceHours: number;
  expectedReduction: number;
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
 * Comparative maintenance ROI analysis result
 */
export interface MaintenanceROIComparison {
  scenarios: MaintenanceROIResult[];
  bestROI: MaintenanceROIResult;
  quickestPayback: MaintenanceROIResult;
  recommendation: string;
}


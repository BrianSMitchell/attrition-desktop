import {
  VelocityROICalculator,
  VelocityROIResult,
  ROIDecision
} from '../calculators/velocity-roi-calculator';
import {
  QualityROICalculator,
  QualityROIResult
} from '../calculators/quality-roi-calculator';
import {
  MaintenanceROICalculator,
  MaintenanceROIResult
} from '../calculators/maintenance-roi-calculator';
import {
  FeatureROICalculator,
  FeatureDeliveryROIResult
} from '../calculators/feature-roi-calculator';

/**
 * Refactoring Decision Matrix
 * Comprehensive decision framework for evaluating refactoring opportunities
 */
export class RefactoringDecisionMatrix {
  /**
   * Evaluate a refactoring opportunity across all ROI dimensions
   * @param refactoringRequest - The refactoring request to evaluate
   * @returns Comprehensive ROI assessment across all dimensions
   */
  static async evaluateRefactoringOpportunity(
    refactoringRequest: RefactoringRequest
  ): Promise<ComprehensiveROIAssessment> {
    const assessments = await Promise.all([
      this.evaluateVelocityROI(refactoringRequest),
      this.evaluateQualityROI(refactoringRequest),
      this.evaluateMaintenanceROI(refactoringRequest),
      this.evaluateFeatureROI(refactoringRequest)
    ]);

    const [velocityROI, qualityROI, maintenanceROI, featureROI] = assessments;

    // Calculate weighted overall score
    const overallScore = this.calculateOverallScore(assessments);

    // Determine final recommendation
    const finalRecommendation = this.determineFinalRecommendation(assessments, refactoringRequest);

    // Generate risk assessment
    const riskAssessment = this.assessRisks(refactoringRequest, assessments);

    return {
      request: refactoringRequest,
      velocityROI,
      qualityROI,
      maintenanceROI,
      featureROI,
      overallScore,
      finalRecommendation,
      riskAssessment,
      timestamp: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };
  }

  /**
   * Evaluate velocity ROI dimension
   */
  private static async evaluateVelocityROI(request: RefactoringRequest): Promise<VelocityROIResult> {
    return VelocityROICalculator.calculateVelocityROI(
      request.estimatedEffort,
      request.currentVelocity,
      request.expectedVelocityGain,
      request.timeHorizon
    );
  }

  /**
   * Evaluate quality ROI dimension
   */
  private static async evaluateQualityROI(request: RefactoringRequest): Promise<QualityROIResult> {
    return QualityROICalculator.calculateQualityROI(
      request.estimatedEffort,
      request.currentBugRate,
      request.expectedBugRateReduction,
      request.timeHorizon
    );
  }

  /**
   * Evaluate maintenance ROI dimension
   */
  private static async evaluateMaintenanceROI(request: RefactoringRequest): Promise<MaintenanceROIResult> {
    return MaintenanceROICalculator.calculateMaintenanceROI(
      request.estimatedEffort,
      request.currentMaintenanceHours,
      request.expectedMaintenanceReduction,
      request.timeHorizon
    );
  }

  /**
   * Evaluate feature ROI dimension
   */
  private static async evaluateFeatureROI(request: RefactoringRequest): Promise<FeatureDeliveryROIResult> {
    return FeatureROICalculator.calculateFeatureDeliveryROI(
      request.estimatedEffort,
      request.currentFeatureDeliveryRate,
      request.expectedFeatureDeliveryGain,
      request.timeHorizon
    );
  }

  /**
   * Calculate overall weighted score across all dimensions
   */
  private static calculateOverallScore(assessments: ROIAssessmentResult[]): OverallScore {
    const weights = {
      velocity: 0.3,
      quality: 0.25,
      maintenance: 0.2,
      feature: 0.25
    };

    const scores = {
      velocity: this.normalizeScore(assessments[0].roi),
      quality: this.normalizeScore(assessments[1].roi),
      maintenance: this.normalizeScore(assessments[2].roi),
      feature: this.normalizeScore(assessments[3].roi)
    };

    const weightedScore = Object.entries(weights).reduce((total, [key, weight]) => {
      return total + (scores[key as keyof typeof scores] * weight);
    }, 0);

    return {
      score: Math.round(weightedScore),
      grade: this.getScoreGrade(weightedScore),
      breakdown: scores,
      weights
    };
  }

  /**
   * Normalize ROI score to 0-100 scale for comparison
   */
  private static normalizeScore(roi: number): number {
    // Cap at 500% ROI for scoring purposes
    const cappedROI = Math.min(Math.max(roi, -100), 500);
    return Math.round(((cappedROI + 100) / 600) * 100);
  }

  /**
   * Get letter grade for score
   */
  private static getScoreGrade(score: number): ScoreGrade {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Determine final recommendation based on all assessments
   */
  private static determineFinalRecommendation(
    assessments: ROIAssessmentResult[],
    request: RefactoringRequest
  ): RefactoringRecommendation {
    const criticalFactors = assessments.filter(a => a.recommendation === 'HIGHLY_RECOMMENDED');
    const positiveFactors = assessments.filter(a => a.recommendation === 'RECOMMENDED');
    const negativeFactors = assessments.filter(a => a.recommendation === 'NOT_RECOMMENDED');

    // Critical business factors (security, critical bugs, etc.)
    if (request.priority === 'critical' || request.riskLevel === 'critical') {
      return 'APPROVED';
    }

    // Multiple highly recommended factors
    if (criticalFactors.length >= 2) {
      return 'APPROVED';
    }

    // At least one highly recommended and no negative factors
    if (criticalFactors.length >= 1 && negativeFactors.length === 0) {
      return 'APPROVED';
    }

    // All factors positive
    if (positiveFactors.length === assessments.length) {
      return 'APPROVED';
    }

    // Mixed results - needs review
    if (positiveFactors.length > negativeFactors.length) {
      return 'REVIEW_REQUIRED';
    }

    // Mostly negative
    return 'REJECTED';
  }

  /**
   * Assess risks associated with the refactoring
   */
  private static assessRisks(
    request: RefactoringRequest,
    assessments: ROIAssessmentResult[]
  ): RiskAssessment {
    const risks: RiskFactor[] = [];

    // Technical complexity risk
    if (request.technicalComplexity >= 8) {
      risks.push({
        type: 'technical_complexity',
        probability: 'high',
        impact: 'high',
        description: 'High technical complexity may lead to unexpected issues',
        mitigation: 'Allocate additional buffer time and consider phased approach'
      });
    }

    // Team capacity risk
    if (request.teamCapacity < 0.7) {
      risks.push({
        type: 'team_capacity',
        probability: 'medium',
        impact: 'high',
        description: 'Team may be overcommitted during refactoring period',
        mitigation: 'Schedule during lower workload periods or allocate dedicated resources'
      });
    }

    // Dependency risk
    if (request.dependencies > 10) {
      risks.push({
        type: 'dependencies',
        probability: 'medium',
        impact: 'high',
        description: 'High number of dependencies increases coordination complexity',
        mitigation: 'Map dependencies carefully and plan integration points'
      });
    }

    // ROI uncertainty risk
    const lowConfidenceFactors = assessments.filter(a => a.confidence < 60);
    if (lowConfidenceFactors.length > 0) {
      risks.push({
        type: 'roi_uncertainty',
        probability: 'medium',
        impact: 'medium',
        description: 'High uncertainty in ROI calculations may lead to poor outcomes',
        mitigation: 'Gather more data and consider pilot implementation'
      });
    }

    const overallRisk = this.calculateOverallRisk(risks);

    return {
      risks,
      overallRisk,
      riskLevel: this.getRiskLevel(overallRisk),
      mitigationStrategies: this.generateMitigationStrategies(risks)
    };
  }

  private static calculateOverallRisk(risks: RiskFactor[]): number {
    const riskScore = risks.reduce((total, risk) => {
      const probabilityScore = risk.probability === 'high' ? 3 : risk.probability === 'medium' ? 2 : 1;
      const impactScore = risk.impact === 'high' ? 3 : risk.impact === 'medium' ? 2 : 1;
      return total + (probabilityScore * impactScore);
    }, 0);

    return Math.min(100, (riskScore / 9) * 100); // Normalize to 0-100 scale
  }

  private static getRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  private static generateMitigationStrategies(risks: RiskFactor[]): string[] {
    return risks.map(risk => risk.mitigation);
  }
}

/**
 * Refactoring request interface
 */
export interface RefactoringRequest {
  id: string;
  title: string;
  description: string;
  targetModule: string;
  priority: RefactoringPriority;
  riskLevel: RiskLevel;

  // ROI calculation inputs
  estimatedEffort: number; // hours
  timeHorizon: number; // sprints/months

  // Current state metrics
  currentVelocity: number;
  currentBugRate: number;
  currentMaintenanceHours: number;
  currentFeatureDeliveryRate: number;

  // Expected improvements
  expectedVelocityGain: number;
  expectedBugRateReduction: number;
  expectedMaintenanceReduction: number;
  expectedFeatureDeliveryGain: number;

  // Context factors
  technicalComplexity: number; // 1-10 scale
  teamCapacity: number; // 0-1 scale (1 = fully available)
  dependencies: number; // number of dependent modules

  // Business context
  businessValue: BusinessValue;
  stakeholderImpact: StakeholderImpact;

  // Metadata
  requestedBy: string;
  requestedAt: Date;
  tags: string[];
}

/**
 * Comprehensive ROI assessment result
 */
export interface ComprehensiveROIAssessment {
  request: RefactoringRequest;
  velocityROI: VelocityROIResult;
  qualityROI: QualityROIResult;
  maintenanceROI: MaintenanceROIResult;
  featureROI: FeatureDeliveryROIResult;
  overallScore: OverallScore;
  finalRecommendation: RefactoringRecommendation;
  riskAssessment: RiskAssessment;
  timestamp: Date;
  validUntil: Date;
}

/**
 * Overall score calculation
 */
export interface OverallScore {
  score: number;
  grade: ScoreGrade;
  breakdown: {
    velocity: number;
    quality: number;
    maintenance: number;
    feature: number;
  };
  weights: {
    velocity: number;
    quality: number;
    maintenance: number;
    feature: number;
  };
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  risks: RiskFactor[];
  overallRisk: number;
  riskLevel: RiskLevel;
  mitigationStrategies: string[];
}

/**
 * Individual risk factor
 */
export interface RiskFactor {
  type: RiskType;
  probability: RiskProbability;
  impact: RiskImpact;
  description: string;
  mitigation: string;
}

/**
 * Business value assessment
 */
export interface BusinessValue {
  revenueImpact: number; // estimated revenue impact
  costSavings: number; // estimated cost savings
  strategicImportance: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Stakeholder impact assessment
 */
export interface StakeholderImpact {
  affectedUsers: number;
  userExperienceImpact: 'positive' | 'neutral' | 'negative';
  businessProcessImpact: 'low' | 'medium' | 'high';
}

/**
 * ROI assessment result union type
 */
export type ROIAssessmentResult =
  | VelocityROIResult
  | QualityROIResult
  | MaintenanceROIResult
  | FeatureDeliveryROIResult;

/**
 * Score grade type
 */
export type ScoreGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Refactoring recommendation
 */
export type RefactoringRecommendation = 'APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED';

/**
 * Refactoring priority levels
 */
export type RefactoringPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Risk levels
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Risk types
 */
export type RiskType =
  | 'technical_complexity'
  | 'team_capacity'
  | 'dependencies'
  | 'roi_uncertainty'
  | 'integration_risk'
  | 'rollback_complexity';

/**
 * Risk probability levels
 */
export type RiskProbability = 'low' | 'medium' | 'high';

/**
 * Risk impact levels
 */
export type RiskImpact = 'low' | 'medium' | 'high';
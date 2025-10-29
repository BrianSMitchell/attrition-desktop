import { RefactoringRequest, RiskAssessment as RiskAssessmentResult } from './refactoring-decision-matrix';

import { STATUS_CODES } from '@game/shared';
/**
 * Advanced Risk Assessment Engine
 * Provides detailed risk analysis for refactoring decisions
 */
export class RiskAssessmentEngine {
  /**
   * Perform comprehensive risk assessment for a refactoring request
   * @param request - The refactoring request to assess
   * @returns Detailed risk assessment with mitigation strategies
   */
  static assessRefactoringRisks(request: RefactoringRequest): DetailedRiskAssessment {
    const technicalRisks = this.assessTechnicalRisks(request);
    const operationalRisks = this.assessOperationalRisks(request);
    const businessRisks = this.assessBusinessRisks(request);
    const externalRisks = this.assessExternalRisks(request);

    const allRisks = [...technicalRisks, ...operationalRisks, ...businessRisks, ...externalRisks];
    const overallRiskScore = this.calculateOverallRiskScore(allRisks);

    return {
      requestId: request.id,
      technicalRisks,
      operationalRisks,
      businessRisks,
      externalRisks,
      allRisks,
      overallRiskScore,
      riskLevel: this.determineRiskLevel(overallRiskScore),
      mitigationPlan: this.generateMitigationPlan(allRisks),
      contingencyPlan: this.generateContingencyPlan(request, allRisks),
      monitoringPlan: this.generateMonitoringPlan(allRisks),
      assessedAt: new Date(),
      assessedBy: 'ROI Assessment System'
    };
  }

  /**
   * Assess technical risks specific to the refactoring
   */
  private static assessTechnicalRisks(request: RefactoringRequest): DetailedRiskFactor[] {
    const risks: DetailedRiskFactor[] = [];

    // Complexity risk
    if (request.technicalComplexity >= 8) {
      risks.push({
        type: 'technical_complexity',
        category: 'technical',
        probability: 'high',
        impact: 'high',
        severity: 'critical',
        description: `High technical complexity (${request.technicalComplexity}/10) may lead to implementation challenges`,
        likelihood: 0.8,
        consequences: [
          'Extended development time',
          'Unexpected technical debt',
          'Integration issues with existing systems'
        ],
        mitigation: 'Conduct technical feasibility study and consider phased implementation approach',
        owner: 'Technical Lead',
        timeline: 'Pre-implementation'
      });
    }

    // Dependency risk
    if (request.dependencies > 15) {
      risks.push({
        type: 'dependency_complexity',
        category: 'technical',
        probability: 'medium',
        impact: 'high',
        severity: 'high',
        description: `High number of dependencies (${request.dependencies}) increases coordination complexity`,
        likelihood: 0.6,
        consequences: [
          'Integration delays',
          'Breaking changes in dependent modules',
          'Testing complexity increase'
        ],
        mitigation: 'Create detailed dependency map and schedule integration points',
        owner: 'System Architect',
        timeline: 'Planning phase'
      });
    }

    // Technology stack risk
    if (this.isExperimentalTechnology(request.targetModule)) {
      risks.push({
        type: 'technology_maturity',
        category: 'technical',
        probability: 'medium',
        impact: 'medium',
        severity: 'medium',
        description: 'Target module may use experimental or unstable technologies',
        likelihood: 0.5,
        consequences: [
          'Technology instability',
          'Lack of community support',
          'Maintenance challenges'
        ],
        mitigation: 'Evaluate technology maturity and consider fallback options',
        owner: 'Technical Lead',
        timeline: 'Pre-implementation'
      });
    }

    return risks;
  }

  /**
   * Assess operational risks
   */
  private static assessOperationalRisks(request: RefactoringRequest): DetailedRiskFactor[] {
    const risks: DetailedRiskFactor[] = [];

    // Team capacity risk
    if (request.teamCapacity < 0.6) {
      risks.push({
        type: 'team_capacity',
        category: 'operational',
        probability: 'high',
        impact: 'high',
        severity: 'high',
        description: `Limited team capacity (${Math.round(request.teamCapacity * 100)}%) may affect delivery`,
        likelihood: 0.7,
        consequences: [
          'Schedule delays',
          'Quality compromises',
          'Team burnout'
        ],
        mitigation: 'Allocate dedicated resources or adjust timeline expectations',
        owner: 'Project Manager',
        timeline: 'Resource planning'
      });
    }

    // Timeline risk
    if (request.estimatedEffort > 80) {
      risks.push({
        type: 'timeline_risk',
        category: 'operational',
        probability: 'medium',
        impact: 'high',
        severity: 'medium',
        description: `Large effort estimate (${request.estimatedEffort} hours) increases timeline uncertainty`,
        likelihood: 0.6,
        consequences: [
          'Project delays',
          'Resource conflicts',
          'Scope creep'
        ],
        mitigation: 'Break into smaller phases with clear milestones',
        owner: 'Project Manager',
        timeline: 'Planning phase'
      });
    }

    // Knowledge transfer risk
    if (request.targetModule.includes('legacy') || request.targetModule.includes('old')) {
      risks.push({
        type: 'knowledge_transfer',
        category: 'operational',
        probability: 'medium',
        impact: 'medium',
        severity: 'medium',
        description: 'Legacy code may lack proper documentation and tribal knowledge',
        likelihood: 0.6,
        consequences: [
          'Slower development pace',
          'Discovery of unknown dependencies',
          'Quality issues from misunderstanding'
        ],
        mitigation: 'Conduct code archaeology and document findings',
        owner: 'Senior Developer',
        timeline: 'Discovery phase'
      });
    }

    return risks;
  }

  /**
   * Assess business risks
   */
  private static assessBusinessRisks(request: RefactoringRequest): DetailedRiskFactor[] {
    const risks: DetailedRiskFactor[] = [];

    // Business value risk
    if (request.businessValue.strategicImportance === 'low') {
      risks.push({
        type: 'business_value_alignment',
        category: 'business',
        probability: 'low',
        impact: 'high',
        severity: 'medium',
        description: 'Refactoring may not align with current business priorities',
        likelihood: 0.3,
        consequences: [
          'Resource misallocation',
          'Opportunity cost of not working on higher-value items',
          'Stakeholder dissatisfaction'
        ],
        mitigation: 'Validate business value proposition with stakeholders',
        owner: 'Product Owner',
        timeline: 'Business case review'
      });
    }

    // Stakeholder impact risk
    if (request.stakeholderImpact.businessProcessImpact === 'high') {
      risks.push({
        type: 'stakeholder_impact',
        category: 'business',
        probability: 'medium',
        impact: 'medium',
        severity: 'medium',
        description: 'High business process impact may disrupt operations',
        likelihood: 0.5,
        consequences: [
          'Temporary productivity loss',
          'Training requirements',
          'Change management needs'
        ],
        mitigation: 'Develop change management plan and training materials',
        owner: 'Business Analyst',
        timeline: 'Pre-deployment'
      });
    }

    return risks;
  }

  /**
   * Assess external risks
   */
  private static assessExternalRisks(request: RefactoringRequest): DetailedRiskFactor[] {
    const risks: DetailedRiskFactor[] = [];

    // Market timing risk
    if (request.businessValue.strategicImportance === 'critical') {
      risks.push({
        type: 'market_timing',
        category: 'external',
        probability: 'low',
        impact: 'high',
        severity: 'medium',
        description: 'Critical business features may have market timing dependencies',
        likelihood: 0.2,
        consequences: [
          'Competitive disadvantage',
          'Revenue impact',
          'Market share loss'
        ],
        mitigation: 'Assess market timing requirements and consider MVP approach',
        owner: 'Product Manager',
        timeline: 'Business case development'
      });
    }

    // Regulatory risk (for gaming industry)
    if (this.involvesUserData(request.targetModule)) {
      risks.push({
        type: 'regulatory_compliance',
        category: 'external',
        probability: 'low',
        impact: 'critical',
        severity: 'high',
        description: 'May involve regulatory compliance considerations for user data',
        likelihood: 0.2,
        consequences: [
          'Legal penalties',
          'Data breach risks',
          'Reputation damage'
        ],
        mitigation: 'Conduct compliance review and involve legal team if needed',
        owner: 'Compliance Officer',
        timeline: 'Pre-implementation'
      });
    }

    return risks;
  }

  /**
   * Calculate overall risk score from all risk factors
   */
  private static calculateOverallRiskScore(risks: DetailedRiskFactor[]): number {
    if (risks.length === 0) return STATUS_CODES.SUCCESS;

    const totalRiskScore = risks.reduce((total, risk) => {
      const probabilityScore = this.getProbabilityScore(risk.probability);
      const impactScore = this.getImpactScore(risk.impact);
      return total + (probabilityScore * impactScore);
    }, 0);

    // Normalize to 0-100 scale
    return Math.min(100, (totalRiskScore / (risks.length * 9)) * 100);
  }

  /**
   * Determine risk level based on score
   */
  private static determineRiskLevel(score: number): RiskLevel {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'minimal';
  }

  /**
   * Generate comprehensive mitigation plan
   */
  private static generateMitigationPlan(risks: DetailedRiskFactor[]): MitigationPlan {
    const strategies = risks.map(risk => ({
      riskId: `${risk.category}_${risk.type}`,
      strategy: risk.mitigation,
      owner: risk.owner,
      timeline: risk.timeline,
      status: 'planned' as const,
      effectiveness: this.estimateMitigationEffectiveness(risk)
    }));

    const criticalStrategies = strategies.filter(s => risks.find(r =>
      `${r.category}_${r.type}` === s.riskId
    )?.severity === 'critical');

    return {
      strategies,
      criticalPath: criticalStrategies,
      estimatedEffortReduction: this.estimateTotalEffortReduction(strategies),
      successProbability: this.estimateMitigationSuccessProbability(strategies)
    };
  }

  /**
   * Generate contingency plan for high-risk scenarios
   */
  private static generateContingencyPlan(request: RefactoringRequest, risks: DetailedRiskFactor[]): ContingencyPlan {
    const highRisks = risks.filter(r => r.severity === 'critical' || r.severity === 'high');

    return {
      triggers: highRisks.map(risk => ({
        condition: `${risk.type} risk materializes`,
        action: `Execute ${risk.type} contingency measures`,
        owner: risk.owner,
        timeline: 'Within 24 hours of trigger'
      })),
      rollback: {
        strategy: 'Revert to pre-refactoring state using version control',
        estimatedTime: request.estimatedEffort * 0.2, // 20% of original effort
        successRate: 0.95,
        dataBackup: 'Required before starting refactoring'
      },
      alternatives: this.generateAlternativeApproaches(request),
      escalationPath: [
        'Development Team',
        'Technical Lead',
        'Project Manager',
        'Product Owner'
      ]
    };
  }

  /**
   * Generate monitoring plan for risk tracking
   */
  private static generateMonitoringPlan(risks: DetailedRiskFactor[]): MonitoringPlan {
    const metrics = risks.map(risk => ({
      metric: `${risk.category}_${risk.type}_status`,
      target: 'Risk level maintained or reduced',
      frequency: 'Daily during implementation',
      owner: risk.owner,
      alertThreshold: this.getAlertThreshold(risk.severity)
    }));

    return {
      metrics,
      checkpoints: [
        'Pre-implementation risk assessment',
        'Weekly progress reviews',
        'Milestone completion reviews',
        'Post-implementation assessment'
      ],
      earlyWarningIndicators: risks.map(r => ({
        indicator: `${r.type}_early_warning`,
        threshold: this.getEarlyWarningThreshold(r),
        action: `Review ${r.type} mitigation strategies`
      }))
    };
  }

  // Helper methods
  private static getProbabilityScore(probability: string): number {
    return probability === 'high' ? 3 : probability === 'medium' ? 2 : 1;
  }

  private static getImpactScore(impact: string): number {
    return impact === 'critical' ? 3 : impact === 'high' ? 3 : impact === 'medium' ? 2 : 1;
  }

  private static estimateMitigationEffectiveness(risk: DetailedRiskFactor): number {
    // Estimate based on risk characteristics
    const baseEffectiveness = 0.7; // 70% average effectiveness
    const severityMultiplier = risk.severity === 'critical' ? 0.8 :
                              risk.severity === 'high' ? 0.9 : 1.0;
    return Math.round(baseEffectiveness * severityMultiplier * 100);
  }

  private static estimateTotalEffortReduction(strategies: MitigationStrategy[]): number {
    return strategies.reduce((total, strategy) => {
      const baseReduction = strategy.effectiveness / 100 * 0.1; // Up to 10% reduction per strategy
      return total + baseReduction;
    }, 0) * 100; // Convert to percentage
  }

  private static estimateMitigationSuccessProbability(strategies: MitigationStrategy[]): number {
    const avgEffectiveness = strategies.reduce((sum, s) => sum + s.effectiveness, 0) / strategies.length;
    return Math.round(Math.min(95, avgEffectiveness + 20)); // Cap at 95%
  }

  private static generateAlternativeApproaches(request: RefactoringRequest): AlternativeApproach[] {
    return [
      {
        name: 'Phased Approach',
        description: 'Implement refactoring in smaller, manageable phases',
        effort: request.estimatedEffort * 1.2, // 20% more effort but lower risk
        risk: 'low',
        timeline: request.timeHorizon * 1.5 // 50% longer timeline
      },
      {
        name: 'Parallel Development',
        description: 'Develop refactored version alongside current version',
        effort: request.estimatedEffort * 1.8, // 80% more effort
        risk: 'medium',
        timeline: request.timeHorizon * 1.2 // 20% longer timeline
      },
      {
        name: 'Incremental Improvement',
        description: 'Make smaller improvements over time rather than big bang refactoring',
        effort: request.estimatedEffort * 0.6, // 40% less effort
        risk: 'low',
        timeline: request.timeHorizon * 2 // Double the timeline
      }
    ];
  }

  private static getAlertThreshold(severity: string): string {
    return severity === 'critical' ? 'Any increase' :
           severity === 'high' ? '10% increase' :
           '25% increase';
  }

  private static getEarlyWarningThreshold(risk: DetailedRiskFactor): string {
    return `${risk.type} indicators show 50% increase in probability`;
  }

  private static isExperimentalTechnology(moduleName: string): boolean {
    const experimentalPatterns = ['experimental', 'beta', 'v0', 'alpha', 'test'];
    return experimentalPatterns.some(pattern => moduleName.toLowerCase().includes(pattern));
  }

  private static involvesUserData(moduleName: string): boolean {
    const dataPatterns = ['user', 'auth', 'profile', 'account', 'player'];
    return dataPatterns.some(pattern => moduleName.toLowerCase().includes(pattern));
  }
}

/**
 * Detailed risk assessment result
 */
export interface DetailedRiskAssessment {
  requestId: string;
  technicalRisks: DetailedRiskFactor[];
  operationalRisks: DetailedRiskFactor[];
  businessRisks: DetailedRiskFactor[];
  externalRisks: DetailedRiskFactor[];
  allRisks: DetailedRiskFactor[];
  overallRiskScore: number;
  riskLevel: RiskLevel;
  mitigationPlan: MitigationPlan;
  contingencyPlan: ContingencyPlan;
  monitoringPlan: MonitoringPlan;
  assessedAt: Date;
  assessedBy: string;
}

/**
 * Mitigation plan interface
 */
export interface MitigationPlan {
  strategies: MitigationStrategy[];
  criticalPath: MitigationStrategy[];
  estimatedEffortReduction: number; // percentage
  successProbability: number; // percentage
}

/**
 * Individual mitigation strategy
 */
export interface MitigationStrategy {
  riskId: string;
  strategy: string;
  owner: string;
  timeline: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  effectiveness: number; // percentage
}

/**
 * Contingency plan interface
 */
export interface ContingencyPlan {
  triggers: ContingencyTrigger[];
  rollback: RollbackStrategy;
  alternatives: AlternativeApproach[];
  escalationPath: string[];
}

/**
 * Contingency trigger
 */
export interface ContingencyTrigger {
  condition: string;
  action: string;
  owner: string;
  timeline: string;
}

/**
 * Rollback strategy
 */
export interface RollbackStrategy {
  strategy: string;
  estimatedTime: number; // hours
  successRate: number; // percentage
  dataBackup: string;
}

/**
 * Alternative approach
 */
export interface AlternativeApproach {
  name: string;
  description: string;
  effort: number; // multiplier of original effort
  risk: RiskLevel;
  timeline: number; // multiplier of original timeline
}

/**
 * Monitoring plan interface
 */
export interface MonitoringPlan {
  metrics: MonitoringMetric[];
  checkpoints: string[];
  earlyWarningIndicators: EarlyWarningIndicator[];
}

/**
 * Monitoring metric
 */
export interface MonitoringMetric {
  metric: string;
  target: string;
  frequency: string;
  owner: string;
  alertThreshold: string;
}

/**
 * Early warning indicator
 */
export interface EarlyWarningIndicator {
  indicator: string;
  threshold: string;
  action: string;
}

/**
 * Enhanced risk factor interface
 */
export interface DetailedRiskFactor {
  type: string;
  category: 'technical' | 'operational' | 'business' | 'external';
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  likelihood: number; // 0-1 probability
  consequences: string[];
  mitigation: string;
  owner: string;
  timeline: string;
}

/**
 * Risk level type
 */
export type RiskLevel = 'minimal' | 'low' | 'medium' | 'high' | 'critical';
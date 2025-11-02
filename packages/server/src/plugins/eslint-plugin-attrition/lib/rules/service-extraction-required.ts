/**
 * @fileoverview Rule to ensure routes follow service extraction pattern in Attrition codebase
 * @author Attrition Development Team
 */

import { Rule } from 'eslint';
import { calculateComplexity } from '../utils/astHelpers';

/**
 * Interface for route concerns breakdown
 */
interface ConcernsData {
  http: number;
  businessLogic: number;
  dataAccess: number;
  validation: number;
}

/**
 * Interface for detected patterns in routes
 */
interface PatternsData {
  databaseCalls: number;
  validations: number;
  conditionals: number;
  serviceCalls: number;
}

/**
 * Interface for route analysis results
 */
interface RouteAnalysis {
  routeInfo?: {
    path?: string;
    method?: string;
    node?: any;
    name?: string;
    line?: number;
  };
  node: any;
  complexity: number;
  lineCount: number;
  concerns: ConcernsData;
  patterns: PatternsData;
  issues: string[];
}

/**
 * Interface for rule options
 */
interface ServiceExtractionOptions {
  minServiceScore?: number;
  maxRouteComplexity?: number;
  maxRouteLength?: number;
  requireServiceImport?: boolean;
  allowMixedConcerns?: boolean;
}

/**
 * Rule to enforce service extraction pattern and prevent route bloat
 * Ensures proper separation of concerns between routes and business logic
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce service extraction pattern for routes and prevent mixed concerns',
      category: 'Best Practices',
      recommended: true,
      url: 'https://github.com/attrition-game/server/blob/main/docs/eslint-rules.md#service-extraction-required'
    },
    fixable: null, // Complex refactoring not suitable for auto-fix
    schema: [
      {
        type: 'object',
        properties: {
          minServiceScore: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            default: 80
          },
          maxRouteComplexity: {
            type: 'number',
            minimum: 1,
            default: 15
          },
          maxRouteLength: {
            type: 'number',
            minimum: 1,
            default: 50
          },
          requireServiceImport: {
            type: 'boolean',
            default: true
          },
          allowMixedConcerns: {
            type: 'boolean',
            default: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      routeTooComplex: 'Route complexity ({{complexity}}) exceeds maximum ({{maxComplexity}}). Extract to service layer.',
      routeTooLong: 'Route handler too long ({{lines}} lines). Extract business logic to service.',
      missingServiceImport: 'Route contains business logic but no service import found. Extract to service.',
      mixedConcerns: 'Route mixes HTTP concerns with business logic. Extract business logic to service layer.',
      insufficientServiceExtraction: 'Service extraction score ({{score}}%) below minimum ({{minScore}}%). Refactor route.',
      databaseInRoute: 'Database operations found in route. Extract to service layer.',
      validationInRoute: 'Input validation in route. Extract to service layer.',
      complexConditionalsInRoute: 'Complex conditional logic in route. Extract to service layer.'
    }
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    /**
     * Parses rule options with defaults
     */
    function parseOptions(options: ServiceExtractionOptions): {
      minServiceScore: number;
      maxRouteComplexity: number;
      maxRouteLength: number;
      requireServiceImport: boolean;
      allowMixedConcerns: boolean;
    } {
      return {
        minServiceScore: options.minServiceScore || 80,
        maxRouteComplexity: options.maxRouteComplexity || 15,
        maxRouteLength: options.maxRouteLength || 50,
        requireServiceImport: options.requireServiceImport !== false,
        allowMixedConcerns: options.allowMixedConcerns || false
      };
    }

    /**
     * Checks if an import is a service import
     */
    function isServiceImport(node: any): boolean {
      const importNode = node as any;
      const source = importNode.source?.value as string;
      return source.includes('Service') || source.includes('service');
    }

    const options = parseOptions((context.options[0] as ServiceExtractionOptions) || {});
    const { minServiceScore, maxRouteComplexity, maxRouteLength, requireServiceImport, allowMixedConcerns } = options;

    const routeAnalyses: RouteAnalysis[] = [];
    let hasServiceImports = false;

    // Check for service imports
    function checkImports(node: any): void {
      if (isServiceImport(node)) {
        hasServiceImports = true;
      }
    }

    // Analyze route handler complexity and patterns
    function analyzeRouteHandler(node: any, routeInfo?: any): RouteAnalysis {
      const analysis: RouteAnalysis = {
        routeInfo,
        node,
        complexity: 0,
        lineCount: 0,
        concerns: {
          http: 0,
          businessLogic: 0,
          dataAccess: 0,
          validation: 0
        },
        patterns: {
          databaseCalls: 0,
          validations: 0,
          conditionals: 0,
          serviceCalls: 0
        },
        issues: []
      };

      // Calculate complexity and analyze patterns
      if ((node as any).body) {
        analysis.lineCount = countLines((node as any).body);
        analysis.complexity = calculateComplexity(node);

        // Analyze body for different concerns
        analyzeConcerns((node as any).body, analysis);
      }

      return analysis;
    }

    function countLines(node: any): number {
      if (!node.loc) {
        return 0;
      }
      return node.loc.end.line - node.loc.start.line + 1;
    }

    /**
     * Counts HTTP concerns in source text
     */
    function countHttpConcerns(sourceText: string, analysis: RouteAnalysis): void {
      if (sourceText.includes('req.') || sourceText.includes('res.') || sourceText.includes('next(')) {
        analysis.concerns.http++;
      }
    }

    /**
     * Counts database calls in source text
     */
    function countDatabaseCalls(sourceText: string, analysis: RouteAnalysis): void {
      if (
        sourceText.includes('.find(') ||
        sourceText.includes('.create(') ||
        sourceText.includes('.update(') ||
        sourceText.includes('.delete(') ||
        sourceText.includes('.save(') ||
        sourceText.includes('.exec()')
      ) {
        analysis.concerns.dataAccess++;
        analysis.patterns.databaseCalls++;
      }
    }

    /**
     * Counts validations in source text
     */
    function countValidations(sourceText: string, analysis: RouteAnalysis): void {
      if (
        sourceText.includes('validate') ||
        sourceText.includes('zod') ||
        sourceText.includes('joi') ||
        sourceText.includes('schema')
      ) {
        analysis.concerns.validation++;
        analysis.patterns.validations++;
      }
    }

    /**
     * Counts conditional statements in source text
     */
    function countConditionals(sourceText: string, analysis: RouteAnalysis): void {
      if (
        sourceText.includes('if (') ||
        sourceText.includes('switch (') ||
        sourceText.includes('try {') ||
        sourceText.includes('catch (')
      ) {
        analysis.patterns.conditionals++;
      }
    }

    /**
     * Counts service calls in source text
     */
    function countServiceCalls(sourceText: string, analysis: RouteAnalysis): void {
      if (
        sourceText.includes('Service') ||
        sourceText.includes('service') ||
        sourceText.includes('await') ||
        sourceText.includes('Promise')
      ) {
        analysis.patterns.serviceCalls++;
      }
    }

    /**
     * Analyzes concerns in a node
     */
    function analyzeConcerns(node: any, analysis: RouteAnalysis): void {
      const sourceText = context.getSourceCode().getText(node);

      // Count different types of concerns
      countHttpConcerns(sourceText, analysis);
      countDatabaseCalls(sourceText, analysis);
      countValidations(sourceText, analysis);
      countConditionals(sourceText, analysis);
      countServiceCalls(sourceText, analysis);

      // Calculate business logic score (everything that's not HTTP)
      analysis.concerns.businessLogic = analysis.concerns.dataAccess + analysis.concerns.validation + analysis.patterns.conditionals;

      // Walk child nodes for detailed analysis
      if (node.body && Array.isArray(node.body)) {
        node.body.forEach((child: Node) => analyzeConcerns(child, analysis));
      }

      if (node.consequent) {
        analyzeConcerns(node.consequent, analysis);
      }

      if (node.alternate) {
        analyzeConcerns(node.alternate, analysis);
      }
    }

    /**
     * Calculates service extraction score
     */
    function calculateServiceExtractionScore(analysis: RouteAnalysis): number {
      const { concerns, patterns } = analysis;

      // Calculate score based on separation of concerns
      const totalConcerns = concerns.http + concerns.businessLogic + concerns.dataAccess + concerns.validation;
      if (totalConcerns === 0) {
        return 100;
      }

      // Score is higher when HTTP and business logic are balanced and separate
      let score = 50; // Base score

      // Bonus for having service calls
      if (patterns.serviceCalls > 0) {
        score += 20;
      }

      // Bonus for minimal mixed concerns
      if (concerns.http > 0 && concerns.businessLogic === 0) {
        score += 20;
      }

      // Penalty for mixed concerns
      if (concerns.http > 0 && concerns.businessLogic > 0) {
        score -= 15;
      }

      // Penalty for database calls in routes
      if (patterns.databaseCalls > 0) {
        score -= 10;
      }

      return Math.max(0, Math.min(100, score));
    }

    /**
     * Reports issues for a single route analysis
     */
    function reportRouteIssues(analysis: RouteAnalysis): void {
      const { complexity, lineCount, concerns, patterns } = analysis;

      // Check complexity threshold
      if (complexity > maxRouteComplexity) {
        context.report({
          node: analysis.node,
          messageId: 'routeTooComplex',
          data: {
            complexity,
            maxComplexity: maxRouteComplexity
          }
        });
      }

      // Check line length threshold
      if (lineCount > maxRouteLength) {
        context.report({
          node: analysis.node,
          messageId: 'routeTooLong',
          data: {
            lines: lineCount
          }
        });
      }

      // Check for mixed concerns
      if (concerns.http > 0 && concerns.businessLogic > 0 && !allowMixedConcerns) {
        context.report({
          node: analysis.node,
          messageId: 'mixedConcerns'
        });
      }

      // Check for database calls in routes
      if (patterns.databaseCalls > 0) {
        context.report({
          node: analysis.node,
          messageId: 'databaseInRoute'
        });
      }

      // Check for validation in routes
      if (patterns.validations > 0) {
        context.report({
          node: analysis.node,
          messageId: 'validationInRoute'
        });
      }

      // Check for complex conditionals in routes
      if (patterns.conditionals > 2) {
        context.report({
          node: analysis.node,
          messageId: 'complexConditionalsInRoute'
        });
      }

      // Check service extraction score
      const serviceScore = calculateServiceExtractionScore(analysis);
      if (serviceScore < minServiceScore) {
        context.report({
          node: analysis.node,
          messageId: 'insufficientServiceExtraction',
          data: {
            score: serviceScore.toFixed(1),
            minScore: minServiceScore
          }
        });
      }

      // Check for missing service imports when business logic is present
      if (requireServiceImport && concerns.businessLogic > 0 && !hasServiceImports) {
        context.report({
          node: analysis.node,
          messageId: 'missingServiceImport'
        });
      }
    }

    return {
      // Check imports
      ImportDeclaration(node: any): void {
        checkImports(node);
      },

      // Detect route definitions (Express.js pattern)
      ExpressionStatement(node: any): void {
        const exprNode = node as any;
        if (
          exprNode.expression &&
          exprNode.expression.type === 'CallExpression' &&
          exprNode.expression.callee &&
          exprNode.expression.callee.type === 'MemberExpression' &&
          exprNode.expression.callee.property &&
          exprNode.expression.callee.property.name &&
          (['post', 'get', 'put', 'delete', 'patch'].includes(exprNode.expression.callee.property.name))
        ) {
          // This is likely a route definition
          const routeCall = exprNode.expression;
          if (routeCall.arguments && routeCall.arguments.length >= 2) {
            const routePath = routeCall.arguments[0]?.value;
            const handler = routeCall.arguments[1];

            if (handler && (handler.type === 'Identifier' || handler.type === 'FunctionExpression' || handler.type === 'ArrowFunctionExpression')) {
              const currentRoute = {
                path: routePath,
                method: routeCall.callee.property.name.toUpperCase(),
                node: handler,
                line: node.loc?.start.line || 0
              };

              // Analyze the route handler
              const analysis = analyzeRouteHandler(handler, currentRoute);
              routeAnalyses.push(analysis);
            }
          }
        }
      },

      // Check function declarations that might be route handlers
      FunctionDeclaration(node: any): void {
        const funcNode = node as any;
        if (funcNode.id && (funcNode.id.name.includes('Handler') || funcNode.id.name.includes('Route'))) {
          const analysis = analyzeRouteHandler(node, {
            name: funcNode.id.name,
            node,
            line: node.loc?.start.line
          });
          routeAnalyses.push(analysis);
        }
      },

      // End of file analysis
      'Program:exit'(): void {
        // Analyze all collected route analyses
        for (const analysis of routeAnalyses) {
          reportRouteIssues(analysis);
        }
      }
    };
  }
};

export = rule;
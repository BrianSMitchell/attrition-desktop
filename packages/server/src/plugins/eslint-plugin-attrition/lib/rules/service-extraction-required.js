/**

import { STATUS_CODES } from '@shared/constants/magic-numbers';
/**
 * @fileoverview Rule to ensure routes follow service extraction pattern in Attrition codebase
 * @author Attrition Development Team
 */

'use strict';

// Import utilities
const { calculateComplexity } = require('../utils/astHelpers');

/**
 * Rule to enforce service extraction pattern and prevent route bloat
 * Ensures proper separation of concerns between routes and business logic
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce service extraction pattern for routes and prevent mixed concerns',
      category: 'Best Practices',
      recommended: true,
      url: 'https://github.com/attrition-game/server/blob/main/docs/eslint-rules.md#service-extraction-required',
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
            default: 80,
          },
          maxRouteComplexity: {
            type: 'number',
            minimum: 1,
            default: 15,
          },
          maxRouteLength: {
            type: 'number',
            minimum: 1,
            default: 50,
          },
          requireServiceImport: {
            type: 'boolean',
            default: true,
          },
          allowMixedConcerns: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      routeTooComplex: 'Route complexity ({{complexity}}) exceeds maximum ({{maxComplexity}}). Extract to service layer.',
      routeTooLong: 'Route handler too long ({{lines}} lines). Extract business logic to service.',
      missingServiceImport: 'Route contains business logic but no service import found. Extract to service.',
      mixedConcerns: 'Route mixes HTTP concerns with business logic. Extract business logic to service layer.',
      insufficientServiceExtraction: 'Service extraction score ({{score}}%) below minimum ({{minScore}}%). Refactor route.',
      databaseInRoute: 'Database operations found in route. Extract to service layer.',
      validationInRoute: 'Input validation in route. Extract to service layer.',
      complexConditionalsInRoute: 'Complex conditional logic in route. Extract to service layer.',
    },
  },

  create(context) {
    /**
     * Parses rule options with defaults
     * @param {Object} options - Rule options from context
     * @returns {Object} Parsed configuration object
     */
    function parseOptions(options) {
      return {
        minServiceScore: options.minServiceScore || 80,
        maxRouteComplexity: options.maxRouteComplexity || 15,
        maxRouteLength: options.maxRouteLength || 50,
        requireServiceImport: options.requireServiceImport !== false,
        allowMixedConcerns: options.allowMixedConcerns || false,
      };
    }

    /**
     * Checks if an import is a service import
     * @param {Object} node - Import declaration node
     * @returns {boolean} True if it's a service import
     */
    function isServiceImport(node) {
      const source = node.source.value;
      return source.includes('Service') || source.includes('service');
    }
    const options = parseOptions(context.options[0] || {});
    const { minServiceScore, maxRouteComplexity, maxRouteLength, requireServiceImport, allowMixedConcerns } = options;

    const routeAnalyses = [];
    let currentRoute = null;
    let hasServiceImports = false;

    // Check for service imports
    function checkImports(node) {
      if (node.type === 'ImportDeclaration' && isServiceImport(node)) {
        hasServiceImports = true;
      }
    }

    // Analyze route handler complexity and patterns
    function analyzeRouteHandler(node, routeInfo) {
      const analysis = {
        routeInfo,
        node,
        complexity: 0,
        lineCount: 0,
        concerns: {
          http: 0,
          businessLogic: 0,
          dataAccess: 0,
          validation: 0,
        },
        patterns: {
          databaseCalls: 0,
          validations: 0,
          conditionals: 0,
          serviceCalls: 0,
        },
        issues: [],
      };

      // Calculate complexity and analyze patterns
      if (node.body) {
        analysis.lineCount = countLines(node.body);
        analysis.complexity = calculateComplexity(node);

        // Analyze body for different concerns
        analyzeConcerns(node.body, analysis);
      }

      return analysis;
    }

    function countLines(node) {
      if (!node.loc) {
        return STATUS_CODES.SUCCESS;
      }
      return node.loc.end.line - node.loc.start.line + 1;
    }

    /**
     * Counts HTTP concerns in source text
     * @param {string} sourceText - Source code text
     * @param {Object} analysis - Analysis object to update
     */
    function countHttpConcerns(sourceText, analysis) {
      if (sourceText.includes('req.') || sourceText.includes('res.') || sourceText.includes('next(')) {
        analysis.concerns.http++;
      }
    }

    /**
     * Counts database calls in source text
     * @param {string} sourceText - Source code text
     * @param {Object} analysis - Analysis object to update
     */
    function countDatabaseCalls(sourceText, analysis) {
      if (sourceText.includes('.find(') || sourceText.includes('.create(') ||
          sourceText.includes('.update(') || sourceText.includes('.delete(') ||
          sourceText.includes('.save(') || sourceText.includes('.exec()')) {
        analysis.concerns.dataAccess++;
        analysis.patterns.databaseCalls++;
      }
    }

    /**
     * Counts validations in source text
     * @param {string} sourceText - Source code text
     * @param {Object} analysis - Analysis object to update
     */
    function countValidations(sourceText, analysis) {
      if (sourceText.includes('validate') || sourceText.includes('zod') ||
          sourceText.includes('joi') || sourceText.includes('schema')) {
        analysis.concerns.validation++;
        analysis.patterns.validations++;
      }
    }

    /**
     * Counts conditional statements in source text
     * @param {string} sourceText - Source code text
     * @param {Object} analysis - Analysis object to update
     */
    function countConditionals(sourceText, analysis) {
      if (sourceText.includes('if (') || sourceText.includes('switch (') ||
          sourceText.includes('try {') || sourceText.includes('catch (')) {
        analysis.patterns.conditionals++;
      }
    }

    /**
     * Counts service calls in source text
     * @param {string} sourceText - Source code text
     * @param {Object} analysis - Analysis object to update
     */
    function countServiceCalls(sourceText, analysis) {
      if (sourceText.includes('Service') || sourceText.includes('service') ||
          sourceText.includes('await') || sourceText.includes('Promise')) {
        analysis.patterns.serviceCalls++;
      }
    }

    /**
     * Analyzes concerns in a node (simplified version)
     * @param {Object} node - AST node
     * @param {Object} analysis - Analysis object to update
     */
    function analyzeConcerns(node, analysis) {
      const sourceText = context.getSourceCode().getText(node);

      // Count different types of concerns
      countHttpConcerns(sourceText, analysis);
      countDatabaseCalls(sourceText, analysis);
      countValidations(sourceText, analysis);
      countConditionals(sourceText, analysis);
      countServiceCalls(sourceText, analysis);

      // Calculate business logic score (everything that's not HTTP)
      analysis.concerns.businessLogic = analysis.concerns.dataAccess +
                                       analysis.concerns.validation +
                                       analysis.patterns.conditionals;

      // Walk child nodes for detailed analysis
      if (node.body && Array.isArray(node.body)) {
        node.body.forEach(child => analyzeConcerns(child, analysis));
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
     * @param {Object} analysis - Analysis object
     * @returns {number} Score from 0-100
     */
    function calculateServiceExtractionScore(analysis) {
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
     * @param {Object} analysis - Route analysis object
     */
    function reportRouteIssues(analysis) {
      const { routeInfo, complexity, lineCount, concerns, patterns, issues } = analysis;

      // Check complexity threshold
      if (complexity > maxRouteComplexity) {
        context.report({
          node: analysis.node,
          messageId: 'routeTooComplex',
          data: {
            complexity,
            maxComplexity: maxRouteComplexity,
          },
        });
      }

      // Check line length threshold
      if (lineCount > maxRouteLength) {
        context.report({
          node: analysis.node,
          messageId: 'routeTooLong',
          data: {
            lines: lineCount,
          },
        });
      }

      // Check for mixed concerns
      if (concerns.http > 0 && concerns.businessLogic > 0 && !allowMixedConcerns) {
        context.report({
          node: analysis.node,
          messageId: 'mixedConcerns',
        });
      }

      // Check for database calls in routes
      if (patterns.databaseCalls > 0) {
        context.report({
          node: analysis.node,
          messageId: 'databaseInRoute',
        });
      }

      // Check for validation in routes
      if (patterns.validations > 0) {
        context.report({
          node: analysis.node,
          messageId: 'validationInRoute',
        });
      }

      // Check for complex conditionals in routes
      if (patterns.conditionals > 2) {
        context.report({
          node: analysis.node,
          messageId: 'complexConditionalsInRoute',
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
            minScore: minServiceScore,
          },
        });
      }

      // Check for missing service imports when business logic is present
      if (requireServiceImport && concerns.businessLogic > 0 && !hasServiceImports) {
        context.report({
          node: analysis.node,
          messageId: 'missingServiceImport',
        });
      }
    }

    /**
     * Reports overall file analysis results
     */
    function reportFileAnalysis() {
      // File-level analysis could be added here if needed
      // For now, individual route analysis is sufficient
    }

    return {
      // Check imports
      ImportDeclaration: checkImports,

      // Detect route definitions (Express.js pattern)
      ExpressionStatement(node) {
        if (node.expression && node.expression.type === 'CallExpression' &&
            node.expression.callee && node.expression.callee.type === 'MemberExpression' &&
            node.expression.callee.property && node.expression.callee.property.name &&
            (node.expression.callee.property.name === 'post' ||
             node.expression.callee.property.name === 'get' ||
             node.expression.callee.property.name === 'put' ||
             node.expression.callee.property.name === 'delete' ||
             node.expression.callee.property.name === 'patch')) {

          // This is likely a route definition
          const routeCall = node.expression;
          if (routeCall.arguments && routeCall.arguments.length >= 2) {
            const routePath = routeCall.arguments[0] && routeCall.arguments[0].value;
            const handler = routeCall.arguments[1];

            if (handler && (handler.type === 'Identifier' || handler.type === 'FunctionExpression')) {
              currentRoute = {
                path: routePath,
                method: routeCall.callee.property.name.toUpperCase(),
                node: handler,
                line: node.loc && node.loc.start ? node.loc.start.line : 0,
              };

              // Analyze the route handler
              const analysis = analyzeRouteHandler(handler, currentRoute);
              routeAnalyses.push(analysis);
            }
          }
        }
      },

      // Check function declarations that might be route handlers
      FunctionDeclaration(node) {
        if (node.id && (node.id.name.includes('Handler') || node.id.name.includes('Route'))) {
          const analysis = analyzeRouteHandler(node, {
            name: node.id.name,
            node,
            line: node.loc.start.line,
          });
          routeAnalyses.push(analysis);
        }
      },

      // End of file analysis
      'Program:exit'() {
        // Analyze all collected route analyses
        for (const analysis of routeAnalyses) {
          reportRouteIssues(analysis);
        }

        // Overall file analysis
        reportFileAnalysis();
      },
    };
  },
};

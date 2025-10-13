/**
 * @fileoverview Rule to enforce custom complexity limits for game patterns in Attrition codebase
 * @author Attrition Development Team
 */

"use strict";

// Import utilities
const { calculateComplexity, getAllFunctions } = require('../utils/astHelpers');
const { getProjectConfig } = require('../utils/metricsIntegration');

/**
 * Rule to enforce complexity limits with game-specific patterns
 * Integrates with existing metrics system for consistent thresholds
 */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce custom complexity limits for game patterns and maintainability",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/attrition-game/server/blob/main/docs/eslint-rules.md#max-complexity"
    },
    fixable: null, // Complexity reduction requires manual refactoring
    schema: [
      {
        type: "object",
        properties: {
          maxPerFunction: {
            type: "number",
            minimum: 1,
            default: 10
          },
          maxPerFile: {
            type: "number",
            minimum: 1,
            default: 50
          },
          gamePatternMultipliers: {
            type: "object",
            patternProperties: {
              ".*": { type: "number", minimum: 0.1 }
            },
            default: {
              "game-loop": 1.5,
              "combat-calculation": 1.2,
              "resource-optimization": 1.3,
              "pathfinding": 1.4,
              "ai-decision": 1.3
            }
          },
          ignoreGamePatterns: {
            type: "boolean",
            default: false
          },
          complexityWeights: {
            type: "object",
            properties: {
              ifStatements: { type: "number", default: 1 },
              loops: { type: "number", default: 2 },
              switches: { type: "number", default: 1 },
              catches: { type: "number", default: 3 },
              nestedFunctions: { type: "number", default: 2 }
            },
            default: {
              ifStatements: 1,
              loops: 2,
              switches: 1,
              catches: 3,
              nestedFunctions: 2
            }
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      functionTooComplex: "Function '{{name}}' complexity ({{complexity}}) exceeds maximum ({{maxComplexity}}).",
      fileTooComplex: "File complexity ({{complexity}}) exceeds maximum ({{maxComplexity}}).",
      gamePatternComplexity: "Game pattern '{{pattern}}' complexity ({{complexity}}) exceeds adjusted limit ({{adjustedMax}}).",
      highComplexityWarning: "High complexity detected ({{complexity}}). Consider refactoring for maintainability.",
      nestedComplexityRisk: "Deep nesting increases complexity. Consider flattening logic."
    }
  },

  create(context) {
    const config = getProjectConfig();
    const options = context.options[0] || {};
    const maxPerFunction = options.maxPerFunction || 10;
    const maxPerFile = options.maxPerFile || 50;
    const gamePatternMultipliers = options.gamePatternMultipliers || {};
    const ignoreGamePatterns = options.ignoreGamePatterns || false;
    const complexityWeights = options.complexityWeights || {};

    const functionComplexities = [];
    const fileComplexity = { total: 0, patterns: {} };
    let ast = null;

    // Detect game patterns in functions
    function detectGamePattern(functionNode) {
      const sourceText = context.getSourceCode().getText(functionNode);

      // Game loop patterns
      if (sourceText.includes('gameLoop') || sourceText.includes('tick') ||
          sourceText.includes('update') || sourceText.includes('process')) {
        return 'game-loop';
      }

      // Combat calculation patterns
      if (sourceText.includes('combat') || sourceText.includes('battle') ||
          sourceText.includes('damage') || sourceText.includes('attack')) {
        return 'combat-calculation';
      }

      // Resource optimization patterns
      if (sourceText.includes('resource') || sourceText.includes('optimization') ||
          sourceText.includes('efficiency') || sourceText.includes('allocation')) {
        return 'resource-optimization';
      }

      // Pathfinding patterns
      if (sourceText.includes('pathfind') || sourceText.includes('navigate') ||
          sourceText.includes('astar') || sourceText.includes('dijkstra')) {
        return 'pathfinding';
      }

      // AI decision patterns
      if (sourceText.includes('decide') || sourceText.includes('strategy') ||
          sourceText.includes('evaluate') || sourceText.includes('algorithm')) {
        return 'ai-decision';
      }

      return 'general';
    }

    // Calculate adjusted complexity limit for game patterns
    function getAdjustedComplexityLimit(baseLimit, pattern) {
      if (ignoreGamePatterns || !gamePatternMultipliers[pattern]) {
        return baseLimit;
      }

      return Math.floor(baseLimit * gamePatternMultipliers[pattern]);
    }

    // Enhanced complexity calculation with weights
    function calculateWeightedComplexity(node) {
      let complexity = 1; // Base complexity

      function walk(n) {
        switch (n.type) {
          case 'IfStatement':
          case 'ConditionalExpression':
            complexity += complexityWeights.ifStatements || 1;
            break;
          case 'ForStatement':
          case 'ForInStatement':
          case 'ForOfStatement':
          case 'WhileStatement':
          case 'DoWhileStatement':
            complexity += complexityWeights.loops || 2;
            break;
          case 'SwitchStatement':
            complexity += complexityWeights.switches || 1;
            break;
          case 'TryStatement':
            complexity += complexityWeights.catches || 3; // Try-catch is complex
            break;
          case 'CatchClause':
            // Already counted in TryStatement
            break;
          case 'FunctionDeclaration':
          case 'FunctionExpression':
          case 'ArrowFunctionExpression':
            complexity += complexityWeights.nestedFunctions || 2;
            // Don't recurse into nested functions for complexity calculation
            return;
          case 'LogicalExpression':
            if (n.operator === '&&' || n.operator === '||') {
              complexity += 0.5; // Logical operators add some complexity but less than conditionals
            }
            break;
        }

        // Walk child nodes
        if (n.body && Array.isArray(n.body)) {
          n.body.forEach(child => walk(child));
        }

        if (n.body && typeof n.body === 'object') {
          walk(n.body);
        }

        if (n.consequent) {
          walk(n.consequent);
        }

        if (n.alternate) {
          walk(n.alternate);
        }

        if (n.cases) {
          n.cases.forEach(caseNode => walk(caseNode));
        }

        if (n.handlers) {
          n.handlers.forEach(handler => walk(handler));
        }

        if (n.finalizer) {
          walk(n.finalizer);
        }
      }

      if (node.body) {
        walk(node.body);
      }

      return Math.round(complexity);
    }

    return {
      // Store the AST for analysis
      Program(node) {
        ast = node;
      },

      // Analyze function declarations
      FunctionDeclaration(node) {
        const complexity = calculateWeightedComplexity(node);
        const pattern = detectGamePattern(node);
        const adjustedMax = getAdjustedComplexityLimit(maxPerFunction, pattern);

        functionComplexities.push({
          name: node.id ? node.id.name : 'anonymous',
          node,
          complexity,
          pattern,
          adjustedMax,
          line: node.loc.start.line,
          column: node.loc.start.column
        });

        fileComplexity.total += complexity;
        fileComplexity.patterns[pattern] = (fileComplexity.patterns[pattern] || 0) + complexity;
      },

      // Analyze function expressions
      FunctionExpression(node) {
        const complexity = calculateWeightedComplexity(node);
        const pattern = detectGamePattern(node);
        const adjustedMax = getAdjustedComplexityLimit(maxPerFunction, pattern);

        functionComplexities.push({
          name: 'function_expression',
          node,
          complexity,
          pattern,
          adjustedMax,
          line: node.loc.start.line,
          column: node.loc.start.column
        });

        fileComplexity.total += complexity;
        fileComplexity.patterns[pattern] = (fileComplexity.patterns[pattern] || 0) + complexity;
      },

      // Analyze arrow functions
      ArrowFunctionExpression(node) {
        const complexity = calculateWeightedComplexity(node);
        const pattern = detectGamePattern(node);
        const adjustedMax = getAdjustedComplexityLimit(maxPerFunction, pattern);

        functionComplexities.push({
          name: 'arrow_function',
          node,
          complexity,
          pattern,
          adjustedMax,
          line: node.loc.start.line,
          column: node.loc.start.column
        });

        fileComplexity.total += complexity;
        fileComplexity.patterns[pattern] = (fileComplexity.patterns[pattern] || 0) + complexity;
      },

      // End of file analysis
      'Program:exit'() {
        // Check file-level complexity
        if (fileComplexity.total > maxPerFile) {
          const mainNode = functionComplexities[0]?.node || ast;

          context.report({
            node: mainNode,
            messageId: 'fileTooComplex',
            data: {
              complexity: fileComplexity.total,
              maxComplexity: maxPerFile
            }
          });
        }

        // Check function-level complexity
        for (const func of functionComplexities) {
          if (func.complexity > func.adjustedMax) {
            let messageId = 'functionTooComplex';
            let data = {
              name: func.name,
              complexity: func.complexity,
              maxComplexity: func.adjustedMax
            };

            // Special handling for game patterns
            if (func.pattern !== 'general') {
              messageId = 'gamePatternComplexity';
              data.pattern = func.pattern;
              data.adjustedMax = func.adjustedMax;
            }

            context.report({
              node: func.node,
              messageId,
              data
            });
          } else if (func.complexity > maxPerFunction * 0.8) {
            // Warning for high complexity (80% of limit)
            context.report({
              node: func.node,
              messageId: 'highComplexityWarning',
              data: {
                complexity: func.complexity
              },
              severity: 'warning'
            });
          }
        }

        // Analyze complexity patterns
        const averageComplexity = functionComplexities.length > 0 ?
          fileComplexity.total / functionComplexities.length : 0;

        if (averageComplexity > maxPerFunction * 0.9) {
          context.report({
            node: functionComplexities[0]?.node || ast,
            message: `High average function complexity (${Math.round(averageComplexity)}). Consider breaking down complex functions.`,
            severity: 'warning'
          });
        }

        // Check for complexity hotspots
        const maxFunctionComplexity = Math.max(...functionComplexities.map(f => f.complexity));
        if (maxFunctionComplexity > maxPerFunction * 1.5) {
          const hotspotFunction = functionComplexities.find(f => f.complexity === maxFunctionComplexity);

          context.report({
            node: hotspotFunction?.node || ast,
            message: `Complexity hotspot detected in ${hotspotFunction?.name || 'function'} (${maxFunctionComplexity}). This function may need refactoring.`,
            severity: 'warning'
          });
        }

        // Game pattern analysis
        for (const [pattern, complexity] of Object.entries(fileComplexity.patterns)) {
          const patternMultiplier = gamePatternMultipliers[pattern] || 1;
          const patternLimit = maxPerFile * patternMultiplier;

          if (complexity > patternLimit) {
            context.report({
              node: functionComplexities.find(f => f.pattern === pattern)?.node || ast,
              message: `Game pattern '${pattern}' complexity (${complexity}) exceeds recommended limit (${Math.round(patternLimit)}).`,
              severity: 'warning'
            });
          }
        }
      }
    };
  }
};
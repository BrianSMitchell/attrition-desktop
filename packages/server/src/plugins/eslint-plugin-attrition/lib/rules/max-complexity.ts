/**
 * @fileoverview Rule to enforce custom complexity limits for game patterns in Attrition codebase
 * @author Attrition Development Team
 */

import { Rule } from 'eslint';
import { calculateComplexity, getAllFunctions } from '../utils/astHelpers';
import { getProjectConfig } from '../utils/metricsIntegration';

/**
 * Interface for complexity weights configuration
 */
interface ComplexityWeights {
  ifStatements?: number;
  loops?: number;
  switches?: number;
  catches?: number;
  nestedFunctions?: number;
}

/**
 * Interface for game pattern multipliers
 */
interface GamePatternMultipliers {
  'game-loop'?: number;
  'combat-calculation'?: number;
  'resource-optimization'?: number;
  pathfinding?: number;
  'ai-decision'?: number;
  [key: string]: number | undefined;
}

/**
 * Interface for rule options
 */
interface MaxComplexityOptions {
  maxPerFunction?: number;
  maxPerFile?: number;
  gamePatternMultipliers?: GamePatternMultipliers;
  ignoreGamePatterns?: boolean;
  complexityWeights?: ComplexityWeights;
}

/**
 * Interface for tracking function complexity data
 */
interface FunctionComplexityData {
  name: string;
  node: any;
  complexity: number;
  pattern: string;
  adjustedMax: number;
  line: number;
  column: number;
}

/**
 * Interface for file-level complexity tracking
 */
interface FileComplexityData {
  total: number;
  patterns: Record<string, number>;
}

type GamePattern = 'game-loop' | 'combat-calculation' | 'resource-optimization' | 'pathfinding' | 'ai-decision' | 'general';

/**
 * Rule to enforce complexity limits with game-specific patterns
 * Integrates with existing metrics system for consistent thresholds
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce custom complexity limits for game patterns and maintainability',
      category: 'Best Practices',
      recommended: true,
      url: 'https://github.com/attrition-game/server/blob/main/docs/eslint-rules.md#max-complexity'
    },
    fixable: null, // Complexity reduction requires manual refactoring
    schema: [
      {
        type: 'object',
        properties: {
          maxPerFunction: {
            type: 'number',
            minimum: 1,
            default: 10
          },
          maxPerFile: {
            type: 'number',
            minimum: 1,
            default: 50
          },
          gamePatternMultipliers: {
            type: 'object',
            patternProperties: {
              '.*': { type: 'number', minimum: 0.1 }
            },
            default: {
              'game-loop': 1.5,
              'combat-calculation': 1.2,
              'resource-optimization': 1.3,
              pathfinding: 1.4,
              'ai-decision': 1.3
            }
          },
          ignoreGamePatterns: {
            type: 'boolean',
            default: false
          },
          complexityWeights: {
            type: 'object',
            properties: {
              ifStatements: { type: 'number', default: 1 },
              loops: { type: 'number', default: 2 },
              switches: { type: 'number', default: 1 },
              catches: { type: 'number', default: 3 },
              nestedFunctions: { type: 'number', default: 2 }
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
      fileTooComplex: 'File complexity ({{complexity}}) exceeds maximum ({{maxComplexity}}).',
      gamePatternComplexity: "Game pattern '{{pattern}}' complexity ({{complexity}}) exceeds adjusted limit ({{adjustedMax}}).",
      highComplexityWarning: 'High complexity detected ({{complexity}}). Consider refactoring for maintainability.',
      nestedComplexityRisk: 'Deep nesting increases complexity. Consider flattening logic.'
    }
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    const config = getProjectConfig();
    const options = (context.options[0] as MaxComplexityOptions) || {};
    const maxPerFunction = options.maxPerFunction || 10;
    const maxPerFile = options.maxPerFile || 50;
    const gamePatternMultipliers = options.gamePatternMultipliers || {};
    const ignoreGamePatterns = options.ignoreGamePatterns || false;
    const complexityWeights = options.complexityWeights || {};

    const functionComplexities: FunctionComplexityData[] = [];
    const fileComplexity: FileComplexityData = { total: 0, patterns: {} };
    let ast: any = null;

    // Detect game patterns in functions
    function detectGamePattern(functionNode: any): GamePattern {
      const sourceText = context.getSourceCode().getText(functionNode);

      // Game loop patterns
      if (
        sourceText.includes('gameLoop') ||
        sourceText.includes('tick') ||
        sourceText.includes('update') ||
        sourceText.includes('process')
      ) {
        return 'game-loop';
      }

      // Combat calculation patterns
      if (
        sourceText.includes('combat') ||
        sourceText.includes('battle') ||
        sourceText.includes('damage') ||
        sourceText.includes('attack')
      ) {
        return 'combat-calculation';
      }

      // Resource optimization patterns
      if (
        sourceText.includes('resource') ||
        sourceText.includes('optimization') ||
        sourceText.includes('efficiency') ||
        sourceText.includes('allocation')
      ) {
        return 'resource-optimization';
      }

      // Pathfinding patterns
      if (
        sourceText.includes('pathfind') ||
        sourceText.includes('navigate') ||
        sourceText.includes('astar') ||
        sourceText.includes('dijkstra')
      ) {
        return 'pathfinding';
      }

      // AI decision patterns
      if (
        sourceText.includes('decide') ||
        sourceText.includes('strategy') ||
        sourceText.includes('evaluate') ||
        sourceText.includes('algorithm')
      ) {
        return 'ai-decision';
      }

      return 'general';
    }

    // Calculate adjusted complexity limit for game patterns
    function getAdjustedComplexityLimit(baseLimit: number, pattern: GamePattern): number {
      if (ignoreGamePatterns || !gamePatternMultipliers[pattern]) {
        return baseLimit;
      }

      return Math.floor(baseLimit * (gamePatternMultipliers[pattern] || 1));
    }

    // Enhanced complexity calculation with weights
    function calculateWeightedComplexity(node: any): number {
      let complexity = 1; // Base complexity

      function walk(n: any): void {
        const nodeType = n.type;
        switch (nodeType) {
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
            if ((n as any).operator === '&&' || (n as any).operator === '||') {
              complexity += 0.5; // Logical operators add some complexity but less than conditionals
            }
            break;
        }

        // Walk child nodes
        if ((n as any).body && Array.isArray((n as any).body)) {
          ((n as any).body as Node[]).forEach((child: Node) => walk(child));
        }

        if ((n as any).body && typeof (n as any).body === 'object') {
          walk((n as any).body);
        }

        if ((n as any).consequent) {
          walk((n as any).consequent);
        }

        if ((n as any).alternate) {
          walk((n as any).alternate);
        }

        if ((n as any).cases) {
          ((n as any).cases as any[]).forEach((caseNode: any) => walk(caseNode));
        }

        if ((n as any).handlers) {
          ((n as any).handlers as any[]).forEach((handler: any) => walk(handler));
        }

        if ((n as any).finalizer) {
          walk((n as any).finalizer);
        }
      }

      if ((node as any).body) {
        walk((node as any).body);
      }

      return Math.round(complexity);
    }

    return {
      // Store the AST for analysis
      Program(node: any): void {
        ast = node;
      },

      // Analyze function declarations
      FunctionDeclaration(node: any): void {
        const funcNode = node as any;
        const complexity = calculateWeightedComplexity(node);
        const pattern = detectGamePattern(node);
        const adjustedMax = getAdjustedComplexityLimit(maxPerFunction, pattern);

        functionComplexities.push({
          name: funcNode.id ? funcNode.id.name : 'anonymous',
          node,
          complexity,
          pattern,
          adjustedMax,
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0
        });

        fileComplexity.total += complexity;
        fileComplexity.patterns[pattern] = (fileComplexity.patterns[pattern] || 0) + complexity;
      },

      // Analyze function expressions
      FunctionExpression(node: any): void {
        const complexity = calculateWeightedComplexity(node);
        const pattern = detectGamePattern(node);
        const adjustedMax = getAdjustedComplexityLimit(maxPerFunction, pattern);

        functionComplexities.push({
          name: 'function_expression',
          node,
          complexity,
          pattern,
          adjustedMax,
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0
        });

        fileComplexity.total += complexity;
        fileComplexity.patterns[pattern] = (fileComplexity.patterns[pattern] || 0) + complexity;
      },

      // Analyze arrow functions
      ArrowFunctionExpression(node: any): void {
        const complexity = calculateWeightedComplexity(node);
        const pattern = detectGamePattern(node);
        const adjustedMax = getAdjustedComplexityLimit(maxPerFunction, pattern);

        functionComplexities.push({
          name: 'arrow_function',
          node,
          complexity,
          pattern,
          adjustedMax,
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0
        });

        fileComplexity.total += complexity;
        fileComplexity.patterns[pattern] = (fileComplexity.patterns[pattern] || 0) + complexity;
      },

      // End of file analysis
      'Program:exit'(): void {
        // Check file-level complexity
        if (fileComplexity.total > maxPerFile) {
          const mainNode = functionComplexities[0]?.node || ast;
          if (mainNode) {
            context.report({
              node: mainNode,
              messageId: 'fileTooComplex',
              data: {
                complexity: fileComplexity.total,
                maxComplexity: maxPerFile
              }
            });
          }
        }

        // Check function-level complexity
        for (const func of functionComplexities) {
          if (func.complexity > func.adjustedMax) {
            let messageId = 'functionTooComplex';
            let data: Record<string, string | number> = {
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
              }
            });
          }
        }

        // Analyze complexity patterns
        const averageComplexity =
          functionComplexities.length > 0 ? fileComplexity.total / functionComplexities.length : 0;

        if (averageComplexity > maxPerFunction * 0.9) {
          const mainNode = functionComplexities[0]?.node || ast;
          if (mainNode) {
            context.report({
              node: mainNode,
              message: `High average function complexity (${Math.round(averageComplexity)}). Consider breaking down complex functions.`
            });
          }
        }

        // Check for complexity hotspots
        const complexities = functionComplexities.map(f => f.complexity);
        if (complexities.length > 0) {
          const maxFunctionComplexity = Math.max(...complexities);
          if (maxFunctionComplexity > maxPerFunction * 1.5) {
            const hotspotFunction = functionComplexities.find(f => f.complexity === maxFunctionComplexity);

            const hotspotNode = hotspotFunction?.node || ast;
            if (hotspotNode) {
              context.report({
                node: hotspotNode,
                message: `Complexity hotspot detected in ${hotspotFunction?.name || 'function'} (${maxFunctionComplexity}). This function may need refactoring.`
              });
            }
          }
        }

        // Game pattern analysis
        for (const [pattern, complexity] of Object.entries(fileComplexity.patterns)) {
          const patternMultiplier = gamePatternMultipliers[pattern as GamePattern] || 1;
          const patternLimit = maxPerFile * patternMultiplier;

          if (complexity > patternLimit) {
            const patternFunc = functionComplexities.find(f => f.pattern === pattern);
            const reportNode = patternFunc?.node || ast;
            if (reportNode) {
              context.report({
                node: reportNode,
                message: `Game pattern '${pattern}' complexity (${complexity}) exceeds recommended limit (${Math.round(patternLimit)}).`
              });
            }
          }
        }
      }
    };
  }
};

export = rule;
/**
 * @fileoverview Rule to detect deprecated database patterns in Attrition codebase
 * @author Attrition Development Team
 */

import { Rule } from 'eslint';
import { detectLegacyPatterns } from '../utils/astHelpers';
import { getProjectConfig } from '../utils/metricsIntegration';

/**
 * Interface for detected legacy pattern information
 */
interface DetectedPattern {
  pattern: string;
  node: any;
  type: string;
  line: number;
  column: number;
  source: string;
  replacement: string;
}

/**
 * Interface for rule options
 */
interface NoLegacyDatabaseOptions {
  bannedPatterns?: string[];
  migrationPhase?: string;
  allowInMigration?: boolean;
  modernReplacements?: Record<string, string>;
}

/**
 * Rule to detect and prevent usage of deprecated database patterns
 * Critical for migration from legacy database approaches
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect deprecated database patterns and enforce modern database practices',
      category: 'Best Practices',
      recommended: true,
      url: 'https://github.com/attrition-game/server/blob/main/docs/eslint-rules.md#no-legacy-database-checks'
    },
    fixable: 'code', // Can suggest fixes for some patterns
    schema: [
      {
        type: 'object',
        properties: {
          bannedPatterns: {
            type: 'array',
            items: {
              type: 'string'
            },
            default: ['callback', '\\.exec\\(', '\\.then\\(', '\\.catch\\(', 'mongoose\\.Schema']
          },
          migrationPhase: {
            type: 'string',
            default: 'Phase 5'
          },
          allowInMigration: {
            type: 'boolean',
            default: false
          },
          modernReplacements: {
            type: 'object',
            patternProperties: {
              '.*': { type: 'string' }
            },
            default: {
              callback: 'async/await',
              'mongoose\\.Schema': 'TypeScript interfaces',
              '\\.exec\\()': 'async/await',
              '\\.then\\()': 'async/await',
              '\\.catch\\()': 'try/catch'
            }
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      bannedDatabasePattern: "Banned database pattern '{{pattern}}' detected. Use '{{replacement}}' instead.",
      deprecatedMongoosePattern: "Deprecated Mongoose pattern '{{pattern}}' in migration phase {{phase}}. Consider modern alternatives.",
      callbackInsteadOfAsync: 'Callback pattern detected. Use async/await for better error handling.',
      promiseInsteadOfAsync: 'Promise chains (.then/.catch) should be converted to async/await.',
      legacySchemaDefinition: 'Legacy Mongoose schema definition. Consider TypeScript interfaces.',
      deprecatedQueryMethod: "Deprecated query method '{{method}}'. Use modern async/await patterns.",
      mixedDatabasePatterns: 'Mixed database patterns in file. Standardize to modern async/await approach.',
      migrationPhaseViolation: 'Database pattern violates migration phase {{phase}} guidelines.'
    }
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    const config = getProjectConfig();
    const options = (context.options[0] as NoLegacyDatabaseOptions) || {};
    const bannedPatterns = options.bannedPatterns || [
      'callback',
      '\\.exec\\(',
      '\\.then\\(',
      '\\.catch\\(',
      'mongoose\\.Schema'
    ];
    const migrationPhase = options.migrationPhase || 'Phase 5';
    const allowInMigration = options.allowInMigration || false;
    const modernReplacements = options.modernReplacements || {};

    const legacyPatterns: DetectedPattern[] = [];
    const modernPatterns: string[] = [];
    let hasDatabaseImports = false;
    let hasAsyncImports = false;

    // Check for database-related imports
    function checkDatabaseImports(node: any): void {
      const importNode = node as any;
      if (importNode.type === 'ImportDeclaration') {
        const source = importNode.source.value as string;
        if (source.includes('mongoose') || source.includes('mongodb')) {
          hasDatabaseImports = true;
        }
      }
    }

    // Check for async/await imports
    function checkAsyncImports(node: any): void {
      const importNode = node as any;
      if (importNode.type === 'ImportDeclaration') {
        const source = importNode.source.value as string;
        if (source.includes('async') || source.includes('await')) {
          hasAsyncImports = true;
        }
      }
    }

    function detectPattern(node: any, pattern: string, type: string): void {
      const sourceText = context.getSourceCode().getText(node);

      for (const bannedPattern of bannedPatterns) {
        const regex = new RegExp(bannedPattern, 'g');
        if (regex.test(sourceText)) {
          legacyPatterns.push({
            pattern: bannedPattern,
            node,
            type,
            line: node.loc?.start.line || 0,
            column: node.loc?.start.column || 0,
            source: sourceText,
            replacement: modernReplacements[bannedPattern] || 'modern async/await'
          });
        }
      }
    }

    function analyzeDatabasePattern(node: any, patternType: string): void {
      // Check for callback patterns in database operations
      if (patternType === 'callback' && node.params && node.params.length > 0) {
        const lastParam = node.params[node.params.length - 1];
        if (lastParam.name === 'callback' || lastParam.name === 'cb') {
          legacyPatterns.push({
            pattern: 'callback',
            node,
            type: 'callback_function',
            line: node.loc?.start.line || 0,
            column: node.loc?.start.column || 0,
            source: context.getSourceCode().getText(node),
            replacement: 'async/await'
          });
        }
      }

      // Check for promise chains
      if (patternType === 'promise_chain' && node.property) {
        if (node.property.name === 'then' || node.property.name === 'catch') {
          legacyPatterns.push({
            pattern: `.${node.property.name}()`,
            node,
            type: 'promise_method',
            line: node.loc?.start.line || 0,
            column: node.loc?.start.column || 0,
            source: context.getSourceCode().getText(node),
            replacement: 'async/await'
          });
        }
      }

      // Check for deprecated query methods
      if (patternType === 'query_method' && node.callee) {
        const deprecatedMethods = ['exec', 'execPopulate', 'lean'];
        if (deprecatedMethods.includes(node.callee.name)) {
          legacyPatterns.push({
            pattern: node.callee.name,
            node,
            type: 'deprecated_method',
            line: node.loc?.start.line || 0,
            column: node.loc?.start.column || 0,
            source: context.getSourceCode().getText(node),
            replacement: 'async/await equivalent'
          });
        }
      }
    }

    return {
      // Check imports
      ImportDeclaration(node: any): void {
        checkDatabaseImports(node);
        checkAsyncImports(node);
      },

      // Check function declarations for callback patterns
      FunctionDeclaration(node: any): void {
        if (hasDatabaseImports) {
          detectPattern(node, 'callback', 'function_declaration');
        }
      },

      // Check variable declarations for database patterns
      VariableDeclarator(node: any): void {
        const varNode = node as any;
        if (hasDatabaseImports && varNode.init) {
          detectPattern(varNode.init, 'mongoose\\.Schema', 'schema_definition');
        }
      },

      // Check method calls for deprecated patterns
      CallExpression(node: any): void {
        const callNode = node as any;
        if (hasDatabaseImports) {
          // Check for promise chains
          if (callNode.callee.type === 'MemberExpression' && callNode.callee.property) {
            if (callNode.callee.property.name === 'then' || callNode.callee.property.name === 'catch') {
              analyzeDatabasePattern(node, 'promise_chain');
            }
          }

          // Check for deprecated query methods
          if (callNode.callee.name === 'exec' || callNode.callee.name === 'execPopulate') {
            analyzeDatabasePattern(node, 'query_method');
          }

          // Check for legacy patterns in general
          detectPattern(node, 'mongoose\\.Schema', 'mongoose_usage');
        }
      },

      // Check member expressions for deprecated patterns
      MemberExpression(node: any): void {
        if (hasDatabaseImports) {
          const sourceText = context.getSourceCode().getText(node);
          if (sourceText.includes('mongoose.Schema')) {
            legacyPatterns.push({
              pattern: 'mongoose.Schema',
              node,
              type: 'schema_reference',
              line: node.loc?.start.line || 0,
              column: node.loc?.start.column || 0,
              source: sourceText,
              replacement: 'TypeScript interfaces'
            });
          }
        }
      },

      // End of file analysis
      'Program:exit'(): void {
        if (!hasDatabaseImports) {
          return; // No database code to analyze
        }

        // Report all detected legacy patterns
        for (const pattern of legacyPatterns) {
          let messageId = 'bannedDatabasePattern';
          let data: Record<string, string> = {
            pattern: pattern.pattern,
            replacement: pattern.replacement
          };

          // Customize message based on pattern type
          switch (pattern.type) {
            case 'callback_function':
              messageId = 'callbackInsteadOfAsync';
              break;
            case 'promise_method':
              messageId = 'promiseInsteadOfAsync';
              break;
            case 'schema_reference':
              messageId = 'legacySchemaDefinition';
              break;
            case 'deprecated_method':
              messageId = 'deprecatedQueryMethod';
              data.method = pattern.pattern;
              break;
            case 'function_declaration':
              if (pattern.pattern === 'callback') {
                messageId = 'callbackInsteadOfAsync';
              }
              break;
          }

          // Add migration phase context if configured
          if (!allowInMigration) {
            data.phase = migrationPhase;
            messageId = 'migrationPhaseViolation';
          }

          context.report({
            node: pattern.node,
            messageId,
            data,
            fix(fixer: Rule.RuleFixer): null | Rule.Fix {
              // Suggest fixes for common patterns
              if (pattern.type === 'schema_reference' && pattern.source.includes('mongoose.Schema')) {
                // This would need more sophisticated logic for actual replacement
                return null;
              }

              // For now, no automatic fixes for complex database patterns
              return null;
            }
          });
        }

        // Check for mixed patterns
        if (legacyPatterns.length > 0 && hasAsyncImports) {
          const mainNode = legacyPatterns[0]?.node;
          if (mainNode) {
            context.report({
              node: mainNode,
              messageId: 'mixedDatabasePatterns',
              data: {
                phase: migrationPhase
              }
            });
          }
        }

        // Warn about missing modern patterns when legacy patterns are found
        if (legacyPatterns.length > 0 && !hasAsyncImports) {
          const mainNode = legacyPatterns[0]?.node;
          if (mainNode) {
            context.report({
              node: mainNode,
              message: 'Legacy database patterns detected but no async/await imports found. Consider modernizing to async/await.'
            });
          }
        }
      }
    };
  }
};

export = rule;
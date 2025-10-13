/**
 * @fileoverview Rule to detect deprecated database patterns in Attrition codebase
 * @author Attrition Development Team
 */

"use strict";

// Import utilities
const { detectLegacyPatterns } = require('../utils/astHelpers');
const { getProjectConfig } = require('../utils/metricsIntegration');

/**
 * Rule to detect and prevent usage of deprecated database patterns
 * Critical for migration from legacy database approaches
 */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Detect deprecated database patterns and enforce modern database practices",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/attrition-game/server/blob/main/docs/eslint-rules.md#no-legacy-database-checks"
    },
    fixable: "code", // Can suggest fixes for some patterns
    schema: [
      {
        type: "object",
        properties: {
          bannedPatterns: {
            type: "array",
            items: {
              type: "string"
            },
            default: [
              "callback",
              "\\.exec\\(",
              "\\.then\\(",
              "\\.catch\\(",
              "mongoose\\.Schema"
            ]
          },
          migrationPhase: {
            type: "string",
            default: "Phase 5"
          },
          allowInMigration: {
            type: "boolean",
            default: false
          },
          modernReplacements: {
            type: "object",
            patternProperties: {
              ".*": { type: "string" }
            },
            default: {
              "callback": "async/await",
              "mongoose\\.Schema": "TypeScript interfaces",
              "\\.exec\\(\\)": "async/await",
              "\\.then\\(\\)": "async/await",
              "\\.catch\\(\\)": "try/catch"
            }
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      bannedDatabasePattern: "Banned database pattern '{{pattern}}' detected. Use '{{replacement}}' instead.",
      deprecatedMongoosePattern: "Deprecated Mongoose pattern '{{pattern}}' in migration phase {{phase}}. Consider modern alternatives.",
      callbackInsteadOfAsync: "Callback pattern detected. Use async/await for better error handling.",
      promiseInsteadOfAsync: "Promise chains (.then/.catch) should be converted to async/await.",
      legacySchemaDefinition: "Legacy Mongoose schema definition. Consider TypeScript interfaces.",
      deprecatedQueryMethod: "Deprecated query method '{{method}}'. Use modern async/await patterns.",
      mixedDatabasePatterns: "Mixed database patterns in file. Standardize to modern async/await approach.",
      migrationPhaseViolation: "Database pattern violates migration phase {{phase}} guidelines."
    }
  },

  create(context) {
    const config = getProjectConfig();
    const options = context.options[0] || {};
    const bannedPatterns = options.bannedPatterns || [
      "callback",
      "\\.exec\\(",
      "\\.then\\(",
      "\\.catch\\(",
      "mongoose\\.Schema"
    ];
    const migrationPhase = options.migrationPhase || "Phase 5";
    const allowInMigration = options.allowInMigration || false;
    const modernReplacements = options.modernReplacements || {};

    const legacyPatterns = [];
    const modernPatterns = [];
    let hasDatabaseImports = false;
    let hasAsyncImports = false;

    // Check for database-related imports
    function checkDatabaseImports(node) {
      if (node.type === 'ImportDeclaration') {
        const source = node.source.value;
        if (source.includes('mongoose') || source.includes('mongodb')) {
          hasDatabaseImports = true;
        }
      }
    }

    // Check for async/await imports
    function checkAsyncImports(node) {
      if (node.type === 'ImportDeclaration') {
        const source = node.source.value;
        if (source.includes('async') || source.includes('await')) {
          hasAsyncImports = true;
        }
      }
    }

    function detectPattern(node, pattern, type) {
      const sourceText = context.getSourceCode().getText(node);

      for (const bannedPattern of bannedPatterns) {
        const regex = new RegExp(bannedPattern, 'g');
        if (regex.test(sourceText)) {
          legacyPatterns.push({
            pattern: bannedPattern,
            node,
            type,
            line: node.loc.start.line,
            column: node.loc.start.column,
            source: sourceText,
            replacement: modernReplacements[bannedPattern] || 'modern async/await'
          });
        }
      }
    }

    function analyzeDatabasePattern(node, patternType) {
      // Check for callback patterns in database operations
      if (patternType === 'callback' && node.params && node.params.length > 0) {
        const lastParam = node.params[node.params.length - 1];
        if (lastParam.name === 'callback' || lastParam.name === 'cb') {
          legacyPatterns.push({
            pattern: 'callback',
            node,
            type: 'callback_function',
            line: node.loc.start.line,
            column: node.loc.start.column,
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
            line: node.loc.start.line,
            column: node.loc.start.column,
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
            line: node.loc.start.line,
            column: node.loc.start.column,
            source: context.getSourceCode().getText(node),
            replacement: 'async/await equivalent'
          });
        }
      }
    }

    return {
      // Check imports
      ImportDeclaration(node) {
        checkDatabaseImports(node);
        checkAsyncImports(node);
      },

      // Check function declarations for callback patterns
      FunctionDeclaration(node) {
        if (hasDatabaseImports) {
          detectPattern(node, 'callback', 'function_declaration');
        }
      },

      // Check variable declarations for database patterns
      VariableDeclarator(node) {
        if (hasDatabaseImports && node.init) {
          detectPattern(node.init, 'mongoose\\.Schema', 'schema_definition');
        }
      },

      // Check method calls for deprecated patterns
      CallExpression(node) {
        if (hasDatabaseImports) {
          // Check for promise chains
          if (node.callee.type === 'MemberExpression' && node.callee.property) {
            if (node.callee.property.name === 'then' || node.callee.property.name === 'catch') {
              analyzeDatabasePattern(node, 'promise_chain');
            }
          }

          // Check for deprecated query methods
          if (node.callee.name === 'exec' || node.callee.name === 'execPopulate') {
            analyzeDatabasePattern(node, 'query_method');
          }

          // Check for legacy patterns in general
          detectPattern(node, 'mongoose\\.Schema', 'mongoose_usage');
        }
      },

      // Check member expressions for deprecated patterns
      MemberExpression(node) {
        if (hasDatabaseImports) {
          const sourceText = context.getSourceCode().getText(node);
          if (sourceText.includes('mongoose.Schema')) {
            legacyPatterns.push({
              pattern: 'mongoose.Schema',
              node,
              type: 'schema_reference',
              line: node.loc.start.line,
              column: node.loc.start.column,
              source: sourceText,
              replacement: 'TypeScript interfaces'
            });
          }
        }
      },

      // End of file analysis
      'Program:exit'() {
        if (!hasDatabaseImports) {
          return; // No database code to analyze
        }

        // Report all detected legacy patterns
        for (const pattern of legacyPatterns) {
          let messageId = 'bannedDatabasePattern';
          let data = {
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
            fix(fixer) {
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

          context.report({
            node: mainNode,
            messageId: 'mixedDatabasePatterns',
            data: {
              phase: migrationPhase
            }
          });
        }

        // Warn about missing modern patterns when legacy patterns are found
        if (legacyPatterns.length > 0 && !hasAsyncImports) {
          const mainNode = legacyPatterns[0]?.node;

          context.report({
            node: mainNode,
            message: `Legacy database patterns detected but no async/await imports found. Consider modernizing to async/await.`,
            severity: 'warning'
          });
        }
      }
    };
  }
};
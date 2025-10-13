/**
 * @fileoverview Rule to detect excessive console.log usage in Attrition codebase
 * @author Attrition Development Team
 */

"use strict";

// Import utilities
const { countConsoleStatements } = require('../utils/astHelpers');
const { getProjectConfig } = require('../utils/metricsIntegration');

/**
 * Rule to enforce logging best practices and prevent console.log abuse
 * Critical for production code quality and performance
 */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Prevent excessive console.log usage and enforce logging best practices",
      category: "Best Practices",
      recommended: true,
      url: "https://github.com/attrition-game/server/blob/main/docs/eslint-rules.md#no-excessive-logging"
    },
    fixable: "code", // Can auto-fix by removing console statements
    schema: [
      {
        type: "object",
        properties: {
          maxConsoleStatements: {
            type: "number",
            minimum: 0,
            default: 3
          },
          allowInDevelopment: {
            type: "boolean",
            default: true
          },
          allowedMethods: {
            type: "array",
            items: {
              type: "string"
            },
            default: ["error", "warn", "info"]
          },
          bannedMethods: {
            type: "array",
            items: {
              type: "string"
            },
            default: ["log", "debug", "trace"]
          },
          requireLoggingLevels: {
            type: "boolean",
            default: true
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      excessiveConsoleUsage: "Too many console statements ({{count}}/{{max}}). Consider using a proper logging library.",
      bannedConsoleMethod: "Console method '{{method}}' is banned. Use '{{allowed}}' instead.",
      missingLoggingLevel: "Console statement without proper logging level. Use console.error/warn/info instead of console.log.",
      productionConsoleUsage: "Console statement found in production code. Use proper logging or remove.",
      missingLogMessage: "Console statement without meaningful message or should be removed.",
      preferStructuredLogging: "Consider using structured logging instead of console.{{method}} for better traceability."
    }
  },

  create(context) {
    const config = getProjectConfig();
    const options = context.options[0] || {};
    const maxConsoleStatements = options.maxConsoleStatements || 3;
    const allowInDevelopment = options.allowInDevelopment !== false; // Default true
    const allowedMethods = options.allowedMethods || ["error", "warn", "info"];
    const bannedMethods = options.bannedMethods || ["log", "debug", "trace"];
    const requireLoggingLevels = options.requireLoggingLevels !== false; // Default true

    const consoleStatements = [];
    let inDevelopment = false;
    let hasLoggingImport = false;

    // Check for development environment indicators
    function checkDevelopmentEnvironment(node) {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        if (node.value.includes('development') || node.value.includes('NODE_ENV')) {
          inDevelopment = true;
        }
      }
    }

    // Check for proper logging library imports
    function checkLoggingImports(node) {
      if (node.type === 'ImportDeclaration') {
        if (node.source.value.includes('winston') ||
            node.source.value.includes('bunyan') ||
            node.source.value.includes('pino') ||
            node.source.value.includes('logger')) {
          hasLoggingImport = true;
        }
      }
    }

    function isAllowedMethod(method) {
      return allowedMethods.includes(method);
    }

    function isBannedMethod(method) {
      return bannedMethods.includes(method);
    }

    function shouldReportViolation(count) {
      return count > maxConsoleStatements;
    }

    function analyzeConsoleStatement(node, method, args) {
      const statement = {
        node,
        method,
        args,
        line: node.loc.start.line,
        column: node.loc.start.column,
        hasMessage: args.length > 0,
        messageType: args.length > 0 ? typeof args[0].value : 'none'
      };

      consoleStatements.push(statement);

      // Check for banned methods
      if (isBannedMethod(method)) {
        context.report({
          node,
          messageId: 'bannedConsoleMethod',
          data: {
            method,
            allowed: allowedMethods.join('/')
          }
        });
        return;
      }

      // Check for missing logging levels
      if (requireLoggingLevels && method === 'log') {
        context.report({
          node,
          messageId: 'missingLoggingLevel'
        });
        return;
      }

      // Check for console statements in production
      if (!allowInDevelopment && !inDevelopment) {
        context.report({
          node,
          messageId: 'productionConsoleUsage'
        });
        return;
      }

      // Check for missing log messages
      if (!statement.hasMessage || (statement.messageType !== 'string' && args.length === 1)) {
        context.report({
          node,
          messageId: 'missingLogMessage'
        });
        return;
      }

      // Suggest structured logging for complex objects
      if (args.length > 1 || (args[0] && args[0].type === 'ObjectExpression')) {
        context.report({
          node,
          messageId: 'preferStructuredLogging',
          data: { method }
        });
      }
    }

    return {
      // Check for environment indicators
      Literal: checkDevelopmentEnvironment,

      // Check for logging library imports
      ImportDeclaration: checkLoggingImports,

      // Check console statements
      ExpressionStatement(node) {
        if (node.expression.type === 'CallExpression' &&
            node.expression.callee.type === 'MemberExpression' &&
            node.expression.callee.object.name === 'console') {

          const method = node.expression.callee.property.name;
          const args = node.expression.arguments;

          analyzeConsoleStatement(node, method, args);
        }
      },

      // End of file analysis
      'Program:exit'() {
        // Skip analysis if proper logging library is imported
        if (hasLoggingImport) {
          return;
        }

        // Count total console statements
        const totalConsoleCount = consoleStatements.length;

        // Report excessive usage
        if (shouldReportViolation(totalConsoleCount)) {
          const mainNode = consoleStatements[0]?.node;

          context.report({
            node: mainNode,
            messageId: 'excessiveConsoleUsage',
            data: {
              count: totalConsoleCount,
              max: maxConsoleStatements
            },
            fix(fixer) {
              // Auto-fix by removing excessive console statements
              const fixes = [];

              if (totalConsoleCount > maxConsoleStatements) {
                // Remove statements beyond the limit
                const statementsToRemove = consoleStatements.slice(maxConsoleStatements);

                for (const statement of statementsToRemove) {
                  fixes.push(fixer.remove(statement.node));
                }
              }

              return fixes;
            }
          });
        }

        // Analyze logging patterns and provide recommendations
        const methodCounts = {};
        for (const statement of consoleStatements) {
          methodCounts[statement.method] = (methodCounts[statement.method] || 0) + 1;
        }

        // Warn about over-reliance on certain methods
        for (const [method, count] of Object.entries(methodCounts)) {
          if (count > maxConsoleStatements * 0.7) { // More than 70% of allowed limit
            const allowedCount = Math.floor(maxConsoleStatements * 0.7);
            context.report({
              node: consoleStatements.find(s => s.method === method)?.node,
              message: `Over-reliance on console.${method} (${count} uses). Consider diversifying logging methods.`,
              severity: 'warning'
            });
          }
        }
      }
    };
  }
};
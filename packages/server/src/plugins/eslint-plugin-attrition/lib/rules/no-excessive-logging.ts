/**
 * @fileoverview Rule to detect excessive console.log usage in Attrition codebase
 * @author Attrition Development Team
 */

import type { TSESLint } from '@typescript-eslint/utils';
import { countConsoleStatements } from '../utils/astHelpers';
import { getProjectConfig } from '../utils/metricsIntegration';

interface ConsoleStatement {
  node: any;
  method: string;
  args: any[];
  line: number;
  column: number;
  hasMessage: boolean;
  messageType: string;
}

interface LoggingOptions {
  maxConsoleStatements?: number;
  allowInDevelopment?: boolean;
  allowedMethods?: string[];
  bannedMethods?: string[];
  requireLoggingLevels?: boolean;
}

const rule: TSESLint.RuleModule<any, any> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent excessive console.log usage and enforce logging best practices',
      url: 'https://github.com/attrition-game/server/blob/main/docs/eslint-rules.md#no-excessive-logging'
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          maxConsoleStatements: { type: 'number', minimum: 0, default: 3 },
          allowInDevelopment: { type: 'boolean', default: true },
          allowedMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['error', 'warn', 'info']
          },
          bannedMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['log', 'debug', 'trace']
          },
          requireLoggingLevels: { type: 'boolean', default: true }
        },
        additionalProperties: false
      }
    ],
    messages: {
      excessiveConsoleUsage:
        'Too many console statements ({{count}}/{{max}}). Consider using a proper logging library.',
      bannedConsoleMethod: "Console method '{{method}}' is banned. Use '{{allowed}}' instead.",
      missingLoggingLevel:
        'Console statement without proper logging level. Use console.error/warn/info instead of console.log.',
      productionConsoleUsage: 'Console statement found in production code. Use proper logging or remove.',
      missingLogMessage: 'Console statement without meaningful message or should be removed.',
      preferStructuredLogging:
        'Consider using structured logging instead of console.{{method}} for better traceability.'
    }
  },

  create(context: any): any {
    const options: LoggingOptions = context.options[0] || {};
    const maxConsoleStatements = options.maxConsoleStatements || 3;
    const allowInDevelopment = options.allowInDevelopment !== false;
    const allowedMethods = options.allowedMethods || ['error', 'warn', 'info'];
    const bannedMethods = options.bannedMethods || ['log', 'debug', 'trace'];
    const requireLoggingLevels = options.requireLoggingLevels !== false;

    const consoleStatements: ConsoleStatement[] = [];
    let inDevelopment = false;
    let hasLoggingImport = false;

    function checkDevelopmentEnvironment(node: any): void {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        if (node.value.includes('development') || node.value.includes('NODE_ENV')) {
          inDevelopment = true;
        }
      }
    }

    function checkLoggingImports(node: any): void {
      if (node.type === 'ImportDeclaration') {
        if (
          node.source.value.includes('winston') ||
          node.source.value.includes('bunyan') ||
          node.source.value.includes('pino') ||
          node.source.value.includes('logger')
        ) {
          hasLoggingImport = true;
        }
      }
    }

    function isAllowedMethod(method: string): boolean {
      return allowedMethods.includes(method);
    }

    function isBannedMethod(method: string): boolean {
      return bannedMethods.includes(method);
    }

    function shouldReportViolation(count: number): boolean {
      return count > maxConsoleStatements;
    }

    function analyzeConsoleStatement(node: any, method: string, args: any[]): void {
      const statement: ConsoleStatement = {
        node,
        method,
        args,
        line: node.loc.start.line,
        column: node.loc.start.column,
        hasMessage: args.length > 0,
        messageType: args.length > 0 ? typeof args[0].value : 'none'
      };

      consoleStatements.push(statement);

      if (isBannedMethod(method)) {
        context.report({
          node,
          messageId: 'bannedConsoleMethod',
          data: { method, allowed: allowedMethods.join('/') }
        });
        return;
      }

      if (requireLoggingLevels && method === 'log') {
        context.report({ node, messageId: 'missingLoggingLevel' });
        return;
      }

      if (!allowInDevelopment && !inDevelopment) {
        context.report({ node, messageId: 'productionConsoleUsage' });
        return;
      }

      if (
        !statement.hasMessage ||
        (statement.messageType !== 'string' && args.length === 1)
      ) {
        context.report({ node, messageId: 'missingLogMessage' });
        return;
      }

      if (args.length > 1 || (args[0] && args[0].type === 'ObjectExpression')) {
        context.report({
          node,
          messageId: 'preferStructuredLogging',
          data: { method }
        });
      }
    }

    return {
      Literal: checkDevelopmentEnvironment,
      ImportDeclaration: checkLoggingImports,

      ExpressionStatement(node: any): void {
        if (
          node.expression.type === 'CallExpression' &&
          node.expression.callee.type === 'MemberExpression' &&
          node.expression.callee.object.name === 'console'
        ) {
          const method = node.expression.callee.property.name;
          const args = node.expression.arguments;
          analyzeConsoleStatement(node, method, args);
        }
      },

      'Program:exit'(): void {
        if (hasLoggingImport) return;

        const totalConsoleCount = consoleStatements.length;

        if (shouldReportViolation(totalConsoleCount)) {
          const mainNode = consoleStatements[0]?.node;

          context.report({
            node: mainNode,
            messageId: 'excessiveConsoleUsage',
            data: { count: totalConsoleCount, max: maxConsoleStatements },
            fix(fixer: any) {
              const fixes = [];
              if (totalConsoleCount > maxConsoleStatements) {
                const statementsToRemove = consoleStatements.slice(maxConsoleStatements);
                for (const statement of statementsToRemove) {
                  fixes.push(fixer.remove(statement.node));
                }
              }
              return fixes;
            }
          });
        }

        const methodCounts: Record<string, number> = {};
        for (const statement of consoleStatements) {
          methodCounts[statement.method] = (methodCounts[statement.method] || 0) + 1;
        }

        for (const [method, count] of Object.entries(methodCounts)) {
          if (count > maxConsoleStatements * 0.7) {
            context.report({
              node: consoleStatements.find((s) => s.method === method)?.node,
              message: `Over-reliance on console.${method} (${count} uses). Consider diversifying logging methods.`,
              messageId: 'excessiveConsoleUsage'
            } as any);
          }
        }
      }
    };
  }
};

export default rule;

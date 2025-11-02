/**
 * @fileoverview Rule to detect ObjectId vs UUID inconsistencies in Attrition codebase
 * @author Attrition Development Team
 */

import type { TSESLint } from '@typescript-eslint/utils';
import { getProjectConfig } from '../utils/metricsIntegration';

/**
 * ID pattern tracking structure
 */
interface IdPattern {
  type: string;
  node: any;
  code: string;
}

/**
 * ID patterns container
 */
interface IdPatterns {
  objectId: IdPattern[];
  uuid: IdPattern[];
  mixed: IdPattern[];
}

/**
 * Rule configuration options
 */
interface IdConsistencyOptions {
  targetScore?: number;
  criticalViolations?: string[];
  allowInMigration?: boolean;
}

/**
 * Rule to enforce consistent ID patterns across the codebase
 * Critical for migration from ObjectId to UUID patterns
 */
const rule: TSESLint.RuleModule<any, any> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce consistent ID patterns (ObjectId vs UUID) across codebase',
      url: 'https://github.com/attrition-game/server/blob/main/docs/eslint-rules.md#id-consistency'
    },
    schema: [
      {
        type: 'object',
        properties: {
          targetScore: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            default: 90
          },
          criticalViolations: {
            type: 'array',
            items: {
              type: 'string'
            },
            default: [
              'mongoose\\.Types\\.ObjectId',
              'new ObjectId',
              'ObjectId\\('
            ]
          },
          allowInMigration: {
            type: 'boolean',
            default: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      inconsistentIdUsage:
        'Inconsistent ID usage detected: {{found}} vs expected {{expected}}. Use UUID for new code.',
      mixedIdPatterns: 'Mixed ID patterns in file: {{patterns}}. Standardize to UUID pattern.',
      criticalViolation: 'Critical violation: {{violation}} found. Use UUID instead of ObjectId.',
      migrationPhaseWarning:
        'ID inconsistency during migration phase {{phase}}. Review migration strategy.'
    }
  },

  create(context: any): any {
    const config = getProjectConfig();
    const options: IdConsistencyOptions = context.options[0] || {};
    const targetScore = options.targetScore || 90;
    const criticalViolations = options.criticalViolations || [
      'mongoose\\.Types\\.ObjectId',
      'new ObjectId',
      'ObjectId\\('
    ];
    const allowInMigration = options.allowInMigration || false;

    // Track ID patterns found in the file
    const idPatterns: IdPatterns = {
      objectId: [],
      uuid: [],
      mixed: []
    };

    /**
     * Report an inconsistency violation
     */
    function reportInconsistency(
      node: any,
      found: string,
      expected: string,
      patterns: string[]
    ): void {
      context.report({
        node,
        messageId: found === 'mixed' ? 'mixedIdPatterns' : 'inconsistentIdUsage',
        data: {
          found,
          expected,
          patterns: patterns.join(', ')
        }
      });
    }

    /**
     * Check if code contains a critical violation
     */
    function isCriticalViolation(code: string): boolean {
      return criticalViolations.some((violation) => {
        const regex = new RegExp(violation);
        return regex.test(code);
      });
    }

    return {
      // Check import statements
      ImportDeclaration(node: any): void {
        const source = node.source.value;
        if (source.includes('mongoose') || source.includes('mongodb')) {
          idPatterns.objectId.push({
            type: 'import',
            node,
            code: source
          });
        }
        if (source.includes('uuid')) {
          idPatterns.uuid.push({
            type: 'import',
            node,
            code: source
          });
        }
      },

      // Check variable declarations and assignments
      VariableDeclarator(node: any): void {
        if (node.init && node.init.type === 'CallExpression') {
          const callee = node.init.callee;
          if (callee.name === 'ObjectId' || callee.name === 'require') {
            if (node.init.arguments && node.init.arguments.length > 0) {
              const arg = node.init.arguments[0];
              if (arg.value && arg.value.includes('mongoose')) {
                idPatterns.objectId.push({
                  type: 'variable',
                  node,
                  code: context.getSourceCode().getText(node.init)
                });
              }
            }
          }
        }
      },

      // Check function calls
      CallExpression(node: any): void {
        const callee = node.callee;

        // Check for ObjectId() calls
        if (callee.name === 'ObjectId') {
          idPatterns.objectId.push({
            type: 'function_call',
            node,
            code: context.getSourceCode().getText(node)
          });
        }

        // Check for mongoose.Types.ObjectId calls
        if (
          callee.object &&
          callee.object.name === 'Types' &&
          callee.property.name === 'ObjectId'
        ) {
          idPatterns.objectId.push({
            type: 'mongoose_call',
            node,
            code: context.getSourceCode().getText(node)
          });
        }

        // Check for UUID usage
        if (callee.name && callee.name.includes('uuid')) {
          idPatterns.uuid.push({
            type: 'uuid_call',
            node,
            code: context.getSourceCode().getText(node)
          });
        }
      },

      // Check property access (like mongoose.Schema.Types.ObjectId)
      MemberExpression(node: any): void {
        if (
          node.object &&
          node.object.name === 'mongoose' &&
          node.property &&
          node.property.name === 'Schema'
        ) {
          idPatterns.objectId.push({
            type: 'schema_usage',
            node,
            code: context.getSourceCode().getText(node)
          });
        }
      },

      // Check for string literals that might indicate ID patterns
      Literal(node: any): void {
        if (typeof node.value === 'string') {
          // Check for ObjectId in string literals (comments, documentation)
          if (node.value.includes('ObjectId')) {
            idPatterns.objectId.push({
              type: 'string_literal',
              node,
              code: node.value
            });
          }
          // Check for UUID in string literals
          if (node.value.includes('uuid') || node.value.includes('UUID')) {
            idPatterns.uuid.push({
              type: 'string_literal',
              node,
              code: node.value
            });
          }
        }
      },

      // Check type annotations and JSDoc comments
      TSTypeReference(node: any): void {
        if (node.typeName && node.typeName.name) {
          if (node.typeName.name.includes('ObjectId')) {
            idPatterns.objectId.push({
              type: 'type_reference',
              node,
              code: node.typeName.name
            });
          }
        }
      },

      // End of file analysis
      'Program:exit'(): void {
        const totalObjectId = idPatterns.objectId.length;
        const totalUuid = idPatterns.uuid.length;

        if (totalObjectId === 0 && totalUuid === 0) {
          return; // No ID patterns found
        }

        // Check for critical violations
        for (const pattern of idPatterns.objectId) {
          if (isCriticalViolation(pattern.code)) {
            context.report({
              node: pattern.node,
              messageId: 'criticalViolation',
              data: {
                violation: pattern.code
              }
            });
          }
        }

        // Calculate consistency score
        const totalIdReferences = totalObjectId + totalUuid;
        const consistencyScore =
          totalIdReferences > 0 ? (totalUuid / totalIdReferences) * 100 : 100;

        // Report if below target score
        if (consistencyScore < targetScore) {
          const found = totalObjectId > totalUuid ? 'ObjectId' : 'UUID';
          const expected = 'UUID';

          // Find the main reporting node (first occurrence)
          const mainNode =
            idPatterns.objectId.length > 0
              ? idPatterns.objectId[0].node
              : idPatterns.uuid[0].node;

          reportInconsistency(
            mainNode,
            found,
            expected,
            [
              ...idPatterns.objectId.map((p) => p.type),
              ...idPatterns.uuid.map((p) => p.type)
            ]
          );
        }

        // Migration phase warning if configured
        if (allowInMigration && config.projectRules?.legacyPatterns) {
          const hasMixedPatterns = totalObjectId > 0 && totalUuid > 0;
          if (hasMixedPatterns) {
            context.report({
              node: idPatterns.objectId[0]?.node || idPatterns.uuid[0]?.node,
              messageId: 'migrationPhaseWarning',
              data: {
                phase: config.projectRules.legacyPatterns.migrationPhase
              }
            });
          }
        }
      }
    };
  }
};

export default rule;

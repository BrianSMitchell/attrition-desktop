/**
 * @fileoverview AST helper utilities for ESLint plugin rules
 * @author Attrition Development Team
 */

import type { TSESLint } from '@typescript-eslint/utils';

/**
 * ESLint SourceCode object interface
 */
interface SourceCode {
  getText(node: any): string;
}

/**
 * AST Node location information
 */
interface NodeLocation {
  type: string;
  node: any;
  line: number;
  column: number;
}

/**
 * ObjectId usage detection result
 */
interface ObjectIdUsage extends NodeLocation {
  type: 'function_call' | 'mongoose_call' | 'new_expression' | 'require_statement';
}

/**
 * UUID usage detection result
 */
interface UUIDUsage extends NodeLocation {
  type: 'uuid_call' | 'uuid_string';
}

/**
 * Legacy pattern violation
 */
interface LegacyPattern extends NodeLocation {
  type: 'var_declaration' | 'callback_pattern';
  pattern: string;
}

/**
 * Import/Export statement information
 */
interface ImportStatement {
  type: 'import';
  node: any;
  source: string;
  specifiers: string[];
}

/**
 * Export statement information
 */
interface ExportStatement {
  type: 'default_export' | 'named_export';
  node: any;
  declaration: string | null;
}

/**
 * Import/Export result container
 */
interface ImportExportResult {
  imports: ImportStatement[];
  exports: ExportStatement[];
}

/**
 * Get node source code text
 * @param node - AST node
 * @param sourceCode - ESLint source code object
 * @returns Source code text for the node
 */
export function getNodeText(node: any, sourceCode: SourceCode): string {
  return sourceCode.getText(node);
}

/**
 * Get all function declarations in a file
 * @param ast - AST object
 * @returns Array of function declaration nodes
 */
export function getAllFunctions(ast: any): any[] {
  const functions: any[] = [];

  /**
   * Walk the AST to find all function declarations
   */
  function walk(node: any): void {
    if (node.type === 'FunctionDeclaration') {
      functions.push(node);
    }

    if (node.body && Array.isArray(node.body)) {
      node.body.forEach((child: any) => walk(child));
    }

    if (node.body && typeof node.body === 'object') {
      walk(node.body);
    }

    if (node.consequent) {
      walk(node.consequent);
    }

    if (node.alternate) {
      walk(node.alternate);
    }
  }

  walk(ast);
  return functions;
}

/**
 * Count console statements in a file
 * @param ast - AST object
 * @returns Number of console statements
 */
export function countConsoleStatements(ast: any): number {
  let count = 0;

  function walk(node: any): void {
    if (
      node.type === 'ExpressionStatement' &&
      node.expression.type === 'CallExpression' &&
      node.expression.callee.type === 'MemberExpression' &&
      node.expression.callee.object.name === 'console'
    ) {
      count++;
    }

    if (node.body && Array.isArray(node.body)) {
      node.body.forEach((child: any) => walk(child));
    }

    if (node.body && typeof node.body === 'object') {
      walk(node.body);
    }

    if (node.consequent) {
      walk(node.consequent);
    }

    if (node.alternate) {
      walk(node.alternate);
    }
  }

  walk(ast);
  return count;
}

/**
 * Detect ObjectId usage patterns in AST
 * @param ast - AST object
 * @returns Array of ObjectId usage locations
 */
export function detectObjectIdUsage(ast: any): ObjectIdUsage[] {
  const usages: ObjectIdUsage[] = [];

  function walk(node: any): void {
    // Check for ObjectId() calls
    if (node.type === 'CallExpression' && node.callee.name === 'ObjectId') {
      usages.push({
        type: 'function_call',
        node,
        line: node.loc.start.line,
        column: node.loc.start.column
      });
    }

    // Check for mongoose.Types.ObjectId calls
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'MemberExpression' &&
      node.callee.object.name === 'Types' &&
      node.callee.property.name === 'ObjectId'
    ) {
      usages.push({
        type: 'mongoose_call',
        node,
        line: node.loc.start.line,
        column: node.loc.start.column
      });
    }

    // Check for new ObjectId() calls
    if (node.type === 'NewExpression' && node.callee.name === 'ObjectId') {
      usages.push({
        type: 'new_expression',
        node,
        line: node.loc.start.line,
        column: node.loc.start.column
      });
    }

    // Check for require statements importing ObjectId
    if (node.type === 'CallExpression' && node.callee.name === 'require') {
      const arg = node.arguments[0];
      if (arg && arg.value && arg.value.includes('mongoose')) {
        usages.push({
          type: 'require_statement',
          node,
          line: node.loc.start.line,
          column: node.loc.start.column
        });
      }
    }

    // Walk child nodes
    if (node.body && Array.isArray(node.body)) {
      node.body.forEach((child: any) => walk(child));
    }

    if (node.body && typeof node.body === 'object') {
      walk(node.body);
    }

    if (node.consequent) {
      walk(node.consequent);
    }

    if (node.alternate) {
      walk(node.alternate);
    }
  }

  walk(ast);
  return usages;
}

/**
 * Detect UUID usage patterns in AST
 * @param ast - AST object
 * @returns Array of UUID usage locations
 */
export function detectUUIDUsage(ast: any): UUIDUsage[] {
  const usages: UUIDUsage[] = [];

  function walk(node: any): void {
    // Check for UUID-related function calls
    if (
      node.type === 'CallExpression' &&
      node.callee.name &&
      (node.callee.name.includes('uuid') || node.callee.name.includes('UUID'))
    ) {
      usages.push({
        type: 'uuid_call',
        node,
        line: node.loc.start.line,
        column: node.loc.start.column
      });
    }

    // Check for UUID in string literals
    if (node.type === 'Literal' && typeof node.value === 'string') {
      if (node.value.includes('uuid') || node.value.includes('UUID')) {
        usages.push({
          type: 'uuid_string',
          node,
          line: node.loc.start.line,
          column: node.loc.start.column
        });
      }
    }

    // Walk child nodes
    if (node.body && Array.isArray(node.body)) {
      node.body.forEach((child: any) => walk(child));
    }

    if (node.body && typeof node.body === 'object') {
      walk(node.body);
    }

    if (node.consequent) {
      walk(node.consequent);
    }

    if (node.alternate) {
      walk(node.alternate);
    }
  }

  walk(ast);
  return usages;
}

/**
 * Calculate cyclomatic complexity of a function
 * @param node - Function AST node
 * @returns Cyclomatic complexity score
 */
export function calculateComplexity(node: any): number {
  let complexity = 1; // Base complexity

  function walk(n: any): void {
    switch (n.type) {
      case 'IfStatement':
      case 'ConditionalExpression':
        complexity++;
        break;
      case 'LogicalExpression':
        if (n.operator === '&&' || n.operator === '||') {
          complexity++;
        }
        break;
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
        complexity++;
        break;
      case 'CaseClause':
        complexity++;
        break;
      case 'CatchClause':
        complexity++;
        break;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        // Don't recurse into nested functions for complexity calculation
        return;
    }

    // Walk child nodes
    if (n.body && Array.isArray(n.body)) {
      n.body.forEach((child: any) => walk(child));
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
      n.cases.forEach((caseNode: any) => walk(caseNode));
    }

    if (n.consequent && Array.isArray(n.consequent.body)) {
      n.consequent.body.forEach((child: any) => walk(child));
    }
  }

  if (node.body) {
    walk(node.body);
  }

  return complexity;
}

/**
 * Detect legacy patterns in code
 * @param ast - AST object
 * @param bannedPatterns - Array of regex patterns to detect (currently unused but kept for API compatibility)
 * @returns Array of legacy pattern violations
 */
export function detectLegacyPatterns(ast: any, bannedPatterns?: RegExp[]): LegacyPattern[] {
  const violations: LegacyPattern[] = [];

  function walk(node: any): void {
    // Check for var declarations
    if (node.type === 'VariableDeclaration' && node.kind === 'var') {
      violations.push({
        type: 'var_declaration',
        node,
        line: node.loc.start.line,
        column: node.loc.start.column,
        pattern: 'var '
      });
    }

    // Check for callback patterns
    if (
      node.type === 'FunctionExpression' &&
      node.parent &&
      node.parent.type === 'CallExpression' &&
      node.parent.parent &&
      node.parent.parent.type === 'CallExpression'
    ) {
      violations.push({
        type: 'callback_pattern',
        node,
        line: node.loc.start.line,
        column: node.loc.start.column,
        pattern: 'callback'
      });
    }

    // Walk child nodes
    if (node.body && Array.isArray(node.body)) {
      node.body.forEach((child: any) => walk(child));
    }

    if (node.body && typeof node.body === 'object') {
      walk(node.body);
    }

    if (node.consequent) {
      walk(node.consequent);
    }

    if (node.alternate) {
      walk(node.alternate);
    }
  }

  walk(ast);
  return violations;
}

/**
 * Get all import/export statements
 * @param ast - AST object
 * @returns Object with imports and exports arrays
 */
export function getImportExportStatements(ast: any): ImportExportResult {
  const result: ImportExportResult = {
    imports: [],
    exports: []
  };

  function walk(node: any): void {
    if (node.type === 'ImportDeclaration') {
      result.imports.push({
        type: 'import',
        node,
        source: node.source.value,
        specifiers: node.specifiers.map((spec: any) =>
          spec.imported ? spec.imported.name : spec.local.name
        )
      });
    }

    if (node.type === 'ExportDefaultDeclaration' || node.type === 'ExportNamedDeclaration') {
      result.exports.push({
        type: node.type === 'ExportDefaultDeclaration' ? 'default_export' : 'named_export',
        node,
        declaration: node.declaration ? node.declaration.name : null
      });
    }

    if (node.body && Array.isArray(node.body)) {
      node.body.forEach((child: any) => walk(child));
    }

    if (node.body && typeof node.body === 'object') {
      walk(node.body);
    }
  }

  walk(ast);
  return result;
}

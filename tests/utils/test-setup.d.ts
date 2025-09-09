/// <reference types="jest" />
// Jest globals typing shim for TypeScript language service in VSCode.
// Build already excludes test files via tsconfig.json, but the editor
// still type-checks them. This file ensures describe/test/expect/jest
// are recognized without importing @jest/globals in every test file.
export {};

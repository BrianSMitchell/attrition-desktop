# Fowler's Taxonomy Code Smell Standards

## Overview

Fowler's Taxonomy provides a structured classification system for code smells, organized into seven distinct categories. This document establishes industry-standard thresholds and remediation guidelines for each category, specifically adapted for the Attrition space strategy game codebase.

## Taxonomy Categories and Standards

### 1. Bloaters

**Definition**: Code elements that have grown excessively large and need to be broken down into smaller pieces.

#### Long Method
- **Threshold**: >50 lines of code
- **Industry Standard**: Methods should be 10-50 lines maximum
- **Current Project**: 20 lines maximum (more strict for game logic)
- **Impact**: Difficult to understand, test, and maintain
- **Remediation**: Extract methods, use composition over inheritance

#### Large Class
- **Threshold**: >500 lines or >20 methods
- **Industry Standard**: 200-500 lines per class
- **Current Project**: 300 lines maximum (service classes)
- **Impact**: Multiple responsibilities, high coupling
- **Remediation**: Apply Single Responsibility Principle, extract classes

#### Long Parameter List
- **Threshold**: >7 parameters
- **Industry Standard**: <7 parameters per method
- **Current Project**: <5 parameters (game services)
- **Impact**: Difficult to use, high coupling
- **Remediation**: Use parameter objects, introduce context objects

#### Data Clumps
- **Threshold**: 3+ identical parameters across multiple methods
- **Industry Standard**: Eliminate duplicate parameter groups
- **Current Project**: 0 tolerance for game entity parameters
- **Impact**: Duplication, maintenance overhead
- **Remediation**: Extract classes, use composition

#### Primitive Obsession
- **Threshold**: >3 primitive types for a concept
- **Industry Standard**: Replace primitives with domain objects
- **Current Project**: Use TypeScript types for all game entities
- **Impact**: Loss of type safety, weak domain modeling
- **Remediation**: Create value objects and domain types

### 2. Object-Orientation Abusers

**Definition**: Incorrect use of object-oriented principles and mechanisms.

#### Switch Statements
- **Threshold**: Any switch statement on object types
- **Industry Standard**: Use polymorphism instead of switches
- **Current Project**: 0 tolerance (use strategy pattern for game mechanics)
- **Impact**: Violation of Open/Closed Principle
- **Remediation**: Replace with polymorphic methods

#### Temporary Field
- **Threshold**: Fields used only in certain circumstances
- **Industry Standard**: Extract classes or use method parameters
- **Current Project**: 0 tolerance in service classes
- **Impact**: Confusing class contracts
- **Remediation**: Introduce null objects or extract strategy classes

#### Refused Bequest
- **Threshold**: Subclasses not using inherited behavior
- **Industry Standard**: Use composition over inheritance
- **Current Project**: Avoid inheritance hierarchies in game services
- **Impact**: Confusing inheritance relationships
- **Remediation**: Apply composition and delegation patterns

#### Alternative Classes with Different Interfaces
- **Threshold**: Classes doing similar things differently
- **Industry Standard**: Unify interfaces and extract common behavior
- **Current Project**: Standardize service method signatures
- **Impact**: Inconsistent APIs, code duplication
- **Remediation**: Rename methods, move methods, extract superclasses

### 3. Change Preventers

**Definition**: Code structures that make it hard to modify or extend the system.

#### Divergent Change
- **Threshold**: Classes changed for different reasons
- **Industry Standard**: Apply Single Responsibility Principle
- **Current Project**: Separate HTTP, business logic, and data access
- **Impact**: Frequent changes for unrelated reasons
- **Remediation**: Extract classes by responsibility

#### Shotgun Surgery
- **Threshold**: Single changes requiring multiple class modifications
- **Industry Standard**: Localize changes to single classes
- **Current Project**: Encapsulate game mechanics in dedicated services
- **Impact**: Changes spread across many files
- **Remediation**: Move methods, move fields, inline classes

#### Parallel Inheritance Hierarchies
- **Threshold**: Every time you make a subclass, you need another
- **Industry Standard**: Eliminate parallel hierarchies
- **Current Project**: Avoid inheritance for game entity variations
- **Impact**: Complex inheritance chains
- **Remediation**: Use delegation over inheritance

### 4. Dispensables

**Definition**: Unnecessary code elements that should be removed.

#### Comments
- **Threshold**: Comments explaining confusing code
- **Industry Standard**: Code should be self-documenting
- **Current Project**: Comments only for complex game algorithms
- **Impact**: Comments indicate design problems
- **Remediation**: Rename methods, extract methods, move methods

#### Duplicate Code
- **Threshold**: Identical code blocks >10 lines
- **Industry Standard**: <5% code duplication
- **Current Project**: <3% duplication (game logic)
- **Impact**: Maintenance overhead, inconsistency risk
- **Remediation**: Extract methods, pull up methods, form template methods

#### Lazy Class
- **Threshold**: Classes with minimal functionality
- **Industry Standard**: Classes should have clear responsibilities
- **Current Project**: 0 tolerance for single-method classes
- **Impact**: Unnecessary abstraction overhead
- **Remediation**: Inline classes, collapse hierarchies

#### Data Class
- **Threshold**: Classes with only getters/setters
- **Industry Standard**: Objects should have behavior
- **Current Project**: All game entities must have domain methods
- **Impact**: Anemic domain model
- **Remediation**: Move methods to data classes, hide methods

#### Dead Code
- **Threshold**: Unused code elements
- **Industry Standard**: Remove unused code
- **Current Project**: 0 tolerance for unused imports/methods
- **Impact**: Codebase clutter, confusion
- **Remediation**: Delete unused code

#### Speculative Generality
- **Threshold**: Abstract code for unused features
- **Industry Standard**: YAGNI (You Aren't Gonna Need It)
- **Current Project**: Remove unused game mechanics abstractions
- **Impact**: Unnecessary complexity
- **Remediation**: Collapse hierarchies, inline classes, remove parameters

### 5. Couplers

**Definition**: Code elements that create unnecessary coupling between modules.

#### Feature Envy
- **Threshold**: Methods using more external data than local
- **Industry Standard**: Methods should use mostly their own data
- **Current Project**: 70% feature envy threshold
- **Impact**: High coupling, misplaced responsibilities
- **Remediation**: Move methods, extract methods

#### Inappropriate Intimacy
- **Threshold**: Classes accessing private fields/methods of others
- **Industry Standard**: Respect encapsulation boundaries
- **Current Project**: 0 tolerance across service boundaries
- **Impact**: Brittle coupling, maintenance issues
- **Remediation**: Move methods/fields, change bidirectional associations

#### Message Chains
- **Threshold**: Long chains of method calls
- **Industry Standard**: Avoid deep call chains
- **Current Project**: Maximum 3 levels deep
- **Impact**: Tight coupling, fragile code
- **Remediation**: Hide delegates, extract methods

#### Middle Man
- **Threshold**: Classes delegating most work to others
- **Industry Standard**: Remove unnecessary delegation
- **Current Project**: Controllers should delegate to services
- **Impact**: Unnecessary abstraction layer
- **Remediation**: Remove middle man, inline methods

### 6. Encapsulators

**Definition**: Code elements that hinder proper encapsulation.

#### Interface Segregation Principle (ISP) Violations
- **Threshold**: Classes implementing unused methods
- **Industry Standard**: Clients should not depend on unused methods
- **Current Project**: Services should have focused interfaces
- **Impact**: Unnecessary dependencies
- **Remediation**: Split large interfaces

#### Leaky Encapsulation
- **Threshold**: Private details exposed through public interfaces
- **Industry Standard**: Hide implementation details
- **Current Project**: Game logic should not expose database concerns
- **Impact**: Implementation coupling
- **Remediation**: Apply Law of Demeter

### 7. Inheritance Abusers

**Definition**: Improper use of inheritance mechanisms.

#### Subclass That Does Too Little
- **Threshold**: Subclasses not adding significant behavior
- **Industry Standard**: Subclasses should justify their existence
- **Current Project**: Game entity subclasses must add meaningful behavior
- **Impact**: Unnecessary complexity
- **Remediation**: Collapse hierarchies

#### Subclass That Does Too Much
- **Threshold**: Subclasses implementing too much functionality
- **Industry Standard**: Subclasses should be focused
- **Current Project**: 0 tolerance for god subclasses
- **Impact**: Complex inheritance chains
- **Remediation**: Refactor to strategy pattern

## Industry Standards Integration

### Clean Code Guidelines
- **Line Length**: 80-120 characters (industry standard: 80-100)
- **Indentation**: 2 spaces (industry standard: 2-4 spaces)
- **Method Complexity**: Cyclomatic complexity <10
- **Class Cohesion**: Single Responsibility Principle

### SOLID Principles Application
- **SRP**: One reason to change per class
- **OCP**: Open for extension, closed for modification
- **LSP**: Subtypes must be substitutable for base types
- **ISP**: No client should depend on methods it doesn't use
- **DIP**: Depend on abstractions, not concretions

### Game Development Context

#### Real-time System Considerations
- **State Management**: Immutable state updates for game entities
- **Performance**: Minimize object creation in game loops
- **Concurrency**: Thread-safe game state modifications
- **Scalability**: Efficient algorithms for thousands of entities

#### Multiplayer Game Standards
- **Synchronization**: Deterministic game state calculations
- **Latency**: Client-side prediction with server reconciliation
- **Consistency**: Eventual consistency for non-critical state
- **Cheating Prevention**: Server-side validation for all game actions

## Project-Specific Thresholds

### Critical (0% Tolerance)
- **ID Consistency**: All entities must use UUID format
- **Type Safety**: No TypeScript compilation errors
- **Security**: No known vulnerabilities in production

### High (<5% Tolerance)
- **Console Logging**: Max 5 console statements per file
- **Legacy Patterns**: No MongoDB usage in Supabase code
- **Service Extraction**: All complex routes must use service pattern

### Medium (<15% Tolerance)
- **Mixed Concerns**: HTTP, business logic, data access separated
- **Code Duplication**: <5% duplication across codebase
- **Complexity**: Functions <15 cyclomatic complexity

### Baseline (<30% Tolerance)
- **General Smells**: Fowler taxonomy violations within limits
- **Style Consistency**: Consistent formatting and naming
- **Documentation**: Public APIs documented

## Remediation Priority

### Priority 1 (Immediate)
- Critical security issues
- TypeScript compilation errors
- ID consistency violations
- Legacy database patterns

### Priority 2 (Sprint)
- Long methods in game logic
- Large classes in service layer
- Feature envy across services
- Code duplication in game mechanics

### Priority 3 (Backlog)
- Style consistency issues
- Documentation gaps
- Minor code smells
- Performance optimizations

## Measurement and Monitoring

### Metrics Collection
- **Static Analysis**: ESLint rules for real-time detection
- **Code Metrics**: Complexity, duplication, coupling analysis
- **Trend Tracking**: Monitor improvement over time
- **Quality Gates**: Automated checks in CI/CD pipeline

### Success Criteria
- **Zero Critical Issues**: No priority 1 violations in production
- **Reducing Trend**: Code smell count decreasing over time
- **Team Adoption**: Developers actively using standards in code reviews
- **Automated Enforcement**: 90%+ of standards enforced by tools

## References

- Fowler, Martin. "Refactoring: Improving the Design of Existing Code"
- Martin, Robert C. "Clean Code: A Handbook of Agile Software Craftsmanship"
- Evans, Eric. "Domain-Driven Design"
- Gamma et al. "Design Patterns: Elements of Reusable Object-Oriented Software"

## Last Updated

2025-10-10

## Version History

- **v1.0**: Initial standards based on Fowler's Taxonomy
- **v1.1**: Added game development context and real-time system considerations
- **v1.2**: Integrated with project ESLint rules and metrics system
# Author Guidelines - Preparing Code for Review

## Overview

This document provides comprehensive guidelines for developers (authors) preparing their code for review in the Attrition project. Well-prepared code and clear pull requests significantly improve review efficiency and code quality.

## Mindset and Preparation

### Author Philosophy

#### Quality-First Development
- **Review-Ready Code**: Write code with reviewers in mind
- **Clear Intent**: Make the purpose and approach obvious
- **Comprehensive Testing**: Ensure changes work correctly before review
- **Documentation**: Provide context and explanation for complex changes

#### Collaborative Approach
- **Reviewer as Partner**: Reviewers help improve code quality
- **Open Communication**: Be receptive to feedback and questions
- **Shared Goals**: Work together to achieve project objectives
- **Continuous Learning**: Use reviews as learning opportunities

### Pre-Development Planning

#### Define Clear Objectives
1. **Understand Requirements**: Clarify what needs to be built or fixed
2. **Consider Architecture**: Think about how changes fit into existing systems
3. **Identify Dependencies**: Understand what other systems are affected
4. **Plan Testing Strategy**: Determine how to verify changes work correctly

#### Estimate Complexity
- **Trivial**: Simple bug fixes, documentation updates (< 1 hour)
- **Minor**: Single feature additions, small refactoring (2-8 hours)
- **Major**: New features, significant refactoring, architectural changes (1-3 days)
- **Complex**: Multiple systems, database migrations, breaking changes (3+ days)

## Writing Reviewable Code

### 1. Code Organization

#### Follow Established Patterns
- **Service Extraction**: Extract business logic to appropriate services
- **Controller Pattern**: Keep HTTP concerns in route handlers
- **Domain Services**: Organize services by business domain
- **Clean Interfaces**: Well-defined method signatures and contracts

#### File Structure Best Practices
```typescript
// ✅ Well-organized service
class UserManagementService {
  // Public API methods
  static async createUser(userData: UserData): Promise<User>
  static async updateUser(userId: string, updates: UserUpdate): Promise<User>
  static async deleteUser(userId: string): Promise<void>

  // Private helper methods
  private static validateUserData(userData: UserData): void
  private static hashPassword(password: string): string
}

// ❌ Poorly organized
class UserService {
  // Mixed public and private methods
  // Unclear responsibilities
  // Inconsistent naming
}
```

### 2. Code Quality Standards

#### Method Design
- **Single Responsibility**: Each method should do one thing well
- **Appropriate Length**: Methods under 50 lines when possible
- **Clear Parameters**: Use parameter objects for complex method signatures
- **Descriptive Names**: Method names clearly indicate what they do

#### Class Design
- **Focused Classes**: Classes with single, clear responsibilities
- **Appropriate Size**: Classes under 20 methods and 500 lines
- **Clean Interfaces**: Well-defined public APIs
- **Proper Encapsulation**: Internal state properly managed

#### Error Handling
```typescript
// ✅ Proper error handling
async createUser(userData: UserData): Promise<User> {
  try {
    this.validateUserData(userData);
    const hashedPassword = await this.hashPassword(userData.password);
    const user = await this.saveUser({ ...userData, password: hashedPassword });

    // Audit logging
    await AuditLogger.log('user_created', { userId: user.id });

    return user;
  } catch (error) {
    // Structured error with context
    throw new UserCreationError(`Failed to create user: ${error.message}`, {
      originalError: error,
      userData: sanitizeUserData(userData) // Remove sensitive data
    });
  }
}
```

### 3. Game-Specific Considerations

#### Resource Management
- **Consistent Calculations**: Use established resource calculation patterns
- **Balance Validation**: Ensure game mechanics maintain balance
- **State Consistency**: Maintain consistent game state across operations
- **Timer Accuracy**: Implement accurate game timing and cooldowns

#### Real-time Features
- **WebSocket Efficiency**: Send updates at appropriate intervals
- **Data Filtering**: Filter sensitive data from real-time broadcasts
- **Connection Management**: Handle WebSocket disconnections gracefully
- **State Synchronization**: Ensure multiplayer state consistency

#### Database Integration
- **Supabase Patterns**: Use established Supabase query patterns
- **ID Validation**: Validate UUID formats for all entity IDs
- **Query Optimization**: Write efficient database queries
- **Error Handling**: Handle database errors gracefully

## Preparing Pull Requests

### 1. Pre-Submission Checklist

#### Automated Quality Checks
- [ ] **ESLint**: All linting errors resolved
- [ ] **TypeScript**: Code compiles without errors
- [ ] **Tests**: All existing tests pass
- [ ] **Build**: Project builds successfully
- [ ] **Code Metrics**: Complexity and duplication within thresholds

#### Manual Quality Checks
- [ ] **Service Extraction**: Business logic extracted from route handlers
- [ ] **Error Handling**: Consistent error patterns implemented
- [ ] **Input Validation**: All inputs properly validated
- [ ] **Documentation**: Complex logic documented

### 2. PR Description

#### Use Pull Request Template
Follow the format in [pull-request-template.md](../templates/pull-request-template.md):

1. **Clear Title**: Concise summary of changes
2. **Comprehensive Description**: What, why, and how of the changes
3. **Technical Details**: Files changed, dependencies, breaking changes
4. **Quality Checklist**: Completed checklist of requirements
5. **Testing Instructions**: How reviewers can test the changes

#### Writing Effective Descriptions

##### What (The Change)
```markdown
## Description

### What
Added new building construction system with proper resource validation and real-time updates.

- Implemented BuildingService with create, upgrade, and demolish methods
- Added resource validation to prevent construction without sufficient resources
- Integrated real-time WebSocket updates for building completion events
- Added comprehensive error handling for construction failures
```

##### Why (The Rationale)
```markdown
### Why
The existing building system was scattered across multiple controllers with inconsistent validation and no real-time updates. This change:

- Centralizes building logic in a dedicated service for better maintainability
- Prevents resource exploits through server-side validation
- Improves user experience with real-time building completion notifications
- Establishes consistent patterns for future construction features
```

##### How (The Implementation)
```markdown
### How
1. **Service Extraction**: Created BuildingService following established patterns
2. **Resource Validation**: Implemented server-side validation using ResourceCalculationService
3. **Real-time Integration**: Added WebSocket events using existing real-time infrastructure
4. **Database Layer**: Used Supabase with proper query optimization and error handling
5. **Testing**: Added comprehensive unit and integration tests
```

### 3. Testing Strategy

#### Manual Testing
Provide clear instructions for testing:

```markdown
## Testing Instructions

### Setup
1. Start development servers: `npm run dev`
2. Navigate to the game dashboard
3. Ensure test user has sufficient resources for building

### Test Cases
1. **Basic Construction**:
   - Select a planet and attempt to build a Metal Mine
   - Verify resource costs are deducted correctly
   - Confirm building appears in planet view

2. **Resource Validation**:
   - Attempt construction without sufficient resources
   - Verify appropriate error message displayed
   - Confirm resources not deducted

3. **Real-time Updates**:
   - Start building construction
   - Verify WebSocket events received for construction progress
   - Confirm completion notification when finished

4. **Edge Cases**:
   - Test with multiple concurrent building operations
   - Verify behavior when construction fails midway
   - Test cancellation of building operations
```

#### Automated Testing
- [ ] **Unit Tests**: Test individual functions and methods
- [ ] **Integration Tests**: Test interactions between components
- [ ] **Game Logic Tests**: Test game mechanics and balance
- [ ] **Performance Tests**: Verify performance requirements met

### 4. Documentation Updates

#### Code Documentation
- [ ] **Complex Algorithms**: Documented with clear explanations
- [ ] **API Changes**: New endpoints or parameters documented
- [ ] **Architecture Decisions**: Significant decisions explained
- [ ] **Examples**: Usage examples provided where helpful

#### User Documentation
- [ ] **Feature Documentation**: New features documented for users
- [ ] **Changelog**: Changes noted for release notes
- [ ] **Help Text**: User-facing help text updated if needed

## Development Workflow

### 1. Incremental Development

#### Small, Reviewable Changes
- **Single Responsibility**: Each PR should address one main concern
- **Logical Grouping**: Group related changes that must be deployed together
- **Independent Testing**: Each PR should be testable independently
- **Clear Dependencies**: Make dependencies between PRs explicit

#### Commit Organization
```markdown
# ✅ Good commit structure
feat: add building construction service
- Extract building logic from controllers
- Implement resource validation
- Add real-time progress updates

refactor: improve error handling in building operations
- Add structured error types
- Implement consistent error logging
- Improve user feedback messages

test: add comprehensive building system tests
- Unit tests for BuildingService methods
- Integration tests for construction flow
- Game balance validation tests

# ❌ Poor commit organization
fix: various improvements
- Added building service (major feature!)
- Fixed error handling (refactoring)
- Added tests (testing)
- Updated documentation (docs)
```

### 2. Self-Review Process

#### Before Requesting Review
1. **Code Review Your Own Work**: Apply the same standards you'd expect from reviewers
2. **Test Thoroughly**: Verify changes work as expected in various scenarios
3. **Check Checklists**: Use project checklists to verify compliance
4. **Seek Early Feedback**: Get input from teammates for complex changes

#### Self-Review Checklist
- [ ] **Functionality**: Does the code do what it should?
- [ ] **Error Handling**: Are errors handled gracefully?
- [ ] **Edge Cases**: Are edge cases and error conditions handled?
- [ ] **Performance**: Are there obvious performance issues?
- [ ] **Security**: Are there security vulnerabilities?
- [ ] **Testing**: Is the change properly tested?
- [ ] **Documentation**: Is the change properly documented?

### 3. Responding to Review Feedback

#### Understanding Feedback
1. **Clarify Ambiguity**: Ask for clarification if feedback is unclear
2. **Understand Rationale**: Make sure you understand why something matters
3. **Consider Alternatives**: Be open to different approaches
4. **Learn from Experience**: Use feedback to improve future development

#### Implementing Changes
1. **Address All Points**: Respond to all feedback items
2. **Explain Decisions**: Document why certain approaches were chosen
3. **Test Changes**: Verify fixes work and don't break existing functionality
4. **Update Documentation**: Revise documentation based on review findings

## Common Author Mistakes and Solutions

### Mistake 1: Insufficient Context
**Problem**: Reviewers don't understand why or how changes were made

**Solution**:
- Provide comprehensive PR descriptions
- Link to related issues and discussions
- Document architectural decisions
- Explain complex algorithms and business logic

### Mistake 2: Large, Complex PRs
**Problem**: Large PRs are difficult to review thoroughly

**Solution**:
- Break large changes into smaller, focused PRs
- Submit architectural changes separately from feature implementation
- Use feature flags for gradual rollout of complex features
- Plan development in reviewable increments

### Mistake 3: Inadequate Testing
**Problem**: Untested or poorly tested changes lead to integration issues

**Solution**:
- Write tests before implementing features (TDD approach)
- Test edge cases and error conditions
- Include integration tests for complex workflows
- Verify changes work with existing functionality

### Mistake 4: Poor Error Handling
**Problem**: Inadequate error handling leads to poor user experience

**Solution**:
- Implement consistent error handling patterns
- Provide meaningful error messages for users
- Log technical details for debugging
- Handle errors gracefully without exposing sensitive information

### Mistake 5: Ignoring Project Patterns
**Problem**: Not following established project conventions and patterns

**Solution**:
- Study existing codebase patterns before implementing
- Follow established service extraction and controller patterns
- Use existing utilities and helper functions
- Maintain consistency with existing code style

## Collaboration Best Practices

### Working with Reviewers

#### Communication
1. **Be Responsive**: Respond promptly to review feedback
2. **Ask Questions**: Seek clarification when feedback is unclear
3. **Provide Updates**: Keep reviewers informed of progress
4. **Express Appreciation**: Thank reviewers for their time and feedback

#### Conflict Resolution
1. **Stay Professional**: Focus on code quality, not personal preferences
2. **Understand Perspectives**: Consider reviewer's experience and expertise
3. **Find Compromises**: Look for solutions that satisfy both parties
4. **Escalate Appropriately**: Know when to involve technical leads

### Team Learning

#### Knowledge Sharing
1. **Document Decisions**: Record significant architectural decisions
2. **Share Insights**: Communicate learnings from development process
3. **Update Patterns**: Propose improvements to established patterns
4. **Mentor Others**: Help junior developers understand project patterns

#### Process Improvement
1. **Identify Issues**: Note problems with current processes
2. **Propose Solutions**: Suggest improvements to development workflow
3. **Implement Changes**: Help improve tools and processes
4. **Share Success**: Celebrate process improvements that work well

## Performance Considerations

### Development Performance
1. **Efficient Workflow**: Use tools and shortcuts effectively
2. **Testing Strategy**: Balance thorough testing with development speed
3. **Code Organization**: Organize code for easy navigation and review
4. **Tool Utilization**: Leverage IDE features and automation

### Code Performance
1. **Algorithm Efficiency**: Choose appropriate algorithms and data structures
2. **Database Optimization**: Write efficient queries and use proper indexing
3. **Memory Management**: Avoid memory leaks and excessive resource usage
4. **Scalability**: Consider performance impact on system growth

## Quality Assurance Integration

### Automated Tool Integration
1. **Pre-commit Hooks**: Run quality checks before committing
2. **IDE Integration**: Use IDE features for real-time quality feedback
3. **CI/CD Pipeline**: Understand automated quality gate requirements
4. **Local Testing**: Run full test suite before submitting PR

### Continuous Quality
1. **Incremental Quality**: Build quality into each development step
2. **Early Feedback**: Get feedback early in development process
3. **Iterative Improvement**: Use reviews to continuously improve skills
4. **Standards Evolution**: Contribute to improving project standards

## Documentation Responsibilities

### Code Documentation
- **Method Documentation**: Document complex business logic
- **Class Documentation**: Explain class responsibilities and relationships
- **Architecture Comments**: Document significant design decisions
- **Usage Examples**: Provide examples for complex APIs

### Process Documentation
- **Update Patterns**: Document new patterns or modifications to existing ones
- **Share Learnings**: Document insights gained during development
- **Improve Guidelines**: Suggest improvements to development processes
- **Knowledge Transfer**: Help onboard new team members

## Success Metrics

### Personal Development
- **Review Feedback Quality**: Positive feedback from reviewers
- **Issue Resolution Speed**: Quick response to review feedback
- **Code Quality Improvement**: Demonstrated improvement in code quality
- **Process Contribution**: Contributions to improving development processes

### Team Impact
- **Review Efficiency**: Smooth, efficient review process
- **Code Quality**: Consistent, high-quality code contributions
- **Knowledge Sharing**: Effective sharing of domain and technical knowledge
- **Collaboration**: Positive, productive working relationships

---

## Author Preparation Checklist

### Before Development
- [ ] Understand requirements and scope
- [ ] Identify affected systems and dependencies
- [ ] Plan testing strategy
- [ ] Consider architectural implications

### During Development
- [ ] Follow established patterns and conventions
- [ ] Implement comprehensive error handling
- [ ] Write tests for new functionality
- [ ] Document complex logic and decisions

### Before Submitting PR
- [ ] Complete pull request template
- [ ] Verify all automated checks pass
- [ ] Test changes thoroughly
- [ ] Self-review using project checklists

### After Receiving Feedback
- [ ] Respond to all reviewer comments
- [ ] Implement requested changes
- [ ] Re-test modified functionality
- [ ] Update documentation as needed

**Last Updated**: 2025-10-10
**Version**: 1.0.0
**Status**: Active
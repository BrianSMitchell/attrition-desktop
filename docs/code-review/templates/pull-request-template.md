# Pull Request Template - Attrition Space Strategy Game

## PR Overview

**PR Type:**
- [ ] Feature Development
- [ ] Bug Fix
- [ ] Refactoring
- [ ] Performance Optimization
- [ ] Security Update
- [ ] Documentation Update

**Related Issues:**
- [ ] Issue # (link to related issue/ticket)

## Description

### What
<!-- Brief description of what this PR accomplishes -->

### Why
<!-- Explanation of why this change is needed -->

### How
<!-- Technical explanation of how the change is implemented -->

## Technical Details

### Files Changed
<!-- List of files modified, added, or deleted -->

### Dependencies
<!-- New dependencies added or modified -->

### Breaking Changes
<!-- Any breaking changes that affect existing functionality -->

## Quality Checklist

### Pre-Submission Requirements ✅

#### Automated Quality Checks
- [ ] **ESLint**: All linting errors resolved
- [ ] **TypeScript**: Code compiles without errors
- [ ] **Tests**: All existing tests pass
- [ ] **Build**: Project builds successfully

#### Code Quality Standards
- [ ] **Service Extraction**: Route handlers follow service extraction pattern
- [ ] **Controller Pattern**: HTTP concerns separated from business logic
- [ ] **Domain Services**: Business logic in appropriate domain services
- [ ] **Error Handling**: Consistent error handling patterns implemented

### Fowler's Taxonomy Review ✅

#### Bloaters
- [ ] **Long Method**: Methods under 50 lines (excluding comments/empty lines)
- [ ] **Large Class**: Classes under 20 methods and 500 lines
- [ ] **Primitive Obsession**: Domain objects used instead of primitive types
- [ ] **Long Parameter List**: Methods with ≤5 parameters (or parameter objects)
- [ ] **Data Clumps**: Related data grouped into coherent objects

#### Duplicators
- [ ] **Duplicated Code**: No copy-pasted code or similar algorithms
- [ ] **Similar Classes**: No parallel class hierarchies doing same things

#### Change Preventers
- [ ] **Shotgun Surgery**: Single changes don't require multiple file edits
- [ ] **Divergent Change**: Classes change for single, coherent reasons

#### Object-Orientation Abusers
- [ ] **Switch Statements**: Polymorphism used instead of switch on types
- [ ] **Refused Bequest**: Subclasses use inherited functionality appropriately

#### Dispensables
- [ ] **Dead Code**: No unused methods, classes, or commented code
- [ ] **Speculative Generality**: No over-engineered solutions for unused cases
- [ ] **Console.log Abuse**: No console.log in production code or loops

#### Couplers
- [ ] **Feature Envy**: Methods operate on their own data, not other classes'
- [ ] **Middle Man**: Classes add value, not just delegate
- [ ] **High Coupling**: Classes can be changed and tested independently

### Project-Specific Review ✅

#### Supabase Migration Patterns
- [ ] **ID Consistency**: UUID format validation for all entity IDs
- [ ] **Query Optimization**: Proper use of `head: true`, `range()`, and filters
- [ ] **Error Handling**: Consistent Supabase error response patterns
- [ ] **Database Constraints**: RLS policies and constraints properly implemented

#### Game Architecture Patterns
- [ ] **Service Extraction**: Route handlers focused only on HTTP concerns
- [ ] **Domain Services**: Services organized by business domain
- [ ] **Controller Pattern**: Controllers handle business logic orchestration only
- [ ] **Clean Interfaces**: Well-defined service method signatures

#### Real-time Features
- [ ] **WebSocket Efficiency**: Updates sent at appropriate intervals
- [ ] **Subscription Management**: Proper subscription cleanup and error handling
- [ ] **Data Filtering**: Sensitive data filtered from real-time broadcasts
- [ ] **Connection Management**: WebSocket connections properly authenticated

### Security Review ✅

#### Authentication & Authorization
- [ ] **JWT Validation**: Tokens properly validated on protected routes
- [ ] **Route Protection**: Authentication checks on all protected endpoints
- [ ] **Password Security**: Passwords hashed and strong requirements enforced
- [ ] **Session Management**: Sessions properly invalidated and secured

#### Input Validation
- [ ] **Game Actions**: Resource amounts, coordinates, and actions validated
- [ ] **SQL Injection**: All queries use parameterized statements
- [ ] **XSS Prevention**: User content properly sanitized
- [ ] **Rate Limiting**: Excessive requests prevented

#### Data Protection
- [ ] **Sensitive Data**: No exposure of credentials or personal data in logs
- [ ] **Real-time Filtering**: Personal messages and sensitive data filtered
- [ ] **Error Information**: No sensitive system information in error messages

#### Game Integrity
- [ ] **Cheat Prevention**: Server-side validation of all game actions
- [ ] **Resource Validation**: Resource generation and consumption validated
- [ ] **Timer Enforcement**: Game timers and cooldowns enforced server-side

### Performance Review ✅

#### Database Performance
- [ ] **Query Optimization**: Efficient queries with proper indexes
- [ ] **Connection Management**: Proper connection pooling and cleanup
- [ ] **N+1 Prevention**: No N+1 query problems in loops

#### Game Loop Efficiency
- [ ] **Background Processing**: Expensive operations properly batched
- [ ] **Resource Calculations**: Calculations cached when appropriate
- [ ] **Real-time Updates**: Updates throttled and optimized

#### Scalability
- [ ] **Concurrent Access**: Operations handle multiple players safely
- [ ] **Memory Management**: No memory leaks in long-running processes
- [ ] **Resource Usage**: Reasonable memory and CPU usage

### Testing Requirements ✅

#### Unit Tests
- [ ] **Service Logic**: All service methods have appropriate unit tests
- [ ] **Edge Cases**: Error conditions and edge cases properly tested
- [ ] **Mock External Dependencies**: Database and external services mocked

#### Integration Tests
- [ ] **API Endpoints**: New endpoints have integration tests
- [ ] **Database Operations**: Database operations properly tested
- [ ] **Real-time Features**: WebSocket functionality tested

#### Game Logic Tests
- [ ] **Game Mechanics**: Core game mechanics properly tested
- [ ] **Balance Validation**: Game balance calculations verified
- [ ] **State Consistency**: Game state transitions properly tested

## Testing Instructions

### Manual Testing Steps
<!-- Step-by-step instructions for testing this PR -->

1. **Setup**:
   ```bash
   # Commands needed to test this PR
   ```

2. **Test Cases**:
   - [ ] Test case 1 description
   - [ ] Test case 2 description
   - [ ] Test case 3 description

### Automated Testing
<!-- Information about automated tests included in this PR -->

- **Unit Tests Added**: [ ] Yes / [ ] No
- **Integration Tests Added**: [ ] Yes / [ ] No
- **E2E Tests Added**: [ ] Yes / [ ] No

## Deployment Considerations

### Database Changes
- [ ] **Migrations**: Database schema changes documented
- [ ] **Seed Data**: New seed data requirements noted
- [ ] **Rollback Plan**: Plan for reverting changes if needed

### Environment Configuration
- [ ] **New Environment Variables**: Documented in configuration
- [ ] **Feature Flags**: Feature flags used for gradual rollout
- [ ] **Third-party Dependencies**: New external service dependencies noted

### Monitoring & Alerting
- [ ] **New Metrics**: Performance metrics to monitor identified
- [ ] **Error Tracking**: New error conditions added to monitoring
- [ ] **Alert Thresholds**: Appropriate alerting configured

## Documentation Updates

### Code Documentation
- [ ] **Comments**: Complex logic properly documented
- [ ] **API Documentation**: New endpoints documented
- [ ] **Architecture Decisions**: Significant decisions explained

### User Documentation
- [ ] **Feature Documentation**: New features documented for users
- [ ] **Changelog**: Changes noted for release notes
- [ ] **Help Text**: User-facing help text updated

## Review Requirements

### Required Reviewers
- [ ] **Domain Expert**: Reviewer familiar with affected game systems
- [ ] **Code Quality**: Reviewer experienced with code review process
- [ ] **Security**: Security review for sensitive changes
- [ ] **Performance**: Performance review for optimization changes

### Review Timeline
- [ ] **Standard Review**: 2-3 business days for typical changes
- [ ] **Expedited Review**: 1 business day for critical bug fixes
- [ ] **Extended Review**: 1 week for major architectural changes

## Post-Merge Checklist

### After Merge Tasks
- [ ] **Memory Bank Updated**: Project memory bank reflects changes
- [ ] **Documentation Published**: Updated documentation deployed
- [ ] **Monitoring Verified**: New monitoring and alerting confirmed working
- [ ] **Team Notified**: Relevant team members informed of changes

### Rollback Plan
<!-- Plan for reverting this PR if issues discovered post-deployment -->

## Additional Notes

<!-- Any additional context, considerations, or notes for reviewers -->

---

## PR Quality Score

**Pre-Submission Score**: ___ / 100

**Post-Review Score**: ___ / 100

**Final Approval**: [ ] Approved / [ ] Request Changes / [ ] Rejected

### Score Breakdown
- **Code Quality**: ___ / 25
- **Security**: ___ / 20
- **Performance**: ___ / 15
- **Testing**: ___ / 15
- **Documentation**: ___ / 10
- **Architecture**: ___ / 15

## Reviewer Feedback

### Overall Assessment
<!-- Reviewer's overall impression and summary -->

### Positive Feedback
<!-- What was done well in this PR -->

### Issues Found
<!-- Specific issues that need to be addressed -->

### Suggestions
<!-- Optional improvements for future consideration -->

### Questions
<!-- Points needing clarification from the author -->

### Approval Decision
- [ ] **Approve**: Changes meet all quality criteria
- [ ] **Request Changes**: Issues found but fixable
- [ ] **Reject**: Significant problems requiring major rework

---

*This template ensures comprehensive quality assessment for all changes to the Attrition codebase. Remove completed checklists as you verify each requirement.*
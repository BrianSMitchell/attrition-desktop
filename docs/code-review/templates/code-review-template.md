# Code Review Template - Attrition Space Strategy Game

## Review Information

**PR Title:** [PR Title Here]
**PR Number:** #[PR Number]
**Reviewer:** [Your Name]
**Review Date:** [Date]
**Review Type:** [Feature/Bug Fix/Refactoring/Performance/Security]

## Overall Assessment

### Summary
<!-- Brief overall assessment of the changes -->

### Recommendation
- [ ] **Approve** - Changes meet all quality criteria
- [ ] **Request Changes** - Issues found but fixable
- [ ] **Reject** - Significant problems requiring major rework

### Confidence Level
- [ ] **High** - Well-understood changes, confident in assessment
- [ ] **Medium** - Mostly understood, some uncertainty
- [ ] **Low** - Complex changes requiring deeper understanding

## Detailed Review

### 1. Code Quality Assessment

#### Fowler's Taxonomy Compliance
**Bloaters:**
- [ ] Long Method: Methods appropriately sized
- [ ] Large Class: Classes focused and appropriately sized
- [ ] Primitive Obsession: Domain objects used appropriately
- [ ] Long Parameter List: Parameter counts reasonable
- [ ] Data Clumps: Related data properly grouped

**Duplicators:**
- [ ] Duplicated Code: No copy-paste or similar algorithms
- [ ] Similar Classes: No unnecessary parallel hierarchies

**Change Preventers:**
- [ ] Shotgun Surgery: Changes don't require multiple file edits
- [ ] Divergent Change: Classes have single, clear purpose

**Object-Orientation Abusers:**
- [ ] Switch Statements: Polymorphism used instead of switches
- [ ] Refused Bequest: Inheritance used appropriately

**Dispensables:**
- [ ] Dead Code: No unused or unreachable code
- [ ] Speculative Generality: No over-engineering
- [ ] Console.log Abuse: No inappropriate logging

**Couplers:**
- [ ] Feature Envy: Methods work with their own data
- [ ] Middle Man: Classes add value, not just delegate
- [ ] High Coupling: Classes are loosely coupled

#### Project-Specific Patterns
**Service Extraction:**
- [ ] Route handlers focused on HTTP concerns only
- [ ] Business logic extracted to appropriate services
- [ ] Controller pattern properly implemented
- [ ] Domain services properly organized

**Supabase Integration:**
- [ ] UUID format validation implemented
- [ ] Query optimization patterns followed
- [ ] Error handling consistent with Supabase patterns
- [ ] Database constraints properly implemented

**Game Architecture:**
- [ ] Game logic follows established patterns
- [ ] Real-time features properly implemented
- [ ] Resource calculations consistent
- [ ] Empire resolution using established services

### 2. Security Assessment

#### Authentication & Authorization
- [ ] JWT tokens properly validated
- [ ] Route protection implemented correctly
- [ ] Password security measures in place
- [ ] Session management secure

#### Input Validation
- [ ] Game actions properly validated
- [ ] SQL injection prevention implemented
- [ ] XSS protection measures in place
- [ ] Rate limiting implemented

#### Data Protection
- [ ] Sensitive data not exposed in logs
- [ ] Real-time data properly filtered
- [ ] Error messages don't reveal system info
- [ ] Personal data properly protected

#### Game Integrity
- [ ] Server-side validation prevents cheating
- [ ] Resource generation properly validated
- [ ] Game timers enforced server-side
- [ ] Impossible states prevented

### 3. Performance Assessment

#### Database Performance
- [ ] Queries properly optimized
- [ ] Connection management implemented
- [ ] N+1 queries avoided
- [ ] Indexes properly utilized

#### Game Loop Efficiency
- [ ] Background processing optimized
- [ ] Resource calculations cached
- [ ] Real-time updates throttled
- [ ] Expensive operations batched

#### Scalability
- [ ] Concurrent access handled safely
- [ ] Memory usage reasonable
- [ ] Resource utilization optimized
- [ ] Growth considerations addressed

## Specific Issues Found

### Critical Issues (Must Fix)
<!-- List critical issues that must be resolved before approval -->

1. **Issue**: [Description]
   - **File**: [file:line]
   - **Severity**: Critical
   - **Impact**: [Impact description]
   - **Recommendation**: [How to fix]

### Major Issues (Should Fix)
<!-- List major issues that should be addressed -->

1. **Issue**: [Description]
   - **File**: [file:line]
   - **Severity**: Major
   - **Impact**: [Impact description]
   - **Recommendation**: [How to fix]

### Minor Issues (Nice to Fix)
<!-- List minor issues for future improvement -->

1. **Issue**: [Description]
   - **File**: [file:line]
   - **Severity**: Minor
   - **Impact**: [Impact description]
   - **Recommendation**: [How to fix]

## Positive Feedback

### Well Done
<!-- Acknowledge what was done particularly well -->

1. **Strength**: [Description of good implementation]
   - **Example**: [Specific example of good code]

2. **Strength**: [Description of good implementation]
   - **Example**: [Specific example of good code]

## Questions for Author

### Clarification Needed
<!-- Questions requiring author response -->

1. **Question**: [Specific question about implementation]
   - **Context**: [Why this needs clarification]

2. **Question**: [Specific question about design decision]
   - **Context**: [Why this needs clarification]

## Testing Verification

### Manual Testing Performed
<!-- Document testing steps taken -->

- [ ] **Setup**: Verified development environment setup
- [ ] **Functionality**: Tested core functionality works as expected
- [ ] **Edge Cases**: Tested error conditions and edge cases
- [ ] **Integration**: Verified integration with existing systems

### Test Results
- **Automated Tests**: [Passed/Failed] - [Details]
- **Manual Tests**: [Passed/Failed] - [Details]
- **Integration Tests**: [Passed/Failed] - [Details]

## Documentation Assessment

### Code Documentation
- [ ] Complex algorithms properly documented
- [ ] API changes documented
- [ ] Architecture decisions explained
- [ ] Examples provided for complex logic

### User Documentation
- [ ] Feature documentation updated
- [ ] User-facing changes documented
- [ ] Help text updated if needed

## Architecture Impact

### System Changes
- [ ] Database schema changes documented
- [ ] API contract changes identified
- [ ] Breaking changes noted
- [ ] Migration strategy provided

### Dependencies
- [ ] New dependencies justified
- [ ] Dependency versions appropriate
- [ ] Security implications considered
- [ ] License compatibility verified

## Risk Assessment

### Implementation Risks
- **Complexity**: [Low/Medium/High] - [Rationale]
- **Testability**: [Low/Medium/High] - [Rationale]
- **Maintainability**: [Low/Medium/High] - [Rationale]
- **Performance Impact**: [Low/Medium/High] - [Rationale]

### Business Risks
- **User Experience**: [Low/Medium/High] - [Rationale]
- **Game Balance**: [Low/Medium/High] - [Rationale]
- **Security**: [Low/Medium/High] - [Rationale]
- **Scalability**: [Low/Medium/High] - [Rationale]

## Review Checklist Completion

### Required Areas Reviewed
- [ ] Code quality and style
- [ ] Security implications
- [ ] Performance impact
- [ ] Testing coverage
- [ ] Documentation updates
- [ ] Architecture consistency

### Optional Areas Reviewed
- [ ] Accessibility considerations
- [ ] Internationalization impact
- [ ] Mobile responsiveness
- [ ] Browser compatibility

## Final Recommendation

### Decision Rationale
<!-- Detailed explanation of approval/rejection decision -->

### Next Steps
<!-- Specific actions required from author -->

### Follow-up Requirements
<!-- Any follow-up reviews or testing needed -->

---

## Review Statistics

**Files Reviewed:** [Number] files
**Lines of Code:** [Number] lines
**Review Time:** [Time spent] minutes
**Issues Found:** [Critical/Major/Minor] [counts]

## Reviewer Signature

**Reviewer:** [Name]
**Date:** [Date]
**Approval:** [Approved/Request Changes/Rejected]

---

*This template ensures comprehensive, structured feedback for all code reviews in the Attrition project.*
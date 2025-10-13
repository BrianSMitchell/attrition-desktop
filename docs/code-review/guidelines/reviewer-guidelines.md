# Reviewer Guidelines - Effective Code Review Practices

## Overview

This document provides comprehensive guidelines for conducting effective code reviews in the Attrition project. Effective reviewers balance quality assurance with team collaboration, providing constructive feedback that improves both code quality and developer skills.

## Mindset and Approach

### Review Philosophy

#### Quality-First Approach
- **Comprehensive Coverage**: Review all aspects of code quality, not just obvious issues
- **Context Awareness**: Understand the broader implications of changes
- **Future-Focused**: Consider maintainability and extensibility
- **Collaborative Spirit**: Work with authors to achieve shared goals

#### Constructive Feedback
- **Specific and Actionable**: Provide clear, specific guidance for improvements
- **Educational**: Help authors understand why something matters
- **Balanced**: Include positive feedback along with criticism
- **Respectful**: Focus on code, not personal characteristics

### Review Preparation

#### Before Starting Review
1. **Understand Context**: Read PR description and related issues thoroughly
2. **Check Automated Results**: Review ESLint, TypeScript, and test results
3. **Set Expectations**: Allocate appropriate time based on change complexity
4. **Gather Resources**: Have relevant checklists and documentation ready

#### Assess Change Scope
- **Trivial Changes**: Documentation updates, minor bug fixes (< 10 lines)
- **Minor Changes**: Single feature additions, small refactoring (< 50 lines)
- **Major Changes**: New features, significant refactoring, architectural changes (> 100 lines)
- **Critical Changes**: Security fixes, database migrations, breaking changes

## Review Process

### 1. High-Level Assessment

#### Initial Scan
1. **Overall Structure**: Understand the change's purpose and approach
2. **File Organization**: Check if files are organized appropriately
3. **Dependencies**: Identify new dependencies or breaking changes
4. **Test Coverage**: Assess testing strategy and coverage

#### Architecture Impact
- **System Consistency**: Does change align with established patterns?
- **Service Boundaries**: Are domain boundaries respected?
- **Integration Points**: How does change affect other systems?
- **Scalability**: Consider impact on system performance and growth

### 2. Systematic Code Review

#### Use Structured Checklists
Apply appropriate checklists based on change type:

- **Fowler's Taxonomy**: [fowler-taxonomy-checklist.md](../checklists/fowler-taxonomy-checklist.md)
- **Project-Specific**: [project-specific-checklist.md](../checklists/project-specific-checklist.md)
- **Security**: [security-checklist.md](../checklists/security-checklist.md)
- **Performance**: [performance-checklist.md](../checklists/performance-checklist.md)

#### Review Areas by Priority

##### Critical (Always Review First)
1. **Security Issues**: Authentication, authorization, data protection
2. **Game Logic**: Resource calculations, game balance, state consistency
3. **Service Architecture**: Service extraction, domain separation
4. **Error Handling**: Proper error management and user feedback

##### Important (Review Second)
1. **Code Quality**: Complexity, duplication, naming
2. **Performance**: Database queries, algorithm efficiency
3. **Testing**: Test coverage and quality
4. **Documentation**: Code comments and API documentation

##### Nice-to-Have (Review Last)
1. **Code Style**: Formatting and minor style issues
2. **Comments**: Additional documentation opportunities
3. **Optimization**: Minor performance improvements

### 3. Game-Specific Considerations

#### Real-time Features Review
- **WebSocket Efficiency**: Appropriate update frequency and data size
- **State Synchronization**: Proper handling of concurrent player actions
- **Subscription Management**: Proper cleanup and error handling
- **Data Filtering**: Sensitive data properly filtered from broadcasts

#### Game Balance Review
- **Resource Calculations**: Consistent formulas across services
- **Timer Enforcement**: Server-side validation of game timing
- **Cheat Prevention**: Server-side validation of all game actions
- **Fairness**: Equal treatment of all players

#### Database Integration Review
- **Supabase Patterns**: Proper use of Supabase query methods
- **ID Consistency**: UUID format validation for all entity IDs
- **Query Optimization**: Efficient queries with proper indexing
- **Error Handling**: Consistent error patterns for database failures

## Providing Effective Feedback

### Feedback Structure

#### Use Code Review Template
Follow the structured format in [code-review-template.md](../templates/code-review-template.md):

1. **Overall Assessment**: General impression and recommendation
2. **Positive Feedback**: What was done well
3. **Issues Found**: Specific problems with clear descriptions
4. **Suggestions**: Improvement recommendations
5. **Questions**: Points needing clarification

### Writing Effective Comments

#### Specific and Actionable
```markdown
<!-- ❌ Too vague -->
"Fix this"

<!-- ✅ Specific and actionable -->
"Consider extracting this database query to a separate method in UserService to improve testability and reusability. The method could be called getUserById() and return a User object."
```

#### Educational and Contextual
```markdown
<!-- ❌ Just criticism -->
"This is wrong"

<!-- ✅ Educational with context -->
"This approach creates tight coupling between the controller and database layer. Consider using the established UserManagementService pattern to maintain consistency with other routes and improve testability."
```

#### Balanced and Constructive
```markdown
<!-- ❌ Only negative -->
"Bad approach. Do it differently."

<!-- ✅ Balanced and constructive -->
"Good start on the service extraction! The method organization looks clean. For the database query, consider using the established Supabase pattern with proper error handling to maintain consistency with other services."
```

### Issue Prioritization

#### Critical Issues (Must Fix)
- **Security Vulnerabilities**: Authentication bypass, data exposure
- **Game-Breaking Bugs**: Functionality preventing core gameplay
- **Data Integrity**: Risk of data corruption or loss
- **Performance Degradation**: Significant impact on game responsiveness

#### Major Issues (Should Fix)
- **Code Smells**: Fowler's taxonomy violations
- **Architectural Problems**: Pattern violations
- **Maintainability Issues**: Code difficult to understand or modify
- **Test Coverage Gaps**: Missing tests for critical functionality

#### Minor Issues (Nice to Fix)
- **Code Style**: Inconsistent formatting or naming
- **Documentation**: Missing or unclear comments
- **Optimization Opportunities**: Potential performance improvements

## Common Review Scenarios

### Scenario 1: Complex Refactoring
**Approach:**
1. **Understand Intent**: Clarify the refactoring goals and approach
2. **Verify Patterns**: Ensure refactoring follows established patterns
3. **Check Completeness**: Verify all related changes are included
4. **Test Thoroughly**: Pay extra attention to testing strategy

### Scenario 2: New Feature Development
**Approach:**
1. **Feature Completeness**: Verify all requirements are implemented
2. **Integration Check**: Ensure proper integration with existing systems
3. **Game Balance**: Validate game mechanics and balance implications
4. **User Experience**: Consider user impact and experience

### Scenario 3: Bug Fixes
**Approach:**
1. **Root Cause**: Understand the underlying cause, not just symptoms
2. **Comprehensive Fix**: Ensure fix addresses all related issues
3. **Regression Prevention**: Verify fix doesn't break existing functionality
4. **Test Coverage**: Add tests to prevent future regressions

### Scenario 4: Performance Optimization
**Approach:**
1. **Metrics Validation**: Verify performance improvements are measurable
2. **Trade-off Analysis**: Understand functionality vs performance trade-offs
3. **Scalability Impact**: Consider impact on system growth
4. **Monitoring**: Ensure changes can be monitored in production

## Avoiding Common Pitfalls

### Common Reviewer Mistakes

#### Being Too Nitpicky
- **Problem**: Focusing on minor style issues over important problems
- **Solution**: Prioritize critical issues first, save minor issues for last

#### Missing Context
- **Problem**: Not understanding why a change was made
- **Solution**: Always read PR description and related issues thoroughly

#### Inconsistent Standards
- **Problem**: Applying different standards to different authors
- **Solution**: Apply consistent criteria based on established checklists

#### Personal Preference vs Best Practice
- **Problem**: Enforcing personal coding style over project standards
- **Solution**: Reference established patterns and project conventions

### Handling Difficult Situations

#### Dealing with Resistance
1. **Stay Professional**: Focus on code quality, not personal criticism
2. **Explain Reasoning**: Clearly articulate why something matters
3. **Offer Solutions**: Provide specific suggestions for improvement
4. **Escalate Appropriately**: Know when to involve technical leads

#### Managing Time Constraints
1. **Scope Reviews**: Focus on most critical issues when time is limited
2. **Batch Reviews**: Group related changes for efficiency
3. **Document Incomplete Reviews**: Note areas not fully reviewed
4. **Follow Up**: Schedule follow-up reviews for complex changes

## Review Workflow Optimization

### Efficient Review Techniques

#### Scan for Patterns
1. **Common Issues**: Look for frequent problem patterns first
2. **Architectural Violations**: Check for pattern deviations early
3. **Critical Paths**: Focus on most important functionality first
4. **Integration Points**: Verify how changes affect other systems

#### Use Tools Effectively
1. **IDE Features**: Use code navigation and search effectively
2. **Git Tools**: Understand change scope using git diff and blame
3. **Automated Results**: Trust but verify automated check results
4. **Documentation**: Reference relevant docs and standards

### Time Management

#### Review Time Allocation
- **Simple Changes**: 15-30 minutes for straightforward bug fixes
- **Feature Changes**: 30-60 minutes for new feature implementation
- **Complex Changes**: 60+ minutes for architectural or performance changes
- **Critical Changes**: Allocate sufficient time for security and game logic reviews

#### Balancing Thoroughness and Speed
1. **Prioritize Critical Issues**: Focus on security and functionality first
2. **Use Checklists**: Systematic approach ensures comprehensive coverage
3. **Document Limitations**: Note any areas not fully reviewed due to time
4. **Schedule Follow-ups**: Plan additional reviews for complex changes

## Continuous Improvement

### Learning from Reviews

#### Track Common Issues
- **Pattern Recognition**: Identify frequently occurring problems
- **Root Cause Analysis**: Understand why issues occur repeatedly
- **Preventive Action**: Develop strategies to prevent common issues
- **Training Opportunities**: Use common issues for team learning

#### Improve Review Process
1. **Regular Feedback**: Gather input from authors and reviewers
2. **Process Updates**: Refine checklists and guidelines based on experience
3. **Tool Enhancement**: Improve automated detection capabilities
4. **Knowledge Sharing**: Share review insights with team

### Reviewer Development

#### Building Expertise
1. **Domain Knowledge**: Deep understanding of game systems and architecture
2. **Review Skills**: Practice and feedback on review effectiveness
3. **Tool Proficiency**: Master development and review tools
4. **Standards Mastery**: Deep knowledge of project patterns and conventions

#### Peer Learning
1. **Pair Reviewing**: Review complex changes with other experienced reviewers
2. **Mentorship**: Help junior developers develop review skills
3. **Cross-Training**: Review code outside primary area of expertise
4. **Knowledge Sharing**: Share insights and learnings from reviews

## Quality Metrics

### Review Effectiveness Metrics
- **Issue Detection Rate**: Percentage of issues found in manual vs automated review
- **False Positive Rate**: Reviews that pass manual review but fail in production
- **Review Efficiency**: Time spent vs issues found
- **Author Satisfaction**: Feedback on review quality and helpfulness

### Personal Improvement Goals
- **Thoroughness**: Ensure comprehensive coverage of review areas
- **Timeliness**: Complete reviews within reasonable timeframes
- **Helpfulness**: Provide actionable feedback that improves code quality
- **Learning**: Continuously improve understanding of codebase and patterns

## Integration with Team Workflow

### Communication Patterns

#### With Authors
1. **Clear Expectations**: Set realistic timelines and requirements
2. **Regular Updates**: Keep authors informed of review progress
3. **Constructive Dialogue**: Maintain open communication throughout review
4. **Respectful Tone**: Focus on code quality, not personal criticism

#### With Team Leads
1. **Escalation Protocol**: Know when to involve technical leadership
2. **Process Issues**: Report systematic problems affecting multiple reviews
3. **Resource Needs**: Request additional tools or training when needed
4. **Team Learning**: Share insights that benefit entire team

### Review Workflow Integration

#### GitHub Integration
1. **PR Reviews**: Use GitHub's review features effectively
2. **Comments**: Place comments on specific lines with clear context
3. **Suggestions**: Use GitHub suggestions for simple fixes
4. **Approval Process**: Follow established approval workflows

#### CI/CD Integration
1. **Automated Checks**: Trust but verify automated quality gate results
2. **Test Results**: Review test failures and coverage reports
3. **Performance Data**: Analyze performance regression data
4. **Security Scans**: Review security vulnerability reports

## Special Review Situations

### Emergency Reviews
For urgent fixes requiring immediate attention:

1. **Focus on Critical Issues**: Prioritize security and functionality
2. **Quick Turnaround**: Complete review within hours, not days
3. **Document Limitations**: Note areas not fully reviewed
4. **Follow-up Plan**: Schedule comprehensive review post-deployment

### Architectural Reviews
For significant architectural changes:

1. **Deep Analysis**: Thoroughly understand architectural implications
2. **Pattern Compliance**: Verify adherence to established patterns
3. **Future Impact**: Consider long-term maintainability implications
4. **Migration Strategy**: Plan for transitioning to new architecture

### Security Reviews
For changes with security implications:

1. **Security-First**: Prioritize security considerations above all else
2. **Threat Modeling**: Consider potential attack vectors
3. **Compliance Check**: Verify compliance with security standards
4. **Testing Strategy**: Ensure security testing is comprehensive

## Documentation and Knowledge Sharing

### Review Documentation
1. **Decision Records**: Document significant review decisions and rationale
2. **Pattern Documentation**: Update patterns and standards based on review findings
3. **Learning Resources**: Create resources based on common review findings
4. **Process Documentation**: Keep review guidelines current and accurate

### Team Knowledge Transfer
1. **Review Patterns**: Share common issues and solutions with team
2. **Best Practices**: Document and promote effective patterns discovered in reviews
3. **Anti-Patterns**: Document problematic patterns to avoid in future
4. **Domain Knowledge**: Capture and share understanding of game systems

---

## Review Checklist for Reviewers

### Before Review
- [ ] Understand change purpose and context
- [ ] Review automated check results
- [ ] Select appropriate checklists
- [ ] Allocate sufficient time

### During Review
- [ ] Apply checklists systematically
- [ ] Document issues with specific examples
- [ ] Assess issue severity and impact
- [ ] Consider game-specific implications

### After Review
- [ ] Ensure author understands feedback
- [ ] Verify testing requirements
- [ ] Document follow-up actions
- [ ] Update personal knowledge

**Last Updated**: 2025-10-10
**Version**: 1.0.0
**Status**: Active
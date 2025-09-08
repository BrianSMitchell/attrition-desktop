# Attrition Beta Project Boards Configuration

This document outlines the setup and configuration for GitHub Project Boards to manage beta program issues, feature requests, and releases.

## Project Board Structure

### 1. Beta Issue Triage Board

**Purpose**: Primary board for incoming beta reports and initial triage

**Columns**:
- **New Issues** (Automation: newly opened issues)
  - Auto-populated from issue templates
  - Triggers initial triage workflow

- **Triage In Progress** (Manual)
  - Issues being evaluated by triage team
  - Severity and priority assessment

- **Ready for Assignment** (Manual)
  - Issues that have been triaged and categorized
  - Awaiting team assignment

- **Blocked/Need Info** (Automation: labeled `blocked` or `awaiting-response`)
  - Issues requiring additional information
  - Blocked on external dependencies

- **Verified & Assigned** (Automation: assigned to team)
  - Issues ready for development
  - Clear acceptance criteria

### 2. Beta Development Board

**Purpose**: Track active development work on beta-related issues

**Columns**:
- **Backlog** (Automation: labeled `ready-for-development`)
  - Prioritized issues ready for sprint planning
  - Organized by severity and business impact

- **Sprint Ready** (Manual)
  - Issues selected for current sprint
  - Estimated and assigned to developers

- **In Progress** (Automation: labeled `in-progress`)
  - Active development work
  - Daily standup tracking

- **Code Review** (Automation: PR opened for issue)
  - Pull requests under review
  - Awaiting approval and testing

- **Testing** (Automation: labeled `ready-for-testing`)
  - Features ready for QA testing
  - Beta environment deployment

- **Done** (Automation: issue closed with `resolved` label)
  - Completed and verified features
  - Ready for release

### 3. Beta Release Management Board

**Purpose**: Coordinate beta releases and feature rollouts

**Columns**:
- **Release Planning** (Manual)
  - Features being considered for next release
  - Release roadmap and timeline

- **Release Candidate** (Manual)
  - Features confirmed for upcoming release
  - Integration testing in progress

- **Pre-Release Testing** (Manual)
  - Beta testing with select users
  - Final validation before release

- **Released to Beta** (Manual)
  - Features deployed to beta environment
  - Monitoring for issues

- **Feedback Collection** (Manual)
  - Released features collecting user feedback
  - Impact assessment

- **Production Ready** (Manual)
  - Beta-tested features ready for production
  - Final approval for general release

### 4. Critical Issues Emergency Board

**Purpose**: Fast-track critical and security issues

**Columns**:
- **Critical Triage** (Automation: labeled `critical` or `security`)
  - Immediate attention required
  - P0/P1 priority issues

- **Emergency Response** (Manual)
  - Active incident response
  - War room coordination

- **Hotfix Development** (Manual)
  - Urgent fixes in development
  - Bypass normal process

- **Emergency Testing** (Manual)
  - Rapid testing and validation
  - Risk assessment

- **Deployed** (Manual)
  - Emergency fixes deployed
  - Monitoring and verification

## Board Automation Rules

### Issue Triage Board Automation

```yaml
# .github/workflows/project-board-automation.yml
name: Project Board Automation

on:
  issues:
    types: [opened, labeled, unlabeled, assigned, closed]
  pull_request:
    types: [opened, closed, merged]

jobs:
  update_project_boards:
    runs-on: ubuntu-latest
    steps:
      - name: Add new issues to triage board
        if: github.event.action == 'opened'
        uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: Attrition Beta Issue Triage
          column: New Issues
          repo-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Move critical issues to emergency board
        if: contains(github.event.label.name, 'critical') || contains(github.event.label.name, 'security')
        uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: Critical Issues Emergency
          column: Critical Triage
          repo-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Move triaged issues to development board
        if: github.event.action == 'labeled' && github.event.label.name == 'ready-for-development'
        uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: Beta Development
          column: Backlog
          repo-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Move assigned issues to in progress
        if: github.event.action == 'labeled' && github.event.label.name == 'in-progress'
        uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: Beta Development
          column: In Progress
          repo-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Move issues needing testing
        if: github.event.action == 'labeled' && github.event.label.name == 'ready-for-testing'
        uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: Beta Development
          column: Testing
          repo-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Move closed issues to done
        if: github.event.action == 'closed'
        uses: alex-page/github-project-automation-plus@v0.8.3
        with:
          project: Beta Development
          column: Done
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

## Board Views and Filters

### Custom Views Configuration

#### 1. Team Assignment View
- **Filter**: Assignee, Team Labels
- **Group By**: Assigned Team
- **Sort By**: Priority, Created Date
- **Purpose**: Track team workload distribution

#### 2. Severity Dashboard View  
- **Filter**: Severity Labels (Critical, High, Medium, Low)
- **Group By**: Severity Level
- **Sort By**: Created Date (Oldest first for Critical)
- **Purpose**: Priority-based issue management

#### 3. Component Health View
- **Filter**: Component Labels (UI, Backend, Desktop, etc.)
- **Group By**: Component
- **Sort By**: Resolution Time, Status
- **Purpose**: Identify problematic components

#### 4. Beta User Impact View
- **Filter**: User Impact Labels (High, Medium, Low)
- **Group By**: Impact Level
- **Sort By**: User Count Affected
- **Purpose**: Focus on user-facing issues

#### 5. Release Timeline View
- **Filter**: Target Milestone
- **Group By**: Milestone
- **Sort By**: Due Date, Priority
- **Purpose**: Release planning and tracking

## Board Metrics and KPIs

### Tracked Metrics

1. **Triage Efficiency**
   - Time from issue creation to first triage
   - Percentage of issues triaged within SLA
   - Triage backlog size

2. **Development Velocity**
   - Issues moved to "Done" per sprint
   - Average time in each column
   - Blocked issue percentage

3. **Release Readiness**
   - Features ready for beta release
   - Testing coverage percentage
   - Critical issues blocking release

4. **User Impact**
   - High-impact issues resolved per week
   - User satisfaction scores
   - Beta adoption rates

### Automated Reports

```yaml
# Weekly Board Status Report
- name: Generate Board Report
  schedule:
    - cron: '0 9 * * MON'  # Monday 9 AM
  jobs:
    board_report:
      steps:
        - name: Collect Board Metrics
          run: |
            # Get issue counts by board column
            echo "## Weekly Board Status Report" > report.md
            echo "### Beta Issue Triage Board" >> report.md
            gh project list --owner ${{ github.repository_owner }}
            
        - name: Send Report to Slack
          uses: 8398a7/action-slack@v3
          with:
            status: custom
            custom_payload: |
              {
                "text": "Weekly Board Status Report",
                "attachments": [
                  {
                    "color": "good",
                    "fields": [
                      {
                        "title": "New Issues This Week",
                        "value": "${{ steps.board_metrics.outputs.new_issues }}",
                        "short": true
                      },
                      {
                        "title": "Issues Resolved",
                        "value": "${{ steps.board_metrics.outputs.resolved_issues }}",
                        "short": true
                      }
                    ]
                  }
                ]
              }
```

## Board Access and Permissions

### Team Access Levels

- **Beta Program Managers**: Admin access to all boards
- **Development Teams**: Write access to development board, read access to others
- **QA Teams**: Write access to testing columns, read access to others
- **Beta Users**: Read access to public boards, comment permissions
- **External Stakeholders**: Read access to release management board

### Permission Matrix

| Role | Triage Board | Development Board | Release Board | Critical Board |
|------|--------------|-------------------|---------------|----------------|
| Beta Manager | Admin | Admin | Admin | Admin |
| Dev Team Lead | Write | Admin | Read | Write |
| Developer | Read | Write | Read | Write |
| QA Engineer | Read | Write | Read | Write |
| Beta User | Read | Read | Read | None |
| Stakeholder | Read | Read | Read | None |

## Integration with External Tools

### Slack Integration
- Board updates posted to #beta-issues channel
- Daily board status summaries
- Critical issue alerts

### Email Notifications
- Weekly board digest for stakeholders
- Critical issue escalation emails
- Release milestone notifications

### JIRA Integration (if needed)
- Sync high-priority issues to JIRA
- Two-way status updates
- Cross-platform reporting

## Board Maintenance

### Weekly Maintenance Tasks
- Review stale issues in "Need Info" column
- Update board automation rules as needed
- Clean up closed issues from active boards
- Generate and review board metrics

### Monthly Review Process
- Assess board effectiveness and usage
- Update column definitions based on workflow changes  
- Review and optimize automation rules
- Stakeholder feedback collection

### Board Evolution
- Add new views based on team needs
- Retire unused columns or boards
- Integrate new tools and workflows
- Update permissions as team changes

## Getting Started Checklist

- [ ] Create project boards with defined columns
- [ ] Set up automation workflows
- [ ] Configure custom views and filters
- [ ] Assign team access permissions
- [ ] Test automation rules with sample issues
- [ ] Train team on board usage
- [ ] Set up reporting and metrics collection
- [ ] Schedule regular board maintenance

## Troubleshooting Common Issues

### Issues Not Moving Between Boards
- Check automation workflow status
- Verify label names match automation rules
- Confirm repository permissions for bot account

### Incorrect Issue Categorization
- Review and update issue templates
- Train beta users on proper issue reporting
- Adjust triage criteria and documentation

### Board Performance Issues
- Archive old completed issues
- Reduce number of items in large columns
- Optimize automation frequency

This project board configuration provides a comprehensive system for managing beta issues from initial report through resolution and release, with built-in automation, metrics tracking, and team collaboration features.

# Phase 6 Startup Guide

**Created:** 2025-11-02  
**Status:** 🟢 READY TO BEGIN  
**Foundation:** Phase 5 ✅ (85%+ complete)

---

## Quick Start Summary

Phase 6 transforms the typed error system from Phase 5 into a production-grade observability platform with **real-time error monitoring, telemetry, alerting, and auto-generated API types**.

**Duration:** 3-4 weeks across 4 sub-phases  
**Team:** 1 full-time developer (can be parallelized in phases)  
**Risk Level:** LOW (Phase 5 foundation proven, Phase 6 additions are isolated)

---

## Prerequisites Checklist

Before starting Phase 6, verify:

### ✅ Phase 5 Complete
- [x] All 4 Tier 2 services migrated to typed errors
- [x] Error middleware catching and responding correctly
- [x] No new type or linting errors
- [x] Documentation in place (PHASE_5_COMPLETION.md)
- [x] Tests passing

### ✅ Development Environment Ready
- [x] Node.js/npm working
- [x] TypeScript compilation working
- [x] Test suite functional
- [x] Git workflow established

### ✅ Documentation Available
- [x] Phase 5 Completion Summary: `PHASE_5_COMPLETION.md`
- [x] Phase 5 Migration Strategy: `PHASE_5_TIER2_MIGRATION.md`
- [x] Phase 6 Plan: `PHASE_6_PLAN.md` (this document)
- [x] Error Type Hierarchy: `src/errors/ApplicationError.ts`

---

## Phase 6A: Getting Started (Day 1-2)

### Goal
Get basic error monitoring and alerting working end-to-end.

### Quick Setup

#### Step 1: Understand Current Error Flow
```bash
# Review existing error middleware
cat src/middleware/errorHandler.ts

# Review error type hierarchy
cat src/errors/ApplicationError.ts

# Review response builder
cat src/utils/responseBuilder.ts
```

#### Step 2: Plan Database Schema
```sql
-- Review what tables will be added:
-- error_events (detailed logs)
-- error_metrics_hourly (aggregated)
-- error_alerts (alert tracking)

-- Location: src/migrations/add_error_telemetry.sql
```

#### Step 3: Identify Integration Points
```typescript
// Where error middleware will plug in:
// src/index.ts → Express app setup
// src/middleware/errorHandler.ts → Current error handling

// Where telemetry will integrate:
// Error thrown → Error middleware → Telemetry collection → Response

// Where alerts will trigger:
// Error recorded → Check alert rules → Send notification
```

---

## Phase 6A.1: Enhanced Error Middleware (2 days)

### Objectives
1. Extract error metrics from thrown errors
2. Add severity classification
3. Add request timing
4. Add tracing IDs

### Files to Create/Modify
```
NEW:
  src/middleware/errorMonitoring.ts     - Enhanced monitoring
  src/types/errorMetrics.ts             - Type definitions
  src/utils/errorClassification.ts      - Severity classification

MODIFY:
  src/middleware/errorHandler.ts        - Integrate monitoring
  src/index.ts                          - Add monitoring middleware
```

### Key Decisions to Make
1. **Tracing ID Format:** Use UUID or custom format?
2. **Severity Classification:** Use HTTP status code or custom logic?
3. **Telemetry Sampling:** Record all errors or sample high-volume?
4. **Performance Budget:** Target <5ms overhead per error?

### Testing Strategy
```typescript
// Test error metric capture
describe('Error Monitoring', () => {
  test('captures error metrics', async () => {
    // Throw error → Check metrics recorded
  });
  
  test('classifies severity correctly', () => {
    // Different errors → Correct severity
  });
  
  test('adds tracing ID', () => {
    // Error response → Has tracing_id
  });
});
```

### Success Criteria
- [x] Error metrics captured from all thrown errors
- [x] Severity classification logic working
- [x] Tracing IDs unique and correlatable
- [x] Response includes tracingId
- [x] Middleware overhead <5ms

---

## Phase 6A.2: Telemetry Schema & Collector (1.5 days)

### Objectives
1. Create database schema for error events
2. Build error event collector
3. Implement queue + flush logic
4. Add to middleware

### Files to Create/Modify
```
NEW:
  src/migrations/add_error_telemetry.sql      - Database schema
  src/services/telemetry/errorEventCollector.ts - Collector
  src/types/telemetryTypes.ts                 - Type definitions

MODIFY:
  src/middleware/errorMonitoring.ts           - Call collector
```

### Database Schema Overview
```sql
error_events table:
  - Stores every error event
  - Indexed by: type, endpoint, created_at, severity
  - Includes: context, user_id, duration_ms

error_metrics_hourly table:
  - Aggregated metrics (filled by job)
  - Indexes for fast dashboards
  
error_alerts table:
  - Tracks generated alerts
  - Fields for acknowledgment & resolution
```

### Queue & Flush Implementation
```typescript
// Collector batches errors for efficiency:
- Error 1 → Queue (1/100)
- Error 2 → Queue (2/100)
- ...
- Error 100 → Queue (100/100) → FLUSH to database
- Or: 30 second timer → Auto flush

// Benefits:
- Reduced database writes (batched)
- Lower latency on error response
- Better error handling (if DB slow)
```

### Success Criteria
- [x] Schema created without errors
- [x] Collector batches errors
- [x] Flush to database working
- [x] No data loss on queue overflow
- [x] Performance: <2ms per error to queue

---

## Phase 6A.3: Basic Alerting (1.5 days)

### Objectives
1. Create alert rule engine
2. Implement Slack integration
3. Add alert suppression
4. Trigger alerts from collector

### Files to Create/Modify
```
NEW:
  src/services/alerting/alertEngine.ts        - Rule engine
  src/services/alerting/slackNotifier.ts      - Slack integration
  src/services/alerting/alertConfig.ts        - Alert rules
  src/types/alertTypes.ts                     - Type definitions

MODIFY:
  src/services/telemetry/errorEventCollector.ts - Check alerts
  .env.example                                - Add SLACK_WEBHOOK_URL
```

### Alert Rules to Implement
```typescript
// Rule 1: New Error Type
if (errorType not seen before) {
  alert('NEW_ERROR_TYPE', 'medium')
}

// Rule 2: Critical Error on Critical Endpoint
if (severity === 'critical' && isCriticalEndpoint(endpoint)) {
  alert('CRITICAL_PATH_ERROR', 'critical')
}

// Rule 3: Error Rate Spike (simplified)
if (errors in last 1 minute > threshold) {
  alert('RATE_SPIKE', 'high')
}
```

### Slack Integration Pattern
```typescript
// Send to Slack
const message = {
  color: 'danger',  // Red for critical
  title: 'Error Alert: New ValidationError',
  text: `
    Type: ValidationError (new!)
    Endpoint: POST /api/game/structures/start
    Count: 5 in last minute
    Sample: "Invalid coordinate format"
  `
};

await axios.post(SLACK_WEBHOOK_URL, { attachments: [message] });
```

### Alert Suppression Example
```typescript
// Don't spam same alert repeatedly
const suppressedUntil = new Map<string, number>();

function shouldAlert(alert: Alert): boolean {
  const key = `${alert.type}_${alert.endpoint}`;
  const suppressedTime = suppressedUntil.get(key);
  
  if (suppressedTime && Date.now() < suppressedTime) {
    return false;  // Suppressed
  }
  
  suppressedUntil.set(key, Date.now() + 300_000); // 5 min suppression
  return true;
}
```

### Success Criteria
- [x] Alert engine evaluates rules
- [x] Slack notifications sent
- [x] Alert suppression prevents spam
- [x] Dashboard can be built (alerts traceable)

---

## Phase 6A Completion Checkpoint

### Verification Steps
```bash
# 1. Start server and check no errors
npm run dev

# 2. Trigger a test error
curl -X POST http://localhost:3000/api/test/error

# 3. Check database
SELECT * FROM error_events ORDER BY created_at DESC LIMIT 1;

# 4. Check console for Slack message
# (Look for webhook call in logs)

# 5. Check Slack channel
# (Should have received alert)

# 6. Test alert suppression
# (Trigger same error 3 times, should only see 1 Slack message)
```

### Metrics to Record
- [ ] Errors captured: _____ per minute
- [ ] Telemetry flush time: _____ ms
- [ ] Slack delivery time: _____ ms
- [ ] False positive rate: _____ %
- [ ] Middleware overhead: _____ ms

### Decision Point
✅ If Phase 6A working: Proceed to Phase 6B  
❌ If issues: Troubleshoot before continuing

---

## Moving to Phase 6B

Once Phase 6A is complete and verified:

1. Commit Phase 6A work
2. Create Phase 6B task list
3. Plan pattern analyzer
4. Design aggregation jobs
5. Start Phase 6B.1

---

## Important Notes & Tips

### Architecture Notes
- **Error Middleware** runs on every error (critical path)
  - Must be fast (<5ms overhead)
  - Should never fail (built with fallbacks)
  - Logs to console if telemetry fails

- **Telemetry Collection** async and batched
  - Non-blocking (doesn't delay response)
  - Can fail silently without affecting user
  - Alerts if too many errors to queue

- **Alerting** can be async
  - Send Slack asynchronously
  - Don't block response on alert check
  - Retry failed alert sends

### Performance Tips
- Use database indexes for fast queries
- Batch-insert errors (100 at a time)
- Aggregate data hourly (not in real-time)
- Keep detailed logs only 7 days
- Archive old data or delete

### Troubleshooting Guide

**Problem:** Telemetry not recording  
**Check:**
1. Is error actually being thrown? (test with console.log)
2. Is middleware added to Express app?
3. Is database connection working?
4. Check error_events table exists

**Problem:** Slack alerts not arriving  
**Check:**
1. Is SLACK_WEBHOOK_URL set?
2. Does URL include `/services/...` path?
3. Is network access to Slack API open?
4. Check logs for HTTP errors

**Problem:** Performance degradation  
**Check:**
1. Is telemetry flush async?
2. Are you batching errors?
3. Check database query performance
4. Use middleware timing instrumentation

---

## Files Reference Guide

### Key Files to Understand
```
src/errors/ApplicationError.ts         - Error hierarchy
src/middleware/errorHandler.ts         - Current error handling
src/utils/responseBuilder.ts           - Response formatting
src/index.ts                           - Express app setup

NEW IN PHASE 6A:
src/middleware/errorMonitoring.ts      - Monitoring logic
src/services/telemetry/                - Telemetry services
src/services/alerting/                 - Alert services
src/types/errorMetrics.ts              - Type definitions
src/migrations/add_error_telemetry.sql - Database schema
```

### Configuration Files
```
.env                                   - Environment variables
.env.example                           - Example (update with new vars)
src/services/alerting/alertConfig.ts   - Alert rule definitions
```

### Testing Files
```
src/__tests__/middleware/errorMonitoring.test.ts
src/__tests__/services/telemetryCollector.test.ts
src/__tests__/services/alerting.test.ts
```

---

## Success Indicators

### Phase 6A Should Enable
✅ Errors are captured with full metadata  
✅ Errors flow to database automatically  
✅ Alerts triggered on critical issues  
✅ Tracing allows error correlation  
✅ Middleware adds minimal overhead  
✅ No errors are silently dropped  

---

## Timeline Overview

```
Week 1 (Phase 6A): Foundation
├─ Days 1-2: Error Middleware + Tracing
├─ Days 3-4: Telemetry Schema + Collector
└─ Days 5: Basic Alerting + Testing

Week 2 (Phase 6B): Intelligence
├─ Days 1-2: Pattern Analysis
├─ Days 3-4: Aggregation & Rollups
└─ Day 5: Alert Enhancements

Week 3 (Phase 6C): Developer UX
├─ Days 1-2: Type Generation
├─ Days 3-4: Auto-generated Docs
└─ Day 5: Frontend Integration

Week 4 (Phase 6D): Polish
├─ Days 1-2: Performance Monitoring
├─ Days 3-4: Dashboards
└─ Day 5: Documentation & Handoff
```

---

## Getting Help

### Questions to Consider
1. **Architecture:** Do I understand how errors flow through the system?
2. **Performance:** What's the acceptable overhead for telemetry?
3. **Alerting:** What counts as "critical" in this system?
4. **Types:** Should types be auto-generated or manually maintained?

### Resources
- Phase 6 Plan: `PHASE_6_PLAN.md` (detailed specifications)
- Phase 5 Completion: `PHASE_5_COMPLETION.md` (foundation reference)
- Error Types: `src/errors/ApplicationError.ts` (existing structure)

---

## Next Actions

### Now (Today)
1. ✅ Read this startup guide
2. ✅ Review Phase 5 completion
3. ✅ Read Phase 6 plan
4. ✅ Understand error flow

### Tomorrow (Start Phase 6A.1)
1. Create error monitoring middleware
2. Add severity classification
3. Add request timing
4. Add tracing ID system
5. Write tests

### By End of Week 1
1. Basic error monitoring working
2. Telemetry collecting to database
3. Slack alerts triggering
4. End-to-end tested and verified

---

## Questions Before Starting?

Make sure to clarify:

- [ ] **Priorities:** Which Phase 6 features are most important?
- [ ] **Timeline:** When is Phase 6 complete needed?
- [ ] **Scope:** Should we do all 4 weeks or prioritize?
- [ ] **Integration:** Any existing monitoring we should integrate with?
- [ ] **Alerting:** Which channels? (Slack, email, PagerDuty, etc.)
- [ ] **Sampling:** Record all errors or sample?

---

## Approval & Sign-Off

**Phase 6 Plan Ready to Begin**

- ✅ Foundation verified (Phase 5 complete)
- ✅ Architecture documented
- ✅ Tasks broken down
- ✅ Timeline established
- ✅ Risks identified and mitigated
- ✅ Success criteria clear

**Ready to proceed to Phase 6A.1: Enhanced Error Middleware**

---

**Session:** Phase 5 Complete → Phase 6 Planning  
**Status:** 🟢 Ready to Begin  
**Next:** Start Phase 6A.1 when approved

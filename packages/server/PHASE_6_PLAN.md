# Phase 6: Error Monitoring, Telemetry & API Client Types

**Status:** 🟢 PLANNING  
**Duration:** 3-4 weeks (estimate)  
**Foundation:** Phase 5 (85%+ complete) ✅  
**Priority Level:** High (production readiness)

---

## Executive Summary

Building on the solid typed error foundation established in Phase 5, Phase 6 advances the type system to production-grade with **error monitoring, telemetry collection, and API client type generation**. This phase transforms the error hierarchy from a structuring mechanism into an operational tool for understanding system health.

---

## Goals & Success Criteria

### 🎯 Primary Goals

1. **Error Monitoring & Alerting** - Detect and track errors in real-time
2. **Telemetry & Observability** - Collect metrics on error frequency, patterns, resolution times
3. **API Client Types** - Generate TypeScript types from service responses for frontend
4. **Error Documentation** - Auto-generate API docs from error types
5. **Performance Baseline** - Establish metrics for error handling overhead

### ✅ Success Criteria

- [ ] Error monitoring middleware deployed and operational
- [ ] Telemetry collection showing error patterns and trends
- [ ] Alerting system notifies on critical error scenarios
- [ ] API client types generated and published
- [ ] Documentation auto-generated from error types
- [ ] <5ms overhead per error in monitoring stack
- [ ] 95%+ error capture rate (no silent failures)
- [ ] Zero performance regression in services

---

## Phase 6 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Route Handlers / Services                 │
│  (Throw typed errors: NotFoundError, ValidationError, etc)   │
└──────────────────────┬──────────────────────────────────────┘
                       │ throws
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              Error Middleware Stack                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Error Capture & Classification                   │   │
│  │    - Extract type from error class                  │   │
│  │    - Identify severity level                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 2. Telemetry Collection                            │   │
│  │    - Record error timing, context                  │   │
│  │    - Add user/request metadata                     │   │
│  │    - Track error patterns                          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 3. Alert Generation                                │   │
│  │    - Detect critical patterns                      │   │
│  │    - Trigger notifications                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 4. Response Formatting                             │   │
│  │    - Use typed response builders                   │   │
│  │    - Include error tracking ID                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │ returns JSON with statusCode
         ↓
    ┌─────────────────┐
    │  HTTP Response  │
    └─────────────────┘
```

---

## Detailed Feature Breakdown

### Feature 1: Enhanced Error Middleware

**Current State:** Basic error middleware that catches throws and returns responses

**Phase 6 Enhancement:**
```typescript
// src/middleware/errorMonitoring.ts
interface ErrorMetrics {
  type: string;              // NotFoundError, ValidationError, etc.
  severity: 'low' | 'medium' | 'high' | 'critical';
  code: string;              // Error code (e.g., 'NOT_FOUND_USER')
  timestamp: number;
  userId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  durationMs: number;        // How long request took
  context: Record<string, any>;
  tracingId: string;         // For log correlation
}

// Middleware function
export function errorMonitoringMiddleware(
  err: ApplicationError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 1. Capture error metrics
  const metrics = captureErrorMetrics(err, req);
  
  // 2. Send to telemetry
  await telemetryCollector.recordError(metrics);
  
  // 3. Check alert thresholds
  if (shouldAlert(metrics)) {
    await alerting.notify(metrics);
  }
  
  // 4. Return response
  res.status(metrics.statusCode).json(
    createErrorResponse(err, metrics.tracingId)
  );
}
```

**Implementation Tasks:**
1. Create error metric capture function
2. Implement severity classification logic
3. Add request timing instrumentation
4. Create tracing ID system (for log correlation)
5. Integrate with existing error middleware

**Deliverables:**
- `src/middleware/errorMonitoring.ts` - Enhanced middleware
- `src/types/errorMetrics.ts` - Type definitions
- `src/utils/errorClassification.ts` - Severity classification logic

---

### Feature 2: Telemetry Collection System

**Purpose:** Collect, store, and analyze error patterns

**Components:**

#### 2.1 Error Event Collector
```typescript
// src/services/telemetry/errorEventCollector.ts
export class ErrorEventCollector {
  // Store error events for aggregation
  private queue: ErrorMetrics[] = [];
  private flushInterval = 30_000; // 30 seconds
  
  async recordError(metrics: ErrorMetrics): Promise<void> {
    this.queue.push(metrics);
    if (this.queue.length >= 100) {
      await this.flush();
    }
  }
  
  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, 100);
    await supabase.from('error_events').insert(batch);
  }
}
```

#### 2.2 Error Pattern Analyzer
```typescript
// src/services/telemetry/errorPatternAnalyzer.ts
export class ErrorPatternAnalyzer {
  // Detect patterns like cascading failures, rate spikes
  
  async detectAnomalies(
    timeWindow: number = 300_000 // 5 minutes
  ): Promise<ErrorAnomaly[]> {
    const recentErrors = await this.getRecentErrors(timeWindow);
    const patterns = this.analyzePatterns(recentErrors);
    return patterns.filter(p => p.isAnomalous);
  }
  
  private analyzePatterns(errors: ErrorMetrics[]): ErrorAnomaly[] {
    // 1. Count errors by type per endpoint
    // 2. Detect rate spikes (> 2x baseline)
    // 3. Detect cascading failures (same error across endpoints)
    // 4. Track error resolution time
  }
}
```

#### 2.3 Database Schema for Telemetry
```sql
-- src/migrations/add_error_telemetry.sql

CREATE TABLE error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,           -- NotFoundError, ValidationError, etc.
  code VARCHAR(100) NOT NULL,          -- Error code
  severity VARCHAR(20) NOT NULL,       -- low, medium, high, critical
  status_code INT NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  user_id UUID,
  duration_ms INT,
  context JSONB,
  tracing_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_type_created (type, created_at),
  INDEX idx_endpoint_created (endpoint, created_at),
  INDEX idx_severity (severity)
);

CREATE TABLE error_metrics_hourly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hour_start TIMESTAMP NOT NULL,
  error_type VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  count INT DEFAULT 1,
  avg_duration_ms FLOAT,
  status_code INT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (hour_start, error_type, endpoint, status_code)
);

CREATE TABLE error_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,         -- RATE_SPIKE, CASCADING_FAILURE, etc.
  severity VARCHAR(20) NOT NULL,
  message TEXT,
  affected_endpoints TEXT[],
  error_types TEXT[],
  metrics JSONB,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Implementation Tasks:**
1. Create error event table and telemetry schema
2. Implement error event collector
3. Create pattern analyzer
4. Add database aggregation jobs (hourly rollups)
5. Create telemetry service orchestrator

**Deliverables:**
- `src/services/telemetry/` - Telemetry service directory
- Migration file for schema
- Aggregation jobs configuration

---

### Feature 3: Alerting System

**Purpose:** Notify about critical error patterns in real-time

**Alert Types:**
```typescript
enum AlertType {
  RATE_SPIKE = 'RATE_SPIKE',                    // Error rate > 2x baseline
  CASCADING_FAILURE = 'CASCADING_FAILURE',      // Same error on multiple endpoints
  NEW_ERROR_TYPE = 'NEW_ERROR_TYPE',            // Unseen error type
  CRITICAL_PATH_ERROR = 'CRITICAL_PATH_ERROR',  // Error on critical endpoint
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',  // Too many errors of one type
  ERROR_RESOLUTION_SLOW = 'ERROR_RESOLUTION_SLOW' // Errors not being resolved
}
```

**Alert Channels:**
```typescript
interface AlertingConfig {
  slack?: {
    webhookUrl: string;
    channel: string;
    mentionOnCritical?: string[];
  };
  email?: {
    recipients: string[];
    severityThreshold: 'high' | 'critical';
  };
  pagerduty?: {
    integrationKey: string;
    minimumSeverity: string;
  };
}
```

**Implementation Tasks:**
1. Create alert rule engine
2. Implement Slack integration
3. Implement email notifications
4. Add alert suppression (avoid spam)
5. Create alert dashboard queries

**Deliverables:**
- `src/services/alerting/` - Alerting service
- Alert rules configuration
- Notification adapters

---

### Feature 4: API Client Type Generation

**Purpose:** Generate TypeScript types from service responses for frontend consumption

**Concept:**
```typescript
// Frontend receives this generated type
// src/types/api/generated/structures.ts (auto-generated)
export interface StructuresResponse {
  status: 'success' | 'error';
  data?: {
    structures: Array<{
      id: string;
      name: string;
      level: number;
      isActive: boolean;
    }>;
  };
  error?: {
    code: string;
    message: string;
    tracingId: string;
  };
}
```

**Generation Process:**
```
1. Services throw typed errors
   ↓
2. Routes catch and format responses
   ↓
3. Response types extracted
   ↓
4. TypeScript types generated
   ↓
5. Published to @game/shared package
   ↓
6. Frontend imports and uses types
```

**Implementation Tasks:**
1. Create response type introspection system
2. Build type generation CLI tool
3. Integrate into build pipeline
4. Generate types for all endpoints
5. Publish to @game/shared

**Deliverables:**
- `src/utils/typeGeneration/` - Type generation logic
- Build script for generation
- Generated types in shared package
- CI/CD integration

---

### Feature 5: Error Documentation Generation

**Purpose:** Auto-generate API documentation from error types

**Documentation Output:**
```markdown
# API Error Reference

## StructuresService

### startStructure

**Endpoint:** POST /api/game/structures/start

**Possible Errors:**

| Error Type | Status | Code | Message | Cause |
|-----------|--------|------|---------|-------|
| ValidationError | 422 | INVALID_COORDINATES | Invalid coordinate format | Provided coordinates don't match pattern |
| NotFoundError | 404 | EMPIRE_NOT_FOUND | Empire not found | User's empire doesn't exist |
| NotFoundError | 404 | LOCATION_NOT_FOUND | Location not found | Base at coordinates doesn't exist |
| ConflictError | 409 | LOCATION_NOT_OWNED | You don't own this location | Another empire owns the location |
| ValidationError | 422 | TECH_NOT_AVAILABLE | Required tech not researched | Prerequisites not met |
| BadRequestError | 400 | NO_CAPACITY | No construction capacity | Base is at max construction |

**Example Error Response:**
```json
{
  "success": false,
  "error": "Invalid coordinate format",
  "code": "INVALID_COORDINATES",
  "tracingId": "req-12345"
}
```
```

**Implementation Tasks:**
1. Create documentation generator
2. Add error type scanning
3. Generate markdown docs
4. Host docs on website or wiki
5. Add to build process

**Deliverables:**
- `src/utils/docGeneration/` - Doc generation logic
- Generated error reference docs
- CI/CD integration

---

### Feature 6: Performance Baseline & Monitoring

**Purpose:** Ensure error handling doesn't impact performance

**Metrics to Track:**
```typescript
interface PerformanceMetrics {
  // Timing
  middlewareOverheadMs: number;        // How long error middleware takes
  telemetryCollectionMs: number;       // How long to record metrics
  alertingCheckMs: number;             // How long to check alert conditions
  
  // Throughput
  errorsProcessedPerSecond: number;
  errorsWithoutSlowdown: number;       // % of errors under 5ms overhead
  
  // Resource usage
  memoryUsedByCollector: number;       // MB
  databaseConnectionsUsed: number;
}
```

**Monitoring Implementation:**
```typescript
// Track middleware overhead
const startTime = performance.now();

try {
  // ... error processing
} finally {
  const duration = performance.now() - startTime;
  recordPerformanceMetric('error_middleware', duration);
}
```

**Implementation Tasks:**
1. Add performance timing instrumentation
2. Create performance tracking service
3. Set baseline metrics
4. Add alerting for performance degradation
5. Create performance dashboard

**Deliverables:**
- `src/middleware/performanceTracking.ts`
- Performance metrics table
- Dashboard queries

---

## Implementation Order (Recommended)

### 📋 Phase 6A: Monitoring Foundation (Week 1)
**Goal:** Get basic error tracking and alerting working

1. **6A.1 Enhanced Error Middleware** (2 days)
   - Error metric capture
   - Severity classification
   - Request timing
   - Tracing ID system

2. **6A.2 Telemetry Schema & Collector** (1.5 days)
   - Create error_events table
   - Build error event collector
   - Implement queue + flush logic

3. **6A.3 Basic Alerting** (1.5 days)
   - Implement alert rule engine
   - Add Slack integration
   - Alert suppression logic

**Checkpoint:** Error monitoring working, basic alerts triggered

### 📋 Phase 6B: Advanced Telemetry (Week 2)
**Goal:** Pattern detection and actionable insights

4. **6B.1 Pattern Analysis** (2 days)
   - Anomaly detection
   - Cascading failure detection
   - Rate spike detection

5. **6B.2 Aggregation & Rollups** (1.5 days)
   - Hourly metrics aggregation
   - Dashboard queries
   - Trend analysis

6. **6B.3 Alert Enhancements** (1 day)
   - Rate-based alerts
   - Pattern-based alerts
   - Alert correlation

**Checkpoint:** Telemetry providing actionable insights

### 📋 Phase 6C: Developer Experience (Week 3)
**Goal:** Make error handling easy and transparent

7. **6C.1 Type Generation** (2 days)
   - Response type introspection
   - Type generation CLI
   - Build integration

8. **6C.2 API Documentation** (1.5 days)
   - Documentation generator
   - Error reference docs
   - CI/CD integration

9. **6C.3 Frontend Integration** (1 day)
   - Publish types to shared
   - Update frontend imports
   - Test type checking

**Checkpoint:** Frontend has complete type safety

### 📋 Phase 6D: Performance & Polish (Week 4)
**Goal:** Production-ready performance and observability

10. **6D.1 Performance Monitoring** (1.5 days)
    - Overhead tracking
    - Baseline establishment
    - Degradation alerts

11. **6D.2 Dashboard & Visualization** (1.5 days)
    - Error rate dashboard
    - Alert status page
    - Performance graphs

12. **6D.3 Documentation & Training** (1 day)
    - Phase 6 completion summary
    - Team documentation
    - Runbooks

**Checkpoint:** System production-ready and well-documented

---

## Technical Details & Specifications

### Error Metric Schema
```typescript
interface ErrorMetrics {
  // Identity
  id: string;                    // UUID
  tracingId: string;             // UUID for correlation
  
  // Classification
  errorType: string;             // Class name: NotFoundError
  errorCode: string;             // Application code: EMPIRE_NOT_FOUND
  severity: 'low' | 'medium' | 'high' | 'critical';
  httpStatus: number;            // HTTP status code
  
  // Context
  userId?: string;               // Who encountered the error
  endpoint: string;              // /api/game/structures/start
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  timestamp: number;             // When it occurred
  
  // Performance
  durationMs: number;            // How long the request took
  middlewareOverheadMs: number;  // How long error processing took
  
  // Additional context
  context: Record<string, unknown>; // Error-specific data
  requestBody?: unknown;         // For debugging
  responseHeaders?: Record<string, string>;
}
```

### Alert Rule Examples

**Rule 1: Rate Spike**
```typescript
{
  name: 'Error Rate Spike',
  condition: `
    (errorCount(last 5 min) / errorCount(baseline)) > 2.0
  `,
  severity: 'high',
  notifyChannels: ['slack', 'pagerduty'],
  suppressFor: 300_000 // 5 minutes (avoid spam)
}
```

**Rule 2: Cascading Failure**
```typescript
{
  name: 'Cascading Failure Detection',
  condition: `
    sameErrorType across 3+ endpoints in last 5 minutes
  `,
  severity: 'critical',
  notifyChannels: ['slack', 'pagerduty', 'email'],
  suppressFor: 600_000 // 10 minutes
}
```

---

## Success Metrics & Validation

### Phase 6 Success Criteria

✅ **Monitoring:**
- [ ] 95%+ error capture rate
- [ ] <5ms middleware overhead per error
- [ ] Zero silent failures

✅ **Telemetry:**
- [ ] Error patterns detectable within 5 minutes
- [ ] Hourly aggregation working
- [ ] Trend analysis accurate

✅ **Alerting:**
- [ ] Alerts triggered within 30 seconds of event
- [ ] False positive rate <5%
- [ ] Alert suppression prevents spam

✅ **Type Generation:**
- [ ] All endpoints have generated types
- [ ] Frontend type checking <1s
- [ ] Zero type mismatches with runtime

✅ **Documentation:**
- [ ] All errors documented
- [ ] Documentation kept in sync
- [ ] Developers can find error info quickly

✅ **Performance:**
- [ ] No measurable regression in request latency
- [ ] Error processing <5ms overhead
- [ ] Memory stable after 24h operation

---

## Risks & Mitigation

### Risk 1: Performance Overhead
**Concern:** Telemetry collection slows down requests
**Mitigation:**
- Async telemetry flushing (batched)
- Configurable sampling (record 10% of errors in high-volume scenarios)
- Performance monitoring catches regressions
- Circuit breaker for telemetry (fallback if overwhelmed)

### Risk 2: Database Load
**Concern:** Error events table grows quickly
**Mitigation:**
- Hourly aggregation into metrics table
- Retention policy (keep detailed logs 7 days, aggregates 90 days)
- Index strategy for common queries
- Separate read replicas for analytics

### Risk 3: Alert Storm
**Concern:** Too many alerts from same issue
**Mitigation:**
- Alert suppression/deduplication
- Alert correlation (group related alerts)
- Severity thresholds (suppress low alerts if high exists)
- Runbook linking (show actions to resolve)

### Risk 4: Type Generation Staleness
**Concern:** Generated types don't match runtime
**Mitigation:**
- Generate during build (keeps in sync)
- Validation layer ensures types match responses
- CI/CD checks for type mismatches
- Versioning for API contracts

---

## Integration Points with Existing Systems

### With Phase 5 Error Hierarchy
- ✅ Use existing ApplicationError classes
- ✅ Leverage error codes already defined
- ✅ HTTP status mapping already exists

### With Existing Database
- Add error telemetry tables
- No changes to business tables
- Separate schema for telemetry (can be purged)

### With Existing Middleware Stack
- Add error monitoring before response middleware
- Integrate with existing logging
- Use existing request tracking

### With Frontend (@game/client)
- Consume generated types
- Update API service layer
- Enable strict type checking

---

## Success Story: Phase 6 Complete

After Phase 6:

**For Developers:**
- "I threw a ValidationError and watched it propagate through the monitoring system, captured in the dashboard within 5 seconds"
- "The frontend has autocomplete for all API errors now"
- "I know exactly which errors are happening, how often, and which endpoints are affected"

**For Operations:**
- "We get alerts before users report issues"
- "Error patterns are visible—we can see when something is cascading"
- "The dashboard shows us exactly where to focus"

**For the Product:**
- "Better reliability—we catch issues immediately"
- "Better user experience—fast error resolution"
- "Better insights—data-driven decisions on where to improve"

---

## Next Steps

1. **Review this plan** - Get user approval before starting
2. **Identify priorities** - Which features are most critical?
3. **Allocate time** - ~3-4 weeks for full implementation
4. **Start Phase 6A** - Begin with monitoring foundation
5. **Iterate & refine** - Adjust based on learnings

---

## Related Documentation

- Phase 5 Completion: `PHASE_5_COMPLETION.md`
- Phase 5 Tier 2 Migration: `PHASE_5_TIER2_MIGRATION.md`
- Error Type Hierarchy: `src/errors/ApplicationError.ts`
- Current Error Middleware: `src/middleware/errorHandler.ts`

---

**Phase 6 Status:** 🟢 READY TO BEGIN  
**Created:** 2025-11-02  
**Last Updated:** 2025-11-02


# 0001 - PRD: API Route Migration Completion

## Introduction/Overview

This document outlines the completion of the API route migration project for the Attrition game server. The project involves migrating remaining v1 API routes to the new modular `/api/game/*` structure, deprecating legacy routes, and ensuring full feature parity. The original monolithic `game.ts` file has already been successfully modularized, and most core systems have been migrated to Supabase. This PRD focuses on the remaining work to complete the migration.

**Problem Statement**: Legacy v1 routes still contain substantial functionality (particularly fleet management with 473 lines of code) that needs to be migrated to the new modular structure. Additionally, some v1 routes need proper deprecation handling and eventual removal.

## Goals

1. **Complete Fleet Management Migration**: Migrate all fleet-related functionality from `/api/v1/fleets/*` to `/api/game/fleets/*`
2. **Verify Territory/Bases Migration**: Ensure complete feature parity between old territory routes and new bases routes
3. **Implement Route Deprecation Strategy**: Add proper deprecation headers and phase-out plan for v1 routes
4. **Maintain API Consistency**: Ensure all new routes follow established patterns and response formats
5. **Preserve Backward Compatibility**: During transition period, ensure no breaking changes for existing clients

## User Stories

### Fleet Management
- **As a player**, I want to view all my fleets at a specific base so that I can manage my military assets
- **As a player**, I want to see detailed fleet composition (units and quantities) so that I can plan strategic moves
- **As a player**, I want to move fleets between bases so that I can position forces strategically
- **As a player**, I want to merge and split fleets so that I can optimize fleet compositions

### API Consumer (Frontend/Client)
- **As a frontend developer**, I want consistent API response formats so that I can reliably handle data
- **As a frontend developer**, I want clear deprecation notices so that I can migrate to new endpoints in a timely manner
- **As an API consumer**, I want backward compatibility during migration so that existing functionality remains stable

### System Administration
- **As a system administrator**, I want to monitor migration progress so that I can ensure system stability
- **As a system administrator**, I want to safely deprecate old routes so that I can reduce technical debt

## Functional Requirements

### Fleet Management Routes
1. **FR-1**: The system must provide `/api/game/fleets` endpoint to list all fleets for authenticated empire
2. **FR-2**: The system must provide `/api/game/fleets?base=COORD` endpoint to filter fleets by base coordinate
3. **FR-3**: The system must provide `/api/game/fleets/:id` endpoint to get detailed fleet information
4. **FR-4**: The system must provide `/api/game/fleets/:id/move` endpoint to initiate fleet movement
5. **FR-5**: The system must provide fleet overview endpoint compatible with existing frontend expectations
6. **FR-6**: The system must calculate fleet size in credits for display purposes
7. **FR-7**: The system must handle fleet unit composition (type and count arrays)

### Route Deprecation
8. **FR-8**: The system must add `X-Deprecated-Path` headers to all v1 routes
9. **FR-9**: The system must provide clear migration guidance in deprecation headers
10. **FR-10**: The system must log deprecation usage for monitoring purposes
11. **FR-11**: The system must maintain v1 route functionality during transition period

### API Consistency
12. **FR-12**: All new routes must follow the established response format: `{ success: boolean, data: any, error?: string }`
13. **FR-13**: All new routes must require authentication via the existing middleware
14. **FR-14**: All new routes must handle empire resolution consistently with existing patterns
15. **FR-15**: All error responses must include appropriate HTTP status codes and error details

### Territory/Bases Verification
16. **FR-16**: The system must verify that all territory management features are available in bases routes
17. **FR-17**: The system must identify any missing functionality from territory routes
18. **FR-18**: The system must ensure backward compatibility for territory-related data structures

## Non-Goals (Out of Scope)

1. **New Fleet Features**: No new fleet functionality beyond migrating existing features
2. **Combat System Changes**: Combat mechanics remain unchanged during migration
3. **Database Schema Changes**: No changes to existing Supabase fleet tables
4. **Frontend Changes**: Frontend code changes are out of scope for this migration
5. **Performance Optimizations**: Focus is on feature parity, not performance improvements
6. **UI/UX Changes**: No changes to user interface or user experience

## Design Considerations

### API Structure
- Follow existing `/api/game/*` patterns established in dashboard, structures, tech routes
- Use consistent error handling and response formatting
- Maintain RESTful conventions where applicable

### Route Organization
- Mount fleet routes under `/api/game/fleets` in `game/index.ts`
- Create dedicated `game/fleets.ts` module for fleet-specific logic
- Keep route handlers focused and delegate business logic to services

### Deprecation Strategy
- Use middleware to add deprecation headers automatically
- Provide clear migration paths in header messages
- Consider graduated deprecation timeline (warning → deprecated → removed)

## Technical Considerations

### Existing Dependencies
- **SupabaseFleetMovementService**: Already implemented, needs route integration
- **Fleet Database Tables**: `fleets`, `fleet_movements` tables exist in Supabase
- **Authentication Middleware**: Reuse existing `authenticate` middleware
- **Empire Resolution**: Use existing `EmpireResolutionService` patterns

### Integration Points
- **Game Loop Service**: Fleet movements processed by completion service
- **Socket Events**: Real-time fleet updates may need WebSocket integration
- **Validation**: Reuse existing validation patterns from other game routes

### Migration Approach
- Create new routes first, then add deprecation to v1 routes
- Use feature flags if gradual rollout is needed
- Maintain dual functionality during transition period

## Success Metrics

1. **Migration Completeness**: 100% of v1 fleet functionality migrated to game routes
2. **API Consistency**: All new routes pass response format validation
3. **Test Coverage**: 100% test coverage for new fleet routes
4. **Backward Compatibility**: Zero breaking changes during migration period
5. **Documentation**: All routes documented with clear examples
6. **Performance**: Response times match or exceed v1 route performance

## Open Questions

1. **Fleet Movement Timing**: Should we migrate fleet movement logic to new routes or keep existing service integration?
2. **WebSocket Integration**: Do fleet routes need real-time updates via Socket.IO?
3. **Rate Limiting**: Should new fleet routes have specific rate limiting rules?
4. **Deprecation Timeline**: What is the target timeline for removing v1 routes completely?
5. **Frontend Migration**: Who will handle updating frontend code to use new endpoints?

---

**Estimated Effort**: 1-2 weeks  
**Priority**: High (blocks technical debt reduction)  
**Dependencies**: None (all prerequisites completed)  
**Risk Level**: Low (following established patterns)
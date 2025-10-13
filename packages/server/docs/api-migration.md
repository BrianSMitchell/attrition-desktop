# API Route Migration Strategy

## Overview

This document outlines the strategy for migrating from the v1 API routes to the new game-focused API structure. The goal is to provide a clear path for migrating functionality while maintaining backward compatibility during the transition.

## Route Mapping

### Dashboard Routes
- **Old**: `/api/v1/dashboard` (via empireRoutes)
- **New**: `/api/game/dashboard` (via game/dashboard.ts)
- **Status**: Ready for migration
- **Strategy**: 
  1. Mark v1 route as deprecated with warning header
  2. Point v1 implementation to game/dashboard.ts
  3. Phase out v1 route in next major version

### Empire Management
- **Old**: `/api/v1/empire/*`
- **New**: To be implemented in `game/empire.ts`
- **Status**: Requires migration
- **Strategy**:
  1. Create new game/empire.ts
  2. Implement empire-specific endpoints
  3. Migrate functionality from empireRoutes

### Technology Research
- **Old**: `/api/v1/tech/*`
- **New**: `/api/game/tech/*`
- **Status**: Partially migrated
- **Strategy**:
  1. Compare implementations for feature parity
  2. Add any missing functionality to game/tech
  3. Point v1 routes to new implementations

### Building & Structures 
- **Old**: 
  - `/api/v1/buildings/*`
  - `/api/v1/structures/*`
  - `/api/v1/defenses/*`
- **New**:
  - `/api/game/structures/*`
  - `/api/game/defenses/*`
- **Status**: Migration in progress
- **Strategy**:
  1. Verify all v1 functionality is covered
  2. Implement any missing features
  3. Add deprecation notices to v1 routes

### Unit Management
- **Old**: 
  - `/api/v1/units/*`
  - `/api/game/units/*` (via v1)
- **New**: `/api/game/units/*`
- **Status**: Migration required
- **Strategy**:
  1. Document all v1 unit functionality
  2. Ensure feature parity in game/units
  3. Migrate implementation to avoid duplication

### Territory & Bases
- **Old**:
  - `/api/v1/territories/*`
  - `/api/v1/territory/*`
  - `/api/v1/bases/*`
- **New**: `/api/game/bases/*`
- **Status**: Migration started
- **Strategy**:
  1. Complete base functionality migration
  2. Verify no territory features are lost
  3. Update documentation for new endpoints

## Implementation Plan

### Phase 1: Current
- Move dashboard functionality to game/dashboard.ts
- Mark v1 dashboard route as deprecated
- Create initial game/empire.ts

### Phase 2: Next Release
- Migrate remaining empire functionality
- Verify technology route consistency
- Add any missing structure/defense features

### Phase 3: Following Release
- Complete unit management migration
- Finish base/territory consolidation
- Add deprecation notices to all v1 routes

### Phase 4: Future Major Version
- Remove v1 route duplicates
- Clean up deprecated endpoints
- Complete migration to game/* structure

## Response Format Standards

All new game/* routes follow consistent response formatting:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}
```

Example success response:
```json
{
  "success": true,
  "data": {
    // ... endpoint-specific data
  }
}
```

Example error response:
```json
{
  "success": false,
  "error": "Error message",
  "message": "User-friendly message"
}
```
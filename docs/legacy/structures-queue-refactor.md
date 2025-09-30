# Structures Queue Refactor

## Overview
Refactored the structures construction queue to follow the same reliable pattern used by the research queue system, replacing the problematic legacy implementation that mixed building records with queue items.

## What Was Implemented

### 1. New StructuresQueue Model
- **File**: `packages/server/src/models/StructuresQueue.ts`
- **Purpose**: Dedicated queue model for tracking construction/upgrade requests
- **Key Features**:
  - Separate from Building model (no more mixing active buildings with queue items)
  - Proper status management ('pending', 'completed', 'cancelled')
  - Identity key for idempotency (`empireId:locationCoord:buildingKey:level`)
  - Capacity-driven scheduling with completion timestamps
  - Credit charging at appropriate times
  - Support for both new construction and upgrades

### 2. New StructuresQueueService
- **File**: `packages/server/src/services/structuresQueueService.ts`
- **Purpose**: Queue-based construction management following TechService pattern
- **Key Features**:
  - Proper tech and capacity gating
  - Idempotency checks to prevent duplicate requests
  - Credit management (queue first, charge later to prevent race conditions)
  - Handles both insufficient credits (queue for later) and sufficient credits (immediate scheduling)
  - Capacity-driven ETA calculations

### 3. New StructuresQueueProcessor
- **File**: `packages/server/src/services/structuresQueueProcessor.ts`
- **Purpose**: Game loop processing for structures queue
- **Key Features**:
  - `activatePendingStructures()`: Activates queued items when credits/capacity become available
  - `processStructuresQueue()`: Completes finished constructions and creates/updates buildings
  - Proper error handling and empire validation
  - Maintains Building model records for active structures

### 4. Updated Game Loop Integration
- **File**: `packages/server/src/services/gameLoopService.ts`
- **Changes**:
  - Added structures queue activation phase
  - Added structures queue completion processing
  - Updated logging to include structures queue statistics
  - Follows same pattern as tech queue processing

### 5. Updated API Routes
- **File**: `packages/server/src/routes/game.ts`
- **Changes**:
  - Updated `/structures/start` to use new queue service
  - Updated `/structures/status` to use new queue service
  - Updated `/structures/queue` to read from StructuresQueue model
  - Updated `/structures/queue/:id` (DELETE) to work with new queue model
  - Maintains backward compatibility with existing API contracts

## Architecture Benefits

### Following Research Queue Pattern
- **Consistency**: Uses same architectural approach as the reliable research queue
- **Separation of Concerns**: Queue items are separate from active building records
- **Proper State Management**: Clear pending → completed/cancelled flow
- **Idempotency**: Prevents duplicate queue entries with identity keys
- **Capacity-Driven**: Scheduling based on construction capacity

### Improved Reliability
- **No More Mixed Records**: Active buildings vs queue items are clearly separated
- **Proper Credit Management**: Credits charged at appropriate times to prevent race conditions
- **Better Error Handling**: Consistent error responses and proper validation
- **Queue Ordering**: Proper FIFO ordering maintained through timestamps

### Game Loop Integration
- **Automated Processing**: Structures complete automatically via game loop
- **Credit-Based Activation**: Pending items activate when credits become available
- **Robust Error Handling**: Failed items are cancelled, missing empires handled gracefully

## Migration Notes

### Backward Compatibility
- API endpoints maintain same contracts (URLs, request/response formats)
- Frontend should continue to work without changes
- Existing Building records remain untouched

### Database Changes
- **New Collection**: `structuresqueues` for queue items
- **Existing Collections**: `buildings` unchanged, still used for active structures
- **No Data Migration Required**: New system works alongside existing buildings

### Deployment
1. Deploy new models and services
2. Game loop will start processing new queue system immediately
3. Legacy Building-based queue gradually phases out as new requests use StructuresQueue
4. No downtime required

## Testing Required
- [ ] Verify queue creation works correctly
- [ ] Test idempotency (double-click protection)
- [ ] Verify FIFO ordering maintained
- [ ] Test credit charging and refunding
- [ ] Verify building creation/upgrade works
- [ ] Test cancellation functionality
- [ ] Verify game loop processing
- [ ] Test capacity-driven activation

## Future Improvements
- Consider migrating existing Building-based queue items to new system
- Add queue position indicators for frontend
- Add estimated wait time for pending (unscheduled) items
- Consider adding queue limits per base to prevent spam

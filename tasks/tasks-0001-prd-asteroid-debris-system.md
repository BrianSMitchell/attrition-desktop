# Implementation Tasks: Asteroid Debris System

## Relevant Files

### Core Game Files
- `packages/shared/src/entities/Asteroid.ts` - Core asteroid entity definition and behavior
- `packages/shared/src/entities/Recycler.ts` - Recycler unit definition and capabilities
- `packages/shared/src/entities/Player.ts` - Player entity for credit management
- `packages/server/src/systems/DebrisSystem.ts` - New system to manage debris generation and collection
- `packages/server/src/systems/ResourceSystem.ts` - Resource and credit management system

### Client-Side Files
- `packages/client/src/components/game/AsteroidInfo.tsx` - UI component for displaying asteroid information
- `packages/client/src/components/game/DebrisIndicator.tsx` - New component for showing debris amounts
- `packages/client/src/stores/gameStore.ts` - Game state management including resource tracking

### Test Files
- `packages/server/src/systems/__tests__/DebrisSystem.test.ts` - Tests for debris generation and collection
- `packages/shared/src/entities/__tests__/Asteroid.test.ts` - Tests for asteroid entity changes
- `packages/shared/src/entities/__tests__/Recycler.test.ts` - Tests for recycler unit modifications

### Notes
- Most changes will focus on modifying existing systems rather than creating entirely new ones
- Need to ensure backward compatibility with save files
- Consider performance implications of debris accumulation

## Tasks

- [ ] 1.0 Modify Asteroid System Core
  - [ ] 1.1 Remove colonization-related properties from Asteroid entity
  - [ ] 1.2 Add new properties for debris generation (generationRate, accumulatedDebris)
  - [ ] 1.3 Create interfaces for debris-related types
  - [ ] 1.4 Update asteroid initialization to include random debris generation rate
  - [ ] 1.5 Remove colonization-related methods and functions
  - [ ] 1.6 Add methods for debris accumulation and collection
  - [ ] 1.7 Update serialization/deserialization for new properties
  - [ ] 1.8 Write unit tests for modified Asteroid entity

- [ ] 2.0 Implement Debris Generation System
  - [ ] 2.1 Create new DebrisSystem class in server systems
  - [ ] 2.2 Implement debris generation tick logic
  - [ ] 2.3 Add random rate generation within defined bounds
  - [ ] 2.4 Implement debris accumulation tracking per asteroid
  - [ ] 2.5 Add system registration to game loop
  - [ ] 2.6 Create performance-optimized debris storage
  - [ ] 2.7 Implement debris amount queries and updates
  - [ ] 2.8 Write unit tests for DebrisSystem
  - [ ] 2.9 Add integration tests for debris generation

- [ ] 3.0 Enhance Recycler Unit Functionality
  - [ ] 3.1 Add debris collection capabilities to Recycler entity
  - [ ] 3.2 Implement collection rate logic (10 debris/second)
  - [ ] 3.3 Add credit conversion system (1 debris = 1 credit)
  - [ ] 3.4 Create multi-recycler collection handling
  - [ ] 3.5 Implement resource distribution for multiple recyclers
  - [ ] 3.6 Add player credit update mechanism
  - [ ] 3.7 Update recycler state management
  - [ ] 3.8 Write unit tests for recycler modifications
  - [ ] 3.9 Add integration tests for collection system

- [ ] 4.0 Update Game UI
  - [ ] 4.1 Create DebrisIndicator component
  - [ ] 4.2 Update AsteroidInfo component with debris information
  - [ ] 4.3 Add debris amount visualization
  - [ ] 4.4 Create recycler collection status display
  - [ ] 4.5 Update tooltip information for asteroids
  - [ ] 4.6 Add collection rate indicators
  - [ ] 4.7 Implement real-time debris updates
  - [ ] 4.8 Add visual feedback for debris collection
  - [ ] 4.9 Update game store to handle debris state
  - [ ] 4.10 Write unit tests for new UI components

- [ ] 5.0 Handle Migration and Cleanup
  - [ ] 5.1 Create database migration script
  - [ ] 5.2 Implement colony removal logic
  - [ ] 5.3 Update save file format
  - [ ] 5.4 Add save file migration handler
  - [ ] 5.5 Create backup system for existing saves
  - [ ] 5.6 Implement rollback mechanism
  - [ ] 5.7 Add validation for migrated data
  - [ ] 5.8 Write migration tests
  - [ ] 5.9 Create migration documentation
  - [ ] 5.10 Add telemetry for migration process

## Implementation Order and Dependencies

1. Start with Task 1.0 as it's the foundation for all other changes
2. Task 2.0 can begin after 1.0 is complete
3. Task 3.0 requires both 1.0 and 2.0 to be functional
4. Task 4.0 can be worked on in parallel with 3.0 once 2.0 is complete
5. Task 5.0 should be the last task, executed only after all other systems are tested and working

## Testing Strategy

1. Unit Tests:
   - Write tests alongside each component implementation
   - Focus on edge cases in debris generation and collection
   - Ensure proper credit conversion and distribution

2. Integration Tests:
   - Test interaction between DebrisSystem and Recyclers
   - Verify proper credit distribution with multiple recyclers
   - Test save/load functionality with new system

3. Performance Tests:
   - Test with maximum number of asteroids
   - Verify performance with maximum debris accumulation
   - Test multiple recyclers at single asteroid

## Rollback Plan

1. Keep backup of all modified files
2. Maintain database backup before migration
3. Version all changes in separate branches
4. Test rollback procedures before deployment

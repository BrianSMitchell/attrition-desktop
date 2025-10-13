# Refactoring game.ts into Domain-Specific Routes

## Overview
The game.ts file has grown too large (>2000 lines) and handles too many different concerns. We need to refactor it into smaller, domain-specific route files while ensuring no functionality is lost or duplicated.

## Problem Statement
1. The game.ts file is currently handling multiple different domains:
   - Dashboard/Empire
   - Technology/Research
   - Structures/Buildings
   - Units/Defense
   - Fleets/Movement
   - Territory/Base Management
   - Resource/Economy

2. This creates several issues:
   - File is too large to maintain effectively
   - Different concerns are mixed together
   - Code duplication risk when different teams need to modify different features
   - Testing becomes difficult
   - Code navigation is cumbersome

## Goals
1. Organize routes by domain into separate files
2. Maintain all existing functionality
3. Prevent code duplication
4. Ensure consistent error handling and response formats
5. Improve code maintainability

## Non-Goals
1. Rewrite or modify existing functionality
2. Change API endpoints or response formats
3. Modify database interactions
4. Improve performance (though this may be a side effect)

## Current Route Categories in game.ts

1. Dashboard/Empire Routes:
   - GET /dashboard
   - GET/POST /empire
   - GET /credits/history
   - GET /territories

2. Technology/Research Routes:
   - GET /tech/catalog
   - GET /tech/status
   - POST /tech/start
   - GET/DELETE /tech/queue

3. Building/Structure Routes:
   - GET /buildings/location/:coord
   - GET /structures/catalog
   - GET /structures/queue
   - DELETE /structures/cancel/:coord

4. Unit/Defense Routes:
   - GET /units/catalog
   - GET /units/status
   - POST /units/start
   - GET/DELETE /units/queue

5. Fleet Routes:
   - GET /fleets
   - GET /fleets/:id
   - POST /fleets/:id/dispatch
   - GET /fleets/:id/status

6. Base/Territory Routes:
   - GET /bases/summary
   - GET /bases/:coord/stats
   - GET /bases/:coord/structures
   - POST /bases/:coord/structures/:key/construct

## Migration Strategy

1. For each domain:
   a. Create new route file
   b. Move relevant routes and imports
   c. Keep original routes in game.ts until verified
   d. Update route registration
   e. Remove moved routes from game.ts

2. Order of migration (based on dependencies):
   a. Territory/Base routes (foundational)
   b. Building/Structure routes 
   c. Unit/Defense routes
   d. Tech/Research routes
   e. Fleet routes
   f. Empire/Economy routes

3. For each route migration:
   a. Verify all imports are moved correctly 
   b. Test the route continues working
   c. Remove from game.ts only after verification

## Success Criteria

1. Technical:
   - No routes remain in game.ts
   - All routes work exactly as before
   - All tests pass
   - No code duplication
   - Each new route file < 500 lines

2. User-facing:
   - No API changes visible to clients
   - No downtime during migration
   - No regression in functionality

3. Developer-focused:
   - Clear file organization
   - Routes easier to find and maintain
   - Reduced merge conflicts
   - Better separation of concerns

## Implementation Plan

1. Initial setup:
   - Create basic route files
   - Set up route registration structure
   - Document planned route organization

2. Route migration:
   - Move routes one domain at a time
   - Test thoroughly after each move
   - Keep game.ts routes until verified

3. Cleanup:
   - Remove migrated routes from game.ts
   - Update imports
   - Clean up any temporary code

4. Documentation:
   - Update route documentation
   - Document new file organization
   - Document testing process

## Questions to Consider

1. Dependencies:
   - What shared utilities need to be accessible?
   - Are there circular dependencies to handle?
   - What middleware needs to be shared?

2. Consistency:
   - How to maintain consistent error handling?
   - How to maintain consistent response formats?
   - How to handle shared types?

3. Testing:
   - How to verify no functionality is lost?
   - How to test routes in isolation?
   - How to maintain test coverage?

4. Future:
   - How to make future additions easier?
   - How to prevent route files growing too large again?
   - How to handle cross-cutting concerns?
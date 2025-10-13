# API Route Structure Plan

## Core Routes (Protected)
These routes are all under /api/ and require authentication

### Game Core (/api/game)
- /dashboard               Empire overview & economy
- /empire                  Empire management
- /tech                    Research & development
- /bases                   Base management
- /units                   Unit management & production
- /fleets                  Fleet management & movement
- /structures             Building & construction
  - /structures/catalog   Structure types
  - /structures/queue    Construction queue
  - /structures/:coord   Structure at location
- /defenses              Defense systems
  - /defenses/catalog   Defense types
  - /defenses/queue    Defense construction queue
  - /defenses/:coord   Defense at location

### Status & Health (/api/status)
- GET /                 Server status
- GET /health          Health check

### Authentication (/api/auth)
- POST /login          User login
- POST /refresh        Refresh token
- POST /logout         User logout
- GET /session         Session validation

### Security (/api/security)
- GET /                  Security status
- GET /https-health     HTTPS status

### Messages (/api/messages)
- GET /               Message list
- GET /:id          Specific message
- PUT /:id          Update message

### Universe (/api/universe)
- GET /              Universe status
- GET /:sector      Sector data

## Legacy Migration
Old paths that need to be supported during migration:

### V1 Compatibility
- /api/game/dashboard (redirects to /api/game/dashboard)
- /api/game/tech/* (tech routes)  
- /api/game/units/* (unit routes)
- /api/game/fleets/* (fleet routes)

### Timeline
1. Create new routes under /api/game/
2. Add deprecation notices on old routes
3. Update clients to use new routes
4. Remove old routes after all clients migrated
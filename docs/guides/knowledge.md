# Attrition Project Knowledge Base

## Project Overview

**Attrition** is a strategic desktop space empire game built as a monorepo with multiple packages. It's a real-time multiplayer strategy game where players build bases, manage resources, research technologies, command fleets, and expand their space empire.

- **Type**: Desktop-only strategic space empire game
- **Architecture**: Electron + React frontend, Node.js + MongoDB backend
- **Current Version**: 1.0.9
- **Status**: Beta testing phase with deployed production server
- **Package Manager**: pnpm (>=8.0.0)
- **Node Version**: >=18.0.0

## Project Architecture

### Monorepo Structure
```
packages/
├── desktop/         # Electron main process (1.0.9)
├── launcher/        # Electron launcher app (1.0.7)
├── client/          # React UI embedded in Electron
├── server/          # Node.js Express API + MongoDB
└── shared/          # Shared TypeScript types and utilities
```

### Technology Stack

**Desktop Application**
- **Electron 31.x** - Cross-platform desktop framework
- **Better SQLite3** - Local data storage and caching
- **Electron Updater** - Auto-update functionality
- **Keytar** - Secure credential storage

**Frontend (Client)**
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool optimized for Electron
- **Tailwind CSS** - Styling framework
- **Zustand** - State management (stores: auth, base, modal, universeMap)
- **React Router** - Client-side routing
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client

**Backend (Server)**
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Primary database (MongoDB Atlas in production)
- **Mongoose** - ODM for MongoDB
- **Socket.io** - Real-time communication
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **TypeScript** - Type safety

**Shared Libraries**
- **TypeScript** - Shared types and interfaces
- **Zod** - Runtime validation
- **Game logic helpers** - Calculations for buildings, tech, units, capacities

## Key Development Concepts

### Launcher System (v1.0.7+)
- **Launcher-first distribution**: Users run `Attrition Launcher.exe` which handles game updates
- **Automatic updates**: Launcher downloads and installs game updates from GitHub releases
- **Launch protection**: Main game warns if launched directly (not through launcher)
- **Installation path**: `%LOCALAPPDATA%\Programs\Attrition\`

### Game Architecture
- **Real-time strategy**: Persistent universe with timed construction/research queues
- **Multiplayer**: Socket.io for real-time updates and communication
- **Offline sync**: Desktop app caches data locally and syncs when online
- **Idempotent operations**: All game actions designed to prevent double-submission

### Database Models
- **User**: Authentication, profile, empire linkage
- **Empire**: Player's space empire with resources and territories
- **Location**: Universe coordinates (galaxies, regions, systems, planets)
- **Colony**: Player bases on planets with buildings
- **Fleet**: Groups of units at specific locations
- **Building/TechQueue/UnitQueue**: Construction and research queues
- **ResearchProject**: Technology research progress

## Development Workflow

### Common Commands
```bash
# Development
pnpm dev                     # Start server + desktop app
pnpm --filter @game/shared build  # Build shared package first

# Testing
pnpm test                    # All tests
pnpm test:unit              # Unit tests only
pnpm test:integration       # Integration tests
pnpm test:e2e              # End-to-end tests
pnpm test:performance       # Performance/balance tests
pnpm test:security          # Security tests

# Building
pnpm build                  # Build all packages
pnpm release:prepare        # Build + create distribution
pnpm --filter @game/desktop dist  # Create desktop installer

# Launcher
pnpm launcher:dev           # Develop launcher
pnpm launcher:build         # Build launcher
pnpm launcher:dist          # Create launcher installer
```

### Environment Setup
1. **MongoDB**: Local MongoDB for dev and MongoDB Atlas for production connection string
2. **Environment Variables**: Server requires `.env` with `MONGODB_URI`, `JWT_SECRET`, etc.
3. **Build Order**: Always build `@game/shared` first, then other packages
4. **Development**: Use `pnpm dev` from root to start both server and desktop app

### Testing Strategy
- **Unit Tests**: Individual component/service testing
- **Integration Tests**: API endpoint and database testing
- **E2E Tests**: Full user workflow testing
- **Performance Tests**: Game balance and simulation testing
- **Security Tests**: Authentication, input validation, IPC security

## Deployment Information

### Production Environment
- **Server**: Deployed on Render.com (free tier)
- **Database**: MongoDB Atlas cluster
- **Status**: Currently requires admin user creation and universe generation
- **Sleep Mode**: Render free tier sleeps after 15min inactivity (30s startup delay)

### Release Process
1. **Version Bump**: Update desktop package version
2. **Build**: `pnpm release:prepare` builds all packages
3. **Distribution**: Creates installers in `releases/` directory
4. **GitHub Releases**: Upload game installer to GitHub for launcher auto-updates
5. **Launcher Distribution**: Distribute launcher executable to users

## Game Mechanics Overview

### Core Systems
- **Universe**: Procedurally generated galaxies with regions, systems, and planets
- **Bases**: Player colonies with buildings, queues, and resource production
- **Technologies**: Research tree unlocking new structures and units
- **Fleets**: Military units for exploration, combat, and colonization
- **Economy**: Credit-based system with trade routes and resource management
- **Combat**: Attack/defense system with occupation mechanics

### Key Features
- **Real-time gameplay**: Continuous progression with timed queues
- **Multiplayer interaction**: Trade, combat, and diplomacy
- **Progressive unlocks**: Technology research enables new possibilities
- **Strategic depth**: Resource management, fleet positioning, base optimization

## Development Guidelines

### Code Standards
- **TypeScript**: Use TypeScript for all new code
- **Shared Types**: Define shared interfaces in `@game/shared`
- **State Management**: Use Zustand stores for client state
- **API Design**: RESTful endpoints with Socket.io for real-time updates
- **Error Handling**: Proper error logging and user feedback

### File Organization
- **Components**: Organize by feature (auth, game, layout, help)
- **Services**: API clients and business logic
- **Stores**: Zustand state management
- **Utilities**: Helper functions and calculations
- **Types**: Shared interfaces and type definitions

### Best Practices
- **Build Shared First**: Always build `@game/shared` before other packages
- **Idempotency**: Design all game actions to be safely repeatable
- **Offline Handling**: Desktop app should gracefully handle network issues
- **Security**: Validate all inputs, use JWT tokens, secure IPC communication
- **Performance**: Cache data locally, optimize database queries

## Important Notes

### Recent Achievements (as of 2025-09-05)
- Core systems stabilized with idempotent queues
- Energy and capacity parity established
- Interactive universe map implemented
- Desktop cache version checking and invalidation
- Comprehensive testing framework in place
- Launcher distribution system implemented

### Development Environment
- **Windows-focused**: Primary development on Windows platform
- **Cross-platform**: Electron enables Windows/Mac/Linux distribution
- **Package Manager**: Exclusively use pnpm, not npm or yarn
- **Database**: Same MongoDB Atlas instance for development and production

### Common Issues
- **Build Order**: Must build shared package before others
- **Environment Variables**: Server won't start without proper `.env` configuration
- **Database Connection**: Check MongoDB Atlas connection if server fails to start
- **Launcher Path**: Game executable must be in correct AppData location for launcher

## Configuration Files

- **`config/electron-builder.yml`**: Main game build configuration
- **`config/launcher-builder.yml`**: Launcher build configuration
- **`config/development.yml`**: Development environment settings
- **`config/production.yml`**: Production environment settings
- **`packages/server/.env`**: Server environment variables

## Documentation References

- **`README.md`**: Primary project documentation
- **`PROJECT_CONTEXT.md`**: Current deployment status and context
- **`docs/Game Mechanics and Rules.md`**: Comprehensive game mechanics
- **`LAUNCHER_DISTRIBUTION_GUIDE.md`**: Launcher system documentation
- **`achievements.md`**: Development milestone tracking

This knowledge base should be updated as the project evolves, especially after major feature additions or architectural changes.
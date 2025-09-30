# Attrition

A strategic desktop space empire game built with Electron, React, Node.js, and MongoDB. This is a desktop-only application that combines rich client-side features with secure server connectivity.

## Project Structure

```
attrition/
├── packages/            # Application packages
│   ├── desktop/         # Electron desktop app (main process)
│   ├── client/          # React UI (embedded in Electron)
│   ├── server/          # Node.js game server (Express + MongoDB)
│   └── shared/          # Shared types and utilities
├── config/              # Configuration files
│   ├── electron-builder.yml  # Build configuration
│   ├── development.yml  # Development environment config
│   ├── production.yml   # Production environment config
│   └── test.yml         # Test environment config
├── scripts/             # Development and maintenance scripts
│   ├── dev/             # Development utilities
│   ├── build/           # Build scripts
│   └── maintenance/     # Database and admin scripts
├── releases/            # Build artifacts and release files
├── docs/                # Project documentation
├── package.json         # Workspace configuration
└── README.md
```

## Tech Stack

### Desktop App (@game/desktop)
- **Electron** - Desktop application framework  
- **Better SQLite3** - Local data storage
- **Electron Updater** - Auto-update functionality
- **Keytar** - Secure credential storage

### UI (@game/client)
- **React 18** - UI framework (embedded in Electron)
- **Vite** - Build tool (desktop-optimized)
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Client-side routing
- **Socket.io Client** - Real-time communication

### Backend (@game/server)
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Socket.io** - Real-time communication
- **TypeScript** - Type safety

### Shared (@game/shared)
- **TypeScript** - Shared types and interfaces
- **Zod** - Runtime validation
- **Utility functions** - Game logic helpers

## Getting Started

### Prerequisites

- Node.js 18+ 
- PNPM (recommended) or npm
- MongoDB (local installation or MongoDB Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd space-empire-mmo
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file for the server:
   ```bash
   cp packages/server/.env.example packages/server/.env
   ```
   
   Edit `packages/server/.env` with your configuration:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/space-empire-mmo
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   
   # Server
   PORT=3001
   NODE_ENV=development
   
   # CORS
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Start MongoDB**
   
   If using local MongoDB:
   ```bash
   mongod
   ```
   
   Or use MongoDB Atlas and update the `MONGODB_URI` in your `.env` file.

5. **Build shared package**
   ```bash
   pnpm --filter @game/shared build
   ```

### Development

Start the desktop app and server in development mode:

```bash
# Standard development (may require manual cleanup on Ctrl+C)
pnpm dev

# Recommended: Development with automatic process cleanup
pnpm dev:clean
```

This will start:
- **Desktop App**: Electron window with the game UI
- **Game Server**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

### Process Management

Sometimes development processes may hang after pressing Ctrl+C. To address this:

```bash
# List all Attrition-related processes
pnpm list:processes

# Kill all Attrition development processes
pnpm clean:processes
```

See `docs/process-management-guide.md` for detailed information about the new process management utilities.

### Individual Package Commands

**Desktop App**
```bash
pnpm --filter @game/desktop dev     # Start Electron in dev mode
pnpm --filter @game/desktop build   # Build desktop installer
pnpm --filter @game/desktop start   # Start built desktop app
```

**UI (Client)**
```bash
pnpm --filter @game/client build   # Build UI for embedding in desktop app
```

**Server (Backend)**
```bash
pnpm --filter @game/server dev     # Start with nodemon
pnpm --filter @game/server build   # Build TypeScript
pnpm --filter @game/server start   # Start production server
```

**Shared (Common)**
```bash
pnpm --filter @game/shared build   # Build TypeScript
pnpm --filter @game/shared dev     # Watch mode
```

### Scripts and Utilities

**Development Scripts**
```bash
node scripts/dev/test-feedback-system.js   # Test feedback system
# Add more development utilities in scripts/dev/
```

**Maintenance Scripts**
```bash
node scripts/maintenance/create-admin.js   # Create admin user
node scripts/maintenance/clean-database.js # Clean database
node scripts/maintenance/inspect-db.js     # Inspect database
# More maintenance tools available in scripts/maintenance/
```

**Build and Release**
```bash
pnpm run build              # Build all packages
pnpm run release:prepare    # Build and create distribution
pnpm run clean:all         # Clean all build artifacts
```

## Features

### Phase 1: Authentication & Basic Framework ✅

- [x] User registration and login
- [x] JWT-based authentication
- [x] Protected routes
- [x] Basic dashboard
- [x] Responsive UI with Tailwind CSS
- [x] Real-time Socket.io setup
- [x] MongoDB integration
- [x] Monorepo architecture

### Phase 2: Universe Generation (Coming Next)

- [ ] Procedural star system generation
- [ ] Galaxy map visualization
- [ ] Empire creation and placement
- [ ] Resource distribution

### Phase 3: Core Gameplay

- [ ] Fleet management
- [ ] Combat system
- [ ] Technology research
- [ ] Diplomacy system

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout user

### Game
- `GET /api/game/dashboard` - Get dashboard data
- `POST /api/game/empire` - Create new empire
- `GET /api/game/empire` - Get empire details

## Database Schema

### User
```javascript
{
  email: String (unique),
  username: String (unique),
  passwordHash: String,
  gameProfile: {
    empireId: ObjectId,
    credits: Number,
    experience: Number
  },
  createdAt: Date,
  lastLogin: Date
}
```

### Empire
```javascript
{
  userId: ObjectId,
  name: String,
  homeSystem: ObjectId,
  territories: [ObjectId],
  fleets: [ObjectId],
  resources: {
    credits: Number,
    minerals: Number,
    energy: Number,
    research: Number
  },
  technology: {
    military: Number,
    economic: Number,
    exploration: Number
  }
}
```

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### Git Workflow
- Use conventional commits
- Create feature branches for new features
- Submit pull requests for code review

### Testing
- Write unit tests for utility functions
- Add integration tests for API endpoints
- Test React components with React Testing Library

## Deployment

### Production Build
```bash
pnpm run release:prepare
```

This will:
1. Build all packages
2. Create distribution files in `releases/`
3. Generate installers for all platforms

### Configuration

Environment-specific configurations are in `config/`:
- `config/development.yml` - Development settings
- `config/production.yml` - Production settings  
- `config/test.yml` - Test environment settings
- `config/electron-builder.yml` - Build configuration

### Environment Variables (Production)
Ensure these are set in your production environment:
- `MONGODB_URI` - Production MongoDB connection string
- `JWT_SECRET` - Strong, unique secret key
- `NODE_ENV=production`
- `CORS_ORIGIN` - Your frontend domain

### Docker (Optional)
Docker configuration will be added in future phases.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Roadmap

- **Phase 1**: ✅ Authentication & Basic Framework
- **Phase 2**: 🚧 Universe Generation & Galaxy Map
- **Phase 3**: 📋 Core Gameplay (Fleets, Combat, Research)
- **Phase 4**: 📋 Advanced Features (Diplomacy, Trade, Events)
- **Phase 5**: 📋 Polish & Optimization

## Support

For questions or issues, please create an issue in the repository or contact the development team.

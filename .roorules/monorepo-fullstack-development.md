---
description: Guidelines for setting up and developing full-stack monorepo applications with React, Node.js, and shared TypeScript packages
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["monorepo", "fullstack", "react", "nodejs", "typescript", "pnpm", "authentication"]
globs: ["package.json", "packages/**/*", "**/*.ts", "**/*.tsx"]
---

# Full-Stack Monorepo Development Guide

## Overview

This rule provides comprehensive guidance for creating and managing full-stack monorepo applications using modern JavaScript/TypeScript technologies. Based on successful implementation of complex projects including authentication, real-time features, and scalable architecture.

## Monorepo Setup Protocol

### Initial Structure Creation

When setting up a new monorepo project:

1. **Root Configuration**
   - Create root `package.json` with PNPM workspace configuration
   - **CRITICAL**: Create `pnpm-workspace.yaml` file with `packages: ['packages/*']` - this is REQUIRED for PNPM workspaces to function
   - Use `workspaces: ["packages/*"]` pattern in package.json as fallback
   - Include concurrently for parallel development servers
   - Set up shared dev dependencies (ESLint, Prettier, TypeScript)

2. **Package Structure**
   ```
   project-root/
   ├── packages/
   │   ├── client/     # Frontend (React + Vite)
   |   |-- desktop/
   │   ├── server/     # Backend (Node.js + Express)
   │   └── shared/     # Common types and utilities
   ├── package.json    # Workspace root
   └── README.md
   ```

3. **Build Order Dependencies**
   - Always build shared packages first
   - Use `workspace:*` protocol for internal dependencies
   - Configure proper TypeScript project references

### Windows Development Considerations

**Command Execution Patterns:**
- Use individual `mkdir` commands instead of space-separated multiple directories
- Example: `mkdir packages\client` then `mkdir packages\server` (not `mkdir packages\client packages\server`)
- **CRITICAL**: PowerShell doesn't support Unix-style command chaining with &&
- Use sequential commands: `cd directory` then `command` instead of `cd directory && command`
- Consider cross-platform compatibility in setup scripts

**PNPM Workspace Build Order Protocol:**
- **ALWAYS** build shared packages first before dependent packages
- Use: `pnpm --filter @app/shared build` before starting development servers
- TypeScript compilation errors often indicate missing shared package builds
- This prevents "Module has no exported member" errors during development

## TypeScript Configuration Strategy

### Shared Package Setup
- Export all common types, interfaces, and utilities
- Use Zod for runtime validation schemas
- Implement utility functions for business logic
- Configure proper build pipeline with TypeScript

### Package-Specific Configurations
- **Client**: Configure for React with JSX support and DOM types
- **Server**: Configure for Node.js with CommonJS modules
- **Shared**: Configure for library output with declaration files

## Authentication Architecture Pattern

### Backend Implementation
```typescript
// Key patterns to follow:
- JWT + bcrypt for secure authentication
- Mongoose pre-save hooks for password hashing
- Express middleware for route protection
- Proper error handling and validation
- Socket.io authentication middleware
```

### Frontend Implementation
```typescript
// State management pattern:
- Zustand with persist middleware for auth state
- Axios interceptors for token management
- Protected route components with React Router
- Proper loading and error state handling
```

### Security Best Practices
- Use environment variables for secrets
- Implement proper CORS configuration
- Add rate limiting and security headers
- Validate all inputs with shared schemas

## React Component Architecture

### Gaming UI Patterns
- Dark theme optimization with proper contrast
- Sidebar navigation with resource displays
- Card-based layout for game information
- Responsive design with Tailwind CSS
- Custom CSS classes for game-specific styling

### Component Organization
```
src/
├── components/
│   ├── auth/       # Authentication components
│   ├── game/       # Game-specific components
│   └── layout/     # Layout and navigation
├── stores/         # Zustand state management
├── services/       # API and external services
└── utils/          # Client-side utilities
```

## Express API Architecture

### Middleware Stack Order
1. Security middleware (helmet, cors, rate limiting)
2. Body parsing middleware
3. Authentication middleware (for protected routes)
4. Route handlers
5. Error handling middleware (must be last)

### Route Organization
```
src/
├── routes/
│   ├── auth.ts     # Authentication endpoints
│   ├── game.ts     # Game-specific endpoints
│   └── index.ts    # Route aggregation
├── middleware/     # Custom middleware
├── models/         # Database models
└── services/       # Business logic services
```

## Database Schema Design

### Gaming Application Patterns
- Separate authentication data from game profile data
- Use embedded documents for related game data
- Implement proper indexing for performance queries
- Include timestamps for audit trails
- Design for future expansion and feature additions

### Mongoose Best Practices
- Use schema validation and custom validators
- Implement pre/post hooks for data transformation
- Create proper indexes for query optimization
- Use population for related document queries

## Development Workflow

### Package Scripts Configuration
```json
{
  "scripts": {
    "dev": "concurrently \"pnpm --filter @app/server dev\" \"pnpm --filter @app/client dev\"",
    "build": "pnpm --filter @app/shared build && pnpm --filter @app/server build && pnpm --filter @app/client build",
    "test": "pnpm --filter \"@app/*\" test"
  }
}
```

### Environment Management
- Use `.env.example` files for documentation
- Separate environment configurations per package
- Implement proper CORS and proxy settings for development
- Configure different settings for development vs production

## Real-Time Features Integration

### Socket.io Setup
- Implement authentication middleware for websocket connections
- Use room-based communication for user and game-specific events
- Attach user data to socket for proper room management
- Handle connection/disconnection events properly

## Error Handling Strategy

### Comprehensive Error Management
- Implement global error handlers for both client and server
- Use proper HTTP status codes and error messages
- Log errors appropriately for debugging
- Provide user-friendly error messages in UI
- Handle network errors and retry logic

## Performance Optimization

### Build and Development
- Use Vite for fast frontend development and building
- Implement proper caching strategies
- Configure concurrent builds where possible
- Use TypeScript project references for better build performance

### Runtime Optimization
- Implement proper loading states
- Use efficient state management patterns
- Optimize database queries with proper indexing
- Consider lazy loading for large components

## Testing Strategy

### Testing Architecture
- Unit tests for utility functions and business logic
- Integration tests for API endpoints
- Component tests for React components
- End-to-end tests for critical user flows

## Documentation Requirements

### Project Documentation
- Comprehensive README with setup instructions
- API documentation with endpoint descriptions
- Database schema documentation
- Development workflow documentation
- Deployment instructions and environment setup

## Troubleshooting Common Issues

### TypeScript Compilation Error Resolution Protocol

**Systematic Troubleshooting Steps:**
1. **Build Foundation First**: Always run `pnpm --filter @app/shared build` before diagnosing other errors
2. **Environment Types**: Create `src/vite-env.d.ts` for Vite projects with proper ImportMeta interface
3. **Router Type Annotations**: Add explicit types to Express routers: `const router: Router = Router()`
4. **Clean Unused Imports**: Remove unused imports to eliminate compilation warnings
5. **API Type Mismatches**: Use type utilities like `Omit<User, 'passwordHash'>` for sanitized API responses

**Common TypeScript Patterns:**
- **Vite Environment Variables**: Create `vite-env.d.ts` with `interface ImportMetaEnv` definitions
- **Express Router Safety**: Always annotate router variables to prevent type inference errors
- **Zustand API Integration**: Handle type mismatches between full entities and API responses
- **Module Resolution**: Ensure shared packages are built before dependent packages

### Development Environment
- TypeScript errors during development are expected until dependencies are installed
- Build order matters: shared packages must be built before dependent packages
- Windows command line limitations require individual directory creation
- Socket.io authentication requires specific middleware patterns

### TypeScript + Mongoose Integration Issues
- **ObjectId Typing**: Use explicit casting for Mongoose ObjectIds: `(user._id as mongoose.Types.ObjectId).toString()`
- **JWT SignOptions**: Import and use proper typing: `import jwt, { SignOptions } from 'jsonwebtoken'`
- **Interface Conflicts**: Avoid extending shared interfaces in Mongoose models; create separate document interfaces
- **Required Imports**: Always import mongoose for ObjectId operations: `import mongoose from 'mongoose'`

### MongoDB Development Setup
- **Atlas vs Local**: MongoDB Atlas is more reliable for development than local MongoDB instances
- **Connection String Format**: Use proper Atlas format: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`
- **Environment Variables**: Store connection strings in `.env` files, never commit credentials
- **Connection Testing**: Test database connectivity before running full application stack

### MongoDB Atlas Connection Troubleshooting
- **Systematic Debugging**: Follow this order: credentials → network access → URL encoding → CORS configuration
- **URL Encoding Critical**: Special characters in passwords MUST be URL encoded (@ becomes %40)
- **Network Access**: Verify IP whitelist in Atlas dashboard includes current IP or 0.0.0.0/0 for development
- **CORS Matching**: Server CORS origin must match exact client port (restart server after .env changes)
- **Authentication Errors**: "bad auth" usually means wrong credentials; "querySrv ENOTFOUND" means URL parsing issues
- **Browser Testing**: Use browser automation to verify full authentication flow and reveal CORS issues

### Production Considerations
- Environment variable management for different environments
- Database connection string configuration
- CORS settings for production domains
- Security considerations for JWT secrets and API keys

### Production Build Hygiene (Client)

To prevent test-time TypeScript warnings from failing production builds, exclude test files (or use a dedicated build tsconfig):

- Option A (simple): add to packages/client/tsconfig.json
  ```json
  {
    "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]
  }
  ```
- Option B (recommended for larger projects): create tsconfig.build.json that extends tsconfig.json but excludes tests, and point your build script at it:
  ```json
  {
    "extends": "./tsconfig.json",
    "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]
  }
  ```
  Then update the build command to use tsc -p tsconfig.build.json.

Rationale:
- Strict settings like noUnusedLocals in test files can cause production tsc runs to fail.
- Tests remain covered by the Jest/ts-jest pipeline; production tsc should focus on shipping code.

## Success Metrics

A successful monorepo implementation should achieve:
- ✅ Clean separation of concerns between packages
- ✅ Type safety across the entire application
- ✅ Efficient development workflow with hot reload
- ✅ Proper authentication and authorization
- ✅ Scalable architecture for future features
- ✅ Comprehensive documentation and setup instructions

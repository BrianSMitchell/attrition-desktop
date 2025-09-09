# Attrition Project Context

## Project Overview
**Attrition** is a strategic desktop space empire game built with:
- **Desktop App**: Electron + React + TypeScript
- **Backend Server**: Node.js + Express + MongoDB + Socket.io
- **Database**: MongoDB Atlas (cloud)
- **Deployment**: Render.com (free tier)

## Current Project Status (as of 2025-09-08)

### 🚀 DEPLOYMENT STATUS
- **Server**: LIVE on Render.com 
- **Database**: MongoDB Atlas cluster (recently wiped clean)
- **Current Phase**: Beta testing setup
- **Status**: Server deployed, need to generate new universe

### 🗄️ DATABASE STATE
- **Recently Action**: Database was completely wiped/cleaned
- **Current State**: Empty database, needs admin user + universe generation
- **Next Steps**: Create admin user, generate universe

### 🔧 KEY SCRIPTS & TOOLS
- `packages/server/create-admin.js` - Creates admin user (bypasses planet requirement)
- `packages/server/clean-database.js` - Wipes database clean
- `packages/server/src/scripts/generateUniverse.ts` - Generates game universe
- Admin credentials: admin@attrition.com / AdminPassword123!

### 🌐 API ENDPOINTS
- **Base URL**: https://[RENDER-URL]/api
- **Health Check**: GET /health
- **Auth**: POST /api/auth/login, /api/auth/register
- **Universe Generation**: POST /api/universe/generate (admin only)
- **Universe Stats**: GET /api/universe/stats

### 📁 PROJECT STRUCTURE
```
C:\Users\roand\OneDrive\Documents\Attrition/
├── packages/
│   ├── desktop/         # Electron app
│   ├── client/          # React UI
│   ├── server/          # Node.js backend
│   └── shared/          # Shared types
├── docs/Beta-Test-Plan.md
└── README.md
```

### 🎯 CURRENT OBJECTIVES
1. **Test deployed server** - Verify Render deployment is working
2. **Create admin user** - Run create-admin.js against MongoDB Atlas
3. **Generate universe** - Use admin API to populate empty database
4. **Beta testing** - Prepare for 2-3 testers

### 💾 DATABASE CONNECTION
- **MongoDB URI**: Uses Atlas cluster (connection string in create-admin.js)
- **Database Name**: attrition
- **Collections**: users, locations (for universe data)

### 🔑 ADMIN ACCESS
- **Role**: Admin users can generate universe via POST /api/universe/generate
- **Purpose**: Universe generation is admin-only to prevent accidental regeneration

### 🚨 IMPORTANT NOTES
- Render free tier sleeps after 15min inactivity (30s startup delay)
- Database was recently wiped - completely fresh start needed
- Desktop app connects to remote server (not localhost in production)
- Server uses JWT authentication with 7-day expiry

## Common Commands

### Create Admin User
```bash
node packages/server/create-admin.js
```

### Generate Universe (via API after admin login)
```bash
POST /api/universe/generate
Authorization: Bearer <admin-jwt-token>
```

### Test Server Health
```bash
curl https://[RENDER-URL]/health
```

## Development vs Production
- **Development**: localhost:3001
- **Production**: Render.com deployment
- **Database**: Same MongoDB Atlas cluster for both
- **Current Mode**: Production testing phase

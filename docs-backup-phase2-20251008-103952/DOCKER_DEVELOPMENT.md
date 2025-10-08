# Docker Development Setup

This document explains how to set up and use the Docker development environment for Attrition, which provides a local MongoDB instance and optionally containerized server development.

## 🎯 Benefits

- **Safe Development**: Local MongoDB instead of production database
- **Easy Reset**: Quickly wipe and recreate your development database
- **Consistent Environment**: Same setup across different machines
- **Database Management**: Web UI for MongoDB management
- **No Installation Hassles**: No need to install MongoDB locally

## 🚀 Quick Start

### 1. Setup Environment Files

Copy the local environment template:
```bash
# Root level (optional)
cp .env.local .env

# Server level (recommended)
cp packages/server/.env.local packages/server/.env
```

Edit the `.env` file if you want to change any settings (JWT secrets, ports, etc.).

### 2. Start Development Environment

**Option A: Database Only (Recommended)**
```bash
# Start just MongoDB
pnpm dev:db

# Or with database management UI
pnpm dev:db:tools
```

Then run your server locally as usual:
```bash
pnpm dev
```

**Option B: Full Docker Development**
```bash
# Everything in containers
pnpm dev:server:docker
```

**Option C: Hybrid (Database + Local Server)**
```bash
# Start DB, then local server
pnpm dev:server:local
```

### 3. Access Your Applications

- **Your Game Server**: http://localhost:3001
- **MongoDB Express** (if started with tools): http://localhost:8081
  - Username: `admin`
  - Password: `pass`

## 📋 Available Scripts

### Development Scripts
| Script | Description |
|--------|-------------|
| `pnpm dev:db` | Start MongoDB only |
| `pnpm dev:db:tools` | Start MongoDB + management UI |
| `pnpm dev:server:docker` | Run server in Docker |
| `pnpm dev:server:local` | Start DB + local server |
| `pnpm dev:full` | Original: Start all + local dev |

### Database Management
| Script | Description |
|--------|-------------|
| `pnpm docker:shell:mongo` | Open MongoDB shell |
| `pnpm docker:reset` | Reset database (⚠️ destroys data) |
| `pnpm docker:clean` | Stop and remove everything |
| `pnpm docker:logs` | View container logs |
| `pnpm docker:build` | Rebuild Docker images |

### Application Scripts
| Script | Description |
|--------|-------------|
| `pnpm db:seed` | Seed database with test data |
| `pnpm db:migrate` | Run database migrations |

## 🗂️ Docker Services

### MongoDB (`mongodb`)
- **Port**: 27017
- **Database**: `space-empire-mmo`
- **Data Persistence**: Yes (named volume)
- **Auto-start**: Always (unless stopped)

### MongoDB Express (`mongo-express`)
- **Port**: 8081
- **Profile**: `tools` (optional service)
- **Purpose**: Web UI for database management
- **Credentials**: admin/pass

### Server (`server`)  
- **Port**: 3001
- **Profile**: `server` (optional service)
- **Purpose**: Containerized Node.js development
- **Hot Reload**: Yes (source mounted)

## 🔧 Environment Configuration

### Database Connection
The Docker MongoDB runs on the standard port, so your `.env` should contain:
```env
MONGODB_URI=mongodb://localhost:27017/space-empire-mmo
```

### Development Settings
Recommended development settings in `.env`:
```env
NODE_ENV=development
RATE_LIMIT_ENABLED=false
CREDIT_PAYOUT_PERIOD_MINUTES=1
GAME_LOOP_INTERVAL_MS=60000
JWT_SECRET=local-dev-jwt-secret-change-this
```

## 🛠️ Workflows

### Daily Development
1. Start MongoDB: `pnpm dev:db`
2. Run your server: `pnpm dev`
3. Develop as usual - your changes won't affect production!

### Database Testing
1. Start with tools: `pnpm dev:db:tools`
2. Use MongoDB Express at http://localhost:8081 to view data
3. Reset when needed: `pnpm docker:reset`

### Full Docker Development
1. Build images: `pnpm docker:build`
2. Start everything: `pnpm dev:server:docker`
3. View logs: `pnpm docker:logs`

## 🔍 Troubleshooting

### Port Conflicts
If port 27017 or 3001 are in use:
1. Edit `docker-compose.yml`
2. Change the left side of port mapping: `"27018:27017"`
3. Update your `.env` file accordingly

### Database Connection Issues
1. Ensure MongoDB container is running: `docker ps`
2. Check logs: `pnpm docker:logs`
3. Try resetting: `pnpm docker:reset`

### Container Build Issues
1. Clean everything: `pnpm docker:clean`
2. Rebuild: `pnpm docker:build`
3. Start fresh: `pnpm dev:db`

### Permission Issues (Windows)
If you get permission errors:
1. Ensure Docker Desktop is running as Administrator
2. Check that your project folder is accessible to Docker

## 📁 File Structure

```
/
├── docker-compose.yml          # Main Docker configuration
├── Dockerfile.dev              # Development/Production images
├── .env.local                  # Environment template
├── packages/server/.env.local  # Server-specific template
└── scripts/docker/
    └── mongo-init.js          # MongoDB initialization
```

## 🔒 Security Notes

- The local MongoDB has no authentication (safe for local dev)
- JWT secrets in `.env.local` are for development only
- Never use development credentials in production
- The `.env` files are gitignored - never commit them

## 🎯 Migration from Live DB

When you're ready to switch from your live database:

1. **Backup Production Data** (if you want to copy it locally):
   ```bash
   # Export from your live MongoDB
   mongodump --uri="your-production-uri" --out=backup/
   
   # Import to local Docker MongoDB
   pnpm dev:db  # Start local MongoDB first
   mongorestore --host=localhost:27017 --db=space-empire-mmo backup/your-db-name/
   ```

2. **Update Environment Variables**:
   - Copy `.env.local` to `.env`
   - Your server will now connect to local MongoDB

3. **Seed Development Data**:
   ```bash
   pnpm db:seed  # If you have a seeding script
   ```

## 🚀 Next Steps

- **Production Deployment**: Use the production stage in `Dockerfile.dev`
- **CI/CD Integration**: Add database testing to your CI pipeline
- **Monitoring**: Consider adding logging and monitoring containers
- **Scaling**: Add Redis, additional services as needed

---

**Happy coding with safe, isolated development! 🛡️**

# Database Migration: MongoDB to Supabase

## Overview

Attrition now uses a **dual-database architecture**:

- **Development Environment**: MongoDB (local)
- **Production Environment**: Supabase (PostgreSQL cloud)

This approach allows for:
- ✅ Fast local development with familiar MongoDB
- ✅ Production-ready Supabase with better scaling and real-time features
- ✅ Automatic database selection based on `NODE_ENV`
- ✅ No code changes needed when switching environments

---

## How It Works

The server automatically detects which database to use based on the `NODE_ENV` environment variable:

```typescript
// Automatically handled in src/config/database.ts
if (NODE_ENV === 'production') {
  // Use Supabase
} else {
  // Use MongoDB (dev, test, etc.)
}
```

---

## Setup Instructions

### For Development (MongoDB)

1. **Start MongoDB**:
   ```bash
   # Using Docker (recommended)
   docker-compose up mongodb -d
   
   # Or start local MongoDB
   mongod
   ```

2. **Set environment to development**:
   ```bash
   # In packages/server/.env
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/attrition
   ```

3. **Start the server**:
   ```bash
   pnpm --filter @game/server dev
   ```

You should see:
```
═══════════════════════════════════════
  DATABASE CONFIGURATION
═══════════════════════════════════════
  Environment:     development
  Database Type:   MONGODB
═══════════════════════════════════════

✅ Connected to MongoDB (Development)
```

### For Production (Supabase)

1. **Set environment to production**:
   ```bash
   # In your production environment or packages/server/.env
   NODE_ENV=production
   SUPABASE_URL=https://vgiyiesglcxnzngpyhlb.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Deploy and start**:
   ```bash
   pnpm --filter @game/server start
   ```

You should see:
```
═══════════════════════════════════════
  DATABASE CONFIGURATION
═══════════════════════════════════════
  Environment:     production
  Database Type:   SUPABASE
═══════════════════════════════════════

✅ Connected to Supabase (Production)
```

---

## Database Schema

### MongoDB Collections (Development)
All existing Mongoose models work as-is:
- `users`
- `empires`
- `colonies`
- `buildings`
- `fleets`
- `fleet_movements`
- `messages`
- `research_projects`
- `tech_queue`
- `unit_queue`
- `defense_queue`
- `credit_transactions`
- `locations`

### Supabase Tables (Production)
PostgreSQL tables with equivalent schema:
- Same table names (lowercase with underscores)
- UUIDs instead of MongoDB ObjectIds
- JSONB for complex nested data
- Full-text search capabilities
- Row Level Security (RLS) policies

---

## Key Differences

| Feature | MongoDB (Dev) | Supabase (Prod) |
|---------|--------------|-----------------|
| **ID Type** | ObjectId (`507f1f77bcf86cd799439011`) | UUID (`550e8400-e29b-41d4-a716-446655440000`) |
| **Date Storage** | JavaScript Date | PostgreSQL TIMESTAMPTZ |
| **Arrays** | Native arrays | PostgreSQL arrays or JSONB |
| **Complex Objects** | Nested documents | JSONB columns |
| **Indexes** | Mongoose schema indexes | PostgreSQL indexes |
| **Queries** | Mongoose ODM | Supabase client / SQL |

---

## Migration Files

All database migrations are stored in `/supabase/migrations/`:

```
supabase/
└── migrations/
    └── 20251003_initial_schema.sql  # Initial schema creation
```

### Applying Migrations

To apply migrations to Supabase:

```bash
# Link to your project (already done)
supabase link --project-ref vgiyiesglcxnzngpyhlb

# Push migrations
supabase db push
```

---

## Development Workflow

### 1. Local Development
```bash
# Use MongoDB
cd packages/server
pnpm dev

# Your changes are tested against MongoDB
# All Mongoose code works as normal
```

### 2. Testing Production Build Locally
```bash
# Build the server
pnpm --filter @game/server build

# Set environment to production with Supabase
NODE_ENV=production pnpm --filter @game/server start

# Test with Supabase (cloud database)
```

### 3. Deployment
```bash
# Build production release
pnpm run release:prepare

# The built app will automatically use Supabase in production
```

---

## Environment Variables

### Development (`.env`)
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/attrition
```

### Production (`.env` or hosting environment)
```env
NODE_ENV=production
SUPABASE_URL=https://vgiyiesglcxnzngpyhlb.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Check MongoDB logs
docker logs attrition-mongodb-1

# Restart MongoDB
docker-compose restart mongodb
```

### Supabase Connection Issues
```bash
# Verify connection
supabase status

# Check project status
supabase projects list

# Test connection manually
psql "postgresql://postgres:[password]@db.vgiyiesglcxnzngpyhlb.supabase.co:5432/postgres"
```

### Database Not Switching
1. Check `NODE_ENV` is set correctly
2. Restart the server after changing environment
3. Check server logs for database connection messages

---

## Future Improvements

- [ ] Automated data migration scripts (MongoDB → Supabase)
- [ ] Database seeding for both environments
- [ ] Performance comparison benchmarks
- [ ] Backup/restore procedures for both databases
- [ ] Real-time features using Supabase Realtime
- [ ] Row Level Security (RLS) policies for multi-tenant isolation

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)

---

## Questions?

For questions or issues, please:
1. Check the logs for database connection messages
2. Verify environment variables are set correctly
3. Review this documentation
4. Create an issue in the repository

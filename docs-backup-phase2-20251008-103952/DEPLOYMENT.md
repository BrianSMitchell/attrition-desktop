# Attrition - Deployment Guide

## Quick Production Deployment Checklist

### 1. ✅ Pre-Deployment Setup (COMPLETED)

- [x] Supabase project created
- [x] Database schema migrated
- [x] Environment variables configured
- [x] Dual-database architecture implemented

### 2. Build Production Release

```bash
# From project root
cd C:\Projects\Attrition

# Update version number (if needed)
pnpm version:patch  # or version:minor or version:major

# Build production release
pnpm run release:prepare
```

This will:
- Build the shared package
- Build the client React app
- Build the server with TypeScript
- Create desktop installers in `releases/` directory

### 3. Server Deployment

#### Option A: Deploy to Render/Railway/Heroku

1. **Set environment variables** in your hosting platform:
   ```
   NODE_ENV=production
   SUPABASE_URL=https://vgiyiesglcxnzngpyhlb.supabase.co
   SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   JWT_SECRET=<strong-random-secret>
   PORT=3001
   ```

2. **Deploy the server**:
   ```bash
   # Push to your repository
   git add .
   git commit -m "Production release with Supabase"
   git push origin main
   
   # Your hosting platform will auto-deploy
   ```

3. **Verify deployment**:
   - Check logs for "Connected to Supabase (Production)"
   - Test health endpoint: `https://your-server.com/health`

#### Option B: Self-Hosted VPS

1. **SSH into your server**
2. **Clone and setup**:
   ```bash
   git clone <your-repo>
   cd attrition
   pnpm install
   
   # Copy production environment
   cp packages/server/.env.production packages/server/.env
   
   # Build
   pnpm --filter @game/shared build
   pnpm --filter @game/server build
   
   # Start with PM2 (recommended)
   pm2 start packages/server/dist/index.js --name attrition-server
   pm2 save
   pm2 startup
   ```

### 4. Desktop Client Distribution

The built installers are in `releases/` directory:

- **Windows**: `Attrition-Setup-{version}.exe`
- **macOS**: `Attrition-{version}.dmg`
- **Linux**: `Attrition-{version}.AppImage`

#### Upload to GitHub Releases

```bash
# Tag the release
git tag v{version}
git push origin v{version}

# Create GitHub release
gh release create v{version} \
  releases/Attrition-Setup-{version}.exe \
  releases/Attrition-{version}.dmg \
  releases/Attrition-{version}.AppImage \
  --title "Attrition v{version}" \
  --notes "Release notes here"
```

### 5. Post-Deployment Verification

#### Test Server

```bash
# Health check
curl https://your-server.com/health

# Database connection (should show Supabase)
# Check server logs
```

#### Test Desktop App

1. Download and install from releases
2. Launch application
3. Register a new account
4. Create an empire
5. Verify all features work

#### Monitor Database

```bash
# Access Supabase dashboard
# URL: https://supabase.com/dashboard/project/vgiyiesglcxnzngpyhlb

# Check tables
supabase db remote --project-ref vgiyiesglcxnzngpyhlb psql
\dt
SELECT * FROM users LIMIT 5;
```

### 6. Rollback Plan

If issues occur, you can quickly rollback:

#### Rollback Server
```bash
# Revert to previous git commit
git revert HEAD
git push origin main

# Or switch back to MongoDB temporarily
# Set NODE_ENV=development in production
# Ensure MONGODB_URI points to your MongoDB Atlas
```

#### Rollback Desktop App
- Previous releases remain available on GitHub
- Users can download and install older versions

---

## Environment Variables Reference

### Required for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `JWT_SECRET` | JWT signing secret | Strong random string |
| `PORT` | Server port | `3001` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_ENABLED` | Enable rate limiting | `true` |
| `GAME_LOOP_INTERVAL_MS` | Game loop tick rate | `60000` (1 min) |
| `CREDIT_PAYOUT_PERIOD_MINUTES` | Credit payout interval | `60` |

---

## Monitoring & Maintenance

### Database Backups

Supabase automatically backs up your database daily. To create manual backup:

```bash
# Using Supabase CLI
supabase db dump --project-ref vgiyiesglcxnzngpyhlb > backup.sql
```

### Server Logs

Monitor your server logs for:
- Database connection status
- User registration/login activity
- Game loop execution
- Error messages

### Performance Monitoring

- **Supabase Dashboard**: Monitor database performance, query times
- **Server Metrics**: CPU, memory, response times
- **Desktop App**: Check for crash reports, performance issues

---

## Troubleshooting

### "Connected to MongoDB" in Production

**Problem**: Server is using MongoDB instead of Supabase in production.

**Solution**:
1. Verify `NODE_ENV=production` is set
2. Check Supabase credentials are present
3. Restart the server

### Desktop App Can't Connect to Server

**Problem**: Desktop app shows connection error.

**Solution**:
1. Verify server is running and accessible
2. Check firewall/security group rules
3. Verify server URL in desktop app configuration
4. Check server logs for errors

### Database Query Errors

**Problem**: Errors querying Supabase in production.

**Solution**:
1. Check Supabase project is active
2. Verify service role key has correct permissions
3. Check database migrations were applied
4. Review Supabase logs in dashboard

---

## Support

For deployment issues:
1. Check server logs
2. Review [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md)
3. Check Supabase status: https://status.supabase.com/
4. Create an issue on GitHub

---

## Production URLs

- **Game Server**: (Your server URL here)
- **Supabase Dashboard**: https://supabase.com/dashboard/project/vgiyiesglcxnzngpyhlb
- **GitHub Releases**: https://github.com/your-org/attrition/releases

---

*Last updated: October 3, 2025*

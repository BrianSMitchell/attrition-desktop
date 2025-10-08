# Production Server Setup Guide

## 🚨 **CURRENT STATUS: Your production server is NOT running!**

Your friend's crash and the "server unavailable" message you're seeing are because:
1. The desktop app is trying to connect to `https://attrition-game.onrender.com/api`
2. This server is not currently deployed or running
3. You need to deploy your server to Render (or another hosting platform)

## Quick Fix - Deploy to Render

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with your GitHub account (recommended)
3. Authorize Render to access your GitHub repositories

### Step 2: Create Web Service on Render

1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `BrianSMitchell/attrition-game`
3. Configure the service:

**Basic Settings:**
```
Name: attrition-game
Region: Oregon (US West) or closest to your users
Branch: main
Root Directory: (leave empty)
Runtime: Node
Build Command: ./render-build.sh
Start Command: node packages/server/dist/index.js
```

**Instance Type:**
- Start with **Free** tier for testing
- Upgrade to **Starter ($7/month)** for production with better performance

### Step 3: Configure Environment Variables

In the Render dashboard, go to "Environment" and add these variables:

```bash
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://vgiyiesglcxnzngpyhlb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXlpZXNnbGN4bnpuZ3B5aGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0OTQ0MzUsImV4cCI6MjA3NTA3MDQzNX0.8T9LeDyNwBpGMcA_wr1wQpHRL-c-8bldhHyvCmriWx8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXlpZXNnbGN4bnpuZ3B5aGxiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQ5NDQzNSwiZXhwIjoyMDc1MDcwNDM1fQ.7mu7yfpMeS4bUTRp2h5_mo25H8AEJe8usotloThlNOU

# JWT Configuration (CHANGE THIS!)
JWT_SECRET=YOUR_STRONG_RANDOM_SECRET_KEY_HERE_MAKE_IT_LONG_AND_RANDOM
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Game Loop Configuration
GAME_LOOP_INTERVAL_MS=60000
CREDIT_PAYOUT_PERIOD_MINUTES=60

# Security
ENABLE_DEVICE_BINDING=true
```

**⚠️ IMPORTANT:** Generate a strong JWT_SECRET:
```bash
# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# Or use this online: https://randomkeygen.com/ (Fort Knox Passwords)
```

### Step 4: Deploy

1. Click "Create Web Service"
2. Render will automatically:
   - Clone your repository
   - Run `render-build.sh` (builds shared and server packages)
   - Start the server with `node packages/server/dist/index.js`
3. Wait 5-10 minutes for the first deployment

### Step 5: Verify Deployment

Once deployed, your service URL will be: **https://attrition-game.onrender.com**

Test it:
```bash
# Health check
curl https://attrition-game.onrender.com/health

# Expected response:
{"status":"ok","timestamp":"2025-10-04T...","database":"connected"}
```

### Step 6: Monitor Your Server

**Render Dashboard:**
- Logs: View real-time server logs
- Metrics: Monitor CPU, memory, response times
- Events: Track deployments and errors

**Check for these log messages:**
```
✅ Good:
[INFO] Connected to Supabase (Production)
[INFO] Server listening on port 3001
[INFO] Game loop started

❌ Bad:
[ERROR] Failed to connect to database
[ERROR] JWT_SECRET not configured
[ERROR] Supabase credentials missing
```

## Understanding Free Tier Limitations

**Render Free Tier:**
- ✅ Good for testing and low traffic
- ⚠️ **Spins down after 15 minutes of inactivity**
- Takes 30-60 seconds to "wake up" on first request
- 750 hours/month free (enough for continuous running)

**What this means for your users:**
- If no one plays for 15 minutes, server goes to sleep
- Next user will see "Connecting..." for 30-60 seconds
- After wake-up, everything works normally

**To fix this ($7/month Starter plan):**
- Server stays running 24/7
- No wake-up delays
- Better performance
- Custom domain support

## Troubleshooting

### Issue: Build fails on Render

**Check:**
1. `render-build.sh` has correct permissions
   ```bash
   chmod +x render-build.sh
   git add render-build.sh
   git commit -m "Fix render-build.sh permissions"
   git push
   ```

2. package.json has correct workspace configuration
3. Check Render build logs for specific error

### Issue: Server starts but can't connect to Supabase

**Check:**
1. Environment variables are set correctly in Render
2. Supabase project is active and accessible
3. Supabase credentials haven't expired
4. Check server logs for specific error message

### Issue: Desktop app still says "Server unavailable"

**Check:**
1. Render service is running (not sleeping)
2. Service URL matches app configuration: `attrition-game.onrender.com`
3. No typos in domain name
4. Firewall isn't blocking HTTPS connections
5. Try visiting `https://attrition-game.onrender.com/health` in a browser

### Issue: Users can't register/login

**Check:**
1. JWT_SECRET is set and consistent
2. Supabase database has correct schema
3. Check server logs for authentication errors
4. Verify Supabase service role key has correct permissions

## Alternative: Railway Deployment

If Render doesn't work for you, Railway is another good option:

1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `attrition-game`
5. Add environment variables (same as above)
6. Set start command: `node packages/server/dist/index.js`
7. Set build command: `./render-build.sh`

Railway gives $5/month free credit (usually enough for testing).

## Next Steps After Deployment

1. **Test thoroughly:**
   - Register a new account
   - Create an empire
   - Play for a few minutes
   - Check that data persists

2. **Monitor for 24 hours:**
   - Check Render logs regularly
   - Look for any errors or crashes
   - Monitor Supabase dashboard for query errors

3. **Update documentation:**
   - Add production server URL to README
   - Update deployment documentation
   - Create runbook for common issues

4. **Set up monitoring:**
   - Configure Render alerts for errors
   - Set up Supabase alerts for high query times
   - Consider adding application monitoring (e.g., Sentry)

5. **Plan for scaling:**
   - Monitor concurrent users
   - Watch database query performance
   - Consider upgrading Render plan when needed

## Emergency Rollback

If production has critical issues:

1. **Quick fix - Switch to development:**
   - Set `NODE_ENV=development` in Render
   - This will use MongoDB instead of Supabase
   - Only do this if you have MongoDB Atlas configured

2. **Full rollback:**
   - In GitHub, revert to previous working commit
   - Render will auto-deploy the old version
   - Users may need to re-download old client

## Support

- **Render docs:** https://render.com/docs
- **Supabase docs:** https://supabase.com/docs
- **Check service status:**
  - Render: https://status.render.com/
  - Supabase: https://status.supabase.com/

---

## Summary

**Right now, your game is like a car with no engine:**
- ✅ Desktop app is built and distributed
- ✅ Launcher works and downloads the game
- ✅ Database (Supabase) is configured and ready
- ❌ **Server is not running in production**

**To fix:**
1. Deploy to Render (15 minutes)
2. Test that server is accessible
3. Have your friend try again

The crash your friend experienced was the desktop app failing to connect to a non-existent server, likely throwing an unhandled error during auto-login after registration.

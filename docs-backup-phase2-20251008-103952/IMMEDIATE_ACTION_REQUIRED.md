# 🚨 IMMEDIATE ACTION REQUIRED

## Problem Summary

Your friend downloaded the game, created an account, and the app crashed because:
- **The production server is not running**
- Desktop app tries to connect to `https://attrition-game.onrender.com/api`
- Server doesn't exist = connection failure = crash during auto-login

## Quick Fix (15-20 minutes)

### 1. Go to Render.com
https://render.com

- Sign up with GitHub
- Authorize Render to access your repositories

### 2. Create New Web Service

**Click "New +" → "Web Service"**

**Select Repository:**
- `BrianSMitchell/attrition-game` (connect if needed)

**Service Configuration:**
```
Name: attrition-game
Region: Oregon (US West)
Branch: main
Root Directory: (leave empty)
Runtime: Node
Build Command: ./render-build.sh
Start Command: node packages/server/dist/index.js
Instance Type: Free (for now)
```

### 3. Add Environment Variables

**In Render dashboard, go to "Environment" tab and add:**

**Copy/paste these exactly:**
```
NODE_ENV=production
SUPABASE_URL=https://vgiyiesglcxnzngpyhlb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXlpZXNnbGN4bnpuZ3B5aGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0OTQ0MzUsImV4cCI6MjA3NTA3MDQzNX0.8T9LeDyNwBpGMcA_wr1wQpHRL-c-8bldhHyvCmriWx8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXlpZXNnbGN4bnpuZ3B5aGxiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQ5NDQzNSwiZXhwIjoyMDc1MDcwNDM1fQ.7mu7yfpMeS4bUTRp2h5_mo25H8AEJe8usotloThlNOU
JWT_SECRET=9vE0mMgXOzfe8ikP42GTNcyqFjl6VLU3QstuxDAJ7YBrHZoInp1CwhRdWba5SK
JWT_EXPIRES_IN=7d
PORT=3001
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
GAME_LOOP_INTERVAL_MS=60000
CREDIT_PAYOUT_PERIOD_MINUTES=60
ENABLE_DEVICE_BINDING=true
USE_REVERSE_PROXY_SSL=true
```

**⚠️ IMPORTANT: The JWT_SECRET above is generated for you. Keep it secret!**

### 4. Deploy

Click **"Create Web Service"**

Wait 5-10 minutes for:
- Repository clone
- Dependencies install
- Build process
- Server start

### 5. Verify It's Working

**When deployment completes, test these URLs in your browser:**

1. **Health Check:**
   ```
   https://attrition-game.onrender.com/health
   ```
   Should return: `{"status":"OK","timestamp":"...","server":"Attrition API","version":"1.0.0"}`

2. **Server Status:**
   ```
   https://attrition-game.onrender.com/api/status
   ```
   Should return server info with `"status":"OK"`

### 6. Test The Game

1. Have your friend (or yourself) close the game completely
2. Launch it again
3. The server should now be available!
4. Try registering/logging in
5. Should work without crashing

## Common Issues

### "Build Failed" in Render

**Solution:**
```bash
cd C:\Projects\Attrition
git add render-build.sh
git commit -m "Ensure render-build.sh is executable"
git push
```

Then trigger a manual deploy in Render dashboard.

### Server Starts But Still Shows "Unavailable"

**Check:**
1. Wait 60 seconds (Render might be slow to start)
2. Check Render logs for errors
3. Verify all environment variables are set
4. Try the health endpoint directly in browser

### "Free Instance Will Spin Down"

**Render Free Tier:**
- Server sleeps after 15 minutes of inactivity
- Takes 30-60 seconds to wake up on first request
- This is normal for free tier

**To fix ($7/month):**
- Upgrade to Starter plan
- Server stays running 24/7

## What Your Friend Should See Now

**Before (with server down):**
1. Download game ✅
2. Install ✅
3. Launch ✅
4. Login screen says "Server unavailable" ❌
5. Register account = **CRASH** ❌

**After (with server running):**
1. Download game ✅
2. Install ✅
3. Launch ✅
4. Login screen shows "Server available" ✅
5. Register account = Success! ✅
6. Create empire and play! ✅

## Next Steps

After server is running:
1. Test thoroughly yourself first
2. Have your friend try again
3. Monitor Render logs for any errors
4. Check Supabase dashboard for database activity

## Need Help?

If you run into issues:
1. Check Render logs (in dashboard)
2. Check this file: `PRODUCTION_SERVER_SETUP.md` (detailed guide)
3. Verify Supabase is working: https://supabase.com/dashboard/project/vgiyiesglcxnzngpyhlb

---

**TL;DR: Your game client is perfect. The server just isn't running. Deploy it to Render and everything will work!**

# 🚨 URGENT: Fix Render Build Command

## The Problem

Render is still using the wrong build command. It's running:
```
pnpm run build:server
```

This tries to install ALL workspace dependencies (including desktop/electron), which fails.

## The Solution

Change Render to use the fixed build script:
```
./render-build.sh
```

## Steps to Fix (2 minutes)

### 1. Go to Render Dashboard
https://dashboard.render.com

### 2. Select Your Service
- Click on **"attrition-game"** service

### 3. Open Settings
- Click **"Settings"** in the left sidebar (near the bottom)

### 4. Update Build Command
Scroll down to find:
- **Build Command** field
- It currently says: `pnpm run build:server`
- Change it to: `./render-build.sh`

### 5. Save and Deploy
- Scroll to bottom
- Click **"Save Changes"** button
- Render will automatically start a new deployment

## What Will Happen

Once you save:
1. Render detects the configuration change
2. Automatically triggers a new deployment
3. Uses the correct `render-build.sh` script
4. Build should succeed this time!
5. Server will start and be live

## Watch for Success

In the deployment logs, you should see:
```
==> Running build command './render-build.sh'...
Starting Render build process...
Node version: v24.9.0
NPM version: ...
Installing shared package dependencies...
Installing server package dependencies...
Building shared package...
Building server package...
Build completed successfully!
```

Then:
```
Server listening on port 3001
Connected to Supabase (Production)
Game loop started
```

## If You Can't Find the Settings

1. From Render dashboard home
2. Click **"attrition-game"** under your services
3. Look for tabs at the top: **Events, Logs, Shell, Settings**
4. Click **Settings**
5. Scroll to **Build & Deploy** section
6. Find **Build Command** field

## Alternative: Quick URL

Direct link to your service:
https://dashboard.render.com/web/srv-d2V3gQ0db3pQ

Then click **Settings** → **Build Command**

---

**After you make this change, the build will work and your server will be live in ~10 minutes!**

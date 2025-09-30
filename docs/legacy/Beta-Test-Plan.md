# Attrition Beta Test Plan

## Overview
Deploy Attrition game for beta testing with 2-3 testers using Render (free tier) and MongoDB Atlas (free tier).

## Phase 1: Setup Production Infrastructure

### 1.1 MongoDB Atlas Configuration
- ✅ **Already Complete**: Free tier MongoDB Atlas cluster
- **Action Needed**: 
  - Get production connection string
  - Create production database user with limited permissions
  - Whitelist Render IP addresses (or use 0.0.0.0/0 for simplicity)

### 1.2 GitHub Repository Setup
- **Status**: Account exists, linked to Render
- **Actions Needed**:
  1. Initialize git repository in project folder
  2. Create GitHub repository (private recommended)
  3. Push code to GitHub
  4. Set up .gitignore for sensitive files

### 1.3 Environment Variables for Production
Create production environment variables for Render:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/attrition-beta

# Security
JWT_SECRET=super-secure-random-string-for-production
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=production

# CORS (for desktop app)
CORS_ORIGIN=*

# Rate Limiting (relaxed for beta)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500

# Game Configuration
GAME_LOOP_INTERVAL_MS=60000
CREDIT_PAYOUT_PERIOD_MINUTES=5
```

## Phase 2: Code Modifications

### 2.1 Client Configuration Updates
- **File**: `packages/client/src/utils/apiConfig.ts`
- **Change**: Update production API URL from localhost to Render URL
- **Example**: `https://attrition-beta.onrender.com/api`

### 2.2 Build Scripts Update
- **Desktop package.json**: Update `prebuild` to use production client build
- **Client package.json**: Ensure production build works correctly

### 2.3 Server CORS Configuration
- Update allowed origins for desktop app connections
- Test Socket.IO connections work with Render hosting

## Phase 3: Deployment

### 3.1 Render Web Service Setup
1. **Connect GitHub**: Repository already linked
2. **Service Configuration**:
   - **Name**: `attrition-beta`
   - **Environment**: `Node`
   - **Build Command**: `pnpm install && pnpm --filter @game/server build`
   - **Start Command**: `pnpm --filter @game/server start`
   - **Branch**: `main` (or `master`)

3. **Environment Variables**: Add all production env vars to Render dashboard

### 3.2 First Deployment Test
- Deploy server to Render
- Test API endpoints: `https://attrition-beta.onrender.com/health`
- Test database connectivity
- Test game loop functionality

## Phase 4: Desktop App Distribution

### 4.1 Build Production Desktop App
```bash
# Build client for production
pnpm --filter @game/client build

# Build desktop installer
pnpm --filter @game/desktop build
```

### 4.2 Distribution Method
- **Simple Approach**: Upload installer to Google Drive/Dropbox
- **File Name**: `Attrition-Setup-v1.0.0.exe`
- **Size**: ~100-200MB (estimate)

### 4.3 Testing Checklist
- [ ] Installer runs without errors
- [ ] Game launches successfully
- [ ] Can create account / login
- [ ] All game features work
- [ ] Server connectivity stable
- [ ] Performance acceptable

## Phase 5: Beta Test Management

### 5.1 Test User Accounts
**Option A**: Pre-create accounts
- dad@example.com / TempPassword123
- tester2@example.com / TempPassword123

**Option B**: Self-registration
- Share registration link
- Monitor for issues

### 5.2 Feedback Collection
- **Method**: Simple Google Form or direct messages
- **Focus Areas**:
  - Game crashes or bugs
  - Confusing UI/UX
  - Performance issues
  - Feature requests
  - Balance feedback

### 5.3 Monitoring & Support
- **Render Logs**: Monitor for server errors
- **MongoDB Atlas**: Monitor database performance
- **Response Time**: Aim for <2 hours for critical bugs

## Phase 6: Iteration & Updates

### 6.1 Bug Fixes
- Fix issues in development
- Push to GitHub
- Render auto-deploys server changes
- Rebuild desktop app for client changes

### 6.2 Version Management
- **Server**: Auto-deploys from GitHub
- **Desktop**: Manual rebuild and redistribution
- **Database**: Migrations as needed

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Infrastructure Setup | 2-3 hours | GitHub, Render, MongoDB |
| Code Modifications | 1-2 hours | API URL updates |
| Deployment & Testing | 2-3 hours | Infrastructure ready |
| Desktop Build | 1 hour | Code complete |
| Beta Distribution | 30 minutes | Installer ready |
| **Total** | **6-9 hours** | |

## Success Criteria

### Technical
- [ ] Server deployed and stable on Render
- [ ] Desktop app connects successfully
- [ ] All core game features functional
- [ ] No critical bugs

### User Experience
- [ ] Easy installation process
- [ ] Intuitive gameplay for new users
- [ ] Stable performance during testing sessions
- [ ] Positive tester feedback

## Risk Mitigation

### Common Issues & Solutions

**Problem**: Render free tier sleeps after 15min inactivity
**Solution**: Expect ~30 second startup delay on first request

**Problem**: MongoDB connection issues
**Solution**: Test connection strings thoroughly, check IP whitelisting

**Problem**: Desktop app can't connect to server
**Solution**: Verify CORS settings, test HTTPS/WSS connectivity

**Problem**: Build failures
**Solution**: Test all build processes locally first

## Post-Beta Plan

After successful beta testing:
1. Collect and prioritize feedback
2. Implement critical fixes
3. Plan for wider release (if desired)
4. Consider paid hosting for better performance
5. Implement auto-updates for desktop app

---

## Quick Reference

**Render URL**: `https://attrition-beta.onrender.com`
**MongoDB**: Existing Atlas cluster
**Desktop Installer**: Will be ~100-200MB .exe file
**Target Testers**: 2-3 people
**Timeline**: 1-2 days for full setup

## Notes
- Keep this as a living document
- Update status as tasks complete
- Document any issues encountered
- Save all important URLs and credentials securely

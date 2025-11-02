# Attrition GitHub Workflow

## Purpose
Guide for managing Attrition's dual-remote GitHub repository setup for source code and installer releases.

## Repository Architecture

### Dual-Remote Setup
The Attrition project uses a **single local repository** with **two GitHub remotes**:

```
Local Repository: C:\Projects\Attrition
├── origin  → github.com/BrianSMitchell/attrition-game (source code)
└── desktop → github.com/BrianSMitchell/attrition-desktop (installer releases)
```

**Why this setup?**
- **attrition-game**: Full source code repository for development, collaboration, and CI/CD
- **attrition-desktop**: Release-focused repository that triggers installer builds via GitHub Actions

---

## Daily Development Workflow

### Making Code Changes

**Step 1: Ensure clean starting state**
```powershell
# Check current status
git status

# Make sure you're on main branch
git checkout main

# Get latest changes
git pull origin main
```

**Step 2: Make your changes**
- Edit code, fix bugs, add features
- Test changes locally
- Run tests: `npm test` or equivalent

**Step 3: Commit changes**
```powershell
# Stage specific files (preferred)
git add path/to/changed/file.ts

# Or stage all changes
git add .

# Commit with descriptive message
git commit -m "type(scope): brief description" `
  -m "- Detail 1" `
  -m "- Detail 2" `
  -m "Refs: Task/Issue reference"
```

**Commit types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `chore`: Maintenance (deps, config)
- `docs`: Documentation
- `test`: Test changes

**Step 4: Push to source code repo**
```powershell
# Push to origin (attrition-game)
git push origin main
```

**Note:** During daily development, you typically only push to `origin`. The `desktop` remote is updated during releases.

---

## Release Workflow

### When to Create a Release

Create a new release when:
- Feature milestone completed
- Bug fixes ready for users
- Scheduled release cycle (e.g., weekly/monthly)
- Critical hotfix needed

### Version Numbering

Follow **Semantic Versioning** (semver): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR**: New features, backward compatible (e.g., 1.2.0 → 1.3.0)
- **PATCH**: Bug fixes, backward compatible (e.g., 1.2.5 → 1.2.6)

### Release Process

**Step 1: Prepare release commit**
```powershell
# Make sure all changes are committed
git status

# Verify all tests pass
npm test

# Optional: Update version in package.json files
# (if you maintain version numbers there)
```

**Step 2: Create and push source code**
```powershell
# Push to attrition-game (if not already done)
git push origin main
```

**Step 3: Create version tag**
```powershell
# Create annotated tag with release notes
git tag -a v1.2.6 -m "Release v1.2.6: Brief description of changes"

# View tags to confirm
git tag -l
```

**Step 4: Push tag to source repo**
```powershell
# Push tag to attrition-game
git push origin v1.2.6
```

**Step 5: Sync desktop installer repo**

This step triggers the installer build pipeline.

```powershell
# Push main branch to desktop repo
git push desktop main

# If desktop remote has diverged (common), force push
git push desktop main --force

# Push the version tag to desktop repo
git push desktop v1.2.6
```

**Step 6: Monitor build**

After pushing the tag to `desktop` remote:
1. Go to: `https://github.com/BrianSMitchell/attrition-desktop/actions`
2. Watch the GitHub Actions workflow build the installer
3. Once complete, check: `https://github.com/BrianSMitchell/attrition-desktop/releases`
4. Verify the v1.2.6 release appears with installer downloads

---

## Common Scenarios

### Scenario 1: Regular Release (Everything in Sync)

```powershell
# 1. Ensure everything is committed and tested
git status
npm test

# 2. Create version tag
git tag -a v1.2.7 -m "Release v1.2.7: New features and bug fixes"

# 3. Push to both remotes
git push origin main
git push origin v1.2.7
git push desktop main
git push desktop v1.2.7
```

### Scenario 2: Desktop Remote Has Diverged

This happens when `desktop` remote has different history than `origin`.

```powershell
# Try to push
git push desktop main

# If you get "rejected (non-fast-forward)" error:
# Force push to sync (overwrites desktop with current state)
git push desktop main --force

# Then push the tag
git push desktop v1.2.7
```

**When to force push:**
- Desktop repo is out of sync with source
- You're confident desktop should match current main exactly
- During release process (safe because desktop is release-only)

**When NOT to force push:**
- Never force push to `origin` (source code repo) without team agreement
- If others are working on desktop repo independently

### Scenario 3: Hotfix Release

Critical bug needs immediate release:

```powershell
# 1. Create hotfix branch (optional but recommended)
git checkout -b hotfix/critical-bug-fix

# 2. Make the fix
# ... edit files ...
git add .
git commit -m "fix(critical): description of fix"

# 3. Merge back to main
git checkout main
git merge hotfix/critical-bug-fix

# 4. Test thoroughly
npm test

# 5. Create patch version tag
git tag -a v1.2.8 -m "Hotfix v1.2.8: Critical bug fix"

# 6. Push to both remotes
git push origin main
git push origin v1.2.8
git push desktop main --force  # Force if needed
git push desktop v1.2.8

# 7. Delete hotfix branch
git branch -d hotfix/critical-bug-fix
```

### Scenario 4: Checking Remote Status

```powershell
# View configured remotes
git remote -v

# Check which branches exist on each remote
git branch -r

# See commits on origin that aren't on desktop
git log desktop/main..origin/main

# Fetch latest from both remotes without merging
git fetch origin
git fetch desktop
```

---

## Troubleshooting

### Problem: "Failed to push - Updates were rejected"

**Cause:** Remote has commits you don't have locally.

**Solution:**
```powershell
# Fetch and check what's different
git fetch desktop
git log main..desktop/main

# If safe to overwrite (during releases), force push
git push desktop main --force

# If you need to merge remote changes
git pull desktop main
# Resolve any conflicts, then push
git push desktop main
```

### Problem: "Tag already exists"

**Cause:** Tag with that version already exists locally or remotely.

**Solution:**
```powershell
# List existing tags
git tag -l

# Delete local tag
git tag -d v1.2.6

# Delete remote tag (if needed)
git push origin --delete v1.2.6
git push desktop --delete v1.2.6

# Create new tag
git tag -a v1.2.6 -m "Release v1.2.6"

# Push to both remotes
git push origin v1.2.6
git push desktop v1.2.6
```

### Problem: Desktop installer build fails after push

**Check:**
1. View GitHub Actions logs: `https://github.com/BrianSMitchell/attrition-desktop/actions`
2. Common causes:
   - TypeScript compilation errors (check `packages/shared/tsconfig.*`)
   - Missing dependencies (check `package.json`)
   - Environment variables not set in GitHub Secrets
   - Build script errors (check `render-build.sh` or similar)

**Recent fix example:**
```typescript
// In tsconfig.esm.json and tsconfig.cjs.json
// Override inherited Jest types that aren't available in production builds
"compilerOptions": {
  "types": ["node"]  // Remove "jest" for production configs
}
```

### Problem: Can't remember which remote is which

**Quick reference:**
```powershell
# Show remote URLs
git remote -v

# Result:
# origin → attrition-game (source code, daily pushes)
# desktop → attrition-desktop (installer releases, version tags)
```

---

## Quick Reference Commands

### Daily Development
```powershell
git add .
git commit -m "type(scope): description"
git push origin main
```

### Release (Full Process)
```powershell
# Create tag
git tag -a v1.2.6 -m "Release v1.2.6: Description"

# Push to source repo
git push origin main
git push origin v1.2.6

# Push to desktop repo (may need --force)
git push desktop main --force
git push desktop v1.2.6
```

### Check Status
```powershell
git status                    # Local changes
git remote -v                 # Show remotes
git tag -l                    # List tags
git log --oneline -10         # Recent commits
git fetch origin              # Update from origin
git fetch desktop             # Update from desktop
```

---

## Best Practices

### Commit Messages
✅ **Good:**
- `feat(game): add energy regeneration system`
- `fix(ui): correct resource display overflow`
- `refactor(services): extract player logic to PlayerService`

❌ **Bad:**
- `updates`
- `fix stuff`
- `wip`

### Version Tags
✅ **Good:**
- `v1.2.6` (with annotation explaining changes)
- Tags mark important milestones
- One tag per release

❌ **Bad:**
- `test-tag`
- `v1.2.6-final-really-this-time`
- Reusing/moving tags

### Force Pushing
✅ **Safe to force push:**
- `desktop` remote during releases (known divergence)
- Your own feature branches
- After discussing with team

❌ **Never force push:**
- `origin` main branch (without team agreement)
- Shared branches others are working on
- Without understanding why it's needed

---

## GitHub Actions Integration

### What Happens After Tag Push

**When you push a tag to `desktop` remote:**

1. **GitHub Actions Triggers**
   - Workflow file: `.github/workflows/release.yml` (or similar)
   - Triggered by: Tag push matching `v*` pattern

2. **Build Process**
   - Installs dependencies: `pnpm install`
   - Builds shared package: `pnpm --filter @game/shared build`
   - Builds desktop app: `pnpm --filter @game/desktop build`
   - Runs Electron Builder: Creates installers for platforms

3. **Release Creation**
   - Creates GitHub Release automatically
   - Attaches built installers (.exe, .dmg, .AppImage, etc.)
   - Uses tag annotation as release notes

4. **What to Monitor**
   - Build logs: Check for TypeScript errors, missing dependencies
   - Build time: Typically 5-15 minutes depending on platforms
   - Artifact sizes: Verify installer files are reasonable size

### Viewing Build Status

```powershell
# After pushing tag, monitor:
# 1. GitHub Actions: https://github.com/BrianSMitchell/attrition-desktop/actions
# 2. Release page: https://github.com/BrianSMitchell/attrition-desktop/releases

# Check from CLI (requires GitHub CLI)
gh run list --repo BrianSMitchell/attrition-desktop
gh run view --repo BrianSMitchell/attrition-desktop
```

---

## Success Indicators

**Workflow is working correctly when:**
- ✅ Daily development only touches `origin` remote
- ✅ Releases are tagged consistently (semver)
- ✅ Both remotes stay synchronized during releases
- ✅ GitHub Actions builds succeed after tag push
- ✅ Installers appear in GitHub Releases automatically
- ✅ Version numbers match across repos and installers

**Red flags:**
- ❌ Forgetting to push tags to `desktop` remote
- ❌ Force pushing `origin` without reason
- ❌ Creating releases without tags
- ❌ Inconsistent version numbering
- ❌ Build failures not investigated

---

## Related Documentation

- **Git Workflow Rule**: General Git best practices and branching strategy
- **Task List Management Rule**: How commits relate to task completion
- **Development Philosophy**: Incremental progress principles
- **electron-builder.yml**: Desktop build configuration
- **render-build.sh**: Build script for CI/CD

---

## Checklist for New Release

Use this checklist every time you create a release:

**Pre-Release:**
- [ ] All code changes committed
- [ ] All tests passing locally (`npm test`)
- [ ] Version number decided (semver)
- [ ] Release notes prepared (what's new/fixed)

**Release Process:**
- [ ] Create version tag: `git tag -a vX.Y.Z -m "Release notes"`
- [ ] Push to origin: `git push origin main && git push origin vX.Y.Z`
- [ ] Push to desktop: `git push desktop main --force && git push desktop vX.Y.Z`
- [ ] Verify tag appears on both GitHub repos

**Post-Release:**
- [ ] Monitor GitHub Actions build on attrition-desktop
- [ ] Verify release created on GitHub
- [ ] Test download and install one of the installers
- [ ] Update any documentation with new version number
- [ ] Announce release to users/team

---

## Emergency Procedures

### Rollback a Bad Release

If a release has critical issues:

```powershell
# 1. Delete the problematic tag locally
git tag -d v1.2.6

# 2. Delete from both remotes
git push origin --delete v1.2.6
git push desktop --delete v1.2.6

# 3. Delete GitHub Release manually
# Go to: https://github.com/BrianSMitchell/attrition-desktop/releases
# Click release → Delete release

# 4. Fix the issue in code
# ... make fixes ...
git add .
git commit -m "fix(critical): fix for v1.2.6 issue"

# 5. Create new patch version
git tag -a v1.2.7 -m "Release v1.2.7: Fixes issues in v1.2.6"

# 6. Release the fixed version
git push origin main
git push origin v1.2.7
git push desktop main --force
git push desktop v1.2.7
```

---

## Notes

- **Two remotes, one repo**: This is intentional. Don't create separate local clones.
- **Desktop remote diverges**: This is expected. Force push during releases is normal.
- **Tag naming**: Always prefix with `v` (e.g., `v1.2.6` not `1.2.6`)
- **Annotations matter**: Always use `-a` flag for annotated tags, not lightweight tags
- **Build time**: Installer builds take 5-15 minutes. Be patient.
- **Testing**: Always test the installer after release before announcing to users

---

**Last Updated:** 2025-11-02 (v1.2.6 release)
**Maintained By:** Development Team
**Questions?** Check Git Workflow Rule or ask in #development channel

# Changelog

All notable changes to Attrition will be documented in this file.

## [1.2.1] - 2025-10-07

### 🐛 Bug Fixes

#### Empire Resource Handling
- **FIXED**: Removed spurious `energy` field from empire-wide resources
- Energy is correctly handled as a per-base resource (not empire-wide)
- Only `credits` exist as an empire-wide resource
- Fixed client-side normalization to not include energy
- Fixed server-side empire creation to not include energy field
- Updated Supabase queries to not select energy from empires table
- Cleaned up diagnostic scripts to not display empire energy

#### Technical Improvements
- Improved data consistency between client and server
- Better alignment with game design (energy is base-specific)
- Cleaner API responses and database schema

### 📝 Documentation
- Clarified that energy is a base-level resource, not empire-level

---

## [1.2.0] - 2025-10-03

### 🚀 Major Infrastructure Update

#### Database Migration
- **BREAKING**: Migrated production database from MongoDB to Supabase (PostgreSQL)
- Implemented dual-database architecture:
  - Development: MongoDB (local)
  - Production: Supabase (cloud)
- Fresh production database - all players start with a clean slate
- Automatic database selection based on environment

#### New Features
- Added comprehensive PostgreSQL schema with all 13 game tables
- Improved database performance with optimized indexes
- Better data integrity with PostgreSQL constraints
- Foundation for future real-time features

#### Technical Improvements
- Installed and configured Supabase CLI
- Created database abstraction layer for seamless environment switching
- Updated environment configuration for dual-database support
- Added comprehensive documentation:
  - `DATABASE_MIGRATION.md` - Migration guide
  - `DEPLOYMENT.md` - Deployment checklist

#### Developer Experience
- Development workflow unchanged - continue using MongoDB locally
- Production builds automatically use Supabase
- No code changes needed when switching environments
- Clear database connection logging

### 📝 Documentation
- Updated README with dual-database architecture information
- Added troubleshooting guides for both databases
- Created deployment checklists and monitoring guides

### 🔧 Configuration
- Added `.env.production` template
- Updated `.env.example` with Supabase configuration
- Configured Supabase project with proper credentials

### 🎮 Game Changes
- **Fresh Universe**: New production database starts with zero data
- All game mechanics remain the same
- No changes to gameplay, balance, or features

---

## [1.1.1] - Previous Release

*(Previous changelog entries...)*

---

## Migration Notes

### For Players
- This is a **fresh start** - all accounts and empires are new
- No data from previous versions carries over
- Download and install the new version to play

### For Developers
- Development environment unchanged (still uses MongoDB)
- See `DATABASE_MIGRATION.md` for complete migration details
- Production deployments now automatically use Supabase

---

**Full Changelog**: https://github.com/BrianSMitchell/attrition-game/compare/v1.1.1...v1.2.0

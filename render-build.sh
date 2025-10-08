#!/bin/bash
# Render deployment build script for Attrition server
# This script installs dependencies and builds the application for production
# Modified to use ignore-scripts to avoid electron-builder issues in server-only deployment

set -e  # Exit on any error

echo "🚀 Starting Render deployment build..."

# Install dependencies while ignoring postinstall scripts to avoid desktop package electron-builder issues
echo "📦 Installing dependencies (ignoring postinstall scripts)..."
pnpm install --frozen-lockfile --ignore-scripts

# Build shared package first
echo "🔨 Building shared package..."
pnpm --filter @game/shared build

# Build server package
echo "🔨 Building server package..."
pnpm --filter @game/server build

echo "✅ Build completed successfully!"
echo "📋 Build output:"
ls -la packages/server/dist/

echo "🎯 Ready for deployment!"
#!/bin/bash
# Render deployment build script for Attrition server
# This script installs dependencies and builds the application for production

set -e  # Exit on any error

echo "🚀 Starting Render deployment build..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

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
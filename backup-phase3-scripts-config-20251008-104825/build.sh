#!/bin/bash

# Build script for Render deployment
# Ensures proper workspace dependencies are installed and built

echo "Starting build process..."

# Ensure we're in the right directory
pwd

# Install all workspace dependencies
echo "Installing workspace dependencies..."
pnpm install --frozen-lockfile

# Build shared package first
echo "Building shared package..."
pnpm --filter @game/shared build

# Build server package
echo "Building server package..."
pnpm --filter @game/server build

echo "Build complete!"

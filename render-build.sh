#!/bin/bash

# Render build script for Attrition server
set -e

echo "Starting Render build process..."
echo "Node version: $(node --version)"

# Install pnpm globally if not present
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm@8.15.0
fi

echo "PNPM version: $(pnpm --version)"

# Install all workspace dependencies (but only for shared and server)
# Use --ignore-scripts to prevent desktop package's postinstall from running
echo "Installing workspace dependencies..."
pnpm install --frozen-lockfile --filter @game/shared --filter @game/server --ignore-scripts

# Build shared package first
echo "Building shared package..."
pnpm --filter @game/shared build

# Build server package
echo "Building server package..."
pnpm --filter @game/server build

echo "Build completed successfully!"
echo "Artifacts:"
ls -la packages/server/dist/

#!/bin/bash

# Render build script for Attrition server
set -e

echo "Starting Render build process..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install dependencies for shared package only
echo "Installing shared package dependencies..."
cd packages/shared
npm ci --include=prod --include=dev
cd ../..

# Install dependencies for server package only
echo "Installing server package dependencies..."
cd packages/server
npm ci --include=prod --include=dev
cd ../..

# Build shared package first
echo "Building shared package..."
cd packages/shared
npm run build
cd ../..

# Build server package
echo "Building server package..."
cd packages/server
npm run build
cd ../..

echo "Build completed successfully!"
echo "Artifacts:"
ls -la packages/server/dist/

#!/bin/bash

# Render build script for Attrition server
set -e

echo "Starting Render build process..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build shared package first
echo "Building shared package..."
npm run build --workspace=packages/shared

# Build server package
echo "Building server package..."
npm run build --workspace=packages/server

echo "Build completed successfully!"
echo "Artifacts:"
ls -la packages/server/dist/

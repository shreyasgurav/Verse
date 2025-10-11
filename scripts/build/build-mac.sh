#!/bin/bash

# Build script for macOS
echo "🚀 Building Verse Browser for macOS..."

# Clean previous builds
rm -rf dist/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build-mac

echo "✅ macOS build complete!"
echo "📁 Output: dist/"

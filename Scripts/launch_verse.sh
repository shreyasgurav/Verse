#!/bin/bash

# Verse Browser Launch Script
# This script builds and launches Verse browser without the Xcode debugger

set -e

echo "🔨 Building Verse Browser..."
cd "$(dirname "$0")"

# Build the app
xcodebuild -project Verse.xcodeproj -scheme Verse -configuration Release build -quiet

echo "🚀 Launching Verse Browser..."

# Kill any existing instances
killall Verse 2>/dev/null || true
sleep 0.5

# Launch the app
open /Users/shreyasgurav/Library/Developer/Xcode/DerivedData/Verse-fmkvogpoiwamreavyvmnszhsvyii/Build/Products/Release/Verse.app

echo "✅ Verse Browser launched successfully!"
echo ""
echo "Features:"
echo "  ✓ Multi-tab browsing with tab bar at the top"
echo "  ✓ Click tabs to switch between them"
echo "  ✓ Click + button to create new tab"
echo "  ✓ Hover over tabs to see close button"
echo "  ✓ ⌘T to create new tab"
echo "  ✓ ⌘W to close current tab"
echo ""
echo "To stop the browser, use: killall Verse"


#!/bin/bash

# Development start script
echo "🚀 Starting Verse Browser in development mode..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start development server
echo "🔨 Starting development server..."
npm start

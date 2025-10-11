# Verse Browser

A modern, AI-powered Chromium-based browser built with Electron and SwiftUI.

## Features

- 🚀 **Chromium Engine**: Built on Electron for cross-platform compatibility
- 🤖 **AI Assistant**: Integrated AI agent for intelligent browsing and automation
- 🎨 **Modern UI**: Clean, dark-themed interface with SwiftUI integration
- 📱 **Cross-Platform**: Works on macOS, Windows, and Linux
- 🔒 **Secure**: Built with security best practices

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Project Structure

```
src/
├── electron/          # Electron main process
├── renderer/          # Browser UI and renderer process
├── shared/            # Shared utilities and types
└── macos-app/         # SwiftUI macOS wrapper

assets/
├── icons/             # Application icons
└── images/            # UI assets

docs/
├── api/               # API documentation
└── guides/            # User guides

scripts/
├── build/             # Build scripts
└── dev/               # Development scripts
```

## Development

The browser consists of two main components:

1. **Electron App**: Core browser functionality with Chromium engine
2. **SwiftUI Wrapper**: Native macOS integration and AI assistant UI

## Building

```bash
# Build for macOS
npm run build-mac

# Build for Windows
npm run build-win

# Build for Linux
npm run build-linux
```

## License

MIT License - see LICENSE file for details.

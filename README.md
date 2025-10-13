# Verse Browser

A modern, AI-powered agentic browser built with Electron and SwiftUI. Verse Browser combines the power of Chromium with intelligent automation capabilities, enabling users to accomplish complex web tasks through natural language commands.

## Features

- 🚀 **Chromium Engine**: Built on Electron for cross-platform compatibility
- 🤖 **Agentic AI**: Advanced AI agent that can plan, execute, and verify web automation tasks
- 🧠 **Chain of Thought Planning**: LLM-powered task decomposition and execution planning
- 👁️ **State Observation**: Comprehensive page state analysis using Chrome DevTools Protocol
- 🎯 **Robust Element Selection**: Multi-strategy selector generation for reliable automation
- ✅ **Action Verification**: Automatic verification of task completion and error recovery
- 🛡️ **Safety & Security**: Built-in safety mechanisms and rate limiting
- 🎨 **Modern UI**: Clean, dark-themed interface with SwiftUI integration
- 📱 **Cross-Platform**: Works on macOS, Windows, and Linux

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Agentic Browser Capabilities

Verse Browser includes a sophisticated agentic system that can:

### 🧠 Intelligent Planning
- Break down complex user goals into actionable steps
- Generate detailed execution plans using LLM reasoning
- Adapt plans based on real-time execution feedback

### 👁️ Advanced State Observation
- Comprehensive page state analysis using Chrome DevTools Protocol
- DOM structure analysis and element detection
- Accessibility tree parsing for better element targeting
- Real-time state monitoring during task execution

### 🎯 Robust Action Execution
- Multi-strategy element selection (data attributes, IDs, CSS, XPath, accessibility)
- Intelligent click, type, scroll, and navigation actions
- Automatic error recovery and retry mechanisms
- Visual fallback strategies for complex UI elements

### ✅ Verification & Recovery
- Automatic verification of action success
- Multiple verification methods (DOM changes, URL changes, text presence)
- Intelligent error recovery and plan refinement
- Comprehensive logging and debugging capabilities

### 🛡️ Safety & Security
- Rate limiting and execution time controls
- Domain blocking and whitelisting
- Code safety validation for JavaScript execution
- Input sanitization and injection prevention

## Project Structure

```
src/
├── electron/          # Electron main process
├── renderer/          # Browser UI and renderer process
├── agentic-browser/   # Agentic automation system
│   ├── core/          # Core orchestrator and verifier
│   ├── services/      # CDP and LLM services
│   ├── utils/         # Utilities for selectors, logging, safety
│   ├── types/         # Type definitions and interfaces
│   ├── config/        # Configuration management
│   ├── examples/      # Usage examples
│   └── test/          # Integration tests
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

## Usage Examples

### Basic Automation
```javascript
// Search for something on Google
await window.electronAPI.invoke('agentic-execute-goal', {
  goal: "Search for 'agentic browser' on Google",
  context: { expectedResult: 'Search results page' }
});

// Fill out a form
await window.electronAPI.invoke('agentic-execute-goal', {
  goal: "Fill out the contact form with name 'John Doe' and email 'john@example.com'",
  context: { formFields: ['name', 'email'] }
});
```

### Complex Multi-Step Tasks
```javascript
// Complex automation workflow
await window.electronAPI.invoke('agentic-execute-goal', {
  goal: `
    1. Navigate to example.com
    2. Click the login button
    3. Enter username and password
    4. Submit the form
    5. Verify successful login
    6. Navigate to the dashboard
  `,
  context: {
    credentials: { username: 'user', password: 'pass' },
    timeout: 60000
  }
});
```

### Status Monitoring
```javascript
// Get current execution status
const status = await window.electronAPI.invoke('agentic-get-status');
console.log('Current step:', status.completedSteps, 'of', status.totalSteps);

// Stop execution if needed
await window.electronAPI.invoke('agentic-stop');
```

## Development

The browser consists of three main components:

1. **Electron App**: Core browser functionality with Chromium engine
2. **Agentic Browser System**: Advanced AI-powered automation engine
3. **SwiftUI Wrapper**: Native macOS integration and AI assistant UI

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

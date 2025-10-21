# VerseBrowser

An open-source AI web automation Chrome extension that runs multi-agent systems locally in the browser. A free alternative to OpenAI Operator with support for multiple LLM providers (OpenAI, Anthropic, Gemini, Ollama, etc.).

## 📚 Documentation

All project documentation has been organized in the [`docs/`](docs/) folder:

- **[📖 Main Documentation](docs/main/)** - Project overview, privacy policy, and store descriptions
- **[🛠️ Development Guides](docs/development/)** - Coding standards, package management, and AI assistant guidelines  
- **[📦 Package Documentation](docs/packages/)** - Individual package documentation

## 🚀 Quick Start

1. **Install dependencies**: `pnpm install`
2. **Start development**: `pnpm dev`
3. **Build extension**: `pnpm build`
4. **Load in Chrome**: Load the `dist/` folder as an unpacked extension

## 🏗️ Architecture

- **Chrome Extension Manifest V3** with service workers
- **Multi-agent AI system** (Navigator, Planner, Validator)
- **React + TypeScript** UI with Tailwind CSS
- **Monorepo** with Turbo and pnpm workspaces
- **Multiple LLM providers** support

## 📋 Development Commands

```bash
# Development
pnpm dev              # Start development mode
pnpm build            # Build production version
pnpm type-check       # Run TypeScript checks
pnpm lint             # Run ESLint with auto-fix

# Testing
pnpm e2e              # Run end-to-end tests
pnpm -F chrome-extension test  # Run unit tests

# Package management
pnpm clean            # Clean build artifacts
pnpm update-version   # Update version across packages
```

## 🔗 Links

- **📚 [Full Documentation](docs/)**
- **🛠️ [Development Guidelines](docs/development/CLAUDE.md)**
- **🔒 [Privacy Policy](docs/main/PRIVACY.md)**

---

*For detailed information, please refer to the [documentation folder](docs/).*

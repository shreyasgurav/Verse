# Arc Browser - Project Structure 🏗️

## Overview
This is a production-level SwiftUI application with AI-powered browser automation capabilities. The project follows a clean, modular architecture with clear separation of concerns.

---

## 📁 Directory Structure

```
Arc/
├── 📱 App/                          # Application Entry & Configuration
│   ├── ArcApp.swift                 # SwiftUI App entry point
│   ├── ContentView.swift            # Main app view
│   ├── Info.plist                   # App configuration
│   └── Arc.entitlements             # App capabilities
│
├── 🎯 Core/                         # Core Application Components
│   ├── Models/                      # Data Models
│   │   ├── AgentMessage.swift       # Agent message model
│   │   ├── ChatMessage.swift        # Chat message model
│   │   ├── Tab.swift                # Tab data model
│   │   └── TabState.swift           # Tab state model
│   │
│   ├── ViewModels/                  # View Models (MVVM)
│   │   └── BrowserViewModel.swift   # Main browser view model
│   │
│   └── Configuration/               # App Configuration & Utilities
│       ├── ConfigurationService.swift
│       ├── MarkdownRenderer.swift
│       └── APIKeyConfigurationView.swift
│
├── ✨ Features/                     # Feature Modules
│   ├── Browser/                     # Browser Feature
│   │   ├── BrowserView.swift        # Main browser view
│   │   ├── WebView.swift            # Web view wrapper
│   │   └── TabBar.swift             # Tab bar component
│   │
│   ├── Chat/                        # Chat/Sidebar Feature
│   │   └── UnifiedChatSidebar.swift # Chat interface
│   │
│   └── Agent/                       # Agent Feature (for future expansion)
│
├── 🔧 Services/                     # Business Logic & External Services
│   ├── AI/                          # AI Integration
│   │   └── ChatGPTService.swift     # OpenAI API integration
│   │
│   ├── Automation/                  # Browser Automation
│   │   ├── AgentService.swift       # Base agent service
│   │   ├── EnhancedAgentService.swift   # Enhanced agent with planning
│   │   ├── ReliableAgentService.swift   # Production agent (PRIMARY)
│   │   ├── BrowserAutomationService.swift
│   │   ├── NativeInteractionService.swift
│   │   └── WebActionService.swift
│   │
│   └── WebScraping/                 # Web Content Extraction
│       ├── WebScrapingService.swift
│       └── EnhancedWebScrapingService.swift
│
└── 🎨 Resources/                    # App Resources
    └── Assets.xcassets/             # Images, colors, icons
        ├── AccentColor.colorset/
        ├── AppIcon.appiconset/
        └── Contents.json

Documentation/                        # Project Documentation
├── Fixes/                           # Bug Fixes & Solutions
│   ├── CRASH_FIX.md
│   ├── DEBUGGER_CRASH_SOLUTION.md
│   ├── ELEMENT_FINDING_FIXES.md
│   ├── FOCUS_FIX.md
│   ├── TAB_STATE_FIX.md
│   ├── USER_AGENT_FIX.md
│   ├── WEBKIT_FIX.md
│   ├── AGENT_INTELLIGENCE_UPGRADE.md
│   └── SMART_NAVIGATION.md
│
├── Guides/                          # User & Developer Guides
│   ├── BUILD_NOTES.md
│   ├── DEBUG_RUN_INSTRUCTIONS.md
│   ├── QUICK_START_GUIDE.md
│   └── TROUBLESHOOTING.md
│
└── Architecture/                    # Architecture Documentation
    ├── IMPLEMENTATION_SUMMARY.md
    ├── FINAL_STATUS.md
    ├── RELIABLE_AGENT_SYSTEM.md
    ├── TAB_SYSTEM.md
    └── TITLE_BAR_TABS.md

Scripts/                             # Build & Utility Scripts
├── launch_arc.sh                    # App launch script
├── test.html                        # Test HTML file
└── default.profraw                  # Profiling data

Tests/                               # Test Suites
├── ArcTests/
│   └── ArcTests.swift              # Unit tests
└── ArcUITests/
    ├── ArcUITests.swift            # UI tests
    └── ArcUITestsLaunchTests.swift

Arc.xcodeproj/                       # Xcode Project Files
README.md                            # Main project README
```

---

## 🎯 Architecture Principles

### 1. **Feature-Based Organization**
Each major feature (Browser, Chat, Agent) has its own module with:
- Views
- ViewModels (if needed)
- Feature-specific models

### 2. **Service Layer Pattern**
All business logic is in services, organized by domain:
- **AI Services**: AI/ML integrations
- **Automation Services**: Browser automation logic
- **WebScraping Services**: Content extraction

### 3. **MVVM Pattern**
- **Models**: Pure data structures (Core/Models/)
- **ViewModels**: Business logic for views (Core/ViewModels/)
- **Views**: UI components (Features/*/Views)

### 4. **Dependency Injection**
Services are injected into ViewModels and Views, making code testable and maintainable.

---

## 🔑 Key Components

### Primary Agent Service
**`Services/Automation/ReliableAgentService.swift`**
- Production-ready AI agent
- Chain-of-thought reasoning
- Action history tracking
- Goal completion detection
- Smart navigation
- Multi-step task execution

### Browser Integration
**`Features/Browser/BrowserView.swift`**
- Main browser interface
- Tab management
- Web content display

### AI Integration
**`Services/AI/ChatGPTService.swift`**
- OpenAI API communication
- Prompt management
- Response parsing

---

## 🚀 Getting Started

### Prerequisites
- Xcode 15+
- macOS 14+
- OpenAI API Key

### Setup
1. Clone the repository
2. Open `Arc.xcodeproj`
3. Add your OpenAI API key in settings
4. Build and run (⌘R)

### Configuration
- API keys: Settings → Configuration
- Agent behavior: `ReliableAgentService.swift`
- UI customization: `Resources/Assets.xcassets`

---

## 📝 Coding Standards

### File Organization
- One type per file
- File name matches type name
- Group related files in folders

### Naming Conventions
- **Types**: PascalCase (`BrowserViewModel`)
- **Variables/Functions**: camelCase (`loadWebPage`)
- **Constants**: camelCase with 'k' prefix (`kDefaultTimeout`)
- **Services**: Suffix with 'Service' (`ChatGPTService`)
- **Views**: Suffix with 'View' (`BrowserView`)

### Code Style
- Use SwiftUI best practices
- Prefer composition over inheritance
- Keep functions small and focused
- Add comments for complex logic
- Use MARK: comments for organization

### Dependencies
- Minimize external dependencies
- Use Swift Package Manager when needed
- Document all dependencies

---

## 🧪 Testing

### Unit Tests
Location: `ArcTests/`
- Test business logic
- Test ViewModels
- Test Services

### UI Tests
Location: `ArcUITests/`
- Test user flows
- Test UI components
- Test interactions

### Running Tests
```bash
# All tests
⌘U

# Specific test
⌘⌥U (in test file)
```

---

## 📚 Documentation

### Where to Find What

**Bug Fixes & Solutions**
→ `Documentation/Fixes/`

**User Guides**
→ `Documentation/Guides/QUICK_START_GUIDE.md`

**Architecture Decisions**
→ `Documentation/Architecture/`

**API Documentation**
→ Inline code comments + Quick Help (⌥ click)

---

## 🔧 Development Workflow

### Adding a New Feature
1. Create folder in `Features/`
2. Add Views, ViewModels, Models
3. Create service if needed in `Services/`
4. Update this documentation
5. Add tests

### Adding a New Service
1. Choose category (AI, Automation, WebScraping)
2. Create service file
3. Follow dependency injection pattern
4. Add tests
5. Document public API

### Fixing a Bug
1. Create fix documentation in `Documentation/Fixes/`
2. Implement fix
3. Add test to prevent regression
4. Update relevant guides

---

## 🎨 UI/UX Guidelines

### Design Principles
- Native macOS look and feel
- Clean, minimal interface
- Keyboard shortcuts for power users
- Clear visual feedback
- Smooth animations

### Color Palette
Defined in `Resources/Assets.xcassets/`
- Accent color: System accent
- Dark mode support
- High contrast support

---

## 🚀 Performance

### Best Practices
- Lazy loading for heavy views
- Async/await for all I/O
- Proper memory management
- Efficient state updates

### Profiling
Use Instruments to:
- Detect memory leaks
- Optimize CPU usage
- Reduce energy impact

---

## 🔐 Security

### API Keys
- Never commit API keys
- Use Configuration service
- Store in Keychain
- Rotate regularly

### Web Content
- Sandbox web views
- Sanitize user input
- Validate all URLs
- Handle CORS properly

---

## 📦 Build & Deploy

### Debug Build
```bash
⌘R (Run in Xcode)
```

### Release Build
```bash
1. Archive (⌘⌥⇧A)
2. Distribute App
3. Choose distribution method
```

### Scripts
- `Scripts/launch_arc.sh`: Quick launch script
- Add more scripts as needed

---

## 🤝 Contributing

### Before Contributing
1. Read this documentation
2. Check existing issues
3. Follow coding standards
4. Write tests
5. Update documentation

### Commit Guidelines
- Clear, descriptive messages
- One logical change per commit
- Reference issue numbers
- Follow conventional commits

---

## 📊 Project Status

**Current Version**: 1.0 Beta
**Status**: Active Development
**Primary Agent**: ReliableAgentService (Production-ready)

### Recent Major Updates
- ✅ Intelligent agent with memory
- ✅ Goal completion detection
- ✅ Google Forms support
- ✅ Smart navigation
- ✅ Focus management fixes
- ✅ Production-level structure

---

## 📞 Support

### Issues
Report issues with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs if applicable

### Questions
- Check `Documentation/Guides/`
- Check `Documentation/Fixes/`
- Review code comments
- Ask in discussions

---

## 📄 License

[Your License Here]

---

## 🙏 Acknowledgments

Built with:
- SwiftUI
- WebKit
- OpenAI API
- macOS AppKit

---

**Last Updated**: January 2025
**Maintainer**: [Your Name]
**Repository**: [Your Repo URL]


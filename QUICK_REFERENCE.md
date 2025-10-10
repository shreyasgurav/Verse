# Arc Browser - Quick Reference Guide 🚀

> Fast lookup for common tasks and locations

---

## 📍 Quick File Finder

| Looking for... | Go to... |
|----------------|----------|
| **App entry point** | `Arc/App/ArcApp.swift` |
| **Main view** | `Arc/App/ContentView.swift` |
| **App configuration** | `Arc/App/Info.plist` |
| **Browser UI** | `Arc/Features/Browser/BrowserView.swift` |
| **Web view** | `Arc/Features/Browser/WebView.swift` |
| **Tab bar** | `Arc/Features/Browser/TabBar.swift` |
| **Chat sidebar** | `Arc/Features/Chat/UnifiedChatSidebar.swift` |
| **🌟 Primary agent** | `Arc/Services/Automation/ReliableAgentService.swift` |
| **AI integration** | `Arc/Services/AI/ChatGPTService.swift` |
| **Web scraping** | `Arc/Services/WebScraping/EnhancedWebScrapingService.swift` |
| **Browser automation** | `Arc/Services/Automation/BrowserAutomationService.swift` |
| **Native interactions** | `Arc/Services/Automation/NativeInteractionService.swift` |
| **Tab model** | `Arc/Core/Models/Tab.swift` |
| **Browser ViewModel** | `Arc/Core/ViewModels/BrowserViewModel.swift` |
| **Configuration** | `Arc/Core/Configuration/ConfigurationService.swift` |
| **API key setup** | `Arc/Core/Configuration/APIKeyConfigurationView.swift` |
| **Assets/Images** | `Arc/Resources/Assets.xcassets/` |

---

## 🎯 Common Tasks

### Add a New Feature
```bash
# 1. Create feature folder
mkdir -p Arc/Features/YourFeature

# 2. Add your views
# Arc/Features/YourFeature/YourFeatureView.swift

# 3. Create service if needed
# Arc/Services/Category/YourFeatureService.swift

# 4. Update docs
# Documentation/Architecture/YOUR_FEATURE.md
```

### Add a New Service
```swift
// 1. Choose category: AI, Automation, or WebScraping
// 2. Create file: Arc/Services/Category/YourService.swift

import Foundation
import WebKit

class YourService: ObservableObject {
    // MARK: - Properties
    
    // MARK: - Initialization
    init() { }
    
    // MARK: - Public Methods
    func doSomething() { }
    
    // MARK: - Private Methods
    private func helper() { }
}
```

### Add a New Model
```swift
// Arc/Core/Models/YourModel.swift

import Foundation

struct YourModel: Codable, Identifiable {
    let id: UUID
    var name: String
    // ... properties
    
    init(name: String) {
        self.id = UUID()
        self.name = name
    }
}
```

### Add a New View
```swift
// Arc/Features/Category/YourView.swift

import SwiftUI

struct YourView: View {
    // MARK: - Properties
    @StateObject private var viewModel = YourViewModel()
    
    // MARK: - Body
    var body: some View {
        VStack {
            // Your UI
        }
    }
}

// MARK: - Preview
#Preview {
    YourView()
}
```

---

## 🔧 Configuration Locations

| Setting | Location | Type |
|---------|----------|------|
| **API Keys** | In-app Settings → Configuration | Runtime |
| **App Info** | `Arc/App/Info.plist` | Build-time |
| **Entitlements** | `Arc/App/Arc.entitlements` | Build-time |
| **Assets** | `Arc/Resources/Assets.xcassets/` | Build-time |
| **Scripts** | `Scripts/` | Development |

---

## 📚 Documentation Map

| Topic | Document |
|-------|----------|
| **Getting started** | `Documentation/Guides/QUICK_START_GUIDE.md` |
| **Project structure** | `PROJECT_STRUCTURE.md` |
| **Contributing** | `CONTRIBUTING.md` |
| **Troubleshooting** | `Documentation/Guides/TROUBLESHOOTING.md` |
| **Build instructions** | `Documentation/Guides/BUILD_NOTES.md` |
| **Debug guide** | `Documentation/Guides/DEBUG_RUN_INSTRUCTIONS.md` |
| **Agent system** | `Documentation/Architecture/RELIABLE_AGENT_SYSTEM.md` |
| **Tab system** | `Documentation/Architecture/TAB_SYSTEM.md` |
| **Intelligence upgrade** | `Documentation/Fixes/AGENT_INTELLIGENCE_UPGRADE.md` |
| **Smart navigation** | `Documentation/Fixes/SMART_NAVIGATION.md` |
| **Focus fix** | `Documentation/Fixes/FOCUS_FIX.md` |

---

## ⌨️ Keyboard Shortcuts

### Xcode
| Action | Shortcut |
|--------|----------|
| **Build** | ⌘B |
| **Run** | ⌘R |
| **Test** | ⌘U |
| **Stop** | ⌘. |
| **Clean** | ⌘⇧K |
| **Archive** | ⌘⌥⇧A |
| **Quick Open** | ⌘⇧O |
| **Find** | ⌘F |
| **Find in Project** | ⌘⇧F |
| **Jump to Definition** | ⌘ Click |
| **Quick Help** | ⌥ Click |

### Git
```bash
# Status
git status

# Add all
git add .

# Commit
git commit -m "message"

# Push
git push origin branch-name

# Pull latest
git pull upstream main

# Create branch
git checkout -b feature/name

# Switch branch
git checkout branch-name
```

---

## 🧪 Testing

### Run Tests
```bash
# All tests
⌘U in Xcode

# Specific test
⌘⌥U in test file

# Command line
xcodebuild test -scheme Arc
```

### Test Locations
- **Unit Tests**: `ArcTests/ArcTests.swift`
- **UI Tests**: `ArcUITests/ArcUITests.swift`

---

## 🐛 Common Issues

| Issue | Solution | Doc |
|-------|----------|-----|
| **Agent not finding elements** | Check `ReliableAgentService.swift` | `ELEMENT_FINDING_FIXES.md` |
| **Focus stuck on input** | Updated focus management | `FOCUS_FIX.md` |
| **Crash on startup** | Check debugger settings | `CRASH_FIX.md` |
| **WebView not loading** | Check WebKit config | `WEBKIT_FIX.md` |
| **Tab state issues** | See tab state fix | `TAB_STATE_FIX.md` |
| **Agent not completing** | Check goal detection | `AGENT_INTELLIGENCE_UPGRADE.md` |

---

## 📦 Build Commands

```bash
# Clean build
⌘⇧K

# Build for running
⌘B

# Build and run
⌘R

# Archive for distribution
⌘⌥⇧A

# Run tests
⌘U
```

---

## 🌳 Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# ... edit files ...

# 3. Stage changes
git add .

# 4. Commit
git commit -m "feat(scope): description"

# 5. Push
git push origin feature/my-feature

# 6. Create PR on GitHub

# 7. After merge, cleanup
git checkout main
git pull upstream main
git branch -d feature/my-feature
```

---

## 🔍 Code Search Tips

### Find by Symbol
```
⌘⇧O → Type symbol name
```

### Find in Project
```
⌘⇧F → Type search term
```

### Find Usage
```
⌘⇧F → Type exact name
```

### Quick Help
```
⌥ Click → See documentation
```

---

## 📊 Project Stats

| Metric | Value |
|--------|-------|
| **Source Files** | ~25 |
| **Services** | 9 |
| **Features** | 3 |
| **Models** | 4 |
| **Views** | 5 |
| **Documentation** | 18 |
| **Language** | Swift 5.9+ |
| **Platform** | macOS 14+ |

---

## 🚀 Deployment Checklist

- [ ] All tests passing (⌘U)
- [ ] No build warnings
- [ ] Documentation updated
- [ ] Version bumped
- [ ] Changelog updated
- [ ] Archive created (⌘⌥⇧A)
- [ ] Notarized (if distributing)
- [ ] Release notes written

---

## 🔑 Key Classes

| Class | Purpose | Location |
|-------|---------|----------|
| **ReliableAgentService** | 🌟 Production agent | `Services/Automation/` |
| **ChatGPTService** | AI integration | `Services/AI/` |
| **BrowserViewModel** | Browser logic | `Core/ViewModels/` |
| **BrowserView** | Main browser UI | `Features/Browser/` |
| **UnifiedChatSidebar** | Chat interface | `Features/Chat/` |
| **ConfigurationService** | App config | `Core/Configuration/` |
| **EnhancedWebScrapingService** | Web scraping | `Services/WebScraping/` |

---

## 💡 Pro Tips

1. **Use ⌘⇧O** to quickly open any file
2. **Use ⌥ Click** on any symbol for quick documentation
3. **Use MARK: comments** to organize your code
4. **Run tests frequently** with ⌘U
5. **Check documentation** before asking questions
6. **Follow naming conventions** from CONTRIBUTING.md
7. **Keep commits small** and focused
8. **Write tests** for new features
9. **Update docs** when changing behavior
10. **Use breakpoints** instead of print statements

---

## 🎓 Learning Path

### New Developer
1. Read `README.md`
2. Read `PROJECT_STRUCTURE.md`
3. Run the app and explore
4. Read `QUICK_START_GUIDE.md`
5. Try making a small change
6. Read `CONTRIBUTING.md`

### Contributing
1. Find an issue or feature to work on
2. Read relevant documentation
3. Create feature branch
4. Make changes
5. Write tests
6. Update documentation
7. Submit PR

---

## 📞 Getting Help

1. **Check documentation** in `Documentation/`
2. **Search existing issues** on GitHub
3. **Read troubleshooting** guide
4. **Ask in discussions** if still stuck
5. **Email support** as last resort

---

## ⚡ Speed Reference

### Most Used Files
```
Arc/Services/Automation/ReliableAgentService.swift  # Primary agent
Arc/Features/Browser/BrowserView.swift              # Browser UI
Arc/Services/AI/ChatGPTService.swift                # AI integration
Arc/Core/ViewModels/BrowserViewModel.swift          # Browser logic
```

### Most Used Docs
```
Documentation/Guides/QUICK_START_GUIDE.md           # Getting started
Documentation/Guides/TROUBLESHOOTING.md             # Common issues
PROJECT_STRUCTURE.md                                # Project structure
CONTRIBUTING.md                                     # How to contribute
```

---

**Last Updated**: January 2025  
**Keep this handy for quick reference!** 📌


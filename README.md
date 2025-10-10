# Verse Browser 🌐

> An intelligent macOS browser with AI-powered automation capabilities

[![Platform](https://img.shields.io/badge/platform-macOS-blue.svg)](https://www.apple.com/macos/)
[![Swift](https://img.shields.io/badge/swift-5.9-orange.svg)](https://swift.org/)
[![SwiftUI](https://img.shields.io/badge/SwiftUI-5.0-green.svg)](https://developer.apple.com/xcode/swiftui/)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

## Overview

Verse is a next-generation macOS browser that combines traditional web browsing with powerful AI-driven automation. Built with SwiftUI and powered by OpenAI's GPT models, Verse can understand natural language commands and autonomously perform complex web tasks.

### ✨ Key Features

- **🤖 AI-Powered Automation**: Execute complex multi-step web tasks using natural language
- **🧠 Intelligent Agent**: Advanced reasoning with action history and goal tracking
- **🎯 Smart Navigation**: Automatic detection and navigation to required websites
- **📝 Google Forms Support**: Create and fill forms automatically
- **🔍 Web Scraping**: Extract and understand page content
- **⌨️ Natural Interactions**: Human-like typing, clicking, and form filling
- **📊 Progress Tracking**: Know exactly what the agent has done and what's remaining
- **✅ Goal Detection**: Automatically stops when task is complete

---

## 🚀 Quick Start

### Prerequisites

- macOS 14.0 or later
- Xcode 15.0 or later
- OpenAI API Key ([Get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/arc-browser.git
   cd arc-browser
   ```

2. **Open in Xcode**
   ```bash
   open Verse.xcodeproj
   ```

3. **Add your OpenAI API Key**
   - Run the app (⌘R)
   - Go to Settings → Configuration
   - Enter your API key
   - Click Save

4. **Start browsing!**

---

## 📖 Usage Examples

### Example 1: Create a Google Form

```
"Create a Google Form with 5 questions about customer satisfaction"
```

**What happens:**
1. ✅ Navigates to Google Forms
2. ✅ Creates a new blank form
3. ✅ Sets a meaningful title
4. ✅ Adds 5 relevant questions
5. ✅ Completes when all questions are added

### Example 2: Search on Amazon

```
"Search for wireless headphones on Amazon"
```

**What happens:**
1. ✅ Navigates to Amazon.com
2. ✅ Types "wireless headphones" in search
3. ✅ Presses Enter to search
4. ✅ Completes when results load

### Example 3: Fill a Form

```
"Fill the contact form with name John Doe and email john@example.com"
```

**What happens:**
1. ✅ Finds the name field
2. ✅ Types "John Doe"
3. ✅ Switches to email field
4. ✅ Types "john@example.com"
5. ✅ Completes when both fields filled

---

## 🏗️ Versehitecture

Verse follows a clean, modular architecture:

```
Verse/
├── App/                    # Application entry point
├── Core/                   # Core models, viewmodels, config
├── Features/               # Feature modules (Browser, Chat, Agent)
├── Services/               # Business logic
│   ├── AI/                # OpenAI integration
│   ├── Automation/        # Browser automation
│   └── WebScraping/       # Content extraction
└── Resources/             # Assets and resources
```

For detailed structure documentation, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## 🧠 How It Works

### The Intelligent Agent

Verse's agent uses a sophisticated reasoning system:

1. **Goal Understanding**: Breaks down your request into sub-tasks
2. **Context Awareness**: Understands the current page and what's been done
3. **Action Planning**: Chooses the right action (navigate, click, type, etc.)
4. **Execution**: Performs the action with human-like behavior
5. **Progress Tracking**: Remembers what's done and what's remaining
6. **Completion Detection**: Knows when the goal is fully achieved

### Action Types

- **NAVIGATE**: Go to a URL
- **CLICK**: Click buttons, links, or elements
- **TYPE**: Type text into input fields
- **TYPE_ENTER**: Type and press Enter (for search boxes)
- **SELECT**: Choose from dropdown menus
- **WAIT**: Wait for page loading
- **COMPLETE**: Goal achieved

### Smart Features

- **Action History**: Remembers all actions taken
- **Sub-goal Tracking**: Tracks completed parts of the task
- **Element Matching**: Advanced algorithm to find the right elements
- **Focus Management**: Properly releases focus between inputs
- **Error Recovery**: Retries failed actions intelligently

---

## 📚 Documentation

- **[Quick Start Guide](Documentation/Guides/QUICK_START_GUIDE.md)** - Get up and running
- **[Project Structure](PROJECT_STRUCTURE.md)** - Understand the codebase
- **[Troubleshooting](Documentation/Guides/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Versehitecture](Documentation/Versehitecture/)** - Deep dive into design decisions
- **[Bug Fixes](Documentation/Fixes/)** - History of fixes and improvements

---

## 🛠️ Development

### Setting Up Development Environment

1. Clone the repository
2. Open `Verse.xcodeproj` in Xcode
3. Build with ⌘B
4. Run tests with ⌘U
5. Run app with ⌘R

### Coding Standards

- Follow Swift API Design Guidelines
- Use SwiftUI best practices
- Write tests for new features
- Document complex logic
- Keep files focused and small

### Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 🧪 Testing

### Running Tests

```bash
# All tests
⌘U in Xcode

# Specific test suite
⌘⌥U in test file
```

### Test Coverage

- **Unit Tests**: Core business logic
- **UI Tests**: User interactions and flows
- **Integration Tests**: Service interactions

---

## 🔐 Security

### API Key Management

- API keys are stored in macOS Keychain
- Never committed to version control
- Encrypted in transit and at rest

### Web Security

- Sandboxed WebViews
- URL validation
- XSS protection
- CORS handling

---

## 🐛 Known Issues

See [Issues](https://github.com/yourusername/arc-browser/issues) for current bugs and feature requests.

---

## 📝 Changelog

### v1.0 Beta (Current)

- ✅ Intelligent agent with memory and goal tracking
- ✅ Smart navigation to required websites
- ✅ Google Forms automation support
- ✅ Advanced element finding
- ✅ Focus management fixes
- ✅ Production-level code structure
- ✅ Comprehensive documentation

See [CHANGELOG.md](CHANGELOG.md) for full history.

---

## 🗺️ Roadmap

### Upcoming Features

- [ ] Browser extension support
- [ ] Custom automation scripts
- [ ] Voice commands
- [ ] Multi-tab coordination
- [ ] Advanced web scraping
- [ ] Form auto-fill from templates
- [ ] Scheduling automated tasks
- [ ] Export automation workflows

---

## 🤝 Support

### Getting Help

- 📖 Check the [Documentation](Documentation/)
- 🐛 Report bugs in [Issues](https://github.com/yourusername/arc-browser/issues)
- 💬 Ask questions in [Discussions](https://github.com/yourusername/arc-browser/discussions)
- 📧 Email: support@yourdomain.com

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with amazing technologies:

- **SwiftUI** - Apple's declarative UI framework
- **WebKit** - Apple's web rendering engine
- **OpenAI API** - GPT-powered intelligence
- **macOS AppKit** - Native macOS integration

Special thanks to:

- The SwiftUI community
- OpenAI for their incredible API
- All contributors and testers

---

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/arc-browser?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/arc-browser?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/yourusername/arc-browser?style=social)

---

## 🔗 Links

- **Website**: [https://yourdomain.com](https://yourdomain.com)
- **Documentation**: [https://docs.yourdomain.com](https://docs.yourdomain.com)
- **Blog**: [https://blog.yourdomain.com](https://blog.yourdomain.com)
- **Twitter**: [@yourhandle](https://twitter.com/yourhandle)

---

<p align="center">
  <b>Made with ❤️ using SwiftUI</b>
</p>

<p align="center">
  <sub>© 2025 Verse Browser. All rights reserved.</sub>
</p>

# Contributing to Arc Browser 🤝

Thank you for considering contributing to Arc Browser! This document provides guidelines and instructions for contributing.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)
- [Documentation](#documentation)

---

## 🤝 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment. Please:

- ✅ Be respectful and considerate
- ✅ Be collaborative
- ✅ Be professional
- ✅ Accept constructive criticism
- ❌ Don't harass or discriminate
- ❌ Don't share inappropriate content

---

## 🚀 Getting Started

### 1. Fork the Repository

```bash
# Click "Fork" on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/arc-browser.git
cd arc-browser
```

### 2. Set Up Upstream

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/arc-browser.git
```

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-123
```

Branch naming conventions:
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring
- `test/description` - Test additions/changes

---

## 🔧 Development Process

### Setting Up Development Environment

1. **Install Prerequisites**
   - Xcode 15+
   - macOS 14+
   - OpenAI API Key

2. **Open Project**
   ```bash
   open Arc.xcodeproj
   ```

3. **Configure API Key**
   - Run the app
   - Add your OpenAI API key in settings

4. **Build Project**
   - Press ⌘B to build
   - Press ⌘U to run tests

### Making Changes

1. **Keep Changes Focused**
   - One feature/fix per pull request
   - Don't mix refactoring with new features

2. **Write Tests**
   - Unit tests for new logic
   - UI tests for new features
   - Maintain >80% code coverage

3. **Document Changes**
   - Add code comments for complex logic
   - Update README if needed
   - Update documentation in `Documentation/`

4. **Follow Coding Standards** (see below)

---

## 💻 Coding Standards

### Swift Style Guide

#### Naming

```swift
// Types: PascalCase
class BrowserViewModel { }
struct AgentMessage { }
enum ActionType { }

// Variables/Functions: camelCase
var currentURL: URL?
func loadWebPage() { }

// Constants: camelCase with 'k' prefix
let kDefaultTimeout = 30.0
let kMaxRetries = 3

// Services: Suffix with 'Service'
class ChatGPTService { }

// Views: Suffix with 'View'
struct BrowserView: View { }
```

#### Code Organization

```swift
// MARK: - Properties
private var actionHistory: [String] = []

// MARK: - Initialization
init() { }

// MARK: - Public Methods
func startAgent() { }

// MARK: - Private Methods
private func executeAction() { }

// MARK: - Helper Methods
private func formatText() { }
```

#### Best Practices

```swift
// ✅ Good: Clear and specific
func downloadUserProfile(for userID: String) async throws -> UserProfile

// ❌ Bad: Vague
func getData(id: String) -> Any?

// ✅ Good: Guard for early returns
guard let url = URL(string: urlString) else {
    return
}

// ✅ Good: Descriptive variable names
let maximumRetryAttempts = 3
let userAuthenticationToken = token

// ❌ Bad: Cryptic names
let mra = 3
let uat = token

// ✅ Good: Use async/await
func fetchData() async throws -> Data {
    try await URLSession.shared.data(from: url)
}

// ✅ Good: Handle errors properly
do {
    let result = try await fetchData()
    processResult(result)
} catch {
    logger.error("Failed to fetch data: \(error)")
    throw DataError.fetchFailed
}
```

### SwiftUI Guidelines

```swift
// ✅ Good: Break down complex views
struct BrowserView: View {
    var body: some View {
        VStack {
            headerView
            contentView
            footerView
        }
    }
    
    private var headerView: some View {
        // Header content
    }
}

// ✅ Good: Use @ViewBuilder
@ViewBuilder
private func makeButton(_ title: String) -> some View {
    Button(title) { action() }
        .buttonStyle(.bordered)
}

// ✅ Good: Extract reusable components
struct ActionButton: View {
    let title: String
    let action: () -> Void
    
    var body: some View {
        Button(title, action: action)
            .buttonStyle(.bordered)
    }
}
```

### File Structure

```swift
//
//  FileName.swift
//  Arc
//
//  Brief description of what this file does
//

import SwiftUI
import Combine

// MARK: - Main Type

/// Detailed description of the type
/// - Note: Any important notes
/// - Important: Critical information
class ClassName {
    
    // MARK: - Properties
    
    // MARK: - Initialization
    
    // MARK: - Public Methods
    
    // MARK: - Private Methods
}

// MARK: - Supporting Types

// MARK: - Extensions

extension ClassName {
    // Extension code
}
```

### Documentation

```swift
/// Brief one-line description
///
/// Detailed description with usage examples
/// and important information.
///
/// - Parameters:
///   - param1: Description of param1
///   - param2: Description of param2
/// - Returns: Description of return value
/// - Throws: Conditions that cause errors
///
/// - Example:
/// ```swift
/// let result = try await fetchData(userID: "123")
/// ```
///
/// - Note: Additional important information
/// - Warning: Critical warnings
func fetchData(userID: String, options: Options) async throws -> Data {
    // Implementation
}
```

---

## 🔍 Pull Request Process

### Before Submitting

1. **Update from Main**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run Tests**
   ```bash
   # In Xcode: ⌘U
   # All tests must pass
   ```

3. **Check for Linting Issues**
   - No warnings in Xcode
   - Follow Swift style guide

4. **Update Documentation**
   - Update README if needed
   - Add to CHANGELOG.md
   - Update relevant docs in `Documentation/`

### Creating Pull Request

1. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open Pull Request on GitHub**

3. **Fill Out PR Template**
   - Clear title
   - Description of changes
   - Related issue numbers
   - Screenshots (if UI changes)
   - Test coverage

### PR Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added
- [ ] UI tests added
- [ ] Manual testing completed
- [ ] All tests passing

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
```

### Review Process

1. **Automated Checks**
   - Build must succeed
   - Tests must pass
   - No linting errors

2. **Code Review**
   - At least one approval required
   - Address all comments
   - Make requested changes

3. **Merge**
   - Squash and merge (usually)
   - Delete branch after merge

---

## 🐛 Reporting Bugs

### Before Reporting

1. Check existing issues
2. Try latest version
3. Search documentation

### Bug Report Template

```markdown
**Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen

**Actual Behavior**
What actually happened

**Screenshots**
If applicable

**Environment**
- macOS Version: [e.g., 14.0]
- Xcode Version: [e.g., 15.0]
- App Version: [e.g., 1.0]

**Additional Context**
Any other relevant information
```

---

## 💡 Feature Requests

### Before Requesting

1. Check existing feature requests
2. Ensure it aligns with project goals
3. Consider implementation complexity

### Feature Request Template

```markdown
**Problem**
Describe the problem this feature would solve

**Proposed Solution**
Describe your proposed solution

**Alternatives Considered**
Other solutions you've considered

**Additional Context**
Mockups, examples, references

**Benefits**
- Benefit 1
- Benefit 2

**Potential Drawbacks**
- Drawback 1
- Drawback 2
```

---

## 📝 Documentation

### Types of Documentation

1. **Code Comments**
   - Explain WHY, not WHAT
   - Document complex algorithms
   - Add examples for public APIs

2. **README Updates**
   - Keep features list updated
   - Update usage examples
   - Add new configuration options

3. **Architecture Docs**
   - Document design decisions
   - Explain patterns used
   - Add diagrams if helpful

4. **Fix Documentation**
   - Document bugs and solutions
   - Explain root cause
   - Add prevention tips

### Documentation Style

- Use clear, concise language
- Include code examples
- Add screenshots/diagrams
- Keep formatting consistent
- Update regularly

---

## ✅ Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

### Examples

```bash
feat(agent): add action history tracking

- Implement actionHistory array
- Track completed sub-goals
- Update AI prompt with history

Closes #123
```

```bash
fix(browser): resolve tab switching crash

Fixed crash when rapidly switching between tabs.
Added guard checks and proper state management.

Fixes #456
```

---

## 🎯 Project Structure

When adding new files, follow the structure:

```
Arc/
├── App/                    # App entry & main views
├── Core/
│   ├── Models/            # Data models
│   ├── ViewModels/        # ViewModels
│   └── Configuration/     # Config & utilities
├── Features/
│   ├── Browser/          # Browser feature
│   ├── Chat/             # Chat feature
│   └── Agent/            # Agent feature
├── Services/
│   ├── AI/               # AI services
│   ├── Automation/       # Automation services
│   └── WebScraping/      # Scraping services
└── Resources/            # Assets
```

---

## 🔒 Security

### Reporting Security Issues

**Do NOT create public issues for security vulnerabilities.**

Email security@yourdomain.com with:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## 📊 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

---

## ❓ Questions?

- Check [Documentation](Documentation/)
- Ask in [Discussions](https://github.com/yourusername/arc-browser/discussions)
- Email: contribute@yourdomain.com

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Arc Browser! 🎉**


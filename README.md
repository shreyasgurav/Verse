# Verse

An open-source AI web automation Chrome extension that runs multi-agent systems locally in your browser. A free alternative to OpenAI Operator with support for multiple LLM providers.

## What is Verse?

Verse is an AI-powered browser automation tool that can:
- Navigate websites automatically
- Fill out forms and interact with web elements
- Extract data from web pages
- Perform complex multi-step tasks
- Answer questions about web content

## Demo Video

https://github.com/shreyasgurav/VerseBrowser/raw/main/verse-demo.mp4

*Watch Verse in action - see how our multi-agent system automates complex web tasks*

## Key Features

- **Multi-Agent System**: Specialized AI agents (Planner, Navigator, Validator) work together
- **Local Processing**: Everything runs in your browser - your data stays private
- **Multiple LLM Support**: Works with OpenAI, Anthropic, Gemini, Ollama, and more
- **Free & Open Source**: No subscription fees, just use your own API keys
- **Real-time Chat Interface**: Interactive side panel for task management


## Quick Start

1. **Install the extension** from Chrome Web Store or manually
2. **Configure API keys** in the extension settings
3. **Open the side panel** by clicking the Verse icon in your toolbar
4. **Start automating** by typing what you want to do

### Example Tasks
- "Find a laptop under $1000 on Amazon"
- "Fill out this contact form with my information"
- "Extract all product prices from this page"
- "Navigate to Gmail and check my inbox"

## Supported LLM Providers

- **OpenAI**: GPT-4, GPT-3.5, GPT-5
- **Anthropic**: Claude Sonnet, Claude Haiku
- **Google**: Gemini Pro, Gemini Flash
- **Ollama**: Local models
- **Groq**: Fast inference
- **Custom**: OpenAI-compatible APIs

## Development

### Prerequisites
- Node.js (v22.12.0+)
- pnpm (v9.15.1+)

### Build Instructions
```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build for production
pnpm build
```

## Privacy

- All processing happens locally in your browser
- Your credentials and data never leave your device
- Optional anonymous analytics can be disabled
- You control your own API keys

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

- **Repository**: [https://github.com/shreyasgurav/Verse](https://github.com/shreyasgurav/Verse)
- **Issues**: Report bugs and request features
- **Pull Requests**: Submit improvements and fixes

---

Made with ❤️ by the Shreyas Gurav.
import '../components/LandingPage.css';
import './Pages.css';

export default function Features() {
  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <a href="/" className="logo">
              <img src="/verse-logo.png" alt="Verse - AI Browser Automation" />
            </a>
            <nav className="nav">
              <a href="/features" className="nav-link active">
                Features
              </a>
              <a href="/pricing" className="nav-link">
                Pricing
              </a>
              <a href="/about" className="nav-link">
                About
              </a>
              <a
                href="https://chromewebstore.google.com/detail/verse-agentic-browser/eilgeegkhgchcfhekepmojbocceamoee"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-download-header">
                Get for Chrome
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-content">
        <div className="container">
          <article className="content-section">
            <h1 className="page-title">Verse Features</h1>
            <p className="page-subtitle">
              Everything you need to automate web tasks with AI. Verse combines intelligent planning, precise execution,
              and natural language understanding.
            </p>

            {/* Core Features Grid */}
            <section className="features-grid-page">
              <div className="feature-card-page">
                <div className="feature-icon-wrapper">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3>Natural Language Commands</h3>
                <p>
                  Describe tasks in plain English. Say "Extract all product prices from this page" or "Fill out this job
                  application with my resume data" and Verse understands and executes.
                </p>
              </div>

              <div className="feature-card-page">
                <div className="feature-icon-wrapper">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <h3>Multi-Agent System</h3>
                <p>
                  Specialized AI agents work together: Navigator handles interactions, Planner creates strategies, and
                  Validator ensures accuracy. This architecture handles complex, multi-step workflows.
                </p>
              </div>

              <div className="feature-card-page">
                <div className="feature-icon-wrapper">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 9h6M9 12h6M9 15h4" />
                  </svg>
                </div>
                <h3>Automatic Form Filling</h3>
                <p>
                  Automatically fill out job applications, surveys, contact forms, and registration forms. Verse
                  understands form context and fills fields intelligently based on your data.
                </p>
              </div>

              <div className="feature-card-page">
                <div className="feature-icon-wrapper">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <h3>Data Extraction</h3>
                <p>
                  Extract structured data from websites—product listings, contact information, pricing tables, and more.
                  Export to formats you can use immediately.
                </p>
              </div>

              <div className="feature-card-page">
                <div className="feature-icon-wrapper">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <h3>Research Automation</h3>
                <p>
                  Automate research across multiple websites. Verse can navigate documentation, compare products, gather
                  information, and compile findings systematically.
                </p>
              </div>

              <div className="feature-card-page">
                <div className="feature-icon-wrapper">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                </div>
                <h3>Complex Tool Navigation</h3>
                <p>
                  Navigate dashboards, admin panels, and professional software with AI guidance. No technical expertise
                  needed—just describe what you want to accomplish.
                </p>
              </div>
            </section>

            {/* LLM Support Section */}
            <section className="text-section">
              <h2>Bring Your Own AI</h2>
              <p>
                Verse supports multiple LLM providers, giving you complete control over your AI backend. Use your
                existing API keys with:
              </p>
              <div className="provider-grid">
                <div className="provider-card">
                  <h4>OpenAI</h4>
                  <p>GPT-4, GPT-4o, GPT-3.5 Turbo</p>
                </div>
                <div className="provider-card">
                  <h4>Anthropic</h4>
                  <p>Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku</p>
                </div>
                <div className="provider-card">
                  <h4>Google</h4>
                  <p>Gemini Pro, Gemini 1.5</p>
                </div>
                <div className="provider-card">
                  <h4>Local Models</h4>
                  <p>Ollama, LM Studio, any OpenAI-compatible API</p>
                </div>
              </div>
            </section>

            {/* Privacy Section */}
            <section className="text-section highlight-section">
              <h2>Privacy-First Architecture</h2>
              <p>
                <strong>Verse runs 100% locally in your browser.</strong> We don't run servers that process your data.
                Your browsing activity, form data, and automation tasks never touch our infrastructure.
              </p>
              <ul className="feature-list">
                <li>All automation executes locally on your machine</li>
                <li>API keys stored securely in your browser only</li>
                <li>No telemetry, no tracking, no data collection</li>
                <li>Direct communication between your browser and your chosen AI provider</li>
              </ul>
            </section>

            {/* Comparison Section */}
            <section className="text-section">
              <h2>How Verse Compares</h2>
              <p>
                Unlike traditional automation tools that require coding, recording, or complex setup, Verse uses AI to
                understand your intent and execute intelligently:
              </p>
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Verse</th>
                    <th>Traditional RPA</th>
                    <th>Browser Macros</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Setup Required</td>
                    <td className="highlight">None—just describe</td>
                    <td>Complex scripting</td>
                    <td>Recording needed</td>
                  </tr>
                  <tr>
                    <td>Handles Page Changes</td>
                    <td className="highlight">Adapts automatically</td>
                    <td>Scripts break</td>
                    <td>Recordings break</td>
                  </tr>
                  <tr>
                    <td>Complex Decisions</td>
                    <td className="highlight">AI-powered reasoning</td>
                    <td>Manual conditionals</td>
                    <td>Limited</td>
                  </tr>
                  <tr>
                    <td>Learning Curve</td>
                    <td className="highlight">Speak English</td>
                    <td>Programming required</td>
                    <td>Tool-specific</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="cta-section-page">
              <h2>Start Automating Today</h2>
              <p>Download Verse for Chrome and automate your first task in minutes.</p>
              <a
                href="https://chromewebstore.google.com/detail/verse-agentic-browser/eilgeegkhgchcfhekepmojbocceamoee"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-download">
                Download for Chrome — Free
              </a>
            </section>
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <img src="/verse-logo.png" alt="Verse" />
            </div>
            <nav className="footer-nav">
              <a href="/features">Features</a>
              <a href="/pricing">Pricing</a>
              <a href="/about">About</a>
              <a href="/privacy">Privacy</a>
            </nav>
            <div className="footer-socials">
              <a
                href="https://www.linkedin.com/company/versebrowserai"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon"
                aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/tryverseai/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon"
                aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

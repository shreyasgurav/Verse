import '../components/LandingPage.css';
import './Pages.css';

export default function About() {
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
              <a href="/features" className="nav-link">
                Features
              </a>
              <a href="/pricing" className="nav-link">
                Pricing
              </a>
              <a href="/about" className="nav-link active">
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
            <h1 className="page-title">About Verse - AI Browser Automation</h1>

            <section className="text-section">
              <h2>What is Verse?</h2>
              <p>
                Verse is an AI-powered browser automation extension that allows users to automate websites using natural
                language. Instead of writing scripts or recording macros, users describe what they want to do, and
                Verse's AI agents plan and execute the task directly in the browser.
              </p>
              <p>
                Verse is designed for product managers, growth teams, marketers, researchers, and anyone who spends
                significant time on repetitive web tasks. Whether you need to extract data from multiple pages, fill out
                forms, conduct research, or navigate complex web applications, Verse handles it automatically.
              </p>
            </section>

            <section className="text-section highlight-section">
              <h2>Why Verse Exists</h2>
              <p>
                Most browser automation tools are fragile, complex, or require technical expertise. Scripts break when
                websites change. Recordings become outdated. Learning automation frameworks takes weeks.
              </p>
              <p>
                Verse was built to make automation accessible to anyone by letting AI handle planning, decision-making,
                and execution. You focus on what you want to accomplish. Verse figures out how to do it.
              </p>
            </section>

            <section className="text-section">
              <h2>How Verse Works</h2>
              <p>
                Verse employs a sophisticated <strong>multi-agent system architecture</strong> where specialized AI
                agents collaborate to accomplish your goals:
              </p>
              <ul className="feature-list">
                <li>
                  <strong>Navigator Agent:</strong> Handles DOM interactions, clicks, scrolling, and element selection
                  with precision
                </li>
                <li>
                  <strong>Planner Agent:</strong> Creates strategic workflows to break complex tasks into manageable
                  steps
                </li>
                <li>
                  <strong>Validator Agent:</strong> Ensures tasks are completed correctly and handles error recovery
                </li>
              </ul>
              <p>
                This architecture allows Verse to handle complex, multi-step tasks that would take hours manually,
                completing them in minutes with consistent accuracy.
              </p>
            </section>

            <section className="text-section">
              <h2>Who Should Use Verse?</h2>
              <p>Verse is built for professionals who want to reclaim their time from repetitive web tasks:</p>
              <ul className="feature-list">
                <li>
                  <strong>Product Managers:</strong> Automate competitive research and data gathering
                </li>
                <li>
                  <strong>Growth Teams:</strong> Streamline lead generation and outreach workflows
                </li>
                <li>
                  <strong>Researchers:</strong> Collect data from multiple sources automatically
                </li>
                <li>
                  <strong>Recruiters:</strong> Fill out job applications and gather candidate information
                </li>
                <li>
                  <strong>E-commerce Operators:</strong> Monitor pricing and product availability
                </li>
                <li>
                  <strong>Anyone:</strong> Who is tired of repetitive clicking and copying
                </li>
              </ul>
            </section>

            <section className="text-section">
              <h2>Our Approach to Privacy</h2>
              <p>
                <strong>Verse runs entirely in your browser.</strong> All automation happens locally on your machine.
                Your data never touches our servers. We do not collect, store, or transmit any personal information.
              </p>
              <p>
                You bring your own API keys for the AI model of your choice (OpenAI, Anthropic Claude, Google Gemini, or
                local models via Ollama). This means you have complete control over your data and AI interactions.
              </p>
            </section>

            <section className="text-section">
              <h2>Open and Extensible</h2>
              <p>
                Verse supports multiple LLM providers, giving you the flexibility to choose the AI that works best for
                your needs and budget. Whether you prefer the latest GPT models, Claude's nuanced understanding,
                Gemini's speed, or privacy-focused local models, Verse works with them all.
              </p>
            </section>

            <section className="cta-section-page">
              <h2>Ready to Automate?</h2>
              <p>Join thousands of professionals who are saving hours every week with Verse.</p>
              <a
                href="https://chromewebstore.google.com/detail/verse-agentic-browser/eilgeegkhgchcfhekepmojbocceamoee"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-download">
                Download for Chrome - Free
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

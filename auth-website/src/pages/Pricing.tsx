import '../components/LandingPage.css';
import './Pages.css';

export default function Pricing() {
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
              <a href="/pricing" className="nav-link active">
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
            <h1 className="page-title">Simple, Transparent Pricing</h1>
            <p className="page-subtitle">
              Verse is a free AI-powered browser automation extension. You only pay for the AI model you choose to use.
            </p>

            {/* Pricing Cards */}
            <section className="pricing-grid">
              <div className="pricing-card featured">
                <div className="pricing-badge">Free Forever</div>
                <h3>Verse Extension</h3>
                <div className="price">
                  <span className="price-amount">$0</span>
                  <span className="price-period">forever</span>
                </div>
                <p className="pricing-description">
                  Full access to all Verse features. No subscriptions, no hidden fees, no limits.
                </p>
                <ul className="pricing-features">
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                    Natural language automation
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                    Multi-agent AI system
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                    Form filling automation
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                    Data extraction
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                    Research automation
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                    All LLM providers supported
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                    Local execution (privacy-first)
                  </li>
                  <li>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                    Unlimited tasks
                  </li>
                </ul>
                <a
                  href="https://chromewebstore.google.com/detail/verse-agentic-browser/eilgeegkhgchcfhekepmojbocceamoee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-download">
                  Download for Chrome
                </a>
              </div>
            </section>

            {/* Pricing Positioning */}
            <section className="text-section highlight-section">
              <p>
                Because Verse runs locally in your browser and does not operate servers, there are no subscriptions or
                platform fees. This makes Verse one of the most cost-effective AI browser automation tools available.
              </p>
            </section>

            {/* Who Pricing is Best For */}
            <section className="text-section">
              <h2>Who Verse Pricing is Best For</h2>
              <ul className="feature-list">
                <li>Individuals and freelancers</li>
                <li>Students and researchers</li>
                <li>Startups and growth teams</li>
                <li>Privacy-conscious users</li>
              </ul>
            </section>

            {/* AI Provider Costs Section */}
            <section className="text-section">
              <h2>AI Provider Costs</h2>
              <p>
                Verse uses AI models to understand and execute your tasks. You bring your own API keys, so you pay the
                AI provider directly based on usage. Here is what typical tasks cost:
              </p>

              <div className="cost-examples">
                <div className="cost-card">
                  <h4>Simple Tasks</h4>
                  <p className="cost-range">~$0.01 - $0.05</p>
                  <p>Form filling, single-page extraction, basic navigation</p>
                </div>
                <div className="cost-card">
                  <h4>Medium Tasks</h4>
                  <p className="cost-range">~$0.05 - $0.20</p>
                  <p>Multi-page research, complex forms, data comparison</p>
                </div>
                <div className="cost-card">
                  <h4>Complex Tasks</h4>
                  <p className="cost-range">~$0.20 - $0.50</p>
                  <p>Extended workflows, multiple sites, iterative processing</p>
                </div>
              </div>

              <p className="cost-note">
                * Costs vary based on the LLM provider and model you choose. Use local models with Ollama for $0 cost
                after initial setup.
              </p>
            </section>

            {/* Provider Comparison */}
            <section className="text-section">
              <h2>Choose Your AI Provider</h2>
              <p>Verse works with your preferred AI provider. Here is a quick comparison:</p>
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Best For</th>
                    <th>Typical Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>OpenAI (GPT-4o)</strong>
                    </td>
                    <td>Fast, reliable, great all-rounder</td>
                    <td>$2.50-10 / 1M tokens</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Anthropic (Claude)</strong>
                    </td>
                    <td>Complex reasoning, nuanced tasks</td>
                    <td>$3-15 / 1M tokens</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Google (Gemini)</strong>
                    </td>
                    <td>Fast responses, good value</td>
                    <td>$0.50-7 / 1M tokens</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Ollama (Local)</strong>
                    </td>
                    <td>Privacy, offline use, zero API cost</td>
                    <td>Free (uses your hardware)</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* FAQ Section */}
            <section className="text-section">
              <h2>Pricing FAQ</h2>

              <div className="faq-item-page">
                <h4>Why is Verse free?</h4>
                <p>
                  We believe browser automation should be accessible to everyone. By letting you bring your own AI
                  provider, we eliminate server costs and can offer Verse without subscriptions.
                </p>
              </div>

              <div className="faq-item-page">
                <h4>Will there ever be a paid version?</h4>
                <p>
                  We may introduce optional premium features in the future, but the core automation functionality will
                  always remain free.
                </p>
              </div>

              <div className="faq-item-page">
                <h4>How do I get API keys?</h4>
                <p>
                  Sign up at your preferred provider's website (OpenAI, Anthropic, or Google AI Studio) and create an
                  API key. Then paste it into Verse's settings. It takes about 2 minutes.
                </p>
              </div>

              <div className="faq-item-page">
                <h4>Can I use free AI models?</h4>
                <p>
                  Yes! Use Ollama to run open-source models locally on your computer at zero cost. This also provides
                  maximum privacy since nothing leaves your machine.
                </p>
              </div>
            </section>

            <section className="cta-section-page">
              <h2>Ready to Save Hours Every Week?</h2>
              <p>Join thousands of professionals automating their web tasks with Verse.</p>
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

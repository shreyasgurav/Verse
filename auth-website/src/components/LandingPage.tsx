import { useEffect, useRef, useState } from 'react';

interface LandingPageProps {
  onSignIn: () => void;
  isAuthenticated: boolean;
  userName?: string;
  onSignOut?: () => void;
}

export default function LandingPage({ onSignIn, isAuthenticated, onSignOut }: LandingPageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set video properties
    video.muted = true;
    video.loop = true;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Video is in viewport - reset to start and play
            video.currentTime = 0;
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch((error) => {
                console.error('Error playing video:', error);
              });
            }
          } else {
            // Video is out of viewport - pause and reset to start
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      {
        threshold: 0.3, // Trigger when 30% of video is visible
        rootMargin: '0px',
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <img src="/verse-logo.png" alt="Verse" />
            </div>
            <nav className="nav">
              {isAuthenticated ? (
                <button onClick={onSignOut} className="btn-signin">
                  Sign Out
                </button>
              ) : (
                <button onClick={onSignIn} className="btn-signin">
                  Sign In
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-title-wrapper">
              <h1 className="hero-title">
                <span className="hero-title-line">Automate anything</span>
                <span className="hero-title-line">on the web.</span>
              </h1>
            </div>
            <div className="hero-subtitle-wrapper">
              <p className="hero-subtitle">
                Verse turns Chrome into an Agentic Browser. 
                Just describe what you need, and watch it work.
              </p>
            </div>
            <div className="hero-cta">
              <a 
                href="https://chromewebstore.google.com/detail/verse-agentic-browser/eilgeegkhgchcfhekepmojbocceamoee" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-download"
              >
                Download for Chrome
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="demo-section">
        <div className="container">
          <div className="video-container">
            <div className="video-wrapper">
              <video
                ref={videoRef}
                src="/demo-video.mov"
                playsInline
                muted
                loop
                preload="auto"
                className="demo-video"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="use-cases">
        <div className="container">
          <div className="section-header">
            <h2>Built for real workflows</h2>
            <p>From simple tasks to complex automation</p>
          </div>
          <div className="use-cases-grid">
            <div className="use-case-card">
              <h3>Data extraction</h3>
              <p>Pull information from multiple pages and compile into structured formats.</p>
            </div>
            <div className="use-case-card">
              <h3>Form filling</h3>
              <p>Automatically fill out applications, surveys, and repetitive forms.</p>
            </div>
            <div className="use-case-card">
              <h3>Research tasks</h3>
              <p>Navigate documentation, compare products, and gather information across sites.</p>
            </div>
            <div className="use-case-card">
              <h3>Navigate complex tools</h3>
              <p>Move through dashboards and professional software with confident guidance—no technical expertise needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="container">
          <div className="section-header">
            <h2>Frequently asked questions</h2>
          </div>
          <div className="faq-list">
            <div className="faq-item">
              <button 
                className="faq-question" 
                onClick={() => toggleFaq(0)}
                aria-expanded={openFaq === 0}
              >
                <span>What is Verse?</span>
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={openFaq === 0 ? 'faq-icon open' : 'faq-icon'}
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              <div className={openFaq === 0 ? "faq-answer open" : "faq-answer"}>
                <p>
                  Verse is an AI-powered browser automation extension that turns Chrome into an intelligent automation engine. 
                  Simply describe what you need in plain English, and Verse's multi-agent system will plan and execute the task automatically.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <button 
                className="faq-question" 
                onClick={() => toggleFaq(1)}
                aria-expanded={openFaq === 1}
              >
                <span>How does Verse work?</span>
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={openFaq === 1 ? 'faq-icon open' : 'faq-icon'}
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              <div className={openFaq === 1 ? "faq-answer open" : "faq-answer"}>
                <p>
                  Verse uses a multi-agent system with specialized AI agents that work together to understand your task, 
                  plan the workflow, and execute actions. The Navigator handles DOM interactions, the Planner creates 
                  strategies, and the Validator ensures tasks are completed correctly.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <button 
                className="faq-question" 
                onClick={() => toggleFaq(2)}
                aria-expanded={openFaq === 2}
              >
                <span>Is Verse free to use?</span>
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={openFaq === 2 ? 'faq-icon open' : 'faq-icon'}
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              <div className={openFaq === 2 ? "faq-answer open" : "faq-answer"}>
                <p>
                  Yes, Verse is free to use. However, you'll need to provide your own API keys 
                  for the LLM provider you choose to use (OpenAI, Anthropic, Gemini, or others). Verse runs entirely 
                  in your browser, so you have full control over your AI backend.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <button 
                className="faq-question" 
                onClick={() => toggleFaq(3)}
                aria-expanded={openFaq === 3}
              >
                <span>Is my data private and secure?</span>
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={openFaq === 3 ? 'faq-icon open' : 'faq-icon'}
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              <div className={openFaq === 3 ? "faq-answer open" : "faq-answer"}>
                <p>
                  Absolutely. Verse runs entirely in your browser, meaning all automation happens locally on your machine. 
                  Your data never leaves your computer unless you explicitly send it to an LLM provider (which you control).
                </p>
              </div>
            </div>

            <div className="faq-item">
              <button 
                className="faq-question" 
                onClick={() => toggleFaq(4)}
                aria-expanded={openFaq === 4}
              >
                <span>Do I need API keys? Which LLM providers are supported?</span>
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={openFaq === 4 ? 'faq-icon open' : 'faq-icon'}
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              <div className={openFaq === 4 ? "faq-answer open" : "faq-answer"}>
                <p>
                  Yes, you'll need to provide your own API keys for the LLM provider of your choice. Verse supports 
                  OpenAI, Anthropic (Claude), Google Gemini, and any provider compatible with Ollama for local models. 
                  You have full control over which provider to use and can switch between them in the settings.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <button 
                className="faq-question" 
                onClick={() => toggleFaq(5)}
                aria-expanded={openFaq === 5}
              >
                <span>How do I get started?</span>
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={openFaq === 5 ? 'faq-icon open' : 'faq-icon'}
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              <div className={openFaq === 5 ? "faq-answer open" : "faq-answer"}>
                <p>
                  Getting started is simple: download the extension from the Chrome Web Store, sign in with your Google 
                  account, configure your preferred LLM provider with your API keys in the settings, and you're ready to go. 
                  Just open the side panel and describe what you want to automate in plain English.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <img src="/verse-logo.png" alt="Verse" />
            </div>
            <div className="footer-socials">
              <a 
                href="https://www.linkedin.com/company/versebrowserai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-icon"
                aria-label="LinkedIn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/>
                </svg>
              </a>
              <a 
                href="https://www.instagram.com/tryverseai/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-icon"
                aria-label="Instagram"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

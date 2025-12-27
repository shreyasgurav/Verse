import { useEffect, useRef, useState } from 'react';

interface LandingPageProps {}

export default function LandingPage({}: LandingPageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const heroTitleRef = useRef<HTMLDivElement>(null);
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const [isHeroTitleVisible, setIsHeroTitleVisible] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.loop = true;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            video.currentTime = 0;
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.error('Error playing video:', error);
              });
            }
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '0px',
      },
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const heroTitleElement = heroTitleRef.current;
    const videoSectionElement = videoSectionRef.current;

    if (heroTitleElement) {
      setTimeout(() => {
        setIsHeroTitleVisible(true);

        setTimeout(() => {
          if (videoSectionElement) {
            const rect = videoSectionElement.getBoundingClientRect();
            const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;

            if (isInViewport) {
              setIsVideoVisible(true);
            } else {
              const observerOptions = {
                threshold: 0.2,
                rootMargin: '0px 0px -50px 0px',
              };

              const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                  if (entry.isIntersecting) {
                    setIsVideoVisible(true);
                    observer.unobserve(videoSectionElement);
                  }
                });
              }, observerOptions);

              observer.observe(videoSectionElement);

              return () => {
                observer.unobserve(videoSectionElement);
              };
            }
          }
        }, 800);
      }, 100);
    } else {
      if (videoSectionElement) {
        const observerOptions = {
          threshold: 0.2,
          rootMargin: '0px 0px -50px 0px',
        };

        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setIsVideoVisible(true);
            }
          });
        }, observerOptions);

        observer.observe(videoSectionElement);

        return () => {
          observer.unobserve(videoSectionElement);
        };
      }
    }
  }, []);

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <a href="/" className="logo">
              <img src="/verse-logo.png" alt="Verse - AI Browser Automation Extension" />
            </a>
            <nav className="nav" aria-label="Main navigation">
              <a href="/features" className="nav-link">
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

      {/* Hero Section */}
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="container">
            <div className="hero-content">
              <div ref={heroTitleRef} className={`hero-title-wrapper ${isHeroTitleVisible ? 'animate-in' : ''}`}>
                <h1 id="hero-title" className="hero-title">
                  <span className="hero-title-line">AI-powered browser</span>
                  <span className="hero-title-line">automation for Chrome</span>
                </h1>
              </div>
              <div className="hero-subtitle-wrapper">
                <p className="hero-subtitle">
                  Verse is an AI-powered browser automation extension that lets you automate websites using plain
                  English. Describe tasks like data extraction, form filling, research, or navigating complex web apps,
                  and Verse executes them directly in your browser using a multi-agent AI system.
                </p>
              </div>
              <div className="hero-cta">
                <a
                  href="https://chromewebstore.google.com/detail/verse-agentic-browser/eilgeegkhgchcfhekepmojbocceamoee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-download">
                  Download for Chrome - Free
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Video Section */}
        <section
          ref={videoSectionRef}
          className={`demo-section ${isVideoVisible ? 'animate-in' : ''}`}
          aria-label="Product demonstration video">
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
                  aria-label="Verse browser automation demo">
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </section>

        {/* Best For / Not For Section */}
        <section className="best-for-section" aria-labelledby="best-for-title">
          <div className="container">
            <div className="best-for-grid">
              <div className="best-for-card best-for">
                <h3>Best for</h3>
                <ul>
                  <li>Data extraction and scraping</li>
                  <li>Repetitive form filling</li>
                  <li>Web research and comparison</li>
                  <li>Navigating dashboards and admin panels</li>
                </ul>
              </div>
              <div className="best-for-card not-for">
                <h3>Not designed for</h3>
                <ul>
                  <li>Backend automation</li>
                  <li>Server-side workflows</li>
                  <li>Full robotic process automation (RPA)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="use-cases" aria-labelledby="use-cases-title">
          <div className="container">
            <div className="section-header">
              <h2 id="use-cases-title">Built for real workflows</h2>
              <p>From simple tasks to complex automation. Verse handles web tasks that would take hours manually.</p>
            </div>
            <div className="use-cases-grid">
              <article className="use-case-card">
                <h3>Data extraction</h3>
                <p>
                  Extract structured data from websites automatically using AI-powered browser automation. Pull product
                  listings, contact information, pricing tables, and more from multiple pages.
                </p>
              </article>
              <article className="use-case-card">
                <h3>Form filling</h3>
                <p>
                  Automatically fill out job applications, surveys, contact forms, and registration forms. Verse
                  understands form context and fills fields intelligently.
                </p>
              </article>
              <article className="use-case-card">
                <h3>Research tasks</h3>
                <p>
                  Automate web research across multiple sites. Verse navigates pages, compares information, and
                  summarizes results so you can focus on analysis.
                </p>
              </article>
              <article className="use-case-card">
                <h3>Navigate complex tools</h3>
                <p>
                  Move through dashboards, admin panels, and professional software with AI guidance. No technical
                  expertise needed. Just describe what you want to accomplish.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Features Highlights */}
        <section className="features-highlight" aria-labelledby="features-title">
          <div className="container">
            <div className="section-header">
              <h2 id="features-title">How Verse works</h2>
              <p>A multi-agent AI system that plans, executes, and validates your tasks</p>
            </div>
            <div className="features-highlight-grid">
              <article className="feature-highlight-card">
                <h3>Natural language commands</h3>
                <p>
                  Describe what you need in plain English. Say "Extract all product prices" or "Fill this form with my
                  resume" and Verse understands and executes.
                </p>
              </article>
              <article className="feature-highlight-card">
                <h3>Multi-agent architecture</h3>
                <p>
                  Specialized AI agents work together: Navigator handles interactions, Planner creates strategies,
                  Validator ensures accuracy.
                </p>
              </article>
              <article className="feature-highlight-card">
                <h3>Your choice of AI</h3>
                <p>
                  Works with OpenAI (GPT-4), Anthropic (Claude), Google (Gemini), and local models via Ollama. Bring
                  your own API keys for full control.
                </p>
              </article>
              <article className="feature-highlight-card">
                <h3>100% local execution</h3>
                <p>
                  Verse runs entirely in your browser. Your data never touches our servers. Privacy-first design with no
                  tracking or data collection.
                </p>
              </article>
            </div>
            <div className="features-cta">
              <a href="/features" className="btn-secondary-link">
                See all features →
              </a>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section" aria-labelledby="faq-title">
          <div className="container">
            <div className="section-header">
              <h2 id="faq-title">Frequently asked questions</h2>
            </div>
            <div className="faq-list">
              <div className="faq-item">
                <button className="faq-question" onClick={() => toggleFaq(0)} aria-expanded={openFaq === 0}>
                  <span>What is Verse?</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={openFaq === 0 ? 'faq-icon open' : 'faq-icon'}
                    aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className={openFaq === 0 ? 'faq-answer open' : 'faq-answer'}>
                  <p>
                    Verse is an AI-powered browser automation extension that lets you automate websites using plain
                    English. Describe what you need, and Verse's multi-agent system will plan and execute the task
                    automatically. It's designed for data extraction, form filling, research, and navigating complex web
                    tools.
                  </p>
                </div>
              </div>

              <div className="faq-item">
                <button className="faq-question" onClick={() => toggleFaq(1)} aria-expanded={openFaq === 1}>
                  <span>How does Verse work?</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={openFaq === 1 ? 'faq-icon open' : 'faq-icon'}
                    aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className={openFaq === 1 ? 'faq-answer open' : 'faq-answer'}>
                  <p>
                    Verse uses a multi-agent system with specialized AI agents that work together to understand your
                    task, plan the workflow, and execute actions. The Navigator handles DOM interactions, the Planner
                    creates strategies, and the Validator ensures tasks are completed correctly.
                  </p>
                </div>
              </div>

              <div className="faq-item">
                <button className="faq-question" onClick={() => toggleFaq(2)} aria-expanded={openFaq === 2}>
                  <span>Is Verse free to use?</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={openFaq === 2 ? 'faq-icon open' : 'faq-icon'}
                    aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className={openFaq === 2 ? 'faq-answer open' : 'faq-answer'}>
                  <p>
                    Yes, Verse is completely free to use with no subscriptions or hidden fees. You provide your own API
                    keys for the LLM provider you choose (OpenAI, Anthropic, Gemini, or local models via Ollama). Verse
                    runs entirely in your browser, so you have full control over your AI backend and costs.
                  </p>
                </div>
              </div>

              <div className="faq-item">
                <button className="faq-question" onClick={() => toggleFaq(3)} aria-expanded={openFaq === 3}>
                  <span>Is my data private and secure?</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={openFaq === 3 ? 'faq-icon open' : 'faq-icon'}
                    aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className={openFaq === 3 ? 'faq-answer open' : 'faq-answer'}>
                  <p>
                    Absolutely. Verse runs 100% locally in your browser, meaning all automation happens on your machine.
                    Your data never leaves your computer unless you explicitly send it to an LLM provider (which you
                    control). We do not run servers, collect data, or track your usage.
                  </p>
                </div>
              </div>

              <div className="faq-item">
                <button className="faq-question" onClick={() => toggleFaq(4)} aria-expanded={openFaq === 4}>
                  <span>Which LLM providers are supported?</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={openFaq === 4 ? 'faq-icon open' : 'faq-icon'}
                    aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className={openFaq === 4 ? 'faq-answer open' : 'faq-answer'}>
                  <p>
                    Verse supports OpenAI (GPT-4, GPT-4o), Anthropic (Claude 3.5 Sonnet, Claude 3 Opus), Google Gemini,
                    and any provider compatible with Ollama for local models. You have full control over which provider
                    to use and can switch between them in the settings.
                  </p>
                </div>
              </div>

              <div className="faq-item">
                <button className="faq-question" onClick={() => toggleFaq(5)} aria-expanded={openFaq === 5}>
                  <span>How do I get started with Verse?</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={openFaq === 5 ? 'faq-icon open' : 'faq-icon'}
                    aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className={openFaq === 5 ? 'faq-answer open' : 'faq-answer'}>
                  <p>
                    Getting started takes about 2 minutes: download the extension from the Chrome Web Store, configure
                    your preferred LLM provider with your API keys in the settings, and you are ready to go. Open the
                    side panel and describe what you want to automate in plain English.
                  </p>
                </div>
              </div>

              <div className="faq-item">
                <button className="faq-question" onClick={() => toggleFaq(6)} aria-expanded={openFaq === 6}>
                  <span>Is Verse a robotic process automation (RPA) tool?</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={openFaq === 6 ? 'faq-icon open' : 'faq-icon'}
                    aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className={openFaq === 6 ? 'faq-answer open' : 'faq-answer'}>
                  <p>
                    No. Verse is a browser automation extension designed for interactive web workflows. It does not
                    replace backend RPA systems or enterprise automation platforms. Verse focuses on automating tasks
                    you would normally do manually in your browser.
                  </p>
                </div>
              </div>

              <div className="faq-item">
                <button className="faq-question" onClick={() => toggleFaq(7)} aria-expanded={openFaq === 7}>
                  <span>How is Verse different from Zapier or no-code automation tools?</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={openFaq === 7 ? 'faq-icon open' : 'faq-icon'}
                    aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className={openFaq === 7 ? 'faq-answer open' : 'faq-answer'}>
                  <p>
                    Zapier connects APIs and backend services. Verse automates actions directly on websites through the
                    browser, making it suitable for tasks that APIs do not support. If you need to interact with a
                    website the way a human would, Verse is the right tool.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section" aria-labelledby="cta-title">
          <div className="container">
            <div className="cta-content">
              <h2 id="cta-title">Ready to automate your web tasks?</h2>
              <p>Join thousands of professionals saving hours every week with Verse.</p>
              <div className="cta-buttons">
                <a
                  href="https://chromewebstore.google.com/detail/verse-agentic-browser/eilgeegkhgchcfhekepmojbocceamoee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-download">
                  Download for Chrome - Free
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <img src="/verse-logo.png" alt="Verse" />
            </div>
            <nav className="footer-nav" aria-label="Footer navigation">
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
                aria-label="Follow Verse on LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/tryverseai/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon"
                aria-label="Follow Verse on Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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

import { useEffect } from 'react';
import LandingPage from './components/LandingPage';
import './components/LandingPage.css';
import PrivacyPolicy from './privacy/PrivacyPolicy';
import About from './pages/About';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import AnalyticsTest from './pages/AnalyticsTest';
import AuthFlow from './components/AuthFlow';
import Analytics from './utils/analytics';

function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

  // Track page views for different routes
  useEffect(() => {
    const pageTitle =
      {
        '/': 'Verse - AI-Powered Browser Automation Extension',
        '/privacy': 'Privacy Policy - Verse',
        '/about': 'About - Verse',
        '/features': 'Features - Verse',
        '/pricing': 'Pricing - Verse',
        '/analytics-test': 'Analytics Test - Verse',
        '/auth': 'Authentication - Verse',
      }[path] || 'Verse';

    Analytics.trackPageView(path, pageTitle);
  }, [path]);

  // Route to appropriate page
  switch (path) {
    case '/privacy':
      return <PrivacyPolicy />;
    case '/about':
      return <About />;
    case '/features':
      return <Features />;
    case '/pricing':
      return <Pricing />;
    case '/analytics-test':
      return <AnalyticsTest />;
    case '/auth':
      return <AuthFlow />;
    default:
      return <LandingPage />;
  }
}

export default App;

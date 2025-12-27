import LandingPage from './components/LandingPage';
import './components/LandingPage.css';
import PrivacyPolicy from './privacy/PrivacyPolicy';
import About from './pages/About';
import Features from './pages/Features';
import Pricing from './pages/Pricing';

function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

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
    default:
      return <LandingPage />;
  }
}

export default App;

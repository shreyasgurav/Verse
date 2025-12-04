import LandingPage from './components/LandingPage';
import './components/LandingPage.css';
import PrivacyPolicy from './privacy/PrivacyPolicy';

function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path === '/privacy') {
    return <PrivacyPolicy />;
  }
  return <LandingPage />;
}

export default App;

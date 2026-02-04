import { useEffect } from 'react';
import Analytics from '../utils/analytics';
import ButtonAnalytics from '../components/ButtonAnalytics';

export default function AnalyticsTest() {
  useEffect(() => {
    Analytics.trackPageView('/analytics-test', 'Analytics Test - Verse');
  }, []);

  const testEvents = [
    {
      name: 'Test Page View',
      action: () => Analytics.trackPageView('/test-page', 'Test Page'),
    },
    {
      name: 'Test Button Click',
      action: () => Analytics.trackButtonClick('Test Button', 'analytics-test'),
    },
    {
      name: 'Test Auth Start',
      action: () => Analytics.trackAuthStart(),
    },
    {
      name: 'Test Auth Success',
      action: () => Analytics.trackAuthSuccess('test-user-123', 'test@example.com', 'Test User'),
    },
    {
      name: 'Test Auth Error',
      action: () => Analytics.trackAuthError('Test authentication error'),
    },
    {
      name: 'Test Extension Message',
      action: () => Analytics.trackExtensionMessage('TEST_MESSAGE', true),
    },
    {
      name: 'Test Custom Event',
      action: () => Analytics.trackEvent('test_custom_event', { test_parameter: 'test_value' }),
    },
  ];

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Google Analytics Test Page</h1>

      {/* Real-time Button Analytics Dashboard */}
      <ButtonAnalytics showRealTimeStats={true} />

      <div
        style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
        }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#495057' }}>Analytics Status</h2>
        <p style={{ margin: '0', color: '#6c757d' }}>
          Google Analytics ID: <strong>G-645W4D9PQV</strong>
          <br />
          Firebase Analytics: <strong>Initialized</strong>
          <br />
          Page view tracked on load: <strong>✓</strong>
        </p>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
        }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#495057' }}>Test Analytics Events</h2>
        <p style={{ margin: '0 0 20px 0', color: '#6c757d', fontSize: '14px' }}>
          Click the buttons below to test different analytics events. Check your Google Analytics dashboard to verify
          events are being tracked.
        </p>

        <div
          style={{
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          }}>
          {testEvents.map((event, index) => (
            <button
              key={index}
              onClick={event.action}
              style={{
                padding: '12px 16px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#0056b3')}
              onMouseOut={e => (e.currentTarget.style.background = '#007bff')}>
              {event.name}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          background: '#e7f3ff',
          border: '1px solid #b8daff',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '30px',
        }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#004085' }}>How to Verify</h3>
        <ol style={{ margin: '0', paddingLeft: '20px', color: '#004085' }}>
          <li>Open Google Analytics dashboard</li>
          <li>Go to Reports → Realtime → Events</li>
          <li>Click the test buttons above</li>
          <li>Verify events appear in real-time</li>
        </ol>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: '500',
          }}
          onClick={() => Analytics.trackButtonClick('Back to Home', 'analytics-test')}>
          ← Back to Home
        </a>
      </div>
    </div>
  );
}

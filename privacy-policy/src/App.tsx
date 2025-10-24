import './App.css';

const PrivacyPolicy = () => {
  return (
    <div className="privacy-policy">
      <div className="container">
        <header className="header">
          <h1>Privacy Policy</h1>
          <p className="subtitle">Verse - AI Web Automation Extension</p>
        </header>

        <main className="content">
          <section className="section">
            <h2>1. Information We Collect</h2>
            <p>
              Verse operates locally in your browser and does not collect, store, or transmit personal data to external servers. 
              The extension processes information locally to perform web automation tasks.
            </p>
            <ul>
              <li><strong>Local Storage:</strong> Settings and preferences are stored locally in your browser</li>
              <li><strong>Web Page Data:</strong> Only accessed temporarily during automation tasks</li>
              <li><strong>API Keys:</strong> Stored locally and used only for AI model communication</li>
            </ul>
          </section>

          <section className="section">
            <h2>2. How We Use Information</h2>
            <p>
              All data processing happens locally in your browser. We use collected information solely to:
            </p>
            <ul>
              <li>Execute web automation tasks as requested</li>
              <li>Maintain your extension settings and preferences</li>
              <li>Provide AI-powered assistance through configured language models</li>
            </ul>
          </section>

          <section className="section">
            <h2>3. Data Sharing</h2>
            <p>
              <strong>We do not share, sell, or transmit any personal data to third parties.</strong> 
              The extension operates entirely within your browser environment.
            </p>
            <p>
              When you configure AI model API keys, those keys are used only to communicate with your chosen 
              AI service provider (OpenAI, Anthropic, Google, etc.) for processing automation tasks.
            </p>
          </section>

          <section className="section">
            <h2>4. Data Security</h2>
            <p>
              All data remains on your device. We implement browser-standard security measures:
            </p>
            <ul>
              <li>Local storage encryption through browser APIs</li>
              <li>Secure communication with AI service providers</li>
              <li>No external data transmission</li>
            </ul>
          </section>

          <section className="section">
            <h2>5. Your Rights</h2>
            <p>You have complete control over your data:</p>
            <ul>
              <li><strong>Access:</strong> All data is stored locally and accessible through browser settings</li>
              <li><strong>Deletion:</strong> Uninstall the extension to remove all local data</li>
              <li><strong>Modification:</strong> Change settings anytime through the extension options</li>
            </ul>
          </section>

          <section className="section">
            <h2>6. Third-Party Services</h2>
            <p>
              Verse may communicate with AI service providers you configure (OpenAI, Anthropic, Google Gemini, etc.). 
              This communication is direct from your browser to the service provider - we do not act as an intermediary.
            </p>
            <p>
              Please review the privacy policies of any AI service providers you choose to use.
            </p>
          </section>

          <section className="section">
            <h2>7. Changes to This Policy</h2>
            <p>
              We may update this privacy policy. Changes will be reflected in the extension and 
              the "Last updated" date will be modified accordingly.
            </p>
          </section>

          <section className="section">
            <h2>8. Contact Information</h2>
            <p>
              If you have questions about this privacy policy, please contact us at:
            </p>
            <ul>
              <li>Email: shrreyasgurav@gmail.com</li>
            </ul>
          </section>
        </main>

        <footer className="footer">
          <p>&copy; 2025 Verse. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

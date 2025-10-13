/**
 * Simple usage examples for the Agentic Browser
 * Demonstrates how to use the agentic browser system from the renderer process
 */

// Example usage in the renderer process (index.html)
class AgenticBrowserDemo {
  constructor() {
    this.isConnected = false;
  }

  /**
   * Example 1: Search Google
   */
  async searchGoogle(query) {
    try {
      console.log(`🔍 Searching Google for: ${query}`);
      
      const result = await window.electronAPI.invoke('agentic-execute-goal', {
        goal: `Search for "${query}" on Google`,
        context: {
          expectedResult: 'Search results page with relevant results'
        }
      });

      if (result.success) {
        console.log('✅ Search completed successfully:', result.result);
        this.showResult('search', result.result);
        return result.result;
      } else {
        console.error('❌ Search failed:', result.error);
        this.showError('search', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      this.showError('search', error.message);
      return null;
    }
  }

  /**
   * Example 2: Navigate to a website
   */
  async navigateToWebsite(url) {
    try {
      console.log(`🌐 Navigating to: ${url}`);
      
      const result = await window.electronAPI.invoke('agentic-execute-goal', {
        goal: `Navigate to ${url}`,
        context: {
          targetUrl: url
        }
      });

      if (result.success) {
        console.log('✅ Navigation completed successfully:', result.result);
        this.showResult('navigation', result.result);
        return result.result;
      } else {
        console.error('❌ Navigation failed:', result.error);
        this.showError('navigation', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      this.showError('navigation', error.message);
      return null;
    }
  }

  /**
   * Example 3: Click a button
   */
  async clickButton(buttonText) {
    try {
      console.log(`👆 Clicking button: ${buttonText}`);
      
      const result = await window.electronAPI.invoke('agentic-execute-goal', {
        goal: `Click the "${buttonText}" button`,
        context: {
          buttonText: buttonText
        }
      });

      if (result.success) {
        console.log('✅ Button click completed successfully:', result.result);
        this.showResult('click', result.result);
        return result.result;
      } else {
        console.error('❌ Button click failed:', result.error);
        this.showError('click', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Button click error:', error);
      this.showError('click', error.message);
      return null;
    }
  }

  /**
   * Example 4: Fill a form field
   */
  async fillFormField(fieldDescription, text) {
    try {
      console.log(`✏️ Filling form field: ${fieldDescription} with "${text}"`);
      
      const result = await window.electronAPI.invoke('agentic-execute-goal', {
        goal: `Type "${text}" into the ${fieldDescription} field`,
        context: {
          fieldDescription: fieldDescription,
          text: text
        }
      });

      if (result.success) {
        console.log('✅ Form filling completed successfully:', result.result);
        this.showResult('form', result.result);
        return result.result;
      } else {
        console.error('❌ Form filling failed:', result.error);
        this.showError('form', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Form filling error:', error);
      this.showError('form', error.message);
      return null;
    }
  }

  /**
   * Example 5: Complex multi-step task
   */
  async complexTask() {
    try {
      console.log('🚀 Starting complex multi-step task...');
      
      const result = await window.electronAPI.invoke('agentic-execute-goal', {
        goal: `
          1. Navigate to example.com
          2. Find and click the "More information" button
          3. Wait for the page to load
          4. Verify we're on the correct page
        `,
        context: {
          expectedSteps: 4,
          timeout: 30000
        }
      });

      if (result.success) {
        console.log('✅ Complex task completed successfully:', result.result);
        this.showResult('complex', result.result);
        return result.result;
      } else {
        console.error('❌ Complex task failed:', result.error);
        this.showError('complex', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Complex task error:', error);
      this.showError('complex', error.message);
      return null;
    }
  }

  /**
   * Get current execution status
   */
  async getStatus() {
    try {
      const result = await window.electronAPI.invoke('agentic-get-status');
      
      if (result.success) {
        console.log('📊 Current status:', result.status);
        this.showStatus(result.status);
        return result.status;
      } else {
        console.error('❌ Failed to get status:', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Status error:', error);
      return null;
    }
  }

  /**
   * Stop current execution
   */
  async stopExecution() {
    try {
      console.log('🛑 Stopping execution...');
      
      const result = await window.electronAPI.invoke('agentic-stop');
      
      if (result.success) {
        console.log('✅ Execution stopped successfully');
        this.showResult('stop', 'Execution stopped');
        return true;
      } else {
        console.error('❌ Failed to stop execution:', result.error);
        this.showError('stop', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Stop error:', error);
      this.showError('stop', error.message);
      return false;
    }
  }

  /**
   * Show result in UI (placeholder)
   */
  showResult(type, result) {
    const message = `✅ ${type.toUpperCase()}: ${JSON.stringify(result, null, 2)}`;
    console.log(message);
    
    // In a real implementation, you would update the UI here
    // For example: document.getElementById('result').innerHTML = message;
  }

  /**
   * Show error in UI (placeholder)
   */
  showError(type, error) {
    const message = `❌ ${type.toUpperCase()} ERROR: ${error}`;
    console.error(message);
    
    // In a real implementation, you would update the UI here
    // For example: document.getElementById('error').innerHTML = message;
  }

  /**
   * Show status in UI (placeholder)
   */
  showStatus(status) {
    const message = `📊 STATUS: Executing: ${status.isExecuting}, Steps: ${status.completedSteps}/${status.totalSteps}`;
    console.log(message);
    
    // In a real implementation, you would update the UI here
    // For example: document.getElementById('status').innerHTML = message;
  }

  /**
   * Run demo examples
   */
  async runDemo() {
    console.log('🎬 Starting Agentic Browser Demo...');
    
    try {
      // Example 1: Search Google
      await this.searchGoogle('agentic browser');
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Example 2: Navigate to a website
      await this.navigateToWebsite('https://example.com');
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Example 3: Get status
      await this.getStatus();
      
      console.log('🎉 Demo completed!');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
    }
  }
}

// Usage examples (uncomment to use):

// const demo = new AgenticBrowserDemo();

// Basic examples:
// demo.searchGoogle('openai gpt-4');
// demo.navigateToWebsite('https://github.com');
// demo.clickButton('Login');
// demo.fillFormField('email', 'test@example.com');

// Advanced examples:
// demo.complexTask();
// demo.getStatus();
// demo.stopExecution();

// Run full demo:
// demo.runDemo();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgenticBrowserDemo;
} else if (typeof window !== 'undefined') {
  window.AgenticBrowserDemo = AgenticBrowserDemo;
}

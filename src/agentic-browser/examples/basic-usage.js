/**
 * Basic usage example for the Agentic Browser
 * Demonstrates how to use the agentic browser system
 */

// This would typically be used within the Electron renderer process
// For demonstration purposes, showing the API structure

class AgenticBrowserExample {
  constructor() {
    this.isConnected = false;
  }

  /**
   * Example: Search for something on Google
   */
  async searchGoogle(query) {
    try {
      const result = await window.electronAPI.invoke('agentic-execute-goal', {
        goal: `Search for "${query}" on Google`,
        context: {
          currentUrl: window.location.href,
          expectedResult: 'Search results page with relevant results'
        }
      });

      if (result.success) {
        console.log('Search completed:', result.result);
        return result.result;
      } else {
        console.error('Search failed:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Search error:', error);
      return null;
    }
  }

  /**
   * Example: Fill out a form
   */
  async fillForm(formData) {
    try {
      const result = await window.electronAPI.invoke('agentic-execute-goal', {
        goal: `Fill out the form with the following data: ${JSON.stringify(formData)}`,
        context: {
          currentUrl: window.location.href,
          formFields: Object.keys(formData)
        }
      });

      if (result.success) {
        console.log('Form filled successfully:', result.result);
        return result.result;
      } else {
        console.error('Form filling failed:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Form filling error:', error);
      return null;
    }
  }

  /**
   * Example: Navigate to a specific page and perform an action
   */
  async navigateAndAction(url, action) {
    try {
      const result = await window.electronAPI.invoke('agentic-execute-goal', {
        goal: `Navigate to ${url} and ${action}`,
        context: {
          targetUrl: url,
          expectedAction: action
        }
      });

      if (result.success) {
        console.log('Navigation and action completed:', result.result);
        return result.result;
      } else {
        console.error('Navigation and action failed:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Navigation and action error:', error);
      return null;
    }
  }

  /**
   * Example: Get current execution status
   */
  async getStatus() {
    try {
      const result = await window.electronAPI.invoke('agentic-get-status');
      
      if (result.success) {
        console.log('Current status:', result.status);
        return result.status;
      } else {
        console.error('Failed to get status:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Status error:', error);
      return null;
    }
  }

  /**
   * Example: Stop current execution
   */
  async stopExecution() {
    try {
      const result = await window.electronAPI.invoke('agentic-stop');
      
      if (result.success) {
        console.log('Execution stopped');
        return true;
      } else {
        console.error('Failed to stop execution:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Stop error:', error);
      return false;
    }
  }

  /**
   * Example: Complex multi-step task
   */
  async complexTask() {
    try {
      const result = await window.electronAPI.invoke('agentic-execute-goal', {
        goal: `
          1. Go to example.com
          2. Find the search box
          3. Type "automation testing"
          4. Click the search button
          5. Wait for results to load
          6. Click on the first result
          7. Verify the page loaded correctly
        `,
        context: {
          expectedSteps: 7,
          timeout: 60000
        }
      });

      if (result.success) {
        console.log('Complex task completed:', result.result);
        return result.result;
      } else {
        console.error('Complex task failed:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Complex task error:', error);
      return null;
    }
  }
}

// Example usage in the renderer process
const agenticExample = new AgenticBrowserExample();

// Example: Search for "agentic browser" on Google
// agenticExample.searchGoogle("agentic browser");

// Example: Fill out a contact form
// agenticExample.fillForm({
//   name: "John Doe",
//   email: "john@example.com",
//   message: "This is an automated test message"
// });

// Example: Navigate and perform action
// agenticExample.navigateAndAction("https://github.com", "search for 'agentic browser'");

// Example: Complex task
// agenticExample.complexTask();

export default AgenticBrowserExample;

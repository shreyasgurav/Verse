const { app, BrowserWindow, BrowserView, ipcMain, Menu } = require('electron');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

class VerseBrowser {
  constructor() {
    this.mainWindow = null;
    this.browserView = null;
    this.tabs = [];
    this.currentTabId = null;
    this.sidebarVisible = false;
    this.ipcHandlersRegistered = false;
  }

  createWindow() {
      // Create the browser window
      this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      },
      titleBarStyle: 'hiddenInset',
      backgroundColor: '#1a1a1a',
      show: false
    });

    // Load the renderer
    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    // Setup browser view events
    this.setupBrowserViewEvents();
      
    // Create initial tab
        this.createInitialTab();

    // Setup IPC handlers
    this.setupIPC();
    
    console.log('Browser window setup complete');
  }

  setupBrowserViewEvents() {
    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('Renderer loaded');
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.on('resize', () => {
      if (this.browserView && !this.sidebarVisible) {
      const bounds = this.mainWindow.getBounds();
      this.browserView.setBounds({
        x: 0,
        y: 80,
        width: bounds.width,
        height: bounds.height - 80
      });
      }
    });
  }

  createInitialTab() {
    const tabId = `tab-${Date.now()}`;
    const tab = {
      id: tabId,
      url: 'https://www.google.com',
      title: 'New Tab',
      favicon: null
    };

    this.tabs.push(tab);
    this.currentTabId = tabId;

    // Create BrowserView for the tab
    this.browserView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false
      }
    });

    this.mainWindow.setBrowserView(this.browserView);
    this.browserView.setBounds({ x: 0, y: 80, width: 1400, height: 820 });
    this.browserView.webContents.loadURL(tab.url);

    console.log('Initial tab created:', tabId);
  }

  setupIPC() {
    if (this.ipcHandlersRegistered) {
      return;
    }

    // Navigation
    ipcMain.handle('navigate', async (event, url) => {
      try {
        if (this.browserView) {
          this.browserView.webContents.loadURL(url);
          return { success: true };
        }
        return { success: false, error: 'No browser view available' };
      } catch (error) {
        console.error('Navigation error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('go-back', async () => {
      try {
        if (this.browserView && this.browserView.webContents.canGoBack()) {
        this.browserView.webContents.goBack();
          return { success: true };
        }
        return { success: false, error: 'Cannot go back' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('go-forward', async () => {
      try {
        if (this.browserView && this.browserView.webContents.canGoForward()) {
        this.browserView.webContents.goForward();
          return { success: true };
        }
        return { success: false, error: 'Cannot go forward' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('reload', async () => {
      try {
        if (this.browserView) {
      this.browserView.webContents.reload();
          return { success: true };
        }
        return { success: false, error: 'No browser view available' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-page-info', () => {
      if (this.browserView) {
      return {
        url: this.browserView.webContents.getURL(),
        title: this.browserView.webContents.getTitle(),
        canGoBack: this.browserView.webContents.canGoBack(),
        canGoForward: this.browserView.webContents.canGoForward()
      };
      }
      return null;
    });

    // Tab management
    ipcMain.handle('create-tab', async (event, url) => {
      try {
        const tabId = `tab-${Date.now()}`;
        const tab = {
        id: tabId,
        url: url || 'https://www.google.com',
        title: 'New Tab',
          favicon: null
        };

        this.tabs.push(tab);
        console.log('New tab created:', tabId, 'URL:', url);

        return { success: true, tab: tab };
      } catch (error) {
        console.error('Create tab error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('close-tab', async (event, tabId) => {
      try {
        const tabIndex = this.tabs.findIndex(tab => tab.id === tabId);
        if (tabIndex !== -1) {
          this.tabs.splice(tabIndex, 1);
          console.log('Tab closed:', tabId);
          
          // If we closed the current tab, switch to another tab
          if (this.currentTabId === tabId && this.tabs.length > 0) {
            this.currentTabId = this.tabs[0].id;
            // Switch to the first available tab
            const newTab = this.tabs[0];
            this.browserView.webContents.loadURL(newTab.url);
          }
          
          return { success: true };
        }
        return { success: false, error: 'Tab not found' };
      } catch (error) {
        console.error('Close tab error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('switch-tab', async (event, tabId) => {
      try {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab) {
        this.currentTabId = tabId;
          if (this.browserView) {
            this.browserView.webContents.loadURL(tab.url);
          }
        console.log('Switched to tab:', tabId);
          return { success: true, tab: tab };
        }
        return { success: false, error: 'Tab not found' };
      } catch (error) {
        console.error('Switch tab error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-tabs', () => {
      return this.tabs;
    });

    ipcMain.handle('get-current-tab', () => {
      return this.tabs.find(tab => tab.id === this.currentTabId) || null;
    });

    ipcMain.handle('toggle-fullscreen', () => {
      if (this.mainWindow) {
      this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
      }
    });

    ipcMain.handle('get-setting', (event, key) => {
      return this.settings[key];
    });

    ipcMain.handle('set-setting', (event, key, value) => {
      this.settings[key] = value;
    });

    ipcMain.handle('agent-command', async (event, command) => {
      try {
        // Handle agent commands
        return { success: true, message: 'Agent command received' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // ChatGPT API integration
    ipcMain.handle('chatgpt-request', async (event, { apiKey, messages }) => {
      try {
        console.log('=== ChatGPT API Request ===');
        console.log('API Key provided:', apiKey ? `${apiKey.substring(0, 3)}...` : 'none');
        
        let finalApiKey = apiKey;
        if (apiKey === 'env') {
          const envApiKey = process.env.OPENAI_API_KEY;
          console.log('Environment OPENAI_API_KEY exists:', !!envApiKey);
          console.log('Environment API Key:', envApiKey ? `${envApiKey.substring(0, 8)}...` : 'none');
          finalApiKey = envApiKey;
          console.log('Using API Key:', finalApiKey ? `${finalApiKey.substring(0, 8)}...` : 'none');
        }
        
        console.log('API Key length:', finalApiKey ? finalApiKey.length : 0);
        console.log('API Key starts with sk-proj:', finalApiKey ? finalApiKey.startsWith('sk-proj') : false);
        console.log('API Key ends with:', finalApiKey ? finalApiKey.substring(finalApiKey.length - 5) : 'none');
        console.log('Is demo mode:', finalApiKey === 'demo');
        console.log('Using env variable:', apiKey === 'env');
        console.log('Messages count:', messages.length);
        console.log('Last message:', messages[messages.length - 1]?.content?.substring(0, 50) + '...');
        console.log('===========================');

        if (!finalApiKey || finalApiKey === 'demo') {
          // Demo mode - return a mock response
          const mockResponse = {
            choices: [{
              message: {
                content: "I'm in demo mode. Please provide a valid OpenAI API key to use the full functionality."
              }
            }]
          };
          return { success: true, data: mockResponse };
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${finalApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: messages,
            max_tokens: 1000,
            temperature: 0.7
          })
        });

        console.log('API Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.text();
          console.log('API Error response:', errorData);
          throw new Error(`API request failed with status ${response.status}: ${errorData}`);
        }

        const data = await response.json();
        console.log('API Success - response received');
        return { success: true, data: data };
      } catch (error) {
        console.error('ChatGPT API Error:', error);
        return { success: false, error: error.message };
      }
    });

    // Simplified webpage scraping
    ipcMain.handle('scrape-webpage', async (event) => {
      try {
        if (!this.browserView) {
          return { success: false, error: 'No browser view available' };
        }

        const result = await this.browserView.webContents.executeJavaScript(`
          (() => {
            try {
              // Ultra-simple scraping that can't fail
              const elements = [];
              const allElements = document.querySelectorAll('*');
              
              for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i];
                const rect = el.getBoundingClientRect();
                
                // Only get visible, interactive elements
                if (rect.width > 0 && rect.height > 0) {
                  const tagName = el.tagName.toLowerCase();
                  const isInteractive = ['button', 'a', 'input', 'select', 'textarea', 'form'].includes(tagName);
                  
                  if (isInteractive) {
                    elements.push({
                      tagName: tagName,
                      id: el.id || '',
                      className: el.className || '',
                      textContent: (el.textContent || '').trim().substring(0, 50),
                      placeholder: el.placeholder || '',
                      type: el.type || '',
                      href: el.href || '',
                      value: el.value || '',
                      isVisible: true,
                      isClickable: ['button', 'a'].includes(tagName) || el.onclick !== null,
                      isInteractive: true,
                      boundingRect: {
                        x: rect.left,
                        y: rect.top,
                        width: rect.width,
                        height: rect.height
                      }
                    });
                  }
                }
              }
              
              // Simple page analysis
              const pageAnalysis = {
                metadata: {
                  url: window.location.href,
                  title: document.title,
                  domain: window.location.hostname,
                  totalElements: elements.length,
                  interactiveElements: elements.length,
                  clickableElements: elements.filter(el => el.isClickable).length,
                  formElements: elements.filter(el => ['input', 'select', 'textarea', 'form'].includes(el.tagName)).length,
                  hasLogin: elements.some(el => el.textContent.toLowerCase().includes('login')),
                  hasSearch: elements.some(el => el.placeholder.toLowerCase().includes('search') || el.textContent.toLowerCase().includes('search')),
                  hasForm: elements.some(el => el.tagName === 'form')
                }
              };

              // Return simple data
              return {
                url: window.location.href,
                title: document.title,
                elements: elements,
                pageAnalysis: pageAnalysis,
                timestamp: Date.now()
              };
            } catch (error) {
              return { success: false, error: error.message };
            }
          })()
        `);

        return { success: true, data: result };
      } catch (error) {
        console.error('Webpage scraping error:', error);
        return { success: false, error: error.message };
      }
    });

    // Enhanced element interaction system - Phase 3
    ipcMain.handle('execute-action', async (event, { action, selector, text, url, target }) => {
      try {
        if (!this.browserView) {
          return { success: false, error: 'No browser view available' };
        }

        const result = await this.browserView.webContents.executeJavaScript(`
          (() => {
            try {
              // Simplified but robust element interaction
              function findElement(selector, target) {
                // Try direct selector first
                let element = document.querySelector(selector);
                if (element) return element;
                
                // If no target, return null
                if (!target) return null;
                
                // Try finding by text content
                const elements = Array.from(document.querySelectorAll('*'));
                element = elements.find(el => {
                  const text = el.textContent?.trim().toLowerCase() || '';
                  return text.includes(target.toLowerCase()) && 
                         el.offsetParent !== null &&
                         (el.tagName === 'BUTTON' || el.tagName === 'A' || el.onclick);
                });
                
                if (element) return element;
                
                // Try finding input by placeholder
                element = document.querySelector(\`input[placeholder*="\${target}"], textarea[placeholder*="\${target}"]\`);
                if (element) return element;
                
                // Try finding by aria-label
                element = document.querySelector(\`[aria-label*="\${target}"]\`);
                if (element) return element;
                
                return null;
              }
              
              function interactWithElement(element, action, text) {
                if (!element) return { success: false, error: 'Element not found' };
                
                try {
                  // Make sure element is visible
                  if (element.offsetParent === null) {
                    return { success: false, error: 'Element not visible' };
                  }
                  
                  // Scroll into view
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  
                  // Execute action immediately
                  switch (action) {
                    case 'click':
                      element.click();
                      break;
                      
                    case 'type':
                      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                        element.focus();
                        element.value = text;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                      break;
                  }
                  
                  return { success: true, message: \`Successfully \${action}ed element\` };
                } catch (error) {
                  return { success: false, error: error.message };
                }
              }
              
              // Main execution
              switch ('${action}') {
                case 'click':
                  const clickElement = findElement('${selector || ''}', '${target || ''}');
                  return interactWithElement(clickElement, 'click');
                  
                case 'type':
                  const typeElement = findElement('${selector || ''}', '${target || ''}');
                  return interactWithElement(typeElement, 'type', '${text || ''}');
                  
                case 'scroll':
                  const scrollElement = findElement('${selector || ''}', '${target || ''}');
                  if (scrollElement) {
                    scrollElement.scrollIntoView({ behavior: 'smooth' });
                    return { success: true, message: 'Scrolled to element' };
                  }
                  return { success: false, error: 'Element not found for scrolling' };
                  
                default:
                  return { success: false, error: 'Unknown action' };
              }
            } catch (error) {
              return { success: false, error: error.message };
            }
          })()
        `);

        // Handle special cases in main process
        if (action === 'navigate' && url) {
          this.browserView.webContents.loadURL(url);
          return { success: true, message: 'Navigated to URL' };
        }
        
        if (action === 'wait') {
          await new Promise(resolve => setTimeout(resolve, parseInt(text) || 1000));
          return { success: true, message: 'Waited' };
        }

        return result;
      } catch (error) {
        console.error('Phase 3 Action execution error:', error);
        return { success: false, error: error.message };
      }
    });

    // Browser view adjustment for sidebar
    ipcMain.handle('adjust-browser-view', async (event, options) => {
      try {
        if (!this.browserView) return { success: false, error: 'No browser view available' };
        
        const bounds = this.mainWindow.getBounds();
        const sidebarWidth = 320;
        
        // Update sidebar state
        this.sidebarVisible = options.sidebarVisible;
        
        if (options.sidebarVisible) {
          // Adjust BrowserView to make room for sidebar
          this.browserView.setBounds({
            x: 0,
            y: 80,
            width: bounds.width - sidebarWidth,
            height: bounds.height - 80
          });
          console.log('BrowserView adjusted for sidebar:', bounds.width - sidebarWidth, 'x', bounds.height - 80);
        } else {
          // Reset BrowserView to full width
          this.browserView.setBounds({
            x: 0,
            y: 80,
            width: bounds.width,
            height: bounds.height - 80
          });
          console.log('BrowserView reset to full width:', bounds.width, 'x', bounds.height - 80);
        }
        
        return { success: true };
      } catch (error) {
        console.error('Browser view adjustment error:', error);
        return { success: false, error: error.message };
      }
    });

    this.ipcHandlersRegistered = true;
  }

  cleanupIPC() {
    // Remove all IPC handlers
    ipcMain.removeAllListeners('navigate');
    ipcMain.removeAllListeners('go-back');
    ipcMain.removeAllListeners('go-forward');
    ipcMain.removeAllListeners('reload');
    ipcMain.removeAllListeners('get-page-info');
    ipcMain.removeAllListeners('create-tab');
    ipcMain.removeAllListeners('close-tab');
    ipcMain.removeAllListeners('switch-tab');
    ipcMain.removeAllListeners('get-tabs');
    ipcMain.removeAllListeners('get-current-tab');
    ipcMain.removeAllListeners('toggle-fullscreen');
    ipcMain.removeAllListeners('get-setting');
    ipcMain.removeAllListeners('set-setting');
    ipcMain.removeAllListeners('agent-command');
    ipcMain.removeAllListeners('chatgpt-request');
    ipcMain.removeAllListeners('scrape-webpage');
    ipcMain.removeAllListeners('execute-action');
    ipcMain.removeAllListeners('adjust-browser-view');
    
    this.ipcHandlersRegistered = false;
  }

  setupMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Tab',
            accelerator: 'CmdOrCtrl+T',
            click: () => {
              // Create new tab
            }
          },
          {
            label: 'Close Tab',
            accelerator: 'CmdOrCtrl+W',
            click: () => {
              // Close current tab
            }
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

// Create browser instance
const browser = new VerseBrowser();

// App event handlers
app.whenReady().then(() => {
  try {
    browser.createWindow();
    browser.setupMenu();
    console.log('Browser window created successfully');
  } catch (error) {
    console.error('Failed to create browser window:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        browser.cleanupIPC();
        browser.createWindow();
      } catch (error) {
        console.error('Failed to recreate browser window:', error);
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  browser.cleanupIPC();
});
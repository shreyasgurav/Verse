const { app, BrowserWindow, BrowserView, Menu, ipcMain, shell } = require('electron');
const path = require('path');

// Load environment variables
require('dotenv').config();
const Store = require('electron-store');

// Initialize electron store for settings
const store = new Store();

class VerseBrowser {
  constructor() {
    this.mainWindow = null;
    this.browserView = null;
    this.tabs = new Map();
    this.currentTabId = null;
    this.tabCounter = 0;
    this.ipcHandlersRegistered = false;
    this.sidebarVisible = false;
  }

  createWindow() {
    try {
      console.log('Creating browser window...');
      // Create the browser window
      this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      backgroundColor: '#1a1a1a',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: false,
        webSecurity: false,
        allowRunningInsecureContent: true,
        experimentalFeatures: true,
        webgl: true,
        plugins: true
      },
      titleBarStyle: 'hiddenInset',
      show: false,
      icon: path.join(__dirname, '../../assets/icons/icon.png')
    });

    // Create BrowserView for web content
    this.browserView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        backgroundThrottling: false
      }
    });

    // Set the BrowserView to the main window
    this.mainWindow.setBrowserView(this.browserView);

    // Set BrowserView bounds (leaving space for UI)
    const bounds = this.mainWindow.getBounds();
    this.browserView.setBounds({
      x: 0,
      y: 80, // Space for tab bar and navigation
      width: bounds.width,
      height: bounds.height - 80
    });

    // Load the main UI
    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Load initial page in BrowserView
    this.browserView.webContents.loadURL('https://www.google.com');

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      // Create initial tab after window is shown
      setTimeout(() => {
        this.createInitialTab();
      }, 100);
    });

    // Handle window resize
    this.mainWindow.on('resize', () => {
      const bounds = this.mainWindow.getBounds();
      const sidebarWidth = 320;
      
      // Check if sidebar is currently visible (we'll track this in a property)
      const sidebarVisible = this.sidebarVisible || false;
      
      this.browserView.setBounds({
        x: 0,
        y: 80,
        width: sidebarVisible ? bounds.width - sidebarWidth : bounds.width,
        height: bounds.height - 80
      });
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      this.browserView = null;
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Setup BrowserView event listeners
    this.setupBrowserViewEvents();

    // Setup IPC handlers
    this.setupIPC();
    
    console.log('Browser window setup complete');
    } catch (error) {
      console.error('Error in createWindow:', error);
      throw error;
    }
  }

  createInitialTab() {
    this.tabCounter++;
    const tabId = `tab-${this.tabCounter}`;
    const newTab = {
      id: tabId,
      url: 'https://www.google.com',
      title: 'Google',
      favicon: null,
      isLoading: false
    };
    this.tabs.set(tabId, newTab);
    this.currentTabId = tabId;

    this.mainWindow.webContents.send('tab-created', newTab);
    console.log('Initial tab created:', tabId);
  }

  setupBrowserViewEvents() {
    this.browserView.webContents.on('did-start-loading', () => {
      this.mainWindow.webContents.send('loading-started');
    });

    this.browserView.webContents.on('did-finish-load', () => {
      this.mainWindow.webContents.send('loading-finished');
      this.mainWindow.webContents.send('page-info', {
        url: this.browserView.webContents.getURL(),
        title: this.browserView.webContents.getTitle()
      });
    });

    this.browserView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Page failed to load:', errorCode, errorDescription, validatedURL);
      this.mainWindow.webContents.send('loading-failed', {
        errorCode,
        errorDescription,
        url: validatedURL
      });
    });

    this.browserView.webContents.on('page-title-updated', (event, title) => {
      this.mainWindow.webContents.send('page-info', {
        url: this.browserView.webContents.getURL(),
        title: title
      });
    });

    this.browserView.webContents.on('did-navigate', (event, url) => {
      this.mainWindow.webContents.send('page-info', {
        url: url,
        title: this.browserView.webContents.getTitle()
      });
    });
  }

  setupIPC() {
    if (this.ipcHandlersRegistered) {
      return;
    }

    // Navigation
    ipcMain.handle('navigate', async (event, url) => {
      try {
        await this.browserView.webContents.loadURL(url);
        return { success: true, url: url };
      } catch (error) {
        console.error('Navigation error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('go-back', async () => {
      if (this.browserView.webContents.canGoBack()) {
        this.browserView.webContents.goBack();
        return true;
      }
      return false;
    });

    ipcMain.handle('go-forward', async () => {
      if (this.browserView.webContents.canGoForward()) {
        this.browserView.webContents.goForward();
        return true;
      }
      return false;
    });

    ipcMain.handle('reload', async () => {
      this.browserView.webContents.reload();
      return true;
    });

    // Get page info
    ipcMain.handle('get-page-info', () => {
      return {
        url: this.browserView.webContents.getURL(),
        title: this.browserView.webContents.getTitle(),
        canGoBack: this.browserView.webContents.canGoBack(),
        canGoForward: this.browserView.webContents.canGoForward()
      };
    });

    // Tab management
    ipcMain.handle('create-tab', async (event, url) => {
      this.tabCounter++;
      const tabId = `tab-${this.tabCounter}`;
      const newTab = {
        id: tabId,
        url: url || 'https://www.google.com',
        title: 'New Tab',
        favicon: null,
        isLoading: false
      };
      this.tabs.set(tabId, newTab);
      this.currentTabId = tabId;

      // Navigate to the URL
      await this.browserView.webContents.loadURL(newTab.url);

      this.mainWindow.webContents.send('tab-created', newTab);
      console.log('New tab created:', tabId, 'URL:', newTab.url);
      return tabId;
    });

    ipcMain.handle('close-tab', async (event, tabId) => {
      if (this.tabs.has(tabId) && this.tabs.size > 1) {
        this.tabs.delete(tabId);
        this.mainWindow.webContents.send('tab-closed', tabId);
        
        // If this was the current tab, switch to another
        if (this.currentTabId === tabId) {
          const remainingTabs = Array.from(this.tabs.keys());
          if (remainingTabs.length > 0) {
            this.currentTabId = remainingTabs[0];
            const tab = this.tabs.get(this.currentTabId);
            await this.browserView.webContents.loadURL(tab.url);
            this.mainWindow.webContents.send('tab-switched', this.currentTabId);
          }
        }
        console.log('Tab closed:', tabId);
        return true;
      }
      return false;
    });

    ipcMain.handle('switch-tab', async (event, tabId) => {
      if (this.tabs.has(tabId)) {
        this.currentTabId = tabId;
        const tab = this.tabs.get(tabId);
        await this.browserView.webContents.loadURL(tab.url);
        this.mainWindow.webContents.send('tab-switched', tabId);
        console.log('Switched to tab:', tabId);
        return true;
      }
      return false;
    });

    ipcMain.handle('get-tabs', () => {
      return Array.from(this.tabs.values());
    });

    ipcMain.handle('get-current-tab', () => {
      return this.tabs.get(this.currentTabId);
    });

    // Fullscreen support
    ipcMain.handle('toggle-fullscreen', () => {
      this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
      return this.mainWindow.isFullScreen();
    });

    // Settings
    ipcMain.handle('get-setting', (event, key) => {
      return store.get(key);
    });

    ipcMain.handle('set-setting', (event, key, value) => {
      store.set(key, value);
      return true;
    });

    // AI Agent commands
    ipcMain.handle('agent-command', async (event, command) => {
      this.mainWindow.webContents.send('agent-command', command);
      return true;
    });

    // ChatGPT API proxy
    ipcMain.handle('chatgpt-request', async (event, { apiKey, messages }) => {
      try {
        const fetch = require('node-fetch');
        
        // Use environment variable as fallback if no API key provided or if 'env' is specified
        const finalApiKey = (apiKey && apiKey !== 'demo' && apiKey !== 'env') ? apiKey : process.env.OPENAI_API_KEY;
        
        // Debug logging
        console.log('=== ChatGPT API Request ===');
        console.log('API Key provided:', apiKey ? apiKey.substring(0, 10) + '...' : 'None');
        console.log('Environment OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
        console.log('Environment API Key:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'None');
        console.log('Using API Key:', finalApiKey ? finalApiKey.substring(0, 10) + '...' : 'None');
        console.log('API Key length:', finalApiKey ? finalApiKey.length : 0);
        console.log('API Key starts with sk-proj:', finalApiKey ? finalApiKey.startsWith('sk-proj-') : false);
        console.log('API Key ends with:', finalApiKey ? finalApiKey.substring(finalApiKey.length - 5) : 'None');
        console.log('Is demo mode:', apiKey === 'demo');
        console.log('Using env variable:', !apiKey || apiKey === 'demo' || apiKey === 'env');
        console.log('Messages count:', messages.length);
        console.log('Last message:', messages[messages.length - 1]?.content?.substring(0, 50) + '...');
        console.log('===========================');
        
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
          const errorText = await response.text();
          console.error('API Error response:', errorText);
          throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('API Success - response received');
        return { success: true, data: data };
      } catch (error) {
        console.error('ChatGPT API Error:', error);
        return { success: false, error: error.message };
      }
    });

    // Adjust BrowserView bounds for sidebar
    ipcMain.handle('adjust-browser-view', async (event, options) => {
      if (!this.browserView) return false;
      
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
      
      return true;
    });

    ipcMain.handle('automate-task', async (event, task) => {
      this.mainWindow.webContents.send('automate-task', task);
      return true;
    });

    this.ipcHandlersRegistered = true;
  }

  cleanupIPC() {
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
    ipcMain.removeAllListeners('automate-task');
    
    this.ipcHandlersRegistered = false;
  }

  setupMenu() {
    const template = [
      {
        label: 'Verse',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'File',
        submenu: [
          {
            label: 'New Tab',
            accelerator: 'CmdOrCtrl+T',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.webContents.send('create-new-tab');
              }
            }
          },
          {
            label: 'Close Tab',
            accelerator: 'CmdOrCtrl+W',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.webContents.send('close-current-tab');
              }
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
          { role: 'paste' },
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' }
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
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ]
      },
      {
        label: 'Help',
        role: 'help',
        submenu: [
          {
            label: 'Learn More',
            click: async () => {
              await shell.openExternal('https://electronjs.org');
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

// Initialize browser
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
    browser.cleanupIPC();
    app.quit();
  }
});

app.on('before-quit', () => {
  browser.cleanupIPC();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

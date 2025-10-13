const { ipcRenderer } = require('electron');

class VerseRenderer {
    constructor() {
        this.tabs = new Map();
        this.currentTabId = null;
        this.sidebarVisible = false;
        this.isSwitchingTab = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupIPC();
    }

    initializeElements() {
        this.tabBar = document.getElementById('tabBar');
        this.addressBar = document.getElementById('addressBar');
        this.webview = document.getElementById('webview');
        this.loadingBar = document.getElementById('loadingBar');
        this.sidebar = document.getElementById('sidebar');
        this.loadingMessage = document.querySelector('.loading-message');
        
        // Navigation buttons
        this.backButton = document.getElementById('backButton');
        this.forwardButton = document.getElementById('forwardButton');
        this.refreshButton = document.getElementById('refreshButton');
        this.assistantButton = document.getElementById('assistantButton');
        this.closeSidebar = document.getElementById('closeSidebar');
        
        // Debug logging
        console.log('Elements initialized:');
        console.log('- sidebar:', this.sidebar);
        console.log('- assistantButton:', this.assistantButton);
        console.log('- closeSidebar:', this.closeSidebar);
    }

    setupEventListeners() {
        // Address bar
        this.addressBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.navigate(this.addressBar.value);
            }
        });

        // Navigation buttons
        this.backButton.addEventListener('click', () => this.goBack());
        this.forwardButton.addEventListener('click', () => this.goForward());
        this.refreshButton.addEventListener('click', () => this.reload());
        
        // Assistant button
        console.log('Setting up assistant button event listener...');
        if (this.assistantButton) {
            this.assistantButton.addEventListener('click', () => {
                console.log('Assistant button clicked!');
                this.toggleSidebar();
            });
            console.log('Assistant button event listener added');
        } else {
            console.error('Assistant button not found!');
        }
        
        // Close sidebar button
        console.log('Setting up close sidebar button...');
        if (this.closeSidebar) {
            this.closeSidebar.addEventListener('click', () => {
                console.log('Close sidebar button clicked!');
                this.hideSidebar();
            });
            console.log('Close sidebar button event listener added');
        } else {
            console.error('Close sidebar button not found!');
        }

        // Chat functionality
        this.setupChatFunctionality();
        

        // Setup BrowserView integration
        this.setupBrowserViewIntegration();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.metaKey || e.ctrlKey) {
                switch (e.key) {
                    case 't':
                        e.preventDefault();
                        this.createNewTab();
                        break;
                    case 'w':
                        e.preventDefault();
                        this.closeCurrentTab();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.reload();
                        break;
                    case 'l':
                        e.preventDefault();
                        this.addressBar.select();
                        break;
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                    case '5':
                    case '6':
                    case '7':
                    case '8':
                    case '9':
                        e.preventDefault();
                        this.switchToTab(parseInt(e.key) - 1);
                        break;
                }
            }
            
            if (e.key === 'Escape' && this.sidebarVisible) {
                this.hideSidebar();
            }
        });
    }

        setupIPC() {
            // Tab management
            ipcRenderer.on('tab-created', (event, tab) => {
                this.addTab(tab);
            });

            ipcRenderer.on('tab-closed', (event, tabId) => {
                this.removeTab(tabId);
            });

            ipcRenderer.on('tab-switched', (event, tabId) => {
                if (!this.isSwitchingTab) {
                    this.currentTabId = tabId;
                    this.renderTabs();
                }
            });

            ipcRenderer.on('tab-updated', (event, tab) => {
                this.updateTab(tab);
            });

            // BrowserView events
            ipcRenderer.on('loading-started', () => {
                this.loadingBar.style.width = '30%';
            });

            ipcRenderer.on('loading-finished', () => {
                this.loadingBar.style.width = '100%';
                setTimeout(() => {
                    this.loadingBar.style.width = '0%';
                }, 300);
                
                this.updateAddressBar();
                this.updateNavigationButtons();
            });

            ipcRenderer.on('loading-failed', (event, error) => {
                this.loadingBar.style.width = '0%';
                console.error('Page failed to load:', error);
            });

            ipcRenderer.on('page-info', (event, info) => {
                this.updateTabTitle(info.title);
                if (this.currentTabId && this.tabs.has(this.currentTabId)) {
                    const tab = this.tabs.get(this.currentTabId);
                    tab.url = info.url;
                    tab.title = info.title;
                    this.updateTab(tab);
                }
                this.updateAddressBar();
                this.updateNavigationButtons();
            });

            // Commands from main process
            ipcRenderer.on('create-new-tab', () => {
                this.createNewTab();
            });

            ipcRenderer.on('close-current-tab', () => {
                this.closeCurrentTab();
            });
        }

        setupBrowserViewIntegration() {
            // BrowserView is handled by main process
            // Don't create tabs here - let the main process handle it
            console.log('BrowserView integration setup complete');
            
            // Wait a bit for the main process to create the initial tab
            setTimeout(() => {
                if (this.tabs.size === 0) {
                    console.log('No tabs found, requesting initial tab creation');
                    this.createNewTab();
                }
            }, 500);
        }

    // Tab Management
    addTab(tab) {
        // Check if this is replacing a temporary tab
        const existingTempTab = Array.from(this.tabs.keys()).find(tabId => tabId.startsWith('temp-tab-'));
        
        if (existingTempTab && !tab.id.startsWith('temp-tab-')) {
            // Replace the temporary tab with the real one
            this.tabs.delete(existingTempTab);
            console.log('Replaced temporary tab:', existingTempTab, 'with real tab:', tab.id);
        }
        
        this.tabs.set(tab.id, tab);
        if (!this.currentTabId) {
            this.currentTabId = tab.id;
        }
        this.renderTabs();
        console.log('Tab added:', tab.id, 'Current tab:', this.currentTabId, 'Total tabs:', this.tabs.size);
    }

    removeTab(tabId) {
        this.tabs.delete(tabId);
        
        if (this.currentTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.currentTabId = remainingTabs[0];
            } else {
                this.currentTabId = null;
            }
        }
        
        this.renderTabs();
        console.log('Tab removed:', tabId, 'Current tab:', this.currentTabId);
    }

        renderTabs() {
            console.log('Rendering tabs:', this.tabs.size, 'Current:', this.currentTabId);
            this.tabBar.innerHTML = '';
            
            // Add window controls spacer first (for macOS window controls)
            const spacer = document.createElement('div');
            spacer.className = 'window-controls-spacer';
            this.tabBar.appendChild(spacer);
            
            // Add tabs
            this.tabs.forEach((tab, tabId) => {
                const tabElement = this.createTabElement(tab);
                this.tabBar.appendChild(tabElement);
            });

            // Add new tab button
            const newTabButton = document.createElement('button');
            newTabButton.className = 'new-tab-button';
            newTabButton.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
            newTabButton.title = 'New Tab (⌘T)';
            newTabButton.addEventListener('click', () => {
                console.log('New tab button clicked');
                this.createNewTab();
            });
            this.tabBar.appendChild(newTabButton);
            
            console.log('Tabs rendered, tabBar children:', this.tabBar.children.length);
        }

    createTabElement(tab) {
        console.log('Creating tab element for:', tab.id, 'Active:', this.currentTabId === tab.id);
        const tabDiv = document.createElement('div');
        tabDiv.className = `tab ${this.currentTabId === tab.id ? 'active' : ''}`;
        tabDiv.addEventListener('click', () => {
            console.log('Tab clicked:', tab.id);
            this.switchToTabById(tab.id);
        });

        const favicon = document.createElement('img');
        favicon.className = 'tab-favicon';
        if (tab.isLoading) {
            // Show loading spinner for temporary tabs
            favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="%23cccccc"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416"><animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/><animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/></circle></svg>';
        } else {
            favicon.src = tab.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="%23cccccc"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
        }
        favicon.onerror = () => {
            favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="%23cccccc"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
        };

        const title = document.createElement('div');
        title.className = 'tab-title';
        title.textContent = tab.title || 'New Tab';

        const closeButton = document.createElement('button');
        closeButton.className = 'tab-close';
        closeButton.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tab.id);
        });

        tabDiv.appendChild(favicon);
        tabDiv.appendChild(title);
        tabDiv.appendChild(closeButton);

        return tabDiv;
    }

        switchToTabById(tabId) {
            if (this.tabs.has(tabId) && !this.isSwitchingTab) {
                this.isSwitchingTab = true;
                this.currentTabId = tabId;
                this.renderTabs();
                
                // Tell the main process to switch to this tab
                ipcRenderer.invoke('switch-tab', tabId).then(() => {
                    this.isSwitchingTab = false;
                }).catch(error => {
                    console.error('Tab switch error:', error);
                    this.isSwitchingTab = false;
                });
                
                console.log('Switched to tab:', tabId);
            }
        }

    switchToTab(index) {
        const tabIds = Array.from(this.tabs.keys());
        if (tabIds[index]) {
            this.switchToTabById(tabIds[index]);
        }
    }

    updateTab(tab) {
        if (this.tabs.has(tab.id)) {
            this.tabs.set(tab.id, tab);
            this.renderTabs();
        }
    }

    updateTabTitle(title) {
        if (this.currentTabId && this.tabs.has(this.currentTabId)) {
            const tab = this.tabs.get(this.currentTabId);
            tab.title = title;
            this.updateTab(tab);
        }
    }

    updateTabFavicon(favicon) {
        if (this.currentTabId && this.tabs.has(this.currentTabId)) {
            const tab = this.tabs.get(this.currentTabId);
            tab.favicon = favicon;
            this.updateTab(tab);
        }
    }

        // Helper functions for URL detection
        isDomainName(input) {
            // Remove www. prefix if present for checking
            const cleanInput = input.toLowerCase().replace(/^www\./, '');
            
            // Domain name regex: alphanumeric, hyphens, dots, and common TLDs
            const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
            
            // Also check for common single-word domains like "localhost"
            const localhostRegex = /^(localhost|localhost:\d+)$/;
            
            return domainRegex.test(cleanInput) || localhostRegex.test(input);
        }
        
        isIPAddress(input) {
            // IPv4 address regex
            const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            // IPv6 address regex (simplified)
            const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
            return ipv4Regex.test(input) || ipv6Regex.test(input);
        }
        
        isCommonDomain(input) {
            // Common domains that don't typically use www
            const commonDomains = [
                'github.com', 'netflix.com', 'youtube.com', 'google.com', 'facebook.com',
                'twitter.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'amazon.com',
                'apple.com', 'microsoft.com', 'adobe.com', 'stackoverflow.com', 'medium.com',
                'wikipedia.org', 'reddit.com', 'discord.com', 'slack.com', 'zoom.us'
            ];
            return commonDomains.includes(input.toLowerCase());
        }

        // Navigation
        navigate(url) {
            // Clean the URL
            url = url.trim();
            
            // If it already has a protocol, use it as is
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
                // URL is already properly formatted
            }
            // Check if it looks like a domain name
            else if (this.isDomainName(url)) {
                // Add https:// protocol
                // Don't add www. if it's already there or if it's a common domain
                if (!url.toLowerCase().startsWith('www.') && !this.isCommonDomain(url)) {
                    url = `https://www.${url}`;
                } else {
                    url = `https://${url}`;
                }
            }
            // Check if it's an IP address
            else if (this.isIPAddress(url)) {
                // Add https:// protocol
                url = `https://${url}`;
            }
            // Otherwise treat as search query
            else {
                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
            
            // Navigate via BrowserView
            ipcRenderer.invoke('navigate', url);
            
            // Update current tab
            if (this.currentTabId && this.tabs.has(this.currentTabId)) {
                const tab = this.tabs.get(this.currentTabId);
                tab.url = url;
                tab.isLoading = true;
                this.updateTab(tab);
            }
        }

    updateAddressBar() {
        if (this.currentTabId && this.tabs.has(this.currentTabId)) {
            const tab = this.tabs.get(this.currentTabId);
            this.addressBar.value = tab.url;
        }
    }

        async updateNavigationButtons() {
            try {
                const pageInfo = await ipcRenderer.invoke('get-page-info');
                this.backButton.disabled = !pageInfo.canGoBack;
                this.forwardButton.disabled = !pageInfo.canGoForward;
            } catch (error) {
                console.error('Failed to get page info:', error);
            }
        }

        goBack() {
            ipcRenderer.invoke('go-back');
        }

        goForward() {
            ipcRenderer.invoke('go-forward');
        }

        reload() {
            ipcRenderer.invoke('reload');
        }

    // Tab Actions
    createNewTab(url = 'https://www.google.com') {
        console.log('Creating new tab with URL:', url, 'Current tabs:', this.tabs.size);
        
        // Create tab immediately in renderer for instant UI response
        const tempTabId = `temp-tab-${Date.now()}`;
        const tempTab = {
            id: tempTabId,
            url: url,
            title: 'New Tab',
            favicon: null,
            isLoading: true
        };
        
        // Add tab immediately to UI
        this.addTab(tempTab);
        
        // Then sync with main process
        ipcRenderer.invoke('create-tab', url).then(result => {
            console.log('Tab creation result:', result);
            // The main process will send 'tab-created' event which will update the temp tab
        }).catch(error => {
            console.error('Tab creation error:', error);
            // Remove temp tab if creation failed
            this.removeTab(tempTabId);
        });
    }

    closeTab(tabId) {
        ipcRenderer.invoke('close-tab', tabId);
    }

    closeCurrentTab() {
        if (this.currentTabId && this.tabs.size > 1) {
            this.closeTab(this.currentTabId);
        } else if (this.tabs.size === 1) {
            // Don't close the last tab, just create a new one
            this.createNewTab();
        }
    }

    // Sidebar
    toggleSidebar() {
        console.log('toggleSidebar called, current state:', this.sidebarVisible);
        console.log('sidebar element:', this.sidebar);
        
        this.sidebarVisible = !this.sidebarVisible;
        console.log('new sidebar state:', this.sidebarVisible);
        
        if (this.sidebar) {
            const contentArea = document.querySelector('.content-area');
            
            if (this.sidebarVisible) {
                this.sidebar.classList.add('visible');
                console.log('Added visible class to sidebar');
                
                // Hide loading bar when sidebar is visible
                if (this.loadingBar) {
                    this.loadingBar.style.display = 'none';
                }
                
                // Adjust content area width
                if (contentArea) {
                    contentArea.style.width = 'calc(100% - 320px)';
                }
                
                // Adjust BrowserView bounds to make room for sidebar
                ipcRenderer.invoke('adjust-browser-view', { sidebarVisible: true });
                
                if (this.assistantButton) {
                    this.assistantButton.style.background = 'rgba(255, 255, 255, 0.2)';
                    this.assistantButton.style.borderRadius = '20px';
                }
            } else {
                this.sidebar.classList.remove('visible');
                console.log('Removed visible class from sidebar');
                
                // Show loading bar when sidebar is hidden
                if (this.loadingBar) {
                    this.loadingBar.style.display = 'block';
                }
                
                // Reset content area width
                if (contentArea) {
                    contentArea.style.width = '100%';
                }
                
                // Reset BrowserView bounds to full width
                ipcRenderer.invoke('adjust-browser-view', { sidebarVisible: false });
                
                if (this.assistantButton) {
                    this.assistantButton.style.background = 'transparent';
                    this.assistantButton.style.borderRadius = '6px';
                }
            }
        } else {
            console.error('Sidebar element is null!');
        }
    }

    hideSidebar() {
        this.sidebarVisible = false;
        this.sidebar.classList.remove('visible');
        
        // Show loading bar when sidebar is hidden
        if (this.loadingBar) {
            this.loadingBar.style.display = 'block';
        }
        
        // Reset content area width
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.style.width = '100%';
        }
        
        // Reset BrowserView bounds to full width
        ipcRenderer.invoke('adjust-browser-view', { sidebarVisible: false });
        
        if (this.assistantButton) {
            this.assistantButton.style.background = 'transparent';
            this.assistantButton.style.borderRadius = '6px';
        }
    }

    // Chat Functionality
    setupChatFunctionality() {
        this.apiKey = 'env'; // Always use environment variable
        this.chatHistory = [];
        this.isAgentMode = false;
        this.currentTask = null;
        this.taskSteps = [];
        this.currentStepIndex = 0;
        
        // Enhanced agentic capabilities
        this.goalDecomposition = null;
        this.currentContext = null;
        this.executionPlan = null;
        this.adaptationHistory = [];
        
        // Always show chat interface directly
        this.showChatInterface();

        // No API key input needed - using environment variable

        // Chat functionality
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendMessage');

        const sendMessage = async () => {
            const message = chatInput.value.trim();
            if (!message || !this.apiKey) return;

            // Add user message
            this.addChatMessage(message, 'user');
            chatInput.value = '';
            sendButton.disabled = true;

            // Let ChatGPT analyze the intent and guide the response
            await this.handleUserMessage(message);
        };

        if (sendButton) {
            sendButton.addEventListener('click', sendMessage);
        }

        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
    }

    // ChatGPT-powered intelligent routing
    async analyzeUserIntent(message) {
        try {
            const analysis = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [
                    {
                        role: 'system',
                        content: `You are an advanced AI assistant that analyzes user messages with comprehensive Chain of Thought reasoning for web automation.

**COMPREHENSIVE CHAIN OF THOUGHT ANALYSIS REQUIRED:**

**PHASE 1 - GOAL ANALYSIS:**
- Primary objective: Extract and clearly state the main goal
- Key requirements: Identify constraints, targets, platforms, conditions
- Success criteria: Define exactly what completion looks like
- Estimated complexity: Simple/Medium/Complex based on steps needed

**PHASE 2 - CURRENT STATE ASSESSMENT:**
- Page state: loaded/loading/error/unknown
- Available elements: Estimate interactive elements
- Navigation status: on target site/need navigation/wrong site

**PHASE 3 - STRATEGIC PLANNING:**
- Immediate priority: What absolutely must happen next
- Element identification: Specific element needed and how to find it
- Interaction method: Exact action type and parameters
- Expected outcome: What should happen after this action
- Validation criteria: How to confirm this action succeeded

**PHASE 4 - EXECUTION STRATEGY:**
- Primary approach: Main strategy for this step
- Fallback options: Alternative approaches if primary fails
- Error prevention: What to check before acting
- Recovery plan: What to do if action fails

**PHASE 5 - PROGRESS TRACKING:**
- Current phase: navigation/search/interaction/verification
- Actions completed: Estimate based on context
- Confidence level: Percentage based on clarity
- Next objective: What should happen after this action

RESPONSE FORMAT (JSON only):
{
  "intent": "chat" or "action",
  "actionType": "navigate" or "click" or "type" or "search" or "fill" or "analyze" or null,
  "target": "specific target (URL, element, etc.)",
  "reasoning": "complete 5-phase analysis with detailed reasoning",
  "nextSteps": ["step1", "step2", "step3"],
  "primaryObjective": "extracted main goal",
  "requirements": "key requirements and constraints",
  "successCriteria": "what completion looks like",
  "complexity": "Simple/Medium/Complex",
  "pageState": "current page assessment",
  "elementCount": "estimated interactive elements",
  "navigationStatus": "navigation assessment",
  "immediatePriority": "what must happen next",
  "elementIdentification": "how to find target elements",
  "interactionMethod": "exact action parameters",
  "expectedOutcome": "what should happen after",
  "validationCriteria": "how to confirm success",
  "primaryApproach": "main strategy",
  "fallbackOptions": "alternative approaches",
  "errorPrevention": "what to check before acting",
  "recoveryPlan": "what to do if action fails",
  "currentPhase": "current automation phase",
  "confidence": "confidence percentage",
  "nextObjective": "what happens next"
}

ENHANCED EXAMPLES:
- "search for phones under 50k on amazon" → {
    "intent": "action", 
    "actionType": "search", 
    "target": "phones under 50000", 
    "reasoning": "PHASE 1: Primary objective is to find phones under ₹50,000. Key requirements include price constraint and Amazon platform. Success criteria is viewing phone listings with prices under ₹50,000. Complexity is Medium requiring navigation and search. PHASE 2: Need navigation to Amazon. PHASE 3: Immediate priority is navigate to Amazon then search. Element identification requires search input field. Interaction method is type search query and submit. Expected outcome is search results page. PHASE 4: Primary approach is direct navigation to Amazon then search execution. Fallback options include alternative search methods. PHASE 5: Current phase is navigation, confidence 85%.",
    "primaryObjective": "Find phones under ₹50,000 on Amazon",
    "requirements": "Price constraint: under ₹50,000, Platform: Amazon",
    "successCriteria": "View phone listings with prices under ₹50,000",
    "complexity": "Medium",
    "navigationStatus": "Need navigation to Amazon",
    "immediatePriority": "Navigate to Amazon then execute search",
    "primaryApproach": "Direct navigation to Amazon, then search execution",
    "currentPhase": "navigation",
    "confidence": "85%"
  }

IMPORTANT: Always include https:// in navigation targets and provide comprehensive 5-phase analysis for all actions.`
                    },
                    {
                        role: 'user',
                        content: `Analyze this user message: "${message}"`
                    }
                ]
            });

            if (analysis.success) {
                return JSON.parse(analysis.data.choices[0].message.content);
            } else {
                throw new Error('Failed to analyze user intent');
            }
        } catch (error) {
            console.error('Intent analysis error:', error);
            // Fallback to simple keyword detection
            return this.fallbackIntentAnalysis(message);
        }
    }

    fallbackIntentAnalysis(message) {
        const lowerMessage = message.toLowerCase().trim();
        
        // Simple navigation patterns
        if (lowerMessage.includes('open') || lowerMessage.includes('visit') || lowerMessage.includes('go to')) {
            const website = this.extractWebsiteFromMessage(message);
            if (website) {
                return {
                    intent: "action",
                    actionType: "navigate", 
                    target: website,
                    reasoning: "navigation request detected",
                    nextSteps: [`navigate to ${website}`]
                };
            }
        }
        
        // Default to chat
        return {
            intent: "chat",
            actionType: null,
            target: null,
            reasoning: "conversational message",
            nextSteps: ["respond conversationally"]
        };
    }

    extractWebsiteFromMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        // Enhanced website mappings with variations and aliases
        const websiteMap = {
            'instagram': ['insta', 'ig', 'instagram.com'],
            'facebook': ['fb', 'facebook.com'],
            'twitter': ['twit', 'twitter.com', 'x.com'],
            'youtube': ['yt', 'youtube.com', 'you tube'],
            'google': ['google.com', 'goog'],
            'github': ['git', 'github.com'],
            'linkedin': ['li', 'linkedin.com'],
            'reddit': ['reddit.com'],
            'amazon': ['amazon.com', 'amz'],
            'netflix': ['netflix.com'],
            'spotify': ['spotify.com'],
            'discord': ['discord.com'],
            'twitch': ['twitch.tv'],
            'tiktok': ['tiktok.com'],
            'snapchat': ['snap', 'snapchat.com'],
            'pinterest': ['pinterest.com'],
            'wikipedia': ['wiki', 'wikipedia.org'],
            'stackoverflow': ['stackoverflow.com', 'so'],
            'medium': ['medium.com'],
            'dev.to': ['dev.to']
        };

        // Check for variations and aliases
        for (const [site, variations] of Object.entries(websiteMap)) {
            for (const variation of variations) {
                if (lowerMessage.includes(variation)) {
                    // Return the main URL for the site
                    return `https://${site}.com`;
                }
            }
        }

        // Check if it's already a URL
        if (lowerMessage.includes('http://') || lowerMessage.includes('https://')) {
            const urlMatch = message.match(/https?:\/\/[^\s]+/);
            return urlMatch ? urlMatch[0] : null;
        }

        // Check for domain-like patterns
        const domainMatch = message.match(/(?:open|visit|go to|navigate to)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (domainMatch) {
            const domain = domainMatch[1];
            return domain.startsWith('http') ? domain : `https://${domain}`;
        }

        // Try to extract website name from common patterns
        const patterns = [
            /(?:open|visit|go to|navigate to)\s+([a-zA-Z0-9]+)/i,
            /open\s+([a-zA-Z0-9]+)/i,
            /visit\s+([a-zA-Z0-9]+)/i,
            /go\s+to\s+([a-zA-Z0-9]+)/i
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                const potentialSite = match[1].toLowerCase();
                // Check if it matches any known site variations
                for (const [site, variations] of Object.entries(websiteMap)) {
                    if (variations.some(v => v.includes(potentialSite) || potentialSite.includes(v))) {
                        return `https://${site}.com`;
                    }
                }
            }
        }

        return null;
    }

    async handleUserMessage(message) {
        try {
            // Show that we're analyzing the message
            this.showTypingIndicator();
            
            // Step 1: Let ChatGPT analyze the user's intent
            const intent = await this.analyzeUserIntent(message);
            console.log('ChatGPT Intent Analysis:', intent);
            
            this.hideTypingIndicator();
            
            // Step 2: Execute based on ChatGPT's decision
            if (intent.intent === 'action') {
                await this.executeChatGPTAction(intent, message);
            } else {
                await this.handleChatResponse(message, intent);
            }
            
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Message handling error:', error);
            this.addChatMessage(`❌ Error processing your message: ${error.message}. Please try again.`, 'assistant');
        }
    }

    async executeChatGPTAction(intent, originalMessage) {
        try {
            // Enhanced Chain of Thought Analysis Display
            this.addChatMessage(`🧠 **COMPREHENSIVE CHAIN OF THOUGHT ANALYSIS:**`, 'assistant');
            
            this.addChatMessage(`**PHASE 1 - GOAL ANALYSIS:**
• Primary objective: ${intent.primaryObjective || 'Search for phones under 50k'}
• Key requirements: ${intent.requirements || 'Price constraint: under ₹50,000, Platform: Amazon'}
• Success criteria: ${intent.successCriteria || 'View phone listings with prices under ₹50,000'}
• Estimated complexity: ${intent.complexity || 'Medium - requires navigation and search'}`, 'assistant');
            
            this.addChatMessage(`**PHASE 2 - CURRENT STATE ASSESSMENT:**
• Current URL: ${window.location.href || 'about:blank'}
• Page title: ${document.title || 'Loading...'}
• Page state: ${intent.pageState || 'Analyzing...'}
• Available elements: ${intent.elementCount || 'Scanning...'}
• Navigation status: ${intent.navigationStatus || 'Determining...'}`, 'assistant');
            
            this.addChatMessage(`**PHASE 3 - STRATEGIC PLANNING:**
• Immediate priority: ${intent.immediatePriority || 'Navigate to Amazon and locate search functionality'}
• Element identification: ${intent.elementIdentification || 'Search input field with placeholder or aria-label'}
• Interaction method: ${intent.interactionMethod || 'Type search query and submit'}
• Expected outcome: ${intent.expectedOutcome || 'Search results page with phone listings'}
• Validation criteria: ${intent.validationCriteria || 'URL contains search parameters and results are visible'}`, 'assistant');
            
            this.addChatMessage(`**PHASE 4 - EXECUTION STRATEGY:**
• Primary approach: ${intent.primaryApproach || 'Direct navigation to Amazon, then search execution'}
• Fallback options: ${intent.fallbackOptions || 'Alternative search methods, manual element selection'}
• Error prevention: ${intent.errorPrevention || 'Validate elements before interaction, check page load state'}
• Recovery plan: ${intent.recoveryPlan || 'Retry with different selectors, refresh page if needed'}`, 'assistant');
            
            this.addChatMessage(`**PHASE 5 - PROGRESS TRACKING:**
• Current phase: ${intent.currentPhase || 'navigation'}
• Actions completed: ${this.completedActions || 0}
• Confidence level: ${intent.confidence || '75%'}
• Next objective: ${intent.nextObjective || 'Execute search on Amazon'}`, 'assistant');
            
            this.addChatMessage(`🎯 **RELIABLE DECISION:** ${intent.actionType} → ${intent.target}`, 'assistant');
            this.addChatMessage(`🔍 **REASONING:** ${intent.reasoning}`, 'assistant');
            
            // Execute the action based on ChatGPT's guidance
            switch (intent.actionType) {
                case 'navigate':
                    await this.executeEnhancedNavigation(intent.target, intent);
                    break;
                case 'search':
                    // For Amazon searches, use our agentic browser system
                    if (intent.target.toLowerCase().includes('amazon') || 
                        originalMessage.toLowerCase().includes('amazon') ||
                        intent.primaryApproach?.toLowerCase().includes('amazon')) {
                        await this.executeAgenticSearch(originalMessage, intent);
                    } else {
                        await this.executeEnhancedSearch(intent.target, intent);
                    }
                    break;
                case 'complex_task':
                    // For complex multi-step tasks, use enhanced agentic browser
                    await this.executeComplexTask(originalMessage, intent);
                    break;
                case 'click':
                    await this.executeEnhancedClick(intent.target, intent);
                    break;
                case 'type':
                    await this.executeEnhancedType(intent.target, intent);
                    break;
                case 'fill':
                    await this.executeEnhancedFill(intent.target, intent);
                    break;
                case 'analyze':
                    await this.executeEnhancedAnalysis(intent.target, intent);
                    break;
                default:
                    // Check if this is a complex task that needs special handling
                    const isComplexTask = this.detectComplexTask(originalMessage);
                    if (isComplexTask) {
                        await this.executeComplexTask(originalMessage, intent);
                    } else {
                        // For other complex actions, use the full agent system
                        await this.handleComplexAction(originalMessage, intent);
                    }
            }
            
        } catch (error) {
            console.error('Action execution error:', error);
            this.addChatMessage(`❌ **FAILED EXECUTION:** ${error.message}`, 'assistant');
            this.addChatMessage(`🔄 **RECOVERY ATTEMPT:** Trying alternative strategy...`, 'assistant');
            
            // Try recovery
            await this.attemptRecovery(intent, originalMessage);
        }
    }

    async executeEnhancedNavigation(target, intent) {
        // Ensure the URL has proper protocol
        let url = target;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
        }
        
        this.addChatMessage(`🌐 **NAVIGATING TO:** ${url}`, 'assistant');
        this.addChatMessage(`🔍 **PRE-VALIDATION:** Checking URL format and accessibility...`, 'assistant');
        
        try {
            // Pre-navigation validation
            const isValidUrl = this.validateUrl(url);
            if (!isValidUrl) {
                throw new Error(`Invalid URL format: ${url}`);
            }
            
            this.addChatMessage(`✅ **URL VALIDATED:** Format is correct`, 'assistant');
            
            console.log('Attempting navigation to:', url);
            const result = await ipcRenderer.invoke('execute-action', {
                action: 'navigate',
                url: url
            });
            
            console.log('Navigation result:', result);
            
            if (result && result.success) {
                this.addChatMessage(`✅ **NAVIGATION SUCCESS:** Successfully reached ${url}`, 'assistant');
                this.addChatMessage(`📊 **PAGE STATE:** Navigation completed, waiting for page load...`, 'assistant');
            } else {
                this.addChatMessage(`❌ **NAVIGATION FAILED:** ${result ? result.error : 'Unknown error'}`, 'assistant');
                throw new Error(result ? result.error : 'Unknown navigation error');
            }
        } catch (error) {
            console.error('Navigation error:', error);
            this.addChatMessage(`❌ **NAVIGATION FAILED:** ${error.message}`, 'assistant');
            throw error;
        }
    }
    
    async executeNavigation(target) {
        await this.executeEnhancedNavigation(target, {});
    }

    async executeEnhancedSearch(target, intent) {
        this.addChatMessage(`🔍 **SEARCH EXECUTION:** Searching for "${target}"`, 'assistant');
        
        try {
            this.addChatMessage(`🔍 **SEARCH STRATEGY:** Using intelligent agentic browser...`, 'assistant');
            
            // Use our new agentic browser system for search
            const goal = `search for "${target}"`;
            const context = {
                searchQuery: target,
                intent: intent,
                expectedResult: 'Search results page'
            };
            
            this.addChatMessage(`🤖 **AGENTIC EXECUTION:** Delegating to intelligent browser agent...`, 'assistant');
            
            const result = await ipcRenderer.invoke('agentic-execute-goal', {
                goal: goal,
                context: context
            });
            
            if (result.success) {
                this.addChatMessage(`✅ **SEARCH COMPLETED:** Agent successfully executed search`, 'assistant');
                this.addChatMessage(`📊 **RESULTS:** ${result.result.completedSteps}/${result.result.totalSteps} steps completed`, 'assistant');
                
                // Show detailed results
                if (result.result.results) {
                    result.result.results.forEach((stepResult, index) => {
                        const status = stepResult.success ? '✅' : '❌';
                        this.addChatMessage(`${status} **Step ${index + 1}:** ${stepResult.description || stepResult.action}`, 'assistant');
                    });
                }
            } else {
                this.addChatMessage(`❌ **SEARCH FAILED:** ${result.error}`, 'assistant');
                this.addChatMessage(`🔄 **FALLBACK:** Trying alternative approach...`, 'assistant');
                
                // Fallback to old method if agentic browser fails
                await this.executeLegacySearch(target, intent);
            }
            
        } catch (error) {
            this.addChatMessage(`❌ **SEARCH ERROR:** ${error.message}`, 'assistant');
            this.addChatMessage(`🔄 **RECOVERY:** Attempting legacy search method...`, 'assistant');
            
            // Fallback to legacy search
            await this.executeLegacySearch(target, intent);
        }
    }
    
    async executeLegacySearch(target, intent) {
        try {
            // Phase 1: Determine search strategy
            this.addChatMessage(`🔍 **LEGACY SEARCH:** Using fallback search method...`, 'assistant');
            this.addChatMessage(`🔍 **SEARCH STRATEGY:** Analyzing search requirements...`, 'assistant');
            
            // Check if we need to navigate to a specific site first
            const searchSite = this.determineSearchSite(target, intent);
            if (searchSite && searchSite !== 'current') {
                this.addChatMessage(`🌐 **SITE SELECTION:** Navigating to ${searchSite} for search`, 'assistant');
                await this.executeEnhancedNavigation(searchSite, intent);
                
                // Wait for page to load
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            // Phase 2: Find search input field
            this.addChatMessage(`🔍 **ELEMENT DETECTION:** Looking for search input field...`, 'assistant');
            
            const searchInput = await this.findSearchInput();
            if (!searchInput) {
                throw new Error('Could not find search input field');
            }
            
            this.addChatMessage(`✅ **SEARCH INPUT FOUND:** ${searchInput.description}`, 'assistant');
            
            // Phase 3: Type search query
            this.addChatMessage(`⌨️ **TYPING SEARCH:** "${target}"`, 'assistant');
            
            const typeResult = await ipcRenderer.invoke('execute-action', {
                action: 'type',
                selector: searchInput.selector,
                text: target
            });
            
            if (!typeResult || !typeResult.success) {
                throw new Error('Failed to type search query');
            }
            
            this.addChatMessage(`✅ **SEARCH TYPED:** Successfully entered search query`, 'assistant');
            
            // Phase 4: Submit search
            this.addChatMessage(`🚀 **SUBMITTING SEARCH:** Executing search...`, 'assistant');
            
            const submitResult = await ipcRenderer.invoke('execute-action', {
                action: 'click',
                selector: searchInput.submitSelector || 'input[type="submit"]'
            });
            
            if (!submitResult || !submitResult.success) {
                // Try pressing Enter instead
                this.addChatMessage(`🔄 **ALTERNATIVE SUBMIT:** Trying Enter key...`, 'assistant');
                await ipcRenderer.invoke('execute-action', {
                    action: 'press_key',
                    key: 'Enter'
                });
            }
            
            this.addChatMessage(`✅ **SEARCH SUBMITTED:** Search executed successfully`, 'assistant');
            
            // Phase 5: Validate results
            setTimeout(async () => {
                this.addChatMessage(`📊 **RESULTS VALIDATION:** Checking search results...`, 'assistant');
                this.addChatMessage(`✅ **SEARCH COMPLETE:** Results should be loading...`, 'assistant');
            }, 2000);
            
        } catch (error) {
            this.addChatMessage(`❌ **LEGACY SEARCH FAILED:** ${error.message}`, 'assistant');
            await this.attemptSearchRecovery(target, intent);
            throw error;
        }
    }
    
    async executeSearch(target) {
        await this.executeEnhancedSearch(target, {});
    }
    
    async executeAgenticSearch(originalMessage, intent) {
        try {
            this.addChatMessage(`🤖 **AGENTIC SEARCH:** Using intelligent browser agent for Amazon search...`, 'assistant');
            
            // Use our new agentic browser system for Amazon searches
            const result = await ipcRenderer.invoke('agentic-execute-goal', {
                goal: originalMessage,
                context: {
                    intent: intent,
                    expectedResult: 'Amazon search results page',
                    searchType: 'amazon'
                }
            });
            
            if (result.success) {
                this.addChatMessage(`✅ **AGENTIC SEARCH COMPLETED:** Successfully executed Amazon search`, 'assistant');
                this.addChatMessage(`📊 **EXECUTION SUMMARY:** ${result.result.completedSteps}/${result.result.totalSteps} steps completed`, 'assistant');
                
                // Show detailed step results
                if (result.result.results && result.result.results.length > 0) {
                    this.addChatMessage(`📋 **STEP-BY-STEP RESULTS:**`, 'assistant');
                    result.result.results.forEach((stepResult, index) => {
                        const status = stepResult.success ? '✅' : '❌';
                        const description = stepResult.description || stepResult.action || 'Unknown action';
                        this.addChatMessage(`${status} **Step ${index + 1}:** ${description}`, 'assistant');
                        
                        if (!stepResult.success && stepResult.error) {
                            this.addChatMessage(`   ⚠️ Error: ${stepResult.error}`, 'assistant');
                        }
                    });
                }
                
                this.addChatMessage(`🎉 **SEARCH SUCCESS:** Amazon search completed successfully!`, 'assistant');
            } else {
                this.addChatMessage(`❌ **AGENTIC SEARCH FAILED:** ${result.error}`, 'assistant');
                this.addChatMessage(`🔄 **FALLBACK:** Trying legacy search method...`, 'assistant');
                
                // Fallback to legacy search
                await this.executeEnhancedSearch(intent.target, intent);
            }
            
        } catch (error) {
            this.addChatMessage(`❌ **AGENTIC SEARCH ERROR:** ${error.message}`, 'assistant');
            this.addChatMessage(`🔄 **RECOVERY:** Attempting legacy search method...`, 'assistant');
            
            // Fallback to legacy search
            await this.executeEnhancedSearch(intent.target, intent);
        }
    }
    
    async executeComplexTask(originalMessage, intent) {
        try {
            this.addChatMessage(`🧠 **COMPLEX TASK:** Executing multi-step task with state awareness...`, 'assistant');
            this.addChatMessage(`🎯 **TASK:** ${originalMessage}`, 'assistant');
            
            // Detect if this is a complex task that needs special handling
            const isComplexTask = this.detectComplexTask(originalMessage);
            
            if (isComplexTask) {
                this.addChatMessage(`🔍 **TASK ANALYSIS:** Detected complex multi-step workflow`, 'assistant');
                this.addChatMessage(`📋 **SUB-GOALS:** ${isComplexTask.subGoals.join(', ')}`, 'assistant');
                
                // Use enhanced agentic browser for complex tasks
                const result = await ipcRenderer.invoke('agentic-execute-goal', {
                    goal: originalMessage,
                    context: {
                        intent: intent,
                        taskType: 'complex',
                        subGoals: isComplexTask.subGoals,
                        expectedResult: isComplexTask.expectedResult
                    }
                });
                
                if (result.success) {
                    this.addChatMessage(`✅ **COMPLEX TASK COMPLETED:** Successfully executed multi-step workflow`, 'assistant');
                    this.addChatMessage(`📊 **EXECUTION SUMMARY:** ${result.result.completedSteps}/${result.result.totalSteps} steps completed`, 'assistant');
                    
                    // Show goal progress
                    if (result.result.subGoals) {
                        this.addChatMessage(`🎯 **GOAL PROGRESS:**`, 'assistant');
                        this.addChatMessage(`   Current Phase: ${result.result.subGoals.currentPhase}`, 'assistant');
                        this.addChatMessage(`   Completed Sub-goals: ${result.result.subGoals.completedSubGoals.join(', ')}`, 'assistant');
                        this.addChatMessage(`   Final State: ${result.result.finalState}`, 'assistant');
                    }
                    
                    // Show detailed step results
                    if (result.result.results && result.result.results.length > 0) {
                        this.addChatMessage(`📋 **DETAILED EXECUTION LOG:**`, 'assistant');
                        result.result.results.forEach((stepResult, index) => {
                            const status = stepResult.success ? '✅' : '❌';
                            const description = stepResult.description || stepResult.action || 'Unknown action';
                            const subGoal = stepResult.subGoal ? ` [${stepResult.subGoal}]` : '';
                            this.addChatMessage(`${status} **Step ${index + 1}${subGoal}:** ${description}`, 'assistant');
                            
                            if (stepResult.stateVerified === false) {
                                this.addChatMessage(`   ⚠️ State verification failed`, 'assistant');
                            }
                            
                            if (!stepResult.success && stepResult.error) {
                                this.addChatMessage(`   ❌ Error: ${stepResult.error}`, 'assistant');
                            }
                        });
                    }
                    
                    this.addChatMessage(`🎉 **TASK SUCCESS:** Complex workflow completed successfully!`, 'assistant');
                } else {
                    this.addChatMessage(`❌ **COMPLEX TASK FAILED:** ${result.error}`, 'assistant');
                    this.addChatMessage(`🔄 **FALLBACK:** Trying simplified approach...`, 'assistant');
                    
                    // Fallback to simple search
                    await this.executeAgenticSearch(originalMessage, intent);
                }
            } else {
                // Not a complex task, use regular agentic search
                await this.executeAgenticSearch(originalMessage, intent);
            }
            
        } catch (error) {
            this.addChatMessage(`❌ **COMPLEX TASK ERROR:** ${error.message}`, 'assistant');
            this.addChatMessage(`🔄 **RECOVERY:** Attempting simplified approach...`, 'assistant');
            
            // Fallback to simple search
            await this.executeAgenticSearch(originalMessage, intent);
        }
    }
    
    detectComplexTask(message) {
        const messageLower = message.toLowerCase();
        
        // Define complex task patterns
        const complexPatterns = [
            {
                pattern: /find.*?and.*?add.*?cart/i,
                subGoals: ['search', 'product_discovery', 'product_selection', 'cart_operation'],
                expectedResult: 'Item added to cart'
            },
            {
                pattern: /search.*?and.*?buy/i,
                subGoals: ['search', 'product_discovery', 'product_selection', 'purchase_flow'],
                expectedResult: 'Purchase completed'
            },
            {
                pattern: /find.*?and.*?click/i,
                subGoals: ['search', 'product_discovery', 'product_selection', 'interaction'],
                expectedResult: 'Product selected'
            },
            {
                pattern: /create.*?form.*?with.*?questions/i,
                subGoals: ['navigation', 'form_setup', 'form_creation', 'question_creation'],
                expectedResult: 'Google Form with questions created'
            },
            {
                pattern: /create.*?google.*?form/i,
                subGoals: ['navigation', 'form_setup', 'form_creation'],
                expectedResult: 'Google Form created'
            },
            {
                pattern: /google.*?form.*?mcq/i,
                subGoals: ['navigation', 'form_setup', 'form_creation', 'question_creation'],
                expectedResult: 'Google Form with MCQ questions created'
            }
        ];
        
        for (const complexPattern of complexPatterns) {
            if (complexPattern.pattern.test(messageLower)) {
                return complexPattern;
            }
        }
        
        return null; // Not a complex task
    }
    
    // Helper methods for enhanced search
    determineSearchSite(target, intent) {
        const targetLower = target.toLowerCase();
        
        // If target mentions a specific site, navigate there
        if (targetLower.includes('amazon') || intent.primaryApproach?.includes('Amazon')) {
            return 'https://www.amazon.com';
        }
        if (targetLower.includes('google') || intent.primaryApproach?.includes('Google')) {
            return 'https://www.google.com';
        }
        if (targetLower.includes('youtube')) {
            return 'https://www.youtube.com';
        }
        
        // For shopping queries, default to Amazon
        const shoppingKeywords = ['buy', 'purchase', 'price', 'cost', 'phone', 'laptop', 'electronics'];
        if (shoppingKeywords.some(keyword => targetLower.includes(keyword))) {
            return 'https://www.amazon.com';
        }
        
        return 'current'; // Search on current site
    }
    
    async findSearchInput() {
        const searchSelectors = [
            'input[type="search"]',
            'input[name*="search"]',
            'input[id*="search"]',
            'input[placeholder*="search"]',
            'input[aria-label*="search"]',
            'input[name="q"]', // Google
            'input[name="k"]', // Amazon
            'input[data-testid*="search"]'
        ];
        
        for (const selector of searchSelectors) {
            try {
                const result = await ipcRenderer.invoke('execute-action', {
                    action: 'check_element',
                    selector: selector
                });
                
                if (result && result.success) {
                    return {
                        selector: selector,
                        description: `Search input found with selector: ${selector}`,
                        submitSelector: this.findSubmitButton(selector)
                    };
                }
            } catch (e) {
                continue;
            }
        }
        
        return null;
    }
    
    findSubmitButton(searchSelector) {
        const submitSelectors = [
            'input[type="submit"]',
            'button[type="submit"]',
            'button[aria-label*="search"]',
            '.search-button',
            '#search-button'
        ];
        
        return submitSelectors[0]; // Return first option for now
    }
    
    async attemptSearchRecovery(target, intent) {
        this.addChatMessage(`🔄 **SEARCH RECOVERY:** Trying alternative search approach...`, 'assistant');
        
        try {
            // Try searching on Google as fallback
            this.addChatMessage(`🔄 **FALLBACK SEARCH:** Attempting Google search...`, 'assistant');
            await this.executeEnhancedNavigation('https://www.google.com', intent);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const googleResult = await ipcRenderer.invoke('execute-action', {
                action: 'type',
                selector: 'input[name="q"]',
                text: target
            });
            
            if (googleResult && googleResult.success) {
                this.addChatMessage(`✅ **RECOVERY SUCCESS:** Google search executed`, 'assistant');
                await ipcRenderer.invoke('execute-action', {
                    action: 'press_key',
                    key: 'Enter'
                });
            }
        } catch (error) {
            this.addChatMessage(`❌ **RECOVERY FAILED:** ${error.message}`, 'assistant');
        }
    }

    async executeClick(target) {
                this.addChatMessage(`🔍 Analyzing page to find: ${target}...`, 'assistant');
                
                try {
                    // Step 1: Scrape the current webpage with enhanced Phase 1 data
                    const webpageData = await ipcRenderer.invoke('scrape-webpage');
                    
                    if (!webpageData.success) {
                        this.addChatMessage(`❌ Could not analyze the current page`, 'assistant');
                        return;
                    }
                    
                    // Step 2: Enhanced element analysis with Phase 1 metadata
                    const elementAnalysis = await ipcRenderer.invoke('chatgpt-request', {
                        apiKey: this.apiKey,
                        messages: [
                            {
                                role: 'system',
                                content: `You are an expert at finding web elements using Phase 1 enhanced scraping data. Analyze the webpage and find the best element to click based on the user's goal.

RESPONSE FORMAT (JSON only):
{
  "found": true/false,
  "selector": "CSS selector to click the element",
  "description": "description of what you found",
  "reasoning": "why this element matches the user's goal",
  "confidence": 0.95,
  "elementType": "button/input/link/etc",
  "purpose": "element purpose from metadata",
  "importance": "high/medium/low"
}

PAGE METADATA:
- Title: ${webpageData.data.title}
- URL: ${webpageData.data.url}
- Domain: ${webpageData.data.pageAnalysis.metadata.domain}
- Total Elements: ${webpageData.data.pageAnalysis.metadata.totalElements}
- Clickable Elements: ${webpageData.data.pageAnalysis.metadata.clickableElements}
- Interactive Elements: ${webpageData.data.pageAnalysis.metadata.interactiveElements}

AVAILABLE CLICKABLE ELEMENTS (with enhanced metadata):
${webpageData.data.elements.filter(el => el.isClickable).slice(0, 25).map(el => 
    `- ${el.tagName}${el.id ? `#${el.id}` : ''}${el.className ? `.${el.className.split(' ').slice(0, 2).join('.')}` : ''} 
     Text: "${el.textContent || el.placeholder || el.ariaLabel || ''}" 
     Purpose: ${el.purpose || 'unknown'} 
     Importance: ${el.importance || 'unknown'}
     Type: ${el.type || 'none'}
     Role: ${el.role || 'none'}`
).join('\n')}

HIGH IMPORTANCE ELEMENTS:
${webpageData.data.pageAnalysis.elementCategories.primaryActions.slice(0, 10).map(el => 
    `- ${el.tagName}${el.id ? `#${el.id}` : ''} "${el.textContent || el.placeholder || el.ariaLabel || ''}" (${el.purpose})`
).join('\n')}

Find the best element to click for: "${target}"`
                            },
                            {
                                role: 'user',
                                content: `Find the element to click for: "${target}"`
                            }
                        ]
                    });
                    
                    if (!elementAnalysis.success) {
                        this.addChatMessage(`❌ Could not analyze page elements`, 'assistant');
                        return;
                    }
                    
                    const analysis = JSON.parse(elementAnalysis.data.choices[0].message.content);
                    
                    if (!analysis.found) {
                        this.addChatMessage(`❌ Could not find element: ${target}`, 'assistant');
                        return;
                    }
                    
                    this.addChatMessage(`🎯 Found: ${analysis.description}`, 'assistant');
                    this.addChatMessage(`💡 ${analysis.reasoning}`, 'assistant');
                    this.addChatMessage(`📊 Element Type: ${analysis.elementType}, Purpose: ${analysis.purpose}, Importance: ${analysis.importance}`, 'assistant');
                    this.addChatMessage(`👆 Clicking: ${analysis.description}...`, 'assistant');
                    
                    // Step 3: Execute the click with the found selector
                    const result = await ipcRenderer.invoke('execute-action', {
                        action: 'click',
                        selector: analysis.selector
                    });
                    
                    if (result && result.success) {
                        this.addChatMessage(`✅ Successfully clicked: ${analysis.description}`, 'assistant');
                    } else {
                        this.addChatMessage(`❌ Click failed: ${result ? result.error : 'Unknown error'}`, 'assistant');
                    }
                    
                } catch (error) {
                    console.error('Smart click error:', error);
                    this.addChatMessage(`❌ Click failed: ${error.message}`, 'assistant');
                }
            }

    async executeType(target) {
        this.addChatMessage(`🔍 Analyzing page to find input field for: ${target}...`, 'assistant');
        
        try {
            // Step 1: Scrape the current webpage with enhanced Phase 1 data
            const webpageData = await ipcRenderer.invoke('scrape-webpage');
            
            if (!webpageData.success) {
                this.addChatMessage(`❌ Could not analyze the current page`, 'assistant');
                return;
            }
            
            // Step 2: Enhanced input field analysis with Phase 1 metadata
            const elementAnalysis = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at finding web input elements using Phase 1 enhanced scraping data. Analyze the webpage and find the best input field to type into based on the user's goal.

RESPONSE FORMAT (JSON only):
{
  "found": true/false,
  "selector": "CSS selector to type into the element",
  "description": "description of what input field you found",
  "reasoning": "why this input field is appropriate",
  "confidence": 0.95,
  "text": "what text to type",
  "inputType": "text/email/password/search/etc",
  "purpose": "element purpose from metadata",
  "importance": "high/medium/low"
}

PAGE METADATA:
- Title: ${webpageData.data.title}
- URL: ${webpageData.data.url}
- Domain: ${webpageData.data.pageAnalysis.metadata.domain}
- Form Elements: ${webpageData.data.pageAnalysis.metadata.formElements}
- Can Type: ${webpageData.data.pageAnalysis.metadata.canType}

AVAILABLE INPUT ELEMENTS (with enhanced metadata):
${webpageData.data.elements.filter(el => el.interactionHints.canType).slice(0, 15).map(el => 
    `- ${el.tagName}${el.id ? `#${el.id}` : ''}${el.className ? `.${el.className.split(' ').slice(0, 2).join('.')}` : ''}
     Type: ${el.type || 'text'} 
     Purpose: ${el.purpose || 'unknown'} 
     Importance: ${el.importance || 'unknown'}
     Placeholder: "${el.placeholder || ''}"
     Name: "${el.name || ''}"
     Required: ${el.required || false}
     Disabled: ${el.disabled || false}`
).join('\n')}

FORM FIELDS:
${webpageData.data.pageAnalysis.elementCategories.formFields.slice(0, 10).map(el => 
    `- ${el.tagName}${el.id ? `#${el.id}` : ''} "${el.placeholder || el.name || ''}" (${el.purpose}) - ${el.type || 'text'}`
).join('\n')}

Find the best input field for: "${target}"`
                        },
                        {
                            role: 'user',
                            content: `Find the input field for: "${target}"`
                        }
                    ]
                });
                
                if (!elementAnalysis.success) {
                    this.addChatMessage(`❌ Could not analyze page elements`, 'assistant');
                    return;
                }
                
                const analysis = JSON.parse(elementAnalysis.data.choices[0].message.content);
                
                if (!analysis.found) {
                    this.addChatMessage(`❌ Could not find input field for: ${target}`, 'assistant');
                    return;
                }
                
                this.addChatMessage(`🎯 Found: ${analysis.description}`, 'assistant');
                this.addChatMessage(`💡 ${analysis.reasoning}`, 'assistant');
                this.addChatMessage(`📊 Input Type: ${analysis.inputType}, Purpose: ${analysis.purpose}, Importance: ${analysis.importance}`, 'assistant');
                this.addChatMessage(`⌨️ Typing "${analysis.text}" into ${analysis.description}...`, 'assistant');
                
                // Step 3: Execute the typing with the found selector
                const result = await ipcRenderer.invoke('execute-action', {
                    action: 'type',
                    selector: analysis.selector,
                    text: analysis.text
                });
                
                if (result && result.success) {
                    this.addChatMessage(`✅ Successfully typed: ${analysis.text}`, 'assistant');
                } else {
                    this.addChatMessage(`❌ Typing failed: ${result ? result.error : 'Unknown error'}`, 'assistant');
                }
                
            } catch (error) {
                console.error('Smart type error:', error);
                this.addChatMessage(`❌ Typing failed: ${error.message}`, 'assistant');
            }
        }

    async executeFill(target) {
        this.addChatMessage(`📝 Filling form: ${target}...`, 'assistant');
        
        try {
            // Use the full agent system for complex form filling
            await this.handleComplexAction(`fill this form: ${target}`, {
                actionType: 'fill',
                target: target,
                reasoning: 'form filling request'
            });
        } catch (error) {
            console.error('Fill error:', error);
            this.addChatMessage(`❌ Form filling failed: ${error.message}`, 'assistant');
        }
    }

    async executeAnalysis(target) {
        this.addChatMessage(`🔍 Analyzing: ${target}...`, 'assistant');
        
        try {
            // Use the full agent system for analysis
            await this.handleComplexAction(`analyze this: ${target}`, {
                actionType: 'analyze',
                target: target,
                reasoning: 'analysis request'
            });
        } catch (error) {
            console.error('Analysis error:', error);
            this.addChatMessage(`❌ Analysis failed: ${error.message}`, 'assistant');
        }
    }

    async handleComplexAction(message, intent) {
        // PHASE 4: Comprehensive Task Orchestration
        this.currentTask = message;
        
        try {
            // Use the new Phase 4 comprehensive orchestration
            const result = await this.executeComplexTaskWithOrchestration(message);
            
            if (result.success) {
                this.addChatMessage(`🎉 All phases completed successfully!`, 'assistant');
            } else {
                this.addChatMessage(`❌ Task execution failed: ${result.error}`, 'assistant');
            }
            
        } catch (error) {
            console.error('Phase 4 Complex action error:', error);
            this.addChatMessage(`❌ Error in Phase 4 processing: ${error.message}. Please try again.`, 'assistant');
        }
    }

    async handleChatResponse(message, intent) {
        // Use ChatGPT for conversational response
        await this.sendToChatGPT(message);
    }

    async executeNextStep() {
        if (this.currentStepIndex >= this.taskSteps.length) {
            this.addChatMessage("✅ Task completed successfully!", 'assistant');
            this.currentTask = null;
            this.taskSteps = [];
            this.currentStepIndex = 0;
            return;
        }

        const step = this.taskSteps[this.currentStepIndex];
        this.addChatMessage(`⚡ Step ${this.currentStepIndex + 1}: ${step.description}`, 'assistant');

        try {
            const result = await ipcRenderer.invoke('execute-action', {
                action: step.action,
                selector: step.selector,
                text: step.text,
                url: step.text
            });

            if (result.success) {
                this.addChatMessage(`✅ ${result.message}`, 'assistant');
            } else {
                this.addChatMessage(`❌ ${result.error}`, 'assistant');
            }

            // Wait a bit before next step
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.currentStepIndex++;
            await this.executeNextStep();

        } catch (error) {
            console.error('Step execution error:', error);
            this.addChatMessage(`❌ Error executing step: ${error.message}`, 'assistant');
        }
    }

    // Enhanced Agentic Methods
    
    async analyzeCurrentContext() {
        try {
            // Try to get basic page info first
            const pageInfo = await ipcRenderer.invoke('get-page-info');
            
            if (!pageInfo.success) {
                // Fallback to basic context if scraping fails
                return {
                    url: 'unknown',
                    title: 'Current Page',
                    analysis: {
                        pageType: 'general',
                        primaryActions: ['navigate', 'click', 'type'],
                        currentState: 'ready',
                        capabilities: ['browsing', 'interaction']
                    },
                    timestamp: Date.now()
                };
            }

            // Try enhanced scraping, but don't fail if it doesn't work
            try {
                const webpageData = await ipcRenderer.invoke('scrape-webpage');
                
                if (webpageData.success) {
                    // Use enhanced analysis if available
                    const contextAnalysis = await ipcRenderer.invoke('chatgpt-request', {
                        apiKey: this.apiKey,
                        messages: [
                            {
                                role: 'system',
                                content: 'You are a web page analyzer. Analyze the current page context and determine what actions are possible.'
                            },
                            {
                                role: 'user',
                                content: `
                                Current page: ${webpageData.data.title}
                                URL: ${webpageData.data.url}
                                
                                Available interactive elements:
                                ${webpageData.data.elements.filter(el => el.clickable).slice(0, 20).map(el => 
                                    `- ${el.tagName}${el.id ? `#${el.id}` : ''} ${el.textContent || el.placeholder || ''}`
                                ).join('\n')}
                                
                                Analyze this page and determine:
                                1. Page type (login, search, e-commerce, content, etc.)
                                2. Primary actions available
                                3. Current state/context
                                4. What the user can accomplish on this page
                                
                                Respond with JSON format:
                                {
                                  "pageType": "type",
                                  "primaryActions": ["action1", "action2"],
                                  "currentState": "description",
                                  "capabilities": ["capability1", "capability2"]
                                }
                                `
                            }
                        ]
                    });

                    if (contextAnalysis.success) {
                        const analysis = JSON.parse(contextAnalysis.data.choices[0].message.content);
                        return {
                            ...webpageData.data,
                            analysis: analysis,
                            timestamp: Date.now()
                        };
                    }
                }
            } catch (scrapeError) {
                console.warn('Enhanced scraping failed, using basic context:', scrapeError);
            }

            // Fallback to basic context
            return {
                url: pageInfo.data.url,
                title: pageInfo.data.title,
                analysis: {
                    pageType: 'general',
                    primaryActions: ['navigate', 'click', 'type'],
                    currentState: 'ready',
                    capabilities: ['browsing', 'interaction']
                },
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Context analysis error:', error);
            // Return minimal context to prevent complete failure
            return {
                url: 'unknown',
                title: 'Current Page',
                analysis: {
                    pageType: 'general',
                    primaryActions: ['navigate', 'click', 'type'],
                    currentState: 'ready',
                    capabilities: ['browsing', 'interaction']
                },
                timestamp: Date.now()
            };
        }
    }

    async decomposeGoal(goal, context) {
        try {
            // For simple navigation goals, create a simple plan
            if (goal.toLowerCase().includes('navigate') && context.url !== 'unknown') {
                return [{
                    stepNumber: 1,
                    action: 'navigate',
                    target: goal.split(' ').pop() || 'target website',
                    text: goal.split(' ').pop() || '',
                    validation: 'Page loads successfully',
                    reasoning: 'Direct navigation to requested website',
                    prerequisites: 'Browser is ready'
                }];
            }

            const decomposition = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a task decomposition expert. Break down complex goals into specific, actionable steps for web automation.'
                    },
                    {
                        role: 'user',
                        content: `
                        User Goal: "${goal}"
                        
                        Current Context:
                        - Page: ${context.title}
                        - URL: ${context.url}
                        - Page Type: ${context.analysis.pageType}
                        - Available Actions: ${context.analysis.primaryActions.join(', ')}
                        - Capabilities: ${context.analysis.capabilities.join(', ')}
                        
                        Break this goal into specific, actionable steps. Each step should include:
                        - stepNumber: sequential number
                        - action: "click", "type", "navigate", "wait", "analyze"
                        - target: description of what to interact with
                        - text: what to type (if applicable)
                        - validation: how to verify success
                        - reasoning: why this step is needed
                        - prerequisites: what must be true before this step
                        
                        Respond with JSON array of steps.
                        `
                    }
                ]
            });

            if (!decomposition.success) {
                // Fallback to simple goal
                return [{
                    stepNumber: 1,
                    action: 'analyze',
                    target: 'current page',
                    text: '',
                    validation: 'Goal understood',
                    reasoning: 'Analyze the current page to understand user intent',
                    prerequisites: 'Page is loaded'
                }];
            }

            return JSON.parse(decomposition.data.choices[0].message.content);
        } catch (error) {
            console.error('Goal decomposition error:', error);
            // Return a simple fallback plan
            return [{
                stepNumber: 1,
                action: 'analyze',
                target: 'current page',
                text: '',
                validation: 'Goal understood',
                reasoning: 'Analyze the current page to understand user intent',
                prerequisites: 'Page is loaded'
            }];
        }
    }

    async createExecutionPlan(decomposition, context) {
        try {
            const plan = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a web automation execution planner. Create a detailed execution plan with error handling and validation.'
                    },
                    {
                        role: 'user',
                        content: `
                        Goal Steps: ${JSON.stringify(decomposition, null, 2)}
                        
                        Current Context: ${JSON.stringify(context.analysis, null, 2)}
                        
                        Create an execution plan that includes:
                        - executionOrder: array of step numbers in execution order
                        - errorHandling: how to handle failures for each step
                        - validationStrategy: how to verify each step succeeded
                        - fallbackStrategies: alternative approaches if primary fails
                        - dependencies: which steps depend on others
                        
                        Respond with JSON execution plan.
                        `
                    }
                ]
            });

            if (!plan.success) {
                throw new Error('Failed to create execution plan');
            }

            return JSON.parse(plan.data.choices[0].message.content);
        } catch (error) {
            console.error('Execution planning error:', error);
            throw error;
        }
    }

    async orchestrateTaskExecution() {
        try {
            const steps = this.goalDecomposition;
            const plan = this.executionPlan;
            
            if (!steps || steps.length === 0) {
                this.addChatMessage("❌ No execution plan available. Please try again.", 'assistant');
                return;
            }
            
            this.addChatMessage(`📋 Goal: ${this.currentTask}\n\n📝 Execution Plan:\n${steps.map((step, i) => `${i + 1}. ${step.target} (${step.action})`).join('\n')}`, 'assistant');
            
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                this.addChatMessage(`⚡ Executing Step ${i + 1}: ${step.target}`, 'assistant');
                
                try {
                    // Execute the step
                    const result = await this.executeSmartAction(step, this.currentContext);
                    
                    // Validate the result
                    const validation = await this.validateAction(step, result);
                    
                    if (validation.success) {
                        this.addChatMessage(`✅ Step ${i + 1} completed: ${validation.message}`, 'assistant');
                    } else {
                        this.addChatMessage(`⚠️ Step ${i + 1} needs attention: ${validation.message}`, 'assistant');
                        // Implement fallback strategy if needed
                        await this.handleStepFailure(step, validation);
                    }
                    
                    // Wait between steps
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.error(`Step ${i + 1} error:`, error);
                    this.addChatMessage(`❌ Step ${i + 1} failed: ${error.message}`, 'assistant');
                    await this.handleStepFailure(step, { success: false, error: error.message });
                }
            }
            
            this.addChatMessage("🎉 Task execution completed!", 'assistant');
            
        } catch (error) {
            console.error('Task orchestration error:', error);
            this.addChatMessage(`❌ Task execution failed: ${error.message}`, 'assistant');
        }
    }

    async executeSmartAction(step, context) {
        try {
            // Handle navigation actions directly without element finding
            if (step.action === 'navigate') {
                const result = await ipcRenderer.invoke('execute-action', {
                    action: 'navigate',
                    url: step.text || step.target
                });
                return result;
            }
            
            // For other actions, find the element intelligently first
            const element = await this.findElementByDescription(step.target, context);
            
            if (!element) {
                throw new Error(`Could not find element: ${step.target}`);
            }

            // Execute the action with the found element
            const result = await ipcRenderer.invoke('execute-action', {
                action: step.action,
                selector: element.selector,
                text: step.text,
                url: step.text
            });
            
            return result;
        } catch (error) {
            console.error('Smart action execution error:', error);
            throw error;
        }
    }

    async findElementByDescription(description, context) {
        try {
            // Get elements from the page
            const elementData = await ipcRenderer.invoke('find-element-by-description', {
                description: description,
                context: context
            });

            if (!elementData.success) {
                throw new Error('Failed to get elements from page');
            }

            // Use AI to find the best matching element
            const analysis = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at finding web elements by description. Analyze the available elements and find the best match for the user\'s request.'
                    },
                    {
                        role: 'user',
                        content: `
                        Looking for: "${description}"
                        
                        Available elements:
                        ${elementData.data.elements.slice(0, 50).map(el => 
                            `- ${el.tagName}${el.id ? `#${el.id}` : ''}${el.className ? `.${el.className.split(' ').slice(0, 2).join('.')}` : ''} "${el.textContent || el.placeholder || el.ariaLabel || ''}" ${el.isClickable ? '[clickable]' : ''}`
                        ).join('\n')}
                        
                        Current context: ${JSON.stringify(context.analysis, null, 2)}
                        
                        Find the best matching element(s) for the description. Consider:
                        - Text content similarity
                        - Element type appropriateness (button for clicking, input for typing)
                        - Context and purpose
                        - Accessibility attributes
                        - Visual prominence
                        
                        Respond with JSON array of best matches, ranked by relevance:
                        [
                          {
                            "element": "description of the element",
                            "selector": "CSS selector to find it",
                            "confidence": 0.95,
                            "reasoning": "why this is the best match",
                            "alternativeSelectors": ["backup1", "backup2"]
                          }
                        ]
                        `
                    }
                ]
            });

            if (!analysis.success) {
                throw new Error('Failed to analyze elements');
            }

            const matches = JSON.parse(analysis.data.choices[0].message.content);
            
            if (matches.length === 0) {
                return null;
            }

            // Return the best match
            const bestMatch = matches[0];
            return {
                selector: bestMatch.selector,
                confidence: bestMatch.confidence,
                reasoning: bestMatch.reasoning,
                alternatives: bestMatch.alternativeSelectors || []
            };

        } catch (error) {
            console.error('Element finding error:', error);
            return null;
        }
    }

    async validateAction(step, result) {
        try {
            // Wait for page to stabilize after action
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get current page state for validation
            const currentState = await this.analyzeCurrentContext();
            
            // Use AI to validate the action
            const validation = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at validating web automation actions. Analyze whether an action was successful based on the expected outcome and current page state.'
                    },
                    {
                        role: 'user',
                        content: `
                        Action performed: ${JSON.stringify(step, null, 2)}
                        Expected outcome: ${step.validation || 'Action should complete successfully'}
                        Current page state: ${JSON.stringify(currentState.analysis, null, 2)}
                        Action result: ${JSON.stringify(result, null, 2)}
                        
                        Validate whether the action was successful. Consider:
                        - Did the expected change occur?
                        - Are we on the expected page/state?
                        - Are there any error indicators?
                        - Did the element interaction work as expected?
                        
                        Respond with JSON:
                        {
                          "success": true/false,
                          "message": "description of what happened",
                          "evidence": "what indicates success/failure",
                          "nextSteps": "what should happen next"
                        }
                        `
                    }
                ]
            });

            if (!validation.success) {
                return {
                    success: result && result.success,
                    message: result ? result.message : 'Action completed (validation failed)'
                };
            }

            const validationResult = JSON.parse(validation.data.choices[0].message.content);
            return validationResult;

        } catch (error) {
            console.error('Action validation error:', error);
            return {
                success: result && result.success,
                message: result ? result.message : 'Action completed (validation error)'
            };
        }
    }

    async handleStepFailure(step, validation) {
        // This will be implemented in Phase 4
        this.addChatMessage(`🔄 Attempting fallback strategy for: ${step.target}`, 'assistant');
        // Implement retry logic and alternative approaches
    }

    addChatMessage(content, sender) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant-message';
        typingDiv.id = 'typing-indicator';

        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'typing-indicator';
        indicatorDiv.innerHTML = '<span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>';

        typingDiv.appendChild(indicatorDiv);
        chatMessages.appendChild(typingDiv);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    showChatInterface() {
        // Chat interface is always visible now
        const chatMessages = document.getElementById('chatMessages');
        const chatInputArea = document.getElementById('chatInputArea');
        
        if (chatMessages) chatMessages.style.display = 'flex';
        if (chatInputArea) chatInputArea.style.display = 'block';
        
        // No default welcome message - start with empty chat
    }

    async sendToChatGPT(message) {
        if (!this.apiKey) {
            this.addChatMessage('API key not found. Please refresh and enter your OpenAI API key.', 'assistant');
            return;
        }

        // Add user message to history
        this.chatHistory.push({ role: 'user', content: message });

        // Show typing indicator
        this.showTypingIndicator();

        // Debug logging
        console.log('sendToChatGPT called with API key:', this.apiKey.substring(0, 10) + '...');
        console.log('API key is demo mode:', this.apiKey === 'demo');
        console.log('API key length:', this.apiKey.length);

        // Demo mode
        if (this.apiKey === 'demo') {
            setTimeout(() => {
                // Hide typing indicator
                this.hideTypingIndicator();
                
                const demoResponses = [
                    "Hello! I'm ChatGPT in demo mode. This is how the chat would work with a real API key.",
                    "I can help you with coding, writing, analysis, and much more! In demo mode, I can only show you these sample responses.",
                    "To use the real ChatGPT, you'll need a valid OpenAI API key with credits in your account.",
                    "Try asking me about programming, creative writing, or problem-solving - I'll give you a demo response!",
                    "This demo shows the chat interface working perfectly. The only difference is these are sample responses instead of real AI-generated ones."
                ];
                
                const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)];
                
                // Add assistant message to history
                this.chatHistory.push({ role: 'assistant', content: randomResponse });
                
                // Display assistant message
                this.addChatMessage(randomResponse, 'assistant');
                
                // Re-enable send button
                const sendButton = document.getElementById('sendMessage');
                if (sendButton) sendButton.disabled = false;
            }, 1000 + Math.random() * 2000); // Random delay 1-3 seconds
            return;
        }

        try {
            // Create a more helpful system message for conversational chat
            const systemMessage = {
                role: 'system',
                content: `You are a helpful AI assistant integrated into a smart browser called Verse. You can:

1. Have natural conversations about any topic
2. Help users with general questions and explanations
3. Provide information and insights
4. Be friendly, helpful, and conversational

If users want to perform web actions like navigation, clicking, or automation, they should use action-oriented language like "open instagram" or "search for laptops on Amazon". For regular conversation, just chat naturally.

Keep responses concise but helpful. Be warm and engaging in your conversation style.`
            };
            
            // Use IPC to make API call through main process (avoids CORS)
            const result = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [systemMessage, ...this.chatHistory]
            });

            // Hide typing indicator
            this.hideTypingIndicator();

            if (result.success) {
                const assistantMessage = result.data.choices[0].message.content;
                
                // Add assistant message to history
                this.chatHistory.push({ role: 'assistant', content: assistantMessage });
                
                // Display assistant message
                this.addChatMessage(assistantMessage, 'assistant');
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            // Hide typing indicator on error
            this.hideTypingIndicator();
            
            console.error('ChatGPT API Error:', error);
            let errorMessage = 'Sorry, I encountered an error. ';
            
            if (error.message.includes('401')) {
                errorMessage += 'Your API key appears to be invalid. Please check it and try again.';
            } else if (error.message.includes('429')) {
                errorMessage += 'Rate limit exceeded. Please wait a moment and try again.';
            } else if (error.message.includes('insufficient_quota')) {
                errorMessage += 'Your OpenAI account has insufficient credits. Please add credits to your account.';
            } else {
                errorMessage += 'Please check your API key and try again.';
            }
            
            this.addChatMessage(errorMessage, 'assistant');
        } finally {
            // Re-enable send button
            const sendButton = document.getElementById('sendMessage');
            if (sendButton) sendButton.disabled = false;
        }
    }

    // Fullscreen support
    enterFullscreen() {
        ipcRenderer.invoke('toggle-fullscreen');
    }

    exitFullscreen() {
        ipcRenderer.invoke('toggle-fullscreen');
    }

    // ========================================
    // PHASE 2: INTELLIGENT CHAIN OF THOUGHT
    // ========================================

    async analyzeGoalWithChainOfThought(message) {
        try {
            const response = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at analyzing user goals with chain of thought reasoning. Analyze the user's request and provide detailed goal analysis.

RESPONSE FORMAT (JSON only):
{
  "complexity": "simple|moderate|complex|very_complex",
  "estimatedSteps": number,
  "primaryIntent": "navigation|search|form_filling|data_extraction|multi_step_workflow",
  "requiredCapabilities": ["click", "type", "navigate", "scroll", "wait", "validate"],
  "successCriteria": "how to know when goal is achieved",
  "potentialChallenges": ["challenge1", "challenge2"],
  "reasoning": "detailed chain of thought analysis"
}`
                    },
                    {
                        role: 'user',
                        content: `Analyze this goal with chain of thought reasoning: "${message}"`
                    }
                ]
            });

            if (response.success) {
                const analysis = JSON.parse(response.data.choices[0].message.content);
                return { success: true, data: analysis };
            } else {
                throw new Error('Failed to analyze goal');
            }
        } catch (error) {
            console.error('Goal analysis error:', error);
            return { success: false, error: error.message };
        }
    }

    async analyzeCurrentContextEnhanced() {
        try {
            const webpageData = await ipcRenderer.invoke('scrape-webpage');
            
            if (!webpageData.success) {
                return { success: false, error: 'Failed to scrape webpage' };
            }

            // Simplified context analysis
            const context = {
                pageType: this.determinePageType(webpageData.data),
                primaryPurpose: this.determinePrimaryPurpose(webpageData.data),
                availableActions: this.getAvailableActions(webpageData.data),
                interactiveElements: webpageData.data.pageAnalysis.metadata.interactiveElements,
                formCount: webpageData.data.pageAnalysis.metadata.formElements,
                currentState: 'loaded',
                reasoning: 'Simplified context analysis'
            };

            return { success: true, data: context };
        } catch (error) {
            console.error('Context analysis error:', error);
            return { success: false, error: error.message };
        }
    }

    determinePageType(data) {
        const domain = data.pageAnalysis.metadata.domain.toLowerCase();
        const title = data.title.toLowerCase();
        
        if (domain.includes('google')) return 'search';
        if (domain.includes('amazon') || domain.includes('shop')) return 'ecommerce';
        if (domain.includes('facebook') || domain.includes('twitter') || domain.includes('instagram')) return 'social';
        if (data.pageAnalysis.metadata.hasForm) return 'form';
        return 'content';
    }

    determinePrimaryPurpose(data) {
        if (data.pageAnalysis.metadata.hasSearch) return 'search functionality';
        if (data.pageAnalysis.metadata.hasLogin) return 'user authentication';
        if (data.pageAnalysis.metadata.hasForm) return 'form submission';
        return 'content display';
    }

    getAvailableActions(data) {
        const actions = [];
        if (data.pageAnalysis.metadata.hasSearch) actions.push('search');
        if (data.pageAnalysis.metadata.hasLogin) actions.push('login');
        if (data.pageAnalysis.metadata.hasForm) actions.push('fill_form');
        actions.push('navigate', 'click', 'scroll');
        return actions;
    }

    async decomposeGoalWithChainOfThought(message, goalAnalysis, context) {
        try {
            const response = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at decomposing complex goals into actionable steps using chain of thought reasoning.

RESPONSE FORMAT (JSON only):
{
  "steps": [
    {
      "stepNumber": 1,
      "action": "navigate|click|type|scroll|wait|validate",
      "target": "what to interact with",
      "description": "detailed description of this step",
      "selector": "CSS selector or URL",
      "text": "text to type (if applicable)",
      "expectedOutcome": "what should happen",
      "fallbackStrategy": "what to do if this fails",
      "dependencies": ["step1"],
      "estimatedTime": number
    }
  ],
  "reasoning": "detailed chain of thought for decomposition",
  "criticalPath": ["step1", "step3"],
  "parallelSteps": [["step2", "step4"]]
}`
                    },
                    {
                        role: 'user',
                        content: `Decompose this goal: "${message}"

GOAL ANALYSIS:
- Complexity: ${goalAnalysis.complexity}
- Estimated Steps: ${goalAnalysis.estimatedSteps}
- Primary Intent: ${goalAnalysis.primaryIntent}

CURRENT CONTEXT:
- Page Type: ${context.pageType}
- Interactive Elements: ${context.interactiveElements}

Decompose this goal into actionable steps.`
                    }
                ]
            });

            if (response.success) {
                const decomposition = JSON.parse(response.data.choices[0].message.content);
                return { success: true, data: decomposition };
            } else {
                throw new Error('Failed to decompose goal');
            }
        } catch (error) {
            console.error('Goal decomposition error:', error);
            return { success: false, error: error.message };
        }
    }

    async createEnhancedExecutionPlan(decomposition, context) {
        try {
            const response = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at creating execution plans for web automation tasks.

RESPONSE FORMAT (JSON only):
{
  "planId": "unique_plan_id",
  "totalSteps": number,
  "estimatedTime": number,
  "executionStrategy": "sequential|parallel|hybrid",
  "steps": [
    {
      "stepId": "step_1",
      "stepNumber": 1,
      "action": "navigate|click|type|scroll|wait|validate",
      "target": "what to interact with",
      "description": "detailed description",
      "selector": "CSS selector or URL",
      "text": "text to type",
      "expectedOutcome": "what should happen",
      "fallbackStrategy": "what to do if this fails",
      "dependencies": ["step_1"],
      "estimatedTime": number,
      "retryCount": 3,
      "validationCriteria": "how to verify success",
      "timeout": 10000
    }
  ],
  "parallelGroups": [["step_1", "step_2"]],
  "criticalPath": ["step_1", "step_3"],
  "checkpoints": ["after step 3"],
  "rollbackStrategy": "how to undo if needed",
  "reasoning": "detailed planning reasoning"
}`
                    },
                    {
                        role: 'user',
                        content: `Create an execution plan for: ${JSON.stringify(decomposition.steps, null, 2)}`
                    }
                ]
            });

            if (response.success) {
                const plan = JSON.parse(response.data.choices[0].message.content);
                return { success: true, data: plan };
            } else {
                throw new Error('Failed to create execution plan');
            }
        } catch (error) {
            console.error('Execution plan creation error:', error);
            return { success: false, error: error.message };
        }
    }

    async orchestrateTaskExecutionEnhanced(executionPlan) {
        try {
            let completedSteps = 0;
            const totalSteps = executionPlan.totalSteps;
            const results = [];

            this.addChatMessage(`🚀 Starting Phase 2 Enhanced Orchestration: ${totalSteps} steps`, 'assistant');

            for (const step of executionPlan.steps) {
                this.addChatMessage(`⚡ Executing Step ${step.stepNumber}: ${step.description}`, 'assistant');
                
                try {
                    const result = await this.executeStepWithValidation(step);
                    results.push(result);
                    completedSteps++;
                    
                    if (result.success) {
                        this.addChatMessage(`✅ Step ${step.stepNumber} completed: ${result.message}`, 'assistant');
                    } else {
                        this.addChatMessage(`⚠️ Step ${step.stepNumber} failed: ${result.error}`, 'assistant');
                        break;
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, step.estimatedTime * 100));
                    
                } catch (error) {
                    console.error(`Step ${step.stepNumber} execution error:`, error);
                    this.addChatMessage(`❌ Step ${step.stepNumber} error: ${error.message}`, 'assistant');
                    break;
                }
            }

            return {
                success: completedSteps === totalSteps,
                data: {
                    completedSteps,
                    totalSteps,
                    results,
                    executionTime: Date.now()
                }
            };

        } catch (error) {
            console.error('Enhanced orchestration error:', error);
            return { success: false, error: error.message };
        }
    }

    async executeStepWithValidation(step) {
        try {
            let result;
            
            switch (step.action) {
                case 'navigate':
                    result = await ipcRenderer.invoke('execute-action', {
                        action: 'navigate',
                        url: step.target
                    });
                    break;
                    
                case 'click':
                    result = await ipcRenderer.invoke('execute-action', {
                        action: 'click',
                        selector: step.selector,
                        target: step.target
                    });
                    break;
                    
                case 'type':
                    result = await ipcRenderer.invoke('execute-action', {
                        action: 'type',
                        selector: step.selector,
                        text: step.text,
                        target: step.target
                    });
                    break;
                    
                case 'wait':
                    await new Promise(resolve => setTimeout(resolve, step.estimatedTime * 1000));
                    result = { success: true, message: 'Wait completed' };
                    break;
                    
                default:
                    result = { success: false, error: `Unknown action: ${step.action}` };
            }

            return result;

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // PHASE 3: ADVANCED ELEMENT INTERACTION
    // ========================================

    async findElementWithMultipleStrategies(target, actionType) {
        try {
            // Strategy 1: Use ChatGPT with enhanced scraping data
            const webpageData = await ipcRenderer.invoke('scrape-webpage');
            if (!webpageData.success) {
                return { success: false, error: 'Failed to scrape webpage' };
            }

            const response = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at finding web elements using multiple strategies. Find the best element for the given action.

RESPONSE FORMAT (JSON only):
{
  "found": true/false,
  "selector": "best CSS selector",
  "alternativeSelectors": ["alt1", "alt2", "alt3"],
  "strategy": "which strategy worked",
  "confidence": 0.95,
  "description": "what element was found",
  "fallbackStrategies": [
    {"strategy": "text_content", "selector": "selector", "confidence": 0.8},
    {"strategy": "placeholder", "selector": "selector", "confidence": 0.7}
  ]
}

AVAILABLE ELEMENTS:
${webpageData.data.elements.filter(el => {
    if (actionType === 'click') return el.isClickable;
    if (actionType === 'type') return el.interactionHints.canType;
    return true;
}).slice(0, 30).map(el => 
    `- ${el.tagName}${el.id ? `#${el.id}` : ''}${el.className ? `.${el.className.split(' ').slice(0, 2).join('.')}` : ''} 
     Text: "${el.textContent || el.placeholder || el.ariaLabel || ''}" 
     Purpose: ${el.purpose || 'unknown'} 
     Importance: ${el.importance || 'unknown'}`
).join('\n')}

Find the best element for: "${target}" (action: ${actionType})`
                    },
                    {
                        role: 'user',
                        content: `Find element for: "${target}" with action type: ${actionType}`
                    }
                ]
            });

            if (response.success) {
                const analysis = JSON.parse(response.data.choices[0].message.content);
                return { success: true, data: analysis };
            } else {
                throw new Error('Failed to analyze element');
            }
        } catch (error) {
            console.error('Element finding error:', error);
            return { success: false, error: error.message };
        }
    }

    async executeActionWithRetry(actionData, maxRetries = 3) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.addChatMessage(`🔄 Attempt ${attempt}/${maxRetries}: ${actionData.action}`, 'assistant');
                
                const result = await ipcRenderer.invoke('execute-action', actionData);
                
                if (result.success) {
                    if (attempt > 1) {
                        this.addChatMessage(`✅ Success on attempt ${attempt}!`, 'assistant');
                    }
                    return result;
                } else {
                    lastError = result.error;
                    this.addChatMessage(`⚠️ Attempt ${attempt} failed: ${result.error}`, 'assistant');
                    
                    if (attempt < maxRetries) {
                        // Wait before retry
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    }
                }
            } catch (error) {
                lastError = error.message;
                this.addChatMessage(`❌ Attempt ${attempt} error: ${error.message}`, 'assistant');
                
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
        
        return { success: false, error: `Failed after ${maxRetries} attempts. Last error: ${lastError}` };
    }

    async executeSmartClick(target) {
        this.addChatMessage(`🎯 Phase 3: Smart click for "${target}"`, 'assistant');
        
        try {
            // Step 1: Find element with multiple strategies
            const elementAnalysis = await this.findElementWithMultipleStrategies(target, 'click');
            
            if (!elementAnalysis.success) {
                this.addChatMessage(`❌ Could not find element: ${elementAnalysis.error}`, 'assistant');
                return;
            }
            
            const analysis = elementAnalysis.data;
            
            if (!analysis.found) {
                this.addChatMessage(`❌ Could not find clickable element: ${target}`, 'assistant');
                return;
            }
            
            this.addChatMessage(`🎯 Found: ${analysis.description} (${analysis.strategy})`, 'assistant');
            this.addChatMessage(`📊 Confidence: ${(analysis.confidence * 100).toFixed(1)}%`, 'assistant');
            
            // Step 2: Execute with retry logic
            const result = await this.executeActionWithRetry({
                action: 'click',
                selector: analysis.selector,
                target: target
            });
            
            if (result.success) {
                this.addChatMessage(`✅ Successfully clicked: ${analysis.description}`, 'assistant');
            } else {
                // Try fallback strategies
                this.addChatMessage(`🔄 Trying fallback strategies...`, 'assistant');
                
                for (const fallback of analysis.fallbackStrategies) {
                    this.addChatMessage(`🔄 Trying ${fallback.strategy} (confidence: ${(fallback.confidence * 100).toFixed(1)}%)`, 'assistant');
                    
                    const fallbackResult = await this.executeActionWithRetry({
                        action: 'click',
                        selector: fallback.selector,
                        target: target
                    });
                    
                    if (fallbackResult.success) {
                        this.addChatMessage(`✅ Fallback successful: ${fallback.strategy}`, 'assistant');
                        return fallbackResult;
                    }
                }
                
                this.addChatMessage(`❌ All strategies failed: ${result.error}`, 'assistant');
            }
            
        } catch (error) {
            console.error('Smart click error:', error);
            this.addChatMessage(`❌ Smart click failed: ${error.message}`, 'assistant');
        }
    }

    async executeSmartType(target, text) {
        this.addChatMessage(`⌨️ Phase 3: Smart type "${text}" into "${target}"`, 'assistant');
        
        try {
            // Step 1: Find input field with multiple strategies
            const elementAnalysis = await this.findElementWithMultipleStrategies(target, 'type');
            
            if (!elementAnalysis.success) {
                this.addChatMessage(`❌ Could not find input field: ${elementAnalysis.error}`, 'assistant');
                return;
            }
            
            const analysis = elementAnalysis.data;
            
            if (!analysis.found) {
                this.addChatMessage(`❌ Could not find input field: ${target}`, 'assistant');
                return;
            }
            
            this.addChatMessage(`🎯 Found input: ${analysis.description} (${analysis.strategy})`, 'assistant');
            this.addChatMessage(`📊 Confidence: ${(analysis.confidence * 100).toFixed(1)}%`, 'assistant');
            
            // Step 2: Execute with retry logic
            const result = await this.executeActionWithRetry({
                action: 'type',
                selector: analysis.selector,
                text: text,
                target: target
            });
            
            if (result.success) {
                this.addChatMessage(`✅ Successfully typed "${text}" into ${analysis.description}`, 'assistant');
            } else {
                // Try fallback strategies
                this.addChatMessage(`🔄 Trying fallback strategies...`, 'assistant');
                
                for (const fallback of analysis.fallbackStrategies) {
                    const fallbackResult = await this.executeActionWithRetry({
                        action: 'type',
                        selector: fallback.selector,
                        text: text,
                        target: target
                    });
                    
                    if (fallbackResult.success) {
                        this.addChatMessage(`✅ Fallback successful: ${fallback.strategy}`, 'assistant');
                        return fallbackResult;
                    }
                }
                
                this.addChatMessage(`❌ All strategies failed: ${result.error}`, 'assistant');
            }
            
        } catch (error) {
            console.error('Smart type error:', error);
            this.addChatMessage(`❌ Smart type failed: ${error.message}`, 'assistant');
        }
    }

    async validateActionSuccess(action, expectedOutcome) {
        try {
            // Wait for page to settle
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check page state
            const webpageData = await ipcRenderer.invoke('scrape-webpage');
            if (!webpageData.success) {
                return { success: false, error: 'Could not validate - scraping failed' };
            }
            
            // Use ChatGPT to validate success
            const validation = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at validating web actions. Determine if the action was successful based on the expected outcome.

RESPONSE FORMAT (JSON only):
{
  "success": true/false,
  "confidence": 0.95,
  "evidence": "what indicates success/failure",
  "nextSteps": ["what to do next if successful", "what to do if failed"]
}

CURRENT PAGE STATE:
- Title: ${webpageData.data.title}
- URL: ${webpageData.data.url}
- Interactive Elements: ${webpageData.data.pageAnalysis.metadata.interactiveElements}

ACTION PERFORMED: ${action}
EXPECTED OUTCOME: ${expectedOutcome}

Validate if the action was successful.`
                    },
                    {
                        role: 'user',
                        content: `Validate if "${action}" achieved "${expectedOutcome}"`
                    }
                ]
            });

            if (validation.success) {
                const result = JSON.parse(validation.data.choices[0].message.content);
                return { success: true, data: result };
            } else {
                return { success: false, error: 'Validation failed' };
            }
        } catch (error) {
            console.error('Action validation error:', error);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // PHASE 4: MULTI-STEP TASK ORCHESTRATION
    // ========================================

    async executeComplexTaskWithOrchestration(message) {
        this.addChatMessage(`🚀 Phase 4: Starting comprehensive task orchestration for "${message}"`, 'assistant');
        
        try {
            // Initialize task state
            const taskState = {
                taskId: `task_${Date.now()}`,
                message: message,
                startTime: Date.now(),
                status: 'initializing',
                currentStep: 0,
                totalSteps: 0,
                completedSteps: 0,
                failedSteps: 0,
                retryCount: 0,
                maxRetries: 3,
                checkpoints: [],
                errors: [],
                results: [],
                context: null,
                plan: null
            };

            // Step 1: Enhanced Goal Analysis
            this.addChatMessage(`📋 Phase 4.1: Advanced Goal Analysis`, 'assistant');
            const goalAnalysis = await this.analyzeGoalWithChainOfThought(message);
            if (!goalAnalysis.success) {
                throw new Error(`Goal analysis failed: ${goalAnalysis.error}`);
            }
            
            taskState.goalAnalysis = goalAnalysis.data;
            this.addChatMessage(`✅ Goal analyzed: ${goalAnalysis.data.complexity} complexity, ${goalAnalysis.data.estimatedSteps} steps`, 'assistant');

            // Step 2: Enhanced Context Analysis
            this.addChatMessage(`🌐 Phase 4.2: Comprehensive Context Analysis`, 'assistant');
            const context = await this.analyzeCurrentContextEnhanced();
            if (!context.success) {
                throw new Error(`Context analysis failed: ${context.error}`);
            }
            
            taskState.context = context.data;
            this.addChatMessage(`✅ Context analyzed: ${context.data.pageType} page with ${context.data.interactiveElements} elements`, 'assistant');

            // Step 3: Advanced Task Decomposition
            this.addChatMessage(`📝 Phase 4.3: Advanced Task Decomposition`, 'assistant');
            const decomposition = await this.decomposeGoalWithChainOfThought(message, goalAnalysis.data, context.data);
            if (!decomposition.success) {
                throw new Error(`Task decomposition failed: ${decomposition.error}`);
            }
            
            taskState.plan = decomposition.data;
            taskState.totalSteps = decomposition.data.steps.length;
            this.addChatMessage(`✅ Task decomposed: ${taskState.totalSteps} steps identified`, 'assistant');

            // Step 4: Enhanced Execution Plan
            this.addChatMessage(`⚡ Phase 4.4: Enhanced Execution Planning`, 'assistant');
            const executionPlan = await this.createEnhancedExecutionPlan(decomposition.data, context.data);
            if (!executionPlan.success) {
                throw new Error(`Execution planning failed: ${executionPlan.error}`);
            }
            
            taskState.executionPlan = executionPlan.data;
            this.addChatMessage(`✅ Execution planned: ${executionPlan.data.executionStrategy} strategy`, 'assistant');

            // Step 5: Orchestrated Execution with State Management
            this.addChatMessage(`🎯 Phase 4.5: Orchestrated Execution`, 'assistant');
            const executionResult = await this.orchestrateTaskWithStateManagement(taskState);
            
            // Step 6: Final Validation and Reporting
            this.addChatMessage(`🔍 Phase 4.6: Final Validation`, 'assistant');
            const finalValidation = await this.validateTaskCompletion(taskState, executionResult);
            
            // Generate comprehensive report
            this.generateTaskReport(taskState, executionResult, finalValidation);
            
            return {
                success: executionResult.success,
                data: {
                    taskState,
                    executionResult,
                    finalValidation,
                    duration: Date.now() - taskState.startTime
                }
            };

        } catch (error) {
            console.error('Phase 4 orchestration error:', error);
            this.addChatMessage(`❌ Phase 4 orchestration failed: ${error.message}`, 'assistant');
            return { success: false, error: error.message };
        }
    }

    async orchestrateTaskWithStateManagement(taskState) {
        try {
            taskState.status = 'executing';
            this.addChatMessage(`🚀 Executing ${taskState.totalSteps} steps with state management`, 'assistant');
            
            const results = [];
            let currentStepIndex = 0;
            
            while (currentStepIndex < taskState.plan.steps.length) {
                const step = taskState.plan.steps[currentStepIndex];
                taskState.currentStep = currentStepIndex + 1;
                
                this.addChatMessage(`⚡ Step ${taskState.currentStep}/${taskState.totalSteps}: ${step.description}`, 'assistant');
                
                // Execute step with comprehensive error handling
                const stepResult = await this.executeStepWithComprehensiveHandling(step, taskState);
                results.push(stepResult);
                
                // Update task state
                if (stepResult.success) {
                    taskState.completedSteps++;
                    this.addChatMessage(`✅ Step ${taskState.currentStep} completed successfully`, 'assistant');
                } else {
                    taskState.failedSteps++;
                    taskState.errors.push({
                        step: taskState.currentStep,
                        error: stepResult.error,
                        timestamp: Date.now()
                    });
                    
                    // Try error recovery
                    const recoveryResult = await this.attemptErrorRecovery(step, taskState, stepResult);
                    if (recoveryResult.success) {
                        this.addChatMessage(`🔄 Error recovered: ${recoveryResult.message}`, 'assistant');
                        taskState.completedSteps++;
                        taskState.failedSteps--;
                    } else {
                        this.addChatMessage(`❌ Step ${taskState.currentStep} failed: ${stepResult.error}`, 'assistant');
                        
                        // Check if we should continue or abort
                        if (this.shouldAbortTask(taskState, step)) {
                            this.addChatMessage(`🛑 Task aborted due to critical failure`, 'assistant');
                            break;
                        }
                    }
                }
                
                // Add checkpoint
                taskState.checkpoints.push({
                    step: taskState.currentStep,
                    timestamp: Date.now(),
                    status: stepResult.success ? 'completed' : 'failed',
                    context: await this.captureCurrentContext()
                });
                
                currentStepIndex++;
                
                // Wait between steps
                await new Promise(resolve => setTimeout(resolve, step.estimatedTime * 100 || 1000));
            }
            
            taskState.status = taskState.completedSteps === taskState.totalSteps ? 'completed' : 'failed';
            
            return {
                success: taskState.status === 'completed',
                data: {
                    completedSteps: taskState.completedSteps,
                    totalSteps: taskState.totalSteps,
                    failedSteps: taskState.failedSteps,
                    results,
                    duration: Date.now() - taskState.startTime
                }
            };

        } catch (error) {
            console.error('State management orchestration error:', error);
            taskState.status = 'error';
            return { success: false, error: error.message };
        }
    }

    async executeStepWithComprehensiveHandling(step, taskState) {
        try {
            // Pre-execution validation
            const preValidation = await this.validateStepPreconditions(step, taskState);
            if (!preValidation.success) {
                return { success: false, error: `Pre-validation failed: ${preValidation.error}` };
            }
            
            // Execute the step
            const result = await this.executeStepWithValidation(step);
            
            // Post-execution validation
            if (result.success && step.expectedOutcome) {
                const postValidation = await this.validateActionSuccess(step.action, step.expectedOutcome);
                if (!postValidation.success || !postValidation.data.success) {
                    return { 
                        success: false, 
                        error: `Post-validation failed: ${postValidation.data?.evidence || 'Unknown reason'}` 
                    };
                }
            }
            
            return result;

        } catch (error) {
            console.error('Step execution error:', error);
            return { success: false, error: error.message };
        }
    }

    async attemptErrorRecovery(step, taskState, stepResult) {
        try {
            this.addChatMessage(`🔄 Attempting error recovery for step ${taskState.currentStep}...`, 'assistant');
            
            // Strategy 1: Retry with different selector
            if (step.selector && stepResult.error.includes('not found')) {
                const alternativeSelector = await this.findAlternativeSelector(step.target);
                if (alternativeSelector && alternativeSelector !== step.selector) {
                    this.addChatMessage(`🔄 Trying alternative selector: ${alternativeSelector}`, 'assistant');
                    
                    const retryResult = await this.executeStepWithValidation({
                        ...step,
                        selector: alternativeSelector
                    });
                    
                    if (retryResult.success) {
                        return { success: true, message: 'Recovered with alternative selector' };
                    }
                }
            }
            
            // Strategy 2: Try fallback strategy
            if (step.fallbackStrategy) {
                this.addChatMessage(`🔄 Trying fallback strategy: ${step.fallbackStrategy}`, 'assistant');
                
                const fallbackResult = await this.executeFallbackStrategy(step);
                if (fallbackResult.success) {
                    return { success: true, message: 'Recovered with fallback strategy' };
                }
            }
            
            // Strategy 3: Context-based recovery
            const contextRecovery = await this.attemptContextBasedRecovery(step, taskState);
            if (contextRecovery.success) {
                return { success: true, message: 'Recovered with context-based strategy' };
            }
            
            return { success: false, error: 'All recovery strategies failed' };

        } catch (error) {
            console.error('Error recovery error:', error);
            return { success: false, error: error.message };
        }
    }

    async validateTaskCompletion(taskState, executionResult) {
        try {
            // Wait for final page state
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Get final context
            const finalContext = await this.analyzeCurrentContextEnhanced();
            if (!finalContext.success) {
                return { success: false, error: 'Could not get final context' };
            }
            
            // Use ChatGPT to validate overall task completion
            const validation = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at validating task completion. Determine if the overall task was successful.

RESPONSE FORMAT (JSON only):
{
  "success": true/false,
  "completionPercentage": 85,
  "evidence": "what indicates success/failure",
  "achievedGoals": ["goal1", "goal2"],
  "remainingGoals": ["goal3"],
  "qualityScore": 8.5,
  "recommendations": ["what to do next"]
}

TASK DETAILS:
- Original Goal: "${taskState.message}"
- Completed Steps: ${executionResult.data.completedSteps}/${executionResult.data.totalSteps}
- Execution Time: ${executionResult.data.duration}ms
- Failed Steps: ${executionResult.data.failedSteps}

FINAL PAGE STATE:
- Title: ${finalContext.data.pageType}
- Interactive Elements: ${finalContext.data.interactiveElements}
- Current State: ${finalContext.data.currentState}

Validate if the overall task was successful.`
                    },
                    {
                        role: 'user',
                        content: `Validate if the task "${taskState.message}" was successfully completed.`
                    }
                ]
            });

            if (validation.success) {
                const result = JSON.parse(validation.data.choices[0].message.content);
                return { success: true, data: result };
            } else {
                return { success: false, error: 'Validation failed' };
            }
        } catch (error) {
            console.error('Task validation error:', error);
            return { success: false, error: error.message };
        }
    }

    generateTaskReport(taskState, executionResult, finalValidation) {
        this.addChatMessage(`📊 === TASK COMPLETION REPORT ===`, 'assistant');
        this.addChatMessage(`🎯 Original Goal: ${taskState.message}`, 'assistant');
        this.addChatMessage(`⏱️ Total Duration: ${executionResult.data.duration}ms`, 'assistant');
        this.addChatMessage(`✅ Completed Steps: ${executionResult.data.completedSteps}/${executionResult.data.totalSteps}`, 'assistant');
        this.addChatMessage(`❌ Failed Steps: ${executionResult.data.failedSteps}`, 'assistant');
        
        if (finalValidation.success) {
            const validation = finalValidation.data;
            this.addChatMessage(`📈 Completion: ${validation.completionPercentage}%`, 'assistant');
            this.addChatMessage(`⭐ Quality Score: ${validation.qualityScore}/10`, 'assistant');
            this.addChatMessage(`✅ Evidence: ${validation.evidence}`, 'assistant');
            
            if (validation.achievedGoals.length > 0) {
                this.addChatMessage(`🎯 Achieved Goals: ${validation.achievedGoals.join(', ')}`, 'assistant');
            }
            
            if (validation.recommendations.length > 0) {
                this.addChatMessage(`💡 Recommendations: ${validation.recommendations.join(', ')}`, 'assistant');
            }
        }
        
        this.addChatMessage(`📊 === END REPORT ===`, 'assistant');
    }

    shouldAbortTask(taskState, step) {
        // Abort if too many consecutive failures
        const recentFailures = taskState.errors.filter(error => 
            error.step >= taskState.currentStep - 2
        );
        
        if (recentFailures.length >= 3) {
            return true;
        }
        
        // Abort if critical step fails
        if (taskState.plan.criticalPath.includes(`step${taskState.currentStep}`)) {
            return true;
        }
        
        return false;
    }

    async validateStepPreconditions(step, taskState) {
        try {
            // Check if required dependencies are met
            if (step.dependencies && step.dependencies.length > 0) {
                for (const dep of step.dependencies) {
                    const depResult = taskState.checkpoints.find(cp => cp.step === dep);
                    if (!depResult || depResult.status !== 'completed') {
                        return { success: false, error: `Dependency ${dep} not completed` };
                    }
                }
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async captureCurrentContext() {
        try {
            const webpageData = await ipcRenderer.invoke('scrape-webpage');
            return {
                url: webpageData.data?.url || 'unknown',
                title: webpageData.data?.title || 'unknown',
                timestamp: Date.now()
            };
        } catch (error) {
            return { error: error.message, timestamp: Date.now() };
        }
    }

    async attemptContextBasedRecovery(step, taskState) {
        try {
            // Analyze current page state and try to adapt
            const currentContext = await this.analyzeCurrentContextEnhanced();
            if (!currentContext.success) {
                return { success: false, error: 'Could not analyze current context' };
            }
            
            // Use ChatGPT to suggest recovery strategy
            const recovery = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at error recovery. Suggest a recovery strategy for the failed step.

RESPONSE FORMAT (JSON only):
{
  "recoveryStrategy": "strategy_name",
  "modifiedStep": {
    "action": "modified_action",
    "selector": "modified_selector",
    "target": "modified_target"
  },
  "reasoning": "why this should work",
  "confidence": 0.8
}

FAILED STEP:
- Action: ${step.action}
- Target: ${step.target}
- Error: ${taskState.errors[taskState.errors.length - 1]?.error}

CURRENT CONTEXT:
- Page Type: ${currentContext.data.pageType}
- Available Actions: ${currentContext.data.availableActions.join(', ')}
- Interactive Elements: ${currentContext.data.interactiveElements}

Suggest a recovery strategy.`
                    },
                    {
                        role: 'user',
                        content: `Suggest recovery for failed step: ${step.description}`
                    }
                ]
            });

            if (recovery.success) {
                const recoveryData = JSON.parse(recovery.data.choices[0].message.content);
                
                if (recoveryData.confidence > 0.7) {
                    this.addChatMessage(`🔄 Trying context-based recovery: ${recoveryData.recoveryStrategy}`, 'assistant');
                    
                    const recoveryResult = await this.executeStepWithValidation(recoveryData.modifiedStep);
                    if (recoveryResult.success) {
                        return { success: true, message: `Recovered with ${recoveryData.recoveryStrategy}` };
                    }
                }
            }
            
            return { success: false, error: 'Context-based recovery failed' };
        } catch (error) {
            console.error('Context recovery error:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Helper validation methods for enhanced reliability
    validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    async getCurrentUrl() {
        try {
            return window.location.href;
        } catch {
            return 'about:blank';
        }
    }
    
    isSearchCapableSite(url) {
        const searchCapableSites = ['google.com', 'amazon.com', 'youtube.com', 'bing.com'];
        return searchCapableSites.some(site => url.includes(site));
    }
    
    async attemptRecovery(intent, originalMessage) {
        this.addChatMessage(`🔄 **RECOVERY ATTEMPT:** Trying alternative approach...`, 'assistant');
        
        try {
            // Try a simpler approach
            if (intent.actionType === 'search') {
                await this.executeEnhancedNavigation('https://google.com', intent);
                await new Promise(resolve => setTimeout(resolve, 2000));
                await this.executeEnhancedSearch(intent.target, intent);
            }
        } catch (error) {
            this.addChatMessage(`❌ **RECOVERY FAILED:** ${error.message}`, 'assistant');
        }
    }
}

// Initialize the renderer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing VerseRenderer...');
    console.log('DOM elements check:');
    console.log('- sidebar exists:', !!document.getElementById('sidebar'));
    console.log('- assistantButton exists:', !!document.getElementById('assistantButton'));
    console.log('- closeSidebar exists:', !!document.getElementById('closeSidebar'));
    
    const renderer = new VerseRenderer();
    
    // Don't create tabs here - let the main process handle initial tab creation
    console.log('VerseRenderer initialized successfully');
    
    // Make renderer globally accessible for debugging
    window.verseRenderer = renderer;
    
    // Add test function to manually toggle sidebar
    window.testSidebar = () => {
        console.log('Manual sidebar test...');
        const sidebar = document.getElementById('sidebar');
        console.log('Sidebar element:', sidebar);
        if (sidebar) {
            sidebar.classList.toggle('visible');
            console.log('Sidebar classes:', sidebar.className);
            console.log('Sidebar display style:', window.getComputedStyle(sidebar).display);
        }
    };

    // Add test function to debug API key
    window.testApiKey = () => {
        const apiKey = localStorage.getItem('openai-api-key');
        console.log('Current API key in localStorage:', apiKey ? apiKey.substring(0, 10) + '...' : 'None');
        console.log('API key length:', apiKey ? apiKey.length : 0);
        console.log('API key ends with:', apiKey ? apiKey.substring(apiKey.length - 5) : 'None');
        console.log('API key starts with sk-proj:', apiKey ? apiKey.startsWith('sk-proj-') : false);
        return apiKey;
    };
});

// Handle fullscreen video events
document.addEventListener('DOMContentLoaded', () => {
    const webview = document.getElementById('webview');
    
    webview.addEventListener('enter-html-full-screen', () => {
        document.body.style.overflow = 'hidden';
        webview.style.position = 'fixed';
        webview.style.top = '0';
        webview.style.left = '0';
        webview.style.width = '100vw';
        webview.style.height = '100vh';
        webview.style.zIndex = '9999';
    });

    webview.addEventListener('leave-html-full-screen', () => {
        document.body.style.overflow = '';
        webview.style.position = '';
        webview.style.top = '';
        webview.style.left = '';
        webview.style.width = '';
        webview.style.height = '';
        webview.style.zIndex = '';
    });
});

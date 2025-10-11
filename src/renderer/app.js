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
        
        // Always show chat interface directly
        this.showChatInterface();

        // No API key input needed - using environment variable

        // Chat functionality
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendMessage');

        const sendMessage = () => {
            const message = chatInput.value.trim();
            if (!message || !this.apiKey) return;

            // Add user message
            this.addChatMessage(message, 'user');
            chatInput.value = '';
            sendButton.disabled = true;

            // Send to ChatGPT
            this.sendToChatGPT(message);
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
            // Use IPC to make API call through main process (avoids CORS)
            const result = await ipcRenderer.invoke('chatgpt-request', {
                apiKey: this.apiKey,
                messages: this.chatHistory
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

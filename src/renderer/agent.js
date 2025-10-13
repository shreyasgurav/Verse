const { ipcRenderer } = require('electron');
const { chromium } = require('playwright');
const OpenAI = require('openai');
require('dotenv').config();

class AgenticBrowser {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.openai = null;
        this.isAgentActive = false;
        this.currentTask = null;
        this.automationHistory = [];
        
        this.initializeAI();
        this.setupEventListeners();
    }

    async initializeAI() {
        // Initialize OpenAI if API key is available
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
            console.log('AI Agent initialized with OpenAI');
        } else {
            console.log('OpenAI API key not found. AI features will be limited.');
        }
    }

    async initializePlaywright() {
        if (!this.browser) {
            this.browser = await chromium.launch({
                headless: false,
                slowMo: 100, // Slow down for better visualization
                args: [
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--enable-experimental-web-platform-features'
                ]
            });
            
            this.context = await this.browser.newContext({
                viewport: { width: 1280, height: 720 },
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            
            this.page = await this.context.newPage();
            
            // Set up page event listeners
            this.page.on('load', () => {
                console.log('Page loaded');
                this.updateUI();
            });
            
            this.page.on('console', msg => {
                console.log('Page console:', msg.text());
            });
        }
    }

    setupEventListeners() {
        // Listen for agent commands from the UI
        ipcRenderer.on('agent-command', async (event, command) => {
            await this.executeAgentCommand(command);
        });

        // Listen for automation requests
        ipcRenderer.on('automate-task', async (event, task) => {
            await this.executeTask(task);
        });
    }

    async executeAgentCommand(command) {
        console.log('Executing agent command:', command);
        
        if (!this.page) {
            await this.initializePlaywright();
        }

        switch (command.action) {
            case 'navigate':
                await this.navigateToUrl(command.url);
                break;
            case 'click':
                await this.clickElement(command.selector);
                break;
            case 'type':
                await this.typeText(command.selector, command.text);
                break;
            case 'scroll':
                await this.scrollPage(command.direction, command.amount);
                break;
            case 'screenshot':
                return await this.takeScreenshot();
            case 'extract':
                return await this.extractPageContent();
            case 'ai-plan':
                return await this.planTaskWithAI(command.goal);
            case 'ai-execute':
                return await this.executeTaskWithAI(command.goal);
            default:
                console.log('Unknown command:', command.action);
        }
    }

    async navigateToUrl(url) {
        try {
            if (!this.page) {
                await this.initializePlaywright();
            }
            
            await this.page.goto(url, { waitUntil: 'networkidle' });
            this.automationHistory.push({ action: 'navigate', url: url, timestamp: new Date() });
            
            // Update the main browser UI
            this.updateMainBrowserUI();
            
            return { success: true, url: url };
        } catch (error) {
            console.error('Navigation error:', error);
            return { success: false, error: error.message };
        }
    }

    async clickElement(selector) {
        try {
            // Enhanced element finding - try multiple strategies
            let element = null;
            
            // Strategy 1: Direct selector
            try {
                await this.page.waitForSelector(selector, { timeout: 2000 });
                element = await this.page.$(selector);
            } catch (e) {
                // Strategy 2: Find by text content
                element = await this.page.evaluateHandle((targetText) => {
                    const elements = document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
                    for (let el of elements) {
                        const text = (el.textContent || '').trim().toLowerCase();
                        const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                        if (text.includes(targetText.toLowerCase()) || ariaLabel.includes(targetText.toLowerCase())) {
                            return el;
                        }
                    }
                    return null;
                }, selector);
            }
            
            if (element && element.asElement()) {
                // Scroll element into view and click
                await element.asElement().scrollIntoViewIfNeeded();
                await element.asElement().click();
                this.automationHistory.push({ action: 'click', selector: selector, timestamp: new Date() });
                return { success: true, selector: selector };
            } else {
                throw new Error(`Element not found: ${selector}`);
            }
        } catch (error) {
            console.error('Click error:', error);
            return { success: false, error: error.message };
        }
    }

    async typeText(selector, text) {
        try {
            // Enhanced element finding for input fields
            let element = null;
            
            // Strategy 1: Direct selector
            try {
                await this.page.waitForSelector(selector, { timeout: 2000 });
                element = await this.page.$(selector);
            } catch (e) {
                // Strategy 2: Find by placeholder, aria-label, or context
                element = await this.page.evaluateHandle((targetText) => {
                    const elements = document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]');
                    for (let el of elements) {
                        const placeholder = (el.placeholder || '').trim().toLowerCase();
                        const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                        const name = (el.name || '').trim().toLowerCase();
                        const id = (el.id || '').trim().toLowerCase();
                        const target = targetText.toLowerCase();
                        
                        if (placeholder.includes(target) || ariaLabel.includes(target) || 
                            name.includes(target) || id.includes(target)) {
                            return el;
                        }
                    }
                    return null;
                }, selector);
            }
            
            if (element && element.asElement()) {
                // Focus, clear, and type
                await element.asElement().focus();
                await element.asElement().fill('');
                await element.asElement().type(text);
                this.automationHistory.push({ action: 'type', selector: selector, text: text, timestamp: new Date() });
                return { success: true, selector: selector, text: text };
            } else {
                throw new Error(`Input element not found: ${selector}`);
            }
        } catch (error) {
            console.error('Type error:', error);
            return { success: false, error: error.message };
        }
    }

    async typeAndEnter(selector, text) {
        try {
            // Enhanced element finding for input fields
            let element = null;
            
            // Strategy 1: Direct selector
            try {
                await this.page.waitForSelector(selector, { timeout: 2000 });
                element = await this.page.$(selector);
            } catch (e) {
                // Strategy 2: Find by placeholder, aria-label, or context
                element = await this.page.evaluateHandle((targetText) => {
                    const elements = document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]');
                    for (let el of elements) {
                        const placeholder = (el.placeholder || '').trim().toLowerCase();
                        const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                        const name = (el.name || '').trim().toLowerCase();
                        const id = (el.id || '').trim().toLowerCase();
                        const target = targetText.toLowerCase();
                        
                        if (placeholder.includes(target) || ariaLabel.includes(target) || 
                            name.includes(target) || id.includes(target)) {
                            return el;
                        }
                    }
                    return null;
                }, selector);
            }
            
            if (element && element.asElement()) {
                // Focus, clear, type, and press Enter
                await element.asElement().focus();
                await element.asElement().fill('');
                await element.asElement().type(text);
                await element.asElement().press('Enter');
                this.automationHistory.push({ action: 'type_enter', selector: selector, text: text, timestamp: new Date() });
                return { success: true, selector: selector, text: text };
            } else {
                throw new Error(`Input element not found: ${selector}`);
            }
        } catch (error) {
            console.error('Type+Enter error:', error);
            return { success: false, error: error.message };
        }
    }

    async scrollPage(direction = 'down', amount = 3) {
        try {
            const scrollAmount = direction === 'down' ? amount * 300 : -amount * 300;
            await this.page.evaluate((scroll) => {
                window.scrollBy(0, scroll);
            }, scrollAmount);
            
            this.automationHistory.push({ action: 'scroll', direction: direction, amount: amount, timestamp: new Date() });
            
            return { success: true, direction: direction, amount: amount };
        } catch (error) {
            console.error('Scroll error:', error);
            return { success: false, error: error.message };
        }
    }

    async takeScreenshot() {
        try {
            const screenshot = await this.page.screenshot({ fullPage: true });
            return { success: true, screenshot: screenshot.toString('base64') };
        } catch (error) {
            console.error('Screenshot error:', error);
            return { success: false, error: error.message };
        }
    }

    async extractPageContent() {
        try {
            const content = await this.page.evaluate(() => {
                return {
                    title: document.title,
                    url: window.location.href,
                    text: document.body.innerText,
                    links: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href })),
                    buttons: Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(b => ({ text: b.value || b.innerText, type: b.type })),
                    inputs: Array.from(document.querySelectorAll('input, textarea')).map(i => ({ type: i.type, placeholder: i.placeholder, name: i.name }))
                };
            });
            
            return { success: true, content: content };
        } catch (error) {
            console.error('Extract error:', error);
            return { success: false, error: error.message };
        }
    }

    async planTaskWithAI(goal) {
        if (!this.openai) {
            return { success: false, error: 'OpenAI not initialized' };
        }

        try {
            const currentContent = await this.extractPageContent();
            
            const prompt = `
            You are an advanced AI web automation agent with enhanced reasoning capabilities. Plan the steps to accomplish this goal: "${goal}"
            
            **CHAIN OF THOUGHT PROCESS:**
            1. Analyze the current page context and available elements
            2. Identify what needs to be done next to achieve the goal
            3. Select the most appropriate element and action
            4. Consider the sequence of actions needed
            
            Current page context:
            - Title: ${currentContent.content?.title || 'Unknown'}
            - URL: ${currentContent.content?.url || 'Unknown'}
            - Available buttons: ${JSON.stringify(currentContent.content?.buttons || [])}
            - Available inputs: ${JSON.stringify(currentContent.content?.inputs || [])}
            - Available links: ${JSON.stringify(currentContent.content?.links?.slice(0, 10) || [])}
            
            **ENHANCED REASONING RULES:**
            - For Amazon searches: Look for search input fields and search buttons
            - For e-commerce: Identify product listings, prices, and relevant filters
            - For forms: Find input fields by placeholder, aria-label, or context
            - For navigation: Use specific element text or attributes, not generic selectors
            - Always analyze what the current page offers before deciding next action
            
            **ELEMENT SELECTION STRATEGY:**
            - For search: Look for elements with inputContext='search' or placeholder containing 'search'
            - For buttons: Use exact button text or aria-label
            - For links: Use link text or href context
            - Always prefer specific element identification over generic selectors
            
            Provide a JSON array of steps in this format:
            [
                {
                    "action": "navigate|click|type|type_enter|scroll|wait",
                    "target": "specific element identifier - text, placeholder, or context",
                    "value": "text to type or scroll amount",
                    "reasoning": "detailed step-by-step reasoning including current situation analysis, next objective, element selection rationale, and action justification"
                }
            ]
            
            Be specific with element identification and provide detailed reasoning for each step.
            `;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3
            });

            const plan = JSON.parse(response.choices[0].message.content);
            return { success: true, plan: plan };
            
        } catch (error) {
            console.error('AI planning error:', error);
            return { success: false, error: error.message };
        }
    }

    async executeTaskWithAI(goal) {
        if (!this.openai) {
            return { success: false, error: 'OpenAI not initialized' };
        }

        try {
            // First, plan the task
            const planResult = await this.planTaskWithAI(goal);
            if (!planResult.success) {
                return planResult;
            }

            const plan = planResult.plan;
            const results = [];

            // Execute each step in the plan
            for (let i = 0; i < plan.length; i++) {
                const step = plan[i];
                console.log(`Executing step ${i + 1}/${plan.length}: ${step.action} - ${step.reasoning}`);
                
                let result;
                switch (step.action) {
                    case 'navigate':
                        result = await this.navigateToUrl(step.target);
                        break;
                    case 'click':
                        result = await this.clickElement(step.target);
                        break;
            case 'type':
                result = await this.typeText(step.target, step.value);
                break;
            case 'type_enter':
                result = await this.typeAndEnter(step.target, step.value);
                break;
                    case 'scroll':
                        result = await this.scrollPage(step.value > 0 ? 'down' : 'up', Math.abs(step.value));
                        break;
                    case 'wait':
                        await new Promise(resolve => setTimeout(resolve, step.value * 1000));
                        result = { success: true, action: 'wait', duration: step.value };
                        break;
                    default:
                        result = { success: false, error: `Unknown action: ${step.action}` };
                }
                
                results.push({ step: step, result: result });
                
                // Wait between steps
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            return { success: true, results: results, plan: plan };
            
        } catch (error) {
            console.error('AI execution error:', error);
            return { success: false, error: error.message };
        }
    }

    updateMainBrowserUI() {
        // Update the main Electron browser window with current page info
        if (this.page) {
            this.page.evaluate(() => {
                // Send page info to main process
                if (window.electronAPI) {
                    window.electronAPI.updatePageInfo({
                        url: window.location.href,
                        title: document.title
                    });
                }
            });
        }
    }

    updateUI() {
        // Update the agentic browser UI with current status
        const agentStatus = document.getElementById('agentStatus');
        if (agentStatus) {
            agentStatus.textContent = this.isAgentActive ? 'Agent Active' : 'Agent Ready';
            agentStatus.className = this.isAgentActive ? 'status-active' : 'status-ready';
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.page = null;
        }
    }
}

// Initialize the agentic browser when the page loads
let agenticBrowser;

document.addEventListener('DOMContentLoaded', () => {
    agenticBrowser = new AgenticBrowser();
    
    // Add agent control UI
    addAgentControlPanel();
    
    console.log('Agentic Browser initialized');
});

function addAgentControlPanel() {
    // Create agent control panel
    const agentPanel = document.createElement('div');
    agentPanel.id = 'agentPanel';
    agentPanel.innerHTML = `
        <div class="agent-header">
            <h3>🤖 AI Agent Control</h3>
            <div id="agentStatus" class="status-ready">Agent Ready</div>
        </div>
        <div class="agent-controls">
            <input type="text" id="agentGoal" placeholder="Enter your goal (e.g., 'Search for Python tutorials')" />
            <button id="planTask">Plan Task</button>
            <button id="executeTask">Execute Task</button>
            <button id="takeScreenshot">Screenshot</button>
            <button id="extractContent">Extract Content</button>
        </div>
        <div id="agentResults" class="agent-results"></div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #agentPanel {
            position: fixed;
            top: 10px;
            right: 10px;
            width: 350px;
            background: rgba(45, 45, 45, 0.95);
            border: 1px solid #404040;
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .agent-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .agent-header h3 {
            color: #ffffff;
            margin: 0;
            font-size: 16px;
        }
        .status-ready {
            color: #00ff88;
            font-size: 12px;
        }
        .status-active {
            color: #ffaa00;
            font-size: 12px;
        }
        .agent-controls {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .agent-controls input, .agent-controls button {
            padding: 8px 12px;
            border: 1px solid #404040;
            border-radius: 4px;
            background: #1a1a1a;
            color: #ffffff;
            font-size: 12px;
        }
        .agent-controls button {
            cursor: pointer;
            background: #007AFF;
        }
        .agent-controls button:hover {
            background: #0056CC;
        }
        .agent-results {
            margin-top: 15px;
            max-height: 200px;
            overflow-y: auto;
            background: #1a1a1a;
            border: 1px solid #404040;
            border-radius: 4px;
            padding: 10px;
            font-size: 11px;
            color: #cccccc;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(agentPanel);
    
    // Add event listeners
    document.getElementById('planTask').addEventListener('click', async () => {
        const goal = document.getElementById('agentGoal').value;
        if (!goal) return;
        
        const result = await agenticBrowser.executeAgentCommand({ action: 'ai-plan', goal: goal });
        displayResult('Plan Result', result);
    });
    
    document.getElementById('executeTask').addEventListener('click', async () => {
        const goal = document.getElementById('agentGoal').value;
        if (!goal) return;
        
        agenticBrowser.isAgentActive = true;
        agenticBrowser.updateUI();
        
        const result = await agenticBrowser.executeAgentCommand({ action: 'ai-execute', goal: goal });
        displayResult('Execution Result', result);
        
        agenticBrowser.isAgentActive = false;
        agenticBrowser.updateUI();
    });
    
    document.getElementById('takeScreenshot').addEventListener('click', async () => {
        const result = await agenticBrowser.executeAgentCommand({ action: 'screenshot' });
        displayResult('Screenshot', result);
    });
    
    document.getElementById('extractContent').addEventListener('click', async () => {
        const result = await agenticBrowser.executeAgentCommand({ action: 'extract' });
        displayResult('Content Extraction', result);
    });
}

function displayResult(title, result) {
    const resultsDiv = document.getElementById('agentResults');
    const resultItem = document.createElement('div');
    resultItem.innerHTML = `
        <strong>${title}:</strong><br>
        <pre>${JSON.stringify(result, null, 2)}</pre>
        <hr>
    `;
    resultsDiv.appendChild(resultItem);
    resultsDiv.scrollTop = resultsDiv.scrollHeight;
}

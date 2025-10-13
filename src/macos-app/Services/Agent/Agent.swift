//
//  Agent.swift
//  Arc
//
//  Unified Agent - Clean, Simple, Powerful
//

import Foundation
import WebKit
import Combine

// MARK: - Agent Action Types
enum AgentAction {
    case navigate(String)
    case click(String)
    case type(String, String) // target, value
    case typeEnter(String, String) // target, value
    case select(String, String) // target, option
    case wait(Int) // seconds
    case complete
}

enum AgentThoughtType {
    case planning
    case reasoning
    case observation
    case action
    case verification
    case completion
}

struct AgentThought {
    let content: String
    let type: AgentThoughtType
    let timestamp: Date
}

// MARK: - Main Agent
class Agent: NSObject, ObservableObject {
    
    // MARK: - Published Properties
    @Published var isActive: Bool = false
    @Published var currentGoal: String = ""
    @Published var thoughts: [AgentThought] = []
    @Published var currentStep: Int = 0
    
    // MARK: - Services
    private let pageAnalyzer = PageAnalyzer()
    private var chatGPTService: ChatGPTService?
    
    // MARK: - State
    private var actionHistory: [String] = []
    private var completedSubgoals: [String] = []
    private var goalProgress: GoalProgress = GoalProgress()
    private var retryCount: [String: Int] = [:]
    private var maxRetries: Int = 3
    
    // MARK: - Main Agent Loop
    func start(goal: String, webView: WKWebView) async {
        await MainActor.run {
            self.isActive = true
            self.currentGoal = goal
            self.thoughts = []
            self.currentStep = 0
            self.actionHistory = []
            self.completedSubgoals = []
        }
        
        addThought("Goal: \(goal)", type: .planning)
        addThought("Starting agent...", type: .planning)
        
        // Initialize goal progress tracking
        goalProgress.currentPhase = .analysis
        goalProgress.confidence = 0.5
        
        // Check if we need to navigate first
        await checkAndNavigate(goal: goal, webView: webView)
        
        // Main agent loop with enhanced reliability
        var iteration = 0
        let maxIterations = 50
        var consecutiveFailures = 0
        let maxConsecutiveFailures = 5
        
        while isActive && iteration < maxIterations {
            iteration += 1
            
            await MainActor.run {
                self.currentStep = iteration
            }
            
            addThought("🔄 Step \(iteration) - Phase: \(goalProgress.currentPhase) - Confidence: \(Int(goalProgress.confidence * 100))%", type: .planning)
            
            // 1. Enhanced page analysis with validation
            addThought("🔍 Analyzing page state...", type: .observation)
            
            guard let pageContext = await pageAnalyzer.analyze(webView: webView) else {
                addThought("❌ Could not analyze page - retrying...", type: .verification)
                consecutiveFailures += 1
                
                if consecutiveFailures >= maxConsecutiveFailures {
                    addThought("❌ Too many consecutive failures, stopping agent", type: .verification)
                    break
                }
                
                // Wait longer before retrying
                try? await Task.sleep(nanoseconds: 3_000_000_000) // 3 seconds
                continue
            }
            
            addThought("✅ Page analyzed - Title: \(pageContext.title), Elements: \(pageContext.elements.count)", type: .observation)
            
            // 2. Enhanced action determination with progress context
            addThought("🧠 Determining next action with progress context...", type: .reasoning)
            
            guard let action = await determineNextAction(
                goal: goal,
                pageContext: pageContext,
                iteration: iteration
            ) else {
                addThought("❌ Could not determine next action - trying alternative approach", type: .verification)
                consecutiveFailures += 1
                
                if consecutiveFailures >= maxConsecutiveFailures {
                    addThought("❌ Too many consecutive failures, stopping agent", type: .verification)
                    break
                }
                
                // Try to recover by advancing phase or trying different approach
                await attemptRecovery(goal: goal, webView: webView)
                continue
            }
            
            // Check if goal is complete
            if case .complete = action {
                addThought("🎉 Goal achieved successfully!", type: .completion)
                goalProgress.currentPhase = .completion
                break
            }
            
            // 3. Enhanced action execution with retry logic
            let actionKey = actionDescription(action)
            let currentRetries = retryCount[actionKey] ?? 0
            
            addThought("⚡ Executing: \(actionKey) (attempt \(currentRetries + 1))", type: .action)
            
            let success = await executeAction(action: action, webView: webView, pageContext: pageContext)
            
            if success {
                addThought("✅ Action completed successfully", type: .verification)
                trackAction(action)
                goalProgress.recordSuccess(actionKey)
                consecutiveFailures = 0 // Reset failure count
                retryCount[actionKey] = 0 // Reset retry count
                
                // Advance phase if appropriate
                if shouldAdvancePhase(for: action) {
                    goalProgress.advancePhase()
                    addThought("📈 Advanced to phase: \(goalProgress.currentPhase)", type: .planning)
                }
                
            } else {
                addThought("❌ Action failed", type: .verification)
                consecutiveFailures += 1
                goalProgress.recordFailure(actionKey)
                
                // Implement retry logic
                if currentRetries < maxRetries {
                    retryCount[actionKey] = currentRetries + 1
                    addThought("🔄 Will retry action (attempt \(currentRetries + 2)/\(maxRetries + 1))", type: .reasoning)
                } else {
                    addThought("❌ Max retries reached for this action, trying alternative", type: .verification)
                    retryCount[actionKey] = 0 // Reset for alternative approach
                }
                
                if consecutiveFailures >= maxConsecutiveFailures {
                    addThought("❌ Too many consecutive failures, stopping agent", type: .verification)
                    break
                }
            }
            
            // Adaptive wait time based on success/failure
            let waitTime = success ? 1_000_000_000 : 2_000_000_000 // 1s on success, 2s on failure
            try? await Task.sleep(nanoseconds: waitTime)
        }
        
        if iteration >= maxIterations {
            addThought("Reached maximum iterations", type: .completion)
        }
        
        await MainActor.run {
            self.isActive = false
        }
    }
    
    func stop() {
        isActive = false
    }
    
    func setChatGPTService(_ service: ChatGPTService) {
        self.chatGPTService = service
    }
    
    // MARK: - Navigation Check
    private func checkAndNavigate(goal: String, webView: WKWebView) async {
        let requiredSite = extractRequiredSite(from: goal)
        
        if let site = requiredSite {
            addThought("Need to navigate to \(site.name)", type: .planning)
            
            let currentURL = await getCurrentURL(webView: webView)
            if !currentURL.contains(site.domain) {
                addThought("Navigating to \(site.url)", type: .action)
                _ = await navigate(to: site.url, webView: webView)
            } else {
                addThought("Already on \(site.name)", type: .observation)
            }
        }
    }
    
    private func extractRequiredSite(from goal: String) -> (name: String, domain: String, url: String)? {
        let goalLower = goal.lowercased()
        
        let siteMap: [(keywords: [String], name: String, domain: String, url: String)] = [
            (["amazon"], "Amazon", "amazon.com", "https://www.amazon.com"),
            (["google"], "Google", "google.com", "https://www.google.com"),
            (["youtube"], "YouTube", "youtube.com", "https://www.youtube.com"),
            (["facebook", "fb"], "Facebook", "facebook.com", "https://www.facebook.com"),
            (["twitter", "x.com"], "Twitter", "twitter.com", "https://www.twitter.com"),
            (["instagram", "ig"], "Instagram", "instagram.com", "https://www.instagram.com"),
            (["linkedin"], "LinkedIn", "linkedin.com", "https://www.linkedin.com"),
            (["reddit"], "Reddit", "reddit.com", "https://www.reddit.com"),
            (["github"], "GitHub", "github.com", "https://www.github.com"),
            (["forms", "google forms"], "Google Forms", "forms.google.com", "https://docs.google.com/forms"),
            (["gmail"], "Gmail", "mail.google.com", "https://mail.google.com"),
            (["docs", "google docs"], "Google Docs", "docs.google.com", "https://docs.google.com"),
            (["sheets", "google sheets"], "Google Sheets", "sheets.google.com", "https://sheets.google.com"),
            (["drive", "google drive"], "Google Drive", "drive.google.com", "https://drive.google.com"),
        ]
        
        // Enhanced pattern matching for better e-commerce detection
        for site in siteMap {
            for keyword in site.keywords {
                let patterns = [
                    " on \(keyword)",
                    " in \(keyword)",
                    " at \(keyword)",
                    " from \(keyword)",
                    " to \(keyword)",
                    "^\(keyword) ",
                    " \(keyword)$",
                    "\(keyword) and",
                    "\(keyword) to",
                    "\(keyword) for",
                    "\(keyword) with",
                    "\(keyword) search",
                    "\(keyword) find",
                    "\(keyword) buy",
                    "\(keyword) purchase"
                ]
                
                for pattern in patterns {
                    if goalLower.contains(pattern) || goalLower.hasPrefix(keyword) || goalLower.hasSuffix(keyword) {
                        return (name: site.name, domain: site.domain, url: site.url)
                    }
                }
            }
        }
        
        // Special handling for shopping-related queries without explicit site mention
        let shoppingKeywords = ["buy", "purchase", "shop", "price", "cost", "cheap", "expensive", "deal", "sale", "discount", "phone", "laptop", "electronics", "under", "above"]
        let hasShoppingIntent = shoppingKeywords.contains { goalLower.contains($0) }
        
        if hasShoppingIntent && !goalLower.contains("google") {
            return (name: "Amazon", domain: "amazon.com", url: "https://www.amazon.com")
        }
        
        return nil
    }
    
    private func getCurrentURL(webView: WKWebView) async -> String {
        await withCheckedContinuation { continuation in
            webView.evaluateJavaScript("window.location.href") { result, error in
                let url = result as? String ?? ""
                continuation.resume(returning: url)
            }
        }
    }
    
    // MARK: - Action Determination
    private func determineNextAction(goal: String, pageContext: PageContext, iteration: Int) async -> AgentAction? {
        let historyText = actionHistory.isEmpty ? "None - just started" : actionHistory.suffix(5).joined(separator: "\n")
        let completedText = completedSubgoals.isEmpty ? "None yet" : completedSubgoals.joined(separator: ", ")
        
        let prompt = """
        You are a highly reliable web automation agent. Complete this task: "\(goal)"
        
        **COMPREHENSIVE CHAIN OF THOUGHT ANALYSIS:**
        
        **PHASE 1 - GOAL ANALYSIS:**
        - Primary objective: [Extract and clearly state the main goal]
        - Key requirements: [Identify constraints, targets, platforms, conditions]
        - Success criteria: [Define exactly what completion looks like]
        - Estimated complexity: [Simple/Medium/Complex based on steps needed]
        
        **PHASE 2 - CURRENT STATE ASSESSMENT:**
        - Current URL: \(pageContext.url)
        - Page title: \(pageContext.title)
        - Page state: [loaded/loading/error/unknown]
        - Available elements: \(pageContext.elements.count) interactive elements
        - Key elements found: [List relevant elements by context and purpose]
        - Navigation status: [on target site/need navigation/wrong site]
        
        **PHASE 3 - STRATEGIC PLANNING:**
        - Immediate priority: [What absolutely must happen next]
        - Element identification: [Specific element needed and how to find it]
        - Interaction method: [Exact action type and parameters]
        - Expected outcome: [What should happen after this action]
        - Validation criteria: [How to confirm this action succeeded]
        
        **PHASE 4 - EXECUTION STRATEGY:**
        - Primary approach: [Main strategy for this step]
        - Fallback options: [Alternative approaches if primary fails]
        - Error prevention: [What to check before acting]
        - Recovery plan: [What to do if action fails]
        
        **PHASE 5 - PROGRESS TRACKING:**
        - Step: \(iteration) of 50
        - Actions completed: \(actionHistory.count)
        - Recent actions: \(historyText)
        - Completed subgoals: \(completedText)
        - Current phase: [navigation/search/interaction/verification]
        
        **RELIABILITY REQUIREMENTS:**
        - ALWAYS validate element exists and is interactable before acting
        - ALWAYS provide specific element identifiers (text, aria-label, placeholder)
        - ALWAYS explain why this specific action advances the goal
        - ALWAYS consider what could go wrong and how to handle it
        - ALWAYS verify success criteria before marking goal complete
        
        **ELEMENT SELECTION PRIORITIES:**
        1. Elements with clear, specific text content
        2. Elements with descriptive aria-labels
        3. Elements with meaningful placeholder text
        4. Elements with recognizable input contexts (search, button, etc.)
        5. Elements positioned prominently on the page
        
        **ACTION SELECTION RULES:**
        - NAVIGATE: Only when not on target site or need specific URL
        - CLICK: For buttons, links, and interactive elements
        - TYPE: For filling forms without submission
        - TYPE_ENTER: For search boxes and form submissions
        - SELECT: For dropdowns and selection lists
        - WAIT: When page is loading or needs time to stabilize
        - COMPLETE: Only when goal is fully achieved and verified
        
        **CURRENT PAGE ANALYSIS:**
        \(pageAnalyzer.formatForAI(pageContext))
        
        **RELIABLE DECISION MAKING:**
        Based on the comprehensive 5-phase analysis above, make your decision:
        
        ACTION: [NAVIGATE/CLICK/TYPE/TYPE_ENTER/SELECT/WAIT/COMPLETE]
        TARGET: [Specific element identifier - exact text, placeholder, or context]
        VALUE: [Text to type, option to select, or URL to navigate to]
        REASONING: [Complete 5-phase analysis: Goal breakdown, current state assessment, strategic planning, execution strategy, and progress validation. Include specific element identification rationale and success criteria.]
        """
        
        guard let chatGPTService = chatGPTService else {
            addThought("ChatGPT service not available", type: .verification)
            return nil
        }
        
        do {
            let response = try await chatGPTService.sendMessage(prompt, conversationHistory: [])
            return parseAction(response)
        } catch {
            addThought("Error determining action: \(error.localizedDescription)", type: .verification)
            return nil
        }
    }
    
    private func parseAction(_ response: String) -> AgentAction? {
        let lines = response.components(separatedBy: "\n")
        var action = ""
        var target = ""
        var value = ""
        var reasoning = ""
        
        for line in lines {
            if line.hasPrefix("ACTION:") {
                action = line.replacingOccurrences(of: "ACTION:", with: "").trimmingCharacters(in: .whitespaces)
            } else if line.hasPrefix("TARGET:") {
                target = line.replacingOccurrences(of: "TARGET:", with: "").trimmingCharacters(in: .whitespaces)
            } else if line.hasPrefix("VALUE:") {
                value = line.replacingOccurrences(of: "VALUE:", with: "").trimmingCharacters(in: .whitespaces)
            } else if line.hasPrefix("REASONING:") {
                reasoning = line.replacingOccurrences(of: "REASONING:", with: "").trimmingCharacters(in: .whitespaces)
            }
        }
        
        if !reasoning.isEmpty {
            addThought("Reasoning: \(reasoning)", type: .reasoning)
        }
        
        switch action.uppercased() {
        case "NAVIGATE":
            return .navigate(target)
        case "CLICK":
            return .click(target)
        case "TYPE":
            return .type(target, value)
        case "TYPE_ENTER":
            return .typeEnter(target, value)
        case "SELECT":
            return .select(target, value)
        case "WAIT":
            return .wait(Int(target) ?? 2)
        case "COMPLETE":
            return .complete
        default:
            return nil
        }
    }
    
    // MARK: - Action Execution
    private func executeAction(action: AgentAction, webView: WKWebView, pageContext: PageContext) async -> Bool {
        switch action {
        case .navigate(let url):
            return await navigate(to: url, webView: webView)
        case .click(let target):
            return await clickElement(target: target, webView: webView, pageContext: pageContext)
        case .type(let target, let value):
            return await typeText(target: target, value: value, webView: webView, pageContext: pageContext)
        case .typeEnter(let target, let value):
            return await typeAndEnter(target: target, value: value, webView: webView, pageContext: pageContext)
        case .select(let target, let option):
            return await selectOption(target: target, option: option, webView: webView, pageContext: pageContext)
        case .wait(let seconds):
            try? await Task.sleep(nanoseconds: UInt64(seconds) * 1_000_000_000)
            return true
        case .complete:
            return true
        }
    }
    
    private func navigate(to url: String, webView: WKWebView) async -> Bool {
        await withCheckedContinuation { continuation in
            DispatchQueue.main.async {
                guard let validURL = URL(string: url) else {
                    self.addThought("Invalid URL: \(url)", type: .verification)
                    continuation.resume(returning: false)
                    return
                }
                
                webView.load(URLRequest(url: validURL))
                self.addThought("Navigating to \(url)", type: .action)
                
                DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                    continuation.resume(returning: true)
                }
            }
        }
    }
    
    private func clickElement(target: String, webView: WKWebView, pageContext: PageContext) async -> Bool {
        addThought("Attempting to click element: \(target)", type: .action)
        
        // Phase 1: Pre-action validation
        guard let element = findElement(target: target, in: pageContext) else {
            addThought("❌ Pre-validation failed: Element not found - \(target)", type: .verification)
            return await tryAlternativeClickStrategies(target: target, webView: webView)
        }
        
        addThought("✅ Element found: \(element.tagName) with text '\(element.text)'", type: .verification)
        
        // Phase 2: Element readiness check
        let readinessCheck = """
        (function() {
            const elements = document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
            for (let el of elements) {
                const text = (el.textContent || '').trim().toLowerCase();
                const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                const target = '\(target.lowercased())';
                
                if (text.includes(target) || ariaLabel.includes(target)) {
                    // Check if element is visible and interactable
                    const rect = el.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0 && rect.top >= 0;
                    const isEnabled = !el.disabled && !el.readOnly;
                    const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
                    
                    return {
                        found: true,
                        visible: isVisible,
                        enabled: isEnabled,
                        inViewport: isInViewport,
                        elementType: el.tagName,
                        elementText: el.textContent || el.value || ''
                    };
                }
            }
            return { found: false };
        })();
        """
        
        let readinessResult = await executeJavaScriptWithResult(readinessCheck, webView: webView)
        
        if let result = readinessResult as? [String: Any], 
           let found = result["found"] as? Bool, found {
            
            let visible = result["visible"] as? Bool ?? false
            let enabled = result["enabled"] as? Bool ?? false
            let inViewport = result["inViewport"] as? Bool ?? false
            
            if !visible {
                addThought("❌ Element not visible, attempting to scroll into view", type: .verification)
            }
            if !enabled {
                addThought("❌ Element not enabled/clickable", type: .verification)
                return false
            }
            
            // Phase 3: Execute click with validation
            let clickScript = """
            (function() {
                const elements = document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
                for (let el of elements) {
                    const text = (el.textContent || '').trim().toLowerCase();
                    const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                    const target = '\(target.lowercased())';
                    
                    if (text.includes(target) || ariaLabel.includes(target)) {
                        // Ensure element is in viewport
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        // Wait for scroll to complete, then click
                        setTimeout(() => {
                            // Double-check element is still interactable
                            if (!el.disabled && el.offsetParent !== null) {
                                el.click();
                            }
                        }, 800);
                        
                        return true;
                    }
                }
                return false;
            })();
            """
            
            let clickSuccess = await executeJavaScript(clickScript, webView: webView, action: "click", target: target)
            
            if clickSuccess {
                addThought("✅ Successfully clicked element: \(target)", type: .verification)
                return true
            } else {
                addThought("❌ Click execution failed, trying alternative strategies", type: .verification)
                return await tryAlternativeClickStrategies(target: target, webView: webView)
            }
        } else {
            addThought("❌ Element readiness check failed", type: .verification)
            return await tryAlternativeClickStrategies(target: target, webView: webView)
        }
    }
    
    private func tryAlternativeClickStrategies(target: String, webView: WKWebView) async -> Bool {
        addThought("🔄 Trying alternative click strategies for: \(target)", type: .action)
        
        // Strategy 1: Try partial text matching
        let partialMatchScript = """
        (function() {
            const targetWords = '\(target.lowercased())'.split(' ');
            const elements = document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
            
            for (let el of elements) {
                const text = (el.textContent || '').trim().toLowerCase();
                const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                
                // Check if any target word is in the element text
                for (let word of targetWords) {
                    if (word.length > 2 && (text.includes(word) || ariaLabel.includes(word))) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => {
                            if (!el.disabled && el.offsetParent !== null) {
                                el.click();
                            }
                        }, 800);
                        return { success: true, matched: word, element: el.textContent || el.value };
                    }
                }
            }
            return { success: false };
        })();
        """
        
        if let result = await executeJavaScriptWithResult(partialMatchScript, webView: webView) as? [String: Any],
           let success = result["success"] as? Bool, success {
            let matched = result["matched"] as? String ?? ""
            addThought("✅ Alternative strategy succeeded with partial match: \(matched)", type: .verification)
            return true
        }
        
        // Strategy 2: Try generic search button if looking for search
        if target.lowercased().contains("search") {
            let searchButtonScript = """
            (function() {
                const selectors = [
                    'input[type="submit"]',
                    'button[type="submit"]',
                    '[aria-label*="search"]',
                    '[data-testid*="search"]',
                    '.search-button',
                    '#search-button'
                ];
                
                for (let selector of selectors) {
                    const el = document.querySelector(selector);
                    if (el && !el.disabled && el.offsetParent !== null) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => {
                            el.click();
                        }, 800);
                        return { success: true, selector: selector };
                    }
                }
                return { success: false };
            })();
            """
            
            if let result = await executeJavaScriptWithResult(searchButtonScript, webView: webView) as? [String: Any],
               let success = result["success"] as? Bool, success {
                let selector = result["selector"] as? String ?? ""
                addThought("✅ Found search button using selector: \(selector)", type: .verification)
                return true
            }
        }
        
        addThought("❌ All click strategies failed for: \(target)", type: .verification)
        return false
    }
    
    private func typeText(target: String, value: String, webView: WKWebView, pageContext: PageContext) async -> Bool {
        addThought("Attempting to type '\(value)' into: \(target)", type: .action)
        
        // Phase 1: Pre-action validation
        guard let element = findElement(target: target, in: pageContext) else {
            addThought("❌ Pre-validation failed: Input field not found - \(target)", type: .verification)
            return await tryAlternativeTypeStrategies(target: target, value: value, webView: webView)
        }
        
        addThought("✅ Input field found: \(element.tagName) with placeholder '\(element.placeholder)'", type: .verification)
        
        // Phase 2: Input field readiness check
        let readinessCheck = """
        (function() {
            const elements = document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]');
            for (let el of elements) {
                const placeholder = (el.placeholder || '').trim().toLowerCase();
                const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                const name = (el.name || '').trim().toLowerCase();
                const target = '\(target.lowercased())';
                
                if (placeholder.includes(target) || ariaLabel.includes(target) || name.includes(target)) {
                    // Check if element is ready for input
                    const rect = el.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0 && rect.top >= 0;
                    const isEnabled = !el.disabled && !el.readOnly;
                    const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
                    
                    return {
                        found: true,
                        visible: isVisible,
                        enabled: isEnabled,
                        inViewport: isInViewport,
                        elementType: el.tagName,
                        currentValue: el.value || '',
                        maxLength: el.maxLength || -1
                    };
                }
            }
            return { found: false };
        })();
        """
        
        let readinessResult = await executeJavaScriptWithResult(readinessCheck, webView: webView)
        
        if let result = readinessResult as? [String: Any], 
           let found = result["found"] as? Bool, found {
            
            let visible = result["visible"] as? Bool ?? false
            let enabled = result["enabled"] as? Bool ?? false
            let currentValue = result["currentValue"] as? String ?? ""
            let maxLength = result["maxLength"] as? Int ?? -1
            
            if !visible {
                addThought("❌ Input field not visible, attempting to scroll into view", type: .verification)
            }
            if !enabled {
                addThought("❌ Input field not enabled for typing", type: .verification)
                return false
            }
            
            if !currentValue.isEmpty {
                addThought("⚠️ Input field has existing value: '\(currentValue)'", type: .verification)
            }
            
            // Phase 3: Execute typing with validation
            let typeScript = """
            (function() {
                const elements = document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]');
                for (let el of elements) {
                    const placeholder = (el.placeholder || '').trim().toLowerCase();
                    const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                    const name = (el.name || '').trim().toLowerCase();
                    const target = '\(target.lowercased())';
                    
                    if (placeholder.includes(target) || ariaLabel.includes(target) || name.includes(target)) {
                        // Ensure element is in viewport and focused
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        setTimeout(() => {
                            // Focus and clear existing content
                            el.focus();
                            el.select(); // Select all existing text
                            
                            // Type the new value
                            const newValue = '\(value)';
                            el.value = newValue;
                            
                            // Trigger events to ensure website recognizes the input
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                            el.dispatchEvent(new Event('blur', { bubbles: true }));
                            
                            // Verify the value was set
                            return el.value === newValue;
                        }, 500);
                        
                        return true;
                    }
                }
                return false;
            })();
            """
            
            let typeSuccess = await executeJavaScript(typeScript, webView: webView, action: "type", target: target)
            
            if typeSuccess {
                addThought("✅ Successfully typed '\(value)' into: \(target)", type: .verification)
                return true
            } else {
                addThought("❌ Typing execution failed, trying alternative strategies", type: .verification)
                return await tryAlternativeTypeStrategies(target: target, value: value, webView: webView)
            }
        } else {
            addThought("❌ Input field readiness check failed", type: .verification)
            return await tryAlternativeTypeStrategies(target: target, value: value, webView: webView)
        }
    }
    
    private func tryAlternativeTypeStrategies(target: String, value: String, webView: WKWebView) async -> Bool {
        addThought("🔄 Trying alternative typing strategies for: \(target)", type: .action)
        
        // Strategy 1: Try generic search input if looking for search
        if target.lowercased().contains("search") {
            let searchInputScript = """
            (function() {
                const selectors = [
                    'input[type="search"]',
                    'input[placeholder*="search"]',
                    'input[aria-label*="search"]',
                    'input[name*="search"]',
                    'input[id*="search"]',
                    '.search-input',
                    '#search-input',
                    'input[data-testid*="search"]'
                ];
                
                for (let selector of selectors) {
                    const el = document.querySelector(selector);
                    if (el && !el.disabled && el.offsetParent !== null) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        setTimeout(() => {
                            el.focus();
                            el.select();
                            el.value = '\(value)';
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        }, 500);
                        
                        return { success: true, selector: selector };
                    }
                }
                return { success: false };
            })();
            """
            
            if let result = await executeJavaScriptWithResult(searchInputScript, webView: webView) as? [String: Any],
               let success = result["success"] as? Bool, success {
                let selector = result["selector"] as? String ?? ""
                addThought("✅ Found search input using selector: \(selector)", type: .verification)
                return true
            }
        }
        
        // Strategy 2: Try any visible text input
        let anyInputScript = """
        (function() {
            const elements = document.querySelectorAll('input[type="text"], input[type="search"], input:not([type]), textarea');
            
            for (let el of elements) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && rect.top >= 0 && !el.disabled && el.offsetParent !== null) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    setTimeout(() => {
                        el.focus();
                        el.select();
                        el.value = '\(value)';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }, 500);
                    
                    return { success: true, elementType: el.tagName, elementId: el.id || 'no-id' };
                }
            }
            return { success: false };
        })();
        """
        
        if let result = await executeJavaScriptWithResult(anyInputScript, webView: webView) as? [String: Any],
           let success = result["success"] as? Bool, success {
            let elementType = result["elementType"] as? String ?? ""
            let elementId = result["elementId"] as? String ?? ""
            addThought("✅ Found input field: \(elementType) with ID: \(elementId)", type: .verification)
            return true
        }
        
        addThought("❌ All typing strategies failed for: \(target)", type: .verification)
        return false
    }
    
    private func typeAndEnter(target: String, value: String, webView: WKWebView, pageContext: PageContext) async -> Bool {
        let element = findElement(target: target, in: pageContext)
        
        if let element = element {
            let javascript = """
            (function() {
                const elements = document.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]');
                for (let el of elements) {
                    const placeholder = (el.placeholder || '').trim().toLowerCase();
                    const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                    const name = (el.name || '').trim().toLowerCase();
                    const target = '\(target.lowercased())';
                    
                    if (placeholder.includes(target) || ariaLabel.includes(target) || name.includes(target)) {
                        el.focus();
                        el.value = '';
                        el.value = '\(value)';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Press Enter
                        const enterEvent = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true
                        });
                        el.dispatchEvent(enterEvent);
                        return true;
                    }
                }
                return false;
            })();
            """
            
            return await executeJavaScript(javascript, webView: webView, action: "type+enter", target: target)
        } else {
            addThought("Could not find input field for typing: \(target)", type: .verification)
            return false
        }
    }
    
    private func selectOption(target: String, option: String, webView: WKWebView, pageContext: PageContext) async -> Bool {
        let element = findElement(target: target, in: pageContext)
        
        if let element = element {
            let javascript = """
            (function() {
                const elements = document.querySelectorAll('select, [role="listbox"]');
                for (let el of elements) {
                    const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                    const name = (el.name || '').trim().toLowerCase();
                    const target = '\(target.lowercased())';
                    
                    if (ariaLabel.includes(target) || name.includes(target)) {
                        const options = el.querySelectorAll('option');
                        for (let option of options) {
                            if (option.text.toLowerCase().includes('\(option.lowercased())')) {
                                el.value = option.value;
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                                return true;
                            }
                        }
                    }
                }
                return false;
            })();
            """
            
            return await executeJavaScript(javascript, webView: webView, action: "select", target: target)
        } else {
            addThought("Could not find select element: \(target)", type: .verification)
            return false
        }
    }
    
    private func executeJavaScript(_ javascript: String, webView: WKWebView, action: String, target: String) async -> Bool {
        await withCheckedContinuation { continuation in
            DispatchQueue.main.async {
                webView.evaluateJavaScript(javascript) { result, error in
                    if let error = error {
                        self.addThought("\(action) failed for \(target): \(error.localizedDescription)", type: .verification)
                        continuation.resume(returning: false)
                    } else if let success = result as? Bool, success {
                        self.addThought("Successfully executed \(action) on \(target)", type: .action)
                        continuation.resume(returning: true)
                    } else {
                        self.addThought("\(action) did not find target element: \(target)", type: .verification)
                        continuation.resume(returning: false)
                    }
                }
            }
        }
    }
    
    private func executeJavaScriptWithResult(_ javascript: String, webView: WKWebView) async -> Any? {
        await withCheckedContinuation { continuation in
            DispatchQueue.main.async {
                webView.evaluateJavaScript(javascript) { result, error in
                    if let error = error {
                        self.addThought("JavaScript execution failed: \(error.localizedDescription)", type: .verification)
                        continuation.resume(returning: nil)
                    } else {
                        continuation.resume(returning: result)
                    }
                }
            }
        }
    }
    
    private func findElement(target: String, in pageContext: PageContext) -> ElementContext? {
        let targetLower = target.lowercased()
        
        // Try to find element by text content
        for element in pageContext.elements {
            if element.text.lowercased().contains(targetLower) {
                return element
            }
        }
        
        // Try to find element by placeholder
        for element in pageContext.elements {
            if element.placeholder.lowercased().contains(targetLower) {
                return element
            }
        }
        
        // Try to find element by aria-label
        for element in pageContext.elements {
            if element.ariaLabel.lowercased().contains(targetLower) {
                return element
            }
        }
        
        // Try to find element by input context
        for element in pageContext.elements {
            if element.inputContext.lowercased().contains(targetLower) {
                return element
            }
        }
        
        return nil
    }
    
    // MARK: - Action Tracking
    private func trackAction(_ action: AgentAction) {
        let description = actionDescription(action)
        let historyEntry = "\(currentStep). \(description)"
        actionHistory.append(historyEntry)
        
        // Track completed sub-goals
        switch action {
        case .type(_, let value), .typeEnter(_, let value):
            if !value.isEmpty {
                completedSubgoals.append("Typed: \(value)")
            }
        case .click(let target):
            if target.lowercased().contains("question") {
                completedSubgoals.append("Added question")
            }
        default:
            break
        }
    }
    
    private func actionDescription(_ action: AgentAction) -> String {
        switch action {
        case .navigate(let url):
            return "Navigate to \(url)"
        case .click(let target):
            return "Click \(target)"
        case .type(let target, let value):
            return "Type '\(value)' in \(target)"
        case .typeEnter(let target, let value):
            return "Type '\(value)' + Enter in \(target)"
        case .select(let target, let option):
            return "Select '\(option)' from \(target)"
        case .wait(let seconds):
            return "Wait \(seconds) seconds"
        case .complete:
            return "Complete"
        }
    }
    
    // MARK: - Helper Methods
    private func addThought(_ content: String, type: AgentThoughtType) {
        DispatchQueue.main.async {
            let thought = AgentThought(content: content, type: type, timestamp: Date())
            self.thoughts.append(thought)
        }
    }
    
    private func shouldAdvancePhase(for action: AgentAction) -> Bool {
        switch (goalProgress.currentPhase, action) {
        case (.analysis, .navigate):
            return true // Navigate completes analysis phase
        case (.navigation, .type), (.navigation, .typeEnter):
            return true // Typing starts interaction phase
        case (.interaction, .click):
            return true // Clicking completes interaction phase
        case (.verification, .complete):
            return true // Complete finishes verification phase
        default:
            return false
        }
    }
    
    private func attemptRecovery(goal: String, webView: WKWebView) async {
        addThought("🔄 Attempting recovery from failure...", type: .reasoning)
        
        // Strategy 1: Try to refresh the page
        if goalProgress.completedSteps.isEmpty || goalProgress.confidence < 0.3 {
            addThought("🔄 Refreshing page to reset state...", type: .action)
            await navigate(to: await getCurrentURL(webView: webView), webView: webView)
            try? await Task.sleep(nanoseconds: 2_000_000_000) // Wait 2 seconds
        }
        
        // Strategy 2: Advance to next phase if stuck
        if goalProgress.currentPhase != .completion {
            goalProgress.advancePhase()
            addThought("🔄 Advanced to recovery phase: \(goalProgress.currentPhase)", type: .reasoning)
        }
        
        // Strategy 3: Reset retry counts for fresh attempt
        retryCount.removeAll()
        addThought("🔄 Reset retry counts for fresh attempt", type: .reasoning)
    }
}

// MARK: - Page Context
struct PageContext {
    let url: String
    let title: String
    let elements: [ElementContext]
}

struct ElementContext {
    let tagName: String
    let text: String
    let placeholder: String
    let ariaLabel: String
    let role: String
    let inputContext: String
    let className: String
    let position: (x: Int, y: Int)
    let isVisible: Bool
}

struct GoalProgress {
    var currentPhase: GoalPhase = .analysis
    var completedSteps: [String] = []
    var failedSteps: [String] = []
    var currentSubgoal: String = ""
    var confidence: Float = 0.0
    var lastSuccessfulAction: String = ""
    
    mutating func advancePhase() {
        switch currentPhase {
        case .analysis: currentPhase = .navigation
        case .navigation: currentPhase = .interaction
        case .interaction: currentPhase = .verification
        case .verification: currentPhase = .completion
        case .completion: break
        }
    }
    
    mutating func recordSuccess(_ action: String) {
        completedSteps.append(action)
        lastSuccessfulAction = action
        confidence = min(confidence + 0.1, 1.0)
    }
    
    mutating func recordFailure(_ action: String) {
        failedSteps.append(action)
        confidence = max(confidence - 0.2, 0.0)
    }
}

enum GoalPhase {
    case analysis
    case navigation
    case interaction
    case verification
    case completion
}

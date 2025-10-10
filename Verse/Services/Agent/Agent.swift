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
    private let elementFinder = ElementFinder()
    private let elementClicker = ElementClicker()
    private let elementTyper = ElementTyper()
    private var chatGPTService: ChatGPTService?
    
    // MARK: - State
    private var actionHistory: [String] = []
    private var completedSubgoals: [String] = []
    
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
        
        // Check if we need to navigate first
        await checkAndNavigate(goal: goal, webView: webView)
        
        // Main agent loop
        var iteration = 0
        let maxIterations = 50
        
        while isActive && iteration < maxIterations {
            iteration += 1
            
            await MainActor.run {
                self.currentStep = iteration
            }
            
            addThought("Step \(iteration)", type: .planning)
            
            // 1. Observe current page
            addThought("Analyzing page...", type: .observation)
            
            guard let pageContext = await pageAnalyzer.analyze(webView: webView) else {
                addThought("Could not analyze page", type: .verification)
                break
            }
            
            addThought("Current page: \(pageContext.title)", type: .observation)
            addThought("URL: \(pageContext.url)", type: .observation)
            
            // 2. Determine next action
            addThought("Planning next action...", type: .reasoning)
            
            guard let action = await determineNextAction(
                goal: goal,
                pageContext: pageContext,
                iteration: iteration
            ) else {
                addThought("Could not determine next action", type: .verification)
                break
            }
            
            // Check if goal is complete
            if case .complete = action {
                addThought("Goal achieved!", type: .completion)
                break
            }
            
            // 3. Execute action
            let success = await executeAction(action: action, webView: webView, pageContext: pageContext)
            
            if success {
                addThought("Action completed successfully", type: .verification)
                trackAction(action)
            } else {
                addThought("Action failed, will retry", type: .verification)
            }
            
            // Wait between actions
            try? await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds
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
                ]
                
                for pattern in patterns {
                    if goalLower.contains(pattern) || goalLower.hasPrefix(keyword) || goalLower.hasSuffix(keyword) {
                        return (name: site.name, domain: site.domain, url: site.url)
                    }
                }
            }
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
        You are a web automation agent. Complete this task: "\(goal)"
        
        **PROGRESS:**
        - Step: \(iteration) of 50
        - Actions: \(actionHistory.count)
        - Recent: \(historyText)
        - Completed: \(completedText)
        
        **CURRENT PAGE:**
        \(pageAnalyzer.formatForAI(pageContext))
        
        **AVAILABLE ACTIONS:**
        - NAVIGATE to URL
        - CLICK on button/link
        - TYPE text into input
        - TYPE_ENTER text + press Enter
        - SELECT option from dropdown
        - WAIT for page to load
        - COMPLETE if goal achieved
        
        **RULES:**
        - Navigate directly to websites, don't search on Google
        - Use TYPE_ENTER for search boxes and forms
        - Be specific about element targets
        - Check if goal is complete before continuing
        
        Respond ONLY in this format:
        ACTION: [NAVIGATE/CLICK/TYPE/TYPE_ENTER/SELECT/WAIT/COMPLETE]
        TARGET: [element text or URL]
        VALUE: [text to type or option to select]
        REASONING: [brief explanation]
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
            return await elementClicker.click(target: target, pageContext: pageContext, webView: webView)
        case .type(let target, let value):
            return await elementTyper.type(target: target, value: value, pageContext: pageContext, webView: webView, pressEnter: false)
        case .typeEnter(let target, let value):
            return await elementTyper.type(target: target, value: value, pageContext: pageContext, webView: webView, pressEnter: true)
        case .select(let target, let option):
            return await elementClicker.select(target: target, option: option, pageContext: pageContext, webView: webView)
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

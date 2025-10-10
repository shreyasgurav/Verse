//
//  BrowserViewModel.swift
//  Arc
//
//  Created by Shreyas Gurav on 09/10/25.
//

import Foundation
import WebKit
import SwiftUI
import Combine

class BrowserViewModel: NSObject, ObservableObject {
    @Published var tabs: [Tab] = []
    @Published var selectedTabId: UUID?
    @Published var urlString: String = ""
    @Published var currentURL: URL?
    @Published var isLoading: Bool = false
    @Published var canGoBack: Bool = false
    @Published var canGoForward: Bool = false
    @Published var estimatedProgress: Double = 0.0
    @Published var pageTitle: String = "Arc Browser"
    @Published var isFullscreen: Bool = false
    
    // Global services
    @Published var chatGPTService: ChatGPTService?
    @Published var configurationService = ConfigurationService()
    
    // Per-tab state management
    @Published var tabStates: [UUID: TabState] = [:]
    
    // Current tab's sidebar visibility
    var currentTabSidebarVisible: Bool {
        get {
            guard let selectedTabId = selectedTabId else { return false }
            return tabStates[selectedTabId]?.isSidebarVisible ?? false
        }
        set {
            guard let selectedTabId = selectedTabId else { return }
            if tabStates[selectedTabId] == nil {
                tabStates[selectedTabId] = TabState(tabId: selectedTabId)
            }
            tabStates[selectedTabId]?.isSidebarVisible = newValue
        }
    }
    
    // Store webviews for each tab
    private var webViews: [UUID: WKWebView] = [:]
    var webView: WKWebView? {
        guard let selectedTabId = selectedTabId else { return nil }
        return webViews[selectedTabId]
    }
    
    override init() {
        super.init()
        // Create initial tab
        let initialTab = Tab()
        tabs.append(initialTab)
        selectedTabId = initialTab.id
        
        // Create tab state for initial tab
        tabStates[initialTab.id] = TabState(tabId: initialTab.id)
    }
    
    // Tab management
    func createNewTab() {
        let newTab = Tab()
        tabs.append(newTab)
        
        // Create tab state for new tab
        tabStates[newTab.id] = TabState(tabId: newTab.id)
        
        selectTab(newTab.id)
    }
    
    func closeTab(_ tabId: UUID) {
        // Don't close if it's the last tab
        guard tabs.count > 1 else { return }
        
        // Remove webview for this tab
        webViews.removeValue(forKey: tabId)
        
        // Remove tab state for this tab
        tabStates.removeValue(forKey: tabId)
        
        // Find the index of the tab to close
        guard let index = tabs.firstIndex(where: { $0.id == tabId }) else { return }
        
        // If closing the selected tab, select another one
        if selectedTabId == tabId {
            if index > 0 {
                selectedTabId = tabs[index - 1].id
            } else if tabs.count > 1 {
                selectedTabId = tabs[index + 1].id
            }
        }
        
        tabs.remove(at: index)
    }
    
    func moveTab(from fromIndex: Int, to toIndex: Int) {
        guard fromIndex != toIndex,
              fromIndex >= 0 && fromIndex < tabs.count,
              toIndex >= 0 && toIndex < tabs.count else { return }
        
        let tab = tabs.remove(at: fromIndex)
        tabs.insert(tab, at: toIndex)
        
        print("📑 Moved tab from position \(fromIndex) to \(toIndex)")
    }
    
    func selectTab(_ tabId: UUID) {
        selectedTabId = tabId
        
        // Update UI state from selected tab
        if let tab = tabs.first(where: { $0.id == tabId }) {
            urlString = tab.url
            pageTitle = tab.title
            
            // Update webview-specific state
            if let webView = webViews[tabId] {
                canGoBack = webView.canGoBack
                canGoForward = webView.canGoForward
                isLoading = webView.isLoading
                estimatedProgress = webView.estimatedProgress
            }
        }
    }
    
    func registerWebView(_ webView: WKWebView, for tabId: UUID) {
        webViews[tabId] = webView
    }
    
    func updateTabTitle(_ title: String) {
        guard let selectedTabId = selectedTabId,
              let index = tabs.firstIndex(where: { $0.id == selectedTabId }) else { return }
        tabs[index].title = title.isEmpty ? "New Tab" : title
        pageTitle = tabs[index].title
    }
    
    func updateTabURL(_ url: String) {
        guard let selectedTabId = selectedTabId,
              let index = tabs.firstIndex(where: { $0.id == selectedTabId }) else { return }
        tabs[index].url = url
        urlString = url
    }
    
    func loadURL(_ urlString: String) {
        var finalURLString = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Check if it's a URL or a search query
        if finalURLString.isEmpty {
            return
        }
        
        // Detect if this is a URL or search query
        let isURL = isLikelyURL(finalURLString)
        
        if isURL {
            // It's a URL - add https:// if no protocol
            if !finalURLString.hasPrefix("http://") && !finalURLString.hasPrefix("https://") {
                finalURLString = "https://\(finalURLString)"
            }
        } else {
            // It's a search query
            let searchQuery = finalURLString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            finalURLString = "https://www.google.com/search?q=\(searchQuery)"
        }
        
        guard let url = URL(string: finalURLString) else {
            print("Invalid URL: \(finalURLString)")
            return
        }
        
        let request = URLRequest(url: url)
        webView?.load(request)
    }
    
    private func isLikelyURL(_ string: String) -> Bool {
        let trimmed = string.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Already has a protocol
        if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") || trimmed.contains("://") {
            return true
        }
        
        // Common TLDs that indicate a URL
        let commonTLDs = [
            ".com", ".org", ".net", ".edu", ".gov", ".co", ".io", ".ai", ".app",
            ".dev", ".tech", ".info", ".biz", ".me", ".us", ".uk", ".ca", ".au",
            ".de", ".fr", ".it", ".es", ".nl", ".ru", ".jp", ".cn", ".in", ".br"
        ]
        
        for tld in commonTLDs {
            if trimmed.hasSuffix(tld) || trimmed.contains("\(tld)/") || trimmed.contains("\(tld)?") {
                return true
            }
        }
        
        // Contains a dot and no spaces (likely a domain)
        if trimmed.contains(".") && !trimmed.contains(" ") {
            // Check if it looks like a domain: word.word format
            let parts = trimmed.split(separator: ".")
            if parts.count >= 2 && parts.allSatisfy({ !$0.isEmpty }) {
                // Likely a domain like github.com or askluca.co
                return true
            }
        }
        
        // Check for localhost or IP addresses
        if trimmed.hasPrefix("localhost") || trimmed.hasPrefix("127.0.0.1") || trimmed.hasPrefix("192.168.") {
            return true
        }
        
        // Contains multiple dots without spaces (likely a full domain)
        if trimmed.filter({ $0 == "." }).count >= 2 && !trimmed.contains(" ") {
            return true
        }
        
        return false
    }
    
    func goBack() {
        webView?.goBack()
    }
    
    func goForward() {
        webView?.goForward()
    }
    
    func reload() {
        webView?.reload()
    }
    
    func stopLoading() {
        webView?.stopLoading()
    }
    
    func loadHomePage() {
        loadURL("https://www.google.com")
    }
    
    // Fullscreen functionality
    func toggleFullscreen() {
        isFullscreen.toggle()
        print("🖥️ Fullscreen toggled: \(isFullscreen ? "ON" : "OFF")")
    }
    
    func exitFullscreen() {
        isFullscreen = false
        print("🎥 Exiting video fullscreen")
        
        // Also tell the web page to exit fullscreen
        if let webView = getCurrentWebView() {
            webView.evaluateJavaScript("document.exitFullscreen && document.exitFullscreen()") { _, error in
                if let error = error {
                    print("Error exiting fullscreen: \(error)")
                }
            }
        }
    }
    
    private func getCurrentWebView() -> WKWebView? {
        // This is a simplified way to get the current web view
        // In a real implementation, you'd need to track which web view is currently active
        return nil
    }
    
    // Per-tab AI Sidebar
    func toggleAISidebar() {
        guard let selectedTabId = selectedTabId else { return }
        
        // Ensure tab state exists
        if tabStates[selectedTabId] == nil {
            tabStates[selectedTabId] = TabState(tabId: selectedTabId)
        }
        
        // Toggle sidebar for this tab
        tabStates[selectedTabId]?.isSidebarVisible.toggle()
        
        let isVisible = tabStates[selectedTabId]?.isSidebarVisible ?? false
        print("🤖 Tab \(selectedTabId) sidebar toggled: \(isVisible ? "visible" : "hidden")")
        
        // Initialize services if needed
        if isVisible && chatGPTService == nil && configurationService.isAPIKeyConfigured {
            initializeChatGPTService()
        }
        
        // Initialize agent for this tab if needed
        if isVisible && tabStates[selectedTabId]?.agent == nil && chatGPTService != nil {
            initializeAgentForTab(selectedTabId)
        }
        
        // Force UI update
        objectWillChange.send()
    }
    
    func initializeAgentForTab(_ tabId: UUID) {
        guard let chatGPTService = chatGPTService else { return }
        
        if tabStates[tabId] == nil {
            tabStates[tabId] = TabState(tabId: tabId)
        }
        
        // Use clean, unified agent
        let agent = Agent()
        agent.setChatGPTService(chatGPTService)
        tabStates[tabId]?.agent = agent
        
        print("✅ Reliable Agent (Comet-style) initialized for tab \(tabId)")
    }
    
    func initializeChatGPTService() {
        guard !configurationService.chatGPTAPIKey.isEmpty else {
            print("❌ No API key configured")
            return
        }
        
        chatGPTService = ChatGPTService(apiKey: configurationService.chatGPTAPIKey)
        
        print("✅ ChatGPT service initialized")
        
        // Initialize agents for all existing tabs
        for tabId in tabStates.keys {
            initializeAgentForTab(tabId)
        }
    }
    
    func setChatGPTAPIKey(_ key: String) {
        configurationService.setAPIKey(key)
        if configurationService.isAPIKeyConfigured {
            initializeChatGPTService()
        } else {
            chatGPTService = nil
        }
    }
    
    // Web Scraping
    func scrapeCurrentPage(completion: @escaping (String?, Error?) -> Void) {
        guard let currentWebView = webView else {
            completion(nil, NSError(domain: "BrowserViewModel", code: 1, userInfo: [NSLocalizedDescriptionKey: "WebView not available"]))
            return
        }
        
        // Use PageAnalyzer instead of old webScrapingService
        Task {
            if let pageContext = await PageAnalyzer().analyze(webView: currentWebView) {
                let content = pageContext.title + "\n" + pageContext.url
                DispatchQueue.main.async {
                    completion(content, nil)
                }
            } else {
                DispatchQueue.main.async {
                    completion(nil, NSError(domain: "BrowserViewModel", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to analyze page"]))
                }
            }
        }
    }
}

// MARK: - WKNavigationDelegate
extension BrowserViewModel: WKNavigationDelegate, WKUIDelegate {
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        isLoading = true
        print("🔄 Started loading: \(webView.url?.absoluteString ?? "unknown")")
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isLoading = false
        currentURL = webView.url
        let urlStr = webView.url?.absoluteString ?? ""
        let title = webView.title ?? "Arc Browser"
        
        urlString = urlStr
        canGoBack = webView.canGoBack
        canGoForward = webView.canGoForward
        pageTitle = title
        
        // Update tab title and URL
        updateTabTitle(title)
        updateTabURL(urlStr)
        
        print("✅ Finished loading: \(urlStr)")
        print("   Title: \(title)")
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        isLoading = false
        print("❌ Navigation failed: \(error.localizedDescription)")
    }
    
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        isLoading = false
        print("❌ Provisional navigation failed: \(error.localizedDescription)")
    }
    
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        print("🔍 Navigation decision for: \(navigationAction.request.url?.absoluteString ?? "unknown")")
        decisionHandler(.allow)
    }
    
    // MARK: - WKUIDelegate for Fullscreen Support
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        return nil
    }
    
    // Handle fullscreen requests from websites (like YouTube)
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        completionHandler()
    }
    
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        completionHandler(true)
    }
    
    // Handle fullscreen video requests
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        completionHandler(defaultText)
    }
    
    // Handle fullscreen API requests from websites
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.grant)
    }
    
    
    // Handle fullscreen API requests
    func webView(_ webView: WKWebView, didEnterFullscreenWithPlaceholderView placeholderView: NSView) {
        print("🖥️ WebView entered fullscreen")
        DispatchQueue.main.async {
            self.isFullscreen = true
        }
    }
    
    func webView(_ webView: WKWebView, didExitFullscreenWithPlaceholderView placeholderView: NSView) {
        print("🖥️ WebView exited fullscreen")
        DispatchQueue.main.async {
            self.isFullscreen = false
        }
    }
}


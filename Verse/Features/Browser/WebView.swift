//
//  WebView.swift
//  Arc
//
//  Created by Shreyas Gurav on 09/10/25.
//

import SwiftUI
import WebKit

struct WebView: NSViewRepresentable {
    @ObservedObject var viewModel: BrowserViewModel
    let tabId: UUID
    
    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        
        // Enable web features
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = viewModel
        webView.uiDelegate = viewModel
        webView.allowsBackForwardNavigationGestures = true
        webView.allowsMagnification = true
        
        // Set autoresizing mask to ensure proper layout
        webView.autoresizingMask = [.width, .height]
        
        // Set modern user agent to avoid "browser not supported" warnings
        webView.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15 Arc/1.0"
        
        // Store webView reference in coordinator
        context.coordinator.webView = webView
        
        // Add observers for progress
        webView.addObserver(context.coordinator, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)
        webView.addObserver(context.coordinator, forKeyPath: #keyPath(WKWebView.canGoBack), options: .new, context: nil)
        webView.addObserver(context.coordinator, forKeyPath: #keyPath(WKWebView.canGoForward), options: .new, context: nil)
        
        // Register webView for this tab
        viewModel.registerWebView(webView, for: tabId)
        
        // Only load if this is a new webview (doesn't have a URL yet)
        if webView.url == nil {
            if let tab = viewModel.tabs.first(where: { $0.id == tabId }),
               let url = URL(string: tab.url) {
                let request = URLRequest(url: url)
                webView.load(request)
                print("🌐 Loading tab \(tab.title): \(url.absoluteString)")
            }
        }
        
        return webView
    }
    
    func updateNSView(_ nsView: WKWebView, context: Context) {
        // Updates handled by ViewModel
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(viewModel: viewModel)
    }
    
    class Coordinator: NSObject {
        var viewModel: BrowserViewModel
        weak var webView: WKWebView?
        
        init(viewModel: BrowserViewModel) {
            self.viewModel = viewModel
        }
        
        override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
            guard let webView = object as? WKWebView else { return }
            
            if keyPath == #keyPath(WKWebView.estimatedProgress) {
                viewModel.estimatedProgress = webView.estimatedProgress
            } else if keyPath == #keyPath(WKWebView.canGoBack) {
                viewModel.canGoBack = webView.canGoBack
            } else if keyPath == #keyPath(WKWebView.canGoForward) {
                viewModel.canGoForward = webView.canGoForward
            }
        }
        
        deinit {
            webView?.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
            webView?.removeObserver(self, forKeyPath: #keyPath(WKWebView.canGoBack))
            webView?.removeObserver(self, forKeyPath: #keyPath(WKWebView.canGoForward))
        }
    }
}


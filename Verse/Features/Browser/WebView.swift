//
//  WebView.swift
//  Arc
//
//  Created by Shreyas Gurav on 09/10/25.
//

import SwiftUI
import WebKit

class FullscreenMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var viewModel: BrowserViewModel?
    
    init(viewModel: BrowserViewModel) {
        self.viewModel = viewModel
        super.init()
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else {
            return
        }
        
        DispatchQueue.main.async {
            switch action {
            case "enterFullscreen":
                print("🎥 Video entering fullscreen")
                self.viewModel?.isFullscreen = true
            case "exitFullscreen":
                print("🎥 Video exiting fullscreen")
                self.viewModel?.isFullscreen = false
            default:
                break
            }
        }
    }
}

struct WebView: NSViewRepresentable {
    @ObservedObject var viewModel: BrowserViewModel
    let tabId: UUID
    
    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        
        // Enable web features
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        
        // Enable fullscreen support
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.allowsAirPlayForMediaPlayback = true
        
        // Enable fullscreen API support for videos
        if #available(macOS 11.0, *) {
            configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        }
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = viewModel
        webView.uiDelegate = viewModel
        webView.allowsBackForwardNavigationGestures = true
        webView.allowsMagnification = true
        
        // Set autoresizing mask to ensure proper layout
        webView.autoresizingMask = [.width, .height]
        
        // Set modern user agent to avoid "browser not supported" warnings
        webView.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15 Verse/1.0"
        
        // Configure for dark theme
        webView.isInspectable = false
        webView.allowsLinkPreview = true
        
        // Set dark theme preferences
        if #available(macOS 14.0, *) {
            webView.underPageBackgroundColor = NSColor.controlBackgroundColor
        }
        
        // Request websites to use dark mode
        webView.pageZoom = 1.0
        
        // Inject CSS to force dark mode preference
        let darkModeScript = WKUserScript(
            source: """
            // Set CSS color-scheme to dark
            document.documentElement.style.colorScheme = 'dark';
            
            // Add meta tag for dark mode preference
            let meta = document.createElement('meta');
            meta.name = 'color-scheme';
            meta.content = 'dark';
            document.head.appendChild(meta);
            
            // Set prefers-color-scheme to dark
            let style = document.createElement('style');
            style.textContent = `
                :root { color-scheme: dark; }
                html { color-scheme: dark; }
            `;
            document.head.appendChild(style);
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        configuration.userContentController.addUserScript(darkModeScript)
        
        // Inject fullscreen API support
        let fullscreenScript = WKUserScript(
            source: """
            // Enable fullscreen API support
            document.fullscreenEnabled = true;
            
            // Store original webkitEnterFullscreen method
            const originalWebkitEnterFullscreen = HTMLVideoElement.prototype.webkitEnterFullscreen;
            const originalWebkitExitFullscreen = HTMLVideoElement.prototype.webkitExitFullscreen;
            
            // Override video fullscreen methods to work with our browser
            HTMLVideoElement.prototype.webkitEnterFullscreen = function() {
                console.log('🎥 Video requesting fullscreen');
                // Send message to native code to show fullscreen overlay
                window.webkit.messageHandlers.fullscreenHandler.postMessage({
                    action: 'enterFullscreen',
                    element: 'video'
                });
                
                // Let the video go fullscreen naturally
                if (originalWebkitEnterFullscreen) {
                    return originalWebkitEnterFullscreen.call(this);
                }
            };
            
            HTMLVideoElement.prototype.webkitExitFullscreen = function() {
                console.log('🎥 Video requesting exit fullscreen');
                // Send message to native code to hide fullscreen overlay
                window.webkit.messageHandlers.fullscreenHandler.postMessage({
                    action: 'exitFullscreen'
                });
                
                // Let the video exit fullscreen naturally
                if (originalWebkitExitFullscreen) {
                    return originalWebkitExitFullscreen.call(this);
                }
            };
            
            // Override standard fullscreen API for videos
            if (!document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen = function() {
                    window.webkit.messageHandlers.fullscreenHandler.postMessage({
                        action: 'enterFullscreen',
                        element: 'document'
                    });
                    return Promise.resolve();
                };
            }
            
            if (!document.exitFullscreen) {
                document.exitFullscreen = function() {
                    window.webkit.messageHandlers.fullscreenHandler.postMessage({
                        action: 'exitFullscreen'
                    });
                    return Promise.resolve();
                };
            }
            
            // Listen for fullscreen changes to sync with our overlay
            document.addEventListener('webkitfullscreenchange', function() {
                if (document.webkitFullscreenElement) {
                    console.log('🎥 Video entered fullscreen');
                    window.webkit.messageHandlers.fullscreenHandler.postMessage({
                        action: 'enterFullscreen',
                        element: 'video'
                    });
                } else {
                    console.log('🎥 Video exited fullscreen');
                    window.webkit.messageHandlers.fullscreenHandler.postMessage({
                        action: 'exitFullscreen'
                    });
                }
            });
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        configuration.userContentController.addUserScript(fullscreenScript)
        
        // Add message handler for fullscreen requests
        let messageHandler = FullscreenMessageHandler(viewModel: viewModel)
        configuration.userContentController.add(messageHandler, name: "fullscreenHandler")
        
        // Store webView reference in coordinator
        context.coordinator.webView = webView
        context.coordinator.messageHandler = messageHandler
        
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
        var messageHandler: FullscreenMessageHandler?
        
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
            
            // Remove message handler
            if let messageHandler = messageHandler {
                webView?.configuration.userContentController.removeScriptMessageHandler(forName: "fullscreenHandler")
            }
        }
    }
}


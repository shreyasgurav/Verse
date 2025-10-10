//
//  BrowserView.swift
//  Arc
//
//  Created by Shreyas Gurav on 09/10/25.
//

import SwiftUI
import AppKit

struct BrowserView: View {
    @StateObject private var viewModel = BrowserViewModel()
    @State private var addressBarText: String = ""
    @FocusState private var isAddressBarFocused: Bool
    @State private var isBackButtonHovered = false
    @State private var isForwardButtonHovered = false
        @State private var isRefreshButtonHovered = false
        @State private var isAssistantButtonHovered = false
        @State private var isFullscreenButtonHovered = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Navigation Toolbar (hide in fullscreen)
            if !viewModel.isFullscreen {
                navigationToolbar
            }
            
            // Progress Bar (hide in fullscreen)
            if viewModel.isLoading && !viewModel.isFullscreen {
                ProgressView(value: viewModel.estimatedProgress)
                    .progressViewStyle(.linear)
                    .frame(height: 2)
            }
            
            // Main Content Area
            HStack(spacing: 0) {
                // Web Content - show all WebViews but only display the selected one
                ZStack {
                    ForEach(viewModel.tabs) { tab in
                        WebView(viewModel: viewModel, tabId: tab.id)
                            .opacity(viewModel.selectedTabId == tab.id ? 1 : 0)
                            .zIndex(viewModel.selectedTabId == tab.id ? 1 : 0)
                    }
                }
                
                // AI Chat Sidebar (per-tab) - hide in fullscreen
                if viewModel.currentTabSidebarVisible && !viewModel.isFullscreen, let selectedTabId = viewModel.selectedTabId {
                    UnifiedChatSidebar(viewModel: viewModel, tabId: selectedTabId)
                        .overlay(
                            Rectangle()
                                .fill(Color.secondary.opacity(0.2))
                                .frame(width: 0.5)
                                .frame(maxHeight: .infinity),
                            alignment: .leading
                        )
                        .transition(.asymmetric(
                            insertion: .move(edge: .trailing).combined(with: .opacity),
                            removal: .move(edge: .trailing).combined(with: .opacity)
                        ))
                }
            }
            .animation(.easeInOut(duration: 0.3), value: viewModel.currentTabSidebarVisible)
            
            // Fullscreen overlay with exit button (when video is fullscreen)
            if viewModel.isFullscreen {
                VStack {
                    HStack {
                        Spacer()
                        Button(action: { viewModel.exitFullscreen() }) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.white)
                                .background(
                                    Circle()
                                        .fill(Color.black.opacity(0.7))
                                        .frame(width: 40, height: 40)
                                )
                        }
                        .buttonStyle(.plain)
                        .help("Exit Fullscreen (Esc)")
                        .padding(.top, 30)
                        .padding(.trailing, 30)
                    }
                    Spacer()
                }
                .background(Color.clear)
                .allowsHitTesting(true)
                .onHover { hovering in
                    // Show/hide exit button on hover
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(NSColor.controlBackgroundColor))
        .onAppear {
            // Set initial address bar text
            addressBarText = formatDisplayURL(viewModel.urlString)
        }
        .onChange(of: viewModel.selectedTabId) { oldValue, newValue in
            // Update address bar when tab changes
            addressBarText = formatDisplayURL(viewModel.urlString)
        }
        // Keyboard shortcuts
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("NewTab"))) { _ in
            viewModel.createNewTab()
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("CloseTab"))) { _ in
            if let selectedTabId = viewModel.selectedTabId {
                viewModel.closeTab(selectedTabId)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("ToggleFullscreen"))) { _ in
            viewModel.toggleFullscreen()
        }
        .onKeyPress(.escape) {
            if viewModel.isFullscreen {
                viewModel.exitFullscreen()
                return .handled
            }
            return .ignored
        }
        .onChange(of: viewModel.isFullscreen) { _, isFullscreen in
            // This will be handled by the WebView's fullscreen delegate methods
            print("🖥️ Fullscreen state changed: \(isFullscreen)")
        }
        // Add tab bar to title bar
        .toolbar {
            ToolbarItem(placement: .navigation) {
                TabBar(viewModel: viewModel)
            }
        }
    }
    
    private var navigationToolbar: some View {
        HStack(spacing: 6) {
            // Back Button
            Button(action: { viewModel.goBack() }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .medium))
                    .frame(width: 24, height: 24)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .disabled(!viewModel.canGoBack)
            .opacity(viewModel.canGoBack ? 1.0 : 0.3)
            .help("Go Back")
            .padding(.horizontal, 5)
            .padding(.vertical, 3)
            .background(
                Circle()
                    .fill(isBackButtonHovered ? Color.secondary.opacity(0.15) : Color.clear)
            )
            .onHover { hovering in
                withAnimation(.easeInOut(duration: 0.2)) {
                    isBackButtonHovered = hovering
                }
            }
            
            // Forward Button
            Button(action: { viewModel.goForward() }) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .medium))
                    .frame(width: 24, height: 24)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .disabled(!viewModel.canGoForward)
            .opacity(viewModel.canGoForward ? 1.0 : 0.3)
            .help("Go Forward")
            .padding(.horizontal, 5)
            .padding(.vertical, 3)
            .background(
                Circle()
                    .fill(isForwardButtonHovered ? Color.secondary.opacity(0.15) : Color.clear)
            )
            .onHover { hovering in
                withAnimation(.easeInOut(duration: 0.2)) {
                    isForwardButtonHovered = hovering
                }
            }
            
            // Reload Button
            Button(action: {
                if viewModel.isLoading {
                    viewModel.stopLoading()
                } else {
                    viewModel.reload()
                }
            }) {
                Image(systemName: viewModel.isLoading ? "xmark" : "arrow.clockwise")
                    .font(.system(size: 14, weight: .medium))
                    .frame(width: 24, height: 24)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .help(viewModel.isLoading ? "Stop loading" : "Reload page")
            .padding(.horizontal, 5)
            .padding(.vertical, 3)
            .background(
                Circle()
                    .fill(isRefreshButtonHovered ? Color.secondary.opacity(0.15) : Color.clear)
            )
            .onHover { hovering in
                withAnimation(.easeInOut(duration: 0.2)) {
                    isRefreshButtonHovered = hovering
                }
            }
            
            // Enhanced Address Bar
            HStack(spacing: 0) {
                // Search icon with background
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(isAddressBarFocused ? .accentColor : .secondary)
                        .font(.system(size: 12, weight: .medium))
                        .animation(.easeInOut(duration: 0.2), value: isAddressBarFocused)
                    
                    TextField("Search Google or enter website", text: $addressBarText)
                        .textFieldStyle(.plain)
                        .font(.system(size: 13, weight: .regular))
                        .focused($isAddressBarFocused)
                        .onSubmit {
                            viewModel.loadURL(addressBarText)
                        }
                        .onChange(of: viewModel.urlString) { oldValue, newValue in
                            if !isAddressBarFocused {
                                addressBarText = formatDisplayURL(newValue)
                            }
                        }
                        .onAppear {
                            addressBarText = formatDisplayURL(viewModel.urlString)
                        }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                
                // Right side controls
                HStack(spacing: 4) {
                    // Clear button
                    if !addressBarText.isEmpty {
                        Button(action: {
                            addressBarText = ""
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                                .frame(width: 16, height: 16)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .help("Clear")
                        .transition(.scale.combined(with: .opacity))
                    }
                }
                .padding(.trailing, 8)
            }
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(NSColor.windowBackgroundColor))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(
                                Color.secondary.opacity(isAddressBarFocused ? 0.6 : 0.3),
                                lineWidth: 1
                            )
                    )
            )
            .animation(.easeInOut(duration: 0.2), value: isAddressBarFocused)
            
                    // AI Chat Toggle Button
                    Button(action: { viewModel.toggleAISidebar() }) {
                        Text("Assistant")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.primary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .contentShape(RoundedRectangle(cornerRadius: 16))
                    }
                    .buttonStyle(.plain)
                    .help("Toggle AI Assistant")
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(isAssistantButtonHovered || viewModel.currentTabSidebarVisible ? Color.secondary.opacity(0.15) : Color.clear)
                )
                        .onHover { hovering in
                            withAnimation(.easeInOut(duration: 0.2)) {
                                isAssistantButtonHovered = hovering
                            }
                        }
            
            // Fullscreen Toggle Button
            Button(action: { viewModel.toggleFullscreen() }) {
                Image(systemName: viewModel.isFullscreen ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right")
                    .font(.system(size: 14, weight: .medium))
                    .frame(width: 24, height: 24)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .help(viewModel.isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen (⌘⌃F)")
            .padding(.horizontal, 5)
            .padding(.vertical, 3)
            .background(
                Circle()
                    .fill(isFullscreenButtonHovered ? Color.secondary.opacity(0.15) : Color.clear)
            )
            .onHover { hovering in
                withAnimation(.easeInOut(duration: 0.2)) {
                    isFullscreenButtonHovered = hovering
                }
            }
                }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color(NSColor.controlBackgroundColor))
        .overlay(
            Divider()
                .frame(maxWidth: .infinity, maxHeight: 1)
                .background(Color.secondary.opacity(0.3)),
            alignment: .bottom
        )
    }
    
    private func formatDisplayURL(_ urlString: String) -> String {
        // Validate URL
        guard URL(string: urlString) != nil else {
            return urlString
        }
        
        // Show clean URL without https://
        var displayString = urlString
        if displayString.hasPrefix("https://") {
            displayString = String(displayString.dropFirst(8))
        } else if displayString.hasPrefix("http://") {
            displayString = String(displayString.dropFirst(7))
        }
        
        // Remove www. for cleaner look
        if displayString.hasPrefix("www.") {
            displayString = String(displayString.dropFirst(4))
        }
        
        return displayString
    }
}

#Preview {
    BrowserView()
        .frame(width: 1200, height: 800)
}


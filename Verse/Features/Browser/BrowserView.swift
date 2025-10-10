//
//  BrowserView.swift
//  Arc
//
//  Created by Shreyas Gurav on 09/10/25.
//

import SwiftUI

struct BrowserView: View {
    @StateObject private var viewModel = BrowserViewModel()
    @State private var addressBarText: String = ""
    @FocusState private var isAddressBarFocused: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            // Navigation Toolbar (now at the top)
            navigationToolbar
            
            // Progress Bar
            if viewModel.isLoading {
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
                        
                        // AI Chat Sidebar (per-tab)
                        if viewModel.currentTabSidebarVisible, let selectedTabId = viewModel.selectedTabId {
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
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(NSColor.windowBackgroundColor))
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
        // Add tab bar to title bar
        .toolbar {
            ToolbarItem(placement: .navigation) {
                TabBar(viewModel: viewModel)
            }
        }
    }
    
    private var navigationToolbar: some View {
        HStack(spacing: 12) {
            // Back Button
            Button(action: { viewModel.goBack() }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .medium))
                    .frame(width: 24, height: 24)
            }
            .buttonStyle(.plain)
            .disabled(!viewModel.canGoBack)
            .opacity(viewModel.canGoBack ? 1.0 : 0.3)
            .help("Go Back")
            
            // Forward Button
            Button(action: { viewModel.goForward() }) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .medium))
                    .frame(width: 24, height: 24)
            }
            .buttonStyle(.plain)
            .disabled(!viewModel.canGoForward)
            .opacity(viewModel.canGoForward ? 1.0 : 0.3)
            .help("Go Forward")
            
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
            }
            .buttonStyle(.plain)
            .help(viewModel.isLoading ? "Stop loading" : "Reload page")
            
            // Enhanced Address Bar
            HStack(spacing: 0) {
                // Search icon with background
                HStack(spacing: 8) {
                    Image(systemName: isAddressBarFocused ? "globe" : "magnifyingglass")
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
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(NSColor.controlBackgroundColor))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(
                                isAddressBarFocused ? Color.accentColor.opacity(0.5) : Color.secondary.opacity(0.15),
                                lineWidth: isAddressBarFocused ? 2 : 1
                            )
                    )
            )
            .animation(.easeInOut(duration: 0.2), value: isAddressBarFocused)
            .scaleEffect(isAddressBarFocused ? 1.02 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isAddressBarFocused)
            
                    // AI Chat Toggle Button
                    Button(action: { viewModel.toggleAISidebar() }) {
                        Text("Assistant")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(viewModel.currentTabSidebarVisible ? .accentColor : .primary)
                    }
                    .buttonStyle(.plain)
                    .help("Toggle AI Assistant")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color(NSColor.windowBackgroundColor))
        .overlay(
            Divider()
                .frame(maxWidth: .infinity, maxHeight: 1)
                .background(Color.secondary.opacity(0.2)),
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


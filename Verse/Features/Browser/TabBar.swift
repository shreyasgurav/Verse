//
//  TabBar.swift
//  Arc
//
//  Created by Shreyas Gurav on 09/10/25.
//

import SwiftUI

struct TabBar: View {
    @ObservedObject var viewModel: BrowserViewModel
    
    var body: some View {
        HStack(spacing: 0) {
            // Tab items with proper scrolling
            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 2) {
                        ForEach(viewModel.tabs) { tab in
                            TabItem(
                                tab: tab,
                                isSelected: viewModel.selectedTabId == tab.id,
                                onSelect: { 
                                    viewModel.selectTab(tab.id)
                                    // Auto-scroll to selected tab
                                    withAnimation(.easeInOut(duration: 0.2)) {
                                        proxy.scrollTo(tab.id, anchor: .center)
                                    }
                                },
                                onClose: { viewModel.closeTab(tab.id) },
                                onMove: { fromIndex, toIndex in
                                    viewModel.moveTab(from: fromIndex, to: toIndex)
                                }
                            )
                            .id(tab.id)
                        }
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                }
                .onChange(of: viewModel.selectedTabId) { _, newTabId in
                    if let newTabId = newTabId {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            proxy.scrollTo(newTabId, anchor: .center)
                        }
                    }
                }
            }
            
            // New tab button
            Button(action: { viewModel.createNewTab() }) {
                Image(systemName: "plus")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.secondary)
                    .frame(width: 26, height: 26)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .help("New Tab (⌘T)")
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
        }
        .frame(height: 32)
    }
}

struct TabItem: View {
    let tab: Tab
    let isSelected: Bool
    let onSelect: () -> Void
    let onClose: () -> Void
    let onMove: (Int, Int) -> Void
    
    @State private var isHovering = false
    
    var body: some View {
        HStack(spacing: 6) {
            // Favicon placeholder
            Image(systemName: "globe")
                .font(.system(size: 11))
                .foregroundColor(.secondary)
                .frame(width: 14, height: 14)
            
            // Tab title
            Text(tab.title)
                .font(.system(size: 12))
                .lineLimit(1)
                .foregroundColor(isSelected ? .primary : .secondary)
            
            Spacer(minLength: 4)
            
            // Close button
            if isHovering || isSelected {
                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(.secondary)
                        .frame(width: 16, height: 16)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .help("Close Tab")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .frame(minWidth: 120, maxWidth: 200)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(isSelected ? Color(NSColor.windowBackgroundColor) : Color(NSColor.controlBackgroundColor).opacity(0.4))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(
                            isSelected ? Color.accentColor.opacity(0.3) : Color.clear,
                            lineWidth: isSelected ? 1 : 0
                        )
                )
                .shadow(
                    color: isSelected ? Color.black.opacity(0.1) : Color.clear,
                    radius: isSelected ? 2 : 0,
                    x: 0,
                    y: isSelected ? 1 : 0
                )
        )
        .contentShape(Rectangle())
        .onTapGesture {
            onSelect()
        }
        .onHover { hovering in
            isHovering = hovering
        }
    }
}

#Preview {
    TabBar(viewModel: BrowserViewModel())
        .frame(width: 800)
}


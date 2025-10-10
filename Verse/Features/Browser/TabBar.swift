//
//  TabBar.swift
//  Arc
//
//  Created by Shreyas Gurav on 09/10/25.
//

import SwiftUI

struct TabBar: View {
    @ObservedObject var viewModel: BrowserViewModel
    @State private var isPlusButtonHovered = false
    
    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    // Each tab as completely separate element
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
                    
                    // New tab button (positioned last/right) - completely separate
                    Button(action: { viewModel.createNewTab() }) {
                        Image(systemName: "plus")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.secondary)
                            .frame(width: 26, height: 26)
                            .contentShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .help("New Tab (⌘T)")
                    .padding(.horizontal, 3)
                    .padding(.vertical, 1)
                    .background(
                        Circle()
                            .fill(isPlusButtonHovered ? Color.secondary.opacity(0.15) : Color.clear)
                    )
                    .onHover { hovering in
                        withAnimation(.easeInOut(duration: 0.2)) {
                            isPlusButtonHovered = hovering
                        }
                    }
                    .id("newTabButton")
                }
                .padding(.horizontal, 4)
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
                .foregroundColor(isSelected ? .primary : .secondary)
                .frame(width: 14, height: 14)
            
            // Tab title
            Text(tab.title)
                .font(.system(size: 12, weight: isSelected ? .medium : .regular))
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
            RoundedRectangle(cornerRadius: 16)
                .fill(isSelected ? Color.accentColor.opacity(0.15) : (isHovering ? Color.secondary.opacity(0.1) : Color.clear))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(isSelected ? Color.accentColor.opacity(0.08) : Color.clear)
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


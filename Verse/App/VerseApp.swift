//
//  ArcApp.swift
//  Arc
//
//  Created by Shreyas Gurav on 09/10/25.
//

import SwiftUI

@main
struct VerseApp: App {
    var body: some Scene {
        WindowGroup {
            BrowserView()
                .frame(minWidth: 800, minHeight: 600)
                .preferredColorScheme(.dark)
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified(showsTitle: false))
        .defaultSize(width: 1200, height: 800)
        .commands {
            CommandGroup(after: .newItem) {
                Button("New Tab") {
                    // Will be handled by BrowserView
                }
                .keyboardShortcut("t", modifiers: .command)
                
                Button("Close Tab") {
                    // Will be handled by BrowserView
                }
                .keyboardShortcut("w", modifiers: .command)
            }
        }
    }
}

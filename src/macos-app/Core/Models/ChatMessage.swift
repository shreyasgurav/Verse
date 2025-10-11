//
//  ChatMessage.swift
//  Arc
//
//  Shared chat message model
//

import Foundation

struct ChatMessage: Identifiable, Equatable {
    let id = UUID()
    let content: String
    let isFromUser: Bool
    let timestamp = Date()
}


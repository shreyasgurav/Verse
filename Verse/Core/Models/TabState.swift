//
//  TabState.swift
//  Arc
//
//  Tab-specific state including sidebar and agent
//

import Foundation
import Combine

class TabState: ObservableObject {
    let tabId: UUID
    
    // Sidebar state
    @Published var isSidebarVisible: Bool = false
    @Published var messages: [UnifiedMessage] = []
    @Published var isTyping: Bool = false
    
    // Agent state
    @Published var agent: Agent?
    @Published var isAgentActive: Bool = false
    
    init(tabId: UUID) {
        self.tabId = tabId
    }
}

// Unified message that handles both chat and agent thoughts
struct UnifiedMessage: Identifiable, Equatable {
    let id = UUID()
    let content: String
    let type: MessageType
    let timestamp = Date()
    
    enum MessageType: Equatable {
        case userMessage
        case aiResponse
        case agentThinking
        case agentPlanning
        case agentObservation
        case agentAction
        case agentVerification
        case agentCompletion
        case error
    }
    
    var isAgentMessage: Bool {
        switch type {
        case .agentThinking, .agentPlanning, .agentObservation, 
             .agentAction, .agentVerification, .agentCompletion:
            return true
        default:
            return false
        }
    }
    
    var iconName: String {
        switch type {
        case .userMessage:
            return "person.circle.fill"
        case .aiResponse:
            return "sparkles"
        case .agentThinking:
            return "brain.head.profile"
        case .agentPlanning:
            return "list.bullet.clipboard"
        case .agentObservation:
            return "eye"
        case .agentAction:
            return "hand.tap"
        case .agentVerification:
            return "checkmark.circle"
        case .agentCompletion:
            return "flag.checkered"
        case .error:
            return "exclamationmark.triangle"
        }
    }
    
    var iconColor: String {
        switch type {
        case .userMessage:
            return "blue"
        case .aiResponse:
            return "purple"
        case .agentThinking:
            return "purple"
        case .agentPlanning:
            return "blue"
        case .agentObservation:
            return "green"
        case .agentAction:
            return "orange"
        case .agentVerification:
            return "green"
        case .agentCompletion:
            return "blue"
        case .error:
            return "red"
        }
    }
}


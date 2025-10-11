//
//  AgentMessage.swift
//  Arc
//
//  Created by Shreyas Gurav on 09/10/25.
//

import Foundation

// Enhanced message model for agentic browser
struct AgentMessage: Identifiable, Equatable {
    let id = UUID()
    let content: String
    let type: MessageType
    let timestamp = Date()
    
    enum MessageType: Equatable {
        case userMessage           // User's input
        case aiResponse            // AI's text response
        case agentThinking         // Chain-of-thought reasoning
        case agentPlanning         // Task breakdown
        case agentObservation      // What the agent sees on the page
        case agentAction           // Action being taken
        case agentSuccess          // Successful action
        case agentError            // Error message
        case systemInfo            // System information
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
        case .agentSuccess:
            return "checkmark.circle.fill"
        case .agentError:
            return "exclamationmark.triangle.fill"
        case .systemInfo:
            return "info.circle"
        }
    }
    
    var backgroundColor: String {
        switch type {
        case .userMessage:
            return "accentColor"
        case .aiResponse:
            return "secondary"
        case .agentThinking:
            return "purple"
        case .agentPlanning:
            return "blue"
        case .agentObservation:
            return "green"
        case .agentAction:
            return "orange"
        case .agentSuccess:
            return "green"
        case .agentError:
            return "red"
        case .systemInfo:
            return "gray"
        }
    }
}


//
//  UnifiedChatSidebar.swift
//  Arc
//
//  Unified chat sidebar like Cursor - intelligently decides when to act
//

import SwiftUI
import WebKit
import Combine

struct UnifiedChatSidebar: View {
    @ObservedObject var viewModel: BrowserViewModel
    let tabId: UUID
    
    @State private var currentMessage: String = ""
    @State private var showingAPIKeyPrompt: Bool = false
    @FocusState private var isInputFocused: Bool
    
    // Force refresh when messages change
    @State private var refreshID = UUID()
    
    // Task cancellation
    @State private var currentTask: Task<Void, Never>?
    @State private var isGenerating: Bool = false
    
    private var tabState: TabState? {
        viewModel.tabStates[tabId]
    }
    
    private var messages: [UnifiedMessage] {
        tabState?.messages ?? []
    }
    
    private var agent: Agent? {
        tabState?.agent
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Minimal Header
            HStack {
                Spacer()
                
                // Agent status indicator
                if agent?.isActive == true {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 6, height: 6)
                        
                        Text("Agent Active")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.green)
                    }
                }
                
                Button(action: { viewModel.toggleAISidebar() }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.secondary)
                        .frame(width: 16, height: 16)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            
            // Messages Area
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 6) {
                        if messages.isEmpty {
                            // Empty state - no welcome message
                            EmptyView()
                        } else {
                            ForEach(Array(messages.enumerated()), id: \.element.id) { index, message in
                                UnifiedMessageView(
                                    message: message,
                                    isLatestMessage: message.isAgentMessage && index == messages.count - 1
                                )
                                .id(message.id)
                            }
                        }
                        
                        if tabState?.isTyping == true {
                            TypingIndicatorView()
                                .id("typing")
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.top, 8)
                }
                .id(refreshID) // Force refresh when messages change
                .onChange(of: messages.count) { _, _ in
                    if let lastMessage = messages.last {
                        withAnimation(.easeOut(duration: 0.2)) {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }
            
            // Input Area
            HStack(spacing: 10) {
                TextField("Type your message...", text: $currentMessage, axis: .vertical)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color(NSColor.windowBackgroundColor).opacity(0.8))
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Color.secondary.opacity(isInputFocused ? 0.6 : 0.3), lineWidth: 0.5)
                            )
                    )
                    .focused($isInputFocused)
                    .lineLimit(1...5)
                    .disabled(isGenerating || agent?.isActive == true)
                    .onSubmit {
                        if isGenerating || agent?.isActive == true {
                            stopGeneration()
                        } else {
                            sendMessage()
                        }
                    }
                
                Button(action: {
                    if isGenerating || agent?.isActive == true {
                        stopGeneration()
                    } else {
                        sendMessage()
                    }
                }) {
                    Image(systemName: (isGenerating || agent?.isActive == true) ? "stop.circle.fill" : "arrow.up.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor((isGenerating || agent?.isActive == true) ? .red : (currentMessage.isEmpty ? .secondary : .accentColor))
                }
                .buttonStyle(.plain)
                .disabled(currentMessage.isEmpty && !isGenerating && agent?.isActive != true)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 12)
            .animation(.easeInOut(duration: 0.2), value: isGenerating)
            .animation(.easeInOut(duration: 0.2), value: agent?.isActive)
        }
        .frame(width: 320)
        .background(Color(NSColor.controlBackgroundColor))
        .sheet(isPresented: $showingAPIKeyPrompt) {
            APIKeyConfigurationView(viewModel: viewModel)
        }
    }
    
    // MARK: - Message Handling
    
    private func stopGeneration() {
        // Cancel current task
        currentTask?.cancel()
        currentTask = nil
        
        // Stop reliable agent if active
        if let agent = agent, agent.isActive {
            agent.stop()
        }
        
        // Reset states
        isGenerating = false
        setTyping(false)
        
        // Add stopped message
        addMessage(UnifiedMessage(content: "⏸️ Stopped by user", type: .error))
    }
    
    private func sendMessage() {
        guard !currentMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        guard viewModel.configurationService.isAPIKeyConfigured else {
            showingAPIKeyPrompt = true
            return
        }
        
        let userMessage = UnifiedMessage(content: currentMessage, type: .userMessage)
        addMessage(userMessage)
        
        let messageToSend = currentMessage
        currentMessage = ""
        isInputFocused = false
        
        // Process message - AI decides if it's an action or chat
        isGenerating = true
        currentTask = Task {
            await processMessage(messageToSend)
            isGenerating = false
        }
    }
    
    private func processMessage(_ message: String) async {
        // Check if task was cancelled
        guard !Task.isCancelled else {
            setTyping(false)
            return
        }
        
        setTyping(true)
        
        // First, ask ChatGPT to analyze intent
        let intentPrompt = """
        Analyze this user request and determine if it requires browser actions or just a chat response.
        
        User request: "\(message)"
        
        If it requires browser actions (like "search for X", "go to Y", "click Z", "fill form"), respond with:
        INTENT: ACTION
        GOAL: [describe what needs to be done]
        
        If it's just a question or chat (like "what is X?", "explain Y", "help me understand Z"), respond with:
        INTENT: CHAT
        
        Be specific and concise.
        """
        
        do {
            guard let chatGPTService = viewModel.chatGPTService else {
                addMessage(UnifiedMessage(content: "ChatGPT service not available", type: .error))
                setTyping(false)
                return
            }
            
            let intentResponse = try await chatGPTService.sendMessage(intentPrompt, conversationHistory: [])
            
            if intentResponse.uppercased().contains("INTENT: ACTION") {
                // Extract goal
                var goal = message
                if let goalLine = intentResponse.components(separatedBy: "\n").first(where: { $0.contains("GOAL:") }) {
                    goal = goalLine.replacingOccurrences(of: "GOAL:", with: "").trimmingCharacters(in: .whitespaces)
                }
                
                addMessage(UnifiedMessage(content: "I'll help you with that task", type: .aiResponse))
                setTyping(false)
                
                // Start agent
                await startAgent(goal: goal)
            } else {
                // Regular chat
                let response = try await chatGPTService.sendMessage(message, conversationHistory: getChatHistory())
                addMessage(UnifiedMessage(content: response, type: .aiResponse))
                setTyping(false)
            }
        } catch {
            addMessage(UnifiedMessage(content: "Error: \(error.localizedDescription)", type: .error))
            setTyping(false)
        }
    }
    
    private func startAgent(goal: String) async {
        // Use unified agent
        if let agent = agent {
            guard let webView = viewModel.webView else {
                addMessage(UnifiedMessage(content: "No active webpage", type: .error))
                return
            }
            
            addMessage(UnifiedMessage(content: "🚀 Starting task: \(goal)", type: .agentPlanning))
            
            // Subscribe to agent thoughts
            let thoughtCancellable = agent.$thoughts.sink { thoughts in
                if let lastThought = thoughts.last {
                    DispatchQueue.main.async {
                        self.addAgentThought(lastThought)
                    }
                }
            }
            
            await agent.start(goal: goal, webView: webView)
            thoughtCancellable.cancel()
            return
        }
    }
    
    private func addAgentThought(_ thought: AgentThought) {
        let messageType: UnifiedMessage.MessageType
        
        switch thought.type {
        case .planning:
            messageType = .agentPlanning
        case .observation:
            messageType = .agentObservation
        case .reasoning:
            messageType = .agentThinking
        case .action:
            messageType = .agentAction
        case .verification:
            messageType = .agentVerification
        case .completion:
            messageType = .agentCompletion
        }
        
        addMessage(UnifiedMessage(content: thought.content, type: messageType))
    }
    
    // MARK: - Helper Methods
    
    private func addMessage(_ message: UnifiedMessage) {
        DispatchQueue.main.async {
            if self.viewModel.tabStates[self.tabId] == nil {
                self.viewModel.tabStates[self.tabId] = TabState(tabId: self.tabId)
            }
            self.viewModel.tabStates[self.tabId]?.messages.append(message)
            
            // Force viewModel to update
            self.viewModel.objectWillChange.send()
            
            // Trigger UI refresh
            self.refreshID = UUID()
        }
    }
    
    private func setTyping(_ isTyping: Bool) {
        DispatchQueue.main.async {
            if self.viewModel.tabStates[self.tabId] == nil {
                self.viewModel.tabStates[self.tabId] = TabState(tabId: self.tabId)
            }
            self.viewModel.tabStates[self.tabId]?.isTyping = isTyping
            
            // Force viewModel to update
            self.viewModel.objectWillChange.send()
            
            // Trigger UI refresh
            self.refreshID = UUID()
        }
    }
    
    private func getChatHistory() -> [ChatMessage] {
        // Convert UnifiedMessage to ChatMessage for ChatGPT
        messages.compactMap { message in
            switch message.type {
            case .userMessage:
                return ChatMessage(content: message.content, isFromUser: true)
            case .aiResponse:
                return ChatMessage(content: message.content, isFromUser: false)
            default:
                return nil
            }
        }
    }
}

// MARK: - Message View

struct UnifiedMessageView: View {
    let message: UnifiedMessage
    var isLatestMessage: Bool = false
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if message.type == .userMessage {
                Spacer(minLength: 40)
                
                Text(message.content)
                    .font(.system(size: 12))
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.accentColor)
                    )
            } else if message.isAgentMessage {
                // Minimal agent thought - just text with low opacity, latest one glows
                HStack(alignment: .top, spacing: 6) {
                    // Small indicator dot
                    Circle()
                        .fill(colorForType(message.iconColor))
                        .frame(width: 4, height: 4)
                        .padding(.top, 6)
                        .opacity(isLatestMessage ? 1.0 : 0.3)
                    
                    Text(message.content)
                        .font(.system(size: 11, weight: isLatestMessage ? .medium : .regular))
                        .foregroundColor(.secondary)
                        .opacity(isLatestMessage ? 0.9 : 0.5)
                        .fixedSize(horizontal: false, vertical: true)
                    
                    Spacer()
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(
                    RoundedRectangle(cornerRadius: 4)
                        .fill(isLatestMessage ? colorForType(message.iconColor).opacity(0.08) : Color.clear)
                )
                .scaleEffect(isLatestMessage ? 1.0 : 0.98)
                .animation(.easeInOut(duration: 0.3), value: isLatestMessage)
            } else {
                // AI response
                VStack(alignment: .leading, spacing: 0) {
                    MarkdownText(content: message.content)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(NSColor.windowBackgroundColor).opacity(0.6))
                )
                
                Spacer(minLength: 40)
            }
        }
    }
    
    private func colorForType(_ colorName: String) -> Color {
        switch colorName {
        case "blue": return .blue
        case "green": return .green
        case "purple": return .purple
        case "orange": return .orange
        case "red": return .red
        default: return .gray
        }
    }
    
    private func backgroundForAgentType(_ colorName: String) -> Color {
        colorForType(colorName).opacity(0.15)
    }
}

// MARK: - Typing Indicator

struct TypingIndicatorView: View {
    @State private var animationPhase: CGFloat = 0
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            HStack(spacing: 4) {
                ForEach(0..<3) { index in
                    Circle()
                        .fill(Color.secondary.opacity(0.6))
                        .frame(width: 5, height: 5)
                        .scaleEffect(1.0 + 0.5 * sin(animationPhase + Double(index) * 0.8))
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(NSColor.windowBackgroundColor).opacity(0.6))
            )
            
            Spacer()
        }
        .onAppear {
            withAnimation(Animation.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                animationPhase = .pi * 2
            }
        }
    }
}


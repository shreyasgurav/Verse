import SwiftUI

struct UnifiedChatSidebar: View {
    @State private var currentMessage: String = ""
    @State private var messages: [ChatMessage] = []
    @State private var isGenerating: Bool = false
    @FocusState private var isInputFocused: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Spacer()
                Button(action: {}) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            
            // Messages Area
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        if messages.isEmpty {
                            VStack(spacing: 16) {
                                Text("AI Assistant")
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                
                                Text("How can I help you today?")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                            .padding(.top, 40)
                        }
                        
                        ForEach(messages) { message in
                            MessageBubble(message: message)
                        }
                        
                        if isGenerating {
                            MessageBubble(message: ChatMessage(content: "...", isFromUser: false))
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 10)
                    .onChange(of: messages.count) { _, _ in
                        // Scroll to bottom on new message
                        if let lastMessageId = messages.last?.id {
                            withAnimation {
                                proxy.scrollTo(lastMessageId, anchor: .bottom)
                            }
                        }
                    }
                }
            }
            
            // Input Area
            VStack(spacing: 8) {
                HStack(alignment: .bottom, spacing: 8) {
                    TextField("Type your message...", text: $currentMessage, axis: .vertical)
                        .textFieldStyle(.plain)
                        .font(.system(size: 13))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color(NSColor.windowBackgroundColor).opacity(0.8))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(Color.secondary.opacity(isInputFocused ? 0.6 : 0.3), lineWidth: 0.5)
                                )
                        )
                        .focused($isInputFocused)
                        .onChange(of: currentMessage) { _, newValue in
                            if newValue.last == "\n" {
                                sendMessage()
                            }
                        }
                    
                    Button(action: {
                        if isGenerating {
                            stopGeneration()
                        } else {
                            sendMessage()
                        }
                    }) {
                        Image(systemName: isGenerating ? "stop.circle.fill" : "arrow.up.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(isGenerating ? .red : .accentColor)
                            .frame(width: 30, height: 30)
                            .contentShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .disabled(currentMessage.isEmpty && !isGenerating)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(NSColor.windowBackgroundColor))
        }
        .frame(width: 320)
        .background(Color(NSColor.windowBackgroundColor))
    }
    
    private func sendMessage() {
        guard !currentMessage.isEmpty else { return }
        
        let userMessage = ChatMessage(content: currentMessage, isFromUser: true)
        messages.append(userMessage)
        
        let messageContent = currentMessage
        currentMessage = ""
        isGenerating = true
        
        // Simulate AI response
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            let aiMessage = ChatMessage(
                content: "I received your message: \"\(messageContent)\". This is a placeholder response in the Chromium-based version.",
                isFromUser: false
            )
            messages.append(aiMessage)
            isGenerating = false
        }
    }
    
    private func stopGeneration() {
        isGenerating = false
    }
}

struct MessageBubble: View {
    let message: ChatMessage
    
    var body: some View {
        HStack {
            if message.isFromUser {
                Spacer()
            }
            
            VStack(alignment: message.isFromUser ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.system(size: 13))
                    .foregroundColor(.primary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(message.isFromUser ? Color.accentColor : Color(NSColor.controlBackgroundColor).opacity(0.4))
                    )
                    .foregroundColor(message.isFromUser ? .white : .primary)
            }
            
            if !message.isFromUser {
                Spacer()
            }
        }
    }
}

#Preview {
    UnifiedChatSidebar()
}
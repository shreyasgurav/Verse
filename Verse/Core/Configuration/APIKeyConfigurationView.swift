import SwiftUI

struct APIKeyConfigurationView: View {
    @ObservedObject var viewModel: BrowserViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var apiKey: String = ""
    @State private var showingInstructions: Bool = false
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            VStack(spacing: 8) {
                Image(systemName: "key")
                    .font(.system(size: 32))
                    .foregroundColor(.accentColor)
                
                Text("ChatGPT API Key")
                    .font(.system(size: 18, weight: .semibold))
                
                Text("Enter your OpenAI API key to enable AI chat")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            // API Key Input
            VStack(alignment: .leading, spacing: 8) {
                Text("API Key")
                    .font(.system(size: 12, weight: .medium))
                
                SecureField("sk-...", text: $apiKey)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12, design: .monospaced))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color(NSColor.controlBackgroundColor).opacity(0.5))
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(Color.secondary.opacity(0.2), lineWidth: 0.5)
                            )
                    )
            }
            
            // Instructions Button
            Button("How to get API key?") {
                showingInstructions = true
            }
            .font(.system(size: 11))
            .foregroundColor(.accentColor)
            
            // Buttons
            HStack(spacing: 12) {
                Button("Cancel") {
                    dismiss()
                }
                .font(.system(size: 12))
                .foregroundColor(.secondary)
                .buttonStyle(.plain)
                
                Spacer()
                
                Button("Save") {
                    viewModel.setChatGPTAPIKey(apiKey)
                    dismiss()
                }
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .fill(apiKey.isEmpty ? Color.gray : Color.accentColor)
                )
                .disabled(apiKey.isEmpty)
                .buttonStyle(.plain)
            }
            
            if viewModel.configurationService.isAPIKeyConfigured {
                Button("Remove API Key") {
                    viewModel.configurationService.clearAPIKey()
                }
                .font(.system(size: 11))
                .foregroundColor(.red)
                .buttonStyle(.plain)
            }
        }
        .padding(24)
        .frame(width: 400)
        .background(Color(NSColor.windowBackgroundColor))
        .onAppear {
            apiKey = viewModel.configurationService.chatGPTAPIKey
        }
        .sheet(isPresented: $showingInstructions) {
            APIKeyInstructionsView()
        }
    }
}

struct APIKeyInstructionsView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Text("How to get OpenAI API Key")
                    .font(.system(size: 16, weight: .semibold))
                
                Spacer()
                
                Button("Done") {
                    dismiss()
                }
                .font(.system(size: 12))
                .foregroundColor(.accentColor)
                .buttonStyle(.plain)
            }
            
            // Instructions
            VStack(alignment: .leading, spacing: 12) {
                InstructionStep(
                    number: "1",
                    title: "Visit OpenAI",
                    description: "Go to https://platform.openai.com"
                )
                
                InstructionStep(
                    number: "2",
                    title: "Sign up / Log in",
                    description: "Create an account or sign in to your existing account"
                )
                
                InstructionStep(
                    number: "3",
                    title: "Create API Key",
                    description: "Go to API Keys section and click 'Create new secret key'"
                )
                
                InstructionStep(
                    number: "4",
                    title: "Copy & Paste",
                    description: "Copy the generated key (starts with 'sk-') and paste it above"
                )
            }
            
            // Note
            VStack(alignment: .leading, spacing: 8) {
                Text("Note:")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.orange)
                
                Text("• Keep your API key secure and don't share it\n• You'll be charged based on usage\n• This app uses GPT-4o mini for cost efficiency")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
            .padding(.top, 8)
            
            Spacer()
        }
        .padding(24)
        .frame(width: 500, height: 400)
        .background(Color(NSColor.windowBackgroundColor))
    }
}

struct InstructionStep: View {
    let number: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 18, height: 18)
                .background(Circle().fill(Color.accentColor))
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.primary)
                
                Text(description)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
        }
    }
}

#Preview {
    APIKeyConfigurationView(viewModel: BrowserViewModel())
}

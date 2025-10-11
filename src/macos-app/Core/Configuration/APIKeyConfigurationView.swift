import SwiftUI

struct APIKeyConfigurationView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var apiKey: String = ""
    @State private var showingInstructions: Bool = false
    
    var body: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 8) {
                Image(systemName: "key.fill")
                    .font(.system(size: 32))
                    .foregroundColor(.accentColor)
                
                Text("API Key Configuration")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("Configure your OpenAI API key to enable AI features")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            // API Key Input
            VStack(alignment: .leading, spacing: 8) {
                Text("OpenAI API Key")
                    .font(.headline)
                
                SecureField("Enter your API key", text: $apiKey)
                    .textFieldStyle(.roundedBorder)
                    .font(.system(.body, design: .monospaced))
                
                Button(action: { showingInstructions.toggle() }) {
                    HStack {
                        Text("Need help getting an API key?")
                        Image(systemName: "questionmark.circle")
                    }
                    .font(.caption)
                    .foregroundColor(.accentColor)
                }
                .buttonStyle(.plain)
            }
            
            // Instructions
            if showingInstructions {
                VStack(alignment: .leading, spacing: 12) {
                    Text("How to get your OpenAI API key:")
                        .font(.headline)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        instructionStep("1", "Go to platform.openai.com")
                        instructionStep("2", "Sign in or create an account")
                        instructionStep("3", "Navigate to API Keys section")
                        instructionStep("4", "Create a new secret key")
                        instructionStep("5", "Copy and paste it here")
                    }
                    
                    Button(action: {
                        if let url = URL(string: "https://platform.openai.com/api-keys") {
                            NSWorkspace.shared.open(url)
                        }
                    }) {
                        HStack {
                            Text("Open OpenAI Platform")
                            Image(systemName: "arrow.up.right.square")
                        }
                        .font(.caption)
                        .foregroundColor(.accentColor)
                    }
                    .buttonStyle(.plain)
                }
                .padding()
                .background(Color(NSColor.controlBackgroundColor))
                .cornerRadius(8)
            }
            
            Spacer()
            
            // Buttons
            HStack(spacing: 12) {
                Button("Cancel") {
                    dismiss()
                }
                .buttonStyle(.bordered)
                
                Button("Save API Key") {
                    saveAPIKey()
                }
                .buttonStyle(.borderedProminent)
                .disabled(apiKey.isEmpty)
            }
        }
        .padding(24)
        .frame(width: 500, height: 600)
        .onAppear {
            loadAPIKey()
        }
    }
    
    private func instructionStep(_ number: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text(number)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .frame(width: 20, height: 20)
                .background(Color.accentColor)
                .clipShape(Circle())
            
            Text(text)
                .font(.caption)
                .foregroundColor(.primary)
        }
    }
    
    private func saveAPIKey() {
        // Save API key logic would go here
        print("Saving API key: \(apiKey)")
        dismiss()
    }
    
    private func loadAPIKey() {
        // Load existing API key logic would go here
        apiKey = ""
    }
}

#Preview {
    APIKeyConfigurationView()
}
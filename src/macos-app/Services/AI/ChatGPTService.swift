import Foundation
import Combine

class ChatGPTService: ObservableObject {
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let apiKey: String
    private let baseURL = "https://api.openai.com/v1/chat/completions"
    
    init(apiKey: String) {
        self.apiKey = apiKey
    }
    
    func sendMessage(_ message: String, conversationHistory: [ChatMessage] = []) async throws -> String {
        isLoading = true
        errorMessage = nil
        
        defer {
            DispatchQueue.main.async {
                self.isLoading = false
            }
        }
        
        // Prepare conversation history
        var messages: [[String: Any]] = []
        
        // Add system message
        messages.append([
            "role": "system",
            "content": "You are a helpful AI assistant integrated into a web browser. You can help with web browsing, research, coding, general questions, and more. You have the ability to analyze website content that users share with you. When analyzing websites, provide clear summaries, identify key information, and offer insights about the content. Be concise but comprehensive in your responses."
        ])
        
        // Add conversation history (last 10 messages to stay within token limits)
        let recentHistory = Array(conversationHistory.suffix(10))
        for chatMessage in recentHistory {
            messages.append([
                "role": chatMessage.isFromUser ? "user" : "assistant",
                "content": chatMessage.content
            ])
        }
        
        // Add current message
        messages.append([
            "role": "user",
            "content": message
        ])
        
        // Prepare request body
        let requestBody: [String: Any] = [
            "model": "gpt-4o-mini",
            "messages": messages,
            "max_tokens": 1000,
            "temperature": 0.7,
            "stream": false
        ]
        
        // Create URL request
        guard let url = URL(string: baseURL) else {
            throw ChatGPTError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Arc-Browser/1.0", forHTTPHeaderField: "User-Agent")
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        } catch {
            throw ChatGPTError.encodingError
        }
        
        // Make the request
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ChatGPTError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            let errorData = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            let errorMessage = errorData?["error"] as? [String: Any]
            let errorDescription = errorMessage?["message"] as? String ?? "Unknown error"
            
            DispatchQueue.main.async {
                self.errorMessage = "API Error (\(httpResponse.statusCode)): \(errorDescription)"
            }
            
            throw ChatGPTError.apiError(httpResponse.statusCode, errorDescription)
        }
        
        // Parse response
        guard let jsonResponse = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = jsonResponse["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let message = firstChoice["message"] as? [String: Any],
              let content = message["content"] as? String else {
            throw ChatGPTError.invalidResponse
        }
        
        return content.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

enum ChatGPTError: Error, LocalizedError {
    case invalidURL
    case encodingError
    case invalidResponse
    case apiError(Int, String)
    case noAPIKey
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL"
        case .encodingError:
            return "Failed to encode request"
        case .invalidResponse:
            return "Invalid response from API"
        case .apiError(let code, let message):
            return "API Error \(code): \(message)"
        case .noAPIKey:
            return "No API key provided"
        }
    }
}

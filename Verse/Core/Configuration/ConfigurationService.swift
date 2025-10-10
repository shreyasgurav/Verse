import Foundation
import Combine

class ConfigurationService: ObservableObject {
    @Published var chatGPTAPIKey: String = ""
    @Published var isAPIKeyConfigured: Bool = false
    
    private let userDefaults = UserDefaults.standard
    private let apiKeyKey = "ChatGPT_API_Key"
    
    init() {
        loadAPIKey()
    }
    
    func setAPIKey(_ key: String) {
        chatGPTAPIKey = key.trimmingCharacters(in: .whitespacesAndNewlines)
        isAPIKeyConfigured = !chatGPTAPIKey.isEmpty
        
        if isAPIKeyConfigured {
            userDefaults.set(chatGPTAPIKey, forKey: apiKeyKey)
        } else {
            userDefaults.removeObject(forKey: apiKeyKey)
        }
        
        print("🔑 API Key \(isAPIKeyConfigured ? "saved" : "removed")")
    }
    
    private func loadAPIKey() {
        if let savedKey = userDefaults.string(forKey: apiKeyKey) {
            chatGPTAPIKey = savedKey
            isAPIKeyConfigured = !chatGPTAPIKey.isEmpty
        }
    }
    
    func clearAPIKey() {
        setAPIKey("")
    }
}

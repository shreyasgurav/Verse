import SwiftUI
import AppKit

struct ContentView: View {
    @State private var electronProcess: Process?
    @State private var isElectronRunning = false
    @State private var showLaunchButton = true
    @State private var debugOutput = ""
    
    var body: some View {
        VStack(spacing: 20) {
            if showLaunchButton {
                VStack(spacing: 16) {
                    // Logo/Icon
            Image(systemName: "globe")
                        .font(.system(size: 64))
                        .foregroundColor(.accentColor)
                    
                    Text("Verse Browser")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Chromium-based browser with AI assistance")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                    
                    Button(action: launchElectronBrowser) {
                        HStack {
                            Image(systemName: "play.fill")
                            Text("Launch Browser")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding(.horizontal, 32)
                        .padding(.vertical, 12)
                        .background(Color.accentColor)
                        .cornerRadius(8)
                    }
                    .buttonStyle(.plain)
                    
                    Button(action: debugPaths) {
                        Text("Debug Paths")
                    }
                    .padding()
                    
                    if !debugOutput.isEmpty {
                        ScrollView {
                            Text(debugOutput)
                                .font(.system(size: 10, design: .monospaced))
                                .padding()
                                .background(Color.gray.opacity(0.1))
                                .cornerRadius(8)
                        }
                        .frame(maxHeight: 200)
                        .padding()
                    }
                    
                    Text("Starting Chromium engine...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(40)
            } else {
                // Browser is running
                VStack(spacing: 16) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Browser is running")
                            .font(.headline)
                    }
                    
                    Text("Verse Browser is now active with Chromium engine")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                    
                    Button(action: stopElectronBrowser) {
                        HStack {
                            Image(systemName: "stop.fill")
                            Text("Stop Browser")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 10)
                        .background(Color.red)
                        .cornerRadius(8)
                    }
                    .buttonStyle(.plain)
                }
                .padding(40)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(NSColor.controlBackgroundColor))
        .onAppear {
            checkElectronStatus()
        }
        .onDisappear {
            stopElectronBrowser()
        }
    }
    
    private func launchElectronBrowser() {
        guard !isElectronRunning else { return }
        
        showLaunchButton = false
        
        // Get the correct paths
        let bundlePath = Bundle.main.bundlePath
        print("Bundle path: \(bundlePath)")
        
        // Try to find the project root by going up from the bundle path
        let possibleProjectRoots = [
            bundlePath.replacingOccurrences(of: "/Build/Products/Debug/Verse.app", with: ""),
            bundlePath.replacingOccurrences(of: "/DerivedData/Verse-*/Build/Products/Debug/Verse.app", with: ""),
            bundlePath.replacingOccurrences(of: "/Verses.app/Contents/MacOS", with: ""),
            bundlePath.replacingOccurrences(of: "/Contents/MacOS", with: ""),
            FileManager.default.currentDirectoryPath
        ]
        
        var projectRoot: String?
        for possibleRoot in possibleProjectRoots {
            let packageJsonPath = "\(possibleRoot)/package.json"
            if FileManager.default.fileExists(atPath: packageJsonPath) {
                projectRoot = possibleRoot
                break
            }
        }
        
        guard let root = projectRoot else {
            print("Could not find project root with package.json")
            showLaunchButton = true
            return
        }
        
        print("Project root: \(root)")
        
        let task = Process()
        
        // Try multiple possible paths for npm/node
        let possibleNodePaths = [
            "/usr/local/bin/npm",
            "/opt/homebrew/bin/npm", 
            "/usr/bin/npm",
            "/usr/local/bin/node",
            "/opt/homebrew/bin/node",
            "/usr/bin/node"
        ]
        
        var executablePath: String?
        for path in possibleNodePaths {
            if FileManager.default.fileExists(atPath: path) {
                executablePath = path
                break
            }
        }
        
        guard let execPath = executablePath else {
            print("Could not find npm or node executable")
            showLaunchButton = true
            return
        }
        
        task.executableURL = URL(fileURLWithPath: execPath)
        
        // Use npm start if we found npm, otherwise use node directly
        if execPath.contains("npm") {
            task.arguments = ["start"]
            task.currentDirectoryURL = URL(fileURLWithPath: root)
        } else {
            // Fallback: try to run electron directly
            let electronPath = "\(root)/node_modules/.bin/electron"
            if FileManager.default.fileExists(atPath: electronPath) {
                task.arguments = [electronPath, "."]
                task.currentDirectoryURL = URL(fileURLWithPath: root)
            } else {
                print("Could not find electron executable at \(electronPath)")
                showLaunchButton = true
                return
            }
        }
        
        // Set environment variables
        var environment = ProcessInfo.processInfo.environment
        environment["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true"
        environment["ELECTRON_ENABLE_LOGGING"] = "true"
        task.environment = environment
        
        // Capture output for debugging
        let outputPipe = Pipe()
        let errorPipe = Pipe()
        task.standardOutput = outputPipe
        task.standardError = errorPipe
        
        do {
            print("Launching Electron with:")
            print("  Executable: \(execPath)")
            print("  Arguments: \(task.arguments ?? [])")
            print("  Working Directory: \(root)")
            
            try task.run()
            electronProcess = task
            isElectronRunning = true
            
            // Read output asynchronously
            outputPipe.fileHandleForReading.readabilityHandler = { handle in
                let data = handle.availableData
                if let output = String(data: data, encoding: .utf8), !output.isEmpty {
                    print("Electron Output: \(output)")
                }
            }
            
            errorPipe.fileHandleForReading.readabilityHandler = { handle in
                let data = handle.availableData
                if let output = String(data: data, encoding: .utf8), !output.isEmpty {
                    print("Electron Error: \(output)")
                }
            }
            
            // Monitor the process
            DispatchQueue.global(qos: .background).async {
                task.waitUntilExit()
                DispatchQueue.main.async {
                    self.isElectronRunning = false
                    self.showLaunchButton = true
                    print("Electron process exited with code: \(task.terminationStatus)")
                }
            }
            
        } catch {
            print("Failed to launch Electron: \(error)")
            showLaunchButton = true
        }
    }
    
    private func stopElectronBrowser() {
        guard let process = electronProcess else { return }
        
        process.terminate()
        electronProcess = nil
        isElectronRunning = false
        showLaunchButton = true
    }
    
    private func debugPaths() {
        var output = "=== DEBUG PATHS ===\n"
        
        let bundlePath = Bundle.main.bundlePath
        output += "Bundle path: \(bundlePath)\n"
        output += "Current directory: \(FileManager.default.currentDirectoryPath)\n\n"
        
        // Test possible project roots
        let possibleProjectRoots = [
            bundlePath.replacingOccurrences(of: "/Build/Products/Debug/Verse.app", with: ""),
            bundlePath.replacingOccurrences(of: "/DerivedData/Verse-*/Build/Products/Debug/Verse.app", with: ""),
            bundlePath.replacingOccurrences(of: "/Verses.app/Contents/MacOS", with: ""),
            bundlePath.replacingOccurrences(of: "/Contents/MacOS", with: ""),
            FileManager.default.currentDirectoryPath,
            "/Users/shreyasgurav/Desktop/Verse"  // Hardcoded fallback
        ]
        
        for (index, possibleRoot) in possibleProjectRoots.enumerated() {
            let packageJsonPath = "\(possibleRoot)/package.json"
            let exists = FileManager.default.fileExists(atPath: packageJsonPath)
            output += "Root \(index): \(possibleRoot)\n"
            output += "  Package.json exists: \(exists)\n"
            
            if exists {
                let electronPath = "\(possibleRoot)/node_modules/.bin/electron"
                let electronExists = FileManager.default.fileExists(atPath: electronPath)
                output += "  Electron exists: \(electronExists)\n"
            }
        }
        
        // Test npm/node paths
        let possibleNodePaths = [
            "/usr/local/bin/npm",
            "/opt/homebrew/bin/npm", 
            "/usr/bin/npm",
            "/usr/local/bin/node",
            "/opt/homebrew/bin/node",
            "/usr/bin/node"
        ]
        
        output += "\nNode/npm paths:\n"
        for path in possibleNodePaths {
            let exists = FileManager.default.fileExists(atPath: path)
            output += "  \(path): \(exists)\n"
        }
        
        output += "\n=== END DEBUG ==="
        debugOutput = output
        
        // Also print to console for debugging
        print(output)
    }
    
    private func checkElectronStatus() {
        // Check if Electron is already running
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/ps")
        task.arguments = ["-x", "-o", "pid,command"]
        
        let pipe = Pipe()
        task.standardOutput = pipe
        
        do {
            try task.run()
            task.waitUntilExit()
            
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let output = String(data: data, encoding: .utf8) ?? ""
            
            if output.contains("electron") {
                isElectronRunning = true
                showLaunchButton = false
            }
        } catch {
            print("Failed to check process status: \(error)")
        }
    }
}

#Preview {
    ContentView()
}
import SwiftUI
import Foundation

struct MarkdownText: View {
    let content: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(Array(parseMarkdown(content).enumerated()), id: \.offset) { index, component in
                component
            }
        }
    }
    
    private func parseMarkdown(_ text: String) -> [AnyView] {
        let lines = text.components(separatedBy: .newlines)
        var components: [AnyView] = []
        var currentParagraph: [String] = []
        
        for line in lines {
            let trimmedLine = line.trimmingCharacters(in: .whitespaces)
            
            // Handle headers
            if trimmedLine.hasPrefix("### ") {
                flushParagraph(&currentParagraph, to: &components)
                let title = String(trimmedLine.dropFirst(4))
                components.append(AnyView(
                    Text(title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.primary)
                        .padding(.vertical, 2)
                ))
            } else if trimmedLine.hasPrefix("## ") {
                flushParagraph(&currentParagraph, to: &components)
                let title = String(trimmedLine.dropFirst(3))
                components.append(AnyView(
                    Text(title)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.primary)
                        .padding(.vertical, 3)
                ))
            } else if trimmedLine.hasPrefix("# ") {
                flushParagraph(&currentParagraph, to: &components)
                let title = String(trimmedLine.dropFirst(2))
                components.append(AnyView(
                    Text(title)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.primary)
                        .padding(.vertical, 4)
                ))
            }
            // Handle bullet points
            else if trimmedLine.hasPrefix("- ") || trimmedLine.hasPrefix("* ") {
                flushParagraph(&currentParagraph, to: &components)
                let bullet = String(trimmedLine.dropFirst(2))
                components.append(AnyView(
                    HStack(alignment: .top, spacing: 6) {
                        Text("•")
                            .foregroundColor(.secondary)
                            .font(.system(size: 12))
                        Text(parseInlineMarkdown(bullet))
                            .font(.system(size: 12))
                            .foregroundColor(.primary)
                        Spacer()
                    }
                    .padding(.leading, 8)
                    .padding(.vertical, 1)
                ))
            }
            // Handle numbered lists
            else if let match = trimmedLine.range(of: "^\\d+\\.\\s", options: .regularExpression) {
                flushParagraph(&currentParagraph, to: &components)
                let number = String(trimmedLine[..<match.upperBound])
                let content = String(trimmedLine[match.upperBound...])
                components.append(AnyView(
                    HStack(alignment: .top, spacing: 6) {
                        Text(number)
                            .foregroundColor(.secondary)
                            .font(.system(size: 12, weight: .medium))
                        Text(parseInlineMarkdown(content))
                            .font(.system(size: 12))
                            .foregroundColor(.primary)
                        Spacer()
                    }
                    .padding(.leading, 8)
                    .padding(.vertical, 1)
                ))
            }
            // Handle bold text lines
            else if trimmedLine.hasPrefix("**") && trimmedLine.hasSuffix("**") && trimmedLine.count > 4 {
                flushParagraph(&currentParagraph, to: &components)
                let boldText = String(trimmedLine.dropFirst(2).dropLast(2))
                components.append(AnyView(
                    Text(boldText)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.primary)
                        .padding(.vertical, 2)
                ))
            }
            // Handle code blocks
            else if trimmedLine.hasPrefix("```") {
                flushParagraph(&currentParagraph, to: &components)
                // For now, skip code block processing
                continue
            }
            // Handle empty lines
            else if trimmedLine.isEmpty {
                flushParagraph(&currentParagraph, to: &components)
            }
            // Regular text
            else {
                currentParagraph.append(line)
            }
        }
        
        // Flush any remaining paragraph
        flushParagraph(&currentParagraph, to: &components)
        
        return components
    }
    
    private func flushParagraph(_ paragraph: inout [String], to components: inout [AnyView]) {
        if !paragraph.isEmpty {
            let paragraphText = paragraph.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
            if !paragraphText.isEmpty {
                components.append(AnyView(
                    Text(parseInlineMarkdown(paragraphText))
                        .font(.system(size: 12))
                        .foregroundColor(.primary)
                        .padding(.vertical, 2)
                ))
            }
            paragraph.removeAll()
        }
    }
    
    private func parseInlineMarkdown(_ text: String) -> AttributedString {
        var attributedString = AttributedString(text)
        
        // Handle bold text
        let boldPattern = "\\*\\*(.*?)\\*\\*"
        if let regex = try? NSRegularExpression(pattern: boldPattern, options: []) {
            let matches = regex.matches(in: text, options: [], range: NSRange(location: 0, length: text.utf16.count))
            
            for match in matches.reversed() {
                if let boldRange = Range(match.range, in: text),
                   let contentRange = Range(match.range(at: 1), in: text) {
                    let boldContent = String(text[contentRange])
                    
                    if let attributedRange = Range(boldRange, in: attributedString) {
                        attributedString[attributedRange].font = .system(size: 12, weight: .semibold)
                        attributedString.replaceSubrange(attributedRange, with: AttributedString(boldContent))
                    }
                }
            }
        }
        
        // Handle italic text
        let italicPattern = "\\*(.*?)\\*"
        if let regex = try? NSRegularExpression(pattern: italicPattern, options: []) {
            let matches = regex.matches(in: text, options: [], range: NSRange(location: 0, length: text.utf16.count))
            
            for match in matches.reversed() {
                if let italicRange = Range(match.range, in: text),
                   let contentRange = Range(match.range(at: 1), in: text) {
                    let italicContent = String(text[contentRange])
                    
                    if let attributedRange = Range(italicRange, in: attributedString) {
                        attributedString[attributedRange].font = .system(size: 12, weight: .regular).italic()
                        attributedString.replaceSubrange(attributedRange, with: AttributedString(italicContent))
                    }
                }
            }
        }
        
        // Handle links
        let linkPattern = "\\[([^\\]]+)\\]\\(([^\\)]+)\\)"
        if let regex = try? NSRegularExpression(pattern: linkPattern, options: []) {
            let matches = regex.matches(in: text, options: [], range: NSRange(location: 0, length: text.utf16.count))
            
            for match in matches.reversed() {
                if let linkRange = Range(match.range, in: text),
                   let textRange = Range(match.range(at: 1), in: text),
                   let urlRange = Range(match.range(at: 2), in: text) {
                    let linkText = String(text[textRange])
                    let linkURL = String(text[urlRange])
                    
                    if let attributedRange = Range(linkRange, in: attributedString) {
                        attributedString[attributedRange].foregroundColor = .accentColor
                        attributedString[attributedRange].underlineStyle = .single
                        attributedString.replaceSubrange(attributedRange, with: AttributedString(linkText))
                        
                        if let url = URL(string: linkURL) {
                            attributedString[attributedRange].link = url
                        }
                    }
                }
            }
        }
        
        return attributedString
    }
}

#Preview {
    MarkdownText(content: """
### Summary of the Page
**Title:** Luca - AI Copilot for Meetings
**URL:** [askluca.co](https://www.askluca.co/)

**Overview:**
Luca is an AI tool designed to enhance online meetings.

**Key Features:**
- Real-time assistance
- Coding help
- Meeting notes
- Live guidance

**Download Links:**
- Download for Mac
""")
    .padding()
}

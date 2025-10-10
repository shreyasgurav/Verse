//
//  ElementFinder.swift
//  Arc
//
//  Find and match elements on web pages
//

import Foundation

class ElementFinder {
    
    func findMatchingElements(searchText: String, in pageContext: PageContext) -> [ElementContext] {
        let search = searchText.lowercased()
        var scored: [(element: ElementContext, score: Int)] = []
        
        for element in pageContext.elements {
            var score = 0
            
            // Exact text match
            if element.text.lowercased() == search {
                score += 100
            } else if element.text.lowercased().contains(search) {
                score += 50
            }
            
            // Google Forms specific scoring
            if pageContext.url.contains("forms.google.com") || element.inputContext == "google-form-field" {
                if element.role.contains("textbox") || element.inputContext == "google-form-field" {
                    score += 200
                }
                if element.text.lowercased().contains("your answer") {
                    score += 180
                }
                if element.placeholder.lowercased().contains("your answer") {
                    score += 170
                }
                if element.ariaLabel.lowercased().contains("your answer") {
                    score += 160
                }
            }
            
            // Button elements get high priority
            if element.tagName == "button" {
                score += 50
            } else if element.role.contains("button") {
                score += 40
            } else if element.tagName == "a" && !element.inputContext.isEmpty {
                score += 30
            } else if element.tagName == "input" && (element.inputContext.contains("button") || element.inputContext.contains("submit")) {
                score += 45
            }
            
            // Label match
            if element.ariaLabel.lowercased() == search {
                score += 90
            } else if element.ariaLabel.lowercased().contains(search) {
                score += 45
            }
            
            // Placeholder match
            if element.placeholder.lowercased() == search {
                score += 80
            } else if element.placeholder.lowercased().contains(search) {
                score += 40
            }
            
            // Button-related searches
            if (search.contains("click") || search.contains("button") || search.contains("submit") || 
                search.contains("create") || search.contains("add") || search.contains("save") ||
                search.contains("next") || search.contains("continue") || search.contains("done")) {
                if element.tagName == "button" || element.role.contains("button") || 
                   element.inputContext.contains("button") {
                    score += 25
                }
            }
            
            if score > 0 {
                scored.append((element, score))
            }
        }
        
        // Sort by score (highest first)
        scored.sort { $0.score > $1.score }
        
        return scored.map { $0.element }
    }
    
    func findInputElements(searchText: String, in pageContext: PageContext) -> [ElementContext] {
        let allMatches = findMatchingElements(searchText: searchText, in: pageContext)
        
        return allMatches.filter { element in
            element.tagName == "input" || 
            element.tagName == "textarea" || 
            element.role.contains("textbox") ||
            !element.inputContext.isEmpty ||
            element.inputContext == "google-form-field" ||
            element.text.lowercased().contains(searchText.lowercased()) ||
            (pageContext.url.contains("forms.google.com") && 
             (element.className.contains("exportTextarea") || 
              element.className.contains("mdc-text-field__input")))
        }
    }
    
    func findClickableElements(searchText: String, in pageContext: PageContext) -> [ElementContext] {
        let allMatches = findMatchingElements(searchText: searchText, in: pageContext)
        
        return allMatches.filter { element in
            element.tagName == "button" ||
            element.role.contains("button") ||
            element.inputContext.contains("button") ||
            element.inputContext.contains("link") ||
            !element.inputContext.isEmpty && (
                element.inputContext.contains("submit") ||
                element.inputContext.contains("action") ||
                element.inputContext.contains("role")
            )
        }
    }
}

//
//  PageAnalyzer.swift
//  Arc
//
//  Clean page analysis and element extraction
//

import Foundation
import WebKit

class PageAnalyzer {
    
    func analyze(webView: WKWebView) async -> PageContext? {
        await withCheckedContinuation { continuation in
            let javascript = """
            (function() {
                // Extract page information
                const url = window.location.href;
                const title = document.title;
                
                // Extract all interactive elements
                const elements = [];
                const selectors = [
                    'button',
                    'a[href]',
                    'input:not([type="hidden"])',
                    'textarea',
                    'select',
                    '[role="button"]',
                    '[role="link"]',
                    '[role="textbox"]',
                    '[contenteditable="true"]',
                    '[contenteditable]',
                    'input[type="button"]',
                    'input[type="submit"]',
                    'input[type="reset"]',
                    '[type="button"]',
                    '[type="submit"]',
                    '.btn',
                    '.button',
                    '.clickable',
                    '[data-testid*="search"]',
                    '[id*="search"]',
                    '[class*="search"]',
                    '[aria-label*="search"]',
                    '[placeholder*="search"]'
                ];
                
                const allElements = document.querySelectorAll(selectors.join(', '));
                
                allElements.forEach((el, index) => {
                    const rect = el.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0;
                    
                    if (isVisible && index < 100) {
                        const element = {
                            tagName: el.tagName.toLowerCase(),
                            text: (el.textContent || '').trim().substring(0, 100),
                            placeholder: el.placeholder || '',
                            ariaLabel: el.getAttribute('aria-label') || '',
                            role: el.getAttribute('role') || '',
                            inputContext: getInputContext(el),
                            className: el.className || '',
                            position: {
                                x: Math.round(rect.left + rect.width / 2),
                                y: Math.round(rect.top + rect.height / 2)
                            },
                            isVisible: isVisible
                        };
                        
                        elements.push(element);
                    }
                });
                
                // Sort by position (top to bottom, left to right)
                elements.sort((a, b) => {
                    if (Math.abs(a.position.y - b.position.y) < 20) {
                        return a.position.x - b.position.x;
                    }
                    return a.position.y - b.position.y;
                });
                
                function getInputContext(element) {
                    if (element.tagName === 'BUTTON' || 
                        (element.tagName === 'INPUT' && (element.type === 'button' || element.type === 'submit' || element.type === 'reset')) ||
                        element.getAttribute('role') === 'button') {
                        if (element.type === 'submit') return 'submit-button';
                        else if (element.type === 'reset') return 'reset-button';
                        else if (element.type === 'button') return 'action-button';
                        else if (element.tagName === 'BUTTON') return 'button';
                        else return 'role-button';
                    }
                    
                    if (element.tagName === 'A' && element.href) {
                        return 'link';
                    }
                    
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                        const combinedContext = (element.placeholder + ' ' + element.getAttribute('aria-label') + ' ' + element.id + ' ' + element.className || '').toLowerCase();
                        
                        if (combinedContext.includes('search')) return 'search';
                        else if (combinedContext.includes('email')) return 'email';
                        else if (combinedContext.includes('password')) return 'password';
                        else if (combinedContext.includes('name')) return 'name';
                        else if (combinedContext.includes('phone')) return 'phone';
                        else if (combinedContext.includes('question')) return 'question';
                        else if (combinedContext.includes('title')) return 'title';
                        else if (element.type === 'search') return 'search';
                        else return element.type || 'text';
                    }
                    
                    if (element.getAttribute('role') === 'textbox' || element.getAttribute('contenteditable') === 'true') {
                        return 'textbox';
                    }
                    
                    return '';
                }
                
                return JSON.stringify({
                    url: url,
                    title: title,
                    elements: elements
                });
            })();
            """
            
            webView.evaluateJavaScript(javascript) { result, error in
                if let error = error {
                    continuation.resume(returning: nil)
                    return
                }
                
                guard let jsonString = result as? String,
                      let data = jsonString.data(using: .utf8),
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let url = json["url"] as? String,
                      let title = json["title"] as? String,
                      let elementsData = json["elements"] as? [[String: Any]] else {
                    continuation.resume(returning: nil)
                    return
                }
                
                let elements = elementsData.compactMap { elementData -> ElementContext? in
                    guard let tagName = elementData["tagName"] as? String,
                          let text = elementData["text"] as? String,
                          let placeholder = elementData["placeholder"] as? String,
                          let ariaLabel = elementData["ariaLabel"] as? String,
                          let role = elementData["role"] as? String,
                          let inputContext = elementData["inputContext"] as? String,
                          let className = elementData["className"] as? String,
                          let positionData = elementData["position"] as? [String: Any],
                          let x = positionData["x"] as? Int,
                          let y = positionData["y"] as? Int,
                          let isVisible = elementData["isVisible"] as? Bool else {
                        return nil
                    }
                    
                    return ElementContext(
                        tagName: tagName,
                        text: text,
                        placeholder: placeholder,
                        ariaLabel: ariaLabel,
                        role: role,
                        inputContext: inputContext,
                        className: className,
                        position: (x: x, y: y),
                        isVisible: isVisible
                    )
                }
                
                let pageContext = PageContext(url: url, title: title, elements: elements)
                continuation.resume(returning: pageContext)
            }
        }
    }
    
    func formatForAI(_ pageContext: PageContext) -> String {
        var result = "URL: \(pageContext.url)\n"
        result += "Title: \(pageContext.title)\n\n"
        result += "Interactive Elements (\(pageContext.elements.count)):\n"
        
        for (index, element) in pageContext.elements.enumerated() {
            let elementType = element.inputContext.isEmpty ? element.tagName : element.inputContext
            let text = element.text.isEmpty ? "no text" : "'\(element.text)'"
            let placeholder = element.placeholder.isEmpty ? "" : "placeholder='\(element.placeholder)'"
            let ariaLabel = element.ariaLabel.isEmpty ? "" : "aria='\(element.ariaLabel)'"
            
            result += "[\(index + 1)] \(elementType): \(text) \(placeholder) \(ariaLabel)\n"
        }
        
        return result
    }
}

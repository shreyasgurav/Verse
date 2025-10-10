//
//  ElementTyper.swift
//  Arc
//
//  Type text into input fields
//

import Foundation
import WebKit

class ElementTyper {
    
    func type(target: String, value: String, pageContext: PageContext, webView: WKWebView, pressEnter: Bool = false) async -> Bool {
        let finder = ElementFinder()
        let matchingElements = finder.findInputElements(searchText: target, in: pageContext)
        
        if matchingElements.isEmpty {
            return false
        }
        
        let bestMatch = matchingElements[0]
        return await typeInElement(bestMatch, value: value, webView: webView, pressEnter: pressEnter)
    }
    
    private func typeInElement(_ element: ElementContext, value: String, webView: WKWebView, pressEnter: Bool = false) async -> Bool {
        let script = """
        (function() {
            function findInput() {
                const targetTag = '\(element.tagName)';
                const targetText = '\(element.text.replacingOccurrences(of: "'", with: "\\'"))';
                const targetPlaceholder = '\(element.placeholder.replacingOccurrences(of: "'", with: "\\'"))';
                const targetAriaLabel = '\(element.ariaLabel.replacingOccurrences(of: "'", with: "\\'"))';
                const targetX = \(element.position.x);
                const targetY = \(element.position.y);
                
                const allElements = Array.from(document.querySelectorAll('*'));
                
                // Strategy 1: Exact text match
                let input = allElements.find(el => {
                    const text = (el.textContent || '').trim();
                    return text === targetText && el.tagName.toLowerCase() === targetTag;
                });
                
                if (input) return input;
                
                // Strategy 2: Placeholder match
                if (targetPlaceholder) {
                    input = allElements.find(el => {
                        const placeholder = el.placeholder || '';
                        return placeholder === targetPlaceholder && el.tagName.toLowerCase() === targetTag;
                    });
                    
                    if (input) return input;
                }
                
                // Strategy 3: ARIA label match
                if (targetAriaLabel) {
                    input = allElements.find(el => {
                        const ariaLabel = el.getAttribute('aria-label') || '';
                        return ariaLabel === targetAriaLabel && el.tagName.toLowerCase() === targetTag;
                    });
                    
                    if (input) return input;
                }
                
                // Strategy 4: Position-based fallback
                input = allElements.find(el => {
                    const rect = el.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const isInput = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || 
                                   el.getAttribute('role') === 'textbox' || 
                                   el.getAttribute('contenteditable') === 'true';
                    
                    return isInput && 
                           Math.abs(centerX - targetX) < 50 && 
                           Math.abs(centerY - targetY) < 50;
                });
                
                return input;
            }
            
            const input = findInput();
            
            if (!input) {
                return JSON.stringify({ success: false, message: 'Input element not found' });
            }
            
            // Scroll into view
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Wait then type
            setTimeout(() => {
                // Focus the element
                input.focus();
                input.click();
                
                // Clear existing content
                const isContentEditable = input.getAttribute('contenteditable') === 'true' || input.getAttribute('role') === 'textbox';
                
                if (isContentEditable) {
                    input.textContent = '';
                    input.innerHTML = '';
                } else {
                    input.value = '';
                }
                
                // Type character by character
                const text = '\(value.replacingOccurrences(of: "'", with: "\\'"))';
                let index = 0;
                
                const typeChar = () => {
                    if (index < text.length) {
                        const char = text[index];
                        
                        if (isContentEditable) {
                            input.textContent += char;
                        } else {
                            input.value += char;
                        }
                        
                        // Dispatch input event
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        index++;
                        setTimeout(typeChar, 50 + Math.random() * 50); // Human-like timing
                    } else {
                        // Finished typing
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Press Enter if requested
                        if (\(pressEnter ? "true" : "false")) {
                            setTimeout(() => {
                                // Enhanced Enter key handling
                                const isGoogleForm = window.location.href.includes('forms.google.com');
                                
                                const enterEvents = [
                                    new KeyboardEvent('keydown', {
                                        key: 'Enter',
                                        code: 'Enter',
                                        keyCode: 13,
                                        which: 13,
                                        bubbles: true,
                                        cancelable: true
                                    }),
                                    new KeyboardEvent('keypress', {
                                        key: 'Enter',
                                        keyCode: 13,
                                        which: 13,
                                        bubbles: true
                                    }),
                                    new KeyboardEvent('keyup', {
                                        key: 'Enter',
                                        keyCode: 13,
                                        which: 13,
                                        bubbles: true
                                    })
                                ];
                                
                                enterEvents.forEach(event => input.dispatchEvent(event));
                                
                                // Google Forms specific handling
                                if (isGoogleForm) {
                                    input.dispatchEvent(new Event('change', { bubbles: true }));
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    
                                    const form = input.closest('form');
                                    if (form) {
                                        form.dispatchEvent(new Event('submit', { bubbles: true }));
                                    }
                                } else {
                                    const form = input.closest('form');
                                    if (form) {
                                        form.requestSubmit ? form.requestSubmit() : form.submit();
                                    }
                                }
                            }, 100);
                        }
                        
                        // Release focus
                        setTimeout(() => {
                            input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
                            input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
                            input.blur();
                            
                            if (document.body) {
                                document.body.focus();
                            }
                        }, \(pressEnter ? "200" : "100"));
                    }
                };
                
                // Start typing
                typeChar();
            }, 300);
            
            return JSON.stringify({ success: true, message: 'Started typing: ' + text });
        })();
        """
        
        return await withCheckedContinuation { continuation in
            webView.evaluateJavaScript(script) { result, error in
                if let error = error {
                    continuation.resume(returning: false)
                    return
                }
                
                guard let jsonString = result as? String,
                      let data = jsonString.data(using: .utf8),
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let success = json["success"] as? Bool else {
                    continuation.resume(returning: false)
                    return
                }
                
                continuation.resume(returning: success)
            }
        }
    }
}

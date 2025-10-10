//
//  ElementClicker.swift
//  Arc
//
//  Click buttons and interactive elements
//

import Foundation
import WebKit

class ElementClicker {
    
    func click(target: String, pageContext: PageContext, webView: WKWebView) async -> Bool {
        let finder = ElementFinder()
        let matchingElements = finder.findClickableElements(searchText: target, in: pageContext)
        
        if matchingElements.isEmpty {
            return false
        }
        
        let bestMatch = matchingElements[0]
        return await clickElement(bestMatch, webView: webView)
    }
    
    func select(target: String, option: String, pageContext: PageContext, webView: WKWebView) async -> Bool {
        // First click to open dropdown
        let success = await click(target: target, pageContext: pageContext, webView: webView)
        if !success {
            return false
        }
        
        // Wait for dropdown to open
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        
        // Then click the option
        return await click(target: option, pageContext: pageContext, webView: webView)
    }
    
    private func clickElement(_ element: ElementContext, webView: WKWebView) async -> Bool {
        let script = """
        (function() {
            function findElement() {
                const targetTag = '\(element.tagName)';
                const targetText = '\(element.text.replacingOccurrences(of: "'", with: "\\'"))';
                const targetAriaLabel = '\(element.ariaLabel.replacingOccurrences(of: "'", with: "\\'"))';
                const targetX = \(element.position.x);
                const targetY = \(element.position.y);
                
                // Try multiple strategies to find the element
                const allElements = Array.from(document.querySelectorAll('*'));
                
                // Strategy 1: Exact text match
                let element = allElements.find(el => {
                    const text = (el.textContent || '').trim();
                    return text === targetText && el.tagName.toLowerCase() === targetTag;
                });
                
                if (element) return element;
                
                // Strategy 2: ARIA label match
                if (targetAriaLabel) {
                    element = allElements.find(el => {
                        const ariaLabel = el.getAttribute('aria-label') || '';
                        return ariaLabel === targetAriaLabel && el.tagName.toLowerCase() === targetTag;
                    });
                    
                    if (element) return element;
                }
                
                // Strategy 3: Position-based fallback
                element = allElements.find(el => {
                    const rect = el.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const isInteractive = el.onclick || el.href || el.getAttribute('role') === 'button' || 
                                         el.tagName === 'BUTTON' || el.tagName === 'A' ||
                                         (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit'));
                    
                    return isInteractive && 
                           Math.abs(centerX - targetX) < 50 && 
                           Math.abs(centerY - targetY) < 50;
                });
                
                return element;
            }
            
            const element = findElement();
            
            if (!element) {
                return JSON.stringify({ success: false, message: 'Element not found' });
            }
            
            // Scroll into view
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Wait then click
            setTimeout(() => {
                const rect = element.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                
                // Focus the element first
                element.focus();
                
                // Comprehensive mouse event sequence
                const mouseEvents = [
                    new MouseEvent('mouseenter', { bubbles: true, clientX: x, clientY: y }),
                    new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }),
                    new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }),
                    new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }),
                    new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }),
                    new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 })
                ];
                
                // Dispatch all mouse events
                mouseEvents.forEach(event => element.dispatchEvent(event));
                
                // Also try native click as fallback
                setTimeout(() => {
                    element.click();
                }, 50);
                
                // For submit buttons, try form submission
                if (element.type === 'submit' || element.tagName === 'BUTTON') {
                    setTimeout(() => {
                        const form = element.closest('form');
                        if (form) {
                            form.dispatchEvent(new Event('submit', { bubbles: true }));
                        }
                    }, 100);
                }
            }, 500);
            
            return JSON.stringify({ 
                success: true, 
                message: 'Clicked ' + element.tagName + ' with text: ' + (element.textContent || element.value || '').substring(0, 50),
                elementType: element.tagName,
                elementText: (element.textContent || element.value || '').trim()
            });
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

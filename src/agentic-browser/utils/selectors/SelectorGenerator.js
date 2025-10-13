/**
 * Robust selector generation utility
 * Generates reliable CSS selectors for web elements
 */

const CONFIG = require('../../config/index.js');
const { SelectorCandidate, SELECTOR_STRATEGIES } = require('../../types/index.js');
const Logger = require('../logging/Logger.js').Logger;

class SelectorGenerator {
  constructor() {
    this.logger = new Logger('SelectorGenerator');
  }

  /**
   * Generate selector candidates for an element
   */
  async generateSelectors(elementDescription, pageContext = null, cdpService = null) {
    try {
      this.logger.debug(`Generating selectors for: ${elementDescription}`);

      const candidates = [];

      // Strategy 1: Data attributes
      if (pageContext) {
        const dataSelectors = await this.generateDataAttributeSelectors(elementDescription, pageContext, cdpService);
        candidates.push(...dataSelectors);
      }

      // Strategy 2: ID-based selectors
      const idSelectors = await this.generateIdSelectors(elementDescription, pageContext, cdpService);
      candidates.push(...idSelectors);

      // Strategy 3: CSS selectors
      const cssSelectors = await this.generateCSSSelectors(elementDescription, pageContext, cdpService);
      candidates.push(...cssSelectors);

      // Strategy 4: XPath selectors
      const xpathSelectors = await this.generateXPathSelectors(elementDescription, pageContext, cdpService);
      candidates.push(...xpathSelectors);

      // Strategy 5: Accessibility selectors
      const a11ySelectors = await this.generateAccessibilitySelectors(elementDescription, pageContext, cdpService);
      candidates.push(...a11ySelectors);

      // Rank and filter candidates
      const rankedCandidates = this.rankSelectors(candidates);
      const filteredCandidates = this.filterSelectors(rankedCandidates);

      this.logger.debug(`Generated ${filteredCandidates.length} selector candidates`);
      return filteredCandidates;
    } catch (error) {
      this.logger.error('Failed to generate selectors:', error);
      return [];
    }
  }

  /**
   * Generate data attribute selectors
   */
  async generateDataAttributeSelectors(elementDescription, pageContext, cdpService) {
    const candidates = [];
    const dataAttributes = CONFIG.SELECTORS.PRIORITY_ATTRIBUTES.filter(attr => 
      attr.startsWith('data-')
    );

    for (const attr of dataAttributes) {
      // Try to find elements with this data attribute
      if (cdpService) {
        const elements = await cdpService.findElements(`[${attr}]`);
        for (const element of elements) {
          if (this.matchesDescription(element, elementDescription)) {
            const selector = `[${attr}="${element.attributes[attr]}"]`;
            candidates.push(new SelectorCandidate({
              selector,
              strategy: SELECTOR_STRATEGIES.DATA_ATTRIBUTE,
              confidence: 0.9,
              element,
              isUnique: await this.isUniqueSelector(selector, cdpService),
              isVisible: element.isVisible,
              boundingBox: element.boundingBox
            }));
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Generate ID-based selectors
   */
  async generateIdSelectors(elementDescription, pageContext, cdpService) {
    const candidates = [];

    if (cdpService) {
      const elements = await cdpService.findElements('[id]');
      for (const element of elements) {
        if (element.attributes.id && this.matchesDescription(element, elementDescription)) {
          const selector = `#${element.attributes.id}`;
          candidates.push(new SelectorCandidate({
            selector,
            strategy: SELECTOR_STRATEGIES.ID,
            confidence: 0.8,
            element,
            isUnique: await this.isUniqueSelector(selector, cdpService),
            isVisible: element.isVisible,
            boundingBox: element.boundingBox
          }));
        }
      }
    }

    return candidates;
  }

  /**
   * Generate CSS selectors
   */
  async generateCSSSelectors(elementDescription, pageContext, cdpService) {
    const candidates = [];

    if (cdpService) {
      const elements = await cdpService.findElements('*');
      for (const element of elements) {
        if (this.matchesDescription(element, elementDescription)) {
          const selector = this.buildCSSSelector(element);
          if (selector) {
            candidates.push(new SelectorCandidate({
              selector,
              strategy: SELECTOR_STRATEGIES.CSS_SELECTOR,
              confidence: 0.7,
              element,
              isUnique: await this.isUniqueSelector(selector, cdpService),
              isVisible: element.isVisible,
              boundingBox: element.boundingBox
            }));
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Generate XPath selectors
   */
  async generateXPathSelectors(elementDescription, pageContext, cdpService) {
    const candidates = [];

    if (cdpService) {
      const elements = await cdpService.findElements('*');
      for (const element of elements) {
        if (this.matchesDescription(element, elementDescription)) {
          const xpath = this.buildXPathSelector(element);
          if (xpath) {
            candidates.push(new SelectorCandidate({
              selector: xpath,
              strategy: SELECTOR_STRATEGIES.XPATH,
              confidence: 0.6,
              element,
              isUnique: await this.isUniqueXPathSelector(xpath, cdpService),
              isVisible: element.isVisible,
              boundingBox: element.boundingBox
            }));
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Generate accessibility selectors
   */
  async generateAccessibilitySelectors(elementDescription, pageContext, cdpService) {
    const candidates = [];

    const a11yAttributes = ['aria-label', 'aria-labelledby', 'role', 'title', 'alt'];
    
    for (const attr of a11yAttributes) {
      if (cdpService) {
        const elements = await cdpService.findElements(`[${attr}]`);
        for (const element of elements) {
          if (this.matchesDescription(element, elementDescription)) {
            let selector;
            if (attr === 'role') {
              selector = `[role="${element.attributes[attr]}"]`;
            } else {
              selector = `[${attr}="${element.attributes[attr]}"]`;
            }
            
            candidates.push(new SelectorCandidate({
              selector,
              strategy: SELECTOR_STRATEGIES.ACCESSIBILITY,
              confidence: 0.75,
              element,
              isUnique: await this.isUniqueSelector(selector, cdpService),
              isVisible: element.isVisible,
              boundingBox: element.boundingBox
            }));
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Build CSS selector from element
   */
  buildCSSSelector(element) {
    const parts = [];

    // Add tag name
    parts.push(element.tagName.toLowerCase());

    // Add class names
    if (element.attributes.class) {
      const classes = element.attributes.class.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        parts.push('.' + classes.join('.'));
      }
    }

    // Add other stable attributes
    const stableAttributes = ['name', 'type', 'placeholder'];
    for (const attr of stableAttributes) {
      if (element.attributes[attr]) {
        parts.push(`[${attr}="${element.attributes[attr]}"]`);
      }
    }

    return parts.join('');
  }

  /**
   * Build XPath selector from element
   */
  buildXPathSelector(element) {
    const parts = [];

    // Start with tag name
    parts.push(element.tagName.toLowerCase());

    // Add text content if available
    if (element.textContent && element.textContent.trim()) {
      parts.push(`[contains(text(), "${element.textContent.trim().substring(0, 50)}")]`);
    }

    // Add attributes
    for (const [attr, value] of Object.entries(element.attributes)) {
      if (['id', 'class', 'name', 'type'].includes(attr)) {
        parts.push(`[@${attr}="${value}"]`);
      }
    }

    return '//' + parts.join('');
  }

  /**
   * Check if element matches description
   */
  matchesDescription(element, description) {
    const descriptionLower = description.toLowerCase();
    
    // Check text content
    if (element.textContent && element.textContent.toLowerCase().includes(descriptionLower)) {
      return true;
    }

    // Check attributes
    for (const [attr, value] of Object.entries(element.attributes)) {
      if (value && value.toLowerCase().includes(descriptionLower)) {
        return true;
      }
    }

    // Check tag name for common elements
    const tagNameLower = element.tagName.toLowerCase();
    const commonTags = {
      'button': ['button', 'btn', 'submit', 'click'],
      'input': ['input', 'field', 'text', 'email', 'password'],
      'link': ['link', 'url', 'href', 'anchor'],
      'image': ['image', 'img', 'picture', 'photo']
    };

    if (commonTags[tagNameLower]) {
      return commonTags[tagNameLower].some(keyword => 
        descriptionLower.includes(keyword)
      );
    }

    return false;
  }

  /**
   * Check if selector is unique
   */
  async isUniqueSelector(selector, cdpService) {
    try {
      const elements = await cdpService.findElements(selector);
      return elements.length === 1;
    } catch {
      return false;
    }
  }

  /**
   * Check if XPath selector is unique
   */
  async isUniqueXPathSelector(xpath, cdpService) {
    try {
      const result = await cdpService.evaluate(`
        (function() {
          const elements = document.evaluate(
            ${JSON.stringify(xpath)},
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          );
          return elements.snapshotLength === 1;
        })()
      `);
      return result.value;
    } catch {
      return false;
    }
  }

  /**
   * Rank selectors by reliability
   */
  rankSelectors(candidates) {
    return candidates.sort((a, b) => {
      // Higher confidence first
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }

      // Unique selectors preferred
      if (a.isUnique !== b.isUnique) {
        return b.isUnique - a.isUnique;
      }

      // Visible elements preferred
      if (a.isVisible !== b.isVisible) {
        return b.isVisible - a.isVisible;
      }

      // Strategy priority
      const strategyOrder = {
        [SELECTOR_STRATEGIES.DATA_ATTRIBUTE]: 0,
        [SELECTOR_STRATEGIES.ID]: 1,
        [SELECTOR_STRATEGIES.CSS_SELECTOR]: 2,
        [SELECTOR_STRATEGIES.ACCESSIBILITY]: 3,
        [SELECTOR_STRATEGIES.XPATH]: 4,
        [SELECTOR_STRATEGIES.VISUAL]: 5
      };

      return strategyOrder[a.strategy] - strategyOrder[b.strategy];
    });
  }

  /**
   * Filter selectors based on criteria
   */
  filterSelectors(candidates) {
    return candidates.filter(candidate => {
      // Must meet minimum confidence
      if (candidate.confidence < CONFIG.SELECTORS.MIN_CONFIDENCE) {
        return false;
      }

      // Must be visible
      if (!candidate.isVisible) {
        return false;
      }

      // Limit number of candidates
      return true;
    }).slice(0, CONFIG.SELECTORS.MAX_CANDIDATES);
  }

  /**
   * Generate selector from text search
   */
  async generateSelectorFromText(text, cdpService) {
    try {
      const result = await cdpService.evaluate(`
        (function() {
          const matches = [];
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            {
              acceptNode: node => {
                const hasText = (node.innerText || '').trim();
                return hasText && hasText.includes(${JSON.stringify(text)}) 
                  ? NodeFilter.FILTER_ACCEPT 
                  : NodeFilter.FILTER_SKIP;
              }
            }
          );
          
          let node;
          while (node = walker.nextNode()) {
            // Find nearest clickable ancestor
            function findClickable(n) {
              if (!n) return null;
              const style = window.getComputedStyle(n);
              const isVisible = style && 
                style.display !== 'none' && 
                style.visibility !== 'hidden' && 
                n.offsetParent !== null;
              
              if (!isVisible) return null;
              
              if (n.tagName.match(/^(A|BUTTON)$/i) || 
                  n.onclick || 
                  (n.getAttribute && n.getAttribute('role') === 'button')) {
                return n;
              }
              
              return findClickable(n.parentElement);
            }
            
            const clickable = findClickable(node);
            if (clickable) {
              const rect = clickable.getBoundingClientRect();
              matches.push({
                element: clickable,
                text: clickable.innerText,
                rect: {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height
                }
              });
            }
          }
          
          return matches.slice(0, 10);
        })()
      `);

      if (result.value && result.value.length > 0) {
        const match = result.value[0];
        const selectors = await this.generateSelectors(
          `element with text "${text}"`,
          null,
          cdpService
        );
        return selectors.length > 0 ? selectors[0] : null;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to generate selector from text:', error);
      return null;
    }
  }
}

module.exports = SelectorGenerator;

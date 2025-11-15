/**
 * Universal Form Scraper - Detects and scrapes forms on any website
 */

import type { UniversalFormField } from './types';
import {
  extractFieldContext,
  extractSelectOptions,
  extractRadioOptions,
  extractCheckboxLabel,
} from './contextExtractor';
import {
  detectFieldType,
  extractConstraints,
  isFieldRequired,
  isSensitiveField,
  isFieldVisible,
  isFieldDisabled,
} from './fieldDetector';

const DEBUG = localStorage.getItem('verseFormDebug') === '1';

export class UniversalFormScraper {
  /**
   * Find all fillable fields on the page
   */
  findAllFields(): UniversalFormField[] {
    const fields: UniversalFormField[] = [];
    const processedElements = new Set<HTMLElement>();

    // Strategy 1: Find all standard form inputs
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(element => {
      const field = this.processField(element as HTMLElement);
      if (field && !processedElements.has(field.element)) {
        fields.push(field);
        processedElements.add(field.element);
      }
    });

    // Strategy 2: Find ARIA form controls
    const ariaControls = document.querySelectorAll(
      '[role="textbox"], [role="combobox"], [role="radio"], [role="checkbox"], [role="searchbox"]',
    );
    ariaControls.forEach(element => {
      if (!processedElements.has(element as HTMLElement)) {
        const field = this.processField(element as HTMLElement);
        if (field) {
          fields.push(field);
          processedElements.add(field.element);
        }
      }
    });

    // Strategy 3: Find contenteditable elements (rich text editors)
    const editables = document.querySelectorAll('[contenteditable="true"]');
    editables.forEach(element => {
      if (!processedElements.has(element as HTMLElement)) {
        const field = this.processField(element as HTMLElement);
        if (field) {
          fields.push(field);
          processedElements.add(field.element);
        }
      }
    });

    if (DEBUG) console.debug('[UniversalFormScraper] Found', fields.length, 'fields');
    return fields;
  }

  /**
   * Process a single field element
   */
  private processField(element: HTMLElement): UniversalFormField | null {
    // Skip if not visible or disabled
    if (!isFieldVisible(element)) return null;
    if (isFieldDisabled(element)) return null;

    // Detect field type
    const type = detectFieldType(element);
    if (type === 'unknown') return null;

    // Skip file inputs and password fields for security
    if (type === 'file' || type === 'password') return null;

    // Extract context
    const context = extractFieldContext(element);
    if (!context || context.trim() === '') {
      if (DEBUG) console.debug('[UniversalFormScraper] Skipping field with no context:', element);
      return null;
    }

    // Skip sensitive fields
    if (isSensitiveField(context, element)) {
      if (DEBUG) console.debug('[UniversalFormScraper] Skipping sensitive field:', context);
      return null;
    }

    // Extract options for choice fields
    let options: string[] | undefined;
    if (type === 'select' && element instanceof HTMLSelectElement) {
      options = extractSelectOptions(element);
    } else if (type === 'radio' && element instanceof HTMLInputElement) {
      options = extractRadioOptions(element);
    }

    // Get current value
    let currentValue: string | undefined;
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      currentValue = element.value;
    } else if (element instanceof HTMLSelectElement) {
      currentValue = element.value;
    }

    // Check if already filled
    if (currentValue && currentValue.trim() !== '') {
      if (DEBUG) console.debug('[UniversalFormScraper] Field already filled:', context);
      return null;
    }

    const field: UniversalFormField = {
      element,
      type,
      context,
      options,
      required: isFieldRequired(element),
      currentValue,
      constraints: extractConstraints(element),
      name: element.getAttribute('name') || undefined,
      id: element.id || undefined,
      groupName: element instanceof HTMLInputElement && type === 'radio' ? element.name : undefined,
    };

    return field;
  }

  /**
   * Find the first unanswered field
   */
  findFirstUnansweredField(): UniversalFormField | null {
    const fields = this.findAllFields();
    return fields.length > 0 ? fields[0] : null;
  }

  /**
   * Check if there are any unanswered fields
   */
  hasUnansweredFields(): boolean {
    return this.findAllFields().length > 0;
  }

  /**
   * Find submit button
   */
  findSubmitButton(): HTMLElement | null {
    // Look for submit buttons
    const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], [role="button"]');

    for (const button of Array.from(submitButtons)) {
      const text = button.textContent?.toLowerCase() || '';
      const value = button.getAttribute('value')?.toLowerCase() || '';

      if (text.includes('submit') || text.includes('send') || text.includes('save') || value.includes('submit')) {
        return button as HTMLElement;
      }
    }

    return null;
  }

  /**
   * Find next/continue button
   */
  findNextButton(): HTMLElement | null {
    const buttons = document.querySelectorAll('button, [role="button"], input[type="button"]');

    for (const button of Array.from(buttons)) {
      const text = button.textContent?.toLowerCase() || '';
      const value = button.getAttribute('value')?.toLowerCase() || '';

      if (text.includes('next') || text.includes('continue') || text.includes('forward') || value.includes('next')) {
        if (isFieldVisible(button as HTMLElement)) {
          return button as HTMLElement;
        }
      }
    }

    return null;
  }
}

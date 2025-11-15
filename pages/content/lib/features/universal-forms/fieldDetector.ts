/**
 * Field Detector - Detects field types and constraints
 */

import type { FieldType, FieldConstraints } from './types';

export function detectFieldType(element: HTMLElement): FieldType {
  const tagName = element.tagName.toLowerCase();

  // Standard HTML elements
  if (tagName === 'textarea') return 'textarea';
  if (tagName === 'select') return 'select';

  if (tagName === 'input') {
    const input = element as HTMLInputElement;
    const type = input.type.toLowerCase();
    return type as FieldType;
  }

  // Check ARIA roles for custom components
  const role = element.getAttribute('role');
  if (role === 'textbox') return 'text';
  if (role === 'combobox') return 'select';
  if (role === 'radio') return 'radio';
  if (role === 'checkbox') return 'checkbox';
  if (role === 'searchbox') return 'search';

  // Check for contenteditable (rich text editors)
  if (element.getAttribute('contenteditable') === 'true') return 'textarea';

  // Check for common class patterns
  const className = element.className.toLowerCase();
  if (className.includes('select') || className.includes('dropdown')) return 'select';
  if (className.includes('checkbox')) return 'checkbox';
  if (className.includes('radio')) return 'radio';

  return 'unknown';
}

export function extractConstraints(element: HTMLElement): FieldConstraints {
  const constraints: FieldConstraints = {};

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const pattern = element.getAttribute('pattern');
    if (pattern) constraints.pattern = pattern;

    const min = element.getAttribute('min');
    if (min) constraints.min = parseFloat(min);

    const max = element.getAttribute('max');
    if (max) constraints.max = parseFloat(max);

    const minLength = element.getAttribute('minlength');
    if (minLength) constraints.minLength = parseInt(minLength, 10);

    const maxLength = element.getAttribute('maxlength');
    if (maxLength) constraints.maxLength = parseInt(maxLength, 10);

    const step = element.getAttribute('step');
    if (step) constraints.step = parseFloat(step);
  }

  return Object.keys(constraints).length > 0 ? constraints : undefined;
}

export function isFieldRequired(element: HTMLElement): boolean {
  // Check required attribute
  if (element.hasAttribute('required')) return true;

  // Check aria-required
  if (element.getAttribute('aria-required') === 'true') return true;

  // Check for asterisk in label or nearby text
  const parent = element.parentElement;
  if (parent?.textContent?.includes('*')) return true;

  return false;
}

export function isSensitiveField(context: string, element: HTMLElement): boolean {
  const SENSITIVE_PATTERNS = [
    /password/i,
    /credit.*card|card.*number|cvv|cvc|card.*code/i,
    /social.*security|ssn/i,
    /bank.*account|routing.*number/i,
    /pin.*code|pin.*number/i,
    /security.*code|verification.*code/i,
  ];

  const combined = `${context} ${element.getAttribute('name') || ''} ${element.getAttribute('id') || ''}`;

  return SENSITIVE_PATTERNS.some(pattern => pattern.test(combined));
}

export function isFieldVisible(element: HTMLElement): boolean {
  if (!element) return false;

  // Check if element is in DOM
  if (!document.contains(element)) return false;

  // Check display and visibility
  const style = window.getComputedStyle(element);
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;

  // Check if parent is hidden
  let parent = element.parentElement;
  while (parent) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.display === 'none') return false;
    if (parentStyle.visibility === 'hidden') return false;
    parent = parent.parentElement;
  }

  // Check if element has size
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;

  return true;
}

export function isFieldDisabled(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled')) return true;
  if (element.hasAttribute('readonly')) return true;
  if (element.getAttribute('aria-disabled') === 'true') return true;

  return false;
}

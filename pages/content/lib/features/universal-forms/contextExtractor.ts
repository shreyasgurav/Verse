/**
 * Context Extractor - Extracts question/label context from form fields
 */

export function extractFieldContext(input: HTMLElement): string {
  const context: string[] = [];

  // 1. Associated <label> via for/id (most reliable)
  const inputId = input.id;
  if (inputId) {
    const label = document.querySelector(`label[for="${inputId}"]`);
    if (label?.textContent?.trim()) {
      context.push(label.textContent.trim());
    }
  }

  // 2. aria-labelledby
  const labelledBy = input.getAttribute('aria-labelledby');
  if (labelledBy) {
    const label = document.getElementById(labelledBy);
    if (label?.textContent?.trim()) {
      context.push(label.textContent.trim());
    }
  }

  // 3. Parent label
  const parentLabel = input.closest('label');
  if (parentLabel?.textContent?.trim()) {
    // Get label text but exclude the input's value
    const labelText = Array.from(parentLabel.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && node !== input))
      .map(node => node.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    if (labelText) context.push(labelText);
  }

  // 4. aria-label
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel?.trim()) {
    context.push(ariaLabel.trim());
  }

  // 5. Placeholder text
  const placeholder = input.getAttribute('placeholder');
  if (placeholder?.trim()) {
    context.push(placeholder.trim());
  }

  // 6. title attribute
  const title = input.getAttribute('title');
  if (title?.trim()) {
    context.push(title.trim());
  }

  // 7. Previous sibling elements (often contain labels)
  let prev = input.previousElementSibling;
  let attempts = 0;
  while (prev && attempts < 3) {
    const text = prev.textContent?.trim();
    if (text && text.length < 200) {
      // Avoid long text blocks
      context.push(text);
      break;
    }
    prev = prev.previousElementSibling;
    attempts++;
  }

  // 8. Parent element text (if not too long)
  const parent = input.parentElement;
  if (parent && context.length < 2) {
    const parentText = Array.from(parent.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    if (parentText && parentText.length < 200) {
      context.push(parentText);
    }
  }

  // 9. data-* attributes
  const dataLabel =
    input.getAttribute('data-label') ||
    input.getAttribute('data-name') ||
    input.getAttribute('data-field') ||
    input.getAttribute('data-placeholder');
  if (dataLabel?.trim()) {
    context.push(dataLabel.trim());
  }

  // 10. name attribute (convert to readable text)
  const name = input.getAttribute('name');
  if (name && context.length < 2) {
    const readable = name
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (readable && readable.length > 2) {
      context.push(readable);
    }
  }

  // 11. Fieldset legend (for grouped fields)
  const fieldset = input.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend?.textContent?.trim()) {
      context.push(`Group: ${legend.textContent.trim()}`);
    }
  }

  // Deduplicate and join
  const uniqueContext = [...new Set(context.filter(Boolean))];
  return uniqueContext.join(' | ');
}

export function extractSelectOptions(select: HTMLSelectElement): string[] {
  const options: string[] = [];
  Array.from(select.options).forEach(option => {
    const text = option.textContent?.trim();
    if (text && text !== '' && text !== '--' && text !== 'Select' && text !== 'Choose') {
      options.push(text);
    }
  });
  return options;
}

export function extractRadioOptions(input: HTMLInputElement): string[] {
  const name = input.name;
  if (!name) return [];

  const options: string[] = [];
  const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);

  radios.forEach(radio => {
    // Try to find label for this radio
    const radioId = radio.id;
    let label = null;

    if (radioId) {
      label = document.querySelector(`label[for="${radioId}"]`);
    }

    if (!label) {
      label = radio.closest('label');
    }

    if (label?.textContent?.trim()) {
      const text = label.textContent.trim();
      if (!options.includes(text)) {
        options.push(text);
      }
    } else if (radio.getAttribute('value')) {
      const value = radio.getAttribute('value')!;
      if (!options.includes(value)) {
        options.push(value);
      }
    }
  });

  return options;
}

export function extractCheckboxLabel(input: HTMLInputElement): string {
  // Try to find label for this checkbox
  const inputId = input.id;
  let label = null;

  if (inputId) {
    label = document.querySelector(`label[for="${inputId}"]`);
  }

  if (!label) {
    label = input.closest('label');
  }

  if (label?.textContent?.trim()) {
    return label.textContent.trim();
  }

  return input.getAttribute('value') || '';
}

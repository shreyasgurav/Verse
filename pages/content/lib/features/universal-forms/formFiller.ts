/**
 * Universal Form Filler - Fills forms on any website
 */

import { sleep } from '../shared/utils';
import { UniversalFormScraper } from './scraper';
import type { UniversalFormField } from './types';

const DEBUG = localStorage.getItem('verseFormDebug') === '1';

export function init() {
  if ((window as any).__VERSE_UNIVERSAL_FORM_FILLER_INITIALIZED__) return;
  (window as any).__VERSE_UNIVERSAL_FORM_FILLER_INITIALIZED__ = true;

  let isRunning = false;
  let cancelRun = false;
  const scraper = new UniversalFormScraper();

  // Listen for messages from side panel to start/stop filling
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_FORM_FILL') {
      handleFormFill();
      sendResponse({ ok: true });
    } else if (message.type === 'STOP_FORM_FILL') {
      cancelRun = true;
      isRunning = false;
      // Notify side panel that filling stopped
      chrome.runtime.sendMessage({ type: 'FORM_FILL_STOPPED' }).catch(() => {});
      sendResponse({ ok: true });
    }
    return true;
  });

  async function getAnswerForField(field: UniversalFormField): Promise<string | null> {
    if (cancelRun) return null;

    try {
      const resp = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Backend timeout')), 30000);
        chrome.runtime.sendMessage(
          {
            type: 'FILL_UNIVERSAL_FORM_FIELD',
            field: {
              context: field.context,
              type: field.type,
              options: field.options,
              required: field.required,
              constraints: field.constraints,
            },
          },
          (r: any) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(r);
          },
        );
      });

      if (!resp || !resp.ok) return null;
      return resp.answer;
    } catch (err) {
      console.error('[UniversalFormFiller] Error getting answer:', err);
      return null;
    }
  }

  async function fillField(field: UniversalFormField, answer: string): Promise<boolean> {
    if (cancelRun) return false;

    try {
      const element = field.element;

      // Scroll into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(200);

      if (cancelRun) return false;

      // Handle different field types
      if (field.type === 'select' && element instanceof HTMLSelectElement) {
        // Find matching option
        const options = Array.from(element.options);
        const matchedOption = options.find(
          opt => opt.textContent?.toLowerCase().includes(answer.toLowerCase()) || opt.value === answer,
        );

        if (matchedOption) {
          element.value = matchedOption.value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('input', { bubbles: true }));
          if (DEBUG) console.debug('[UniversalFormFiller] ✓ Selected option:', answer);
          return true;
        }
      } else if (field.type === 'radio' && element instanceof HTMLInputElement) {
        // For radio buttons, we need to find the matching option and click it
        const name = element.name;
        const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);

        for (const radio of Array.from(radios)) {
          const label = radio.id
            ? document.querySelector(`label[for="${radio.id}"]`)
            : (radio as HTMLElement).closest('label');

          const labelText = label?.textContent?.toLowerCase() || '';
          const radioValue = (radio as HTMLInputElement).value.toLowerCase();

          if (labelText.includes(answer.toLowerCase()) || radioValue === answer.toLowerCase()) {
            (radio as HTMLInputElement).click();
            await sleep(100);
            if (DEBUG) console.debug('[UniversalFormFiller] ✓ Selected radio:', answer);
            return true;
          }
        }
      } else if (field.type === 'checkbox' && element instanceof HTMLInputElement) {
        // For checkbox, check if answer is affirmative
        const affirmative = /^(yes|y|true|1|agree|accept|check)$/i.test(answer);
        if (affirmative && !element.checked) {
          element.click();
          await sleep(100);
          if (DEBUG) console.debug('[UniversalFormFiller] ✓ Checked checkbox');
          return true;
        }
      } else if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element.getAttribute('contenteditable') === 'true'
      ) {
        // Text-based inputs
        element.focus();

        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.value = answer;
        } else {
          // contenteditable
          element.textContent = answer;
        }

        // Trigger events for validation
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        element.blur();

        await sleep(100);
        if (DEBUG) console.debug('[UniversalFormFiller] ✓ Filled text field:', answer);
        return true;
      }

      return false;
    } catch (err) {
      console.error('[UniversalFormFiller] Error filling field:', err);
      return false;
    }
  }

  async function handleFormFill(): Promise<void> {
    if (isRunning) {
      cancelRun = true;
      return;
    }

    try {
      isRunning = true;
      cancelRun = false;

      // Notify side panel that filling started
      chrome.runtime.sendMessage({ type: 'FORM_FILL_STARTED' }).catch(() => {});

      let totalFilled = 0;
      let totalSkipped = 0;
      let attempts = 0;
      const maxAttempts = 100;

      while (attempts < maxAttempts && !cancelRun) {
        attempts++;

        // Find first unanswered field
        const field = scraper.findFirstUnansweredField();

        if (!field) {
          if (DEBUG) console.debug('[UniversalFormFiller] No more fields to fill');
          break;
        }

        if (DEBUG) console.debug('[UniversalFormFiller] Processing field:', field.context);

        // Get answer from AI
        const answer = await getAnswerForField(field);
        if (cancelRun) break;

        if (!answer || answer.trim() === '') {
          if (DEBUG) console.warn('[UniversalFormFiller] No answer for field:', field.context);
          totalSkipped++;
          // Skip this field and continue
          field.element.setAttribute('data-verse-skipped', 'true');
          continue;
        }

        // Fill the field
        const success = await fillField(field, answer);
        if (success) {
          totalFilled++;
          if (DEBUG) console.debug('[UniversalFormFiller] ✓ Filled field', totalFilled);
        } else {
          totalSkipped++;
        }

        if (cancelRun) break;

        // Small delay between fields
        await sleep(200);

        // Check if we should click "Next" button
        const nextButton = scraper.findNextButton();
        if (nextButton && !scraper.hasUnansweredFields()) {
          if (DEBUG) console.debug('[UniversalFormFiller] Clicking Next button');
          nextButton.click();
          await sleep(1000); // Wait for page to load
        }
      }

      if (DEBUG)
        console.debug(
          `[UniversalFormFiller] Complete - Filled: ${totalFilled}, Skipped: ${totalSkipped}, Attempts: ${attempts}`,
        );

      // Notify side panel that filling completed
      if (!cancelRun) {
        chrome.runtime.sendMessage({ type: 'FORM_FILL_COMPLETE' }).catch(() => {});
      }
    } catch (e) {
      console.error('[UniversalFormFiller] Fatal error:', e);
      chrome.runtime.sendMessage({ type: 'FORM_FILL_STOPPED' }).catch(() => {});
    } finally {
      isRunning = false;
      cancelRun = false;
    }
  }

  if (DEBUG)
    console.debug('[UniversalFormFiller] Initialized. Toggle debug: localStorage.setItem("verseFormDebug","1")');
}

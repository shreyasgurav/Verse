/**
 * Google Forms Auto-Filler Content Script
 * Detects Google Forms and provides auto-fill functionality via side panel
 */

import { sleep, isVisible } from '../shared/utils';

export function init() {
  if ((window as any).__VERSE_FORM_FILLER_INITIALIZED__) return;
  (window as any).__VERSE_FORM_FILLER_INITIALIZED__ = true;

  const DEBUG = localStorage.getItem('verseFormDebug') === '1';
  let isRunning = false;
  let cancelRun = false;

  function visibleSectionRoot(): HTMLElement {
    const candidates = [
      ...Array.from(document.querySelectorAll('.freebirdFormviewerViewNumberedItemContainer')),
      ...Array.from(document.querySelectorAll('[data-params*="page"]')),
      ...Array.from(document.querySelectorAll('.Qr7Oae')).map(el => el?.closest('div[jsmodel]')),
      ...Array.from(document.querySelectorAll('form, .lRwqcd, .XoLGyd, .Uc2NEf, main')),
    ].filter(Boolean) as HTMLElement[];
    const root = candidates.find(isVisible) || document.body;
    if (DEBUG) console.debug('[FormFiller] visibleSectionRoot:', root);
    return root;
  }

  interface FormItem {
    question: string;
    type: 'text' | 'choice' | 'unknown';
    options: string[];
    node: HTMLElement;
  }

  function scrapeCurrentSection(): FormItem[] {
    const root = visibleSectionRoot();
    const items: FormItem[] = [];
    const seen = new Set<string>();
    const questionNodes = root.querySelectorAll(
      '[role="listitem"], .Qr7Oae, .geS5n, .KHxj8b, .freebirdFormviewerComponentsQuestionBaseRoot',
    );

    questionNodes.forEach(node => {
      if (!isVisible(node)) return;

      const qEl = node.querySelector(
        '.M7eMe, .Y6Myld, .YEVVod, .HoXoMd, [role="heading"], .AgroKb, .freebirdFormviewerComponentsQuestionBaseTitle',
      );
      const questionText = (qEl?.textContent || '').replace(/\s+/g, ' ').trim();

      if (!questionText || seen.has(questionText)) return;
      seen.add(questionText);

      const options: string[] = [];
      node
        .querySelectorAll(
          'label, [role="radio"], [role="checkbox"], .Od2TWd, .appmagic-radio-label, .appmagic-checkbox-label, .aDTYNe',
        )
        .forEach(opt => {
          const t = (opt.textContent || '').replace(/\s+/g, ' ').trim();
          if (t && !options.includes(t)) options.push(t);
        });

      const inputType = node.querySelector('input[type="text"], textarea, input[type="email"], input[type="tel"]')
        ? 'text'
        : options.length
          ? 'choice'
          : 'unknown';

      items.push({ question: questionText, type: inputType, options, node: node as HTMLElement });
    });

    if (DEBUG) console.debug('[FormFiller] Scraped:', items.length, 'items');
    return items;
  }

  function normalize(str: string): string {
    return (str || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function canonical(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  function parseOptionLetter(optionText: string): string | null {
    const m = optionText.match(/^\((\w)\)\s*/i);
    return m ? m[1].toLowerCase() : null;
  }

  interface OptionInfo {
    text: string;
    normText: string;
    canonText: string;
    letter: string | null;
    index1: number;
  }

  function buildOptionIndex(options: string[]): OptionInfo[] {
    return options.map((text, idx) => ({
      text,
      normText: normalize(text),
      canonText: canonical(text),
      letter: parseOptionLetter(text),
      index1: idx + 1,
    }));
  }

  function coerceDesired(raw: any): string {
    if (raw == null) return '';
    if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
    if (typeof raw === 'object') {
      return String(raw.value ?? raw.answer ?? raw.option ?? raw.text ?? raw.choice ?? '');
    }
    return String(raw);
  }

  function matchOption(desiredRaw: any, optionInfos: OptionInfo[]): OptionInfo | null {
    const desiredStr = coerceDesired(desiredRaw);
    const desired = normalize(desiredStr);
    const desiredCanon = canonical(desiredStr);
    if (!desired && !desiredCanon) return null;

    // 0) Letter index direct mapping a->1, b->2, ... regardless of option text
    const letterOnly = desiredStr.trim().match(/^\(?([a-zA-Z])\)?$/);
    if (letterOnly) {
      const li = letterOnly[1].toLowerCase().charCodeAt(0) - 97; // a=0
      if (li >= 0 && li < optionInfos.length) return optionInfos[li];
    }

    // 1) Exact normalized text match
    let info = optionInfos.find(o => o.normText === desired || o.canonText === desiredCanon);
    if (info) return info;

    // 2) Match by letter extracted from option text like (a)
    const letter =
      desired
        .replace(/[^a-z0-9]/g, '')
        .match(/^[a-z]$/i)?.[0]
        ?.toLowerCase() ||
      desired.match(/^\(?([a-z])\)?$/i)?.[1]?.toLowerCase() ||
      desired.match(/option\s*([a-z])/i)?.[1]?.toLowerCase();
    if (letter) {
      info = optionInfos.find(o => o.letter === letter);
      if (info) return info;
    }

    // 3) Match by numbers like '1', '2', '3', or '(1)'
    const numMatch = desired.match(/^\(?([0-9]{1,2})\)?$/);
    if (numMatch) {
      const n = parseInt(numMatch[1], 10);
      info = optionInfos.find(o => o.index1 === n);
      if (info) return info;
      if (n >= 1 && n <= optionInfos.length) return optionInfos[n - 1];
    }

    // 4) Fuzzy contains (canonical)
    info = optionInfos.find(o => o.canonText.includes(desiredCanon) || desiredCanon.includes(o.canonText));
    if (info) return info;

    return null;
  }

  function findClickableForOption(optNode: Element): HTMLElement {
    return (
      (optNode.querySelector('input') as HTMLElement) ||
      (optNode.closest('[role="radio"]') as HTMLElement) ||
      (optNode.closest('[role="checkbox"]') as HTMLElement) ||
      (optNode.querySelector('[role="radio"], [role="checkbox"]') as HTMLElement) ||
      (optNode.querySelector('.AB7Lab, .aDTYNe') as HTMLElement) ||
      (optNode as HTMLElement)
    );
  }

  function isAnswered(item: FormItem): boolean {
    if (item.type === 'choice') {
      return !!item.node.querySelector('input[checked], input:checked, [aria-checked="true"]');
    }
    if (item.type === 'text') {
      const field = item.node.querySelector('input[type="text"], textarea, input[type="email"], input[type="tel"]') as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      return !!(field && field.value && field.value.trim().length > 0);
    }
    return false;
  }

  async function throttle(fn: () => void, delay: number): Promise<void> {
    fn();
    await sleep(delay);
  }

  async function applySingle(item: FormItem, desired: any): Promise<boolean> {
    if (cancelRun) return false;
    const desiredStr = coerceDesired(desired);
    if (!desiredStr || desiredStr.trim() === '') {
      if (DEBUG) console.debug('[FormFiller] No answer for:', item.question);
      return false;
    }

    try {
      if (item.type === 'choice') {
        const optionNodes = Array.from(
          item.node.querySelectorAll(
            'label, [role="radio"], [role="checkbox"], .Od2TWd, .appmagic-radio-label, .appmagic-checkbox-label, .aDTYNe',
          ),
        );
        const infoList = buildOptionIndex(item.options);
        const matchedInfo = matchOption(desired, infoList);

        if (!matchedInfo) {
          if (DEBUG) console.warn('[FormFiller] No matching option for:', item.question, 'desired:', desired);
          return false;
        }

        let clicked = false;
        for (const opt of optionNodes) {
          const text = (opt.textContent || '').replace(/\s+/g, ' ').trim();
          if (canonical(text) === matchedInfo.canonText || normalize(text) === matchedInfo.normText) {
            const clickable = findClickableForOption(opt);
            await throttle(() => (clickable instanceof HTMLElement ? clickable : (opt as HTMLElement)).click(), 100);
            clicked = true;
            break;
          }
        }
        if (!clicked) return false;
        if (cancelRun) return false;
        // Verify it was actually selected
        await sleep(150);
        if (isAnswered(item)) {
          if (DEBUG) console.debug('[FormFiller] ✓ Answered:', item.question);
          return true;
        } else {
          if (DEBUG) console.warn('[FormFiller] Click failed for:', item.question);
          return false;
        }
      } else if (item.type === 'text') {
        const field = item.node.querySelector(
          'input[type="text"], textarea, input[type="email"], input[type="tel"]',
        ) as HTMLInputElement | HTMLTextAreaElement | null;
        if (!field) {
          if (DEBUG) console.warn('[FormFiller] No input field for:', item.question);
          return false;
        }

        field.focus();
        field.value = desiredStr;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        field.blur();
        await sleep(100);
        if (cancelRun) return false;

        if (DEBUG) console.debug('[FormFiller] ✓ Filled:', item.question);
        return true;
      }
    } catch (err) {
      console.error('[FormFiller] Error applying answer:', err, item.question);
      return false;
    }

    return false;
  }

  async function getAnswerForQuestion(item: FormItem): Promise<any> {
    if (cancelRun) return undefined;

    // Send only this one question to AI
    const payload = [
      {
        question: item.question,
        type: item.type,
        options: item.options,
      },
    ];

    try {
      const resp = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Backend timeout')), 30000);
        chrome.runtime.sendMessage(
          {
            type: 'FILL_FORM_QUESTION',
            form: payload,
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
      if (!resp || !resp.ok) return undefined;

      // Extract the answer (should be first item in answersByIndex or from answersByQuestion)
      if (Array.isArray(resp.answersByIndex) && resp.answersByIndex.length > 0) {
        return resp.answersByIndex[0];
      }
      if (resp.answersByQuestion && resp.answersByQuestion[item.question]) {
        return resp.answersByQuestion[item.question];
      }
      return undefined;
    } catch (err) {
      console.error('[FormFiller] Error getting answer:', err);
      return undefined;
    }
  }

  async function processPage(): Promise<{ applied: number; missed: number }> {
    const items = scrapeCurrentSection();
    if (!items.length) {
      if (DEBUG) console.debug('[FormFiller] No questions found on page');
      return { applied: 0, missed: 0 };
    }

    let applied = 0;
    let missed = 0;

    // Process questions one at a time
    for (let i = 0; i < items.length; i++) {
      if (cancelRun) break;
      const item = items[i];

      // Skip if already answered
      if (isAnswered(item)) {
        if (DEBUG) console.debug('[FormFiller] Question already answered:', item.question);
        continue;
      }

      // Scroll into view before interaction
      try {
        item.node.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
        await sleep(120);
      } catch {
        item.node.scrollIntoView({ block: 'center' });
        await sleep(180);
      }
      if (cancelRun) break;

      // Get answer for this specific question (with retry if empty)
      let answer = await getAnswerForQuestion(item);
      if (cancelRun) break;

      if (answer == null || answer === '') {
        // Retry once
        await sleep(150);
        if (cancelRun) break;
        answer = await getAnswerForQuestion(item);
      }

      if (answer == null || answer === '') {
        if (DEBUG) console.warn('[FormFiller] No answer for question:', item.question);
        missed++;
        continue;
      }

      // Fill the answer
      const success = await applySingle(item, answer);
      if (success) {
        applied++;
        if (DEBUG) console.debug('[FormFiller] ✓ Filled question', i + 1, 'of', items.length);
      } else {
        missed++;
      }

      if (cancelRun) break;
      await sleep(90); // Small delay between questions
    }

    if (DEBUG) console.debug('[FormFiller] Page complete - Applied:', applied, 'Missed:', missed);
    return { applied, missed };
  }

  function findButton(textRegex: RegExp): HTMLElement | undefined {
    const candidates = Array.from(
      document.querySelectorAll(
        '[role="button"], button, .uArJ5e, .freebirdFormviewerViewNavigationButtonsAndProgress button',
      ),
    ) as HTMLElement[];
    return candidates.find(b => isVisible(b) && textRegex.test((b.textContent || '').toLowerCase()));
  }

  async function waitForPageLoad(): Promise<boolean> {
    await sleep(700);
    for (let i = 0; i < 15; i++) {
      if (cancelRun) return false;
      const items = scrapeCurrentSection();
      if (items.length) {
        await sleep(200);
        return true;
      }
      await sleep(200);
    }
    if (DEBUG) console.warn('[FormFiller] Page load timeout');
    return false;
  }

  async function clickNextIfAny(): Promise<boolean> {
    const next = findButton(/^(next|continue|go to next|forward)$/i) || findButton(/next/i) || findButton(/continue/i);
    if (!next) return false;
    if (DEBUG) console.debug('[FormFiller] Clicking Next...');
    next.click();
    const loaded = await waitForPageLoad();
    if (!loaded) {
      if (DEBUG) console.warn('[FormFiller] Next page failed to load');
      return false;
    }
    return true;
  }

  function isSubmitPage(): boolean {
    return !!(findButton(/submit/i) || findButton(/send/i));
  }

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

  async function handleFormFill(): Promise<void> {
    // Toggle: stop if running
    if (isRunning) {
      cancelRun = true;
      return;
    }

    try {
      isRunning = true;
      cancelRun = false;

      // Notify side panel that filling started
      chrome.runtime.sendMessage({ type: 'FORM_FILL_STARTED' }).catch(() => {});

      let totalApplied = 0;
      let totalMissed = 0;
      let pageCount = 0;

      for (let step = 0; step < 100 && !cancelRun; step++) {
        pageCount++;
        if (DEBUG) console.debug(`[FormFiller] === Page ${pageCount} ===`);

        const { applied, missed } = await processPage();
        totalApplied += applied;
        totalMissed += missed;

        if (cancelRun) {
          // Notify side panel that filling stopped
          chrome.runtime.sendMessage({ type: 'FORM_FILL_STOPPED' }).catch(() => {});
          break;
        }
        if (isSubmitPage()) {
          if (DEBUG) console.debug('[FormFiller] Reached submit page');
          break;
        }

        const advanced = await clickNextIfAny();
        if (!advanced) {
          if (DEBUG) console.debug('[FormFiller] No more pages');
          break;
        }
        await sleep(300);
      }

      if (DEBUG)
        console.debug(`[FormFiller] Complete - Pages: ${pageCount}, Applied: ${totalApplied}, Missed: ${totalMissed}`);

      // Notify side panel that filling completed
      if (!cancelRun) {
        chrome.runtime.sendMessage({ type: 'FORM_FILL_COMPLETE' }).catch(() => {});
      }
    } catch (e) {
      console.error('[FormFiller] Fatal error:', e);
      // Notify side panel that filling stopped due to error
      chrome.runtime.sendMessage({ type: 'FORM_FILL_STOPPED' }).catch(() => {});
    } finally {
      isRunning = false;
      cancelRun = false;
    }
  }

  if (DEBUG) console.debug('[FormFiller] Helper loaded. Toggle debug: localStorage.setItem("verseFormDebug","1")');
}

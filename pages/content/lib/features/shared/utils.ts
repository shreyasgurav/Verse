/**
 * Shared utilities for content script features
 */

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export function isVisible(node: Node | HTMLElement | null): boolean {
  if (!node) return false;
  const el = (node as HTMLElement).nodeType === 1 ? (node as HTMLElement) : (node as Node).parentElement;
  if (!el) return false;
  if (el.closest('[aria-hidden="true"]')) return false;
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
  const styles = getComputedStyle(el);
  return styles.visibility !== 'hidden' && styles.display !== 'none' && styles.opacity !== '0';
}

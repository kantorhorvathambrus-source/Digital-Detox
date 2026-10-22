// App-level notices (e.g. storage problems), shown above the page content.
// The container is an aria-live region, so screen readers announce new
// notices without moving focus.

import { strings } from './strings.js';
import { html } from './html.js';
import { icon } from './icons.js';

const region = () => document.getElementById('notices');

/** Shows a dismissible notice. Showing the same text twice has no effect. */
export function showNotice(message) {
  const container = region();
  if (!container) return;
  const exists = [...container.querySelectorAll('.notice-text')].some((el) => el.textContent === message);
  if (exists) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'notice';
  wrapper.innerHTML = String(html`
    ${icon('info')}
    <p class="notice-text">${message}</p>
    <button type="button" class="notice-close" aria-label="${strings.common.close}">${icon('x', { size: 'sm' })}</button>
  `);
  wrapper.querySelector('.notice-close').addEventListener('click', () => {
    wrapper.remove();
    document.getElementById('main')?.focus({ preventScroll: true });
  });
  container.append(wrapper);
}

import { strings } from '../strings.js';
import { html } from '../html.js';

/** Settings (#/settings). Built in phase 5. */
export function render(root) {
  root.innerHTML = String(html`
    <section class="page">
      <header class="page-header">
        <h1 tabindex="-1">${strings.titles.settings}</h1>
        <p class="muted">${strings.common.comingSoon}</p>
      </header>
    </section>
  `);
}

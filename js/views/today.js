import { strings } from '../strings.js';
import { html } from '../html.js';

/** Today main screen (#/today). Built in phase 3. */
export function render(root) {
  root.innerHTML = String(html`
    <section class="page">
      <header class="page-header">
        <h1 tabindex="-1">${strings.titles.today}</h1>
        <p class="muted">${strings.common.comingSoon}</p>
      </header>
    </section>
  `);
}

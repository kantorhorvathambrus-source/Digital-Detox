import { strings } from '../strings.js';
import { html } from '../html.js';

/** Evening check-in (#/checkin). Built in phase 3. */
export function render(root) {
  root.innerHTML = String(html`
    <section class="page">
      <header class="page-header">
        <h1 tabindex="-1">${strings.titles.checkin}</h1>
        <p class="muted">${strings.common.comingSoon}</p>
      </header>
    </section>
  `);
}

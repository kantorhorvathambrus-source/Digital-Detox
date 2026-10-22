// Entry point: loads data, applies the theme, and runs a simple hash router.
//
// Routes: #/start, #/today, #/checkin, #/history, #/summary, #/settings
// A route can carry query parameters after "?", e.g. #/checkin?date=2026-10-22.
// Each view module exports render(root, ctx) and may return a cleanup function.

import { strings, format } from './strings.js';
import * as store from './store.js';
import { todayISO, msUntilNextMidnight } from './dates.js';
import { html } from './html.js';
import { icon } from './icons.js';
import { applyTheme } from './theme.js';
import { showNotice } from './notice.js';

import * as contractView from './views/contract.js';
import * as todayView from './views/today.js';
import * as checkinView from './views/checkin.js';
import * as historyView from './views/history.js';
import * as summaryView from './views/summary.js';
import * as settingsView from './views/settings.js';

// tab:            which tab bar item is highlighted (no tab = tab bar hidden)
// requiresActive: only reachable while a challenge is active
// keepOnRefresh:  contains a form, so do not re-render it automatically
//                 (at midnight or when another tab changes the data)
const ROUTES = {
  start: { view: contractView, title: strings.titles.start, keepOnRefresh: true },
  today: { view: todayView, title: strings.titles.today, tab: 'today', requiresActive: true },
  checkin: { view: checkinView, title: strings.titles.checkin, requiresActive: true, keepOnRefresh: true },
  history: { view: historyView, title: strings.titles.history, tab: 'history' },
  summary: { view: summaryView, title: strings.titles.summary, tab: 'history' },
  settings: { view: settingsView, title: strings.titles.settings, tab: 'settings' },
};

const TABS = [
  { id: 'today', href: '#/today', icon: 'house', label: strings.nav.today },
  { id: 'history', href: '#/history', icon: 'notebook-pen', label: strings.nav.history },
  { id: 'settings', href: '#/settings', icon: 'settings', label: strings.nav.settings },
];

const app = document.getElementById('app');
const main = document.getElementById('main');
const tabbar = document.getElementById('tabbar');
const skipLink = document.getElementById('skip-link');

let currentRoute = null;
let cleanup = null;
let renderedDay = null;

function parseHash() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, query = ''] = hash.split('?');
  return { name, params: new URLSearchParams(query) };
}

/** Decides where a requested route should actually go. */
function resolveRoute(name) {
  const active = store.getActiveChallenge();
  if (!ROUTES[name]) return active ? 'today' : 'start';
  if (ROUTES[name].requiresActive && !active) return 'start';
  if (name === 'start' && active) return 'today';
  return name;
}

function navigate(path) {
  location.hash = path;
}

/**
 * Renders the route in the URL.
 * moveFocus: true after the user navigated, so screen reader and keyboard
 * users land on the new page's heading.
 */
function render({ moveFocus }) {
  const { name, params } = parseHash();
  const target = resolveRoute(name);
  if (target !== name) {
    // replace() keeps the redirect out of the history, so Back still works.
    location.replace(`#/${target}`);
    return;
  }

  const route = ROUTES[name];
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  main.replaceChildren();

  const ctx = {
    params,
    navigate,
    refresh: () => render({ moveFocus: false }),
  };
  cleanup = route.view.render(main, ctx) ?? null;

  document.title = format(strings.pageTitle, { title: route.title });
  updateTabbar(route.tab);
  currentRoute = name;
  renderedDay = todayISO();

  if (moveFocus) {
    window.scrollTo(0, 0);
    (main.querySelector('h1') ?? main).focus({ preventScroll: true });
  }
}

/** Re-renders the current page unless it holds a form the user may be filling in. */
function refreshIfSafe() {
  if (currentRoute && ROUTES[currentRoute].keepOnRefresh) return;
  render({ moveFocus: false });
}

function buildTabbar() {
  tabbar.setAttribute('aria-label', strings.nav.label);
  tabbar.innerHTML = String(html`
    <ul class="tabbar-list">
      ${TABS.map((tab) => html`
        <li>
          <a class="tabbar-link" href="${tab.href}" data-tab="${tab.id}">
            <span class="tabbar-icon">${icon(tab.icon)}</span>
            <span>${tab.label}</span>
          </a>
        </li>
      `)}
    </ul>
  `);
}

function updateTabbar(activeTab) {
  tabbar.hidden = !activeTab;
  app.classList.toggle('has-tabbar', Boolean(activeTab));
  for (const link of tabbar.querySelectorAll('.tabbar-link')) {
    if (link.dataset.tab === activeTab) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

function setupSkipLink() {
  skipLink.textContent = strings.skipLink;
  // A normal href="#main" would change the hash and trigger the router.
  skipLink.addEventListener('click', (event) => {
    event.preventDefault();
    main.focus();
  });
}

/** Re-renders when the date changes (app left open overnight or resumed next day). */
function watchDayChange() {
  const check = () => {
    if (renderedDay !== todayISO()) refreshIfSafe();
  };
  const schedule = () => {
    setTimeout(() => {
      check();
      schedule();
    }, msUntilNextMidnight());
  };
  schedule();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
}

function init() {
  store.load();
  applyTheme(store.getState().settings.theme);

  setupSkipLink();
  buildTabbar();

  const issue = store.getIssue();
  if (issue) showNotice(strings.notices[issue]);

  window.addEventListener('hashchange', () => render({ moveFocus: true }));

  // Data changed in another tab of the app: reload it.
  window.addEventListener('storage', (event) => {
    if (event.key !== store.STORAGE_KEY && event.key !== null) return;
    store.load();
    applyTheme(store.getState().settings.theme);
    refreshIfSafe();
  });

  watchDayChange();
  render({ moveFocus: false });
}

init();

// Theme handling: 'system' follows the OS setting, 'light' / 'dark' force one.
// The colours themselves are defined in css/tokens.css.

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

/** Sets data-theme on <html> and updates the browser UI colour. */
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') {
    root.setAttribute('data-theme', theme);
  } else {
    root.removeAttribute('data-theme');
  }
  syncThemeColor();
}

/** Keeps <meta name="theme-color"> (Android status bar) in sync with the background. */
function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const color = getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim();
  if (color) meta.setAttribute('content', color);
}

// When following the system, react to the OS switching between light and dark.
darkQuery.addEventListener('change', syncThemeColor);

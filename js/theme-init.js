// Loaded as a classic (blocking) script in <head>, before the CSS is painted,
// so a forced light/dark theme is applied without a flash of the wrong colours.
// The full theme logic lives in theme.js.
(function () {
  try {
    var data = JSON.parse(localStorage.getItem('detox.v1'));
    var theme = data && data.settings && data.settings.theme;
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (e) {
    // No stored theme or no storage: follow the system setting.
  }
})();

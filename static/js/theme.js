// Theme toggle.
//
// The saved choice is applied by a tiny inline script in <head>, before first
// paint, so an explicit light/dark pick never flashes the other one. This file
// only handles the control: which way it flips, and what it announces.
//
// With no saved choice the page follows the system, and keeps following it.
(function () {
  var root = document.documentElement;
  var button = document.getElementById('theme-toggle');
  if (!button) return;

  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function current() {
    var chosen = root.dataset.theme;
    if (chosen === 'light' || chosen === 'dark') return chosen;
    return media.matches ? 'dark' : 'light';
  }

  function describe() {
    button.setAttribute(
      'aria-label',
      current() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    );
  }

  button.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch (err) {
      /* Blocked storage: the choice still applies for this page view. */
    }
    describe();
  });

  // Only relevant while the visitor hasn't overridden the system.
  media.addEventListener('change', function () {
    if (!root.dataset.theme) describe();
  });

  describe();
})();

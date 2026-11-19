// Experience accordion.
//
// Entries toggle independently (so two roles can be compared side by side) and
// each one is deep-linkable: /job-history#job-rannis opens and scrolls to it.
//
// The open/closed mark is drawn in CSS from the entry's state, so this file
// only has to move the state around.
(function () {
  var entries = Array.prototype.slice.call(
    document.querySelectorAll('.tl-entry')
  );
  if (!entries.length) return;

  function setOpen(entry, open) {
    var header = entry.querySelector('.tl-header');
    entry.classList.toggle('open', open);
    if (header) header.setAttribute('aria-expanded', String(open));
  }

  entries.forEach(function (entry) {
    var header = entry.querySelector('.tl-header');
    if (!header) return;
    header.addEventListener('click', function () {
      setOpen(entry, !entry.classList.contains('open'));
    });
  });

  // Open (and scroll to) whichever entry the URL fragment points at.
  function openFromHash(scroll) {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    var target = document.getElementById(hash.slice(1));
    if (!target || !target.classList.contains('tl-entry')) return;

    entries.forEach(function (entry) {
      setOpen(entry, entry === target);
    });

    if (scroll) {
      var reduceMotion = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  }

  openFromHash(true);
  window.addEventListener('hashchange', function () {
    openFromHash(true);
  });
})();

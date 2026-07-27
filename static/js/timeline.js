// Experience accordion.
//
// Entries toggle independently (so two roles can be compared side by side) and
// each one is deep-linkable: /job-history#job-rannis opens and scrolls to it.
(function () {
  var entries = Array.prototype.slice.call(
    document.querySelectorAll('.timeline-entry')
  );
  if (!entries.length) return;

  function parts(entry) {
    return {
      header: entry.querySelector('.timeline-header'),
      sign: entry.querySelector('.timeline-sign'),
    };
  }

  function setOpen(entry, open) {
    var p = parts(entry);
    entry.classList.toggle('open', open);
    p.header.setAttribute('aria-expanded', String(open));
    p.sign.textContent = open ? '–' : '+';
  }

  entries.forEach(function (entry) {
    parts(entry).header.addEventListener('click', function () {
      setOpen(entry, !entry.classList.contains('open'));
    });
  });

  // Open (and scroll to) whichever entry the URL fragment points at.
  function openFromHash(scroll) {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    var target = document.getElementById(hash.slice(1));
    if (!target || !target.classList.contains('timeline-entry')) return;

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

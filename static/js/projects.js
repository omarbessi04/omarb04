// Projects page: live translation preview + click-to-play gameplay videos.

// ── Click-to-play videos ──────────────────────────────────────────────────────
//
// The two gameplay clips are 45MB and 29MB. Auto-loading them on scroll meant
// anyone who wandered past the games section paid for both, so nothing is
// fetched until a visitor deliberately presses play.
(function () {
  var buttons = document.querySelectorAll('[data-video-play]');

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      var media = button.closest('.game-card-media');
      var video = media && media.querySelector('video[data-lazy-video]');
      if (!video) return;

      button.remove();
      media.classList.add('is-playing');

      video.querySelectorAll('source[data-src]').forEach(function (source) {
        source.src = source.dataset.src;
        source.removeAttribute('data-src');
      });

      video.controls = true;
      video.load();
      video.play().catch(function () {
        // Autoplay can still be refused; the controls let the user start it.
      });
    });
  });
})();

// ── Live stats from the translations dashboard ────────────────────────────────
(function () {
  var ids = ['pfp-songs', 'pfp-time', 'pfp-eff'];

  function setLoading(on) {
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle('is-loading', on);
    });
  }

  function showError() {
    setLoading(false);
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
    var caption = document.querySelector('.tr-preview-caption');
    if (caption) caption.textContent = 'Live stats unavailable right now';
  }

  setLoading(true);

  Promise.all([
    fetch('/translation_progress').then(function (r) { return r.json(); }),
    fetch('/get_total_study').then(function (r) { return r.json(); }),
    fetch('/get_UCCPC').then(function (r) { return r.json(); }),
    fetch('/songs_and_times').then(function (r) { return r.json(); }),
  ]).then(function (results) {
    var progress = results[0];
    var study = results[1];
    var uccpc = results[2];
    var times = results[3];

    setLoading(false);

    var total = progress.completed + progress.inProgress + progress.remaining;
    document.getElementById('pfp-songs').textContent = progress.completed + '/' + total;
    document.getElementById('pfp-time').textContent = study.hours + 'h ' + study.minutes + 'm';

    var effValues = uccpc
      .map(function (row) { return parseFloat(row[1]); })
      .filter(function (v) { return !isNaN(v) && v > 0; });
    if (effValues.length) {
      document.getElementById('pfp-eff').textContent = Math.min.apply(null, effValues).toFixed(2);
    }

    var mins = times
      .map(function (row) {
        var bits = row[1].split(':').map(Number);
        return bits[0] * 60 + bits[1] + bits[2] / 60;
      })
      .filter(function (m) { return m > 0; })
      .slice(0, 14);

    var max = Math.max.apply(null, mins.concat([1]));
    var bars = document.getElementById('pfp-bars');
    mins.forEach(function (m) {
      var bar = document.createElement('div');
      bar.className = 'tr-preview-bar';
      bar.style.height = Math.max(6, (m / max) * 100) + '%';
      bars.appendChild(bar);
    });
  }).catch(function (err) {
    console.error('Error loading translation preview:', err);
    showError();
  });
})();

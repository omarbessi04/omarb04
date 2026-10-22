// Projects page: live translation preview + autoplaying gameplay videos.

// ── Gameplay videos ───────────────────────────────────────────────────────────
//
// The clips (~6MB and ~4MB) are only fetched once a card comes near the
// viewport, then play muted on loop while visible and pause when scrolled away.
// With reduced motion they get controls instead and wait for a press.
(function () {
  var videos = document.querySelectorAll('video[data-autoplay]');
  if (!videos.length) return;

  function setSource(video) {
    video.querySelectorAll('source[data-src]').forEach(function (source) {
      source.src = source.dataset.src;
      source.removeAttribute('data-src');
    });
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    videos.forEach(function (video) {
      setSource(video);
      video.controls = true;
      video.load();
    });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var video = entry.target;
      if (!entry.isIntersecting) {
        video.pause();
        return;
      }
      if (video.querySelector('source[data-src]')) {
        setSource(video);
        video.load();
      }
      video.play().catch(function () {
        // Autoplay refused (e.g. Low Power Mode); let the visitor start it.
        video.controls = true;
      });
    });
  }, { rootMargin: '150px 0px' });

  videos.forEach(function (video) { observer.observe(video); });
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
    fetch('/data/translation_progress.json').then(function (r) { return r.json(); }),
    fetch('/data/total_study.json').then(function (r) { return r.json(); }),
    fetch('/data/uccpc.json').then(function (r) { return r.json(); }),
    fetch('/data/songs_and_times.json').then(function (r) { return r.json(); }),
  ]).then(function (results) {
    var progress = results[0];
    var study = results[1];
    var uccpc = results[2];
    var times = results[3];

    setLoading(false);

    document.getElementById('pfp-songs').textContent = progress.completed;
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

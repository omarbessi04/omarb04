// Typewriter effect for the home hero and the 404 headline.
//
// The finished text is in the HTML, so the page reads correctly with no
// JavaScript at all and search engines see the real headline. This script
// measures the space that text already occupies, pins it, and then retypes it
// into the gap — so nothing on the page moves while the line is typing.
//
// Reads its script from a `data-chunks` JSON attribute on the target element so
// the markup stays declarative. With reduced motion the text is simply left
// alone, and an impatient visitor can skip the rest by clicking or typing.
(function () {
  var el = document.getElementById('typewriter-text');
  if (!el) return;

  var cursor = document.querySelector('.caret');

  function settle() {
    if (cursor) cursor.classList.add('caret-done');
  }

  var reduceMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    settle();
    return;
  }

  var chunks;
  try {
    chunks = JSON.parse(el.getAttribute('data-chunks') || '[]');
  } catch (err) {
    settle();
    return;
  }
  if (!chunks.length) {
    settle();
    return;
  }

  var speed = parseInt(el.getAttribute('data-speed'), 10) || 80;
  var startDelay = parseInt(el.getAttribute('data-start-delay'), 10) || 400;

  function makeNode(chunk) {
    if (!chunk.accent) return null;
    var span = document.createElement('span');
    span.className = 'work-title';
    return span;
  }

  function render() {
    el.textContent = '';
    chunks.forEach(function (chunk) {
      chunk.text.split('\n').forEach(function (part, i) {
        if (i > 0) el.appendChild(document.createElement('br'));
        var node = makeNode(chunk);
        if (node) {
          node.textContent = part;
          el.appendChild(node);
        } else {
          el.appendChild(document.createTextNode(part));
        }
      });
    });
  }

  function finish() {
    render();
    settle();
  }

  // Hold the height the finished headline occupies, so clearing it doesn't
  // collapse the page and then grow it back a line at a time.
  //
  // Measuring always puts the *whole* headline back first: by the time the
  // webfont has swapped in, the element is mid-sentence, and measuring that
  // would reserve one line for a headline that ends up taking three.
  var host = el.closest('h1') || el.parentElement;

  function pin() {
    if (!host) return;
    var partial = el.innerHTML;
    host.style.minHeight = '';
    render();
    var height = host.getBoundingClientRect().height;
    el.innerHTML = partial;
    if (height) host.style.minHeight = height + 'px';
  }

  pin();
  // The fallback face wraps differently, so re-measure once Archivo is in.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(pin);
  }

  var done = false;
  function skip() {
    if (done) return;
    done = true;
    finish();
  }

  document.addEventListener('click', skip, { once: true });
  document.addEventListener('keydown', skip, { once: true });

  el.textContent = '';
  var chunkIndex = 0;
  var charIndex = 0;
  var target = null;

  function type() {
    if (done) return;
    if (chunkIndex >= chunks.length) {
      done = true;
      settle();
      return;
    }

    var chunk = chunks[chunkIndex];
    if (charIndex === 0) {
      target = makeNode(chunk);
      if (target) el.appendChild(target);
    }

    var ch = chunk.text[charIndex];
    if (ch === '\n') {
      el.appendChild(document.createElement('br'));
      target = null;
    } else if (target) {
      target.textContent += ch;
    } else {
      el.appendChild(document.createTextNode(ch));
    }

    charIndex++;
    if (charIndex >= chunk.text.length) {
      chunkIndex++;
      charIndex = 0;
    }

    setTimeout(type, chunk.speed || speed);
  }

  setTimeout(type, startDelay);
})();

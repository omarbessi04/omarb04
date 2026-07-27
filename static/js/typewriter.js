// Typewriter effect for the home hero and the 404 headline.
//
// Reads its script from a `data-chunks` JSON attribute on the target element so
// the markup stays declarative. Respects prefers-reduced-motion by rendering the
// finished text immediately, and lets an impatient visitor skip the animation by
// clicking, tapping, or pressing a key.
(function () {
  var el = document.getElementById('typewriter-text');
  if (!el) return;

  var chunks;
  try {
    chunks = JSON.parse(el.getAttribute('data-chunks') || '[]');
  } catch (err) {
    return;
  }
  if (!chunks.length) return;

  var cursor = document.querySelector('.blink-cursor');
  var speed = parseInt(el.getAttribute('data-speed'), 10) || 80;
  var startDelay = parseInt(el.getAttribute('data-start-delay'), 10) || 400;

  function makeNode(chunk) {
    if (chunk.accent) {
      var span = document.createElement('span');
      span.className = 'italic-accent';
      return span;
    }
    return null;
  }

  // Render everything at once, then stop the cursor blinking.
  function finish() {
    el.textContent = '';
    chunks.forEach(function (chunk) {
      var parts = chunk.text.split('\n');
      parts.forEach(function (part, i) {
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
    if (cursor) cursor.classList.add('blink-cursor-done');
  }

  var reduceMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    finish();
    return;
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
      if (cursor) cursor.classList.add('blink-cursor-done');
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

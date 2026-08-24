/* ===================================================================
   theme layer JS — typewriter, separator reveal, project peek.
   additive: runs alongside script.js, touches nothing it owns.
   =================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- typewriter ---------------- */
  $$('[data-typewriter]').forEach(function (el) {
    var words;
    try { words = JSON.parse(el.getAttribute('data-typewriter')); }
    catch (e) { words = [el.getAttribute('data-typewriter')]; }
    if (!words || !words.length) return;

    var out = document.createElement('span');
    var caret = document.createElement('span');
    caret.className = 'type-line__caret';
    caret.textContent = '\u00A0';
    el.textContent = '';
    el.appendChild(out);
    el.appendChild(caret);

    // reduced motion: show the first phrase, no cycling.
    if (reduceMotion) { out.textContent = words[0]; caret.style.display = 'none'; return; }

    var w = 0, ch = 0, deleting = false;

    (function tick() {
      var word = words[w];
      ch += deleting ? -1 : 1;
      out.textContent = word.slice(0, ch);

      var wait = deleting ? 40 : 75;
      if (!deleting && ch === word.length) { wait = 1900; deleting = true; }
      else if (deleting && ch === 0) { deleting = false; w = (w + 1) % words.length; wait = 320; }

      setTimeout(tick, wait);
    })();
  });

  /* ---------------- separator draw-in ---------------- */
  var seps = $$('.sep');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); sio.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    seps.forEach(function (el) { sio.observe(el); });
  } else {
    seps.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------- project row peek ---------------- */
  var list = $('[data-peek-list]');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (list && fine && !reduceMotion) {
    var peek = document.createElement('div');
    peek.className = 'pjt__peek';
    var img = document.createElement('img');
    img.alt = '';
    // no src until a row is hovered: an empty-src <img> reports as a
    // broken image to crawlers and audit tools even while invisible.
    img.decoding = 'async';
    document.body.appendChild(peek);

    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null, on = false;

    var loop = function () {
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      peek.style.transform =
        'translate3d(' + cx + 'px,' + cy + 'px,0) scale(' + (on ? 1 : 0.9) + ') rotate(' + (on ? -2 : -3) + 'deg)';
      raf = requestAnimationFrame(loop);
    };

    list.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; });

    $$('.pjt', list).forEach(function (row) {
      var src = row.getAttribute('data-peek');
      if (!src) return;

      row.addEventListener('mouseenter', function (e) {
        if (!img.parentNode) peek.appendChild(img);
        img.src = src;
        // jump to the pointer so the card doesn't fly across the page
        tx = cx = e.clientX; ty = cy = e.clientY;
        on = true;
        peek.classList.add('is-on');
        if (!raf) loop();
      });

      row.addEventListener('mouseleave', function () {
        on = false;
        peek.classList.remove('is-on');
      });
    });

    list.addEventListener('mouseleave', function () {
      on = false;
      peek.classList.remove('is-on');
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    });
  }
})();

/* ===================================================================
   reveal safety net
   script.js observes [data-reveal] at threshold 0.12 with a -60px
   bottom margin. tall tiles (the gallery cards are ~360px) can be
   scrolled past faster than the observer settles, and anything that
   never intersects stays at opacity 0 — content silently disappears.
   this re-checks on scroll and force-reveals anything already inside
   the viewport, then stops once everything has fired.
   =================================================================== */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var pending = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (!pending.length) return;

  var sweep = function () {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    pending = pending.filter(function (el) {
      if (el.classList.contains('is-in')) return false;
      var r = el.getBoundingClientRect();
      // any part of it is in (or above) the viewport
      if (r.top < vh * 0.95 && r.bottom > 0) { el.classList.add('is-in'); return false; }
      if (r.bottom <= 0) { el.classList.add('is-in'); return false; }  // scrolled past
      return true;
    });
    if (!pending.length) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
  };

  var ticking = false;
  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { sweep(); ticking = false; });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', sweep);
  sweep();
})();

/* ===================================================================
   design gallery filter
   the [data-gal] pill buttons existed in design.html but nothing ever
   listened to them — clicking a filter did nothing. this wires them to
   the [data-gal-item] tiles and reports the count for screen readers.
   =================================================================== */
(function () {
  'use strict';
  var root = document.querySelector('[data-gal-controls]');
  if (!root) return;

  var btns  = Array.prototype.slice.call(root.querySelectorAll('[data-gal]'));
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-gal-item]'));
  var status = root.querySelector('[data-gal-status]');
  if (!btns.length || !items.length) return;

  var apply = function (cat) {
    var shown = 0;
    items.forEach(function (el) {
      var types = (el.getAttribute('data-type') || '').split(/\s+/);
      var match = cat === 'all' || types.indexOf(cat) !== -1;
      el.hidden = !match;
      if (match) shown++;
    });
    if (status) {
      status.textContent = cat === 'all'
        ? shown + ' pieces'
        : shown + (shown === 1 ? ' piece' : ' pieces') + ' · filtered';
    }
  };

  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      apply(btn.getAttribute('data-gal'));
    });
  });

  apply('all');
})();

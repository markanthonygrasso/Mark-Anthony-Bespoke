/* Mark Anthony Bespoke — site.js
   No dependencies. Every feature degrades to working HTML without it. */

/* ------------------------------------------------------------------
   ACUITY CONFIG — replace the placeholders, nothing else needs editing.
   Find these in Acuity: Business Settings → Scheduling Page → Share
   (owner ID is the "owner=" value in your scheduling link), and
   Appointment Types → each type → Direct link ("appointmentType=").
   ------------------------------------------------------------------ */
var ACUITY = {
  ownerId: 'ACUITY_OWNER_ID',
  types: {
    consultation: { id: 'ACUITY_TYPE_ID_CONSULTATION', label: 'Initial consultation', minutes: 90 },
    fitting:      { id: 'ACUITY_TYPE_ID_FITTING',      label: 'Fitting',              minutes: 45 },
    collection:   { id: 'ACUITY_TYPE_ID_COLLECTION',   label: 'Collection',           minutes: 30 }
  },
  embedScript: 'https://embed.acuityscheduling.com/js/embed.js'
};

function acuityUrl(typeKey) {
  var t = ACUITY.types[typeKey] || ACUITY.types.consultation;
  return 'https://app.acuityscheduling.com/schedule.php?owner=' + encodeURIComponent(ACUITY.ownerId) +
         '&appointmentType=' + encodeURIComponent(t.id);
}

(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');

  /* ---------- Review mode: ?review=1 shows section tags (kept for the session); ?review=0 turns it off ---------- */
  var review = /[?&]review=1/.test(location.search);
  try {
    if (review) sessionStorage.setItem('mabReview', '1');
    else if (/[?&]review=0/.test(location.search)) sessionStorage.removeItem('mabReview');
    else review = sessionStorage.getItem('mabReview') === '1';
  } catch (e) {}
  if (review) {
    doc.classList.add('review');
    var badge = document.createElement('p');
    badge.className = 'review-badge';
    badge.textContent = 'Review mode · tags match the feedback doc';
    document.body.appendChild(badge);
  }
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var mobileNav = document.getElementById('mobile-nav');
  if (toggle && mobileNav) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mobileNav.hidden = !open;
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 60rem)').addEventListener('change', function (m) {
      if (m.matches) setOpen(false);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); ro.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Carousel (manual only — never autoplays) ---------- */
  document.querySelectorAll('[data-carousel]').forEach(function (root) {
    var track = root.querySelector('.carousel__track');
    var slides = Array.prototype.slice.call(track.children);
    var dots = root.querySelectorAll('.carousel__dot');
    var prev = root.querySelector('[data-dir="-1"]');
    var next = root.querySelector('[data-dir="1"]');
    var count = root.querySelector('.carousel__count');
    var current = 0;

    function go(i, focusDot) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      sync(i);
      track.scrollTo({ left: i * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
      if (focusDot && dots[i]) dots[i].focus();
    }
    function sync(i) {
      if (i === current && dots[i] && dots[i].getAttribute('aria-current') === 'true') return;
      current = i;
      dots.forEach(function (d, n) {
        d.setAttribute('aria-current', n === i ? 'true' : 'false');
      });
      slides.forEach(function (s, n) {
        s.setAttribute('aria-hidden', n === i ? 'false' : 'true');
        s.querySelectorAll('a, button').forEach(function (el) { el.tabIndex = n === i ? 0 : -1; });
      });
      var focused = document.activeElement;
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === slides.length - 1;
      if (focused && focused.disabled) (focused === prev ? next : prev).focus();
      if (count) count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    }

    dots.forEach(function (d, n) { d.addEventListener('click', function () { go(n); }); });
    if (prev) prev.addEventListener('click', function () { go(current - 1); });
    if (next) next.addEventListener('click', function () { go(current + 1); });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1, e.target.classList.contains('carousel__dot')); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(current - 1, e.target.classList.contains('carousel__dot')); }
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.intersectionRatio >= 0.6) sync(slides.indexOf(en.target));
      });
    }, { root: track, threshold: [0.6] });
    slides.forEach(function (s) { io.observe(s); });
    sync(0);
    current = 0;
  });

  /* ---------- Scheduler (/book only) ---------- */
  var scheduler = document.querySelector('[data-scheduler]');
  if (!scheduler) return;

  var frameWrap = scheduler.querySelector('.scheduler__frame');
  var titleEl = scheduler.querySelector('[data-scheduler-title]');
  var metaEl = scheduler.querySelector('[data-scheduler-meta]');
  var fallback = scheduler.querySelector('[data-scheduler-fallback]');
  var options = document.querySelectorAll('[data-appt]');
  var iframe = null;
  var scriptLoaded = false;
  var configured = ACUITY.ownerId.indexOf('ACUITY_') !== 0;

  function typeFromHash() {
    var h = (location.hash || '').replace('#', '');
    return ACUITY.types[h] ? h : 'consultation';
  }
  var active = typeFromHash();

  function select(key, fromUser) {
    active = key;
    var t = ACUITY.types[key];
    options.forEach(function (o) {
      o.setAttribute('aria-current', o.getAttribute('data-appt') === key ? 'true' : 'false');
    });
    if (titleEl) titleEl.innerHTML = 'Booking: <em>' + t.label + '</em>';
    if (metaEl) metaEl.textContent = t.minutes + ' minutes · 528 Chapel Street';
    if (fallback) fallback.href = acuityUrl(key);
    if (iframe) {
      iframe.src = acuityUrl(key);
      iframe.title = 'Book a ' + t.label.toLowerCase() + ' with Mark Anthony Bespoke — Acuity Scheduling';
      scheduler.classList.remove('is-loaded');
    }
    if (fromUser && history.replaceState) history.replaceState(null, '', '#' + key);
  }

  options.forEach(function (o) {
    o.addEventListener('click', function (e) {
      e.preventDefault();
      select(o.getAttribute('data-appt'), true);
      mount();
      if (fromSmallScreen()) scheduler.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });
  window.addEventListener('hashchange', function () { select(typeFromHash(), false); });
  function fromSmallScreen() { return window.matchMedia('(max-width: 47.99rem)').matches; }

  function mount() {
    if (iframe) return;
    if (!configured) {
      var status = scheduler.querySelector('[data-scheduler-status]');
      if (status) status.textContent = 'The live calendar connects once the Acuity account IDs are added. Until then, please email to book.';
      return;
    }
    var t = ACUITY.types[active];
    iframe = document.createElement('iframe');
    iframe.src = acuityUrl(active);
    iframe.title = 'Book a ' + t.label.toLowerCase() + ' with Mark Anthony Bespoke — Acuity Scheduling';
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('allow', 'payment');
    iframe.addEventListener('load', function () {
      scheduler.classList.add('is-loaded');
    });
    frameWrap.appendChild(iframe);

    if (!scriptLoaded) {
      scriptLoaded = true;
      var s = document.createElement('script');
      s.src = ACUITY.embedScript;
      s.async = true;
      document.body.appendChild(s);
    }
  }

  select(active, false);

  // Lazy: only build the iframe and load Acuity's script when the frame nears the viewport.
  if ('IntersectionObserver' in window) {
    var mo = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { mount(); mo.disconnect(); }
    }, { rootMargin: '400px 0px' });
    mo.observe(frameWrap);
  } else {
    mount();
  }
})();

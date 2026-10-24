/* Mark Anthony Bespoke — site.js
   No dependencies. Every feature degrades to working HTML without it. */

/* ------------------------------------------------------------------
   ACUITY CONFIG — replace the placeholders, nothing else needs editing.
   Owner ID: Acuity → Business Settings → Scheduling Page → your link's "owner=" value.
   Type IDs: Acuity → Appointment Types → each type → Direct link → "appointmentType=" value.
   ------------------------------------------------------------------ */
var ACUITY = {
  ownerId: '40643757',
  types: {
    commission: { id: '99766564', label: 'Bespoke Commission', meta: '90 minutes · 528 Chapel Street' },
    call:       { id: '99464940',       label: 'Introductory Call',  meta: '20 minutes · By phone' }
  },
  embedScript: 'https://embed.acuityscheduling.com/js/embed.js'
};

function acuityUrl(typeKey) {
  var t = ACUITY.types[typeKey] || ACUITY.types.commission;
  return 'https://app.acuityscheduling.com/schedule.php?owner=' + encodeURIComponent(ACUITY.ownerId) +
         '&appointmentType=' + encodeURIComponent(t.id);
}

(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Review mode: ?review=1 shows section tags (kept for the session); ?review=0 turns it off ---------- */
  var review = /[?&]review=1(?![0-9])/.test(location.search);
  try {
    if (review) sessionStorage.setItem('mabReview', '1');
    else if (/[?&]review=0(?![0-9])/.test(location.search)) sessionStorage.removeItem('mabReview');
    else review = sessionStorage.getItem('mabReview') === '1';
  } catch (e) {}
  if (review) {
    doc.classList.add('review');
    var badge = document.createElement('p');
    badge.className = 'review-badge';
    badge.textContent = 'Review mode · tags match the feedback document';
    document.body.appendChild(badge);
  }

  /* ---------- Menu (always behind the button, at every width) ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('menu');
  if (toggle && menu) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.hidden = !open;
      if (open) { var first = menu.querySelector('a'); if (first) first.focus(); }
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

  /* ---------- Silent loop video: loads only near the viewport; still poster for reduced motion / data saver ---------- */
  var saveData = navigator.connection && navigator.connection.saveData;
  document.querySelectorAll('[data-loop]').forEach(function (fig) {
    var video = fig.querySelector('video');
    var toggle = fig.querySelector('.loop__toggle');
    if (!video || reduceMotion || saveData || !('IntersectionObserver' in window)) return; // poster only
    var loaded = false, userPaused = false;
    function setPaused(p) {
      toggle.classList.toggle('is-paused', p);
      toggle.setAttribute('aria-label', p ? 'Play the background video' : 'Pause the background video');
    }
    toggle.hidden = false;
    toggle.addEventListener('click', function () {
      userPaused = !video.paused;
      if (video.paused) video.play(); else video.pause();
      setPaused(userPaused);
    });
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible && !loaded) {
        video.querySelectorAll('source[data-src]').forEach(function (s) { s.src = s.getAttribute('data-src'); });
        video.load(); loaded = true;
      }
      if (visible && !userPaused) { var pr = video.play(); if (pr && pr.catch) pr.catch(function () {}); }
      else if (!visible) video.pause();
    }, { rootMargin: '200px 0px' }).observe(fig);
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
    return ACUITY.types[h] ? h : null;   // nothing is pre-selected; a deep link (#commission / #call) selects one
  }
  var active = typeFromHash();

  function frameTitle(t) { return t.label + ' booking calendar, Mark Anthony Bespoke (Acuity Scheduling)'; }

  function select(key, fromUser) {
    active = key;
    var t = ACUITY.types[key];
    options.forEach(function (o) {
      var on = o.getAttribute('data-appt') === key;
      o.setAttribute('aria-current', on ? 'true' : 'false');
      var check = o.querySelector('.appt__check');
      if (check) check.textContent = on ? 'Selected' : 'Select';
    });
    if (titleEl) titleEl.textContent = t.label;
    if (metaEl) metaEl.textContent = t.meta;
    if (fallback) fallback.href = acuityUrl(key);
    if (iframe) {
      iframe.src = acuityUrl(key);
      iframe.title = frameTitle(t);
      scheduler.classList.remove('is-loaded');
    }
    if (fromUser && history.replaceState) history.replaceState(null, '', '#' + key);
  }

  options.forEach(function (o) {
    o.addEventListener('click', function (e) {
      e.preventDefault();
      select(o.getAttribute('data-appt'), true);
      mount();
      if (window.matchMedia('(max-width: 63.99rem)').matches) {
        scheduler.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });
  window.addEventListener('hashchange', function () { var t = typeFromHash(); if (t) { select(t, false); mount(); } });

  function mount() {
    if (iframe) return;
    if (!configured) {
      var status = scheduler.querySelector('[data-scheduler-status]');
      if (status) status.textContent = 'The live calendar connects once the Acuity account IDs are added. Until then, please call or email to book.';
      return;
    }
    iframe = document.createElement('iframe');
    iframe.src = acuityUrl(active);
    iframe.title = frameTitle(ACUITY.types[active]);
    iframe.setAttribute('allow', 'payment');
    iframe.addEventListener('load', function () { scheduler.classList.add('is-loaded'); });
    frameWrap.appendChild(iframe);
    if (!scriptLoaded) {
      scriptLoaded = true;
      var s = document.createElement('script');
      s.src = ACUITY.embedScript;
      s.async = true;
      document.body.appendChild(s);
    }
  }

  if (active) { select(active, false); mount(); }   // the calendar appears only once an appointment is chosen
})();

/* ============================================================
   Lingofisy site behaviour.

   Navigation note: the hero is a ~6 viewport tall pinned scroll
   stage. Native `scroll-behavior:smooth` animated the full
   distance at a fixed rate, which replayed the whole camera
   sequence as a strobe every time someone clicked "FAQ". Scrolling
   is handled here instead: short hops are eased, long hops land
   instantly, and every target is offset by the fixed header.
   ============================================================ */

const header = document.querySelector('[data-header]');
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
const calm = matchMedia('(prefers-reduced-motion:reduce)').matches;
const hasIO = 'IntersectionObserver' in window;
const hasTimeline = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline', 'view()');
const story = document.querySelector('.story');
/* Mirrors the media query that gates the pinned stage: the hero's waitlist
   form needs 760px of height on a narrow screen. */
const pinned = () => hasTimeline && !calm && innerHeight >= 560 && (innerWidth >= 951 || innerHeight >= 760);
const headerH = () => (header ? header.offsetHeight : 78) + 14;

/* ---------- scrolling ---------- */
/* smoothstep, the same curve the CSS camera uses */
const ease = t => t * t * (3 - 2 * t);
let scrollAnim = 0;

const scrollToY = y => {
  cancelAnimationFrame(scrollAnim);
  const max = document.documentElement.scrollHeight - innerHeight;
  const to = Math.max(0, Math.min(max, Math.round(y)));
  const from = scrollY;
  const dist = Math.abs(to - from);
  if (dist < 2) return;

  /* Past ~2.6 screens the pinned stage would flicker through every
     keyframe on the way. Land directly instead. */
  if (calm || dist > innerHeight * 2.6) { scrollTo(0, to); return; }

  const dur = Math.min(820, 260 + dist * 0.22);
  const t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / dur);
    scrollTo(0, from + (to - from) * ease(k));
    if (k < 1) scrollAnim = requestAnimationFrame(step);
  };
  scrollAnim = requestAnimationFrame(step);
};

const scrollToTarget = el => {
  if (!el) return;
  if (el.id === 'top' || el === document.body) return scrollToY(0);
  scrollToY(el.getBoundingClientRect().top + scrollY - headerH());
};

/* A seek is a position *inside* the pinned stage, expressed as a
   fraction of its scrollable travel. Off the pinned layout the same
   content is a stack of plain sections, so fall back to the slot. */
const seekTo = (fraction, slotIndex) => {
  if (!story) return;
  if (pinned()) {
    const span = story.offsetHeight - innerHeight;
    return scrollToY(story.offsetTop + span * fraction);
  }
  const slots = document.querySelectorAll('.copy .slot');
  scrollToTarget(slots[slotIndex] || story);
};

/* ---------- mobile menu ---------- */
const menuOpen = () => nav?.classList.contains('open');
const setMenu = open => {
  if (!nav || !toggle) return;
  nav.classList.toggle('open', open);
  toggle.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.classList.toggle('menu-open', open);
};

toggle?.addEventListener('click', () => setMenu(!menuOpen()));

/* close on outside tap, on Escape, and when the layout grows past the
   breakpoint while it is still open */
addEventListener('pointerdown', e => {
  if (menuOpen() && !e.target.closest('#main-nav') && !e.target.closest('.menu-toggle')) setMenu(false);
});
matchMedia('(min-width:951px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

/* ---------- in-page links ---------- */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;

  const href = a.getAttribute('href');
  if (!href || href.charAt(0) !== '#' || href === '#') return;

  const target = document.querySelector(href);
  if (!target) return;

  e.preventDefault();
  if (menuOpen()) setMenu(false);

  if (a.dataset.seek !== undefined) {
    seekTo(Number(a.dataset.seek) || 0, Number(a.dataset.slot) || 0);
  } else {
    scrollToTarget(target);
  }

  /* keep the address bar and the back button honest */
  if (history.replaceState) history.replaceState(null, '', href);

  /* move focus so keyboard and screen-reader users follow the jump */
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
});

/* A hash in the URL is resolved before the stage's images have sized the page,
   so the landing position drifts (/#get was landing in the FAQ). Re-apply it
   once everything has settled. */
if (location.hash.length > 1) {
  addEventListener('load', () => {
    let t = null;
    try { t = document.querySelector(location.hash); } catch { /* not a selector */ }
    if (t) setTimeout(() => scrollToTarget(t), 80);
  });
}

/* ---------- third-party embeds: load on request ----------
   The Tally form used to load with the page, so opening /affiliate/ contacted
   tally.so and handed over the visitor's IP before they had any say. Nothing
   here touches tally.so until a visitor asks for a form: the affiliate iframe
   keeps its src in a data attribute, and the waitlist popup below shares the
   loader underneath. */
const TALLY_EMBED = 'https://tally.so/widgets/embed.js';

/* Resolves once Tally's widget script is in and rejects if it cannot load, so
   a caller can fall back instead of waiting forever. Injected at most once
   however many things ask for it. */
let tallyLoading = null;
const loadTally = () => {
  if (window.Tally) return Promise.resolve();
  if (tallyLoading) return tallyLoading;
  tallyLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TALLY_EMBED;
    script.async = true;
    script.dataset.tally = '1';
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => {
      /* Cleared so a second attempt can retry rather than reject forever. */
      tallyLoading = null;
      script.remove();
      reject(new Error('tally embed failed to load'));
    });
    document.body.append(script);
  });
  return tallyLoading;
};

document.querySelectorAll('[data-form-load]').forEach(btn => {
  btn.addEventListener('click', () => {
    const gate = btn.closest('[data-form-gate]');
    const src = gate?.dataset.formSrc;
    if (!gate || !src) return;

    const frame = document.createElement('iframe');
    frame.src = src;
    frame.title = gate.dataset.formTitle || 'Application form';
    frame.width = '100%';
    frame.height = '820';
    frame.setAttribute('frameborder', '0');
    frame.setAttribute('marginheight', '0');
    frame.setAttribute('marginwidth', '0');

    gate.classList.remove('aff-gate');
    gate.replaceChildren(frame);

    /* Tally's helper is what makes dynamicHeight work; it comes with the form,
       not with the page. The iframe renders without it, so a failure here is
       not worth telling the visitor about. */
    loadTally().catch(() => {});
    frame.focus?.();
  });
});

/* ---------- store buttons ---------- */
/* These used to fire a native alert(). The note under the buttons now
   carries the message and flashes when one is pressed. */
document.querySelectorAll('[data-store]').forEach(btn => {
  btn.addEventListener('click', () => {
    const note = btn.closest('.stores')?.parentElement?.querySelector('[data-store-note]');
    if (!note) return;
    note.classList.remove('is-flash');
    void note.offsetWidth;
    note.classList.add('is-flash');
    setTimeout(() => note.classList.remove('is-flash'), 1600);
  });
});

/* ---------- waitlist ----------
   Lingofisy has not launched, so joining the waitlist is the only conversion on
   the page. The list itself is a Tally form: this site is static, so the
   addresses and the email that goes to them live with Tally, and nothing here
   holds a secret or stores anyone's address.

   Every trigger is a real link to the hosted form. JavaScript upgrades that
   link into Tally's popup so the visitor never leaves the page; if the widget
   is blocked or fails to load, the link still works on its own. Either way
   nothing contacts tally.so until someone actually asks for the form. */
const WAITLIST_FORM = 'M1RAlE';
const WAITLIST_URL = `https://tally.so/r/${WAITLIST_FORM}`;

const openWaitlist = async () => {
  await loadTally();
  if (typeof window.Tally?.openPopup !== 'function') {
    throw new Error('tally popup is unavailable');
  }
  window.Tally.openPopup(WAITLIST_FORM, { layout: 'modal', width: 460, autoClose: 3000 });
};

document.querySelectorAll('[data-waitlist-open]').forEach(trigger => {
  trigger.addEventListener('click', event => {
    /* A modified or middle click means "open it in a new tab" — let the link
       do exactly that. */
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (trigger.getAttribute('aria-busy') === 'true') return;

    trigger.setAttribute('aria-busy', 'true');
    openWaitlist()
      .catch(() => {
        /* The popup could not open, so fall back to the page the link points
           at rather than leaving the visitor with a button that does nothing.
           A new tab, to match the target the markup asks for; if the browser
           blocks it, go there in this one instead of silently doing nothing. */
        const href = trigger.getAttribute('href') || WAITLIST_URL;
        if (!window.open(href, '_blank', 'noopener')) location.href = href;
      })
      .finally(() => trigger.removeAttribute('aria-busy'));
  });
});

document.querySelectorAll('[data-year]').forEach(n => { n.textContent = String(new Date().getFullYear()); });

/* ---------- consent ---------- */
const consentKey = 'lingofisy-consent-v1';
const banner = document.querySelector('[data-consent-banner]');
const modal = document.querySelector('[data-consent-modal]');
const backdrop = document.querySelector('[data-consent-backdrop]');
const consentRead = () => { try { return JSON.parse(localStorage.getItem(consentKey) || 'null'); } catch { return null; } };
let consentReturn = null;

const consentWrite = analytics => {
  try {
    localStorage.setItem(consentKey, JSON.stringify({ essential: true, analytics: Boolean(analytics), updatedAt: new Date().toISOString() }));
  } catch { /* private mode: the choice simply is not remembered */ }
  if (banner) banner.hidden = true;
  if (modal) modal.hidden = true;
  if (backdrop) backdrop.hidden = true;
  document.body.classList.remove('consent-open');
  consentReturn?.focus();
};
const consentOpen = () => {
  if (!modal) return;
  consentReturn = document.activeElement;
  modal.hidden = false;
  if (backdrop) backdrop.hidden = false;
  document.body.classList.add('consent-open');
  const cb = modal.querySelector('[data-consent-analytics]');
  if (cb) cb.checked = Boolean(consentRead()?.analytics);
  modal.querySelector('[data-consent-close]')?.focus();
};
const consentClose = () => {
  if (modal) modal.hidden = true;
  if (backdrop) backdrop.hidden = true;
  document.body.classList.remove('consent-open');
  consentReturn?.focus();
};

if (banner && !consentRead()) banner.hidden = false;
document.querySelectorAll('[data-consent-accept]').forEach(b => b.addEventListener('click', () => consentWrite(true)));
document.querySelectorAll('[data-consent-reject]').forEach(b => b.addEventListener('click', () => consentWrite(false)));
document.querySelectorAll('[data-consent-customize]').forEach(b => b.addEventListener('click', consentOpen));
document.querySelectorAll('[data-consent-close]').forEach(b => b.addEventListener('click', consentClose));
document.querySelector('[data-consent-save]')?.addEventListener('click', () => consentWrite(Boolean(modal?.querySelector('[data-consent-analytics]')?.checked)));
backdrop?.addEventListener('click', consentClose);

addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (modal && !modal.hidden) return consentClose();
  if (menuOpen()) setMenu(false);
});

/* ---------- header state ---------- */
/* CSS owns the camera. JS only reads what CSS cannot: how dark the
   ground under the header is, and which nav item is current. */
const progress = () => {
  if (!story) return 0;
  const r = story.getBoundingClientRect(), span = r.height - innerHeight;
  return span <= 0 ? 0 : Math.min(1, Math.max(0, -r.top / span));
};

const navLinks = [...(nav?.querySelectorAll('a[href^="#"]') || [])];
const SLOT_REST = [.02, .14, .75, .82, .88, .96];
let currentNav = null;

const markCurrent = () => {
  const faq = document.querySelector('#faq');
  let want = null;

  if (faq && faq.getBoundingClientRect().top <= headerH() + 4) {
    want = navLinks.find(a => a.getAttribute('href') === '#faq') || null;
  } else if (pinned()) {
    const p = progress();
    const seeks = navLinks.filter(a => a.dataset.seek !== undefined);
    want = seeks.reduce((best, a) => {
      const d = Math.abs(p - Number(a.dataset.seek));
      return !best || d < best.d ? { a, d } : best;
    }, null);
    want = want && want.d < .07 ? want.a : null;
  }

  if (want === currentNav) return;
  currentNav?.removeAttribute('aria-current');
  want?.setAttribute('aria-current', 'true');
  currentNav = want;
};

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    header?.classList.toggle('scrolled', scrollY > 12);
    markCurrent();
    if (!pinned() || !story) { header?.classList.remove('on-dark'); return; }
    const p = progress(), inStage = story.getBoundingClientRect().top <= 1;
    /* navy ground is solid .1828-.6984, the closing gradient from .9242 */
    header?.classList.toggle('on-dark', inStage && ((p > .17 && p < .71) || p > .93));
  });
};
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll, { passive: true });
onScroll();

/* ---------- reveals where scroll timelines are unsupported ---------- */
if (!calm && hasIO && !hasTimeline) {
  document.documentElement.classList.add('js-reveal');
  const sel = '.slot,.world,.faq-head>*,.faq-list details,.get-strip>div';
  const io = new IntersectionObserver(
    es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
    { rootMargin: '0px 0px -10% 0px', threshold: .14 }
  );
  document.querySelectorAll(sel).forEach(n => io.observe(n));
}

/* Keyboard focus drives the stage.
   The six copy slots live in a clipped filmstrip, so tabbing into a slot
   that is currently off-stage would put focus somewhere invisible. The
   stage scrolls to whichever slot the user tabbed into, so focus is
   always visible and nothing has to be hidden from assistive tech. */
const copyCol = document.querySelector('.copy');
if (copyCol && story) {
  let jumping = false;
  copyCol.addEventListener('focusin', e => {
    if (!pinned() || jumping) return;
    const slot = e.target.closest('.slot');
    if (!slot) return;
    const want = SLOT_REST[[...copyCol.querySelectorAll('.slot')].indexOf(slot)];
    if (want === undefined || Math.abs(progress() - want) < .04) return;
    jumping = true;
    scrollToY(story.offsetTop + (story.offsetHeight - innerHeight) * want);
    setTimeout(() => { jumping = false; }, 700);
  });
}

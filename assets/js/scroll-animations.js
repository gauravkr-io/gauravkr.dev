/**
 * Motion: scroll reveals, page transitions and the article scrollspy.
 *
 * Every effect here is decorative, so each one checks `prefers-reduced-motion`
 * and degrades to the static result rather than to a broken page.
 */

import { $$, prefersReducedMotion } from './utils.js';

const STAGGER_MS = 70;
const MAX_STAGGER_STEPS = 6;

let revealObserver = null;

function ensureObserver() {
  if (revealObserver) return revealObserver;

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
  );

  return revealObserver;
}

/**
 * Observes any reveal targets that have appeared since the last call. Render
 * modules call this after they write markup, so content loaded from JSON
 * animates the same way as content present in the HTML.
 */
export function refreshScrollReveal() {
  const targets = $$('[data-reveal]:not([data-reveal-bound])');
  if (targets.length === 0) return;

  if (prefersReducedMotion()) {
    targets.forEach((element) => {
      element.setAttribute('data-reveal-bound', '');
      element.classList.add('is-revealed');
    });
    return;
  }

  const groupCounts = new Map();
  const observer = ensureObserver();

  targets.forEach((element) => {
    const parent = element.parentElement;
    const index = groupCounts.get(parent) ?? 0;
    groupCounts.set(parent, index + 1);

    const steps = Math.min(index, MAX_STAGGER_STEPS);
    element.style.setProperty('--reveal-delay', `${steps * STAGGER_MS}ms`);
    element.setAttribute('data-reveal-bound', '');
    observer.observe(element);
  });
}

/**
 * Reveals anything already on screen that the observer has not reported.
 *
 * Content hidden behind a reveal that never fires is invisible with no way to
 * recover, so this backstops the observer for the first paint. Elements further
 * down the page are left to the observer as normal.
 */
function revealWhatIsAlreadyVisible() {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  $$('[data-reveal]:not(.is-revealed)').forEach((element) => {
    if (element.getBoundingClientRect().top < viewportHeight) {
      element.classList.add('is-revealed');
      revealObserver?.unobserve(element);
    }
  });
}

export function initScrollReveal() {
  refreshScrollReveal();

  if (!('IntersectionObserver' in window)) {
    $$('[data-reveal]').forEach((element) => element.classList.add('is-revealed'));
    return;
  }

  // Rendering finishes asynchronously, so `load` may already have fired by now.
  if (document.readyState === 'complete') {
    window.setTimeout(revealWhatIsAlreadyVisible, 400);
  } else {
    window.addEventListener(
      'load',
      () => window.setTimeout(revealWhatIsAlreadyVisible, 400),
      { once: true }
    );
  }
}

/* -------------------------------------------------------------------------
   Page transitions
   ------------------------------------------------------------------------- */

function shouldInterceptLink(link, event) {
  if (!link || event.defaultPrevented) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return false;
  if (link.target && link.target !== '_self') return false;
  if (link.hasAttribute('download')) return false;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;

  const destination = new URL(link.href, window.location.href);
  if (destination.origin !== window.location.origin) return false;
  // A link to the current page with only a hash change should scroll, not reload.
  if (destination.pathname === window.location.pathname && destination.hash) return false;

  return true;
}

export function initPageTransitions() {
  if (prefersReducedMotion()) return;

  const veil = document.querySelector('.page-veil');
  if (!veil) return;

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!shouldInterceptLink(link, event)) return;

    event.preventDefault();
    veil.classList.add('is-active');

    window.setTimeout(() => {
      window.location.href = link.href;
    }, 220);
  });

  // Returning through the back button can restore the page with the veil still
  // painted, which would leave the visitor looking at a blank screen.
  window.addEventListener('pageshow', () => veil.classList.remove('is-active'));
}

/* -------------------------------------------------------------------------
   Article scrollspy
   ------------------------------------------------------------------------- */

export function initTocSpy() {
  const links = $$('.toc__link');
  if (links.length === 0) return;

  const byId = new Map();
  links.forEach((link) => {
    const id = link.getAttribute('href')?.slice(1);
    const heading = id ? document.getElementById(id) : null;
    if (heading) byId.set(heading, link);
  });

  if (byId.size === 0) return;

  const setActive = (activeLink) => {
    links.forEach((link) => link.classList.toggle('is-active', link === activeLink));
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible.length > 0) {
        setActive(byId.get(visible[0].target));
      }
    },
    { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
  );

  byId.forEach((_link, heading) => observer.observe(heading));
}

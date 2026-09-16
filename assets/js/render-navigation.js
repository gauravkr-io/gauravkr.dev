/**
 * Site chrome: header, mobile menu and footer.
 *
 * All three are driven by data/navigation.json and data/site.json, so hiding a
 * section is a matter of flipping `visible` in the navigation file. Nothing
 * here hardcodes a label or a link.
 */

import { html, mapTo, raw, mount, currentPagePath, escapeHtml } from './utils.js';
import { icon, iconRaw } from './icons.js';
import { getNavigation, getSite } from './data-loader.js';

/** Detail templates share a top-level nav entry with their list page. */
const PARENT_PAGES = {
  '/pages/service-detail.html': '/pages/services.html',
  '/pages/blog-post.html': '/pages/blogs.html',
  '/pages/course-detail.html': '/pages/courses.html'
};

function activePath() {
  const path = currentPagePath();
  return PARENT_PAGES[path] ?? path;
}

function maskIcon(path, label) {
  const safePath = escapeHtml(path);
  return raw(
    `<span class="icon-mask" role="img" aria-label="${escapeHtml(label)}" ` +
      `style="-webkit-mask-image:url('${safePath}');mask-image:url('${safePath}')"></span>`
  );
}

function socialLinks(site, extraClass = '') {
  const links = (site.socialLinks ?? []).filter((link) => link.visible !== false);
  return mapTo(
    links,
    (link) => html`
      <a
        class="social-link ${extraClass}"
        href="${link.url}"
        ${raw(link.url.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : '')}
      >
        ${maskIcon(link.icon, link.label)}
        <span class="visually-hidden">${link.label}</span>
      </a>
    `
  );
}

/* -------------------------------------------------------------------------
   Header
   ------------------------------------------------------------------------- */

function headerMarkup(site, navigation, active) {
  return html`
    <div class="shell site-header__inner">
      <a class="brand" href="/" aria-label="${site.name}, home">
        <span class="brand__mark" aria-hidden="true">${site.brandMark}</span>
        <span>${site.brand}</span>
      </a>

      <nav class="site-nav" aria-label="Primary">
        <ul class="site-nav__list">
          ${mapTo(
            navigation,
            (item) => html`
              <li>
                <a
                  class="site-nav__link"
                  href="${item.path}"
                  ${raw(item.path === active ? 'aria-current="page"' : '')}
                >${item.label}</a>
              </li>
            `
          )}
        </ul>
      </nav>

      <div class="site-header__actions">
        <a class="btn btn--secondary btn--sm site-header__resume" href="${site.resumeUrl}" download>
          ${iconRaw('download', { size: 16 })}
          <span>Résumé</span>
        </a>
        <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch theme">
          ${raw(icon('sun', { size: 18, className: 'theme-toggle__icon theme-toggle__icon--sun' }))}
          ${raw(icon('moon', { size: 18, className: 'theme-toggle__icon theme-toggle__icon--moon' }))}
        </button>
        <button
          class="nav-toggle"
          type="button"
          data-nav-toggle
          aria-expanded="false"
          aria-controls="mobile-nav"
          aria-label="Open menu"
        >
          <span class="nav-toggle__bars" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  `;
}

function mobileNavMarkup(site, navigation, active) {
  return html`
    <div class="mobile-nav__head">
      <a class="brand" href="/">
        <span class="brand__mark" aria-hidden="true">${site.brandMark}</span>
        <span>${site.brand}</span>
      </a>
      <button
        class="nav-toggle"
        type="button"
        data-nav-toggle
        aria-expanded="true"
        aria-label="Close menu"
      >
        <span class="nav-toggle__bars" aria-hidden="true"></span>
      </button>
    </div>

    <nav aria-label="Mobile">
      <ul class="mobile-nav__list">
        ${mapTo(
          navigation,
          (item, index) => html`
            <li>
              <a
                class="mobile-nav__link"
                href="${item.path}"
                ${raw(item.path === active ? 'aria-current="page"' : '')}
              >
                <span class="mobile-nav__index">${String(index + 1).padStart(2, '0')}</span>
                <span>${item.label}</span>
              </a>
            </li>
          `
        )}
      </ul>
    </nav>

    <div class="mobile-nav__foot">
      <a class="btn btn--primary btn--block" href="${site.resumeUrl}" download>
        ${iconRaw('download', { size: 16 })}
        <span>Download Résumé</span>
      </a>
      <div class="cluster">${socialLinks(site)}</div>
    </div>
  `;
}

/* -------------------------------------------------------------------------
   Footer
   ------------------------------------------------------------------------- */

function footerMarkup(site, navigation) {
  const year = new Date().getFullYear();

  return html`
    <div class="shell">
      <div class="site-footer__top">
        <div class="site-footer__brand">
          <a class="brand" href="/">
            <span class="brand__mark" aria-hidden="true">${site.brandMark}</span>
            <span>${site.brand}</span>
          </a>
          <p class="site-footer__note">${site.footer.note}</p>
          <div class="site-footer__socials">${socialLinks(site)}</div>
        </div>

        <div>
          <h2 class="site-footer__col-title">Navigate</h2>
          <ul class="site-footer__list">
            ${mapTo(
              navigation,
              (item) => html`<li><a href="${item.path}">${item.label}</a></li>`
            )}
          </ul>
        </div>

        <div>
          <h2 class="site-footer__col-title">Contact</h2>
          <ul class="site-footer__list">
            <li><a href="mailto:${site.contact.email}">${site.contact.email}</a></li>
            <li><a href="${site.contact.phoneHref}">${site.contact.phone}</a></li>
            <li><span class="text-muted">${site.location}</span></li>
          </ul>
        </div>

        <div>
          <h2 class="site-footer__col-title">Résumé</h2>
          <ul class="site-footer__list">
            <li>
              <a href="${site.resumeUrl}" download>
                Download PDF
              </a>
            </li>
            <li><span class="text-muted">${site.availability}</span></li>
          </ul>
        </div>
      </div>

      <div class="site-footer__bottom">
        <p>&copy; ${year} ${site.footer.copyright}. All rights reserved.</p>
        <div class="site-footer__legal">
          <span>${site.title}</span>
          <span>${site.domain}</span>
        </div>
      </div>
    </div>
  `;
}

/* -------------------------------------------------------------------------
   Mobile menu behaviour
   ------------------------------------------------------------------------- */

function initMobileNav() {
  const panel = document.getElementById('mobile-nav');
  if (!panel) return;

  const setOpen = (open) => {
    panel.classList.toggle('is-open', open);
    document.body.classList.toggle('is-nav-open', open);
    document.querySelectorAll('[data-nav-toggle]').forEach((button) => {
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    if (open) {
      panel.querySelector('.mobile-nav__link')?.focus({ preventScroll: true });
    }
  };

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-nav-toggle]')) {
      setOpen(!panel.classList.contains('is-open'));
      return;
    }
    if (panel.classList.contains('is-open') && event.target.closest('.mobile-nav__link')) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) {
      setOpen(false);
      document.querySelector('[data-nav-toggle]')?.focus();
    }
  });

  // The desktop breakpoint hides the panel, so leaving the body locked would
  // strand the page in a non-scrolling state after a resize.
  window.matchMedia('(min-width: 62rem)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  header.parentNode.insertBefore(sentinel, header);

  new IntersectionObserver(
    ([entry]) => header.classList.toggle('is-stuck', !entry.isIntersecting),
    { rootMargin: '0px' }
  ).observe(sentinel);
}

/* -------------------------------------------------------------------------
   Entry point
   ------------------------------------------------------------------------- */

export async function renderChrome() {
  const [site, navigation] = await Promise.all([getSite(), getNavigation()]);
  const active = activePath();

  mount('#site-header', headerMarkup(site, navigation, active));
  mount('#mobile-nav', mobileNavMarkup(site, navigation, active));
  mount('#site-footer', footerMarkup(site, navigation));

  initMobileNav();
  initStickyHeader();

  return site;
}

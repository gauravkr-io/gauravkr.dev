/**
 * Small presentational pieces reused across pages.
 *
 * These are plain functions returning markup strings. Anything that appears on
 * more than one page lives here so a change to a section heading or a call to
 * action lands everywhere at once.
 */

import { html, mapTo, raw, escapeHtml } from './utils.js';
import { iconRaw } from './icons.js';

export function eyebrow(text, { plain = false } = {}) {
  if (!text) return raw('');
  return raw(html`<p class="eyebrow ${plain ? 'eyebrow--plain' : ''}">${text}</p>`);
}

/**
 * Standard section heading. `split` puts the intro in a second column on wide
 * screens, which keeps long headlines from running to an unreadable measure.
 */
export function sectionHead(data = {}, { split = false, id = null } = {}) {
  if (!data.headline && !data.eyebrow) return raw('');
  return raw(html`
    <header class="section-head ${split ? 'section-head--split' : ''}" ${raw(id ? `id="${escapeHtml(id)}"` : '')}>
      ${eyebrow(data.eyebrow)}
      <h2 class="section-head__title display-md" data-reveal>${data.headline}</h2>
      ${data.intro ? raw(html`<p class="section-head__intro" data-reveal>${data.intro}</p>`) : ''}
    </header>
  `);
}

export function sectionFoot(cta) {
  if (!cta) return raw('');
  return raw(html`
    <div class="section-foot" data-reveal>
      <a class="btn btn--secondary" href="${cta.href}">
        <span>${cta.label}</span>
        <span class="btn__icon">${iconRaw('arrowRight', { size: 16 })}</span>
      </a>
    </div>
  `);
}

export function tagRow(items = [], { limit = null, variant = '' } = {}) {
  if (!Array.isArray(items) || items.length === 0) return raw('');
  const shown = limit ? items.slice(0, limit) : items;
  const remainder = limit && items.length > limit ? items.length - limit : 0;

  return raw(html`
    <ul class="tag-row">
      ${mapTo(shown, (item) => html`<li class="chip ${variant}">${item}</li>`)}
      ${remainder > 0 ? raw(html`<li class="chip text-muted">+${remainder} more</li>`) : ''}
    </ul>
  `);
}

export function statusChip(label) {
  if (!label) return raw('');
  return raw(html`
    <span class="chip chip--accent chip--status">
      <span class="chip__dot" aria-hidden="true"></span>
      ${label}
    </span>
  `);
}

export function breadcrumb(trail = []) {
  if (trail.length === 0) return raw('');
  return raw(html`
    <nav aria-label="Breadcrumb">
      <ol class="breadcrumb">
        ${mapTo(trail, (crumb) =>
          crumb.href
            ? html`<li><a href="${crumb.href}">${crumb.label}</a></li>`
            : html`<li aria-current="page">${crumb.label}</li>`
        )}
      </ol>
    </nav>
  `);
}

/** Header band used at the top of every page other than the homepage. */
export function pageHead({ eyebrow: label, title, intro, trail = [] }) {
  return raw(html`
    <div class="page-head__bloom accent-bloom" aria-hidden="true"></div>
    <div class="shell page-head__inner">
      ${breadcrumb(trail)}
      ${eyebrow(label)}
      <h1 class="page-head__title" data-reveal>${title}</h1>
      ${intro ? raw(html`<p class="page-head__intro" data-reveal>${intro}</p>`) : ''}
    </div>
  `);
}

export function ctaBand(data) {
  if (!data) return raw('');
  return raw(html`
    <div class="cta-band bracketed" data-reveal>
      <div class="cta-band__bloom accent-bloom" aria-hidden="true"></div>
      <div class="cta-band__inner">
        ${eyebrow(data.eyebrow)}
        <h2 class="cta-band__title">${data.headline}</h2>
        ${data.intro ? raw(html`<p class="cta-band__text">${data.intro}</p>`) : ''}
        <div class="cta-band__actions">
          ${data.primaryCta
            ? raw(html`
                <a class="btn btn--primary" href="${data.primaryCta.href}">
                  <span>${data.primaryCta.label}</span>
                  <span class="btn__icon">${iconRaw('arrowRight', { size: 16 })}</span>
                </a>
              `)
            : ''}
          ${data.secondaryCta
            ? raw(html`
                <a
                  class="btn btn--secondary"
                  href="${data.secondaryCta.href}"
                  ${raw(data.secondaryCta.href.endsWith('.pdf') ? 'download' : '')}
                >
                  ${data.secondaryCta.href.endsWith('.pdf') ? iconRaw('download', { size: 16 }) : ''}
                  <span>${data.secondaryCta.label}</span>
                </a>
              `)
            : ''}
        </div>
      </div>
    </div>
  `);
}

/** Shown when a filter matches nothing, or a slug does not resolve. */
export function emptyState(message, action = null) {
  return raw(html`
    <div class="empty-state">
      <p>${message}</p>
      ${action
        ? raw(html`
            <p style="margin-top:1rem">
              <a class="link-underline" href="${action.href}">
                <span>${action.label}</span>
                ${iconRaw('arrowRight', { size: 15 })}
              </a>
            </p>
          `)
        : ''}
    </div>
  `);
}

/** Renders a brand SVG as a masked block so it picks up the current colour. */
export function maskedIcon(path, label, className = 'icon-mask') {
  if (!path) return raw('');
  const safePath = escapeHtml(path);
  return raw(
    `<span class="${className}" role="img" aria-label="${escapeHtml(label)}" ` +
      `style="-webkit-mask-image:url('${safePath}');mask-image:url('${safePath}')"></span>`
  );
}

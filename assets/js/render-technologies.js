/**
 * Technology stack, grouped by category.
 *
 * Entries without a brand mark fall back to a monogram, which keeps the grid
 * even for platform concepts like OCAPI or Caching that have no official logo.
 */

import { html, mapTo, raw, mount, initials } from './utils.js';
import { maskedIcon } from './components.js';
import { getTechnologies } from './data-loader.js';

function badgeIcon(item) {
  if (item.logo) {
    return raw(html`<span class="tech-badge__icon">${maskedIcon(item.logo, item.name)}</span>`);
  }
  return raw(html`
    <span class="tech-badge__icon" aria-hidden="true">
      <span class="tech-badge__mono">${initials(item.name, 2)}</span>
    </span>
  `);
}

export function technologyBadge(item) {
  return html`
    <li class="tech-badge">
      ${badgeIcon(item)}
      <span class="tech-badge__name">
        ${item.name}
        ${item.note ? raw(html`<span class="tech-badge__note">${item.note}</span>`) : ''}
      </span>
    </li>
  `;
}

export function technologyGroup(group) {
  return html`
    <div class="tech-group" data-reveal>
      <div class="tech-group__head">
        <h3 class="tech-group__title">${group.category}</h3>
        ${group.description ? raw(html`<p class="tech-group__text">${group.description}</p>`) : ''}
      </div>
      <ul class="tech-grid">
        ${mapTo(group.items, technologyBadge)}
      </ul>
    </div>
  `;
}

export async function renderTechnologies(selector = '#tech-stack') {
  const groups = await getTechnologies();
  mount(selector, html`${mapTo(groups, technologyGroup)}`);
  return groups;
}

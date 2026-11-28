/**
 * Links page, built to sit behind a social profile link.
 *
 * One column, no site chrome and no layout that depends on width, so it paints
 * fast and reads the same on any phone. Everything comes from data/links.json
 * and data/site.json.
 */

import { html, mapTo, raw, mount, escapeHtml } from './utils.js';
import { icon, iconRaw, hasIcon } from './icons.js';
import { getLinks, getSite } from './data-loader.js';

function linkIcon(name) {
  if (!name) return raw('');
  if (name.startsWith('/')) {
    const path = escapeHtml(name);
    return raw(`<span class="icon-mask" aria-hidden="true" style="-webkit-mask-image:url('${path}');mask-image:url('${path}')"></span>`);
  }
  return hasIcon(name) ? raw(icon(name, { size: 22 })) : raw('');
}

function linkRow(link) {
  const external = /^https?:\/\//.test(link.url);
  const isFile = /\.pdf$/i.test(link.url);
  return html`
    <li>
      <a
        class="link-row"
        href="${link.url}"
        ${raw(external ? 'target="_blank" rel="noopener noreferrer"' : '')}
        ${raw(isFile ? 'download' : '')}
      >
        <span class="link-row__icon">${linkIcon(link.icon)}</span>
        <span class="link-row__text">
          <span class="link-row__label">${link.label}</span>
          ${link.description ? raw(html`<span class="link-row__note">${link.description}</span>`) : ''}
        </span>
        <span class="link-row__arrow" aria-hidden="true">${iconRaw('arrowRight', { size: 18 })}</span>
      </a>
    </li>
  `;
}

function groupBlock(group) {
  return html`
    <section class="link-group" aria-labelledby="group-${group.id}">
      <h2 class="link-group__title" id="group-${group.id}">${group.title}</h2>
      <ul class="link-group__list">${mapTo(group.links, linkRow)}</ul>
    </section>
  `;
}

export async function initLinksPage() {
  const [{ groups }, site] = await Promise.all([getLinks(), getSite()]);
  const image = site.profileImage;

  mount(
    '#links-root',
    html`
      <header class="links-profile">
        <img
          class="links-profile__avatar"
          src="${image.src}"
          srcset="${image.srcset}"
          sizes="112px"
          alt="${image.alt}"
          width="112"
          height="112"
          decoding="async"
          fetchpriority="high"
        />
        <h1 class="links-profile__name">${site.name}</h1>
        <p class="links-profile__role">${site.title}</p>
        <p class="links-profile__place">${site.location}</p>
      </header>

      ${mapTo(groups, groupBlock)}

      <footer class="links-foot">
        <a href="/">${site.domain}</a>
      </footer>
    `
  );
}

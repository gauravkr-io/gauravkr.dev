/**
 * The /clear-cache/ page.
 *
 * Loading this address makes the server send "Clear-Site-Data: cache" (see
 * _headers), which tells the browser to drop everything it saved for this
 * site. Only the cache is cleared, so the visitor's theme choice survives. The
 * page then sends them to the home page. Safari and Firefox ignore the header,
 * so the page also says how to do a hard refresh.
 */

import { html, mount } from './utils.js';
import { fetchJson } from './data-loader.js';

export async function initClearCachePage() {
  const { clearCache } = await fetchJson('clear-cache.json');

  mount(
    '#clear-root',
    html`
      <section class="notice-card" role="status" aria-live="polite">
        <h1 class="notice-card__title">${clearCache.title}</h1>
        <p class="notice-card__text">${clearCache.body}</p>
        <p class="notice-card__note">${clearCache.fallback}</p>
        <p><a class="link-underline" href="/"><span>${clearCache.backLabel}</span></a></p>
      </section>
    `
  );

  window.setTimeout(() => window.location.replace('/'), clearCache.redirectAfterMs ?? 3500);
}

/**
 * Blog list and the post page behaviour.
 *
 * Posts are written as Markdown and turned into one static page each at build
 * time (see scripts/build.mjs), so the article is already in the HTML when this
 * script runs. Here we only draw the list, wire up the interactive parts of a
 * post, and forward old query-string links to the new address.
 */

import {
  html,
  mapTo,
  raw,
  mount,
  $,
  $$,
  formatDate,
  getSlugParam
} from './utils.js';
import { iconRaw } from './icons.js';
import { pageHead, emptyState, tagRow } from './components.js';
import { getPostsIndex } from './data-loader.js';
import { refreshScrollReveal, initTocSpy } from './scroll-animations.js';

/* -------------------------------------------------------------------------
   Cards
   ------------------------------------------------------------------------- */

export function blogCard(post) {
  return html`
    <li class="entry-card bracketed" data-reveal data-category="${post.category}">
      <div class="entry-card__media">
        <img
          src="${post.coverImage}"
          alt="Cover illustration for ${post.title}"
          loading="lazy"
          decoding="async"
          width="1200"
          height="675"
        />
        <span class="entry-card__badge"><span class="chip chip--accent chip--status">${post.category}</span></span>
      </div>

      <div class="entry-card__body">
        <div class="entry-card__meta">
          <span>${formatDate(post.date)}</span>
          <span>${post.readingTime}</span>
        </div>

        <h3 class="entry-card__title">${post.title}</h3>
        <p class="entry-card__text">${post.summary}</p>
        ${tagRow(post.tags, { limit: 3 })}

        <div class="entry-card__foot">
          <a class="link-underline stretched-link" href="/blogs/${post.slug}/">
            <span>Read post</span>
            ${iconRaw('arrowRight', { size: 15 })}
          </a>
        </div>
      </div>
    </li>
  `;
}

export async function renderBlogsPreview(selector = '#blogs-preview', limit = 3) {
  const { posts } = await getPostsIndex();
  const shown = posts.slice(0, limit);
  mount(selector, html`${mapTo(shown, blogCard)}`);
  return shown;
}

/* -------------------------------------------------------------------------
   List page with category filtering
   ------------------------------------------------------------------------- */

function filterBar(categories) {
  if (categories.length === 0) return raw('');
  return raw(html`
    <div class="filter-bar" role="group" aria-label="Filter posts by category">
      ${mapTo(
        categories,
        (category, index) => html`
          <button
            class="filter-chip"
            type="button"
            data-filter="${category}"
            aria-pressed="${index === 0 ? 'true' : 'false'}"
          >${category}</button>
        `
      )}
    </div>
  `);
}

function initFilters(listSelector, emptySelector) {
  const list = $(listSelector);
  const emptyNotice = $(emptySelector);
  if (!list) return;

  document.addEventListener('click', (event) => {
    const chip = event.target.closest('.filter-chip');
    if (!chip) return;

    const selected = chip.dataset.filter;
    $$('.filter-chip').forEach((button) => {
      button.setAttribute('aria-pressed', String(button === chip));
    });

    let visible = 0;
    $$('[data-category]', list).forEach((card) => {
      const matches = selected === 'All' || card.dataset.category === selected;
      card.hidden = !matches;
      if (matches) visible += 1;
    });

    if (emptyNotice) emptyNotice.hidden = visible > 0;
  });
}

export async function initBlogsPage() {
  const { meta, categories, posts } = await getPostsIndex();

  mount(
    '#page-head',
    pageHead({
      eyebrow: meta.eyebrow,
      title: meta.headline,
      intro: meta.intro,
      trail: [{ label: 'Home', href: '/' }, { label: 'Blogs' }]
    })
  );

  mount('#blogs-filter', filterBar(categories));
  mount('#blogs-list', html`${mapTo(posts, blogCard)}`);
  mount('#blogs-empty', emptyState('No posts in this category yet.'));
  const emptyNotice = $('#blogs-empty');
  if (emptyNotice) emptyNotice.hidden = true;

  initFilters('#blogs-list', '#blogs-empty');
}

/**
 * Mermaid diagrams are rare, so the library only loads on posts that use one.
 * Themed to match the dark, fixed-palette code blocks rather than the toggle.
 */
async function initMermaid() {
  if (!document.querySelector('.mermaid')) return;

  const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    fontFamily: 'Inter, sans-serif',
    themeVariables: {
      background: '#0E1136',
      primaryColor: '#1A1D66',
      primaryBorderColor: '#A596FF',
      primaryTextColor: '#D6D9F5',
      lineColor: '#8C92C0',
      secondaryColor: '#262A78',
      tertiaryColor: '#262A78',
      actorBkg: '#1A1D66',
      actorBorder: '#A596FF',
      actorTextColor: '#D6D9F5',
      actorLineColor: '#8C92C0',
      signalColor: '#8C92C0',
      signalTextColor: '#D6D9F5',
      labelBoxBkgColor: '#1A1D66',
      labelBoxBorderColor: '#A596FF',
      labelTextColor: '#D6D9F5',
      noteBkgColor: '#262A78',
      noteTextColor: '#D6D9F5',
      noteBorderColor: '#262A78'
    }
  });

  await mermaid.run({ querySelector: '.mermaid' });
}

function initCopyLink() {
  document.addEventListener('click', async (event) => {
    if (!event.target.closest('[data-copy-link]')) return;
    const status = $('[data-copy-status]');
    try {
      await navigator.clipboard.writeText(window.location.href);
      if (status) status.textContent = 'Link copied';
    } catch {
      if (status) status.textContent = 'Press Ctrl+C to copy';
    }
    window.setTimeout(() => {
      if (status) status.textContent = '';
    }, 2600);
  });
}

/* -------------------------------------------------------------------------
   Post page
   ------------------------------------------------------------------------- */

export async function initBlogPostPage() {
  // Built pages already contain the article. Wire up the interactive parts only.
  if (document.querySelector('#post-body[data-prerendered]')) {
    refreshScrollReveal();
    initTocSpy();
    initCopyLink();
    await initMermaid();
    return;
  }

  // Old links look like /pages/blog-post.html?slug=... Cloudflare redirect rules
  // cannot match a query string, so the forward happens here.
  const slug = getSlugParam();
  if (slug) {
    const { posts } = await getPostsIndex();
    if (posts.some((entry) => entry.slug === slug)) {
      window.location.replace(`/blogs/${slug}/`);
      return;
    }
  }

  mount(
    '#page-head',
    pageHead({
      eyebrow: 'Writing',
      title: 'Post not found',
      intro: 'That link does not match a post on the site.',
      trail: [{ label: 'Home', href: '/' }, { label: 'Blogs', href: '/pages/blogs.html' }]
    })
  );
  mount('#post-body', emptyState('This post is not available.', { label: 'Read the latest posts', href: '/pages/blogs.html' }));
}

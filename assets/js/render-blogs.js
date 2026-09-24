/**
 * Blog list and the shared post template.
 *
 * Post bodies are stored as typed content blocks rather than HTML strings, so
 * the JSON stays safe to edit and the renderer decides the markup. Only the
 * narrow inline subset handled by `inlineMarkup` produces any tags.
 */

import {
  html,
  mapTo,
  raw,
  mount,
  $,
  $$,
  formatDate,
  getSlugParam,
  inlineMarkup,
  slugifyHeading,
  setDocumentMeta,
  escapeHtml
} from './utils.js';
import { iconRaw } from './icons.js';
import { pageHead, emptyState, tagRow } from './components.js';
import { getPostsIndex, getPost } from './data-loader.js';
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
          <a class="link-underline stretched-link" href="/pages/blog-post.html?slug=${post.slug}">
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

/* -------------------------------------------------------------------------
   Content blocks
   ------------------------------------------------------------------------- */

function renderBlock(block) {
  switch (block.type) {
    case 'heading': {
      const level = block.level === 3 ? 3 : 2;
      const id = slugifyHeading(block.text);
      return `<h${level} id="${escapeHtml(id)}">${escapeHtml(block.text)}</h${level}>`;
    }

    case 'paragraph':
      return html`<p>${inlineMarkup(block.text)}</p>`;

    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = (block.items ?? []).map((item) => html`<li>${inlineMarkup(item)}</li>`).join('');
      return `<${tag}>${items}</${tag}>`;
    }

    case 'code':
      return html`
        <div class="code-block">
          <div class="code-block__head">
            <span>${block.language ?? 'code'}</span>
          </div>
          <pre><code>${block.code}</code></pre>
        </div>
      `;

    case 'callout':
      return html`
        <aside class="callout ${block.variant === 'warning' ? 'callout--warning' : ''}">
          ${block.title ? raw(html`<p class="callout__title">${block.title}</p>`) : ''}
          <p class="callout__text">${inlineMarkup(block.text)}</p>
        </aside>
      `;

    case 'quote':
      return html`
        <blockquote class="pull-quote">
          <p>${inlineMarkup(block.text)}</p>
          ${block.attribution ? raw(html`<cite>${block.attribution}</cite>`) : ''}
        </blockquote>
      `;

    case 'image':
      return html`
        <figure class="post-figure">
          <img
            src="${block.src}"
            alt="${block.alt ?? ''}"
            loading="lazy"
            decoding="async"
          />
          ${block.caption ? raw(html`<figcaption>${inlineMarkup(block.caption)}</figcaption>`) : ''}
        </figure>
      `;

    case 'table': {
      const head = block.head ?? [];
      const rows = block.rows ?? [];
      const headMarkup = head.length > 0
        ? `<thead><tr>${head.map((cell) => `<th>${inlineMarkup(cell)}</th>`).join('')}</tr></thead>`
        : '';
      const bodyMarkup = rows
        .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkup(cell)}</td>`).join('')}</tr>`)
        .join('');
      return `
        <div class="table-wrap">
          <table>
            ${headMarkup}
            <tbody>${bodyMarkup}</tbody>
          </table>
        </div>
      `;
    }

    case 'mermaid':
      return html`<div class="mermaid-block mermaid">${block.code}</div>`;

    default:
      return '';
  }
}

function buildToc(content = []) {
  return content
    .filter((block) => block.type === 'heading' && (block.level ?? 2) === 2)
    .map((block) => ({ id: slugifyHeading(block.text), text: block.text }));
}

function tocMarkup(entries) {
  if (entries.length === 0) return raw('');
  return raw(html`
    <nav class="aside-card toc" aria-label="On this page">
      <p class="aside-card__title">On this page</p>
      <ul class="toc__list">
        ${mapTo(entries, (entry) => html`<li><a class="toc__link" href="#${entry.id}">${entry.text}</a></li>`)}
      </ul>
    </nav>
  `);
}

function shareRow(post) {
  const url = window.location.href;
  const text = post.title;
  return html`
    <div class="share-row">
      <span class="aside-card__title" style="margin:0">Share</span>
      <a
        class="share-button"
        href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
      >${iconRaw('arrowUpRight', { size: 16 })}</a>
      <a
        class="share-button"
        href="https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
      >${iconRaw('arrowUpRight', { size: 16 })}</a>
      <button class="share-button" type="button" data-copy-link aria-label="Copy link to this post">
        ${iconRaw('link', { size: 16 })}
      </button>
      <span class="text-muted" data-copy-status role="status" aria-live="polite"></span>
    </div>
  `;
}

/**
 * Mermaid diagrams are rare, so the library only loads on posts that use one.
 * Themed to match the dark, fixed-palette code blocks rather than the toggle.
 */
async function initMermaid(content) {
  const hasMermaid = (content ?? []).some((block) => block.type === 'mermaid');
  if (!hasMermaid) return;

  const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    fontFamily: 'Inter, sans-serif',
    themeVariables: {
      background: '#0F141B',
      primaryColor: '#1B2330',
      primaryBorderColor: '#F0B76C',
      primaryTextColor: '#D7DEE8',
      lineColor: '#7C8798',
      secondaryColor: '#232C39',
      tertiaryColor: '#232C39',
      actorBkg: '#1B2330',
      actorBorder: '#F0B76C',
      actorTextColor: '#D7DEE8',
      actorLineColor: '#7C8798',
      signalColor: '#7C8798',
      signalTextColor: '#D7DEE8',
      labelBoxBkgColor: '#1B2330',
      labelBoxBorderColor: '#F0B76C',
      labelTextColor: '#D7DEE8',
      noteBkgColor: '#232C39',
      noteTextColor: '#D7DEE8',
      noteBorderColor: '#232C39'
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

function postNav(posts, currentSlug) {
  const index = posts.findIndex((entry) => entry.slug === currentSlug);
  if (index === -1) return raw('');

  const newer = posts[index - 1];
  const older = posts[index + 1];
  if (!newer && !older) return raw('');

  return raw(html`
    <nav class="post-nav" aria-label="More posts">
      ${older
        ? raw(html`
            <a class="post-nav__item" href="/pages/blog-post.html?slug=${older.slug}">
              <span class="post-nav__label">Previous</span>
              <span class="post-nav__title">${older.title}</span>
            </a>
          `)
        : raw('<span></span>')}
      ${newer
        ? raw(html`
            <a class="post-nav__item post-nav__item--next" href="/pages/blog-post.html?slug=${newer.slug}">
              <span class="post-nav__label">Next</span>
              <span class="post-nav__title">${newer.title}</span>
            </a>
          `)
        : ''}
    </nav>
  `);
}

/* -------------------------------------------------------------------------
   Post template
   ------------------------------------------------------------------------- */

export async function initBlogPostPage() {
  const slug = getSlugParam();
  const { posts } = await getPostsIndex();

  let post = null;
  if (slug && posts.some((entry) => entry.slug === slug)) {
    try {
      post = await getPost(slug);
    } catch {
      post = null;
    }
  }

  if (!post) {
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
    return;
  }

  setDocumentMeta({
    title: `${post.title} — Gaurav Kumar`,
    description: post.subtitle ?? post.summary,
    image: post.coverImage
  });

  const toc = post.tableOfContents === false ? [] : buildToc(post.content);
  const related = posts.filter((entry) => (post.relatedPosts ?? []).includes(entry.slug)).slice(0, 2);

  mount(
    '#page-head',
    pageHead({
      eyebrow: post.category,
      title: post.title,
      intro: post.subtitle,
      trail: [
        { label: 'Home', href: '/' },
        { label: 'Blogs', href: '/pages/blogs.html' },
        { label: post.category }
      ]
    })
  );

  mount(
    '#post-body',
    html`
      <div class="detail-hero-media" data-reveal>
        <img
          src="${post.coverImage}"
          alt="Cover illustration for ${post.title}"
          decoding="async"
          width="1200"
          height="675"
        />
      </div>

      <div class="detail-layout">
        <div class="detail-main">
          <div class="article-byline">
            <span class="article-byline__author">${post.author?.name}</span>
            <span>${formatDate(post.date)}</span>
            <span>${post.readingTime}</span>
          </div>

          <article class="prose">
            ${raw((post.content ?? []).map(renderBlock).join(''))}
          </article>

          ${tagRow(post.tags)}
          ${raw(shareRow(post))}
          ${postNav(posts, post.slug)}
        </div>

        <aside class="detail-aside">
          ${tocMarkup(toc)}

          ${related.length > 0
            ? raw(html`
                <div class="aside-card">
                  <p class="aside-card__title">Related reading</p>
                  <ul class="site-footer__list">
                    ${mapTo(
                      related,
                      (entry) => html`
                        <li>
                          <a class="link-underline" href="/pages/blog-post.html?slug=${entry.slug}">
                            <span>${entry.title}</span>
                            ${iconRaw('arrowRight', { size: 14 })}
                          </a>
                        </li>
                      `
                    )}
                  </ul>
                </div>
              `)
            : ''}

          <div class="aside-card aside-card--accent">
            <p class="aside-card__title">Working on something similar</p>
            <p class="tech-group__text" style="margin-bottom:1rem">
              I take on commerce and backend engagements where this kind of problem comes up.
            </p>
            <a class="btn btn--primary btn--block" href="/pages/contact.html">
              <span>Get in touch</span>
              <span class="btn__icon">${iconRaw('arrowRight', { size: 16 })}</span>
            </a>
          </div>
        </aside>
      </div>
    `
  );

  refreshScrollReveal();
  initTocSpy();
  initCopyLink();
  await initMermaid(post.content);
}

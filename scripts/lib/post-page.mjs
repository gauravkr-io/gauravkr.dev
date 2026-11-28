/**
 * Builds the static page for one post.
 *
 * The article, the heading block and every social tag are written into the HTML
 * itself, so a crawler or a link preview sees them without running JavaScript.
 * The header and footer are still drawn by the shared script on load. The markup
 * mirrors what the old browser renderer produced, so the existing CSS applies.
 */
import { escapeHtml as esc } from './markdown.mjs';
import { formatDate } from '../../assets/js/utils.js';
import { icon } from '../../assets/js/icons.js';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

export const postUrl = (site, post) => `${site.url}/blogs/${post.slug}/`;
export const ogImagePath = (post) => `/assets/images/og/${post.slug}.jpg`;

function tagRow(tags) {
  return `<ul class="tag-row">${tags.map((tag) => `<li class="chip ">${esc(tag)}</li>`).join('')}</ul>`;
}

function pageHead(post) {
  return `
    <div class="page-head__bloom accent-bloom" aria-hidden="true"></div>
    <div class="shell page-head__inner">
      <nav aria-label="Breadcrumb">
        <ol class="breadcrumb">
          <li><a href="/">Home</a></li>
          <li><a href="/pages/blogs.html">Blogs</a></li>
          <li aria-current="page">${esc(post.category)}</li>
        </ol>
      </nav>
      <p class="eyebrow ">${esc(post.category)}</p>
      <h1 class="page-head__title">${esc(post.title)}</h1>
      ${post.subtitle ? `<p class="page-head__intro">${esc(post.subtitle)}</p>` : ''}
    </div>
  `;
}

function tocBlock(post) {
  const entries = post.tableOfContents ? post.headings.filter((h) => h.level === 2) : [];
  if (entries.length === 0) return '';
  return `
    <nav class="aside-card toc" aria-label="On this page">
      <p class="aside-card__title">On this page</p>
      <ul class="toc__list">
        ${entries.map((e) => `<li><a class="toc__link" href="#${esc(e.id)}">${esc(e.text)}</a></li>`).join('')}
      </ul>
    </nav>
  `;
}

function shareRow(post, url) {
  const link = encodeURIComponent(url);
  const text = encodeURIComponent(post.title);
  return `
    <div class="share-row">
      <span class="aside-card__title" style="margin:0">Share</span>
      <a class="share-button" href="https://www.linkedin.com/sharing/share-offsite/?url=${link}" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">${icon('arrowUpRight', { size: 16 })}</a>
      <a class="share-button" href="https://x.com/intent/tweet?url=${link}&amp;text=${text}" target="_blank" rel="noopener noreferrer" aria-label="Share on X">${icon('arrowUpRight', { size: 16 })}</a>
      <button class="share-button" type="button" data-copy-link aria-label="Copy link to this post">${icon('link', { size: 16 })}</button>
      <span class="text-muted" data-copy-status role="status" aria-live="polite"></span>
    </div>
  `;
}

function postNav(post, published) {
  const index = published.findIndex((entry) => entry.slug === post.slug);
  if (index === -1) return '';
  const newer = published[index - 1];
  const older = published[index + 1];
  if (!newer && !older) return '';
  return `
    <nav class="post-nav" aria-label="More posts">
      ${older ? `<a class="post-nav__item" href="/blogs/${esc(older.slug)}/"><span class="post-nav__label">Previous</span><span class="post-nav__title">${esc(older.title)}</span></a>` : '<span></span>'}
      ${newer ? `<a class="post-nav__item post-nav__item--next" href="/blogs/${esc(newer.slug)}/"><span class="post-nav__label">Next</span><span class="post-nav__title">${esc(newer.title)}</span></a>` : ''}
    </nav>
  `;
}

/** Related reading comes only from the post's own relatedPosts list. */
export function relatedFor(post, published) {
  // Shown in the same newest-first order as the blog list.
  return published.filter((p) => post.relatedPosts.includes(p.slug)).slice(0, 2);
}

function relatedBlock(post, published) {
  const related = relatedFor(post, published);
  if (related.length === 0) return '';
  return `
    <div class="aside-card">
      <p class="aside-card__title">Related reading</p>
      <ul class="site-footer__list">
        ${related.map((e) => `<li><a class="link-underline" href="/blogs/${esc(e.slug)}/"><span>${esc(e.title)}</span>${icon('arrowRight', { size: 14 })}</a></li>`).join('')}
      </ul>
    </div>
  `;
}

function postBody(post, site, published) {
  const url = postUrl(site, post);
  return `
      <div class="detail-hero-media" data-reveal>
        <img src="${esc(post.coverImage)}" alt="Cover illustration for ${esc(post.title)}" decoding="async" width="1200" height="675" />
      </div>

      <div class="detail-layout">
        <div class="detail-main">
          <div class="article-byline">
            <span class="article-byline__author">${esc(post.author)}</span>
            <span>${esc(formatDate(post.date))}</span>
            <span>${esc(post.readingTime)}</span>
          </div>

          <article class="prose">
${post.html}
          </article>

          ${tagRow(post.tags)}
          ${shareRow(post, url)}
          ${postNav(post, published)}
        </div>

        <aside class="detail-aside">
          ${tocBlock(post)}
          ${relatedBlock(post, published)}
          <div class="aside-card aside-card--accent">
            <p class="aside-card__title">Working on something similar</p>
            <p class="tech-group__text" style="margin-bottom:1rem">I take on commerce and backend engagements where this kind of problem comes up.</p>
            <a class="btn btn--primary btn--block" href="/pages/contact.html">
              <span>Get in touch</span>
              <span class="btn__icon">${icon('arrowRight', { size: 16 })}</span>
            </a>
          </div>
        </aside>
      </div>
  `;
}

function metaTags(post, site) {
  const url = postUrl(site, post);
  const image = `${site.url}${ogImagePath(post)}`;
  const title = `${post.title} | ${site.name}`;
  const description = post.summary;
  const alt = `Cover illustration for ${post.title}`;
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="${esc(site.name)}" />`,
    `<meta property="og:title" content="${esc(post.title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:type" content="image/jpeg" />`,
    `<meta property="og:image:width" content="${OG_WIDTH}" />`,
    `<meta property="og:image:height" content="${OG_HEIGHT}" />`,
    `<meta property="og:image:alt" content="${esc(alt)}" />`,
    `<meta property="article:published_time" content="${esc(post.date)}" />`,
    `<meta property="article:section" content="${esc(post.category)}" />`,
    ...post.tags.map((tag) => `<meta property="article:tag" content="${esc(tag)}" />`),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(post.title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    `<meta name="twitter:image:alt" content="${esc(alt)}" />`,
    `<meta name="theme-color" content="#0A0D26" />`
  ];
  return tags.join('\n  ');
}

function jsonLd(post, site) {
  const url = postUrl(site, post);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    image: [`${site.url}${ogImagePath(post)}`],
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Person', name: post.author, url: site.url },
    publisher: { '@type': 'Person', name: site.name, url: site.url },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: post.category,
    keywords: post.tags.join(', '),
    url
  };
  // "<" is escaped so a post title can never close the script tag.
  const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">\n${json}\n  </script>`;
}

export function renderPostPage(template, post, site, published) {
  return template
    .replace('{{meta}}', () => metaTags(post, site))
    .replace('{{jsonld}}', () => jsonLd(post, site))
    .replace('{{pageHead}}', () => pageHead(post))
    .replace('{{postBody}}', () => postBody(post, site, published));
}

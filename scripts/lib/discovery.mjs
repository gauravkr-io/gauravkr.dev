/**
 * sitemap.xml, rss.xml and robots.txt, built only from content that is visible
 * and published, using the site address from data/site.json.
 */
import { escapeHtml as esc } from './markdown.mjs';
import { postUrl } from './post-page.mjs';

export function buildSitemap(site, published, navigation) {
  const pages = navigation.filter((item) => item.visible !== false).map((item) => item.path);
  pages.push('/links/');
  const unique = [...new Set(pages)];
  const entries = [
    ...unique.map((path) => `  <url><loc>${esc(site.url + (path === '/' ? '/' : path))}</loc></url>`),
    ...published.map((post) => `  <url><loc>${esc(postUrl(site, post))}</loc><lastmod>${post.date}</lastmod></url>`)
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

export function buildRobots(site) {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /pages/blog-post.html',
    'Disallow: /admin/',
    'Disallow: /clear-cache/',
    '',
    `Sitemap: ${site.url}/sitemap.xml`,
    ''
  ].join('\n');
}

export function buildRss(site, published) {
  const items = published.map((post) => {
    const url = postUrl(site, post);
    const when = new Date(`${post.date}T00:00:00Z`).toUTCString();
    return [
      '    <item>',
      `      <title>${esc(post.title)}</title>`,
      `      <link>${esc(url)}</link>`,
      `      <guid isPermaLink="true">${esc(url)}</guid>`,
      `      <pubDate>${when}</pubDate>`,
      `      <description>${esc(post.summary)}</description>`,
      ...[...new Set([post.category, ...post.tags])].map((name) => `      <category>${esc(name)}</category>`),
      '    </item>'
    ].join('\n');
  });
  const latest = published[0] ? new Date(`${published[0].date}T00:00:00Z`).toUTCString() : new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.name)}</title>
    <link>${esc(site.url)}/</link>
    <description>${esc(site.summary)}</description>
    <language>en</language>
    <lastBuildDate>${latest}</lastBuildDate>
    <atom:link href="${esc(site.url)}/rss.xml" rel="self" type="application/rss+xml" />
${items.join('\n')}
  </channel>
</rss>
`;
}

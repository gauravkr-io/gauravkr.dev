/**
 * Parity check for the Markdown migration.
 *
 * tests/parity/baseline/<slug>.json holds how each post rendered in the browser
 * before the move to Markdown: title, headings, article text, tags, table of
 * contents and structure counts. This builds the site and compares the same
 * fields from every new static page. Exit code 1 if any post differs.
 *
 * Usage: npm run parity
 */
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { build } from './build.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baselineDir = join(root, 'tests/parity/baseline');
const norm = (text) => (text ?? '').replace(/\s+/g, ' ').trim();

function extract(html) {
  const $ = cheerio.load(html);
  const text = (selector) => norm($(selector).first().text());
  const all = (selector) => $(selector).toArray();
  const count = (selector) => $(selector).length;
  return {
    documentTitle: norm($('title').text()),
    eyebrow: text('.page-head .eyebrow'),
    title: text('.page-head__title'),
    subtitle: text('.page-head__intro'),
    breadcrumb: all('.breadcrumb li').map((e) => norm($(e).text())),
    byline: all('.article-byline > *').map((e) => norm($(e).text())),
    article: norm($('.prose').text()),
    headings: all('.prose h2, .prose h3').map((h) => ({ level: h.tagName.toUpperCase(), id: $(h).attr('id'), text: norm($(h).text()) })),
    counts: {
      paragraphs: count('.prose > p'),
      lists: count('.prose > ul, .prose > ol'),
      codeBlocks: count('.prose .code-block'),
      callouts: count('.prose .callout'),
      warningCallouts: count('.prose .callout--warning'),
      figures: count('.prose .post-figure'),
      tables: count('.prose .table-wrap table'),
      mermaid: count('.prose .mermaid-block'),
      listItems: count('.prose li'),
      tableCells: count('.prose td, .prose th')
    },
    codeLangs: all('.prose .code-block__head span').map((e) => norm($(e).text())),
    images: all('.prose img').map((i) => ({ src: $(i).attr('src'), alt: $(i).attr('alt') })),
    captions: all('.prose figcaption').map((e) => norm($(e).text())),
    tags: all('.detail-main > .tag-row .chip').map((e) => norm($(e).text())),
    toc: all('.toc__link').map((e) => ({ href: $(e).attr('href'), text: norm($(e).text()) })),
    related: all('.detail-aside .aside-card:not(.toc):not(.aside-card--accent) a').map((e) => norm($(e).text())),
    postNav: all('.post-nav__item').map((e) => norm($(e).text())),
    cover: $('.detail-hero-media img').attr('src')
  };
}

/**
 * The old page glued blocks together without a space ("faster.That trade") and
 * the new HTML separates them. The words are what must match, so text fields
 * are compared with whitespace removed. The structure counts guard the rest.
 */
const SQUASHED = new Set(['article', 'postNav']);
const squash = (value) => (Array.isArray(value) ? value.map(squash) : typeof value === 'string' ? value.replace(/\s+/g, '') : value);
const comparable = (key, value) => (SQUASHED.has(key) ? squash(value) : value);

function firstDifference(a, b) {
  const x = JSON.stringify(a);
  const y = JSON.stringify(b);
  let i = 0;
  while (i < x.length && x[i] === y[i]) i += 1;
  return `at character ${i}: old ...${x.slice(Math.max(0, i - 40), i + 60)}...  new ...${y.slice(Math.max(0, i - 40), i + 60)}...`;
}

const result = await build();
const slugs = (await readdir(baselineDir)).filter((name) => name.endsWith('.json')).map((name) => name.replace('.json', '')).sort();
let failed = 0;

console.log(`Comparing ${slugs.length} posts: old rendered page vs new static page\n`);
for (const slug of slugs) {
  const old = JSON.parse(await readFile(join(baselineDir, `${slug}.json`), 'utf8'));
  let now;
  try {
    now = extract(await readFile(join(result.dist, 'blogs', slug, 'index.html'), 'utf8'));
  } catch {
    console.log(`FAIL  ${slug.padEnd(36)} no static page was built`);
    failed += 1;
    continue;
  }
  const differences = Object.keys(old).filter((key) => JSON.stringify(comparable(key, old[key])) !== JSON.stringify(comparable(key, now[key])));
  if (differences.length === 0) {
    console.log(`PASS  ${slug.padEnd(36)} ${String(old.article.length).padStart(6)} chars of article text, ${old.headings.length} headings, ${old.counts.codeBlocks} code, ${old.counts.tables} tables, ${old.counts.mermaid} diagrams`);
  } else {
    failed += 1;
    console.log(`FAIL  ${slug}`);
    for (const key of differences) console.log(`      ${key}: ${firstDifference(comparable(key, old[key]), comparable(key, now[key]))}`);
  }
}

console.log(`\n${slugs.length - failed} of ${slugs.length} posts match.`);
process.exit(failed === 0 ? 0 : 1);

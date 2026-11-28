/**
 * Builds the static site into dist/.
 *
 * The browser still runs plain HTML, CSS and ES modules. This script validates
 * the content, copies the site, then generates what a visitor or a crawler
 * needs to see without running any script: one page per post, link preview
 * images, the post index, and the sitemap, feed and robots files.
 */
import { cp, rm, rename, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate.mjs';
import { loadPosts } from './lib/posts.mjs';
import { renderPostPage } from './lib/post-page.mjs';
import { buildOgImage } from './lib/og.mjs';
import { buildSitemap, buildRobots, buildRss } from './lib/discovery.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

const COPY = ['index.html', 'pages', 'links', 'clear-cache', 'admin', 'assets', 'data', 'resume', 'CNAME', '_headers', '_redirects'];

export class BuildError extends Error {
  constructor(problems, headline) {
    super(headline ?? `Build stopped. Content validation found ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
    this.problems = problems;
  }
}

async function listFiles(dir, test) {
  const out = [];
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full, test)));
    else if (test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Cache busting. Stylesheets and scripts keep their file names between deploys,
 * so a browser could keep an old copy. This gives every one of them an address
 * that changes whenever any of them changes, for example main.js?v=3fa9c1d2e4,
 * in the pages and in the scripts' own imports. The version comes from the
 * file contents, so an unchanged site keeps the same version and a changed one
 * can never be served from an old copy.
 *
 * A reference that slips through unversioned would defeat the long cache in
 * _headers, so the build fails if it finds one.
 */
const IMPORT = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']+?\.js)\2/g;
const UNVERSIONED_IMPORT = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"'?]+?\.js)\2/;
const ASSET_REF = /((?:href|src)=")(\/assets\/(?:css|js)\/[^"?#]+\.(?:css|js))(")/g;
const UNVERSIONED_ASSET = /(?:href|src)="\/assets\/(?:css|js)\/[^"?#]+\.(?:css|js)"/;

async function versionAssets(dist) {
  const css = await listFiles(join(dist, 'assets/css'), (n) => n.endsWith('.css'));
  const scripts = await listFiles(join(dist, 'assets/js'), (n) => n.endsWith('.js'));
  const code = [...css, ...scripts].sort();

  const hash = createHash('sha256');
  for (const file of code) {
    hash.update(relative(dist, file));
    hash.update(await readFile(file));
  }
  const version = hash.digest('hex').slice(0, 10);

  for (const file of scripts) {
    const text = await readFile(file, 'utf8');
    await writeFile(file, text.replace(IMPORT, (_m, lead, quote, spec) => `${lead}${quote}${spec}?v=${version}${quote}`));
  }
  const pages = await listFiles(dist, (n) => n.endsWith('.html'));
  for (const file of pages) {
    const text = await readFile(file, 'utf8');
    await writeFile(file, text.replace(ASSET_REF, (_m, open, path, close) => `${open}${path}?v=${version}${close}`));
  }

  const problems = [];
  for (const file of pages) {
    if (UNVERSIONED_ASSET.test(await readFile(file, 'utf8'))) problems.push(`${relative(dist, file)}: a stylesheet or script address has no version`);
  }
  for (const file of scripts) {
    if (UNVERSIONED_IMPORT.test(await readFile(file, 'utf8'))) problems.push(`${relative(dist, file)}: an import has no version`);
  }
  for (const file of css) {
    if (/@import/.test(await readFile(file, 'utf8'))) problems.push(`${relative(dist, file)}: @import cannot be versioned. Link the stylesheet from the page instead`);
  }
  if (problems.length) throw new BuildError(problems, 'Build stopped. Cache busting found an address it could not version');
  return version;
}

async function readJson(rel) {
  return JSON.parse(await readFile(join(root, rel), 'utf8'));
}

/**
 * Moves a finished build into dist/. The old dist/ is renamed aside first, then
 * the new one is renamed in. If another build lands in between, try again, so
 * whichever build finishes last wins and dist/ is always a complete build.
 */
async function swapIntoPlace(out) {
  const aside = [];
  try {
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const old = resolve(root, `.dist-old-${process.pid}-${attempt}`);
      try {
        await rename(dist, old);
        aside.push(old);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      try {
        await rename(out, dist);
        return;
      } catch (error) {
        if (error.code !== 'ENOTEMPTY' && error.code !== 'EEXIST') throw error;
      }
    }
    throw new Error('Could not move the finished build into dist/ because other builds kept replacing it.');
  } finally {
    for (const old of aside) await rm(old, { recursive: true, force: true });
  }
}

export async function build({ now = new Date() } = {}) {
  const out = resolve(root, `.dist-build-${process.pid}-${Date.now()}`);
  try {
    return await buildInto(out, { now });
  } finally {
    await rm(out, { recursive: true, force: true });
  }
}

// Each build works in its own staging folder and swaps it into dist/ at the end,
// so a second build running at the same time (such as the dev watcher) cannot
// delete files out from under this one.
async function buildInto(out, { now }) {
  const problems = await validate(root);
  if (problems.length) throw new BuildError(problems);

  const { site } = await readJson('data/site.json');
  const { navigation } = await readJson('data/navigation.json');
  const meta = await readJson('data/blogs/blogs-meta.json');
  const { posts, published } = await loadPosts(root, { now });

  await mkdir(out, { recursive: true });
  for (const entry of COPY) {
    const from = resolve(root, entry);
    if (existsSync(from)) await cp(from, resolve(out, entry), { recursive: true });
  }

  // The post index the blog list and the homepage read at runtime.
  const index = {
    blogsMeta: meta.blogsMeta,
    categories: meta.categories,
    posts: published.map((post) => ({
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      category: post.category,
      tags: post.tags,
      date: post.date,
      readingTime: post.readingTime,
      coverImage: post.coverImage,
      featured: post.featured,
      visible: true
    }))
  };
  await mkdir(join(out, 'data/blogs'), { recursive: true });
  await writeFile(join(out, 'data/blogs/posts-index.json'), JSON.stringify(index, null, 2) + '\n');

  // One static page and one preview image per published post.
  const template = await readFile(join(root, 'templates/post.html'), 'utf8');
  for (const post of published) {
    const dir = join(out, 'blogs', post.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), renderPostPage(template, post, site, published));
    await buildOgImage(root, out, post);
  }

  await writeFile(join(out, 'sitemap.xml'), buildSitemap(site, published, navigation));
  await writeFile(join(out, 'rss.xml'), buildRss(site, published));
  await writeFile(join(out, 'robots.txt'), buildRobots(site));

  const assetVersion = await versionAssets(out);

  await swapIntoPlace(out);

  return {
    dist,
    published: published.length,
    assetVersion,
    held: posts.filter((post) => !published.includes(post)).map((post) => post.slug)
  };
}

export function printProblems(error) {
  console.error(`${error.message}:\n`);
  console.error(error.problems.map((message) => `  - ${message}`).join('\n'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = await build();
    console.log(`Built site into ${result.dist}`);
    console.log(`Asset version: ${result.assetVersion}`);
    console.log(`Posts published: ${result.published}${result.held.length ? `. Held back (draft, hidden or future date): ${result.held.join(', ')}` : ''}`);
  } catch (error) {
    if (error instanceof BuildError) {
      printProblems(error);
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Builds the static site into dist/.
 *
 * The browser still runs plain HTML, CSS and ES modules. This script validates
 * the content, copies the site, then generates what a visitor or a crawler
 * needs to see without running any script: one page per post, link preview
 * images, the post index, and the sitemap, feed and robots files.
 */
import { cp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate.mjs';
import { loadPosts } from './lib/posts.mjs';
import { renderPostPage } from './lib/post-page.mjs';
import { buildOgImage } from './lib/og.mjs';
import { buildSitemap, buildRobots, buildRss } from './lib/discovery.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

const COPY = ['index.html', 'pages', 'links', 'admin', 'assets', 'data', 'resume', 'CNAME', '_headers', '_redirects'];

export class BuildError extends Error {
  constructor(problems) {
    super(`Build stopped. Content validation found ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
    this.problems = problems;
  }
}

async function readJson(rel) {
  return JSON.parse(await readFile(join(root, rel), 'utf8'));
}

export async function build({ now = new Date() } = {}) {
  const problems = await validate(root);
  if (problems.length) throw new BuildError(problems);

  const { site } = await readJson('data/site.json');
  const { navigation } = await readJson('data/navigation.json');
  const meta = await readJson('data/blogs/blogs-meta.json');
  const { posts, published } = await loadPosts(root, { now });

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  for (const entry of COPY) {
    const from = resolve(root, entry);
    if (existsSync(from)) await cp(from, resolve(dist, entry), { recursive: true });
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
  await mkdir(join(dist, 'data/blogs'), { recursive: true });
  await writeFile(join(dist, 'data/blogs/posts-index.json'), JSON.stringify(index, null, 2) + '\n');

  // One static page and one preview image per published post.
  const template = await readFile(join(root, 'templates/post.html'), 'utf8');
  for (const post of published) {
    const dir = join(dist, 'blogs', post.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), renderPostPage(template, post, site, published));
    await buildOgImage(root, dist, post);
  }

  await writeFile(join(dist, 'sitemap.xml'), buildSitemap(site, published, navigation));
  await writeFile(join(dist, 'rss.xml'), buildRss(site, published));
  await writeFile(join(dist, 'robots.txt'), buildRobots(site));

  return {
    dist,
    published: published.length,
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
    console.log(`Posts published: ${result.published}${result.held.length ? `. Held back (draft, hidden or future date): ${result.held.join(', ')}` : ''}`);
  } catch (error) {
    if (error instanceof BuildError) {
      printProblems(error);
      process.exit(1);
    }
    throw error;
  }
}

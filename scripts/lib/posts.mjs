/**
 * Loads posts from content/posts/*.md.
 *
 * Every problem is collected with the file it came from, so a bad post fails
 * the build with a message that says what to change.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { createMarkdown, renderMarkdown, wordCount } from './markdown.mjs';
import { exists, internalTargetExists } from './paths.mjs';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toIsoDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === 'string' ? value.trim() : value;
}

function isRealDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Today in UTC as YYYY-MM-DD. A post dated later than this stays unpublished. */
export function today(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function isPublished(post, now = new Date()) {
  return post.visible !== false && post.draft !== true && post.date <= today(now);
}

async function readCategories(root) {
  try {
    const meta = JSON.parse(await readFile(join(root, 'data/blogs/blogs-meta.json'), 'utf8'));
    return (meta.categories ?? []).filter((name) => name !== 'All');
  } catch {
    return null;
  }
}

/** Links and images used in a post body, read from the parsed Markdown. */
function references(body) {
  const found = { images: [], links: [] };
  const walk = (tokens) => {
    for (const token of tokens) {
      if (token.type === 'image') found.images.push(token.attrGet('src'));
      if (token.type === 'link_open') found.links.push(token.attrGet('href'));
      if (token.children) walk(token.children);
    }
  };
  walk(createMarkdown().parse(body, {}));
  return found;
}

export async function loadPosts(root, { now = new Date() } = {}) {
  const errors = [];
  const dir = join(root, 'content/posts');
  const categories = await readCategories(root);
  if (categories === null) errors.push('data/blogs/blogs-meta.json: file is missing or is not valid JSON');

  let files = [];
  try {
    files = (await readdir(dir)).filter((name) => name.endsWith('.md')).sort();
  } catch {
    errors.push('content/posts: folder is missing');
  }

  const posts = [];
  const seen = new Map();

  for (const name of files) {
    const rel = `content/posts/${name}`;
    const fail = (message) => errors.push(`${rel}: ${message}`);
    let parsed;
    try {
      parsed = matter(await readFile(join(dir, name), 'utf8'));
    } catch (error) {
      fail(`front matter could not be read (${error.reason ?? error.message})`);
      continue;
    }
    const data = parsed.data;
    const body = parsed.content.trim();
    const slugFromFile = name.replace(/\.md$/, '');

    const text = (field) => {
      const ok = typeof data[field] === 'string' && data[field].trim() !== '';
      if (!ok) fail(`"${field}" is required in the front matter and must be text`);
      return ok;
    };

    text('title');
    text('summary');
    text('author');

    // The slug may be left out of the front matter. The file name is the slug then.
    if (!SLUG.test(slugFromFile)) {
      fail(`file name "${name}" must be lower-case words joined by hyphens, because it becomes the web address`);
    } else if (data.slug !== undefined && data.slug !== slugFromFile) {
      if (files.includes(`${data.slug}.md`)) fail(`duplicate slug "${data.slug}": it already belongs to content/posts/${data.slug}.md. Give this post its own slug, or remove the slug line`);
      else fail(`slug "${data.slug}" must match the file name "${slugFromFile}.md", or be left out`);
    } else if (seen.has(slugFromFile)) {
      fail(`duplicate slug "${slugFromFile}", already used by ${seen.get(slugFromFile)}`);
    } else {
      seen.set(slugFromFile, rel);
    }

    const date = toIsoDate(data.date);
    if (!isRealDate(date)) fail(`"date" must be a real date written YYYY-MM-DD, found ${JSON.stringify(data.date)}`);

    if (!Array.isArray(data.tags) || data.tags.length === 0 || data.tags.some((t) => typeof t !== 'string' || !t.trim())) {
      fail('"tags" must be a list of at least one non-empty tag');
    }

    if (text('category') && categories && !categories.includes(data.category)) {
      fail(`unknown category "${data.category}". Known categories: ${categories.join(', ')}. Add new ones to data/blogs/blogs-meta.json`);
    }

    for (const flag of ['featured', 'visible', 'draft']) {
      if (data[flag] !== undefined && typeof data[flag] !== 'boolean') fail(`"${flag}" must be true or false`);
    }
    if (data.related !== undefined) fail('use "relatedPosts" for related posts');

    if (text('coverImage')) {
      if (!data.coverImage.startsWith('/')) fail(`coverImage "${data.coverImage}" must start with / (a path inside the site)`);
      else if (!(await exists(join(root, data.coverImage.split('?')[0])))) fail(`cover image file is missing: ${data.coverImage}`);
    }

    if (!body) fail('the post has no body text');
    if (/^# /m.test(body.replace(/```[\s\S]*?```/g, ''))) fail('the body has a "# " heading. The title comes from the front matter, so start body headings at "##"');

    const { images, links } = references(body);
    for (const src of images) {
      if (src?.startsWith('/') && !(await exists(join(root, src.split('?')[0])))) fail(`image file is missing: ${src}`);
      if (src && !/^(\/|https?:\/\/)/.test(src)) fail(`image "${src}" must start with / or https://`);
    }
    for (const href of links) {
      if (!href) continue;
      if (href.startsWith('/') && !(await internalTargetExists(root, href))) fail(`broken internal link: ${href}`);
      else if (!/^(\/|#|https?:\/\/|mailto:)/.test(href)) fail(`link "${href}" must start with /, #, https:// or mailto:`);
    }

    const { html, headings } = renderMarkdown(body);
    const ids = new Set();
    for (const heading of headings) {
      if (ids.has(heading.id)) fail(`two headings share the anchor "${heading.id}". Reword one of them`);
      ids.add(heading.id);
    }

    posts.push({
      sourceFile: rel,
      slug: slugFromFile,
      title: data.title,
      subtitle: data.subtitle ?? '',
      summary: data.summary,
      category: data.category,
      tags: Array.isArray(data.tags) ? data.tags : [],
      date,
      readingTime: typeof data.readingTime === 'string' ? data.readingTime : `${Math.max(1, Math.round(wordCount(body) / 200))} min read`,
      coverImage: data.coverImage,
      author: data.author,
      featured: data.featured === true,
      visible: data.visible !== false,
      draft: data.draft === true,
      relatedPosts: Array.isArray(data.relatedPosts) ? data.relatedPosts : [],
      tableOfContents: data.toc !== false,
      headings,
      html
    });
  }

  const slugs = new Set(posts.map((post) => post.slug));
  for (const post of posts) {
    for (const related of post.relatedPosts) {
      if (!slugs.has(related)) errors.push(`${post.sourceFile}: relatedPosts lists "${related}", which is not a post`);
    }
  }

  posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  const published = posts.filter((post) => isPublished(post, now));
  return { posts, published, errors };
}

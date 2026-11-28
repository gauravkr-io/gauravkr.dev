/**
 * Content validation. Every problem is reported with the file and the entry it
 * belongs to, so the message says exactly what to fix. The build runs this
 * first and stops if anything is wrong.
 *
 * Usage: node scripts/validate.mjs [rootDir]
 */
import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exists, internalTargetExists } from './lib/paths.mjs';
import { loadPosts } from './lib/posts.mjs';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_URL = /^(https?:\/\/|mailto:|\/)/;

function isRealDate(value) {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

async function readJson(root, rel, errors) {
  try {
    return JSON.parse(await readFile(join(root, rel), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') errors.push(`${rel}: file is missing`);
    return null;
  }
}

function need(errors, file, label, object, field, type) {
  const value = object?.[field];
  const ok = type === 'string' ? typeof value === 'string' && value.trim() !== '' : typeof value === type;
  if (!ok) errors.push(`${file}: ${label}: "${field}" is required and must be ${type === 'string' ? 'a non-empty string' : `a ${type}`}`);
  return ok;
}

function checkEntryBasics(errors, file, label, entry) {
  if (entry.visible !== undefined && typeof entry.visible !== 'boolean') {
    errors.push(`${file}: ${label}: "visible" must be true or false`);
  }
  if (entry.order !== undefined && typeof entry.order !== 'number') {
    errors.push(`${file}: ${label}: "order" must be a number`);
  }
}

async function validateVideos(root, errors) {
  const file = 'data/videos.json';
  const data = await readJson(root, file, errors);
  if (!data) return;

  if (!data.videosMeta || typeof data.videosMeta !== 'object') {
    errors.push(`${file}: "videosMeta" is required (eyebrow, headline, intro, playLabel, emptyMessage)`);
  } else {
    for (const field of ['eyebrow', 'headline', 'intro', 'playLabel', 'emptyMessage']) {
      need(errors, file, 'videosMeta', data.videosMeta, field, 'string');
    }
  }
  if (!Array.isArray(data.videos)) {
    errors.push(`${file}: "videos" must be a list`);
    return;
  }

  const seen = new Map();
  data.videos.forEach((video, index) => {
    const label = `videos[${index}]${video?.title ? ` "${video.title}"` : ''}`;
    need(errors, file, label, video, 'title', 'string');
    need(errors, file, label, video, 'description', 'string');
    if (!need(errors, file, label, video, 'youtubeId', 'string')) {
      // already reported
    } else if (!YOUTUBE_ID.test(video.youtubeId)) {
      errors.push(`${file}: ${label}: youtubeId "${video.youtubeId}" is not a valid YouTube ID. Expected 11 characters made of letters, digits, "-" or "_"`);
    } else if (seen.has(video.youtubeId)) {
      errors.push(`${file}: ${label}: youtubeId "${video.youtubeId}" is already used by videos[${seen.get(video.youtubeId)}]`);
    } else {
      seen.set(video.youtubeId, index);
    }
    if (!isRealDate(video.date)) {
      errors.push(`${file}: ${label}: "date" must be a real date written YYYY-MM-DD, found ${JSON.stringify(video?.date)}`);
    }
    if (!Array.isArray(video.tags) || video.tags.some((tag) => typeof tag !== 'string' || tag.trim() === '')) {
      errors.push(`${file}: ${label}: "tags" must be a list of non-empty strings`);
    }
    checkEntryBasics(errors, file, label, video);
  });
}

async function validateLinks(root, errors) {
  const file = 'data/links.json';
  const data = await readJson(root, file, errors);
  if (!data) return;

  if (!data.linksMeta || typeof data.linksMeta !== 'object') {
    errors.push(`${file}: "linksMeta" is required (title, description)`);
  } else {
    need(errors, file, 'linksMeta', data.linksMeta, 'title', 'string');
    need(errors, file, 'linksMeta', data.linksMeta, 'description', 'string');
  }
  if (!Array.isArray(data.groups)) {
    errors.push(`${file}: "groups" must be a list`);
    return;
  }

  const groupIds = new Set();
  for (const [gi, group] of data.groups.entries()) {
    const gLabel = `groups[${gi}]${group?.title ? ` "${group.title}"` : ''}`;
    need(errors, file, gLabel, group, 'title', 'string');
    if (need(errors, file, gLabel, group, 'id', 'string')) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(group.id)) {
        errors.push(`${file}: ${gLabel}: id "${group.id}" must be lower-case kebab case`);
      } else if (groupIds.has(group.id)) {
        errors.push(`${file}: ${gLabel}: id "${group.id}" is used by another group`);
      }
      groupIds.add(group.id);
    }
    checkEntryBasics(errors, file, gLabel, group);

    if (!Array.isArray(group.links)) {
      errors.push(`${file}: ${gLabel}: "links" must be a list`);
      continue;
    }
    for (const [li, link] of group.links.entries()) {
      const label = `${gLabel} > links[${li}]${link?.label ? ` "${link.label}"` : ''}`;
      need(errors, file, label, link, 'label', 'string');
      checkEntryBasics(errors, file, label, link);
      if (!need(errors, file, label, link, 'url', 'string')) continue;
      if (!SAFE_URL.test(link.url)) {
        errors.push(`${file}: ${label}: url "${link.url}" must start with https://, http://, mailto: or / for a page on this site`);
      } else if (link.url.startsWith('/') && !(await internalTargetExists(root, link.url))) {
        errors.push(`${file}: ${label}: internal link "${link.url}" does not match any page or file`);
      }
      if (typeof link.icon === 'string' && link.icon.startsWith('/') && !(await exists(join(root, link.icon)))) {
        errors.push(`${file}: ${label}: icon file "${link.icon}" is missing`);
      }
    }
  }
}

async function validateNavigation(root, errors) {
  const file = 'data/navigation.json';
  const data = await readJson(root, file, errors);
  if (!data) return;
  for (const [i, item] of (data.navigation ?? []).entries()) {
    const label = `navigation[${i}]${item?.label ? ` "${item.label}"` : ''}`;
    need(errors, file, label, item, 'label', 'string');
    if (need(errors, file, label, item, 'path', 'string') && !(await internalTargetExists(root, item.path))) {
      errors.push(`${file}: ${label}: path "${item.path}" does not match any page`);
    }
  }
}


async function validateSite(root, errors) {
  const file = 'data/site.json';
  const data = await readJson(root, file, errors);
  if (!data) return;
  const site = data.site;
  if (!site || typeof site !== 'object') {
    errors.push(`${file}: "site" object is required`);
    return;
  }
  for (const field of ['name', 'domain', 'title', 'summary', 'location', 'tagline']) need(errors, file, 'site', site, field, 'string');
  if (need(errors, file, 'site', site, 'url', 'string')) {
    if (!/^https:\/\/[^/\s]+$/.test(site.url)) errors.push(`${file}: site: "url" must be an https address with no trailing slash, for example https://gauravkr.dev`);
    else if (typeof site.domain === 'string' && new URL(site.url).hostname !== site.domain) errors.push(`${file}: site: "url" (${site.url}) and "domain" (${site.domain}) do not match`);
  }
  if (need(errors, file, 'site', site, 'resumeUrl', 'string') && !(await exists(join(root, site.resumeUrl)))) {
    errors.push(`${file}: site: resumeUrl file is missing: ${site.resumeUrl}`);
  }
  if (need(errors, file, 'site', site.contact ?? {}, 'email', 'string') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(site.contact.email)) {
    errors.push(`${file}: site.contact: "email" does not look like an email address: ${site.contact.email}`);
  }
  for (const [i, link] of (site.socialLinks ?? []).entries()) {
    const label = `socialLinks[${i}]${link?.label ? ` "${link.label}"` : ''}`;
    need(errors, file, label, link, 'label', 'string');
    if (need(errors, file, label, link, 'url', 'string') && !/^(https:\/\/|mailto:)/.test(link.url)) {
      errors.push(`${file}: ${label}: url "${link.url}" must start with https:// or mailto:`);
    }
    checkEntryBasics(errors, file, label, link);
  }
  const analytics = site.analytics;
  if (analytics !== undefined) {
    if (typeof analytics !== 'object' || typeof analytics.enabled !== 'boolean') {
      errors.push(`${file}: site.analytics: "enabled" must be true or false`);
    } else {
      const token = analytics.token ?? '';
      if (token !== '' && !/^[a-f0-9]{32}$/.test(token)) {
        errors.push(`${file}: site.analytics: token must be the 32 character code from Cloudflare Web Analytics (letters a to f and digits), found ${JSON.stringify(token)}`);
      }
      if (analytics.enabled && token === '') {
        errors.push(`${file}: site.analytics: analytics is switched on but "token" is empty. Add the token from the Cloudflare dashboard, or set "enabled" to false`);
      }
    }
  }
  for (const field of ['logoImage', 'logoWordmark']) {
    if (typeof site[field] === 'string' && !(await exists(join(root, site[field])))) errors.push(`${file}: site: ${field} file is missing: ${site[field]}`);
  }
  const photo = site.profileImage?.src?.split('?')[0];
  if (photo && !(await exists(join(root, photo)))) errors.push(`${file}: site.profileImage: file is missing: ${site.profileImage.src}`);
}

async function validateBlogMeta(root, errors) {
  const file = 'data/blogs/blogs-meta.json';
  const data = await readJson(root, file, errors);
  if (!data) return;
  for (const field of ['eyebrow', 'headline', 'intro']) need(errors, file, 'blogsMeta', data.blogsMeta ?? {}, field, 'string');
  const list = data.categories;
  if (!Array.isArray(list) || list.length < 2 || list[0] !== 'All') {
    errors.push(`${file}: "categories" must be a list that starts with "All" followed by at least one category`);
  } else if (new Set(list).size !== list.length) {
    errors.push(`${file}: "categories" lists the same name twice`);
  }
}

/** Any string in a data file that looks like a path on this site must point at something real. */
const SITE_PATH = /^\/[A-Za-z0-9._\-/]+(?:\?[^\s]*)?(?:#[^\s]*)?$/;

function* strings(value, path = '') {
  if (typeof value === 'string') yield [path, value];
  else if (Array.isArray(value)) for (const [i, item] of value.entries()) yield* strings(item, `${path}[${i}]`);
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) yield* strings(item, path ? `${path}.${key}` : key);
}

async function validateSitePaths(root, errors, skip) {
  for (const full of await walk(join(root, 'data'))) {
    const rel = relative(root, full);
    if (skip.has(rel)) continue;
    let data;
    try {
      data = JSON.parse(await readFile(full, 'utf8'));
    } catch {
      continue;
    }
    const reported = new Set();
    for (const [path, value] of strings(data)) {
      if (!SITE_PATH.test(value) || reported.has(value)) continue;
      if (!(await internalTargetExists(root, value))) {
        reported.add(value);
        errors.push(`${rel}: ${path}: "${value}" points to a file or page that does not exist`);
      }
    }
  }
}

export async function validate(root = defaultRoot) {
  const errors = [];

  for (const full of await walk(join(root, 'data'))) {
    try {
      JSON.parse(await readFile(full, 'utf8'));
    } catch (error) {
      errors.push(`${relative(root, full)}: invalid JSON (${error.message})`);
    }
  }

  // Schema checks only run on files that parsed, so a syntax error is reported once.
  const broken = new Set(errors.map((message) => message.split(':')[0]));
  if (!broken.has('data/videos.json')) await validateVideos(root, errors);
  if (!broken.has('data/links.json')) await validateLinks(root, errors);
  if (!broken.has('data/navigation.json')) await validateNavigation(root, errors);
  if (!broken.has('data/site.json')) await validateSite(root, errors);
  if (!broken.has('data/blogs/blogs-meta.json')) await validateBlogMeta(root, errors);
  errors.push(...(await loadPosts(root)).errors);
  // Files already checked in detail above are skipped here so one problem is reported once.
  await validateSitePaths(root, errors, new Set(['data/links.json', 'data/navigation.json', ...broken]));

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const errors = await validate(root);
  if (errors.length) {
    console.error(`Content validation failed with ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n`);
    console.error(errors.map((message) => `  - ${message}`).join('\n'));
    process.exit(1);
  }
  console.log('Content validation passed.');
}

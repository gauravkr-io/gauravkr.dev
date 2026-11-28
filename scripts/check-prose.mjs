/**
 * Writing rules and confidentiality, checked across everything a visitor reads.
 *
 *   1. No em dashes and no semicolons in prose. Looked for in every string in
 *      data/*.json and in Markdown prose under content/, front matter included.
 *      Fenced code and inline code are left alone, and so are HTML entities.
 *   2. No blocked client or project names. The list lives in
 *      client-names.local.txt, which git ignores. The check reads the data,
 *      the posts, the page shells and the scripts that hold copy.
 *
 * Usage: node scripts/check-prose.mjs [--require-clients] [rootDir]
 */
import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { exists } from './lib/paths.mjs';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EM_DASH = '—';
const ENTITY = /&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g;
const NOT_PROSE = /^(?:\/|https?:\/\/|mailto:|#)/;
const SKIP_KEYS = new Set(['slug', 'coverImage', 'date', 'url', 'icon', 'src', 'srcset', 'path', 'href', 'logo', 'logoImage', 'logoWordmark', 'resumeUrl', 'youtubeId', 'color']);

async function walk(dir, extensions) {
  const out = [];
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, extensions)));
    else if (extensions.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

function* jsonStrings(value, path = '', key = '') {
  if (typeof value === 'string') {
    if (!SKIP_KEYS.has(key) && !NOT_PROSE.test(value)) yield [path, value];
  } else if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) yield* jsonStrings(item, `${path}[${i}]`, key);
  } else if (value && typeof value === 'object') {
    for (const [k, item] of Object.entries(value)) yield* jsonStrings(item, path ? `${path}.${k}` : k, k);
  }
}

/** Blanks out code spans and entities, keeping every column in place. */
function proseOnly(line) {
  return line.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length)).replace(ENTITY, (m) => ' '.repeat(m.length));
}

function problemsIn(text) {
  const clean = proseOnly(text);
  const found = [];
  if (clean.includes(EM_DASH)) found.push('contains an em dash. Use a period, a comma or a colon');
  if (clean.includes(';')) found.push('contains a semicolon. Split it into two sentences');
  return found;
}

const snippet = (text, needle) => {
  const at = Math.max(0, text.indexOf(needle) - 30);
  return JSON.stringify(text.slice(at, at + 80));
};

export async function loadClientNames(root) {
  const file = join(root, 'client-names.local.txt');
  if (!(await exists(file))) return null;
  return (await readFile(file, 'utf8'))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function nameMatchers(names) {
  return names.map((name) => ({
    name,
    pattern: new RegExp(`(?<![\\p{L}\\p{N}])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu')
  }));
}

export async function checkProse(root = defaultRoot, { requireClients = false } = {}) {
  const findings = [];
  const notes = [];
  const add = (where, message) => findings.push(`${where}: ${message}`);

  // 1. Punctuation in JSON copy
  for (const file of await walk(join(root, 'data'), ['.json'])) {
    const rel = relative(root, file);
    let data;
    try {
      data = JSON.parse(await readFile(file, 'utf8'));
    } catch {
      continue;
    }
    for (const [path, value] of jsonStrings(data)) {
      for (const message of problemsIn(value)) add(`${rel}: ${path}`, `${message} ${snippet(value, value.includes(EM_DASH) ? EM_DASH : ';')}`);
    }
  }

  // 1. Punctuation in Markdown prose, with line numbers
  const markdown = await walk(join(root, 'content'), ['.md']);
  for (const file of markdown) {
    const rel = relative(root, file);
    const lines = (await readFile(file, 'utf8')).split('\n');
    let bodyStart = 0;
    if (lines[0]?.trim() === '---') {
      const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
      const front = matter(lines.slice(0, end + 1).join('\n') + '\n').data;
      for (const [path, value] of jsonStrings(front)) {
        for (const message of problemsIn(value)) add(`${rel}: front matter ${path}`, `${message} ${snippet(value, value.includes(EM_DASH) ? EM_DASH : ';')}`);
      }
      bodyStart = end + 1;
    }
    let fence = null;
    for (let i = bodyStart; i < lines.length; i += 1) {
      const mark = lines[i].match(/^\s*(`{3,}|~{3,})/);
      if (mark) {
        if (!fence) fence = mark[1][0];
        else if (mark[1][0] === fence) fence = null;
        continue;
      }
      if (fence) continue;
      for (const message of problemsIn(lines[i])) add(`${rel}:${i + 1}`, `${message} ${snippet(lines[i], lines[i].includes(EM_DASH) ? EM_DASH : ';')}`);
    }
  }

  // 2. Blocked names
  const names = await loadClientNames(root);
  if (names === null) {
    const message = 'client-names.local.txt not found, so the client name check was skipped. Copy client-names.example.txt to client-names.local.txt and list the names to block';
    if (requireClients) findings.push(message);
    else notes.push(message);
  } else if (names.length === 0) {
    notes.push('client-names.local.txt has no names yet, so nothing was checked');
  } else {
    const matchers = nameMatchers(names);
    const targets = [
      ...(await walk(join(root, 'data'), ['.json'])),
      ...markdown,
      ...(await walk(join(root, 'pages'), ['.html'])),
      ...(await walk(join(root, 'links'), ['.html'])),
      ...(await walk(join(root, 'templates'), ['.html'])),
      ...(await walk(join(root, 'assets/js'), ['.js'])),
      join(root, 'index.html')
    ];
    for (const file of targets) {
      if (!(await exists(file))) continue;
      const rel = relative(root, file);
      const lines = (await readFile(file, 'utf8')).split('\n');
      lines.forEach((line, i) => {
        for (const { name, pattern } of matchers) {
          if (pattern.test(line)) add(`${rel}:${i + 1}`, `contains the blocked name "${name}"`);
        }
      });
    }
    notes.push(`client name check ran with ${names.length} blocked name${names.length === 1 ? '' : 's'}`);
  }

  return { findings, notes };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const requireClients = args.includes('--require-clients');
  const root = args.find((a) => !a.startsWith('--')) ? resolve(args.find((a) => !a.startsWith('--'))) : defaultRoot;
  const { findings, notes } = await checkProse(root, { requireClients });
  for (const note of notes) console.log(`note: ${note}`);
  if (findings.length) {
    console.error(`\nProse check found ${findings.length} problem${findings.length === 1 ? '' : 's'}:\n`);
    console.error(findings.map((message) => `  - ${message}`).join('\n'));
    process.exit(1);
  }
  console.log('Prose check passed.');
}

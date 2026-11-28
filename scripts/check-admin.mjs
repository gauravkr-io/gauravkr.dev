/**
 * Keeps the browser editor honest.
 *
 * The editor rewrites a file from the fields it knows about. If a data file
 * gains a key the config does not list, saving in the editor could drop it.
 * This compares admin/config.yml with the real files and reports any gap.
 *
 * Usage: node scripts/check-admin.mjs [rootDir]
 */
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';
import matter from 'gray-matter';
import { exists } from './lib/paths.mjs';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Key paths in a data file. Lists use [] and merge the keys of every item. */
function dataPaths(value, prefix = '', out = new Set()) {
  if (Array.isArray(value)) {
    out.add(`${prefix}[]`);
    for (const item of value) if (item && typeof item === 'object') dataPaths(item, `${prefix}[]`, out);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      out.add(path);
      dataPaths(item, path, out);
    }
  }
  return out;
}

function configPaths(fields = [], prefix = '', out = new Set()) {
  for (const field of fields) {
    const path = prefix ? `${prefix}.${field.name}` : field.name;
    out.add(path);
    if (field.widget === 'list') out.add(`${path}[]`);
    if (field.fields) configPaths(field.fields, field.widget === 'list' ? `${path}[]` : path, out);
  }
  return out;
}

export async function checkAdmin(root = defaultRoot) {
  const problems = [];
  const warnings = [];
  const configFile = join(root, 'admin/config.yml');
  if (!(await exists(configFile))) return { problems: ['admin/config.yml is missing'], warnings };

  let config;
  try {
    config = loadYaml(await readFile(configFile, 'utf8'));
  } catch (error) {
    return { problems: [`admin/config.yml: not valid YAML (${error.reason ?? error.message})`], warnings };
  }

  if (/REPLACE-WITH/i.test(config.backend?.base_url ?? '')) {
    warnings.push('admin/config.yml: backend.base_url still has the placeholder. Sign-in will not work until it holds your Worker address');
  }
  if (!config.backend?.repo || !/^[\w.-]+\/[\w.-]+$/.test(config.backend.repo)) problems.push('admin/config.yml: backend.repo must look like owner/repository');

  for (const collection of config.collections ?? []) {
    for (const entry of collection.files ?? []) {
      const rel = entry.file;
      if (!(await exists(join(root, rel)))) {
        problems.push(`admin/config.yml: collection "${collection.name}" points to ${rel}, which does not exist`);
        continue;
      }
      const data = JSON.parse(await readFile(join(root, rel), 'utf8'));
      const inData = dataPaths(data);
      const inConfig = configPaths(entry.fields);
      for (const path of inData) {
        if (!inConfig.has(path)) problems.push(`${rel}: "${path}" is in the file but not in the editor config. Saving in the editor could drop it`);
      }
      for (const path of inConfig) {
        if (!inData.has(path) && !/\[\]/.test(path)) warnings.push(`admin/config.yml: field "${path}" is not in ${rel} yet. It will be added the first time you save`);
      }
    }
  }

  // Posts: every front matter key in use must be a field, and the category list must match.
  const posts = config.collections?.find((c) => c.name === 'posts');
  if (posts) {
    const known = new Set([...posts.fields.map((f) => f.name), 'slug']);
    const dir = join(root, posts.folder);
    const seen = new Set();
    for (const name of (await readdir(dir)).filter((n) => n.endsWith('.md'))) {
      for (const key of Object.keys(matter(await readFile(join(dir, name), 'utf8')).data)) {
        if (!known.has(key) && !seen.has(key)) {
          seen.add(key);
          problems.push(`${posts.folder}/${name}: front matter "${key}" is not an editor field. Saving in the editor could drop it`);
        }
      }
    }
    const select = posts.fields.find((f) => f.name === 'category');
    try {
      const meta = JSON.parse(await readFile(join(root, 'data/blogs/blogs-meta.json'), 'utf8'));
      const wanted = meta.categories.filter((c) => c !== 'All');
      const have = select?.options ?? [];
      if (JSON.stringify([...wanted].sort()) !== JSON.stringify([...have].sort())) {
        problems.push(`admin/config.yml: the category list (${have.join(', ')}) differs from data/blogs/blogs-meta.json (${wanted.join(', ')})`);
      }
    } catch {
      // blogs-meta problems are reported by the main validator
    }
  }

  return { problems, warnings };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const { problems, warnings } = await checkAdmin(root);
  for (const warning of warnings) console.log(`warning: ${warning}`);
  if (problems.length) {
    console.error(`\nEditor config check found ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
    console.error(problems.map((message) => `  - ${message}`).join('\n'));
    process.exit(1);
  }
  console.log('Editor config check passed.');
}

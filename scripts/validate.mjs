/**
 * Content validation. Fails the build with a file-specific message.
 * This first version checks that every data file is valid JSON.
 */
import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

export async function validate(root = defaultRoot) {
  const errors = [];
  for (const file of await walk(join(root, 'data'))) {
    try {
      JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      errors.push(`${relative(root, file)}: invalid JSON (${error.message})`);
    }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const errors = await validate(root);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('Content validation passed.');
}

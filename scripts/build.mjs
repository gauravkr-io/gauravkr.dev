/**
 * Builds the static site into dist/.
 *
 * Validates the content first and stops on any problem, then copies the site.
 */
import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './validate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

const COPY = ['index.html', 'pages', 'links', 'assets', 'data', 'resume', 'CNAME', '_headers', '_redirects'];

export async function build() {
  const errors = await validate(root);
  if (errors.length) {
    console.error(`Build stopped. Content validation found ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n`);
    console.error(errors.map((message) => `  - ${message}`).join('\n'));
    process.exit(1);
  }

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  for (const entry of COPY) {
    const from = resolve(root, entry);
    if (existsSync(from)) await cp(from, resolve(dist, entry), { recursive: true });
  }
  return dist;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = await build();
  console.log(`Built site into ${out}`);
}

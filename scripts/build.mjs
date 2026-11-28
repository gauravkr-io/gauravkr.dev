/**
 * Builds the static site into dist/.
 *
 * The browser still runs plain HTML, CSS and ES modules. This script only
 * assembles the output folder, so every URL stays the same as in the source.
 */
import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

const COPY = ['index.html', 'pages', 'assets', 'data', 'resume', 'CNAME', '_headers', '_redirects'];

export async function build() {
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

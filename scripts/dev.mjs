/**
 * Local development: builds the site, serves dist/, and rebuilds whenever a
 * source file changes. A rebuild that fails validation prints the problems and
 * keeps serving the last good build.
 */
import { watch } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, BuildError, printProblems } from './build.mjs';
import { serve } from './preview.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] ?? 8000);
const WATCHED = ['content', 'data', 'assets', 'pages', 'links', 'clear-cache', 'admin', 'templates', 'scripts', 'index.html', '_headers', '_redirects'];

let running = false;
let queued = false;

async function rebuild(reason) {
  if (running) {
    queued = true;
    return;
  }
  running = true;
  const started = Date.now();
  try {
    const result = await build();
    console.log(`[${new Date().toLocaleTimeString()}] built in ${Date.now() - started}ms${reason ? ` (${reason})` : ''}, ${result.published} posts`);
  } catch (error) {
    if (error instanceof BuildError) {
      console.error(`[${new Date().toLocaleTimeString()}] build failed, still serving the last good build`);
      printProblems(error);
    } else {
      console.error(error);
    }
  }
  running = false;
  if (queued) {
    queued = false;
    rebuild('queued change');
  }
}

await rebuild('first build');
serve(resolve(root, 'dist'), port);

let timer;
for (const entry of WATCHED) {
  try {
    watch(resolve(root, entry), { recursive: true }, (_event, file) => {
      if (file && /(^|\/)(\.DS_Store|node_modules)/.test(file)) return;
      clearTimeout(timer);
      timer = setTimeout(() => rebuild(`${entry}/${file ?? ''}`), 250);
    });
  } catch {
    // A watched path that does not exist yet is fine.
  }
}
console.log('Watching for changes. Edit a file under content/ or data/ and refresh the browser.');

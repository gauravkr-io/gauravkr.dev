/**
 * Minimal static server for local checks. Usage: node scripts/preview.mjs <dir> <port>
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';


const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8'
};

export function serve(directory, port) {
  const dir = resolve(directory);
  return createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let file = normalize(join(dir, decodeURIComponent(url.pathname)));
    if (!file.startsWith(dir)) throw new Error('outside root');
    const info = await stat(file).catch(() => null);
    if (info?.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    // Local checks should never see a stale file, so nothing is cached.
    const headers = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' };
    // Loading a page wipes this origin's browser cache, so old files cannot linger between edits.
    if (extname(file) === '.html') headers['Clear-Site-Data'] = '"cache"';
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
  }).listen(port, () => console.log(`Serving ${dir} at http://localhost:${port}`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  serve(process.argv[2] ?? 'dist', Number(process.argv[3] ?? 8000));
}

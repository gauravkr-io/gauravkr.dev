import { stat } from 'node:fs/promises';
import { join } from 'node:path';

export async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** A root-relative link is fine when it resolves to a file or a folder with an index page. */
export async function internalTargetExists(root, url) {
  const clean = url.split('#')[0].split('?')[0];
  if (clean === '' || clean === '/') return exists(join(root, 'index.html'));
  const target = join(root, clean);
  if (await exists(target)) {
    const info = await stat(target);
    return info.isDirectory() ? exists(join(target, 'index.html')) : true;
  }
  return exists(join(root, clean.replace(/\/$/, ''), 'index.html'));
}

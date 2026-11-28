/**
 * Link preview images. LinkedIn, WhatsApp and Instagram do not draw SVG, and
 * they crop odd shapes, so each post gets a 1200 x 630 JPEG made from its cover.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

export async function buildOgImage(root, dist, post) {
  const source = join(root, post.coverImage.split('?')[0]);
  const target = join(dist, 'assets/images/og', `${post.slug}.jpg`);
  await mkdir(dirname(target), { recursive: true });
  await sharp(source, { density: 144 })
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .flatten({ background: '#0A0D26' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(target);
  return target;
}

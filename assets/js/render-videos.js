/**
 * Videos page.
 *
 * Each card shows a thumbnail and nothing else from YouTube. The player is a
 * privacy-enhanced embed (youtube-nocookie.com) that is only created when the
 * visitor presses play, so no third-party player loads on arrival.
 */

import { html, mapTo, raw, mount, formatDate, $, $$ } from './utils.js';
import { iconRaw } from './icons.js';
import { pageHead, tagRow, emptyState } from './components.js';
import { getVideos, YOUTUBE_ID } from './data-loader.js';

function videoCard(video, meta) {
  const label = `${meta.playLabel}: ${video.title}`;
  return html`
    <li class="video-card" data-reveal>
      <div class="video-card__frame">
        <button
          class="video-card__play"
          type="button"
          data-video-id="${video.youtubeId}"
          data-video-title="${video.title}"
          aria-label="${label}"
        >
          <img
            class="video-card__thumb"
            src="https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg"
            alt=""
            width="480"
            height="360"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
          />
          <span class="video-card__badge" aria-hidden="true">${iconRaw('play', { size: 26 })}</span>
        </button>
      </div>
      <div class="video-card__body">
        ${video.date ? raw(html`<p class="video-card__meta">${formatDate(video.date)}</p>`) : ''}
        <h2 class="video-card__title">${video.title}</h2>
        ${video.description ? raw(html`<p class="video-card__text">${video.description}</p>`) : ''}
        ${tagRow(video.tags)}
      </div>
    </li>
  `;
}

/** Swaps a thumbnail button for the embedded player. The id is re-checked first. */
function loadPlayer(button) {
  const id = button.dataset.videoId;
  if (!YOUTUBE_ID.test(id ?? '')) return;

  const frame = document.createElement('iframe');
  frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  frame.title = button.dataset.videoTitle ?? 'Video';
  frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.className = 'video-card__player';
  button.replaceWith(frame);
  frame.focus();
}

export async function initVideosPage() {
  const { meta, videos } = await getVideos();

  mount(
    '#page-head',
    pageHead({
      eyebrow: meta.eyebrow,
      title: meta.headline,
      intro: meta.intro,
      trail: [{ label: 'Home', href: '/' }, { label: meta.eyebrow }]
    })
  );

  mount('#videos-list', html`${mapTo(videos, (video) => videoCard(video, meta))}`);

  const empty = $('#videos-empty');
  if (empty) {
    empty.hidden = videos.length > 0;
    if (videos.length === 0) mount(empty, emptyState(meta.emptyMessage));
  }

  $('#videos-list')?.addEventListener('click', (event) => {
    const button = event.target.closest('.video-card__play');
    if (button) loadPlayer(button);
  });
}

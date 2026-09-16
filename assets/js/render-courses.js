/**
 * Course list and the shared course template.
 *
 * Courses carry a `status` field and are presented as in development. Nothing
 * here implies enrolment, pricing or an existing student cohort.
 */

import {
  html,
  mapTo,
  raw,
  mount,
  $,
  $$,
  getSlugParam,
  pluralise,
  setDocumentMeta
} from './utils.js';
import { iconRaw } from './icons.js';
import { pageHead, emptyState, tagRow, statusChip } from './components.js';
import { getCoursesIndex, getCourse } from './data-loader.js';
import { refreshScrollReveal } from './scroll-animations.js';

export function courseCard(course) {
  return html`
    <li class="entry-card bracketed" data-reveal data-category="${course.topic}">
      <div class="entry-card__media">
        <img
          src="${course.coverImage}"
          alt="Cover illustration for the ${course.title} course"
          loading="lazy"
          decoding="async"
          width="1200"
          height="675"
        />
        <span class="entry-card__badge">${statusChip(course.status)}</span>
      </div>

      <div class="entry-card__body">
        <div class="entry-card__meta">
          <span>${course.difficulty}</span>
          <span>${pluralise(course.moduleCount, 'module')}</span>
          <span>${course.duration}</span>
        </div>

        <h3 class="entry-card__title">${course.title}</h3>
        <p class="entry-card__text">${course.summary}</p>
        ${tagRow(course.technologies, { limit: 3 })}

        <div class="entry-card__foot">
          <a class="link-underline stretched-link" href="/pages/course-detail.html?slug=${course.slug}">
            <span>View curriculum</span>
            ${iconRaw('arrowRight', { size: 15 })}
          </a>
        </div>
      </div>
    </li>
  `;
}

export async function renderCoursesPreview(selector = '#courses-preview', limit = 3) {
  const { courses } = await getCoursesIndex();
  const shown = courses.slice(0, limit);
  mount(selector, html`${mapTo(shown, courseCard)}`);
  return shown;
}

/* -------------------------------------------------------------------------
   List page
   ------------------------------------------------------------------------- */

function filterBar(topics) {
  if (topics.length === 0) return raw('');
  return raw(html`
    <div class="filter-bar" role="group" aria-label="Filter courses by topic">
      ${mapTo(
        topics,
        (topic, index) => html`
          <button
            class="filter-chip"
            type="button"
            data-filter="${topic}"
            aria-pressed="${index === 0 ? 'true' : 'false'}"
          >${topic}</button>
        `
      )}
    </div>
  `);
}

function initFilters(listSelector, emptySelector) {
  const list = $(listSelector);
  const emptyNotice = $(emptySelector);
  if (!list) return;

  document.addEventListener('click', (event) => {
    const chip = event.target.closest('.filter-chip');
    if (!chip) return;

    const selected = chip.dataset.filter;
    $$('.filter-chip').forEach((button) => {
      button.setAttribute('aria-pressed', String(button === chip));
    });

    let visible = 0;
    $$('[data-category]', list).forEach((card) => {
      const matches = selected === 'All' || card.dataset.category === selected;
      card.hidden = !matches;
      if (matches) visible += 1;
    });

    if (emptyNotice) emptyNotice.hidden = visible > 0;
  });
}

export async function initCoursesPage() {
  const { meta, topics, courses } = await getCoursesIndex();

  mount(
    '#page-head',
    pageHead({
      eyebrow: meta.eyebrow,
      title: meta.headline,
      intro: meta.intro,
      trail: [{ label: 'Home', href: '/' }, { label: 'Courses' }]
    })
  );

  if (meta.notice) {
    mount(
      '#courses-notice',
      html`<aside class="callout" data-reveal><p class="callout__text">${meta.notice}</p></aside>`
    );
  }

  mount('#courses-filter', filterBar(topics));
  mount('#courses-list', html`${mapTo(courses, courseCard)}`);
  mount('#courses-empty', emptyState('No courses in this topic yet.'));
  const emptyNotice = $('#courses-empty');
  if (emptyNotice) emptyNotice.hidden = true;

  initFilters('#courses-list', '#courses-empty');
}

/* -------------------------------------------------------------------------
   Detail template
   ------------------------------------------------------------------------- */

function curriculum(modules = []) {
  return html`
    <ul class="curriculum">
      ${mapTo(
        modules,
        (module, index) => html`
          <li>
            <details class="module" ${raw(index === 0 ? 'open' : '')}>
              <summary class="module__summary">
                <span class="module__number">${module.module}</span>
                <span class="module__title">${module.title}</span>
                <span class="module__count">${pluralise(module.lessons?.length ?? 0, 'lesson')}</span>
                <span class="module__chevron" aria-hidden="true">${iconRaw('chevronDown', { size: 16 })}</span>
              </summary>
              <ul class="module__lessons">
                ${mapTo(module.lessons, (lesson) => html`<li>${lesson}</li>`)}
              </ul>
            </details>
          </li>
        `
      )}
    </ul>
  `;
}

function markerList(items = [], variant = '') {
  return html`
    <ul class="marker-list ${variant}">
      ${mapTo(items, (item) => html`<li>${item}</li>`)}
    </ul>
  `;
}

function detailBlock(title, body) {
  return html`
    <section class="detail-block" data-reveal>
      <h2 class="detail-block__title">${title}</h2>
      ${raw(body)}
    </section>
  `;
}

function courseAside(course, related) {
  return html`
    <div class="aside-card" data-reveal>
      <p class="aside-card__title">At a glance</p>
      <ul class="site-footer__list">
        <li><span class="text-muted">Level</span> &middot; ${course.difficulty}</li>
        <li><span class="text-muted">Modules</span> &middot; ${course.moduleCount}</li>
        <li><span class="text-muted">Lessons</span> &middot; ${course.lessonCount}</li>
        <li><span class="text-muted">Length</span> &middot; ${course.duration}</li>
      </ul>
    </div>

    <div class="aside-card" data-reveal>
      <p class="aside-card__title">Technologies</p>
      ${tagRow(course.technologies)}
    </div>

    <div class="aside-card" data-reveal>
      <p class="aside-card__title">Instructor</p>
      <p class="credential__name">Gaurav Kumar</p>
      <p class="credential__issuer">E-Commerce Specialist &amp; Software Engineer</p>
      <p class="credential__note">
        Five years building Salesforce Commerce Cloud platforms and backend systems for global
        retail brands. The course material comes from that production work.
      </p>
      <p style="margin-top:1rem">
        <a class="link-underline" href="/pages/about.html">
          <span>More about Gaurav</span>
          ${iconRaw('arrowRight', { size: 14 })}
        </a>
      </p>
    </div>

    ${related.length > 0
      ? raw(html`
          <div class="aside-card" data-reveal>
            <p class="aside-card__title">Related courses</p>
            <ul class="site-footer__list">
              ${mapTo(
                related,
                (entry) => html`
                  <li>
                    <a class="link-underline" href="/pages/course-detail.html?slug=${entry.slug}">
                      <span>${entry.title}</span>
                      ${iconRaw('arrowRight', { size: 14 })}
                    </a>
                  </li>
                `
              )}
            </ul>
          </div>
        `)
      : ''}

    <div class="aside-card aside-card--accent" data-reveal>
      <p class="aside-card__title">${course.status}</p>
      <p class="tech-group__text" style="margin-bottom:1rem">
        This course is being written now. Send a note and I will tell you when it opens.
      </p>
      <a class="btn btn--primary btn--block" href="/pages/contact.html">
        <span>Register interest</span>
        <span class="btn__icon">${iconRaw('arrowRight', { size: 16 })}</span>
      </a>
    </div>
  `;
}

export async function initCourseDetailPage() {
  const slug = getSlugParam();
  const { courses } = await getCoursesIndex();

  let course = null;
  if (slug && courses.some((entry) => entry.slug === slug)) {
    try {
      course = await getCourse(slug);
    } catch {
      course = null;
    }
  }

  if (!course) {
    mount(
      '#page-head',
      pageHead({
        eyebrow: 'Courses',
        title: 'Course not found',
        intro: 'That link does not match a course on the site.',
        trail: [{ label: 'Home', href: '/' }, { label: 'Courses', href: '/pages/courses.html' }]
      })
    );
    mount('#course-detail', emptyState('This course is not available.', { label: 'Browse all courses', href: '/pages/courses.html' }));
    return;
  }

  setDocumentMeta({
    title: `${course.title} — Gaurav Kumar`,
    description: course.summary,
    image: course.coverImage
  });

  const related = courses.filter((entry) => (course.relatedCourses ?? []).includes(entry.slug)).slice(0, 3);

  mount(
    '#page-head',
    pageHead({
      eyebrow: course.subtitle,
      title: course.title,
      intro: course.summary,
      trail: [
        { label: 'Home', href: '/' },
        { label: 'Courses', href: '/pages/courses.html' },
        { label: course.topic }
      ]
    })
  );

  mount(
    '#course-detail',
    html`
      <div class="detail-hero-media" data-reveal>
        <img
          src="${course.coverImage}"
          alt="Cover illustration for the ${course.title} course"
          decoding="async"
          width="1200"
          height="675"
        />
      </div>

      <div class="detail-layout">
        <div class="detail-main">
          <section class="detail-block" data-reveal>
            <h2 class="detail-block__title">Overview</h2>
            <div class="prose">
              ${mapTo(course.overview, (paragraph) => html`<p>${paragraph}</p>`)}
            </div>
          </section>

          ${raw(detailBlock("What you'll learn", markerList(course.whatYouWillLearn, 'marker-list--check')))}
          ${raw(detailBlock('Curriculum', curriculum(course.curriculum)))}
          ${raw(detailBlock('Who this is for', markerList(course.audience)))}
          ${raw(detailBlock('Prerequisites', markerList(course.prerequisites)))}
        </div>

        <aside class="detail-aside">${raw(courseAside(course, related))}</aside>
      </div>
    `
  );

  refreshScrollReveal();
}

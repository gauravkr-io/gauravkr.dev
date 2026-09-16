/**
 * Services: the preview grid on the homepage, the overview page, and the
 * shared detail template driven by ?slug=.
 */

import {
  html,
  mapTo,
  raw,
  mount,
  $,
  getSlugParam,
  setDocumentMeta
} from './utils.js';
import { icon, iconRaw } from './icons.js';
import { sectionHead, tagRow, pageHead, emptyState, statusChip } from './components.js';
import { getServices, getService } from './data-loader.js';

function serviceIcon(name) {
  return raw(icon(name, { size: 20 }));
}

export function serviceCard(service, { lead = false } = {}) {
  return html`
    <li class="service-card bracketed" data-reveal>
      <div class="service-card__media">
        <img
          src="${service.image}"
          alt="Abstract diagram representing ${service.title}"
          loading="lazy"
          decoding="async"
          width="1200"
          height="750"
        />
        ${lead ? raw(html`<span class="service-card__lead">${statusChip(service.tagline)}</span>`) : ''}
      </div>

      <div class="service-card__body">
        <span class="capability__icon" aria-hidden="true">${serviceIcon(service.icon)}</span>
        <h3 class="service-card__title">${service.title}</h3>
        <p class="service-card__text">${service.shortDescription}</p>
        ${tagRow(service.technologies, { limit: 3 })}

        <div class="service-card__foot">
          <a class="link-underline stretched-link" href="/pages/service-detail.html?slug=${service.slug}">
            <span>Explore service</span>
            ${iconRaw('arrowRight', { size: 15 })}
          </a>
        </div>
      </div>
    </li>
  `;
}

/* -------------------------------------------------------------------------
   Homepage preview
   ------------------------------------------------------------------------- */

export async function renderServicesPreview(selector = '#services-preview', limit = 3) {
  const { services } = await getServices();
  const shown = services.slice(0, limit);
  mount(selector, html`${mapTo(shown, (service, index) => serviceCard(service, { lead: index === 0 }))}`);
  return shown;
}

/* -------------------------------------------------------------------------
   Overview page
   ------------------------------------------------------------------------- */

export async function initServicesPage() {
  const { meta, services } = await getServices();

  mount(
    '#page-head',
    pageHead({
      eyebrow: meta.eyebrow,
      title: meta.headline,
      intro: meta.intro,
      trail: [{ label: 'Home', href: '/' }, { label: 'Services' }]
    })
  );

  mount('#services-list', html`${mapTo(services, (service, index) => serviceCard(service, { lead: index === 0 }))}`);
}

/* -------------------------------------------------------------------------
   Detail template
   ------------------------------------------------------------------------- */

function problemSolution(service) {
  return html`
    <div class="problem-solution">
      <div class="problem-solution__card" data-reveal>
        <p class="problem-solution__label">The problem</p>
        <p class="problem-solution__text">${service.problem}</p>
      </div>
      <div class="problem-solution__card problem-solution__card--accent" data-reveal>
        <p class="problem-solution__label">How I approach it</p>
        <p class="problem-solution__text">${service.solution}</p>
      </div>
    </div>
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

function approachList(steps = []) {
  return html`
    <ol class="approach-list">
      ${mapTo(
        steps,
        (step) => html`
          <li class="approach">
            <span class="approach__marker" aria-hidden="true"></span>
            <h3 class="approach__title">${step.title}</h3>
            <p class="approach__text">${step.description}</p>
          </li>
        `
      )}
    </ol>
  `;
}

function markerList(items = [], variant = '') {
  return html`
    <ul class="marker-list ${variant}">
      ${mapTo(items, (item) => html`<li>${item}</li>`)}
    </ul>
  `;
}

function serviceAside(service, others) {
  return html`
    ${service.proofMetric
      ? raw(html`
          <div class="aside-card aside-card--accent" data-reveal>
            <p class="aside-card__title">Proof point</p>
            <p class="work-card__impact">
              <span class="work-card__impact-value">${service.proofMetric.value}</span>
            </p>
            <p class="work-card__impact-label">${service.proofMetric.label}</p>
          </div>
        `)
      : ''}

    <div class="aside-card" data-reveal>
      <p class="aside-card__title">Technologies</p>
      ${tagRow(service.technologies)}
    </div>

    <div class="aside-card" data-reveal>
      <p class="aside-card__title">What you get</p>
      ${raw(markerList(service.deliverables, 'marker-list--check'))}
    </div>

    <div class="aside-card" data-reveal>
      <p class="aside-card__title">Other services</p>
      <ul class="site-footer__list">
        ${mapTo(
          others,
          (other) => html`
            <li>
              <a class="link-underline" href="/pages/service-detail.html?slug=${other.slug}">
                <span>${other.title}</span>
                ${iconRaw('arrowRight', { size: 14 })}
              </a>
            </li>
          `
        )}
      </ul>
    </div>

    <div class="aside-card aside-card--accent" data-reveal>
      <p class="aside-card__title">Start a conversation</p>
      <p class="tech-group__text" style="margin-bottom:1rem">
        Tell me what you are building and where it is stuck.
      </p>
      <a class="btn btn--primary btn--block" href="/pages/contact.html">
        <span>Get in touch</span>
        <span class="btn__icon">${iconRaw('arrowRight', { size: 16 })}</span>
      </a>
    </div>
  `;
}

export async function initServiceDetailPage() {
  const slug = getSlugParam();
  const service = slug ? await getService(slug) : null;

  if (!service) {
    mount(
      '#page-head',
      pageHead({
        eyebrow: 'Services',
        title: 'Service not found',
        intro: 'That service link does not match anything on the site.',
        trail: [{ label: 'Home', href: '/' }, { label: 'Services', href: '/pages/services.html' }]
      })
    );
    mount(
      '#service-detail',
      emptyState('The service you asked for is not available.', {
        label: 'Browse all services',
        href: '/pages/services.html'
      })
    );
    return;
  }

  setDocumentMeta({
    title: `${service.title} — Gaurav Kumar`,
    description: service.shortDescription,
    image: service.image
  });

  const { services } = await getServices();
  const others = services.filter((entry) => entry.slug !== service.slug).slice(0, 4);

  mount(
    '#page-head',
    pageHead({
      eyebrow: service.tagline,
      title: service.title,
      intro: service.shortDescription,
      trail: [
        { label: 'Home', href: '/' },
        { label: 'Services', href: '/pages/services.html' },
        { label: service.title }
      ]
    })
  );

  mount(
    '#service-detail',
    html`
      <div class="detail-hero-media" data-reveal>
        <img
          src="${service.image}"
          alt="Abstract diagram representing ${service.title}"
          decoding="async"
          width="1200"
          height="750"
        />
      </div>

      <div class="detail-layout">
        <div class="detail-main">
          ${raw(problemSolution(service))}
          ${raw(detailBlock('Problems this solves', markerList(service.problemsSolved)))}
          ${raw(detailBlock('Engineering approach', approachList(service.engineeringApproach)))}
          ${raw(detailBlock('Architecture considerations', markerList(service.architectureConsiderations)))}
        </div>
        <aside class="detail-aside">${raw(serviceAside(service, others))}</aside>
      </div>
    `
  );
}

export { sectionHead };

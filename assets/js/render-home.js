/**
 * Homepage composition.
 *
 * The hero is rendered first and without a reveal animation, so the first
 * screen is readable the moment the JSON lands rather than fading in.
 */

import { html, mapTo, raw, mount, escapeHtml } from './utils.js';
import { icon, iconRaw } from './icons.js';
import { sectionHead, sectionFoot, ctaBand, statusChip } from './components.js';
import { getHome, getAbout, getSite } from './data-loader.js';
import { renderSelectedWork } from './render-projects.js';
import { renderServicesPreview } from './render-services.js';
import { renderBlogsPreview } from './render-blogs.js';
import { renderCoursesPreview } from './render-courses.js';
import { refreshScrollReveal } from './scroll-animations.js';

function heroMarkup(hero, site) {
  const image = site.profileImage;

  return html`
    <div class="hero__bloom accent-bloom" aria-hidden="true"></div>
    <div class="grid-backdrop" aria-hidden="true"></div>

    <div class="shell">
      <div class="hero__inner">
        <div class="hero__content">
          <span class="hero__availability">${statusChip(hero.availabilityNote)}</span>

          <h1 class="hero__name">${hero.name}</h1>
          <p class="hero__role">${hero.role}</p>
          <p class="hero__tagline">${hero.tagline}</p>
          <p class="hero__supporting">${hero.supporting}</p>

          <ul class="hero__keywords">
            ${mapTo(hero.keywords, (keyword) => html`<li class="hero__keyword">${keyword}</li>`)}
          </ul>

          <div class="hero__actions">
            <a class="btn btn--primary" href="${hero.primaryCta.href}">
              <span>${hero.primaryCta.label}</span>
              <span class="btn__icon">${iconRaw('arrowRight', { size: 16 })}</span>
            </a>
            <a class="btn btn--secondary" href="${hero.secondaryCta.href}">
              <span>${hero.secondaryCta.label}</span>
            </a>
          </div>
        </div>

        <figure class="hero__portrait">
          <span class="hero__portrait-ring" aria-hidden="true"></span>
          <div class="hero__portrait-frame">
            <img
              src="${image.src}"
              srcset="${image.srcset}"
              sizes="(min-width: 62rem) 26rem, min(23rem, 82vw)"
              alt="${image.alt}"
              width="941"
              height="941"
              fetchpriority="high"
              decoding="async"
            />
          </div>
          <figcaption class="hero__portrait-tag">
            ${site.location}
          </figcaption>
        </figure>
      </div>

      <div class="hero__stats">
        ${mapTo(
          hero.stats,
          (stat) => html`
            <div>
              <p class="hero__stat-value">${stat.value}</p>
              <p class="hero__stat-label">${stat.label}</p>
            </div>
          `
        )}
      </div>
    </div>
  `;
}

function capabilityCard(capability) {
  return html`
    <article class="capability" data-reveal>
      <span class="capability__icon" aria-hidden="true">${raw(icon(capability.icon, { size: 20 }))}</span>
      <p class="capability__label">${capability.label}</p>
      <h3 class="capability__title">${capability.title}</h3>
      <p class="capability__text">${capability.description}</p>
    </article>
  `;
}

function principleRow(principle) {
  return html`
    <li class="principle" data-reveal>
      <span class="principle__number">${principle.number}</span>
      <h3 class="principle__title">${principle.title}</h3>
      <p class="principle__text">${principle.description}</p>
    </li>
  `;
}

function aboutPreview(preview, site) {
  return html`
    <div class="about-intro">
      <figure class="about-intro__portrait" data-reveal>
        <img
          src="${site.profileImage.src}"
          srcset="${site.profileImage.srcset}"
          sizes="(min-width: 56rem) 24rem, min(24rem, 90vw)"
          alt="${site.profileImage.alt}"
          loading="lazy"
          decoding="async"
          width="941"
          height="941"
        />
        <figcaption class="about-intro__caption">${site.location}</figcaption>
      </figure>

      <div class="about-intro__text">
        <p class="eyebrow">${preview.eyebrow}</p>
        <h2 class="display-md" data-reveal>${preview.headline}</h2>
        <p data-reveal>${preview.intro}</p>
        <p data-reveal>
          <a class="link-underline" href="${preview.cta.href}">
            <span>${preview.cta.label}</span>
            ${iconRaw('arrowRight', { size: 15 })}
          </a>
        </p>
      </div>
    </div>
  `;
}

export async function initHomePage() {
  const [home, about, site] = await Promise.all([getHome(), getAbout(), getSite()]);

  mount('#hero', heroMarkup(home.hero, site));

  mount('#capabilities-head', sectionHead(home.capabilities, { split: true }));
  mount('#capabilities-grid', html`${mapTo(about.capabilities, capabilityCard)}`);

  mount('#selected-work-head', sectionHead(home.selectedWork, { split: true }));
  mount('#services-head', sectionHead(home.services, { split: true }));
  mount('#services-foot', sectionFoot(home.services.cta));

  mount('#philosophy-head', sectionHead(home.philosophy, { split: true }));
  mount('#philosophy-list', html`${mapTo(about.philosophy.principles, principleRow)}`);

  mount('#blogs-head', sectionHead(home.blogs, { split: true }));
  mount('#blogs-foot', sectionFoot(home.blogs.cta));

  mount('#courses-head', sectionHead(home.courses, { split: true }));
  mount('#courses-foot', sectionFoot(home.courses.cta));

  mount('#about-preview', aboutPreview(home.aboutPreview, site));
  mount('#contact-cta', ctaBand(home.contactCta));

  await Promise.all([
    renderSelectedWork('#selected-work-list'),
    renderServicesPreview('#services-preview', 3),
    renderBlogsPreview('#blogs-preview', 3),
    renderCoursesPreview('#courses-preview', 3)
  ]);

  refreshScrollReveal();
}

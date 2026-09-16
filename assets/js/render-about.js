/**
 * About page.
 *
 * Work history lives here rather than in the top-level navigation, so this
 * module owns the experience list alongside the journey, philosophy and
 * credentials sections.
 */

import { html, mapTo, raw, mount, initials } from './utils.js';
import { iconRaw } from './icons.js';
import { sectionHead, pageHead, tagRow, ctaBand } from './components.js';
import { getAbout, getExperience, getCredentials, getSite } from './data-loader.js';
import { renderTechnologies } from './render-technologies.js';
import { refreshScrollReveal } from './scroll-animations.js';

function introMarkup(about, site) {
  return html`
    <div class="about-intro">
      <figure class="about-intro__portrait" data-reveal>
        <img
          src="${site.profileImage.src}"
          srcset="${site.profileImage.srcset}"
          sizes="(min-width: 56rem) 24rem, min(24rem, 90vw)"
          alt="${site.profileImage.alt}"
          width="941"
          height="941"
          fetchpriority="high"
          decoding="async"
        />
        <figcaption class="about-intro__caption">${about.portraitCaption}</figcaption>
      </figure>

      <div class="about-intro__text">
        ${mapTo(about.intro, (paragraph) => html`<p data-reveal>${paragraph}</p>`)}

        <div class="cluster" data-reveal style="margin-top:0.5rem">
          <a class="btn btn--primary" href="${site.resumeUrl}" download>
            ${iconRaw('download', { size: 16 })}
            <span>${about.resumeCta.label}</span>
          </a>
          <a class="btn btn--secondary" href="/pages/contact.html">
            <span>Get in touch</span>
          </a>
        </div>
      </div>
    </div>
  `;
}

function journeyMarkup(milestones) {
  return html`
    <ol class="timeline">
      ${mapTo(
        milestones,
        (milestone) => html`
          <li class="timeline__item" data-reveal>
            <p class="timeline__year">${milestone.year}</p>
            <h3 class="timeline__title">${milestone.title}</h3>
            <p class="timeline__text">${milestone.description}</p>
          </li>
        `
      )}
    </ol>
  `;
}

function experienceMarkup(roles) {
  return html`
    <ol class="experience-list">
      ${mapTo(
        roles,
        (role) => html`
          <li class="experience" data-reveal>
            <div class="experience__aside">
              <span class="experience__logo" aria-hidden="true">${initials(role.company, 2)}</span>
              <div>
                <p class="experience__company">${role.company}</p>
                <p class="experience__period">${role.period}</p>
              </div>
              <p class="experience__period">${role.location}</p>
            </div>

            <div>
              <h3 class="experience__role">${role.role}</h3>
              <p class="experience__summary">${role.summary}</p>

              <ul class="experience__highlights">
                ${mapTo(role.highlights, (highlight) => html`<li>${highlight}</li>`)}
              </ul>

              ${role.metric
                ? raw(html`
                    <p class="experience__metric">
                      <span class="experience__metric-value">${role.metric.value}</span>
                      <span class="experience__metric-label">${role.metric.label}</span>
                    </p>
                  `)
                : ''}

              <div style="margin-top:1.5rem">${tagRow(role.technologies)}</div>
            </div>
          </li>
        `
      )}
    </ol>
  `;
}

function principlesMarkup(principles) {
  return html`
    <ol class="principle-list">
      ${mapTo(
        principles,
        (principle) => html`
          <li class="principle" data-reveal>
            <span class="principle__number">${principle.number}</span>
            <h3 class="principle__title">${principle.title}</h3>
            <p class="principle__text">${principle.description}</p>
          </li>
        `
      )}
    </ol>
  `;
}

function credentialCards(items, { showYear = true } = {}) {
  return html`
    <ul class="credential-grid">
      ${mapTo(
        items,
        (item) => html`
          <li class="credential" data-reveal>
            <h3 class="credential__name">${item.name ?? item.degree}</h3>
            <p class="credential__issuer">
              ${item.issuer ?? item.institution}${showYear && item.year ? ` · ${item.year}` : ''}
            </p>
            ${item.note || item.location
              ? raw(html`<p class="credential__note">${item.note ?? item.location}</p>`)
              : ''}
          </li>
        `
      )}
    </ul>
  `;
}

function beyondMarkup(section) {
  return html`
    <div class="capability-grid">
      ${mapTo(
        section.items,
        (item) => html`
          <article class="capability" data-reveal>
            <h3 class="capability__title">${item.title}</h3>
            <p class="capability__text">${item.description}</p>
          </article>
        `
      )}
    </div>
  `;
}

export async function initAboutPage() {
  const [about, experience, credentials, site] = await Promise.all([
    getAbout(),
    getExperience(),
    getCredentials(),
    getSite()
  ]);

  mount(
    '#page-head',
    pageHead({
      eyebrow: about.eyebrow,
      title: about.headline,
      trail: [{ label: 'Home', href: '/' }, { label: 'About' }]
    })
  );

  mount('#about-intro', introMarkup(about, site));

  mount(
    '#journey-head',
    sectionHead({ eyebrow: 'Journey', headline: 'My engineering journey' }, { split: true })
  );
  mount('#journey-list', journeyMarkup(about.journey));

  mount(
    '#experience-head',
    sectionHead(
      {
        eyebrow: 'Experience',
        headline: 'Where I have worked',
        intro: 'Four roles, all in e-commerce engineering, moving from storefront features to owning architecture.'
      },
      { split: true }
    )
  );
  mount('#experience-list', experienceMarkup(experience));

  mount(
    '#stack-head',
    sectionHead(
      {
        eyebrow: 'Stack',
        headline: 'What I work with',
        intro: 'Grouped by how it gets used rather than by how it gets marketed.'
      },
      { split: true }
    )
  );
  await renderTechnologies('#tech-stack');

  mount('#philosophy-head', sectionHead(about.philosophy, { split: true }));
  mount('#philosophy-list', principlesMarkup(about.philosophy.principles));

  mount(
    '#education-head',
    sectionHead({ eyebrow: 'Credentials', headline: 'Education and certifications' }, { split: true })
  );
  mount('#education-list', credentialCards(credentials.education));
  mount('#certifications-list', credentialCards(credentials.certifications));

  mount(
    '#awards-head',
    sectionHead({ eyebrow: 'Recognition', headline: 'Awards and recognition' }, { split: true })
  );
  mount('#awards-list', credentialCards(credentials.awards));

  if (about.beyondEngineering?.visible !== false) {
    mount(
      '#beyond-head',
      sectionHead(
        { eyebrow: about.beyondEngineering.eyebrow, headline: about.beyondEngineering.headline },
        { split: true }
      )
    );
    mount('#beyond-list', beyondMarkup(about.beyondEngineering));
  } else {
    document.querySelector('#beyond-section')?.remove();
  }

  mount(
    '#contact-cta',
    ctaBand({
      eyebrow: 'Get in touch',
      headline: 'Have an interesting problem to solve?',
      intro: "Let's build something meaningful.",
      primaryCta: { label: 'Start a conversation', href: '/pages/contact.html' },
      secondaryCta: { label: 'Download Résumé', href: site.resumeUrl }
    })
  );

  refreshScrollReveal();
}

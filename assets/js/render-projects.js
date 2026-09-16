/**
 * Selected work / case studies.
 *
 * Client names are deliberately absent from the data and are described by
 * sector instead, so nothing here needs to strip or mask them.
 */

import { html, mapTo, raw, mount } from './utils.js';
import { tagRow } from './components.js';
import { getProjects } from './data-loader.js';

function impactBlock(project) {
  if (!project.impact && !project.secondaryImpact) return raw('');

  return raw(html`
    <div class="work-card__detail">
      <p class="work-card__detail-label">${project.impact ? 'Measured impact' : 'Outcome'}</p>
      ${project.impact
        ? raw(html`
            <p class="work-card__impact">
              <span class="work-card__impact-value">${project.impact.value}</span>
              <span class="work-card__impact-label">${project.impact.label}</span>
            </p>
          `)
        : ''}
      ${project.secondaryImpact
        ? raw(html`<p class="work-card__text">${project.secondaryImpact}</p>`)
        : ''}
    </div>
  `);
}

export function projectCard(project, index) {
  const flip = index % 2 === 1;

  return html`
    <li class="work-card ${flip ? 'work-card--flip' : ''} bracketed" data-reveal>
      <div class="work-card__media">
        <img
          src="${project.image}"
          alt="Abstract system diagram representing the ${project.title} engagement"
          loading="lazy"
          decoding="async"
          width="1200"
          height="750"
        />
        <span class="work-card__index">${String(index + 1).padStart(2, '0')}</span>
      </div>

      <div class="work-card__body">
        <div class="work-card__meta">
          <span>${project.industry}</span>
          <span>${project.year}</span>
          <span>${project.employer}</span>
        </div>

        <div>
          <h3 class="work-card__title">${project.title}</h3>
          <p class="work-card__client">${project.client}</p>
        </div>

        <p class="work-card__text">${project.problem}</p>
        <p class="work-card__text">${project.solution}</p>

        ${tagRow(project.technologies, { limit: 5 })}
        ${impactBlock(project)}
      </div>
    </li>
  `;
}

export async function renderSelectedWork(selector = '#selected-work-list') {
  const { projects } = await getProjects();
  mount(selector, html`${mapTo(projects, projectCard)}`);
  return projects;
}

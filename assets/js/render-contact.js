/**
 * Contact page and form.
 *
 * There is no backend in this phase, so a valid submission composes a mailto
 * link instead of posting. Validation still runs properly, which means the
 * form can be pointed at an endpoint later without reworking the interaction.
 */

import { html, mapTo, raw, mount, $, $$, escapeHtml } from './utils.js';
import { icon, iconRaw } from './icons.js';
import { pageHead, maskedIcon } from './components.js';
import { getContact, getSite } from './data-loader.js';
import { refreshScrollReveal } from './scroll-animations.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function methodIcon(name) {
  if (name === 'linkedin' || name === 'github') {
    return maskedIcon(`/assets/images/technologies/${name}.svg`, name);
  }
  return raw(icon(name === 'phone' ? 'phone' : 'mail', { size: 18 }));
}

function methodsMarkup(methods) {
  return html`
    <ul class="contact-methods">
      ${mapTo(
        methods,
        (method) => html`
          <li>
            <a
              class="contact-method"
              href="${method.href}"
              ${raw(method.href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : '')}
            >
              <span class="contact-method__icon" aria-hidden="true">${methodIcon(method.icon)}</span>
              <span>
                <span class="contact-method__label">${method.label}</span>
                <span class="contact-method__value">${method.value}</span>
                <span class="contact-method__note">${method.note}</span>
              </span>
              <span class="contact-method__arrow" aria-hidden="true">${iconRaw('arrowUpRight', { size: 16 })}</span>
            </a>
          </li>
        `
      )}
    </ul>
  `;
}

function fieldMarkup(field) {
  const id = `field-${field.name}`;
  const errorId = `${id}-error`;
  const required = field.required ? 'required aria-required="true"' : '';
  const describedBy = `aria-describedby="${errorId}"`;

  let control;
  if (field.type === 'textarea') {
    control = html`
      <textarea
        class="field__control"
        id="${id}"
        name="${field.name}"
        rows="${field.rows ?? 5}"
        placeholder="${field.placeholder ?? ''}"
        autocomplete="${field.autocomplete ?? 'off'}"
        ${raw(required)}
        ${raw(describedBy)}
      ></textarea>
    `;
  } else if (field.type === 'select') {
    control = html`
      <select
        class="field__control"
        id="${id}"
        name="${field.name}"
        autocomplete="${field.autocomplete ?? 'off'}"
        ${raw(required)}
        ${raw(describedBy)}
      >
        <option value="">Choose one</option>
        ${mapTo(field.options, (option) => html`<option value="${option}">${option}</option>`)}
      </select>
    `;
  } else {
    control = html`
      <input
        class="field__control"
        type="${field.type}"
        id="${id}"
        name="${field.name}"
        placeholder="${field.placeholder ?? ''}"
        autocomplete="${field.autocomplete ?? 'off'}"
        ${raw(required)}
        ${raw(describedBy)}
      />
    `;
  }

  return html`
    <div class="field" data-field="${field.name}">
      <label class="field__label" for="${id}">
        ${field.label}${field.required ? raw('<span class="field__required" aria-hidden="true"> *</span>') : ''}
      </label>
      ${raw(control)}
      <p class="field__error" id="${errorId}" role="alert"></p>
    </div>
  `;
}

function formMarkup(form) {
  return html`
    <form class="form" id="contact-form" novalidate data-reveal>
      <div>
        <h2 class="display-xs">${form.title}</h2>
        <p class="form__note" style="margin-top:0.5rem">${form.note}</p>
      </div>

      ${mapTo(form.fields, fieldMarkup)}

      <button class="btn btn--primary btn--block" type="submit">
        <span>${form.submitLabel}</span>
        <span class="btn__icon">${iconRaw('arrowRight', { size: 16 })}</span>
      </button>

      <p class="form__status" id="form-status" role="status" aria-live="polite" hidden></p>
    </form>
  `;
}

/* -------------------------------------------------------------------------
   Validation
   ------------------------------------------------------------------------- */

function validateField(control, config) {
  const wrapper = control.closest('.field');
  const errorNode = wrapper?.querySelector('.field__error');
  const value = control.value.trim();

  let message = '';
  if (config.required && value === '') {
    message = config.errorMessage ?? 'This field is required.';
  } else if (config.type === 'email' && value !== '' && !EMAIL_PATTERN.test(value)) {
    message = config.errorMessage ?? 'Please enter a valid email address.';
  }

  wrapper?.classList.toggle('is-invalid', message !== '');
  control.setAttribute('aria-invalid', message !== '' ? 'true' : 'false');
  if (errorNode) errorNode.textContent = message;

  return message === '';
}

function initFormBehaviour(contact, site) {
  const form = $('#contact-form');
  if (!form) return;

  const configByName = new Map(contact.form.fields.map((field) => [field.name, field]));

  form.addEventListener('blur', (event) => {
    const config = configByName.get(event.target.name);
    if (config) validateField(event.target, config);
  }, true);

  form.addEventListener('input', (event) => {
    const wrapper = event.target.closest('.field.is-invalid');
    if (!wrapper) return;
    const config = configByName.get(event.target.name);
    if (config) validateField(event.target, config);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    let firstInvalid = null;
    contact.form.fields.forEach((config) => {
      const control = form.elements.namedItem(config.name);
      if (!control) return;
      if (!validateField(control, config) && !firstInvalid) firstInvalid = control;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const data = new FormData(form);
    const subject = `${data.get('subject')} — ${data.get('name')}`;
    const body = [
      `Name: ${data.get('name')}`,
      `Email: ${data.get('email')}`,
      `Topic: ${data.get('subject')}`,
      '',
      data.get('message')
    ].join('\n');

    const status = $('#form-status');
    if (status) {
      status.textContent = contact.form.successMessage;
      status.hidden = false;
    }

    window.location.href =
      `mailto:${site.contact.email}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
  });
}

/* -------------------------------------------------------------------------
   Page
   ------------------------------------------------------------------------- */

export async function initContactPage() {
  const [contact, site] = await Promise.all([getContact(), getSite()]);

  mount(
    '#page-head',
    pageHead({
      eyebrow: contact.eyebrow,
      title: contact.headline,
      intro: contact.intro,
      trail: [{ label: 'Home', href: '/' }, { label: 'Contact' }]
    })
  );

  mount(
    '#contact-aside',
    html`
      <p class="lede" data-reveal>${contact.supporting}</p>
      <div data-reveal>${methodsMarkup(contact.methods)}</div>

      <div class="aside-card aside-card--accent" data-reveal>
        <p class="aside-card__title">${contact.resumeCta.title}</p>
        <p class="tech-group__text" style="margin-bottom:1rem">${contact.resumeCta.description}</p>
        <a class="btn btn--primary" href="${site.resumeUrl}" download>
          ${iconRaw('download', { size: 16 })}
          <span>${contact.resumeCta.label}</span>
        </a>
      </div>

      <p class="text-muted" data-reveal>${contact.responseTime}</p>
    `
  );

  mount('#contact-form-wrap', formMarkup(contact.form));
  initFormBehaviour(contact, site);
  refreshScrollReveal();
}

/**
 * Shared helpers used by every render module.
 *
 * The `html` tagged template is the important one. It escapes every
 * interpolated value by default, so content coming from JSON or from a URL
 * parameter cannot inject markup. Anything that genuinely needs to be treated
 * as markup has to be wrapped in `raw()`, which makes those places easy to
 * audit.
 */

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

const RAW = Symbol('raw');

/**
 * Wraps a string as trusted markup.
 *
 * `toString` is defined so a wrapped value still behaves like a string when it
 * is joined or embedded in a plain template literal.
 */
function markup(value) {
  const text = String(value ?? '');
  return {
    [RAW]: text,
    toString() {
      return text;
    }
  };
}

export function raw(value) {
  return markup(value);
}

function resolveValue(value) {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.map(resolveValue).join('');
  if (typeof value === 'object' && RAW in value) return value[RAW];
  return escapeHtml(value);
}

/**
 * Builds markup, escaping every interpolated value.
 *
 * The result is returned as trusted markup rather than a bare string, so a
 * template composed of other templates nests correctly instead of having the
 * inner result escaped a second time.
 */
export function html(strings, ...values) {
  let output = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    output += resolveValue(values[i]) + strings[i + 1];
  }
  return markup(output);
}

/**
 * Prepares a value for insertion into the DOM.
 *
 * This deliberately differs from interpolation inside `html`. There, a bare
 * string is untrusted data and gets escaped. Here, a bare string is the
 * finished output of `html` and is already safe, so it passes through. The
 * only work left is unwrapping a `raw()` component result.
 */
export function toMarkup(value) {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.map(toMarkup).join('');
  if (typeof value === 'object' && RAW in value) return value[RAW];
  return String(value);
}

/** Joins an array of items through a render function, returning raw markup. */
export function mapTo(items, renderItem) {
  if (!Array.isArray(items)) return raw('');
  return raw(items.map((item, index) => renderItem(item, index)).join(''));
}

/* -------------------------------------------------------------------------
   DOM
   ------------------------------------------------------------------------- */

export function $(selector, scope = document) {
  return scope.querySelector(selector);
}

export function $$(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

/** Writes markup into the element matching `selector`, if it is on the page. */
export function mount(selector, markup) {
  const target = typeof selector === 'string' ? $(selector) : selector;
  if (!target) return null;
  target.innerHTML = toMarkup(markup);
  return target;
}

/**
 * Updates the title and social metadata for pages whose subject is only known
 * after the JSON for the requested slug has loaded.
 */
export function setDocumentMeta({ title, description, image } = {}) {
  if (title) {
    document.title = title;
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[name="twitter:title"]', title);
  }
  if (description) {
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[name="twitter:description"]', description);
  }
  if (image) {
    const absolute = new URL(image, window.location.href).href;
    setMetaContent('meta[property="og:image"]', absolute);
    setMetaContent('meta[name="twitter:image"]', absolute);
  }
  setMetaContent('meta[property="og:url"]', window.location.href);
}

function setMetaContent(selector, value) {
  const tag = document.head.querySelector(selector);
  if (tag) tag.setAttribute('content', value);
}

export function onReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

/* -------------------------------------------------------------------------
   URL
   ------------------------------------------------------------------------- */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Reads a slug from the query string and rejects anything that is not a plain
 * kebab-case token. Slugs become part of a fetch path, so this keeps a crafted
 * URL from reaching outside the data directory.
 */
export function getSlugParam(name = 'slug') {
  const value = new URLSearchParams(window.location.search).get(name);
  if (!value || !SLUG_PATTERN.test(value) || value.length > 80) return null;
  return value;
}

/**
 * The current page as a root-relative path, matching the `path` values in
 * `data/navigation.json`. Pages live at different depths (the homepage at
 * the root, everything else under `pages/`), so this compares full paths
 * rather than bare filenames.
 */
export function currentPagePath() {
  return window.location.pathname || '/';
}

/* -------------------------------------------------------------------------
   Formatting
   ------------------------------------------------------------------------- */

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
});

/** Formats an ISO date. Parsed as UTC so the day never shifts by timezone. */
export function formatDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = String(isoDate).split('-').map(Number);
  if (!year || !month || !day) return '';
  return DATE_FORMAT.format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * Monogram for logo fallbacks. Multi-word names use one letter per word, and a
 * single word takes its opening letters so "Litmus7" reads as LI rather than a
 * lone L.
 */
export function initials(value, length = 2) {
  const words = String(value ?? '')
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, length).toUpperCase();

  return words
    .slice(0, length)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/** Turns a heading into a stable anchor id. */
export function slugifyHeading(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

/**
 * Renders the small inline subset allowed inside JSON prose: `code` spans and
 * **bold**. The text is escaped first, so only these two patterns can produce
 * markup.
 */
export function inlineMarkup(text) {
  const escaped = escapeHtml(text);
  return raw(
    escaped
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  );
}

export function pluralise(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/* -------------------------------------------------------------------------
   Environment
   ------------------------------------------------------------------------- */

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function debounce(fn, wait = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

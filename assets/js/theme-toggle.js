/**
 * Theme switching.
 *
 * The initial theme is applied by a small inline script in each page head, so
 * the correct palette is on the document before first paint. This module owns
 * everything after that: reacting to the toggle, persisting the choice, and
 * following the system setting for visitors who have not chosen explicitly.
 */

const STORAGE_KEY = 'gk-theme';
const THEMES = ['light', 'dark'];

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(stored) ? stored : null;
  } catch {
    // Private browsing and blocked storage both land here. Falling back to the
    // system preference is the correct behaviour, so there is nothing to do.
    return null;
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // A theme that does not persist is still better than a broken toggle.
  }
}

export function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme) {
  const next = THEMES.includes(theme) ? theme : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  syncToggles(next);
  return next;
}

function syncToggles(theme) {
  const nextLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.setAttribute('aria-label', nextLabel);
    button.setAttribute('title', nextLabel);
  });
}

export function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  storeTheme(next);
  return next;
}

export function initThemeToggle() {
  syncToggles(currentTheme());

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-theme-toggle]');
    if (!trigger) return;
    event.preventDefault();
    toggleTheme();
  });

  // Track the system setting only while the visitor has made no explicit choice.
  const media = window.matchMedia('(prefers-color-scheme: light)');
  media.addEventListener('change', (event) => {
    if (readStoredTheme()) return;
    applyTheme(event.matches ? 'light' : 'dark');
  });
}
